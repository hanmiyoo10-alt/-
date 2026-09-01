# SimCore Post-3.0M SOCIAL_FEED SF-4 Presentation Grammar Design — 2026-09-02

Date: 2026-09-02 KST

Status: **SF-4 DESIGN FROZEN · SOCIAL_TIMELINE_V1 · VALIDATED-SEMANTICS-ONLY PRESENTATION · SOURCE-SCOPED DOM/CSS · VIEW-LOCAL STATE ONLY · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-4 · PRESENTATION GRAMMAR · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

SF-4 freezes the first complete presentation grammar for validated SOCIAL_FEED V1 semantics.

It answers:

```text
What read model does SOCIAL_TIMELINE_V1 produce?
How are POST / REPLY / REPOST / QUOTE represented differently?
How are accepted targets previewed safely?
How are semantic ordinals preserved while view-local indices remain dense?
What DOM grammar and CSS namespace are family-owned?
What view-local state is allowed?
How are empty and failure states separated from semantic validity?
```

This is design-only.

It does not implement DOM/CSS, host mounting, structured transport, renderer code, persistence, media, interaction, network calls, or production changes.

## 1. Authority chain

SF-4 consumes without reopening:

```text
SF-0 SOCIAL_FEED Master Design
SF-1 Actor Identity + Reachability
SF-2 Feed Graph Semantics
SF-3 Assertion + Validation
SF-4 Presentation Grammar Impact Scope
3M-4 Presentation Renderer Architecture
3M-6 current-projection support invalidation
3M-7 zero automatic structured source re-entry
3M-9 source-irrelevant dormancy/current-projection cost
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. First supported presentation slice

Frozen first SOCIAL_FEED presentation scope:

```text
mode = C
family = SOCIAL_FEED
reachability = PUBLIC_FEED
semantic input = ValidatedSocialFeedSemanticSidecarV1
adapter = SOCIAL_TIMELINE_V1
placementIntent = SOURCE_LOCAL_ADJACENT
themePolicy = HOST_INHERIT
interactionPolicy = VIEW_LOCAL_ONLY
```

No platform branding, account persistence, metrics, media, source mutation, or host API is introduced.

## 3. Canonical pipeline

```text
ValidatedSocialFeedSemanticSidecarV1
        ↓
SourcePresentationPolicyV1
        ↓
PresentationRendererRegistry
        ↓
SOCIAL_TIMELINE_V1
        ↓
SocialTimelinePresentationModelV1
        ↓
Source Presentation Host
        ↓
source-scoped DOM + CSS
```

Only validated semantics enter ordinary presentation.

## 4. Presentation authority boundary

SOCIAL_TIMELINE_V1 may:

```text
select layout
select source-scoped classes
add non-semantic punctuation/icons
compute local view indices
create target preview read models
truncate visually under a bounded presentation policy
manage ephemeral view state
```

It may not:

```text
change assertion eligibility
change item kind
change target edge
change actor identity
invent source facts
invent account facts
rewrite claims into stronger certainty
create durable IDs
persist semantic state
```

Canonical rule:

```text
PRESENTATION MAY REFORMAT
PRESENTATION MAY NOT REAUTHOR SEMANTICS
```

## 5. First presentation read model

Frozen conceptual model:

```text
SocialTimelinePresentationModelV1
  kind = SOCIAL_TIMELINE
  projectionOrdinal
  renderInstanceKey
  items[]
  empty
```

Each visible item is transformed into exactly one top-level feed presentation item.

The model is ephemeral/read-only and is not Source Intelligence semantic state.

## 6. Presentation item shell

```text
SocialTimelinePresentationItemV1
  presentationIndex
  itemOrdinal
  timelineOrdinal
  kind
  actor
  relation?
  content?
  targetPreview?
```

Where:

```text
presentationIndex = presentation-only dense local position
itemOrdinal        = preserved semantic snapshot identity
timelineOrdinal    = preserved semantic feed order label
kind               = preserved semantic kind
```

No field in this read model creates durable identity.

## 7. Dense presentation index

Validated filtering may leave timeline gaps.

Example:

```text
validated semantic timelineOrdinal: 0, 2, 5
presentationIndex:                  0, 1, 2
```

Frozen rule:

```text
presentationIndex
= dense view-local iteration index
```

It is not written back into semantic data.

It is not used for:

```text
target resolution
source authority
item identity
cross-turn lookup
reroll lineage
```

## 8. Feed order rule

SOCIAL_TIMELINE_V1 orders top-level visible feed items by ascending semantic `timelineOrdinal`.

This defines the first adapter's deterministic visual feed order only.

It does not claim:

```text
oldest-first world chronology
published timestamp
causal order
real platform ordering algorithm
```

A future adapter may choose a different legal display policy only by explicit design.

## 9. Actor presentation model

Frozen read model:

```text
SocialTimelineActorViewV1
  actorOrdinal
  displayName
  handle
```

Presentation may visually render:

```text
Alice  @alice_day
```

where `@` is a presentation affordance.

Presentation must not add:

```text
avatar
verified badge
bio
followers count
location
join date
profile URL
```

without future semantic authority.

## 10. POST grammar

A POST is a content-bearing root.

Conceptual presentation:

```text
article.sc-social__item[data-kind="post"]
  actor row
  content block
```

POST has:

```text
relation = null
targetPreview = null
content = accepted item content
```

Presentation may not invent a thread header or engagement footer from absent data.

## 11. REPLY grammar

A REPLY remains a top-level feed item in SOCIAL_TIMELINE_V1 while carrying an explicit relation to an accepted target.

Conceptual presentation:

```text
article.sc-social__item[data-kind="reply"]
  relation row: replying to @target
  actor row
  content block
  optional bounded target preview
```

This first adapter does not require deep nested indentation by target-chain depth.

Reason:

```text
feed ordering
!= dependency tree ordering
```

A later thread-detail adapter may choose nested presentation separately.

## 12. REPOST grammar

A REPOST is relationship-only.

Conceptual presentation:

```text
article.sc-social__item[data-kind="repost"]
  relation row: @actor reposted
  target preview
```

It has no independent freeform content block.

Forbidden presentation wording:

```text
endorsed
agreed
confirmed
verified
```

unless future semantics explicitly authorize it.

## 13. QUOTE grammar

A QUOTE has both its own accepted commentary and an accepted target relation.

Conceptual presentation:

```text
article.sc-social__item[data-kind="quote"]
  actor row
  own content block
  quote target preview
```

Canonical rule:

```text
QUOTE OWN CONTENT
!= TARGET CONTENT
```

The layout must visually preserve that distinction rather than concatenate both strings into one apparent claim.

## 14. Relation model

Frozen presentation relation concept:

```text
SocialTimelineRelationViewV1
  relationKind = REPLY_TO | REPOST_OF | QUOTE_OF
  targetItemOrdinal
  targetActorOrdinal
```

This model is derived from already validated SF-2 target edges.

It creates no new graph truth.

## 15. Target-preview policy

SOCIAL_TIMELINE_V1 freezes a bounded accepted-target preview.

A target preview may contain only:

```text
target itemOrdinal
target kind
target actor displayName
target actor handle
target accepted plain-text content when the target kind has content
```

A REPOST target must be content-bearing because SF-2 forbids REPOST targets.

## 16. Target-preview content by target kind

### Target POST

May show:

```text
actor + full/visually-truncated accepted content
```

### Target REPLY

May show:

```text
actor + full/visually-truncated accepted reply content
```

It does not recursively embed the reply's own target preview.

### Target QUOTE

May show:

```text
actor + full/visually-truncated own quote commentary
```

It does not recursively embed the quote's quoted target.

Canonical rule:

```text
TARGET PREVIEW DEPTH = 1 PRESENTATION HOP
```

This bounds DOM growth and prevents recursive visual explosions.

## 17. No recursive target cards

Even if the semantic graph chain is:

```text
REPLY A → QUOTE B → POST C
```

A's target preview shows B only.

It does not render:

```text
A
  preview B
    preview C
      ...
```

Deep relationship understanding remains in semantic graph authority, not recursive DOM nesting.

## 18. Visual truncation boundary

A future implementation may visually truncate long accepted content in target previews.

Requirements:

```text
semantic stored/read-model content remains unchanged
truncation is view-local
expansion reveals the same accepted text
no generated paraphrase
no stronger summary wording
```

Forbidden:

```text
model-generated target summary
semantic rewrite to fit UI
truncation that removes negation while presenting remainder as complete statement
```

A conservative implementation may choose no truncation until a safe bounded policy is proven.

## 19. Multiple view instances of one target

The same validated target may appear:

```text
once as its own top-level feed item
plus several times as target previews
```

All are views of one semantic object.

No preview receives:

```text
independent item identity
independent mutation
independent reroll
independent provenance
```

## 20. Root DOM grammar

Frozen conceptual root:

```text
<section
  class="sc-social"
  data-simcore-source-family="social-feed"
  data-simcore-source-adapter="social-timeline-v1"
>
```

The exact host mount location remains unproven and outside SF-4 authority.

## 21. Feed DOM grammar

Conceptual static structure:

```text
section.sc-social
  div.sc-social__feed
    article.sc-social__item
      div.sc-social__relation?      
      header.sc-social__actor
        span.sc-social__display-name
        span.sc-social__handle
      div.sc-social__content?
      blockquote.sc-social__target?
```

Semantic text is inserted only as escaped/plain text nodes.

The structure is conceptual and does not authorize direct runtime DOM code.

## 22. Exact source-scoped class namespace

SF-4 freezes the first class vocabulary:

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

Additional implementation helper classes would require bounded review and must remain under the `sc-social` namespace.

## 23. Data attributes

Permitted presentation-owned attributes may include bounded enum/value hooks such as:

```text
data-kind="post|reply|repost|quote"
data-relation="reply-to|repost-of|quote-of"
```

They mirror already validated enum semantics.

Model text must never become arbitrary attribute names or class names.

## 24. CSS scoping

All SOCIAL_TIMELINE_V1 CSS must be scoped beneath:

```text
[data-simcore-source-family="social-feed"]
```

No global selector ownership such as:

```text
body
html
.card
.post
.reply
.item
button
img
```

is permitted.

## 25. Shared source token boundary

SOCIAL_FEED may consume common source presentation tokens such as:

```text
--sc-source-bg
--sc-source-fg
--sc-source-border
--sc-source-muted
--sc-source-radius
--sc-source-gap
```

and may define family-scoped tokens such as:

```text
--sc-social-relation-gap
--sc-social-target-indent
```

Exact visual values are not semantic and are not frozen here.

No external font/CDN dependency is required.

## 26. Theme policy

Frozen first policy:

```text
HOST_INHERIT
```

A host light/dark/theme change may alter colors/spacing via scoped presentation tokens.

It must not alter:

```text
item content
item kind
actor identity
target edge
validation disposition
```

## 27. Mode/reason-code display boundary

Ordinary SOCIAL_FEED UI must not expose validator internals by default.

Do not render:

```text
ALLOW_KNOWN_PUBLIC_FACT
HOLD_UNPROVEN_POLICY_COMBINATION
TARGET_NOT_ELIGIBLE
source fingerprints
policy signal booleans
quarantine counts
```

The semantic wording already carries the user-facing epistemic expression.

## 28. Empty presentation model

For a valid empty SOCIAL_FEED:

```text
SocialTimelinePresentationModelV1
  items = []
  empty = true
```

The renderer produces a deterministic source-local empty state.

It must not:

```text
reuse previous feed DOM
show hidden/quarantined counts
invent a placeholder social post
show raw semantic/receipt JSON
```

Exact copy remains a presentation-content decision for future implementation evidence.

## 29. View-local interaction policy

Frozen:

```text
interactionPolicy = VIEW_LOCAL_ONLY
```

Permitted examples:

```text
expand/collapse target preview
show/hide local relation detail
keyboard focus movement
local responsive state
local scroll position
```

Not authorized:

```text
LIKE
REPLY
REPOST
QUOTE
ADD_POST
DELETE
EDIT
REROLL
FOLLOW
BLOCK
```

Those are semantic/source mutations and belong to later interaction design.

## 30. Render-instance isolation

Every mounted SOCIAL_FEED surface may receive an ephemeral:

```text
renderInstanceKey
```

It may namespace:

```text
DOM ids
aria-controls relationships
local expansion state
view-local caches
```

It must not become:

```text
sourceAuthorityRef
actor identity
item identity
Candidate C durable object id
```

## 31. Accessibility boundary

Presentation should preserve ordinary accessibility semantics conceptually:

```text
section/article/header/blockquote roles where appropriate
plain text labels
bounded aria relationships
keyboard-accessible view-local controls if controls exist
```

Accessibility metadata may describe the existing presentation relation.

It may not invent semantic truth or hidden labels.

## 32. Input invariant failure

Even though SF-3 should provide a valid sidecar, the adapter must fail closed if presentation invariants are unexpectedly broken.

Examples:

```text
visible item references missing visible actor
visible dependent references missing accepted target
unknown item kind
family mismatch
```

Outcome:

```text
ADAPTER_INPUT_INVARIANT_FAILED
```

The adapter must not repair by fuzzy lookup or hidden history scan.

## 33. Presentation outcome vocabulary

Frozen conceptual states:

```text
PRESENTATION_READY
PRESENTATION_EMPTY
UNSUPPORTED_ADAPTER
ADAPTER_INPUT_INVARIANT_FAILED
ADAPTER_FAILED
MOUNT_BLOCKED
MOUNT_FAILED
```

These are presentation outcomes only.

## 34. Presentation failure isolation

Presentation failure must not:

```text
change SF-3 validation state
change source authority
mutate semantic sidecar
persist repair state
trigger a model retry
fall back to raw HTML/JSON
search history for replacement data
```

Canonical rule:

```text
PRESENTATION FAILURE
!= SEMANTIC FAILURE
```

## 35. Bounded presentation receipt

Conceptual diagnostics only:

```text
SocialTimelinePresentationReceiptV1
  family = SOCIAL_FEED
  adapterKey = SOCIAL_TIMELINE_V1
  status
  visibleItemCount
  previewCount
  failureCode?
```

It must not retain:

```text
post text
target text
actor displayName
handle
DOM HTML
CSS text
quarantined content
```

No ordinary UI feature requires this receipt.

## 36. Source support invalidation

SF-4 inherits 3M-6.

If current source authority invalidates the SOCIAL_FEED projection:

```text
semantic projection invalid
→ presentation must not continue as authoritative source UI
```

This is different from a local CSS/DOM failure.

Presentation may unmount stale view state but does not decide source invalidation itself.

## 37. History / re-entry boundary

A rendered feed may remain visually mounted according to host lifecycle policy.

That does not imply:

```text
structured source history
future model context
hidden retrieval
cross-turn social object memory
```

Canonical rule:

```text
VISIBLE SOCIAL UI
!= FUTURE MODEL CONTEXT
```

## 38. Candidate C status

SF-4 activates none of C1-C8.

Presentation-only values such as:

```text
presentationIndex
renderInstanceKey
expanded target preview
DOM id
```

are explicitly non-durable.

If a later requirement asks to persist view/semantic identity across turns, Candidate C must be reassessed before adoption.

## 39. Performance boundary

If SOCIAL_FEED presentation is not active:

```text
SF-4 presentation work = 0
```

If active, presentation work is bounded by the current validated snapshot.

Target previews are one-hop only, preventing recursive DOM expansion proportional to graph depth.

No history scan/network/media call is authorized.

## 40. Runtime blockers remain binding

SF-4 does not solve:

```text
ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
```

Therefore:

```text
SF-4 DESIGN FROZEN
!= RUNTIME PRESENTATION AUTHORIZED
```

No guessed host selector and no hidden output transport may bypass these blockers.

## 41. SF-5 handoff

SF-4 intentionally leaves the following absent:

```text
avatar
post image/video
verification badge
like count
reply count
repost count
view count
follower count
trend/viral status
```

SF-5 must reassess whether any real semantic/presentation consumer justifies introducing metrics or media authority.

Default remains exclusion.

## 42. Frozen decisions

```text
FIRST ADAPTER                       = SOCIAL_TIMELINE_V1
INPUT                               = VALIDATED SOCIAL_FEED ONLY
TOP-LEVEL ORDER                     = ASCENDING timelineOrdinal
VIEW-LOCAL DENSE INDEX              = presentationIndex
SEMANTIC ORDINAL RENUMBERING        = FORBIDDEN
POST                                = actor + own content
REPLY                               = relation + actor + own content + optional target preview
REPOST                              = relation + target preview; NO OWN CONTENT
QUOTE                               = actor + own content + target preview
TARGET PREVIEW DEPTH                = ONE PRESENTATION HOP
TARGET LOOKUP                       = SAME VALIDATED SIDECAR ONLY
ACTOR FIELDS                        = displayName + handle ONLY
METRICS                             = NOT PRESENTED
MEDIA                               = NOT PRESENTED
CSS ROOT                            = [data-simcore-source-family="social-feed"]
CSS NAMESPACE                       = sc-social*
THEME                               = HOST_INHERIT
INTERACTION                         = VIEW_LOCAL_ONLY
PERSISTENCE                         = NONE
CONTEXT RE-ENTRY                    = NONE
CANDIDATE C                         = NOT ACTIVATED
RUNTIME IMPLEMENTATION              = NOT AUTHORIZED
PRODUCTION                          = UNCHANGED
```

## 43. Closure

SOCIAL_FEED now has a complete presentation contract:

```text
validated social semantics
→ deterministic feed read model
→ kind-specific social grammar
→ one-hop accepted target previews
→ source-scoped safe DOM/CSS
→ ephemeral view state only
```

No UI convention is allowed to become semantic authority.

Next design checkpoint:

```text
SF-5 · Metrics / Media Boundary Reassessment
```
