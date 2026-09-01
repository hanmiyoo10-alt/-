# SimCore Post-3.0M SOCIAL_FEED SF-5 Metrics / Media Boundary Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **SF-5 IMPACT SCOPE FROZEN · DESIGN-ONLY · METRICS REMAIN SEMANTIC SOURCE STATE · LOCAL DECORATIVE GLYPH CANDIDATE · EXTERNAL / SEMANTIC MEDIA DEFERRED · CANDIDATE C NOT ACTIVATED · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-5 · METRICS / MEDIA BOUNDARY · IMPACT SCOPE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

SF-5 reassesses the realism-oriented fields deliberately excluded by the SOCIAL_FEED master design:

```text
like / repost / reply / view counts
follower / following counts
trend / engagement rank
verification markers
avatar / profile image
post image / video / thumbnail
remote or generated media
```

The goal is not to make SOCIAL_FEED look more like a real service at any cost.

The goal is to decide which classes can be admitted without creating unsupported source facts, hidden persistence, network/effect coupling, or Candidate C pressure.

This checkpoint is design-only. It does not implement metrics, image generation, network fetches, DOM/CSS, persistence, interaction, transport, model calls, or production changes.

## 1. Authority chain

This impact scope consumes without reopening:

```text
SF-0 SOCIAL_FEED Master Design
SF-1 Actor Identity + Reachability
SF-2 Feed Graph Semantics
SF-3 Assertion + Validation
SF-4 Presentation Grammar
3M-4 Presentation Renderer Architecture
3M-6 current-projection invalidation
3M-7 zero automatic structured re-entry
3M-9 source-irrelevant dormancy/current-projection cost
Interaction / Materialization Impact Scope
Interaction / Materialization Master Design
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Core decision question

SF-5 separates four concepts that visually resemble each other but have different authority requirements:

```text
A. SOURCE AGGREGATE METRIC
B. ACCOUNT / CREDENTIAL STATE
C. PRESENTATION-LOCAL DERIVATION
D. MEDIA MATERIALIZATION / SEMANTIC MEDIA
```

Canonical rule:

```text
LOOKS LIKE UI DECORATION
!=
IS PRESENTATION-ONLY DATA
```

## 3. Source aggregate metrics

Examples:

```text
likeCount
repostCount
replyCount
viewCount
followerCount
followingCount
engagementScore
trendRank
```

These are claims about source-local social state.

They are not derivable merely because SOCIAL_FEED contains a graph.

For example:

```text
3 visible REPOST items in this bounded snapshot
!=
source repostCount = 3
```

The source may contain omitted, quarantined, historical, remote, or otherwise unprojected activity.

Therefore first decision:

```text
AUTHORITATIVE SOURCE AGGREGATE METRICS
= EXCLUDED FROM SOCIAL_FEED V1
```

No current producer/authority owns them.

## 4. Current-snapshot structural counts

The validator or presentation layer can mechanically know bounded facts such as:

```text
visibleItemCount
previewCount
number of accepted REPLY items in this projection
```

Those values are valid as internal diagnostics or presentation bookkeeping.

They must not be relabeled as source-wide social metrics.

Canonical distinction:

```text
CURRENT SNAPSHOT CARDINALITY
!=
SOURCE AGGREGATE METRIC
```

Ordinary SOCIAL_TIMELINE_V1 should not display social-realism counters from these values in V1.

## 5. Verification and account credential state

A verification badge is not merely an icon.

It claims account credential/identity state.

Likewise labels such as:

```text
official
staff
moderator
verified
premium
```

may imply source-owned identity or authority.

SF-1 does not provide that authority.

Therefore:

```text
VERIFICATION / CREDENTIAL MARKERS
= EXCLUDED
```

A platform-like blue check may not be fabricated by the Presentation Renderer.

## 6. Avatar/media categories

SF-5 splits visual identity/media into four classes.

### G0 · Local decorative presentation glyph

A synchronous, renderer-local visual derived only from already accepted presentation inputs such as:

```text
actorOrdinal
displayName
handle
renderInstanceKey
```

Examples:

```text
initial letter tile
abstract geometric identicon
non-photographic color/shape token
```

Requirements:

```text
no network
no model/image-generation call
no persistence
no external asset identity
no claim about canonical appearance
no cross-turn continuity promise
no accessibility label claiming "profile photo"
```

This class can remain pure presentation.

Selected candidate:

```text
G0 LOCAL_DECORATIVE_ACTOR_GLYPH
= DESIGNABLE INSIDE SOCIAL_TIMELINE_V1
```

### M0 · Optional external presentation materialization

Examples:

```text
generated decorative avatar
remote thumbnail
optional fetched image
```

Even if semantically optional, this is an effect plane with operation ownership, cancellation, late-result rejection, and budget requirements.

The Interaction / Materialization architecture already owns that seam.

Decision:

```text
M0 EXTERNAL PRESENTATION MATERIALIZATION
= DEFER TO MATERIALIZATION WORKSTREAM
```

SF-5 does not authorize it.

### M1 · Semantic media

Examples:

```text
post image that carries source meaning
screenshot used as evidence
actor portrait claimed to depict the account owner
semantic attachment
video content that changes claim meaning
```

This is Source Intelligence semantic material, not decoration.

It requires explicit schema, source fidelity, exposure validation, presentation behavior, and potentially new media-specific assertion semantics.

Decision:

```text
M1 SEMANTIC MEDIA
= OUT OF SOCIAL_FEED V1
```

### M2 · Durable / delayed exact-object media

Media that arrives later and must attach to an exact old source object introduces delayed exact-target identity.

That is Candidate C C8 pressure.

Decision:

```text
M2 DURABLE ASYNC MEDIA
→ C8 REASSESSMENT REQUIRED BEFORE DESIGN/USE
```

## 7. Why a local glyph is different from an avatar

A presentation glyph may visually occupy the same slot where a real platform would show an avatar, but its semantics are deliberately weaker.

Canonical wording:

```text
DECORATIVE ACTOR GLYPH
!=
PROFILE IMAGE
!=
CANONICAL APPEARANCE
```

The renderer may use an initial such as `A` for accepted display name `Alice`, or an abstract pattern keyed to snapshot-local `actorOrdinal`.

It may not generate a face and imply that the face depicts Alice.

## 8. Determinism and identity boundary for G0

If a local glyph is used, it should be deterministic only within the current rendered projection as needed for visual consistency.

Allowed inputs:

```text
current accepted actorOrdinal
accepted displayName / handle
renderInstanceKey for DOM isolation
```

Forbidden interpretation:

```text
same glyph next turn
→ same durable account
```

The glyph must not become a hidden durable identity key.

## 9. Accessibility boundary

A decorative actor glyph must not create a false semantic label.

Safe direction:

```text
glyph aria-hidden
actor displayName + handle remain textual accessible identity surface
```

Unsafe direction:

```text
alt="Alice's profile photo"
```

when no profile-photo semantic authority exists.

## 10. Metrics and interaction remain separate

A future local reaction button does not authorize a source metric.

```text
user clicked LIKE locally
!=
source likeCount changed
```

Aggregate reaction state belongs to a future mutation/state contract.

SF-5 therefore does not pre-design counters as a shortcut around the Interaction workstream.

## 11. Media and truth remain separate

Materialization success never upgrades truth:

```text
image generated/fetched successfully
!=
claim verified
```

Likewise optional presentation media failure must not invalidate otherwise valid semantic SOCIAL_FEED data.

## 12. Failure-domain separation

Required distinctions:

```text
METRIC AUTHORITY ABSENT
!=
MEDIA MATERIALIZATION FAILURE
!=
SEMANTIC MEDIA VALIDATION FAILURE
!=
PRESENTATION GLYPH FAILURE
!=
SOURCE SUPPORT INVALIDATION
```

A G0 decorative glyph failure may degrade to text-only actor presentation.

It must not invalidate the actor or source item.

## 13. Cost / dormancy impact

G0 can preserve 3M-9 dormancy because it requires no background/effect work and exists only while SOCIAL_FEED presentation is active.

When SOCIAL_FEED is inactive:

```text
glyph work = 0
metric work = 0
media work = 0
network = 0
model/image calls = 0
persistence = 0
```

External materialization remains deferred partly because it introduces a distinct cost/effect lifecycle.

## 14. Candidate C assessment

Selected SF-5 decisions do not activate Candidate C.

```text
aggregate metrics persistence     = no
durable account credential state = no
persistent avatar identity       = no
delayed media attachment         = no
cross-turn media reuse           = no
```

Therefore:

```text
Candidate C = NOT ACTIVATED BY SF-5
```

C8 remains a mandatory trigger if delayed exact-object media is later selected.

## 15. Selected impact direction

```text
SOURCE AGGREGATE METRICS          = KEEP EXCLUDED
SNAPSHOT COUNTS                   = INTERNAL/DIAGNOSTIC ONLY
VERIFICATION/CREDENTIAL BADGES    = KEEP EXCLUDED
G0 LOCAL DECORATIVE ACTOR GLYPH   = ADMIT AS PRESENTATION-ONLY CANDIDATE
M0 EXTERNAL OPTIONAL MEDIA        = DEFER TO MATERIALIZATION WORKSTREAM
M1 SEMANTIC MEDIA                 = DEFER / NEW SEMANTIC CONTRACT REQUIRED
M2 DURABLE ASYNC MEDIA            = C8 TRIGGER
CANDIDATE C                       = NOT ACTIVATED
RUNTIME IMPLEMENTATION            = NOT AUTHORIZED
PRODUCTION                        = UNCHANGED
release-simcore                   = UNCHANGED
```

## 16. Recommended SF-5 detailed design seam

The narrowest detailed design seam is:

```text
SOCIAL_FEED_REALISM_BOUNDARY_V1
```

with two outputs:

```text
A. explicit exclusion matrix for unsupported source-state realism
B. bounded G0 presentation-only actor-glyph contract
```

The detailed design must not smuggle external media or counters into the renderer merely because G0 is admitted.

## 17. Closure

SF-5 impact analysis finds no evidence that SOCIAL_FEED V1 requires source metrics or real media to be semantically complete.

The safe first enhancement is deliberately small:

```text
accepted actor semantics
+
optional local decorative glyph
```

while keeping:

```text
metrics absent
real avatar absent
post media absent
network absent
async materialization absent
persistent media identity absent
```

This improves visual legibility without expanding Source Intelligence truth authority or persistence.
