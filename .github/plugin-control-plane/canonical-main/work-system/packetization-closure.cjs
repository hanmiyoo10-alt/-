'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const {normalizeScope} = require('./scope-overlap.cjs');

const MODE = 'CANONICAL_PACKETIZATION_CLOSURE';
const DISPOSITIONS = new Set([
  'DIRECT_PACKET_CAPTURE',
  'PACKETIZE_NOW',
  'COVERED_BY_EXISTING_PACKET',
  'ABSORB_PRE_EFFECT',
  'CLOSE_SYNC_ONLY',
  'DESIGN_REQUIRED',
  'DEFER_EXPLICIT',
  'UNKNOWN',
  'CONFLICT',
]);
const REQUIRED_FIELDS = Object.freeze([
  'sourceRoot',
  'implementationReady',
  'sourceImplementationRequired',
  'primaryGoal',
  'semanticOwner',
  'writableScopes',
  'disposition',
  'effectStarted',
  'targetPacketKey',
  'existingPackets',
  'deferReasonRef',
]);

const REASON_CODES = Object.freeze({
  INPUT_OBJECT_REQUIRED: 'INPUT_OBJECT_REQUIRED',
  INPUT_UNKNOWN_FIELD: 'INPUT_UNKNOWN_FIELD',
  INPUT_FIELD_REQUIRED: 'INPUT_FIELD_REQUIRED',
  SOURCE_ROOT_INVALID: 'SOURCE_ROOT_INVALID',
  IMPLEMENTATION_READY_INVALID: 'IMPLEMENTATION_READY_INVALID',
  SOURCE_IMPLEMENTATION_REQUIRED_INVALID: 'SOURCE_IMPLEMENTATION_REQUIRED_INVALID',
  PRIMARY_GOAL_INVALID: 'PRIMARY_GOAL_INVALID',
  SEMANTIC_OWNER_INVALID: 'SEMANTIC_OWNER_INVALID',
  WRITABLE_SCOPES_INVALID: 'WRITABLE_SCOPES_INVALID',
  WRITABLE_SCOPE_CONFLICT: 'WRITABLE_SCOPE_CONFLICT',
  DISPOSITION_INVALID: 'DISPOSITION_INVALID',
  EFFECT_STARTED_INVALID: 'EFFECT_STARTED_INVALID',
  TARGET_PACKET_KEY_INVALID: 'TARGET_PACKET_KEY_INVALID',
  EXISTING_PACKETS_INVALID: 'EXISTING_PACKETS_INVALID',
  DEFER_REASON_REF_INVALID: 'DEFER_REASON_REF_INVALID',
  IMPLEMENTATION_READY_EVIDENCE_REQUIRED: 'IMPLEMENTATION_READY_EVIDENCE_REQUIRED',
  LATE_PACKET_DEBT: 'LATE_PACKET_DEBT',
  DESIGN_REQUIRED_NOT_READY: 'DESIGN_REQUIRED_NOT_READY',
  IMPLEMENTATION_READY_REQUIRED: 'IMPLEMENTATION_READY_REQUIRED',
  SOURCE_IMPLEMENTATION_REQUIRED: 'SOURCE_IMPLEMENTATION_REQUIRED',
  CLOSE_SYNC_SOURCE_IMPLEMENTATION_CONFLICT: 'CLOSE_SYNC_SOURCE_IMPLEMENTATION_CONFLICT',
  EXISTING_PACKET_KEY_REQUIRES_REUSE: 'EXISTING_PACKET_KEY_REQUIRES_REUSE',
  EXISTING_PACKET_KEY_REQUIRED: 'EXISTING_PACKET_KEY_REQUIRED',
  EXISTING_PACKET_KEY_AMBIGUOUS: 'EXISTING_PACKET_KEY_AMBIGUOUS',
  TARGET_PACKET_KEY_CONFLICT: 'TARGET_PACKET_KEY_CONFLICT',
  ABSORB_AFTER_EFFECT_FORBIDDEN: 'ABSORB_AFTER_EFFECT_FORBIDDEN',
  DEFER_REASON_REQUIRED: 'DEFER_REASON_REQUIRED',
  EXPLICIT_UNKNOWN: 'EXPLICIT_UNKNOWN',
  EXPLICIT_CONFLICT: 'EXPLICIT_CONFLICT',
});

function boundedString(value, max = 240) {
  return typeof value === 'string'
    && value.trim() === value
    && value.length >= 1
    && value.length <= max
    && !/[\r\n]/.test(value);
}

function exactInputKeys(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return [REASON_CODES.INPUT_OBJECT_REQUIRED];
  }
  const reasons = [];
  const allowed = new Set(REQUIRED_FIELDS);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) reasons.push(REASON_CODES.INPUT_UNKNOWN_FIELD + ':' + key);
  }
  for (const key of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      reasons.push(REASON_CODES.INPUT_FIELD_REQUIRED + ':' + key);
    }
  }
  return reasons;
}

function normalizedScopes(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 32) {
    return {ok:false, scopes:[], reasonCodes:[REASON_CODES.WRITABLE_SCOPES_INVALID]};
  }
  const scopes = [];
  const reasons = [];
  for (const raw of value) {
    const parsed = normalizeScope(raw);
    if (!parsed?.ok) reasons.push(REASON_CODES.WRITABLE_SCOPES_INVALID);
    else scopes.push(parsed.normalized);
  }
  const unique = [...new Set(scopes)].sort();
  if (unique.length !== scopes.length) reasons.push(REASON_CODES.WRITABLE_SCOPE_CONFLICT);
  return {ok:reasons.length === 0, scopes:unique, reasonCodes:[...new Set(reasons)].sort()};
}

function semanticEvidence(input) {
  const reasons = [];
  if (!boundedString(input.sourceRoot)) reasons.push(REASON_CODES.SOURCE_ROOT_INVALID);
  if (!boundedString(input.primaryGoal)) reasons.push(REASON_CODES.PRIMARY_GOAL_INVALID);
  if (!boundedString(input.semanticOwner)) reasons.push(REASON_CODES.SEMANTIC_OWNER_INVALID);
  const scopes = normalizedScopes(input.writableScopes);
  reasons.push(...scopes.reasonCodes);
  return {ok:reasons.length === 0, reasonCodes:[...new Set(reasons)].sort(), scopes:scopes.scopes};
}

function packetizationKey({sourceRoot, primaryGoal, semanticOwner, scopes}) {
  return crypto.createHash('sha256').update(JSON.stringify({
    sourceRoot,
    primaryGoal,
    semanticOwner,
    writableScopes:[...scopes].sort(),
  })).digest('hex');
}

function normalizeExistingPackets(value) {
  if (!Array.isArray(value) || value.length > 64) {
    return {ok:false, rows:[], reasonCodes:[REASON_CODES.EXISTING_PACKETS_INVALID]};
  }
  const rows = [];
  const reasons = [];
  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row)
        || Object.keys(row).sort().join('\0') !== ['effectStarted','packetRef','packetizationKey'].sort().join('\0')
        || !/^#[1-9][0-9]*$/.test(row.packetRef || '')
        || !/^[0-9a-f]{64}$/.test(row.packetizationKey || '')
        || typeof row.effectStarted !== 'boolean') {
      reasons.push(REASON_CODES.EXISTING_PACKETS_INVALID);
      continue;
    }
    rows.push({...row});
  }
  return {ok:reasons.length === 0, rows, reasonCodes:[...new Set(reasons)].sort()};
}

function baseResult({
  result,
  disposition,
  key = null,
  scopes = [],
  latePacketDebt = false,
  reasonCodes = [],
  matchedPacketRef = null,
}) {
  return {
    schemaVersion:1,
    mode:MODE,
    result,
    disposition,
    packetizationKey:key,
    normalizedWritableScopes:scopes,
    matchedPacketRef,
    latePacketDebt,
    trainFullyEnumerated:result === 'PASS' && !latePacketDebt,
    reasonCodes:[...new Set(reasonCodes)].sort(),
    mutationAuthorized:false,
    issueCreationAuthorized:false,
  };
}

function classifyPacketizationClosure(input) {
  const keyReasons = exactInputKeys(input);
  if (keyReasons.length) {
    return baseResult({result:'UNKNOWN', disposition:'UNKNOWN', reasonCodes:keyReasons});
  }

  const reasons = [];
  if (typeof input.implementationReady !== 'boolean') reasons.push(REASON_CODES.IMPLEMENTATION_READY_INVALID);
  if (typeof input.sourceImplementationRequired !== 'boolean') reasons.push(REASON_CODES.SOURCE_IMPLEMENTATION_REQUIRED_INVALID);
  if (typeof input.effectStarted !== 'boolean') reasons.push(REASON_CODES.EFFECT_STARTED_INVALID);
  if (!DISPOSITIONS.has(input.disposition)) reasons.push(REASON_CODES.DISPOSITION_INVALID);
  if (input.targetPacketKey !== null && !/^[0-9a-f]{64}$/.test(input.targetPacketKey || '')) {
    reasons.push(REASON_CODES.TARGET_PACKET_KEY_INVALID);
  }
  if (input.deferReasonRef !== null && !boundedString(input.deferReasonRef, 400)) {
    reasons.push(REASON_CODES.DEFER_REASON_REF_INVALID);
  }
  const existing = normalizeExistingPackets(input.existingPackets);
  reasons.push(...existing.reasonCodes);

  const semantic = semanticEvidence(input);
  const semanticRequired = input.implementationReady === true
    || ['DIRECT_PACKET_CAPTURE','PACKETIZE_NOW','COVERED_BY_EXISTING_PACKET','ABSORB_PRE_EFFECT','DEFER_EXPLICIT']
      .includes(input.disposition);
  if (semanticRequired) reasons.push(...semantic.reasonCodes);

  if (reasons.length) {
    return baseResult({
      result:'UNKNOWN',
      disposition:'UNKNOWN',
      scopes:semantic.scopes,
      reasonCodes:reasons,
      latePacketDebt:input.implementationReady === true,
    });
  }

  const key = semantic.ok
    ? packetizationKey({
      sourceRoot:input.sourceRoot,
      primaryGoal:input.primaryGoal,
      semanticOwner:input.semanticOwner,
      scopes:semantic.scopes,
    })
    : null;
  const matches = key ? existing.rows.filter((row) => row.packetizationKey === key) : [];

  if (input.disposition === 'CONFLICT') {
    return baseResult({
      result:'CONFLICT', disposition:'CONFLICT', key, scopes:semantic.scopes,
      reasonCodes:[REASON_CODES.EXPLICIT_CONFLICT],
      latePacketDebt:input.implementationReady === true,
    });
  }
  if (input.disposition === 'UNKNOWN') {
    return baseResult({
      result:input.implementationReady ? 'LATE_PACKET_DEBT' : 'UNKNOWN',
      disposition:'UNKNOWN', key, scopes:semantic.scopes,
      reasonCodes:[input.implementationReady ? REASON_CODES.LATE_PACKET_DEBT : REASON_CODES.EXPLICIT_UNKNOWN],
      latePacketDebt:input.implementationReady === true,
    });
  }

  if (input.implementationReady && !semantic.ok) {
    return baseResult({
      result:'UNKNOWN', disposition:'UNKNOWN', scopes:semantic.scopes,
      reasonCodes:[REASON_CODES.IMPLEMENTATION_READY_EVIDENCE_REQUIRED],
      latePacketDebt:true,
    });
  }

  if (input.disposition === 'DESIGN_REQUIRED') {
    if (input.implementationReady) {
      return baseResult({
        result:'CONFLICT', disposition:'DESIGN_REQUIRED', key, scopes:semantic.scopes,
        reasonCodes:[REASON_CODES.DESIGN_REQUIRED_NOT_READY],
        latePacketDebt:true,
      });
    }
    return baseResult({result:'PASS', disposition:'DESIGN_REQUIRED', key, scopes:semantic.scopes});
  }

  if (input.disposition === 'CLOSE_SYNC_ONLY') {
    if (input.sourceImplementationRequired) {
      return baseResult({
        result:'CONFLICT', disposition:'CLOSE_SYNC_ONLY', key, scopes:semantic.scopes,
        reasonCodes:[REASON_CODES.CLOSE_SYNC_SOURCE_IMPLEMENTATION_CONFLICT],
      });
    }
    return baseResult({result:'PASS', disposition:'CLOSE_SYNC_ONLY', key, scopes:semantic.scopes});
  }

  if (!input.implementationReady) {
    return baseResult({
      result:'CONFLICT', disposition:input.disposition, key, scopes:semantic.scopes,
      reasonCodes:[REASON_CODES.IMPLEMENTATION_READY_REQUIRED],
    });
  }
  if (!input.sourceImplementationRequired && input.disposition !== 'DEFER_EXPLICIT') {
    return baseResult({
      result:'CONFLICT', disposition:input.disposition, key, scopes:semantic.scopes,
      reasonCodes:[REASON_CODES.SOURCE_IMPLEMENTATION_REQUIRED],
    });
  }

  if (input.disposition === 'DIRECT_PACKET_CAPTURE' || input.disposition === 'PACKETIZE_NOW') {
    if (matches.length) {
      return baseResult({
        result:'CONFLICT', disposition:input.disposition, key, scopes:semantic.scopes,
        reasonCodes:[REASON_CODES.EXISTING_PACKET_KEY_REQUIRES_REUSE],
        matchedPacketRef:matches.length === 1 ? matches[0].packetRef : null,
      });
    }
    return baseResult({result:'PASS', disposition:input.disposition, key, scopes:semantic.scopes});
  }

  if (input.disposition === 'COVERED_BY_EXISTING_PACKET' || input.disposition === 'ABSORB_PRE_EFFECT') {
    if (input.targetPacketKey !== key) {
      return baseResult({
        result:'CONFLICT', disposition:input.disposition, key, scopes:semantic.scopes,
        reasonCodes:[REASON_CODES.TARGET_PACKET_KEY_CONFLICT],
      });
    }
    if (matches.length === 0) {
      return baseResult({
        result:'CONFLICT', disposition:input.disposition, key, scopes:semantic.scopes,
        reasonCodes:[REASON_CODES.EXISTING_PACKET_KEY_REQUIRED],
      });
    }
    if (matches.length !== 1) {
      return baseResult({
        result:'CONFLICT', disposition:input.disposition, key, scopes:semantic.scopes,
        reasonCodes:[REASON_CODES.EXISTING_PACKET_KEY_AMBIGUOUS],
      });
    }
    if (input.disposition === 'ABSORB_PRE_EFFECT'
        && (input.effectStarted || matches[0].effectStarted)) {
      return baseResult({
        result:'CONFLICT', disposition:input.disposition, key, scopes:semantic.scopes,
        reasonCodes:[REASON_CODES.ABSORB_AFTER_EFFECT_FORBIDDEN],
        matchedPacketRef:matches[0].packetRef,
      });
    }
    return baseResult({
      result:'PASS', disposition:input.disposition, key, scopes:semantic.scopes,
      matchedPacketRef:matches[0].packetRef,
    });
  }

  if (input.disposition === 'DEFER_EXPLICIT') {
    if (!input.deferReasonRef) {
      return baseResult({
        result:'CONFLICT', disposition:'DEFER_EXPLICIT', key, scopes:semantic.scopes,
        reasonCodes:[REASON_CODES.DEFER_REASON_REQUIRED],
        latePacketDebt:true,
      });
    }
    return baseResult({result:'PASS', disposition:'DEFER_EXPLICIT', key, scopes:semantic.scopes});
  }

  return baseResult({
    result:'UNKNOWN', disposition:'UNKNOWN', key, scopes:semantic.scopes,
    reasonCodes:[REASON_CODES.EXPLICIT_UNKNOWN],
    latePacketDebt:input.implementationReady === true,
  });
}

function exitCodeFor(result) {
  if (result.result === 'PASS') return 0;
  if (result.result === 'CONFLICT') return 3;
  if (result.result === 'LATE_PACKET_DEBT') return 2;
  return 4;
}

function main() {
  let result;
  try {
    const text = fs.readFileSync(process.argv[2] || '', 'utf8');
    result = classifyPacketizationClosure(JSON.parse(text));
  } catch {
    result = baseResult({
      result:'UNKNOWN', disposition:'UNKNOWN',
      reasonCodes:[REASON_CODES.INPUT_OBJECT_REQUIRED],
    });
  }
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = exitCodeFor(result);
}

if (require.main === module) main();

module.exports = {
  DISPOSITIONS,
  MODE,
  REASON_CODES,
  classifyPacketizationClosure,
  exitCodeFor,
  packetizationKey,
};
