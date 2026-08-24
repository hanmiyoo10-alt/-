#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const POST = path.join(REPO, 'products/simcore/tooling/post-publish-state.mjs');

function sh(cwd, command, args, check = true) {
  const r = spawnSync(command, args, { cwd, encoding:'utf8', maxBuffer:1024*1024 });
  if (check && r.status !== 0) throw new Error(`${command} ${args.join(' ')} failed ${r.status}\n${r.stdout}\n${r.stderr}`);
  return r;
}
function write(root, rel, text) { const p=path.join(root,rel); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,text,'utf8'); }
function writeJson(root, rel, x) { write(root,rel,`${JSON.stringify(x,null,2)}\n`); }
function readJson(root, rel) { return JSON.parse(fs.readFileSync(path.join(root,rel),'utf8')); }
function gitBlob(bytes) { return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'); }
function source(version, name) { return Buffer.from(`//@version ${version}\n// v${version} ${name}:\nconst SIMCORE_PERMANENT_FIXTURE = true;\n`); }

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
  return {schema_version:1,product:'SimCore',production_version:version,release_name:name,release_branch:'release-simcore',release_commit:commit,release_blob:blob,production_files:{latest:'plugins/simcore/latest.js',install:'plugins/simcore/install.js',expected_identical:true},validation_status:'LIVE_PASS',major_update_milestone:'2.0M',major_update_phase:'M2',major_update_checkpoint:'M2-2',current_priority:'UNCHANGED_CONTROL',provider_cache_status:'UNVERIFIED'};
}
function input({releaseId='simcore-v2.0.0-new-01', mode='NEW_VERSION', version='2.0.0', name='New Release', P='a'.repeat(40), C='c'.repeat(40), blob}={}) {
  return {schemaVersion:1,product:'SimCore',releaseId,releaseMode:mode,authorizationCommit:'d'.repeat(40),releaseSpecPath:`products/simcore/releases/specs/${releaseId}.json`,releaseSpecSha256:'e'.repeat(64),productionCommit:C,previousProductionCommit:P,productionBlob:blob,version,releaseName:name,verificationReportSha256:'f'.repeat(64),verifierCommit:'1'.repeat(40),liveScenarioId:'RS2_4_PERMANENT_TEST',publisherRunId:'permanent-test'};
}
function initFixture(root, opts={}) {
  const P=opts.P||'a'.repeat(40), C=opts.C||'c'.repeat(40);
  const oldVersion=opts.oldVersion||'1.0.0', oldName=opts.oldName||'Old Release';
  const newVersion=opts.newVersion||'2.0.0', newName=opts.newName||'New Release';
  const bytes=source(newVersion,newName), blob=gitBlob(bytes);
  writeJson(root,'product-manifest.json',manifest({version:oldVersion,name:oldName,commit:P,blob:'b'.repeat(40)}));
  write(root,'docs/CURRENT_DEVELOPMENT.md','before\n<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->\nstale\n<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->\nafter\n');
  write(root,'docs/SIMCORE_GUIDELINES.md','before\n<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:BEGIN -->\nstale\n<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:END -->\nafter\n');
  writeJson(root,'products/simcore/state-sync/target-registry.json',registry());
  writeJson(root,'products/simcore/state-sync/writer-policy.json',{policyVersion:1,cutoverState:'CANONICAL_ACTIVE',surfaces:{legacyScript:'scripts/simcore-sync-memory.py',stateSyncWorkflow:'.github/workflows/simcore-release-state-sync.yml',mainWriter:'scripts/repo-main-write.py'},requirements:{legacyOrdinaryMode:'manifest-only',legacyFullMode:'rollback-only',implicitLegacyFullForbidden:true,documentOwner:'sync-state',mainIntegration:'repo-main-write.py',directMainPushForbidden:true}});
  write(root,'scripts/simcore-sync-memory.py','# --manifest-only\n# --legacy-full\n# explicit mode required\n');
  write(root,'.github/workflows/simcore-release-state-sync.yml','simcore-sync-memory.py --manifest-only\nsync-state.mjs\nrepo-main-write.py\n');
  write(root,'.published/latest.js',bytes.toString('utf8'));
  write(root,'.published/install.js',bytes.toString('utf8'));
  const releaseId=opts.releaseId||`simcore-v${newVersion}-new-01`;
  const i=input({releaseId,mode:opts.mode||'NEW_VERSION',version:newVersion,name:newName,P,C,blob});
  writeJson(root,'.input.json',i);
  writeJson(root,'.identity.json',{schemaVersion:1,product:'SimCore',resolvedBranch:'release-simcore',resolvedCommit:C,latest:{path:'.published/latest.js',blob},install:{path:'.published/install.js',blob}});
  return {P,C,blob,input:i};
}
function runPost(root, check=true) {
  return sh(root,process.execPath,[POST,'--root','.', '--input','.input.json','--production-identity','.identity.json','--probes','NONE','--report','.simcore-release/post-publish-report.json'],check);
}

function testP1BoundedLivePending(base) {
  const root=path.join(base,'p1'); fs.mkdirSync(root); const f=initFixture(root);
  runPost(root);
  const report=readJson(root,'.simcore-release/post-publish-report.json');
  if(report.releaseAuthority!=='RS2_4_PERMANENT'||report.productionMutation!=='ALREADY_PUBLISHED_UPSTREAM'||report.mainMutation!=='LOCAL_PAYLOAD_PENDING_GATEWAY'||report.lifecycleState!=='LIVE_PENDING') throw new Error(`P1 report ${JSON.stringify(report)}`);
  const expected=['product-manifest.json','docs/CURRENT_DEVELOPMENT.md','docs/SIMCORE_GUIDELINES.md',`products/simcore/releases/records/${f.input.releaseId}.json`];
  if(JSON.stringify(report.changedPaths)!==JSON.stringify(expected)) throw new Error(`P1 paths ${JSON.stringify(report.changedPaths)}`);
  const m=readJson(root,'product-manifest.json');
  if(m.release_commit!==f.C||m.release_blob!==f.blob||m.validation_status!=='PENDING_REAL_LONG_CHAT') throw new Error(`P1 manifest ${JSON.stringify(m)}`);
  const rec=readJson(root,`products/simcore/releases/records/${f.input.releaseId}.json`);
  if(rec.releaseState!=='LIVE_PENDING'||rec.productionTruth!=='PUBLISHED_IDENTITY_VERIFIED'||rec.stateSyncStatus!=='PASS') throw new Error(`P1 record ${JSON.stringify(rec)}`);
}
function testP2ObservedIdentityMismatch(base) {
  const root=path.join(base,'p2'); fs.mkdirSync(root); initFixture(root); write(root,'.published/install.js','diverged\n');
  const r=runPost(root,false);
  if(r.status===0||!r.stderr.includes('PUBLISHED_IDENTITY_NOT_OBSERVED')) throw new Error(`P2 ${r.stderr}`);
  if(readJson(root,'product-manifest.json').release_commit!=='a'.repeat(40)) throw new Error('P2 mutated manifest before production preflight');
}
function testP3IdempotentRecovery(base) {
  const root=path.join(base,'p3'); fs.mkdirSync(root); initFixture(root); runPost(root); runPost(root);
  const r=readJson(root,'.simcore-release/post-publish-report.json');
  if(r.disposition!=='ADMIN_STATE_ALREADY_SYNCED'||r.changedPaths.length!==0) throw new Error(`P3 ${JSON.stringify(r)}`);
}
function testP4NewerReleaseProtection(base) {
  const root=path.join(base,'p4'); fs.mkdirSync(root); initFixture(root); const m=readJson(root,'product-manifest.json'); m.release_commit='9'.repeat(40); writeJson(root,'product-manifest.json',m);
  const r=runPost(root,false);
  if(r.status===0||!r.stderr.includes('ADMIN_RECOVERY_RELEASE_SUPERSEDED')) throw new Error(`P4 ${r.stderr}`);
}
function testP5PublishedTruthSurvivesAdminFailure(base) {
  const root=path.join(base,'p5'); fs.mkdirSync(root); const f=initFixture(root);
  write(root,'docs/CURRENT_DEVELOPMENT.md','<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->\nbroken\n');
  const first=runPost(root,false);
  if(first.status===0||!first.stderr.includes('STATE_SYNC_RENDER_FAILED')) throw new Error(`P5 first ${first.stderr}`);
  const after=readJson(root,'product-manifest.json');
  if(after.release_commit!==f.C||after.validation_status!=='PENDING_REAL_LONG_CHAT') throw new Error(`P5 truth lost ${JSON.stringify(after)}`);
  write(root,'docs/CURRENT_DEVELOPMENT.md','<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->\nstale\n<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->\n');
  const second=runPost(root);
  if(second.status!==0) throw new Error(`P5 recovery ${second.stderr}`);
}

function main() {
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'simcore-rs2-4e-post-'));
  try {
    testP1BoundedLivePending(base);
    testP2ObservedIdentityMismatch(base);
    testP3IdempotentRecovery(base);
    testP4NewerReleaseProtection(base);
    testP5PublishedTruthSurvivesAdminFailure(base);
    console.log('RS2_4E_POST_PUBLISH_STATE_PERMANENT_TEST_PASS P1-P5');
  } finally { fs.rmSync(base,{recursive:true,force:true}); }
}

main();
