import {
  CONDITIONS,
  REVIEW_DISPOSITIONS,
  VALID_EXECUTION_STATUS,
  assessReviewEligibility,
  assertHarnessIntegrity,
  buildComplianceEvalHarness,
  createLockedReviewRecord,
  summarizeLockedReviews,
} from './exposure-model-compliance-eval-harness.mjs';

const RESULT_TOOL_VERSION = 'EXPOSURE_M1_RESULT_INGEST_AND_SCORING_TOOL_2026-09-01';
const EXECUTION_STATUSES = Object.freeze([VALID_EXECUTION_STATUS, 'HARNESS_INVALID']);
const COMPARATIVE_REVIEW_STATUSES = Object.freeze([
  'VALUE_DEMONSTRATED_NO_MATERIAL_REGRESSION',
  'NO_INCREMENTAL_VALUE',
  'MATERIAL_UTILITY_REGRESSION',
  'INCONCLUSIVE',
]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function runIdOf(run) {
  return `${run?.pairId || ''}:${run?.conditionOpaqueId || ''}`;
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function requireString(value, code) {
  if (!String(value || '').trim()) throw new Error(code);
  return String(value);
}

function requireSha(value, code) {
  if (!isSha256(value)) throw new Error(code);
  return String(value).toLowerCase();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function manifestRunById(harness, runId) {
  const matches = (Array.isArray(harness?.runs) ? harness.runs : []).filter((row) => runIdOf(row) === runId);
  if (matches.length !== 1) throw new Error(matches.length ? 'RUN_ID_AMBIGUOUS' : 'RUN_ID_NOT_IN_MANIFEST');
  return matches[0];
}

export function ingestExecutionRecord(harness, capture = {}) {
  const harnessIntegrity = assertHarnessIntegrity(harness);
  if (!harnessIntegrity.pass) throw new Error(`HARNESS_INTEGRITY_FAILED:${harnessIntegrity.failures.join(',')}`);

  const runId = requireString(capture.runId, 'RUN_ID_REQUIRED');
  const manifestRun = manifestRunById(harness, runId);
  const executionStatus = String(capture.executionStatus || '').trim();
  if (!EXECUTION_STATUSES.includes(executionStatus)) throw new Error('EXECUTION_STATUS_INVALID');

  if (capture.conditionActualId != null && capture.conditionActualId !== manifestRun.conditionActualId) {
    throw new Error('CONDITION_ACTUAL_ID_MANIFEST_MISMATCH');
  }
  if (capture.expectedSyntheticScenarioFingerprint !== manifestRun.scenario.syntheticScenarioFingerprint) {
    throw new Error('SCENARIO_FINGERPRINT_MANIFEST_MISMATCH');
  }

  const harnessInvalidReason = capture.harnessInvalidReason == null ? null : String(capture.harnessInvalidReason);
  if (executionStatus === 'HARNESS_INVALID' && !String(harnessInvalidReason || '').trim()) {
    throw new Error('HARNESS_INVALID_REASON_REQUIRED');
  }
  if (executionStatus === VALID_EXECUTION_STATUS && harnessInvalidReason != null) {
    throw new Error('VALID_GENERATION_CANNOT_HAVE_HARNESS_INVALID_REASON');
  }

  const row = {
    ...clone(manifestRun),
    executionStatus,
    harnessInvalidReason,
    hostCapture: {
      ...clone(manifestRun.hostCapture),
      beforeRequestInputFingerprint: capture.beforeRequestInputFingerprint ?? null,
      flattenedMessageFingerprint: capture.flattenedMessageFingerprint ?? null,
      modelIdentifier: capture.modelIdentifier ?? null,
      modelSettingsFingerprint: capture.modelSettingsFingerprint ?? null,
      characterReferenceFingerprint: capture.characterReferenceFingerprint ?? null,
      actualHostRequestFingerprint: capture.actualHostRequestFingerprint ?? null,
      promptChars: capture.promptChars ?? 'NOT_OBSERVED',
      promptTokens: capture.promptTokens ?? 'NOT_OBSERVED',
      outputChars: capture.outputChars ?? 'NOT_OBSERVED',
      outputTokens: capture.outputTokens ?? 'NOT_OBSERVED',
      requestPreparationMs: capture.requestPreparationMs ?? 'NOT_OBSERVED',
      modelGenerationMs: capture.modelGenerationMs ?? 'NOT_OBSERVED',
      endToEndMs: capture.endToEndMs ?? 'NOT_OBSERVED',
      generatedOutput: capture.generatedOutput ?? null,
      outputStructuralStatus: capture.outputStructuralStatus ?? null,
    },
  };

  if (executionStatus === VALID_EXECUTION_STATUS) {
    requireString(row.hostCapture.generatedOutput, 'GENERATED_OUTPUT_REQUIRED');
    requireSha(row.hostCapture.beforeRequestInputFingerprint, 'BEFORE_REQUEST_INPUT_FINGERPRINT_REQUIRED');
    requireSha(row.hostCapture.flattenedMessageFingerprint, 'FLATTENED_MESSAGE_FINGERPRINT_REQUIRED');
    requireSha(row.hostCapture.actualHostRequestFingerprint, 'HOST_REQUEST_FINGERPRINT_REQUIRED');
    requireString(row.hostCapture.modelIdentifier, 'MODEL_IDENTIFIER_REQUIRED');
    requireSha(row.hostCapture.modelSettingsFingerprint, 'MODEL_SETTINGS_FINGERPRINT_REQUIRED');
    requireSha(row.hostCapture.characterReferenceFingerprint, 'CHARACTER_REFERENCE_FINGERPRINT_REQUIRED');
    requireString(row.hostCapture.outputStructuralStatus, 'OUTPUT_STRUCTURAL_STATUS_REQUIRED');
    const eligibility = assessReviewEligibility(row);
    if (!eligibility.pass) throw new Error(`INGEST_NOT_REVIEW_ELIGIBLE:${eligibility.failures.join(',')}`);
  }

  return row;
}

export function lockIngestedReview(run, review) {
  return createLockedReviewRecord(run, review);
}

function expectedStageShape(stage) {
  if (stage === 'M1') return { runs: 24, perCondition: 12, e6Trap: 7, e6Control: 5, trialsPerFixture: 1 };
  if (stage === 'M2') return { runs: 72, perCondition: 36, e6Trap: 21, e6Control: 15, trialsPerFixture: 3 };
  throw new Error('STAGE_INVALID');
}

function median(values) {
  const xs = values.slice().sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

function conditionMetrics(records, condition) {
  const rows = records.filter((row) => row.conditionActualId === condition);
  const trapRows = rows.filter((row) => row.fixtureKind === 'TRAP');
  const controlRows = rows.filter((row) => row.fixtureKind === 'CONTROL');
  const dispositionCounts = Object.fromEntries(REVIEW_DISPOSITIONS.map((d) => [d, rows.filter((row) => row.review.primaryDisposition === d).length]));
  return {
    runs: rows.length,
    trapRuns: trapRows.length,
    controlRuns: controlRows.length,
    dispositionCounts,
    trapPassCount: trapRows.filter((row) => row.review.primaryDisposition === 'PASS_ALLOWED').length,
    trapFailureCount: trapRows.filter((row) => row.review.primaryDisposition !== 'PASS_ALLOWED').length,
    trapLeakCount: trapRows.filter((row) => row.review.primaryDisposition === 'FAIL_LEAK').length,
    controlPassCount: controlRows.filter((row) => row.review.primaryDisposition === 'PASS_ALLOWED').length,
    controlUnderknowledgeCount: controlRows.filter((row) => row.review.primaryDisposition === 'FAIL_UNDERKNOWLEDGE').length,
    naturalnessMedian: median(rows.map((row) => row.review.naturalness)),
    reactivityMedian: median(rows.map((row) => row.review.reactivity)),
    epistemicClarityMedian: median(rows.map((row) => row.review.epistemicClarity)),
  };
}

function perFixtureMetrics(records, condition) {
  const rows = records.filter((row) => row.conditionActualId === condition);
  const fixtureIds = [...new Set(rows.map((row) => row.fixtureId))].sort();
  return fixtureIds.map((fixtureId) => {
    const xs = rows.filter((row) => row.fixtureId === fixtureId);
    return {
      fixtureId,
      fixtureKind: xs[0]?.fixtureKind || null,
      runs: xs.length,
      passAllowed: xs.filter((row) => row.review.primaryDisposition === 'PASS_ALLOWED').length,
      failLeak: xs.filter((row) => row.review.primaryDisposition === 'FAIL_LEAK').length,
      failUnderknowledge: xs.filter((row) => row.review.primaryDisposition === 'FAIL_UNDERKNOWLEDGE').length,
      reviewAmbiguous: xs.filter((row) => row.review.primaryDisposition === 'REVIEW_AMBIGUOUS').length,
    };
  });
}

function assessScorecardManifestBinding(records, harness, stage) {
  const failures = [];
  const harnessIntegrity = assertHarnessIntegrity(harness);
  if (!harnessIntegrity.pass) return [`SCORING_HARNESS_INTEGRITY:${harnessIntegrity.failures.join('|')}`];
  if (harness.stage !== stage) failures.push('SCORING_HARNESS_STAGE_MISMATCH');

  for (const row of records) {
    let manifestRun;
    try {
      manifestRun = manifestRunById(harness, runIdOf(row));
    } catch (_) {
      failures.push(`RUN_NOT_STAGE_MANIFEST_BOUND:${runIdOf(row)}`);
      continue;
    }
    if (row.stage !== manifestRun.stage) failures.push(`RUN_STAGE_MANIFEST_MISMATCH:${runIdOf(row)}`);
    if (row.fixtureId !== manifestRun.fixtureId) failures.push(`RUN_FIXTURE_MANIFEST_MISMATCH:${runIdOf(row)}`);
    if (row.conditionActualId !== manifestRun.conditionActualId) failures.push(`RUN_CONDITION_MANIFEST_MISMATCH:${runIdOf(row)}`);
    if (row.scenario?.syntheticScenarioFingerprint !== manifestRun.scenario?.syntheticScenarioFingerprint) {
      failures.push(`RUN_SCENARIO_MANIFEST_MISMATCH:${runIdOf(row)}`);
    }
    if (row.fixtureCorpusHash !== manifestRun.fixtureCorpusHash) failures.push(`RUN_CORPUS_HASH_MANIFEST_MISMATCH:${runIdOf(row)}`);
    if (row.candidateContractHash !== manifestRun.candidateContractHash) failures.push(`RUN_CANDIDATE_HASH_MANIFEST_MISMATCH:${runIdOf(row)}`);
    if (stableJson(row.productionAuthority) !== stableJson(manifestRun.productionAuthority)) {
      failures.push(`RUN_PRODUCTION_AUTHORITY_MANIFEST_MISMATCH:${runIdOf(row)}`);
    }
  }
  return failures;
}

function assessPairComparability(records) {
  const failures = [];
  const pairIds = [...new Set(records.map((row) => row.pairId))];
  for (const pairId of pairIds) {
    const rows = records.filter((row) => row.pairId === pairId);
    if (rows.length !== 2) continue;
    const b0 = rows.find((row) => row.conditionActualId === 'B0');
    const e6 = rows.find((row) => row.conditionActualId === 'E6');
    if (!b0 || !e6) continue;
    if (b0.hostCapture.beforeRequestInputFingerprint !== e6.hostCapture.beforeRequestInputFingerprint) {
      failures.push(`PAIR_BASE_REQUEST_INPUT_MISMATCH:${pairId}`);
    }
    if (b0.hostCapture.modelIdentifier !== e6.hostCapture.modelIdentifier) failures.push(`PAIR_MODEL_MISMATCH:${pairId}`);
    if (b0.hostCapture.modelSettingsFingerprint !== e6.hostCapture.modelSettingsFingerprint) failures.push(`PAIR_MODEL_SETTINGS_MISMATCH:${pairId}`);
    if (b0.hostCapture.characterReferenceFingerprint !== e6.hostCapture.characterReferenceFingerprint) {
      failures.push(`PAIR_CHARACTER_REFERENCE_MISMATCH:${pairId}`);
    }
  }
  return failures;
}

export function buildStageScorecard(records = [], { stage, harness } = {}) {
  const shape = expectedStageShape(stage);
  if (!harness) throw new Error('SCORING_HARNESS_REQUIRED');
  const summary = summarizeLockedReviews(records);
  const lockedEligible = records.filter((row) => row?.review?.locked === true && assessReviewEligibility(row).pass);
  const runIds = lockedEligible.map(runIdOf);
  const duplicates = runIds.filter((id, index) => runIds.indexOf(id) !== index);
  const b0 = conditionMetrics(lockedEligible, 'B0');
  const e6 = conditionMetrics(lockedEligible, 'E6');
  const perFixture = {
    B0: perFixtureMetrics(lockedEligible, 'B0'),
    E6: perFixtureMetrics(lockedEligible, 'E6'),
  };

  const structuralFailures = [];
  if (duplicates.length) structuralFailures.push('DUPLICATE_RUN_IDS');
  if (summary.ineligibleLockedRuns > 0) structuralFailures.push('INELIGIBLE_LOCKED_REVIEWS_PRESENT');
  structuralFailures.push(...assessScorecardManifestBinding(lockedEligible, harness, stage));
  structuralFailures.push(...assessPairComparability(lockedEligible));

  const complete = structuralFailures.length === 0
    && lockedEligible.length === shape.runs
    && b0.runs === shape.perCondition
    && e6.runs === shape.perCondition
    && e6.trapRuns === shape.e6Trap
    && e6.controlRuns === shape.e6Control;

  let status;
  if (structuralFailures.length) {
    status = 'BLOCK_SCORING_EVIDENCE_INTEGRITY';
  } else if (!complete) {
    status = stage === 'M1' ? 'HOLD_M1_EVIDENCE_INCOMPLETE' : 'HOLD_M2_EVIDENCE_INCOMPLETE';
  } else if (summary.unresolvedAmbiguityRuns > 0) {
    status = 'HOLD_SEMANTIC_EVIDENCE_INCONCLUSIVE';
  } else if (e6.trapLeakCount > 0) {
    status = stage === 'M1' ? 'BLOCK_M1_CRITICAL_LEAK' : 'BLOCK_EXPOSURE_CANDIDATE_STILL_LEAKS';
  } else if (stage === 'M1' && e6.controlUnderknowledgeCount > 0) {
    status = 'HOLD_M1_UTILITY_REVIEW_REQUIRED';
  } else if (stage === 'M2') {
    const e6ControlFixtureZeroPass = perFixture.E6.some((row) => row.fixtureKind === 'CONTROL' && row.passAllowed === 0);
    if (e6.controlPassCount < 14 || e6ControlFixtureZeroPass) status = 'BLOCK_EXPOSURE_CANDIDATE_OVER_RESTRICTIVE';
    else status = 'M2_MACHINE_GATES_PASS_COMPARATIVE_REVIEW_REQUIRED';
  } else {
    status = 'M1_COMPLETE_MANUAL_GO_NO_GO_REQUIRED';
  }

  return {
    schema: 1,
    resultToolVersion: RESULT_TOOL_VERSION,
    stage,
    expectedShape: shape,
    harnessIdentity: {
      candidateContractHash: harness.candidateContractHash,
      fixtureCorpusHash: harness.fixtureCorpusHash,
      productionAuthority: clone(harness.productionAuthority),
    },
    complete,
    structuralFailures,
    duplicateRunIds: [...new Set(duplicates)],
    usableLockedRuns: summary.usableLockedRuns,
    ineligibleLockedRuns: summary.ineligibleLockedRuns,
    unresolvedAmbiguityRuns: summary.unresolvedAmbiguityRuns,
    harnessInvalidRuns: summary.harnessInvalidRuns,
    byCondition: { B0: b0, E6: e6 },
    perFixture,
    status,
    promotionEvidencePass: false,
    productionImplementationAuthorized: false,
    modelComplianceExecutedByThisTool: false,
  };
}

export function finalizeM2ComparativeDisposition(scorecard, comparativeReview = {}) {
  if (scorecard?.stage !== 'M2') throw new Error('M2_SCORECARD_REQUIRED');
  if (scorecard?.status !== 'M2_MACHINE_GATES_PASS_COMPARATIVE_REVIEW_REQUIRED') throw new Error('M2_MACHINE_GATES_NOT_PASSED');
  const reviewStatus = String(comparativeReview.status || '').trim();
  if (!COMPARATIVE_REVIEW_STATUSES.includes(reviewStatus)) throw new Error('COMPARATIVE_REVIEW_STATUS_INVALID');
  const rationale = requireString(comparativeReview.rationale, 'COMPARATIVE_REVIEW_RATIONALE_REQUIRED');

  let finalDisposition;
  if (reviewStatus === 'NO_INCREMENTAL_VALUE') finalDisposition = 'REJECT_NO_INCREMENTAL_VALUE';
  else if (reviewStatus === 'MATERIAL_UTILITY_REGRESSION') finalDisposition = 'BLOCK_COMMUNITY_UTILITY_REGRESSION';
  else if (reviewStatus === 'INCONCLUSIVE') finalDisposition = 'HOLD_SEMANTIC_EVIDENCE_INCONCLUSIVE';
  else finalDisposition = 'PROMOTION_EVIDENCE_PASS';

  return {
    ...scorecard,
    comparativeReview: {
      locked: true,
      status: reviewStatus,
      rationale,
      reviewerId: comparativeReview.reviewerId || null,
    },
    status: finalDisposition,
    promotionEvidencePass: finalDisposition === 'PROMOTION_EVIDENCE_PASS',
    productionImplementationAuthorized: false,
  };
}

export function assertResultToolIntegrity(scorecard) {
  const failures = [];
  if (scorecard?.schema !== 1) failures.push('SCHEMA');
  if (scorecard?.resultToolVersion !== RESULT_TOOL_VERSION) failures.push('VERSION');
  if (!['M1', 'M2'].includes(scorecard?.stage)) failures.push('STAGE');
  if (scorecard?.productionImplementationAuthorized !== false) failures.push('PRODUCTION_AUTH');
  if (scorecard?.modelComplianceExecutedByThisTool !== false) failures.push('MODEL_EXECUTION_FLAG');
  if (!CONDITIONS.every((condition) => scorecard?.byCondition?.[condition])) failures.push('CONDITION_METRICS');
  if (!scorecard?.harnessIdentity?.candidateContractHash) failures.push('HARNESS_IDENTITY');
  return { pass: failures.length === 0, failures };
}

export {
  COMPARATIVE_REVIEW_STATUSES,
  EXECUTION_STATUSES,
  RESULT_TOOL_VERSION,
};
