'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateWorkRecord } = require('./contract.cjs');
const { DISPOSITIONS } = require('./preflight.cjs');

const ADAPTER_REGISTRY_FILE = '.github/plugin-control-plane/canonical-main/work-harness/executor-adapters.json';
const PROJECT_REGISTRY_FILE = '.github/plugin-control-plane/registry.json';

const ADAPTER_FIELDS = Object.freeze([
  'adapterId', 'supportedScopeIds', 'scopeKinds', 'capabilities', 'entrypoints', 'workflows',
  'possibleMutationClasses', 'receiptRequiredFor', 'verificationHooks', 'routes',
]);
const ROUTE_FIELDS = Object.freeze([
  'capability', 'targetKind', 'target', 'fixedArgs', 'executionClass', 'mutationClass', 'invokePolicy',
]);
const SCOPE_KINDS = Object.freeze(['repo', 'plugin', 'product']);
const TARGET_KINDS = Object.freeze(['LOCAL_NODE', 'GITHUB_WORKFLOW']);
const EXECUTION_CLASSES = Object.freeze(['READ_ONLY', 'MUTATING']);
const INVOKE_POLICIES = Object.freeze(['READ_ONLY_LOCAL', 'HANDOFF_ONLY']);
const ROUTE_STATUSES = Object.freeze([
  'DISPATCH_READY', 'DISPATCH_READY_WITH_GUARDS', 'SERIALIZATION_REQUIRED', 'NOT_STARTABLE', 'DISPATCH_BLOCKED',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
function uniqueStrings(value, { minItems = 0 } = {}) {
  return Array.isArray(value) && value.length >= minItems && value.every(isNonEmptyString) && new Set(value).size === value.length;
}
function stringList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
function loadJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}
function loadAdapterRegistry(root = process.cwd()) {
  return loadJson(root, ADAPTER_REGISTRY_FILE);
}
function loadProjectRegistry(root = process.cwd()) {
  return loadJson(root, PROJECT_REGISTRY_FILE);
}
function scopeKindFor(scopeId, projectRegistry) {
  if (scopeId === 'canonical-main') return Array.isArray(projectRegistry?.repoPaths) && projectRegistry.repoPaths.length > 0 ? 'repo' : null;
  if (projectRegistry?.plugins && Object.prototype.hasOwnProperty.call(projectRegistry.plugins, scopeId)) return 'plugin';
  if (projectRegistry?.products && Object.prototype.hasOwnProperty.call(projectRegistry.products, scopeId)) return 'product';
  return null;
}

function validateRoute(adapter, route, prefix, errors, seenCapabilities) {
  if (!route || typeof route !== 'object' || Array.isArray(route)) {
    errors.push(`${prefix}:NOT_OBJECT`);
    return;
  }
  for (const field of Object.keys(route).filter((field) => !ROUTE_FIELDS.includes(field))) errors.push(`${prefix}:FIELD_NOT_ALLOWED:${field}`);

  if (!isNonEmptyString(route.capability)) errors.push(`${prefix}:CAPABILITY_INVALID`);
  else {
    if (!adapter.capabilities.includes(route.capability)) errors.push(`${prefix}:CAPABILITY_OUTSIDE_ENVELOPE:${route.capability}`);
    if (seenCapabilities.has(route.capability)) errors.push(`${prefix}:CAPABILITY_DUPLICATE:${route.capability}`);
    seenCapabilities.add(route.capability);
  }
  if (!TARGET_KINDS.includes(route.targetKind)) errors.push(`${prefix}:TARGET_KIND_INVALID`);
  if (!isNonEmptyString(route.target)) errors.push(`${prefix}:TARGET_INVALID`);
  if (!stringList(route.fixedArgs)) errors.push(`${prefix}:FIXED_ARGS_INVALID`);
  if (!EXECUTION_CLASSES.includes(route.executionClass)) errors.push(`${prefix}:EXECUTION_CLASS_INVALID`);
  if (!INVOKE_POLICIES.includes(route.invokePolicy)) errors.push(`${prefix}:INVOKE_POLICY_INVALID`);

  if (route.targetKind === 'LOCAL_NODE' && !adapter.entrypoints.includes(route.target)) errors.push(`${prefix}:TARGET_NOT_IN_ENTRYPOINTS:${route.target}`);
  if (route.targetKind === 'GITHUB_WORKFLOW' && !adapter.workflows.includes(route.target)) errors.push(`${prefix}:TARGET_NOT_IN_WORKFLOWS:${route.target}`);

  if (route.executionClass === 'READ_ONLY') {
    if (route.mutationClass !== null) errors.push(`${prefix}:READ_ONLY_MUTATION_CLASS_MUST_BE_NULL`);
    if (route.invokePolicy === 'READ_ONLY_LOCAL' && route.targetKind !== 'LOCAL_NODE') errors.push(`${prefix}:READ_ONLY_LOCAL_TARGET_MUST_BE_LOCAL_NODE`);
  }
  if (route.executionClass === 'MUTATING') {
    if (!isNonEmptyString(route.mutationClass)) errors.push(`${prefix}:MUTATION_CLASS_REQUIRED`);
    else {
      if (!adapter.possibleMutationClasses.includes(route.mutationClass)) errors.push(`${prefix}:MUTATION_CLASS_OUTSIDE_ENVELOPE:${route.mutationClass}`);
      if (!adapter.receiptRequiredFor.includes(route.mutationClass)) errors.push(`${prefix}:MUTATION_CLASS_WITHOUT_RECEIPT_REQUIREMENT:${route.mutationClass}`);
    }
    if (route.invokePolicy !== 'HANDOFF_ONLY') errors.push(`${prefix}:MUTATING_ROUTE_MUST_BE_HANDOFF_ONLY`);
  }
}

function validateAdapterRegistry(adapterRegistry, projectRegistry) {
  const errors = [];
  if (!adapterRegistry || typeof adapterRegistry !== 'object' || Array.isArray(adapterRegistry)) return { ok: false, errors: ['ADAPTER_REGISTRY_NOT_OBJECT'] };
  if (adapterRegistry.schemaVersion !== 1) errors.push('ADAPTER_REGISTRY_SCHEMA_UNSUPPORTED');
  if (!Array.isArray(adapterRegistry.adapters) || adapterRegistry.adapters.length === 0) {
    errors.push('ADAPTER_REGISTRY_ADAPTERS_INVALID');
    return { ok: false, errors };
  }

  const seenIds = new Set();
  for (let index = 0; index < adapterRegistry.adapters.length; index += 1) {
    const adapter = adapterRegistry.adapters[index];
    const prefix = `ADAPTER:${index}`;
    if (!adapter || typeof adapter !== 'object' || Array.isArray(adapter)) {
      errors.push(`${prefix}:NOT_OBJECT`);
      continue;
    }
    for (const field of Object.keys(adapter).filter((field) => !ADAPTER_FIELDS.includes(field))) errors.push(`${prefix}:FIELD_NOT_ALLOWED:${field}`);
    if (!isNonEmptyString(adapter.adapterId)) errors.push(`${prefix}:ID_INVALID`);
    else if (seenIds.has(adapter.adapterId)) errors.push(`ADAPTER_ID_DUPLICATE:${adapter.adapterId}`);
    else seenIds.add(adapter.adapterId);

    if (!uniqueStrings(adapter.supportedScopeIds, { minItems: 1 })) errors.push(`${prefix}:SCOPES_INVALID`);
    if (!uniqueStrings(adapter.scopeKinds, { minItems: 1 }) || !adapter.scopeKinds.every((kind) => SCOPE_KINDS.includes(kind))) errors.push(`${prefix}:SCOPE_KINDS_INVALID`);
    if (!uniqueStrings(adapter.capabilities, { minItems: 1 })) errors.push(`${prefix}:CAPABILITIES_INVALID`);
    for (const field of ['entrypoints', 'workflows', 'possibleMutationClasses', 'receiptRequiredFor', 'verificationHooks']) {
      if (!uniqueStrings(adapter[field])) errors.push(`${prefix}:${field.toUpperCase()}_INVALID`);
    }
    if (!Array.isArray(adapter.routes)) errors.push(`${prefix}:ROUTES_INVALID`);

    if (Array.isArray(adapter.receiptRequiredFor) && Array.isArray(adapter.possibleMutationClasses)) {
      for (const mutationClass of adapter.receiptRequiredFor) if (!adapter.possibleMutationClasses.includes(mutationClass)) errors.push(`${prefix}:RECEIPT_CLASS_OUTSIDE_ENVELOPE:${mutationClass}`);
    }
    if (Array.isArray(adapter.routes) && Array.isArray(adapter.capabilities) && Array.isArray(adapter.entrypoints)
      && Array.isArray(adapter.workflows) && Array.isArray(adapter.possibleMutationClasses) && Array.isArray(adapter.receiptRequiredFor)) {
      const seenCapabilities = new Set();
      adapter.routes.forEach((route, routeIndex) => validateRoute(adapter, route, `${prefix}:ROUTE:${routeIndex}`, errors, seenCapabilities));
    }
    if (Array.isArray(adapter.supportedScopeIds) && Array.isArray(adapter.scopeKinds)) {
      for (const scopeId of adapter.supportedScopeIds) {
        const actualKind = scopeKindFor(scopeId, projectRegistry);
        if (!actualKind) errors.push(`${prefix}:SCOPE_NOT_IN_PROJECT_REGISTRY:${scopeId}`);
        else if (!adapter.scopeKinds.includes(actualKind)) errors.push(`${prefix}:SCOPE_KIND_MISMATCH:${scopeId}:${actualKind}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function validateAdapterReferences(adapterRegistry, root = process.cwd()) {
  const errors = [];
  for (const adapter of adapterRegistry?.adapters || []) {
    for (const field of ['entrypoints', 'workflows', 'verificationHooks']) {
      for (const relativePath of adapter[field] || []) if (!fs.existsSync(path.join(root, relativePath))) errors.push(`ADAPTER_REFERENCE_MISSING:${adapter.adapterId}:${field}:${relativePath}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function basePlan(workRecord, preflight) {
  return {
    schemaVersion: 1, mode: 'DRY_RUN', workId: workRecord?.workId || null, scopeId: workRecord?.scopeId || null,
    requiredCapability: workRecord?.requiredCapability || null, preflightDisposition: preflight?.disposition || null,
    status: 'DISPATCH_BLOCKED', adapterId: null, scopeKind: null,
    guards: Array.isArray(preflight?.guards) ? [...new Set(preflight.guards)].sort() : [], reasonCodes: [],
    entrypoints: [], workflows: [], possibleMutationClasses: [], receiptRequiredFor: [], verificationHooks: [],
    executionAuthorized: false, legalNextAction: 'RESOLVE_DISPATCH_BLOCK',
  };
}
function blockedPlan(workRecord, preflight, reasonCodes, legalNextAction, status = 'DISPATCH_BLOCKED') {
  return { ...basePlan(workRecord, preflight), status, reasonCodes: [...new Set(reasonCodes)].sort(), legalNextAction };
}
function validatePreflight(preflight) {
  if (!preflight || typeof preflight !== 'object' || Array.isArray(preflight)) return ['PREFLIGHT_RESULT_INVALID'];
  if (!DISPOSITIONS.includes(preflight.disposition)) return ['PREFLIGHT_DISPOSITION_INVALID'];
  if (!['STARTABLE', 'NOT_STARTABLE', 'BLOCKED_UNKNOWN'].includes(preflight.startability)) return ['PREFLIGHT_STARTABILITY_INVALID'];
  if (['PARALLEL_SAFE', 'PARALLEL_GUARDED'].includes(preflight.disposition) && preflight.startability !== 'STARTABLE') return ['PREFLIGHT_STARTABILITY_DISPOSITION_CONTRADICTION'];
  return [];
}

function planDispatch(workRecord, preflight, adapterRegistry, projectRegistry) {
  const recordValidation = validateWorkRecord(workRecord);
  if (!recordValidation.ok) return blockedPlan(workRecord, preflight, recordValidation.errors, 'FIX_WORK_RECORD');
  const adapterValidation = validateAdapterRegistry(adapterRegistry, projectRegistry);
  if (!adapterValidation.ok) return blockedPlan(workRecord, preflight, adapterValidation.errors, 'FIX_ADAPTER_REGISTRY');
  const preflightErrors = validatePreflight(preflight);
  if (preflightErrors.length) return blockedPlan(workRecord, preflight, preflightErrors, 'RECOMPUTE_PREFLIGHT');

  if (preflight.disposition === 'PARALLEL_BLOCKED') return blockedPlan(workRecord, preflight, ['PREFLIGHT_BLOCKED', ...(preflight.reasonCodes || [])], 'RESOLVE_PREFLIGHT_BLOCK');
  if (preflight.disposition === 'PARALLEL_NOT_STARTABLE') return blockedPlan(workRecord, preflight, ['PREFLIGHT_NOT_STARTABLE', ...(preflight.reasonCodes || [])], 'MAKE_WORK_STARTABLE_THEN_REPREFLIGHT', 'NOT_STARTABLE');
  if (preflight.disposition === 'PARALLEL_SERIALIZE_REQUIRED') return blockedPlan(workRecord, preflight, ['PREFLIGHT_SERIALIZATION_REQUIRED', ...(preflight.reasonCodes || [])], 'SERIALIZE_OR_WAIT_THEN_REPREFLIGHT', 'SERIALIZATION_REQUIRED');

  const scopeKind = scopeKindFor(workRecord.scopeId, projectRegistry);
  if (!scopeKind) return blockedPlan(workRecord, preflight, ['SCOPE_UNRESOLVED'], 'REGISTER_SCOPE_IN_EXISTING_PROJECT_REGISTRY');
  const scopeMatches = adapterRegistry.adapters.filter((adapter) => adapter.supportedScopeIds.includes(workRecord.scopeId) && adapter.scopeKinds.includes(scopeKind));
  if (scopeMatches.length === 0) return blockedPlan(workRecord, preflight, ['ADAPTER_NOT_REGISTERED'], 'ADD_AUDITED_ADAPTER_FOR_EXISTING_SCOPE');
  const capabilityMatches = scopeMatches.filter((adapter) => adapter.capabilities.includes(workRecord.requiredCapability));
  if (capabilityMatches.length === 0) return blockedPlan(workRecord, preflight, ['CAPABILITY_UNSUPPORTED'], 'CHOOSE_OR_ADD_AUDITED_CAPABILITY');
  if (capabilityMatches.length > 1) return blockedPlan(workRecord, preflight, ['ADAPTER_AMBIGUOUS'], 'REMOVE_OVERLAPPING_ADAPTER_CAPABILITY');

  const adapter = capabilityMatches[0];
  const guarded = preflight.disposition === 'PARALLEL_GUARDED';
  return {
    ...basePlan(workRecord, preflight), status: guarded ? 'DISPATCH_READY_WITH_GUARDS' : 'DISPATCH_READY',
    adapterId: adapter.adapterId, scopeKind,
    reasonCodes: [...new Set(['ADAPTER_ROUTE_MATCHED', ...(preflight.reasonCodes || [])])].sort(),
    entrypoints: [...adapter.entrypoints], workflows: [...adapter.workflows], possibleMutationClasses: [...adapter.possibleMutationClasses],
    receiptRequiredFor: [...adapter.receiptRequiredFor], verificationHooks: [...adapter.verificationHooks], executionAuthorized: false,
    legalNextAction: guarded ? 'SATISFY_PREFLIGHT_GUARDS_THEN_HANDOFF_TO_EXISTING_EXECUTOR' : 'HANDOFF_TO_EXISTING_EXECUTOR_AFTER_INDEPENDENT_AUTHORITY_CHECKS',
  };
}

module.exports = {
  ADAPTER_REGISTRY_FILE, PROJECT_REGISTRY_FILE, ROUTE_STATUSES, TARGET_KINDS, EXECUTION_CLASSES, INVOKE_POLICIES,
  loadAdapterRegistry, loadProjectRegistry, planDispatch, scopeKindFor, validateAdapterReferences, validateAdapterRegistry, validatePreflight,
};
