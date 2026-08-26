'use strict';

function pendingDescriptor(id, observation) {
  if (!observation || observation.known === true) return null;
  const summary = String(observation.summary || 'UNKNOWN');
  const pending = /^PENDING\b/.test(summary);
  const run = observation.data?.run || (Array.isArray(observation.data) ? observation.data.find((row) => row?.run)?.run : null);
  const since = run?.created_at || run?.run_started_at || null;
  return {id, pending, summary, since};
}

function deriveConvergence(observations, policy, now = Date.now()) {
  const ids = ['requiredCi', 'productionAuthority', 'writers', 'bootstrap'];
  const waiting = ids.map((id) => pendingDescriptor(id, observations[id])).filter(Boolean);
  if (!waiting.length) return {state: 'STABLE', waitingFor: [], since: null, ageSeconds: 0, stale: false};
  const times = waiting.map((row) => Date.parse(row.since || '')).filter(Number.isFinite);
  const sinceMs = times.length ? Math.min(...times) : now;
  const ageSeconds = Math.max(0, Math.floor((now - sinceMs) / 1000));
  const budget = Math.max(1, Number(policy?.stability?.convergenceBudgetSeconds || 300));
  return {
    state: 'SETTLING',
    waitingFor: waiting.map((row) => row.id),
    since: new Date(sinceMs).toISOString(),
    ageSeconds,
    stale: ageSeconds > budget,
  };
}

function convergenceAttention(convergence) {
  if (!convergence?.stale) return [];
  return [{
    state: 'OPEN',
    severity: 'P2',
    reasonCode: 'CONVERGENCE_STALE',
    issue: {number: 0, title: `UNSTABLE_COMPONENT — convergence waiting for ${(convergence.waitingFor || []).join(', ') || 'unknown evidence'}`},
  }];
}

module.exports = {pendingDescriptor, deriveConvergence, convergenceAttention};
