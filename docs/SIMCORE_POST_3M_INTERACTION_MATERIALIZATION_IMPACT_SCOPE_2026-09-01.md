# SimCore Post-3.0M Interaction / Materialization Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **POST-3M IMPACT SCOPE FROZEN · DESIGN-ONLY · NO RUNTIME AUTHORITY · CANDIDATE C REASSESSMENT REQUIRED FOR SOURCE MUTATION · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · INTERACTION · SOURCE MUTATION · EXTERNAL MATERIALIZATION · IMPACT SCOPE**

## 0. Purpose

This document performs the read-only impact-scope transaction for the user-selected post-3.0M follow-up lane:

```text
Lane D · User interaction / external materialization
```

It does not implement buttons, event handlers, source writes, model calls, media generation, network requests, persistence, transport, DOM/CSS, or release changes.

The goal is to identify the narrowest safe architecture seam before any detailed follow-up design.

## 1. Authority chain

This impact scope consumes the already-frozen design authorities:

```text
docs/SIMCORE_POST_3M_FOLLOWUP_DESIGN_CATALOG_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01.md
docs/SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_SOCIAL_FEED_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_MULTI_FAMILY_ORCHESTRATION_MASTER_DESIGN_2026-09-01.md
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Current boundary before this follow-up

3M-4 froze:

```text
interactionPolicy = VIEW_LOCAL_ONLY
```

and explicitly did not authorize semantic intents such as:

```text
ADD_POST
ADD_COMMENT
REROLL
DELETE
VOTE
CHANGE_SOURCE
```

BOARD and SOCIAL_FEED are currently designed as:

```text
READ-ONLY
SNAPSHOT-ONLY
CURRENT PROJECTION ONLY
NON-PERSISTENT
NO AUTOMATIC CONTEXT RE-ENTRY
```

Therefore a visual control may not be treated as source mutation merely because the renderer can draw a button.

Canonical rule:

```text
UI CONTROL EXISTS
!=
SEMANTIC MUTATION AUTHORITY EXISTS
```

## 3. Lane D must be split into three independent planes

The selected follow-up lane is not one subsystem.

It contains three orthogonal planes:

```text
P0 · VIEW INTERACTION
P1 · SOURCE MUTATION INTENT
P2 · EXTERNAL / ASYNCHRONOUS MATERIALIZATION
```

### P0 · View interaction

Examples:

```text
expand / collapse
open detail
switch local tab
copy text
scroll
open popover
```

These remain presentation-only and may stay under `VIEW_LOCAL_ONLY` when they do not change source semantics.

### P1 · Source mutation intent

Examples:

```text
BOARD: write / reply / edit / delete / reroll / recommend
SOCIAL_FEED: post / reply / quote / repost / react
```

These are semantic intents. They must cross a plugin-owned policy boundary before any source object changes.

### P2 · External materialization

Examples:

```text
remote image fetch
generated avatar/image
external attachment
asynchronous media result
```

These are delayed/effectful operations and require operation ownership and stale-result rejection independent of source truth policy.

Canonical separation:

```text
VIEW STATE
!=
SOURCE MUTATION
!=
MEDIA / NETWORK EFFECT
```

## 4. Selected first architecture seam

The narrowest safe architecture seam is:

```text
INTENT_BEFORE_MUTATION_CONTROL_PLANE
```

Meaning:

```text
Presentation Host
  emits bounded interaction intent
        ↓
Interaction Policy / Target Resolution
        ↓
semantic action classified
        ↓
NO direct source write from DOM event
```

The first design must not let a renderer mutate validated sidecars, source snapshots, host history, or canonical state directly.

Forbidden:

```text
button.onclick
→ mutate Board object
```

Required direction:

```text
button/input event
→ bounded Source Interaction Intent
→ current-generation + current-target validation
→ action-specific authority gate
→ separately designed mutation/materialization path
```

## 5. Current UI target references are not durable source identity

3M-4 permits presentation-only instance isolation such as `renderInstanceKey`.

That key may not become semantic identity.

Likewise current snapshot ordinals are not cross-turn IDs.

Therefore an interaction event may use presentation/current-projection locators only as bounded event locators, not as proof that the old object remains valid.

Canonical rule:

```text
renderInstanceKey
!=
source object ID

current item ordinal
!=
durable mutation identity
```

The interaction policy must re-resolve the target against the currently authoritative mounted/validated projection before any semantic action is accepted.

## 6. Stale interaction is a first-class failure domain

A user may click a source UI after:

```text
runtime replacement
reroll
edit
source authority change
projection replacement
mount replacement
```

Therefore the interaction design requires stale-event rejection before mutation semantics.

Conceptual outcomes:

```text
INTERACTION_TARGET_CURRENT
INTERACTION_TARGET_STALE
INTERACTION_TARGET_MISSING
INTERACTION_ACTION_UNSUPPORTED
INTERACTION_PAYLOAD_INVALID
```

A stale event must fail closed.

It must not silently retarget a newer source object that merely looks similar.

## 7. Meaningful source mutation activates Candidate C pressure

The current first-major Source Intelligence design keeps Candidate C closed because source objects are ephemeral snapshots.

Interactive mutation changes that assumption.

### Existing-object interaction

For an action such as:

```text
add reply to this Board post
edit this post
reroll this item
delete this item
react to this Social Feed item
```

an old derived object must remain addressable long enough to receive the later action.

This immediately creates pressure on:

```text
C1 · cross-turn semantic object survival
C2 · stable source-local identity
C3 · item-level mutation / reroll / edit / delete
C4 · append / merge / partial survival
```

Additional operations may activate:

```text
C6 · later prompt re-entry, if model generation consumes old source content
C7 · descendant survival, if unaffected children remain after parent/item mutation
C8 · delayed attachment, for asynchronous media targeting an exact source item
```

Therefore:

```text
REAL SOURCE MUTATION
→ CANDIDATE C REASSESSMENT REQUIRED
```

The follow-up must not pretend existing snapshot ordinals are enough.

## 8. First concrete mutation candidate

The first semantic mutation candidate should be:

```text
BOARD_APPEND_REPLY
```

Why:

- BOARD already has a bounded parent/reply grammar;
- one parent target is easier to reason about than SOCIAL_FEED repost/quote graphs;
- it forces the system to solve durable target identity and append semantics without also solving metrics, follower graphs, or media;
- it exposes the Candidate C minimum field set through a concrete consumer rather than a generic provenance platform.

This is a **design candidate only**.

It is not authorized for runtime implementation by this document.

## 9. Why SOCIAL_FEED interaction should follow BOARD interaction

SOCIAL_FEED semantic ownership is now frozen, so interaction is eligible for later design.

However its actions have broader dependency pressure:

```text
POST
REPLY
REPOST
QUOTE
REACTION
```

A repost/quote may reference another derived item, and source-local actor identity is more prominent.

Therefore the recommended sequence is:

```text
BOARD_APPEND_REPLY identity/mutation contract
→ BOARD edit/delete/reroll/reaction semantics
→ SOCIAL_FEED post/reply
→ SOCIAL_FEED quote/repost/reaction
```

This minimizes the number of Candidate C capabilities opened at once.

## 10. Reaction / recommendation controls are not free UI metadata

A local button press and a source fact are different things.

Safe presentation-local state may include:

```text
button pressed locally
bookmark-like local selection
open/closed reaction picker
```

But displaying or mutating source-state claims such as:

```text
recommend count = 18
like count = 521
repost count = 73
```

is semantic source state.

Canonical rule:

```text
LOCAL USER AFFORDANCE
!=
AGGREGATE SOURCE METRIC
```

A reaction count may not be fabricated or incremented as visual realism unless an explicit source-state mutation contract owns it.

## 11. User-authored text is current user input, not automatic source truth

When a user types a post/reply into an interactive source surface, the text is an explicit current user action.

That grants no automatic canonical world truth.

The future mutation design must preserve:

```text
USER AUTHORED SOURCE TEXT
!=
CANONICAL WORLD FACT
```

The text may participate in the existing exposure/public-disclosure rules according to the selected action and source family, but source insertion and world truth remain separate authorities.

## 12. Presentation host remains intent-only

The Source Presentation Host may eventually own:

```text
input control wiring
bounded event capture
local draft text
interaction loading/error state
```

It may not own:

```text
source mutation truth
persistent post identity
exposure disposition
final source object revision
model-context injection
```

Canonical rule:

```text
PRESENTATION HOST
MAY EMIT INTENT
BUT MAY NOT COMMIT SOURCE SEMANTICS
```

## 13. External materialization split

Media/materialization must be split into two classes.

### M0 · Presentation-only enrichment

A visual enrichment that adds no new semantic claim and may disappear without invalidating the source semantic object.

Required rule:

```text
media failure
→ presentation degradation only
→ validated semantic source remains valid
```

If constrained to the current projection and cancelled on invalidation/runtime replacement, it may be designed without a durable source-history system.

### M1 · Semantic / durable media attachment

A media result that:

```text
contributes source meaning
or
arrives later and must attach to an exact semantic object
or
survives projection replacement
```

activates stronger identity/provenance pressure and Candidate C C8.

Canonical rule:

```text
DECORATIVE / OPTIONAL MATERIALIZATION
!=
SEMANTIC MEDIA ATTACHMENT
```

## 14. Async operation ownership requirements

Any future external materialization must answer:

```text
who created the operation?
what exact current projection/render target owns it?
what generation/token identifies the operation?
what invalidates it?
what happens if the runtime is replaced?
what happens if the source projection becomes stale?
what result may be attached?
how is a late result rejected?
how is cleanup performed?
what network/media budget applies?
```

A late result may not attach merely because the DOM node still exists.

## 15. Network/media effects cannot become truth authority

A successful image fetch or generated visual does not strengthen source truth.

```text
MEDIA MATERIALIZATION SUCCEEDED
!=
SOURCE CLAIM VERIFIED
```

Likewise a missing media asset does not invalidate otherwise valid source semantics unless the future semantic schema explicitly declares the media as required semantic content.

## 16. Multi-family interaction boundary

Multi-Family Orchestration is now separately designed.

Interaction must not infer a cross-family mutation graph merely because several sibling projections are visible.

Example:

```text
user replies to BOARD item
```

must not automatically mutate:

```text
LIVE_REACTION
NEWS
SOCIAL_FEED
```

Sibling family outputs remain independent semantic projections unless a separate derived-to-derived propagation contract explicitly activates Candidate C C5.

## 17. Source-irrelevant dormancy remains mandatory

When no interactive source surface/action is active:

```text
interaction semantic burden = 0
interaction history scan = 0
mutation resolution = 0
media operation = 0
network request = 0
persistent write = 0
```

A static source card that happens to exist in old UI does not authorize background listeners that perform semantic work or remote materialization.

## 18. Failure-domain separation

The follow-up master design must preserve at least these independent failure classes:

```text
VIEW INTERACTION FAILURE
STALE INTERACTION TARGET
INTERACTION POLICY REJECTION
SOURCE MUTATION FAILURE
SOURCE SUPPORT INVALIDATION
ASSERTION / EXPOSURE QUARANTINE
PRESENTATION FAILURE
MEDIA / NETWORK MATERIALIZATION FAILURE
```

No class may silently upgrade another.

## 19. Selected follow-up architecture direction

The recommended post-3M Lane D architecture is:

```text
A. keep VIEW_LOCAL_ONLY as the default presentation policy
B. introduce an intent-only interaction control plane
C. use BOARD_APPEND_REPLY as the first concrete mutation consumer
D. reopen Candidate C only for the minimum identity/revision metadata required by that consumer
E. design SOCIAL_FEED mutation after BOARD mutation semantics stabilize
F. keep media/materialization as a separate effect plane
G. allow presentation-only media to fail soft
H. require C8-grade operation identity for delayed exact-object attachment
```

## 20. Proposed design checkpoints

A future design-only workstream should proceed in this order:

```text
IM-0  Interaction / Materialization Master Design
IM-1  Source Interaction Intent + Stale Event Safety
IM-2  Candidate C Minimum Durable Target Contract for BOARD_APPEND_REPLY
IM-3  Interactive BOARD Mutation Semantics
IM-4  Interactive SOCIAL_FEED Mutation Semantics
IM-5  External Media Materialization / Operation Ownership
IM-6  Integration / Failure Isolation / Performance / Validation Protocol
```

No checkpoint authorizes implementation automatically.

## 21. Current impact decision

```text
POST_3M_LANE_D_SELECTED                  = YES
PRIMARY_ARCHITECTURE_SEAM                = INTENT_BEFORE_MUTATION_CONTROL_PLANE
FIRST_CONCRETE_MUTATION_CANDIDATE        = BOARD_APPEND_REPLY
CANDIDATE_C_REASSESSMENT_REQUIRED        = YES FOR REAL SOURCE MUTATION
SOCIAL_FEED_INTERACTION                  = DESIGNABLE AFTER BOARD MUTATION CONTRACT
PRESENTATION_ONLY_MEDIA                  = SEPARATE FAIL-SOFT EFFECT PLANE
ASYNC_EXACT_OBJECT_MEDIA                 = C8 PRESSURE
RUNTIME_IMPLEMENTATION                   = NOT AUTHORIZED
PRODUCTION                               = UNCHANGED
release-simcore                          = UNCHANGED
```
