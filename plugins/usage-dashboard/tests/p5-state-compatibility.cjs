'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const currentRelease = assertCurrentReleaseArtifacts();
const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const behavior = fs.readFileSync('plugins/usage-dashboard/tests/behavior-state-contract.cjs', 'utf8');
const workflow = fs.readFileSync(currentRelease.sharedWorkflow, 'utf8');

assert.ok(source.includes("const STATE_KEY = 'local-usage-dashboard-v3';"));
assert.ok(source.includes("const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';"));
assert.ok(source.includes('function hydrateState(saved) {'));
assert.ok(behavior.includes("'alpha-5.43-state'"), 'alpha.5.43 state preservation must stay covered by the production process harness');
assert.ok(behavior.includes("requestLedger:[{timestamp:123,requestNumber:'42'"));
assert.ok(workflow.includes('behavior-state-contract.cjs'));

console.log('usage-dashboard P5 state compatibility: OK · static state/storage boundaries retained; alpha.5.43 hydration behavior delegated to production process harness');
