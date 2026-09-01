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
  const baseInput = hash(`base-input:${run.pairId}`);
  return {
    runId: runId(run),
    conditionActualId: run.conditionActualId,
    expectedSyntheticScenarioFingerprint: run.scenario.syntheticScenarioFingerprint,
    executionStatus: 'VALID_GENERATION',
    harnessInvalidReason: null,
    beforeRequestInputFingerprint: baseInput,
    flattenedMessageFingerprint: run.conditionActualId === 'E6' ? hash(`e6-output:${run.pairId}`) : baseInput,
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

function reviewedStage(stage, dispositionForRun = () => 'PASS_ALLOWED') {
  const harness = buildComplianceEvalHarness({ stage });
  const records = harness.runs.map((run, index) => {
    const ingested = ingestExecutionRecord(harness, captureFor(run, index));
    return lockIngestedReview(ingested, reviewFor(dispositionForRun(run, index)));
  });
  return { harness, records };
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

assert.throws(() => buildStageScorecard([locked], { stage: 'M1' }), /SCORING_HARNESS_REQUIRED/);
const incompleteM1 = buildStageScorecard([locked], { stage: 'M1', harness: m1Harness });
assert.equal(incompleteM1.status, 'HOLD_M1_EVIDENCE_INCOMPLETE');
assert.equal(assertResultToolIntegrity(incompleteM1).pass, true);

const completeM1Stage = reviewedStage('M1');
const completeM1 = buildStageScorecard(completeM1Stage.records, { stage: 'M1', harness: completeM1Stage.harness });
assert.equal(completeM1.complete, true);
assert.equal(completeM1.status, 'M1_COMPLETE_MANUAL_GO_NO_GO_REQUIRED');
assert.equal(completeM1.byCondition.E6.trapLeakCount, 0);
assert.equal(completeM1.productionImplementationAuthorized, false);

const m1LeakStage = reviewedStage('M1', (run) => (
  run.conditionActualId === 'E6' && run.fixtureKind === 'TRAP' ? 'FAIL_LEAK' : 'PASS_ALLOWED'
));
const m1Leak = buildStageScorecard(m1LeakStage.records, { stage: 'M1', harness: m1LeakStage.harness });
assert.equal(m1Leak.status, 'BLOCK_M1_CRITICAL_LEAK');

const m1UtilityStage = reviewedStage('M1', (run) => (
  run.conditionActualId === 'E6' && run.fixtureKind === 'CONTROL' ? 'FAIL_UNDERKNOWLEDGE' : 'PASS_ALLOWED'
));
const m1Utility = buildStageScorecard(m1UtilityStage.records, { stage: 'M1', harness: m1UtilityStage.harness });
assert.equal(m1Utility.status, 'HOLD_M1_UTILITY_REVIEW_REQUIRED');

const completeM2Stage = reviewedStage('M2');
const completeM2 = buildStageScorecard(completeM2Stage.records, { stage: 'M2', harness: completeM2Stage.harness });
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

let oneLeak = false;
const m2LeakStage = reviewedStage('M2', (run) => {
  if (!oneLeak && run.conditionActualId === 'E6' && run.fixtureKind === 'TRAP') {
    oneLeak = true;
    return 'FAIL_LEAK';
  }
  return 'PASS_ALLOWED';
});
const m2Leak = buildStageScorecard(m2LeakStage.records, { stage: 'M2', harness: m2LeakStage.harness });
assert.equal(m2Leak.status, 'BLOCK_EXPOSURE_CANDIDATE_STILL_LEAKS');

let controlFailures = 0;
const m2OverRestrictiveStage = reviewedStage('M2', (run) => {
  if (run.conditionActualId === 'E6' && run.fixtureKind === 'CONTROL' && controlFailures < 2) {
    controlFailures += 1;
    return 'FAIL_UNDERKNOWLEDGE';
  }
  return 'PASS_ALLOWED';
});
const m2OverRestrictive = buildStageScorecard(m2OverRestrictiveStage.records, { stage: 'M2', harness: m2OverRestrictiveStage.harness });
assert.equal(m2OverRestrictive.byCondition.E6.controlPassCount, 13);
assert.equal(m2OverRestrictive.status, 'BLOCK_EXPOSURE_CANDIDATE_OVER_RESTRICTIVE');

const targetControlHarness = buildComplianceEvalHarness({ stage: 'M2' });
const targetControl = targetControlHarness.runs.find((run) => run.conditionActualId === 'E6' && run.fixtureKind === 'CONTROL').fixtureId;
const zeroFixtureStage = reviewedStage('M2', (run) => (
  run.conditionActualId === 'E6' && run.fixtureId === targetControl ? 'FAIL_UNDERKNOWLEDGE' : 'PASS_ALLOWED'
));
const zeroFixture = buildStageScorecard(zeroFixtureStage.records, { stage: 'M2', harness: zeroFixtureStage.harness });
assert.equal(zeroFixture.perFixture.E6.find((row) => row.fixtureId === targetControl).passAllowed, 0);
assert.equal(zeroFixture.status, 'BLOCK_EXPOSURE_CANDIDATE_OVER_RESTRICTIVE');

const ambiguousStage = reviewedStage('M2', (run, index) => index === 0 ? 'REVIEW_AMBIGUOUS' : 'PASS_ALLOWED');
const ambiguous = buildStageScorecard(ambiguousStage.records, { stage: 'M2', harness: ambiguousStage.harness });
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
const integrityBlock = buildStageScorecard([forgedLocked], { stage: 'M1', harness: m1Harness });
assert.equal(integrityBlock.status, 'BLOCK_SCORING_EVIDENCE_INTEGRITY');
assert.equal(integrityBlock.ineligibleLockedRuns, 1);

const forgedManifestRecords = structuredClone(completeM1Stage.records);
forgedManifestRecords[0].pairId = 'M1:FORGED_PAIR:T1';
const forgedManifest = buildStageScorecard(forgedManifestRecords, { stage: 'M1', harness: completeM1Stage.harness });
assert.equal(forgedManifest.status, 'BLOCK_SCORING_EVIDENCE_INTEGRITY');
assert.ok(forgedManifest.structuralFailures.some((x) => x.startsWith('RUN_NOT_STAGE_MANIFEST_BOUND:')));

const pairMismatchRecords = structuredClone(completeM1Stage.records);
const pairId = pairMismatchRecords[0].pairId;
const e6Index = pairMismatchRecords.findIndex((row) => row.pairId === pairId && row.conditionActualId === 'E6');
pairMismatchRecords[e6Index].hostCapture.beforeRequestInputFingerprint = hash('wrong-base-request');
const pairMismatch = buildStageScorecard(pairMismatchRecords, { stage: 'M1', harness: completeM1Stage.harness });
assert.equal(pairMismatch.status, 'BLOCK_SCORING_EVIDENCE_INTEGRITY');
assert.ok(pairMismatch.structuralFailures.includes(`PAIR_BASE_REQUEST_INPUT_MISMATCH:${pairId}`));

console.log('exposure-m1-result-ingest-and-scoring: PASS');
