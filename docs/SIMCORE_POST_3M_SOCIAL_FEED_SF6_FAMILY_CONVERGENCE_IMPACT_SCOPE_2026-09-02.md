# SimCore Post-3.0M SOCIAL_FEED SF-6 Family Convergence Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **SF-6 IMPACT SCOPE FROZEN · DESIGN-ONLY · SOCIAL_FEED V1 CONVERGENCE CANDIDATE · CANDIDATE C LOCAL ACTIVATION NOT REQUIRED · LEGACY COMMUNITY COUNT / REACTION NUMBERING UNCHANGED · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-6 · FAMILY CONVERGENCE · IMPACT SCOPE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

SF-6 is the final design checkpoint of the first SOCIAL_FEED V1 workstream.

It does not add a fifth item kind, metrics, persistence, interaction, media, private reachability, durable identity, source history, or runtime code.

Its job is to determine whether SF-0 through SF-5 form one internally consistent snapshot-only family and whether any concrete SOCIAL_FEED V1 requirement now forces Candidate C activation.

## 1. Authority chain

SF-6 consumes without reopening:

```text
SF-0 SOCIAL_FEED Master Design
SF-1 Actor Identity + Reachability
SF-2 Feed Graph Semantics
SF-3 Assertion + Validation
SF-4 Presentation Grammar
SF-5 Metrics / Media Boundary
3M-1 Legacy Community compatibility
3M-2 Exposure boundary
3M-3 Validator split
3M-4 Presentation Renderer architecture
3M-6 current-projection support invalidation
3M-7 zero automatic structured source re-entry
3M-9 source-irrelevant dormancy/current-projection cost
3M-10 major convergence / real-validation protocol
Candidate C durable-derived-object architecture when and only when a concrete trigger exists
Interaction / Materialization design as a separate follow-up workstream
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Selected convergence seam

The narrowest safe SF-6 seam is:

```text
SNAPSHOT_FAMILY_CONVERGENCE_WITH_LOCAL_CANDIDATE_C_NON_ACTIVATION
```

Meaning:

```text
SOCIAL_FEED V1
= one current public-feed snapshot
= bounded actors + bounded feed graph + validated assertions
= read-only presentation
= no durable source object requirement
```

No new persistence/provenance layer is justified merely to declare design completion.

## 3. Frozen first-family scope

SOCIAL_FEED V1 converges only if all of the following remain true:

```text
mode = C
family = SOCIAL_FEED
reachability = PUBLIC_FEED
lifetime = CURRENT_PROJECTION_ONLY
interaction = VIEW_LOCAL_ONLY
source mutation = NONE
structured history = NONE
automatic context re-entry = NONE
network/media materialization = NONE
aggregate source metrics = NONE
credential/account-status state = NONE
```

## 4. Semantic object set

The converged first-family semantic surface contains only the already-designed classes:

```text
snapshot-local actors
POST
REPLY
REPOST
QUOTE
assertion-bearing content for POST / REPLY / QUOTE
relationship-only REPOST
target edges inside one current snapshot
PUBLIC_FEED reachability
existing Exposure assertion modes
```

No new semantic object class is required for SF-6.

## 5. Identity convergence

The following identities stay separate:

```text
actorOrdinal
itemOrdinal
timelineOrdinal
presentationIndex
renderInstanceKey
```

Canonical rules remain:

```text
actorOrdinal / itemOrdinal
= current-snapshot structural identity only

timelineOrdinal
= semantic feed ordering label only

presentationIndex / renderInstanceKey
= presentation-only identity only
```

None is promoted to a cross-turn account or post ID.

## 6. Reachability / exposure convergence

SOCIAL_FEED V1 preserves the independent gates:

```text
source authority
PUBLIC_FEED reachability
assertion / actor-label semantic policy
relationship dependency closure
```

Canonical separation:

```text
PUBLICLY REACHABLE
!=
EXPOSED ENOUGH TO ASSERT
!=
CANONICAL TRUTH
```

A PUBLIC_FEED projection does not bypass Exposure.

## 7. Graph convergence

The first graph remains:

```text
POST    target = none
REPLY   target = one content-bearing accepted item
REPOST  target = one content-bearing accepted item, own content absent
QUOTE   target = one content-bearing accepted item, own content present
```

The target graph must remain acyclic and must resolve inside the same current snapshot.

No cross-snapshot or historical target is introduced.

## 8. Validation convergence

The first validator remains validator-first and fail-closed.

Conceptual order:

```text
schema
→ current source authority exact join
→ PUBLIC_FEED reachability
→ actor structural/label validation
→ graph validation
→ assertion/content coverage policy
→ item atomic disposition
→ recursive target dependency closure
→ surviving actor projection
→ validated semantic sidecar
```

Quarantined content does not enter ordinary presentation.

## 9. Presentation convergence

The first presentation remains:

```text
adapter = SOCIAL_TIMELINE_V1
placementIntent = SOURCE_LOCAL_ADJACENT
themePolicy = HOST_INHERIT
interactionPolicy = VIEW_LOCAL_ONLY
```

It consumes validated semantics only.

Target previews remain one presentation hop and same-validated-sidecar only.

Presentation failure never upgrades or repairs semantic state.

## 10. SF-5 realism boundary remains intact

SOCIAL_FEED V1 ordinary UI may include:

```text
displayName
handle
validated item relationship grammar
validated accepted content
optional INITIAL_TILE_V1 presentation glyph on top-level actor rows
```

It may not fabricate:

```text
like / reply / repost / quote / view counts
follower / following counts
engagement / trend / virality metrics
verified / official / staff / premium badges
real avatar / generated avatar
post image / video / screenshot evidence
publishedAt / timeAgo / bio / location / profile URL
```

`INITIAL_TILE_V1` remains presentation-only and does not create actor identity or profile-image authority.

## 11. Legacy Community numeric compatibility is explicitly unaffected

SF-5's exclusion of SOCIAL_FEED source-state metrics does **not** modify the existing legacy Community / Reaction numeric contracts.

Existing owners remain authoritative:

```text
expectedCommunityBlocks(mode)
A          = 0
B_START    = 1
B_CONTINUE = 1
B_END      = 2
C          = 1

Reaction owner
→ existing [RT N] numbering / normalization
```

Canonical distinction:

```text
LEGACY COMMUNITY BLOCK COUNT / RT NUMBERING
!=
SOCIAL_FEED SOURCE-STATE METRICS
```

Therefore a future SOCIAL_FEED design must not suppress, replace, or reinterpret existing Community/Reaction counters merely because source-specific presentation exists.

Likewise SOCIAL_FEED must not duplicate those legacy numbers as its own semantic state.

## 12. Candidate C local reassessment

SOCIAL_FEED V1 itself still requires none of the Candidate C triggers:

```text
C1 cross-turn derived survival       = no
C2 stable derived identity           = no
C3 item-level mutation               = no
C4 append / merge / revision         = no
C5 derived-to-derived lineage        = no
C6 future context re-entry           = no
C7 partial descendant survival       = no
C8 delayed exact-object side effect  = no
```

Therefore the SF-6 local decision is:

```text
SOCIAL_FEED_V1_CANDIDATE_C_REQUIRED = NO
```

This does not claim Candidate C architecture is absent globally. A separate interaction/materialization workstream may activate Candidate C for a concrete consumer. SOCIAL_FEED V1 simply does not consume those durable capabilities.

## 13. Explicit future triggers

SOCIAL_FEED must reopen Candidate C before supporting any of:

```text
same account persists across turns
same post remains addressable across turns
old post receives a later reply / repost / quote
one item is edited / deleted / rerolled
old and new feed snapshots are merged
SOCIAL_FEED derives from or feeds another derived family object
old social content re-enters future model context
late media attaches to an exact old social item
```

## 14. Deferred non-Candidate-C features

Some future features need additional authority but do not automatically require durable derived objects.

Examples:

```text
source metrics with a trusted current-snapshot producer
credential state with explicit source authority
additional presentation adapters
restricted/private reachability with a trusted current viewer/relationship context
semantic media fully contained in one current projection
```

Each requires its own impact scope. None is reopened by SF-6.

## 15. Source-irrelevant baseline

SF-6 preserves 3M-9:

```text
no current SOCIAL_FEED source job
→ no social prompt burden
→ no social history scan
→ no social validation
→ no social presentation build
→ no social metrics/media work
→ no social persistence/network/model calls
```

Family design completion must not turn SOCIAL_FEED into an always-on subsystem.

## 16. Design-complete is not runtime-ready

SF-6 may declare the SOCIAL_FEED V1 **design family** converged.

It may not claim:

```text
producer exists
structured transport exists
source-job selector is implemented
host mount is proven
family hard caps are implemented
real model compliance passed
real long-chat performance passed
runtime shipped
```

Canonical rule:

```text
SOCIAL_FEED V1 DESIGN CONVERGED
!=
SOCIAL_FEED V1 RUNTIME READY
```

## 17. Future runtime validation obligations

If implementation is later authorized, evidence must at least prove:

```text
source-irrelevant ordinary chat remains dormant
PUBLIC_FEED reachability fails closed
actor labels cannot leak quarantined data
POST / REPLY / REPOST / QUOTE graph invariants hold
REPOST never upgrades truth
item atomic quarantine works
transitive target dependency quarantine works
semantic ordinals survive filtering
SOCIAL_TIMELINE_V1 receives validated data only
INITIAL_TILE_V1 adds no lexical or identity authority
unsupported metrics / badges / media do not appear
legacy Community expected-count and Reaction RT behavior remains unchanged
source invalidation unmounts/stales presentation without mutating truth
```

Actual execution evidence belongs to a future implementation/validation workstream.

## 18. Selected SF-6 impact decision

```text
SOCIAL_FEED_V1_DESIGN_CONVERGENCE_CANDIDATE       = YES
NEW_SEMANTIC_FEATURE_REQUIRED                     = NO
NEW_SOURCE_STATE_METRICS_REQUIRED                 = NO
NEW_MEDIA_AUTHORITY_REQUIRED                      = NO
LOCAL_CANDIDATE_C_ACTIVATION_REQUIRED             = NO
LEGACY_COMMUNITY_COUNT_CONTRACT                   = UNCHANGED
LEGACY_REACTION_RT_NUMBERING                      = UNCHANGED
RUNTIME_IMPLEMENTATION                            = NOT AUTHORIZED
PRODUCTION                                        = UNCHANGED
release-simcore                                   = UNCHANGED
```
