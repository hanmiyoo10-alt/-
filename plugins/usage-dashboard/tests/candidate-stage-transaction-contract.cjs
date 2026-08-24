'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const control = require('../tools/release_control_command.cjs');

const workflow = fs.readFileSync('.github/workflows/usage-dashboard-prepare-candidate.yml', 'utf8');
const parser = fs.readFileSync('plugins/usage-dashboard/tools/release_control_command.cjs', 'utf8');
const stagePolicy = fs.readFileSync('plugins/usage-dashboard/tools/candidate_stage_policy.cjs', 'utf8');
const smoke = fs.readFileSync('plugins/usage-dashboard/tools/run_behavior_smoke.cjs', 'utf8');

const candidateBranch = 'release/usage-dashboard-5.72-fixture';
assert.deepEqual(control.parseStageCommand(`/usage-dashboard stage ${candidateBranch}`), {candidateBranch});
assert.ok(parser.includes("const STAGE_RE = /^\\/usage-dashboard stage "), 'strict stage grammar authority must remain present');
assert.match(workflow, /startsWith\(github\.event\.comment\.body, '\/usage-dashboard stage '\)/);
assert.match(workflow, /release_control_command\.cjs --stage-branch/);
assert.match(workflow, /CANDIDATE_STAGE_CONTROL_COMMENT/);
assert.match(workflow, /git\/ref\/heads\/\$TARGET_BRANCH/);
assert.match(workflow, /EXPECTED_HEAD_SHA="\$\{EXPECTED_HEAD_SHA,,\}"/);

const trustedCopyAt = workflow.indexOf('cp plugins/usage-dashboard/tools/candidate_stage_policy.cjs "$RUNNER_TEMP/usage-dashboard-candidate-stage-policy.cjs"');
const candidateCheckoutAt = workflow.indexOf('name: Checkout exact candidate base');
const trustedInspectAt = workflow.indexOf('node "$RUNNER_TEMP/usage-dashboard-candidate-stage-policy.cjs" --inspect');
assert.ok(trustedCopyAt > 0 && candidateCheckoutAt > trustedCopyAt && trustedInspectAt > candidateCheckoutAt,
  'stage policy must be frozen from trusted main before candidate checkout, then executed from RUNNER_TEMP');
assert.doesNotMatch(workflow.slice(candidateCheckoutAt, trustedInspectAt + 200), /node plugins\/usage-dashboard\/tools\/candidate_stage_policy\.cjs --inspect/,
  'candidate tree must not supply the stage diff authority');

assert.match(workflow, /git merge-base "\$TRUSTED_MAIN_SHA" "\$SOURCE_SHA"/);
assert.match(workflow, /CANDIDATE_STAGE_SOURCE_FROZEN/);
assert.match(stagePolicy, /CANDIDATE_STAGE_RELEASE_SPEC_COUNT/);
assert.match(stagePolicy, /CANDIDATE_STAGE_GENERATED_EDIT_DENIED/);
assert.match(stagePolicy, /CANDIDATE_STAGE_PATH_DENIED/);
assert.match(stagePolicy, /CANDIDATE_STAGE_NON_MONOTONIC_TARGET/);

assert.match(workflow, /python3 "\$UD_MATERIALIZER"/);
assert.match(workflow, /reconcile_release_candidate\.py --spec "\$RELEASE_SPEC" --two-pass/);
assert.match(workflow, /git bundle create/);
assert.match(workflow, /CANDIDATE_MATERIALIZED/);
assert.equal((workflow.match(/contents: write/g) || []).length, 1, 'stage transaction must not add a second writer');

const writerAt = workflow.indexOf('\n  commit-candidate:');
const readyAt = workflow.indexOf('\n  candidate-ready:');
assert.ok(writerAt > 0 && readyAt > writerAt);
const writer = workflow.slice(writerAt, readyAt);
for (const denied of ['reconcile_release_candidate.py','run_behavior_smoke.cjs','candidate_stage_policy.cjs','UD_MATERIALIZER','tests/run-all.cjs']) {
  assert.ok(!writer.includes(denied), `privileged writer must never execute ${denied}`);
}
assert.match(writer, /git push origin "\$PAYLOAD_SHA:refs\/heads\/\$TARGET_BRANCH"/);
assert.match(writer, /CANDIDATE_BRANCH_POSTVERIFY_MISMATCH/);
assert.doesNotMatch(writer, /--force|--force-with-lease/);

const ready = workflow.slice(readyAt);
assert.match(ready, /permissions:\n      contents: read/);
assert.match(ready, /ref: \$\{\{ needs\.prepare\.outputs\.candidate_sha \}\}/);
assert.match(ready, /persist-credentials: false/);
assert.match(ready, /reconcile_release_candidate\.py --spec "\$RELEASE_SPEC" --two-pass/);
assert.match(ready, /run_behavior_smoke\.cjs --repeat 3/);
assert.match(ready, /run_behavior_smoke\.cjs --repeat 1/);
assert.match(ready, /CANDIDATE_READY_BRANCH_MOVED/);
assert.match(ready, /CANDIDATE_READY:\$CANDIDATE_SHA:\$PRODUCT_VERSION:\$RELEASE_SPEC/);
assert.doesNotMatch(ready, /contents: write|git push origin/);

assert.match(smoke, /const suite = discoverTests\(\)/);
assert.match(smoke, /value < 1 \|\| value > 3/);
assert.match(smoke, /BEHAVIOR_SMOKE_FAILED/);
assert.match(smoke, /BEHAVIOR_SMOKE_GREEN/);

for (const fallback of ['/usage-dashboard prepare ', '/usage-dashboard ready ', '/usage-dashboard ready-branch ']) {
  const files = fallback.includes('ready')
    ? fs.readFileSync('.github/workflows/usage-dashboard-candidate-ready.yml', 'utf8')
    : workflow;
  assert.ok(files.includes(fallback), `fallback control must remain during E5 migration: ${fallback}`);
}

console.log('usage-dashboard E5-C stage transaction contract: OK · one command, frozen trusted policy, one writer, exact-SHA read-only readiness');
