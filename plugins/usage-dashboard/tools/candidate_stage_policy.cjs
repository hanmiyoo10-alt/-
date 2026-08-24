#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const RELEASE_SPEC_RE = /^\.github\/usage-dashboard\/releases\/[A-Za-z0-9._-]+\.json$/;
const MATERIALIZER_RE = /^plugins\/usage-dashboard\/tools\/[A-Za-z0-9._-]+\.py$/;
const GENERATED = new Set([
  'plugins/usage-dashboard/latest.js',
  'plugins/usage-dashboard/src/manifest.json',
  'docs/USAGE_DASHBOARD_GUIDELINES.md',
]);

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function normalizeSha(value, code) {
  const text = String(value || '').trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(text)) fail(code, text || 'missing');
  return text;
}

function classifyPath(file, materializerPath = '') {
  const name = String(file || '').replaceAll('\\', '/');
  if (!name || name.startsWith('../') || name.includes('/../')) return 'denied';
  if (GENERATED.has(name) || name.startsWith('plugins/usage-dashboard/runtime/')) return 'generated';
  if (RELEASE_SPEC_RE.test(name)) return 'release-spec';
  if (name === materializerPath && MATERIALIZER_RE.test(name)) return 'materializer';
  if (name.startsWith('plugins/usage-dashboard/src/')) return 'plugin-source';
  if (name.startsWith('plugins/usage-dashboard/runtime-src/')) return 'engine-source';
  if (name.startsWith('plugins/usage-dashboard/tests/')) return 'test';
  if (/^docs\/USAGE_DASHBOARD_[A-Za-z0-9._-]+\.md$/.test(name)) return 'doc';
  return 'denied';
}

function assertAllowedPaths(files, materializerPath) {
  const classes = {};
  for (const file of files) {
    const kind = classifyPath(file, materializerPath);
    if (kind === 'generated') fail('CANDIDATE_STAGE_GENERATED_EDIT_DENIED', file);
    if (kind === 'denied') fail('CANDIDATE_STAGE_PATH_DENIED', file);
    classes[file] = kind;
  }
  return classes;
}

function changedPaths(baseSha, sourceSha) {
  const base = normalizeSha(baseSha, 'CANDIDATE_STAGE_BASE_SHA_INVALID');
  const source = normalizeSha(sourceSha, 'CANDIDATE_STAGE_SOURCE_SHA_INVALID');
  const text = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMRT', base, source, '--'], {encoding:'utf8'});
  return [...new Set(text.split(/\r?\n/).map(v => v.trim()).filter(Boolean))].sort();
}

function changedReleaseSpecs(files) {
  return files.filter((file) => RELEASE_SPEC_RE.test(file));
}

function loadJsonAtSource(sourceSha, file) {
  const text = execFileSync('git', ['show', `${sourceSha}:${file}`], {encoding:'utf8'});
  try { return JSON.parse(text); }
  catch (error) { fail('CANDIDATE_STAGE_RELEASE_SPEC_INVALID', `${file}:${error.message}`); }
}

function loadBaseProductVersion(baseSha) {
  const text = execFileSync('git', ['show', `${baseSha}:plugins/usage-dashboard/runtime/product-manifest.json`], {encoding:'utf8'});
  let manifest;
  try { manifest = JSON.parse(text); }
  catch (error) { fail('CANDIDATE_STAGE_BASE_MANIFEST_INVALID', error.message); }
  const version = String(manifest.productVersion || '');
  if (!version) fail('CANDIDATE_STAGE_BASE_VERSION_MISSING');
  return version;
}

function parseAlphaBuild(version) {
  const match = /^3\.0\.0-alpha\.5\.(\d+)$/.exec(String(version || ''));
  if (!match) fail('CANDIDATE_STAGE_VERSION_SERIES_UNSUPPORTED', String(version || ''));
  const build = Number(match[1]);
  if (!Number.isSafeInteger(build)) fail('CANDIDATE_STAGE_VERSION_INVALID', String(version || ''));
  return build;
}

function inspectCandidate(baseSha, sourceSha) {
  const base = normalizeSha(baseSha, 'CANDIDATE_STAGE_BASE_SHA_INVALID');
  const source = normalizeSha(sourceSha, 'CANDIDATE_STAGE_SOURCE_SHA_INVALID');
  const files = changedPaths(base, source);
  const specs = changedReleaseSpecs(files);
  if (specs.length !== 1) fail('CANDIDATE_STAGE_RELEASE_SPEC_COUNT', String(specs.length));
  const releaseSpec = specs[0];
  const spec = loadJsonAtSource(source, releaseSpec);
  const materializer = String(spec.materializer || '');
  if (!MATERIALIZER_RE.test(materializer)) fail('CANDIDATE_STAGE_MATERIALIZER_DENIED', materializer || 'missing');
  if (!files.includes(materializer)) fail('CANDIDATE_STAGE_MATERIALIZER_NOT_CHANGED', materializer);
  const productVersion = String(spec.productVersion || '');
  const baseVersion = loadBaseProductVersion(base);
  if (parseAlphaBuild(productVersion) <= parseAlphaBuild(baseVersion)) {
    fail('CANDIDATE_STAGE_NON_MONOTONIC_TARGET', `${baseVersion}->${productVersion}`);
  }
  const classes = assertAllowedPaths(files, materializer);
  const engineChanged = Object.values(classes).includes('engine-source');
  const pluginChanged = Object.values(classes).includes('plugin-source');
  return {baseSha:base, sourceSha:source, releaseSpec, materializer, productVersion, baseVersion, engineChanged, pluginChanged, files, classes};
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--inspect') {
    const result = inspectCandidate(args[0], args[1]);
    process.stdout.write(JSON.stringify(result));
    return;
  }
  fail('CANDIDATE_STAGE_USAGE');
}

module.exports = {
  RELEASE_SPEC_RE,
  MATERIALIZER_RE,
  GENERATED,
  classifyPath,
  assertAllowedPaths,
  changedReleaseSpecs,
  parseAlphaBuild,
  inspectCandidate,
};

if (require.main === module) {
  try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
