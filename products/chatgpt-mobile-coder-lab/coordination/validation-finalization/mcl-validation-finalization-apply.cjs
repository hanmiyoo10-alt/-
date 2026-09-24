#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const REPO = 'hanmiyoo10-alt/-';
const TARGET = Object.freeze({
  packet: 2463,
  packetRef: '#2463',
  pr: 2464,
  candidate: 'd3b53402b5629a30845da024ecfafeeae5cc0553',
  merge: '11d297dc0aa7b08d99aafb5ea2b5e667c02ebf3e',
  manifestId: '4dc31adefc0c62c36f12eaf3d07db6782913813923c24544326d75d0f24b01e1',
  leaseId: '7301e6def893e383129825f3cc5427da39280e4ab03f61e643680f8e6da34d1b',
  acquiredGeneration: 381,
  releaseRun: 35683545760,
  releasedGeneration: 382,
  ownerValidationRun: 35683368917,
  requiredRun: 35683369017,
  requiredJob: 106604969118,
});
const EXPECTED_EFFECTS = Object.freeze([
  'CANONICAL_VALIDATION_MERGE_RECEIPT',
  'COORDINATION_FINALIZATION',
]);
const TARGET_2786 = Object.freeze({
  packet: 2786,
  packetRef: '#2786',
  pr: 2878,
  candidate: '81049faef1f4a029af42b3be4d4146341b5167da',
  merge: '0a25b7691bf5d768aced94403b32ebdb50f12cc3',
  workspaceManifestId: '60ecd6edd15f59ad81bcaf8bee601490c12f94734ff1111b338eaff2e5048756',
  workspaceManifestPhaseId: '2786-implementation-pr-stage-entry',
  workspaceLeaseId: 'd116ebcba38d2ee167a5ea5351422d93c2d39f60e4e8e53c349429165286a800',
  workspaceAcquiredGeneration: 530,
  workspaceBranch: 'server/mcl-packet-2786',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-2786',
  implementationReceiptDigest:
    'f56874a0c8b0a4a9c037d1e4cd490a01a6d293d1a0fe608eacc0a975e73160aa',
  requiredCoordinationGates: Object.freeze([
    'implementation-coordination-readback',
    'implementation-d013-release',
  ]),
});
const EXPECTED_EFFECTS_2786 = Object.freeze([
  'CANONICAL_VALIDATION_MERGE_RECEIPT',
]);
const PROFILES = Object.freeze({
  '#2463': Object.freeze({
    target: TARGET,
    mode: 'VALIDATION_D014',
    expectedEffects: EXPECTED_EFFECTS,
  }),
  '#2786': Object.freeze({
    target: TARGET_2786,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
});

function profileFor(packetRef) {
  const profile = PROFILES[packetRef];
  if (!profile) fail('BLOCKED', 'PACKET_NOT_REVIEWED_TARGET');
  return profile;
}

const handoff = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const taskLease = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const holderOwner = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
const completionSet = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/completion-receipt-set.cjs'));
const stageReceipt = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs'));
const finalization = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/validation-finalization/validation-finalization-owner.cjs'));

const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

class ApplyError extends Error {
  constructor(kind, reasonCodes) {
    const unique = [...new Set(reasonCodes)].sort();
    super(unique[0] || kind);
    this.kind = kind;
    this.reasonCodes = unique;
  }
}

function fail(kind, ...reasonCodes) {
  throw new ApplyError(kind, reasonCodes);
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function unique(values) {
  return [...new Set(values)].sort();
}
function output(status, extras = {}, reasonCodes = [], packetRef = TARGET.packetRef) {
  return {
    schemaVersion: 1,
    mode: 'MCL_VALIDATION_FINALIZATION_APPLY',
    validity: 'VALID',
    packetRef,
    status,
    reasonCodes: unique(reasonCodes),
    ...extras,
    authority: {...FALSE_AUTHORITY},
  };
}
function defaultRunner(args, options = {}) {
  const result = childProcess.spawnSync('gh', args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    input: options.input || null,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}
function runGitRead(worktree, args, spawn = childProcess.spawnSync) {
  const result = spawn('git', ['-C', worktree, ...args], {
    encoding: 'utf8',
    shell: false,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.status !== 0) fail('UNKNOWN', 'WORKSPACE_GIT_READ_FAILED');
  return (result.stdout || '').trim();
}
function ghJson(endpoint, runner = defaultRunner, options = {}) {
  const args = ['api', endpoint, '--method', options.method || 'GET',
    '--header', 'Accept: application/vnd.github+json'];
  const runOptions = {};
  if (options.body !== undefined) {
    args.push('--input', '-');
    runOptions.input = JSON.stringify(options.body);
  }
  const result = runner(args, runOptions);
  if (result.code !== 0) fail(options.write ? 'UNKNOWN' : 'UNKNOWN',
    options.write ? 'GITHUB_COMMENT_WRITE_FAILED' : 'GITHUB_READ_FAILED');
  try { return JSON.parse(result.stdout || 'null'); }
  catch { fail('UNKNOWN', 'GITHUB_JSON_INVALID'); }
}
function readIssue(number, runner) {
  const issue = ghJson('repos/' + REPO + '/issues/' + number, runner);
  if (!issue || issue.pull_request || typeof issue.body !== 'string') {
    fail('UNKNOWN', 'PACKET_READ_INVALID');
  }
  return issue;
}
function readComments(number, runner = defaultRunner) {
  const comments = [];
  const pageSize = 100;
  const maxPages = 5;
  for (let page = 1; page <= maxPages; page += 1) {
    const rows = ghJson('repos/' + REPO + '/issues/' + number
      + '/comments?per_page=' + pageSize + '&page=' + page, runner);
    if (!Array.isArray(rows)) fail('UNKNOWN', 'COMMENT_READ_INVALID');
    comments.push(...rows);
    if (rows.length < pageSize) return comments;
  }
  fail('UNKNOWN', 'COMMENT_DISCOVERY_PARTIAL');
}
function readPr(number, runner = defaultRunner) {
  const pr = ghJson('repos/' + REPO + '/pulls/' + number, runner);
  if (!pr || pr.number !== number) fail('UNKNOWN', 'PR_READ_INVALID');
  return pr;
}
function readReleaseEvidence(runner = defaultRunner) {
  const metaRun = runner(['run', 'view', String(TARGET.releaseRun), '--repo', REPO,
    '--json', 'databaseId,name,event,status,conclusion,headSha,url']);
  if (metaRun.code !== 0) fail('UNKNOWN', 'RELEASE_RUN_READ_FAILED');
  let meta;
  try { meta = JSON.parse(metaRun.stdout || '{}'); }
  catch { fail('UNKNOWN', 'RELEASE_RUN_JSON_INVALID'); }
  if (meta.databaseId !== TARGET.releaseRun || meta.name !== 'MCL Task Lease'
      || meta.event !== 'workflow_dispatch' || meta.status !== 'completed'
      || meta.conclusion !== 'success') {
    fail('CONFLICT', 'RELEASE_RUN_IDENTITY_CONFLICT');
  }
  const logRun = runner(['run', 'view', String(TARGET.releaseRun), '--repo', REPO, '--log']);
  if (logRun.code !== 0) fail('UNKNOWN', 'RELEASE_RUN_LOG_FAILED');
  const log = logRun.stdout || '';
  const required = [
    'MCL_LEASE_PACKET_REF: ' + TARGET.packetRef,
    'MCL_LEASE_ID: ' + TARGET.leaseId,
    '"status":"RELEASE_UPDATED"',
    '"generation":' + TARGET.releasedGeneration,
    '"leaseId":"' + TARGET.leaseId + '"',
  ];
  if (required.some((item) => !log.includes(item))) {
    fail('CONFLICT', 'RELEASE_RUN_PROVENANCE_CONFLICT');
  }
  return {
    status: 'PROVEN',
    runId: TARGET.releaseRun,
    releasedGeneration: TARGET.releasedGeneration,
    evidenceRef: 'run:' + TARGET.releaseRun,
  };
}

function commentBody(comment) {
  return typeof comment?.body === 'string' ? comment.body : '';
}
function stageReceiptsFromComments(comments) {
  const rows = [];
  for (const comment of comments) {
    const body = commentBody(comment);
    if (!body.includes('canonical-main-stage-receipt:v1')) continue;
    const parsed = stageReceipt.parseRenderedStageReceipt(body);
    if (parsed.status !== 'VALID') fail(
      parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      'CANONICAL_STAGE_RECEIPT_INVALID_PRESENT');
    rows.push({comment, receipt: parsed.value});
  }
  return rows;
}
function selectImplementationReceipt(stageRows, pr) {
  const matches = stageRows.filter(({receipt}) => {
    if (receipt.stage !== 'IMPLEMENTATION_PR' || receipt.packetNumber !== TARGET.packet
        || receipt.status !== 'PASS' || receipt.nextLegalAction !== 'VALIDATION_MERGE') {
      return false;
    }
    return receipt.authorityRefs.some((row) =>
      row.kind === 'PR' && row.locator === 'pr:#' + TARGET.pr
      && row.identity === TARGET.candidate);
  });
  const byDigest = new Map(matches.map((row) => [row.receipt.receiptDigest, row]));
  if (byDigest.size !== 1) {
    fail(byDigest.size ? 'CONFLICT' : 'UNKNOWN',
      byDigest.size ? 'IMPLEMENTATION_RECEIPT_AMBIGUOUS' : 'IMPLEMENTATION_RECEIPT_MISSING');
  }
  const selected = [...byDigest.values()][0];
  if (pr?.head?.sha !== TARGET.candidate) fail('CONFLICT', 'PR_HEAD_CONFLICT');
  return selected;
}
function manifestsFromComments(comments) {
  const rows = [];
  for (const comment of comments) {
    const body = commentBody(comment);
    if (!body.includes('mcl-task-manifest:v1')) continue;
    const parsed = handoff.parseManifest(body);
    if (parsed.status !== 'VALID') fail(
      parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      'D014_MANIFEST_INVALID_PRESENT');
    rows.push({comment, manifest: parsed.value, text: body});
  }
  return rows;
}
function selectTargetManifest(comments) {
  const rows = manifestsFromComments(comments)
    .filter((row) => row.manifest.manifestId === TARGET.manifestId);
  if (rows.length !== 1) fail(rows.length ? 'CONFLICT' : 'UNKNOWN',
    rows.length ? 'TARGET_MANIFEST_AMBIGUOUS' : 'TARGET_MANIFEST_MISSING');
  const manifest = rows[0].manifest;
  if (manifest.packetRef !== TARGET.packetRef
      || manifest.phaseId !== 'validation-merge'
      || manifest.phaseClass !== 'VALIDATION'
      || manifest.route !== 'S'
      || manifest.executor !== 'S'
      || manifest.leaseRequirement !== 'REQUIRED'
      || manifest.leaseEvidence?.leaseId !== TARGET.leaseId
      || manifest.leaseEvidence?.acquiredGeneration !== TARGET.acquiredGeneration
      || manifest.workspace?.kind !== 'repository'
      || manifest.workspace?.branch !== 'server/mcl-wireless-adb-new-chat-landing-2463'
      || manifest.workspace?.worktree !== '/root/nyang-worktrees/mcl-wireless-adb-new-chat-landing-2463') {
    fail('CONFLICT', 'TARGET_MANIFEST_IDENTITY_CONFLICT');
  }
  return rows[0];
}
function completionState(comments, manifest) {
  const targetTexts = [];
  for (const comment of comments) {
    const body = commentBody(comment);
    if (!body.includes('mcl-task-completion-receipt:v1')) continue;
    const parsed = handoff.parseCompletionReceipt(body);
    if (parsed.status !== 'VALID') fail(
      parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      'D014_RECEIPT_INVALID_PRESENT');
    if (parsed.value.manifestId === manifest.manifestId) targetTexts.push(body);
  }
  if (!targetTexts.length) {
    return {status: 'ABSENT', receiptIds: [], representativeReceiptId: null};
  }
  const classified = completionSet.classify({
    manifestId: manifest.manifestId,
    receiptTexts: targetTexts,
  });
  if (classified.status === 'CONFLICT') fail('CONFLICT', 'D014_COMPLETION_CONFLICT');
  if (!['SINGLE', 'MULTIPLE_EQUIVALENT'].includes(classified.status)) {
    fail('UNKNOWN', 'D014_COMPLETION_UNRESOLVED');
  }
  return {
    status: 'COMPLETE',
    receiptIds: classified.receiptIds,
    representativeReceiptId: classified.representativeReceiptId,
  };
}
function validationStageState(stageRows, implReceipt, pr) {
  const rows = stageRows.filter(({receipt}) =>
    receipt.stage === 'VALIDATION_MERGE' && receipt.packetNumber === TARGET.packet);
  if (!rows.length) return {status: 'ABSENT', receipt: null};
  const exact = [];
  for (const row of rows) {
    const receipt = row.receipt;
    const hasPr = receipt.authorityRefs.some((item) =>
      item.kind === 'PR' && item.locator === 'pr:#' + TARGET.pr
      && item.identity === TARGET.candidate);
    const hasMerge = receipt.authorityRefs.some((item) =>
      item.kind === 'COMMIT' && item.identity === TARGET.merge);
    if (receipt.status === 'PASS'
        && receipt.nextLegalAction === 'POSTMERGE_CONVERGENCE'
        && hasPr && hasMerge
        && same(receipt.scope.paths, implReceipt.scope.paths)
        && receipt.scope.diffRequired === true
        && receipt.scope.diffIdentity === implReceipt.scope.diffIdentity) {
      exact.push(row);
    } else {
      fail('CONFLICT', 'VALIDATION_STAGE_RECEIPT_CONFLICT');
    }
  }
  const byDigest = new Map(exact.map((row) => [row.receipt.receiptDigest, row]));
  if (byDigest.size !== 1) fail('CONFLICT', 'VALIDATION_STAGE_RECEIPT_AMBIGUOUS');
  if (pr.merge_commit_sha !== TARGET.merge) fail('CONFLICT', 'PR_MERGE_IDENTITY_CONFLICT');
  return {status: 'PASS', receipt: [...byDigest.values()][0].receipt};
}
function readWorkspace(manifest, spawn = childProcess.spawnSync) {
  const inspected = holderOwner.inspectWorkspace(manifest);
  if (!inspected.ok || !inspected.holderPath) {
    fail('BLOCKED', ...(inspected.reasonCodes || ['WORKSPACE_INSPECT_FAILED']));
  }
  const worktree = manifest.workspace.worktree;
  const branch = runGitRead(worktree, ['branch', '--show-current'], spawn);
  const head = runGitRead(worktree, ['rev-parse', 'HEAD'], spawn);
  const dirty = runGitRead(worktree,
    ['status', '--porcelain=v1', '--untracked-files=all'], spawn);
  if (branch !== manifest.workspace.branch || head !== TARGET.candidate) {
    fail('CONFLICT', 'WORKSPACE_IDENTITY_CONFLICT');
  }
  if (dirty) fail('BLOCKED', 'WORKSPACE_NOT_CLEAN');
  const holder = holderOwner.readHolder(inspected.holderPath);
  if (holder.missing) {
    return {state: 'CLEAN', holderState: 'ABSENT', holderPath: inspected.holderPath};
  }
  if (!holder.ok) fail('CONFLICT', 'HOLDER_STATE_CONFLICT');
  if (holder.value.manifestId !== manifest.manifestId
      || holder.value.leaseId !== TARGET.leaseId) {
    fail('CONFLICT', 'HOLDER_IDENTITY_CONFLICT');
  }
  return {state: 'CLEAN', holderState: 'PRESENT_EXACT', holderPath: inspected.holderPath};
}
function readLedgerState(runner = defaultRunner) {
  const ledger = readIssue(2352, runner);
  const parsed = taskLease.parseLedger(ledger.body || '');
  if (!parsed.ok || parsed.state.status !== 'ACTIVE') fail('UNKNOWN', 'LEDGER_STATE_INVALID');
  const matches = parsed.state.activeLeases.filter((item) => item.leaseId === TARGET.leaseId);
  if (matches.length) fail('BLOCKED', 'TARGET_LEASE_STILL_ACTIVE');
  return {body: ledger.body || '', generation: parsed.state.generation, targetLeaseAbsent: true};
}
function pathScopeDigest(paths) {
  return 'sha256:' + sha256(JSON.stringify([...paths]));
}

function coordinationGatesProven(receipt, target = TARGET_2786) {
  const pass = new Set((receipt.requiredGates || [])
    .filter((row) => row.result === 'PASS')
    .map((row) => row.name));
  const missing = target.requiredCoordinationGates.filter((name) => !pass.has(name));
  if (missing.length) {
    fail('BLOCKED', ...missing.map((name) =>
      'IMPLEMENTATION_COORDINATION_GATE_NOT_PASS:' + name));
  }
  return true;
}
function select2786ImplementationReceipt(stageRows, pr, target = TARGET_2786) {
  const matches = stageRows.filter(({receipt}) =>
    receipt.stage === 'IMPLEMENTATION_PR'
    && receipt.packetNumber === target.packet
    && receipt.status === 'PASS'
    && receipt.nextLegalAction === 'VALIDATION_MERGE'
    && receipt.receiptDigest === target.implementationReceiptDigest
    && receipt.authorityRefs.some((row) =>
      row.kind === 'PR' && row.locator === 'pr:#' + target.pr
      && row.identity === target.candidate));
  if (matches.length !== 1) {
    fail(matches.length ? 'CONFLICT' : 'UNKNOWN',
      matches.length ? 'IMPLEMENTATION_RECEIPT_AMBIGUOUS'
        : 'IMPLEMENTATION_RECEIPT_MISSING');
  }
  if (pr?.head?.sha !== target.candidate) fail('CONFLICT', 'PR_HEAD_CONFLICT');
  coordinationGatesProven(matches[0].receipt, target);
  return matches[0];
}
function select2786WorkspaceManifest(comments, target = TARGET_2786) {
  const exactToken = '"manifestId": "' + target.workspaceManifestId + '"';
  const candidates = comments.filter((comment) => {
    const body = commentBody(comment);
    return body.includes('mcl-task-manifest:v1') && body.includes(exactToken);
  });
  if (candidates.length !== 1) fail(candidates.length ? 'CONFLICT' : 'UNKNOWN',
    candidates.length ? 'WORKSPACE_MANIFEST_AMBIGUOUS' : 'WORKSPACE_MANIFEST_MISSING');
  const parsed = handoff.parseManifest(commentBody(candidates[0]));
  if (parsed.status !== 'VALID') fail(
    parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
    'WORKSPACE_MANIFEST_INVALID');
  const manifest = parsed.value;
  if (manifest.manifestId !== target.workspaceManifestId
      || manifest.packetRef !== target.packetRef
      || manifest.phaseId !== target.workspaceManifestPhaseId
      || manifest.phaseClass !== 'REPOSITORY_MUTATION'
      || manifest.route !== 'S'
      || manifest.executor !== 'S'
      || manifest.leaseRequirement !== 'REQUIRED'
      || manifest.leaseEvidence?.leaseId !== target.workspaceLeaseId
      || manifest.leaseEvidence?.acquiredGeneration !== target.workspaceAcquiredGeneration
      || manifest.workspace?.kind !== 'repository'
      || manifest.workspace?.branch !== target.workspaceBranch
      || manifest.workspace?.worktree !== target.workspaceWorktree) {
    fail('CONFLICT', 'WORKSPACE_MANIFEST_IDENTITY_CONFLICT');
  }
  return {comment: candidates[0], manifest, text: commentBody(candidates[0])};
}
function read2786Workspace(manifest, spawn = childProcess.spawnSync, target = TARGET_2786) {
  const inspected = holderOwner.inspectWorkspace(manifest);
  if (!inspected.ok || !inspected.holderPath) {
    fail('BLOCKED', ...(inspected.reasonCodes || ['WORKSPACE_INSPECT_FAILED']));
  }
  const branch = runGitRead(target.workspaceWorktree, ['branch', '--show-current'], spawn);
  const head = runGitRead(target.workspaceWorktree, ['rev-parse', 'HEAD'], spawn);
  const dirty = runGitRead(target.workspaceWorktree,
    ['status', '--porcelain=v1', '--untracked-files=all'], spawn);
  if (branch !== target.workspaceBranch || head !== target.candidate) {
    fail('CONFLICT', 'WORKSPACE_IDENTITY_CONFLICT');
  }
  if (dirty) fail('BLOCKED', 'WORKSPACE_NOT_CLEAN');
  const holder = holderOwner.readHolder(inspected.holderPath);
  if (!holder.missing) {
    if (!holder.ok) fail('CONFLICT', 'HOLDER_STATE_CONFLICT');
    fail('BLOCKED', '2786_HOLDER_PRESENT_NOT_AUTHORIZED');
  }
  return {state: 'CLEAN', holderState: 'ABSENT', holderPath: inspected.holderPath};
}
function read2786LedgerState(runner = defaultRunner, target = TARGET_2786) {
  const ledger = readIssue(2352, runner);
  const parsed = taskLease.parseLedger(ledger.body || '');
  if (!parsed.ok || parsed.state.status !== 'ACTIVE') fail('UNKNOWN', 'LEDGER_STATE_INVALID');
  const packetLeases = parsed.state.activeLeases
    .filter((item) => item.packetRef === target.packetRef);
  if (packetLeases.length) fail('BLOCKED', 'TARGET_PACKET_LEASE_STILL_ACTIVE');
  return {
    body: ledger.body || '',
    generation: parsed.state.generation,
    targetPacketLeaseAbsent: true,
  };
}
function validationStageState2786(stageRows, implReceipt, pr, target = TARGET_2786) {
  const rows = stageRows.filter(({receipt}) =>
    receipt.stage === 'VALIDATION_MERGE' && receipt.packetNumber === target.packet);
  if (!rows.length) return {status: 'ABSENT', receipt: null};
  const exact = [];
  for (const row of rows) {
    const receipt = row.receipt;
    const hasPr = receipt.authorityRefs.some((item) =>
      item.kind === 'PR' && item.locator === 'pr:#' + target.pr
      && item.identity === target.candidate);
    const hasMerge = receipt.authorityRefs.some((item) =>
      item.kind === 'COMMIT' && item.identity === target.merge);
    if (receipt.status === 'PASS'
        && receipt.nextLegalAction === 'POSTMERGE_CONVERGENCE'
        && hasPr && hasMerge
        && same(receipt.scope.paths, implReceipt.scope.paths)
        && receipt.scope.diffRequired === true
        && receipt.scope.diffIdentity === implReceipt.scope.diffIdentity) {
      exact.push(row);
    } else {
      fail('CONFLICT', 'VALIDATION_STAGE_RECEIPT_CONFLICT');
    }
  }
  const byDigest = new Map(exact.map((row) => [row.receipt.receiptDigest, row]));
  if (byDigest.size !== 1) fail('CONFLICT', 'VALIDATION_STAGE_RECEIPT_AMBIGUOUS');
  if (pr.merge_commit_sha !== target.merge) fail('CONFLICT', 'PR_MERGE_IDENTITY_CONFLICT');
  return {status: 'PASS', receipt: [...byDigest.values()][0].receipt};
}
function create2786LiveContext(packetRef, deps = {}) {
  const target = TARGET_2786;
  if (packetRef !== target.packetRef) fail('BLOCKED', 'PACKET_NOT_2786_TARGET');
  const runner = deps.runner || defaultRunner;
  const spawn = deps.spawn || childProcess.spawnSync;
  const issue = readIssue(target.packet, runner);
  if (issue.state !== 'open') fail('BLOCKED', 'PACKET_NOT_OPEN');
  if (!issue.body.includes('Current stage: `VALIDATION_MERGE`')) {
    fail('BLOCKED', 'PACKET_VALIDATION_STAGE_NOT_COMPATIBLE');
  }
  const comments = readComments(target.packet, runner);
  const pr = readPr(target.pr, runner);
  if (pr.state !== 'closed' || !pr.merged_at
      || pr.head?.sha !== target.candidate
      || pr.merge_commit_sha !== target.merge) {
    fail('CONFLICT', 'MERGED_PR_IDENTITY_CONFLICT');
  }
  const stageRows = stageReceiptsFromComments(comments);
  const impl = select2786ImplementationReceipt(stageRows, pr, target);
  const manifestRow = select2786WorkspaceManifest(comments, target);
  return {
    target,
    packet: target.packet,
    packetRef: target.packetRef,
    packetBodyDigest: sha256(issue.body),
    runner,
    spawn,
    pr,
    implReceipt: impl.receipt,
    implCommentId: impl.comment.id,
    workspaceManifest: manifestRow.manifest,
    workspaceManifestText: manifestRow.text,
    coordinationProof: 'PROVEN',
  };
}
function inspectorEvidence(ctx, mutable) {
  const diff = 'sha256:' + ctx.implReceipt.scope.diffIdentity;
  const scopeDigest = pathScopeDigest(ctx.implReceipt.scope.paths);
  const completeCoordination = mutable.release.status === 'PROVEN'
    && mutable.ledger.targetLeaseAbsent
    && mutable.workspace.holderState === 'ABSENT'
    && mutable.completion.status === 'COMPLETE';
  const stage = mutable.validationStage.status === 'PASS'
    ? {
      state: 'PASS',
      packetRef: TARGET.packetRef,
      prNumber: TARGET.pr,
      candidateHead: TARGET.candidate,
      mergeCommit: TARGET.merge,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    }
    : {
      state: 'ABSENT',
      packetRef: null,
      prNumber: null,
      candidateHead: null,
      mergeCommit: null,
      diffIdentity: null,
      pathScopeDigest: null,
      nextLegalAction: 'UNKNOWN',
    };
  return {
    schemaVersion: 1,
    mode: 'VALIDATION_FINALIZATION_EVIDENCE',
    subject: 'issue:' + TARGET.packetRef,
    packetRef: TARGET.packetRef,
    packetState: 'EXACT',
    validationStageState: 'COMPATIBLE',
    expected: {
      prNumber: TARGET.pr,
      candidateHead: TARGET.candidate,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
    },
    mergeEvidence: {
      state: 'MERGED',
      prNumber: TARGET.pr,
      candidateHead: TARGET.candidate,
      mergeCommit: TARGET.merge,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
    },
    validationEvidence: {
      state: 'PASS',
      candidateHead: TARGET.candidate,
      diffIdentity: diff,
    },
    stageReceipt: stage,
    coordinationState: completeCoordination ? 'COMPLETE' : 'INCOMPLETE',
    workspaceState: 'CLEAN',
    requiredUnknownState: 'NONE',
    sourceRefs: [
      'issue:' + TARGET.packetRef,
      'pr:#' + TARGET.pr,
      'manifest:' + ctx.manifest.manifestId,
    ],
  };
}

function inspectorEvidence2786(ctx, mutable) {
  const target = ctx.target;
  const diff = 'sha256:' + ctx.implReceipt.scope.diffIdentity;
  const scopeDigest = pathScopeDigest(ctx.implReceipt.scope.paths);
  const completeCoordination = ctx.coordinationProof === 'PROVEN'
    && mutable.ledger.targetPacketLeaseAbsent
    && mutable.workspace.holderState === 'ABSENT';
  const stage = mutable.validationStage.status === 'PASS'
    ? {
      state: 'PASS',
      packetRef: target.packetRef,
      prNumber: target.pr,
      candidateHead: target.candidate,
      mergeCommit: target.merge,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    }
    : {
      state: 'ABSENT',
      packetRef: null,
      prNumber: null,
      candidateHead: null,
      mergeCommit: null,
      diffIdentity: null,
      pathScopeDigest: null,
      nextLegalAction: 'UNKNOWN',
    };
  return {
    schemaVersion: 1,
    mode: 'VALIDATION_FINALIZATION_EVIDENCE',
    subject: 'issue:' + target.packetRef,
    packetRef: target.packetRef,
    packetState: 'EXACT',
    validationStageState: 'COMPATIBLE',
    expected: {
      prNumber: target.pr,
      candidateHead: target.candidate,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
    },
    mergeEvidence: {
      state: 'MERGED',
      prNumber: target.pr,
      candidateHead: target.candidate,
      mergeCommit: target.merge,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
    },
    validationEvidence: {
      state: 'PASS',
      candidateHead: target.candidate,
      diffIdentity: diff,
    },
    stageReceipt: stage,
    coordinationState: completeCoordination ? 'COMPLETE' : 'UNKNOWN',
    workspaceState: mutable.workspace.state,
    requiredUnknownState: 'NONE',
    sourceRefs: [
      'issue:' + target.packetRef,
      'pr:#' + target.pr,
      'receipt:' + ctx.implReceipt.receiptDigest,
      'manifest:' + ctx.workspaceManifest.manifestId,
    ],
  };
}
function read2786MutableState(ctx) {
  const target = ctx.target;
  const issue = readIssue(target.packet, ctx.runner);
  if (sha256(issue.body) !== ctx.packetBodyDigest) fail('BLOCKED', 'PACKET_BODY_DRIFT');
  const comments = readComments(target.packet, ctx.runner);
  const stageRows = stageReceiptsFromComments(comments);
  const ledger = read2786LedgerState(ctx.runner, target);
  const workspace = read2786Workspace(ctx.workspaceManifest, ctx.spawn, target);
  const validationStage = validationStageState2786(
    stageRows, ctx.implReceipt, ctx.pr, target);
  const mutable = {
    comments,
    ledger,
    workspace,
    completion: {
      status: 'NOT_APPLICABLE',
      receiptIds: [],
      representativeReceiptId: null,
    },
    validationStage,
  };
  const evidence = inspectorEvidence2786(ctx, mutable);
  const decision = finalization.projectValidationFinalization(evidence);
  return {...mutable, evidence, decision};
}

function createLiveContext(packetRef, deps = {}) {
  if (packetRef !== TARGET.packetRef) fail('BLOCKED', 'PACKET_NOT_V1_TARGET');
  const runner = deps.runner || defaultRunner;
  const spawn = deps.spawn || childProcess.spawnSync;
  const issue = readIssue(TARGET.packet, runner);
  if (issue.state !== 'open') fail('BLOCKED', 'PACKET_NOT_OPEN');
  if (!issue.body.includes('Current stage: `VALIDATION_MERGE`')) {
    fail('BLOCKED', 'PACKET_VALIDATION_STAGE_NOT_COMPATIBLE');
  }
  const comments = readComments(TARGET.packet, runner);
  const pr = readPr(TARGET.pr, runner);
  if (pr.state !== 'closed' || !pr.merged_at
      || pr.head?.sha !== TARGET.candidate
      || pr.merge_commit_sha !== TARGET.merge) {
    fail('CONFLICT', 'MERGED_PR_IDENTITY_CONFLICT');
  }
  const stageRows = stageReceiptsFromComments(comments);
  const impl = selectImplementationReceipt(stageRows, pr);
  const manifestRow = selectTargetManifest(comments);
  const release = readReleaseEvidence(runner);
  return {
    packet: TARGET.packet,
    packetRef: TARGET.packetRef,
    packetBodyDigest: sha256(issue.body),
    runner,
    spawn,
    pr,
    implReceipt: impl.receipt,
    implCommentId: impl.comment.id,
    manifest: manifestRow.manifest,
    manifestText: manifestRow.text,
    release,
  };
}
function readMutableState(ctx) {
  const issue = readIssue(TARGET.packet, ctx.runner);
  if (sha256(issue.body) !== ctx.packetBodyDigest) fail('BLOCKED', 'PACKET_BODY_DRIFT');
  const comments = readComments(TARGET.packet, ctx.runner);
  const stageRows = stageReceiptsFromComments(comments);
  const ledger = readLedgerState(ctx.runner);
  const workspace = readWorkspace(ctx.manifest, ctx.spawn);
  const completion = completionState(comments, ctx.manifest);
  const validationStage = validationStageState(stageRows, ctx.implReceipt, ctx.pr);
  const mutable = {
    comments,
    ledger,
    workspace,
    completion,
    validationStage,
    release: ctx.release,
  };
  const evidence = inspectorEvidence(ctx, mutable);
  const decision = finalization.projectValidationFinalization(evidence);
  return {...mutable, evidence, decision};
}
function buildCompletionText(ctx) {
  const receipt = handoff.buildCompletionReceipt(ctx.manifest, {
    disposition: 'COMPLETE',
    outputRefs: [
      'commit:' + TARGET.candidate,
      'commit:' + TARGET.merge,
      'pr:#' + TARGET.pr,
    ],
    validationRefs: [
      'run:' + TARGET.ownerValidationRun,
      'run:' + TARGET.requiredRun,
      'run:' + TARGET.releaseRun,
      'pr:#' + TARGET.pr,
    ],
    observedRefs: [
      'commit:' + TARGET.candidate,
      'commit:' + TARGET.merge,
      'pr:#' + TARGET.pr,
    ],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: {
      ledgerRef: '#2352',
      leaseId: TARGET.leaseId,
      releasedGeneration: TARGET.releasedGeneration,
      evidenceRef: 'run:' + TARGET.releaseRun,
    },
    workspaceResult: 'clean',
    blockerRefs: [],
    requiredUnknownRefs: [],
  });
  return {text: handoff.renderCompletionReceipt(receipt), receipt};
}
function buildValidationStageText(ctx, completion) {
  if (completion.status !== 'COMPLETE' || !completion.representativeReceiptId) {
    fail('BLOCKED', 'D014_COMPLETION_REQUIRED_BEFORE_STAGE_RECEIPT');
  }
  const receipt = stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: TARGET.packet,
    stage: 'VALIDATION_MERGE',
    authorityRefs: [
      {kind: 'COMMIT', locator: 'candidate-head', identity: TARGET.candidate},
      {kind: 'COMMIT', locator: 'merge:#' + TARGET.pr, identity: TARGET.merge},
      {kind: 'PR', locator: 'pr:#' + TARGET.pr, identity: TARGET.candidate},
      {kind: 'WORKFLOW_RUN', locator: 'run:' + TARGET.ownerValidationRun,
        identity: TARGET.candidate},
      {kind: 'WORKFLOW_RUN', locator: 'run:' + TARGET.requiredRun,
        identity: TARGET.candidate},
      {kind: 'WORKFLOW_RUN', locator: 'run:' + TARGET.releaseRun,
        identity: TARGET.merge},
    ],
    requiredGates: [
      {name: 'candidate-bound-owner-validation', result: 'PASS',
        evidenceLocator: 'run:' + TARGET.ownerValidationRun},
      {name: 'candidate-bound-required', result: 'PASS',
        evidenceLocator: 'run:' + TARGET.requiredRun + '/job:' + TARGET.requiredJob},
      {name: 'expected-head-merge', result: 'PASS',
        evidenceLocator: 'commit:' + TARGET.merge},
      {name: 'historical-d013-release', result: 'PASS',
        evidenceLocator: 'run:' + TARGET.releaseRun},
      {name: 'current-lease-absence', result: 'PASS',
        evidenceLocator: 'issue:#2352'},
      {name: 'holder-absent', result: 'PASS',
        evidenceLocator: 'receipt:mcl-workspace-holder:absent'},
      {name: 'workspace-clean', result: 'PASS',
        evidenceLocator: 'receipt:mcl-workspace-clean:#2463'},
      {name: 'd014-complete', result: 'PASS',
        evidenceLocator: 'receipt:mcl-task-completion-receipt:'
          + completion.representativeReceiptId},
    ],
    scope: {
      paths: ctx.implReceipt.scope.paths,
      diffRequired: true,
      diffIdentity: ctx.implReceipt.scope.diffIdentity,
      diffEvidenceLocator: 'pr:#' + TARGET.pr,
    },
    proof: [
      {term: 'CONTRACT_PROVEN', evidenceLocator: 'run:' + TARGET.ownerValidationRun},
      {term: 'LIVE_PROVEN', evidenceLocator: 'pr:#' + TARGET.pr},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'POSTMERGE_CONVERGENCE',
  });
  if (receipt.status !== 'PASS') fail('UNKNOWN', 'STAGE_RECEIPT_BUILD_NOT_PASS');
  return {text: stageReceipt.renderStageReceipt(receipt), receipt};
}
function build2786ValidationStageText(ctx) {
  const target = ctx.target;
  const receipt = stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: target.packet,
    stage: 'VALIDATION_MERGE',
    authorityRefs: [
      {kind: 'COMMIT', locator: 'candidate-head', identity: target.candidate},
      {kind: 'COMMIT', locator: 'merge:#' + target.pr, identity: target.merge},
      {kind: 'PR', locator: 'pr:#' + target.pr, identity: target.candidate},
      ...ctx.implReceipt.authorityRefs
        .filter((row) => row.kind === 'WORKFLOW_RUN'),
    ],
    requiredGates: [
      {name: 'implementation-stage-receipt', result: 'PASS',
        evidenceLocator: 'receipt:' + ctx.implReceipt.receiptDigest},
      {name: 'implementation-coordination-converged', result: 'PASS',
        evidenceLocator: 'receipt:' + ctx.implReceipt.receiptDigest},
      {name: 'expected-head-merge', result: 'PASS',
        evidenceLocator: 'commit:' + target.merge},
      {name: 'current-packet-lease-absence', result: 'PASS',
        evidenceLocator: 'issue:#2352'},
      {name: 'holder-absent', result: 'PASS',
        evidenceLocator: 'receipt:mcl-workspace-holder:absent'},
      {name: 'workspace-clean', result: 'PASS',
        evidenceLocator: 'receipt:mcl-workspace-clean:#2786'},
    ],
    scope: {
      paths: ctx.implReceipt.scope.paths,
      diffRequired: true,
      diffIdentity: ctx.implReceipt.scope.diffIdentity,
      diffEvidenceLocator: 'pr:#' + target.pr,
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + target.candidate},
      {term: 'CONTRACT_PROVEN',
        evidenceLocator: 'receipt:' + ctx.implReceipt.receiptDigest},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'POSTMERGE_CONVERGENCE',
  });
  if (receipt.status !== 'PASS') fail('UNKNOWN', 'STAGE_RECEIPT_BUILD_NOT_PASS');
  return {text: stageReceipt.renderStageReceipt(receipt), receipt};
}
function cleanupHolderLive(ctx, mutable) {
  if (mutable.workspace.holderState === 'ABSENT') return {cleaned: 0};
  if (mutable.workspace.holderState !== 'PRESENT_EXACT') {
    fail('CONFLICT', 'HOLDER_NOT_EXACT');
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-finalization-'));
  const manifestPath = path.join(dir, 'manifest.md');
  const ledgerPath = path.join(dir, 'ledger.md');
  try {
    fs.writeFileSync(manifestPath, ctx.manifestText, {mode: 0o600});
    fs.writeFileSync(ledgerPath, mutable.ledger.body, {mode: 0o600});
    const result = holderOwner.cleanupStale({manifestPath, ledgerPath, packetPath: null});
    if (result.status !== 'STALE_CLEANED') {
      fail('BLOCKED', ...(result.reasonCodes || ['HOLDER_CLEANUP_FAILED']));
    }
    return {cleaned: 1};
  } finally {
    try { fs.rmSync(dir, {recursive: true, force: true}); } catch (_) {}
  }
}
function postExactComment(packet, body, runner = defaultRunner) {
  const before = readComments(packet, runner)
    .filter((comment) => commentBody(comment) === body);
  if (before.length > 1) fail('CONFLICT', 'EXACT_COMMENT_DUPLICATE');
  if (before.length === 1) return {written: 0, reused: 1, lostAckRecovered: false};

  const result = runner([
    'api', 'repos/' + REPO + '/issues/' + packet + '/comments',
    '--method', 'POST',
    '--header', 'Accept: application/vnd.github+json',
    '--input', '-',
  ], {input: JSON.stringify({body})});

  const after = readComments(packet, runner)
    .filter((comment) => commentBody(comment) === body);
  if (after.length > 1) fail('CONFLICT', 'EXACT_COMMENT_DUPLICATE');
  if (after.length === 1) {
    return {written: 1, reused: 0, lostAckRecovered: result.code !== 0};
  }
  if (result.code !== 0) fail('UNKNOWN', 'COMMENT_WRITE_ACK_UNKNOWN');
  fail('UNKNOWN', 'COMMENT_WRITE_READBACK_MISSING');
}
function decisionSummary(decision) {
  return {
    finalizationDisposition: decision.finalizationDisposition,
    result: decision.result,
    attentionDisposition: decision.attentionDisposition,
    requiredEffectClasses: decision.requiredEffectClasses,
    nextLegalAction: decision.nextLegalAction,
    evidenceDigest: decision.evidenceDigest,
  };
}
function effectPairExact(decision) {
  return decision.finalizationDisposition === 'FINALIZATION_REQUIRED'
    && decision.result === 'PASS'
    && decision.attentionDisposition === 'ACTION_REQUIRED'
    && same([...decision.requiredEffectClasses].sort(), [...EXPECTED_EFFECTS].sort())
    && decision.nextLegalAction === 'FIXED_FINALIZATION_EFFECT_REVIEW';
}
function effectPair2786Exact(decision) {
  return decision.finalizationDisposition === 'FINALIZATION_REQUIRED'
    && decision.result === 'PASS'
    && decision.attentionDisposition === 'ACTION_REQUIRED'
    && same([...decision.requiredEffectClasses].sort(), [...EXPECTED_EFFECTS_2786].sort())
    && decision.nextLegalAction === 'FIXED_FINALIZATION_EFFECT_REVIEW';
}

function inspect2463Packet(packetRef, deps = {}) {
  const createContext = deps.createContext || createLiveContext;
  const readState = deps.readState || readMutableState;
  const ctx = createContext(packetRef, deps);
  const state = readState(ctx, deps);
  return output(state.decision.result, {
    operation: 'inspect',
    ...decisionSummary(state.decision),
    effects: {
      holderCleaned: 0,
      d014Published: 0,
      stageReceiptPublished: 0,
    },
  });
}
function apply2463Packet(packetRef, deps = {}) {
  const createContext = deps.createContext || createLiveContext;
  const readState = deps.readState || readMutableState;
  const cleanupHolder = deps.cleanupHolder || cleanupHolderLive;
  const publishExact = deps.publishExact || ((packet, body, ctx) =>
    postExactComment(packet, body, ctx.runner));
  const makeCompletion = deps.buildCompletionText || buildCompletionText;
  const makeStage = deps.buildValidationStageText || buildValidationStageText;

  const ctx = createContext(packetRef, deps);
  let state = readState(ctx, deps);
  const pre = state.decision;
  const effects = {
    holderCleaned: 0,
    d014Published: 0,
    stageReceiptPublished: 0,
  };

  if (pre.finalizationDisposition === 'ALREADY_FINALIZED'
      && pre.result === 'PASS'
      && pre.nextLegalAction === 'POSTMERGE_CONVERGENCE'
      && pre.requiredEffectClasses.length === 0) {
    return output('PASS', {
      operation: 'apply',
      pre: decisionSummary(pre),
      post: decisionSummary(pre),
      finalizationDisposition: 'ALREADY_FINALIZED',
      result: 'PASS',
      effects,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    });
  }

  if (!effectPairExact(pre)) {
    fail(pre.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'PRE_EFFECT_FINALIZATION_DISPOSITION_NOT_V1_PAIR');
  }

  if (state.workspace.holderState === 'PRESENT_EXACT') {
    const cleaned = cleanupHolder(ctx, state, deps);
    effects.holderCleaned += cleaned.cleaned || 0;
    state = readState(ctx, deps);
  }
  if (state.workspace.holderState !== 'ABSENT') {
    fail('BLOCKED', 'HOLDER_NOT_ABSENT_AFTER_CLEANUP');
  }
  if (state.workspace.state !== 'CLEAN') fail('BLOCKED', 'WORKSPACE_NOT_CLEAN');

  if (state.completion.status === 'ABSENT') {
    const built = makeCompletion(ctx, state, deps);
    const posted = publishExact(TARGET.packet, built.text, ctx, deps);
    effects.d014Published += posted.written || 0;
    state = readState(ctx, deps);
  }
  if (state.completion.status !== 'COMPLETE') {
    fail('BLOCKED', 'D014_COMPLETION_NOT_PROVEN');
  }

  if (state.validationStage.status === 'ABSENT') {
    const built = makeStage(ctx, state.completion, deps);
    const posted = publishExact(TARGET.packet, built.text, ctx, deps);
    effects.stageReceiptPublished += posted.written || 0;
    state = readState(ctx, deps);
  }
  if (state.validationStage.status !== 'PASS') {
    fail('BLOCKED', 'VALIDATION_STAGE_RECEIPT_NOT_PROVEN');
  }

  const post = state.decision;
  if (post.finalizationDisposition !== 'ALREADY_FINALIZED'
      || post.result !== 'PASS'
      || post.attentionDisposition !== 'COMPLETE'
      || post.requiredEffectClasses.length !== 0
      || post.nextLegalAction !== 'POSTMERGE_CONVERGENCE') {
    fail(post.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'POST_EFFECT_REINSPECT_NOT_ALREADY_FINALIZED');
  }

  return output('PASS', {
    operation: 'apply',
    pre: decisionSummary(pre),
    post: decisionSummary(post),
    finalizationDisposition: post.finalizationDisposition,
    result: post.result,
    effects,
    nextLegalAction: post.nextLegalAction,
  });
}

function inspect2786Packet(packetRef, deps = {}) {
  const createContext = deps.createContext || create2786LiveContext;
  const readState = deps.readState || read2786MutableState;
  const ctx = createContext(packetRef, deps);
  const state = readState(ctx, deps);
  return output(state.decision.result, {
    operation: 'inspect',
    ...decisionSummary(state.decision),
    effects: {
      holderCleaned: 0,
      d014Published: 0,
      stageReceiptPublished: 0,
    },
  }, [], TARGET_2786.packetRef);
}
function apply2786Packet(packetRef, deps = {}) {
  const createContext = deps.createContext || create2786LiveContext;
  const readState = deps.readState || read2786MutableState;
  const publishExact = deps.publishExact || ((packet, body, ctx) =>
    postExactComment(packet, body, ctx.runner));
  const makeStage = deps.buildValidationStageText || build2786ValidationStageText;

  const ctx = createContext(packetRef, deps);
  let state = readState(ctx, deps);
  const pre = state.decision;
  const effects = {
    holderCleaned: 0,
    d014Published: 0,
    stageReceiptPublished: 0,
  };

  if (pre.finalizationDisposition === 'ALREADY_FINALIZED'
      && pre.result === 'PASS'
      && pre.nextLegalAction === 'POSTMERGE_CONVERGENCE'
      && pre.requiredEffectClasses.length === 0) {
    return output('PASS', {
      operation: 'apply',
      pre: decisionSummary(pre),
      post: decisionSummary(pre),
      finalizationDisposition: 'ALREADY_FINALIZED',
      result: 'PASS',
      effects,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    }, [], TARGET_2786.packetRef);
  }

  if (!effectPair2786Exact(pre)) {
    fail(pre.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'PRE_EFFECT_FINALIZATION_DISPOSITION_NOT_2786_PAIR');
  }
  if (state.workspace.holderState !== 'ABSENT') {
    fail('BLOCKED', '2786_HOLDER_PRESENT_NOT_AUTHORIZED');
  }
  if (state.workspace.state !== 'CLEAN') fail('BLOCKED', 'WORKSPACE_NOT_CLEAN');
  if (state.completion.status !== 'NOT_APPLICABLE') {
    fail('CONFLICT', '2786_D014_COMPLETION_MUST_BE_NOT_APPLICABLE');
  }

  if (state.validationStage.status === 'ABSENT') {
    const built = makeStage(ctx, state, deps);
    const posted = publishExact(TARGET_2786.packet, built.text, ctx, deps);
    effects.stageReceiptPublished += posted.written || 0;
    state = readState(ctx, deps);
  }
  if (state.validationStage.status !== 'PASS') {
    fail('BLOCKED', 'VALIDATION_STAGE_RECEIPT_NOT_PROVEN');
  }

  const post = state.decision;
  if (post.finalizationDisposition !== 'ALREADY_FINALIZED'
      || post.result !== 'PASS'
      || post.attentionDisposition !== 'COMPLETE'
      || post.requiredEffectClasses.length !== 0
      || post.nextLegalAction !== 'POSTMERGE_CONVERGENCE') {
    fail(post.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'POST_EFFECT_REINSPECT_NOT_ALREADY_FINALIZED');
  }

  return output('PASS', {
    operation: 'apply',
    pre: decisionSummary(pre),
    post: decisionSummary(post),
    finalizationDisposition: post.finalizationDisposition,
    result: post.result,
    effects,
    nextLegalAction: post.nextLegalAction,
  }, [], TARGET_2786.packetRef);
}
function inspectPacket(packetRef, deps = {}) {
  const profile = profileFor(packetRef);
  return profile.mode === 'IMPLEMENTATION_COORDINATION'
    ? inspect2786Packet(packetRef, deps)
    : inspect2463Packet(packetRef, deps);
}
function applyPacket(packetRef, deps = {}) {
  const profile = profileFor(packetRef);
  return profile.mode === 'IMPLEMENTATION_COORDINATION'
    ? apply2786Packet(packetRef, deps)
    : apply2463Packet(packetRef, deps);
}

function parseArgs(argv = process.argv.slice(2)) {
  const command = argv[0];
  if (!['inspect', 'apply'].includes(command)) throw new Error('COMMAND_UNSUPPORTED');
  const values = {};
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error('ARGUMENT_INVALID');
    const name = key.slice(2);
    if (!['packet', 'format'].includes(name)) throw new Error('ARGUMENT_UNSUPPORTED:' + name);
    if (values[name] !== undefined) throw new Error('ARGUMENT_DUPLICATE:' + name);
    values[name] = value;
  }
  if (!PROFILES[values.packet]) throw new Error('PACKET_NOT_REVIEWED_TARGET');
  if (!['agent-view', 'json'].includes(values.format)) throw new Error('FORMAT_UNSUPPORTED');
  return {command, packetRef: values.packet, format: values.format};
}
function render(result, format) {
  if (format === 'json') return result;
  return {
    schemaVersion: 1,
    mode: 'MCL_VALIDATION_FINALIZATION_APPLY_VIEW',
    validity: result.validity,
    packetRef: result.packetRef,
    operation: result.operation || null,
    status: result.status,
    finalizationDisposition: result.finalizationDisposition
      || result.post?.finalizationDisposition
      || result.pre?.finalizationDisposition
      || null,
    result: result.result || result.post?.result || result.pre?.result || result.status,
    requiredEffectClasses: result.requiredEffectClasses
      || result.post?.requiredEffectClasses
      || result.pre?.requiredEffectClasses
      || [],
    effects: result.effects || {
      holderCleaned: 0,
      d014Published: 0,
      stageReceiptPublished: 0,
    },
    nextLegalAction: result.nextLegalAction
      || result.post?.nextLegalAction
      || result.pre?.nextLegalAction
      || 'TARGETED_DRILLDOWN_REQUIRED',
    reasonCodes: result.reasonCodes || [],
    authority: {...FALSE_AUTHORITY},
  };
}
function errorResult(error, packetRef = TARGET.packetRef) {
  if (error instanceof ApplyError) {
    return output(error.kind, {
      operation: null,
      finalizationDisposition: null,
      result: error.kind,
      requiredEffectClasses: [],
      effects: {
        holderCleaned: 0,
        d014Published: 0,
        stageReceiptPublished: 0,
      },
      nextLegalAction: error.kind === 'CONFLICT'
        ? 'SEMANTIC_REVIEW_REQUIRED'
        : 'TARGETED_DRILLDOWN_REQUIRED',
    }, error.reasonCodes, packetRef);
  }
  return output('UNKNOWN', {
    operation: null,
    finalizationDisposition: null,
    result: 'UNKNOWN',
    requiredEffectClasses: [],
    effects: {
      holderCleaned: 0,
      d014Published: 0,
      stageReceiptPublished: 0,
    },
    nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
  }, ['RUNTIME_ERROR'], packetRef);
}
function runCli(argv = process.argv.slice(2), deps = {}) {
  let args;
  let result;
  try {
    args = parseArgs(argv);
    result = args.command === 'inspect'
      ? inspectPacket(args.packetRef, deps)
      : applyPacket(args.packetRef, deps);
  } catch (error) {
    result = errorResult(error, args?.packetRef || TARGET.packetRef);
    args = args || {format: 'json'};
  }
  const rendered = render(result, args.format || 'json');
  const code = result.status === 'PASS' ? 0
    : result.status === 'CONFLICT' ? 3 : 2;
  return {code, text: JSON.stringify(rendered, null, 2) + '\n', result};
}

if (require.main === module) {
  const out = runCli();
  process.stdout.write(out.text);
  process.exitCode = out.code;
}

module.exports = {
  ApplyError,
  EXPECTED_EFFECTS,
  EXPECTED_EFFECTS_2786,
  FALSE_AUTHORITY,
  PROFILES,
  TARGET,
  TARGET_2786,
  apply2463Packet,
  apply2786Packet,
  applyPacket,
  build2786ValidationStageText,
  buildCompletionText,
  buildValidationStageText,
  completionState,
  coordinationGatesProven,
  create2786LiveContext,
  createLiveContext,
  decisionSummary,
  effectPair2786Exact,
  effectPairExact,
  errorResult,
  inspectorEvidence,
  inspectorEvidence2786,
  inspect2463Packet,
  inspect2786Packet,
  inspectPacket,
  parseArgs,
  pathScopeDigest,
  postExactComment,
  read2786LedgerState,
  read2786MutableState,
  read2786Workspace,
  readMutableState,
  readReleaseEvidence,
  render,
  runCli,
  select2786ImplementationReceipt,
  select2786WorkspaceManifest,
  selectImplementationReceipt,
  selectTargetManifest,
  stageReceiptsFromComments,
  validationStageState,
  validationStageState2786,
};
