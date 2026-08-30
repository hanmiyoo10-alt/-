'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const rr = require('../tools/release_request_e9.cjs');
const handoff = require('../tools/release_handoff_e15.cjs');
const docs = require('../tools/render_e15_status_doc.cjs');
const controlPlane = require('../../../.github/plugin-control-plane/lib.cjs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
const requestNumber = 9999;
const requestBody = [
  'Plugin: usage-dashboard',
  `release_version: ${release.productVersion}`,
  `release_spec: ${release.specPath}`,
  'source_branch: release/usage-dashboard-e15-fixture',
  `source_sha: ${'1'.repeat(40)}`,
  'feature_issue: #738',
  'release_generation: E13',
  'pr_number: PENDING',
].join('\n');

const classification = controlPlane.classifyIssueBody(requestBody);
assert.equal(classification.explicit, true, 'canonical E15 request metadata must use the existing explicit classifier path');
assert.deepEqual(classification.labels, ['plugin:usage-dashboard'], 'canonical E15 request metadata must auto-classify into the existing Usage Dashboard lane');

const parsed = rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`, requestBody);
assert.equal(parsed.releaseGeneration, 'E13', 'E15 must preserve E13 as the durable transaction generation');
assert.equal(rr.DURABLE_TRANSACTION_GENERATION_RE.test('E14'), false, 'E14 remains an orthogonal candidate DAG baseline');
assert.equal(rr.DURABLE_TRANSACTION_GENERATION_RE.test('E15'), false, 'E15 must not become a durable transaction generation');
assert.equal(handoff.E15_IMPLEMENTATION_STATUS.implementation, 'baseline-active');
assert.equal(handoff.E15_IMPLEMENTATION_STATUS.durableReleaseGeneration, 'E13');
assert.equal(handoff.E15_IMPLEMENTATION_STATUS.durableGeneration, false);
assert.equal(handoff.E15_IMPLEMENTATION_STATUS.documentationMode, 'generated-parity');

assert.throws(
  () => rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`, requestBody.split('\n').slice(1).join('\n')),
  /E15_REQUEST_PLUGIN_MISSING/,
  'missing canonical plugin metadata must fail closed',
);
assert.throws(
  () => rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`, requestBody.replace('Plugin: usage-dashboard','Plugin: simcore')),
  /E15_REQUEST_PLUGIN_CONFLICT:simcore/,
  'conflicting plugin metadata must fail closed',
);
assert.throws(
  () => rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`, `${requestBody}\nPlugin: usage-dashboard`),
  /E15_REQUEST_PLUGIN_DUPLICATE/,
  'duplicate canonical plugin metadata must fail closed',
);
assert.throws(
  () => rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`, requestBody.replace('Plugin: usage-dashboard','### Plugin\nusage-dashboard')),
  /E15_REQUEST_PLUGIN_NONCANONICAL/,
  'alternate classifier syntax must not replace the canonical first-write request contract',
);
assert.throws(
  () => rr.parseIssue(`[usage-dashboard-release] ${release.productVersion}`, requestBody.replace('release_generation: E13','release_generation: E15')),
  /E9_REQUEST_GENERATION_DENIED:E15/,
  'E15 naming must not manufacture a new durable transaction state machine',
);

const prBody = handoff.renderStablePrBody({
  version: release.productVersion,
  summary: 'E15 stable release-handoff fixture',
  productVersion: release.productVersion,
  engineVersion: release.engineVersion,
  managerVersion: release.managerVersion,
  snapshotContract: release.snapshotContract,
  recentRequestContract: release.recentRequestContract,
  requestNumber,
});
assert.equal(handoff.validateStablePrBody(prBody, requestNumber), true, 'canonical locator-only PR body must validate');
assert.equal(handoff.renderStableLocatorBlock(), handoff.REQUIRED_PR_LOCATORS.join('\n'), 'canonical locator block must have one renderer source');
for (const locator of handoff.REQUIRED_PR_LOCATORS) assert.ok(prBody.includes(locator), `stable PR body missing ${locator}`);
for (const entry of handoff.REQUIRED_PR_LOCATOR_ENTRIES) {
  assert.equal(prBody.split('\n').filter((line) => line.trim() === entry.line).length, 1, `canonical locator must appear exactly once: ${entry.key}`);
}

const missingBacktickNearMiss = prBody.replace(
  'Source authority: durable release request `source_sha`',
  'Source authority: durable release request source_sha',
);
assert.throws(
  () => handoff.validateStablePrBody(missingBacktickNearMiss, requestNumber),
  /E15_PR_LOCATOR_INVALID:source-authority:count=0/,
  'the exact 5.89 missing-backtick source_sha near-miss must fail with a stable source-authority key',
);
assert.equal(handoff.validateStablePrBody(prBody, requestNumber), true, 'canonical source_sha locator must pass after near-miss regression');

const candidateC0 = 'a'.repeat(40);
const candidateC1 = 'b'.repeat(40);
const mainM0 = 'c'.repeat(40);
const mainM1 = 'd'.repeat(40);
for (const movingIdentity of [candidateC0,candidateC1,mainM0,mainM1]) {
  assert.equal(prBody.includes(movingIdentity), false, 'stable PR prose must not copy moving candidate/main identities');
  assert.equal(handoff.validateStablePrBody(prBody, requestNumber), true, 'the same PR body must remain valid across restage/main movement');
}
for (const staleLine of [
  `Candidate SHA: ${candidateC0}`,
  `Source SHA: ${'e'.repeat(40)}`,
  `Frozen main: ${mainM0}`,
]) {
  assert.throws(
    () => handoff.validateStablePrBody(`${prBody}\n${staleLine}`, requestNumber),
    /E15_PR_MUTABLE_SHA_PROSE/,
    `creation-time mutable SHA prose must be rejected: ${staleLine.split(':')[0]}`,
  );
}
assert.throws(
  () => handoff.validateStablePrBody(prBody.replace(`Usage-Dashboard-Release-Request: #${requestNumber}`,`Usage-Dashboard-Release-Request: #${requestNumber + 1}`), requestNumber),
  /E15_PR_REQUEST_MARKER_MISMATCH/,
  'durable request marker remains exact identity metadata',
);
assert.throws(
  () => handoff.validateStablePrBody(prBody.replace('Candidate authority: current PR head','Candidate authority: stale body value'), requestNumber),
  /E15_PR_LOCATOR_INVALID:candidate-authority:count=0/,
  'all stable authority locators are mandatory and failures use stable keys',
);

const validator = fs.readFileSync('.github/workflows/usage-dashboard-e9-validate.yml','utf8');
assert.ok(validator.includes("require('./plugins/usage-dashboard/tools/release_handoff_e15.cjs')"), 'E9 exact-SHA validator must import the E15 pure handoff contract');
assert.ok(validator.includes("handoff.validateStablePrBody(pr.body||'',Number(requestNumber))"), 'E9 must validate stable PR-body presentation before authoritative full registry validation');
assert.ok(!validator.includes('schedule:'), 'E15 must not add another scheduled path');
assert.ok(!validator.includes('PR_BODY_UPDATE'), 'E15 must not add a PR-body synchronization state');

const helperSource = fs.readFileSync('plugins/usage-dashboard/tools/release_handoff_e15.cjs','utf8');
const docsRendererSource = fs.readFileSync('plugins/usage-dashboard/tools/render_e15_status_doc.cjs','utf8');
for (const source of [helperSource, docsRendererSource]) {
  for (const forbidden of [
    'fetch(',
    'http://',
    'https://',
    'child_process',
    'setTimeout',
    'setInterval',
    'GITHUB_TOKEN',
    'git push',
    'curl ',
  ]) assert.ok(!source.includes(forbidden), `E15 pure local tooling must not own I/O or release mutation: ${forbidden}`);
}

const reconciler = fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml','utf8');
assert.ok(reconciler.includes("issues?state=open&labels=plugin%3Ausage-dashboard"), 'existing label-selected E9 lane must remain unchanged');
assert.ok(!reconciler.includes('issues?state=open&sort=created'), 'E15 must not broaden E9 into unlabeled release-like issue scanning');
assert.ok(!reconciler.includes('release_handoff_e15.cjs --update'), 'E15 must not add a PR-body update command');
assert.ok(!reconciler.includes('render_e15_status_doc.cjs --write'), 'E15 must not add an autonomous documentation writer');
assert.ok(!reconciler.includes('E15_REAL_RELEASE_PROOF'), 'E15 must not manufacture a new durable generation proof marker');

const designPath = 'docs/USAGE_DASHBOARD_PR_LIFECYCLE_E15_HANDOFF_HYGIENE_AUTOMATION_DESIGN.md';
const design = fs.readFileSync(designPath,'utf8');
for (const token of [
  'IMPLEMENTED — BASELINE ACTIVE',
  'first-write correctness',
  'Plugin: usage-dashboard',
  'Candidate authority: current PR head',
  'zero PR-body synchronization operations',
  'generated source + enforced parity',
]) assert.ok(design.includes(token), `E15 design missing ${token}`);
assert.ok(!design.includes('IMPLEMENTATION NOT STARTED'), 'implemented E15 helper/contract must not coexist with obsolete pre-implementation document status');
assert.equal(docs.extractStatusBlock(design), docs.renderStatusBlock(), 'committed E15 generated status block must exactly match deterministic local renderer output');
assert.equal(docs.assertStatusCurrent(design), true, 'E15 documentation status parity must be current');
assert.throws(
  () => docs.assertStatusCurrent(design.replace('implementation: `baseline-active`','implementation: `stale`')),
  /E15_DOC_STATUS_STALE:regenerate canonical E15 status block/,
  'documentation status drift must fail with one actionable deterministic receipt',
);

console.log(`usage-dashboard E15 release handoff hygiene contract: OK · ${release.productVersion} · canonical first-write + keyed fail-closed locators + generated documentation parity + E13/E14/E11 authority unchanged`);
