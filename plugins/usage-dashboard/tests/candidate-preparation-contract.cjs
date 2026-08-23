'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const policy = require('../tools/candidate_preparation_policy.cjs');

const workflow = fs.readFileSync('.github/workflows/usage-dashboard-prepare-candidate.yml','utf8');
const doc = fs.readFileSync('docs/USAGE_DASHBOARD_PR_LIFECYCLE_E4B_SAFE_CANDIDATE_PREPARATION.md','utf8');

assert.match(workflow, /^  workflow_dispatch:/m);
for (const input of ['target_branch:','expected_head_sha:','release_spec:']) assert.ok(workflow.includes(input));
assert.match(workflow, /^permissions:\n  contents: read$/m);
assert.match(workflow, /^  prepare:/m);
assert.match(workflow, /Require main workflow trust root/);
assert.match(workflow, /refs\/heads\/main/);
assert.match(workflow, /ref: \$\{\{ inputs\.expected_head_sha \}\}/);
assert.match(workflow, /persist-credentials: false/);
assert.match(workflow, /CANDIDATE_BRANCH_MOVED/);
assert.match(workflow, /\.github\/usage-dashboard\/releases\/\*\.json/);
assert.match(workflow, /candidate_preparation_policy\.cjs --check-worktree/);
assert.match(workflow, /git bundle create/);
assert.match(workflow, /actions\/upload-artifact@v4/);
assert.match(workflow, /actions\/download-artifact@v4/);
assert.match(workflow, /^  commit-candidate:/m);
assert.equal((workflow.match(/contents: write/g) || []).length, 1, 'only candidate commit job may request repository write');

const writerAt = workflow.indexOf('\n  commit-candidate:');
assert.ok(writerAt > 0);
const writer = workflow.slice(writerAt);
assert.match(writer, /ref: \$\{\{ github\.sha \}\}/);
assert.match(writer, /candidate_preparation_policy\.cjs --verify-payload/);
assert.match(writer, /git ls-remote origin/);
assert.match(writer, /git push origin "\$PAYLOAD_SHA:refs\/heads\/\$TARGET_BRANCH"/);
assert.match(writer, /CANDIDATE_BRANCH_POSTVERIFY_MISMATCH/);
for (const forbidden of [
  'UD_MATERIALIZER',
  'build_bridge_engine.cjs',
  'build_usage_dashboard.cjs',
  'tests/run-all.cjs',
  'npm ',
  'npx ',
  'git checkout',
  'git switch',
  '--force',
  '--force-with-lease',
]) assert.ok(!writer.includes(forbidden), `writer must not contain ${forbidden}`);

assert.equal(policy.assertTargetBranch('release/usage-dashboard-571-example'),'release/usage-dashboard-571-example');
for (const denied of ['main','release-usage-dashboard','release-simcore','feature/foo','release/other']) {
  assert.throws(() => policy.assertTargetBranch(denied), /CANDIDATE_PREP_TARGET_DENIED/);
}
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

console.log('usage-dashboard candidate preparation contract: OK · read/write split, bundle boundary, CAS, path/mode fail-closed');
