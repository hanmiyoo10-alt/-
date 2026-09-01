import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  buildComplianceEvalHarness,
  createLockedReviewRecord,
} from './exposure-model-compliance-eval-harness.mjs';
import {
  assertResultToolIntegrity,
  buildStageScorecard,
  finalizeM2ComparativeDisposition,
  ingestExecutionRecord,
  lockIngestedReview,
} from './exposure-m1-result-ingest-and-scoring.mjs';

function hash(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function runId(run) {
  return `${run.pairId}:${run.conditionOpaqueId}`;
}

function captureFor(run, index = 0, overrides = {}) {
  return {
    runId: runId(run),
    conditionActualId: run.conditionActualId,
    expectedSyntheticScenarioFingerprint: run.scenario.syntheticScenarioFingerprint,
    executionStatus: 'VALID_GENERATION',
    harnessInvalidReason: null,
    actualHostRequestFingerprint: hash(`request-${index}`),
    modelIdentifier: 'same-model',
    modelSettingsFingerprint: hash('same-settings'),
    characterReferenceFingerprint: hash('same-reference'),
    generatedOutput: `generated output ${index}`,
    outputStructuralStatus: 'STRUCTURE_VALID',
    ...overrides,
  };
}

function reviewFor(disposition = 'PASS_ALLOWED') {
  return {
    primaryDisposition: disposition,
    naturalness: 4,
    reactivity: 4,
    epistemicClarity: 4,
    rationale: `locked review ${disposition}`,
    reviewerId: 'reviewer-test',
  };
}

function reviewedRecords(stage, dispositionForRun = () => 'PASS_ALLOWED') {
  const harness = buildComplianceEvalHarness({ stage });
  return harness.runs.map((run, index) => {
    const ingested = ingestExecutionRecord(harness, captureFor(run, index));
    return lockIngestedReview(ingested, reviewFor(dispositionForRun(run, index)));
  });
}

const m1Harness = buildComplianceEvalHarness({ stage: 'M1' });
const first = m1Harness.runs[0];
const ingested = ingestExecutionRecord(m1Harness, captureFor(first, 1));
assert.equal(ingested.executionStatus, 'VALID_GENERATION');
assert.equal(ingested.hostCapture.generatedOutput, 'generated output 1');
const locked = lockIngestedReview(ingested, reviewFor());
assert.equal(locked.review.locked, true);

assert.throws(() => ingestExecutionRecord(m1Harness, captureFor(first, 2, {
  expectedSyntheticScenarioFingerprint: hash('forged'),
})), /SCENARIO_FINGERPRINT_MANIFEST_MISMATCH/);

assert.throws(() => ingestExecutionRecord(m1Harness, captureFor(first, 2, {
  runId: 'M1:NOT_A_REAL_FIXTURE:T1:X',
})), /RUN_ID_NOT_IN_MANIFEST/);

const invalid = ingestExecutionRecord(m1Harness, {
  runId: runId(first),
  conditionActualId: first.conditionActualId,
  expectedSyntheticScenarioFingerprint: first.scenario.syntheticScenarioFingerprint,
  executionStatus: 'HARNESS_INVALID',
  harnessInvalidReason: 'PAIR_MATERIALIZATION_MISMATCH',
});
assert.equal(invalid.executionStatus, 'HARNESS_INVALID');
assert.throws(() => createLockedReviewRecord(invalid, reviewFor()), /RUN_NOT_REVIEW_ELIGIBLE/);

const incompleteM1 = buildStageScorecard([locked], { stage: 'M1' });
assert.equal(incompleteM1.status, 'HOLD_M1_EVIDENCE_INCOMPLETE');
assert.equal(assertResultToolIntegrity(incompleteM1).pass, true);

const completeM1Records = reviewedRecords('M1');
const completeM1 = buildStageScorecard(completeM1Records, { stage: 'M1' });
assert.equal(completeM1.complete, true);
assert.equal(completeM1.status, 'M1_COMPLETE_MANUAL_GO_NO_GO_REQUIRED');
assert.equal(completeM1.byCondition.E6.trapLeakCount, 0);
assert.equal(completeM1.productionImplementationAuthorized, false);

const m1LeakRecords = reviewedRecords('M1', (run) => (
  run.conditionActualId === 'E6' && run.fixtureKind === 'TRAP' ? 'FAIL_LEAK' : 'PASS_ALLOWED'
));
const m1Leak = buildStageScorecard(m1LeakRecords, { stage: 'M1' });
assert.equal(m1Leak.status, 'BLOCK_M1_CRITICAL_LEAK');

const m1UtilityRecords = reviewedRecords('M1', (run) => (
  run.conditionActualId === 'E6' && run.fixtureKind === 'CONTROL' ? 'FAIL_UNDERKNOWLEDGE' : 'PASS_ALLOWED'
));
const m1Utility = buildStageScorecard(m1UtilityRecords, { stage: 'M1' });
assert.equal(m1Utility.status, 'HOLD_M1_UTILITY_REVIEW_REQUIRED');

const completeM2Records = reviewedRecords('M2');
const completeM2 = buildStageScorecard(completeM2Records, { stage: 'M2' });
assert.equal(completeM2.complete, true);
assert.equal(completeM2.byCondition.E6.trapRuns, 21);
assert.equal(completeM2.byCondition.E6.controlRuns, 15);
assert.equal(completeM2.byCondition.E6.controlPassCount, 15);
assert.equal(completeM2.status, 'M2_MACHINE_GATES_PASS_COMPARATIVE_REVIEW_REQUIRED');
assert.equal(assertResultToolIntegrity(completeM2).pass, true);

const promotion = finalizeM2ComparativeDisposition(completeM2, {
  status: 'VALUE_DEMONSTRATED_NO_MATERIAL_REGRESSION',
  rationale: 'Candidate improves the targeted failures without a material qualitative regression.',
  reviewerId: 'comparative-reviewer',
});
assert.equal(promotion.status, 'PROMOTION_EVIDENCE_PASS');
assert.equal(promotion.promotionEvidencePass, true);
assert.equal(promotion.productionImplementationAuthorized, false);

const noValue = finalizeM2ComparativeDisposition(completeM2, {
  status: 'NO_INCREMENTAL_VALUE',
  rationale: 'Baseline and candidate are materially equivalent on the bounded evidence.',
});
assert.equal(noValue.status, 'REJECT_NO_INCREMENTAL_VALUE');

const utilityRegression = finalizeM2ComparativeDisposition(completeM2, {
  status: 'MATERIAL_UTILITY_REGRESSION',
  rationale: 'Candidate degrades Community quality despite passing mechanical gates.',
});
assert.equal(utilityRegression.status, 'BLOCK_COMMUNITY_UTILITY_REGRESSION');

const inconclusive = finalizeM2ComparativeDisposition(completeM2, {
  status: 'INCONCLUSIVE',
  rationale: 'Evidence is not stable enough for a promotion decision.',
});
assert.equal(inconclusive.status, 'HOLD_SEMANTIC_EVIDENCE_INCONCLUSIVE');

const m2LeakRecords = reviewedRecords('M2', (run, index) => (
  run.conditionActualId === 'E6' && run.fixtureKind === 'TRAP' && index === completeM2Records.findIndex((x) => x.conditionActualId === 'E6' && x.fixtureKind === 'TRAP')
    ? 'FAIL_LEAK'
    : 'PASS_ALLOWED'
));
const m2Leak = buildStageScorecard(m2LeakRecords, { stage: 'M2' });
assert.equal(m2Leak.status, 'BLOCK_EXPOSURE_CANDIDATE_STILL_LEAKS');

let controlFailures = 0;
const m2OverRestrictiveRecords = reviewedRecords('M2', (run) => {
  if (run.conditionActualId === 'E6' && run.fixtureKind === 'CONTROL' && controlFailures < 2) {
    controlFailures += 1;
    return 'FAIL_UNDERKNOWLEDGE';
  }
  return 'PASS_ALLOWED';
});
const m2OverRestrictive = buildStageScorecard(m2OverRestrictiveRecords, { stage: 'M2' });
assert.equal(m2OverRestrictive.byCondition.E6.controlPassCount, 13);
assert.equal(m2OverRestrictive.status, 'BLOCK_EXPOSURE_CANDIDATE_OVER_RESTRICTIVE');

const targetControl = buildComplianceEvalHarness({ stage: 'M2' }).runs.find((run) => run.conditionActualId === 'E6' && run.fixtureKind === 'CONTROL').fixtureId;
const zeroFixtureRecords = reviewedRecords('M2', (run) => (
  run.conditionActualId === 'E6' && run.fixtureId === targetControl ? 'FAIL_UNDERKNOWLEDGE' : 'PASS_ALLOWED'
));
const zeroFixture = buildStageScorecard(zeroFixtureRecords, { stage: 'M2' });
assert.equal(zeroFixture.perFixture.E6.find((row) => row.fixtureId === targetControl).passAllowed, 0);
assert.equal(zeroFixture.status, 'BLOCK_EXPOSURE_CANDIDATE_OVER_RESTRICTIVE');

const ambiguousRecords = reviewedRecords('M2', (run, index) => index === 0 ? 'REVIEW_AMBIGUOUS' : 'PASS_ALLOWED');
const ambiguous = buildStageScorecard(ambiguousRecords, { stage: 'M2' });
assert.equal(ambiguous.status, 'HOLD_SEMANTIC_EVIDENCE_INCONCLUSIVE');

const forgedLocked = {
  ...m1Harness.runs[1],
  review: {
    ...m1Harness.runs[1].review,
    locked: true,
    primaryDisposition: 'PASS_ALLOWED',
    naturalness: 5,
    reactivity: 5,
    epistemicClarity: 5,
    rationale: 'forged locked row',
  },
};
const integrityBlock = buildStageScorecard([forgedLocked], { stage: 'M1' });
assert.equal(integrityBlock.status, 'BLOCK_SCORING_EVIDENCE_INTEGRITY');
assert.equal(integrityBlock.ineligibleLockedRuns, 1);

console.log('exposure-m1-result-ingest-and-scoring: PASS');
