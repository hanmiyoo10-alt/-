'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const policy = require('../tools/candidate_preparation_policy.cjs');
const control = require('../tools/release_control_command.cjs');

const workflow = fs.readFileSync('.github/workflows/usage-dashboard-prepare-candidate.yml','utf8');
const doc = fs.readFileSync('docs/USAGE_DASHBOARD_PR_LIFECYCLE_E4B_SAFE_CANDIDATE_PREPARATION.md','utf8');

assert.match(workflow, /^  workflow_dispatch:/m);
assert.match(workflow, /^  issue_comment:\n    types: \[created\]$/m);
for (const input of ['target_branch:','expected_head_sha:','release_spec:']) assert.ok(workflow.includes(input));
assert.match(workflow, /^permissions:\n  contents: read$/m);
assert.match(workflow, /^  prepare:/m);
assert.match(workflow, /github\.event\.issue\.number == 197/);
assert.match(workflow, /github\.actor == github\.repository_owner/);
assert.match(workflow, /\/usage-dashboard prepare /);
assert.match(workflow, /\/usage-dashboard stage /);
assert.match(workflow, /Checkout immutable trusted normalization policy/);
assert.match(workflow, /Require main workflow trust root/);
assert.match(workflow, /refs\/heads\/main/);
assert.match(workflow, /RAW_TARGET_BRANCH: \$\{\{ inputs\.target_branch \}\}/);
assert.match(workflow, /RAW_EXPECTED_HEAD_SHA: \$\{\{ inputs\.expected_head_sha \}\}/);
assert.match(workflow, /RAW_RELEASE_SPEC: \$\{\{ inputs\.release_spec \}\}/);
assert.match(workflow, /release_control_command\.cjs --check-envelope/);
assert.match(workflow, /release_control_command\.cjs --prepare-target/);
assert.match(workflow, /release_control_command\.cjs --prepare-sha/);
assert.match(workflow, /release_control_command\.cjs --prepare-spec/);
assert.match(workflow, /release_control_command\.cjs --stage-branch/);
assert.match(workflow, /candidate_stage_policy\.cjs "\$RUNNER_TEMP\/usage-dashboard-candidate-stage-policy\.cjs"/);
assert.match(workflow, /node "\$RUNNER_TEMP\/usage-dashboard-candidate-stage-policy\.cjs" --inspect/);
assert.match(workflow, /git merge-base "\$TRUSTED_MAIN_SHA" "\$SOURCE_SHA"/);
assert.match(workflow, /--normalize-target "\$RAW_TARGET_BRANCH"/);
assert.match(workflow, /--normalize-sha "\$RAW_EXPECTED_HEAD_SHA"/);
assert.match(workflow, /--normalize-spec "\$RAW_RELEASE_SPEC"/);
assert.match(workflow, /ref: \$\{\{ steps\.trust\.outputs\.expected_head_sha \}\}/);
assert.match(workflow, /persist-credentials: false/);
assert.match(workflow, /CANDIDATE_BRANCH_MOVED/);
assert.match(workflow, /candidate_preparation_policy\.cjs --check-worktree/);
assert.match(workflow, /reconcile_release_candidate\.py --spec "\$RELEASE_SPEC" --two-pass/);
assert.match(workflow, /git bundle create/);
assert.match(workflow, /actions\/upload-artifact@v4/);
assert.match(workflow, /actions\/download-artifact@v4/);
assert.match(workflow, /^  commit-candidate:/m);
assert.match(workflow, /^  candidate-ready:/m);
assert.equal((workflow.match(/contents: write/g) || []).length, 1, 'only candidate commit job may request repository write');

const writerAt = workflow.indexOf('\n  commit-candidate:');
const readyAt = workflow.indexOf('\n  candidate-ready:');
assert.ok(writerAt > 0 && readyAt > writerAt, 'writer and downstream readiness jobs must have distinct boundaries');
const writer = workflow.slice(writerAt, readyAt);
assert.match(writer, /ref: \$\{\{ github\.sha \}\}/);
assert.match(writer, /TARGET_BRANCH: \$\{\{ needs\.prepare\.outputs\.target_branch \}\}/);
assert.match(writer, /EXPECTED_HEAD_SHA: \$\{\{ needs\.prepare\.outputs\.expected_head_sha \}\}/);
assert.match(writer, /RELEASE_SPEC: \$\{\{ needs\.prepare\.outputs\.release_spec \}\}/);
assert.match(writer, /candidate_preparation_policy\.cjs --verify-payload/);
assert.match(writer, /git ls-remote origin/);
assert.match(writer, /git push origin "\$PAYLOAD_SHA:refs\/heads\/\$TARGET_BRANCH"/);
assert.match(writer, /CANDIDATE_BRANCH_POSTVERIFY_MISMATCH/);
for (const forbidden of [
  'UD_MATERIALIZER',
  'build_bridge_engine.cjs',
  'build_usage_dashboard.cjs',
  'reconcile_release_candidate.py',
  'run_behavior_smoke.cjs',
  'release_control_command.cjs',
  'tests/run-all.cjs',
  'npm ',
  'npx ',
  'git checkout',
  'git switch',
  '--force',
  '--force-with-lease',
]) assert.ok(!writer.includes(forbidden), `writer must not contain ${forbidden}`);

const readiness = workflow.slice(readyAt);
assert.match(readiness, /^  candidate-ready:/m);
assert.match(readiness, /permissions:\n      contents: read/);
assert.match(readiness, /ref: \$\{\{ needs\.prepare\.outputs\.candidate_sha \}\}/);
assert.match(readiness, /reconcile_release_candidate\.py --spec "\$RELEASE_SPEC" --two-pass/);
assert.match(readiness, /run_behavior_smoke\.cjs --repeat 3/);
assert.match(readiness, /run_behavior_smoke\.cjs --repeat 1/);
assert.match(readiness, /CANDIDATE_READY_BRANCH_MOVED/);
assert.match(readiness, /CANDIDATE_READY:\$CANDIDATE_SHA:\$PRODUCT_VERSION:\$RELEASE_SPEC/);
assert.doesNotMatch(readiness, /contents: write|git push origin/);

assert.equal(policy.assertTargetBranch('release/usage-dashboard-571-example'),'release/usage-dashboard-571-example');
for (const denied of ['main','release-usage-dashboard','release-simcore','feature/foo','release/other']) {
  assert.throws(() => policy.assertTargetBranch(denied), /CANDIDATE_PREP_TARGET_DENIED/);
}

const candidateBranch = 'release/usage-dashboard-5.71-cross-scope-provenance';
const candidateSha = 'a43da840bb689ad43d8ac3cc0c6748a274cccc75';
const releaseSpec = '.github/usage-dashboard/releases/5.71.json';
assert.equal(
  policy.normalizeTargetBranchInput(`Candidate branch ${candidateBranch}\n${candidateBranch}`),
  candidateBranch,
  'mobile UI label contamination with the same branch repeated must normalize to one exact branch',
);
assert.equal(
  policy.normalizeExpectedShaInput(`Exact current candidate branch head SHA ${candidateSha}\n${candidateSha}`),
  candidateSha,
  'mobile UI label contamination with the same SHA repeated must normalize to one exact SHA',
);
assert.equal(
  policy.normalizeReleaseSpecInput(`Explicit target release spec path under ${releaseSpec}`),
  releaseSpec,
  'mobile UI label contamination around one exact release spec must normalize safely',
);
assert.throws(
  () => policy.normalizeTargetBranchInput(`${candidateBranch}\nrelease/usage-dashboard-other`),
  /CANDIDATE_PREP_TARGET_DENIED/,
  'two distinct valid target branches must fail closed',
);
assert.throws(
  () => policy.normalizeExpectedShaInput(`${candidateSha}\n${'b'.repeat(40)}`),
  /CANDIDATE_PREP_INVALID_SHA/,
  'two distinct valid SHAs must fail closed',
);
assert.throws(
  () => policy.normalizeReleaseSpecInput(`${releaseSpec}\n.github/usage-dashboard/releases/5.72.json`),
  /CANDIDATE_PREP_RELEASE_SPEC_DENIED/,
  'two distinct valid release specs must fail closed',
);
assert.throws(() => policy.normalizeTargetBranchInput('Candidate branch only'), /CANDIDATE_PREP_TARGET_DENIED/);
assert.throws(() => policy.normalizeExpectedShaInput('not-a-sha'), /CANDIDATE_PREP_INVALID_SHA/);
assert.throws(() => policy.normalizeReleaseSpecInput('../5.71.json'), /CANDIDATE_PREP_RELEASE_SPEC_DENIED/);

assert.equal(control.CONTROL_ISSUE_NUMBER, 197);
assert.equal(control.assertControlEnvelope(197, 'hanmiyoo10-alt', 'hanmiyoo10-alt'), true);
assert.throws(() => control.assertControlEnvelope(198, 'hanmiyoo10-alt', 'hanmiyoo10-alt'), /UD_CONTROL_ISSUE_DENIED/);
assert.throws(() => control.assertControlEnvelope(197, 'someone-else', 'hanmiyoo10-alt'), /UD_CONTROL_ACTOR_DENIED/);
const prepareCommand = `/usage-dashboard prepare ${candidateBranch} ${candidateSha} ${releaseSpec}`;
assert.deepEqual(control.parsePrepareCommand(prepareCommand), {
  targetBranch:candidateBranch,
  expectedHeadSha:candidateSha,
  releaseSpec,
});
for (const denied of [
  `${prepareCommand}\nextra`,
  `/usage-dashboard prepare main ${candidateSha} ${releaseSpec}`,
  `/usage-dashboard prepare ${candidateBranch} ${candidateSha} ../5.71.json`,
  `${prepareCommand} extra`,
]) assert.throws(() => control.parsePrepareCommand(denied), /UD_CONTROL_PREPARE_DENIED/);
assert.deepEqual(control.parseStageCommand(`/usage-dashboard stage ${candidateBranch}`), {candidateBranch});
for (const denied of [
  `/usage-dashboard stage ${candidateBranch} extra`,
  `/usage-dashboard stage ${candidateBranch}\nextra`,
  '/usage-dashboard stage main',
  '/usage-dashboard stage release-usage-dashboard',
  '/usage-dashboard stage feature/foo',
]) assert.throws(() => control.parseStageCommand(denied), /UD_CONTROL_STAGE_DENIED/);

for (const allowed of [
  'plugins/usage-dashboard/latest.js',
  'plugins/usage-dashboard/src/10-request-normalize.part.js',
  'plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs',
  'plugins/usage-dashboard/runtime/bridge-engine.mjs',
  'docs/USAGE_DASHBOARD_GUIDELINES.md',
]) assert.equal(policy.safePath(allowed), true, allowed);
for (const denied of [
  '.github/workflows/evil.yml',
  '.github/usage-dashboard/releases/5.71.json',
  'scripts/bootstrap-usage-dashboard.sh',
  'plugins/usage-dashboard/tests/p35-new.cjs',
  'plugins/usage-dashboard/tools/release_new.py',
  '../escape',
]) assert.equal(policy.safePath(denied), false, denied);
assert.throws(() => policy.assertAllowedPaths(['plugins/usage-dashboard/tests/p35-new.cjs']), /CANDIDATE_PREP_PATH_DENIED/);

function git(cwd,args) { return execFileSync('git',args,{cwd,encoding:'utf8'}).trim(); }
function write(root,rel,text) { const file=path.join(root,rel); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,text); }
const originalCwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'usage-dashboard-e4b-'));
try {
  git(temp,['init']);
  git(temp,['config','user.name','test']);
  git(temp,['config','user.email','test@example.invalid']);
  write(temp,'plugins/usage-dashboard/latest.js','base\n');
  git(temp,['add','.']);
  git(temp,['commit','-m','base']);
  const base = git(temp,['rev-parse','HEAD']);

  write(temp,'plugins/usage-dashboard/latest.js','payload\n');
  git(temp,['add','.']);
  git(temp,['commit','-m','payload']);
  const payload = git(temp,['rev-parse','HEAD']);
  process.chdir(temp);
  const verified = policy.verifyPayloadCommit(base,payload);
  assert.deepEqual(verified.paths,['plugins/usage-dashboard/latest.js']);
  assert.throws(() => policy.verifyPayloadCommit('0'.repeat(40),payload), /CANDIDATE_PAYLOAD_PARENT_MISMATCH/);

  git(temp,['checkout','-q',base]);
  write(temp,'plugins/usage-dashboard/tests/forbidden.cjs','x\n');
  git(temp,['add','.']);
  git(temp,['commit','-m','forbidden']);
  const forbiddenPayload = git(temp,['rev-parse','HEAD']);
  assert.throws(() => policy.verifyPayloadCommit(base,forbiddenPayload), /CANDIDATE_PREP_PATH_DENIED/);

  git(temp,['checkout','-q',base]);
  const link = path.join(temp,'plugins/usage-dashboard/runtime/link');
  fs.mkdirSync(path.dirname(link),{recursive:true});
  fs.symlinkSync('../latest.js',link);
  git(temp,['add','.']);
  git(temp,['commit','-m','symlink']);
  const symlinkPayload = git(temp,['rev-parse','HEAD']);
  assert.throws(() => policy.verifyPayloadCommit(base,symlinkPayload), /CANDIDATE_PAYLOAD_MODE_DENIED/);
} finally {
  process.chdir(originalCwd);
  fs.rmSync(temp,{recursive:true,force:true});
}

for (const marker of [
  'candidate code never receives repository write credentials',
  'privileged writer never executes candidate code',
  'CANDIDATE_BRANCH_MOVED',
  'plain fast-forward',
  'E2 read-only candidate-ready preflight',
]) assert.ok(doc.includes(marker), `missing E4-B durable invariant: ${marker}`);

console.log('usage-dashboard candidate preparation contract: OK · manual/comment/stage control, read/write split, bundle boundary, CAS, path/mode fail-closed');
