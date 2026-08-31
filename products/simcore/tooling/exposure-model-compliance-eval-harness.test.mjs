import assert from 'node:assert/strict';
import {
  buildComplianceEvalHarness,
  buildBlindReviewPacket,
  assertHarnessIntegrity,
  candidateContractHash,
  createLockedReviewRecord,
  fixtureCorpusHash,
  summarizeLockedReviews,
} from './exposure-model-compliance-eval-harness.mjs';
import { EXPOSURE_LINES } from './exposure-prompt-contract-offline-evaluator.mjs';
import { EXPOSURE_SEMANTIC_CASES } from './exposure-semantic-adversarial-fixture-corpus.mjs';

const m1 = buildComplianceEvalHarness({ stage: 'M1' });
assert.equal(m1.fixtureCount, 12);
assert.equal(m1.trapFixtureCount, 7);
assert.equal(m1.controlFixtureCount, 5);
assert.equal(m1.pairCount, 12);
assert.equal(m1.runCount, 24);
assert.equal(m1.modelCallsExecuted, false);
assert.equal(m1.runtimeMutationAuthorized, false);
assert.equal(m1.candidateLineCount, 6);
assert.equal(m1.candidateContractHash, candidateContractHash(EXPOSURE_LINES));
assert.equal(m1.fixtureCorpusHash, fixtureCorpusHash(EXPOSURE_SEMANTIC_CASES));
assert.deepEqual(assertHarnessIntegrity(m1), { pass: true, failures: [] });

const m2 = buildComplianceEvalHarness({ stage: 'M2' });
assert.equal(m2.pairCount, 36);
assert.equal(m2.runCount, 72);
assert.equal(m2.runs.filter((r) => r.conditionActualId === 'B0').length, 36);
assert.equal(m2.runs.filter((r) => r.conditionActualId === 'E6').length, 36);
assert.equal(m2.runs.filter((r) => r.fixtureKind === 'TRAP' && r.conditionActualId === 'E6').length, 21);
assert.equal(m2.runs.filter((r) => r.fixtureKind === 'CONTROL' && r.conditionActualId === 'E6').length, 15);
assert.deepEqual(assertHarnessIntegrity(m2), { pass: true, failures: [] });

for (const pair of m2.pairs) {
  const rows = m2.runs.filter((r) => r.pairId === pair.pairId);
  assert.equal(rows.length, 2);
  assert.deepEqual(new Set(rows.map((r) => r.conditionActualId)), new Set(['B0', 'E6']));
  assert.deepEqual(new Set(rows.map((r) => r.conditionOpaqueId)), new Set(['X', 'Y']));
  const b0 = rows.find((r) => r.conditionActualId === 'B0');
  const e6 = rows.find((r) => r.conditionActualId === 'E6');
  assert.equal(b0.scenario.candidateLineCount, 0);
  assert.equal(e6.scenario.candidateLineCount, 6);
  assert.equal(b0.scenario.actualHostRequestFingerprint, null);
  assert.equal(e6.scenario.actualHostRequestFingerprint, null);
  assert.ok(b0.scenario.syntheticScenarioFingerprint);
  assert.ok(e6.scenario.syntheticScenarioFingerprint);
}

const packet = buildBlindReviewPacket(m2.runs[0]);
assert.equal('conditionActualId' in packet, false);
assert.equal('candidateContractHash' in packet, false);
assert.equal('candidateOverlay' in packet, false);
assert.equal(packet.conditionOpaqueId === 'X' || packet.conditionOpaqueId === 'Y', true);

const sample = { ...m2.runs[0], executionStatus: 'VALID_GENERATION' };
const locked = createLockedReviewRecord(sample, {
  primaryDisposition: 'PASS_ALLOWED',
  naturalness: 4,
  reactivity: 5,
  epistemicClarity: 4,
  rationale: 'Fixture oracle is respected without suppressing allowed Community behavior.',
  reviewerId: 'reviewer-1',
});
assert.equal(locked.review.locked, true);
assert.equal(locked.review.primaryDisposition, 'PASS_ALLOWED');

assert.throws(() => createLockedReviewRecord(sample, {
  primaryDisposition: 'MAGIC_PASS', naturalness: 4, reactivity: 4, epistemicClarity: 4, rationale: 'x',
}), /PRIMARY_DISPOSITION_INVALID/);
assert.throws(() => createLockedReviewRecord(sample, {
  primaryDisposition: 'PASS_ALLOWED', naturalness: 6, reactivity: 4, epistemicClarity: 4, rationale: 'x',
}), /NATURALNESS_INVALID/);

const summary = summarizeLockedReviews([locked]);
assert.equal(summary.usableLockedRuns, 1);
assert.equal(summary.finalDisposition, 'NOT_COMPUTED_UNTIL_COMPLETE_M2_AND_COMPARATIVE_REVIEW');

const m2Again = buildComplianceEvalHarness({ stage: 'M2' });
assert.equal(m2Again.candidateContractHash, m2.candidateContractHash);
assert.equal(m2Again.fixtureCorpusHash, m2.fixtureCorpusHash);
assert.deepEqual(m2Again.pairs.map((p) => p.opaqueConditionMap), m2.pairs.map((p) => p.opaqueConditionMap));
assert.deepEqual(m2Again.pairs.map((p) => p.executionOrder), m2.pairs.map((p) => p.executionOrder));

console.log(`exposure-model-compliance-eval-harness: PASS (${m2.runCount} M2 runs, ${m2.pairCount} pairs)`);
