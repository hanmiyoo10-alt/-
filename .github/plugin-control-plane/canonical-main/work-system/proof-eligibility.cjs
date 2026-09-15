const fs = require('node:fs');

const DISPOSITIONS = Object.freeze([
  'LIVE_REQUIRED',
  'OBSERVATIONAL_PENDING_ALLOWED',
  'NOT_APPLICABLE',
  'NOT_REQUIRED',
  'BLOCKED_CAPABILITY',
  'UNKNOWN',
  'CONFLICT',
]);

const REASON_CODES = Object.freeze({
  INPUT_INVALID: 'INPUT_INVALID',
  INPUT_JSON_INVALID: 'INPUT_JSON_INVALID',
  INPUT_UNKNOWN_FIELD: 'INPUT_UNKNOWN_FIELD',
  INPUT_MISSING_FIELD: 'INPUT_MISSING_FIELD',
  INPUT_FIELD_INVALID: 'INPUT_FIELD_INVALID',
  ACTIVATED_ACCEPTANCE_CONFLICT: 'ACTIVATED_ACCEPTANCE_CONFLICT',
  ACTIVATED_ACCEPTANCE_UNRESOLVED: 'ACTIVATED_ACCEPTANCE_UNRESOLVED',
  LIVE_REQUIRED_UNSATISFIED: 'LIVE_REQUIRED_UNSATISFIED',
  OBSERVATIONAL_PENDING_EXPLICIT_NONBLOCKING: 'OBSERVATIONAL_PENDING_EXPLICIT_NONBLOCKING',
  LIVE_EXPLICIT_NOT_APPLICABLE: 'LIVE_EXPLICIT_NOT_APPLICABLE',
  LIVE_EXPLICIT_NOT_REQUIRED: 'LIVE_EXPLICIT_NOT_REQUIRED',
  CAPABILITY_UNAVAILABLE_BLOCKING: 'CAPABILITY_UNAVAILABLE_BLOCKING',
  CAPABILITY_UNAVAILABLE_NONBLOCKING: 'CAPABILITY_UNAVAILABLE_NONBLOCKING',
  LIVE_ALREADY_SATISFIED_OUTSIDE_ELIGIBILITY: 'LIVE_ALREADY_SATISFIED_OUTSIDE_ELIGIBILITY',
});

const TOP_LEVEL_KEYS = Object.freeze(['schemaVersion', 'acceptance', 'sourceRefs']);
const ACCEPTANCE_KEYS = Object.freeze([
  'liveApplies',
  'liveRequired',
  'liveSatisfied',
  'observationalPendingAllowed',
  'observationalPendingNonBlocking',
  'notApplicable',
  'liveNotRequired',
  'capabilityUnavailable',
  'capabilityBlockNonBlocking',
  'syntheticEventPolicy',
]);
const BOOLEAN_ACCEPTANCE_KEYS = ACCEPTANCE_KEYS.filter((key) => key !== 'syntheticEventPolicy');
const SYNTHETIC_EVENT_POLICIES = new Set(['AUTHORIZED', 'FORBIDDEN']);

function boundedText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 240);
}
function uniqueRefs(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim().slice(0, 160)))]
    .slice(0, 16);
}

function makeResult(disposition, reasonCode, evidence, sourceRefs, acceptance = null) {
  const failClosed = disposition === 'UNKNOWN' || disposition === 'CONFLICT';
  return {
    schemaVersion: 1,
    disposition,
    reasonCode,
    closureBlocking: failClosed || disposition === 'LIVE_REQUIRED'
      || (disposition === 'BLOCKED_CAPABILITY' && acceptance?.capabilityBlockNonBlocking !== true),
    syntheticLiveEventForbidden: failClosed || acceptance?.syntheticEventPolicy === 'FORBIDDEN',
    claimsLiveProven: false,
    claimsDone: false,
    mutationAuthorized: false,
    evidence: boundedText(evidence),
    sourceRefs: uniqueRefs(sourceRefs),
    ...(acceptance?.syntheticEventPolicy
      ? {syntheticEventPolicyObserved: acceptance.syntheticEventPolicy}
      : {}),
  };
}
function unknown(reasonCode, evidence, sourceRefs, acceptance = null) {
  return makeResult('UNKNOWN', reasonCode, evidence, sourceRefs, acceptance);
}

function conflict(evidence, sourceRefs, acceptance) {
  return makeResult(
    'CONFLICT',
    REASON_CODES.ACTIVATED_ACCEPTANCE_CONFLICT,
    evidence,
    sourceRefs,
    acceptance,
  );
}

function unexpectedKeys(object, allowedKeys) {
  return Object.keys(object).filter((key) => !allowedKeys.includes(key));
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {error: unknown(REASON_CODES.INPUT_INVALID, 'input must be an object', ['caller:input'])};
  }
  const topUnknown = unexpectedKeys(input, TOP_LEVEL_KEYS);
  if (topUnknown.length > 0) {
    return {error: unknown(REASON_CODES.INPUT_UNKNOWN_FIELD, `unknown top-level field: ${topUnknown[0]}`, ['caller:input'])};
  }
  if (input.schemaVersion !== 1) {
    return {error: unknown(REASON_CODES.INPUT_FIELD_INVALID, 'schemaVersion must equal 1', ['caller:input'])};
  }
  if (!Array.isArray(input.sourceRefs) || input.sourceRefs.length < 1 || input.sourceRefs.length > 16
    || input.sourceRefs.some((value) => typeof value !== 'string' || !value.trim() || value.trim().length > 160)) {
    return {error: unknown(REASON_CODES.INPUT_FIELD_INVALID, 'sourceRefs must contain 1..16 non-empty strings of at most 160 characters', ['caller:sourceRefs'])};
  }
  if (!input.acceptance || typeof input.acceptance !== 'object' || Array.isArray(input.acceptance)) {
    return {error: unknown(REASON_CODES.INPUT_FIELD_INVALID, 'acceptance must be an object', input.sourceRefs)};
  }
  const acceptance = input.acceptance;
  const acceptanceUnknown = unexpectedKeys(acceptance, ACCEPTANCE_KEYS);
  if (acceptanceUnknown.length > 0) {
    return {error: unknown(REASON_CODES.INPUT_UNKNOWN_FIELD, `unknown acceptance field: ${acceptanceUnknown[0]}`, input.sourceRefs)};
  }
  const missing = ACCEPTANCE_KEYS.filter((key) => !Object.hasOwn(acceptance, key));
  if (missing.length > 0) {
    return {error: unknown(REASON_CODES.INPUT_MISSING_FIELD, `missing acceptance field: ${missing[0]}`, input.sourceRefs)};
  }
  const invalidBoolean = BOOLEAN_ACCEPTANCE_KEYS.find((key) => typeof acceptance[key] !== 'boolean');
  if (invalidBoolean) {
    return {error: unknown(REASON_CODES.INPUT_FIELD_INVALID, `${invalidBoolean} must be boolean`, input.sourceRefs, acceptance)};
  }
  if (!SYNTHETIC_EVENT_POLICIES.has(acceptance.syntheticEventPolicy)) {
    return {error: unknown(REASON_CODES.INPUT_FIELD_INVALID, 'syntheticEventPolicy must be AUTHORIZED or FORBIDDEN', input.sourceRefs, acceptance)};
  }
  return {acceptance, sourceRefs: input.sourceRefs};
}
function contradictionReason(a) {
  if (a.notApplicable && (
    a.liveApplies || a.liveRequired || a.liveSatisfied
    || a.observationalPendingAllowed || a.observationalPendingNonBlocking
    || a.liveNotRequired || a.capabilityUnavailable || a.capabilityBlockNonBlocking
  )) return 'notApplicable conflicts with live/capability declarations';
  if (a.liveRequired && !a.liveApplies) return 'liveRequired requires liveApplies';
  if (a.liveSatisfied && !a.liveApplies) return 'liveSatisfied requires liveApplies';
  if (a.liveRequired && a.liveNotRequired) return 'liveRequired conflicts with liveNotRequired';
  if (a.liveNotRequired && !a.liveApplies) return 'liveNotRequired requires liveApplies; use notApplicable for explicit non-applicability';
  if (a.liveRequired && a.capabilityBlockNonBlocking) return 'required live proof cannot be weakened by a non-blocking capability declaration';
  if (a.liveNotRequired && a.observationalPendingAllowed) return 'liveNotRequired conflicts with observational pending';
  if (a.liveNotRequired && a.capabilityUnavailable) return 'liveNotRequired conflicts with capability unavailability';
  if (a.observationalPendingAllowed && a.capabilityUnavailable) return 'observational pending conflicts with capability-unavailable disposition';
  if (a.liveRequired && a.observationalPendingNonBlocking) return 'required live proof cannot be weakened to non-blocking pending';
  if (a.observationalPendingNonBlocking && !a.observationalPendingAllowed) return 'non-blocking pending requires observationalPendingAllowed';
  if (a.observationalPendingAllowed && !a.liveApplies) return 'observational pending requires liveApplies';
  if (a.observationalPendingAllowed && !a.observationalPendingNonBlocking) return 'pending observation must explicitly declare non-blocking eligibility';
  if (a.capabilityBlockNonBlocking && !a.capabilityUnavailable) return 'capabilityBlockNonBlocking requires capabilityUnavailable';
  if (a.capabilityUnavailable && !a.liveApplies) return 'capability unavailability requires liveApplies';
  if (a.liveSatisfied && (a.liveNotRequired || a.observationalPendingAllowed || a.capabilityUnavailable)) {
    return 'satisfied live evidence conflicts with unsatisfied/not-required/pending capability disposition';
  }
  return null;
}

function classifyProofEligibility(input) {
  const validated = validateInput(input);
  if (validated.error) return validated.error;
  const {acceptance: a, sourceRefs} = validated;
  const contradiction = contradictionReason(a);
  if (contradiction) return conflict(contradiction, sourceRefs, a);
  if (a.notApplicable) {
    return makeResult('NOT_APPLICABLE', REASON_CODES.LIVE_EXPLICIT_NOT_APPLICABLE,
      'activated acceptance explicitly marks live proof not applicable', sourceRefs, a);
  }
  if (a.liveSatisfied) {
    return unknown(REASON_CODES.LIVE_ALREADY_SATISFIED_OUTSIDE_ELIGIBILITY,
      'live evidence is already supplied as satisfied; this eligibility classifier does not claim LIVE_PROVEN', sourceRefs, a);
  }
  if (a.capabilityUnavailable) {
    const code = a.capabilityBlockNonBlocking
      ? REASON_CODES.CAPABILITY_UNAVAILABLE_NONBLOCKING
      : REASON_CODES.CAPABILITY_UNAVAILABLE_BLOCKING;
    return makeResult('BLOCKED_CAPABILITY', code,
      a.capabilityBlockNonBlocking
        ? 'required capability is unavailable and activated acceptance explicitly marks that capability block non-blocking'
        : 'required capability is unavailable and activated acceptance leaves that capability block blocking',
      sourceRefs, a);
  }
  if (a.liveRequired) {
    return makeResult('LIVE_REQUIRED', REASON_CODES.LIVE_REQUIRED_UNSATISFIED,
      'activated acceptance requires live proof and supplied evidence says it is not satisfied', sourceRefs, a);
  }
  if (a.observationalPendingAllowed && a.observationalPendingNonBlocking) {
    return makeResult('OBSERVATIONAL_PENDING_ALLOWED', REASON_CODES.OBSERVATIONAL_PENDING_EXPLICIT_NONBLOCKING,
      'activated acceptance explicitly allows natural observation to remain pending and non-blocking', sourceRefs, a);
  }
  if (a.liveNotRequired) {
    return makeResult('NOT_REQUIRED', REASON_CODES.LIVE_EXPLICIT_NOT_REQUIRED,
      'activated acceptance explicitly states live proof is not required', sourceRefs, a);
  }
  return unknown(REASON_CODES.ACTIVATED_ACCEPTANCE_UNRESOLVED,
    'activated acceptance does not explicitly select a supported live-proof eligibility disposition', sourceRefs, a);
}

function readCliInput(filePath) {
  return filePath ? fs.readFileSync(filePath, 'utf8') : fs.readFileSync(0, 'utf8');
}

if (require.main === module) {
  let output;
  try {
    output = classifyProofEligibility(JSON.parse(readCliInput(process.argv[2])));
  } catch (error) {
    output = unknown(
      REASON_CODES.INPUT_JSON_INVALID,
      error?.message || 'invalid JSON input',
      ['caller:input'],
    );
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (output.disposition === 'UNKNOWN') process.exitCode = 2;
  else if (output.disposition === 'CONFLICT') process.exitCode = 3;
}

module.exports = {
  DISPOSITIONS,
  REASON_CODES,
  classifyProofEligibility,
};