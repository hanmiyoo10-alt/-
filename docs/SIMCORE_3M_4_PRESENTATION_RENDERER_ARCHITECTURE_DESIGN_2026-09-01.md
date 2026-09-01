# SimCore 3M-4 Presentation Renderer Architecture Design — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-4 DESIGN FROZEN · HOST-INDEPENDENT PRESENTATION CONTRACT · LIVE_REACTION_STREAM_V1 SELECTED · RUNTIME MOUNT / SIDECAR TRANSPORT NOT AUTHORIZED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-4 · PRESENTATION RENDERER · SOURCE-SCOPED DOM/CSS · LIVE_REACTION FIRST ADAPTER**

## 0. Purpose

3M-4 freezes the first Presentation Renderer architecture under the 3.0M Source Intelligence major.

It answers:

```text
Given a validated Source Intelligence semantic object,
who may choose its presentation,
what the family renderer may consume,
what the host-facing materializer may do,
and which UI state must remain presentation-only?
```

This checkpoint is design-only.

It does not implement DOM/CSS, install a chat renderer, change model output, authorize structured sidecar transport, alter persistent state, or mutate `release-simcore`.

## 1. Authority chain

This design consumes:

```text
docs/SIMCORE_GUIDELINES.md
docs/SIMCORE_CONTRACTS_V2.md
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_LIGHTBOARD_MINIBOARD_TOTAL_SYNTHESIS_2026-09-01.md
docs/SIMCORE_REFERENCE_ANALYSIS_MINIBOARD_MOMOTALK_RENDERER_1_0_0_2026-09-01.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_LIVECHAT_2026-09-01.md
docs/SIMCORE_3M_DESIGN_ONLY_LANGUAGE_CLARIFICATION_2026-09-01.md
```

Deployed runtime remains independently authoritative on `release-simcore`.

## 2. Terminology freeze

3M-4 permanently distinguishes:

```text
Semantic Renderer
= main model
= produces natural-language semantic content under SimCore policy

Presentation Renderer
= plugin-owned presentation layer
= turns already validated semantic data into source-specific UI
```

Canonical rule:

```text
SEMANTIC RENDERER
!=
PRESENTATION RENDERER
```

A future document must not use the single word `renderer` when the distinction is material.

## 3. First supported presentation scope

The only 3M-4 family authorized by this design contract is:

```text
family = LIVE_REACTION
```

Input semantic authority:

```text
ValidatedSourceSemanticSidecarV1
```

Only sidecar states that contain validated renderable semantic data may reach ordinary presentation.

Supported ordinary presentation cases:

```text
VALID_EMPTY
VALID
VALID_WITH_QUARANTINE
```

For `VALID_WITH_QUARANTINE`, only ALLOW assertions already present in the validated sidecar are visible to the renderer.

The renderer does not receive quarantined assertion content.

## 4. Presentation authority classes

3M-4 freezes five distinct ownership classes.

### A. Validated semantic source

Owner:

```text
3M-3 validator contract
```

Provides accepted semantic content only.

Presentation cannot modify semantic acceptance.

### B. Presentation policy

Conceptual owner:

```text
Source Presentation Policy
```

Chooses a legal adapter and bounded presentation options.

It is plugin-owned policy, not model-authored data.

### C. Family presentation adapter

Conceptual owner:

```text
Source Presentation Adapter
```

Pure presentation transformation.

It maps validated semantic data into a presentation read model.

It does not touch the host DOM directly.

### D. Presentation host/materializer

Conceptual owner:

```text
Source Presentation Host
```

Future host-facing effect boundary.

It may materialize approved static markup, escaped text nodes, source-scoped styles, mount/update/unmount lifecycle, and local view state.

It has no semantic mutation authority.

### E. Ephemeral view state

Presentation-only state such as:

```text
expanded/collapsed
local detail selection
popover open/closed
local scroll position
responsive panel state
```

This state is memory/view-local by default.

It is not Source Intelligence semantic state.

## 5. Canonical 3M-4 pipeline

Frozen architecture:

```text
ValidatedSourceSemanticSidecarV1
        ↓
SourcePresentationPolicyV1
        ↓
PresentationRendererRegistry
        ↓
LIVE_REACTION_STREAM_V1 adapter
        ↓
LiveReactionPresentationModelV1
        ↓
Source Presentation Host
        ↓
source-scoped DOM + CSS
```

No earlier stage may call upward into the host materializer for semantic decisions.

## 6. `SourcePresentationPolicyV1`

3M-4 freezes a separate presentation-policy concept so UI changes do not rewrite semantic sidecar identity.

First-slice conceptual shape:

```text
SourcePresentationPolicyV1
  schemaVersion = 1
  family = LIVE_REACTION
  adapterKey = LIVE_REACTION_STREAM_V1
  placementIntent = SOURCE_LOCAL_ADJACENT
  themePolicy = HOST_INHERIT
  interactionPolicy = VIEW_LOCAL_ONLY
```

### `family`

Must equal the validated sidecar family.

Mismatch:

```text
PRESENTATION_POLICY_FAMILY_MISMATCH
```

### `adapterKey`

Must be registered for the exact family.

No generic arbitrary-family adapter is used as an automatic fallback.

### `placementIntent`

First conceptual value:

```text
SOURCE_LOCAL_ADJACENT
```

Meaning:

- presentation belongs to the same source/assistant projection context;
- it is not a global dashboard;
- it is not a full-document takeover;
- exact host mount selector/API is deliberately **not** frozen here.

### `themePolicy`

First value:

```text
HOST_INHERIT
```

No semantic object changes because the host is light/dark or because visual tokens change.

### `interactionPolicy`

First value:

```text
VIEW_LOCAL_ONLY
```

3M-4 does not authorize source mutation intents.

## 7. Presentation policy cannot become semantic authority

Forbidden presentation-policy effects:

```text
change assertion mode
change reason code
turn DENY/HOLD into ALLOW
invent author identity
invent source identity
rewrite content for stronger certainty
publish hidden metadata
change provenance
persist source state
```

Canonical rule:

```text
PRESENTATION POLICY
CAN SELECT VIEW
CANNOT SELECT TRUTH
```

## 8. Renderer registry contract

Conceptual registry:

```text
PresentationRendererRegistry
  LIVE_REACTION
    → LIVE_REACTION_STREAM_V1
```

First design permits exactly one active adapter key for LIVE_REACTION.

Future adapters may be added only by explicit design.

Potential future examples such as:

```text
LIVE_REACTION_BROADCAST_COMMENTS_V1
LIVE_REACTION_CHAT_DENSE_V1
```

are reserved ideas only and are not authorized by 3M-4.

Unknown family or unknown adapter:

```text
FAIL CLOSED
NO ORDINARY SOURCE MATERIALIZATION
```

Do not silently route an unknown schema through a generic renderer.

## 9. First adapter: `LIVE_REACTION_STREAM_V1`

The first renderer is intentionally modest because 3M-3 semantic data is intentionally sparse.

It consumes only:

```text
family
projectionOrdinal
accepted assertion order
assertion ordinal
assertion mode
plain-text content
```

It must not require:

```text
nickname
avatar
profile image
post title
reply hierarchy
vote count
viewer count
media
external URL
```

Those become legal only after a future family schema explicitly owns them.

## 10. `LiveReactionPresentationModelV1`

Conceptual pure read model:

```text
LiveReactionPresentationModelV1
  kind = LIVE_REACTION_STREAM
  projectionOrdinal
  items[]
  empty
```

Each item contains only bounded presentation-safe semantic fields:

```text
LiveReactionPresentationItemV1
  ordinal
  mode
  text
```

`text` is the accepted assertion content unchanged as semantic plain text.

`mode` may be available for bounded presentation semantics but does not require a user-visible technical badge.

### No technical-policy leakage

Ordinary UI must not display by default:

```text
ALLOW_KNOWN_PUBLIC_FACT
DENY_UNEXPOSED_PRIVATE_CONFIRMATION
HOLD_UNPROVEN_POLICY_COMBINATION
validator reason codes
quarantine counts
source fingerprints
Handoff/Evidence indices
```

Those remain diagnostics/observability material.

## 11. Mode styling boundary

`CONFIRMED_FACT`, `ATTRIBUTED_SOCIAL`, and `INFERENCE_OPINION` are semantic modes already accepted by 3M-3.

The renderer may preserve presentation distinctions that do not strengthen semantic certainty.

Safe direction:

```text
same semantic wording
+ bounded layout/iconographic distinction if later desired
```

Unsafe direction:

```text
INFERENCE_OPINION
→ visually restyled as authoritative news/fact
```

The first `LIVE_REACTION_STREAM_V1` does not require materially different certainty styling.

The content wording remains the primary semantic expression.

## 12. Valid-empty behavior

If the validated semantic state is `VALID_EMPTY` and a source surface is intentionally requested:

```text
render deterministic empty source state
```

not:

```text
throw
show raw JSON
pretend renderer missing
```

Exact user-facing empty copy is not frozen in this architecture document.

Canonical distinction:

```text
VALID EMPTY
!=
INVALID
!=
RENDER FAILURE
```

## 13. Quarantine presentation rule

For `VALID_WITH_QUARANTINE`:

```text
Presentation Renderer receives only accepted semantic sidecar assertions.
```

It must not infer the existence or content of denied/held claims from a separate validation receipt.

Ordinary source presentation therefore does not expose:

```text
hidden assertion count
hidden assertion reason
hidden assertion text
```

by default.

## 14. Validation receipt separation

`SourceSemanticSidecarValidationReceiptV1` belongs to diagnostics/validation evidence.

It is not ordinary presentation input.

Canonical boundary:

```text
ValidatedSourceSemanticSidecarV1
→ Source Presentation

ValidationReceipt
→ Observability / diagnostics only
```

No renderer feature may require reading the receipt merely for visual decoration.

## 15. Presentation materialization safety

Future Source Presentation Host must treat semantic text as untrusted plain text.

Required boundary:

```text
plugin-owned static structure
+
textContent / createTextNode / equivalent escaped insertion
```

Forbidden:

```text
`<div>${assertion.text}</div>` as trusted HTML
raw semantic HTML
model-provided style attributes
model-provided arbitrary class names
model-provided script/event attributes
```

3M-4 does not authorize markdown-to-HTML or arbitrary rich-text parsing inside source assertions.

## 16. CSS architecture

3M-4 freezes source-scoped CSS ownership.

Preferred root contract:

```text
[data-simcore-source-family="live-reaction"]
```

Preferred class namespace concept:

```text
sc-source
sc-source__header
sc-source__list
sc-source__item
sc-source__empty
```

Shared presentation tokens may use a bounded namespace such as:

```text
--sc-source-bg
--sc-source-fg
--sc-source-border
--sc-source-muted
--sc-source-radius
--sc-source-gap
```

Exact visual values are not frozen by this architecture contract.

### Forbidden global pollution

No unscoped family stylesheet should own generic selectors such as:

```text
body
.card
.comment
.item
button
img
```

outside the SimCore source root.

## 17. Theme rule

First policy:

```text
HOST_INHERIT
```

The renderer should prefer inherited/current host presentation context plus SimCore-scoped fallback tokens.

No external font/CDN/theme dependency is required.

Canonical rule:

```text
THEME CHANGE
!=
SEMANTIC PAYLOAD CHANGE
```

## 18. Per-render instance isolation

Each mounted source surface may require a presentation-only instance key.

Conceptual field:

```text
renderInstanceKey
```

Its only authority is DOM/view isolation.

It may namespace:

```text
aria relationships
local details/popover ids
local control groups
local CSS state hooks
```

It must never become:

```text
sourceAuthorityRef
assertion identity
cross-turn object identity
reroll lineage identity
```

Multiple historical renders must not accidentally share mutable UI controls.

## 19. Ephemeral view-state contract

The first adapter is read-only semantically.

Permitted conceptual local state:

```text
expanded/collapsed presentation
local detail visibility
local responsive state
local scroll state
```

These are:

```text
memory/view-local
non-persistent
non-model-context
non-canonical
```

No source object changes when view state changes.

## 20. Interaction boundary

3M-4 does not authorize semantic interaction intents such as:

```text
ADD_POST
ADD_COMMENT
REROLL
DELETE
VOTE
CHANGE_SOURCE
```

The renderer architecture is intentionally capable of future intent-only interaction, but that requires a separate checkpoint.

Current policy:

```text
interactionPolicy = VIEW_LOCAL_ONLY
```

## 21. Presentation host lifecycle

Future Source Presentation Host must support conceptually:

```text
mount
update
unmount
runtime disposal cleanup
stale-generation rejection
```

The host must obey current SimCore runtime-generation safety.

A disposed/replaced runtime may not leave an active source renderer behind.

This mirrors the existing targeted-update invariant:

```text
one active runtime generation
→ one authoritative UI effect owner
```

Exact host API integration remains unproven and is not authorized here.

## 22. Host placement rule

Conceptual placement is frozen only as:

```text
SOURCE_LOCAL_ADJACENT
```

This means the source UI belongs near/with the semantic source projection rather than in the global diagnostic panel.

This does **not** freeze:

```text
CSS selector
DOM traversal
message element class
host event callback
low-level access method
```

Runtime implementation remains blocked until the actual host mount authority is proven.

Classification:

```text
BLOCKER · ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

## 23. Sidecar transport blocker

3M-3 structured sidecar is not currently produced/transported by production runtime.

Therefore active 3M-4 integration also remains blocked by:

```text
BLOCKER · ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
```

3M-4 design consumes the semantic contract abstractly.

It does not solve the transport problem by hiding JSON in assistant output.

## 24. Presentation failure quarantine

Presentation failures must remain local.

Conceptual result classes:

```text
PRESENTATION_READY
PRESENTATION_EMPTY
UNSUPPORTED_ADAPTER
ADAPTER_FAILED
MOUNT_BLOCKED
MOUNT_FAILED
```

A failure may create bounded diagnostics but must not:

```text
rewrite semantic sidecar
change source authority
change validation disposition
persist a repair
retry through a model call
fall back to raw semantic JSON/HTML
```

Canonical rule:

```text
PRESENTATION FAILURE
!=
SEMANTIC FAILURE
```

## 25. Bounded presentation diagnostics

A future presentation layer may expose a memory-only bounded receipt conceptually like:

```text
SourcePresentationReceiptV1
  family
  adapterKey
  status
  renderedItemCount
  failureCode
```

It must not retain:

```text
assertion text
raw source bodies
hidden/quarantined content
DOM HTML snapshot
CSS text snapshot
```

This receipt is observability only.

It is not persistent semantic state.

## 26. Feature-gate closure

If future Source Presentation is disabled:

```text
no renderer registry dispatch
no source mount
no source CSS registration
no source event listener
no view-state allocation
```

The semantic source pipeline may still exist independently if another consumer needs it, but the presentation feature itself must close vertically.

A presentation OFF state must not leave ghost CSS or stale DOM.

## 27. Legacy Community migration boundary

Current production `<COMMUNITY>` remains unchanged.

3M-4 does not replace or duplicate it.

Future active migration must explicitly choose one behavior to avoid double presentation:

```text
legacy Community presentation
OR
structured Source Presentation
```

for the same semantic source slot.

Until that separate integration contract exists:

```text
DEFER · LEGACY_COMMUNITY_TO_PRESENTATION_MIGRATION
```

## 28. Future source-family extension rule

3M-4 deliberately does not prebuild BOARD, SOCIAL_FEED, NEWS, or PUBLIC_KNOWLEDGE renderers.

Each future family must first prove its own semantic schema.

Then:

```text
validated family schema
→ family adapter
→ family-scoped presentation model
→ same Source Presentation Host boundary
```

Examples of future DOM grammars may include:

```text
BOARD          → thread/list/detail
SOCIAL_FEED    → profile/post/reply/repost feed
NEWS           → publication/article/card
PUBLIC_KNOWLEDGE → document/section/navigation
```

These are architectural extension targets, not 3M-4 active designs.

## 29. Why 3M-4 is more than a CSS skin

Frozen architectural statement:

```text
SOURCE FAMILY PRESENTATION
MAY CHANGE DOM GRAMMAR
NOT ONLY COLOR/THEME
```

The semantic object remains upstream and stable.

Future visual differentiation may therefore be substantial without allowing CSS/DOM to become semantic authority.

This is the key bridge from current generic `<COMMUNITY>` presentation toward the richer external rendering direction of 3.0M.

## 30. Non-impact boundaries

3M-4 freezes no change to:

```text
Mode A/B/C
Broadcast lifecycle
Frame/Time/Continuity
Handoff/Evidence/Lineage
Community parser/platform taxonomy
Reaction grammar/history
Structure judge
Representation/Edit Reconcile
Prompt
assistant output bytes
persistent schema
Store
network/provider behavior
S7/v0.70.3
release-simcore
```

## 31. Design verification matrix

| Case | Required 3M-4 design result |
| --- | --- |
| valid LIVE_REACTION sidecar + legal policy | registry selects `LIVE_REACTION_STREAM_V1` |
| family mismatch | fail closed |
| unknown adapter | fail closed |
| valid empty | deterministic empty presentation model |
| valid with quarantine | accepted assertions only |
| quarantine receipt exists | ordinary renderer does not read it |
| semantic text contains HTML/script-like text | treat as plain text, never trusted markup |
| theme changes | semantic sidecar unchanged |
| two historical instances | view identity isolated |
| view expand/collapse | no semantic/persistent mutation |
| adapter failure | semantic sidecar preserved |
| mount unavailable | presentation blocked, semantic sidecar preserved |
| feature OFF | no DOM/CSS/listener/view-state effect |
| runtime replacement | future mount must be disposable/stale-safe |

## 32. Checkpoint verdict

```text
3M_4_PRESENTATION_RENDERER_ARCHITECTURE = DESIGN_FROZEN
FIRST_FAMILY = LIVE_REACTION
FIRST_ADAPTER = LIVE_REACTION_STREAM_V1
SEMANTIC_INPUT = VALIDATED_SIDECAR_ONLY
VALIDATION_RECEIPT_RENDER_INPUT = NO
PRESENTATION_POLICY = SEPARATE_PLUGIN_OWNED_AXIS
DOM/CSS = SOURCE_SCOPED
VIEW_STATE = EPHEMERAL_ONLY
SEMANTIC_INTERACTION = NOT_AUTHORIZED
PERSISTENCE = NONE
HOST_MOUNT = BLOCKED_UNPROVEN
ACTIVE_SIDECAR_TRANSPORT = NOT_AUTHORIZED
RUNTIME_IMPLEMENTATION = NOT_AUTHORIZED
```

## 33. Next 3.0M design checkpoint

After 3M-4, the next product-design question returns to the master sequence:

```text
3M-5 · First New Source Family
```

Candidate selection remains:

```text
BOARD
or
SOCIAL_FEED
```

3M-5 should select exactly one first new family and design its semantic schema + presentation requirements without implementing runtime code.