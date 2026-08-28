'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const request = require('../tools/release_request_e9.cjs');

assert.strictEqual(
  request.GENERATION_RE,
  request.DURABLE_TRANSACTION_GENERATION_RE,
  'legacy GENERATION_RE export must remain a compatibility alias for the durable transaction generation matcher',
);
assert.equal(request.DURABLE_TRANSACTION_GENERATION_RE.test('E13'), true, 'E13 remains the active durable transaction generation');
assert.equal(request.DURABLE_TRANSACTION_GENERATION_RE.test('E14'), false, 'E14 candidate DAG baseline must not silently become a durable transaction generation');
assert.equal(request.DURABLE_TRANSACTION_GENERATION_RE.test('E15'), false, 'E15 handoff hygiene baseline must not silently become a durable transaction generation');

function releaseBody(generation) {
  return [
    'Plugin: usage-dashboard',
    'release_version: 3.0.0-alpha.5.82',
    'release_spec: .github/usage-dashboard/releases/5.82.json',
    'source_branch: release/usage-dashboard-582-governance-fixture',
    `source_sha: ${'a'.repeat(40)}`,
    'feature_issue: #632',
    `release_generation: ${generation}`,
    'pr_number: PENDING',
  ].join('\n');
}

const parsed = request.parseIssue('[usage-dashboard-release] 3.0.0-alpha.5.82', releaseBody('E13'));
assert.equal(parsed.releaseGeneration, 'E13');
assert.throws(
  () => request.parseIssue('[usage-dashboard-release] 3.0.0-alpha.5.82', releaseBody('E14')),
  /E9_REQUEST_GENERATION_DENIED:E14/,
  'E14 must remain rejected on the durable transaction axis unless a future explicit governance design changes that contract',
);
assert.throws(
  () => request.parseIssue('[usage-dashboard-release] 3.0.0-alpha.5.82', releaseBody('E15')),
  /E9_REQUEST_GENERATION_DENIED:E15/,
  'E15 must remain rejected on the durable transaction axis because it adds no new reducer/wake/state semantics',
);

const governance = fs.readFileSync('docs/USAGE_DASHBOARD_E14_GOVERNANCE_ALIGNMENT_DESIGN.md', 'utf8');
for (const token of [
  'durable transaction generation',
  'Current value: **E13**',
  'candidate DAG baseline',
  'Current value: **E14**',
  'E14 is not accepted as a `release_generation` value',
  'no `E14_REAL_RELEASE_PROOF` machine marker is required',
  'E15 handoff hygiene baseline',
]) assert.ok(governance.includes(token), `E14 governance design missing ${token}`);

const ancestryDesign = fs.readFileSync('docs/USAGE_DASHBOARD_PR_LIFECYCLE_E14_ANCESTRY_CONVERGENCE_DESIGN.md', 'utf8');
assert.match(ancestryDesign, /Candidate DAG baseline: `E14`/);
assert.match(ancestryDesign, /Durable transaction generation: `E13`/);
assert.doesNotMatch(ancestryDesign, /^Generation: `E14`$/m, 'E14 ancestry design must not claim the durable transaction generation axis');

const reconciler = fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml', 'utf8');
assert.ok(reconciler.includes("GENERATION_PROOF_MARKER='E13_REAL_RELEASE_PROOF'"), 'E13 durable transaction machine proof must remain present');
assert.ok(!reconciler.includes('E14_REAL_RELEASE_PROOF'), 'governance alignment must not manufacture an E14 durable transaction proof path');
assert.ok(!reconciler.includes('E15_REAL_RELEASE_PROOF'), 'E15 handoff hygiene must not manufacture a durable transaction proof path');

console.log('usage-dashboard E14 governance alignment contract: OK · E13 durable transaction generation + E14 candidate DAG baseline + E15 handoff hygiene baseline · no naming-driven state-machine growth');
