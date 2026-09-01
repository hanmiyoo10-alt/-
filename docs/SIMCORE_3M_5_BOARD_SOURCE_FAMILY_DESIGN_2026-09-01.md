# SimCore 3M-5 BOARD Source Family Design — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-5 DESIGN FROZEN · FIRST NEW SOURCE FAMILY = BOARD · DIRECT-B-ROOT SNAPSHOT ONLY · READ-ONLY / NON-PERSISTENT · RUNTIME PRODUCER / TRANSPORT / MOUNT NOT AUTHORIZED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-5 · BOARD · THREAD SNAPSHOT · FAMILY-SPECIFIC SEMANTIC SCHEMA + VALIDATION + PRESENTATION**

## 0. Purpose

3M-5 freezes the first genuinely new Source Intelligence family after `LIVE_REACTION` compatibility.

The selected family is:

```text
BOARD
```

The first design seam is:

```text
DIRECT_B_ROOT_BOARD_THREAD_SNAPSHOT
```

This document answers:

```text
What exact semantic object represents one bounded Board snapshot?
How are projection-local participants represented?
How are POST and REPLY units validated against source/exposure authority?
How does hierarchical eligibility work?
What may reach BOARD_THREAD_V1 presentation?
```

This checkpoint is design-only.

It does not implement model output transport, a Board generator, validator code, DOM/CSS, persistent board state, source identity storage, user interaction, S7/v0.70.3 changes, release publication, or `release-simcore` mutation.

## 1. Authority chain

This design consumes:

```text
docs/SIMCORE_GUIDELINES.md
docs/SIMCORE_CONTRACTS_V2.md
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01.md
docs/SIMCORE_3M_5_FIRST_NEW_SOURCE_FAMILY_BOARD_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_MINIBOARD_4_1_1_2026-08-30.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_SNS_FORME_0_3_1_2026-09-01.md
docs/SIMCORE_3M_DESIGN_ONLY_LANGUAGE_CLARIFICATION_2026-09-01.md
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Family selection freeze

The first genuinely new family is permanently selected for this checkpoint as:

```text
BOARD
```

Why BOARD first:

```text
new semantic hierarchy       = yes
new family-specific renderer = yes
persistent profile identity  = not required
repost/share graph           = not required
media materialization        = not required
multi-platform policy        = not required
```

`SOCIAL_FEED` remains deferred, not rejected.

```text
SOCIAL_FEED = LATER FAMILY
```

## 3. Runtime-mode relationship

BOARD is not a core mode.

First scope:

```text
mode = C
family = BOARD
```

Forbidden model:

```text
BOARD_MODE
```

Canonical rule:

```text
RUNTIME MODE
!=
SOURCE FAMILY
```

## 4. First source-authority scope

Only this source relationship is designed:

```text
mode = C
family = BOARD
source = direct B root
sourceAuthorityRef.kind = HANDOFF_EVIDENCE
rootMode = B
parentMode = B
parentIndex = rootIndex
depth = 1
projectionOrdinal = 0
```

All other origins remain unsupported by this first Board contract.

Examples not yet supported:

```text
multi-B source window
A-origin public disclosure without direct-B proof
Board-to-Board propagation
Social-feed-to-Board propagation
News-to-Board propagation
remote delayed discovery
private membership reachability
```

## 5. BOARD is a snapshot, not a database

The first semantic object is one bounded current source projection.

```text
BoardThreadSnapshotV1
```

It is not:

```text
persistent forum database
cross-turn append log
mutable social graph
world-state store
canonical character registry
```

Canonical rule:

```text
BOARD SNAPSHOT
!=
BOARD STATE DATABASE
```

## 6. Three-input validation model remains

3M-5 preserves the 3M-3 authority split.

### Input A · untrusted Board semantic draft

```text
BoardSemanticSidecarDraftV1
```

Potential future producer:

```text
Semantic Renderer / explicitly authorized source producer
```

Structured format alone gives it no authority.

### Input B · trusted source-authority context

```text
SourceAuthorityContextV1
```

Composed from existing Handoff / Evidence / Lineage owners for the first direct-B-root slice.

### Input C · trusted per-entry assertion-policy contexts

```text
SourceAssertionPolicyContextV1[]
```

One context per Board POST/REPLY entry ordinal.

The model/producer does not own these contexts in the first design.

## 7. Draft root schema

Frozen conceptual schema:

```text
BoardSemanticSidecarDraftV1
  schemaVersion = 1
  family = BOARD
  projectionOrdinal = 0
  sourceAuthorityRef
  participants[]
  entries[]
```

Strict rule:

```text
unknown fields = invalid draft
```

No model-generated metadata silently acquires authority.

## 8. Source authority reference

BOARD reuses the same first-slice source reference shape already designed under 3M-3:

```text
HandoffEvidenceAuthorityRefV1
  kind = HANDOFF_EVIDENCE
  rootMode = B
  parentMode = B
  rootIndex
  parentIndex
  depth = 1
  rootFingerprint
  sourceAssistantIndex
  sourceAssistantFingerprint
  currentUserIndex
  currentUserFingerprint
```

The validator compares every field against trusted current owner results.

Mismatch:

```text
INVALID_AUTHORITY_JOIN
```

The validator does not repair spoofed refs.

## 9. Projection-local participant schema

A Board needs repeated authors inside one snapshot without creating a cross-turn identity registry.

Frozen conceptual type:

```text
BoardParticipantDraftV1
  participantOrdinal
  displayName
```

### `participantOrdinal`

- bounded integer-like ordinal;
- unique inside this Board snapshot;
- local identity key only;
- not a persistent source identity;
- not a character/world identity;
- not a reroll lineage identity.

### `displayName`

- non-empty bounded plain text;
- source-semantic display label;
- may be pseudonymous/anonymous/community-styled;
- not trusted HTML;
- not proof that a canonical world character owns the account.

Canonical rule:

```text
participantOrdinal
= PROJECTION_LOCAL_IDENTITY
```

and:

```text
BoardParticipantDraftV1
!=
CANONICAL CHARACTER
!=
PERSISTENT PROFILE
```

## 10. Participant-name uniqueness

`displayName` does not need to be globally or even projection-locally unique.

Reason:

Anonymous/public boards may legitimately display repeated labels such as equivalent anonymous names.

Identity inside the snapshot is carried by `participantOrdinal`, not string equality.

Therefore:

```text
same displayName
!=
same participantOrdinal
```

The Presentation Renderer may display identical names for distinct projection-local participants.

## 11. Entry schema

Frozen conceptual type:

```text
BoardEntryDraftV1
  entryOrdinal
  kind = POST | REPLY
  authorParticipantOrdinal
  parentEntryOrdinal
  mode
  title
  content
```

No additional entry kinds are authorized.

## 12. `entryOrdinal`

- bounded local ordinal;
- unique inside the current Board snapshot;
- not a cross-turn ID;
- not an editable database primary key;
- not provenance authority.

The first design should require a deterministic bounded ordering.

Exact implementation constants are deferred, but entries must remain finite and validation-cost bounded.

## 13. `kind`

Exactly:

```text
POST
REPLY
```

Semantics:

```text
POST  = top-level discussion unit
REPLY = direct response to one top-level POST
```

No nested reply-to-reply graph exists in V1.

## 14. Parent rules

For `POST`:

```text
parentEntryOrdinal = null
```

For `REPLY`:

```text
parentEntryOrdinal = entryOrdinal of an existing POST
```

Forbidden:

```text
REPLY → REPLY
self-parent
future/nonexistent parent
cross-snapshot parent
```

The validator rejects invalid parent structure.

It does not reparent entries.

## 15. `authorParticipantOrdinal`

Every entry must reference an existing participant ordinal in the same draft.

Missing author target:

```text
INVALID_PARTICIPANT_REF
```

The validator does not invent a fallback anonymous participant.

## 16. Epistemic `mode`

Every POST/REPLY is one source assertion unit and uses exactly one existing 3M mode:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

BOARD introduces no fourth truth class.

Canonical separation:

```text
BOARD STRUCTURE
!=
ASSERTION AUTHORITY CLASS
```

## 17. `title`

For `POST`:

```text
title = required non-empty bounded plain text
```

For `REPLY`:

```text
title = null
```

The title and body belong to the same entry-level epistemic unit.

The Presentation Renderer must not invent a title from body text.

The validator cannot prove from syntax alone that every title/body clause has the same semantic status.

That remains model semantic-compliance evidence.

## 18. `content`

- required non-empty bounded plain semantic text;
- untrusted plain text;
- no raw HTML authority;
- no arbitrary nested metadata;
- no source body embedding merely to bypass context boundaries.

Presentation escaping belongs to 3M-4 family materialization.

## 19. Mixed-claim limitation

Natural forum prose can contain multiple claims with different epistemic status.

V1 intentionally does not create a full proposition AST.

Therefore one entry has one **primary epistemic mode**.

Canonical limitation:

```text
ENTRY MODE
= policy class for the entry as generated

ENTRY MODE
!=
mechanical proof that every linguistic clause has identical truth status
```

A future claim-level substructure may be introduced only with separate evidence.

## 20. Policy context join

Every entry ordinal requires exactly one matching:

```text
SourceAssertionPolicyContextV1
```

using the frozen 3M-2 signal vocabulary:

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

Missing/duplicate/malformed policy context makes the draft structurally invalid.

No silent false defaults.

## 21. Entry policy function

Each entry runs the exact current 3M-2 policy by its `mode`.

### `CONFIRMED_FACT`

```text
broadcastExposed OR currentUserExplicitPublicDisclosure
→ ALLOW / ALLOW_KNOWN_PUBLIC_FACT

else currentUserMentionOnly
→ DENY / DENY_MERE_MENTION_PUBLICATION

else outsideRootHistoryOnly
→ DENY / DENY_EVENT_SCOPE_EXPOSURE_PROMOTION

else sourceCommunityContext
→ DENY / DENY_DERIVED_SOCIAL_PROMOTION

else sourceKnowledgeContext OR referenceContext
→ DENY / DENY_UNEXPOSED_PRIVATE_CONFIRMATION

else
→ DENY / DENY_UNKNOWN_PUBLIC_FACT
```

### `ATTRIBUTED_SOCIAL`

```text
sourceCommunityContext
→ ALLOW / ALLOW_ATTRIBUTED_SOCIAL_CONTEXT

otherwise
→ HOLD / HOLD_UNPROVEN_POLICY_COMBINATION
```

### `INFERENCE_OPINION`

```text
visibleCueExposed
→ ALLOW / ALLOW_VISIBLE_CUE_INFERENCE

otherwise
→ HOLD / HOLD_UNPROVEN_POLICY_COMBINATION
```

BOARD form grants no extra epistemic privilege.

## 22. Board-specific hierarchical eligibility

This is the first family-specific dependency rule beyond flat assertion validation.

A REPLY cannot survive ordinary presentation if its parent POST does not survive.

Canonical rule:

```text
REPLY own policy = ALLOW
AND
parent POST = ALLOW
→ REPLY may be ELIGIBLE
```

Otherwise:

```text
parent POST = DENY or HOLD
→ REPLY = QUARANTINED_PARENT_NOT_ELIGIBLE
```

Reason:

An orphan reply can reveal or strongly imply hidden parent content even if the reply itself is superficially safe.

Therefore:

```text
CHILD ELIGIBILITY
DEPENDS ON
VISIBLE PARENT ELIGIBILITY
```

The validator does not promote the parent merely to preserve reply structure.

## 23. Hierarchical evaluation order

Required conceptual order:

```text
1. validate schema
2. validate source authority join
3. validate participant refs
4. validate POST/REPLY graph
5. run entry-level 3M-2 policy
6. apply parent-visibility dependency
7. construct validated Board sidecar
8. derive bounded receipt
```

Parent dependency is applied after entry policy so diagnostics can distinguish:

```text
entry policy rejected
vs
entry policy allowed but parent unavailable
```

## 24. Validated participant projection

The validated Board sidecar must not expose participants that appear only in quarantined entries.

Therefore validated participants are derived as:

```text
participants referenced by at least one accepted POST/REPLY
```

This is safe projection, not semantic repair.

Canonical rule:

```text
QUARANTINED-ONLY PARTICIPANT
→ not copied to ordinary validated Board presentation data
```

This prevents identity-count leakage from hidden entries.

## 25. Validated Board sidecar

Frozen conceptual output:

```text
ValidatedBoardSemanticSidecarV1
  schemaVersion = 1
  family = BOARD
  projectionOrdinal = 0
  sourceAuthorityRef = validator-confirmed trusted ref
  participants[] = visible projection-local participants only
  entries[] = accepted entries only
```

Each accepted entry view contains only:

```text
entryOrdinal
kind
authorParticipantOrdinal
parentEntryOrdinal
mode
title
content
reasonCode
```

`reasonCode` is validator-derived.

No DENY/HOLD/orphan-quarantined entry content is copied.

## 26. Validation receipt

Separate diagnostic concept:

```text
BoardSemanticSidecarValidationReceiptV1
  validationState
  participantCount
  entryCount
  allowedEntryCount
  deniedEntryCount
  heldEntryCount
  parentQuarantinedCount
  perEntry[]
```

Each bounded `perEntry` record may contain:

```text
entryOrdinal
kind
mode
eligibilityState
reasonCode
consumerDisposition
contentLength
```

The receipt must not duplicate:

```text
entry title
entry content
participant displayName
raw source bodies
```

Ordinary Board presentation does not receive the receipt.

## 27. Consumer dispositions

Entry-level mechanically derived dispositions:

```text
ALLOW + visible parent conditions
→ ELIGIBLE

DENY
→ QUARANTINED_DENY

HOLD
→ QUARANTINED_HOLD

ALLOW REPLY + parent not eligible
→ QUARANTINED_PARENT_NOT_ELIGIBLE
```

The model/producer cannot set these fields.

## 28. Overall Board validation state

Frozen states:

```text
VALID_EMPTY
VALID
VALID_WITH_QUARANTINE
QUARANTINED
UNSUPPORTED_SCOPE
INVALID
```

Rules parallel 3M-3 with hierarchy included:

```text
schema / authority / graph / policy-context structural failure
→ INVALID

unsupported source/family scope
→ UNSUPPORTED_SCOPE

zero entries, otherwise valid
→ VALID_EMPTY

all entries accepted
→ VALID

at least one accepted + at least one quarantined
→ VALID_WITH_QUARANTINE

zero accepted + at least one drafted entry
→ QUARANTINED
```

Participant records alone do not make a Board non-empty.

## 29. Empty participant rule

If:

```text
entries = []
```

then:

```text
participants must also be []
```

A participant-only Board is invalid rather than a meaningful source snapshot.

This prevents unused generated identities from becoming hidden state.

## 30. No semantic repair

The first Board validator is judge/projector only.

It does not:

```text
rewrite title/content
change POST to REPLY
reparent replies
invent participants
change participant refs
change epistemic mode
downgrade facts to opinions
fill missing policy context
promote hidden parents
synthesize replacement posts
```

Invalid structure remains invalid.

Denied/held content remains quarantined.

## 31. Source-local identity authority

`participantOrdinal` exists only within one validated snapshot.

No registry such as:

```text
GlobalBoardUserRegistry
PersistentCommunityIdentityStore
```

is authorized.

If a later design requires the same author to recur across turns, Candidate C/provenance and persistent identity ownership must be reopened explicitly.

## 32. Candidate C activation decision

For this first snapshot-only Board:

```text
CANDIDATE_C_DEDICATED_LINEAGE_EXPANSION = NOT REQUIRED
```

Existing Handoff/Evidence authority is sufficient because the whole Board dies with the current projection.

Reassess Candidate C if any of these become real requirements:

```text
cross-turn Board persistence
stable participant identity
item-level reroll
thread append/merge
user mutation
source replacement while descendants survive
bounded Board re-entry into future context
```

## 33. Persistence contract

Frozen:

```text
persistent schema delta = 0
SnapshotStore Board key = NONE
Board database = NONE
Board ledger = NONE
cross-turn append = NONE
```

The Board snapshot is ephemeral derived semantic data.

## 34. Context re-entry

Frozen default:

```text
ordinary future model-context re-entry = NONE
```

Board content may remain a user-visible derived source surface in a future implementation without automatically becoming future world authority.

Any later re-entry requires a dedicated owner-bounded contract.

## 35. Publication maturity boundary

BOARD is semantically a posted discussion surface rather than an immediate live reaction.

Conceptual distinction:

```text
LIVE_REACTION
→ immediate reaction surface

BOARD
→ posted discussion snapshot
```

This difference may guide presentation and future propagation policy.

It does not grant truth authority.

```text
OLDER / MORE FORMAL POST
!=
MORE TRUE
```

## 36. Reachability boundary

The first Board is reachable only through the same direct-B-root proof used by the current first Source Intelligence slice.

No generalized propagation engine is created.

Deferred:

```text
publication delay
channel membership
geographic reach
cross-platform sharing
source-to-source propagation
```

## 37. Presentation adapter selection

3M-5 reserves the first Board adapter:

```text
BOARD_THREAD_V1
```

It is a family-specific Presentation Renderer adapter under the 3M-4 registry model.

It is not an alias for:

```text
LIVE_REACTION_STREAM_V1
```

## 38. Board presentation policy

Conceptual policy:

```text
SourcePresentationPolicyV1
  family = BOARD
  adapterKey = BOARD_THREAD_V1
  placementIntent = SOURCE_LOCAL_ADJACENT
  themePolicy = HOST_INHERIT
  interactionPolicy = VIEW_LOCAL_ONLY
```

No semantic Board mutation intent is authorized.

## 39. `BoardThreadPresentationModelV1`

Conceptual pure read model:

```text
BoardThreadPresentationModelV1
  kind = BOARD_THREAD
  projectionOrdinal
  threads[]
  empty
```

Each thread is formed from one accepted POST plus its accepted direct REPLY children.

Conceptual shape:

```text
BoardThreadViewV1
  post
  replies[]
```

Post view:

```text
participantOrdinal
authorLabel
title
text
mode
```

Reply view:

```text
participantOrdinal
authorLabel
text
mode
```

The adapter may group accepted entries by already-validated parent relation.

It must not reconstruct hidden parent/reply data from the validation receipt.

## 40. Presentation-only derived counts

The adapter may safely derive counts from visible validated data, for example:

```text
visible reply count
visible thread count
```

These are presentation-local derivations.

It must not display:

```text
original draft entry count
quarantined entry count
hidden participant count
```

in ordinary Board UI.

## 41. Fields intentionally absent from V1

The first Board semantic contract does not contain:

```text
vote counts
view counts
post timestamp
registration date
profile image
badge/rank
moderator status
external URL
media
attachment
thread category
persistent board name
```

The Presentation Renderer must not fabricate them for visual richness.

Each requires a future semantic/presentation authority decision.

## 42. CSS / DOM grammar

Preferred source root:

```text
[data-simcore-source-family="board"]
```

Conceptual scoped classes:

```text
sc-board
sc-board__thread
sc-board__post
sc-board__post-header
sc-board__title
sc-board__body
sc-board__replies
sc-board__reply
sc-board__author
sc-board__empty
```

No global `.post`, `.reply`, `.comment`, `body`, or generic element ownership.

BOARD may use a structurally different DOM grammar from LIVE_REACTION.

## 43. Semantic text materialization

All Board semantic strings remain untrusted plain text.

Required direction:

```text
plugin-owned static DOM structure
+
escaped text insertion / text nodes
```

Forbidden:

```text
raw model HTML
model-provided class names
model-provided style attributes
script/event attributes
```

## 44. Ephemeral Board view state

Permitted presentation-only state:

```text
selected thread
expanded/collapsed replies
local list/detail pane state
scroll position
responsive state
```

All are:

```text
NON-PERSISTENT
NON-CANONICAL
NON-MODEL-CONTEXT
```

## 45. Interaction contract

First Board is read-only.

Not authorized:

```text
ADD_POST
ADD_REPLY
DELETE
EDIT
VOTE
REROLL_POST
REROLL_REPLY
CHANGE_BOARD
```

A future intent-only transaction system must be designed separately if desired.

## 46. Failure quarantine

Semantic and presentation failure remain separate.

Conceptual family outcomes:

```text
BOARD_SEMANTIC_VALID
BOARD_SEMANTIC_QUARANTINED
BOARD_PRESENTATION_READY
BOARD_PRESENTATION_EMPTY
BOARD_ADAPTER_FAILED
BOARD_MOUNT_BLOCKED
BOARD_MOUNT_FAILED
```

Presentation failure must not:

```text
rewrite Board semantics
promote quarantined entries
persist repair state
invoke a repair model call
fall back to raw Board JSON/HTML
```

## 47. Legacy Community coexistence

The Board family does not replace current `<COMMUNITY>` in this design phase.

Future active product policy may choose which source family is requested for a source-aware C turn.

During design:

```text
LIVE_REACTION compatibility = unchanged
BOARD design                = independent new family
```

No double-render or migration behavior is authorized here.

## 48. Source-family selection authority

The main model must not self-select BOARD merely because it wants to write a forum.

Future selection belongs to SimCore Source Intelligence policy.

Canonical rule:

```text
MODEL PRODUCES FAMILY CONTENT
SIMCORE SELECTS FAMILY
```

The exact active selector is a later integration problem.

## 49. Boundedness requirements

Any future executable Board validator must define explicit conservative bounds for:

```text
participants per snapshot
entries per snapshot
replies per post
title chars
content chars
displayName chars
aggregate semantic chars
receipt rows
```

Exact numbers are not product semantics and are not frozen here.

They must be regression-tested implementation constants if/when implementation is separately authorized.

## 50. Runtime blockers carried forward

Design can close while active implementation remains blocked by:

```text
BLOCKER · ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
BLOCKER · ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

BOARD introduces no workaround.

## 51. New active blocker for Board implementation

A future active Board path additionally needs a proven semantic producer/transport contract capable of preserving the family-specific hierarchy without exposing raw structured bytes to ordinary output.

Classification:

```text
BLOCKER · ACTIVE_BOARD_STRUCTURED_PRODUCER_TRANSPORT_UNPROVEN
```

This is an implementation blocker, not a design blocker.

## 52. SOCIAL_FEED deferral boundary

SOCIAL_FEED remains a future family because it should be designed after BOARD proves the family-extension pattern.

Expected additional questions later include:

```text
persistent/profile-local identity
post/repost/reply graph
channel-specific reachability
optional media side effects
platform representation variants
composable adapters
```

Do not import those questions into BOARD V1.

## 53. 3M-5 frozen contract

```text
FIRST_NEW_SOURCE_FAMILY = BOARD
FIRST_BOARD_SEAM = DIRECT_B_ROOT_BOARD_THREAD_SNAPSHOT
MODE = C
SOURCE AUTHORITY = DIRECT B ROOT / HANDOFF_EVIDENCE
SEMANTIC SHAPE = PROJECTION-LOCAL PARTICIPANTS + POST/REPLY
MAX HIERARCHY = POST → REPLY
ASSERTION MODES = EXISTING 3M-2 MODES ONLY
REPLY REQUIRES VISIBLE/ELIGIBLE PARENT = YES
PERSISTENCE = NONE
CROSS-TURN IDENTITY = NONE
CONTEXT RE-ENTRY = NONE
INTERACTION = VIEW_LOCAL_ONLY
PRESENTATION ADAPTER = BOARD_THREAD_V1
CANDIDATE_C EXPANSION = NOT YET REQUIRED
SOCIAL_FEED = DEFERRED
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
```

## 54. Next design checkpoint

After 3M-5, the master sequence originally reserved provenance/invalidation reassessment.

Because snapshot-only BOARD still does not require a dedicated Candidate C lineage subsystem, the next design checkpoint should first ask whether a concrete 3M requirement now justifies provenance/invalidation expansion or whether the program should proceed directly to the next planned source/intelligence boundary.

No implementation is authorized by this closing statement.
