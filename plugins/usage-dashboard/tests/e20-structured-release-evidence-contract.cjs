'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const evidence = require('../tools/release_evidence_contract_e20.cjs');
const specContract = require('../tools/release_spec_contract_e19.cjs');
const e18 = require('../tools/derived_impact_e18.cjs');

const currentProduct = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json','utf8')).productVersion;
const currentOrdinal = evidence.productOrdinal(currentProduct);
assert.ok(Number.isSafeInteger(currentOrdinal), 'current Product must be parseable by E20');
const forwardProduct = `3.0.0-alpha.5.${currentOrdinal + 1}`;
const legacyCurrent = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.96.json','utf8'));
assert.deepEqual(specContract.inspectReleaseSpec(legacyCurrent,{currentProductVersion:currentProduct}), [], 'current legacy spec must remain valid without E20 migration');

const acceptedSha = 'bfec7e60ad671adf8fa0ffb7f12387eef5a808fe';
const latestSha = '5fc75fbc0725962997f65de17db4ffaf156ba6f9';
function validEvidence() {
  return {
    schemaVersion:1,
    acceptedBaseline:{
      productVersion:'3.0.0-alpha.5.94',
      releaseSha:acceptedSha,
      verdict:'accepted',
      issue:959,
      commentId:1,
      note:'Last completed physical acceptance at source freeze.',
    },
    latestInstalled:{
      productVersion:currentProduct,
      releaseSha:latestSha,
      verdict:'unverified',
      issue:1012,
      commentId:2,
      note:'Latest installed release observed before its physical verdict was closed.',
    },
  };
}

assert.deepEqual(evidence.inspectReleaseEvidence(validEvidence(),{required:true,targetProductVersion:forwardProduct}), []);
assert.equal(evidence.compareProductVersions(currentProduct,'3.0.0-alpha.5.94') > 0, true);
const projection = evidence.formatReleaseEvidence(validEvidence());
assert.match(projection.acceptedBaseline,/Accepted physical baseline: 3\.0\.0-alpha\.5\.94/);
assert.match(projection.latestInstalled,new RegExp(`Latest installed evidence: ${currentProduct.replace(/\./g,'\\.')}`));
assert.match(projection.latestInstalled,/unverified$/);

const olderLatest = validEvidence();
olderLatest.latestInstalled.productVersion = '3.0.0-alpha.5.93';
assert.ok(evidence.inspectReleaseEvidence(olderLatest,{targetProductVersion:forwardProduct}).some((row)=>row.code === 'evidence-release-order'));

const acceptedMismatch = validEvidence();
acceptedMismatch.latestInstalled.verdict = 'accepted';
assert.ok(evidence.inspectReleaseEvidence(acceptedMismatch,{targetProductVersion:forwardProduct}).some((row)=>row.code === 'accepted-latest-identity-mismatch'));

const sameConflict = validEvidence();
sameConflict.latestInstalled = {...sameConflict.acceptedBaseline, verdict:'partial'};
assert.ok(evidence.inspectReleaseEvidence(sameConflict,{targetProductVersion:forwardProduct}).some((row)=>row.code === 'same-release-conflicting-verdict'));

const malformed = validEvidence();
malformed.acceptedBaseline.releaseSha = 'ABC';
malformed.latestInstalled.issue = 0;
malformed.latestInstalled.commentId = -1;
malformed.latestInstalled.verdict = 'maybe';
malformed.latestInstalled.note = 'x'.repeat(evidence.NOTE_LIMIT + 1);
const malformedCodes = evidence.inspectReleaseEvidence(malformed,{targetProductVersion:forwardProduct}).map((row)=>row.code);
for (const code of ['evidence-release-sha','release-evidence-issue','release-evidence-comment','latest-installed-verdict','release-evidence-note']) assert.ok(malformedCodes.includes(code), `missing E20 malformed finding ${code}`);

const futureEvidence = validEvidence();
futureEvidence.latestInstalled.productVersion = forwardProduct;
assert.ok(evidence.inspectReleaseEvidence(futureEvidence,{targetProductVersion:forwardProduct}).some((row)=>row.code === 'evidence-target-order'));

const forwardMissing = JSON.parse(JSON.stringify(legacyCurrent));
forwardMissing.productVersion = forwardProduct;
assert.ok(specContract.inspectReleaseSpec(forwardMissing,{currentProductVersion:currentProduct}).some((row)=>row.code === 'release-evidence-required'), 'forward spec must require structured releaseEvidence');

const forward = JSON.parse(JSON.stringify(forwardMissing));
delete forward.verifiedBaseline;
delete forward.latestInstalledEvidence;
forward.releaseEvidence = validEvidence();
assert.deepEqual(specContract.inspectReleaseSpec(forward,{currentProductVersion:currentProduct}), [], 'valid forward structured spec must satisfy composed E19+E20 contract');

const dualOwner = JSON.parse(JSON.stringify(forward));
dualOwner.verifiedBaseline = 'legacy duplicate truth';
dualOwner.latestInstalledEvidence = 'legacy duplicate truth';
const dualCodes = specContract.inspectReleaseSpec(dualOwner,{currentProductVersion:currentProduct}).map((row)=>`${row.code}@${row.field}`);
assert.ok(dualCodes.includes('evidence-legacy-owner@verifiedBaseline'));
assert.ok(dualCodes.includes('evidence-legacy-owner@latestInstalledEvidence'));

const sameAccepted = validEvidence();
sameAccepted.acceptedBaseline = {productVersion:currentProduct,releaseSha:latestSha,verdict:'accepted',issue:1012};
sameAccepted.latestInstalled = {...sameAccepted.acceptedBaseline};
assert.deepEqual(evidence.inspectReleaseEvidence(sameAccepted,{targetProductVersion:forwardProduct}), [], 'accepted latest-installed identity must exactly equal accepted baseline');

const helperSource = fs.readFileSync('plugins/usage-dashboard/tools/release_evidence_contract_e20.cjs','utf8');
for (const forbidden of ['node:fs','child_process','execFileSync','fetch(','https.request','http.request','curl ','GITHUB_TOKEN','writeFileSync','setTimeout(','setInterval(']) {
  assert.equal(helperSource.includes(forbidden), false, `E20 evidence helper must remain pure/local: ${forbidden}`);
}
for (const sourcePath of [
  'plugins/usage-dashboard/tools/release_evidence_contract_e20.cjs',
  'plugins/usage-dashboard/tools/release_spec_contract_e19.cjs',
  'plugins/usage-dashboard/tools/source_readiness_e9.cjs',
]) {
  assert.equal(fs.readFileSync(sourcePath,'utf8').includes('3.0.0-alpha.5.97'), false, `E20 activation must not hard-code the next Product in ${sourcePath}`);
}

const outer = fs.readFileSync('plugins/usage-dashboard/tools/release_spec_contract_e19.cjs','utf8');
assert.ok(outer.includes("require('./release_evidence_contract_e20.cjs')"), 'E19 outer contract must compose E20 sub-contract');
assert.ok(outer.includes('currentProductVersion'), 'E19 outer contract must accept generic current Product context');
assert.ok(outer.includes("finding('evidence-legacy-owner'"), 'structured evidence must retire dual prose ownership');

const readiness = fs.readFileSync('plugins/usage-dashboard/tools/source_readiness_e9.cjs','utf8');
assert.ok(readiness.includes('productVersionAt(transaction.intentBaseSha)'), 'source readiness must derive current Product from trusted intent base');
assert.ok(readiness.includes('inspectReleaseSpec(spec,{currentProductVersion})'), 'source readiness must activate E20 through the existing E19 contract');
assert.ok(readiness.includes("readinessFail('release-spec-contract'"), 'E20 findings must stay in existing SOURCE_SHA_NOT_READY family');

const e19 = fs.readFileSync('plugins/usage-dashboard/tests/e19-shift-left-validation-reuse-contract.cjs','utf8');
assert.ok(e19.includes('E19 Shift-Left Validation Reuse: OK'), 'E19 contract remains present and sealed');
assert.deepEqual(e18.smokePlan(e18.deriveImpact(['plugins/usage-dashboard/runtime/bridge-engine.mjs'])), {mode:'run',repeat:3,reason:'engine-impact'});
assert.deepEqual(e18.smokePlan(e18.deriveImpact(['plugins/usage-dashboard/runtime/future-sidecar.bin'])), {mode:'block',repeat:0,reason:'unknown-runtime-impact'});

const releaseRequest = fs.readFileSync('plugins/usage-dashboard/tools/release_request_e9.cjs','utf8');
assert.equal(releaseRequest.includes("'E20'"), false, 'E20 must not become a durable release generation');
const e16 = fs.readFileSync('plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs','utf8');
assert.equal(e16.includes('E20'), false, 'E20 must not mutate E16 merge authority');

console.log('E20 Structured Release Evidence: OK · two roles · semantic ordering/conflict checks · generic forward activation · legacy history preserved · E19/E18 authority unchanged');
