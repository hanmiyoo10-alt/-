# SimCore 3M-5 First New Source Family — BOARD Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **READ-ONLY IMPACT SCOPE COMPLETE · BOARD SELECTED OVER SOCIAL_FEED · FIRST 3M-5 DESIGN SEAM SELECTED · DESIGN-ONLY · NO RUNTIME IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-5 PRE-DESIGN · FIRST GENUINELY NEW SOURCE FAMILY · BOARD**

## 0. Purpose

This document performs the source-backed impact scope required before freezing the first genuinely new Source Intelligence family after `LIVE_REACTION` compatibility.

It answers:

```text
Between BOARD and SOCIAL_FEED,
which family is the narrowest safe second Source Intelligence family,
what new semantic surface does it require,
and which authority/persistence/presentation boundaries must remain frozen?
```

This is design/research/document work only.

It does not implement a Board generator, structured transport, renderer, DOM/CSS, persistent board state, source identity registry, interaction system, prompt/output change, S7/v0.70.3 feature, release transaction, or `release-simcore` mutation.

## 1. Authority snapshot

Design/evidence authority at impact-scope start:

```text
main = f4ebc1e8dbb62cca458b28b95064c34cdba5a585
```

Deployed runtime authority remains independently:

```text
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
version         = 0.70.1 Cold First-Turn Tail Attribution
```

3.0M remains design-only.

## 2. Inherited 3M contracts

### 3M-0

Source family is orthogonal to runtime mode.

```text
MODE C
+
SOURCE FAMILY
```

not:

```text
BOARD_MODE
SNS_MODE
```

### 3M-1

`LIVE_REACTION` is the legacy Community compatibility family.

BOARD must be genuinely new semantics, not a new CSS skin for `<COMMUNITY>`.

### 3M-2

First machine-checkable exposure/assertion vocabulary remains:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

with `ALLOW / DENY / HOLD` mechanically derived from trusted policy context.

### 3M-3

Structured semantic data is untrusted until validator acceptance.

```text
MODEL/PRODUCER PROPOSES CONTENT
SIMCORE OWNERS PROVIDE SOURCE AUTHORITY
POLICY CONTEXT PROVIDES EXPOSURE BASIS
VALIDATOR DERIVES DISPOSITION
```

### 3M-4

Presentation consumes validated semantic data only.

```text
Semantic Renderer      = main model
Presentation Renderer  = plugin UI adapter
```

Presentation may change DOM grammar but cannot select truth.

## 3. Candidate comparison

The master design left the first genuinely new family as:

```text
BOARD
or
SOCIAL_FEED
```

Both are valuable, but they do not create the same authority surface.

### BOARD

Required new semantics:

```text
post/reply hierarchy
bounded local author labels
title/body or reply body
thread-local ordering
source-specific thread presentation
```

Potentially deferred semantics:

```text
cross-turn board persistence
stable long-lived identities
votes
user mutation
thread continuation across turns
```

### SOCIAL_FEED

Required new semantics tend to include:

```text
profile identity
post identity
reply relationships
repost/share relationships
feed ordering
channel reachability
profile continuity
optional media
potential multiple platform representations
```

SNS Forme also demonstrates separate media materialization and platform-specific projection axes, which are useful but enlarge the first-family scope.

## 4. Selection criteria

The first new family should maximize architectural learning while minimizing new authority classes.

Evaluation:

| Criterion | BOARD | SOCIAL_FEED |
| --- | --- | --- |
| genuinely new semantic grammar | yes | yes |
| can remain one bounded current projection | yes | less naturally |
| requires persistent profile identity | no | strongly useful / likely |
| requires repost/share graph | no | likely |
| requires media boundary | no | optional but product-salient |
| can use one-level parent/reply tree | yes | yes, plus more edges |
| exercises non-flat sidecar schema | yes | yes |
| exercises new DOM grammar | yes | yes |
| can avoid Candidate C lineage expansion initially | yes | less comfortably |
| lowest first-family blast radius | **best** | larger |

## 5. Selection

Canonical 3M-5 first-new-family decision:

```text
FIRST_NEW_SOURCE_FAMILY = BOARD
```

Reason:

```text
BOARD
= smallest family that forces a genuinely new structured social grammar
  without simultaneously requiring persistent profiles,
  repost graphs,
  media materialization,
  or multi-platform representation policy.
```

SOCIAL_FEED remains a later 3.0M family and is not rejected.

```text
SOCIAL_FEED = DEFERRED_AFTER_BOARD
```

## 6. First BOARD source scope

The narrowest safe first BOARD semantic slice is:

```text
mode = C
family = BOARD
source = direct B root
sourceAuthorityRef.kind = HANDOFF_EVIDENCE
rootMode = B
parentMode = B
parentIndex = rootIndex
depth = 1
projection = one bounded current Board snapshot
```

Canonical seam name:

```text
DIRECT_B_ROOT_BOARD_THREAD_SNAPSHOT
```

This deliberately reuses the best-understood B→C authority relationship.

## 7. What BOARD means in 3M-5

BOARD is not simply “longer Community comments.”

The semantic grammar is:

```text
BOARD SNAPSHOT
  participants (projection-local)
  top-level posts
    optional title
    semantic stance/mode
    content
    zero or more direct replies
```

The first version is a **snapshot projection**, not a persistent social database.

Canonical distinction:

```text
BOARD SNAPSHOT
!=
PERSISTENT FORUM DATABASE
```

## 8. Why snapshot-first

A persistent Board would immediately require stronger answers for:

```text
cross-turn object identity
reroll invalidation
edit/source replacement
stable participant identity
thread append/merge semantics
storage authority
future-context re-entry
user mutation transactions
```

Those are exactly the conditions under which Candidate C provenance/lineage may need dedicated activation.

The first Board family should prove its semantic and presentation grammar before creating that state surface.

Therefore:

```text
BOARD_PERSISTENCE = NOT AUTHORIZED
BOARD_CROSS_TURN_APPEND = NOT AUTHORIZED
BOARD_MUTATION = NOT AUTHORIZED
```

## 9. Participant identity boundary

A Board needs authors to feel like a Board, but 3M-5 does not authorize a persistent synthetic identity registry.

First design direction:

```text
participantOrdinal
+ displayName
```

with identity scope:

```text
PROJECTION_LOCAL
```

Meaning:

- a participant can remain internally consistent within one Board snapshot;
- replies can point to the same participant within that snapshot;
- the participant does not become a world character;
- the participant does not automatically persist to the next Board projection;
- a generated display name is derived source semantics, not canonical identity.

Canonical rule:

```text
PROJECTION_LOCAL_PARTICIPANT
!=
CANONICAL CHARACTER
!=
CROSS_TURN SOURCE IDENTITY
```

## 10. Post/reply hierarchy boundary

The first Board grammar should support exactly two semantic levels:

```text
POST
└─ REPLY
```

No arbitrary nested reply graph is required.

Reason:

- proves hierarchy and parent validation;
- supports realistic thread grammar;
- keeps graph validation bounded;
- avoids recursive/unbounded source topology.

Deferred:

```text
reply-to-reply tree
quote graph
cross-thread links
mentions as authority links
```

## 11. Statement-level epistemic mode

Every post/reply semantic unit must remain inside the existing assertion vocabulary:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

The unit's text must not become stronger than its validator-approved mode.

A Board entry may be conversational, humorous, skeptical, or speculative, but no Board-specific fourth truth class is introduced merely for flavor.

This keeps:

```text
BOARD FAMILY GRAMMAR
orthogonal to
ASSERTION / EXPOSURE AUTHORITY
```

## 12. Mixed-claim limitation

A single arbitrary forum paragraph can contain multiple epistemic claims with different authority.

The first family must not pretend a structural validator can decompose arbitrary prose perfectly.

Therefore first design should treat one Board post/reply semantic unit as one primary epistemic stance.

If complex mixed content is needed later, a dedicated claim/substatement representation may be designed separately.

Canonical caution:

```text
ONE ENTRY MODE
!=
PROOF THAT EVERY NATURAL-LANGUAGE CLAUSE HAS IDENTICAL EPISTEMIC STATUS
```

Model semantic-compliance evidence remains separately necessary.

## 13. Title boundary

Top-level posts may need a title for genuine Board grammar.

A title is semantic text, not presentation-only decoration.

Therefore:

```text
POST TITLE
inherits the same validated epistemic unit boundary as its post body
```

The Presentation Renderer may not invent a clickbait title from body text.

Replies do not require titles in the first design.

## 14. Exposure relationship

BOARD does not gain broader factual knowledge merely because forum posts are slower or more persistent-looking than live comments.

Canonical rule:

```text
BOARD FORM
!=
BROADER AUDIENCE KNOWLEDGE
```

For the first direct-B-root slice:

```text
CONFIRMED_FACT
→ still requires proven public/exposed basis

ATTRIBUTED_SOCIAL
→ remains attributed social context only

INFERENCE_OPINION
→ remains inference/opinion only
```

No Board-specific omniscience exception exists.

## 15. Publication maturity

BOARD is semantically less immediate than `LIVE_REACTION`, but 3M-5 must not confuse presentation tempo with truth authority.

First design may distinguish family-level maturity conceptually as:

```text
LIVE_REACTION = immediate social reaction
BOARD         = posted discussion snapshot
```

However:

```text
posted longer ago
!=
more true
```

No automatic truth upgrade may derive from source-family maturity.

## 16. Source reachability

The first Board slice does not create a generalized channel-propagation engine.

Reachability remains bounded to the already-authorized direct B-root source relationship.

Deferred:

```text
remote board discovers event later
private board membership
geographic propagation
cross-source reposting
multi-hop rumor propagation
```

These belong to later Source Intelligence expansion.

## 17. Presentation requirements

3M-4 already permits family-specific DOM grammar.

BOARD therefore requires a future adapter distinct from LIVE_REACTION:

```text
BOARD_THREAD_V1
```

Conceptual presentation grammar:

```text
board root
  post list / thread
    post header
      projection-local author
      title
    post body
    reply list
      reply author
      reply body
```

This is not a CSS skin over `LIVE_REACTION_STREAM_V1`.

```text
BOARD_THREAD_V1
!=
LIVE_REACTION_STREAM_V1 + different colors
```

## 18. Renderer data boundary

The Board renderer may consume only validated Board semantic data plus presentation policy.

It must not invent:

```text
votes
view counts
registration dates
badges
profile images
moderator status
thread age
external links
```

unless a later Board semantic schema explicitly authorizes those fields.

This prevents UI richness from becoming semantic fabrication.

## 19. Board presentation state

Permitted first view-local state may include:

```text
selected post
expanded/collapsed replies
local list/detail selection
scroll position
responsive pane state
```

All remain:

```text
EPHEMERAL
NON-PERSISTENT
NON-CANONICAL
NON-MODEL-CONTEXT
```

## 20. Interaction boundary

The first Board family is read-only.

Not authorized:

```text
ADD_POST
ADD_REPLY
DELETE
VOTE
REROLL_ITEM
EDIT_POST
CHANGE_BOARD
```

The architecture may later support narrow intents, but no semantic mutation design is bundled into 3M-5.

## 21. Persistence and Candidate C

Current conclusion:

```text
Candidate C dedicated provenance/lineage expansion
= NOT YET REQUIRED
```

because the first Board is one ephemeral validated snapshot tied to current existing Handoff/Evidence authority.

Candidate C must be reassessed if later Board design introduces:

```text
cross-turn persistence
stable participant identity
item-level reroll
user reply/post mutation
source replacement with surviving descendants
future-context re-entry
```

## 22. Context re-entry

First Board design inherits the 3M default:

```text
ordinary future context re-entry = NONE
```

A rendered Board is not automatically a future world-state source.

Board statements remain derived social projection.

## 23. Failure quarantine

The family must distinguish:

```text
invalid semantic structure
unsupported source scope
policy-denied/held entry
presentation failure
```

Presentation failure cannot repair or rewrite Board semantics.

Policy-denied/held entry content must not be passed to ordinary Board rendering.

## 24. Non-impact boundaries

3M-5 must not modify or absorb:

```text
Mode A ordinary behavior
Broadcast lifecycle authority
current <COMMUNITY> compatibility behavior
LIVE_REACTION schema/presentation contract
Frame / Time / Continuity authority
Handoff / Evidence / Lineage ownership
Reaction RT grammar/history
existing Community platform taxonomy
Representation/Edit Reconcile identity
Store/persistence schema
S7/v0.70.3 release transaction
release-simcore
```

## 25. Rejected first-family alternatives

### Reuse `<COMMUNITY>` with a Board CSS skin

```text
REJECT · PRESENTATION_ONLY_FAKE_FAMILY
```

BOARD has a real post/reply semantic grammar.

### Make Board a new core mode

```text
REJECT · BOARD_MODE
```

Family remains orthogonal to Mode C.

### Persistent Board database first

```text
REJECT · PREMATURE_PERSISTENT_SOURCE_STATE
```

### Stable global fake-user registry first

```text
REJECT · PREMATURE_SOURCE_IDENTITY_REGISTRY
```

### SOCIAL_FEED simultaneously

```text
REJECT · MULTI_FAMILY_SCOPE_EXPLOSION
```

## 26. First design seam selected

Canonical 3M-5 design seam:

```text
DIRECT_B_ROOT_BOARD_THREAD_SNAPSHOT
```

Expected design outputs:

```text
BOARD semantic sidecar schema
projection-local participant contract
post/reply hierarchy contract
per-entry assertion/exposure contract
Board validator result shape
BOARD_THREAD_V1 presentation read model
read-only/no-persistence/no-reentry rules
```

## 27. Current blockers

These do not block design but block any later active runtime implementation:

```text
BLOCKER · ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
BLOCKER · ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

No workaround is authorized inside 3M-5 design.

## 28. Impact-scope verdict

```text
FIRST_NEW_SOURCE_FAMILY = BOARD
FIRST_SEAM = DIRECT_B_ROOT_BOARD_THREAD_SNAPSHOT
SOCIAL_FEED = DEFERRED_AFTER_BOARD
PERSISTENCE = NOT AUTHORIZED
INTERACTION = NOT AUTHORIZED
CROSS_TURN_IDENTITY = NOT AUTHORIZED
CANDIDATE_C_EXPANSION = NOT YET REQUIRED
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
```

Next design transaction may freeze the exact BOARD semantic / validation / presentation contract inside this seam only.
