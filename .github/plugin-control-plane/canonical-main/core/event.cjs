'use strict';

function normalizeScope(scope) {
  const values = Array.isArray(scope) ? scope : scope ? [scope] : [];
  return [...new Set(values.map(String).filter(Boolean))].sort();
}

function validateEvent(event, policy) {
  const errors = [];
  if (!event || typeof event !== 'object' || Array.isArray(event)) return ['event must be an object'];
  if (event.schemaVersion !== 1) errors.push('event schemaVersion must be 1');
  if (!event.eventId) errors.push('eventId missing');
  if (!policy?.events?.classes?.includes(event.eventClass)) errors.push('eventClass unsupported');
  if (!event.subject?.kind) errors.push('subject.kind missing');
  if (event.subject?.id === undefined && event.subject?.number === undefined) errors.push('subject identity missing');
  if (!event.observation?.reasonCode) errors.push('observation.reasonCode missing');
  if (!policy?.events?.dispositions?.includes(event.disposition)) errors.push('disposition unsupported');
  if (!normalizeScope(event.scope).length) errors.push('scope missing');
  return errors;
}

function subjectIdentity(subject = {}) {
  const value = subject.id ?? subject.number ?? 'UNKNOWN';
  return `${subject.kind || 'unknown'}:${String(value)}`;
}

function authorityIdentity(authority = {}) {
  const kind = authority.kind || 'unknown';
  const identity = authority.identity || authority.locator || 'UNKNOWN';
  return `${kind}:${identity}`;
}

function correlationKey(event, policy) {
  const errors = validateEvent(event, policy);
  if (errors.length) throw new Error(`invalid event: ${errors.join('; ')}`);
  return [
    event.eventClass,
    normalizeScope(event.scope).join(','),
    subjectIdentity(event.subject),
    authorityIdentity(event.authority),
    event.observation.reasonCode,
  ].join('|');
}

module.exports = {normalizeScope, validateEvent, subjectIdentity, authorityIdentity, correlationKey};
