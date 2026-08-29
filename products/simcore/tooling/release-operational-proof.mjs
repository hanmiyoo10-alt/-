#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureParentUnderRoot, resolveRoot, resolveUnderRoot } from './root-path.mjs';

const SHA40=/^[0-9a-f]{40}$/;
function fail(code,detail=''){const e=new Error(detail?`${code}: ${detail}`:code);e.code=code;throw e;}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){const arg=argv[i];if(!arg.startsWith('--')||i+1>=argv.length)fail('R2_7_OPERATIONAL_PROOF_ARGS_INVALID',arg);out[arg.slice(2)]=argv[++i];}
  for(const k of ['root','record','receipt','report']) if(!out[k]) fail('R2_7_OPERATIONAL_PROOF_ARGS_INVALID',k);
  return out;
}
function readJson(file,kind){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){fail('R2_7_OPERATIONAL_PROOF_INVALID',`${kind}: ${e.message}`);}}
function eq(a,b,label){if(a!==b)fail('R2_7_OPERATIONAL_PROOF_INVALID',`${label}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);}
function validSha(v,label){if(!SHA40.test(v||''))fail('R2_7_OPERATIONAL_PROOF_INVALID',label);}

export function deriveOperationalProof(record,receipt){
  if(!record||record.schemaVersion!==1||record.product!=='SimCore')fail('R2_7_OPERATIONAL_PROOF_INVALID','record envelope');
  if(!receipt||receipt.schemaVersion!==1||receipt.product!=='SimCore')fail('R2_7_OPERATIONAL_PROOF_INVALID','receipt envelope');
  for(const k of ['productionCommit','previousProductionCommit','productionBlob']){validSha(record[k],`record ${k}`);validSha(receipt[k],`receipt ${k}`);}
  for(const k of ['releaseId','publisherRunId','productionCommit','previousProductionCommit','productionBlob'])eq(record[k],receipt[k],k);
  eq(record.productionTruth,'PUBLISHED_IDENTITY_VERIFIED','record productionTruth');
  eq(record.stateSyncStatus,'PASS','record stateSyncStatus');
  if(!['LIVE_PENDING','LIVE_PASS'].includes(record.releaseState))fail('R2_7_OPERATIONAL_PROOF_INVALID','record releaseState');
  eq(receipt.releaseAuthority,'RS2_4_PERMANENT','receipt releaseAuthority');
  eq(receipt.result,'PASS','receipt result');
  eq(receipt.validationStatus,'PENDING_REAL_LONG_CHAT','receipt validationStatus');
  eq(receipt.lifecycleState,'REAL_RELEASE_LIVE_PENDING','receipt lifecycleState');
  eq(receipt.releaseRecordPath,`products/simcore/releases/records/${record.releaseId}.json`,'receipt releaseRecordPath');
  eq(receipt.liveScenarioId,record.liveGate?.scenarioId,'live scenario');
  return {
    schemaVersion:1,
    tool:'release-operational-proof',
    releaseId:record.releaseId,
    publisherRunId:String(record.publisherRunId),
    productionCommit:record.productionCommit,
    previousProductionCommit:record.previousProductionCommit,
    productionBlob:record.productionBlob,
    releaseAuthority:receipt.releaseAuthority,
    recordReleaseState:record.releaseState,
    receiptLifecycleState:receipt.lifecycleState,
    operationallyProven:true,
    proofResult:'PASS',
    authorityMutation:'NONE',
  };
}

export function run(argv=process.argv.slice(2)){
  const a=parseArgs(argv);const root=resolveRoot(a.root);
  const recordPath=resolveUnderRoot(root,a.record,{kind:'RECORD'});
  const receiptPath=resolveUnderRoot(root,a.receipt,{kind:'RECEIPT'});
  const result=deriveOperationalProof(readJson(recordPath,'record'),readJson(receiptPath,'receipt'));
  result.releaseRecord=a.record;result.stateReceipt=a.receipt;
  const report=ensureParentUnderRoot(root,a.report,{kind:'REPORT'});
  fs.writeFileSync(report,`${JSON.stringify(result,null,2)}\n`,'utf8');
  return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(run()));}
  catch(e){console.error(e.code||'R2_7_OPERATIONAL_PROOF_FAIL',e.message||'');process.exit(2);}
}
