# SimCore Post-3.0M MF-4 Presentation Stack + Ordering / Mount Isolation Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **IMPACT SCOPE FROZEN · DESIGN-ONLY · PRESENTATION-ONLY STACK · DETERMINISTIC FAMILY ORDER · FAMILY MOUNT ISOLATION · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-4 · IMPACT SCOPE**

## 0. Purpose

MF-0 froze `SourcePresentationStackV1` as a presentation-only collection of independent family surfaces.
MF-2 froze semantic lane isolation.
MF-3 froze family-local presentation failures as distinct from semantic and plan-wide failures.

MF-4 asks:

```text
Given a budget-admitted current multi-family execution whose family validators have produced independent outcomes,
how should renderable family surfaces be ordered, mounted, updated, collapsed, failed, and disposed
without allowing presentation state to alter semantic authority or sibling results?
```

This checkpoint is design-only.

It does not implement DOM/CSS, host selectors/APIs, presentation mounts, adapters, event listeners, view-state persistence, source generation, validators, model calls, transport, network/media, release publication, or `release-simcore` mutation.

## 1. Authority chain reviewed

MF-4 consumes:

```text
3M-4  Presentation Renderer Architecture
3M-5  BOARD presentation grammar
3M-8  NEWS presentation grammar
MF-0  Multi-Family Orchestration Master Design
MF-2  Family-lane isolation
MF-3  Aggregate budget + failure matrix
```

Initial stack families remain:

```text
LIVE_REACTION → LIVE_REACTION_STREAM_V1
BOARD         → BOARD_THREAD_V1
NEWS          → NEWS_ARTICLE_V1
```

Production remains independently authoritative on `release-simcore`.

## 2. Impact finding A — the stack is a presentation control surface, not a semantic mega-renderer

The stack must not flatten sibling schemas into one generic `SourceItem` tree.

Selected principle:

```text
SourcePresentationStackV1
= composition of already validated family presentation surfaces

SourcePresentationStackV1
!= family semantic schema
!= validator
!= source authority
!= generic renderer that rewrites family grammar
```

Each family keeps its native adapter and family-scoped DOM root.

The outer stack may own only bounded layout/lifecycle concerns.

## 3. Impact finding B — only renderable semantic outcomes may create ordinary family surfaces

MF-3 distinguishes budget admission from later family semantic outcomes.

MF-4 therefore needs an explicit presentation eligibility filter.

Conceptually:

```text
family semantic outcome
        ↓
PRESENTATION_ELIGIBLE
PRESENTATION_EMPTY_ALLOWED
PRESENTATION_WITHHELD
```

Examples:

```text
VALID / VALID_WITH_QUARANTINE with accepted payload
→ eligible

VALID_EMPTY where the family contract explicitly defines an empty source surface
→ empty-eligible

HOLD / semantic invalid / quarantined-with-no-renderable-payload
→ withheld
```

Canonical rule:

```text
WITHHELD FAMILY
!= SUCCESSFUL EMPTY FAMILY
```

MF-4 must never manufacture an empty NEWS card merely to preserve three visible slots when NEWS was HOLD.

## 4. Impact finding C — deterministic order must be independent of success timing

MF-0 froze first order:

```text
LIVE_REACTION
BOARD
NEWS
```

MF-4 should preserve this as canonical family presentation order.

If physical generation/mount completion occurs out of order, visible stack order must not become arrival order.

Forbidden:

```text
NEWS completes first
→ NEWS moves above LIVE_REACTION
```

unless a separately authorized presentation-order policy exists.

Canonical rule:

```text
COMPLETION ORDER
!= DISPLAY ORDER
```

and:

```text
DISPLAY ORDER
!= TRUTH RANK
!= CONFIDENCE RANK
```

## 5. Impact finding D — stable slot identity should be projection-local and family-keyed

For one current fanout, at most one ordinary surface exists per admitted family in the first scope.

Conceptual slot identity:

```text
CurrentFamilyPresentationSlotV1
  family
  renderInstanceKey
  currentProjectionOnly = true
```

The family key identifies the slot type.
`renderInstanceKey` isolates DOM/view-local controls.

It must not become:

```text
sourceAuthorityRef
semantic object identity
cross-turn source identity
provenance identity
persistent fanout run ID
```

No stable slot ID is needed across turns.

## 6. Impact finding E — stack slot reservation and actual DOM creation are different

MF-3 may reserve aggregate presentation-node budget for admitted families.

That does not require MF-4 to pre-mount empty DOM placeholders for every admitted family.

First-safe distinction:

```text
BUDGET RESERVATION
= cost envelope

MOUNT MATERIALIZATION
= only for renderable / explicit valid-empty family outcomes
```

Therefore a withheld NEWS lane does not require a hidden/dummy NEWS DOM subtree merely because NEWS participated in budget admission.

## 7. Impact finding F — mount failure is family-local only when stack/host integrity remains trustworthy

Examples of ordinary family-local presentation failure:

```text
BOARD adapter fails
NEWS family mount target creation fails
LIVE_REACTION family presentation model rejects
```

Result:

```text
affected family surface withheld / failed closed
other sibling semantic results remain unchanged
other sibling surfaces may remain mounted
```

However failures that compromise the common stack host/lifecycle owner have wider blast radius.

Examples:

```text
stack root belongs to stale runtime generation
common source-local placement anchor is invalidated
stack owner loses disposal authority
stack container points at a different assistant/source projection
```

These should be treated as stack/control-plane integrity failures rather than one family renderer failure.

## 8. Impact finding G — one family cannot mutate sibling DOM or view state

Each family renderer must mount beneath its own family root.

Forbidden:

```text
BOARD adapter queries/mutates NEWS subtree
NEWS adapter collapses LIVE_REACTION
LIVE_REACTION listener rewrites stack order
family CSS selector leaks into sibling root
```

Outer stack may control only its own wrapper and family slot container state.

Canonical rule:

```text
STACK OWNS COMPOSITION
FAMILY RENDERER OWNS ITS OWN SUBTREE
```

## 9. Impact finding H — stack CSS must be shallow

Conceptual root:

```text
[data-simcore-source-stack="multi-family"]
```

Family roots remain:

```text
[data-simcore-source-family="live-reaction"]
[data-simcore-source-family="board"]
[data-simcore-source-family="news"]
```

Stack CSS may own:

```text
stack flow/grid
gap
outer responsive arrangement
slot spacing
bounded stack-level chrome
```

It must not reach into family internals and restyle:

```text
board posts/replies
news headline/body grammar
live reaction items
```

No generic `.card`, `.item`, `button`, `img`, `article` selectors are authorized.

## 10. Impact finding I — responsive layout is presentation-only and must preserve canonical reading order

Future responsive layouts may change geometry, for example:

```text
wide host  → bounded multi-column arrangement if proven
narrow host → single-column stack
```

But first-safe semantic reading/tab/DOM order should remain canonical family order.

CSS visual reordering that makes screen-reader/keyboard order diverge materially from visual order should be avoided by default.

Canonical rule:

```text
RESPONSIVE GEOMETRY MAY CHANGE
CANONICAL FAMILY ORDER DOES NOT
```

## 11. Impact finding J — collapse/expand is family-local ephemeral view state

Permitted conceptual state:

```text
collapsedFamilies: set<family>
```

or equivalent per-slot booleans.

This state is:

```text
view-local
memory-only
current mounted instance only
non-semantic
non-persistent
non-model-context
```

Collapse must not:

```text
remove semantic eligibility
free semantic budget for a sibling
change family outcome
change source authority
cause future context re-entry
```

## 12. Impact finding K — collapsing is not semantic truncation

A collapsed family may visually hide part/all of an already validated presentation surface.

That is different from rewriting the validated payload.

Canonical rule:

```text
VIEW COLLAPSE
!= SEMANTIC TRUNCATION
```

When expanded again, the same current validated presentation data is shown unless the current projection itself has been invalidated/replaced.

## 13. Impact finding L — family-local visibility cannot silently alter product intent

MF-4 may support local hide/collapse as presentation state only.

It cannot reinterpret:

```text
user requested BOARD + NEWS
NEWS locally collapsed
→ user no longer requested NEWS
```

Nor may local visibility be fed back into MF-1/MF-3 to reallocate family/model budgets.

## 14. Impact finding M — stack update should reconcile by family, not by DOM position or completion order

Within one current projection, conceptual reconciliation should match:

```text
family key
+
current render instance ownership
```

not:

```text
nth-child index
arrival timestamp
text similarity
old historical source card
```

This reduces cross-family accidental replacement.

No cross-turn persistent reconciliation identity is authorized.

## 15. Impact finding N — support-at-use remains upstream of ordinary presentation

MF-2/3M-6 require current source support before ordinary use.

MF-4 must not render an old sibling merely because its DOM still exists.

If shared source support is lost:

```text
old semantic siblings invalid
→ stack surfaces unmounted / invalidated as one current projection set
```

No family renderer may decide independently to preserve plausible stale text.

## 16. Impact finding O — a common stack root must obey one active runtime-generation owner

3M-4 requires mount/update/unmount/disposal/stale-generation rejection.

Multi-family adds a shared container, so ownership should be:

```text
one active runtime generation
→ one current SourcePresentationStack owner
→ N family slot owners beneath it
```

A disposed runtime generation must not leave:

```text
stack root
family roots
listeners
style registrations
resize observers
view-state handles
```

active behind the new generation.

## 17. Impact finding P — host placement remains blocked/unproven

3M-4 froze conceptual placement only as:

```text
SOURCE_LOCAL_ADJACENT
```

and classified:

```text
BLOCKER · ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

MF-4 does not invent selectors, mutation observers, DOM traversal, or hidden mount hacks to bypass this blocker.

Multi-family runtime activation still requires a separately proven host mount authority capable of owning one source-local stack and its family slots.

## 18. Impact finding Q — legacy Community double-presentation risk becomes sharper

A future LIVE_REACTION structured surface may coexist with production `<COMMUNITY>` transcript presentation.

MF-4 must not assume both should appear for the same semantic slot.

Current first scope remains design-only and preserves:

```text
DEFER · LEGACY_COMMUNITY_TO_PRESENTATION_MIGRATION
```

Before active runtime migration, one ordinary source slot must not be rendered twice through both legacy Community presentation and structured LIVE_REACTION presentation unless a separate compatibility design explicitly permits it.

## 19. Impact finding R — empty, withheld, failed, and absent need distinct presentation states

MF-4 should preserve at least these distinctions:

```text
ABSENT
READY
EMPTY
WITHHELD
FAILED
```

Where:

```text
ABSENT    = family not in current presentation result / no surface expected
READY     = renderable validated payload
EMPTY     = family contract explicitly allows deterministic valid-empty surface
WITHHELD  = semantic/policy outcome says ordinary presentation must not materialize
FAILED    = presentation transformation/materialization failed after semantic eligibility
```

These states must not be collapsed into one generic `nothing rendered` flag in diagnostics.

Ordinary UI may choose not to expose technical failure reason text.

## 20. Impact finding S — aggregate no-renderable result should not force a fake stack

MF-3 permits a budget-admitted execution to end with:

```text
NO_FAMILY_RENDERABLE
```

MF-4 should not create an empty outer dashboard shell solely because a multi-family plan existed.

First-safe rule:

```text
zero eligible/explicit-empty family surfaces
→ no ordinary SourcePresentationStack materialization
```

with bounded diagnostics only.

A future product-level empty fanout surface would require explicit design.

## 21. Impact finding T — presentation diagnostics stay bounded and separate

Conceptual stack receipt may include only metadata such as:

```text
stackDisposition
expectedFamilyCount
materializedFamilyCount
familyPresentationDispositions[]
canonicalOrder
mountGenerationDisposition
```

Per-family presentation disposition may include:

```text
family
status
adapterKey
renderedItemCount
failureCode
```

It must not duplicate:

```text
semantic payload text
quarantined text
raw source bodies
DOM HTML snapshots
CSS source
hidden model reasoning
```

Receipt is observability only, not future model context or source history.

## 22. Impact finding U — presentation-node accounting must match the actual adapter grammar later

MF-3 freezes presentation-node budget as a runtime-readiness dimension.

MF-4 can define ownership but should not invent safe numeric node caps before actual host/materializer implementation exists.

Future implementation must prove:

```text
family adapter's worst-case bounded node contribution
+
stack wrapper/slot overhead
<= trusted MF-3 presentation reservation
```

If actual materialization exceeds trusted reservation, this is not an excuse for silent DOM truncation; it is a control-plane/presentation integrity failure according to the later implementation contract.

## 23. Selected MF-4 seam

Freeze MF-4 around:

```text
MultiFamilyProjectionResultV1
+
family presentation policies / validated family payloads
        ↓
PRESENTATION_ELIGIBILITY_FILTER
        ↓
DETERMINISTIC_CANONICAL_FAMILY_ORDER
        ↓
SourcePresentationStackV1
        ↓
ISOLATED_FAMILY_SLOT_HOSTS
        ↓
existing family adapters
        ↓
source-scoped family DOM/CSS
```

with:

```text
presentation-only ephemeral view state
family-local renderer failure containment
common stack lifecycle/disposal integrity
no semantic feedback
```

## 24. MF-4 design questions to freeze next

The full design should define:

```text
SourcePresentationStackPolicyV1
SourcePresentationStackModelV1
CurrentFamilyPresentationSlotV1
canonical family order resolution
presentation-state vocabulary
mount/update/unmount ordering
family-local failure fallback rules
common-stack integrity failure rules
view-state ownership
accessibility/responsive ordering invariant
bounded stack receipt
MF-5 SOCIAL_FEED entry-review handoff
```

## 25. Non-impact boundaries

MF-4 must not change:

```text
Mode A/B/C
MF-1 admitted family set
MF-2 authority bundle/views
MF-3 budget admission/reservations
Exposure policy
BOARD semantic dependency rules
NEWS maturity policy
family semantic validation
source truth/provenance
context/history policy
Candidate C status
source-job authority
model-call topology
legacy Community behavior
production runtime
S7/v0.70.3
release-simcore
```

## 26. Candidate C status

MF-4 remains:

```text
CURRENT_PROJECTION_ONLY
NO PERSISTENT VIEW STATE
NO CROSS-TURN STACK IDENTITY
NO FAMILY MUTATION
NO DERIVED-TO-DERIVED PROPAGATION
NO CONTEXT RE-ENTRY
```

Therefore:

```text
CANDIDATE_C = NOT ACTIVATED
```

If future UI state becomes durable semantic state or a family surface can be individually edited/rerolled while siblings survive, Candidate C must be reassessed.

## 27. Design-only deltas

```text
runtime code delta            = 0
release-simcore delta         = 0
DOM/CSS delta                 = 0
host mount delta              = 0
listener delta                = 0
persistent storage delta      = 0
model-call delta              = 0
prompt/output transport delta = 0
history/context delta         = 0
network/media delta           = 0
```

## 28. Impact-scope verdict

```text
MF_CHECKPOINT = MF-4 IMPACT SCOPE
SELECTED_SEAM = PRESENTATION_ELIGIBILITY_FILTER + CANONICAL_STACK_ORDER + ISOLATED_FAMILY_SLOT_HOSTS
STACK_ROLE = PRESENTATION-ONLY COMPOSITION CONTROL
CANONICAL_ORDER = LIVE_REACTION → BOARD → NEWS
ARRIVAL_ORDER_AUTHORITY = NONE
FAMILY_RENDERER = NATIVE ADAPTER PRESERVED
STACK_CSS_DEPTH = SHALLOW / FAMILY_INTERNAL_RESTYLING_FORBIDDEN
VIEW_STATE = EPHEMERAL / NON-PERSISTENT / NON-MODEL-CONTEXT
WITHHELD != EMPTY
FAMILY_PRESENTATION_FAILURE = LOCAL WHEN STACK INTEGRITY HOLDS
STACK_HOST_INTEGRITY_FAILURE = COMMON FAIL-CLOSED BOUNDARY
ZERO_RENDERABLE_STACK = NO ORDINARY STACK MATERIALIZATION
HOST_MOUNT = STILL BLOCKED / UNPROVEN
CANDIDATE_C = NOT ACTIVATED
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```

Next step after this impact scope:

```text
MF-4 · Presentation Stack + Ordering / Mount Isolation — full design
```