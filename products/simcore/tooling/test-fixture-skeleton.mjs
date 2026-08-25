#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSkeleton, run } from './fixture-skeleton.mjs';

function source(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: 'simcore-live-fixture-source',
    sourceId: 'NE-20260823-008',
    productionVersion: 'v0.64.6',
    scenario: 'REPRESENTATION_FAST_RECONCILE',
    evidence: { primary: 'docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md §3–5', additional: [] },
    proofUnit: { kind: 'PAIRED', observations: ['@2136→@2137', '@2138→@2139'] },
    target: { suiteCandidate: 'representation-fast', semanticOwner: 'edit-reconcile', surfaceCandidate: 'reconcile' },
    inputFacts: [{ id: 'prior-fresh', owner: 'edit-reconcile', fact: 'current-visible-equals-prior-fresh', value: true, evidenceRef: 'docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md §4', stability: 'DETERMINISTIC' }],
    expectedCandidates: [{ id: 'fast-result', owner: 'edit-reconcile', resultPath: 'editReconcile', expected: 'REPRESENTATION_FAST_RECONCILED', evidenceRef: 'docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md §4', assertionBasis: 'OWNER_STATE_TRANSITION' }],
    protectedInvariants: [{ id: 'no-rebuild', statement: 'representation drift must not become a manual-edit rebuild', evidenceRef: 'docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md §4' }],
    observationalFacts: [{ id: 'prod-version', fact: 'production-version', value: 'v0.64.6', evidenceRef: 'docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md §3' }],
    unknowns: [{ id: 'host-transform', subject: 'output-side representation transform cause', reason: 'unattributed by evidence', evidenceRef: 'docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md §3–5' }],
    minimizationNeeds: ['replace live content with bounded synthetic representation inputs'],
    ...overrides,
  };
}

const a = buildSkeleton(source());
const b = buildSkeleton(source());
assert.deepEqual(a, b);
assert.match(a.skeletonId, /^FKS1-[a-f0-9]{64}$/);
assert.equal(a.promotion.state, 'REVIEW_REQUIRED');
assert.equal(a.promotion.fixtureV1Ready, false);
assert(a.promotion.reviewFlags.includes('UNKNOWNS_INTENTIONALLY_UNASSERTED'));

const unresolved = buildSkeleton(source({
  target: { suiteCandidate: 'UNRESOLVED', semanticOwner: 'UNRESOLVED', surfaceCandidate: 'UNRESOLVED' },
  expectedCandidates: [],
}));
assert.deepEqual(unresolved.promotion.blockers, ['OWNER_NOT_RESOLVED', 'SUITE_NOT_RESOLVED', 'SURFACE_NOT_RESOLVED']);

assert.throws(() => buildSkeleton({ ...source(), raw: 'forbidden' }), /source\.raw/);
assert.throws(() => buildSkeleton(source({ target: { suiteCandidate: 'not-a-suite', semanticOwner: 'Time', surfaceCandidate: 'x' } })), /not-a-suite/);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-m10-'));
try {
  const sourcePath = path.join(dir, 'source.json');
  fs.writeFileSync(sourcePath, JSON.stringify(source()), 'utf8');
  assert.throws(
    () => run(['--source', sourcePath, '--out', 'products/simcore/tests/fixtures/representation-fast/generated.json']),
    /may not write fixture-v1/,
  );
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log('M10_FIXTURE_SKELETON_TEST_PASS');
