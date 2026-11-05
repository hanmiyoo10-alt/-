#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const stageEntry = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs'));
const taskHandoff = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const workspaceHolder = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));

const MODE = 'MCL_L_CURRENTIZATION_COMPOSITION';
const REPO = 'hanmiyoo10-alt/-';
const LEDGER_ISSUE = 2352;
const MAX_FILE_BYTES = 256 * 1024;
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

function readRegular(filePath, label, maxBytes = MAX_FILE_BYTES) {
  const resolved = path.resolve(filePath);
  let stat;
  try { stat = fs.lstatSync(resolved); }
  catch { throw new CompositionError('UNKNOWN', [label + '_READ_FAILED']); }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new CompositionError('UNKNOWN', [label + '_REGULAR_FILE_REQUIRED']);
  }
  if (stat.size < 1 || stat.size > maxBytes) {
    throw new CompositionError('UNKNOWN', [label + '_SIZE_INVALID']);
  }
  return fs.readFileSync(resolved, 'utf8');
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv[0] !== 'apply') {
    throw new CompositionError('UNKNOWN', ['COMMAND_UNSUPPORTED']);
  }
  const allowed = new Set(['packet', 'manifest', 'ledger', 'packet-file', 'request']);
  const values = {};
  let apply = false;
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--apply') {
      if (apply) throw new CompositionError('UNKNOWN', ['APPLY_FLAG_DUPLICATE']);
      apply = true;
      continue;
    }
    if (!token.startsWith('--') || i + 1 >= argv.length) {
      throw new CompositionError('UNKNOWN', ['ARGUMENT_INVALID']);
    }
    const key = token.slice(2);
    if (!allowed.has(key) || Object.hasOwn(values, key)) {
      throw new CompositionError('UNKNOWN', ['ARGUMENT_UNSUPPORTED_OR_DUPLICATE:' + key]);
    }
    values[key] = argv[++i];
  }
  if (!apply) throw new CompositionError('BLOCKED', ['APPLY_FLAG_REQUIRED']);
  for (const key of allowed) {
    if (!values[key]) throw new CompositionError('UNKNOWN', ['ARGUMENT_REQUIRED:' + key]);
  }
  if (!PACKET_RE.test(values.packet)) {
    throw new CompositionError('UNKNOWN', ['PACKET_REF_INVALID']);
  }
  return {
    packetRef: values.packet,
    packetNumber: Number(values.packet.slice(1)),
    manifestPath: path.resolve(values.manifest),
    ledgerPath: path.resolve(values.ledger),
    packetPath: path.resolve(values['packet-file']),
    requestPath: path.resolve(values.request),
  };
}

function parseManifest(text) {
  const parsed = taskHandoff.parseManifest(text);
  if (parsed.status !== 'VALID') {
    throw new CompositionError(
      parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      parsed.reasonCodes || ['MANIFEST_INVALID'],
    );
  }
  return parsed.value;
}

function parseCurrentizerRequest(text) {
  let value;
  try { value = JSON.parse(text); }
  catch { throw new CompositionError('UNKNOWN', ['CURRENTIZER_REQUEST_JSON_INVALID']); }
  const keys = [
    'schemaVersion', 'branch', 'expectedHead', 'generationBase',
    'currentMain', 'owningCi', 'requiredValidations',
  ];
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).sort().join('\0') !== [...keys].sort().join('\0')
      || value.schemaVersion !== 1) {
    throw new CompositionError('UNKNOWN', ['CURRENTIZER_REQUEST_SCHEMA_INVALID']);
  }
  for (const field of ['expectedHead', 'generationBase', 'currentMain']) {
    if (!SHA40_RE.test(value[field] || '')) {
      throw new CompositionError('UNKNOWN', ['CURRENTIZER_REQUEST_COMMIT_INVALID:' + field]);
    }
  }
  if (typeof value.branch !== 'string' || !value.branch) {
    throw new CompositionError('UNKNOWN', ['CURRENTIZER_REQUEST_BRANCH_INVALID']);
  }
  if (typeof value.owningCi !== 'string' || !value.owningCi.trim()
      || !Array.isArray(value.requiredValidations) || !value.requiredValidations.length
      || value.requiredValidations.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new CompositionError('UNKNOWN', ['CURRENTIZER_REQUEST_VALIDATION_INVALID']);
  }
  return value;
}

function validateBinding({packetRef, manifest, ledgerBody, packetBody, request, deps}) {
  const reasons = [];
  if (manifest.packetRef !== packetRef) reasons.push('MANIFEST_PACKET_CONFLICT');
  if (manifest.route !== 'L' || manifest.executor !== 'L') reasons.push('L_ROUTE_EXECUTOR_REQUIRED');
  if (manifest.workspace?.kind !== 'repository') reasons.push('REPOSITORY_WORKSPACE_REQUIRED');
  if (manifest.leaseRequirement !== 'REQUIRED') reasons.push('ACTIVE_D013_REQUIRED');
  if (request.branch !== manifest.workspace?.branch) reasons.push('CURRENTIZER_BRANCH_MANIFEST_CONFLICT');
  if (request.expectedHead !== manifest.observedBaseSha) reasons.push('CURRENTIZER_HEAD_MANIFEST_CONFLICT');
  const evidence = deps.validateEvidence({
    manifest, ledgerBody, packetBody, requireActiveLease: true,
  });
  if (!evidence?.ok) reasons.push(...(evidence?.reasonCodes || ['D013_D014_EVIDENCE_INVALID']));
  if (reasons.length) throw new CompositionError('BLOCKED', reasons);
  return evidence;
}

function defaultRunCurrentizer({manifest, requestPath}) {
  const executable = path.join(ROOT, 'tools/repo-write/currentize_candidate.py');
  const env = Object.fromEntries(
    ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR', 'GH_CONFIG_DIR']
      .filter((key) => typeof process.env[key] === 'string' && process.env[key])
      .map((key) => [key, process.env[key]]),
  );
  const result = childProcess.spawnSync('python3', [
    executable,
    '--repo', manifest.workspace.worktree,
    '--request-file', requestPath,
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 512 * 1024,
    shell: false,
    env,
  });
  let value = null;
  try { value = JSON.parse(String(result.stdout || '').trim()); } catch {}
  if (!value || typeof value !== 'object') {
    throw new CompositionError('UNKNOWN', ['CURRENTIZER_RESULT_UNOBSERVED']);
  }
  return {code: Number.isInteger(result.status) ? result.status : 127, value};
}

function defaultReadCurrent(packetNumber, runner = stageEntry.runDefault) {
  return {
    issue: stageEntry.ghJson('repos/' + REPO + '/issues/' + packetNumber, runner),
    ledger: stageEntry.ghJson('repos/' + REPO + '/issues/' + LEDGER_ISSUE, runner),
  };
}

function defaultDeps(overrides = {}) {
  const runner = overrides.runner || stageEntry.runDefault;
  return {
    validateEvidence: overrides.validateEvidence || workspaceHolder.validateEvidence,
    claimHolder: overrides.claimHolder || workspaceHolder.claimHolder,
    checkHolder: overrides.checkHolder || workspaceHolder.checkHolder,
    releaseHolder: overrides.releaseHolder || workspaceHolder.releaseHolder,
    releaseLease: overrides.releaseLease || ((packetRef, leaseId) =>
      stageEntry.releaseRepositoryLease({packetRef}, leaseId, runner)),
    readCurrent: overrides.readCurrent || ((packetNumber) => defaultReadCurrent(packetNumber, runner)),
    readComments: overrides.readComments || ((packetNumber) => stageEntry.readPacketComments(packetNumber, runner)),
    runCurrentizer: overrides.runCurrentizer || defaultRunCurrentizer,
    buildCompletionReceipt: overrides.buildCompletionReceipt || taskHandoff.buildCompletionReceipt,
    renderCompletionReceipt: overrides.renderCompletionReceipt || taskHandoff.renderCompletionReceipt,
    postComment: overrides.postComment || ((packetNumber, body) =>
      stageEntry.postComment(packetNumber, body, runner)),
  };
}

function requireDurableManifest(manifestText, comments) {
  if (!Array.isArray(comments)) {
    throw new CompositionError('UNKNOWN', ['MANIFEST_COMMENT_DISCOVERY_INVALID']);
  }
  const target = String(manifestText).trim();
  const matches = comments.filter((row) =>
    typeof row?.body === 'string' && row.body.trim() === target);
  if (matches.length === 0) {
    throw new CompositionError('UNKNOWN', ['MANIFEST_COMMENT_MISSING']);
  }
  if (matches.length !== 1) {
    throw new CompositionError('CONFLICT', ['MANIFEST_COMMENT_AMBIGUOUS']);
  }
}

function classifyCurrentizer(value) {
  const disposition = String(value?.disposition || '');
  if (disposition === 'CURRENT' || disposition === 'CURRENTIZED') return 'PASS';
  if (disposition === 'CONFLICT') return 'CONFLICT';
  if (disposition === 'UNKNOWN' || value?.remoteMutationMayHaveOccurred === true) return 'UNKNOWN';
  return 'BLOCKED';
}

function completionText({manifest, request, currentizer, release, deps}) {
  const generation = release?.value?.observedGeneration;
  if (!Number.isSafeInteger(generation)
      || generation <= manifest.leaseEvidence.acquiredGeneration
      || typeof release?.value?.evidenceRef !== 'string') {
    throw new CompositionError('BLOCKED', ['D013_RELEASE_EVIDENCE_INVALID']);
  }
  const refs = [manifest.observedBaseSha, request.currentMain, currentizer.newHead]
    .filter((value) => SHA40_RE.test(value || ''))
    .map((value) => 'commit:' + value);
  const receipt = deps.buildCompletionReceipt(manifest, {
    disposition: 'COMPLETE',
    outputRefs: ['commit:' + currentizer.newHead],
    validationRefs: [
      'path:tools/repo-write/currentize_candidate.py',
      release.value.evidenceRef,
    ],
    observedRefs: [...new Set(refs)],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: {
      ledgerRef: '#2352',
      leaseId: manifest.leaseEvidence.leaseId,
      releasedGeneration: generation,
      evidenceRef: release.value.evidenceRef,
    },
    workspaceResult: 'clean',
    blockerRefs: [],
    requiredUnknownRefs: [],
  });
  return deps.renderCompletionReceipt(receipt);
}

function execute(args, overrides = {}) {
  const deps = defaultDeps(overrides);
  const manifestText = readRegular(args.manifestPath, 'MANIFEST');
  const ledgerBody = readRegular(args.ledgerPath, 'LEDGER');
  const packetBody = readRegular(args.packetPath, 'PACKET');
  const requestText = readRegular(args.requestPath, 'CURRENTIZER_REQUEST', 64 * 1024);
  const manifest = parseManifest(manifestText);
  const request = parseCurrentizerRequest(requestText);
  validateBinding({packetRef: args.packetRef, manifest, ledgerBody, packetBody, request, deps});
  requireDurableManifest(manifestText, deps.readComments(args.packetNumber));

  const holderInput = {
    manifestPath: args.manifestPath,
    ledgerPath: args.ledgerPath,
    packetPath: args.packetPath,
  };
  const claimed = deps.claimHolder(holderInput);
  if (claimed?.result?.status !== 'CLAIMED' || typeof claimed?.secret !== 'string') {
    throw new CompositionError('BLOCKED', [
      ...(claimed?.result?.reasonCodes || ['HOLDER_CLAIM_FAILED']),
    ]);
  }
  const claim = claimed.secret;

  const checked = deps.checkHolder(holderInput, claim);
  if (checked?.status !== 'CHECK_PASS') {
    throw new CompositionError('BLOCKED', [
      ...(checked?.reasonCodes || ['HOLDER_CHECK_FAILED']),
    ]);
  }

  const currentizerRun = deps.runCurrentizer({manifest, request, requestPath: args.requestPath});
  const currentizer = currentizerRun?.value;
  const currentizerStatus = classifyCurrentizer(currentizer);
  if (currentizerStatus !== 'PASS') {
    return output(currentizerStatus, [
      currentizer?.reasonCode || 'CURRENTIZER_NOT_PASS',
    ], {
      packetRef: args.packetRef,
      currentizerDisposition: currentizer?.disposition || null,
      remoteMutationMayHaveOccurred: currentizer?.remoteMutationMayHaveOccurred === true,
      effects: {holderClaimed: 1, currentizerInvoked: 1, d013Released: 0, holderReleased: 0, d014Published: 0},
      nextLegalAction: currentizer?.remoteMutationMayHaveOccurred === true
        ? 'PRESERVE_COORDINATION_AND_RECOVER'
        : 'TARGETED_CURRENTIZATION_REPAIR_REQUIRED',
    });
  }
  if (!SHA40_RE.test(currentizer.newHead || '')) {
    throw new CompositionError('CONFLICT', ['CURRENTIZER_SUCCESS_HEAD_INVALID']);
  }

  const afterEffectHolder = deps.checkHolder(holderInput, claim);
  if (afterEffectHolder?.status !== 'CHECK_PASS') {
    throw new CompositionError('BLOCKED', [
      ...(afterEffectHolder?.reasonCodes || ['HOLDER_CHECK_AFTER_CURRENTIZER_FAILED']),
    ]);
  }

  const release = deps.releaseLease(args.packetRef, manifest.leaseEvidence.leaseId);
  if (!release?.ok) throw new CompositionError('BLOCKED', ['D013_RELEASE_NOT_PROVEN']);

  const fresh = deps.readCurrent(args.packetNumber);
  if (!fresh?.issue || fresh.issue.state !== 'open' || typeof fresh.issue.body !== 'string'
      || !fresh?.ledger || typeof fresh.ledger.body !== 'string') {
    throw new CompositionError('UNKNOWN', ['POST_RELEASE_EVIDENCE_UNAVAILABLE']);
  }
  fs.writeFileSync(args.ledgerPath, fresh.ledger.body, {mode: 0o600});
  fs.writeFileSync(args.packetPath, fresh.issue.body, {mode: 0o600});
  const releasedEvidence = deps.validateEvidence({
    manifest,
    ledgerBody: fresh.ledger.body,
    packetBody: fresh.issue.body,
    requireActiveLease: false,
  });
  if (!releasedEvidence?.ok) {
    throw new CompositionError('BLOCKED', [
      'D013_RELEASE_READBACK_INVALID',
      ...(releasedEvidence?.reasonCodes || []),
    ]);
  }

  const holderRelease = deps.releaseHolder(holderInput, claim);
  if (holderRelease?.status !== 'RELEASED') {
    throw new CompositionError('BLOCKED', [
      ...(holderRelease?.reasonCodes || ['HOLDER_RELEASE_FAILED']),
    ]);
  }

  const receiptText = completionText({manifest, request, currentizer, release, deps});
  const commentId = deps.postComment(args.packetNumber, receiptText);
  if (!Number.isSafeInteger(commentId)) {
    throw new CompositionError('UNKNOWN', ['D014_COMPLETION_WRITE_UNPROVEN']);
  }

  return output('PASS', [], {
    packetRef: args.packetRef,
    manifestId: manifest.manifestId,
    currentizerDisposition: currentizer.disposition,
    newHead: currentizer.newHead,
    effects: {holderClaimed: 1, currentizerInvoked: 1, d013Released: 1, holderReleased: 1, d014Published: 1},
    nextLegalAction: 'VALIDATE_CURRENTIZED_EXACT_HEAD',
  });
}

function runCli(argv = process.argv.slice(2), overrides = {}) {
  let result;
  try {
    const args = parseArgs(argv);
    result = execute(args, overrides);
  } catch (error) {
    const kind = error instanceof CompositionError ? error.kind : 'UNKNOWN';
    const reasons = error instanceof CompositionError ? error.reasonCodes : ['UNEXPECTED_ERROR'];
    result = output(kind, reasons, {nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED'});
  }
  const code = result.status === 'PASS' ? 0 : result.status === 'UNKNOWN' ? 3 : 2;
  return {code, text: JSON.stringify(result) + '\n'};
}

if (require.main === module) {
  const result = runCli();
  process.stdout.write(result.text);
  process.exitCode = result.code;
}

module.exports = {
  CompositionError,
  classifyCurrentizer,
  completionText,
  execute,
  output,
  parseArgs,
  parseCurrentizerRequest,
  requireDurableManifest,
  runCli,
  validateBinding,
};
