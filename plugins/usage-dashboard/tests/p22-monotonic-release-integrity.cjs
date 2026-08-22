const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const ROOT = process.cwd();
const helper = path.join(ROOT, 'plugins/usage-dashboard/tools/check_release_monotonic.py');
const manifestPath = path.join(ROOT, 'plugins/usage-dashboard/runtime/product-manifest.json');
const enginePath = path.join(ROOT, 'plugins/usage-dashboard/runtime/bridge-engine.mjs');
const managerPath = path.join(ROOT, 'plugins/usage-dashboard/runtime/bridge-manager.cjs');
const workflowPath = path.join(ROOT, currentRelease.sharedWorkflow);

assert.ok(fs.existsSync(helper), 'monotonic publisher helper missing');
const productManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-dashboard-p22-'));

function writeArtifactSet(name, version, marker = name) {
  const pluginRoot = path.join(temp, name, 'plugins', 'usage-dashboard');
  const runtime = path.join(pluginRoot, 'runtime');
  fs.mkdirSync(runtime, {recursive: true});
  const engine = Buffer.from(`engine:${marker}\n`);
  const manager = Buffer.from(`manager:${marker}\n`);
  const bootstrap = Buffer.from(`bootstrap:${marker}\n`);
  const latest = Buffer.from(`latest:${marker}\n`);
  fs.writeFileSync(path.join(runtime, 'bridge-engine.mjs'), engine);
  fs.writeFileSync(path.join(runtime, 'bridge-manager.cjs'), manager);
  fs.writeFileSync(path.join(runtime, 'bootstrap-bridge-manager.sh'), bootstrap);
  fs.writeFileSync(path.join(pluginRoot, 'latest.js'), latest);
  const manifest = {
    format: 1,
    product: 'Local Usage Dashboard',
    productVersion: version,
    releaseBranch: 'release-usage-dashboard',
    components: {
      plugin: {mode: 'bundled', version, artifact: 'plugins/usage-dashboard/latest.js'},
      bridge: {mode: 'sidecar', requiredVersion: '1.6.13', sha256: hash(engine)},
      bridgeManager: {
        mode: 'sidecar-manager', version: '1.2.6', productVersion: version,
        sha256: hash(manager), bootstrapSha256: hash(bootstrap),
      },
    },
    contracts: {snapshot: 1, recentRequest: 1},
  };
  const manifestFile = path.join(runtime, 'product-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  return {pluginRoot, runtime, manifestFile};
}

function runGuard(candidate, main, release, checkArtifacts = false) {
  const args = [
    helper,
    '--candidate-manifest', candidate.manifestFile,
    '--main-manifest', main.manifestFile,
    '--release-manifest', release.manifestFile,
  ];
  if (checkArtifacts) {
    args.push('--candidate-runtime', candidate.runtime, '--release-runtime', release.runtime, '--check-artifacts');
  }
  return spawnSync('python3', args, {encoding: 'utf8'});
}

// New candidate over older release: allowed.
{
  const candidate = writeArtifactSet('allow-candidate', '3.0.0-alpha.5.60', 'same-560');
  const main = writeArtifactSet('allow-main', '3.0.0-alpha.5.60', 'same-560');
  const release = writeArtifactSet('allow-release', '3.0.0-alpha.5.59', 'old-559');
  const result = runGuard(candidate, main, release, true);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /ALLOW:3\.0\.0-alpha\.5\.60/);
}

// Exact incident shape: a delayed 5.59/older candidate must not overwrite main/release 5.60.
{
  const candidate = writeArtifactSet('stale-main-candidate', '3.0.0-alpha.5.59', 'old-559');
  const main = writeArtifactSet('stale-main-current', '3.0.0-alpha.5.60', 'same-560');
  const release = writeArtifactSet('stale-main-release', '3.0.0-alpha.5.60', 'same-560');
  const result = runGuard(candidate, main, release, true);
  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(result.stdout, /STALE_CANDIDATE_MAIN/);
}

// Release can be newer than main/candidate because another validated publisher won the race.
{
  const candidate = writeArtifactSet('stale-release-candidate', '3.0.0-alpha.5.60', 'same-560');
  const main = writeArtifactSet('stale-release-main', '3.0.0-alpha.5.60', 'same-560');
  const release = writeArtifactSet('stale-release-current', '3.0.0-alpha.5.61', 'new-561');
  const result = runGuard(candidate, main, release, true);
  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(result.stdout, /STALE_CANDIDATE_RELEASE/);
}

// Equal version, equal artifact identity: deterministic no-op.
{
  const candidate = writeArtifactSet('noop-candidate', '3.0.0-alpha.5.60', 'identical');
  const main = writeArtifactSet('noop-main', '3.0.0-alpha.5.60', 'identical');
  const release = writeArtifactSet('noop-release', '3.0.0-alpha.5.60', 'identical');
  const result = runGuard(candidate, main, release, true);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /NOOP_IDENTICAL/);
}

// Equal version, different latest.js: fail closed even when engine/manager hashes match.
{
  const candidate = writeArtifactSet('diverge-candidate', '3.0.0-alpha.5.60', 'base');
  const main = writeArtifactSet('diverge-main', '3.0.0-alpha.5.60', 'base');
  const release = writeArtifactSet('diverge-release', '3.0.0-alpha.5.60', 'base');
  fs.writeFileSync(path.join(release.pluginRoot, 'latest.js'), 'latest:mutated-same-version\n');
  const result = runGuard(candidate, main, release, true);
  assert.equal(result.status, 3, result.stderr || result.stdout);
  assert.match(result.stdout, /SAME_VERSION_ARTIFACT_DIVERGENCE/);
}

// Candidate may not claim a version newer than current main.
{
  const candidate = writeArtifactSet('ahead-candidate', '3.0.0-alpha.5.61', 'new-561');
  const main = writeArtifactSet('ahead-main', '3.0.0-alpha.5.60', 'same-560');
  const release = writeArtifactSet('ahead-release', '3.0.0-alpha.5.59', 'old-559');
  const result = runGuard(candidate, main, release);
  assert.equal(result.status, 4, result.stderr || result.stdout);
  assert.match(result.stdout, /CANDIDATE_AHEAD_OF_MAIN/);
}

// Malformed/unknown versions and other products fail closed rather than being compared.
{
  const candidate = writeArtifactSet('bad-candidate', '3.0.0-alpha.5.60', 'same-560');
  const main = writeArtifactSet('bad-main', '3.0.0-alpha.5.60', 'same-560');
  const release = writeArtifactSet('bad-release', '3.0.0-alpha.5.59', 'old-559');
  const bad = JSON.parse(fs.readFileSync(candidate.manifestFile, 'utf8'));
  bad.productVersion = 'banana';
  bad.components.plugin.version = 'banana';
  bad.components.bridgeManager.productVersion = 'banana';
  fs.writeFileSync(candidate.manifestFile, JSON.stringify(bad, null, 2));
  let result = runGuard(candidate, main, release);
  assert.equal(result.status, 4, result.stderr || result.stdout);
  assert.match(result.stderr, /FAIL_CLOSED/);

  bad.productVersion = '3.0.0-alpha.5.60';
  bad.components.plugin.version = bad.productVersion;
  bad.components.bridgeManager.productVersion = bad.productVersion;
  bad.product = 'SimCore';
  fs.writeFileSync(candidate.manifestFile, JSON.stringify(bad, null, 2));
  result = runGuard(candidate, main, release);
  assert.equal(result.status, 4, result.stderr || result.stdout);
  assert.match(result.stderr, /unexpected product/);
}

// Recent historical publishers are archived: no automatic trigger and no write permission.
for (const file of [
  'stage-usage-dashboard-555-snapshot-performance-attribution.yml',
  'stage-usage-dashboard-556-bounded-cli-parallelism.yml',
  'stage-usage-dashboard-557-organization-discovery-dedup.yml',
  'stage-usage-dashboard-558-shared-24h-capture.yml',
  'stage-usage-dashboard-559-scheduling-attribution.yml',
]) {
  const text = fs.readFileSync(path.join(ROOT, '.github/workflows', file), 'utf8');
  assert.match(text, /workflow_dispatch:/, `${file} should be manual-only`);
  assert.ok(!/^\s*push:/m.test(text), `${file} must not auto-run on push`);
  assert.ok(!/^\s*pull_request:/m.test(text), `${file} must not auto-run on PR`);
  assert.match(text, /contents: read/, `${file} should be read-only`);
  assert.ok(!/contents:\s*write/.test(text), `${file} must not retain write permission`);
  assert.ok(!text.includes('git push origin HEAD:release-usage-dashboard'), `${file} must not retain release push commands`);
}

const workflow = fs.readFileSync(workflowPath, 'utf8');
assert.match(workflow, /group: repo-main-write/);
assert.match(workflow, /check_release_monotonic\.py/);
assert.match(workflow, /--check-artifacts/);
assert.match(workflow, /git fetch origin main release-usage-dashboard/);
assert.match(workflow, /STALE_CANDIDATE/);
assert.ok(workflow.indexOf('check_release_monotonic.py') < workflow.indexOf('git commit -m "release: publish Local Usage Dashboard $UD_PRODUCT_VERSION product artifacts"'));

fs.rmSync(temp, {recursive: true, force: true});
console.log('usage-dashboard P22 monotonic release integrity: OK · downgrade blocked, same-version divergence blocked, recent stale publishers archived');
