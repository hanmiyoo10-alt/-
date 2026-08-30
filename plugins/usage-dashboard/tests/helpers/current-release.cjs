const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {assertReleaseSpec} = require('../../tools/release_spec_contract_e19.cjs');

const ROOT = process.cwd();
const RELEASES_ROOT = path.join(ROOT, '.github/usage-dashboard/releases');
const PLUGIN_ROOT = path.join(ROOT, 'plugins/usage-dashboard');

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

function discoverSpecPath() {
  const requested = String(process.env.UD_RELEASE_SPEC || '').trim();
  if (requested) return validateSpecPath(requested);

  const manifest = readJson(path.join(PLUGIN_ROOT, 'runtime/product-manifest.json'));
  const productVersion = String(manifest.productVersion || '');
  const matches = fs.readdirSync(RELEASES_ROOT)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(RELEASES_ROOT, file))
    .filter(file => String(readJson(file).productVersion || '') === productVersion);
  assert.equal(matches.length, 1, `expected exactly one release spec for ${productVersion}, found ${matches.length}`);
  return matches[0];
}

function loadCurrentRelease() {
  const specPath = discoverSpecPath();
  const spec = assertReleaseSpec(readJson(specPath), path.relative(ROOT, specPath));
  return Object.freeze({
    ...spec,
    specPath:path.relative(ROOT, specPath),
    currentMemory:`Current release implementation: \`${spec.productVersion} — ${spec.releaseTitle}\``,
  });
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function assertCurrentReleaseArtifacts(release = loadCurrentRelease()) {
  const latestPath = path.join(PLUGIN_ROOT, 'latest.js');
  const corePath = path.join(PLUGIN_ROOT, 'src/00-runtime-core.part.js');
  const enginePath = path.join(PLUGIN_ROOT, 'runtime/bridge-engine.mjs');
  const managerPath = path.join(PLUGIN_ROOT, 'runtime/bridge-manager.cjs');
  const manifest = readJson(path.join(PLUGIN_ROOT, 'runtime/product-manifest.json'));
  const sourceManifest = readJson(path.join(PLUGIN_ROOT, 'src/manifest.json'));
  const latest = fs.readFileSync(latestPath, 'utf8');
  const core = fs.readFileSync(corePath, 'utf8');
  const engine = fs.readFileSync(enginePath, 'utf8');
  const manager = fs.readFileSync(managerPath, 'utf8');

  assert.equal(manifest.productVersion, release.productVersion);
  assert.equal(manifest.components.plugin.version, release.productVersion);
  assert.equal(manifest.components.bridge.requiredVersion, release.engineVersion);
  assert.equal(manifest.components.bridgeManager.version, release.managerVersion);
  assert.equal(manifest.components.bridgeManager.productVersion, release.productVersion);
  assert.equal(manifest.contracts.snapshot, release.snapshotContract);
  assert.equal(manifest.contracts.recentRequest, release.recentRequestContract);
  assert.equal(sourceManifest.version, release.productVersion);
  assert.equal(sourceManifest.artifactSha256, sha256(latestPath));
  assert.equal(manifest.components.bridge.sha256, sha256(enginePath));
  assert.equal(manifest.components.bridgeManager.sha256, sha256(managerPath));

  assert.ok(latest.includes(`//@version ${release.productVersion}`));
  assert.ok(latest.includes(`const VERSION = '${release.productVersion}';`));
  assert.ok(core.includes(`const VERSION = '${release.productVersion}';`));
  assert.ok(core.includes(`const REQUIRED_BRIDGE_VERSION = '${release.engineVersion}';`));
  assert.ok(engine.includes(`const VERSION = '${release.engineVersion}';`));
  assert.ok(manager.includes(`const MANAGER_VERSION = '${release.managerVersion}';`));
  assert.ok(manager.includes(`const PRODUCT_VERSION = '${release.productVersion}';`));
  assert.ok(manager.includes(`const BUNDLED_ENGINE_VERSION = '${release.engineVersion}';`));
  assert.ok(fs.existsSync(path.join(ROOT, release.callerWorkflow)));
  assert.ok(fs.existsSync(path.join(ROOT, release.sharedWorkflow)));
  assert.ok(fs.existsSync(path.join(ROOT, release.validatorWorkflow)));
  assert.ok(fs.existsSync(path.join(ROOT, release.publisherWorkflow)));
  return release;
}

module.exports = {loadCurrentRelease, assertCurrentReleaseArtifacts};
