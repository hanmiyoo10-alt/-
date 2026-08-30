'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const renderer = require('../tools/render_e16_status_doc.cjs');

const docPath = 'docs/USAGE_DASHBOARD_E16_DERIVED_MERGE_AUTHORITY_CAPSULE_DESIGN.md';
const helperPath = 'plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs';
const doc = fs.readFileSync(docPath, 'utf8');
const helper = fs.readFileSync(helperPath, 'utf8');
const rendererSource = fs.readFileSync('plugins/usage-dashboard/tools/render_e16_status_doc.cjs', 'utf8');

assert.equal(renderer.STATUS.implementation, 'live-baseline-proven');
assert.equal(renderer.STATUS.durableReleaseGeneration, 'E13');
assert.equal(renderer.STATUS.durableGeneration, false);
assert.equal(renderer.STATUS.documentationMode, 'generated-parity');
assert.equal(renderer.STATUS.evidenceMode, 'immutable-release-receipts');
assert.deepEqual([...renderer.STATUS.baselineProofReleases], ['3.0.0-alpha.5.91', '3.0.0-alpha.5.92']);
assert.deepEqual([...renderer.STATUS.baselineProofRequests], ['#909', '#923']);
assert.equal(Object.prototype.hasOwnProperty.call(renderer.STATUS, 'liveProofReleases'), false, 'E16 documentation status must not imply an exhaustive live-release list');
assert.equal(Object.prototype.hasOwnProperty.call(renderer.STATUS, 'liveProofRequests'), false, 'E16 documentation status must not imply an exhaustive live-request list');

assert.equal(renderer.assertStatusCurrent(doc), true, 'E16 generated status block must match deterministic renderer');
const block = renderer.renderStatusBlock();
for (const marker of [
  'implementation: `live-baseline-proven`',
  'durable release generation: `E13`',
  'E16 durable generation: `no`',
  'documentation mode: `generated-parity`',
  'evidence mode: `immutable-release-receipts`',
  'baseline proof releases: `3.0.0-alpha.5.91, 3.0.0-alpha.5.92`',
  'baseline proof requests: `#909, #923`',
  'later proof authority: `immutable request / E16 capsule / release receipts`',
]) assert.ok(block.includes(marker), `E16 generated status missing: ${marker}`);
assert.equal(block.includes('live proof releases:'), false, 'generated status must not present baseline releases as exhaustive live history');
assert.equal(block.includes('live proof requests:'), false, 'generated status must not present baseline requests as exhaustive live history');

assert.ok(!doc.includes('Status: **IMPLEMENTED — LIVE PRODUCT PROOF PENDING**'), 'obsolete E16 pending status must not survive live proof');
assert.ok(doc.includes('Status: **IMPLEMENTED — LIVE BASELINE PROVEN / GENERATED STATUS ENFORCED**'), 'E16 stable status heading must reflect proven baseline');
assert.ok(doc.includes('baseline proof list is intentionally non-exhaustive'), 'E16 design must explain baseline proof semantics');
assert.ok(doc.includes('Later releases, including 5.93 and beyond'), 'E16 design must route later proof to immutable receipts');

for (const forbidden of [
  'fetch(', 'https.request', 'http.request', 'setInterval(', 'setTimeout(',
  'createPullRequest', 'merge_pull_request', 'update_ref', 'git push', 'schedule',
]) {
  assert.equal(rendererSource.includes(forbidden), false, `E16 doc renderer must stay pure/local: ${forbidden}`);
}
assert.ok(!rendererSource.includes('UD_E16_MERGE_CAPSULE:'), 'documentation renderer must not duplicate immutable capsule format');
assert.ok(helper.includes("const CAPSULE_AUTHORITY = 'derived-read-only';"), 'existing E16 authority helper must remain the authority owner');
assert.ok(!helper.includes('baselineProofReleases'), 'documentation proof state must not mutate E16 merge-authority helper');

const mutated = doc.replace('implementation: `live-baseline-proven`', 'implementation: `stale`');
assert.throws(() => renderer.assertStatusCurrent(mutated), /E16_DOC_STATUS_STALE/);

console.log('E16 documentation status hygiene: OK · baseline proof 5.91+5.92 · later proof by immutable receipts · generated parity · authority helper unchanged');
