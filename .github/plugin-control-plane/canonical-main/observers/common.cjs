'use strict';

function makeEvent({eventClass, subject, scope, authority, from, to, reasonCode, disposition, evidence = [], eventId, summary, observedAt = null}) {
  return {schemaVersion: 1, eventId, eventClass, subject, scope, authority, observation: {from, to, reasonCode}, disposition, evidence, observedAt: observedAt || new Date().toISOString(), summary};
}
function stableEventId(prefix, ...parts) { return [prefix, ...parts.map((value) => String(value ?? 'UNKNOWN'))].join(':'); }
async function safeObserve(label, fn) {
  try { return await fn(); } catch (error) { return {known: false, summary: `UNKNOWN — ${label} adapter error: ${error.message}`, events: [], data: null}; }
}
module.exports = {makeEvent, stableEventId, safeObserve};
