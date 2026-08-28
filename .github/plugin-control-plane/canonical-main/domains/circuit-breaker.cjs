'use strict';

const STATES = Object.freeze({
  ARMED: 'ARMED',
  BLOCKED_CAPABILITY: 'BLOCKED_CAPABILITY',
  DEFERRED_COOLDOWN: 'DEFERRED_COOLDOWN',
  STALE_TARGET: 'STALE_TARGET',
  REARMED: 'REARMED',
});

const BLOCK_CLASSES = Object.freeze({
  NONE: 'NONE',
  CAPABILITY: 'CAPABILITY',
  STALE_TARGET: 'STALE_TARGET',
});

const SUPPRESSIBLE_STATES = new Set([
  STATES.BLOCKED_CAPABILITY,
  STATES.DEFERRED_COOLDOWN,
  STATES.STALE_TARGET,
]);

function required(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`circuit-breaker missing ${name}`);
  return text;
}

function normalizeCandidate(input = {}) {
  const blockClass = String(input.blockClass || BLOCK_CLASSES.NONE).trim();
  if (!Object.values(BLOCK_CLASSES).includes(blockClass)) {
    throw new Error(`circuit-breaker invalid blockClass: ${blockClass}`);
  }
  const severity = String(input.severity || '').trim().toUpperCase();
  return Object.freeze({
    action: required(input.action, 'action'),
    target: required(input.target, 'target'),
    owner: required(input.owner, 'owner'),
    reasonCode: required(input.reasonCode, 'reasonCode'),
    evidenceFingerprint: required(input.evidenceFingerprint, 'evidenceFingerprint'),
    blockClass,
    severity,
    critical: severity === 'P0' || severity === 'P1',
  });
}

function laneKey(row) {
  return [row.action, row.owner, row.reasonCode].join('::');
}

function identityKey(row) {
  return [row.action, row.target, row.owner, row.reasonCode, row.evidenceFingerprint].join('::');
}

function previousState(previous) {
  const state = String(previous?.state || '').trim();
  return Object.values(STATES).includes(state) ? state : null;
}

function sameLane(current, previous) {
  if (!previous) return false;
  return laneKey(current) === laneKey(previous);
}

function sameIdentity(current, previous) {
  if (!previous) return false;
  try {
    return identityKey(current) === identityKey(previous);
  } catch {
    return false;
  }
}

function result(current, state, options = {}) {
  return Object.freeze({
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_CIRCUIT_BREAKER',
    state,
    action: current.action,
    target: current.target,
    owner: current.owner,
    reasonCode: current.reasonCode,
    evidenceFingerprint: current.evidenceFingerprint,
    laneKey: laneKey(current),
    identityKey: identityKey(current),
    blockClass: current.blockClass,
    severity: current.severity || null,
    critical: current.critical,
    allowAttempt: options.allowAttempt === true,
    deferred: state === STATES.DEFERRED_COOLDOWN,
    neutral: state === STATES.STALE_TARGET || state === STATES.DEFERRED_COOLDOWN && current.blockClass === BLOCK_CLASSES.STALE_TARGET,
  });
}

function decideCircuitBreaker(candidate, previous = null) {
  const current = normalizeCandidate(candidate);
  const priorState = previousState(previous);
  const repeatedSuppressible = !current.critical
    && sameIdentity(current, previous)
    && SUPPRESSIBLE_STATES.has(priorState);

  if (current.blockClass === BLOCK_CLASSES.STALE_TARGET) {
    if (repeatedSuppressible) return result(current, STATES.DEFERRED_COOLDOWN);
    return result(current, STATES.STALE_TARGET);
  }

  if (current.blockClass === BLOCK_CLASSES.CAPABILITY) {
    if (repeatedSuppressible) return result(current, STATES.DEFERRED_COOLDOWN);
    return result(current, STATES.BLOCKED_CAPABILITY);
  }

  if (SUPPRESSIBLE_STATES.has(priorState) && sameLane(current, previous)) {
    return result(current, STATES.REARMED, {allowAttempt: true});
  }

  return result(current, STATES.ARMED, {allowAttempt: true});
}

module.exports = {
  BLOCK_CLASSES,
  STATES,
  decideCircuitBreaker,
  identityKey,
  laneKey,
  normalizeCandidate,
};
