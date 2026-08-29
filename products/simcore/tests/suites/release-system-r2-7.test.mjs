import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assert, equal } from '../../tooling/assertions.mjs';
import { resolveUnderRoot } from '../../tooling/root-path.mjs';
import { decide } from '../../tooling/release-recovery-decision.mjs';
import { deriveOperationalProof } from '../../tooling/release-operational-proof.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const REPO=path.resolve(HERE,'../../../..');
const SHA_A='1111111111111111111111111111111111111111';
const SHA_B='2222222222222222222222222222222222222222';
const SHA_C='3333333333333333333333333333333333333333';
const SHA_D='4444444444444444444444444444444444444444';
function pass(assertions,id){assertions.push({id,status:'PASS'});}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);}

export async function runSuite(){
  const assertions=[];

  const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'simcore-r2-7-root-'));
  const tempCwd=fs.mkdtempSync(path.join(os.tmpdir(),'simcore-r2-7-cwd-'));
  try {
    equal(resolveUnderRoot(tempRoot,'reports/x.json'),path.join(tempRoot,'reports/x.json'),'relative path root binding');
    let escaped=false;
    try{resolveUnderRoot(tempRoot,'../escape.json');}catch(e){escaped=e.code==='R2_7_PATH_OUTSIDE_ROOT';}
    assert(escaped,'../ escape must be rejected');
    let absolute=false;
    try{resolveUnderRoot(tempRoot,path.join(tempRoot,'absolute.json'));}catch(e){absolute=e.code==='R2_7_PATH_ABSOLUTE_REJECTED';}
    assert(absolute,'absolute path must be rejected by default');
    pass(assertions,'R2.7-B-root-path-contract');

    const safe=decide({phase:'PRE_PUBLICATION',publicationState:'UNPUBLISHED',frozenVerifier:SHA_A,currentControlPlane:SHA_A,expectedProduction:SHA_B,candidateProduction:SHA_C,observedProduction:SHA_B});
    equal(safe.disposition,'SAFE_TO_RERUN_FAILED_JOB','same verifier safe rerun');
    const fresh=decide({phase:'PRE_PUBLICATION',publicationState:'UNPUBLISHED',frozenVerifier:SHA_A,currentControlPlane:SHA_D,expectedProduction:SHA_B,candidateProduction:SHA_C,observedProduction:SHA_B});
    equal(fresh.disposition,'FRESH_PERMANENT_DISPATCH_REQUIRED','stale verifier fresh dispatch');
    equal(fresh.nextAction,'DO_NOT_RERUN_FAILED_PERMANENT_JOB_ONLY','stale verifier guidance');
    const recovery=decide({phase:'POST_PUBLICATION',publicationState:'PUBLISHED',frozenVerifier:SHA_A,currentControlPlane:SHA_D,expectedProduction:SHA_B,candidateProduction:SHA_C,observedProduction:SHA_C});
    equal(recovery.disposition,'RECOVERY_REQUEST_REQUIRED','published candidate recovery route');
    const manual=decide({phase:'HUMAN_EVIDENCE',publicationState:'PUBLISHED',frozenVerifier:SHA_A,currentControlPlane:SHA_A,expectedProduction:SHA_B,candidateProduction:SHA_C,observedProduction:SHA_C});
    equal(manual.disposition,'MANUAL_EVIDENCE_REQUIRED','human evidence remains human');
    const blocked=decide({phase:'PRE_PUBLICATION',publicationState:'UNKNOWN',frozenVerifier:SHA_A,currentControlPlane:SHA_A,expectedProduction:SHA_B,candidateProduction:SHA_C,observedProduction:SHA_D});
    equal(blocked.disposition,'BLOCKED_IDENTITY_MOVED','unexpected production movement blocker');
    for(const result of [safe,fresh,recovery,manual,blocked]) equal(result.authorityMutation,'NONE','recovery decision authority mutation');
    pass(assertions,'R2.7-C-recovery-decision-matrix');

    const decisionTool=path.join(REPO,'products/simcore/tooling/release-recovery-decision.mjs');
    const decisionRun=spawnSync(process.execPath,[decisionTool,'--root',tempRoot,'--phase','PRE_PUBLICATION','--frozen-verifier',SHA_A,'--current-control-plane',SHA_D,'--expected-production',SHA_B,'--candidate-production',SHA_C,'--observed-production',SHA_B,'--publication-state','UNPUBLISHED','--report','reports/decision.json'],{cwd:tempCwd,encoding:'utf8'});
    equal(decisionRun.status,0,`recovery decision cross-root exit ${decisionRun.stderr}`);
    assert(fs.existsSync(path.join(tempRoot,'reports/decision.json')),'decision report must be below --root');
    assert(!fs.existsSync(path.join(tempCwd,'reports/decision.json')),'decision report escaped into cwd');
    pass(assertions,'R2.7-B-cwd-not-root-cli-control');

    const record=JSON.parse(fs.readFileSync(path.join(REPO,'products/simcore/releases/records/simcore-v0.67.0-new-02.json'),'utf8'));
    const receipt=JSON.parse(fs.readFileSync(path.join(REPO,'products/simcore/releases/state-receipts/simcore-v0.67.0-new-02.json'),'utf8'));
    const proof=deriveOperationalProof(record,receipt);
    equal(proof.operationallyProven,true,'first-use proof derivation');
    equal(proof.releaseAuthority,'RS2_4_PERMANENT','first-use proof authority');
    equal(proof.authorityMutation,'NONE','proof authority mutation');
    const proofTool=path.join(REPO,'products/simcore/tooling/release-operational-proof.mjs');

    const proofRoot=path.join(tempRoot,'proof-negative');
    writeJson(path.join(proofRoot,'records',`${record.releaseId}.json`),record);
    writeJson(path.join(proofRoot,'receipts',`${record.releaseId}.json`),receipt);
    const proofRun=spawnSync(process.execPath,[proofTool,'--root',proofRoot,'--record',`records/${record.releaseId}.json`,'--receipt',`receipts/${record.releaseId}.json`,'--report','reports/proof.json'],{cwd:tempCwd,encoding:'utf8'});
    assert(proofRun.status!==0,'copied receipt with mismatched canonical record path must fail closed');
    pass(assertions,'R2.7-A-operational-proof-fail-closed');

    const proofPositiveRoot=path.join(tempRoot,'proof-positive');
    const recordRel=`products/simcore/releases/records/${record.releaseId}.json`;
    const receiptRel=`products/simcore/releases/state-receipts/${record.releaseId}.json`;
    writeJson(path.join(proofPositiveRoot,recordRel),record);
    writeJson(path.join(proofPositiveRoot,receiptRel),receipt);
    const proofPositive=spawnSync(process.execPath,[proofTool,'--root',proofPositiveRoot,'--record',recordRel,'--receipt',receiptRel,'--report','reports/proof.json'],{cwd:tempCwd,encoding:'utf8'});
    equal(proofPositive.status,0,`operational proof cross-root exit ${proofPositive.stderr}`);
    const proofReport=JSON.parse(fs.readFileSync(path.join(proofPositiveRoot,'reports/proof.json'),'utf8'));
    equal(proofReport.operationallyProven,true,'operational proof CLI derivation');
    assert(!fs.existsSync(path.join(tempCwd,'reports/proof.json')),'proof report escaped into cwd');
    pass(assertions,'R2.7-A-operational-proof-cross-root-pass');

    const recoverySource=fs.readFileSync(decisionTool,'utf8');
    const proofSource=fs.readFileSync(proofTool,'utf8');
    for(const source of [recoverySource,proofSource]) for(const token of ['release-publish.mjs','repo-main-write.py','git push','force-with-lease','setInterval(','setTimeout(','api.github.com']) assert(!source.includes(token),`R2.7 owner gained forbidden authority: ${token}`);
    pass(assertions,'R2.7-authority-automation-none');

    const status=JSON.parse(fs.readFileSync(path.join(REPO,'products/simcore/releases/R_V2_7_EVIDENCE_DERIVED_OPERATIONS_STATUS.json'),'utf8'));
    equal(status.designFrozen,true,'R2.7 design freeze');
    equal(status.implementationAuthorized,true,'R2.7 implementation authorization');
    if(status.activationAuthorized===false){
      equal(status.activationGate,'FIRST_GENUINE_R2_7_OPERATIONAL_CONFIRMATION_PENDING','R2.7 pending activation gate');
      equal(status.implementation.operationalActivationProof,'PENDING_FIRST_GENUINE_R2_7_RELEASE','R2.7 pending proof marker');
    } else {
      equal(status.activationAuthorized,true,'R2.7 documentary activation consumed');
      equal(status.status,'OPERATIONALLY_PROVEN_FIRST_USE_COMPLETE','R2.7 proven lifecycle status');
      equal(status.activationFieldSemantics,'DOCUMENTARY_FIRST_USE_GATE_CONSUMED','R2.7 activation field semantics');
      equal(status.activationGate,'CONSUMED_BY_FIRST_GENUINE_R2_7_RELEASE','R2.7 consumed activation gate');
      equal(status.operationallyProven,true,'R2.7 operational proof durable');
      equal(status.implementation.operationalActivationProof.result,'PASS','R2.7 stored proof result');
    }
    equal(status.preservedAuthorities.productionPublisherCount,1,'R2.7 publisher count');
    equal(status.preservedAuthorities.mainGateway,'repo-main-write.py','R2.7 main gateway');
    equal(status.runtimeMutation,'NONE','R2.7 runtime mutation');
    equal(status.releaseSimcoreMutation,'NONE','R2.7 release-simcore mutation');
    pass(assertions,'R2.7-frozen-authority-budget');

    const permanent=fs.readFileSync(path.join(REPO,'.github/workflows/simcore-release-permanent.yml'),'utf8');
    const preplay=permanent.indexOf('release-state-preplay.mjs');
    const publisher=permanent.indexOf('release-publish.mjs');
    assert(preplay>=0&&publisher>preplay,'R2.6 preplay-before-publish safety moved');
    equal((permanent.match(/release-publish\.mjs/g)||[]).length,1,'publisher count in permanent workflow');
    for(const token of ['Derive bounded recovery guidance on failure','release-recovery-decision.mjs','FROZEN_VERIFIER','CURRENT_CONTROL_PLANE','OBSERVED_PRODUCTION','continue-on-error: true']) assert(permanent.includes(token),`R2.7 workflow routing token missing: ${token}`);
    pass(assertions,'R2.7-D-thin-permanent-recovery-routing');
    pass(assertions,'R2.7-preserves-r2-6-safety-wall');
  } finally {
    fs.rmSync(tempRoot,{recursive:true,force:true});
    fs.rmSync(tempCwd,{recursive:true,force:true});
  }

  return {coverage:'EXECUTABLE',status:'PASS',assertions};
}
