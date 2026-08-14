// Bridge Manager 1.2.1 live-status reconciliation release validation trigger.
// Node --check must receive a recognized .cjs temp extension on device runtimes.
// Android proc-net + authenticated lifecycle probe + bundled engine regression lock for Bridge Manager 1.2.1.
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const enabled = /^3\.0\.0-alpha\.5\.(?:[1-9]|\d{2,})$/.test(version) || /^3\.0\.0-beta\./.test(version) || version === '3.0.0';
if (!enabled) {
  console.log(`usage-dashboard P5 bridge manager regression: skipped · ${version}`);
  process.exit(0);
}

const managerPath = 'plugins/usage-dashboard/runtime/bridge-manager.cjs';
const bootstrapPath = 'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh';
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const manager = fs.readFileSync(managerPath, 'utf8');
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
const hash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');

for (const marker of [
  "const BRIDGE_MANAGER_BASE = 'http://127.0.0.1:39119';",
  'async function fetchBridgeManagerStatus(force = false)',
  'async function syncBridgeManagerIfNeeded(status)',
  'Bridge manager probe:',
  'Bridge manager sync: action',
  'Bridge engine sync: bundle',
  'engine-managed ${runtimeBridge.engineManaged',
]) assert.ok(source.includes(marker), `missing plugin bridge-manager marker: ${marker}`);

for (const marker of [
  "const HOST = '127.0.0.1';",
  "const PROTOCOL = 'bridge-manager-v1';",
  "req.headers['x-local-bridge-key']",
  "req.headers['x-devpass-bridge-key']",
  'crypto.timingSafeEqual',
  "execFileSync(process.execPath, ['--check', file]",
  "url.pathname === '/sync'",
  "url.pathname === '/rollback'",
  "url.pathname === '/restart'",
  "url.pathname === '/engine/adopt'",
  "const ENGINE_SERVICE = 'local-usage-runtime-engine';",
  "engineAdoption:true",
]) assert.ok(manager.includes(marker), `missing manager marker: ${marker}`);

assert.ok(bootstrap.includes('start-services.sh'), 'Termux boot services handoff missing');
assert.ok(bootstrap.includes('sv-enable'), 'termux-services enable missing');
assert.ok(bootstrap.includes('기존 39117 Bridge와 토큰은 변경하지 않았어.'), 'legacy bridge preservation marker missing');
assert.equal(manifest.productVersion, version);
if (/^3\.0\.0-alpha\.5\.1$/.test(version)) assert.equal(manifest.components.bridge.state, 'legacy-external');
else if (/^3\.0\.0-alpha\.5\.(?:[3-9]|\d{2,})$/.test(version)) assert.equal(manifest.components.bridge.state, 'managed-bundled');
else assert.equal(manifest.components.bridge.state, 'managed-adoption');
if (/^3\.0\.0-alpha\.5\.1$/.test(version)) assert.equal(manifest.components.bridgeManager.state, 'bootstrap-ready');
else if (/^3\.0\.0-alpha\.5\.(?:[3-9]|\d{2,})$/.test(version)) assert.equal(manifest.components.bridgeManager.state, 'bundled-engine-ready');
else assert.equal(manifest.components.bridgeManager.state, 'engine-adoption-ready');
assert.equal(manifest.components.bridgeManager.managementProtocol, 'bridge-manager-v1');
assert.equal(manifest.components.bridgeManager.port, 39119);
assert.equal(manifest.components.bridgeManager.selfUpdate, true);
if (/^3\.0\.0-alpha\.5\.1$/.test(version)) assert.equal(manifest.components.bridgeManager.engineManaged, false);
else { assert.equal(manifest.components.bridgeManager.engineManaged, true); assert.equal(manifest.components.bridgeManager.engineAdoption, true); }
assert.equal(manifest.components.bridgeManager.sha256, hash(managerPath));
assert.equal(manifest.components.bridgeManager.bootstrapSha256, hash(bootstrapPath));
assert.ok(manager.includes("const MANAGER_VERSION = '1.2.1';"), 'manager bundled-engine version missing');
assert.ok(manager.includes('bridge-manager.next-${process.pid}.cjs'), 'self-update temp file must preserve .cjs extension');
assert.ok(manager.includes('bridge-manager.rollback-${process.pid}.cjs'), 'rollback temp file must preserve .cjs extension');
assert.ok(manager.includes("const LEGACY_ENGINE_PID_FILE = path.join(os.homedir(), 'PocketRisu/bridge/run/llmgateway-devpass-bridge.pid');"), 'canonical legacy pidfile fallback missing');
assert.ok(manager.includes("const LEGACY_ENGINE_SCRIPT = path.join(os.homedir(), 'PocketRisu/bridge/llmgateway-termux-bridge.mjs');"), 'canonical legacy bridge path guard missing');
assert.ok(manager.includes('function canonicalPidFileCandidate()'), 'Android pidfile candidate fallback missing');
assert.ok(manager.includes('async function bridgeReachable(timeoutMs = 700)'), 'endpoint transition verifier missing');
assert.ok(manager.includes("const BRIDGE_PROBE_PATH = '/__local_usage_runtime_probe__';"), 'fast authenticated bridge probe path missing');
assert.ok(manager.includes('async function bridgeAuthProbe(timeoutMs = 1500)'), 'authenticated lifecycle probe missing');
assert.ok(manager.includes('async function bridgeIdentity(timeoutMs = 1500)'), 'bridge identity verifier missing');
assert.ok(manager.includes("url.pathname === '/engine/sync'"), 'bundled engine sync endpoint missing');
assert.ok(manager.includes('async function syncBundledEngine()'), 'bundled engine migration missing');
assert.ok(!manager.includes("path:'/snapshot'"), 'manager lifecycle verification must not call heavy snapshot');
assert.ok(!manager.includes('bridgeSnapshot('), 'snapshot-based lifecycle verifier regressed');
assert.ok(manager.includes('processMatchesSpec(service.pid, descriptor)'), 'managed service process fallback missing');
assert.ok(!manager.includes('`${CURRENT_FILE}.next-${process.pid}`'), 'unknown-extension self-update temp path regressed');
assert.ok(!source.includes("if (String(state.bridgeManagerSyncedProductVersion || '') === VERSION) return status;"), 'persisted manager sync marker must not suppress live reconciliation');
assert.ok(source.includes("state.bridgeManagerSyncedProductVersion = '';"), 'manager mismatch must clear stale sync marker');
assert.ok(source.includes('for (const waitMs of [200, 350, 600, 900])'), 'manager restart re-probe loop missing');

console.log(`usage-dashboard P5 bridge manager regression: OK · ${version}`);
