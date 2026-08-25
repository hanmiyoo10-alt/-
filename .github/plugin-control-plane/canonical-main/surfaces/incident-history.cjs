'use strict';

const EVENT_RE = /<!-- canonical-main-event:([A-Za-z0-9_-]+) -->/g;
const TRANSITION_RE = /<!-- canonical-main-transition:([A-Za-z0-9_-]+) -->/g;

function decodeJson(encoded) {
  try { return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch (_) { return null; }
}
function transitionMarker(record) {
  return `<!-- canonical-main-transition:${Buffer.from(JSON.stringify(record), 'utf8').toString('base64url')} -->`;
}
function parseTransitionHistory(body = '') {
  const out = [];
  for (const match of body.matchAll(TRANSITION_RE)) {
    const record = decodeJson(match[1]);
    if (record?.schemaVersion === 1 && ['OPEN', 'RECOVERED'].includes(record.state)) out.push(record);
  }
  return out;
}
function eventIdsFromBody(body = '') {
  const out = [];
  for (const match of body.matchAll(EVENT_RE)) {
    try { out.push(Buffer.from(match[1], 'base64url').toString('utf8')); } catch (_) {}
  }
  return [...new Set(out.filter(Boolean))];
}
function field(body, label) {
  const match = body.match(new RegExp(`- ${label}: (.+)`));
  return match ? match[1].trim() : null;
}
function cleanInline(value = '') { return value.replace(/^\*\*|\*\*$/g, '').replace(/^`|`$/g, '').trim(); }
function legacyTransitionFromBody(body = '') {
  const state = cleanInline(field(body, 'State') || '');
  if (!['OPEN', 'RECOVERED'].includes(state)) return null;
  const transition = cleanInline(field(body, 'Observed transition') || 'UNKNOWN → UNKNOWN').split(/\s*→\s*/);
  const evidenceBlock = body.match(/## Evidence\s*\n([\s\S]*?)(?:\n## |\n<!-- canonical-main-|$)/);
  const evidence = evidenceBlock ? evidenceBlock[1].split(/\r?\n/).map((line) => line.match(/^-\s+`?([^`]+)`?$/)?.[1]).filter(Boolean).slice(0, 12) : [];
  const eventId = eventIdsFromBody(body).at(-1) || `legacy:${state}:${cleanInline(field(body, 'Reason') || 'UNKNOWN')}`;
  return {
    schemaVersion: 1,
    state,
    severity: cleanInline(field(body, 'Severity') || 'P2'),
    eventId,
    eventClass: cleanInline(field(body, 'Event class') || 'UNKNOWN'),
    reasonCode: cleanInline(field(body, 'Reason') || 'UNKNOWN'),
    scope: [...(field(body, 'Scope') || '').matchAll(/`([^`]+)`/g)].map((match) => match[1]),
    summary: field(body, 'Summary') || 'Legacy incident transition.',
    observedTransition: {from: transition[0] || 'UNKNOWN', to: transition[1] || 'UNKNOWN'},
    evidence,
    observedAt: null,
  };
}
function transitionRecord(event, severity, state) {
  return {
    schemaVersion: 1,
    state,
    severity,
    eventId: String(event.eventId),
    eventClass: event.eventClass,
    reasonCode: event.observation.reasonCode,
    scope: [...(event.scope || [])],
    summary: event.summary || 'No summary provided.',
    observedTransition: {from: event.observation.from || 'UNKNOWN', to: event.observation.to || 'UNKNOWN'},
    evidence: (event.evidence || []).slice(0, 12),
    observedAt: event.observedAt || null,
  };
}
function buildIncidentHistory(previousBody, event, severity, state, limit = 6, eventLimit = 16) {
  let transitions = parseTransitionHistory(previousBody);
  if (!transitions.length) {
    const legacy = legacyTransitionFromBody(previousBody);
    if (legacy) transitions = [legacy];
  }
  const current = transitionRecord(event, severity, state);
  if (!transitions.length || transitions.at(-1).state !== current.state) transitions.push(current);
  transitions = transitions.slice(-Math.max(2, limit));
  const eventIds = [...new Set([...eventIdsFromBody(previousBody), current.eventId])].slice(-Math.max(4, eventLimit));
  return {transitions, eventIds};
}
function normalizeIncidentBodyState(body = '', state) {
  if (!['OPEN', 'RECOVERED'].includes(state)) return body;
  return body.replace(/- State:\s*\*\*(?:OPEN|RECOVERED|UNKNOWN)\*\*/, `- State: **${state}**`);
}
function renderTransitionHistory(records = []) {
  const rows = records.map((record) => {
    const evidence = (record.evidence || []).slice(0, 4).map((row) => `\`${String(row).replace(/`/g, '')}\``).join(', ');
    return `- \`${record.state}\` — \`${record.reasonCode || 'UNKNOWN'}\` — ${record.summary || 'No summary provided.'}${evidence ? ` — evidence: ${evidence}` : ''}`;
  });
  return ['## Transition history', '', ...(rows.length ? rows : ['- `UNKNOWN`'])].join('\n');
}

module.exports = {
  transitionMarker,
  parseTransitionHistory,
  eventIdsFromBody,
  legacyTransitionFromBody,
  transitionRecord,
  buildIncidentHistory,
  normalizeIncidentBodyState,
  renderTransitionHistory,
};
