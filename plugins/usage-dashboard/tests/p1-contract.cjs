const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = rel => JSON.parse(read(rel));
const source = read('latest.js');

assert.match(source, /^\/\/@version (?:3\.0\.0-alpha\.\d+\.\d+|3\.0\.0-beta\.\d+|3\.0\.0-rc\.\d+|3\.0\.0)$/m);
assert.match(source, /function normalizeBridgeModule\(name, row\)/);
assert.match(source, /function normalizeErrorMap\(raw\)/);
assert.match(source, /function usageCacheText\(scope\)/);
assert.match(source, /Bridge module freshness:/);
assert.match(source, /Bridge module duration:/);
assert.match(source, /Bridge partial:/);

function sliceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `missing start marker: ${startMarker}`);
  assert.ok(end > start, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

const helpers = sliceBetween('  function normalizeBridgeError(value) {', '  function bridgeSemver(value) {');
const timestamp = sliceBetween('  function bridgeTimestamp(value) {', '  function normalizeBridgeMetadata(raw) {');
const scope = sliceBetween('  function normalizeScopeActivity(raw) {', '  function normalizeUsageScopesPayload(raw, fallbackRaw = null) {');
const usageScopes = sliceBetween('  function normalizeUsageScopesPayload(raw, fallbackRaw = null) {', '  function normalizeAnalyticsPayload(raw, fallback24h = null) {');

const context = {};
vm.createContext(context);
vm.runInContext(`
  const num = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
${timestamp}
${helpers}
  function normalizeRecentRequestRows(rows) { return Array.isArray(rows) ? rows : []; }
${scope}
${usageScopes}
  this.api = {normalizeBridgeModule, normalizeBridgeModules, normalizeBridgeError, normalizeErrorMap, errorSummaryText, usageCacheText, normalizeScopeActivity, normalizeUsageScopesPayload};
`, context);

const api = context.api;
const fixture = json('tests/fixtures/p1-bridge-contract.json');
const modules = api.normalizeBridgeModules(fixture.modules);
assert.equal(modules.activity.status, 'ok');
assert.equal(modules.activity.stale, false);
assert.equal(modules.activity.durationMs, 142);
assert.ok(Number.isFinite(modules.activity.fetchedAt));
assert.equal(modules.credits.status, 'partial');
assert.equal(modules.credits.stale, true);
assert.equal(modules.credits.durationMs, 921);
assert.equal(modules.credits.errorCode, 'timeout');
assert.equal(modules.credits.errorType, 'upstream_error');
assert.equal(modules.credits.errorMessage, 'Credits CLI timeout');

const scopes = api.normalizeUsageScopesPayload(fixture.usageScopes);
assert.equal(scopes.errors.credits.code, 'timeout');
assert.equal(scopes.errors.credits.type, 'upstream_error');
assert.equal(scopes.errors.credits.message, 'Credits CLI timeout');
assert.equal(api.errorSummaryText(scopes.errors.credits), 'timeout · upstream_error · Credits CLI timeout');
assert.equal(api.usageCacheText(scopes.scopes.all), '—');
assert.equal(api.usageCacheText(scopes.scopes.credits), '0회 · 0.0%');

const stringError = api.normalizeBridgeError('analytics unavailable');
assert.equal(stringError.code, '');
assert.equal(stringError.type, '');
assert.equal(stringError.message, 'analytics unavailable');

const missingCache = api.normalizeScopeActivity({totalRequests: 1, totalCost: 0.1});
assert.equal(missingCache.cacheCount, null);
assert.equal(missingCache.cacheRate, null);
assert.equal(api.usageCacheText(missingCache), '—');

const zeroCache = api.normalizeScopeActivity({totalRequests: 1, totalCost: 0.1, cacheCount: 0, cacheRate: 0});
assert.equal(api.usageCacheText(zeroCache), '0회 · 0.0%');

console.log('usage-dashboard P1 contract fixtures: OK');
