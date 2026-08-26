'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { evaluateWorkSet } = require('../preflight.cjs');
const {
  loadAdapterRegistry,
  loadProjectRegistry,
  planDispatch,
  validateAdapterReferences,
  validateAdapterRegistry,
} = require('../dispatch.cjs');

const root = path.resolve(__dirname, '../../../../..');
const adapters = loadAdapterRegistry(root);
const projects = loadProjectRegistry(root);

const validation = validateAdapterRegistry(adapters, projects);
assert.deepEqual(validation, { ok: true, errors: [] });
assert.deepEqual(validateAdapterReferences(adapters, root), { ok: true, errors: [] });
assert.deepEqual(adapters.adapters.map((adapter) => adapter.adapterId).sort(), [
  'canonical-main',
  'simcore',
  'usage-dashboard',
]);

const rawRegistry = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/executor-adapters.json'), 'utf8');
for (const forbidden of ['"releaseBranch"', '"manifest"', '"artifact"', '"releaseSpecDir"', '"authority"']) {
  assert.ok(!rawRegistry.includes(forbidden), `adapter registry duplicates project authority field: ${forbidden}`);
}

function workRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    workId: 'TEST-WORK',
    objectiveId: 'TEST:1',
    scopeId: 'canonical-main',
    sourceIdeaOrDecision: 'test',
    taskState: 'IN_PROGRESS',
    gateState: 'STARTABLE',
    workType: 'REPO_CONTROL_PLANE',
    requiredCapability: 'CANONICAL_MAIN_WORK_HARNESS',
    readAuthorities: [],
    refreshableReadAuthorities: [],
    writeAuthorities: [],
    protectedSurfaces: [],
    closeSyncSurfaces: [],
    dependsOn: [],
    expectedBases: [{ ref: 'main', mode: 'EXACT', sha: '992a0ba', mayAdvance: false }],
    sourceAuthorityRefs: ['issue:#481'],
    stopCondition: 'test only',
    ...overrides,
  };
}

const canonical = workRecord();
const safe = evaluateWorkSet([canonical]);
const ready = planDispatch(canonical, safe, adapters, projects);
assert.equal(ready.status, 'DISPATCH_READY');
assert.equal(ready.adapterId, 'canonical-main');
assert.equal(ready.scopeKind, 'repo');
assert.equal(ready.executionAuthorized, false);
assert.ok(ready.entrypoints.includes('.github/plugin-control-plane/canonical-main/orchestrator/refresh.cjs'));

const guarded = planDispatch(canonical, {
  ...safe,
  disposition: 'PARALLEL_GUARDED',
  guards: ['FRESH_REREAD_BEFORE_CLOSE'],
  reasonCodes: ['SHARED_CLOSE_SYNC:issue:#465'],
}, adapters, projects);
assert.equal(guarded.status, 'DISPATCH_READY_WITH_GUARDS');
assert.deepEqual(guarded.guards, ['FRESH_REREAD_BEFORE_CLOSE']);
assert.equal(guarded.executionAuthorized, false);

const serialized = planDispatch(canonical, {
  ...safe,
  disposition: 'PARALLEL_SERIALIZE_REQUIRED',
  reasonCodes: ['WRITE_WRITE_CONFLICT:ref:main'],
}, adapters, projects);
assert.equal(serialized.status, 'SERIALIZATION_REQUIRED');
assert.equal(serialized.adapterId, null);
assert.equal(serialized.executionAuthorized, false);

const notStartableRecord = workRecord({ gateState: 'NOT_STARTABLE' });
const notStartable = planDispatch(notStartableRecord, evaluateWorkSet([notStartableRecord]), adapters, projects);
assert.equal(notStartable.status, 'NOT_STARTABLE');
assert.equal(notStartable.executionAuthorized, false);

const unsupported = workRecord({ requiredCapability: 'CANONICAL_MAIN_UNKNOWN_CAPABILITY' });
const unsupportedPlan = planDispatch(unsupported, evaluateWorkSet([unsupported]), adapters, projects);
assert.equal(unsupportedPlan.status, 'DISPATCH_BLOCKED');
assert.ok(unsupportedPlan.reasonCodes.includes('CAPABILITY_UNSUPPORTED'));

const unknownScope = workRecord({ scopeId: 'missing-scope' });
const unknownScopePlan = planDispatch(unknownScope, evaluateWorkSet([unknownScope]), adapters, projects);
assert.equal(unknownScopePlan.status, 'DISPATCH_BLOCKED');
assert.ok(unknownScopePlan.reasonCodes.includes('SCOPE_UNRESOLVED'));

for (const [scopeId, requiredCapability, expectedAdapter] of [
  ['simcore', 'SIMCORE_VALIDATE', 'simcore'],
  ['usage-dashboard', 'USAGE_DASHBOARD_RELEASE', 'usage-dashboard'],
]) {
  const record = workRecord({ scopeId, requiredCapability, workId: `TEST-${expectedAdapter}` });
  const plan = planDispatch(record, evaluateWorkSet([record]), adapters, projects);
  assert.equal(plan.status, 'DISPATCH_READY');
  assert.equal(plan.adapterId, expectedAdapter);
  assert.equal(plan.executionAuthorized, false);
}

const ambiguousRegistry = JSON.parse(JSON.stringify(adapters));
ambiguousRegistry.adapters.push({
  ...JSON.parse(JSON.stringify(adapters.adapters.find((adapter) => adapter.adapterId === 'canonical-main'))),
  adapterId: 'canonical-main-shadow-copy',
});
const ambiguous = planDispatch(canonical, safe, ambiguousRegistry, projects);
assert.equal(ambiguous.status, 'DISPATCH_BLOCKED');
assert.ok(ambiguous.reasonCodes.includes('ADAPTER_AMBIGUOUS'));

const invalidRegistry = JSON.parse(JSON.stringify(adapters));
invalidRegistry.adapters[0].authority = { releaseBranch: 'forbidden-copy' };
const invalid = planDispatch(canonical, safe, invalidRegistry, projects);
assert.equal(invalid.status, 'DISPATCH_BLOCKED');
assert.ok(invalid.reasonCodes.some((code) => code.includes('FIELD_NOT_ALLOWED:authority')));

const source = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/dispatch.cjs'), 'utf8');
for (const forbidden of ["require('node:child_process')", 'spawn(', 'execFile(', 'workflow_dispatch']) {
  assert.ok(!source.includes(forbidden), `B1 planner must remain non-executing: ${forbidden}`);
}

console.log('work-harness dispatch-contract: ok');
