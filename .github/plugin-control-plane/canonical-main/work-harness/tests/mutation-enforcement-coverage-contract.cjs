'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildCoverage,
  evaluateCoverage,
} = require('../mutation-enforcement-coverage.cjs');

const root = path.resolve(__dirname, '../../../../..');
const registry = JSON.parse(fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/executor-adapters.json'), 'utf8'));
const evidence = JSON.parse(fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/mutation-enforcement-evidence.json'), 'utf8'));
const readSurface = (surface) => fs.readFileSync(path.join(root, surface), 'utf8');
const clone = (value) => JSON.parse(JSON.stringify(value));

const report = buildCoverage({ root });
assert.equal(report.schemaVersion, 1);
assert.equal(report.mode, 'MUTATION_ENFORCEMENT_COVERAGE');
assert.equal(report.status, 'COVERAGE_COMPLETE');
assert.deepEqual(report.counts, {
  totalMutatingRoutes: 7,
  optInProven: 3,
  installedOptIn: 0,
  ungated: 4,
});
assert.equal(report.authorityNeutral, true);
assert.equal(report.mutationAuthorized, false);
assert.equal(report.executionAuthorized, false);
assert.equal(report.nextLegalAction, 'REVIEW_UNGATED_ROUTES_AND_ACTIVATE_ONE_BOUNDED_PACKET');

const byCapability = new Map(report.rows.map((row) => [`${row.adapterId}:${row.capability}`, row]));
assert.equal(byCapability.get('canonical-main:CANONICAL_MAIN_OPERATIONS_REFRESH').enforcementState, 'OPT_IN_PROVEN');
assert.equal(byCapability.get('simcore:SIMCORE_CANDIDATE').enforcementState, 'OPT_IN_PROVEN');
assert.equal(byCapability.get('usage-dashboard:USAGE_DASHBOARD_CANDIDATE').enforcementState, 'OPT_IN_PROVEN');
assert.equal(byCapability.get('canonical-main:CANONICAL_MAIN_CONTROL_PLANE').enforcementState, 'UNGATED');
assert.equal(byCapability.get('simcore:SIMCORE_STATE').enforcementState, 'UNGATED');
assert.equal(byCapability.get('simcore:SIMCORE_RELEASE').enforcementState, 'UNGATED');
assert.equal(byCapability.get('usage-dashboard:USAGE_DASHBOARD_RELEASE').enforcementState, 'UNGATED');

for (const row of report.rows) {
  assert.equal(row.receiptRequired, true);
  assert.equal(row.coordinationReadyOnly, true);
  assert.equal(row.mutationAuthorized, false);
  assert.equal(row.executionAuthorized, false);
}

const missingEvidence = clone(evidence);
missingEvidence.rows = missingEvidence.rows.filter((row) => row.capability !== 'SIMCORE_RELEASE');
assert.throws(
  () => evaluateCoverage({ registry, evidence: missingEvidence, readSurface }),
  /COVERAGE_EVIDENCE_MISSING:simcore::SIMCORE_RELEASE::RELEASE_CHANNEL::GITHUB_WORKFLOW::\.github\/workflows\/simcore-release-command\.yml/,
);

const registryDrift = clone(registry);
registryDrift.adapters.find((adapter) => adapter.adapterId === 'simcore').routes.push({
  capability: 'SIMCORE_FUTURE_MUTATION',
  targetKind: 'LOCAL_NODE',
  target: 'products/simcore/tooling/future-mutation.mjs',
  fixedArgs: [],
  executionClass: 'MUTATING',
  mutationClass: 'PROJECT_STATE',
  invokePolicy: 'HANDOFF_ONLY',
});
assert.throws(
  () => evaluateCoverage({ registry: registryDrift, evidence, readSurface }),
  /COVERAGE_EVIDENCE_MISSING:simcore::SIMCORE_FUTURE_MUTATION::PROJECT_STATE::LOCAL_NODE::products\/simcore\/tooling\/future-mutation\.mjs/,
);

const markerTamper = clone(evidence);
const gated = markerTamper.rows.find((row) => row.capability === 'USAGE_DASHBOARD_CANDIDATE');
const tamperedReader = (surface) => {
  const content = readSurface(surface);
  if (surface === gated.enforcementSurface) {
    return content.replace('mutation-gate.cjs', 'mutation-gate-removed.cjs');
  }
  return content;
};
assert.throws(
  () => evaluateCoverage({ registry, evidence: markerTamper, readSurface: tamperedReader }),
  /COVERAGE_GATE_MARKER_MISSING:usage-dashboard::USAGE_DASHBOARD_CANDIDATE::CANDIDATE_STATE::GITHUB_WORKFLOW::\.github\/workflows\/usage-dashboard-prepare-candidate\.yml:mutation-gate\.cjs/,
);

const invalidUngatedEvidence = clone(evidence);
const ungated = invalidUngatedEvidence.rows.find((row) => row.capability === 'SIMCORE_STATE');
ungated.proofRefs = ['issue:#999999'];
assert.throws(
  () => evaluateCoverage({ registry, evidence: invalidUngatedEvidence, readSurface }),
  /COVERAGE_UNGATED_EVIDENCE_INVALID:simcore::SIMCORE_STATE::PROJECT_STATE::LOCAL_NODE::products\/simcore\/tooling\/admin-state-transition\.mjs/,
);

console.log('MUTATION_ENFORCEMENT_COVERAGE_CONTRACT_PASS');
