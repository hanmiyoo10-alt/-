# SimCore Post-3.0M IM-3 Interactive BOARD Mutation Semantics Design — 2026-09-03

Date: 2026-09-03 KST

Status: **IM-3 DESIGN FROZEN · FIRST SEMANTIC MUTATION = BOARD_APPEND_REPLY · USER-DIRECT LITERAL REPLY · BOARD_REPLY DURABLE CHILD IDENTITY ADMITTED · IMMUTABLE BASE + INTERACTIVE OVERLAY · PARENT SEMANTIC REVISION DOES NOT ADVANCE ON APPEND · PER-PARENT SERIAL APPEND LANE · VALIDATE BEFORE COMMIT · NO MODEL CALL · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · INTERACTION / MATERIALIZATION · IM-3 · INTERACTIVE BOARD · APPEND_CHILD · USER-AUTHORED SOURCE MUTATION · DESIGN-ONLY**

## 0. Purpose

IM-3 freezes the first complete semantic mutation contract for Source Intelligence interaction.

The first admitted operation is:

```text
BOARD_APPEND_REPLY
```

The concrete product question is:

```text
A user is viewing an accepted BOARD POST.
The IM-1 control plane proves the UI event is current.
IM-2 proves the exact durable BOARD_POST target is current and supported.
The user submits literal reply text.

How is that text represented semantically?
How is authorship represented without inventing a canonical account?
Does the parent POST revision advance?
How are two valid appends ordered?
How is duplicate commit prevented?
What validation occurs before commit?
How is the new child presented without rewriting the frozen base Board sidecar?
What happens if the parent becomes stale or unsupported?
```

IM-3 is design-only.

It does not implement buttons, event listeners, a mutation engine, a runtime ID allocator, a persistent Board database, model generation, network/media effects, cross-family propagation, context re-entry, release changes, or `release-simcore` mutation.

## 1. Authority chain

IM-3 consumes:

```text
docs/SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_INTERACTION_IM1_SOURCE_INTERACTION_INTENT_STALE_EVENT_SAFETY_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM2_BOARD_APPEND_REPLY_MINIMUM_DURABLE_TARGET_DESIGN_2026-09-03.md
docs/SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC5_ITEM_MUTATION_APPEND_RECONCILIATION_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/REPOSITORY_COMMON_RULES.md
```

Production runtime authority remains `release-simcore`.

Inherited firewalls remain:

```text
UI INTENT != SEMANTIC COMMIT
PRESENTATION BINDING != DURABLE OBJECT ID
DURABLE OBJECT ID != SEMANTIC REVISION
SEMANTIC REVISION != OPERATION AUTHORITY
FOUND BY ID != SUPPORTED FOR USE
USER AUTHORED TEXT != CANONICAL WORLD FACT
APPEND_CHILD != GENERIC MERGE
PERSISTED / DURABLE != CANONICAL TRUTH
```

## 2. IM-3 capability profile

IM-3 opens only the minimum Candidate C lanes required by the first concrete append mutation.

```text
C1 survival         = YES, current-runtime bounded lifetime
C2 stable identity  = YES, BOARD_POST parent + BOARD_REPLY child
C3 item mutation    = NO for edit/reroll/delete in this checkpoint
C4 append/merge     = YES, APPEND_CHILD only
C5 derived lineage  = NO
C6 context reentry  = NO
C7 partial survival = NO
C8 delayed effect   = NO
```

Canonical rule:

```text
BOARD_APPEND_REPLY DESIGN FROZEN
!=
GENERAL INTERACTIVE BOARD WRITER AUTHORIZED
```

## 3. IM-3 primary architecture

Selected architecture:

```text
IMMUTABLE_VALIDATED_BOARD_BASE
+
OWNER_SCOPED_INTERACTIVE_REPLY_OVERLAY
+
USER_DIRECT_LITERAL_AUTHORSHIP
+
EXACT_PARENT_TARGET
+
PER_PARENT_SERIAL_APPEND_LANE
+
IDEMPOTENT_COMMIT_REF
+
VALIDATE_BEFORE_COMMIT
+
COMMIT_THEN_PRESENT
```

Conceptual flow:

```text
Validated Board base
        +
IM-2 durable BOARD_POST target
        ↓
IM-1 admitted BOARD_APPEND_REPLY intent
        ↓
exact parent resolve + expected parent revision
        ↓
user-direct literal reply candidate
        ↓
interaction-specific semantic validation
        ↓
allocate BOARD_REPLY durable identity
        ↓
per-parent append lane
        ↓
commit child + parent relation + deterministic append sequence
        ↓
interactive Board overlay
        ↓
presentation reconciliation
```

## 4. Frozen base Board is not rewritten

IM-3 preserves the frozen 3M-5 Board sidecar as the immutable validated base projection.

```text
ValidatedBoardSemanticSidecarV1
= base source projection
```

IM-3 does not mutate that object in place.

Instead:

```text
base validated Board
+
interactive owner-scoped overlay
→ current interactive presentation view
```

Canonical rule:

```text
USER INTERACTION
MUST NOT RETROACTIVELY REWRITE
THE ORIGINAL VALIDATED SOURCE PROJECTION
```

This keeps generated-source validation authority separate from later user-authored source mutation.

## 5. Why an overlay is selected

Directly patching the original sidecar would conflate:

```text
model/source generated semantics
validator-owned accepted output
later user-authored semantics
mutation/revision ownership
presentation state
```

The overlay keeps these responsibilities explicit.

It also avoids creating a full mutable Board database merely to support one reply operation.

## 6. First admitted mutation operation

The only mutation operation frozen by IM-3 is:

```text
BOARD_APPEND_REPLY
```

Semantics:

```text
create one new direct REPLY child
under one exact durable BOARD_POST parent
using literal bounded text directly submitted by the current user
```

Not admitted in IM-3:

```text
BOARD_ADD_POST
BOARD_EDIT_ITEM
BOARD_DELETE_ITEM
BOARD_REROLL_ITEM
BOARD_RECOMMEND
REPLY_TO_REPLY
BULK_APPEND
CROSS_BOARD_MOVE
REPARENT_REPLY
```

These remain follow-up work.

## 7. First authoring mode: user-direct literal

IM-3 selects:

```text
USER_DIRECT_LITERAL
```

for the first mutation producer.

Meaning:

```text
text typed/submitted through the admitted source interaction control
→ becomes the reply's semantic text
```

No model is called to rewrite, polish, summarize, expand, or reinterpret that text.

Canonical rule:

```text
USER SUBMITTED SOURCE TEXT
!=
MODEL GENERATION REQUEST
```

A later model-assisted operation is a different mutation class and may activate additional C6/currentness requirements.

## 8. Exact literal does not mean unsafe raw markup

The semantic payload is plain text.

A runtime implementation may apply only bounded structural normalization such as safe line-ending normalization when explicitly owned.

It must not perform semantic rewriting.

Presentation continues to escape/untrust the text.

Forbidden:

```text
user enters <script>...</script>
→ trusted HTML
```

## 9. Empty and oversized payload rule

The reply payload must be:

```text
non-empty after owner-defined structural whitespace validation
bounded by concrete runtime hard caps
plain semantic text
```

Failure outcomes include:

```text
EMPTY_REPLY
PAYLOAD_LIMIT_EXCEEDED
INVALID_REPLY_TEXT
```

Exact numeric limits are runtime hard-cap work and are not frozen by IM-3.

## 10. User source authorship identity

IM-3 deliberately does not create a durable Board account/profile identity.

Selected authorship concept:

```text
USER_DIRECT_SOURCE_SELF
```

This means:

```text
the current user explicitly authored this source reply
through the admitted interactive source control
```

It does not mean:

```text
canonical protagonist account
canonical character identity
persistent Board username
verified in-world identity
cross-family SOCIAL_ACTOR identity
```

## 11. Self authorship is not a canonical actor mapping

Canonical rule:

```text
USER_DIRECT_SOURCE_SELF
!=
PROTAGONIST_CANONICAL_ID
```

If a future product wants:

```text
"the protagonist posts as @hunter_aria"
```

that requires an explicit source-actor mapping contract.

IM-3 does not infer it from the user's role in the conversation.

## 12. Presentation label for self authorship

The semantic reply does not require a persistent username string.

Presentation may render a product-owned local self indicator such as an equivalent of:

```text
You / Me / Self
```

without claiming a durable source account.

A future named account label becomes semantic actor data only when a dedicated actor contract owns it.

## 13. User reply epistemic class

A direct user reply is represented as:

```text
ATTRIBUTED_SOCIAL
```

with authorship basis:

```text
USER_DIRECT_SOURCE_SELF
```

This is the key semantic statement:

```text
"the current interactive source self posted this text"
```

It is not:

```text
"every factual proposition inside this text is confirmed true"
```

## 14. Embedded claims do not become canonical truth

Example:

```text
user reply text:
"The director is definitely a spy."
```

The committed source semantics may establish only:

```text
USER_DIRECT_SOURCE_SELF
posted the text
"The director is definitely a spy."
```

It does not establish:

```text
DIRECTOR_IS_SPY = CANONICAL FACT
```

Canonical rule:

```text
DIRECT USER PUBLICATION
AUTHORIZES THE ATTRIBUTED UTTERANCE
NOT THE TRUTH OF EMBEDDED CLAIMS
```

## 15. Interaction-specific publication basis

The original 3M-2 `ATTRIBUTED_SOCIAL` path primarily handled model/source-generated social attribution supported by source-community context.

IM-3 introduces a narrower interaction-specific basis:

```text
DIRECT_USER_SOURCE_PUBLICATION
```

Meaning:

```text
the user explicitly chose to publish this exact text through a public/source interaction control
```

This may allow the attributed utterance itself to be admitted without pretending the utterance was already present in historical source-community context.

Suggested validator reason vocabulary:

```text
ALLOW_USER_DIRECT_SOURCE_PUBLICATION
```

This is local to the interactive mutation consumer.

It does not silently rewrite the global 3M-2 policy table.

## 16. Explicit user publication and private information

If the user explicitly types information into the source reply field and submits it, the publication act itself is current user authority to publish that utterance in the source surface.

This is categorically different from the model leaking unexposed private information into a generated community reply.

Canonical distinction:

```text
MODEL INVENTS / LEAKS PRIVATE FACT INTO SOURCE
!=
USER EXPLICITLY SUBMITS TEXT TO SOURCE
```

The latter still does not upgrade embedded claims to canonical truth.

## 17. First durable child namespace

IM-3 admits exactly one new concrete Candidate C namespace:

```text
BOARD_REPLY
```

Owner scope remains:

```text
INTERACTIVE_BOARD
```

Conceptual locator:

```text
BoardReplyDurableLocator
=
ownerScope = INTERACTIVE_BOARD
+ namespace = BOARD_REPLY
+ opaqueObjectId
```

## 18. Why BOARD_REPLY receives durable identity

The committed reply must remain exactly identifiable during its bounded interactive lifetime for:

```text
presentation reconciliation
duplicate-commit resolution
parent-child relation integrity
future exact retirement during current lifetime if later authorized
stale-reference diagnostics
```

Therefore projection-local ordinal or text equality is insufficient.

Canonical rule:

```text
NEW COMMITTED INTERACTIVE REPLY
→ NEW BOARD_REPLY DURABLE ID
```

## 19. Reply identity is not account identity

```text
BOARD_REPLY durable ID
!=
BOARD participant/profile ID
```

IM-3 does not admit:

```text
BOARD_PARTICIPANT
BOARD_ACCOUNT
```

as durable namespaces.

## 20. Interactive reply semantic object

Frozen conceptual object:

```text
InteractiveBoardReplyV1
  locator
  semanticRevision
  parentBoardPostLocator
  parentObservedSemanticRevision
  authorshipKind = USER_DIRECT_SOURCE_SELF
  mode = ATTRIBUTED_SOCIAL
  publicationBasis = DIRECT_USER_SOURCE_PUBLICATION
  content
  appendSequence
  lifetimeProfile
  relationState = LIVE
```

This is conceptual vocabulary, not a serialized runtime schema.

## 21. Reply `title`

Interactive BOARD replies remain direct children of top-level POSTs.

Therefore:

```text
title = NONE
```

The renderer must not invent a reply title.

## 22. Reply nesting remains flat

3M-5 Board V1 allows:

```text
REPLY → POST
```

and forbids:

```text
REPLY → REPLY
```

IM-3 preserves that invariant.

`BOARD_APPEND_REPLY` can target only namespace:

```text
BOARD_POST
```

not `BOARD_REPLY`.

## 23. Parent relation authority

The reply stores an exact parent locator:

```text
parentBoardPostLocator
```

It does not rediscover the parent by:

```text
title
text similarity
old entryOrdinal
DOM position
content hash
```

## 24. Parent observed semantic revision

The reply operation begins from the exact parent semantic revision the user observed.

Conceptually:

```text
expectedParentSemanticRevision
```

Before commit:

```text
current parent semantic revision
MUST equal
expected parent semantic revision
```

Failure:

```text
PARENT_REVISION_MISMATCH
```

No silent refresh.

## 25. Why strict parent semantic revision is required

Reply meaning can depend on the exact parent text/title the user saw.

If the parent changed after the UI was rendered:

```text
same POST identity
but different semantic content
```

then auto-attaching the old reply request could misrepresent user intent.

Therefore:

```text
SAME PARENT ID
+ DIFFERENT PARENT REVISION
→ REJECT OLD APPEND INTENT
```

## 26. Append does not advance parent semantic revision

IM-3 selects:

```text
BOARD_APPEND_REPLY
DOES NOT ADVANCE
BOARD_POST semanticRevision
```

Reason:

The parent POST revision is defined by the owner as the semantic state of the POST itself:

```text
mode
title
content
owner-defined post-local semantic fields
```

Adding a child reply changes the relationship collection, not the parent POST content.

Canonical rule:

```text
CHILD APPENDED
!=
PARENT POST CONTENT EDITED
```

## 27. Why this matters for concurrency

If appending reply A advanced the parent POST revision, then reply B submitted from the same observed parent text could fail merely because A committed first.

That would create unnecessary false staleness.

IM-3 instead allows:

```text
same parent P @ R3
append A
append B
```

both to commit if:

```text
P is still alive
P support is still current
P semanticRevision is still R3
```

## 28. Per-parent append lane

IM-3 selects a bounded owner-scoped lane:

```text
BOARD_POST_REPLY_APPEND_LANE
```

One conceptual lane exists per durable parent POST during its current interactive lifetime.

Purpose:

```text
serialize commit points
assign deterministic append order
prevent relation corruption
make duplicate commit detection bounded
```

This is not a global worker or background queue.

## 29. Append lane is not parent semantic revision

The append lane may own operational ordering metadata.

It must not be confused with:

```text
BOARD_POST semanticRevision
```

Canonical rule:

```text
REPLY COLLECTION CHANGED
!=
PARENT POST SEMANTIC REVISION CHANGED
```

## 30. Append sequence

Each successfully committed reply receives a parent-local deterministic:

```text
appendSequence
```

Properties:

```text
monotonic inside one parent append lane
assigned at commit
used for stable presentation order
not a wall-clock timestamp
not a durable object identity
not source truth authority
```

## 31. Distinct user actions remain distinct replies

IM-1 already distinguishes duplicate dispatch from two intentional user attempts.

IM-3 preserves:

```text
two distinct admitted semantic append requests
+ same content
→ two distinct BOARD_REPLY objects
```

Text equality does not deduplicate user intent.

## 32. Durable append commit reference

IM-3 introduces a bounded conceptual operation identity:

```text
BoardAppendCommitRef
```

Purpose:

```text
identify one already-admitted semantic append request
across internal commit retry/re-entry inside the same current runtime operation path
```

It is allocated after IM-1 intent admission and before semantic commit.

## 33. Commit ref is not reply identity

```text
BoardAppendCommitRef
!=
BOARD_REPLY locator
```

One successful commit ref resolves to exactly one committed child locator.

Conceptually:

```text
commitRef X
→ BOARD_REPLY R
```

A second commit attempt with the same `commitRef X` must not allocate another reply.

## 34. Commit ref is not CC-2 async operation token

The first append pipeline is synchronous/local and serialized at commit.

Therefore IM-3 does not require a supersession token merely because an operation exists.

Canonical rule:

```text
BoardAppendCommitRef
= idempotent semantic request identity

CC-2 Operation Authority Token
= late/overlapping attempt currentness when required
```

They are different concepts.

If later model generation/network/async work is inserted before commit, the operation-token requirement must be re-evaluated.

## 35. Duplicate commit rule

Inside the bounded runtime lifetime:

```text
commitRef unseen
→ normal validation / possible commit

commitRef already committed
→ return/reconcile existing committed child result
→ DO NOT create a second child
```

This prevents an internal retry from duplicating one admitted semantic action.

It does not merge two distinct user actions.

## 36. Parent support-at-use

Before commit the parent must pass IM-2 / 3M-6 support-at-use.

Required predicates include conceptually:

```text
exact parent locator resolves
parent is alive within interactive lifetime
current support authority matches required source support
parent is still eligible for ordinary Board use
```

Failure outcomes include:

```text
PARENT_TARGET_UNRESOLVED
PARENT_EXPIRED
PARENT_SUPPORT_MISMATCH
PARENT_NOT_ELIGIBLE
```

## 37. Reply content authority is user authorship, not parent source truth

The parent source authority establishes:

```text
this reply is attached to this still-supported Board context
```

It does not establish:

```text
reply text is true because parent B source is true
```

The reply's content authority is:

```text
USER_DIRECT_SOURCE_PUBLICATION
```

The parent relation authority and reply-content authorship authority remain separate.

## 38. New child validation

The first user-direct reply candidate must satisfy:

```text
valid exact parent
parent support/currentness
parent expected semantic revision
payload bounds/plain-text contract
allowed operation = BOARD_APPEND_REPLY
authorshipKind = USER_DIRECT_SOURCE_SELF
mode = ATTRIBUTED_SOCIAL
publicationBasis = DIRECT_USER_SOURCE_PUBLICATION
flat Board relation invariant
owner/lifetime capacity limits
```

No raw client/UI field may self-declare:

```text
isValid
safeToRender
canonicalFact
sourceAuthorityRef
revision
appendSequence
reply object ID
```

## 39. Validate before identity allocation when practical

CC-1 identity qualification remains authoritative.

Preferred order:

```text
reject malformed/invalid candidate first
→ allocate BOARD_REPLY durable ID only for an admitted semantic child
```

If a future implementation must reserve an ID earlier for transactional reasons, rejected candidates must not become live durable source objects merely because an ID token was reserved.

## 40. Commit-time recheck

Validation before entering the append lane is not sufficient by itself.

Immediately before commit the owner must re-check the predicates that may have changed:

```text
parent still resolves
parent still alive
parent semanticRevision still matches expected revision
parent support still current
commitRef not already committed
reply capacity still available
```

Failure means:

```text
DO NOT COMMIT CHILD
```

## 41. First-safe commit unit

Conceptually one successful append commit publishes a consistent owner-scoped state containing:

```text
new BOARD_REPLY semantic object
+
exact parent-child relation
+
parent-local appendSequence
+
commitRef → child result mapping
```

These must not become observably mixed such as:

```text
reply object exists
but parent relation missing
```

or:

```text
relation exists
but child semantic payload absent
```

IM-3 does not choose a physical transaction technology.

## 42. Reply semantic revision

A newly committed reply starts its own independent semantic revision domain.

Conceptually:

```text
new BOARD_REPLY
→ initial semantic revision
```

Exact numeric/string encoding is not frozen.

No later revision operation on replies is authorized by IM-3.

## 43. Reply lifetime

The reply inherits the bounded current-runtime interactive Board lifetime profile.

It does not survive by default across:

```text
runtime reload
conversation replacement
interactive Board retirement
parent retirement
owner lifetime expiry
```

No reload restoration is added.

## 44. Parent expiry cascades to current child use

Without C7 partial-survival semantics:

```text
parent becomes unavailable / retired / unsupported
→ interactive reply cannot remain an ordinary live Board child
```

First-safe behavior:

```text
WITHHOLD / RETIRE FROM CURRENT PRESENTATION
```

The exact physical memory cleanup may occur separately.

## 45. Parent source replacement

If the supporting source is rerolled/replaced and IM-2 support-at-use fails:

```text
old BOARD_POST durable target
→ no longer valid current parent

interactive replies under that parent
→ no automatic migration to a new similar POST
```

Forbidden:

```text
new post looks similar
→ move old replies onto it
```

That would require explicit C7 reconciliation/survivor design.

## 46. Future parent edit interaction

IM-3 does not authorize `BOARD_EDIT_ITEM`.

If another future operation changes parent semantic revision, existing interactive replies may semantically depend on the old parent content.

Therefore a future edit checkpoint must define descendant revalidation/disposition before preserving them as ordinary live children.

Until such a contract exists:

```text
PARENT SEMANTIC REVISION ADVANCES
→ existing dependent reply use requires reconciliation proof
```

## 47. Presentation reconciliation occurs after semantic commit

Default sequence:

```text
semantic append committed
        ↓
interactive overlay updated
        ↓
Presentation Renderer receives current accepted state
        ↓
Board UI reconciles
```

Forbidden default:

```text
DOM reply appears first
→ semantic commit attempted afterward
```

IM-3 does not select optimistic semantic UI.

## 48. No DOM-owned semantic child

A rendered reply node is not the semantic object.

Canonical rule:

```text
DOM NODE EXISTS
!=
BOARD_REPLY COMMITTED
```

Presentation rebuild/unmount must not create/delete source semantics by itself.

## 49. Interactive overlay composition

Conceptually:

```text
InteractiveBoardPresentationView
=
accepted immutable base entries
+
current live interactive reply overlay entries
```

The overlay does not retroactively add the user reply to the historical model-generated validation receipt.

## 50. Base participant table remains untouched

Because user self authorship is not a generated Board participant/account identity:

```text
base participants[]
→ unchanged
```

Interactive presentation may render the self-authored reply using its dedicated self-author marker.

This avoids inventing a durable `participantOrdinal` that pretends to be a persistent account.

## 51. No whole-Board durability requirement

IM-3 still does not require:

```text
persistent entire Board snapshot
all sibling POSTs retained
all generated participants retained
full reply archive
cross-runtime Board restoration
```

Only the bounded interactive target/overlay state required by admitted actions survives.

## 52. Bounded cardinality requirement

A future runtime must freeze hard caps for at least:

```text
maximum live interactive BOARD_POST targets
maximum interactive replies per parent
maximum reply payload size
maximum live commitRef mappings
maximum aggregate interactive Board bytes
```

Source-irrelevant turns must not scan these structures.

IM-3 does not freeze numeric values.

## 53. Dormancy rule

When no current Source Interaction event is being processed:

```text
no history-wide interaction scan
no model call
no network call
no polling
no background mutation worker
```

The bounded in-memory state may exist, but existence does not grant active work.

## 54. Failure is fail-closed

Representative semantic outcomes:

```text
INVALID_REPLY_TEXT
PAYLOAD_LIMIT_EXCEEDED
PARENT_TARGET_UNRESOLVED
PARENT_EXPIRED
PARENT_REVISION_MISMATCH
PARENT_SUPPORT_MISMATCH
PARENT_NOT_ELIGIBLE
APPEND_CAPACITY_EXCEEDED
DUPLICATE_COMMIT_REF
COMMIT_CONSISTENCY_FAILURE
UNSUPPORTED_ACTION
```

No failure may silently retarget or regenerate user text.

## 55. Duplicate commit result semantics

`DUPLICATE_COMMIT_REF` is not necessarily a user-visible error.

If the same admitted semantic request already committed successfully, the owner may return an idempotent existing-result disposition conceptually:

```text
ALREADY_COMMITTED
+ existing child locator
```

without creating new semantic state.

## 56. Two identical replies are legal

If the user intentionally submits the same text twice as two distinct admitted append requests:

```text
"agree"
"agree"
```

then two replies are legal.

Each has:

```text
distinct commitRef
distinct BOARD_REPLY locator
distinct appendSequence
```

## 57. No model call in first append path

The first operation must not add:

```text
model rewrite
model moderation classification as semantic authority
model inference of author identity
model generation of reply text
```

The user's literal source text is sufficient.

A later model-assisted reply operation must be a distinct action kind.

## 58. Model-assisted future reply is not a small extension

A future action such as:

```text
BOARD_GENERATE_REPLY
```

may require:

```text
controlled parent/source context re-entry
model-generated candidate validation
C6 activation for derived semantic context
operation token/currentness if generation finishes late
new attribution rules
```

Therefore it is explicitly outside IM-3.

## 59. `BOARD_ADD_POST` deferred

Adding a top-level POST requires a container-level target/order contract rather than a single parent POST.

It may require:

```text
BOARD_THREAD/container durable identity
new top-level ordering lane
new user-self authored POST semantics
post title requirements
capacity/dedup semantics
```

Not admitted here.

## 60. `BOARD_EDIT_ITEM` deferred

Edit requires:

```text
exact target locator
editable field ownership
expected target revision
new semantic validation
descendant dependency handling
```

Not admitted here.

## 61. `BOARD_DELETE_ITEM` deferred

Delete requires explicit descendant disposition and retirement/tombstone semantics.

Not admitted here.

## 62. `BOARD_REROLL_ITEM` deferred

Reroll is model-assisted semantic replacement/regeneration and must choose:

```text
REROLL_IN_PLACE
or
REROLL_REPLACE
```

plus descendant and late-operation safety.

Not admitted here.

## 63. `BOARD_RECOMMEND` deferred

A recommend/upvote button creates semantic source state only if the count/value becomes part of the source object.

It therefore needs:

```text
counter ownership
idempotency per user/action if applicable
currentness rules
truth/non-truth separation
```

Not admitted here.

## 64. LRE-1 host blocker remains

IM-3 does not solve the current host identity/mount gap.

Actual runtime interaction still requires a proven exact source presentation binding.

Forbidden shortcuts remain:

```text
content hash as message identity
DOM order as semantic identity
hidden transcript marker
legacy prose parsed into trusted source semantics
```

Therefore:

```text
IM-3 DESIGN FROZEN
!=
ACTIVE HOST INTERACTION READY
```

## 65. Runtime implementation preconditions

Before runtime implementation of this operation, at minimum re-prove:

```text
G1 then-current production/host preflight
exact interactive presentation binding
IM-1 control binding lifecycle
IM-2 durable BOARD_POST allocation/lookup
BOARD_REPLY allocation owner
per-parent append lane bounds
hard caps
support-at-use integration
atomic/consistent owner-scoped commit mechanism
presentation reconciliation
instrumentation for duplicate/stale failures
```

## 66. Validation scenarios for future runtime

At minimum test:

```text
A1 one valid reply appends once
A2 same physical dispatch attempt duplicated → one semantic operation
A3 same commitRef retried → one committed reply
A4 two distinct user submissions with same text → two replies
A5 two different replies from same parent revision → both commit in deterministic sequence
A6 parent semantic revision changes before commit → reject old append
A7 parent support invalidates before commit → reject
A8 source replacement after replies → no automatic migration
A9 runtime reload → no historical interactive reply restoration
A10 source-irrelevant ordinary turn → no interaction scan/model/network work
A11 raw HTML-like user text stays plain/escaped
A12 user factual assertion remains attributed social content, not canonical truth
```

## 67. Design acceptance rule

IM-3 is design-complete when all of the following remain true:

```text
first operation is exactly BOARD_APPEND_REPLY
user text is literal and no model call is required
user authorship is source-local self, not canonical account identity
BOARD_REPLY receives exact durable child identity
parent exact identity + expected semantic revision are required
append does not advance parent semantic revision
per-parent append lane gives deterministic order
internal retry cannot duplicate one admitted semantic request
validation occurs before commit
presentation follows committed semantics
parent invalidation fails closed
base 3M-5 Board sidecar remains immutable
no full Board database is introduced
C6/C7/C8 remain closed
production remains unchanged
```

## 68. IM roadmap status

```text
IM-0  Interaction / Materialization Master Design        ✅
IM-1  Source Interaction Intent + Stale Event Safety     ✅
IM-2  BOARD_APPEND_REPLY Minimum Durable Target          ✅
IM-3  Interactive BOARD Mutation Semantics               ✅ THIS DOCUMENT
IM-4  Interactive SOCIAL_FEED Mutation Semantics         NEXT
IM-5  External Media Materialization / Operation Ownership
IM-6  Integration / Failure Isolation / Performance / Real Validation
```

## 69. Final decision

Freeze:

```text
BOARD_APPEND_REPLY
=
USER_DIRECT_LITERAL
+ USER_DIRECT_SOURCE_SELF
+ ATTRIBUTED_SOCIAL
+ DIRECT_USER_SOURCE_PUBLICATION
+ exact BOARD_POST parent
+ expected parent semantic revision
+ new BOARD_REPLY durable identity
+ per-parent serial append lane
+ deterministic appendSequence
+ idempotent BoardAppendCommitRef
+ validate-before-commit
+ immutable base + interactive overlay
+ commit-then-present
```

Do not freeze or authorize runtime mutation machinery yet.

Production `release-simcore` remains independently authoritative and unchanged by this design transaction.
