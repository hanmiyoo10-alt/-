#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluateShadow } from '../tooling/release-shadow.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const POST = path.join(REPO, 'products/simcore/tooling/post-publish-state-shadow.mjs');
const DECLARE = path.join(REPO, 'products/simcore/tooling/declare-production.mjs');
const SYNC = path.join(REPO, 'products/simcore/tooling/sync-state.mjs');
const MAIN_WRITE = path.join(REPO, 'scripts/repo-main-write.py');

function sh(cwd, command, args, check = true) {
  const r = spawnSync(command, args, { cwd, encoding:'utf8', maxBuffer:1024*1024 });
  if (check && r.status !== 0) throw new Error(`${command} ${args.join(' ')} failed ${r.status}\n${r.stdout}\n${r.stderr}`);
  return r;
}
function git(cwd, ...args) { return sh(cwd, 'git', args); }
function write(root, rel, text) { const p=path.join(root,rel); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,text,'utf8'); }
function writeJson(root, rel, x) { write(root,rel,`${JSON.stringify(x,null,2)}\n`); }
function gitBlob(bytes) { return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'); }
function source(version, name) { return Buffer.from(`//@version ${version}\n// v${version} ${name}:\nconst SIMCORE_SHADOW_FIXTURE = true;\n`); }

function registry() {
  return {
    registryVersion:1,
    targets:[
      {id:'current-development-production-snapshot',path:'docs/CURRENT_DEVELOPMENT.md',blockId:'PRODUCTION_SNAPSHOT',renderer:'current-development-production-snapshot-v1',markerProfile:'canonical-v1',lineEnding:'LF',sourceFields:['product','production_version','release_name','release_branch','release_commit','release_blob','validation_status','major_update_milestone','major_update_phase','major_update_checkpoint']},
      {id:'guidelines-production-baseline',path:'docs/SIMCORE_GUIDELINES.md',blockId:'PRODUCTION_BASELINE',renderer:'guidelines-production-baseline-v1',markerProfile:'canonical-v1',lineEnding:'LF',sourceFields:['production_version','release_name','release_commit']},
    ],
  };
}
function manifest({version='1.0.0', name='Old Release', commit='a'.repeat(40), blob='b'.repeat(40)}={}) {
  return {schema_version:1,product:'SimCore',production_version:version,release_name:name,release_branch:'release-simcore',release_commit:commit,release_blob:blob,production_files:{latest:'plugins/simcore/latest.js',install:'plugins/simcore/install.js',expected_identical:true},validation_status:'PASS',major_update_milestone:'2.0M',major_update_phase:'M2',major_update_checkpoint:'M2-2',current_priority:'UNCHANGED_CONTROL',provider_cache_status:'UNVERIFIED'};
}
function input({releaseId='simcore-v2.0.0-new-01', mode='NEW_VERSION', version='2.0.0', name='New Release', P='a'.repeat(40), C='c'.repeat(40), blob, scenario='RS2_4D_SHADOW'}={}) {
  return {schemaVersion:1,product:'SimCore',releaseId,releaseMode:mode,authorizationCommit:'d'.repeat(40),releaseSpecPath:`products/simcore/releases/specs/${releaseId}.json`,releaseSpecSha256:'e'.repeat(64),productionCommit:C,previousProductionCommit:P,productionBlob:blob,version,releaseName:name,verificationReportSha256:'f'.repeat(64),verifierCommit:'1'.repeat(40),liveScenarioId:scenario,publisherRunId:'shadow-test'};
}
function initFixture(root, opts={}) {
  const oldVersion=opts.oldVersion||'1.0.0', oldName=opts.oldName||'Old Release', P=opts.P||'a'.repeat(40);
  const newVersion=opts.newVersion||'2.0.0', newName=opts.newName||'New Release', C=opts.C||'c'.repeat(40);
  const bytes=source(newVersion,newName), blob=gitBlob(bytes);
  writeJson(root,'product-manifest.json',manifest({version:oldVersion,name:oldName,commit:P,blob:'b'.repeat(40)}));
  write(root,'docs/CURRENT_DEVELOPMENT.md','before\n<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->\nstale\n<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->\nafter\n');
  write(root,'docs/SIMCORE_GUIDELINES.md','before\n<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:BEGIN -->\nstale\n<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:END -->\nafter\n');
  writeJson(root,'products/simcore/state-sync/target-registry.json',registry());
  writeJson(root,'products/simcore/state-sync/writer-policy.json',{policyVersion:1,cutoverState:'CANONICAL_ACTIVE',surfaces:{legacyScript:'scripts/simcore-sync-memory.py',stateSyncWorkflow:'.github/workflows/simcore-release-state-sync.yml',mainWriter:'scripts/repo-main-write.py'},requirements:{legacyOrdinaryMode:'manifest-only',legacyFullMode:'rollback-only',implicitLegacyFullForbidden:true,documentOwner:'sync-state',mainIntegration:'repo-main-write.py',directMainPushForbidden:true}});
  write(root,'scripts/simcore-sync-memory.py','# --manifest-only\n# --legacy-full\n# explicit mode required\n');
  write(root,'.github/workflows/simcore-release-state-sync.yml','simcore-sync-memory.py --manifest-only\nsync-state.mjs\nrepo-main-write.py\n');
  write(root,'.shadow-production/latest.js',bytes.toString('utf8'));
  write(root,'.shadow-production/install.js',bytes.toString('utf8'));
  const releaseId=opts.releaseId||({NEW_VERSION:`simcore-v${newVersion}-new-01`,SAME_VERSION_CORRECTION:`simcore-v${newVersion}-correction-01`,ROLLBACK:`simcore-v${newVersion}-rollback-01`}[opts.mode||'NEW_VERSION']);
  const i=input({releaseId,mode:opts.mode||'NEW_VERSION',version:newVersion,name:newName,P,C,blob});
  writeJson(root,'.shadow-input.json',i);
  writeJson(root,'.shadow-identity.json',{schemaVersion:1,product:'SimCore',resolvedBranch:'release-simcore',resolvedCommit:C,latest:{path:'.shadow-production/latest.js',blob},install:{path:'.shadow-production/install.js',blob}});
  return {P,C,blob,input:i};
}
function runPost(root, check=true) {
  return sh(root,process.execPath,[POST,'--root','.', '--input','.shadow-input.json','--production-identity','.shadow-identity.json','--probes','NONE','--report','.simcore-release/post-publish-report.json'],check);
}
function readJson(root, rel) { return JSON.parse(fs.readFileSync(path.join(root,rel),'utf8')); }
function initGit(root, remote) {
  git(root,'init','-b','main'); git(root,'config','user.name','test'); git(root,'config','user.email','test@example.com');
  git(root,'add','.'); git(root,'commit','-m','baseline');
  sh(path.dirname(remote),'git',['init','--bare',remote]);
  git(root,'remote','add','origin',remote); git(root,'push','-u','origin','main');
  sh(remote,'git',['symbolic-ref','HEAD','refs/heads/main']);
}
function commitPayload(root, releaseId) {
  const paths=['product-manifest.json','docs/CURRENT_DEVELOPMENT.md','docs/SIMCORE_GUIDELINES.md',`products/simcore/releases/records/${releaseId}.json`];
  git(root,'add','--',...paths); git(root,'commit','-m','shadow state payload'); return {sha:git(root,'rev-parse','HEAD').stdout.trim(),paths};
}

function testS1AndMainReplay(base) {
  const root=path.join(base,'s1'); fs.mkdirSync(root); const f=initFixture(root); const remote=path.join(base,'s1-remote.git'); initGit(root,remote);
  const r=runPost(root); if (r.status!==0) throw new Error(r.stderr);
  const report=readJson(root,'.simcore-release/post-publish-report.json');
  const expected=['product-manifest.json','docs/CURRENT_DEVELOPMENT.md','docs/SIMCORE_GUIDELINES.md',`products/simcore/releases/records/${f.input.releaseId}.json`];
  if (JSON.stringify(report.changedPaths)!==JSON.stringify(expected)) throw new Error(`S1 paths ${JSON.stringify(report.changedPaths)}`);
  const rec=readJson(root,`products/simcore/releases/records/${f.input.releaseId}.json`); if(rec.releaseState!=='LIVE_PENDING'||rec.stateSyncStatus!=='PASS') throw new Error('S1 record');
  const p=commitPayload(root,f.input.releaseId);
  const mw=sh(root,'python3',[MAIN_WRITE,'--commit',p.sha,...p.paths.flatMap(x=>['--allow',x]),'--attempts','3']); if(mw.status!==0) throw new Error(mw.stderr);
  const fresh=path.join(base,'s1-fresh'); sh(base,'git',['clone',remote,fresh]);
  const c=sh(fresh,process.execPath,[SYNC,'--check','--root','.', '--manifest','product-manifest.json','--production-identity','.shadow-identity.json','--targets','products/simcore/state-sync/target-registry.json','--writer-policy','products/simcore/state-sync/writer-policy.json']);
  if(c.status!==0) throw new Error(`S1 fresh check ${c.stdout}\n${c.stderr}`);
}
function testS2ExpectedParentMismatch() {
  const spec={schemaVersion:1,releaseId:'simcore-v2.0.0-new-01',product:'SimCore',version:'2.0.0',releaseName:'New',releaseMode:'NEW_VERSION',candidateCommit:'c'.repeat(40),expectedProductionCommit:'a'.repeat(40),candidateReleaseBlob:'b'.repeat(40),primaryGoalId:'x',changeClass:'RUNTIME_FEATURE',evidenceRefs:[],liveGate:{required:true,scenarioId:'x',closeAuthority:'HUMAN_EVIDENCE'}};
  let ok=false; try{evaluateShadow({spec,specPath:'products/simcore/releases/specs/simcore-v2.0.0-new-01.json',currentProductionCommit:'9'.repeat(40)});}catch(e){ok=e.code==='PRODUCTION_PARENT_MOVED';} if(!ok) throw new Error('S2');
}
function testS3LatestInstallDivergence(base) {
  const root=path.join(base,'s3'); fs.mkdirSync(root); initFixture(root); write(root,'.shadow-production/install.js','diverged\n');
  const r=runPost(root,false); if(r.status===0||!r.stderr.includes('PUBLISHED_IDENTITY_NOT_OBSERVED')) throw new Error(`S3 ${r.stderr}`);
  if(readJson(root,'product-manifest.json').release_commit!=='a'.repeat(40)) throw new Error('S3 mutated manifest before preflight');
}
function testS4DuplicateAlreadyPromoted(base) {
  const root=path.join(base,'s4'); fs.mkdirSync(root); initFixture(root); runPost(root); runPost(root); const r=readJson(root,'.simcore-release/post-publish-report.json'); if(r.disposition!=='ADMIN_STATE_ALREADY_SYNCED'||r.changedPaths.length!==0) throw new Error('S4');
}
function testS5NewerReleaseProtection(base) {
  const root=path.join(base,'s5'); fs.mkdirSync(root); initFixture(root); const m=readJson(root,'product-manifest.json'); m.release_commit='9'.repeat(40); writeJson(root,'product-manifest.json',m); const r=runPost(root,false); if(r.status===0||!r.stderr.includes('ADMIN_RECOVERY_RELEASE_SUPERSEDED')) throw new Error(`S5 ${r.stderr}`);
}
function testS6Correction(base) {
  const root=path.join(base,'s6'); fs.mkdirSync(root); initFixture(root,{oldVersion:'1.0.0',oldName:'Stable',newVersion:'1.0.0',newName:'Stable',mode:'SAME_VERSION_CORRECTION'}); runPost(root); if(readJson(root,'product-manifest.json').production_version!=='1.0.0') throw new Error('S6');
}
function testS7Rollback(base) {
  const root=path.join(base,'s7'); fs.mkdirSync(root); initFixture(root,{oldVersion:'2.0.0',oldName:'Newer',newVersion:'1.5.0',newName:'Safe',mode:'ROLLBACK'}); runPost(root); if(readJson(root,'product-manifest.json').production_version!=='1.5.0') throw new Error('S7');
}
function testS8AdminRecovery(base) {
  const root=path.join(base,'s8'); fs.mkdirSync(root); initFixture(root); write(root,'docs/CURRENT_DEVELOPMENT.md','<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->\nbroken\n');
  const first=runPost(root,false); if(first.status===0||!first.stderr.includes('STATE_SYNC_RENDER_FAILED')) throw new Error(`S8 first ${first.stderr}`);
  const m=readJson(root,'product-manifest.json'); if(m.release_commit!=='c'.repeat(40)) throw new Error('S8 production declaration lost');
  write(root,'docs/CURRENT_DEVELOPMENT.md','<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->\nstale\n<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->\n');
  const second=runPost(root); if(second.status!==0) throw new Error(`S8 recovery ${second.stderr}`);
}
function testLegacyResponsibilityMap() {
  const legacy=fs.readFileSync(path.join(REPO,'scripts/simcore-sync-memory.py'),'utf8');
  const state=fs.readFileSync(path.join(REPO,'.github/workflows/simcore-release-state-sync.yml'),'utf8');
  const release=fs.readFileSync(path.join(REPO,'.github/workflows/simcore-release.yml'),'utf8');
  for(const token of ['--manifest-only','--legacy-full','explicit mode required']) if(!legacy.includes(token)) throw new Error(`legacy map ${token}`);
  for(const token of ['sync-state.mjs','repo-main-write.py']) if(!state.includes(token)) throw new Error(`state map ${token}`);
  if(!release.includes('release-shadow.mjs')) throw new Error('release map');
  for(const file of [DECLARE,SYNC,MAIN_WRITE,POST]) if(!fs.existsSync(file)) throw new Error(`permanent owner missing ${file}`);
}

function main() {
  sh(REPO,process.execPath,[DECLARE,'--self-test']);
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'simcore-rs2-4d-'));
  try {
    testS1AndMainReplay(base);
    testS2ExpectedParentMismatch();
    testS3LatestInstallDivergence(base);
    testS4DuplicateAlreadyPromoted(base);
    testS5NewerReleaseProtection(base);
    testS6Correction(base);
    testS7Rollback(base);
    testS8AdminRecovery(base);
    testLegacyResponsibilityMap();
    console.log('RS2_4D_POST_PUBLISH_STATE_SHADOW_TEST_PASS S1-S8');
  } finally { fs.rmSync(base,{recursive:true,force:true}); }
}

main();
