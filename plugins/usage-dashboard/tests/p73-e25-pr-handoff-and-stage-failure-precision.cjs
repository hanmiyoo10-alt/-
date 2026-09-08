'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const pr = require('../tools/release_pr_handoff_e25.cjs');
const failure = require('../tools/stage_failure_projection_e25.cjs');
const rr = require('../tools/release_request_e9.cjs');

const REPOSITORY='hanmiyoo10-alt/-';
const RELEASE='3.0.0-alpha.5.999';
const BRANCH=`stage/usage-dashboard-${RELEASE}`;
const SHA='a'.repeat(40);
const REQUEST=9991;
const MARKER=`Usage-Dashboard-Release-Request: #${REQUEST}`;

function fixture(overrides={}) {
  return {
    number:9992,
    state:'open',
    merged:false,
    merged_at:null,
    base:{ref:'main'},
    head:{ref:BRANCH,sha:SHA,repo:{full_name:REPOSITORY}},
    body:[MARKER,'','Candidate authority: current PR head'].join('\n'),
    ...overrides,
  };
}

let result=pr.classifyPrHandoff({requestNumber:REQUEST,releaseVersion:RELEASE,candidateBranch:BRANCH,candidateSha:SHA,repository:REPOSITORY,prs:[fixture()]});
assert.equal(result.decision,pr.DECISIONS.REUSE_EXISTING);
assert.equal(result.prNumber,9992);

result=pr.classifyPrHandoff({requestNumber:REQUEST,releaseVersion:RELEASE,candidateBranch:BRANCH,candidateSha:SHA,repository:REPOSITORY,prs:[]});
assert.equal(result.decision,pr.DECISIONS.ASSISTANT_CREATE_REQUIRED);
result=pr.classifyPrHandoff({requestNumber:REQUEST,releaseVersion:RELEASE,candidateBranch:BRANCH,candidateSha:SHA,repository:REPOSITORY,prs:[],allowCreate:true});
assert.equal(result.decision,pr.DECISIONS.CREATE_ALLOWED);

result=pr.classifyPrHandoff({requestNumber:REQUEST,releaseVersion:RELEASE,candidateBranch:BRANCH,candidateSha:SHA,repository:REPOSITORY,prs:[fixture(),fixture({number:9993})]});
assert.equal(result.decision,pr.DECISIONS.BLOCK_AMBIGUOUS);
result=pr.classifyPrHandoff({requestNumber:REQUEST,releaseVersion:RELEASE,candidateBranch:BRANCH,candidateSha:SHA,repository:REPOSITORY,prs:[fixture({base:{ref:'develop'}})]});
assert.equal(result.decision,pr.DECISIONS.BLOCK_INVALID);
assert.equal(result.reason,'E25_PR_BASE_DENIED');
result=pr.classifyPrHandoff({requestNumber:REQUEST,releaseVersion:RELEASE,candidateBranch:BRANCH,candidateSha:SHA,repository:REPOSITORY,prs:[fixture({head:{ref:BRANCH,sha:SHA,repo:{full_name:'other/repo'}}})]});
assert.equal(result.reason,'E25_PR_REPOSITORY_DENIED');
result=pr.classifyPrHandoff({requestNumber:REQUEST,releaseVersion:RELEASE,candidateBranch:BRANCH,candidateSha:SHA,repository:REPOSITORY,prs:[fixture({body:'wrong marker'})]});
assert.equal(result.reason,'E25_PR_REQUEST_MARKER_MISSING');
result=pr.classifyPrHandoff({requestNumber:REQUEST,releaseVersion:RELEASE,candidateBranch:BRANCH,candidateSha:SHA,repository:REPOSITORY,prs:[fixture({head:{ref:BRANCH,sha:'b'.repeat(40),repo:{full_name:REPOSITORY}}})]});
assert.equal(result.decision,pr.DECISIONS.BLOCK_STALE);
result=pr.classifyPrHandoff({requestNumber:REQUEST,releaseVersion:RELEASE,candidateBranch:BRANCH,candidateSha:SHA,repository:REPOSITORY,prs:[fixture({state:'closed'})]});
assert.equal(result.reason,'E25_PR_CLOSED_UNMERGED');

const requestBody=[
  'Plugin: usage-dashboard',
  `release_version: ${RELEASE}`,
  'release_spec: .github/usage-dashboard/releases/999.json',
  'source_branch: release/usage-dashboard-e25-fixture',
  `source_sha: ${'c'.repeat(40)}`,
  'feature_issue: #1884',
  'release_generation: E13',
  'pr_number: PENDING',
  'reconcile_note: e25-fixture',
].join('\n');
const parsed=rr.parseIssue(`[usage-dashboard-release] ${RELEASE}`,requestBody);
const expected={releaseVersion:parsed.releaseVersion,releaseSpec:parsed.releaseSpec,sourceBranch:parsed.sourceBranch,sourceSha:parsed.sourceSha,attemptId:parsed.attemptId};
const bound=pr.bindPrNumber({title:`[usage-dashboard-release] ${RELEASE}`,body:requestBody,expected,prNumber:9992});
assert.match(bound,/^pr_number: #9992$/m);
assert.match(bound,/^reconcile_note: e25-fixture$/m);
assert.equal(rr.parseIssue(`[usage-dashboard-release] ${RELEASE}`,bound).prNumber,9992);
assert.throws(()=>pr.bindPrNumber({title:`[usage-dashboard-release] ${RELEASE}`,body:requestBody,expected:{...expected,sourceSha:'d'.repeat(40)},prNumber:9992}),/E25_REQUEST_CAS_MISMATCH:sourceSha/);
assert.throws(()=>pr.bindPrNumber({title:`[usage-dashboard-release] ${RELEASE}`,body:bound,expected,prNumber:9992}),/E25_REQUEST_PR_ALREADY_BOUND/);

const presentation=pr.stablePrBody({requestNumber:REQUEST,releaseVersion:RELEASE,summary:'E25 fixture'});
for(const locator of [
  MARKER,
  'Candidate authority: current PR head',
  'Source authority: durable release request `source_sha`',
  'Frozen-main authority: candidate trailer + E11 receipt',
  'Validation authority: E9 exact-SHA receipt',
  'Merge authority: fresh E11 receipt + expected-head merge',
]) assert.ok(presentation.includes(locator),locator);
for(const forbidden of ['Candidate SHA:','Source SHA:','Frozen-main SHA:']) assert.equal(presentation.includes(forbidden),false,forbidden);

const requiredTaxonomy={
  'source-intent':'E7_SOURCE_INTENT_APPLY_FAILED',
  'preflight':'E7_RELEASE_PREFLIGHT_REJECTED',
  'compile':'E7_MATERIALIZER_COMPILE_FAILED',
  'materializer':'E7_MATERIALIZER_EXEC_FAILED',
  'reconcile':'E7_RECONCILE_FAILED',
  'syntax':'E7_SYNTAX_CHECK_FAILED',
  'guidelines':'E7_GUIDELINE_SYNC_FAILED',
  'impact':'E18_RUNTIME_IMPACT_REJECTED',
  'smoke':'E7_BEHAVIOR_SMOKE_FAILED',
  'test-tree':'E7_TEST_TREE_MUTATED',
  'derived-verify':'E7_DERIVED_VERIFY_FAILED',
  'bundle':'E7_BUNDLE_BUILD_FAILED',
};
for(const [phase,reason] of Object.entries(requiredTaxonomy)) {
  const projected=failure.normalizeProjection({phase,reason:'attacker-controlled',diagnosticCode:''});
  assert.equal(projected.phase,phase);
  assert.equal(projected.reason,reason);
}
assert.deepEqual(failure.normalizeProjection({phase:'not-real',reason:'LEAK_ME',diagnosticCode:'TOKEN=secret'}),{phase:'unknown',reason:'E7_MATERIALIZE_OR_SMOKE_FAILED',diagnosticCode:''});
assert.equal(failure.normalizeProjection({phase:'impact',diagnosticCode:'E18_UNKNOWN_RUNTIME_IMPACT'}).diagnosticCode,'E18_UNKNOWN_RUNTIME_IMPACT');
assert.equal(failure.normalizeProjection({phase:'materializer',diagnosticCode:'token=ghp_secret org=123'}).diagnosticCode,'');
const receipt=failure.formatReceipt({phase:'materializer',reason:'arbitrary',diagnosticCode:'token=ghp_secret',transaction:'12345',runUrl:'https://github.com/hanmiyoo10-alt/-/actions/runs/12345',next:'repair source'});
assert.match(receipt,/phase: materializer/);
assert.match(receipt,/reason: E7_MATERIALIZER_EXEC_FAILED/);
assert.doesNotMatch(receipt,/ghp_secret|diagnostic:/);

const stage=fs.readFileSync('.github/workflows/usage-dashboard-stage-e7.yml','utf8');
for(const marker of [
  'failure_phase: ${{ steps.materialize.outputs.failure_phase }}',
  'failure_diagnostic_code: ${{ steps.materialize.outputs.failure_diagnostic_code }}',
  "FAILURE_PHASE='unknown'",
  "FAILURE_REASON='E7_MATERIALIZE_OR_SMOKE_FAILED'",
  "FAILURE_PHASE='source-intent'",
  "FAILURE_REASON='E7_SOURCE_INTENT_APPLY_FAILED'",
  "FAILURE_PHASE='preflight'",
  "FAILURE_REASON='E7_RELEASE_PREFLIGHT_REJECTED'",
  "FAILURE_PHASE='compile'",
  "FAILURE_REASON='E7_MATERIALIZER_COMPILE_FAILED'",
  "FAILURE_PHASE='materializer'",
  "FAILURE_REASON='E7_MATERIALIZER_EXEC_FAILED'",
  "FAILURE_PHASE='reconcile'",
  "FAILURE_REASON='E7_RECONCILE_FAILED'",
  "FAILURE_PHASE='syntax'",
  "FAILURE_REASON='E7_SYNTAX_CHECK_FAILED'",
  "FAILURE_PHASE='guidelines'",
  "FAILURE_REASON='E7_GUIDELINE_SYNC_FAILED'",
  "FAILURE_PHASE='impact'",
  "FAILURE_REASON='E18_RUNTIME_IMPACT_REJECTED'",
  "FAILURE_PHASE='smoke'",
  "FAILURE_REASON='E7_BEHAVIOR_SMOKE_FAILED'",
  "FAILURE_PHASE='test-tree'",
  "FAILURE_REASON='E7_TEST_TREE_MUTATED'",
  "FAILURE_PHASE='derived-verify'",
  "FAILURE_REASON='E7_DERIVED_VERIFY_FAILED'",
  "FAILURE_PHASE='bundle'",
  "FAILURE_REASON='E7_BUNDLE_BUILD_FAILED'",
  'stage_failure_projection_e25.cjs --format',
]) assert.ok(stage.includes(marker),marker);
assert.ok(stage.indexOf('write_candidate:') > stage.indexOf('materialize_stage:'));
assert.ok(stage.includes("if: ${{ needs.resolve_stage.result == 'success' && needs.materialize_stage.result == 'success' }}"));
assert.ok(stage.includes('contents: write'));
assert.equal(stage.includes('MATERIALIZE_STDERR'),false);

const reducer=fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml','utf8');
for(const marker of [
  'release_pr_handoff_e25.cjs --classify-file',
  'release_pr_handoff_e25.cjs --bind-file',
  'UD_E25_PR_BOUND:',
  'UD_E9_PR_REQUIRED:',
  'E25_TRUSTED_CREATE_NOT_PROVEN',
  'pull-requests: read',
]) assert.ok(reducer.includes(marker),marker);
assert.equal(reducer.includes('pull-requests: write'),false,'E25 must not broaden reducer PR write authority without live create proof');
assert.equal(reducer.includes('/pulls" --data'),false,'E25 must not activate Actions initial PR creation without live capability proof');
assert.equal(reducer.includes('gh pr create'),false);
assert.ok(reducer.includes('issues: write'),'durable pr_number CAS remains issue-body metadata authority');
assert.ok(reducer.includes('E9_PR_HEAD_SHA_MISMATCH'),'ordinary post-bind identity verification remains in place');

const helperSource=fs.readFileSync('plugins/usage-dashboard/tools/release_pr_handoff_e25.cjs','utf8');
for(const forbidden of ["require('node:http')","require('node:https')",'GITHUB_TOKEN','api.github.com','merge_pull_request']) assert.equal(helperSource.includes(forbidden),false,forbidden);
const failureSource=fs.readFileSync('plugins/usage-dashboard/tools/stage_failure_projection_e25.cjs','utf8');
for(const forbidden of ['process.env','GITHUB_TOKEN','Authorization:','raw stderr','response.body']) assert.equal(failureSource.includes(forbidden),false,forbidden);

console.log('usage-dashboard P73 E25 PR handoff + stage failure precision: OK');
