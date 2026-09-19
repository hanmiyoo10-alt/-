#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const COORDINATION = path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination');
const OWNER_RELATIVE = 'products/chatgpt-mobile-coder-lab/device-ops/working-tree-notebook/mcl-notebook-live-proof';
const OWNER_REF = 'path:' + OWNER_RELATIVE;
const MAX_INPUT_BYTES = 64 * 1024;
const MAX_OWNER_OUTPUT_BYTES = 64 * 1024;
const OWNER_TIMEOUT_MS = 120000;

const taskHandoff = require(path.join(COORDINATION, 'task-handoff.cjs'));
const taskLease = require(path.join(COORDINATION, 'task-lease.cjs'));
const operator = require(path.join(COORDINATION, 'mcl-coordination-operator.cjs'));
const packetProjection = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs'));
const executionReceipt = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs'));

const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const PACKET_REF_RE = /^#[1-9][0-9]*$/;
const HANDOFF_FIELDS = new Set([
  'schema', 'status', 'packet_ref', 'phase', 'route', 'executor', 'effect_class',
  'manifest_id', 'lease_id', 'next_owner', 'reason_codes',
  'mutation_authorized', 'execution_authorized', 'details',
]);
const OWNER_FIELDS = new Set([
  'schema', 'status', 'reason_codes', 'executor', 'base_sha',
  'first_content_sha256', 'second_content_sha256', 'reader_source_sha256',
  'harness_source_sha256', 'head_preserved', 'path_state_preserved',
  'cache_artifact_delta', 'cleanup', 'branch_absent_after',
  'worktree_absent_after', 'control_preserved', 'landing_preserved', 'authority',
]);
const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

class InvocationError extends Error {
  constructor(kind, reasonCodes) {
    super(reasonCodes[0] || kind);
    this.kind = kind;
    this.reasonCodes = unique(reasonCodes);
  }
}

function unique(values) {
  return [...new Set(values)].sort();
}
function same(left, right) {
  return JSON.stringify(taskHandoff.stable(left)) === JSON.stringify(taskHandoff.stable(right));
}
function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}
function exactKeys(value, allowed, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvocationError('UNKNOWN', [field + '_OBJECT_REQUIRED']);
  }
  const extras = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !(key in value));
  if (extras.length || missing.length) {
    throw new InvocationError('UNKNOWN', [
      ...extras.map((key) => field + '_UNKNOWN_FIELD:' + key),
      ...missing.map((key) => field + '_FIELD_REQUIRED:' + key),
    ]);
  }
}
function readBoundedRegularFile(filePath, field) {
  const resolved = path.resolve(filePath);
  let stat;
  try { stat = fs.lstatSync(resolved); }
  catch { throw new InvocationError('UNKNOWN', [field + '_READ_FAILED']); }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new InvocationError('UNKNOWN', [field + '_REGULAR_FILE_REQUIRED']);
  }

  if (stat.size > MAX_INPUT_BYTES) {
    throw new InvocationError('UNKNOWN', [field + '_TOO_LARGE']);
  }
  return fs.readFileSync(resolved, 'utf8');
}

function parseHandoffText(text) {
  let value;
  try { value = JSON.parse(text); }
  catch { throw new InvocationError('UNKNOWN', ['HANDOFF_JSON_INVALID']); }
  exactKeys(value, HANDOFF_FIELDS, 'HANDOFF');
  if (value.schema !== 'mcl-execution-handoff.v1') {
    throw new InvocationError('UNKNOWN', ['HANDOFF_SCHEMA_INVALID']);
  }
  if (value.status !== 'HANDOFF_READY') {
    throw new InvocationError('BLOCKED', ['HANDOFF_NOT_READY']);
  }
  if (!PACKET_REF_RE.test(value.packet_ref || '')) {
    throw new InvocationError('UNKNOWN', ['HANDOFF_PACKET_REF_INVALID']);
  }
  if (value.phase !== '1/1') throw new InvocationError('BLOCKED', ['HANDOFF_PHASE_UNSUPPORTED']);
  if (value.route !== 'S' || value.executor !== 'S') {
    throw new InvocationError('BLOCKED', ['HANDOFF_ROUTE_EXECUTOR_UNSUPPORTED']);
  }
  if (value.effect_class !== 'repository_mutation') {
    throw new InvocationError('BLOCKED', ['HANDOFF_EFFECT_CLASS_UNSUPPORTED']);
  }

  if (!SHA256_RE.test(value.manifest_id || '') || !SHA256_RE.test(value.lease_id || '')) {
    throw new InvocationError('UNKNOWN', ['HANDOFF_IDENTITY_INVALID']);
  }
  if (value.next_owner !== 'existing_route_owner') {
    throw new InvocationError('BLOCKED', ['HANDOFF_NEXT_OWNER_INVALID']);
  }
  if (!Array.isArray(value.reason_codes) || value.reason_codes.length !== 0) {
    throw new InvocationError('BLOCKED', ['HANDOFF_REASON_CODES_NOT_EMPTY']);
  }
  if (value.mutation_authorized !== false || value.execution_authorized !== false) {
    throw new InvocationError('CONFLICT', ['HANDOFF_AUTHORITY_FLAG_CONFLICT']);
  }
  if (value.details !== 'withheld') {
    throw new InvocationError('UNKNOWN', ['HANDOFF_DETAILS_INVALID']);
  }
  return {...value};
}

function parseManifestText(text) {
  try {
    const parsed = JSON.parse(text);
    const verified = taskHandoff.verifyManifestObject(parsed);
    if (!verified.ok) throw new InvocationError('UNKNOWN', verified.errors);
    return verified.value;
  } catch (error) {
    if (error instanceof InvocationError) throw error;
  }
  const envelope = taskHandoff.parseManifest(text);
  if (envelope.status !== 'VALID') {

    throw new InvocationError(
      envelope.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      envelope.reasonCodes.length ? envelope.reasonCodes : ['MANIFEST_INVALID'],
    );
  }
  return envelope.value;
}

function validateManifestBinding(manifest, handoff) {
  const reasons = [];
  if (manifest.manifestId !== handoff.manifest_id) reasons.push('MANIFEST_ID_CONFLICT');
  if (manifest.packetRef !== handoff.packet_ref) reasons.push('MANIFEST_PACKET_REF_CONFLICT');
  if (manifest.phaseClass !== 'EXPERIMENT') reasons.push('MANIFEST_PHASE_CLASS_UNSUPPORTED');
  if (manifest.route !== 'S' || manifest.executor !== 'S') reasons.push('MANIFEST_ROUTE_EXECUTOR_UNSUPPORTED');
  if (manifest.leaseRequirement !== 'REQUIRED' || !manifest.leaseEvidence) {
    reasons.push('MANIFEST_ACTIVE_LEASE_REQUIRED');
  }
  if (manifest.leaseEvidence && manifest.leaseEvidence.leaseId !== handoff.lease_id) {
    reasons.push('MANIFEST_LEASE_ID_CONFLICT');
  }
  if (!manifest.workspace || manifest.workspace.kind !== 'repository') {
    reasons.push('MANIFEST_REPOSITORY_WORKSPACE_REQUIRED');
  }
  if (typeof manifest.workspace?.branch !== 'string' || !manifest.workspace.branch.startsWith('server/')) {
    reasons.push('MANIFEST_S_BRANCH_NAMESPACE_REQUIRED');
  }

  if (typeof manifest.workspace?.worktree !== 'string'
      || !manifest.workspace.worktree.startsWith('/root/nyang-worktrees/')) {
    reasons.push('MANIFEST_S_WORKTREE_NAMESPACE_REQUIRED');
  }
  if (!SHA40_RE.test(manifest.observedBaseSha || '')) reasons.push('MANIFEST_BASE_SHA_INVALID');
  if (!Array.isArray(manifest.scopes) || !manifest.scopes.length) reasons.push('MANIFEST_SCOPES_REQUIRED');
  const refs = [...(manifest.inputRefs || []), ...(manifest.expectedOutputRefs || [])];
  if (!refs.includes(OWNER_REF)) reasons.push('MANIFEST_OWNER_SOURCE_REF_REQUIRED');
  if (!same(manifest.authority, FALSE_AUTHORITY)) reasons.push('MANIFEST_AUTHORITY_CONFLICT');
  if (reasons.length) {
    const conflict = reasons.some((item) => item.endsWith('_CONFLICT'));
    throw new InvocationError(conflict ? 'CONFLICT' : 'BLOCKED', reasons);
  }
}

function validateLeaseAgainstManifest(activeLease, manifest) {
  const reasons = [];
  if (activeLease.packetRef !== manifest.packetRef) reasons.push('LEASE_PACKET_REF_CONFLICT');
  if (activeLease.packetBodySha256 !== manifest.packetBodySha256) reasons.push('LEASE_PACKET_BODY_CONFLICT');
  if (activeLease.route !== manifest.route) reasons.push('LEASE_ROUTE_CONFLICT');
  if (activeLease.executor !== manifest.executor) reasons.push('LEASE_EXECUTOR_CONFLICT');
  if (!same(activeLease.scopes, manifest.scopes)) reasons.push('LEASE_SCOPES_CONFLICT');
  if (!same(activeLease.workspace, manifest.workspace)) reasons.push('LEASE_WORKSPACE_CONFLICT');
  if ((activeLease.observedBaseSha ?? null) !== (manifest.observedBaseSha ?? null)) {
    reasons.push('LEASE_BASE_CONFLICT');
  }

  if (reasons.length) throw new InvocationError('CONFLICT', reasons);
}

function validateCurrentEvidence({packet, context, manifest, handoff}) {
  if (!packet || packet.pull_request || packet.state !== 'open') {
    throw new InvocationError('BLOCKED', ['PACKET_NOT_OPEN']);
  }
  const body = typeof packet.body === 'string' ? packet.body : '';
  const projection = packetProjection.classifyPacketProjection(body);
  if (projection.disposition === 'CONFLICT') {
    throw new InvocationError('CONFLICT', ['PACKET_PROJECTION_CONFLICT', ...projection.reasonCodes]);
  }
  if (projection.disposition !== 'PASS') {
    throw new InvocationError('UNKNOWN', ['PACKET_PROJECTION_UNKNOWN', ...projection.reasonCodes]);
  }
  if (['DONE', 'CANCELLED', 'SUPERSEDED'].includes(projection.lifecycle)) {
    throw new InvocationError('BLOCKED', ['PACKET_TERMINAL']);
  }
  if (projection.interactionStage !== 'EXPERIMENT_CLOSE') {
    throw new InvocationError('BLOCKED', ['PACKET_STAGE_NOT_EXPERIMENT_CLOSE']);
  }
  const observedDigest = taskLease.digest(body);
  if (observedDigest !== manifest.packetBodySha256) {
    throw new InvocationError('CONFLICT', ['PACKET_BODY_DIGEST_CONFLICT']);
  }
  if (context?.packetBodySha256 !== observedDigest) {
    throw new InvocationError('CONFLICT', ['PACKET_BODY_CHANGED_DURING_CURRENTNESS_READ']);
  }

  if (context?.status !== 'READY' || !context.ledgerState) {
    throw new InvocationError('BLOCKED', ['CURRENT_CONTEXT_NOT_READY', ...(context?.reasonCodes || [])]);
  }
  if (!same(context.normalizedScopes, manifest.scopes)) {
    throw new InvocationError('CONFLICT', ['CURRENT_SCOPE_IDENTITY_CONFLICT']);
  }
  const packetLeases = context.ledgerState.activeLeases.filter(
    (item) => item.packetRef === manifest.packetRef,
  );
  if (packetLeases.length === 0) throw new InvocationError('BLOCKED', ['ACTIVE_LEASE_REQUIRED']);
  if (packetLeases.length !== 1) throw new InvocationError('CONFLICT', ['ACTIVE_LEASE_AMBIGUOUS']);
  const activeLease = packetLeases[0];
  if (activeLease.leaseId !== handoff.lease_id
      || activeLease.leaseId !== manifest.leaseEvidence.leaseId) {
    throw new InvocationError('CONFLICT', ['ACTIVE_LEASE_ID_CONFLICT']);
  }
  validateLeaseAgainstManifest(activeLease, manifest);
  return {projection, activeLease};
}

function parseOwnerResult(stdout) {
  if (Buffer.byteLength(stdout || '', 'utf8') > MAX_OWNER_OUTPUT_BYTES) {
    throw new InvocationError('UNKNOWN', ['OWNER_OUTPUT_TOO_LARGE']);
  }
  let value;
  try { value = JSON.parse(String(stdout || '').trim()); }
  catch { throw new InvocationError('UNKNOWN', ['OWNER_OUTPUT_JSON_INVALID']); }

  exactKeys(value, OWNER_FIELDS, 'OWNER_RESULT');
  if (value.schema !== 'mcl-notebook-live-proof.v1') {
    throw new InvocationError('UNKNOWN', ['OWNER_SCHEMA_INVALID']);
  }
  if (!['PASS', 'FAIL', 'BLOCKED'].includes(value.status)) {
    throw new InvocationError('UNKNOWN', ['OWNER_STATUS_INVALID']);
  }
  if (value.executor !== 'S') throw new InvocationError('CONFLICT', ['OWNER_EXECUTOR_CONFLICT']);
  if (!Array.isArray(value.reason_codes)
      || value.reason_codes.some((item) => typeof item !== 'string')) {
    throw new InvocationError('UNKNOWN', ['OWNER_REASON_CODES_INVALID']);
  }
  if (!same(value.authority, FALSE_AUTHORITY)) {
    throw new InvocationError('CONFLICT', ['OWNER_AUTHORITY_CONFLICT']);
  }
  return value;
}

function validateOwnerOutcome(run, owner, manifest) {
  const status = run?.status;
  if (run?.error || status === null || run?.signal) {
    return {kind: 'BLOCKED', reasonCodes: ['OWNER_SPAWN_INFRA_ERROR']};
  }
  if (owner.base_sha !== manifest.observedBaseSha) {
    return {kind: 'CONFLICT', reasonCodes: ['OWNER_BASE_SHA_CONFLICT']};
  }
  if (owner.status === 'PASS') {
    const reasons = [];

    if (status !== 0) reasons.push('OWNER_PASS_EXIT_CONFLICT');
    if (owner.reason_codes.length) reasons.push('OWNER_PASS_REASON_CONFLICT');
    if (!SHA256_RE.test(owner.first_content_sha256 || '')) reasons.push('OWNER_FIRST_HASH_INVALID');
    if (!SHA256_RE.test(owner.second_content_sha256 || '')) reasons.push('OWNER_SECOND_HASH_INVALID');
    if (owner.first_content_sha256 === owner.second_content_sha256) reasons.push('OWNER_CONTENT_HASH_NOT_CHANGED');
    if (!SHA256_RE.test(owner.reader_source_sha256 || '')) reasons.push('OWNER_READER_HASH_INVALID');
    if (!SHA256_RE.test(owner.harness_source_sha256 || '')) reasons.push('OWNER_HARNESS_HASH_INVALID');
    if (owner.head_preserved !== true) reasons.push('OWNER_HEAD_NOT_PRESERVED');
    if (owner.path_state_preserved !== true) reasons.push('OWNER_PATH_STATE_NOT_PRESERVED');
    if (owner.cache_artifact_delta !== 'NONE') reasons.push('OWNER_CACHE_DELTA_CONFLICT');
    if (owner.cleanup !== 'COMPLETE') reasons.push('OWNER_CLEANUP_INCOMPLETE');
    if (owner.branch_absent_after !== true) reasons.push('OWNER_BRANCH_REMAINS');
    if (owner.worktree_absent_after !== true) reasons.push('OWNER_WORKTREE_REMAINS');
    if (owner.control_preserved !== true) reasons.push('OWNER_CONTROL_NOT_PRESERVED');
    if (owner.landing_preserved !== true) reasons.push('OWNER_LANDING_NOT_PRESERVED');
    return reasons.length ? {kind: 'CONFLICT', reasonCodes: reasons}
      : {kind: 'PASS', reasonCodes: []};
  }
  if (status === 0) return {kind: 'CONFLICT', reasonCodes: ['OWNER_NONPASS_ZERO_EXIT_CONFLICT']};
  if (owner.status === 'FAIL') {
    return {kind: 'FAIL', reasonCodes: unique(['NOTEBOOK_OWNER_FAIL', ...owner.reason_codes])};
  }

  return {kind: 'BLOCKED', reasonCodes: unique(['NOTEBOOK_OWNER_BLOCKED', ...owner.reason_codes])};
}

function stateFor(kind, reasonCodes) {
  if (kind === 'PASS') return {
    attentionState: 'COMPLETE', result: 'PASS', stepResult: 'PASS',
    reasonCodes: [], requiredUnknowns: [], conflicts: [], blockers: [],
    nextLegalAction: 'RELEASE_D013_AND_RECORD_D014_COMPLETION',
  };
  if (kind === 'FAIL') return {
    attentionState: 'COMPLETE', result: 'FAIL', stepResult: 'FAIL',
    reasonCodes, requiredUnknowns: [], conflicts: [], blockers: [],
    nextLegalAction: 'DRILL_DOWN_NOTEBOOK_OWNER_FAILURE',
  };
  if (kind === 'CONFLICT') return {
    attentionState: 'UNKNOWN', result: 'CONFLICT', stepResult: 'CONFLICT',
    reasonCodes: ['OWNER_INVOKE_EVIDENCE_CONFLICT'], requiredUnknowns: [],
    conflicts: reasonCodes, blockers: [], nextLegalAction: 'RESOLVE_OWNER_INVOKE_CONFLICT',
  };
  if (kind === 'UNKNOWN') return {
    attentionState: 'UNKNOWN', result: 'UNKNOWN', stepResult: 'UNKNOWN',
    reasonCodes, requiredUnknowns: reasonCodes, conflicts: [], blockers: [],
    nextLegalAction: 'RESOLVE_OWNER_INVOKE_UNKNOWN',
  };
  return {

    attentionState: 'BLOCKED', result: 'BLOCKED', stepResult: 'BLOCKED',
    reasonCodes, requiredUnknowns: [], conflicts: [], blockers: reasonCodes,
    nextLegalAction: 'RESOLVE_OWNER_INVOKE_BLOCK',
  };
}

function projectGenericReceipt({manifest, kind, reasonCodes = [], owner = null,
  exitCode = null, ownerSourceSha256}) {
  const state = stateFor(kind, unique(reasonCodes));
  const locator = 'receipt:mcl-notebook-owner-invoke:' + (manifest?.manifestId || 'unknown');
  const cleanupResult = owner?.cleanup === 'COMPLETE' ? 'PASS'
    : owner ? (owner.cleanup === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN') : 'SKIPPED';
  const preservationResult = owner
    ? (owner.control_preserved === true && owner.landing_preserved === true ? 'PASS' : 'CONFLICT')
    : 'SKIPPED';
  const input = {
    schemaVersion: 1,
    operationId: 'mcl-notebook-owner-invoke:' + (manifest?.manifestId || 'unknown'),
    primitiveId: 'mcl:notebook-live-proof',
    sourceIdentity: {kind: 'repository-file', locator: OWNER_REF, identity: ownerSourceSha256},
    executionSurface: 'MCL:S',
    stage: 'HOST_ORCHESTRATED_OWNER_INVOKE',
    attentionState: state.attentionState,
    result: state.result,
    proofScope: 'one fixed S mcl-notebook-live-proof invocation and bounded cleanup/preservation evidence only',

    steps: [
      {name: 'owner-invocation', result: state.stepResult, evidenceLocator: locator},
      {name: 'owner-cleanup', result: cleanupResult, evidenceLocator: locator},
      {name: 'control-landing-preservation', result: preservationResult, evidenceLocator: locator},
    ],
    counters: [
      {name: 'owner_spawned', value: owner ? 1 : 0},
      {name: 'cleanup_complete', value: owner?.cleanup === 'COMPLETE' ? 1 : 0},
      {name: 'head_preserved', value: owner?.head_preserved === true ? 1 : 0},
    ],
    affectedFiles: [],
    artifactLocators: [locator],
    reasonCodes: state.reasonCodes,
    requiredUnknowns: state.requiredUnknowns,
    conflicts: state.conflicts,
    blockers: state.blockers,
    exitCode,
    stderrTail: null,
    nextLegalAction: state.nextLegalAction,
  };
  return executionReceipt.projectExecutionReceipt(input);
}

function safeChildEnv(env = process.env) {
  const out = {};
  for (const key of ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR']) {
    if (typeof env[key] === 'string' && env[key]) out[key] = env[key];

  }
  return out;
}
function ownerArgs(manifest) {
  return ['--executor', 'S', '--base-sha', manifest.observedBaseSha,
    '--branch', manifest.workspace.branch, '--worktree', manifest.workspace.worktree];
}

function invokeWithCurrentEvidence({handoff, manifest, packet, context,
  spawnSyncImpl = childProcess.spawnSync, root = ROOT, env = process.env}) {
  const ownerPath = path.join(root, OWNER_RELATIVE);
  const ownerHash = sha256File(ownerPath);
  try {
    validateManifestBinding(manifest, handoff);
    validateCurrentEvidence({packet, context, manifest, handoff});
  } catch (error) {
    if (!(error instanceof InvocationError)) throw error;
    return projectGenericReceipt({
      manifest, kind: error.kind, reasonCodes: error.reasonCodes, ownerSourceSha256: ownerHash,
    });
  }
  let run;
  try {
    run = spawnSyncImpl(ownerPath, ownerArgs(manifest), {
      cwd: root, encoding: 'utf8', timeout: OWNER_TIMEOUT_MS,
      maxBuffer: MAX_OWNER_OUTPUT_BYTES, shell: false, env: safeChildEnv(env),
    });
  } catch {
    return projectGenericReceipt({

      manifest, kind: 'BLOCKED', reasonCodes: ['OWNER_SPAWN_THROW'],
      ownerSourceSha256: ownerHash,
    });
  }
  if (run?.error || run?.status === null || run?.signal) {
    return projectGenericReceipt({
      manifest, kind: 'BLOCKED', reasonCodes: ['OWNER_SPAWN_INFRA_ERROR'],
      exitCode: Number.isInteger(run?.status) ? run.status : null, ownerSourceSha256: ownerHash,
    });
  }
  let owner;
  try { owner = parseOwnerResult(run.stdout || ''); }
  catch (error) {
    if (!(error instanceof InvocationError)) throw error;
    return projectGenericReceipt({
      manifest, kind: error.kind, reasonCodes: error.reasonCodes,
      exitCode: Number.isInteger(run.status) ? run.status : null, ownerSourceSha256: ownerHash,
    });
  }
  const outcome = validateOwnerOutcome(run, owner, manifest);
  return projectGenericReceipt({
    manifest, kind: outcome.kind, reasonCodes: outcome.reasonCodes, owner,
    exitCode: Number.isInteger(run.status) ? run.status : null, ownerSourceSha256: ownerHash,
  });
}

async function loadCurrentEvidence({repo, manifest, env = process.env, runner, fetchImpl}) {
  const client = operator.createOperatorGitHubClient({repo, env, runner, fetchImpl});

  const context = await operator.readContext({
    client, packetRef: manifest.packetRef, scopes: manifest.scopes,
  });
  const number = operator.packetNumber(manifest.packetRef);
  const packet = await client.api('/issues/' + number);
  return {packet, context};
}

async function invokeLive({repo, handoffText, manifestText, env = process.env,
  runner, fetchImpl, spawnSyncImpl = childProcess.spawnSync, root = ROOT}) {
  const manifest = parseManifestText(manifestText);
  let handoff;
  try {
    handoff = parseHandoffText(handoffText);
    validateManifestBinding(manifest, handoff);
  } catch (error) {
    if (!(error instanceof InvocationError)) throw error;
    return projectGenericReceipt({
      manifest, kind: error.kind, reasonCodes: error.reasonCodes,
      ownerSourceSha256: sha256File(path.join(root, OWNER_RELATIVE)),
    });
  }
  const current = await loadCurrentEvidence({repo, manifest, env, runner, fetchImpl});
  return invokeWithCurrentEvidence({
    handoff, manifest, packet: current.packet, context: current.context,
    spawnSyncImpl, root, env,
  });
}
function parseArgs(argv = process.argv.slice(2)) {
  const allowed = new Set(['repo', 'handoff-file', 'manifest-file']);
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--') || i + 1 >= argv.length) throw new Error('ARGUMENT_INVALID');
    const key = token.slice(2);
    if (!allowed.has(key) || key in values) throw new Error('ARGUMENT_INVALID');
    values[key] = argv[++i];
  }
  if (Object.keys(values).length !== 3 || !values.repo
      || !values['handoff-file'] || !values['manifest-file']) {
    throw new Error('ARGUMENT_INVALID');
  }
  if (!operator.validateRepo(values.repo)) throw new Error('REPOSITORY_INVALID');
  return {repo: values.repo, handoffFile: values['handoff-file'],
    manifestFile: values['manifest-file']};
}

async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  const handoffText = readBoundedRegularFile(args.handoffFile, 'HANDOFF_FILE');
  const manifestText = readBoundedRegularFile(args.manifestFile, 'MANIFEST_FILE');
  const receipt = await invokeLive({
    repo: args.repo, handoffText, manifestText, env: options.env || process.env,
    runner: options.runner, fetchImpl: options.fetchImpl,
    spawnSyncImpl: options.spawnSyncImpl || childProcess.spawnSync,
    root: options.root || ROOT,
  });
  return {text: JSON.stringify(receipt, null, 2) + '\n',
    code: executionReceipt.exitCodeFor(receipt)};
}

if (require.main === module) {
  runCli().then(({text, code}) => {
    process.stdout.write(text);
    process.exitCode = code;
  }).catch((error) => {
    process.stderr.write(String(error?.message || error) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  FALSE_AUTHORITY, HANDOFF_FIELDS, MAX_INPUT_BYTES, MAX_OWNER_OUTPUT_BYTES,
  OWNER_REF, OWNER_RELATIVE, OWNER_TIMEOUT_MS, InvocationError,
  invokeLive, invokeWithCurrentEvidence, loadCurrentEvidence, ownerArgs,
  parseArgs, parseHandoffText, parseManifestText, parseOwnerResult,
  projectGenericReceipt, runCli, safeChildEnv, validateCurrentEvidence,
  validateLeaseAgainstManifest, validateManifestBinding, validateOwnerOutcome,
};
