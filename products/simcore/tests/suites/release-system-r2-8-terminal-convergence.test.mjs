import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, deepEqual, equal } from '../../tooling/assertions.mjs';
import { resolveTerminalTransition } from '../../tooling/release-terminal-transition.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const REPO=path.resolve(HERE,'../../../..');
const RELEASE_ID='simcore-v0.68.0-new-02';
const EVIDENCE_PATH=`products/simcore/releases/live-evidence/${RELEASE_ID}.json`;
const HUMAN_DOC='docs/SIMCORE_RELEASE_SYSTEM_V2_8_IMPLEMENTATION_AUTHORIZATION_2026-08-30.md';
function readJson(rel){return JSON.parse(fs.readFileSync(path.join(REPO,rel),'utf8'));}
function clone(v){return structuredClone(v);}
function pass(assertions,id){assertions.push({id,status:'PASS'});}
function exactIdentity(record){
  return {
    schemaVersion:1,
    product:'SimCore',
    resolvedBranch:'release-simcore',
    resolvedCommit:record.productionCommit,
    latest:{path:'.synthetic/latest.js',blob:record.productionBlob},
    install:{path:'.synthetic/install.js',blob:record.productionBlob},
  };
}
function baseEvidence(record,receipt){
  return {
    schemaVersion:1,
    product:'SimCore',
    releaseId:record.releaseId,
    productionCommit:record.productionCommit,
    productionBlob:record.productionBlob,
    liveScenarioId:receipt.liveScenarioId,
    decision:'LIVE_PASS',
    checkpoint:'M2-5',
    nextPriority:'R2_8_SYNTHETIC_NEXT_PRIORITY',
    humanEvidence:[HUMAN_DOC],
    authorityConfirmation:'HUMAN_EVIDENCE',
  };
}
function resolve({evidence,record,receipt,manifest,identity,development}){
  return resolveTerminalTransition({
    evidence,
    evidencePath:EVIDENCE_PATH,
    record,
    receipt,
    manifest,
    productionIdentity:identity,
    currentDevelopmentText:development,
    availableEvidencePaths:new Set([HUMAN_DOC]),
  });
}

export async function runSuite(){
  const assertions=[];
  const record=readJson(`products/simcore/releases/records/${RELEASE_ID}.json`);
  const receipt=readJson(`products/simcore/releases/state-receipts/${RELEASE_ID}.json`);
  const manifest=readJson('product-manifest.json');
  const development=fs.readFileSync(path.join(REPO,'docs/CURRENT_DEVELOPMENT.md'),'utf8');
  const identity=exactIdentity(record);
  const evidence=baseEvidence(record,receipt);

  const eligible=resolve({evidence,record,receipt,manifest,identity,development});
  equal(eligible.disposition,'ELIGIBLE_TO_PROJECT','valid human evidence projects');
  equal(eligible.productionMutation,'NONE','terminal resolver never mutates production');
  equal(eligible.humanEvidenceMutation,'NONE','terminal resolver never creates human evidence');
  equal(eligible.authorityMutation,'HUMAN_EVIDENCE_CONSUMED_NOT_CREATED','human authority semantics');
  deepEqual(eligible.transition.expected,{validation_status:'PENDING_REAL_LONG_CHAT',current_priority:receipt.liveScenarioId},'same-checkpoint expected transition');
  deepEqual(eligible.transition.set,{validation_status:'LIVE_PASS',current_priority:evidence.nextPriority},'same-checkpoint set transition');
  equal(eligible.transition.expectedProductionCommit,record.productionCommit,'production CAS binding');
  equal(eligible.transition.evidence[0],HUMAN_DOC,'human evidence binding');
  const replacement=eligible.transition.documentReplacements[0];
  assert(development.includes(replacement.from),'pending live block must be exact current state');
  assert(replacement.to.includes('REAL_RELEASE_LIVE_PASS'),'terminal live block lifecycle');
  pass(assertions,'R2.8-valid-human-evidence-eligible');

  const advancedEvidence={...evidence,checkpoint:'M2-6'};
  const advanced=resolve({evidence:advancedEvidence,record,receipt,manifest,identity,development});
  equal(advanced.disposition,'ELIGIBLE_TO_PROJECT','explicit checkpoint advancement projects');
  equal(advanced.transition.expected.major_update_checkpoint,'M2-5','checkpoint expected CAS');
  equal(advanced.transition.set.major_update_checkpoint,'M2-6','checkpoint set exact evidence');
  pass(assertions,'R2.8-explicit-checkpoint-advance');

  const terminalManifest={...manifest,validation_status:'LIVE_PASS',current_priority:evidence.nextPriority,major_update_checkpoint:evidence.checkpoint};
  const terminalDevelopment=development.replace(replacement.from,replacement.to);
  const already=resolve({evidence,record,receipt,manifest:terminalManifest,identity,development:terminalDevelopment});
  equal(already.disposition,'ALREADY_DURABLE','same evidence is idempotent after durable state');
  equal(already.mainMutation,'NONE','idempotent no main mutation');
  pass(assertions,'R2.8-idempotent-already-durable');

  const invalidAuthority={...evidence,authorityConfirmation:'CI_EVIDENCE'};
  equal(resolve({evidence:invalidAuthority,record,receipt,manifest,identity,development}).disposition,'BLOCKED_EVIDENCE_INVALID','authority must remain human');
  pass(assertions,'R2.8-human-authority-required');

  const wrongRecord=clone(record);wrongRecord.releaseId='simcore-v0.68.0-new-99';
  equal(resolve({evidence,record:wrongRecord,receipt,manifest,identity,development}).disposition,'BLOCKED_RELEASE_BINDING_MISMATCH','release binding mismatch blocks');
  pass(assertions,'R2.8-release-binding-block');

  const wrongGate=clone(record);wrongGate.liveGate.scenarioId='WRONG_SCENARIO';
  equal(resolve({evidence,record:wrongGate,receipt,manifest,identity,development}).disposition,'BLOCKED_LIVE_GATE_MISMATCH','live gate mismatch blocks');
  pass(assertions,'R2.8-live-gate-block');

  const movedIdentity={...identity,resolvedCommit:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'};
  equal(resolve({evidence,record,receipt,manifest,identity:movedIdentity,development}).disposition,'BLOCKED_PRODUCTION_MOVED','production movement blocks');
  pass(assertions,'R2.8-production-moved-block');

  const regressedEvidence={...evidence,checkpoint:'M2-4'};
  equal(resolve({evidence:regressedEvidence,record,receipt,manifest,identity,development}).disposition,'BLOCKED_CHECKPOINT_REGRESSION','checkpoint regression blocks');
  pass(assertions,'R2.8-checkpoint-regression-block');

  const partialManifest={...manifest,validation_status:'LIVE_PASS'};
  equal(resolve({evidence,record,receipt,manifest:partialManifest,identity,development}).disposition,'BLOCKED_CURRENT_STATE_CONTRADICTION','partial terminal state blocks');
  pass(assertions,'R2.8-partial-state-block');

  const conflictingEvidence={...evidence,nextPriority:'R2_8_CONFLICTING_PRIORITY'};
  equal(resolve({evidence:conflictingEvidence,record,receipt,manifest:terminalManifest,identity,development:terminalDevelopment}).disposition,'BLOCKED_CURRENT_STATE_CONTRADICTION','conflicting second authority blocks');
  pass(assertions,'R2.8-conflicting-terminal-authority-block');

  const missingDoc=resolveTerminalTransition({
    evidence,evidencePath:EVIDENCE_PATH,record,receipt,manifest,productionIdentity:identity,currentDevelopmentText:development,availableEvidencePaths:new Set(),
  });
  equal(missingDoc.disposition,'BLOCKED_EVIDENCE_INVALID','missing durable human doc blocks');
  pass(assertions,'R2.8-human-doc-existence-block');

  const fixture=readJson('products/simcore/tests/fixtures/release-system-r2-8-terminal-convergence/contract.json');
  equal(fixture.historicalPredecessors.length,2,'v0.66/v0.67 predecessor examples preserved');
  equal(fixture.historicalPredecessors[0].transitionId,'06600-terminal-projection-v2','v0.66 predecessor identity');
  equal(fixture.historicalPredecessors[1].transitionId,'06700-terminal-projection-to-06800-authorization-review','v0.67 predecessor identity');
  equal(fixture.meta.historicalExamplesAreReadOnly,true,'historical examples remain read-only');
  pass(assertions,'R2.8-predecessor-examples-read-only');

  const resolverSource=fs.readFileSync(path.join(REPO,'products/simcore/tooling/release-terminal-transition.mjs'),'utf8');
  for(const token of ['release-publish.mjs','repo-main-write.py','git push','gh workflow run','spawnSync(','setInterval(','setTimeout(','api.github.com']){
    assert(!resolverSource.includes(token),`terminal resolver gained forbidden authority primitive: ${token}`);
  }
  assert(resolverSource.includes("authorityConfirmation!=='HUMAN_EVIDENCE'"),'human authority check missing');
  pass(assertions,'R2.8-resolver-authority-pure');

  const adminSource=fs.readFileSync(path.join(REPO,'products/simcore/tooling/admin-state-transition.mjs'),'utf8');
  assert(adminSource.includes("'major_update_checkpoint'"),'admin transition checkpoint allowlist missing');
  assert(adminSource.includes('ADMIN_TRANSITION_IDENTITY_MUTATION'),'admin transition identity guard missing');
  pass(assertions,'R2.8-existing-admin-engine-reused');

  const workflow=fs.readFileSync(path.join(REPO,'.github/workflows/simcore-r2-8-terminal-convergence.yml'),'utf8');
  for(const token of [
    "products/simcore/releases/live-evidence/*.json",
    'release-terminal-transition.mjs',
    'admin-state-transition.mjs',
    'sync-state.mjs',
    'scripts/repo-main-write.py',
    '--required-profile MAIN_HEALTH',
    '--required-job Required',
    'ALREADY_DURABLE',
    'ELIGIBLE_TO_PROJECT',
    'release-simcore',
    'cmp -s',
  ]) assert(workflow.includes(token),`terminal workflow missing contract token: ${token}`);
  assert(!workflow.includes('schedule:'),'terminal convergence must not poll');
  assert(!workflow.includes('gh workflow run'),'terminal convergence must not dispatch release workflows');
  assert(!workflow.includes('release-publish.mjs'),'terminal convergence must not publish');
  equal((workflow.match(/scripts\/repo-main-write\.py/g)||[]).length,1,'exactly one main gateway invocation');
  pass(assertions,'R2.8-thin-event-adapter-boundary');

  return {coverage:'EXECUTABLE',status:'PASS',assertions};
}
