const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.ok(source.includes('//@version 3.0.0-alpha.5.41'));
assert.ok(source.includes("const REQUIRED_BRIDGE_VERSION = '1.6.5';"));
assert.ok(engine.includes("const VERSION = '1.6.5';"));
for (const marker of [
  'requestedServiceTierSource',
  'servedServiceTierSource',
  "'requestedServiceTier','requested_service_tier'",
  "'servedServiceTier','served_service_tier'",
  'function normalizeCapturedRecentLogs(root)',
]) assert.ok(engine.includes(marker), `missing Engine service tier marker: ${marker}`);

for (const marker of [
  'function normalizeServiceTierValue(value)',
  'function requestServiceTierText(row)',
  'function requestServiceTierStats(rows)',
  'function requestServiceTierSummary(rows)',
  'requestedServiceTier:preferKnownServiceTier',
  'servedServiceTier:preferKnownServiceTier',
  'Service tier fidelity:',
  'Service tier source fields:',
  'DevPass account tier:',
  'devpassAccount',
  '<span>Service tier</span>',
  '<span>Routing</span>',
  '<span>Pending tier</span>',
  '<span>Personal org</span>',
]) assert.ok(source.includes(marker), `missing plugin service tier marker: ${marker}`);

assert.ok((source.match(/requestServiceTierText\(row\)/g) || []).length >= 2, 'recent and hourly request rows must both show tier');
const keyStart = source.indexOf('  function requestLedgerKey(row) {');
const keyEnd = source.indexOf('  function collectRecentRequestLedger(data) {', keyStart);
assert.ok(keyStart >= 0 && keyEnd > keyStart, 'requestLedgerKey slice missing');
const keySlice = source.slice(keyStart, keyEnd);
assert.ok(!keySlice.includes('requestedServiceTier') && !keySlice.includes('servedServiceTier'), 'tier enrichment must not change request dedupe identity');

const helperStart = source.indexOf('  function normalizeServiceTierValue(value) {');
const helperEnd = source.indexOf('  function requestTimestampPrecision(timestamp, sourceKey, requestNumber) {', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'service tier helper slice missing');
const context = {};
vm.createContext(context);
vm.runInContext(`${source.slice(helperStart, helperEnd)}\nthis.api={normalizeServiceTierValue,requestServiceTierText,requestServiceTierStats};`, context);
assert.equal(context.api.normalizeServiceTierValue('flex'), 'flex');
assert.equal(context.api.normalizeServiceTierValue('default'), 'standard');
assert.equal(context.api.normalizeServiceTierValue('priority'), 'priority');
assert.equal(context.api.requestServiceTierText({requestedServiceTier:'flex',servedServiceTier:'flex'}), 'FLEX');
assert.equal(context.api.requestServiceTierText({requestedServiceTier:'flex',servedServiceTier:'default'}), '요청 FLEX → 실제 STANDARD');
const stats = context.api.requestServiceTierStats([
  {requestedServiceTier:'flex',servedServiceTier:'flex',requestedServiceTierSource:'requestedServiceTier',servedServiceTierSource:'usedServiceTier'},
  {requestedServiceTier:'default',servedServiceTier:'default'},
  {requestedServiceTier:'priority',servedServiceTier:''},
]);
assert.equal(stats.requestedKnown, 3);
assert.equal(stats.servedKnown, 2);
assert.equal(stats.flex, 1);
assert.equal(stats.standard, 1);
assert.equal(stats.unknown, 1);

assert.ok(manager.includes("const MANAGER_VERSION = '1.2.6';"));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.41';"));
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.5';"));
assert.equal(manifest.productVersion, '3.0.0-alpha.5.41');
assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.41');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.5');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);
console.log('usage-dashboard P5 per-request service tier fidelity: OK · 3.0.0-alpha.5.41');
