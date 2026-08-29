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
const PREPLAY = path.join(REPO, 'products/simcore/tooling/release-state-preplay.mjs');
const MAIN_GATE = path.join(REPO, 'products/simcore/tooling/release-state-main-gate.mjs');
const REOBSERVE = path.join(REPO, 'products/simcore/tooling/release-state-reobserve.mjs');
const RECOVERY_WORKFLOW = path.join(REPO, '.github/workflows/simcore-release-state-sync.yml');
const PERMANENT_WORKFLOW = path.join(REPO, '.github/workflows/simcore-release-permanent.yml');

function sh(cwd, command, args, check = true) {
  const r = spawnSync(command, args, { cwd, encoding:'utf8', maxBuffer:4*1024*1024 });
  if (check && r.status !== 0) throw new Error(`${command} ${args.join(' ')} failed ${r.status}\n${r.stdout}\n${r.stderr}`);
  return r;
}
function write(root, rel, text) { const p=path.join(root,rel); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,text,'utf8'); }
function writeJson(root, rel, x) { write(root,rel,`${JSON.stringify(x,null,2)}\n`); }
function readJson(root, rel) { return JSON.parse(fs.readFileSync(path.join(root,rel),'utf8')); }
function gitBlob(bytes) { return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'); }
function source(version, name) { return Buffer.from(`//@version ${version}\n// v${version} ${name}:\nconst SIMCORE_PERMANENT_FIXTURE = true;\n`); }
function count(text, token) { return text.split(token).length - 1; }

function registry() {
  return {
    registryVersion:1,
    targets:[
      {id:'current-development-production-snapshot',path:'docs/CURRENT_DEVELOPMENT.md',blockId:'PRODUCTION_SNAPSHOT',renderer:'current-development-production-snapshot-v1',markerProfile:'canonical-v1',lineEnding:'LF',sourceFields:['product','production_version','release_name','release_branch','release_commit','release_blob','validation_status','major_update_milestone','major_update_phase','major_update_checkpoint']},
      {id:'guidelines-production-baseline',path:'docs/SIMCORE_GUIDELINES.md',blockId:'PRODUCTION_BASELINE',renderer:'guidelines-production-baseline-v1',markerProfile:'canonical-v1',lineEnding:'LF',sourceFields:['production_version','release_name','release_commit']},
    ],
  };
}
function policy() {
  return {
    policyVersion:2,
    cutoverState:'CANONICAL_ACTIVE',
    surfaces:{legacyScript:'scripts/simcore-sync-memory.py',stateSyncWorkflow:'.github/workflows/simcore-release-state-sync.yml',mainWriter:'scripts/repo-main-write.py'},
    requirements:{legacyOrdinaryMode:'manifest-only',legacyFullMode:'rollback-only',implicitLegacyFullForbidden:true,documentOwner:'sync-state',mainIntegration:'repo-main-write.py',directMainPushForbidden:true},
    postPublishState:{
      exactPaths:['product-manifest.json','docs/CURRENT_DEVELOPMENT.md','docs/SIMCORE_GUIDELINES.md'],
      prefixPaths:['products/simcore/releases/records/','products/simcore/releases/state-receipts/'],
      mainGateway:'scripts/repo-main-write.py',requiredWorkflow:'simcore-ci.yml',requiredProfile:'MAIN_HEALTH',requiredJob:'Required',
    },
  };
}
function manifest({version='1.0.0', name='Old Release', commit='a'.repeat(40), blob='b'.repeat(40)}={}) {
  return {schema_version:1,product:'SimCore',production_version:version,release_name:name,release_branch:'release-simcore',release_commit:commit,release_blob:blob,production_files:{latest:'plugins/simcore/latest.js',install:'plugins/simcore/install.js',expected_identical:true},validation_status:'LIVE_PASS',major_update_milestone:'2.0M',major_update_phase:'M2',major_update_checkpoint:'M2-4',current_priority:'M2_5_POST_06600_TRANSITION_DEBT_REVIEW',provider_cache_status:'UNVERIFIED'};
}
function input({releaseId='simcore-v2.0.0-new-01', mode='NEW_VERSION', version='2.0.0', name='New Release', P='a'.repeat(40), C='c'.repeat(40), blob}={}) {
  return {schemaVersion:1,product:'SimCore',releaseId,releaseMode:mode,authorizationCommit:'d'.repeat(40),releaseSpecPath:`products/simcore/releases/specs/${releaseId}.json`,releaseSpecSha256:'e'.repeat(64),productionCommit:C,previousProductionCommit:P,productionBlob:blob,version,releaseName:name,verificationReportSha256:'f'.repeat(64),verifierCommit:'1'.repeat(40),liveScenarioId:'RS2_6_PERMANENT_TEST',publisherRunId:'260829'};
}
function currentDevelopment(P) {
  return [
    '# SimCore Current Development Memory','',
    '<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->','stale','<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->','',
    '<!-- SIMCORE_RELEASE_STATE:LIVE_PASS:BEGIN -->','## Current Release Terminal State','',
    '- Release transaction: `simcore-v1.0.0-new-01`',`- Production commit: \`${P}\``,'- Validation status: `LIVE_PASS`','- R lifecycle: `REAL_RELEASE_LIVE_PASS`',
    '<!-- SIMCORE_RELEASE_STATE:LIVE_PASS:END -->','',
    '# 1. Current Operational State','',
    '## How to read current operational state','',
    'The current product live gate is closed with accepted human evidence. Runtime work remains separately authorized.','',
    '## Historical validated precursor — fixture','historical only','',
    '# 2. Fixture','',
  ].join('\n');
}
function initFixture(root, opts={}) {
  const P=opts.P||'a'.repeat(40), C=opts.C||'c'.repeat(40);
  const newVersion=opts.newVersion||'2.0.0', newName=opts.newName||'New Release';
  const bytes=source(newVersion,newName), blob=gitBlob(bytes);
  writeJson(root,'product-manifest.json',manifest({commit:P}));
  write(root,'docs/CURRENT_DEVELOPMENT.md',currentDevelopment(P));
  write(root,'docs/SIMCORE_GUIDELINES.md','before\n<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:BEGIN -->\nstale\n<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:END -->\nafter\n');
  writeJson(root,'products/simcore/state-sync/target-registry.json',registry());
  writeJson(root,'products/simcore/state-sync/writer-policy.json',policy());
  write(root,'scripts/simcore-sync-memory.py','# --manifest-only\n# --legacy-full\n# explicit mode required\n');
  write(root,'.github/workflows/simcore-release-state-sync.yml','simcore-sync-memory.py --manifest-only\nsync-state.mjs\nrepo-main-write.py\n');
  write(root,'.published/latest.js',bytes.toString('utf8'));
  write(root,'.published/install.js',bytes.toString('utf8'));
  const releaseId=opts.releaseId||`simcore-v${newVersion}-new-01`;
  const i=input({releaseId,version:newVersion,name:newName,P,C,blob});
  writeJson(root,'.input.json',i);
  writeJson(root,'.identity.json',{schemaVersion:1,product:'SimCore',resolvedBranch:'release-simcore',resolvedCommit:C,latest:{path:'.published/latest.js',blob},install:{path:'.published/install.js',blob}});
  return {P,C,blob,input:i};
}
function runPost(root, mode='PERMANENT', check=true) {
  return sh(root,process.execPath,[POST,'--root','.', '--input','.input.json','--production-identity','.identity.json','--probes','NONE','--mode',mode,'--report','.simcore-release/post-publish-report.json'],check);
}

function testPermanentEnvelope(base) {
  const root=path.join(base,'permanent'); fs.mkdirSync(root); const f=initFixture(root);
  runPost(root);
  const r=readJson(root,'.simcore-release/post-publish-report.json');
  if(r.envelopeKind!=='PostPublishStateEnvelope'||r.mode!=='PERMANENT'||r.productionMutation!=='ALREADY_PUBLISHED_UPSTREAM'||r.mainMutation!=='LOCAL_PAYLOAD_PENDING_GATEWAY'||r.lifecycleState!=='LIVE_PENDING'||r.disposition!=='LIVE_PENDING_PAYLOAD_READY') throw new Error(`permanent envelope ${JSON.stringify(r)}`);
  const expected=['product-manifest.json','docs/CURRENT_DEVELOPMENT.md','docs/SIMCORE_GUIDELINES.md',`products/simcore/releases/records/${f.input.releaseId}.json`,`products/simcore/releases/state-receipts/${f.input.releaseId}.json`];
  if(JSON.stringify(r.changedPaths)!==JSON.stringify(expected)) throw new Error(`permanent changed paths ${JSON.stringify(r.changedPaths)}`);
  if(r.persistentPayloadManifest.length!==5||r.persistentPayloadManifest.some((x)=>!x.sha256||x.required!==true)) throw new Error('persistent payload manifest incomplete');
}
function testPrepublicationSimulation(base) {
  const root=path.join(base,'preplay'); fs.mkdirSync(root); const f=initFixture(root);
  const r=sh(root,process.execPath,[PREPLAY,'--root','.', '--input','.input.json','--production-identity','.identity.json','--writer-policy','products/simcore/state-sync/writer-policy.json','--probes','NONE','--report','.simcore-release/preplay-report.json']);
  if(r.status!==0) throw new Error(`preplay failed ${r.stderr}`);
  const p=readJson(root,'.simcore-release/preplay-report.json');
  if(p.result!=='RS2_6_POST_PUBLISH_PREPLAY_PASS'||p.productionMutation!=='NONE'||p.publicationDispatch!=='BLOCKED_UNTIL_PREPLAY_PASS') throw new Error(`preplay report ${JSON.stringify(p)}`);
  const receipt=readJson(root,`products/simcore/releases/state-receipts/${f.input.releaseId}.json`);
  if(receipt.productionMutation!=='NONE') throw new Error('preplay receipt acquired publication truth');
}
function testIdempotentRecovery(base) {
  const root=path.join(base,'recovery'); fs.mkdirSync(root); initFixture(root); runPost(root,'RECOVERY'); runPost(root,'RECOVERY');
  const r=readJson(root,'.simcore-release/post-publish-report.json');
  if(r.mode!=='RECOVERY'||r.disposition!=='ALREADY_CONVERGED'||r.mainMutation!=='NONE'||r.changedPaths.length!==0) throw new Error(`recovery ${JSON.stringify(r)}`);
}
function testObservedIdentityMismatch(base) {
  const root=path.join(base,'identity'); fs.mkdirSync(root); initFixture(root); write(root,'.published/install.js','diverged\n');
  const r=runPost(root,'PERMANENT',false);
  if(r.status===0||!r.stderr.includes('PUBLISHED_IDENTITY_NOT_OBSERVED')) throw new Error(`identity mismatch ${r.stderr}`);
}
function testNewerReleaseProtection(base) {
  const root=path.join(base,'superseded'); fs.mkdirSync(root); initFixture(root); const m=readJson(root,'product-manifest.json'); m.release_commit='9'.repeat(40); writeJson(root,'product-manifest.json',m);
  const r=runPost(root,'PERMANENT',false);
  if(r.status===0||!r.stderr.includes('ADMIN_RECOVERY_RELEASE_SUPERSEDED')) throw new Error(`superseded ${r.stderr}`);
}
function testMarkerMismatch(base) {
  const root=path.join(base,'marker'); fs.mkdirSync(root); initFixture(root);
  write(root,'docs/CURRENT_DEVELOPMENT.md','<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->\nstale\n<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->\n<!-- SIMCORE_RELEASE_STATE:LIVE_PASS:BEGIN -->\nbroken\n<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:END -->\n# 1. Current Operational State\n## How to read current operational state\nidentity free\n## Historical validated precursor\nx\n# 2. fixture\n');
  const r=runPost(root,'PERMANENT',false);
  if(r.status===0||!r.stderr.includes('LIVE_PENDING_DOC_MARKER_INVALID')) throw new Error(`marker mismatch ${r.stderr}`);
}
function testSharedWorkflowBoundaryStatic() {
  const permanent=fs.readFileSync(PERMANENT_WORKFLOW,'utf8');
  const recovery=fs.readFileSync(RECOVERY_WORKFLOW,'utf8');
  if(permanent.indexOf('Preplay post-publish state before publication')<0||permanent.indexOf('Preplay post-publish state before publication')>permanent.indexOf('Publish through permanent controller')) throw new Error('preplay not before publish');
  if(count(permanent,'release-publish.mjs')!==1) throw new Error('publisher count changed');
  for(const token of ['release-state-main-gate.mjs','release-state-reobserve.mjs','--mode PERMANENT']) if(!permanent.includes(token)) throw new Error(`permanent shared boundary missing ${token}`);
  for(const token of ['release-state-main-gate.mjs','release-state-reobserve.mjs','--mode RECOVERY']) if(!recovery.includes(token)) throw new Error(`recovery shared boundary missing ${token}`);
  for(const workflow of [permanent,recovery]) for(const token of ['persistentPayloadAllowlist',"assert p['disposition']",'--allow product-manifest.json','durable-receipt.json']) if(workflow.includes(token)) throw new Error(`workflow duplicate survived ${token}`);
}
function testAuthorityStatic() {
  const preplay=fs.readFileSync(PREPLAY,'utf8');
  const gate=fs.readFileSync(MAIN_GATE,'utf8');
  const reobserve=fs.readFileSync(REOBSERVE,'utf8');
  for(const token of ['release-publish.mjs','repo-main-write.py','git push','fetch(','api.github.com']) if(preplay.includes(token)) throw new Error(`preplay authority violation ${token}`);
  for(const token of ['release-publish.mjs','force-with-lease','+refs/heads/release-simcore']) if(gate.includes(token)) throw new Error(`main gate publisher violation ${token}`);
  for(const token of ['repo-main-write.py','release-publish.mjs','spawnSync','git push','fetch(','api.github.com']) if(reobserve.includes(token)) throw new Error(`reobserver authority violation ${token}`);
}

function main() {
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'simcore-r2-6-post-'));
  try {
    testPermanentEnvelope(base);
    testPrepublicationSimulation(base);
    testIdempotentRecovery(base);
    testObservedIdentityMismatch(base);
    testNewerReleaseProtection(base);
    testMarkerMismatch(base);
    testSharedWorkflowBoundaryStatic();
    testAuthorityStatic();
    console.log('RS2_6_POST_PUBLISH_BOUNDARY_TEST_PASS ENVELOPE + PREPLAY + SHARED_GATE + SHARED_REOBSERVE + RECOVERY_PARITY');
  } finally { fs.rmSync(base,{recursive:true,force:true}); }
}

main();
