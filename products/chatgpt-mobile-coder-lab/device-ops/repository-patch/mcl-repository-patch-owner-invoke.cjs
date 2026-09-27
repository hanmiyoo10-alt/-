#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const COORDINATION = path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination');
const PRIMITIVE_RELATIVE =
  'products/chatgpt-mobile-coder-lab/device-ops/repository-patch/mcl-worktree-patch.py';
const PRIMITIVE_REF = 'path:' + PRIMITIVE_RELATIVE;
const MAX_INPUT_BYTES = 64 * 1024;
const MAX_PATCH_BYTES = 64 * 1024;
const PRIMITIVE_TIMEOUT_MS = 120000;
const MAX_PRIMITIVE_OUTPUT_BYTES = 64 * 1024;
const MAX_REPORT_BYTES = 16 * 1024;
const OUTPUT_FORMATS = new Set(['receipt', 'agent-view']);
const DETACHED_CHECKPOINT_SCHEMA = 'mcl-detached-owner-checkpoint.v1';

const taskHandoff = require(path.join(COORDINATION, 'task-handoff.cjs'));
const taskLease = require(path.join(COORDINATION, 'task-lease.cjs'));
const operator = require(path.join(COORDINATION, 'mcl-coordination-operator.cjs'));
const workspaceHolder = require(path.join(COORDINATION, 'mcl-workspace-holder.cjs'));
const packetProjection = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs'));
const executionReceipt = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs'));
const agentDecisionView = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-harness/agent-decision-view.cjs'));

const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const PACKET_REF_RE = /^#[1-9][0-9]*$/;
const REQUEST_FIELDS = new Set(['schema', 'message', 'expected_paths', 'patch_sha256']);
const CONTINUATION_REQUEST_FIELDS = new Set([
  'schema', 'message', 'expected_paths', 'prepared_digest',
  'recovery_receipt_digest', 'prior_manifest_id',
]);
const CONTINUATION_REQUEST_SCHEMA = 'mcl-repository-prepared-continuation-request.v1';
const RECOVERY_REF_PREFIX = 'receipt:effect-recovery:';
const PRIOR_MANIFEST_REF_PREFIX = 'receipt:mcl-task-manifest:';
const FIXED_BOT_NAME = 'mcl-repository-patch[bot]';
const FIXED_BOT_EMAIL = 'mcl-repository-patch@users.noreply.github.com';
const VALIDATION_REQUEST_FIELDS = new Set(['schema', 'profile']);
const VALIDATION_REQUEST_SCHEMA = 'mcl-repository-validation-request.v1';
const VALIDATION_REF_PREFIX = 'receipt:mcl-repository-validation-request:';
const VALIDATION_CONTRACT_REF_PREFIX = 'receipt:mcl-repository-validation-contract:';
const IMPLEMENTATION_VALIDATION_ADAPTER_REF_PREFIX =
  'receipt:mcl-implementation-validation-adapters:';
const IMPLEMENTATION_VALIDATION_ADAPTER_SCHEMA =
  'mcl-implementation-validation-adapters.v1';
const IMPLEMENTATION_VALIDATION_ARTIFACT_SCHEMA =
  'mcl-implementation-validation-artifact.v1';
const MAX_VALIDATION_ARTIFACT_BYTES = 32 * 1024;
const STAGE_OWNER_ID = 'MCL_KNOWN_OWNER_REPOSITORY_IMPLEMENTATION_V1';
const MUTATION_PRIMITIVE_ID = 'REPOSITORY_PATCH_V1';
const D014_VALIDATION_PROFILE = 'mcl:d014-completion-set:v1';
const VALIDATION_CONTINUATION_PROFILE = 'repo:validation-continuation:v1';
const PUBLISHED_PROGRESS_RECOVERY_PROFILE = 'repo:published-progress-recovery:v1';
const D014_COMPLETION_SET_PATHS = Object.freeze([
  'products/chatgpt-mobile-coder-lab/coordination/completion-receipt-set.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/tests/test-completion-receipt-set.cjs',
  'products/chatgpt-mobile-coder-lab/docs/task-handoff.md',
]);
const VALIDATION_CONTINUATION_PATHS = Object.freeze([
  '.github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/tests/stage-receipt-contract.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/validation-continuation/README.md',
  '.github/plugin-control-plane/canonical-main/work-harness/validation-continuation/validation-continuation-owner.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/validation-continuation/tests/validation-continuation-owner-contract.cjs',
]);
const PUBLISHED_PROGRESS_RECOVERY_PATHS = Object.freeze([
  '.github/plugin-control-plane/canonical-main/work-harness/published-progress-recovery/README.md',
  '.github/plugin-control-plane/canonical-main/work-harness/published-progress-recovery/published-progress-recovery.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/published-progress-recovery/tests/published-progress-recovery-contract.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/published-progress-recovery/README.md',
  'products/chatgpt-mobile-coder-lab/coordination/published-progress-recovery/mcl-published-progress-recovery-inspect.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/published-progress-recovery/tests/test-mcl-published-progress-recovery-inspect.cjs',
]);
const D014_VALIDATION_SCOPES = Object.freeze([
  ...D014_COMPLETION_SET_PATHS.map((item) => 'path:' + item),
  'surface:mcl:d014-completion-set',
].sort());
const VALIDATION_CONTINUATION_SCOPES = Object.freeze([
  ...VALIDATION_CONTINUATION_PATHS.map((item) => 'path:' + item),
  'surface:repo:validation-continuation-projection',
].sort());
const PUBLISHED_PROGRESS_RECOVERY_SCOPES = Object.freeze([
  ...PUBLISHED_PROGRESS_RECOVERY_PATHS.map((item) => 'path:' + item),
  'surface:mcl:published-progress-recovery-inspection',
  'surface:repo:published-progress-recovery-projection',
].sort());
const PREPARED_VALIDATION_TIMEOUT_MS = 120000;
const MAX_VALIDATION_OUTPUT_BYTES = 64 * 1024;
const D014_VALIDATION_CHECKS = Object.freeze([
  Object.freeze({
    name: 'completion-source-syntax',
    args: ['--check', D014_COMPLETION_SET_PATHS[0]],
  }),
  Object.freeze({
    name: 'completion-test-syntax',
    args: ['--check', D014_COMPLETION_SET_PATHS[1]],
  }),
  Object.freeze({
    name: 'completion-contract',
    args: ['--test', D014_COMPLETION_SET_PATHS[1]],
  }),
  Object.freeze({
    name: 'task-handoff-contract',
    args: ['--test', 'products/chatgpt-mobile-coder-lab/coordination/tests/test-task-handoff.cjs'],
  }),
]);
const VALIDATION_CONTINUATION_CHECKS = Object.freeze([
  Object.freeze({
    name: 'stage-receipt-syntax',
    args: ['--check', VALIDATION_CONTINUATION_PATHS[0]],
  }),
  Object.freeze({
    name: 'validation-continuation-syntax',
    args: ['--check', VALIDATION_CONTINUATION_PATHS[3]],
  }),
  Object.freeze({
    name: 'stage-receipt-contract',
    args: ['--test', VALIDATION_CONTINUATION_PATHS[1]],
  }),
  Object.freeze({
    name: 'validation-continuation-contract',
    args: ['--test', VALIDATION_CONTINUATION_PATHS[4]],
  }),
  Object.freeze({
    name: 'validation-merge-contract',
    args: ['--test', '.github/plugin-control-plane/canonical-main/work-harness/validation-merge/tests/validation-merge-owner-contract.cjs'],
  }),
  Object.freeze({
    name: 'work-system-contract',
    args: ['--test', '.github/plugin-control-plane/canonical-main/tests/work-system-contract.cjs'],
  }),
  Object.freeze({
    name: 'execution-receipt-contract',
    args: ['--test', '.github/plugin-control-plane/canonical-main/work-harness/tests/execution-receipt-contract.cjs'],
  }),
  Object.freeze({
    name: 'agent-decision-view-contract',
    args: ['--test', '.github/plugin-control-plane/canonical-main/work-harness/tests/agent-decision-view-contract.cjs'],
  }),
]);
const PUBLISHED_PROGRESS_RECOVERY_CHECKS = Object.freeze([
  Object.freeze({name: 'published-progress-source-syntax', args: ['--check', PUBLISHED_PROGRESS_RECOVERY_PATHS[1]]}),
  Object.freeze({name: 'published-progress-adapter-syntax', args: ['--check', PUBLISHED_PROGRESS_RECOVERY_PATHS[4]]}),
  Object.freeze({name: 'published-progress-contract', args: ['--test', PUBLISHED_PROGRESS_RECOVERY_PATHS[2]]}),
  Object.freeze({name: 'published-progress-adapter-contract', args: ['--test', PUBLISHED_PROGRESS_RECOVERY_PATHS[5]]}),
  Object.freeze({name: 'rdc-session-evidence-contract', args: ['--test', 'products/chatgpt-mobile-coder-lab/device-ops/rdc-session-evidence/tests/test-mcl-rdc-session-evidence.cjs']}),
  Object.freeze({name: 'effect-recovery-contract', args: ['--test', 'products/chatgpt-mobile-coder-lab/coordination/effect-recovery/tests/test-effect-recovery-inspect.cjs']}),
]);

function buildValidationProfile({profileId, paths, scopes, checks}) {
  const core = taskHandoff.stable({
    profileId,
    profileVersion: 1,
    allowedStageOwners: [STAGE_OWNER_ID],
    mutationPrimitiveId: MUTATION_PRIMITIVE_ID,
    scopeShape: 'EXACT_PATH_SET',
    paths: [...paths].sort(),
    scopes: [...scopes].sort(),
    checks: checks.map((check) => ({
      checkId: check.name,
      args: [...check.args],
      timeoutMs: PREPARED_VALIDATION_TIMEOUT_MS,
    })),
    resultVocabulary: ['PASS', 'FAIL', 'INFRA', 'NOT_RUN'],
  });
  return Object.freeze({
    ...core,
    contractDigest: sha256Bytes(Buffer.from(JSON.stringify(core), 'utf8')),
  });
}
const VALIDATION_PROFILES = Object.freeze([
  buildValidationProfile({
    profileId: D014_VALIDATION_PROFILE,
    paths: D014_COMPLETION_SET_PATHS,
    scopes: D014_VALIDATION_SCOPES,
    checks: D014_VALIDATION_CHECKS,
  }),
  buildValidationProfile({
    profileId: VALIDATION_CONTINUATION_PROFILE,
    paths: VALIDATION_CONTINUATION_PATHS,
    scopes: VALIDATION_CONTINUATION_SCOPES,
    checks: VALIDATION_CONTINUATION_CHECKS,
  }),
  buildValidationProfile({
    profileId: PUBLISHED_PROGRESS_RECOVERY_PROFILE,
    paths: PUBLISHED_PROGRESS_RECOVERY_PATHS,
    scopes: PUBLISHED_PROGRESS_RECOVERY_SCOPES,
    checks: PUBLISHED_PROGRESS_RECOVERY_CHECKS,
  }),
]);
function buildImplementationValidationAdapterContract(profiles = VALIDATION_PROFILES) {
  const adapters = [];
  for (const profile of profiles) {
    for (const check of profile.checks) {
      if (!Array.isArray(check.args) || check.args.length !== 2
          || !['--check', '--test'].includes(check.args[0])) {
        throw new Error('IMPLEMENTATION_VALIDATION_CHECK_SHAPE_UNSUPPORTED:' + check.checkId);
      }
      validateRepoPath(check.args[1]);
      adapters.push({
        profileId: profile.profileId,
        checkId: check.checkId,
        launcher: 'node',
        cwdPolicy: 'manifest-worktree',
        pathArgIndex: 1,
        canonicalPath: check.args[1],
        aliases: [],
        timeoutMs: check.timeoutMs,
        resultParser: 'node-exit-v1',
      });
    }
  }
  const core = taskHandoff.stable({
    schema: IMPLEMENTATION_VALIDATION_ADAPTER_SCHEMA,
    adapterVersion: 1,
    adapters,
  });
  return Object.freeze({
    ...core,
    contractDigest: sha256Bytes(Buffer.from(JSON.stringify(core), 'utf8')),
  });
}
const IMPLEMENTATION_VALIDATION_ADAPTER_CONTRACT =
  buildImplementationValidationAdapterContract();
const HANDOFF_FIELDS = new Set([
  'schema', 'status', 'packet_ref', 'phase', 'route', 'executor', 'effect_class',
  'manifest_id', 'lease_id', 'next_owner', 'reason_codes',
  'mutation_authorized', 'execution_authorized', 'details',
]);
const PRIMITIVE_FIELDS = new Set([
  'schema', 'status', 'phase', 'reason_codes', 'base_sha', 'branch',
  'changed_paths', 'patch_sha256', 'prepared_digest', 'new_head', 'authority', 'details',
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
function sha256Bytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function sha256File(filePath) {
  return sha256Bytes(fs.readFileSync(filePath));
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
function readBoundedRegularFile(filePath, field, maxBytes = MAX_INPUT_BYTES) {
  const resolved = path.resolve(filePath);
  let stat;
  try { stat = fs.lstatSync(resolved); }
  catch { throw new InvocationError('UNKNOWN', [field + '_READ_FAILED']); }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new InvocationError('UNKNOWN', [field + '_REGULAR_FILE_REQUIRED']);
  }
  if (stat.size > maxBytes) throw new InvocationError('UNKNOWN', [field + '_TOO_LARGE']);
  return fs.readFileSync(resolved);
}

function validateRepoPath(value) {
  if (typeof value !== 'string' || !value || value.startsWith('/')
      || value.includes('\\') || value.includes('\0')) {
    throw new InvocationError('UNKNOWN', ['REQUEST_PATH_INVALID']);
  }
  const parts = value.split('/');
  if (parts.some((part) => ['', '.', '..'].includes(part))) {
    throw new InvocationError('UNKNOWN', ['REQUEST_PATH_INVALID']);
  }
}
function parseRequestText(text) {
  let value;
  try { value = JSON.parse(text); }
  catch { throw new InvocationError('UNKNOWN', ['REQUEST_JSON_INVALID']); }
  exactKeys(value, REQUEST_FIELDS, 'REQUEST');
  if (value.schema !== 'mcl-repository-patch-request.v1') {
    throw new InvocationError('UNKNOWN', ['REQUEST_SCHEMA_INVALID']);
  }
  if (typeof value.message !== 'string' || value.message.length < 1
      || value.message.length > 200 || value.message.includes('\0')) {
    throw new InvocationError('UNKNOWN', ['REQUEST_MESSAGE_INVALID']);
  }
  if (!Array.isArray(value.expected_paths) || value.expected_paths.length < 1
      || value.expected_paths.length > 20
      || value.expected_paths.some((item) => typeof item !== 'string')) {
    throw new InvocationError('UNKNOWN', ['REQUEST_PATHS_INVALID']);
  }
  if (new Set(value.expected_paths).size !== value.expected_paths.length) {
    throw new InvocationError('UNKNOWN', ['REQUEST_PATHS_DUPLICATE']);
  }
  value.expected_paths.forEach(validateRepoPath);
  if (!SHA256_RE.test(value.patch_sha256 || '')) {
    throw new InvocationError('UNKNOWN', ['REQUEST_PATCH_HASH_INVALID']);
  }
  return {
    schema: value.schema,
    message: value.message,
    expected_paths: [...value.expected_paths].sort(),
    patch_sha256: value.patch_sha256,
  };
}


function parsePreparedContinuationRequestText(text) {
  let value;
  try { value = JSON.parse(text); }
  catch { throw new InvocationError('UNKNOWN', ['CONTINUATION_REQUEST_JSON_INVALID']); }
  exactKeys(value, CONTINUATION_REQUEST_FIELDS, 'CONTINUATION_REQUEST');
  if (value.schema !== CONTINUATION_REQUEST_SCHEMA) {
    throw new InvocationError('UNKNOWN', ['CONTINUATION_REQUEST_SCHEMA_INVALID']);
  }
  if (typeof value.message !== 'string' || value.message.length < 1
      || value.message.length > 200 || /[\u0000-\u001f\u007f]/.test(value.message)) {
    throw new InvocationError('UNKNOWN', ['CONTINUATION_REQUEST_MESSAGE_INVALID']);
  }
  if (!Array.isArray(value.expected_paths) || value.expected_paths.length < 1
      || value.expected_paths.length > 20
      || value.expected_paths.some((item) => typeof item !== 'string')) {
    throw new InvocationError('UNKNOWN', ['CONTINUATION_REQUEST_PATHS_INVALID']);
  }
  if (new Set(value.expected_paths).size !== value.expected_paths.length) {
    throw new InvocationError('UNKNOWN', ['CONTINUATION_REQUEST_PATHS_DUPLICATE']);
  }
  value.expected_paths.forEach(validateRepoPath);
  for (const [field, reason] of [
    ['prepared_digest', 'CONTINUATION_PREPARED_DIGEST_INVALID'],
    ['recovery_receipt_digest', 'CONTINUATION_RECOVERY_RECEIPT_INVALID'],
    ['prior_manifest_id', 'CONTINUATION_PRIOR_MANIFEST_INVALID'],
  ]) {
    if (!SHA256_RE.test(value[field] || '')) throw new InvocationError('UNKNOWN', [reason]);
  }
  return {
    schema: value.schema,
    message: value.message,
    expected_paths: [...value.expected_paths].sort(),
    prepared_digest: value.prepared_digest,
    recovery_receipt_digest: value.recovery_receipt_digest,
    prior_manifest_id: value.prior_manifest_id,
  };
}

function validationProfileById(profileId, profiles = VALIDATION_PROFILES) {
  return profiles.find((profile) => profile.profileId === profileId) || null;
}
function resolveValidationProfileForScopes(scopes, profiles = VALIDATION_PROFILES) {
  const normalized = Array.isArray(scopes) ? [...scopes].sort() : [];
  const matches = profiles.filter((profile) => same(profile.scopes, normalized));
  if (matches.length === 0) {
    throw new InvocationError('BLOCKED', ['NO_REVIEWED_VALIDATION_PROFILE']);
  }
  if (matches.length > 1) {
    throw new InvocationError('CONFLICT', ['VALIDATION_PROFILE_AMBIGUOUS']);
  }
  return matches[0];
}
function parseValidationRequestText(text) {
  let value;
  try { value = JSON.parse(text); }
  catch { throw new InvocationError('UNKNOWN', ['VALIDATION_REQUEST_JSON_INVALID']); }
  exactKeys(value, VALIDATION_REQUEST_FIELDS, 'VALIDATION_REQUEST');
  if (value.schema !== VALIDATION_REQUEST_SCHEMA) {
    throw new InvocationError('UNKNOWN', ['VALIDATION_REQUEST_SCHEMA_INVALID']);
  }
  if (!validationProfileById(value.profile)) {
    throw new InvocationError('BLOCKED', ['VALIDATION_PROFILE_UNSUPPORTED']);
  }
  return {schema: value.schema, profile: value.profile};
}
function manifestValidationRefs(manifest) {
  return (manifest?.inputRefs || []).filter(
    (item) => typeof item === 'string' && item.startsWith(VALIDATION_REF_PREFIX),
  );
}
function manifestValidationContractRefs(manifest) {
  return (manifest?.inputRefs || []).filter(
    (item) => typeof item === 'string' && item.startsWith(VALIDATION_CONTRACT_REF_PREFIX),
  );
}
function manifestImplementationValidationAdapterRefs(manifest) {
  return (manifest?.inputRefs || []).filter(
    (item) => typeof item === 'string'
      && item.startsWith(IMPLEMENTATION_VALIDATION_ADAPTER_REF_PREFIX),
  );
}
function prepareValidationBinding({
  manifest, request, validationRequestText, validationRequestFile,
}) {
  const refs = manifestValidationRefs(manifest);
  const contractRefs = manifestValidationContractRefs(manifest);
  const adapterRefs = manifestImplementationValidationAdapterRefs(manifest);
  if (typeof validationRequestText !== 'string' || !validationRequestFile) {
    throw new InvocationError('BLOCKED', ['VALIDATION_REQUEST_INPUT_REQUIRED']);
  }
  const fileBytes = readBoundedRegularFile(validationRequestFile, 'VALIDATION_REQUEST_FILE');
  const textBytes = Buffer.from(validationRequestText, 'utf8');
  if (!fileBytes.equals(textBytes)) {
    throw new InvocationError('CONFLICT', ['VALIDATION_REQUEST_TEXT_FILE_CONFLICT']);
  }
  const validationRequest = parseValidationRequestText(validationRequestText);
  const profile = validationProfileById(validationRequest.profile);
  if (!profile) {
    throw new InvocationError('BLOCKED', ['VALIDATION_PROFILE_UNSUPPORTED']);
  }
  if (!same(request.expected_paths, profile.paths)) {
    throw new InvocationError('BLOCKED', ['VALIDATION_PROFILE_PATHS_UNSUPPORTED']);
  }
  if (!same(manifest.scopes, profile.scopes)) {
    throw new InvocationError('BLOCKED', ['VALIDATION_PROFILE_SCOPE_UNSUPPORTED']);
  }
  const digest = sha256Bytes(fileBytes);
  const expectedRef = VALIDATION_REF_PREFIX + digest;
  if (refs.length === 0) {
    throw new InvocationError('BLOCKED', ['VALIDATION_REQUEST_REF_REQUIRED']);
  }
  if (refs.length !== 1) {
    throw new InvocationError('CONFLICT', ['VALIDATION_REQUEST_REF_AMBIGUOUS']);
  }
  if (refs[0] !== expectedRef) {
    throw new InvocationError('CONFLICT', ['VALIDATION_REQUEST_REF_CONFLICT']);
  }
  const expectedContractRef = VALIDATION_CONTRACT_REF_PREFIX + profile.contractDigest;
  if (contractRefs.length === 0) {
    throw new InvocationError('BLOCKED', ['VALIDATION_CONTRACT_REF_REQUIRED']);
  }
  if (contractRefs.length !== 1) {
    throw new InvocationError('CONFLICT', ['VALIDATION_CONTRACT_REF_AMBIGUOUS']);
  }
  if (contractRefs[0] !== expectedContractRef) {
    throw new InvocationError('CONFLICT', ['VALIDATION_CONTRACT_REF_CONFLICT']);
  }
  let adapterMode = 'LEGACY';
  let adapterContractDigest = null;
  if (adapterRefs.length > 1) {
    throw new InvocationError('CONFLICT', ['IMPLEMENTATION_VALIDATION_ADAPTER_REF_AMBIGUOUS']);
  }
  if (adapterRefs.length === 1) {
    const expectedAdapterRef = IMPLEMENTATION_VALIDATION_ADAPTER_REF_PREFIX
      + IMPLEMENTATION_VALIDATION_ADAPTER_CONTRACT.contractDigest;
    if (adapterRefs[0] !== expectedAdapterRef) {
      throw new InvocationError('CONFLICT', ['IMPLEMENTATION_VALIDATION_ADAPTER_REF_CONFLICT']);
    }
    adapterMode = 'V1';
    adapterContractDigest = IMPLEMENTATION_VALIDATION_ADAPTER_CONTRACT.contractDigest;
  }
  return {
    request: validationRequest,
    digest,
    contractDigest: profile.contractDigest,
    profile,
    adapterMode,
    adapterContractDigest,
    filePath: path.resolve(validationRequestFile),
  };
}
function assertValidationInputStable(binding) {
  const bytes = readBoundedRegularFile(binding.filePath, 'VALIDATION_REQUEST_FILE');
  if (sha256Bytes(bytes) !== binding.digest) {
    throw new InvocationError('CONFLICT', ['VALIDATION_REQUEST_CHANGED_DURING_INVOCATION']);
  }
  const currentProfile = validationProfileById(binding.request?.profile);
  if (!currentProfile || currentProfile.contractDigest !== binding.contractDigest) {
    throw new InvocationError('CONFLICT', ['VALIDATION_CONTRACT_CHANGED_DURING_INVOCATION']);
  }
  if (binding.adapterMode === 'V1'
      && binding.adapterContractDigest !== IMPLEMENTATION_VALIDATION_ADAPTER_CONTRACT.contractDigest) {
    throw new InvocationError('CONFLICT', ['IMPLEMENTATION_VALIDATION_ADAPTER_CHANGED_DURING_INVOCATION']);
  }
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
function manifestCoreBindingReasons(manifest, handoff, expectedPaths) {
  const reasons = [];
  if (manifest.manifestId !== handoff.manifest_id) reasons.push('MANIFEST_ID_CONFLICT');
  if (manifest.packetRef !== handoff.packet_ref) reasons.push('MANIFEST_PACKET_REF_CONFLICT');
  if (manifest.phaseClass !== 'REPOSITORY_MUTATION') reasons.push('MANIFEST_PHASE_CLASS_UNSUPPORTED');
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
  if (typeof manifest.workspace?.branch !== 'string'
      || !manifest.workspace.branch.startsWith('server/')
      || manifest.workspace.branch === 'server/work') {
    reasons.push('MANIFEST_S_BRANCH_NAMESPACE_REQUIRED');
  }
  if (typeof manifest.workspace?.worktree !== 'string'
      || !manifest.workspace.worktree.startsWith('/root/nyang-worktrees/')) {
    reasons.push('MANIFEST_S_WORKTREE_NAMESPACE_REQUIRED');
  }
  if (!SHA40_RE.test(manifest.observedBaseSha || '')) reasons.push('MANIFEST_BASE_SHA_INVALID');
  const expectedScopes = expectedPaths.map((item) => 'path:' + item).sort();
  const manifestPathScopes = (manifest.scopes || [])
    .filter((item) => typeof item === 'string' && item.startsWith('path:'))
    .sort();
  if (!same(manifestPathScopes, expectedScopes)) reasons.push('MANIFEST_SCOPE_CONFLICT');
  if (!same(manifest.authority, FALSE_AUTHORITY)) reasons.push('MANIFEST_AUTHORITY_CONFLICT');
  return reasons;
}
function throwManifestBindingReasons(reasons) {
  if (!reasons.length) return;
  const conflict = reasons.some((item) => item.endsWith('_CONFLICT'));
  throw new InvocationError(conflict ? 'CONFLICT' : 'BLOCKED', reasons);
}
function validateManifestBinding(manifest, handoff, request) {
  const reasons = manifestCoreBindingReasons(manifest, handoff, request.expected_paths);
  const requestRef = 'receipt:mcl-repository-patch-request:' + request.patch_sha256;
  if (!(manifest.inputRefs || []).includes(requestRef)) reasons.push('MANIFEST_PATCH_REQUEST_REF_REQUIRED');
  throwManifestBindingReasons(reasons);
}
function validatePreparedContinuationManifestBinding(manifest, handoff, request) {
  const reasons = manifestCoreBindingReasons(manifest, handoff, request.expected_paths);
  if (typeof manifest.phaseId !== 'string' || !manifest.phaseId.includes('recovery-rebind')) {
    reasons.push('CONTINUATION_RECOVERY_REBIND_REQUIRED');
  }
  const recoveryRefs = (manifest.inputRefs || []).filter(
    (item) => typeof item === 'string' && item.startsWith(RECOVERY_REF_PREFIX));
  const priorRefs = (manifest.inputRefs || []).filter(
    (item) => typeof item === 'string' && item.startsWith(PRIOR_MANIFEST_REF_PREFIX));
  const expectedRecovery = RECOVERY_REF_PREFIX + request.recovery_receipt_digest;
  const expectedPrior = PRIOR_MANIFEST_REF_PREFIX + request.prior_manifest_id;
  if (recoveryRefs.length !== 1) reasons.push(
    recoveryRefs.length ? 'CONTINUATION_RECOVERY_REF_AMBIGUOUS' : 'CONTINUATION_RECOVERY_REF_REQUIRED');
  else if (recoveryRefs[0] !== expectedRecovery) reasons.push('CONTINUATION_RECOVERY_REF_CONFLICT');
  if (priorRefs.length !== 1) reasons.push(
    priorRefs.length ? 'CONTINUATION_PRIOR_MANIFEST_REF_AMBIGUOUS' : 'CONTINUATION_PRIOR_MANIFEST_REF_REQUIRED');
  else if (priorRefs[0] !== expectedPrior) reasons.push('CONTINUATION_PRIOR_MANIFEST_REF_CONFLICT');
  throwManifestBindingReasons(reasons);
}
function validateLeaseAgainstManifest(activeLease, manifest) {
  const reasons = [];
  if (activeLease.packetRef !== manifest.packetRef) reasons.push('LEASE_PACKET_REF_CONFLICT');
  if (activeLease.packetBodySha256 !== manifest.packetBodySha256) reasons.push('LEASE_PACKET_BODY_CONFLICT');
  if (activeLease.route !== manifest.route || activeLease.executor !== manifest.executor) {
    reasons.push('LEASE_ROUTE_EXECUTOR_CONFLICT');
  }
  if (!same(activeLease.scopes, manifest.scopes)) reasons.push('LEASE_SCOPES_CONFLICT');
  if (!same(activeLease.workspace, manifest.workspace)) reasons.push('LEASE_WORKSPACE_CONFLICT');
  if ((activeLease.observedBaseSha ?? null) !== (manifest.observedBaseSha ?? null)) {
    reasons.push('LEASE_BASE_CONFLICT');
  }
  if (reasons.length) throw new InvocationError('CONFLICT', reasons);
}
function validateHolder({manifest, ledgerBody, packetBody, holderSecret}) {
  const evidence = workspaceHolder.validateEvidence({
    manifest, ledgerBody, packetBody, requireActiveLease: true,
  });
  if (!evidence.ok) throw new InvocationError('BLOCKED', evidence.reasonCodes);
  const workspace = workspaceHolder.inspectWorkspace(manifest);
  if (!workspace.ok) throw new InvocationError('BLOCKED', workspace.reasonCodes);
  const holder = workspaceHolder.readHolder(workspace.holderPath);
  if (!holder.ok) throw new InvocationError('BLOCKED', holder.reasonCodes);
  const reasons = [];
  if (holder.value.manifestId !== manifest.manifestId) reasons.push('HOLDER_MANIFEST_CONFLICT');
  if (holder.value.leaseId !== manifest.leaseEvidence.leaseId) reasons.push('HOLDER_LEASE_CONFLICT');
  if (!SHA256_RE.test(holderSecret || '')
      || holder.value.claimDigest !== workspaceHolder.claimDigest(holderSecret || '')) {
    reasons.push('HOLDER_CLAIM_INVALID');
  }
  if (reasons.length) throw new InvocationError('CONFLICT', reasons);
}
function validateCurrentEvidence({packet, context, ledger, manifest, handoff, holderSecret, holderValidator = validateHolder}) {
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
  if (projection.interactionStage !== 'IMPLEMENTATION_PR') {
    throw new InvocationError('BLOCKED', ['PACKET_STAGE_NOT_IMPLEMENTATION_PR']);
  }
  const digest = taskLease.digest(body);
  if (digest !== manifest.packetBodySha256) {
    throw new InvocationError('CONFLICT', ['PACKET_BODY_DIGEST_CONFLICT']);
  }
  if (context?.packetBodySha256 !== digest) {
    throw new InvocationError('CONFLICT', ['PACKET_BODY_CHANGED_DURING_CURRENTNESS_READ']);
  }
  if (context?.status !== 'READY' || !context.ledgerState) {
    throw new InvocationError('BLOCKED', ['CURRENT_CONTEXT_NOT_READY', ...(context?.reasonCodes || [])]);
  }
  if (!same(context.normalizedScopes, manifest.scopes)) {
    throw new InvocationError('CONFLICT', ['CURRENT_SCOPE_IDENTITY_CONFLICT']);
  }
  const leases = context.ledgerState.activeLeases.filter((item) => item.packetRef === manifest.packetRef);
  if (leases.length === 0) throw new InvocationError('BLOCKED', ['ACTIVE_LEASE_REQUIRED']);
  if (leases.length !== 1) throw new InvocationError('CONFLICT', ['ACTIVE_LEASE_AMBIGUOUS']);
  const activeLease = leases[0];
  if (activeLease.leaseId !== handoff.lease_id
      || activeLease.leaseId !== manifest.leaseEvidence.leaseId) {
    throw new InvocationError('CONFLICT', ['ACTIVE_LEASE_ID_CONFLICT']);
  }
  validateLeaseAgainstManifest(activeLease, manifest);
  holderValidator({
    manifest,
    ledgerBody: typeof ledger?.body === 'string' ? ledger.body : '',
    packetBody: body,
    holderSecret,
  });
  return {projection, activeLease};
}

function parsePrimitiveResult(stdout, expectedPhase) {
  if (Buffer.byteLength(stdout || '', 'utf8') > MAX_PRIMITIVE_OUTPUT_BYTES) {
    throw new InvocationError('UNKNOWN', ['PRIMITIVE_OUTPUT_TOO_LARGE']);
  }
  let value;
  try { value = JSON.parse(String(stdout || '').trim()); }
  catch { throw new InvocationError('UNKNOWN', ['PRIMITIVE_OUTPUT_JSON_INVALID']); }
  exactKeys(value, PRIMITIVE_FIELDS, 'PRIMITIVE_RESULT');
  if (value.schema !== 'mcl-worktree-patch.v1') {
    throw new InvocationError('UNKNOWN', ['PRIMITIVE_SCHEMA_INVALID']);
  }
  if (value.phase !== expectedPhase) throw new InvocationError('CONFLICT', ['PRIMITIVE_PHASE_CONFLICT']);
  if (!['PASS', 'BLOCKED'].includes(value.status)) {
    throw new InvocationError('UNKNOWN', ['PRIMITIVE_STATUS_INVALID']);
  }
  if (!Array.isArray(value.reason_codes)
      || value.reason_codes.some((item) => typeof item !== 'string')) {
    throw new InvocationError('UNKNOWN', ['PRIMITIVE_REASON_CODES_INVALID']);
  }
  if (!same(value.authority, FALSE_AUTHORITY) || value.details !== 'withheld') {
    throw new InvocationError('CONFLICT', ['PRIMITIVE_AUTHORITY_CONFLICT']);
  }
  return value;
}
function primitiveArgs(phase, manifest, requestFile, patchFile, prior = {}) {
  const args = [
    phase,
    '--worktree', manifest.workspace.worktree,
    '--branch', manifest.workspace.branch,
    '--base-sha', manifest.observedBaseSha,
    '--request-file', requestFile,
    '--patch-file', patchFile,
  ];
  if (prior.preparedDigest) args.push('--prepared-digest', prior.preparedDigest);
  if (prior.newHead) args.push('--new-head', prior.newHead);
  return args;
}
function assertInputStable(requestFile, patchFile, expectedRequestDigest, expectedPatchHash) {
  const requestBytes = readBoundedRegularFile(requestFile, 'REQUEST_FILE');
  const patchBytes = readBoundedRegularFile(patchFile, 'PATCH_FILE', MAX_PATCH_BYTES);
  if (sha256Bytes(requestBytes) !== expectedRequestDigest) {
    throw new InvocationError('CONFLICT', ['REQUEST_FILE_CHANGED_DURING_INVOCATION']);
  }
  if (sha256Bytes(patchBytes) !== expectedPatchHash) {
    throw new InvocationError('CONFLICT', ['PATCH_FILE_CHANGED_DURING_INVOCATION']);
  }
}

function safeChildEnv(env = process.env) {
  const out = {};
  for (const key of ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR']) {
    if (typeof env[key] === 'string' && env[key]) out[key] = env[key];
  }
  return out;
}


function assertContinuationInputStable(requestFile, expectedRequestDigest) {
  const bytes = readBoundedRegularFile(requestFile, 'CONTINUATION_REQUEST_FILE');
  if (sha256Bytes(bytes) !== expectedRequestDigest) {
    throw new InvocationError('CONFLICT', ['CONTINUATION_REQUEST_CHANGED_DURING_INVOCATION']);
  }
}
function gitRead({worktree, args, env = process.env, spawnSyncImpl = childProcess.spawnSync}) {
  let run;
  try {
    run = spawnSyncImpl('git', ['-C', worktree, ...args], {
      encoding: 'utf8',
      timeout: PRIMITIVE_TIMEOUT_MS,
      maxBuffer: MAX_PRIMITIVE_OUTPUT_BYTES,
      shell: false,
      env: safeChildEnv(env),
    });
  } catch {
    throw new InvocationError('UNKNOWN', ['CONTINUATION_GIT_READ_THROW']);
  }
  if (run?.error || run?.status !== 0 || run?.signal) {
    throw new InvocationError('UNKNOWN', ['CONTINUATION_GIT_READ_FAILED']);
  }
  return run.stdout || '';
}
function nulPaths(text) {
  return String(text || '').split('\0').filter(Boolean).sort();
}
function remoteBranchHead(manifest, read) {
  const ref = 'refs/heads/' + manifest.workspace.branch;
  const output = read(['ls-remote', '--heads', 'origin', ref]).trim();
  const rows = output ? output.split('\n').filter(Boolean) : [];
  if (rows.length !== 1) throw new InvocationError('CONFLICT', ['CONTINUATION_REMOTE_BRANCH_IDENTITY_CONFLICT']);
  const [sha, name] = rows[0].split(/\s+/);
  if (!SHA40_RE.test(sha || '') || name !== ref) {
    throw new InvocationError('CONFLICT', ['CONTINUATION_REMOTE_BRANCH_IDENTITY_CONFLICT']);
  }
  return sha;
}
function classifyPreparedContinuationState({
  manifest, request, env = process.env, gitSpawnSyncImpl = childProcess.spawnSync, gitReadImpl = null,
}) {
  const read = (args) => gitReadImpl
    ? gitReadImpl(args)
    : gitRead({worktree: manifest.workspace.worktree, args, env, spawnSyncImpl: gitSpawnSyncImpl});
  const top = read(['rev-parse', '--show-toplevel']).trim();
  const branch = read(['branch', '--show-current']).trim();
  const head = read(['rev-parse', 'HEAD']).trim();
  if (top !== manifest.workspace.worktree || branch !== manifest.workspace.branch || !SHA40_RE.test(head)) {
    throw new InvocationError('CONFLICT', ['CONTINUATION_WORKSPACE_IDENTITY_CONFLICT']);
  }
  const unstaged = nulPaths(read(['diff', '--name-only', '-z', '--']));
  const untracked = nulPaths(read(['ls-files', '--others', '--exclude-standard', '-z']));
  if (unstaged.length || untracked.length) {
    throw new InvocationError('CONFLICT', ['CONTINUATION_UNSTAGED_OR_UNTRACKED_CONFLICT']);
  }
  const remoteHead = remoteBranchHead(manifest, read);
  if (head === manifest.observedBaseSha) {
    if (remoteHead !== manifest.observedBaseSha) {
      throw new InvocationError('CONFLICT', ['CONTINUATION_REMOTE_HEAD_CONFLICT']);
    }
    const stagedPaths = nulPaths(read(['diff', '--cached', '--name-only', '-z', '--']));
    if (!same(stagedPaths, request.expected_paths)) {
      throw new InvocationError('CONFLICT', ['CONTINUATION_STAGED_PATH_CONFLICT']);
    }
    const diffText = read(['diff', '--cached', '--binary', '--']);
    const diffBytes = Buffer.from(diffText, 'utf8');
    if (!diffBytes.length || diffBytes.length > MAX_PATCH_BYTES
        || sha256Bytes(diffBytes) !== request.prepared_digest) {
      throw new InvocationError('CONFLICT', ['CONTINUATION_PREPARED_DIGEST_CONFLICT']);
    }
    return {state: 'PREPARED', newHead: null, remoteHead, diffBytes};
  }

  const stagedPaths = nulPaths(read(['diff', '--cached', '--name-only', '-z', '--']));
  if (stagedPaths.length) throw new InvocationError('CONFLICT', ['CONTINUATION_INDEX_NOT_CLEAN']);
  const parent = read(['rev-parse', 'HEAD^']).trim();
  if (parent !== manifest.observedBaseSha) {
    throw new InvocationError('CONFLICT', ['CONTINUATION_COMMIT_PARENT_CONFLICT']);
  }
  const committedPaths = nulPaths(read([
    'diff', '--name-only', '-z', manifest.observedBaseSha, head, '--',
  ]));
  if (!same(committedPaths, request.expected_paths)) {
    throw new InvocationError('CONFLICT', ['CONTINUATION_COMMITTED_PATH_CONFLICT']);
  }
  const diffText = read(['diff', '--binary', manifest.observedBaseSha, head, '--']);
  const diffBytes = Buffer.from(diffText, 'utf8');
  if (!diffBytes.length || diffBytes.length > MAX_PATCH_BYTES
      || sha256Bytes(diffBytes) !== request.prepared_digest) {
    throw new InvocationError('CONFLICT', ['CONTINUATION_COMMITTED_DIGEST_CONFLICT']);
  }
  const message = read(['log', '-1', '--format=%B', 'HEAD']).replace(/\n+$/, '');
  if (message !== request.message) throw new InvocationError('CONFLICT', ['CONTINUATION_COMMIT_MESSAGE_CONFLICT']);
  const identity = read(['log', '-1', '--format=%an%x00%ae%x00%cn%x00%ce', 'HEAD'])
    .replace(/\n+$/, '').split('\0');
  if (!same(identity, [FIXED_BOT_NAME, FIXED_BOT_EMAIL, FIXED_BOT_NAME, FIXED_BOT_EMAIL])) {
    throw new InvocationError('CONFLICT', ['CONTINUATION_COMMIT_IDENTITY_CONFLICT']);
  }
  if (remoteHead === manifest.observedBaseSha) {
    return {state: 'COMMITTED', newHead: head, remoteHead, diffBytes};
  }
  if (remoteHead === head) {
    return {state: 'PUSHED', newHead: head, remoteHead, diffBytes};
  }
  throw new InvocationError('CONFLICT', ['CONTINUATION_REMOTE_HEAD_CONFLICT']);
}
function writePrivateFile(filePath, bytes) {
  const fd = fs.openSync(filePath, 'wx', 0o600);
  try { fs.writeFileSync(fd, bytes); } finally { fs.closeSync(fd); }
}
function materializeContinuationPrimitiveInputs(request, state) {
  if (!state?.diffBytes || sha256Bytes(state.diffBytes) !== request.prepared_digest) {
    throw new InvocationError('CONFLICT', ['CONTINUATION_PREPARED_DIGEST_CONFLICT']);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-repo-prepared-continuation-'));
  const requestFile = path.join(dir, 'request.json');
  const patchFile = path.join(dir, 'prepared.patch');
  const primitiveRequest = {
    schema: 'mcl-repository-patch-request.v1',
    message: request.message,
    expected_paths: [...request.expected_paths],
    patch_sha256: request.prepared_digest,
  };
  try {
    writePrivateFile(requestFile, Buffer.from(JSON.stringify(primitiveRequest), 'utf8'));
    writePrivateFile(patchFile, state.diffBytes);
  } catch (error) {
    try { fs.rmSync(dir, {recursive: true, force: true}); } catch {}
    throw new InvocationError('UNKNOWN', ['CONTINUATION_TEMP_INPUT_WRITE_FAILED']);
  }
  return {
    dir, requestFile, patchFile, primitiveRequest,
    cleanup: () => { try { fs.rmSync(dir, {recursive: true, force: true}); } catch {} },
  };
}

function validationEvidence(
  profileId, status, reasonCodes = [], checksPassed = 0, summary = null,
  adapterContractDigest = null,
) {
  const value = {
    status,
    reason_codes: unique(reasonCodes),
    profile: profileId,
    checks_passed: checksPassed,
  };
  if (summary) {
    value.checks_failed = summary.failed;
    value.checks_infra = summary.infra;
    value.checks_not_run = summary.notRun;
    value.adapter_contract_digest = adapterContractDigest;
  }
  return value;
}
function validationStreamEvidence(text) {
  const value = String(text || '');
  return {
    bytes: Buffer.byteLength(value, 'utf8'),
    sha256: sha256Bytes(Buffer.from(value, 'utf8')),
  };
}
function adapterForValidationCheck(binding, check, adapterContract) {
  const matches = (adapterContract?.adapters || []).filter(
    (row) => row.profileId === binding.profile.profileId && row.checkId === check.checkId,
  );
  if (matches.length === 0) {
    return {kind: 'UNKNOWN', reasonCodes: ['CHECK_ADAPTER_MISSING:' + check.checkId]};
  }
  if (matches.length !== 1) {
    return {kind: 'CONFLICT', reasonCodes: ['CHECK_ADAPTER_AMBIGUOUS:' + check.checkId]};
  }
  return {kind: 'PASS', reasonCodes: [], value: matches[0]};
}
function defaultValidationCandidateStat(filePath) {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}
function resolveImplementationValidationInvocation({
  binding,
  check,
  manifest,
  adapterContract = IMPLEMENTATION_VALIDATION_ADAPTER_CONTRACT,
  candidateStatImpl = defaultValidationCandidateStat,
}) {
  if (adapterContract?.schema !== IMPLEMENTATION_VALIDATION_ADAPTER_SCHEMA
      || !SHA256_RE.test(adapterContract?.contractDigest || '')) {
    return {kind: 'UNKNOWN', reasonCodes: ['IMPLEMENTATION_VALIDATION_ADAPTER_INVALID']};
  }
  const found = adapterForValidationCheck(binding, check, adapterContract);
  if (found.kind !== 'PASS') return found;
  const adapter = found.value;
  if (adapter.launcher !== 'node' || adapter.cwdPolicy !== 'manifest-worktree'
      || adapter.resultParser !== 'node-exit-v1'
      || adapter.pathArgIndex !== 1 || adapter.timeoutMs !== check.timeoutMs
      || !Array.isArray(adapter.aliases)) {
    return {kind: 'CONFLICT', reasonCodes: ['CHECK_ADAPTER_CONTRACT_CONFLICT:' + check.checkId]};
  }
  const candidates = [adapter.canonicalPath, ...adapter.aliases];
  const present = [];
  for (const candidate of candidates) {
    try {
      validateRepoPath(candidate);
      const stat = candidateStatImpl(path.join(manifest.workspace.worktree, candidate));
      if (!stat) continue;
      if (!stat.isFile() || stat.isSymbolicLink()) {
        return {kind: 'CONFLICT', reasonCodes: ['CHECK_ADAPTER_PATH_UNSAFE:' + check.checkId]};
      }
      present.push(candidate);
    } catch (error) {
      if (error instanceof InvocationError) {
        return {kind: error.kind, reasonCodes: error.reasonCodes};
      }
      return {kind: 'UNKNOWN', reasonCodes: ['CHECK_ADAPTER_PATH_READ_FAILED:' + check.checkId]};
    }
  }
  if (present.length === 0) {
    return {kind: 'UNKNOWN', reasonCodes: ['CHECK_ADAPTER_STALE:' + check.checkId]};
  }
  if (present.length !== 1) {
    return {kind: 'CONFLICT', reasonCodes: ['CHECK_ADAPTER_PATH_CONFLICT:' + check.checkId]};
  }
  const selected = present[0];
  const args = [...check.args];
  args[adapter.pathArgIndex] = selected;
  return {
    kind: 'PASS',
    reasonCodes: [],
    value: {
      launcher: adapter.launcher,
      command: process.execPath,
      args,
      cwd: manifest.workspace.worktree,
      path: selected,
      resolution: selected === adapter.canonicalPath ? 'CANONICAL' : 'ALIAS',
      timeoutMs: adapter.timeoutMs,
    },
  };
}
function validationArtifactSummary(rows) {
  return {
    passed: rows.filter((row) => row.result === 'PASS').length,
    failed: rows.filter((row) => row.result === 'FAIL').length,
    infra: rows.filter((row) => row.result === 'INFRA').length,
    notRun: rows.filter((row) => row.result === 'NOT_RUN').length,
  };
}
function notRunValidationRow(check) {
  return {
    checkId: check.checkId,
    launcher: 'node',
    argv: [...check.args],
    path: null,
    resolution: 'NOT_RUN',
    result: 'NOT_RUN',
    reasonCodes: [],
    exitCode: null,
    signal: null,
    stdout: validationStreamEvidence(''),
    stderr: validationStreamEvidence(''),
  };
}
function buildImplementationValidationArtifact({binding, manifest, rows}) {
  const summary = validationArtifactSummary(rows);
  const core = taskHandoff.stable({
    schemaVersion: 1,
    mode: IMPLEMENTATION_VALIDATION_ARTIFACT_SCHEMA,
    manifestId: manifest.manifestId,
    profileId: binding.profile.profileId,
    profileVersion: binding.profile.profileVersion,
    profileContractDigest: binding.profile.contractDigest,
    adapterContractDigest: binding.adapterContractDigest,
    orderedChecks: rows,
    summary,
  });
  return {
    ...core,
    artifactIdentityDigest: sha256Bytes(Buffer.from(JSON.stringify(core), 'utf8')),
  };
}
function persistImplementationValidationArtifact(
  manifest,
  artifact,
  {workspaceInspector = workspaceHolder.inspectWorkspace, writer = writeJsonSidecar} = {},
) {
  const workspace = workspaceInspector(manifest);
  if (!workspace?.ok || !workspace.holderPath) {
    throw new InvocationError('UNKNOWN', ['VALIDATION_ARTIFACT_GIT_ADMIN_UNAVAILABLE']);
  }
  const adminDir = path.dirname(workspace.holderPath);
  const filePath = path.join(
    adminDir, 'mcl-implementation-validation-' + manifest.manifestId + '.json');
  const write = writer(filePath, artifact, MAX_VALIDATION_ARTIFACT_BYTES);
  return {
    filePath: write.filePath,
    digest: write.digest,
    locator: 'local-artifact:' + write.filePath + '#sha256=' + write.digest,
  };
}
function runLegacyPreparedValidation({
  binding,
  manifest,
  env = process.env,
  validationSpawnSyncImpl = childProcess.spawnSync,
}) {
  const profile = binding.profile;
  let checksPassed = 0;
  for (const check of profile.checks) {
    let run;
    try {
      run = validationSpawnSyncImpl(process.execPath, [...check.args], {
        cwd: manifest.workspace.worktree,
        encoding: 'utf8',
        timeout: PREPARED_VALIDATION_TIMEOUT_MS,
        maxBuffer: MAX_VALIDATION_OUTPUT_BYTES,
        shell: false,
        env: safeChildEnv(env),
      });
    } catch {
      const code = 'PREPARED_VALIDATION_SPAWN_THROW:' + check.checkId;
      return {
        kind: 'BLOCKED',
        reasonCodes: [code],
        value: validationEvidence(profile.profileId, 'BLOCKED', [code], checksPassed),
      };
    }
    if (run?.error || run?.status === null || run?.signal) {
      const code = 'PREPARED_VALIDATION_INFRA_ERROR:' + check.checkId;
      return {
        kind: 'BLOCKED',
        reasonCodes: [code],
        value: validationEvidence(profile.profileId, 'BLOCKED', [code], checksPassed),
      };
    }
    if (run.status !== 0) {
      const code = 'PREPARED_VALIDATION_FAILED:' + check.checkId;
      return {
        kind: 'BLOCKED',
        reasonCodes: [code],
        value: validationEvidence(profile.profileId, 'BLOCKED', [code], checksPassed),
      };
    }
    checksPassed += 1;
  }
  return {
    kind: 'PASS',
    reasonCodes: [],
    value: validationEvidence(profile.profileId, 'PASS', [], checksPassed),
  };
}
function runAdapterPreparedValidation({
  binding,
  manifest,
  env = process.env,
  validationSpawnSyncImpl = childProcess.spawnSync,
  validationAdapterResolverImpl = resolveImplementationValidationInvocation,
  persistValidationArtifactImpl = persistImplementationValidationArtifact,
}) {
  const profile = binding.profile;
  const rows = [];
  const finish = (kind, reasonCodes) => {
    while (rows.length < profile.checks.length) {
      rows.push(notRunValidationRow(profile.checks[rows.length]));
    }
    const artifact = buildImplementationValidationArtifact({binding, manifest, rows});
    let persisted;
    try {
      persisted = persistValidationArtifactImpl(manifest, artifact);
    } catch {
      return {
        kind: 'CONFLICT',
        reasonCodes: unique([...reasonCodes, 'VALIDATION_ARTIFACT_WRITE_FAILED']),
        value: validationEvidence(
          profile.profileId, 'CONFLICT',
          unique([...reasonCodes, 'VALIDATION_ARTIFACT_WRITE_FAILED']),
          artifact.summary.passed, artifact.summary, binding.adapterContractDigest),
        artifact: null,
        artifactLocator: null,
      };
    }
    return {
      kind,
      reasonCodes: unique(reasonCodes),
      value: validationEvidence(
        profile.profileId, kind, reasonCodes, artifact.summary.passed,
        artifact.summary, binding.adapterContractDigest),
      artifact,
      artifactLocator: persisted.locator,
    };
  };

  for (const check of profile.checks) {
    const resolved = validationAdapterResolverImpl({binding, check, manifest});
    if (resolved.kind !== 'PASS') {
      rows.push({
        ...notRunValidationRow(check),
        result: 'INFRA',
        resolution: 'UNRESOLVED',
        reasonCodes: unique(resolved.reasonCodes || []),
      });
      return finish(resolved.kind, resolved.reasonCodes || []);
    }
    const invocation = resolved.value;
    let run;
    try {
      run = validationSpawnSyncImpl(invocation.command, [...invocation.args], {
        cwd: invocation.cwd,
        encoding: 'utf8',
        timeout: invocation.timeoutMs,
        maxBuffer: MAX_VALIDATION_OUTPUT_BYTES,
        shell: false,
        env: safeChildEnv(env),
      });
    } catch {
      const code = 'PREPARED_VALIDATION_SPAWN_THROW:' + check.checkId;
      rows.push({
        checkId: check.checkId,
        launcher: invocation.launcher,
        argv: [...invocation.args],
        path: invocation.path,
        resolution: invocation.resolution,
        result: 'INFRA',
        reasonCodes: [code],
        exitCode: null,
        signal: null,
        stdout: validationStreamEvidence(''),
        stderr: validationStreamEvidence(''),
      });
      return finish('BLOCKED', [code]);
    }
    const baseRow = {
      checkId: check.checkId,
      launcher: invocation.launcher,
      argv: [...invocation.args],
      path: invocation.path,
      resolution: invocation.resolution,
      exitCode: Number.isInteger(run?.status) ? run.status : null,
      signal: run?.signal || null,
      stdout: validationStreamEvidence(run?.stdout || ''),
      stderr: validationStreamEvidence(run?.stderr || ''),
    };
    if (run?.error || run?.status === null || run?.signal) {
      const code = 'PREPARED_VALIDATION_INFRA_ERROR:' + check.checkId;
      rows.push({...baseRow, result: 'INFRA', reasonCodes: [code]});
      return finish('BLOCKED', [code]);
    }
    if (run.status !== 0) {
      const code = 'SEMANTIC_TEST_FAILURE:' + check.checkId;
      rows.push({...baseRow, result: 'FAIL', reasonCodes: [code]});
      return finish('FAIL', [code]);
    }
    rows.push({...baseRow, result: 'PASS', reasonCodes: []});
  }
  return finish('PASS', []);
}
function runFixedPreparedValidation({
  binding,
  manifest,
  env = process.env,
  validationSpawnSyncImpl = childProcess.spawnSync,
  validationAdapterResolverImpl = resolveImplementationValidationInvocation,
  persistValidationArtifactImpl = persistImplementationValidationArtifact,
}) {
  const profile = binding?.profile;
  if (!binding || !profile || binding.request?.profile !== profile.profileId
      || binding.contractDigest !== profile.contractDigest) {
    return {
      kind: 'UNKNOWN',
      reasonCodes: ['VALIDATION_BINDING_INVALID'],
      value: validationEvidence(
        binding?.request?.profile || 'UNKNOWN', 'UNKNOWN', ['VALIDATION_BINDING_INVALID']),
    };
  }
  if (binding.adapterMode !== 'V1') {
    return runLegacyPreparedValidation({
      binding, manifest, env, validationSpawnSyncImpl,
    });
  }
  if (binding.adapterContractDigest !== IMPLEMENTATION_VALIDATION_ADAPTER_CONTRACT.contractDigest) {
    return {
      kind: 'CONFLICT',
      reasonCodes: ['IMPLEMENTATION_VALIDATION_ADAPTER_CONTRACT_CONFLICT'],
      value: validationEvidence(
        profile.profileId, 'CONFLICT',
        ['IMPLEMENTATION_VALIDATION_ADAPTER_CONTRACT_CONFLICT'], 0),
    };
  }
  return runAdapterPreparedValidation({
    binding,
    manifest,
    env,
    validationSpawnSyncImpl,
    validationAdapterResolverImpl,
    persistValidationArtifactImpl,
  });
}

function spawnPrimitive({phase, manifest, requestFile, patchFile, prior,
  spawnSyncImpl, root, env}) {
  const primitivePath = path.join(root, PRIMITIVE_RELATIVE);
  let run;
  try {
    run = spawnSyncImpl(primitivePath, primitiveArgs(
      phase, manifest, requestFile, patchFile, prior), {
      cwd: root,
      encoding: 'utf8',
      timeout: PRIMITIVE_TIMEOUT_MS,
      maxBuffer: MAX_PRIMITIVE_OUTPUT_BYTES,
      shell: false,
      env: safeChildEnv(env),
    });
  } catch {
    return {kind: 'BLOCKED', reasonCodes: ['PRIMITIVE_SPAWN_THROW'], run: null, value: null};
  }
  if (run?.error || run?.status === null || run?.signal) {
    return {kind: 'BLOCKED', reasonCodes: ['PRIMITIVE_SPAWN_INFRA_ERROR'], run, value: null};
  }
  let value;
  try { value = parsePrimitiveResult(run.stdout || '', phase.toUpperCase()); }
  catch (error) {
    if (!(error instanceof InvocationError)) throw error;
    return {kind: error.kind, reasonCodes: error.reasonCodes, run, value: null};
  }
  if (value.status === 'PASS' && run.status !== 0) {
    return {kind: 'CONFLICT', reasonCodes: ['PRIMITIVE_PASS_EXIT_CONFLICT'], run, value};
  }
  if (value.status === 'BLOCKED') {
    if (run.status === 0) return {
      kind: 'CONFLICT', reasonCodes: ['PRIMITIVE_BLOCKED_ZERO_EXIT_CONFLICT'], run, value,
    };
    return {kind: 'BLOCKED', reasonCodes: unique([
      'PATCH_' + phase.toUpperCase() + '_BLOCKED', ...value.reason_codes,
    ]), run, value};
  }
  return {kind: 'PASS', reasonCodes: [], run, value};
}

function stateFor(kind, reasons) {
  if (kind === 'PASS') return {
    executionLifecycle: 'FINISHED', attentionDisposition: 'COMPLETE',
    result: 'PASS', reasonCodes: [], requiredUnknowns: [], conflicts: [], blockers: [],
    nextLegalAction: 'HOLDER_CHECK_THEN_RELEASE_D013_AND_RECORD_D014_COMPLETION',
  };
  if (kind === 'FAIL') return {
    executionLifecycle: 'FINISHED', attentionDisposition: 'NEEDS_REVIEW',
    result: 'FAIL', reasonCodes: reasons, requiredUnknowns: [], conflicts: [], blockers: [],
    nextLegalAction: 'SEMANTIC_REVIEW',
  };
  if (kind === 'CONFLICT') return {
    executionLifecycle: 'FINISHED', attentionDisposition: 'CONFLICT',
    result: 'CONFLICT', reasonCodes: ['REPOSITORY_PATCH_EVIDENCE_CONFLICT'],
    requiredUnknowns: [], conflicts: reasons, blockers: [],
    nextLegalAction: 'RESOLVE_REPOSITORY_PATCH_CONFLICT',
  };
  if (kind === 'UNKNOWN') return {
    executionLifecycle: 'FINISHED', attentionDisposition: 'UNKNOWN',
    result: 'UNKNOWN', reasonCodes: reasons,
    requiredUnknowns: reasons, conflicts: [], blockers: [],
    nextLegalAction: 'RESOLVE_REPOSITORY_PATCH_UNKNOWN',
  };
  return {
    executionLifecycle: 'FINISHED', attentionDisposition: 'BLOCKED',
    result: 'BLOCKED', reasonCodes: reasons,
    requiredUnknowns: [], conflicts: [], blockers: reasons,
    nextLegalAction: 'RESOLVE_REPOSITORY_PATCH_BLOCK',
  };
}
function projectGenericReceipt({manifest, request, primitiveSourceSha256, kind,
  reasons = [], prepare = null, validation = null, validationEnabled = false,
  validationArtifactLocator = null,
  commit = null, push = null, exitCode = null}) {
  const stableReasons = unique(reasons);
  const state = stateFor(kind, stableReasons);
  const locator = 'receipt:mcl-repository-patch-owner:' + (manifest?.manifestId || 'unknown');
  const phaseResult = (value) => value?.status === 'PASS' ? 'PASS' : value ? 'BLOCKED' : 'SKIPPED';
  const validationResult = (value) => {
    if (!value) return 'SKIPPED';
    return ['PASS', 'FAIL', 'UNKNOWN', 'CONFLICT', 'BLOCKED'].includes(value.status)
      ? value.status : 'UNKNOWN';
  };
  const newHead = push?.new_head || commit?.new_head || null;
  const artifacts = [locator];
  if (SHA40_RE.test(newHead || '')) artifacts.push('commit:' + newHead);
  if (validationArtifactLocator) artifacts.push(validationArtifactLocator);
  const steps = [
    {name: 'patch-prepare', result: phaseResult(prepare), evidenceLocator: locator},
  ];
  if (validationEnabled) {
    steps.push({
      name: 'prepared-validation',
      result: validationResult(validation),
      evidenceLocator: validationArtifactLocator || locator,
    });
  }
  steps.push(
    {name: 'patch-commit', result: phaseResult(commit), evidenceLocator: locator},
    {name: 'patch-push-postverify', result: phaseResult(push), evidenceLocator: locator},
  );
  const counters = [
    {name: 'changed_paths', value: request?.expected_paths?.length ?? 0},
    {name: 'commit_created', value: commit?.status === 'PASS' ? 1 : 0},
    {name: 'push_verified', value: push?.status === 'PASS' ? 1 : 0},
  ];
  if (validationEnabled) {
    counters.push({
      name: 'prepared_validation_pass',
      value: validation?.status === 'PASS' ? 1 : 0,
    });
    for (const [name, field] of [
      ['validation_passed', 'checks_passed'],
      ['validation_failed', 'checks_failed'],
      ['validation_infra', 'checks_infra'],
      ['validation_not_run', 'checks_not_run'],
    ]) {
      if (Number.isSafeInteger(validation?.[field]) && validation[field] >= 0) {
        counters.push({name, value: validation[field]});
      }
    }
  }
  return executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'mcl-repository-patch-owner:' + (manifest?.manifestId || 'unknown'),
    primitiveId: 'mcl:repository-worktree-patch',
    sourceIdentity: {
      kind: 'repository-file',
      locator: PRIMITIVE_REF,
      identity: primitiveSourceSha256,
    },
    executionSurface: 'MCL:S',
    stage: 'HOST_ORCHESTRATED_REPOSITORY_PATCH',
    executionLifecycle: state.executionLifecycle,
    attentionDisposition: state.attentionDisposition,
    result: state.result,
    proofScope: validationEnabled
      ? 'one bounded S worktree patch prepare/fixed-validation/commit/non-force-push transaction only'
      : 'one bounded S worktree patch prepare/commit/non-force-push transaction only',
    steps,
    counters,
    affectedFiles: request?.expected_paths || [],
    artifactLocators: artifacts,
    reasonCodes: state.reasonCodes,
    requiredUnknowns: state.requiredUnknowns,
    conflicts: state.conflicts,
    blockers: state.blockers,
    exitCode,
    stderrTail: null,
    nextLegalAction: state.nextLegalAction,
  });
}

function projectPreparedContinuationReceipt({
  manifest, request, primitiveSourceSha256, kind, reasons = [],
  bindingProven = false, commit = null, push = null,
  commitAlreadyProven = false, pushAlreadyProven = false,
  newHead = null, exitCode = null,
}) {
  const stableReasons = unique(reasons);
  const state = stateFor(kind, stableReasons);
  const locator = 'receipt:mcl-repository-patch-owner:continue-prepared:'
    + (manifest?.manifestId || 'unknown');
  const bindingResult = bindingProven
    ? 'PASS'
    : kind === 'CONFLICT' ? 'CONFLICT' : kind === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED';
  const commitResult = commit?.status === 'PASS' ? 'PASS' : commitAlreadyProven ? 'SKIPPED' : 'SKIPPED';
  const pushResult = push?.status === 'PASS' ? 'PASS' : pushAlreadyProven ? 'SKIPPED' : 'SKIPPED';
  const artifacts = [locator];
  const finalHead = push?.new_head || commit?.new_head || newHead || null;
  if (SHA40_RE.test(finalHead || '')) artifacts.push('commit:' + finalHead);
  return executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'mcl-repository-patch-owner:continue-prepared:'
      + (manifest?.manifestId || 'unknown'),
    primitiveId: 'mcl:repository-worktree-patch',
    sourceIdentity: {
      kind: 'repository-file',
      locator: PRIMITIVE_REF,
      identity: primitiveSourceSha256,
    },
    executionSurface: 'MCL:S',
    stage: 'HOST_ORCHESTRATED_REPOSITORY_PATCH_CONTINUATION',
    executionLifecycle: state.executionLifecycle,
    attentionDisposition: state.attentionDisposition,
    result: state.result,
    proofScope: 'one recovery-bound prepared S worktree commit/non-force-push continuation only',
    steps: [
      {name: 'recovered-prepared-binding', result: bindingResult, evidenceLocator: locator},
      {name: 'patch-commit', result: commitResult,
        evidenceLocator: SHA40_RE.test(finalHead || '') ? 'commit:' + finalHead : locator},
      {name: 'patch-push-postverify', result: pushResult, evidenceLocator: locator},
    ],
    counters: [
      {name: 'changed_paths', value: request?.expected_paths?.length ?? 0},
      {name: 'commit_created', value: commit?.status === 'PASS' ? 1 : 0},
      {name: 'commit_already_proven', value: commitAlreadyProven ? 1 : 0},
      {name: 'push_verified', value: push?.status === 'PASS' || pushAlreadyProven ? 1 : 0},
      {name: 'push_already_proven', value: pushAlreadyProven ? 1 : 0},
    ],
    affectedFiles: request?.expected_paths || [],
    artifactLocators: artifacts,
    reasonCodes: state.reasonCodes,
    requiredUnknowns: state.requiredUnknowns,
    conflicts: state.conflicts,
    blockers: state.blockers,
    exitCode,
    stderrTail: null,
    nextLegalAction: state.nextLegalAction,
  });
}

function counterValue(receipt, name) {
  const row = receipt?.counters?.find((item) => item.name === name);
  return row?.status === 'KNOWN' ? row.value : null;
}
function commitLocator(receipt) {
  return receipt?.artifactLocators?.find((item) => /^commit:[0-9a-f]{40}$/.test(item)) || null;
}
function validationArtifactLocator(receipt) {
  return receipt?.artifactLocators?.find(
    (item) => typeof item === 'string'
      && item.startsWith('local-artifact:')
      && item.includes('mcl-implementation-validation-'),
  ) || null;
}
function ownerDecisionOutput(receipt) {
  const output = {
    owner: 'repository-patch-owner',
    filesChanged: counterValue(receipt, 'changed_paths') ?? 0,
    commitCreated: counterValue(receipt, 'commit_created') === 1,
    remoteHeadExact: counterValue(receipt, 'push_verified') === 1,
    commitLocator: commitLocator(receipt),
    pr: null,
  };
  for (const [key, counter] of [
    ['validationPassed', 'validation_passed'],
    ['validationFailed', 'validation_failed'],
    ['validationInfra', 'validation_infra'],
    ['validationNotRun', 'validation_not_run'],
  ]) {
    const value = counterValue(receipt, counter);
    if (value !== null) output[key] = value;
  }
  const artifact = validationArtifactLocator(receipt);
  if (artifact) output.validationArtifact = artifact;
  return output;
}
function ownerAttention(receipt, locator) {
  if (receipt?.result === 'PASS' && receipt?.attentionDisposition === 'COMPLETE') return [];
  const reasonCode = receipt?.reasonCodes?.[0]
    || receipt?.conflicts?.[0]
    || receipt?.requiredUnknowns?.[0]
    || receipt?.blockers?.[0]
    || 'IMPLEMENTATION_VALIDATION_ATTENTION';
  const severity = receipt?.result === 'CONFLICT' ? 'CONFLICT'
    : receipt?.result === 'UNKNOWN' ? 'UNKNOWN'
      : receipt?.result === 'BLOCKED' ? 'BLOCKER'
        : receipt?.result === 'FAIL' ? 'FAIL' : 'WARN';
  return [{
    subject: receipt?.primitiveId || 'mcl:repository-worktree-patch',
    reasonCode,
    severity,
    constraint: 'IMPLEMENTATION_VALIDATION_ATTENTION',
    nextPhase: receipt?.nextLegalAction || 'NEEDS_SEMANTIC_DECISION',
    locator: validationArtifactLocator(receipt) || locator,
  }];
}
function ownerReport(receipt, manifest) {
  return {
    schemaVersion: 1,
    mode: 'MCL_REPOSITORY_PATCH_EXECUTION_REPORT',
    operationId: receipt.operationId,
    manifestId: manifest.manifestId,
    leaseId: manifest.leaseEvidence.leaseId,
    baseSha: manifest.observedBaseSha,
    branch: manifest.workspace.branch,
    receiptDigest: receipt.receiptDigest,
    result: receipt.result,
    executionLifecycle: receipt.executionLifecycle,
    attentionDisposition: receipt.attentionDisposition,
    proofScope: receipt.proofScope,
    steps: receipt.steps,
    counters: receipt.counters,
    affectedFiles: receipt.affectedFiles,
    artifactLocators: receipt.artifactLocators,
    reasonCodes: receipt.reasonCodes,
    requiredUnknowns: receipt.requiredUnknowns,
    conflicts: receipt.conflicts,
    blockers: receipt.blockers,
    nextLegalAction: receipt.nextLegalAction,
  };
}
function writeJsonSidecar(filePath, value, maxBytes = MAX_REPORT_BYTES) {
  const bytes = Buffer.from(JSON.stringify(taskHandoff.stable(value), null, 2) + '\n', 'utf8');
  if (bytes.length > maxBytes) throw new InvocationError('UNKNOWN', ['AGENT_VIEW_SIDECAR_TOO_LARGE']);
  const temporary = filePath + '.tmp-' + process.pid;
  let fd = null;
  try {
    fd = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(fd, bytes);
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(temporary, filePath);
    fs.chmodSync(filePath, 0o600);
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error('sidecar not regular');
    }
  } catch (error) {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
    try { fs.unlinkSync(temporary); } catch {}
    throw new InvocationError('UNKNOWN', ['AGENT_VIEW_SIDECAR_WRITE_FAILED']);
  }
  return {filePath, digest: sha256Bytes(bytes)};
}
function persistAgentArtifacts(receipt, manifest, {
  workspaceInspector = workspaceHolder.inspectWorkspace,
  writer = writeJsonSidecar,
} = {}) {
  if (receipt?.validity !== 'VALID' || receipt.schemaVersion !== 2) {
    throw new InvocationError('UNKNOWN', ['AGENT_VIEW_CANONICAL_RECEIPT_REQUIRED']);
  }
  const workspace = workspaceInspector(manifest);
  if (!workspace?.ok || !workspace.holderPath) {
    throw new InvocationError('UNKNOWN', [
      'AGENT_VIEW_GIT_ADMIN_UNAVAILABLE',
      ...(workspace?.reasonCodes || []),
    ]);
  }
  const adminDir = path.dirname(workspace.holderPath);
  const prefix = 'mcl-repository-patch-owner-' + manifest.manifestId;
  const receiptPath = path.join(adminDir, prefix + '.receipt.json');
  const reportPath = path.join(adminDir, prefix + '.report.json');
  const receiptWrite = writer(receiptPath, receipt, MAX_REPORT_BYTES);
  const reportWrite = writer(reportPath, ownerReport(receipt, manifest), MAX_REPORT_BYTES);
  return {
    receiptLocator: 'local-artifact:' + receiptWrite.filePath + '#sha256=' + receiptWrite.digest,
    reportLocator: 'local-artifact:' + reportWrite.filePath + '#sha256=' + reportWrite.digest,
  };
}
function projectOwnerAgentView(receipt, manifest, deps = {}) {
  try {
    const locators = persistAgentArtifacts(receipt, manifest, deps);
    return agentDecisionView.projectAgentDecisionView({
      receipt,
      phase: 'IMPLEMENTATION_EFFECT',
      output: ownerDecisionOutput(receipt),
      attention: ownerAttention(receipt, locators.reportLocator),
      receiptLocator: locators.receiptLocator,
      reportLocator: locators.reportLocator,
    });
  } catch (error) {
    return agentDecisionView.projectAgentDecisionView({
      receipt,
      phase: 'IMPLEMENTATION_EFFECT',
      output: {},
      attention: [],
      receiptLocator: '',
      reportLocator: '',
    });
  }
}

async function loadCurrentEvidence({repo, manifest, env = process.env, runner, fetchImpl}) {
  const client = operator.createOperatorGitHubClient({repo, env, runner, fetchImpl});
  const context = await operator.readContext({
    client, packetRef: manifest.packetRef, scopes: manifest.scopes,
  });
  const number = operator.packetNumber(manifest.packetRef);
  const [packet, ledger] = await Promise.all([
    client.api('/issues/' + number),
    client.api('/issues/2352'),
  ]);
  return {packet, ledger, context};
}
async function guardCurrent({repo, manifest, handoff, holderSecret, env, runner, fetchImpl, holderValidator}) {
  const current = await loadCurrentEvidence({repo, manifest, env, runner, fetchImpl});
  validateCurrentEvidence({
    packet: current.packet,
    ledger: current.ledger,
    context: current.context,
    manifest,
    handoff,
    holderSecret, holderValidator: holderValidator || validateHolder,
  });
  return current;
}

async function emitDetachedCheckpoint(checkpointSink, {
  checkpoint,
  primitiveId,
  targetIdentity,
  evidenceLocator,
  nextPrimitive,
}) {
  if (checkpointSink === null || checkpointSink === undefined) return;
  if (typeof checkpointSink !== 'function') {
    throw new InvocationError('UNKNOWN', ['CONTINUITY_CHECKPOINT_SINK_INVALID']);
  }
  try {
    await checkpointSink({
      schema: DETACHED_CHECKPOINT_SCHEMA,
      checkpoint,
      primitiveId,
      targetIdentity,
      evidenceLocator,
      nextPrimitive,
      finalReceiptDigest: null,
      finalReceiptLocator: null,
    });
  } catch (error) {
    if (error instanceof InvocationError) throw error;
    throw new InvocationError('BLOCKED', ['CONTINUITY_CHECKPOINT_PERSIST_FAILED']);
  }
}

async function invokeLive({
  repo,
  handoffText,
  manifestText,
  requestText,
  requestFile,
  patchFile,
  validationRequestText = null,
  validationRequestFile = null,
  env = process.env,
  runner,
  fetchImpl,
  spawnSyncImpl = childProcess.spawnSync,
  validationSpawnSyncImpl = childProcess.spawnSync,
  validationAdapterResolverImpl = resolveImplementationValidationInvocation,
  persistValidationArtifactImpl = persistImplementationValidationArtifact,
  root = ROOT,
  guardImpl,
  checkpointSink = null,
}) {
  const primitivePath = path.join(root, PRIMITIVE_RELATIVE);
  const primitiveHash = sha256File(primitivePath);
  let manifest;
  let handoff;
  let request;
  let prepare = null;
  let validation = null;
  let validationArtifactLocator = null;
  let committed = null;
  let pushed = null;
  let validationBinding = null;
  let validationEnabled = validationRequestText !== null || validationRequestFile !== null;
  try {
    manifest = parseManifestText(manifestText);
    handoff = parseHandoffText(handoffText);
    request = parseRequestText(requestText);
    const patchBytes = readBoundedRegularFile(patchFile, 'PATCH_FILE', MAX_PATCH_BYTES);
    if (sha256Bytes(patchBytes) !== request.patch_sha256) {
      throw new InvocationError('CONFLICT', ['PATCH_HASH_CONFLICT']);
    }
    const requestDigest = sha256Bytes(Buffer.from(requestText, 'utf8'));
    assertInputStable(requestFile, patchFile, requestDigest, request.patch_sha256);
    validateManifestBinding(manifest, handoff, request);

    if (manifestValidationRefs(manifest).length > 0) validationEnabled = true;
    if (validationEnabled) {
      validationBinding = prepareValidationBinding({
        manifest,
        request,
        validationRequestText,
        validationRequestFile,
      });
      assertValidationInputStable(validationBinding);
    }

    const holderSecret = env[workspaceHolder.CLAIM_ENV];
    if (!SHA256_RE.test(holderSecret || '')) {
      throw new InvocationError('BLOCKED', ['HOLDER_CLAIM_REQUIRED']);
    }
    const doGuard = async () => {
      if (guardImpl) return guardImpl({repo, manifest, handoff, holderSecret, env, runner, fetchImpl});
      return guardCurrent({repo, manifest, handoff, holderSecret, env, runner, fetchImpl});
    };
    await doGuard();
    assertInputStable(requestFile, patchFile, requestDigest, request.patch_sha256);
    if (validationBinding) assertValidationInputStable(validationBinding);

    const preparedRun = spawnPrimitive({
      phase: 'prepare', manifest, requestFile, patchFile, prior: {},
      spawnSyncImpl, root, env,
    });
    if (preparedRun.kind !== 'PASS') return projectGenericReceipt({
      manifest, request, primitiveSourceSha256: primitiveHash,
      kind: preparedRun.kind, reasons: preparedRun.reasonCodes,
      prepare: preparedRun.value,
      validation,
      validationEnabled,
      exitCode: Number.isInteger(preparedRun.run?.status) ? preparedRun.run.status : null,
    });
    prepare = preparedRun.value;
    await emitDetachedCheckpoint(checkpointSink, {
      checkpoint: 'SOURCE_MUTATION_COMPLETE',
      primitiveId: 'REPOSITORY_PATCH_PREPARE',
      targetIdentity: 'prepared:' + prepare.prepared_digest,
      evidenceLocator: 'receipt:mcl-repository-patch-prepare:' + manifest.manifestId,
      nextPrimitive: validationBinding ? 'PREPARED_VALIDATION' : 'COMMIT',
    });

    await doGuard();
    assertInputStable(requestFile, patchFile, requestDigest, request.patch_sha256);
    if (validationBinding) {
      assertValidationInputStable(validationBinding);
      const validationRun = runFixedPreparedValidation({
        binding: validationBinding,
        manifest,
        env,
        validationSpawnSyncImpl,
        validationAdapterResolverImpl,
        persistValidationArtifactImpl,
      });
      validation = validationRun.value;
      validationArtifactLocator = validationRun.artifactLocator || null;
      if (validationRun.kind !== 'PASS') return projectGenericReceipt({
        manifest, request, primitiveSourceSha256: primitiveHash,
        kind: validationRun.kind, reasons: validationRun.reasonCodes,
        prepare, validation, validationEnabled, validationArtifactLocator,
      });
      await emitDetachedCheckpoint(checkpointSink, {
        checkpoint: 'VALIDATION_PASS',
        primitiveId: 'REPOSITORY_VALIDATION_PROFILE',
        targetIdentity: 'validation-contract:' + validationBinding.profile.contractDigest,
        evidenceLocator: VALIDATION_CONTRACT_REF_PREFIX + validationBinding.profile.contractDigest,
        nextPrimitive: 'COMMIT',
      });
      await doGuard();
      assertInputStable(requestFile, patchFile, requestDigest, request.patch_sha256);
      assertValidationInputStable(validationBinding);
    }

    const commitRun = spawnPrimitive({
      phase: 'commit', manifest, requestFile, patchFile,
      prior: {preparedDigest: prepare.prepared_digest},
      spawnSyncImpl, root, env,
    });
    if (commitRun.kind !== 'PASS') return projectGenericReceipt({
      manifest, request, primitiveSourceSha256: primitiveHash,
      kind: commitRun.kind, reasons: commitRun.reasonCodes,
      prepare, validation, validationEnabled, validationArtifactLocator, commit: commitRun.value,
      exitCode: Number.isInteger(commitRun.run?.status) ? commitRun.run.status : null,
    });
    committed = commitRun.value;
    await emitDetachedCheckpoint(checkpointSink, {
      checkpoint: 'COMMIT_CREATED',
      primitiveId: 'REPOSITORY_PATCH_COMMIT',
      targetIdentity: 'commit:' + committed.new_head,
      evidenceLocator: 'commit:' + committed.new_head,
      nextPrimitive: 'PUSH',
    });

    await doGuard();
    assertInputStable(requestFile, patchFile, requestDigest, request.patch_sha256);
    if (validationBinding) assertValidationInputStable(validationBinding);
    const pushRun = spawnPrimitive({
      phase: 'push', manifest, requestFile, patchFile,
      prior: {preparedDigest: prepare.prepared_digest, newHead: committed.new_head},
      spawnSyncImpl, root, env,
    });
    if (pushRun.kind !== 'PASS') return projectGenericReceipt({
      manifest, request, primitiveSourceSha256: primitiveHash,
      kind: pushRun.kind, reasons: pushRun.reasonCodes,
      prepare, validation, validationEnabled, validationArtifactLocator,
      commit: committed, push: pushRun.value,
      exitCode: Number.isInteger(pushRun.run?.status) ? pushRun.run.status : null,
    });
    pushed = pushRun.value;
    await emitDetachedCheckpoint(checkpointSink, {
      checkpoint: 'PUSH_COMPLETE',
      primitiveId: 'REPOSITORY_PATCH_PUSH',
      targetIdentity: 'remote:' + manifest.workspace.branch + '@' + committed.new_head,
      evidenceLocator: 'commit:' + committed.new_head,
      nextPrimitive: 'REMOTE_HEAD_VERIFY',
    });
    return projectGenericReceipt({
      manifest, request, primitiveSourceSha256: primitiveHash,
      kind: 'PASS', prepare, validation, validationEnabled, validationArtifactLocator,
      commit: committed, push: pushed, exitCode: 0,
    });
  } catch (error) {
    if (!(error instanceof InvocationError)) throw error;
    return projectGenericReceipt({
      manifest, request, primitiveSourceSha256: primitiveHash,
      kind: error.kind, reasons: error.reasonCodes,
      prepare, validation, validationEnabled, validationArtifactLocator,
      commit: committed, push: pushed,
    });
  }
}

async function invokePreparedContinuation({
  repo,
  handoffText,
  manifestText,
  requestText,
  requestFile,
  env = process.env,
  runner,
  fetchImpl,
  spawnSyncImpl = childProcess.spawnSync,
  gitSpawnSyncImpl = childProcess.spawnSync,
  root = ROOT,
  guardImpl,
  inspectStateImpl = classifyPreparedContinuationState,
}) {
  const primitiveHash = sha256File(path.join(root, PRIMITIVE_RELATIVE));
  let manifest;
  let request;
  let bindingProven = false;
  let commit = null;
  let push = null;
  let commitAlreadyProven = false;
  let pushAlreadyProven = false;
  let currentState = null;
  let temporary = null;
  try {
    manifest = parseManifestText(manifestText);
    const handoff = parseHandoffText(handoffText);
    request = parsePreparedContinuationRequestText(requestText);
    const requestDigest = sha256Bytes(Buffer.from(requestText, 'utf8'));
    assertContinuationInputStable(requestFile, requestDigest);
    validatePreparedContinuationManifestBinding(manifest, handoff, request);
    bindingProven = true;
    const holderSecret = env[workspaceHolder.CLAIM_ENV];
    if (!SHA256_RE.test(holderSecret || '')) {
      throw new InvocationError('BLOCKED', ['HOLDER_CLAIM_REQUIRED']);
    }
    const doGuard = async () => {
      if (guardImpl) return guardImpl({repo, manifest, handoff, holderSecret, env, runner, fetchImpl});
      return guardCurrent({repo, manifest, handoff, holderSecret, env, runner, fetchImpl});
    };

    await doGuard();
    assertContinuationInputStable(requestFile, requestDigest);
    currentState = inspectStateImpl({manifest, request, env, gitSpawnSyncImpl});
    temporary = materializeContinuationPrimitiveInputs(request, currentState);

    if (currentState.state === 'PREPARED') {
      const commitRun = spawnPrimitive({
        phase: 'commit', manifest,
        requestFile: temporary.requestFile, patchFile: temporary.patchFile,
        prior: {preparedDigest: request.prepared_digest},
        spawnSyncImpl, root, env,
      });
      if (commitRun.kind !== 'PASS') return projectPreparedContinuationReceipt({
        manifest, request, primitiveSourceSha256: primitiveHash,
        kind: commitRun.kind, reasons: commitRun.reasonCodes,
        bindingProven, commit: commitRun.value,
        exitCode: Number.isInteger(commitRun.run?.status) ? commitRun.run.status : null,
      });
      commit = commitRun.value;
      await doGuard();
      assertContinuationInputStable(requestFile, requestDigest);
      currentState = inspectStateImpl({manifest, request, env, gitSpawnSyncImpl});
      if (!['COMMITTED', 'PUSHED'].includes(currentState.state)
          || currentState.newHead !== commit.new_head) {
        throw new InvocationError('CONFLICT', ['CONTINUATION_COMMIT_READBACK_CONFLICT']);
      }
    } else {
      commitAlreadyProven = ['COMMITTED', 'PUSHED'].includes(currentState.state);
    }

    if (currentState.state === 'COMMITTED') {
      await doGuard();
      assertContinuationInputStable(requestFile, requestDigest);
      const pushRun = spawnPrimitive({
        phase: 'push', manifest,
        requestFile: temporary.requestFile, patchFile: temporary.patchFile,
        prior: {preparedDigest: request.prepared_digest, newHead: currentState.newHead},
        spawnSyncImpl, root, env,
      });
      if (pushRun.kind !== 'PASS') return projectPreparedContinuationReceipt({
        manifest, request, primitiveSourceSha256: primitiveHash,
        kind: pushRun.kind, reasons: pushRun.reasonCodes,
        bindingProven, commit, commitAlreadyProven, push: pushRun.value,
        newHead: currentState.newHead,
        exitCode: Number.isInteger(pushRun.run?.status) ? pushRun.run.status : null,
      });
      push = pushRun.value;
    } else if (currentState.state === 'PUSHED') {
      pushAlreadyProven = true;
    } else {
      throw new InvocationError('CONFLICT', ['CONTINUATION_STATE_UNSUPPORTED']);
    }

    return projectPreparedContinuationReceipt({
      manifest, request, primitiveSourceSha256: primitiveHash,
      kind: 'PASS', bindingProven, commit, push,
      commitAlreadyProven, pushAlreadyProven,
      newHead: push?.new_head || currentState.newHead,
      exitCode: 0,
    });
  } catch (error) {
    if (!(error instanceof InvocationError)) throw error;
    return projectPreparedContinuationReceipt({
      manifest, request, primitiveSourceSha256: primitiveHash,
      kind: error.kind, reasons: error.reasonCodes,
      bindingProven, commit, push, commitAlreadyProven, pushAlreadyProven,
      newHead: currentState?.newHead || null,
    });
  } finally {
    if (temporary) temporary.cleanup();
  }
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = [...argv];
  const operation = args[0] === 'continue-prepared' ? args.shift() : 'normal';
  const allowed = operation === 'continue-prepared'
    ? new Set(['repo', 'handoff-file', 'manifest-file', 'request-file', 'format'])
    : new Set(['repo', 'handoff-file', 'manifest-file', 'request-file', 'patch-file', 'format']);
  const values = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--') || i + 1 >= args.length) throw new Error('ARGUMENT_INVALID');
    const key = token.slice(2);
    if (!allowed.has(key) || key in values) throw new Error('ARGUMENT_INVALID');
    values[key] = args[++i];
  }
  if (!values.repo || !values['handoff-file'] || !values['manifest-file']
      || !values['request-file'] || (operation === 'normal' && !values['patch-file'])) {
    throw new Error('ARGUMENT_INVALID');
  }
  const format = values.format || 'receipt';
  if (!OUTPUT_FORMATS.has(format)) throw new Error('FORMAT_INVALID');
  if (!operator.validateRepo(values.repo)) throw new Error('REPOSITORY_INVALID');
  return {
    operation,
    repo: values.repo,
    handoffFile: values['handoff-file'],
    manifestFile: values['manifest-file'],
    requestFile: values['request-file'],
    patchFile: values['patch-file'] || null,
    format,
  };
}
async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  const handoffText = readBoundedRegularFile(args.handoffFile, 'HANDOFF_FILE').toString('utf8');
  const manifestText = readBoundedRegularFile(args.manifestFile, 'MANIFEST_FILE').toString('utf8');
  const requestText = readBoundedRegularFile(args.requestFile, 'REQUEST_FILE').toString('utf8');
  const common = {
    repo: args.repo,
    handoffText,
    manifestText,
    requestText,
    requestFile: path.resolve(args.requestFile),
    env: options.env || process.env,
    runner: options.runner,
    fetchImpl: options.fetchImpl,
    spawnSyncImpl: options.spawnSyncImpl || childProcess.spawnSync,
    root: options.root || ROOT,
    guardImpl: options.guardImpl,
  };
  const receipt = args.operation === 'continue-prepared'
    ? await invokePreparedContinuation({
      ...common,
      gitSpawnSyncImpl: options.gitSpawnSyncImpl || childProcess.spawnSync,
      inspectStateImpl: options.inspectStateImpl || classifyPreparedContinuationState,
    })
    : await invokeLive({
      ...common,
      patchFile: path.resolve(args.patchFile),
      validationSpawnSyncImpl: options.validationSpawnSyncImpl || childProcess.spawnSync,
    });
  if (args.format === 'receipt') {
    return {text: JSON.stringify(receipt, null, 2) + '\n', code: executionReceipt.exitCodeFor(receipt)};
  }
  let projected;
  try {
    const manifest = parseManifestText(manifestText);
    const projector = options.agentViewImpl || projectOwnerAgentView;
    projected = projector(receipt, manifest, options.agentViewDeps || {});
  } catch (error) {
    projected = agentDecisionView.projectAgentDecisionView({
      receipt,
      phase: 'IMPLEMENTATION_EFFECT',
      output: {},
      attention: [],
      receiptLocator: '',
      reportLocator: '',
    });
  }
  return {text: JSON.stringify(projected, null, 2) + '\n', code: agentDecisionView.exitCodeFor(projected)};
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
  FALSE_AUTHORITY,
  HANDOFF_FIELDS,
  MAX_INPUT_BYTES,
  MAX_PATCH_BYTES,
  MAX_REPORT_BYTES,
  OUTPUT_FORMATS,
  PRIMITIVE_REF,
  PRIMITIVE_RELATIVE,
  REQUEST_FIELDS,
  CONTINUATION_REQUEST_FIELDS,
  CONTINUATION_REQUEST_SCHEMA,
  RECOVERY_REF_PREFIX,
  PRIOR_MANIFEST_REF_PREFIX,
  VALIDATION_REQUEST_FIELDS,
  VALIDATION_REQUEST_SCHEMA,
  VALIDATION_REF_PREFIX,
  VALIDATION_CONTRACT_REF_PREFIX,
  IMPLEMENTATION_VALIDATION_ADAPTER_REF_PREFIX,
  IMPLEMENTATION_VALIDATION_ADAPTER_SCHEMA,
  IMPLEMENTATION_VALIDATION_ARTIFACT_SCHEMA,
  STAGE_OWNER_ID,
  MUTATION_PRIMITIVE_ID,
  D014_VALIDATION_PROFILE,
  VALIDATION_CONTINUATION_PROFILE,
  PUBLISHED_PROGRESS_RECOVERY_PROFILE,
  DETACHED_CHECKPOINT_SCHEMA,
  D014_COMPLETION_SET_PATHS,
  VALIDATION_CONTINUATION_PATHS,
  PUBLISHED_PROGRESS_RECOVERY_PATHS,
  D014_VALIDATION_SCOPES,
  VALIDATION_CONTINUATION_SCOPES,
  PUBLISHED_PROGRESS_RECOVERY_SCOPES,
  D014_VALIDATION_CHECKS,
  VALIDATION_CONTINUATION_CHECKS,
  PUBLISHED_PROGRESS_RECOVERY_CHECKS,
  VALIDATION_PROFILES,
  IMPLEMENTATION_VALIDATION_ADAPTER_CONTRACT,
  buildImplementationValidationAdapterContract,
  InvocationError,
  assertInputStable,
  assertContinuationInputStable,
  guardCurrent,
  emitDetachedCheckpoint,
  invokeLive,
  invokePreparedContinuation,
  loadCurrentEvidence,
  ownerDecisionOutput,
  ownerReport,
  parseArgs,
  parseHandoffText,
  parseManifestText,
  parsePrimitiveResult,
  parseRequestText,
  parsePreparedContinuationRequestText,
  parseValidationRequestText,
  validationProfileById,
  resolveValidationProfileForScopes,
  manifestValidationRefs,
  manifestValidationContractRefs,
  manifestImplementationValidationAdapterRefs,
  prepareValidationBinding,
  assertValidationInputStable,
  runFixedPreparedValidation,
  resolveImplementationValidationInvocation,
  buildImplementationValidationArtifact,
  persistImplementationValidationArtifact,
  persistAgentArtifacts,
  primitiveArgs,
  projectGenericReceipt,
  projectPreparedContinuationReceipt,
  projectOwnerAgentView,
  runCli,
  safeChildEnv,
  classifyPreparedContinuationState,
  materializeContinuationPrimitiveInputs,
  sha256Bytes,
  validateCurrentEvidence,
  validateHolder,
  validateLeaseAgainstManifest,
  validateManifestBinding,
  validatePreparedContinuationManifestBinding,
  writeJsonSidecar,
};
