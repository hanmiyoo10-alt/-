#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { authorizeRelease } from './release-authority.mjs';

function fail(code, detail = '') {
  const e = new Error(detail ? `${code}: ${detail}` : code);
  e.code = code;
  throw e;
}
function git(...args) { return execFileSync('git', args, { encoding:'utf8', stdio:['ignore','pipe','pipe'] }).trim(); }
function argsOf(argv) {
  const out = {};
  for (let i=2;i<argv.length;i+=1) {
    const a=argv[i];
    if (!a.startsWith('--')) fail('RELEASE_PUBLISH_ARGS_INVALID',a);
    const k=a.slice(2), v=argv[++i];
    if (v==null || v.startsWith('--')) fail('RELEASE_PUBLISH_ARGS_INVALID',k);
    out[k]=v;
  }
  return out;
}
function observed(remote, branch) {
  git('fetch','--no-tags',remote,branch);
  return git('rev-parse','FETCH_HEAD');
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');
}

export function runPublish({specPath, ciReportPath, authorizationCommit, expectedVerifierCommit, remote='origin', branch='release-simcore', mode='dry-run'}) {
  if (!['dry-run','publish'].includes(mode)) fail('RELEASE_PUBLISH_MODE_INVALID');
  const spec=JSON.parse(fs.readFileSync(specPath,'utf8'));
  const ciReport=JSON.parse(fs.readFileSync(ciReportPath,'utf8'));
  const P=observed(remote,branch);
  const authority=authorizeRelease({
    spec,specPath,ciReport,currentProductionCommit:P,expectedVerifierCommit,
    requiredAuthority:'RS2_4_RELEASE',authorizationCommit,
  });
  if (mode==='dry-run') {
    return {schemaVersion:1,releaseAuthority:'RS2_4_PERMANENT',mode:'DRY_RUN',publicationDisposition:authority.decision==='AUTHORIZED_NOOP'?'WOULD_NOOP':'WOULD_PUBLISH',productionMutation:'NONE',authority};
  }
  if (authority.decision==='AUTHORIZED_NOOP') {
    return {schemaVersion:1,releaseAuthority:'RS2_4_PERMANENT',mode:'PUBLISH',publicationDisposition:'NOOP',productionMutation:'NONE',before:P,after:P,authority};
  }
  const rechecked=observed(remote,branch);
  if (rechecked!==P) fail('PRODUCTION_PARENT_MOVED_AFTER_REQUIRED',`${P} -> ${rechecked}`);
  try { git('push',remote,`${spec.candidateCommit}:refs/heads/${branch}`); }
  catch (e) { fail('RELEASE_FAST_FORWARD_PUSH_FAILED',String(e?.stderr || e?.message || '')); }
  const after=observed(remote,branch);
  if (after!==spec.candidateCommit) fail('RELEASE_POST_PUBLISH_IDENTITY_MISMATCH',`${after} != ${spec.candidateCommit}`);
  return {schemaVersion:1,releaseAuthority:'RS2_4_PERMANENT',mode:'PUBLISH',publicationDisposition:'PUBLISHED',productionMutation:'FAST_FORWARD',before:P,after,authority};
}

if (import.meta.url===`file://${process.argv[1]}`) {
  try {
    const a=argsOf(process.argv);
    for(const k of ['spec','ci-report','authorization-commit','expected-verifier','report']) if(!a[k]) fail('RELEASE_PUBLISH_ARGS_INVALID',k);
    const result=runPublish({specPath:a.spec,ciReportPath:a['ci-report'],authorizationCommit:a['authorization-commit'],expectedVerifierCommit:a['expected-verifier'],remote:a.remote||'origin',branch:a.branch||'release-simcore',mode:a.mode||'dry-run'});
    writeJson(a.report,result);
    console.log(JSON.stringify({publicationDisposition:result.publicationDisposition,productionMutation:result.productionMutation}));
  } catch(e) {
    console.error(e.code||'RELEASE_PUBLISH_FAILED',e.message||'');
    process.exit(2);
  }
}
