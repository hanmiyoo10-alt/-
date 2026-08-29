#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureParentUnderRoot, resolveRoot } from './root-path.mjs';

const SHA40 = /^[0-9a-f]{40}$/;
const PHASES = new Set(['PRE_PUBLICATION','POST_PUBLICATION','HUMAN_EVIDENCE']);
const PUBLICATION = new Set(['UNPUBLISHED','PUBLISHED','UNKNOWN']);

function fail(code, detail='') {
  const e = new Error(detail ? `${code}: ${detail}` : code);
  e.code = code;
  throw e;
}
function parseArgs(argv) {
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const arg=argv[i];
    if(!arg.startsWith('--')||i+1>=argv.length) fail('R2_7_RECOVERY_DECISION_ARGS_INVALID',arg);
    out[arg.slice(2)]=argv[++i];
  }
  for(const key of ['root','phase','frozen-verifier','current-control-plane','expected-production','candidate-production','observed-production','publication-state','report']) if(!out[key]) fail('R2_7_RECOVERY_DECISION_ARGS_INVALID',key);
  return out;
}
function validateSha(name,value){if(!SHA40.test(value||'')) fail('R2_7_RECOVERY_DECISION_INPUT_INVALID',name);}

export function decide(input) {
  if(!PHASES.has(input.phase)) fail('R2_7_RECOVERY_DECISION_INPUT_INVALID','phase');
  if(!PUBLICATION.has(input.publicationState)) fail('R2_7_RECOVERY_DECISION_INPUT_INVALID','publicationState');
  for(const [name,value] of [
    ['frozenVerifier',input.frozenVerifier],
    ['currentControlPlane',input.currentControlPlane],
    ['expectedProduction',input.expectedProduction],
    ['candidateProduction',input.candidateProduction],
    ['observedProduction',input.observedProduction],
  ]) validateSha(name,value);

  const observedIsParent=input.observedProduction===input.expectedProduction;
  const observedIsCandidate=input.observedProduction===input.candidateProduction;
  const effectivePublicationState=observedIsCandidate?'PUBLISHED':observedIsParent?'UNPUBLISHED':input.publicationState;

  let disposition;
  let nextAction;
  if(!observedIsParent&&!observedIsCandidate) {
    disposition='BLOCKED_IDENTITY_MOVED';
    nextAction='STOP_AND_REOBSERVE_PRODUCTION_AUTHORITY';
  } else if(input.phase==='HUMAN_EVIDENCE') {
    disposition='MANUAL_EVIDENCE_REQUIRED';
    nextAction='CONTINUE_THROUGH_EXISTING_HUMAN_EVIDENCE_PATH';
  } else if(effectivePublicationState==='PUBLISHED'||input.phase==='POST_PUBLICATION') {
    disposition='RECOVERY_REQUEST_REQUIRED';
    nextAction='USE_EXISTING_APPEND_ONLY_PERMANENT_RECOVERY_PATH';
  } else if(input.currentControlPlane!==input.frozenVerifier) {
    disposition='FRESH_PERMANENT_DISPATCH_REQUIRED';
    nextAction='DO_NOT_RERUN_FAILED_PERMANENT_JOB_ONLY';
  } else {
    disposition='SAFE_TO_RERUN_FAILED_JOB';
    nextAction='RERUN_WITH_SAME_FROZEN_VERIFIER_IS_SEMANTICALLY_SAFE';
  }
  return {
    schemaVersion:1,
    tool:'release-recovery-decision',
    phase:input.phase,
    requestedPublicationState:input.publicationState,
    effectivePublicationState,
    frozenVerifier:input.frozenVerifier,
    currentControlPlane:input.currentControlPlane,
    expectedProduction:input.expectedProduction,
    candidateProduction:input.candidateProduction,
    observedProduction:input.observedProduction,
    controlPlaneChanged:input.currentControlPlane!==input.frozenVerifier,
    productionMovedUnexpectedly:!observedIsParent&&!observedIsCandidate,
    disposition,
    nextAction,
    authorityMutation:'NONE',
  };
}

export function run(argv=process.argv.slice(2)) {
  const a=parseArgs(argv);
  const root=resolveRoot(a.root);
  const result=decide({
    phase:a.phase,
    frozenVerifier:a['frozen-verifier'],
    currentControlPlane:a['current-control-plane'],
    expectedProduction:a['expected-production'],
    candidateProduction:a['candidate-production'],
    observedProduction:a['observed-production'],
    publicationState:a['publication-state'],
  });
  const report=ensureParentUnderRoot(root,a.report,{kind:'REPORT'});
  fs.writeFileSync(report,`${JSON.stringify(result,null,2)}\n`,'utf8');
  return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(run()));}
  catch(e){console.error(e.code||'R2_7_RECOVERY_DECISION_FAIL',e.message||'');process.exit(2);}
}
