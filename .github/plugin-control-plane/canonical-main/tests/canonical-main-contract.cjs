'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  loadPolicy,
  validateDescriptor,
  validateEvent,
  correlationKey,
  severityFor,
  applyIncident,
  deriveOperatorState,
} = require('../contract.cjs');
const {
  repositoryBindingErrors,
  renderGuidelines,
} = require('../bootstrap.cjs');
const {latestRelevantRun} = require('../adapters.cjs');

const root = path.resolve(__dirname, '../../../..');
const policy = loadPolicy();
const examplePath = path.join(__dirname, '../examples/voyage-token-check.check-only.json');
const example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
const registeredPath = path.join(__dirname, '../descriptors/voyage-token-check.json');
const registered = JSON.parse(fs.readFileSync(registeredPath, 'utf8'));

assert.equal(policy.schemaVersion, 1);
assert.equal(policy.operations.eventAdaptersComplete, true, 'Phase B activation requires proven adapter coverage');
assert.equal(policy.adapters.observationEpoch, '2026-08-24T20:37:22Z');
assert.deepEqual(validateDescriptor(example, policy), []);
assert.deepEqual(repositoryBindingErrors(example, root), []);
assert.deepEqual(validateDescriptor(registered, policy), []);
assert.deepEqual(repositoryBindingErrors(registered, root), []);

const rendered = renderGuidelines(example, 'hanmiyoo10-alt/-');
assert.match(rendered, /^# Voyage Token Check — Development & Operations Guidelines/m);
assert.match(rendered, /Canonical repository: `hanmiyoo10-alt\/-`/);
assert.match(rendered, /<!-- PLUGIN_RELEASE_STATE_START -->/);
assert.match(rendered, /<!-- PLUGIN_RELEASE_STATE_END -->/);
assert.match(rendered, /- Product: `UNKNOWN`/);
assert.match(rendered, /Source: `voyage-token-check\/DESIGN_STATUS\.md`/);

const invalidDescriptor = JSON.parse(JSON.stringify(example));
invalidDescriptor.guidelines = '../escape.md';
assert(validateDescriptor(invalidDescriptor, policy).some((row) => row.includes('guidelines')));

function event(overrides = {}) {
  return {
    schemaVersion: 1,
    eventId: 'event-1',
    eventClass: 'REQUIRED_CI',
    subject: {kind: 'pull_request', number: 123},
    scope: ['scope:repo', 'plugin:simcore'],
    authority: {kind: 'required-check', identity: 'sha:abc'},
    observation: {from: 'PASS', to: 'FAIL', reasonCode: 'REQUIRED_CHECK_FAILED'},
    disposition: 'FEEDBACK_CANDIDATE',
    evidence: ['run:1', 'sha:abc'],
    ...overrides,
  };
}

assert.deepEqual(validateEvent(event(), policy), []);
assert.equal(
  correlationKey(event()),
  'REQUIRED_CI|plugin:simcore,scope:repo|pull_request:123|required-check:sha:abc|REQUIRED_CHECK_FAILED',
);
assert.equal(correlationKey(event({scope: ['plugin:simcore', 'scope:repo']})), correlationKey(event()), 'scope ordering must not change correlation');
assert.equal(severityFor(event()), 'P1');
assert.equal(severityFor(event(), {REQUIRED_CHECK_FAILED: 'P2'}), 'P2');

const p0 = event({
  eventClass: 'MAIN_WRITE',
  observation: {from: 'RETRYING', to: 'FAILED', reasonCode: 'MAIN_WRITE_RETRY_EXHAUSTED'},
  authority: {kind: 'main', identity: 'sha:def'},
  disposition: 'ESCALATION_CANDIDATE',
});
assert.equal(severityFor(p0, {MAIN_WRITE_RETRY_EXHAUSTED: 'P3'}), 'P0', 'project override must not downgrade P0');

const opened = applyIncident(null, event());
assert.equal(opened.state, 'OPEN');
assert.equal(opened.severity, 'P1');
const duplicate = applyIncident(opened, event());
assert.strictEqual(duplicate, opened, 'identical event must be idempotent');
const recovered = applyIncident(opened, event({
  eventId: 'event-2',
  observation: {from: 'FAIL', to: 'PASS', reasonCode: 'REQUIRED_CHECK_FAILED'},
  disposition: 'RECOVERY_FEEDBACK_CANDIDATE',
}));
assert.equal(recovered.state, 'RECOVERED');

assert.equal(deriveOperatorState({freshnessValid: false}), 'UNKNOWN');
assert.equal(deriveOperatorState({freshnessValid: true, incidents: [{state: 'OPEN', severity: 'P0'}]}), 'INCIDENT');
assert.equal(deriveOperatorState({freshnessValid: true, incidents: [{state: 'OPEN', severity: 'P1'}]}), 'INCIDENT');
assert.equal(deriveOperatorState({freshnessValid: true, incidents: [{state: 'OPEN', severity: 'P2'}]}), 'ATTENTION');
assert.equal(deriveOperatorState({freshnessValid: true, incidents: []}), 'CLEAR');

const historical = {id: 1, event: 'workflow_dispatch', conclusion: 'failure', created_at: '2026-08-24T16:12:53Z'};
const current = {id: 2, event: 'workflow_dispatch', conclusion: 'success', created_at: '2026-08-24T20:38:00Z'};
assert.equal(latestRelevantRun([historical], ['workflow_dispatch'], policy.adapters.observationEpoch), undefined, 'pre-adapter historical failures must not open new incidents');
assert.equal(latestRelevantRun([historical, current], ['workflow_dispatch'], policy.adapters.observationEpoch).id, 2);

const workflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-ops.yml'), 'utf8');
assert.match(workflow, /schedule:/);
assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /workflow_run:/);
assert.match(workflow, /SimCore CI/);
assert.match(workflow, /SimCore release state sync/);
assert.match(workflow, /SimCore Permanent Release/);
assert.match(workflow, /Usage Dashboard Project Memory/);
assert.match(workflow, /contents:\s*read/);
assert.match(workflow, /actions:\s*read/);
assert.match(workflow, /issues:\s*write/);
assert.match(workflow, /ref:\s*main/);
assert.match(workflow, /persist-credentials:\s*false/);
assert.match(workflow, /ops-controller\.cjs refresh/);
assert.doesNotMatch(workflow, /(?:^|\n)\s*pull_request(?:_target)?:/);
assert.doesNotMatch(workflow, /contents:\s*write/);
assert.doesNotMatch(workflow, /git\s+push/);

const workflowDir = path.join(root, '.github/workflows');
const directWriterFiles = fs.readdirSync(workflowDir)
  .filter((name) => /\.ya?ml$/.test(name))
  .filter((name) => fs.readFileSync(path.join(workflowDir, name), 'utf8').includes('scripts/repo-main-write.py'))
  .sort();
assert.deepEqual(directWriterFiles, policy.adapters.writerInventory.map((row) => row.workflow).sort(), 'every direct repo-main-write workflow must be classified');

const adapter = fs.readFileSync(path.join(__dirname, '../adapters.cjs'), 'utf8');
assert.match(adapter, /observeRequiredCi/);
assert.match(adapter, /observeProductionAuthority/);
assert.match(adapter, /observationEpoch/);
assert.match(adapter, /MAIN_WRITE_RETRY_EXHAUSTED/);
assert.match(adapter, /MAIN_WRITE_CONTENT_CONFLICT/);
assert.match(adapter, /MEMORY_SYNC_PATH_ESCAPE/);

const controller = fs.readFileSync(path.join(__dirname, '../ops-controller.cjs'), 'utf8');
assert.match(controller, /eventAdaptersComplete/);
assert.match(controller, /observeAll/);
assert.match(controller, /reconcileIncidentEvents/);
assert.match(controller, /canonical-main-correlation/);
assert.match(controller, /Current adapter observations valid/);
assert.match(controller, /LEGACY\/UNREGISTERED_FOR_STANDARD/);
assert.doesNotMatch(controller, /git\s+push/);

console.log('CANONICAL_MAIN_AUTOMATION_CONTRACTS:OK');
