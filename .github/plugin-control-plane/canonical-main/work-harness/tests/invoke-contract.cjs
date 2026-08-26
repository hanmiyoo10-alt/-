'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { evaluateWorkSet } = require('../preflight.cjs');
const { loadAdapterRegistry, loadProjectRegistry } = require('../dispatch.cjs');
const { invokeBoundedReadOnly } = require('../invoke.cjs');

const root = path.resolve(__dirname, '../../../../..');
const adapters = loadAdapterRegistry(root);
const projects = loadProjectRegistry(root);

function workRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    workId: 'TEST-INVOKE',
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

let captured = null;
const fake = invokeBoundedReadOnly(simcore, safe, adapters, projects, {
  root,
  spawnSyncImpl(command, args, options) {
    captured = { command, args, options };
    return { status: 0, signal: null, stdout: 'fake pass', stderr: '' };
  },
});
assert.equal(fake.handoff.executionAuthorized, true);
assert.equal(fake.result.status, 'PASS');
assert.equal(fake.result.executed, true);
assert.equal(captured.command, process.execPath);
assert.deepEqual(captured.args, [path.join(root, 'products/simcore/tooling/test.mjs'), '--self-test']);
assert.equal(captured.options.shell, false);
assert.equal(captured.options.cwd, root);

const actual = invokeBoundedReadOnly(simcore, safe, adapters, projects, { root });
assert.equal(actual.handoff.status, 'HANDOFF_EXECUTABLE_READ_ONLY');
assert.equal(actual.result.executed, true);
assert.equal(actual.result.status, 'PASS');
assert.equal(actual.result.exitCode, 0);
assert.match(actual.result.stdout, /harness self-test PASS/);
console.log(`work-harness bounded executor output: ${actual.result.stdout.trim()}`);

const canonical = workRecord({
  workId: 'TEST-MUTATING-NO-INVOKE',
  scopeId: 'canonical-main',
  workType: 'REPO_CONTROL_PLANE',
  requiredCapability: 'CANONICAL_MAIN_OPERATIONS_REFRESH',
});
let mutationSpawned = false;
const blockedMutation = invokeBoundedReadOnly(canonical, evaluateWorkSet([canonical]), adapters, projects, {
  root,
  spawnSyncImpl() {
    mutationSpawned = true;
    throw new Error('must not execute');
  },
});
assert.equal(blockedMutation.handoff.executionAuthorized, false);
assert.equal(blockedMutation.result.executed, false);
assert.equal(blockedMutation.result.status, 'NOT_EXECUTED');
assert.equal(mutationSpawned, false);

let guardedSpawned = false;
const guarded = invokeBoundedReadOnly(simcore, {
  ...safe,
  disposition: 'PARALLEL_GUARDED',
  guards: ['FRESH_REREAD_BEFORE_CLOSE'],
}, adapters, projects, {
  root,
  spawnSyncImpl() {
    guardedSpawned = true;
    throw new Error('must not execute');
  },
});
assert.equal(guarded.handoff.executionAuthorized, false);
assert.equal(guarded.result.executed, false);
assert.equal(guardedSpawned, false);

const source = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/invoke.cjs'), 'utf8');
for (const forbidden of ['workflow_dispatch', 'shell: true', 'execSync(', 'execFileSync(', 'process.argv.slice']) {
  assert.ok(!source.includes(forbidden), `B2 invocation wrapper must not expose unbounded execution: ${forbidden}`);
}

console.log('work-harness invoke-contract: ok');
