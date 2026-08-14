const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const enabled = /^3\.0\.0-alpha\.5\.(?:[2-9]|\d{2,})$/.test(version) || /^3\.0\.0-beta\./.test(version) || version === '3.0.0';
if (!enabled) { console.log(`usage-dashboard P5 engine adoption regression: skipped · ${version}`); process.exit(0); }
for (const marker of [
  'async function adoptBridgeEngineIfNeeded(status)',
  "`${BRIDGE_MANAGER_BASE}/engine/adopt`",
  'bridgeEngineAdoptionAttemptedVersion',
  'Bridge engine: mode',
]) assert.ok(source.includes(marker), `missing plugin adoption marker: ${marker}`);
for (const marker of [
  "const ENGINE_PORT = 39117;",
  "const ENGINE_SERVICE = 'local-usage-runtime-engine';",
  "'/proc/net/tcp'",
  'function safeCandidate(proc)',
  "process.kill(candidate.pid, 'SIGTERM')",
  'await waitForManagedEngine()',
  "url.pathname === '/engine/adopt'",
  'candidateSafe',
  'engineAdoption:true',
]) assert.ok(manager.includes(marker), `missing manager adoption marker: ${marker}`);
assert.ok(!manager.includes("process.kill(candidate.pid, 'SIGKILL')"), 'automatic adoption must not force-kill legacy bridge');
assert.equal(manifest.productVersion, version);
assert.equal(manifest.components.bridge.state, 'managed-adoption');
assert.equal(manifest.components.bridge.lifecycleManaged, true);
assert.equal(manifest.components.bridge.sourceBundled, false);
assert.equal(manifest.components.bridgeManager.version, '1.1.0');
assert.equal(manifest.components.bridgeManager.engineAdoption, true);
assert.equal(manifest.components.bridgeManager.engineService, 'local-usage-runtime-engine');
console.log(`usage-dashboard P5 engine adoption regression: OK · ${version}`);
