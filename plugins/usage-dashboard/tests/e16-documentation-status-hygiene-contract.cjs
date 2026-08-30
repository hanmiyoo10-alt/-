'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const e16 = require('../tools/release_merge_capsule_e16.cjs');
const renderer = require('../tools/render_e16_status_doc.cjs');

const docPath = 'docs/USAGE_DASHBOARD_E16_DERIVED_MERGE_AUTHORITY_CAPSULE_DESIGN.md';
const doc = fs.readFileSync(docPath, 'utf8');
const helper = fs.readFileSync('plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs', 'utf8');
const rendererSource = fs.readFileSync('plugins/usage-dashboard/tools/render_e16_status_doc.cjs', 'utf8');

assert.equal(e16.E16_IMPLEMENTATION_STATUS?.implementation, 'live-baseline-proven');
assert.equal(e16.E16_IMPLEMENTATION_STATUS?.durableReleaseGeneration, 'E13');
assert.equal(e16.E16_IMPLEMENTATION_STATUS?.durableGeneration, false);
assert.equal(e16.E16_IMPLEMENTATION_STATUS?.documentationMode, 'generated-parity');
assert.deepEqual([...e16.E16_IMPLEMENTATION_STATUS.liveProofReleases], ['3.0.0-alpha.5.91', '3.0.0-alpha.5.92']);
assert.deepEqual([...e16.E16_IMPLEMENTATION_STATUS.liveProofRequests], ['#909', '#923']);
assert.equal(e16.E16_IMPLEMENTATION_STATUS?.evidenceMode, 'immutable-release-receipts');

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
assert.ok(doc.includes('5.91') && doc.includes('5.92'), 'E16 design must retain durable live-proof lineage without mutable capsule synchronization');

for (const forbidden of [
  'fetch(', 'https.request', 'http.request', 'setInterval(', 'setTimeout(',
  'createPullRequest', 'merge_pull_request', 'update_ref', 'git push', 'schedule',
]) {
  assert.equal(rendererSource.includes(forbidden), false, `E16 doc renderer must stay pure/local: ${forbidden}`);
}
assert.ok(helper.includes('E16_IMPLEMENTATION_STATUS'), 'E16 machine status must live with the existing pure helper');
assert.ok(!rendererSource.includes('UD_E16_MERGE_CAPSULE:'), 'documentation renderer must not duplicate immutable capsule formatting');
assert.ok(!rendererSource.includes('replaceStatusBlock(') || rendererSource.includes('function replaceStatusBlock('), 'renderer may expose an explicit local replacement helper only');

const mutated = doc.replace('implementation: `live-baseline-proven`', 'implementation: `stale`');
assert.throws(() => renderer.assertStatusCurrent(mutated), /E16_DOC_STATUS_STALE/);

console.log('E16 documentation status hygiene: OK · live baseline 5.91+5.92 · generated parity · E17 HOLD · no writer/poller/sync authority');
