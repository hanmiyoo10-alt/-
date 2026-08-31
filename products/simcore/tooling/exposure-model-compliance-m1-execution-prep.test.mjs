import assert from 'node:assert/strict';
import {
  FORBIDDEN_HOST_EFFECTS,
  REQUIRED_HOST_CAPABILITIES,
  assertM1ExecutionPrepIntegrity,
  assessM1HostReadiness,
  buildM1ExecutionPrep,
  createM1HostCapabilityAttestationTemplate,
} from './exposure-model-compliance-m1-execution-prep.mjs';

function readyAttestation() {
  const row = createM1HostCapabilityAttestationTemplate();
  row.targetHostIdentity = {
    risuaiVersionOrBuild: 'test-host',
    apiVersion: '3.0',
    platform: 'test',
  };
  for (const key of REQUIRED_HOST_CAPABILITIES) row.capabilities[key] = true;
  for (const key of FORBIDDEN_HOST_EFFECTS) row.forbiddenEffects[key] = false;
  return row;
}

const blank = createM1HostCapabilityAttestationTemplate();
const blankReadiness = assessM1HostReadiness(blank);
assert.equal(blankReadiness.status, 'HOLD_HOST_PROBE_REQUIRED');
assert.equal(blankReadiness.readyForM1, false);
assert.equal(blankReadiness.unknownCapabilities.length, REQUIRED_HOST_CAPABILITIES.length);
assert.equal(blankReadiness.forbiddenUnknown.length, FORBIDDEN_HOST_EFFECTS.length);

const absent = readyAttestation();
absent.capabilities.replacerRunsAfterSimCorePromptAssembly = false;
const absentReadiness = assessM1HostReadiness(absent);
assert.equal(absentReadiness.status, 'BLOCKED_REQUIRED_HOST_CAPABILITY_ABSENT');
assert.deepEqual(absentReadiness.absentCapabilities, ['replacerRunsAfterSimCorePromptAssembly']);

const forbidden = readyAttestation();
forbidden.forbiddenEffects.savedPromptPresetMustChange = true;
const forbiddenReadiness = assessM1HostReadiness(forbidden);
assert.equal(forbiddenReadiness.status, 'BLOCKED_FORBIDDEN_HOST_EFFECT');
assert.deepEqual(forbiddenReadiness.blockers, ['savedPromptPresetMustChange']);

const ready = readyAttestation();
const readyReadiness = assessM1HostReadiness(ready);
assert.equal(readyReadiness.status, 'READY_FOR_M1_HOST_EXECUTION');
assert.equal(readyReadiness.readyForM1, true);

const holdPrep = buildM1ExecutionPrep();
assert.equal(holdPrep.disposition, 'HOLD_HOST_PROBE_REQUIRED');
assert.equal(holdPrep.modelCallsExecuted, false);
assert.equal(holdPrep.runtimeMutationAuthorized, false);
assert.equal(holdPrep.productionImplementationAuthorized, false);
assert.deepEqual(holdPrep.requiredNextEvidence, ['TARGET_HOST_CAPABILITY_ATTESTATION']);
assert.deepEqual(assertM1ExecutionPrepIntegrity(holdPrep), { pass: true, failures: [] });

const prep = buildM1ExecutionPrep({ attestation: ready });
assert.equal(prep.disposition, 'READY_FOR_SEPARATELY_AUTHORIZED_M1_EXECUTION');
assert.equal(prep.pairCount, 12);
assert.equal(prep.runCount, 24);
assert.equal(prep.executionSheet.length, 24);
assert.equal(prep.executionSheet.filter((row) => row.operatorConditionActualId === 'B0').length, 12);
assert.equal(prep.executionSheet.filter((row) => row.operatorConditionActualId === 'E6').length, 12);
assert.equal(prep.executionSheet.filter((row) => row.candidateLineCount === 6).length, 12);
assert.equal(prep.executionSheet.filter((row) => row.candidateLineCount === 0).length, 12);
assert.equal(prep.executionSheet.every((row) => row.hostCapture.materializationStatus === 'PENDING_HOST_MATERIALIZATION'), true);
assert.equal(prep.executionSheet.every((row) => row.hostCapture.flattenedMessageFingerprint === null), true);
assert.equal(prep.executionSheet.every((row) => row.hostCapture.actualHostRequestFingerprint === null), true);
assert.equal(prep.executionSheet.every((row) => row.hostCapture.generatedOutput === null), true);
assert.deepEqual(prep.requiredNextEvidence, ['TARGET_HOST_PREFLIGHT_PASS', 'M1_24_RUN_CAPTURE']);
assert.deepEqual(assertM1ExecutionPrepIntegrity(prep), { pass: true, failures: [] });

const e6Rows = prep.executionSheet.filter((row) => row.operatorConditionActualId === 'E6');
assert.equal(new Set(e6Rows.map((row) => row.candidateContractHash)).size, 1);
assert.equal(e6Rows[0].candidateContractHash, prep.candidateContractHash);

const mutated = structuredClone(prep);
mutated.executionSheet[0].hostCapture.materializationStatus = 'MATERIALIZED';
assert.equal(assertM1ExecutionPrepIntegrity(mutated).pass, false);
assert.equal(assertM1ExecutionPrepIntegrity(mutated).failures.includes('PRETEND_MATERIALIZED'), true);

console.log(`exposure-model-compliance-m1-execution-prep: PASS (${prep.runCount} runs, ${prep.pairCount} pairs)`);
