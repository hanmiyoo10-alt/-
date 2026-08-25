'use strict';

const assert = require('assert');
const {renderIncidentBody} = require('../surfaces/incidents.cjs');
const {parseTransitionHistory, eventIdsFromBody, normalizeIncidentBodyState} = require('../surfaces/incident-history.cjs');
const {modulesForPhase, modulesWithCapability, moduleWithCapability} = require('../modules/registry.cjs');
const {repairIncidentConsistency} = require('../orchestrator/refresh.cjs');

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

  const repeated = renderIncidentBody(event('open-2', 'FEEDBACK_CANDIDATE', 'PASS', 'FAIL'), 'P1', 'OPEN', key, null, opened);
  const repeatedHistory = parseTransitionHistory(repeated);
  assert.equal(repeatedHistory.length, 1, 'same-state observations must not inflate transition history');
  assert.deepEqual(eventIdsFromBody(repeated), ['open-1', 'open-2'], 'bounded event history must preserve dedupe evidence');

  const recovered = renderIncidentBody(event('recovered-1', 'RECOVERY_FEEDBACK_CANDIDATE', 'FAIL', 'PASS'), 'P1', 'RECOVERED', key, null, repeated);
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

  console.log('CANONICAL_MAIN_STABILITY_CONTRACT:OK');
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
