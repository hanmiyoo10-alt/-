# SimCore Post-3.0M Multi-Family Orchestration Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **READ-ONLY IMPACT SCOPE COMPLETE · SIBLING FANOUT SELECTED · CROSS-FAMILY PROPAGATION DEFERRED · DESIGN-ONLY · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · IMPACT SCOPE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

This document selects the narrow architectural seam for the post-3.0M Multi-Family Orchestration follow-up.

The selected problem is:

```text
one current authoritative source/event
→ two or more independent source-family projections
→ visible in the same current response/presentation window
```

The first design does **not** treat one derived family as truth/source authority for another.

Canonical split:

```text
SIMULTANEOUS SIBLING FANOUT
!=
CROSS-FAMILY PROPAGATION
```

This checkpoint is design-only. It does not implement scheduler code, model-call topology, sidecar transport, validation code, DOM/CSS, persistence, context re-entry, long-chat execution, or release changes.

## 1. Authority inputs

This impact scope consumes the frozen contracts from:

```text
3M-2  Assertion / Exposure
3M-3  Structured Sidecar / Validator split
3M-4  Presentation Renderer architecture
3M-5  BOARD
3M-6  Current-projection support invalidation
3M-7  Zero additional structured source re-entry
3M-8  NEWS publication maturity
3M-9  One-family-per-projection integration / dormancy
3M-10 Major convergence / Candidate C status
Post-3M SOCIAL_FEED master design
Post-3M PUBLIC_KNOWLEDGE settlement master design
Post-3M Follow-up Design Catalog
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Current blocker being reopened deliberately

3M-9 froze:

```text
one orchestration decision
→ at most one ACTIVE family
→ one current projection
```

and explicitly required a separate design before simultaneous family fanout.

This follow-up is that separate design.

It does not rewrite the 3M-9 dormancy rule. Ordinary source-irrelevant requests must remain dormant.

## 3. Candidate problem classes

Four nearby problems were considered.

### A · Sibling fanout from one current authority

Example:

```text
current public B-root event E
→ LIVE_REACTION(E)
→ BOARD(E)
→ NEWS(E)
```

All families consume the same current trusted authority basis independently.

### B · Derived-to-derived propagation

Example:

```text
BOARD rumor object
→ later NEWS attributed-rumor story
```

This makes a derived object part of another derived object's provenance chain and activates Candidate C C5 pressure.

### C · Multi-authority composition

Example:

```text
BOARD from source A
+ NEWS from source B
+ SOCIAL_FEED from source C
```

This requires more than one current source-authority root and a stronger plan/provenance model.

### D · Cross-turn fanout history

Example:

```text
old BOARD
+ old NEWS
+ current SOCIAL_FEED
→ one composite view
```

This activates persistence/retrieval/re-entry pressure.

## 4. Selected first seam

Selected:

```text
CURRENT_AUTHORITY_SIBLING_MULTI_FAMILY_FANOUT
```

First-safe constraints:

```text
ONE current source authority root
CURRENT projection only
READ-ONLY
NON-PERSISTENT
NO automatic context re-entry
NO derived-to-derived truth/source propagation
NO network/media requirement
NO item mutation
NO historical source retrieval
```

This seam maximizes new orchestration behavior while preserving the current Source Intelligence lifetime model.

## 5. Why sibling fanout does not activate Candidate C by itself

Candidate C C5 concerns derived-to-derived lineage.

Sibling fanout is instead:

```text
trusted current authority E
  ├→ family A projection
  ├→ family B projection
  └→ family C projection
```

not:

```text
family A projection
→ family B projection
```

Therefore the first design can keep:

```text
C1 = no cross-turn derived survival
C2 = no stable derived identity
C3 = no item mutation
C4 = no append/merge/revision
C5 = no derived-to-derived lineage
C6 = no future context re-entry
C7 = no partial stale descendant survival
C8 = no delayed semantic side effect
```

Candidate C remains conditionally ready but not activated.

## 6. Initial fanout family set

The safest initial orchestration set is the already-converged 3.0M first-major trio:

```text
LIVE_REACTION
BOARD
NEWS
```

Why:

- each already has a frozen standalone semantic policy;
- each already has a distinct presentation adapter contract;
- all are current-projection / snapshot compatible;
- none requires durable source identity;
- they exercise reaction, discussion, and publication semantics without cross-family truth promotion.

`SOCIAL_FEED` and `PUBLIC_KNOWLEDGE` are follow-up family candidates, but should enter multi-family orchestration only after an explicit **fanout-entry review** proves their standalone contract is sufficiently complete and current-projection compatible.

Canonical rule:

```text
FAMILY DESIGNED
!=
FAMILY AUTOMATICALLY FANOUT-ELIGIBLE
```

## 7. New control-plane pressure

3M-9's conceptual state:

```text
DORMANT | ACTIVE | UNSUPPORTED
```

must be extended conceptually without breaking the single-family path.

Selected direction:

```text
DORMANT
ACTIVE_SINGLE
ACTIVE_MULTI
UNSUPPORTED
```

`ACTIVE_SINGLE` preserves the original 3M-9 behavior.

`ACTIVE_MULTI` means an upstream current-task/source-job authority has explicitly authorized more than one family for the same current source root.

The orchestration layer must not infer `ACTIVE_MULTI` from history, renderer cards, old Community text, or lexical family-name matching.

## 8. Upstream plan ownership

The multi-family layer consumes an already-authorized plan.

It does not decide on its own that an event "deserves" multiple source surfaces.

Conceptual upstream plan:

```text
CurrentSourceFanoutPlanV1
  sourceAuthorityRef
  activationBasis
  requestedFamilies[]
```

`activationBasis` may eventually distinguish:

```text
EXPLICIT_CURRENT_REQUEST
AUTHORIZED_PRODUCT_POLICY
```

The first safe product scope should prefer explicit/current authorization over automatic background fanout.

The model must not own family selection.

## 9. Shared authority, independent semantics

All sibling lanes may share immutable trusted current authority inputs such as:

```text
current sourceAuthorityRef
current source evidence / lineage context
current exposure basis inputs
current frame/time context when required
```

But they must not share:

```text
sibling generated prose
sibling validated payload as truth proof
sibling quarantine result as canonical fact
sibling renderer state
```

Canonical rule:

```text
SHARED CURRENT AUTHORITY
IS ALLOWED

SHARED DERIVED TRUTH AUTHORITY
IS FORBIDDEN
```

## 10. Logical fanout graph

Selected conceptual graph:

```text
CurrentSourceFanoutPlanV1
        ↓
plan admission
        ↓
shared current authority package
        ├──────────────────────────────┐
        ↓                              ↓
LIVE_REACTION lane                 BOARD lane
        ↓                              ↓
3M-2 / 3M-3 policy                BOARD policy
        ↓                              ↓
validated sibling A               validated sibling B
        │                              │
        └──────────────┬───────────────┘
                       ↓
                  NEWS lane
                       ↓
               maturity + story policy
                       ↓
               validated sibling C
                       ↓
              presentation aggregation
```

The diagram is logical only. It does **not** authorize NEWS to consume A/B outputs. All lanes consume the same trusted authority package independently.

## 11. Physical model-call topology remains separate

The semantic architecture must not depend on whether a future implementation uses:

```text
one model call producing multiple bounded family drafts
or
one bounded model call per family
or
another proven equivalent topology
```

That is a future producer/transport/runtime-readiness question.

Required invariant:

```text
PHYSICAL GENERATION TOPOLOGY
MUST NOT CHANGE
FAMILY AUTHORITY / VALIDATION SEMANTICS
```

## 12. Admission before execution

Multi-family work must be bounded before expensive family-specific work starts.

Conceptual admission checks:

```text
1. current source job exists
2. source authority shape is supported
3. requested family list is non-empty and unique
4. family count is within fanout cap
5. every family is fanout-eligible
6. aggregate family budget is admissible
7. no requested family requires forbidden history/persistence/propagation
```

No silent family substitution is allowed.

## 13. Failure isolation classes

The first design must distinguish plan-wide failures from family-local failures.

### Plan-wide invalidation

Examples:

```text
shared source authority missing
shared source authority mismatch/stale
invalid fanout plan
aggregate budget impossible
```

Result:

```text
whole fanout plan invalid
```

### Family-local semantic failure

Examples:

```text
NEWS maturity HOLD
BOARD family-specific dependency quarantine
one family's unsupported semantic subshape
```

Result:

```text
that family may be withheld/quarantined
siblings remain independently valid
```

### Family-local presentation failure

Example:

```text
BOARD renderer mount fails
```

Result:

```text
BOARD presentation unavailable
LIVE_REACTION / NEWS semantics unaffected
```

Ordinary UI must not leak quarantined hidden content or detailed policy reasons.

## 14. Expected partial outcomes

Multi-family does **not** mean every family must always succeed together.

Example:

```text
current event is exposed immediately

LIVE_REACTION = eligible
BOARD         = eligible
NEWS          = HOLD_UNKNOWN_OR_EARLY_MATURITY
```

This is a valid partial semantic outcome because NEWS has a stronger maturity policy.

Canonical rule:

```text
SIBLING POLICY DIFFERENCE
!=
ORCHESTRATION INCONSISTENCY
```

## 15. Presentation impact

Presentation should remain a stack/collection of independent family surfaces rather than one flattened mega-schema.

Conceptual container:

```text
SourcePresentationStackV1
  ├ LIVE_REACTION_STREAM_V1
  ├ BOARD_THREAD_V1
  └ NEWS_ARTICLE_V1
```

The stack controls only:

```text
ordering
visibility slot
collapse/expand UI state
family-local mount boundary
```

It does not merge semantic objects or create cross-family truth authority.

## 16. Ordering policy

For the initial trio, a deterministic default presentation order is reasonable:

```text
LIVE_REACTION
BOARD
NEWS
```

This reflects increasing publication structure, not truth confidence.

Canonical rule:

```text
DISPLAY ORDER
!=
TRUTH RANK
```

Future family registry expansion may define a stable family presentation-order key.

## 17. Reroll / edit boundary

First-safe multi-family fanout remains current-projection scoped.

If the shared source authority changes:

```text
invalidate every sibling projection derived from that old authority
```

Targeted reroll/edit of only one persistent sibling while preserving old siblings is **not** included in the first design because it creates generation/provenance and partial-survival pressure.

That future requirement must reassess Candidate C C3/C7.

## 18. Cost shape

DORMANT requests retain 3M-9 zero-semantic-burden behavior.

For `ACTIVE_MULTI`, cost should scale with the bounded sum of current sibling projections only:

```text
cost
≈ Σ current requested family cost
```

not with:

```text
all prior source history
all prior fanout runs
all registered families
```

Required future concrete controls:

```text
MAX_FAMILIES_PER_FANOUT
family hard caps
aggregate semantic-char cap
aggregate validation-receipt cap
presentation-node cap
model-call/token budget
```

The first initial family set naturally supports a conservative design ceiling of at most three active sibling families, but exact runtime caps remain implementation-readiness inputs.

## 19. Cross-family propagation is explicitly deferred

This impact scope does not authorize:

```text
BOARD rumor
→ NEWS story

SOCIAL_FEED repost
→ PUBLIC_KNOWLEDGE settlement

NEWS report
→ BOARD confirmed fact
```

Such flows may be useful, but they are a different architecture:

```text
DERIVED SOURCE OBJECT
→ NEW DERIVED SOURCE OBJECT
```

and therefore require explicit provenance / attribution / invalidation semantics and Candidate C C5 reassessment.

## 20. Selected next design seam

The next design document should freeze:

```text
MULTI_FAMILY_SIBLING_ORCHESTRATION_MASTER
```

with:

```text
control-plane state model
fanout plan ownership
fanout-entry registry
shared-authority package
family-lane isolation
admission/budget model
failure matrix
presentation stack
Candidate C boundary
future extension points
```

## 21. Frozen impact result

```text
SELECTED = CURRENT_AUTHORITY_SIBLING_MULTI_FAMILY_FANOUT
INITIAL_FAMILIES = LIVE_REACTION + BOARD + NEWS
SOCIAL_FEED_FANOUT_ENTRY = REVIEW_REQUIRED
PUBLIC_KNOWLEDGE_FANOUT_ENTRY = REVIEW_REQUIRED
CROSS_FAMILY_PROPAGATION = DEFERRED
MULTI_AUTHORITY_COMPOSITION = DEFERRED
CROSS_TURN_FANOUT_HISTORY = DEFERRED
CANDIDATE_C = CLOSED
RUNTIME_IMPLEMENTATION = NOT_AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```
