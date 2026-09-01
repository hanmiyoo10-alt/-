# SimCore Exposure M1 Result Ingest and Scoring Tool — 2026-09-01

Date: 2026-09-01 KST

Status: **REQUEST-FREE RESULT INGEST / REVIEW ELIGIBILITY / STAGE SCORING IMPLEMENTED · PRIOR SCORING BLOCKER CLOSED · TARGET-HOST / MODEL EXECUTION PARKED · PRODUCTION / S7 UNCHANGED**

Classification: **EXPOSURE KNOWLEDGE · RESULT EVIDENCE PIPELINE · M1/M2 SCORING · OFFLINE TOOLING · NO PRODUCTION IMPLEMENTATION AUTHORITY**

Related authority/evidence:

```text
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_PROTOCOL_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_HARNESS_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_M1_EXECUTION_PREP_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_M1_TARGET_HOST_PREFLIGHT_2026-09-01.md
docs/SIMCORE_EXPOSURE_TOOLCHAIN_CROSS_BOUNDARY_AUDIT_2026-09-01.md
```

Artifacts added:

```text
products/simcore/tooling/exposure-m1-result-ingest-and-scoring.mjs
products/simcore/tooling/exposure-m1-result-ingest-and-scoring.test.mjs
```

Existing canonical tooling hardened:

```text
products/simcore/tooling/exposure-model-compliance-eval-harness.mjs
products/simcore/tooling/exposure-model-compliance-eval-harness.test.mjs
products/simcore/tooling/exposure-toolchain-cross-boundary-audit.mjs
products/simcore/tooling/exposure-toolchain-cross-boundary-audit.test.mjs
```

This transaction does not execute a RisuAI request or a model generation. It only closes the result-evidence boundary that can be proven without target-host access.

---

## 1. Authority snapshot

At transaction start:

```text
main = c2728fc38c969e2263567f7fb51beaeccd32a79e
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production SimCore = v0.70.1 · Cold First-Turn Tail Attribution
```

The nine main commits after the previous Exposure audit were agent-skill live-eval / PocketRisu work and did not change SimCore runtime, Exposure contract, S7, or release authority.

Production remains governed by `release-simcore`.

---

## 2. Blocker being closed

The preceding cross-boundary audit found:

```text
BLOCKER · RESULT_SCORING_ACCEPTS_UNEXECUTED_LOCKED_REVIEW
```

The old harness allowed:

```text
executionStatus = NOT_RUN
hostCapture.generatedOutput = null
```

while still permitting `createLockedReviewRecord(...)` if the supplied review fields were syntactically valid.

The old summary path also excluded only `HARNESS_INVALID`, so a manually-forged locked `NOT_RUN` object could contaminate score summaries.

That was an evidence-authority defect.

It was not a production/runtime defect.

---

## 3. Canonical review eligibility contract

The harness now exposes:

```text
assessReviewEligibility(run)
```

A run is review-eligible only when all of the following hold:

```text
executionStatus == VALID_GENERATION
harnessInvalidReason == null
pairId present
fixtureId present
conditionActualId in [B0, E6]
conditionOpaqueId in [X, Y]
synthetic scenario fingerprint is valid SHA-256
generatedOutput is nonempty
actualHostRequestFingerprint is valid SHA-256
modelIdentifier is nonempty
modelSettingsFingerprint is valid SHA-256
characterReferenceFingerprint is valid SHA-256
outputStructuralStatus is present
```

Canonical consequence:

```text
NOT_RUN
HARNESS_INVALID
missing generated output
missing request identity
missing model/settings/reference identity
missing structural status

→ NOT REVIEW ELIGIBLE
```

---

## 4. Blind review packet now requires executed evidence

`buildBlindReviewPacket(run)` now fails closed if the run is not review-eligible.

This prevents creation of a semantically reviewable-looking packet that contains no real generation.

The packet still hides:

```text
conditionActualId
candidateContractHash
candidateOverlay
```

and exposes only opaque condition identity `X` / `Y` to the reviewer.

---

## 5. Review lock now requires executed evidence

`createLockedReviewRecord(run, review)` now checks review eligibility before validating the review itself.

Therefore:

```text
valid review fields
+
unexecuted row

!=
locked evidence
```

The function throws:

```text
RUN_NOT_REVIEW_ELIGIBLE:...
```

for unexecuted or incompletely captured runs.

This closes the blocker at the canonical harness entrypoint rather than relying on downstream convention.

---

## 6. Summary path rejects forged locked rows

`summarizeLockedReviews(records)` now separates:

```text
usableLockedRuns
ineligibleLockedRuns
ineligibleLockedReasons
```

A manually-mutated object containing:

```text
review.locked = true
executionStatus = NOT_RUN
```

is not counted as usable evidence.

This is defense in depth after the review-lock gate.

---

## 7. Execution-result ingest contract

New tool:

```text
products/simcore/tooling/exposure-m1-result-ingest-and-scoring.mjs
```

Primary ingest function:

```text
ingestExecutionRecord(harness, capture)
```

The ingest path binds a host/result capture to one exact frozen harness row by:

```text
runId
+
conditionActualId, when supplied
+
expectedSyntheticScenarioFingerprint
```

The run ID must exist exactly once in the harness manifest.

The scenario fingerprint must equal the manifest row's frozen condition-specific fingerprint.

This complements the earlier target-host manifest binding guard and prevents result data from being attached to the wrong logical run.

---

## 8. Accepted execution statuses

The result tool accepts only:

```text
VALID_GENERATION
HARNESS_INVALID
```

For `HARNESS_INVALID`:

```text
harnessInvalidReason is mandatory
review eligibility remains false
```

For `VALID_GENERATION`:

```text
harnessInvalidReason must be null
all review-eligibility capture fields must be present
```

The ingest tool does not infer that a run was valid merely because an output string exists.

---

## 9. Why outputStructuralStatus is required

The frozen protocol defines `FAIL_STRUCTURE` as a legitimate primary review disposition and states that structural failure can make semantic scoring untrustworthy.

Therefore a result cannot enter review evidence without an explicit structural observation field.

The result tool does not force that field to say `PASS`.

It requires only that structural status has actually been recorded.

A structurally bad output may still be ingested and reviewed as:

```text
FAIL_STRUCTURE
```

rather than disappearing from the evidence set.

---

## 10. M1 scorecard

`buildStageScorecard(records, { stage: 'M1' })` expects:

```text
24 usable locked runs
12 B0
12 E6
7 E6 trap runs
5 E6 control runs
```

Possible deterministic M1 statuses include:

```text
BLOCK_SCORING_EVIDENCE_INTEGRITY
HOLD_M1_EVIDENCE_INCOMPLETE
HOLD_SEMANTIC_EVIDENCE_INCONCLUSIVE
BLOCK_M1_CRITICAL_LEAK
HOLD_M1_UTILITY_REVIEW_REQUIRED
M1_COMPLETE_MANUAL_GO_NO_GO_REQUIRED
```

M1 is a smoke stage.

Even a complete clean M1 never returns promotion evidence authority.

Canonical:

```text
M1 success
!=
production promotion evidence
```

---

## 11. M2 scorecard

`buildStageScorecard(records, { stage: 'M2' })` expects:

```text
72 usable locked runs
36 B0
36 E6
21 E6 trap runs
15 E6 control runs
3 trials per fixture
```

The frozen protocol's machine-checkable hard gates are implemented as:

```text
E6 FAIL_LEAK = 0 / 21
E6 control PASS_ALLOWED >= 14 / 15
no E6 control fixture has 0 / 3 PASS_ALLOWED
no unresolved REVIEW_AMBIGUOUS
complete evidence shape
no ineligible locked rows
```

Failure mappings:

```text
critical E6 leak
→ BLOCK_EXPOSURE_CANDIDATE_STILL_LEAKS

control pass count < 14 / 15
or any control fixture 0 / 3
→ BLOCK_EXPOSURE_CANDIDATE_OVER_RESTRICTIVE

unresolved ambiguity
→ HOLD_SEMANTIC_EVIDENCE_INCONCLUSIVE
```

If the machine-checkable gates pass:

```text
M2_MACHINE_GATES_PASS_COMPARATIVE_REVIEW_REQUIRED
```

not immediate promotion.

---

## 12. Comparative value remains a separate locked decision

The protocol requires candidate value over baseline and no material qualitative regression.

Those questions cannot be reduced honestly to one automatic arithmetic comparison.

For example:

```text
same primary pass counts
```

may still hide meaningful differences in:

```text
naturalness
reactivity
epistemic clarity
severity of avoided failures
```

Therefore the result tool requires a separate comparative review after machine gates pass.

Accepted comparative statuses:

```text
VALUE_DEMONSTRATED_NO_MATERIAL_REGRESSION
NO_INCREMENTAL_VALUE
MATERIAL_UTILITY_REGRESSION
INCONCLUSIVE
```

Mappings:

```text
VALUE_DEMONSTRATED_NO_MATERIAL_REGRESSION
→ PROMOTION_EVIDENCE_PASS

NO_INCREMENTAL_VALUE
→ REJECT_NO_INCREMENTAL_VALUE

MATERIAL_UTILITY_REGRESSION
→ BLOCK_COMMUNITY_UTILITY_REGRESSION

INCONCLUSIVE
→ HOLD_SEMANTIC_EVIDENCE_INCONCLUSIVE
```

A rationale is mandatory.

---

## 13. Promotion evidence still does not authorize installation

Even:

```text
PROMOTION_EVIDENCE_PASS
```

returns:

```text
productionImplementationAuthorized = false
```

This is intentional.

Evaluation evidence and production implementation authority remain separate transactions.

---

## 14. Scorecard metrics

Each condition receives:

```text
runs
trapRuns
controlRuns
dispositionCounts
trapPassCount
trapFailureCount
trapLeakCount
controlPassCount
controlUnderknowledgeCount
naturalnessMedian
reactivityMedian
epistemicClarityMedian
```

The scorecard also includes per-fixture tables with:

```text
runs
PASS_ALLOWED count
FAIL_LEAK count
FAIL_UNDERKNOWLEDGE count
REVIEW_AMBIGUOUS count
```

These are evidence summaries, not a replacement semantic oracle.

---

## 15. Evidence-integrity failures

The scorecard explicitly blocks if:

```text
duplicate run IDs exist
ineligible locked rows exist
records belong to a different stage
```

Disposition:

```text
BLOCK_SCORING_EVIDENCE_INTEGRITY
```

This ensures a complete-looking table cannot hide malformed evidence membership.

---

## 16. Cross-boundary audit closure

The existing cross-boundary audit probe previously attempted to lock one untouched `NOT_RUN` harness row.

After this transaction, the expected result is rejection:

```text
RUN_NOT_REVIEW_ELIGIBLE
```

The audit now records:

```text
FIX_RESULT_SCORING_REJECTS_UNEXECUTED_LOCKED_REVIEW
```

and no longer retains:

```text
BLOCKER_RESULT_SCORING_ACCEPTS_UNEXECUTED_LOCKED_REVIEW
```

When no other cross-boundary blocker exists, audit disposition becomes:

```text
PASS_CROSS_BOUNDARY_AUDIT
```

---

## 17. What remains parked

No result-ingest tooling can prove facts that require the user's actual RisuAI host.

Still parked:

```text
actual adapter load
actual B0/E6 request materialization
provider-body propagation evidence
output-listener correlation
actual M1 24 generations
actual M2 72 generations
actual semantic review evidence
```

No synthetic row created by this transaction is target-host evidence.

---

## 18. WATCH classifications

### WATCH · PROVIDER_BODY_OCCURRENCE_MULTIPLICITY

The host adapter currently observes whether all six distinct E6 lines reach provider-body serialization.

It does not yet prove each line occurs exactly once in the provider body.

This remains suitable for a separate request-free drift/contract guard improvement.

### WATCH · MODEL_SETTINGS_FINGERPRINT_IS_BOUNDED

The current host adapter fingerprints a bounded settings projection, not every provider-specific parameter.

Do not overclaim complete provider configuration identity.

### WATCH · OUTPUT_CORRELATION_REQUIRES_REAL_HOST

The static toolchain cannot prove that a real output listener event corresponds to the intended generation until target-host preflight is eventually executed.

Practical testing remains parked by user choice.

---

## 19. Production boundary

This transaction changes no:

```text
release-simcore
plugins/simcore/latest.js
plugins/simcore/install.js
production Prompt bytes
Lineage
Handoff
Evidence
Community
Reaction
Structure
Knowledge structure
persistent schema
history/request content
S7 / P13 / v0.70.3 scope
```

Production remains v0.70.1 at the authority snapshot above.

---

## 20. Classification

### FIX closed

```text
FIX · RESULT_SCORING_ACCEPTS_UNEXECUTED_LOCKED_REVIEW
```

Closed by canonical review eligibility + summary defense in depth.

### WATCH

```text
WATCH · PROVIDER_BODY_OCCURRENCE_MULTIPLICITY
WATCH · MODEL_SETTINGS_FINGERPRINT_IS_BOUNDED
WATCH · OUTPUT_CORRELATION_REQUIRES_REAL_HOST
```

### DEFER

```text
actual target-host preflight
M1 model execution
M2 model execution
production implementation decision
```

### BLOCKER

```text
none for the next request-free transaction
```

---

## 21. Current state

```text
EXPOSURE_RESULT_INGEST_TOOL                 = IMPLEMENTED
CANONICAL_REVIEW_ELIGIBILITY                = VALID_GENERATION + COMPLETE REQUIRED CAPTURE
UNEXECUTED_REVIEW_LOCK                      = REJECTED
FORGED_LOCKED_NOT_RUN_SUMMARY               = EXCLUDED / REPORTED
HARNESS_MANIFEST_RESULT_BINDING              = REQUIRED
M1_SCORECARD                                = IMPLEMENTED
M2_MACHINE_GATES                            = IMPLEMENTED
M2_COMPARATIVE_REVIEW                       = REQUIRED FOR FINAL DISPOSITION
PROMOTION_EVIDENCE_PASS                     = DOES NOT AUTHORIZE PRODUCTION IMPLEMENTATION
TARGET_HOST_EXECUTION                       = PARKED
MODEL_CALLS_EXECUTED                        = 0
PRODUCTION_CHANGE                           = NONE
S7_CHANGE                                   = NONE
```

---

## 22. Next request-free transaction

```text
EXPOSURE_ANCHOR_AND_CONTRACT_DRIFT_GUARD
```

Purpose:

```text
fail closed if future production Prompt / candidate / host adapter / scoring contracts drift
before a parked evaluation is resumed
```

This is request-free tooling hardening only.
