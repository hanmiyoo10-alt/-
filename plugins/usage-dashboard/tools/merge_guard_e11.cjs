#!/usr/bin/env node
'use strict';

const {execFileSync, spawnSync} = require('node:child_process');

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

function gitIsAncestor(ancestorSha, descendantSha, options = {}) {
  const ancestor = normalizeSha(ancestorSha,'E14_ANCESTOR_SHA_INVALID');
  const descendant = normalizeSha(descendantSha,'E14_DESCENDANT_SHA_INVALID');
  const result = spawnSync('git',['merge-base','--is-ancestor',ancestor,descendant],{stdio:'ignore',...options});
  if (result.error) throw result.error;
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  fail('E14_ANCESTRY_CHECK_FAILED',`${ancestor}:${descendant}:exit=${result.status}`);
}

function nulList(value) {
  return String(value || '').split('\0').filter(Boolean);
}

function candidateParents(candidateSha, options = {}) {
  const sha = normalizeSha(candidateSha,'E11_CANDIDATE_SHA_INVALID');
  const row = git(['rev-list','--parents','-n','1',sha],options).split(/\s+/).filter(Boolean);
  const parents = row.slice(1);
  if (parents.length < 1 || parents.length > 2) fail('E14_CANDIDATE_PARENT_COUNT',String(parents.length));
  return parents;
}

function candidateParent(candidateSha, options = {}) {
  return candidateParents(candidateSha,options)[0];
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

function candidateDagAgreement(candidateSha, options = {}) {
  const candidate = normalizeSha(candidateSha,'E11_CANDIDATE_SHA_INVALID');
  const identity = materializationIdentity(candidate,options);
  const parents = candidateParents(candidate,options);
  if (!identity?.frozenMainSha) {
    return {
      mode:'legacy-ancestry-fallback',
      parentCount:parents.length,
      firstParentSha:parents[0],
      frozenMainSha:null,
      frozenMainReachable:null,
    };
  }

  const frozenMain = normalizeSha(identity.frozenMainSha,'E11_FROZEN_MAIN_SHA_INVALID');
  try { git(['cat-file','-e',`${frozenMain}^{commit}`],options); }
  catch { fail('E11_FROZEN_MAIN_COMMIT_MISSING',frozenMain); }

  const firstParent = parents[0];
  const frozenAlreadyInFirstParent = firstParent === frozenMain || gitIsAncestor(frozenMain,firstParent,options);
  if (parents.length === 1 && !frozenAlreadyInFirstParent) {
    fail('E14_FROZEN_MAIN_PARENT_MISSING',`${candidate}:base=${frozenMain}:first=${firstParent}`);
  }
  if (parents.length === 2) {
    if (parents[1] !== frozenMain) {
      fail('E14_FROZEN_MAIN_PARENT_MISMATCH',`${parents[1]}:expected=${frozenMain}`);
    }
    if (frozenAlreadyInFirstParent) {
      fail('E14_REDUNDANT_FROZEN_MAIN_PARENT',`${candidate}:base=${frozenMain}:first=${firstParent}`);
    }
  }
  if (!gitIsAncestor(frozenMain,candidate,options)) {
    fail('E14_FROZEN_MAIN_NOT_CANDIDATE_ANCESTOR',`${frozenMain}:${candidate}`);
  }

  return {
    mode:parents.length === 2 ? 'e14-two-parent-converged' : 'e14-one-parent-converged',
    parentCount:parents.length,
    firstParentSha:firstParent,
    secondParentSha:parents[1] || null,
    frozenMainSha:frozenMain,
    frozenMainReachable:true,
  };
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
  const dag = candidateDagAgreement(candidate,options);
  try { execFileSync('git',['merge-base','--is-ancestor',base,main],{stdio:'ignore',...options}); }
  catch { fail('E11_MAIN_NOT_DESCENDANT_OF_CANDIDATE_BASE',`${base}:${main}`); }
  const result = classifyPaths(changedPaths(base,main,options));
  return {
    candidateSha:candidate,
    candidateParentSha:parent,
    candidateParentCount:dag.parentCount,
    candidateDagMode:dag.mode,
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
  gitIsAncestor,
  candidateParents,
  candidateParent,
  frozenMainFromMessage,
  materializationIdentity,
  candidateBase,
  candidateDagAgreement,
  changedPaths,
  isProtected,
  classifyPaths,
  classify,
};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
