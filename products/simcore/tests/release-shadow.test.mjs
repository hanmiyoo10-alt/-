#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { evaluateShadow } from '../tooling/release-shadow.mjs';

function run(cwd, ...args) { return execFileSync(args[0], args.slice(1), { cwd, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim(); }
function git(cwd, ...args) { return run(cwd, 'git', ...args); }
function writePlugin(cwd, version, releaseName, extra = '') {
  const body = `//@version ${version}\n//@release ${releaseName}\nconst SimCoreRelease = ${JSON.stringify(version)};\n${extra}\n`;
  fs.mkdirSync(path.join(cwd, 'plugins/simcore'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'plugins/simcore/latest.js'), body);
  fs.writeFileSync(path.join(cwd, 'plugins/simcore/install.js'), body);
}
function commitAll(cwd, msg) { git(cwd,'add','.'); git(cwd,'commit','-m',msg); return git(cwd,'rev-parse','HEAD'); }
function specFor(cwd, { id='simcore-v0.65.0-new-01', version='0.65.0', name='Shadow New', mode='NEW_VERSION', candidate, parent, blob, rollback }) {
  const spec = { schemaVersion:1, releaseId:id, product:'SimCore', version, releaseName:name, releaseMode:mode, candidateCommit:candidate, expectedProductionCommit:parent, candidateReleaseBlob:blob, primaryGoalId:'RS2-4-SHADOW', changeClass: mode === 'NOOP_IDENTICAL' ? 'NOOP' : mode === 'ROLLBACK' ? 'ROLLBACK' : 'RUNTIME_FEATURE', evidenceRefs:['docs/RS2_4_SHADOW_TEST.md'], liveGate:{required:false,scenarioId:'SHADOW_ONLY',closeAuthority:'NOT_REQUIRED'} };
  if (rollback) spec.rollback = rollback;
  return { spec, specPath:path.join(cwd,'products/simcore/releases/specs',`${id}.json`) };
}
function expectCode(fn, code) {
  let seen=''; try { fn(); } catch (e) { seen=e.code || ''; }
  if (seen !== code) throw new Error(`expected ${code}, got ${seen || 'NO_ERROR'}`);
}

const originalCwd = process.cwd();
const cwd = fs.mkdtempSync(path.join(os.tmpdir(),'simcore-rs24-'));
try {
  git(cwd,'init'); git(cwd,'config','user.email','test@example.invalid'); git(cwd,'config','user.name','RS2-4 Test');
  process.chdir(cwd);
  writePlugin(cwd,'0.64.6','Production');
  const P = commitAll(cwd,'production');

  writePlugin(cwd,'0.65.0','Shadow New');
  const C = commitAll(cwd,'candidate');
  const L = git(cwd,'rev-parse',`${C}:plugins/simcore/latest.js`);
  let x = specFor(cwd,{candidate:C,parent:P,blob:L});
  let result = evaluateShadow({spec:x.spec,specPath:x.specPath,ciConclusion:'PASS',currentProductionCommit:P});
  if (result.publicationDisposition !== 'WOULD_PUBLISH' || result.productionMutation !== 'NONE') throw new Error('valid candidate disposition');

  expectCode(() => evaluateShadow({spec:x.spec,specPath:x.specPath,ciConclusion:'FAIL',currentProductionCommit:P}), 'CANDIDATE_REQUIRED_FAILED');
  expectCode(() => evaluateShadow({spec:x.spec,specPath:x.specPath,ciConclusion:'PASS',currentProductionCommit:C}), 'PRODUCTION_PARENT_MOVED');

  git(cwd,'checkout','-b','bad-path',P); writePlugin(cwd,'0.65.0','Shadow New'); fs.writeFileSync(path.join(cwd,'README.bad'),'x\n');
  const CBAD = commitAll(cwd,'bad path'); const LBAD = git(cwd,'rev-parse',`${CBAD}:plugins/simcore/latest.js`);
  const badPath = specFor(cwd,{candidate:CBAD,parent:P,blob:LBAD});
  expectCode(() => evaluateShadow({spec:badPath.spec,specPath:badPath.specPath,currentProductionCommit:P}), 'CANDIDATE_PATH_SCOPE_INVALID');

  git(cwd,'checkout','-B','mismatch',P); writePlugin(cwd,'0.65.0','Shadow New'); fs.appendFileSync(path.join(cwd,'plugins/simcore/install.js'),'// mismatch\n');
  const CMIS = commitAll(cwd,'mismatch'); const LMIS = git(cwd,'rev-parse',`${CMIS}:plugins/simcore/latest.js`);
  const mismatch = specFor(cwd,{candidate:CMIS,parent:P,blob:LMIS});
  expectCode(() => evaluateShadow({spec:mismatch.spec,specPath:mismatch.specPath,currentProductionCommit:P}), 'CANDIDATE_LATEST_INSTALL_MISMATCH');

  git(cwd,'checkout','-B','intermediate',P); fs.writeFileSync(path.join(cwd,'note'),'n\n'); commitAll(cwd,'intermediate'); writePlugin(cwd,'0.65.0','Shadow New'); const CNON = commitAll(cwd,'non-child'); const LNON = git(cwd,'rev-parse',`${CNON}:plugins/simcore/latest.js`);
  const nonChild = specFor(cwd,{candidate:CNON,parent:P,blob:LNON});
  expectCode(() => evaluateShadow({spec:nonChild.spec,specPath:nonChild.specPath,currentProductionCommit:P}), 'CANDIDATE_PARENT_INVALID');

  git(cwd,'checkout','-B','noop',P); git(cwd,'commit','--allow-empty','-m','noop child'); const CNOOP=git(cwd,'rev-parse','HEAD'); const LNOOP=git(cwd,'rev-parse',`${CNOOP}:plugins/simcore/latest.js`);
  const noop=specFor(cwd,{id:'simcore-v0.64.6-noop-01',version:'0.64.6',name:'Production',mode:'NOOP_IDENTICAL',candidate:CNOOP,parent:P,blob:LNOOP});
  result=evaluateShadow({spec:noop.spec,specPath:noop.specPath,currentProductionCommit:P});
  if(result.publicationDisposition!=='WOULD_NOOP') throw new Error('noop disposition');

  console.log('RS2_4_SHADOW_TESTS_PASS');
} finally {
  process.chdir(originalCwd);
  fs.rmSync(cwd,{recursive:true,force:true});
}
