'use strict';

const crypto = require('node:crypto');
const { normalizeScope } = require('../../../.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs');
const { ROUTES, EXECUTORS, validateWorkspace: validateLeaseWorkspace, validateLandingMetadataBinding, validateLandingBranchRepairBinding } = require('./task-lease.cjs');

const MANIFEST_START = '<!-- mcl-task-manifest:v1 -->';
const MANIFEST_END = '<!-- /mcl-task-manifest:v1 -->';
const RECEIPT_START = '<!-- mcl-task-completion-receipt:v1 -->';
const RECEIPT_END = '<!-- /mcl-task-completion-receipt:v1 -->';
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const PACKET_REF_RE = /^#[1-9][0-9]*$/;
const PHASE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/;
const SAFE_REF_RE = /^(?:#[1-9][0-9]*|(?:issue|pr|ledger):#[1-9][0-9]*|run:[1-9][0-9]*|commit:[0-9a-f]{40}|(?:path|doc):[^\s]{1,400}|receipt:[A-Za-z0-9._:#/-]{1,400}|https:\/\/github\.com\/[^\s]{1,400})$/;
const PHASE_CLASSES = new Set(['READ_ONLY', 'REPOSITORY_MUTATION', 'DEVICE_OR_LAB_MUTATION', 'VALIDATION', 'EXPERIMENT', 'COORDINATION']);
const DISPOSITIONS = new Set(['COMPLETE', 'BLOCKED', 'PARTIAL']);
const MAX_REFS = 16;
const MAX_SCOPES = 16;
const EMPTY_SHA256 = crypto.createHash('sha256').update('').digest('hex');
const PRESERVED_DIRTY_SURFACE_RE =
  /^surface:mcl:validation-residue-cleanup:[A-Za-z0-9._/-]+$/;
const AUTHORITY_FLAGS = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function digest(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(stable(value));
  return crypto.createHash('sha256').update(text).digest('hex');
}
function sameAuthorityFlags(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(AUTHORITY_FLAGS).every((key) => value[key] === false)
    && Object.keys(value).length === Object.keys(AUTHORITY_FLAGS).length;
}
function exactKeys(value, allowed, required, prefix) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${prefix}_OBJECT_REQUIRED`];
  const errors = [];
  for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(`${prefix}_UNKNOWN_FIELD:${key}`);
  for (const key of required) if (!(key in value)) errors.push(`${prefix}_FIELD_REQUIRED:${key}`);
  return errors;
}
function normalizeRefs(value, field, { min = 0 } = {}) {
  const errors = [];
  if (!Array.isArray(value) || value.length < min || value.length > MAX_REFS) return { errors: [`${field}_INVALID`], value: [] };
  const normalized = [];
  for (const ref of value) {
    if (typeof ref !== 'string' || !SAFE_REF_RE.test(ref)) errors.push(`${field}_REF_INVALID`);
    else normalized.push(ref);
  }
  const unique = [...new Set(normalized)].sort();
  if (unique.length !== normalized.length) errors.push(`${field}_DUPLICATE`);
  return { errors, value: unique };
}
function normalizeScopes(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_SCOPES) return { errors: ['MANIFEST_SCOPES_INVALID'], value: [] };
  const errors = [];
  const normalized = [];
  for (const raw of value) {
    const scope = normalizeScope(raw);
    if (!scope.ok) errors.push('MANIFEST_SCOPE_INVALID');
    else normalized.push(scope.normalized);
  }
  const unique = [...new Set(normalized)].sort();
  if (unique.length !== normalized.length) errors.push('MANIFEST_SCOPE_DUPLICATE');
  return { errors, value: unique };
}
function routeExecutorCompatible(route, executor) {
  if (!ROUTES.includes(route) || !EXECUTORS.has(executor)) return false;
  return route === 'S' ? executor === 'S' || executor === 'M' : route === executor;
}
function validateWorkspace(workspace, executor, route, scopes, observedBaseSha) {
  const errors = exactKeys(workspace, new Set(['kind', 'branch', 'worktree']), ['kind', 'branch', 'worktree'], 'WORKSPACE');
  if (errors.length) return errors;
  errors.push(...validateLeaseWorkspace(workspace, executor));
  if (route === 'S' && !['repository', 'landing_metadata'].includes(workspace.kind)) errors.push('WORKSPACE_S_ROUTE_REPOSITORY_REQUIRED');
  errors.push(...validateLandingMetadataBinding({workspace, executor, scopes, observedBaseSha}));
  errors.push(...validateLandingBranchRepairBinding({workspace, route, executor, scopes, observedBaseSha}));
  return [...new Set(errors)].sort();
}
function normalizeLeaseEvidence(value, required) {
  if (!required) return value === null ? { errors: [], value: null } : { errors: ['MANIFEST_LEASE_EVIDENCE_FORBIDDEN'], value: null };
  const errors = exactKeys(value, new Set(['ledgerRef', 'leaseId', 'acquiredGeneration', 'acquireEvidenceRef']), ['ledgerRef', 'leaseId', 'acquiredGeneration', 'acquireEvidenceRef'], 'MANIFEST_LEASE');
  if (errors.length) return { errors, value: null };
  if (value.ledgerRef !== '#2352') errors.push('MANIFEST_LEASE_LEDGER_INVALID');
  if (!SHA256_RE.test(value.leaseId || '')) errors.push('MANIFEST_LEASE_ID_INVALID');
  if (!Number.isSafeInteger(value.acquiredGeneration) || value.acquiredGeneration < 1) errors.push('MANIFEST_LEASE_GENERATION_INVALID');
  if (!SAFE_REF_RE.test(value.acquireEvidenceRef || '')) errors.push('MANIFEST_LEASE_EVIDENCE_REF_INVALID');
  return { errors, value: { ...value } };
}
const MANIFEST_CORE_KEYS = new Set([
  'schemaVersion', 'mode', 'packetRef', 'packetBodySha256', 'phaseId', 'phaseClass',
  'route', 'executor', 'scopes', 'workspace', 'observedBaseSha', 'leaseRequirement',
  'leaseEvidence', 'sourceAuthorityRefs', 'inputRefs', 'expectedOutputRefs', 'acceptanceRefs',
  'stopCondition', 'authority',
]);
function normalizeManifestCore(input) {
  const errors = exactKeys(input, MANIFEST_CORE_KEYS, [...MANIFEST_CORE_KEYS], 'MANIFEST');
  if (input?.schemaVersion !== 1) errors.push('MANIFEST_SCHEMA_INVALID');
  if (input?.mode !== 'MCL_TASK_MANIFEST') errors.push('MANIFEST_MODE_INVALID');
  if (!PACKET_REF_RE.test(input?.packetRef || '')) errors.push('MANIFEST_PACKET_REF_INVALID');
  if (!SHA256_RE.test(input?.packetBodySha256 || '')) errors.push('MANIFEST_PACKET_HASH_INVALID');
  if (!PHASE_ID_RE.test(input?.phaseId || '')) errors.push('MANIFEST_PHASE_ID_INVALID');
  if (!PHASE_CLASSES.has(input?.phaseClass)) errors.push('MANIFEST_PHASE_CLASS_INVALID');
  if (!ROUTES.includes(input?.route)) errors.push('MANIFEST_ROUTE_INVALID');
  if (!EXECUTORS.has(input?.executor)) errors.push('MANIFEST_EXECUTOR_INVALID');
  if (!routeExecutorCompatible(input?.route, input?.executor)) errors.push('MANIFEST_ROUTE_EXECUTOR_CONFLICT');
  const scopes = normalizeScopes(input?.scopes);
  errors.push(...scopes.errors);
  if (input?.observedBaseSha !== null && !SHA40_RE.test(input?.observedBaseSha || '')) errors.push('MANIFEST_BASE_SHA_INVALID');
  errors.push(...validateWorkspace(input?.workspace, input?.executor, input?.route, scopes.value, input?.observedBaseSha));
  if (!['REQUIRED', 'NOT_REQUIRED'].includes(input?.leaseRequirement)) errors.push('MANIFEST_LEASE_REQUIREMENT_INVALID');
  const lease = normalizeLeaseEvidence(input?.leaseEvidence, input?.leaseRequirement === 'REQUIRED');
  errors.push(...lease.errors);
  const sourceRefs = normalizeRefs(input?.sourceAuthorityRefs, 'MANIFEST_SOURCE_REFS', { min: 1 });
  const inputRefs = normalizeRefs(input?.inputRefs, 'MANIFEST_INPUT_REFS');
  const expectedRefs = normalizeRefs(input?.expectedOutputRefs, 'MANIFEST_EXPECTED_OUTPUT_REFS', { min: 1 });
  const acceptanceRefs = normalizeRefs(input?.acceptanceRefs, 'MANIFEST_ACCEPTANCE_REFS', { min: 1 });
  errors.push(...sourceRefs.errors, ...inputRefs.errors, ...expectedRefs.errors, ...acceptanceRefs.errors);
  if (typeof input?.stopCondition !== 'string' || input.stopCondition.length < 1 || input.stopCondition.length > 500 || /[\r\n]/.test(input.stopCondition)) errors.push('MANIFEST_STOP_CONDITION_INVALID');
  if (!sameAuthorityFlags(input?.authority)) errors.push('MANIFEST_AUTHORITY_FLAGS_INVALID');
  const value = {
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: input?.packetRef,
    packetBodySha256: input?.packetBodySha256,
    phaseId: input?.phaseId,
    phaseClass: input?.phaseClass,
    route: input?.route,
    executor: input?.executor,
    scopes: scopes.value,
    workspace: input?.workspace ? { ...input.workspace } : null,
    observedBaseSha: input?.observedBaseSha ?? null,
    leaseRequirement: input?.leaseRequirement,
    leaseEvidence: lease.value,
    sourceAuthorityRefs: sourceRefs.value,
    inputRefs: inputRefs.value,
    expectedOutputRefs: expectedRefs.value,
    acceptanceRefs: acceptanceRefs.value,
    stopCondition: input?.stopCondition,
    authority: { ...AUTHORITY_FLAGS },
  };
  return { errors: [...new Set(errors)].sort(), value };
}
function buildManifest(input) {
  const normalized = normalizeManifestCore(input);
  if (normalized.errors.length) throw new Error(normalized.errors.join(','));
  const payloadSha256 = digest(normalized.value);
  const manifestId = digest(`MCL_TASK_MANIFEST_V1:${payloadSha256}`);
  return { ...normalized.value, manifestId, payloadSha256 };
}
function verifyManifestObject(input) {
  const fullKeys = new Set([...MANIFEST_CORE_KEYS, 'manifestId', 'payloadSha256']);
  const errors = exactKeys(input, fullKeys, [...fullKeys], 'MANIFEST');
  const core = input && typeof input === 'object' ? Object.fromEntries([...MANIFEST_CORE_KEYS].map((key) => [key, input[key]])) : {};
  let built = null;
  try { built = buildManifest(core); } catch (error) { errors.push(...String(error.message).split(',')); }
  if (built) {
    if (input.manifestId !== built.manifestId) errors.push('MANIFEST_ID_MISMATCH');
    if (input.payloadSha256 !== built.payloadSha256) errors.push('MANIFEST_PAYLOAD_HASH_MISMATCH');
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)].sort(), value: built };
}
function normalizeReleaseEvidence(value) {
  const errors = exactKeys(value, new Set(['ledgerRef', 'leaseId', 'releasedGeneration', 'evidenceRef']), ['ledgerRef', 'leaseId', 'releasedGeneration', 'evidenceRef'], 'RECEIPT_RELEASE');
  if (errors.length) return { errors, value: null };
  if (value.ledgerRef !== '#2352') errors.push('RECEIPT_RELEASE_LEDGER_INVALID');
  if (!SHA256_RE.test(value.leaseId || '')) errors.push('RECEIPT_RELEASE_LEASE_ID_INVALID');
  if (!Number.isSafeInteger(value.releasedGeneration) || value.releasedGeneration < 1) errors.push('RECEIPT_RELEASE_GENERATION_INVALID');
  if (!SAFE_REF_RE.test(value.evidenceRef || '')) errors.push('RECEIPT_RELEASE_EVIDENCE_REF_INVALID');
  return { errors, value: { ...value } };
}
function normalizeWorkspacePreservation(value) {
  if (value === undefined) return { errors: [], value: null, present: false };
  const errors = exactKeys(
    value,
    new Set(['kind', 'beforeSha256', 'afterSha256', 'preservedPathRefs', 'evidenceRef']),
    ['kind', 'beforeSha256', 'afterSha256', 'preservedPathRefs', 'evidenceRef'],
    'RECEIPT_PRESERVATION',
  );
  if (errors.length) return { errors, value: null, present: true };
  if (value.kind !== 'TRACKED_DIFF_PRESERVED') errors.push('RECEIPT_PRESERVATION_KIND_INVALID');
  if (!SHA256_RE.test(value.beforeSha256 || '')) errors.push('RECEIPT_PRESERVATION_BEFORE_SHA_INVALID');
  if (!SHA256_RE.test(value.afterSha256 || '')) errors.push('RECEIPT_PRESERVATION_AFTER_SHA_INVALID');
  if (SHA256_RE.test(value.beforeSha256 || '') && SHA256_RE.test(value.afterSha256 || '')
      && value.beforeSha256 !== value.afterSha256) {
    errors.push('RECEIPT_PRESERVATION_DIFF_IDENTITY_MISMATCH');
  }
  if (value.beforeSha256 === EMPTY_SHA256 || value.afterSha256 === EMPTY_SHA256) {
    errors.push('RECEIPT_PRESERVATION_EMPTY_DIFF_FORBIDDEN');
  }
  const preserved = [];
  if (!Array.isArray(value.preservedPathRefs) || value.preservedPathRefs.length < 1
      || value.preservedPathRefs.length > MAX_REFS) {
    errors.push('RECEIPT_PRESERVATION_PATH_REFS_INVALID');
  } else {
    for (const raw of value.preservedPathRefs) {
      const parsed = normalizeScope(raw);
      if (!parsed.ok || !parsed.normalized.startsWith('path:')) {
        errors.push('RECEIPT_PRESERVATION_PATH_REF_INVALID');
        continue;
      }
      preserved.push(parsed.normalized);
    }
    const uniquePreserved = [...new Set(preserved)].sort();
    if (uniquePreserved.length !== preserved.length) errors.push('RECEIPT_PRESERVATION_PATH_REF_DUPLICATE');
    preserved.splice(0, preserved.length, ...uniquePreserved);
  }
  if (!SAFE_REF_RE.test(value.evidenceRef || '')) errors.push('RECEIPT_PRESERVATION_EVIDENCE_REF_INVALID');
  return {
    errors: [...new Set(errors)].sort(),
    value: errors.length ? null : {
      kind: 'TRACKED_DIFF_PRESERVED', beforeSha256: value.beforeSha256, afterSha256: value.afterSha256,
      preservedPathRefs: preserved, evidenceRef: value.evidenceRef,
    },
    present: true,
  };
}
const RECEIPT_REQUIRED_KEYS = new Set([
  'schemaVersion', 'mode', 'manifestId', 'manifestPayloadSha256', 'packetRef', 'phaseId', 'executor',
  'disposition', 'outputRefs', 'validationRefs', 'observedRefs', 'leaseDisposition',
  'leaseReleaseEvidence', 'workspaceResult', 'blockerRefs', 'requiredUnknownRefs', 'authority',
]);
const RECEIPT_CORE_KEYS = new Set([...RECEIPT_REQUIRED_KEYS, 'workspacePreservation']);
function normalizeReceiptCore(input) {
  const errors = exactKeys(input, RECEIPT_CORE_KEYS, [...RECEIPT_REQUIRED_KEYS], 'RECEIPT');
  if (input?.schemaVersion !== 1) errors.push('RECEIPT_SCHEMA_INVALID');
  if (input?.mode !== 'MCL_COMPLETION_RECEIPT') errors.push('RECEIPT_MODE_INVALID');
  if (!SHA256_RE.test(input?.manifestId || '')) errors.push('RECEIPT_MANIFEST_ID_INVALID');
  if (!SHA256_RE.test(input?.manifestPayloadSha256 || '')) errors.push('RECEIPT_MANIFEST_HASH_INVALID');
  if (!PACKET_REF_RE.test(input?.packetRef || '')) errors.push('RECEIPT_PACKET_REF_INVALID');
  if (!PHASE_ID_RE.test(input?.phaseId || '')) errors.push('RECEIPT_PHASE_ID_INVALID');
  if (!EXECUTORS.has(input?.executor)) errors.push('RECEIPT_EXECUTOR_INVALID');
  if (!DISPOSITIONS.has(input?.disposition)) errors.push('RECEIPT_DISPOSITION_INVALID');
  const outputRefs = normalizeRefs(input?.outputRefs, 'RECEIPT_OUTPUT_REFS');
  const validationRefs = normalizeRefs(input?.validationRefs, 'RECEIPT_VALIDATION_REFS');
  const observedRefs = normalizeRefs(input?.observedRefs, 'RECEIPT_OBSERVED_REFS');
  const blockerRefs = normalizeRefs(input?.blockerRefs, 'RECEIPT_BLOCKER_REFS');
  const unknownRefs = normalizeRefs(input?.requiredUnknownRefs, 'RECEIPT_UNKNOWN_REFS');
  errors.push(...outputRefs.errors, ...validationRefs.errors, ...observedRefs.errors, ...blockerRefs.errors, ...unknownRefs.errors);
  if (!['RELEASED', 'NOT_REQUIRED', 'UNKNOWN'].includes(input?.leaseDisposition)) errors.push('RECEIPT_LEASE_DISPOSITION_INVALID');
  let release = { errors: [], value: null };
  if (input?.leaseReleaseEvidence !== null) release = normalizeReleaseEvidence(input.leaseReleaseEvidence);
  errors.push(...release.errors);
  const preservation = normalizeWorkspacePreservation(input?.workspacePreservation);
  errors.push(...preservation.errors);
  if (!['clean', 'not_applicable', 'unknown', 'preserved_dirty'].includes(input?.workspaceResult)) {
    errors.push('RECEIPT_WORKSPACE_RESULT_INVALID');
  }
  if (input?.workspaceResult === 'preserved_dirty') {
    if (input?.disposition !== 'COMPLETE') errors.push('RECEIPT_PRESERVED_DIRTY_COMPLETE_REQUIRED');
    if (!preservation.present) errors.push('RECEIPT_PRESERVATION_REQUIRED');
  } else if (preservation.present) {
    errors.push('RECEIPT_PRESERVATION_UNEXPECTED');
  }
  if (!sameAuthorityFlags(input?.authority)) errors.push('RECEIPT_AUTHORITY_FLAGS_INVALID');
  const value = {
    schemaVersion: 1,
    mode: 'MCL_COMPLETION_RECEIPT',
    manifestId: input?.manifestId,
    manifestPayloadSha256: input?.manifestPayloadSha256,
    packetRef: input?.packetRef,
    phaseId: input?.phaseId,
    executor: input?.executor,
    disposition: input?.disposition,
    outputRefs: outputRefs.value,
    validationRefs: validationRefs.value,
    observedRefs: observedRefs.value,
    leaseDisposition: input?.leaseDisposition,
    leaseReleaseEvidence: release.value,
    workspaceResult: input?.workspaceResult,
    blockerRefs: blockerRefs.value,
    requiredUnknownRefs: unknownRefs.value,
    authority: { ...AUTHORITY_FLAGS },
  };
  if (preservation.present && preservation.value) value.workspacePreservation = preservation.value;
  return { errors: [...new Set(errors)].sort(), value };
}
function verifyReceiptObject(input) {
  const fullKeys = new Set([...RECEIPT_CORE_KEYS, 'receiptId', 'payloadSha256']);
  const requiredFullKeys = new Set([...RECEIPT_REQUIRED_KEYS, 'receiptId', 'payloadSha256']);
  const errors = exactKeys(input, fullKeys, [...requiredFullKeys], 'RECEIPT');
  const core = input && typeof input === 'object'
    ? Object.fromEntries([...RECEIPT_REQUIRED_KEYS].map((key) => [key, input[key]]))
    : {};
  if (input && typeof input === 'object'
      && Object.prototype.hasOwnProperty.call(input, 'workspacePreservation')) {
    core.workspacePreservation = input.workspacePreservation;
  }
  const normalized = normalizeReceiptCore(core);
  errors.push(...normalized.errors);
  let value = null;
  if (normalized.errors.length === 0) {
    const payloadSha256 = digest(normalized.value);
    const receiptId = digest(`MCL_COMPLETION_RECEIPT_V1:${payloadSha256}`);
    value = { ...normalized.value, receiptId, payloadSha256 };
    if (input.receiptId !== receiptId) errors.push('RECEIPT_ID_MISMATCH');
    if (input.payloadSha256 !== payloadSha256) errors.push('RECEIPT_PAYLOAD_HASH_MISMATCH');
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)].sort(), value };
}
function validatePreservedDirtyCompletion(manifest, receipt) {
  const errors = [];
  if (manifest.phaseClass !== 'REPOSITORY_MUTATION') errors.push('RECEIPT_PRESERVED_DIRTY_PHASE_CLASS_INVALID');
  if (manifest.workspace?.kind !== 'repository') errors.push('RECEIPT_PRESERVED_DIRTY_WORKSPACE_INVALID');
  const pathScopes = manifest.scopes.filter((item) => item.startsWith('path:'));
  const cleanupSurfaces = manifest.scopes.filter((item) => PRESERVED_DIRTY_SURFACE_RE.test(item));
  if (manifest.scopes.length !== 2 || pathScopes.length !== 1 || cleanupSurfaces.length !== 1) {
    errors.push('RECEIPT_PRESERVED_DIRTY_MANIFEST_SCOPE_INVALID');
  }
  const cleanupPath = pathScopes.length === 1 ? pathScopes[0] : null;
  if (cleanupPath && !manifest.expectedOutputRefs.includes(cleanupPath)) {
    errors.push('RECEIPT_PRESERVED_DIRTY_EXPECTED_OUTPUT_MISSING');
  }
  const preservation = receipt.workspacePreservation;
  if (!preservation) errors.push('RECEIPT_PRESERVATION_REQUIRED');
  else {
    if (cleanupPath && preservation.preservedPathRefs.includes(cleanupPath)) {
      errors.push('RECEIPT_PRESERVATION_CLEANUP_PATH_CONFLICT');
    }
    if (!receipt.validationRefs.includes(preservation.evidenceRef)) {
      errors.push('RECEIPT_PRESERVATION_EVIDENCE_NOT_VALIDATED');
    }
  }
  return [...new Set(errors)].sort();
}
function validateReceiptAgainstManifest(receiptInput, manifestInput) {
  const manifest = verifyManifestObject(manifestInput);
  const receipt = verifyReceiptObject(receiptInput);
  const errors = [...manifest.errors, ...receipt.errors];
  if (!manifest.ok || !receipt.ok) return { ok: false, status: 'BLOCKED', errors: [...new Set(errors)].sort() };
  const m = manifest.value;
  const r = receipt.value;
  if (r.manifestId !== m.manifestId) errors.push('RECEIPT_MANIFEST_ID_CONFLICT');
  if (r.manifestPayloadSha256 !== m.payloadSha256) errors.push('RECEIPT_MANIFEST_HASH_CONFLICT');
  if (r.packetRef !== m.packetRef) errors.push('RECEIPT_PACKET_REF_CONFLICT');
  if (r.phaseId !== m.phaseId) errors.push('RECEIPT_PHASE_ID_CONFLICT');
  if (r.executor !== m.executor) errors.push('RECEIPT_EXECUTOR_CONFLICT');
  if (m.leaseRequirement === 'REQUIRED') {
    if (r.leaseDisposition !== 'RELEASED' || !r.leaseReleaseEvidence) errors.push('RECEIPT_REQUIRED_LEASE_NOT_RELEASED');
    else {
      if (r.leaseReleaseEvidence.leaseId !== m.leaseEvidence.leaseId) errors.push('RECEIPT_RELEASE_LEASE_ID_CONFLICT');
      if (r.leaseReleaseEvidence.releasedGeneration <= m.leaseEvidence.acquiredGeneration) errors.push('RECEIPT_RELEASE_GENERATION_NOT_ADVANCED');
    }
  } else if (r.leaseDisposition !== 'NOT_REQUIRED' || r.leaseReleaseEvidence !== null) {
    errors.push('RECEIPT_UNEXPECTED_LEASE_RELEASE_EVIDENCE');
  }
  if (r.disposition === 'COMPLETE') {
    if (r.requiredUnknownRefs.length) errors.push('RECEIPT_COMPLETE_HAS_REQUIRED_UNKNOWN');
    if (r.blockerRefs.length) errors.push('RECEIPT_COMPLETE_HAS_BLOCKER');
    if (!r.outputRefs.length) errors.push('RECEIPT_COMPLETE_OUTPUT_REQUIRED');
    if (!r.validationRefs.length) errors.push('RECEIPT_COMPLETE_VALIDATION_REQUIRED');
    if (r.workspaceResult === 'preserved_dirty') {
      errors.push(...validatePreservedDirtyCompletion(m, r));
    } else {
      const expectedWorkspace = m.workspace.kind === 'not_applicable' ? 'not_applicable' : 'clean';
      if (r.workspaceResult !== expectedWorkspace) errors.push('RECEIPT_COMPLETE_WORKSPACE_NOT_CONVERGED');
    }
  }
  if (r.disposition === 'BLOCKED' && !r.blockerRefs.length && !r.requiredUnknownRefs.length) errors.push('RECEIPT_BLOCKED_REASON_REQUIRED');
  return { ok: errors.length === 0, status: errors.length ? 'BLOCKED' : 'VALID', errors: [...new Set(errors)].sort() };
}
const RECEIPT_RESULT_KEYS = new Set(['disposition', 'outputRefs', 'validationRefs', 'observedRefs', 'leaseDisposition', 'leaseReleaseEvidence', 'workspaceResult', 'workspacePreservation', 'blockerRefs', 'requiredUnknownRefs']);
function buildCompletionReceipt(manifestInput, input) {
  const inputErrors = exactKeys(input, RECEIPT_RESULT_KEYS, ['disposition', 'leaseDisposition', 'workspaceResult'], 'RECEIPT_INPUT');
  if (inputErrors.length) throw new Error(inputErrors.join(','));
  const manifest = verifyManifestObject(manifestInput);
  if (!manifest.ok) throw new Error(manifest.errors.join(','));
  const m = manifest.value;
  const coreInput = {
    schemaVersion: 1,
    mode: 'MCL_COMPLETION_RECEIPT',
    manifestId: m.manifestId,
    manifestPayloadSha256: m.payloadSha256,
    packetRef: m.packetRef,
    phaseId: m.phaseId,
    executor: m.executor,
    disposition: input?.disposition,
    outputRefs: input?.outputRefs ?? [],
    validationRefs: input?.validationRefs ?? [],
    observedRefs: input?.observedRefs ?? [],
    leaseDisposition: input?.leaseDisposition,
    leaseReleaseEvidence: input?.leaseReleaseEvidence ?? null,
    workspaceResult: input?.workspaceResult,
    blockerRefs: input?.blockerRefs ?? [],
    requiredUnknownRefs: input?.requiredUnknownRefs ?? [],
    authority: { ...AUTHORITY_FLAGS },
  };
  if (input && Object.prototype.hasOwnProperty.call(input, 'workspacePreservation')) {
    coreInput.workspacePreservation = input.workspacePreservation;
  }
  const normalized = normalizeReceiptCore(coreInput);
  if (normalized.errors.length) throw new Error(normalized.errors.join(','));
  const payloadSha256 = digest(normalized.value);
  const receiptId = digest(`MCL_COMPLETION_RECEIPT_V1:${payloadSha256}`);
  const receipt = { ...normalized.value, receiptId, payloadSha256 };
  const cross = validateReceiptAgainstManifest(receipt, m);
  if (!cross.ok) throw new Error(cross.errors.join(','));
  return receipt;
}
function renderEnvelope(start, end, value) {
  return [start, '```json', JSON.stringify(value, null, 2), '```', end].join('\n');
}
function renderManifest(manifest) {
  const verified = verifyManifestObject(manifest);
  if (!verified.ok) throw new Error(verified.errors.join(','));
  return renderEnvelope(MANIFEST_START, MANIFEST_END, verified.value);
}
function renderCompletionReceipt(receipt) {
  const verified = verifyReceiptObject(receipt);
  if (!verified.ok) throw new Error(verified.errors.join(','));
  return renderEnvelope(RECEIPT_START, RECEIPT_END, verified.value);
}
function markerCount(text, marker) {
  return typeof text === 'string' ? text.split(marker).length - 1 : 0;
}
function parseEnvelope(text, start, end, verifier, kind) {
  if (typeof text !== 'string') return { status: 'UNKNOWN', reasonCodes: [`${kind}_TEXT_REQUIRED`], value: null };
  const starts = markerCount(text, start);
  const ends = markerCount(text, end);
  if (starts === 0 || ends === 0) return { status: 'UNKNOWN', reasonCodes: [`${kind}_MARKER_MISSING`], value: null };
  if (starts !== 1 || ends !== 1) return { status: 'CONFLICT', reasonCodes: [`${kind}_MARKER_DUPLICATE`], value: null };
  const trimmed = text.trim();
  const prefix = `${start}\n\`\`\`json\n`;
  const suffix = `\n\`\`\`\n${end}`;
  if (!trimmed.startsWith(prefix) || !trimmed.endsWith(suffix)) return { status: 'UNKNOWN', reasonCodes: [`${kind}_ENVELOPE_FORMAT_INVALID`], value: null };
  let parsed;
  try { parsed = JSON.parse(trimmed.slice(prefix.length, trimmed.length - suffix.length)); }
  catch { return { status: 'UNKNOWN', reasonCodes: [`${kind}_JSON_INVALID`], value: null }; }
  const verified = verifier(parsed);
  return verified.ok
    ? { status: 'VALID', reasonCodes: [], value: verified.value }
    : { status: 'UNKNOWN', reasonCodes: verified.errors, value: null };
}
function parseManifest(text) {
  return parseEnvelope(text, MANIFEST_START, MANIFEST_END, verifyManifestObject, 'MANIFEST');
}
function parseCompletionReceipt(text) {
  return parseEnvelope(text, RECEIPT_START, RECEIPT_END, verifyReceiptObject, 'RECEIPT');
}
function classifyIdentity(left, right, idField) {
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return { status: 'UNKNOWN', reason: 'OBJECT_REQUIRED' };
  if (left[idField] !== right[idField]) return { status: 'SEPARATE', reason: 'IDENTITY_DIFFERS' };
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right))
    ? { status: 'IDEMPOTENT', reason: 'IDENTICAL_ENVELOPE' }
    : { status: 'CONFLICT', reason: 'SAME_ID_DIFFERENT_PAYLOAD' };
}

module.exports = {
  AUTHORITY_FLAGS,
  MANIFEST_END,
  MANIFEST_START,
  RECEIPT_END,
  RECEIPT_START,
  buildCompletionReceipt,
  buildManifest,
  classifyIdentity,
  digest,
  normalizeManifestCore,
  normalizeReceiptCore,
  parseCompletionReceipt,
  parseManifest,
  renderCompletionReceipt,
  renderManifest,
  routeExecutorCompatible,
  stable,
  validateReceiptAgainstManifest,
  verifyManifestObject,
  verifyReceiptObject,
};
