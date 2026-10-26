#!/usr/bin/env node
'use strict';
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../../../..');
const stageEntry = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs'));
const coordination = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs'));
const taskLease = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const taskHandoff = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const workspaceHolder = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
const interruptedRecovery = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination/l-interrupted-recovery/mcl-l-interrupted-recovery.cjs'));
const packetProjection = require(path.join(ROOT, '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs'));
const scopeOverlap = require(path.join(ROOT, '.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs'));
const MODE = 'MCL_L_INTERRUPTED_RECOVERY_REBIND';
const SCHEMA = 'mcl-l-interrupted-recovery-rebind.v1';
const REPO = 'hanmiyoo10-alt/-';
const OPS_ISSUE = 485;
const LEDGER_ISSUE = 2352;
const OWNER_PACKET_REF = '#3561';
const ACTIVATION_FILE = 'mcl-l-interrupted-recovery-rebind.v1.json';
const ACTIVATION_MODE = 'MCL_L_INTERRUPTED_RECOVERY_REBIND_ACTIVATION';
const ACTIVATION_LOCK_FILE = 'mcl-l-interrupted-recovery-rebind.v1.lock';
const FLOCK = '/usr/bin/flock', CAT = '/usr/bin/cat', LOCK_READY = 'MCL_REBIND_LOCK_READY_V1\n', LOCK_TIMEOUT_MS = 3000;
const MAX_COMMENT_PAGES = 20;
const PAGE_SIZE = 100;
const MAX_ACTIVATION_BYTES = 32 * 1024;
const MAX_GIT_OUTPUT = 4 * 1024 * 1024;
const PACKET_RE = /^#([1-9][0-9]*)$/;
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const OWNER_BLOB_PATHS = Object.freeze([
  'products/chatgpt-mobile-coder-lab/coordination/l-interrupted-recovery-rebind/mcl-l-interrupted-recovery-rebind.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/l-interrupted-recovery/mcl-l-interrupted-recovery.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs',
  'products/chatgpt-mobile-coder-lab/device-ops/l-rdc-session-evidence/mcl-l-rdc-session-evidence.cjs',
  '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs',
  '.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/effect-recovery/effect-recovery.cjs',
  '.github/plugin-control-plane/canonical-main/infra/github-client.cjs',
]);
const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  executionAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
  runtimeAuthorityGranted: false,
  securityAuthorityGranted: false,
});
class RecoveryError extends Error {
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
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function sha256(value) {
  const bytes = Buffer.isBuffer(value)
    ? value
    : Buffer.from(typeof value === 'string' ? value : JSON.stringify(stable(value)), 'utf8');
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function unique(values) {
  return [...new Set(values)].sort();
}
function packetNumber(packetRef) {
  const match = PACKET_RE.exec(packetRef || '');
  return match ? Number(match[1]) : null;
}
function exactJson(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}
function parseArgs(argv = process.argv.slice(2)) {
  if (!Array.isArray(argv) || !['inspect', 'apply'].includes(argv[0])) {
    throw new RecoveryError('UNKNOWN', ['COMMAND_UNSUPPORTED']);
  }
  const operation = argv[0];
  let target = null;
  let apply = false;
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      if (apply) throw new RecoveryError('UNKNOWN', ['ARGUMENT_DUPLICATE:apply']);
      apply = true;
      continue;
    }
    if (token !== '--target' || target !== null || index + 1 >= argv.length) {
      throw new RecoveryError('UNKNOWN', ['ARGUMENT_UNSUPPORTED']);
    }
    target = argv[++index];
  }
  if (!PACKET_RE.test(target || '')) throw new RecoveryError('UNKNOWN', ['TARGET_PACKET_INVALID']);
  if (operation === 'apply' && !apply) throw new RecoveryError('BLOCKED', ['EXPLICIT_APPLY_REQUIRED']);
  if (operation === 'inspect' && apply) throw new RecoveryError('UNKNOWN', ['INSPECT_APPLY_FORBIDDEN']);
  return {operation, targetPacketRef: target, targetPacketNumber: packetNumber(target)};
}
function defaultBinaryRunner(args, options = {}) {
  const result = childProcess.spawnSync(args[0], args.slice(1), {
    cwd: options.cwd,
    env: options.env || process.env,
    shell: false,
    encoding: options.binary ? null : 'utf8',
    input: options.input,
    maxBuffer: MAX_GIT_OUTPUT,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || (options.binary ? Buffer.alloc(0) : ''),
    stderr: result.stderr || (options.binary ? Buffer.alloc(0) : ''),
  };
}
function gitResult(worktree, args, {binary = false, runner = defaultBinaryRunner} = {}) {
  const env = {...process.env};
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR']) delete env[key];
  const result = runner(['git', '-C', worktree, ...args], {env, binary});
  if (!result || result.code !== 0) throw new RecoveryError('UNKNOWN', ['GIT_READ_FAILED']);
  return result;
}
function readMainAuthority(runner = stageEntry.runDefault) {
  const first = stageEntry.ghJson('repos/' + REPO + '/branches/main', runner)?.commit?.sha;
  if (!SHA40_RE.test(first || '')) throw new RecoveryError('UNKNOWN', ['MAIN_SHA_INVALID']);
  const ops = stageEntry.ghJson('repos/' + REPO + '/issues/' + OPS_ISSUE, runner);
  const second = stageEntry.ghJson('repos/' + REPO + '/branches/main', runner)?.commit?.sha;
  if (first !== second) throw new RecoveryError('UNKNOWN', ['MAIN_CHANGED_DURING_CAPTURE']);
  try {
    stageEntry.parseOpsCapsule(ops?.body, first);
  } catch (error) {
    if (error instanceof stageEntry.StageError) throw new RecoveryError(error.kind, error.reasonCodes);
    throw error;
  }
  return {mainSha: first};
}
function readOwnerBlobs(mainSha, runner = stageEntry.runDefault) {
  const blobs = {};
  for (const repoPath of OWNER_BLOB_PATHS) {
    const value = stageEntry.ghJson('repos/' + REPO + '/contents/' + repoPath + '?ref=' + mainSha, runner);
    if (!SHA40_RE.test(value?.sha || '')) throw new RecoveryError('UNKNOWN', ['OWNER_BLOB_INVALID:' + repoPath]);
    blobs[repoPath] = value.sha;
  }
  return blobs;
}
function listComments(issueNumber, runner = stageEntry.runDefault) {
  const rows = [];
  for (let page = 1; page <= MAX_COMMENT_PAGES; page += 1) {
    const value = stageEntry.ghJson(
      'repos/' + REPO + '/issues/' + issueNumber + '/comments?per_page=' + PAGE_SIZE + '&page=' + page,
      runner,
    );
    if (!Array.isArray(value)) throw new RecoveryError('UNKNOWN', ['COMMENTS_INVALID']);
    rows.push(...value);
    if (value.length < PAGE_SIZE) return rows;
  }
  throw new RecoveryError('UNKNOWN', ['COMMENTS_PAGINATION_BOUND']);
}
function validManifests(comments) {
  const rows = [];
  for (const row of comments) {
    if (typeof row?.body !== 'string') continue;
    const parsed = taskHandoff.parseManifest(row.body);
    if (parsed.status === 'VALID') rows.push({commentId: row.id, manifest: parsed.value, text: row.body.trim()});
  }
  return rows;
}
function sameLeaseProfile(manifest, lease) {
  return manifest
    && manifest.packetRef === lease.packetRef
    && manifest.packetBodySha256 === lease.packetBodySha256
    && manifest.route === lease.route
    && manifest.executor === lease.executor
    && exactJson(manifest.scopes, lease.scopes)
    && exactJson(manifest.workspace, lease.workspace)
    && manifest.observedBaseSha === lease.observedBaseSha
    && manifest.leaseEvidence?.leaseId === lease.leaseId;
}
function holderStateFor(workspace, manifest = null) {
  const inspected = workspaceHolder.inspectWorkspace({workspace});
  if (!inspected?.ok || !inspected.holderPath) {
    throw new RecoveryError('BLOCKED', ['WORKSPACE_HOLDER_PATH_INVALID', ...(inspected?.reasonCodes || [])]);
  }
  const read = workspaceHolder.readHolder(inspected.holderPath);
  if (read.missing) return {state: 'ABSENT', holderPath: inspected.holderPath};
  if (!read.ok) throw new RecoveryError('CONFLICT', ['HOLDER_RECORD_INVALID', ...(read.reasonCodes || [])]);
  if (manifest && (read.value.leaseId !== manifest.leaseEvidence?.leaseId || read.value.manifestId !== manifest.manifestId)) {
    throw new RecoveryError('CONFLICT', ['HOLDER_IDENTITY_CONFLICT']);
  }
  return {state: 'PRESENT_EXACT', holderPath: inspected.holderPath, manifestId: read.value.manifestId, leaseId: read.value.leaseId};
}
function parseNul(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value || ''), 'utf8');
  return bytes.toString('utf8').split('\0').filter(Boolean);
}
function pathCovered(repoPath, pathScopes) {
  const target = scopeOverlap.normalizeScope('path:' + repoPath);
  return target.ok && pathScopes.some((raw) => {
    const scope = scopeOverlap.normalizeScope(raw);
    return scope.ok && scopeOverlap.scopesOverlap(scope, target);
  });
}
function captureWorkspace({lease, runner = defaultBinaryRunner}) {
  const worktree = lease.workspace.worktree;
  const branch = String(gitResult(worktree, ['branch', '--show-current'], {runner}).stdout).trim();
  const head = String(gitResult(worktree, ['rev-parse', 'HEAD'], {runner}).stdout).trim();
  const unmerged = parseNul(gitResult(worktree, ['diff', '--name-only', '--diff-filter=U', '-z'], {runner, binary: true}).stdout);
  const staged = parseNul(gitResult(worktree, ['diff', '--cached', '--name-only', '-z'], {runner, binary: true}).stdout);
  const dirtyPaths = unique(parseNul(gitResult(worktree, ['diff', '--name-only', '-z'], {runner, binary: true}).stdout));
  const untracked = parseNul(gitResult(worktree, ['ls-files', '--others', '--exclude-standard', '-z'], {runner, binary: true}).stdout);
  const diff = gitResult(worktree, ['diff', '--binary', '--no-ext-diff', '--no-renames'], {runner, binary: true}).stdout;
  const pathScopes = lease.scopes.filter((scope) => scope.startsWith('path:'));
  if (branch !== lease.workspace.branch || head !== lease.observedBaseSha) throw new RecoveryError('CONFLICT', ['WORKSPACE_GIT_IDENTITY_CONFLICT']);
  if (unmerged.length || staged.length || untracked.length) throw new RecoveryError('BLOCKED', ['WORKSPACE_NON_UNSTAGED_RESIDUE']);
  if (!dirtyPaths.length || !Buffer.isBuffer(diff) || diff.length === 0) throw new RecoveryError('BLOCKED', ['WORKSPACE_DIRTY_DIFF_REQUIRED']);
  if (!dirtyPaths.every((repoPath) => pathCovered(repoPath, pathScopes))) throw new RecoveryError('CONFLICT', ['WORKSPACE_DIRTY_SCOPE_CONFLICT']);
  return {
    branch,
    head,
    dirtyPaths,
    dirtyDiffSha256: sha256(diff),
    dirtyDiffBytes: diff.length,
    stagedCount: staged.length,
    untrackedCount: untracked.length,
    unmergedCount: unmerged.length,
  };
}
function readRemoteHead(lease, runner = defaultBinaryRunner) {
  const result = gitResult(lease.workspace.worktree, ['ls-remote', 'origin', 'refs/heads/' + lease.workspace.branch], {runner});
  const rows = String(result.stdout || '').trim().split(/\r?\n/).filter(Boolean);
  if (rows.length !== 1) throw new RecoveryError(rows.length ? 'CONFLICT' : 'BLOCKED', [rows.length ? 'REMOTE_BRANCH_AMBIGUOUS' : 'REMOTE_BRANCH_MISSING']);
  const sha = rows[0].split(/\s+/)[0];
  if (sha !== lease.observedBaseSha) throw new RecoveryError('CONFLICT', ['REMOTE_HEAD_CONFLICT']);
  return sha;
}
function readPrState(branch, runner = stageEntry.runDefault) {
  const result = runner(['gh', 'pr', 'list', '--repo', REPO, '--head', branch, '--state', 'all', '--json', 'number,state,isDraft,headRefName,headRefOid,baseRefName,mergedAt']);
  if (result.code !== 0) throw new RecoveryError('UNKNOWN', ['PR_DISCOVERY_FAILED']);
  let rows;
  try { rows = JSON.parse(result.stdout || '[]'); } catch { throw new RecoveryError('UNKNOWN', ['PR_DISCOVERY_INVALID']); }
  if (!Array.isArray(rows)) throw new RecoveryError('UNKNOWN', ['PR_DISCOVERY_INVALID']);
  if (rows.length !== 0) throw new RecoveryError('BLOCKED', ['TARGET_BRANCH_PR_PRESENT']);
  return 'ABSENT';
}
function runSessionEvidence(runner = defaultBinaryRunner) {
  const source = path.join(ROOT, 'products/chatgpt-mobile-coder-lab/device-ops/l-rdc-session-evidence/mcl-l-rdc-session-evidence.cjs');
  const converted = runner(['wslpath', '-w', source]);
  if (converted.code !== 0) throw new RecoveryError('UNKNOWN', ['SESSION_OWNER_PATH_UNAVAILABLE']);
  const winSource = String(converted.stdout || '').trim();
  if (!winSource) throw new RecoveryError('UNKNOWN', ['SESSION_OWNER_PATH_UNAVAILABLE']);
  const result = runner(['/mnt/c/Program Files/nodejs/node.exe', winSource, 'inspect']);
  let value = null;
  try { value = JSON.parse(String(result.stdout || '').trim()); } catch { value = null; }
  if (result.code !== 0 || !value) throw new RecoveryError('UNKNOWN', ['SESSION_OWNER_EXECUTION_FAILED']);
  return value;
}
function buildRecoveryInput(snapshot, sessionEvidence, mainSha) {
  return {
    schemaVersion: 1,
    mode: 'MCL_L_INTERRUPTED_RECOVERY_COMPOSITION',
    recoveryFacts: {
      schemaVersion: 1,
      mode: 'EFFECT_RECOVERY_EVIDENCE',
      subject: snapshot.packetRef.replace(/^#/, 'issue:#'),
      packetState: 'EXACT',
      leaseState: 'ACTIVE_EXACT',
      manifestState: 'EXACT',
      holderState: 'PRESENT_EXACT',
      workspaceState: 'DIRTY_PRESERVED',
      dirtyScopeState: 'EXACT',
      gitIdentityState: 'EXACT',
      remoteBranchState: 'UNCHANGED_BASE',
      prState: 'ABSENT',
      releaseEligibility: 'PROVEN',
      locators: {
        packet: snapshot.packetRef.replace(/^#/, 'issue:#'),
        lease: 'issue:#2352',
        manifest: 'receipt:mcl-task-manifest:' + snapshot.manifest.manifestId,
        holder: 'receipt:mcl-workspace-holder:' + snapshot.packetNumber,
        workspace: 'receipt:mcl-recovery-workspace:' + snapshot.packetNumber,
        dirtyScope: 'receipt:mcl-recovery-dirty-scope:' + snapshot.packetNumber,
        gitIdentity: 'commit:' + snapshot.lease.observedBaseSha,
        remoteBranch: 'receipt:mcl-recovery-remote-branch:' + snapshot.packetNumber,
        pr: 'receipt:mcl-recovery-pr-state:' + snapshot.packetNumber,
        releaseEligibility: 'receipt:mcl-d013-release-plan:' + snapshot.packetNumber,
      },
    },
    sessionEvidence,
    sessionEvidenceLocator: 'receipt:physical-l:mcl-l-rdc-session-evidence.v2:rebind-admission',
    sourceRefs: [
      snapshot.packetRef.replace(/^#/, 'issue:#'),
      'issue:#3481',
      'issue:#3491',
      'issue:#3551',
      'issue:#3555',
      'commit:' + mainSha,
    ],
  };
}
function exactCommentState(comments, text) {
  const target = String(text).trim();
  const ids = comments.filter((row) => typeof row?.body === 'string' && row.body.trim() === target)
    .map((row) => row.id).filter(Number.isSafeInteger).sort((a, b) => a - b);
  return {count: ids.length, commentId: ids.length === 1 ? ids[0] : null};
}
function renderHandoff(manifest) {
  const value = {
    schema: 'mcl-execution-handoff.v1',
    status: 'HANDOFF_READY',
    packet_ref: manifest.packetRef,
    phase: 'recovery-rebind',
    route: 'L',
    executor: 'L',
    effect_class: 'coordination',
    manifest_id: manifest.manifestId,
    lease_id: manifest.leaseEvidence.leaseId,
    next_owner: 'existing_route_owner',
    reason_codes: [],
    mutation_authorized: false,
    execution_authorized: false,
    details: 'withheld',
  };
  return ['<!-- mcl-execution-handoff:v1 -->', '```json', JSON.stringify(value, null, 2), '```', '<!-- /mcl-execution-handoff:v1 -->'].join('\n');
}
function normalizeActivation(value) {
  const required = [
    'schemaVersion', 'mode', 'targetPacketRef', 'packetBodySha256', 'admissionMainSha',
    'ownerBlobs', 'scopes', 'workspace', 'observedBaseSha', 'leaseId',
    'oldAcquiredGeneration', 'oldManifestId', 'oldManifestPayloadSha256',
    'classificationDigest', 'coreReceiptDigest', 'dirtyDiffSha256', 'dirtyPaths',
    'releasePlanGeneration', 'releaseExpectedGeneration', 'releaseDispatchStarted',
    'releaseGeneration', 'releaseEvidenceRef', 'acquirePlanGeneration',
    'acquireExpectedGeneration', 'acquireDispatchStarted', 'reacquireGeneration',
    'reacquireEvidenceRef', 'rebindManifestId', 'rebindManifestPayloadSha256',
    'manifestCommentId', 'handoffCommentId', 'recordDigest',
  ];
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).sort().join(',') !== [...required].sort().join(',')) {
    throw new RecoveryError('CONFLICT', ['ACTIVATION_SCHEMA_INVALID']);
  }
  if (value.schemaVersion !== 1 || value.mode !== ACTIVATION_MODE
      || !PACKET_RE.test(value.targetPacketRef || '')
      || !SHA256_RE.test(value.packetBodySha256 || '')
      || !SHA40_RE.test(value.admissionMainSha || '')
      || !SHA40_RE.test(value.observedBaseSha || '')
      || !SHA256_RE.test(value.leaseId || '')
      || !Number.isSafeInteger(value.oldAcquiredGeneration)
      || !SHA256_RE.test(value.oldManifestId || '')
      || !SHA256_RE.test(value.oldManifestPayloadSha256 || '')
      || !SHA256_RE.test(value.classificationDigest || '')
      || !SHA256_RE.test(value.coreReceiptDigest || '')
      || !SHA256_RE.test(value.dirtyDiffSha256 || '')
      || !Array.isArray(value.dirtyPaths) || value.dirtyPaths.length < 1
      || !Array.isArray(value.scopes) || value.scopes.length < 1
      || !value.workspace || value.workspace.kind !== 'repository'
      || !value.ownerBlobs || typeof value.ownerBlobs !== 'object'
      || Object.keys(value.ownerBlobs).sort().join(',') !== [...OWNER_BLOB_PATHS].sort().join(',')
      || Object.values(value.ownerBlobs).some((blob) => !SHA40_RE.test(blob || ''))
      || !SHA256_RE.test(value.recordDigest || '')) {
    throw new RecoveryError('CONFLICT', ['ACTIVATION_FIELD_INVALID']);
  }
  const nullableInts = ['releasePlanGeneration', 'releaseExpectedGeneration', 'releaseGeneration', 'acquirePlanGeneration', 'acquireExpectedGeneration', 'reacquireGeneration', 'manifestCommentId', 'handoffCommentId'];
  if (nullableInts.some((key) => value[key] !== null && !Number.isSafeInteger(value[key]))) throw new RecoveryError('CONFLICT', ['ACTIVATION_INTEGER_INVALID']);
  for (const key of ['releaseDispatchStarted', 'acquireDispatchStarted']) {
    if (typeof value[key] !== 'boolean') throw new RecoveryError('CONFLICT', ['ACTIVATION_BOOLEAN_INVALID']);
  }
  for (const key of ['releaseEvidenceRef', 'reacquireEvidenceRef', 'rebindManifestId', 'rebindManifestPayloadSha256']) {
    if (value[key] !== null && typeof value[key] !== 'string') throw new RecoveryError('CONFLICT', ['ACTIVATION_TEXT_INVALID']);
  }
  const core = {...value};
  delete core.recordDigest;
  if (sha256(core) !== value.recordDigest) throw new RecoveryError('CONFLICT', ['ACTIVATION_DIGEST_CONFLICT']);
  return value;
}
function buildActivation(snapshot) {
  const core = {
    schemaVersion: 1,
    mode: ACTIVATION_MODE,
    targetPacketRef: snapshot.packetRef,
    packetBodySha256: snapshot.packetBodySha256,
    admissionMainSha: snapshot.mainSha,
    ownerBlobs: snapshot.ownerBlobs,
    scopes: snapshot.scopes,
    workspace: snapshot.lease.workspace,
    observedBaseSha: snapshot.lease.observedBaseSha,
    leaseId: snapshot.lease.leaseId,
    oldAcquiredGeneration: snapshot.manifest.leaseEvidence.acquiredGeneration,
    oldManifestId: snapshot.manifest.manifestId,
    oldManifestPayloadSha256: snapshot.manifest.payloadSha256,
    classificationDigest: snapshot.classification.output.classificationDigest,
    coreReceiptDigest: snapshot.classification.output.coreReceiptDigest,
    dirtyDiffSha256: snapshot.workspace.dirtyDiffSha256,
    dirtyPaths: snapshot.workspace.dirtyPaths,
    releasePlanGeneration: null,
    releaseExpectedGeneration: null,
    releaseDispatchStarted: false,
    releaseGeneration: null,
    releaseEvidenceRef: null,
    acquirePlanGeneration: null,
    acquireExpectedGeneration: null,
    acquireDispatchStarted: false,
    reacquireGeneration: null,
    reacquireEvidenceRef: null,
    rebindManifestId: null,
    rebindManifestPayloadSha256: null,
    manifestCommentId: null,
    handoffCommentId: null,
  };
  return {...core, recordDigest: sha256(core)};
}
function activationPath(workspace) {
  const inspected = workspaceHolder.inspectWorkspace({workspace});
  if (!inspected?.ok || !inspected.holderPath) throw new RecoveryError('BLOCKED', ['ACTIVATION_WORKSPACE_INVALID', ...(inspected?.reasonCodes || [])]);
  return path.join(path.dirname(inspected.holderPath), ACTIVATION_FILE);
}
function activationLockPath(workspace) {
  return path.join(path.dirname(activationPath(workspace)), ACTIVATION_LOCK_FILE);
}
function acquireActivationLock(workspace, spawn = childProcess.spawn) {
  const file = activationLockPath(workspace);
  return new Promise((resolve, reject) => {
    let child, seen = '', settled = false, timer = null;
    const fail = (kind, reason) => {
      if (settled) return;
      settled = true; if (timer) clearTimeout(timer);
      try { child?.kill(); } catch (_) {}
      reject(new RecoveryError(kind, [reason]));
    };
    try { child = spawn(FLOCK, ['-n', file, CAT], {stdio:['pipe','pipe','ignore']}); }
    catch (_) { fail('UNKNOWN', 'ACTIVATION_LOCK_START_FAILED'); return; }
    timer = setTimeout(() => fail('UNKNOWN', 'ACTIVATION_LOCK_HANDSHAKE_TIMEOUT'), LOCK_TIMEOUT_MS);
    child.once('error', () => fail('UNKNOWN', 'ACTIVATION_LOCK_START_FAILED'));
    child.once('exit', (code) => !settled && fail(
      code === 1 ? 'BLOCKED' : 'UNKNOWN',
      code === 1 ? 'ACTIVATION_WRITER_LOCKED' : 'ACTIVATION_LOCK_FAILED'));
    child.stdout.on('data', (chunk) => {
      if (settled) return;
      seen += String(chunk);
      if (!LOCK_READY.startsWith(seen)) { fail('UNKNOWN', 'ACTIVATION_LOCK_HANDSHAKE_INVALID'); return; }
      if (seen === LOCK_READY) {
        settled = true; clearTimeout(timer);
        const lock = {child, lost:false};
        child.once('exit', () => { lock.lost = true; });
        resolve(lock);
      }
    });
    child.stdin.write(LOCK_READY);
  });
}
function assertActivationLock(lock) {
  if (!lock || lock.lost || lock.child?.exitCode !== null)
    throw new RecoveryError('UNKNOWN', ['ACTIVATION_LOCK_LOST']);
}
function releaseActivationLock(lock) {
  if (!lock) return Promise.resolve();
  assertActivationLock(lock);
  return new Promise((resolve, reject) => {
    lock.child.once('exit', (code) => code === 0 ? resolve()
      : reject(new RecoveryError('UNKNOWN', ['ACTIVATION_LOCK_RELEASE_FAILED'])));
    lock.child.stdin.end();
  });
}
function writeActivation(value) {
  const normalized = normalizeActivation(value);
  const file = activationPath(normalized.workspace);
  const text = JSON.stringify(normalized) + '\n';
  if (Buffer.byteLength(text, 'utf8') > MAX_ACTIVATION_BYTES) throw new RecoveryError('BLOCKED', ['ACTIVATION_TOO_LARGE']);
  const tmp = file + '.tmp.' + crypto.randomBytes(8).toString('hex');
  let fd = null;
  try {
    fd = fs.openSync(tmp, 'wx', 0o600);
    fs.writeFileSync(fd, text, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = null;
    fs.renameSync(tmp, file);
    fs.chmodSync(file, 0o600);
    const dirFd = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
  } finally {
    if (fd !== null) try { fs.closeSync(fd); } catch (_) {}
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
  return normalized;
}
function updateActivation(value, patch) {
  const core = {...value, ...patch};
  delete core.recordDigest;
  return writeActivation({...core, recordDigest: sha256(core)});
}
function readActivationAt(workspace) {
  const file = activationPath(workspace);
  let stat;
  try { stat = fs.lstatSync(file); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new RecoveryError('UNKNOWN', ['ACTIVATION_READ_FAILED']);
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_ACTIVATION_BYTES) throw new RecoveryError('CONFLICT', ['ACTIVATION_FILE_INVALID']);
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new RecoveryError('CONFLICT', ['ACTIVATION_JSON_INVALID']); }
  return normalizeActivation(value);
}
function findActivation(targetPacketRef, manifests, packet = null, readActivation = readActivationAt) {
  const seen = new Map();
  for (const row of manifests) {
    const m = row.manifest;
    if (m.packetRef !== targetPacketRef || m.workspace?.kind !== 'repository') continue;
    if (packet && (m.packetBodySha256 !== packet.packetBodySha256
        || m.route !== 'L' || m.executor !== 'L' || !exactJson(m.scopes, packet.scopes))) continue;
    const value = readActivation(m.workspace);
    if (!value) continue;
    if (value.targetPacketRef !== targetPacketRef) throw new RecoveryError('CONFLICT', ['ACTIVATION_TARGET_CONFLICT']);
    seen.set(JSON.stringify(stable(m.workspace)), value);
  }
  if (seen.size > 1) throw new RecoveryError('CONFLICT', ['ACTIVATION_MULTIPLE']);
  return seen.size === 1 ? [...seen.values()][0] : null;
}
function evidenceRefForDispatch(value, operation, leaseId) {
  if (Number.isSafeInteger(value?.runId)) return 'run:' + value.runId;
  if (typeof value?.evidenceRef === 'string') return value.evidenceRef;
  if (Number.isSafeInteger(value?.observedGeneration)) return 'receipt:mcl-task-lease-readback:' + operation + ':' + leaseId + ':generation:' + value.observedGeneration;
  return null;
}
function buildRebindManifest({activation, issueBody, lease, acquiredGeneration, acquireEvidenceRef, mainSha}) {
  const pathScopes = activation.scopes.filter((scope) => scope.startsWith('path:'));
  return taskHandoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: activation.targetPacketRef,
    packetBodySha256: taskLease.digest(issueBody),
    phaseId: packetNumber(activation.targetPacketRef) + '-implementation-pr-recovery-rebind-g' + acquiredGeneration,
    phaseClass: 'COORDINATION',
    route: 'L',
    executor: 'L',
    scopes: activation.scopes,
    workspace: activation.workspace,
    observedBaseSha: activation.observedBaseSha,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: lease.leaseId,
      acquiredGeneration,
      acquireEvidenceRef,
    },
    sourceAuthorityRefs: [activation.targetPacketRef, 'issue:#3481', 'issue:#3491', 'issue:#3561', 'issue:#2352'],
    inputRefs: [
      'commit:' + mainSha,
      'receipt:mcl-task-manifest:' + activation.oldManifestId,
      'receipt:mcl-interrupted-recovery:' + activation.classificationDigest,
      'receipt:mcl-dirty-diff:' + activation.dirtyDiffSha256,
    ],
    expectedOutputRefs: pathScopes,
    acceptanceRefs: [activation.targetPacketRef, 'issue:#3481', 'issue:#3561'],
    stopCondition: 'Rebind coordination only after exact abandoned classification; preserve dirty bytes/index/ref/remote/PR state and stop with the fresh holder absent.',
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
  });
}
function postOnce(issueNumber, text, deps) {
  const before = exactCommentState(deps.readComments(issueNumber), text);
  if (before.count > 1) throw new RecoveryError('CONFLICT', ['COMMENT_DUPLICATE_VARIANT']);
  if (before.count === 1) return before.commentId;
  let written = null;
  try { written = deps.postComment(issueNumber, text); }
  catch (_) {
    const recovered = exactCommentState(deps.readComments(issueNumber), text);
    if (recovered.count === 1) return recovered.commentId;
    throw new RecoveryError('UNKNOWN', ['COMMENT_WRITE_UNPROVEN']);
  }
  if (!Number.isSafeInteger(written)) throw new RecoveryError('UNKNOWN', ['COMMENT_WRITE_UNPROVEN']);
  const after = exactCommentState(deps.readComments(issueNumber), text);
  if (after.count !== 1) throw new RecoveryError('UNKNOWN', ['COMMENT_READBACK_UNPROVEN']);
  return after.commentId;
}
function makeEvidenceFiles({manifest, ledgerBody, packetBody}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-rebind-'));
  const manifestPath = path.join(dir, 'manifest.md');
  const ledgerPath = path.join(dir, 'ledger.md');
  const packetPath = path.join(dir, 'packet.md');
  fs.writeFileSync(manifestPath, taskHandoff.renderManifest(manifest), 'utf8');
  fs.writeFileSync(ledgerPath, ledgerBody, 'utf8');
  fs.writeFileSync(packetPath, packetBody, 'utf8');
  return {dir, manifestPath, ledgerPath, packetPath};
}
function removeEvidenceFiles(files) {
  try { fs.rmSync(files.dir, {recursive: true, force: true}); } catch (_) {}
}
function defaultDeps(overrides = {}) {
  const runner = overrides.runner || stageEntry.runDefault;
  const binaryRunner = overrides.binaryRunner || defaultBinaryRunner;
  const client = overrides.client || coordination.createOperatorGitHubClient({repo: REPO});
  return {
    runner,
    binaryRunner,
    client,
    readAuthority: overrides.readAuthority || (() => readMainAuthority(runner)),
    readOwnerBlobs: overrides.readOwnerBlobs || ((mainSha) => readOwnerBlobs(mainSha, runner)),
    readIssue: overrides.readIssue || ((number) => stageEntry.ghJson('repos/' + REPO + '/issues/' + number, runner)),
    readLedger: overrides.readLedger || (() => stageEntry.ghJson('repos/' + REPO + '/issues/' + LEDGER_ISSUE, runner)),
    readComments: overrides.readComments || ((number) => listComments(number, runner)),
    discoverOverlap: overrides.discoverOverlap || ((input) => stageEntry.discoverOverlap({...input, runner})),
    captureWorkspace: overrides.captureWorkspace || ((input) => captureWorkspace({...input, runner: binaryRunner})),
    readRemoteHead: overrides.readRemoteHead || ((lease) => readRemoteHead(lease, binaryRunner)),
    readPrState: overrides.readPrState || ((branch) => readPrState(branch, runner)),
    readSession: overrides.readSession || (() => runSessionEvidence(binaryRunner)),
    classify: overrides.classify || ((input) => interruptedRecovery.composeRecovery(input)),
    planRelease: overrides.planRelease || ((packetRef, leaseId) => coordination.planRelease({client, packetRef, leaseId})),
    planAcquire: overrides.planAcquire || ((request) => coordination.planAcquire({client, ...request})),
    dispatch: overrides.dispatch || ((plan) => coordination.dispatchPlan({repo: REPO, plan, client})),
    cleanupStale: overrides.cleanupStale || ((manifest, ledgerBody, packetBody) => {
      const files = makeEvidenceFiles({manifest, ledgerBody, packetBody});
      try { return workspaceHolder.cleanupStale(files); } finally { removeEvidenceFiles(files); }
    }),
    buildManifest: overrides.buildManifest || buildRebindManifest,
    renderManifest: overrides.renderManifest || taskHandoff.renderManifest,
    renderHandoff: overrides.renderHandoff || renderHandoff,
    postComment: overrides.postComment || ((number, body) => stageEntry.postComment(number, body, runner)),
    writeActivation: overrides.writeActivation || writeActivation,
    updateActivation: overrides.updateActivation || updateActivation,
    findActivation: overrides.findActivation || findActivation,
    acquireActivationLock: overrides.acquireActivationLock || acquireActivationLock,
    releaseActivationLock: overrides.releaseActivationLock || releaseActivationLock,
    assertActivationLock: overrides.assertActivationLock || assertActivationLock,
    revalidateReleaseAdmission: overrides.revalidateReleaseAdmission || ((activation) => revalidateReleaseAdmission(activation, overrides)),
  };
}
function readPacketContext(targetPacketNumber, deps) {
  const issue = deps.readIssue(targetPacketNumber);
  if (!issue || issue.pull_request || issue.state !== 'open' || typeof issue.body !== 'string') throw new RecoveryError('BLOCKED', ['TARGET_PACKET_NOT_OPEN']);
  const projection = packetProjection.classifyPacketProjection(issue.body);
  if (projection.disposition === 'CONFLICT') throw new RecoveryError('CONFLICT', projection.reasonCodes || ['TARGET_PACKET_PROJECTION_CONFLICT']);
  if (projection.disposition !== 'PASS') throw new RecoveryError('UNKNOWN', projection.reasonCodes || ['TARGET_PACKET_PROJECTION_UNKNOWN']);
  if (projection.lifecycle !== 'IN_PROGRESS' || projection.interactionStage !== 'IMPLEMENTATION_PR') throw new RecoveryError('BLOCKED', ['TARGET_PACKET_STAGE_INVALID']);
  let scopes;
  try { scopes = stageEntry.extractPacketScopes(issue.body); }
  catch (error) {
    if (error instanceof stageEntry.StageError) throw new RecoveryError(error.kind, error.reasonCodes);
    throw error;
  }
  const overlap = deps.discoverOverlap({packetNumber: targetPacketNumber, requestedScopes: scopes});
  if (overlap.discovery !== 'COMPLETE') throw new RecoveryError('UNKNOWN', ['TARGET_OVERLAP_INCOMPLETE']);
  if (overlap.state === 'CONFLICT') throw new RecoveryError('CONFLICT', ['TARGET_OVERLAP_CONFLICT']);
  if (overlap.state !== 'DISJOINT') throw new RecoveryError('BLOCKED', ['TARGET_OVERLAP_NOT_DISJOINT']);
  return {issue, packetRef: '#' + targetPacketNumber, packetNumber: targetPacketNumber, packetBodySha256: taskLease.digest(issue.body), scopes, overlap};
}
function readLedgerState(deps) {
  const issue = deps.readLedger();
  if (!issue || issue.pull_request || issue.state !== 'open' || typeof issue.body !== 'string') throw new RecoveryError('UNKNOWN', ['LEDGER_ISSUE_INVALID']);
  const parsed = taskLease.parseLedger(issue.body);
  if (!parsed.ok) throw new RecoveryError('UNKNOWN', ['LEDGER_INVALID', ...(parsed.reasonCodes || [])]);
  return {issue, state: parsed.state};
}
async function inspectInitial(targetPacketNumber, depsInput = {}) {
  const deps = defaultDeps(depsInput);
  const authority = deps.readAuthority();
  const ownerBlobs = deps.readOwnerBlobs(authority.mainSha);
  const packet = readPacketContext(targetPacketNumber, deps);
  const ledger = readLedgerState(deps);
  const leases = ledger.state.activeLeases.filter((row) => row.packetRef === packet.packetRef);
  if (leases.length !== 1) throw new RecoveryError(leases.length ? 'CONFLICT' : 'BLOCKED', [leases.length ? 'TARGET_ACTIVE_LEASE_DUPLICATE' : 'TARGET_ACTIVE_LEASE_MISSING']);
  const lease = leases[0];
  if (lease.packetBodySha256 !== packet.packetBodySha256 || lease.route !== 'L' || lease.executor !== 'L' || lease.workspace?.kind !== 'repository' || !exactJson(lease.scopes, packet.scopes)) throw new RecoveryError('CONFLICT', ['TARGET_LEASE_PROFILE_CONFLICT']);
  const holder = holderStateFor(lease.workspace);
  if (holder.state !== 'PRESENT_EXACT') throw new RecoveryError('BLOCKED', ['TARGET_HOLDER_REQUIRED']);
  const manifests = validManifests(deps.readComments(targetPacketNumber));
  const matching = manifests.filter((row) => row.manifest.manifestId === holder.manifestId && sameLeaseProfile(row.manifest, lease));
  if (matching.length !== 1) throw new RecoveryError(matching.length ? 'CONFLICT' : 'BLOCKED', [matching.length ? 'TARGET_MANIFEST_AMBIGUOUS' : 'TARGET_MANIFEST_MISSING']);
  const manifest = matching[0].manifest;
  if (manifest.leaseEvidence.acquiredGeneration > ledger.state.generation) throw new RecoveryError('CONFLICT', ['TARGET_MANIFEST_GENERATION_CONFLICT']);
  holderStateFor(lease.workspace, manifest);
  const workspaceState = deps.captureWorkspace({lease});
  deps.readRemoteHead(lease);
  deps.readPrState(lease.workspace.branch);
  const releasePlan = await deps.planRelease(packet.packetRef, lease.leaseId);
  if (releasePlan?.status !== 'PLAN_READY') throw new RecoveryError(releasePlan?.status === 'CONFLICT' ? 'CONFLICT' : releasePlan?.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED', releasePlan?.reasonCodes || ['TARGET_RELEASE_PLAN_NOT_READY']);
  const session = deps.readSession();
  const recoveryInput = buildRecoveryInput({...packet, lease, manifest, workspace: workspaceState}, session, authority.mainSha);
  let classification;
  try { classification = deps.classify(recoveryInput); }
  catch (error) { throw new RecoveryError('UNKNOWN', error?.reasonCodes || ['TARGET_CLASSIFICATION_FAILED']); }
  if (classification?.output?.status !== 'PASS' || classification.output.recoveryDisposition !== 'ABANDONED_LEASE_RELEASE' || classification.output.nextLegalAction !== 'RELEASE_PRIOR_D013_THROUGH_EXISTING_OWNER_THEN_REACQUIRE_REBIND') throw new RecoveryError('BLOCKED', ['TARGET_CLASSIFICATION_NOT_ABANDONED_RELEASE']);
  return {...packet, mainSha: authority.mainSha, ownerBlobs, ledger, lease, manifest, holder, workspace: workspaceState, releasePlan, session, classification};
}
async function revalidateReleaseAdmission(activationInput, depsInput = {}) {
  const activation = normalizeActivation(activationInput);
  const fresh = await inspectInitial(packetNumber(activation.targetPacketRef), depsInput);
  if (fresh.packetBodySha256 !== activation.packetBodySha256
      || fresh.lease.leaseId !== activation.leaseId
      || fresh.manifest.manifestId !== activation.oldManifestId
      || fresh.workspace.dirtyDiffSha256 !== activation.dirtyDiffSha256
      || !exactJson(fresh.workspace.dirtyPaths, activation.dirtyPaths)
      || !exactJson(fresh.ownerBlobs, activation.ownerBlobs)
      || fresh.classification?.output?.status !== 'PASS'
      || fresh.classification.output.recoveryDisposition !== 'ABANDONED_LEASE_RELEASE') {
    throw new RecoveryError('BLOCKED', ['RELEASE_ADMISSION_REVALIDATION_FAILED']);
  }
  return fresh;
}
function manifestsForActivation(targetPacketNumber, deps) {
  return validManifests(deps.readComments(targetPacketNumber));
}
function verifyContinuationAuthority(activation, deps) {
  const authority = deps.readAuthority();
  const ownerBlobs = deps.readOwnerBlobs(authority.mainSha);
  if (!exactJson(ownerBlobs, activation.ownerBlobs)) throw new RecoveryError('BLOCKED', ['RECOVERY_OWNER_BLOB_DRIFT']);
  return authority;
}
function verifyPreservedState(activation, lease, deps) {
  const workspaceState = deps.captureWorkspace({lease});
  if (workspaceState.dirtyDiffSha256 !== activation.dirtyDiffSha256 || !exactJson(workspaceState.dirtyPaths, activation.dirtyPaths)) throw new RecoveryError('CONFLICT', ['DIRTY_DIFF_IDENTITY_DRIFT']);
  deps.readRemoteHead(lease);
  deps.readPrState(lease.workspace.branch);
  return workspaceState;
}
function findOldManifest(activation, manifests) {
  const matches = manifests.filter((row) => row.manifest.manifestId === activation.oldManifestId && row.manifest.payloadSha256 === activation.oldManifestPayloadSha256);
  if (matches.length !== 1) throw new RecoveryError(matches.length ? 'CONFLICT' : 'BLOCKED', [matches.length ? 'OLD_MANIFEST_AMBIGUOUS' : 'OLD_MANIFEST_MISSING']);
  return matches[0];
}
function findRebindManifest(activation, manifests) {
  if (!activation.rebindManifestId) return null;
  const matches = manifests.filter((row) => row.manifest.manifestId === activation.rebindManifestId && row.manifest.payloadSha256 === activation.rebindManifestPayloadSha256);
  if (matches.length !== 1) throw new RecoveryError(matches.length ? 'CONFLICT' : 'UNKNOWN', [matches.length ? 'REBIND_MANIFEST_AMBIGUOUS' : 'REBIND_MANIFEST_MISSING']);
  const m = matches[0].manifest;
  if (m.packetBodySha256 !== activation.packetBodySha256 || m.leaseEvidence?.leaseId !== activation.leaseId
      || m.leaseEvidence?.acquiredGeneration !== activation.reacquireGeneration
      || m.leaseEvidence?.acquireEvidenceRef !== activation.reacquireEvidenceRef
      || m.phaseId !== packetNumber(activation.targetPacketRef) + '-implementation-pr-recovery-rebind-g' + activation.reacquireGeneration
      || !exactJson(m.scopes, activation.scopes) || !exactJson(m.workspace, activation.workspace)
      || m.observedBaseSha !== activation.observedBaseSha) {
    throw new RecoveryError('CONFLICT', ['REBIND_MANIFEST_ACQUISITION_CONFLICT']);
  }
  return matches[0];
}
function exactLeaseProfile(lease, activation) {
  return lease
    && lease.packetRef === activation.targetPacketRef
    && lease.packetBodySha256 === activation.packetBodySha256
    && lease.route === 'L'
    && lease.executor === 'L'
    && exactJson(lease.scopes, activation.scopes)
    && exactJson(lease.workspace, activation.workspace)
    && lease.observedBaseSha === activation.observedBaseSha
    && lease.leaseId === activation.leaseId;
}
function readProgress(activationInput, depsInput = {}) {
  const deps = defaultDeps(depsInput);
  const activation = normalizeActivation(activationInput);
  const targetNumber = packetNumber(activation.targetPacketRef);
  const authority = verifyContinuationAuthority(activation, deps);
  const packet = readPacketContext(targetNumber, deps);
  if (packet.packetBodySha256 !== activation.packetBodySha256 || !exactJson(packet.scopes, activation.scopes)) throw new RecoveryError('CONFLICT', ['TARGET_PACKET_DRIFT']);
  const ledger = readLedgerState(deps);
  const active = ledger.state.activeLeases.filter((row) => row.packetRef === activation.targetPacketRef);
  if (active.length > 1) throw new RecoveryError('CONFLICT', ['TARGET_ACTIVE_LEASE_DUPLICATE']);
  const currentLease = active[0] || null;
  if (currentLease && !exactLeaseProfile(currentLease, activation)) throw new RecoveryError('CONFLICT', ['TARGET_ACTIVE_LEASE_PROFILE_CONFLICT']);
  const manifests = manifestsForActivation(targetNumber, deps);
  const oldManifest = findOldManifest(activation, manifests);
  const holder = holderStateFor(activation.workspace);
  if (holder.state === 'PRESENT_EXACT' && (holder.leaseId !== activation.leaseId || holder.manifestId !== activation.oldManifestId)) throw new RecoveryError('CONFLICT', ['HOLDER_IDENTITY_CONFLICT']);
  const syntheticLease = currentLease || {
    leaseId: activation.leaseId,
    packetRef: activation.targetPacketRef,
    packetBodySha256: activation.packetBodySha256,
    route: 'L',
    executor: 'L',
    scopes: activation.scopes,
    workspace: activation.workspace,
    observedBaseSha: activation.observedBaseSha,
  };
  const workspaceState = verifyPreservedState(activation, syntheticLease, deps);
  const rebindManifest = findRebindManifest(activation, manifests);
  if (rebindManifest) {
    if (!Number.isSafeInteger(activation.handoffCommentId)) throw new RecoveryError('UNKNOWN', ['REBIND_HANDOFF_EVIDENCE_MISSING']);
    const expected = deps.renderHandoff(rebindManifest.manifest).trim();
    const handoff = deps.readComments(targetNumber).filter((row) => row.id === activation.handoffCommentId);
    if (handoff.length !== 1) throw new RecoveryError('UNKNOWN', ['REBIND_HANDOFF_COMMENT_MISSING']);
    if (String(handoff[0].body || '').trim() !== expected) throw new RecoveryError('CONFLICT', ['REBIND_HANDOFF_COMMENT_DRIFT']);
  }
  return {activation, authority, packet, ledger, currentLease, oldManifest: oldManifest.manifest, holder, workspace: workspaceState, rebindManifest: rebindManifest?.manifest || null};
}
function stateName(progress) {
  const a = progress.activation;
  const active = Boolean(progress.currentLease);
  const holder = progress.holder.state;
  const hasRebind = Boolean(progress.rebindManifest);
  if (active && a.releaseGeneration === null && holder === 'PRESENT_EXACT') return 'OLD_ACTIVE';
  if (!active && holder === 'PRESENT_EXACT') return 'OLD_RELEASED_HOLDER_PRESENT';
  if (!active && holder === 'ABSENT') return 'OLD_CLEANED_NO_LEASE';
  if (active && a.releaseGeneration !== null && holder === 'ABSENT' && !hasRebind) return 'REACQUIRED_NO_MANIFEST';
  if (active && a.releaseGeneration !== null && holder === 'ABSENT' && hasRebind) return 'RECOVERY_REBOUND';
  return 'CONFLICT';
}
function requireOwnerBinding(progress) {
  const state = stateName(progress);
  if (state === 'CONFLICT') throw new RecoveryError('CONFLICT', ['RECOVERY_STATE_CONFLICT']);
  return state;
}
function updateEvidenceRef(dispatch, operation, leaseId) {
  const evidenceRef = evidenceRefForDispatch(dispatch, operation, leaseId);
  if (!Number.isSafeInteger(dispatch?.observedGeneration) || !evidenceRef) throw new RecoveryError('UNKNOWN', ['D013_' + operation.toUpperCase() + '_EVIDENCE_UNPROVEN']);
  return {generation: dispatch.observedGeneration, evidenceRef};
}
function expectedGenerationForPlan(plan, noopReason) {
  return plan.reasonCodes?.includes(noopReason) ? plan.ledgerGeneration : plan.ledgerGeneration + 1;
}
async function releaseStep(progress, deps) {
  let a = progress.activation;
  if (a.releaseDispatchStarted) throw new RecoveryError('UNKNOWN', ['D013_RELEASE_DISPATCH_ALREADY_STARTED']);
  const plan = await deps.planRelease(a.targetPacketRef, a.leaseId);
  if (plan?.status !== 'PLAN_READY' || !Number.isSafeInteger(plan.ledgerGeneration) || plan.leaseId !== a.leaseId) throw new RecoveryError(plan?.status === 'CONFLICT' ? 'CONFLICT' : plan?.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED', plan?.reasonCodes || ['D013_RELEASE_PLAN_NOT_READY']);
  a = deps.updateActivation(a, {releasePlanGeneration: plan.ledgerGeneration, releaseExpectedGeneration: expectedGenerationForPlan(plan, 'LEASE_ALREADY_RELEASED'), releaseDispatchStarted: true});
  const dispatched = await deps.dispatch(plan);
  if (!['DISPATCH_COMPLETE', 'DISPATCH_READBACK_COMPLETE'].includes(dispatched?.status)) throw new RecoveryError('UNKNOWN', dispatched?.reasonCodes || ['D013_RELEASE_DISPATCH_UNPROVEN']);
  const evidence = updateEvidenceRef(dispatched, 'release', a.leaseId);
  return deps.updateActivation(a, {releaseGeneration: evidence.generation, releaseEvidenceRef: evidence.evidenceRef});
}
function recoverReleaseEvidence(progress, deps) {
  const a = progress.activation;
  if (a.releaseGeneration !== null) return a;
  if (!a.releaseDispatchStarted || a.releaseExpectedGeneration === null) return a;
  if (progress.currentLease) throw new RecoveryError('UNKNOWN', ['D013_RELEASE_DISPATCH_UNRESOLVED']);
  const last = progress.ledger.state.lastRelease;
  if (!last || last.leaseId !== a.leaseId || last.releasedAtGeneration !== a.releaseExpectedGeneration || progress.ledger.state.generation !== a.releaseExpectedGeneration) throw new RecoveryError('UNKNOWN', ['D013_RELEASE_LOST_ACK_UNPROVEN']);
  return deps.updateActivation(a, {
    releaseGeneration: a.releaseExpectedGeneration,
    releaseEvidenceRef: 'receipt:mcl-task-lease-readback:release:' + a.leaseId + ':generation:' + a.releaseExpectedGeneration,
  });
}
function cleanupStep(progress, deps, reader = readProgress) {
  const fresh = reader(progress.activation, deps);
  if (fresh.currentLease) throw new RecoveryError('BLOCKED', ['D013_REACQUIRED_BEFORE_HOLDER_CLEANUP']);
  if (fresh.holder.state === 'ABSENT') return;
  if (fresh.holder.state !== 'PRESENT_EXACT') throw new RecoveryError('CONFLICT', ['HOLDER_STATE_CONFLICT']);
  const result = deps.cleanupStale(fresh.oldManifest, fresh.ledger.issue.body, fresh.packet.issue.body);
  if (result?.status !== 'STALE_CLEANED') throw new RecoveryError('BLOCKED', result?.reasonCodes || ['HOLDER_STALE_CLEANUP_FAILED']);
}
async function acquireStep(progress, deps) {
  let a = progress.activation;
  if (a.acquireDispatchStarted) throw new RecoveryError('UNKNOWN', ['D013_ACQUIRE_DISPATCH_ALREADY_STARTED']);
  const plan = await deps.planAcquire({
    packetRef: a.targetPacketRef,
    route: 'L',
    executor: 'L',
    scopes: a.scopes,
    scopeDisposition: 'DISJOINT',
    workspaceKind: 'repository',
    branch: a.workspace.branch,
    worktree: a.workspace.worktree,
    observedBaseSha: a.observedBaseSha,
  });
  if (plan?.status !== 'PLAN_READY' || !Number.isSafeInteger(plan.ledgerGeneration) || plan.leaseId !== a.leaseId) throw new RecoveryError(plan?.status === 'CONFLICT' ? 'CONFLICT' : plan?.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED', plan?.reasonCodes || ['D013_ACQUIRE_PLAN_NOT_READY']);
  a = deps.updateActivation(a, {acquirePlanGeneration: plan.ledgerGeneration, acquireExpectedGeneration: expectedGenerationForPlan(plan, 'LEASE_ALREADY_ACTIVE'), acquireDispatchStarted: true});
  const dispatched = await deps.dispatch(plan);
  if (!['DISPATCH_COMPLETE', 'DISPATCH_READBACK_COMPLETE'].includes(dispatched?.status)) throw new RecoveryError('UNKNOWN', dispatched?.reasonCodes || ['D013_ACQUIRE_DISPATCH_UNPROVEN']);
  const evidence = updateEvidenceRef(dispatched, 'acquire', a.leaseId);
  return deps.updateActivation(a, {reacquireGeneration: evidence.generation, reacquireEvidenceRef: evidence.evidenceRef});
}
function recoverAcquireEvidence(progress, deps) {
  const a = progress.activation;
  if (a.reacquireGeneration !== null) return a;
  if (!a.acquireDispatchStarted || a.acquireExpectedGeneration === null) return a;
  if (!progress.currentLease) throw new RecoveryError('UNKNOWN', ['D013_ACQUIRE_DISPATCH_UNRESOLVED']);
  if (progress.ledger.state.generation !== a.acquireExpectedGeneration) throw new RecoveryError('UNKNOWN', ['D013_ACQUIRE_LOST_ACK_UNPROVEN']);
  return deps.updateActivation(a, {
    reacquireGeneration: a.acquireExpectedGeneration,
    reacquireEvidenceRef: 'receipt:mcl-task-lease-readback:acquire:' + a.leaseId + ':generation:' + a.acquireExpectedGeneration,
  });
}
function publishRebind(progress, deps, reader = readProgress) {
  const a = progress.activation;
  const fresh = reader(a, deps);
  if (!fresh.currentLease || a.reacquireGeneration === null || !a.reacquireEvidenceRef
      || fresh.ledger.state.generation < a.reacquireGeneration) {
    throw new RecoveryError('BLOCKED', ['D013_REACQUIRE_EVIDENCE_REQUIRED']);
  }
  const manifest = deps.buildManifest({
    activation: a,
    issueBody: fresh.packet.issue.body,
    lease: fresh.currentLease,
    acquiredGeneration: a.reacquireGeneration,
    acquireEvidenceRef: a.reacquireEvidenceRef,
    mainSha: fresh.authority.mainSha,
  });
  const manifestText = deps.renderManifest(manifest);
  const samePhase = manifestsForActivation(fresh.packet.packetNumber, deps).filter((row) => row.manifest.phaseId === manifest.phaseId);
  if (samePhase.some((row) => row.manifest.manifestId !== manifest.manifestId)) throw new RecoveryError('CONFLICT', ['REBIND_MANIFEST_VARIANT_PRESENT']);
  const manifestCommentId = postOnce(fresh.packet.packetNumber, manifestText, deps);
  const handoffCommentId = postOnce(fresh.packet.packetNumber, deps.renderHandoff(manifest), deps);
  return deps.updateActivation(a, {
    rebindManifestId: manifest.manifestId,
    rebindManifestPayloadSha256: manifest.payloadSha256,
    manifestCommentId,
    handoffCommentId,
  });
}
async function executeApply(args, depsInput = {}) {
  const deps = defaultDeps(depsInput);
  let packet = readPacketContext(args.targetPacketNumber, deps);
  let manifests = manifestsForActivation(args.targetPacketNumber, deps);
  let activation = deps.findActivation(args.targetPacketRef, manifests, packet);
  let initial = activation ? null : await inspectInitial(args.targetPacketNumber, deps);
  const workspace = activation?.workspace || initial.lease.workspace;
  const lock = await deps.acquireActivationLock(workspace);
  try {
    packet = readPacketContext(args.targetPacketNumber, deps);
    manifests = manifestsForActivation(args.targetPacketNumber, deps);
    activation = deps.findActivation(args.targetPacketRef, manifests, packet);
    if (!activation) {
      initial = await inspectInitial(args.targetPacketNumber, deps);
      activation = deps.writeActivation(buildActivation(initial));
    }
    for (let guard = 0; guard < 8; guard += 1) {
      deps.assertActivationLock(lock);
      let progress = readProgress(activation, deps);
      let recovered = recoverReleaseEvidence(progress, deps);
      if (recovered.recordDigest !== activation.recordDigest) {
        activation = recovered; progress = readProgress(activation, deps);
      }
      recovered = recoverAcquireEvidence(progress, deps);
      if (recovered.recordDigest !== activation.recordDigest) {
        activation = recovered; progress = readProgress(activation, deps);
      }
      const state = requireOwnerBinding(progress);
      if (state === 'RECOVERY_REBOUND') {
        if (progress.holder.state !== 'ABSENT') throw new RecoveryError('CONFLICT', ['NEW_HOLDER_MUST_BE_ABSENT']);
        return output('PASS', [], {
          targetPacketRef: activation.targetPacketRef,
          recoveryState: 'RECOVERY_REBOUND',
          oldLeaseId: activation.leaseId,
          newLeaseId: activation.leaseId,
          releasedGeneration: activation.releaseGeneration,
          reacquiredGeneration: activation.reacquireGeneration,
          rebindManifestId: activation.rebindManifestId,
          manifestCommentId: activation.manifestCommentId,
          handoffCommentId: activation.handoffCommentId,
          dirtyDiffSha256: activation.dirtyDiffSha256,
          dirtyPathCount: activation.dirtyPaths.length,
          holderState: 'ABSENT',
          nextLegalAction: 'TARGET_PACKET_IMPLEMENTATION_CONTINUE_WITH_FRESH_HOLDER',
        });
      }
      if (state === 'OLD_ACTIVE') {
        await deps.revalidateReleaseAdmission(activation);
        activation = await releaseStep(progress, deps);
        continue;
      }
      if (state === 'OLD_RELEASED_HOLDER_PRESENT') { cleanupStep(progress, deps); continue; }
      if (state === 'OLD_CLEANED_NO_LEASE') { activation = await acquireStep(progress, deps); continue; }
      if (state === 'REACQUIRED_NO_MANIFEST') { activation = publishRebind(progress, deps); continue; }
      throw new RecoveryError('UNKNOWN', ['RECOVERY_PROGRESS_UNRESOLVED']);
    }
    throw new RecoveryError('UNKNOWN', ['RECOVERY_PROGRESS_GUARD_EXHAUSTED']);
  } finally {
    await deps.releaseActivationLock(lock);
  }
}
async function executeInspect(args, depsInput = {}) {
  const deps = defaultDeps(depsInput);
  const packet = readPacketContext(args.targetPacketNumber, deps);
  const manifests = manifestsForActivation(args.targetPacketNumber, deps);
  const activation = deps.findActivation(args.targetPacketRef, manifests, packet);
  if (!activation) {
    const initial = await inspectInitial(args.targetPacketNumber, deps);
    return output('PASS', [], {
      targetPacketRef: initial.packetRef,
      recoveryState: 'RECOVERY_REBIND_READY',
      classificationDigest: initial.classification.output.classificationDigest,
      dirtyDiffSha256: initial.workspace.dirtyDiffSha256,
      dirtyPathCount: initial.workspace.dirtyPaths.length,
      holderState: 'PRESENT_EXACT',
      nextLegalAction: 'APPLY_RECOVERY_REBIND',
    });
  }
  const progress = readProgress(activation, deps);
  const state = requireOwnerBinding(progress);
  return output(state === 'RECOVERY_REBOUND' ? 'PASS' : 'BLOCKED', [], {
    targetPacketRef: activation.targetPacketRef,
    recoveryState: state,
    classificationDigest: activation.classificationDigest,
    dirtyDiffSha256: activation.dirtyDiffSha256,
    dirtyPathCount: activation.dirtyPaths.length,
    holderState: progress.holder.state,
    nextLegalAction: state === 'RECOVERY_REBOUND' ? 'TARGET_PACKET_IMPLEMENTATION_CONTINUE_WITH_FRESH_HOLDER' : 'APPLY_RECOVERY_REBIND',
  });
}
function exitCodeFor(status) {
  if (status === 'PASS') return 0;
  if (status === 'UNKNOWN') return 3;
  return 2;
}
async function runCli(argv = process.argv.slice(2), deps = {}) {
  try {
    const args = parseArgs(argv);
    const result = args.operation === 'apply' ? await executeApply(args, deps) : await executeInspect(args, deps);
    return {code: exitCodeFor(result.status), text: JSON.stringify(result) + '\n'};
  } catch (error) {
    const kind = error instanceof RecoveryError ? error.kind : 'UNKNOWN';
    const reasons = error instanceof RecoveryError ? error.reasonCodes : ['UNEXPECTED_ERROR'];
    const value = output(kind, reasons, {nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED'});
    return {code: exitCodeFor(kind), text: JSON.stringify(value) + '\n'};
  }
}
if (require.main === module) {
  runCli().then(({code, text}) => {
    process.stdout.write(text);
    process.exitCode = code;
  });
}
module.exports = {
  ACTIVATION_FILE,
  ACTIVATION_LOCK_FILE,
  ACTIVATION_MODE,
  FALSE_AUTHORITY,
  MODE,
  OWNER_BLOB_PATHS,
  OWNER_PACKET_REF,
  REPO,
  SCHEMA,
  RecoveryError,
  acquireStep,
  acquireActivationLock,
  assertActivationLock,
  activationLockPath,
  buildActivation,
  buildRebindManifest,
  cleanupStep,
  buildRecoveryInput,
  captureWorkspace,
  defaultDeps,
  evidenceRefForDispatch,
  expectedGenerationForPlan,
  exactCommentState,
  exactLeaseProfile,
  executeApply,
  executeInspect,
  exitCodeFor,
  findActivation,
  findOldManifest,
  findRebindManifest,
  holderStateFor,
  inspectInitial,
  normalizeActivation,
  output,
  packetNumber,
  parseArgs,
  postOnce,
  publishRebind,
  readProgress,
  revalidateReleaseAdmission,
  runCli,
  recoverAcquireEvidence,
  recoverReleaseEvidence,
  releaseStep,
  releaseActivationLock,
  renderHandoff,
  sha256,
  stateName,
  updateActivation,
};
