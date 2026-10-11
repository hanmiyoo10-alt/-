#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const stageEntry = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs'));
const taskHandoff = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const workspaceHolder = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
const lOwner = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/device-ops/l-repository-owner/mcl-l-repository-owner.cjs'));
const prPreflight = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-system/pr-authoring-preflight.cjs'));

const MODE = 'MCL_L_REPOSITORY_APPLY_COMPOSITION';
const REPO = 'hanmiyoo10-alt/-';
const LEDGER_ISSUE = 2352;
const MAX_MANIFEST_BYTES = 128 * 1024;
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_PR_REQUEST_BYTES = 16 * 1024;
const PAGE_SIZE = 100;
const MAX_COMMENT_PAGES = 20;
const PACKET_RE = /^#[1-9][0-9]*$/;
const SHA40_RE = /^[0-9a-f]{40}$/;

const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

class CompositionError extends Error {
  constructor(kind, reasonCodes) {
    super(reasonCodes[0] || kind);
    this.kind = kind;
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}

function output(status, reasonCodes = [], extras = {}) {
  return {
    schemaVersion: 1,
    mode: MODE,
    status,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    ...extras,
    authority: {...FALSE_AUTHORITY},
  };
}

function readRegular(filePath, field, maxBytes) {
  const resolved = path.resolve(filePath);
  let stat;
  try { stat = fs.lstatSync(resolved); }
  catch { throw new CompositionError('UNKNOWN', [field + '_READ_FAILED']); }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new CompositionError('UNKNOWN', [field + '_REGULAR_FILE_REQUIRED']);
  }
  if (stat.size > maxBytes) throw new CompositionError('UNKNOWN', [field + '_TOO_LARGE']);
  return fs.readFileSync(resolved);
}

function parseArgs(argv = process.argv.slice(2)) {
  if (!Array.isArray(argv) || argv[0] !== 'apply') {
    throw new CompositionError('UNKNOWN', ['COMMAND_UNSUPPORTED']);
  }
  const allowed = new Set(['packet', 'manifest', 'request', 'patch', 'pr-request']);
  const values = {};
  let apply = false;
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      if (apply) throw new CompositionError('UNKNOWN', ['ARGUMENT_DUPLICATE:apply']);
      apply = true;
      continue;
    }
    if (!token.startsWith('--') || index + 1 >= argv.length) {
      throw new CompositionError('UNKNOWN', ['ARGUMENT_INVALID']);
    }
    const key = token.slice(2);
    if (!allowed.has(key) || Object.hasOwn(values, key)) {
      throw new CompositionError('UNKNOWN', ['ARGUMENT_UNSUPPORTED_OR_DUPLICATE:' + key]);
    }
    values[key] = argv[++index];
  }
  if (!apply) throw new CompositionError('BLOCKED', ['APPLY_FLAG_REQUIRED']);
  for (const key of allowed) {
    if (!values[key]) throw new CompositionError('UNKNOWN', ['ARGUMENT_REQUIRED:' + key]);
  }
  if (!PACKET_RE.test(values.packet)) throw new CompositionError('UNKNOWN', ['PACKET_REF_INVALID']);
  return {
    packetRef: values.packet,
    packetNumber: Number(values.packet.slice(1)),
    manifestFile: values.manifest,
    requestFile: values.request,
    patchFile: values.patch,
    prRequestFile: values['pr-request'],
  };
}

function parseManifest(text) {
  const parsed = taskHandoff.parseManifest(text);
  if (parsed.status !== 'VALID') {
    throw new CompositionError(
      parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      parsed.reasonCodes || ['MANIFEST_INVALID']
    );
  }
  try { lOwner.validateManifestShape(parsed.value); }
  catch (error) {
    throw new CompositionError(
      error instanceof lOwner.OwnerError ? error.kind : 'UNKNOWN',
      error instanceof lOwner.OwnerError ? error.reasonCodes : ['MANIFEST_L_OWNER_INVALID']
    );
  }
  return parsed.value;
}

function listComments(packetNumber, runner = stageEntry.runDefault) {
  const rows = [];
  for (let page = 1; page <= MAX_COMMENT_PAGES; page += 1) {
    const value = stageEntry.ghJson(
      'repos/' + REPO + '/issues/' + packetNumber
        + '/comments?per_page=' + PAGE_SIZE + '&page=' + page,
      runner
    );
    if (!Array.isArray(value)) throw new CompositionError('UNKNOWN', ['COMMENTS_INVALID']);
    rows.push(...value);
    if (value.length < PAGE_SIZE) return rows;
  }
  throw new CompositionError('UNKNOWN', ['COMMENTS_PAGINATION_BOUND']);
}

function exactCommentState(comments, text) {
  const target = String(text).trim();
  const matches = comments.filter((row) =>
    typeof row?.body === 'string' && row.body.trim() === target);
  return {
    count: matches.length,
    commentId: matches.length === 1 && Number.isSafeInteger(matches[0]?.id)
      ? matches[0].id : null,
  };
}

function parseOwnerResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CompositionError('UNKNOWN', ['L_OWNER_RESULT_INVALID']);
  }
  if (!['PASS', 'BLOCKED', 'CONFLICT', 'UNKNOWN', 'PREPARED'].includes(value.status)) {
    throw new CompositionError('UNKNOWN', ['L_OWNER_STATUS_INVALID']);
  }
  return value;
}

function parseOwnerCliResult(result) {
  if (!result || typeof result.text !== 'string') {
    throw new CompositionError('UNKNOWN', ['L_OWNER_CLI_RESULT_INVALID']);
  }
  let value;
  try { value = JSON.parse(result.text); }
  catch { throw new CompositionError('UNKNOWN', ['L_OWNER_CLI_JSON_INVALID']); }
  return {code: result.code, value: parseOwnerResult(value)};
}

function writeEvidenceFiles({manifestText, ledgerBody, packetBody}, tempRoot = null) {
  const dir = fs.mkdtempSync(path.join(tempRoot || os.tmpdir(), 'mcl-l-apply-'));
  const manifestPath = path.join(dir, 'manifest.md');
  const ledgerPath = path.join(dir, 'ledger.md');
  const packetPath = path.join(dir, 'packet.md');
  fs.writeFileSync(manifestPath, manifestText, {mode: 0o600});
  fs.writeFileSync(ledgerPath, ledgerBody, {mode: 0o600});
  fs.writeFileSync(packetPath, packetBody, {mode: 0o600});
  return {dir, manifestPath, ledgerPath, packetPath};
}

function updateEvidenceFiles(files, ledgerBody, packetBody) {
  fs.writeFileSync(files.ledgerPath, ledgerBody, {mode: 0o600});
  fs.writeFileSync(files.packetPath, packetBody, {mode: 0o600});
}

function removeEvidenceFiles(files) {
  try { fs.rmSync(files.dir, {recursive: true, force: true}); } catch (_) {}
}

function defaultReadCurrent(packetNumber, runner = stageEntry.runDefault) {
  const issue = stageEntry.ghJson('repos/' + REPO + '/issues/' + packetNumber, runner);
  const ledger = stageEntry.ghJson('repos/' + REPO + '/issues/' + LEDGER_ISSUE, runner);
  return {issue, ledger};
}

function defaultDeps(overrides = {}) {
  const runner = overrides.runner || stageEntry.runDefault;
  return {
    runner,
    readCurrent: overrides.readCurrent || ((packetNumber) => defaultReadCurrent(packetNumber, runner)),
    readComments: overrides.readComments || ((packetNumber) => listComments(packetNumber, runner)),
    postComment: overrides.postComment || ((packetNumber, body) =>
      stageEntry.postComment(packetNumber, body, runner)),
    releaseLease: overrides.releaseLease || ((packetRef, leaseId) =>
      stageEntry.releaseRepositoryLease({packetRef}, leaseId, runner)),
    validateEvidence: overrides.validateEvidence || workspaceHolder.validateEvidence,
    claimHolder: overrides.claimHolder || workspaceHolder.claimHolder,
    checkHolder: overrides.checkHolder || workspaceHolder.checkHolder,
    releaseHolder: overrides.releaseHolder || workspaceHolder.releaseHolder,
    ownerRunCli: overrides.ownerRunCli || lOwner.runCli,
    preflight: overrides.preflight || prPreflight.classifyNonClosingPrAuthoring,
    buildCompletionReceipt: overrides.buildCompletionReceipt || taskHandoff.buildCompletionReceipt,
    renderCompletionReceipt: overrides.renderCompletionReceipt || taskHandoff.renderCompletionReceipt,
    tempRoot: overrides.tempRoot || null,
  };
}

function requireLiveBinding({packetRef, manifest, manifestText, issue, ledger, comments, deps}) {
  if (!issue || issue.pull_request || issue.state !== 'open' || typeof issue.body !== 'string') {
    throw new CompositionError('BLOCKED', ['PACKET_NOT_OPEN']);
  }
  if (!ledger || typeof ledger.body !== 'string') {
    throw new CompositionError('UNKNOWN', ['LEDGER_READ_INVALID']);
  }
  if (manifest.packetRef !== packetRef) {
    throw new CompositionError('CONFLICT', ['MANIFEST_PACKET_CONFLICT']);
  }
  const exact = exactCommentState(comments, manifestText);
  if (exact.count === 0) throw new CompositionError('UNKNOWN', ['MANIFEST_COMMENT_MISSING']);
  if (exact.count !== 1 || exact.commentId === null) {
    throw new CompositionError('CONFLICT', ['MANIFEST_COMMENT_AMBIGUOUS']);
  }
  const checked = deps.validateEvidence({
    manifest,
    ledgerBody: ledger.body,
    packetBody: issue.body,
    requireActiveLease: true,
  });
  if (!checked?.ok) {
    throw new CompositionError('BLOCKED', [
      'COORDINATION_EVIDENCE_INVALID',
      ...(checked?.reasonCodes || []),
    ]);
  }
  return {manifestCommentId: exact.commentId};
}

function preflightRequest({packetRef, requestText, prRequestText, manifest}) {
  let request;
  let prRequest;
  try {
    request = lOwner.parseRequestText(requestText);
    prRequest = lOwner.parsePrRequestText(prRequestText, packetRef);
  } catch (error) {
    throw new CompositionError(
      error instanceof lOwner.OwnerError ? error.kind : 'UNKNOWN',
      error instanceof lOwner.OwnerError ? error.reasonCodes : ['REQUEST_INVALID']
    );
  }
  if (request.packet_ref !== packetRef) {
    throw new CompositionError('CONFLICT', ['REQUEST_PACKET_CONFLICT']);
  }
  const scopedPaths = lOwner.manifestPathScopes(manifest);
  if (JSON.stringify(request.expected_paths) !== JSON.stringify(scopedPaths)) {
    throw new CompositionError('CONFLICT', ['REQUEST_SCOPE_CONFLICT']);
  }
  const preflight = prPreflight.classifyNonClosingPrAuthoring({
    packetRef,
    title: prRequest.title,
    body: prRequest.body,
  });
  if (preflight.disposition !== 'PASS') {
    throw new CompositionError(
      preflight.disposition === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN',
      preflight.reasonCodes || ['PR_AUTHORING_PREFLIGHT_FAILED']
    );
  }
  return {request, prRequest};
}

function invokeOwnerApply({
  args, files, requestFile, patchFile, prRequestFile, claim, deps,
}) {
  const env = {...process.env, [workspaceHolder.CLAIM_ENV]: claim};
  const result = deps.ownerRunCli([
    'apply',
    '--manifest', files.manifestPath,
    '--ledger', files.ledgerPath,
    '--packet', files.packetPath,
    '--request', requestFile,
    '--patch', patchFile,
    '--pr-request', prRequestFile,
    '--apply',
  ], env);
  return parseOwnerCliResult(result);
}

function inspectPrepared(files, deps) {
  const result = deps.ownerRunCli([
    'inspect',
    '--manifest', files.manifestPath,
    '--ledger', files.ledgerPath,
    '--packet', files.packetPath,
  ], process.env);
  const parsed = parseOwnerCliResult(result);
  if (parsed.code !== 0 || parsed.value.status !== 'PASS') {
    throw new CompositionError(
      parsed.value.status === 'CONFLICT' ? 'CONFLICT'
        : parsed.value.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
      parsed.value.reason_codes || ['L_OWNER_INSPECT_FAILED']
    );
  }
  if (parsed.value.workspace_state !== 'PREPARED') {
    throw new CompositionError('BLOCKED', ['WORKSPACE_NOT_PREPARED']);
  }
  if (parsed.value.holder_state !== 'ABSENT') {
    throw new CompositionError('BLOCKED', ['HOLDER_NOT_ABSENT_BEFORE_COMPOSITION']);
  }
  return parsed.value;
}

function completionBody({manifest, owner, release, releasedState, deps}) {
  const receipt = deps.buildCompletionReceipt(manifest, {
    disposition: 'COMPLETE',
    outputRefs: [
      'commit:' + owner.new_head,
      'pr:#' + owner.pr_number,
    ],
    validationRefs: [
      'pr:#' + owner.pr_number,
      'receipt:mcl-l-repository-owner:apply:' + manifest.manifestId,
      'receipt:canonical-pr-authoring-preflight:pass',
    ],
    observedRefs: [
      'commit:' + manifest.observedBaseSha,
      'commit:' + owner.new_head,
      'pr:#' + owner.pr_number,
    ],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: {
      ledgerRef: '#2352',
      leaseId: manifest.leaseEvidence.leaseId,
      releasedGeneration: releasedState.generation,
      evidenceRef: release.value.evidenceRef,
    },
    workspaceResult: 'clean',
    blockerRefs: [],
    requiredUnknownRefs: [],
  });
  return {receipt, text: deps.renderCompletionReceipt(receipt)};
}

function postCompletionOnce(packetNumber, receiptText, deps) {
  const before = exactCommentState(deps.readComments(packetNumber), receiptText);
  if (before.count > 1) throw new CompositionError('CONFLICT', ['COMPLETION_COMMENT_AMBIGUOUS']);
  if (before.count === 1 && before.commentId !== null) return before.commentId;
  const commentId = deps.postComment(packetNumber, receiptText);
  if (!Number.isSafeInteger(commentId)) {
    throw new CompositionError('UNKNOWN', ['COMPLETION_COMMENT_WRITE_UNPROVEN']);
  }
  const after = exactCommentState(deps.readComments(packetNumber), receiptText);
  if (after.count !== 1 || after.commentId !== commentId) {
    throw new CompositionError('UNKNOWN', ['COMPLETION_COMMENT_READBACK_FAILED']);
  }
  return commentId;
}

function executeComposition(args, depsInput = {}) {
  const deps = defaultDeps(depsInput);
  const manifestText = readRegular(args.manifestFile, 'MANIFEST_FILE', MAX_MANIFEST_BYTES).toString('utf8');
  const requestText = readRegular(args.requestFile, 'REQUEST_FILE', MAX_REQUEST_BYTES).toString('utf8');
  readRegular(args.patchFile, 'PATCH_FILE', lOwner.MAX_PATCH_BYTES);
  const prRequestText = readRegular(
    args.prRequestFile, 'PR_REQUEST_FILE', MAX_PR_REQUEST_BYTES).toString('utf8');

  const manifest = parseManifest(manifestText);
  const {request, prRequest} = preflightRequest({
    packetRef: args.packetRef,
    requestText,
    prRequestText,
    manifest,
  });
  const current = deps.readCurrent(args.packetNumber);
  const comments = deps.readComments(args.packetNumber);
  const binding = requireLiveBinding({
    packetRef: args.packetRef,
    manifest,
    manifestText,
    issue: current.issue,
    ledger: current.ledger,
    comments,
    deps,
  });

  const files = writeEvidenceFiles({
    manifestText,
    ledgerBody: current.ledger.body,
    packetBody: current.issue.body,
  }, deps.tempRoot);

  let claim = null;
  try {
    inspectPrepared(files, deps);

    const claimed = deps.claimHolder(files);
    if (claimed?.result?.status !== 'CLAIMED'
        || typeof claimed.claim !== 'string') {
      const capability = claimed?.secret;
      if (claimed?.result?.status !== 'CLAIMED' || typeof capability !== 'string') {
        throw new CompositionError('BLOCKED', [
          ...(claimed?.result?.reasonCodes || ['HOLDER_CLAIM_FAILED']),
        ]);
      }
      claim = capability;
    } else {
      claim = claimed.claim;
    }

    const checked = deps.checkHolder(files, claim);
    if (checked?.status !== 'CHECK_PASS') {
      throw new CompositionError('BLOCKED', [
        ...(checked?.reasonCodes || ['HOLDER_CHECK_FAILED']),
      ]);
    }

    const ownerRun = invokeOwnerApply({
      args,
      files,
      requestFile: args.requestFile,
      patchFile: args.patchFile,
      prRequestFile: args.prRequestFile,
      claim,
      deps,
    });
    const owner = ownerRun.value;
    if (ownerRun.code !== 0 || owner.status !== 'PASS') {
      return output(
        owner.status === 'CONFLICT' ? 'CONFLICT'
          : owner.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
        owner.reason_codes || ['L_OWNER_APPLY_NOT_PASS'],
        {
          packetRef: args.packetRef,
          manifestId: manifest.manifestId,
          nextLegalAction: owner.next_legal_action || 'TARGETED_RECOVERY_REQUIRED',
        }
      );
    }
    if (!SHA40_RE.test(owner.new_head || '') || !Number.isSafeInteger(owner.pr_number)) {
      throw new CompositionError('CONFLICT', ['L_OWNER_SUCCESS_IDENTITY_INVALID']);
    }

    const release = deps.releaseLease(args.packetRef, manifest.leaseEvidence.leaseId);
    if (!release?.ok || typeof release?.value?.evidenceRef !== 'string') {
      throw new CompositionError('BLOCKED', ['D013_RELEASE_NOT_PROVEN']);
    }

    const after = deps.readCurrent(args.packetNumber);
    updateEvidenceFiles(files, after.ledger.body || '', after.issue.body || '');
    const released = deps.validateEvidence({
      manifest,
      ledgerBody: after.ledger.body || '',
      packetBody: after.issue.body || '',
      requireActiveLease: false,
    });
    if (!released?.ok || !Number.isSafeInteger(released?.state?.generation)) {
      throw new CompositionError('BLOCKED', [
        'D013_RELEASE_READBACK_INVALID',
        ...(released?.reasonCodes || []),
      ]);
    }

    const holderRelease = deps.releaseHolder(files, claim);
    if (holderRelease?.status !== 'RELEASED') {
      throw new CompositionError('BLOCKED', [
        ...(holderRelease?.reasonCodes || ['HOLDER_RELEASE_FAILED']),
      ]);
    }

    const completion = completionBody({
      manifest,
      owner,
      release,
      releasedState: released.state,
      deps,
    });
    const completionCommentId = postCompletionOnce(args.packetNumber, completion.text, deps);

    return output('PASS', [], {
      packetRef: args.packetRef,
      manifestId: manifest.manifestId,
      manifestCommentId: binding.manifestCommentId,
      commit: owner.new_head,
      prNumber: owner.pr_number,
      completionReceiptId: completion.receipt.receiptId,
      completionCommentId,
      releaseEvidenceRef: release.value.evidenceRef,
      nextLegalAction: 'VALIDATION_MERGE',
    });
  } finally {
    claim = null;
    removeEvidenceFiles(files);
  }
}

function exitCodeFor(status) {
  if (status === 'PASS') return 0;
  if (status === 'UNKNOWN') return 3;
  return 2;
}

function runCli(argv = process.argv.slice(2), deps = {}) {
  try {
    const args = parseArgs(argv);
    const result = executeComposition(args, deps);
    return {code: exitCodeFor(result.status), text: JSON.stringify(result) + '\n'};
  } catch (error) {
    const kind = error instanceof CompositionError ? error.kind : 'UNKNOWN';
    const reasons = error instanceof CompositionError ? error.reasonCodes : ['UNEXPECTED_ERROR'];
    const result = output(kind, reasons, {nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED'});
    return {code: exitCodeFor(kind), text: JSON.stringify(result) + '\n'};
  }
}

if (require.main === module) {
  const {code, text} = runCli();
  process.stdout.write(text);
  process.exitCode = code;
}

module.exports = {
  FALSE_AUTHORITY,
  MODE,
  CompositionError,
  completionBody,
  defaultDeps,
  exactCommentState,
  executeComposition,
  exitCodeFor,
  inspectPrepared,
  listComments,
  output,
  parseArgs,
  parseManifest,
  parseOwnerCliResult,
  postCompletionOnce,
  preflightRequest,
  requireLiveBinding,
  runCli,
};
