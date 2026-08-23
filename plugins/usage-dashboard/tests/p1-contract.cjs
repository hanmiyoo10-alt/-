'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = rel => JSON.parse(read(rel));
const source = read('latest.js');
const fixture = json('tests/fixtures/p1-bridge-contract.json');
const behavior = read('tests/behavior-state-contract.cjs');

for (const marker of [
  'function normalizeBridgeModule(name, row)',
  'function normalizeErrorMap(raw)',
  'function usageCacheText(scope)',
  'Bridge module freshness:',
  'Bridge module duration:',
  'Bridge partial:',
]) assert.ok(source.includes(marker), `missing P1 contract marker: ${marker}`);

assert.equal(fixture.modules.activity.status, 'ok');
assert.equal(fixture.modules.activity.durationMs, 142);
assert.equal(fixture.modules.credits.status, 'partial');
assert.equal(fixture.modules.credits.errorCode, 'timeout');
assert.equal(fixture.usageScopes.errors.credits.type, 'upstream_error');
assert.equal(fixture.usageScopes.scopes.credits.cacheCount, 0);
assert.equal(fixture.usageScopes.scopes.credits.cacheRate, 0);
assert.ok(behavior.includes("json('tests/fixtures/p1-bridge-contract.json')"), 'P1 fixture must stay exercised by the production process harness');
assert.ok(behavior.includes("message:'analytics unavailable'"), 'string-error normalization must stay covered by process behavior');

console.log('usage-dashboard P1 contract fixtures: OK · static schema/UI boundaries retained; normalization behavior delegated to production process harness');
