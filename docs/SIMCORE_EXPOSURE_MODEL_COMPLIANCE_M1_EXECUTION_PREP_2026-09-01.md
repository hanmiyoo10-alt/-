# SimCore Exposure Model Compliance M1 Execution Prep — 2026-09-01

Date: 2026-09-01 KST

Status: **M1 EXECUTION PREP COMPLETE · HOST CAPABILITY GATE FROZEN · CURRENT DISPOSITION HOLD_HOST_PROBE_REQUIRED · NO MODEL RUN EXECUTED · PRODUCTION / S7 UNCHANGED**

Classification: **EXPOSURE KNOWLEDGE · DIRECT B-ROOT · MODEL COMPLIANCE · HOST HANDOFF PREP · NO PRODUCTION IMPLEMENTATION AUTHORITY**

Related authority/evidence:

```text
docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md
docs/SIMCORE_EXPOSURE_PROMPT_CONTRACT_OFFLINE_EVALUATOR_2026-09-01.md
docs/SIMCORE_EXPOSURE_SEMANTIC_ADVERSARIAL_FIXTURE_CORPUS_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_PROTOCOL_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_HARNESS_2026-09-01.md
```

Tooling added by this transaction:

```text
products/simcore/tooling/exposure-model-compliance-m1-execution-prep.mjs
products/simcore/tooling/exposure-model-compliance-m1-execution-prep.test.mjs
```

This transaction does not modify `release-simcore`, installed SimCore bytes, Prompt bytes, request history, persistent semantic state, S7, P13, or v0.70.3 scope.

---

## 1. Purpose

The previous harness can deterministically create the M1 plan:

```text
12 fixtures
× 2 conditions [B0, E6]
× 1 trial
= 12 pairs / 24 runs
```

But a repository manifest is not yet a target-host run.

The M1 preparation question is:

```text
Can the current target RisuAI host apply E6 only to the intended eval request,
leave B0 byte-equivalent at the same request-transform stage,
capture comparable request/model/output evidence,
and do so without changing production SimCore or persistent prompt state?
```

The prep layer answers only whether the required host capabilities have been explicitly proven.

It does not execute the 24 model generations.

Canonical boundary:

```text
UPSTREAM API SUPPORT
!=
TARGET HOST CAPABILITY ATTESTATION
!=
M1 MODEL EVIDENCE
```

---

## 2. Production authority fresh-check

Fresh branch read at prep time:

```text
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
version         = 0.70.1
release name    = Cold First-Turn Tail Attribution
```

`release-simcore` remains deployed runtime authority.

`main` remains design/evidence/tooling authority.

No release byte changes are made here.

---

## 3. Fresh upstream RisuAI host-surface check

Fresh upstream source inspected:

```text
repo: kwaroran/Risuai
main: ffabb06a386f1aee13217e5ca3c4268a35edb421
```

Current public Plugin API v3 documentation/types establish:

```text
ReplacerType = beforeRequest | afterRequest
beforeRequest receives/modifies final OpenAI-format message arrays before sending to the AI
plugin permission set includes replacer
runtime information is queryable
plugin unload/cleanup APIs exist
```

The current public RisuAI issue #1539 also describes the existing `beforeRequest` hook as operating on the already-flattened final message list. The issue requests an earlier semantic prompt-template hook because that earlier typed-card surface does not currently exist.

That missing earlier hook is **not** a blocker for this narrow E6 candidate because the frozen E6 design already targets the final SimCore runtime Prompt block and requires insertion after existing source/event provenance inside that block.

However, upstream support proves only that a plausible host adapter surface exists.

It does not prove the target installation's exact plugin order, permissions, SimCore prompt-block visibility, request capture, or isolation behavior.

---

## 4. Preferred M1 host adapter candidate

The prep tooling freezes one preferred adapter shape:

```text
EVAL_ONLY_API_V3_BEFORE_REQUEST_REPLACER
```

Properties:

```text
authority class  = TEMPORARY_EVAL_HOST_ADAPTER_ONLY
mutation scope   = REQUEST_LOCAL_FINAL_MESSAGE_ARRAY_ONLY
persistence      = NONE
permission       = replacer
B0 behavior      = identity return
E6 behavior      = exact frozen six-line overlay only
production install authority = false
```

This is an evaluation-tooling candidate, not a SimCore runtime implementation.

The adapter must be removable/unloadable after evidence collection.

---

## 5. Why the adapter must run after SimCore Prompt assembly

The E6 contract is not six arbitrary new system messages.

The frozen insertion contract is:

```text
existing source/event provenance
→ E6 six exposure lines
→ existing new-source guidance, when present
```

Therefore an eval adapter must observe the already-built SimCore runtime Prompt block and verify the exact anchor equivalent to:

```text
outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;...
```

It must then insert the exact six frozen lines once and only once.

If the adapter runs before SimCore, cannot see the block, cannot identify the anchor, or would have to guess using unrelated message content:

```text
BLOCKED_REQUIRED_HOST_CAPABILITY_ABSENT
```

Do not silently move the candidate to another Prompt location merely to make testing easier.

---

## 6. Required target-host capabilities

The prep checker requires explicit TRUE evidence for all 15 capabilities:

```text
apiV3BeforeRequestReplacerAvailable
requestLocalOverlayCanBeLimitedToEvalScope
simcorePromptBlockObservableAtReplacerStage
simcorePromptInsertionAnchorVerifiable
replacerRunsAfterSimCorePromptAssembly
conditionSwitchDoesNotAlterScenarioPrompt
b0ReturnsMessagesByteEquivalentAtReplacerStage
e6AddsExactSixLinesOnce
finalFlattenedMessagesCanBeFingerprintCaptured
modelIdentifierCanBeCaptured
modelSettingsCanBeFingerprintCaptured
generatedOutputCanBeCaptured
freshIsolatedFixtureStatePerRun
activeReplacerSetCanBeFrozenOrRecorded
evalAdapterCanBeUnloadedAfterRun
```

A repository inference or upstream source statement is not enough to set a target-host capability TRUE.

Target-host evidence must establish it in the actual evaluation environment.

---

## 7. Forbidden host effects

All five forbidden effects must be explicitly FALSE:

```text
productionSimCoreBytesMustChange
savedPromptPresetMustChange
chatHistoryMustBeRewrittenForCondition
persistentSemanticStateMustBeAdded
globalCandidateEffectCannotBeRestrictedToEvalScope
```

If any is TRUE:

```text
BLOCKED_FORBIDDEN_HOST_EFFECT
```

This prevents a model evaluation from quietly turning into a production installation, persistent preset edit, history rewrite, or new semantic-state system.

---

## 8. Three readiness states

### `HOLD_HOST_PROBE_REQUIRED`

Default current disposition.

Used when required target-host facts remain UNKNOWN.

This is the current state after repository/upstream preparation because no live target-host capability probe has been captured in this transaction.

### `BLOCKED_REQUIRED_HOST_CAPABILITY_ABSENT`

Used when the real host proves one or more required capabilities are unavailable.

Example:

```text
replacer does not run after SimCore
or
exact SimCore insertion anchor cannot be observed
```

### `BLOCKED_FORBIDDEN_HOST_EFFECT`

Used when M1 would require a prohibited persistent/global mutation.

### `READY_FOR_M1_HOST_EXECUTION`

Reachable only when all 15 required capabilities are explicitly TRUE and all 5 forbidden effects explicitly FALSE.

Even this state authorizes only the separately controlled M1 evaluation run.

It does not authorize production implementation.

---

## 9. M1 execution sheet

The prep tooling imports the already-frozen harness and produces exactly:

```text
12 pairs
24 execution rows
12 B0
12 E6
```

Each operator row contains:

```text
runId
pairId
executionPosition
fixtureId
fixtureKind
attackClass
trialId
opaque X/Y condition
operator-only actual B0/E6 condition
synthetic scenario fingerprint
candidate line count/hash
host capture placeholders
```

E6 rows contain:

```text
candidateLineCount = 6
candidateContractHash = frozen E6 hash
```

B0 rows contain:

```text
candidateLineCount = 0
candidateContractHash = null
```

No host request or output evidence is pre-filled.

---

## 10. Host capture fields remain empty by construction

Before a real host run every row remains:

```text
materializationStatus          = PENDING_HOST_MATERIALIZATION
flattenedMessageFingerprint    = null
actualHostRequestFingerprint   = null
modelIdentifier                = null
modelSettingsFingerprint       = null
characterReferenceFingerprint  = null
generatedOutput                = null
```

Accounting fields remain:

```text
NOT_OBSERVED
```

until the target host actually exposes them.

This prevents repository tooling from fabricating runtime evidence.

---

## 11. Flattened-message fingerprint versus provider-body evidence

The preferred adapter can fingerprint the final message array it returns from `beforeRequest`.

This is useful because the upstream contract defines that surface as the message array immediately before AI sending.

The prep schema nevertheless keeps two fields:

```text
flattenedMessageFingerprint
actualHostRequestFingerprint
```

Reason:

```text
message-array equality evidence
!=
provider-specific serialized HTTP-body evidence
```

For M1, the first requirement is to prove the B0/E6 final flattened message arrays are comparable except for E6.

Provider-body/fetch-log capture may be added when reliably available, but must not be invented when unavailable.

Use explicit `NOT_OBSERVED` / null instead of guessing.

---

## 12. Condition control must be out-of-band

The actual B0/E6 condition must not be encoded by adding a visible marker into the model scenario.

Forbidden shortcut:

```text
add "E6_TEST" to user/system Prompt
then switch behavior based on that text
```

That would violate the paired-request contract because the scenario itself changes.

Preferred condition control is eval-adapter-local ephemeral state or another out-of-band operator control that does not become model context.

The operator may know actual B0/E6 identity.

The semantic reviewer must still receive only X/Y blind packets from the existing harness.

---

## 13. B0 identity requirement

A B0 adapter callback must behave as an identity transform at the evaluated request stage.

Required target-host evidence:

```text
input flattened message fingerprint
==
returned B0 flattened message fingerprint
```

No helper header, sentinel, blank message, reordered item, or metadata-only message may be introduced merely because the eval adapter is loaded.

If B0 changes the request:

```text
HARNESS_INVALID
```

---

## 14. E6 exactness requirement

For E6, target-host preflight must prove:

```text
candidate line count = 6
candidate ordered hash = 3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc
candidate inserted exactly once
all six lines share the frozen insertion point
no existing Prompt line deleted/reordered/rewritten
```

Any variant is a different candidate and cannot be merged into E6 evidence.

---

## 15. Active replacer-set control

`beforeRequest` is a shared host extension lane.

M1 must therefore record or freeze the active replacer/plugin set sufficiently to prevent condition drift.

At minimum:

```text
same SimCore build
same eval adapter build
same other active plugins/replacers
same order where order affects returned messages
```

If the active set changes between B0/E6 pair members:

```text
HARNESS_INVALID
```

---

## 16. Fresh-state requirement

Each M1 run must begin from independent fixture state.

Forbidden contamination remains:

```text
B0 output → E6 history
E6 output → B0 history
fixture N output → fixture N+1 history
review feedback → later prompt
```

A dedicated eval chat may be reused only if the host adapter can provably reconstruct the exact independent fixture state without lossy history rewriting.

If that cannot be proven, use fresh isolated chats/sessions per run.

---

## 17. Current static prep result

The prep module's default attestation contains only UNKNOWN values.

Therefore the authoritative current repository disposition is:

```text
HOLD_HOST_PROBE_REQUIRED
```

This is intentional.

Fresh upstream evidence establishes that a plausible API v3 surface exists, but target-host facts have not yet been observed.

No model call is claimed.

No 24-run result exists yet.

---

## 18. Standalone deterministic regression

Author-time regression for the new prep layer covers:

```text
blank attestation → HOLD
explicit missing required capability → BLOCK
explicit forbidden persistent effect → BLOCK
complete clean attestation → READY
M1 execution sheet = 12 pairs / 24 runs
B0 = 12 rows / zero candidate lines
E6 = 12 rows / exact six-line candidate hash
all host materialization/fingerprint/output fields start empty
fabricated pre-materialized row is rejected by prep integrity checker
```

Expected standalone output:

```text
exposure-model-compliance-m1-execution-prep: PASS (24 runs, 12 pairs)
```

As with prior tooling, standalone regression and repository permanent CI are separate evidence dimensions.

---

## 19. Minimal future physical/host probe

The next target-host transaction should avoid asking the user to manually reconstruct 24 requests.

Preferred order:

```text
1. build a temporary eval-only host adapter
2. load it in an isolated evaluation scope
3. capture RisuAI runtime/API identity
4. verify replacer permission
5. verify adapter sees the already-built SimCore runtime block
6. verify exact insertion anchor
7. dry-check B0 identity and E6 exact-six overlay on one bounded probe pair
8. record flattened message fingerprints
9. verify adapter unload/cleanup
10. only then declare M1 execution READY
```

If these checks pass, the existing 24-row execution sheet can drive M1 without hand-authoring the scenarios.

---

## 20. Why no eval adapter is implemented in this transaction

This transaction is execution preparation, not host mutation.

Implementing a temporary target-host adapter requires a separate decision about:

```text
exact API v3 registration code
permission request behavior
condition arming UI/state
SimCore block/anchor matcher
request fingerprint representation
plugin-order verification
cleanup/unload behavior
capture export format
```

Those details should be frozen and tested as their own bounded tooling transaction before the user is asked to load anything into RisuAI.

This follows the repository analysis-before-mutation discipline.

---

## 21. WATCH / DEFER / BLOCKER

### WATCH

```text
WATCH · TARGET_HOST_REPLACER_ORDER_UNVERIFIED
WATCH · TARGET_HOST_SIMCORE_BLOCK_VISIBILITY_UNVERIFIED
WATCH · TARGET_HOST_REQUEST_FINGERPRINT_CAPTURE_UNVERIFIED
WATCH · TARGET_HOST_MODEL_IDENTITY_CAPTURE_UNVERIFIED
WATCH · REPLACER_PERMISSION_AND_ACTIVE_SET_DRIFT
```

### DEFER

```text
DEFER · PROVIDER_BODY_INTERCEPTOR_EVIDENCE_UNLESS_NEEDED
DEFER · FETCH_LOG_EVIDENCE_UNLESS_RELIABLY_AVAILABLE
DEFER · M2_EXECUTION
DEFER · DIRECT_B_ROOT_RUNTIME_IMPLEMENTATION_DESIGN
```

### BLOCKER

```text
BLOCKER · M1_MODEL_EXECUTION_REQUIRES_TARGET_HOST_CAPABILITY_PASS
```

This blocker applies only to starting the real model run.

It does not block further eval-tooling work.

---

## 22. Frozen next action

The next safe transaction is:

```text
EXPOSURE_MODEL_COMPLIANCE_M1_HOST_ADAPTER
```

Its job is to implement/test the temporary eval-only API v3 `beforeRequest` adapter and produce a minimal target-host preflight package.

It must not modify production SimCore or saved Prompt presets.

Only after target-host preflight passes may the 24-generation M1 run begin.

---

## 23. Final state

```text
EXPOSURE_IMPACT_SCOPE                    = COMPLETE
DIRECT_B_ROOT_EXPOSURE_CONTRACT          = FROZEN
OFFLINE_PROMPT_EVALUATOR                 = COMPLETE
SEMANTIC_ADVERSARIAL_CORPUS              = COMPLETE
MODEL_COMPLIANCE_EVAL_PROTOCOL           = FROZEN
MODEL_COMPLIANCE_EVAL_HARNESS            = COMPLETE
M1_EXECUTION_PREP                        = COMPLETE
TARGET_HOST_CAPABILITY                   = UNVERIFIED
CURRENT_M1_DISPOSITION                   = HOLD_HOST_PROBE_REQUIRED
MODEL_COMPLIANCE_RUN                     = NOT EXECUTED
PRODUCTION_IMPLEMENTATION                = NOT AUTHORIZED
RELEASE_SIMCORE_CHANGE                   = NONE
PROMPT_BYTE_CHANGE                       = NONE
PERSISTENT_SCHEMA_CHANGE                 = NONE
S7_CHANGE                                = NONE
NEXT                                     = EXPOSURE_MODEL_COMPLIANCE_M1_HOST_ADAPTER
```
