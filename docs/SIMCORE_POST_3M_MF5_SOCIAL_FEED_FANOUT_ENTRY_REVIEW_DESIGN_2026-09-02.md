# SimCore Post-3.0M MF-5 SOCIAL_FEED Fanout Entry Review Design — 2026-09-02

Date: 2026-09-02 KST

Status: **MF-5 DESIGN FROZEN · SOCIAL_FEED V1 PROMOTED TO FANOUT ELIGIBLE FOR CURRENT_ROOT_SIBLING_SNAPSHOT · PUBLIC_FEED / CURRENT_PROJECTION_ONLY / READ_ONLY / VIEW_LOCAL_ONLY · CANONICAL STACK ORDER AMENDED · CANDIDATE C NOT ACTIVATED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-5 · SOCIAL_FEED · FANOUT ENTRY · REGISTRY AMENDMENT · DESIGN**

## 0. Purpose

MF-1 froze `SOCIAL_FEED` as `ENTRY_REVIEW_REQUIRED` until a dedicated compatibility review proved all fanout-entry obligations.

The MF-5 impact scope evaluated the converged SOCIAL_FEED V1 design against MF-1 F1..F12 and found the exact snapshot-only public-feed profile promotable.

MF-5 now freezes the actual design amendment.

It answers:

```text
Which exact SOCIAL_FEED profile becomes fanout-eligible?
How does MF-1 registry state change?
What current authority view may the SOCIAL_FEED lane receive?
How does MF-3 budget admission treat the new lane?
Where does SOCIAL_FEED appear in MF-4 stack order?
Which SOCIAL_FEED failures remain family-local?
Which scopes remain unsupported?
Does this entry activate Candidate C?
```

This checkpoint is design-only.

It does not implement registry code, source-job selection, semantic generation, structured transport, validators, model calls, numeric caps, Presentation Host mounts, DOM/CSS, persistence, history, source mutation, network/media effects, release publication, or `release-simcore` changes.

## 1. Authority chain

MF-5 consumes without reopening:

```text
MF-0 Multi-Family Orchestration Master Design
MF-1 Fanout Plan + Family Entry Registry
MF-2 Shared Current Authority Bundle + Family-Lane Isolation
MF-3 Aggregate Budget + Failure Matrix
MF-4 Presentation Stack + Ordering / Mount Isolation
MF-5 SOCIAL_FEED Fanout Entry Impact Scope

SF-0 SOCIAL_FEED Master Design
SF-1 Actor Identity + Reachability
SF-2 Feed Graph Semantics
SF-3 Assertion + Validation
SF-4 Presentation Grammar
SF-5 Metrics / Media Boundary
SF-6 Family Convergence
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Exact promoted profile

MF-5 does not promote every conceivable SOCIAL_FEED behavior.

The exact certified fanout profile is:

```text
SocialFeedFanoutScopeProfileV1
  family = SOCIAL_FEED
  scopeProfile = CURRENT_ROOT_SIBLING_SNAPSHOT
  runtimeMode = C
  reachability = PUBLIC_FEED
  lifetime = CURRENT_PROJECTION_ONLY
  semanticInteraction = READ_ONLY
  presentationInteraction = VIEW_LOCAL_ONLY
  adapterKey = SOCIAL_TIMELINE_V1
  sourceMetrics = NONE
  externalMedia = NONE
  semanticMedia = NONE
  persistentActorIdentity = NONE
  persistentItemIdentity = NONE
  sourceHistory = NONE
  contextReentry = NONE
  crossFamilyDerivedPropagation = NONE
```

Canonical rule:

```text
SOCIAL_FEED FANOUT ELIGIBLE
MEANS THIS EXACT PROFILE ONLY
```

## 3. MF-1 registry amendment

Effective after MF-5, the conceptual fanout registry becomes:

```text
LIVE_REACTION
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT

BOARD
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT

SOCIAL_FEED
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT
  profile = SOCIAL_FEED_PUBLIC_CURRENT_SNAPSHOT_V1
  review = MF-5 PASS

NEWS
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT

PUBLIC_KNOWLEDGE
  state = ENTRY_REVIEW_REQUIRED
  review = MF-6
```

This is an amendment to the effective registry state, not a rewrite of the historical MF-1 initial-registry record.

Canonical rule:

```text
MF-1 INITIAL STATE
+
MF-5 SUCCESSFUL ENTRY REVIEW
→ EFFECTIVE SOCIAL_FEED STATE = ELIGIBLE
```

## 4. Structural admission consequences

After MF-5, these current sibling-snapshot intents are structurally admissible when all other MF-1 conditions pass:

```text
[BOARD, SOCIAL_FEED]
[LIVE_REACTION, SOCIAL_FEED]
[SOCIAL_FEED, NEWS]
[LIVE_REACTION, BOARD, SOCIAL_FEED, NEWS]
```

This does not mean execution budget admission will pass.

MF-3 remains a distinct second-stage gate.

Canonical distinction:

```text
MF-5 REGISTRY ELIGIBILITY
!=
MF-3 EXECUTION-BUDGET ADMISSION
```

## 5. Scope mismatch remains a plan admission failure

A request using `SOCIAL_FEED` outside the certified profile remains structurally unsupported.

Examples:

```text
persistent social account identity
persistent social post identity
follower-only / private feed
cross-turn feed continuation
historical feed retrieval
interactive post mutation
item-level reroll/edit/delete
cross-family derived source propagation
multiple authority roots
```

These must not inherit eligibility from the V1 snapshot profile.

MF-1 reason remains conceptually:

```text
PLAN_DENY_FAMILY_INELIGIBLE_FOR_SCOPE
```

## 6. No automatic fanout authorization

Promoting SOCIAL_FEED to `ELIGIBLE` does not make it automatically active.

MF-1 activation rules remain:

```text
current explicit authorized source request
→ may include SOCIAL_FEED in current intent

old SOCIAL_FEED card exists
→ no activation

user merely says a social-like word in narrative
→ no naive activation

model thinks a social feed would look good
→ no activation
```

Canonical rule:

```text
REGISTRY ELIGIBLE
!=
AUTOMATICALLY REQUESTED
```

## 7. MF-2 authority view

SOCIAL_FEED joins the MF-2 shared current authority architecture through a family-specific least-authority view.

Conceptual view:

```text
SocialFeedCurrentAuthorityViewV1
  family = SOCIAL_FEED
  sourceAuthorityRef
  relationshipCore
  currentProjectionOnly = true
```

`relationshipCore` is projected from the trusted family-neutral current relationship authority and includes only fields required by the standalone SF-3 exact current-root join.

The lane does not receive sibling semantic payloads.

## 8. SOCIAL_FEED lane-private trusted inputs

The following remain SOCIAL_FEED lane-private rather than generic shared authority:

```text
PUBLIC_FEED reachability context
actor-label policy contexts
SOCIAL_FEED assertion-policy contexts
graph / dependency validation state
SOCIAL_FEED validation receipt
```

They may not be copied into sibling authority views merely because the families share a current root.

Canonical rule:

```text
SHARED CURRENT ROOT
!=
SHARED SOCIAL REACHABILITY / CLAIM POLICY
```

## 9. PUBLIC_FEED does not promote truth

SOCIAL_FEED V1 supports only public-feed reachability.

MF-5 preserves:

```text
PUBLIC_FEED
!= PUBLIC FACT
!= CANONICAL TRUTH
!= NEWS MATURITY
!= PUBLIC_KNOWLEDGE SETTLEMENT
```

A claim reachable on the SOCIAL_FEED surface still needs its own assertion exposure/policy basis.

Sibling lanes do not inherit truth merely because SOCIAL_FEED is reachable.

## 10. Sibling semantic isolation

SOCIAL_FEED may not consume as authority:

```text
LIVE_REACTION accepted assertions
BOARD post/reply content
NEWS headline/body
NEWS maturity outcome
sibling validation receipts
sibling render state
sibling item counts
sibling agreement / repetition
```

Legal sibling fanout:

```text
trusted current root E
  ├→ LIVE_REACTION
  ├→ BOARD
  ├→ SOCIAL_FEED
  └→ NEWS
```

Illegal propagation:

```text
BOARD rumor
→ SOCIAL_FEED repost

SOCIAL_FEED post
→ NEWS article source

NEWS article
→ SOCIAL_FEED confirmed post
```

unless a later MF-7 / Candidate C C5 design explicitly authorizes a derived-to-derived lineage contract.

## 11. Intra-family REPLY / REPOST / QUOTE are not MF-7 propagation

SOCIAL_FEED V1 contains a same-snapshot graph:

```text
POST
REPLY
REPOST
QUOTE
```

These edges resolve entirely inside the current SOCIAL_FEED validated sidecar.

They do not cross family boundaries and they do not survive into later turns.

Therefore:

```text
INTRA_FAMILY_CURRENT_SNAPSHOT_EDGE
!=
CROSS_FAMILY_DERIVED_PROPAGATION
```

and do not activate Candidate C C5 by themselves.

## 12. Identity isolation

SOCIAL_FEED actor/item identities remain snapshot-local even inside a multi-family stack.

```text
actorOrdinal
itemOrdinal
timelineOrdinal
```

must not become:

```text
multi-family object IDs
cross-turn account IDs
cross-turn post IDs
sourceAuthorityRef
stack slot identity
Candidate C durable IDs
```

Likewise:

```text
handle
!= durable account key
```

The presence of sibling surfaces does not strengthen identity lifetime.

## 13. MF-3 family budget profile requirement

MF-5 adds SOCIAL_FEED to the set of families for which a trusted MF-3 budget profile must exist before ACTIVE_MULTI runtime execution may include it.

Conceptually:

```text
FanoutFamilyBudgetProfileCatalogV1
  LIVE_REACTION → profile
  BOARD         → profile
  SOCIAL_FEED   → profile REQUIRED BEFORE RUNTIME
  NEWS          → profile
```

The SOCIAL_FEED profile must eventually provide finite upper bounds compatible with:

```text
actors
feed items
content-bearing assertions
graph/dependency validation receipt entries
one-hop presentation target previews
presentation nodes
model input/output contribution when topology accounting applies
model-call contribution when topology accounting applies
```

MF-5 freezes no numeric values.

## 14. Four eligible families do not freeze a runtime family-count cap

After MF-5, four families are structurally eligible.

This does not silently set:

```text
MAX_FAMILIES_PER_FANOUT = 4
```

MF-3 explicitly deferred concrete runtime cap numbers.

Therefore:

```text
[LIVE_REACTION, BOARD, SOCIAL_FEED, NEWS]
→ MF-1 structurally legal
→ MF-2 authority binding possible
→ MF-3 may still reject if trusted runtime caps/profiles do not admit it
```

Canonical rule:

```text
REGISTRY CARDINALITY
!=
RUNTIME EXECUTION CAP
```

## 15. No budget borrowing from siblings

SOCIAL_FEED receives its own trusted reservation.

It may not:

```text
borrow unused BOARD semantic allowance
borrow unused NEWS presentation-node allowance
expand because LIVE_REACTION returned empty
claim extra model output because another lane was short
```

MF-3 dimension/non-borrowing rules remain unchanged.

## 16. SOCIAL_FEED semantic bound exceedance

If SOCIAL_FEED exceeds its native semantic/family reservation after valid aggregate admission:

```text
SOCIAL_FEED FAMILY_BOUND_EXCEEDED
→ SOCIAL_FEED family result invalid / quarantined
→ no arbitrary semantic truncation
→ siblings may remain eligible if control-plane integrity remains sound
```

The system must not clip a social item in a way that changes its meaning merely to fit budget.

## 17. MF-4 canonical stack order amendment

Effective multi-family presentation order becomes:

```text
LIVE_REACTION
BOARD
SOCIAL_FEED
NEWS
```

This amendment preserves the relative order frozen before SOCIAL_FEED entry:

```text
LIVE_REACTION < BOARD < NEWS
```

and inserts SOCIAL_FEED between BOARD and NEWS.

Conceptual canonical ranks after MF-5:

```text
LIVE_REACTION = 0
BOARD         = 1
SOCIAL_FEED   = 2
NEWS          = 3
```

Only renderable / family-contract-valid empty surfaces appear.

## 18. Display order rationale and non-authority

The insertion reflects a stable presentation grammar:

```text
immediate live reaction
→ board/thread reaction
→ social timeline propagation/commentary
→ publication-style news
```

But:

```text
DISPLAY ORDER
!= TRUTH RANK
!= SOURCE AUTHORITY RANK
!= CONFIDENCE
!= PUBLICATION MATURITY
```

SOCIAL_FEED appearing before NEWS does not make social content more authoritative.

## 19. SOCIAL_FEED stack slot

MF-4 first-scope cardinality extends to:

```text
one current stack
→ at most one SOCIAL_FEED ordinary slot
```

Conceptual ownership grammar:

```text
[data-simcore-source-stack="multi-family"]
  ...
  [data-simcore-source-slot="social-feed"]
    [data-simcore-source-family="social-feed"]
  ...
```

The slot is presentation identity only.

It does not create stable social account/post identity.

## 20. SOCIAL_FEED presentation states in the stack

MF-4 state mapping applies:

### READY

```text
validated SOCIAL_FEED payload
+ legal SOCIAL_TIMELINE_V1 policy/adapter
→ SOCIAL_FEED slot eligible
```

### EMPTY

Only a semantic-contract-valid empty SOCIAL_FEED sidecar may produce the deterministic SOCIAL_FEED empty surface.

### WITHHELD

Examples:

```text
PUBLIC_FEED reachability HOLD
no renderable accepted social items after semantic quarantine
unsupported family-local semantic scope
```

must not be disguised as an empty social timeline.

### FAILED_PRE_MOUNT / presentation failure

Adapter/policy/model/mount preparation failure is presentation failure, not semantic withholding.

## 21. One-hop preview remains family-local

`SOCIAL_TIMELINE_V1` may render one-hop target previews from the same validated SOCIAL_FEED sidecar.

It must not preview sibling sources.

Forbidden:

```text
SOCIAL_FEED quote card previewing BOARD DOM
SOCIAL_FEED repost card embedding NEWS article DOM as target authority
SOCIAL_FEED reply resolving target through old stack/history
```

Canonical rule:

```text
SOCIAL_TARGET_PREVIEW
= SAME VALIDATED SOCIAL SIDECAR ONLY
```

## 22. Stack CSS ownership

SOCIAL_FEED keeps its family root and namespace:

```text
[data-simcore-source-family="social-feed"]
sc-social...
```

The outer MF-4 stack may control only shallow composition:

```text
slot ordering
flow/grid
gap
collapse wrapper
responsive geometry
```

It may not rewrite SOCIAL_FEED POST/REPLY/REPOST/QUOTE grammar.

SOCIAL_FEED CSS may not reach sibling roots.

## 23. Collapse / view-state rules

SOCIAL_FEED stack collapse remains:

```text
VIEW_LOCAL_ONLY
```

Collapsing the social slot must not:

```text
change social semantic eligibility
change PUBLIC_FEED reachability
return budget to siblings
remove SOCIAL_FEED from the admitted plan
persist social source state
feed social content into future model context
```

The slot `renderInstanceKey` remains ephemeral presentation identity.

## 24. Metrics remain excluded

MF-5 entry does not add ordinary source-state metrics.

Still excluded:

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
verified / premium / official account badge
```

Multi-family stack presentation may not invent these values for visual realism.

Current snapshot item/actor counts remain internal bounded structural/diagnostic quantities, not platform metrics.

## 25. Media boundary remains unchanged

The only converged presentation-only social glyph remains the already designed local `INITIAL_TILE_V1` helper.

MF-5 does not authorize:

```text
external avatar fetch
image generation
semantic post media
video
late asset attachment
network materialization
```

A late effect attached to an exact old social object would create Candidate C C8 pressure.

## 26. Family-local semantic failure matrix

SOCIAL_FEED-local semantic/policy failures include:

```text
PUBLIC_FEED reachability HOLD / unsupported
actor structural invalidity
actor-label policy failure
feed graph invalidity
assertion/content policy DENY/HOLD
item atomic quarantine
target dependency closure
SOCIAL_FEED family-bound exceedance
```

When MF-1/MF-2/MF-3 common integrity remains valid:

```text
SOCIAL_FEED withheld/quarantined
→ sibling semantic lanes may remain valid
```

No sibling is used to repair SOCIAL_FEED.

## 27. Family-local presentation failure matrix

SOCIAL_FEED-local presentation failures include:

```text
SOCIAL_TIMELINE_V1 adapter failure
presentation input invariant failure
social family slot mount failure
social family CSS isolation failure
INITIAL_TILE_V1 decorative helper failure
```

Outcomes:

```text
social presentation surface fails closed
or explicit safe family-local degradation where already authorized
→ SOCIAL_FEED semantic result unchanged
→ sibling semantic results unchanged
```

A decorative glyph failure may degrade to text-only presentation; it cannot trigger semantic regeneration.

## 28. Plan-wide / common integrity failures remain common

SOCIAL_FEED entry does not localize failures that belong to shared orchestration integrity.

Examples:

```text
shared source authority lost
plan / authority mismatch
MF-3 aggregate budget admission rejected
budget arithmetic/control-plane corruption
stale runtime generation owns stack root
wrong assistant message owns stack root
common stack disposal ownership broken
```

These retain the MF-2/MF-3/MF-4 whole-plan or stack-wide blast radius.

## 29. Source invalidation

All siblings share one current `sourceAuthorityRef`.

If the trusted current root is replaced/rerolled:

```text
old LIVE_REACTION invalid
old BOARD invalid
old SOCIAL_FEED invalid
old NEWS invalid
```

for whichever members were present in that current fanout.

MF-5 does not allow SOCIAL_FEED to survive merely because its visible handles/text still look plausible.

Fresh authority requires a fresh fanout plan and fresh SOCIAL_FEED projection.

## 30. Legacy Community compatibility

SOCIAL_FEED fanout entry does not replace legacy Community or Reaction numeric owners.

It does not change:

```text
expectedCommunityBlocks(mode)
[RT N] parsing / numbering / normalization
```

Legacy Community text is not SOCIAL_FEED fanout authority.

Likewise, structured SOCIAL_FEED must not be duplicated into legacy Community automatically merely because both are public-reaction surfaces.

Any migration remains separate.

## 31. Source-irrelevant dormancy

When no current SOCIAL_FEED source job is requested/admitted:

```text
SOCIAL_FEED semantic prompt burden = 0
SOCIAL_FEED graph validation = 0
SOCIAL_FEED presentation build = 0
SOCIAL_FEED history scan = 0
SOCIAL_FEED persistent read/write = 0
SOCIAL_FEED network/media effect = 0
```

Adding SOCIAL_FEED to the registry must not cause every current request to inspect historical social state.

## 32. Candidate C reassessment

For the exact promoted profile:

```text
C1 cross-turn derived survival       = NO
C2 stable derived identity           = NO
C3 item mutation                     = NO
C4 append / merge                    = NO
C5 derived-to-derived propagation    = NO
C6 future context re-entry           = NO
C7 partial descendant survival       = NO
C8 delayed exact-object effect       = NO
```

Verdict:

```text
CANDIDATE_C = NOT ACTIVATED
```

## 33. Candidate C reopen triggers specific to SOCIAL_FEED fanout

Before adding any of the following, Candidate C must be reassessed:

```text
same account survives into later turn
same post survives into later turn
later interaction targets an old post
edit/delete/reroll one social item
append/merge an older feed snapshot
preserve some social descendants after source replacement
SOCIAL_FEED output becomes BOARD/NEWS/PUBLIC_KNOWLEDGE source
BOARD/NEWS output becomes SOCIAL_FEED source
old SOCIAL_FEED enters future model context
late media attaches to exact old social item
```

## 34. Derived-to-derived propagation remains forbidden

MF-5 only authorizes sibling fanout from one trusted current root.

It does not authorize:

```text
SOCIAL_FEED → NEWS
SOCIAL_FEED → BOARD
BOARD → SOCIAL_FEED
NEWS → SOCIAL_FEED
```

as lineage.

If future product semantics require these chains, MF-7 must define the minimum provenance needed by the exact consumer and reassess Candidate C C5.

## 35. Runtime-readiness blockers remain

MF-5 conceptual registry promotion does not imply runtime readiness.

At minimum active implementation would still require the relevant 3M/MF runtime obligations, including:

```text
current source-job selector authority
trusted direct-root / SOCIAL_FEED authority binding
PUBLIC_FEED reachability producer/context
structured SOCIAL_FEED semantic producer/transport
SOCIAL_FEED validator implementation
trusted finite SOCIAL_FEED MF-3 budget profile
aggregate multi-family caps
SOCIAL_TIMELINE_V1 runtime adapter
Presentation Host / Stack Host mount authority
stale-generation-safe lifecycle
source-irrelevant dormancy instrumentation
legacy Community / Reaction regression evidence
real model-compliance evidence
long-chat / reroll / edit / replacement evidence
```

None is granted here.

## 36. MF-5 verification matrix

| Case | Required result |
| --- | --- |
| SOCIAL_FEED alone under exact V1 profile | MF-1 may route `ACTIVE_SINGLE` |
| BOARD + SOCIAL_FEED exact profile | MF-1 structural admission may pass |
| LIVE + BOARD + SOCIAL + NEWS | structurally legal; MF-3 still required |
| SOCIAL_FEED asks follower-only/private scope | reject as ineligible profile |
| SOCIAL_FEED asks persistent account/post | reject as ineligible profile / Candidate C pressure |
| SOCIAL_FEED PUBLIC_FEED reachable | does not upgrade assertion truth |
| sibling NEWS exists | cannot become SOCIAL_FEED evidence |
| same-snapshot REPOST/QUOTE | legal intra-family graph, no C5 |
| BOARD → SOCIAL_FEED source chain | forbidden; MF-7/C5 territory |
| SOCIAL_FEED local semantic failure | siblings may continue if common integrity sound |
| SOCIAL adapter failure | semantic sidecar preserved; siblings unaffected |
| shared source reroll | all current siblings invalid |
| social slot collapsed | semantic result/budget/plan unchanged |
| social metric absent | renderer must not invent it |
| no social job | social work dormant |

## 37. Effective MF progression state

After MF-5:

```text
MF-0  Multi-Family Master Design                DONE
MF-1  Fanout Plan + Family Entry Registry       DONE
MF-2  Shared Authority + Lane Isolation         DONE
MF-3  Aggregate Budget + Failure Matrix         DONE
MF-4  Presentation Stack + Mount Isolation      DONE
MF-5  SOCIAL_FEED Fanout Entry Review           DONE

Effective fanout-eligible families:
LIVE_REACTION
BOARD
SOCIAL_FEED
NEWS

PUBLIC_KNOWLEDGE = ENTRY_REVIEW_REQUIRED
```

## 38. MF-5 checkpoint verdict

```text
MF5_SOCIAL_FEED_FANOUT_ENTRY = DESIGN_FROZEN
SOCIAL_FEED_REGISTRY_STATE = ELIGIBLE
CERTIFIED_SCOPE = CURRENT_ROOT_SIBLING_SNAPSHOT
PROFILE = PUBLIC_FEED / CURRENT_PROJECTION_ONLY / READ_ONLY / VIEW_LOCAL_ONLY
ADAPTER = SOCIAL_TIMELINE_V1
AUTHORITY = SAME CURRENT ROOT, LEAST-AUTHORITY FAMILY VIEW
SIBLING_SEMANTIC_READ = FORBIDDEN
CROSS_FAMILY_PROPAGATION = FORBIDDEN
MF3_BUDGET_PROFILE = REQUIRED BEFORE RUNTIME, NUMBERS NOT FROZEN
STACK_ORDER = LIVE_REACTION → BOARD → SOCIAL_FEED → NEWS
ONE_SOCIAL_SLOT_PER_CURRENT_STACK = YES
PERSISTENCE = NONE
CONTEXT_REENTRY = NONE
CANDIDATE_C = NOT ACTIVATED
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```

## 39. Next checkpoint

Per MF-0 sequence:

```text
MF-6 · PUBLIC_KNOWLEDGE Fanout Entry Review
```

MF-6 must not infer eligibility from SOCIAL_FEED or NEWS entry. It must independently prove settlement/public-reference semantics are safe under sibling fanout.
