import assert from 'node:assert/strict';
import {
  assessAmendedPairIdentity,
  assertPairIdentityAmendmentIntegrity,
  pairRunStem,
} from './exposure-model-compliance-m1-target-host-pair-identity-amendment.mjs';

const B0_FP = 'affd426726e18ade01e5cf011b8eab9090e66d59f1fb5277993f194811cf21bd';
const E6_FP = '307ed91f0507d184cc0c77747cab583a7e7dffa1d1303a5c404cb1d6fcc42b35';
const PAIR = 'M1:TRAP_KNOWLEDGE_ONLY_HIDDEN_FACT_CONFIRMATION:T1';

function evidence(overrides = {}) {
  return {
    b0Receipt: {
      runId: `${PAIR}:X`,
      expectedSyntheticScenarioFingerprint: B0_FP,
      ...overrides.b0Receipt,
    },
    e6Receipt: {
      runId: `${PAIR}:Y`,
      expectedSyntheticScenarioFingerprint: E6_FP,
      ...overrides.e6Receipt,
    },
  };
}

function base(overrides = {}) {
  return {
    status: 'BLOCK_TARGET_HOST_PREFLIGHT_FAILED',
    readyForM1Smoke: false,
    failures: ['PAIR_SCENARIO_MISMATCH'],
    missing: [],
    modelComplianceEvaluated: false,
    productionImplementationAuthorized: false,
    runtimeMutationAuthorized: false,
    ...overrides,
  };
}

assert.equal(pairRunStem(`${PAIR}:X`), PAIR);
assert.equal(pairRunStem(`${PAIR}:Y`), PAIR);
assert.equal(pairRunStem('arbitrary'), null);

const corrected = assessAmendedPairIdentity(evidence(), base());
assert.equal(corrected.status, 'PASS_TARGET_HOST_PREFLIGHT');
assert.equal(corrected.readyForM1Smoke, true);
assert.deepEqual(corrected.failures, []);
assert.equal(assertPairIdentityAmendmentIntegrity(corrected).pass, true);

const wrongPair = assessAmendedPairIdentity(evidence({ e6Receipt: { runId: 'M1:OTHER_FIXTURE:T1:Y' } }), base());
assert.equal(wrongPair.status, 'BLOCK_TARGET_HOST_PREFLIGHT_FAILED');
assert.ok(wrongPair.failures.includes('PAIR_RUN_ID_STEM_MISMATCH'));

const sameConditionFingerprint = assessAmendedPairIdentity(evidence({ e6Receipt: { expectedSyntheticScenarioFingerprint: B0_FP } }), base());
assert.equal(sameConditionFingerprint.status, 'BLOCK_TARGET_HOST_PREFLIGHT_FAILED');
assert.ok(sameConditionFingerprint.failures.includes('PAIR_CONDITION_SCENARIO_FINGERPRINT_NOT_DISTINCT'));

const preservedFailure = assessAmendedPairIdentity(evidence(), base({ failures: ['PAIR_SCENARIO_MISMATCH', 'PAIR_MODEL_MISMATCH'] }));
assert.equal(preservedFailure.status, 'BLOCK_TARGET_HOST_PREFLIGHT_FAILED');
assert.deepEqual(preservedFailure.failures, ['PAIR_MODEL_MISMATCH']);

const preservedHold = assessAmendedPairIdentity(evidence(), base({ failures: ['PAIR_SCENARIO_MISMATCH'], missing: ['CLEANUP_adapterUnloaded'] }));
assert.equal(preservedHold.status, 'HOLD_TARGET_HOST_EVIDENCE_REQUIRED');
assert.equal(preservedHold.readyForM1Smoke, false);

const invalidRunId = assessAmendedPairIdentity(evidence({ b0Receipt: { runId: 'bad' } }), base());
assert.ok(invalidRunId.failures.includes('PAIR_RUN_ID_FORMAT_INVALID'));

console.log('exposure-model-compliance-m1-target-host-pair-identity-amendment: PASS');
