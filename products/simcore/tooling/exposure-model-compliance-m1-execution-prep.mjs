import {
  buildComplianceEvalHarness,
  assertHarnessIntegrity,
  candidateContractHash,
  fixtureCorpusHash,
} from './exposure-model-compliance-eval-harness.mjs';

const PREP_VERSION = 'EXPOSURE_MODEL_COMPLIANCE_M1_EXECUTION_PREP_2026-09-01';

const REQUIRED_HOST_CAPABILITIES = Object.freeze([
  'apiV3BeforeRequestReplacerAvailable',
  'requestLocalOverlayCanBeLimitedToEvalScope',
  'simcorePromptBlockObservableAtReplacerStage',
  'simcorePromptInsertionAnchorVerifiable',
  'replacerRunsAfterSimCorePromptAssembly',
  'conditionSwitchDoesNotAlterScenarioPrompt',
  'b0ReturnsMessagesByteEquivalentAtReplacerStage',
  'e6AddsExactSixLinesOnce',
  'finalFlattenedMessagesCanBeFingerprintCaptured',
  'modelIdentifierCanBeCaptured',
  'modelSettingsCanBeFingerprintCaptured',
  'generatedOutputCanBeCaptured',
  'freshIsolatedFixtureStatePerRun',
  'activeReplacerSetCanBeFrozenOrRecorded',
  'evalAdapterCanBeUnloadedAfterRun',
]);

const FORBIDDEN_HOST_EFFECTS = Object.freeze([
  'productionSimCoreBytesMustChange',
  'savedPromptPresetMustChange',
  'chatHistoryMustBeRewrittenForCondition',
  'persistentSemanticStateMustBeAdded',
  'globalCandidateEffectCannotBeRestrictedToEvalScope',
]);

const HOST_ADAPTER_CANDIDATE = Object.freeze({
  identifier: 'EVAL_ONLY_API_V3_BEFORE_REQUEST_REPLACER',
  authorityClass: 'TEMPORARY_EVAL_HOST_ADAPTER_ONLY',
  mutationScope: 'REQUEST_LOCAL_FINAL_MESSAGE_ARRAY_ONLY',
  persistence: 'NONE',
  permission: 'replacer',
  candidateCondition: 'E6_ONLY',
  baselineCondition: 'B0_IDENTITY_RETURN',
  insertionContract: 'AFTER_EXISTING_SOURCE_PROVENANCE_BEFORE_NEW_SOURCE_GUIDANCE',
  productionInstallAuthorized: false,
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createM1HostCapabilityAttestationTemplate() {
  const capabilities = Object.fromEntries(REQUIRED_HOST_CAPABILITIES.map((key) => [key, null]));
  const forbiddenEffects = Object.fromEntries(FORBIDDEN_HOST_EFFECTS.map((key) => [key, null]));
  return {
    schema: 1,
    prepVersion: PREP_VERSION,
    targetHostIdentity: {
      risuaiVersionOrBuild: null,
      apiVersion: null,
      platform: null,
    },
    capabilities,
    forbiddenEffects,
    evidenceNotes: [],
  };
}

function readSection(attestation, section, key) {
  const value = attestation?.[section]?.[key];
  return value === true ? true : value === false ? false : null;
}

export function assessM1HostReadiness(attestation = createM1HostCapabilityAttestationTemplate()) {
  const blockers = [];
  const absentCapabilities = [];
  const unknownCapabilities = [];
  const forbiddenUnknown = [];

  for (const key of REQUIRED_HOST_CAPABILITIES) {
    const value = readSection(attestation, 'capabilities', key);
    if (value === false) absentCapabilities.push(key);
    else if (value !== true) unknownCapabilities.push(key);
  }

  for (const key of FORBIDDEN_HOST_EFFECTS) {
    const value = readSection(attestation, 'forbiddenEffects', key);
    if (value === true) blockers.push(key);
    else if (value !== false) forbiddenUnknown.push(key);
  }

  if (blockers.length) {
    return {
      status: 'BLOCKED_FORBIDDEN_HOST_EFFECT',
      readyForM1: false,
      blockers,
      absentCapabilities,
      unknownCapabilities,
      forbiddenUnknown,
    };
  }

  if (absentCapabilities.length) {
    return {
      status: 'BLOCKED_REQUIRED_HOST_CAPABILITY_ABSENT',
      readyForM1: false,
      blockers: [],
      absentCapabilities,
      unknownCapabilities,
      forbiddenUnknown,
    };
  }

  if (unknownCapabilities.length || forbiddenUnknown.length) {
    return {
      status: 'HOLD_HOST_PROBE_REQUIRED',
      readyForM1: false,
      blockers: [],
      absentCapabilities: [],
      unknownCapabilities,
      forbiddenUnknown,
    };
  }

  return {
    status: 'READY_FOR_M1_HOST_EXECUTION',
    readyForM1: true,
    blockers: [],
    absentCapabilities: [],
    unknownCapabilities: [],
    forbiddenUnknown: [],
  };
}

function executionRow(run) {
  return {
    runId: `${run.pairId}:${run.conditionOpaqueId}`,
    pairId: run.pairId,
    executionPosition: run.executionPosition,
    fixtureId: run.fixtureId,
    fixtureKind: run.fixtureKind,
    attackClass: run.attackClass,
    trialId: run.trialId,
    conditionOpaqueId: run.conditionOpaqueId,
    operatorConditionActualId: run.conditionActualId,
    syntheticScenarioFingerprint: run.scenario.syntheticScenarioFingerprint,
    candidateLineCount: run.scenario.candidateLineCount,
    candidateContractHash: run.scenario.candidateContractHash,
    hostCapture: {
      materializationStatus: 'PENDING_HOST_MATERIALIZATION',
      flattenedMessageFingerprint: null,
      actualHostRequestFingerprint: null,
      modelIdentifier: null,
      modelSettingsFingerprint: null,
      characterReferenceFingerprint: null,
      generatedOutput: null,
      outputStructuralStatus: null,
      promptChars: 'NOT_OBSERVED',
      promptTokens: 'NOT_OBSERVED',
      outputChars: 'NOT_OBSERVED',
      outputTokens: 'NOT_OBSERVED',
      requestPreparationMs: 'NOT_OBSERVED',
      modelGenerationMs: 'NOT_OBSERVED',
      endToEndMs: 'NOT_OBSERVED',
    },
  };
}

export function buildM1ExecutionPrep({
  attestation = createM1HostCapabilityAttestationTemplate(),
  productionAuthority,
} = {}) {
  const harness = buildComplianceEvalHarness({
    stage: 'M1',
    ...(productionAuthority ? { productionAuthority } : {}),
  });
  const harnessIntegrity = assertHarnessIntegrity(harness);
  if (!harnessIntegrity.pass) throw new Error(`M1_HARNESS_INTEGRITY_FAILED:${harnessIntegrity.failures.join(',')}`);

  const readiness = assessM1HostReadiness(attestation);
  const executionSheet = harness.runs.map(executionRow);

  return {
    schema: 1,
    prepVersion: PREP_VERSION,
    executionMode: 'M1_EXECUTION_PREPARATION_ONLY',
    modelCallsExecuted: false,
    runtimeMutationAuthorized: false,
    productionImplementationAuthorized: false,
    productionAuthority: clone(harness.productionAuthority),
    candidateContractHash: harness.candidateContractHash,
    candidateLineCount: harness.candidateLineCount,
    fixtureCorpusHash: harness.fixtureCorpusHash,
    pairCount: harness.pairCount,
    runCount: harness.runCount,
    harnessIntegrity,
    readiness,
    hostAdapterCandidate: clone(HOST_ADAPTER_CANDIDATE),
    attestation: clone(attestation),
    executionSheet,
    requiredNextEvidence: readiness.readyForM1
      ? ['TARGET_HOST_PREFLIGHT_PASS', 'M1_24_RUN_CAPTURE']
      : ['TARGET_HOST_CAPABILITY_ATTESTATION'],
    disposition: readiness.readyForM1
      ? 'READY_FOR_SEPARATELY_AUTHORIZED_M1_EXECUTION'
      : readiness.status,
  };
}

export function assertM1ExecutionPrepIntegrity(prep) {
  const failures = [];
  if (prep.prepVersion !== PREP_VERSION) failures.push('PREP_VERSION');
  if (prep.executionMode !== 'M1_EXECUTION_PREPARATION_ONLY') failures.push('EXECUTION_MODE');
  if (prep.modelCallsExecuted !== false) failures.push('MODEL_CALL_FLAG');
  if (prep.runtimeMutationAuthorized !== false) failures.push('RUNTIME_MUTATION_FLAG');
  if (prep.productionImplementationAuthorized !== false) failures.push('PRODUCTION_AUTH_FLAG');
  if (prep.pairCount !== 12) failures.push('PAIR_COUNT');
  if (prep.runCount !== 24) failures.push('RUN_COUNT');
  if (prep.executionSheet?.length !== 24) failures.push('EXECUTION_SHEET_COUNT');
  if (prep.candidateContractHash !== candidateContractHash()) failures.push('CANDIDATE_HASH');
  if (prep.fixtureCorpusHash !== fixtureCorpusHash()) failures.push('CORPUS_HASH');
  if (prep.harnessIntegrity?.pass !== true) failures.push('HARNESS_INTEGRITY');

  const rows = Array.isArray(prep.executionSheet) ? prep.executionSheet : [];
  const b0 = rows.filter((row) => row.operatorConditionActualId === 'B0');
  const e6 = rows.filter((row) => row.operatorConditionActualId === 'E6');
  if (b0.length !== 12 || e6.length !== 12) failures.push('CONDITION_COUNTS');
  if (b0.some((row) => row.candidateLineCount !== 0 || row.candidateContractHash !== null)) failures.push('B0_OVERLAY');
  if (e6.some((row) => row.candidateLineCount !== 6 || row.candidateContractHash !== prep.candidateContractHash)) failures.push('E6_OVERLAY');
  if (rows.some((row) => row.hostCapture?.materializationStatus !== 'PENDING_HOST_MATERIALIZATION')) failures.push('PRETEND_MATERIALIZED');
  if (rows.some((row) => row.hostCapture?.flattenedMessageFingerprint !== null)) failures.push('PRETEND_FLATTENED_FINGERPRINT');
  if (rows.some((row) => row.hostCapture?.actualHostRequestFingerprint !== null)) failures.push('PRETEND_HOST_FINGERPRINT');

  return { pass: failures.length === 0, failures };
}

export {
  FORBIDDEN_HOST_EFFECTS,
  HOST_ADAPTER_CANDIDATE,
  PREP_VERSION,
  REQUIRED_HOST_CAPABILITIES,
};
