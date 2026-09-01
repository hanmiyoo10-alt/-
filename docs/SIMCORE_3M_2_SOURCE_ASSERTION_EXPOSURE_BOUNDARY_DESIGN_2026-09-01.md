# SimCore 3M-2 Source Assertion / Exposure Boundary Design — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-2 DESIGN FROZEN · FIRST LIVE_REACTION ASSERTION POLICY BOUNDARY FROZEN · IMPLEMENTATION NOT AUTHORIZED · EXPOSURE TARGET-HOST / MODEL COMPLIANCE STILL REQUIRED · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-2 · ASSERTION ELIGIBILITY · AUDIENCE EXPOSURE · LIVE_REACTION · DIRECT B-ROOT FIRST SLICE**

---

## 0. Purpose

3M-2 freezes the first machine-checkable policy boundary answering:

```text
Given an intended source assertion mode
and an already-classified audience-exposure basis,
may the first LIVE_REACTION family express that proposition
as a confirmed public fact, attributed social context, or visible-cue inference?
```

3M-2 deliberately does **not** yet create structured `assertions[]` payloads.

The major checkpoint order remains:

```text
3M-1 = envelope compatibility
3M-2 = assertion / exposure eligibility policy
3M-3 = structured sidecar + validator ownership
```

Therefore:

```text
3M-2 makes the policy decision deterministic.
3M-3 will later define the concrete assertion object that can carry that decision.
```

Canonical distinction:

```text
MACHINE-CHECKABLE POLICY DISPOSITION
!=
MACHINE-PROVEN NATURAL-LANGUAGE SEMANTIC BASIS
```

3M-2 can deterministically decide what a declared exposure basis permits.
It does not pretend that arbitrary natural-language prose can already be classified perfectly without a semantic producer or future structured contract.

---

## 1. Authority chain

This design consumes:

```text
docs/SIMCORE_GUIDELINES.md
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_3M_1_SOURCE_PROJECTION_ENVELOPE_LEGACY_COMMUNITY_COMPATIBILITY_DESIGN_2026-09-01.md
docs/SIMCORE_EXPOSURE_KNOWLEDGE_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md
docs/SIMCORE_EXPOSURE_SEMANTIC_ADVERSARIAL_FIXTURE_CORPUS_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_PROTOCOL_2026-09-01.md
docs/SIMCORE_EXPOSURE_M1_TARGET_HOST_PREFLIGHT_OPERATOR_PACKET_2026-09-01.md
```

The production runtime remains independently authoritative on `release-simcore`.

3M-2 is design/evidence only.

---

## 2. Frozen inherited invariants

From the 3.0M master design:

```text
SIMCORE KNOWS FACT
!=
SOURCE MAY ASSERT FACT
```

From Exposure research:

```text
EVENT_FACT_SUPPORTED
!=
AUDIENCE_KNOWS_AS_FACT
```

From 3M-1:

```text
family = LIVE_REACTION
assertions[] = []
exposureScope = LEGACY_COMMUNITY_POLICY_UNCHANGED
sourceAuthorityRef ∈ {
  LEGACY_MODE_CONTEXT,
  HANDOFF_EVIDENCE,
  UNRESOLVED_LEGACY_C
}
```

3M-2 must not silently alter those 3M-1 runtime compatibility facts.

---

## 3. First bounded scope

The first assertion-policy scope is intentionally narrower than all future Source Intelligence.

Frozen scope:

```text
family = LIVE_REACTION
request shape = eligible short C
source root = direct B root
sourceAuthorityRef = HANDOFF_EVIDENCE
```

The inherited direct-B-root structural gate remains:

```text
mode == C
communitySourceHandoffEligible == true
communitySourceHandoffRootMode == B
communitySourceHandoffParentMode == B
valid root index
communitySourceHandoffParentIndex == communitySourceHandoffRootIndex
communitySourceHandoffDepth == 1
```

3M-2 does not generalize assertion authorization to:

```text
LEGACY_MODE_CONTEXT
UNRESOLVED_LEGACY_C
multi-B episode source windows
A-root source paths
INLINE_C source paths
BOARD
SOCIAL_FEED
NEWS
PUBLIC_KNOWLEDGE
```

Disposition for those cases:

```text
HOLD · OUTSIDE_3M2_FIRST_ASSERTION_SCOPE
```

This is not a declaration that those future families may never assert facts.
It means their source/exposure basis has not yet been frozen by this checkpoint.

---

## 4. Three assertion modes

3M-2 adopts the already-proven Exposure corpus assertion modes without renaming them:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

### `CONFIRMED_FACT`

Strongest mode.

Meaning:

```text
The source projection presents the proposition as established public/source-visible fact.
```

This mode requires an independent audience-exposure basis for the same proposition.

### `ATTRIBUTED_SOCIAL`

Meaning:

```text
The projection reports that people are saying, speculating, joking, believing, or repeating the proposition.
```

This does not promote the underlying proposition to canonical event truth.

### `INFERENCE_OPINION`

Meaning:

```text
The projection reacts to visible cues with an inference, opinion, joke, or uncertainty-framed interpretation.
```

This mode does not authorize confirmation of a hidden/private state.

---

## 5. Exposure-oracle input signals

3M-2 reuses the exact semantic-oracle signal vocabulary already exercised by the 12-case Exposure corpus:

```text
broadcastExposed
sourceCommunityContext
sourceKnowledgeContext
referenceContext
currentUserExplicitPublicDisclosure
currentUserMentionOnly
outsideRootHistoryOnly
visibleCueExposed
```

Critical boundary:

```text
THESE SIGNALS ARE POLICY / EVALUATION INPUTS
NOT A NEW PERSISTENT RUNTIME PUBLIC-KNOWLEDGE DATABASE
```

3M-2 does not authorize a generic runtime classifier that scans arbitrary prose and sets these flags.

Until a structured producer/validator contract exists, these signals are valid for:

```text
offline fixtures
design oracle evaluation
future structured-sidecar input contracts
model-compliance scoring metadata
```

They are not themselves canonical world truth.

---

## 6. Positive audience-exposure bases

For `CONFIRMED_FACT`, only two first-slice bases can independently authorize known-public treatment:

```text
broadcastExposed == true
OR
currentUserExplicitPublicDisclosure == true
```

These map to the master-design class:

```text
PUBLIC / EXPOSED FACT
```

A duplicate appearance in Knowledge/reference/social context does not poison an otherwise valid independent public basis.

Canonical rule:

```text
VALID_PUBLIC_BASIS
+ duplicate private/contextual copy
→ public basis remains valid
```

---

## 7. Non-public contextual surfaces

### 7.1 Prior/source Community

```text
sourceCommunityContext == true
```

means:

```text
ATTRIBUTED SOCIAL CONTEXT
```

It can support `ATTRIBUTED_SOCIAL`.
It cannot by itself support `CONFIRMED_FACT`.

Canonical rule:

```text
DERIVED SOCIAL CONTEXT
!=
EVENT FACT AUTHORITY
```

### 7.2 Source Knowledge

```text
sourceKnowledgeContext == true
```

means continuity/model/world context only.

It does not establish audience exposure.

### 7.3 Reference / lore / character context

```text
referenceContext == true
```

may support consistency but is not a public-knowledge certificate.

### 7.4 Visible cue

```text
visibleCueExposed == true
```

may support `INFERENCE_OPINION`.

It does not automatically support a more specific `CONFIRMED_FACT` about hidden intention, private state, internal number, secret identity, or unseen outcome.

---

## 8. Non-bases that must never be upgraded

Two signals are explicitly **not** exposure bases:

```text
currentUserMentionOnly
outsideRootHistoryOnly
```

### Mere mention

```text
currentUserMentionOnly == true
```

means the current user referenced a proposition without establishing that the audience learned it.

Frozen rule:

```text
MENTION
!=
PUBLICATION
```

### Historical/event-scope expansion

```text
outsideRootHistoryOnly == true
```

means an event may be in requested comparison/retrospective scope.

Frozen rule:

```text
EVENT_SCOPE_EXPANSION
!=
AUDIENCE_EXPOSURE_EXPANSION
```

---

## 9. Deterministic policy result

3M-2 freezes a conceptual pure-policy result:

```text
SourceAssertionPolicyReceipt
  scope
  assertionMode
  eligibilityState
  reasonCode
```

where:

```text
eligibilityState ∈ {
  ALLOW,
  DENY,
  HOLD
}
```

This is a conceptual design contract only.
It is not yet a persisted schema and does not populate 3M-1 `assertions[]`.

---

## 10. Frozen reason codes

Existing Exposure oracle dispositions are retained as stable reason codes:

```text
ALLOW_KNOWN_PUBLIC_FACT
ALLOW_ATTRIBUTED_SOCIAL_CONTEXT
ALLOW_VISIBLE_CUE_INFERENCE
DENY_UNEXPOSED_PRIVATE_CONFIRMATION
DENY_DERIVED_SOCIAL_PROMOTION
DENY_MERE_MENTION_PUBLICATION
DENY_EVENT_SCOPE_EXPOSURE_PROMOTION
DENY_UNKNOWN_PUBLIC_FACT
```

3M-2 adds one conservative design-only fallback:

```text
HOLD_UNPROVEN_POLICY_COMBINATION
```

This prevents the design from silently inventing authorization for signal/mode combinations not covered by current evidence.

---

## 11. Frozen decision function

The first policy table is deliberately asymmetric.

### 11.1 `CONFIRMED_FACT`

Evaluate in this order:

```text
1. if broadcastExposed OR currentUserExplicitPublicDisclosure
   → ALLOW / ALLOW_KNOWN_PUBLIC_FACT

2. else if currentUserMentionOnly
   → DENY / DENY_MERE_MENTION_PUBLICATION

3. else if outsideRootHistoryOnly
   → DENY / DENY_EVENT_SCOPE_EXPOSURE_PROMOTION

4. else if sourceCommunityContext
   → DENY / DENY_DERIVED_SOCIAL_PROMOTION

5. else if sourceKnowledgeContext OR referenceContext
   → DENY / DENY_UNEXPOSED_PRIVATE_CONFIRMATION

6. else
   → DENY / DENY_UNKNOWN_PUBLIC_FACT
```

Important consequence:

```text
independent public exposure wins over duplicate private/contextual copies
```

This preserves the existing corpus control where a fact appears in Knowledge but is also independently visible in broadcast prose.

### 11.2 `ATTRIBUTED_SOCIAL`

Frozen proven authorization:

```text
if sourceCommunityContext
→ ALLOW / ALLOW_ATTRIBUTED_SOCIAL_CONTEXT
```

All other combinations in 3M-2:

```text
HOLD / HOLD_UNPROVEN_POLICY_COMBINATION
```

Do not infer a wider lattice merely because weaker wording appears intuitively safe.

### 11.3 `INFERENCE_OPINION`

Frozen proven authorization:

```text
if visibleCueExposed
→ ALLOW / ALLOW_VISIBLE_CUE_INFERENCE
```

All other combinations in 3M-2:

```text
HOLD / HOLD_UNPROVEN_POLICY_COMBINATION
```

A private Knowledge fact cannot be disguised as an `INFERENCE_OPINION` merely to bypass exposure restrictions.

---

## 12. Strength / authority non-promotion rule

Assertion mode is not a laundering mechanism.

Forbidden examples:

```text
private fact
→ relabel as INFERENCE_OPINION
→ leak exact hidden proposition

prior rumor
→ relabel as CONFIRMED_FACT
→ promote to event truth
```

Canonical rule:

```text
MODE LABEL
!=
AUTHORITY UPGRADE
```

A future structured validator may validate enum shape.
It cannot consider a semantically unsupported proposition safe merely because the payload chose a weaker label.

---

## 13. Source authority and audience exposure remain separate axes

For every future assertion:

```text
Axis A = source / event support
Axis B = audience exposure / assertion mode eligibility
```

3M-2 handles Axis B only after the first-slice source path is already structurally bounded by existing Handoff/Evidence authority.

Therefore:

```text
HANDOFF_EVIDENCE proves source relationship
!=
HANDOFF_EVIDENCE proves audience exposure
```

and:

```text
ALLOW_KNOWN_PUBLIC_FACT
!=
new canonical world truth
```

The assertion remains a **derived source projection** unless an independent canonical owner establishes the underlying world/event fact.

---

## 14. 3M-1 authority-class interaction

### `HANDOFF_EVIDENCE`

Only authority class eligible for the 3M-2 first-slice policy.

### `LEGACY_MODE_CONTEXT`

3M-2 does not grant machine-checkable assertion authorization from this weaker compatibility reference.

Disposition:

```text
HOLD · OUTSIDE_3M2_FIRST_ASSERTION_SCOPE
```

### `UNRESOLVED_LEGACY_C`

Never upgrade merely because a legal Community block exists.

Disposition:

```text
HOLD · OUTSIDE_3M2_FIRST_ASSERTION_SCOPE
```

Canonical rule:

```text
LEGAL LEGACY OUTPUT
!=
PROVEN STRUCTURED ASSERTION AUTHORITY
```

---

## 15. Relationship to `assertions[]`

3M-1 froze:

```text
assertions[] = []
```

3M-2 does not change that runtime compatibility value.

Instead it freezes the policy that a future assertion object must satisfy before being considered eligible.

3M-3 must consume this design and define a bounded assertion object capable of carrying at least enough information to represent:

```text
assertion mode
source/provenance reference
exposure-policy disposition
bounded semantic content
```

Exact fields, schema syntax, validation surface, and serialization belong to 3M-3.

---

## 16. No raw legacy Community assertion extraction

3M-2 explicitly forbids:

```text
legacy <COMMUNITY> prose
→ regex / keyword parser
→ assertions[]
```

It also forbids:

```text
legacy Community sentence
→ embedding classifier
→ public/private verdict
```

Reason:

```text
legacy Community is unstructured natural-language presentation
not a trusted structured assertion source
```

Any future semantic producer must be separately designed and validated.

---

## 17. Main-model role

The current main model remains the natural-language renderer and current policy consumer.

Exposure research currently tests whether six bounded prompt lines improve its compliance.

3M-2 does not replace that research with a fake local semantic checker.

Until structured Source Intelligence output exists:

```text
main model performs natural-language distinction
+
offline semantic oracle grades intended behavior
```

The policy table freezes the target semantics.
It does not claim the current model already follows them reliably.

---

## 18. Exposure research gate remains binding

Current research state remains:

```text
actual target-host preflight evidence = pending
M1 model-compliance smoke = locked until host preflight PASS
production E6 insertion = not authorized
```

Therefore:

```text
3M-2 DESIGN FROZEN
!=
EXPOSURE MODEL COMPLIANCE PROVEN
!=
3M-2 RUNTIME IMPLEMENTATION AUTHORIZED
```

If later target-host/model evidence shows the E6 delivery strategy is ineffective, 3M-2's semantic boundary may remain valid while the delivery mechanism is redesigned.

If later evidence contradicts the semantic boundary itself, this design must be explicitly reopened rather than silently patched through prompt wording.

---

## 19. Multi-B episode remains deferred

3M-2 does not solve:

```text
B_START
→ B_CONTINUE
→ B_END
→ short C
```

when the current authoritative audience-exposure window extends beyond the root-local Evidence source assistant.

Disposition remains:

```text
DEFER · MULTI_B_SOURCE_EXPOSURE_WINDOW
```

A later checkpoint must prove a bounded source window or authoritative aired-fact projection before widening this policy.

---

## 20. Publication maturity and reachability

For 3M-2 first slice:

```text
family = LIVE_REACTION
publicationMaturity = IMMEDIATE_REACTION
reachability = LEGACY_EXPECTED_BY_MODE
```

3M-2 does not introduce:

```text
news publication maturity
board persistence
feed propagation
public-reference settlement
per-platform audience graph
channel reach simulation
```

The assertion policy must not accidentally become a generic publication engine.

---

## 21. Persistence / history / context boundary

No new persistent state is authorized.

```text
persistent exposure ledger = NONE
persistent assertion database = NONE
source-history archive = NONE
new context re-entry = NONE
```

3M-1 context rule remains:

```text
LEGACY_HOST_HISTORY_UNCHANGED_NO_ADDITIONAL_REENTRY
```

3M-2 does not change host history or automatically feed policy receipts into future requests.

---

## 22. Performance budget

Design target for any future first implementation:

```text
new model calls = 0
new network calls = 0
new history scans = 0
new persistent writes = 0
new timers / polling = 0
new background workers = 0
```

A pure local policy function over already-bounded structured inputs should be effectively constant-work.

Natural-language basis classification is not authorized as a new local scanning subsystem in 3M-2.

---

## 23. Required offline policy matrix

Before any runtime implementation authorization, a deterministic evaluator must be able to reproduce the existing 12-case semantic corpus and additionally prove policy-table closure.

Minimum protected cases:

```text
visible broadcast fact
→ CONFIRMED_FACT
→ ALLOW_KNOWN_PUBLIC_FACT

current user explicit public disclosure
→ CONFIRMED_FACT
→ ALLOW_KNOWN_PUBLIC_FACT

Knowledge-only hidden fact
→ CONFIRMED_FACT
→ DENY_UNEXPOSED_PRIVATE_CONFIRMATION

reference-only hidden fact
→ CONFIRMED_FACT
→ DENY_UNEXPOSED_PRIVATE_CONFIRMATION

prior Community rumor
→ CONFIRMED_FACT
→ DENY_DERIVED_SOCIAL_PROMOTION

prior Community rumor
→ ATTRIBUTED_SOCIAL
→ ALLOW_ATTRIBUTED_SOCIAL_CONTEXT

visible cue
→ INFERENCE_OPINION
→ ALLOW_VISIBLE_CUE_INFERENCE

mere mention
→ CONFIRMED_FACT
→ DENY_MERE_MENTION_PUBLICATION

history-only scope
→ CONFIRMED_FACT
→ DENY_EVENT_SCOPE_EXPOSURE_PROMOTION

no valid basis
→ CONFIRMED_FACT
→ DENY_UNKNOWN_PUBLIC_FACT

Knowledge duplicate + visible broadcast
→ CONFIRMED_FACT
→ ALLOW_KNOWN_PUBLIC_FACT
```

Also prove:

```text
unknown assertion mode → reject structurally
unknown signal key → reject structurally
out-of-scope sourceAuthorityRef → HOLD
out-of-scope source family → HOLD
input mutation = NONE
no raw prose inspection
```

---

## 24. Real-model scoring remains two-sided

Exposure correctness requires protecting both failure directions.

### Leakage failure

```text
private / unexposed / rumor-only proposition
→ emitted as confirmed public fact
```

### Under-knowledge failure

```text
valid exposed fact
or valid attributed social context
or visible-cue inference
→ unnecessarily suppressed or flattened
```

3M-2 is not a maximally-cautious filter.
It is an authority-preserving assertion policy.

---

## 25. BLOCKER conditions

Any future implementation must stop if it requires:

```text
BLOCKER · ASSERTION_POLICY_BECOMES_SECOND_CANONICAL_TRUTH_OWNER
BLOCKER · EXPOSURE_BASIS_INFERRED_FROM_KNOWLEDGE_OR_REFERENCE_AS_PUBLIC_CERTIFICATE
BLOCKER · LEGACY_COMMUNITY_PROSE_REGEX_EXTRACTED_AS_TRUSTED_ASSERTIONS
BLOCKER · SOURCE_COMMUNITY_RUMOR_PROMOTED_TO_CONFIRMED_FACT
BLOCKER · HANDOFF_EVIDENCE_TREATED_AS_AUDIENCE_EXPOSURE_PROOF
BLOCKER · UNRESOLVED_LEGACY_C_UPGRADED_TO_ASSERTION_AUTHORITY
BLOCKER · 3M2_ADDS_PERSISTENT_EXPOSURE_OR_ASSERTION_STATE
BLOCKER · 3M2_ADDS_HISTORY_SCAN_MODEL_CALL_OR_NETWORK_CALL
BLOCKER · 3M2_BYPASSES_PENDING_EXPOSURE_TARGET_HOST_MODEL_COMPLIANCE_GATE
```

---

## 26. WATCH / DEFER ledger

```text
WATCH · MODEL_COMPLIANCE_REMAINS_UNPROVEN
WATCH · EXPOSURE_SIGNAL_CLASSIFICATION_IS_NOT_YET_PRODUCTION_MACHINE_PROOF
WATCH · NATURAL_LANGUAGE_PARAPHRASE_REMAINS_SEMANTIC_NOT_TOKEN_IDENTITY

DEFER · MULTI_B_SOURCE_EXPOSURE_WINDOW
DEFER · A_SOURCE_EXPOSURE
DEFER · INLINE_C_EXPOSURE
DEFER · GENERIC_PRIVATE_STATE_SCHEMA
DEFER · BOARD_ASSERTION_POLICY
DEFER · SOCIAL_FEED_ASSERTION_POLICY
DEFER · NEWS_PUBLICATION_ASSERTION_POLICY
DEFER · PUBLIC_KNOWLEDGE_SETTLEMENT_POLICY
DEFER · PERSISTENT_AUDIENCE_MEMORY
DEFER · SOURCE_HISTORY_CONTEXT_REENTRY
```

---

## 27. Implementation-entry gate

This design does not authorize runtime implementation.

A later implementation transaction may begin only after:

```text
3M-2 design merged and CI-clean
3M-1 design remains authoritative
Exposure target-host preflight has actual evidence
required model-compliance gate is classified
exact then-current production source is freshly re-read
implementation surface remains separate from S7 / v0.70.3
no persistent schema delta unless separately designed
no raw-prose semantic classifier is introduced
policy evaluator reproduces frozen semantic corpus
```

Preferred first code shape, if later authorized:

```text
PURE OFFLINE / STRUCTURED-INPUT POLICY KERNEL
```

before any active source-output mutation.

---

## 28. 3M-2 close criteria

```text
FIRST_ASSERTION_FAMILY               = LIVE_REACTION
FIRST_ASSERTION_SOURCE_SCOPE         = DIRECT_B_ROOT
FIRST_ASSERTION_SOURCE_AUTHORITY     = HANDOFF_EVIDENCE
ASSERTION_MODES                      = CONFIRMED_FACT / ATTRIBUTED_SOCIAL / INFERENCE_OPINION
PUBLIC_FACT_BASES                    = broadcastExposed / currentUserExplicitPublicDisclosure
SOCIAL_CONTEXT_BASE                  = sourceCommunityContext
VISIBLE_CUE_BASE                     = visibleCueExposed
KNOWLEDGE_PUBLIC_CERTIFICATE         = FORBIDDEN
REFERENCE_PUBLIC_CERTIFICATE         = FORBIDDEN
MENTION_AS_PUBLICATION               = FORBIDDEN
EVENT_SCOPE_AS_EXPOSURE              = FORBIDDEN
POLICY_RESULT                        = ALLOW / DENY / HOLD + reasonCode
RAW_PROSE_ASSERTION_EXTRACTION       = FORBIDDEN
PERSISTENT_ASSERTION_STATE           = NONE
PERSISTENT_EXPOSURE_STATE            = NONE
NEW_HISTORY_SCAN                     = ZERO
NEW_MODEL_CALL                       = ZERO
NEW_NETWORK_CALL                     = ZERO
3M1_ASSERTIONS_ARRAY                 = STILL EMPTY UNTIL 3M-3
EXPOSURE_MODEL_COMPLIANCE            = STILL EVIDENCE-GATED
```

---

## 29. Next design checkpoint

The next design checkpoint remains:

```text
3M-3 · STRUCTURED SIDECAR + VALIDATION
```

3M-3 must consume this policy boundary and answer:

```text
What is the smallest structured assertion object
that can carry semantic content, source/provenance reference,
assertion mode, and exposure-policy disposition
without creating a second canonical truth system?
```

3M-3 must not assume:

```text
E6 is already deployed
3M-1 runtime compatibility adapter is already shipped
model compliance is already proven
```

Document-level 3M-3 design may proceed independently while those runtime gates remain pending.

---

## 30. Final 3M-2 design state

```text
3M_2_DESIGN                              = FROZEN
3M_2_IMPLEMENTATION                      = NOT_AUTHORIZED
FIRST_FAMILY                             = LIVE_REACTION
FIRST_SCOPE                              = DIRECT_B_ROOT
SOURCE_AUTHORITY                         = EXISTING HANDOFF_EVIDENCE ONLY
ASSERTION_POLICY                         = EXPLICIT / DETERMINISTIC OVER DECLARED ORACLE SIGNALS
SEMANTIC_BASIS_MACHINE_PROOF             = NOT CLAIMED
CONFIRMED_PUBLIC_FACT                    = REQUIRES INDEPENDENT PUBLIC EXPOSURE BASIS
ATTRIBUTED_SOCIAL                        = PROVEN FOR SOURCE COMMUNITY CONTEXT
VISIBLE_CUE_INFERENCE                    = PROVEN FOR EXPOSED VISIBLE CUE
PRIVATE_KNOWLEDGE                        = NOT PUBLIC AUTHORITY
REFERENCE_CONTEXT                        = NOT PUBLIC AUTHORITY
MENTION_ONLY                             = NOT PUBLICATION
HISTORY_SCOPE_ONLY                       = NOT EXPOSURE
UNKNOWN                                  = FAIL CLOSED FOR CONFIRMED FACT
3M1_ASSERTIONS                           = [] UNCHANGED
PERSISTENT_SCHEMA                        = UNCHANGED
PROMPT                                   = UNCHANGED
VISIBLE_OUTPUT                           = UNCHANGED
PRODUCTION                               = UNCHANGED
S7 / v0.70.3                             = UNCHANGED
release-simcore                          = UNCHANGED
NEXT_DESIGN                              = 3M-3 STRUCTURED SIDECAR + VALIDATION
```