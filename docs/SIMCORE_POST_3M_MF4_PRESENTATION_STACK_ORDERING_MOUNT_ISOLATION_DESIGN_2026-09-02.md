# SimCore Post-3.0M MF-4 Presentation Stack + Ordering / Mount Isolation Design - 2026-09-02

Date: 2026-09-02 KST

Status: **DESIGN FROZEN · PRESENTATION-ONLY STACK COMPOSITION · CANONICAL FAMILY ORDER · FAMILY SLOT MOUNT ISOLATION · EPHEMERAL VIEW STATE · HOST MOUNT STILL UNPROVEN · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-4 · PRESENTATION STACK · ORDERING · MOUNT ISOLATION · DESIGN**

## 0. Purpose

MF-0 froze multi-family sibling fanout and the first presentation-stack concept.
MF-1 froze the immutable admitted family set.
MF-2 froze shared-current-authority and semantic lane isolation.
MF-3 froze aggregate execution-budget admission and failure blast radii.
3M-4 froze the source Presentation Renderer boundary and family-local ephemeral view state.

MF-4 now freezes the presentation composition contract for a current multi-family projection.

Selected seam:

```text
MultiFamilyProjectionResultV1
+
validated family payloads
+
family presentation policies
        ↓
PRESENTATION ELIGIBILITY FILTER
        ↓
CANONICAL ORDER RESOLUTION
        ↓
SourcePresentationStackPolicyV1
        ↓
SourcePresentationStackModelV1
        ↓
ISOLATED FAMILY SLOT HOSTS
        ↓
LIVE_REACTION_STREAM_V1
BOARD_THREAD_V1
NEWS_ARTICLE_V1
        ↓
SOURCE-SCOPED FAMILY DOM/CSS
```

This checkpoint is design-only.

It does not implement host mount APIs, selectors, DOM/CSS, adapters, event listeners, resize observers, sidecar transport, model calls, validators, persistent state, source history, context re-entry, network/media, release publication, or `release-simcore` mutation.

## 1. Authority chain

MF-4 consumes:

```text
3M-4  Presentation Renderer Architecture
3M-5  BOARD Source Family
3M-8  NEWS Publication Maturity Family
MF-0  Multi-Family Orchestration Master Design
MF-1  Fanout Plan + Family Entry Registry
MF-2  Shared Current Authority + Family-Lane Isolation
MF-3  Aggregate Budget + Failure Matrix
```

Initial multi-family presentation families remain:

```text
LIVE_REACTION
BOARD
NEWS
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Product identity

MF-4 is a presentation composition and lifecycle-isolation contract.

It is not:

```text
a semantic renderer
a source validator
a truth authority
a family selector
a fanout admission gate
a budget optimizer
a source-history store
a provenance system
a generic semantic schema
a family-to-family data bus
```

Canonical rule:

```text
MF-4 MAY COMPOSE VALIDATED SURFACES
MF-4 MAY NOT CHANGE WHAT IS TRUE / PUBLIC / MATURE / ELIGIBLE
```

## 3. Terminology

### Family Presentation Adapter

Existing family-native presentation adapter:

```text
LIVE_REACTION → LIVE_REACTION_STREAM_V1
BOARD         → BOARD_THREAD_V1
NEWS          → NEWS_ARTICLE_V1
```

It transforms one validated family semantic payload into one family presentation model.

### Source Presentation Stack

The outer presentation-only composition surface for one current multi-family projection.

It owns:

```text
which renderable family surfaces receive slots
canonical slot order
family slot mount/update/unmount coordination
stack-local collapse/expand state
shallow responsive arrangement
common stack lifecycle/disposal
bounded presentation diagnostics
```

It does not own family semantic structure.

### Family Slot Host

The presentation-only child mount boundary that owns exactly one family subtree for the current stack instance.

## 4. Input boundary

MF-4 ordinary presentation input is downstream of semantic evaluation.

Conceptually:

```text
MultiFamilyProjectionResultV1
  sourceAuthorityRef
  familyResults[]
```

Each family result retains its native schema and outcome.

MF-4 may also receive the plugin-owned presentation policy appropriate to that family.

MF-4 does not receive sibling semantic payloads as cross-family input.

It consumes each family result only to decide that family's own presentation state.

Canonical rule:

```text
STACK COMPOSITION
DOES NOT CREATE SIBLING SEMANTIC READ AUTHORITY
```

## 5. Presentation eligibility classification

MF-4 freezes presentation eligibility before stack model construction.

Conceptual classifier:

```text
classifyFamilyPresentation(familyResult, familyPresentationPolicy)
→ FamilyPresentationEligibilityV1
```

Disposition vocabulary:

```text
ABSENT
READY
EMPTY
WITHHELD
FAILED_PRE_MOUNT
```

### `ABSENT`

No ordinary presentation surface is expected for this family in the current result.

Examples:

```text
family not present in current orchestration result
family not part of current active presentation set
```

### `READY`

A validated renderable payload exists and a legal registered presentation adapter/policy is available.

### `EMPTY`

The family semantic contract explicitly permits a deterministic valid-empty ordinary surface.

This state cannot be synthesized merely because a family was requested/admitted.

### `WITHHELD`

Semantic/policy outcome intentionally prevents ordinary presentation.

Examples include family outcomes equivalent to:

```text
HOLD
semantic invalid/quarantined with no renderable payload
unsupported family-local semantic scope
```

### `FAILED_PRE_MOUNT`

Semantic payload may be eligible, but presentation model/policy/adapter preparation fails before a host slot can be successfully mounted.

Canonical distinctions:

```text
WITHHELD != EMPTY
FAILED != WITHHELD
ABSENT != WITHHELD
```

## 6. No fake family slots

MF-4 must not manufacture visual placeholders to make the fanout look complete.

Illegal example:

```text
LIVE_REACTION = READY
BOARD         = READY
NEWS          = HOLD

UI:
LIVE_REACTION card
BOARD card
NEWS card saying "No news yet"
```

unless NEWS itself explicitly owns a valid-empty semantic state for that case.

Canonical rule:

```text
FAMILY WAS ADMITTED
DOES NOT IMPLY
FAMILY MUST HAVE A VISIBLE SLOT
```

## 7. Stack materialization eligibility

Conceptual stack-level decision:

```text
renderableSurfaceCount
= READY + family-contract-valid EMPTY surfaces
```

First-safe behavior:

```text
renderableSurfaceCount == 0
→ STACK_NOT_MATERIALIZED
```

with bounded diagnostics only.

MF-4 does not create an empty dashboard shell merely because `ACTIVE_MULTI` execution happened.

A future product-level "all sources withheld" surface would require explicit design.

## 8. `SourcePresentationStackPolicyV1`

MF-4 freezes a plugin-owned stack presentation policy concept:

```text
SourcePresentationStackPolicyV1
  schemaVersion = 1
  placementIntent = SOURCE_LOCAL_ADJACENT
  familyOrder = [LIVE_REACTION, BOARD, NEWS]
  layoutPolicy = STACK_FLOW_V1
  collapsePolicy = FAMILY_LOCAL_VIEW_ONLY
  interactionPolicy = VIEW_LOCAL_ONLY
  themePolicy = HOST_INHERIT
```

This policy is not model-authored source data.

It cannot:

```text
add a family not admitted by MF-1
turn WITHHELD into READY
change family semantic payload
change family validator outcome
change sourceAuthorityRef
change NEWS maturity
change Exposure disposition
persist source identity
```

Canonical rule:

```text
STACK POLICY SELECTS PRESENTATION COMPOSITION
STACK POLICY DOES NOT SELECT SEMANTIC TRUTH
```

## 9. Canonical family order

MF-4 freezes first canonical order:

```text
LIVE_REACTION
BOARD
NEWS
```

Order resolution is deterministic and based on family identity, not runtime timing.

Conceptually:

```text
canonicalRank(LIVE_REACTION) = 0
canonicalRank(BOARD)         = 1
canonicalRank(NEWS)          = 2
```

Only renderable/explicit-empty families appear, preserving relative canonical order.

Examples:

```text
READY: LIVE_REACTION, BOARD, NEWS
→ LIVE_REACTION → BOARD → NEWS

READY: BOARD, NEWS
→ BOARD → NEWS

READY: LIVE_REACTION, NEWS
→ LIVE_REACTION → NEWS
```

## 10. Display order has no truth authority

Canonical rules:

```text
DISPLAY ORDER
!= TRUTH RANK
!= CONFIDENCE RANK
!= SOURCE AUTHORITY RANK
!= PUBLICATION MATURITY RANK
```

LIVE_REACTION appearing above NEWS does not make it more authoritative.

NEWS appearing last does not make it the final canonical truth.

The order is a stable presentation grammar only.

## 11. Completion / arrival order has no display authority

Physical generation/presentation preparation may complete out of order.

Illegal:

```text
NEWS adapter completes first
→ mount NEWS as first permanent slot
→ later append LIVE_REACTION below it
```

First-safe composition must resolve canonical stack order before or during reconciliation regardless of completion timing.

Canonical rule:

```text
ASYNC/PHYSICAL COMPLETION ORDER
DOES NOT OWN DISPLAY ORDER
```

MF-4 does not itself authorize asynchronous generation. This rule only preserves semantics if a future runtime topology has out-of-order completion.

## 12. `SourcePresentationStackModelV1`

Conceptual pure presentation read model:

```text
SourcePresentationStackModelV1
  kind = MULTI_FAMILY_SOURCE_STACK
  placementIntent = SOURCE_LOCAL_ADJACENT
  slots[]
  empty = false
```

`slots[]` contains only family surfaces eligible for ordinary presentation.

Each slot conceptually contains:

```text
SourcePresentationStackSlotModelV1
  family
  canonicalOrderOrdinal
  adapterKey
  presentationModel
  initialCollapsed = false
```

The stack model contains presentation models, not validation receipts or trusted authority bundles.

It must not contain:

```text
Handoff/Evidence fingerprints
claim-policy contexts
NEWS maturity owner inputs
quarantined semantic text
raw source body
sibling diagnostics as semantic data
```

## 13. `CurrentFamilyPresentationSlotV1`

MF-4 freezes a current-instance slot lifecycle concept:

```text
CurrentFamilyPresentationSlotV1
  family
  renderInstanceKey
  canonicalOrderOrdinal
  mountDisposition
  currentProjectionOnly = true
```

`renderInstanceKey` is presentation identity only.

It may isolate:

```text
DOM ids
ARIA relationships
local collapse controls
local observer handles
local event listener scope
```

It may not become:

```text
sourceAuthorityRef
semantic assertion identity
stable BOARD post identity
stable NEWS article identity
cross-turn fanout identity
provenance identity
reroll lineage identity
```

## 14. One current slot per family

First-scope rule:

```text
one current stack
→ at most one ordinary slot per family
```

Therefore within the first eligible set:

```text
0 or 1 LIVE_REACTION slot
0 or 1 BOARD slot
0 or 1 NEWS slot
```

Multiple independent BOARD surfaces or multiple NEWS publications inside one fanout would require a later family/presentation cardinality design.

MF-4 does not infer additional slots from semantic item count.

## 15. Mount root architecture

Conceptual DOM ownership:

```text
[data-simcore-source-stack="multi-family"]
  [data-simcore-source-slot="live-reaction"]
    [data-simcore-source-family="live-reaction"]

  [data-simcore-source-slot="board"]
    [data-simcore-source-family="board"]

  [data-simcore-source-slot="news"]
    [data-simcore-source-family="news"]
```

The exact tag names, host selectors, and mount API remain deliberately unfrozen.

This is an ownership grammar only.

## 16. Stack owns composition, family owns subtree

Outer stack may control:

```text
slot existence
slot order
slot container visibility/collapse wrapper
stack gap/flow/grid
common stack lifecycle
```

Family adapter/host owns only its family subtree.

Forbidden:

```text
BOARD adapter mutates NEWS root
NEWS adapter removes LIVE_REACTION slot
LIVE_REACTION listener reorders stack
stack adapter rewrites BOARD post/reply internals
stack CSS styles NEWS headline semantics directly
```

Canonical rule:

```text
STACK OWNS COMPOSITION
FAMILY PRESENTATION OWNS FAMILY SUBTREE
```

## 17. Shallow stack CSS architecture

Preferred outer namespace concept:

```text
sc-source-stack
sc-source-stack__slot
sc-source-stack__slot-toggle
sc-source-stack__slot-body
```

Possible scoped root:

```text
[data-simcore-source-stack="multi-family"]
```

Stack CSS may own:

```text
outer display / grid / flow
gap
slot spacing
bounded wrapper chrome
responsive container geometry
collapse wrapper visibility
```

Stack CSS must not own family internal selectors.

Forbidden broad selectors include:

```text
.card
.item
.comment
article
button
img
body
```

outside explicit stack/family namespaces.

## 18. Family CSS isolation

Family-scoped roots remain authoritative for family presentation grammar:

```text
[data-simcore-source-family="live-reaction"]
[data-simcore-source-family="board"]
[data-simcore-source-family="news"]
```

Future CSS must prove that stack styles cannot accidentally make:

```text
BOARD reply look like NEWS metadata
NEWS headline inherit LIVE_REACTION item layout
LIVE_REACTION controls inherit BOARD post controls
```

A family stylesheet leaking across a sibling root is a family-local presentation contract failure when it can be isolated safely.

If shared stylesheet/runtime ownership is corrupted globally, treat it as common stack/runtime integrity failure.

## 19. Responsive policy

First layout policy:

```text
STACK_FLOW_V1
```

It prioritizes stable document order.

Responsive geometry may change without changing canonical slot order.

First-safe guidance:

```text
narrow host
→ single-column canonical stack

wide host
→ may use bounded richer geometry later if reading/tab order remains coherent
```

MF-4 does not freeze exact breakpoints or column counts.

## 20. Accessibility ordering invariant

DOM / reading / keyboard order should preserve canonical family order by default.

Avoid presentation tricks where CSS visually reorders slots while assistive technology observes a materially different sequence.

Canonical rule:

```text
RESPONSIVE GEOMETRY MAY CHANGE
CANONICAL READING ORDER REMAINS STABLE
```

Family collapse controls, if implemented, must be family-scoped and have valid ARIA ownership under the current `renderInstanceKey`.

Exact accessibility implementation is deferred to runtime materialization design/evidence.

## 21. Ephemeral stack view state

MF-4 permits presentation-only current-instance state:

```text
SourcePresentationStackViewStateV1
  collapsedFamilies
  localFocusedFamily?
  localScrollState?
  responsiveState?
```

All such state is:

```text
memory/view-local
current mounted stack only
non-persistent
non-canonical
non-semantic
non-model-context
```

No source object changes when this state changes.

## 22. Collapse policy

First policy:

```text
collapsePolicy = FAMILY_LOCAL_VIEW_ONLY
```

Collapsing a family surface:

```text
may hide its presentation body
may preserve a stack-owned family label/control
may preserve the already validated presentation model in memory for the current mounted instance
```

It must not:

```text
change semantic eligibility
change validator outcome
change source authority
change MF-3 reservation
free budget for another family
change MF-1 requested/admitted family set
trigger source regeneration
enter future model context
```

## 23. Collapse is not semantic truncation

Canonical rule:

```text
VIEW COLLAPSE
!= SEMANTIC TRUNCATION
```

A collapsed source remains semantically the same current validated result.

Expanding it should reveal the same current presentation model unless the source projection has been invalidated or replaced.

## 24. No persistent collapse memory in first scope

Not authorized:

```text
remember BOARD collapsed across reload
remember NEWS expanded across conversations
store per-family display preference as source state
feed collapse state into model prompt
```

General product UI preferences could be designed later as a separate non-semantic settings concern.

MF-4 itself freezes no persistence.

## 25. Mount lifecycle

Future Source Presentation Stack Host must conceptually support:

```text
prepare
mount stack root
mount eligible family slots in canonical order
update current family slot
unmount family slot
unmount stack root
dispose all stack resources
reject stale generation
```

Exact host API remains unproven and unauthorized.

## 26. First-safe mount ordering

Conceptual first-safe lifecycle:

```text
M0. require current presentation eligibility result
M1. require at least one READY/EMPTY surface
M2. require current runtime generation ownership
M3. require source-local placement authority
M4. create one stack-root ownership scope
M5. resolve canonical slot order
M6. for each renderable slot in canonical order:
    create isolated slot host
    materialize family adapter/model
M7. attach family-local view state/listeners only inside owned slot
M8. publish bounded presentation receipt
```

This algorithm is conceptual only.

No actual DOM operation is authorized by MF-4.

## 27. Update reconciliation

Within the same current projection and active runtime generation, stack updates should reconcile by:

```text
family key
+
current stack owner
+
renderInstanceKey
```

not by:

```text
nth-child position
completion timestamp
text similarity
old historical DOM card
```

A family changing from `READY` to `WITHHELD` under a legitimate current recomputation would remove/withhold that current family slot, but such runtime update semantics require later implementation evidence.

No cross-turn stable reconciliation identity is frozen.

## 28. Unmount ordering

First-safe conceptual disposal:

```text
U0. stop accepting new family-local UI effects for stale/disposed stack
U1. dispose family-local listeners/observers/view handles
U2. unmount family subtrees
U3. remove family slot hosts
U4. remove stack-level listeners/observers/styles owned by the instance
U5. remove stack root
U6. clear ephemeral stack view state
```

A later runtime may implement equivalent ordering if it proves no stale effect survives disposal.

## 29. Runtime generation ownership

Multi-family presentation preserves the existing generation-safety principle:

```text
one active runtime generation
→ one authoritative current stack effect owner
```

A stale/disposed generation may not:

```text
mount a late family slot
update family content
change collapse state
re-add styles/listeners
restore an old stack after reroll
```

Late stale work must be rejected.

## 30. Common stack integrity failures

MF-4 distinguishes common presentation-host integrity failures from ordinary family-local renderer failures.

Conceptual common failure examples:

```text
stale runtime generation owns the stack
source-local placement anchor resolves to wrong assistant/source projection
stack root ownership cannot be proven
stack disposal cannot remove owned effects
stack order state is corrupted / duplicate family slots appear
common stack container crosses current sourceAuthorityRef/projection boundary
shared stack budget/node invariant is violated in a way that invalidates enforcement trust
```

First-safe result:

```text
STACK_INTEGRITY_FAILED
→ fail closed for the current ordinary stack
→ dispose/withhold stack presentation effects as safely as possible
→ do not rewrite semantic family results
```

MF-4 does not authorize keeping an arbitrary subset mounted when common stack ownership is untrustworthy.

## 31. Family-local presentation failures

When common stack integrity is sound, examples include:

```text
one family adapter rejects its presentation model
one family slot mount fails
one family subtree CSS contract fails locally
one family event binding fails locally
```

Result:

```text
affected family status = FAILED
other family semantic outcomes unchanged
other family presentation slots may remain READY/EMPTY
```

Canonical rule:

```text
FAMILY PRESENTATION FAILURE
!= SIBLING SEMANTIC FAILURE
```

## 32. Presentation fallback rule

MF-4 does not authorize a generic raw-data fallback.

Forbidden fallback:

```text
adapter failed
→ dump JSON
→ dump raw semantic HTML
→ show validation receipt
→ show quarantined text
```

A family may later own an explicitly safe fallback presentation adapter only by design.

Current first-safe default:

```text
family presentation fails closed
```

## 33. Presentation state vocabulary

MF-4 freezes conceptual per-family presentation status:

```text
ABSENT
READY
EMPTY
WITHHELD
FAILED
```

Additional stack-level status:

```text
STACK_NOT_APPLICABLE
STACK_NOT_MATERIALIZED
STACK_READY
STACK_PARTIAL
STACK_INTEGRITY_FAILED
```

Interpretation:

```text
STACK_READY
= all materializable family surfaces materialized successfully

STACK_PARTIAL
= at least one family surface materialized and at least one eligible family presentation failed/was independently withheld as reflected by the result contract

STACK_NOT_MATERIALIZED
= zero READY/EMPTY ordinary surfaces

STACK_INTEGRITY_FAILED
= common host/composition ownership cannot be trusted
```

The exact distinction between semantic WITHHELD and presentation FAILED remains present per family in diagnostics.

## 34. Partial presentation example

Given semantic outcomes:

```text
LIVE_REACTION = READY
BOARD         = READY
NEWS          = WITHHELD by maturity
```

Legal stack:

```text
LIVE_REACTION slot
BOARD slot
```

No NEWS dummy slot.

Stack-level outcome may be represented as a bounded partial multi-family presentation state, while preserving NEWS as semantic WITHHELD rather than presentation failure.

## 35. Adapter failure example

Given:

```text
LIVE_REACTION semantic = READY
BOARD semantic         = READY
NEWS semantic          = READY

BOARD_THREAD_V1 adapter fails
```

Legal outcome:

```text
LIVE_REACTION presentation = READY
BOARD presentation         = FAILED
NEWS presentation          = READY
```

The BOARD semantic payload remains valid upstream.

No sibling payload changes.

## 36. Common mount failure example

Given all three semantic results READY, but:

```text
source-local stack anchor cannot be proven for the current assistant projection
```

This is not three independent family mount failures.

It is:

```text
STACK_INTEGRITY_FAILED / MOUNT_BLOCKED
```

No ordinary stack materialization is authorized.

Semantic family results remain independently intact upstream.

## 37. Host placement authority remains blocked

3M-4 froze:

```text
placementIntent = SOURCE_LOCAL_ADJACENT
```

and:

```text
BLOCKER · ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

MF-4 preserves that blocker.

It does not authorize:

```text
DOM selector guessing
MutationObserver-based opportunistic injection
broad transcript traversal
message-class scraping
hidden generic HTML injection
```

A future runtime transaction must prove a legitimate active host mount authority for one stack root and its family slots.

## 38. Sidecar transport remains separately blocked

MF-4 consumes already validated family results abstractly.

It does not solve:

```text
ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
```

by embedding hidden JSON in assistant output.

Presentation and semantic transport remain separate readiness problems.

## 39. Legacy Community migration boundary

Production `<COMMUNITY>` behavior remains unchanged.

Before structured LIVE_REACTION presentation becomes active, integration must avoid accidental double ordinary rendering for the same semantic source slot.

Still deferred:

```text
DEFER · LEGACY_COMMUNITY_TO_PRESENTATION_MIGRATION
```

MF-4 does not choose whether legacy Community or structured LIVE_REACTION owns the active product surface.

## 40. Presentation budget relationship

MF-3 owns trusted presentation-node reservation.

MF-4 owns composition grammar that must later fit within that reservation.

Future runtime proof must establish:

```text
stack wrapper overhead bound
+
Σ actual family adapter worst-case node bounds
<= MF-3 trusted presentation reservation
```

MF-4 does not freeze numeric node limits.

## 41. No silent presentation truncation for budget overflow

If actual implementation would exceed the trusted node reservation, MF-4 does not authorize:

```text
cut NEWS body DOM in half
remove BOARD replies arbitrarily
silently omit LIVE_REACTION items
```

Budget-safe semantic/presentation shortening requires an explicit family contract.

Otherwise the relevant presentation/control-plane integrity path fails closed.

## 42. Theme policy

First stack theme policy remains:

```text
HOST_INHERIT
```

Family renderers preserve their source-scoped theme tokens.

Stack theme changes cannot modify semantic payloads or family outcomes.

No external CDN/font dependency is required by MF-4.

## 43. Interaction boundary

First scope remains:

```text
interactionPolicy = VIEW_LOCAL_ONLY
```

Allowed:

```text
collapse / expand
local focus/navigation
local scroll
bounded presentation detail toggle
```

Not authorized:

```text
ADD_POST
ADD_REPLY
DELETE
EDIT
REROLL
VOTE
REPOST
CHANGE_SOURCE
REGENERATE_FAMILY
```

Interactive source mutation belongs to later design and may activate Candidate C conditions.

## 44. No presentation feedback into semantic orchestration

MF-4 view state cannot be used as an input to:

```text
MF-1 family selection
MF-2 authority view
MF-3 budget reallocation
Exposure policy
NEWS maturity
BOARD dependency validation
source history
model prompt
```

Examples of forbidden feedback:

```text
NEWS collapsed
→ skip NEWS validation next time

BOARD hidden locally
→ borrow its budget for LIVE_REACTION

user scrolled NEWS deeply
→ promote NEWS truth confidence
```

## 45. Bounded stack receipt

Conceptual diagnostics object:

```text
SourcePresentationStackReceiptV1
  stackDisposition
  expectedFamilyCount
  presentationEligibleFamilyCount
  materializedFamilyCount
  canonicalOrder
  familyPresentationDispositions[]
  mountGenerationDisposition
  stackFailureCode?
```

Each family disposition may contain only bounded metadata:

```text
family
status
adapterKey?
renderedItemCount?
failureCode?
```

It must not retain:

```text
semantic text
raw source body
quarantined/held content
DOM HTML snapshot
CSS text snapshot
validation receipt payload
hidden model reasoning
```

## 46. Diagnostics are not product semantics

The stack receipt is:

```text
observability only
memory/current execution bounded
non-model-context
non-source-history
```

A future diagnostics panel may consume bounded status metadata without becoming source truth authority.

## 47. Security boundary

Family semantic text remains untrusted plain text at materialization.

MF-4 preserves 3M-4:

```text
plugin-owned static structure
+
escaped text nodes / textContent equivalent
```

Forbidden:

```text
raw semantic HTML
model-provided arbitrary classes
model-provided style attributes
script/event attributes
cross-family DOM selectors derived from semantic content
```

The stack wrapper itself contains no model-authored HTML authority.

## 48. DORMANT / ACTIVE_SINGLE compatibility

MF-4 multi-family stack applies only where a multi-family presentation result exists.

```text
DORMANT
→ no stack work

ACTIVE_SINGLE
→ existing standalone family presentation path remains semantically unchanged

ACTIVE_MULTI
→ MF-4 stack composition applicable after semantic outcomes
```

A future implementation may reuse stack primitives for a single family only if it proves no new behavior/regression is introduced.

Canonical rule:

```text
MULTI-FAMILY STACK DESIGN
MUST NOT FORCE A NEW PRODUCT SURFACE ON ACTIVE_SINGLE
```

## 49. Source-irrelevant baseline

MF-4 preserves 3M-9 zero source-semantic burden for unrelated turns.

If no current source presentation exists:

```text
no stack root
no slot hosts
no source CSS registration attributable to an active stack
no source stack listeners
no resize observer
no stack view state
no presentation receipt beyond a bounded not-applicable branch if needed
```

Old visible host transcript content does not activate new stack work.

## 50. Support-at-use and whole-stack invalidation

Before ordinary use, current shared source support remains upstream authority.

If source support is lost after reroll/source replacement:

```text
old sibling semantic results invalid
→ old stack no longer presentation-authorized
→ old current stack / family slots must be disposed or treated stale
```

A family renderer cannot preserve its old slot because its text still looks plausible.

## 51. Reroll/edit boundary

Not authorized:

```text
reroll only BOARD while preserving old sibling lineage
edit NEWS while retaining old LIVE_REACTION/BOARD as durable descendants
independently restore one old slot after source root replacement
```

These create stable descendant identity / partial survival pressure and require Candidate C C3/C7 reassessment.

MF-4 current scope uses whole-current-projection invalidation.

## 52. Context/history boundary

MF-4 inherits:

```text
CURRENT_PROJECTION_ONLY
NO STRUCTURED SOURCE HISTORY
NO AUTOMATIC CONTEXT RE-ENTRY
NO HIDDEN RETRIEVAL
```

Visible stacked source surfaces do not become future model memory.

Collapse/expand state does not enter future prompt context.

## 53. Candidate C status

Current MF-4 scope leaves activation conditions false:

```text
C1 cross-turn survival          = no
C2 stable derived identity      = no
C3 item mutation                = no
C4 append / revision            = no
C5 derived-to-derived lineage   = no
C6 future context re-entry      = no
C7 partial descendant survival  = no
C8 delayed semantic side effect = no
```

Therefore:

```text
CANDIDATE_C = NOT ACTIVATED
```

If future presentation becomes a durable source object or permits independent semantic mutation of one sibling while others survive, Candidate C must be reopened.

## 54. MF-5 SOCIAL_FEED entry-review handoff

MF-4 now defines what a new family must prove before entering the multi-family presentation stack.

SOCIAL_FEED entry review must prove at least:

```text
F0 native validated semantic schema exists
F1 native presentation adapter/key exists
F2 exact family-scoped DOM/CSS root exists by design
F3 bounded presentation-node upper bound can be defined
F4 READY / EMPTY / WITHHELD behavior is explicit
F5 one-current-slot cardinality is valid or an alternative cardinality is separately designed
F6 ephemeral interaction state cannot mutate source semantics
F7 adapter/mount failure is family-local when common stack integrity holds
F8 no cross-family semantic reads are required
F9 canonical order insertion point is explicitly designed
F10 host mount and transport blockers remain acknowledged until runtime proof
```

SOCIAL_FEED remains `ENTRY_REVIEW_REQUIRED` until that checkpoint completes.

## 55. PUBLIC_KNOWLEDGE entry boundary

PUBLIC_KNOWLEDGE remains separately `ENTRY_REVIEW_REQUIRED`.

MF-4 does not assign it a canonical stack order or adapter slot by implication.

Its settlement semantics and presentation grammar require a separate review.

## 56. Design acceptance matrix

A future implementation/evaluator should prove at least:

```text
A0  ACTIVE_SINGLE family presentation behavior is not regressed
A1  all three READY surfaces appear LIVE_REACTION → BOARD → NEWS
A2  NEWS completes first but final display order remains canonical
A3  NEWS WITHHELD creates no fake NEWS empty slot
A4  valid-empty family creates a surface only if its family contract permits it
A5  BOARD adapter failure leaves LIVE_REACTION/NEWS semantics unchanged
A6  family renderer cannot mutate sibling subtree
A7  stack CSS does not restyle family internals across namespaces
A8  collapse/expand changes view only, not semantics/budget/history
A9  zero renderable families creates no ordinary empty stack shell
A10 stale runtime generation cannot late-mount a family slot
A11 wrong source-local anchor causes common stack fail-closed behavior
A12 source reroll invalidates/disposes the old whole current stack
A13 receipt contains no semantic/quarantined/raw DOM content
A14 responsive geometry preserves coherent canonical reading order
A15 node accounting remains within MF-3 reservation under worst-case family grammars
A16 legacy Community is not accidentally double-rendered with structured LIVE_REACTION
A17 DORMANT unrelated turn performs no active stack work
```

These are design validation requirements only.
No runtime evidence is claimed here.

## 57. Explicitly deferred

MF-4 does not authorize:

```text
actual host selectors/APIs
actual DOM/CSS implementation
persistent collapse state
source dashboard/history page
drag/reorder by user
user-configured semantic priority
multi-instance same-family slots
cross-family linked navigation that changes semantics
interactive post/reply/edit/reroll
media/network presentation
legacy Community migration
SOCIAL_FEED fanout entry
PUBLIC_KNOWLEDGE fanout entry
cross-family propagation
```

## 58. Design-only deltas

```text
runtime code delta                 = 0
release-simcore delta              = 0
DOM/CSS delta                      = 0
host mount delta                   = 0
listener / observer delta          = 0
persistent storage delta           = 0
prompt/output transport delta      = 0
model-call count delta             = 0
network/media delta                = 0
history/context re-entry delta     = 0
```

## 59. Frozen result

```text
MF_CHECKPOINT = MF-4
SELECTED_SEAM = PRESENTATION_ELIGIBILITY_FILTER + CANONICAL_STACK_ORDER + ISOLATED_FAMILY_SLOT_HOSTS
STACK_POLICY = SourcePresentationStackPolicyV1
STACK_MODEL = SourcePresentationStackModelV1
CANONICAL_ORDER = LIVE_REACTION → BOARD → NEWS
DISPLAY_ORDER_TRUTH_AUTHORITY = NONE
ARRIVAL_ORDER_AUTHORITY = NONE
PER_FAMILY_PRESENTATION_STATES = ABSENT / READY / EMPTY / WITHHELD / FAILED
ZERO_RENDERABLE_STACK = NO ORDINARY STACK MATERIALIZATION
STACK_CSS = SHALLOW / SOURCE-SCOPED
FAMILY_DOM_GRAMMAR = NATIVE ADAPTER OWNED
VIEW_STATE = EPHEMERAL / NON-PERSISTENT / NON-MODEL-CONTEXT
FAMILY_PRESENTATION_FAILURE = FAMILY-LOCAL WHEN STACK INTEGRITY HOLDS
COMMON_STACK_INTEGRITY_FAILURE = FAIL CLOSED FOR CURRENT ORDINARY STACK
RUNTIME_GENERATION = ONE ACTIVE STACK EFFECT OWNER
HOST_MOUNT = BLOCKED_UNPROVEN
STRUCTURED_SIDECAR_TRANSPORT = NOT AUTHORIZED
LEGACY_COMMUNITY_MIGRATION = DEFERRED
SOCIAL_FEED = ENTRY_REVIEW_REQUIRED
PUBLIC_KNOWLEDGE = ENTRY_REVIEW_REQUIRED
CANDIDATE_C = NOT ACTIVATED
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```

Next checkpoint:

```text
MF-5 · SOCIAL_FEED Fanout Entry Review
```