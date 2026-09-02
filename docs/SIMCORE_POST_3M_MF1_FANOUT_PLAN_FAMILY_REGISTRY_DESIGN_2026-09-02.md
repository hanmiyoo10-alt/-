# SimCore Post-3.0M MF-1 Fanout Plan + Family Entry Registry Design - 2026-09-02

Date: 2026-09-02 KST

Status: **DESIGN FROZEN · FANOUT INTENT / ADMITTED PLAN SPLIT · ATOMIC PLAN ADMISSION · STATIC TRUSTED FAMILY REGISTRY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-1 · FANOUT PLAN · FAMILY REGISTRY · DESIGN**

## 0. Purpose

MF-0 froze Multi-Family Orchestration as a control-plane capability for same-current-authority sibling fanout.

The MF-1 impact scope selected:

```text
CURRENT_SOURCE_FANOUT_PLAN_ADMISSION_AND_STATIC_FAMILY_REGISTRY
```

MF-1 now freezes the conceptual contracts and deterministic admission rules that turn a current requested source-family set into either:

```text
DORMANT
ACTIVE_SINGLE
ACTIVE_MULTI
UNSUPPORTED
```

without allowing the main model, history, presentation state, or one source family to self-authorize another family.

This is a design-only checkpoint.

No runtime producer, source-job selector, model-call topology, sidecar transport, validator code, renderer mount, DOM/CSS, persistence, context re-entry, network/media, long-chat execution, release publication, or `release-simcore` mutation is implemented or authorized here.

## 1. Authority chain

MF-1 consumes the frozen contracts from:

```text
MF-0  Multi-Family Orchestration Master Design
3M-9  Integration / Source-Irrelevant Baseline
3M-10 Major Convergence / Runtime Readiness Gates
```

It also relies on the standalone family contracts already frozen for:

```text
LIVE_REACTION
BOARD
NEWS
```

and recognizes, but does not fanout-admit:

```text
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. MF-1 product identity

MF-1 is an admission and registry contract.

It is not:

```text
a source-family selector based on free text
a semantic truth validator
a source evidence store
a model router
a persistence layer
a scheduler
a renderer
a history search system
```

Canonical rule:

```text
REQUESTED FANOUT INTENT
→ MF-1 ADMISSION
→ ADMITTED CURRENT PLAN
→ LATER FAMILY EXECUTION
```

The requested intent has no execution authority by itself.

## 3. Current source-job prerequisite

MF-1 begins only after upstream current-authority handling has established whether a current source job exists.

MF-1 must not create a source job by observing:

```text
family names in arbitrary prose
old Source Intelligence cards
legacy <COMMUNITY> text
old transcript residue
visible renderer state
model preference
fuzzy historical similarity
```

If no current source job exists:

```text
orchestrationState = DORMANT
```

No registry scan across all families, no family generation, and no structured source work should be triggered beyond the bounded current-job check.

## 4. Requested fanout intent

The conceptual admission input is:

```text
CurrentSourceFanoutIntentV1
  sourceAuthorityRef
  activationBasis
  requestedFamilies[]
  requestedScope
```

Where:

### `sourceAuthorityRef`

A current trusted authority reference supplied from the upstream current source-job authority path.

MF-1 does not manufacture or validate semantic claims from this field. Exact source-support mechanics remain owned by the existing Lineage / Handoff / Evidence / support-at-use architecture.

### `activationBasis`

First recognized design values:

```text
EXPLICIT_CURRENT_REQUEST
AUTHORIZED_PRODUCT_POLICY
```

The first-safe behavior should prefer `EXPLICIT_CURRENT_REQUEST`.

`AUTHORIZED_PRODUCT_POLICY` remains a valid future control-plane basis only if a separate trusted product-policy design explicitly authorizes it.

### `requestedFamilies[]`

A finite list of exact canonical family keys.

### `requestedScope`

A bounded descriptor that allows admission to reject plans requiring currently deferred architecture.

First-safe scope is equivalent to:

```text
CURRENT_AUTHORITY_SIBLING_FANOUT
CURRENT_PROJECTION_ONLY
READ_ONLY
NON_PERSISTENT
NO_DERIVED_TO_DERIVED_PROPAGATION
NO_HISTORICAL_RETRIEVAL
NO_USER_MUTATION
NO_REQUIRED_NETWORK_MEDIA
```

This remains conceptual vocabulary, not persistent schema authorization.

## 5. Canonical family keys

MF-1 recognizes these exact family identifiers:

```text
LIVE_REACTION
BOARD
NEWS
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

No fuzzy aliases are frozen in MF-1.

Therefore ordinary admission does not reinterpret:

```text
SNS
SOCIAL
FORUM
ARTICLE
WIKI
REACTIONS
```

as canonical keys.

Any natural-language interpretation belongs upstream before MF-1.

Canonical rule:

```text
FAMILY KEY PARSING
= EXACT CONTROL-PLANE IDENTITY

FAMILY KEY PARSING
!= NATURAL-LANGUAGE INTENT CLASSIFICATION
```

## 6. Fanout family registry

The conceptual trusted registry is:

```text
FanoutEligibleFamilyRegistryV1
```

Each known family entry conceptually contains:

```text
familyKey
entryState
canonicalOrdinal
standaloneContractRef
fanoutEntryContractRef?
```

The registry is trusted control-plane configuration.

It is not generated by the main model and is not derived from visible source content.

## 7. Registry entry states

MF-1 freezes three stored entry states:

```text
ELIGIBLE
ENTRY_REVIEW_REQUIRED
DISABLED
```

Lookup may additionally return:

```text
UNKNOWN
```

### `ELIGIBLE`

The family may participate in the currently frozen sibling-fanout scope.

### `ENTRY_REVIEW_REQUIRED`

The family exists as a Source Intelligence family but has not yet proven that its standalone contract is safe inside multi-family sibling fanout.

### `DISABLED`

The family is known but fanout participation has been explicitly suspended by a later trusted design/release decision.

### `UNKNOWN`

No registry identity exists for the supplied family key.

## 8. Initial registry snapshot

MF-1 freezes the following first snapshot:

```text
LIVE_REACTION
  state = ELIGIBLE
  canonicalOrdinal = 10

BOARD
  state = ELIGIBLE
  canonicalOrdinal = 20

NEWS
  state = ELIGIBLE
  canonicalOrdinal = 30

SOCIAL_FEED
  state = ENTRY_REVIEW_REQUIRED
  canonicalOrdinal = 40

PUBLIC_KNOWLEDGE
  state = ENTRY_REVIEW_REQUIRED
  canonicalOrdinal = 50
```

The concrete ordinal numbers are conceptual deterministic ordering markers, not runtime constants authorized for implementation.

No family is currently frozen as `DISABLED`.

## 9. Why the registry is static/trusted

A family's fanout eligibility is an architectural property, not a content-level opinion.

Therefore it must not be changed by:

```text
main-model output
source sidecar values
user BOARD posts
SOCIAL_FEED content
renderer controls
history content
source popularity
sibling consensus
```

The first-safe design expects registry changes only through a trusted design/release transaction such as MF-5 or MF-6 entry review.

No user-editable or persistent runtime registry store is authorized here.

## 10. Registry promotion rule

A family may move:

```text
ENTRY_REVIEW_REQUIRED
→ ELIGIBLE
```

only after its dedicated fanout-entry review is frozen and later implementation/release authority adopts that decision.

Ordinary fanout admission must never perform this promotion itself.

Canonical rule:

```text
ADMISSION CHECKS ELIGIBILITY
ADMISSION DOES NOT CREATE ELIGIBILITY
```

## 11. Family-entry proof minimum

MF-0 requires a future entry review to prove at least:

```text
1. standalone semantic contract is frozen
2. selected fanout lifetime is current-projection safe
3. no required persistence/history/retrieval exists
4. family validation is independent of sibling output
5. presentation adapter contract exists
6. family cost is bounded
7. family failure is isolatable
8. source-authority exact join can use the shared current root
```

MF-1 treats these proofs as registry-authority inputs, not as runtime work to be repeated on every request.

## 12. Admission result model

MF-1 freezes the conceptual output:

```text
FanoutPlanAdmissionResultV1
  orchestrationState
  admissionDisposition
  reasonCode
  admittedPlan?
  receipt
```

Where:

```text
orchestrationState
= DORMANT | ACTIVE_SINGLE | ACTIVE_MULTI | UNSUPPORTED
```

and:

```text
admissionDisposition
= NOT_APPLICABLE | ADMITTED | REJECTED
```

The `admittedPlan` exists only when disposition is `ADMITTED`.

## 13. Immutable admitted plan

The conceptual admitted plan is:

```text
AdmittedCurrentSourceFanoutPlanV1
  sourceAuthorityRef
  activationBasis
  canonicalFamilies[]
  fanoutCardinality
  currentProjectionOnly = true
  siblingFanoutOnly = true
```

Once admitted for the current projection window, family identity and source root are immutable.

A downstream producer cannot append another family.

A renderer cannot remove a family from semantic admission merely because its surface is collapsed.

A family validator cannot replace the plan with another family set.

## 14. Admission algorithm overview

MF-1 freezes this conceptual admission order:

```text
A0. determine whether current source job exists
A1. validate current authority-root shape
A2. validate requested-family container shape
A3. validate family list is non-empty for an explicit source job
A4. validate exact canonical family keys
A5. reject duplicate keys
A6. lookup all requested families in trusted registry
A7. reject UNKNOWN entries
A8. reject ENTRY_REVIEW_REQUIRED entries
A9. reject DISABLED entries
A10. reject deferred requested scope
A11. canonicalize family order
A12. derive cardinality and orchestration state
A13. freeze immutable admitted current plan
```

MF-3 later owns aggregate budget admission and detailed failure matrix beyond the MF-1 structural boundary.

MF-1 may recognize that a future hard family-count cap exists, but concrete aggregate budget values remain MF-3/runtime-readiness territory.

## 15. A0 - no current source job

If upstream current authority says no source job exists:

```text
orchestrationState = DORMANT
admissionDisposition = NOT_APPLICABLE
reasonCode = NO_CURRENT_SOURCE_JOB
admittedPlan = none
```

This is not an error.

It is the ordinary source-irrelevant baseline.

## 16. A1 - source authority shape

The first fanout scope requires one current trusted root.

If the candidate intent represents multiple independent roots:

```text
orchestrationState = UNSUPPORTED
admissionDisposition = REJECTED
reasonCode = UNSUPPORTED_MULTI_AUTHORITY_FANOUT
```

No family lanes are dispatched.

MF-1 does not merge roots or choose one root heuristically.

## 17. A2/A3 - family container and emptiness

For an explicit current source job, `requestedFamilies[]` must be a finite non-empty list.

Examples:

```text
[]
→ INVALID_EMPTY_FAMILY_SET

null / malformed container
→ INVALID_FAMILY_SET_SHAPE
```

MF-1 must not choose a default family for an empty request.

## 18. A4 - exact family identity

Each requested key must exactly match a known canonical key grammar.

Malformed keys are invalid before registry-state evaluation.

The admission layer must not use fuzzy matching, substring matching, or model interpretation.

## 19. A5 - duplicates

Duplicate family keys reject the plan.

```text
[BOARD, BOARD]
→ INVALID_DUPLICATE_FAMILY
```

The design intentionally does not silently deduplicate.

Reason:

A malformed upstream plan should remain observable instead of being repaired invisibly by orchestration.

## 20. A6-A9 - registry lookup and atomic rejection

Registry evaluation is all-or-nothing for plan admission.

Examples:

```text
[LIVE_REACTION, BOARD]
→ both ELIGIBLE
→ continue
```

```text
[BOARD, SOCIAL_FEED]
→ SOCIAL_FEED = ENTRY_REVIEW_REQUIRED
→ reject whole plan
```

```text
[NEWS, UNKNOWN_X]
→ UNKNOWN_X = UNKNOWN
→ reject whole plan
```

```text
[LIVE_REACTION, FUTURE_DISABLED_FAMILY]
→ one entry = DISABLED
→ reject whole plan
```

Canonical rule:

```text
NO SILENT FAMILY SUBSTITUTION
NO SILENT FAMILY DROPPING
NO PARTIAL ADMISSION
```

## 21. Atomic admission vs later partial success

This distinction is critical.

### Admission phase

```text
requested family set structurally legal?
```

Atomic.

One illegal family means no plan.

### Execution/validation phase

```text
what outcome does each legal family produce?
```

May partially succeed.

Example:

```text
[BOARD, NEWS]
→ both admitted
→ BOARD succeeds
→ NEWS maturity HOLD
```

This is a legal partial execution outcome.

But:

```text
[BOARD, SOCIAL_FEED]
→ SOCIAL_FEED not entry-approved
```

must never become:

```text
BOARD runs anyway
```

under MF-1 admission.

## 22. A10 - deferred-scope rejection

Even when all family keys are `ELIGIBLE`, MF-1 rejects a plan if the requested scope requires architecture excluded by MF-0.

Examples:

```text
BOARD output becomes NEWS input
→ UNSUPPORTED_DERIVED_TO_DERIVED_PROPAGATION
```

```text
old fanout siblings retrieved from history
→ UNSUPPORTED_CROSS_TURN_FANOUT_HISTORY
```

```text
one family uses root A and another uses root B
→ UNSUPPORTED_MULTI_AUTHORITY_FANOUT
```

```text
user mutates one sibling as part of this plan
→ UNSUPPORTED_FANOUT_MUTATION_SCOPE
```

These are not optional fields to ignore.

They change the authority/lifetime model and therefore reject the first-scope plan.

## 23. A11 - deterministic canonical ordering

After legality is established, admitted families are normalized into deterministic registry order.

For the first registry:

```text
LIVE_REACTION
BOARD
NEWS
```

Thus:

```text
input [NEWS, LIVE_REACTION]
→ canonicalFamilies [LIVE_REACTION, NEWS]
```

This normalization affects deterministic control-plane representation only.

It does not mean:

```text
LIVE_REACTION is more true than NEWS
LIVE_REACTION has higher confidence
NEWS is lower priority
```

Presentation-order customization, if ever supported, must be a separate explicit field/policy rather than encoded by family identity ordering.

## 24. A12 - cardinality and state derivation

After canonicalization:

```text
family count = 1
→ ACTIVE_SINGLE
```

```text
family count >= 2
→ ACTIVE_MULTI
```

First eligible family set naturally limits design examples to at most three siblings.

Concrete runtime fanout caps are not authorized here and remain MF-3/runtime-readiness work.

## 25. Single-family compatibility

MF-1 must preserve the existing single-family path.

A legal one-family source job becomes:

```text
ACTIVE_SINGLE
```

It must not be wrapped in artificial multi-family semantics that change standalone family validation or presentation contracts.

Canonical rule:

```text
MULTI-FAMILY CONTROL PLANE
MUST NOT REGRESS
SINGLE-FAMILY EXECUTION
```

## 26. Multi-family plan immutability

For the current projection window, the admitted plan is immutable.

Forbidden downstream mutation:

```text
model adds NEWS after seeing BOARD draft
renderer drops BOARD because mount space is small
NEWS validator adds PUBLIC_KNOWLEDGE
one family outcome rewrites sourceAuthorityRef
```

Any new family set requires a new current planning/admission decision.

## 27. Activation basis rules

First recognized activation values:

```text
EXPLICIT_CURRENT_REQUEST
AUTHORIZED_PRODUCT_POLICY
```

MF-1 does not create `AUTHORIZED_PRODUCT_POLICY` authority.

It only reserves the enum boundary for a later trusted product-policy design.

For the current first-safe design:

```text
EXPLICIT_CURRENT_REQUEST
= preferred proven path
```

An activation basis supplied by model output, history residue, or renderer state is invalid.

## 28. Activation basis does not change truth authority

Whether a fanout was explicitly requested or product-policy authorized affects why the plan exists, not whether a claim is true.

```text
activationBasis
!= source evidence
!= exposure proof
!= NEWS maturity proof
```

Family validators still require their native authority inputs.

## 29. Registry versioning pressure

MF-1 recognizes that future runtime implementation may need a bounded registry version or build identity for diagnostics/reproducibility.

However, it does not freeze a persistent registry version schema here.

A future implementation may expose a build-local identifier if needed, provided it does not create cross-turn semantic identity.

## 30. Admission receipt

The conceptual bounded receipt is:

```text
FanoutPlanAdmissionReceiptV1
  orchestrationState
  reasonCode
  requestedFamilyCount
  admittedFamilyCount
  activationBasis
  canonicalFamilies[]?
```

The receipt may include family keys because family identity is control-plane metadata, not hidden semantic content.

It must not include:

```text
source text
quarantined claims
hidden Knowledge content
old source history
full Evidence payloads
full family sidecars
```

## 31. Frozen reason-code taxonomy

MF-1 freezes the following conceptual reason codes:

```text
NO_CURRENT_SOURCE_JOB

INVALID_SOURCE_AUTHORITY_SHAPE
INVALID_FAMILY_SET_SHAPE
INVALID_EMPTY_FAMILY_SET
INVALID_FAMILY_KEY_SHAPE
INVALID_DUPLICATE_FAMILY

UNSUPPORTED_UNKNOWN_FAMILY
UNSUPPORTED_FAMILY_ENTRY_REVIEW_REQUIRED
UNSUPPORTED_FAMILY_DISABLED
UNSUPPORTED_MULTI_AUTHORITY_FANOUT
UNSUPPORTED_DERIVED_TO_DERIVED_PROPAGATION
UNSUPPORTED_CROSS_TURN_FANOUT_HISTORY
UNSUPPORTED_FANOUT_MUTATION_SCOPE
UNSUPPORTED_DEFERRED_SCOPE

ADMITTED_SINGLE
ADMITTED_MULTI
```

Future MF checkpoints may add narrower reason codes but must not collapse important authority distinctions into a generic success/failure flag.

## 32. State/reason consistency

Conceptual consistency rules:

```text
NO_CURRENT_SOURCE_JOB
→ DORMANT / NOT_APPLICABLE
```

```text
ADMITTED_SINGLE
→ ACTIVE_SINGLE / ADMITTED
```

```text
ADMITTED_MULTI
→ ACTIVE_MULTI / ADMITTED
```

All `INVALID_*` or `UNSUPPORTED_*` plan-admission reasons:

```text
→ UNSUPPORTED / REJECTED
```

The term `UNSUPPORTED` at the orchestration state level therefore includes malformed/unsupported current fanout plans but does not imply the entire SimCore request must fail.

The outer product may continue ordinary response behavior according to a separately frozen fallback contract.

MF-1 does not invent that fallback here.

## 33. No hidden fallback family

MF-1 specifically forbids:

```text
invalid multi-family request
→ silently choose LIVE_REACTION
```

or:

```text
NEWS not eligible
→ silently use BOARD
```

No family is a universal fallback.

If product UX later wants explicit fallback behavior, that must be a separately authorized current planning decision visible before admission.

## 34. No family truth voting

The registry grants execution eligibility only.

It must never encode:

```text
truth confidence
social consensus
publication confidence
canonical-world priority
```

Therefore registry order or entry state cannot be used to resolve conflicting family content.

## 35. No sibling-derived admission

A family cannot become requested or eligible merely because another family generated text suggesting it.

Example:

```text
BOARD draft says "this should be on the news"
```

must not mutate:

```text
[BOARD]
→ [BOARD, NEWS]
```

The plan was frozen before family draft execution.

## 36. No presentation-derived admission

Likewise, presentation state cannot change semantic admission.

Examples:

```text
user expands NEWS card
→ does not activate NEWS semantics
```

```text
BOARD card mount fails
→ does not rewrite admitted family set
```

Presentation failure belongs later in the orchestration result/failure model.

## 37. No history-derived admission

Prior fanout activity is not current fanout authority.

```text
previous turn = [LIVE_REACTION, BOARD, NEWS]
current turn = ordinary conversation
```

must remain:

```text
DORMANT
```

unless current source-job authority explicitly creates a new current fanout intent.

## 38. Family registry and future SOCIAL_FEED review

SOCIAL_FEED remains:

```text
ENTRY_REVIEW_REQUIRED
```

until MF-5 proves its standalone snapshot-local actor/graph/reachability contract is safe in sibling fanout.

MF-1 does not pre-approve it merely because a standalone SOCIAL_FEED design exists.

## 39. Family registry and future PUBLIC_KNOWLEDGE review

PUBLIC_KNOWLEDGE remains:

```text
ENTRY_REVIEW_REQUIRED
```

until MF-6 proves that sibling fanout does not let NEWS/BOARD/SOCIAL outputs become settlement evidence accidentally.

This is especially important because:

```text
same event has multiple public projections
!= settled public knowledge
```

## 40. Candidate C status

MF-1 introduces no:

```text
cross-turn source survival
stable sibling identity
item-level mutation
append/merge revision
cross-family propagation
future context re-entry
partial descendant salvage
delayed semantic attachment
```

Therefore:

```text
Candidate C = NOT ACTIVATED
```

## 41. Source-support boundary

MF-1 validates plan structure and family admission eligibility.

It does not replace support-at-use.

An admitted plan whose shared source authority later becomes stale must still be invalidated by the source-support contract from 3M-6/MF-0.

Canonical rule:

```text
PLAN ADMITTED ONCE
!= SOURCE AUTHORITY VALID FOREVER
```

## 42. Budget boundary

MF-1 performs structural admission before expensive family work.

MF-3 will own detailed aggregate budget admission.

Therefore MF-1 freezes only these principles:

```text
reject obviously illegal cardinality/scope before generation
never enumerate old history to decide admission
never scan every past family projection
registry lookup cost is bounded by requested family count
```

Concrete hard caps remain future work.

## 43. Complexity target

For `n = requested family count`, MF-1 admission should be conceptually bounded by:

```text
O(n)
```

with a tiny static registry.

It must not scale with:

```text
conversation length
number of prior source projections
number of old rendered cards
historical source objects
```

## 44. Main-model role

The main model may generate content only after plan admission and only for admitted family keys.

The model does not own:

```text
activation basis
family registry state
family-list mutation
admission disposition
sourceAuthorityRef
control-plane state
```

## 45. SimCore role

SimCore control-plane ownership includes:

```text
consuming current fanout intent
registry lookup
structural admission
canonical family normalization
single vs multi state derivation
immutable admitted-plan creation
bounded admission diagnostics
```

This ownership does not extend into family-native semantic policy.

## 46. Presentation role

Presentation receives family results later.

It does not consume unadmitted intent as semantic authority and does not alter registry/admission state.

MF-4 later owns multi-family presentation-stack details.

## 47. Validation design matrix

A future mechanical/runtime validation suite for MF-1 should cover at least:

```text
F1  no current source job → DORMANT
F2  [LIVE_REACTION] → ACTIVE_SINGLE
F3  [BOARD] → ACTIVE_SINGLE
F4  [NEWS] → ACTIVE_SINGLE
F5  [LIVE_REACTION, BOARD] → ACTIVE_MULTI
F6  [LIVE_REACTION, NEWS] → ACTIVE_MULTI
F7  [BOARD, NEWS] → ACTIVE_MULTI
F8  all three eligible families → ACTIVE_MULTI
F9  reversed request order normalizes deterministically
F10 duplicate family rejects whole plan
F11 unknown family rejects whole plan
F12 SOCIAL_FEED rejects while entry review required
F13 PUBLIC_KNOWLEDGE rejects while entry review required
F14 empty explicit family set rejects
F15 multi-authority intent rejects
F16 derived-to-derived requested scope rejects
F17 cross-turn history requested scope rejects
F18 user-mutation fanout scope rejects
F19 model-suggested extra family cannot mutate admitted plan
F20 renderer state cannot mutate admitted plan
F21 prior-turn fanout does not activate current turn
F22 admitted single-family path preserves standalone behavior
```

These are design requirements only. No runtime validation is claimed here.

## 48. Follow-up handoff to MF-2

MF-2 should receive only an admitted plan and then design:

```text
SharedCurrentSourceAuthorityBundleV1
family-lane authority inputs
lane isolation
exact authority sharing boundaries
prohibition on sibling-derived evidence
```

MF-2 must not reopen family selection or registry admission.

Canonical handoff:

```text
MF-1 decides WHICH family lanes may exist
MF-2 decides WHAT trusted current authority package those lanes may share
```

## 49. Follow-up handoff to MF-3

MF-3 should add:

```text
aggregate semantic budget
family-count hard cap
aggregate receipt cap
model-call budget
presentation-node budget
plan-wide vs family-local failure matrix
```

MF-3 must preserve MF-1's atomic structural admission.

## 50. Follow-up handoff to MF-5 / MF-6

MF-5 and MF-6 are the only planned checkpoints authorized to reassess the current entry-review status of:

```text
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

Any promotion should be explicit and evidence-backed.

## 51. Runtime blockers preserved

MF-1 does not solve:

```text
ACTIVE_SOURCE_JOB_SELECTION_AUTHORITY
PHYSICAL_REQUEST_TO_PLAN_PRODUCER
STRUCTURED_SIDECAR_PRODUCER_AND_TRANSPORT
PHYSICAL_MULTI_FAMILY_MODEL_CALL_TOPOLOGY
SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY
CONCRETE_FAMILY_AND_AGGREGATE_HARD_CAPS
NEWS_TRUSTED_MATURITY_CONTEXT_PRODUCER
FANOUT_INSTRUMENTATION_AND_REAL_PERFORMANCE_EVIDENCE
TARGET_HOST_EXPOSURE_MODEL_COMPLIANCE
```

No implementation may treat this design document as proof that those blockers are resolved.

## 52. Non-impact declaration

This design changes no:

```text
production runtime code
Mode A/B/C semantics
legacy <COMMUNITY> behavior
prompt bytes
visible output bytes
persistent Core state
source history policy
Candidate C state
DOM/CSS
network behavior
model-call count
release branch
release-simcore
```

## 53. Frozen MF-1 result

```text
CHECKPOINT = MF-1
PRODUCT = FANOUT PLAN + FAMILY ENTRY REGISTRY

INTENT = CurrentSourceFanoutIntentV1
INTENT_EXECUTION_AUTHORITY = NONE

REGISTRY = FanoutEligibleFamilyRegistryV1
REGISTRY_AUTHORITY = TRUSTED_STATIC_CONTROL_PLANE

ELIGIBLE = LIVE_REACTION + BOARD + NEWS
ENTRY_REVIEW_REQUIRED = SOCIAL_FEED + PUBLIC_KNOWLEDGE
DISABLED = NONE CURRENTLY

PLAN_ADMISSION = ATOMIC
FAMILY_KEY_MATCH = EXACT CANONICAL ONLY
DUPLICATES = REJECT
UNKNOWN = REJECT WHOLE PLAN
ENTRY_REVIEW_REQUIRED = REJECT WHOLE PLAN
DISABLED = REJECT WHOLE PLAN
MULTI_AUTHORITY = REJECT
DERIVED_TO_DERIVED = REJECT
CROSS_TURN_HISTORY = REJECT
FANOUT_MUTATION_SCOPE = REJECT

ONE ADMITTED FAMILY = ACTIVE_SINGLE
TWO_OR_MORE ADMITTED FAMILIES = ACTIVE_MULTI
NO CURRENT SOURCE JOB = DORMANT
INVALID / UNSUPPORTED PLAN = UNSUPPORTED

ADMITTED PLAN = IMMUTABLE FOR CURRENT PROJECTION
PLAN ORDER = DETERMINISTIC CANONICAL FAMILY ORDER
PLAN ORDER != TRUTH RANK

PARTIAL SUCCESS = ONLY AFTER VALID PLAN ADMISSION
CANDIDATE_C = NOT ACTIVATED
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED

NEXT = MF-2 Shared Current Authority Bundle + Family-Lane Isolation
```