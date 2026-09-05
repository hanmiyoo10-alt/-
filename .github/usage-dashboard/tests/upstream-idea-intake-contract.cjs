'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const state = JSON.parse(fs.readFileSync('.github/usage-dashboard/upstream-idea-intake-state.json', 'utf8'));
const doc = fs.readFileSync('docs/USAGE_DASHBOARD_UPSTREAM_IDEA_INTAKE_AUTOMATION.md', 'utf8');

assert.equal(state.schemaVersion, 1);
assert.equal(state.owner, 'usage-dashboard-upstream-idea-intake');
assert.equal(state.trackingIssue, 1572);
assert.equal(state.warehouse, 'docs/USAGE_DASHBOARD_IDEA_LIST.md');
assert.equal(state.warehouseTrackingIssue, 412);
assert.equal(state.executionContract.kind, 'condition-watch');
assert.equal(state.executionContract.cadenceHours, 6);
assert.equal(state.executionContract.noChangeNotification, false);
assert.equal(state.executionContract.meaningfulChangeOnly, true);
assert.equal(state.sourcePolicy.officialPublicUpstreamOnly, true);
assert.equal(state.sourcePolicy.evidenceBeforePromotion, true);
assert.equal(state.sourcePolicy.dedupeBeforePromotion, true);
assert.equal(state.sourcePolicy.ambiguousEvidence, 'needs-evidence');
assert.equal(state.sourcePolicy.unknownPolicy, 'preserve');
assert.equal(state.sourcePolicy.implementationAuthority, false);
assert.equal(state.sourcePolicy.releaseAuthority, false);
assert.equal(state.lastDurableScan.issue, 1494);

const ids = state.knownCandidateKeys.map(row => row.id);
assert.equal(new Set(ids).size, ids.length, 'candidate keys must stay unique');
for (const id of [
  'V-KEY-LIMIT-HEADROOM',
  'V-GATEWAY-LIMITS-HEADROOM',
  'V-MODEL-LIFECYCLE-STATUS',
  'V-DYNAMIC-ROUTE-TRACE',
  'V-CACHE-POLICY-MODE',
  'V-DEVPASS-NO-TRAINING-STATUS',
]) assert.ok(ids.includes(id), `missing historical candidate ${id}`);
assert.equal(state.knownCandidateKeys.find(row => row.id === 'V-MODEL-LIFECYCLE-STATUS').status, 'implemented-5.100');

for (const marker of [
  'SOURCE / EVIDENCE RECORD',
  'TRIAGE + DEDUPE',
  'CANONICAL IDEA WAREHOUSE',
  'every 6 hours',
  'no repository mutation and no user notification',
  'fail closed as `needs-evidence`',
  'never replay historical candidates as new ideas',
  'Upstream release evidence never grants implementation or release authority',
  'Physical acceptance is not required',
]) assert.ok(doc.includes(marker), `contract marker missing: ${marker}`);

console.log('Usage Dashboard upstream idea intake contract: OK');
