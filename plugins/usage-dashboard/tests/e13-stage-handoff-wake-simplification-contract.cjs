'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const rr = require('../tools/release_request_e9.cjs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
const body = [
  'Plugin: usage-dashboard',
  `release_version: ${release.productVersion}`,
  `release_spec: ${release.specPath}`,
  'source_branch: release/usage-dashboard-e13-fixture',
  `source_sha: ${'6'.repeat(40)}`,
  'feature_issue: #390',
  'release_generation: E13',
  'pr_number: PENDING',
].join('\n');
const request = rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`,body);
assert.equal(request.releaseGeneration,'E13');
for (const generation of ['E9','E10','E11','E12']) {
  const compatible = rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`,body.replace('release_generation: E13',`release_generation: ${generation}`));
  assert.equal(compatible.releaseGeneration,generation);
}
assert.throws(() => rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`,body.replace('release_generation: E13','release_generation: E14')),/E9_REQUEST_GENERATION_DENIED/);

const reconciler = fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml','utf8');
const validator = fs.readFileSync('.github/workflows/usage-dashboard-e9-validate.yml','utf8');
const stage = fs.readFileSync('.github/workflows/usage-dashboard-stage-e7.yml','utf8');
const wake = fs.readFileSync('plugins/usage-dashboard/tools/reducer_wake_e13.sh','utf8');

assert.ok(reconciler.includes('workflows: ["Usage Dashboard Exact-Byte Promotion"]'),'E13 reducer must keep only the proven promotion workflow_run edge');
assert.ok(!reconciler.includes('Usage Dashboard E9 Exact-SHA Validation'),'E13 must remove the disproven validation workflow_run edge');
assert.ok(reconciler.includes("E13_GENERATION_ISSUE: '390'"),'E13 generation issue wiring missing');
assert.ok(reconciler.includes("GENERATION_PROOF_MARKER='E13_REAL_RELEASE_PROOF'"),'E13 one-shot proof wiring missing');
assert.ok(reconciler.includes("cron: '*/5 * * * *'"),'E13 must retain the anti-loss schedule');
assert.ok(reconciler.includes('git ls-remote origin "refs/heads/$CANDIDATE_BRANCH"'),'reducer must continue to discover candidate identity from GitHub state');
assert.ok(!reconciler.includes('git push'),'reducer must remain ref read-only');

assert.equal((stage.match(/reducer_wake_e13\.sh stage/g)||[]).length,1,'successful stage path must use exactly one canonical wake');
assert.equal((validator.match(/reducer_wake_e13\.sh validation/g)||[]).length,1,'validator must use exactly one canonical wake');
const stageReceipt = stage.indexOf('Post authoritative candidate-ready receipt');
const stageWake = stage.indexOf('reducer_wake_e13.sh stage');
const stageFailure = stage.indexOf('receipt_failure:');
assert.ok(stageReceipt >= 0 && stageWake > stageReceipt && stageFailure > stageWake,'stage wake must occur only after successful candidate-ready receipt and outside failure path');
assert.ok(stage.includes('actions: write'),'stage success path must have only the Actions permission needed for wake transport');

const validationPublish = validator.indexOf('$GITHUB_API_URL/repos/$GITHUB_REPOSITORY/issues/$ISSUE/comments');
const validationWake = validator.indexOf('reducer_wake_e13.sh validation');
assert.ok(validationPublish >= 0 && validationWake > validationPublish,'validator must publish authoritative result before wake transport');
assert.ok(!validator.includes('actions/workflows/usage-dashboard-e9-release-reconcile.yml/dispatches'),'validator must not duplicate raw reducer-dispatch transport');
assert.ok(!stage.includes('actions/workflows/usage-dashboard-e9-release-reconcile.yml/dispatches'),'stage must not duplicate raw reducer-dispatch transport');
assert.equal(validator.includes('reconcile_nonce'),false,'validator wake must not mutate durable issue state');

for (const token of [
  'stage|validation',
  '{"ref":"main"}',
  'actions/workflows/usage-dashboard-e9-release-reconcile.yml/dispatches',
  'E13_REDUCER_WAKE_DISPATCHED:',
]) assert.ok(wake.includes(token),`canonical wake helper missing ${token}`);
for (const forbidden of [
  'issues/',
  'pulls/',
  'git push',
  'release-usage-dashboard',
  'candidate_sha',
  'source_sha',
  'pr_number',
  'reconcile_nonce',
  'sleep ',
]) assert.ok(!wake.includes(forbidden),`canonical wake helper must not own release authority/write behavior: ${forbidden}`);

assert.ok(stage.includes('git push origin "$PAYLOAD_SHA:refs/heads/$CANDIDATE_BRANCH"'),'trusted stage writer ownership must remain where it already exists');
assert.ok(validator.includes('UD_VALIDATION_RESULT'),'exact validator remains validation authority publisher');
assert.ok(reconciler.includes('merge_guard_receipt_e12.cjs --format'),'self-describing frozen-main merge receipt remains intact');

console.log(`usage-dashboard E13 stage handoff wake contract: OK · ${release.productVersion} · canonical stage/validation reducer wake + dead validation workflow_run removed + authority boundaries unchanged`);
