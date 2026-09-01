# SimCore Post-3.0M SOCIAL_FEED SF-6 Family Convergence Design — 2026-09-02

Date: 2026-09-02 KST

Status: **SF-6 DESIGN FROZEN · SOCIAL_FEED V1 DESIGN CONVERGED · SNAPSHOT-ONLY · PUBLIC_FEED_ONLY · READ-ONLY · CANDIDATE C NOT REQUIRED BY SOCIAL_FEED V1 · LEGACY COMMUNITY COUNT / RT CONTRACT PRESERVED · IMPLEMENTATION NOT AUTHORIZED · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-6 · FAMILY CONVERGENCE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

SF-6 closes the first SOCIAL_FEED design workstream by converging SF-0 through SF-5 into one acceptance contract.

It does not add a new feature.

It answers:

```text
Is SOCIAL_FEED V1 semantically complete as a current public-feed snapshot?
Do identity, graph, validation, presentation, metrics/media, lifetime, and failure rules agree?
Does SOCIAL_FEED V1 require Candidate C durability?
What is explicitly deferred?
What future evidence would be required before runtime claims are legal?
Does this family change existing Community block counts or Reaction RT numbering?
```

This checkpoint is design-only.

## 1. Final V1 identity

Frozen product identity:

```text
runtime mode = C
source family = SOCIAL_FEED
first adapter = SOCIAL_TIMELINE_V1
reachability = PUBLIC_FEED
lifetime = CURRENT_PROJECTION_ONLY
interaction = VIEW_LOCAL_ONLY
```

Canonical rule:

```text
SOCIAL_FEED
!= new runtime mode
!= persistent social network database
!= real-platform protocol emulator
```

## 2. Final V1 semantic surface

The first converged semantic surface is deliberately small.

Actors:

```text
SocialActorDraftV1
  actorOrdinal
  displayName
  handle
```

Feed graph:

```text
POST
REPLY
REPOST
QUOTE
```

Assertions:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

Reachability:

```text
PUBLIC_FEED
```

No additional SOCIAL_FEED semantic primitive is required for V1 convergence.

## 3. Identity contract

SOCIAL_FEED V1 preserves four distinct identity/order planes.

```text
actorOrdinal
= current-snapshot actor structural identity

itemOrdinal
= current-snapshot feed-item structural identity

timelineOrdinal
= current-snapshot semantic feed ordering label

presentationIndex / renderInstanceKey
= view-local presentation identity
```

None becomes a durable account/post/world identity.

Canonical rules:

```text
SAME HANDLE ACROSS TURNS
!= SAME ACCOUNT

SAME DISPLAY NAME
!= SAME ACTOR

SAME PRESENTATION GLYPH
!= SAME ACTOR
```

## 4. Actor visibility contract

An actor may ordinary-render only when referenced by surviving accepted feed items.

```text
VISIBLE ACTORS
=
ACTORS REFERENCED BY ACCEPTED ITEMS
```

Actors that exist only behind DENY/HOLD/quarantine do not remain as profile-directory residue.

This keeps actor metadata from leaking hidden source participation.

## 5. Reachability contract

SOCIAL_FEED V1 supports only:

```text
PUBLIC_FEED
```

Conceptual outcomes:

```text
PUBLIC_FEED → REACHABLE_PUBLIC
UNKNOWN     → HOLD_UNPROVEN_PUBLIC_REACHABILITY
RESTRICTED  → UNSUPPORTED_RESTRICTED_SCOPE
```

No follower graph, membership graph, viewer identity, block relation, private-account state, or custom audience exists in V1.

Canonical rule:

```text
PUBLIC_FEED REACHABILITY
!= ASSERTION EXPOSURE ELIGIBILITY
!= CANONICAL TRUTH
```

## 6. Feed graph contract

Final first graph rules:

```text
POST
  target = none
  own semantic content = yes

REPLY
  target = one accepted content-bearing item
  own semantic content = yes

REPOST
  target = one accepted content-bearing item
  own semantic content = no

QUOTE
  target = one accepted content-bearing item
  own semantic content = yes
```

The target graph:

```text
resolves inside the same current snapshot
contains no missing targets
contains no self-cycle
contains no multi-node cycle
contains no REPOST → REPOST edge
```

`itemOrdinal` is graph identity. `timelineOrdinal` is not graph authority.

## 7. Relationship truth contract

Canonical rules:

```text
REPOST
!= ENDORSEMENT
!= AGREEMENT
!= TRUTH CONFIRMATION
!= CONSENSUS

QUOTE COMMENTARY AUTHORITY
!= TARGET ASSERTION AUTHORITY

REPLY ASSERTION AUTHORITY
!= TARGET ASSERTION AUTHORITY
```

Repeated social propagation never upgrades canonical truth merely because many items point at the same claim.

## 8. Validation contract

SOCIAL_FEED V1 is validator-first.

Conceptual trusted/untrusted split:

```text
untrusted social semantic draft
+
trusted current source-authority context
+
trusted PUBLIC_FEED reachability context
+
trusted assertion / actor-label policy contexts
        ↓
validator
```

Final conceptual validation order:

```text
1. schema
2. current source-authority exact join
3. PUBLIC_FEED reachability
4. actor structural integrity
5. actor-label semantic compliance
6. graph integrity
7. assertion / content-coverage policy
8. item atomic disposition
9. recursive target dependency closure
10. surviving actor projection
11. validated sidecar
12. bounded privacy-safe receipt
```

## 9. Item atomicity contract

For content-bearing items:

```text
one claim DENY/HOLD
or
content coverage unproven/conflicting
or
actor-label policy failure
```

must not be repaired by silently deleting/rephrasing only the unsafe fragment.

First rule:

```text
unsafe content-bearing item
→ whole item quarantine
```

The validator does not become an editor.

## 10. Dependency closure contract

A dependent item survives only if its required target survives.

```text
own semantic policy = ALLOW
AND
target = ELIGIBLE
→ dependent may remain ELIGIBLE
```

If an accepted target chain breaks, descendant ordinary visibility closes transitively.

The receipt records bounded relationship failure metadata only and does not copy hidden target content.

## 11. Validated-sidecar contract

Ordinary presentation consumes only accepted SOCIAL_FEED semantics.

The validated sidecar must not contain quarantined post text, quarantined actor labels, hidden target bodies, or policy-only private content.

Validation receipts and ordinary source semantics remain separate authority planes.

Canonical rule:

```text
VALIDATION RECEIPT
!= ORDINARY SOCIAL CONTENT
```

## 12. Presentation contract

Frozen first adapter:

```text
SOCIAL_TIMELINE_V1
```

Presentation pipeline:

```text
ValidatedSocialFeedSemanticSidecarV1
→ SourcePresentationPolicyV1
→ SOCIAL_TIMELINE_V1
→ SocialTimelinePresentationModelV1
→ Source Presentation Host
→ source-scoped DOM/CSS
```

Presentation may reformat accepted data but may not reauthor source semantics.

## 13. Feed display grammar

First ordinary grammar:

```text
POST
→ actor row + own content

REPLY
→ relation row + actor row + own content + optional one-hop target preview

REPOST
→ relation row + one-hop target preview + no own content

QUOTE
→ actor row + own commentary + one-hop target preview
```

Target preview:

```text
depth = one presentation hop
source = same validated sidecar only
```

No historical/fuzzy lookup is allowed to repair a missing preview target.

## 14. Presentation-local identity contract

Filtering may leave sparse semantic ordinals.

Example:

```text
validated timelineOrdinal = 0, 2, 5
presentationIndex         = 0, 1, 2
```

The adapter may compute dense `presentationIndex` for view iteration.

It may not renumber semantic `actorOrdinal`, `itemOrdinal`, or `timelineOrdinal`.

## 15. CSS / DOM ownership contract

SOCIAL_FEED presentation remains scoped beneath:

```text
[data-simcore-source-family="social-feed"]
```

First family namespace remains:

```text
sc-social
sc-social__feed
sc-social__item
sc-social__actor
sc-social__display-name
sc-social__handle
sc-social__relation
sc-social__content
sc-social__target
sc-social__target-actor
sc-social__target-content
sc-social__empty
```

SF-5 additionally permits the future presentation-only helper:

```text
sc-social__actor-glyph
```

Global generic selector ownership remains forbidden.

## 16. First realism boundary

Ordinary V1 UI may show only supported source/presentation data.

Allowed design surface:

```text
displayName
handle
POST / REPLY / REPOST / QUOTE relation semantics
accepted plain-text content
optional INITIAL_TILE_V1 on top-level actor rows
```

Explicitly excluded source-state realism:

```text
likeCount
reactionCount
repostCount
quoteCount
replyCount
viewCount
impressionCount
bookmarkCount
followerCount
followingCount
engagementScore
trendRank
viralityScore
verified / official / staff / moderator / premium badge
```

Canonical rule:

```text
REALISTIC LOOK
MUST NOT CREATE UNSUPPORTED SOCIAL FACTS
```

## 17. Projection cardinality is not platform state

Current graph/read model may know bounded values such as:

```text
visibleItemCount
previewCount
actorCount after validation
```

Those values may support internal diagnostics.

They are not ordinary source metrics.

Canonical rule:

```text
VISIBLE EDGE / ITEM COUNT IN CURRENT SNAPSHOT
!=
TOTAL SOCIAL PLATFORM METRIC
```

## 18. G0 presentation glyph convergence

SF-5 selected:

```text
INITIAL_TILE_V1
```

It is a local synchronous presentation-only glyph derived solely from already accepted `displayName` information.

It is:

```text
non-semantic
non-networked
non-model-generated
non-persistent
fail-soft
```

It is not:

```text
profile photo
canonical appearance
account identity
durable avatar asset
```

Target previews remain text-only in the first V1 contract.

## 19. Media convergence

Media remains split outside the V1 semantic core.

```text
G0 local presentation glyph
→ INITIAL_TILE_V1 allowed as design

M0 optional external presentation materialization
→ deferred to Interaction / Materialization effect design

M1 semantic source media
→ requires a new semantic / exposure / validation contract

M2 durable or delayed exact-object media
→ Candidate C C8 pressure
```

No external image fetch, image generation, avatar generation, post image/video, or semantic screenshot is part of converged SOCIAL_FEED V1.

## 20. Interaction convergence

Frozen default:

```text
interactionPolicy = VIEW_LOCAL_ONLY
```

Presentation-local interaction may include bounded open/close/focus/scroll state.

Not part of SOCIAL_FEED V1 semantic design:

```text
CREATE_POST
REPLY mutation
REPOST mutation
QUOTE mutation
REACT
FOLLOW
EDIT
DELETE
REROLL
```

Those belong to the separate Interaction / Materialization workstream and require their own durable-target reassessment.

## 21. Lifetime / history convergence

SOCIAL_FEED V1 remains:

```text
CURRENT_PROJECTION_ONLY
NO STRUCTURED SOURCE HISTORY
NO AUTOMATIC CONTEXT RE-ENTRY
NO HIDDEN RETRIEVAL
NO CROSS-TURN ACCOUNT MEMORY
NO CROSS-TURN POST MEMORY
```

A feed card remaining visible in UI does not make its content future model context.

## 22. Support invalidation convergence

SOCIAL_FEED inherits 3M-6 current-projection support invalidation.

If the current trusted source authority no longer matches:

```text
whole SOCIAL_FEED current projection
→ stale / invalid
```

V1 does not perform item-level salvage across an authority replacement.

This is distinct from assertion quarantine and presentation failure.

## 23. Failure-domain convergence

Final first-family failure classes stay separate:

```text
SOURCE SUPPORT INVALIDATION
REACHABILITY HOLD / UNSUPPORTED
ACTOR / GRAPH STRUCTURAL INVALIDITY
ASSERTION / CONTENT POLICY QUARANTINE
TARGET DEPENDENCY QUARANTINE
PRESENTATION ADAPTER FAILURE
PRESENTATION MOUNT FAILURE
G0 DECORATIVE GLYPH FAILURE
```

No failure class silently upgrades another.

Example:

```text
INITIAL_TILE_V1 failure
→ text-only presentation degradation
→ semantic sidecar unchanged
```

## 24. Legacy Community numeric compatibility

SOCIAL_FEED convergence does not replace or suppress existing legacy Community numeric contracts.

Existing Community count owner remains:

```text
expectedCommunityBlocks(mode)

A          → 0
B_START    → 1
B_CONTINUE → 1
B_END      → 2
C          → 1
```

Existing Reaction owner remains responsible for:

```text
[RT N] parsing / validation / normalization / numbering
```

Canonical distinction:

```text
LEGACY COMMUNITY BLOCK COUNT
AND LEGACY REACTION RT NUMBERING
!=
SOCIAL_FEED SOURCE-STATE METRICS
```

Therefore SF-5/SF-6 metric exclusions do not turn off the old Community/Reaction numeric behavior.

SOCIAL_FEED also does not duplicate those legacy counters as new social semantic state.

## 25. Candidate C final local reassessment

SOCIAL_FEED V1 itself activates none of the durable-derived-object triggers.

```text
C1 cross-turn derived survival       = NO
C2 stable derived identity           = NO
C3 item mutation                     = NO
C4 append / merge / revision         = NO
C5 derived-to-derived propagation    = NO
C6 future context re-entry           = NO
C7 partial descendant survival       = NO
C8 delayed exact-object side effect  = NO
```

Final local verdict:

```text
SOCIAL_FEED V1
DOES NOT REQUIRE CANDIDATE C
```

This verdict is local to snapshot-only SOCIAL_FEED V1.

It does not reverse Candidate C work in other follow-up lanes. A separate concrete consumer may activate Candidate C without changing this historical convergence result.

## 26. Candidate C reopen triggers

SOCIAL_FEED must reopen durable-derived-object design before any of:

```text
same account across turns
same post across turns
later reply/repost/quote to an old post
edit/delete/reroll one old item
append/merge a previous feed snapshot
partial descendant survival after parent mutation
SOCIAL_FEED ↔ BOARD/NEWS derived-object propagation
old SOCIAL_FEED content re-enters future model context
late media reattaches to exact old item
```

Do not reuse snapshot ordinals as a shortcut for these capabilities.

## 27. Explicit deferred feature set

The following are intentionally not required for SOCIAL_FEED V1 design completion:

```text
private/follower-only reachability
follower/following graph
persistent accounts
persistent posts
source metrics
credential/account-status state
real avatars
external/generative media
semantic post media
interactive source mutation
cross-family derived propagation
automatic multi-family fanout
historical social search
future model-context source memory
real-platform branding/protocol emulation
```

Each may become a later design lane if a concrete consumer is selected.

## 28. Dormancy / cost convergence

No active SOCIAL_FEED source job means:

```text
social source prompt burden = 0
social history scan = 0
social validation = 0
social presentation build = 0
social metric work = 0
social media work = 0
social persistent read/write = 0
social network/model/image call = 0
```

An active V1 projection must scale only with the bounded current snapshot, not previous social projections.

## 29. Design completion vs runtime readiness

Final status distinction:

```text
SOCIAL_FEED V1 DESIGN
= CONVERGED

SOCIAL_FEED V1 RUNTIME
= NOT IMPLEMENTED
= NOT AUTHORIZED
= NOT REAL-VALIDATED
```

SF-6 does not claim producer, transport, mount, runtime selector, caps, model compliance, or long-chat evidence exists.

## 30. Future runtime-readiness obligations

If implementation is explicitly authorized later, at minimum the implementation workstream must separately establish:

```text
current source-job selection authority
trusted SOCIAL_FEED source-authority binding
PUBLIC_FEED reachability producer/context
structured semantic producer/transport
validator implementation and bounded hard caps
Presentation Host mount authority
SOCIAL_TIMELINE_V1 safe DOM/CSS implementation
source-irrelevant dormancy instrumentation
stale-source invalidation behavior
legacy Community/Reaction compatibility regression evidence
real model-compliance evidence
long-chat / reroll / edit / replacement regression evidence
```

None is granted by this design document.

## 31. Future acceptance lanes

A later real-validation protocol should include at least:

```text
S0 ordinary non-source long chat remains dormant
S1 valid PUBLIC_FEED POST/REPLY/REPOST/QUOTE snapshot
S2 UNKNOWN/RESTRICTED reachability fails closed
S3 actor-only hidden leakage blocked
S4 actor-label semantic leakage blocked
S5 malformed graph rejected
S6 REPOST truth-upgrade attempt blocked
S7 item-atomic DENY/HOLD quarantine
S8 transitive target dependency quarantine
S9 sparse semantic ordinals preserved after filtering
S10 SOCIAL_TIMELINE_V1 validated-only presentation
S11 one-hop same-sidecar target preview
S12 INITIAL_TILE_V1 no-new-information / fail-soft behavior
S13 unsupported metrics/badges/media absent
S14 source authority invalidation stales whole current projection
S15 legacy expected Community counts unchanged
S16 legacy [RT N] behavior unchanged
S17 repeated source/non-source alternation shows no accumulation
```

These are future evidence obligations, not results claimed now.

## 32. SF-6 final decision

```text
SOCIAL_FEED_V1_DESIGN                     = CONVERGED
SOCIAL_FEED_V1_FIRST_SCOPE                = PUBLIC_FEED_SNAPSHOT
SOCIAL_FEED_V1_LIFETIME                   = CURRENT_PROJECTION_ONLY
SOCIAL_FEED_V1_INTERACTION                = VIEW_LOCAL_ONLY
SOCIAL_FEED_V1_AGGREGATE_METRICS          = EXCLUDED
SOCIAL_FEED_V1_CREDENTIAL_STATE           = EXCLUDED
SOCIAL_FEED_V1_EXTERNAL_MEDIA             = DEFERRED
SOCIAL_FEED_V1_SEMANTIC_MEDIA             = DEFERRED
INITIAL_TILE_V1                           = PRESENTATION_ONLY_DESIGN_ALLOWED
SOCIAL_FEED_V1_CANDIDATE_C_REQUIRED       = NO
LEGACY_COMMUNITY_COUNT_CONTRACT           = PRESERVED
LEGACY_REACTION_RT_NUMBERING              = PRESERVED
RUNTIME_IMPLEMENTATION                    = NOT AUTHORIZED
REAL_VALIDATION                           = NOT RUN
PRODUCTION                                = UNCHANGED
release-simcore                           = UNCHANGED
```

## 33. Workstream closure

```text
SF-0 Master Design                  ✅
SF-1 Actor Identity + Reachability  ✅
SF-2 Feed Graph Semantics           ✅
SF-3 Assertion + Validation         ✅
SF-4 Presentation Grammar           ✅
SF-5 Metrics / Media Boundary       ✅
SF-6 Family Convergence             ✅

SOCIAL_FEED V1 DESIGN WORKSTREAM
= CONVERGED

NEXT SOCIAL_FEED CHECKPOINT
= NONE AUTOMATICALLY
```

A new SOCIAL_FEED checkpoint should open only when a concrete deferred capability is deliberately selected.
