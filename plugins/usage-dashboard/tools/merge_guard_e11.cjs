#!/usr/bin/env node
'use strict';

const {execFileSync} = require('node:child_process');

const PROTECTED_PREFIXES = Object.freeze([
  'plugins/usage-dashboard/',
  '.github/usage-dashboard/',
  'docs/USAGE_DASHBOARD_',
  '.github/plugin-control-plane/',
]);
const PROTECTED_EXACT = new Set([
  'scripts/bootstrap-usage-dashboard.sh',
]);
const MATERIALIZATION_MESSAGE = /^materialize: Usage Dashboard (3\.0\.0-alpha\.5\.\d+) from source ([0-9a-f]{40})(?:\r?\n|$)/;
const FROZEN_MAIN_TRAILER_PREFIX = 'Usage-Dashboard-Frozen-Main:';
const FROZEN_MAIN_TRAILER = /^Usage-Dashboard-Frozen-Main: ([0-9a-f]{40})$/;
const MAX_MATERIALIZATION_CHAIN = 64;

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function normalizeSha(value, code) {
  const sha = String(value || '').trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(sha)) fail(code,sha || 'missing');
  return sha;
}

function git(args, options = {}) {
  return execFileSync('git',args,{encoding:'utf8',...options}).trim();
}

function nulList(value) {
  return String(value || '').split('\0').filter(Boolean);
}

function candidateParent(candidateSha, options = {}) {
  const sha = normalizeSha(candidateSha,'E11_CANDIDATE_SHA_INVALID');
  const row = git(['rev-list','--parents','-n','1',sha],options).split(/\s+/).filter(Boolean);
  if (row.length !== 2) fail('E11_CANDIDATE_PARENT_COUNT',String(Math.max(0,row.length - 1)));
  return row[1];
}

function frozenMainFromMessage(message) {
  const trailerLines = String(message || '').split(/\r?\n/)
    .filter((line) => line.startsWith(FROZEN_MAIN_TRAILER_PREFIX));
  if (!trailerLines.length) return null;
  if (trailerLines.length !== 1) fail('E11_FROZEN_MAIN_TRAILER_COUNT',String(trailerLines.length));
  const match = trailerLines[0].match(FROZEN_MAIN_TRAILER);
  if (!match) fail('E11_FROZEN_MAIN_TRAILER_INVALID',trailerLines[0]);
  return normalizeSha(match[1],'E11_FROZEN_MAIN_SHA_INVALID');
}

function materializationIdentity(commitSha, options = {}) {
  const sha = normalizeSha(commitSha,'E11_CANDIDATE_SHA_INVALID');
  const message = git(['show','-s','--format=%B',sha],options);
  const match = message.match(MATERIALIZATION_MESSAGE);
  if (!match) return null;
  return {
    version:match[1],
    sourceSha:match[2],
    frozenMainSha:frozenMainFromMessage(message),
  };
}

function candidateBase(candidateSha, options = {}) {
  const candidate = normalizeSha(candidateSha,'E11_CANDIDATE_SHA_INVALID');
  const identity = materializationIdentity(candidate,options);
  if (!identity) return candidateParent(candidate,options);
  if (identity.frozenMainSha) {
    try { git(['cat-file','-e',`${identity.frozenMainSha}^{commit}`],options); }
    catch { fail('E11_FROZEN_MAIN_COMMIT_MISSING',identity.frozenMainSha); }
    return identity.frozenMainSha;
  }
  let cursor = candidate;
  for (let depth = 0; depth < MAX_MATERIALIZATION_CHAIN; depth += 1) {
    const parent = candidateParent(cursor,options);
    const parentIdentity = materializationIdentity(parent,options);
    if (!parentIdentity || parentIdentity.version !== identity.version) return parent;
    cursor = parent;
  }
  fail('E11_CANDIDATE_MATERIALIZATION_CHAIN_TOO_DEEP',candidate);
}

function changedPaths(baseSha, headSha, options = {}) {
  const base = normalizeSha(baseSha,'E11_BASE_SHA_INVALID');
  const head = normalizeSha(headSha,'E11_MAIN_SHA_INVALID');
  return [...new Set(nulList(execFileSync('git',['diff','--name-only','-z',base,head],{encoding:'utf8',...options})))].sort();
}

function isProtected(path) {
  const file = String(path || '');
  if (PROTECTED_EXACT.has(file)) return true;
  if (PROTECTED_PREFIXES.some((prefix) => file.startsWith(prefix))) return true;
  if (file.startsWith('.github/workflows/usage-dashboard-')) return true;
  if (file.startsWith('.github/workflows/reusable-usage-dashboard-')) return true;
  return false;
}

function classifyPaths(paths) {
  const changed = [...new Set((paths || []).map(String).filter(Boolean))].sort();
  const protectedPaths = changed.filter(isProtected);
  const verdict = protectedPaths.length
    ? 'MERGE_BLOCKED_PROTECTED_MAIN_DRIFT'
    : changed.length
      ? 'MERGE_READY_WITH_UNRELATED_MAIN_DRIFT'
      : 'MERGE_READY_NO_DRIFT';
  return {verdict,changedPaths:changed,protectedPaths};
}

function classify(candidateSha, currentMainSha, options = {}) {
  const candidate = normalizeSha(candidateSha,'E11_CANDIDATE_SHA_INVALID');
  const main = normalizeSha(currentMainSha,'E11_MAIN_SHA_INVALID');
  try { git(['cat-file','-e',`${candidate}^{commit}`],options); }
  catch { fail('E11_CANDIDATE_COMMIT_MISSING',candidate); }
  try { git(['cat-file','-e',`${main}^{commit}`],options); }
  catch { fail('E11_MAIN_COMMIT_MISSING',main); }
  const parent = candidateParent(candidate,options);
  const identity = materializationIdentity(candidate,options);
  const base = candidateBase(candidate,options);
  try { execFileSync('git',['merge-base','--is-ancestor',base,main],{stdio:'ignore',...options}); }
  catch { fail('E11_MAIN_NOT_DESCENDANT_OF_CANDIDATE_BASE',`${base}:${main}`); }
  const result = classifyPaths(changedPaths(base,main,options));
  return {
    candidateSha:candidate,
    candidateParentSha:parent,
    candidateBaseSha:base,
    candidateBaseSource:identity?.frozenMainSha ? 'explicit-frozen-main-trailer' : 'ancestry-compatibility-fallback',
    currentMainSha:main,
    ...result,
  };
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--classify') {
    process.stdout.write(JSON.stringify(classify(args[0],args[1])));
    return;
  }
  fail('E11_MERGE_GUARD_USAGE');
}

module.exports = {
  PROTECTED_PREFIXES,
  PROTECTED_EXACT,
  MATERIALIZATION_MESSAGE,
  FROZEN_MAIN_TRAILER_PREFIX,
  FROZEN_MAIN_TRAILER,
  MAX_MATERIALIZATION_CHAIN,
  candidateParent,
  frozenMainFromMessage,
  materializationIdentity,
  candidateBase,
  changedPaths,
  isProtected,
  classifyPaths,
  classify,
};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
