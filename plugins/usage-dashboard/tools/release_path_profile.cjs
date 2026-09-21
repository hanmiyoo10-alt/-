#!/usr/bin/env node
'use strict';

const path = require('node:path').posix;

const LEGACY_ROOT = 'plugins/usage-dashboard';
const TARGET_ROOT = 'plugins/risu/local/usage-dashboard';
const ALLOWED_ROOTS = Object.freeze([LEGACY_ROOT, TARGET_ROOT]);
const PRODUCTION_RELATIVE_PATHS = Object.freeze([
  'latest.js',
  'runtime/bridge-engine.mjs',
  'runtime/bridge-manager.cjs',
  'runtime/bootstrap-bridge-manager.sh',
  'runtime/product-manifest.json',
]);

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function normalizeRoot(value) {
  if (typeof value !== 'string' || !value) fail('RELEASE_PATH_PROFILE_INVALID_ROOT', String(value || '<empty>'));
  if (value.trim() !== value || value.includes('\\') || value.startsWith('/') || value.endsWith('/')) {
    fail('RELEASE_PATH_PROFILE_INVALID_ROOT', value);
  }
  const normalized = path.normalize(value);
  if (normalized !== value || value.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    fail('RELEASE_PATH_PROFILE_INVALID_ROOT', value);
  }
  if (!ALLOWED_ROOTS.includes(value)) fail('RELEASE_PATH_PROFILE_UNKNOWN_ROOT', value);
  return value;
}

function assertProductionRelativePaths(value) {
  if (!Array.isArray(value) || value.length !== PRODUCTION_RELATIVE_PATHS.length) {
    fail('RELEASE_PATH_PROFILE_RELATIVE_PATHS_MISMATCH');
  }
  for (let i = 0; i < PRODUCTION_RELATIVE_PATHS.length; i += 1) {
    if (value[i] !== PRODUCTION_RELATIVE_PATHS[i]) fail('RELEASE_PATH_PROFILE_RELATIVE_PATHS_MISMATCH');
  }
  return PRODUCTION_RELATIVE_PATHS;
}

function validateProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) fail('RELEASE_PATH_PROFILE_INVALID_PROFILE');
  const sourceRoot = normalizeRoot(profile.sourceRoot);
  if (!Array.isArray(profile.publicationRoots) || profile.publicationRoots.length === 0) {
    fail('RELEASE_PATH_PROFILE_PUBLICATION_ROOTS_EMPTY');
  }
  const publicationRoots = profile.publicationRoots.map(normalizeRoot);
  if (new Set(publicationRoots).size !== publicationRoots.length) {
    fail('RELEASE_PATH_PROFILE_PUBLICATION_ROOT_DUPLICATE');
  }
  const productionRelativePaths = assertProductionRelativePaths(
    profile.productionRelativePaths || PRODUCTION_RELATIVE_PATHS,
  );
  return Object.freeze({
    sourceRoot,
    publicationRoots:Object.freeze([...publicationRoots]),
    productionRelativePaths,
  });
}

function createProfile(sourceRoot, publicationRoots) {
  return validateProfile({sourceRoot, publicationRoots, productionRelativePaths:PRODUCTION_RELATIVE_PATHS});
}

function artifactPathsForRoot(root) {
  const normalizedRoot = normalizeRoot(root);
  return PRODUCTION_RELATIVE_PATHS.map((relativePath) => path.join(normalizedRoot, relativePath));
}

function mapProfileArtifacts(profile) {
  const normalized = validateProfile(profile);
  return Object.freeze(normalized.productionRelativePaths.map((relativePath) => Object.freeze({
    relativePath,
    sourcePath:path.join(normalized.sourceRoot, relativePath),
    publicationPaths:Object.freeze(normalized.publicationRoots.map((root) => path.join(root, relativePath))),
  })));
}

const DEFAULT_PROFILE = createProfile(LEGACY_ROOT, [LEGACY_ROOT]);
const DUAL_PUBLICATION_PROFILE = createProfile(LEGACY_ROOT, [LEGACY_ROOT, TARGET_ROOT]);

module.exports = {
  LEGACY_ROOT,
  TARGET_ROOT,
  ALLOWED_ROOTS,
  PRODUCTION_RELATIVE_PATHS,
  DEFAULT_PROFILE,
  DUAL_PUBLICATION_PROFILE,
  normalizeRoot,
  validateProfile,
  createProfile,
  artifactPathsForRoot,
  mapProfileArtifacts,
};
