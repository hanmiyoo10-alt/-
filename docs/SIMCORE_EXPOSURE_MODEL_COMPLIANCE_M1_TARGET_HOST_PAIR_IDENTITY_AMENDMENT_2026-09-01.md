# SimCore Exposure Model Compliance M1 Target-Host Pair Identity Amendment — 2026-09-01

Date: 2026-09-01 KST

Status: **PAIR-IDENTITY CONTRADICTION FIXED · STANDALONE AMENDMENT REGRESSION PASS · TARGET-HOST EVIDENCE STILL NOT CAPTURED · PRODUCTION / S7 UNCHANGED**

Classification: **FIX · EXPOSURE KNOWLEDGE · M1 TARGET-HOST PREFLIGHT · EVAL-ONLY · NO PRODUCTION IMPLEMENTATION AUTHORITY**

Related authority/evidence:

```text
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_HARNESS_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_M1_EXECUTION_PREP_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_M1_HOST_ADAPTER_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_M1_TARGET_HOST_PREFLIGHT_2026-09-01.md
```

Artifacts:

```text
products/simcore/tooling/exposure-model-compliance-m1-target-host-pair-identity-amendment.mjs
products/simcore/tooling/exposure-model-compliance-m1-target-host-pair-identity-amendment.test.mjs
```

## 1. Defect

The first target-host preflight contract required:

```text
B0.expectedSyntheticScenarioFingerprint
==
E6.expectedSyntheticScenarioFingerprint
```

That requirement is incompatible with the already-frozen harness.

The harness computes `syntheticScenarioFingerprint` over a condition scenario that includes:

```text
condition
candidateOverlay
candidateLineCount
candidateContractHash
```

Therefore a valid paired B0/E6 fixture intentionally produces two different synthetic scenario fingerprints.

Concrete M1 pair:

```text
pairId = M1:TRAP_KNOWLEDGE_ONLY_HIDDEN_FACT_CONFIRMATION:T1

B0 syntheticScenarioFingerprint
= affd426726e18ade01e5cf011b8eab9090e66d59f1fb5277993f194811cf21bd

E6 syntheticScenarioFingerprint
= 307ed91f0507d184cc0c77747cab583a7e7dffa1d1303a5c404cb1d6fcc42b35
```

Thus the old equality gate made `PASS_TARGET_HOST_PREFLIGHT` unreachable for a correct harness pair.

Classification:

```text
FIX · TARGET_HOST_PREFLIGHT_PAIR_SCENARIO_IDENTITY_CONTRADICTION
```

## 2. Correct pair identity

The condition-specific fingerprint remains valid and must remain distinct between B0 and E6.

Pair identity is instead established by:

```text
same harness pair run-id stem
+
existing target-host comparability gates:
  same beforeRequest input fingerprint
  same request type
  same model identifier
  same model settings fingerprint
  same character/reference fingerprint
  same insertion anchor
```

For harness-generated M1 rows:

```text
B0 runId = <pairId>:X|Y
E6 runId = <same pairId>:Y|X
```

Removing the final opaque condition label must yield the same pair stem.

## 3. Superseded rule

The following failure is superseded by this amendment:

```text
PAIR_SCENARIO_MISMATCH
```

It must not block an otherwise coherent pair merely because B0/E6 condition fingerprints differ.

The amendment adds two explicit pair checks:

```text
PAIR_RUN_ID_STEM_MISMATCH
PAIR_CONDITION_SCENARIO_FINGERPRINT_NOT_DISTINCT
```

A malformed harness run ID is also blocked:

```text
PAIR_RUN_ID_FORMAT_INVALID
```

## 4. Application

The amendment consumes:

```text
baseResult = assessTargetHostPreflight(evidence)
corrected = assessAmendedPairIdentity(evidence, baseResult)
```

The amendment removes only the superseded `PAIR_SCENARIO_MISMATCH` failure. Every other failure and every missing-evidence item from the original preflight validator is preserved.

Therefore it does not weaken:

```text
B0 identity gate
E6 exact six-line gate
provider propagation gate
model/settings/reference comparability
base request input equality
anchor equality
post-run auto-disarm
cleanup/persistence gates
```

## 5. Standalone regression

Author-time deterministic result:

```text
exposure-model-compliance-m1-target-host-pair-identity-amendment: PASS
```

Coverage:

1. valid same-pair B0/E6 with distinct condition fingerprints clears the superseded false failure;
2. different pair stems block;
3. identical B0/E6 condition fingerprints block;
4. unrelated base preflight failures remain blocking;
5. missing evidence remains HOLD;
6. malformed run ID blocks;
7. superseded failure cannot survive the amended result.

This is amendment-mechanics evidence only. It is not target-host evidence and not model-compliance evidence.

## 6. Current disposition

```text
PAIR-IDENTITY CONTRACT     FIXED
TARGET-HOST RECEIPTS       NOT YET CAPTURED
M1 SMOKE                    STILL LOCKED
CURRENT DISPOSITION         HOLD_TARGET_HOST_EVIDENCE_REQUIRED
```

The next action remains actual target-host preflight execution with one harness-generated B0/E6 pair.

## 7. Boundaries

No change to:

```text
release-simcore
plugins/simcore/latest.js
plugins/simcore/install.js
production Prompt bytes
production request construction
persistent state/schema
S7 / P13 / v0.70.3
```

This amendment grants no production implementation authority.
