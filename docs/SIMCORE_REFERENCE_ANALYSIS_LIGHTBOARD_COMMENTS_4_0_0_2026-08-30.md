# SimCore Reference Analysis — LightBoard Comments 4.0.0

Date: 2026-08-30 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
라이트보드 댓글창 4.0.0
```

Archived source authority:

```text
references/simcore-plugin-idea-drop-2026-08-30/
```

Original SHA-256:

```text
d6cb46311481c64d3bf8829cdb6f6a1b3e30cf68099035cc4b2aab80f494b8bf
```

This document analyzes the archived reference as an idea source. It does not authorize copying third-party implementation, does not alter SimCore runtime behavior, and does not modify `release-simcore`, `plugins/simcore/latest.js`, or `plugins/simcore/install.js`.

---

## 1. Executive finding

The most valuable lesson from LightBoard Comments 4.0.0 is **not the forum-looking UI itself**.

The stronger architectural ideas are:

1. **Audience Knowledge Boundary**
   - the generator may know world settings,
   - but simulated board users may react only to information exposed by the narrative/log available to them.

2. **Display / Model-Context Separation**
   - structured board state may remain renderable for the user,
   - while old board data can be omitted or bounded in future model context.

3. **Structured Sidecar Contract**
   - semantic generation produces a machine-parseable sidecar,
   - validation checks it,
   - presentation renders it separately from ordinary prose.

4. **Targeted Interaction Transaction**
   - a user action targets one post/comment operation,
   - unrelated data is explicitly preserved.

These concepts are relevant to SimCore, but they have different adoption readiness. The first two are the strongest near-term research candidates. The latter two imply a larger architecture and should remain deferred.

---

## 2. Artifact anatomy

The reconstructed `.charx` is a ZIP-shaped Character Card v3 package containing:

```text
assets/icon/image/main.png
card.json
module.risum
x_meta/main.json
```

The card identifies itself as:

```text
name: 🔦라이트보드 댓글창 4.0.0
creator note: 독자 댓글 모듈
version: 4.0.0
module namespace: lb-comments
```

The package is not a self-contained single prompt. It is a layered module containing:

```text
prompt/lore rules
+ output format contract
+ output validation/extraction
+ regex/context policies
+ display renderer
+ interaction routing
+ local historical-message mutation for deletion
+ shared LightBoard prelude/core dependency
```

Current public RisuAI source confirms that CharX packages may contain `card.json`, optional `module.risum`, and assets, and that the legacy `.risum` reader decodes a versioned module payload. This makes the archived layout consistent with an actual RisuAI module package rather than an arbitrary ZIP.

---

## 3. User-facing configuration surface

The card exposes a compact control panel under the `lb-comments` namespace.

Observed controls include:

```text
mode      = 끄기 / 메인 / 보조
lazy      = 즉시 / 누르면
quantity  = 2-5 / 4-7 / 5-8
privacy   = 등장 / 추방 / 자율
mood      = free text
sampling  = 다양성 강화
thoughts  = 적고 제거 / 생각만 / 안하기
context   = 포함 / 제거
```

Important design point:

```text
context = 제거
→ board material can remain a display artifact
→ but the main model is not required to keep seeing that board material
```

The exact semantics of `mode`, `lazy`, shared interaction routing, and prelude ownership are delegated to the wider LightBoard core and are therefore **not closed by this artifact alone**.

---

## 4. Semantic simulation contract

The main lore rules model a fictional web-novel reader board.

### 4.1 Reaction scope

The board is instructed to focus on the current chapter/new material after the previous board block rather than replaying older episodes.

Conceptually:

```text
new narrative material
→ new board reaction scope
→ do not resurrect completed prior reaction topics merely because they remain in history
```

This strongly resembles the intent behind SimCore's Current Task Primacy / previous-turn replay defenses.

For SimCore this is primarily **supporting evidence for an existing direction**, not automatically a new feature.

### 4.2 Audience epistemic boundary

A particularly strong rule separates:

```text
world/settings available to the generator
```

from:

```text
facts actually available to simulated board users
```

Examples encoded by the reference include the idea that a text-only audience cannot infer unexposed audio/image information merely because such information exists elsewhere in settings.

This is a valuable distinction for SimCore Community:

```text
WORLD KNOWLEDGE
!=
EXPOSED COMMUNITY KNOWLEDGE
```

A Community reaction engine should be able to use world state to maintain consistency while still forbidding community members from reacting to facts that have not become public/exposed.

### 4.3 Nickname identity

The reference prefers random-looking stable nicknames that are not shaped around the current reaction topic. Previously established names may be reused where appropriate.

This produces a subtle realism benefit:

```text
identity first
reaction second
```

rather than:

```text
reaction text
→ manufacture a username that explains the reaction
```

This is aesthetically useful but lower priority than knowledge boundaries and context policy.

---

## 5. Structured output contract

The model does not merely write free-form forum prose. It is asked to produce a tagged structured block:

```text
<lb-comments>
  structured TOON board data
</lb-comments>
```

The data contains fields corresponding to concepts such as:

```text
author
time
upvotes
downvotes
content
comments
```

The module then supplies separate output hooks:

```text
onValidate
→ locate latest lb-comments node
→ TOON decode
→ reject invalid structure

onOutput
→ locate lb-comments nodes
→ return latest valid target node
```

This is a classic producer/validator/renderer split:

```text
LLM semantic producer
        ↓
structured contract
        ↓
validator/parser
        ↓
renderer
```

It is substantially more reliable than asking one free-form response to simultaneously satisfy narrative semantics, forum styling, persistent interaction state, and UI markup.

---

## 6. Presentation and context layers

The module has distinct regex/display policies.

Observed responsibilities include:

```text
Filter Response
→ remove the raw structured board envelope from the ordinary output path

Hide Unparsed
→ prevent raw lb-comments markup from leaking into display

Lazy
→ expose an on-demand board opener/reroll affordance

Ignore Old
→ bound/remove older board material in model-processing context
```

The important conceptual pattern is:

```text
DISPLAY PRESENCE
!=
MODEL CONTEXT PRESENCE
```

A visible artifact can remain available to the user without forcing every future generation to carry its full raw representation.

For long chats, this is directly interesting to SimCore because Community output is often useful as visible history while becoming progressively less useful as verbatim prompt context.

---

## 7. Interaction model

The interaction lore describes a targeted update rather than a full board rewrite.

Its invariant is effectively:

```text
apply requested action
+ update directly related reactions/variable counts where plausible
+ optionally cull old low-value data within bounds
+ KEEP ALL OTHER DATA UNTOUCHED
```

Supported conceptual actions include adding posts/comments and deleting targeted items.

The renderer routes actions using shared LightBoard conventions. Direct deletion is implemented locally by:

```text
read historical chat message
→ parse latest lb-comments state
→ remove selected post/comment
→ serialize state
→ setChat(...) historical message
```

That last step is an important **non-transferable design choice for SimCore**.

---

## 8. Dependency boundary

The comments module attempts to acquire a shared `prelude` and, when unavailable, loads a lore/module named `lightboard-prelude` and imports shared helpers such as TOON decoding/query behavior.

Therefore:

```text
LightBoard Comments
= satellite module
NOT standalone runtime
```

The following semantics remain delegated and cannot be fully judged until the LightBoard core is analyzed:

```text
main / secondary execution ownership
lazy lifecycle
shared reroll behavior
shared interaction bus
prelude query/render utilities
cross-module state conventions
```

This makes **LightBoard core 4.1.1 the recommended second analysis target**.

---

## 9. SimCore idea extraction matrix

### IDEA-A · Audience Knowledge Boundary

Classification:

```text
PROMISING
HIGH CONCEPT VALUE
NARROWABLE
```

Concept:

```text
SimCore may know a fact
but Community may react to it only when that fact is EXPOSED to the audience represented by the current community source.
```

Potential benefit:

- reduces accidental omniscience,
- separates continuity truth from public knowledge,
- makes Community reactions more believable,
- provides a principled answer to "the model knows it, but should these commenters know it?"

Possible future contract shape:

```text
CANONICAL WORLD FACT
+ EXPOSURE STATUS
+ COMMUNITY SOURCE
→ REACTION-ELIGIBLE FACT SET
```

This should be explored as a separate future design. It must not be slipped into v0.70.1, which is a cold first-turn tail attribution mini.

### IDEA-B · Community Sidecar Context Aperture

Classification:

```text
PROMISING
LONG-CHAT RELEVANT
NEEDS OWNERSHIP DESIGN
```

Concept:

```text
Community output may stay visible in chat
while its full raw representation is omitted/compacted from later model context after a bounded window.
```

Potential benefit:

- reduces stale Community replay pressure,
- lowers long-chat context weight,
- preserves user-visible history,
- keeps current task/source more salient.

Critical condition:

```text
context pruning must never erase continuity facts or current authoritative state
```

The safe SimCore version would need explicit distinction between:

```text
visible artifact
semantic continuity capsule
raw historical rendering payload
```

### IDEA-C · Structured Community Sidecar + Validator + Renderer

Classification:

```text
DEFER
ARCHITECTURE-SIZED
HIGH UPSIDE / HIGH MIGRATION COST
```

Concept:

```text
Community generation emits structured data
→ validator owns syntax/schema
→ renderer owns visual presentation
```

Potential benefits:

- deterministic UI rendering,
- easier interaction targeting,
- stronger output validation,
- formatting changes without semantic-prompt rewrites.

Why deferred:

- SimCore currently treats Community as part of normal assistant output semantics,
- introducing a canonical sidecar touches representation, history, reroll/edit, mirror, storage, and live validation,
- this is far larger than a quality mini.

### IDEA-D · Targeted Interaction Transaction

Classification:

```text
DEFER
USEFUL PATTERN
DO NOT COPY IMPLEMENTATION
```

Reusable concept:

```text
targeted action
+ explicit preserve-unrelated-state invariant
```

For SimCore, any future interactive Community state should use an append-only or dedicated state/overlay model rather than rewriting canonical chat history.

### IDEA-E · Stable Community Persona/Nickname Identity

Classification:

```text
WATCH / OPTIONAL
AESTHETIC VALUE
STATE-BLOAT RISK
```

Could improve lived-in Community feel, but only if identity persistence is compact and does not become another large long-chat state surface.

---

## 10. Patterns that should NOT be copied into SimCore

### 10.1 Direct historical `setChat` mutation

Classification:

```text
BLOCK AS A TRANSFER PATTERN
```

The reference directly rewrites a historical assistant message to implement deletion.

For SimCore this would collide with:

- request/output lineage,
- reroll/edit reconciliation,
- representation mirror invariants,
- current-turn binding,
- evidence reproducibility.

Future interactive state must not make canonical chat history silently mutable.

### 10.2 Prompted step-by-step private reasoning

The reference includes explicit thought/planning scaffolding.

Do not copy this approach. SimCore contracts should state observable decision criteria and output invariants without requiring exposed chain-of-thought.

### 10.3 Explicit low-probability dual sampling with model-supplied probabilities

The optional diversity mode asks for multiple complete alternatives and probability-like values.

This is costly and the numbers are not a trustworthy calibrated probability signal. It should not be treated as a SimCore reliability primitive.

### 10.4 Implicit string-based cross-module bus

Action names such as shared `lb-interaction__...` / reroll conventions are convenient inside one ecosystem but create hidden coupling.

If SimCore ever adopts cross-module actions, prefer explicit typed contracts and ownership over magic naming conventions.

### 10.5 Regex as the semantic state parser

Regex is acceptable for locating an outer envelope, but nested/persistent state should be owned by an actual parser/schema layer.

---

## 11. Upstream reference WATCH

### WATCH · UPSTREAM_REFERENCE_NAMESPACE_TYPO

The interaction lore contains one observed reference shaped as:

```text
toggle_lightboard-comments.privacy
```

while the normal module namespace/control references use:

```text
toggle_lb-comments.privacy
```

This appears to be a namespace mismatch in the archived upstream reference.

Impact is not proven from this artifact alone because surrounding macro/runtime resolution semantics belong to RisuAI/LightBoard execution. Therefore:

```text
classification = WATCH
not a SimCore defect
not a reason to patch archived reference source
```

---

## 12. Fit against current SimCore Community

SimCore already has strong ownership around Community classification/structure and has recently tightened parent/local alias classification and current-task primacy.

Therefore the reference should **not** trigger a rewrite of existing Community mechanics.

What it adds is a different axis:

```text
SimCore today asks strongly:
"Which current task/source/platform should Community react to?"

LightBoard Comments adds the useful question:
"Which facts is this audience actually allowed to know?"
```

Those two constraints are complementary:

```text
CURRENT SOURCE AUTHORITY
∩
AUDIENCE-EXPOSED KNOWLEDGE
=
VALID COMMUNITY REACTION INPUT
```

This is the strongest extracted concept from the first reference.

---

## 13. Recommended follow-up order

Next reference to analyze:

```text
라이트보드 본체 4.1.1
```

Reason:

The comments module explicitly delegates shared runtime/prelude behavior to the LightBoard core. Analyzing the core next will close:

- how main/secondary modes actually work,
- how lazy generation is orchestrated,
- how reroll and interaction routing are owned,
- whether state is centralized or convention-driven,
- which comments behavior is generic LightBoard infrastructure versus comments-specific policy.

After core:

```text
미니보드 4.1.1
→ compare a second satellite using the same substrate

헌터넷 4.0.0
→ compare a larger domain-specific surface

risuai-scripting-skill.zip
→ use as cross-cutting API/runtime reference
```

---

## 14. Final classification

```text
REFERENCE QUALITY                = HIGH
DIRECT CODE REUSE AUTHORITY       = NONE
SIMCORE FEATURE AUTHORITY         = NONE

IDEA-A Audience Knowledge Boundary       = PROMISING
IDEA-B Sidecar Context Aperture           = PROMISING
IDEA-C Structured Community Sidecar       = DEFER
IDEA-D Targeted Interaction Transaction   = DEFER
IDEA-E Stable Community Identities        = WATCH / OPTIONAL

DIRECT HISTORICAL CHAT MUTATION           = DO NOT TRANSFER
UPSTREAM NAMESPACE MISMATCH               = WATCH

NEXT ANALYSIS TARGET                       = LIGHTBOARD CORE 4.1.1
```
