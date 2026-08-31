import assert from 'node:assert/strict';
import {
  assessM1ManifestBinding,
  runExposureToolchainCrossBoundaryAudit,
} from './exposure-toolchain-cross-boundary-audit.mjs';
import { buildM1ExecutionPrep } from './exposure-model-compliance-m1-execution-prep.mjs';

const result = runExposureToolchainCrossBoundaryAudit();
assert.equal(result.pass, true, result.failures.join('\n'));
assert.deepEqual(result.failures, []);
assert.equal(result.executionMode, 'OFFLINE_CROSS_BOUNDARY_AUDIT_ONLY');
assert.equal(result.modelCallsExecuted, false);
assert.equal(result.runtimeMutationAuthorized, false);
assert.equal(result.productionImplementationAuthorized, false);
assert.equal(result.productionChange, false);
assert.equal(result.s7Change, false);
assert.equal(result.m1PairCount, 12);
assert.equal(result.m1RunCount, 24);
assert.ok(result.fixesClosed.includes('FIX_PREP_BEFORE_REQUEST_STAGE_SCOPE_DRIFT'));
assert.ok(result.fixesClosed.includes('FIX_PAIR_IDENTITY_AMENDMENT_CANONICALIZED'));
assert.ok(result.fixesClosed.includes('FIX_HARNESS_RECEIPT_MANIFEST_BINDING_GUARD'));
assert.ok(result.blockers.includes('BLOCKER_RESULT_SCORING_ACCEPTS_UNEXECUTED_LOCKED_REVIEW'));
assert.equal(result.disposition, 'PASS_WITH_BLOCKER_BEFORE_RESULT_SCORING');
assert.equal(result.next, 'EXPOSURE_M1_RESULT_INGEST_AND_SCORING_TOOL');

const prep = buildM1ExecutionPrep();
const firstPairId = prep.executionSheet[0].pairId;
const pairRows = prep.executionSheet.filter((row) => row.pairId === firstPairId);
const b0 = pairRows.find((row) => row.operatorConditionActualId === 'B0');
const e6 = pairRows.find((row) => row.operatorConditionActualId === 'E6');

const evidence = {
  b0Receipt: {
    runId: b0.runId,
    expectedSyntheticScenarioFingerprint: b0.syntheticScenarioFingerprint,
  },
  e6Receipt: {
    runId: e6.runId,
    expectedSyntheticScenarioFingerprint: e6.syntheticScenarioFingerprint,
  },
};

const bound = assessM1ManifestBinding(prep, evidence);
assert.equal(bound.pass, true);
assert.equal(bound.pairId, firstPairId);
assert.deepEqual(bound.failures, []);

const forged = structuredClone(evidence);
forged.e6Receipt.expectedSyntheticScenarioFingerprint = '9'.repeat(64);
const forgedResult = assessM1ManifestBinding(prep, forged);
assert.equal(forgedResult.pass, false);
assert.ok(forgedResult.failures.includes('E6_SCENARIO_FINGERPRINT_NOT_MANIFEST_BOUND'));

const wrongRun = structuredClone(evidence);
wrongRun.b0Receipt.runId = 'M1:NOT_A_REAL_PAIR:T1:X';
const wrongRunResult = assessM1ManifestBinding(prep, wrongRun);
assert.equal(wrongRunResult.pass, false);
assert.ok(wrongRunResult.failures.includes('B0_RUN_NOT_IN_M1_MANIFEST'));

console.log(`exposure-toolchain-cross-boundary-audit: PASS (${result.m1RunCount} runs, ${result.m1PairCount} pairs, ${result.blockers.length} deferred blocker)`);
