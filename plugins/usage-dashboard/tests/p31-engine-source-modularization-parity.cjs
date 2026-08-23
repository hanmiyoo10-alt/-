'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const root = 'plugins/usage-dashboard';
const targetProduct = '3.0.0-alpha.5.69';
const baselineProduct = '3.0.0-alpha.5.68';
const targetEngine = '1.6.20';
const baselineEngine = '1.6.19';
const baselineEngineSha = 'f17d689f39bd469bcadf1a2125313146cd6e04cb38299a5b4583d903a696cf09';
const baselineManagerSha = '3bd9fa2b41db53cf68eea20bc85e198db8185c7eb52ba412ff91465c8f555115';
const sourceDir = `${root}/runtime-src/bridge-engine`;
const artifactPath = `${root}/runtime/bridge-engine.mjs`;
const managerPath = `${root}/runtime/bridge-manager.cjs`;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

const release = assertCurrentReleaseArtifacts();
if (release.productVersion !== targetProduct) {
  console.log(`P31 Engine Source Modularization Parity: SKIP · candidate ${release.productVersion} is not ${targetProduct}`);
  process.exit(0);
}

assert.equal(release.engineVersion, targetEngine);
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const partsManifest = JSON.parse(fs.readFileSync(`${sourceDir}/parts.json`, 'utf8'));
const expectedParts = [
  '00-core.part.mjs',
  '10-attribution.part.mjs',
  '20-cache-circuit.part.mjs',
  '30-cli-runtime.part.mjs',
  '40-sources.part.mjs',
  '50-organization-capture.part.mjs',
  '60-snapshot-scheduler.part.mjs',
  '70-http-diagnostics.part.mjs',
];
assert.equal(partsManifest.schemaVersion, 1);
assert.equal(partsManifest.mode, 'shared-lexical-concatenation');
assert.equal(partsManifest.artifact, artifactPath);
assert.deepEqual(partsManifest.parts, expectedParts);
assert.equal(new Set(partsManifest.parts).size, expectedParts.length);

const actualParts = fs.readdirSync(sourceDir).filter(name => name.endsWith('.part.mjs')).sort();
assert.deepEqual(actualParts, expectedParts.slice().sort(), 'Engine source tree must contain exactly the manifest parts');
for (const name of expectedParts) {
  const stat = fs.statSync(path.join(sourceDir, name));
  assert.ok(stat.isFile() && stat.size > 0, `${name} must be a non-empty source part`);
}

execFileSync(process.execPath, [`${root}/tools/build_bridge_engine.cjs`, '--check'], {stdio:'pipe'});
const rebuilt = Buffer.concat(expectedParts.map(name => fs.readFileSync(path.join(sourceDir, name))));
const artifact = fs.readFileSync(artifactPath);
assert.ok(rebuilt.equals(artifact), 'generated Engine artifact must be exact concatenation of ordered source parts');
assert.ok(artifact.toString('utf8').startsWith('#!/usr/bin/env node\n'));

const engineText = artifact.toString('utf8');
assert.equal((engineText.match(new RegExp(`const VERSION = '${targetEngine.replaceAll('.', '\\.')}'`, 'g')) || []).length, 1);
const normalizedEngine = engineText.replace(
  `const VERSION = '${targetEngine}';`,
  `const VERSION = '${baselineEngine}';`,
);
assert.equal(
  sha256(Buffer.from(normalizedEngine, 'utf8')),
  baselineEngineSha,
  '5.69 Engine runtime bytes may differ from verified 1.6.19 only by the Engine VERSION literal',
);
const candidateEngineSha = sha256(artifact);

const manager = fs.readFileSync(managerPath, 'utf8');
assert.ok(manager.includes(`const BUNDLED_ENGINE_VERSION = '${targetEngine}';`));
assert.ok(manager.includes(`const BUNDLED_ENGINE_SHA256 = '${candidateEngineSha}';`));
const normalizedManager = manager
  .replace(`const PRODUCT_VERSION = '${targetProduct}';`, `const PRODUCT_VERSION = '${baselineProduct}';`)
  .replace(`const BUNDLED_ENGINE_VERSION = '${targetEngine}';`, `const BUNDLED_ENGINE_VERSION = '${baselineEngine}';`)
  .replace(`const BUNDLED_ENGINE_SHA256 = '${candidateEngineSha}';`, `const BUNDLED_ENGINE_SHA256 = '${baselineEngineSha}';`);
assert.ok(normalizedManager.includes(`const PRODUCT_VERSION = '${baselineProduct}';`));
assert.ok(normalizedManager.includes(`const BUNDLED_ENGINE_VERSION = '${baselineEngine}';`));
assert.equal(
  sha256(Buffer.from(normalizedManager, 'utf8')),
  baselineManagerSha,
  'Manager functional body may differ only by Product and bundled-Engine identity synchronization',
);

for (const marker of [
  'const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));',
  'timeout: 25_000',
  'const SECONDARY_REFRESH_CONCURRENCY = 1;',
  'const SECONDARY_REFRESH_MAX_KEYS = 32;',
  "launcherMeta.launcher = 'managed-direct';",
  "launcherMeta.launcher = 'direct';",
  "launcherMeta.launcher = 'npx-fallback';",
  'if (CLI_CONCURRENCY < 2)',
  "['7d','30d'].includes(String(range))",
  'foregroundSnapshotsActive > 0',
]) {
  assert.ok(engineText.includes(marker), `protected Engine invariant missing after modularization: ${marker}`);
}

const workflow = fs.readFileSync(release.validatorWorkflow, 'utf8');
assert.ok(workflow.includes('node plugins/usage-dashboard/tools/build_bridge_engine.cjs --write'));
assert.ok(workflow.includes('node plugins/usage-dashboard/tools/build_bridge_engine.cjs --check'));
assert.ok(workflow.includes('plugins/usage-dashboard/runtime-src'), 'candidate validation must retain development Engine sources on main');
for (const behaviorTest of [
  'behavior-cli-launcher.cjs',
  'behavior-cache-runtime.cjs',
  'behavior-snapshot-scheduler.cjs',
  'behavior-snapshot-attribution.cjs',
  'behavior-organization-capture.cjs',
  'p23-credits-usage-early-start.cjs',
  'p25-long-window-critical-path-decoupling.cjs',
  'p27-npx-cache-first-launcher.cjs',
  'p28-managed-direct-cli-runtime.cjs',
  'p33-generic-release-controller.cjs',
]) assert.ok(workflow.includes(behaviorTest), `process/incident regression must remain active: ${behaviorTest}`);
assert.match(workflow, /permissions:\s*\n\s*contents: read/);
assert.equal(workflow.includes('cp -R plugins/usage-dashboard/runtime-src'), false, 'development source tree must never become a release artifact');
assert.equal(workflow.includes('contents: write'), false, 'P31 validation must stay read-only');
const selfSource = fs.readFileSync(__filename, 'utf8');
const vmModule = ['node', 'vm'].join(':');
assert.equal(selfSource.includes(`require('${vmModule}')`) || selfSource.includes(`require("${vmModule}")`), false, 'P31 must not import a VM execution module');

console.log(`P31 Engine Source Modularization Parity: OK · ${expectedParts.length} shared-lexical parts rebuild Engine ${targetEngine}; normalized runtime bytes equal ${baselineEngine}; Manager 1.3.0 lifecycle body and 1/1 contracts preserved`);
