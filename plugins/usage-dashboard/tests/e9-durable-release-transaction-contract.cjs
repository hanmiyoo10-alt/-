'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const rr = require('../tools/release_request_e9.cjs');
const changes = require('../tools/source_change_semantics.cjs');
const readinessHelper = require('../tools/source_readiness_e9.cjs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();

const requestBody = [
  'Plugin: usage-dashboard',
  'release_version: 3.0.0-alpha.5.76',
  'release_spec: .github/usage-dashboard/releases/5.76.json',
  'source_branch: release/usage-dashboard-576-e9-fixture',
  'source_sha: 0123456789abcdef0123456789abcdef01234567',
  'feature_issue: #999',
  'release_generation: E9',
  'pr_number: #1000',
].join('\n');
const request = rr.parseIssue('[usage-dashboard-release] 3.0.0-alpha.5.76', requestBody);
assert.equal(request.releaseVersion,'3.0.0-alpha.5.76');
assert.equal(request.sourceSha,'0123456789abcdef0123456789abcdef01234567');
assert.equal(request.releaseGeneration,'E9');
assert.equal(request.prNumber,1000);
assert.equal(request.attemptKey,'3.0.0-alpha.5.76:0123456789abcdef0123456789abcdef01234567');
assert.match(request.attemptId,/^[0-9a-f]{24}$/);
const e10Request = rr.parseIssue('[usage-dashboard-release] 3.0.0-alpha.5.76', requestBody.replace('release_generation: E9','release_generation: E10'));
assert.equal(e10Request.releaseGeneration,'E10');
assert.throws(() => rr.parseIssue('[usage-dashboard-release] 3.0.0-alpha.5.76', requestBody.replace('release_generation: E9','release_generation: E8')), /E9_REQUEST_GENERATION_DENIED/);
assert.throws(() => rr.parseIssue('[usage-dashboard-release] 3.0.0-alpha.5.76', requestBody.replace('0123456789abcdef0123456789abcdef01234567','main')), /E9_REQUEST_SOURCE_SHA_DENIED/);

const comments = [
  {body:'SOURCE_SHA_READY:0123456789abcdef0123456789abcdef01234567\nstate: REQUESTED'},
  {body:'UD_CANDIDATE_READY\nsource_sha: 0123456789abcdef0123456789abcdef01234567\ncandidate_branch: stage/usage-dashboard-3.0.0-alpha.5.76\ncandidate_sha: abcdef0123456789abcdef0123456789abcdef01'},
  {body:'UD_VALIDATION_RESULT\nvalidated_sha: abcdef0123456789abcdef0123456789abcdef01\nstatus: GREEN'},
  {body:'UD_RELEASE_DEPLOYED\nrelease: 3.0.0-alpha.5.76\nmain_merge_sha: 1111111111111111111111111111111111111111\nrelease_branch_sha: 2222222222222222222222222222222222222222\nexact_byte_parity: VERIFIED'},
];
assert.equal(rr.hasMarker(comments,'SOURCE_SHA_READY','0123456789abcdef0123456789abcdef01234567'),true);
assert.equal(rr.latestCandidate(comments,request.sourceSha).candidateSha,'abcdef0123456789abcdef0123456789abcdef01');
assert.equal(rr.latestValidation(comments,'abcdef0123456789abcdef0123456789abcdef01').status,'GREEN');
assert.equal(rr.latestDeployment(comments,'3.0.0-alpha.5.76').productionSha,'2222222222222222222222222222222222222222');

const parsedChanges = changes.parseNameStatusZ([
  'A','a.txt',
  'M','m.txt',
  'D','d.txt',
  'R100','old.txt','new.txt',
  'T','type.txt',''
].join('\0'));
assert.deepEqual(parsedChanges.map((row)=>row.kind),['A','D','M','R','T']);
const rename = parsedChanges.find((row)=>row.kind==='R');
assert.equal(rename.from,'old.txt');
assert.equal(rename.path,'new.txt');
assert.throws(() => changes.parseNameStatusZ(['C100','a','b',''].join('\0')),/E9_CHANGE_STATUS_DENIED/);

const stagePolicy = fs.readFileSync('plugins/usage-dashboard/tools/candidate_stage_policy.cjs','utf8');
assert.match(stagePolicy,/require\('\.\/source_change_semantics\.cjs'\)/);
assert.match(stagePolicy,/changeSemantics\.changedPaths\(base, source\)/);
assert.ok(!stagePolicy.includes("--diff-filter=ACDMRT"),'stage policy must not own a second change-semantics implementation');

const readiness = fs.readFileSync('plugins/usage-dashboard/tools/source_readiness_e9.cjs','utf8');
for (const token of [
  'SOURCE_SHA_NOT_READY',
  'historical-literal',
  'deleted-owner',
  'stale-part-boundary',
  'E9_READINESS_CHANGE_SEMANTICS_DRIFT',
  'assertMaterializerSyntax',
  'materializer-syntax',
]) assert.ok(readiness.includes(token),`readiness missing ${token}`);
readinessHelper.assertPythonSyntax('value = 1\n','fixture.py');
assert.throws(() => readinessHelper.assertPythonSyntax('value = “broken”\n','fixture.py'),/SOURCE_SHA_NOT_READY:materializer-syntax:fixture\.py/);

const reconcile = fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml','utf8');
for (const token of [
  'issues:',
  'types: [opened, edited, reopened]',
  'workflow_run:',
  'Usage Dashboard Exact-Byte Promotion',
  "github.event.workflow_run.conclusion == 'success'",
  "cron: '*/5 * * * *'",
  'group: usage-dashboard-e9-release-reconcile',
  'SOURCE_SHA_READY:',
  'SOURCE_SHA_NOT_READY:',
  'UD_E9_STAGE_DISPATCHED:',
  'usage-dashboard-stage-e7.yml/dispatches',
  'UD_E9_CANDIDATE_READY:',
  'UD_E9_PR_REQUIRED:',
  'Usage-Dashboard-Release-Request:',
  'usage-dashboard-e9-validate.yml/dispatches',
  'check_release_blob_parity.cjs',
  'UD_E9_DEPLOYED:',
  'E9_F_RELEASE_PROOF',
  'E10_REAL_RELEASE_PROOF',
  "GENERATION_STATE\" == 'open'",
  'physical_verification: PENDING',
]) assert.ok(reconcile.includes(token),`durable reconciler missing ${token}`);
assert.ok(!reconcile.includes('git push'),'durable reconciler must never mutate candidate or production refs directly');

const bootstrap = fs.readFileSync('docs/USAGE_DASHBOARD_PR_BOOTSTRAP_CURRENT_CONTRACT.md','utf8');
for (const token of [
  'Candidate authority: current PR head',
  'Source authority: durable release request source_sha',
  'Frozen-main authority: candidate trailer + E11 receipt',
  'The PR body is a human-facing locator, not a mutable release-state database.',
  'There is no PR-body refresh writer',
  'do not add a second PR-body synchronization step for mutable SHA prose',
]) assert.ok(bootstrap.includes(token),`release PR bootstrap presentation contract missing ${token}`);
for (const staleLabel of ['Candidate SHA: `','Source SHA: `','Frozen main: `']) {
  assert.ok(!bootstrap.includes(staleLabel),`release PR bootstrap contract must not template mutable SHA prose: ${staleLabel}`);
}

const exact = fs.readFileSync('.github/workflows/usage-dashboard-e9-validate.yml','utf8');
for (const token of [
  'workflow_dispatch:',
  'request_issue:',
  'candidate_sha:',
  'E9_VALIDATION_IDENTITY_BOUND',
  'release_handoff_e15.cjs',
  'validateStablePrBody',
  'reusable-usage-dashboard-validate.yml',
  'UD_VALIDATION_RESULT',
  'authority: E9 exact-SHA full registry',
]) assert.ok(exact.includes(token),`E9 validator missing ${token}`);
assert.ok(!exact.includes('/usage-dashboard validate '),'normal durable validation must not depend on a slash command');
assert.ok(!exact.includes('git push'),'E9 exact validator must remain ref read-only');

const promoter = fs.readFileSync('.github/workflows/reusable-usage-dashboard-promote.yml','utf8');
assert.match(promoter,/contents: write/);
assert.match(promoter,/promote_release_blobs\.cjs/);

const runbook = fs.readFileSync('docs/USAGE_DASHBOARD_PR_LIFECYCLE_E9_DURABLE_TRANSACTION.md','utf8');
for (const token of [
  'one durable release request',
  'SOURCE_SHA_READY',
  'A/M/D/R/T',
  'VALIDATED_SHA == CURRENT_PR_HEAD_SHA == CURRENT_CANDIDATE_SHA',
  'exact-byte',
  'E9-F',
]) assert.ok(runbook.includes(token),`E9 runbook missing ${token}`);

console.log(`usage-dashboard E9 durable release transaction contract: OK · ${release.productVersion} · E9/E10/E11 request compatibility + exact source readiness + canonical changes + exact-SHA validation + idempotent closure + E15 stable handoff presentation`);
