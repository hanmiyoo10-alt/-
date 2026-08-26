'use strict';

const METRICS_RE = /<!-- canonical-main-incident-metrics:([A-Za-z0-9_-]+) -->/;

function metricsFromTransitions(transitions = []) {
  const openCount = transitions.filter((row) => row?.state === 'OPEN').length;
  const recoveryCount = transitions.filter((row) => row?.state === 'RECOVERED').length;
  const last = transitions.at(-1) || null;
  return {
    schemaVersion: 1,
    openCount,
    recoveryCount,
    flapCount: Math.max(0, openCount - 1),
    lastTransitionAt: last?.observedAt || null,
  };
}

function metricsMarker(metrics) {
  return `<!-- canonical-main-incident-metrics:${Buffer.from(JSON.stringify(metrics), 'utf8').toString('base64url')} -->`;
}

function parseIncidentMetrics(body = '') {
  const match = body.match(METRICS_RE);
  if (!match) return null;
  try {
    const parsed = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
    return parsed?.schemaVersion === 1 ? parsed : null;
  } catch (_) {
    return null;
  }
}

function stateFromBody(body = '') {
  const match = body.match(/- State:\s*\*\*(OPEN|RECOVERED|UNKNOWN)\*\*/);
  return match ? match[1] : null;
}

function advanceIncidentMetrics(previousBody, transitions, nextState, observedAt = null) {
  const previous = parseIncidentMetrics(previousBody);
  if (!previous) return metricsFromTransitions(transitions);
  const previousState = stateFromBody(previousBody);
  if (!previousState || previousState === nextState) return {...previous};
  const openCount = previous.openCount + (nextState === 'OPEN' ? 1 : 0);
  const recoveryCount = previous.recoveryCount + (nextState === 'RECOVERED' ? 1 : 0);
  return {
    schemaVersion: 1,
    openCount,
    recoveryCount,
    flapCount: Math.max(0, openCount - 1),
    lastTransitionAt: observedAt || previous.lastTransitionAt || null,
  };
}

function unstableAttention(incidentRows, policy, now = Date.now()) {
  const threshold = Math.max(1, Number(policy?.stability?.flapThreshold || 3));
  const windowSeconds = Math.max(1, Number(policy?.stability?.flapWindowSeconds || 300));
  return incidentRows.flatMap((row) => {
    if (row.state === 'OPEN' && (row.severity === 'P0' || row.severity === 'P1')) return [];
    const metrics = row.metrics;
    if (!metrics || metrics.flapCount < threshold || !metrics.lastTransitionAt) return [];
    const ageSeconds = Math.max(0, Math.floor((now - Date.parse(metrics.lastTransitionAt)) / 1000));
    if (!Number.isFinite(ageSeconds) || ageSeconds > windowSeconds) return [];
    return [{
      state: 'OPEN',
      severity: 'P2',
      reasonCode: 'UNSTABLE_COMPONENT',
      issue: {number: row.issue.number, title: `UNSTABLE_COMPONENT — ${row.issue.title}`},
      metrics,
    }];
  });
}

module.exports = {metricsFromTransitions, metricsMarker, parseIncidentMetrics, stateFromBody, advanceIncidentMetrics, unstableAttention};
