'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const profile = require('../tools/release_path_profile.cjs');
const promoter = require('../tools/promote_release_blobs.cjs');
const parity = require('../tools/check_release_blob_parity.cjs');
const classifier = require('../tools/classify_release_candidate.cjs');
const {discoverTests} = require('./registry.cjs');

const {
  LEGACY_ROOT,
  TARGET_ROOT,
  DEFAULT_PROFILE,
  DUAL_PUBLICATION_PROFILE,
  PRODUCTION_RELATIVE_PATHS,
  artifactPathsForRoot,
  mapProfileArtifacts,
} = profile;

const legacyPaths = artifactPathsForRoot(LEGACY_ROOT);
const targetPaths = artifactPathsForRoot(TARGET_ROOT);

assert.deepEqual(DEFAULT_PROFILE, {
  sourceRoot:LEGACY_ROOT,
  publicationRoots:[LEGACY_ROOT],
  productionRelativePaths:PRODUCTION_RELATIVE_PATHS,
}, 'R2 must not change the legacy-only default profile');

assert.deepEqual(DUAL_PUBLICATION_PROFILE, {
  sourceRoot:LEGACY_ROOT,
  publicationRoots:[LEGACY_ROOT, TARGET_ROOT],
  productionRelativePaths:PRODUCTION_RELATIVE_PATHS,
});

assert.deepEqual(promoter.ALLOWLIST, legacyPaths, 'classifier/source allowlist must remain the five legacy candidate paths');
assert.deepEqual(
  [...promoter.PUBLICATION_ALLOWLIST].sort(),
  [...legacyPaths, ...targetPaths].sort(),
  'dual publication allowlist must contain exactly ten release paths',
);
assert.equal(promoter.PUBLICATION_ALLOWLIST.length, 10);
assert.equal(classifier.classifyBlobMaps(
  Object.fromEntries(legacyPaths.map((path, index) => [path, `a${String(index).padStart(39,'0')}`.slice(0,40)])),
  Object.fromEntries(legacyPaths.map((path, index) => [path, `a${String(index).padStart(39,'0')}`.slice(0,40)])),
).classification, 'MAINTENANCE_ONLY');

const candidate = Object.fromEntries(legacyPaths.map((path, index) => [path, {
  sha:String(index + 1).repeat(40).slice(0, 40),
  mode:path.endsWith('.sh') ? '100755' : '100644',
  type:'blob',
  bytes:Buffer.from(`candidate:${path}`),
}]));

const plan = promoter.publicationTreeEntries(candidate);
assert.equal(plan.length, 10);
assert.deepEqual(
  plan.map((entry) => entry.path),
  mapProfileArtifacts(DUAL_PUBLICATION_PROFILE).flatMap((entry) => entry.publicationPaths),
);
for (let index = 0; index < PRODUCTION_RELATIVE_PATHS.length; index += 1) {
  const source = candidate[legacyPaths[index]];
  const legacy = plan.find((entry) => entry.path === legacyPaths[index]);
  const target = plan.find((entry) => entry.path === targetPaths[index]);
  assert.ok(legacy && target);
  assert.equal(legacy.sha, source.sha);
  assert.equal(target.sha, source.sha);
  assert.equal(legacy.mode, source.mode);
  assert.equal(target.mode, source.mode);
  assert.equal(legacy.type, 'blob');
  assert.equal(target.type, 'blob');
}

const legacyRelease = Object.fromEntries(legacyPaths.map((path) => [path, {sha:candidate[path].sha}]));
const absentTarget = {};
const completeTarget = Object.fromEntries(targetPaths.map((path, index) => [path, {sha:candidate[legacyPaths[index]].sha}]));
const partialTarget = {[targetPaths[0]]:{sha:candidate[legacyPaths[0]].sha}};
const divergedTarget = Object.fromEntries(targetPaths.map((path, index) => [
  path,
  {sha:index === 2 ? 'f'.repeat(40) : candidate[legacyPaths[index]].sha},
]));

assert.equal(promoter.classifyMirrorState(legacyRelease, absentTarget).state, 'ABSENT');
assert.equal(promoter.classifyMirrorState(legacyRelease, completeTarget).state, 'COMPLETE_MATCH');
assert.equal(promoter.classifyMirrorState(legacyRelease, partialTarget).state, 'PARTIAL');
assert.equal(promoter.classifyMirrorState(legacyRelease, divergedTarget).state, 'DIVERGED');
assert.equal(promoter.assertMirrorState(legacyRelease, absentTarget).state, 'ABSENT');
assert.equal(promoter.assertMirrorState(legacyRelease, completeTarget).state, 'COMPLETE_MATCH');
assert.throws(() => promoter.assertMirrorState(legacyRelease, partialTarget), /RELEASE_MIRROR_PARTIAL:1\/5/);
assert.throws(() => promoter.assertMirrorState(legacyRelease, divergedTarget), /RELEASE_MIRROR_DIVERGED/);
assert.equal(promoter.sameMappedBlobs(candidate, completeTarget, TARGET_ROOT), true);

const version = (value) => ({
  product:'Local Usage Dashboard',
  productVersion:value,
  components:{bridge:{requiredVersion:'1'},bridgeManager:{version:'1'}},
  contracts:{snapshot:1,recentRequest:1},
});
assert.deepEqual(
  promoter.decidePromotion(version('3.0.0-alpha.5.109'), version('3.0.0-alpha.5.109'), candidate, candidate),
  {kind:'noop', reason:'NOOP_IDENTICAL'},
  'same-version legacy identity must remain a no-op; target absence must never cause alias-only backfill',
);
assert.deepEqual(
  promoter.decidePromotion(version('3.0.0-alpha.5.110'), version('3.0.0-alpha.5.109'), candidate, candidate),
  {kind:'promote', reason:'ALLOW'},
);

const syntheticTree = new Map([
  ...legacyPaths.map((path) => [path, {path,type:'blob',mode:candidate[path].mode,sha:candidate[path].sha}]),
  ...targetPaths.map((path, index) => [path, {path,type:'blob',mode:candidate[legacyPaths[index]].mode,sha:candidate[legacyPaths[index]].sha}]),
]);
assert.deepEqual(parity.blobMapFromTree(syntheticTree, LEGACY_ROOT), Object.fromEntries(legacyPaths.map((path) => [path, candidate[path].sha])));
assert.deepEqual(parity.blobMapFromTree(syntheticTree, TARGET_ROOT), Object.fromEntries(targetPaths.map((path, index) => [path, candidate[legacyPaths[index]].sha])));

const promoterSource = fs.readFileSync('plugins/usage-dashboard/tools/promote_release_blobs.cjs', 'utf8');
for (const marker of [
  'publicationTreeEntries(candidateEntries)',
  'DUAL_PUBLICATION_PROFILE',
  'RELEASE_MIRROR_PARTIAL',
  'RELEASE_MIRROR_DIVERGED',
  'RELEASE_TARGET_BLOB_IDENTITY_MISMATCH',
  'PUBLICATION_ALLOWLIST',
  'force:false',
  'RELEASE_REF_MOVED',
  'RELEASE_REF_POSTVERIFY_MISMATCH',
]) assert.ok(promoterSource.includes(marker), `R2 publisher contract missing: ${marker}`);
for (const forbidden of ['--profile', '--source-root', '--publication-root', '--publication-roots']) {
  assert.equal(promoterSource.includes(forbidden), false, `R2 must not expose publication selection: ${forbidden}`);
}

const paritySource = fs.readFileSync('plugins/usage-dashboard/tools/check_release_blob_parity.cjs', 'utf8');
assert.ok(paritySource.includes('TARGET_ROOT'));
assert.ok(paritySource.includes('assertMirrorState'));
assert.ok(paritySource.includes('mirrorState'));
assert.doesNotMatch(paritySource, /method:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/);

const reusable = fs.readFileSync('.github/workflows/reusable-usage-dashboard-promote.yml','utf8');
const caller = fs.readFileSync('.github/workflows/usage-dashboard-promote.yml','utf8');
assert.equal(reusable.includes(TARGET_ROOT), false, 'R2A must not add workflow-level publication selection');
assert.equal(caller.includes(TARGET_ROOT), false, 'R2A must not change the merged-PR release classifier workflow');
assert.match(reusable, /promote_release_blobs\.cjs/);
assert.match(caller, /classification == 'MAINTENANCE_ONLY'/);
assert.match(caller, /check_release_blob_parity\.cjs/);

assert.deepEqual(fs.readdirSync(TARGET_ROOT).sort(), ['README.md'], 'R2A must not materialize target production files on main');

const suite = discoverTests();
assert.ok(suite.regressions.includes('p80-production-root-dual-publication.cjs'));
assert.equal(suite.ordered.length, 150, 'R2A should add exactly one auto-discovered regression');

console.log('USAGE_DASHBOARD_PRODUCTION_ROOT_RELOCATION:R2A_DUAL_PUBLICATION_ARMED');
