#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const rr = require('./release_request_e9.cjs');

const SHA_RE = /^[0-9a-f]{40}$/;
const DECISIONS = Object.freeze({
  REUSE_EXISTING:'REUSE_EXISTING',
  CREATE_ALLOWED:'CREATE_ALLOWED',
  ASSISTANT_CREATE_REQUIRED:'ASSISTANT_CREATE_REQUIRED',
  BLOCK_AMBIGUOUS:'BLOCK_AMBIGUOUS',
  BLOCK_STALE:'BLOCK_STALE',
  BLOCK_INVALID:'BLOCK_INVALID',
});

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function positiveInt(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) fail(code, String(value));
  return number;
}

function requestMarker(requestNumber) {
  return `Usage-Dashboard-Release-Request: #${positiveInt(requestNumber,'E25_REQUEST_NUMBER_INVALID')}`;
}

function normalizePr(raw) {
  if (!raw || typeof raw !== 'object') fail('E25_PR_SHAPE_INVALID');
  const number = positiveInt(raw.number,'E25_PR_NUMBER_INVALID');
  return {
    number,
    state:String(raw.state || ''),
    merged:Boolean(raw.merged || raw.merged_at),
    baseRef:String(raw.base?.ref || ''),
    headRef:String(raw.head?.ref || ''),
    headSha:String(raw.head?.sha || '').toLowerCase(),
    headRepository:String(raw.head?.repo?.full_name || ''),
    body:String(raw.body || ''),
  };
}

function validateIdentity(pr, expected) {
  if (pr.baseRef !== 'main') return {decision:DECISIONS.BLOCK_INVALID,reason:'E25_PR_BASE_DENIED'};
  if (pr.headRepository !== expected.repository) return {decision:DECISIONS.BLOCK_INVALID,reason:'E25_PR_REPOSITORY_DENIED'};
  if (pr.headRef !== expected.candidateBranch) return {decision:DECISIONS.BLOCK_INVALID,reason:'E25_PR_HEAD_BRANCH_MISMATCH'};
  if (!pr.body.includes(expected.marker)) return {decision:DECISIONS.BLOCK_INVALID,reason:'E25_PR_REQUEST_MARKER_MISSING'};
  if (pr.merged) return {decision:DECISIONS.BLOCK_INVALID,reason:'E25_PR_ALREADY_MERGED'};
  if (pr.state !== 'open') return {decision:DECISIONS.BLOCK_INVALID,reason:'E25_PR_CLOSED_UNMERGED'};
  if (pr.headSha !== expected.candidateSha) return {decision:DECISIONS.BLOCK_STALE,reason:'E25_PR_HEAD_SHA_STALE'};
  return {decision:DECISIONS.REUSE_EXISTING,reason:'E25_PR_IDENTITY_CURRENT',prNumber:pr.number};
}

function classifyPrHandoff(input) {
  const requestNumber = positiveInt(input?.requestNumber,'E25_REQUEST_NUMBER_INVALID');
  const releaseVersion = String(input?.releaseVersion || '');
  if (!/^3\.0\.0-alpha\.5\.\d+$/.test(releaseVersion)) fail('E25_RELEASE_VERSION_INVALID',releaseVersion);
  const candidateBranch = String(input?.candidateBranch || '');
  if (candidateBranch !== `stage/usage-dashboard-${releaseVersion}`) fail('E25_CANDIDATE_BRANCH_INVALID',candidateBranch);
  const candidateSha = String(input?.candidateSha || '').toLowerCase();
  if (!SHA_RE.test(candidateSha)) fail('E25_CANDIDATE_SHA_INVALID',candidateSha);
  const repository = String(input?.repository || '');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) fail('E25_REPOSITORY_INVALID',repository);
  const marker = requestMarker(requestNumber);
  const expected = {requestNumber,releaseVersion,candidateBranch,candidateSha,repository,marker};
  const prs = Array.isArray(input?.prs) ? input.prs.map(normalizePr) : [];
  const recordedPrNumber = input?.recordedPrNumber === null || input?.recordedPrNumber === undefined || input?.recordedPrNumber === ''
    ? null
    : positiveInt(input.recordedPrNumber,'E25_RECORDED_PR_NUMBER_INVALID');

  if (recordedPrNumber !== null) {
    const matching = prs.filter((pr) => pr.number === recordedPrNumber);
    if (matching.length !== 1) return {decision:DECISIONS.BLOCK_INVALID,reason:'E25_RECORDED_PR_NOT_FOUND'};
    return validateIdentity(matching[0],expected);
  }

  const plausible = prs.filter((pr) => pr.headRef === candidateBranch || pr.body.includes(marker));
  if (plausible.length > 1) return {decision:DECISIONS.BLOCK_AMBIGUOUS,reason:'E25_MULTIPLE_PLAUSIBLE_PRS'};
  if (plausible.length === 1) return validateIdentity(plausible[0],expected);

  if (input?.allowCreate === true) return {decision:DECISIONS.CREATE_ALLOWED,reason:'E25_TRUSTED_CREATE_MODE_ALLOWED'};
  return {decision:DECISIONS.ASSISTANT_CREATE_REQUIRED,reason:'E25_TRUSTED_CREATE_NOT_PROVEN'};
}

function compareExpected(parsed, expected) {
  const checks = [
    ['releaseVersion',String(expected?.releaseVersion || '')],
    ['releaseSpec',String(expected?.releaseSpec || '')],
    ['sourceBranch',String(expected?.sourceBranch || '')],
    ['sourceSha',String(expected?.sourceSha || '').toLowerCase()],
    ['attemptId',String(expected?.attemptId || '')],
  ];
  for (const [key,value] of checks) {
    if (!value || String(parsed[key]) !== value) fail('E25_REQUEST_CAS_MISMATCH',key);
  }
}

function bindPrNumber({title,body,expected,prNumber}) {
  const parsed = rr.parseIssue(title,body);
  compareExpected(parsed,expected);
  if (parsed.prNumber !== null) fail('E25_REQUEST_PR_ALREADY_BOUND',String(parsed.prNumber));
  const number = positiveInt(prNumber,'E25_PR_NUMBER_INVALID');
  const lines = String(body || '').split(/\r?\n/);
  let replaced = false;
  const out = lines.map((line) => {
    if (/^pr_number:\s*/.test(line)) {
      if (replaced) fail('E25_REQUEST_DUPLICATE_PR_FIELD');
      replaced = true;
      return `pr_number: #${number}`;
    }
    return line;
  });
  if (!replaced) {
    const generationIndex = out.findIndex((line) => /^release_generation:\s*/.test(line));
    const insertAt = generationIndex >= 0 ? generationIndex + 1 : out.length;
    out.splice(insertAt,0,`pr_number: #${number}`);
  }
  const patched = out.join('\n');
  const rebound = rr.parseIssue(title,patched);
  compareExpected(rebound,expected);
  if (rebound.prNumber !== number) fail('E25_REQUEST_BIND_POSTVERIFY_FAILED');
  return patched;
}

function stablePrBody({requestNumber,releaseVersion,summary='Usage Dashboard release candidate'}) {
  const marker = requestMarker(requestNumber);
  const version = String(releaseVersion || '');
  if (!/^3\.0\.0-alpha\.5\.\d+$/.test(version)) fail('E25_RELEASE_VERSION_INVALID',version);
  const safeSummary = String(summary || '').replace(/[\r\n]+/g,' ').trim().slice(0,160) || 'Usage Dashboard release candidate';
  return [
    '## Summary',
    '',
    safeSummary,
    '',
    marker,
    '',
    'Candidate authority: current PR head',
    'Source authority: durable release request `source_sha`',
    'Frozen-main authority: candidate trailer + E11 receipt',
    'Validation authority: E9 exact-SHA receipt',
    'Merge authority: fresh E11 receipt + expected-head merge',
    `Expected release: ${version}`,
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--classify-file') {
    const [requestNumber,releaseVersion,candidateBranch,candidateSha,repository,prsFile,allowCreateText='false'] = args;
    const prs = JSON.parse(fs.readFileSync(prsFile,'utf8'));
    const decision = classifyPrHandoff({requestNumber,releaseVersion,candidateBranch,candidateSha,repository,prs,allowCreate:allowCreateText === 'true'});
    process.stdout.write(JSON.stringify(decision));
    return;
  }
  if (command === '--bind-file') {
    const [requestFile,expectedJson,prNumber] = args;
    const issue = JSON.parse(fs.readFileSync(requestFile,'utf8'));
    process.stdout.write(bindPrNumber({title:issue.title,body:issue.body,expected:JSON.parse(expectedJson),prNumber}));
    return;
  }
  if (command === '--pr-body') {
    const [requestNumber,releaseVersion,...summaryParts] = args;
    process.stdout.write(stablePrBody({requestNumber,releaseVersion,summary:summaryParts.join(' ')}));
    return;
  }
  fail('E25_PR_HANDOFF_USAGE');
}

module.exports = {DECISIONS,requestMarker,normalizePr,classifyPrHandoff,bindPrNumber,stablePrBody};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
