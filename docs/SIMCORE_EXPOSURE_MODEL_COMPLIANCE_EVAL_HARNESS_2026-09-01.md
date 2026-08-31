# SimCore Exposure Model Compliance Eval Harness — 2026-09-01

Date: 2026-09-01 KST

Status: **OFFLINE EVAL HARNESS COMPLETE · M1/M2 MANIFEST CONTRACT FROZEN · NO MODEL RUN EXECUTED · PRODUCTION / S7 UNCHANGED**

Classification: **EXPOSURE KNOWLEDGE · DIRECT B-ROOT · MODEL COMPLIANCE · PAIRED HARNESS · BLIND REVIEW PREPARATION**

Related authority/evidence:

```text
docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md
docs/SIMCORE_EXPOSURE_PROMPT_CONTRACT_OFFLINE_EVALUATOR_2026-09-01.md
docs/SIMCORE_EXPOSURE_SEMANTIC_ADVERSARIAL_FIXTURE_CORPUS_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_PROTOCOL_2026-09-01.md
```

Tooling added:

```text
products/simcore/tooling/exposure-model-compliance-eval-harness.mjs
products/simcore/tooling/exposure-model-compliance-eval-harness.test.mjs
```

This transaction does not execute a model and does not modify `release-simcore`, installed plugin/runtime bytes, Prompt bytes, request construction, persistent state, Community, Reaction, Structure, Evidence, Lineage, Handoff, S7, P13, or release identity.

---

## 1. Purpose

The frozen model-compliance protocol requires a paired comparison:

```text
B0 = exact production baseline
E6 = B0 + exactly the six frozen exposure lines
```

The harness operationalizes only the deterministic preparation layer required before a real host/model run.

It provides:

```text
fixture-to-pair manifest generation
M1/M2 expansion
candidate line/hash verification
fixture corpus fingerprinting
opaque X/Y condition assignment
counterbalanced execution ordering
synthetic scenario fingerprinting
host-capture placeholders
blind review packet generation
locked review-record schema
bounded result aggregation schema
```

It does not provide:

```text
model invocation
RisuAI host request construction
semantic grading by regex
production Prompt insertion
release mutation
```

Canonical boundary:

```text
EVAL HARNESS PREPARATION
!=
ACTUAL HOST REQUEST MATERIALIZATION
!=
MODEL COMPLIANCE EVIDENCE
```

---

## 2. Source ownership

The harness imports existing owners instead of duplicating them.

Candidate bytes owner:

```text
products/simcore/tooling/exposure-prompt-contract-offline-evaluator.mjs
→ EXPOSURE_LINES
```

Fixture owner:

```text
products/simcore/tooling/exposure-semantic-adversarial-fixture-corpus.mjs
→ EXPOSURE_SEMANTIC_CASES
```

Protocol owner:

```text
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_PROTOCOL_2026-09-01.md
```

The harness does not become a competing semantic truth owner.

---

## 3. Candidate hash discipline

The exact six ordered E6 lines are hashed as:

```text
SHA-256( six lines joined by "\n" )
```

Current frozen candidate hash:

```text
3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc
```

The helper rejects:

```text
line count != 6
duplicate candidate lines
candidate line without short_community_b_ prefix
```

Every E6 run carries the candidate hash.

Every B0 run carries:

```text
candidateOverlay = []
candidateLineCount = 0
scenario candidateContractHash = null
```

No results from a different E6 payload may be combined under the same candidate identity.

---

## 4. Fixture corpus fingerprint

The harness computes a deterministic SHA-256 over a stable-key JSON representation of the imported fixture corpus.

This fingerprint is evaluation identity only.

It does not make the harness the owner of fixture semantics.

If fixture bytes change later:

```text
fixture corpus hash changes
→ new evidence identity required
```

This prevents silent mixing of runs from different corpus revisions.

---

## 5. Stage expansion

### M1

```text
12 fixtures
× 1 paired trial
= 12 pairs
= 24 runs
```

### M2

```text
12 fixtures
× 3 paired trials
= 36 pairs
= 72 runs
```

M2 condition counts:

```text
B0 = 36 runs
E6 = 36 runs

E6 traps    = 7 × 3 = 21
E6 controls = 5 × 3 = 15
```

These counts match the frozen protocol.

---

## 6. Pair contract

Every pair contains exactly:

```text
one B0 run
one E6 run
one X label
one Y label
```

Pair identity:

```text
<stage>:<fixture_id>:T<trial_id>
```

The harness creates each condition from the same fixture source surfaces and prepared structural facts.

The only intended scenario-level condition delta is:

```text
B0 → zero exposure lines
E6 → exact six frozen exposure lines
```

Actual production/host request equality is not claimed until the target host materializes and fingerprints the real requests.

---

## 7. Opaque condition mapping

The harness assigns B0/E6 to opaque labels:

```text
X
Y
```

using deterministic SHA-256-derived mapping from:

```text
fixture_id + trial_id
```

This gives reproducible review packets without exposing actual condition identity.

Current M2 mapping distribution:

```text
E6 as X = 18 pairs
E6 as Y = 18 pairs
```

The mapping is deterministic so a regenerated manifest does not silently relabel prior evidence.

---

## 8. Execution ordering

Opaque X/Y execution order is also deterministically derived per pair.

Current M2 first-condition distribution:

```text
B0 first = 19 pairs
E6 first = 17 pairs
```

This prevents the harness from always executing B0 then E6.

The protocol allows counterbalanced or randomized ordering. This harness chooses deterministic counterbalancing for reproducibility.

---

## 9. Synthetic scenario fingerprint vs actual host request fingerprint

This distinction is mandatory.

The harness can fingerprint the offline scenario it owns:

```text
prompt structural facts
source broadcast
source Community
source Knowledge
reference context
current user input
oracle metadata
condition overlay
```

Field:

```text
syntheticScenarioFingerprint
```

But it cannot honestly claim the exact RisuAI/model request fingerprint before the target host materializes the request.

Therefore every unexecuted run starts with:

```text
materializationStatus = PENDING_HOST_MATERIALIZATION
actualHostRequestFingerprint = null
```

The integrity checker fails if a pre-host manifest pretends that a real host fingerprint already exists.

Canonical boundary:

```text
SYNTHETIC_SCENARIO_FINGERPRINT
!=
ACTUAL_HOST_REQUEST_FINGERPRINT
```

---

## 10. Host capture schema

Every run reserves fields for later host evidence:

```text
modelIdentifier
modelSettingsFingerprint
characterReferenceFingerprint
actualHostRequestFingerprint
promptChars
promptTokens
outputChars
outputTokens
requestPreparationMs
modelGenerationMs
endToEndMs
generatedOutput
outputStructuralStatus
```

Unavailable metrics begin as:

```text
NOT_OBSERVED
```

No latency/token value is invented.

No model identifier is guessed.

---

## 11. Blind review packet

`buildBlindReviewPacket()` removes actual condition identity from the reviewer surface.

Included:

```text
protocol identity
pair/fixture/trial identity
opaque X/Y label
fixture semantic oracle
source surfaces
current user request
generated output
structural status
blank review form
```

Excluded:

```text
conditionActualId
candidateContractHash
candidateOverlay
B0/E6 label
```

This satisfies the frozen condition-blinding contract while still allowing the reviewer to understand the fixture oracle.

---

## 12. Review lock contract

A review cannot be locked unless it contains exactly one valid primary disposition from:

```text
PASS_ALLOWED
FAIL_LEAK
FAIL_UNDERKNOWLEDGE
FAIL_ATTRIBUTION
FAIL_OVERCLAIM
FAIL_STRUCTURE
REVIEW_AMBIGUOUS
```

and all three qualitative dimensions are integers in:

```text
1..5
```

for:

```text
naturalness
reactivity
epistemicClarity
```

A non-empty rationale is mandatory.

This prevents incomplete review rows from silently entering aggregates.

---

## 13. Result aggregation boundary

`summarizeLockedReviews()` can count locked evidence by condition and report:

```text
run counts
trap/control counts
primary disposition counts
trap FAIL_LEAK count
control PASS_ALLOWED count
naturalness median
reactivity median
epistemic-clarity median
harness-invalid count
unresolved ambiguity count
```

It deliberately returns:

```text
finalDisposition = NOT_COMPUTED_UNTIL_COMPLETE_M2_AND_COMPARATIVE_REVIEW
```

The harness does not auto-promote E6 from a partial result set.

The frozen protocol's final decision table remains the authority for:

```text
PROMOTION_EVIDENCE_PASS
BLOCK_EXPOSURE_CANDIDATE_STILL_LEAKS
BLOCK_EXPOSURE_CANDIDATE_OVER_RESTRICTIVE
BLOCK_COMMUNITY_UTILITY_REGRESSION
REJECT_NO_INCREMENTAL_VALUE
HOLD_SEMANTIC_EVIDENCE_INCONCLUSIVE
BLOCK_EVAL_HARNESS_DRIFT
```

---

## 14. Harness integrity checks

`assertHarnessIntegrity()` verifies at least:

```text
candidate line count = 6
candidate hash matches current imported six lines
fixture corpus hash matches current imported corpus
M1/M2 expected pair/run counts
pair contains exactly B0 + E6
pair contains exactly X + Y
B0 overlay count = 0
E6 overlay count = 6
E6 candidate hash matches manifest hash
pre-host actual request fingerprint remains null
```

An integrity failure is harness evidence, not semantic model evidence.

---

## 15. Standalone regression

Author-time direct Node regression result:

```text
exposure-model-compliance-eval-harness: PASS (72 M2 runs, 36 pairs)
```

The local execution used the authored harness/test logic with the current six-line candidate bytes and a local mirror of the current 12-fixture corpus interface/inventory.

The mirror preserved:

```text
12 fixture ids
7 TRAP / 5 CONTROL split
current direct-B-root structural fact shape
source/claim/oracle fields consumed by the harness
```

This author-time result proves deterministic harness mechanics, not exact repository-byte execution against every fixture text byte.

Therefore the evidence layers remain separate:

```text
AUTHOR-TIME HARNESS REGRESSION PASS
!=
REPOSITORY PERMANENT CI
!=
TARGET CHECKOUT PRE-FLIGHT
!=
ACTUAL HOST MODEL RUN
!=
MODEL COMPLIANCE PASS
```

Before M1 execution, the exact repository checkout should run:

```text
node products/simcore/tooling/exposure-model-compliance-eval-harness.test.mjs
```

That target-checkout pre-flight is part of execution preparation, not claimed by this document.

---

## 16. Regression coverage

The authored standalone test covers:

```text
M1 fixture/pair/run counts
M2 fixture/pair/run counts
7/5 trap-control split
B0/E6 36/36 split
E6 21 trap outputs
E6 15 control outputs
candidate hash stability
fixture hash self-consistency
pair B0/E6 uniqueness
pair X/Y uniqueness
B0 zero overlay
E6 exact-six overlay
pre-host fingerprint null discipline
synthetic fingerprint presence
blind packet actual-condition exclusion
blind packet candidate metadata exclusion
valid review lock
invalid disposition rejection
invalid 1..5 score rejection
partial aggregate final-disposition hold
deterministic mapping regeneration
deterministic execution-order regeneration
```

---

## 17. What this harness intentionally does not do

It does not:

```text
call OpenAI or any model API
open RisuAI
materialize the exact deployed Prompt
rewrite a chat
install E6
change global plugin settings
write persistent audience state
grade semantic output through regex
make release decisions from partial evidence
```

This keeps analysis/eval preparation separate from mutation and target-host execution.

---

## 18. Real host boundary

The next true boundary is target-host request materialization.

Before an output becomes valid model-compliance evidence, the executor must fill and verify:

```text
then-current production authority
actual model identifier
model settings fingerprint
character/reference fingerprint
actual B0 request fingerprint
actual E6 request fingerprint
candidate line count/hash
pair equality except six-line overlay
```

If the host cannot isolate E6 request-locally without installing it globally:

```text
BLOCK · EVAL_HARNESS_CANNOT_ISOLATE_CANDIDATE
```

If then-current production has drifted materially from the frozen assumptions:

```text
BLOCK · EVAL_HARNESS_DRIFT
```

---

## 19. WATCH / DEFER / BLOCKER

### WATCH

`WATCH · AUTHOR_TIME_STANDALONE_USED_CORPUS_INTERFACE_MIRROR`

The author-time Node run verified harness mechanics against a mirror of the current corpus interface/inventory. Exact target-checkout pre-flight remains required before M1.

`WATCH · HOST_REQUEST_FINGERPRINT_PENDING`

The repository harness cannot invent the exact RisuAI/model request identity. That evidence belongs to the execution host.

`WATCH · MODEL_SERVICE_IDENTITY_MUST_BE_CAPTURED_AT_RUN_TIME`

Model/service identity may change after this harness merge.

### DEFER

```text
actual M1 model run
actual M2 model run
review adjudication
runtime implementation design
MULTI_B_SOURCE_EXPOSURE_WINDOW
A_SOURCE_EXPOSURE
INLINE_C_EXPOSURE
```

### BLOCKER

None for merging the offline harness.

Production implementation remains blocked pending actual model-compliance evidence.

---

## 20. S7 / production boundary

Unchanged:

```text
release-simcore = unchanged
installed plugin/runtime = unchanged
Prompt bytes = unchanged
persistent schema = unchanged
S7 P0→P12 = unchanged
P13 = NONE
v0.70.3 semantic expansion = NONE
```

The harness is tooling/evidence support only.

---

## 21. Next legitimate action

The next safe action after this harness is merged is:

```text
EXPOSURE_MODEL_COMPLIANCE_M1_EXECUTION_PREP
```

That transaction should freshly re-read production authority and determine whether the exact target host can materialize isolated B0/E6 request pairs without global installation.

If yes:

```text
run exact-checkout harness pre-flight
materialize M1 12 pairs / 24 runs
capture real request/model fingerprints
execute M1
blind review
```

If no:

```text
BLOCK · EVAL_HARNESS_CANNOT_ISOLATE_CANDIDATE
```

Do not jump directly to production implementation.

---

## 22. Final state

```text
EXPOSURE_IMPACT_SCOPE                    = COMPLETE
DIRECT_B_ROOT_EXPOSURE_CONTRACT          = FROZEN
OFFLINE_PROMPT_EVALUATOR                 = COMPLETE
SEMANTIC_ADVERSARIAL_CORPUS              = COMPLETE
MODEL_COMPLIANCE_EVAL_PROTOCOL           = FROZEN
MODEL_COMPLIANCE_EVAL_HARNESS            = COMPLETE
M1 MANIFEST SHAPE                         = 12 PAIRS / 24 RUNS
M2 MANIFEST SHAPE                         = 36 PAIRS / 72 RUNS
CANDIDATE E6 HASH                         = 3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc
MODEL CALLS EXECUTED                      = NO
MODEL COMPLIANCE PASS                     = NOT CLAIMED
PRODUCTION IMPLEMENTATION                 = NOT AUTHORIZED
RELEASE_SIMCORE_CHANGE                    = NONE
S7_CHANGE                                 = NONE
NEXT                                      = EXPOSURE_MODEL_COMPLIANCE_M1_EXECUTION_PREP
```
