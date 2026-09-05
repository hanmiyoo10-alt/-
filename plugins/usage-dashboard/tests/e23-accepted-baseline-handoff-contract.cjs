'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const e22 = require('../tools/release_closure_e22.cjs');
const e23 = require('../tools/release_baseline_handoff_e23.cjs');
const e20 = require('../tools/release_evidence_contract_e20.cjs');
const e21 = require('../tools/release_evidence_view_e21.cjs');

const SHA_5100='478fcd368734b1cf1aa5a98932cb34bb29f1d1e4';
const SHA_5101='fa27d1dd6eaa17a8388c96da475ea3965e0572c8';

const accepted100Projection = Object.freeze({
  composite:Object.freeze({state:'ACCEPTED'}),
  deployedIdentity:Object.freeze({productVersion:'3.0.0-alpha.5.100',releaseSha:SHA_5100,issue:1549,prNumber:1557,mainMergeSha:'ca84419a176a047482d500497d2bba44926f41ef'}),
  acceptedIdentity:Object.freeze({productVersion:'3.0.0-alpha.5.100',releaseSha:SHA_5100,issue:1549,commentId:5554030643,verdict:'ACCEPTED'}),
});
const pending101Projection = Object.freeze({
  composite:Object.freeze({state:'DEPLOYED_PENDING_PHYSICAL'}),
  deployedIdentity:Object.freeze({productVersion:'3.0.0-alpha.5.101',releaseSha:SHA_5101,issue:1604,prNumber:1606,mainMergeSha:'5aca8a7a625d44d4c6253e0ff724ced718aab4a0'}),
  acceptedIdentity:null,
});
const rejected101Projection = Object.freeze({
  composite:Object.freeze({state:'DEPLOYED_PHYSICAL_REJECTED'}),
  deployedIdentity:pending101Projection.deployedIdentity,
  acceptedIdentity:null,
});
const conflict101Projection = Object.freeze({
  composite:Object.freeze({state:'CONFLICT'}),
  deployedIdentity:null,
  acceptedIdentity:null,
});
const accepted101Projection = Object.freeze({
  composite:Object.freeze({state:'ACCEPTED'}),
  deployedIdentity:pending101Projection.deployedIdentity,
  acceptedIdentity:Object.freeze({productVersion:'3.0.0-alpha.5.101',releaseSha:SHA_5101,issue:1604,commentId:6002,verdict:'ACCEPTED'}),
});

// Real current repository shape: deployed 5.101 remains PENDING while accepted baseline stays 5.100.
const currentResolution = e22.resolveLatestAccepted([accepted100Projection,pending101Projection]);
assert.equal(currentResolution.latestDeployedIdentity.productVersion,'3.0.0-alpha.5.101');
assert.equal(currentResolution.latestAcceptedIdentity.productVersion,'3.0.0-alpha.5.100');
const currentHandoff = e23.resolveAcceptedBaselineHandoff(currentResolution,{targetProductVersion:'3.0.0-alpha.5.900'}); // synthetic non-reserved target used only for order validation
assert.equal(currentHandoff.ok,true);
assert.equal(currentHandoff.findings.length,0);
assert.equal(currentHandoff.acceptedIdentity.productVersion,'3.0.0-alpha.5.100');
assert.equal(currentHandoff.releaseEvidence.acceptedBaseline.productVersion,'3.0.0-alpha.5.100');
assert.equal(currentHandoff.releaseEvidence.latestInstalled.productVersion,'3.0.0-alpha.5.100');
assert.equal(currentHandoff.releaseEvidence.acceptedBaseline.releaseSha,SHA_5100);
assert.equal(currentHandoff.releaseEvidence.latestInstalled.releaseSha,SHA_5100);
assert.equal(currentHandoff.releaseEvidence.acceptedBaseline.issue,1549);
assert.equal(currentHandoff.releaseEvidence.acceptedBaseline.commentId,5554030643);
assert.equal(currentHandoff.releaseEvidence.acceptedBaseline.verdict,'accepted');
assert.equal(currentHandoff.releaseEvidence.latestInstalled.verdict,'accepted');
assert.deepEqual(Object.keys(currentHandoff.releaseEvidence).sort(),['acceptedBaseline','latestInstalled','schemaVersion']);
assert.ok(Object.isFrozen(currentHandoff));
assert.ok(Object.isFrozen(currentHandoff.releaseEvidence));
assert.ok(Object.isFrozen(currentHandoff.releaseEvidence.acceptedBaseline));

// E23 output is exactly the existing E20 contract and E21 needs no E23 branch.
assert.deepEqual(e20.inspectReleaseEvidence(currentHandoff.releaseEvidence,{targetProductVersion:'3.0.0-alpha.5.900'}),[]);
const view = e21.resolveReleaseEvidenceView({productVersion:'3.0.0-alpha.5.900',releaseEvidence:currentHandoff.releaseEvidence});
assert.equal(view.mode,'structured');
assert.equal(view.acceptedBaseline.productVersion,'3.0.0-alpha.5.100');
assert.equal(view.latestInstalled.productVersion,'3.0.0-alpha.5.100');
assert.equal(view.acceptedBaseline.commentId,5554030643);

// Newer REJECTED or CONFLICT state cannot displace an exact prior accepted baseline.
for (const newer of [rejected101Projection, conflict101Projection]) {
  const resolution = e22.resolveLatestAccepted([accepted100Projection,newer]);
  const handoff = e23.resolveAcceptedBaselineHandoff(resolution,{targetProductVersion:'3.0.0-alpha.5.900'});
  assert.equal(handoff.ok,true);
  assert.equal(handoff.releaseEvidence.acceptedBaseline.productVersion,'3.0.0-alpha.5.100');
  assert.equal(handoff.releaseEvidence.latestInstalled.productVersion,'3.0.0-alpha.5.100');
}

// Once exact 5.101 physical acceptance exists, the same derivation advances automatically.
const accepted101Resolution = e22.resolveLatestAccepted([accepted100Projection,accepted101Projection]);
const accepted101Handoff = e23.resolveAcceptedBaselineHandoff(accepted101Resolution,{targetProductVersion:'3.0.0-alpha.5.900'});
assert.equal(accepted101Handoff.ok,true);
assert.equal(accepted101Handoff.acceptedIdentity.productVersion,'3.0.0-alpha.5.101');
assert.equal(accepted101Handoff.releaseEvidence.acceptedBaseline.productVersion,'3.0.0-alpha.5.101');
assert.equal(accepted101Handoff.releaseEvidence.latestInstalled.releaseSha,SHA_5101);
assert.equal(accepted101Handoff.releaseEvidence.acceptedBaseline.commentId,6002);

// No accepted baseline and incomplete accepted identities fail closed.
const missing = e23.resolveAcceptedBaselineHandoff({latestAcceptedIdentity:null,latestDeployedIdentity:pending101Projection.deployedIdentity,findings:[]});
assert.equal(missing.ok,false);
assert.ok(missing.findings.some((row)=>row.code==='E23_ACCEPTED_BASELINE_MISSING'));
for (const [field,value] of [
  ['productVersion',''],['releaseSha','bad'],['issue',0],['commentId',0],['verdict','REJECTED'],
]) {
  const broken={...accepted100Projection.acceptedIdentity,[field]:value};
  const result=e23.resolveAcceptedBaselineHandoff({latestAcceptedIdentity:broken,latestDeployedIdentity:pending101Projection.deployedIdentity,findings:[]});
  assert.equal(result.ok,false,field);
  assert.ok(result.findings.some((row)=>row.code==='E23_ACCEPTED_IDENTITY_INCOMPLETE'),field);
}

// E22 accepted-baseline ambiguity remains fail-closed instead of choosing a tuple.
const ambiguous=e23.resolveAcceptedBaselineHandoff({
  latestAcceptedIdentity:accepted100Projection.acceptedIdentity,
  latestDeployedIdentity:pending101Projection.deployedIdentity,
  findings:[{code:'E22_ACCEPTED_BASELINE_AMBIGUOUS',detail:'3.0.0-alpha.5.100'}],
});
assert.equal(ambiguous.ok,false);
assert.ok(ambiguous.findings.some((row)=>row.code==='E23_ACCEPTED_ORDER_AMBIGUOUS'));

// Same-version accepted/deployed SHA contradiction cannot be hand-waved away.
const identityConflict=e23.resolveAcceptedBaselineHandoff({
  latestAcceptedIdentity:accepted100Projection.acceptedIdentity,
  latestDeployedIdentity:{...accepted100Projection.deployedIdentity,releaseSha:'1'.repeat(40)},
  findings:[],
});
assert.equal(identityConflict.ok,false);
assert.ok(identityConflict.findings.some((row)=>row.code==='E23_ACCEPTED_IDENTITY_CONFLICT'));

// Target order and manual releaseEvidence mismatch can be checked shift-left by callers.
const invalidTarget=e23.resolveAcceptedBaselineHandoff(currentResolution,{targetProductVersion:'not-a-release'});
assert.equal(invalidTarget.ok,false);
assert.ok(invalidTarget.findings.some((row)=>row.code==='E23_RELEASE_EVIDENCE_MISMATCH'));
const sameTarget=e23.resolveAcceptedBaselineHandoff(currentResolution,{targetProductVersion:'3.0.0-alpha.5.100'});
assert.equal(sameTarget.ok,false);
assert.ok(sameTarget.findings.some((row)=>row.code==='E23_RELEASE_EVIDENCE_MISMATCH'));
const manualMismatch=JSON.parse(JSON.stringify(currentHandoff.releaseEvidence));
manualMismatch.acceptedBaseline.commentId=1;
const mismatch=e23.inspectReleaseEvidenceHandoff(manualMismatch,currentResolution,{targetProductVersion:'3.0.0-alpha.5.900'});
assert.ok(mismatch.some((row)=>row.code==='E23_RELEASE_EVIDENCE_MISMATCH'));
assert.deepEqual(e23.inspectReleaseEvidenceHandoff(currentHandoff.releaseEvidence,currentResolution,{targetProductVersion:'3.0.0-alpha.5.900'}),[]);

// Idempotent pure derivation: no new filesystem/network/process authority.
const second=e23.resolveAcceptedBaselineHandoff(currentResolution,{targetProductVersion:'3.0.0-alpha.5.900'});
assert.equal(JSON.stringify(second),JSON.stringify(currentHandoff));
const source=fs.readFileSync('plugins/usage-dashboard/tools/release_baseline_handoff_e23.cjs','utf8');
for (const forbidden of ["require('node:fs')","require('node:http')","require('node:https')","require('node:child_process')",'release_generation: E23','latest-accepted.json','accepted-baseline.json']) {
  assert.ok(!source.includes(forbidden),`E23 must remain pure and authority-neutral: ${forbidden}`);
}
assert.ok(source.includes("require('./release_evidence_contract_e20.cjs')"),'E23 must emit/validate the existing E20 shape');
assert.ok(!source.includes('release_closure_e22.cjs'),'E23 consumes E22 projection objects and must not recreate E22 parsing');

console.log('usage-dashboard E23 accepted baseline handoff: OK · E22 projection only · E20 shape reused · E21 compatible · pending/rejected/conflict hold prior accepted baseline · automatic acceptance advance');
