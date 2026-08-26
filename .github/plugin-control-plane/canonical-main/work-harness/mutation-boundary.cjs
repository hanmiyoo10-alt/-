'use strict';

const { evaluateWorkSet } = require('./preflight.cjs');
const { planHandoff } = require('./handoff.cjs');
const { normalizeRecords, validateCoordinationReceipt } = require('./receipt.cjs');

function blocked(workRecord, handoff, reasonCodes, legalNextAction = 'RECOMPUTE_COORDINATION_RECEIPT_AND_REVALIDATE') {
  return {
    schemaVersion: 1,
    mode: 'MUTATION_BOUNDARY',
    workId: workRecord?.workId || null,
    handoffHash: handoff?.handoffHash || null,
    status: 'MUTATION_BOUNDARY_BLOCKED',
    coordinationReady: false,
    mutationAuthorized: false,
    executionAuthorized: false,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    legalNextAction,
  };
}

function validateMutationBoundary(workRecord, activeWorkRecords, observedRefs, adapterRegistry, projectRegistry, receipt) {
  const records = normalizeRecords(activeWorkRecords);
  if (!records || records.length === 0) return blocked(workRecord, null, ['MUTATION_BOUNDARY_ACTIVE_WORK_SET_INVALID']);
  const preflight = evaluateWorkSet(records);
  const handoff = planHandoff(workRecord, preflight, adapterRegistry, projectRegistry);
  const route = handoff.route;
  if (!route || handoff.status !== 'HANDOFF_READY' || handoff.executionAuthorized !== false) {
    return blocked(workRecord, handoff, ['MUTATION_BOUNDARY_EXACT_HANDOFF_REQUIRED', ...(handoff.reasonCodes || [])], 'REPLAN_EXACT_MUTATING_HANDOFF');
  }
  if (route.executionClass !== 'MUTATING' || !route.mutationClass || route.invokePolicy !== 'HANDOFF_ONLY') {
    return blocked(workRecord, handoff, ['MUTATION_BOUNDARY_MUTATING_HANDOFF_REQUIRED'], 'USE_EXISTING_NON_MUTATING_PATH_OR_REPLAN');
  }
  const adapters = adapterRegistry?.adapters?.filter((adapter) => adapter.adapterId === handoff.adapterId) || [];
  if (adapters.length !== 1) return blocked(workRecord, handoff, ['MUTATION_BOUNDARY_ADAPTER_UNRESOLVED'], 'FIX_ADAPTER_REGISTRY');
  if (!adapters[0].receiptRequiredFor.includes(route.mutationClass)) {
    return blocked(workRecord, handoff, ['MUTATION_BOUNDARY_RECEIPT_POLICY_MISSING'], 'FIX_ADAPTER_RECEIPT_POLICY');
  }
  if (!receipt) return blocked(workRecord, handoff, ['MUTATION_BOUNDARY_RECEIPT_REQUIRED']);

  const validation = validateCoordinationReceipt(receipt, workRecord, records, observedRefs, adapterRegistry, projectRegistry);
  if (!validation.valid) return blocked(workRecord, handoff, ['MUTATION_BOUNDARY_RECEIPT_INVALID', ...(validation.reasonCodes || [])]);

  return {
    schemaVersion: 1,
    mode: 'MUTATION_BOUNDARY',
    workId: workRecord.workId,
    handoffHash: handoff.handoffHash,
    receiptId: receipt.receiptId,
    adapterId: handoff.adapterId,
    mutationClass: route.mutationClass,
    status: 'MUTATION_BOUNDARY_READY',
    coordinationReady: true,
    mutationAuthorized: false,
    executionAuthorized: false,
    reasonCodes: ['COORDINATION_RECEIPT_VALID', 'MUTATION_BOUNDARY_COORDINATION_READY', 'EXISTING_MUTATION_AUTHORITY_STILL_REQUIRED'],
    legalNextAction: 'HANDOFF_TO_EXISTING_MUTATION_AUTHORITY_WITH_VALID_RECEIPT',
  };
}

module.exports = { validateMutationBoundary };
