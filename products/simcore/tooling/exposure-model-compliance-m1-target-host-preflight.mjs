const PREFLIGHT_VERSION = 'EXPOSURE_MODEL_COMPLIANCE_M1_TARGET_HOST_PREFLIGHT_2026-09-01';
const ADAPTER_VERSION = 'EXPOSURE_MODEL_COMPLIANCE_M1_HOST_ADAPTER_2026-09-01';
const EXPECTED_CANDIDATE_HASH = '3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc';
const EXPECTED_REQUEST_STAGE = 'BEFORE_REQUEST_PRE_REQUEST_TRIGGER_PRE_PROVIDER_REFORMAT';

const RECEIPT_CONDITIONS = Object.freeze(['B0', 'E6']);
const CLEANUP_KEYS = Object.freeze([
  'adapterUnloaded',
  'replacerRemoved',
  'bodyInterceptorRemoved',
  'outputListenerRemoved',
  'uiPartRemoved',
  'productionSimCoreBytesUnchanged',
  'savedPromptPresetUnchanged',
  'chatHistoryNotRewrittenForCondition',
  'persistentSemanticStateNotAdded',
]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function pairRunStem(runId) {
  const text = String(runId || '').trim();
  if (!text) return null;
  const parts = text.split(':');
  if (parts.length < 2) return null;
  const tail = parts.at(-1);
  if (!['X', 'Y'].includes(tail)) return null;
  return parts.slice(0, -1).join(':');
}

export function createTargetHostPreflightEvidenceTemplate() {
  return {
    schema: 1,
    preflightVersion: PREFLIGHT_VERSION,
    targetHostIdentity: {
      risuaiVersionOrBuild: null,
      apiVersion: null,
      platform: null,
    },
    loadStatus: null,
    b0Receipt: null,
    e6Receipt: null,
    postRunStatus: null,
    cleanupAttestation: Object.fromEntries(CLEANUP_KEYS.map((key) => [key, null])),
    operatorNotes: [],
  };
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function validateLoadStatus(status, failures, missing) {
  if (!status) {
    missing.push('LOAD_STATUS');
    return;
  }
  if (status.adapterVersion !== ADAPTER_VERSION) failures.push('LOAD_ADAPTER_VERSION');
  if (status.permissionGranted !== true) failures.push('LOAD_REPLACER_PERMISSION');
  if (status.replacerRegistered !== true) failures.push('LOAD_REPLACER_REGISTERED');
  if (status.bodyInterceptorRegistered !== true) failures.push('LOAD_BODY_INTERCEPTOR_REGISTERED');
  if (status.outputListenerRegistered !== true) failures.push('LOAD_OUTPUT_LISTENER_REGISTERED');
  if (status.unloaded !== false) failures.push('LOAD_UNLOADED_FLAG');
  if (status.initError != null) failures.push('LOAD_INIT_ERROR');
  if (status.activeRun != null) failures.push('LOAD_NOT_DISARMED');
}

function validateReceipt(receipt, condition, failures, missing) {
  if (!receipt) {
    missing.push(`${condition}_RECEIPT`);
    return;
  }
  const prefix = `${condition}_`;
  if (receipt.schema !== 1) failures.push(`${prefix}SCHEMA`);
  if (receipt.adapterVersion !== ADAPTER_VERSION) failures.push(`${prefix}ADAPTER_VERSION`);
  if (receipt.condition !== condition) failures.push(`${prefix}CONDITION`);
  if (!String(receipt.runId || '').trim()) failures.push(`${prefix}RUN_ID`);
  if (!isSha256(receipt.expectedSyntheticScenarioFingerprint)) failures.push(`${prefix}SCENARIO_FINGERPRINT`);
  if (receipt.materializationStatus !== 'HOST_CAPTURE_COMPLETE') failures.push(`${prefix}MATERIALIZATION`);
  if (receipt.requestStage !== EXPECTED_REQUEST_STAGE) failures.push(`${prefix}REQUEST_STAGE`);
  if (!String(receipt.requestType || '').trim()) failures.push(`${prefix}REQUEST_TYPE`);
  if (!Number.isInteger(Number(receipt.beforeRequestInvocationCount)) || Number(receipt.beforeRequestInvocationCount) < 1) failures.push(`${prefix}INVOCATION_COUNT`);
  if (!isSha256(receipt.beforeRequestInputFingerprint)) failures.push(`${prefix}INPUT_FINGERPRINT`);
  if (!isSha256(receipt.flattenedMessageFingerprint)) failures.push(`${prefix}OUTPUT_FINGERPRINT`);
  if (!isSha256(receipt.actualHostRequestFingerprint)) failures.push(`${prefix}HOST_REQUEST_FINGERPRINT`);
  if (!isSha256(receipt.modelSettingsFingerprint)) failures.push(`${prefix}MODEL_SETTINGS_FINGERPRINT`);
  if (!isSha256(receipt.characterReferenceFingerprint)) failures.push(`${prefix}CHARACTER_FINGERPRINT`);
  if (!isSha256(receipt.outputFingerprint)) failures.push(`${prefix}GENERATED_OUTPUT_FINGERPRINT`);
  if (!String(receipt.modelIdentifier || '').trim()) failures.push(`${prefix}MODEL_IDENTIFIER`);
  if (!String(receipt.generatedOutput || '').trim()) failures.push(`${prefix}GENERATED_OUTPUT`);
  if (!Number.isInteger(Number(receipt.anchorMessageIndex)) || Number(receipt.anchorMessageIndex) < 0) failures.push(`${prefix}ANCHOR_MESSAGE_INDEX`);
  if (!Number.isInteger(Number(receipt.anchorLineIndex)) || Number(receipt.anchorLineIndex) < 0) failures.push(`${prefix}ANCHOR_LINE_INDEX`);
  if (receipt.invalidReason != null) failures.push(`${prefix}INVALID_REASON`);
  if (receipt.providerPropagationStatus !== 'MATCH') failures.push(`${prefix}PROVIDER_PROPAGATION`);

  const before = Array.isArray(receipt.candidatePresenceBefore) ? receipt.candidatePresenceBefore : null;
  const after = Array.isArray(receipt.candidatePresenceAfter) ? receipt.candidatePresenceAfter : null;
  if (!before || before.length !== 6 || before.some((x) => Number(x) !== 0)) failures.push(`${prefix}CANDIDATE_BEFORE`);
  const expectedAfter = condition === 'E6' ? 1 : 0;
  if (!after || after.length !== 6 || after.some((x) => Number(x) !== expectedAfter)) failures.push(`${prefix}CANDIDATE_AFTER`);

  if (condition === 'B0') {
    if (receipt.candidateContractHash != null) failures.push('B0_CANDIDATE_HASH');
    if (receipt.beforeRequestInputFingerprint !== receipt.flattenedMessageFingerprint) failures.push('B0_NOT_IDENTITY_AT_BEFORE_REQUEST_STAGE');
    if (Number(receipt.providerCandidateLineMatchCount) !== 0) failures.push('B0_PROVIDER_CANDIDATE_MATCH_COUNT');
  } else {
    if (receipt.candidateContractHash !== EXPECTED_CANDIDATE_HASH) failures.push('E6_CANDIDATE_HASH');
    if (receipt.beforeRequestInputFingerprint === receipt.flattenedMessageFingerprint) failures.push('E6_NO_REQUEST_STAGE_DELTA');
    if (Number(receipt.providerCandidateLineMatchCount) !== 6) failures.push('E6_PROVIDER_CANDIDATE_MATCH_COUNT');
  }
}

function validatePair(b0, e6, failures) {
  if (!b0 || !e6) return;
  if (b0.runId === e6.runId) failures.push('PAIR_RUN_ID_NOT_DISTINCT');

  const b0Stem = pairRunStem(b0.runId);
  const e6Stem = pairRunStem(e6.runId);
  if (!b0Stem || !e6Stem) failures.push('PAIR_RUN_ID_FORMAT_INVALID');
  else if (b0Stem !== e6Stem) failures.push('PAIR_RUN_ID_STEM_MISMATCH');

  if (b0.expectedSyntheticScenarioFingerprint === e6.expectedSyntheticScenarioFingerprint) {
    failures.push('PAIR_CONDITION_SCENARIO_FINGERPRINT_NOT_DISTINCT');
  }
  if (b0.requestType !== e6.requestType) failures.push('PAIR_REQUEST_TYPE_MISMATCH');
  if (b0.modelIdentifier !== e6.modelIdentifier) failures.push('PAIR_MODEL_MISMATCH');
  if (b0.modelSettingsFingerprint !== e6.modelSettingsFingerprint) failures.push('PAIR_MODEL_SETTINGS_MISMATCH');
  if (b0.characterReferenceFingerprint !== e6.characterReferenceFingerprint) failures.push('PAIR_CHARACTER_REFERENCE_MISMATCH');
  if (b0.anchorMessageIndex !== e6.anchorMessageIndex || b0.anchorLineIndex !== e6.anchorLineIndex) failures.push('PAIR_ANCHOR_MISMATCH');
  if (b0.beforeRequestInputFingerprint !== e6.beforeRequestInputFingerprint) failures.push('PAIR_BASE_REQUEST_STAGE_INPUT_MISMATCH');
}

function validatePostRunStatus(status, failures, missing) {
  if (!status) {
    missing.push('POST_RUN_STATUS');
    return;
  }
  if (status.adapterVersion !== ADAPTER_VERSION) failures.push('POST_ADAPTER_VERSION');
  if (status.activeRun != null) failures.push('POST_RUN_NOT_AUTO_DISARMED');
  if (Number(status.receiptHistoryCount) < 2) failures.push('POST_RECEIPT_HISTORY_COUNT');
  if (status.initError != null) failures.push('POST_INIT_ERROR');
}

function validateCleanup(attestation, failures, missing) {
  if (!attestation) {
    missing.push('CLEANUP_ATTESTATION');
    return;
  }
  for (const key of CLEANUP_KEYS) {
    const value = attestation[key];
    if (value == null) missing.push(`CLEANUP_${key}`);
    else if (value !== true) failures.push(`CLEANUP_${key}`);
  }
}

export function assessTargetHostPreflight(evidence = createTargetHostPreflightEvidenceTemplate()) {
  const failures = [];
  const missing = [];
  if (evidence?.schema !== 1) failures.push('EVIDENCE_SCHEMA');
  if (evidence?.preflightVersion !== PREFLIGHT_VERSION) failures.push('PREFLIGHT_VERSION');

  const host = evidence?.targetHostIdentity || {};
  if (!String(host.risuaiVersionOrBuild || '').trim()) missing.push('HOST_RISUAI_VERSION_OR_BUILD');
  if (!String(host.apiVersion || '').trim()) missing.push('HOST_API_VERSION');
  if (!String(host.platform || '').trim()) missing.push('HOST_PLATFORM');

  validateLoadStatus(evidence?.loadStatus, failures, missing);
  validateReceipt(evidence?.b0Receipt, 'B0', failures, missing);
  validateReceipt(evidence?.e6Receipt, 'E6', failures, missing);
  validatePair(evidence?.b0Receipt, evidence?.e6Receipt, failures);
  validatePostRunStatus(evidence?.postRunStatus, failures, missing);
  validateCleanup(evidence?.cleanupAttestation, failures, missing);

  let status = 'PASS_TARGET_HOST_PREFLIGHT';
  let readyForM1Smoke = true;
  if (failures.length) {
    status = 'BLOCK_TARGET_HOST_PREFLIGHT_FAILED';
    readyForM1Smoke = false;
  } else if (missing.length) {
    status = 'HOLD_TARGET_HOST_EVIDENCE_REQUIRED';
    readyForM1Smoke = false;
  }

  return {
    schema: 1,
    preflightVersion: PREFLIGHT_VERSION,
    status,
    readyForM1Smoke,
    modelComplianceEvaluated: false,
    productionImplementationAuthorized: false,
    runtimeMutationAuthorized: false,
    candidateContractHash: EXPECTED_CANDIDATE_HASH,
    pairIdentityRule: 'SAME_HARNESS_PAIR_RUN_ID_STEM_WITH_DISTINCT_CONDITION_SCENARIO_FINGERPRINTS_PLUS_BASE_REQUEST_MODEL_SETTINGS_REFERENCE_ANCHOR_GATES',
    failures,
    missing,
    checkedConditions: RECEIPT_CONDITIONS.slice(),
    hostIdentity: clone(evidence?.targetHostIdentity || null),
  };
}

export function assertTargetHostPreflightIntegrity(result) {
  const failures = [];
  if (result?.schema !== 1) failures.push('RESULT_SCHEMA');
  if (result?.preflightVersion !== PREFLIGHT_VERSION) failures.push('RESULT_VERSION');
  if (result?.candidateContractHash !== EXPECTED_CANDIDATE_HASH) failures.push('RESULT_CANDIDATE_HASH');
  if (result?.modelComplianceEvaluated !== false) failures.push('MODEL_COMPLIANCE_FLAG');
  if (result?.productionImplementationAuthorized !== false) failures.push('PRODUCTION_AUTH_FLAG');
  if (result?.runtimeMutationAuthorized !== false) failures.push('RUNTIME_AUTH_FLAG');
  if (!['PASS_TARGET_HOST_PREFLIGHT', 'HOLD_TARGET_HOST_EVIDENCE_REQUIRED', 'BLOCK_TARGET_HOST_PREFLIGHT_FAILED'].includes(result?.status)) failures.push('RESULT_STATUS');
  if (result?.readyForM1Smoke === true && result?.status !== 'PASS_TARGET_HOST_PREFLIGHT') failures.push('READY_STATUS_MISMATCH');
  if (Array.isArray(result?.failures) && result.failures.includes('PAIR_SCENARIO_MISMATCH')) failures.push('SUPERSEDED_PAIR_RULE_RETAINED');
  return { pass: failures.length === 0, failures };
}

export {
  ADAPTER_VERSION,
  CLEANUP_KEYS,
  EXPECTED_CANDIDATE_HASH,
  EXPECTED_REQUEST_STAGE,
  PREFLIGHT_VERSION,
  RECEIPT_CONDITIONS,
  pairRunStem,
};
