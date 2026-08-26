'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  loadPolicy,
  validateEvent,
  correlationKey,
} = require('../contract.cjs');
const {buildAlertEnvelope} = require('../notification.cjs');
const {
  rehearsalConfig,
  REHEARSAL_ID,
  REASON_CODE,
  markerForKey,
  markerForEvent,
  proofMarker,
  buildRehearsalEvent,
  renderIncidentBody,
  client,
  rehearsalState,
  cycle,
} = require('../rehearsal.cjs');

const root = path.resolve(__dirname, '../../../..');
const policy = loadPolicy();
const sha = '1234567890abcdef1234567890abcdef12345678';

assert.equal(policy.rehearsal, undefined, 'completed rehearsal identity must stay outside active runtime policy');
assert.equal(policy.alerts.defaultSeverity.CANONICAL_MAIN_REHEARSAL, undefined, 'rehearsal-only severity must stay outside active runtime policy');
assert.equal(rehearsalConfig.enabled, true);
assert.equal(rehearsalConfig.id, 'phase-h-v1');
assert.equal(rehearsalConfig.reasonCode, 'CANONICAL_MAIN_REHEARSAL');
assert.equal(rehearsalConfig.severity, 'P1');
assert.equal(rehearsalConfig.trackingIssue, 330);
assert.equal(rehearsalConfig.autoTriggerMarker, '[phase-h-rehearsal]');
assert.equal(rehearsalConfig.productionMutation, false);
assert.equal(rehearsalConfig.releaseMutation, false);
assert.equal(REHEARSAL_ID, rehearsalConfig.id);
assert.equal(REASON_CODE, rehearsalConfig.reasonCode);

const opened = buildRehearsalEvent('OPEN', sha);
const recovered = buildRehearsalEvent('RECOVERED', sha);
assert.deepEqual(validateEvent(opened, policy), []);
assert.deepEqual(validateEvent(recovered, policy), []);
assert.equal(opened.disposition, 'FEEDBACK_CANDIDATE');
assert.equal(recovered.disposition, 'RECOVERY_FEEDBACK_CANDIDATE');
assert.equal(opened.observation.from, 'CLEAR');
assert.equal(opened.observation.to, 'INCIDENT');
assert.equal(recovered.observation.from, 'INCIDENT');
assert.equal(recovered.observation.to, 'CLEAR');
assert.equal(correlationKey(opened), correlationKey(recovered), 'OPEN and RECOVERED must reuse one correlation key');
assert.notEqual(opened.eventId, recovered.eventId, 'OPEN and RECOVERED need distinct event identities');
assert.match(opened.summary, /Synthetic canonical-main rehearsal incident/);
assert.match(recovered.summary, /rehearsal recovered/);

const key = correlationKey(opened);
const openEnvelope = buildAlertEnvelope({event: opened, severity: rehearsalConfig.severity, transition: 'OPEN', correlationKey: key, previousState: 'NONE'});
assert.equal(openEnvelope.eligible, true, 'first rehearsal OPEN must enter the P1 notification outbox');
const duplicateOpenEnvelope = buildAlertEnvelope({event: opened, severity: rehearsalConfig.severity, transition: 'OPEN', correlationKey: key, previousState: 'OPEN'});
assert.equal(duplicateOpenEnvelope.eligible, false, 'unchanged rehearsal OPEN must not create another notification candidate');
const recoveryEnvelope = buildAlertEnvelope({event: recovered, severity: rehearsalConfig.severity, transition: 'RECOVERED', correlationKey: key, previousState: 'OPEN'});
assert.equal(recoveryEnvelope.eligible, true, 'rehearsal recovery must enter the P1 notification outbox');
assert.notEqual(openEnvelope.deliveryKey, recoveryEnvelope.deliveryKey);

const openBody = renderIncidentBody(opened, rehearsalConfig.severity, 'OPEN', key, openEnvelope);
assert.match(openBody, /Synthetic rehearsal record/);
assert.match(openBody, /does not assert a real outage/);
assert.match(openBody, /Synthetic rehearsal: `true`/);
assert.match(openBody, /Notification eligible: `true`/);
assert(openBody.includes(markerForKey(key)));
assert(openBody.includes(markerForEvent(opened.eventId)));
assert.match(openBody, /canonical-main-alert-envelope:/);

const openIssue = {number: 901, state: 'open', labels: ['incident:open', 'severity:P1', 'control-plane:incident'], body: openBody};
assert.equal(rehearsalState([openIssue], sha).state, 'OPEN', 'same-main partial OPEN must be resumable');

const recoveredBody = `${renderIncidentBody(recovered, rehearsalConfig.severity, 'RECOVERED', key, recoveryEnvelope)}\n${proofMarker(sha)}`;
const recoveredIssue = {number: 901, state: 'closed', labels: ['incident:recovered', 'severity:P1', 'control-plane:incident'], body: recoveredBody};
assert.equal(rehearsalState([recoveredIssue], sha).state, 'PROVEN', 'exact-main recovery proof must make later triggers no-op');
assert.notEqual(rehearsalState([recoveredIssue], 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa').state, 'PROVEN', 'proof marker must be exact-main scoped');
assert.equal(rehearsalState([], sha).state, 'NONE');

const workflowPath = path.join(root, '.github/workflows/canonical-main-rehearsal.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
assert.match(workflow, /^name: Canonical Main Incident Rehearsal/m);
assert.match(workflow, /workflow_run:/);
assert.match(workflow, /Canonical Main Protection Guard/);
assert.doesNotMatch(workflow, /workflows:\s*\n\s*- Canonical Main Operations/, 'rehearsal must wait until Required-driven protection convergence completes');
assert.match(workflow, /conclusion == 'success'/);
assert.match(workflow, /head_branch == 'main'/);
assert.match(workflow, /\[phase-h-rehearsal\]/);
assert.doesNotMatch(workflow, /event == 'push'/, 'activation must survive canonical-ops push-run cancellation/supersession');
assert.match(workflow, /canonical-main-incident-rehearsal-\$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
assert.match(workflow, /cancel-in-progress:\s*false/);
assert.match(workflow, /ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
assert.match(workflow, /EXPECTED_MAIN_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
assert.match(workflow, /contents:\s*read/);
assert.match(workflow, /actions:\s*read/);
assert.match(workflow, /issues:\s*write/);
assert.match(workflow, /persist-credentials:\s*false/);
assert.match(workflow, /rehearsal\.cjs cycle/);
assert.doesNotMatch(workflow, /contents:\s*write/);
assert.doesNotMatch(workflow, /pull_request_target|pull_request:/);
assert.doesNotMatch(workflow, /git\s+push/);

const source = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/rehearsal.cjs'), 'utf8');
const cycleSource = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/rehearsal/cycle.cjs'), 'utf8');
assert.match(source, /rehearsal endpoint denied/);
assert.match(source, /repeated\.touched/);
assert.match(source, /same correlation-key issue/);
assert.match(source, /Production authority observation: MATCH/);
assert.match(source, /Coverage: `COMPLETE`/);
assert.match(source, /Legacy\/unregistered scopes: none/);
assert.match(source, /runSurface\('ops-controller\.cjs'/);
assert.match(source, /runSurface\('protected-main-surface\.cjs'/);
assert.match(source, /runSurface\('bootstrap-surface\.cjs'/);
assert.match(source, /CANONICAL_MAIN_REHEARSAL:PASS/);
assert.match(source, /CANONICAL_MAIN_REHEARSAL:ALREADY_PROVEN/);
assert.match(source, /proofMarker\(mainSha\)/);
assert.match(cycleSource, /CANONICAL_MAIN_REHEARSAL:STALE_MAIN_SKIP/);
assert.match(cycleSource, /recoverStaleRehearsal/);
assert.match(cycleSource, /skipIfMainMoved/);
assert.doesNotMatch(source, /\/contents(?:\/|\?)/);
assert.doesNotMatch(source, /\/git\/refs/);
assert.doesNotMatch(source, /\/releases(?:\/|\?)/);
assert.doesNotMatch(source, /git\s+push/);

(async () => {
  const apiClient = client({
    token: 'test-token',
    repo: 'hanmiyoo10-alt/-',
    fetchImpl: async () => { throw new Error('network should not be reached for denied endpoint'); },
  });
  await assert.rejects(
    () => apiClient.request('/contents/product-manifest.json', {method: 'PUT'}),
    /rehearsal endpoint denied/,
  );
  await assert.rejects(
    () => apiClient.request('/git/refs/heads/main', {method: 'PATCH'}),
    /rehearsal endpoint denied/,
  );

  const staleSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const staleResult = await cycle({
    token: 'test-token',
    repo: 'hanmiyoo10-alt/-',
    expectedMainSha: sha,
    fetchImpl: async (url, options = {}) => {
      if (url.endsWith('/branches/main')) {
        return {ok: true, status: 200, text: async () => '', json: async () => ({commit: {sha: staleSha}})};
      }
      if (url.includes('/issues?state=all&per_page=100&page=1')) {
        return {ok: true, status: 200, text: async () => '', json: async () => []};
      }
      throw new Error(`unexpected stale-main test request: ${options.method || 'GET'} ${url}`);
    },
  });
  assert.equal(staleResult.skippedStale, true, 'stale exact-main rehearsal must terminate successfully instead of creating a synthetic failure');
  assert.equal(staleResult.observedMainSha, staleSha);
  assert.equal(staleResult.issueNumber, null);

  console.log('CANONICAL_MAIN_REHEARSAL_CONTRACT:OK');
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
