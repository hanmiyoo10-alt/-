'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateWorkRecord } = require('./contract.cjs');
const { DISPOSITIONS } = require('./preflight.cjs');

const ADAPTER_REGISTRY_FILE = '.github/plugin-control-plane/canonical-main/work-harness/executor-adapters.json';
const PROJECT_REGISTRY_FILE = '.github/plugin-control-plane/registry.json';

const ADAPTER_FIELDS = Object.freeze([
  'adapterId',
  'supportedScopeIds',
  'scopeKinds',
  'capabilities',
  'entrypoints',
  'workflows',
  'possibleMutationClasses',
  'receiptRequiredFor',
  'verificationHooks',
]);

const SCOPE_KINDS = Object.freeze(['repo', 'plugin', 'product']);
const ROUTE_STATUSES = Object.freeze([
  'DISPATCH_READY',
  'DISPATCH_READY_WITH_GUARDS',
  'SERIALIZATION_REQUIRED',
  'NOT_STARTABLE',
  'DISPATCH_BLOCKED',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function uniqueStrings(value, { minItems = 0 } = {}) {
  return Array.isArray(value)
    && value.length >= minItems
    && value.every(isNonEmptyString)
    && new Set(value).size === value.length;
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
  if (scopeId === 'canonical-main') {
    return Array.isArray(projectRegistry?.repoPaths) && projectRegistry.repoPaths.length > 0 ? 'repo' : null;
  }
  if (projectRegistry?.plugins && Object.prototype.hasOwnProperty.call(projectRegistry.plugins, scopeId)) return 'plugin';
  if (projectRegistry?.products && Object.prototype.hasOwnProperty.call(projectRegistry.products, scopeId)) return 'product';
  return null;
}

function validateAdapterRegistry(adapterRegistry, projectRegistry) {
  const errors = [];
  if (!adapterRegistry || typeof adapterRegistry !== 'object' || Array.isArray(adapterRegistry)) {
    return { ok: false, errors: ['ADAPTER_REGISTRY_NOT_OBJECT'] };
  }
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

    const extraFields = Object.keys(adapter).filter((field) => !ADAPTER_FIELDS.includes(field));
    for (const field of extraFields) errors.push(`${prefix}:FIELD_NOT_ALLOWED:${field}`);

    if (!isNonEmptyString(adapter.adapterId)) {
      errors.push(`${prefix}:ID_INVALID`);
    } else if (seenIds.has(adapter.adapterId)) {
      errors.push(`ADAPTER_ID_DUPLICATE:${adapter.adapterId}`);
    } else {
      seenIds.add(adapter.adapterId);
    }

    if (!uniqueStrings(adapter.supportedScopeIds, { minItems: 1 })) errors.push(`${prefix}:SCOPES_INVALID`);
    if (!uniqueStrings(adapter.scopeKinds, { minItems: 1 }) || !adapter.scopeKinds.every((kind) => SCOPE_KINDS.includes(kind))) {
      errors.push(`${prefix}:SCOPE_KINDS_INVALID`);
    }
    if (!uniqueStrings(adapter.capabilities, { minItems: 1 })) errors.push(`${prefix}:CAPABILITIES_INVALID`);
    for (const field of ['entrypoints', 'workflows', 'possibleMutationClasses', 'receiptRequiredFor', 'verificationHooks']) {
      if (!uniqueStrings(adapter[field])) errors.push(`${prefix}:${field.toUpperCase()}_INVALID`);
    }

    if (Array.isArray(adapter.receiptRequiredFor) && Array.isArray(adapter.possibleMutationClasses)) {
      for (const mutationClass of adapter.receiptRequiredFor) {
        if (!adapter.possibleMutationClasses.includes(mutationClass)) {
          errors.push(`${prefix}:RECEIPT_CLASS_OUTSIDE_ENVELOPE:${mutationClass}`);
        }
      }
    }

    if (Array.isArray(adapter.supportedScopeIds) && Array.isArray(adapter.scopeKinds)) {
      for (const scopeId of adapter.supportedScopeIds) {
        const actualKind = scopeKindFor(scopeId, projectRegistry);
        if (!actualKind) {
          errors.push(`${prefix}:SCOPE_NOT_IN_PROJECT_REGISTRY:${scopeId}`);
        } else if (!adapter.scopeKinds.includes(actualKind)) {
          errors.push(`${prefix}:SCOPE_KIND_MISMATCH:${scopeId}:${actualKind}`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function validateAdapterReferences(adapterRegistry, root = process.cwd()) {
  const errors = [];
  for (const adapter of adapterRegistry?.adapters || []) {
    for (const field of ['entrypoints', 'workflows', 'verificationHooks']) {
      for (const relativePath of adapter[field] || []) {
        if (!fs.existsSync(path.join(root, relativePath))) {
          errors.push(`ADAPTER_REFERENCE_MISSING:${adapter.adapterId}:${field}:${relativePath}`);
        }
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function basePlan(workRecord, preflight) {
  return {
    schemaVersion: 1,
    mode: 'DRY_RUN',
    workId: workRecord?.workId || null,
    scopeId: workRecord?.scopeId || null,
    requiredCapability: workRecord?.requiredCapability || null,
    preflightDisposition: preflight?.disposition || null,
    status: 'DISPATCH_BLOCKED',
    adapterId: null,
    scopeKind: null,
    guards: Array.isArray(preflight?.guards) ? [...new Set(preflight.guards)].sort() : [],
    reasonCodes: [],
    entrypoints: [],
    workflows: [],
    possibleMutationClasses: [],
    receiptRequiredFor: [],
    verificationHooks: [],
    executionAuthorized: false,
    legalNextAction: 'RESOLVE_DISPATCH_BLOCK',
  };
}

function blockedPlan(workRecord, preflight, reasonCodes, legalNextAction, status = 'DISPATCH_BLOCKED') {
  return {
    ...basePlan(workRecord, preflight),
    status,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    legalNextAction,
  };
}

function validatePreflight(preflight) {
  if (!preflight || typeof preflight !== 'object' || Array.isArray(preflight)) return ['PREFLIGHT_RESULT_INVALID'];
  if (!DISPOSITIONS.includes(preflight.disposition)) return ['PREFLIGHT_DISPOSITION_INVALID'];
  if (!['STARTABLE', 'NOT_STARTABLE', 'BLOCKED_UNKNOWN'].includes(preflight.startability)) return ['PREFLIGHT_STARTABILITY_INVALID'];
  if (preflight.disposition === 'PARALLEL_SAFE' || preflight.disposition === 'PARALLEL_GUARDED') {
    if (preflight.startability !== 'STARTABLE') return ['PREFLIGHT_STARTABILITY_DISPOSITION_CONTRADICTION'];
  }
  return [];
}

function planDispatch(workRecord, preflight, adapterRegistry, projectRegistry) {
  const recordValidation = validateWorkRecord(workRecord);
  if (!recordValidation.ok) {
    return blockedPlan(workRecord, preflight, recordValidation.errors, 'FIX_WORK_RECORD');
  }

  const adapterValidation = validateAdapterRegistry(adapterRegistry, projectRegistry);
  if (!adapterValidation.ok) {
    return blockedPlan(workRecord, preflight, adapterValidation.errors, 'FIX_ADAPTER_REGISTRY');
  }

  const preflightErrors = validatePreflight(preflight);
  if (preflightErrors.length) {
    return blockedPlan(workRecord, preflight, preflightErrors, 'RECOMPUTE_PREFLIGHT');
  }

  if (preflight.disposition === 'PARALLEL_BLOCKED') {
    return blockedPlan(workRecord, preflight, ['PREFLIGHT_BLOCKED', ...(preflight.reasonCodes || [])], 'RESOLVE_PREFLIGHT_BLOCK');
  }
  if (preflight.disposition === 'PARALLEL_NOT_STARTABLE') {
    return blockedPlan(workRecord, preflight, ['PREFLIGHT_NOT_STARTABLE', ...(preflight.reasonCodes || [])], 'MAKE_WORK_STARTABLE_THEN_REPREFLIGHT', 'NOT_STARTABLE');
  }
  if (preflight.disposition === 'PARALLEL_SERIALIZE_REQUIRED') {
    return blockedPlan(workRecord, preflight, ['PREFLIGHT_SERIALIZATION_REQUIRED', ...(preflight.reasonCodes || [])], 'SERIALIZE_OR_WAIT_THEN_REPREFLIGHT', 'SERIALIZATION_REQUIRED');
  }

  const scopeKind = scopeKindFor(workRecord.scopeId, projectRegistry);
  if (!scopeKind) {
    return blockedPlan(workRecord, preflight, ['SCOPE_UNRESOLVED'], 'REGISTER_SCOPE_IN_EXISTING_PROJECT_REGISTRY');
  }

  const scopeMatches = adapterRegistry.adapters.filter((adapter) =>
    adapter.supportedScopeIds.includes(workRecord.scopeId) && adapter.scopeKinds.includes(scopeKind));
  if (scopeMatches.length === 0) {
    return blockedPlan(workRecord, preflight, ['ADAPTER_NOT_REGISTERED'], 'ADD_AUDITED_ADAPTER_FOR_EXISTING_SCOPE');
  }

  const capabilityMatches = scopeMatches.filter((adapter) => adapter.capabilities.includes(workRecord.requiredCapability));
  if (capabilityMatches.length === 0) {
    return blockedPlan(workRecord, preflight, ['CAPABILITY_UNSUPPORTED'], 'CHOOSE_OR_ADD_AUDITED_CAPABILITY');
  }
  if (capabilityMatches.length > 1) {
    return blockedPlan(workRecord, preflight, ['ADAPTER_AMBIGUOUS'], 'REMOVE_OVERLAPPING_ADAPTER_CAPABILITY');
  }

  const adapter = capabilityMatches[0];
  const guarded = preflight.disposition === 'PARALLEL_GUARDED';
  return {
    ...basePlan(workRecord, preflight),
    status: guarded ? 'DISPATCH_READY_WITH_GUARDS' : 'DISPATCH_READY',
    adapterId: adapter.adapterId,
    scopeKind,
    reasonCodes: [...new Set(['ADAPTER_ROUTE_MATCHED', ...(preflight.reasonCodes || [])])].sort(),
    entrypoints: [...adapter.entrypoints],
    workflows: [...adapter.workflows],
    possibleMutationClasses: [...adapter.possibleMutationClasses],
    receiptRequiredFor: [...adapter.receiptRequiredFor],
    verificationHooks: [...adapter.verificationHooks],
    executionAuthorized: false,
    legalNextAction: guarded
      ? 'SATISFY_PREFLIGHT_GUARDS_THEN_HANDOFF_TO_EXISTING_EXECUTOR'
      : 'HANDOFF_TO_EXISTING_EXECUTOR_AFTER_INDEPENDENT_AUTHORITY_CHECKS',
  };
}

module.exports = {
  ADAPTER_REGISTRY_FILE,
  PROJECT_REGISTRY_FILE,
  ROUTE_STATUSES,
  loadAdapterRegistry,
  loadProjectRegistry,
  planDispatch,
  scopeKindFor,
  validateAdapterReferences,
  validateAdapterRegistry,
  validatePreflight,
};
