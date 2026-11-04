'use strict';

const assert = require('assert');
const {loadPolicy, deriveOperatorState} = require('../contract.cjs');
const {renderIncidentBody} = require('../surfaces/incidents.cjs');
const {parseTransitionHistory, eventIdsFromBody, normalizeIncidentBodyState} = require('../surfaces/incident-history.cjs');
const {modulesForPhase, modulesWithCapability, moduleWithCapability} = require('../modules/registry.cjs');
const {repairIncidentConsistency} = require('../orchestrator/refresh.cjs');
const {deriveConvergence, convergenceAttention} = require('../domains/convergence.cjs');
const {metricsFromTransitions, metricsMarker, parseIncidentMetrics, unstableAttention} = require('../domains/incident-metrics.cjs');
const {BLOCK_CLASSES, CIRCUIT_BREAKER_STATES, decideCircuitBreaker} = require('../domains/stability.cjs');
const {scanFailedRun, eventClassForReason, recoverableReasons, terminalJobState, observeOne} = require('../observers/writer-workflows.cjs');
const {observe: observeRequiredCi} = require('../observers/required-ci.cjs');
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

  const baseAttempt = {
    action: 'ACTIVATE_NATIVE_PROTECTION',
    target: 'main@abc',
    owner: 'scope:repo',
    reasonCode: 'ADMIN_WRITE_UNAVAILABLE',
    evidenceFingerprint: 'permission:none|sha:abc',
    blockClass: BLOCK_CLASSES.CAPABILITY,
  };
  const firstBlocked = decideCircuitBreaker(baseAttempt);
  assert.equal(firstBlocked.state, CIRCUIT_BREAKER_STATES.BLOCKED_CAPABILITY);
  assert.equal(firstBlocked.allowAttempt, false);
  assert.equal(firstBlocked.deferred, false);

  const repeatedBlocked = decideCircuitBreaker(baseAttempt, firstBlocked);
  assert.equal(repeatedBlocked.state, CIRCUIT_BREAKER_STATES.DEFERRED_COOLDOWN);
  assert.equal(repeatedBlocked.allowAttempt, false);
  assert.equal(repeatedBlocked.deferred, true);

  const changedCapability = decideCircuitBreaker({
    ...baseAttempt,
    blockClass: BLOCK_CLASSES.NONE,
    evidenceFingerprint: 'permission:admin-write|sha:abc',
  }, repeatedBlocked);
  assert.equal(changedCapability.state, CIRCUIT_BREAKER_STATES.REARMED);
  assert.equal(changedCapability.allowAttempt, true);

  const changedTarget = decideCircuitBreaker({
    ...baseAttempt,
    target: 'main@def',
    blockClass: BLOCK_CLASSES.NONE,
    evidenceFingerprint: 'permission:admin-write|sha:def',
  }, repeatedBlocked);
  assert.equal(changedTarget.state, CIRCUIT_BREAKER_STATES.REARMED);
  assert.equal(changedTarget.allowAttempt, true);

  const freshAttempt = decideCircuitBreaker({
    ...baseAttempt,
    reasonCode: 'READY',
    blockClass: BLOCK_CLASSES.NONE,
    evidenceFingerprint: 'ready|sha:abc',
  });
  assert.equal(freshAttempt.state, CIRCUIT_BREAKER_STATES.ARMED);
  assert.equal(freshAttempt.allowAttempt, true);

  const staleAttempt = {
    ...baseAttempt,
    reasonCode: 'TARGET_NOT_CURRENT',
    blockClass: BLOCK_CLASSES.STALE_TARGET,
    evidenceFingerprint: 'target:abc|current:def',
  };
  const stale = decideCircuitBreaker(staleAttempt);
  assert.equal(stale.state, CIRCUIT_BREAKER_STATES.STALE_TARGET);
  assert.equal(stale.allowAttempt, false);
  assert.equal(stale.neutral, true);
  const repeatedStale = decideCircuitBreaker(staleAttempt, stale);
  assert.equal(repeatedStale.state, CIRCUIT_BREAKER_STATES.DEFERRED_COOLDOWN);
  assert.equal(repeatedStale.neutral, true);

  const criticalBlocked = decideCircuitBreaker({...baseAttempt, severity: 'P1'}, firstBlocked);
  assert.equal(criticalBlocked.state, CIRCUIT_BREAKER_STATES.BLOCKED_CAPABILITY);
  assert.equal(criticalBlocked.deferred, false, 'current P0/P1 class failures must never be cooled down');
  const criticalStale = decideCircuitBreaker({...staleAttempt, severity: 'P0'}, stale);
  assert.equal(criticalStale.state, CIRCUIT_BREAKER_STATES.STALE_TARGET);
  assert.equal(criticalStale.deferred, false, 'current P0/P1 stale evidence must remain explicit, never cooldown-hidden');

  assert.equal(eventClassForReason('PROTECTION_GUARD_FAILED'), 'CONTROL_PLANE');
  assert.equal(eventClassForReason('MEMORY_SYNC_FAILED'), 'DURABLE_MEMORY_SYNC');
  assert.equal(eventClassForReason('MAIN_WRITE_CONTENT_CONFLICT'), 'MAIN_WRITE');
  const earlyTerminalWriter = policy.adapters.writerWorkflows.find((row) => row.id === 'canonical-main-protection-guard');
  assert.equal(earlyTerminalWriter.allowTerminalJobsBeforeRunComplete, true);
  assert.equal(policy.adapters.writerWorkflows.filter((row) => row.allowTerminalJobsBeforeRunComplete === true).length, 1);
  const guard = {id: 'canonical-main-protection-guard', workflow: 'canonical-main-protection-guard.yml', failureReason: 'PROTECTION_GUARD_FAILED'};
  assert(recoverableReasons(guard).includes('PROTECTION_GUARD_FAILED'));
  assert(!recoverableReasons(guard).includes('MEMORY_SYNC_FAILED'));
  const emptyLogContext = {actions: {workflowJobs: async () => [{id: 1, conclusion: 'failure'}], jobLogText: async () => 'terminal guard failure'}};
  assert.equal(await scanFailedRun(emptyLogContext, {id: 9}, guard), 'PROTECTION_GUARD_FAILED');
  const conflictContext = {actions: {workflowJobs: async () => [{id: 1, conclusion: 'failure'}], jobLogText: async () => 'MAIN_WRITE_CONTENT_CONFLICT'}};
  assert.equal(await scanFailedRun(conflictContext, {id: 10}, guard), 'MAIN_WRITE_CONTENT_CONFLICT', 'specific main-write evidence outranks domain fallback');

  assert.deepEqual(
    terminalJobState([{status: 'completed', conclusion: 'success'}, {status: 'completed', conclusion: 'skipped'}]),
    {terminal: true, passing: true},
  );
  assert.deepEqual(
    terminalJobState([{status: 'completed', conclusion: 'success'}, {status: 'in_progress', conclusion: null}]),
    {terminal: false, passing: false},
  );

  const requiredMain = 'a'.repeat(40);
  const requiredContext = {
    policy,
    mainSha: requiredMain,
    actions: {
      workflowRunsForPushHead: async () => [{
        id: 77, head_sha: requiredMain, event: 'push',
        status: 'in_progress', conclusion: null, run_attempt: 1,
      }],
      workflowJobs: async () => [{
        id: 700, name: policy.adapters.requiredCi.requiredJob,
        status: 'completed', conclusion: 'success',
      }],
    },
  };
  const requiredWhileWrapperPending = await observeRequiredCi(requiredContext);
  assert.equal(requiredWhileWrapperPending.known, true);
  assert.equal(requiredWhileWrapperPending.passing, true);
  assert.match(requiredWhileWrapperPending.summary, /^PASS — run 77$/);

  const requiredStillRunning = await observeRequiredCi({
    ...requiredContext,
    actions: {
      ...requiredContext.actions,
      workflowJobs: async () => [{
        id: 701, name: policy.adapters.requiredCi.requiredJob,
        status: 'in_progress', conclusion: null,
      }],
    },
  });
  assert.equal(requiredStillRunning.known, false);
  assert.match(requiredStillRunning.summary, /^PENDING — Required job in run 77$/);

  const writerConfig = {
    id: 'canonical-main-protection-guard',
    workflow: 'canonical-main-protection-guard.yml',
    events: ['workflow_run'],
    scope: ['scope:repo'],
    failureReason: 'PROTECTION_GUARD_FAILED',
    allowTerminalJobsBeforeRunComplete: true,
  };
  const writerPendingWrapper = await observeOne({
    policy,
    actions: {
      workflowRuns: async () => [{
        id: 88, event: 'workflow_run', status: 'in_progress', conclusion: null,
        created_at: '2026-11-04T15:55:00Z', head_sha: requiredMain,
      }],
      workflowJobs: async () => [
        {id: 801, status: 'completed', conclusion: 'success'},
        {id: 802, status: 'completed', conclusion: 'skipped'},
      ],
      jobLogText: async () => '',
    },
  }, writerConfig);
  assert.equal(writerPendingWrapper.known, true);
  assert.equal(writerPendingWrapper.passing, true);

  const writerWithoutOptIn = await observeOne({
    policy,
    actions: {
      workflowRuns: async () => [{
        id: 881, event: 'workflow_run', status: 'in_progress', conclusion: null,
        created_at: '2026-11-04T15:55:00Z', head_sha: requiredMain,
      }],
      workflowJobs: async () => [
        {id: 811, status: 'completed', conclusion: 'success'},
      ],
      jobLogText: async () => '',
    },
  }, {...writerConfig, allowTerminalJobsBeforeRunComplete: false});
  assert.equal(writerWithoutOptIn.known, false);

  const writerJobPending = await observeOne({
    policy,
    actions: {
      workflowRuns: async () => [{
        id: 89, event: 'workflow_run', status: 'in_progress', conclusion: null,
        created_at: '2026-11-04T15:55:00Z', head_sha: requiredMain,
      }],
      workflowJobs: async () => [
        {id: 803, status: 'completed', conclusion: 'success'},
        {id: 804, status: 'queued', conclusion: null},
      ],
      jobLogText: async () => '',
    },
  }, writerConfig);
  assert.equal(writerJobPending.known, false);

  const stableObservations = {requiredCi: {known: true}, productionAuthority: {known: true}, writers: {known: true}, bootstrap: {known: true}};
  assert.deepEqual(deriveConvergence(stableObservations, policy, Date.parse('2026-08-26T02:10:00Z')), {state: 'STABLE', waitingFor: [], since: null, ageSeconds: 0, stale: false});
  const pendingObservations = {...stableObservations, requiredCi: {known: false, summary: 'PENDING — run 7', data: {run: {created_at: '2026-08-26T02:09:00Z'}}}};
  const settling = deriveConvergence(pendingObservations, policy, Date.parse('2026-08-26T02:10:00Z'));
  assert.equal(settling.state, 'SETTLING');
  assert.equal(settling.stale, false);
  assert.deepEqual(settling.waitingFor, ['requiredCi']);
  assert.equal(settling.ageSeconds, 60);
  const staleConvergence = deriveConvergence(pendingObservations, policy, Date.parse('2026-08-26T02:15:01Z'));
  assert.equal(staleConvergence.state, 'SETTLING');
  assert.equal(staleConvergence.stale, true);
  assert.equal(convergenceAttention(staleConvergence)[0].reasonCode, 'CONVERGENCE_STALE');

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
