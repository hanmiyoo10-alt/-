#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveApproval } from './release-approval-resolve.mjs';

const RECEIPT_PATH=/^products\/simcore\/releases\/candidate-receipts\/[A-Za-z0-9._-]+\.json$/;
function fail(code,detail=''){const e=new Error(detail?`${code}: ${detail}`:code);e.code=code;throw e;}
function parseArgs(argv){const out={};for(let i=0;i<argv.length;i+=1){const a=argv[i];if(!a.startsWith('--')||i+1>=argv.length)fail('APPROVAL_PACKAGE_ARGUMENT_INVALID',a);out[a.slice(2)]=argv[++i];}for(const k of ['candidate-receipt','spec-shadow','approval-out','spec-out'])if(!out[k])fail('APPROVAL_PACKAGE_ARGUMENT_MISSING',k);return out;}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}

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
    approvalPath,
    specPath,
    candidateFetchRef:candidateReceipt.candidateFetchRef,
    approval,
    spec:resolved.resolvedSpec,
    productionMutation:'NONE',
    publicationDispatch:'NONE_PACKAGE_ONLY',
  };
}

function main(){
  const a=parseArgs(process.argv.slice(2));
  const receipt=JSON.parse(fs.readFileSync(a['candidate-receipt'],'utf8'));
  const shadow=JSON.parse(fs.readFileSync(a['spec-shadow'],'utf8'));
  const pkg=buildApprovalPackage({candidateReceipt:receipt,candidateReceiptPath:a['candidate-receipt'],specShadow:shadow,specShadowPath:a['spec-shadow']});
  if(a['approval-out']!==pkg.approvalPath)fail('APPROVAL_PACKAGE_APPROVAL_OUTPUT_PATH_MISMATCH');
  if(a['spec-out']!==pkg.specPath)fail('APPROVAL_PACKAGE_SPEC_OUTPUT_PATH_MISMATCH');
  writeJson(a['approval-out'],pkg.approval);
  writeJson(a['spec-out'],pkg.spec);
  console.log(`SIMCORE_RELEASE_APPROVAL_PACKAGE_PASS release=${pkg.releaseId}`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(e){console.error(`${e.code||'RELEASE_APPROVAL_PACKAGE_ERROR'}: ${e.message||e}`);process.exit(2);}}
