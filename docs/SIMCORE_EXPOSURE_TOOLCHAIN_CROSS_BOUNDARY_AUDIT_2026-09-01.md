# SimCore Exposure Toolchain Cross-Boundary Audit — 2026-09-01

Date: 2026-09-01 KST

Status: **OFFLINE CROSS-BOUNDARY AUDIT COMPLETE · THREE REQUEST-FREE FIXES CLOSED · RESULT-SCORING BLOCKER IDENTIFIED · TARGET-HOST / MODEL EXECUTION PARKED · PRODUCTION / S7 UNCHANGED**

Classification: **EXPOSURE KNOWLEDGE · TOOLCHAIN AUDIT · REQUEST-FREE HARDENING · NO PRODUCTION IMPLEMENTATION AUTHORITY**

Audited chain:

```text
Exposure Prompt contract
→ semantic adversarial corpus
→ compliance harness
→ M1 execution prep
→ eval-only host adapter contract
→ target-host preflight
→ pair-identity amendment
→ future result review / scoring
```

Artifacts added by this transaction:

```text
products/simcore/tooling/exposure-toolchain-cross-boundary-audit.mjs
products/simcore/tooling/exposure-toolchain-cross-boundary-audit.test.mjs
```

Existing tooling corrected by this transaction:

```text
products/simcore/tooling/exposure-model-compliance-m1-execution-prep.mjs
products/simcore/tooling/exposure-model-compliance-m1-target-host-preflight.mjs
products/simcore/tooling/exposure-model-compliance-m1-target-host-preflight.test.mjs
```

No model call, RisuAI target-host run, production Prompt mutation, history rewrite, persistent semantic state, release-simcore mutation, or S7/P13 expansion is authorized or performed here.

---

## 1. Authority snapshot

At audit start:

```text
main = 2ac7ab6133623d2ad270c30354c74a3fd9ce8d6f
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production SimCore = v0.70.1 · Cold First-Turn Tail Attribution
```

The two main commits after the preceding Exposure pair-identity merge were repository skill work (`plugin-impact-scope`) and did not change SimCore production/runtime/Exposure/S7 authority.

Production remains governed by `release-simcore`. This audit changes only `main` design/tooling evidence.

---

## 2. Audit question

The audit asks:

```text
Do the independently-created Exposure evaluation layers still agree
on candidate identity, request stage, pair identity, manifest identity,
and review eligibility when connected end-to-end?
```

This is the RCR-D13 boundary question. A file passing its own unit test is not enough if adjacent contracts disagree.

---

## 3. FIX closed · prep request-stage scope drift

### Finding

M1 execution prep still described the adapter mutation scope as:

```text
REQUEST_LOCAL_FINAL_MESSAGE_ARRAY_ONLY
```

Fresh host-adapter source review had already established the actual order:

```text
built message array
→ beforeRequest replacer
→ request trigger
→ provider/model reformater
→ provider request
```

Therefore `beforeRequest` is not provider-final.

### Correction

Current prep metadata now freezes:

```text
mutationScope = REQUEST_LOCAL_BEFORE_REQUEST_MESSAGE_ARRAY_ONLY
requestStage = BEFORE_REQUEST_PRE_REQUEST_TRIGGER_PRE_PROVIDER_REFORMAT
providerObservationScope = READ_ONLY_PROVIDER_REQUEST_BODY_HASH_AND_CANDIDATE_VISIBILITY
providerRequestMutationAuthorized = false
```

`assertM1ExecutionPrepIntegrity()` now rejects regression of those stage/authority fields.

Classification:

```text
FIX · PREP_BEFORE_REQUEST_STAGE_SCOPE_DRIFT · CLOSED
```

No production/runtime behavior changed.

---

## 4. FIX closed · pair amendment was not canonical

### Finding

The pair-identity amendment correctly established that B0 and E6 condition-specific scenario fingerprints are expected to differ. However the original `assessTargetHostPreflight()` still contained:

```text
B0 expectedSyntheticScenarioFingerprint
==
E6 expectedSyntheticScenarioFingerprint
```

as a required pair rule.

The amendment function could repair the result only if every caller remembered to compose:

```text
base preflight
→ pair amendment
```

A caller invoking the base preflight alone therefore still received the superseded `PAIR_SCENARIO_MISMATCH` failure.

### Correction

The canonical base preflight now directly owns the amended rule:

```text
B0/E6 run IDs
→ valid X/Y run IDs
→ same harness pair stem

B0 scenario fingerprint
!=
E6 scenario fingerprint

and existing pair-comparability gates remain:
request type
model
settings fingerprint
character/reference fingerprint
anchor
beforeRequest base input fingerprint
```

The old `PAIR_SCENARIO_MISMATCH` rule is no longer emitted by the canonical base validator.

The historical amendment remains compatible and becomes idempotent when applied to an already-correct canonical result.

Classification:

```text
FIX · PAIR_IDENTITY_AMENDMENT_NOT_CANONICAL · CLOSED
```

---

## 5. FIX closed · harness receipt manifest-binding gap

### Finding

Even after the pair identity correction, host mechanics validation only established that each receipt contained:

```text
valid SHA-256 scenario fingerprint
+ same pair run-id stem
+ matching real-host request/model/settings/reference/anchor evidence
```

It did not establish that the supplied condition fingerprint was the exact fingerprint assigned to that run by the frozen M1 harness.

Therefore a syntactically valid but fabricated distinct SHA could satisfy host-mechanics validation.

This is not a host-adapter defect. It is a missing boundary between:

```text
HARNESS MANIFEST AUTHORITY
and
HOST RECEIPT EVIDENCE
```

### Correction

The new audit tooling exports:

```text
assessM1ManifestBinding(prep, evidence)
```

It requires:

```text
B0 receipt runId
→ exact B0 M1 execution-sheet row
→ exact B0 syntheticScenarioFingerprint

E6 receipt runId
→ exact E6 M1 execution-sheet row
→ exact E6 syntheticScenarioFingerprint

both rows
→ same pairId

B0 row
→ candidateLineCount = 0
→ candidateContractHash = null

E6 row
→ candidateLineCount = 6
→ candidateContractHash = frozen candidate hash
```

A random replacement fingerprint may still be mechanically well-formed at the host layer, but it now fails manifest binding.

Classification:

```text
FIX · HARNESS_RECEIPT_MANIFEST_BINDING_GAP · CLOSED
```

---

## 6. Candidate identity convergence

The audit keeps one candidate identity across the chain:

```text
candidateContractHash
= 3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc
```

The six frozen lines remain owned by the offline Prompt contract and consumed by the harness/adapter tooling. No alternate E6 contract is created.

M1 remains:

```text
12 fixtures
12 pairs
24 runs
B0 = 12
E6 = 12
```

Condition-specific B0/E6 scenario fingerprints remain intentionally distinct.

---

## 7. New audit checker

`runExposureToolchainCrossBoundaryAudit()` checks request-free invariants including:

1. candidate hash convergence;
2. fixture-corpus hash convergence;
3. M1 12-pair / 24-run cardinality;
4. corrected beforeRequest-stage adapter metadata;
5. provider request mutation authority remains false;
6. B0/E6 condition scenario fingerprints differ per pair;
7. canonical base preflight accepts amended pair identity directly;
8. historical amendment is idempotent after canonicalization;
9. harness manifest binding accepts exact rows;
10. forged condition fingerprint is rejected by manifest binding.

Execution mode is explicitly:

```text
OFFLINE_CROSS_BOUNDARY_AUDIT_ONLY
```

and the result cannot grant runtime or production authority.

---

## 8. Open blocker · result scoring accepts unexecuted locked review

The audit deliberately probes the next boundary:

```text
harness run
→ createLockedReviewRecord(...)
→ summarize / score
```

Current `createLockedReviewRecord()` validates review labels, 1..5 ratings, and rationale, but does not require:

```text
executionStatus = completed usable run
hostCapture.generatedOutput present
host materialization evidence present
```

Therefore a pristine harness row with:

```text
executionStatus = NOT_RUN
hostCapture.generatedOutput = null
```

can still receive a locked review record if the caller supplies review fields.

That review can later enter summary logic because the current summary excludes only `HARNESS_INVALID`, not `NOT_RUN`.

Classification:

```text
BLOCKER · RESULT_SCORING_ACCEPTS_UNEXECUTED_LOCKED_REVIEW
```

Scope of blocker:

```text
blocks future M1/M2 result-ingest and scoring authority
DOES NOT block production v0.70.1
DOES NOT block the parked Exposure design line
DOES NOT require a model request to repair
```

This becomes the next request-free transaction.

---

## 9. WATCH · provider propagation multiplicity

The host adapter currently records candidate propagation as a six-element presence vector derived from whether each frozen line occurs anywhere in the provider-body serialization.

This proves:

```text
all six distinct candidate lines visible downstream
```

but does not prove:

```text
each line occurs exactly once downstream
```

A provider reformatter duplicating the whole candidate block could therefore still produce a six-of-six presence result.

Classification:

```text
WATCH · PROVIDER_BODY_PROPAGATION_PRESENCE_NOT_EXACT_OCCURRENCE_MULTIPLICITY
```

This is relevant only before future real-host evidence is promoted. Actual target-host testing is currently parked by user choice.

---

## 10. WATCH · bounded settings fingerprint

The adapter hashes a bounded projection of known RisuAI database settings. It is not a universal proof that every provider-specific sampling/config parameter is identical.

Classification:

```text
WATCH · MODEL_SETTINGS_FINGERPRINT_IS_BOUNDED_HOST_PROJECTION_NOT_COMPLETE_PROVIDER_CONFIG_PROOF
```

The paired beforeRequest input and model/reference checks still provide useful comparability, but no stronger claim is authorized.

---

## 11. WATCH · output-listener correlation remains host evidence

The output listener captures the committed output while the one-shot run is active. Whether this cleanly correlates to the intended generation under the target host remains an actual-host question.

Classification:

```text
WATCH · OUTPUT_LISTENER_CORRELATION_REQUIRES_TARGET_HOST_PREFLIGHT
```

Because practical testing is intentionally parked, no synthetic PASS is manufactured.

---

## 12. Evidence-layer separation

This transaction distinguishes:

```text
source/contract inspection
!=
offline cross-boundary audit
!=
repository CI acceptance
!=
target-host preflight
!=
model semantic compliance
```

The sibling audit test is authored as standalone Node coverage. Repository `Verify` / `Required`, when the PR runs, remain separate repository gates and must not be described as target-host or model-compliance evidence.

---

## 13. Final disposition

Expected audit disposition after the three request-free fixes:

```text
PASS_WITH_BLOCKER_BEFORE_RESULT_SCORING
```

Closed:

```text
FIX · PREP_BEFORE_REQUEST_STAGE_SCOPE_DRIFT
FIX · PAIR_IDENTITY_AMENDMENT_NOT_CANONICAL
FIX · HARNESS_RECEIPT_MANIFEST_BINDING_GAP
```

Open:

```text
BLOCKER · RESULT_SCORING_ACCEPTS_UNEXECUTED_LOCKED_REVIEW
WATCH · PROVIDER_BODY_PROPAGATION_PRESENCE_NOT_EXACT_OCCURRENCE_MULTIPLICITY
WATCH · MODEL_SETTINGS_FINGERPRINT_IS_BOUNDED_HOST_PROJECTION_NOT_COMPLETE_PROVIDER_CONFIG_PROOF
WATCH · OUTPUT_LISTENER_CORRELATION_REQUIRES_TARGET_HOST_PREFLIGHT
```

Production boundary:

```text
release-simcore change = NONE
plugins/simcore/latest.js change = NONE
plugins/simcore/install.js change = NONE
Prompt production bytes change = NONE
persistent schema change = NONE
history mutation = NONE
S7 / P13 / v0.70.3 change = NONE
model calls = NONE
```

---

## 14. Next request-free action

```text
EXPOSURE_M1_RESULT_INGEST_AND_SCORING_TOOL
```

Its first responsibility is not scoring math. It must close the blocker by making **execution/materialization validity a prerequisite for review lock and summary inclusion**.

Only after that boundary is safe should blind review aggregation and M1/M2 scoring be treated as evidence-bearing tooling.
