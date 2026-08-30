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
assert.deepEqual([...renderer.STATUS.liveProofReleases], ['3.0.0-alpha.5.91', '3.0.0-alpha.5.92']);
assert.deepEqual([...renderer.STATUS.liveProofRequests], ['#909', '#923']);

assert.equal(renderer.assertStatusCurrent(doc), true, 'E16 generated status block must match deterministic renderer');
const block = renderer.renderStatusBlock();
for (const marker of [
  'implementation: `live-baseline-proven`',
  'durable release generation: `E13`',
  'E16 durable generation: `no`',
  'documentation mode: `generated-parity`',
  'evidence mode: `immutable-release-receipts`',
  'live proof releases: `3.0.0-alpha.5.91, 3.0.0-alpha.5.92`',
  'live proof requests: `#909, #923`',
]) assert.ok(block.includes(marker), `E16 generated status missing: ${marker}`);

assert.ok(!doc.includes('Status: **IMPLEMENTED — LIVE PRODUCT PROOF PENDING**'), 'obsolete E16 pending status must not survive live proof');
assert.ok(doc.includes('Status: **IMPLEMENTED — LIVE BASELINE PROVEN / GENERATED STATUS ENFORCED**'), 'E16 stable status heading must reflect proven baseline');
assert.ok(doc.includes('5.91') && doc.includes('5.92'), 'E16 design must retain live-proof lineage');

for (const forbidden of [
  'fetch(', 'https.request', 'http.request', 'setInterval(', 'setTimeout(',
  'createPullRequest', 'merge_pull_request', 'update_ref', 'git push', 'schedule',
]) {
  assert.equal(rendererSource.includes(forbidden), false, `E16 doc renderer must stay pure/local: ${forbidden}`);
}
assert.ok(!rendererSource.includes('UD_E16_MERGE_CAPSULE:'), 'documentation renderer must not duplicate immutable capsule format');
assert.ok(helper.includes("const CAPSULE_AUTHORITY = 'derived-read-only';"), 'existing E16 authority helper must remain the authority owner');
assert.ok(!helper.includes('live-baseline-proven'), 'documentation proof state must not mutate E16 merge-authority helper');

const mutated = doc.replace('implementation: `live-baseline-proven`', 'implementation: `stale`');
assert.throws(() => renderer.assertStatusCurrent(mutated), /E16_DOC_STATUS_STALE/);

console.log('E16 documentation status hygiene: OK · live baseline 5.91+5.92 · generated parity · authority helper unchanged · E17 HOLD');
