'use strict';

const WRITE_ROLES = Object.freeze([
  'PRIMARY_WRITE',
  'SUPPORTING_WRITE',
  'CLOSE_SYNC_WRITE',
  'EVIDENCE_WRITE',
]);

const GATE_STATES = Object.freeze(['STARTABLE', 'NOT_STARTABLE', 'UNKNOWN']);
const BASE_MODES = Object.freeze(['EXACT', 'REFRESHABLE']);

const REQUIRED_FIELDS = Object.freeze([
  'schemaVersion',
  'workId',
  'objectiveId',
  'scopeId',
  'sourceIdeaOrDecision',
  'taskState',
  'gateState',
  'workType',
  'requiredCapability',
  'readAuthorities',
  'writeAuthorities',
  'protectedSurfaces',
  'closeSyncSurfaces',
  'dependsOn',
  'expectedBases',
  'sourceAuthorityRefs',
  'stopCondition',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function uniqueStrings(value) {
  return stringArray(value) && new Set(value).size === value.length;
}

function validateWorkRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, errors: ['WORK_RECORD_NOT_OBJECT'] };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) errors.push(`WORK_RECORD_FIELD_MISSING:${field}`);
  }
  if (errors.length) return { ok: false, errors };

  if (record.schemaVersion !== 1) errors.push('WORK_RECORD_SCHEMA_UNSUPPORTED');
  for (const field of ['workId', 'objectiveId', 'scopeId', 'sourceIdeaOrDecision', 'taskState', 'workType', 'requiredCapability', 'stopCondition']) {
    if (!isNonEmptyString(record[field])) errors.push(`WORK_RECORD_STRING_INVALID:${field}`);
  }
  if (!GATE_STATES.includes(record.gateState)) errors.push('WORK_RECORD_GATE_STATE_INVALID');

  for (const field of ['readAuthorities', 'protectedSurfaces', 'closeSyncSurfaces', 'dependsOn', 'sourceAuthorityRefs']) {
    if (!uniqueStrings(record[field])) errors.push(`WORK_RECORD_STRING_ARRAY_INVALID:${field}`);
  }
  if (record.sourceAuthorityRefs.length === 0) errors.push('WORK_RECORD_SOURCE_AUTHORITY_REQUIRED');

  const refreshableReads = record.refreshableReadAuthorities ?? [];
  if (!uniqueStrings(refreshableReads)) errors.push('WORK_RECORD_STRING_ARRAY_INVALID:refreshableReadAuthorities');
  for (const surface of refreshableReads) {
    if (!record.readAuthorities.includes(surface)) errors.push(`WORK_RECORD_REFRESHABLE_READ_NOT_DECLARED:${surface}`);
  }

  if (!Array.isArray(record.writeAuthorities)) {
    errors.push('WORK_RECORD_WRITE_AUTHORITIES_INVALID');
  } else {
    const seen = new Set();
    for (const entry of record.writeAuthorities) {
      if (!entry || typeof entry !== 'object' || !isNonEmptyString(entry.surface) || !WRITE_ROLES.includes(entry.role)) {
        errors.push('WORK_RECORD_WRITE_AUTHORITY_INVALID');
        continue;
      }
      const key = `${entry.surface}\u0000${entry.role}`;
      if (seen.has(key)) errors.push(`WORK_RECORD_WRITE_AUTHORITY_DUPLICATE:${entry.surface}:${entry.role}`);
      seen.add(key);
      if (entry.role === 'CLOSE_SYNC_WRITE' && !record.closeSyncSurfaces.includes(entry.surface)) {
        errors.push(`WORK_RECORD_CLOSE_SYNC_SURFACE_MISSING:${entry.surface}`);
      }
    }
  }

  if (!Array.isArray(record.expectedBases)) {
    errors.push('WORK_RECORD_EXPECTED_BASES_INVALID');
  } else {
    const seenRefs = new Set();
    for (const entry of record.expectedBases) {
      if (!entry || typeof entry !== 'object' || !isNonEmptyString(entry.ref) || !BASE_MODES.includes(entry.mode)) {
        errors.push('WORK_RECORD_EXPECTED_BASE_INVALID');
        continue;
      }
      if (seenRefs.has(entry.ref)) errors.push(`WORK_RECORD_EXPECTED_BASE_DUPLICATE:${entry.ref}`);
      seenRefs.add(entry.ref);
      if (entry.mode === 'EXACT' && !isNonEmptyString(entry.sha)) errors.push(`WORK_RECORD_EXACT_BASE_SHA_REQUIRED:${entry.ref}`);
      if (entry.sha !== undefined && !isNonEmptyString(entry.sha)) errors.push(`WORK_RECORD_EXPECTED_BASE_SHA_INVALID:${entry.ref}`);
      if (entry.mayAdvance !== undefined && typeof entry.mayAdvance !== 'boolean') errors.push(`WORK_RECORD_EXPECTED_BASE_ADVANCE_INVALID:${entry.ref}`);
    }
  }

  if (record.dependsOn.includes(record.workId)) errors.push('WORK_RECORD_SELF_DEPENDENCY');

  return { ok: errors.length === 0, errors };
}

module.exports = {
  BASE_MODES,
  GATE_STATES,
  REQUIRED_FIELDS,
  WRITE_ROLES,
  validateWorkRecord,
};
