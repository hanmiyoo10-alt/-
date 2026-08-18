const fs = require('node:fs');
const assert = require('node:assert/strict');
const {PARTS} = require('../src/parts.cjs');
const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const srcManifest = JSON.parse(fs.readFileSync(`${root}/src/manifest.json`, 'utf8'));
const productVersion = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alphaBuild = productVersion.match(/^3\.0\.0-alpha\.5\.(\d+)$/);
assert.ok(alphaBuild ? Number(alphaBuild[1]) >= 47 : /^3\.0\.0-rc\.\d+$/.test(productVersion) || productVersion === '3.0.0' || productVersion === '3.0.1', `unexpected RC-train product version: ${productVersion}`);
assert.ok(source.includes(`const VERSION = '${productVersion}';`));
assert.ok(source.includes("const STATE_KEY = 'local-usage-dashboard-v3';"));
assert.ok(source.includes("const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';"));
assert.ok(source.includes("const REQUIRED_BRIDGE_VERSION = '1.6.5';"));
assert.ok(engine.includes("const VERSION = '1.6.5';"));
assert.ok(manager.includes("const MANAGER_VERSION = '1.2.6';"));
assert.ok(manager.includes(`const PRODUCT_VERSION = '${productVersion}';`));
assert.equal(manifest.productVersion, productVersion);
assert.equal(manifest.components.plugin.version, productVersion);
assert.equal(manifest.components.bridge.requiredVersion, '1.6.5');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.equal(manifest.components.bridgeManager.productVersion, productVersion);
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
assert.equal(srcManifest.sourceOfTruth, 'modules');
assert.equal(PARTS.length, 22);
for (const marker of [
  'System Health',
  'systemHealthStatus',
  '<b>Connection</b><span>Bridge endpoint · token</span>',
  '<b>Refresh</b><span>주기 · stale policy</span>',
  '<b>Floating Widget</b><span>표시 정보</span>',
  '<b>Performance</b><span>복귀 · adaptive refresh</span>',
  '<b>Lifecycle & Recovery</b>',
  '요약 · 전체 진단',
  '<span>Manager</span>',
  '<span>Lifecycle</span>',
  '<span>Errors</span>',
]) assert.ok(source.includes(marker), `missing RC productization marker: ${marker}`);
console.log(`usage-dashboard P6 RC contract: OK · productization locked · ${productVersion}`);
