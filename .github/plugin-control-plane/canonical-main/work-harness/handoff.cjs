'use strict';

const crypto = require('node:crypto');
const { planDispatch, validateAdapterRegistry } = require('./dispatch.cjs');

const HANDOFF_STATUSES = Object.freeze([
  'HANDOFF_EXECUTABLE_READ_ONLY',
  'HANDOFF_READY',
  'HANDOFF_READY_WITH_GUARDS',
  'HANDOFF_BLOCKED',
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}
function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}
function baseHandoff(workRecord, dispatch) {
  return {
    schemaVersion: 1,
    mode: 'EXECUTOR_HANDOFF',
    workId: workRecord?.workId || null,
    scopeId: workRecord?.scopeId || null,
    requiredCapability: workRecord?.requiredCapability || null,
    dispatchStatus: dispatch?.status || null,
    preflightDisposition: dispatch?.preflightDisposition || null,
    status: 'HANDOFF_BLOCKED',
    adapterId: dispatch?.adapterId || null,
    route: null,
    guards: Array.isArray(dispatch?.guards) ? [...dispatch.guards] : [],
    reasonCodes: [],
    executionAuthorized: false,
    legalNextAction: 'RESOLVE_HANDOFF_BLOCK',
    handoffHash: null,
  };
}
function finalize(handoff) {
  const { handoffHash, ...hashable } = handoff;
  return { ...handoff, handoffHash: stableHash(hashable) };
}
function blockedHandoff(workRecord, dispatch, reasonCodes, legalNextAction) {
  return finalize({
    ...baseHandoff(workRecord, dispatch),
    reasonCodes: [...new Set(reasonCodes)].sort(),
    legalNextAction,
  });
}
function exactRoute(adapter, capability) {
  return (adapter?.routes || []).filter((route) => route.capability === capability);
}

function planHandoff(workRecord, preflight, adapterRegistry, projectRegistry) {
  const dispatch = planDispatch(workRecord, preflight, adapterRegistry, projectRegistry);
  if (!['DISPATCH_READY', 'DISPATCH_READY_WITH_GUARDS'].includes(dispatch.status)) {
    return blockedHandoff(workRecord, dispatch, ['DISPATCH_NOT_HANDOFF_READY', ...(dispatch.reasonCodes || [])], dispatch.legalNextAction || 'RESOLVE_DISPATCH_BLOCK');
  }

  const registryValidation = validateAdapterRegistry(adapterRegistry, projectRegistry);
  if (!registryValidation.ok) return blockedHandoff(workRecord, dispatch, registryValidation.errors, 'FIX_ADAPTER_REGISTRY');

  const adapterMatches = adapterRegistry.adapters.filter((adapter) => adapter.adapterId === dispatch.adapterId);
  if (adapterMatches.length !== 1) return blockedHandoff(workRecord, dispatch, ['HANDOFF_ADAPTER_UNRESOLVED'], 'FIX_ADAPTER_REGISTRY');

  const routes = exactRoute(adapterMatches[0], workRecord.requiredCapability);
  if (routes.length === 0) return blockedHandoff(workRecord, dispatch, ['HANDOFF_ROUTE_UNDECLARED'], 'DECLARE_EXACT_AUDITED_ROUTE_OR_KEEP_DRY_RUN');
  if (routes.length > 1) return blockedHandoff(workRecord, dispatch, ['HANDOFF_ROUTE_AMBIGUOUS'], 'REMOVE_DUPLICATE_ROUTE');

  const route = {
    capability: routes[0].capability,
    targetKind: routes[0].targetKind,
    target: routes[0].target,
    fixedArgs: [...routes[0].fixedArgs],
    executionClass: routes[0].executionClass,
    mutationClass: routes[0].mutationClass,
    invokePolicy: routes[0].invokePolicy,
  };

  const guarded = dispatch.status === 'DISPATCH_READY_WITH_GUARDS';
  const locallyExecutable = !guarded
    && route.invokePolicy === 'READ_ONLY_LOCAL'
    && route.targetKind === 'LOCAL_NODE'
    && route.executionClass === 'READ_ONLY'
    && route.mutationClass === null;

  if (guarded) {
    return finalize({
      ...baseHandoff(workRecord, dispatch),
      status: 'HANDOFF_READY_WITH_GUARDS',
      route,
      reasonCodes: [...new Set(['HANDOFF_ROUTE_MATCHED', ...(dispatch.reasonCodes || [])])].sort(),
      executionAuthorized: false,
      legalNextAction: 'SATISFY_PREFLIGHT_GUARDS_THEN_REPLAN_HANDOFF',
    });
  }
  if (locallyExecutable) {
    return finalize({
      ...baseHandoff(workRecord, dispatch),
      status: 'HANDOFF_EXECUTABLE_READ_ONLY',
      route,
      reasonCodes: [...new Set(['HANDOFF_ROUTE_MATCHED', 'READ_ONLY_LOCAL_ROUTE_AUTHORIZED', ...(dispatch.reasonCodes || [])])].sort(),
      executionAuthorized: true,
      legalNextAction: 'INVOKE_BOUNDED_READ_ONLY_ROUTE',
    });
  }
  return finalize({
    ...baseHandoff(workRecord, dispatch),
    status: 'HANDOFF_READY',
    route,
    reasonCodes: [...new Set(['HANDOFF_ROUTE_MATCHED', 'EXISTING_EXECUTOR_AUTHORITY_REQUIRED', ...(dispatch.reasonCodes || [])])].sort(),
    executionAuthorized: false,
    legalNextAction: route.executionClass === 'MUTATING'
      ? 'OBTAIN_FUTURE_COORDINATION_RECEIPT_AND_USE_EXISTING_MUTATION_AUTHORITY'
      : 'HANDOFF_TO_EXISTING_EXECUTOR_AUTHORITY',
  });
}

module.exports = { HANDOFF_STATUSES, canonicalize, exactRoute, planHandoff, stableHash };
