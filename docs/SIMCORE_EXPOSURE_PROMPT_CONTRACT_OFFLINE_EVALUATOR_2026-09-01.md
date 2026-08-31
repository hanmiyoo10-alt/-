# SimCore Exposure Prompt Contract Offline Evaluator — 2026-09-01

Date: 2026-09-01 KST

Status: **OFFLINE STATIC CONTRACT EVALUATOR COMPLETE · STANDALONE REGRESSION PASS · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **EXPOSURE KNOWLEDGE · DIRECT B-ROOT · PROMPT CONTRACT · STATIC EVALUATION**

Related frozen design:

```text
docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md
```

Tooling added:

```text
products/simcore/tooling/exposure-prompt-contract-offline-evaluator.mjs
products/simcore/tooling/exposure-prompt-contract-offline-evaluator.test.mjs
```

This transaction does not modify `release-simcore`, the installed SimCore runtime, request construction, prompt bytes, persistent state, S7, or any release identity.

---

## 1. Purpose

The frozen design selected one first implementable exposure subset:

```text
DIRECT_B_ROOT_MODE_C_EXPOSURE_RESTRAINT
```

The next safe step is not production insertion. It is to prove that the design can be represented as a deterministic Prompt contract without widening its entry gate.

The evaluator therefore answers only:

```text
Given already-prepared Prompt/Handoff facts,
would this exact direct-B-root contract emit its six candidate lines?
```

It does not answer whether the model follows those semantic lines in a real response. That remains a later semantic fixture / real-chat question.

---

## 2. Authority inputs re-confirmed

The deployed v0.70.1 Lineage representation normalizes:

```text
rootMode   = A | B | INLINE_C
parentMode = A | B | C
```

and a direct C following B receives depth `1`.

The deployed short-C Prompt path already consumes:

```text
communitySourceHandoffEligible
communitySourceHandoffRootMode
communitySourceHandoffRootIndex
communitySourceHandoffParentMode
communitySourceHandoffParentIndex
communitySourceHandoffDepth
```

No new source resolver is required for the offline contract.

The deployed prompt-change classifier already treats `short_community_` text as the existing handoff/lineage volatile family. The frozen six lines deliberately retain that prefix.

---

## 3. Evaluator contract

Entry is accepted only when:

```text
mode == C
communitySourceHandoffEligible == true
communitySourceHandoffRootMode == B
communitySourceHandoffParentMode == B
communitySourceHandoffRootIndex >= 0
communitySourceHandoffParentIndex >= 0
communitySourceHandoffParentIndex == communitySourceHandoffRootIndex
communitySourceHandoffDepth == 1
```

Eligible result:

```text
status = ELIGIBLE_CONTRACT
reason = DIRECT_B_ROOT_SOURCE_ALIGNED
exposureLineCount = 6
applied = false
runtimeMutationAuthorized = false
```

The evaluator never parses source prose, Community blocks, Knowledge blocks, chat history, or reference data.

---

## 4. Frozen six-line payload

The evaluator emits exactly the six design-frozen candidate lines:

```text
short_community_b_exposure_scope=direct_root_broadcast_turn
short_community_b_audience_exposure_basis=current_source_visible_broadcast_prose+current_user_explicit_public_disclosure;mere_mention_or_reaction_request_does_not_publish_hidden_fact=1
short_community_b_source_community_role=derived_social_context_not_event_fact_authority;rumor_opinion_may_recur_only_as_attributed_rumor_opinion_or_reaction=1
short_community_b_source_knowledge_role=continuity_context_not_audience_exposure_authority;reference_context_alone_not_public_knowledge_certificate=1
short_community_b_unknown_exposure=do_not_assert_as_known_public_fact;event_scope_expansion_does_not_expand_audience_exposure=1
short_community_b_visible_cue_inference=allowed_as_inference_opinion_joke;hidden_private_state_not_confirmed_without_exposure=1
```

The regression requires all six lines to be unique and to retain the `short_community_b_` prefix.

---

## 5. Non-entry and defer disposition

The offline evaluator distinguishes ordinary non-entry from shapes that require a broader future design.

### INELIGIBLE

Examples:

```text
mode != C
source handoff not eligible
rootMode != B
parentMode != B
```

These emit zero new lines.

### FALLBACK

Invalid structural indices:

```text
rootIndex < 0
parentIndex < 0
```

These emit zero new lines.

### DEFERRED

Important structurally valid but out-of-scope shapes:

```text
parentIndex != rootIndex
→ MULTI_B_SOURCE_EXPOSURE_WINDOW_REQUIRED

depth != 1
→ DIRECT_B_ROOT_DEPTH_NOT_ONE
```

These emit zero new lines.

This prevents an offline tool from silently broadening the frozen design.

---

## 6. Prompt ordering proof surface

The helper `composeHypotheticalShortCommunityPrompt()` exists only for offline regression inspection.

It models:

```text
existing source/event provenance
→ six exposure lines
→ existing new-source guidance
```

The regression proves the input arrays are not mutated and the six lines remain exactly between those two existing groups.

It is not a production Prompt serializer and is not imported by runtime.

---

## 7. Existing prompt-tier compatibility probe

The helper `classifyExposureContractLineForExistingPromptTier()` models only the already-existing relevant classifier seam:

```text
contains short_community_
→ VOLATILE_EXISTING_SHORT_COMMUNITY_CLASSIFIER
```

All six frozen lines pass that probe.

This is evidence that the chosen naming shape can reuse the current volatile conditional family if later implementation is authorized.

It does **not** claim that production was modified, and it is not a generic replacement for `runtimeLineTier()` / `promptChangeReason()`.

---

## 8. Standalone regression matrix

The authored test covers:

```text
1. direct B-root eligible positive control
2. exactly six unique frozen lines
3. all six lines retain short_community_b_ prefix
4. all six lines classify through existing short_community_ volatile seam
5. provenance → exposure → new-source ordering
6. fixture immutability
7. line-array immutability
8. Mode A negative
9. current B_END negative
10. handoff-ineligible negative
11. rootMode A negative
12. rootMode INLINE_C negative
13. parentMode C negative
14. invalid root index fallback
15. invalid parent index fallback
16. multi-B parent/root mismatch defer
17. depth>1 defer
18. deferred composition emits no exposure lines
19. unrelated prompt line negative tier control
```

Standalone execution result:

```text
exposure-prompt-contract-offline-evaluator: PASS
```

This result was produced by direct Node execution of the authored `.test.mjs` against the authored evaluator.

---

## 9. Evidence boundaries

Keep these proof layers separate:

```text
standalone Node regression
!=
repository permanent CI
!=
production runtime behavior
!=
real semantic model compliance
```

The standalone test proves deterministic offline contract behavior only.

Repository `Verify` / `Required` prove the PR remains acceptable under the repository's permanent SimCore gates. They do not imply that permanent CI automatically discovers this standalone `.test.mjs` unless the CI itself explicitly does so.

No claim is made that the evaluator test is part of the permanent auto-discovered suite.

---

## 10. No runtime authority

The evaluator explicitly reports:

```text
executionMode = OFFLINE_CONTRACT_ONLY
applied = false
runtimeMutationAuthorized = false
```

It has no host, storage, network, timer, request, output, or plugin call surface.

It does not:

```text
modify Prompt
modify Lineage/Handoff/Evidence
parse model output
validate semantic exposure
write persistent state
mutate chat history
change Community / Reaction / Structure
create a new exposure owner
```

---

## 11. Findings

### PASS

```text
DIRECT_B_ROOT_ENTRY_GATE_REPRESENTABLE = YES
EXACT_SIX_LINE_PAYLOAD_REPRESENTABLE = YES
ORDERING_CONTRACT_REPRESENTABLE = YES
EXISTING_VOLATILE_PREFIX_COMPATIBLE = YES
MULTI_B_DEFER_PRESERVED = YES
INPUT_MUTATION = NONE
```

### WATCH

`WATCH · OFFLINE_FACT_SHAPE_MUST_BE_RECHECKED_BEFORE_RUNTIME_IMPLEMENTATION`

The evaluator mirrors currently observed v0.70.1 prepared facts. Before any future runtime implementation, the then-current deployed Prompt/Handoff symbols must be re-read.

`WATCH · SEMANTIC_COMPLIANCE_NOT_PROVEN_BY_STATIC_EVALUATOR`

A correct six-line payload does not prove that the main model will always respect Knowledge/public boundaries. Adversarial semantic fixtures remain necessary before any production release decision.

### DEFER

```text
MULTI_B_SOURCE_EXPOSURE_WINDOW
A_SOURCE_EXPOSURE
INLINE_C_EXPOSURE
private-state generic schema
channel reachability / propagation
persistent audience memory
semantic post-output fact checker
```

### BLOCKER

None for continuing the offline Exposure design/evidence line.

Production implementation remains unauthorized.

---

## 12. S7 / production boundary

Unchanged:

```text
release-simcore = v0.70.1 authority unchanged
S7 = frozen P0→P12 v0.70.3 convergence
P13 = NONE
Exposure runtime delta = NONE
persistent schema delta = NONE
request/history mutation = NONE
```

---

## 13. Next legitimate action

The static Prompt contract is now mechanically representable.

The next safe evidence step is:

```text
EXPOSURE_SEMANTIC_ADVERSARIAL_FIXTURE_CORPUS
```

That corpus should test at least:

```text
Knowledge-only hidden fact leak
prior Community rumor promotion
reference/world omniscience leak
visible broadcast fact positive control
visible-cue inference positive control
explicit current-user public disclosure positive control
mere hidden-fact mention does not publish control
history/comparison expands event scope but not exposure control
```

The corpus should remain offline/evidence-only. It must not authorize production Prompt insertion by itself.

---

## 14. Final state

```text
EXPOSURE_IMPACT_SCOPE                         = COMPLETE
DIRECT_B_ROOT_EXPOSURE_CONTRACT               = FROZEN
OFFLINE_PROMPT_CONTRACT_EVALUATOR              = COMPLETE
STANDALONE_REGRESSION                          = PASS
FROZEN_EXPOSURE_LINES                          = 6
DIRECT_B_ROOT_ENTRY_GATE                       = PROVEN_DETERMINISTIC_OFFLINE
MULTI_B_PARENT_ROOT_MISMATCH                   = DEFERRED
EXISTING_SHORT_COMMUNITY_VOLATILE_SEAM         = COMPATIBLE_OFFLINE
RUNTIME_IMPLEMENTATION                         = NOT AUTHORIZED
PRODUCTION_CHANGE                              = NONE
S7_CHANGE                                      = NONE
NEXT                                           = EXPOSURE_SEMANTIC_ADVERSARIAL_FIXTURE_CORPUS
```
