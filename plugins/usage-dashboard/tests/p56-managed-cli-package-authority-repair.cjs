// P56 Managed CLI Package Authority Repair
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const pluginCore = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const pluginBridgeIo = fs.readFileSync(`${root}/src/20-bridge-io.part.js`, 'utf8');
const engineCore = fs.readFileSync(`${root}/runtime-src/bridge-engine/00-core.part.mjs`, 'utf8');
const cliRuntime = fs.readFileSync(`${root}/runtime-src/bridge-engine/30-cli-runtime.part.mjs`, 'utf8');
const sources = fs.readFileSync(`${root}/runtime-src/bridge-engine/40-sources.part.mjs`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.90') {
  console.log(`P56 Managed CLI Package Authority Repair: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.90`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.28');
assert.equal(release.managerVersion, '1.3.4');
assert.equal(release.managedCliVersion, '1.10.0');
assert.ok(release.managedCliAuthority && typeof release.managedCliAuthority === 'object' && !Array.isArray(release.managedCliAuthority));
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const authority = release.managedCliAuthority;
assert.equal(authority.schemaVersion, 1);
assert.equal(authority.package, '@llmgateway/cli');
assert.equal(authority.version, '1.10.0');
assert.equal(authority.upstreamRepository, 'theopenco/llmgateway-templates');
assert.equal(authority.tagNamespace, '@llmgateway/cli@');
assert.equal(authority.tag, '@llmgateway/cli@1.10.0');
assert.equal(authority.tagCommit, '6b1cda1988f32010a9b090c00eb9b2fe672145fe');
assert.equal(authority.parentProjectRepository, 'theopenco/llmgateway');
assert.equal(authority.parentProjectReleaseIsPackageAuthority, false);

const enginePin = engineCore.match(/const CLI_VERSION = process\.env\.LLMGATEWAY_CLI_VERSION \|\| '([^']+)';/)?.[1] || '';
const managerPin = manager.match(/const MANAGED_CLI_VERSION = '([^']+)';/)?.[1] || '';
assert.equal(enginePin, authority.version, 'P56 Engine CLI pin must equal package-specific authority');
assert.equal(managerPin, authority.version, 'P56 Manager CLI pin must equal package-specific authority');
assert.equal(enginePin, managerPin, 'P56 Engine/Manager managed CLI pins must remain identical');
assert.equal(enginePin, '1.10.0');
assert.ok(engine.includes("const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';"), 'P56 generated Engine must use actual CLI package authority');
assert.equal(engineCore.includes("|| '1.14.0';"), false, 'P56 canonical Engine must remove invalid CLI 1.14.0 authority');
assert.equal(engine.includes("|| '1.14.0';"), false, 'P56 generated Engine must remove invalid CLI 1.14.0 authority');
assert.equal(manager.includes("const MANAGED_CLI_VERSION = '1.14.0';"), false, 'P56 Manager must remove invalid CLI 1.14.0 authority');

assert.ok(pluginCore.includes("const VERSION = '3.0.0-alpha.5.90';"));
assert.ok(pluginCore.includes("const REQUIRED_BRIDGE_VERSION = '1.6.28';"));
assert.ok(pluginCore.includes("const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';"));
assert.ok(engineCore.includes("const VERSION = '1.6.28';"));
assert.ok(manager.includes("const MANAGER_VERSION = '1.3.4';"));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.90';"));
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.28';"));

for (const marker of [
  "String(identity?.bridgeVersion || '') === BUNDLED_ENGINE_VERSION",
  "async function waitForManagedEngine(expected, expectedVersion = '', timeoutMs = 12000)",
  "if (expectedVersion && liveVersion !== expectedVersion)",
  "managed engine version mismatch: expected ${expectedVersion}, got ${liveVersion || 'unknown'}",
  "async function startManagedCandidate(candidate, expectedVersion = '')",
  "return waitForManagedEngine(candidate, expectedVersion);",
  "const verified = await startManagedCandidate(next, BUNDLED_ENGINE_VERSION);",
]) assert.ok(manager.includes(marker), `P56 must preserve 5.89 Manager convergence marker: ${marker}`);

for (const marker of [
  "if (!status?.connected || status.engineManaged !== true) return status;",
  "const isCurrentBundledEngine = value => value?.engineBundled === true",
  "String(value.engineVersion || '') === REQUIRED_BRIDGE_VERSION",
  "const fresh = await fetchBridgeManagerStatus(true);",
  "engineBundleSyncState:'capability-missing'",
  "engineBundleSyncState:'target-missing'",
  "engineBundleSyncState:'target-mismatch'",
]) assert.ok(pluginBridgeIo.includes(marker), `P56 must preserve 5.89 Plugin convergence marker: ${marker}`);

for (const marker of [
  "const MANAGED_CLI_VERSION_ROOT = path.join(MANAGED_CLI_ROOT, MANAGED_CLI_VERSION);",
  "String(value?.version || '') === MANAGED_CLI_VERSION ? MANAGED_CLI_VERSION : ''",
  "packageJson?.version !== MANAGED_CLI_VERSION",
  "descriptor?.version !== MANAGED_CLI_VERSION",
  "dependencies:{[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION}",
  "version:MANAGED_CLI_VERSION",
  "function scheduleManagedCliProvisioning()",
  "scheduleManagedCliProvisioning();",
]) assert.ok(manager.includes(marker), `P56 Manager provisioning contract missing: ${marker}`);
assert.ok(manager.includes("const MANAGED_CLI_RETRY_MS = 30 * 60 * 1000;"));
assert.ok(manager.includes("const MANAGED_CLI_INSTALL_TIMEOUT_MS = 5 * 60 * 1000;"));
assert.equal((manager.match(/function scheduleManagedCliProvisioning\(/g) || []).length, 1);
assert.equal((manager.match(/async function provisionManagedCli\(/g) || []).length, 1);
assert.equal(manager.includes('npm install -g'), false);
assert.equal(manager.includes('npm update'), false);

const managedIndex = cliRuntime.indexOf("launcherMeta.launcher = 'managed-direct';");
const directIndex = cliRuntime.indexOf("launcherMeta.launcher = 'direct';");
const npxIndex = cliRuntime.indexOf("launcherMeta.launcher = 'npx-fallback';");
assert.ok(managedIndex >= 0 && directIndex > managedIndex && npxIndex > directIndex, 'P56 launcher order must remain managed-direct -> direct -> npx-fallback');
assert.equal((cliRuntime.match(/async function runCliProcess\(/g) || []).length, 1);
assert.ok(sources.includes("runCliProcess(['orgs', 'list', '--json']"));
assert.ok(sources.includes("runCli(['credits', '--json'])"));
assert.equal(/runCli(?:Process)?\(\s*\[\s*['"]usage['"]/.test(sources), false, 'P56 must not add a usage CLI request');
assert.ok(sources.includes("captureAccountDetailsViaCliSession('24h')"));

// UD_HISTORICAL_VERSION_LOCK — exact 5.90 product fixture owned by P56.
assert.equal(manifest.productVersion, '3.0.0-alpha.5.90');
assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.90');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.28');
assert.equal(manifest.components.bridgeManager.version, '1.3.4');
// UD_HISTORICAL_VERSION_LOCK — exact 5.90 Manager product fixture owned by P56.
assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-alpha.5.90');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const engineBytes = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`);
const managerBytes = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`);
const bootstrapBytes = fs.readFileSync(`${root}/runtime/bootstrap-bridge-manager.sh`);
const engineSha = sha256(engineBytes);
const managerSha = sha256(managerBytes);
const bootstrapSha = sha256(bootstrapBytes);
assert.equal(engineSha, manifest.components.bridge.sha256, 'P56 Engine hash must match manifest');
assert.equal(managerSha, manifest.components.bridgeManager.sha256, 'P56 Manager hash must match manifest');
assert.ok(manager.includes(`const BUNDLED_ENGINE_SHA256 = '${engineSha}';`), 'P56 Manager bundled Engine hash must match rebuilt Engine');
assert.equal(bootstrapSha, manifest.components.bridgeManager.bootstrapSha256, 'P56 bootstrap hash must match manifest');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', 'P56 bootstrap must remain byte-identical');

execFileSync(process.execPath, [`${root}/tools/build_usage_dashboard.cjs`, '--check'], {stdio:'pipe'});
execFileSync(process.execPath, [`${root}/tools/build_bridge_engine.cjs`, '--check'], {stdio:'pipe'});
for (const name of [
  'managed-cli-package-authority-contract.cjs',
  'p52-managed-cli-engine-manager-pin-parity.cjs',
  'p54-llmgateway-cli-1140-managed-runtime-upgrade.cjs',
  'p55-physical-engine-convergence-repair.cjs',
  'behavior-cli-launcher.cjs',
  'behavior-runtime-recovery.cjs',
  'e15-release-handoff-hygiene-contract.cjs',
]) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK|SKIP/, `P56 requires ${name} GREEN or historical exact-release SKIP`);
}

const suite = discoverTests();
assert.ok(suite.foundation.includes('managed-cli-package-authority-contract.cjs'), 'P56 generic managed CLI authority contract must stay in foundation registry');
assert.ok(suite.regressions.includes('p56-managed-cli-package-authority-repair.cjs'), 'P56 must stay in regression registry');

console.log('P56 Managed CLI Package Authority Repair: OK · package-specific @llmgateway/cli 1.10.0 authority restored · Engine 1.6.28 / Manager 1.3.4 · 5.89 convergence preserved · contracts 1/1');
