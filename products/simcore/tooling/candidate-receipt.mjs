#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HEX40=/^[0-9a-f]{40}$/;
const HEX64=/^[0-9a-f]{64}$/;
const RELEASE_ID=/^simcore-v(\d+\.\d+\.\d+)-(new|correction|rollback)-\d{2,}$/;
const MODE_SUFFIX={NEW_VERSION:'new',SAME_VERSION_CORRECTION:'correction',ROLLBACK:'rollback'};
function fail(code,msg=code){const e=new Error(msg);e.code=code;throw e;}
function sha256(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function parseArgs(argv){const out={};for(let i=0;i<argv.length;i+=1){const a=argv[i];if(!a.startsWith('--')||i+1>=argv.length)fail('CANDIDATE_RECEIPT_ARGUMENT_INVALID',a);out[a.slice(2)]=argv[++i];}for(const k of ['request','candidate-report','verifier-commit','receipt','spec-shadow'])if(!out[k])fail('CANDIDATE_RECEIPT_ARGUMENT_MISSING',k);return out;}

export function validateReleaseIdentity(request){
  const m=String(request.releaseId||'').match(RELEASE_ID);
  if(!m)fail('CANDIDATE_RELEASE_ID_INVALID');
  if(m[1]!==String(request.targetVersion||''))fail('CANDIDATE_RELEASE_ID_VERSION_MISMATCH');
  if(m[2]!==MODE_SUFFIX[request.releaseMode])fail('CANDIDATE_RELEASE_ID_MODE_MISMATCH');
  return request.releaseId;
}

export function deriveReceipt(request,report,verifierCommit,verificationReportSha256){
  const releaseId=validateReleaseIdentity(request);
  if(!HEX40.test(verifierCommit))fail('CANDIDATE_RECEIPT_VERIFIER_INVALID');
  if(!HEX64.test(verificationReportSha256))fail('CANDIDATE_RECEIPT_REPORT_DIGEST_INVALID');
  if(report.result!=='PASS')fail('CANDIDATE_RECEIPT_REPORT_NOT_PASS');
  if(report.intentId!==request.intentId)fail('CANDIDATE_RECEIPT_INTENT_MISMATCH');
  if(report.targetVersion!==request.targetVersion||report.releaseMode!==request.releaseMode)fail('CANDIDATE_RECEIPT_RELEASE_MISMATCH');
  for(const k of ['expectedProductionCommit','sourceCommit','candidateCommit','candidateReleaseBlob'])if(!HEX40.test(String(report[k]||'')))fail('CANDIDATE_RECEIPT_IDENTITY_INVALID',k);
  if(!['CREATED','ALREADY_MATERIALIZED'].includes(report.candidateDisposition))fail('CANDIDATE_RECEIPT_DISPOSITION_INVALID');
  if(report.productionMutation!=='NONE'||report.releaseAuthority!=='CANDIDATE_TRANSPORT_ONLY')fail('CANDIDATE_RECEIPT_AUTHORITY_INVALID');
  if(!String(report.candidateFetchRef||'').startsWith('candidate/simcore/'))fail('CANDIDATE_RECEIPT_REF_INVALID');
  return {schemaVersion:1,product:'SimCore',intentId:request.intentId,releaseId,candidateDisposition:report.candidateDisposition,expectedProductionCommit:report.expectedProductionCommit,sourceCommit:report.sourceCommit,candidateCommit:report.candidateCommit,candidateReleaseBlob:report.candidateReleaseBlob,candidateFetchRef:report.candidateFetchRef,builderPath:report.builderPath,builderSha256:report.builderSha256,verifierCommit,verificationSuite:report.verificationSuite,verificationReportSha256,result:'PASS',productionMutation:'NONE',releaseAuthority:'CANDIDATE_RECEIPT_ONLY'};
}

export function deriveSpecShadow(request,receipt){
  if(receipt.releaseId!==request.releaseId||receipt.result!=='PASS')fail('SPEC_SHADOW_RECEIPT_INVALID');
  const derivedSpec={schemaVersion:1,releaseId:request.releaseId,product:'SimCore',version:request.targetVersion,releaseName:request.releaseName,releaseMode:request.releaseMode,candidateCommit:receipt.candidateCommit,expectedProductionCommit:receipt.expectedProductionCommit,candidateReleaseBlob:receipt.candidateReleaseBlob,primaryGoalId:request.primaryGoalId,changeClass:request.changeClass,evidenceRefs:request.evidenceRefs,liveGate:request.liveGate};
  return {schemaVersion:1,product:'SimCore',authority:'SHADOW_ONLY',intentId:request.intentId,releaseId:request.releaseId,candidateReceiptPath:`products/simcore/releases/candidate-receipts/${request.intentId}.json`,derivedSpec};
}
function writeJson(p,v){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,`${JSON.stringify(v,null,2)}\n`,'utf8');}
function main(){const a=parseArgs(process.argv.slice(2));const req=JSON.parse(fs.readFileSync(a.request,'utf8'));const reportBytes=fs.readFileSync(a['candidate-report']);const report=JSON.parse(reportBytes);const receipt=deriveReceipt(req,report,a['verifier-commit'],sha256(reportBytes));const shadow=deriveSpecShadow(req,receipt);writeJson(a.receipt,receipt);writeJson(a['spec-shadow'],shadow);console.log(`SIMCORE_CANDIDATE_RECEIPT_PASS intent=${receipt.intentId} release=${receipt.releaseId}`);}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(e){console.error(`${e.code||'CANDIDATE_RECEIPT_ERROR'}: ${e.message||e}`);process.exit(2);}}
