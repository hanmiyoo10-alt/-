'use strict';

const assert = require('assert');
const {loadPolicy, deriveOperatorState} = require('../contract.cjs');
const {renderIncidentBody} = require('../surfaces/incidents.cjs');
const {parseTransitionHistory, eventIdsFromBody, normalizeIncidentBodyState} = require('../surfaces/incident-history.cjs');
const {modulesForPhase, modulesWithCapability, moduleWithCapability} = require('../modules/registry.cjs');
const {repairIncidentConsistency} = require('../orchestrator/refresh.cjs');
const {deriveConvergence, convergenceAttention} = require('../domains/convergence.cjs');
const {metricsFromTransitions, metricsMarker, parseIncidentMetrics, unstableAttention} = require('../domains/incident-metrics.cjs');
const {scanFailedRun, eventClassForReason, recoverableReasons} = require('../observers/writer-workflows.cjs');
const {renderSummary} = require('../surfaces/summary.cjs');

const policy = loadPolicy();
function event(eventId, disposition, from, to) {
  return {
    schemaVersion: 1,
    eventId,
    eventClass: 'REQUIRED_CI',
    subject: {kind: 'workflow', id: 'simcore-ci.yml/main/Required'},
    scope: ['scope:repo'],
    authority: {kind: 'main', locator: 'main'},
    observation: {from, to, reasonCode: 'REQUIRED_CHECK_FAILED'},
    disposition,
    evidence: [`run:${eventId}`, 'sha:test'],
    observedAt: '2026-08-26T02:00:00Z',
    summary: disposition === 'RECOVERY_FEEDBACK_CANDIDATE' ? 'Required recovered.' : 'Required failed.',
  };
}

(async () => {
  const key = 'test-correlation';
  const opened = renderIncidentBody(event('open-1', 'FEEDBACK_CANDIDATE', 'PASS', 'FAIL'), 'P1', 'OPEN', key);
  const openHistory = parseTransitionHistory(opened);
  assert.equal(openHistory.length, 1);
  assert.equal(openHistory[0].state, 'OPEN');
  assert.deepEqual(eventIdsFromBody(opened), ['open-1']);
  assert.equal(parseIncidentMetrics(opened).openCount, 1);

  const repeated = renderIncidentBody(event('open-2', 'FEEDBACK_CANDIDATE', 'PASS', 'FAIL'), 'P1', 'OPEN', key, null, opened);
  const repeatedHistory = parseTransitionHistory(repeated);
  assert.equal(repeatedHistory.length, 1, 'same-state observations must not inflate transition history');
  assert.deepEqual(eventIdsFromBody(repeated), ['open-1', 'open-2'], 'bounded event history must preserve dedupe evidence');
  assert.equal(parseIncidentMetrics(repeated).flapCount, 0);

  const recoveredEvent = {...event('recovered-1', 'RECOVERY_FEEDBACK_CANDIDATE', 'FAIL', 'PASS'), observedAt: '2026-08-26T02:01:00Z'};
  const recovered = renderIncidentBody(recoveredEvent, 'P1', 'RECOVERED', key, null, repeated);
  const recoveredHistory = parseTransitionHistory(recovered);
  assert.deepEqual(recoveredHistory.map((row) => row.state), ['OPEN', 'RECOVERED']);
  assert.match(recovered, /## Transition history/);
  assert.match(recovered, /Required failed\./);
  assert.match(recovered, /Required recovered\./);
  assert.deepEqual(eventIdsFromBody(recovered), ['open-1', 'open-2', 'recovered-1']);

  const normalized = normalizeIncidentBodyState(opened, 'RECOVERED');
  assert.match(normalized, /- State: \*\*RECOVERED\*\*/);
  const updates = [];
  const repaired = await repairIncidentConsistency({updateIssue: async (number, patch) => { updates.push({number, patch}); return {number, ...patch}; }}, [{number: 309, state: 'closed', labels: ['control-plane:incident', 'incident:recovered', 'severity:P1'], body: opened}]);
  assert.deepEqual(repaired, [309]);
  assert.equal(updates.length, 1);
  assert.match(updates[0].patch.body, /- State: \*\*RECOVERED\*\*/);
  assert.equal(updates[0].patch.state, 'closed');

  assert.deepEqual(modulesWithCapability('events').map((row) => row.id), ['requiredCi', 'productionAuthority', 'writers', 'bootstrap']);
  assert.deepEqual(modulesWithCapability('requiredCoverage').map((row) => row.id), ['requiredCi', 'productionAuthority', 'writers', 'bootstrap']);
  assert.equal(moduleWithCapability('deliverySurface').id, 'delivery');
  assert.equal(modulesForPhase('post-incidents').length, 1);
  assert.equal(modulesForPhase('post-incidents')[0].id, 'delivery');

  assert.equal(policy.alerts.defaultSeverity.PROTECTION_GUARD_FAILED, 'P1');
  assert.equal(policy.alerts.defaultSeverity.OPS_REFRESH_FAILED, 'P2');
  assert.equal(policy.alerts.defaultSeverity.CONVERGENCE_STALE, 'P2');
  assert.equal(policy.alerts.defaultSeverity.UNSTABLE_COMPONENT, 'P2');
  assert.equal(policy.stability.convergenceBudgetSeconds, 300);
  assert.equal(policy.stability.flapThreshold, 3);
  assert.equal(policy.stability.flapWindowSeconds, 300);
  assert.equal(policy.notifications.externalGithubApp, undefined, 'optional fallback must not remain in active runtime policy');
  assert.equal(policy.notifications.appContract, undefined, 'static fallback contract must not remain in active runtime policy');
  assert.equal(policy.rehearsal, undefined, 'completed rehearsal identity must live outside active runtime policy');

  assert.equal(eventClassForReason('PROTECTION_GUARD_FAILED'), 'CONTROL_PLANE');
  assert.equal(eventClassForReason('MEMORY_SYNC_FAILED'), 'DURABLE_MEMORY_SYNC');
  assert.equal(eventClassForReason('MAIN_WRITE_CONTENT_CONFLICT'), 'MAIN_WRITE');
  const guard = {id: 'canonical-main-protection-guard', workflow: 'canonical-main-protection-guard.yml', failureReason: 'PROTECTION_GUARD_FAILED'};
  assert(recoverableReasons(guard).includes('PROTECTION_GUARD_FAILED'));
  assert(!recoverableReasons(guard).includes('MEMORY_SYNC_FAILED'));
  const emptyLogContext = {actions: {workflowJobs: async () => [{id: 1, conclusion: 'failure'}], jobLogText: async () => 'terminal guard failure'}};
  assert.equal(await scanFailedRun(emptyLogContext, {id: 9}, guard), 'PROTECTION_GUARD_FAILED');
  const conflictContext = {actions: {workflowJobs: async () => [{id: 1, conclusion: 'failure'}], jobLogText: async () => 'MAIN_WRITE_CONTENT_CONFLICT'}};
  assert.equal(await scanFailedRun(conflictContext, {id: 10}, guard), 'MAIN_WRITE_CONTENT_CONFLICT', 'specific main-write evidence outranks domain fallback');

  const stableObservations = {requiredCi: {known: true}, productionAuthority: {known: true}, writers: {known: true}, bootstrap: {known: true}};
  assert.deepEqual(deriveConvergence(stableObservations, policy, Date.parse('2026-08-26T02:10:00Z')), {state: 'STABLE', waitingFor: [], since: null, ageSeconds: 0, stale: false});
  const pendingObservations = {...stableObservations, requiredCi: {known: false, summary: 'PENDING — run 7', data: {run: {created_at: '2026-08-26T02:09:00Z'}}}};
  const settling = deriveConvergence(pendingObservations, policy, Date.parse('2026-08-26T02:10:00Z'));
  assert.equal(settling.state, 'SETTLING');
  assert.equal(settling.stale, false);
  assert.deepEqual(settling.waitingFor, ['requiredCi']);
  assert.equal(settling.ageSeconds, 60);
  const stale = deriveConvergence(pendingObservations, policy, Date.parse('2026-08-26T02:15:01Z'));
  assert.equal(stale.state, 'SETTLING');
  assert.equal(stale.stale, true);
  assert.equal(convergenceAttention(stale)[0].reasonCode, 'CONVERGENCE_STALE');

  const flapTransitions = [
    {state: 'OPEN', observedAt: '2026-08-26T02:00:00Z'}, {state: 'RECOVERED', observedAt: '2026-08-26T02:01:00Z'},
    {state: 'OPEN', observedAt: '2026-08-26T02:02:00Z'}, {state: 'RECOVERED', observedAt: '2026-08-26T02:03:00Z'},
    {state: 'OPEN', observedAt: '2026-08-26T02:04:00Z'}, {state: 'RECOVERED', observedAt: '2026-08-26T02:05:00Z'},
    {state: 'OPEN', observedAt: '2026-08-26T02:06:00Z'},
  ];
  const metrics = metricsFromTransitions(flapTransitions);
  assert.deepEqual({openCount: metrics.openCount, recoveryCount: metrics.recoveryCount, flapCount: metrics.flapCount}, {openCount: 4, recoveryCount: 3, flapCount: 3});
  assert.deepEqual(parseIncidentMetrics(`x\n${metricsMarker(metrics)}`), metrics);
  const recoveredFlappy = {state: 'RECOVERED', severity: 'P1', metrics, issue: {number: 77, title: '[repo-incident:P1] example'}};
  assert.equal(unstableAttention([recoveredFlappy], policy, Date.parse('2026-08-26T02:06:30Z'))[0].reasonCode, 'UNSTABLE_COMPONENT');
  assert.equal(unstableAttention([recoveredFlappy], policy, Date.parse('2026-08-26T02:20:00Z')).length, 0, 'flap attention must age out');

  const snapshot = {
    operatorState: 'UNKNOWN', convergence: settling, observedMainSha: 'a'.repeat(40), observedAt: '2026-08-26T02:10:00Z',
    observations: {requiredCi: {summary: 'PASS — run 7'}, productionAuthority: {summary: 'MATCH — release-simcore abc'}, protection: {data: {state: 'READY_TO_ACTIVATE', protected: false, softEnforcementEnabled: true}}, delivery: {data: {health: 'HEALTHY'}}},
    policy, incidents: {active: [], attention: []},
  };
  const summary = renderSummary(snapshot);
  assert.match(summary, /Operator state: UNKNOWN/);
  assert.match(summary, /Convergence: `SETTLING`/);
  assert.match(summary, /Required: PASS/);
  assert.match(summary, /Production authority: MATCH/);
  assert.match(summary, /Native protection: `READY_TO_ACTIVATE`/);
  assert.match(summary, /Notification bridge: `HEALTHY`/);
  assert.notEqual(deriveOperatorState({freshnessValid: false}), 'SETTLING', 'SETTLING is metadata, never a fifth operator state');

  console.log('CANONICAL_MAIN_STABILITY_CONTRACT:OK');
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
