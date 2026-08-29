import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, equal } from '../../tooling/assertions.mjs';
import { deriveOperationalProof } from '../../tooling/release-operational-proof.mjs';
import { projectRSystemStatus } from '../../tooling/release-rsystem-status-project.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const REPO=path.resolve(HERE,'../../../..');
const STATUS_PATH=path.join(REPO,'products/simcore/releases/R_V2_7_EVIDENCE_DERIVED_OPERATIONS_STATUS.json');
const RELEASE_ID='simcore-v0.68.0-new-02';
function pass(assertions,id){assertions.push({id,status:'PASS'});}
function clone(v){return structuredClone(v);}
function proofFor(record,receipt){
  const proof=deriveOperationalProof(record,receipt);
  proof.releaseRecord=`products/simcore/releases/records/${record.releaseId}.json`;
  proof.stateReceipt=`products/simcore/releases/state-receipts/${record.releaseId}.json`;
  return proof;
}

export async function runSuite(){
  const assertions=[];
  const baseStatus=JSON.parse(fs.readFileSync(STATUS_PATH,'utf8'));
  const record=JSON.parse(fs.readFileSync(path.join(REPO,`products/simcore/releases/records/${RELEASE_ID}.json`),'utf8'));
  const receipt=JSON.parse(fs.readFileSync(path.join(REPO,`products/simcore/releases/state-receipts/${RELEASE_ID}.json`),'utf8'));
  const proof=proofFor(record,receipt);

  equal(baseStatus.operationalProofPolicy.mode,'FIRST_GENUINE_RELEASE_AFTER_IMPLEMENTATION','proof policy mode');
  equal(baseStatus.operationalProofPolicy.implementationAncestor,'f01483956a8f3117852c501b17a366d77eefa1d8','implementation floor');
  equal(baseStatus.operationalProofPolicy.verifierRelationship,'DESCENDANT_OR_EQUAL','verifier relationship');
  equal(baseStatus.operationalProofPolicy.consumeOnce,true,'consume once');
  pass(assertions,'R2.7-status-projection-policy');

  const pending=clone(baseStatus);
  pending.status='IMPLEMENTED_PERMANENT_CI_QUALIFIED_ACTIVATION_PENDING';
  pending.activationAuthorized=false;
  delete pending.activationFieldSemantics;
  pending.activationGate='FIRST_GENUINE_R2_7_OPERATIONAL_CONFIRMATION_PENDING';
  delete pending.operationallyProven;
  pending.implementation.operationalActivationProof='PENDING_FIRST_GENUINE_R2_7_RELEASE';
  pending.implementation.durableProjection.status='IMPLEMENTED_PERMANENT_CI_QUALIFIED_ACTIVATION_PENDING';

  const projected=projectRSystemStatus({status:pending,proof,record,isImplementationAncestor:true});
  equal(projected.disposition,'PROJECT','first eligible proof projects');
  equal(projected.projectedStatus.status,'OPERATIONALLY_PROVEN_FIRST_USE_COMPLETE','projected status');
  equal(projected.projectedStatus.implementation.durableProjection.status,'OPERATIONALLY_PROVEN_FIRST_USE_COMPLETE','nested projection lifecycle');
  equal(projected.projectedStatus.activationAuthorized,true,'documentary activation');
  equal(projected.projectedStatus.activationGate,'CONSUMED_BY_FIRST_GENUINE_R2_7_RELEASE','consumed gate');
  equal(projected.projectedStatus.operationallyProven,true,'operational proof projection');
  equal(projected.projectedStatus.implementation.operationalActivationProof.releaseId,RELEASE_ID,'first-use release binding');
  equal(projected.projectedStatus.implementation.operationalActivationProof.verifierCommit,record.verifierCommit,'verifier binding');
  equal(projected.productionMutation,'NONE','no production mutation');
  equal(projected.humanEvidenceMutation,'NONE','no human evidence mutation');
  equal(projected.authorityMutation,'DOCUMENTARY_STATUS_ONLY','documentary authority only');
  pass(assertions,'R2.7-status-projection-first-eligible');

  const again=projectRSystemStatus({status:projected.projectedStatus,proof,record,isImplementationAncestor:true});
  equal(again.disposition,'NO_OP_ALREADY_DURABLE','same proof idempotent');
  equal(again.mainMutation,'NONE','same proof no main mutation');
  pass(assertions,'R2.7-status-projection-idempotent');

  let staleNestedContradiction=false;
  try {
    const staleNested=clone(projected.projectedStatus);
    staleNested.implementation.durableProjection.status='IMPLEMENTED_PERMANENT_CI_QUALIFIED_ACTIVATION_PENDING';
    projectRSystemStatus({status:staleNested,proof,record,isImplementationAncestor:true});
  } catch(e) { staleNestedContradiction=e.code==='R2_7_STATUS_PROJECTION_CONTRADICTION'; }
  assert(staleNestedContradiction,'consumed gate with stale nested lifecycle must fail closed');
  pass(assertions,'R2.7-status-projection-nested-convergence');

  const laterRecord=clone(record);
  laterRecord.releaseId='simcore-v0.69.0-new-01';
  laterRecord.publisherRunId='99999999999';
  laterRecord.productionCommit='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  laterRecord.previousProductionCommit=record.productionCommit;
  laterRecord.productionBlob='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  laterRecord.verifierCommit='cccccccccccccccccccccccccccccccccccccccc';
  const laterProof={
    ...proof,
    releaseId:laterRecord.releaseId,
    publisherRunId:String(laterRecord.publisherRunId),
    productionCommit:laterRecord.productionCommit,
    previousProductionCommit:laterRecord.previousProductionCommit,
    productionBlob:laterRecord.productionBlob,
    releaseRecord:`products/simcore/releases/records/${laterRecord.releaseId}.json`,
    stateReceipt:`products/simcore/releases/state-receipts/${laterRecord.releaseId}.json`,
  };
  const later=projectRSystemStatus({status:projected.projectedStatus,proof:laterProof,record:laterRecord,isImplementationAncestor:true});
  equal(later.disposition,'NO_OP_GATE_ALREADY_CONSUMED','later release does not replace first-use proof');
  equal(later.projectedStatus.implementation.operationalActivationProof.releaseId,RELEASE_ID,'stored first-use proof preserved');
  pass(assertions,'R2.7-status-projection-consume-once');

  let contradiction=false;
  try {
    const altered={...proof,productionBlob:'dddddddddddddddddddddddddddddddddddddddd'};
    const alteredRecord={...record,productionBlob:altered.productionBlob};
    projectRSystemStatus({status:projected.projectedStatus,proof:altered,record:alteredRecord,isImplementationAncestor:true});
  } catch(e) { contradiction=e.code==='R2_7_STATUS_PROJECTION_CONTRADICTION'; }
  assert(contradiction,'same release with contradictory canonical proof must fail closed');
  pass(assertions,'R2.7-status-projection-contradiction');

  const preImplementation=projectRSystemStatus({status:pending,proof,record,isImplementationAncestor:false});
  equal(preImplementation.disposition,'NO_PROJECTION_NOT_ELIGIBLE','pre-implementation verifier cannot consume gate');
  equal(preImplementation.mainMutation,'NONE','ineligible proof no main mutation');
  pass(assertions,'R2.7-status-projection-ancestry-gate');

  const source=fs.readFileSync(path.join(REPO,'products/simcore/tooling/release-rsystem-status-project.mjs'),'utf8');
  for(const token of ['release-publish.mjs','scripts/repo-main-write.py',"spawnSync('python3'",'git push','gh workflow run','setInterval(','setTimeout(','api.github.com']) assert(!source.includes(token),`projection owner gained forbidden authority primitive: ${token}`);
  assert(source.includes("eq(status.preservedAuthorities?.mainGateway,'repo-main-write.py'"),'projection owner must verify the existing main authority name without invoking it');
  pass(assertions,'R2.7-status-projection-owner-pure');

  const workflow=fs.readFileSync(path.join(REPO,'.github/workflows/simcore-r2-7-status-projection.yml'),'utf8');
  for(const token of ['products/simcore/releases/records/**','products/simcore/releases/state-receipts/**','release-operational-proof.mjs','release-rsystem-status-project.mjs','scripts/repo-main-write.py','products/simcore/releases/R_V2_7_EVIDENCE_DERIVED_OPERATIONS_STATUS.json','required-workflow simcore-ci.yml','required-profile MAIN_HEALTH','required-job Required']) assert(workflow.includes(token),`projection workflow missing contract token: ${token}`);
  assert(!workflow.includes('schedule:'),'projection workflow must not poll on schedule');
  assert(!workflow.includes("- 'products/simcore/releases/R_V2_7_EVIDENCE_DERIVED_OPERATIONS_STATUS.json'"),'status write must not self-trigger projection workflow');
  equal((workflow.match(/scripts\/repo-main-write\.py/g)||[]).length,1,'one main gateway invocation');
  pass(assertions,'R2.7-status-projection-workflow-boundary');

  for(const value of Object.values(baseStatus.complexityBudget)) equal(value,0,'complexity budget remains zero');
  equal(baseStatus.preservedAuthorities.productionPublisherCount,1,'one publisher preserved');
  equal(baseStatus.preservedAuthorities.mainGateway,'repo-main-write.py','one main writer preserved');
  equal(baseStatus.preservedAuthorities.humanLivePassRequired,true,'HUMAN_EVIDENCE remains human');
  equal(baseStatus.runtimeMutation,'NONE','runtime remains unchanged');
  equal(baseStatus.releaseSimcoreMutation,'NONE','release-simcore remains unchanged');
  pass(assertions,'R2.7-status-projection-authority-budget');

  return {coverage:'EXECUTABLE',status:'PASS',assertions};
}
