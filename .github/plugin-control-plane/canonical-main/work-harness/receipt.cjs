'use strict';

const { validateWorkRecord } = require('./contract.cjs');
const { evaluateWorkSet } = require('./preflight.cjs');
const { planDispatch, validateAdapterRegistry } = require('./dispatch.cjs');
const { canonicalize, stableHash } = require('./handoff.cjs');

const RECEIPT_START = '<!-- repository-coordination-receipt:v1 -->';
const RECEIPT_END = '<!-- /repository-coordination-receipt:v1 -->';
const INVALIDATION_RULES = Object.freeze([
  'WORK_PROFILE_DRIFT',
  'ACTIVE_WORK_SET_DRIFT',
  'PREFLIGHT_DRIFT',
  'OBSERVED_REF_DRIFT',
  'EXPECTED_BASE_DRIFT',
  'ADAPTER_CONTRACT_DRIFT',
  'PROJECT_REGISTRY_DRIFT',
  'AUTHORITY_REF_DRIFT',
]);

function normalizeRecords(records) {
  if (!Array.isArray(records)) return null;
  return [...records].sort((a, b) => String(a?.workId || '').localeCompare(String(b?.workId || '')));
}

function normalizeObservedRefs(observedRefs) {
  if (Array.isArray(observedRefs)) {
    const entries = observedRefs.map((entry) => ({ ref: entry?.ref, sha: entry?.sha }));
    if (entries.some((entry) => typeof entry.ref !== 'string' || !entry.ref || typeof entry.sha !== 'string' || !entry.sha)) return null;
    if (new Set(entries.map((entry) => entry.ref)).size !== entries.length) return null;
    return entries.sort((a, b) => a.ref.localeCompare(b.ref));
  }
  if (!observedRefs || typeof observedRefs !== 'object') return null;
  const entries = Object.entries(observedRefs).map(([ref, sha]) => ({ ref, sha }));
  if (entries.some((entry) => !entry.ref || typeof entry.sha !== 'string' || !entry.sha)) return null;
  return entries.sort((a, b) => a.ref.localeCompare(b.ref));
}

function expectedBases(record) {
  return [...record.expectedBases]
    .map((entry) => ({ ref: entry.ref, mode: entry.mode, ...(entry.sha ? { sha: entry.sha } : {}), ...(entry.mayAdvance !== undefined ? { mayAdvance: entry.mayAdvance } : {}) }))
    .sort((a, b) => a.ref.localeCompare(b.ref));
}

function targetRecord(records, workRecord) {
  const matches = records.filter((record) => record.workId === workRecord.workId);
  if (matches.length !== 1) return { ok: false, reasonCodes: [matches.length ? 'RECEIPT_DUPLICATE_TARGET_WORK' : 'RECEIPT_TARGET_WORK_NOT_ACTIVE'] };
  if (stableHash(matches[0]) !== stableHash(workRecord)) return { ok: false, reasonCodes: ['RECEIPT_TARGET_WORK_PROFILE_MISMATCH'] };
  return { ok: true };
}

function exactBaseReasons(record, refs) {
  const byRef = new Map(refs.map((entry) => [entry.ref, entry.sha]));
  const reasons = [];
  for (const base of record.expectedBases) {
    if (base.mode !== 'EXACT') {
      reasons.push(`RECEIPT_REFRESHABLE_BASE_UNSUPPORTED_B3:${base.ref}`);
      continue;
    }
    const observed = byRef.get(base.ref);
    if (!observed) reasons.push(`RECEIPT_OBSERVED_REF_MISSING:${base.ref}`);
    else if (observed !== base.sha) reasons.push(`RECEIPT_EXACT_BASE_STALE:${base.ref}`);
  }
  return reasons;
}

function buildContext(workRecord, activeWorkRecords, observedRefs, adapterRegistry, projectRegistry) {
  const recordValidation = validateWorkRecord(workRecord);
  if (!recordValidation.ok) return { ok: false, reasonCodes: recordValidation.errors };
  const records = normalizeRecords(activeWorkRecords);
  if (!records || records.length === 0) return { ok: false, reasonCodes: ['RECEIPT_ACTIVE_WORK_SET_INVALID'] };
  const target = targetRecord(records, workRecord);
  if (!target.ok) return target;
  const refs = normalizeObservedRefs(observedRefs);
  if (!refs) return { ok: false, reasonCodes: ['RECEIPT_OBSERVED_REFS_INVALID'] };
  const baseReasons = exactBaseReasons(workRecord, refs);
  if (baseReasons.length) return { ok: false, reasonCodes: baseReasons.sort() };

  const preflight = evaluateWorkSet(records);
  if (preflight.startability !== 'STARTABLE') return { ok: false, reasonCodes: ['RECEIPT_PREFLIGHT_NOT_STARTABLE', ...(preflight.reasonCodes || [])].sort() };
  if (preflight.disposition !== 'PARALLEL_SAFE' || (preflight.guards || []).length) {
    return { ok: false, reasonCodes: ['RECEIPT_PREFLIGHT_NOT_UNGUARDED_SAFE', ...(preflight.reasonCodes || [])].sort() };
  }

  const registryValidation = validateAdapterRegistry(adapterRegistry, projectRegistry);
  if (!registryValidation.ok) return { ok: false, reasonCodes: registryValidation.errors };
  const dispatch = planDispatch(workRecord, preflight, adapterRegistry, projectRegistry);
  if (dispatch.status !== 'DISPATCH_READY') return { ok: false, reasonCodes: ['RECEIPT_DISPATCH_NOT_READY', ...(dispatch.reasonCodes || [])].sort() };
  const adapters = adapterRegistry.adapters.filter((adapter) => adapter.adapterId === dispatch.adapterId);
  if (adapters.length !== 1) return { ok: false, reasonCodes: ['RECEIPT_ADAPTER_UNRESOLVED'] };
  const adapter = adapters[0];

  const draft = {
    schemaVersion: 1,
    mode: 'COORDINATION_RECEIPT',
    workId: workRecord.workId,
    objectiveId: workRecord.objectiveId,
    scopeId: workRecord.scopeId,
    requiredCapability: workRecord.requiredCapability,
    adapterId: adapter.adapterId,
    workProfileHash: stableHash(workRecord),
    activeWorkSetHash: stableHash(records),
    preflightProfileHash: preflight.profileHash,
    preflightStartability: preflight.startability,
    preflightDisposition: preflight.disposition,
    observedRefs: refs,
    expectedBases: expectedBases(workRecord),
    adapterContractHash: stableHash(adapter),
    projectRegistryHash: stableHash(projectRegistry),
    authorityRefs: [...workRecord.sourceAuthorityRefs].sort(),
    guards: [],
    invalidationRules: [...INVALIDATION_RULES],
    coordinationReady: true,
    mutationAuthorized: false,
    executionAuthorized: false,
  };
  return { ok: true, draft, preflight, dispatch };
}

function receiptIdFor(receipt) {
  const { receiptId, ...hashable } = receipt || {};
  return stableHash(hashable);
}

function validateCoordinationReceiptShape(receipt) {
  const reasons = [];
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return { ok: false, reasonCodes: ['RECEIPT_NOT_OBJECT'] };
  const strings = ['mode', 'receiptId', 'workId', 'objectiveId', 'scopeId', 'requiredCapability', 'adapterId', 'workProfileHash', 'activeWorkSetHash', 'preflightProfileHash', 'preflightStartability', 'preflightDisposition', 'adapterContractHash', 'projectRegistryHash'];
  if (receipt.schemaVersion !== 1) reasons.push('RECEIPT_SCHEMA_UNSUPPORTED');
  for (const field of strings) if (typeof receipt[field] !== 'string' || !receipt[field]) reasons.push(`RECEIPT_FIELD_INVALID:${field}`);
  if (receipt.mode !== 'COORDINATION_RECEIPT') reasons.push('RECEIPT_MODE_INVALID');
  for (const field of ['observedRefs', 'expectedBases', 'authorityRefs', 'guards', 'invalidationRules']) if (!Array.isArray(receipt[field])) reasons.push(`RECEIPT_FIELD_INVALID:${field}`);
  if (receipt.coordinationReady !== true) reasons.push('RECEIPT_COORDINATION_READY_INVALID');
  if (receipt.mutationAuthorized !== false) reasons.push('RECEIPT_MUTATION_AUTHORITY_MUST_BE_FALSE');
  if (receipt.executionAuthorized !== false) reasons.push('RECEIPT_EXECUTION_AUTHORITY_MUST_BE_FALSE');
  if (!reasons.length && receipt.receiptId !== receiptIdFor(receipt)) reasons.push('RECEIPT_INTEGRITY_HASH_INVALID');
  return { ok: reasons.length === 0, reasonCodes: [...new Set(reasons)].sort() };
}

function issueCoordinationReceipt(workRecord, activeWorkRecords, observedRefs, adapterRegistry, projectRegistry) {
  const context = buildContext(workRecord, activeWorkRecords, observedRefs, adapterRegistry, projectRegistry);
  if (!context.ok) return { status: 'RECEIPT_BLOCKED', receipt: null, reasonCodes: context.reasonCodes, coordinationReady: false };
  const receipt = { ...context.draft, receiptId: stableHash(context.draft) };
  return {
    status: 'RECEIPT_ISSUED',
    receipt,
    reasonCodes: ['COORDINATION_RECEIPT_ISSUED'],
    coordinationReady: true,
    preflight: context.preflight,
    dispatch: context.dispatch,
  };
}

function compareField(receipt, draft, field, reason, reasons) {
  if (stableHash(receipt[field]) !== stableHash(draft[field])) reasons.push(reason);
}

function validateCoordinationReceipt(receipt, workRecord, activeWorkRecords, observedRefs, adapterRegistry, projectRegistry) {
  const shape = validateCoordinationReceiptShape(receipt);
  if (!shape.ok) return { status: 'RECEIPT_INVALID', valid: false, reasonCodes: shape.reasonCodes };
  const context = buildContext(workRecord, activeWorkRecords, observedRefs, adapterRegistry, projectRegistry);
  if (!context.ok) return { status: 'RECEIPT_STALE', valid: false, reasonCodes: context.reasonCodes };
  const draft = context.draft;
  const reasons = [];
  for (const field of ['workId', 'objectiveId', 'scopeId', 'requiredCapability', 'adapterId']) if (receipt[field] !== draft[field]) reasons.push(`RECEIPT_IDENTITY_DRIFT:${field}`);
  if (receipt.workProfileHash !== draft.workProfileHash) reasons.push('RECEIPT_WORK_PROFILE_DRIFT');
  if (receipt.activeWorkSetHash !== draft.activeWorkSetHash) reasons.push('RECEIPT_ACTIVE_WORK_SET_DRIFT');
  if (receipt.preflightProfileHash !== draft.preflightProfileHash || receipt.preflightStartability !== draft.preflightStartability || receipt.preflightDisposition !== draft.preflightDisposition) reasons.push('RECEIPT_PREFLIGHT_DRIFT');
  compareField(receipt, draft, 'observedRefs', 'RECEIPT_OBSERVED_REF_DRIFT', reasons);
  compareField(receipt, draft, 'expectedBases', 'RECEIPT_EXPECTED_BASE_DRIFT', reasons);
  if (receipt.adapterContractHash !== draft.adapterContractHash) reasons.push('RECEIPT_ADAPTER_CONTRACT_DRIFT');
  if (receipt.projectRegistryHash !== draft.projectRegistryHash) reasons.push('RECEIPT_PROJECT_REGISTRY_DRIFT');
  compareField(receipt, draft, 'authorityRefs', 'RECEIPT_AUTHORITY_REF_DRIFT', reasons);
  compareField(receipt, draft, 'guards', 'RECEIPT_GUARD_DRIFT', reasons);
  compareField(receipt, draft, 'invalidationRules', 'RECEIPT_INVALIDATION_POLICY_DRIFT', reasons);
  if (reasons.length) return { status: 'RECEIPT_STALE', valid: false, reasonCodes: [...new Set(reasons)].sort() };
  return { status: 'RECEIPT_VALID', valid: true, reasonCodes: ['COORDINATION_RECEIPT_VALID'], preflight: context.preflight, dispatch: context.dispatch };
}

function renderReceiptMarker(receipt) {
  const validation = validateCoordinationReceiptShape(receipt);
  if (!validation.ok) throw new Error(`invalid coordination receipt: ${validation.reasonCodes.join(',')}`);
  return `${RECEIPT_START}\n\`\`\`json\n${JSON.stringify(canonicalize(receipt), null, 2)}\n\`\`\`\n${RECEIPT_END}`;
}

function parseReceiptMarker(body) {
  const text = typeof body === 'string' ? body : '';
  const start = text.indexOf(RECEIPT_START);
  const endOnly = text.indexOf(RECEIPT_END);
  if (start < 0 && endOnly < 0) return { marked: false, receipt: null };
  if (start < 0) return { marked: true, error: 'RECEIPT_MARKER_START_MISSING' };
  if (text.indexOf(RECEIPT_START, start + RECEIPT_START.length) >= 0) return { marked: true, error: 'RECEIPT_MARKER_MULTIPLE_START' };
  const end = text.indexOf(RECEIPT_END, start + RECEIPT_START.length);
  if (end < 0) return { marked: true, error: 'RECEIPT_MARKER_END_MISSING' };
  if (text.indexOf(RECEIPT_END, end + RECEIPT_END.length) >= 0) return { marked: true, error: 'RECEIPT_MARKER_MULTIPLE_END' };
  if (end <= start) return { marked: true, error: 'RECEIPT_MARKER_ORDER_INVALID' };
  const payload = text.slice(start + RECEIPT_START.length, end).trim();
  const match = payload.match(/^```json\s*\n([\s\S]*?)\n```$/);
  if (!match) return { marked: true, error: 'RECEIPT_JSON_FENCE_INVALID' };
  let receipt;
  try { receipt = JSON.parse(match[1]); } catch { return { marked: true, error: 'RECEIPT_JSON_INVALID' }; }
  const validation = validateCoordinationReceiptShape(receipt);
  if (!validation.ok) return { marked: true, error: 'RECEIPT_PAYLOAD_INVALID', validationErrors: validation.reasonCodes };
  return { marked: true, receipt };
}

module.exports = {
  INVALIDATION_RULES,
  RECEIPT_END,
  RECEIPT_START,
  buildContext,
  issueCoordinationReceipt,
  normalizeObservedRefs,
  normalizeRecords,
  parseReceiptMarker,
  receiptIdFor,
  renderReceiptMarker,
  validateCoordinationReceipt,
  validateCoordinationReceiptShape,
};
