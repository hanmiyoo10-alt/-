'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const currentRelease = assertCurrentReleaseArtifacts();
const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = rel => JSON.parse(read(rel));
const source = read('latest.js');
const behavior = read('tests/behavior-state-contract.cjs');
const workflow = fs.readFileSync(currentRelease.sharedWorkflow, 'utf8');

assert.match(source, /const SNAPSHOT_SCHEMA_VERSION = 1;/);
assert.match(source, /const RECENT_REQUEST_SCHEMA_VERSION = 1;/);
assert.match(source, /const STATE_KEY = 'local-usage-dashboard-v3';/);
assert.match(source, /^\/\/@update-url https:\/\/raw\.githubusercontent\.com\/hanmiyoo10-alt\/-\/release-usage-dashboard\/plugins\/usage-dashboard\/latest\.js$/m);
assert.match(source, /Schema: snapshot v\$\{SNAPSHOT_SCHEMA_VERSION\} · recent-request v\$\{RECENT_REQUEST_SCHEMA_VERSION\}/);

const snapshotSchema = json('contracts/snapshot-v1.schema.json');
const recentSchema = json('contracts/recent-request-v1.schema.json');
assert.equal(snapshotSchema.$id, 'local-usage-dashboard/snapshot-v1');
assert.equal(recentSchema.$id, 'local-usage-dashboard/recent-request-v1');
assert.deepEqual(recentSchema.required, ['timestamp', 'provider', 'model']);

const fixture = json('tests/fixtures/foundation-snapshot.json');
const rawScope = fixture.usageScopes.scopes.all;
for (const row of rawScope.recent) {
  for (const key of ['timestamp', 'provider', 'model']) assert.ok(row[key] !== undefined, `recent fixture missing ${key}`);
  for (const forbidden of ['prompt', 'response', 'messages', 'content']) assert.equal(row[forbidden], undefined, `fixture must stay metadata-only: ${forbidden}`);
}
assert.equal(rawScope.totalRequests, 4);
assert.equal(rawScope.cacheCount, 2);
assert.equal(rawScope.cacheRate, 50);
assert.equal(rawScope.providers[1].cacheCount, 0);
assert.equal(rawScope.providers[1].cacheRate, 0);

const zero = json('tests/fixtures/cache-zero.json');
assert.equal(zero.cacheCount, 0);
assert.equal(zero.cacheRate, 0);
assert.equal(zero.providers[0].cacheCount, 0);
assert.equal(zero.providers[0].cacheRate, 0);

const saved = json('tests/fixtures/state-v3.json');
for (const key of ['bridgeBase','bridgeEnabled','refreshMs','backgroundPause','syncOnFocus','performanceGuard','adaptiveRefresh','widgetMode','widgetX','widgetY','usageScopeView','analyticsScopeView']) {
  assert.ok(Object.hasOwn(saved, key), `state-v3 fixture missing ${key}`);
}
assert.ok(behavior.includes("json('tests/fixtures/foundation-snapshot.json')"));
assert.ok(behavior.includes("json('tests/fixtures/cache-zero.json')"));
assert.ok(behavior.includes("json('tests/fixtures/state-v3.json')"));
assert.ok(behavior.includes("'prompt','response','messages','content'"), 'privacy stripping must stay covered by the process harness');
assert.ok(workflow.includes('behavior-state-contract.cjs'));

console.log('usage-dashboard foundation fixtures: OK · schemas and fixture boundaries retained; state/normalization behavior delegated to production process harness');
