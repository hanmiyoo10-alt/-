# SimCore Reference Analysis — LightBoard Light Status Window 2.0.0 (Inner Thoughts Always)

Date: 2026-09-01 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
[🔦😋가벼운 상태창 2.0.0 - 속마음 항상].module.charx
```

Original bytes: `27017`

Original SHA-256:

```text
ec099244aaee5bb3a0ac5cccc6658482cf082bac77d701b05cd041d4a20682c4
```

Archive authority:

```text
references/simcore-plugin-idea-drop-2026-09-01/
```

This is a user-supplied LightBoard-family reference delivered inside the 2026-09-01 Proton Drive ZIP bundle. The analysis does not authorize code reuse, does not change SimCore runtime/release state, and does not modify `release-simcore`, `plugins/simcore/latest.js`, or `plugins/simcore/install.js`.

---

## 1. CHARX and embedded-module anatomy

The outer CHARX contains:

```text
x_meta/main.json
assets/icon/image/main.png
module.risum
card.json
```

The card is Chara Card v3 (`spec_version=3.0`) and identifies itself as:

```text
[🔦😋가벼운 상태창 2.0.0 - 속마음 항상]
```

Creator notes describe it as a simple LightBoard-linked status window that always includes inner thoughts.

RisuAI extension highlights:

```text
lowLevelAccess = true
viewScreen     = none
utilityBot     = false
```

Toggle axes:

```text
mestatusme.mode   = 끄기 / 메인 / 보조
mestatusme.lazy   = 즉시 / 누르면
mestatusme_lang   = 영어 / 한국어 / 일본어
mestatusme_status = 끄기 / 켜기
```

`module.risum` decodes successfully with the RPack format and contains:

```text
name        = [🔦😋가벼운 상태창 2.0.0 - 속마음 항상] Module
id          = cf4d1759-4834-447f-8bea-4b6473004c69
6 lorebooks
1 regex script
1 trigger script
0 embedded module assets
trigger lowLevelAccess = true
```

The six lorebook contents inside `module.risum` are string-identical to the six outer `card.json` character-book entries:

```text
manifest.lb
mestatusme.lb.format
mestatusme.lb.job
mestatusme.lb
mestatusme.lb.onValidate
mestatusme.lb.onOutput
```

---

## 2. Semantic sidecar

The module generates one compact JSON sidecar:

```text
<mestatusme>
{
  "date": "...",
  "time": "...",
  "location": "...",
  "characters": "...",
  "others": "...",
  "innerthoughts": "..."
}
</mestatusme>
```

Field roles:

```text
date          = current date projection
time          = current time-of-day projection
location      = current specific location
characters    = active characters + clothing + visible action
others        = physically present minor/background characters
innerthoughts = private thought for each main active character
```

Approximate pipeline:

```text
recent narrative state
+ character/persona/lore context
→ conservative six-field scene snapshot
→ validation
→ bounded presentation adapter
→ reroll intent
→ sidecar output/context cleanup policy
```

---

## 3. Executive finding

This is one of the clearest references in the current batch for a **small schema-first derived scene snapshot**.

Strong transferable ideas:

1. Schema-First Derived Scene Snapshot
2. Conservative Continuity Projection
3. Validation Before Presentation
4. Presentation Localization Without Schema Mutation
5. Escaped Semantic Text Before HTML Materialization
6. Bounded Render Horizon
7. Intent-Only Reroll Surface
8. Presentation Failure Quarantine
9. Explicit Context Re-entry Policy

Strong cautions:

1. private thoughts need separate provenance/visibility authority,
2. derived status must not become canonical world state,
3. validator enforcement is weaker than the prompt contract,
4. duplicated serialized lorebooks can drift,
5. runtime helper code is dynamically loaded from a lorebook,
6. package asset extension metadata differs from actual image encoding.

---

## 4. Schema-first derived scene snapshot

The artifact does not ask the model for arbitrary status prose. It defines six explicit fields, requires JSON, then renders from the parsed object.

Useful abstraction:

```text
NARRATIVE STATE
→ BOUNDED DERIVED SCHEMA
→ PRESENTATION
```

Potential SimCore rule:

```text
stable derived semantics
→ small validated schema
→ renderer
```

rather than making the renderer scrape free-form prose.

Classification:

```text
P1 · STRONG · SCHEMA_FIRST_DERIVED_SNAPSHOT
```

---

## 5. Conservative continuity projection

The prompt explicitly prioritizes recent explicit facts and asks the generator to infer only what is necessary to complete the schema. It also warns against carrying obsolete location, clothing, posture or other scene details forward after the narrative has moved on.

Useful policy:

```text
RECENT EXPLICIT EVIDENCE
> CONSERVATIVE INFERENCE
> STALE HISTORICAL DETAIL
```

Classification:

```text
P1/P2 · PROMISING · CONSERVATIVE_CONTINUITY_PROJECTION
```

---

## 6. Derived panel is not canonical state

The rendered panel looks authoritative because it presents date, time, location and participants as structured facts.

But those values are still model-derived from narrative context.

Therefore:

```text
DERIVED STATUS PANEL
!=
CANONICAL WORLD STATE
```

If SimCore ever has a canonical owner for time, location, presence or similar state, that owner should supply the value and the sidecar should project it.

Classification:

```text
P1 PRINCIPLE · DERIVED_VIEW_NOT_CANONICAL_AUTHORITY
```

---

## 7. Private thoughts require a distinct authority class

`innerthoughts` is semantically different from visible action. The module asks for one private thought per main active character and permits inference based on personality, knowledge and emotion.

That means the field can mix:

```text
canonical authored mental state
inferential characterization
generated flavor
hidden/private information
```

A future SimCore equivalent should require:

```text
private-state assertion
→ provenance / owner check
→ visibility policy
→ optional projection
```

This strongly reinforces Audience Knowledge Boundary, Source-Specific Representation Policy and Canonical State Owner.

Classification:

```text
P1 · STRONG DESIGN LESSON · PRIVATE_STATE_PROVENANCE_GATE
DO_NOT_TRANSFER · INFERRED_PRIVATE_STATE_AS_CANONICAL_FACT
```

---

## 8. Visibility classes are at least separated in the schema

The artifact keeps:

```text
characters    = visible action
innerthoughts = private mental content
```

as different fields.

That is materially better than mixing visible behavior and hidden state into one prose blob.

Potential SimCore principle:

```text
OBSERVABLE PROJECTION
and
PRIVATE PROJECTION
should remain independently addressable
```

Classification:

```text
P1/P2 · PROMISING · VISIBILITY_CLASS_SEPARATION
```

---

## 9. Validation before presentation

`mestatusme.lb.onValidate` requires:

```text
exactly one <mestatusme> node
valid JSON table/object
all six required fields
all six fields as non-empty strings
```

This sharply reduces renderer ambiguity.

Preferred sequence:

```text
generation
→ semantic validation
→ presentation
```

Classification:

```text
P1 · STRONG · VALIDATE_BEFORE_PRESENTATION
```

---

## 10. WATCH · validator/schema contract gap

The generation prompt says:

```text
Use all six keys from the format and no additional keys.
```

But the validator only checks the six required fields. It does not reject additional keys.

So:

```text
PROMPT CONTRACT
>
MACHINE VALIDATOR CONTRACT
```

A future typed SimCore sidecar should make the validator authoritative for exact schema policy.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_VALIDATOR_SCHEMA_GAP
NOT A SIMCORE DEFECT
```

---

## 11. Escaping before HTML materialization

The renderer has a dedicated `safeHtml` path:

```text
normalize line endings
→ normalize existing <br> spellings back to newline
→ prelude.escEntities(text)
→ convert newline to <br>
→ concatenate escaped result into HTML
```

This is a strong positive reference compared with renderers that concatenate raw generated text into markup.

Classification:

```text
P1 · STRONG · ESCAPED_PRESENTATION_MATERIALIZATION
```

---

## 12. Presentation failure quarantine

The renderer uses `pcall` around JSON parsing and the outer rendering path.

Observed failure handling:

```text
JSON failure
→ bounded error panel

outer render failure
→ return original source data
```

This limits presentation failure blast radius.

Classification:

```text
P1 · PROMISING · PRESENTATION_FAILURE_QUARANTINE
```

---

## 13. Bounded render horizon

The edit-display listener compares message position to current chat length and skips rich rendering when:

```text
position < -5
```

So active presentation work is bounded to recent chat instead of re-rendering the full history.

Transferable principle:

```text
STORED SEMANTIC LIFETIME
!=
ACTIVE RENDER LIFETIME
```

Classification:

```text
P1/P2 · PROMISING · BOUNDED_RENDER_HORIZON
```

---

## 14. Explicit same-payload precedence

The display path queries all `mestatusme` nodes but renders only:

```text
lastNode = nodes[#nodes]
```

That provides a deterministic textual precedence rule when more than one same-type node exists.

A stronger SimCore implementation should still prefer explicit projection identity/lineage over relying only on textual order.

Classification:

```text
P2 · USEFUL · EXPLICIT_DERIVED_PRECEDENCE
WATCH · TEXT_ORDER_AS_PROJECTION_PRECEDENCE
```

---

## 15. Localization does not mutate semantic schema

The semantic field names remain fixed in English while the renderer maps labels to English, Korean or Japanese.

This creates the clean split:

```text
SEMANTIC SCHEMA
!=
PRESENTATION LANGUAGE
```

Classification:

```text
P1/P2 · PROMISING · PRESENTATION_LOCALIZATION_AXIS
```

---

## 16. Orthogonal control axes

Separate toggles exist for:

```text
mode
lazy/immediate generation
presentation language
presentation visibility
```

`mestatusme_status` is consumed by the renderer and can hide the panel without redefining the JSON schema.

This reinforces Orthogonal Projection Axes.

Classification:

```text
P2 · REINFORCING · ORTHOGONAL_PROJECTION_AXES
```

---

## 17. Intent-only reroll interaction

The panel and lazy placeholder expose the narrow action target:

```text
risu-btn="lb-reroll__mestatusme"
```

The renderer does not directly rewrite historical chat or maintain canonical status state.

Conceptually:

```text
UI
→ narrow reroll intent
→ generation owner
```

Classification:

```text
P1/P2 · PROMISING · INTENT_ONLY_REROLL
```

---

## 18. Explicit context re-entry policy

The `mestatusme.lb.onOutput` hook detects the sidecar and uses:

```text
prelude.removeAllNodes(output, { 'mestatusme' })
```

This is a clear LightBoard-family pattern for preventing derived display material from recursively becoming ordinary later processing context.

Transferable principle:

```text
DERIVED DISPLAY DATA
must have an explicit re-entry policy
```

Classification:

```text
P1/P2 · PROMISING · CONTEXT_REENTRY_POLICY
```

---

## 19. WATCH · optional renderer path conflicts with validation

The renderer marks `others` and `innerthoughts` rows as optional and CSS hides `.mestatusme-optional` only when its value is empty.

But the validator requires both fields to be non-empty strings. The prompt also explicitly requires `others="None"` when nobody qualifies, and `innerthoughts` is always required for active characters.

Therefore the empty-value hiding path is effectively unreachable for valid output under the declared contract.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_OPTIONAL_RENDER_CONTRACT_DRIFT
NOT A SIMCORE DEFECT
```

---

## 20. WATCH · duplicated semantic contract authority

The same six lorebook contents exist in both:

```text
card.json → character_book
module.risum → module.lorebook
```

They are identical in this artifact, so no current divergence exists. But independently serialized copies can drift in future edits or exports.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_DUPLICATED_CONTRACT_AUTHORITY
NOT A SIMCORE DEFECT
```

---

## 21. Dynamic executable prelude dependency

The trigger resolves the `lightboard-prelude` lorebook and executes its content with Lua `load()`.

Useful lesson: shared parsing/rendering behavior has a named dependency.

Direct-transfer caution:

```text
DO NOT use unversioned dynamically loaded text as SimCore production code authority
```

Any equivalent dependency should be pinned, versioned, ownership-scoped and part of verification identity.

Classification:

```text
DO_NOT_TRANSFER · UNVERSIONED_DYNAMIC_EXECUTABLE_DEPENDENCY
```

---

## 22. WATCH · privilege scope is broad

Both the outer card and embedded trigger declare:

```text
lowLevelAccess = true
```

Observed runtime operations include `getLoreBooks`, `getGlobalVar`, `getChatLength`, `listenEdit(editDisplay)` and dynamic prelude loading. No historical `setChat` mutation was observed in the decoded module.

Static evidence is insufficient to prove the permission is unnecessary, but the reference does not demonstrate a minimized capability contract.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_PRIVILEGE_SCOPE_NOT_MINIMIZED
NOT A SIMCORE DEFECT
```

---

## 23. WATCH · icon extension/encoding drift

The card declares:

```text
uri = embeded://assets/icon/image/main.png
ext = png
```

and the path is named `main.png`, but the actual 624-byte image is RIFF WebP data. `x_meta/main.json` reports `{"type":"WEBP"}`.

So the package has metadata for the real encoding while the filename and card extension label say PNG.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_ASSET_EXTENSION_ENCODING_DRIFT
NOT A SIMCORE DEFECT
```

Do not patch the archived source.

---

## 24. Display strings are not a canonical state shape

`characters` and `innerthoughts` pack multiple semantic fields into strings such as:

```text
Name(Clothing) - Visible action
Name: "Private thought"
```

This is compact and appropriate for a derived display panel, but weak as canonical state because identity and attributes are embedded inside presentation text.

Classification:

```text
GOOD FOR DERIVED DISPLAY
DO_NOT_TRANSFER AS CANONICAL STATE SHAPE
```

---

## 25. Relationship to existing LightBoard research

This artifact strongly reinforces:

```text
Owner-Scoped / Bounded Context Projection
Semantic Payload / Renderer Decoupling
Context Re-entry Firewall
Intent-Only Renderer Boundary
Presentation Failure Quarantine
Multi-Lifetime Sidecar
Orthogonal Projection Axes
```

It adds useful refinements:

```text
A. scene status can be a small schema-first derived projection
B. private mental state needs a provenance/visibility gate
C. renderer localization should not mutate semantic schema
D. semantic validation should be machine-authoritative
E. active render lifetime can be bounded separately from stored data
F. generated text should be escaped before HTML materialization
```

---

## 26. Final classification

```text
REFERENCE QUALITY                           = HIGH
DIRECT CODE REUSE AUTHORITY                 = NONE
SIMCORE FEATURE AUTHORITY                   = NONE

SCHEMA_FIRST_DERIVED_SNAPSHOT               = P1 STRONG
PRIVATE_STATE_PROVENANCE_GATE               = P1 STRONG DESIGN LESSON
VALIDATE_BEFORE_PRESENTATION                = P1 STRONG
ESCAPED_PRESENTATION_MATERIALIZATION        = P1 STRONG
DERIVED_VIEW_NOT_CANONICAL_AUTHORITY        = P1 PRINCIPLE
PRESENTATION_FAILURE_QUARANTINE             = P1 PROMISING
CONSERVATIVE_CONTINUITY_PROJECTION          = P1/P2 PROMISING
VISIBILITY_CLASS_SEPARATION                 = P1/P2 PROMISING
PRESENTATION_LOCALIZATION_AXIS              = P1/P2 PROMISING
CONTEXT_REENTRY_POLICY                      = P1/P2 PROMISING
BOUNDED_RENDER_HORIZON                      = P1/P2 PROMISING
INTENT_ONLY_REROLL                          = P1/P2 PROMISING
ORTHOGONAL_PROJECTION_AXES                  = P2 REINFORCING
EXPLICIT_DERIVED_PRECEDENCE                 = P2 USEFUL

INFERRED_PRIVATE_STATE_AS_CANONICAL_FACT    = DO_NOT_TRANSFER
DISPLAY_STRING_AS_CANONICAL_STATE           = DO_NOT_TRANSFER
UNVERSIONED_DYNAMIC_EXECUTABLE_DEPENDENCY   = DO_NOT_TRANSFER

VALIDATOR_SCHEMA_GAP                        = WATCH / UPSTREAM
OPTIONAL_RENDER_CONTRACT_DRIFT              = WATCH / UPSTREAM
DUPLICATED_CONTRACT_AUTHORITY               = WATCH / UPSTREAM
PRIVILEGE_SCOPE_NOT_MINIMIZED               = WATCH / UPSTREAM
ASSET_EXTENSION_ENCODING_DRIFT              = WATCH / UPSTREAM
TEXT_ORDER_AS_PROJECTION_PRECEDENCE         = WATCH
```

No runtime implementation is authorized by this analysis.

---

## 27. Suggested catalog delta

When the LightBoard-only idea catalog is next re-synthesized, consider adding or strengthening:

```text
LB-Ixx · Schema-First Derived Scene Snapshot
LB-Ixx · Private-State Provenance / Visibility Gate
LB-Ixx · Presentation Localization Without Schema Mutation
LB-Ixx · Escaped Presentation Materialization
LB-Ixx · Bounded Render Horizon
```

These remain research concepts until a concrete SimCore product problem requires them.
