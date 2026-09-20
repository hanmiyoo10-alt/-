'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  LEGACY_ROOT,
  TARGET_ROOT,
  ALLOWED_ROOTS,
  PRODUCTION_RELATIVE_PATHS,
  DEFAULT_PROFILE,
  normalizeRoot,
  createProfile,
  artifactPathsForRoot,
  mapProfileArtifacts,
} = require('../tools/release_path_profile.cjs');
const promoter = require('../tools/promote_release_blobs.cjs');

const expectedRelative = [
  'latest.js',
  'runtime/bridge-engine.mjs',
  'runtime/bridge-manager.cjs',
  'runtime/bootstrap-bridge-manager.sh',
  'runtime/product-manifest.json',
];
const expectedLegacy = expectedRelative.map((relativePath) => `${LEGACY_ROOT}/${relativePath}`);
const expectedTarget = expectedRelative.map((relativePath) => `${TARGET_ROOT}/${relativePath}`);

assert.deepEqual(ALLOWED_ROOTS, [LEGACY_ROOT, TARGET_ROOT]);
assert.deepEqual(PRODUCTION_RELATIVE_PATHS, expectedRelative);
assert.deepEqual(DEFAULT_PROFILE, {
  sourceRoot:LEGACY_ROOT,
  publicationRoots:[LEGACY_ROOT],
  productionRelativePaths:expectedRelative,
});
assert.deepEqual(artifactPathsForRoot(DEFAULT_PROFILE.sourceRoot), expectedLegacy);
assert.deepEqual(promoter.ALLOWLIST, expectedLegacy);
assert.deepEqual(artifactPathsForRoot(TARGET_ROOT), expectedTarget);

const targetProfile = createProfile(LEGACY_ROOT, [TARGET_ROOT]);
assert.deepEqual(
  mapProfileArtifacts(targetProfile),
  expectedRelative.map((relativePath, index) => ({
    relativePath,
    sourcePath:expectedLegacy[index],
    publicationPaths:[expectedTarget[index]],
  })),
);

const dualProfile = createProfile(LEGACY_ROOT, [LEGACY_ROOT, TARGET_ROOT]);
assert.deepEqual(
  mapProfileArtifacts(dualProfile).map((entry) => entry.publicationPaths),
  expectedRelative.map((relativePath, index) => [expectedLegacy[index], expectedTarget[index]]),
);
assert.deepEqual(DEFAULT_PROFILE.publicationRoots, [LEGACY_ROOT], 'dual publication must not become the default');

assert.throws(() => normalizeRoot('plugins/other'), /RELEASE_PATH_PROFILE_UNKNOWN_ROOT/);
assert.throws(() => normalizeRoot('/plugins/usage-dashboard'), /RELEASE_PATH_PROFILE_INVALID_ROOT/);
assert.throws(() => normalizeRoot('plugins\/../usage-dashboard'), /RELEASE_PATH_PROFILE_INVALID_ROOT/);
assert.throws(() => createProfile(LEGACY_ROOT, []), /RELEASE_PATH_PROFILE_PUBLICATION_ROOTS_EMPTY/);
assert.throws(() => createProfile(LEGACY_ROOT, [LEGACY_ROOT, LEGACY_ROOT]), /RELEASE_PATH_PROFILE_PUBLICATION_ROOT_DUPLICATE/);
assert.throws(() => createProfile('plugins/other', [LEGACY_ROOT]), /RELEASE_PATH_PROFILE_UNKNOWN_ROOT/);

const profileSource = fs.readFileSync('plugins/usage-dashboard/tools/release_path_profile.cjs', 'utf8');
for (const forbidden of [
  "require('node:fs')",
  "require('node:child_process')",
  'fetch(',
  'https://api.github.com',
  '/git/refs',
  'release-usage-dashboard',
]) {
  assert.ok(!profileSource.includes(forbidden), `path profile must remain pure: ${forbidden}`);
}

const promoterSource = fs.readFileSync('plugins/usage-dashboard/tools/promote_release_blobs.cjs', 'utf8');
assert.match(promoterSource, /require\('\.\/release_path_profile\.cjs'\)/);
for (const forbidden of ['--profile', '--source-root', '--publication-root', '--publication-roots']) {
  assert.ok(!promoterSource.includes(forbidden), `publisher must not activate profile selection: ${forbidden}`);
}

console.log('USAGE_DASHBOARD_PRODUCTION_ROOT_RELOCATION:R1A_PATH_PROFILE_LOCKED');
