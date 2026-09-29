#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const {performance} = require('node:perf_hooks');

const ROOT = path.resolve(__dirname, '../../../..');
const REPO = 'hanmiyoo10-alt/-';
const REPO_OWNER = 'hanmiyoo10-alt';
const MAX_PAGES = 5;
const PAGE_SIZE = 100;
const LEASE_WORKFLOW = 'mcl-task-lease.yml';
const MAX_LEASE_RUNS = 100;
const LEASE_RUN_LIST_TIMEOUT_MS = 10000;
const LEASE_RUN_LOG_TIMEOUT_MS = 5000;
const LEASE_RUN_SCAN_TIMEOUT_MS = 20000;
const PACKET_RE = /^#[1-9][0-9]*$/;
const SHA40_RE = /^[0-9a-f]{40}$/;

const taskHandoff = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const taskLease = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const workspaceHolder = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
const stageEntry = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs'));
const implementation = require('./mcl-repository-implementation.cjs');
const packetProjection = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs'));const executionReceipt = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs'));
const agentDecisionView = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/agent-decision-view.cjs'));

class RecoveryError extends Error {
  constructor(kind, reasonCodes) {
    super(reasonCodes[0] || kind);
    this.kind = kind;
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}
function fail(kind, ...codes) {
  throw new RecoveryError(kind, codes.flat());
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function same(left, right) {
  return JSON.stringify(taskHandoff.stable(left))
    === JSON.stringify(taskHandoff.stable(right));
}
function packetNumber(packetRef) {
  if (!PACKET_RE.test(packetRef || '')) fail('UNKNOWN', 'PACKET_REF_INVALID');
  return Number(packetRef.slice(1));
}
function commentUrl(packet, id) {
  return `https://github.com/${REPO}/issues/${packet}#issuecomment-${id}`;
}function runGit(worktree, args, spawn = childProcess.spawnSync) {
  const result = spawn('git', ['-C', worktree, ...args], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) fail('UNKNOWN', 'GIT_READ_FAILED');
  return String(result.stdout || '').trim();
}
function pathScopes(scopes) {
  return [...scopes].filter((scope) => scope.startsWith('path:'))
    .map((scope) => scope.slice(5)).sort();
}
function markerBody(row, marker) {
  return typeof row?.body === 'string' && row.body.includes(marker);
}
function parseManifestRows(comments) {
  return comments.filter((row) => markerBody(row, taskHandoff.MANIFEST_START)).map((row) => {
    const parsed = taskHandoff.parseManifest(row.body);
    if (parsed.status !== 'VALID') {
      fail(parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
        ...(parsed.reasonCodes || ['MANIFEST_INVALID']));
    }
    return {
      id: row.id,
      body: row.body,
      createdAt: typeof row.created_at === 'string' ? row.created_at : null,
      value: parsed.value,
    };
  });
}
function parseReceiptRows(comments) {
  return comments.filter((row) => markerBody(row, taskHandoff.RECEIPT_START)).map((row) => {
    const parsed = taskHandoff.parseCompletionReceipt(row.body);
    if (parsed.status !== 'VALID') {
      fail(parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
        ...(parsed.reasonCodes || ['RECEIPT_INVALID']));
    }
    return {id: row.id, body: row.body, value: parsed.value};
  });
}function parseHandoffRows(comments) {
  return comments.filter((row) => markerBody(row, '<!-- mcl-execution-handoff:v1 -->'))
    .map((row) => {
      let value;
      try { value = implementation.parseHandoffEnvelope(row.body); }
      catch (error) {
        if (error instanceof implementation.ImplementationError) {
          fail(error.kind, ...error.reasonCodes);
        }
        fail('UNKNOWN', 'HANDOFF_INVALID');
      }
      return {id: row.id, body: row.body, value};
    });
}
function selectOne(rows, predicate, missing, multiple) {
  const matches = rows.filter(predicate);
  if (matches.length === 0) fail('UNKNOWN', missing);
  if (matches.length !== 1) fail('CONFLICT', multiple);
  return matches[0];
}
function selectManifestPair({comments, packet, packetRef, bodyDigest}) {
  const manifests = parseManifestRows(comments);
  const child = selectOne(manifests, (row) =>
    row.value.packetRef === packetRef
      && row.value.packetBodySha256 === bodyDigest
      && row.value.phaseId === `${packet}-implementation-pr-effect`,
  'CHILD_MANIFEST_MISSING', 'CHILD_MANIFEST_AMBIGUOUS');
  const parentCandidates = manifests.filter((row) =>
    row.value.packetRef === packetRef
      && row.value.packetBodySha256 === bodyDigest
      && row.value.phaseId === `${packet}-implementation-pr-stage-entry`
      && child.value.inputRefs.includes(commentUrl(packet, row.id)));
  if (parentCandidates.length === 0) fail('UNKNOWN', 'LINKED_PARENT_MANIFEST_MISSING');
  if (parentCandidates.length !== 1) fail('CONFLICT', 'LINKED_PARENT_MANIFEST_AMBIGUOUS');
  return {parent: parentCandidates[0], child};
}function selectHandoffPair({comments, packet, packetRef, parent, child}) {
  const handoffs = parseHandoffRows(comments);
  const parentRow = selectOne(handoffs, (row) =>
    row.value.packet_ref === packetRef
      && row.value.manifest_id === parent.value.manifestId
      && child.value.inputRefs.includes(commentUrl(packet, row.id)),
  'LINKED_PARENT_HANDOFF_MISSING', 'LINKED_PARENT_HANDOFF_AMBIGUOUS');
  const childRow = selectOne(handoffs, (row) =>
    row.value.packet_ref === packetRef
      && row.value.manifest_id === child.value.manifestId,
  'CHILD_HANDOFF_MISSING', 'CHILD_HANDOFF_AMBIGUOUS');
  return {parent: parentRow, child: childRow};
}
function validateManifestPair(ctx) {
  const {parent, child, packetRef, bodyDigest, requestedScopes, packet} = ctx;
  for (const manifest of [parent.value, child.value]) {
    if (manifest.packetRef !== packetRef || manifest.packetBodySha256 !== bodyDigest
        || manifest.phaseClass !== 'REPOSITORY_MUTATION'
        || manifest.route !== 'S' || manifest.executor !== 'S'
        || manifest.leaseRequirement !== 'REQUIRED'
        || !same(manifest.scopes, requestedScopes)
        || manifest.workspace?.kind !== 'repository'
        || manifest.workspace?.branch !== `server/mcl-packet-${packet}`
        || manifest.workspace?.worktree !== `/root/nyang-worktrees/mcl-packet-${packet}`) {
      fail('CONFLICT', 'MANIFEST_PAIR_IDENTITY_CONFLICT');
    }
  }  if (!same(parent.value.workspace, child.value.workspace)
      || !same(parent.value.leaseEvidence, child.value.leaseEvidence)
      || parent.value.observedBaseSha !== child.value.observedBaseSha) {
    fail('CONFLICT', 'MANIFEST_PAIR_BINDING_CONFLICT');
  }
  if (child.value.phaseId !== `${packet}-implementation-pr-effect`
      || parent.value.phaseId !== `${packet}-implementation-pr-stage-entry`) {
    fail('CONFLICT', 'MANIFEST_PHASE_CONFLICT');
  }
  if (ctx.handoffs.parent.value.status !== 'HANDOFF_READY'
      || ctx.handoffs.child.value.status !== 'HANDOFF_READY'
      || ctx.handoffs.parent.value.lease_id !== parent.value.leaseEvidence.leaseId
      || ctx.handoffs.child.value.lease_id !== child.value.leaseEvidence.leaseId) {
    fail('CONFLICT', 'HANDOFF_BINDING_CONFLICT');
  }
}
function historicalCommand(args, runner, timeoutMs) {
  if (runner !== stageEntry.runDefault) return runner(args, {timeout: timeoutMs});
  const result = childProcess.spawnSync(args[0], args.slice(1), {
    encoding: 'utf8', shell: false, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}
function historicalReleaseEvidence(
  leaseId, acquiredGeneration, runner = stageEntry.runDefault, now = () => performance.now(),
  createdAfter = null, effectBase = null) {
  const deadline = now() + LEASE_RUN_SCAN_TIMEOUT_MS;
  const remaining = () => Math.max(0, Math.floor(deadline - now()));
  const listBudget = Math.min(LEASE_RUN_LIST_TIMEOUT_MS, remaining());
  if (listBudget <= 0) fail('UNKNOWN', 'LEASE_RUN_SCAN_TIMEOUT');
  if (createdAfter !== null
      && (typeof createdAfter !== 'string'
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(createdAfter))) {
    fail('UNKNOWN', 'LEASE_RUN_WINDOW_INVALID');
  }
  if (effectBase !== null && !SHA40_RE.test(effectBase)) {
    fail('UNKNOWN', 'LEASE_RUN_BASE_INVALID');
  }
  const listArgs = ['gh', 'run', 'list', '--repo', REPO, '--workflow', LEASE_WORKFLOW,
    '--event', 'workflow_dispatch'];
  if (createdAfter !== null) listArgs.push('--created', '>=' + createdAfter);
  if (effectBase !== null) listArgs.push('--commit', effectBase);
  listArgs.push('--limit', String(MAX_LEASE_RUNS), '--json', 'databaseId,status,conclusion');
  const listed = historicalCommand(listArgs, runner, listBudget);
  if (listed.code !== 0) fail('UNKNOWN', 'LEASE_RUN_LIST_FAILED');
  let runs;
  try { runs = JSON.parse(listed.stdout || '[]'); }
  catch { fail('UNKNOWN', 'LEASE_RUN_LIST_INVALID'); }
  const matches = [];
  for (const run of runs) {
    if (!Number.isSafeInteger(run.databaseId)
        || run.status !== 'completed' || run.conclusion !== 'success') continue;
    const logBudget = Math.min(LEASE_RUN_LOG_TIMEOUT_MS, remaining());
    if (logBudget <= 0) fail('UNKNOWN', 'LEASE_RUN_SCAN_TIMEOUT');
    const logs = historicalCommand(
      ['gh', 'run', 'view', String(run.databaseId), '--repo', REPO, '--log'],
      runner, logBudget);
    if (logs.code !== 0) {
      if (remaining() <= 0) fail('UNKNOWN', 'LEASE_RUN_SCAN_TIMEOUT');
      continue;
    }
    for (const line of String(logs.stdout || '').split(/\r?\n/)) {
      const start = line.indexOf('{');
      const end = line.lastIndexOf('}');
      if (start < 0 || end <= start) continue;
      let value;
      try { value = JSON.parse(line.slice(start, end + 1)); } catch { continue; }
      if (value.leaseId !== leaseId || value.status !== 'RELEASE_UPDATED') continue;
      if (!Number.isSafeInteger(value.generation)) {
        fail('UNKNOWN', 'LEASE_RUN_GENERATION_INVALID');
      }
      if (value.generation <= acquiredGeneration) continue;
      matches.push({runId: run.databaseId, generation: value.generation});
    }
  }
  const byRun = new Map(matches.map((item) => [item.runId, item]));
  if (byRun.size === 0) fail('BLOCKED', 'D013_RELEASE_NOT_PROVEN');
  if (byRun.size > 1) fail('CONFLICT', 'D013_RELEASE_PROOF_AMBIGUOUS');
  return [...byRun.values()][0];
}
function validateReleasedLease(ctx, runner = stageEntry.runDefault) {
  const parsed = taskLease.parseLedger(ctx.ledger.body || '');
  if (!parsed.ok) fail('UNKNOWN', 'LEDGER_INVALID', ...(parsed.reasonCodes || []));
  const leaseId = ctx.child.value.leaseEvidence.leaseId;
  const acquiredGeneration = ctx.child.value.leaseEvidence.acquiredGeneration;
  if (parsed.state.activeLeases.some((row) => row.leaseId === leaseId)) {
    fail('BLOCKED', 'D013_LEASE_STILL_ACTIVE');
  }
  let releasedGeneration;
  let evidenceRef;
  if (parsed.state.lastRelease?.leaseId === leaseId
      && parsed.state.lastRelease.releasedAtGeneration > acquiredGeneration) {
    releasedGeneration = parsed.state.lastRelease.releasedAtGeneration;
    evidenceRef = 'issue:#2352';
  } else {
    if (!ctx.pr?.createdAt) fail('UNKNOWN', 'LEASE_RUN_WINDOW_MISSING');
    const historical = historicalReleaseEvidence(
      leaseId, acquiredGeneration, runner, () => performance.now(),
      ctx.pr.createdAt, ctx.child.value.observedBaseSha);
    releasedGeneration = historical.generation;
    evidenceRef = 'run:' + historical.runId;
  }
  return {
    state: parsed.state,
    evidence: {
      ledgerRef: '#2352',
      leaseId,
      releasedGeneration,
      evidenceRef,
    },
  };
}function validateWorkspace(ctx, spawn = childProcess.spawnSync) {
  const manifest = ctx.child.value;
  const inspected = workspaceHolder.inspectWorkspace(manifest);
  if (!inspected.ok) fail('BLOCKED', ...(inspected.reasonCodes || []));
  const holder = workspaceHolder.readHolder(inspected.holderPath);
  if (!holder.missing) fail('BLOCKED', 'HOLDER_NOT_ABSENT');
  const wt = manifest.workspace.worktree;
  const branch = runGit(wt, ['branch', '--show-current'], spawn);
  const head = runGit(wt, ['rev-parse', 'HEAD'], spawn);
  const remote = runGit(wt, ['ls-remote', '--heads', 'origin', manifest.workspace.branch], spawn)
    .split(/\s+/)[0] || '';
  const dirty = runGit(wt, ['status', '--porcelain=v1'], spawn);
  if (branch !== manifest.workspace.branch) fail('CONFLICT', 'WORKTREE_BRANCH_CONFLICT');
  if (!SHA40_RE.test(head) || remote !== head) fail('CONFLICT', 'WORKTREE_REMOTE_HEAD_CONFLICT');
  if (dirty) fail('BLOCKED', 'WORKTREE_NOT_CLEAN');
  return {branch, head, remote};
}
function readPrState(ctx, runner = stageEntry.runDefault) {
  const branch = ctx.child.value.workspace.branch;
  const headQuery = encodeURIComponent(`${REPO_OWNER}:${branch}`);
  const rows = stageEntry.ghJson(
    `repos/${REPO}/pulls?state=open&head=${headQuery}&base=main&per_page=100`, runner);
  if (!Array.isArray(rows)) fail('UNKNOWN', 'PR_LIST_INVALID');
  if (rows.length === 0) fail('UNKNOWN', 'OPEN_PR_MISSING');
  if (rows.length !== 1) fail('CONFLICT', 'OPEN_PR_AMBIGUOUS');
  const pr = stageEntry.ghJson(`repos/${REPO}/pulls/${rows[0].number}`, runner);
  if (!pr || pr.state !== 'open' || pr.draft === true
      || pr.base?.ref !== 'main' || pr.head?.ref !== branch
      || pr.head?.sha !== ctx.workspace.head) {
    fail('CONFLICT', 'OPEN_PR_IDENTITY_CONFLICT');
  }  const files = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = stageEntry.ghJson(
      `repos/${REPO}/pulls/${pr.number}/files?per_page=${PAGE_SIZE}&page=${page}`, runner);
    if (!Array.isArray(batch)) fail('UNKNOWN', 'PR_FILES_INVALID');
    files.push(...batch.map((row) => row.filename));
    if (batch.length < PAGE_SIZE) break;
    if (page === MAX_PAGES) fail('UNKNOWN', 'PR_FILES_PAGINATION_BOUND');
  }
  const changed = [...new Set(files)].sort();
  if (!same(changed, pathScopes(ctx.requestedScopes))) {
    fail('CONFLICT', 'PR_CHANGED_PATHS_CONFLICT');
  }
  if (typeof pr.created_at !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(pr.created_at)) {
    fail('UNKNOWN', 'PR_CREATED_AT_INVALID');
  }
  return {number: pr.number, head: pr.head.sha, changed, createdAt: pr.created_at};
}
function uniqueInputRef(child, prefix, code) {
  const rows = child.inputRefs.filter((ref) => ref.startsWith(prefix));
  if (rows.length !== 1) fail('CONFLICT', code);
  return rows[0];
}
function expectedChildReceipt(ctx) {
  const prRef = `pr:#${ctx.pr.number}`;
  const commitRef = `commit:${ctx.pr.head}`;
  const contractRef = uniqueInputRef(ctx.child.value,
    'receipt:mcl-repository-validation-contract:', 'VALIDATION_CONTRACT_REF_CONFLICT');
  const adapterRef = uniqueInputRef(ctx.child.value,
    'receipt:mcl-implementation-validation-adapters:', 'VALIDATION_ADAPTER_REF_CONFLICT');
  return taskHandoff.buildCompletionReceipt(ctx.child.value, {
    disposition: 'COMPLETE',
    outputRefs: [commitRef, prRef],
    validationRefs: [
      prRef,
      `receipt:mcl-repository-patch-owner:${ctx.child.value.manifestId}`,
      contractRef,
      adapterRef,
    ],    observedRefs: [`commit:${ctx.child.value.observedBaseSha}`, commitRef, prRef],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: ctx.release.evidence,
    workspaceResult: 'clean',
    blockerRefs: [],
    requiredUnknownRefs: [],
  });
}
function expectedParentReceipt(ctx, childCommentId) {
  const prRef = `pr:#${ctx.pr.number}`;
  const commitRef = `commit:${ctx.pr.head}`;
  return taskHandoff.buildCompletionReceipt(ctx.parent.value, {
    disposition: 'COMPLETE',
    outputRefs: [commitRef, prRef],
    validationRefs: [commentUrl(ctx.packet, childCommentId), prRef],
    observedRefs: [`commit:${ctx.parent.value.observedBaseSha}`, commitRef, prRef],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: ctx.release.evidence,
    workspaceResult: 'clean',
    blockerRefs: [],
    requiredUnknownRefs: [],
  });
}
function classifyReceipt(comments, manifest, expected) {
  const rows = parseReceiptRows(comments)
    .filter((row) => row.value.manifestId === manifest.manifestId);
  if (rows.length === 0) return {state: 'MISSING', row: null};
  const unique = new Map();
  for (const row of rows) unique.set(row.value.receiptId, row);
  if (unique.size !== 1) fail('CONFLICT', 'COMPLETION_RECEIPT_VARIANT_CONFLICT');
  const row = [...unique.values()][0];
  if (!same(row.value, expected)) fail('CONFLICT', 'COMPLETION_RECEIPT_SEMANTIC_CONFLICT');
  return {state: 'EXACT', row};
}function buildContext(packetRef, deps = {}) {
  const runner = deps.runner || stageEntry.runDefault;
  const spawn = deps.spawnSyncImpl || childProcess.spawnSync;
  const packet = packetNumber(packetRef);
  const mainSha = (deps.mainHealth || implementation.mainHealth)(runner);
  const issue = deps.issue || stageEntry.ghJson(`repos/${REPO}/issues/${packet}`, runner);
  const ledger = deps.ledger || stageEntry.ghJson(`repos/${REPO}/issues/2352`, runner);
  if (!issue || issue.pull_request || issue.state !== 'open' || typeof issue.body !== 'string') {
    fail('BLOCKED', 'PACKET_NOT_OPEN');
  }
  const projection = packetProjection.classifyPacketProjection(issue.body);
  if (projection.disposition !== 'PASS' || projection.lifecycle !== 'IN_PROGRESS'
      || projection.interactionStage !== 'IMPLEMENTATION_PR') {
    fail(projection.disposition === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'PACKET_STAGE_NOT_IMPLEMENTATION_PR');
  }
  const bodyDigest = sha256(issue.body);
  const requestedScopes = stageEntry.extractPacketScopes(issue.body);
  const comments = deps.comments || implementation.readComments(packet, runner);
  const pair = selectManifestPair({comments, packet, packetRef, bodyDigest});
  const handoffs = selectHandoffPair({
    comments, packet, packetRef, parent: pair.parent, child: pair.child,
  });
  const ctx = {
    packet, packetRef, mainSha, issue, ledger, comments, bodyDigest, requestedScopes,
    parent: pair.parent, child: pair.child, handoffs,
  };
  validateManifestPair(ctx);
  if (mainSha !== ctx.child.value.observedBaseSha) fail('CONFLICT', 'MAIN_MOVED_FROM_EFFECT_BASE');
  ctx.workspace = validateWorkspace(ctx, spawn);
  ctx.pr = (deps.readPrState || readPrState)(ctx, runner);
  ctx.release = validateReleasedLease(ctx);
  return ctx;
}function resultView(ctx, written, childRow, parentRow) {
  const receipt = executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: `mcl-repository-implementation-finalize-recovery:${ctx.child.value.manifestId}`,
    primitiveId: 'mcl:repository-implementation-finalize-recovery:v1',
    sourceIdentity: {
      kind: 'WORK_PACKET', locator: ctx.packetRef, identity: `sha256:${ctx.bodyDigest}`,
    },
    executionSurface: 'MCL:S',
    stage: 'IMPLEMENTATION_PR',
    executionLifecycle: 'FINISHED',
    attentionDisposition: 'COMPLETE',
    result: 'PASS',
    proofScope: 'REPOSITORY_IMPLEMENTATION_FINALIZE_ONLY_RECOVERY',
    steps: [
      {name: 'published-state-rebind', result: 'PASS', evidenceLocator: `pr:#${ctx.pr.number}`},
      {name: 'd014-receipt-convergence', result: 'PASS',
        evidenceLocator: commentUrl(ctx.packet, parentRow.id)},
    ],
    counters: [
      {name: 'completion_receipts_written', value: written},
      {name: 'source_commit_push_pr_merge_effects', value: 0},
      {name: 'lease_holder_effects', value: 0},
    ],
    affectedFiles: [],
    artifactLocators: [
      `commit:${ctx.pr.head}`, `pr:#${ctx.pr.number}`,
      commentUrl(ctx.packet, childRow.id), commentUrl(ctx.packet, parentRow.id),
    ],
    reasonCodes: [], requiredUnknowns: [], conflicts: [], blockers: [],
    exitCode: 0, stderrTail: null, nextLegalAction: 'VALIDATION_MERGE',
  });
  return agentDecisionView.projectAgentDecisionView({
    receipt, phase: 'IMPLEMENTATION_PR',
    output: {
      commit: `commit:${ctx.pr.head}`,
      pr: `pr:#${ctx.pr.number}`,
      childReceipt: commentUrl(ctx.packet, childRow.id),
      parentReceipt: commentUrl(ctx.packet, parentRow.id),
      replayedEffects: 0,
    },
    attention: [],
    receiptLocator: commentUrl(ctx.packet, parentRow.id),
    reportLocator: commentUrl(ctx.packet, parentRow.id),
  });
}function convergeReceipts(ctx, deps = {}) {
  const postComment = deps.postComment
    || ((body) => stageEntry.postComment(ctx.packet, body, deps.runner || stageEntry.runDefault));
  const reread = deps.rereadComments
    || (() => implementation.readComments(ctx.packet, deps.runner || stageEntry.runDefault));
  let written = 0;
  let comments = ctx.comments;
  const childExpected = expectedChildReceipt(ctx);
  let childState = classifyReceipt(comments, ctx.child.value, childExpected);
  if (childState.state === 'MISSING') {
    postComment(taskHandoff.renderCompletionReceipt(childExpected));
    written += 1;
    comments = reread();
    childState = classifyReceipt(comments, ctx.child.value, childExpected);
    if (childState.state !== 'EXACT') fail('UNKNOWN', 'CHILD_RECEIPT_READBACK_FAILED');
  }
  const parentExpected = expectedParentReceipt(ctx, childState.row.id);
  let parentState = classifyReceipt(comments, ctx.parent.value, parentExpected);
  if (parentState.state === 'MISSING') {
    postComment(taskHandoff.renderCompletionReceipt(parentExpected));
    written += 1;
    comments = reread();
    childState = classifyReceipt(comments, ctx.child.value, childExpected);
    parentState = classifyReceipt(comments, ctx.parent.value, parentExpected);
    if (childState.state !== 'EXACT' || parentState.state !== 'EXACT') {
      fail('UNKNOWN', 'COMPLETION_RECEIPT_READBACK_FAILED');
    }
  }
  return resultView(ctx, written, childState.row, parentState.row);
}
function errorView(error, packetRef = 'UNKNOWN') {
  const kind = error instanceof RecoveryError ? error.kind : 'UNKNOWN';
  const reasons = error instanceof RecoveryError ? error.reasonCodes : ['UNEXPECTED_ERROR'];
  const result = kind === 'CONFLICT' ? 'CONFLICT' : kind === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN';
  const receipt = executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: `mcl-repository-implementation-finalize-recovery:${packetRef}`,
    primitiveId: 'mcl:repository-implementation-finalize-recovery:v1',
    sourceIdentity: {kind: 'WORK_PACKET', locator: packetRef, identity: 'UNKNOWN'},
    executionSurface: 'MCL:S', stage: 'IMPLEMENTATION_PR',
    executionLifecycle: 'FINISHED',
    attentionDisposition: result, result,
    proofScope: 'REPOSITORY_IMPLEMENTATION_FINALIZE_ONLY_RECOVERY',
    steps: [{name: 'finalize-recovery', result, evidenceLocator: packetRef}],
    counters: [], affectedFiles: [], artifactLocators: [packetRef],
    reasonCodes: reasons,
    requiredUnknowns: result === 'UNKNOWN' ? reasons : [],
    conflicts: result === 'CONFLICT' ? reasons : [],
    blockers: result === 'BLOCKED' ? reasons : [],
    exitCode: 2, stderrTail: null, nextLegalAction: 'TARGETED_DRILL_DOWN',
  });
  return agentDecisionView.projectAgentDecisionView({
    receipt, phase: 'IMPLEMENTATION_PR', output: {}, attention: [],
    receiptLocator: packetRef, reportLocator: packetRef,
  });
}function parseArgs(argv) {
  const command = argv[0];
  if (!['inspect', 'apply'].includes(command)) fail('UNKNOWN', 'COMMAND_UNSUPPORTED');
  const values = {};
  let apply = false;
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === '--apply') { apply = true; continue; }
    if (argv[i] !== '--packet' || i + 1 >= argv.length || values.packet) {
      fail('UNKNOWN', 'ARGUMENT_INVALID');
    }
    values.packet = argv[++i];
  }
  if (!values.packet) fail('UNKNOWN', 'PACKET_REQUIRED');
  if (command === 'apply' && !apply) fail('BLOCKED', 'EXPLICIT_APPLY_REQUIRED');
  if (command === 'inspect' && apply) fail('UNKNOWN', 'APPLY_NOT_ALLOWED_FOR_INSPECT');
  return {command, packetRef: values.packet};
}
function runCli(argv = process.argv.slice(2), deps = {}) {
  let packetRef = 'UNKNOWN';
  try {
    const args = parseArgs(argv);
    packetRef = args.packetRef;
    const ctx = (deps.buildContext || buildContext)(packetRef, deps);
    if (args.command === 'inspect') {
      const childExpected = expectedChildReceipt(ctx);
      const childState = classifyReceipt(ctx.comments, ctx.child.value, childExpected);
      return {
        schemaVersion: 1,
        mode: 'MCL_REPOSITORY_IMPLEMENTATION_FINALIZE_RECOVERY_INSPECT',
        packetRef,
        state: childState.state === 'EXACT' ? 'PARTIAL_OR_COMPLETE' : 'RECOVERY_REQUIRED',
        commit: `commit:${ctx.pr.head}`,
        pr: `pr:#${ctx.pr.number}`,
        sourceEffectsAuthorized: false,
      };
    }
    return convergeReceipts(ctx, deps);
  } catch (error) {
    return errorView(error, packetRef);
  }
}
if (require.main === module) {
  const output = runCli();
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  process.exitCode = output?.result === 'PASS' || output?.validity === 'VALID' ? 0 : 2;
}module.exports = {
  RecoveryError,
  buildContext,
  classifyReceipt,
  convergeReceipts,
  errorView,
  expectedChildReceipt,
  expectedParentReceipt,
  parseArgs,
  parseHandoffRows,
  parseManifestRows,
  parseReceiptRows,
  readPrState,
  runCli,
  selectHandoffPair,
  selectManifestPair,
  sha256,
  validateManifestPair,
  historicalCommand,
  historicalReleaseEvidence,
  validateReleasedLease,
  validateWorkspace,
};
