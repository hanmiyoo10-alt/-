// P52 Managed CLI Engine/Manager Pin Parity
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
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.86') {
  console.log(`P52 Managed CLI Engine/Manager Pin Parity: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.86`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.26');
assert.equal(release.managerVersion, '1.3.1');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const enginePin = engineCore.match(/const CLI_VERSION = process\.env\.LLMGATEWAY_CLI_VERSION \|\| '([^']+)';/)?.[1] || '';
const managerPin = manager.match(/const MANAGED_CLI_VERSION = '([^']+)';/)?.[1] || '';
assert.equal(enginePin, '1.10.0', 'P52 Engine managed CLI target must be exactly 1.10.0');
assert.equal(managerPin, '1.10.0', 'P52 Manager managed CLI target must be exactly 1.10.0');
assert.equal(managerPin, enginePin, 'P52 Engine and Manager managed CLI targets must remain identical');
assert.ok(engine.includes("const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';"), 'P52 generated Engine must retain the exact 1.10.0 pin');
assert.equal(engine.includes("|| '1.9.0';"), false, 'P52 Engine must not retain the stale 1.9.0 default');
assert.equal(manager.includes("const MANAGED_CLI_VERSION = '1.9.0';"), false, 'P52 Manager must not retain the stale 1.9.0 target');

for (const marker of [
  "const MANAGED_CLI_VERSION_ROOT = path.join(MANAGED_CLI_ROOT, MANAGED_CLI_VERSION);",
  "String(value?.version || '') === MANAGED_CLI_VERSION ? MANAGED_CLI_VERSION : ''",
  "packageJson?.version !== MANAGED_CLI_VERSION",
  "descriptor?.version !== MANAGED_CLI_VERSION",
  "dependencies:{[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION}",
  "version:MANAGED_CLI_VERSION",
  "function scheduleManagedCliProvisioning()",
  "scheduleManagedCliProvisioning();",
]) assert.ok(manager.includes(marker), `P52 Manager parity/provisioning contract missing: ${marker}`);

assert.ok(manager.includes("const MANAGED_CLI_RETRY_MS = 30 * 60 * 1000;"), 'P52 provisioning backoff must remain 30 minutes');
assert.ok(manager.includes("const MANAGED_CLI_INSTALL_TIMEOUT_MS = 5 * 60 * 1000;"), 'P52 provisioning timeout must remain 5 minutes');
assert.equal((manager.match(/function scheduleManagedCliProvisioning\(/g) || []).length, 1, 'P52 must retain one Manager provisioning scheduler');
assert.equal((manager.match(/async function provisionManagedCli\(/g) || []).length, 1, 'P52 must retain one Manager provisioning owner');
assert.equal(manager.includes('npm install -g'), false, 'P52 Manager must not add global npm mutation');
assert.equal(manager.includes('npm update'), false, 'P52 Manager must not add ad-hoc npm update mutation');

const managedIndex = cliRuntime.indexOf("launcherMeta.launcher = 'managed-direct';");
const directIndex = cliRuntime.indexOf("launcherMeta.launcher = 'direct';");
const npxIndex = cliRuntime.indexOf("launcherMeta.launcher = 'npx-fallback';");
assert.ok(managedIndex >= 0 && directIndex > managedIndex && npxIndex > directIndex, 'P52 launcher order must remain managed-direct -> direct -> npx fallback');
assert.equal((cliRuntime.match(/async function runCliProcess\(/g) || []).length, 1, 'P52 must retain one Engine CLI launcher authority');

assert.ok(manager.includes("const MANAGER_VERSION = '1.3.1';"), 'P52 Manager version must advance to 1.3.1');
assert.ok(manager.includes(`const PRODUCT_VERSION = '${release.productVersion}';`), 'P52 Manager product identity must track the current release authority');
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.26';"), 'P52 Manager bundled Engine version must remain 1.6.26');
assert.ok(pluginCore.includes("const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.1';"), 'P52 plugin readiness requirement must track Manager 1.3.1');
assert.ok(diagnostics.includes("String(runtimeBridge?.managerVersion || '') !== REQUIRED_BRIDGE_MANAGER_VERSION"), 'P52 stable readiness must use the shared Manager requirement');
assert.equal(diagnostics.includes("managerVersion || '') !== '1.3.0'"), false, 'P52 stable readiness must not retain the stale Manager 1.3.0 literal');
assert.equal(manifest.productVersion, release.productVersion);
assert.equal(manifest.components.plugin.version, release.productVersion);
assert.equal(manifest.components.bridge.requiredVersion, '1.6.26');
assert.equal(manifest.components.bridgeManager.version, '1.3.1');
assert.equal(manifest.components.bridgeManager.productVersion, release.productVersion);
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

const engineBytes = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`);
const managerBytes = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`);
const bootstrapBytes = fs.readFileSync(`${root}/runtime/bootstrap-bridge-manager.sh`);
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
const managerSha = crypto.createHash('sha256').update(managerBytes).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(bootstrapBytes).digest('hex');
assert.equal(engineSha, 'c907c0661943ecf436116780dcd77eeaf07956f8c53ad8a951ad406001de4b67', 'P52 Engine 1.6.26 must remain byte-identical to 5.85');
assert.equal(engineSha, manifest.components.bridge.sha256, 'P52 Engine hash must match manifest');
assert.equal(managerSha, manifest.components.bridgeManager.sha256, 'P52 Manager hash must match manifest');
assert.equal(bootstrapSha, manifest.components.bridgeManager.bootstrapSha256, 'P52 bootstrap hash must match manifest');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', 'P52 bootstrap must remain byte-identical');
execFileSync(process.execPath, [`${root}/tools/build_bridge_engine.cjs`, '--check'], {stdio:'pipe'});

for (const name of [
  'behavior-cli-launcher.cjs',
  'behavior-runtime-recovery.cjs',
  'p27-npx-cache-first-launcher.cjs',
  'p28-managed-direct-cli-runtime.cjs',
  'p50-service-tier-selection-source-fidelity.cjs',
  'e15-release-handoff-hygiene-contract.cjs',
]) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK|SKIP/, `P52 requires ${name} GREEN or historical exact-release SKIP`);
}

const suite = discoverTests();
for (const name of [
  'p50-service-tier-selection-source-fidelity.cjs',
  'p51-llmgateway-cli-1100-upgrade.cjs',
  'p52-managed-cli-engine-manager-pin-parity.cjs',
]) assert.ok(suite.regressions.includes(name), `P52 registry must include ${name}`);

console.log('P52 Managed CLI Engine/Manager Pin Parity: OK · Engine/Manager target 1.10.0 · Manager readiness identity 1.3.1 · Engine 1.6.26 byte-identical · provisioning/fallback ownership preserved · contracts 1/1');
