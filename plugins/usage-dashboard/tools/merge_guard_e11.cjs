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

function candidateParent(candidateSha) {
  const sha = normalizeSha(candidateSha,'E11_CANDIDATE_SHA_INVALID');
  const row = git(['rev-list','--parents','-n','1',sha]).split(/\s+/).filter(Boolean);
  if (row.length !== 2) fail('E11_CANDIDATE_PARENT_COUNT',String(Math.max(0,row.length - 1)));
  return row[1];
}

function changedPaths(baseSha, headSha) {
  const base = normalizeSha(baseSha,'E11_BASE_SHA_INVALID');
  const head = normalizeSha(headSha,'E11_MAIN_SHA_INVALID');
  return [...new Set(nulList(execFileSync('git',['diff','--name-only','-z',base,head],{encoding:'utf8'})))].sort();
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

function classify(candidateSha, currentMainSha) {
  const candidate = normalizeSha(candidateSha,'E11_CANDIDATE_SHA_INVALID');
  const main = normalizeSha(currentMainSha,'E11_MAIN_SHA_INVALID');
  try { git(['cat-file','-e',`${candidate}^{commit}`]); }
  catch { fail('E11_CANDIDATE_COMMIT_MISSING',candidate); }
  try { git(['cat-file','-e',`${main}^{commit}`]); }
  catch { fail('E11_MAIN_COMMIT_MISSING',main); }
  const parent = candidateParent(candidate);
  try { execFileSync('git',['merge-base','--is-ancestor',parent,main],{stdio:'ignore'}); }
  catch { fail('E11_MAIN_NOT_DESCENDANT_OF_CANDIDATE_BASE',`${parent}:${main}`); }
  const result = classifyPaths(changedPaths(parent,main));
  return {
    candidateSha:candidate,
    candidateParentSha:parent,
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
  candidateParent,
  changedPaths,
  isProtected,
  classifyPaths,
  classify,
};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
