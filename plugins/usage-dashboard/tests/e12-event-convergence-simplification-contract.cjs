'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const rr = require('../tools/release_request_e9.cjs');
const receipt = require('../tools/merge_guard_receipt_e12.cjs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
const candidateSha = '1'.repeat(40);
const parentSha = '2'.repeat(40);
const baseSha = '3'.repeat(40);
const currentMainSha = '4'.repeat(40);

const body = [
  'Plugin: usage-dashboard',
  `release_version: ${release.productVersion}`,
  `release_spec: ${release.specPath}`,
  'source_branch: release/usage-dashboard-e12-fixture',
  `source_sha: ${'5'.repeat(40)}`,
  'feature_issue: #383',
  'release_generation: E12',
  'pr_number: PENDING',
].join('\n');
const request = rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`, body);
assert.equal(request.releaseGeneration, 'E12');
const e13Transition = rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`, body.replace('release_generation: E12','release_generation: E13'));
assert.equal(e13Transition.releaseGeneration, 'E13');
assert.throws(
  () => rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`, body.replace('release_generation: E12','release_generation: E14')),
  /E9_REQUEST_GENERATION_DENIED/
);

const validationComments = [
  {body:`UD_VALIDATION_RESULT\nvalidated_sha: ${'a'.repeat(40)}\nstatus: GREEN`},
  {body:`UD_VALIDATION_RESULT\nvalidated_sha: ${candidateSha}\nstatus: RED`},
  {body:`UD_VALIDATION_RESULT\nvalidated_sha: ${candidateSha}\nstatus: GREEN`},
];
assert.deepEqual(rr.latestValidation(validationComments,candidateSha),{validatedSha:candidateSha,status:'GREEN'});
assert.equal(rr.latestValidation(validationComments,'b'.repeat(40)),null,'validation evidence must remain exact-SHA keyed');

const marker = `UD_E11_MERGE_GUARD:${candidateSha}:${currentMainSha}`;
const explicit = receipt.formatMergeGuardReceipt(marker,{
  candidateSha,
  candidateParentSha:parentSha,
  candidateBaseSha:baseSha,
  candidateBaseSource:'explicit-frozen-main-trailer',
  currentMainSha,
  verdict:'MERGE_READY_WITH_UNRELATED_MAIN_DRIFT',
  changedPaths:['docs/SIMCORE_UNRELATED.md'],
  protectedPaths:[],
});
for (const line of [
  `candidate_parent_sha: ${parentSha}`,
  `candidate_base_sha: ${baseSha}`,
  'candidate_base_source: explicit-frozen-main-trailer',
  `current_main_sha: ${currentMainSha}`,
  'verdict: MERGE_READY_WITH_UNRELATED_MAIN_DRIFT',
]) assert.ok(explicit.includes(line),`E12 receipt missing ${line}`);

const fallback = receipt.formatMergeGuardReceipt(marker,{
  candidateSha,
  candidateParentSha:parentSha,
  candidateBaseSha:baseSha,
  candidateBaseSource:'ancestry-compatibility-fallback',
  currentMainSha,
  verdict:'MERGE_READY_NO_DRIFT',
  changedPaths:[],
  protectedPaths:[],
});
assert.ok(fallback.includes('candidate_base_source: ancestry-compatibility-fallback'));
assert.throws(() => receipt.formatMergeGuardReceipt(marker,{
  candidateSha,
  candidateParentSha:parentSha,
  candidateBaseSha:'not-a-sha',
  candidateBaseSource:'explicit-frozen-main-trailer',
  currentMainSha,
  verdict:'MERGE_READY_NO_DRIFT',
}),/E12_MERGE_GUARD_SHA_INVALID/);

const reconciler = fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml','utf8');
const validator = fs.readFileSync('.github/workflows/usage-dashboard-e9-validate.yml','utf8');
assert.ok(reconciler.includes('Usage Dashboard Exact-Byte Promotion'), 'E12 must retain promotion-complete wake');
assert.ok(!reconciler.includes('Usage Dashboard E9 Exact-SHA Validation'), 'E13-compatible E12 semantics must not depend on the disproven validation workflow_run edge');
assert.ok(reconciler.includes("E12_GENERATION_ISSUE: '383'"), 'E12 generation issue wiring missing');
assert.ok(reconciler.includes("GENERATION_PROOF_MARKER='E12_REAL_RELEASE_PROOF'"), 'E12 one-shot proof wiring missing');
assert.ok(reconciler.includes('merge_guard_receipt_e12.cjs --format'), 'E12 reducer must delegate receipt formatting to executable helper');
assert.ok(reconciler.includes('latestValidation(comments,process.argv[3])'), 'E12 reducer must re-read durable exact validation evidence');
assert.ok(reconciler.includes("schedule:\n    - cron: '*/5 * * * *'"), 'E12 must retain anti-loss schedule');
assert.ok(!reconciler.includes('github.event.workflow_run.head_sha'), 'E12 wake payload must not become candidate authority');
assert.ok(!reconciler.includes('github.event.workflow_run.head_branch'), 'E12 wake payload must not become branch authority');
assert.ok(!reconciler.includes('git push'), 'E12 reducer must remain candidate/production ref read-only');

assert.ok(validator.includes('actions: write'), 'E12 validator publish job must remain allowed to issue the platform-safe reducer wake');
assert.ok(validator.includes('reducer_wake_e13.sh validation'), 'E12 validation authority must continue to converge via the canonical platform-safe wake');
const resultPublish = validator.indexOf('$GITHUB_API_URL/repos/$GITHUB_REPOSITORY/issues/$ISSUE/comments');
const reducerWake = validator.indexOf('reducer_wake_e13.sh validation');
assert.ok(resultPublish >= 0 && reducerWake > resultPublish, 'E12 must publish authoritative validation evidence before issuing the authority-free reducer wake');
assert.equal(validator.includes('reconcile_nonce'), false, 'E12 platform-safe wake must not reintroduce reconcile nonce mutation');

const e11 = fs.readFileSync('plugins/usage-dashboard/tests/e11-diagnosable-merge-readiness-contract.cjs','utf8');
assert.ok(e11.includes('temporary-Git') || e11.includes('mkdtempSync'), 'E12 keeps executable E11 identity fixtures');
assert.ok(!e11.includes("Usage-Dashboard-Frozen-Main: $TRUSTED_BASE_SHA"), 'E12 must not restore rendered-shell string coupling');

console.log(`usage-dashboard E12 event convergence contract: OK · ${release.productVersion} · platform-safe immediate validation wake + self-describing guard receipt + executable release-control semantics`);
