# SimCore Post-3.0M SOCIAL_FEED SF-1 Actor Identity + Reachability Design - 2026-09-01

Date: 2026-09-01 KST

Status: **SF-1 DESIGN FROZEN · SNAPSHOT-LOCAL ACTOR IDENTITY · PUBLIC_FEED_ONLY REACHABILITY · NO DURABLE ACCOUNT BINDING · CANDIDATE C NOT ACTIVATED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-1 · ACTOR IDENTITY · REACHABILITY · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

SF-1 freezes the first lower-level SOCIAL_FEED contract after the family master design.

It answers:

```text
What is an actor inside one Social Feed snapshot?
Which actor field owns structural identity?
How do displayName and handle behave?
Can a handle imply account continuity? (no)
What does PUBLIC_FEED_ONLY actually prove?
What happens when public reachability is unknown or restricted?
How are reachability, exposure, and truth kept separate?
When would this design finally require Candidate C?
```

This is design-only.

It does not implement model output, runtime schemas, validation code, persistent account storage, follower graphs, network access, DOM/CSS, media generation, interaction, or `release-simcore` changes.

## 1. Authority chain

SF-1 consumes:

```text
SIMCORE_POST_3M_SOCIAL_FEED_MASTER_DESIGN_2026-09-01.md
SIMCORE_POST_3M_SOCIAL_FEED_SF1_ACTOR_IDENTITY_REACHABILITY_IMPACT_SCOPE_2026-09-01.md
SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_SNS_FORME_0_3_1_2026-09-01.md
```

Reference analysis is idea input only.

Production runtime remains independently authoritative on `release-simcore`.

## 2. SF-1 scope freeze

The first SOCIAL_FEED actor/reachability scope is:

```text
mode = C
family = SOCIAL_FEED
projection lifetime = CURRENT_PROJECTION_ONLY
reachability scope = PUBLIC_FEED_ONLY
actor identity lifetime = CURRENT SNAPSHOT ONLY
```

Still outside scope:

```text
persistent accounts
cross-turn profile continuity
followers/following graph
private accounts
selective audience lists
historical feed retrieval
network discovery
interactive profile mutation
```

## 3. Canonical identity separation

SF-1 permanently distinguishes three concepts:

```text
A. Social structural actor identity
B. Social display attribution
C. Canonical world/character identity
```

They are not interchangeable.

Canonical rules:

```text
actorOrdinal
!=
handle
!=
canonical character ID
```

and:

```text
SOCIAL ACTOR
!=
PERSISTENT ACCOUNT
!=
CANONICAL CHARACTER
```

## 4. First actor schema

Frozen conceptual type:

```text
SocialActorDraftV1
  actorOrdinal
  displayName
  handle
```

Unknown actor fields are outside SF-1.

A future strict structured schema should reject unsupported fields rather than silently granting them authority.

## 5. `actorOrdinal`

`actorOrdinal` is the only structural actor key in V1.

Required semantics:

```text
bounded integer-like ordinal
unique inside one current SOCIAL_FEED snapshot
used for feed-item actor references
not exposed as canonical identity
not persistent across turns
not a reroll lineage ID
not a database primary key
```

All future SF-2 feed graph relationships must reference actors by `actorOrdinal`, never by display-name or handle equality.

## 6. Actor ordinal uniqueness

Within one current snapshot:

```text
actorOrdinal must be unique
```

Duplicate structural ordinals are invalid.

Conceptual reason code:

```text
DUPLICATE_SOCIAL_ACTOR_ORDINAL
```

The validator must not merge duplicate records by guessing which one was intended.

## 7. `displayName`

`displayName` is:

```text
required
non-empty
bounded
plain semantic text
```

It is a source-local visible attribution label.

It is not:

```text
trusted HTML
canonical character identity
persistent account identity
proof of real-world ownership
```

Different actors may legally share the same `displayName`.

Example:

```text
actor 0: displayName = Alice, handle = alice_day
actor 1: displayName = Alice, handle = alice_live
```

This is structurally legal because `actorOrdinal` is the real local key.

## 8. `handle`

`handle` is:

```text
required
non-empty
bounded
plain semantic text
projection-local source label
```

The semantic contract does not require a literal `@` prefix.

Presentation may add visual affordances such as `@` if the selected adapter defines that grammar.

Canonical rule:

```text
HANDLE TEXT
!=
STRUCTURAL ACTOR IDENTITY
```

## 9. Handle uniqueness

SF-1 freezes:

```text
handle must be unique within one current snapshot
```

Duplicate handle labels create avoidable attribution ambiguity even though actor relationships use ordinals.

Conceptual reason code:

```text
DUPLICATE_SOCIAL_HANDLE
```

However this is only projection-local uniqueness.

```text
same handle in a later snapshot
!=
same account
```

No global platform uniqueness is claimed.

## 10. No real-platform normalization claim

SF-1 does not freeze:

```text
case-insensitive handle comparison
Unicode normalization rules
real Twitter/X handle rules
Instagram username rules
ASCII-only restrictions
platform reservation rules
```

The conceptual uniqueness requirement is scoped to one validated snapshot and does not emulate a real service protocol.

Exact implementation normalization, if ever needed, requires a later runtime schema decision.

## 11. One actor record per structural actor

Inside one draft snapshot:

```text
same actorOrdinal
→ exactly one actor record
```

Feed items reference that record.

V1 does not permit an actor to change handle/display identity mid-snapshot through separate profile revisions.

Profile revision semantics are outside V1 and would create mutation/provenance pressure.

## 12. Actor labels are semantic fields

A frequent design trap is treating profile labels as harmless UI chrome.

SF-1 freezes:

```text
ACTOR LABELS ARE SOURCE SEMANTICS
NOT FREE PRESENTATION DECORATION
```

For example:

```text
displayName = Secret Patient Alice
```

can leak information even if the post body itself is harmless.

Therefore actor labels must participate in later SF-3 semantic-compliance / visibility evidence.

Syntax alone cannot prove that a generated label contains no hidden fact.

This is a model semantic-compliance requirement, not something ordinary string validation can fully prove.

## 13. No canonical subject binding in V1

V1 intentionally does not add:

```text
canonicalOwnerRef
characterId
worldEntityId
accountOwnerId
```

to `SocialActorDraftV1`.

Reason:

A stable or trusted mapping from social account to canonical character is a separate authority problem.

A feed may display a source-local attribution such as:

```text
Alice @alice_day
```

but downstream systems must not use that label as a canonical entity join.

If direct canonical-subject account binding becomes necessary, it requires a separate trusted binding design.

## 14. Source-local attribution does not become direct testimony authority

Suppose the feed shows:

```text
Alice @alice_day:
"I was there."
```

SF-1 allows this to exist as a source-local social attribution when later assertion/exposure policy allows it.

But:

```text
actor label says Alice
→ statement becomes canonical Alice testimony
```

is forbidden.

The statement remains a SOCIAL_FEED assertion under Source Intelligence policy.

## 15. Actor-only data is not a feed

V1 does not create a standalone social profile directory.

A future well-formed SOCIAL_FEED draft must not use actor records as hidden standalone state disconnected from feed items.

Expected SF-2/SF-3 rule:

```text
actor must be referenced by at least one drafted feed item
```

and ordinary validated output further narrows to:

```text
visible actor
=
actor referenced by at least one accepted feed item
```

This prevents actor-count and hidden-profile leakage.

## 16. Quarantined-only actor removal

If every item that references actor 4 is quarantined:

```text
actor 4
→ not copied into ordinary validated actor data
```

Even if its profile labels were structurally valid.

Canonical rule:

```text
QUARANTINED-ONLY ACTOR
HAS NO ORDINARY PRESENTATION AUTHORITY
```

Diagnostic receipts should not copy hidden handle/displayName content merely to report that the actor existed.

## 17. Snapshot-local continuity

Inside one snapshot:

```text
actorOrdinal = continuity key
```

Across turns/snapshots:

```text
same displayName
same handle
same wording
same apparent avatar styling later
```

do not prove continuity.

Canonical rule:

```text
LEXICAL OR VISUAL RECURRENCE
!=
DURABLE SOCIAL IDENTITY
```

## 18. Cross-turn recurrence example

Turn N:

```text
actorOrdinal 2
handle = alice_day
```

Turn N+4:

```text
actorOrdinal 0
handle = alice_day
```

V1 interprets these as two independently generated projection-local actor records.

They may look continuous to a human reader, but Source Intelligence has no durable account identity authority connecting them.

## 19. User reference on a later turn

If a user later writes:

```text
@alice_day가 아까 쓴 말 있잖아
```

that handle text is now part of the current user input.

It may guide current semantics according to ordinary current-input rules.

It does not reactivate a hidden old SocialActor object or authorize source-history retrieval.

## 20. Candidate C identity trigger

The first concrete request for any of these activates Candidate C C2 pressure:

```text
same account must persist across turns
handle can rename while identity remains the same
profile fields can mutate while account identity survives
old posts remain addressable through the same account identity
followers/following relationships must persist
```

Until then:

```text
C2 = NOT ACTIVATED
```

## 21. Reachability terminology

SF-1 freezes a new family-specific distinction:

```text
REACHABILITY
= whether the selected SOCIAL_FEED surface can access / represent the current source under the supported audience scope
```

It is not:

```text
truth
canonical knowledge
exposure permission
publication maturity
```

## 22. First reachability context

Frozen conceptual trusted input:

```text
SocialFeedReachabilityContextV1
  schemaVersion = 1
  family = SOCIAL_FEED
  projectionOrdinal = 0
  sourceAuthorityRef
  reachabilityClass
```

`SocialFeedReachabilityContextV1` is not model-authored semantic draft data.

It is trusted current source-job context bound to the same current source authority as the SOCIAL_FEED projection.

The exact future runtime owner remains part of the separately unimplemented source-job authority layer.

## 23. `reachabilityClass`

SF-1 freezes exactly three conceptual classes:

```text
PUBLIC_FEED
UNKNOWN
RESTRICTED
```

### `PUBLIC_FEED`

The current projection is authorized to represent a generally public social surface.

No follower or account relationship lookup is needed.

### `UNKNOWN`

Current trusted context cannot prove that the selected surface is publicly reachable.

Fail closed.

### `RESTRICTED`

The selected source relationship requires private/follower/member/block/selective-audience semantics outside V1.

V1 does not approximate it.

## 24. Reachability gate output

Frozen conceptual disposition:

```text
PUBLIC_FEED
→ REACHABLE_PUBLIC

UNKNOWN
→ HOLD_UNPROVEN_PUBLIC_REACHABILITY

RESTRICTED
→ UNSUPPORTED_RESTRICTED_SCOPE
```

These outputs are validator/system derived.

The model may not self-declare them.

## 25. Reachability context binding

`SocialFeedReachabilityContextV1` must refer to the same current projection/source authority used by the SOCIAL_FEED draft.

A future validator must reject mismatched reachability context rather than borrowing a public status from another projection.

Conceptual failure:

```text
REACHABILITY_AUTHORITY_MISMATCH
```

No fallback to lexical source labels such as `public`, `twitter`, or `everyone` is allowed.

## 26. Projection-level reachability only

V1 freezes:

```text
REACHABILITY GRANULARITY
= ONE CURRENT PROJECTION
```

It does not evaluate ACL rules per item or per actor.

Therefore a V1 projection cannot legally contain a mixture such as:

```text
public post
followers-only post
private-message-derived post
```

under one reachability context.

If the surface requires mixed/restricted ACL semantics:

```text
UNSUPPORTED_RESTRICTED_SCOPE
```

## 27. Why not filter restricted items individually?

Per-item filtering would require trusted relationship state such as:

```text
who follows whom
who is blocked
who belongs to the audience list
which account is private
which viewer is authenticated
```

SF-1 owns none of that.

Attempting to infer those relationships from model text would create fake reachability authority.

Therefore V1 rejects the scope instead of guessing.

## 28. Reachability and Exposure are independent

Canonical separation:

```text
REACHABLE_PUBLIC
!=
ALLOW_KNOWN_PUBLIC_FACT
```

`REACHABLE_PUBLIC` answers:

```text
Is this a supported public social surface?
```

3M-2 exposure answers:

```text
May this assertion be exposed here?
```

Both must pass for ordinary accepted social content.

## 29. Required evaluation order

Future SOCIAL_FEED validation must conceptually use:

```text
1. structural schema
2. current source-authority exact join
3. SF-1 reachability context binding
4. SF-1 PUBLIC_FEED reachability gate
5. actor reference / identity structure
6. SF-2 feed graph structure
7. SF-3 assertion / exposure policy
8. relationship dependency closure
9. validated social sidecar construction
10. presentation
```

The lower stages cannot rescue an earlier failure.

## 30. Reachability / exposure matrix

```text
Reachability               Exposure            Result
-----------------------------------------------------------------
REACHABLE_PUBLIC            ALLOW               may continue
REACHABLE_PUBLIC            DENY                assertion denied
REACHABLE_PUBLIC            HOLD                assertion held
HOLD_UNPROVEN_REACHABILITY  any                 projection held
UNSUPPORTED_RESTRICTED      any                 unsupported scope
```

Thus:

```text
public source
+ private fact
→ still denied
```

## 31. Public reachability is not truth

Even when:

```text
reachability = REACHABLE_PUBLIC
```

none of the following follows:

```text
post is true
actor is canonical person
handle is persistent
repost count proves consensus
claim is settled public knowledge
```

Canonical rule:

```text
PUBLIC FEED SURFACE
!=
TRUTH AUTHORITY
```

## 32. Public reachability is not network access

`PUBLIC_FEED_ONLY` is a semantic/source-scope classification.

It does not authorize:

```text
internet fetch
real social API access
remote account lookup
web scraping
live trend retrieval
```

SOCIAL_FEED remains a simulated Source Intelligence projection unless a future external-materialization design separately authorizes network effects.

## 33. Restricted scopes deferred

Outside V1:

```text
PRIVATE_ACCOUNT
FOLLOWERS_ONLY
MUTUALS_ONLY
MEMBERSHIP_GATED
BLOCK_RELATIONSHIP
CUSTOM_AUDIENCE
GEO_RESTRICTED
REMOTE_LOGIN_DEPENDENT
```

SF-1 does not freeze schemas for them.

They may later require durable actor/relationship state and should be evaluated against Candidate C before adoption.

## 34. Profile metadata exclusion

The actor schema deliberately excludes:

```text
bio
avatar / profile image
verification badge
followers count
following count
join date
location
website
account age
engagement score
```

These are not harmless decoration.

They either assert source-local state or require media/materialization ownership.

SF-5 remains the later reassessment point.

## 35. Avatar exclusion is especially intentional

An avatar creates two separate questions:

```text
semantic identity of the avatar
materialized asset identity
```

SF-1 owns neither.

Therefore:

```text
actor identity
!=
avatar asset identity
```

The first SOCIAL_FEED family remains text-only.

## 36. No verified-account shortcut

A future UI must not use visual verification markers to imply:

```text
canonical person binding
truth reliability
public exposure authority
```

Verification status is excluded until a separate semantic owner exists.

## 37. No follower count as identity strength

Likewise:

```text
followers = 1.2M
```

would be a source-local factual claim.

It cannot be generated simply to make the UI look realistic.

## 38. Actor schema structural result vocabulary

SF-1 freezes conceptual structural diagnostics for later validator work:

```text
INVALID_ACTOR_ORDINAL
DUPLICATE_SOCIAL_ACTOR_ORDINAL
INVALID_DISPLAY_NAME
INVALID_SOCIAL_HANDLE
DUPLICATE_SOCIAL_HANDLE
UNSUPPORTED_SOCIAL_ACTOR_FIELD
```

These diagnose structure only.

They do not prove actor-label semantic safety.

## 39. Reachability result vocabulary

Frozen conceptual reachability diagnostics:

```text
REACHABLE_PUBLIC
HOLD_UNPROVEN_PUBLIC_REACHABILITY
UNSUPPORTED_RESTRICTED_SCOPE
REACHABILITY_AUTHORITY_MISMATCH
```

These reason codes must remain distinct from 3M-2 exposure reason codes.

## 40. Failure taxonomy

SOCIAL_FEED now distinguishes at least:

```text
SOURCE SUPPORT FAILURE
REACHABILITY FAILURE / HOLD
ACTOR STRUCTURE FAILURE
ACTOR LABEL SEMANTIC-COMPLIANCE FAILURE
ASSERTION / EXPOSURE QUARANTINE
FEED RELATIONSHIP QUARANTINE
PRESENTATION FAILURE
OPTIONAL MEDIA FAILURE (future)
```

A renderer success cannot rescue any semantic/source failure.

## 41. Whole-projection invalidation remains unchanged

If the current source authority becomes stale or mismatches:

```text
whole current SOCIAL_FEED projection
→ invalid
```

SF-1 does not introduce partial actor survival after source reroll/edit.

Partial survival would require Candidate C C7 lineage work.

## 42. Context policy remains unchanged

SF-1 inherits 3M-7:

```text
NO STRUCTURED SOCIAL HISTORY
NO AUTOMATIC SOCIAL RE-ENTRY
NO HIDDEN ACCOUNT RETRIEVAL
NO CROSS-TURN ACTOR STORE
```

Visible social UI does not become future model memory.

## 43. Cost / dormancy

If no current SOCIAL_FEED source job exists:

```text
actor identity work = 0
reachability evaluation = 0
social history scan = 0
social persistence read/write = 0
```

When SOCIAL_FEED is active, SF-1 cost is bounded by the current actor table and current trusted reachability context only.

No prior social projections are scanned.

## 44. Candidate C status after SF-1

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

Therefore:

```text
CANDIDATE_C = CLOSED / CONDITIONALLY READY
```

## 45. Explicit C2 activation examples

Candidate C C2 must be opened before supporting:

```text
"이 @alice 계정은 다음 턴에도 같은 계정이야"
"@alice가 닉네임을 바꿨지만 같은 계정이야"
"이 계정의 팔로워 수가 다음 턴에도 이어져"
"예전 @alice 게시물을 계정 기록에서 찾아"
```

These requirements need real durable identity semantics.

## 46. SF-2 handoff

SF-2 Feed Graph Semantics receives these frozen assumptions:

```text
actor structural key = actorOrdinal
actor record = displayName + handle
handle unique only within current snapshot
no canonical subject binding
reachability = projection-level PUBLIC_FEED_ONLY
private/follower ACL = unsupported
Candidate C = closed
```

SF-2 may now safely design:

```text
POST
REPLY
REPOST
QUOTE
itemOrdinal
targetItemOrdinal
ordering
cycle prevention
dependency closure
```

without reopening account identity.

## 47. SF-3 handoff

SF-3 must later prove or specify:

```text
how actor-label semantic safety is evaluated
how item assertion policy contexts join
how reachability results join validated sidecar construction
how quarantined-only actors are omitted
```

SF-1 does not fake a machine proof for natural-language identity semantics.

## 48. SF-4 handoff

Presentation may consume only accepted actor labels.

It may:

```text
show displayName
show handle
add presentation-only @ affordance
style actor row
```

It may not:

```text
invent avatar
invent verified badge
invent follower count
infer canonical character identity
join actors by handle
```

## 49. Design evaluator matrix

The future evaluator should include at least:

```text
A. duplicate displayName + distinct handles
→ structurally valid

B. duplicate handle + distinct actorOrdinal
→ invalid

C. duplicate actorOrdinal
→ invalid

D. item references unknown actorOrdinal
→ invalid under SF-2/SF-3

E. same handle appears in later snapshot
→ no continuity inference

F. reachability PUBLIC + exposure ALLOW
→ may continue

G. reachability PUBLIC + exposure DENY
→ denied

H. reachability UNKNOWN
→ projection held

I. reachability RESTRICTED
→ unsupported scope

J. actor appears only in quarantined items
→ omitted from ordinary validated actor list

K. displayName resembles known canonical character
→ no canonical binding created

L. model emits verified/follower/avatar field
→ unsupported actor field
```

## 50. Frozen SF-1 decisions

```text
SF1_STATUS                         = DESIGN FROZEN
SOCIAL_FEED_SCOPE                  = PUBLIC SOCIAL FEED SNAPSHOT
ACTOR_SCHEMA                       = SocialActorDraftV1
ACTOR_STRUCTURAL_KEY               = actorOrdinal
DISPLAY_NAME                       = REQUIRED / DUPLICATES ALLOWED
HANDLE                             = REQUIRED / SNAPSHOT-LOCAL UNIQUE
HANDLE_AS_JOIN_KEY                 = FORBIDDEN
CROSS_TURN_HANDLE_CONTINUITY       = NONE
CANONICAL_SUBJECT_BINDING          = NONE
PROFILE_DIRECTORY                  = NONE
PROFILE_METADATA                   = EXCLUDED
REACHABILITY_CONTEXT               = SocialFeedReachabilityContextV1
REACHABILITY_CLASSES               = PUBLIC_FEED / UNKNOWN / RESTRICTED
V1_SUPPORTED_REACHABILITY          = PUBLIC_FEED_ONLY
REACHABILITY_GRANULARITY           = PROJECTION LEVEL
FOLLOWER / PRIVATE ACL             = UNSUPPORTED
EXPOSURE OWNER                     = EXISTING 3M-2
TRUTH OWNER                        = NOT SOCIAL_FEED
PERSISTENCE                        = NONE
CONTEXT RE-ENTRY                   = NONE
CANDIDATE C                        = NOT ACTIVATED
RUNTIME IMPLEMENTATION             = NOT AUTHORIZED
PRODUCTION                         = UNCHANGED
release-simcore                    = UNCHANGED
```

## 51. Closure

SF-1 closes the most dangerous early ambiguity in SOCIAL_FEED:

```text
profile-like UX
without persistent account semantics
```

The final architecture boundary is:

```text
CURRENT SOURCE AUTHORITY
        ↓
trusted SocialFeedReachabilityContextV1
        ↓
PUBLIC_FEED gate
        ↓
snapshot-local SocialActorDraftV1 table
(actorOrdinal owns joins)
        ↓
SF-2 feed graph
        ↓
SF-3 assertion/exposure validation
        ↓
validated SOCIAL_FEED
```

Canonical rules:

```text
PROFILE-LIKE APPEARANCE
!=
DURABLE ACCOUNT
```

```text
HANDLE RECURRENCE
!=
IDENTITY CONTINUITY
```

```text
PUBLIC REACHABILITY
!=
EXPOSURE AUTHORITY
!=
TRUTH
```

Next design checkpoint:

```text
SF-2 · Feed Graph Semantics
```
