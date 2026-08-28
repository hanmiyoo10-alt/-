// P51 LLM Gateway CLI 1.10.0 Managed Runtime Upgrade
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const engineCore = fs.readFileSync(`${root}/runtime-src/bridge-engine/00-core.part.mjs`, 'utf8');
const cliRuntime = fs.readFileSync(`${root}/runtime-src/bridge-engine/30-cli-runtime.part.mjs`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.85') {
  console.log(`P51 LLM Gateway CLI 1.10.0 Upgrade: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.85`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.26');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
assert.ok(engineCore.includes("const VERSION = '1.6.26';"), 'P51 canonical Engine source must be 1.6.26');
assert.ok(engineCore.includes("const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';"), 'P51 canonical managed CLI pin must be 1.10.0');
assert.equal(engineCore.includes("|| '1.9.0';"), false, 'P51 canonical Engine source must not retain the 1.9.0 default pin');
assert.ok(engine.includes("const VERSION = '1.6.26';"), 'P51 generated Engine must be 1.6.26');
assert.ok(engine.includes("const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';"), 'P51 generated Engine must embed the 1.10.0 pin');
assert.equal(engine.includes("|| '1.9.0';"), false, 'P51 generated Engine must not retain the 1.9.0 default pin');

for (const marker of [
  "const MANAGED_CLI_VERSION_ROOT = path.join(MANAGED_CLI_ROOT, CLI_VERSION);",
  "String(value?.version || '') === CLI_VERSION ? CLI_VERSION : ''",
  "descriptor?.version !== CLI_VERSION",
  "return {state:'ready',version:CLI_VERSION,provisioning:'ok',entry};",
  "launcherMeta.launcher = 'managed-direct';",
  "launcherMeta.launcher = 'direct';",
  "launcherMeta.launcher = 'npx-fallback';",
  "`@llmgateway/cli@${CLI_VERSION}`",
]) assert.ok(`${engineCore}\n${cliRuntime}`.includes(marker), `P51 managed CLI contract missing: ${marker}`);

const managedIndex = cliRuntime.indexOf("launcherMeta.launcher = 'managed-direct';");
const directIndex = cliRuntime.indexOf("launcherMeta.launcher = 'direct';");
const npxIndex = cliRuntime.indexOf("launcherMeta.launcher = 'npx-fallback';");
assert.ok(managedIndex >= 0 && directIndex > managedIndex && npxIndex > directIndex, 'P51 launcher order must stay managed-direct -> direct -> npx fallback');
assert.equal((cliRuntime.match(/async function runCliProcess\(/g) || []).length, 1, 'P51 must retain one CLI launcher authority');
assert.equal((cliRuntime.match(/@llmgateway\/cli@\$\{CLI_VERSION\}/g) || []).length, 2, 'P51 both npx policy branches must use the exact shared CLI pin');
assert.equal(cliRuntime.includes('npm install -g'), false, 'P51 Engine runtime must not add global npm mutation');
assert.equal(cliRuntime.includes('npm update'), false, 'P51 Engine runtime must not add ad-hoc update mutation');

assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.85';"), 'P51 Manager product identity must track 5.85');
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.26';"), 'P51 Manager bundled Engine version must track 1.6.26');
assert.equal(manifest.productVersion, '3.0.0-alpha.5.85');
assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.85');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.26');
assert.equal(manifest.components.bridgeManager.version, '1.3.0');
assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-alpha.5.85');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

const engineSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bridge-engine.mjs`)).digest('hex');
const managerSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bridge-manager.cjs`)).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bootstrap-bridge-manager.sh`)).digest('hex');
assert.equal(engineSha, manifest.components.bridge.sha256, 'P51 Engine hash must match manifest');
assert.equal(managerSha, manifest.components.bridgeManager.sha256, 'P51 Manager hash must match manifest');
assert.equal(bootstrapSha, manifest.components.bridgeManager.bootstrapSha256, 'P51 bootstrap hash must match manifest');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', 'P51 bootstrap must remain byte-identical');
execFileSync(process.execPath, [`${root}/tools/build_bridge_engine.cjs`, '--check'], {stdio:'pipe'});

for (const name of [
  'behavior-cli-launcher.cjs',
  'behavior-organization-capture.cjs',
  'behavior-request-provenance.cjs',
  'p27-npx-cache-first-launcher.cjs',
  'p28-managed-direct-cli-runtime.cjs',
  'p50-service-tier-selection-source-fidelity.cjs',
  'e15-release-handoff-hygiene-contract.cjs',
]) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK|SKIP/, `P51 requires ${name} GREEN or historical exact-release SKIP`);
}

const suite = discoverTests();
for (const name of [
  'p49-release-notes-diagnostic-guidance.cjs',
  'p50-service-tier-selection-source-fidelity.cjs',
  'p51-llmgateway-cli-1100-upgrade.cjs',
]) assert.ok(suite.regressions.includes(name), `P51 registry must include ${name}`);

console.log('P51 LLM Gateway CLI 1.10.0 Upgrade: OK · exact managed pin 1.10.0 · launcher order preserved · Engine 1.6.26 · Manager 1.3.0 · contracts 1/1 · no new I/O owner');
