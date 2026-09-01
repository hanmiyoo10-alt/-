# SimCore Post-3.0M SOCIAL_FEED Metrics Reservation Amendment — 2026-09-02

Date: 2026-09-02 KST

Status: **DESIGN AMENDMENT FROZEN · SOCIAL METRIC CAPABILITY RESERVED · V1 ORDINARY METRICS STILL INACTIVE · FUTURE AUTHORIZED SOURCE-SIMULATION METRICS ALLOWED BY DESIGN · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-5 / SF-6 AMENDMENT · METRICS RESERVATION · DESIGN-ONLY**

## 0. Purpose

This amendment narrows and supersedes one overly broad reading of the SF-5 / SF-6 metric exclusion language.

The original design correctly prohibited the Presentation Renderer from fabricating unsupported social metrics for realism.

However, that prohibition must not be interpreted as deleting social metrics from the long-term SOCIAL_FEED product surface.

Canonical correction:

```text
SOCIAL METRICS IN V1 ORDINARY UI
= INACTIVE

SOCIAL METRIC CAPABILITY
= RESERVED

INACTIVE NOW
!=
FORBIDDEN FOREVER
```

The intended product may later represent platform-like source-local values such as:

```text
좋아요 1.2K
조회수 35K
리포스트 821
댓글 143
팔로워 92K
트렌드 3위
```

when an explicit semantic producer / authority contract exists.

This amendment is design-only. It does not implement metric generation, counters, persistence, mutation, prompt changes, UI, or release behavior.

## 1. Authority chain

This amendment consumes without reopening the rest of SOCIAL_FEED V1:

```text
SF-0 Master Design
SF-1 Actor Identity + Reachability
SF-2 Feed Graph Semantics
SF-3 Assertion + Validation
SF-4 Presentation Grammar
SF-5 Metrics / Media Boundary
SF-6 Family Convergence
3M Source Intelligence authority / validation / presentation split
Candidate C conditional durability architecture
```

Only the long-term interpretation of metric exclusion is amended.

## 2. Frozen correction

Previous SF-5 language such as:

```text
NO METRIC AUTHORITY
→ NO SOCIAL METRIC FIELD
→ NO SOCIAL METRIC UI
```

remains valid for the current V1 ordinary presentation.

It is now explicitly scoped as:

```text
NO CURRENT METRIC AUTHORITY
→ NO CURRENT ACTIVE METRIC FIELD
→ NO CURRENT ORDINARY METRIC UI
```

It does not mean:

```text
SOCIAL_FEED CAN NEVER HAVE METRICS
```

The long-term capability is reserved.

## 3. Reserved metric families

The following semantic metric families are reserved as legal future SOCIAL_FEED extension surfaces.

### 3.1 Item engagement / distribution

```text
likeCount
reactionCount
repostCount
quoteCount
replyCount
viewCount
impressionCount
bookmarkCount
```

### 3.2 Actor / audience state

```text
followerCount
followingCount
```

### 3.3 Discovery / ranking state

```text
trendRank
engagementScore
viralityScore
```

Reservation means:

```text
schema names / concepts may be designed later
presentation slots may be planned later
metric generation may be authorized later
```

It does not mean these fields exist in the current validated sidecar.

## 4. First priority reserved set

The first practical realism set is frozen as the preferred future subset:

```text
LIKE_COUNT
VIEW_COUNT
REPOST_COUNT
REPLY_COUNT
FOLLOWER_COUNT
TREND_RANK
```

These correspond to common source presentation such as:

```text
1.2K likes
35K views
821 reposts
143 replies
92K followers
#3 trending
```

This is a capability reservation, not runtime activation.

## 5. Metric values remain semantic data

The reason SF-5 originally rejected random renderer-created metrics still stands.

Canonical rule:

```text
METRIC VALUE
= SOURCE-LOCAL SEMANTIC DATA

PRESENTATION FORMAT
= PRESENTATION DATA
```

Therefore the future renderer may transform an authorized value:

```text
1200 → 1.2K
35000 → 35K
```

but it may not invent `1200` or `35000` merely because a social card looks empty.

Compact notation, separators, icons, and placement are presentation concerns only after the semantic value exists.

## 6. Two future authority classes are reserved

A future metric design may support at least two distinct authority classes. They must not be collapsed.

### A. OBSERVED_SOURCE_METRIC

The value is supported by a trusted source / state owner.

This class requires explicit source authority, observation-time semantics, invalidation, and staleness rules.

### B. SIMULATED_SOURCE_METRIC

The value is intentionally generated as part of the fictional/current source projection for social realism.

Canonical meaning:

```text
SIMULATED_SOURCE_METRIC
= source-local simulation state for this projection

!= canonical world fact
!= truth confidence
!= evidence that a claim is true
!= persistent account history unless separately authorized
```

This class is important because SOCIAL_FEED is itself a simulated source surface, and future product design may intentionally generate bounded engagement/audience/ranking values for that surface.

The main model or another future semantic producer may propose such values only after a dedicated metric contract is authorized.

The Presentation Renderer may never invent them on its own.

## 7. Simulation metric safety boundary

If `SIMULATED_SOURCE_METRIC` is later activated, the validator must at minimum enforce:

```text
metric kind is supported
value type/range is bounded
scope is explicit: item / actor / feed
metric cannot upgrade assertion truth
metric cannot establish canonical identity
metric cannot bypass exposure policy
metric cannot imply persistence unless durability is authorized
metric relationship is internally coherent where required
```

Examples:

```text
1.2K likes
!= claim verified

92K followers
!= actor is canonical celebrity

trend rank #3
!= event is canonically important

821 reposts
!= 821 independent truth confirmations
```

## 8. Projection-local metrics do not require persistence by default

A future simulated metric can remain bounded to one SOCIAL_FEED snapshot.

Example:

```text
current projection:
  POST 2
  likeCount = 1200
```

This alone does not require Candidate C.

Canonical rule:

```text
CURRENT-PROJECTION SIMULATED METRIC
!= DURABLE COUNTER
```

Candidate C pressure begins when a consumer requires continuity such as:

```text
same post's likeCount increases next turn
followerCount survives reroll/reload
trendRank changes over time while preserving feed identity
user LIKE mutates the exact old post
```

Then C1/C2/C3/C4 and/or interaction-state contracts may activate.

## 9. Metric evolution is a separate future design question

The following behavior is explicitly preserved as a future possibility:

```text
source appears
→ engagement values exist
→ later source activity may increase / change them
```

But the evolution law is not frozen here.

Future design must decide whether values are:

```text
snapshot-generated
stateful counters
time-driven simulation
interaction-driven
source-event-driven
or combinations of the above
```

Do not silently implement one evolution model before authority/lifetime is selected.

## 10. Legacy Community / Reaction numbers remain separate

This amendment does not reinterpret existing Community / Reaction numbering.

Existing ownership remains:

```text
expected Community block count
A          → 0
B_START    → 1
B_CONTINUE → 1
B_END      → 2
C          → 1

Reaction [RT N]
→ existing Reaction owner
```

Canonical separation:

```text
LEGACY COMMUNITY BLOCK COUNT / RT NUMBERING
!=
SOCIAL_FEED SOURCE-STATE METRICS
```

Both capabilities may coexist.

## 11. Ordinary V1 presentation remains unchanged

Until a future metric producer / validator contract is explicitly selected:

```text
SOCIAL_TIMELINE_V1 ordinary active metrics = NONE
```

The current UI remains allowed to show:

```text
displayName
handle
POST / REPLY / REPOST / QUOTE
INITIAL_TILE_V1
validated content / target previews
```

and must not yet show unsupported engagement/audience/ranking values.

This keeps current V1 internally sound while preserving future product richness.

## 12. Future presentation reservation

Future adapters may reserve non-authoritative layout slots conceptually for:

```text
engagement row
view indicator
actor audience summary
trend/rank marker
```

But an empty reserved slot must not render a fake value.

Canonical rule:

```text
METRIC SLOT MAY EXIST IN FUTURE LAYOUT DESIGN
METRIC VALUE REQUIRES SEMANTIC AUTHORITY
```

## 13. SF-5 / SF-6 convergence interpretation after amendment

SOCIAL_FEED V1 remains design-converged.

This amendment does not reopen SF-0..SF-6 as incomplete.

Updated interpretation:

```text
SOCIAL_FEED V1 DESIGN
= CONVERGED

active source-state metrics
= NONE

reserved metric capability
= YES

future simulated metric design
= LEGAL FOLLOW-UP
```

The metric follow-up may be opened later without undoing the snapshot-only first family.

## 14. No implementation authority

This amendment does not authorize:

```text
metric fields in production schema
random count generation
model prompt changes
metric validator code
metric DOM/CSS
counter persistence
likes/reposts/follows mutation
trend simulation
background timers
network calls
release-simcore changes
```

Production remains untouched.

## 15. Final frozen rules

```text
INACTIVE NOW != REMOVED FROM PRODUCT DESIGN

METRIC VALUE = SEMANTIC DATA
METRIC FORMATTING = PRESENTATION DATA

RENDERER MAY FORMAT
RENDERER MAY NOT INVENT

OBSERVED_SOURCE_METRIC
!= SIMULATED_SOURCE_METRIC

SIMULATED_SOURCE_METRIC
!= WORLD FACT
!= TRUTH CONFIDENCE

CURRENT SNAPSHOT METRIC
!= DURABLE COUNTER

LEGACY COMMUNITY / RT NUMBERS
!= SOCIAL SOURCE METRICS

SOCIAL_FEED METRIC CAPABILITY
= RESERVED FOR FUTURE AUTHORIZED DESIGN
```
