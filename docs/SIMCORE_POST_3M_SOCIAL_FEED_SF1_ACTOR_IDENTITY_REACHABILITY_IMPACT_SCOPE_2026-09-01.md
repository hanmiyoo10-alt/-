# SimCore Post-3.0M SOCIAL_FEED SF-1 Actor Identity + Reachability Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **SF-1 IMPACT SCOPE FROZEN · DESIGN-ONLY · SNAPSHOT-LOCAL ACTOR IDENTITY · PUBLIC-FEED REACHABILITY TARGET · CANDIDATE C NOT ACTIVATED · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-1 · ACTOR IDENTITY · REACHABILITY · IMPACT SCOPE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

SF-1 isolates the first SOCIAL_FEED-specific ownership seam before feed-graph design.

```text
How can one current SOCIAL_FEED snapshot show profile-like actors
without creating durable accounts,
and how can the selected social surface prove public reachability
without confusing reachability with exposure or truth?
```

This checkpoint is design-only. It does not implement a generator, validator, account store, follower graph, DOM/CSS, transport, network access, media, or runtime changes.

## 1. Authority inputs

This scope consumes the frozen SOCIAL_FEED master plus existing 3M owners:

```text
3M-2 assertion / exposure
3M-5 BOARD projection-local participant precedent
3M-6 current-projection invalidation / Candidate C triggers
3M-7 zero additional structured source re-entry
3M-10 convergence / Candidate C closed status
SNS Forme reference analysis as research only
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Selected seam

```text
SNAPSHOT_LOCAL_SOCIAL_ACTOR_IDENTITY
+
PUBLIC_FEED_REACHABILITY_GATE
```

Later checkpoints still own:

```text
POST / REPLY / REPOST / QUOTE graph rules
assertion-validation detail
presentation grammar
metrics
media
persistence
interaction
```

## 3. Existing owners that SF-1 must not displace

### Current source authority

Handoff / Evidence / Lineage remain authoritative for whether the current projection has a valid current root.

### Exposure authority

3M-2 remains authoritative for whether a particular assertion may be stated by a public source.

```text
PUBLICLY REACHABLE SURFACE
!=
ASSERTION MAY EXPOSE THIS FACT
```

### Canonical character identity

A social actor label may resemble a known character, but SOCIAL_FEED actor identity must not become canonical character identity.

### Candidate C

Durable derived identity remains closed until a concrete cross-turn consumer requires it.

## 4. Identity pressure

SOCIAL_FEED needs repeated profile-like actors inside one snapshot:

```text
display name
handle
repeated item authorship
relationship edges
```

Without an explicit boundary, later code could infer:

```text
same @handle on a later turn
→ same persistent account
```

That would silently activate Candidate C C2.

Therefore:

```text
SOCIAL ACTOR STRUCTURAL IDENTITY
MUST BE PROJECTION-LOCAL IN V1
```

## 5. Actor identity risks

```text
R1 handle becomes hidden database key
R2 display label becomes canonical-character key
R3 hidden-only actors leak through profile rows/counts
R4 profile metadata becomes free semantic invention
R5 one structural actor has inconsistent labels inside one snapshot
```

V1 must prevent all five without introducing durable storage.

## 6. First actor boundary

Future conceptual actor record:

```text
SocialActorDraftV1
  actorOrdinal
  displayName
  handle
```

Ownership:

```text
actorOrdinal = structural identity inside this snapshot only

displayName  = bounded source-semantic label

handle       = bounded source-semantic handle label
```

Relationship joins use `actorOrdinal` only.

Neither string is a canonical join key.

## 7. Handle recommendation

SF-1 should freeze:

```text
handle must be unique inside one current snapshot
```

but:

```text
projection-local uniqueness
!=
platform-global uniqueness
!=
cross-turn account continuity
```

No real-platform case-folding, Unicode normalization, or username syntax is claimed.

`displayName` may repeat.

## 8. Actor labels are semantic

`displayName` and `handle` can reveal identity information, so they are not free decoration.

```text
ACTOR LABELS ARE POLICY-BEARING SOURCE SEMANTICS
```

They may be rendered only as part of an accepted social projection.

SF-1 does not create a durable canonical-person binding system.

A label such as `Alice` or `@alice` may be displayed as source-local attribution, but no downstream owner may use it as a canonical character ID or truth anchor.

## 9. Actor visibility

Actor records have no independent ordinary-presentation authority in V1.

Expected validated rule:

```text
visible actors
=
actors referenced by at least one accepted feed item
```

Thus:

```text
actor referenced only by quarantined items
→ absent from ordinary validated actor list
```

A standalone profile directory is outside V1.

## 10. Identity continuity

Inside one snapshot:

```text
same actorOrdinal
→ same actor record
```

Across turns/snapshots:

```text
same displayName
same handle
same visual profile style
```

are insufficient to prove continuity.

```text
LEXICAL RECURRENCE
!=
DURABLE SOCIAL IDENTITY
```

If durable account continuity is later required, Candidate C C2 must activate first.

## 11. User quotation does not resurrect an old actor

If a later user says:

```text
@alice가 아까 쓴 글 말인데...
```

`@alice` is current user-provided text. It does not prove a prior hidden SocialActor object is still alive.

No hidden social-history retrieval or actor resurrection is authorized.

## 12. Reachability is a separate gate

SOCIAL_FEED adds a question distinct from Exposure:

```text
Even if a claim is public enough to say,
is this selected source surface allowed to reach it?
```

V1 answer:

```text
PUBLIC_FEED_ONLY
```

No follower graph is needed.

## 13. Reachability risks

```text
R6 public reachability mistaken for truth
R7 public reachability mistaken for exposure permission
R8 model/producer self-declares isPublic=true
R9 private/follower semantics quietly create a relationship database
```

All are forbidden.

## 14. First reachability authority

Selected future conceptual trusted input:

```text
SocialFeedReachabilityContextV1
```

It is not authored by the semantic draft/model.

First supported scope:

```text
PUBLIC_FEED
```

Conceptual dispositions:

```text
REACHABLE_PUBLIC
HOLD_UNPROVEN_PUBLIC_REACHABILITY
UNSUPPORTED_RESTRICTED_SCOPE
```

Meaning:

```text
REACHABLE_PUBLIC
→ continue to assertion/exposure validation

HOLD_UNPROVEN_PUBLIC_REACHABILITY
→ do not ordinary-present the projection

UNSUPPORTED_RESTRICTED_SCOPE
→ V1 does not model this source relationship
```

These are reachability dispositions, not truth/exposure dispositions.

## 15. Projection-level reachability

V1 selects:

```text
REACHABILITY = PROJECTION-LEVEL
```

A single V1 snapshot must not mix public and follower/private ACL semantics.

Mixed or restricted scope is unsupported rather than heuristically filtered.

## 16. Reachability / exposure precedence

Required future order:

```text
1. current source authority valid
2. PUBLIC_FEED reachability gate
3. assertion / exposure policy
4. later feed-graph dependency policy
5. validated semantic projection
6. presentation
```

Examples:

```text
reachability = REACHABLE_PUBLIC
exposure = DENY
→ assertion remains denied

reachability = HOLD
exposure would otherwise ALLOW
→ projection still does not ordinary-present
```

Reachability cannot rescue exposure, and exposure cannot invent reachability.

## 17. Restricted scopes explicitly deferred

V1 does not model:

```text
private account
followers-only
mutual-only
membership-gated
block relationship
selective audience list
historical remote discovery
```

These require separate identity/relationship authority and may create Candidate C pressure.

## 18. Profile metadata excluded

SF-1 does not authorize:

```text
bio
avatar identity
verified status
follower count
following count
join date
location
website
```

These are semantic or materialization claims, not free UI texture.

## 19. Candidate C impact

SF-1 keeps all triggers closed:

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

Requirements that would later activate identity-related Candidate C pressure include:

```text
same account persists across turns
handle rename preserving identity
profile edits
followers/following relationships
old posts remain addressable by account
```

## 20. Future consumer ownership

```text
SF-2 Feed Graph
→ consumes actorOrdinal as only structural actor key

SF-3 Validation
→ consumes actor-label semantic rule + reachability context

SF-4 Presentation
→ consumes accepted displayName/handle only

SF-5 Metrics / Media
→ may not reinterpret actor identity as authority for avatar/badge/count fields
```

## 21. Future evaluator cases

```text
1. same displayName, different handles
→ legal

2. duplicate handle in one snapshot
→ invalid under recommended policy

3. missing actorOrdinal reference
→ invalid

4. same @handle appears next turn
→ no continuity inference

5. PUBLIC reachability + exposure ALLOW
→ may continue

6. PUBLIC reachability + exposure DENY
→ denied

7. reachability unproven
→ hold projection

8. private/follower scope
→ unsupported V1

9. actor exists only in quarantined items
→ omitted from ordinary validated projection

10. actor label resembles canonical character
→ no canonical identity authority
```

## 22. Selected impact classification

```text
PRIMARY OWNER              = SOCIAL_FEED family semantics
IDENTITY BOUNDARY          = SNAPSHOT_LOCAL_SOCIAL_ACTOR
STRUCTURAL KEY             = actorOrdinal
DISPLAY FIELDS             = displayName + handle
HANDLE CONTINUITY          = NONE ACROSS TURNS
REACHABILITY OWNER         = TRUSTED CURRENT SOURCE-JOB CONTEXT
V1 REACHABILITY            = PUBLIC_FEED ONLY
EXPOSURE OWNER             = EXISTING 3M-2
CANONICAL CHARACTER ID     = NOT OWNED BY SOCIAL_FEED
CANDIDATE C                = NOT ACTIVATED
```

## 23. Closure

SF-1 impact scope selects:

```text
CURRENT SOCIAL FEED PROJECTION
        ↓
trusted PUBLIC_FEED reachability gate
        ↓
snapshot-local actor table
(actorOrdinal only for structural joins)
        ↓
future feed graph
        ↓
existing assertion/exposure policy
```

Decisive rules:

```text
PROFILE-LIKE APPEARANCE
!=
DURABLE ACCOUNT IDENTITY
```

and:

```text
PUBLIC REACHABILITY
!=
EXPOSURE AUTHORITY
!=
TRUTH
```
