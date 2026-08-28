#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const e15 = require('./release_handoff_e15.cjs');

const TITLE_RE = /^\[usage-dashboard-release\] (3\.0\.0-alpha\.5\.\d+)$/;
const BRANCH_RE = /^release\/usage-dashboard-[A-Za-z0-9._-]+$/;
const SPEC_RE = /^\.github\/usage-dashboard\/releases\/[A-Za-z0-9._-]+\.json$/;
const SHA_RE = /^[0-9a-f]{40}$/;
// `release_generation` is the durable transaction/wake generation axis.
// E14 and E15 are orthogonal baselines and intentionally do not extend this matcher.
const DURABLE_TRANSACTION_GENERATION_RE = /^(E9|E10|E11|E12|E13)$/;
const GENERATION_RE = DURABLE_TRANSACTION_GENERATION_RE; // backward-compatible export name

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function parseFieldLines(body) {
  const out = {};
  for (const raw of String(body || '').split(/\r?\n/)) {
    const match = /^([a-z_]+):\s*(.*?)\s*$/.exec(raw);
    if (!match) continue;
    const [,key,value] = match;
    if (Object.hasOwn(out,key)) fail('E9_REQUEST_DUPLICATE_FIELD', key);
    out[key] = value;
  }
  return out;
}

function parseIssue(title, body) {
  const titleMatch = TITLE_RE.exec(String(title || '').trim());
  if (!titleMatch) fail('E9_REQUEST_TITLE_DENIED');
  e15.validateRequestPluginDeclaration(body);
  const fields = parseFieldLines(body);
  const required = ['release_version','release_spec','source_branch','source_sha','feature_issue','release_generation'];
  for (const key of required) if (!fields[key]) fail('E9_REQUEST_FIELD_MISSING', key);
  if (fields.release_version !== titleMatch[1]) fail('E9_REQUEST_VERSION_MISMATCH', `${titleMatch[1]}!=${fields.release_version}`);
  if (!SPEC_RE.test(fields.release_spec)) fail('E9_REQUEST_SPEC_DENIED', fields.release_spec);
  if (!BRANCH_RE.test(fields.source_branch)) fail('E9_REQUEST_BRANCH_DENIED', fields.source_branch);
  const sourceSha = fields.source_sha.toLowerCase();
  if (!SHA_RE.test(sourceSha)) fail('E9_REQUEST_SOURCE_SHA_DENIED', fields.source_sha);
  const featureMatch = /^#([1-9]\d*)$/.exec(fields.feature_issue);
  if (!featureMatch) fail('E9_REQUEST_FEATURE_ISSUE_DENIED', fields.feature_issue);
  if (!DURABLE_TRANSACTION_GENERATION_RE.test(fields.release_generation)) fail('E9_REQUEST_GENERATION_DENIED', fields.release_generation);
  let prNumber = null;
  if (fields.pr_number && fields.pr_number !== 'PENDING') {
    const prMatch = /^#?([1-9]\d*)$/.exec(fields.pr_number);
    if (!prMatch) fail('E9_REQUEST_PR_NUMBER_DENIED', fields.pr_number);
    prNumber = Number(prMatch[1]);
  }
  const attemptKey = `${fields.release_version}:${sourceSha}`;
  const attemptId = crypto.createHash('sha256').update(attemptKey).digest('hex').slice(0,24);
  return {
    releaseVersion:fields.release_version,
    releaseSpec:fields.release_spec,
    sourceBranch:fields.source_branch,
    sourceSha,
    featureIssue:Number(featureMatch[1]),
    releaseGeneration:fields.release_generation,
    prNumber,
    attemptKey,
    attemptId,
  };
}

function commentBodies(comments) {
  if (!Array.isArray(comments)) return [];
  return comments.map((row) => String(row?.body || ''));
}

function markerFor(prefix, value) {
  return value === undefined ? prefix : `${prefix}:${value}`;
}

function hasMarker(comments, prefix, value) {
  const marker = markerFor(prefix,value);
  return commentBodies(comments).some((body) => body.split(/\r?\n/).some((line) => line.trim() === marker));
}

function latestCandidate(comments, sourceSha) {
  let found = null;
  for (const body of commentBodies(comments)) {
    if (!body.includes('UD_CANDIDATE_READY')) continue;
    const source = /^source_sha:\s*([0-9a-f]{40})$/m.exec(body)?.[1];
    const candidate = /^candidate_sha:\s*([0-9a-f]{40})$/m.exec(body)?.[1];
    const branch = /^candidate_branch:\s*(stage\/usage-dashboard-[^\s]+)$/m.exec(body)?.[1];
    if (source === sourceSha && candidate && branch) found = {sourceSha:source,candidateSha:candidate,candidateBranch:branch};
  }
  return found;
}

function latestValidation(comments, candidateSha) {
  let found = null;
  for (const body of commentBodies(comments)) {
    if (!body.includes('UD_VALIDATION_RESULT')) continue;
    const validated = /^validated_sha:\s*([0-9a-f]{40})$/m.exec(body)?.[1];
    const status = /^status:\s*(GREEN|RED)$/m.exec(body)?.[1];
    if (validated === candidateSha && status) found = {validatedSha:validated,status};
  }
  return found;
}

function latestDeployment(comments, releaseVersion) {
  let found = null;
  for (const body of commentBodies(comments)) {
    if (!body.includes('UD_RELEASE_DEPLOYED')) continue;
    const release = /^release:\s*(3\.0\.0-alpha\.5\.\d+)$/m.exec(body)?.[1];
    const mergeSha = /^main_merge_sha:\s*([0-9a-f]{40})$/m.exec(body)?.[1];
    const productionSha = /^release_branch_sha:\s*([0-9a-f]{40})$/m.exec(body)?.[1];
    const parity = /^exact_byte_parity:\s*(VERIFIED)$/m.exec(body)?.[1];
    if (release === releaseVersion && mergeSha && productionSha && parity) found = {release,mergeSha,productionSha,parity};
  }
  return found;
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--parse-json') {
    process.stdout.write(JSON.stringify(parseIssue(args[0], args.slice(1).join(' '))));
    return;
  }
  if (command === '--attempt-id') {
    process.stdout.write(parseIssue(args[0], args.slice(1).join(' ')).attemptId);
    return;
  }
  fail('E9_REQUEST_USAGE');
}

module.exports = {TITLE_RE,BRANCH_RE,SPEC_RE,SHA_RE,DURABLE_TRANSACTION_GENERATION_RE,GENERATION_RE,parseFieldLines,parseIssue,markerFor,hasMarker,latestCandidate,latestValidation,latestDeployment};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
