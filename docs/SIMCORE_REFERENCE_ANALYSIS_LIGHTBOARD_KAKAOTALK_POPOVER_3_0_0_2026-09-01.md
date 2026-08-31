# SimCore Reference Analysis - LightBoard KakaoTalk Popover 3.0.0

Date: 2026-09-01 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
🔦라이트보드 카카오톡 V1.3-3.0.0 팝오버.risum
```

Archived source authority:

```text
references/simcore-plugin-idea-drop-2026-08-31/
```

Archived artifact identity:

```text
bytes  = 54631
sha256 = 5578f4898fc19810aea93657c444e244e66485de5f8c7f9edc2e51ea576673cc
```

This document analyzes the archived reference as an idea source. It does not authorize copying third-party implementation and does not alter SimCore runtime behavior, `release-simcore`, `plugins/simcore/latest.js`, `plugins/simcore/install.js`, the current S7 release transaction, or any frozen architecture boundary.

---

## 1. Decode and source-grounding

The archived `.risum` is a legacy RisuAI RPack module.

Observed binary envelope:

```text
magic byte       = 111
version byte     = 0
payload length   = 54624 bytes, little-endian u32
payload          = byte-substitution encoded JSON
terminator       = one trailing 0x00 byte
```

The decoded JSON has:

```text
type = risuModule
module.name = 🔦라이트보드 카카오톡 V1.3-3.0.0 팝오버
```

Public RisuAI-compatible decoder implementations independently describe the same RPack envelope and substitution-table decoding model. The archived user-supplied artifact remains the analysis authority.

---

## 2. Module anatomy

The decoded module contains:

```text
assets               0
trigger               1
regex                 3
lorebook              8
lowLevelAccess        true
backgroundEmbedding   ~20.5k characters of CSS/template content
```

The start trigger contains roughly:

```text
447 Lua lines
12393 characters
6 local functions
```

Primary Lua responsibilities:

```text
setTriggerId
splitIntoLines
formatTime
processMarkdown
render
main
```

The module therefore is not merely a theme stylesheet. It is a complete semantic-to-presentation adapter:

```text
model instructions
  -> stable <lightboard-kakaochat> payload
  -> display edit hook
  -> shared node extraction
  -> local field parser
  -> typed message rendering
  -> popover UI
  -> interaction / reroll controls
```

---

## 3. Stable sidecar envelope

The model-facing contract is intentionally small and stable:

```text
<lightboard-kakaochat name="..." participants="...">
[Message]Sender:...|Time:...|Side:left/right|Content:...
[Reply]Sender:...|Time:...|Side:left/right|ReplyTo:...|Content:...
[System]Time:...|Content:...
[Deleted]Time:...|Side:left/right|Content:...
[Notice]Time:...|Content:...
[Date]Content:...
</lightboard-kakaochat>
```

The renderer consumes that semantic envelope and decides how it appears.

This is another strong LightBoard example of:

```text
MODEL SEMANTICS
!=
DISPLAY REPRESENTATION
```

### SimCore classification

```text
REINFORCES EXISTING · SEMANTIC_PAYLOAD_RENDERER_DECOUPLING
```

The transferable idea is a stable semantic receipt that can be rendered differently without changing its authority or identity.

---

## 4. Presentation Failure Quarantine

The Lua display path uses bounded error containment at two levels.

Conceptually:

```text
extract nodes with protected call
  failure -> return original display text

render each node with protected call
  failure -> preserve surrounding text + local block error marker
```

A renderer failure therefore does not automatically destroy the underlying assistant output.

This is particularly attractive as a design principle:

```text
PRESENTATION FAILURE
!=
SEMANTIC FAILURE
```

### SimCore classification

```text
PROMISING · PRESENTATION_FAILURE_QUARANTINE
```

Possible future relevance is limited to optional diagnostics / UI surfaces. It does not justify weakening fail-closed rules for semantic or persistence authorities.

---

## 5. Interaction Intent Namespacing

The rendered popover exposes narrow button intents such as:

```text
lb-interaction__lightboard-kakaochat__ChangeChat
lb-interaction__lightboard-kakaochat__AddMessage
lb-reroll__lightboard-kakaochat
```

This is a compact routing pattern:

```text
framework action
  + frontend identifier
  + local operation
```

The button does not need to understand the full backend orchestration. It emits a target-scoped intent that the shared LightBoard layer can route.

### SimCore classification

```text
PROMISING · TARGET_SCOPED_INTERACTION_INTENT
```

If SimCore ever gains optional interactive diagnostics, the useful idea would be explicit intent identity and owner scoping, not reuse of the LightBoard string protocol.

---

## 6. Progressive Disclosure and Lazy Surface

The module supports both immediate and click-to-load behavior. Its lazy display regex can replace a marker with a small opener button, while the full renderer uses an HTML popover/dialog instead of permanently expanding the chat surface.

This creates separate concerns:

```text
semantic payload exists
UI surface may stay collapsed
user may explicitly expand / interact
```

The CSS also contains responsive rules for narrow screens and a variable-driven light/dark theme.

### SimCore classification

```text
WATCH / PROMISING · PROGRESSIVE_DIAGNOSTIC_DISCLOSURE
```

This is potentially useful for keeping rich diagnostics available without making the default chat surface noisy. It is a UX idea only, not runtime authority.

---

## 7. Display Lifetime and Model-Context Lifetime remain separate

The module has an `editprocess` filter for old KakaoChat payloads and a context inclusion toggle. When inclusion is enabled, the current rule retains only a recent tail around the last several messages.

Separately, the display renderer can remain available to the user.

This again demonstrates three distinct lifetimes:

```text
stored semantic payload
future prompt contribution
active visual rendering
```

### SimCore classification

```text
REINFORCES EXISTING · BOUNDED_CONTEXT_APERTURE
```

This matches earlier Comments/Miniboard findings and is especially relevant to Community-like sidecars whose old visible content should not silently become durable semantic authority.

---

## 8. Shared Prelude ABI: useful concept, unsafe implementation shape

The trigger does not implement node extraction itself. It loads a lorebook named conceptually `lightboard-prelude` and calls a shared extraction function from that prelude.

Architecture shape:

```text
frontend renderer
  -> shared prelude contract
     -> extractNodes(...)
```

This is strong evidence that LightBoard frontends are designed around a reusable backend/parser ABI rather than copying every common primitive into each frontend.

### Useful transferable principle

```text
COMMON PARSING CONTRACT
SHOULD HAVE ONE OWNER
```

### Non-transferable mechanism

The actual module dynamically loads and executes shared code from lorebook content at runtime.

For SimCore that would conflict with static graph inspection and CI authority.

### Classification

```text
PROMISING · SHARED_STATIC_PARSE_ABI
DO NOT TRANSFER · DYNAMIC_LOREBOOK_CODE_LOADING
```

---

## 9. Constrained markdown renderer

The KakaoChat renderer does not inject arbitrary message text as raw HTML. It recognizes only a very small local formatting subset for bold and italic and builds renderer elements through the `h.*` abstraction.

This is a useful presentation principle:

```text
SEMANTIC TEXT
  -> CONSTRAINED FORMAT PARSER
  -> STRUCTURED ELEMENTS
```

rather than:

```text
SEMANTIC TEXT
  -> RAW HTML EXECUTION
```

### SimCore classification

```text
PROMISING · CONSTRAINED_PRESENTATION_FORMATTING
```

Only relevant if SimCore ever renders rich optional surfaces.

---

## 10. Ad-hoc delimiter grammar is not a model to copy

The payload parser is intentionally lightweight. It scans message blocks and then extracts fields with delimiters such as `:` and `|`.

This is practical for a visual sidecar, but it creates ambiguity pressure around free-form content and reserved delimiters. The outer block scan is also sensitive to bracket-shaped syntax inside content.

For SimCore's provenance and diagnostic contracts this would be too fragile.

### Classification

```text
DO NOT TRANSFER · AD_HOC_DELIMITER_PROTOCOL
```

SimCore should continue preferring explicit validated structures where identity or authority matters.

---

## 11. Capability posture is intentionally broad

Unlike the narrow Miniboard frontend analyzed previously, this KakaoTalk module declares:

```text
lowLevelAccess = true
```

It also dynamically loads shared code and installs an edit-display listener.

That makes it useful as evidence of what a flexible RisuAI frontend can do, but it is not a good least-privilege template for SimCore.

### Classification

```text
DO NOT TRANSFER DIRECTLY · BROAD_FRONTEND_CAPABILITY
```

The better SimCore extraction remains:

```text
owner-specific static capability
+ explicit effect class
+ CI-verifiable dependency graph
```

---

## 12. Prompt controls that should remain reference-only

The module includes user controls for POV selection, participant count, message length, time synchronization, context inclusion, lazy rendering, theme selection, impersonation behavior, and a content-policy override/jailbreak prompt section.

Several are product-specific prompt policy rather than reusable architecture.

In particular:

```text
DO NOT TRANSFER · CONTENT_POLICY_OVERRIDE_PROMPT
DO NOT TRANSFER · IMPERSONATION_POLICY_TOGGLE
```

The useful architectural observation is merely that generation policy is exposed declaratively through named controls and kept separate from CSS rendering.

---

## 13. Strongest SimCore-relevant ideas

After removing UI-specific and unsafe mechanisms, the strongest extracted ideas are:

```text
1. Presentation Failure Quarantine
2. Target-Scoped Interaction Intent
3. Progressive Diagnostic Disclosure
4. Shared Static Parse ABI
5. Constrained Presentation Formatting
```

And this reference strongly reinforces:

```text
Semantic Payload / Renderer Decoupling
Bounded Context Aperture
```

### Priority sketch

```text
PRESENTATION_FAILURE_QUARANTINE    WATCH / PROMISING
TARGET_SCOPED_INTERACTION_INTENT   DEFER / PROMISING
PROGRESSIVE_DIAGNOSTIC_DISCLOSURE  WATCH
SHARED_STATIC_PARSE_ABI            REINFORCES EXISTING OWNERSHIP
CONSTRAINED_PRESENTATION_FORMATTING DEFER
```

None is promoted into the active S7 transaction.

---

## 14. Relationship to previous LightBoard findings

Previous analyses established themes including:

```text
Audience Knowledge Boundary
Owner-Scoped Context Projection
Effect-Class Contract
Semantic Payload / Renderer Decoupling
Bounded Context Aperture
Community Epistemic Quarantine
```

KakaoTalk Popover adds a particularly concrete UI-facing extension:

```text
stable semantic sidecar
  -> shared parser
  -> failure-contained renderer
  -> progressively disclosed surface
  -> namespaced interaction intents
```

The interesting thing is not the KakaoTalk appearance. The interesting thing is that a conversational sidecar can behave like a small application while the model-facing representation stays narrow.

---

## 15. Final disposition

```text
REFERENCE_ANALYSIS_COMPLETE
COPY_THIRD_PARTY_IMPLEMENTATION = NO
S7_SCOPE_CHANGE = NO
RELEASE_SIMCORE_MUTATION = NO
```

Promote only principles that can be restated in SimCore-native ownership terms and independently reimplemented under existing architecture/CI authority.
