import assert from 'node:assert/strict';
import {
  ADAPTER_VERSION,
  EXPECTED_CANDIDATE_HASH,
  EXPECTED_REQUEST_STAGE,
  assessTargetHostPreflight,
  assertTargetHostPreflightIntegrity,
  createTargetHostPreflightEvidenceTemplate,
} from './exposure-model-compliance-m1-target-host-preflight.mjs';

const sha = (ch) => ch.repeat(64);
const PAIR = 'M1:TEST_FIXTURE:T1';

function receipt(condition) {
  const e6 = condition === 'E6';
  return {
    schema: 1,
    adapterVersion: ADAPTER_VERSION,
    runId: `${PAIR}:${e6 ? 'Y' : 'X'}`,
    condition,
    expectedSyntheticScenarioFingerprint: e6 ? sha('4') : sha('a'),
    candidateContractHash: e6 ? EXPECTED_CANDIDATE_HASH : null,
    materializationStatus: 'HOST_CAPTURE_COMPLETE',
    requestStage: EXPECTED_REQUEST_STAGE,
    requestType: 'model',
    beforeRequestInvocationCount: 1,
    beforeRequestInputFingerprint: sha('b'),
    flattenedMessageFingerprint: e6 ? sha('c') : sha('b'),
    actualHostRequestFingerprint: e6 ? sha('d') : sha('e'),
    providerBodyCaptureCount: 1,
    providerPropagationStatus: 'MATCH',
    providerCandidateLineMatchCount: e6 ? 6 : 0,
    modelIdentifier: 'same-model',
    modelSettingsFingerprint: sha('f'),
    characterReferenceFingerprint: sha('1'),
    generatedOutput: e6 ? 'candidate output' : 'baseline output',
    outputFingerprint: e6 ? sha('2') : sha('3'),
    anchorMessageIndex: 5,
    anchorLineIndex: 12,
    candidatePresenceBefore: [0, 0, 0, 0, 0, 0],
    candidatePresenceAfter: e6 ? [1, 1, 1, 1, 1, 1] : [0, 0, 0, 0, 0, 0],
    retryObserved: false,
    invalidReason: null,
  };
}

function passingEvidence() {
  const e = createTargetHostPreflightEvidenceTemplate();
  e.targetHostIdentity = { risuaiVersionOrBuild: 'test-build', apiVersion: '3.0', platform: 'test' };
  e.loadStatus = {
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
  e.b0Receipt = receipt('B0');
  e.e6Receipt = receipt('E6');
  e.postRunStatus = {
    adapterVersion: ADAPTER_VERSION,
    activeRun: null,
    receiptHistoryCount: 2,
    initError: null,
  };
  for (const key of Object.keys(e.cleanupAttestation)) e.cleanupAttestation[key] = true;
  return e;
}

const empty = assessTargetHostPreflight();
assert.equal(empty.status, 'HOLD_TARGET_HOST_EVIDENCE_REQUIRED');
assert.equal(empty.readyForM1Smoke, false);
assert.equal(assertTargetHostPreflightIntegrity(empty).pass, true);

const pass = assessTargetHostPreflight(passingEvidence());
assert.equal(pass.status, 'PASS_TARGET_HOST_PREFLIGHT');
assert.equal(pass.readyForM1Smoke, true);
assert.deepEqual(pass.failures, []);
assert.deepEqual(pass.missing, []);
assert.equal(pass.failures.includes('PAIR_SCENARIO_MISMATCH'), false);
assert.equal(assertTargetHostPreflightIntegrity(pass).pass, true);

const sameScenario = passingEvidence();
sameScenario.e6Receipt.expectedSyntheticScenarioFingerprint = sameScenario.b0Receipt.expectedSyntheticScenarioFingerprint;
const sameScenarioResult = assessTargetHostPreflight(sameScenario);
assert.ok(sameScenarioResult.failures.includes('PAIR_CONDITION_SCENARIO_FINGERPRINT_NOT_DISTINCT'));

const wrongStem = passingEvidence();
wrongStem.e6Receipt.runId = 'M1:OTHER_FIXTURE:T1:Y';
const wrongStemResult = assessTargetHostPreflight(wrongStem);
assert.ok(wrongStemResult.failures.includes('PAIR_RUN_ID_STEM_MISMATCH'));

const invalidStem = passingEvidence();
invalidStem.e6Receipt.runId = 'invalid';
const invalidStemResult = assessTargetHostPreflight(invalidStem);
assert.ok(invalidStemResult.failures.includes('PAIR_RUN_ID_FORMAT_INVALID'));

const b0Delta = passingEvidence();
b0Delta.b0Receipt.flattenedMessageFingerprint = sha('9');
const b0DeltaResult = assessTargetHostPreflight(b0Delta);
assert.equal(b0DeltaResult.status, 'BLOCK_TARGET_HOST_PREFLIGHT_FAILED');
assert.ok(b0DeltaResult.failures.includes('B0_NOT_IDENTITY_AT_BEFORE_REQUEST_STAGE'));

const e6NoDelta = passingEvidence();
e6NoDelta.e6Receipt.flattenedMessageFingerprint = e6NoDelta.e6Receipt.beforeRequestInputFingerprint;
const e6NoDeltaResult = assessTargetHostPreflight(e6NoDelta);
assert.ok(e6NoDeltaResult.failures.includes('E6_NO_REQUEST_STAGE_DELTA'));

const leak = passingEvidence();
leak.e6Receipt.providerCandidateLineMatchCount = 5;
const leakResult = assessTargetHostPreflight(leak);
assert.ok(leakResult.failures.includes('E6_PROVIDER_CANDIDATE_MATCH_COUNT'));

const pairModel = passingEvidence();
pairModel.e6Receipt.modelIdentifier = 'different-model';
assert.ok(assessTargetHostPreflight(pairModel).failures.includes('PAIR_MODEL_MISMATCH'));

const pairSettings = passingEvidence();
pairSettings.e6Receipt.modelSettingsFingerprint = sha('8');
assert.ok(assessTargetHostPreflight(pairSettings).failures.includes('PAIR_MODEL_SETTINGS_MISMATCH'));

const pairCharacter = passingEvidence();
pairCharacter.e6Receipt.characterReferenceFingerprint = sha('7');
assert.ok(assessTargetHostPreflight(pairCharacter).failures.includes('PAIR_CHARACTER_REFERENCE_MISMATCH'));

const pairInput = passingEvidence();
pairInput.e6Receipt.beforeRequestInputFingerprint = sha('6');
assert.ok(assessTargetHostPreflight(pairInput).failures.includes('PAIR_BASE_REQUEST_STAGE_INPUT_MISMATCH'));

const collision = passingEvidence();
collision.e6Receipt.invalidReason = 'MULTI_REQUEST_COLLISION';
assert.ok(assessTargetHostPreflight(collision).failures.includes('E6_INVALID_REASON'));

const noBody = passingEvidence();
noBody.e6Receipt.actualHostRequestFingerprint = null;
noBody.e6Receipt.providerPropagationStatus = 'NOT_OBSERVED';
const noBodyResult = assessTargetHostPreflight(noBody);
assert.ok(noBodyResult.failures.includes('E6_HOST_REQUEST_FINGERPRINT'));
assert.ok(noBodyResult.failures.includes('E6_PROVIDER_PROPAGATION'));

const cleanupHold = passingEvidence();
cleanupHold.cleanupAttestation.uiPartRemoved = null;
const cleanupHoldResult = assessTargetHostPreflight(cleanupHold);
assert.equal(cleanupHoldResult.status, 'HOLD_TARGET_HOST_EVIDENCE_REQUIRED');
assert.ok(cleanupHoldResult.missing.includes('CLEANUP_uiPartRemoved'));

const forbiddenPersistence = passingEvidence();
forbiddenPersistence.cleanupAttestation.persistentSemanticStateNotAdded = false;
const forbiddenPersistenceResult = assessTargetHostPreflight(forbiddenPersistence);
assert.equal(forbiddenPersistenceResult.status, 'BLOCK_TARGET_HOST_PREFLIGHT_FAILED');
assert.ok(forbiddenPersistenceResult.failures.includes('CLEANUP_persistentSemanticStateNotAdded'));

console.log('exposure-model-compliance-m1-target-host-preflight: PASS');
