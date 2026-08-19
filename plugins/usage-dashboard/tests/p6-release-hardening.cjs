const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

const productVersion = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alphaBuild = productVersion.match(/^3\.0\.0-alpha\.5\.(\d+)$/);
const isHardeningOrLater = alphaBuild ? Number(alphaBuild[1]) >= 46 : productVersion === '3.0.1';
const requiredEngineVersion = String(manifest.components.bridge.requiredVersion || '');
assert.ok(isHardeningOrLater, `unexpected release-hardening forward version: ${productVersion}`);
assert.ok(/^1\.6\.\d+$/.test(requiredEngineVersion), `unexpected bridge contract version: ${requiredEngineVersion}`);
assert.ok(source.includes(`const VERSION = '${productVersion}';`));
assert.ok(source.includes(`const REQUIRED_BRIDGE_VERSION = '${requiredEngineVersion}';`));
assert.ok(engine.includes(`const VERSION = '${requiredEngineVersion}';`));
assert.ok(manager.includes("const MANAGER_VERSION = '1.2.6';"));
assert.ok(manager.includes(`const PRODUCT_VERSION = '${productVersion}';`));
assert.ok(manager.includes(`const BUNDLED_ENGINE_VERSION = '${requiredEngineVersion}';`));
assert.equal(manifest.productVersion, productVersion);
assert.equal(manifest.components.bridge.requiredVersion, requiredEngineVersion);
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
for (const marker of [
  'lastRefreshPhases',
  "finishRefreshPhase('snapshot'",
  'Refresh phase duration:',
  'Refresh slowest phase:',
  'requestStatus:status',
  'function requestOutcomeCategory(row)',
  'Request outcome taxonomy:',
  'function stableReadinessSnapshot(bridgeDiag, runtimeBridge)',
  'Stable readiness:',
  'Stable contract:',
]) assert.ok(source.includes(marker), `missing release hardening marker: ${marker}`);

const start = source.indexOf('  function requestOutcomeCategory(row) {');
const end = source.indexOf('\n\n  function requestOutcomeStats(rows) {', start);
assert.ok(start >= 0 && end > start, 'request outcome helper not extractable');
const context = {};
vm.createContext(context);
vm.runInContext(`${source.slice(start, end)}\nthis.outcome=requestOutcomeCategory;`, context);
assert.equal(context.outcome({requestStatus:'cancelled', success:true}), 'cancelled');
assert.equal(context.outcome({requestStatus:'timeout', success:true}), 'error');
assert.equal(context.outcome({requestStatus:'completed', success:false}), 'error');
assert.equal(context.outcome({requestStatus:'', success:true}), 'success');
assert.equal(context.outcome({requestStatus:'', success:null}), 'unknown');

// Hardening taxonomy is observational: existing UI error semantics remain untouched.
assert.ok(source.includes("const success = explicitSuccess !== null ? explicitSuccess : !(failedByStatus || hasErrorObject || (statusCode !== null && statusCode >= 400));"));
console.log(`usage-dashboard P6 release hardening: OK · ${productVersion} stable gate + telemetry + outcome taxonomy · engine ${requiredEngineVersion}`);