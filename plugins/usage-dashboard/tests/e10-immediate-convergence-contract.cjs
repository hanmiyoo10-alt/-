'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const rr = require('../tools/release_request_e9.cjs');
const readiness = require('../tools/source_readiness_e9.cjs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();

const e10Body = [
  'Plugin: usage-dashboard',
  `release_version: ${release.productVersion}`,
  `release_spec: ${release.specPath}`,
  'source_branch: release/usage-dashboard-e10-fixture',
  'source_sha: 1234567890abcdef1234567890abcdef12345678',
  'feature_issue: #365',
  'release_generation: E10',
  'pr_number: PENDING',
].join('\n');
const request = rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`,e10Body);
assert.equal(request.releaseGeneration,'E10');
assert.match(request.attemptId,/^[0-9a-f]{24}$/);
const e11Transition = rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`,e10Body.replace('release_generation: E10','release_generation: E11'));
assert.equal(e11Transition.releaseGeneration,'E11');
const e12Transition = rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`,e10Body.replace('release_generation: E10','release_generation: E12'));
assert.equal(e12Transition.releaseGeneration,'E12');
const e13Transition = rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`,e10Body.replace('release_generation: E10','release_generation: E13'));
assert.equal(e13Transition.releaseGeneration,'E13');
assert.throws(() => rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`,e10Body.replace('release_generation: E10','release_generation: E14')),/E9_REQUEST_GENERATION_DENIED/);

readiness.assertPythonSyntax('def materialize():\n    return True\n','good.py');
assert.throws(
  () => readiness.assertPythonSyntax('def materialize():\n    return “broken”\n','bad.py'),
  /SOURCE_SHA_NOT_READY:materializer-syntax:bad\.py/
);

const reconciler = fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml','utf8');
for (const token of [
  'name: Usage Dashboard Durable Release Reconciler',
  'workflow_run:',
  'Usage Dashboard Exact-Byte Promotion',
  "github.event.workflow_run.conclusion == 'success'",
  "E10_GENERATION_ISSUE: '365'",
  "GENERATION_PROOF_MARKER='E10_REAL_RELEASE_PROOF'",
  "GENERATION_STATE\" == 'open'",
  'E9_GENERATION_PROOF_NOOP:',
  "cron: '*/5 * * * *'",
]) assert.ok(reconciler.includes(token),`E10 reconciler missing ${token}`);
assert.ok(!reconciler.includes('git push'),'E10 must not add a candidate/production ref writer');

const promoter = fs.readFileSync('.github/workflows/usage-dashboard-promote.yml','utf8');
assert.ok(promoter.includes('name: Usage Dashboard Exact-Byte Promotion'));
assert.ok(promoter.includes('promote_release_blobs.cjs') || fs.readFileSync('.github/workflows/reusable-usage-dashboard-promote.yml','utf8').includes('promote_release_blobs.cjs'));

const sourceReadiness = fs.readFileSync('plugins/usage-dashboard/tools/source_readiness_e9.cjs','utf8');
for (const token of [
  'assertMaterializerSyntax',
  'JSON.parse(specText)',
  'python3',
  'ast.parse',
  'materializer-syntax',
]) assert.ok(sourceReadiness.includes(token),`E10 readiness missing ${token}`);
assert.ok(!sourceReadiness.includes('exec('),'syntax readiness must not execute materializer code');

const e9Runbook = fs.readFileSync('docs/USAGE_DASHBOARD_PR_LIFECYCLE_E9_DURABLE_TRANSACTION.md','utf8');
for (const token of [
  'E9-F: COMPLETE',
  '3.0.0-alpha.5.76',
  'TEST_REGISTRY_GREEN:85',
  'exact-byte parity: VERIFIED',
  'E9_F_RELEASE_PROOF',
]) assert.ok(e9Runbook.includes(token),`E9 semantic evidence closure missing ${token}`);

const e10Runbook = fs.readFileSync('docs/USAGE_DASHBOARD_PR_LIFECYCLE_E10_IMMEDIATE_CONVERGENCE.md','utf8');
for (const token of [
  'E10-A',
  'promotion-complete wake',
  'materializer syntax',
  'one-shot generation qualification',
  'E10-E',
  'Issue `#365`',
]) assert.ok(e10Runbook.includes(token),`E10 runbook missing ${token}`);

console.log(`usage-dashboard E10 immediate convergence contract: OK · ${release.productVersion} · promotion wake + source syntax readiness + one-shot generation qualification`);
