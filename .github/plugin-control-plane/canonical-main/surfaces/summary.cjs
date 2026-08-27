'use strict';

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
  const active = (snapshot.incidents?.active || []).filter((row) => row.severity === 'P0' || row.severity === 'P1');
  const incident = active.sort((a, b) => String(a.severity).localeCompare(String(b.severity)))[0];
  if (incident) {
    const number = Number(incident.issue?.number || 0);
    return {
      why: `${incident.reasonCode || 'INCIDENT'}${number > 0 ? ` #${number}` : ''}`,
      next: `REVIEW_INCIDENT${number > 0 ? ` #${number}` : ''}`,
    };
  }

  const attention = (snapshot.incidents?.attention || [])[0];
  if (attention) {
    const number = Number(attention.issue?.number || 0);
    return {
      why: `${attention.reasonCode || 'ATTENTION'}${number > 0 ? ` #${number}` : ''}`,
      next: `REVIEW_ATTENTION${number > 0 ? ` #${number}` : ''}`,
    };
  }

  if (snapshot.convergence?.state === 'SETTLING') {
    return {
      why: snapshot.convergence.stale ? 'CONVERGENCE_STALE' : 'EVIDENCE_SETTLING',
      next: snapshot.convergence.stale ? 'REVIEW_STALE_EVIDENCE' : 'WAIT_FOR_CURRENT_EVIDENCE',
    };
  }
  if (snapshot.operatorState === 'UNKNOWN' || snapshot.freshness?.valid === false) {
    return {why: 'EVIDENCE_UNKNOWN', next: 'REVIEW_UNKNOWN_EVIDENCE'};
  }
  return {why: 'NONE', next: null};
}

function changeSummary(observation) {
  if (!observation || observation.known !== true || observation.data?.state !== 'OK') {
    const detail = String(observation?.summary || 'UNKNOWN — last-seen delta unavailable').replace(/^UNKNOWN\s*—\s*/, '');
    return `UNKNOWN — ${detail}`;
  }
  const data = observation.data;
  return `${data.riskLevel || 'UNKNOWN'} — ${data.commitCount || 0} commit(s) / ${data.fileCount || 0} file(s) since ${String(data.anchorSha || 'UNKNOWN').slice(0, 12)}`;
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
  const reason = topOperationalReason(snapshot);
  const delta = snapshot.observations?.mainDelta;
  const next = reason.next || (delta?.known === true && delta.data?.actionRequired ? delta.data.actionCode : 'NONE');
  return [
    '## Canonical Operator Capsule',
    `- STATE: ${inlineCode(snapshot.operatorState)}`,
    `- MAIN: ${inlineCode(snapshot.observedMainSha)} / Required ${snapshot.observations?.requiredCi?.summary || 'UNKNOWN'}`,
    `- CHANGE: ${changeSummary(delta)}`,
    `- WHY: ${inlineCode(reason.why)}`,
    `- NEXT: ${inlineCode(next)}`,
    `- AUTHORITY: Production ${snapshot.observations?.productionAuthority?.summary || 'UNKNOWN'}; native protection ${inlineCode(protection.state || 'UNKNOWN')} / protected ${inlineCode(protection.protected === true)}; soft fallback ${inlineCode(protection.softEnforcementEnabled ? 'ACTIVE' : 'DISABLED')}`,
    `- UNKNOWN: ${unknownEvidence(snapshot)}`,
    '',
    renderCompatibilityMetadata(snapshot),
  ].join('\n');
}

module.exports = {changeSummary, compactConvergence, renderCompatibilityMetadata, renderSummary, topOperationalReason, unknownEvidence};
