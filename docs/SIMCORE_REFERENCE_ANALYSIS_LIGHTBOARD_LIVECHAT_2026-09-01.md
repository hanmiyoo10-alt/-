# SimCore Reference Analysis — LightBoard Live Chat

Date: 2026-09-01 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
🔦라이트보드 - 라이브챗.risum
```

Original bytes: `16979`

Original SHA-256:

```text
bb299ded52a369c5cd5367ae5a90e56eaa2ee60af5cf3824b704668ceb7a5909
```

Archive authority:

```text
references/simcore-plugin-idea-drop-2026-09-01/
```

This is a user-supplied LightBoard-family reference. The analysis does not authorize code reuse, does not change SimCore runtime/release state, and does not modify `release-simcore`, `plugins/simcore/latest.js`, or `plugins/simcore/install.js`.

---

## 1. Decode and artifact anatomy

The file is a legacy RisuAI `.risum` module and decoded successfully using the RPack container shape.

Decoded identity:

```text
name            = 🔦라이트보드 - 라이브챗
description     =
namespace       = lb-livechat
id              = 7eb08b98-512b-4c81-8ff0-065326ac4695
lowLevelAccess  = false
```

Observed components:

```text
6 lorebooks
4 regex scripts
1 trigger script
0 assets
```

Toggle axes:

```text
mode  = 끄기 / 메인 / 보조
lazy  = 즉시 / 누르면
style = 라이브챗 / 방송댓글
count = 3 / 5 / 7
```

Manifest:

```text
identifier=lb-livechat
authorsNote=false
charDesc=false
loreBooks=false
personaDesc=false
maxLogs=3
rerollBehavior=remove-prev
multilingual=false
```

The semantic sidecar is JSON wrapped in a LightBoard tag:

```text
<lb-livechat>
{"comments":[{"nick":"...","text":"..."}, ...]}
</lb-livechat>
```

`onOutput` adds the selected presentation style as metadata:

```text
<lb-livechat data-style="0|1">
...
</lb-livechat>
```

The trigger then renders that same semantic payload as either:

```text
LIVE CHAT
or
LIVE BROADCAST
```

---

## 2. Executive finding

Live Chat is a compact and unusually clear example of a **semantic sidecar with multiple presentation adapters**.

Approximate pipeline:

```text
bounded recent scene context
→ audience-style comment generation
→ strict JSON semantic payload
→ style metadata attachment
→ presentation adapter
→ reroll interaction
→ remove sidecar from later model context
```

The strongest transferable ideas are:

1. **One Semantic Payload → Multiple Presentation Adapters**
2. **Presentation Policy as Metadata, Not Semantic Rewrite**
3. **Explicit Context Re-entry Removal**
4. **Derived Sidecar Reroll Replacement**
5. **Deterministic Presentation Identity**
6. **Ephemeral Presentation-Only Metrics**
7. **Least-Privilege Rendering**
8. **Fail-Closed / Quarantined Presentation Behavior**

The strongest caution is:

> The module treats the entire recent scene as automatically visible to anonymous viewers.

That collapses the distinction between canonical scene truth and audience-exposed truth.

For SimCore, any equivalent Community/live-audience projection must consume an explicit exposure boundary rather than assume omniscient spectatorship.

---

## 3. One semantic payload, multiple presentation adapters

The model emits only one semantic shape:

```json
{"comments":[{"nick":"...","text":"..."}]}
```

The selected `style` is added as a tag attribute and interpreted later by the renderer.

The two presentation paths change:

```text
layout
spacing
header label
viewer icon/count
message density
footer styling
```

without requiring the model to emit a different semantic schema.

Transferable principle:

```text
SEMANTIC_PAYLOAD
!=
PRESENTATION_ADAPTER
```

and:

```text
one validated semantic object
→ adapter A
→ adapter B
```

This strongly reinforces the existing LightBoard-family research around semantic/presentation decoupling.

Classification:

```text
P1 · PROMISING · PRESENTATION ARCHITECTURE
```

---

## 4. Presentation policy carried as bounded metadata

`lb-livechat.lb.onOutput` performs one narrow transformation:

```text
<lb-livechat>
→
<lb-livechat data-style="N">
```

The semantic comments remain unchanged.

This is a useful pattern because presentation choice is represented separately from semantic content.

Potential SimCore abstraction:

```text
semantic object
+ presentation metadata
→ renderer selection
```

rather than:

```text
presentation choice
→ regenerate semantic object
```

Classification:

```text
P1/P2 · PROMISING · ADAPTER_SELECTION_METADATA
```

---

## 5. Explicit model-context re-entry removal

A dedicated `editprocess` regex removes `<lb-livechat>...</lb-livechat>` from later model-facing processing.

This makes the lifecycle distinction explicit:

```text
generated sidecar may remain stored/renderable
!=
sidecar must re-enter every later prompt
```

The module also limits generation context through:

```text
maxLogs=3
```

This reinforces two existing SimCore principles:

```text
BOUNDED_CONTEXT_APERTURE
DERIVED_CONTEXT_REENTRY = EXPLICIT
```

Classification:

```text
P1 · PROMISING · LONG_CHAT / CONTEXT HYGIENE
```

---

## 6. Derived sidecar reroll replacement

The manifest declares:

```text
rerollBehavior=remove-prev
```

and both lazy and rendered UI expose the narrow action:

```text
lb-reroll__lb-livechat
```

Conceptually:

```text
current derived audience projection
→ user requests reroll
→ previous derived projection retired
→ replacement projection generated
```

This is cleaner than preserving multiple simultaneously-current audience projections for the same source point.

Potential SimCore rule:

```text
DERIVED_REROLL
must preserve source lineage
and explicitly retire/replace prior derived output
```

Classification:

```text
P1/P2 · PROMISING · DERIVED_LINEAGE
```

---

## 7. Deterministic presentation identity from semantic identity

Nickname color is selected using a deterministic hash over the nickname:

```text
nickname
→ stable hash
→ one palette color
```

This means the same nickname maps to the same display color without storing separate color state.

Transferable principle:

```text
DERIVE_STABLE_PRESENTATION_ATTRIBUTE
FROM
STABLE_SEMANTIC_IDENTITY
```

where safe and collision-tolerant.

This is useful for low-stakes visual identity because it avoids unnecessary persistent state.

Classification:

```text
P2 · PROMISING · PRESENTATION_STATE_REDUCTION
```

Important boundary:

Nickname text itself is not a strong canonical identity. The useful idea is deterministic presentation derivation, not using display labels as authoritative object IDs.

---

## 8. Ephemeral presentation-only metrics

The renderer generates viewer counts with runtime randomness:

```text
reaction view count  = random 120..2400
broadcast view count = random 800..5600
```

Those values are not part of the model semantic payload.

This demonstrates a useful distinction:

```text
COSMETIC / ATMOSPHERIC UI VALUE
!=
SEMANTIC STATE
```

A future SimCore UI may safely generate low-stakes decorative state locally if the value is clearly non-authoritative.

However, if the UI implies that viewer count is a real world fact, rerender-time randomness becomes misleading.

Classification:

```text
P2 · PROMISING PRINCIPLE · EPHEMERAL_UI_STATE
WATCH · RANDOM_METRIC_VISUAL_DRIFT
```

---

## 9. Least-privilege renderer

Both the module and trigger declare:

```text
lowLevelAccess = false
```

The observed behavior renders structured output and emits the narrow reroll interaction without broad historical mutation.

This is positive reference evidence that:

```text
INTERACTIVE PRESENTATION
does not inherently require
BROAD LOW-LEVEL AUTHORITY
```

Classification:

```text
P1 · POSITIVE REFERENCE · LEAST_PRIVILEGE
```

---

## 10. Presentation failure quarantine

The display listener wraps its work in `pcall`.

Outer failure behavior:

```text
renderer exception
→ return original data
```

Malformed per-block JSON behavior:

```text
invalid or missing comments payload
→ remove malformed rendered block from the display pass
```

The raw stored semantic source is not rewritten by this rendering path.

This is a useful blast-radius boundary:

```text
presentation failure
must not become
canonical source mutation
```

Classification:

```text
P1 · PROMISING · PRESENTATION_FAILURE_QUARANTINE
```

---

## 11. Critical reject — source exposure collapse

The job instruction says, in effect:

```text
read the most recent scene
→ assume anonymous internet users are watching it
→ react to specific scene details
```

No separate check exists for:

```text
channel reachability
audience exposure
publication maturity
camera visibility
private/off-screen information
```

This directly collapses:

```text
CANONICAL_SCENE_FACT
into
AUDIENCE_VISIBLE_FACT
```

That conflicts with one of the strongest existing LightBoard-derived SimCore ideas:

```text
WORLD / CONTINUITY FACT
!=
FACT THIS AUDIENCE IS ALLOWED TO KNOW
```

A future SimCore live-audience projection should instead consume something like:

```text
canonical scene
+ exposure evidence
+ current source/channel
→ reaction-eligible fact set
→ audience sidecar
```

Classification:

```text
DO_NOT_TRANSFER · OMNISCIENT_AUDIENCE_ASSUMPTION
P1 · REINFORCES AUDIENCE_KNOWLEDGE_BOUNDARY
```

---

## 12. Source-local representation policy

The same audience semantic object supports two source-like presentation policies:

```text
라이브챗
방송댓글
```

The prompt also changes expected reaction density and commentary depth depending on style.

This is a small example of:

```text
SAME UNDERLYING EVENT
→ SOURCE/PRESENTATION POLICY A
→ SOURCE/PRESENTATION POLICY B
```

However, the module does not model separate exposure or publication rules for those sources.

Classification:

```text
P2 · REINFORCES SOURCE_SPECIFIC_REPRESENTATION
```

---

## 13. Strict structured output is a positive boundary

The module requires strict JSON inside one bounded semantic tag.

This is materially safer than delimiter-heavy records for free-form comment text because nickname/comment text may contain punctuation naturally.

Conceptual benefit:

```text
structured object
→ parser validation
→ renderer
```

rather than:

```text
free-form text
→ ad-hoc delimiter parsing
```

Classification:

```text
P1/P2 · POSITIVE REFERENCE · STRUCTURED_SIDECAR
```

This does not by itself make the payload canonical state. It remains a derived sidecar.

---

## 14. WATCH · unescaped generated text enters HTML

The renderer concatenates generated values directly into HTML:

```text
c.nick
c.text
```

No explicit HTML escaping function is visible in the trigger before insertion.

Whether this is exploitable depends on host sanitization and RisuAI rendering restrictions, which were not executed here.

Still, the transferable rule is clear:

```text
GENERATED_TEXT
must not be trusted as HTML
```

A future SimCore renderer should escape text fields or use a renderer/API that treats them as text nodes.

Classification:

```text
WATCH · UPSTREAM_PRESENTATION_ESCAPING
DO_NOT_TRANSFER · RAW_GENERATED_TEXT_HTML_CONCAT
NOT A SIMCORE DEFECT
```

---

## 15. WATCH · retention-window mismatch

The manifest declares:

```text
maxLogs=3
```

while the display regex keeps live-chat blocks approximately within:

```text
lastmessageid - 5
```

Those are different lifetimes and may be intentional:

```text
generation context window = 3
render visibility window   ≈ 5
```

That distinction is architecturally valid.

However, the values are independent hard-coded numbers and therefore can drift if one changes without the other.

Classification:

```text
WATCH · UPSTREAM_WINDOW_POLICY_DRIFT
```

This is not inherently a defect because model-context lifetime and render lifetime are allowed to differ.

---

## 16. WATCH · impossible global nickname uniqueness guarantee

The prompt states:

```text
Never repeat a nickname across turns.
```

But the generation context is explicitly bounded:

```text
maxLogs=3
```

and no persistent nickname registry is visible.

Therefore a long-running session cannot reliably guarantee global uniqueness from this module alone.

This illustrates a broader rule:

```text
DO NOT PROMISE GLOBAL INVARIANTS
WITHOUT A STATE OWNER THAT CAN OBSERVE THE FULL REQUIRED DOMAIN
```

For SimCore:

```text
bounded context
→ bounded uniqueness guarantee
```

unless durable identity state is explicitly owned elsewhere.

Classification:

```text
WATCH · UPSTREAM_UNBOUNDED_INVARIANT_WITH_BOUNDED_CONTEXT
PROMISING DESIGN LESSON
```

---

## 17. WATCH · archetype plan drift

The main archetype pool contains six entries:

```text
Hater
Lustful
Stan
Analyzer
Judge
Cheerleader
```

but the thoughts/planning block lists only five:

```text
Hater
Lustful
Stan
Analyzer
Judge
```

`Cheerleader` is omitted from the explicit planning checklist.

This is a concrete prompt-contract drift inside the archived artifact.

Potential effect:

```text
declared semantic option
!=
planning-stage option set
```

No live RisuAI execution was performed, so runtime impact is not proven.

Classification:

```text
WATCH · UPSTREAM_ARCHETYPE_PLAN_DRIFT
NOT A SIMCORE DEFECT
```

---

## 18. Random viewer counts must stay non-authoritative

Because viewer counts are generated during rendering, the same stored sidecar can display a different number after rerender.

That is acceptable only if the value is deliberately atmospheric.

Do not copy this pattern for:

```text
money
rank
time
votes
inventory
exposure count
factual audience size
diagnostic metrics
```

where reproducibility matters.

Transferable rule:

```text
RUNTIME_RANDOM_PRESENTATION
is allowed only for
EXPLICITLY_NON_SEMANTIC_DECORATION
```

Classification:

```text
P2 PRINCIPLE
WATCH IF PROMOTED TO SEMANTIC MEANING
```

---

## 19. Relationship to existing LightBoard research

Live Chat strongly reinforces:

```text
Audience Knowledge Boundary
Bounded Context Aperture
Context Re-entry Firewall
Semantic Payload / Renderer Decoupling
Source-Specific Representation
Ephemeral UI State Plane
Presentation Failure Quarantine
Derived Reroll Lineage
Least-Power UI Surface
```

It adds two particularly clear refinements:

```text
A. presentation adapter selection can be carried as bounded metadata
B. stable cosmetic identity can be derived from semantic labels without persistent UI state
```

Its most useful negative evidence is equally strong:

```text
C. current scene visibility must not imply audience knowledge automatically
D. generated text must not be inserted into HTML without an explicit escaping contract
E. bounded-context generators cannot enforce unbounded cross-turn uniqueness
```

---

## 20. Final classification

```text
REFERENCE QUALITY                         = HIGH
DIRECT CODE REUSE AUTHORITY               = NONE
SIMCORE FEATURE AUTHORITY                 = NONE

SEMANTIC_PAYLOAD_PRESENTATION_DECOUPLING  = P1 PROMISING
PRESENTATION_ADAPTER_METADATA             = P1/P2 PROMISING
CONTEXT_REENTRY_REMOVAL                   = P1 PROMISING
DERIVED_REROLL_REPLACEMENT                = P1/P2 PROMISING
LEAST_PRIVILEGE_RENDERER                  = P1 POSITIVE REFERENCE
PRESENTATION_FAILURE_QUARANTINE           = P1 PROMISING
STRUCTURED_JSON_SIDECAR                   = P1/P2 POSITIVE REFERENCE
DETERMINISTIC_COSMETIC_DERIVATION         = P2 PROMISING
EPHEMERAL_PRESENTATION_METRIC             = P2 / WATCH

OMNISCIENT_AUDIENCE_ASSUMPTION            = DO_NOT_TRANSFER
RAW_GENERATED_TEXT_HTML_CONCAT            = DO_NOT_TRANSFER / WATCH
GLOBAL_NICK_UNIQUENESS_WITH_BOUNDED_CTX   = WATCH
RETENTION_WINDOW_POLICY_DRIFT              = WATCH
ARCHETYPE_PLAN_DRIFT                       = WATCH
```

No runtime implementation is authorized by this analysis.

---

## 21. Suggested catalog delta

When the LightBoard-only idea catalog is next re-synthesized, this artifact should primarily strengthen existing entries rather than create a large new subsystem.

Suggested deltas:

```text
strengthen Audience Knowledge Boundary
strengthen Semantic Payload / Renderer Decoupling
strengthen Context Re-entry Firewall
strengthen Ephemeral UI State Plane
strengthen Presentation Failure Quarantine

candidate refinement:
Presentation Adapter Selection Metadata

candidate developer invariant:
Bounded context cannot guarantee unbounded identity uniqueness
```

The audience-exposure issue is the highest-value lesson from this artifact for SimCore.
