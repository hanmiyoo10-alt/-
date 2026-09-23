#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const continuity = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-harness/execution-continuity/execution-continuity.cjs'));
const taskHandoff = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const repositoryImplementation = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/repository-implementation/mcl-repository-implementation.cjs'));
const patchOwner = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/device-ops/repository-patch/mcl-repository-patch-owner-invoke.cjs'));

const CONTINUITY_OWNER_ID = 'mcl:known-owner-repository-implementation:v1';
const PHASE = 'IMPLEMENTATION_PR';
const START_SCHEMA = 'mcl-detached-owner-runtime-start.v1';
const INSPECT_SCHEMA = 'mcl-detached-owner-runtime-inspect.v1';
const START_RESULT_SCHEMA = 'mcl-detached-owner-runtime-start-result.v1';
const CHECKPOINT_SCHEMA = 'mcl-detached-owner-checkpoint.v1';
const CHECKPOINT_ACK_SCHEMA = 'mcl-detached-owner-checkpoint-ack.v1';
const RUNTIME_DIR = '/root/.local/run/mcl-detached-owner-runtime';
const SOCKET_PATH = RUNTIME_DIR + '/control.sock';
const WORKTREE_ROOT = '/root/nyang-worktrees';
const MAX_INPUT_BYTES = 64 * 1024;
const MAX_SOCKET_BYTES = 16 * 1024;
const MAX_RUNS_PER_WORKTREE = 64;
const SHA256_RE = /^[0-9a-f]{64}$/;
const RUN_ID_RE = /^run-[0-9a-f]{64}$/;
const PACKET_RE = /^#[1-9][0-9]*$/;
const CHECKPOINTS = new Set(continuity.CHECKPOINTS.filter((item) => item !== 'UNKNOWN'));

class RuntimeError extends Error {
  constructor(kind, reasonCodes) {
    super((reasonCodes || [kind])[0] || kind);
    this.kind = kind;
    this.reasonCodes = [...new Set(reasonCodes || [kind])].sort();
  }
}
function fail(kind, ...codes) {
  throw new RuntimeError(kind, codes.flat());
}
function sha256Bytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function sha256Text(value) {
  return sha256Bytes(Buffer.from(String(value), 'utf8'));
}
function stable(value) {
  return taskHandoff.stable(value);
}
function stableHash(value) {
  return sha256Text(JSON.stringify(stable(value)));
}
function exactKeys(value, allowed, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('UNKNOWN', field + '_OBJECT_REQUIRED');
  }
  const extras = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !(key in value));
  if (extras.length || missing.length) {
    fail('UNKNOWN',
      ...extras.map((key) => field + '_UNKNOWN_FIELD:' + key),
      ...missing.map((key) => field + '_FIELD_REQUIRED:' + key));
  }
}
function packetNumber(packetRef) {
  if (!PACKET_RE.test(String(packetRef || ''))) fail('UNKNOWN', 'PACKET_REF_INVALID');
  return Number(packetRef.slice(1));
}
function fixedWorktree(packetRef) {
  return path.join(WORKTREE_ROOT, 'mcl-packet-' + packetNumber(packetRef));
}
function readRegular(filePath, field, maxBytes = MAX_INPUT_BYTES) {
  const resolved = path.resolve(filePath);
  let stat;
  try { stat = fs.lstatSync(resolved); } catch (_) { fail('UNKNOWN', field + '_READ_FAILED'); }
  if (!stat.isFile() || stat.isSymbolicLink()) fail('UNKNOWN', field + '_REGULAR_FILE_REQUIRED');
  if (stat.size > maxBytes) fail('UNKNOWN', field + '_TOO_LARGE');
  return fs.readFileSync(resolved);
}
function runGit(worktree, args, spawnSyncImpl = childProcess.spawnSync) {
  const result = spawnSyncImpl('git', ['-C', worktree, ...args], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) fail('UNKNOWN', 'GIT_READ_FAILED');
  return String(result.stdout || '').trim();
}
function gitAdminDir(worktree, spawnSyncImpl = childProcess.spawnSync) {
  const top = runGit(worktree, ['rev-parse', '--show-toplevel'], spawnSyncImpl);
  const branch = runGit(worktree, ['branch', '--show-current'], spawnSyncImpl);
  const admin = runGit(worktree, ['rev-parse', '--absolute-git-dir'], spawnSyncImpl);
  if (top !== worktree) fail('CONFLICT', 'WORKTREE_TOPLEVEL_CONFLICT');
  const packet = path.basename(worktree).slice('mcl-packet-'.length);
  if (branch !== 'server/mcl-packet-' + packet) fail('CONFLICT', 'WORKTREE_BRANCH_CONFLICT');
  const realAdmin = fs.realpathSync(admin);
  const realWorktree = fs.realpathSync(worktree);
  if (realWorktree !== worktree) fail('CONFLICT', 'WORKTREE_ALIAS_CONFLICT');
  return realAdmin;
}
function pathScopes(scopes) {
  return [...scopes].filter((scope) => scope.startsWith('path:'))
    .map((scope) => scope.slice(5)).sort();
}
function readOwnerSourceIdentity(worktree, fsImpl = fs) {
  const implPath = path.join(worktree,
    'products/chatgpt-mobile-coder-lab/coordination/repository-implementation/mcl-repository-implementation.cjs');
  const patchPath = path.join(worktree,
    'products/chatgpt-mobile-coder-lab/device-ops/repository-patch/mcl-repository-patch-owner-invoke.cjs');
  const implBytes = fsImpl.readFileSync(implPath);
  const patchBytes = fsImpl.readFileSync(patchPath);
  return {
    repositoryImplementationSourceSha256: sha256Bytes(implBytes),
    repositoryPatchSourceSha256: sha256Bytes(patchBytes),
  };
}
function ownerImplementationIdentity(sourceIdentity) {
  exactKeys(sourceIdentity, new Set([
    'repositoryImplementationSourceSha256', 'repositoryPatchSourceSha256',
  ]), 'OWNER_SOURCE_IDENTITY');
  for (const value of Object.values(sourceIdentity)) {
    if (!SHA256_RE.test(value)) fail('UNKNOWN', 'OWNER_SOURCE_DIGEST_INVALID');
  }
  return stableHash({
    domain: 'mcl-detached-owner-implementation:v1',
    continuityOwnerId: CONTINUITY_OWNER_ID,
    stageOwnerId: patchOwner.STAGE_OWNER_ID,
    mutationPrimitiveId: patchOwner.MUTATION_PRIMITIVE_ID,
    ...sourceIdentity,
  });
}
function parseManifestEnvelope(text) {
  const parsed = taskHandoff.parseManifest(String(text));
  if (parsed.status !== 'VALID') fail(parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
    ...(parsed.reasonCodes || ['PARENT_MANIFEST_INVALID']));
  return parsed.value;
}
function buildActivation({
  packetRef,
  parentManifestText,
  parentHandoffText,
  requestText,
  patchBytes,
  validationRequestText,
  prRequestText,
  worktree = fixedWorktree(packetRef),
  sourceIdentity = null,
}) {
  const packet = packetNumber(packetRef);
  const parentManifest = parseManifestEnvelope(parentManifestText);
  const parentHandoff = repositoryImplementation.parseHandoffEnvelope(parentHandoffText);
  if (parentManifest.packetRef !== packetRef
      || parentManifest.phaseId !== packet + '-implementation-pr-stage-entry'
      || parentManifest.phaseClass !== 'REPOSITORY_MUTATION'
      || parentManifest.route !== 'S' || parentManifest.executor !== 'S'
      || parentManifest.workspace?.kind !== 'repository'
      || parentManifest.workspace?.branch !== 'server/mcl-packet-' + packet
      || parentManifest.workspace?.worktree !== worktree
      || parentManifest.leaseRequirement !== 'REQUIRED') {
    fail('CONFLICT', 'PARENT_MANIFEST_CONFLICT');
  }
  if (parentHandoff.status !== 'HANDOFF_READY'
      || parentHandoff.packet_ref !== packetRef
      || parentHandoff.manifest_id !== parentManifest.manifestId
      || parentHandoff.lease_id !== parentManifest.leaseEvidence.leaseId
      || parentHandoff.next_owner !== 'existing_route_owner') {
    fail('CONFLICT', 'PARENT_HANDOFF_CONFLICT');
  }

  const request = patchOwner.parseRequestText(String(requestText));
  const patch = Buffer.isBuffer(patchBytes) ? patchBytes : Buffer.from(patchBytes);
  if (patch.length > patchOwner.MAX_PATCH_BYTES) fail('UNKNOWN', 'PATCH_FILE_TOO_LARGE');
  if (sha256Bytes(patch) !== request.patch_sha256) fail('CONFLICT', 'PATCH_HASH_CONFLICT');
  if (JSON.stringify(request.expected_paths) !== JSON.stringify(pathScopes(parentManifest.scopes))) {
    fail('CONFLICT', 'PATCH_PATH_SCOPE_CONFLICT');
  }
  const profileBinding = repositoryImplementation.resolveValidationProfileBinding(
    {requestedScopes: parentManifest.scopes}, String(validationRequestText));
  const prRequest = repositoryImplementation.parsePrRequestText(String(prRequestText), packetRef);

  const requestSha256 = sha256Text(requestText);
  const validationRequestSha256 = sha256Text(validationRequestText);
  const prRequestSha256 = sha256Text(prRequestText);
  const semanticRequestDigest = stableHash({
    domain: 'mcl-detached-semantic-request:v1',
    requestSha256,
    patchSha256: request.patch_sha256,
    validationRequestSha256,
    validationContractDigest: profileBinding.profile.contractDigest,
    prRequestSha256,
  });
  const sources = sourceIdentity || readOwnerSourceIdentity(worktree);
  const ownerIdentity = ownerImplementationIdentity(sources);
  const activationCore = {
    schemaVersion: 1,
    mode: 'MCL_DETACHED_FIXED_OWNER_ACTIVATION',
    packetRef,
    phase: PHASE,
    continuityOwnerId: CONTINUITY_OWNER_ID,
    stageOwnerId: patchOwner.STAGE_OWNER_ID,
    mutationPrimitiveId: patchOwner.MUTATION_PRIMITIVE_ID,
    semanticRequestDigest,
    ownerImplementationIdentity: ownerIdentity,
    validationProfileId: profileBinding.profile.profileId,
    validationProfileVersion: profileBinding.profile.profileVersion,
    validationContractDigest: profileBinding.profile.contractDigest,
    requestSha256,
    patchSha256: request.patch_sha256,
    validationRequestSha256,
    prRequestSha256,
    sourceIdentity: sources,
  };
  const activationDigest = stableHash({domain: 'mcl-detached-activation:v1', ...activationCore});
  const runId = continuity.deriveRunId({
    packetRef, phase: PHASE, ownerId: CONTINUITY_OWNER_ID, activationDigest,
  });
  const activation = {...activationCore, activationDigest, runId};
  const guards = {
    schemaVersion: 1,
    mode: 'MCL_DETACHED_FIXED_OWNER_ATTEMPT_GUARDS',
    runId,
    attemptId: 1,
    packetRef,
    parentManifestId: parentManifest.manifestId,
    parentManifestPayloadSha256: parentManifest.payloadSha256,
    leaseId: parentManifest.leaseEvidence.leaseId,
    acquiredGeneration: parentManifest.leaseEvidence.acquiredGeneration,
    packetBodySha256: parentManifest.packetBodySha256,
    branch: parentManifest.workspace.branch,
    worktree: parentManifest.workspace.worktree,
    parentManifestSha256: sha256Text(parentManifestText),
    parentHandoffSha256: sha256Text(parentHandoffText),
  };
  return {
    activation,
    guards,
    parentManifest,
    parentHandoff,
    semanticFiles: {
      'request.json': Buffer.from(String(requestText)),
      'patch.diff': patch,
      'validation-request.json': Buffer.from(String(validationRequestText)),
      'pr-request.json': Buffer.from(String(prRequestText)),
    },
    attemptFiles: {
      'parent-manifest.md': Buffer.from(String(parentManifestText)),
      'parent-handoff.md': Buffer.from(String(parentHandoffText)),
      'guards.json': Buffer.from(JSON.stringify(stable(guards), null, 2) + '\n'),
    },
    prRequest,
  };
}
function fsyncDir(dir) {
  const fd = fs.openSync(dir, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function writeNewFile(filePath, bytes, mode = 0o600) {
  const fd = fs.openSync(filePath, 'wx', mode);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}
function assertExactRegular(filePath, expected) {
  let stat;
  try { stat = fs.lstatSync(filePath); } catch (_) { fail('CONFLICT', 'BUNDLE_FILE_MISSING'); }
  if (!stat.isFile() || stat.isSymbolicLink()) fail('CONFLICT', 'BUNDLE_FILE_TYPE_CONFLICT');
  const actual = fs.readFileSync(filePath);
  if (!actual.equals(Buffer.from(expected))) fail('CONFLICT', 'BUNDLE_FILE_CONTENT_CONFLICT');
}
function runRootFor({packetRef, runId, worktree = fixedWorktree(packetRef), spawnSyncImpl}) {
  if (!RUN_ID_RE.test(runId || '')) fail('UNKNOWN', 'RUN_ID_INVALID');
  const admin = gitAdminDir(worktree, spawnSyncImpl);
  return path.join(admin, 'execution-continuity', runId);
}
function materializeActivation(bundle, {spawnSyncImpl} = {}) {
  const {activation, guards} = bundle;
  const worktree = guards.worktree;
  const admin = gitAdminDir(worktree, spawnSyncImpl);
  const continuityRoot = path.join(admin, 'execution-continuity');
  fs.mkdirSync(continuityRoot, {recursive: true, mode: 0o700});
  const runRoot = path.join(continuityRoot, activation.runId);
  const activationDir = path.join(runRoot, 'activation');
  const attemptDir = path.join(runRoot, 'attempts', '1');
  const effectsDir = path.join(runRoot, 'effects');
  const activationBytes = Buffer.from(JSON.stringify(stable(activation), null, 2) + '\n');

  if (fs.existsSync(runRoot)) {
    assertExactRegular(path.join(activationDir, 'activation.json'), activationBytes);
    for (const [name, bytes] of Object.entries(bundle.semanticFiles)) {
      assertExactRegular(path.join(activationDir, name), bytes);
    }
    for (const [name, bytes] of Object.entries(bundle.attemptFiles)) {
      assertExactRegular(path.join(attemptDir, name), bytes);
    }
    return {status: 'IDEMPOTENT', runRoot, activationDir, attemptDir, effectsDir};
  }

  const stage = path.join(continuityRoot, '.' + activation.runId + '.tmp-' + process.pid);
  if (fs.existsSync(stage)) fs.rmSync(stage, {recursive: true, force: true});
  fs.mkdirSync(path.join(stage, 'activation'), {recursive: true, mode: 0o700});
  fs.mkdirSync(path.join(stage, 'attempts', '1'), {recursive: true, mode: 0o700});
  fs.mkdirSync(path.join(stage, 'effects'), {recursive: true, mode: 0o700});
  writeNewFile(path.join(stage, 'activation', 'activation.json'), activationBytes);
  for (const [name, bytes] of Object.entries(bundle.semanticFiles)) {
    writeNewFile(path.join(stage, 'activation', name), bytes);
  }
  for (const [name, bytes] of Object.entries(bundle.attemptFiles)) {
    writeNewFile(path.join(stage, 'attempts', '1', name), bytes);
  }
  fsyncDir(path.join(stage, 'activation'));
  fsyncDir(path.join(stage, 'attempts', '1'));
  fsyncDir(path.join(stage, 'attempts'));
  fsyncDir(path.join(stage, 'effects'));
  fsyncDir(stage);
  try {
    fs.renameSync(stage, runRoot);
  } catch (error) {
    fs.rmSync(stage, {recursive: true, force: true});
    if (error.code === 'EEXIST' || error.code === 'ENOTEMPTY') {
      return materializeActivation(bundle, {spawnSyncImpl});
    }
    throw error;
  }
  fsyncDir(continuityRoot);
  return {status: 'CREATED', runRoot, activationDir, attemptDir, effectsDir};
}
function readJsonRegular(filePath, field, max = MAX_INPUT_BYTES) {
  const bytes = readRegular(filePath, field, max);
  try { return JSON.parse(bytes.toString('utf8')); }
  catch (_) { fail('UNKNOWN', field + '_JSON_INVALID'); }
}
function readStoredActivation({packetRef, runId, worktree = fixedWorktree(packetRef), spawnSyncImpl}) {
  const runRoot = runRootFor({packetRef, runId, worktree, spawnSyncImpl});
  const activation = readJsonRegular(
    path.join(runRoot, 'activation', 'activation.json'), 'ACTIVATION_FILE');
  const guards = readJsonRegular(
    path.join(runRoot, 'attempts', '1', 'guards.json'), 'GUARDS_FILE');
  if (activation.runId !== runId || activation.packetRef !== packetRef
      || activation.phase !== PHASE || activation.continuityOwnerId !== CONTINUITY_OWNER_ID
      || guards.runId !== runId || guards.packetRef !== packetRef || guards.attemptId !== 1) {
    fail('CONFLICT', 'STORED_ACTIVATION_IDENTITY_CONFLICT');
  }
  const expectedRunId = continuity.deriveRunId({
    packetRef,
    phase: activation.phase,
    ownerId: activation.continuityOwnerId,
    activationDigest: activation.activationDigest,
  });
  if (expectedRunId !== runId) fail('CONFLICT', 'STORED_RUN_ID_CONFLICT');
  return {runRoot, activation, guards};
}
function atomicWriteFile(filePath, bytes, mode = 0o600) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, {recursive: true, mode: 0o700});
  const temp = path.join(dir, '.' + path.basename(filePath) + '.tmp-' + process.pid);
  let stat;
  try { stat = fs.lstatSync(filePath); } catch (_) { stat = null; }
  if (stat && (!stat.isFile() || stat.isSymbolicLink())) fail('CONFLICT', 'STATE_FILE_TYPE_CONFLICT');
  if (fs.existsSync(temp)) fs.rmSync(temp, {force: true});
  const fd = fs.openSync(temp, 'wx', mode);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temp, filePath);
  fsyncDir(dir);
}
function readState(runRoot) {
  const file = path.join(runRoot, 'state.json');
  if (!fs.existsSync(file)) return null;
  return continuity.normalizeRecord(readJsonRegular(file, 'STATE_FILE', 16 * 1024));
}
function writeState(runRoot, previous, next) {
  const transition = continuity.validateRecordTransition(previous, next);
  if (!transition.ok) fail('CONFLICT', ...transition.reasonCodes);
  atomicWriteFile(
    path.join(runRoot, 'state.json'),
    Buffer.from(JSON.stringify(continuity.normalizeRecord(next), null, 2) + '\n'));
  return continuity.normalizeRecord(next);
}
function initialState(runId) {
  return {
    runId,
    generation: 0,
    previousRecordDigest: null,
    attemptId: 1,
    executionLifecycle: 'QUEUED',
    lastDurableCheckpoint: 'NONE',
    checkpointEvidence: null,
    nextPrimitive: 'OWNER_START',
    finalReceiptDigest: null,
  };
}
function nextState(previous, {
  executionLifecycle = previous.executionLifecycle,
  checkpoint = previous.lastDurableCheckpoint,
  checkpointEvidence = previous.checkpointEvidence,
  nextPrimitive = previous.nextPrimitive,
  finalReceiptDigest = previous.finalReceiptDigest,
} = {}) {
  return {
    runId: previous.runId,
    generation: previous.generation + 1,
    previousRecordDigest: continuity.recordDigest(previous),
    attemptId: previous.attemptId,
    executionLifecycle,
    lastDurableCheckpoint: checkpoint,
    checkpointEvidence,
    nextPrimitive,
    finalReceiptDigest,
  };
}
function persistEffect(runRoot, {runId, primitiveId, targetIdentity, evidenceLocator}) {
  const effectKey = continuity.deriveEffectKey({runId, primitiveId, targetIdentity});
  const candidate = {
    runId, primitiveId, targetIdentity, effectKey, status: 'PROVEN', evidenceLocator,
  };
  const filePath = path.join(runRoot, 'effects', effectKey + '.json');
  let existing = null;
  if (fs.existsSync(filePath)) existing = readJsonRegular(filePath, 'EFFECT_FILE', 16 * 1024);
  const result = continuity.classifyJournalAppend(existing, candidate);
  if (result.disposition === 'CONFLICT') fail('CONFLICT', ...result.reasonCodes);
  if (result.disposition === 'APPEND') {
    atomicWriteFile(filePath, Buffer.from(JSON.stringify(result.effect, null, 2) + '\n'));
  }
  return {effectKey, disposition: result.disposition, effect: result.effect};
}
function validateCheckpointEvent(event) {
  const allowed = new Set([
    'schema', 'checkpoint', 'primitiveId', 'targetIdentity', 'evidenceLocator',
    'nextPrimitive', 'finalReceiptDigest', 'finalReceiptLocator',
  ]);
  exactKeys(event, allowed, 'CHECKPOINT_EVENT');
  if (event.schema !== CHECKPOINT_SCHEMA) fail('UNKNOWN', 'CHECKPOINT_SCHEMA_INVALID');
  if (!CHECKPOINTS.has(event.checkpoint) || event.checkpoint === 'NONE') {
    fail('UNKNOWN', 'CHECKPOINT_NAME_INVALID');
  }
  for (const field of ['primitiveId', 'targetIdentity', 'evidenceLocator']) {
    if (typeof event[field] !== 'string' || !event[field].trim()) {
      fail('UNKNOWN', 'CHECKPOINT_FIELD_INVALID:' + field);
    }
  }
  if (event.nextPrimitive !== null
      && (typeof event.nextPrimitive !== 'string' || !event.nextPrimitive.trim())) {
    fail('UNKNOWN', 'CHECKPOINT_NEXT_PRIMITIVE_INVALID');
  }
  const final = event.checkpoint === 'FINISHED';
  if (final) {
    if (!SHA256_RE.test(event.finalReceiptDigest || '')
        || typeof event.finalReceiptLocator !== 'string' || !event.finalReceiptLocator.trim()) {
      fail('UNKNOWN', 'CHECKPOINT_FINAL_RECEIPT_REQUIRED');
    }
  } else if (event.finalReceiptDigest !== null || event.finalReceiptLocator !== null) {
    fail('UNKNOWN', 'CHECKPOINT_FINAL_RECEIPT_FORBIDDEN');
  }
  return {...event};
}
function persistCheckpoint(runRoot, event) {
  const e = validateCheckpointEvent(event);
  const previous = readState(runRoot);
  if (!previous) fail('UNKNOWN', 'STATE_REQUIRED_BEFORE_CHECKPOINT');
  const oldRank = continuity.checkpointRank(previous.lastDurableCheckpoint);
  const newRank = continuity.checkpointRank(e.checkpoint);
  if (newRank < oldRank) fail('CONFLICT', 'CHECKPOINT_REGRESSION');
  if (newRank === oldRank && previous.lastDurableCheckpoint === e.checkpoint) {
    if (previous.checkpointEvidence !== e.evidenceLocator
        || previous.nextPrimitive !== e.nextPrimitive
        || previous.finalReceiptDigest !== e.finalReceiptDigest) {
      fail('CONFLICT', 'CHECKPOINT_REWRITE_CONFLICT');
    }
    return {status: 'IDEMPOTENT', state: previous};
  }

  persistEffect(runRoot, {
    runId: previous.runId,
    primitiveId: e.primitiveId,
    targetIdentity: e.targetIdentity,
    evidenceLocator: e.evidenceLocator,
  });
  if (e.checkpoint === 'FINISHED') {
    atomicWriteFile(path.join(runRoot, 'final-receipt.ref'), Buffer.from(JSON.stringify({
      digest: e.finalReceiptDigest,
      locator: e.finalReceiptLocator,
    }, null, 2) + '\n'));
  }
  const state = writeState(runRoot, previous, nextState(previous, {
    executionLifecycle: e.checkpoint === 'FINISHED' ? 'FINISHED' : 'RUNNING',
    checkpoint: e.checkpoint,
    checkpointEvidence: e.evidenceLocator,
    nextPrimitive: e.nextPrimitive,
    finalReceiptDigest: e.finalReceiptDigest,
  }));
  return {status: 'PERSISTED', state};
}
function readFinalReceiptRef(runRoot) {
  const file = path.join(runRoot, 'final-receipt.ref');
  if (!fs.existsSync(file)) return null;
  const value = readJsonRegular(file, 'FINAL_RECEIPT_REF', 4096);
  if (!value || !SHA256_RE.test(value.digest || '')
      || typeof value.locator !== 'string' || !value.locator.trim()
      || Object.keys(value).sort().join(',') !== 'digest,locator') {
    fail('UNKNOWN', 'FINAL_RECEIPT_REF_INVALID');
  }
  return value;
}
function buildContinuityEvidence({
  activation,
  state,
  ownerLiveness,
  connectionObservation = 'REATTACHED',
  finalRef,
  journal = null,
  remoteEffect = null,
  continuationAuthority = null,
  nextPrimitive = null,
}) {
  const runEvidence = 'continuity-run:' + activation.runId;
  const checkpoint = state.lastDurableCheckpoint === 'NONE'
    ? {state: 'ABSENT', name: 'NONE', evidenceLocator: null}
    : {state: 'EXACT', name: state.lastDurableCheckpoint, evidenceLocator: state.checkpointEvidence};
  const finalReceipt = finalRef
    ? {
      state: state.finalReceiptDigest === finalRef.digest ? 'EXACT' : 'CONFLICT',
      digest: finalRef.digest,
      evidenceLocator: finalRef.locator,
    }
    : state.executionLifecycle === 'FINISHED'
      ? {state: 'UNKNOWN', digest: null, evidenceLocator: null}
      : {state: 'ABSENT', digest: null, evidenceLocator: null};
  return {
    schemaVersion: 1,
    mode: 'EXECUTION_CONTINUITY_EVIDENCE',
    packetRef: activation.packetRef,
    phase: activation.phase,
    ownerId: activation.continuityOwnerId,
    activationDigest: activation.activationDigest,
    runId: activation.runId,
    attemptId: state.attemptId,
    connectionObservation,
    runtimeCapability: 'DETACHED_CAPABLE',
    ownerLiveness,
    executionLifecycle: state.executionLifecycle,
    checkpoint,
    journal: journal || {state: 'ABSENT', effectKey: null, evidenceLocator: null},
    remoteEffect: remoteEffect || (
      state.executionLifecycle === 'FINISHED'
        || ownerLiveness === 'LIVE'
        || state.lastDurableCheckpoint === 'NONE'
        ? {state: 'NOT_APPLICABLE', primitiveId: null, targetIdentity: null, evidenceLocator: null}
        : {state: 'UNKNOWN', primitiveId: null, targetIdentity: null, evidenceLocator: runEvidence}),
    continuationAuthority: continuationAuthority || (ownerLiveness === 'LIVE'
      ? {state: 'PROVEN', evidenceLocator: runEvidence + ':attempt-' + state.attemptId + ':active-owner'}
      : {state: 'UNKNOWN', evidenceLocator: runEvidence}),
    nextPrimitive: nextPrimitive || (state.nextPrimitive
      ? {state: 'PROVEN', name: state.nextPrimitive, evidenceLocator: state.checkpointEvidence || runEvidence}
      : {state: 'UNKNOWN', name: null, evidenceLocator: runEvidence}),
    finalReceipt,
  };
}
function projectInspect(input, locators = {}) {
  const evidence = buildContinuityEvidence(input);
  const runLocator = 'continuity-run:' + evidence.runId;
  return continuity.projectAgentView(evidence, {
    receiptLocator: locators.receiptLocator || runLocator,
    reportLocator: locators.reportLocator || runLocator,
  });
}
function parseCli(argv) {
  const command = argv[0];
  if (!['start-fixed', 'inspect'].includes(command)) fail('UNKNOWN', 'COMMAND_UNSUPPORTED');
  const values = {};
  for (let i = 1; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || value === undefined) fail('UNKNOWN', 'ARGUMENT_INVALID');
    const name = key.slice(2);
    if (Object.hasOwn(values, name)) fail('UNKNOWN', 'ARGUMENT_DUPLICATE:' + name);
    values[name] = value;
  }
  const allowed = command === 'start-fixed'
    ? new Set([
      'packet', 'parent-manifest-file', 'parent-handoff-file', 'request-file',
      'patch-file', 'validation-request-file', 'pr-request-file',
    ])
    : new Set(['packet', 'run-id']);
  const extras = Object.keys(values).filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !Object.hasOwn(values, key));
  if (extras.length || missing.length) {
    fail('UNKNOWN',
      ...extras.map((key) => 'ARGUMENT_UNSUPPORTED:' + key),
      ...missing.map((key) => 'ARGUMENT_REQUIRED:' + key));
  }
  return {command, values};
}
function socketRequest(payload, {socketPath = SOCKET_PATH, netImpl = net, timeoutMs = 10000} = {}) {
  return new Promise((resolve, reject) => {
    const client = netImpl.createConnection({path: socketPath});
    let bytes = '';
    let settled = false;
    const done = (error, value) => {
      if (settled) return;
      settled = true;
      client.destroy();
      if (error) reject(error); else resolve(value);
    };
    client.setTimeout(timeoutMs, () => done(new RuntimeError('UNKNOWN', ['RUNTIME_SOCKET_TIMEOUT'])));
    client.on('error', () => done(new RuntimeError('UNKNOWN', ['RUNTIME_SOCKET_CONNECT_FAILED'])));
    client.on('connect', () => {
      client.write(JSON.stringify(payload) + '\n');
      client.end();
    });
    client.on('data', (chunk) => {
      bytes += chunk.toString('utf8');
      if (Buffer.byteLength(bytes, 'utf8') > MAX_SOCKET_BYTES) {
        done(new RuntimeError('UNKNOWN', ['RUNTIME_RESPONSE_TOO_LARGE']));
      }
    });
    client.on('end', () => {
      if (settled) return;
      try { done(null, JSON.parse(bytes.trim())); }
      catch (_) { done(new RuntimeError('UNKNOWN', ['RUNTIME_RESPONSE_INVALID'])); }
    });
  });
}
async function runCli(argv = process.argv.slice(2), deps = {}) {
  const {command, values} = parseCli(argv);
  const packetRef = values.packet;
  packetNumber(packetRef);
  const request = deps.socketRequest || socketRequest;
  if (command === 'inspect') {
    if (!RUN_ID_RE.test(values['run-id'] || '')) fail('UNKNOWN', 'RUN_ID_INVALID');
    return request({
      schema: INSPECT_SCHEMA,
      operation: 'inspect',
      packetRef,
      runId: values['run-id'],
    }, deps);
  }
  const parentManifestText = readRegular(values['parent-manifest-file'], 'PARENT_MANIFEST_FILE').toString('utf8');
  const parentHandoffText = readRegular(values['parent-handoff-file'], 'PARENT_HANDOFF_FILE').toString('utf8');
  const requestText = readRegular(values['request-file'], 'REQUEST_FILE').toString('utf8');
  const patchBytes = readRegular(values['patch-file'], 'PATCH_FILE', patchOwner.MAX_PATCH_BYTES);
  const validationRequestText = readRegular(
    values['validation-request-file'], 'VALIDATION_REQUEST_FILE').toString('utf8');
  const prRequestText = readRegular(values['pr-request-file'], 'PR_REQUEST_FILE').toString('utf8');
  const bundle = buildActivation({
    packetRef, parentManifestText, parentHandoffText, requestText, patchBytes,
    validationRequestText, prRequestText,
  });
  const materialized = materializeActivation(bundle, deps);
  return request({
    schema: START_SCHEMA,
    operation: 'start-fixed',
    packetRef,
    phase: PHASE,
    runId: bundle.activation.runId,
    activationDigest: bundle.activation.activationDigest,
    expectedParentManifestId: bundle.guards.parentManifestId,
    expectedLeaseId: bundle.guards.leaseId,
    attemptId: 1,
  }, {...deps, materialized});
}
function errorResult(error) {
  const kind = error instanceof RuntimeError ? error.kind : 'UNKNOWN';
  return {
    schema: START_RESULT_SCHEMA,
    status: kind,
    reasonCodes: error instanceof RuntimeError ? error.reasonCodes : ['UNEXPECTED_ERROR'],
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
  };
}
if (require.main === module) {
  runCli().then((value) => {
    process.stdout.write(JSON.stringify(value, null, 2) + '\n');
    process.exitCode = value?.result === 'PASS'
      || ['RUN_ACCEPTED', 'ALREADY_FINISHED'].includes(value?.status) ? 0 : 2;
  }).catch((error) => {
    process.stdout.write(JSON.stringify(errorResult(error), null, 2) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  CHECKPOINT_ACK_SCHEMA,
  CHECKPOINT_SCHEMA,
  CONTINUITY_OWNER_ID,
  INSPECT_SCHEMA,
  MAX_RUNS_PER_WORKTREE,
  MAX_SOCKET_BYTES,
  PHASE,
  RUNTIME_DIR,
  RUN_ID_RE,
  RuntimeError,
  SOCKET_PATH,
  START_RESULT_SCHEMA,
  START_SCHEMA,
  WORKTREE_ROOT,
  atomicWriteFile,
  buildActivation,
  buildContinuityEvidence,
  errorResult,
  fixedWorktree,
  gitAdminDir,
  initialState,
  materializeActivation,
  nextState,
  ownerImplementationIdentity,
  packetNumber,
  parseCli,
  persistCheckpoint,
  persistEffect,
  projectInspect,
  readFinalReceiptRef,
  readOwnerSourceIdentity,
  readState,
  readStoredActivation,
  runCli,
  runRootFor,
  sha256Bytes,
  sha256Text,
  socketRequest,
  stableHash,
  validateCheckpointEvent,
  writeState,
};
