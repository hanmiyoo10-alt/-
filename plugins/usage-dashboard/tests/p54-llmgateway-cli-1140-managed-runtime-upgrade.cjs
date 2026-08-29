// P54 LLM Gateway CLI 1.14.0 Managed Runtime Upgrade
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const pluginCore = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const engineCore = fs.readFileSync(`${root}/runtime-src/bridge-engine/00-core.part.mjs`, 'utf8');
const cliRuntime = fs.readFileSync(`${root}/runtime-src/bridge-engine/30-cli-runtime.part.mjs`, 'utf8');
const sources = fs.readFileSync(`${root}/runtime-src/bridge-engine/40-sources.part.mjs`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.88') {
  console.log(`P54 LLM Gateway CLI 1.14.0 Managed Runtime Upgrade: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.88`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.27');
assert.equal(release.managerVersion, '1.3.2');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const enginePin = engineCore.match(/const CLI_VERSION = process\.env\.LLMGATEWAY_CLI_VERSION \|\| '([^']+)';/)?.[1] || '';
const managerPin = manager.match(/const MANAGED_CLI_VERSION = '([^']+)';/)?.[1] || '';
assert.equal(enginePin, '1.14.0', 'P54 Engine managed CLI target must be exactly 1.14.0');
assert.equal(managerPin, '1.14.0', 'P54 Manager managed CLI target must be exactly 1.14.0');
assert.equal(managerPin, enginePin, 'P54 Engine/Manager managed CLI targets must remain identical');
assert.ok(engine.includes("const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.14.0';"), 'P54 generated Engine must retain exact 1.14.0 pin');
assert.equal(engine.includes("|| '1.10.0';"), false, 'P54 generated Engine must not retain stale 1.10.0 default');
assert.equal(manager.includes("const MANAGED_CLI_VERSION = '1.10.0';"), false, 'P54 Manager must not retain stale 1.10.0 target');

for (const marker of [
  "const MANAGED_CLI_VERSION_ROOT = path.join(MANAGED_CLI_ROOT, MANAGED_CLI_VERSION);",
  "String(value?.version || '') === MANAGED_CLI_VERSION ? MANAGED_CLI_VERSION : ''",
  "packageJson?.version !== MANAGED_CLI_VERSION",
  "descriptor?.version !== MANAGED_CLI_VERSION",
  "dependencies:{[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION}",
  "version:MANAGED_CLI_VERSION",
  "function scheduleManagedCliProvisioning()",
  "scheduleManagedCliProvisioning();",
]) assert.ok(manager.includes(marker), `P54 Manager provisioning contract missing: ${marker}`);

assert.ok(manager.includes("const MANAGED_CLI_RETRY_MS = 30 * 60 * 1000;"), 'P54 provisioning backoff must remain 30 minutes');
assert.ok(manager.includes("const MANAGED_CLI_INSTALL_TIMEOUT_MS = 5 * 60 * 1000;"), 'P54 provisioning timeout must remain 5 minutes');
assert.equal((manager.match(/function scheduleManagedCliProvisioning\(/g) || []).length, 1, 'P54 must retain one Manager provisioning scheduler');
assert.equal((manager.match(/async function provisionManagedCli\(/g) || []).length, 1, 'P54 must retain one Manager provisioning owner');
assert.equal(manager.includes('npm install -g'), false, 'P54 Manager must not add global npm mutation');
assert.equal(manager.includes('npm update'), false, 'P54 Manager must not add ad-hoc npm update mutation');

const managedIndex = cliRuntime.indexOf("launcherMeta.launcher = 'managed-direct';");
const directIndex = cliRuntime.indexOf("launcherMeta.launcher = 'direct';");
const npxIndex = cliRuntime.indexOf("launcherMeta.launcher = 'npx-fallback';");
assert.ok(managedIndex >= 0 && directIndex > managedIndex && npxIndex > directIndex, 'P54 launcher order must remain managed-direct -> direct -> npx fallback');
assert.equal((cliRuntime.match(/async function runCliProcess\(/g) || []).length, 1, 'P54 must retain one Engine CLI launcher authority');

assert.ok(sources.includes("runCliProcess(['orgs', 'list', '--json']"), 'P54 account capture must retain official orgs list JSON command');
assert.ok(sources.includes("runCli(['credits', '--json'])"), 'P54 credits bootstrap must retain official credits JSON command');
assert.match(sources, /['\"]usage['\"]/, 'P54 source graph must retain the official usage command family');

assert.ok(pluginCore.includes("const REQUIRED_BRIDGE_VERSION = '1.6.27';"), 'P54 Plugin Engine requirement must advance to 1.6.27');
assert.ok(pluginCore.includes("const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.2';"), 'P54 Plugin Manager requirement must advance to 1.3.2');
assert.ok(diagnostics.includes("String(runtimeBridge?.managerVersion || '') !== REQUIRED_BRIDGE_MANAGER_VERSION"), 'P54 readiness must retain canonical Manager authority');
assert.ok(diagnostics.includes('manager ${REQUIRED_BRIDGE_MANAGER_VERSION}'), 'P54 Stable contract must retain canonical Manager interpolation');
assert.ok(manager.includes("const MANAGER_VERSION = '1.3.2';"), 'P54 Manager semantic version must advance to 1.3.2');
assert.ok(manager.includes(`const PRODUCT_VERSION = '${release.productVersion}';`), 'P54 Manager Product identity must track current release authority');
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.27';"), 'P54 Manager bundled Engine version must advance to 1.6.27');

assert.equal(manifest.productVersion, release.productVersion);
assert.equal(manifest.components.plugin.version, release.productVersion);
assert.equal(manifest.components.bridge.requiredVersion, '1.6.27');
assert.equal(manifest.components.bridgeManager.version, '1.3.2');
assert.equal(manifest.components.bridgeManager.productVersion, release.productVersion);
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

const engineBytes = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`);
const managerBytes = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`);
const bootstrapBytes = fs.readFileSync(`${root}/runtime/bootstrap-bridge-manager.sh`);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const engineSha = sha256(engineBytes);
const managerSha = sha256(managerBytes);
const bootstrapSha = sha256(bootstrapBytes);
assert.equal(engineSha, manifest.components.bridge.sha256, 'P54 Engine hash must match manifest');
assert.equal(managerSha, manifest.components.bridgeManager.sha256, 'P54 Manager hash must match manifest');
assert.equal(bootstrapSha, manifest.components.bridgeManager.bootstrapSha256, 'P54 bootstrap hash must match manifest');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', 'P54 bootstrap must remain byte-identical to 5.87');

execFileSync(process.execPath, [`${root}/tools/build_usage_dashboard.cjs`, '--check'], {stdio:'pipe'});
execFileSync(process.execPath, [`${root}/tools/build_bridge_engine.cjs`, '--check'], {stdio:'pipe'});
for (const name of [
  'p52-managed-cli-engine-manager-pin-parity.cjs',
  'p53-stable-contract-manager-authority-single-source.cjs',
  'behavior-cli-launcher.cjs',
  'behavior-runtime-recovery.cjs',
  'p27-npx-cache-first-launcher.cjs',
  'p28-managed-direct-cli-runtime.cjs',
  'p50-service-tier-selection-source-fidelity.cjs',
  'e15-release-handoff-hygiene-contract.cjs',
]) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK|SKIP/, `P54 requires ${name} GREEN or historical exact-release SKIP`);
}

const suite = discoverTests();
for (const name of [
  'p52-managed-cli-engine-manager-pin-parity.cjs',
  'p53-stable-contract-manager-authority-single-source.cjs',
  'p54-llmgateway-cli-1140-managed-runtime-upgrade.cjs',
]) assert.ok(suite.regressions.includes(name), `P54 registry must include ${name}`);

console.log('P54 LLM Gateway CLI 1.14.0 Managed Runtime Upgrade: OK · Engine/Manager target 1.14.0 · Engine 1.6.27 · Manager 1.3.2 · launcher/provisioning/source-truth preserved · contracts 1/1');
