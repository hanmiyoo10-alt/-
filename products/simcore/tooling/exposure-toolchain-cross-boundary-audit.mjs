import {
  buildComplianceEvalHarness,
  candidateContractHash,
  createLockedReviewRecord,
  fixtureCorpusHash,
} from './exposure-model-compliance-eval-harness.mjs';
import {
  HOST_ADAPTER_CANDIDATE,
  buildM1ExecutionPrep,
} from './exposure-model-compliance-m1-execution-prep.mjs';
import {
  ADAPTER_VERSION,
  CLEANUP_KEYS,
  EXPECTED_CANDIDATE_HASH,
  EXPECTED_REQUEST_STAGE,
  assessTargetHostPreflight,
  createTargetHostPreflightEvidenceTemplate,
} from './exposure-model-compliance-m1-target-host-preflight.mjs';
import {
  assessAmendedPairIdentity,
} from './exposure-model-compliance-m1-target-host-pair-identity-amendment.mjs';

const AUDIT_VERSION = 'EXPOSURE_TOOLCHAIN_CROSS_BOUNDARY_AUDIT_2026-09-01';

function sha(ch) {
  return String(ch).repeat(64).slice(0, 64);
}

function rowsForPair(prep, pairId) {
  return (prep?.executionSheet || []).filter((row) => row.pairId === pairId);
}

function rowForCondition(rows, condition) {
  return rows.find((row) => row.operatorConditionActualId === condition) || null;
}

export function assessM1ManifestBinding(prep, evidence) {
  const failures = [];
  const b0Receipt = evidence?.b0Receipt || null;
  const e6Receipt = evidence?.e6Receipt || null;

  if (!b0Receipt) failures.push('B0_RECEIPT_MISSING');
  if (!e6Receipt) failures.push('E6_RECEIPT_MISSING');
  if (failures.length) return { pass: false, pairId: null, failures };

  const rows = Array.isArray(prep?.executionSheet) ? prep.executionSheet : [];
  const b0Row = rows.find((row) => row.runId === b0Receipt.runId && row.operatorConditionActualId === 'B0') || null;
  const e6Row = rows.find((row) => row.runId === e6Receipt.runId && row.operatorConditionActualId === 'E6') || null;

  if (!b0Row) failures.push('B0_RUN_NOT_IN_M1_MANIFEST');
  if (!e6Row) failures.push('E6_RUN_NOT_IN_M1_MANIFEST');
  if (!b0Row || !e6Row) return { pass: false, pairId: null, failures };

  if (b0Row.pairId !== e6Row.pairId) failures.push('MANIFEST_PAIR_ID_MISMATCH');
  if (b0Receipt.expectedSyntheticScenarioFingerprint !== b0Row.syntheticScenarioFingerprint) {
    failures.push('B0_SCENARIO_FINGERPRINT_NOT_MANIFEST_BOUND');
  }
  if (e6Receipt.expectedSyntheticScenarioFingerprint !== e6Row.syntheticScenarioFingerprint) {
    failures.push('E6_SCENARIO_FINGERPRINT_NOT_MANIFEST_BOUND');
  }
  if (b0Row.candidateLineCount !== 0 || b0Row.candidateContractHash !== null) failures.push('B0_MANIFEST_OVERLAY_INVALID');
  if (e6Row.candidateLineCount !== 6 || e6Row.candidateContractHash !== prep.candidateContractHash) failures.push('E6_MANIFEST_OVERLAY_INVALID');

  return {
    pass: failures.length === 0,
    pairId: b0Row.pairId === e6Row.pairId ? b0Row.pairId : null,
    failures,
  };
}

function completeEvidenceFromPair(prep, pairId) {
  const rows = rowsForPair(prep, pairId);
  const b0 = rowForCondition(rows, 'B0');
  const e6 = rowForCondition(rows, 'E6');
  if (!b0 || !e6) throw new Error('PAIR_ROWS_MISSING');

  const evidence = createTargetHostPreflightEvidenceTemplate();
  evidence.targetHostIdentity = { risuaiVersionOrBuild: 'audit-host', apiVersion: '3.0', platform: 'audit' };
  evidence.loadStatus = {
    adapterVersion: ADAPTER_VERSION,
    permissionGranted: true,
    replacerRegistered: true,
    bodyInterceptorRegistered: true,
    outputListenerRegistered: true,
    unloaded: false,
    initError: null,
    activeRun: null,
    receiptHistoryCount: 0,
  };

  const makeReceipt = (row, condition) => {
    const isE6 = condition === 'E6';
    return {
      schema: 1,
      adapterVersion: ADAPTER_VERSION,
      runId: row.runId,
      condition,
      expectedSyntheticScenarioFingerprint: row.syntheticScenarioFingerprint,
      candidateContractHash: isE6 ? EXPECTED_CANDIDATE_HASH : null,
      materializationStatus: 'HOST_CAPTURE_COMPLETE',
      requestStage: EXPECTED_REQUEST_STAGE,
      requestType: 'model',
      beforeRequestInvocationCount: 1,
      beforeRequestInputFingerprint: sha('b'),
      flattenedMessageFingerprint: isE6 ? sha('c') : sha('b'),
      actualHostRequestFingerprint: isE6 ? sha('d') : sha('e'),
      providerBodyCaptureCount: 1,
      providerPropagationStatus: 'MATCH',
      providerCandidateLineMatchCount: isE6 ? 6 : 0,
      modelIdentifier: 'audit-model',
      modelSettingsFingerprint: sha('f'),
      characterReferenceFingerprint: sha('1'),
      generatedOutput: isE6 ? 'candidate output' : 'baseline output',
      outputFingerprint: isE6 ? sha('2') : sha('3'),
      anchorMessageIndex: 5,
      anchorLineIndex: 12,
      candidatePresenceBefore: [0, 0, 0, 0, 0, 0],
      candidatePresenceAfter: isE6 ? [1, 1, 1, 1, 1, 1] : [0, 0, 0, 0, 0, 0],
      retryObserved: false,
      invalidReason: null,
    };
  };

  evidence.b0Receipt = makeReceipt(b0, 'B0');
  evidence.e6Receipt = makeReceipt(e6, 'E6');
  evidence.postRunStatus = {
    adapterVersion: ADAPTER_VERSION,
    activeRun: null,
    receiptHistoryCount: 2,
    initError: null,
  };
  for (const key of CLEANUP_KEYS) evidence.cleanupAttestation[key] = true;
  return evidence;
}

export function runExposureToolchainCrossBoundaryAudit() {
  const failures = [];
  const fixesClosed = [];
  const watches = [];
  const blockers = [];

  const harness = buildComplianceEvalHarness({ stage: 'M1' });
  const prep = buildM1ExecutionPrep();

  if (harness.candidateContractHash !== candidateContractHash()) failures.push('HARNESS_CANDIDATE_HASH');
  if (prep.candidateContractHash !== EXPECTED_CANDIDATE_HASH) failures.push('PREFLIGHT_CANDIDATE_HASH');
  if (prep.candidateContractHash !== harness.candidateContractHash) failures.push('PREP_HARNESS_CANDIDATE_HASH');
  if (prep.fixtureCorpusHash !== fixtureCorpusHash()) failures.push('FIXTURE_CORPUS_HASH');
  if (harness.pairCount !== 12 || harness.runCount !== 24) failures.push('M1_CARDINALITY');

  if (HOST_ADAPTER_CANDIDATE.mutationScope !== 'REQUEST_LOCAL_BEFORE_REQUEST_MESSAGE_ARRAY_ONLY') {
    failures.push('HOST_ADAPTER_STAGE_SCOPE_DRIFT');
  } else {
    fixesClosed.push('FIX_PREP_BEFORE_REQUEST_STAGE_SCOPE_DRIFT');
  }
  if (HOST_ADAPTER_CANDIDATE.requestStage !== EXPECTED_REQUEST_STAGE) failures.push('HOST_ADAPTER_REQUEST_STAGE_DRIFT');
  if (HOST_ADAPTER_CANDIDATE.providerRequestMutationAuthorized !== false) failures.push('HOST_ADAPTER_PROVIDER_MUTATION_AUTHORITY');

  for (const pair of harness.pairs) {
    const rows = harness.runs.filter((run) => run.pairId === pair.pairId);
    const b0 = rows.find((run) => run.conditionActualId === 'B0');
    const e6 = rows.find((run) => run.conditionActualId === 'E6');
    if (!b0 || !e6) failures.push(`${pair.pairId}:PAIR_CONDITIONS`);
    else if (b0.scenario.syntheticScenarioFingerprint === e6.scenario.syntheticScenarioFingerprint) {
      failures.push(`${pair.pairId}:CONDITION_SCENARIO_FINGERPRINT_NOT_DISTINCT`);
    }
  }

  const firstPair = harness.pairs[0]?.pairId;
  const evidence = completeEvidenceFromPair(prep, firstPair);
  const canonicalPreflight = assessTargetHostPreflight(evidence);
  if (canonicalPreflight.status !== 'PASS_TARGET_HOST_PREFLIGHT') {
    failures.push(`CANONICAL_PREFLIGHT_NOT_AMENDED:${canonicalPreflight.failures.join('|')}`);
  } else if (canonicalPreflight.failures.includes('PAIR_SCENARIO_MISMATCH')) {
    failures.push('CANONICAL_PREFLIGHT_RETAINS_SUPERSEDED_PAIR_RULE');
  } else {
    fixesClosed.push('FIX_PAIR_IDENTITY_AMENDMENT_CANONICALIZED');
  }

  const legacyAmendmentApplied = assessAmendedPairIdentity(evidence, canonicalPreflight);
  if (legacyAmendmentApplied.status !== canonicalPreflight.status || legacyAmendmentApplied.failures.length !== 0) {
    failures.push('LEGACY_AMENDMENT_NOT_IDEMPOTENT_AFTER_CANONICALIZATION');
  }

  const manifestBinding = assessM1ManifestBinding(prep, evidence);
  if (!manifestBinding.pass) failures.push(`MANIFEST_BINDING_BASE:${manifestBinding.failures.join('|')}`);

  const forged = structuredClone(evidence);
  forged.e6Receipt.expectedSyntheticScenarioFingerprint = sha('9');
  const forgedHostMechanics = assessTargetHostPreflight(forged);
  const forgedBinding = assessM1ManifestBinding(prep, forged);
  if (forgedHostMechanics.status !== 'PASS_TARGET_HOST_PREFLIGHT') {
    failures.push('HOST_MECHANICS_UNEXPECTEDLY_OWNS_MANIFEST_BINDING');
  }
  if (forgedBinding.pass || !forgedBinding.failures.includes('E6_SCENARIO_FINGERPRINT_NOT_MANIFEST_BOUND')) {
    failures.push('MANIFEST_BINDING_FORGERY_NOT_CAUGHT');
  } else {
    fixesClosed.push('FIX_HARNESS_RECEIPT_MANIFEST_BINDING_GUARD');
  }

  const unexecuted = harness.runs[0];
  let unexecutedReviewRejected = false;
  try {
    createLockedReviewRecord(unexecuted, {
      primaryDisposition: 'PASS_ALLOWED',
      naturalness: 3,
      reactivity: 3,
      epistemicClarity: 3,
      rationale: 'audit probe',
    });
  } catch (error) {
    unexecutedReviewRejected = /RUN_NOT_REVIEW_ELIGIBLE/.test(String(error?.message || error));
  }
  if (unexecutedReviewRejected) {
    fixesClosed.push('FIX_RESULT_SCORING_REJECTS_UNEXECUTED_LOCKED_REVIEW');
  } else {
    blockers.push('BLOCKER_RESULT_SCORING_ACCEPTS_UNEXECUTED_LOCKED_REVIEW');
  }

  watches.push('WATCH_PROVIDER_BODY_PROPAGATION_PROVES_DISTINCT_LINE_PRESENCE_NOT_EXACT_OCCURRENCE_MULTIPLICITY');
  watches.push('WATCH_MODEL_SETTINGS_FINGERPRINT_IS_BOUNDED_HOST_PROJECTION_NOT_COMPLETE_PROVIDER_CONFIG_PROOF');
  watches.push('WATCH_OUTPUT_LISTENER_CORRELATION_REQUIRES_TARGET_HOST_PREFLIGHT');

  return {
    schema: 1,
    auditVersion: AUDIT_VERSION,
    executionMode: 'OFFLINE_CROSS_BOUNDARY_AUDIT_ONLY',
    modelCallsExecuted: false,
    runtimeMutationAuthorized: false,
    productionImplementationAuthorized: false,
    productionChange: false,
    s7Change: false,
    candidateContractHash: prep.candidateContractHash,
    fixtureCorpusHash: prep.fixtureCorpusHash,
    m1PairCount: harness.pairCount,
    m1RunCount: harness.runCount,
    failures,
    fixesClosed,
    watches,
    blockers,
    pass: failures.length === 0,
    disposition: failures.length
      ? 'AUDIT_FAILED_CROSS_BOUNDARY_CONTRACT'
      : blockers.length
        ? 'PASS_WITH_BLOCKER_BEFORE_RESULT_SCORING'
        : 'PASS_CROSS_BOUNDARY_AUDIT',
    next: blockers.length
      ? 'EXPOSURE_M1_RESULT_INGEST_AND_SCORING_TOOL'
      : 'EXPOSURE_ANCHOR_AND_CONTRACT_DRIFT_GUARD',
  };
}

export { AUDIT_VERSION };
