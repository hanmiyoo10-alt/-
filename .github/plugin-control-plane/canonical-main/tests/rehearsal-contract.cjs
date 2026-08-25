'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  loadPolicy,
  validateEvent,
  correlationKey,
  severityFor,
} = require('../contract.cjs');
const {buildAlertEnvelope} = require('../notification.cjs');
const {
  REHEARSAL_ID,
  REASON_CODE,
  markerForKey,
  markerForEvent,
  buildRehearsalEvent,
  renderIncidentBody,
  client,
} = require('../rehearsal.cjs');

const root = path.resolve(__dirname, '../../../..');
const policy = loadPolicy();
const sha = '1234567890abcdef1234567890abcdef12345678';

assert.equal(policy.rehearsal.enabled, true);
assert.equal(policy.rehearsal.id, 'phase-h-v1');
assert.equal(policy.rehearsal.reasonCode, 'CANONICAL_MAIN_REHEARSAL');
assert.equal(policy.rehearsal.severity, 'P1');
assert.equal(policy.rehearsal.trackingIssue, 330);
assert.equal(policy.rehearsal.autoTriggerMarker, '[phase-h-rehearsal]');
assert.equal(policy.rehearsal.productionMutation, false);
assert.equal(policy.rehearsal.releaseMutation, false);
assert.equal(policy.alerts.defaultSeverity.CANONICAL_MAIN_REHEARSAL, 'P1');
assert.equal(REHEARSAL_ID, policy.rehearsal.id);
assert.equal(REASON_CODE, policy.rehearsal.reasonCode);

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
assert.equal(severityFor(opened), 'P1');
assert.equal(severityFor(recovered), 'P1');
assert.equal(correlationKey(opened), correlationKey(recovered), 'OPEN and RECOVERED must reuse one correlation key');
assert.notEqual(opened.eventId, recovered.eventId, 'OPEN and RECOVERED need distinct event identities');
assert.match(opened.summary, /Synthetic canonical-main rehearsal incident/);
assert.match(recovered.summary, /rehearsal recovered/);

const key = correlationKey(opened);
const openEnvelope = buildAlertEnvelope({event: opened, severity: 'P1', transition: 'OPEN', correlationKey: key, previousState: 'NONE'});
assert.equal(openEnvelope.eligible, true, 'first rehearsal OPEN must enter the P1 notification outbox');
const duplicateOpenEnvelope = buildAlertEnvelope({event: opened, severity: 'P1', transition: 'OPEN', correlationKey: key, previousState: 'OPEN'});
assert.equal(duplicateOpenEnvelope.eligible, false, 'unchanged rehearsal OPEN must not create another notification candidate');
const recoveryEnvelope = buildAlertEnvelope({event: recovered, severity: 'P1', transition: 'RECOVERED', correlationKey: key, previousState: 'OPEN'});
assert.equal(recoveryEnvelope.eligible, true, 'rehearsal recovery must enter the P1 notification outbox');
assert.notEqual(openEnvelope.deliveryKey, recoveryEnvelope.deliveryKey);

const body = renderIncidentBody(opened, 'P1', 'OPEN', key, openEnvelope);
assert.match(body, /Synthetic rehearsal record/);
assert.match(body, /does not assert a real outage/);
assert.match(body, /Synthetic rehearsal: `true`/);
assert.match(body, /Notification eligible: `true`/);
assert(body.includes(markerForKey(key)));
assert(body.includes(markerForEvent(opened.eventId)));
assert.match(body, /canonical-main-alert-envelope:/);

const workflowPath = path.join(root, '.github/workflows/canonical-main-rehearsal.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
assert.match(workflow, /^name: Canonical Main Incident Rehearsal/m);
assert.match(workflow, /workflow_run:/);
assert.match(workflow, /Canonical Main Operations/);
assert.match(workflow, /conclusion == 'success'/);
assert.match(workflow, /event == 'push'/);
assert.match(workflow, /head_branch == 'main'/);
assert.match(workflow, /\[phase-h-rehearsal\]/);
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
assert.match(source, /rehearsal endpoint denied/);
assert.match(source, /repeated\.touched/);
assert.match(source, /same correlation-key issue/);
assert.match(source, /Production authority observation: MATCH/);
assert.match(source, /CANONICAL_MAIN_REHEARSAL:PASS/);
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
  console.log('CANONICAL_MAIN_REHEARSAL_CONTRACT:OK');
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
