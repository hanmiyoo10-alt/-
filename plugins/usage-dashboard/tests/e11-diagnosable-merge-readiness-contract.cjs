'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const rr = require('../tools/release_request_e9.cjs');
const readiness = require('../tools/source_readiness_e9.cjs');
const mergeGuard = require('../tools/merge_guard_e11.cjs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();

const body = [
  'Plugin: usage-dashboard',
  `release_version: ${release.productVersion}`,
  `release_spec: ${release.specPath}`,
  'source_branch: release/usage-dashboard-e11-fixture',
  'source_sha: 1234567890abcdef1234567890abcdef12345678',
  'feature_issue: #372',
  'release_generation: E11',
  'pr_number: PENDING',
].join('\n');
const request = rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`,body);
assert.equal(request.releaseGeneration,'E11');

const structured = new readiness.ReadinessError('SOURCE_SHA_NOT_READY',{
  reason_code:'deleted-owner-reference',
  detail:'deleted-owner:plugins/usage-dashboard/src/64-runtime-weight-audit.part.js->plugins/usage-dashboard/tests/p37-runtime-weight-lifecycle-audit.cjs',
  offending_path:'plugins/usage-dashboard/tests/p37-runtime-weight-lifecycle-audit.cjs',
  owner_path:'plugins/usage-dashboard/src/64-runtime-weight-audit.part.js',
  repair_hint:'migrate the test to the surviving direct owner before deleting the old source module',
});
const receipt = readiness.receiptForError(structured);
assert.equal(receipt.reason_code,'deleted-owner-reference');
assert.equal(receipt.offending_path,'plugins/usage-dashboard/tests/p37-runtime-weight-lifecycle-audit.cjs');
assert.equal(receipt.owner_path,'plugins/usage-dashboard/src/64-runtime-weight-audit.part.js');
assert.match(receipt.repair_hint,/surviving direct owner/);
const unexpected = readiness.receiptForError(new Error('fixture boom'));
assert.equal(unexpected.reason_code,'unexpected-readiness-error');
assert.match(unexpected.detail,/fixture boom/);
let syntaxError;
try { readiness.assertPythonSyntax('value = “broken”\n','fixture.py'); }
catch (error) { syntaxError = error; }
assert.ok(syntaxError instanceof readiness.ReadinessError);
assert.equal(readiness.receiptForError(syntaxError).reason_code,'materializer-syntax');

assert.equal(mergeGuard.classifyPaths([]).verdict,'MERGE_READY_NO_DRIFT');
assert.deepEqual(
  mergeGuard.classifyPaths(['docs/SIMCORE_UNRELATED.md']),
  {verdict:'MERGE_READY_WITH_UNRELATED_MAIN_DRIFT',changedPaths:['docs/SIMCORE_UNRELATED.md'],protectedPaths:[]}
);
const protectedResult = mergeGuard.classifyPaths([
  'docs/SIMCORE_UNRELATED.md',
  'plugins/usage-dashboard/src/62-diagnostics-workspace.part.js',
  '.github/workflows/usage-dashboard-promote.yml',
]);
assert.equal(protectedResult.verdict,'MERGE_BLOCKED_PROTECTED_MAIN_DRIFT');
assert.deepEqual(protectedResult.protectedPaths,[
  '.github/workflows/usage-dashboard-promote.yml',
  'plugins/usage-dashboard/src/62-diagnostics-workspace.part.js',
]);
assert.equal(mergeGuard.isProtected('.github/plugin-control-plane/canonical-main/ops-controller.cjs'),true);
assert.equal(mergeGuard.isProtected('docs/USAGE_DASHBOARD_GUIDELINES.md'),true);
assert.equal(mergeGuard.isProtected('docs/SIMCORE_GEMINI_CACHE_IDEA.md'),false);

function fixtureGit(cwd,args,input) {
  return execFileSync('git',args,{cwd,encoding:'utf8',input}).trim();
}

const restageDir = fs.mkdtempSync(path.join(os.tmpdir(),'ud-e11-restage-'));
try {
  fixtureGit(restageDir,['init','-q']);
  fixtureGit(restageDir,['config','user.email','usage-dashboard-e11@example.invalid']);
  fixtureGit(restageDir,['config','user.name','usage-dashboard-e11-fixture']);
  fs.writeFileSync(path.join(restageDir,'fixture.txt'),'base\n');
  fixtureGit(restageDir,['add','fixture.txt']);
  fixtureGit(restageDir,['commit','-q','-m','fixture base']);
  const frozenMainBase = fixtureGit(restageDir,['rev-parse','HEAD']);

  fs.writeFileSync(path.join(restageDir,'fixture.txt'),'candidate-one\n');
  fixtureGit(restageDir,['add','fixture.txt']);
  fixtureGit(restageDir,['commit','-q','-m',`materialize: Usage Dashboard ${release.productVersion} from source ${'1'.repeat(40)}`]);
  const firstCandidate = fixtureGit(restageDir,['rev-parse','HEAD']);

  fs.writeFileSync(path.join(restageDir,'fixture.txt'),'candidate-two\n');
  fixtureGit(restageDir,['add','fixture.txt']);
  fixtureGit(restageDir,['commit','-q','-m',`materialize: Usage Dashboard ${release.productVersion} from source ${'2'.repeat(40)}`]);
  const repeatedCandidate = fixtureGit(restageDir,['rev-parse','HEAD']);

  assert.equal(mergeGuard.candidateParent(repeatedCandidate,{cwd:restageDir}),firstCandidate,'E11 direct parent records the prior deterministic candidate after restage');
  assert.deepEqual(mergeGuard.candidateParents(repeatedCandidate,{cwd:restageDir}),[firstCandidate]);
  assert.equal(mergeGuard.materializationIdentity(repeatedCandidate,{cwd:restageDir}).version,release.productVersion);
  assert.equal(mergeGuard.materializationIdentity(repeatedCandidate,{cwd:restageDir}).frozenMainSha,null,'legacy deterministic candidates have no explicit frozen-main trailer');
  assert.equal(mergeGuard.candidateBase(repeatedCandidate,{cwd:restageDir}),frozenMainBase,'E11 legacy repeated materialization must resolve the original frozen main base');
  const repeatedResult = mergeGuard.classify(repeatedCandidate,frozenMainBase,{cwd:restageDir});
  assert.equal(repeatedResult.candidateParentSha,firstCandidate);
  assert.equal(repeatedResult.candidateParentCount,1);
  assert.equal(repeatedResult.candidateDagMode,'legacy-ancestry-fallback');
  assert.equal(repeatedResult.candidateBaseSha,frozenMainBase);
  assert.equal(repeatedResult.candidateBaseSource,'ancestry-compatibility-fallback');
  assert.equal(repeatedResult.verdict,'MERGE_READY_NO_DRIFT','E11 legacy repeated materialization must not classify candidate payload as main drift');

  fixtureGit(restageDir,['checkout','-q',frozenMainBase]);
  const protectedFixture = path.join(restageDir,'plugins/usage-dashboard/runtime/frozen-main-fixture.txt');
  fs.mkdirSync(path.dirname(protectedFixture),{recursive:true});
  fs.writeFileSync(protectedFixture,'protected main refresh\n');
  fixtureGit(restageDir,['add','plugins/usage-dashboard/runtime/frozen-main-fixture.txt']);
  fixtureGit(restageDir,['commit','-q','-m','fixture protected main refresh']);
  const refreshedMain = fixtureGit(restageDir,['rev-parse','HEAD']);

  const repeatedTree = fixtureGit(restageDir,['rev-parse',`${repeatedCandidate}^{tree}`]);
  const refreshedMessage = `materialize: Usage Dashboard ${release.productVersion} from source ${'3'.repeat(40)}\n\nUsage-Dashboard-Frozen-Main: ${refreshedMain}\n`;
  const refreshedCandidate = fixtureGit(restageDir,['commit-tree',repeatedTree,'-p',repeatedCandidate,'-p',refreshedMain],refreshedMessage);
  const refreshedIdentity = mergeGuard.materializationIdentity(refreshedCandidate,{cwd:restageDir});
  assert.equal(refreshedIdentity.version,release.productVersion);
  assert.equal(refreshedIdentity.frozenMainSha,refreshedMain,'new deterministic candidates authenticate the exact trusted main used for reconstruction');
  assert.equal(mergeGuard.candidateParent(refreshedCandidate,{cwd:restageDir}),repeatedCandidate,'E14 first parent still fast-forwards the deterministic candidate chain');
  assert.deepEqual(mergeGuard.candidateParents(refreshedCandidate,{cwd:restageDir}),[repeatedCandidate,refreshedMain]);
  assert.equal(mergeGuard.candidateBase(refreshedCandidate,{cwd:restageDir}),refreshedMain,'explicit frozen-main trailer must remain E11 base authority');
  const dag = mergeGuard.candidateDagAgreement(refreshedCandidate,{cwd:restageDir});
  assert.equal(dag.mode,'e14-two-parent-converged');
  assert.equal(dag.frozenMainSha,refreshedMain);
  const refreshedResult = mergeGuard.classify(refreshedCandidate,refreshedMain,{cwd:restageDir});
  assert.equal(refreshedResult.candidateBaseSha,refreshedMain);
  assert.equal(refreshedResult.candidateBaseSource,'explicit-frozen-main-trailer');
  assert.equal(refreshedResult.candidateParentCount,2);
  assert.equal(refreshedResult.candidateDagMode,'e14-two-parent-converged');
  assert.equal(refreshedResult.verdict,'MERGE_READY_NO_DRIFT','already-absorbed protected drift must not block a refreshed candidate forever');

  const staleOneParent = fixtureGit(restageDir,['commit-tree',repeatedTree,'-p',repeatedCandidate],refreshedMessage);
  assert.throws(() => mergeGuard.candidateDagAgreement(staleOneParent,{cwd:restageDir}),/E14_FROZEN_MAIN_PARENT_MISSING/,'E14 must fail closed when trailer main is not represented in the DAG');

  const malformedMessage = `materialize: Usage Dashboard ${release.productVersion} from source ${'4'.repeat(40)}\n\nUsage-Dashboard-Frozen-Main: not-a-sha\n`;
  const malformedCandidate = fixtureGit(restageDir,['commit-tree',repeatedTree,'-p',repeatedCandidate],malformedMessage);
  assert.throws(() => mergeGuard.candidateBase(malformedCandidate,{cwd:restageDir}),/E11_FROZEN_MAIN_TRAILER_INVALID/,'malformed explicit frozen-main identity must fail closed');
} finally {
  fs.rmSync(restageDir,{recursive:true,force:true});
}

const mergeGuardSource = fs.readFileSync('plugins/usage-dashboard/tools/merge_guard_e11.cjs','utf8');
for (const token of [
  'MERGE_READY_NO_DRIFT',
  'MERGE_READY_WITH_UNRELATED_MAIN_DRIFT',
  'MERGE_BLOCKED_PROTECTED_MAIN_DRIFT',
  'candidateBase',
  'candidateDagAgreement',
  'e14-two-parent-converged',
  'MATERIALIZATION_MESSAGE',
  'FROZEN_MAIN_TRAILER',
  'explicit-frozen-main-trailer',
]) assert.ok(mergeGuardSource.includes(token),`E11/E14 merge guard missing ${token}`);

const stageWorkflow = fs.readFileSync('.github/workflows/usage-dashboard-stage-e7.yml','utf8');
assert.ok(stageWorkflow.includes('Usage-Dashboard-Frozen-Main: %s'),'E11 trusted stage must own the frozen-main trailer format');
assert.ok(stageWorkflow.includes('"$TRUSTED_BASE_SHA"'),'E11 trusted stage must bind the trailer to exact TRUSTED_BASE_SHA');
assert.ok(stageWorkflow.includes('E14_ANCESTRY_PARENT_ADDED'),'E14 trusted stage must add missing frozen-main ancestry only when needed');
assert.ok(stageWorkflow.includes('E7_FROZEN_MAIN_TRAILER_MISMATCH'),'E11 trusted stage must reverify the imported frozen-main identity');

const reconciler = fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml','utf8');
for (const token of [
  "E11_GENERATION_ISSUE: '372'",
  'UD_SOURCE_READINESS_ERROR:',
  'reason_code:',
  'plugins/usage-dashboard/tools/merge_guard_e11.cjs --classify',
  'UD_E11_MERGE_GUARD:',
  'MERGE_BLOCKED_PROTECTED_MAIN_DRIFT',
  "GENERATION_PROOF_MARKER='E11_REAL_RELEASE_PROOF'",
]) assert.ok(reconciler.includes(token),`E11 reconciler missing ${token}`);
assert.ok(!reconciler.includes('git push'),'E11 reducer must remain candidate/production ref read-only');

const ordinary = fs.readFileSync('.github/workflows/usage-dashboard-validate.yml','utf8');
for (const token of [
  'name: Usage Dashboard Candidate Validation',
  'Non-authoritative deterministic release PR lane',
  'NON-AUTHORITATIVE PR LANE — exact-SHA validator owns release decision',
  'GITHUB_STEP_SUMMARY',
  'durable-request exact-SHA full registry',
]) assert.ok(ordinary.includes(token),`E11 ordinary PR lane missing ${token}`);

const runbook = fs.readFileSync('docs/USAGE_DASHBOARD_PR_LIFECYCLE_E11_DIAGNOSABLE_MERGE_READINESS.md','utf8');
for (const token of [
  'E11-A',
  'structured source-readiness failure receipts',
  'E11-B',
  'read-only post-validation main-drift merge guard',
  'Usage-Dashboard-Frozen-Main',
  'compatibility fallback',
  'E11-C',
  'NON-AUTHORITATIVE PR LANE',
  'E11-D',
  'E11-E',
  'Issue `#372`',
]) assert.ok(runbook.includes(token),`E11 runbook missing ${token}`);

console.log(`usage-dashboard E11 diagnosable merge-readiness contract: OK · ${release.productVersion} · structured readiness + explicit frozen-main identity with E14 DAG agreement + legacy ancestry fallback + read-only merge guard + explicit PR authority`);
