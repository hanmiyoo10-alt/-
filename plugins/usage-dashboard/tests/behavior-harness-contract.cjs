'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const currentRelease = assertCurrentReleaseArtifacts();
const behaviorTests = [
  'behavior-cli-launcher.cjs',
  'behavior-cache-runtime.cjs',
  'behavior-snapshot-scheduler.cjs',
  'behavior-snapshot-attribution.cjs',
  'behavior-organization-capture.cjs',
  'behavior-cache-observer.cjs',
  'behavior-state-contract.cjs',
];
const harnessFiles = [
  'harness/bridge-process.cjs',
  'harness/controlled-clock.mjs',
  'harness/fake-cli.cjs',
  'harness/capture-tap-client.cjs',
  'harness/capture-tap-process.cjs',
  'harness/dashboard-preload.cjs',
  'harness/dashboard-process.cjs',
];
const migratedIncidentTests = [
  'foundation.cjs',
  'p1-contract.cjs',
  'p5-state-compatibility.cjs',
  'p6-rc-migration.cjs',
  'p10-independent-cache-observer.cjs',
  'p11-cache-fidelity.cjs',
  'p16-snapshot-performance-attribution.cjs',
  'p17-bounded-cli-parallelism.cjs',
  'p18-organization-discovery-dedup.cjs',
  'p19-organization-empty-fallback-fidelity.cjs',
  'p20-shared-24h-capture.cjs',
  'p21-snapshot-scheduling-attribution.cjs',
  'p23-credits-usage-early-start.cjs',
  'p24-snapshot-decision-attribution.cjs',
  'p25-long-window-critical-path-decoupling.cjs',
  'p26-foreground-cli-launcher-attribution.cjs',
  'p27-npx-cache-first-launcher.cjs',
  'p28-managed-direct-cli-runtime.cjs',
];

for (const name of behaviorTests) {
  const source = fs.readFileSync(`plugins/usage-dashboard/tests/${name}`, 'utf8');
  assert.ok(!source.includes("node:vm"), `${name} must not use VM extraction`);
  assert.ok(!source.includes('runInContext'), `${name} must not execute sliced source`);
  assert.ok(!source.includes("bridge-engine.mjs', 'utf8'"), `${name} must exercise the process boundary`);
}

for (const name of migratedIncidentTests) {
  const source = fs.readFileSync(`plugins/usage-dashboard/tests/${name}`, 'utf8');
  assert.ok(!source.includes("node:vm"), `${name} must not use VM extraction`);
  assert.ok(!source.includes('runInContext'), `${name} must not execute sliced source`);
  assert.ok(!/\b(?:engine|manager|diagnostics|source)\.slice\(/.test(source), `${name} must not slice runtime function bodies`);
}

const bridgeHarness = fs.readFileSync('plugins/usage-dashboard/tests/harness/bridge-process.cjs', 'utf8');
const fakeCli = fs.readFileSync('plugins/usage-dashboard/tests/harness/fake-cli.cjs', 'utf8');
const captureTapClient = fs.readFileSync('plugins/usage-dashboard/tests/harness/capture-tap-client.cjs', 'utf8');
const captureTapHarness = fs.readFileSync('plugins/usage-dashboard/tests/harness/capture-tap-process.cjs', 'utf8');
const dashboardPreload = fs.readFileSync('plugins/usage-dashboard/tests/harness/dashboard-preload.cjs', 'utf8');
const dashboardHarness = fs.readFileSync('plugins/usage-dashboard/tests/harness/dashboard-process.cjs', 'utf8');
assert.ok(bridgeHarness.includes("http://127.0.0.1:"));
assert.ok(bridgeHarness.includes('PATH:bin'));
assert.ok(bridgeHarness.includes("child.kill('SIGTERM')"));
assert.ok(bridgeHarness.includes("child.kill('SIGKILL')"));
assert.ok(bridgeHarness.includes('fs.rmSync(fixtureRoot, {recursive:true,force:true})'));
assert.ok(!fakeCli.includes("require('node:http')"));
assert.ok(!fakeCli.includes("require('node:https')"));
assert.ok(!fakeCli.includes('fetch('));
assert.ok(fakeCli.includes('failureByLabel'));
assert.ok(fakeCli.includes('captureActivityByCall'));
assert.ok(fakeCli.includes("return 'organizations'"));
assert.match(captureTapClient, /\^http:\\\/\\\/127\\\.0\\\.0\\\.1:/);
assert.ok(captureTapHarness.includes("server.listen(0, '127.0.0.1'"));
assert.ok(!captureTapHarness.includes("server.listen(0, '0.0.0.0'"));
assert.ok(captureTapHarness.includes("child.kill('SIGKILL')"));
assert.ok(captureTapHarness.includes('.slice(-20_000)'));
assert.ok(captureTapHarness.includes('capture tap must stay inside the isolated fixture root'));
assert.ok(dashboardHarness.includes("path.join(root, 'latest.js')"));
assert.ok(dashboardHarness.includes("child.kill('SIGTERM')"));
assert.ok(dashboardHarness.includes("child.kill('SIGKILL')"));
assert.ok(dashboardHarness.includes('.slice(-20_000)'));
assert.ok(dashboardHarness.includes('fs.rmSync(fixtureRoot, {recursive:true,force:true})'));
assert.ok(dashboardPreload.includes('headless dashboard harness must not request main DOM'));
assert.ok(!dashboardPreload.includes('0.0.0.0'));

const workflow = fs.readFileSync(currentRelease.sharedWorkflow, 'utf8');
assert.equal(fs.existsSync('plugins/usage-dashboard/tools/prepare_release_regressions.py'), false);
assert.ok(!workflow.includes('prepare_release_regressions.py'));
assert.ok(!workflow.includes('git checkout -- plugins/usage-dashboard/tests'));
assert.match(workflow, /TEST_TREE_MUTATED/);
for (const name of ['behavior-harness-contract.cjs', ...behaviorTests]) {
  assert.ok(workflow.includes(name), `${name} must run in the authoritative workflow`);
}
for (const name of harnessFiles) {
  assert.ok(fs.existsSync(`plugins/usage-dashboard/tests/${name}`));
}

console.log('usage-dashboard behavior harness contract: OK · black-box tests are local-only, bounded, adapter-free, and immutable in CI');
