# SimCore Post-3.0M IM-2 BOARD_APPEND_REPLY Minimum Durable Target Design — 2026-09-03

Date: 2026-09-03 KST

Status: **IM-2 DESIGN FROZEN · FIRST CONCRETE DURABLE TARGET = BOARD_POST · CURRENT-RUNTIME MEMORY-ONLY LIFETIME PROFILE · EXACT LOCATOR + SEMANTIC REVISION + SUPPORT-AT-USE · NO BOARD DATABASE · NO APPEND ENGINE · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · INTERACTION / MATERIALIZATION · IM-2 · BOARD_APPEND_REPLY · CANDIDATE C · MINIMUM DURABLE TARGET · DESIGN-ONLY**

## 0. Purpose

IM-2 freezes the minimum durable semantic-target contract required by the first interactive Source Intelligence mutation candidate:

```text
BOARD_APPEND_REPLY
```

The question is intentionally narrow:

```text
A user saw one accepted BOARD POST.
Later, while the interactive Board surface is still legitimately alive,
the user asks to append a reply to that exact post.

What is the minimum semantic identity/currentness/support state
that must survive so the action targets the same post safely?
```

IM-2 does not implement a Board database, reply append reducer, event listener, storage backend, DOM control, model call, source-history UI, context re-entry, release change, or `release-simcore` mutation.

## 1. Authority chain

IM-2 consumes:

```text
docs/SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_INTERACTION_IM1_SOURCE_INTERACTION_INTENT_STALE_EVENT_SAFETY_DESIGN_2026-09-03.md
docs/SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC5_ITEM_MUTATION_APPEND_RECONCILIATION_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/REPOSITORY_COMMON_RULES.md
```

Production runtime authority remains `release-simcore`.

Inherited firewalls remain authoritative:

```text
PRESENTATION CONTROL BINDING != DURABLE SEMANTIC OBJECT LOCATOR
DURABLE OBJECT ID != SEMANTIC REVISION
SEMANTIC REVISION != OPERATION AUTHORITY
FOUND BY ID != SUPPORTED FOR USE
PERSISTED != CANONICAL FACT
C1 SURVIVAL != C6 MODEL-CONTEXT REENTRY
APPEND_CHILD != GENERIC MERGE
```

## 2. Capability profile

The first concrete consumer activates only the Candidate C capabilities it actually needs.

```text
C1 survival         = YES, bounded current-runtime interaction lifetime
C2 stable identity  = YES, exact BOARD_POST target
C3 item mutation    = NO in IM-2; later edit/reroll/delete work
C4 append/merge     = YES as downstream consumer pressure, append semantics deferred to IM-3
C5 derived lineage  = NO
C6 context reentry  = NO
C7 partial survival = NO
C8 delayed effect   = NO
```

Canonical rule:

```text
IM-2 OPENS THE TARGET CONTRACT
!=
IM-2 AUTHORIZES THE MUTATION ENGINE
```

## 3. Primary decision

Selected target architecture:

```text
CURRENT_RUNTIME_EXACT_BOARD_POST_TARGET_V1
```

Conceptually:

```text
accepted BOARD POST
        ↓
interaction qualification
        ↓
owner-scoped opaque BOARD_POST identity
        ↓
current semantic revision
        ↓
minimum supporting-authority reference
        ↓
bounded current-runtime lifetime
        ↓
exact lookup + support-at-use
        ↓
trusted BOARD_APPEND_REPLY target handoff
```

No full Board snapshot persistence is required by IM-2.

## 4. First admitted durable namespace

IM-2 admits exactly one concrete Candidate C namespace:

```text
BOARD_POST
```

Purpose:

```text
name one accepted top-level Board POST
that a later interactive operation must address exactly
```

Not admitted by IM-2:

```text
BOARD_REPLY
BOARD_THREAD
BOARD_PARTICIPANT
SOCIAL_ACTOR
SOCIAL_POST
NEWS_STORY
MEDIA_ATTACHMENT
```

A future consumer may admit those only through its own qualification proof.

## 5. Owner scope

The first conceptual semantic owner scope is:

```text
INTERACTIVE_BOARD
```

This is owner vocabulary, not a runtime string or serialized schema.

The owner is responsible for the bounded lifecycle of interactive Board durable targets.

It does not own:

```text
canonical B source truth
host transcript identity
presentation DOM
Lineage / Handoff / Evidence
model context memory
other source-family objects
```

## 6. Exact durable locator

IM-2 adopts the CC-1 identity contract:

```text
BoardPostDurableLocator
=
ownerScope = INTERACTIVE_BOARD
+ namespace = BOARD_POST
+ opaqueObjectId
```

The exact physical field names and ID algorithm remain implementation-owned and are not authorized here.

The locator answers only:

```text
which logical interactive Board POST?
```

It does not answer:

```text
is the post still supported?
is the displayed revision still current?
may this reply be appended?
is the post content canonically true?
```

## 7. Forbidden identity substitutes

None of the following may become durable target identity:

```text
entryOrdinal
projectionOrdinal
participantOrdinal
DOM index
host message index by itself
content hash
source fingerprint
post title
post body text
displayName
semantic similarity
InteractionControlBindingRef
InteractionAttemptRef
```

These remain valid only in their existing bounded roles.

Canonical rule:

```text
POST LOOKS THE SAME
!=
SAME DURABLE BOARD_POST
```

## 8. Identity allocation qualification

A BOARD POST receives durable identity only when all of the following are true conceptually:

```text
Q1 POST survived normal BOARD validation
Q2 POST is present in ordinary validated Board semantics
Q3 interactive BOARD_APPEND_REPLY is admitted for that surface
Q4 a future action may need to address this same POST after the original projection step
Q5 the interactive owner can bind a bounded lifetime
Q6 the post has current supporting authority
```

Rejected, DENY, HOLD, or parent-quarantined content never receives a durable interaction target merely because it existed in a draft.

## 9. Allocation occurs after validation

Required conceptual ordering:

```text
untrusted Board draft
→ Board validation
→ accepted POST
→ interaction admission
→ durable identity qualification
→ allocate/associate BOARD_POST identity
```

Forbidden:

```text
raw model POST candidate
→ allocate durable ID
→ maybe validate later
```

This keeps durable identity from becoming a side channel for quarantined content.

## 10. No retroactive identity for all Board entries

IM-2 does not retrofit durable IDs onto every historical/current Board object.

Only Board POSTs that participate in the interactive consumer are eligible.

```text
READ-ONLY BOARD
→ may remain snapshot-only

INTERACTIVE BOARD POST TARGET
→ BOARD_POST durable identity required
```

## 11. BOARD_REPLY remains projection-local for IM-2

The first action targets a POST and creates a future reply candidate.

IM-2 does not yet require an existing BOARD REPLY to be targeted later.

Therefore:

```text
RUNTIME/CONCEPTUAL DURABLE NAMESPACE ADMISSION
BOARD_REPLY = NO in IM-2
```

Whether a newly appended reply receives its own durable identity belongs to IM-3 based on the exact later interaction semantics.

## 12. Semantic revision is required for the target POST

IM-2 requires a semantic revision/current-state marker for each durable BOARD_POST target.

Reason:

A user may click Reply on a POST they saw as semantic state R1, while the same logical POST could later be edited/rerolled under future interaction work.

Canonical target pair:

```text
exact BOARD_POST locator L
+ expected POST semantic revision R
```

Before mutation handoff:

```text
current locator == L
AND current post semantic revision == R
```

must hold unless IM-3 explicitly proves a narrower append-safe compatibility rule.

## 13. Append does not automatically define parent revision semantics

IM-2 does **not** decide whether successfully appending one child reply advances the parent POST's semantic revision.

Possible future IM-3 choices include:

```text
A. parent revision tracks only parent semantic fields
   → child append may use a separate append/child-collection lane

B. parent revision includes child relationship state
   → append advances parent revision
```

IM-2 freezes neither choice.

It only requires that the user not accidentally reply to a materially different parent POST than the one the interaction contract considers current.

## 14. Operation authority remains downstream

The IM-2 durable locator and expected revision are not an operation token.

```text
BOARD_POST locator
!=
BOARD_APPEND_REPLY operation attempt authority
```

If IM-3 permits overlapping/retryable append attempts, it must use the CC-2 current-operation rules appropriate to that append lane.

IM-2 creates no idempotency key and no durable write token.

## 15. Minimum durable target semantic slice

IM-2 selects a bounded retained semantic target view sufficient to identify and re-check the POST without turning the whole Board into a database.

Conceptually it may contain the minimum equivalent of:

```text
representationVersion
BoardPostDurableLocator
currentSemanticRevision
kind = POST
mode
title
content
minimum sourceAuthorityRef
lifetimeState / owner lifetime metadata
```

The exact serialized record shape is not frozen.

## 16. Why `title` and `content` remain in the target semantic slice

A durable target cannot be only an opaque ID plus no semantic state if downstream family validation must reason about the exact parent the user is addressing.

The parent POST semantic material may be needed for:

```text
showing/confirming the exact target in an authorized current interaction surface
family structural validation
future parent-dependent reply validation
revision comparison/reconciliation
```

Retaining accepted validated semantic text does not make it canonical world truth.

## 17. What the target record does not retain by default

IM-2 does not require durable retention of:

```text
raw Board draft
quarantined POST/REPLY content
validation receipt text
all participants
all sibling POSTs
all existing replies
DOM/CSS state
popover/scroll state
host transcript clone
model prompt copy
operation tokens
network/media state
```

No hidden Board archive is created merely to support one exact target.

## 18. Participant identity is not promoted

The original Board design uses `participantOrdinal` only inside one projection.

IM-2 does not promote it to durable identity.

Therefore the target semantic slice must not imply:

```text
participantOrdinal 3
→ durable author account 3
```

If later interaction requires a persistent Board/Social actor identity, that is a separate Candidate C consumer.

## 19. Original ordinal is diagnostic only if retained

A future implementation may retain original `entryOrdinal` as bounded diagnostics/origin metadata.

It must never be used as the durable lookup key.

```text
original entryOrdinal
= origin/debug aid at most
!= identity
```

## 20. Supporting authority reference

Each durable target retains only the minimum exact reference needed to re-prove source support later through existing owners.

For the currently frozen first BOARD source slice this traces back to the direct B-root `HANDOFF_EVIDENCE` authority relationship.

Canonical rule:

```text
DURABLE POST RECORD
DOES NOT BECOME SELF-SUPPORTING
```

## 21. Support-at-use

Before the target can be handed to IM-3, support must be re-proven for the exact retained authority reference.

Conceptual flow:

```text
resolve exact BOARD_POST durable target
        ↓
check target lifetime
        ↓
check representation/version
        ↓
check expected post revision
        ↓
re-resolve/re-prove required source authority
        ↓
SUPPORTED_FOR_APPEND_TARGET
or fail closed
```

No fuzzy history search is allowed.

## 22. Exact old-source resolution is allowed; broad history scanning is not

A durable target may refer back to the exact source evidence that originally supported it.

That does not authorize:

```text
scan arbitrary transcript
search for similar B output
find any matching phrase
pick nearest historical source
```

The permitted direction is exact-locator/exact-authority resolution only.

## 23. Source reroll/edit invalidation

If the supporting B source has been rerolled/replaced/edited such that the retained exact authority reference no longer matches:

```text
SUPPORT_MISMATCH / SUPPORT_UNAVAILABLE
→ target is not eligible for current semantic append use
```

The old BOARD_POST locator must not be copied onto a newly regenerated similar post.

## 24. No identity migration by text similarity

Forbidden recovery:

```text
old source invalidated
new Board projection contains same title/body
→ preserve old BOARD_POST ID
```

A new projection may create a new logical durable target under a later explicit interaction admission.

Any identity migration/reconciliation requires separate proof.

## 25. First logical lifetime profile

The selected first lifetime is:

```text
CURRENT_RUNTIME_INTERACTIVE_BOARD_LIFETIME
```

Meaning:

The target may survive ordinary chat/source turns inside the current active SimCore runtime while the owning interactive Board surface remains an admitted product object.

It must not outlive the first applicable retirement boundary.

## 26. Lifetime retirement boundaries

The target becomes unavailable for ordinary interaction when any owner-defined boundary occurs, including conceptually:

```text
SimCore runtime replacement / disposal
conversation/chat identity change
interactive Board surface retirement/clear
explicit semantic target retirement/deletion
source support invalidation that the owner treats as terminal for current interaction
object replacement under future mutation semantics
owner-defined bounded capacity/lifetime eviction
```

The exact capacity constants remain future runtime-hard-cap work.

## 27. Conversation end is a hard upper bound

The first target lifetime may never silently extend beyond the conversation that owns it.

```text
CURRENT_RUNTIME_INTERACTIVE_BOARD_LIFETIME
<= conversation lifetime
```

No global cross-conversation identity is authorized.

## 28. No reload restoration

The first profile is intentionally memory-only in lifecycle semantics.

```text
runtime/plugin reload
→ in-memory durable target owner is gone
→ BOARD_POST target cannot be reconstructed automatically
```

Stored assistant prose is not scanned to recreate the target.

A product requirement for reload-restored interactive Board state would require a new persistence/migration checkpoint.

## 29. Memory-only is sufficient for the first consumer

Candidate C durability means the object outlives the projection step that created it; it does not automatically mean disk persistence.

The narrowest first profile is therefore conceptually compatible with:

```text
owner-scoped runtime memory
+ cross-turn survival inside that runtime
+ exact lookup on user interaction
+ no background scan
```

IM-2 does not select a physical data structure or implement it.

## 30. No host transcript marker

The durable target must not be made recoverable by writing hidden markers into assistant transcript.

Forbidden:

```text
<hidden board-post-id=...>
```

or invisible JSON embedded into stored output merely to survive turns.

This preserves LRE-1 transcript/presentation separation and 3M-7 zero additional structured re-entry.

## 31. No localStorage / remote store requirement

IM-2 does not require:

```text
localStorage
IndexedDB
remote DB
host metadata persistence
file storage
```

Those broader surfaces are not justified by the first current-runtime consumer.

## 32. Exact retrieval only

The first retrieval form is:

```text
EXACT BOARD_POST durable locator
```

If lookup fails:

```text
TARGET_NOT_FOUND / TARGET_EXPIRED
→ reject
```

Forbidden fallback:

```text
same title
same body
same ordinal
nearest POST
latest Board POST
same author label
```

## 33. IM-1 control binding to IM-2 durable locator

The presentation control does not expose the durable locator as user-owned authority.

Required conceptual route:

```text
current InteractionControlBindingRef
        ↓
plugin-owned current route metadata
        ↓
trusted BOARD_POST durable locator
+ expected semantic revision
        ↓
IM-2 exact target resolution
```

The DOM/user event is not allowed to replace the locator or revision.

## 34. `BoardAppendReplyTargetHandoff`

IM-2 freezes a conceptual successful handoff to IM-3.

It contains the semantic equivalent of:

```text
family = BOARD
action = BOARD_APPEND_REPLY
trusted BOARD_POST durable locator
expected/current post semantic revision
validated current target semantic view
current support-at-use result / trusted support context
bounded user reply payload remains separate from target authority
```

No serialized schema is authorized by this document.

## 35. User payload and target authority remain separate

The user reply text originates from the IM-1 intent.

It must not be stored inside or interpreted as part of the target authority record before IM-3 validation.

Canonical separation:

```text
TARGET AUTHORITY
= which current POST may receive an append attempt?

USER PAYLOAD
= what exact text does the user want to publish as the new reply?
```

Neither grants the other truth authority.

## 36. Target resolution outcomes

IM-2 freezes the first conceptual resolution outcomes:

```text
CURRENT_BOARD_POST_TARGET
TARGET_NOT_FOUND
TARGET_EXPIRED
TARGET_RETIRED
TARGET_NAMESPACE_MISMATCH
TARGET_OWNER_MISMATCH
TARGET_SCHEMA_UNSUPPORTED
TARGET_REVISION_MISMATCH
TARGET_SUPPORT_UNAVAILABLE
TARGET_SUPPORT_MISMATCH
TARGET_NOT_POST
TARGET_NOT_INTERACTION_ADMITTED
```

All failures are fail-closed for semantic mutation.

## 37. No silent revision refresh

If the control was bound to POST L @ R3 but current durable POST is L @ R4:

```text
TARGET_REVISION_MISMATCH
```

IM-2 must not silently replace R3 with R4 and continue the old user action.

The UI may later ask the user to retry against current state, but that would create a fresh current interaction attempt.

## 38. Current view and current revision are independent

A presentation instance can still be mounted while its semantic target revision is stale.

Therefore:

```text
CURRENT PRESENTATION CONTROL
!=
CURRENT SEMANTIC POST REVISION
```

IM-1 proves current event/presentation routing.

IM-2 proves current durable semantic target.

Both are required.

## 39. Support and revision are independent

A POST may retain the same semantic revision while its source support becomes invalid because the supporting B source was replaced/edited.

Likewise a POST may advance revision while still tracing to valid source authority.

Therefore:

```text
REVISION MATCH
!=
SUPPORT MATCH
```

IM-2 checks both predicates.

## 40. Ordinary-turn dormancy

A retained interactive BOARD_POST target does not create background work.

When no source-interaction event addresses the owner:

```text
no history scan
no support scan
no model call
no mutation
no polling
no presentation rebuild
```

The durable target is passive state only.

This preserves the 3M-9 source-irrelevant baseline.

## 41. User event may wake only bounded exact work

When a valid IM-1 event arrives:

```text
one control binding
→ one exact durable locator
→ one target record
→ bounded support/currentness checks
```

The cost must not depend on total conversation age or total historical Source Intelligence objects.

## 42. Old visible card does not create automatic activity

An old interactive Board card may remain visible in UI within the current runtime.

Visibility alone does not trigger:

```text
support revalidation loop
history hydration
model context insertion
```

Only an explicit current user interaction attempts exact target resolution.

## 43. No C6 context re-entry

IM-2 does not place the durable POST semantic slice into a later model prompt.

Therefore:

```text
C6 = CLOSED FOR IM-2
```

If IM-3 later chooses a model-assisted reply path that must consume old derived Board content, it must explicitly invoke the Candidate C controlled re-entry contract.

User-authored exact reply text does not inherently require that model path.

## 44. No cross-family lineage

The durable BOARD_POST target is not automatically eligible as input to NEWS/SOCIAL_FEED/PUBLIC_KNOWLEDGE.

```text
BOARD_POST durable ID exists
!=
C5 derived-to-derived lineage authorized
```

Cross-family use remains separately governed.

## 45. No canonical truth promotion

Durability changes addressability, not epistemic authority.

```text
BOARD_POST has stable ID
!=
post claim is true

BOARD_POST survived 20 turns
!=
post claim is canon

user replied to the post
!=
post claim becomes public truth
```

Existing Exposure/source policy remains authoritative.

## 46. No participant/account persistence

The first durable target does not create a stable Board account registry.

Display names and projection-local participants remain attributes of the original validated presentation semantics.

If future interaction needs to address the same author/account later, it must qualify a distinct durable identity consumer.

## 47. Presentation reconciliation boundary

A durable target may be used by presentation for exact control reconciliation, but:

```text
presentation mounted
!=
target supported
```

If support/target currentness fails, the interaction control must fail closed or become unavailable according to later presentation design.

Presentation success cannot rescue stale semantic state.

## 48. Reload boundary

After runtime reload the first IM-2 target profile does not restore.

A stale DOM/event from an old runtime already fails IM-1 runtime-generation/current-binding checks.

If historical text re-renders after reload, it does not recreate a BOARD_POST durable locator by content matching.

## 49. Manual edit / source replacement boundary

A manual edit to the supporting assistant/source output may invalidate the support chain.

Default:

```text
support no longer exact
→ TARGET_SUPPORT_MISMATCH / UNAVAILABLE
→ append blocked
```

IM-2 does not attempt semantic repair from edited prose.

## 50. Future parent edit behavior

When a future interactive BOARD edit operation preserves the same logical POST identity:

```text
same BOARD_POST locator
+ semantic revision advances
```

Old controls carrying the prior expected revision fail closed.

This is consistent with CC-2 and does not require a new durable ID.

## 51. Future parent replacement behavior

When a future reroll/replacement operation declares a new logical POST:

```text
old BOARD_POST locator retired
new BOARD_POST locator allocated after validation/admission
```

Old controls/results must not retarget to the replacement.

## 52. Child append identity remains IM-3 territory

`BOARD_APPEND_REPLY` will create a new reply semantic object.

IM-2 intentionally does not decide:

```text
whether new reply receives BOARD_REPLY durable identity
how reply participant/author is represented
how reply ordering is encoded
whether parent revision advances
how concurrent appends serialize
whether retry uses idempotency/operation token
how durable Board view is reconstructed
```

Those are IM-3 mutation semantics.

## 53. No generic durable Board database

The first consumer does not justify:

```text
PersistentBoardDatabase
UniversalBoardThreadStore
GlobalSourceObjectRegistry
append-only event sourcing
full Board revision archive
cross-conversation Board history
```

The minimum target owner exists only to satisfy exact later targeting of admitted POSTs.

## 54. Storage ownership if runtime implementation is later authorized

Any future physical owner must preserve CC-3 principles:

```text
owner-scoped writes
bounded records
exact locator lookup
representation version checks
unowned metadata preservation
support-at-use
no cache-as-truth
no blind overwrite of newer revision
```

IM-2 does not choose the physical backend.

## 55. Tombstone decision

IM-2 does not require a persistent tombstone store.

For the first current-runtime memory-only profile, stale-ID safety may be achieved conceptually by:

```text
never reuse retired opaque IDs inside the runtime stale-reference horizon
+ retire/remove exact target mapping
+ IM-1 current control-binding revocation
```

If future delayed effects or reload-restored references require retired identity memory, tombstone requirements must be revisited.

## 56. ID reuse prohibition

Within the active runtime/owner stale-reference horizon:

```text
retired BOARD_POST opaqueObjectId
MUST NOT
name an unrelated new POST
```

This prevents old control/handoff references from aliasing to new content.

## 57. Failure isolation

An IM-2 target failure affects the requested source interaction only.

It must not:

```text
fail the canonical chat turn
rewrite the B source
change runtime mode
mutate other Board posts
invalidate unrelated source families
trigger automatic model retry
```

## 58. Diagnostics boundary

Bounded diagnostics may expose metadata such as:

```text
family
action
owner scope
namespace
opaque target ID or bounded redacted form
expected/current revision comparison result
lifetime state
support status
failure reason code
```

Diagnostics must not duplicate hidden/quarantined semantic content or become a second durable archive.

## 59. Security / trust boundary

The target locator/revision/support fields are trusted owner outputs, not user-controlled payload.

The user may control only the bounded semantic input explicitly permitted by IM-1/IM-3.

Forbidden trust path:

```text
user/DOM submits objectId + revision + support=true
→ accept as trusted target
```

Required:

```text
opaque current control binding
→ plugin-owned route
→ trusted exact durable target lookup
```

## 60. Interaction-control revocation relationship

When a durable target becomes terminally unavailable for interaction, the presentation/control owner should revoke or disable associated current control bindings through its own lifecycle path.

However:

```text
control binding accidentally remains
```

must still be safe because IM-2 exact target resolution fails closed.

Defense is layered, not dependent on perfect UI cleanup.

## 61. First acceptance matrix

| Case | Expected IM-2 outcome |
| --- | --- |
| accepted current POST, exact locator/revision/support | `CURRENT_BOARD_POST_TARGET` |
| same title/body but different durable ID | target only exact ID; no equivalence |
| old control expects R1, post is now R2 | `TARGET_REVISION_MISMATCH` |
| source B rerolled and support fingerprint changed | `TARGET_SUPPORT_MISMATCH` |
| target expired after runtime replacement | `TARGET_EXPIRED` / upstream stale runtime |
| target removed/retired | `TARGET_RETIRED` or not found |
| locator namespace is BOARD_REPLY | `TARGET_NAMESPACE_MISMATCH` |
| old `entryOrdinal` points to a new POST | no retarget |
| reload causes old transcript to render | no target reconstruction |
| no interaction event occurs | zero retrieval/support work |

## 62. Blockers for runtime implementation

IM-2 design completion does not remove broader runtime blockers.

At minimum, actual interactive runtime still requires proof/authorization for:

```text
exact host presentation binding / interaction mount
physical SourceInteractionIntent transport inside plugin runtime
owner-scoped durable target retention mechanism
bounded ID allocation and non-reuse horizon
family hard caps
IM-3 append mutation semantics
current support-at-use resolver in then-current production
release preflight against then-current release-simcore / host
```

## 63. Explicit non-goals

```text
NO runtime ID allocator
NO persistent Board database
NO cross-conversation identity
NO reload restoration
NO hidden transcript marker
NO BOARD_REPLY durable namespace
NO participant/account persistence
NO append engine
NO edit/reroll/delete semantics
NO model-assisted reply generation
NO context re-entry
NO cross-family lineage
NO media attachment
NO network call
NO DOM/CSS implementation
NO release transaction
```

## 64. Frozen invariants

```text
I1  BOARD_APPEND_REPLY first durable semantic target is one accepted BOARD POST
I2  first admitted namespace is BOARD_POST only
I3  durable locator = owner scope + namespace + opaque object ID
I4  entryOrdinal/content hash/display text never become durable identity
I5  identity allocation happens only after validation + interaction admission
I6  target identity does not establish support or truth
I7  current semantic revision is a separate required predicate
I8  operation authority remains downstream from IM-2
I9  exact support must be re-proven at use
I10 source support mismatch blocks append-target use
I11 no fuzzy/history-similarity retargeting is allowed
I12 first logical lifetime is current-runtime interactive Board lifetime, capped by conversation
I13 reload restoration is off
I14 no hidden transcript persistence is allowed
I15 retained target state is bounded to the minimum accepted POST semantic slice + currentness/support metadata
I16 participantOrdinal is not promoted to durable actor identity
I17 BOARD_REPLY durable identity remains deferred to IM-3
I18 C6 context re-entry remains closed
I19 no background history/support scanning occurs while idle
I20 target failure is interaction-local and fail-closed
I21 retired IDs are not reused inside the stale-reference horizon
I22 presentation currentness and semantic target currentness remain separate proofs
I23 semantic revision and source support remain separate proofs
I24 durability never promotes derived content to canon
I25 runtime implementation remains unauthorized
```

## 65. Exit criteria

IM-2 design is complete when repository evidence shows:

```text
BOARD_POST is the first concrete durable namespace
exact owner-scoped locator semantics are frozen
minimum retained POST semantic/support slice is frozen
semantic revision is separated from identity and operation authority
current-runtime bounded lifetime is frozen
reload/no-history-reconstruction behavior is frozen
support-at-use and invalidation behavior are frozen
IM-1 → IM-2 → IM-3 handoff boundary is explicit
no Board DB / reply mutation implementation is introduced
production release remains unchanged
```

## 66. Next checkpoint

```text
IM-3 · INTERACTIVE BOARD MUTATION SEMANTICS
```

First concrete mutation:

```text
BOARD_APPEND_REPLY
```

IM-3 must decide at minimum:

```text
user-authored reply semantic schema
new child identity requirement
parent/child relationship commit semantics
append ordering and duplicate behavior
parent revision versus child-collection revision semantics
Exposure/publication treatment of user-authored reply text
validation-before-commit path
append currentness / operation-authority policy
presentation reconciliation after commit
```

## 67. Final status

```text
IM-2 DESIGN
= FROZEN

FIRST DURABLE TARGET
= BOARD_POST

OWNER SCOPE
= INTERACTIVE_BOARD (conceptual)

TARGET IDENTITY
= owner scope + BOARD_POST namespace + opaque ID

SEMANTIC REVISION
= REQUIRED FOR TARGET CURRENTNESS

SUPPORT-AT-USE
= REQUIRED

LIFETIME
= CURRENT_RUNTIME_INTERACTIVE_BOARD_LIFETIME
<= conversation lifetime

PHYSICAL BACKEND
= NOT SELECTED / NOT IMPLEMENTED

RELOAD RESTORATION
= NONE

BOARD_REPLY DURABLE ID
= DEFER TO IM-3

C6 CONTEXT REENTRY
= CLOSED

RUNTIME IMPLEMENTATION
= NOT AUTHORIZED

PRODUCTION
= UNCHANGED
```
