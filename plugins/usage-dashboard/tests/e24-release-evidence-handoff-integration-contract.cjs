'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const e20=require('../tools/release_evidence_contract_e20.cjs');
const e24=require('../tools/release_evidence_handoff_e24.cjs');
const preflight=require('../tools/release_generic_preflight.cjs');

const TARGET='3.0.0-alpha.5.900'; // synthetic, deliberately not a reserved Product release
const PROD_5103='7fc4e31ab28d726cc355915a57f0be566dab2b25';
const MAIN_5103='25c8eba73f7aab9f917a8bf89728f17e7d7d64cd';
const PROD_5104='e1d1455592449bcad943e3dec6e1eb205136bd92';
const MAIN_5104='e0e012a8af53773d4b38c2dca0d6bad6e6a46b57';

function manifest(version){return {productVersion:version,components:{bridge:{requiredVersion:'1.6.38'},bridgeManager:{version:'1.3.6'}},contracts:{snapshot:1,recentRequest:1}};}
function spec(version){return {productVersion:version,engineVersion:'1.6.38',managerVersion:'1.3.6',contracts:{snapshot:1,recentRequest:1}};}
function requestBody(version,sourceSha,featureIssue,prNumber){return [
  'Plugin: usage-dashboard',
  `release_version: ${version}`,
  `release_spec: .github/usage-dashboard/releases/${version.split('.5.')[1]}.json`,
  `source_branch: release/usage-dashboard-e24-fixture-${version.split('.5.')[1]}`,
  `source_sha: ${sourceSha}`,
  `feature_issue: #${featureIssue}`,
  'release_generation: E13',
  `pr_number: #${prNumber}`,
].join('\n');}
function deploy(version,mergeSha,productionSha,id){return {id,body:[
  'UD_RELEASE_DEPLOYED',
  `release: ${version}`,
  'engine: 1.6.38',
  'manager: 1.3.6',
  'contracts: 1 / 1',
  `main_merge_sha: ${mergeSha}`,
  `release_branch_sha: ${productionSha}`,
  'engine_sha256: 085273bd748b852de35cbcc7e00241f349ab0cb6ac38dd62c6c5354ad2f56fea',
  'exact_byte_parity: VERIFIED',
  'physical_verification: PENDING',
].join('\n')};}
function physical(version,productionSha,id,verdict='ACCEPTED'){return {id,body:[
  'UD_PHYSICAL_ACCEPTANCE_V1',
  `release: ${version}`,
  `release_branch_sha: ${productionSha}`,
  `verdict: ${verdict}`,
  `observed_product: ${version}`,
  'observed_engine: 1.6.38',
  'observed_manager: 1.3.6',
  'health: PASS',
  'feature: PASS',
  'recorded_from: user-real-device-evidence',
  'source_evidence: exact PocketRisu fixture',
].join('\n')};}
function bundle103(extra=[]){return {
  issue:{number:1836,title:'[usage-dashboard-release] 3.0.0-alpha.5.103',body:requestBody('3.0.0-alpha.5.103','3'.repeat(40),1829,1852)},
  comments:[deploy('3.0.0-alpha.5.103',MAIN_5103,PROD_5103,5570200000),physical('3.0.0-alpha.5.103',PROD_5103,5571109680),...extra],
  pr:{number:1852,merged:true,mergeCommitSha:MAIN_5103},
  productionSha:PROD_5103,
  productionManifest:manifest('3.0.0-alpha.5.103'),
  releaseSpecIdentity:spec('3.0.0-alpha.5.103'),
};}
function bundle104(extra=[]){return {
  issue:{number:1861,title:'[usage-dashboard-release] 3.0.0-alpha.5.104',body:requestBody('3.0.0-alpha.5.104','4'.repeat(40),1859,1862)},
  comments:[deploy('3.0.0-alpha.5.104',MAIN_5104,PROD_5104,5571010912),...extra],
  pr:{number:1862,merged:true,mergeCommitSha:MAIN_5104},
  productionSha:PROD_5104,
  productionManifest:manifest('3.0.0-alpha.5.104'),
  releaseSpecIdentity:spec('3.0.0-alpha.5.104'),
};}
function context(releases=[bundle103(),bundle104()]){return {enumeration:{complete:true,repository:'hanmiyoo10-alt/-',durableRequestCount:releases.length},releases,targetProductVersion:TARGET};}

// Current-shaped live boundary: 5.103 is physically accepted; newer 5.104 is deployed but still pending physical.
const composed=e24.resolveReleaseEvidenceHandoff(context());
assert.equal(composed.ok,true);
assert.equal(composed.resolution.latestDeployedIdentity.productVersion,'3.0.0-alpha.5.104');
assert.equal(composed.resolution.latestAcceptedIdentity.productVersion,'3.0.0-alpha.5.103');
assert.equal(composed.acceptedIdentity.releaseSha,PROD_5103);
assert.equal(composed.acceptedIdentity.issue,1836);
assert.equal(composed.acceptedIdentity.commentId,5571109680);
assert.equal(composed.releaseEvidence.acceptedBaseline.productVersion,'3.0.0-alpha.5.103');
assert.equal(composed.releaseEvidence.latestInstalled.productVersion,'3.0.0-alpha.5.103');
assert.equal(composed.releaseEvidence.acceptedBaseline.issue,1836);
assert.equal(composed.releaseEvidence.acceptedBaseline.commentId,5571109680);
assert.deepEqual(e20.inspectReleaseEvidence(composed.releaseEvidence,{targetProductVersion:TARGET}),[]);

// Same authority identity with different bounded prose passes shift-left E24 validation.
const noteOnly=JSON.parse(JSON.stringify(composed.releaseEvidence));
noteOnly.acceptedBaseline.note='Forward source authoring may use a release-specific bounded note.';
noteOnly.latestInstalled.note='The same exact accepted baseline remains latestInstalled until newer physical acceptance.';
assert.deepEqual(e24.inspectReleaseEvidenceHandoff(noteOnly,context()),[]);
assert.deepEqual(preflight.inspectReleaseEvidenceContext({productVersion:TARGET,releaseEvidence:noteOnly},{...context(),targetProductVersion:undefined}),[]);

// Every authority-bearing mutation is rejected.
for(const [role,field,value] of [
  ['acceptedBaseline','productVersion','3.0.0-alpha.5.102'],
  ['acceptedBaseline','releaseSha','a'.repeat(40)],
  ['acceptedBaseline','issue',1829],
  ['acceptedBaseline','commentId',5570738555],
  ['acceptedBaseline','verdict','rejected'],
  ['latestInstalled','productVersion','3.0.0-alpha.5.102'],
  ['latestInstalled','releaseSha','b'.repeat(40)],
  ['latestInstalled','issue',1829],
  ['latestInstalled','commentId',5570738555],
  ['latestInstalled','verdict','unverified'],
]){
  const actual=JSON.parse(JSON.stringify(composed.releaseEvidence));
  actual[role][field]=value;
  assert.ok(e24.inspectReleaseEvidenceHandoff(actual,context()).length>0,`${role}.${field}`);
}

// PENDING / REJECTED / CONFLICT newer evidence must not displace the prior exact accepted identity.
const rejected104=bundle104([physical('3.0.0-alpha.5.104',PROD_5104,5572000001,'REJECTED')]);
const rejected=e24.resolveReleaseEvidenceHandoff(context([bundle103(),rejected104]));
assert.equal(rejected.ok,true);
assert.equal(rejected.acceptedIdentity.productVersion,'3.0.0-alpha.5.103');
const conflict104=bundle104([physical('3.0.0-alpha.5.104','c'.repeat(40),5572000002,'ACCEPTED')]);
const conflict=e24.resolveReleaseEvidenceHandoff(context([bundle103(),conflict104]));
assert.equal(conflict.ok,false);
assert.ok(conflict.findings.some((row)=>row.code==='E22_PHYSICAL_RELEASE_SHA_MISMATCH'));

// Exact newer physical ACCEPTED automatically advances with no second selector.
const accepted104=e24.resolveReleaseEvidenceHandoff(context([bundle103(),bundle104([physical('3.0.0-alpha.5.104',PROD_5104,5572000003,'ACCEPTED')])]));
assert.equal(accepted104.ok,true);
assert.equal(accepted104.acceptedIdentity.productVersion,'3.0.0-alpha.5.104');
assert.equal(accepted104.releaseEvidence.acceptedBaseline.releaseSha,PROD_5104);
assert.equal(accepted104.releaseEvidence.acceptedBaseline.commentId,5572000003);

// Enumeration and durable request identity fail closed instead of guessing.
for(const bad of [
  {...context(),enumeration:{complete:false,repository:'hanmiyoo10-alt/-',durableRequestCount:2}},
  {...context(),enumeration:{complete:true,repository:'hanmiyoo10-alt/-',durableRequestCount:1}},
  context([bundle103(),bundle103()]),
]){
  const result=e24.resolveReleaseEvidenceHandoff(bad);
  assert.equal(result.ok,false);
  assert.ok(result.findings.some((row)=>row.code==='E24_EVIDENCE_ENUMERATION_INCOMPLETE'||row.code==='E24_DURABLE_REQUEST_INVALID'));
}
const missingPr=bundle103(); delete missingPr.pr;
assert.ok(e24.resolveReleaseEvidenceHandoff(context([missingPr,bundle104()])).findings.some((row)=>row.code==='E24_EVIDENCE_BUNDLE_INCOMPLETE'));
const wrongPr=bundle103(); wrongPr.pr={...wrongPr.pr,number:9999};
assert.ok(e24.resolveReleaseEvidenceHandoff(context([wrongPr,bundle104()])).findings.some((row)=>row.code==='E24_DURABLE_REQUEST_INVALID'));

// Historical 5.104 releaseEvidence remains an immutable source-freeze snapshot. E24 applies forward, not retroactively.
const historical5104=JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.104.json','utf8'));
assert.equal(historical5104.releaseEvidence.acceptedBaseline.issue,1829);
assert.equal(historical5104.releaseEvidence.acceptedBaseline.commentId,5570738555);
assert.ok(e24.inspectReleaseEvidenceHandoff(historical5104.releaseEvidence,context()).length>0,'new E24 durable receipt authority must not silently reinterpret old 5.104 spec');

// Pure composition / no persistent state / no new generation or network parser.
const source=fs.readFileSync('plugins/usage-dashboard/tools/release_evidence_handoff_e24.cjs','utf8');
for(const forbidden of ["require('node:fs')","require('node:http')","require('node:https')","require('node:child_process')",'latest-accepted.json','accepted-baseline.json','baseline-cache.json','release-evidence-state.json','release_generation: E24']){
  assert.equal(source.includes(forbidden),false,forbidden);
}
assert.ok(source.includes("require('./release_request_e9.cjs')"));
assert.ok(source.includes("require('./release_closure_e22.cjs')"));
assert.ok(source.includes("require('./release_baseline_handoff_e23.cjs')"));
const preflightSource=fs.readFileSync('plugins/usage-dashboard/tools/release_generic_preflight.cjs','utf8');
for(const forbidden of ['api.github.com','GITHUB_TOKEN','node:http','node:https']) assert.equal(preflightSource.includes(forbidden),false,`preflight must not fetch/parse GitHub evidence: ${forbidden}`);
assert.ok(preflightSource.includes('--release-evidence-context'));

// Existing E7 is the only transport barrier; it must use transaction-local evidence and pass it to ordinary preflight.
const workflow=fs.readFileSync('.github/workflows/usage-dashboard-stage-e7.yml','utf8');
assert.ok(workflow.includes('usage-dashboard-e24-evidence.json'));
assert.ok(workflow.includes('issues: read'));
assert.ok(workflow.includes('pull-requests: read'));
assert.ok(workflow.includes('--release-evidence-context "$RELEASE_EVIDENCE_CONTEXT"'));
assert.ok(workflow.includes('per_page=100'));
assert.ok(workflow.includes('release_request_e9.cjs'));
assert.ok(workflow.includes('latestDeployment'));
assert.ok(workflow.includes('combinedComments'));
assert.equal(workflow.includes('release_generation: E24'),false);

// Deterministic repeated derivation is byte-for-byte JSON identical.
const again=e24.resolveReleaseEvidenceHandoff(context());
assert.equal(JSON.stringify(again),JSON.stringify(composed));

console.log('usage-dashboard E24 release evidence handoff integration: OK · 5.103 accepted survives 5.104 pending · exact E22/E23 authority · note-semantic compare · forward-only historical boundary · incomplete evidence fail-closed · no persistent state');
