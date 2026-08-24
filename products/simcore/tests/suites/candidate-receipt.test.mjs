import fs from 'node:fs';
import { assert, equal } from '../../tooling/assertions.mjs';
import { deriveReceipt, deriveSpecShadow, validateReleaseIdentity } from '../../tooling/candidate-receipt.mjs';

function expectCode(fn,code){let got=null;try{fn();}catch(e){got=e?.code||null;}equal(got,code,`expected ${code}`);}
function baseRequest(releaseId,releaseMode,version='0.64.8'){
  return {schemaVersion:1,intentId:`simcore-v${version}-intent-01`,releaseId,product:'SimCore',targetVersion:version,releaseName:'Fixture Release',releaseMode,expectedProductionCommit:'a'.repeat(40),builderPath:'products/simcore/tooling/build-fixture.py',verificationSuite:'batch-a',allowedRuntimePaths:['plugins/simcore/latest.js','plugins/simcore/install.js'],changeClass:'RUNTIME_FEATURE',primaryGoalId:'R2_1_C_FIXTURE',liveGate:{required:true,scenarioId:'R2_1_C_FIXTURE_REAL_LONG_CHAT',closeAuthority:'HUMAN_EVIDENCE'},evidenceRefs:['docs/fixture.md']};
}
function report(req){return {schemaVersion:1,product:'SimCore',intentId:req.intentId,targetVersion:req.targetVersion,releaseName:req.releaseName,releaseMode:req.releaseMode,expectedProductionCommit:'a'.repeat(40),sourceCommit:'b'.repeat(40),candidateCommit:'c'.repeat(40),candidateReleaseBlob:'d'.repeat(40),candidateFetchRef:`candidate/simcore/${req.intentId}`,candidateDisposition:'CREATED',builderPath:req.builderPath,builderSha256:'e'.repeat(64),verificationSuite:'batch-a',changedPaths:req.allowedRuntimePaths,productionMutation:'NONE',releaseAuthority:'CANDIDATE_TRANSPORT_ONLY',result:'PASS'};}

export async function runSuite({fixtures}){
  const ids=fixtures[0].input.releaseIds;
  const assertions=[];const pass=(id)=>assertions.push({id,status:'PASS'});
  for(const [mode,rid] of Object.entries(ids)){
    const version=rid.match(/^simcore-v(\d+\.\d+\.\d+)/)[1];
    const req=baseRequest(rid,mode,version);
    equal(validateReleaseIdentity(req),rid,`${mode} release identity`);
    const receipt=deriveReceipt(req,report(req),'f'.repeat(40),'1'.repeat(64));
    const shadow=deriveSpecShadow(req,receipt);
    equal(receipt.releaseAuthority,'CANDIDATE_RECEIPT_ONLY','receipt authority');
    equal(receipt.productionMutation,'NONE','receipt production mutation');
    equal(shadow.authority,'SHADOW_ONLY','spec shadow authority');
    equal(shadow.derivedSpec.candidateCommit,'c'.repeat(40),'shadow candidate');
    pass(`C-${mode}-derivation`);
  }
  const bad=baseRequest('simcore-v0.64.8-rollback-01','NEW_VERSION');
  expectCode(()=>validateReleaseIdentity(bad),'CANDIDATE_RELEASE_ID_MODE_MISMATCH');
  pass('C-release-id-mode-mismatch-block');

  const historical=JSON.parse(fs.readFileSync('products/simcore/releases/specs/simcore-v0.64.7-new-01.json','utf8'));
  const req={schemaVersion:1,intentId:'simcore-v0.64.7-intent-01',releaseId:historical.releaseId,product:'SimCore',targetVersion:historical.version,releaseName:historical.releaseName,releaseMode:historical.releaseMode,expectedProductionCommit:historical.expectedProductionCommit,builderPath:'products/simcore/tooling/build-06407-reload-cache-continuity.py',verificationSuite:'batch-a',allowedRuntimePaths:['plugins/simcore/latest.js','plugins/simcore/install.js'],changeClass:historical.changeClass,primaryGoalId:historical.primaryGoalId,liveGate:historical.liveGate,evidenceRefs:historical.evidenceRefs};
  const rec={schemaVersion:1,product:'SimCore',intentId:req.intentId,releaseId:req.releaseId,candidateDisposition:'CREATED',expectedProductionCommit:historical.expectedProductionCommit,sourceCommit:'b'.repeat(40),candidateCommit:historical.candidateCommit,candidateReleaseBlob:historical.candidateReleaseBlob,candidateFetchRef:'candidate/simcore-06407-reload-cache-continuity',builderPath:req.builderPath,builderSha256:'e'.repeat(64),verifierCommit:'f'.repeat(40),verificationSuite:'batch-a',verificationReportSha256:'1'.repeat(64),result:'PASS',productionMutation:'NONE',releaseAuthority:'CANDIDATE_RECEIPT_ONLY'};
  const shadow=deriveSpecShadow(req,rec);
  equal(JSON.stringify(shadow.derivedSpec),JSON.stringify(historical),'historical 0.64.7 semantic spec equivalence');
  pass('C-06407-shadow-equivalence');

  const workflow=fs.readFileSync('.github/workflows/product-simcore-candidate-materialize.yml','utf8');
  assert(workflow.includes('candidate-receipts/'),'receipt durable path missing');
  assert(workflow.includes('spec-shadows/'),'spec shadow path missing');
  assert(workflow.includes('repo-main-write.py'),'bounded main gateway missing');
  assert(workflow.includes('required-profile MAIN_HEALTH'),'MAIN_HEALTH gate missing');
  assert(!workflow.includes('release-publish.mjs'),'receipt workflow became publisher');
  pass('C-main-write-without-production-authority');
  return {coverage:'EXECUTABLE',status:'PASS',assertions};
}
