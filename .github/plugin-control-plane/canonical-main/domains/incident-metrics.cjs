'use strict';

const METRICS_RE = /<!-- canonical-main-incident-metrics:([A-Za-z0-9_-]+) -->/;
const RECENT_TRANSITION_LIMIT = 12;

function boundedRecentTransitions(transitions = [], limit = RECENT_TRANSITION_LIMIT) {
  return transitions
    .filter((row) => (row?.state === 'OPEN' || row?.state === 'RECOVERED') && Number.isFinite(Date.parse(row?.observedAt)))
    .map((row) => ({state: row.state, observedAt: row.observedAt}))
    .slice(-Math.max(1, limit));
}

function metricsFromTransitions(transitions = []) {
  const openCount = transitions.filter((row) => row?.state === 'OPEN').length;
  const recoveryCount = transitions.filter((row) => row?.state === 'RECOVERED').length;
  const last = transitions.at(-1) || null;
  return {
    schemaVersion: 2,
    openCount,
    recoveryCount,
    flapCount: Math.max(0, openCount - 1),
    lastTransitionAt: last?.observedAt || null,
    recentTransitions: boundedRecentTransitions(transitions),
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
    return parsed?.schemaVersion === 1 || parsed?.schemaVersion === 2 ? parsed : null;
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
    schemaVersion: 2,
    openCount,
    recoveryCount,
    flapCount: Math.max(0, openCount - 1),
    lastTransitionAt: observedAt || previous.lastTransitionAt || null,
    recentTransitions: boundedRecentTransitions(transitions),
  };
}

function latestQualifyingFlapAt(metrics, threshold, windowSeconds) {
  const recent = boundedRecentTransitions(metrics?.recentTransitions || []);
  let latest = null;
  for (let end = 0; end < recent.length; end += 1) {
    const endMs = Date.parse(recent[end].observedAt);
    let alternations = 0;
    for (let start = end - 1; start >= 0; start -= 1) {
      const startMs = Date.parse(recent[start].observedAt);
      if ((endMs - startMs) / 1000 > windowSeconds) break;
      if (recent[start].state !== recent[start + 1].state) alternations += 1;
      if (alternations >= threshold) {
        latest = recent[end].observedAt;
        break;
      }
    }
  }
  return latest;
}

function unstableAttention(incidentRows, policy, now = Date.now()) {
  const threshold = Math.max(1, Number(policy?.stability?.flapThreshold || 3));
  const windowSeconds = Math.max(1, Number(policy?.stability?.flapWindowSeconds || 300));
  const quietSeconds = Math.max(1, Number(policy?.stability?.flapQuietSeconds || windowSeconds));
  return incidentRows.flatMap((row) => {
    if (row.state === 'OPEN' && (row.severity === 'P0' || row.severity === 'P1')) return [];
    const metrics = row.metrics;
    const qualifyingAt = latestQualifyingFlapAt(metrics, threshold, windowSeconds);
    if (!qualifyingAt) return [];
    const ageSeconds = Math.max(0, Math.floor((now - Date.parse(qualifyingAt)) / 1000));
    if (!Number.isFinite(ageSeconds) || ageSeconds > quietSeconds) return [];
    return [{
      state: 'OPEN',
      severity: 'P2',
      reasonCode: 'UNSTABLE_COMPONENT',
      issue: {number: row.issue.number, title: `UNSTABLE_COMPONENT — ${row.issue.title}`},
      metrics,
    }];
  });
}

module.exports = {
  metricsFromTransitions,
  metricsMarker,
  parseIncidentMetrics,
  stateFromBody,
  advanceIncidentMetrics,
  latestQualifyingFlapAt,
  unstableAttention,
};
