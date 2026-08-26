#!/usr/bin/env node
'use strict';

const {execFileSync, spawnSync} = require('node:child_process');
const stagePolicy = require('./candidate_stage_policy.cjs');

const DERIVED_BRANCH_RE = /^stage\/usage-dashboard-3\.0\.0-alpha\.5\.\d+$/;
const GENERATED_EXACT = new Set([
  'plugins/usage-dashboard/latest.js',
  'plugins/usage-dashboard/src/manifest.json',
  'docs/USAGE_DASHBOARD_GUIDELINES.md',
]);
const GENERATED_PREFIXES = Object.freeze([
  'plugins/usage-dashboard/src/',
  'plugins/usage-dashboard/runtime/',
]);
const FROZEN_MAIN_TRAILER_PREFIX = 'Usage-Dashboard-Frozen-Main:';
const FROZEN_MAIN_TRAILER = /^Usage-Dashboard-Frozen-Main: ([0-9a-f]{40})$/;

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function normalizeSha(value, code = 'E6_INVALID_SHA') {
  const text = String(value || '').trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(text)) fail(code, text || 'missing');
  return text;
}

function git(args, options = {}) {
  return execFileSync('git', args, {encoding:'utf8', ...options}).trim();
}

function gitIsAncestor(ancestorSha, descendantSha, options = {}) {
  const ancestor = normalizeSha(ancestorSha, 'E14_ANCESTOR_SHA_INVALID');
  const descendant = normalizeSha(descendantSha, 'E14_DESCENDANT_SHA_INVALID');
  const result = spawnSync('git', ['merge-base','--is-ancestor',ancestor,descendant], {stdio:'ignore', ...options});
  if (result.error) throw result.error;
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  fail('E14_ANCESTRY_CHECK_FAILED', `${ancestor}:${descendant}:exit=${result.status}`);
}

function nulList(value) {
  return String(value || '').split('\0').filter(Boolean);
}

function deriveCandidateBranch(productVersion) {
  const version = String(productVersion || '').trim();
  if (!/^3\.0\.0-alpha\.5\.\d+$/.test(version)) fail('E6_PRODUCT_VERSION_DENIED', version || 'missing');
  return `stage/usage-dashboard-${version}`;
}

function assertDerivedBranch(value) {
  const branch = String(value || '').trim();
  if (!DERIVED_BRANCH_RE.test(branch)) fail('E6_DERIVED_BRANCH_DENIED', branch || 'missing');
  return branch;
}

function inspectTransaction(trustedBaseSha, sourceSha) {
  const trustedBase = normalizeSha(trustedBaseSha, 'E6_TRUSTED_BASE_SHA_INVALID');
  const source = normalizeSha(sourceSha, 'E6_SOURCE_SHA_INVALID');
  const intentBase = normalizeSha(git(['merge-base', trustedBase, source]), 'E6_INTENT_BASE_SHA_INVALID');
  const inspected = stagePolicy.inspectCandidate(intentBase, source);
  const candidateBranch = deriveCandidateBranch(inspected.productVersion);
  return {
    trustedBaseSha:trustedBase,
    intentBaseSha:intentBase,
    sourceSha:source,
    sourceBranch:'',
    candidateBranch,
    releaseSpec:inspected.releaseSpec,
    materializer:inspected.materializer,
    productVersion:inspected.productVersion,
    baseVersion:inspected.baseVersion,
    engineChanged:Boolean(inspected.engineChanged),
    pluginChanged:Boolean(inspected.pluginChanged),
    files:inspected.files,
    classes:inspected.classes,
  };
}

function payloadParentList(payloadSha, options = {}) {
  const payload = normalizeSha(payloadSha, 'E6_PAYLOAD_SHA_INVALID');
  const row = git(['rev-list','--parents','-n','1',payload],options).split(/\s+/).filter(Boolean);
  const parents = row.slice(1);
  if (parents.length < 1 || parents.length > 2) fail('E14_PAYLOAD_PARENT_COUNT', String(parents.length));
  return parents;
}

function payloadParents(payloadSha, options = {}) {
  const parents = payloadParentList(payloadSha, options);
  if (parents.length !== 1) fail('E6_PAYLOAD_PARENT_COUNT', String(parents.length));
  return parents[0];
}

function expectedParentList(trustedBaseSha, expectedParentSha, options = {}) {
  const base = normalizeSha(trustedBaseSha, 'E6_TRUSTED_BASE_SHA_INVALID');
  const expectedParent = normalizeSha(expectedParentSha, 'E6_EXPECTED_PARENT_SHA_INVALID');
  try { git(['cat-file','-e',`${base}^{commit}`],options); }
  catch { fail('E14_FROZEN_MAIN_COMMIT_MISSING', base); }
  try { git(['cat-file','-e',`${expectedParent}^{commit}`],options); }
  catch { fail('E14_PREVIOUS_CANDIDATE_COMMIT_MISSING', expectedParent); }
  if (expectedParent === base || gitIsAncestor(base, expectedParent, options)) return [expectedParent];
  return [expectedParent, base];
}

function payloadFrozenMain(payloadSha, options = {}) {
  const payload = normalizeSha(payloadSha, 'E6_PAYLOAD_SHA_INVALID');
  const message = git(['show','-s','--format=%B',payload],options);
  const lines = String(message).split(/\r?\n/).filter((line) => line.startsWith(FROZEN_MAIN_TRAILER_PREFIX));
  if (lines.length !== 1) fail('E14_FROZEN_MAIN_TRAILER_COUNT', String(lines.length));
  const match = lines[0].match(FROZEN_MAIN_TRAILER);
  if (!match) fail('E14_FROZEN_MAIN_TRAILER_INVALID', lines[0]);
  return normalizeSha(match[1], 'E14_FROZEN_MAIN_SHA_INVALID');
}

function treeEntryAt(payloadSha, path) {
  const row = git(['ls-tree',payloadSha,'--',path]);
  if (!row) return null;
  const match = /^(\d+)\s+(blob|tree|commit)\s+([0-9a-f]{40})\t/.exec(row);
  if (!match) fail('E6_PAYLOAD_TREE_INVALID', path);
  return {mode:match[1],type:match[2],sha:match[3]};
}

function changedPaths(baseSha, payloadSha) {
  const base = normalizeSha(baseSha, 'E6_TRUSTED_BASE_SHA_INVALID');
  const payload = normalizeSha(payloadSha, 'E6_PAYLOAD_SHA_INVALID');
  return [...new Set(nulList(execFileSync('git',['diff','--name-only','-z',base,payload],{encoding:'utf8'})))].sort();
}

function generatedPath(path) {
  const file = String(path || '');
  return GENERATED_EXACT.has(file) || GENERATED_PREFIXES.some(prefix => file.startsWith(prefix));
}

function parseSourceFiles(value) {
  let rows;
  try { rows = JSON.parse(String(value || '[]')); }
  catch (error) { fail('E6_SOURCE_FILES_INVALID', error.message); }
  if (!Array.isArray(rows)) fail('E6_SOURCE_FILES_INVALID', 'not-array');
  const files = [...new Set(rows.map(String).filter(Boolean))].sort();
  for (const file of files) {
    if (!file || /[\0\r\n]/.test(file) || file.startsWith('/') || file.split('/').includes('..')) {
      fail('E6_SOURCE_FILE_DENIED', file || 'empty');
    }
  }
  return files;
}

function verifyDerivedPayload(trustedBaseSha, expectedParentSha, payloadSha, sourceFilesJson, options = {}) {
  const base = normalizeSha(trustedBaseSha, 'E6_TRUSTED_BASE_SHA_INVALID');
  const expectedParent = normalizeSha(expectedParentSha, 'E6_EXPECTED_PARENT_SHA_INVALID');
  const payload = normalizeSha(payloadSha, 'E6_PAYLOAD_SHA_INVALID');
  try { git(['cat-file','-e',`${payload}^{commit}`],options); }
  catch { fail('E6_PAYLOAD_COMMIT_MISSING', payload); }

  const actualParents = payloadParentList(payload, options);
  const expectedParents = expectedParentList(base, expectedParent, options);
  if (actualParents[0] !== expectedParent) {
    fail('E14_FIRST_PARENT_MISMATCH', `${actualParents[0] || 'missing'}:expected=${expectedParent}`);
  }
  if (actualParents.length !== expectedParents.length) {
    if (expectedParents.length === 2 && actualParents.length === 1) {
      fail('E14_FROZEN_MAIN_PARENT_MISSING', base);
    }
    if (expectedParents.length === 1 && actualParents.length === 2) {
      fail('E14_REDUNDANT_FROZEN_MAIN_PARENT', `${actualParents[1]}:base=${base}`);
    }
    fail('E14_PAYLOAD_PARENT_COUNT', `${actualParents.length}:expected=${expectedParents.length}`);
  }
  if (actualParents.length === 2 && actualParents[1] !== base) {
    fail('E14_FROZEN_MAIN_PARENT_MISMATCH', `${actualParents[1]}:expected=${base}`);
  }

  const recordedFrozenMain = payloadFrozenMain(payload, options);
  if (recordedFrozenMain !== base) {
    fail('E14_FROZEN_MAIN_TRAILER_MISMATCH', `${recordedFrozenMain}:expected=${base}`);
  }
  if (!gitIsAncestor(expectedParent, payload, options)) {
    fail('E14_PREVIOUS_CANDIDATE_NOT_ANCESTOR', `${expectedParent}:${payload}`);
  }
  if (!gitIsAncestor(base, payload, options)) {
    fail('E14_FROZEN_MAIN_NOT_ANCESTOR', `${base}:${payload}`);
  }

  const sourceFiles = new Set(parseSourceFiles(sourceFilesJson));
  const paths = changedPaths(base,payload);
  if (!paths.length) fail('E6_PAYLOAD_EMPTY');
  for (const path of paths) {
    if (!sourceFiles.has(path) && !generatedPath(path)) fail('E6_PAYLOAD_PATH_DENIED', path);
    const entry = treeEntryAt(payload,path);
    if (!entry) continue;
    if (entry.type !== 'blob' || !['100644','100755'].includes(entry.mode)) {
      fail('E6_PAYLOAD_MODE_DENIED', `${path}:${entry.mode}:${entry.type}`);
    }
  }
  return {
    base,
    expectedParent,
    payload,
    parents:actualParents,
    expectedParents,
    frozenMainSha:recordedFrozenMain,
    paths,
    sourceFiles:[...sourceFiles],
  };
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--derive-branch') {
    process.stdout.write(deriveCandidateBranch(args[0]));
    return;
  }
  if (command === '--check-derived-branch') {
    process.stdout.write(assertDerivedBranch(args[0]));
    return;
  }
  if (command === '--inspect') {
    process.stdout.write(JSON.stringify(inspectTransaction(args[0],args[1])));
    return;
  }
  if (command === '--verify-derived') {
    const result = verifyDerivedPayload(args[0],args[1],args[2],args[3]);
    console.log(`E14_DERIVED_PAYLOAD_VERIFIED:${result.payload}:parents=${result.parents.length}:paths=${result.paths.length}`);
    return;
  }
  fail('E6_STAGE_USAGE');
}

module.exports = {
  DERIVED_BRANCH_RE,
  GENERATED_EXACT,
  GENERATED_PREFIXES,
  FROZEN_MAIN_TRAILER_PREFIX,
  FROZEN_MAIN_TRAILER,
  normalizeSha,
  gitIsAncestor,
  deriveCandidateBranch,
  assertDerivedBranch,
  inspectTransaction,
  payloadParentList,
  payloadParents,
  expectedParentList,
  payloadFrozenMain,
  treeEntryAt,
  changedPaths,
  generatedPath,
  parseSourceFiles,
  verifyDerivedPayload,
};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
