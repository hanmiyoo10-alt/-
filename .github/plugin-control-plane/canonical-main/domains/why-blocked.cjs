'use strict';

const {isRepositoryNextAction, nextActionForBlock} = require('./next-action.cjs');

const SCOPE_LABEL_RE = /^(?:scope|plugin|product):[A-Za-z0-9._-]+$/;
const FORBIDDEN_ACTION_RE = /(?:BYPASS|DISABLE|SKIP|FORCE[_ -]?PUSH)/i;

function issueLabels(issue) {
  return (issue?.labels || [])
    .map((label) => typeof label === 'string' ? label : label?.name)
    .filter((label) => typeof label === 'string' && label.length > 0);
}

function ownerFromIssue(issue) {
  const scopes = [...new Set(issueLabels(issue).filter((label) => SCOPE_LABEL_RE.test(label)))].sort();
  const specific = scopes.filter((label) => label !== 'scope:repo');
  return specific[0] || scopes[0] || 'scope:repo';
}

function reasonCodeFromIncident(row, fallback) {
  const direct = String(row?.reasonCode || '').trim();
  if (direct) return direct;
  const body = String(row?.issue?.body || '');
  const bodyMatch = body.match(/^- Reason:\s*`([^`]+)`\s*$/m);
  if (bodyMatch) return bodyMatch[1].trim();
  const title = String(row?.issue?.title || '');
  const titleMatch = title.match(/\]\s+([A-Z][A-Z0-9_:-]+)\s+—/);
  return titleMatch ? titleMatch[1] : fallback;
}

function issueNumber(row) {
  const number = Number(row?.issue?.number || 0);
  return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

function explanation({blockingClass, reasonCode, evidence, nextAction, owner}) {
  const boundedEvidence = [...new Set((evidence || []).filter(Boolean).map(String))].slice(0, 4);
  const action = String(nextAction || '').trim();
  if (!action || FORBIDDEN_ACTION_RE.test(action) || !isRepositoryNextAction(action)) {
    throw new Error('why-blocked next action violates repository-defined legal-action contract');
  }
  return Object.freeze({
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_WHY_BLOCKED',
    blocked: true,
    blockingClass,
    reasonCode: String(reasonCode || 'EVIDENCE_UNKNOWN'),
    evidence: boundedEvidence,
    nextAction: action,
    owner: String(owner || 'scope:repo'),
  });
}

function notBlocked() {
  return Object.freeze({
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_WHY_BLOCKED',
    blocked: false,
    blockingClass: 'NONE',
    reasonCode: 'NONE',
    evidence: [],
    nextAction: null,
    owner: null,
  });
}

function incidentExplanation(row, blockingClass, fallbackReason) {
  const number = issueNumber(row);
  const reasonCode = reasonCodeFromIncident(row, fallbackReason);
  return explanation({
    blockingClass,
    reasonCode,
    evidence: [number ? `issue:#${number}` : null, row?.severity ? `severity:${row.severity}` : null],
    nextAction: nextActionForBlock({blockingClass, reasonCode}),
    owner: ownerFromIssue(row?.issue),
  });
}

function unknownEvidenceIds(snapshot, limit = 4) {
  const ids = Object.entries(snapshot?.observations || {})
    .filter(([, observation]) => observation?.known === false)
    .map(([id]) => `observation:${id}`);
  if (snapshot?.freshness?.configuredCoverageComplete === false) ids.push('freshness:adapterCoverage');
  if (snapshot?.freshness?.observationCoverageValid === false) ids.push('freshness:requiredCoverage');
  if (snapshot?.freshness?.projectStatusFresh === false) ids.push('freshness:projectStatus');
  if (!ids.length && snapshot?.operatorState === 'UNKNOWN') ids.push('operatorState:UNKNOWN');
  return [...new Set(ids)].sort().slice(0, Math.max(1, limit));
}

function incidentSort(a, b) {
  const severity = String(a?.severity || 'P9').localeCompare(String(b?.severity || 'P9'));
  return severity || issueNumber(a) - issueNumber(b);
}

function explainBlocked(snapshot) {
  const active = (snapshot?.incidents?.active || [])
    .filter((row) => row?.severity === 'P0' || row?.severity === 'P1')
    .slice()
    .sort(incidentSort);
  if (active[0]) return incidentExplanation(active[0], 'INCIDENT', 'INCIDENT');

  const attention = (snapshot?.incidents?.attention || [])
    .filter((row) => row?.reasonCode !== 'CONVERGENCE_STALE' || issueNumber(row) > 0)
    .slice()
    .sort(incidentSort);
  if (attention[0]) return incidentExplanation(attention[0], 'ATTENTION', 'ATTENTION');

  if (snapshot?.convergence?.state === 'SETTLING') {
    const waiting = [...new Set(snapshot.convergence.waitingFor || [])].sort().map((id) => `observation:${id}`);
    const stale = snapshot.convergence.stale === true;
    const blockingClass = stale ? 'STALE_CONVERGENCE' : 'SETTLING';
    const reasonCode = stale ? 'CONVERGENCE_STALE' : 'EVIDENCE_SETTLING';
    return explanation({
      blockingClass,
      reasonCode,
      evidence: waiting.length ? waiting : ['convergence:waiting'],
      nextAction: nextActionForBlock({blockingClass, reasonCode}),
      owner: 'scope:repo',
    });
  }

  if (snapshot?.operatorState === 'UNKNOWN' || snapshot?.freshness?.valid === false) {
    return explanation({
      blockingClass: 'UNKNOWN',
      reasonCode: 'EVIDENCE_UNKNOWN',
      evidence: unknownEvidenceIds(snapshot),
      nextAction: nextActionForBlock({blockingClass: 'UNKNOWN', reasonCode: 'EVIDENCE_UNKNOWN'}),
      owner: 'scope:repo',
    });
  }

  return notBlocked();
}

function legacyReason(explained) {
  if (!explained?.blocked) return {why: 'NONE', next: null};
  const issue = explained.evidence.find((row) => /^issue:#\d+$/.test(row));
  const suffix = issue ? ` #${issue.slice('issue:#'.length)}` : '';
  return {why: `${explained.reasonCode}${suffix}`, next: explained.nextAction};
}

function renderWhy(explained, inlineCode = (value) => `\`${String(value)}\``) {
  if (!explained?.blocked) return inlineCode('NONE');
  const evidence = explained.evidence.length ? explained.evidence.map(inlineCode).join(', ') : inlineCode('UNKNOWN');
  return `${inlineCode(explained.reasonCode)} — evidence ${evidence} — owner ${inlineCode(explained.owner)}`;
}

module.exports = {
  FORBIDDEN_ACTION_RE,
  explainBlocked,
  incidentExplanation,
  legacyReason,
  notBlocked,
  ownerFromIssue,
  reasonCodeFromIncident,
  renderWhy,
  unknownEvidenceIds,
};
