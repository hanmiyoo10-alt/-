# SimCore Post-3.0M IM-4 Interactive SOCIAL_FEED Mutation Semantics Design — 2026-09-03

Date: 2026-09-03 KST

Status: **IM-4 DESIGN FROZEN · USER-DIRECT SOCIAL CREATE/REPLY/QUOTE/REPOST ADMITTED · DURABLE SOCIAL_ITEM NAMESPACE · IMMUTABLE BASE + INTERACTIVE OVERLAY · FEED-WIDE SERIAL CREATE LANE · STRICT TARGET-REVISION RELATIONS · SEMANTIC REACT DEFERRED · NO MODEL CALL · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · INTERACTION / MATERIALIZATION · IM-4 · INTERACTIVE SOCIAL_FEED · USER-AUTHORED SOURCE MUTATION · DESIGN-ONLY**

## 0. Purpose

IM-4 freezes the first complete interactive mutation contract for the `SOCIAL_FEED` source family.

It answers:

```text
Which social interactions create new semantic feed items?
Which action is source-state mutation rather than item creation?
How does one durable SOCIAL_ITEM namespace cover POST / REPLY / QUOTE / REPOST?
How is a direct user author represented without inventing a persistent social account?
How are target-dependent items bound to exact current target revisions?
How are REPLY / QUOTE / REPOST semantics kept distinct?
How are multiple valid social creates ordered without rewriting the frozen base snapshot?
How are duplicate internal retries prevented without deduplicating separate user actions?
What happens when a target changes after a dependent item was committed?
Why is semantic REACT deferred even though a local pressed-state is legal?
```

IM-4 is design-only.

It does not implement controls, event listeners, a runtime allocator, storage backend, model calls, network/media effects, source context re-entry, aggregate engagement metrics, edit/delete/reroll, release changes, S7 changes, or `release-simcore` mutation.

## 1. Authority chain

IM-4 consumes without reopening:

```text
docs/SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_INTERACTION_IM1_SOURCE_INTERACTION_INTENT_STALE_EVENT_SAFETY_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM2_BOARD_APPEND_REPLY_MINIMUM_DURABLE_TARGET_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM3_INTERACTIVE_BOARD_MUTATION_SEMANTICS_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_SOCIAL_FEED_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_SOCIAL_FEED_SF1_ACTOR_IDENTITY_REACHABILITY_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_SOCIAL_FEED_SF2_FEED_GRAPH_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_SOCIAL_FEED_SF3_ASSERTION_VALIDATION_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_SOCIAL_FEED_SF5_METRICS_MEDIA_BOUNDARY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC5_ITEM_MUTATION_APPEND_RECONCILIATION_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC6_DERIVED_TO_DERIVED_LINEAGE_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/REPOSITORY_COMMON_RULES.md
```

Production runtime authority remains `release-simcore`.

Inherited firewalls remain authoritative:

```text
UI INTENT != SEMANTIC COMMIT
PRESENTATION BINDING != DURABLE SOCIAL ID
SNAPSHOT ORDINAL != DURABLE SOCIAL ID
DURABLE ID != SEMANTIC REVISION
SEMANTIC REVISION != OPERATION AUTHORITY
FOUND BY ID != SUPPORTED FOR USE
USER DIRECT PUBLICATION != CANONICAL WORLD TRUTH
REPOST != ENDORSEMENT
QUOTE COMMENTARY AUTHORITY != TARGET TRUTH AUTHORITY
REPLY CONTENT AUTHORITY != TARGET TRUTH AUTHORITY
VISIBLE EDGE COUNT != SOURCE METRIC
C5 SAME-FAMILY RELATION != CROSS-FAMILY TRUTH PROPAGATION
```

## 2. IM-4 capability profile

IM-4 opens only the Candidate C lanes required by direct interactive social creation and exact social relationship edges.

```text
C1 survival         = YES, bounded current-runtime interactive-feed lifetime
C2 stable identity  = YES, exact SOCIAL_ITEM objects
C3 item mutation    = NO; edit/delete/reroll remain deferred
C4 append/merge     = YES, bounded creation into one interactive feed overlay
C5 derived relation = YES, same-family exact target relations only
C6 context reentry  = NO
C7 partial survival = NO
C8 delayed effect   = NO
```

Important qualification:

```text
C5 IS USED ONLY FOR SAME-FAMILY SOCIAL RELATIONSHIP EDGES HERE.
CC-6 ATTRIBUTED_DERIVED_CLAIM IS NOT SILENTLY REUSED AS A GENERIC REPLY/QUOTE/REPOST EDGE.
```

IM-4 therefore does not authorize:

```text
SOCIAL_FEED → NEWS propagation
SOCIAL_FEED → BOARD propagation
cross-family source fanout
historical attribution archives
model-visible durable social context
```

## 3. Primary decision

Selected architecture:

```text
IMMUTABLE_VALIDATED_SOCIAL_BASE
+
INTERACTIVE_SOCIAL_OVERLAY
+
ONE DURABLE SOCIAL_ITEM NAMESPACE
+
USER_DIRECT_SOURCE_SELF AUTHORSHIP
+
STRICT CURRENT TARGET REVISION RELATIONS
+
FEED-WIDE SERIAL CREATE COMMIT LANE
+
NO AGGREGATE METRIC MUTATION
```

Canonical flow:

```text
validated SOCIAL_FEED base
        ↓
interaction-qualified item/surface
        ↓
IM-1 current user intent
        ↓
current surface / target / support gates
        ↓
IM-4 action-specific semantic validation
        ↓
new durable SOCIAL_ITEM when action creates an item
        ↓
interactive social overlay commit
        ↓
validated presentation composition
```

## 4. Action classification

IM-4 freezes this first action matrix:

| action | plane | semantic effect | IM-4 status |
|---|---|---|---|
| `SOCIAL_FEED_CREATE_POST` | SOURCE_MUTATION | create new root social item | ADMITTED |
| `SOCIAL_FEED_REPLY` | SOURCE_MUTATION | create content-bearing target-dependent item | ADMITTED |
| `SOCIAL_FEED_QUOTE` | SOURCE_MUTATION | create commentary item + exact target edge | ADMITTED |
| `SOCIAL_FEED_REPOST` | SOURCE_MUTATION | create relationship-only item + exact target edge | ADMITTED |
| `SOCIAL_FEED_REACT` | SOURCE_MUTATION if it claims source state changed | source-local engagement state | DEFERRED |
| local pressed/highlight state | VIEW_LOCAL | presentation state only | ALLOWED AS P0 |

Canonical rule:

```text
CREATE / REPLY / QUOTE / REPOST
= NEW SOCIAL ITEM CREATION

REACT
= NOT A FEED ITEM CREATION
```

## 5. Why `REACT` is deferred

SF-5 already freezes that engagement metrics and credential-like source state are not free UI metadata.

A semantic reaction such as:

```text
user liked item X
```

is a real source-state claim even when no count is shown.

A future semantic reaction design must answer at minimum:

```text
which reaction kinds exist?
is reaction a toggle or append-only event?
what exact target identity/revision does it bind to?
what durable self-reaction state survives turns?
what operation revision/idempotency model applies?
what happens on target edit/retire?
how is reaction state displayed without implying unsupported aggregate metrics?
```

IM-4 therefore freezes:

```text
semantic SOCIAL_FEED_REACT = DEFER
local pressed/hover/selected presentation state = P0 only
```

No `likeCount++`, `repostCount++`, `replyCount++`, or inferred aggregate number is authorized.

## 6. Durable namespace decision

IM-4 admits one concrete Candidate C namespace:

```text
SOCIAL_ITEM
```

under conceptual owner scope:

```text
INTERACTIVE_SOCIAL_FEED
```

The item `kind` is immutable semantic state inside the object:

```text
POST
REPLY
QUOTE
REPOST
```

Canonical rule:

```text
ONE FEED GRAPH NODE TYPE
→ ONE DURABLE NAMESPACE
```

IM-4 does not create separate namespaces such as:

```text
SOCIAL_POST
SOCIAL_REPLY
SOCIAL_QUOTE
SOCIAL_REPOST
```

because those are kinds of one graph-node semantic object, not separate owner domains.

## 7. `SocialItemDurableLocator`

Conceptual locator:

```text
SocialItemDurableLocator
=
ownerScope = INTERACTIVE_SOCIAL_FEED
+ namespace = SOCIAL_ITEM
+ opaqueObjectId
```

The locator is distinct from:

```text
SF-2 itemOrdinal
SF-2 timelineOrdinal
actorOrdinal
handle
displayName
content fingerprint
presentation control binding
DOM node identity
sourceAuthorityRef
```

No string/ordinal similarity may reconstruct an exact durable item.

## 8. Interactive qualification is selective

The existence of a SOCIAL_FEED snapshot does not require every visible item to become durable immediately.

Preferred first design:

```text
item receives durable identity
only when an admitted interactive surface/action requires later exact targeting
```

Examples:

```text
item with REPLY / QUOTE / REPOST controls
→ interaction-qualified → durable SOCIAL_ITEM target

pure read-only item with no durable consumer
→ may remain snapshot-local
```

This keeps durable footprint consumer-driven.

## 9. Base item durable promotion

When an accepted snapshot-local social item is interaction-qualified, its durable record preserves only the minimum accepted semantic surface required by later target use.

Conceptually this may include:

```text
locator
kind
semanticRevision
accepted content when applicable
accepted source-local actor attribution snapshot
accepted target relation when the base item itself is dependent
minimum current source-support reference
bounded lifetime metadata
```

It does not create a durable actor/account object.

Canonical rule:

```text
DURABLE SOCIAL ITEM
!=
DURABLE SOCIAL ACCOUNT
```

## 10. Actor durability remains closed

SF-1 actor identity remains snapshot-local for ordinary feed actors.

IM-4 does not admit:

```text
SOCIAL_ACTOR durable namespace
persistent account ID
cross-turn handle ownership
canonical-character account mapping
follower graph
```

If an accepted base item's source-local actor labels must be shown with a durable target preview, they may be retained as a bounded accepted attribution snapshot inside the item's owned semantic surface.

That is not a durable actor identity.

## 11. Direct user authorship

All four admitted IM-4 mutations use:

```text
USER_DIRECT_SOURCE_SELF
```

as their first authorship class.

Meaning:

```text
the current user directly submitted this source-local action/text through the admitted SOCIAL_FEED interaction surface
```

It does not mean:

```text
persistent social account exists
canonical protagonist account exists
handle is known
profile identity is known
platform credential is known
```

## 12. Interactive self presentation

The interactive overlay may expose a presentation author view conceptually equivalent to:

```text
kind = SELF_LOCAL
label = presentation-local "You" / localized equivalent
handle = absent
```

The exact label is presentation policy.

It is not copied into the base SF-1 actor table and does not require inventing a handle.

Canonical rule:

```text
SOCIAL UI WANTS AN ACTOR ROW
!=
SIMCORE MAY INVENT A USER ACCOUNT
```

## 13. User-direct text authority

For `CREATE_POST`, `REPLY`, and `QUOTE`, first scope accepts bounded non-empty plain literal text submitted by the current user.

The source-semantic proposition frozen by the mutation is:

```text
USER_DIRECT_SOURCE_SELF published/said the submitted literal text in this interactive social surface
```

The literal text is therefore treated as an attributed social utterance event.

Canonical separation:

```text
USER SAID "X"
may be established by the mutation event

X IS CANONICALLY TRUE
is not established by that event alone
```

The interactive lane does not ask a model to decompose, rewrite, summarize, or strengthen the text.

## 14. First epistemic posture

User-direct content-bearing social items use the conservative source-local posture:

```text
primary mode = ATTRIBUTED_SOCIAL
publication basis = CURRENT_USER_DIRECT_SOURCE_PUBLICATION
```

This preserves the user's own public disclosure as a source event while preventing embedded world claims from being silently promoted to `CONFIRMED_FACT`.

A later richer interactive claim-decomposition contract may be designed separately.

## 15. No model call in IM-4

All admitted mutations are literal direct-user actions.

```text
CREATE_POST → literal user text
REPLY       → literal user text
QUOTE       → literal user commentary
REPOST      → no freeform text
```

Not admitted:

```text
"write a reply for me"
"generate a quote-post reaction"
"rewrite this post in character"
automatic social fanout
model-selected repost
```

Those require a later model-assisted mutation + controlled context design and may activate C6.

## 16. Social item semantic shell

Conceptual durable semantic object:

```text
InteractiveSocialItemV1
  locator
  semanticRevision
  kind
  authorKind = USER_DIRECT_SOURCE_SELF
  content?
  relation?
  creationCommitRef
  overlaySequence
  support surface
  lifetime metadata
```

This is design vocabulary, not an authorized serialized runtime schema.

## 17. Kind-specific content

### POST

```text
kind = POST
content = required bounded non-empty plain text
relation = null
```

### REPLY

```text
kind = REPLY
content = required bounded non-empty plain text
relation = required SOCIAL_REPLY_TO
```

### QUOTE

```text
kind = QUOTE
content = required bounded non-empty plain text
relation = required SOCIAL_QUOTE_OF
```

### REPOST

```text
kind = REPOST
content = null
relation = required SOCIAL_REPOST_OF
```

A REPOST with commentary is rejected rather than repaired into QUOTE.

## 18. Same-family durable relation edge

IM-4 freezes a family-owned relationship concept:

```text
SocialDurableTargetEdgeV1
  relationKind
  targetLocator
  targetExpectedRevision
```

where:

```text
relationKind ∈ {
  SOCIAL_REPLY_TO,
  SOCIAL_QUOTE_OF,
  SOCIAL_REPOST_OF
}
```

This edge owns social graph dependency only.

It is not:

```text
current Handoff/Evidence source authority
generic CC-6 ATTRIBUTED_DERIVED_CLAIM
canonical truth lineage
cross-family propagation authority
```

## 19. Why CC-6 attribution is not reused blindly

CC-6 V1 freezes one semantic lineage relation:

```text
ATTRIBUTED_DERIVED_CLAIM
```

A social REPLY, QUOTE, or REPOST relation is not automatically that semantic proposition.

Examples:

```text
REPLY may disagree without attributing a bounded target claim
QUOTE may comment on a target object while preserving separate commentary
REPOST records a source-local repost action without endorsement or truth promotion
```

Therefore IM-4 opens a narrow same-family relationship edge rather than pretending every social edge is generic attribution lineage.

If a later child explicitly makes a claim such as:

```text
"item P said X"
```

then CC-6 attribution semantics may additionally apply.

## 20. Target kind matrix

Interactive target kinds mirror the frozen SF-2 graph rule.

| new item kind | POST target | REPLY target | QUOTE target | REPOST target |
|---|---:|---:|---:|---:|
| REPLY | allow | allow | allow | deny |
| QUOTE | allow | allow | allow | deny |
| REPOST | allow | allow | allow | deny |

`CREATE_POST` has no target.

No interaction may target a pure REPOST node.

## 21. Exact target resolution

A dependent mutation requires exact:

```text
SocialItemDurableLocator
+
expected semanticRevision
```

Forbidden fallback:

```text
same handle
same text
same old itemOrdinal
same timeline position
same actor label
nearest item
similar target preview
```

If exact target cannot resolve:

```text
SOCIAL_TARGET_UNRESOLVED
→ no commit
```

## 22. Strict target revision policy

First-safe IM-4 policy:

```text
TARGET REVISION MUST MATCH EXACTLY AT COMMIT
```

Example:

```text
user opened reply composer on target T@R4
T becomes R5 before commit

expected R4
current R5
→ SOCIAL_TARGET_REVISION_MISMATCH
→ fail closed
```

The interaction is never silently retargeted to R5.

## 23. Target semantic revision does not advance on dependent creation

Adding a REPLY, QUOTE, or REPOST does not alter the target item's own content/semantic meaning.

Therefore:

```text
create dependent item under/against T@R4
→ T remains R4
```

Target relationship fan-in is owned by the interactive feed overlay, not by rewriting the target semantic revision.

This permits two distinct current user actions against the same unchanged target to coexist.

## 24. Relationship support-at-use

Before any dependent item commit, IM-4 requires:

```text
target locator alive
target expected revision current
target lifetime eligible
target current source/owner support valid
target ordinary visibility/eligibility compatible with relation use
relation kind legal for target kind
```

Failure means no semantic commit.

A durable ID existing in memory is never sufficient by itself.

## 25. New-item relationship after target later changes

IM-4 deliberately keeps C7 partial-survival semantics closed.

Every target-dependent interactive item is first designed as a **current-target relation** bound to an exact target revision.

If its target later changes revision, retires, or loses support:

```text
relationship support-at-use fails
→ dependent item is not ordinary-visible as a currently supported relation
→ no silent floating-latest retarget
→ no guessed survivor rewrite
```

IM-4 does not pin old target revisions merely to preserve the child.

A future requirement such as:

```text
"keep this quote/repost even after the target changes"
```

would require explicit historical-relation / C7 / bounded revision-retention design.

## 26. No target-content copy into child

REPLY / QUOTE / REPOST durable records do not copy the full target body merely for convenience.

Presentation target previews are resolved from the exact supported target object.

Canonical rule:

```text
RELATION EDGE
!=
DUPLICATED TARGET TRUTH STORE
```

This prevents stale copied target text from surviving after current relation support is gone.

## 27. CREATE_POST semantics

`SOCIAL_FEED_CREATE_POST` creates a new root durable `SOCIAL_ITEM`.

Requirements conceptually include:

```text
current admitted interactive SOCIAL_FEED surface
current runtime/presentation binding from IM-1
bounded non-empty plain user text
feed overlay within current capacity
fresh create commit authority
```

It does not require a target durable item.

The created item begins at:

```text
semanticRevision = initial owner revision
kind = POST
```

Exact numeric revision encoding is implementation-owned.

## 28. REPLY semantics

`SOCIAL_FEED_REPLY` creates:

```text
new SOCIAL_ITEM(kind = REPLY)
+
SOCIAL_REPLY_TO exact target edge
+
literal user text
```

Canonical rules:

```text
reply assertion authority != target assertion authority
reply relationship != target endorsement
hidden/unsupported target → reply relation cannot remain ordinary-visible
```

## 29. QUOTE semantics

`SOCIAL_FEED_QUOTE` creates:

```text
new SOCIAL_ITEM(kind = QUOTE)
+
SOCIAL_QUOTE_OF exact target edge
+
literal user commentary
```

The commentary is a new user-authored attributed social utterance.

The target preview is relationship context only.

Canonical rules:

```text
quote commentary may disagree with target
quote commentary truth does not inherit from target
quote existence does not validate target claim
```

## 30. REPOST semantics

`SOCIAL_FEED_REPOST` creates:

```text
new SOCIAL_ITEM(kind = REPOST)
+
SOCIAL_REPOST_OF exact target edge
+
no content
```

The semantic event is only:

```text
USER_DIRECT_SOURCE_SELF reposted target T in this interactive social surface
```

It does not mean:

```text
user endorses T
user agrees with T
T is true
T is more credible
T is more popular
```

No repost count is mutated or displayed by IM-4.

## 31. Acyclicity by create-before-target discipline

First interactive social edges may target only an already committed current durable item.

A newly allocated item cannot target itself or a not-yet-committed future item.

Combined with immutable relation edges in IM-4, this preserves an acyclic relationship graph without graph-repair heuristics.

Still forbidden:

```text
retarget existing child edge
create cycle by later relation mutation
```

Relation retargeting would be a separate C3 item-mutation design.

## 32. Immutable base + overlay

The frozen `ValidatedSocialFeedSemanticSidecarV1` remains immutable after initial validation.

Interactive mutations are stored in a separate owner-scoped overlay conceptually:

```text
InteractiveSocialOverlayV1
  committedItems[]
  nextOverlaySequence
  bounded owner state
```

The overlay does not mutate:

```text
base itemOrdinal
base timelineOrdinal
base actorOrdinal
base validator receipt
base sourceAuthorityRef
```

Canonical rule:

```text
ORIGINAL VALIDATED PROJECTION
!=
LATER USER MUTATION LAYER
```

## 33. Feed-wide serial create lane

SOCIAL_FEED needs deterministic ordering across all new interactive item kinds.

IM-4 therefore selects one conceptual commit lane per interactive feed overlay:

```text
INTERACTIVE_SOCIAL_FEED_CREATE_LANE
```

The lane serializes only the bounded final commit section.

It does not serialize user typing or unrelated UI work.

## 34. Why one feed-wide lane instead of per-target lanes

BOARD IM-3 could use a per-parent reply lane because only child ordering under one POST mattered.

SOCIAL_FEED has one global timeline surface containing:

```text
POST
REPLY
QUOTE
REPOST
```

all created by interaction.

Therefore one feed-wide create lane provides one deterministic overlay ordering domain without rewriting target revisions.

## 35. `SocialItemCreateCommitRef`

IM-4 freezes a semantic create-attempt identity concept:

```text
SocialItemCreateCommitRef
```

Purpose:

```text
one admitted user semantic-create request
→ at most one committed new SOCIAL_ITEM
```

It is stable across internal retries of the same semantic request.

It is not:

```text
IM-1 InteractionAttemptRef
SOCIAL_ITEM durable ID
semantic revision
runtime generation
```

## 36. Internal retry vs second user action

Canonical rule:

```text
same SocialItemCreateCommitRef
→ resolve existing committed item / no duplicate child

distinct commit refs
→ distinct user semantic actions
```

Therefore two user actions with identical literal text are not deduplicated by value equality.

## 37. Overlay sequence

Every committed interactive item receives a bounded owner-generated ordering value conceptually:

```text
overlaySequence
```

Properties:

```text
unique inside one interactive overlay
monotonic in commit order
deterministic relative order among overlay items
not a timestamp
not a durable identity
not canonical world chronology
```

## 38. Base timeline is not renumbered

Interactive mutation does not rewrite the dense SF-2 `timelineOrdinal` values of the frozen base snapshot.

Presentation composition uses two ordering domains:

```text
base semantic timeline order
+
interactive overlay sequence
```

A presentation adapter owns how the interactive insertion edge is shown while preserving overlay relative order.

The adapter may not fabricate publication timestamps from `overlaySequence`.

## 39. Validation-before-commit

For every admitted social create, required conceptual ordering is:

```text
1. IM-1 intent/current presentation checks
2. action registry check
3. payload bounds/plain-text validation
4. current feed surface support check
5. exact target + revision + support checks when dependent
6. kind-specific semantic rules
7. feed/target cardinality caps
8. create-commit idempotency/currentness check
9. allocate/resolve new durable item identity under owner
10. commit overlay item atomically inside feed create lane
11. reconcile presentation from committed state
```

No visible semantic item is authoritative before step 10 succeeds.

## 40. Commit atomicity

A successful commit must not expose mixed state such as:

```text
new durable item exists
but overlay edge missing
```

or:

```text
overlay relation exists
but target/currentness validation was not committed against the same operation
```

Physical transaction mechanism remains implementation-owned.

The semantic requirement is one bounded owner-consistent create commit.

## 41. No optimistic semantic publication by default

IM-4 selects the conservative first UX:

```text
validate + commit semantic object
→ then present committed item
```

A pending composer/spinner may be view-local.

But an uncommitted post/reply/quote/repost must not be rendered as if source mutation already succeeded.

## 42. Relationship item support after source invalidation

Base source support and interactive mutation support remain separate but composable.

If an interaction-qualified base target loses current source support:

```text
target current support fails
→ target cannot be used for new dependent mutation
→ current dependent relations requiring it fail ordinary support-at-use
```

If a user-created root POST has no external B-derived target, its authorship/event authority comes from the admitted direct user mutation record plus current interactive surface lifetime.

This does not grant canonical world truth to its text.

## 43. User-created item support ownership

A committed user-created social item is supported by the interaction owner for the bounded interactive-feed lifetime.

Conceptually its support basis includes:

```text
valid admitted interaction surface at creation
USER_DIRECT_SOURCE_UI origin
committed create authority
current owner lifetime/currentness
exact target relation support when dependent
```

It does not require pretending its text came from the original direct-B source projection.

Canonical rule:

```text
USER MUTATION SOURCE SUPPORT
!=
ORIGINAL B-ROOT CONTENT SUPPORT
```

## 44. Dependent item support is conjunctive

For REPLY / QUOTE / REPOST:

```text
child own committed mutation support
AND
exact target relation support
→ ordinary supported dependent item
```

If either side fails, the dependent item is not ordinary-supported.

The child is never allowed to keep a broken target relation merely because its own user text is harmless.

## 45. No copied target preview fallback

If the exact target cannot be resolved/currently supported, presentation must not silently fall back to:

```text
cached copied body
same-text target
same-handle target
old DOM preview
historical transcript fragment
```

First-safe result:

```text
relation unsupported
→ dependent item ordinary presentation withheld / bounded unavailable state
```

Exact future UI wording is presentation policy.

## 46. Presentation composition

A future interactive social presentation read model conceptually composes:

```text
accepted base social items
+
currently supported committed overlay items
```

The renderer receives no mutation authority.

It may emit new IM-1 control bindings for newly committed durable items.

Therefore a newly created POST / REPLY / QUOTE may itself become a later exact target without inventing a second identity system.

## 47. REPOST presentation

A REPOST item must remain relationship-only.

Presentation may show conceptually:

```text
You reposted
[target preview]
```

It must not synthesize:

```text
commentary
endorsement language
repost count
published time
```

unless separately authorized semantics later exist.

## 48. QUOTE presentation

A QUOTE may show:

```text
self-local author surface
literal user commentary
one bounded exact target preview
```

The target preview remains a view of accepted target semantics, not copied child semantics.

## 49. REPLY presentation

A REPLY may show relationship context according to SOCIAL_TIMELINE presentation policy.

It does not require converting the social graph into BOARD thread semantics.

Canonical rule:

```text
SOCIAL REPLY EDGE
!=
BOARD REPLY TREE
```

## 50. No aggregate metric side effects

Creating an interactive relation does not imply ordinary source metric mutation.

Examples:

```text
create REPLY
→ do NOT claim replyCount += 1

create REPOST
→ do NOT claim repostCount += 1

create QUOTE
→ do NOT claim quoteCount += 1
```

The interactive overlay knows how many objects it owns, but overlay cardinality is not source-wide aggregate metric authority.

## 51. No persistent account side effects

Repeated user-created social items may all render with the same self-local presentation treatment during the interactive surface lifetime.

That visual consistency does not create:

```text
persistent account ID
handle
profile picture
follower state
cross-conversation identity
```

A future persistent user social-account contract must be designed separately.

## 52. Lifetime

IM-4 adopts the same narrow first durability posture established by IM-2/IM-3:

```text
CURRENT_RUNTIME_INTERACTIVE_SOCIAL_FEED_LIFETIME
```

Default retirement events include conceptually:

```text
runtime disposal/replacement
conversation change
interactive social surface retirement
owner-defined source surface invalidation
explicit teardown
```

No reload restoration is authorized.

## 53. No persistent backend selection

IM-4 does not select:

```text
localStorage
IndexedDB
SQLite
remote database
host transcript hidden marker
file persistence
```

Memory-only owner state is sufficient for the first runtime-lifetime contract.

Durable here means semantically addressable beyond one projection/UI event, not necessarily disk-persistent.

## 54. C6 remains closed

Interactive social items do not automatically re-enter future model context.

```text
visible old interactive post
!=
model context memory
```

If a later model-assisted action must read old user-created social content, Candidate C C6 / controlled context re-entry must be explicitly opened for that action.

## 55. C7 remains closed

No child-survival/retargeting semantics are admitted after target revision change or retirement.

First posture:

```text
exact target relation loses support
→ dependent relation loses ordinary support
```

Future historical quote/repost survival requires its own bounded design.

## 56. C8 remains closed

IM-4 performs no asynchronous external materialization.

No image generation, fetch, delayed attachment, or media callback exists in this design.

Those belong to IM-5.

## 57. Edit/delete/reroll remain deferred

IM-4 does not admit:

```text
SOCIAL_FEED_EDIT_ITEM
SOCIAL_FEED_DELETE_ITEM
SOCIAL_FEED_REROLL_ITEM
SOCIAL_FEED_RETARGET_RELATION
```

Those operations would reopen:

```text
C3 item mutation
C7 descendant survival / relationship reconciliation
historical target semantics
possible C6 if model-assisted reroll is used
```

They require a separate child design.

## 58. Failure taxonomy

Conceptual failure classes include:

```text
INVALID_SOCIAL_INTERACTION_PAYLOAD
SOCIAL_INTERACTION_SURFACE_STALE
SOCIAL_TARGET_UNRESOLVED
SOCIAL_TARGET_KIND_UNSUPPORTED
SOCIAL_TARGET_REVISION_MISMATCH
SOCIAL_TARGET_SUPPORT_INVALID
SOCIAL_TARGET_NOT_ELIGIBLE
SOCIAL_CREATE_CAP_REACHED
SOCIAL_CREATE_COMMIT_DUPLICATE
SOCIAL_CREATE_OPERATION_STALE
SOCIAL_RELATION_UNSUPPORTED
SOCIAL_REACT_SEMANTIC_NOT_AUTHORIZED
```

Exact runtime encoding remains future implementation work.

## 59. No hidden retry / retarget

On stale target or unsupported relation:

```text
NO hidden target lookup
NO float-to-latest revision
NO same-text retarget
NO model rewrite
NO automatic conversion REPOST ↔ QUOTE
NO semantic retry using a new commit authority without a new user action
```

The UI may invite a fresh user action after showing bounded current state, but that new action is a new intent.

## 60. Boundedness requirements

A future implementation must freeze concrete hard caps before runtime authority, including at minimum:

```text
max direct-user text chars/bytes
max committed interactive items per feed surface
max currently durable targetable base items
max relationship depth reachable through currently supported target chains
max self-local overlay bytes
max live control bindings for interactive social items
```

No unbounded transcript/history scan is permitted.

## 61. Cost / dormancy

When no interactive SOCIAL_FEED surface exists:

```text
IM-4 durable social state = 0
IM-4 relation lookup = 0
IM-4 mutation validation = 0
IM-4 model calls = 0
IM-4 network/media = 0
```

When active, work scales with:

```text
current interactive feed overlay
+
one exact target chain when required
```

not all prior SOCIAL_FEED projections.

## 62. Host integration blocker remains

IM-1 already freezes that active host event integration requires an exact current presentation binding.

LRE-1 host coupling remains a runtime prerequisite.

Therefore:

```text
IM-4 DESIGN FROZEN
!=
SOCIAL UI BUTTONS RUNTIME-READY
```

No content-hash, DOM-text, or transcript-position workaround is authorized.

## 63. Implementation authority

IM-4 freezes semantics only.

It does not authorize implementation of:

```text
SOCIAL_ITEM allocator
interactive overlay store
create lane
commit-ref registry
relationship lookup
UI controls
renderer mutation hooks
runtime host binding
transport
model calls
persistence
release
```

Production remains unchanged.

## 64. Validation scenarios for later implementation

A future implementation should prove at minimum:

### S1 · create post

```text
current social surface
→ user literal post
→ one new SOCIAL_ITEM(POST)
```

### S2 · distinct duplicate-looking posts

```text
user submits identical text twice as two actions
→ two distinct items
```

### S3 · internal retry

```text
same create commit ref delivered twice
→ one committed item
```

### S4 · reply target exactness

```text
composer opened on T@R3
T becomes R4
→ reply commit rejected
```

### S5 · quote separation

```text
user quote commentary disagrees with T
→ commentary remains separate from target truth
```

### S6 · repost non-endorsement

```text
user reposts T
→ source-local repost event only
→ no endorsement/truth upgrade
```

### S7 · target support invalidation

```text
dependent item committed
→ target later loses support
→ relation no longer ordinary-supported
```

### S8 · repost target denied

```text
attempt REPOST → existing REPOST target
→ reject target kind
```

### S9 · no metrics

```text
reply/repost created
→ no replyCount/repostCount source metric appears
```

### S10 · no account invention

```text
multiple user items
→ consistent self-local view allowed
→ no persistent handle/account created
```

### S11 · no context re-entry

```text
interactive social item remains visible
→ next unrelated model request receives no automatic source-memory injection
```

### S12 · source-irrelevant baseline

```text
no interactive social surface
→ zero IM-4 semantic burden
```

## 65. Relationship to IM-3

IM-3 and IM-4 deliberately share several mutation principles:

```text
immutable validated base
owner-scoped interactive overlay
literal user-authored first mutation
separate durable identity/revision/operation authority
validation before commit
no metric fabrication
no automatic model context re-entry
```

But their ordering domains differ:

```text
BOARD
→ per-parent reply lane

SOCIAL_FEED
→ one feed-wide create lane
```

because SOCIAL_FEED owns one mixed global timeline of several item kinds.

## 66. IM-4 frozen decisions

Frozen:

```text
first admitted semantic actions
= CREATE_POST / REPLY / QUOTE / REPOST

semantic REACT
= DEFER

first durable namespace
= SOCIAL_ITEM

owner scope
= INTERACTIVE_SOCIAL_FEED

author
= USER_DIRECT_SOURCE_SELF

account durability
= NONE

base mutation
= NONE

overlay
= YES, conceptual

target policy
= exact durable locator + exact expected revision + support-at-use

target kind matrix
= mirrors SF-2; REPOST target denied

target semantic revision on child create
= unchanged

dependent relation after target changes
= fail support / no floating retarget

create ordering
= feed-wide serial lane + overlaySequence

idempotency
= SocialItemCreateCommitRef

model call
= NONE

aggregate metrics
= NONE

context re-entry
= NONE

reload persistence
= NONE
```

## 67. Deferred decisions

Deferred:

```text
semantic reaction/toggle state
persistent social account identity
edit/delete/reroll
historical quote/repost survival
relation retargeting
model-assisted social mutation
private/follower-only interactive feeds
aggregate engagement metrics
media generation/fetch/attachment
C6 source context re-entry
C7 partial descendant survival
C8 delayed effects
physical storage backend
exact runtime schemas/constants
active host DOM/event integration
```

## 68. Handoff to IM-5

IM-5 receives this new exact-object surface:

```text
SOCIAL_ITEM durable locator
+ semantic revision
+ bounded current-runtime lifetime
+ interactive owner
```

That gives External Materialization a legitimate future exact target for optional media/effects without turning DOM nodes into attachment authority.

IM-5 must still independently design:

```text
operation ownership
generation/token currentness
provider/materializer authority
cancellation
late-result rejection
semantic vs decorative media split
C8 activation when delayed result must reattach to an exact old item
```

## 69. Final classification

```text
checkpoint      = IM-4
family          = SOCIAL_FEED
first actions   = CREATE_POST / REPLY / QUOTE / REPOST
react           = semantic DEFER / P0 local only
durable object  = SOCIAL_ITEM
author          = USER_DIRECT_SOURCE_SELF
relation        = strict exact current target revision
ordering        = feed-wide serial create lane
base            = immutable
mutation layer  = interactive overlay
C5              = narrow same-family relation only
C6/C7/C8        = closed
runtime         = not authorized
production      = unchanged
next            = IM-5 External Materialization / Async Operation Ownership
```
