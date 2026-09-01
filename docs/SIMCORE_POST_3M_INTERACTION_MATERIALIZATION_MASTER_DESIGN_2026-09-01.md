# SimCore Post-3.0M Interaction / Materialization Master Design — 2026-09-01

Date: 2026-09-01 KST

Status: **MASTER DESIGN FROZEN · DESIGN-ONLY · INTENT-BEFORE-MUTATION · INTERACTIVE BOARD FIRST · CANDIDATE C TRIGGERED FOR MINIMUM MUTATION IDENTITY · MEDIA EFFECT PLANE SEPARATED · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOURCE INTERACTION · SOURCE MUTATION · EXTERNAL MATERIALIZATION · MASTER DESIGN**

## 0. Purpose

This document freezes the overall architecture for the post-3.0M follow-up lane:

```text
User interaction / external materialization
```

It answers, at architecture level:

```text
How does a source UI event become a trustworthy user intent?
Which interactions remain presentation-only?
Which interactions mutate Source Intelligence semantics?
When must Candidate C finally activate?
Which source family should be interactive first?
How do user-authored mutations differ from model-assisted mutations?
How are delete/edit/reroll/reaction semantics bounded?
How is external media kept separate from semantic truth?
How are stale events and late async results rejected?
```

This is a design-only checkpoint.

It does not implement event listeners, source writes, mutation reducers, model calls, media generation, network access, structured transport, persistent state, DOM/CSS, host mount integration, long-chat execution, release changes, or `release-simcore` mutation.

## 1. Authority chain

This master design consumes:

```text
docs/SIMCORE_POST_3M_FOLLOWUP_DESIGN_CATALOG_2026-09-01.md
docs/SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
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

## 2. Product identity

Interaction / Materialization is **not** a new runtime mode and **not** a new Source Intelligence family.

It is a control/effect layer that sits beside the existing source-family semantics.

Canonical distinction:

```text
RUNTIME MODE
!=
SOURCE FAMILY
!=
INTERACTION ACTION
!=
MATERIALIZATION EFFECT
```

Forbidden architecture:

```text
INTERACTIVE_MODE
MEDIA_MODE
BOARD_EDIT_MODE
SNS_POST_MODE
```

The existing mode/family system remains authoritative.

## 3. Three-plane architecture

The follow-up is frozen as three independent planes.

```text
P0 · VIEW INTERACTION PLANE
P1 · SOURCE MUTATION PLANE
P2 · EXTERNAL MATERIALIZATION PLANE
```

### P0 · View interaction plane

Examples:

```text
expand / collapse
open local detail
switch presentation tab
copy accepted text
scroll
popover open / close
```

Authority:

```text
Presentation Host / ephemeral view state
```

No semantic mutation occurs.

### P1 · Source mutation plane

Examples:

```text
BOARD ADD_REPLY
BOARD ADD_POST
BOARD EDIT
BOARD DELETE
BOARD REROLL_ITEM
BOARD RECOMMEND

SOCIAL_FEED CREATE_POST
SOCIAL_FEED REPLY
SOCIAL_FEED QUOTE
SOCIAL_FEED REPOST
SOCIAL_FEED REACT
```

Authority must pass through an explicit interaction-intent and mutation-policy path.

### P2 · External materialization plane

Examples:

```text
remote image fetch
generated image/avatar
external media attachment
asynchronous article/source asset
```

Authority is effect/materialization only unless a future semantic-media contract explicitly says otherwise.

Canonical rule:

```text
VIEW INTERACTION
!=
SOURCE MUTATION
!=
EXTERNAL EFFECT
```

## 4. Default interaction policy remains safe

3M-4 froze:

```text
interactionPolicy = VIEW_LOCAL_ONLY
```

This remains the default for every source renderer unless a family/action has passed a later explicit interaction design checkpoint.

Therefore:

```text
NO INTERACTION CONTRACT
→ VIEW_LOCAL_ONLY
```

not:

```text
NO INTERACTION CONTRACT
→ renderer invents writable behavior
```

## 5. Core architecture: intent before mutation

The master rule is:

```text
INTENT_BEFORE_MUTATION
```

Frozen conceptual flow:

```text
User action in Source UI
        ↓
Source Presentation Host captures bounded event
        ↓
SourceInteractionIntentV1
        ↓
current runtime / mount generation check
        ↓
current projection target resolution
        ↓
Source Interaction Policy
        ↓
LOCAL_ONLY
or
REJECT
or
MUTATION_REQUIRES_DURABLE_TARGET
or
AUTHORIZED_MUTATION_COMMAND
or
MATERIALIZATION_REQUEST
        ↓
separate semantic/effect consumer
```

The DOM event itself never owns source semantics.

Canonical rule:

```text
UI EVENT
= USER INTENT INPUT
!=
SOURCE STATE COMMIT
```

## 6. Conceptual `SourceInteractionIntentV1`

The first master design freezes the **concept**, not a runtime schema.

Conceptual bounded fields:

```text
SourceInteractionIntentV1
  schemaVersion
  family
  actionKind
  currentProjectionLocator?
  currentItemLocator?
  boundedUserPayload?
  presentationInstanceRef
  runtimeEffectGeneration
```

### `family`

Identifies the current semantic family being acted upon.

It does not authorize that family/action pair.

### `actionKind`

Must come from an explicit family interaction registry.

Unknown action:

```text
UNSUPPORTED_ACTION
```

### `currentProjectionLocator` / `currentItemLocator`

These are event locators only.

They are not durable identity.

They must be resolved against the currently authoritative validated source object.

### `boundedUserPayload`

Examples:

```text
reply text
new post text
edited text
quote commentary
```

It is untrusted plain user input.

It is not raw HTML and it is not automatic canonical truth.

### `presentationInstanceRef`

Used only to bind the event to the current presentation instance.

It must never become semantic object identity.

### `runtimeEffectGeneration`

Used for stale runtime/event rejection.

It does not replace semantic source support/provenance.

## 7. No DOM-authored source authority

The Presentation Host must not trust hidden DOM attributes as semantic truth.

Forbidden:

```text
DOM says item-id=42
→ mutate item 42
```

Required direction:

```text
event locator
→ resolve in current in-memory validated projection
→ confirm current support
→ only then consider semantic mutation
```

The UI may carry enough bounded locators to route an event, but semantic authority is re-established from trusted current owners.

## 8. Stale interaction gate

Interaction adds a new race surface.

A source card can become stale after:

```text
runtime replacement
source reroll
source edit
root/source switch
projection replacement
mount update/unmount
```

Before semantic mutation, the control plane must prove:

```text
runtime generation current
presentation instance current
source projection current
semantic target exists
source support still valid
```

Conceptual interaction target result:

```text
CURRENT_TARGET
STALE_RUNTIME_GENERATION
STALE_PRESENTATION_INSTANCE
STALE_SOURCE_PROJECTION
TARGET_NOT_FOUND
TARGET_QUARANTINED
UNSUPPORTED_ACTION
INVALID_PAYLOAD
```

Stale target resolution is fail-closed.

No fuzzy retargeting is allowed.

## 9. Candidate C is now concretely triggered for mutation work

Before this follow-up, Candidate C was conditionally ready but inactive.

The selected first concrete semantic mutation is:

```text
BOARD_APPEND_REPLY
```

That requirement means an existing derived Board post must remain addressable when a later user action targets it.

Therefore the interaction workstream **concretely crosses Candidate C gates**.

Minimum activated pressure:

```text
C1 · derived semantic object survives long enough to receive later action
C2 · target post needs stable source-local identity beyond snapshot ordinal semantics
C4 · a new reply must append/merge with an existing derived source object
```

Conditional additional pressure:

```text
C6 · if model-assisted generation consumes old source content in a later prompt
C3 · when edit/delete/reroll of one item is designed
C7 · when unaffected descendants survive an item revision/replacement
C8 · when delayed media attaches to an exact source item
```

Frozen status:

```text
CANDIDATE_C_FOR_INTERACTION = TRIGGERED
GENERIC_DERIVED_PROVENANCE_PLATFORM = NOT AUTHORIZED
```

Canonical rule from 3M-6 remains:

```text
OPENED GATE
→ DESIGN MINIMUM METADATA FOR THE CONCRETE CONSUMER ONLY
```

## 10. Do not freeze a generic `DerivedObjectId`

This master design explicitly does **not** freeze:

```text
DerivedObjectId
PersistentSourceObjectV1
GlobalSourceMutationLedger
UniversalRevisionGraph
```

The next Candidate C checkpoint must derive the minimum durable target identity from `BOARD_APPEND_REPLY` itself.

Questions it must answer:

```text
what exact Board object survives?
what identifies the target post?
what current source authority supports it?
what revision/generation must remain stable?
what invalidates the target?
how long may it survive?
what happens after source reroll/edit?
```

## 11. First interactive family: BOARD

BOARD is selected as the first source family for semantic interaction.

Reason:

```text
existing simple POST → REPLY hierarchy
+ clear target dependency
+ no actor/repost graph required
+ mutation semantics become visible immediately
+ smallest concrete Candidate C consumer
```

First action:

```text
BOARD_APPEND_REPLY
```

Later BOARD actions, in recommended order:

```text
BOARD_ADD_POST
BOARD_EDIT_ITEM
BOARD_DELETE_ITEM
BOARD_REROLL_ITEM
BOARD_RECOMMEND
```

This order is a design recommendation, not runtime authorization.

## 12. `BOARD_APPEND_REPLY` conceptual flow

Future design direction:

```text
current validated Board
        ↓
user targets accepted POST
        ↓
interaction intent validated
        ↓
durable/current target identity proven
        ↓
user reply payload validated
        ↓
source-family mutation policy
        ↓
new Board revision / projection state
        ↓
family validation
        ↓
Presentation Renderer update
```

Important:

```text
old Board snapshot
→ must not be mutated in place merely because JS holds an object reference
```

The mutation architecture should prefer explicit revision/replacement semantics over invisible in-place mutation.

## 13. User-authored mutation versus model-assisted mutation

The interaction system must distinguish two semantic producer classes.

### A. `USER_AUTHORED_MUTATION`

Examples:

```text
user types exact reply
user types exact post
user edits their source-local text
```

The semantic text comes from current user input.

No model call is inherently required merely to preserve the user's exact source-local text.

Canonical rule:

```text
USER AUTHORED SOURCE TEXT
!=
CANONICAL WORLD FACT
```

The text still passes family/exposure/source rules.

### B. `MODEL_ASSISTED_MUTATION`

Examples:

```text
reroll one generated Board reply
auto-generate reactions to a user post
generate a quote-post response
rewrite an item under semantic constraints
```

These operations require a separately authorized semantic-generation path.

If old derived source content is inserted into a later model prompt, Candidate C C6 is activated and freshness/support must be proven at prompt construction.

Canonical rule:

```text
MUTATION NEEDS MODEL
→ EXPLICIT MODEL CONTRACT
```

not hidden background generation.

## 14. Source mutation does not mutate world truth

A source object is a derived projection.

Therefore:

```text
edit Board post
!=
edit canonical event

delete Board post
!=
delete world fact

reroll Board reply
!=
reroll B root/source

recommend source post
!=
claim becomes more true
```

The canonical/derived authority separation remains intact.

## 15. Exposure and user publication remain separate

A user may explicitly type content into a public source surface.

That is a current user disclosure/action and may create publication authority according to the future interaction policy.

It does not automatically disclose unrelated private facts from Knowledge/history.

Canonical rule:

```text
USER PUBLISHED THIS TEXT
→ publication authority may exist for THIS TEXT

USER CLICKED REPLY
→ no blanket exposure upgrade
```

The interaction checkpoint must reuse the 3M-2 exposure boundary rather than create an interaction-specific truth checker.

## 16. Parent/descendant dependency under mutation

BOARD already requires a visible eligible parent for a visible reply.

Interaction introduces revision questions.

Future edit/delete/reroll design must explicitly decide:

```text
if parent edited, do old replies survive?
if parent deleted, are replies removed/cascaded/orphaned?
if parent rerolled, are descendants still semantically supported?
if one reply is rerolled, what downstream objects depend on it?
```

Until a descendant-survival contract exists:

```text
NO SILENT ORPHANING
NO SILENT RE-PARENTING
```

If descendants must survive parent replacement, Candidate C C7 activates.

## 17. Item reroll is not cosmetic refresh

A per-item reroll requires semantic object identity and revision semantics.

Conceptual pressure:

```text
stable target identity
old revision
new revision
source support
policy revalidation
descendant reconciliation
presentation replacement
stale async effect rejection
```

Therefore:

```text
REROLL_ITEM
!=
rerender same text
```

It belongs after the durable target contract.

## 18. Edit semantics

A future edit action must distinguish:

```text
EDIT_USER_AUTHORED_SOURCE_TEXT
EDIT_MODEL_GENERATED_SOURCE_TEXT
```

Potential policy differences may include whether the edit is exact user replacement or model-assisted rewrite.

Regardless, an edit creates a new derived revision rather than changing historical semantic identity invisibly.

Exact revision metadata belongs to the later Candidate C checkpoint.

## 19. Delete semantics

Delete must be source-local.

It may remove/hide an interactive source object from the current source graph according to family policy.

It does not erase canonical world evidence.

The later design must choose explicitly among:

```text
hard source-local removal
soft source-local tombstone
whole descendant cascade
bounded descendant retention
```

No choice is frozen here.

A persistent tombstone must not be introduced unless a concrete consumer requires it.

## 20. Reaction / recommendation semantics

Reaction controls split into two categories.

### Presentation-local reaction state

Example:

```text
reaction picker open
local selection highlight
```

This is view state.

### Source-state reaction mutation

Example:

```text
user recommends post
like/recommend count changes
```

This is semantic source-local state.

Metrics are not free UI chrome.

Canonical rule:

```text
LOCAL CLICK
!=
AGGREGATE SOURCE METRIC
```

The first interactive Board checkpoint should not introduce aggregate counts before explicit metric ownership exists.

## 21. SOCIAL_FEED interaction follows BOARD mutation

SOCIAL_FEED semantics are now frozen and are eligible for later interaction design.

Recommended action order:

```text
CREATE_POST
REPLY
QUOTE
REPOST
REACT
```

Why later:

```text
actor identity pressure
non-tree graph edges
quote/repost dependencies
metric temptation
potential cross-turn account continuity
```

A SOCIAL_FEED action must not upgrade snapshot-local `actorOrdinal`/handle into durable account identity by accident.

If same account/post must persist across turns, Candidate C C2 must be designed explicitly.

## 22. LIVE_REACTION interaction remains deferred

Sending chat/comment into LIVE_REACTION may appear simple, but it raises a product question:

```text
who is the user within the live audience/source?
```

The current family was designed primarily as a public reaction projection, not a user-authored chat protocol.

Therefore semantic LIVE_REACTION posting is deferred until actor/source role semantics are explicitly selected.

View-local interaction remains allowed under 3M-4.

## 23. NEWS and PUBLIC_KNOWLEDGE remain read-only by default

For this follow-up master design:

```text
NEWS semantic mutation by source UI = NOT SELECTED
PUBLIC_KNOWLEDGE semantic mutation by source UI = NOT SELECTED
```

Allowed future view interactions may include:

```text
open article/document detail
expand section
navigate local presentation
copy accepted text
```

Editing/correcting public-reference content would require its own settlement/revision authority and must not be smuggled in through generic interaction controls.

## 24. Multi-family interaction boundary

Multi-Family Orchestration may display sibling families for the same current authority.

Interaction remains family-local unless a separate propagation contract exists.

Example:

```text
user appends BOARD reply
→ mutate BOARD interactive object only
```

not:

```text
BOARD reply
→ rewrite NEWS
→ rewrite SOCIAL_FEED
```

Derived-to-derived propagation remains a Candidate C C5 concern.

Canonical rule:

```text
MULTI-FAMILY VISIBILITY
!=
MULTI-FAMILY MUTATION GRAPH
```

## 25. Materialization architecture is a separate effect plane

Media/network work does not belong inside the source mutation reducer.

Frozen conceptual pipeline:

```text
validated source presentation candidate
        ↓
Materialization Policy
        ↓
operation creation
        ↓
provider / fetch / generation effect
        ↓
operation result validation
        ↓
current target / generation re-check
        ↓
optional presentation attachment
```

No materialization effect may rewrite source truth merely because it succeeded.

## 26. Media classes

The master design freezes three conceptual media classes.

### `M0_STATIC_PRESENTATION_ASSET`

Plugin-owned icons/chrome/static resources that carry no model/source semantic claim.

No Source Intelligence identity is required.

### `M1_OPTIONAL_PRESENTATION_MATERIALIZATION`

Examples:

```text
generated decorative avatar
remote thumbnail
optional illustration
```

Requirements:

```text
source semantics already valid without it
failure degrades presentation only
no truth upgrade
current-projection bounded by default
```

### `M2_SEMANTIC_MEDIA_ATTACHMENT`

Media that contributes source meaning or must survive/attach as a semantic object.

This is **not authorized** by the master design.

It requires a dedicated semantic-media schema/provenance checkpoint.

## 27. Async materialization operation ownership

Any async/external operation requires a bounded effect identity distinct from semantic object identity.

Conceptual operation metadata:

```text
MaterializationOperationV1
  operationToken
  providerKind
  presentationInstanceRef
  currentTargetLocator
  runtimeEffectGeneration
  status
```

This is a conceptual effect contract only.

`operationToken` must not become canonical source identity.

The operation must be rejected/cancelled when:

```text
runtime generation replaced
presentation instance unmounted
source projection invalidated
interaction target revision replaced
feature disabled
```

## 28. Candidate C C8 boundary

3M-6 already defines:

```text
C8 = delayed/asynchronous side effect targets semantic object
```

Therefore:

```text
late result must attach to exact durable semantic source object
→ C8 activated
```

However a strictly presentation-only operation that is:

```text
current projection only
bound to current render instance
cancelled/dropped on invalidation
not semantic
```

may remain an effect-generation problem without creating a durable semantic media object.

Canonical distinction:

```text
CURRENT PRESENTATION EFFECT TARGET
!=
DURABLE SEMANTIC MEDIA TARGET
```

## 29. Late-result rejection

A late media result must not attach because:

```text
same DOM node still exists
same item ordinal appears again
same display name/handle appears again
image seems relevant
```

Required proof direction:

```text
operation generation current
+
presentation target current
+
source support current
→ effect may attach
```

Otherwise:

```text
DROP STALE RESULT
```

No best-effort reattachment.

## 30. Media failure cannot damage semantic source state

For optional presentation materialization:

```text
provider failure
timeout
invalid response
stale result
cleanup cancellation
```

must remain local effect failures.

They must not:

```text
invalidate accepted source assertions
change exposure disposition
change source authority
retry through hidden model calls
rewrite user-authored source text
```

Canonical rule:

```text
OPTIONAL MEDIA FAILURE
!=
SEMANTIC SOURCE FAILURE
```

## 31. No automatic network/media work

3M-9 dormancy extends to the interaction/materialization layer.

When no current materialization request exists:

```text
network calls = 0
media provider calls = 0
background prefetch = 0
polling = 0
materialization history scan = 0
```

Old source cards visible in UI do not authorize background enrichment.

## 32. Security / content boundary

User payload and source text remain untrusted plain semantic text.

The interaction path must not accept model/user payload as:

```text
raw HTML
arbitrary CSS
script/event handlers
arbitrary DOM selector
arbitrary provider URL without policy
```

A later URL/media-source contract must define explicit allow/validation rules before network access exists.

## 33. Duplicate action / retry boundary

Interactive controls can be double-clicked or retried.

The future mutation design must define whether an operation is:

```text
idempotent
non-idempotent but deduplicated
explicitly repeatable
```

Examples:

```text
DELETE
→ should not duplicate destructive effects

ADD_REPLY
→ duplicate event must not silently append same intended reply twice

REROLL_ITEM
→ repeated explicit user action may intentionally produce another revision
```

Exact idempotency keys belong to IM-1/IM-2, not this master design.

## 34. Optimistic UI boundary

The Presentation Host may eventually display local pending state.

But optimistic UI must not become canonical semantic commit.

Safe concept:

```text
user submits reply
→ local pending indicator
→ semantic mutation outcome arrives
→ confirmed source revision replaces pending view
```

Unsafe concept:

```text
UI already appended reply
→ assume source mutation succeeded
```

If rollback/reconciliation becomes necessary, operation-generation semantics must prevent an older failure from reverting a newer successful state.

## 35. Interaction diagnostics

A future bounded interaction receipt may contain fields such as:

```text
family
actionKind
interactionStatus
reasonCode
targetKind
payloadLength
```

It should not persist:

```text
full user draft text
hidden source content
quarantined content
raw DOM snapshot
media bytes
provider secrets
```

Observability remains separate from semantic storage.

## 36. Failure taxonomy

The master design freezes these independent classes:

```text
A. VIEW_INTERACTION_FAILURE
B. STALE_INTERACTION_TARGET
C. INTERACTION_POLICY_REJECTION
D. DURABLE_TARGET / PROVENANCE FAILURE
E. SOURCE_MUTATION_FAILURE
F. SOURCE_SUPPORT_INVALIDATION
G. ASSERTION / EXPOSURE QUARANTINE
H. RELATIONSHIP / DESCENDANT RECONCILIATION FAILURE
I. PRESENTATION_FAILURE
J. MATERIALIZATION_PROVIDER_FAILURE
K. STALE_MATERIALIZATION_RESULT
```

No layer may collapse them into one generic `interaction failed` authority class when the distinction matters for safety/recovery.

## 37. Feature-gate closure

If future semantic source interaction is disabled:

```text
no semantic action registry dispatch
no semantic input listeners
no mutation draft allocation
no durable target lookup
no mutation model call
no mutation persistent write
```

View-local presentation interaction may remain independently enabled.

If materialization is disabled:

```text
no provider call
no async operation
no asset listener
no background retry
```

Feature OFF must close vertically.

## 38. Interaction / presentation separation

The Presentation Renderer still consumes validated semantics.

It does not become the semantic mutation reducer after this follow-up.

Conceptual cycle:

```text
Validated Source
→ Presentation
→ User Intent
→ Interaction Policy / Mutation Authority
→ New Validated Source Revision
→ Presentation Update
```

This is a controlled cycle across explicit boundaries, not one mutable UI object shared by every layer.

## 39. Context re-entry boundary

Source mutation and future model context remain separate questions.

A user action may create a source mutation without automatically injecting old source history into the next model prompt.

If a model-assisted mutation requires old derived source content:

```text
C6 activated
→ bounded re-entry fields + freshness proof required
```

Do not reopen general source history merely because one mutation needs a target excerpt.

## 40. Cost / performance principles

The interaction layer must preserve current-request/local-operation scaling.

Desired shape:

```text
cost(action)
≈ current target + bounded current source revision
```

Forbidden:

```text
scan all historical Boards/Social Feeds on every click
load all prior source snapshots to find target
materialize media for every visible historical card
```

Concrete per-action payload/item/provider caps belong to later checkpoints.

## 41. Design checkpoint program

The follow-up workstream is frozen as:

```text
IM-0  Interaction / Materialization Master Design        ← THIS DOCUMENT
IM-1  Source Interaction Intent + Stale Event Safety
IM-2  Candidate C Minimum Durable Target Contract
      first consumer = BOARD_APPEND_REPLY
IM-3  Interactive BOARD Mutation Semantics
IM-4  Interactive SOCIAL_FEED Mutation Semantics
IM-5  External Materialization / Async Operation Ownership
IM-6  Integration / Failure Isolation / Performance /
      Real-Validation Protocol
```

No checkpoint automatically authorizes implementation.

## 42. Recommended IM-1 questions

The next design should freeze:

```text
exact action registry ownership
current event locator grammar
stale-runtime rejection
stale-render rejection
current source target resolution
payload bounds
intent status vocabulary
duplicate-event handling
view-local vs semantic action dispatch
```

It should **not** yet invent durable Board IDs; that belongs to IM-2.

## 43. Recommended IM-2 questions

IM-2 is where Candidate C becomes concrete for the first time.

It must derive the minimum identity/revision contract from:

```text
BOARD_APPEND_REPLY
```

Required questions:

```text
what survives from the old Board?
what is the stable target post identity?
what revision/generation does it belong to?
what source authority supports it?
what invalidates it?
how long may it survive?
how does append produce the next Board revision?
what happens after source reroll/edit?
```

Do not add SOCIAL_FEED accounts or cross-family lineage unless this concrete consumer requires them.

## 44. Recommended IM-3 first slice

The first interactive Board semantic slice should remain intentionally narrow:

```text
one accepted Board snapshot
one accepted POST target
one exact user-authored REPLY payload
one append mutation
no edit
no delete
no reroll
no metrics
no media
no cross-family propagation
```

This is the smallest end-to-end mutation problem that justifies Candidate C without opening every mutation axis.

## 45. Recommended IM-4 boundary

SOCIAL_FEED interaction should enter only after Board append/revision semantics are stable.

First SOCIAL_FEED interaction should prefer:

```text
CREATE_POST
or
REPLY
```

before:

```text
QUOTE
REPOST
REACTION METRICS
```

because relationship graphs and metrics add stronger derived-dependency pressure.

## 46. Recommended IM-5 boundary

The first external materialization design should start with:

```text
OPTIONAL PRESENTATION MATERIALIZATION
CURRENT PROJECTION ONLY
FAIL SOFT
NO SEMANTIC MEDIA AUTHORITY
```

Only after that should the project consider:

```text
ASYNC SEMANTIC ATTACHMENT
DURABLE AVATAR/IMAGE IDENTITY
MEDIA REPLACEMENT / REROLL
```

which may activate C8/C3.

## 47. Acceptance principles for the design program

The interaction/materialization design program is not considered internally coherent unless it preserves all of the following:

```text
intent before mutation
stale-event fail closed
current authority revalidation
derived source != canon
user-authored text != automatic world truth
Candidate C consumer-driven minimum metadata
no generic provenance platform by default
view state != source state
metric UI != free metadata
media effect != truth authority
late effect != valid effect
source-family mutation remains family-local
zero source-irrelevant background burden
```

## 48. Current frozen state

```text
POST_3M_INTERACTION_MASTER                = FROZEN
DEFAULT_PRESENTATION_INTERACTION           = VIEW_LOCAL_ONLY
INTERACTION_ARCHITECTURE                   = INTENT_BEFORE_MUTATION
FIRST_INTERACTIVE_FAMILY                   = BOARD
FIRST_CONCRETE_MUTATION                    = BOARD_APPEND_REPLY
CANDIDATE_C_FOR_INTERACTION                = TRIGGERED
GENERIC_DERIVED_PROVENANCE_PLATFORM        = NOT AUTHORIZED
SOCIAL_FEED_INTERACTION                    = AFTER BOARD MUTATION CONTRACT
LIVE_REACTION_SEMANTIC_POSTING             = DEFERRED
NEWS_SEMANTIC_MUTATION                     = NOT SELECTED
PUBLIC_KNOWLEDGE_SEMANTIC_MUTATION         = NOT SELECTED
PRESENTATION_ONLY_MEDIA                    = SEPARATE FAIL-SOFT EFFECT PLANE
SEMANTIC / DURABLE MEDIA                   = DEFERRED
C8                                         = CONDITIONAL ON DELAYED EXACT-OBJECT ATTACHMENT
RUNTIME IMPLEMENTATION                     = NOT AUTHORIZED
NETWORK / MEDIA EXECUTION                  = NOT AUTHORIZED
PERSISTENCE                                = NOT AUTHORIZED
PRODUCTION                                 = UNCHANGED
release-simcore                            = UNCHANGED
NEXT DESIGN CHECKPOINT                     = IM-1
```
