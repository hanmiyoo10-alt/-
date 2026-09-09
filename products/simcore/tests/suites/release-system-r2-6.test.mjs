import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseCheckedPrHandoff } from '../../tooling/release-state-main-gate.mjs';
import { assert, equal } from '../../tooling/assertions.mjs';

function count(text, token) { return text.split(token).length - 1; }
function between(text, startToken, endToken = null) {
  const start=text.indexOf(startToken);
  assert(start>=0,`workflow section missing: ${startToken}`);
  const end=endToken ? text.indexOf(endToken,start+startToken.length) : text.length;
  assert(endToken===null||end>start,`workflow section end missing: ${endToken}`);
  return text.slice(start,end);
}

export async function runSuite() {
  const assertions=[];
  const pass=(id)=>assertions.push({id,status:'PASS'});

  const owner=fs.readFileSync('products/simcore/tooling/release-state-converge.mjs','utf8');
  for(const token of [
    "'PREPUBLICATION_SIMULATION'",
    "envelopeKind:'PostPublishStateEnvelope'",
    'persistentPayloadManifest:payloadManifest',
    'expectedDurableClaims',
    "mode === 'PREPUBLICATION_SIMULATION' ? 'NONE' : 'ALREADY_PUBLISHED_UPSTREAM'",
  ]) assert(owner.includes(token),`R2.6 semantic owner token missing: ${token}`);
  for(const token of ['release-publish.mjs','git push --force','force-with-lease','+refs/heads/release-simcore']) assert(!owner.includes(token),`semantic owner gained publication authority: ${token}`);
  pass('R2.6-B-one-post-publish-state-envelope');

  const preplay=fs.readFileSync('products/simcore/tooling/release-state-preplay.mjs','utf8');
  for(const token of ['PREPUBLICATION_SIMULATION','validateEnvelopePolicy','R2_6_PREPLAY_CLOSURE_FAIL','RS2_6_POST_PUBLISH_PREPLAY_PASS']) assert(preplay.includes(token),`preplay token missing: ${token}`);
  for(const token of ['release-publish.mjs','repo-main-write.py','git push','setInterval(','setTimeout(','fetch(','api.github.com']) assert(!preplay.includes(token),`preplay gained forbidden authority: ${token}`);
  pass('R2.6-A-preplay-is-readonly-authority');

  const gate=fs.readFileSync('products/simcore/tooling/release-state-main-gate.mjs','utf8');
  for(const token of ['validateEnvelopePolicy','R2_6_STATE_GIT_DIFF_MISMATCH',"['--allow', rel]",'repo-main-write.py']) assert(gate.includes(token),`main-gate token missing: ${token}`);
  for(const token of ['release-publish.mjs','force-with-lease','+refs/heads/release-simcore']) assert(!gate.includes(token),`main gate gained publication authority: ${token}`);
  pass('R2.6-C-shared-main-gate-adapter');

  const parsed=parseCheckedPrHandoff(9,`MAIN_WRITE_NATIVE_PROTECTION_ACTIVE: branch=main required=Required\nMAIN_WRITE_CHECKED_PR_REQUIRED: base=${'a'.repeat(40)} commit=${'b'.repeat(40)} ref=simcore-rs2-6/test-ref\n`,'');
  equal(parsed.base,'a'.repeat(40),'checked PR base parse');
  equal(parsed.commit,'b'.repeat(40),'checked PR commit parse');
  equal(parsed.ref,'simcore-rs2-6/test-ref','checked PR ref parse');
  let malformedBlocked=false;
  try { parseCheckedPrHandoff(9,`MAIN_WRITE_CHECKED_PR_REQUIRED: base=${'a'.repeat(40)} commit=${'b'.repeat(40)} ref=bad\n`,''); } catch { malformedBlocked=true; }
  assert(malformedBlocked,'checked PR handoff without native protection was accepted');
  pass('R2.6-C2-checked-pr-handoff-structured');

  const checked=fs.readFileSync('products/simcore/tooling/release-state-checked-pr.mjs','utf8');
  for(const token of ['PR_RECOVERY','CHECKED_PR_MERGED','R2_6_CHECKED_PR_MAIN_MOVED','merge_method=merge','RS2_6_POST_PUBLISH_DURABLE_MAIN_PASS']) assert(checked.includes(token),`checked PR consumer token missing: ${token}`);
  for(const token of ['HEAD:main','force-with-lease','+refs/heads/main','update-ref main']) assert(!checked.includes(token),`checked PR consumer gained forbidden main bypass: ${token}`);
  const integration=spawnSync(process.execPath,['products/simcore/tests/release-state-checked-pr.integration.test.mjs'],{encoding:'utf8',maxBuffer:8*1024*1024});
  assert(integration.status===0,`checked PR integration failed: ${integration.stdout} ${integration.stderr}`);
  assert(integration.stdout.includes('R2_6_CHECKED_PR_INTEGRATION_PASS'),'checked PR integration proof token missing');
  pass('R2.6-C3-checked-pr-consumer-integration');

  const reobserve=fs.readFileSync('products/simcore/tooling/release-state-reobserve.mjs','utf8');
  for(const token of ['verifyPayloadHashes','verifyCurrentDevelopment','verifyDurableObjects','RS2_6_POST_PUBLISH_DURABLE_MAIN_PASS']) assert(reobserve.includes(token),`reobserver token missing: ${token}`);
  for(const token of ['repo-main-write.py','release-publish.mjs','spawnSync','git push','fetch(','api.github.com']) assert(!reobserve.includes(token),`reobserver gained write/network authority: ${token}`);
  pass('R2.6-D-shared-durable-reobserver-readonly');

  const policy=JSON.parse(fs.readFileSync('products/simcore/state-sync/writer-policy.json','utf8'));
  equal(policy.policyVersion,2,'R2.6 writer policy version');
  equal(policy.postPublishState.mainGateway,'scripts/repo-main-write.py','existing main gateway retained');
  assert(policy.postPublishState.exactPaths.includes('product-manifest.json'),'manifest not allowed by policy');
  assert(policy.postPublishState.prefixPaths.includes('products/simcore/releases/records/'),'record prefix not allowed by policy');
  assert(policy.postPublishState.prefixPaths.includes('products/simcore/releases/state-receipts/'),'receipt prefix not allowed by policy');
  pass('R2.6-B-owner-manifest-plus-static-policy');

  const permanent=fs.readFileSync('.github/workflows/simcore-release-permanent.yml','utf8');
  const recovery=fs.readFileSync('.github/workflows/simcore-release-state-sync.yml','utf8');
  const preplayIndex=permanent.indexOf('Preplay post-publish state before publication');
  const publishIndex=permanent.indexOf('Publish through permanent controller');
  assert(preplayIndex>=0&&publishIndex>preplayIndex,'preplay is not before publication');
  equal(count(permanent,'release-publish.mjs'),1,'single permanent publisher call');
  for(const token of ['release-state-main-gate.mjs','release-state-reobserve.mjs','release-state-checked-pr.mjs','--mode PERMANENT']) assert(permanent.includes(token),`permanent workflow shared boundary missing: ${token}`);
  for(const token of ['release-state-main-gate.mjs','release-state-reobserve.mjs','release-state-checked-pr.mjs','--mode RECOVERY']) assert(recovery.includes(token),`recovery workflow shared boundary missing: ${token}`);
  const ci=fs.readFileSync('.github/workflows/simcore-ci.yml','utf8');
  for(const token of ['PR_RECOVERY','pr_base_commit','pr_head_commit','VERIFIER_PROFILE=PR_MAIN',"steps.profile.outputs.profile == 'PR_RECOVERY'"]) assert(ci.includes(token),`PR_RECOVERY CI contract missing: ${token}`);
  for(const workflow of [permanent,recovery]) for(const token of ['checked_pr_required','--mode consume','--mode cleanup','pull-requests: write']) assert(workflow.includes(token),`checked PR caller parity missing: ${token}`);
  const permanentPost=between(permanent,'\n  post-publish-state:','\n  required:');
  const recoveryPost=between(recovery,'\n  permanent-recovery:');
  for(const workflow of [permanentPost,recoveryPost]) {
    for(const legacy of [
      'persistentPayloadAllowlist',
      "assert p['disposition']",
      '--allow product-manifest.json',
      'RECEIPT="products/simcore/releases/state-receipts/${RELEASE_ID}.json"',
      'durable-receipt.json',
    ]) assert(!workflow.includes(legacy),`workflow-local post-publish contract survived: ${legacy}`);
  }
  pass('R2.6-E-thin-permanent-recovery-orchestration');

  const status=JSON.parse(fs.readFileSync('products/simcore/releases/R_V2_6_POST_PUBLISH_BOUNDARY_CONVERGENCE_STATUS.json','utf8'));
  equal(status.implementationAuthorized,true,'R2.6 implementation authorization');
  equal(status.activationAuthorized,true,'R2.6 documentary first-use gate consumed');
  equal(status.activationFieldSemantics,'DOCUMENTARY_FIRST_USE_GATE_CONSUMED','R2.6 activation field semantics');
  equal(status.operationallyProven,true,'R2.6 operational proof state');
  const proof=status.implementation?.operationalActivationProof;
  assert(proof&&typeof proof==='object','R2.6 operational proof missing');
  equal(proof.releaseId,'simcore-v0.67.0-new-02','R2.6 first-use release id');
  equal(proof.publisherRunId,'33249672791','R2.6 first-use publisher run');
  const record=JSON.parse(fs.readFileSync(proof.releaseRecord,'utf8'));
  const receipt=JSON.parse(fs.readFileSync(proof.stateReceipt,'utf8'));
  equal(record.releaseId,proof.releaseId,'R2.6 proof record release');
  equal(record.publisherRunId,proof.publisherRunId,'R2.6 proof record publisher');
  equal(record.productionCommit,proof.productionCommit,'R2.6 proof record commit');
  equal(record.productionBlob,proof.productionBlob,'R2.6 proof record blob');
  equal(record.releaseState,'LIVE_PENDING','R2.6 proof record lifecycle');
  equal(record.stateSyncStatus,'PASS','R2.6 proof record state sync');
  equal(receipt.releaseId,proof.releaseId,'R2.6 proof receipt release');
  equal(receipt.publisherRunId,proof.publisherRunId,'R2.6 proof receipt publisher');
  equal(receipt.productionCommit,proof.productionCommit,'R2.6 proof receipt commit');
  equal(receipt.productionBlob,proof.productionBlob,'R2.6 proof receipt blob');
  equal(receipt.releaseAuthority,'RS2_4_PERMANENT','R2.6 proof publisher authority');
  equal(receipt.result,'PASS','R2.6 proof receipt result');
  equal(status.preservedAuthorities.productionPublisherCount,1,'publisher count changed');
  equal(status.preservedAuthorities.mainGateway,'repo-main-write.py','main writer authority changed');
  equal(status.runtimeMutation,'NONE','runtime mutation forbidden');
  equal(status.releaseSimcoreMutation,'NONE','release-simcore mutation forbidden');
  pass('R2.6-authority-and-first-use-proof-converged');

  return {coverage:'EXECUTABLE',status:'PASS',assertions};
}
