#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveApproval } from './release-approval-resolve.mjs';

const RECEIPT_PATH=/^products\/simcore\/releases\/candidate-receipts\/[A-Za-z0-9._-]+\.json$/;
function fail(code,detail=''){const e=new Error(detail?`${code}: ${detail}`:code);e.code=code;throw e;}
function parseArgs(argv){const out={};for(let i=0;i<argv.length;i+=1){const a=argv[i];if(!a.startsWith('--')||i+1>=argv.length)fail('APPROVAL_PACKAGE_ARGUMENT_INVALID',a);out[a.slice(2)]=argv[++i];}for(const k of ['candidate-receipt','spec-shadow'])if(!out[k])fail('APPROVAL_PACKAGE_ARGUMENT_MISSING',k);for(const forbidden of ['approval-out','spec-out'])if(out[forbidden])fail('APPROVAL_PACKAGE_MANUAL_OUTPUT_PATH_FORBIDDEN',forbidden);return out;}
function writeJsonExclusive(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,{encoding:'utf8',flag:'wx'});}

export function buildApprovalPackage({candidateReceipt,candidateReceiptPath,specShadow,specShadowPath}){
  if(!RECEIPT_PATH.test(String(candidateReceiptPath||'')))fail('APPROVAL_PACKAGE_RECEIPT_PATH_INVALID');
  const releaseId=String(candidateReceipt?.releaseId||'');
  if(!releaseId)fail('APPROVAL_PACKAGE_RELEASE_ID_MISSING');
  const approvalPath=`products/simcore/releases/approvals/${releaseId}.json`;
  const specPath=`products/simcore/releases/specs/${releaseId}.json`;
  const expectedShadowPath=`products/simcore/releases/spec-shadows/${releaseId}.json`;
  if(specShadowPath!==expectedShadowPath)fail('APPROVAL_PACKAGE_SHADOW_PATH_MISMATCH');
  const approval={schemaVersion:1,releaseId,candidateReceiptPath,authorityConfirmation:'RS2_4_RELEASE'};
  const resolved=resolveApproval({
    approval,approvalPath,
    candidateReceipt,candidateReceiptPath,
    specShadow,specShadowPath,
    observedCandidateCommit:candidateReceipt?.candidateCommit,
    observedProductionCommit:candidateReceipt?.expectedProductionCommit,
  });
  if(resolved.result!=='PASS'||resolved.decision!=='APPROVAL_RESOLVED_SHADOW')fail('APPROVAL_PACKAGE_RESOLUTION_INVALID');
  return {
    schemaVersion:1,
    product:'SimCore',
    releaseId,
    canonicalTitle:`SimCore exact release approval: ${releaseId}`,
    approvalPath,
    specPath,
    candidateReceiptPath,
    specShadowPath,
    candidateFetchRef:candidateReceipt.candidateFetchRef,
    candidateCommit:candidateReceipt.candidateCommit,
    expectedProductionCommit:candidateReceipt.expectedProductionCommit,
    candidateReleaseBlob:candidateReceipt.candidateReleaseBlob,
    approval,
    spec:resolved.resolvedSpec,
    productionMutation:'NONE',
    publicationDispatch:'NONE_PACKAGE_ONLY',
  };
}

export function materializeApprovalPackage({root='.',candidateReceiptPath,specShadowPath}){
  const base=path.resolve(root);
  const receiptFile=path.resolve(base,candidateReceiptPath);
  const shadowFile=path.resolve(base,specShadowPath);
  const receipt=JSON.parse(fs.readFileSync(receiptFile,'utf8'));
  const shadow=JSON.parse(fs.readFileSync(shadowFile,'utf8'));
  const pkg=buildApprovalPackage({candidateReceipt:receipt,candidateReceiptPath,specShadow:shadow,specShadowPath});
  const approvalFile=path.resolve(base,pkg.approvalPath);
  const specFile=path.resolve(base,pkg.specPath);
  if(fs.existsSync(approvalFile)||fs.existsSync(specFile))fail('APPROVAL_PACKAGE_OUTPUT_EXISTS',pkg.releaseId);
  let approvalCreated=false;
  try{
    writeJsonExclusive(approvalFile,pkg.approval);approvalCreated=true;
    writeJsonExclusive(specFile,pkg.spec);
  }catch(error){
    if(approvalCreated){try{fs.unlinkSync(approvalFile);}catch{}}
    if(error?.code==='EEXIST')fail('APPROVAL_PACKAGE_OUTPUT_EXISTS',pkg.releaseId);
    throw error;
  }
  return pkg;
}

function main(){
  const a=parseArgs(process.argv.slice(2));
  const pkg=materializeApprovalPackage({root:'.',candidateReceiptPath:a['candidate-receipt'],specShadowPath:a['spec-shadow']});
  const summary={
    releaseId:pkg.releaseId,
    canonicalTitle:pkg.canonicalTitle,
    approvalPath:pkg.approvalPath,
    specPath:pkg.specPath,
    candidateReceiptPath:pkg.candidateReceiptPath,
    specShadowPath:pkg.specShadowPath,
    candidateFetchRef:pkg.candidateFetchRef,
    candidateCommit:pkg.candidateCommit,
    expectedProductionCommit:pkg.expectedProductionCommit,
    candidateReleaseBlob:pkg.candidateReleaseBlob,
    productionMutation:pkg.productionMutation,
    publicationDispatch:pkg.publicationDispatch,
  };
  console.log(`SIMCORE_RELEASE_APPROVAL_PACKAGE_PASS ${JSON.stringify(summary)}`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(e){console.error(`${e.code||'RELEASE_APPROVAL_PACKAGE_ERROR'}: ${e.message||e}`);process.exit(2);}}
