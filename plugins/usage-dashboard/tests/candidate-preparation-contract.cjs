'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const policy = require('../tools/candidate_preparation_policy.cjs');
const control = require('../tools/release_control_command.cjs');
const e6 = require('../tools/candidate_stage_e6.cjs');

const fallbackWorkflow = fs.readFileSync('.github/workflows/usage-dashboard-prepare-candidate.yml','utf8');
const e6Workflow = fs.readFileSync('.github/workflows/usage-dashboard-stage-e6.yml','utf8');
const validatorWorkflow = fs.readFileSync('.github/workflows/usage-dashboard-validate.yml','utf8');

assert.match(fallbackWorkflow, /^  workflow_dispatch:/m);
assert.match(fallbackWorkflow, /^  issue_comment:\n    types: \[created\]$/m);
for (const input of ['target_branch:','expected_head_sha:','release_spec:']) assert.ok(fallbackWorkflow.includes(input));
assert.match(fallbackWorkflow, /startsWith\(github\.event\.comment\.body, '\/usage-dashboard prepare '\)/);
assert.doesNotMatch(fallbackWorkflow.match(/^    if:.*$/m)?.[0] || '', /\/usage-dashboard stage /,
  'legacy preparation workflow must no longer own the normal stage command');
assert.match(fallbackWorkflow, /release_control_command\.cjs --prepare-target/);
assert.match(fallbackWorkflow, /candidate_preparation_policy\.cjs --verify-payload/);
assert.match(fallbackWorkflow, /git bundle create/);
assert.equal((fallbackWorkflow.match(/contents: write/g) || []).length, 1, 'fallback must retain one constrained writer');

assert.match(e6Workflow, /github\.event\.issue\.number == 197/);
assert.match(e6Workflow, /github\.actor == github\.repository_owner/);
assert.match(e6Workflow, /startsWith\(github\.event\.comment\.body, '\/usage-dashboard stage '\)/);
assert.match(e6Workflow, /candidate_stage_e6\.cjs --inspect/);
assert.match(e6Workflow, /git diff --binary "\$INTENT_BASE_SHA" "\$SOURCE_SHA"/);
assert.match(e6Workflow, /git apply --index --3way/);
assert.match(e6Workflow, /git commit-tree "\$TREE_SHA" -p "\$CANDIDATE_PARENT_SHA"/);
assert.match(e6Workflow, /candidate_stage_e6\.cjs --verify-derived/);
assert.match(e6Workflow, /E6_CANDIDATE_CAS_FAILED/);
assert.match(e6Workflow, /git push origin "\$PAYLOAD_SHA:refs\/heads\/\$CANDIDATE_BRANCH"/);
assert.doesNotMatch(e6Workflow, /--force|--force-with-lease/);
assert.equal((e6Workflow.match(/contents: write/g) || []).length, 1, 'E6 must have exactly one repository-content writer');
assert.match(validatorWorkflow, /^  workflow_dispatch:$/m, 'E6 must explicitly dispatch exact-head full validation');

const writerAt = e6Workflow.indexOf('\n  write_candidate:');
const managerAt = e6Workflow.indexOf('\n  manage_pr:');
assert.ok(writerAt > 0 && managerAt > writerAt, 'E6 writer and PR manager must be separate jobs');
const writer = e6Workflow.slice(writerAt, managerAt);
for (const forbidden of [
  'UD_MATERIALIZER',
  'reconcile_release_candidate.py',
  'run_behavior_smoke.cjs',
  'candidate_stage_policy.cjs',
  'tests/run-all.cjs',
  'npm ',
  'npx ',
  '--force',
  '--force-with-lease',
]) assert.ok(!writer.includes(forbidden), `E6 privileged writer must not contain ${forbidden}`);
assert.match(writer, /ref: \$\{\{ needs\.resolve_stage\.outputs\.trusted_base_sha \}\}/);
assert.match(writer, /candidate_stage_e6\.cjs --verify-derived/);
assert.match(writer, /E6_CANDIDATE_POSTVERIFY_FAILED/);

const manager = e6Workflow.slice(managerAt, e6Workflow.indexOf('\n  receipt_ready:'));
assert.match(manager, /pull-requests: write/);
assert.match(manager, /actions: write/);
assert.match(manager, /state=open/);
assert.match(manager, /E6_MULTIPLE_OPEN_RELEASE_PRS/);
assert.match(manager, /usage-dashboard-validate\.yml\/dispatches/);
for (const forbidden of ['python3 "$UD_MATERIALIZER"','run_behavior_smoke.cjs','candidate_stage_e6.cjs --verify-derived']) {
  assert.ok(!manager.includes(forbidden), `PR manager must never execute candidate code: ${forbidden}`);
}

assert.equal(policy.assertTargetBranch('release/usage-dashboard-573-example'),'release/usage-dashboard-573-example');
for (const denied of ['main','release-usage-dashboard','release-simcore','feature/foo','stage/usage-dashboard-3.0.0-alpha.5.73']) {
  assert.throws(() => policy.assertTargetBranch(denied), /CANDIDATE_PREP_TARGET_DENIED/);
}
assert.equal(e6.deriveCandidateBranch('3.0.0-alpha.5.73'),'stage/usage-dashboard-3.0.0-alpha.5.73');
assert.equal(e6.assertDerivedBranch('stage/usage-dashboard-3.0.0-alpha.5.73'),'stage/usage-dashboard-3.0.0-alpha.5.73');
for (const denied of ['release/usage-dashboard-573-example','stage/usage-dashboard-foo','stage/usage-dashboard-3.0.0-alpha.4.73']) {
  assert.throws(() => e6.assertDerivedBranch(denied), /E6_DERIVED_BRANCH_DENIED/);
}

const sourceBranch = 'release/usage-dashboard-5.73-example';
const sourceSha = 'a43da840bb689ad43d8ac3cc0c6748a274cccc75';
const releaseSpec = '.github/usage-dashboard/releases/5.73.json';
assert.equal(control.CONTROL_ISSUE_NUMBER, 197);
assert.equal(control.assertControlEnvelope(197,'hanmiyoo10-alt','hanmiyoo10-alt'),true);
assert.deepEqual(control.parseStageCommand(`/usage-dashboard stage ${sourceBranch}`),{candidateBranch:sourceBranch});
assert.throws(() => control.parseStageCommand(`/usage-dashboard stage ${sourceBranch} extra`),/UD_CONTROL_STAGE_DENIED/);
const prepareCommand = `/usage-dashboard prepare ${sourceBranch} ${sourceSha} ${releaseSpec}`;
assert.deepEqual(control.parsePrepareCommand(prepareCommand),{targetBranch:sourceBranch,expectedHeadSha:sourceSha,releaseSpec});

function git(cwd,args,input) { return execFileSync('git',args,{cwd,encoding:'utf8',input}).trim(); }
function write(root,rel,text) { const file=path.join(root,rel); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,text); }
const originalCwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'usage-dashboard-e6-payload-'));
try {
  git(temp,['init']);
  git(temp,['config','user.name','test']);
  git(temp,['config','user.email','test@example.invalid']);
  write(temp,'plugins/usage-dashboard/latest.js','base\n');
  write(temp,'plugins/usage-dashboard/src/00-runtime-core.part.js','base\n');
  write(temp,'.github/usage-dashboard/releases/5.73.json','{}\n');
  write(temp,'plugins/usage-dashboard/tests/p37.cjs','base\n');
  git(temp,['add','.']);
  git(temp,['commit','-m','base']);
  const base = git(temp,['rev-parse','HEAD']);

  write(temp,'plugins/usage-dashboard/latest.js','generated\n');
  write(temp,'plugins/usage-dashboard/src/00-runtime-core.part.js','generated source sync\n');
  write(temp,'.github/usage-dashboard/releases/5.73.json','{"x":1}\n');
  write(temp,'plugins/usage-dashboard/tests/p37.cjs','test source\n');
  git(temp,['add','.']);
  const tree = git(temp,['write-tree']);
  const payload = git(temp,['commit-tree',tree,'-p',base], 'payload\n');
  process.chdir(temp);
  const sourceFiles = JSON.stringify(['.github/usage-dashboard/releases/5.73.json','plugins/usage-dashboard/tests/p37.cjs']);
  const verified = e6.verifyDerivedPayload(base,base,payload,sourceFiles);
  assert.deepEqual(new Set(verified.paths),new Set([
    '.github/usage-dashboard/releases/5.73.json',
    'plugins/usage-dashboard/latest.js',
    'plugins/usage-dashboard/src/00-runtime-core.part.js',
    'plugins/usage-dashboard/tests/p37.cjs',
  ]));
  assert.throws(() => e6.verifyDerivedPayload(base,'0'.repeat(40),payload,sourceFiles),/E6_PAYLOAD_PARENT_MISMATCH/);

  git(temp,['checkout','-q',base]);
  write(temp,'unrelated.txt','denied\n');
  git(temp,['add','.']);
  const deniedTree = git(temp,['write-tree']);
  const deniedPayload = git(temp,['commit-tree',deniedTree,'-p',base], 'denied\n');
  assert.throws(() => e6.verifyDerivedPayload(base,base,deniedPayload,'[]'),/E6_PAYLOAD_PATH_DENIED/);
} finally {
  process.chdir(originalCwd);
  fs.rmSync(temp,{recursive:true,force:true});
}

console.log('usage-dashboard candidate preparation contract: OK · E6 source/derived authority split, reentrant fast-forward writer, PR manager isolation, fallback prepare preserved');
