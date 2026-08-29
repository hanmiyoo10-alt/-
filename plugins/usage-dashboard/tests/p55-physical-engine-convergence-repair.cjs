// P55 Physical Engine Convergence Repair
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const pluginCore = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const engineCore = fs.readFileSync(`${root}/runtime-src/bridge-engine/00-core.part.mjs`, 'utf8');
const engineBytes = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`);
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const bootstrapBytes = fs.readFileSync(`${root}/runtime/bootstrap-bridge-manager.sh`);
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.89') {
  console.log(`P55 Physical Engine Convergence Repair: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.89`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.27');
assert.equal(release.managerVersion, '1.3.3');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

assert.ok(pluginCore.includes("const VERSION = '3.0.0-alpha.5.89';"));
assert.ok(pluginCore.includes("const REQUIRED_BRIDGE_VERSION = '1.6.27';"), 'P55 Engine requirement must remain 1.6.27');
assert.ok(pluginCore.includes("const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.3';"), 'P55 Manager requirement must advance to 1.3.3');
assert.ok(engineCore.includes("const VERSION = '1.6.27';"), 'P55 Engine source identity must stay 1.6.27');
assert.ok(engineCore.includes("const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.14.0';"), 'P55 Engine managed CLI pin must stay 1.14.0');
assert.ok(manager.includes("const MANAGER_VERSION = '1.3.3';"));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.89';"));
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.27';"));
assert.ok(manager.includes("const MANAGED_CLI_VERSION = '1.14.0';"));

// Exact physical defect shape: the bundled path/hash can be current while the already-running process still reports 1.6.26.
const bundledPredicate = "const engineBundled = Boolean(managed && descriptorBundled && bundleReady && serviceEnvironmentReady && String(identity?.bridgeVersion || '') === BUNDLED_ENGINE_VERSION);";
assert.ok(manager.includes(bundledPredicate), 'P55 bundled classification must include live Engine version equality');
const classifyBundled = ({managed, descriptorBundled, bundleReady, serviceEnvironmentReady, liveVersion, targetVersion}) =>
  Boolean(managed && descriptorBundled && bundleReady && serviceEnvironmentReady && String(liveVersion || '') === targetVersion);
assert.equal(classifyBundled({managed:true,descriptorBundled:true,bundleReady:true,serviceEnvironmentReady:true,liveVersion:'1.6.26',targetVersion:'1.6.27'}), false,
  'P55 physical stale live process must not be classified as current bundled Engine');
assert.equal(classifyBundled({managed:true,descriptorBundled:true,bundleReady:true,serviceEnvironmentReady:true,liveVersion:'1.6.27',targetVersion:'1.6.27'}), true,
  'P55 exact live target must be classified as bundled');

// Bundle restart success must be version-exact, while legacy adoption can still omit an expectedVersion.
for (const marker of [
  "async function waitForManagedEngine(expected, expectedVersion = '', timeoutMs = 12000)",
  "if (expectedVersion && liveVersion !== expectedVersion)",
  "managed engine version mismatch: expected ${expectedVersion}, got ${liveVersion || 'unknown'}",
  "async function startManagedCandidate(candidate, expectedVersion = '')",
  "return waitForManagedEngine(candidate, expectedVersion);",
  "const verified = await startManagedCandidate(next, BUNDLED_ENGINE_VERSION);",
  "const verified = await waitForManagedEngine(candidate);",
  "const rollback = await startManagedCandidate(previous);",
]) assert.ok(manager.includes(marker), `P55 Manager exact-version convergence marker missing: ${marker}`);

// Plugin reconciliation must not silently hide a live Engine mismatch behind bundleAvailable.
assert.equal(
  pluginCore.includes("if (!status?.connected || status.engineManaged !== true || status.engineBundleAvailable !== true) return status;"),
  false,
  'P55 old silent bundleAvailable top-level gate must be removed',
);
for (const marker of [
  "if (!status?.connected || status.engineManaged !== true) return status;",
  "const isCurrentBundledEngine = value => value?.engineBundled === true",
  "String(value.engineVersion || '') === REQUIRED_BRIDGE_VERSION",
  "const fresh = await fetchBridgeManagerStatus(true);",
  "engineBundleSyncState:'capability-missing'",
  "engineBundleSyncState:'target-missing'",
  "engineBundleSyncState:'target-mismatch'",
  "retry until the exact required Engine is running",
]) assert.ok(pluginCore.includes(marker), `P55 Plugin convergence marker missing: ${marker}`);

const syncStart = pluginCore.indexOf('async function syncBridgeEngineBundleIfNeeded(status)');
const syncEnd = pluginCore.indexOf('async function refresh(', syncStart);
assert.ok(syncStart >= 0 && syncEnd > syncStart, 'P55 Plugin bundle sync boundary missing');
const syncBlock = pluginCore.slice(syncStart, syncEnd);
assert.ok(syncBlock.indexOf('fetchBridgeManagerStatus(true)') < syncBlock.indexOf("engineBundleSyncState:'capability-missing'"),
  'P55 must force one fresh Manager probe before declaring bundle capability missing');
assert.ok(syncBlock.includes('/engine/sync'), 'P55 must retain canonical Manager engine sync endpoint');

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const engineSha = sha256(engineBytes);
const bootstrapSha = sha256(bootstrapBytes);
assert.equal(engineSha, 'd3849b2bb579fcd640938019884f7bf1155c85f9ae519fa83dab5dc704bb3e9b', 'P55 Engine artifact must be byte-identical to deployed 5.88 Engine 1.6.27');
assert.equal(engineSha, manifest.components.bridge.sha256, 'P55 manifest Engine hash must match unchanged Engine bytes');
assert.equal(manifest.productVersion, '3.0.0-alpha.5.89');
assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.89');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.27');
assert.equal(manifest.components.bridgeManager.version, '1.3.3');
assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-alpha.5.89');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', 'P55 bootstrap must remain byte-identical');

execFileSync(process.execPath, [`${root}/tools/build_usage_dashboard.cjs`, '--check'], {stdio:'pipe'});
execFileSync(process.execPath, [`${root}/tools/build_bridge_engine.cjs`, '--check'], {stdio:'pipe'});
for (const name of [
  'p52-managed-cli-engine-manager-pin-parity.cjs',
  'p53-stable-contract-manager-authority-single-source.cjs',
  'p54-llmgateway-cli-1140-managed-runtime-upgrade.cjs',
  'behavior-cli-launcher.cjs',
  'behavior-runtime-recovery.cjs',
  'e15-release-handoff-hygiene-contract.cjs',
]) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK|SKIP/, `P55 requires ${name} GREEN or historical exact-release SKIP`);
}

const suite = discoverTests();
for (const name of [
  'p52-managed-cli-engine-manager-pin-parity.cjs',
  'p53-stable-contract-manager-authority-single-source.cjs',
  'p54-llmgateway-cli-1140-managed-runtime-upgrade.cjs',
  'p55-physical-engine-convergence-repair.cjs',
]) assert.ok(suite.regressions.includes(name), `P55 registry must include ${name}`);

console.log('P55 Physical Engine Convergence Repair: OK · live version gates bundled identity · bundle restart exact-version verified · Plugin silent convergence skip removed · Engine bytes unchanged · contracts 1/1');
