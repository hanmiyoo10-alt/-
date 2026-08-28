'use strict';

const assert = require('assert');
const {NEXT_ACTIONS, isRepositoryNextAction, nextActionForBlock} = require('../domains/next-action.cjs');
const {
  FORBIDDEN_ACTION_RE,
  explainBlocked,
  legacyReason,
  ownerFromIssue,
  reasonCodeFromIncident,
  renderWhy,
  unknownEvidenceIds,
} = require('../domains/why-blocked.cjs');

function incidentIssue(number, reasonCode, scopes = ['scope:repo']) {
  return {
    number,
    title: `[repo-incident:P1] ${reasonCode} — ${scopes.join(',')}`,
    body: `# Incident\n\n- Reason: \`${reasonCode}\`\n`,
    labels: ['control-plane:incident', 'incident:open', 'severity:P1', ...scopes].map((name) => ({name})),
  };
}

function snapshot(overrides = {}) {
  const base = {
    operatorState: 'CLEAR',
    observations: {
      requiredCi: {known: true},
      productionAuthority: {known: true},
      writers: {known: true},
      bootstrap: {known: true},
      projectStatus: {known: true},
    },
    incidents: {active: [], attention: []},
    convergence: {state: 'STABLE', waitingFor: [], stale: false, ageSeconds: 0},
    freshness: {configuredCoverageComplete: true, observationCoverageValid: true, projectStatusFresh: true, valid: true},
  };
  return {
    ...base,
    ...overrides,
    observations: {...base.observations, ...(overrides.observations || {})},
    incidents: {...base.incidents, ...(overrides.incidents || {})},
    convergence: {...base.convergence, ...(overrides.convergence || {})},
    freshness: {...base.freshness, ...(overrides.freshness || {})},
  };
}

function assertLegal(explained) {
  assert.equal(explained.blocked, true);
  assert.equal(typeof explained.nextAction, 'string');
  assert(explained.nextAction.length > 0);
  assert.equal(FORBIDDEN_ACTION_RE.test(explained.nextAction), false, `forbidden remediation emitted: ${explained.nextAction}`);
  assert.equal(Array.isArray(explained.nextAction), false, 'exactly one action must be a scalar string');
  assert.equal(isRepositoryNextAction(explained.nextAction), true, `action must come from repository vocabulary: ${explained.nextAction}`);
}

(() => {
  assert.equal(nextActionForBlock({blockingClass: 'INCIDENT', reasonCode: 'REQUIRED_CHECK_FAILED'}), NEXT_ACTIONS.REVIEW_REQUIRED_CHECK_FAILURE);
  assert.equal(nextActionForBlock({blockingClass: 'INCIDENT', reasonCode: 'RELEASE_AUTHORITY_IDENTITY_MISMATCH'}), NEXT_ACTIONS.REVIEW_PRODUCTION_AUTHORITY_MISMATCH);
  assert.equal(nextActionForBlock({blockingClass: 'ATTENTION', reasonCode: 'ADMINISTRATION_WRITE_UNAVAILABLE'}), NEXT_ACTIONS.OPEN_ADMIN_CAPABILITY_REVIEW);
  assert.equal(nextActionForBlock({blockingClass: 'ATTENTION', reasonCode: 'DEFERRED_COOLDOWN'}), NEXT_ACTIONS.RECHECK_AFTER_COOLDOWN);
  assert.equal(nextActionForBlock({blockingClass: 'ATTENTION', reasonCode: 'PACKET_SCOPE_OVERLAP'}), NEXT_ACTIONS.RESOLVE_PACKET_SCOPE_OVERLAP);
  assert.equal(nextActionForBlock({blockingClass: 'INCIDENT', reasonCode: 'UNMAPPED_FAILURE'}), NEXT_ACTIONS.REVIEW_CURRENT_INCIDENT);
  assert.equal(nextActionForBlock({blockingClass: 'ATTENTION', reasonCode: 'UNMAPPED_ATTENTION'}), NEXT_ACTIONS.REVIEW_CURRENT_ATTENTION);
  assert.equal(nextActionForBlock({blockingClass: 'UNKNOWN', reasonCode: 'EVIDENCE_UNKNOWN'}), NEXT_ACTIONS.WAIT_FOR_CURRENT_EVIDENCE);

  const p1Issue = incidentIssue(502, 'REQUIRED_CHECK_FAILED', ['scope:repo', 'plugin:simcore']);
  const p1Row = {severity: 'P1', state: 'OPEN', issue: p1Issue};
  const p0Row = {severity: 'P0', state: 'OPEN', reasonCode: 'AUTHORITY_INTEGRITY_FAILED', issue: incidentIssue(700, 'AUTHORITY_INTEGRITY_FAILED')};
  const attentionRow = {severity: 'P2', state: 'OPEN', reasonCode: 'UNSTABLE_COMPONENT', issue: {...incidentIssue(437, 'PROTECTION_GUARD_FAILED', ['scope:repo']), labels: [{name: 'scope:repo'}]}};

  assert.equal(reasonCodeFromIncident(p1Row, 'INCIDENT'), 'REQUIRED_CHECK_FAILED', 'reason must be recovered from normalized incident evidence when row lacks reasonCode');
  assert.equal(ownerFromIssue(p1Issue), 'plugin:simcore', 'specific project scope must outrank generic scope:repo ownership');
  assert.equal(ownerFromIssue({labels: []}), 'scope:repo', 'missing scope falls back to canonical-main owner');

  const prioritySnapshot = snapshot({
    operatorState: 'INCIDENT',
    incidents: {active: [p1Row, p0Row], attention: [attentionRow]},
    convergence: {state: 'SETTLING', waitingFor: ['requiredCi'], stale: true},
    freshness: {valid: false},
  });
  const before = JSON.stringify(prioritySnapshot);
  const highest = explainBlocked(prioritySnapshot);
  assert.equal(JSON.stringify(prioritySnapshot), before, 'why-blocked must be a pure read-only composition');
  assertLegal(highest);
  assert.equal(highest.blockingClass, 'INCIDENT');
  assert.equal(highest.reasonCode, 'AUTHORITY_INTEGRITY_FAILED');
  assert.deepEqual(highest.evidence, ['issue:#700', 'severity:P0']);
  assert.equal(highest.nextAction, 'REVIEW_PRODUCTION_AUTHORITY_MISMATCH');
  assert.equal(highest.owner, 'scope:repo');

  const p1Only = explainBlocked(snapshot({operatorState: 'INCIDENT', incidents: {active: [p1Row]}}));
  assertLegal(p1Only);
  assert.equal(p1Only.reasonCode, 'REQUIRED_CHECK_FAILED');
  assert.deepEqual(p1Only.evidence, ['issue:#502', 'severity:P1']);
  assert.equal(p1Only.nextAction, 'REVIEW_REQUIRED_CHECK_FAILURE');
  assert.equal(p1Only.owner, 'plugin:simcore');
  assert.deepEqual(legacyReason(p1Only), {why: 'REQUIRED_CHECK_FAILED #502', next: 'REVIEW_REQUIRED_CHECK_FAILURE'});
  assert.match(renderWhy(p1Only), /`REQUIRED_CHECK_FAILED` — evidence `issue:#502`, `severity:P1` — owner `plugin:simcore`/);

  const attention = explainBlocked(snapshot({operatorState: 'ATTENTION', incidents: {attention: [attentionRow]}}));
  assertLegal(attention);
  assert.equal(attention.blockingClass, 'ATTENTION');
  assert.equal(attention.reasonCode, 'UNSTABLE_COMPONENT');
  assert.equal(attention.nextAction, 'REVIEW_CURRENT_ATTENTION');
  assert.equal(attention.owner, 'scope:repo');

  const admin = explainBlocked(snapshot({
    operatorState: 'ATTENTION',
    incidents: {attention: [{severity: 'P2', reasonCode: 'ADMINISTRATION_WRITE_UNAVAILABLE', issue: incidentIssue(801, 'ADMINISTRATION_WRITE_UNAVAILABLE')}]},
  }));
  assertLegal(admin);
  assert.equal(admin.nextAction, 'OPEN_ADMIN_CAPABILITY_REVIEW');

  const cooldown = explainBlocked(snapshot({
    operatorState: 'ATTENTION',
    incidents: {attention: [{severity: 'P2', reasonCode: 'DEFERRED_COOLDOWN', issue: incidentIssue(802, 'DEFERRED_COOLDOWN')}]},
  }));
  assertLegal(cooldown);
  assert.equal(cooldown.nextAction, 'RECHECK_AFTER_COOLDOWN');

  const overlap = explainBlocked(snapshot({
    operatorState: 'ATTENTION',
    incidents: {attention: [{severity: 'P2', reasonCode: 'PACKET_SCOPE_OVERLAP', issue: incidentIssue(803, 'PACKET_SCOPE_OVERLAP')}]},
  }));
  assertLegal(overlap);
  assert.equal(overlap.nextAction, 'RESOLVE_PACKET_SCOPE_OVERLAP');

  const stale = explainBlocked(snapshot({
    operatorState: 'ATTENTION',
    incidents: {attention: [{severity: 'P2', reasonCode: 'CONVERGENCE_STALE', issue: {number: 0}}]},
    convergence: {state: 'SETTLING', waitingFor: ['writers', 'requiredCi'], stale: true, ageSeconds: 900},
  }));
  assertLegal(stale);
  assert.equal(stale.blockingClass, 'STALE_CONVERGENCE');
  assert.equal(stale.reasonCode, 'CONVERGENCE_STALE');
  assert.deepEqual(stale.evidence, ['observation:requiredCi', 'observation:writers']);
  assert.equal(stale.nextAction, 'WAIT_FOR_CURRENT_EVIDENCE');
  assert.equal(stale.owner, 'scope:repo');

  const settling = explainBlocked(snapshot({
    operatorState: 'CLEAR',
    convergence: {state: 'SETTLING', waitingFor: ['requiredCi'], stale: false, ageSeconds: 30},
  }));
  assertLegal(settling);
  assert.equal(settling.blockingClass, 'SETTLING');
  assert.equal(settling.reasonCode, 'EVIDENCE_SETTLING');
  assert.deepEqual(settling.evidence, ['observation:requiredCi']);
  assert.equal(settling.nextAction, 'WAIT_FOR_CURRENT_EVIDENCE');

  const unknownSnapshot = snapshot({
    operatorState: 'UNKNOWN',
    observations: {zeta: {known: false}, alpha: {known: false}, beta: {known: false}, gamma: {known: false}, delta: {known: false}},
    freshness: {configuredCoverageComplete: false, observationCoverageValid: false, projectStatusFresh: false, valid: false},
  });
  assert.deepEqual(unknownEvidenceIds(unknownSnapshot), ['freshness:adapterCoverage', 'freshness:projectStatus', 'freshness:requiredCoverage', 'observation:alpha'], 'unknown evidence must be deterministic and bounded');
  const unknown = explainBlocked(unknownSnapshot);
  assertLegal(unknown);
  assert.equal(unknown.blockingClass, 'UNKNOWN');
  assert.equal(unknown.reasonCode, 'EVIDENCE_UNKNOWN');
  assert.equal(unknown.nextAction, 'WAIT_FOR_CURRENT_EVIDENCE');
  assert.equal(unknown.owner, 'scope:repo');
  assert.equal(unknown.evidence.length, 4);

  const clear = explainBlocked(snapshot());
  assert.equal(clear.blocked, false);
  assert.equal(clear.reasonCode, 'NONE');
  assert.equal(clear.nextAction, null);
  assert.equal(clear.owner, null);
  assert.deepEqual(legacyReason(clear), {why: 'NONE', next: null});

  for (const explained of [highest, p1Only, attention, admin, cooldown, overlap, stale, settling, unknown]) {
    assert.equal(FORBIDDEN_ACTION_RE.test(`${explained.reasonCode} ${explained.nextAction}`), false);
    assert.equal(isRepositoryNextAction(explained.nextAction), true);
  }

  console.log('CANONICAL_MAIN_WHY_BLOCKED_CONTRACT:OK');
})();
