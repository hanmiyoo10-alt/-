# SimCore Reference Analysis - Miniboard MomoTalk Renderer 1.0.0

Date: 2026-09-01 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
♦️미니보드 렌더러 · 모모톡 1.0.0.charx
```

Archived source authority:

```text
references/simcore-plugin-idea-drop-2026-08-31/
```

Archived artifact identity:

```text
bytes  = 17540
sha256 = 894392b57dedfff7a16d3367ed6affbbd9ef122f2afab4b735c88d9f2a9baac1
```

This document analyzes the archived reference as an idea source. It does not authorize copying third-party implementation and does not alter SimCore runtime behavior, `release-simcore`, `plugins/simcore/latest.js`, `plugins/simcore/install.js`, the active S7 release transaction, or any frozen architecture boundary.

---

## 1. Executive finding

MomoTalk is not primarily a new generation system.

It is a **renderer pack** layered on top of the existing Miniboard semantic contract.

The strongest evidence is architectural absence:

```text
model-generation prompt ownership     none
Miniboard parsing ownership           none
Miniboard validation ownership        none
interaction execution ownership       none
history mutation implementation       none in renderer
low-level host access                  false
```

What it does own is narrow:

```text
MiniboardRenderData -> MomoTalk presentation
presentation-local selection state
responsive list/detail layout
visual theme projection
interaction intent emission
icon/display assets
empty-state rendering
```

This makes the module a stronger example of least-privilege renderer architecture than the earlier Miniboard reference itself.

The highest-value SimCore ideas extracted here are:

1. **Intent-Only Renderer Boundary**
2. **Ephemeral UI State Plane**
3. **Per-Render Instance Isolation**
4. **Renderer Totality over Valid Empty Data**
5. **Presentation-Only Theme Projection**
6. **Schema-Preserving Skin Swap**

Several of these reinforce earlier LightBoard findings rather than creating new implementation authority.

---

## 2. CHARX anatomy

The `.charx` is a ZIP-based character-card package.

Observed members:

```text
assets/icon/image/main.png
card.json
module.risum
x_meta/main.json
```

`card.json` identifies:

```text
spec            = chara_card_v3
spec_version    = 3.0
name            = ♦️미니보드 렌더러 · 모모톡 1.0.0
characterVersion= 1.0.0
creatorNotes    = ♦️미니보드, 모모톡, for 미니보드 4.1.1+
```

The RisuAI extension surface reports:

```text
moduleNamespace = lb-mini-momotalk
lowLevelAccess  = false
viewScreen      = none
```

The card contains two character-book entries:

```text
lb-mini.renderer
LICENSE
```

The renderer itself is approximately:

```text
268 Lua lines
7665 characters
4 local functions
```

The presentation stylesheet is approximately:

```text
803 CSS/template lines
16241 characters
3 @container theme rules
3 @media responsive/interaction sections
```

---

## 3. Embedded module anatomy

The bundled `module.risum` uses the standard Risu RPack envelope:

```text
magic       0x6f
version     0
u32 LE JSON payload length
byte-substitution encoded JSON
0x00 terminator
```

Decoded module identity:

```text
name = ♦️미니보드 렌더러 · 모모톡 1.0.0 Module
id   = 232b47c5-9a13-51a4-808a-a7444b4c5fb7
```

Its contents are notably narrow:

```text
triggers  = 0
regex     = 6
lorebook  = 2
```

The two lorebook entries are again:

```text
lb-mini.renderer
LICENSE
```

The `lb-mini.renderer` Lua content in `module.risum` is byte-for-byte text-equivalent to the renderer entry in `card.json`.

The six regexes are display-only icon replacements for:

```text
change board
reroll
speech bubble
thumbs down
thumbs up
write
```

There is no second hidden generation engine in the bundled module.

### Classification

```text
SOURCE-GROUNDED · RENDERER_PACK_NOT_GENERATOR
```

---

## 4. Schema-Preserving Skin Swap

The renderer accepts conceptually:

```text
render(triggerId, data, options)
```

where `data` is already a `MiniboardRenderData` object.

The renderer directly consumes fields such as:

```text
data.attributes.name
posts[].author
posts[].title
posts[].time
posts[].upvotes
posts[].downvotes
posts[].content
posts[].comments[]
```

It does not redefine the semantic schema merely because the UI looks different.

This is the cleanest concrete demonstration in the current reference batch of:

```text
SAME SEMANTIC PAYLOAD
+ DIFFERENT VIEW ADAPTER
= DIFFERENT PRODUCT FEEL WITHOUT SEMANTIC DRIFT
```

### SimCore relevance

This reinforces the earlier Miniboard finding that representation and presentation should remain separate.

A future SimCore diagnostic or optional observation surface should prefer:

```text
stable semantic receipt
      ↓
renderer adapter
      ↓
compact / detailed / alternative presentation
```

rather than changing the semantic receipt whenever the UI changes.

### Classification

```text
REINFORCES EXISTING · SEMANTIC_PAYLOAD_RENDERER_DECOUPLING
```

---

## 5. Intent-Only Renderer Boundary

This is the strongest new contribution of MomoTalk.

The renderer emits interaction tokens such as:

```text
lb-interaction__lb-mini__AddComment/Title:<post title>
lb-interaction__lb-mini__AddPost
lb-interaction__lb-mini__ChangeBoard
lb-reroll__lb-mini
lb-mini-delete/<chat>_<post>[_<comment>]
```

But it does not execute those semantic mutations itself.

The view knows enough to say:

```text
"the user wants to add a post"
"the user wants to comment on this post"
"the user wants this item deleted"
```

while another owner remains responsible for deciding how that request mutates authoritative data.

This produces a useful boundary:

```text
renderer
  owns presentation + user intent capture
  does not own semantic mutation authority
```

### SimCore relevance

If SimCore ever gains richer diagnostic or sidecar interactions, the transferable rule is:

> A renderer may emit a bounded intent, but should not silently acquire the authority to mutate runtime/session/history state.

The downstream semantic owner should validate the target, authority, provenance, and allowed effect class.

### Classification

```text
PROMISING · INTENT_ONLY_RENDERER_BOUNDARY
```

This is a design principle, not authorization for a new UI subsystem.

---

## 6. Ephemeral UI State Plane

MomoTalk maintains significant local interaction state without writing semantic state.

Examples:

```text
post selection = hidden radio inputs
mobile list open/closed = hidden checkbox
popover open/closed = HTML popover/dialog state
hover state = CSS media rules
```

The selected post panel is controlled by generated CSS selectors attached to radio state.

The mobile list pane is controlled by checkbox state.

These choices do not need to become model context, history state, or persistent Miniboard data.

This reveals a useful separation:

```text
SEMANTIC STATE
what the board contains

EPHEMERAL VIEW STATE
which post is currently selected
whether a list panel is open
whether a popover is open
```

### SimCore relevance

A future UI should avoid persisting interaction details merely because they are visible on screen.

Potential examples:

```text
expanded diagnostic section
selected telemetry tab
opened receipt detail
local sort/filter choice
```

should remain view-local unless product semantics explicitly require persistence.

### Classification

```text
PROMISING · EPHEMERAL_UI_STATE_PLANE
```

---

## 7. Per-Render Instance Isolation

Every render creates a local instance identifier:

```text
lb-momo-<random number>
```

That identifier namespaces:

```text
popover id
post radio ids
radio group name
list-toggle id
CSS selection rules
```

This avoids one historical rendered board accidentally controlling another board's UI state.

The package also scopes CSS under:

```text
[data-id='lb-mini-momotalk']
```

and declares:

```text
moduleNamespace = lb-mini-momotalk
```

There are therefore multiple isolation layers:

```text
module namespace
CSS root namespace
per-render DOM instance namespace
semantic backend namespace (lb-mini)
```

### SimCore relevance

The transferable principle is not random IDs specifically.

It is:

> Multiple historical render instances must not share accidental mutable UI identity.

A SimCore UI surface should derive or allocate a bounded per-receipt/per-turn view identity without conflating it with semantic lineage identity.

### Classification

```text
PROMISING · PER_RENDER_INSTANCE_ISOLATION
```

---

## 8. Renderer Totality over Valid Empty Data

The renderer explicitly handles empty collections.

If there are no comments:

```text
아직 댓글이 없습니다
```

If there are no posts:

```text
표시할 게시글이 없습니다
게시글을 작성하면 여기에 표시됩니다
```

The renderer therefore remains total over valid empty Miniboard data instead of treating emptiness as a renderer failure.

This is a small but useful robustness property:

```text
VALID EMPTY DATA
!=
INVALID DATA
!=
RENDER FAILURE
```

### SimCore relevance

Diagnostic views should make the same distinction.

Examples:

```text
warnings = []
compatibilityDiagnostics = []
candidate attribution = none
```

are meaningful valid states and should render deterministically rather than falling into generic missing/error UI.

### Classification

```text
PROMISING / LOW-COST · RENDERER_TOTALITY_FOR_EMPTY_STATE
```

---

## 9. Presentation-Only Theme Projection

MomoTalk reuses the existing Miniboard theme toggle and maps it to CSS variables.

Conceptually:

```text
♦️ / 💎 / ✨ / 🌳
      ↓
CSS custom properties
      ↓
colors / accents / avatar treatment
```

The semantic post/comment payload does not change with the theme.

Dark/light presentation is likewise accepted through render options and projected to CSS classes.

### SimCore relevance

This reinforces a strong rule:

```text
PRESENTATION PREFERENCE
must not alter
SEMANTIC ACCEPTANCE IDENTITY
```

If diagnostics later gain compact/detailed or theme variants, the representation digest and semantic receipt should not change merely because the view changes.

### Classification

```text
REINFORCES EXISTING · PRESENTATION_ONLY_PROJECTION
```

---

## 10. Responsive Progressive Disclosure

The layout is a desktop list/detail surface that collapses the board list into an overlay-style pane on narrow screens.

Presentation behavior includes:

```text
popover opener
list pane
selected post detail
mobile list scrim
responsive panel geometry
hover-specific enhancements only on hover-capable devices
```

This keeps the chat surface compact until the board is opened and keeps secondary navigation collapsible on small screens.

### SimCore relevance

This reinforces the KakaoTalk reference's progressive-disclosure finding.

For future diagnostics:

```text
chat output should show compact status
expanded forensic detail should be opt-in
```

The model-facing semantic data should not depend on whether the user expanded the UI.

### Classification

```text
REINFORCES EXISTING · PROGRESSIVE_DISCLOSURE
```

---

## 11. Least-Privilege Renderer Capability

The pack explicitly declares:

```text
lowLevelAccess = false
```

That matters because it still supports rich behavior:

```text
board switching intent
new-post intent
comment intent
reroll intent
delete intent
responsive presentation
multiple themes
```

The renderer does not need broad host authority to participate in these workflows.

### SimCore relevance

This is a practical example of a capability rule:

```text
rich UX
!=
broad runtime authority
```

A renderer should receive the minimum semantic data and emit the minimum bounded intent required for its task.

### Classification

```text
REINFORCES EXISTING · LEAST_PRIVILEGE_OWNER_CAPABILITY
```

---

## 12. Packaging duplication is not a transferable design goal

The identical renderer source appears in both:

```text
card.json character-book entry
module.risum lorebook entry
```

This likely serves distribution/import compatibility across Risu packaging paths.

For SimCore, copying the pattern would be harmful.

SimCore prefers one authoritative implementation source with mechanically generated or verified mirrors where duplication is unavoidable.

The existing `latest.js == install.js` invariant is already an example of duplication that must be mechanically proven.

### Classification

```text
DO NOT TRANSFER · MANUAL_MULTI_CONTAINER_SOURCE_DUPLICATION
```

If multiple package surfaces are ever necessary, use generation or exact-identity verification rather than independent hand-maintained copies.

---

## 13. Direct historical deletion remains non-transferable

The renderer emits delete targets such as:

```text
chatIndex
postIndex
commentIndex
```

The actual historical mutation is delegated to Miniboard infrastructure rather than implemented here.

That delegation is good renderer design, but the downstream LightBoard behavior still does not automatically fit SimCore.

SimCore history has lineage, edit-reconcile, representation, and provenance semantics that make arbitrary historical mutation dangerous.

### Classification

```text
DO NOT TRANSFER · HISTORICAL_CHAT_MUTATION_FOR_VIEW_STATE
```

The useful part is the intent boundary, not the eventual history-mutation mechanism.

---

## 14. Index-addressed semantic targets are fragile

Delete intent uses positional addressing:

```text
chatIndex_postIndex_commentIndex
```

This is practical for a local generated board whose list is immediately parsed and rendered.

It would be a weak authority identity for a long-lived SimCore semantic object because positions can change under edits, culling, regeneration, or migration.

### Classification

```text
WATCH · POSITIONAL_TARGET_IDENTITY
```

If SimCore ever gains targetable structured receipts, stable provenance-backed identity should be preferred over mutable list offsets.

---

## 15. External font dependency is presentation risk

MomoTalk loads a font from a public CDN.

That is acceptable for a cosmetic community renderer, but it creates environmental variation:

```text
offline failure
CDN availability
font-host changes
privacy/network policy
layout differences while font swaps
```

### Classification

```text
DO NOT TRANSFER AS CORE DEPENDENCY · EXTERNAL_PRESENTATION_ASSET
```

A core SimCore diagnostic surface should remain useful without external network assets.

---

## 16. Icon regex layer is compatibility glue, not semantic architecture

The module uses six display regexes to replace custom placeholder tags with inline SVG.

This is effectively an icon expansion bridge.

It is useful in the host environment but does not represent a semantic system worth importing.

### Classification

```text
KEEP AS REFERENCE ONLY · DISPLAY_COMPATIBILITY_GLUE
```

If SimCore ever has UI icons, use the host's ordinary static asset/render mechanism rather than introducing a semantic regex transformation layer for icons.

---

## 17. Relationship to prior reference findings

Earlier Miniboard analysis already established:

```text
Semantic Payload / Renderer Decoupling
Least-Privilege Frontend Capability
Bounded Context Aperture
Target-Local Interaction Preservation
```

MomoTalk strengthens those findings by showing a frontend that is even narrower:

```text
no generation prompt
no semantic validator
no trigger execution
no low-level access
same stable Miniboard data
renderer + display assets only
```

The genuinely sharper additions from MomoTalk are:

```text
Intent-Only Renderer Boundary      PROMISING
Ephemeral UI State Plane           PROMISING
Per-Render Instance Isolation      PROMISING
Renderer Totality for Empty State PROMISING / LOW-COST
Presentation-Only Theme Projection REINFORCES EXISTING
```

---

## 18. SimCore adaptation sketch

No implementation is authorized, but if a future SimCore diagnostic UI were designed using these principles, a safe conceptual shape would be:

```text
SimCore semantic diagnostic receipt
          ↓ read-only projection
bounded renderer adapter
          ↓
compact chat badge / opener
          ↓ local-only UI state
expanded diagnostic view
          ↓ optional bounded intent
semantic/runtime owner validates intent
```

Important non-goals:

```text
renderer directly mutates session/history
renderer gains broad host access
view selection becomes model context
presentation theme changes semantic digest
dynamic renderer code loading
external network asset required for correctness
```

This is compatible with SimCore's existing owner/authority philosophy without requiring a new architecture layer.

---

## 19. Disposition table

| Reference mechanism | SimCore disposition | Reason |
|---|---|---|
| Same Miniboard schema with MomoTalk skin | REINFORCES | semantic/presentation separation |
| Intent-only renderer | PROMISING | keeps mutation authority downstream |
| CSS-local selection/list state | PROMISING | avoids semantic-state pollution |
| Per-render instance namespace | PROMISING | prevents cross-instance UI collisions |
| Explicit valid empty states | PROMISING / LOW-COST | total deterministic rendering |
| Theme via CSS projection | REINFORCES | view preference stays non-semantic |
| Low-level access disabled | REINFORCES | rich UX with least privilege |
| Duplicate source in card + module | DO NOT TRANSFER | prefer single authority + identity checks |
| Positional delete target | WATCH | fragile for long-lived semantic identity |
| Historical mutation behind delete | DO NOT TRANSFER | conflicts with lineage/provenance contracts |
| External CDN font | DO NOT TRANSFER AS CORE DEPENDENCY | network/cosmetic risk |
| Regex SVG expansion | REFERENCE ONLY | host-specific display glue |

---

## 20. Final research verdict

```text
REFERENCE_VERDICT = HIGH_VALUE_RENDERER_BOUNDARY_REFERENCE

STRONGEST_NEW_IDEA = INTENT_ONLY_RENDERER_BOUNDARY
SECONDARY_IDEAS = EPHEMERAL_UI_STATE_PLANE + PER_RENDER_INSTANCE_ISOLATION

REINFORCES =
  SEMANTIC_PAYLOAD_RENDERER_DECOUPLING
  LEAST_PRIVILEGE_CAPABILITY
  PROGRESSIVE_DISCLOSURE
  PRESENTATION_ONLY_PROJECTION

DO_NOT_TRANSFER =
  HISTORICAL_CHAT_MUTATION
  POSITIONAL_IDENTITY_AS_AUTHORITY
  MANUAL_MULTI_CONTAINER_SOURCE_DUPLICATION
  EXTERNAL_ASSET_AS_CORE_DEPENDENCY

IMPLEMENTATION_AUTHORITY = NONE
PRODUCTION_MUTATION = NONE
S7_SCOPE_MUTATION = NONE
```

The most important lesson is simple:

> A renderer can be rich, interactive, responsive, and visually distinctive while remaining almost completely ignorant of semantic mutation authority.

That boundary is more valuable to SimCore than the MomoTalk visual design itself.
