'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const e15 = require('../tools/release_handoff_e15.cjs');
const e17 = require('../tools/release_pr_first_write_e17.cjs');
const preflight = require('../tools/release_generic_preflight.cjs');
const stagePolicy = require('../tools/candidate_stage_policy.cjs');
const e16Status = require('../tools/render_e16_status_doc.cjs');

const input = {
  productVersion:'3.0.0-alpha.5.94',
  engineVersion:'1.6.31',
  managerVersion:'1.3.4',
  snapshotContract:1,
  recentRequestContract:1,
  requestNumber:999,
  summary:'Canonical first-write release handoff fixture.',
};
const draft = e17.renderFirstWritePrDraft(input);
const expectedBody = e15.renderStablePrBody({
  version:'5.94',
  summary:input.summary,
  productVersion:input.productVersion,
  engineVersion:input.engineVersion,
  managerVersion:input.managerVersion,
  snapshotContract:input.snapshotContract,
  recentRequestContract:input.recentRequestContract,
  requestNumber:input.requestNumber,
});
assert.equal(draft.title, 'release(usage-dashboard): 3.0.0-alpha.5.94');
assert.equal(draft.base, 'main');
assert.equal(draft.head, 'stage/usage-dashboard-3.0.0-alpha.5.94');
assert.equal(draft.body, expectedBody, 'E17 first-write body must be exactly the E15 canonical renderer output');
assert.equal(e15.validateStablePrBody(draft.body, 999), true);
for (const locator of e15.REQUIRED_PR_LOCATORS) {
  assert.equal(draft.body.split('\n').filter(line => line.trim() === locator).length, 1, `E17 canonical locator cardinality failed: ${locator}`);
}
assert.throws(() => e17.renderFirstWritePrDraft({...input, productVersion:'3.0.0-alpha.6.1'}), /E17_PR_DRAFT_PRODUCT_VERSION_INVALID/);
assert.throws(() => e17.renderFirstWritePrDraft({...input, requestNumber:0}), /E17_PR_DRAFT_REQUEST_INVALID/);
assert.throws(() => e17.renderFirstWritePrDraft({...input, summary:''}), /E17_PR_DRAFT_FIELD_INVALID:summary/);

const helperSource = fs.readFileSync('plugins/usage-dashboard/tools/release_pr_first_write_e17.cjs','utf8');
for (const forbidden of ['fetch(', 'https.request', 'http.request', 'fs.', 'setTimeout(', 'setInterval(', 'git push', 'merge_pull_request', 'createPullRequest']) {
  assert.equal(helperSource.includes(forbidden), false, `E17 first-write helper must remain pure/local: ${forbidden}`);
}
assert.ok(helperSource.includes("require('./release_handoff_e15.cjs')"), 'E17 must reuse E15 rather than duplicate locator authority');
assert.equal(helperSource.includes('Candidate authority: current PR head'), false, 'E17 helper must not duplicate E15 locator strings');

const historical = "const release={productVersion:'x'}; if (release.productVersion !== '3.0.0-alpha.5.92') { process.exit(0); }\n// UD_HISTORICAL_VERSION_LOCK\nassert.equal(release.productVersion, '3.0.0-alpha.5.92');\n";
const unscoped = "const release={productVersion:'x'};\n// UD_HISTORICAL_VERSION_LOCK\nassert.equal(release.productVersion, '3.0.0-alpha.5.92');\n";
assert.deepEqual(preflight.staleProductAssertions(historical,'3.0.0-alpha.5.94'),[],'guarded historical regression must remain valid');
assert.equal(preflight.staleProductAssertions(unscoped,'3.0.0-alpha.5.94')[0].reason,'historical-scope-missing','lock without exact version guard must fail closed');

assert.deepEqual([...e16Status.STATUS.baselineProofReleases],['3.0.0-alpha.5.91','3.0.0-alpha.5.92']);
assert.equal(Object.prototype.hasOwnProperty.call(e16Status.STATUS,'liveProofReleases'),false);
const e16Helper = fs.readFileSync('plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs','utf8');
assert.ok(e16Helper.includes("const CAPSULE_AUTHORITY = 'derived-read-only';"),'E16 authority remains derived/read-only');
assert.equal(e16Helper.includes('E17'),false,'E17 must not mutate E16 authority semantics');

for (const releaseControlPath of [
  'plugins/usage-dashboard/tools/release_pr_first_write_e17.cjs',
  'plugins/usage-dashboard/tools/release_handoff_e15.cjs',
  'plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs',
]) assert.equal(stagePolicy.classifyPath(releaseControlPath,''),'denied',`candidate source must not own release-control helper: ${releaseControlPath}`);
assert.equal(stagePolicy.classifyPath('plugins/usage-dashboard/tests/e17-stability-envelope-contract.cjs',''),'test');

const reconciler = fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml','utf8');
assert.ok(reconciler.includes('UD_E9_PR_REQUIRED:'),'existing PR-required handoff remains present');
assert.ok(reconciler.includes('assistant ensures exactly one deterministic PR'),'assistant remains the existing PR write boundary');
for (const forbidden of ['gh pr create','merge_pull_request','release_generation: E17']) {
  assert.equal(reconciler.includes(forbidden),false,`E17 must not add authority to reconciler: ${forbidden}`);
}

console.log('E17 Stability Envelope: OK · E16 authority unchanged · canonical E15 first-write draft · guarded historical scope · candidate boundary preserved · no new writer');
