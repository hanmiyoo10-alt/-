'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const e22 = require('../tools/release_closure_e22.cjs');

const SHA_5100='478fcd368734b1cf1aa5a98932cb34bb29f1d1e4';
const SHA_5101='fa27d1dd6eaa17a8388c96da475ea3965e0572c8';
const MERGE_5100='ca84419a176a047482d500497d2bba44926f41ef';
const MERGE_5101='5aca8a7a625d44d4c6253e0ff724ced718aab4a0';

function deployComment(id, release, mergeSha, releaseSha) {
  return {id,body:[
    'UD_E9_DEPLOYED:'+releaseSha,
    'UD_RELEASE_DEPLOYED',
    `release: ${release}`,
    `main_merge_sha: ${mergeSha}`,
    `release_branch_sha: ${releaseSha}`,
    'exact_byte_parity: VERIFIED',
    'physical_verification: PENDING',
    'state: DEPLOYED',
  ].join('\n')};
}
function manifest(productVersion,engineVersion,managerVersion){return {productVersion,components:{bridge:{requiredVersion:engineVersion},bridgeManager:{version:managerVersion}},contracts:{snapshot:1,recentRequest:1}};}
function spec(productVersion,engineVersion,managerVersion){return {productVersion,engineVersion,managerVersion,contracts:{snapshot:1,recentRequest:1}};}
function projection100(extraComments=[]){return e22.projectReleaseClosure({request:{issueNumber:1549,releaseVersion:'3.0.0-alpha.5.100',prNumber:1557},comments:[deployComment(5552549999,'3.0.0-alpha.5.100',MERGE_5100,SHA_5100),...extraComments],pr:{number:1557,merged:true,mergeCommitSha:MERGE_5100},productionSha:SHA_5100,productionManifest:manifest('3.0.0-alpha.5.100','1.6.35','1.3.6'),releaseSpecIdentity:spec('3.0.0-alpha.5.100','1.6.35','1.3.6')});}
function projection101(extraComments=[]){return e22.projectReleaseClosure({request:{issueNumber:1604,releaseVersion:'3.0.0-alpha.5.101',prNumber:1606},comments:[deployComment(5553836318,'3.0.0-alpha.5.101',MERGE_5101,SHA_5101),...extraComments],pr:{number:1606,merged:true,mergeCommitSha:MERGE_5101},productionSha:SHA_5101,productionManifest:manifest('3.0.0-alpha.5.101','1.6.36','1.3.6'),releaseSpecIdentity:spec('3.0.0-alpha.5.101','1.6.36','1.3.6')});}

const receipt100=e22.renderPhysicalAcceptanceReceipt({release:'3.0.0-alpha.5.100',releaseBranchSha:SHA_5100,verdict:'ACCEPTED',observedProduct:'3.0.0-alpha.5.100',observedEngine:'1.6.35',observedManager:'1.3.6',health:'PASS',feature:'PASS',sourceEvidence:'#1540 comment 5553562006',note:'structured E22 bootstrap receipt from existing PASS_PHYSICAL'});
const parsed=e22.inspectPhysicalReceipt({id:5554030643,body:receipt100});
assert.equal(parsed.present,true);
assert.equal(parsed.findings.length,0);
assert.equal(parsed.receipt.commentId,5554030643);

const accepted100=projection100([{id:5554030643,body:receipt100}]);
assert.equal(accepted100.execution.state,'DEPLOYED');
assert.equal(accepted100.physical.state,'ACCEPTED');
assert.equal(accepted100.composite.state,'ACCEPTED');
assert.equal(accepted100.acceptedIdentity.releaseSha,SHA_5100);
assert.equal(accepted100.acceptedIdentity.commentId,5554030643);

const pending101=projection101();
assert.equal(pending101.execution.state,'DEPLOYED');
assert.equal(pending101.physical.state,'PENDING');
assert.equal(pending101.composite.state,'DEPLOYED_PENDING_PHYSICAL');
assert.equal(pending101.acceptedIdentity,null);
const current=e22.resolveLatestAccepted([accepted100,pending101]);
assert.equal(current.latestDeployedIdentity.productVersion,'3.0.0-alpha.5.101');
assert.equal(current.latestAcceptedIdentity.productVersion,'3.0.0-alpha.5.100');
assert.equal(current.latestAcceptedIdentity.releaseSha,SHA_5100);

const reject101=e22.renderPhysicalAcceptanceReceipt({release:'3.0.0-alpha.5.101',releaseBranchSha:SHA_5101,verdict:'REJECTED',observedProduct:'3.0.0-alpha.5.101',observedEngine:'1.6.36',observedManager:'1.3.6',health:'FAIL',feature:'FAIL'});
const rejected=projection101([{id:6001,body:reject101}]);
assert.equal(rejected.composite.state,'DEPLOYED_PHYSICAL_REJECTED');
assert.equal(e22.resolveLatestAccepted([accepted100,rejected]).latestAcceptedIdentity.productVersion,'3.0.0-alpha.5.100');

const accept101=e22.renderPhysicalAcceptanceReceipt({release:'3.0.0-alpha.5.101',releaseBranchSha:SHA_5101,verdict:'ACCEPTED',observedProduct:'3.0.0-alpha.5.101',observedEngine:'1.6.36',observedManager:'1.3.6',health:'PASS',feature:'PASS'});
const accepted101=projection101([{id:6002,body:accept101}]);
assert.equal(e22.resolveLatestAccepted([accepted100,accepted101]).latestAcceptedIdentity.productVersion,'3.0.0-alpha.5.101');

const wrongSha=e22.renderPhysicalAcceptanceReceipt({release:'3.0.0-alpha.5.101',releaseBranchSha:'1'.repeat(40),verdict:'ACCEPTED',observedProduct:'3.0.0-alpha.5.101',observedEngine:'1.6.36',observedManager:'1.3.6',health:'PASS',feature:'PASS'});
const wrongShaProjection=projection101([{id:6003,body:wrongSha}]);
assert.equal(wrongShaProjection.composite.state,'CONFLICT');
assert.ok(wrongShaProjection.findings.some((row)=>row.code==='E22_PHYSICAL_RELEASE_SHA_MISMATCH'));

const wrongVersion=e22.renderPhysicalAcceptanceReceipt({release:'3.0.0-alpha.5.100',releaseBranchSha:SHA_5101,verdict:'ACCEPTED',observedProduct:'3.0.0-alpha.5.100',observedEngine:'1.6.36',observedManager:'1.3.6',health:'PASS',feature:'PASS'});
const wrongVersionProjection=projection101([{id:6004,body:wrongVersion}]);
assert.equal(wrongVersionProjection.composite.state,'CONFLICT');
assert.ok(wrongVersionProjection.findings.some((row)=>row.code==='E22_PHYSICAL_RELEASE_VERSION_MISMATCH'));

const contradictory=projection101([{id:6005,body:accept101},{id:6006,body:reject101}]);
assert.equal(contradictory.composite.state,'CONFLICT');
assert.ok(contradictory.findings.some((row)=>row.code==='E22_PHYSICAL_VERDICT_CONFLICT'));

const before=e22.projectReleaseClosure({request:{issueNumber:1604,releaseVersion:'3.0.0-alpha.5.101',prNumber:1606},comments:[{id:6007,body:accept101}],pr:{number:1606,merged:false,mergeCommitSha:''},productionSha:SHA_5101,productionManifest:manifest('3.0.0-alpha.5.101','1.6.36','1.3.6'),releaseSpecIdentity:spec('3.0.0-alpha.5.101','1.6.36','1.3.6')});
assert.equal(before.composite.state,'CONFLICT');
assert.ok(before.findings.some((row)=>row.code==='E22_PHYSICAL_BEFORE_DEPLOYMENT'));

const duplicateDeployment=projection101([deployComment(7001,'3.0.0-alpha.5.101','2'.repeat(40),SHA_5101)]);
assert.equal(duplicateDeployment.composite.state,'CONFLICT');
assert.ok(duplicateDeployment.findings.some((row)=>row.code==='E22_DEPLOYMENT_IDENTITY_CONFLICT'));

const source=fs.readFileSync('plugins/usage-dashboard/tools/release_closure_e22.cjs','utf8');
for(const forbidden of ["require('node:fs')","require('node:http')","require('node:https')","require('node:child_process')"]){
  assert.ok(!source.includes(forbidden),`E22 projector must remain pure: ${forbidden}`);
}
const reconcile=fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml','utf8');
for(const token of ['UD_E9_DEPLOYED:','physical_verification: PENDING','{"state":"closed","state_reason":"completed"}']) {
  assert.ok(reconcile.includes(token),`E22 must preserve existing E9 deployment closure invariant: ${token}`);
}

console.log('usage-dashboard E22 durable release closure convergence: OK · accepted 5.100 + deployed/pending 5.101 · strict physical binding · conflict fail-closed · E9 auto-close preserved');
