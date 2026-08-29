#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ensureParentUnderRoot, resolveRoot, resolveUnderRoot } from './root-path.mjs';

const SHA40=/^[0-9a-f]{40}$/;
const STATUS_PATH='products/simcore/releases/R_V2_7_EVIDENCE_DERIVED_OPERATIONS_STATUS.json';
const IMPLEMENTATION_FLOOR='f01483956a8f3117852c501b17a366d77eefa1d8';
const PENDING_GATE='FIRST_GENUINE_R2_7_OPERATIONAL_CONFIRMATION_PENDING';
const CONSUMED_GATE='CONSUMED_BY_FIRST_GENUINE_R2_7_RELEASE';
const COMPLETE_STATUS='OPERATIONALLY_PROVEN_FIRST_USE_COMPLETE';

function fail(code,detail=''){const e=new Error(detail?`${code}: ${detail}`:code);e.code=code;throw e;}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){const arg=argv[i];if(!arg.startsWith('--')||i+1>=argv.length)fail('R2_7_STATUS_PROJECTION_ARGS_INVALID',arg);out[arg.slice(2)]=argv[++i];}
  for(const key of ['root','status','proof','record','output','report']) if(!out[key]) fail('R2_7_STATUS_PROJECTION_ARGS_INVALID',key);
  return out;
}
function readJson(file,kind){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){fail('R2_7_STATUS_PROJECTION_INVALID',`${kind}: ${e.message}`);}}
function eq(a,b,label){if(a!==b)fail('R2_7_STATUS_PROJECTION_INVALID',`${label}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);}
function validSha(value,label){if(!SHA40.test(String(value||'')))fail('R2_7_STATUS_PROJECTION_INVALID',label);}
function stable(value){return JSON.stringify(value,Object.keys(value||{}).sort());}
function exactProofObject(proof,record){
  return {
    releaseId:proof.releaseId,
    publisherRunId:String(proof.publisherRunId),
    releaseRecord:proof.releaseRecord,
    stateReceipt:proof.stateReceipt,
    productionCommit:proof.productionCommit,
    previousProductionCommit:proof.previousProductionCommit,
    productionBlob:proof.productionBlob,
    verifierCommit:record.verifierCommit,
    result:'PASS',
  };
}
function validatePolicy(status){
  const p=status?.operationalProofPolicy;
  if(!p||p.mode!=='FIRST_GENUINE_RELEASE_AFTER_IMPLEMENTATION')fail('R2_7_STATUS_PROJECTION_POLICY_INVALID','mode');
  eq(p.implementationAncestor,IMPLEMENTATION_FLOOR,'implementation ancestor');
  eq(p.verifierRelationship,'DESCENDANT_OR_EQUAL','verifier relationship');
  eq(p.consumeOnce,true,'consume once');
  return p;
}
function validateStatusEnvelope(status){
  if(!status||status.schemaVersion!==1||status.product!=='SimCore'||status.systemVersion!=='R2.7')fail('R2_7_STATUS_PROJECTION_INVALID','status envelope');
  eq(status.runtimeMutation,'NONE','runtime mutation');
  eq(status.releaseSimcoreMutation,'NONE','release-simcore mutation');
  eq(status.preservedAuthorities?.productionPublisherCount,1,'publisher count');
  eq(status.preservedAuthorities?.productionPublisher,'RS2_4_PERMANENT','publisher');
  eq(status.preservedAuthorities?.mainGateway,'repo-main-write.py','main gateway');
  eq(status.preservedAuthorities?.humanLivePassRequired,true,'human LIVE_PASS authority');
  validatePolicy(status);
}
function validateProof(proof,record){
  if(!proof||proof.schemaVersion!==1||proof.tool!=='release-operational-proof')fail('R2_7_STATUS_PROJECTION_INVALID','proof envelope');
  eq(proof.operationallyProven,true,'operationally proven');
  eq(proof.proofResult,'PASS','proof result');
  eq(proof.authorityMutation,'NONE','proof authority mutation');
  eq(proof.releaseAuthority,'RS2_4_PERMANENT','proof release authority');
  if(!record||record.schemaVersion!==1||record.product!=='SimCore')fail('R2_7_STATUS_PROJECTION_INVALID','record envelope');
  eq(record.releaseId,proof.releaseId,'release id');
  eq(String(record.publisherRunId),String(proof.publisherRunId),'publisher run id');
  for(const key of ['productionCommit','previousProductionCommit','productionBlob']){validSha(proof[key],`proof ${key}`);eq(record[key],proof[key],key);}
  validSha(record.verifierCommit,'record verifierCommit');
  const expectedRecord=`products/simcore/releases/records/${proof.releaseId}.json`;
  const expectedReceipt=`products/simcore/releases/state-receipts/${proof.releaseId}.json`;
  eq(proof.releaseRecord,expectedRecord,'proof releaseRecord');
  eq(proof.stateReceipt,expectedReceipt,'proof stateReceipt');
}
function storedProofCoherent(status){
  const stored=status?.implementation?.operationalActivationProof;
  if(!stored||typeof stored!=='object'||Array.isArray(stored))return false;
  for(const key of ['releaseId','publisherRunId','releaseRecord','stateReceipt','productionCommit','previousProductionCommit','productionBlob','verifierCommit','result']) if(stored[key]==null)return false;
  for(const key of ['productionCommit','previousProductionCommit','productionBlob','verifierCommit']) if(!SHA40.test(String(stored[key]||'')))return false;
  if(stored.result!=='PASS')return false;
  if(stored.releaseRecord!==`products/simcore/releases/records/${stored.releaseId}.json`)return false;
  if(stored.stateReceipt!==`products/simcore/releases/state-receipts/${stored.releaseId}.json`)return false;
  return true;
}
function completeGateCoherent(status){
  return status.status===COMPLETE_STATUS&&
    status.activationAuthorized===true&&
    status.activationFieldSemantics==='DOCUMENTARY_FIRST_USE_GATE_CONSUMED'&&
    status.activationGate===CONSUMED_GATE&&
    status.operationallyProven===true&&
    storedProofCoherent(status);
}

export function projectRSystemStatus({status,proof,record,isImplementationAncestor}){
  validateStatusEnvelope(status);
  validateProof(proof,record);
  const candidate=exactProofObject(proof,record);

  if(status.activationAuthorized===true||status.operationallyProven===true||status.status===COMPLETE_STATUS||status.activationGate===CONSUMED_GATE){
    if(!completeGateCoherent(status))fail('R2_7_STATUS_PROJECTION_CONTRADICTION','consumed gate is incoherent');
    const stored=status.implementation.operationalActivationProof;
    const same=stable(stored)===stable(candidate);
    if(stored.releaseId===candidate.releaseId&&!same)fail('R2_7_STATUS_PROJECTION_CONTRADICTION','stored first-use proof differs from canonical proof');
    return {
      disposition:same?'NO_OP_ALREADY_DURABLE':'NO_OP_GATE_ALREADY_CONSUMED',
      projectedStatus:structuredClone(status),
      proof:candidate,
      productionMutation:'NONE',
      humanEvidenceMutation:'NONE',
      mainMutation:'NONE',
      authorityMutation:'NONE',
    };
  }

  if(status.activationAuthorized!==false||status.activationGate!==PENDING_GATE||status.operationallyProven===true)fail('R2_7_STATUS_PROJECTION_CONTRADICTION','pending gate is incoherent');
  const pending=status?.implementation?.operationalActivationProof;
  if(pending!=='PENDING_FIRST_GENUINE_R2_7_RELEASE')fail('R2_7_STATUS_PROJECTION_CONTRADICTION','pending proof marker');

  if(!isImplementationAncestor){
    return {
      disposition:'NO_PROJECTION_NOT_ELIGIBLE',
      projectedStatus:structuredClone(status),
      proof:candidate,
      productionMutation:'NONE',
      humanEvidenceMutation:'NONE',
      mainMutation:'NONE',
      authorityMutation:'NONE',
    };
  }

  const projected=structuredClone(status);
  projected.status=COMPLETE_STATUS;
  projected.activationAuthorized=true;
  projected.activationFieldSemantics='DOCUMENTARY_FIRST_USE_GATE_CONSUMED';
  projected.activationGate=CONSUMED_GATE;
  projected.operationallyProven=true;
  projected.implementation.operationalActivationProof=candidate;

  return {
    disposition:'PROJECT',
    projectedStatus:projected,
    proof:candidate,
    productionMutation:'NONE',
    humanEvidenceMutation:'NONE',
    mainMutation:'LOCAL_STATUS_PENDING_GATEWAY',
    authorityMutation:'DOCUMENTARY_STATUS_ONLY',
  };
}

function implementationAncestor(root,ancestor,verifier){
  validSha(ancestor,'implementation ancestor');
  validSha(verifier,'verifier commit');
  const r=spawnSync('git',['merge-base','--is-ancestor',ancestor,verifier],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
  if(r.status===0)return true;
  if(r.status===1)return false;
  fail('R2_7_STATUS_PROJECTION_GIT_ERROR',`${r.stderr||r.stdout||'merge-base failed'}`.trim());
}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}

export function run(argv=process.argv.slice(2)){
  const a=parseArgs(argv);const root=resolveRoot(a.root);
  eq(a.status,STATUS_PATH,'status input path');
  const status=readJson(resolveUnderRoot(root,a.status,{kind:'STATUS'}),'status');
  const proof=readJson(resolveUnderRoot(root,a.proof,{kind:'PROOF'}),'proof');
  eq(a.record,proof.releaseRecord,'record input path');
  const record=readJson(resolveUnderRoot(root,a.record,{kind:'RECORD'}),'record');
  const ancestor=validatePolicy(status).implementationAncestor;
  const eligible=implementationAncestor(root,ancestor,record.verifierCommit);
  const result=projectRSystemStatus({status,proof,record,isImplementationAncestor:eligible});
  writeJson(ensureParentUnderRoot(root,a.output,{kind:'OUTPUT'}),result.projectedStatus);
  const report={...result};delete report.projectedStatus;report.statusPath=a.status;report.outputPath=a.output;report.implementationAncestor=ancestor;report.verifierCommit=record.verifierCommit;report.implementationAncestorSatisfied=eligible;
  writeJson(ensureParentUnderRoot(root,a.report,{kind:'REPORT'}),report);
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(run()));}
  catch(e){console.error(e.code||'R2_7_STATUS_PROJECTION_FAIL',e.message||'');process.exit(2);}
}
