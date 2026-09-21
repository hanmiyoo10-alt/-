'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');
const {ALLOWLIST, decidePromotion} = require('../tools/promote_release_blobs.cjs');

const REPO = process.cwd();
const LEGACY_ROOT = 'plugins/usage-dashboard';
const TARGET_ROOT = 'plugins/risu/local/usage-dashboard';
const DESCRIPTOR = '.github/plugin-control-plane/canonical-main/descriptors/usage-dashboard.json';
const MCP_STATUS = 'tools/usage-dashboard-mcp/usage_dashboard_mcp/status.py';
const PUBLISHER = 'plugins/usage-dashboard/tools/promote_release_blobs.cjs';
const LATEST = `${LEGACY_ROOT}/latest.js`;
const MANIFEST = `${LEGACY_ROOT}/runtime/product-manifest.json`;
const ENGINE = `${LEGACY_ROOT}/runtime/bridge-engine.mjs`;
const MANAGER = `${LEGACY_ROOT}/runtime/bridge-manager.cjs`;
const BOOTSTRAP = `${LEGACY_ROOT}/runtime/bootstrap-bridge-manager.sh`;
const RELEASE_PREFIX = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/';
const UPDATE_URL = `${RELEASE_PREFIX}latest.js`;
const MANIFEST_URL = `${RELEASE_PREFIX}runtime/product-manifest.json`;

const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

assert.ok(fs.statSync(path.join(REPO, LEGACY_ROOT)).isDirectory(), 'legacy production root missing');
assert.ok(fs.statSync(path.join(REPO, TARGET_ROOT)).isDirectory(), 'Local target landing missing');
assert.deepEqual(
  fs.readdirSync(path.join(REPO, TARGET_ROOT)).sort(),
  ['README.md'],
  'R0 target landing must remain navigation-only and contain no production artifacts',
);

for (const rel of [LATEST, MANIFEST, ENGINE, MANAGER, BOOTSTRAP]) {
  assert.ok(fs.statSync(path.join(REPO, rel)).isFile(), `legacy production artifact missing: ${rel}`);
}

const descriptor = json(DESCRIPTOR);
assert.equal(descriptor.projectPath, LEGACY_ROOT);
assert.equal(descriptor.authority?.type, 'release');
assert.equal(descriptor.authority?.releaseBranch, 'release-usage-dashboard');
assert.equal(descriptor.authority?.manifest, MANIFEST);
assert.equal(descriptor.authority?.artifact, LATEST);

const latest = read(LATEST);
assert.ok(latest.includes(`//@update-url ${UPDATE_URL}`), 'legacy updater metadata URL drifted');
assert.ok(latest.includes(`const UPDATE_URL = '${UPDATE_URL}';`), 'legacy runtime update URL drifted');
assert.ok(latest.includes(`const RUNTIME_MANIFEST_URL = '${MANIFEST_URL}';`), 'legacy runtime manifest URL drifted');

const manifest = json(MANIFEST);
assert.equal(manifest.releaseBranch, 'release-usage-dashboard');
assert.equal(manifest.components?.plugin?.artifact, LATEST);
assert.equal(manifest.components?.bridge?.artifact, `${RELEASE_PREFIX}runtime/bridge-engine.mjs`);
assert.equal(manifest.components?.bridgeManager?.artifact, `${RELEASE_PREFIX}runtime/bridge-manager.cjs`);
assert.equal(manifest.components?.bridgeManager?.bootstrap, `${RELEASE_PREFIX}runtime/bootstrap-bridge-manager.sh`);

const manager = read(MANAGER);
assert.ok(manager.includes(`const PRODUCT_MANIFEST_URL = '${MANIFEST_URL}';`));
assert.ok(manager.includes(`const RELEASE_PREFIX = '${RELEASE_PREFIX}runtime/';`));
assert.ok(manager.includes("if (!String(url).startsWith(RELEASE_PREFIX)) return reject(new Error('release URL denied'));"));
assert.ok(manager.includes("if (!artifact.startsWith(RELEASE_PREFIX)) throw new Error('manager artifact URL denied');"));

const bootstrap = read(BOOTSTRAP);
assert.ok(bootstrap.includes(`PRODUCT_MANIFEST_URL='${MANIFEST_URL}'`));
assert.ok(bootstrap.includes(`${RELEASE_PREFIX}runtime/*`), 'bootstrap legacy runtime allowlist missing');

const expectedAllowlist = [
  LATEST,
  ENGINE,
  MANAGER,
  BOOTSTRAP,
  MANIFEST,
];
assert.deepEqual(ALLOWLIST, expectedAllowlist, 'production publisher allowlist changed');

const blobSet = (suffix = '') => Object.fromEntries(
  expectedAllowlist.map((rel, index) => [rel, {sha:`blob-${index}${suffix}`}]),
);
const product = (version) => ({
  product:'Local Usage Dashboard',
  productVersion:version,
  components:{bridge:{requiredVersion:'1'},bridgeManager:{version:'1'}},
  contracts:{snapshot:1,recentRequest:1},
});
assert.deepEqual(
  decidePromotion(product('1.0.0'), product('2.0.0'), blobSet(), blobSet()),
  {kind:'stale', reason:'STALE_CANDIDATE_RELEASE'},
);
assert.deepEqual(
  decidePromotion(product('2.0.0'), product('2.0.0'), blobSet(), blobSet()),
  {kind:'noop', reason:'NOOP_IDENTICAL'},
);
assert.deepEqual(
  decidePromotion(product('2.0.0'), product('2.0.0'), blobSet('-candidate'), blobSet('-release')),
  {kind:'fail', reason:'SAME_VERSION_ARTIFACT_DIVERGENCE'},
);
assert.deepEqual(
  decidePromotion(product('3.0.0'), product('2.0.0'), blobSet(), blobSet()),
  {kind:'promote', reason:'ALLOW'},
);
const publisher = read(PUBLISHER);
assert.ok(publisher.includes("{sha:newCommit.sha, force:false}"), 'release ref update must remain non-force');
assert.ok(publisher.includes("RELEASE_BLOB_IDENTITY_MISMATCH"), 'post-publish exact blob identity guard missing');
assert.ok(publisher.includes("RELEASE_TUPLE_MISMATCH"), 'post-publish release tuple guard missing');

const mcp = read(MCP_STATUS);
assert.ok(mcp.includes('_MANIFEST_PATH = "plugins/usage-dashboard/runtime/product-manifest.json"'));
assert.ok(mcp.includes('_LATEST_PATH = "plugins/usage-dashboard/latest.js"'));

const release = loadCurrentRelease();
assert.ok(
  String(release.materializer || '').startsWith('plugins/usage-dashboard/tools/'),
  `current release materializer escaped legacy root: ${release.materializer}`,
);
assert.ok(
  String(release.newRegression || '').startsWith('plugins/usage-dashboard/tests/'),
  `current release regression escaped legacy root: ${release.newRegression}`,
);
assert.ok(fs.existsSync(path.join(REPO, release.materializer)), 'current release materializer missing');
assert.ok(fs.existsSync(path.join(REPO, release.newRegression)), 'current release regression missing');

console.log('USAGE_DASHBOARD_PRODUCTION_ROOT_RELOCATION:R0_BASELINE_LOCKED');
