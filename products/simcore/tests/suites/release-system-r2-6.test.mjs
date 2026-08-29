import fs from 'node:fs';
import { assert, equal } from '../../tooling/assertions.mjs';

function count(text, token) { return text.split(token).length - 1; }

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
  for(const token of ['release-state-main-gate.mjs','release-state-reobserve.mjs','--mode PERMANENT']) assert(permanent.includes(token),`permanent workflow shared boundary missing: ${token}`);
  for(const token of ['release-state-main-gate.mjs','release-state-reobserve.mjs','--mode RECOVERY']) assert(recovery.includes(token),`recovery workflow shared boundary missing: ${token}`);
  for(const workflow of [permanent,recovery]) {
    for(const legacy of [
      'persistentPayloadAllowlist',
      "assert p['disposition']",
      '--allow product-manifest.json',
      'RECEIPT="products/simcore/releases/state-receipts/${RELEASE_ID}.json"',
    ]) assert(!workflow.includes(legacy),`workflow-local post-publish contract survived: ${legacy}`);
  }
  pass('R2.6-E-thin-permanent-recovery-orchestration');

  const status=JSON.parse(fs.readFileSync('products/simcore/releases/R_V2_6_POST_PUBLISH_BOUNDARY_CONVERGENCE_STATUS.json','utf8'));
  equal(status.implementationAuthorized,true,'R2.6 implementation authorization');
  equal(status.activationAuthorized,false,'R2.6 activation must remain separately gated');
  equal(status.preservedAuthorities.productionPublisherCount,1,'publisher count changed');
  equal(status.preservedAuthorities.mainGateway,'repo-main-write.py','main writer authority changed');
  equal(status.runtimeMutation,'NONE','runtime mutation forbidden');
  equal(status.releaseSimcoreMutation,'NONE','release-simcore mutation forbidden');
  pass('R2.6-authority-and-activation-boundary-preserved');

  return {coverage:'EXECUTABLE',status:'PASS',assertions};
}
