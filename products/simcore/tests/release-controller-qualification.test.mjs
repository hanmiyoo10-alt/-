#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { authorizeRelease } from '../tooling/release-authority.mjs';
import { runPublish } from '../tooling/release-publish.mjs';

function run(cwd, cmd, ...args) { return execFileSync(cmd,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(); }
function git(cwd,...args){ return run(cwd,'git',...args); }
function write(root,rel,text){ const p=path.join(root,rel); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,text,'utf8'); }
function plugin(version,name,mark=''){ return `//@version ${version}\n//@release ${name}\nconst SIMCORE_RS24E=${JSON.stringify(mark||version)};\n`; }
function writePlugin(root,version,name,mark=''){ const s=plugin(version,name,mark); write(root,'plugins/simcore/latest.js',s); write(root,'plugins/simcore/install.js',s); }
function commit(root,msg,...paths){ git(root,'add','--',...paths); git(root,'commit','-m',msg); return git(root,'rev-parse','HEAD'); }
function all(root,msg){ git(root,'add','.'); git(root,'commit','-m',msg); return git(root,'rev-parse','HEAD'); }
function blob(root,commit){ return git(root,'rev-parse',`${commit}:plugins/simcore/latest.js`); }
function expectCode(fn,code){ let got=''; try{fn();}catch(e){got=e.code||'';} if(got!==code) throw new Error(`expected ${code}, got ${got||'NO_ERROR'}`); }
function within(root,fn){ const prev=process.cwd(); process.chdir(root); try{return fn();} finally{process.chdir(prev);} }
const VERIFIER='f'.repeat(40);

function report(spec, overrides={}) {
  return {
    schemaVersion:1,profile:'CANDIDATE_REQUIRED',conclusion:'PASS',reasonCodes:[],verifierCommit:VERIFIER,
    productionCommit:spec.expectedProductionCommit,candidateCommit:spec.candidateCommit,
    expectedProductionCommit:spec.expectedProductionCommit,candidateRequiredAuthority:'RS2_4_RELEASE',
    gates:[],...overrides,
  };
}
function makeSpec({id,version,name,mode,candidate,parent,releaseBlob,rollback}){
  const x={schemaVersion:1,releaseId:id,product:'SimCore',version,releaseName:name,releaseMode:mode,candidateCommit:candidate,expectedProductionCommit:parent,candidateReleaseBlob:releaseBlob,primaryGoalId:'RS2_4E_QUALIFICATION',changeClass:mode==='ROLLBACK'?'ROLLBACK':mode==='SAME_VERSION_CORRECTION'?'RUNTIME_CORRECTION':'RUNTIME_FEATURE',evidenceRefs:['docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4E_QUALIFICATION_EVIDENCE.md'],liveGate:{required:false,scenarioId:'RS2_4E_SANDBOX',closeAuthority:'NOT_REQUIRED'}};
  if(rollback)x.rollback=rollback;
  return x;
}
function initRepo(base,name){
  const root=path.join(base,name), remote=path.join(base,`${name}.git`); fs.mkdirSync(root);
  git(root,'init','-b','main'); git(root,'config','user.name','RS2-4E Test'); git(root,'config','user.email','test@example.invalid');
  run(base,'git','init','--bare',remote); git(root,'remote','add','origin',remote); return {root,remote};
}
function authorizeSpec(root,spec){
  const rel=`products/simcore/releases/specs/${spec.releaseId}.json`; write(root,rel,`${JSON.stringify(spec)}\n`); const A=commit(root,'authorize release',rel); const rp='.ci-report.json'; write(root,rp,`${JSON.stringify(report(spec))}\n`); return {rel,A,rp};
}
function pushProduction(root,P){ git(root,'push','origin',`${P}:refs/heads/release-simcore`); }

function positiveNew(base){
  const {root}=initRepo(base,'p2-new'); writePlugin(root,'0.64.6','Production','p'); const P=all(root,'production'); pushProduction(root,P);
  writePlugin(root,'0.64.7','Reload Cache Continuity','new'); const C=commit(root,'candidate','plugins/simcore/latest.js','plugins/simcore/install.js');
  const spec=makeSpec({id:'simcore-v0.64.7-new-01',version:'0.64.7',name:'Reload Cache Continuity',mode:'NEW_VERSION',candidate:C,parent:P,releaseBlob:blob(root,C)});
  const {rel,A,rp}=authorizeSpec(root,spec); return within(root,()=>{ const dry=runPublish({specPath:rel,ciReportPath:rp,authorizationCommit:A,expectedVerifierCommit:VERIFIER,remote:'origin',mode:'dry-run'}); if(dry.publicationDisposition!=='WOULD_PUBLISH')throw new Error('P2 dry');
  const pub=runPublish({specPath:rel,ciReportPath:rp,authorizationCommit:A,expectedVerifierCommit:VERIFIER,remote:'origin',mode:'publish'}); if(pub.after!==C||pub.productionMutation!=='FAST_FORWARD')throw new Error('P2 publish'); return {root,P,C,spec,rel,A,rp}; });
}
function positiveCorrection(base){
  const {root}=initRepo(base,'p3-correction'); writePlugin(root,'0.64.6','Production','p'); const P=all(root,'production'); pushProduction(root,P);
  writePlugin(root,'0.64.6','Production','correction'); const C=commit(root,'candidate','plugins/simcore/latest.js','plugins/simcore/install.js');
  const spec=makeSpec({id:'simcore-v0.64.6-correction-01',version:'0.64.6',name:'Production',mode:'SAME_VERSION_CORRECTION',candidate:C,parent:P,releaseBlob:blob(root,C)});
  const {rel,A,rp}=authorizeSpec(root,spec); within(root,()=>{ const pub=runPublish({specPath:rel,ciReportPath:rp,authorizationCommit:A,expectedVerifierCommit:VERIFIER,remote:'origin',mode:'publish'}); if(pub.after!==C)throw new Error('P3 publish'); });
}
function positiveRollback(base){
  const {root}=initRepo(base,'r1-rollback'); writePlugin(root,'0.64.5','Safe','safe'); const S=all(root,'safe');
  writePlugin(root,'0.64.6','Bad','bad'); const P=commit(root,'bad production','plugins/simcore/latest.js','plugins/simcore/install.js'); pushProduction(root,P);
  writePlugin(root,'0.64.5','Safe','safe'); const C=commit(root,'rollback candidate','plugins/simcore/latest.js','plugins/simcore/install.js'); const safeBlob=blob(root,S);
  const spec=makeSpec({id:'simcore-v0.64.5-rollback-01',version:'0.64.5',name:'Safe',mode:'ROLLBACK',candidate:C,parent:P,releaseBlob:blob(root,C),rollback:{approvedSafeCommit:S,approvedSafeBlob:safeBlob,reasonCode:'SANDBOX_REHEARSAL'}});
  const {rel,A,rp}=authorizeSpec(root,spec); within(root,()=>{ const pub=runPublish({specPath:rel,ciReportPath:rp,authorizationCommit:A,expectedVerifierCommit:VERIFIER,remote:'origin',mode:'publish'}); if(pub.after!==C||blob(root,C)!==safeBlob)throw new Error('R1 publish'); });
}
function authorityNegatives(base){
  const {root}=initRepo(base,'authority-neg'); writePlugin(root,'0.64.6','Production','p'); const P=all(root,'production'); pushProduction(root,P); writePlugin(root,'0.64.7','Next','n'); const C=commit(root,'candidate','plugins/simcore/latest.js','plugins/simcore/install.js');
  const spec=makeSpec({id:'simcore-v0.64.7-new-02',version:'0.64.7',name:'Next',mode:'NEW_VERSION',candidate:C,parent:P,releaseBlob:blob(root,C)}); const {rel,A}=authorizeSpec(root,spec); const good=report(spec);
  within(root,()=>{ const ok=authorizeRelease({spec,specPath:rel,ciReport:good,currentProductionCommit:P,expectedVerifierCommit:VERIFIER,authorizationCommit:A}); if(ok.decision!=='AUTHORIZED_PUBLISH')throw new Error('E-A1');
  expectCode(()=>authorizeRelease({spec,specPath:rel,ciReport:null,currentProductionCommit:P,expectedVerifierCommit:VERIFIER,authorizationCommit:A}),'REQUIRED_REPORT_MISSING');
  expectCode(()=>authorizeRelease({spec,specPath:rel,ciReport:report(spec,{conclusion:'FAIL'}),currentProductionCommit:P,expectedVerifierCommit:VERIFIER,authorizationCommit:A}),'REQUIRED_REPORT_NOT_PASS');
  expectCode(()=>authorizeRelease({spec,specPath:rel,ciReport:report(spec,{candidateCommit:'1'.repeat(40)}),currentProductionCommit:P,expectedVerifierCommit:VERIFIER,authorizationCommit:A}),'REQUIRED_REPORT_CANDIDATE_MISMATCH');
  expectCode(()=>authorizeRelease({spec,specPath:rel,ciReport:good,currentProductionCommit:'2'.repeat(40),expectedVerifierCommit:VERIFIER,authorizationCommit:A}),'PRODUCTION_PARENT_MOVED');
  expectCode(()=>authorizeRelease({spec,specPath:rel,ciReport:report(spec,{candidateRequiredAuthority:'RS2_4_SHADOW'}),currentProductionCommit:P,expectedVerifierCommit:VERIFIER,authorizationCommit:A}),'REQUIRED_REPORT_AUTHORITY_MISMATCH');
  expectCode(()=>authorizeRelease({spec,specPath:rel,ciReport:good,currentProductionCommit:P,expectedVerifierCommit:'3'.repeat(40),authorizationCommit:A}),'REQUIRED_REPORT_VERIFIER_MISMATCH'); });
}
function semanticNegatives(base){
  { const {root}=initRepo(base,'n3-path'); writePlugin(root,'0.64.6','Production'); const P=all(root,'p'); writePlugin(root,'0.64.7','Next'); write(root,'extra.txt','x\n'); const C=all(root,'bad'); const spec=makeSpec({id:'simcore-v0.64.7-new-03',version:'0.64.7',name:'Next',mode:'NEW_VERSION',candidate:C,parent:P,releaseBlob:blob(root,C)}); within(root,()=>expectCode(()=>authorizeRelease({spec,specPath:`products/simcore/releases/specs/${spec.releaseId}.json`,ciReport:report(spec),currentProductionCommit:P,expectedVerifierCommit:VERIFIER}),'CANDIDATE_PATH_SCOPE_INVALID')); }
  { const {root}=initRepo(base,'n4-mismatch'); writePlugin(root,'0.64.6','Production'); const P=all(root,'p'); writePlugin(root,'0.64.7','Next'); write(root,'plugins/simcore/install.js',plugin('0.64.7','Next','other')); const C=all(root,'bad'); const spec=makeSpec({id:'simcore-v0.64.7-new-04',version:'0.64.7',name:'Next',mode:'NEW_VERSION',candidate:C,parent:P,releaseBlob:blob(root,C)}); within(root,()=>expectCode(()=>authorizeRelease({spec,specPath:`products/simcore/releases/specs/${spec.releaseId}.json`,ciReport:report(spec),currentProductionCommit:P,expectedVerifierCommit:VERIFIER}),'CANDIDATE_LATEST_INSTALL_MISMATCH')); }
  { const {root}=initRepo(base,'n8-same'); writePlugin(root,'0.64.6','Production','p'); const P=all(root,'p'); writePlugin(root,'0.64.6','Production','changed'); const C=all(root,'c'); const spec=makeSpec({id:'simcore-v0.64.6-new-05',version:'0.64.6',name:'Production',mode:'NEW_VERSION',candidate:C,parent:P,releaseBlob:blob(root,C)}); within(root,()=>expectCode(()=>authorizeRelease({spec,specPath:`products/simcore/releases/specs/${spec.releaseId}.json`,ciReport:report(spec),currentProductionCommit:P,expectedVerifierCommit:VERIFIER}),'RELEASE_MODE_RELATION_INVALID')); }
  { const {root}=initRepo(base,'n9-down'); writePlugin(root,'0.64.6','Production','p'); const P=all(root,'p'); writePlugin(root,'0.64.5','Old','x'); const C=all(root,'c'); const spec=makeSpec({id:'simcore-v0.64.5-new-06',version:'0.64.5',name:'Old',mode:'NEW_VERSION',candidate:C,parent:P,releaseBlob:blob(root,C)}); within(root,()=>expectCode(()=>authorizeRelease({spec,specPath:`products/simcore/releases/specs/${spec.releaseId}.json`,ciReport:report(spec),currentProductionCommit:P,expectedVerifierCommit:VERIFIER}),'RELEASE_MODE_RELATION_INVALID')); }
}
function authorizationNegatives(base){
  const {root}=initRepo(base,'n6n7-auth'); writePlugin(root,'0.64.6','Production'); const P=all(root,'p'); writePlugin(root,'0.64.7','Next'); const C=all(root,'c');
  const spec=makeSpec({id:'simcore-v0.64.7-new-07',version:'0.64.7',name:'Next',mode:'NEW_VERSION',candidate:C,parent:P,releaseBlob:blob(root,C)}); const rel=`products/simcore/releases/specs/${spec.releaseId}.json`; write(root,rel,`${JSON.stringify(spec)}\n`); const A1=commit(root,'auth1',rel);
  const changed={...spec,releaseName:'Next Changed'}; write(root,rel,`${JSON.stringify(changed)}\n`); const A2=commit(root,'mutate spec',rel);
  within(root,()=>{ expectCode(()=>authorizeRelease({spec:changed,specPath:rel,ciReport:report(changed),currentProductionCommit:P,expectedVerifierCommit:VERIFIER,authorizationCommit:A1}),'RELEASE_AUTHORIZATION_MIXED_COMMIT');
  expectCode(()=>authorizeRelease({spec:changed,specPath:rel,ciReport:report(changed),currentProductionCommit:P,expectedVerifierCommit:VERIFIER,authorizationCommit:A2}),'RELEASE_SPEC_MUTATED_AFTER_AUTHORIZATION'); });
}

const base=fs.mkdtempSync(path.join(os.tmpdir(),'simcore-rs24e-'));
try {
  positiveNew(base); positiveCorrection(base); positiveRollback(base); authorityNegatives(base); semanticNegatives(base); authorizationNegatives(base);
  const publisher=fs.readFileSync(new URL('../tooling/release-publish.mjs',import.meta.url),'utf8');
  if(publisher.includes('--force')||publisher.includes('force-with-lease'))throw new Error('force token forbidden');
  console.log('RS2_4E_CONTROLLER_QUALIFICATION_PASS E-A1-E-A6 P2 P3 R1 N1-N9');
} finally { fs.rmSync(base,{recursive:true,force:true}); }
