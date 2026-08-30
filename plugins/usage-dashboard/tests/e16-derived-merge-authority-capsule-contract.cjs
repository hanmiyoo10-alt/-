'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const rr = require('../tools/release_request_e9.cjs');
const e15 = require('../tools/release_handoff_e15.cjs');
const e16 = require('../tools/release_merge_capsule_e16.cjs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
const repository = 'hanmiyoo10-alt/-';
const requestNumber = 9906;
const prNumber = 9907;
const sourceSha = '1'.repeat(40);
const candidateSha = '2'.repeat(40);
const mainSha = '3'.repeat(40);
const baseSha = '4'.repeat(40);

const request = {
  releaseVersion: release.productVersion,
  releaseSpec: release.specPath,
  sourceBranch: 'release/usage-dashboard-e16-fixture',
  sourceSha,
  featureIssue: 906,
  releaseGeneration: 'E13',
  prNumber,
};
const pr = {
  number: prNumber,
  base: {ref:'main'},
  head: {
    repo: {full_name:repository},
    ref: `stage/usage-dashboard-${release.productVersion}`,
    sha: candidateSha,
  },
  body: e15.renderStablePrBody({
    version: release.productVersion,
    summary: 'E16 derived merge-authority capsule fixture',
    productVersion: release.productVersion,
    engineVersion: release.engineVersion,
    managerVersion: release.managerVersion,
    snapshotContract: release.snapshotContract,
    recentRequestContract: release.recentRequestContract,
    requestNumber,
  }),
};
const validation = {validatedSha:candidateSha,status:'GREEN'};
const materialization = {version:release.productVersion,sourceSha,frozenMainSha:baseSha};
const mergeGuard = {
  candidateSha,
  currentMainSha:mainSha,
  verdict:'MERGE_READY_NO_DRIFT',
  candidateBaseSha:baseSha,
  candidateBaseSource:'explicit-frozen-main-trailer',
  candidateDagMode:'e14-two-parent-converged',
};

function compile(overrides = {}) {
  return e16.compileMergeCapsule({
    repository,
    requestNumber,
    freshMainSha:mainSha,
    request,
    pr,
    validation,
    mergeGuard,
    materialization,
    ...overrides,
  });
}

const capsule = compile();
assert.equal(capsule.schema,1);
assert.equal(capsule.kind,'usage-dashboard-e16-merge-authority-capsule');
assert.equal(capsule.releaseVersion,release.productVersion);
assert.equal(capsule.releaseGeneration,'E13');
assert.equal(capsule.expectedHeadSha,candidateSha);
assert.equal(capsule.freshMainSha,mainSha);
assert.equal(capsule.validationStatus,'GREEN');
assert.equal(capsule.mergeGuardVerdict,'MERGE_READY_NO_DRIFT');
assert.equal(capsule.candidateMaterializationSourceSha,sourceSha);
assert.equal(capsule.authority,'derived-read-only');
assert.equal(capsule.next,'assistant-fresh-reread-and-expected-head-merge');
assert.deepEqual(compile(),capsule,'same exact inputs must compile to the same E16 capsule');

const marker = e16.markerForCapsule(capsule);
assert.equal(marker,`UD_E16_MERGE_CAPSULE:${candidateSha}:${mainSha}`);
const receipt = e16.formatMergeCapsule(capsule);
for (const token of [
  marker,
  `release: ${release.productVersion}`,
  `request: #${requestNumber}`,
  `source_sha: ${sourceSha}`,
  'release_generation: E13',
  `pr: #${prNumber}`,
  `expected_head_sha: ${candidateSha}`,
  `fresh_main_sha: ${mainSha}`,
  'validation: GREEN',
  'merge_guard: MERGE_READY_NO_DRIFT',
  'authority: derived-read-only',
  'next: assistant-fresh-reread-and-expected-head-merge',
]) assert.ok(receipt.includes(token),`E16 receipt missing ${token}`);

const unrelated = compile({mergeGuard:{...mergeGuard,verdict:'MERGE_READY_WITH_UNRELATED_MAIN_DRIFT'}});
assert.equal(unrelated.mergeGuardVerdict,'MERGE_READY_WITH_UNRELATED_MAIN_DRIFT');

assert.throws(() => compile({request:{...request,releaseGeneration:'E12'}}),/E16_REQUEST_GENERATION_DENIED:E12/);
assert.throws(() => compile({request:{...request,prNumber:prNumber + 1}}),/E16_PR_NUMBER_MISMATCH/);
assert.throws(() => compile({pr:{...pr,base:{ref:'release-usage-dashboard'}}}),/E16_PR_BASE_DENIED/);
assert.throws(() => compile({pr:{...pr,head:{...pr.head,repo:{full_name:'someone/else'}}}}),/E16_PR_REPOSITORY_DENIED/);
assert.throws(() => compile({pr:{...pr,head:{...pr.head,ref:'stage/usage-dashboard-wrong'}}}),/E16_PR_HEAD_BRANCH_MISMATCH/);
assert.throws(() => compile({pr:{...pr,body:pr.body.replace('Source authority: durable release request `source_sha`','Source authority: durable release request source_sha')}}),/E16_E15_HANDOFF_INVALID:E15_PR_LOCATOR_INVALID:source-authority/);
assert.throws(() => compile({validation:{validatedSha:candidateSha,status:'RED'}}),/E16_VALIDATION_NOT_GREEN:RED/);
assert.throws(() => compile({validation:{validatedSha:'5'.repeat(40),status:'GREEN'}}),/E16_VALIDATED_SHA_MISMATCH/);
assert.throws(() => compile({materialization:{...materialization,version:'3.0.0-alpha.5.1'}}),/E16_MATERIALIZATION_VERSION_MISMATCH/);
assert.throws(() => compile({materialization:{...materialization,sourceSha:'6'.repeat(40)}}),/E16_MATERIALIZATION_SOURCE_SHA_MISMATCH/);
assert.throws(() => compile({mergeGuard:{...mergeGuard,candidateSha:'7'.repeat(40)}}),/E16_MERGE_GUARD_CANDIDATE_SHA_MISMATCH/);
assert.throws(() => compile({mergeGuard:{...mergeGuard,currentMainSha:'8'.repeat(40)}}),/E16_MERGE_GUARD_MAIN_SHA_MISMATCH/);
assert.throws(() => compile({mergeGuard:{...mergeGuard,verdict:'MERGE_BLOCKED_PROTECTED_MAIN_DRIFT'}}),/E16_MERGE_GUARD_NOT_READY:MERGE_BLOCKED_PROTECTED_MAIN_DRIFT/);

const generationBody = [
  'Plugin: usage-dashboard',
  `release_version: ${release.productVersion}`,
  `release_spec: ${release.specPath}`,
  'source_branch: release/usage-dashboard-e16-generation-fixture',
  `source_sha: ${sourceSha}`,
  'feature_issue: #906',
  'release_generation: E16',
  `pr_number: #${prNumber}`,
].join('\n');
assert.throws(
  () => rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`,generationBody),
  /E9_REQUEST_GENERATION_DENIED:E16/,
  'E16 must remain outside the durable release-generation axis',
);

const helperSource = fs.readFileSync('plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs','utf8');
for (const forbidden of [
  "require('node:fs')",
  'child_process',
  'fetch(',
  'http://',
  'https://',
  'GITHUB_TOKEN',
  'curl ',
  'git push',
  'merge_pull_request',
]) assert.ok(!helperSource.includes(forbidden),`E16 pure helper must not own I/O or mutation: ${forbidden}`);

const reconciler = fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml','utf8');
for (const token of [
  'release_merge_capsule_e16.cjs',
  'materializationIdentity',
  'markerForCapsule',
  'formatMergeCapsule',
  'E16_CAPSULE_JSON',
  'E16_MERGE_CAPSULE_READY',
]) assert.ok(reconciler.includes(token),`E16 reconciler integration missing ${token}`);
assert.equal((reconciler.match(/post_comment\(\) \{/g)||[]).length,1,'E16 must reuse the existing reconciler issue-comment writer');
assert.ok(!reconciler.includes("E16_MARKER=\"UD_E16_MERGE_CAPSULE:"),'E16 reconciler must not duplicate the canonical marker format outside the pure helper');
assert.ok(!reconciler.includes('E16_GENERATION_ISSUE'),'E16 must not create a new durable generation issue binding');
assert.ok(!reconciler.includes('pulls/$PR_NUMBER/merge'),'E16 reconciler must not auto-merge the PR');

const design = fs.readFileSync('docs/USAGE_DASHBOARD_E16_DERIVED_MERGE_AUTHORITY_CAPSULE_DESIGN.md','utf8');
for (const token of [
  'E16 Derived Merge-Authority Capsule Design',
  'release_generation: E16',
  'expected-head merge',
  'byte-neutral',
  'materializationIdentity()',
]) assert.ok(design.includes(token),`E16 design missing ${token}`);

console.log(`usage-dashboard E16 derived merge-authority capsule contract: OK · ${release.productVersion} · exact request/PR/E9/E11/materialization binding + read-only merge handoff`);
