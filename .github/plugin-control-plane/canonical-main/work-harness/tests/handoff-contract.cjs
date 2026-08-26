'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { evaluateWorkSet } = require('../preflight.cjs');
const { loadAdapterRegistry, loadProjectRegistry } = require('../dispatch.cjs');
const { planHandoff, stableHash } = require('../handoff.cjs');

const root = path.resolve(__dirname, '../../../../..');
const adapters = loadAdapterRegistry(root);
const projects = loadProjectRegistry(root);

function workRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    workId: 'TEST-HANDOFF',
    objectiveId: 'TEST:B2',
    scopeId: 'simcore',
    sourceIdeaOrDecision: 'test',
    taskState: 'IN_PROGRESS',
    gateState: 'STARTABLE',
    workType: 'PLUGIN_VALIDATION',
    requiredCapability: 'SIMCORE_HARNESS_SELF_TEST',
    readAuthorities: [],
    refreshableReadAuthorities: [],
    writeAuthorities: [],
    protectedSurfaces: [],
    closeSyncSurfaces: [],
    dependsOn: [],
    expectedBases: [{ ref: 'main', mode: 'EXACT', sha: 'e434482', mayAdvance: false }],
    sourceAuthorityRefs: ['issue:#484'],
    stopCondition: 'test only',
    ...overrides,
  };
}

const simcore = workRecord();
const safe = evaluateWorkSet([simcore]);
const executable = planHandoff(simcore, safe, adapters, projects);
assert.equal(executable.status, 'HANDOFF_EXECUTABLE_READ_ONLY');
assert.equal(executable.executionAuthorized, true);
assert.equal(executable.adapterId, 'simcore');
assert.deepEqual(executable.route, {
  capability: 'SIMCORE_HARNESS_SELF_TEST',
  targetKind: 'LOCAL_NODE',
  target: 'products/simcore/tooling/test.mjs',
  fixedArgs: ['--self-test'],
  executionClass: 'READ_ONLY',
  mutationClass: null,
  invokePolicy: 'READ_ONLY_LOCAL',
});
assert.match(executable.handoffHash, /^[0-9a-f]{64}$/);
assert.equal(planHandoff(simcore, safe, adapters, projects).handoffHash, executable.handoffHash);
assert.equal(stableHash({ b: 2, a: 1 }), stableHash({ a: 1, b: 2 }));

const guarded = planHandoff(simcore, {
  ...safe,
  disposition: 'PARALLEL_GUARDED',
  guards: ['FRESH_REREAD_BEFORE_CLOSE'],
  reasonCodes: ['SHARED_CLOSE_SYNC:issue:#465'],
}, adapters, projects);
assert.equal(guarded.status, 'HANDOFF_READY_WITH_GUARDS');
assert.equal(guarded.executionAuthorized, false);
assert.deepEqual(guarded.guards, ['FRESH_REREAD_BEFORE_CLOSE']);

const canonical = workRecord({
  workId: 'TEST-CANONICAL',
  scopeId: 'canonical-main',
  workType: 'REPO_CONTROL_PLANE',
  requiredCapability: 'CANONICAL_MAIN_OPERATIONS_REFRESH',
});
const canonicalHandoff = planHandoff(canonical, evaluateWorkSet([canonical]), adapters, projects);
assert.equal(canonicalHandoff.status, 'HANDOFF_READY');
assert.equal(canonicalHandoff.executionAuthorized, false);
assert.equal(canonicalHandoff.route.executionClass, 'MUTATING');
assert.equal(canonicalHandoff.route.invokePolicy, 'HANDOFF_ONLY');

const usage = workRecord({ workId: 'TEST-USAGE', scopeId: 'usage-dashboard', requiredCapability: 'USAGE_DASHBOARD_VALIDATE' });
const usageHandoff = planHandoff(usage, evaluateWorkSet([usage]), adapters, projects);
assert.equal(usageHandoff.status, 'HANDOFF_READY');
assert.equal(usageHandoff.executionAuthorized, false);
assert.equal(usageHandoff.route.targetKind, 'GITHUB_WORKFLOW');
assert.equal(usageHandoff.route.executionClass, 'READ_ONLY');

const undeclaredRegistry = JSON.parse(JSON.stringify(adapters));
const sim = undeclaredRegistry.adapters.find((adapter) => adapter.adapterId === 'simcore');
sim.routes = sim.routes.filter((route) => route.capability !== 'SIMCORE_HARNESS_SELF_TEST');
const undeclared = planHandoff(simcore, safe, undeclaredRegistry, projects);
assert.equal(undeclared.status, 'HANDOFF_BLOCKED');
assert.ok(undeclared.reasonCodes.includes('HANDOFF_ROUTE_UNDECLARED'));

const invalidRegistry = JSON.parse(JSON.stringify(adapters));
const invalidSim = invalidRegistry.adapters.find((adapter) => adapter.adapterId === 'simcore');
invalidSim.routes.push({ ...invalidSim.routes.find((route) => route.capability === 'SIMCORE_HARNESS_SELF_TEST') });
const invalid = planHandoff(simcore, safe, invalidRegistry, projects);
assert.equal(invalid.status, 'HANDOFF_BLOCKED');
assert.ok(invalid.reasonCodes.some((code) => code.includes('CAPABILITY_DUPLICATE:SIMCORE_HARNESS_SELF_TEST')));

const mutatingPolicyViolation = JSON.parse(JSON.stringify(adapters));
const canonicalAdapter = mutatingPolicyViolation.adapters.find((adapter) => adapter.adapterId === 'canonical-main');
canonicalAdapter.routes[0].invokePolicy = 'READ_ONLY_LOCAL';
const badPolicy = planHandoff(canonical, evaluateWorkSet([canonical]), mutatingPolicyViolation, projects);
assert.equal(badPolicy.status, 'HANDOFF_BLOCKED');
assert.ok(badPolicy.reasonCodes.some((code) => code.includes('MUTATING_ROUTE_MUST_BE_HANDOFF_ONLY')));

console.log('work-harness handoff-contract: ok');
