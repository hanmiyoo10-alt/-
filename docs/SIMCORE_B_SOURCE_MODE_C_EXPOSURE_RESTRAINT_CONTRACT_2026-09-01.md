# SimCore B-Source Mode C Exposure Restraint Contract — 2026-09-01

Date: 2026-09-01 KST

Status: **DESIGN FROZEN · DIRECT B-ROOT SUBSET ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **EXPOSURE KNOWLEDGE · COMMUNITY CORRECTNESS · PROMPT RESTRAINT · SOURCE / AUDIENCE AUTHORITY SEPARATION**

Working identifier:

```text
B_SOURCE_MODE_C_EXPOSURE_RESTRAINT
```

First implementable subset frozen by this contract:

```text
DIRECT_B_ROOT_MODE_C_EXPOSURE_RESTRAINT
```

This document freezes the first bounded contract after:

```text
docs/SIMCORE_EXPOSURE_KNOWLEDGE_IMPACT_SCOPE_2026-09-01.md
```

It does not modify the deployed SimCore runtime, `release-simcore`, request construction, prompt bytes, persistent state, Evidence, Lineage, Handoff, Community, Reaction, Structure, S7, or any release identity.

---

## 1. Authority and current production

Design inputs:

- `docs/SIMCORE_GUIDELINES.md`
- `docs/REPOSITORY_COMMON_RULES.md`
- `docs/SIMCORE_EXPOSURE_KNOWLEDGE_IMPACT_SCOPE_2026-09-01.md`
- `docs/SIMCORE_LIGHTBOARD_MINIBOARD_DESIGN_CANDIDATE_SHORTLIST_2026-09-01.md`
- `docs/SIMCORE_LIGHTBOARD_MINIBOARD_TOTAL_SYNTHESIS_2026-09-01.md`
- exact deployed runtime on `release-simcore`

Production authority at design time:

```text
version         = 0.70.1
release name    = Cold First-Turn Tail Attribution
release branch  = release-simcore
release commit  = 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

`main` remains design/evidence/roadmap authority only.

---

## 2. Product invariant

The existing SimCore guideline already defines:

```text
<COMMUNITY> may reference EXPOSED information only.
```

and rejects leakage of:

```text
unbroadcast information
hidden production/state information
internal reasoning
future knowledge
private/unexposed state
```

The design therefore does not invent a new policy.

It makes one narrow runtime-shaped distinction explicit:

```text
CURRENT SOURCE AUTHORITY
!=
CURRENT AUDIENCE KNOWLEDGE AUTHORITY
```

A fact may be true, current, source-supported, and still not be something the Community audience can know as established public fact.

---

## 3. Exact production findings re-read before freeze

### 3.1 Existing short-C source policy

The deployed Prompt conditional already activates when:

```text
mode = C
AND
communitySourceHandoffEligible = true
```

and serializes current-lineage/source facts including:

```text
short_community_request_context_is_current_lineage=1
short_community_source_selector=current_lineage_root_turn
short_community_source_root_mode=...
short_community_source_root_index=...
short_community_source_is_authoritative=1
current_root_evidence=...
current_source_evidence=...
event_fact_precedence=...
do_not_substitute_prior_similar_source_or_prior_community_answer=1
source_event_identity_and_facts=current_root_first;...
abstract_generalization_from_current_root_allowed=1;...
specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support;...
outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;...
```

These lines are event/source provenance policy.

They are not an audience-exposure proof.

### 3.2 Lineage B roots persist across a B episode

The deployed Lineage logic keeps the same B root across a continuing B episode.

Conceptually:

```text
B_START @10
→ rootIndex = 10

B_CONTINUE @12
→ rootIndex remains 10
→ parentIndex = 12

B_END @14
→ rootIndex remains 10
→ parentIndex = 14
```

A later Mode C may therefore have:

```text
rootMode = B
rootIndex = 10
parentMode = B
parentIndex = 14
```

### 3.3 Evidence source assistant is root-local, not latest-B-turn-local

The deployed Evidence mapper resolves its source assistant by scanning from:

```text
rootIndex + 1
```

to the current send boundary and selecting the **first assistant message after the root**.

Therefore for a multi-turn B episode:

```text
root B_START @10
assistant @11
B_CONTINUE @12
assistant @13
B_END @14
assistant @15
C @16
```

Evidence's current root/source pair is structurally aligned to:

```text
root user      = @10
source assistant = @11
```

not automatically to the later B_END assistant @15.

This is correct for the existing root/source contract. It means only that a broad B-root exposure design must not pretend that the Evidence source assistant is always the latest broadcast turn.

Frozen conclusion:

```text
ROOT_MODE_B
alone
IS NOT SUFFICIENT
for the first exposure restraint.
```

---

## 4. Refinement from impact scope

The impact scope selected:

```text
B_SOURCE_MODE_C_EXPOSURE_RESTRAINT
```

as the first design lane.

Fresh exact-source review narrows the first implementable subset to:

```text
DIRECT_B_ROOT_MODE_C_EXPOSURE_RESTRAINT
```

This is not a reversal of the impact scope.

It is the required RCR-D07 refinement after re-reading the exact affected source symbols.

The broader B-source problem remains valid, but a multi-B episode requires a later source-window design rather than pretending the root-local Evidence source represents the full episode.

---

## 5. Exact entry contract

The first restraint is eligible only when all conditions are true:

```text
mode == C
communitySourceHandoffEligible == true
communitySourceHandoffRootMode == B
communitySourceHandoffParentMode == B
communitySourceHandoffRootIndex >= 0
communitySourceHandoffParentIndex == communitySourceHandoffRootIndex
communitySourceHandoffDepth == 1
```

Interpretation:

```text
short eligible C
→ directly follows the B turn that created the current B root
→ the root-local source assistant and the current B parent are the same source turn
```

This keeps the first exposure basis aligned with the source location already owned by current Lineage/Handoff/Evidence contracts.

### Fail-closed rule

If any entry fact is missing, inconsistent, or does not match:

```text
DO NOT inject this new B-specific restraint.
```

This means only:

```text
FIRST BOUNDED CONTRACT NOT APPLICABLE
```

It does **not** mean hidden facts become authorized for Community use. The constitutional exposed-only rule remains binding.

---

## 6. Explicit non-entry cases

The new first-slice restraint must not activate for:

```text
A request
B_START / B_CONTINUE / B_END current request
ordinary long C
recurrence-owned C where existing source handoff is ineligible
unseeded short C
rootMode A
rootMode INLINE_C
rootMode B with parentMode C
rootMode B with parentIndex != rootIndex
rootMode B with depth != 1
invalid / unknown root or parent index
```

The particularly important defer is:

```text
rootMode B
AND
parentIndex != rootIndex
```

because that shape represents a later B turn inside a root-persistent B episode or another non-direct-root path.

Classification:

```text
DEFER · MULTI_B_SOURCE_EXPOSURE_WINDOW
```

---

## 7. Two authority axes must stay separate

The renderer must reason on two independent axes.

### Axis A — Event truth / source provenance

Existing current-root/source policy remains unchanged.

It answers:

```text
Which current event/source supports this event claim?
```

### Axis B — Audience exposure

This contract adds a second filter.

It answers:

```text
Even if the claim is source-supported, may the Community audience know it as public fact?
```

Canonical rule:

```text
EVENT_FACT_SUPPORTED
does not imply
AUDIENCE_KNOWS_AS_FACT
```

The new exposure restraint must not weaken or reorder the existing event/source precedence lines.

---

## 8. Exposure classes for the direct B-root subset

### 8.1 Current B source visible broadcast prose

Definition for this contract:

```text
visible broadcast prose
=
current root-local B source assistant's viewer-facing broadcast body
excluding derived <COMMUNITY> blocks
excluding final <Knowledge>
excluding hidden/internal metadata
```

In this direct-root subset, that source assistant is structurally aligned with the B turn directly preceding the C request.

Disposition:

```text
AUDIENCE_EXPOSURE_BASIS
```

This is not a claim that every sentence in every future B representation is forever public. It is a first-slice contract grounded in current B's renderer role as broadcast footage.

### 8.2 Source `<COMMUNITY>`

A source Community block is:

```text
DERIVED_SOCIAL_CONTEXT
```

It may contain:

```text
reaction
opinion
joke
speculation
rumor
misunderstanding
```

Therefore:

```text
source Community claim
!= canonical event fact authority
```

A later Community may recognize or continue a prior rumor/opinion as **attributed social context**.

It must not silently promote that claim to established world/event fact merely because another Community block said it.

### 8.3 Source `<Knowledge>`

Source Knowledge is:

```text
MODEL / WORLD CONTINUITY CONTEXT
```

It is not:

```text
AUDIENCE EXPOSURE AUTHORITY
```

A fact appearing only in source Knowledge must not become known public fact merely because the renderer can see it.

If the same fact is independently exposed in visible broadcast prose, the broadcast exposure remains the valid basis. Knowledge neither grants nor revokes that independent exposure.

### 8.4 Character card / lore / world reference context

Reference material may remain valid for:

```text
consistency
characterization
world coherence
```

but:

```text
REFERENCE AVAILABLE TO MODEL
!=
PUBLIC KNOWLEDGE CERTIFICATE
```

Reference context alone cannot authorize Community to state a private/unexposed fact as known public fact.

### 8.5 Current user explicit public disclosure

The current user input remains primary generation-task authority.

If the user explicitly establishes a public exposure event in the current request, for example conceptually:

```text
"그 사실이 공식 발표됐다"
"방송에 그대로 나갔다"
"시청자들이 그 장면을 봤다"
"정보가 공개/유출되어 대중이 알게 됐다"
```

then the renderer may use that explicit disclosure as current audience-exposure input.

But:

```text
mere mention of hidden fact
mere request for reactions to hidden fact
mere model awareness of hidden fact
```

do not by themselves prove publication/exposure.

This is a semantic renderer instruction, not a new string classifier or runtime parser.

---

## 9. UNKNOWN policy

When audience exposure cannot be established from the bounded basis:

```text
UNKNOWN
→ do not upgrade to KNOWN PUBLIC FACT
```

This contract does not require the renderer to become silent or unnatural.

Allowed under uncertainty:

```text
opinion based on visible cues
joke
question
speculation
rumor explicitly framed as rumor
uncertainty language
```

Forbidden shortcut:

```text
hidden/private fact
→ stated by Community as confirmed fact
solely because model/reference/Knowledge knows it
```

Canonical distinction:

```text
INFERENCE / OPINION
!=
CONFIRMED PRIVATE FACT
```

---

## 10. Visible-cue inference

The first contract must preserve natural Community behavior.

Example:

```text
source Knowledge: "the character is terrified"
visible broadcast prose: hands visibly shaking, voice cracking
```

Valid Community behavior may include:

```text
"쫄았네"
"긴장한 것 같은데?"
"손 떠는 거 봐"
```

because these are reactions/inferences from exposed cues.

Invalid promotion would be:

```text
"저 캐릭터는 지금 공포 수치 93이고 속으로 도망치고 싶어 한다"
```

when that confirmation exists only in private Knowledge/reference context.

The contract protects authority without flattening opinion, humor, or plausible inference.

---

## 11. Historical / comparison request interaction

Existing source policy allows outside-root event evidence when the current user explicitly requests:

```text
prior events
history
comparison
retrospective context
```

This expands **event scope** only.

It does not automatically expand audience exposure.

Frozen rule:

```text
EVENT_SCOPE_EXPANSION
!=
AUDIENCE_EXPOSURE_EXPANSION
```

A historical fact still needs a legitimate audience-knowledge basis before Community can present it as known public fact.

---

## 12. Exact future Prompt-line semantics

If implementation is separately authorized against then-current production, the preferred first representation is six compact lines inside the existing short-C conditional guidance.

The design freezes these candidate semantics:

```text
short_community_b_exposure_scope=direct_root_broadcast_turn
short_community_b_audience_exposure_basis=current_source_visible_broadcast_prose+current_user_explicit_public_disclosure;mere_mention_or_reaction_request_does_not_publish_hidden_fact=1
short_community_b_source_community_role=derived_social_context_not_event_fact_authority;rumor_opinion_may_recur_only_as_attributed_rumor_opinion_or_reaction=1
short_community_b_source_knowledge_role=continuity_context_not_audience_exposure_authority;reference_context_alone_not_public_knowledge_certificate=1
short_community_b_unknown_exposure=do_not_assert_as_known_public_fact;event_scope_expansion_does_not_expand_audience_exposure=1
short_community_b_visible_cue_inference=allowed_as_inference_opinion_joke;hidden_private_state_not_confirmed_without_exposure=1
```

These strings are **design-level candidate contract text**.

They are not currently present in production and do not authorize insertion by themselves.

### Why the `short_community_` prefix is deliberate

The current runtime's prompt-change classifier already recognizes `short_community_` lines as handoff/lineage-related volatile prompt material.

Therefore this naming shape allows a later implementation to remain in the existing volatile conditional tier without requiring a new runtime-cache tier rule merely to classify these lines.

This is a design constraint, not an implementation performed here.

---

## 13. Exact ordering contract

If implemented, the six new lines must appear only after the existing current-root/source provenance lines, specifically after the current line equivalent to:

```text
outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;...
```

and before the existing new-source-only branch:

```text
if communitySourceHandoffNewSource:
    short_community_request_reused_with_new_source=...
    derive_reaction_from_current_source_not_prior_answer=1
```

Required conceptual order:

```text
1. existing source / event provenance
2. new B audience-exposure restraint
3. existing new-source handoff guidance, when applicable
```

Reason:

```text
first establish what source/event is current
then constrain what the audience may know from it
then apply source-shift guidance
```

No existing line may be deleted, rewritten, or reordered merely to fit this contract.

---

## 14. Prompt-entry pseudocode

Design-only pseudocode:

```text
directBRootExposureEligible =
    p.mode == 'C'
    && p.communitySourceHandoffEligible
    && p.communitySourceHandoffRootMode == 'B'
    && p.communitySourceHandoffParentMode == 'B'
    && valid(p.communitySourceHandoffRootIndex)
    && p.communitySourceHandoffParentIndex == p.communitySourceHandoffRootIndex
    && p.communitySourceHandoffDepth == 1

if directBRootExposureEligible:
    append six exposure-restraint lines exactly once
else:
    append zero new exposure-restraint lines
```

No source-body parsing is introduced by this gate.

The main model interprets the already-visible structural B source under the policy lines.

---

## 15. Why multi-B episode exposure is deferred

For:

```text
B_START
→ B_CONTINUE
→ B_END
→ short C
```

current production has enough state to know:

```text
root B
current parent B
parent index differs from root index
```

but the existing Evidence source assistant remains root-local.

A complete episode-aware exposure basis would need a separately proven concept such as:

```text
current B parent assistant
bounded B episode source window
or authoritative aired-fact projection
```

That is a different source-resolution contract.

This first design must not smuggle that broader behavior in through prompt wording.

Disposition:

```text
DEFER · MULTI_B_SOURCE_EXPOSURE_WINDOW
```

---

## 16. Why no generic Exposure object yet

Do not create in the first implementation:

```text
Exposure module
public/private fact database
audience memory ledger
per-platform epistemic state
semantic fact graph
social graph
publication registry
auxiliary-model classifier
embedding relevance classifier
```

The first slice has no need for persistence because its policy is derived request-time from:

```text
current mode
existing Handoff/Lineage facts
current source already in model context
current user input
```

If this bounded restraint proves insufficient in real usage, the next design must be driven by that evidence rather than by subsystem ambition.

---

## 17. Reroll / edit / source replacement contract

The first design creates no derived exposure object and no persistent exposure state.

Therefore:

### Reroll of current C

Recompute the same request-time eligibility from current Lineage/Handoff state.

No previous exposure result is stored or reused.

### Edit / reroll of B source assistant

Existing history representation and Evidence/Edit-Reconcile contracts remain authoritative.

The exposure restraint does not retain source-body copies or stale extracted facts.

The renderer sees the then-current source representation supplied by the normal request path.

### New source / root replacement

Existing Lineage/Handoff recomputes root/parent/source facts.

The B-specific restraint applies only if the new current state independently satisfies the full direct-root entry gate.

Canonical rule:

```text
NO PERSISTED EXPOSURE DESCENDANT
→ NO NEW INVALIDATION LEDGER REQUIRED
```

---

## 18. Evidence integration boundary

Evidence remains unchanged.

The first exposure contract does **not** require:

```text
Evidence DUAL
new sub-message fence
COMMUNITY block extraction inside Evidence
Knowledge extraction inside Evidence
post-Evidence prompt serializer
prompt pipeline reordering
```

Reason:

current Prompt is prepared before final Evidence fencing disposition is known.

The direct-root gate uses only already-prepared Handoff/Lineage facts available at Prompt compilation time.

Evidence continues to improve source authenticity independently when its current fence can be safely applied.

---

## 19. Community / Reaction / Structure boundaries

### Community

No parser/classifier semantic change.

### Reaction

No number parsing, maxima, normalization, or history change.

### Structure

No semantic leak detector is added.

Structure remains a deterministic envelope/shape/state-commit judge, not a natural-language epistemic fact checker.

### Main model

The main model remains the renderer and policy consumer.

It performs the natural-language distinction between:

```text
known public fact
attributed rumor
opinion/inference
hidden/private fact
```

under the bounded Prompt contract.

---

## 20. Static prompt regression matrix

A future offline evaluator / implementation test must prove at least:

| Case | Expected new restraint |
| --- | --- |
| A request | 0 lines |
| current B_START | 0 lines |
| current B_CONTINUE | 0 lines |
| current B_END | 0 lines |
| eligible direct B root → short C | 6 lines exactly once |
| direct B root → short C + newSource flag | 6 lines exactly once + existing new-source lines unchanged |
| B root + parentIndex != rootIndex | 0 lines |
| B root + parentMode C | 0 lines |
| B root + depth != 1 | 0 lines |
| A root short C | 0 lines |
| INLINE_C root short C | 0 lines |
| ineligible / recurrence-owned / long C | 0 lines |
| invalid root/parent indices | 0 lines |

Also prove:

```text
all existing source-provenance lines byte-identical
existing line order byte-identical
new six lines contiguous
new six lines classified volatile by existing short_community_ prompt-change path
TAIL_AFTER_CURRENT_USER unchanged
stable / slow prefix contracts unchanged
```

---

## 21. Semantic adversarial matrix

### A. Knowledge leak trap

```text
broadcast prose exposes X
source Knowledge contains hidden Y
later eligible direct-root C asks for reactions
```

PASS:

```text
Community may react to X
Community does not state Y as known fact
```

### B. Derived Community truth-promotion trap

```text
source Community contains rumor R
broadcast prose never establishes R
```

PASS:

```text
later Community may refer to "the R rumor" / continue speculation
R is not silently asserted as established event truth
```

### C. Reference omniscience trap

```text
character card/lore contains private P
B broadcast does not expose P
```

PASS:

```text
P is not public merely because model context contains it
```

### D. Visible fact positive control

```text
broadcast prose clearly exposes V
```

PASS:

```text
Community may naturally react to V
```

### E. Visible-cue inference control

```text
Knowledge says private emotion E
broadcast visibly shows cues consistent with E
```

PASS:

```text
Community may infer/joke/speculate from visible cues
Community does not claim hidden private confirmation solely from Knowledge
```

### F. Current-user explicit disclosure control

```text
source Knowledge contains Y
current C explicitly establishes that Y was publicly announced / shown / leaked
```

PASS:

```text
Community may now use Y as exposed under current user authority
```

### G. Mere-mention non-publication trap

```text
source Knowledge contains Y
current C merely mentions Y or asks generally for reactions without establishing exposure
```

PASS:

```text
mention/request alone does not become an invented publication event
```

### H. Historical-scope conflation trap

```text
current C requests comparison/history
historical private fact H exists in model context
```

PASS:

```text
event-history scope may broaden
H is not automatically public to Community
```

### I. Multi-B under-knowledge trap

```text
B_START exposes A
B_CONTINUE later exposes B
then short C
rootIndex points to B_START
parentIndex points to B_CONTINUE
```

PASS for this first contract:

```text
new direct-root exposure lines are NOT injected
```

Reason:

```text
first-slice source window cannot safely represent all currently aired B facts
```

This is a deliberate defer, not a failure to notice B.

---

## 22. Non-regression matrix

Any later implementation must preserve:

```text
Current Task Primacy
existing short-C event/source provenance
Lineage root/parent/depth semantics
Handoff same/new-source semantics
Evidence mapping/fencing
Broadcast lifecycle/end authority
Summary scope authority
Community block count/platform taxonomy
Reaction parsing/normalization/history
Knowledge final placement
Frame / Chapter / Chatindex
Structure acceptance
Output compatibility
Deferred Mirror
history representation
persistent schema
request order / TAIL_AFTER_CURRENT_USER
provider-cache UNVERIFIED posture
```

No correctness claim may be traded for prompt compactness or Community texture.

---

## 23. Expected first implementation blast radius

If later authorized against fresh production source:

```text
Prompt conditional guidance           = YES, bounded
Prompt regression tests               = YES
semantic fixture/eval                 = YES

Lifecycle semantics                   = NO
Lineage semantics                     = NO
Handoff semantics                     = NO
Evidence semantics                    = NO
Community parser/classifier           = NO
Reaction                              = NO
Structure                             = NO
Knowledge structure                   = NO
persistent state/schema               = NO
history/request mutation              = NO
new runtime module                    = NO
auxiliary model                       = NO
network/storage/timer                 = NO
```

Because all proposed lines begin with `short_community_`, no separate runtime-tier classifier change is expected under the current v0.70.1 prompt-change logic. This must be re-proven against then-current production before implementation.

---

## 24. Implementation authorization gate

This design does not authorize production code.

Before implementation, require:

```text
1. re-read then-current release-simcore exact source
2. confirm Lineage/Handoff/Evidence source-index semantics still match this design
3. confirm Prompt order and short_community_ volatile classification still match
4. build offline static prompt evaluator / regression matrix
5. execute adversarial semantic fixtures against baseline vs candidate prompt
6. prove no multi-B case is accidentally admitted
7. obtain separate implementation/release authority
```

If current production has moved materially, re-scope rather than mechanically applying this document.

---

## 25. S7 / release boundary

S7 remains:

```text
P0 → P12 cumulative post-M2 simplification convergence
+ final identity convergence
+ publication/live proof
NO NEW SEMANTIC SCOPE
```

Therefore:

```text
Exposure design != S7
Exposure implementation != P13
Exposure implementation != v0.70.3
```

This document assigns no future runtime version.

`v0.70.2` remains reserved for its separate parked program and is not reused here.

---

## 26. Deferred follow-ons

The following remain outside this first contract:

```text
MULTI_B_SOURCE_EXPOSURE_WINDOW
same-turn B episode-wide exposure
A-source visibility proof
INLINE_C visibility proof
private-state generic schema
channel reachability
reaction propagation delay
persistent audience memory
per-platform epistemic state
semantic output fact checker
source-derived persistent exposure object
```

The strongest likely next expansion, only after first-slice evidence, is:

```text
MULTI_B_SOURCE_EXPOSURE_WINDOW
```

because fresh source review proved that B root persistence is the immediate structural limit of the direct-root approach.

---

## 27. Findings classification

### FIX

None in production.

### WATCH

`WATCH · DIRECT_ROOT_ONLY_FIRST_SLICE`

The first restraint intentionally covers only B roots whose current B parent equals the root. It must not be misreported as episode-wide B exposure coverage.

`WATCH · MODEL_POLICY_NOT_SEMANTIC_PROOF`

Prompt restraint guides the renderer but is not machine proof that every generated Community sentence obeyed the exposure rule. Do not call this a semantic validator.

`WATCH · USER_EXPLICIT_DISCLOSURE_IS_RENDERER_SEMANTICS`

The first contract does not add a parser for publication wording. The main model interprets explicit user disclosure under existing current-input primacy.

### DEFER

`DEFER · MULTI_B_SOURCE_EXPOSURE_WINDOW`

A later B turn inside the same root-persistent episode needs a separately proven current-parent/episode source window.

Other broad Exposure defers remain as listed above.

### BLOCKER

None for offline evaluator / fixture work.

Production implementation remains unauthorized until its separate gate.

---

## 28. Next legitimate action

Proceed to:

```text
EXPOSURE_PROMPT_CONTRACT_OFFLINE_EVALUATOR
```

That tool should:

```text
consume fixture pending/Handoff facts
compute direct-B-root eligibility deterministically
emit the exact six candidate restraint lines or none
prove ordering/tier expectations as offline assertions
never mutate a real request
```

Then add the semantic adversarial fixture corpus separately.

No runtime code is required for the next step.

---

## 29. Final state

```text
EXPOSURE_KNOWLEDGE_CANDIDATE                   = ACTIVE DESIGN LINE
B_SOURCE_MODE_C_EXPOSURE_RESTRAINT             = DESIGN FROZEN
FIRST_IMPLEMENTABLE_SUBSET                     = DIRECT_B_ROOT_MODE_C_EXPOSURE_RESTRAINT
ENTRY_MODE                                     = C
ENTRY_SHORT_C_SOURCE_POLICY                    = REQUIRED
ENTRY_ROOT_MODE                                = B
ENTRY_PARENT_MODE                              = B
ENTRY_PARENT_INDEX_EQ_ROOT_INDEX               = REQUIRED
ENTRY_DEPTH                                    = 1
AUDIENCE_EXPOSURE_BASIS                        = B SOURCE VISIBLE BROADCAST PROSE + EXPLICIT CURRENT USER PUBLIC DISCLOSURE
SOURCE_COMMUNITY_AUTHORITY                     = DERIVED SOCIAL CONTEXT, NOT EVENT FACT AUTHORITY
SOURCE_KNOWLEDGE_AUTHORITY                     = CONTINUITY CONTEXT, NOT PUBLIC EXPOSURE AUTHORITY
REFERENCE_CONTEXT_PUBLIC_CERTIFICATE           = NO
UNKNOWN_EXPOSURE                               = DO NOT UPGRADE TO KNOWN PUBLIC FACT
VISIBLE_CUE_INFERENCE                          = ALLOWED AS INFERENCE / OPINION / JOKE
MULTI_B_SOURCE_EXPOSURE                        = DEFER
PERSISTENT_SCHEMA                              = NONE
REQUEST_HISTORY_MUTATION                       = NONE
NEW_RUNTIME_MODULE                             = NONE
S7_CHANGE                                      = NONE
PRODUCTION_CHANGE                              = NONE
IMPLEMENTATION_AUTHORITY                       = NONE
NEXT                                            = EXPOSURE_PROMPT_CONTRACT_OFFLINE_EVALUATOR
```