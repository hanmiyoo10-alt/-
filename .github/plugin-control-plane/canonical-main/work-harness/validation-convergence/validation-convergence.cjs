#!/usr/bin/env node
'use strict';

const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../..');
const PAGE_SIZE = 100;
const MAX_COMMENT_PAGES = 20;

const stageReceipt = require('../stage-receipt.cjs');
const continuation = require('../validation-continuation/validation-continuation-owner.cjs');
const attention = require('../validation-attention/validation-attention-owner.cjs');
const validationMerge = require('../validation-merge/validation-merge-owner.cjs');
const {canonicalize} = require('../handoff.cjs');

const DEFAULT_DEPS = Object.freeze({
  stageReceipt,
  continuation,
  attention,
  validationMerge,
});

function parseNumber(value, field) {
  const text = String(value || '').replace(/^#/, '');
  if (!/^[1-9][0-9]*$/.test(text)) throw new Error(field + '_INVALID');
  return Number(text);
}

function parseArgs(argv = process.argv.slice(2)) {
  if (!['inspect', 'finalize'].includes(argv[0])) throw new Error('COMMAND_INVALID');
  const command = argv[0];
  const allowed = new Set(['packet', 'pr', 'format']);
  const values = {};
  for (let index = 1; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith('--') || value === undefined) throw new Error('ARGUMENT_INVALID');
    const key = token.slice(2);
    if (!allowed.has(key) || key in values) throw new Error('ARGUMENT_INVALID');
    values[key] = value;
  }
  const format = values.format || 'agent-view';
  if (!['agent-view', 'receipt'].includes(format)) throw new Error('FORMAT_INVALID');
  return {
    command,
    packetNumber: parseNumber(values.packet, 'PACKET'),
    prNumber: parseNumber(values.pr, 'PR'),
    format,
  };
}

function selectionError(deps, kind, reasonCodes, locator = null) {
  return new deps.attention.ValidationAttentionError(kind, reasonCodes, locator);
}

async function readPacketComments(client, packetNumber, deps = DEFAULT_DEPS) {
  const rows = [];
  for (let page = 1; page <= MAX_COMMENT_PAGES; page += 1) {
    let value;
    try {
      value = await client.api(
        '/issues/' + packetNumber + '/comments?per_page=' + PAGE_SIZE + '&page=' + page);
    } catch {
      throw selectionError(
        deps, 'UNKNOWN', ['GITHUB_READ_FAILED_COMMENTS'], 'issue:#' + packetNumber);
    }
    if (!Array.isArray(value)) {
      throw selectionError(
        deps, 'UNKNOWN', ['GITHUB_ARRAY_EXPECTED_COMMENTS'], 'issue:#' + packetNumber);
    }
    rows.push(...value);
    if (value.length < PAGE_SIZE) return rows;
  }
  throw selectionError(
    deps, 'UNKNOWN', ['COMMENTS_PAGINATION_BOUND'], 'issue:#' + packetNumber);
}

function parsedReceiptForDigest(comments, packetNumber, digest, deps = DEFAULT_DEPS) {
  let selected = null;
  for (const comment of comments) {
    const parsed = deps.stageReceipt.parseRenderedStageReceipt(
      typeof comment?.body === 'string' ? comment.body : '');
    if (parsed.status !== 'VALID') continue;
    const receipt = parsed.value;
    if (receipt.packetNumber !== packetNumber
        || receipt.stage !== 'IMPLEMENTATION_PR'
        || receipt.receiptDigest !== digest) continue;
    if (selected && JSON.stringify(canonicalize(selected)) !== JSON.stringify(canonicalize(receipt))) {
      throw selectionError(
        deps, 'CONFLICT', ['SELECTED_RECEIPT_DIGEST_IDENTITY_CONFLICT'],
        'receipt:' + digest);
    }
    selected = receipt;
  }
  if (!selected) {
    throw selectionError(
      deps, 'UNKNOWN', ['SELECTED_RECEIPT_NOT_FOUND'], 'receipt:' + digest);
  }
  return selected;
}

function selectCurrentImplementationReceipt({
  comments, packetNumber, prNumber, liveHead, deps = DEFAULT_DEPS,
}) {
  const canonical = deps.continuation.collectCanonicalCandidates(
    comments, packetNumber, prNumber);
  if (canonical.invalid.length) {
    throw selectionError(
      deps,
      'UNKNOWN',
      ['CANONICAL_STAGE_EVIDENCE_INVALID', ...canonical.invalid],
      'issue:#' + packetNumber,
    );
  }
  const reduced = deps.continuation.reduceCandidates(canonical.candidates, liveHead);
  if (reduced.state === 'CONFLICT') {
    throw selectionError(
      deps,
      'CONFLICT',
      reduced.reasonCodes?.length ? reduced.reasonCodes : ['VALIDATION_CHECKPOINT_CONFLICT'],
      'issue:#' + packetNumber,
    );
  }
  if (reduced.state !== 'EXACT' || !reduced.candidate?.receiptDigest) {
    throw selectionError(
      deps,
      'NEEDS_REVIEW',
      reduced.reasonCodes?.length ? reduced.reasonCodes : ['CANDIDATE_HEAD_ATTRIBUTION_UNKNOWN'],
      'issue:#' + packetNumber,
    );
  }
  return {
    receipt: parsedReceiptForDigest(
      comments, packetNumber, reduced.candidate.receiptDigest, deps),
    candidate: reduced.candidate,
  };
}

async function inspectWithClient({
  client, packetNumber, prNumber, root = ROOT, deps = DEFAULT_DEPS,
}) {
  let selected;
  try {
    const pr = await deps.continuation.readPr(client, prNumber);
    const comments = await readPacketComments(client, packetNumber, deps);
    selected = selectCurrentImplementationReceipt({
      comments,
      packetNumber,
      prNumber,
      liveHead: pr.headSha,
      deps,
    });
  } catch (error) {
    const wrapped = error instanceof deps.attention.ValidationAttentionError
      ? error
      : selectionError(
        deps,
        error?.kind || 'UNKNOWN',
        error?.reasonCodes || ['VALIDATION_CONVERGENCE_SELECTION_FAILED'],
        error?.locator || 'issue:#' + packetNumber,
      );
    return deps.attention.aggregateError({
      operation: 'inspect',
      packetNumber,
      prNumber,
      error: wrapped,
      deps: deps.attention.DEFAULT_DEPS,
    });
  }

  return deps.attention.inspectComposition({
    client,
    packetNumber,
    prNumber,
    implementationReceipt: selected.receipt,
    root,
  });
}

async function finalizeWithClient({
  client, packetNumber, prNumber, root = ROOT, deps = DEFAULT_DEPS,
}) {
  return deps.attention.finalizeComposition({
    client,
    packetNumber,
    prNumber,
    root,
  });
}

function fallbackView(result, deps) {
  return deps.attention.DEFAULT_DEPS.agentDecisionView.projectAgentDecisionView({
    receipt: result.receipt,
    phase: 'VALIDATION_MERGE',
    output: result.report.output || {},
    attention: result.report.attention || [],
    receiptLocator: '',
    reportLocator: '',
  });
}

async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  const deps = options.deps || DEFAULT_DEPS;
  const root = options.root || ROOT;
  const client = options.client || deps.validationMerge.createLiveClient(options);
  let result = args.command === 'inspect'
    ? await inspectWithClient({
      client,
      packetNumber: args.packetNumber,
      prNumber: args.prNumber,
      root,
      deps,
    })
    : await finalizeWithClient({
      client,
      packetNumber: args.packetNumber,
      prNumber: args.prNumber,
      root,
      deps,
    });

  let locators;
  try {
    locators = deps.attention.persistResult(
      result, args.packetNumber, args.prNumber, args.command, root);
  } catch {
    result = deps.attention.aggregateError({
      operation: args.command,
      packetNumber: args.packetNumber,
      prNumber: args.prNumber,
      error: selectionError(deps, 'UNKNOWN', ['ATTENTION_SIDECAR_WRITE_FAILED']),
      deps: deps.attention.DEFAULT_DEPS,
    });
    if (args.format === 'receipt') {
      return {
        text: JSON.stringify(canonicalize(result.receipt), null, 2) + '\n',
        code: deps.attention.DEFAULT_DEPS.executionReceipt.exitCodeFor(result.receipt),
      };
    }
    const view = fallbackView(result, deps);
    return {
      text: JSON.stringify(canonicalize(view), null, 2) + '\n',
      code: deps.attention.DEFAULT_DEPS.agentDecisionView.exitCodeFor(view),
    };
  }

  if (args.format === 'receipt') {
    return {
      text: JSON.stringify(canonicalize(result.receipt), null, 2) + '\n',
      code: deps.attention.DEFAULT_DEPS.executionReceipt.exitCodeFor(result.receipt),
    };
  }
  const view = deps.attention.projectView(result, locators);
  return {
    text: JSON.stringify(canonicalize(view), null, 2) + '\n',
    code: deps.attention.DEFAULT_DEPS.agentDecisionView.exitCodeFor(view),
  };
}

if (require.main === module) {
  runCli().then(({text, code}) => {
    process.stdout.write(text);
    process.exitCode = code;
  }).catch(() => {
    process.stdout.write(JSON.stringify({
      schemaVersion: 1,
      mode: 'REPOSITORY_AGENT_DECISION_VIEW',
      validity: 'INVALID',
      phase: 'UNKNOWN',
      executionLifecycle: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN',
      result: 'UNKNOWN',
      reasonCodes: ['RUNTIME_ERROR'],
    }) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  DEFAULT_DEPS,
  MAX_COMMENT_PAGES,
  PAGE_SIZE,
  finalizeWithClient,
  inspectWithClient,
  parseArgs,
  parsedReceiptForDigest,
  readPacketComments,
  runCli,
  selectCurrentImplementationReceipt,
};
