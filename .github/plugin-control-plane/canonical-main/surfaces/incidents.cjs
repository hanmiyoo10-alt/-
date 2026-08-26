'use strict';

const {envelopeMarker} = require('../notification.cjs');
const {markerForKey, markerForEvent} = require('../domains/incidents.cjs');
const {metricsFromTransitions, metricsMarker} = require('../domains/incident-metrics.cjs');
const {buildIncidentHistory, renderTransitionHistory, transitionMarker} = require('./incident-history.cjs');

function renderIncidentBody(event, severity, state, key, alertEnvelope = null, previousBody = '', historyLimit = 6) {
  const evidence = (event.evidence || []).slice(0, 12);
  const history = buildIncidentHistory(previousBody, event, severity, state, historyLimit);
  const metrics = metricsFromTransitions(history.transitions);
  return [
    `# Canonical Main Incident — ${event.observation.reasonCode}`,
    '',
    '> Derived incident record. This issue is not a production/release authority.',
    '',
    `- State: **${state}**`,
    `- Severity: **${severity}**`,
    `- Scope: ${(event.scope || []).map((row) => `\`${row}\``).join(', ') || '`UNKNOWN`'}`,
    `- Event class: \`${event.eventClass}\``,
    `- Reason: \`${event.observation.reasonCode}\``,
    `- Subject: \`${event.subject.kind}:${event.subject.id ?? event.subject.number ?? 'UNKNOWN'}\``,
    `- Summary: ${event.summary || 'No summary provided.'}`,
    `- Observed transition: \`${event.observation.from || 'UNKNOWN'} → ${event.observation.to || 'UNKNOWN'}\``,
    `- Open count: \`${metrics.openCount}\``,
    `- Recovery count: \`${metrics.recoveryCount}\``,
    `- Flap count: \`${metrics.flapCount}\``,
    `- Last transition: ${metrics.lastTransitionAt || 'UNKNOWN'}`,
    ...(alertEnvelope ? [`- Notification eligible: \`${alertEnvelope.eligible}\``, `- Delivery key: \`${alertEnvelope.deliveryKey}\``] : []),
    '',
    '## Evidence',
    '',
    ...(evidence.length ? evidence.map((row) => `- \`${String(row).replace(/`/g, '')}\``) : ['- `UNKNOWN`']),
    '',
    renderTransitionHistory(history.transitions),
    '',
    markerForKey(key),
    ...history.eventIds.map(markerForEvent),
    ...history.transitions.map(transitionMarker),
    metricsMarker(metrics),
    ...(alertEnvelope ? [envelopeMarker(alertEnvelope)] : []),
  ].join('\n');
}
function renderIncidentRows(incidents) {
  return incidents.length ? incidents.map(({issue, severity, state, reasonCode}) => `- **${severity}** ${state} — ${issue.number ? `#${issue.number} ` : ''}${reasonCode ? `\`${reasonCode}\` — ` : ''}${issue.title}`).join('\n') : '- none observed within current adapter coverage';
}
module.exports = {renderIncidentBody, renderIncidentRows};
