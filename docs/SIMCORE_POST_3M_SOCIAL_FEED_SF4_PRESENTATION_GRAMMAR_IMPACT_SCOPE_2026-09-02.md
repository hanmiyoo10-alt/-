# SimCore Post-3.0M SOCIAL_FEED SF-4 Presentation Grammar Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **READ-ONLY IMPACT SCOPE COMPLETE · SOCIAL_TIMELINE_V1 PRESENTATION SEAM SELECTED · DESIGN-ONLY · NO RUNTIME / DOM / CSS IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-4 · PRESENTATION GRAMMAR · IMPACT SCOPE**

## 0. Purpose

SF-4 maps the narrow presentation-only seam after SF-3 validated SOCIAL_FEED semantics.

It answers:

```text
What exact validated data may presentation consume?
What presentation-only read model is needed for POST / REPLY / REPOST / QUOTE?
How may accepted targets be previewed without creating new semantic edges?
How should filtered timeline gaps be rendered without renumbering semantic ordinals?
What DOM/CSS namespace prevents style bleed?
Which view-local state is legal?
What failure classes remain presentation-only?
Which current runtime blockers remain untouched?
```

This document selects a design seam only. It does not implement DOM, CSS, host mount, structured transport, renderer code, runtime state, persistence, network/media behavior, or production changes.

## 1. Current authority chain

SF-4 consumes without reopening:

```text
SF-0 SOCIAL_FEED Master Design
SF-1 Actor Identity + Reachability
SF-2 Feed Graph Semantics
SF-3 Assertion + Validation
3M-4 Presentation Renderer Architecture
3M-6 current-projection support invalidation
3M-7 zero automatic structured source re-entry
3M-9 source-irrelevant dormancy/current-projection cost
```

Production remains authoritative on `release-simcore`.

## 2. Exact input boundary

Ordinary SOCIAL_FEED presentation may consume only:

```text
ValidatedSocialFeedSemanticSidecarV1
```

It may not consume:

```text
untrusted SocialFeed draft
quarantined item content
quarantined actor labels
validation policy-context signals
validation receipt semantic payload
raw source bodies
Handoff/Evidence fingerprints for decoration
```

Canonical rule:

```text
VALIDATED SOCIAL SEMANTICS
→ PRESENTATION

VALIDATION RECEIPT
→ DIAGNOSTICS ONLY
```

## 3. Presentation seam selected

Selected first adapter:

```text
SOCIAL_TIMELINE_V1
```

Selected pipeline:

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

SF-4 does not select a concrete host selector/API.

## 4. Why a family-specific adapter is required

SOCIAL_FEED cannot reuse BOARD or LIVE_REACTION grammar by styling only.

It must represent:

```text
actor row
feed ordering
POST root
REPLY relation
REPOST attribution action
QUOTE commentary + accepted target preview
accepted target references
```

These are source-family structural semantics already proven by SF-1/2/3.

Presentation may express them; it may not invent them.

## 5. Presentation-only ordering problem

SF-2 preserves original `timelineOrdinal` values after filtering.

Example:

```text
draft timeline ordinals: 0 1 2 3
item at 1 quarantined
validated sidecar:       0 2 3
```

Presentation must not repair semantic data by renumbering `timelineOrdinal`.

However a renderer may need a dense local iteration position for DOM/view purposes.

Selected presentation-only concept:

```text
presentationIndex = 0..visibleItemCount-1
```

Canonical rule:

```text
presentationIndex
!= timelineOrdinal
!= itemOrdinal
!= durable identity
```

It is derived, ephemeral, and never written back to semantic state.

## 6. Actor-row boundary

SOCIAL_TIMELINE_V1 may render only accepted actor fields already present in the validated sidecar:

```text
displayName
handle
```

It may add non-semantic punctuation/affordances such as a literal `@` before a handle.

It must not invent:

```text
avatar
verification badge
bio
followers/following counts
account age
join date
location
external profile URL
```

## 7. Content-bearing item grammar

Presentation must preserve kind distinctions:

```text
POST
REPLY
QUOTE
```

Each may render accepted plain-text semantic content supplied by SF-3.

The adapter may add layout labels such as reply/quote affordances, but it may not rewrite wording into stronger certainty.

## 8. REPOST grammar

SF-2/SF-3 define REPOST as relationship-only.

Therefore SOCIAL_TIMELINE_V1 must not fabricate repost commentary.

Legal presentation concept:

```text
[Actor] reposted
[target preview]
```

Forbidden:

```text
[Actor] agreed
[Actor] endorsed
[Actor] confirmed
```

unless a future semantic schema explicitly supplies such a claim.

## 9. Target preview seam

A dependent item may visually include a bounded preview of its accepted target.

Preview authority is derived only from the same validated sidecar exact `targetItemOrdinal` relation.

Required properties:

```text
same current validated snapshot
accepted target only
read-only
bounded
plain-text/escaped
no new edge
no target lookup outside sidecar
```

A preview may show a safe subset such as:

```text
target actor displayName / handle
target kind
target accepted semantic text
```

The exact visual truncation policy belongs to presentation, but truncation must not create a misleading stronger claim.

## 10. No hidden-target reconstruction

If a target did not survive SF-3, the dependent item itself should already be quarantined by recursive dependency closure.

Therefore the adapter must never attempt fallback reconstruction using:

```text
validation receipt
host transcript
same handle
same text
previous SOCIAL_FEED snapshot
historical source UI
raw source
fuzzy match
```

Unknown target inside validated data is a presentation/contract failure, not a reason to search history.

## 11. Target-preview duplication is presentation duplication only

A target may appear once as its own feed item and again inside a quote/repost/reply preview.

This does not create a second semantic object.

Canonical rule:

```text
ONE VALIDATED ITEM
→ MAY HAVE MULTIPLE VIEW INSTANCES

MULTIPLE VIEW INSTANCES
!= MULTIPLE SEMANTIC IDENTITIES
```

View copies must not gain independent mutation or provenance identity.

## 12. First policy extension

Conceptual SOCIAL_FEED presentation policy:

```text
SourcePresentationPolicyV1
  family = SOCIAL_FEED
  adapterKey = SOCIAL_TIMELINE_V1
  placementIntent = SOURCE_LOCAL_ADJACENT
  themePolicy = HOST_INHERIT
  interactionPolicy = VIEW_LOCAL_ONLY
```

No semantic interaction is authorized.

## 13. Source-scoped DOM root

Preferred family root:

```text
[data-simcore-source-family="social-feed"]
```

Candidate class namespace:

```text
sc-social
sc-social__feed
sc-social__item
sc-social__actor
sc-social__display-name
sc-social__handle
sc-social__content
sc-social__relation
sc-social__target
sc-social__empty
```

Exact class names may be frozen in the detailed SF-4 design.

## 14. CSS isolation boundary

SOCIAL_FEED styling must remain below the source root.

Forbidden unscoped ownership includes selectors such as:

```text
body
.card
.post
.reply
.avatar
.item
button
img
```

No source family may alter host-global typography/layout merely to look more platform-like.

## 15. Plain-text materialization

All model/semantic text remains untrusted plain text.

Future materialization must use escaped/text-node insertion.

Forbidden:

```text
raw semantic HTML
model-provided class names
model-provided inline style
model-provided event handlers
trusted template interpolation of semantic strings
```

## 16. No metrics or media smuggling

Presentation may not infer from graph structure or visual convention:

```text
reply count
repost count
like count
view count
viral/trending status
avatar
post image
verification badge
```

SF-5 owns metrics/media reassessment.

## 17. View-local state

Permitted presentation-only state may include:

```text
target preview expanded/collapsed
local thread detail open/closed
local focus/selection
local scroll/restoration state
responsive layout state
```

It remains:

```text
EPHEMERAL
NON-PERSISTENT
NON-CANONICAL
NON-MODEL-CONTEXT
```

No POST/REPLY/REPOST/QUOTE semantic object changes when UI state changes.

## 18. Accessibility-derived identifiers

The host/adapter may need presentation-only IDs for accessibility or local DOM relationships.

Any such identifier must be derived from a render-instance namespace and local presentation index/semantic ordinal without becoming source identity.

Canonical rule:

```text
DOM ID
!= ITEM IDENTITY
```

## 19. Presentation failure classes

Candidate SF-4 outcomes:

```text
PRESENTATION_READY
PRESENTATION_EMPTY
UNSUPPORTED_ADAPTER
ADAPTER_INPUT_INVARIANT_FAILED
ADAPTER_FAILED
MOUNT_BLOCKED
MOUNT_FAILED
```

These must not alter SF-3 validation outcomes.

## 20. Empty behavior

If validated SOCIAL_FEED is empty and the source surface was intentionally requested:

```text
VALID_EMPTY
→ deterministic source-local empty presentation
```

It must not fall back to raw JSON, a fake post, or old feed content.

## 21. Existing runtime blockers remain

SF-4 does not solve:

```text
ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
```

No hidden JSON/tag transport and no guessed DOM selector may be introduced to bypass these blockers.

## 22. Persistence / Candidate C boundary

Presentation creates no durable social identity.

```text
render instance
presentationIndex
DOM node identity
expanded state
```

must not activate Candidate C.

Candidate C becomes relevant only if presentation state is asked to survive as semantic/durable object state or if old semantic objects become addressable across turns.

## 23. Performance boundary

When SOCIAL_FEED presentation is off or SOCIAL_FEED is not current source job:

```text
SF-4 presentation work = 0
```

When active, rendering cost must scale with the current validated snapshot only.

No historical feed scan is permitted.

## 24. Transaction anomaly record

Before this branch was created, an assistant transaction-order error created one placeholder-only document directly on `main` and immediately removed it.

Recorded administrative commits:

```text
create placeholder: afc7a29906822521e05903b5651dc0357966e686
remove placeholder: 88b3f0a84643ff9bc06ac597cd6094aa25f16b38
```

Classification:

```text
WATCH · SF4_TRANSACTION_ORDER_ERROR
NON_RUNTIME
NON_PRODUCTION
SELF_REVERTED
```

The placeholder never contained semantic design authority and no runtime/product/release surface was modified.

## 25. Impact classification

Expected touched surface for this design checkpoint:

```text
docs only
```

Protected non-impact surface:

```text
products/simcore/** runtime
prompt/output bytes
representation/host history
SnapshotStore/Core version
network/media
release-simcore
production version
S7
```

## 26. Detailed-design questions

The detailed SF-4 design should freeze:

```text
SocialTimelinePresentationModelV1
per-kind presentation read models
exact target-preview policy
visible timeline ordering rule
presentationIndex derivation
source-scoped DOM grammar
CSS namespace/tokens
empty state
view-local interaction boundary
failure isolation / bounded presentation receipt
SF-5 handoff
```

## 27. Closure

Selected seam:

```text
VALIDATED SOCIAL_FEED
→ SOCIAL_TIMELINE_V1
→ presentation-only read model
→ source-scoped DOM/CSS
```

No semantic authority moves into presentation.

Next checkpoint:

```text
SF-4 Presentation Grammar detailed design
```
