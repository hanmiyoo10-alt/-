# SimCore Reference Analysis - LightBoard Annotations 4.0.0

Date: 2026-09-01 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
🔦라이트보드 주석 4.0.0.charx
```

Archived source authority:

```text
references/simcore-plugin-idea-drop-2026-08-31/
```

Archived artifact identity:

```text
bytes  = 16938
sha256 = 00c3aac1d5e0bdb0a4d8a9e8c97988761651d2b47dc937ec16abee0df9a86124
```

This document analyzes the archived reference as an idea source. It does not authorize copying third-party implementation and does not alter SimCore runtime behavior, `release-simcore`, `plugins/simcore/latest.js`, `plugins/simcore/install.js`, the active S7 release transaction, persistent schema, or any frozen architecture boundary.

---

## 1. Executive finding

LightBoard Annotations is not merely tooltip decoration.

Its effective architecture is:

```text
latest assistant prose
  -> annotation candidate generation
  -> structured target/text/locator/description tuple
  -> source-span validation against the actual chat entry
  -> bounded annotation sidecar ledger
  -> optional pin retention
  -> inline / collection / history projection
  -> optional re-entry into later model context
```

The most valuable transferable ideas are therefore not the visual theme.

They are:

1. **Anchored Annotation Contract**
2. **Derived Sidecar Ledger with bounded retention**
3. **Reroll-aware future truncation**
4. **Separate rolling and pinned retention classes**
5. **Presentation Failure Quarantine**
6. **Context Re-entry Firewall**
7. **Last-source-entry targeting instead of free-floating semantic attachment**

The strongest warning is equally important:

> A derived annotation must never silently become canonical source truth merely because it is persisted or re-injected into future model context.

---

## 2. Source-grounding

The archived `.charx` remains the authority for this analysis.

A public source decomposition of the same LightBoard Annotations 4.0.0 package was inspected only to understand internal responsibilities.

Observed package anatomy:

```text
namespace          lb-annot
version            4.0.0
lowLevelAccess     false
start triggers     1
regex surfaces     5
lorebook entries   8
CSS                 present
```

The start trigger is a substantial renderer/state handler, while separate lorebook hooks own structured output validation and post-output persistence.

This separation is important: generation, validation, persistence, rendering, and optional prompt re-entry are distinguishable responsibilities even though they ship as one feature package.

---

## 3. Semantic payload

The annotation generator emits one structured `lb-annot` node containing an array of annotation tuples.

The semantic fields are equivalent to:

```text
target
text
locator
description
```

Their responsibilities are deliberately different.

### 3.1 target

The human-facing semantic term being annotated.

### 3.2 text

The exact text span to decorate in the source prose.

It may differ from the semantic target because aliases, punctuation, Markdown, or surface variation may exist.

### 3.3 locator

A larger exact source substring used only when the shorter `text` is ambiguous.

The locator must contain the text.

### 3.4 description

The derived explanatory payload displayed to the user.

This four-part split is substantially safer than attaching a description to a free-floating label alone.

---

## 4. Anchored Annotation Contract

The most reusable pattern in the package is the explicit anchoring contract.

Before a generated annotation is accepted, the validator checks both shape and source location.

Observed validation classes include:

```text
required target
required text
required description
text cannot be shorter than target under the package's contract
non-empty locator cannot be shorter than text
locator must exist in the selected source chat entry
text must exist inside the located substring
```

The target source is not an arbitrary historical message.

The feature intentionally resolves the relevant recent assistant content entry and then validates the annotation against that exact source text.

Conceptually:

```text
annotation claim
  -> locate source entry
  -> locate exact locator span
  -> locate exact decorated text inside locator
  -> accept only when all anchors resolve
```

This suggests a useful general rule for SimCore sidecars:

```text
DERIVED_METADATA_MUST_CARRY_SOURCE_ANCHOR
```

A derived observation attached to a source span is easier to invalidate, audit, and reroll safely than a floating semantic note with no source identity.

---

## 5. Last-entry targeting

The generation instructions explicitly limit annotation targets to the latest assistant prose entry.

They also exclude structured/non-prose regions such as code blocks and headings.

This is valuable because it creates a bounded acquisition window.

The system is not asking:

```text
What concepts exist anywhere in this entire conversation?
```

It is asking roughly:

```text
Which source spans in the newest eligible assistant prose need a side annotation?
```

That reduces:

- history scans,
- ambiguous ownership,
- duplicate attachment,
- stale source references,
- unbounded annotation growth.

For SimCore, the transferable idea is **bounded source acquisition**, not the creative annotation prompt itself.

---

## 6. Redundancy suppression

The annotation prompt strongly discourages redundant or obvious annotations.

The model is instructed to avoid targets that:

- are already explained in the current text,
- were already annotated,
- are already familiar from prior logs unless a new aspect exists,
- are trivially deducible when clutter suppression is enabled.

This is an important UX and prompt-budget principle:

```text
DERIVED_SIDECAR_VALUE > DERIVED_SIDECAR_VOLUME
```

A sidecar should be sparse by default.

A system that decorates every possible fact eventually turns useful metadata into visual and contextual static.

---

## 7. Derived sidecar ledger

Accepted annotations are persisted outside the source prose in state roughly shaped as:

```text
pinned
stack
```

Each rolling stack entry contains:

```text
chatIndex
annotations[]
```

This is structurally important.

The prose remains the prose.

The annotation record is a separate derived projection.

That is a good authority boundary:

```text
source prose != annotation ledger
```

The annotation ledger can be deleted, re-rendered, or evicted without rewriting the source message itself.

---

## 8. Bounded retention

The rolling annotation history has an explicit maximum save count.

The default exposed by the package is five entries.

Older rolling entries are evicted when the bound is exceeded.

This is a strong pattern for derived sidecars:

```text
canonical history may be long

derived convenience history should usually be bounded
```

A derived projection should not automatically inherit the retention horizon of the source authority.

This reduces:

- memory growth,
- prompt re-entry growth,
- stale derived claims,
- UI accumulation,
- long-chat bookkeeping.

---

## 9. Reroll-aware future truncation

The post-output persistence path does something especially relevant to SimCore.

When a new annotation record is committed for a target chat index, the package rebuilds the rolling list using only entries earlier than that target and then appends the new current record.

Conceptually:

```text
old derived ledger:
A -> B -> C -> D

reroll / replacement at C:
A -> B -> C'
```

rather than:

```text
A -> B -> C' -> D(stale)
```

This is a derived-state form of lineage truncation.

That is highly relevant to SimCore because reroll-safe sidecars must not retain observations that belonged to a superseded future branch.

Potential research principle:

```text
DERIVED_LINEAGE_MUST_NOT_OUTLIVE_SOURCE_LINEAGE
```

This does not authorize a new SimCore subsystem. It is a reference principle for any future derived sidecar feature.

---

## 10. Rolling versus pinned retention classes

The package separates:

```text
rolling stack
pinned annotations
```

The rolling stack is bounded and eviction-oriented.

Pinned items survive independently because the user explicitly promoted them.

This is a useful retention distinction:

```text
machine-derived convenience retention
!=
user-promoted retention
```

If SimCore ever exposes derived diagnostics or explanatory sidecars to users, explicit user promotion could justify a different lifetime than automatic observations.

However, user promotion still does not automatically convert derived content into canonical evidence.

Promotion changes retention, not truth authority.

---

## 11. Inline projection and collection projection

The same underlying annotation ledger is rendered in multiple views.

Observed views include:

- inline annotation controls attached to source words,
- current annotation collection,
- past annotation history,
- pinned annotation section.

This is another instance of the pattern already seen in the MomoTalk reference:

```text
one semantic/derived data model
-> multiple presentation projections
```

The data should not be redesigned just because the UI changes.

---

## 12. Presentation Failure Quarantine

Rendering is wrapped in contained failure paths.

If collection rendering or inline rendering fails, the package logs the problem and falls back to the original display data rather than destroying the underlying message.

This repeats a valuable pattern from the KakaoTalk reference:

```text
presentation failure != semantic data failure
```

For future SimCore UI or diagnostics surfaces, this should be considered a strong design rule.

The authoritative content must remain usable even if an optional sidecar renderer breaks.

---

## 13. Bounded display work

The display trigger avoids doing annotation rendering work for sufficiently old messages.

This creates a second bound separate from state retention.

Therefore the package distinguishes at least three lifetimes:

```text
source lifetime
annotation storage lifetime
active display-processing window
```

That separation is useful.

A derived item can remain stored without forcing every historical message to pay rendering cost on every display pass.

---

## 14. Context Re-entry Firewall

The package exposes a context toggle controlling whether stored annotation data is inserted into later model context.

This is one of the most important design boundaries in the reference.

Without such a boundary, the loop can become:

```text
source prose
-> derived annotation
-> annotation re-enters model prompt
-> future prose influenced by annotation
-> future annotation observes influenced prose
```

That feedback loop can cause a derived projection to gradually behave like source truth.

For SimCore, the safer principle is stronger than the reference implementation:

```text
DERIVED_CONTEXT_REENTRY = EXPLICIT + PROVENANCE_TAGGED + NON_AUTHORITATIVE
```

Any derived sidecar that re-enters model context should preserve at least:

- source identity,
- derivation status,
- trust tier,
- current/stale status,
- clear distinction from canonical session evidence.

Default silent promotion is unsafe.

---

## 15. Provenance weakness in pinned identity

The reference pinning path identifies pinned state primarily by annotation target text.

This is convenient for UI behavior but weak as a durable semantic identity.

The same target label can occur:

- in different messages,
- in different contexts,
- with different meanings,
- after rerolls,
- across changed source spans.

Therefore a plain target string is insufficient for authoritative identity.

A safer abstract identity would resemble:

```text
source lineage
+ source message identity
+ exact source anchor
+ semantic target
```

This is a useful anti-pattern lesson:

```text
DISPLAY_LABEL != PROVENANCE_IDENTITY
```

---

## 16. Fragile string action protocol

The UI trigger encodes pin/delete operations into compact string button codes and later parses separators from those strings.

This is workable for a small plugin but should not be transferred into SimCore as an internal protocol.

Risks include:

- separator collisions,
- ambiguous escaping,
- coupling UI text to action identity,
- accidental target/description parsing errors.

If a future SimCore renderer emits actions, use typed/namespaced intent objects or an equivalently explicit contract rather than ad-hoc delimiter strings.

---

## 17. Renderer-owned mutation

Unlike the MomoTalk reference, the annotation trigger directly mutates its annotation state for pin and delete operations.

This difference matters.

MomoTalk suggested:

```text
renderer -> intent -> semantic owner
```

Annotations often behaves more like:

```text
renderer control -> direct sidecar mutation
```

For a low-risk local annotation store this can be acceptable, but it is not the preferred transferable pattern for SimCore semantic state.

The MomoTalk `Intent-Only Renderer Boundary` remains the stronger default for any state with runtime or lineage significance.

---

## 18. Low-level access posture

The package declares low-level access disabled for both the card and the bundled start trigger.

Despite that, it still provides:

- persistent sidecar state,
- inline rendering,
- history UI,
- pin/delete controls,
- validation,
- optional context re-entry.

This supports a broader lesson already seen in MomoTalk:

```text
rich interaction does not inherently require broad low-level authority
```

Capabilities should stay as narrow as the host allows.

---

## 19. What SimCore should keep as research ideas

### A. Anchored derived metadata

Derived observations should resolve against concrete source identity/span before acceptance.

### B. Derived lineage truncation

When source history rerolls or forks, derived future state must not survive the superseded branch.

### C. Separate retention classes

Automatic derived history and user-promoted items may have different retention horizons.

### D. Context re-entry firewall

Persisted derived data must not automatically become canonical prompt truth.

### E. Sparse sidecars

Silence is better than low-value annotation noise.

### F. Presentation failure quarantine

Optional render failure should reveal or preserve source content, not destroy it.

### G. Bounded display work

Long-lived storage need not imply long-lived active rendering work.

### H. Display labels are not identities

Any durable sidecar identity needs provenance beyond human-facing target text.

---

## 20. What SimCore should not copy

### DO NOT COPY: creative observer semantics as evidence semantics

The package is designed for roleplay explanation and can produce universe-facing explanatory prose.

That prose is useful presentation, not canonical evidence.

### DO NOT COPY: untyped delimiter action strings

Use typed/namespaced intent contracts for significant state changes.

### DO NOT COPY: target-text-only durable identity

Labels are not enough to survive duplicates, rerolls, or semantic drift.

### DO NOT COPY: silent derived-to-context promotion

Any model-context re-entry requires explicit provenance and non-authoritative labeling.

### DO NOT COPY: direct renderer mutation for authoritative state

Keep significant semantic ownership outside presentation surfaces.

### DO NOT COPY: chat position as sole durable identity

Position can move or become stale under reroll/history edits.

---

## 21. Cross-reference synthesis with the first three artifacts

The four analyzed references now form a surprisingly coherent set of reusable principles.

### KakaoTalk Popover

```text
semantic payload / renderer separation
shared parse ABI
presentation failure quarantine
target-scoped interaction
```

### MomoTalk Renderer

```text
renderer-only adapter
intent-only interaction boundary
ephemeral UI state plane
per-render instance isolation
```

### Status Window

```text
derived checkpoint + recent delta
observer sidecar non-authority
bounded projection ledger
field-specific reconciliation
```

### Annotations

```text
source-anchored derived metadata
reroll-aware derived lineage truncation
rolling vs pinned retention
context re-entry firewall
```

Together they suggest a general research architecture:

```text
AUTHORITATIVE SOURCE
        |
        v
BOUNDED DERIVATION
        |
        +---- source anchors / provenance
        |
        v
DERIVED SIDECAR LEDGER
        |
        +---- bounded retention
        +---- reroll invalidation
        +---- user promotion class
        |
        v
PRESENTATION ADAPTER
        |
        +---- ephemeral UI state
        +---- intent-only actions where possible
        +---- failure quarantine
        |
        v
OPTIONAL CONTEXT RE-ENTRY
        |
        +---- explicit
        +---- provenance-tagged
        +---- always non-authoritative
```

This is a research abstraction only.

It is not authorization to add a generic sidecar/state framework to SimCore.

---

## 22. Compatibility with frozen SimCore boundaries

The reference analysis does not alter current frozen decisions.

In particular:

```text
no new architecture layer
no generic state subsystem
no Prompt/Community semantic change
no history rewrite
no provider cache tuning
no release-system redesign
no persistent schema redesign
```

The ideas above should only be reconsidered when a concrete product requirement independently justifies them.

---

## 23. Final classification

```text
REFERENCE_VALUE = HIGH
IMPLEMENTATION_AUTHORITY = NONE
RUNTIME_CHANGE = NONE
RELEASE_CHANGE = NONE
S7_SCOPE_CHANGE = NONE
```

Most valuable concepts:

```text
1. ANCHORED_ANNOTATION_CONTRACT
2. DERIVED_LINEAGE_MUST_NOT_OUTLIVE_SOURCE_LINEAGE
3. CONTEXT_REENTRY_FIREWALL
4. SEPARATE_ROLLING_AND_USER_PROMOTED_RETENTION
5. PRESENTATION_FAILURE_QUARANTINE
6. BOUNDED_DISPLAY_WORK
7. DISPLAY_LABEL_NOT_PROVENANCE_IDENTITY
```

The reference is worth keeping primarily as evidence that useful explanatory/diagnostic UI can be built as a bounded, source-anchored derived layer without rewriting the underlying content.
