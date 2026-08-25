'use strict';

const START = '<!-- canonical-main-mail-bridge-health:start -->';
const END = '<!-- canonical-main-mail-bridge-health:end -->';

function parseBridgeHealth(body = '') {
  const start = body.indexOf(START);
  const end = body.indexOf(END);
  if (start < 0 || end <= start) return null;
  const section = body.slice(start + START.length, end);
  const match = section.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match) return null;
  try {
    const value = JSON.parse(match[1]);
    if (!value || value.schemaVersion !== 1) return null;
    return value;
  } catch {
    return null;
  }
}

function deriveBridgeHealth(issue, now = Date.now(), freshnessMinutes = 150) {
  if (!issue) return {state: 'UNKNOWN', fresh: false, data: null, reason: 'health issue missing'};
  const data = parseBridgeHealth(issue.body || '');
  if (!data) return {state: 'UNKNOWN', fresh: false, data: null, reason: 'health block invalid'};
  const lastCheck = Date.parse(data.lastCheckAt || '');
  if (!Number.isFinite(lastCheck)) return {state: 'UNKNOWN', fresh: false, data, reason: 'lastCheckAt invalid'};
  const fresh = now - lastCheck <= freshnessMinutes * 60 * 1000;
  if (!fresh) return {state: 'STALE', fresh: false, data, reason: 'health observation stale'};
  if (data.state === 'DEGRADED' || Number(data.consecutiveFailureCount || 0) > 0) {
    return {state: 'DEGRADED', fresh: true, data, reason: data.lastError || 'delivery failure observed'};
  }
  if (data.state !== 'ACTIVE_PROVEN') return {state: 'UNKNOWN', fresh: true, data, reason: `unsupported bridge state ${data.state || 'UNKNOWN'}`};
  return {state: 'ACTIVE_PROVEN', fresh: true, data, reason: 'current'};
}

function renderBridgeHealth(health, issueNumber = null) {
  const data = health.data || {};
  return [
    `- Delivery health: \`${health.state}\`${issueNumber ? ` — #${issueNumber}` : ''}`,
    `- Last delivery check: \`${data.lastCheckAt || 'UNKNOWN'}\``,
    `- Last successful delivery: \`${data.lastSuccessAt || 'UNKNOWN'}\``,
    `- Last outcome: \`${data.lastOutcome || 'UNKNOWN'}\``,
    `- Delivery counters: success \`${Number(data.successCount || 0)}\` / failed \`${Number(data.failureCount || 0)}\` / duplicate-suppressed \`${Number(data.suppressedDuplicateCount || 0)}\``,
    `- Consecutive delivery failures: \`${Number(data.consecutiveFailureCount || 0)}\``,
    '- Delivery health remains non-authoritative for release/main health.',
  ].join('\n');
}

module.exports = {
  START,
  END,
  parseBridgeHealth,
  deriveBridgeHealth,
  renderBridgeHealth,
};
