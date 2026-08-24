#!/usr/bin/env node
'use strict';

const {execFileSync} = require('node:child_process');

const TARGET_BRANCH_RE = /^release\/usage-dashboard-[A-Za-z0-9._-]+$/;
const TARGET_BRANCH_TOKEN_RE = /release\/usage-dashboard-[A-Za-z0-9._-]+/g;
const SHA_TOKEN_RE = /(?<![0-9a-f])[0-9a-f]{40}(?![0-9a-f])/gi;
const RELEASE_SPEC_TOKEN_RE = /\.github\/usage-dashboard\/releases\/[A-Za-z0-9._-]+\.json/g;
const DENIED_BRANCHES = Object.freeze(['main','release-usage-dashboard','release-simcore']);
const OUTPUT_EXACT = Object.freeze([
  'plugins/usage-dashboard/latest.js',
  'docs/USAGE_DASHBOARD_GUIDELINES.md',
]);
const OUTPUT_PREFIXES = Object.freeze([
  'plugins/usage-dashboard/src/',
  'plugins/usage-dashboard/runtime-src/',
  'plugins/usage-dashboard/runtime/',
]);

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function uniqueInputToken(value, regex, code) {
  const text = String(value || '');
  const matches = text.match(regex) || [];
  const unique = [...new Set(matches.map(String))];
  if (unique.length !== 1) fail(code, `matches=${unique.length}`);
  return unique[0];
}

function assertSha(value, code = 'CANDIDATE_PREP_INVALID_SHA') {
  if (!/^[0-9a-f]{40}$/i.test(String(value || ''))) fail(code, String(value || ''));
  return String(value);
}

function assertTargetBranch(branch) {
  const value = String(branch || '');
  if (DENIED_BRANCHES.includes(value) || !TARGET_BRANCH_RE.test(value)) fail('CANDIDATE_PREP_TARGET_DENIED', value);
  return value;
}

function normalizeTargetBranchInput(value) {
  return assertTargetBranch(uniqueInputToken(value, TARGET_BRANCH_TOKEN_RE, 'CANDIDATE_PREP_TARGET_DENIED'));
}

function normalizeExpectedShaInput(value) {
  return assertSha(uniqueInputToken(value, SHA_TOKEN_RE, 'CANDIDATE_PREP_INVALID_SHA'));
}

function normalizeReleaseSpecInput(value) {
  const normalized = uniqueInputToken(value, RELEASE_SPEC_TOKEN_RE, 'CANDIDATE_PREP_RELEASE_SPEC_DENIED');
  if (!/^\.github\/usage-dashboard\/releases\/[A-Za-z0-9._-]+\.json$/.test(normalized)) {
    fail('CANDIDATE_PREP_RELEASE_SPEC_DENIED', normalized);
  }
  return normalized;
}

function safePath(path) {
  const value = String(path || '');
  if (!value || /[\0\r\n]/.test(value) || value.startsWith('/') || value.split('/').includes('..')) return false;
  return OUTPUT_EXACT.includes(value) || OUTPUT_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function assertAllowedPaths(paths) {
  const unique = [...new Set((paths || []).map(String).filter(Boolean))].sort();
  for (const path of unique) if (!safePath(path)) fail('CANDIDATE_PREP_PATH_DENIED', path);
  return unique;
}

function git(args, options = {}) {
  return execFileSync('git', args, {encoding:'utf8', ...options}).trim();
}

function nulList(buffer) {
  return String(buffer || '').split('\0').filter(Boolean);
}

function worktreeChangedPaths() {
  const tracked = nulList(execFileSync('git',['diff','--name-only','-z','HEAD'],{encoding:'utf8'}));
  const staged = nulList(execFileSync('git',['diff','--cached','--name-only','-z','HEAD'],{encoding:'utf8'}));
  const untracked = nulList(execFileSync('git',['ls-files','--others','--exclude-standard','-z'],{encoding:'utf8'}));
  return assertAllowedPaths([...tracked,...staged,...untracked]);
}

function payloadChangedPaths(expectedParent, payloadSha) {
  assertSha(expectedParent, 'CANDIDATE_PAYLOAD_PARENT_INVALID');
  assertSha(payloadSha, 'CANDIDATE_PAYLOAD_SHA_INVALID');
  const out = execFileSync('git',['diff','--name-only','-z',expectedParent,payloadSha],{encoding:'utf8'});
  return assertAllowedPaths(nulList(out));
}

function payloadParents(payloadSha) {
  assertSha(payloadSha, 'CANDIDATE_PAYLOAD_SHA_INVALID');
  const row = git(['rev-list','--parents','-n','1',payloadSha]).split(/\s+/).filter(Boolean);
  if (row.length !== 2) fail('CANDIDATE_PAYLOAD_PARENT_MISMATCH', row.slice(1).join(','));
  return row[1];
}

function treeEntryAt(payloadSha, path) {
  const row = git(['ls-tree',payloadSha,'--',path]);
  if (!row) return null;
  const match = /^(\d+)\s+(blob|tree|commit)\s+([0-9a-f]{40})\t/.exec(row);
  if (!match) fail('CANDIDATE_PAYLOAD_TREE_INVALID', path);
  return {mode:match[1],type:match[2],sha:match[3]};
}

function verifyPayloadCommit(expectedParent, payloadSha) {
  const expected = assertSha(expectedParent, 'CANDIDATE_PAYLOAD_PARENT_INVALID');
  const payload = assertSha(payloadSha, 'CANDIDATE_PAYLOAD_SHA_INVALID');
  try { git(['cat-file','-e',`${payload}^{commit}`]); } catch { fail('CANDIDATE_PAYLOAD_COMMIT_MISSING', payload); }
  const parent = payloadParents(payload);
  if (parent !== expected) fail('CANDIDATE_PAYLOAD_PARENT_MISMATCH', `${parent}:expected=${expected}`);
  const paths = payloadChangedPaths(expected,payload);
  if (!paths.length) fail('CANDIDATE_PAYLOAD_EMPTY');
  for (const path of paths) {
    const entry = treeEntryAt(payload,path);
    if (!entry) continue;
    if (entry.type !== 'blob' || !['100644','100755'].includes(entry.mode)) {
      fail('CANDIDATE_PAYLOAD_MODE_DENIED', `${path}:${entry.mode}:${entry.type}`);
    }
  }
  return {parent,payload,paths};
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--normalize-target') {
    process.stdout.write(normalizeTargetBranchInput(args.join(' ')));
    return;
  }
  if (command === '--normalize-sha') {
    process.stdout.write(normalizeExpectedShaInput(args.join(' ')));
    return;
  }
  if (command === '--normalize-spec') {
    process.stdout.write(normalizeReleaseSpecInput(args.join(' ')));
    return;
  }
  if (command === '--check-target') {
    console.log(`CANDIDATE_PREP_TARGET_OK:${assertTargetBranch(args[0])}`);
    return;
  }
  if (command === '--check-worktree') {
    const paths = worktreeChangedPaths();
    for (const path of paths) console.log(`CANDIDATE_PREP_OUTPUT:${path}`);
    return;
  }
  if (command === '--verify-payload') {
    const result = verifyPayloadCommit(args[0],args[1]);
    console.log(`CANDIDATE_PAYLOAD_VERIFIED:${result.payload}:paths=${result.paths.length}`);
    return;
  }
  fail('CANDIDATE_PREP_POLICY_USAGE');
}

module.exports = {
  TARGET_BRANCH_RE,
  TARGET_BRANCH_TOKEN_RE,
  SHA_TOKEN_RE,
  RELEASE_SPEC_TOKEN_RE,
  DENIED_BRANCHES,
  OUTPUT_EXACT,
  OUTPUT_PREFIXES,
  uniqueInputToken,
  assertSha,
  assertTargetBranch,
  normalizeTargetBranchInput,
  normalizeExpectedShaInput,
  normalizeReleaseSpecInput,
  safePath,
  assertAllowedPaths,
  worktreeChangedPaths,
  payloadChangedPaths,
  payloadParents,
  treeEntryAt,
  verifyPayloadCommit,
};

if (require.main === module) {
  try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exitCode=1; }
}
