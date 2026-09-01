# SimCore Post-3.0M SOCIAL_FEED SF-5 Metrics / Media Boundary Design — 2026-09-02

Date: 2026-09-02 KST

Status: **SF-5 DESIGN FROZEN · AGGREGATE METRICS EXCLUDED · ACCOUNT CREDENTIAL MARKERS EXCLUDED · INITIAL_TILE_V1 PRESENTATION-ONLY GLYPH SELECTED · EXTERNAL / SEMANTIC MEDIA DEFERRED · CANDIDATE C NOT ACTIVATED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-5 · METRICS / MEDIA BOUNDARY · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

SF-5 freezes the first detailed realism boundary for SOCIAL_FEED V1 after SF-4 established the `SOCIAL_TIMELINE_V1` presentation grammar.

It answers:

```text
Which social-looking numbers are actual source claims?
May snapshot-local counts be shown as platform metrics?
May a verification badge be treated as decoration?
Can SOCIAL_TIMELINE_V1 gain an avatar-like visual without creating profile-image authority?
Which media classes remain presentation-only, external effects, or semantic source data?
When would media activate Candidate C C8?
```

This is design-only.

It does not implement counters, badges, glyph rendering, images, network requests, image generation, media schemas, persistent state, runtime transport, DOM/CSS, interaction, or release changes.

## 1. Authority chain

SF-5 consumes without reopening:

```text
SF-0 SOCIAL_FEED Master Design
SF-1 Actor Identity + Reachability
SF-2 Feed Graph Semantics
SF-3 Assertion + Validation
SF-4 Presentation Grammar
SF-5 Metrics / Media Boundary Impact Scope
3M-4 Presentation Renderer Architecture
3M-6 current-projection support invalidation
3M-7 zero automatic structured source re-entry
3M-9 source-irrelevant dormancy/current-projection cost
Interaction / Materialization Impact Scope
Interaction / Materialization Master Design
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Frozen SF-5 principle

SOCIAL_FEED visual realism must not create unsupported source state.

Canonical rule:

```text
REALISTIC SOCIAL UI
MAY USE PRESENTATION AFFORDANCES
BUT MAY NOT FABRICATE SOCIAL FACTS
```

Therefore SF-5 separates:

```text
SOURCE-STATE METRICS
ACCOUNT / CREDENTIAL STATE
PRESENTATION-LOCAL DERIVATION
EXTERNAL MATERIALIZATION
SEMANTIC MEDIA
DURABLE / DELAYED MEDIA
```

## 3. Aggregate metrics remain excluded

The following remain outside the SOCIAL_FEED V1 semantic schema and ordinary presentation:

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
```

Reason:

Each value claims state about the represented social source.

No current SF-0..4 owner produces or validates that state.

Frozen rule:

```text
NO METRIC AUTHORITY
→ NO SOCIAL METRIC FIELD
→ NO SOCIAL METRIC UI
```

The renderer may not fill absent values with random, heuristic, or graph-derived numbers.

## 4. Snapshot cardinality is not a social metric

Current validators/presenters can derive bounded counts such as:

```text
visibleItemCount
acceptedReplyItemCount
previewCount
actorCount after validation
```

These are statements about the current bounded projection/read model.

They are legal for diagnostics, bounded receipts, or internal iteration.

They are not automatically legal as ordinary source UI such as:

```text
3 replies
12 reposts
5 users talking
```

because those labels can imply source-wide totals.

Canonical distinction:

```text
PROJECTION CARDINALITY
!=
SOURCE AGGREGATE STATE
```

SF-5 keeps snapshot counts out of ordinary SOCIAL_TIMELINE_V1 realism chrome.

## 5. No inferred metric from graph edges

SF-2 graph structure may contain several visible relations targeting one item.

Example:

```text
POST 0
← REPLY 1
← REPOST 2
← QUOTE 3
```

This does not authorize:

```text
replyCount = 1
repostCount = 1
quoteCount = 1
```

as platform/source metrics.

Why:

The snapshot may omit:

```text
other valid items
quarantined items
historical items
remote items
items outside current projection scope
```

Therefore:

```text
VISIBLE EDGE COUNT
!=
TOTAL SOURCE METRIC
```

## 6. Verification / credential markers remain excluded

The following remain unsupported:

```text
verified badge
official badge
staff badge
moderator badge
premium badge
subscription tier
account status badge
```

These are source-local credential/account-state claims.

They cannot be invented from:

```text
handle style
display name
claim mode
source reachability
repeated posting
canonical-character resemblance
```

Canonical rule:

```text
VERIFIED-LOOKING UI
!=
VERIFICATION AUTHORITY
```

## 7. Other realism metadata is not silently reopened

SF-5 does not reopen adjacent fields merely because they often appear beside metrics/media.

Still excluded unless separately designed:

```text
publishedAt
timeAgo
location
bio
profile URL
account join date
platform branding
external permalink
```

This prevents scope creep from turning SF-5 into a generic profile-state schema.

## 8. Media classification

SF-5 freezes four media/visual classes.

```text
G0 · LOCAL PRESENTATION GLYPH
M0 · OPTIONAL EXTERNAL PRESENTATION MATERIALIZATION
M1 · SEMANTIC SOURCE MEDIA
M2 · DURABLE / DELAYED EXACT-OBJECT MEDIA
```

Their authority requirements are intentionally different.

## 9. G0 local presentation glyph

G0 is pure presentation.

It may derive a visual from already accepted actor presentation data without adding a new source claim.

Frozen properties:

```text
synchronous
local
non-networked
non-model-generated
non-persistent
non-semantic
current presentation only
fail-soft
```

First selected G0 adapter fragment:

```text
INITIAL_TILE_V1
```

## 10. `INITIAL_TILE_V1`

Conceptual presentation-only input:

```text
accepted SocialTimelineActorViewV1
  actorOrdinal
  displayName
  handle
```

Conceptual output:

```text
ActorGlyphViewV1
  kind = INITIAL_TILE
  glyphText
```

`ActorGlyphViewV1` is not added to `ValidatedSocialFeedSemanticSidecarV1`.

It exists only in the presentation read model / adapter transformation.

## 11. Glyph text derivation

First conceptual rule:

```text
glyphText
= one bounded visible grapheme derived from accepted displayName
```

The exact Unicode/grapheme implementation is deferred to future implementation evidence.

The design requirement is:

```text
no new lexical information
```

The glyph may only reuse information already ordinary-visible in the actor row.

The renderer must not ask a model to invent initials, nicknames, symbols, or profile identities.

## 12. Glyph is not actor identity

Canonical rules:

```text
ActorGlyphViewV1
!=
actorOrdinal

INITIAL_TILE_V1
!=
persistent account avatar

same glyph text
!=
same actor
```

Examples:

```text
Alice @alice_day → A
Alex  @alex_live → A
```

Both may legally display the same glyph.

Identity continues to come from accepted actor semantics, not icon uniqueness.

## 13. Current-snapshot consistency

Within one `SocialTimelinePresentationModelV1`, repeated views of the same accepted actor should resolve to a visually consistent G0 glyph.

This is presentation consistency only.

It does not create:

```text
cross-turn continuity
durable account mapping
profile asset identity
Candidate C object identity
```

A future render may independently derive the same visible `A`, but that fact has no identity authority.

## 14. No face / appearance implication

`INITIAL_TILE_V1` is intentionally non-photographic.

Forbidden G0 interpretations:

```text
this depicts the actor
this is the actor's profile picture
this is the canonical character appearance
this image was uploaded by the actor
```

No human face, portrait, source screenshot, logo, or externally sourced image belongs to G0.

## 15. Accessibility rule for G0

The textual actor row remains the accessible identity surface.

Recommended conceptual direction:

```text
INITIAL_TILE_V1 glyph
→ decorative / aria-hidden

displayName + handle
→ accessible actor text
```

Forbidden semantic label:

```text
alt="Alice's profile photo"
```

because SF-5 provides no profile-photo authority.

## 16. G0 DOM/CSS extension boundary

A future implementation may extend the SF-4 source-scoped grammar conceptually with:

```text
span.sc-social__actor-glyph
```

under:

```text
[data-simcore-source-family="social-feed"]
```

This does not authorize implementation now.

No generic global avatar classes or selectors are owned.

## 17. Target preview policy remains text-first

For the first SF-5 design:

```text
TOP-LEVEL ACTOR ROW
→ may use optional INITIAL_TILE_V1

TARGET PREVIEW ACTOR
→ remains text-only
```

Reason:

- keeps preview DOM bounded;
- avoids multiplying decorative glyph instances inside nested relationship views;
- preserves SF-4 one-hop target-preview simplicity;
- proves G0 on the narrowest surface first.

A later adapter may revisit target-preview glyphs without changing semantic authority.

## 18. G0 failure isolation

If glyph derivation or rendering fails:

```text
actor text remains
item remains
semantic sidecar remains valid
```

Conceptual outcome:

```text
GLYPH_READY
or
GLYPH_OMITTED
```

No broken-image placeholder, model retry, source mutation, or validation-state change is required.

Canonical rule:

```text
DECORATIVE GLYPH FAILURE
→ TEXT-ONLY DEGRADATION
```

## 19. M0 optional external presentation materialization

M0 includes effectful but semantically optional media such as:

```text
generated decorative avatar
remote thumbnail
optional fetched image
external decorative asset
```

Even when optional, M0 requires:

```text
operation ownership
generation/token identity
cancellation
stale result rejection
source invalidation cleanup
network/model budget
late-result handling
```

Those requirements are owned by the Interaction / Materialization workstream.

Frozen SF-5 decision:

```text
M0
= NOT PART OF SOCIAL_FEED V1
= DEFER TO IM-5 OR EQUIVALENT MATERIALIZATION DESIGN
```

## 20. Why generated decorative avatar is not G0

A generated avatar may be semantically intended as decoration, but it introduces an asynchronous/effectful producer and can visually imply character/account appearance.

Therefore:

```text
GENERATED AVATAR
!=
LOCAL PRESENTATION GLYPH
```

It belongs to M0 at minimum, and may become M1 if the product claims it depicts the actor.

## 21. M1 semantic source media

M1 includes media whose presence/content changes source meaning.

Examples:

```text
post image
video
semantic attachment
screenshot evidence
account portrait claimed as profile image
image whose content carries a claim not present in text
```

M1 requires a new semantic contract before inclusion.

At minimum, future design must answer:

```text
what media object is proposed?
what is its semantic role?
what trusted source authority supports it?
what exposure policy applies to visual content?
how is source fidelity checked?
how is media text/visual leakage handled?
what does validation output contain?
what does presentation do when media is unavailable?
```

SF-5 does not freeze an M1 schema prematurely.

## 22. Semantic media cannot bypass text validation

A source item may not hide unexposed information in an image while presenting safe structured text.

Canonical rule:

```text
SAFE TEXT
+
UNVALIDATED SEMANTIC IMAGE
!=
SAFE SOCIAL ITEM
```

If M1 is ever introduced, visual semantics require an explicit validation boundary rather than assuming that item-level text policy covers them automatically.

## 23. Media materialization never upgrades truth

For any future M0/M1 producer:

```text
IMAGE FETCH SUCCESS
!=
CLAIM VERIFIED

IMAGE GENERATION SUCCESS
!=
CLAIM VERIFIED
```

The media producer/effect plane cannot upgrade assertion mode, exposure eligibility, actor identity, or source authority.

## 24. M2 durable / delayed exact-object media

M2 exists when a media result:

```text
arrives after the originating projection lifecycle
must attach to a specific old semantic item
survives replacement/reload
must be reconciled after reroll/edit
```

This creates Candidate C C8 pressure and often additional C1/C2/C3/C4 pressure.

Frozen trigger:

```text
DELAYED MEDIA MUST REATTACH TO EXACT OLD ITEM
→ C8 ACTIVATED / CANDIDATE C REASSESSMENT REQUIRED
```

Current SOCIAL_FEED SF-5 does not activate this path.

## 25. Metrics future-authority prerequisites

If a future consumer truly needs source metrics, design must first establish at least:

```text
metric owner / producer
metric scope
observation time semantics
source authority / provenance
validation rules
mutation/update semantics if interactive
staleness / invalidation behavior
bounded storage/lifetime if values survive turns
presentation wording that distinguishes exact vs partial counts
```

Do not add `likeCount: number` first and invent authority later.

## 26. Credential future-authority prerequisites

If a future verified/official marker is required, design must establish:

```text
which source owns credential state
whether credential is source-local or canonical-world identity
how actor is bound to that credential evidence
how stale credential state invalidates
whether the marker survives across projections
```

The badge color/icon itself is presentation-only only after the semantic credential exists.

## 27. Interaction boundary

SF-5 does not authorize aggregate metric mutation.

Examples not authorized:

```text
click LIKE → likeCount++
click REPOST → repostCount++
click FOLLOW → followerCount++
```

Those operations require a source mutation/state contract.

A local pressed/selected visual state may remain P0 view interaction if it makes no claim that the source state changed.

## 28. Presentation receipt boundary

Existing bounded presentation diagnostics may retain values such as:

```text
visibleItemCount
previewCount
```

A future G0 implementation may additionally record only bounded presentation status such as:

```text
glyphRenderedCount
```

Such receipts must not retain:

```text
glyph text
actor display names
handles
images
metric-like source claims
```

Ordinary SOCIAL_FEED UI does not consume diagnostics as semantic data.

## 29. Cost / dormancy

SF-5 preserves 3M-9.

When no SOCIAL_FEED presentation job exists:

```text
G0 glyph work = 0
metric derivation for ordinary UI = 0
media work = 0
network = 0
model/image generation = 0
persistent read/write = 0
```

When active, `INITIAL_TILE_V1` is bounded local presentation work proportional only to visible actor rows.

No background task is introduced.

## 30. Candidate C matrix after SF-5

```text
C1 cross-turn derived survival       = not activated by SF-5
C2 stable derived identity           = not activated by SF-5
C3 item mutation                     = not activated by SF-5
C4 append / merge                    = not activated by SF-5
C5 derived-to-derived lineage        = not activated by SF-5
C6 future context re-entry           = not activated by SF-5
C7 partial descendant survival       = not activated by SF-5
C8 delayed exact-object side effect  = not activated; explicit future M2 trigger
```

The existence of the broader Candidate C architecture does not mean SOCIAL_FEED SF-5 consumes it.

## 31. Ordinary UI matrix

Frozen first ordinary `SOCIAL_TIMELINE_V1` policy after SF-5:

| Field / affordance | V1 decision | Authority class |
|---|---|---|
| displayName | allowed | validated social semantics |
| handle | allowed | validated social semantics |
| POST/REPLY/REPOST/QUOTE relation | allowed | validated graph semantics |
| `INITIAL_TILE_V1` | optional allowed design | presentation-only G0 |
| like/repost/reply/view counts | excluded | unsupported source metric |
| follower/following counts | excluded | unsupported source metric |
| verified/official badge | excluded | unsupported credential state |
| real/generated avatar | excluded | M0/M1 future design |
| post image/video | excluded | M1 future semantic-media design |
| remote thumbnail | excluded | M0 future materialization design |
| delayed old-item media attachment | excluded | M2 / Candidate C C8 |

## 32. Feature-gate closure

If G0 glyph presentation is disabled:

```text
SOCIAL_TIMELINE_V1
→ returns to exact SF-4 text-only actor row
```

No semantic payload changes.

No source validation changes.

No hidden state remains.

This makes G0 a vertically closable presentation enhancement rather than a new semantic dependency.

## 33. Blockers before any runtime SF-5 realization

SF-5 does not remove existing runtime blockers.

At minimum, future active realization still depends on:

```text
ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
runtime implementation authorization
family-level concrete caps / integration evidence as applicable
```

G0 being simple does not grant authority to bypass those gates.

## 34. Frozen decisions

```text
SF5_REALISM_POLICY                    = MINIMAL_PRESENTATION_ONLY
AGGREGATE_SOURCE_METRICS             = EXCLUDED
SNAPSHOT_COUNTS_IN_ORDINARY_UI       = EXCLUDED
VERIFICATION/CREDENTIAL_MARKERS      = EXCLUDED
FIRST G0 GLYPH                       = INITIAL_TILE_V1
G0 SOURCE                            = ACCEPTED DISPLAY NAME ONLY
G0 SEMANTIC AUTHORITY                = NONE
G0 TARGET PREVIEW                    = TEXT-ONLY IN V1
EXTERNAL OPTIONAL MEDIA M0           = DEFER
SEMANTIC MEDIA M1                    = DEFER / NEW CONTRACT REQUIRED
DURABLE ASYNC MEDIA M2               = DEFER / C8 TRIGGER
CANDIDATE C                          = NOT ACTIVATED BY SF-5
RUNTIME IMPLEMENTATION               = NOT AUTHORIZED
PRODUCTION                           = UNCHANGED
release-simcore                      = UNCHANGED
```

## 35. Closure

SF-5 confirms that SOCIAL_FEED V1 does not need fabricated counters, credential badges, or real media to become a coherent source family.

The only newly admitted realism layer is deliberately weak:

```text
accepted actor text
+
optional INITIAL_TILE_V1 decorative glyph
```

Everything that claims additional source state stays outside the semantic boundary until an explicit authority-bearing consumer exists.

The next SOCIAL_FEED checkpoint is:

```text
SF-6 · Family Convergence / Candidate C Reassessment
```

SF-6 should test whether SF-0 through SF-5 now form a complete bounded snapshot family and whether any real remaining requirement actually forces Candidate C activation.
