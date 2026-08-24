'use strict';

const crypto = require('crypto');
const {loadPolicy} = require('./contract.cjs');

const policy = loadPolicy();

function notificationConfig() {
  return policy.notifications || {};
}

function previousIncidentState(issue) {
  if (!issue) return 'NONE';
  const labels = (issue.labels || []).map((label) => typeof label === 'string' ? label : label.name);
  if (labels.includes('incident:open')) return 'OPEN';
  if (labels.includes('incident:recovered')) return 'RECOVERED';
  return issue.state === 'closed' ? 'RECOVERED' : 'UNKNOWN';
}

function transitionEligible({severity, transition, previousState}) {
  const config = notificationConfig();
  if (!config.outboxEnabled) return false;
  if (!(config.severities || []).includes(severity)) return false;
  if (transition === 'OPEN') return previousState !== 'OPEN';
  if (transition === 'RECOVERED') return config.includeRecovery === true && previousState === 'OPEN';
  return false;
}

function deliveryKey(correlationKey, transition, eventId) {
  return crypto
    .createHash('sha256')
    .update(`${correlationKey}\n${transition}\n${eventId}`)
    .digest('hex');
}

function buildAlertEnvelope({event, severity, transition, correlationKey, previousState}) {
  const eligible = transitionEligible({severity, transition, previousState});
  const config = notificationConfig();
  return {
    schemaVersion: 1,
    eligible,
    deliveryKey: deliveryKey(correlationKey, transition, event.eventId),
    transition,
    previousState,
    severity,
    reasonCode: event.observation.reasonCode,
    eventClass: event.eventClass,
    scope: [...(event.scope || [])],
    subject: {...event.subject},
    summary: event.summary || 'No summary provided.',
    evidence: (event.evidence || []).slice(0, 12),
    channels: eligible ? [...(config.channels || [])] : [],
    correlationKey,
    eventId: event.eventId,
  };
}

function envelopeMarker(envelope) {
  const encoded = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url');
  return `<!-- canonical-main-alert-envelope:${encoded} -->`;
}

function parseEnvelope(body = '') {
  const match = body.match(/<!-- canonical-main-alert-envelope:([A-Za-z0-9_-]+) -->/);
  if (!match) return null;
  try {
    return JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
  } catch (_) {
    return null;
  }
}

function deliveryReceiptMarker(deliveryKeyValue, channel = 'email') {
  return `<!-- canonical-main-delivery-receipt:${channel}:${deliveryKeyValue} -->`;
}

module.exports = {
  previousIncidentState,
  transitionEligible,
  deliveryKey,
  buildAlertEnvelope,
  envelopeMarker,
  parseEnvelope,
  deliveryReceiptMarker,
};
