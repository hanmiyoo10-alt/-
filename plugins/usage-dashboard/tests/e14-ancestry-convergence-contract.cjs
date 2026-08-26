'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const stage = require('../tools/candidate_stage_e6.cjs');
const mergeGuard = require('../tools/merge_guard_e11.cjs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
assert.equal(release.productVersion,'3.0.0-alpha.5.81','E14 maintenance must not consume a product version');

function git(cwd,args,input) {
  return execFileSync('git',args,{cwd,encoding:'utf8',input}).trim();
}
function write(root,rel,text) {
  const file=path.join(root,rel);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,text);
}
function materialize(cwd, tree, parents, frozenMain, sourceChar) {
  const args=['commit-tree',tree];
  for(const parent of parents) args.push('-p',parent);
  const message=`materialize: Usage Dashboard ${release.productVersion} from source ${sourceChar.repeat(40)}\n\nUsage-Dashboard-Frozen-Main: ${frozenMain}\n`;
  return git(cwd,args,message);
}

const originalCwd=process.cwd();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'usage-dashboard-e14-'));
try {
  git(temp,['init','-q']);
  git(temp,['config','user.name','usage-dashboard-e14-fixture']);
  git(temp,['config','user.email','usage-dashboard-e14@example.invalid']);
  write(temp,'plugins/usage-dashboard/latest.js','m0\n');
  write(temp,'docs/SIMCORE_BASE.md','base\n');
  git(temp,['add','.']);
  git(temp,['commit','-q','-m','M0']);
  const m0=git(temp,['rev-parse','HEAD']);

  write(temp,'plugins/usage-dashboard/latest.js','c0\n');
  git(temp,['add','plugins/usage-dashboard/latest.js']);
  const c0Tree=git(temp,['write-tree']);
  const c0=materialize(temp,c0Tree,[m0],m0,'0');
  git(temp,['reset','--hard','-q',m0]);

  process.chdir(temp);
  const c0Verified=stage.verifyDerivedPayload(m0,m0,c0,'[]');
  assert.deepEqual(c0Verified.parents,[m0]);
  assert.deepEqual(stage.expectedParentList(m0,m0),[m0]);
  assert.equal(mergeGuard.candidateDagAgreement(c0).mode,'e14-one-parent-converged');

  write(temp,'docs/SIMCORE_UNRELATED_1.md','m1\n');
  git(temp,['add','docs/SIMCORE_UNRELATED_1.md']);
  git(temp,['commit','-q','-m','M1 unrelated main advance']);
  const m1=git(temp,['rev-parse','HEAD']);

  write(temp,'plugins/usage-dashboard/latest.js','c1\n');
  git(temp,['add','plugins/usage-dashboard/latest.js']);
  const c1Tree=git(temp,['write-tree']);
  const c1=materialize(temp,c1Tree,[c0,m1],m1,'1');
  git(temp,['reset','--hard','-q',m1]);

  const c1Verified=stage.verifyDerivedPayload(m1,c0,c1,'[]');
  assert.deepEqual(c1Verified.parents,[c0,m1],'first drift restage must carry [previous candidate, frozen main]');
  assert.deepEqual(stage.expectedParentList(m1,c0),[c0,m1]);
  assert.equal(stage.gitIsAncestor(c0,c1),true,'candidate branch history must remain append-only');
  assert.equal(stage.gitIsAncestor(m1,c1),true,'frozen main must become a real candidate ancestor');
  assert.equal(git(temp,['merge-base',c1,m1]),m1,'GitHub merge-base input must converge to the same frozen main E11 uses');
  const c1Guard=mergeGuard.classify(c1,m1);
  assert.equal(c1Guard.verdict,'MERGE_READY_NO_DRIFT');
  assert.equal(c1Guard.candidateParentCount,2);
  assert.equal(c1Guard.candidateDagMode,'e14-two-parent-converged');

  write(temp,'docs/SIMCORE_UNRELATED_2.md','m2\n');
  git(temp,['add','docs/SIMCORE_UNRELATED_2.md']);
  git(temp,['commit','-q','-m','M2 unrelated main advance']);
  const m2=git(temp,['rev-parse','HEAD']);

  write(temp,'plugins/usage-dashboard/latest.js','c2\n');
  git(temp,['add','plugins/usage-dashboard/latest.js']);
  const c2Tree=git(temp,['write-tree']);
  const c2=materialize(temp,c2Tree,[c1,m2],m2,'2');
  git(temp,['reset','--hard','-q',m2]);

  const c2Verified=stage.verifyDerivedPayload(m2,c1,c2,'[]');
  assert.deepEqual(c2Verified.parents,[c1,m2],'second unrelated main advance must restage without a source-refresh PR');
  assert.equal(stage.gitIsAncestor(c1,c2),true);
  assert.equal(stage.gitIsAncestor(m2,c2),true);
  assert.equal(git(temp,['merge-base',c2,m2]),m2);
  assert.equal(mergeGuard.classify(c2,m2).candidateDagMode,'e14-two-parent-converged');

  write(temp,'plugins/usage-dashboard/latest.js','c3 same-main restage\n');
  git(temp,['add','plugins/usage-dashboard/latest.js']);
  const c3Tree=git(temp,['write-tree']);
  const c3=materialize(temp,c3Tree,[c2],m2,'3');
  git(temp,['reset','--hard','-q',m2]);

  const c3Verified=stage.verifyDerivedPayload(m2,c2,c3,'[]');
  assert.deepEqual(c3Verified.parents,[c2],'same frozen main must not add a redundant second parent');
  assert.deepEqual(stage.expectedParentList(m2,c2),[c2]);
  assert.equal(mergeGuard.candidateDagAgreement(c3).mode,'e14-one-parent-converged');

  write(temp,'plugins/usage-dashboard/latest.js','negative fixtures\n');
  git(temp,['add','plugins/usage-dashboard/latest.js']);
  const negativeTree=git(temp,['write-tree']);
  git(temp,['reset','--hard','-q',m2]);

  const missing=materialize(temp,negativeTree,[c1],m2,'4');
  assert.throws(() => stage.verifyDerivedPayload(m2,c1,missing,'[]'),/E14_FROZEN_MAIN_PARENT_MISSING/);

  const swapped=materialize(temp,negativeTree,[m2,c1],m2,'5');
  assert.throws(() => stage.verifyDerivedPayload(m2,c1,swapped,'[]'),/E14_FIRST_PARENT_MISMATCH/);

  const arbitrarySecond=git(temp,['commit-tree',negativeTree,'-p',m1],'arbitrary second parent fixture\n');
  const arbitrary=materialize(temp,negativeTree,[c1,arbitrarySecond],m2,'6');
  assert.throws(() => stage.verifyDerivedPayload(m2,c1,arbitrary,'[]'),/E14_FROZEN_MAIN_PARENT_MISMATCH/);

  const third=materialize(temp,negativeTree,[c1,m2,m0],m2,'7');
  assert.throws(() => stage.verifyDerivedPayload(m2,c1,third,'[]'),/E14_PAYLOAD_PARENT_COUNT/);

  const redundant=materialize(temp,negativeTree,[c1,m1],m1,'8');
  assert.throws(() => stage.verifyDerivedPayload(m1,c1,redundant,'[]'),/E14_REDUNDANT_FROZEN_MAIN_PARENT/);

  const trailerMismatch=materialize(temp,negativeTree,[c2],m1,'9');
  assert.throws(() => stage.verifyDerivedPayload(m2,c2,trailerMismatch,'[]'),/E14_FROZEN_MAIN_TRAILER_MISMATCH/);

  assert.throws(() => mergeGuard.candidateDagAgreement(missing),/E14_FROZEN_MAIN_PARENT_MISSING/);
  assert.throws(() => mergeGuard.candidateDagAgreement(arbitrary),/E14_FROZEN_MAIN_PARENT_MISMATCH/);
  assert.throws(() => mergeGuard.candidateDagAgreement(redundant),/E14_REDUNDANT_FROZEN_MAIN_PARENT/);
} finally {
  process.chdir(originalCwd);
  fs.rmSync(temp,{recursive:true,force:true,maxRetries:3,retryDelay:50});
}

const workflow=fs.readFileSync('.github/workflows/usage-dashboard-stage-e7.yml','utf8');
for(const token of [
  'NEEDS_FROZEN_MAIN_PARENT=false',
  'git merge-base --is-ancestor "$TRUSTED_BASE_SHA" "$CANDIDATE_PARENT_SHA"',
  'PARENT_ARGS=(-p "$CANDIDATE_PARENT_SHA")',
  'PARENT_ARGS+=(-p "$TRUSTED_BASE_SHA")',
  'E14_ANCESTRY_PARENT_ADDED',
  'E14_ANCESTRY_ALREADY_CONVERGED',
  'BUNDLE_EXCLUDES=("^$CANDIDATE_PARENT_SHA")',
  'BUNDLE_EXCLUDES+=("^$TRUSTED_BASE_SHA")',
]) assert.ok(workflow.includes(token),`E14 stage workflow missing ${token}`);
assert.equal((workflow.match(/contents: write/g)||[]).length,1,'E14 must not add another repository writer');
assert.ok(!workflow.includes('--force-with-lease') && !workflow.includes('git push --force'),'E14 candidate branch must remain fast-forward only');

const reducerWake=fs.readFileSync('plugins/usage-dashboard/tools/reducer_wake_e13.sh','utf8');
assert.ok(reducerWake.includes('stage|validation'),'E14 must preserve the E13 canonical wake callers');
assert.ok(reducerWake.includes('"ref":"main"'),'E14 must preserve authority-free reducer wake payload');

const design=fs.readFileSync('docs/USAGE_DASHBOARD_PR_LIFECYCLE_E14_ANCESTRY_CONVERGENCE_DESIGN.md','utf8');
assert.match(design,/One conditional parent rule, strict verification, existing authority boundaries unchanged/);

console.log(`usage-dashboard E14 ancestry convergence contract: OK · ${release.productVersion} · conditional one/two-parent DAG convergence + fail-closed verification + E13 authority boundaries preserved`);
