const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {assertReleaseSpec} = require('../../tools/release_spec_contract_e19.cjs');
const {resolveReleaseEvidenceView} = require('../../tools/release_evidence_view_e21.cjs');
const {LEGACY_ROOT, normalizeRoot} = require('../../tools/release_path_profile.cjs');

const ROOT = process.cwd();
const RELEASES_ROOT = path.join(ROOT, '.github/usage-dashboard/releases');

function resolveSourceRoot(value = process.env.UD_SOURCE_ROOT || LEGACY_ROOT) {
  return normalizeRoot(String(value));
}

function pluginRoot(sourceRoot = resolveSourceRoot()) {
  return path.join(ROOT, resolveSourceRoot(sourceRoot));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function validateSpecPath(specPath) {
  const absolute = path.resolve(ROOT, specPath);
  const relative = path.relative(RELEASES_ROOT, absolute);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `release spec path denied: ${specPath}`);
  assert.equal(path.extname(absolute), '.json', `release spec must be JSON: ${specPath}`);
  assert.ok(fs.existsSync(absolute), `release spec missing: ${specPath}`);
  return absolute;
}

function discoverSpecPath(sourceRoot = resolveSourceRoot()) {
  const requested = String(process.env.UD_RELEASE_SPEC || '').trim();
  if (requested) return validateSpecPath(requested);

  const root = pluginRoot(sourceRoot);
  const manifest = readJson(path.join(root, 'runtime/product-manifest.json'));
  const productVersion = String(manifest.productVersion || '');
  const matches = fs.readdirSync(RELEASES_ROOT)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(RELEASES_ROOT, file))
    .filter(file => String(readJson(file).productVersion || '') === productVersion);
  assert.equal(matches.length, 1, `expected exactly one release spec for ${productVersion}, found ${matches.length}`);
  return matches[0];
}

function loadCurrentRelease(sourceRoot = resolveSourceRoot()) {
  const specPath = discoverSpecPath(sourceRoot);
  const spec = assertReleaseSpec(readJson(specPath), path.relative(ROOT, specPath));
  return Object.freeze({
    ...spec,
    specPath:path.relative(ROOT, specPath),
    currentMemory:`Current release implementation: \`${spec.productVersion} — ${spec.releaseTitle}\``,
    evidenceView:resolveReleaseEvidenceView(spec),
  });
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function assertCurrentReleaseArtifacts(release = null, sourceRoot = resolveSourceRoot()) {
  const selectedRoot = resolveSourceRoot(sourceRoot);
  const currentRelease = release || loadCurrentRelease(selectedRoot);
  const root = pluginRoot(selectedRoot);
  const latestPath = path.join(root, 'latest.js');
  const corePath = path.join(root, 'src/00-runtime-core.part.js');
  const enginePath = path.join(root, 'runtime/bridge-engine.mjs');
  const managerPath = path.join(root, 'runtime/bridge-manager.cjs');
  const manifest = readJson(path.join(root, 'runtime/product-manifest.json'));
  const sourceManifest = readJson(path.join(root, 'src/manifest.json'));
  const latest = fs.readFileSync(latestPath, 'utf8');
  const core = fs.readFileSync(corePath, 'utf8');
  const engine = fs.readFileSync(enginePath, 'utf8');
  const manager = fs.readFileSync(managerPath, 'utf8');

  assert.equal(manifest.productVersion, currentRelease.productVersion);
  assert.equal(manifest.components.plugin.version, currentRelease.productVersion);
  assert.equal(manifest.components.bridge.requiredVersion, currentRelease.engineVersion);
  assert.equal(manifest.components.bridgeManager.version, currentRelease.managerVersion);
  assert.equal(manifest.components.bridgeManager.productVersion, currentRelease.productVersion);
  assert.equal(manifest.contracts.snapshot, currentRelease.snapshotContract);
  assert.equal(manifest.contracts.recentRequest, currentRelease.recentRequestContract);
  assert.equal(sourceManifest.version, currentRelease.productVersion);
  assert.equal(sourceManifest.artifactSha256, sha256(latestPath));
  assert.equal(manifest.components.bridge.sha256, sha256(enginePath));
  assert.equal(manifest.components.bridgeManager.sha256, sha256(managerPath));

  assert.ok(latest.includes(`//@version ${currentRelease.productVersion}`));
  assert.ok(latest.includes(`const VERSION = '${currentRelease.productVersion}';`));
  assert.ok(core.includes(`const VERSION = '${currentRelease.productVersion}';`));
  assert.ok(core.includes(`const REQUIRED_BRIDGE_VERSION = '${currentRelease.engineVersion}';`));
  assert.ok(engine.includes(`const VERSION = '${currentRelease.engineVersion}';`));
  assert.ok(manager.includes(`const MANAGER_VERSION = '${currentRelease.managerVersion}';`));
  assert.ok(manager.includes(`const PRODUCT_VERSION = '${currentRelease.productVersion}';`));
  assert.ok(manager.includes(`const BUNDLED_ENGINE_VERSION = '${currentRelease.engineVersion}';`));
  assert.ok(fs.existsSync(path.join(ROOT, currentRelease.callerWorkflow)));
  assert.ok(fs.existsSync(path.join(ROOT, currentRelease.sharedWorkflow)));
  assert.ok(fs.existsSync(path.join(ROOT, currentRelease.validatorWorkflow)));
  assert.ok(fs.existsSync(path.join(ROOT, currentRelease.publisherWorkflow)));
  return currentRelease;
}

module.exports = {resolveSourceRoot, loadCurrentRelease, assertCurrentReleaseArtifacts};
