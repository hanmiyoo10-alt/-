# SimCore Exposure Model Compliance M1 Target-Host Preflight — 2026-09-01

Date: 2026-09-01 KST

Status: **TARGET-HOST PREFLIGHT VALIDATOR IMPLEMENTED · STANDALONE REGRESSION PASS · ACTUAL TARGET-HOST EVIDENCE NOT YET CAPTURED · M1 MODEL COMPLIANCE NOT YET EXECUTED · PRODUCTION / S7 UNCHANGED**

Classification: **EXPOSURE KNOWLEDGE · DIRECT B-ROOT · M1 MODEL COMPLIANCE · TARGET-HOST PREFLIGHT · EVAL-ONLY · NO PRODUCTION IMPLEMENTATION AUTHORITY**

Related evidence:

```text
docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_PROTOCOL_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_HARNESS_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_M1_EXECUTION_PREP_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_M1_HOST_ADAPTER_2026-09-01.md
docs/REPOSITORY_COMMON_RULES.md
```

Artifacts:

```text
products/simcore/tooling/exposure-model-compliance-m1-target-host-preflight.mjs
products/simcore/tooling/exposure-model-compliance-m1-target-host-preflight.test.mjs
```

This transaction does not run the user's RisuAI host, execute a model generation, or alter production SimCore.

## 1. Purpose

The host adapter is implemented and mock-host tested. The remaining gate before the 24-generation M1 smoke is:

```text
Does the actual target RisuAI host preserve the B0 / E6 experiment contract
across real API-v3 boundaries strongly enough that model results are interpretable?
```

This is a host-integrity test, not yet a model-compliance test.

Required chain:

```text
adapter load / permission
→ B0 request-stage identity
→ E6 exact six-line insertion
→ provider-body propagation
→ committed-output receipt
→ B0/E6 pair comparability
→ auto-disarm
→ unload / no persistent production effect
```

Only a complete pass may open M1 smoke execution.

## 2. Current disposition

Repository evidence does not contain the user's actual target-host receipts, therefore the correct initial disposition is:

```text
HOLD_TARGET_HOST_EVIDENCE_REQUIRED
readyForM1Smoke = false
```

This is an evidence boundary, not a defect.

No static test, CI result, or upstream source inspection may be promoted into target-host PASS.

## 3. Boundary correction preserved

The previous adapter transaction established:

```text
beforeRequest message array
!=
provider-final request body
```

The actual RisuAI flow is approximately:

```text
already-built arg.formated
→ beforeRequest replacers
→ RisuAI request trigger
→ requestChatDataMain
→ provider/model reformater
→ provider request
```

Therefore this preflight validates two distinct boundaries:

```text
flattenedMessageFingerprint
= beforeRequest-stage message-array fingerprint

actualHostRequestFingerprint
= later provider request-body fingerprint observed by the public body interceptor
```

Both are required.

## 4. Common-rule alignment

### RCR-D11

Use the narrowest public surfaces already selected:

```text
beforeRequest replacer
read-only body interceptor
output listener
unload cleanup
```

No generic request pipeline or new persistent experiment owner is introduced.

### RCR-D12

```text
M1 harness row
→ adapter one-shot arm
→ beforeRequest B0/E6 transform
→ host request trigger / provider reformat
→ read-only provider-body observation
→ model generation
→ committed-output listener
→ bounded receipt
→ offline preflight validator
```

### RCR-D13

The validator checks boundary joins rather than isolated files:

```text
scenario identity ↔ B0/E6 receipts
B0 input ↔ B0 output identity
E6 input ↔ E6 request-stage delta
E6 candidate ↔ provider-body visibility
B0 model/settings/reference ↔ E6 model/settings/reference
output ↔ receipt fingerprint
run completion ↔ auto-disarm
unload ↔ hook/UI cleanup
```

### RCR-C09

This remains a validator-first stage. No broader writer/replacement authority is created.

## 5. Evidence packet

The offline validator consumes:

```text
schema
preflightVersion

targetHostIdentity
  risuaiVersionOrBuild
  apiVersion
  platform

loadStatus
b0Receipt
e6Receipt
postRunStatus
cleanupAttestation
operatorNotes[]
```

Unknown target-host fields remain unknown. The validator never manufactures them.

## 6. Load gate

Before arming any run, target-host status must show:

```text
adapterVersion = EXPOSURE_MODEL_COMPLIANCE_M1_HOST_ADAPTER_2026-09-01
permissionGranted = true
replacerRegistered = true
bodyInterceptorRegistered = true
outputListenerRegistered = true
unloaded = false
initError = null
activeRun = null
```

Permission denial, init error, or missing required hook blocks the preflight. Do not widen permissions or edit production to force a pass.

## 7. B0 gate

B0 must prove identity at the adapter mutation boundary:

```text
condition = B0
materializationStatus = HOST_CAPTURE_COMPLETE
requestStage = BEFORE_REQUEST_PRE_REQUEST_TRIGGER_PRE_PROVIDER_REFORMAT
invalidReason = null
candidatePresenceBefore = [0,0,0,0,0,0]
candidatePresenceAfter  = [0,0,0,0,0,0]
candidateContractHash = null
providerPropagationStatus = MATCH
providerCandidateLineMatchCount = 0
beforeRequestInputFingerprint = flattenedMessageFingerprint
actualHostRequestFingerprint present
modelIdentifier present
modelSettingsFingerprint present
characterReferenceFingerprint present
outputFingerprint present
```

Hard invariant:

```text
B0 beforeRequest input fingerprint
=
B0 beforeRequest output fingerprint
```

A mutated B0 baseline contaminates the experiment and returns BLOCK.

## 8. E6 gate

E6 must prove both insertion and downstream propagation:

```text
condition = E6
materializationStatus = HOST_CAPTURE_COMPLETE
requestStage = BEFORE_REQUEST_PRE_REQUEST_TRIGGER_PRE_PROVIDER_REFORMAT
invalidReason = null
candidateContractHash = 3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc
candidatePresenceBefore = [0,0,0,0,0,0]
candidatePresenceAfter  = [1,1,1,1,1,1]
providerPropagationStatus = MATCH
providerCandidateLineMatchCount = 6
beforeRequestInputFingerprint != flattenedMessageFingerprint
actualHostRequestFingerprint present
modelIdentifier present
modelSettingsFingerprint present
characterReferenceFingerprint present
outputFingerprint present
```

A request-stage delta without provider-body visibility is not accepted as proof that the model received E6.

## 9. Pair comparability gate

B0 and E6 must share:

```text
expectedSyntheticScenarioFingerprint
requestType
modelIdentifier
modelSettingsFingerprint
characterReferenceFingerprint
anchorMessageIndex
anchorLineIndex
beforeRequestInputFingerprint
```

Run IDs must be distinct.

Any model, settings, reference, base-request, or anchor mismatch is a hard BLOCK even if both outputs look plausible.

## 10. Post-run and cleanup gates

After both runs:

```text
activeRun = null
receiptHistoryCount >= 2
initError = null
```

Cleanup requires every field below to be explicitly true:

```text
adapterUnloaded
replacerRemoved
bodyInterceptorRemoved
outputListenerRemoved
uiPartRemoved
productionSimCoreBytesUnchanged
savedPromptPresetUnchanged
chatHistoryNotRewrittenForCondition
persistentSemanticStateNotAdded
```

`null` means HOLD. `false` means BLOCK.

## 11. Dispositions

### PASS

```text
PASS_TARGET_HOST_PREFLIGHT
readyForM1Smoke = true
```

Requires complete evidence and zero invariant failures.

### HOLD

```text
HOLD_TARGET_HOST_EVIDENCE_REQUIRED
readyForM1Smoke = false
```

Used when no contradiction is proven but required real-host evidence is incomplete.

### BLOCK

```text
BLOCK_TARGET_HOST_PREFLIGHT_FAILED
readyForM1Smoke = false
```

Examples:

- B0 request-stage mutation;
- E6 missing one of six lines;
- E6 not visible at provider-body boundary;
- model/settings/reference mismatch;
- `MULTI_REQUEST_COLLISION` or any `invalidReason`;
- claimed completed output without capture;
- unload/persistence/production side effect.

## 12. Minimum target-host sequence

When the actual host is available, use this sequence.

### P1 · Load

1. Import the eval-only host adapter.
2. Grant only the required `replacer` permission.
3. Open `SimCore Exposure M1 Eval`.
4. Capture the disarmed status.
5. Record RisuAI build/version, API version, and platform.

### P2 · Select one M1 scenario

Use one harness-generated M1 synthetic scenario fingerprint. Keep the underlying fixture/source state identical across B0 and E6.

### P3 · B0

1. unique B0 run ID;
2. selected scenario fingerprint;
3. condition `B0`;
4. arm one run;
5. trigger the matching normal generation once;
6. refresh after committed output;
7. copy the latest B0 receipt.

Do not reroll a valid bad result.

### P4 · E6

Restore the same intended scenario state required by the paired harness contract, then:

1. distinct E6 run ID;
2. same scenario fingerprint;
3. condition `E6`;
4. arm one run;
5. trigger the matching normal generation once;
6. refresh after committed output;
7. copy the latest E6 receipt.

### P5 · Post-run

Capture status after E6. It must be auto-disarmed.

### P6 · Unload

Unload/disable the eval adapter through the normal host path and complete the cleanup attestation.

### P7 · Validate offline

Run:

```text
assessTargetHostPreflight(evidence)
```

Only `PASS_TARGET_HOST_PREFLIGHT` opens the M1 smoke gate.

## 13. Not evaluated here

The preflight does not score semantic output quality:

```text
PASS_ALLOWED
FAIL_LEAK
FAIL_UNDERKNOWLEDGE
FAIL_ATTRIBUTION
FAIL_OVERCLAIM
FAIL_STRUCTURE
REVIEW_AMBIGUOUS
naturalness
reactivity
epistemic clarity
```

Those remain owned by the frozen model-compliance protocol after host mechanics are proven.

Therefore:

```text
HOST MECHANICS PROOF
!=
MODEL SEMANTIC COMPLIANCE PROOF
```

## 14. Standalone regression

Command:

```text
node products/simcore/tooling/exposure-model-compliance-m1-target-host-preflight.test.mjs
```

Author-time result:

```text
exposure-model-compliance-m1-target-host-preflight: PASS
```

Coverage includes:

1. empty evidence -> HOLD;
2. complete coherent packet -> PASS;
3. B0 request-stage delta -> BLOCK;
4. E6 no request-stage delta -> BLOCK;
5. E6 provider count 5/6 -> BLOCK;
6. model mismatch -> BLOCK;
7. settings mismatch -> BLOCK;
8. character/reference mismatch -> BLOCK;
9. base request input mismatch -> BLOCK;
10. collision / invalidReason -> BLOCK;
11. missing provider evidence -> BLOCK;
12. incomplete cleanup -> HOLD;
13. persistent-state effect -> BLOCK.

This is validator-mechanics evidence only. It is not target-host evidence.

## 15. Current state and next gate

At completion of this repository transaction:

```text
Target-host preflight contract    IMPLEMENTED
Offline validator                 IMPLEMENTED
Standalone regression             PASS
Actual target-host packet         NOT CAPTURED
Actual B0 host receipt            NOT CAPTURED
Actual E6 host receipt            NOT CAPTURED
Model compliance                  NOT EVALUATED
Production implementation         NOT AUTHORIZED
```

Current:

```text
HOLD_TARGET_HOST_EVIDENCE_REQUIRED
```

If actual evidence later yields `PASS_TARGET_HOST_PREFLIGHT`, the next transaction is:

```text
EXPOSURE_MODEL_COMPLIANCE_M1_SMOKE_EXECUTION
```

using the frozen 12-pair / 24-run M1 harness.

If preflight BLOCKs, repair only the exact host-contract failure and repeat preflight. Do not run the 24-generation smoke through a mechanically invalid path.

## 16. Final boundary

```text
release-simcore changed             NO
plugins/simcore/latest.js changed   NO
plugins/simcore/install.js changed  NO
production Prompt changed           NO
persistent schema/state added       NO
history rewrite added               NO
model calls executed in repo stage  NO
S7 / P13 changed                    NO
production implementation           NOT AUTHORIZED
```
