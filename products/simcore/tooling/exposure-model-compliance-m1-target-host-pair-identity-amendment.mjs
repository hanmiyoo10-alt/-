const AMENDMENT_VERSION = 'EXPOSURE_MODEL_COMPLIANCE_M1_TARGET_HOST_PAIR_IDENTITY_AMENDMENT_2026-09-01';
const SUPERSEDED_FAILURE = 'PAIR_SCENARIO_MISMATCH';

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

export function pairRunStem(runId) {
  const text = String(runId || '').trim();
  if (!text) return null;
  const parts = text.split(':');
  if (parts.length < 2) return null;
  const tail = parts.at(-1);
  if (!['X', 'Y'].includes(tail)) return null;
  return parts.slice(0, -1).join(':');
}

export function assessAmendedPairIdentity(evidence, baseResult) {
  const failures = Array.isArray(baseResult?.failures)
    ? baseResult.failures.filter((item) => item !== SUPERSEDED_FAILURE)
    : [];
  const missing = Array.isArray(baseResult?.missing) ? baseResult.missing.slice() : [];
  const b0 = evidence?.b0Receipt || null;
  const e6 = evidence?.e6Receipt || null;

  if (b0 && e6) {
    const b0Stem = pairRunStem(b0.runId);
    const e6Stem = pairRunStem(e6.runId);
    if (!b0Stem || !e6Stem) failures.push('PAIR_RUN_ID_FORMAT_INVALID');
    else if (b0Stem !== e6Stem) failures.push('PAIR_RUN_ID_STEM_MISMATCH');

    const b0Scenario = b0.expectedSyntheticScenarioFingerprint;
    const e6Scenario = e6.expectedSyntheticScenarioFingerprint;
    if (!isSha256(b0Scenario) || !isSha256(e6Scenario)) {
      failures.push('PAIR_CONDITION_SCENARIO_FINGERPRINT_INVALID');
    } else if (b0Scenario === e6Scenario) {
      failures.push('PAIR_CONDITION_SCENARIO_FINGERPRINT_NOT_DISTINCT');
    }
  }

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
    ...baseResult,
    amendmentVersion: AMENDMENT_VERSION,
    pairIdentityAmended: true,
    supersededPairRule: 'B0_EXPECTED_SYNTHETIC_SCENARIO_FINGERPRINT_EQUALS_E6',
    pairIdentityRule: 'SAME_HARNESS_PAIR_RUN_ID_STEM_PLUS_EXISTING_REAL_HOST_BASE_REQUEST_MODEL_SETTINGS_REFERENCE_ANCHOR_GATES',
    status,
    readyForM1Smoke,
    failures,
    missing,
  };
}

export function assertPairIdentityAmendmentIntegrity(result) {
  const failures = [];
  if (result?.amendmentVersion !== AMENDMENT_VERSION) failures.push('AMENDMENT_VERSION');
  if (result?.pairIdentityAmended !== true) failures.push('PAIR_IDENTITY_FLAG');
  if (!['PASS_TARGET_HOST_PREFLIGHT', 'HOLD_TARGET_HOST_EVIDENCE_REQUIRED', 'BLOCK_TARGET_HOST_PREFLIGHT_FAILED'].includes(result?.status)) failures.push('STATUS');
  if (result?.readyForM1Smoke === true && result?.status !== 'PASS_TARGET_HOST_PREFLIGHT') failures.push('READY_STATUS');
  if (Array.isArray(result?.failures) && result.failures.includes(SUPERSEDED_FAILURE)) failures.push('SUPERSEDED_FAILURE_RETAINED');
  return { pass: failures.length === 0, failures };
}

export { AMENDMENT_VERSION, SUPERSEDED_FAILURE };
