'use strict';

function compactConvergence(convergence) {
  if (!convergence || convergence.state === 'STABLE') return '`STABLE`';
  const waiting = (convergence.waitingFor || []).join(', ') || 'unknown evidence';
  const stale = convergence.stale ? ' / `STALE`' : '';
  return `\`SETTLING\`${stale} — waiting for ${waiting} (${convergence.ageSeconds || 0}s)`;
}

function renderSummary(snapshot) {
  const protection = snapshot.observations.protection.data || {};
  const delivery = snapshot.observations.delivery.data || {};
  const activeP01 = snapshot.incidents.active.filter((row) => row.severity === 'P0' || row.severity === 'P1').length;
  const attentionCount = snapshot.incidents.attention?.length || 0;
  return [
    `**Operator state: ${snapshot.operatorState}**`,
    '',
    `- Convergence: ${compactConvergence(snapshot.convergence)}`,
    `- Main: \`${snapshot.observedMainSha}\``,
    `- Required: ${snapshot.observations.requiredCi.summary}`,
    `- Production authority: ${snapshot.observations.productionAuthority.summary}`,
    `- Native protection: \`${protection.state || 'UNKNOWN'}\` / protected \`${protection.protected === true}\``,
    `- Soft fallback: \`${protection.softEnforcementEnabled ? 'ACTIVE' : 'DISABLED'}\``,
    `- Active P0/P1: \`${activeP01}\``,
    `- Attention: \`${attentionCount}\``,
    `- Notification bridge: \`${delivery.health || 'UNKNOWN'}\` / \`${snapshot.policy.notifications?.bridgeState || 'UNKNOWN'}\``,
    `- Refresh: ${snapshot.observedAt}`,
  ].join('\n');
}

module.exports = {compactConvergence, renderSummary};
