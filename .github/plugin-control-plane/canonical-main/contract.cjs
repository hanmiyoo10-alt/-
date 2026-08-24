'use strict';

const fs = require('fs');
const path = require('path');

const POLICY_PATH = path.join(__dirname, 'policy.json');

function loadPolicy() {
  return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
}

function normalizeScope(scope) {
  const values = Array.isArray(scope) ? scope : scope ? [scope] : [];
  return [...new Set(values.map(String).filter(Boolean))].sort();
}

function validateDescriptor(descriptor, policy = loadPolicy()) {
  const errors = [];
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) return ['descriptor must be an object'];
  if (descriptor.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(descriptor.id || '')) errors.push('id must be machine-safe kebab-case');
  if (!['plugin', 'product'].includes(descriptor.kind)) errors.push('kind must be plugin or product');
  if (!descriptor.displayName) errors.push('displayName missing');
  if (!descriptor.projectPath || descriptor.projectPath.startsWith('/') || descriptor.projectPath.includes('..')) errors.push('projectPath invalid');
  if (!descriptor.guidelines || !descriptor.guidelines.startsWith('docs/') || descriptor.guidelines.includes('..')) errors.push('guidelines must stay under docs/');
  if (!descriptor.authority || typeof descriptor.authority !== 'object') errors.push('authority missing');
  if (!descriptor.memory || !policy.bootstrap.profiles.includes(descriptor.memory.profile)) errors.push('memory.profile unsupported');
  if (!descriptor.alerts || descriptor.alerts.policy !== policy.bootstrap.defaultAlertPolicy) errors.push('alerts.policy must inherit repo-default in phase A');

  const authorityType = descriptor.authority?.type;
  if (!['release', 'manifest', 'evidence', 'none'].includes(authorityType)) errors.push('authority.type unsupported');
  if (authorityType === 'release' && !descriptor.authority.releaseBranch) errors.push('release authority requires releaseBranch');
  if (authorityType === 'manifest' && !descriptor.authority.manifest) errors.push('manifest authority requires manifest');
  if (authorityType === 'evidence' && !descriptor.authority.evidence) errors.push('evidence authority requires evidence');
  if (descriptor.memory?.profile === 'check-only' && authorityType !== 'none' && authorityType !== 'evidence') {
    errors.push('check-only profile requires none/evidence authority');
  }
  if (descriptor.memory?.profile !== 'check-only') {
    if (!Array.isArray(descriptor.memory.outputs) || descriptor.memory.outputs.length === 0) errors.push('writable memory profile requires outputs');
  }
  for (const output of descriptor.memory?.outputs || []) {
    if (output.startsWith('/') || output.includes('..')) errors.push(`memory output invalid: ${output}`);
  }
  return errors;
}

function validateEvent(event, policy = loadPolicy()) {
  const errors = [];
  if (!event || typeof event !== 'object' || Array.isArray(event)) return ['event must be an object'];
  if (event.schemaVersion !== 1) errors.push('event schemaVersion must be 1');
  if (!event.eventId) errors.push('eventId missing');
  if (!policy.events.classes.includes(event.eventClass)) errors.push('eventClass unsupported');
  if (!event.subject?.kind) errors.push('subject.kind missing');
  if (event.subject?.id === undefined && event.subject?.number === undefined) errors.push('subject identity missing');
  if (!event.observation?.reasonCode) errors.push('observation.reasonCode missing');
  if (!policy.events.dispositions.includes(event.disposition)) errors.push('disposition unsupported');
  const scope = normalizeScope(event.scope);
  if (!scope.length) errors.push('scope missing');
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

function correlationKey(event) {
  const errors = validateEvent(event);
  if (errors.length) throw new Error(`invalid event: ${errors.join('; ')}`);
  return [
    event.eventClass,
    normalizeScope(event.scope).join(','),
    subjectIdentity(event.subject),
    authorityIdentity(event.authority),
    event.observation.reasonCode,
  ].join('|');
}

function severityFor(event, overrides = {}, policy = loadPolicy()) {
  const reason = event?.observation?.reasonCode;
  const base = policy.alerts.defaultSeverity[reason] || 'P2';
  if (policy.alerts.nonDowngradable.includes(reason)) return base;
  const override = overrides[reason];
  return policy.alerts.severities.includes(override) ? override : base;
}

function transitionForDisposition(disposition) {
  if (disposition === 'RECOVERY_FEEDBACK_CANDIDATE') return 'RECOVERED';
  if (disposition === 'FEEDBACK_CANDIDATE' || disposition === 'ESCALATION_CANDIDATE') return 'OPEN';
  return 'NONE';
}

function applyIncident(previous, event, overrides = {}) {
  const key = correlationKey(event);
  const transition = transitionForDisposition(event.disposition);
  const severity = severityFor(event, overrides);
  if (transition === 'NONE') return previous || null;
  if (transition === 'RECOVERED') {
    return {
      ...(previous || {}),
      correlationKey: key,
      severity: previous?.severity || severity,
      state: 'RECOVERED',
      latestEventId: event.eventId,
      latestEvidence: [...(event.evidence || [])],
    };
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

function deriveOperatorState({incidents = [], attention = [], freshnessValid = false} = {}) {
  if (!freshnessValid) return 'UNKNOWN';
  const active = incidents.filter((incident) => incident?.state === 'OPEN');
  if (active.some((incident) => incident.severity === 'P0' || incident.severity === 'P1')) return 'INCIDENT';
  if (active.some((incident) => incident.severity === 'P2') || attention.length > 0) return 'ATTENTION';
  return 'CLEAR';
}

module.exports = {
  loadPolicy,
  normalizeScope,
  validateDescriptor,
  validateEvent,
  correlationKey,
  severityFor,
  applyIncident,
  deriveOperatorState,
};
