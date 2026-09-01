# SimCore Post-3.0M SOCIAL_FEED Master Design — 2026-09-01

Date: 2026-09-01 KST

Status: **SOCIAL_FEED MASTER DESIGN FROZEN · DESIGN-ONLY · SNAPSHOT-ONLY FIRST SCOPE · CANDIDATE C NOT ACTIVATED · RUNTIME / PRODUCER / TRANSPORT / MOUNT NOT AUTHORIZED · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOURCE INTELLIGENCE · SOCIAL_FEED · MASTER DESIGN · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

This document freezes the overall design direction for the first post-3.0M follow-up family:

```text
SOCIAL_FEED
```

It answers, at architecture level:

```text
What makes SOCIAL_FEED different from BOARD?
What is the first safe semantic lifetime?
How are actors/accounts represented without creating a durable account database?
How do POST / REPLY / REPOST / QUOTE relationships work conceptually?
How do exposure, reachability, and source-local representation remain separate?
How does presentation differ without becoming semantic authority?
When would SOCIAL_FEED finally activate Candidate C?
```

This is a design-only checkpoint. It does not implement model output, structured transport, validation code, DOM/CSS, persistence, media generation, user interaction, or release changes.

## 1. Authority chain

This design consumes the already-frozen 3.0M Source Intelligence architecture, including:

```text
3M-2  assertion / exposure boundary
3M-3  structured sidecar / validator split
3M-4  presentation renderer architecture
3M-5  BOARD snapshot-family precedent
3M-6  current-projection support invalidation
3M-7  zero additional structured source re-entry
3M-9  source-irrelevant dormancy / current-projection cost
3M-10 first-major convergence and Candidate C status
```

It also consumes the LightBoard SNS Forme reference analysis only as research input, especially:

```text
orthogonal projection axes
source-specific representation policy
semantic object != media materialization
optional enrichment degradation
composable presentation adapters
source-local identity as a watched future pressure
```

Reference research gives no implementation authority.

Production runtime remains independently authoritative on `release-simcore`.

## 2. Product identity

SOCIAL_FEED is a Source Intelligence family under existing runtime mode semantics.

First relationship:

```text
mode = C
family = SOCIAL_FEED
```

Forbidden architecture:

```text
SOCIAL_MODE
SNS_MODE
TWITTER_MODE
INSTAGRAM_MODE
```

Canonical rule:

```text
RUNTIME MODE
!=
SOURCE FAMILY
!=
PRESENTATION ADAPTER
```

SOCIAL_FEED describes a semantic/social projection family. A platform-like visual grammar is presentation policy, not a new core mode or world-truth class.

## 3. Why SOCIAL_FEED is not BOARD with different CSS

BOARD is primarily a bounded discussion hierarchy:

```text
POST
└ REPLY
```

SOCIAL_FEED introduces a different semantic grammar:

```text
ACTOR SURFACE
POST
REPLY
REPOST
QUOTE
TIMELINE ORDER
RELATIONSHIP EDGES
```

Therefore:

```text
BOARD_THREAD_V1
!=
SOCIAL_FEED presentation skin
```

SOCIAL_FEED needs a distinct semantic family and renderer grammar because repost/quote edges and actor surfaces affect validation dependencies, not merely appearance.

## 4. First safe scope

The first design scope is intentionally narrow:

```text
PUBLIC SOCIAL FEED SNAPSHOT
DIRECT CURRENT SOURCE AUTHORITY
READ-ONLY
NON-PERSISTENT
CURRENT PROJECTION ONLY
NO AUTOMATIC CONTEXT RE-ENTRY
NO NETWORK / MEDIA MATERIALIZATION
NO USER MUTATION
```

The default first family seam is:

```text
DIRECT_B_ROOT_PUBLIC_SOCIAL_FEED_SNAPSHOT
```

The exact future source relationship remains subject to the same source-job / Handoff / Evidence authority gates used by the 3.0M family system.

Private/follower-only feeds, remote discovery, historical feed retrieval, durable accounts, and cross-turn post references are outside V1.

## 5. SOCIAL_FEED is a snapshot, not a social database

Frozen first-major post-3M rule:

```text
SOCIAL_FEED SNAPSHOT
!=
SOCIAL NETWORK DATABASE
```

The snapshot may contain repeated actor references and feed-item relationship edges inside one projection.

It does not imply:

```text
persistent account registry
cross-turn follower graph
cross-turn post IDs
editable timeline history
remote platform state
canonical world-character ownership
```

This is the key boundary that keeps Candidate C closed in the first SOCIAL_FEED design.

## 6. Orthogonal policy axes

SOCIAL_FEED must not collapse independent product questions into one magic mode.

Required conceptual axes remain distinct:

```text
runtime mode
source family
source authority
exposure eligibility
reachability scope
subject / actor reference
semantic relationship kind
presentation adapter
media policy
persistence policy
context re-entry policy
interaction policy
```

Canonical rule:

```text
DO_NOT_COLLAPSE_ORTHOGONAL_POLICY_AXES
```

Examples:

```text
SOCIAL_FEED family
+ public reachability
+ snapshot-local actors
+ text-only media policy
+ SOCIAL_TIMELINE_V1 adapter
```

is one legal combination.

Changing the adapter must not silently change exposure, identity lifetime, or truth authority.

## 7. Actor/account concept

SOCIAL_FEED requires a profile-like actor surface, but V1 must not create durable account identity.

Conceptual first actor object:

```text
SocialActorDraftV1
  actorOrdinal
  displayName
  handle
```

### `actorOrdinal`

- unique only inside the current Social Feed snapshot;
- used for relationship references inside that snapshot;
- not a cross-turn account ID;
- not a canonical character ID;
- not reroll/edit lineage identity.

### `displayName`

- bounded plain semantic text;
- presentation label only;
- may be pseudonymous or platform-styled;
- not proof of canonical identity.

### `handle`

- bounded source-local label;
- unique handling policy is a later schema detail;
- does not become durable merely because it resembles a platform username.

Canonical rule:

```text
SNAPSHOT-LOCAL SOCIAL ACTOR
!=
PERSISTENT ACCOUNT
!=
CANONICAL CHARACTER
```

Cross-turn stable account continuity would activate Candidate C pressure and requires a separate design.

## 8. Feed-item grammar

The master design allows exactly four conceptual relationship kinds for the first schema workstream:

```text
POST
REPLY
REPOST
QUOTE
```

These are semantic relationship kinds, not presentation badges only.

### POST

Independent top-level social post with its own actor and assertion content.

### REPLY

A response edge to an accepted feed item in the same snapshot.

### REPOST

A relationship edge that republishes an accepted target item without automatically creating a new truth claim about the target content.

Canonical rule:

```text
REPOST
!=
ENDORSEMENT
!=
TRUTH UPGRADE
```

### QUOTE

A new assertion/commentary unit plus an edge to an accepted target item.

Canonical rule:

```text
QUOTE COMMENTARY AUTHORITY
!=
TARGET ITEM TRUTH AUTHORITY
```

The exact graph restrictions, target kinds, ordering constraints, and bounded depth belong to the later Feed Graph checkpoint.

## 9. Relationship dependency rule

SOCIAL_FEED inherits the safety lesson from BOARD but generalizes it beyond parent/child trees.

A dependent item cannot remain ordinary-visible if the target object required to understand it is quarantined or invalid.

Conceptual rule:

```text
DEPENDENT ITEM own policy = ALLOW
AND
required target item = ELIGIBLE
→ dependent item may remain ELIGIBLE
```

Otherwise it must be quarantined with a relationship-specific reason.

Examples:

```text
REPLY whose target is hidden
→ quarantine

REPOST whose target is hidden
→ quarantine

QUOTE whose quoted target is hidden
→ quarantine unless a future schema explicitly proves the quote is semantically standalone
```

V1 should prefer conservative dependency closure over leaking hidden target content through relationship residue.

## 10. Assertion / truth policy remains unchanged

SOCIAL_FEED introduces no new truth class.

Each assertion-bearing semantic unit continues to use the existing modes:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

The existing Exposure policy remains authoritative.

Canonical rules:

```text
SOCIAL POST EXISTS
!=
CLAIM IS TRUE

MANY SOCIAL POSTS AGREE
!=
CLAIM BECOMES CANON

REPOST COUNT
!=
TRUTH CONFIDENCE

VERIFIED-LOOKING UI
!=
CANONICAL AUTHORITY
```

Any future verification badge, follower count, trend metric, or engagement count must have explicit semantic authority before it can appear as data.

## 11. Reachability is separate from exposure

SOCIAL_FEED adds strong pressure for audience segmentation, but the first safe contract should not invent a follower graph.

V1 reachability:

```text
PUBLIC_FEED_ONLY
```

Meaning:

- the source projection is intended to represent a generally reachable public social surface;
- no private/follower-only/account-block/membership graph is modeled;
- reachability does not create truth authority.

Canonical separation:

```text
EXPOSED ENOUGH TO ASSERT
!=
REACHABLE BY THIS SOURCE
!=
CANONICAL TRUTH
```

Future private/follower-scoped reachability requires a separate contract because it implies identity and relationship state pressure.

## 12. Metrics are not free metadata

The following fields are deliberately excluded from the first semantic authority surface unless a later design proves them:

```text
like count
repost count
reply count
view count
follower count
following count
trend rank
engagement score
verification badge
account age
```

Reason:

These values look presentational but are semantic claims about source-local state.

Therefore:

```text
METRIC-LIKE UI DATA
IS SEMANTIC DATA
WHEN IT CLAIMS A SOURCE FACT
```

The Presentation Renderer may not fabricate them for realism.

## 13. Media boundary

SOCIAL_FEED is the first family where media would be visually tempting, but V1 keeps media outside the core semantic slice.

Frozen first rule:

```text
SOCIAL SEMANTIC OBJECT
!=
EXPENSIVE MEDIA MATERIALIZATION
```

First design defaults to:

```text
TEXT_ONLY
NO REMOTE IMAGE FETCH
NO IMAGE GENERATION
NO AVATAR MATERIALIZATION
NO ASYNC MEDIA ATTACHMENT
```

Later media enrichment must preserve:

```text
media failure
→ presentation degradation only
→ semantic post remains valid
```

Targeted media reroll is a future Candidate C / delayed-side-effect concern and is not part of this master scope.

## 14. Presentation architecture

SOCIAL_FEED consumes only validated social semantics.

Conceptual pipeline:

```text
ValidatedSocialFeedSemanticSidecarV1
        ↓
SourcePresentationPolicy
        ↓
SOCIAL_FEED adapter registry
        ↓
SOCIAL_TIMELINE_V1
        ↓
SocialFeedPresentationModelV1
        ↓
Source Presentation Host
        ↓
source-scoped DOM + CSS
```

First recommended adapter:

```text
SOCIAL_TIMELINE_V1
```

It should be platform-neutral rather than branded as a real service.

Potential later adapters may include:

```text
MICROBLOG_TIMELINE
VISUAL_FEED
COMPOSITE_SOCIAL_VIEW
```

but only when the underlying semantic fields justify those presentations.

## 15. Presentation grammar

The first renderer should be able to express:

```text
actor row
  display name
  handle

feed item
  relationship kind
  semantic text
  optional relationship target preview by accepted reference

reply relation
repost relation
quote relation
```

Source-scoped namespace direction:

```text
[data-simcore-source-family="social-feed"]

sc-social
sc-social__feed
sc-social__actor
sc-social__item
sc-social__content
sc-social__relation
sc-social__target
```

The renderer must use escaped/plain semantic text and must not grant raw HTML authority to model output.

Global body/class/style mutation remains forbidden.

## 16. Platform style is presentation policy, not semantic identity

The LightBoard SNS reference demonstrates that the same underlying semantic job may be projected with different platform-specific representation policies.

SimCore adopts only the abstraction:

```text
ONE VALIDATED SOCIAL SEMANTIC OBJECT
→ ONE OR MORE LEGAL PRESENTATION ADAPTERS
```

It does not adopt real-platform protocol emulation as canonical state.

Therefore:

```text
PLATFORM-LIKE VISUAL STYLE
!=
SOURCE TRUTH CLASS
!=
ACCOUNT IDENTITY AUTHORITY
```

A later composite view may render two styles from the same validated object without duplicating semantic truth ownership.

## 17. Validation architecture

SOCIAL_FEED must preserve the 3M three-input authority split:

```text
A. untrusted Social Feed semantic draft
B. trusted current source-authority context
C. trusted assertion/exposure policy contexts
```

Family validation then adds:

```text
actor-reference integrity
feed-item graph integrity
relationship dependency closure
reachability scope compatibility
```

Conceptual order:

```text
1. schema validation
2. current source-authority exact join
3. actor-reference validation
4. feed graph validation
5. assertion/exposure policy
6. relationship dependency closure
7. reachability compatibility
8. validated social sidecar construction
9. bounded diagnostic receipt
```

The model/producer may not self-declare `isPublic`, `isValid`, `verified`, or final eligibility.

## 18. Quarantine and leakage rules

Ordinary validated presentation must receive only accepted semantic objects.

Quarantined item content must not be copied into the ordinary validated sidecar.

Actors that occur only in quarantined items should not remain visible merely as hidden identity-count leakage unless a later contract proves an independent visible reason for them.

Diagnostic receipts may contain bounded metadata such as:

```text
item ordinal
relationship kind
mode
eligibility state
reason code
content length
```

They should not duplicate quarantined post text, actor handles, or target bodies.

## 19. Failure separation

SOCIAL_FEED preserves the 3M failure taxonomy:

```text
SOURCE SUPPORT FAILURE
!=
ASSERTION / POLICY QUARANTINE
!=
RELATIONSHIP DEPENDENCY QUARANTINE
!=
PRESENTATION FAILURE
!=
OPTIONAL MEDIA FAILURE
```

Examples:

```text
stale source authority
→ whole current projection invalid

one social claim exposure DENY
→ item quarantine

repost target hidden
→ dependent item quarantine

CSS adapter failure
→ semantic object remains valid

future image provider failure
→ semantic object remains valid
```

## 20. Context and lifetime policy

First SOCIAL_FEED design inherits 3M-7:

```text
CURRENT_PROJECTION_ONLY
NO STRUCTURED SOURCE HISTORY
NO AUTOMATIC CONTEXT RE-ENTRY
NO HIDDEN RETRIEVAL
NO CROSS-TURN ACCOUNT MEMORY
```

A feed may remain visible in UI according to presentation lifetime without thereby becoming model-context memory.

Canonical rule:

```text
VISIBLE SOCIAL FEED
!=
FUTURE MODEL CONTEXT
```

## 21. Candidate C status

The first SOCIAL_FEED design deliberately does not activate Candidate C.

Current status:

```text
C1 cross-turn derived survival       = no
C2 stable derived identity           = no
C3 item mutation                     = no
C4 append / merge / revision         = no
C5 derived-to-derived lineage        = no
C6 future context re-entry           = no
C7 partial descendant survival       = no
C8 delayed semantic side effect      = no
```

Candidate C becomes mandatory if a concrete later requirement asks for any of the following:

```text
same account persists across turns
same post remains addressable across turns
old post receives a new reply later
one post is rerolled/edited/deleted
repost targets an older persisted post
BOARD/NEWS/SOCIAL_FEED objects propagate into one another as derived sources
social source content re-enters future model context
asynchronous media result attaches back to an exact old post
```

Do not build durable social infrastructure before one of these consumers is explicitly selected.

## 22. Cost / dormancy policy

SOCIAL_FEED is a post-3M family and must preserve 3M-9 dormancy.

If no current SOCIAL_FEED source job exists:

```text
social source prompt burden = 0
social history scan = 0
social validation = 0
social presentation build = 0
social persistent read/write = 0
social network/media call = 0
```

When active, cost must scale with the bounded current feed snapshot, not all prior social projections.

Concrete item/character caps remain a future lower-level design requirement before runtime implementation.

## 23. Explicit non-goals

This master design does not authorize:

```text
real Twitter / Instagram API integration
real platform branding requirement
persistent social account database
followers/following graph
private-feed ACL simulation
cross-turn account continuity
interactive posting/replying/reposting
one-item reroll/edit/delete
media generation or remote fetch
stable engagement metrics
automatic trending
multi-family fanout
cross-family truth propagation
legacy <COMMUNITY> migration
runtime implementation
```

## 24. Recommended SOCIAL_FEED design checkpoints

The follow-up family should proceed through design-only checkpoints rather than jumping directly to one giant schema.

Recommended sequence:

```text
SF-0  SOCIAL_FEED Master Design
      = this document

SF-1  Actor Identity + Reachability
      snapshot-local actors
      handle/display semantics
      PUBLIC_FEED_ONLY boundary

SF-2  Feed Graph Semantics
      POST / REPLY / REPOST / QUOTE
      target rules
      ordering / cycle prevention
      dependency closure

SF-3  Assertion + Validation Contract
      exposure policy joins
      graph-dependent quarantine
      validated sidecar / receipt

SF-4  Presentation Grammar
      SOCIAL_TIMELINE_V1
      source-scoped DOM/CSS
      adapter composition boundaries

SF-5  Metrics / Media Boundary Reassessment
      default = still excluded
      decide whether any semantic consumer truly requires them

SF-6  Family Convergence / Candidate C Reassessment
      confirm snapshot-only design closes cleanly
      or explicitly open Candidate C only if a real requirement now exists
```

No checkpoint authorizes runtime implementation unless separately approved.

## 25. Master decisions frozen

```text
FOLLOW-UP FAMILY                     = SOCIAL_FEED
CORE MODE                            = unchanged
FIRST SCOPE                          = PUBLIC SOCIAL FEED SNAPSHOT
LIFETIME                             = CURRENT_PROJECTION_ONLY
PERSISTENCE                          = NONE
CONTEXT RE-ENTRY                     = NONE
ACTOR IDENTITY                       = SNAPSHOT_LOCAL
RELATIONSHIP KINDS                   = POST / REPLY / REPOST / QUOTE
REPOST                               = NOT ENDORSEMENT / NOT TRUTH UPGRADE
REACHABILITY V1                      = PUBLIC_FEED_ONLY
METRICS                              = EXCLUDED BY DEFAULT
MEDIA                                = EXCLUDED BY DEFAULT
FIRST PRESENTATION ADAPTER           = SOCIAL_TIMELINE_V1
CANDIDATE C                          = CLOSED / CONDITIONALLY READY
RUNTIME IMPLEMENTATION               = NOT AUTHORIZED
PRODUCTION                            = UNCHANGED
release-simcore                       = UNCHANGED
```

## 26. Closure

The overall SOCIAL_FEED architecture is now defined as a richer but still bounded Source Intelligence family:

```text
CURRENT AUTHORITY
→ PUBLIC SOCIAL SNAPSHOT
→ snapshot-local actors
→ bounded feed relationship graph
→ exposure + relationship validation
→ validated social semantics
→ SOCIAL_TIMELINE_V1 presentation
→ no persistence / no re-entry / no durable account graph
```

The next design checkpoint is:

```text
SF-1 · Actor Identity + Reachability
```

This keeps the most important unresolved SOCIAL_FEED pressure isolated first:

```text
profile-like UX
without accidentally creating a persistent identity database
```
