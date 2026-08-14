const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = rel => JSON.parse(read(rel));
const source = read('latest.js');

assert.match(source, /^\/\/@version 3\.0\.0-alpha\./m);
assert.match(source, /const VERSION = '3\.0\.0-alpha\.[^']+';/);
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

function sliceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `missing start marker: ${startMarker}`);
  assert.ok(end > start, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

const defaultsStart = source.indexOf('  const DEFAULTS = {');
const defaultsEnd = source.indexOf('\n  };', defaultsStart);
assert.ok(defaultsStart >= 0 && defaultsEnd > defaultsStart, 'DEFAULTS block missing');
const defaultsCode = source.slice(defaultsStart, defaultsEnd + 5);
const hydrateCode = sliceBetween('  function hydrateState(saved) {', '  function bridgeSemver(value) {');
const recentCode = sliceBetween('  function recentRequestValue(row, keys, fallback = null) {', '  function scopeUsageDetailsHtml(scopeActivity) {');
const scopeCode = sliceBetween('  function normalizeScopeActivity(raw) {', '  function normalizeUsageScopesPayload(raw, fallbackRaw = null) {');

const context = {};
vm.createContext(context);
vm.runInContext(`
  const num = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  function bridgeTimestamp(value) {
    if (value === null || value === undefined || value === '') return null;
    if (num(value)) {
      const n = Number(value);
      return n > 0 && n < 1e12 ? n * 1000 : n;
    }
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }
${defaultsCode}
${hydrateCode}
${recentCode}
${scopeCode}
  this.api = {hydrateState, normalizeRecentRequestRows, normalizeScopeActivity};
`, context);

const {hydrateState, normalizeRecentRequestRows, normalizeScopeActivity} = context.api;

const fixture = json('tests/fixtures/foundation-snapshot.json');
const rawScope = fixture.usageScopes.scopes.all;
for (const row of rawScope.recent) {
  for (const key of ['timestamp', 'provider', 'model']) assert.ok(row[key] !== undefined, `recent fixture missing ${key}`);
  for (const forbidden of ['prompt', 'response', 'messages', 'content']) assert.equal(row[forbidden], undefined, `fixture must stay metadata-only: ${forbidden}`);
}

const normalized = normalizeScopeActivity(rawScope);
assert.equal(normalized.totalRequests, 4);
assert.equal(normalized.cacheCount, 2);
assert.equal(normalized.cacheRate, 50);
assert.equal(normalized.providers[0].cacheCount, 2);
assert.equal(normalized.providers[0].cacheRate, 66.7);
assert.equal(normalized.providers[0].errorRate, 33.3);
assert.equal(normalized.providers[0].totalTokens, 2400);
assert.equal(normalized.providers[1].cacheCount, 0);
assert.equal(normalized.providers[1].cacheRate, 0);
assert.equal(normalized.models[0].cacheRate, 66.7);
assert.equal(normalized.recent.length, 2);
assert.equal(normalized.recent[0].requestNumber, '44');
assert.equal(normalized.recent[0].cacheHit, true);
assert.equal(normalized.recent[1].success, false);
assert.equal(normalized.recent[1].errorCode, '429');
assert.equal(normalized.recent[1].errorType, 'upstream_error');
assert.equal(normalized.recent[1].cacheHit, false);

const zero = normalizeScopeActivity(json('tests/fixtures/cache-zero.json'));
assert.equal(zero.cacheCount, 0);
assert.equal(zero.cacheRate, 0);
assert.equal(zero.providers[0].cacheCount, 0);
assert.equal(zero.providers[0].cacheRate, 0);

const privacyRow = normalizeRecentRequestRows([{
  timestamp: '2026-08-14T07:31:00.000Z',
  provider: 'example',
  model: 'example/model',
  success: true,
  prompt: 'must not escape',
  response: 'must not escape',
  messages: ['must not escape'],
  content: 'must not escape'
}])[0];
for (const forbidden of ['prompt', 'response', 'messages', 'content']) assert.equal(privacyRow[forbidden], undefined, `normalized row leaked ${forbidden}`);

const errorWithoutDetail = normalizeRecentRequestRows([{
  timestamp: '2026-08-14T07:32:00.000Z',
  provider: 'example',
  model: 'example/model',
  success: false
}])[0];
assert.equal(errorWithoutDetail.success, false);
assert.equal(errorWithoutDetail.errorCode, '');
assert.equal(errorWithoutDetail.errorType, '');

const saved = json('tests/fixtures/state-v3.json');
const migrated = hydrateState(saved);
for (const key of ['bridgeBase','bridgeEnabled','refreshMs','backgroundPause','syncOnFocus','performanceGuard','adaptiveRefresh','widgetMode','widgetX','widgetY','usageScopeView','analyticsScopeView']) {
  assert.deepEqual(migrated[key], saved[key], `state migration changed ${key}`);
}
assert.deepEqual(migrated.dailyUsage, saved.dailyUsage);
assert.deepEqual(migrated.creditDailyUsage, saved.creditDailyUsage);
assert.equal(migrated.bridgeError, '');
assert.equal(migrated.schedulerEnabled, true);

console.log('usage-dashboard foundation fixtures: OK');
