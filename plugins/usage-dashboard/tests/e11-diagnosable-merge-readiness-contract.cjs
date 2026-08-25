'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const rr = require('../tools/release_request_e9.cjs');
const readiness = require('../tools/source_readiness_e9.cjs');
const mergeGuard = require('../tools/merge_guard_e11.cjs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();

const body = [
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
assert.throws(() => rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`,body.replace('release_generation: E11','release_generation: E12')),/E9_REQUEST_GENERATION_DENIED/);

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
const mergeGuardSource = fs.readFileSync('plugins/usage-dashboard/tools/merge_guard_e11.cjs','utf8');
for (const token of [
  'MERGE_READY_NO_DRIFT',
  'MERGE_READY_WITH_UNRELATED_MAIN_DRIFT',
  'MERGE_BLOCKED_PROTECTED_MAIN_DRIFT',
]) assert.ok(mergeGuardSource.includes(token),`E11 merge guard missing ${token}`);

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
  'E11-C',
  'NON-AUTHORITATIVE PR LANE',
  'E11-D',
  'E11-E',
  'Issue `#372`',
]) assert.ok(runbook.includes(token),`E11 runbook missing ${token}`);

console.log(`usage-dashboard E11 diagnosable merge-readiness contract: OK · ${release.productVersion} · structured readiness + read-only merge guard + explicit PR authority`);
