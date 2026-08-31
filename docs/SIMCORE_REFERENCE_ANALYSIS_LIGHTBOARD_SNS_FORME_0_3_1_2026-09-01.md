# SimCore Reference Analysis — SNS Forme 0.3.1

Date: 2026-09-01 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
🆔 SNS 모듈 0.3.1 - 라이트보드.risum
```

Original bytes: `114438`

Original SHA-256:

```text
b65acf7529c70de1145eef76e191cc6dffa061a33c71764084e38fe6dbfac0cb
```

This is a user-supplied LightBoard-family reference. The analysis does not authorize code reuse, does not change SimCore runtime/release state, and does not modify `release-simcore`, `plugins/simcore/latest.js`, or `plugins/simcore/install.js`.

---

## 1. Decode and artifact anatomy

The file is a legacy RisuAI `.risum` module. RisuAI's current public module reader documents the format as:

```text
magic 111
version 0
u32 little-endian encoded payload length
RPack byte-substitution encoded JSON
optional encoded assets
end marker
```

The uploaded artifact decoded successfully using that contract.

Decoded module identity:

```text
name            = 🆔 SNS 모듈 0.3.1 - 라이트보드
namespace       = SNS-Forme
id              = a7cd2302-6464-4da5-b48c-26a94e87b4bf
lowLevelAccess  = true
displayOrder    = 1400
```

Observed components:

```text
8 lorebooks
4 regex scripts
1 trigger script
5 image assets
673-character toggle surface
```

Lorebook roles:

```text
manifest.lb
SNS-Forme.lb
SNS-Forme.lb.format
SNS-Forme.lb.thoughts
SNS-Forme.lb.prefill
SNS-Forme.lb.onOutput
SNS-Forme.Twitter.CSS
SNS-Forme.Instagram.CSS
```

The main prompt lorebook is large, approximately 28.5k characters. The output post-processor is approximately 14.8k characters and the display trigger is approximately 33.8k characters.

---

## 2. Executive finding

SNS Forme is not merely a Twitter/Instagram skin.

It combines five layers:

```text
LightBoard auxiliary semantic generation
→ platform-specific structured payload
→ media prompt sideband
→ image materialization / post-processing
→ platform renderer + targeted media reroll
```

The strongest transferable ideas are:

1. **Orthogonal Projection Axes**
2. **Source-Specific Representation Policy**
3. **Media Materialization as a Separate Side Effect**
4. **Targeted Media Reroll while Preserving Semantic Text**
5. **Graceful No-Media Degradation**
6. **Composable Presentation Adapters**

The direct historical-chat rewrite, broad low-level access, global DOM mutation, prompt-in-button transport, and delimiter-heavy semantic protocol should not transfer to SimCore.

---

## 3. Orthogonal Projection Axes

The configuration surface separates multiple independent choices instead of collapsing them into one mode.

Observed axes include:

```text
LightBoard execution mode
  off / main / auxiliary / auto

context participation
  include / remove

execution timing
  immediate / lazy

SNS platform projection
  none / Twitter / Instagram / hybrid

subject target
  user / character / simulated opponent NPC

media policy
  generate / no-image
```

This is architecturally valuable because these are different questions:

```text
WHEN should a sidecar run?
WHAT channel should it project into?
WHO is the subject?
SHOULD expensive media be materialized?
SHOULD historical payload remain in later model context?
```

### SimCore extraction

Potential principle:

```text
DO_NOT_COLLAPSE_ORTHOGONAL_POLICY_AXES
```

If future SimCore sidecars or diagnostic surfaces need multiple controls, execution timing, semantic owner, source/channel, subject, persistence and presentation should remain distinguishable.

Classification:

```text
PROMISING · GENERAL ARCHITECTURE PRINCIPLE
```

---

## 4. Source-Specific Representation Policy

The artifact generates different projections for different channels.

The concrete upstream policy is domain-specific and includes adult-content routing, which is not itself a SimCore recommendation. The useful abstraction is narrower:

```text
same underlying scene / subject
→ channel A projection rules
→ channel B projection rules
```

The hybrid mode can emit both platform representations from one semantic job while maintaining platform-specific fields and presentation.

### SimCore extraction

Potential principle:

```text
SOURCE_CHANNEL_POLICY != WORLD_TRUTH
```

A channel may select, omit, format, mature, or emphasize different facts without changing canonical world state.

This reinforces the existing LightBoard-only research around Source Coverage Lens and Source Projection Envelope.

Classification:

```text
PROMISING · REINFORCES SOURCE_PROJECTION
```

---

## 5. Structured semantic payload and media sideband

The model produces a bounded `<SNS-Forme>` block rather than final HTML.

Two main payload families are used:

```text
TWITTER[...fields...]
INSTA[...fields...]
```

Separate sideband records carry media-generation instructions for post images and profile images.

Conceptually:

```text
semantic post fields
+
media placeholder
+
media generation prompt metadata
```

This prevents the model from directly owning the final generated image identity.

### Strong idea

```text
SEMANTIC_OBJECT
!=
EXPENSIVE_MEDIA_MATERIALIZATION
```

A semantic object can exist before or without the expensive side effect that produces media.

Classification:

```text
PROMISING · MEDIA_MATERIALIZATION_BOUNDARY
```

---

## 6. onOutput as media materializer

`SNS-Forme.lb.onOutput` performs a second stage after semantic generation.

Observed responsibilities include:

```text
parse Twitter / Instagram structured records
read image prompt sidebands
resolve user prompt preset / quality / negative prompt settings
optionally generate profile images
optionally generate post images
replace media placeholders with generated image results
remember the post-image prompt in chat-local variables
remove sideband prompt records from the final semantic payload
```

The artifact therefore uses an explicit two-stage pipeline:

```text
Stage 1  semantic generation
Stage 2  expensive media materialization
```

### SimCore extraction

If a future optional visual sidecar exists, the semantic record should be accepted independently from whether an image provider succeeds.

A provider failure must not invalidate the underlying semantic event merely because enrichment failed.

Classification:

```text
PROMISING · SIDE_EFFECT_ISOLATION
```

---

## 7. Graceful No-Media Degradation

The module has an explicit `NoImage` control.

The structured SNS object can still be generated/rendered when media generation is disabled. The renderer does not require a successfully generated image to preserve the rest of the post.

This is a valuable resilience pattern:

```text
optional enrichment unavailable
→ preserve semantic object
→ degrade presentation only
```

This complements the previously extracted Presentation Failure Quarantine principle.

Classification:

```text
PROMISING · OPTIONAL_ENRICHMENT_DEGRADATION
```

---

## 8. Targeted media reroll

The post-processor stores the last Twitter/Instagram media prompt in chat-local variables.

The renderer can expose image-only reroll buttons. The button handler then:

```text
recover stored media prompt
→ issue image generation only
→ locate the relevant assistant message
→ replace the MEDIA field
```

The UX concept is strong:

```text
reroll expensive derived media
without regenerating semantic post text
```

Potential safer SimCore abstraction:

```text
semantic sidecar identity
+ derived media revision
→ append/replace presentation overlay only
```

### Direct implementation rejection

The upstream handler mutates historical chat text with `setChat(...)` after finding the latest character message. That collides with SimCore lineage, edit/reroll reconciliation, representation identity, and evidence reproducibility.

Classification:

```text
PROMISING CONCEPT · TARGETED_DERIVED_ASSET_REROLL
DO_NOT_TRANSFER · HISTORICAL_CHAT_REWRITE
```

---

## 9. Composable presentation adapters

The display trigger has separate Twitter and Instagram rendering functions and a hybrid composition layer.

Hybrid mode:

```text
render Twitter component
render Instagram component
deduplicate style blocks
compose both into one bounded layout
```

This suggests a useful presentation pattern:

```text
ONE SEMANTIC JOB
→ MULTIPLE PRESENTATION ADAPTERS
→ COMPOSITE VIEW
```

The important part is not the specific CSS. The useful idea is that presentation adapters can remain independently renderable and later be composed.

Classification:

```text
PROMISING · COMPOSABLE_PRESENTATION_ADAPTERS
```

---

## 10. Visible lifetime is separately bounded

The display listener checks message position and erases older SNS presentation outside a recent range.

Combined with the existing `context` toggle and LightBoard lazy behavior, this again demonstrates three distinct lifetimes:

```text
stored semantic lifetime
model-context lifetime
active rendered lifetime
```

Classification:

```text
REINFORCES EXISTING · MULTI_LIFETIME_SIDECAR
```

---

## 11. Source-local identity continuity

The prompt explicitly asks previously established platform IDs to remain stable rather than being regenerated each time.

Transferable principle:

```text
SOURCE_LOCAL_IDENTITY
should remain stable across projections when prior evidence exists
```

This is lower priority than authority/provenance work because persistent synthetic identity can grow state rapidly.

Classification:

```text
WATCH / PROMISING · SOURCE_LOCAL_IDENTITY
```

---

## 12. Direct-transfer rejects

### 12.1 Broad low-level access

The module declares:

```text
lowLevelAccess = true
```

and performs image generation, chat insertion/removal, full-chat scanning, historical message rewrite and display mutation.

A future SimCore presentation module should instead use the narrowest effect surface possible.

Classification:

```text
DO_NOT_TRANSFER · BROAD_PRIVILEGE_AS_DEFAULT
```

### 12.2 Historical chat mutation

Image reroll rewrites an existing assistant message with `setChat(...)`.

Classification:

```text
DO_NOT_TRANSFER
```

### 12.3 Prompt encoded into button action strings

Media prompts are escaped and embedded directly into `risu-btn` action values so the later button handler can regenerate an image.

That is convenient but creates a large magic-string transport surface.

Prefer opaque derived-asset identity or typed intent state if a future system needs equivalent behavior.

Classification:

```text
DO_NOT_TRANSFER · PROMPT_IN_ACTION_STRING
```

### 12.4 Delimiter-heavy semantic protocol

The core payload uses bracket/pipe-separated records such as `TWITTER[...]` and `INSTA[...]`.

This works for a bounded module but becomes fragile with arbitrary user text and schema growth.

Classification:

```text
DO_NOT_TRANSFER AS CANONICAL SIMCORE STATE
```

### 12.5 Global DOM / style mutation

Hybrid rendering includes a `<script>` that adds a class to `document.body` and defines a global `body.hybrid-sns-active` selector.

This violates the namespace-isolation direction documented by the upstream LightBoard skill itself and creates cross-module presentation coupling.

Classification:

```text
DO_NOT_TRANSFER · GLOBAL_PRESENTATION_EFFECT
```

---

## 13. WATCH · IMAGE_PROMPT_NAMESPACE_DRIFT

The module's declared namespace and toggle keys use:

```text
SNS-Forme.*
toggle_SNS-Forme.*
```

Most of the main prompt follows that namespace.

However, the later Image Prompt section contains multiple references shaped as:

```text
toggle_SNS.Mode
toggle_SNS.Original
toggle_SNS.Original.Text
toggle_SNS.NSFW
toggle_SNS.Prompt.Compatibility
```

while the actual toggle surface declares the corresponding controls under `SNS-Forme.*`.

This is a concrete namespace mismatch in the archived artifact.

Impact is not proven without live RisuAI execution because macro resolution behavior may have compatibility aliases or other surrounding context.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_NAMESPACE_DRIFT
NOT A SIMCORE DEFECT
```

Do not patch the archived source.

---

## 14. Relationship to prior LightBoard research

This artifact strongly reinforces:

```text
Semantic Payload / Renderer Decoupling
Bounded Context Aperture
Presentation Failure Quarantine
Source Projection Envelope
Target-Scoped Interaction Intent
Ephemeral / derived presentation state
```

It adds four particularly useful refinements:

```text
A. ORTHOGONAL_PROJECTION_AXES
B. MEDIA_MATERIALIZATION_BOUNDARY
C. OPTIONAL_ENRICHMENT_DEGRADATION
D. TARGETED_DERIVED_ASSET_REROLL
```

The first three have broad design value. The fourth has strong UX value but requires a safe immutable-lineage implementation before any SimCore adoption.

---

## 15. Final classification

```text
REFERENCE QUALITY                         = HIGH
DIRECT CODE REUSE AUTHORITY               = NONE
SIMCORE FEATURE AUTHORITY                 = NONE

ORTHOGONAL_PROJECTION_AXES                = PROMISING
SOURCE_SPECIFIC_REPRESENTATION_POLICY     = PROMISING / REINFORCING
MEDIA_MATERIALIZATION_BOUNDARY            = PROMISING
OPTIONAL_ENRICHMENT_DEGRADATION           = PROMISING
TARGETED_DERIVED_ASSET_REROLL             = PROMISING CONCEPT / DEFER IMPLEMENTATION
COMPOSABLE_PRESENTATION_ADAPTERS          = PROMISING
MULTI_LIFETIME_SIDECAR                    = REINFORCES EXISTING
SOURCE_LOCAL_IDENTITY                     = WATCH / PROMISING

HISTORICAL_CHAT_REWRITE                   = DO NOT TRANSFER
BROAD_LOW_LEVEL_PRIVILEGE                 = DO NOT TRANSFER
PROMPT_IN_ACTION_STRING                   = DO NOT TRANSFER
GLOBAL_PRESENTATION_EFFECT                = DO NOT TRANSFER
DELIMITER_PROTOCOL_AS_CANONICAL_STATE     = DO NOT TRANSFER

UPSTREAM IMAGE PROMPT NAMESPACE DRIFT     = WATCH
```

Next user-supplied artifact should be handled separately. This document intentionally analyzes only SNS Forme 0.3.1.