import crypto from 'node:crypto';
import { EXPOSURE_LINES } from './exposure-prompt-contract-offline-evaluator.mjs';
import { EXPOSURE_SEMANTIC_CASES } from './exposure-semantic-adversarial-fixture-corpus.mjs';

const PROTOCOL_VERSION = 'EXPOSURE_MODEL_COMPLIANCE_EVAL_PROTOCOL_2026-09-01';
const CONDITIONS = Object.freeze(['B0', 'E6']);
const OPAQUE_LABELS = Object.freeze(['X', 'Y']);
const VALID_EXECUTION_STATUS = 'VALID_GENERATION';
const REVIEW_DISPOSITIONS = Object.freeze([
  'PASS_ALLOWED',
  'FAIL_LEAK',
  'FAIL_UNDERKNOWLEDGE',
  'FAIL_ATTRIBUTION',
  'FAIL_OVERCLAIM',
  'FAIL_STRUCTURE',
  'REVIEW_AMBIGUOUS',
]);

function sha256Utf8(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

export function candidateContractHash(lines = EXPOSURE_LINES) {
  if (!Array.isArray(lines) || lines.length !== 6) throw new Error('CANDIDATE_LINE_COUNT_INVALID');
  if (new Set(lines).size !== 6) throw new Error('CANDIDATE_LINES_NOT_UNIQUE');
  if (!lines.every((line) => String(line).startsWith('short_community_b_'))) throw new Error('CANDIDATE_LINE_PREFIX_INVALID');
  return sha256Utf8(lines.join('\n'));
}

export function fixtureCorpusHash(cases = EXPOSURE_SEMANTIC_CASES) {
  return sha256Utf8(stableJson(cases));
}

function stageTrials(stage) {
  if (stage === 'M1') return 1;
  if (stage === 'M2') return 3;
  throw new Error('STAGE_INVALID');
}

function opaqueMapping(fixtureId, trialId) {
  const n = Number.parseInt(sha256Utf8(`${fixtureId}|${trialId}`).slice(0, 8), 16);
  const e6IsX = (n % 2) === 0;
  return e6IsX
    ? { X: 'E6', Y: 'B0' }
    : { X: 'B0', Y: 'E6' };
}

function conditionScenario(testCase, condition, candidateHash) {
  return {
    fixtureId: testCase.id,
    fixtureKind: testCase.kind,
    attackClass: testCase.attackClass,
    promptFacts: stable(testCase.promptFacts),
    source: stable(testCase.source),
    currentUser: testCase.source?.currentUser || '',
    oracle: {
      assertionMode: testCase.claim?.assertionMode || null,
      expectedDisposition: testCase.expectedDisposition || null,
      targetClaim: testCase.claim?.text || '',
    },
    condition,
    candidateOverlay: condition === 'E6' ? EXPOSURE_LINES.slice() : [],
    candidateLineCount: condition === 'E6' ? EXPOSURE_LINES.length : 0,
    candidateContractHash: condition === 'E6' ? candidateHash : null,
    materializationStatus: 'PENDING_HOST_MATERIALIZATION',
    syntheticScenarioFingerprint: null,
    actualHostRequestFingerprint: null,
  };
}

function withScenarioFingerprint(scenario) {
  const copy = { ...scenario, syntheticScenarioFingerprint: null, actualHostRequestFingerprint: null };
  return {
    ...scenario,
    syntheticScenarioFingerprint: sha256Utf8(stableJson(copy)),
  };
}

export function buildComplianceEvalHarness({
  stage = 'M1',
  cases = EXPOSURE_SEMANTIC_CASES,
  productionAuthority = {
    version: '0.70.1',
    releaseName: 'Cold First-Turn Tail Attribution',
    releaseBranch: 'release-simcore',
    releaseCommit: '861100f4771967aa5b8ab8811d06f11702c0d3ff',
  },
} = {}) {
  const trials = stageTrials(stage);
  const candidateHash = candidateContractHash();
  const corpusHash = fixtureCorpusHash(cases);
  const pairs = [];
  const runs = [];

  for (const testCase of cases) {
    for (let trialId = 1; trialId <= trials; trialId += 1) {
      const mapping = opaqueMapping(testCase.id, trialId);
      const pairId = `${stage}:${testCase.id}:T${trialId}`;
      const order = OPAQUE_LABELS.slice().sort((a, b) => {
        const ha = sha256Utf8(`${pairId}|${a}|order`);
        const hb = sha256Utf8(`${pairId}|${b}|order`);
        return ha.localeCompare(hb);
      });
      const pairRuns = [];

      for (let executionPosition = 0; executionPosition < order.length; executionPosition += 1) {
        const opaqueId = order[executionPosition];
        const condition = mapping[opaqueId];
        const scenario = withScenarioFingerprint(conditionScenario(testCase, condition, candidateHash));
        const run = {
          protocolVersion: PROTOCOL_VERSION,
          stage,
          pairId,
          fixtureId: testCase.id,
          fixtureKind: testCase.kind,
          attackClass: testCase.attackClass,
          trialId,
          executionPosition: executionPosition + 1,
          conditionOpaqueId: opaqueId,
          conditionActualId: condition,
          productionAuthority: stable(productionAuthority),
          fixtureCorpusHash: corpusHash,
          candidateContractHash: candidateHash,
          scenario,
          hostCapture: {
            modelIdentifier: null,
            modelSettingsFingerprint: null,
            characterReferenceFingerprint: null,
            actualHostRequestFingerprint: null,
            promptChars: 'NOT_OBSERVED',
            promptTokens: 'NOT_OBSERVED',
            outputChars: 'NOT_OBSERVED',
            outputTokens: 'NOT_OBSERVED',
            requestPreparationMs: 'NOT_OBSERVED',
            modelGenerationMs: 'NOT_OBSERVED',
            endToEndMs: 'NOT_OBSERVED',
            generatedOutput: null,
            outputStructuralStatus: null,
          },
          review: {
            locked: false,
            primaryDisposition: null,
            secondaryNotes: [],
            naturalness: null,
            reactivity: null,
            epistemicClarity: null,
            rationale: null,
            reviewerId: null,
            adjudicationStatus: 'NOT_REVIEWED',
          },
          executionStatus: 'NOT_RUN',
          harnessInvalidReason: null,
        };
        runs.push(run);
        pairRuns.push(run);
      }

      pairs.push({
        pairId,
        stage,
        fixtureId: testCase.id,
        fixtureKind: testCase.kind,
        trialId,
        executionOrder: pairRuns.map((run) => run.conditionOpaqueId),
        opaqueConditionMap: mapping,
        runIds: pairRuns.map((run) => `${run.pairId}:${run.conditionOpaqueId}`),
      });
    }
  }

  return {
    schema: 1,
    protocolVersion: PROTOCOL_VERSION,
    executionMode: 'OFFLINE_HARNESS_MANIFEST_ONLY',
    modelCallsExecuted: false,
    runtimeMutationAuthorized: false,
    stage,
    trialsPerFixture: trials,
    fixtureCount: cases.length,
    trapFixtureCount: cases.filter((x) => x.kind === 'TRAP').length,
    controlFixtureCount: cases.filter((x) => x.kind === 'CONTROL').length,
    pairCount: pairs.length,
    runCount: runs.length,
    productionAuthority: stable(productionAuthority),
    candidateContractHash: candidateHash,
    candidateLineCount: EXPOSURE_LINES.length,
    fixtureCorpusHash: corpusHash,
    pairs,
    runs,
  };
}

export function assessReviewEligibility(run) {
  const failures = [];
  if (run?.executionStatus !== VALID_EXECUTION_STATUS) failures.push('EXECUTION_STATUS_NOT_VALID_GENERATION');
  if (run?.harnessInvalidReason != null) failures.push('HARNESS_INVALID_REASON_PRESENT');
  if (!String(run?.pairId || '').trim()) failures.push('PAIR_ID_MISSING');
  if (!String(run?.fixtureId || '').trim()) failures.push('FIXTURE_ID_MISSING');
  if (!CONDITIONS.includes(run?.conditionActualId)) failures.push('CONDITION_ACTUAL_ID_INVALID');
  if (!OPAQUE_LABELS.includes(run?.conditionOpaqueId)) failures.push('CONDITION_OPAQUE_ID_INVALID');
  if (!isSha256(run?.scenario?.syntheticScenarioFingerprint)) failures.push('SCENARIO_FINGERPRINT_INVALID');
  if (!String(run?.hostCapture?.generatedOutput || '').trim()) failures.push('GENERATED_OUTPUT_MISSING');
  if (!isSha256(run?.hostCapture?.actualHostRequestFingerprint)) failures.push('HOST_REQUEST_FINGERPRINT_INVALID');
  if (!String(run?.hostCapture?.modelIdentifier || '').trim()) failures.push('MODEL_IDENTIFIER_MISSING');
  if (!isSha256(run?.hostCapture?.modelSettingsFingerprint)) failures.push('MODEL_SETTINGS_FINGERPRINT_INVALID');
  if (!isSha256(run?.hostCapture?.characterReferenceFingerprint)) failures.push('CHARACTER_REFERENCE_FINGERPRINT_INVALID');
  if (!String(run?.hostCapture?.outputStructuralStatus || '').trim()) failures.push('OUTPUT_STRUCTURAL_STATUS_MISSING');
  return { pass: failures.length === 0, failures };
}

function requireReviewEligibleRun(run) {
  const eligibility = assessReviewEligibility(run);
  if (!eligibility.pass) throw new Error(`RUN_NOT_REVIEW_ELIGIBLE:${eligibility.failures.join(',')}`);
  return eligibility;
}

export function buildBlindReviewPacket(run) {
  requireReviewEligibleRun(run);
  return {
    schema: 1,
    protocolVersion: run.protocolVersion,
    pairId: run.pairId,
    fixtureId: run.fixtureId,
    fixtureKind: run.fixtureKind,
    attackClass: run.attackClass,
    trialId: run.trialId,
    conditionOpaqueId: run.conditionOpaqueId,
    semanticOracle: {
      expectedDisposition: run.scenario.oracle.expectedDisposition,
      targetClaim: run.scenario.oracle.targetClaim,
      assertionMode: run.scenario.oracle.assertionMode,
    },
    source: stable(run.scenario.source),
    currentUser: run.scenario.currentUser,
    generatedOutput: run.hostCapture.generatedOutput,
    outputStructuralStatus: run.hostCapture.outputStructuralStatus,
    reviewForm: {
      primaryDisposition: null,
      naturalness: null,
      reactivity: null,
      epistemicClarity: null,
      rationale: null,
      adjudicationStatus: 'NOT_REVIEWED',
    },
  };
}

export function assertHarnessIntegrity(harness) {
  const failures = [];
  if (harness.candidateLineCount !== 6) failures.push('CANDIDATE_LINE_COUNT');
  if (harness.candidateContractHash !== candidateContractHash()) failures.push('CANDIDATE_HASH');
  if (harness.fixtureCorpusHash !== fixtureCorpusHash()) failures.push('CORPUS_HASH');
  if (![24, 72].includes(harness.runCount)) failures.push('RUN_COUNT');
  if (![12, 36].includes(harness.pairCount)) failures.push('PAIR_COUNT');

  for (const pair of harness.pairs) {
    const pairRuns = harness.runs.filter((run) => run.pairId === pair.pairId);
    if (pairRuns.length !== 2) failures.push(`${pair.pairId}:PAIR_SIZE`);
    const conditions = new Set(pairRuns.map((run) => run.conditionActualId));
    if (!(conditions.has('B0') && conditions.has('E6') && conditions.size === 2)) failures.push(`${pair.pairId}:PAIR_CONDITIONS`);
    const opaque = new Set(pairRuns.map((run) => run.conditionOpaqueId));
    if (!(opaque.has('X') && opaque.has('Y') && opaque.size === 2)) failures.push(`${pair.pairId}:OPAQUE_LABELS`);
    const b0 = pairRuns.find((run) => run.conditionActualId === 'B0');
    const e6 = pairRuns.find((run) => run.conditionActualId === 'E6');
    if (b0?.scenario.candidateLineCount !== 0) failures.push(`${pair.pairId}:B0_OVERLAY`);
    if (e6?.scenario.candidateLineCount !== 6) failures.push(`${pair.pairId}:E6_OVERLAY`);
    if (e6?.scenario.candidateContractHash !== harness.candidateContractHash) failures.push(`${pair.pairId}:E6_HASH`);
    if (b0?.scenario.actualHostRequestFingerprint !== null || e6?.scenario.actualHostRequestFingerprint !== null) failures.push(`${pair.pairId}:PRETEND_HOST_FINGERPRINT`);
  }

  return { pass: failures.length === 0, failures };
}

export function createLockedReviewRecord(run, review) {
  requireReviewEligibleRun(run);
  if (!REVIEW_DISPOSITIONS.includes(review?.primaryDisposition)) throw new Error('PRIMARY_DISPOSITION_INVALID');
  for (const key of ['naturalness', 'reactivity', 'epistemicClarity']) {
    const value = Number(review?.[key]);
    if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error(`${key.toUpperCase()}_INVALID`);
  }
  if (!String(review?.rationale || '').trim()) throw new Error('RATIONALE_REQUIRED');
  return {
    ...run,
    review: {
      locked: true,
      primaryDisposition: review.primaryDisposition,
      secondaryNotes: Array.isArray(review.secondaryNotes) ? review.secondaryNotes.slice() : [],
      naturalness: review.naturalness,
      reactivity: review.reactivity,
      epistemicClarity: review.epistemicClarity,
      rationale: review.rationale,
      reviewerId: review.reviewerId || null,
      adjudicationStatus: review.adjudicationStatus || 'LOCKED_INITIAL',
    },
  };
}

function median(values) {
  const xs = values.slice().sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

export function summarizeLockedReviews(records) {
  const locked = records.filter((row) => row?.review?.locked === true);
  const usable = locked.filter((row) => assessReviewEligibility(row).pass);
  const ineligibleLocked = locked.filter((row) => !assessReviewEligibility(row).pass);
  const byCondition = {};
  for (const condition of CONDITIONS) {
    const rows = usable.filter((row) => row.conditionActualId === condition);
    const trap = rows.filter((row) => row.fixtureKind === 'TRAP');
    const control = rows.filter((row) => row.fixtureKind === 'CONTROL');
    const counts = Object.fromEntries(REVIEW_DISPOSITIONS.map((d) => [d, rows.filter((row) => row.review.primaryDisposition === d).length]));
    byCondition[condition] = {
      runs: rows.length,
      trapRuns: trap.length,
      controlRuns: control.length,
      dispositionCounts: counts,
      trapLeakCount: trap.filter((row) => row.review.primaryDisposition === 'FAIL_LEAK').length,
      controlPassCount: control.filter((row) => row.review.primaryDisposition === 'PASS_ALLOWED').length,
      naturalnessMedian: median(rows.map((row) => row.review.naturalness)),
      reactivityMedian: median(rows.map((row) => row.review.reactivity)),
      epistemicClarityMedian: median(rows.map((row) => row.review.epistemicClarity)),
    };
  }
  return {
    schema: 1,
    protocolVersion: PROTOCOL_VERSION,
    usableLockedRuns: usable.length,
    ineligibleLockedRuns: ineligibleLocked.length,
    ineligibleLockedReasons: ineligibleLocked.map((row) => ({
      pairId: row?.pairId || null,
      conditionOpaqueId: row?.conditionOpaqueId || null,
      failures: assessReviewEligibility(row).failures,
    })),
    harnessInvalidRuns: records.filter((row) => row.executionStatus === 'HARNESS_INVALID').length,
    unresolvedAmbiguityRuns: usable.filter((row) => row.review.primaryDisposition === 'REVIEW_AMBIGUOUS').length,
    byCondition,
    finalDisposition: 'NOT_COMPUTED_UNTIL_COMPLETE_M2_AND_COMPARATIVE_REVIEW',
  };
}

export {
  CONDITIONS,
  OPAQUE_LABELS,
  PROTOCOL_VERSION,
  REVIEW_DISPOSITIONS,
  VALID_EXECUTION_STATUS,
};
