#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HEX40=/^[0-9a-f]{40}$/;
const VERSION=/^\d+\.\d+\.\d+$/;
const RELEASE_ID=/^simcore-v\d+\.\d+\.\d+-(?:new|correction|rollback)-\d{2,}$/;
const RECEIPT_PATH=/^products\/simcore\/releases\/candidate-receipts\/[A-Za-z0-9._-]+\.json$/;
const REASON=/^[A-Za-z0-9_.:-]{1,96}$/;
const APPROVAL_KEYS=['authorityConfirmation','candidateReceiptPath','releaseId','schemaVersion'];
const SPEC_BASE_KEYS=['candidateCommit','candidateReleaseBlob','changeClass','evidenceRefs','expectedProductionCommit','liveGate','primaryGoalId','product','releaseId','releaseMode','releaseName','schemaVersion','version'];
const LIVE_GATE_KEYS=['closeAuthority','required','scenarioId'];
const MODES=new Set(['NEW_VERSION','SAME_VERSION_CORRECTION','ROLLBACK']);
const CHANGE_CLASSES=new Set(['RUNTIME_FEATURE','RUNTIME_CORRECTION','ROLLBACK']);
function fail(code,detail=''){const e=new Error(detail?`${code}: ${detail}`:code);e.code=code;throw e;}
function sha256(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function canonicalBytes(value){return Buffer.from(`${JSON.stringify(value)}\n`,'utf8');}
function parseArgs(argv){const out={};for(let i=0;i<argv.length;i+=1){const a=argv[i];if(!a.startsWith('--')||i+1>=argv.length)fail('APPROVAL_ARGUMENT_INVALID',a);out[a.slice(2)]=argv[++i];}for(const k of ['approval','candidate-receipt','spec-shadow','observed-candidate','observed-production','resolved-spec','report'])if(!out[k])fail('APPROVAL_ARGUMENT_MISSING',k);return out;}
function sameKeys(value,expected){return value&&typeof value==='object'&&!Array.isArray(value)&&JSON.stringify(Object.keys(value).sort())===JSON.stringify([...expected].sort());}
function validateApproval(approval){
  if(!sameKeys(approval,APPROVAL_KEYS))fail('APPROVAL_SCHEMA_INVALID');
  if(approval.schemaVersion!==1)fail('APPROVAL_SCHEMA_INVALID');
  if(!RELEASE_ID.test(String(approval.releaseId||'')))fail('APPROVAL_RELEASE_ID_INVALID');
  if(!RECEIPT_PATH.test(String(approval.candidateReceiptPath||'')))fail('APPROVAL_RECEIPT_PATH_INVALID');
  if(approval.authorityConfirmation!=='RS2_4_RELEASE')fail('APPROVAL_AUTHORITY_INVALID');
}
function validateReceipt(receipt,approval){
  if(!receipt||receipt.schemaVersion!==1||receipt.product!=='SimCore'||receipt.result!=='PASS')fail('APPROVAL_RECEIPT_INVALID');
  if(receipt.releaseAuthority!=='CANDIDATE_RECEIPT_ONLY'||receipt.productionMutation!=='NONE')fail('APPROVAL_RECEIPT_AUTHORITY_INVALID');
  if(receipt.releaseId!==approval.releaseId)fail('APPROVAL_RECEIPT_RELEASE_MISMATCH');
  for(const k of ['expectedProductionCommit','candidateCommit','candidateReleaseBlob'])if(!HEX40.test(String(receipt[k]||'')))fail('APPROVAL_RECEIPT_IDENTITY_INVALID',k);
  if(!String(receipt.candidateFetchRef||'').startsWith('candidate/simcore/'))fail('APPROVAL_RECEIPT_REF_INVALID');
}
function validateRollback(spec){
  if(spec.releaseMode==='ROLLBACK'){
    const r=spec.rollback;
    if(!sameKeys(r,['approvedSafeBlob','approvedSafeCommit','reasonCode']))fail('APPROVAL_ROLLBACK_METADATA_REQUIRED');
    if(!HEX40.test(String(r.approvedSafeCommit||''))||!HEX40.test(String(r.approvedSafeBlob||''))||!REASON.test(String(r.reasonCode||'')))fail('APPROVAL_ROLLBACK_METADATA_INVALID');
  } else if(spec.rollback!=null) fail('APPROVAL_ROLLBACK_METADATA_UNEXPECTED');
}
function validateSpec(spec,receipt,approval){
  if(!spec||spec.schemaVersion!==1||spec.product!=='SimCore'||spec.releaseId!==approval.releaseId)fail('APPROVAL_SPEC_INVALID');
  const expectedKeys=spec.releaseMode==='ROLLBACK'?[...SPEC_BASE_KEYS,'rollback']:SPEC_BASE_KEYS;
  if(!sameKeys(spec,expectedKeys))fail('APPROVAL_SPEC_SCHEMA_INVALID');
  if(!MODES.has(spec.releaseMode)||!VERSION.test(String(spec.version||''))||!String(spec.releaseName||'').trim())fail('APPROVAL_SPEC_INVALID');
  if(!CHANGE_CLASSES.has(spec.changeClass)||!String(spec.primaryGoalId||'').trim()||!Array.isArray(spec.evidenceRefs))fail('APPROVAL_SPEC_INVALID');
  if(spec.candidateCommit!==receipt.candidateCommit)fail('APPROVAL_SPEC_CANDIDATE_MISMATCH');
  if(spec.expectedProductionCommit!==receipt.expectedProductionCommit)fail('APPROVAL_SPEC_PARENT_MISMATCH');
  if(spec.candidateReleaseBlob!==receipt.candidateReleaseBlob)fail('APPROVAL_SPEC_BLOB_MISMATCH');
  if(!sameKeys(spec.liveGate,LIVE_GATE_KEYS)||spec.liveGate.required!==true||spec.liveGate.closeAuthority!=='HUMAN_EVIDENCE'||!String(spec.liveGate.scenarioId||''))fail('APPROVAL_SPEC_LIVE_GATE_INVALID');
  validateRollback(spec);
}

export function resolveApproval({approval,approvalPath,candidateReceipt,candidateReceiptPath,specShadow,specShadowPath,observedCandidateCommit,observedProductionCommit}){
  validateApproval(approval);
  const expectedApproval=`products/simcore/releases/approvals/${approval.releaseId}.json`;
  if(approvalPath!==expectedApproval)fail('APPROVAL_PATH_MISMATCH');
  if(candidateReceiptPath!==approval.candidateReceiptPath)fail('APPROVAL_RECEIPT_PATH_MISMATCH');
  const expectedShadow=`products/simcore/releases/spec-shadows/${approval.releaseId}.json`;
  if(specShadowPath!==expectedShadow)fail('APPROVAL_SPEC_SHADOW_PATH_MISMATCH');
  validateReceipt(candidateReceipt,approval);
  if(!specShadow||specShadow.schemaVersion!==1||specShadow.product!=='SimCore'||specShadow.authority!=='SHADOW_ONLY')fail('APPROVAL_SPEC_SHADOW_INVALID');
  if(specShadow.releaseId!==approval.releaseId||specShadow.candidateReceiptPath!==approval.candidateReceiptPath)fail('APPROVAL_SPEC_SHADOW_BINDING_MISMATCH');
  const spec=structuredClone(specShadow.derivedSpec);
  validateSpec(spec,candidateReceipt,approval);
  if(observedCandidateCommit!==candidateReceipt.candidateCommit)fail('APPROVAL_CANDIDATE_REF_MOVED');
  if(observedProductionCommit!==candidateReceipt.expectedProductionCommit)fail('APPROVAL_PRODUCTION_PARENT_MOVED');
  return {
    schemaVersion:1,
    product:'SimCore',
    releaseId:approval.releaseId,
    approvalPath,
    candidateReceiptPath,
    specShadowPath,
    authorityConfirmation:'RS2_4_RELEASE',
    candidateCommit:candidateReceipt.candidateCommit,
    expectedProductionCommit:candidateReceipt.expectedProductionCommit,
    candidateReleaseBlob:candidateReceipt.candidateReleaseBlob,
    candidateFetchRef:candidateReceipt.candidateFetchRef,
    resolvedSpec:spec,
    resolvedSpecSha256:sha256(canonicalBytes(spec)),
    decision:'APPROVAL_RESOLVED_SHADOW',
    releaseAuthority:'APPROVAL_RESOLUTION_ONLY',
    productionMutation:'NONE',
    publicationDispatch:'DISABLED_PENDING_OPERATOR_DECISION',
    result:'PASS',
  };
}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function main(){
  const a=parseArgs(process.argv.slice(2));
  const approval=JSON.parse(fs.readFileSync(a.approval,'utf8'));
  const receipt=JSON.parse(fs.readFileSync(a['candidate-receipt'],'utf8'));
  const shadow=JSON.parse(fs.readFileSync(a['spec-shadow'],'utf8'));
  const result=resolveApproval({approval,approvalPath:a.approval,candidateReceipt:receipt,candidateReceiptPath:a['candidate-receipt'],specShadow:shadow,specShadowPath:a['spec-shadow'],observedCandidateCommit:a['observed-candidate'],observedProductionCommit:a['observed-production']});
  writeJson(a['resolved-spec'],result.resolvedSpec);
  const report={...result};delete report.resolvedSpec;report.resolvedSpecPath=a['resolved-spec'];
  writeJson(a.report,report);
  console.log(`SIMCORE_RELEASE_APPROVAL_RESOLVE_PASS release=${result.releaseId} dispatch=${result.publicationDispatch}`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(e){console.error(`${e.code||'RELEASE_APPROVAL_RESOLVE_ERROR'}: ${e.message||e}`);process.exit(2);}}
