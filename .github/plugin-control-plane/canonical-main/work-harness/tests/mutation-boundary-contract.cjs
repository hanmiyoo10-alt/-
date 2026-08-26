'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { loadAdapterRegistry, loadProjectRegistry } = require('../dispatch.cjs');
const { issueCoordinationReceipt } = require('../receipt.cjs');
const { validateMutationBoundary } = require('../mutation-boundary.cjs');
const { invokeBoundedReadOnly } = require('../invoke.cjs');

const root = path.resolve(__dirname, '../../../../..');
const adapters = loadAdapterRegistry(root);
const projects = loadProjectRegistry(root);

function workRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    workId: 'TEST-MUTATION-BOUNDARY',
    objectiveId: 'TEST:B3',
    scopeId: 'canonical-main',
    sourceIdeaOrDecision: 'test',
    taskState: 'IN_PROGRESS',
    gateState: 'STARTABLE',
    workType: 'REPO_CONTROL_PLANE',
    requiredCapability: 'CANONICAL_MAIN_OPERATIONS_REFRESH',
    readAuthorities: [],
    refreshableReadAuthorities: [],
    writeAuthorities: [{ surface: 'issue:#305', role: 'PRIMARY_WRITE' }],
    protectedSurfaces: ['ref:main'],
    closeSyncSurfaces: [],
    dependsOn: [],
    expectedBases: [{ ref: 'main', mode: 'EXACT', sha: 'abc123', mayAdvance: true }],
    sourceAuthorityRefs: ['issue:#487'],
    stopCondition: 'test only',
    ...overrides,
  };
}

const record = workRecord();
const issued = issueCoordinationReceipt(record, [record], { main: 'abc123' }, adapters, projects);
assert.equal(issued.status, 'RECEIPT_ISSUED');

const ready = validateMutationBoundary(record, [record], { main: 'abc123' }, adapters, projects, issued.receipt);
assert.equal(ready.status, 'MUTATION_BOUNDARY_READY');
assert.equal(ready.coordinationReady, true);
assert.equal(ready.mutationAuthorized, false);
assert.equal(ready.executionAuthorized, false);
assert.equal(ready.mutationClass, 'ISSUE_RECONCILIATION');
assert.equal(ready.legalNextAction, 'HANDOFF_TO_EXISTING_MUTATION_AUTHORITY_WITH_VALID_RECEIPT');

const missing = validateMutationBoundary(record, [record], { main: 'abc123' }, adapters, projects, null);
assert.equal(missing.status, 'MUTATION_BOUNDARY_BLOCKED');
assert.equal(missing.coordinationReady, false);
assert.ok(missing.reasonCodes.includes('MUTATION_BOUNDARY_RECEIPT_REQUIRED'));

const stale = validateMutationBoundary(record, [record], { main: 'def456' }, adapters, projects, issued.receipt);
assert.equal(stale.status, 'MUTATION_BOUNDARY_BLOCKED');
assert.ok(stale.reasonCodes.includes('RECEIPT_EXACT_BASE_STALE:main'));

let mutationSpawned = false;
const stillNotInvoked = invokeBoundedReadOnly(record, issued.preflight, adapters, projects, {
  root,
  spawnSyncImpl() {
    mutationSpawned = true;
    throw new Error('B3 must not spawn mutation');
  },
});
assert.equal(stillNotInvoked.handoff.status, 'HANDOFF_READY');
assert.equal(stillNotInvoked.handoff.route.executionClass, 'MUTATING');
assert.equal(stillNotInvoked.handoff.route.invokePolicy, 'HANDOFF_ONLY');
assert.equal(stillNotInvoked.handoff.executionAuthorized, false);
assert.equal(stillNotInvoked.result.executed, false);
assert.equal(mutationSpawned, false);

const readOnly = workRecord({
  workId: 'TEST-READ-ONLY-BOUNDARY', objectiveId: 'TEST:RO', scopeId: 'simcore', workType: 'PLUGIN_VALIDATION',
  requiredCapability: 'SIMCORE_HARNESS_SELF_TEST', writeAuthorities: [], protectedSurfaces: [], sourceAuthorityRefs: ['issue:#487'],
});
const readOnlyReceipt = issueCoordinationReceipt(readOnly, [readOnly], { main: 'abc123' }, adapters, projects);
assert.equal(readOnlyReceipt.status, 'RECEIPT_ISSUED');
const notMutation = validateMutationBoundary(readOnly, [readOnly], { main: 'abc123' }, adapters, projects, readOnlyReceipt.receipt);
assert.equal(notMutation.status, 'MUTATION_BOUNDARY_BLOCKED');
assert.ok(notMutation.reasonCodes.includes('MUTATION_BOUNDARY_EXACT_HANDOFF_REQUIRED'));

console.log('work-harness mutation-boundary-contract: ok');
