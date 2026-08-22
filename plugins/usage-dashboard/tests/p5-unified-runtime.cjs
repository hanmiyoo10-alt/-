const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const enabled = /^3\.0\.0-alpha\.5\./.test(version) || /^3\.0\.0-beta\./.test(version) || /^3\.0\.0-rc\./.test(version) || version === '3.0.0';
if (!enabled) {
  console.log(`usage-dashboard P5 unified runtime regression: skipped · ${version}`);
  process.exit(0);
}

for (const marker of [
  'const PRODUCT_RUNTIME_SCHEMA_VERSION = 1;',
  "const BRIDGE_MANAGER_PROTOCOL = 'bridge-manager-v1';",
  'function bridgeRuntimeSnapshot()',
  'raw.bridgeCapabilities ?? raw.capabilities?.bridge ?? raw.capabilities',
  'raw.bridgeManager ?? raw.manager ?? raw.updateManager',
  'Unified runtime: schema v${PRODUCT_RUNTIME_SCHEMA_VERSION}',
  'Bridge manager: protocol ${runtimeBridge.managerProtocol}',
  'Runtime manifest: ${RUNTIME_MANIFEST_URL}',
]) assert.ok(source.includes(marker), `missing unified runtime marker: ${marker}`);

assert.equal(manifest.format, 1);
assert.equal(manifest.productVersion, version);
assert.equal(manifest.architecture, 'single-product-modular-sidecar');
assert.equal(manifest.components.plugin.version, version);
assert.equal(manifest.components.plugin.mode, 'bundled');
assert.equal(manifest.components.bridge.mode, 'sidecar');
if (/^3\.0\.0-alpha\.5\.[01]$/.test(version)) assert.equal(manifest.components.bridge.state, 'legacy-external');
else if (/^3\.0\.0-alpha\.5\.(?:[3-9]|\d{2,})$/.test(version) || /^3\.0\.0-rc\.\d+$/.test(version) || version === '3.0.0') assert.equal(manifest.components.bridge.state, 'managed-bundled');
else assert.equal(manifest.components.bridge.state, 'managed-adoption');
assert.equal(manifest.components.bridge.managementProtocol, 'bridge-manager-v1');
assert.equal(manifest.components.bridge.selfUpdate, false);
if (/^3\.0\.0-alpha\.5\.(?:[3-9]|\d{2,})$/.test(version) || /^3\.0\.0-rc\.\d+$/.test(version) || version === '3.0.0') {
  assert.ok(String(manifest.components.bridge.artifact || '').endsWith('/runtime/bridge-engine.mjs'));
  assert.equal(manifest.components.bridge.sourceBundled, true);
} else assert.equal(manifest.components.bridge.artifact, null);
assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);

console.log(`usage-dashboard P5 unified runtime regression: OK · ${version}`);
