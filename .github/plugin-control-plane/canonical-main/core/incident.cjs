'use strict';

const {correlationKey, normalizeScope} = require('./event.cjs');
const {severityFor} = require('./severity.cjs');

function transitionForDisposition(disposition) {
  if (disposition === 'RECOVERY_FEEDBACK_CANDIDATE') return 'RECOVERED';
  if (disposition === 'FEEDBACK_CANDIDATE' || disposition === 'ESCALATION_CANDIDATE') return 'OPEN';
  return 'NONE';
}

function applyIncident(previous, event, overrides = {}, policy) {
  const key = correlationKey(event, policy);
  const transition = transitionForDisposition(event.disposition);
  const severity = severityFor(event, overrides, policy);
  if (transition === 'NONE') return previous || null;
  if (transition === 'RECOVERED') {
    return {...(previous || {}), correlationKey: key, severity: previous?.severity || severity, state: 'RECOVERED', latestEventId: event.eventId, latestEvidence: [...(event.evidence || [])]};
  }
  if (previous?.state === 'OPEN' && previous.latestEventId === event.eventId) return previous;
  return {
    correlationKey: key,
    severity,
    state: 'OPEN',
    firstEventId: previous?.firstEventId || event.eventId,
    latestEventId: event.eventId,
    latestEvidence: [...(event.evidence || [])],
    scope: normalizeScope(event.scope),
    reasonCode: event.observation.reasonCode,
    subject: event.subject,
  };
}

module.exports = {transitionForDisposition, applyIncident};
