#!/usr/bin/env node
'use strict';

const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const {ALLOWLIST} = require('./promote_release_blobs.cjs');

const RELEASE_CONTROL_PATHS = Object.freeze([
  '.github/workflows/usage-dashboard-stage-e7.yml',
  '.github/workflows/usage-dashboard-validate.yml',
  '.github/workflows/usage-dashboard-validate-exact.yml',
  '.github/workflows/reusable-usage-dashboard-validate.yml',
  '.github/workflows/usage-dashboard-promote.yml',
  '.github/workflows/reusable-usage-dashboard-promote.yml',
  'plugins/usage-dashboard/tools/release_generic_preflight.cjs',
  'plugins/usage-dashboard/tools/promote_release_blobs.cjs',
  'plugins/usage-dashboard/tools/classify_release_candidate.cjs',
  'plugins/usage-dashboard/tools/check_release_blob_parity.cjs',
  'plugins/usage-dashboard/tools/resolve_release_spec.cjs',
]);

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function normalizeBlobMap(input) {
  const map = {};
  for (const path of ALLOWLIST) {
    const sha = input?.[path];
    if (!sha) fail('CLASSIFIER_ARTIFACT_MISSING', path);
    map[path] = String(sha);
  }
  return map;
}

function classifyBlobMaps(base, candidate) {
  const left = normalizeBlobMap(base);
  const right = normalizeBlobMap(candidate);
  const changed = ALLOWLIST.filter((path) => left[path] !== right[path]);
  return {
    classification: changed.length ? 'RELEASE_CANDIDATE' : 'MAINTENANCE_ONLY',
    changedArtifacts: changed,
  };
}

function releaseControlChangedForPaths(paths) {
  const set = new Set(paths || []);
  return RELEASE_CONTROL_PATHS.some((path) => set.has(path));
}

function git(args) {
  return execFileSync('git', args, {encoding:'utf8'}).trim();
}

function resolveFirstParent(candidateSha) {
  const out = git(['rev-list','--parents','-n','1',candidateSha]).split(/\s+/).filter(Boolean);
  if (out.length < 2) fail('CLASSIFIER_PARENT_MISSING', candidateSha);
  return out[1];
}

function blobMapAt(ref) {
  const map = {};
  for (const path of ALLOWLIST) {
    let line = '';
    try { line = git(['ls-tree', ref, '--', path]); } catch { line = ''; }
    const match = /^\d+\s+blob\s+([0-9a-f]{40})\t/.exec(line);
    if (!match) fail('CLASSIFIER_ARTIFACT_MISSING', `${ref}:${path}`);
    map[path] = match[1];
  }
  return map;
}

function changedPaths(baseSha, candidateSha) {
  const out = git(['diff','--name-only',baseSha,candidateSha]);
  return out ? out.split('\n').filter(Boolean) : [];
}

function classifyCommit(candidateSha) {
  if (!/^[0-9a-f]{40}$/i.test(String(candidateSha || ''))) fail('CLASSIFIER_INVALID_CANDIDATE_SHA');
  const baseSha = resolveFirstParent(candidateSha);
  const result = classifyBlobMaps(blobMapAt(baseSha), blobMapAt(candidateSha));
  const paths = changedPaths(baseSha, candidateSha);
  return {
    ...result,
    candidateSha,
    baseSha,
    releaseControlChanged: releaseControlChangedForPaths(paths),
    changedPaths: paths,
  };
}

function writeGithubOutput(path, result) {
  const rows = [
    `classification=${result.classification}`,
    `base_sha=${result.baseSha}`,
    `release_control_changed=${result.releaseControlChanged ? 'true' : 'false'}`,
    `changed_artifact_count=${result.changedArtifacts.length}`,
  ];
  fs.appendFileSync(path, `${rows.join('\n')}\n`, 'utf8');
}

function main() {
  const args = process.argv.slice(2);
  const value = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 ? String(args[index + 1] || '') : fallback; };
  const candidateSha = value('--candidate-sha', process.env.GITHUB_SHA || '');
  const output = value('--github-output', process.env.GITHUB_OUTPUT || '');
  const result = classifyCommit(candidateSha);
  console.log(`${result.classification}:base=${result.baseSha}:candidate=${candidateSha}:production_changes=${result.changedArtifacts.length}:release_control=${result.releaseControlChanged ? 'yes' : 'no'}`);
  if (output) writeGithubOutput(output, result);
}

module.exports = {RELEASE_CONTROL_PATHS, normalizeBlobMap, classifyBlobMaps, releaseControlChangedForPaths, resolveFirstParent, blobMapAt, changedPaths, classifyCommit};
if (require.main === module) {
  try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
