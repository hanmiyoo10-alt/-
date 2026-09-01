# SimCore 3M-4 Presentation Renderer Architecture Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **READ-ONLY IMPACT SCOPE COMPLETE · FIRST 3M-4 DESIGN SEAM SELECTED · DESIGN-ONLY · NO RUNTIME IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-4 PRE-DESIGN · PRESENTATION RENDERER · DOM/CSS BOUNDARY · LIVE_REACTION FIRST SLICE**

## 0. Purpose

This document performs the source-backed impact scope required before freezing 3M-4 Presentation Renderer Architecture.

It answers only:

```text
Given a 3M-3 ValidatedSourceSemanticSidecarV1,
what is the narrowest presentation architecture that can render Source Intelligence
without acquiring semantic authority,
persisting view state,
changing model output,
or coupling source families to one global CSS/DOM surface?
```

This transaction is design/research/document work only.

It does not implement a renderer, modify runtime bytes, alter prompt/output syntax, add DOM hooks, inject CSS, persist UI state, touch S7/v0.70.3, or mutate `release-simcore`.

## 1. Authority snapshot

Design/evidence authority at impact-scope start:

```text
main = 69753bc80f44fcd2c5526cb18cd2f4f224b506a4
```

Deployed runtime authority remains independently:

```text
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
version         = 0.70.1 Cold First-Turn Tail Attribution
```

3.0M remains design-only under:

```text
docs/SIMCORE_3M_DESIGN_ONLY_LANGUAGE_CLARIFICATION_2026-09-01.md
```

## 2. Inherited 3M-3 boundary

3M-3 froze the first semantic renderer input as a validated sidecar rather than raw model output.

First supported semantic slice:

```text
family = LIVE_REACTION
mode = C
source = direct B root
sourceAuthorityRef.kind = HANDOFF_EVIDENCE
```

The presentation-relevant semantic object is:

```text
ValidatedSourceSemanticSidecarV1
  schemaVersion = 1
  family = LIVE_REACTION
  projectionOrdinal = 0
  sourceAuthorityRef = validator-confirmed ref
  assertions[] = ALLOW assertions only
```

Each accepted assertion view carries only bounded fields such as:

```text
ordinal
mode
content
reasonCode
```

3M-3 deliberately does not provide:

```text
nickname
avatar
profile
post title
reply graph
media URL
view count
upvote/downvote count
source-specific identity decoration
```

Therefore 3M-4 must not invent any of those fields merely to make the UI richer.

Canonical rule:

```text
PRESENTATION MAY ARRANGE PROVEN SEMANTIC FIELDS
PRESENTATION MAY NOT INVENT MISSING SEMANTIC FIELDS
```

## 3. Existing SimCore UI ownership is not a source renderer

Current deployed SimCore UI is operator/diagnostic-oriented.

The production runtime contains a diagnostic popup/view that can materialize its own document body with inline CSS and bounded operator information.

That surface is observability UI, not Source Intelligence presentation authority.

The existing runtime also preserves UI lifecycle/reload safety and requires stale runtime UI to be retired on targeted replacement.

Important consequence:

```text
CURRENT DIAGNOSTIC PANEL
!=
3M SOURCE PRESENTATION RENDERER
```

3M-4 must not turn the diagnostic panel into a user-facing social/source rendering engine.

Reasons:

- diagnostic information and source semantics have different audiences and ownership;
- diagnostic popup CSS is currently broad/document-local and not a reusable source-family contract;
- source rendering will eventually need per-turn/per-source instance isolation;
- diagnostic UI may display validator metadata that ordinary source UI must not expose.

## 4. Existing architecture boundaries

Frozen M2 architecture currently distinguishes:

```text
Domain
Validation
Representation
Application
Observability
Runtime
```

No current Core module owns arbitrary user-facing source DOM/CSS.

Existing relevant owners remain:

| Concern | Existing owner | 3M-4 consequence |
| --- | --- | --- |
| source semantic validity | future 3M-3 validator contract | renderer consumes only validated payload |
| source identity/provenance | Handoff / Evidence / Lineage | renderer does not reinterpret |
| current Community parsing | Community | legacy output compatibility only |
| response structural safety | Structure | renderer does not become output judge |
| host/canonical/Fresh identity | Representation | not semantic source identity |
| diagnostic rendering | outer/runtime observability UI | remain separate |
| runtime generation/UI disposal | Runtime lifecycle/hooks | future renderer host must respect stale-runtime cleanup |
| persistence | Store | 3M-4 first design requires none |

3M-4 should introduce no duplicate semantic validator, source registry, or state owner.

## 5. Reference findings that directly apply

LightBoard/MiniBoard research provides multiple convergent presentation rules.

### Semantic payload / renderer separation

```text
SEMANTIC_PAYLOAD
!=
PRESENTATION_ADAPTER
```

The Live Chat reference demonstrates one semantic payload rendered by multiple presentation adapters without semantic regeneration.

### Intent-only renderer boundary

MomoTalk shows a renderer can own display and narrow UI intent capture without owning the underlying semantic mutation.

For the 3M-4 first slice, even semantic intents are deferred; only ephemeral local view interactions may exist conceptually.

### Ephemeral UI state

```text
selected item
expanded/collapsed section
popover state
local scroll position
```

must remain presentation-local unless a future product contract proves persistence is required.

### Per-render instance isolation

Historical source renders must not share accidental DOM ids, CSS selectors, or mutable UI state.

### Renderer totality

```text
VALID EMPTY PAYLOAD
!=
INVALID PAYLOAD
!=
RENDER FAILURE
```

### Presentation failure quarantine

Renderer failure must not corrupt or invalidate the upstream semantic sidecar.

### Vertical feature-gate closure

If source rendering is disabled:

```text
no mount
no family CSS
no event listener
no presentation state
```

must remain the preferred eventual behavior.

## 6. First semantic gap: 3M-3 data is intentionally sparse

3M-4 cannot yet render a full SNS/board/news experience because those family schemas do not exist.

For LIVE_REACTION first slice, the renderer can safely know only:

```text
family
projection ordinal
accepted assertion order
assertion mode
plain-text content
validator-derived accepted reason code if needed internally
```

It must not derive semantic author identity from current Community platform taxonomy or arbitrary text.

It must not map `CONFIRMED_FACT`, `ATTRIBUTED_SOCIAL`, or `INFERENCE_OPINION` into stronger user-visible factual claims.

A future richer source family must extend the semantic schema first and the renderer second.

## 7. Validation receipt must not become ordinary render input

3M-3 separates:

```text
ValidatedSourceSemanticSidecarV1
```

from:

```text
SourceSemanticSidecarValidationReceiptV1
```

The validation receipt may contain counts and quarantine reason metadata for diagnostics.

3M-4 ordinary source presentation should **not** consume the validation receipt by default.

Reasons:

- denied/held assertion counts can reveal that hidden or unsupported material existed;
- validation reason codes are operator semantics, not source-world content;
- renderer access to quarantined metadata creates an unnecessary leak surface.

Canonical rule:

```text
ORDINARY SOURCE RENDER INPUT
= VALIDATED SIDECAR ONLY
```

Diagnostics may separately inspect the validation receipt through existing observability boundaries.

## 8. Candidate presentation seams

### Option A · Reuse diagnostic popup renderer

Rejected.

```text
REJECT · DIAGNOSTIC_UI_AS_SOURCE_RENDERER
```

Would conflate observability with product presentation.

### Option B · Render raw model output / `<COMMUNITY>` directly into HTML

Rejected.

```text
REJECT · RAW_GENERATED_TEXT_TO_HTML
```

Violates schema-first rendering and presentation safety.

### Option C · Add source-specific CSS over existing Community prose only

Rejected as the 3M architecture seam.

CSS skinning alone cannot represent future BOARD / SOCIAL_FEED / NEWS DOM grammars and would couple presentation to legacy unstructured prose.

```text
REJECT · CSS_ONLY_LEGACY_COMMUNITY_SKIN
```

### Option D · Validated sidecar → family adapter → scoped presentation model → host materialization

Selected.

```text
SELECTED · VALIDATED_SOURCE_PRESENTATION_ADAPTER
```

Conceptual flow:

```text
ValidatedSourceSemanticSidecarV1
        ↓
trusted PresentationPolicy
        ↓
family renderer registry
        ↓
LIVE_REACTION presentation adapter
        ↓
source-scoped presentation tree/model
        ↓
future host mount/materialization adapter
```

This keeps semantic validation upstream and host DOM authority downstream.

## 9. First 3M-4 design seam

Selected seam:

```text
VALIDATED_LIVE_REACTION_PRESENTATION_ADAPTER
```

First design scope:

```text
input family = LIVE_REACTION
input semantic state = already validated
input assertion content = plain text
output = presentation-only read model / DOM intent
semantic mutation = NONE
persistence = NONE
model context re-entry = NONE
source-family expansion = NONE
```

The first renderer architecture is therefore a **read-only presentation consumer**.

It does not yet include:

```text
new post
new comment
reroll
delete
vote
source switching
media loading
remote asset loading
semantic selection that changes source state
```

## 10. Presentation-policy ownership must remain separate

3M-3 sidecar should not be rewritten whenever a user-facing layout changes.

3M-4 should therefore add a separate conceptual trusted input:

```text
SourcePresentationPolicyV1
```

owned by plugin presentation policy, not the main model.

Minimum conceptual fields may include:

```text
family
adapterKey
themePolicy
placementIntent
```

This object chooses presentation behavior but cannot change semantic acceptance.

Canonical rule:

```text
PRESENTATION POLICY CHANGE
!=
SIDECAR SEMANTIC IDENTITY CHANGE
```

Exact UI preferences and adapter variants belong to the concrete 3M-4 design, not this impact map.

## 11. Host mount authority is currently unproven

Current SimCore does not have a proven per-message Source Intelligence mount API/contract.

The existing diagnostic UI proves SimCore can render operator UI, but it does not prove the correct host attachment mechanism for source cards adjacent to assistant turns.

Therefore:

```text
BLOCKER · ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

This blocks runtime implementation/integration, not design work.

3M-4 may freeze a host-independent renderer contract while leaving exact host mounting for a separate future integration proof.

Do not guess CSS selectors or mutate arbitrary chat DOM from remembered host structure.

## 12. 3M-3 production transport is also not authorized

3M-3 currently has no active runtime producer/transport for the structured sidecar.

Therefore:

```text
BLOCKER · ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
```

Again, this blocks active renderer integration only.

3M-4 design can consume the frozen semantic contract abstractly/offline without authorizing a new model output block.

## 13. Security / materialization boundary

Future host materialization must follow:

```text
validated plain semantic text
→ escaped/text-node insertion
```

not:

```text
model text
→ string-concatenated trusted innerHTML
```

Static plugin-owned markup/templates may be used by a future implementation, but semantic text must remain escaped/untrusted.

No external font/CDN/media dependency is required for the core first renderer.

## 14. CSS ownership target

Preferred future CSS architecture:

```text
shared source presentation tokens
        ↓
family-scoped renderer namespace
        ↓
per-render instance subtree
```

Conceptual namespace:

```text
[data-simcore-source-family="live-reaction"]
```

Future family roots should not require global selectors such as:

```text
body
.card
.comment
button
```

without a SimCore source-root prefix.

Canonical rules:

```text
NO GLOBAL CSS POLLUTION
NO FAMILY CSS AS SEMANTIC AUTHORITY
NO PRESENTATION SELECTOR AS SOURCE IDENTITY
```

## 15. Per-render identity boundary

A renderer may need an instance-local DOM identity for labels, details/popovers, or responsive state.

That identity must be presentation-only.

```text
renderInstanceKey
!=
sourceAuthorityRef
!=
assertion ordinal
!=
reroll lineage id
```

Multiple historical instances must not accidentally control each other.

Exact ID generation remains implementation detail.

## 16. Valid empty and quarantine behavior

Input states relevant to presentation:

```text
VALID_EMPTY
VALID
VALID_WITH_QUARANTINE
```

Renderer behavior:

```text
VALID_EMPTY
→ deterministic empty presentation if a source surface is intentionally mounted

VALID
→ render accepted assertions

VALID_WITH_QUARANTINE
→ render accepted assertions only
```

The renderer does not receive DENY/HOLD content and should not expose quarantine counts by default.

`QUARANTINED`, `UNSUPPORTED_SCOPE`, and `INVALID` do not produce ordinary semantic source content.

Exact fallback visibility belongs to the 3M-4 design.

## 17. Presentation failure quarantine

Required future invariant:

```text
renderer/materialization failure
→ semantic sidecar remains valid upstream
→ source presentation fails closed / falls back locally
→ no semantic state rewrite
→ no source-authority mutation
```

A presentation exception must never be used to downgrade or repair the semantic object.

## 18. Legacy Community relationship

3M-1 keeps current `<COMMUNITY>` behavior as compatibility authority.

3M-4 must not silently replace it yet.

During future migration:

```text
legacy Community output
and
new structured source presentation
```

must have an explicit product integration decision preventing accidental double-rendering.

Therefore:

```text
DEFER · LEGACY_COMMUNITY_TO_PRESENTATION_MIGRATION
```

until active structured transport and host mount are proven.

## 19. Non-impact boundaries

3M-4 design must preserve:

```text
Mode A/B/C semantics
Broadcast lifecycle
Community parsing/platform taxonomy
Reaction numbering/history
Structure state-commit judgment
Handoff/Evidence/Lineage authority
Frame/Time/Continuity
Representation/Edit Reconcile identity rules
Prompt bytes
assistant output bytes
persistent schema
SnapshotStore keys
network/provider behavior
S7/v0.70.3 transaction
release-simcore
```

## 20. Selected next design questions

The concrete 3M-4 design should freeze only:

1. Presentation Renderer authority classes.
2. `SourcePresentationPolicyV1` minimum contract.
3. family renderer registry contract.
4. first `LIVE_REACTION` presentation model.
5. escaping/materialization rules.
6. CSS namespace/token rules.
7. per-render instance isolation.
8. valid-empty / invalid / renderer-failure behavior.
9. local ephemeral view-state boundary.
10. explicit blockers for host mount and active sidecar transport.

It must not yet design BOARD/SOCIAL_FEED/NEWS field schemas.

## 21. Verdict

```text
3M_4_IMPACT_SCOPE = COMPLETE
FIRST_DESIGN_SEAM = VALIDATED_LIVE_REACTION_PRESENTATION_ADAPTER
RUNTIME_IMPLEMENTATION = NOT_AUTHORIZED
HOST_MOUNT = BLOCKED_UNPROVEN
ACTIVE_SIDECAR_TRANSPORT = NOT_AUTHORIZED
PERSISTENCE = NONE
SEMANTIC_AUTHORITY_DELTA = NONE
```

3M-4 can proceed as a host-independent presentation architecture design while preserving the current product/runtime boundary.