'use strict';

const crypto = require('node:crypto');
const { validateWorkRecord } = require('./contract.cjs');

const DISPOSITIONS = Object.freeze([
  'PARALLEL_SAFE',
  'PARALLEL_GUARDED',
  'PARALLEL_SERIALIZE_REQUIRED',
  'PARALLEL_NOT_STARTABLE',
  'PARALLEL_BLOCKED',
]);

const PRECEDENCE = Object.freeze({
  PARALLEL_SAFE: 0,
  PARALLEL_GUARDED: 1,
  PARALLEL_SERIALIZE_REQUIRED: 2,
  PARALLEL_NOT_STARTABLE: 3,
  PARALLEL_BLOCKED: 4,
});

const GUARDS = Object.freeze({
  CLOSE_SYNC: [
    'SERIALIZE_SHARED_CLOSE_SYNC',
    'FRESH_REREAD_BEFORE_CLOSE',
    'RECOMPUTE_DERIVED_STATE',
  ],
  REFRESHABLE_BASE: [
    'REVALIDATE_BASE_BEFORE_CLOSE',
    'REPLAY_OR_RECOMPUTE_FROM_CURRENT_BASE',
  ],
  REFRESHABLE_READ: [
    'FRESH_REREAD_BEFORE_CLOSE',
  ],
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function hashRecords(records) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(records))).digest('hex');
}

function uniq(items) {
  return [...new Set(items)];
}

function result(disposition, reasonCodes = [], guards = [], details = {}) {
  return {
    disposition,
    reasonCodes: uniq(reasonCodes).sort(),
    guards: uniq(guards).sort(),
    ...details,
  };
}

function writesBySurface(record) {
  const map = new Map();
  for (const entry of record.writeAuthorities) {
    if (!map.has(entry.surface)) map.set(entry.surface, []);
    map.get(entry.surface).push(entry.role);
  }
  return map;
}

function isOnlyCloseSync(roles) {
  return roles.length > 0 && roles.every((role) => role === 'CLOSE_SYNC_WRITE');
}

function isOnlyEvidence(roles) {
  return roles.length > 0 && roles.every((role) => role === 'EVIDENCE_WRITE');
}

function baseByRef(record) {
  return new Map(record.expectedBases.map((entry) => [entry.ref, entry]));
}

function pairIdentity(a, b) {
  return [a.workId, b.workId].sort();
}

function evaluatePair(a, b) {
  const pair = pairIdentity(a, b);
  const aValidation = validateWorkRecord(a);
  const bValidation = validateWorkRecord(b);
  if (!aValidation.ok || !bValidation.ok) {
    return result('PARALLEL_BLOCKED', [
      ...aValidation.errors.map((code) => `A:${code}`),
      ...bValidation.errors.map((code) => `B:${code}`),
    ], [], { pair });
  }

  if (a.gateState === 'UNKNOWN' || b.gateState === 'UNKNOWN') {
    return result('PARALLEL_BLOCKED', ['STARTABILITY_UNKNOWN'], [], { pair });
  }
  if (a.gateState === 'NOT_STARTABLE' || b.gateState === 'NOT_STARTABLE') {
    return result('PARALLEL_NOT_STARTABLE', ['WORK_NOT_STARTABLE'], [], { pair });
  }

  const serializeReasons = [];
  const guardedReasons = [];
  const guards = [];

  if (a.dependsOn.includes(b.workId) || b.dependsOn.includes(a.workId)) {
    serializeReasons.push('DIRECT_WORK_DEPENDENCY');
  }

  const aWrites = writesBySurface(a);
  const bWrites = writesBySurface(b);
  const allWriteSurfaces = new Set([...aWrites.keys(), ...bWrites.keys()]);

  for (const surface of allWriteSurfaces) {
    const aRoles = aWrites.get(surface) || [];
    const bRoles = bWrites.get(surface) || [];
    if (!aRoles.length || !bRoles.length) continue;

    const bothCloseSyncOnly = isOnlyCloseSync(aRoles) && isOnlyCloseSync(bRoles);
    const evidenceOnly = isOnlyEvidence(aRoles) && isOnlyEvidence(bRoles);

    if (bothCloseSyncOnly) {
      guardedReasons.push(`SHARED_CLOSE_SYNC:${surface}`);
      guards.push(...GUARDS.CLOSE_SYNC);
      continue;
    }

    if (evidenceOnly) {
      guardedReasons.push(`SHARED_EVIDENCE_WRITE:${surface}`);
      guards.push('SERIALIZE_SHARED_EVIDENCE_WRITE');
      continue;
    }

    serializeReasons.push(`WRITE_WRITE_CONFLICT:${surface}`);
  }

  const checkWriteRead = (writer, reader, writerMap) => {
    for (const [surface, roles] of writerMap.entries()) {
      if (!reader.readAuthorities.includes(surface)) continue;
      const refreshable = (reader.refreshableReadAuthorities || []).includes(surface);
      if (isOnlyCloseSync(roles) && refreshable) {
        guardedReasons.push(`REFRESHABLE_WRITE_READ:${surface}`);
        guards.push(...GUARDS.REFRESHABLE_READ);
      } else {
        serializeReasons.push(`WRITE_READ_INVALIDATION:${surface}`);
      }
    }
  };
  checkWriteRead(a, b, aWrites);
  checkWriteRead(b, a, bWrites);

  const protectedShared = new Set(a.protectedSurfaces.filter((surface) => b.protectedSurfaces.includes(surface)));
  for (const surface of protectedShared) {
    if (aWrites.has(surface) || bWrites.has(surface)) serializeReasons.push(`PROTECTED_SURFACE_WRITE:${surface}`);
  }

  const aBases = baseByRef(a);
  const bBases = baseByRef(b);
  for (const [ref, aBase] of aBases.entries()) {
    const bBase = bBases.get(ref);
    if (!bBase || !aBase.mayAdvance || !bBase.mayAdvance) continue;
    if (aBase.mode === 'REFRESHABLE' && bBase.mode === 'REFRESHABLE') {
      guardedReasons.push(`REFRESHABLE_SHARED_BASE:${ref}`);
      guards.push(...GUARDS.REFRESHABLE_BASE);
    } else {
      serializeReasons.push(`EXACT_BASE_COLLISION:${ref}`);
    }
  }

  if (serializeReasons.length) return result('PARALLEL_SERIALIZE_REQUIRED', serializeReasons, [], { pair });
  if (guardedReasons.length) return result('PARALLEL_GUARDED', guardedReasons, guards, { pair });
  return result('PARALLEL_SAFE', ['NO_MATERIAL_CONFLICT'], [], { pair });
}

function evaluateWorkSet(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      schemaVersion: 1,
      mode: 'SHADOW',
      profileHash: hashRecords(records || []),
      startability: 'BLOCKED_UNKNOWN',
      disposition: 'PARALLEL_BLOCKED',
      reasonCodes: ['WORK_SET_EMPTY_OR_INVALID'],
      guards: [],
      pairResults: [],
    };
  }

  const validations = records.map((record) => validateWorkRecord(record));
  const validationErrors = validations.flatMap((validation, index) =>
    validation.errors.map((code) => `${records[index]?.workId || `index-${index}`}:${code}`));

  if (validationErrors.length) {
    return {
      schemaVersion: 1,
      mode: 'SHADOW',
      profileHash: hashRecords(records),
      startability: 'BLOCKED_UNKNOWN',
      disposition: 'PARALLEL_BLOCKED',
      reasonCodes: uniq(validationErrors).sort(),
      guards: [],
      pairResults: [],
    };
  }

  const ids = records.map((record) => record.workId);
  if (new Set(ids).size !== ids.length) {
    return {
      schemaVersion: 1,
      mode: 'SHADOW',
      profileHash: hashRecords(records),
      startability: 'BLOCKED_UNKNOWN',
      disposition: 'PARALLEL_BLOCKED',
      reasonCodes: ['DUPLICATE_WORK_ID'],
      guards: [],
      pairResults: [],
    };
  }

  const unknown = records.some((record) => record.gateState === 'UNKNOWN');
  const notStartable = records.some((record) => record.gateState === 'NOT_STARTABLE');
  const startability = unknown ? 'BLOCKED_UNKNOWN' : notStartable ? 'NOT_STARTABLE' : 'STARTABLE';

  if (records.length === 1) {
    const disposition = unknown ? 'PARALLEL_BLOCKED' : notStartable ? 'PARALLEL_NOT_STARTABLE' : 'PARALLEL_SAFE';
    const reasonCodes = unknown ? ['STARTABILITY_UNKNOWN'] : notStartable ? ['WORK_NOT_STARTABLE'] : ['SINGLE_WORK_STARTABLE'];
    return {
      schemaVersion: 1,
      mode: 'SHADOW',
      profileHash: hashRecords(records),
      startability,
      disposition,
      reasonCodes,
      guards: [],
      pairResults: [],
    };
  }

  const pairResults = [];
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) pairResults.push(evaluatePair(records[i], records[j]));
  }

  const disposition = pairResults.reduce((worst, current) =>
    PRECEDENCE[current.disposition] > PRECEDENCE[worst] ? current.disposition : worst,
  'PARALLEL_SAFE');

  return {
    schemaVersion: 1,
    mode: 'SHADOW',
    profileHash: hashRecords(records),
    startability,
    disposition,
    reasonCodes: uniq(pairResults.flatMap((entry) => entry.reasonCodes)).sort(),
    guards: uniq(pairResults.flatMap((entry) => entry.guards)).sort(),
    pairResults,
  };
}

module.exports = {
  DISPOSITIONS,
  PRECEDENCE,
  evaluatePair,
  evaluateWorkSet,
  hashRecords,
};
