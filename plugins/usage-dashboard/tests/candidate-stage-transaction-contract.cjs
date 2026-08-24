'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const control = require('../tools/release_control_command.cjs');
const e6 = require('../tools/candidate_stage_e6.cjs');

const workflow = fs.readFileSync('.github/workflows/usage-dashboard-stage-e6.yml','utf8');
const fallback = fs.readFileSync('.github/workflows/usage-dashboard-prepare-candidate.yml','utf8');
const validator = fs.readFileSync('.github/workflows/usage-dashboard-validate.yml','utf8');
const promoter = fs.readFileSync('.github/workflows/usage-dashboard-promote.yml','utf8');
const smoke = fs.readFileSync('plugins/usage-dashboard/tools/run_behavior_smoke.cjs','utf8');

const sourceBranch='release/usage-dashboard-5.73-fixture';
assert.deepEqual(control.parseStageCommand(`/usage-dashboard stage ${sourceBranch}`),{candidateBranch:sourceBranch});
assert.equal(e6.deriveCandidateBranch('3.0.0-alpha.5.73'),'stage/usage-dashboard-3.0.0-alpha.5.73');

assert.match(workflow, /^name: Usage Dashboard E6 Repairable Stage$/m);
assert.match(workflow, /group: usage-dashboard-e6-stage/);
assert.match(workflow, /github\.event\.issue\.number == 197/);
assert.match(workflow, /github\.actor == github\.repository_owner/);
assert.match(workflow, /release_control_command\.cjs --stage-branch/);
assert.match(workflow, /candidate_stage_e6\.cjs --inspect/);
assert.match(workflow, /E6_STAGE_SOURCE_FROZEN/);
assert.match(workflow, /source_branch: \$\{\{ steps\.resolve\.outputs\.source_branch \}\}/);
assert.match(workflow, /candidate_branch: \$\{\{ steps\.resolve\.outputs\.candidate_branch \}\}/);

const resolveAt=workflow.indexOf('\n  resolve_stage:');
const materializeAt=workflow.indexOf('\n  materialize_stage:');
const writerAt=workflow.indexOf('\n  write_candidate:');
const managerAt=workflow.indexOf('\n  manage_pr:');
const readyAt=workflow.indexOf('\n  receipt_ready:');
assert.ok(resolveAt>0 && materializeAt>resolveAt && writerAt>materializeAt && managerAt>writerAt && readyAt>managerAt);

const materialize=workflow.slice(materializeAt,writerAt);
assert.match(materialize,/ref: \$\{\{ needs\.resolve_stage\.outputs\.trusted_base_sha \}\}/);
assert.match(materialize,/persist-credentials: false/);
assert.match(materialize,/git diff --binary "\$INTENT_BASE_SHA" "\$SOURCE_SHA"/);
assert.match(materialize,/git apply --index --3way/);
assert.match(materialize,/SOURCE_INTENT_CONFLICT/);
assert.match(materialize,/python3 "\$UD_MATERIALIZER"/);
assert.match(materialize,/reconcile_release_candidate\.py --spec "\$RELEASE_SPEC" --two-pass/);
assert.match(materialize,/run_behavior_smoke\.cjs --repeat 3/);
assert.match(materialize,/run_behavior_smoke\.cjs --repeat 1/);
assert.match(materialize,/git commit-tree "\$TREE_SHA" -p "\$CANDIDATE_PARENT_SHA"/);
assert.match(materialize,/candidate_stage_e6\.cjs --verify-derived/);
assert.match(materialize,/git bundle create/);
assert.doesNotMatch(materialize,/contents: write/);

const writer=workflow.slice(writerAt,managerAt);
assert.match(writer,/permissions:\n      contents: write/);
assert.match(writer,/E6_CANDIDATE_CAS_FAILED/);
assert.match(writer,/candidate_stage_e6\.cjs --verify-derived/);
assert.match(writer,/git push origin "\$PAYLOAD_SHA:refs\/heads\/\$CANDIDATE_BRANCH"/);
assert.match(writer,/E6_CANDIDATE_POSTVERIFY_FAILED/);
assert.doesNotMatch(writer,/--force|--force-with-lease/);
for(const forbidden of ['python3 "$UD_MATERIALIZER"','reconcile_release_candidate.py','run_behavior_smoke.cjs','candidate_stage_policy.cjs','tests/run-all.cjs']) {
  assert.ok(!writer.includes(forbidden),`write-only job must not execute ${forbidden}`);
}
assert.equal((workflow.match(/contents: write/g)||[]).length,1,'E6 stage owns one contents writer only');

const manager=workflow.slice(managerAt,readyAt);
assert.match(manager,/pull-requests: write/);
assert.match(manager,/actions: write/);
assert.match(manager,/state=open/);
assert.match(manager,/base=main/);
assert.match(manager,/head=\$OWNER:\$CANDIDATE_BRANCH/);
assert.match(manager,/E6_MULTIPLE_OPEN_RELEASE_PRS/);
assert.match(manager,/usage-dashboard-validate\.yml\/dispatches/);
assert.match(manager,/E6_PR_READY/);
for(const forbidden of ['UD_MATERIALIZER','reconcile_release_candidate.py','run_behavior_smoke.cjs','git apply --index']) {
  assert.ok(!manager.includes(forbidden),`PR manager must not execute ${forbidden}`);
}

assert.match(workflow,/UD_STAGE_ACCEPTED/);
assert.match(workflow,/UD_CANDIDATE_READY/);
assert.match(workflow,/UD_STAGE_REJECTED/);
assert.match(workflow,/next: materializing/);
assert.match(workflow,/next: full PR CI/);
assert.match(workflow,/run the same stage command again/);

assert.match(validator,/^  workflow_dispatch:$/m);
assert.match(validator,/usage-dashboard-stage-e6\.yml/);
assert.match(promoter,/usage-dashboard-stage-e6\.yml/);
assert.match(promoter,/^  release-receipt:/m);
assert.match(promoter,/UD_RELEASE_DEPLOYED/);
assert.match(promoter,/exact_byte_parity: VERIFIED/);
assert.match(promoter,/physical_verification: PENDING/);
assert.match(promoter,/check_release_blob_parity\.cjs/);

const fallbackIf=fallback.match(/^    if:.*$/m)?.[0]||'';
assert.match(fallbackIf,/\/usage-dashboard prepare /);
assert.doesNotMatch(fallbackIf,/\/usage-dashboard stage /,'E6 must be the sole normal stage owner');
for(const legacy of ['/usage-dashboard ready ','/usage-dashboard ready-branch ']) {
  const readyFallback=fs.readFileSync('.github/workflows/usage-dashboard-candidate-ready.yml','utf8');
  assert.ok(readyFallback.includes(legacy),`readiness emergency fallback must remain: ${legacy}`);
}

assert.match(smoke,/const suite = discoverTests\(\)/);
assert.match(smoke,/value < 1 \|\| value > 3/);
assert.match(smoke,/BEHAVIOR_SMOKE_FAILED/);
assert.match(smoke,/BEHAVIOR_SMOKE_GREEN/);

console.log('usage-dashboard E6 stage transaction contract: OK · source-only intent, reentrant derived candidate, same-PR dispatch, actionable receipts, exact-byte deploy receipt');
