// P53 Stable Contract Manager Authority Single Source
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
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.87') {
  console.log(`P53 Stable Contract Manager Authority Single Source: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.87`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.26');
assert.equal(release.managerVersion, '1.3.1');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

assert.ok(
  pluginCore.includes("const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.1';"),
  'P53 canonical Plugin Manager requirement must remain 1.3.1',
);
assert.ok(
  diagnostics.includes("String(runtimeBridge?.managerVersion || '') !== REQUIRED_BRIDGE_MANAGER_VERSION"),
  'P53 stable readiness must compare runtime Manager identity against the canonical constant',
);

const stableContractSource = '`Stable contract: engine ${REQUIRED_BRIDGE_VERSION} · manager ${REQUIRED_BRIDGE_MANAGER_VERSION} · snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION} · state v3`';
assert.equal((diagnostics.match(/Stable contract:/g) || []).length, 1, 'P53 source must retain exactly one Stable contract renderer');
assert.ok(diagnostics.includes(stableContractSource), 'P53 source Stable contract must interpolate the canonical Manager requirement');
assert.ok(latest.includes(stableContractSource), 'P53 built Plugin Stable contract must interpolate the canonical Manager requirement');

const numericManagerLiteral = /Stable contract:[^`\n]*manager\s+\d+\.\d+\.\d+/;
assert.equal(numericManagerLiteral.test(diagnostics), false, 'P53 source must not own a numeric Manager literal in Stable contract text');
assert.equal(numericManagerLiteral.test(latest), false, 'P53 built Plugin must not own a numeric Manager literal in Stable contract text');
assert.equal(diagnostics.includes('Stable contract: engine ${REQUIRED_BRIDGE_VERSION} · manager 1.3.0'), false, 'P53 stale 1.3.0 Stable contract text must be absent');
assert.equal(latest.includes('Stable contract: engine ${REQUIRED_BRIDGE_VERSION} · manager 1.3.0'), false, 'P53 built Plugin stale 1.3.0 Stable contract text must be absent');

const stableLine = diagnostics.split('\n').find(line => line.includes('Stable contract:')) || '';
assert.ok(stableLine, 'P53 Stable contract source line must exist');
assert.doesNotMatch(
  stableLine,
  /nativeFetch\(|fetch\(|runCli\(|setTimeout\(|setInterval\(|store\.setItem|addEventListener|scheduleRefresh|enqueueRefresh/,
  'P53 presentation repair must not introduce I/O, persistence, listener, timer, or scheduler ownership',
);

assert.ok(manager.includes("const MANAGER_VERSION = '1.3.1';"), 'P53 Manager semantic version must remain 1.3.1');
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.87';"), 'P53 Manager Product sync identity must advance to 5.87');
assert.ok(manager.includes("const MANAGED_CLI_VERSION = '1.10.0';"), 'P53 Manager managed CLI pin must remain 1.10.0');
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.26';"), 'P53 Manager bundled Engine version must remain 1.6.26');

assert.equal(manifest.productVersion, '3.0.0-alpha.5.87');
assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.87');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.26');
assert.equal(manifest.components.bridgeManager.version, '1.3.1');
assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-alpha.5.87');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

const engineBytes = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`);
const managerBytes = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`);
const bootstrapBytes = fs.readFileSync(`${root}/runtime/bootstrap-bridge-manager.sh`);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const engineSha = sha256(engineBytes);
const managerSha = sha256(managerBytes);
const bootstrapSha = sha256(bootstrapBytes);
assert.equal(engineSha, 'c907c0661943ecf436116780dcd77eeaf07956f8c53ad8a951ad406001de4b67', 'P53 Engine 1.6.26 must remain byte-identical to 5.86');
assert.equal(engineSha, manifest.components.bridge.sha256, 'P53 Engine hash must match manifest');
assert.equal(managerSha, manifest.components.bridgeManager.sha256, 'P53 Manager hash must match manifest');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', 'P53 bootstrap must remain byte-identical');
assert.equal(bootstrapSha, manifest.components.bridgeManager.bootstrapSha256, 'P53 bootstrap hash must match manifest');

execFileSync(process.execPath, [`${root}/tools/build_usage_dashboard.cjs`, '--check'], {stdio:'pipe'});
execFileSync(process.execPath, [`${root}/tools/build_bridge_engine.cjs`, '--check'], {stdio:'pipe'});

for (const name of [
  'p52-managed-cli-engine-manager-pin-parity.cjs',
  'behavior-cli-launcher.cjs',
  'behavior-runtime-recovery.cjs',
  'e15-release-handoff-hygiene-contract.cjs',
]) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK|SKIP/, `P53 requires ${name} GREEN or historical exact-release SKIP`);
}

const suite = discoverTests();
for (const name of [
  'p52-managed-cli-engine-manager-pin-parity.cjs',
  'p53-stable-contract-manager-authority-single-source.cjs',
]) assert.ok(suite.regressions.includes(name), `P53 registry must include ${name}`);

console.log('P53 Stable Contract Manager Authority Single Source: OK · readiness/display share REQUIRED_BRIDGE_MANAGER_VERSION · Manager 1.3.1 · Engine 1.6.26 exact · CLI 1.10.0 · contracts 1/1');
