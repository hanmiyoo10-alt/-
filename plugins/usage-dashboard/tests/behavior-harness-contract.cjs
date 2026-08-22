'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const currentRelease = assertCurrentReleaseArtifacts();
const behaviorTests = [
  'behavior-cli-launcher.cjs',
  'behavior-cache-runtime.cjs',
  'behavior-snapshot-scheduler.cjs',
];
const harnessFiles = [
  'harness/bridge-process.cjs',
  'harness/controlled-clock.mjs',
  'harness/fake-cli.cjs',
];

for (const name of behaviorTests) {
  const source = fs.readFileSync(`plugins/usage-dashboard/tests/${name}`, 'utf8');
  assert.ok(!source.includes("node:vm"), `${name} must not use VM extraction`);
  assert.ok(!source.includes('runInContext'), `${name} must not execute sliced source`);
  assert.ok(!source.includes("bridge-engine.mjs', 'utf8'"), `${name} must exercise the process boundary`);
}

const bridgeHarness = fs.readFileSync('plugins/usage-dashboard/tests/harness/bridge-process.cjs', 'utf8');
const fakeCli = fs.readFileSync('plugins/usage-dashboard/tests/harness/fake-cli.cjs', 'utf8');
assert.ok(bridgeHarness.includes("http://127.0.0.1:"));
assert.ok(bridgeHarness.includes('PATH:bin'));
assert.ok(bridgeHarness.includes("child.kill('SIGTERM')"));
assert.ok(bridgeHarness.includes("child.kill('SIGKILL')"));
assert.ok(bridgeHarness.includes('fs.rmSync(fixtureRoot, {recursive:true,force:true})'));
assert.ok(!fakeCli.includes("require('node:http')"));
assert.ok(!fakeCli.includes("require('node:https')"));
assert.ok(!fakeCli.includes('fetch('));

const workflow = fs.readFileSync(currentRelease.sharedWorkflow, 'utf8');
for (const name of ['behavior-harness-contract.cjs', ...behaviorTests]) {
  assert.ok(workflow.includes(name), `${name} must run in the authoritative workflow`);
}
for (const name of harnessFiles) {
  assert.ok(fs.existsSync(`plugins/usage-dashboard/tests/${name}`));
}

console.log('usage-dashboard behavior harness contract: OK · black-box tests are local-only, bounded, and free of VM source extraction');

