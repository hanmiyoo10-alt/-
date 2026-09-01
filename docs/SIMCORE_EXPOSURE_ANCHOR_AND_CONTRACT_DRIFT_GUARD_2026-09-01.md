# SimCore Exposure Anchor and Contract Drift Guard - 2026-09-01

Date: 2026-09-01 KST

Status: **REQUEST-FREE DRIFT GUARD IMPLEMENTED · EXPOSURE TOOLING CI CLASSIFICATION GAP REPAIRED · TARGET-HOST / MODEL EXECUTION STILL PARKED · PRODUCTION / S7 UNCHANGED**

Classification: **EXPOSURE KNOWLEDGE · EVAL TOOLCHAIN INTEGRITY · FAIL-CLOSED RESUME GATE · NO PRODUCTION IMPLEMENTATION AUTHORITY**

Artifacts:

```text
products/simcore/tooling/exposure-anchor-and-contract-drift-guard.mjs
products/simcore/tooling/exposure-anchor-and-contract-drift-guard.test.mjs
products/simcore/tests/suites/exposure-contract-drift-guard.test.mjs
products/simcore/tests/fixtures/exposure-contract-drift-guard/static-contract.json
```

CI classification repair:

```text
products/simcore/tooling/ci/classify.mjs
```

Permanent regression registry:

```text
products/simcore/tests/registry.mjs
```

This transaction executes no target-host request and no model generation.

---

## 1. Authority snapshot

At transaction start:

```text
main = 64e6c0d69dd09fb571f422208099656bc22f342e
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production version = 0.70.1
production release = Cold First-Turn Tail Attribution
```

Production authority remains `release-simcore`.

No release branch write is part of this transaction.

---

## 2. Why this guard exists

The Exposure eval line now contains several separately correct contracts:

```text
frozen direct-B-root semantic contract
frozen six Prompt lines
M1/M2 harness
execution prep
host adapter
preflight receipt validation
cross-boundary audit
result ingest
review eligibility
M1/M2 scoring
```

Those artifacts are safe only while their shared assumptions remain aligned.

A future production or tooling change could otherwise create this failure shape:

```text
old eval adapter
+
new production Prompt shape
+
old anchor
+
old candidate hash
+
old scoring assumptions

→ model evidence collected against a different contract than intended
```

Canonical rule:

```text
EVAL TOOLCHAIN PREPARED EARLIER
!=
EVAL TOOLCHAIN STILL VALID NOW
```

Therefore target-host evaluation must not resume merely because the files still exist.

---

## 3. Frozen production anchor at this checkpoint

Exact deployed Prompt source still contains:

```text
specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support;CURRENT_SOURCE_EVIDENCE_may_support_only_nonconflicting_rendered_details=1;outside_root_specifics_omit=1
outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;boundary_applies_title_body_comments_descriptions_Knowledge=1
```

Immediately after that anchor, production enters the existing optional new-source branch:

```text
if (p.communitySourceHandoffNewSource) {
  short_community_request_reused_with_new_source=${sourceRootMode}
  derive_reaction_from_current_source_not_prior_answer=1
}
```

Therefore the frozen candidate insertion contract remains:

```text
existing current source/event provenance
→ exact six E6 lines
→ existing optional new-source guidance
```

No production candidate line is currently installed.

---

## 4. Current volatile Prompt classification seam

Exact production still classifies:

```text
short_community_
derive_reaction_from_current_source
```

through `promptChangeReason(...)` as:

```text
handoff/lineage
```

and `runtimeLineTier(...)` falls through to `promptChangeReason(...)` and returns:

```text
volatile
```

for recognized non-other prompt changes.

This is important because the frozen E6 lines all begin:

```text
short_community_b_
```

Canonical expectation:

```text
E6 line
→ existing short_community_ classifier
→ volatile runtime Prompt tier
```

The drift guard fails if this seam disappears.

---

## 5. Frozen candidate identity

Candidate line count:

```text
6
```

Frozen candidate SHA-256:

```text
3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc
```

The guard cross-checks:

```text
EXPOSURE_LINES
candidateContractHash(...)
preflight EXPECTED_CANDIDATE_HASH
host-adapter EXPECTED_CANDIDATE_HASH literal
```

Any mismatch blocks eval resumption.

---

## 6. Guard input boundary

Primary API:

```text
assessExposureAnchorAndContractDrift({
  productionSource,
  productionAuthority,
  hostAdapterSource,
})
```

Required inputs are intentionally externalized.

The guard does not silently assume that the source in `main` is deployed production.

The caller must supply the exact source materialized from the production authority being evaluated.

Missing input returns:

```text
HOLD_EXPOSURE_EVAL_GUARD_INPUT_REQUIRED
```

not PASS.

---

## 7. Frozen production authority gate

The currently prepared Exposure eval toolchain is bound to:

```text
version       = 0.70.1
releaseName   = Cold First-Turn Tail Attribution
releaseBranch = release-simcore
releaseCommit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

If production moves before the parked evaluation is resumed:

```text
PRODUCTION_AUTHORITY_DRIFT
→ BLOCK_EXPOSURE_EVAL_CONTRACT_DRIFT
```

This does not mean future production is wrong.

It means the old eval toolchain must be re-reviewed against the new production authority before reuse.

---

## 8. Production Prompt checks

The guard verifies the supplied production source for:

```text
v0.70.1 metadata at the frozen checkpoint
exact source-provenance anchor cardinality = 1
exact preceding provenance line cardinality = 1
preceding provenance < anchor < new-source branch < new-source guidance
short_community_ promptChangeReason classifier seam present
runtimeLineTier promptChangeReason fallback seam present
frozen E6 lines not already installed in production
```

Representative fail codes:

```text
PRODUCTION_VERSION_METADATA_DRIFT
PRODUCTION_ANCHOR_CARDINALITY_DRIFT
PRODUCTION_PRECEDING_PROVENANCE_DRIFT
PRODUCTION_ANCHOR_ORDER_DRIFT
PRODUCTION_PROMPT_CHANGE_REASON_CLASSIFIER_DRIFT
PRODUCTION_RUNTIME_LINE_TIER_DRIFT
CANDIDATE_ALREADY_PRESENT_IN_PRODUCTION
```

---

## 9. Execution-prep checks

The guard reuses the owning execution-prep object rather than duplicating host policy.

It verifies:

```text
insertionContract = AFTER_EXISTING_SOURCE_PROVENANCE_BEFORE_NEW_SOURCE_GUIDANCE
mutationScope = REQUEST_LOCAL_BEFORE_REQUEST_MESSAGE_ARRAY_ONLY
requestStage = BEFORE_REQUEST_PRE_REQUEST_TRIGGER_PRE_PROVIDER_REFORMAT
providerObservationScope = READ_ONLY_PROVIDER_REQUEST_BODY_HASH_AND_CANDIDATE_VISIBILITY
providerRequestMutationAuthorized = false
productionInstallAuthorized = false
```

Ownership rule:

```text
execution-prep owns declared eval mutation scope
host adapter owns actual request-local implementation mechanics
```

The guard deliberately does not require the adapter source file to duplicate the prep `mutationScope` literal.

---

## 10. Host-adapter source checks

The adapter source is checked for the contract it actually owns:

```text
adapter version
candidate hash
source-provenance anchor
exact six frozen candidate lines
request-stage receipt identity
```

Representative fail codes:

```text
HOST_ADAPTER_VERSION_DRIFT
HOST_ADAPTER_CANDIDATE_HASH_DRIFT
HOST_ADAPTER_ANCHOR_DRIFT
HOST_ADAPTER_REQUEST_STAGE_DRIFT
HOST_ADAPTER_CANDIDATE_LINE_DRIFT:<short-hash>
```

The adapter remains temporary eval-only tooling.

---

## 11. Guard dispositions

PASS:

```text
PASS_EXPOSURE_EVAL_CONTRACT_DRIFT_GUARD
readyToResumeTargetHostPreflight = true
```

Missing required materialization input:

```text
HOLD_EXPOSURE_EVAL_GUARD_INPUT_REQUIRED
readyToResumeTargetHostPreflight = false
```

Any contract mismatch:

```text
BLOCK_EXPOSURE_EVAL_CONTRACT_DRIFT
readyToResumeTargetHostPreflight = false
```

All dispositions preserve:

```text
runtimeMutationAuthorized = false
productionImplementationAuthorized = false
modelCallsExecuted = false
```

---

## 12. CLI boundary

The guard also exposes a request-free CLI path requiring:

```text
--production-source
--production-commit
--host-adapter-source
```

Optional authority fields may be supplied explicitly.

Exit behavior:

```text
0 = PASS
1 = contract drift BLOCK
2 = missing/invalid guard input or tool error
```

A report file may be written with `--report`.

The CLI does not fetch the network, invoke RisuAI, or call a model.

---

## 13. Regression coverage

Standalone regression covers:

```text
clean contract PASS
missing guard input HOLD
production authority moved
anchor missing
anchor duplicated
anchor ordering changed
promptChangeReason classifier changed
runtimeLineTier fallback changed
candidate already installed in production
adapter candidate hash changed
adapter anchor changed
adapter request stage changed
adapter candidate line changed
```

It also covers the CI mixed-path bug described below.

---

## 14. FIX: Exposure tooling misclassified as doc-only

The preceding result-ingest PR exposed this scope output:

```text
Exposure tooling .mjs files → no labels
SIMCORE doc → SIMCORE_DOC_ONLY
aggregate labels → SIMCORE_DOC_ONLY only
docOnly = true
```

That caused permanent SimCore PR CI to return:

```text
NOOP_SIMCORE_DOC_ONLY
```

even though executable Exposure tooling changed.

Root cause:

```text
classify.mjs
```

recognized only selected exact tooling files, `tooling/ci/*`, `test-*.mjs`, and `build-*.py`.

General Exposure eval tooling was not classified.

This was an evidence-infrastructure bug, not a production runtime bug.

---

## 15. Classifier repair

The classifier now narrowly recognizes:

```text
products/simcore/tooling/exposure-*.(mjs|js)
```

as:

```text
CI_SELF
HARNESS
```

This is intentionally scoped to the current Exposure tooling family instead of reclassifying every arbitrary file under `products/simcore/tooling/`.

Mixed paths now resolve conceptually as:

```text
Exposure executable tooling → CI_SELF + HARNESS
Exposure SIMCORE doc       → SIMCORE_DOC_ONLY
aggregate                  → CI_SELF + HARNESS + SIMCORE_DOC_ONLY
docOnly                    → false
```

Therefore executable Exposure changes cannot disappear behind a doc-only aggregate merely because a documentation file is also present.

---

## 16. Permanent batch-a regression registration

The drift-guard synthetic regression is registered in the existing SimCore test registry as:

```text
exposure-contract-drift-guard
```

with:

```text
coverage = EXECUTABLE
required = true
goldenGate = true
```

Its fixture is synthetic contract data only.

Important boundary:

```text
permanent regression tests guard logic
!=
permanent regression freezes actual deployed production at v0.70.1
```

The suite does not inspect the current production source passed to the ordinary SimCore runtime regression harness.

Actual production-authority drift is evaluated only when the Exposure guard is explicitly invoked with materialized production source before the parked eval resumes.

---

## 17. Current exact source re-read

During this transaction, exact current authority was re-read before design:

```text
main = 64e6c0d69dd09fb571f422208099656bc22f342e
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

Exact deployed source confirms:

```text
source-provenance anchor present
preceding provenance present
optional new-source guidance remains after anchor
short_community_ promptChangeReason classification remains present
runtimeLineTier fallback through promptChangeReason remains present
```

Exact main adapter/preflight/prep source confirms:

```text
candidate hash = 3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc
adapter version aligned
request stage aligned
prep insertion contract aligned
request-local mutation scope aligned
provider mutation remains unauthorized
production install remains unauthorized
```

No current contract drift was found by source inspection.

This is static source evidence only, not target-host evidence.

---

## 18. WATCH classifications

```text
WATCH · MODEL_SETTINGS_FINGERPRINT_REMAINS_BOUNDED_HOST_PROJECTION
WATCH · PROVIDER_BODY_EXACT_OCCURRENCE_MULTIPLICITY_REQUIRES_TARGET_HOST_EVIDENCE
WATCH · OUTPUT_LISTENER_CORRELATION_REQUIRES_TARGET_HOST_PREFLIGHT
```

These remain practical-host questions and are not converted into synthetic PASS claims.

---

## 19. DEFER classifications

```text
DEFER · TARGET_HOST_PREFLIGHT_EXECUTION
DEFER · M1_24_MODEL_GENERATIONS
DEFER · M2_72_MODEL_GENERATIONS
DEFER · SEMANTIC_BLIND_REVIEW_EVIDENCE
DEFER · PRODUCTION_IMPLEMENTATION_DECISION
```

User-requested practical testing remains parked.

---

## 20. Production boundary

No change to:

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
chat history
S7 / P13 / v0.70.3 scope
```

Production remains v0.70.1 at this checkpoint.

---

## 21. Classification summary

### FIX closed

```text
FIX · EXPOSURE_TOOLING_MISCLASSIFIED_AS_SIMCORE_DOC_ONLY
```

### Guard implemented

```text
EXPOSURE_ANCHOR_AND_CONTRACT_DRIFT_GUARD = IMPLEMENTED
```

### BLOCKER

```text
none for request-free tooling closure
```

### Practical blocker

```text
none claimed because target-host execution is intentionally parked
```

---

## 22. Current state

```text
EXPOSURE_DIRECT_B_ROOT_CONTRACT              = DESIGN FROZEN
EXPOSURE_SIX_LINE_CANDIDATE                  = FROZEN
EXPOSURE_MODEL_COMPLIANCE_PROTOCOL           = FROZEN
EXPOSURE_OFFLINE_HARNESS                     = IMPLEMENTED
EXPOSURE_EXECUTION_PREP                      = IMPLEMENTED
EXPOSURE_HOST_ADAPTER                        = IMPLEMENTED · NOT EXECUTED ON TARGET HOST
EXPOSURE_TARGET_HOST_PREFLIGHT               = IMPLEMENTED · NOT EXECUTED
EXPOSURE_CROSS_BOUNDARY_AUDIT                = PASS REQUEST-FREE
EXPOSURE_RESULT_INGEST_AND_SCORING           = IMPLEMENTED
EXPOSURE_ANCHOR_AND_CONTRACT_DRIFT_GUARD     = IMPLEMENTED
EXPOSURE_TOOLING_CI_CLASSIFICATION            = CI_SELF + HARNESS
TARGET_HOST_EXECUTION                        = PARKED
MODEL_CALLS_EXECUTED                         = 0
PRODUCTION_IMPLEMENTATION_AUTHORITY           = NONE
PRODUCTION_CHANGE                            = NONE
S7_CHANGE                                    = NONE
```

---

## 23. Next state

The planned request-free hardening sequence is now effectively at a terminal checkpoint.

Before practical evaluation is ever unparked:

```text
1. re-read then-current release-simcore
2. materialize exact deployed source
3. run EXPOSURE_ANCHOR_AND_CONTRACT_DRIFT_GUARD
4. require PASS
5. only then run target-host preflight
```

If the user continues to defer practical execution, no target-host receipt or model-compliance claim should be manufactured.

A separate future request-free transaction should be opened only if a new static anomaly, common-rule impact, or production-authority change creates a real reason for one.
