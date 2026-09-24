#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const REPO = 'hanmiyoo10-alt/-';
const OPS_ISSUE = 485;
const LEDGER_ISSUE = 2352;
const PACKET_RE = /^#([1-9][0-9]*)$/;
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const RECOVERY_PHASE = 'VALIDATION_MERGE';
const REBIND_SUFFIX = '-published-progress-validation-rebind';

const inspector = require('./mcl-published-progress-recovery-inspect.cjs');
const handoff = require('../task-handoff.cjs');
const taskLease = require('../task-lease.cjs');
const holderOwner = require('../mcl-workspace-holder.cjs');
const operator = require('../mcl-coordination-operator.cjs');
const stageEntry = require('../stage-entry/mcl-stage-entry.cjs');
const executionReceipt = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs'));
const agentDecisionView = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-harness/agent-decision-view.cjs'));

const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

class RecoveryApplyError extends Error {
  constructor(kind, reasonCodes, locator = null) {
    const unique = [...new Set(reasonCodes)].sort();
    super(unique[0] || kind);
    this.kind = kind;
    this.reasonCodes = unique;
    this.locator = locator;
  }
}
function fail(kind, ...reasonCodes) {
  throw new RecoveryApplyError(kind, reasonCodes);
}
function unique(values) {
  return [...new Set(values)].sort();
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function sha256(value) {
  return crypto.createHash('sha256').update(
    typeof value === 'string' ? value : JSON.stringify(stable(value))).digest('hex');
}
function commandResult(command, args, {cwd = ROOT, input = null} = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd, encoding: 'utf8', shell: false, input, maxBuffer: 8 * 1024 * 1024,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}
function commandArrayRunner(args, options = {}) {
  if (!Array.isArray(args) || !args.length) {
    return {code: 127, stdout: '', stderr: 'COMMAND_INVALID'};
  }
  return commandResult(args[0], args.slice(1), options);
}
function runGh(args, options = {}) {
  return commandResult('gh', args, {cwd: ROOT, input: options.input || null});
}
function runGit(cwd, args) {
  return commandResult('git', ['-C', cwd, ...args], {cwd});
}
function jsonFrom(result, reason) {
  if (!result || result.code !== 0) fail('UNKNOWN', reason);
  try { return JSON.parse(result.stdout || ''); }
  catch { fail('UNKNOWN', reason + '_JSON_INVALID'); }
}
function ghJson(endpoint, options = {}) {
  const args = ['api', endpoint, '--method', options.method || 'GET',
    '--header', 'Accept: application/vnd.github+json'];
  const runOptions = {};
  if (options.body !== undefined) {
    args.push('--input', '-');
    runOptions.input = JSON.stringify(options.body);
  }
  return jsonFrom(runGh(args, runOptions),
    options.method && options.method !== 'GET' ? 'GITHUB_WRITE_FAILED' : 'GITHUB_READ_FAILED');
}
function readIssue(number) {
  const value = ghJson('repos/' + REPO + '/issues/' + number);
  if (!value || value.pull_request || typeof value.body !== 'string') {
    fail('UNKNOWN', 'ISSUE_READ_INVALID');
  }
  return value;
}
function readComments(number) {
  const rows = [];
  for (let page = 1; page <= 5; page += 1) {
    const value = ghJson('repos/' + REPO + '/issues/' + number
      + '/comments?per_page=100&page=' + page);
    if (!Array.isArray(value)) fail('UNKNOWN', 'COMMENTS_READ_INVALID');
    rows.push(...value);
    if (value.length < 100) return {complete: true, rows};
  }
  return {complete: false, rows};
}
function readLedger() {
  const issue = readIssue(LEDGER_ISSUE);
  const parsed = taskLease.parseLedger(issue.body);
  if (!parsed.ok || parsed.state.status !== 'ACTIVE') fail('UNKNOWN', 'LEDGER_UNRESOLVED');
  return {issue, state: parsed.state};
}
function currentMain() {
  const result = runGit(ROOT, ['ls-remote', 'origin', 'refs/heads/main']);
  if (result.code !== 0) fail('UNKNOWN', 'DIRECT_MAIN_READ_FAILED');
  const rows = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  const sha = rows.length === 1 ? rows[0].split(/\s+/)[0] : null;
  if (!SHA40_RE.test(sha || '')) fail('UNKNOWN', 'DIRECT_MAIN_IDENTITY_UNKNOWN');
  return sha;
}
function opsHealthy(mainSha) {
  const body = readIssue(OPS_ISSUE).body;
  return body.includes('- STATE: `CLEAR`')
    && body.includes('- MAIN: `' + mainSha + '` / Required PASS')
    && body.includes('- UNKNOWN: NONE');
}
function assertCurrentBarrier() {
  const before = currentMain();
  if (!opsHealthy(before)) fail('UNKNOWN', 'OPS_CURRENTNESS_UNKNOWN');
  const after = currentMain();
  if (after !== before) fail('UNKNOWN', 'DIRECT_MAIN_DRIFT');
  return before;
}
function recoveryIdentity({packetRef, oldLeaseId, oldManifestId, prNumber, preservedHead}) {
  if (!PACKET_RE.test(packetRef || '') || !SHA256_RE.test(oldLeaseId || '')
      || !SHA256_RE.test(oldManifestId || '') || !Number.isSafeInteger(prNumber)
      || !SHA40_RE.test(preservedHead || '')) {
    fail('CONFLICT', 'RECOVERY_IDENTITY_INPUT_INVALID');
  }
  return sha256({
    packetRef,
    phase: RECOVERY_PHASE,
    oldLeaseId,
    oldManifestId,
    prNumber,
    preservedHead,
  });
}
function exactAdmission(result) {
  const d = result?.decision;
  return !!d
    && d.validity === 'VALID'
    && d.result === 'PASS'
    && d.attentionDisposition === 'COMPLETE'
    && d.recoveryDisposition === 'PUBLISHED_PROGRESS_REBIND_ELIGIBLE'
    && d.publishedProgress === 'EXACT_PRESERVED'
    && d.nextLegalAction === 'PUBLISHED_PROGRESS_RECOVERY_EFFECT_REVIEW';
}
function prNumberFromLocator(locator) {
  const match = /^pr:#([1-9][0-9]*)$/.exec(locator || '');
  return match ? Number(match[1]) : null;
}
function parseValidManifests(commentRead, packetRef) {
  if (!commentRead.complete) fail('UNKNOWN', 'COMMENTS_DISCOVERY_PARTIAL');
  const rows = [];
  for (const row of commentRead.rows) {
    const body = typeof row?.body === 'string' ? row.body : '';
    if (!body.includes(handoff.MANIFEST_START)) continue;
    const parsed = handoff.parseManifest(body);
    if (parsed.status !== 'VALID') continue;
    if (parsed.value.packetRef === packetRef) rows.push({comment: row, body, value: parsed.value});
  }
  return rows;
}
function parseValidReceipts(commentRead, packetRef) {
  if (!commentRead.complete) fail('UNKNOWN', 'COMMENTS_DISCOVERY_PARTIAL');
  const rows = [];
  for (const row of commentRead.rows) {
    const body = typeof row?.body === 'string' ? row.body : '';
    if (!body.includes(handoff.RECEIPT_START)) continue;
    const parsed = handoff.parseCompletionReceipt(body);
    if (parsed.status !== 'VALID') continue;
    if (parsed.value.packetRef === packetRef) rows.push({comment: row, body, value: parsed.value});
  }
  return rows;
}
function bySemanticIdentity(rows, identity) {
  const matches = rows.filter((row) => identity(row.value));
  const uniqueRows = new Map(matches.map((row) => [
    (row.value.manifestId || '') + ':' + (row.value.receiptId || '') + ':'
      + (row.value.payloadSha256 || ''),
    row,
  ]));
  return [...uniqueRows.values()];
}
function findFreshManifest(commentRead, packetRef, packetNumber) {
  const phaseId = packetNumber + REBIND_SUFFIX;
  const matches = bySemanticIdentity(parseValidManifests(commentRead, packetRef),
    (manifest) => manifest.phaseId === phaseId);
  if (matches.length > 1) fail('CONFLICT', 'FRESH_MANIFEST_IDENTITY_CONFLICT');
  return matches[0] || null;
}
function findRecoveryPartial(commentRead, packetRef) {
  const matches = bySemanticIdentity(parseValidReceipts(commentRead, packetRef),
    (receipt) => receipt.disposition === 'PARTIAL'
      && receipt.validationRefs.some((ref) =>
        /^receipt:mcl-published-progress-recovery:[0-9a-f]{64}$/.test(ref)));
  if (matches.length > 1) fail('CONFLICT', 'RECOVERY_PARTIAL_IDENTITY_CONFLICT');
  return matches[0] || null;
}
function postSemanticComment(packetNumber, text, kind, semanticId) {
  const before = readComments(packetNumber);
  const parser = kind === 'manifest' ? handoff.parseManifest : handoff.parseCompletionReceipt;
  const marker = kind === 'manifest' ? handoff.MANIFEST_START : handoff.RECEIPT_START;
  const matches = [];
  for (const row of before.rows) {
    const body = typeof row?.body === 'string' ? row.body : '';
    if (!body.includes(marker)) continue;
    const parsed = parser(body);
    if (parsed.status !== 'VALID') continue;
    const id = kind === 'manifest' ? parsed.value.manifestId : parsed.value.receiptId;
    if (id === semanticId) matches.push(body);
  }
  if (new Set(matches).size > 1) fail('CONFLICT', 'SEMANTIC_COMMENT_IDENTITY_CONFLICT');
  if (matches.length) {
    if (matches[0] !== text) fail('CONFLICT', 'SEMANTIC_COMMENT_PAYLOAD_CONFLICT');
    return {written: 0, reused: 1};
  }
  ghJson('repos/' + REPO + '/issues/' + packetNumber + '/comments', {
    method: 'POST', body: {body: text},
  });
  const after = readComments(packetNumber);
  const exact = after.rows.filter((row) => row.body === text);
  if (exact.length !== 1) fail(exact.length ? 'CONFLICT' : 'UNKNOWN',
    exact.length ? 'COMMENT_DUPLICATE_AFTER_WRITE' : 'COMMENT_WRITE_READBACK_MISSING');
  return {written: 1, reused: 0};
}
function materializeHolderEvidence(manifest, ledgerBody, callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-published-recovery-'));
  const manifestPath = path.join(dir, 'manifest.md');
  const ledgerPath = path.join(dir, 'ledger.md');
  try {
    fs.writeFileSync(manifestPath, handoff.renderManifest(manifest), {mode: 0o600});
    fs.writeFileSync(ledgerPath, ledgerBody, {mode: 0o600});
    return callback({manifestPath, ledgerPath});
  } finally {
    try { fs.rmSync(dir, {recursive: true, force: true}); } catch (_) {}
  }
}
function holderState(manifest, ledgerBody) {
  return materializeHolderEvidence(manifest, ledgerBody, ({manifestPath}) => {
    const read = holderOwner.readManifest(manifestPath);
    if (!read.ok) fail('UNKNOWN', 'MANIFEST_FILE_REVALIDATION_FAILED');
    const workspace = holderOwner.inspectWorkspace(read.value);
    if (!workspace.ok) fail('UNKNOWN', ...(workspace.reasonCodes || ['WORKSPACE_INSPECT_FAILED']));
    const holder = holderOwner.readHolder(workspace.holderPath);
    if (holder.missing) return {state: 'ABSENT', holderPath: workspace.holderPath};
    if (!holder.ok) fail('CONFLICT', ...(holder.reasonCodes || ['HOLDER_READ_FAILED']));
    if (holder.value.manifestId !== manifest.manifestId
        || holder.value.leaseId !== manifest.leaseEvidence?.leaseId) {
      fail('CONFLICT', 'HOLDER_IDENTITY_CONFLICT');
    }
    return {state: 'PRESENT_EXACT', holderPath: workspace.holderPath};
  });
}
function cleanupStaleHolder(manifest, ledgerBody) {
  return materializeHolderEvidence(manifest, ledgerBody, (files) => {
    const result = holderOwner.cleanupStale({
      manifestPath: files.manifestPath,
      ledgerPath: files.ledgerPath,
      packetPath: null,
    });
    if (result.status !== 'STALE_CLEANED') {
      fail('BLOCKED', ...(result.reasonCodes || ['STALE_HOLDER_CLEANUP_FAILED']));
    }
    return result;
  });
}
function releaseOldLease(packetRef, leaseId) {
  const client = operator.createOperatorGitHubClient({
    repo: REPO,
    runner: (args) => runGh(args),
  });
  return operator.planRelease({client, packetRef, leaseId})
    .then((plan) => {
      if (plan.status !== 'PLAN_READY') fail(
        plan.status === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
        ...(plan.reasonCodes || ['OLD_LEASE_RELEASE_NOT_READY']));
      return operator.dispatchPlan({
        repo: REPO, plan, client, runner: (args) => runGh(args),
      });
    })
    .then((result) => {
      if (result.status !== 'DISPATCH_COMPLETE') fail('UNKNOWN',
        ...(result.reasonCodes || ['OLD_LEASE_RELEASE_UNPROVEN']));
      return result;
    });
}
function discoverFreshOverlap(packetNumber, scopes) {
  const result = stageEntry.discoverOverlap({
    packetNumber,
    requestedScopes: scopes,
    runner: commandArrayRunner,
  });
  if (result.state !== 'DISJOINT' || result.discovery !== 'COMPLETE') {
    fail(result.state === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'FRESH_OVERLAP_NOT_DISJOINT');
  }
  return result;
}
function recheckPublishedIdentity(oldLease, packet, prNumber, preservedHead) {
  assertCurrentBarrier();
  const worktree = oldLease.workspace.worktree;
  const branch = runGit(worktree, ['branch', '--show-current']);
  const head = runGit(worktree, ['rev-parse', 'HEAD']);
  const dirty = runGit(worktree, ['status', '--porcelain=v1', '--untracked-files=all']);
  if ([branch, head, dirty].some((row) => row.code !== 0)) fail('UNKNOWN', 'WORKSPACE_GIT_READ_FAILED');
  if (dirty.stdout.trim()) fail('BLOCKED', 'WORKSPACE_DIRTY');
  if (branch.stdout.trim() !== oldLease.workspace.branch
      || head.stdout.trim() !== preservedHead) fail('CONFLICT', 'PRESERVED_HEAD_CONFLICT');
  const pr = ghJson('repos/' + REPO + '/pulls/' + prNumber);
  if (pr.state !== 'open' || pr.draft !== false || pr.base?.ref !== 'main'
      || pr.head?.ref !== oldLease.workspace.branch || pr.head?.sha !== preservedHead) {
    fail('CONFLICT', 'PRESERVED_PR_IDENTITY_CONFLICT');
  }
  const files = [];
  for (let page = 1; page <= 5; page += 1) {
    const rows = ghJson('repos/' + REPO + '/pulls/' + prNumber
      + '/files?per_page=100&page=' + page);
    if (!Array.isArray(rows)) fail('UNKNOWN', 'PR_FILES_READ_INVALID');
    files.push(...rows);
    if (rows.length < 100) break;
    if (page === 5) fail('UNKNOWN', 'PR_FILES_DISCOVERY_PARTIAL');
  }
  const changed = files.map((row) => row.filename).sort();
  const expected = packet.pathScopes.map((row) => row.slice('path:'.length)).sort();
  if (JSON.stringify(changed) !== JSON.stringify(expected)) fail('CONFLICT', 'PR_CHANGED_PATHS_CONFLICT');
  return pr;
}
async function acquireFreshLease(packet, oldLease, preservedHead) {
  const client = operator.createOperatorGitHubClient({
    repo: REPO,
    runner: (args) => runGh(args),
  });
  const plan = await operator.planAcquire({
    client,
    packetRef: packet.packetRef,
    route: oldLease.route,
    executor: oldLease.executor,
    scopes: oldLease.scopes,
    scopeDisposition: 'DISJOINT',
    workspaceKind: oldLease.workspace.kind,
    branch: oldLease.workspace.branch,
    worktree: oldLease.workspace.worktree,
    observedBaseSha: preservedHead,
  });
  if (plan.status !== 'PLAN_READY') fail(
    plan.status === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
    ...(plan.reasonCodes || ['FRESH_LEASE_ACQUIRE_NOT_READY']));
  const result = await operator.dispatchPlan({
    repo: REPO, plan, client, runner: (args) => runGh(args),
  });
  if (result.status !== 'DISPATCH_COMPLETE' || !SHA256_RE.test(result.leaseId || '')) {
    fail('UNKNOWN', ...(result.reasonCodes || ['FRESH_LEASE_ACQUIRE_UNPROVEN']));
  }
  return result;
}
function buildPartialReceipt(oldManifest, release, txId, prNumber, preservedHead) {
  const releaseRef = release.evidenceRef
    || (Number.isSafeInteger(release.runId) ? 'run:' + release.runId : 'issue:#2352');
  return handoff.buildCompletionReceipt(oldManifest, {
    disposition: 'PARTIAL',
    outputRefs: ['pr:#' + prNumber, 'commit:' + preservedHead],
    validationRefs: [
      'receipt:mcl-published-progress-recovery:' + txId,
      releaseRef,
    ],
    observedRefs: ['pr:#' + prNumber, 'commit:' + preservedHead],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: {
      ledgerRef: '#2352',
      leaseId: oldManifest.leaseEvidence.leaseId,
      releasedGeneration: release.observedGeneration,
      evidenceRef: releaseRef,
    },
    workspaceResult: 'clean',
    blockerRefs: [],
    requiredUnknownRefs: [],
  });
}
function buildFreshManifest({packet, oldLease, freshLease, oldManifest, prNumber,
  preservedHead, txId}) {
  return handoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: packet.packetRef,
    packetBodySha256: packet.digest,
    phaseId: packet.packetRef.slice(1) + REBIND_SUFFIX,
    phaseClass: 'VALIDATION',
    route: oldLease.route,
    executor: oldLease.executor,
    scopes: oldLease.scopes,
    workspace: oldLease.workspace,
    observedBaseSha: preservedHead,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: freshLease.leaseId,
      acquiredGeneration: freshLease.observedGeneration,
      acquireEvidenceRef: 'receipt:mcl-task-lease:' + freshLease.leaseId
        + ':generation:' + freshLease.observedGeneration,
    },
    sourceAuthorityRefs: [
      packet.packetRef,
      'issue:#2352',
      'pr:#' + prNumber,
      'receipt:mcl-task-manifest:' + oldManifest.manifestId,
    ],
    inputRefs: [
      'commit:' + preservedHead,
      'pr:#' + prNumber,
      'receipt:mcl-published-progress-recovery:' + txId,
      'receipt:mcl-task-manifest:' + oldManifest.manifestId,
    ],
    expectedOutputRefs: packet.pathScopes,
    acceptanceRefs: [packet.packetRef, 'issue:#2352', 'pr:#' + prNumber],
    stopCondition: 'Recover published validation coordination to one fresh exact lease and manifest; stop before holder claim or Git/PR mutation.',
    authority: {...FALSE_AUTHORITY},
  });
}
function terminalFromFresh(packetNumber, packetRef, commentRead, ledger) {
  const fresh = findFreshManifest(commentRead, packetRef, packetNumber);
  if (!fresh) return null;
  const active = ledger.state.activeLeases.filter((row) =>
    row.leaseId === fresh.value.leaseEvidence?.leaseId);
  if (active.length !== 1) fail(active.length ? 'CONFLICT' : 'UNKNOWN',
    active.length ? 'FRESH_LEASE_DUPLICATE' : 'FRESH_LEASE_MISSING');
  if (active[0].packetRef !== packetRef
      || active[0].observedBaseSha !== fresh.value.observedBaseSha
      || JSON.stringify(active[0].workspace) !== JSON.stringify(fresh.value.workspace)
      || JSON.stringify(active[0].scopes) !== JSON.stringify(fresh.value.scopes)) {
    fail('CONFLICT', 'FRESH_LEASE_MANIFEST_CONFLICT');
  }
  const hs = holderState(fresh.value, ledger.issue.body);
  if (hs.state !== 'ABSENT') fail('BLOCKED', 'FRESH_HOLDER_MUST_BE_ABSENT');
  return {
    freshManifest: fresh.value,
    freshLease: active[0],
    disposition: 'RECOVERY_REBIND_READY',
    nextLegalAction: 'VALIDATION_MERGE',
  };
}
function gitCommonDir() {
  const result = runGit(ROOT, ['rev-parse', '--git-common-dir']);
  if (result.code !== 0) fail('UNKNOWN', 'GIT_COMMON_DIR_READ_FAILED');
  const raw = result.stdout.trim();
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
  let stat;
  try { stat = fs.lstatSync(resolved); } catch { fail('UNKNOWN', 'GIT_COMMON_DIR_MISSING'); }
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('CONFLICT', 'GIT_COMMON_DIR_INVALID');
  return resolved;
}
function evidenceDir(packetNumber) {
  return path.join(gitCommonDir(), 'published-progress-recovery-effect',
    'packet-' + packetNumber);
}
function recordPath(packetNumber, txId, kind) {
  if (!SHA256_RE.test(txId || '') || !/^[a-z-]+$/.test(kind || '')) {
    fail('CONFLICT', 'EFFECT_RECORD_IDENTITY_INVALID');
  }
  return path.join(evidenceDir(packetNumber), txId + '.' + kind + '.json');
}
function readJsonRecord(filePath) {
  let stat;
  try { stat = fs.lstatSync(filePath); } catch (error) {
    if (error.code === 'ENOENT') return null;
    fail('UNKNOWN', 'EFFECT_RECORD_READ_FAILED');
  }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 16 * 1024) {
    fail('CONFLICT', 'EFFECT_RECORD_FILE_INVALID');
  }
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { fail('CONFLICT', 'EFFECT_RECORD_JSON_INVALID'); }
}
function writeImmutableRecord(packetNumber, txId, kind, value) {
  const dir = evidenceDir(packetNumber);
  fs.mkdirSync(dir, {recursive: true, mode: 0o700});
  fs.chmodSync(dir, 0o700);
  const filePath = recordPath(packetNumber, txId, kind);
  const normalized = stable(value);
  const existing = readJsonRecord(filePath);
  if (existing) {
    if (JSON.stringify(stable(existing)) !== JSON.stringify(normalized)) {
      fail('CONFLICT', 'EFFECT_RECORD_CONFLICT:' + kind);
    }
    return {written: 0, value: existing, locator: 'local-artifact:' + filePath};
  }
  const text = JSON.stringify(normalized, null, 2) + '\n';
  let fd;
  try {
    fd = fs.openSync(filePath, 'wx', 0o600);
    fs.writeFileSync(fd, text, 'utf8');
    fs.fsyncSync(fd);
  } catch (error) {
    if (fd !== undefined) try { fs.closeSync(fd); } catch (_) {}
    if (error.code === 'EEXIST') {
      const replay = readJsonRecord(filePath);
      if (JSON.stringify(stable(replay)) === JSON.stringify(normalized)) {
        return {written: 0, value: replay, locator: 'local-artifact:' + filePath};
      }
      fail('CONFLICT', 'EFFECT_RECORD_CONFLICT:' + kind);
    }
    fail('UNKNOWN', 'EFFECT_RECORD_WRITE_FAILED:' + kind);
  }
  fs.closeSync(fd);
  return {written: 1, value: normalized, locator: 'local-artifact:' + filePath};
}
function seedFromAdmission(packet, admitted) {
  const obs = admitted.observation;
  const oldLease = obs.leaseRead.lease;
  const oldManifest = obs.manifestRead.manifest;
  const prNumber = prNumberFromLocator(obs.prRead.locator);
  const preservedHead = obs.gitRead.head;
  if (!oldLease || !oldManifest || !prNumber || !SHA40_RE.test(preservedHead || '')) {
    fail('UNKNOWN', 'ADMISSION_EFFECT_IDENTITIES_UNRESOLVED');
  }
  const txId = recoveryIdentity({
    packetRef: packet.packetRef,
    oldLeaseId: oldLease.leaseId,
    oldManifestId: oldManifest.manifestId,
    prNumber,
    preservedHead,
  });
  return {
    schemaVersion: 1,
    mode: 'MCL_PUBLISHED_PROGRESS_RECOVERY_SEED',
    txId,
    packetRef: packet.packetRef,
    packetBodySha256: packet.digest,
    oldLeaseId: oldLease.leaseId,
    oldManifestId: oldManifest.manifestId,
    prNumber,
    preservedHead,
    route: oldLease.route,
    executor: oldLease.executor,
    scopes: oldLease.scopes,
    workspace: oldLease.workspace,
    oldObservedBaseSha: oldLease.observedBaseSha,
  };
}
function findSeedForPacket(packetNumber) {
  const dir = evidenceDir(packetNumber);
  let names;
  try { names = fs.readdirSync(dir); } catch (error) {
    if (error.code === 'ENOENT') return null;
    fail('UNKNOWN', 'RECOVERY_SEED_DIRECTORY_READ_FAILED');
  }
  const rows = names.filter((name) => /^[0-9a-f]{64}\.seed\.json$/.test(name));
  if (!rows.length) return null;
  if (rows.length !== 1) fail('CONFLICT', 'RECOVERY_SEED_AMBIGUOUS');
  const txId = rows[0].slice(0, 64);
  const value = readJsonRecord(recordPath(packetNumber, txId, 'seed'));
  if (!value || value.txId !== txId || value.packetRef !== '#' + packetNumber) {
    fail('CONFLICT', 'RECOVERY_SEED_INVALID');
  }
  return value;
}
function manifestById(commentRead, packetRef, manifestId) {
  const rows = parseValidManifests(commentRead, packetRef)
    .filter((row) => row.value.manifestId === manifestId);
  const distinct = new Map(rows.map((row) => [
    row.value.manifestId + ':' + row.value.payloadSha256, row,
  ]));
  if (distinct.size !== 1) fail(distinct.size ? 'CONFLICT' : 'UNKNOWN',
    distinct.size ? 'OLD_MANIFEST_IDENTITY_CONFLICT' : 'OLD_MANIFEST_MISSING');
  return [...distinct.values()][0].value;
}
function oldLeaseFromSeed(seed, manifest) {
  if (manifest.manifestId !== seed.oldManifestId
      || manifest.leaseEvidence?.leaseId !== seed.oldLeaseId
      || manifest.packetBodySha256 !== seed.packetBodySha256
      || manifest.route !== seed.route || manifest.executor !== seed.executor
      || JSON.stringify(manifest.scopes) !== JSON.stringify(seed.scopes)
      || JSON.stringify(manifest.workspace) !== JSON.stringify(seed.workspace)
      || manifest.observedBaseSha !== seed.oldObservedBaseSha) {
    fail('CONFLICT', 'RECOVERY_SEED_MANIFEST_CONFLICT');
  }
  return {
    packetRef: seed.packetRef,
    packetBodySha256: seed.packetBodySha256,
    leaseId: seed.oldLeaseId,
    route: seed.route,
    executor: seed.executor,
    scopes: seed.scopes,
    workspace: seed.workspace,
    observedBaseSha: seed.oldObservedBaseSha,
  };
}
function releaseEvidenceFromState(packetNumber, seed, ledger) {
  const record = readJsonRecord(recordPath(packetNumber, seed.txId, 'release'));
  if (record) return record;
  if (ledger.state.activeLeases.some((row) => row.leaseId === seed.oldLeaseId)) return null;
  if (ledger.state.lastRelease?.leaseId !== seed.oldLeaseId) {
    fail('UNKNOWN', 'OLD_RELEASE_EVIDENCE_NOT_RECONSTRUCTIBLE');
  }
  return writeImmutableRecord(packetNumber, seed.txId, 'release', {
    schemaVersion: 1,
    mode: 'MCL_PUBLISHED_PROGRESS_RECOVERY_EFFECT',
    txId: seed.txId,
    effect: 'OLD_D013_RELEASE',
    leaseId: seed.oldLeaseId,
    runId: null,
    observedGeneration: ledger.state.lastRelease.releasedAtGeneration,
    evidenceRef: 'issue:#2352',
  }).value;
}
function exactFreshActiveLease(packet, seed, ledger) {
  const rows = ledger.state.activeLeases.filter((row) => row.packetRef === packet.packetRef);
  if (!rows.length) return null;
  if (rows.length !== 1) fail('CONFLICT', 'FRESH_ACTIVE_LEASE_AMBIGUOUS');
  const row = rows[0];
  const expected = taskLease.normalizeAcquireRequest({
    expectedGeneration: ledger.state.generation,
    packetRef: packet.packetRef,
    packetBodySha256: packet.digest,
    route: seed.route,
    executor: seed.executor,
    scopes: seed.scopes,
    scopeDisposition: 'DISJOINT',
    workspaceKind: seed.workspace.kind,
    branch: seed.workspace.branch,
    worktree: seed.workspace.worktree,
    observedBaseSha: seed.preservedHead,
  });
  if (!expected.ok || row.leaseId !== expected.lease.leaseId
      || JSON.stringify(row.workspace) !== JSON.stringify(seed.workspace)
      || JSON.stringify(row.scopes) !== JSON.stringify(seed.scopes)
      || row.observedBaseSha !== seed.preservedHead) {
    fail('CONFLICT', 'FRESH_ACTIVE_LEASE_CONFLICT');
  }
  return row;
}


function executionResult(packetNumber, operation, result, attentionDisposition,
  steps, artifacts, reasonCodes, nextLegalAction, output) {
  const receipt = executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'mcl-published-progress-recovery:' + operation + ':' + packetNumber,
    primitiveId: 'mcl:published-progress-recovery-effect',
    sourceIdentity: {
      kind: 'ISSUE',
      locator: 'issue:#' + packetNumber,
      identity: 'packet:' + packetNumber,
    },
    executionSurface: 'REMOTE_HARNESS:S',
    stage: 'VALIDATION_RECOVERY',
    executionLifecycle: 'FINISHED',
    attentionDisposition,
    result,
    proofScope: 'PUBLISHED_PROGRESS_RECOVERY',
    steps,
    counters: [],
    affectedFiles: [],
    artifactLocators: artifacts,
    reasonCodes,
    requiredUnknowns: result === 'UNKNOWN' ? reasonCodes : [],
    conflicts: result === 'CONFLICT' ? reasonCodes : [],
    blockers: result === 'BLOCKED' ? reasonCodes : [],
    nextLegalAction,
  });
  return {receipt, output};
}
function projectView(result, reportLocator = 'issue:#2887') {
  const reasons = [];
  const canonical = agentDecisionView.validateCanonicalReceipt(result.receipt, reasons);
  if (!canonical || reasons.length) fail('CONFLICT', 'EXECUTION_RECEIPT_CONFLICT');
  const attention = canonical.result === 'PASS' ? [] : [{
    subject: canonical.primitiveId,
    reasonCode: canonical.reasonCodes?.[0] || canonical.result,
    severity: canonical.result === 'CONFLICT' ? 'CONFLICT'
      : canonical.result === 'UNKNOWN' ? 'UNKNOWN'
        : canonical.result === 'BLOCKED' ? 'BLOCKER' : 'FAIL',
    constraint: 'PUBLISHED_PROGRESS_RECOVERY',
    nextPhase: canonical.nextLegalAction,
    locator: canonical.artifactLocators?.[0] || reportLocator,
  }];
  return agentDecisionView.projectAgentDecisionView({
    receipt: canonical,
    phase: 'VALIDATION_RECOVERY',
    output: result.output || {},
    attention,
    receiptLocator: 'receipt:' + canonical.receiptDigest,
    reportLocator,
  });
}
async function inspectPacket(packetNumber, options = {}) {
  const result = await (options.inspect || inspector.inspectPacket)(packetNumber, options);
  if (!exactAdmission(result)) {
    const d = result.decision || {};
    return executionResult(packetNumber, 'inspect',
      d.result || 'UNKNOWN', d.attentionDisposition || 'UNKNOWN',
      [{name: 'published-progress-admission', result: d.result || 'UNKNOWN',
        evidenceLocator: result.decisionLocator || 'UNKNOWN'}],
      [result.decisionLocator || 'UNKNOWN', result.reportLocator || 'UNKNOWN'],
      d.reasonCode ? [d.reasonCode] : [],
      d.nextLegalAction || 'TARGETED_DRILLDOWN_REQUIRED',
      {
        recoveryDisposition: d.recoveryDisposition || 'UNKNOWN',
        publishedProgress: d.publishedProgress || 'UNKNOWN',
      });
  }
  return executionResult(packetNumber, 'inspect', 'PASS', 'COMPLETE',
    [{name: 'published-progress-admission', result: 'PASS',
      evidenceLocator: result.decisionLocator}],
    [result.decisionLocator, result.reportLocator], [],
    'PUBLISHED_PROGRESS_RECOVERY_EFFECT_REVIEW',
    {
      recoveryDisposition: result.decision.recoveryDisposition,
      publishedProgress: result.decision.publishedProgress,
    });
}
async function applyPacket(packetNumber, options = {}) {
  let commentRead = (options.readComments || readComments)(packetNumber);
  const packetIssue = (options.readIssue || readIssue)(packetNumber);
  const packet = inspector.parsePacket(packetNumber, packetIssue);
  let ledger = (options.readLedger || readLedger)();

  const terminal = (options.terminalFromFresh || terminalFromFresh)(
    packetNumber, packet.packetRef, commentRead, ledger);
  if (terminal) {
    return executionResult(packetNumber, 'apply', 'PASS', 'COMPLETE',
      [{name: 'terminal-rebind-readback', result: 'PASS',
        evidenceLocator: 'receipt:mcl-task-manifest:' + terminal.freshManifest.manifestId}],
      ['receipt:mcl-task-manifest:' + terminal.freshManifest.manifestId],
      [], 'VALIDATION_MERGE', {
        recoveryDisposition: 'RECOVERY_REBIND_READY',
        publishedProgress: 'EXACT_PRESERVED',
        effects: 0,
      });
  }

  let seed = (options.findSeedForPacket || findSeedForPacket)(packetNumber);
  let admitted = null;
  if (!seed) {
    admitted = await (options.inspect || inspector.inspectPacket)(packetNumber, options);
    if (!exactAdmission(admitted)) fail(
      admitted?.decision?.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      admitted?.decision?.reasonCode || 'PUBLISHED_PROGRESS_ADMISSION_REQUIRED');
    seed = seedFromAdmission(packet, admitted);
    (options.writeImmutableRecord || writeImmutableRecord)(
      packetNumber, seed.txId, 'seed', seed);
  }
  if (seed.packetRef !== packet.packetRef || seed.packetBodySha256 !== packet.digest) {
    fail('CONFLICT', 'RECOVERY_SEED_PACKET_DRIFT');
  }

  const oldManifest = manifestById(commentRead, packet.packetRef, seed.oldManifestId);
  const oldLease = oldLeaseFromSeed(seed, oldManifest);
  const prNumber = seed.prNumber;
  const preservedHead = seed.preservedHead;
  const txId = seed.txId;
  const effects = {
    oldLeaseReleased: 0,
    staleHolderCleaned: 0,
    partialReceiptPublished: 0,
    freshLeaseAcquired: 0,
    freshManifestPublished: 0,
  };

  const oldActive = ledger.state.activeLeases.some((row) => row.leaseId === oldLease.leaseId);
  let release;
  if (oldActive) {
    const second = admitted || await (options.inspect || inspector.inspectPacket)(
      packetNumber, options);
    if (!exactAdmission(second)
        || second.observation.leaseRead.lease?.leaseId !== oldLease.leaseId
        || second.observation.manifestRead.manifest?.manifestId !== oldManifest.manifestId
        || second.observation.gitRead.head !== preservedHead
        || prNumberFromLocator(second.observation.prRead.locator) !== prNumber) {
      fail('CONFLICT', 'PRE_EFFECT_ADMISSION_DRIFT');
    }
    const dispatched = await (options.releaseOldLease || releaseOldLease)(
      packet.packetRef, oldLease.leaseId);
    release = (options.writeImmutableRecord || writeImmutableRecord)(
      packetNumber, txId, 'release', {
        schemaVersion: 1,
        mode: 'MCL_PUBLISHED_PROGRESS_RECOVERY_EFFECT',
        txId,
        effect: 'OLD_D013_RELEASE',
        leaseId: oldLease.leaseId,
        runId: dispatched.runId,
        observedGeneration: dispatched.observedGeneration,
        evidenceRef: 'run:' + dispatched.runId,
      }).value;
    effects.oldLeaseReleased += 1;
    ledger = (options.readLedger || readLedger)();
  } else {
    release = (options.releaseEvidenceFromState || releaseEvidenceFromState)(
      packetNumber, seed, ledger);
    if (!release) fail('UNKNOWN', 'OLD_RELEASE_EVIDENCE_MISSING');
  }
  if (ledger.state.activeLeases.some((row) => row.leaseId === oldLease.leaseId)) {
    fail('UNKNOWN', 'OLD_LEASE_STILL_ACTIVE');
  }

  let hs = (options.holderState || holderState)(oldManifest, ledger.issue.body);
  if (hs.state === 'PRESENT_EXACT') {
    (options.cleanupStaleHolder || cleanupStaleHolder)(oldManifest, ledger.issue.body);
    effects.staleHolderCleaned += 1;
    ledger = (options.readLedger || readLedger)();
    hs = (options.holderState || holderState)(oldManifest, ledger.issue.body);
  }
  if (hs.state !== 'ABSENT') fail('BLOCKED', 'OLD_HOLDER_NOT_ABSENT');

  commentRead = (options.readComments || readComments)(packetNumber);
  let partial = findRecoveryPartial(commentRead, packet.packetRef);
  if (!partial) {
    const receipt = (options.buildPartialReceipt || buildPartialReceipt)(
      oldManifest, release, txId, prNumber, preservedHead);
    const text = handoff.renderCompletionReceipt(receipt);
    const posted = (options.postSemanticComment || postSemanticComment)(
      packetNumber, text, 'receipt', receipt.receiptId);
    effects.partialReceiptPublished += posted.written || 0;
    commentRead = (options.readComments || readComments)(packetNumber);
    partial = findRecoveryPartial(commentRead, packet.packetRef);
  }
  if (!partial || partial.value.manifestId !== oldManifest.manifestId) {
    fail('CONFLICT', 'OLD_PARTIAL_RECEIPT_UNPROVEN');
  }

  (options.assertCurrentBarrier || assertCurrentBarrier)();
  const overlap = (options.discoverFreshOverlap || discoverFreshOverlap)(
    packetNumber, oldLease.scopes);
  if (!overlap || overlap.state !== 'DISJOINT' || overlap.discovery !== 'COMPLETE') {
    fail('BLOCKED', 'FRESH_OVERLAP_NOT_DISJOINT');
  }
  (options.recheckPublishedIdentity || recheckPublishedIdentity)(
    oldLease, packet, prNumber, preservedHead);

  ledger = (options.readLedger || readLedger)();
  const activeFresh = (options.exactFreshActiveLease || exactFreshActiveLease)(
    packet, seed, ledger);
  let freshLease;
  if (activeFresh) {
    const recorded = (options.readFreshLeaseRecord
      || ((number, identity) => readJsonRecord(recordPath(number, identity, 'fresh-lease'))))(
      packetNumber, txId);
    if (!recorded || recorded.leaseId !== activeFresh.leaseId
        || !Number.isSafeInteger(recorded.observedGeneration)) {
      fail('UNKNOWN', 'FRESH_LEASE_EFFECT_RECORD_MISSING');
    }
    freshLease = {
      leaseId: activeFresh.leaseId,
      observedGeneration: recorded.observedGeneration,
    };
  } else {
    freshLease = await (options.acquireFreshLease || acquireFreshLease)(
      packet, oldLease, preservedHead);
    (options.writeImmutableRecord || writeImmutableRecord)(
      packetNumber, txId, 'fresh-lease', {
        schemaVersion: 1,
        mode: 'MCL_PUBLISHED_PROGRESS_RECOVERY_EFFECT',
        txId,
        effect: 'FRESH_D013_ACQUIRE',
        leaseId: freshLease.leaseId,
        observedGeneration: freshLease.observedGeneration,
        evidenceRef: 'receipt:mcl-task-lease:' + freshLease.leaseId
          + ':generation:' + freshLease.observedGeneration,
      });
    effects.freshLeaseAcquired += 1;
  }

  const freshManifest = (options.buildFreshManifest || buildFreshManifest)({
    packet, oldLease, freshLease, oldManifest, prNumber, preservedHead, txId,
  });
  const manifestText = handoff.renderManifest(freshManifest);
  const manifestPosted = (options.postSemanticComment || postSemanticComment)(
    packetNumber, manifestText, 'manifest', freshManifest.manifestId);
  effects.freshManifestPublished += manifestPosted.written || 0;

  const finalLedger = (options.readLedger || readLedger)();
  const finalComments = (options.readComments || readComments)(packetNumber);
  const terminalFinal = (options.terminalFromFresh || terminalFromFresh)(
    packetNumber, packet.packetRef, finalComments, finalLedger);
  if (!terminalFinal) fail('UNKNOWN', 'RECOVERY_REBIND_READBACK_MISSING');

  return executionResult(packetNumber, 'apply', 'PASS', 'COMPLETE',
    [
      {name: 'old-d013-release', result: 'PASS', evidenceLocator: release.evidenceRef},
      {name: 'old-holder-absence', result: 'PASS',
        evidenceLocator: 'receipt:mcl-workspace-holder:absent'},
      {name: 'old-d014-partial', result: 'PASS',
        evidenceLocator: 'receipt:mcl-task-completion-receipt:' + partial.value.receiptId},
      {name: 'fresh-overlap', result: 'PASS', evidenceLocator: 'issue:#' + packetNumber},
      {name: 'fresh-d013', result: 'PASS',
        evidenceLocator: 'receipt:mcl-task-lease:' + freshLease.leaseId},
      {name: 'fresh-d014', result: 'PASS',
        evidenceLocator: 'receipt:mcl-task-manifest:' + freshManifest.manifestId},
      {name: 'fresh-holder-absence', result: 'PASS',
        evidenceLocator: 'receipt:mcl-workspace-holder:absent'},
    ],
    [
      admitted?.decisionLocator || 'local-artifact:recovery-seed',
      admitted?.reportLocator || 'local-artifact:recovery-seed',
      'receipt:mcl-task-completion-receipt:' + partial.value.receiptId,
      'receipt:mcl-task-manifest:' + freshManifest.manifestId,
    ],
    [], 'VALIDATION_MERGE', {
      recoveryDisposition: 'RECOVERY_REBIND_READY',
      publishedProgress: 'EXACT_PRESERVED',
      effects: Object.values(effects).reduce((sum, value) => sum + value, 0),
      effectCounters: effects,
    });
}


function parseArgs(argv = process.argv.slice(2)) {
  const args = [...argv];
  const operation = args.shift();
  if (!['inspect', 'apply'].includes(operation)) throw new Error('COMMAND_UNSUPPORTED');
  const values = {};
  let apply = false;
  while (args.length) {
    const key = args.shift();
    if (key === '--apply') {
      if (apply) throw new Error('ARGUMENT_DUPLICATE:apply');
      apply = true;
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
  if (!['agent-view', 'receipt'].includes(values.format)) throw new Error('FORMAT_UNSUPPORTED');
  if (operation === 'apply' && !apply) throw new Error('APPLY_FLAG_REQUIRED');
  if (operation === 'inspect' && apply) throw new Error('APPLY_FLAG_FORBIDDEN');
  return {operation, packetNumber: Number(match[1]), format: values.format};
}
async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  let result;
  try {
    result = args.operation === 'inspect'
      ? await inspectPacket(args.packetNumber, options)
      : await applyPacket(args.packetNumber, options);
  } catch (error) {
    const kind = error?.kind || 'UNKNOWN';
    const reasons = error?.reasonCodes || [String(error?.message || 'RECOVERY_APPLY_FAILED')];
    result = executionResult(args.packetNumber, args.operation,
      ['CONFLICT', 'BLOCKED'].includes(kind) ? kind : 'UNKNOWN',
      ['CONFLICT', 'BLOCKED'].includes(kind) ? kind : 'UNKNOWN',
      [{name: 'published-progress-recovery', result: kind,
        evidenceLocator: error?.locator || 'issue:#' + args.packetNumber}],
      [error?.locator || 'issue:#' + args.packetNumber], reasons,
      'TARGETED_RECOVERY_DRILLDOWN_REQUIRED',
      {recoveryDisposition: kind, publishedProgress: 'UNKNOWN'});
  }
  const outward = args.format === 'receipt' ? result.receipt : projectView(result);
  process.stdout.write(JSON.stringify(outward, null, 2) + '\n');
  return result.receipt.result === 'PASS' ? 0
    : ['CONFLICT', 'BLOCKED'].includes(result.receipt.result) ? 2 : 3;
}
if (require.main === module) {
  runCli().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stdout.write(JSON.stringify({
      result: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN',
      reasonCodes: [String(error?.message || 'RECOVERY_APPLY_INTERNAL_ERROR')],
    }) + '\n');
    process.exitCode = 3;
  });
}

module.exports = {
  RecoveryApplyError,
  applyPacket,
  assertCurrentBarrier,
  buildFreshManifest,
  buildPartialReceipt,
  exactAdmission,
  exactFreshActiveLease,
  findFreshManifest,
  findRecoveryPartial,
  findSeedForPacket,
  holderState,
  releaseEvidenceFromState,
  seedFromAdmission,
  inspectPacket,
  parseArgs,
  postSemanticComment,
  projectView,
  recoveryIdentity,
  terminalFromFresh,
  writeImmutableRecord,
};
