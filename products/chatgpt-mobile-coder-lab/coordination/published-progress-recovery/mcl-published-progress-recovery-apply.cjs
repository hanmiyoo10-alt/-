'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const REPO = 'hanmiyoo10-alt/-';
const LEDGER_ISSUE = 2352;
const LEASE_WORKFLOW = 'mcl-task-lease.yml';
const PACKET_RE = /^#([1-9][0-9]*)$/;
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const MAX_PAGES = 5;
const PAGE_SIZE = 100;
const MAX_RUNS = 40;

const inspector = require('./mcl-published-progress-recovery-inspect.cjs');
const taskLease = require('../task-lease.cjs');
const handoff = require('../task-handoff.cjs');
const holder = require('../mcl-workspace-holder.cjs');
const operator = require('../mcl-coordination-operator.cjs');
const scopeOverlap = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs'));
const executionReceipt = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs'));
const agentDecisionView = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-harness/agent-decision-view.cjs'));

const FALSE_AUTHORITY = Object.freeze({
  mutationAuthorized: false,
  executionAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
  runtimeAuthorityGranted: false,
  securityAuthorityGranted: false,
});

class EffectError extends Error {
  constructor(kind, reasonCodes, locator = null) {
    const unique = [...new Set(reasonCodes)].sort();
    super(unique[0] || kind);
    this.kind = kind;
    this.reasonCodes = unique;
    this.locator = locator;
  }
}
function fail(kind, ...reasonCodes) {
  throw new EffectError(kind, reasonCodes);
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function sha256(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(stable(value));
  return crypto.createHash('sha256').update(text).digest('hex');
}
function unique(values) {
  return [...new Set((values || []).filter(Boolean))].sort();
}
function sameArray(left, right) {
  return JSON.stringify([...(left || [])].sort()) === JSON.stringify([...(right || [])].sort());
}
function commandResult(command, args, {cwd = ROOT, input = null, env = process.env} = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd, input, env, encoding: 'utf8', shell: false, maxBuffer: 16 * 1024 * 1024,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}
function runGit(args, cwd = ROOT, runner = commandResult) {
  return runner('git', args, {cwd});
}
function runGh(args, runner = commandResult, options = {}) {
  return runner('gh', args, {cwd: ROOT, input: options.input || null});
}
function ghJson(endpoint, runner = commandResult, options = {}) {
  const args = ['api', endpoint, '--method', options.method || 'GET',
    '--header', 'Accept: application/vnd.github+json'];
  if (options.body !== undefined) args.push('--input', '-');
  const result = runGh(args, runner, {
    input: options.body === undefined ? null : JSON.stringify(options.body),
  });
  if (result.code !== 0) fail('UNKNOWN', options.write ? 'GITHUB_WRITE_FAILED' : 'GITHUB_READ_FAILED');
  try { return JSON.parse(result.stdout || 'null'); }
  catch { fail('UNKNOWN', 'GITHUB_JSON_INVALID'); }
}
function readIssue(number, runner = commandResult) {
  const issue = ghJson('repos/' + REPO + '/issues/' + number, runner);
  if (!issue || issue.pull_request || typeof issue.body !== 'string') fail('UNKNOWN', 'PACKET_READ_INVALID');
  return issue;
}
function readComments(number, runner = commandResult) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const value = ghJson('repos/' + REPO + '/issues/' + number
      + '/comments?per_page=' + PAGE_SIZE + '&page=' + page, runner);
    if (!Array.isArray(value)) fail('UNKNOWN', 'COMMENT_READ_INVALID');
    rows.push(...value);
    if (value.length < PAGE_SIZE) return {complete: true, rows};
  }
  return {complete: false, rows};
}
function readPr(number, runner = commandResult) {
  const value = ghJson('repos/' + REPO + '/pulls/' + number, runner);
  if (!value || value.number !== number) fail('UNKNOWN', 'PR_READ_INVALID');
  return value;
}
function readPrFiles(number, runner = commandResult) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const value = ghJson('repos/' + REPO + '/pulls/' + number
      + '/files?per_page=' + PAGE_SIZE + '&page=' + page, runner);
    if (!Array.isArray(value)) fail('UNKNOWN', 'PR_FILES_READ_INVALID');
    rows.push(...value);
    if (value.length < PAGE_SIZE) return {complete: true, rows};
  }
  return {complete: false, rows};
}
function readDirectMain(runner = commandResult) {
  const value = ghJson('repos/' + REPO + '/git/ref/heads/main', runner);
  const sha = value?.object?.sha;
  if (!SHA40_RE.test(sha || '')) fail('UNKNOWN', 'DIRECT_MAIN_IDENTITY_UNKNOWN');
  return sha;
}
function opsHealthy(body, mainSha) {
  return typeof body === 'string'
    && body.includes('- STATE: `CLEAR`')
    && body.includes('- MAIN: `' + mainSha + '` / Required PASS')
    && body.includes('- UNKNOWN: NONE');
}
function readMainOpsBarrier(runner = commandResult) {
  const before = readDirectMain(runner);
  const ops = readIssue(485, runner);
  const after = readDirectMain(runner);
  if (before !== after) fail('UNKNOWN', 'DIRECT_MAIN_DRIFT');
  if (!opsHealthy(ops.body, before)) fail('UNKNOWN', 'OPS_CURRENTNESS_UNKNOWN');
  return before;
}
function commonGitDir(runner = commandResult) {
  const result = runGit(['rev-parse', '--git-common-dir'], ROOT, runner);
  if (result.code !== 0) fail('UNKNOWN', 'GIT_COMMON_DIR_UNRESOLVED');
  const raw = result.stdout.trim();
  const resolved = path.resolve(ROOT, raw);
  let stat;
  try { stat = fs.lstatSync(resolved); } catch { fail('UNKNOWN', 'GIT_COMMON_DIR_MISSING'); }
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('CONFLICT', 'GIT_COMMON_DIR_INVALID');
  return resolved;
}
function activationPath(packetNumber, runner = commandResult) {
  return path.join(commonGitDir(runner), 'published-progress-recovery-effect',
    'packet-' + packetNumber + '.activation.json');
}
function activationCore(admission) {
  const observation = admission.observation;
  const lease = observation.leaseRead.lease;
  const manifest = observation.manifestRead.manifest;
  const prLocator = observation.prRead.locator || '';
  const prMatch = /^pr:#([1-9][0-9]*)$/.exec(prLocator);
  if (!lease || !manifest || !prMatch || !SHA40_RE.test(observation.gitRead.head || '')) {
    fail('UNKNOWN', 'ADMISSION_IDENTITY_INCOMPLETE');
  }
  if (manifest.phaseClass !== 'VALIDATION' || manifest.phaseId !== 'validation-merge') {
    fail('CONFLICT', 'OLD_VALIDATION_MANIFEST_PHASE_CONFLICT');
  }
  return {
    schemaVersion: 1,
    mode: 'MCL_PUBLISHED_PROGRESS_RECOVERY_ACTIVATION',
    packetRef: observation.packet.packetRef,
    packetBodySha256: observation.packet.digest,
    scopes: observation.packet.scopes,
    pathScopes: observation.packet.pathScopes,
    route: lease.route,
    executor: lease.executor,
    workspace: lease.workspace,
    oldLeaseId: lease.leaseId,
    oldObservedBaseSha: lease.observedBaseSha,
    oldManifest: manifest,
    prNumber: Number(prMatch[1]),
    preservedHead: observation.gitRead.head,
  };
}
function buildActivation(admission) {
  if (admission?.decision?.result !== 'PASS'
      || admission?.decision?.recoveryDisposition !== 'PUBLISHED_PROGRESS_REBIND_ELIGIBLE'
      || admission?.decision?.nextLegalAction !== 'PUBLISHED_PROGRESS_RECOVERY_EFFECT_REVIEW') {
    fail('BLOCKED', 'PUBLISHED_PROGRESS_ADMISSION_NOT_ELIGIBLE');
  }
  const core = activationCore(admission);
  const transactionId = sha256([
    core.packetRef, 'VALIDATION_MERGE', core.oldLeaseId,
    core.oldManifest.manifestId, String(core.prNumber), core.preservedHead,
  ].join('\n'));
  const value = {...core, transactionId};
  return {...value, activationDigest: sha256(value)};
}
function verifyActivation(value) {
  if (!value || value.schemaVersion !== 1
      || value.mode !== 'MCL_PUBLISHED_PROGRESS_RECOVERY_ACTIVATION'
      || !PACKET_RE.test(value.packetRef || '')
      || !SHA256_RE.test(value.packetBodySha256 || '')
      || !SHA256_RE.test(value.oldLeaseId || '')
      || !SHA40_RE.test(value.oldObservedBaseSha || '')
      || !Number.isSafeInteger(value.prNumber) || value.prNumber < 1
      || !SHA40_RE.test(value.preservedHead || '')
      || !SHA256_RE.test(value.transactionId || '')
      || !SHA256_RE.test(value.activationDigest || '')
      || !Array.isArray(value.scopes) || !Array.isArray(value.pathScopes)
      || !value.workspace || typeof value.workspace !== 'object') {
    return {ok: false, reasonCodes: ['ACTIVATION_SCHEMA_INVALID']};
  }
  const manifest = handoff.verifyManifestObject(value.oldManifest);
  if (!manifest.ok) return {ok: false, reasonCodes: ['ACTIVATION_OLD_MANIFEST_INVALID']};
  if (manifest.value.manifestId !== value.oldManifest.manifestId
      || manifest.value.leaseEvidence?.leaseId !== value.oldLeaseId
      || manifest.value.packetRef !== value.packetRef
      || manifest.value.packetBodySha256 !== value.packetBodySha256
      || manifest.value.observedBaseSha !== value.oldObservedBaseSha
      || !sameArray(manifest.value.scopes, value.scopes)
      || JSON.stringify(manifest.value.workspace) !== JSON.stringify(value.workspace)) {
    return {ok: false, reasonCodes: ['ACTIVATION_IDENTITY_CONFLICT']};
  }
  const expectedTransactionId = sha256([
    value.packetRef, 'VALIDATION_MERGE', value.oldLeaseId,
    value.oldManifest.manifestId, String(value.prNumber), value.preservedHead,
  ].join('\n'));
  if (value.transactionId !== expectedTransactionId) {
    return {ok: false, reasonCodes: ['ACTIVATION_TRANSACTION_ID_CONFLICT']};
  }
  const {activationDigest, ...core} = value;
  if (sha256(core) !== activationDigest) {
    return {ok: false, reasonCodes: ['ACTIVATION_DIGEST_CONFLICT']};
  }
  return {ok: true, reasonCodes: [], value: {...core, activationDigest}};
}
function readActivation(packetNumber, runner = commandResult) {
  const file = activationPath(packetNumber, runner);
  let stat;
  try { stat = fs.lstatSync(file); } catch (error) {
    if (error.code === 'ENOENT') return null;
    fail('UNKNOWN', 'ACTIVATION_READ_FAILED');
  }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 64 * 1024) {
    fail('CONFLICT', 'ACTIVATION_FILE_INVALID');
  }
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { fail('UNKNOWN', 'ACTIVATION_JSON_INVALID'); }
  const verified = verifyActivation(value);
  if (!verified.ok) fail('CONFLICT', ...verified.reasonCodes);
  return {value: verified.value, file};
}
function writeActivationExact(packetNumber, value, runner = commandResult) {
  const file = activationPath(packetNumber, runner);
  const parent = path.dirname(file);
  fs.mkdirSync(parent, {recursive: true, mode: 0o700});
  fs.chmodSync(parent, 0o700);
  const existing = readActivation(packetNumber, runner);
  if (existing) {
    if (existing.value.activationDigest !== value.activationDigest) {
      fail('CONFLICT', 'ACTIVATION_EXISTING_CONFLICT');
    }
    return existing;
  }
  const text = JSON.stringify(stable(value), null, 2) + '\n';
  let fd;
  try {
    fd = fs.openSync(file, 'wx', 0o600);
    fs.writeFileSync(fd, text, 'utf8');
    fs.fsyncSync(fd);
  } catch (error) {
    if (fd !== undefined) try { fs.closeSync(fd); } catch (_) {}
    if (error.code === 'EEXIST') return writeActivationExact(packetNumber, value, runner);
    fail('UNKNOWN', 'ACTIVATION_WRITE_FAILED');
  }
  fs.closeSync(fd);
  const readback = readActivation(packetNumber, runner);
  if (!readback || readback.value.activationDigest !== value.activationDigest) {
    fail('UNKNOWN', 'ACTIVATION_READBACK_MISSING');
  }
  return readback;
}
async function loadOrAdmit(packetNumber, deps = {}) {
  const runner = deps.runner || commandResult;
  const existing = readActivation(packetNumber, runner);
  if (existing) return existing.value;
  const inspect = deps.inspectPublished || inspector.inspectPacket;
  const admission = await inspect(packetNumber, deps.inspectOptions || {});
  const activation = buildActivation(admission);
  writeActivationExact(packetNumber, activation, runner);
  return activation;
}
function parsePacketExact(activation, runner = commandResult) {
  const number = Number(activation.packetRef.slice(1));
  const packet = inspector.parsePacket(number, readIssue(number, runner));
  if (!packet.exact) fail(
    packet.reasons.some((item) => item.includes('CONFLICT') || item.includes('DRIFT'))
      ? 'CONFLICT' : 'UNKNOWN',
    ...(packet.reasons.length ? packet.reasons : ['PACKET_NOT_EXACT']));
  if (packet.digest !== activation.packetBodySha256 || !sameArray(packet.scopes, activation.scopes)) {
    fail('CONFLICT', 'PACKET_ACTIVATION_DRIFT');
  }
  return packet;
}
function readLedger(runner = commandResult) {
  const issue = readIssue(LEDGER_ISSUE, runner);
  const parsed = taskLease.parseLedger(issue.body || '');
  if (!parsed.ok || parsed.state.status !== 'ACTIVE') fail('UNKNOWN', 'LEDGER_STATE_INVALID');
  return {body: issue.body, state: parsed.state};
}
function freshLeaseProfile(activation, generation) {
  const normalized = taskLease.normalizeAcquireRequest({
    expectedGeneration: generation,
    packetRef: activation.packetRef,
    packetBodySha256: activation.packetBodySha256,
    route: activation.route,
    executor: activation.executor,
    scopes: activation.scopes,
    scopeDisposition: 'DISJOINT',
    workspaceKind: activation.workspace.kind,
    branch: activation.workspace.branch,
    worktree: activation.workspace.worktree,
    observedBaseSha: activation.preservedHead,
  });
  if (!normalized.ok) fail('CONFLICT', ...normalized.reasonCodes);
  return normalized.lease;
}
function exactPrAndWorkspace(activation, runner = commandResult) {
  const pr = readPr(activation.prNumber, runner);
  if (pr.state !== 'open' || pr.draft !== false || pr.base?.ref !== 'main'
      || pr.head?.repo?.full_name !== REPO || pr.head?.ref !== activation.workspace.branch
      || pr.head?.sha !== activation.preservedHead) {
    fail('CONFLICT', 'PRESERVED_PR_IDENTITY_CONFLICT');
  }
  const files = readPrFiles(activation.prNumber, runner);
  if (!files.complete) fail('UNKNOWN', 'PR_FILES_DISCOVERY_PARTIAL');
  const changed = files.rows.map((item) => item?.filename)
    .filter((item) => typeof item === 'string').sort();
  const expected = activation.pathScopes.map((item) => item.slice('path:'.length)).sort();
  if (!sameArray(changed, expected)) fail('CONFLICT', 'PR_CHANGED_PATHS_CONFLICT');
  const cwd = activation.workspace.worktree;
  const branch = runGit(['branch', '--show-current'], cwd, runner);
  const head = runGit(['rev-parse', 'HEAD'], cwd, runner);
  const dirty = runGit(['status', '--porcelain=v1', '--untracked-files=all'], cwd, runner);
  const remote = runGit(['ls-remote', 'origin', 'refs/heads/' + activation.workspace.branch], cwd, runner);
  if ([branch, head, dirty, remote].some((item) => item.code !== 0)) {
    fail('UNKNOWN', 'WORKSPACE_GIT_READ_FAILED');
  }
  if (branch.stdout.trim() !== activation.workspace.branch
      || head.stdout.trim() !== activation.preservedHead
      || dirty.stdout.trim()) {
    fail('CONFLICT', 'WORKSPACE_IDENTITY_OR_CLEANLINESS_CONFLICT');
  }
  const rows = remote.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length !== 1 || rows[0].split(/\s+/)[0] !== activation.preservedHead) {
    fail('CONFLICT', 'REMOTE_HEAD_CONFLICT');
  }
  const descendant = runGit(
    ['merge-base', '--is-ancestor', activation.oldObservedBaseSha, activation.preservedHead],
    cwd, runner);
  if (descendant.code === 1) fail('CONFLICT', 'PUBLISHED_HEAD_DESCENDANT_CONFLICT');
  if (descendant.code !== 0) fail('UNKNOWN', 'PUBLISHED_HEAD_DESCENDANT_UNKNOWN');
  return {pr};
}
function holderState(activation) {
  const workspace = holder.inspectWorkspace(activation.oldManifest);
  if (!workspace.ok || !workspace.holderPath) {
    fail('BLOCKED', ...(workspace.reasonCodes || ['WORKSPACE_INSPECT_FAILED']));
  }
  const read = holder.readHolder(workspace.holderPath);
  if (read.missing) return {state: 'ABSENT', holderPath: workspace.holderPath};
  if (!read.ok) fail('CONFLICT', ...(read.reasonCodes || ['HOLDER_READ_CONFLICT']));
  if (read.value.leaseId !== activation.oldLeaseId
      || read.value.manifestId !== activation.oldManifest.manifestId) {
    fail('CONFLICT', 'HOLDER_IDENTITY_CONFLICT');
  }
  return {state: 'OLD_PRESENT_EXACT', holderPath: workspace.holderPath};
}
function parsedCommentEvidence(packetNumber, runner = commandResult) {
  const read = readComments(packetNumber, runner);
  if (!read.complete) fail('UNKNOWN', 'COMMENT_DISCOVERY_PARTIAL');
  const manifests = [];
  const receipts = [];
  for (const row of read.rows) {
    const body = typeof row?.body === 'string' ? row.body : '';
    if (body.includes(handoff.MANIFEST_START)) {
      const parsed = handoff.parseManifest(body);
      if (parsed.status !== 'VALID') fail(
        parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
        'D014_MANIFEST_INVALID_PRESENT');
      manifests.push({comment: row, value: parsed.value, body});
    }
    if (body.includes(handoff.RECEIPT_START)) {
      const parsed = handoff.parseCompletionReceipt(body);
      if (parsed.status !== 'VALID') fail(
        parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
        'D014_RECEIPT_INVALID_PRESENT');
      receipts.push({comment: row, value: parsed.value, body});
    }
  }
  return {comments: read.rows, manifests, receipts};
}
function oldPartialState(activation, evidence) {
  const rows = evidence.receipts.filter((row) =>
    row.value.manifestId === activation.oldManifest.manifestId);
  if (!rows.length) return {state: 'ABSENT', receipt: null};
  const identities = new Map(rows.map((row) => [
    row.value.receiptId + ':' + row.value.payloadSha256, row.value,
  ]));
  if (identities.size !== 1) fail('CONFLICT', 'OLD_PARTIAL_RECEIPT_CONFLICT');
  const receipt = [...identities.values()][0];
  const cross = handoff.validateReceiptAgainstManifest(receipt, activation.oldManifest);
  if (!cross.ok || receipt.disposition !== 'PARTIAL'
      || receipt.leaseDisposition !== 'RELEASED'
      || receipt.workspaceResult !== 'clean') {
    fail('CONFLICT', 'OLD_PARTIAL_RECEIPT_INVALID');
  }
  return {state: 'EXACT', receipt};
}
function freshManifestState(activation, freshLease, evidence) {
  const recoveryRef = 'receipt:mcl-published-progress-recovery:' + activation.transactionId;
  const rows = evidence.manifests.filter(({value}) =>
    value.packetRef === activation.packetRef
      && value.packetBodySha256 === activation.packetBodySha256
      && value.phaseClass === 'VALIDATION'
      && value.leaseEvidence?.leaseId === freshLease.leaseId
      && value.observedBaseSha === activation.preservedHead
      && sameArray(value.scopes, activation.scopes)
      && JSON.stringify(value.workspace) === JSON.stringify(activation.workspace)
      && value.inputRefs.includes(recoveryRef)
      && value.inputRefs.includes('pr:#' + activation.prNumber)
      && value.inputRefs.includes('commit:' + activation.preservedHead));
  if (!rows.length) return {state: 'ABSENT', manifest: null};
  const identities = new Map(rows.map((row) => [
    row.value.manifestId + ':' + row.value.payloadSha256, row.value,
  ]));
  if (identities.size !== 1) fail('CONFLICT', 'FRESH_MANIFEST_IDENTITY_CONFLICT');
  return {state: 'EXACT', manifest: [...identities.values()][0]};
}
function classifyState(activation, runner = commandResult) {
  parsePacketExact(activation, runner);
  exactPrAndWorkspace(activation, runner);
  const ledger = readLedger(runner);
  const expectedFresh = freshLeaseProfile(activation, ledger.state.generation);
  const samePacket = ledger.state.activeLeases.filter(
    (item) => item.packetRef === activation.packetRef);
  if (samePacket.length > 1) fail('CONFLICT', 'PACKET_ACTIVE_LEASE_DUPLICATE');
  const active = samePacket[0] || null;
  const leaseKind = !active ? 'ABSENT'
    : active.leaseId === activation.oldLeaseId ? 'OLD'
      : active.leaseId === expectedFresh.leaseId ? 'FRESH' : 'CONFLICT';
  if (leaseKind === 'CONFLICT') fail('CONFLICT', 'PACKET_ACTIVE_LEASE_IDENTITY_CONFLICT');
  const holderRead = holderState(activation);
  const evidence = parsedCommentEvidence(Number(activation.packetRef.slice(1)), runner);
  const partial = oldPartialState(activation, evidence);
  const freshManifest = freshManifestState(activation, expectedFresh, evidence);
  if (leaseKind === 'OLD') {
    if (holderRead.state !== 'OLD_PRESENT_EXACT') fail('CONFLICT', 'OLD_LEASE_HOLDER_NOT_EXACT');
    if (partial.state !== 'ABSENT' || freshManifest.state !== 'ABSENT') {
      fail('CONFLICT', 'OLD_LEASE_WITH_LATER_RECOVERY_EVIDENCE');
    }
    return {phase: 'OLD_ACTIVE', ledger, expectedFresh, evidence, partial, freshManifest};
  }
  if (holderRead.state === 'OLD_PRESENT_EXACT') {
    if (leaseKind === 'FRESH') fail('CONFLICT', 'FRESH_LEASE_WITH_OLD_HOLDER');
    return {phase: 'HOLDER_CLEANUP_REQUIRED', ledger, expectedFresh, evidence, partial, freshManifest};
  }
  if (partial.state === 'ABSENT') {
    if (leaseKind === 'FRESH' || freshManifest.state === 'EXACT') {
      fail('CONFLICT', 'FRESH_PROGRESS_BEFORE_OLD_PARTIAL');
    }
    return {phase: 'PARTIAL_RECEIPT_REQUIRED', ledger, expectedFresh, evidence, partial, freshManifest};
  }
  if (leaseKind === 'ABSENT') {
    if (freshManifest.state === 'EXACT') fail('CONFLICT', 'FRESH_MANIFEST_WITHOUT_ACTIVE_LEASE');
    return {phase: 'FRESH_ACQUIRE_REQUIRED', ledger, expectedFresh, evidence, partial, freshManifest};
  }
  if (freshManifest.state === 'ABSENT') {
    return {phase: 'FRESH_MANIFEST_REQUIRED', ledger, expectedFresh, evidence, partial, freshManifest};
  }
  return {phase: 'RECOVERY_REBIND_READY', ledger, expectedFresh, evidence, partial, freshManifest};
}
function runLeaseOwner(args, runner = commandResult) {
  const ownerPath = path.join(
    ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs');
  const result = runner(process.execPath, [ownerPath, ...args], {cwd: ROOT});
  let value;
  try { value = JSON.parse(result.stdout || '{}'); }
  catch { fail('UNKNOWN', 'LEASE_OWNER_OUTPUT_INVALID'); }
  if (result.code !== 0 || !value || typeof value.status !== 'string') {
    fail(value?.status === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      ...(value?.reasonCodes || ['LEASE_OWNER_EFFECT_FAILED']));
  }
  return value;
}
function updatedRunEvidence(operation, leaseId, runner = commandResult) {
  const list = runGh(['run', 'list', '--repo', REPO, '--workflow', LEASE_WORKFLOW,
    '--event', 'workflow_dispatch', '--limit', String(MAX_RUNS), '--json',
    'databaseId,status,conclusion'], runner);
  if (list.code !== 0) fail('UNKNOWN', 'LEASE_RUN_LIST_FAILED');
  let runs;
  try { runs = JSON.parse(list.stdout || '[]'); }
  catch { fail('UNKNOWN', 'LEASE_RUN_LIST_INVALID'); }
  const matches = [];
  for (const run of runs) {
    if (!Number.isSafeInteger(run.databaseId) || run.conclusion !== 'success') continue;
    const logs = runGh(['run', 'view', String(run.databaseId), '--repo', REPO, '--log'], runner);
    if (logs.code !== 0) continue;
    for (const line of logs.stdout.split(/\r?\n/)) {
      const start = line.indexOf('{');
      const end = line.lastIndexOf('}');
      if (start < 0 || end <= start) continue;
      let value;
      try { value = JSON.parse(line.slice(start, end + 1)); } catch { continue; }
      if (value.leaseId !== leaseId || value.status !== operation.toUpperCase() + '_UPDATED') continue;
      if (!Number.isSafeInteger(value.generation)) fail('UNKNOWN', 'LEASE_RUN_GENERATION_INVALID');
      matches.push({runId: run.databaseId, generation: value.generation});
    }
  }
  const byRun = new Map(matches.map((item) => [item.runId, item]));
  if (byRun.size === 0) fail('UNKNOWN', 'LEASE_UPDATED_RUN_EVIDENCE_MISSING');
  if (byRun.size > 1) fail('CONFLICT', 'LEASE_UPDATED_RUN_EVIDENCE_AMBIGUOUS');
  return [...byRun.values()][0];
}
async function requireReAdmission(activation, deps = {}) {
  const inspect = deps.inspectPublished || inspector.inspectPacket;
  const result = await inspect(Number(activation.packetRef.slice(1)), deps.inspectOptions || {});
  if (result?.decision?.result !== 'PASS'
      || result?.decision?.recoveryDisposition !== 'PUBLISHED_PROGRESS_REBIND_ELIGIBLE'
      || result?.observation?.leaseRead?.lease?.leaseId !== activation.oldLeaseId
      || result?.observation?.manifestRead?.manifest?.manifestId !== activation.oldManifest.manifestId
      || result?.observation?.gitRead?.head !== activation.preservedHead
      || result?.observation?.prRead?.locator !== 'pr:#' + activation.prNumber) {
    fail('BLOCKED', 'PUBLISHED_PROGRESS_READMISSION_CHANGED');
  }
}
async function releaseOld(activation, deps = {}) {
  await requireReAdmission(activation, deps);
  const runLease = deps.runLease || runLeaseOwner;
  const value = runLease([
    'lease-release', '--repo', REPO, '--packet', activation.packetRef,
    '--lease-id', activation.oldLeaseId, '--dispatch',
  ], deps.runner || commandResult);
  if (value.status !== 'DISPATCH_COMPLETE' || value.runConclusion !== 'success') {
    fail('BLOCKED', 'OLD_LEASE_RELEASE_NOT_PROVEN');
  }
  return value;
}
function cleanupOldHolder(activation, state, deps = {}) {
  if (state.ledger.state.activeLeases.some((item) => item.leaseId === activation.oldLeaseId)) {
    fail('BLOCKED', 'OLD_LEASE_STILL_ACTIVE');
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-published-progress-recovery-'));
  const manifestPath = path.join(dir, 'manifest.md');
  const ledgerPath = path.join(dir, 'ledger.md');
  try {
    fs.writeFileSync(manifestPath, handoff.renderManifest(activation.oldManifest), {mode: 0o600});
    fs.writeFileSync(ledgerPath, state.ledger.body, {mode: 0o600});
    const result = (deps.cleanupStale || holder.cleanupStale)({
      manifestPath, ledgerPath, packetPath: null,
    });
    if (result.status !== 'STALE_CLEANED') {
      fail('BLOCKED', ...(result.reasonCodes || ['HOLDER_CLEANUP_FAILED']));
    }
    return result;
  } finally {
    try { fs.rmSync(dir, {recursive: true, force: true}); } catch (_) {}
  }
}
function postExactSemantic(packetNumber, body, identity, deps = {}) {
  const runner = deps.runner || commandResult;
  const before = readComments(packetNumber, runner);
  if (!before.complete) fail('UNKNOWN', 'COMMENT_DISCOVERY_PARTIAL');
  const classify = (row) => {
    const text = typeof row?.body === 'string' ? row.body : '';
    if (!text.includes(identity.marker)) return null;
    const parsed = identity.parse(text);
    if (parsed.status !== 'VALID') fail(
      parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      identity.invalidReason);
    return identity.key(parsed.value);
  };
  const existingKeys = before.rows.map(classify).filter(Boolean);
  const targetKey = identity.key(identity.parse(body).value);
  const conflicting = existingKeys.filter((key) => key.slot === targetKey.slot
    && key.semantic !== targetKey.semantic);
  if (conflicting.length) fail('CONFLICT', identity.conflictReason);
  if (existingKeys.some((key) => key.semantic === targetKey.semantic)) {
    return {written: 0, reused: 1, lostAckRecovered: false};
  }
  const posted = runGh([
    'api', 'repos/' + REPO + '/issues/' + packetNumber + '/comments',
    '--method', 'POST', '--header', 'Accept: application/vnd.github+json',
    '--input', '-',
  ], runner, {input: JSON.stringify({body})});
  const after = readComments(packetNumber, runner);
  if (!after.complete) fail('UNKNOWN', 'COMMENT_DISCOVERY_PARTIAL');
  const afterKeys = after.rows.map(classify).filter(Boolean);
  if (afterKeys.some((key) => key.semantic === targetKey.semantic)) {
    return {written: 1, reused: 0, lostAckRecovered: posted.code !== 0};
  }
  if (posted.code !== 0) fail('UNKNOWN', 'COMMENT_WRITE_ACK_UNKNOWN');
  fail('UNKNOWN', 'COMMENT_WRITE_READBACK_MISSING');
}
function publishOldPartial(activation, state, deps = {}) {
  const runEvidence = (deps.leaseRunEvidence || updatedRunEvidence)(
    'release', activation.oldLeaseId, deps.runner || commandResult);
  const receipt = handoff.buildCompletionReceipt(activation.oldManifest, {
    disposition: 'PARTIAL',
    outputRefs: ['pr:#' + activation.prNumber, 'commit:' + activation.preservedHead],
    validationRefs: ['receipt:mcl-published-progress-recovery:' + activation.transactionId],
    observedRefs: [
      'pr:#' + activation.prNumber,
      'commit:' + activation.preservedHead,
      'issue:#2352',
    ],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: {
      ledgerRef: '#2352',
      leaseId: activation.oldLeaseId,
      releasedAtGeneration: runEvidence.generation,
      evidenceRef: 'run:' + runEvidence.runId,
    },
    workspaceResult: 'clean',
    blockerRefs: [],
    requiredUnknownRefs: [],
  });
  const body = handoff.renderCompletionReceipt(receipt);
  const identity = {
    marker: handoff.RECEIPT_START,
    parse: handoff.parseCompletionReceipt,
    invalidReason: 'D014_RECEIPT_INVALID_PRESENT',
    conflictReason: 'OLD_PARTIAL_RECEIPT_CONFLICT',
    key(value) {
      return {
        slot: 'receipt:' + value.manifestId,
        semantic: value.receiptId + ':' + value.payloadSha256,
      };
    },
  };
  return postExactSemantic(
    Number(activation.packetRef.slice(1)), body, identity, deps);
}
function discoverExternalOverlap(activation, deps = {}) {
  if (deps.discoverOverlap) return deps.discoverOverlap(activation);
  const runner = deps.runner || commandResult;
  const issues = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const rows = ghJson('repos/' + REPO + '/issues?state=open&per_page='
      + PAGE_SIZE + '&page=' + page, runner);
    if (!Array.isArray(rows)) fail('UNKNOWN', 'OVERLAP_DISCOVERY_INVALID');
    issues.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    if (page === MAX_PAGES) fail('UNKNOWN', 'OVERLAP_DISCOVERY_PARTIAL');
  }
  const packetNumber = Number(activation.packetRef.slice(1));
  const candidates = [];
  for (const item of issues) {
    if (!Number.isSafeInteger(item?.number)) fail('UNKNOWN', 'OVERLAP_CANDIDATE_INVALID');
    if (item.pull_request) {
      if (item.number === activation.prNumber) continue;
      const files = readPrFiles(item.number, runner);
      candidates.push({
        type: 'pr', ref: '#' + item.number, state: item.state,
        changedFiles: files.rows.map((file) => file?.filename)
          .filter((name) => typeof name === 'string'),
        filesComplete: files.complete,
      });
      continue;
    }
    if (item.number === packetNumber) continue;
    if (typeof item.body === 'string'
        && item.body.includes('<!-- canonical-main-work-packet:v1 -->')) {
      candidates.push({
        type: 'packet', ref: '#' + item.number,
        issueState: item.state, body: item.body,
      });
    }
  }
  return scopeOverlap.resolveScopeOverlap({
    requestedScopes: activation.scopes,
    discovery: 'COMPLETE',
    candidates,
  });
}
function acquireFresh(activation, deps = {}) {
  const runner = deps.runner || commandResult;
  const mainBefore = readMainOpsBarrier(runner);
  const overlap = discoverExternalOverlap(activation, deps);
  if (overlap.discovery !== 'COMPLETE' || overlap.state !== 'DISJOINT') {
    fail(overlap.state === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'FRESH_OVERLAP_NOT_DISJOINT');
  }
  exactPrAndWorkspace(activation, runner);
  const mainAfter = readMainOpsBarrier(runner);
  if (mainAfter !== mainBefore) fail('UNKNOWN', 'MAIN_DRIFT_DURING_REBIND');
  const runLease = deps.runLease || runLeaseOwner;
  const value = runLease([
    'lease-acquire', '--repo', REPO, '--packet', activation.packetRef,
    '--route', activation.route, '--executor', activation.executor,
    '--scopes-json', JSON.stringify(activation.scopes),
    '--scope-disposition', 'DISJOINT',
    '--workspace-kind', activation.workspace.kind,
    '--branch', activation.workspace.branch,
    '--worktree', activation.workspace.worktree,
    '--observed-base-sha', activation.preservedHead,
    '--dispatch',
  ], runner);
  if (value.status !== 'DISPATCH_COMPLETE' || value.runConclusion !== 'success') {
    fail('BLOCKED', 'FRESH_LEASE_ACQUIRE_NOT_PROVEN');
  }
  return value;
}
function buildFreshManifest(activation, state, deps = {}) {
  const evidence = (deps.leaseRunEvidence || updatedRunEvidence)(
    'acquire', state.expectedFresh.leaseId, deps.runner || commandResult);
  const leaseRef = 'receipt:mcl-task-lease:' + state.expectedFresh.leaseId
    + ':generation:' + evidence.generation;
  return handoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: activation.packetRef,
    packetBodySha256: activation.packetBodySha256,
    phaseId: 'validation-merge',
    phaseClass: 'VALIDATION',
    route: activation.route,
    executor: activation.executor,
    scopes: activation.scopes,
    workspace: activation.workspace,
    observedBaseSha: activation.preservedHead,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: state.expectedFresh.leaseId,
      acquiredGeneration: evidence.generation,
      acquireEvidenceRef: leaseRef,
    },
    sourceAuthorityRefs: [
      activation.packetRef, 'issue:#2352', 'issue:#2743', 'issue:#2840',
    ],
    inputRefs: [
      'pr:#' + activation.prNumber,
      'commit:' + activation.preservedHead,
      'receipt:mcl-published-progress-recovery:' + activation.transactionId,
      'receipt:mcl-task-manifest:' + activation.oldManifest.manifestId,
      leaseRef,
    ],
    expectedOutputRefs: [
      'pr:#' + activation.prNumber,
      'commit:' + activation.preservedHead,
    ],
    acceptanceRefs: [activation.packetRef, 'issue:#2743', 'issue:#2840'],
    stopCondition: 'Recover published validation coordination to a fresh exact lease and VALIDATION_MERGE manifest with holder absent; do not mutate Git/PR or claim a fresh holder.',
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
  });
}
function publishFreshManifest(activation, state, deps = {}) {
  const manifest = buildFreshManifest(activation, state, deps);
  const body = handoff.renderManifest(manifest);
  const identity = {
    marker: handoff.MANIFEST_START,
    parse: handoff.parseManifest,
    invalidReason: 'D014_MANIFEST_INVALID_PRESENT',
    conflictReason: 'FRESH_MANIFEST_IDENTITY_CONFLICT',
    key(value) {
      const slot = value.packetRef + ':' + value.phaseId + ':'
        + (value.leaseEvidence?.leaseId || 'none');
      return {slot, semantic: value.manifestId + ':' + value.payloadSha256};
    },
  };
  return postExactSemantic(
    Number(activation.packetRef.slice(1)), body, identity, deps);
}
function summaryForState(state) {
  return {
    recoveryDisposition: state.phase === 'RECOVERY_REBIND_READY'
      ? 'RECOVERY_REBIND_READY' : 'RECOVERY_EFFECT_IN_PROGRESS',
    publishedProgress: 'EXACT_PRESERVED',
    nextLegalAction: state.phase === 'RECOVERY_REBIND_READY'
      ? 'VALIDATION_MERGE' : 'PUBLISHED_PROGRESS_RECOVERY_APPLY',
  };
}
async function inspectPacket(packetNumber, deps = {}) {
  const activationRead = readActivation(packetNumber, deps.runner || commandResult);
  if (!activationRead) {
    const inspect = deps.inspectPublished || inspector.inspectPacket;
    const initial = await inspect(packetNumber, deps.inspectOptions || {});
    return {
      status: initial.decision.result,
      operation: 'inspect',
      packetRef: '#' + packetNumber,
      recoveryDisposition: initial.decision.recoveryDisposition,
      publishedProgress: initial.decision.publishedProgress,
      nextLegalAction: initial.decision.nextLegalAction,
      reasonCodes: initial.decision.reasonCode ? [initial.decision.reasonCode] : [],
      effects: {oldLeaseReleased: 0, holderCleaned: 0, partialPublished: 0,
        freshLeaseAcquired: 0, freshManifestPublished: 0},
    };
  }
  const state = (deps.readState || classifyState)(activationRead.value, deps.runner || commandResult);
  const summary = summaryForState(state);
  return {
    status: state.phase === 'RECOVERY_REBIND_READY' ? 'PASS' : 'PARTIAL',
    operation: 'inspect',
    packetRef: activationRead.value.packetRef,
    ...summary,
    reasonCodes: [],
    effects: {oldLeaseReleased: 0, holderCleaned: 0, partialPublished: 0,
      freshLeaseAcquired: 0, freshManifestPublished: 0},
  };
}
async function applyPacket(packetNumber, deps = {}) {
  const activation = await (deps.loadOrAdmit || loadOrAdmit)(packetNumber, deps);
  const readState = deps.readState || classifyState;
  const effects = {
    oldLeaseReleased: 0,
    holderCleaned: 0,
    partialPublished: 0,
    freshLeaseAcquired: 0,
    freshManifestPublished: 0,
  };
  for (let step = 0; step < 8; step += 1) {
    const state = readState(activation, deps.runner || commandResult);
    if (state.phase === 'RECOVERY_REBIND_READY') {
      return {
        status: 'PASS',
        operation: 'apply',
        packetRef: activation.packetRef,
        recoveryDisposition: 'RECOVERY_REBIND_READY',
        publishedProgress: 'EXACT_PRESERVED',
        transactionId: activation.transactionId,
        effects,
        nextLegalAction: 'VALIDATION_MERGE',
        reasonCodes: [],
      };
    }
    if (state.phase === 'OLD_ACTIVE') {
      await (deps.releaseOld || releaseOld)(activation, deps);
      effects.oldLeaseReleased += 1;
      continue;
    }
    if (state.phase === 'HOLDER_CLEANUP_REQUIRED') {
      (deps.cleanupHolder || cleanupOldHolder)(activation, state, deps);
      effects.holderCleaned += 1;
      continue;
    }
    if (state.phase === 'PARTIAL_RECEIPT_REQUIRED') {
      const result = (deps.publishPartial || publishOldPartial)(activation, state, deps);
      effects.partialPublished += result.written || 0;
      continue;
    }
    if (state.phase === 'FRESH_ACQUIRE_REQUIRED') {
      (deps.acquireFresh || acquireFresh)(activation, deps);
      effects.freshLeaseAcquired += 1;
      continue;
    }
    if (state.phase === 'FRESH_MANIFEST_REQUIRED') {
      const result = (deps.publishFreshManifest || publishFreshManifest)(activation, state, deps);
      effects.freshManifestPublished += result.written || 0;
      continue;
    }
    fail('UNKNOWN', 'RECOVERY_STATE_UNSUPPORTED');
  }
  fail('UNKNOWN', 'RECOVERY_EFFECT_STEP_BOUND_EXCEEDED');
}
function resultDisposition(status) {
  if (status === 'PASS') return ['PASS', 'COMPLETE'];
  if (status === 'PARTIAL') return ['PARTIAL', 'NEEDS_REVIEW'];
  if (status === 'CONFLICT') return ['CONFLICT', 'CONFLICT'];
  if (status === 'BLOCKED') return ['BLOCKED', 'BLOCKED'];
  return ['UNKNOWN', 'UNKNOWN'];
}
function reportToReceipt(packetNumber, result, artifacts = []) {
  const [canonicalResult, attentionDisposition] = resultDisposition(result.status);
  const effects = result.effects || {};
  return executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'mcl-published-progress-recovery-effect:'
      + (result.operation || 'unknown') + ':' + packetNumber,
    primitiveId: 'mcl:published-progress-recovery-effect',
    sourceIdentity: {
      kind: 'ISSUE',
      locator: 'issue:#' + packetNumber,
      identity: result.transactionId || 'packet:#' + packetNumber,
    },
    executionSurface: 'MCL:PUBLISHED_PROGRESS_RECOVERY_EFFECT',
    stage: 'VALIDATION_MERGE',
    executionLifecycle: 'FINISHED',
    attentionDisposition,
    result: canonicalResult,
    proofScope: 'fixed published-progress coordination recovery; Git/PR/currentization/merge excluded',
    steps: [{
      name: 'published-progress-recovery',
      result: canonicalResult,
      evidenceLocator: 'issue:#' + packetNumber,
    }],
    counters: [
      {name: 'old_lease_released', value: effects.oldLeaseReleased || 0},
      {name: 'holder_cleaned', value: effects.holderCleaned || 0},
      {name: 'partial_receipt_published', value: effects.partialPublished || 0},
      {name: 'fresh_lease_acquired', value: effects.freshLeaseAcquired || 0},
      {name: 'fresh_manifest_published', value: effects.freshManifestPublished || 0},
      {name: 'git_effects_performed', value: 0},
      {name: 'merge_effects_performed', value: 0},
    ],
    affectedFiles: [],
    artifactLocators: unique(artifacts),
    reasonCodes: unique(result.reasonCodes),
    requiredUnknowns: canonicalResult === 'UNKNOWN' ? unique(result.reasonCodes) : [],
    conflicts: canonicalResult === 'CONFLICT' ? unique(result.reasonCodes) : [],
    blockers: canonicalResult === 'BLOCKED' ? unique(result.reasonCodes) : [],
    exitCode: null,
    stderrTail: null,
    nextLegalAction: result.nextLegalAction || 'TARGETED_DRILLDOWN_REQUIRED',
  });
}
function evidenceDir(runner = commandResult) {
  const dir = path.join(commonGitDir(runner), 'published-progress-recovery-effect');
  fs.mkdirSync(dir, {recursive: true, mode: 0o700});
  fs.chmodSync(dir, 0o700);
  return dir;
}
function writeJsonEvidence(file, value) {
  const text = JSON.stringify(stable(value), null, 2) + '\n';
  fs.writeFileSync(file, text, {encoding: 'utf8', mode: 0o600});
  fs.chmodSync(file, 0o600);
  return 'local-artifact:' + file + '#sha256=' + sha256(text);
}
function persistResult(packetNumber, operation, result, runner = commandResult) {
  const dir = evidenceDir(runner);
  const reportPath = path.join(dir, 'packet-' + packetNumber + '.' + operation + '.report.json');
  const reportLocator = writeJsonEvidence(reportPath, {
    schemaVersion: 1,
    mode: 'MCL_PUBLISHED_PROGRESS_RECOVERY_EFFECT_REPORT',
    ...result,
    authority: {...FALSE_AUTHORITY},
  });
  const receipt = reportToReceipt(packetNumber, result, [reportLocator]);
  const receiptPath = path.join(dir, 'packet-' + packetNumber + '.' + operation + '.receipt.json');
  const receiptLocator = writeJsonEvidence(receiptPath, receipt);
  return {receipt, reportLocator, receiptLocator};
}
function attentionFromResult(result, locator) {
  if (result.status === 'PASS') return [];
  const severity = result.status === 'CONFLICT' ? 'CONFLICT'
    : result.status === 'BLOCKED' ? 'BLOCKER'
      : result.status === 'PARTIAL' ? 'UNKNOWN' : 'UNKNOWN';
  return [{
    subject: 'mcl:published-progress-recovery-effect',
    reasonCode: result.reasonCodes?.[0] || 'RECOVERY_EFFECT_ATTENTION',
    severity,
    constraint: 'PUBLISHED_PROGRESS_RECOVERY_EFFECT',
    nextPhase: result.nextLegalAction || 'TARGETED_DRILLDOWN_REQUIRED',
    locator,
  }];
}
function projectView(persisted, result) {
  return agentDecisionView.projectAgentDecisionView({
    receipt: persisted.receipt,
    phase: 'VALIDATION_MERGE',
    output: {
      recoveryDisposition: result.recoveryDisposition || 'UNKNOWN',
      publishedProgress: result.publishedProgress || 'UNKNOWN',
      effectsPerformed: Object.values(result.effects || {}).reduce((a, b) => a + b, 0),
    },
    attention: attentionFromResult(result, persisted.reportLocator),
    receiptLocator: persisted.receiptLocator,
    reportLocator: persisted.reportLocator,
  });
}
function parseArgs(argv = process.argv.slice(2)) {
  const args = [...argv];
  const command = args.shift();
  if (!['inspect', 'apply'].includes(command)) throw new Error('COMMAND_UNSUPPORTED');
  const values = {apply: false};
  while (args.length) {
    const key = args.shift();
    if (key === '--apply') {
      if (values.apply) throw new Error('ARGUMENT_DUPLICATE:apply');
      values.apply = true;
      continue;
    }
    const value = args.shift();
    if (!key?.startsWith('--') || value === undefined) throw new Error('ARGUMENT_INVALID');
    const name = key.slice(2);
    if (!['packet', 'format'].includes(name) || values[name] !== undefined) {
      throw new Error('ARGUMENT_UNSUPPORTED:' + name);
    }
    values[name] = value;
  }
  const match = PACKET_RE.exec(values.packet || '');
  if (!match) throw new Error('PACKET_REF_INVALID');
  if (!['receipt', 'agent-view'].includes(values.format || '')) throw new Error('FORMAT_UNSUPPORTED');
  if (command === 'apply' && !values.apply) throw new Error('APPLY_LITERAL_REQUIRED');
  if (command === 'inspect' && values.apply) throw new Error('APPLY_LITERAL_FORBIDDEN');
  return {command, packetNumber: Number(match[1]), format: values.format};
}
function errorResult(packetNumber, error) {
  const kind = error instanceof EffectError ? error.kind : 'UNKNOWN';
  return {
    status: kind,
    operation: null,
    packetRef: Number.isSafeInteger(packetNumber) && packetNumber > 0
      ? '#' + packetNumber : null,
    recoveryDisposition: null,
    publishedProgress: 'UNKNOWN',
    effects: {oldLeaseReleased: 0, holderCleaned: 0, partialPublished: 0,
      freshLeaseAcquired: 0, freshManifestPublished: 0},
    nextLegalAction: kind === 'CONFLICT'
      ? 'SEMANTIC_REVIEW_REQUIRED' : 'TARGETED_DRILLDOWN_REQUIRED',
    reasonCodes: error instanceof EffectError
      ? error.reasonCodes : ['RECOVERY_EFFECT_INTERNAL_ERROR'],
  };
}
async function runCli(argv = process.argv.slice(2), deps = {}) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    const result = errorResult(null, error);
    return {
      code: result.status === 'CONFLICT' ? 3 : 2,
      text: JSON.stringify(result, null, 2) + '\n',
      result,
      persisted: null,
    };
  }

  let result;
  try {
    result = args.command === 'inspect'
      ? await inspectPacket(args.packetNumber, deps)
      : await applyPacket(args.packetNumber, deps);
  } catch (error) {
    result = errorResult(args.packetNumber, error);
  }
  const persisted = persistResult(
    args.packetNumber, args.command, result, deps.runner || commandResult);
  const outward = args.format === 'agent-view'
    ? projectView(persisted, result) : persisted.receipt;
  const code = result.status === 'PASS' ? 0
    : result.status === 'CONFLICT' ? 3 : 2;
  return {code, text: JSON.stringify(outward, null, 2) + '\n', result, persisted};
}
if (require.main === module) {
  runCli().then((out) => {
    process.stdout.write(out.text);
    process.exitCode = out.code;
  }).catch((error) => {
    process.stdout.write(JSON.stringify({
      status: 'UNKNOWN', reasonCodes: ['RECOVERY_EFFECT_FATAL'],
    }) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  EffectError,
  FALSE_AUTHORITY,
  acquireFresh,
  activationCore,
  activationPath,
  applyPacket,
  buildActivation,
  buildFreshManifest,
  classifyState,
  discoverExternalOverlap,
  errorResult,
  exactPrAndWorkspace,
  freshLeaseProfile,
  inspectPacket,
  loadOrAdmit,
  oldPartialState,
  parseArgs,
  parsedCommentEvidence,
  postExactSemantic,
  projectView,
  publishFreshManifest,
  publishOldPartial,
  readActivation,
  readMainOpsBarrier,
  releaseOld,
  reportToReceipt,
  runCli,
  summaryForState,
  updatedRunEvidence,
  verifyActivation,
  writeActivationExact,
};
