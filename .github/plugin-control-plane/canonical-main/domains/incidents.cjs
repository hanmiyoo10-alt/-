'use strict';

const {correlationKey} = require('../core/event.cjs');
const {severityFor} = require('../core/severity.cjs');
const {previousIncidentState, buildAlertEnvelope} = require('../notification.cjs');
const {parseIncidentMetrics} = require('./incident-metrics.cjs');

function incidentFromIssue(issue) {
  const labels = (issue.labels || []).map((label) => typeof label === 'string' ? label : label.name);
  if (!labels.includes('control-plane:incident')) return null;
  const severityLabel = labels.find((label) => /^severity:P[0-3]$/.test(label));
  const state = labels.includes('incident:recovered') ? 'RECOVERED' : labels.includes('incident:open') ? 'OPEN' : 'UNKNOWN';
  return {issue, severity: severityLabel ? severityLabel.split(':')[1] : 'P2', state, metrics: parseIncidentMetrics(issue.body || '')};
}
function eventTransition(event) {
  if (event.disposition === 'RECOVERY_FEEDBACK_CANDIDATE') return 'RECOVERED';
  if (event.disposition === 'FEEDBACK_CANDIDATE' || event.disposition === 'ESCALATION_CANDIDATE') return 'OPEN';
  return 'NONE';
}
const markerForKey = (key) => `<!-- canonical-main-correlation:${Buffer.from(key).toString('base64url')} -->`;
const markerForEvent = (eventId) => `<!-- canonical-main-event:${Buffer.from(String(eventId)).toString('base64url')} -->`;
function existingIncident(allIssues, key) { const marker = markerForKey(key); return allIssues.find((issue) => (issue.body || '').includes(marker)) || null; }
function incidentLabels(event, severity, state) {
  const labels = ['control-plane:incident', `incident:${state.toLowerCase()}`, `severity:${severity}`];
  for (const scope of event.scope || []) if (/^(?:plugin|product|scope):/.test(scope)) labels.push(scope);
  return [...new Set(labels)].sort();
}
function planIncident(event, allIssues, policy) {
  const transition = eventTransition(event);
  if (transition === 'NONE') return {action: 'none'};
  const key = correlationKey(event, policy), severity = severityFor(event, {}, policy), issue = existingIncident(allIssues, key);
  if (transition === 'RECOVERED' && !issue) return {action: 'none'};
  if (issue && (issue.body || '').includes(markerForEvent(event.eventId))) return {action: 'none'};
  const priorState = previousIncidentState(issue);
  if (transition === 'RECOVERED' && priorState === 'RECOVERED') return {action: 'none'};
  const alertEnvelope = buildAlertEnvelope({event, severity, transition, correlationKey: key, previousState: priorState});
  return {action: issue ? 'update' : 'create', issue, event, transition, key, severity, alertEnvelope, labels: incidentLabels(event, severity, transition), title: `[repo-incident:${severity}] ${event.observation.reasonCode} — ${(event.scope || []).join(',') || 'UNKNOWN'}`};
}
module.exports = {incidentFromIssue, eventTransition, markerForKey, markerForEvent, existingIncident, incidentLabels, planIncident};
