'use strict';

const {explainBlocked, legacyReason, renderWhy} = require('../domains/why-blocked.cjs');

function inlineCode(value) {
  return `\`${String(value ?? 'UNKNOWN').replace(/`/g, "'")}\``;
}

function compactConvergence(convergence) {
  if (!convergence || convergence.state === 'STABLE') return '`STABLE`';
  const waiting = (convergence.waitingFor || []).join(', ') || 'unknown evidence';
  const stale = convergence.stale ? ' / `STALE`' : '';
  return `\`SETTLING\`${stale} — waiting for ${waiting} (${convergence.ageSeconds || 0}s)`;
}

function topOperationalReason(snapshot) {
  return legacyReason(explainBlocked(snapshot));
}

function changeSummary(observation) {
  if (!observation || observation.known !== true || observation.data?.state !== 'OK') {
    const detail = String(observation?.summary || 'UNKNOWN — last-seen delta unavailable').replace(/^UNKNOWN\s*—\s*/, '');
    return `UNKNOWN — ${detail}`;
  }
  const data = observation.data;
  const total = Number.isSafeInteger(data.commitCount) ? data.commitCount : 0;
  const routine = Number.isSafeInteger(data.routineGeneratedDocCommitCount) ? data.routineGeneratedDocCommitCount : 0;
  const meaningful = Number.isSafeInteger(data.meaningfulCommitCount) ? data.meaningfulCommitCount : Math.max(0, total - routine);
  const commits = routine > 0
    ? `${total} total commit(s) (${meaningful} meaningful + ${routine} routine generated-doc)`
    : `${total} commit(s)`;
  return `${data.riskLevel || 'UNKNOWN'} — ${commits} / ${data.fileCount || 0} file(s) since ${String(data.anchorSha || 'UNKNOWN').slice(0, 12)}`;
}

function unknownEvidence(snapshot, limit = 4) {
  const ids = Object.entries(snapshot.observations || {})
    .filter(([, observation]) => observation?.known === false)
    .map(([id]) => id);
  if (snapshot.freshness?.configuredCoverageComplete === false) ids.push('adapterCoverage');
  if (snapshot.freshness?.observationCoverageValid === false) ids.push('requiredCoverage');
  if (snapshot.freshness?.projectStatusFresh === false) ids.push('projectStatusFreshness');
  const unique = [...new Set(ids)];
  if (!unique.length) return 'NONE';
  const visible = unique.slice(0, Math.max(1, limit));
  const suffix = unique.length > visible.length ? ` (+${unique.length - visible.length} more)` : '';
  return `${visible.map(inlineCode).join(', ')}${suffix}`;
}

function renderCompatibilityMetadata(snapshot) {
  const protection = snapshot.observations?.protection?.data || {};
  const delivery = snapshot.observations?.delivery?.data || {};
  return [
    '<!-- canonical-main-summary-compat:v1',
    `Operator state: ${snapshot.operatorState}`,
    `Convergence: ${compactConvergence(snapshot.convergence)}`,
    `Required: ${snapshot.observations?.requiredCi?.summary || 'UNKNOWN'}`,
    `Production authority: ${snapshot.observations?.productionAuthority?.summary || 'UNKNOWN'}`,
    `Native protection: ${inlineCode(protection.state || 'UNKNOWN')} / protected ${inlineCode(protection.protected === true)}`,
    `Notification bridge: ${inlineCode(delivery.health || 'UNKNOWN')} / ${inlineCode(snapshot.policy?.notifications?.bridgeState || 'UNKNOWN')}`,
    '-->',
  ].join('\n');
}

function renderSummary(snapshot) {
  const protection = snapshot.observations?.protection?.data || {};
  const blocked = explainBlocked(snapshot);
  const delta = snapshot.observations?.mainDelta;
  const next = blocked.blocked ? blocked.nextAction : (delta?.known === true && delta.data?.actionRequired ? delta.data.actionCode : 'NONE');
  return [
    '## Canonical Operator Capsule',
    `- STATE: ${inlineCode(snapshot.operatorState)}`,
    `- MAIN: ${inlineCode(snapshot.observedMainSha)} / Required ${snapshot.observations?.requiredCi?.summary || 'UNKNOWN'}`,
    `- CHANGE: ${changeSummary(delta)}`,
    `- WHY: ${renderWhy(blocked, inlineCode)}`,
    `- NEXT: ${inlineCode(next)}`,
    `- AUTHORITY: Production ${snapshot.observations?.productionAuthority?.summary || 'UNKNOWN'}; native protection ${inlineCode(protection.state || 'UNKNOWN')} / protected ${inlineCode(protection.protected === true)}; soft fallback ${inlineCode(protection.softEnforcementEnabled ? 'ACTIVE' : 'DISABLED')}`,
    `- UNKNOWN: ${unknownEvidence(snapshot)}`,
    '',
    renderCompatibilityMetadata(snapshot),
  ].join('\n');
}

module.exports = {changeSummary, compactConvergence, renderCompatibilityMetadata, renderSummary, topOperationalReason, unknownEvidence};
