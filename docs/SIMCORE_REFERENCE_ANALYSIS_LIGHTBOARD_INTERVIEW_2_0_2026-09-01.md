# SimCore Reference Analysis — LightBoard Interview 2.0

Date: 2026-09-01 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
🔦 라이트보드-인터뷰2.0.risum
```

Original bytes: `14834`

Original SHA-256:

```text
99bc6753b2cda7cfe8925aa8eca65d0699d96da644bdc7953abc79d6c8839506
```

Archive authority:

```text
references/simcore-plugin-idea-drop-2026-09-01/
```

This is a user-supplied LightBoard-family reference. The analysis does not authorize code reuse, does not change SimCore runtime/release state, and does not modify `release-simcore`, `plugins/simcore/latest.js`, or `plugins/simcore/install.js`.

---

## 1. Decode and artifact anatomy

The file is a legacy RisuAI `.risum` module and decoded successfully using the documented RPack container shape.

Decoded identity:

```text
name            = 🔦 라이트보드-인터뷰
description     = 리얼인터뷰
namespace       = lightboard-interview
id              = 3e65fcf4-beae-40ea-b2f4-868a14772741
lowLevelAccess  = true
displayOrder    = 3000
```

Observed components:

```text
7 lorebooks
6 regex scripts
1 trigger script
0 assets
100-character toggle surface
```

Toggle axes:

```text
mode = 끄기 / 메인 / 보조 / 자동
lazy = 즉시 / 누르면
```

The manifest declares:

```text
identifier=lb-interview
authorsNote=true
charDesc=true
loreBooks=true
personaDesc=true
maxLogs=4
rerollBehavior=remove-prev
```

The module generates one structured interview sidecar:

```text
<lb-interview>
Name|Type|Question|Answer
</lb-interview>
```

with two projection modes:

```text
방송용 인터뷰
오프레코드 인터뷰
```

and four visible interaction intents:

```text
broadcast_auto
broadcast_q
offrec_auto
offrec_q
```

---

## 2. Executive finding

Interview 2.0 is a small but useful LightBoard reference because it makes several existing LightBoard-family ideas unusually explicit.

Its pipeline is approximately:

```text
bounded recent scene context
→ select one relevant character
→ choose public/off-record projection
→ generate one structured Q/A object
→ output repair + instance id
→ presentation adapter
→ optional targeted user interaction
→ remove semantic sidecar from later prompt context
```

The strongest transferable ideas are:

1. **Contextual Persona Projection**
2. **Question Ownership as an Orthogonal Interaction Axis**
3. **Explicit Context Re-entry Removal**
4. **Derived Sidecar Reroll Replacement**
5. **Recent-Window Presentation Retention**
6. **Targeted Interaction Intent**

The strongest caution is equally important:

> A private/off-record projection is not automatically canonical hidden truth.

The module's prompt encourages unfiltered hidden feelings, grudges and opinions. That is useful as a presentation style, but unsafe as a world-truth promotion rule.

---

## 3. Contextual Persona Projection

The same selected character can answer through two different social contexts:

```text
same character / same recent scene
→ 방송용 projection
→ 오프레코드 projection
```

The broadcast path asks for a measured public image and formal speech.  
The off-record path asks for casual, unfiltered speech and reduced impression management.

Transferable abstraction:

```text
SAME_SOURCE_ENTITY
+ DIFFERENT_SOCIAL_CONTEXT
→ DIFFERENT_PRESENTATION / ASSERTION POLICY
```

This reinforces the existing LightBoard research principle that source/channel policy is separate from world truth.

Classification:

```text
PROMISING · SOURCE/PERSONA PROJECTION
```

---

## 4. Epistemic boundary for private projections

The upstream off-record instructions go further than tone. They ask the model to reveal hidden feelings, grudges and opinions the character would never say publicly.

That creates a critical distinction:

```text
OFF_RECORD_GENERATED_ASSERTION
!=
CANONICAL_PRIVATE_FACT
```

A future SimCore equivalent must not promote a sidecar-generated private answer into continuity truth merely because the presentation claims sincerity.

Safer rule:

```text
private projection
= character-consistent derived assertion
+ provenance
+ non-authoritative status
unless independently grounded by canonical scene evidence
```

Classification:

```text
PROMISING PRESENTATION IDEA
REQUIRES EPISTEMIC QUARANTINE
```

---

## 5. Question ownership is orthogonal to projection mode

The four interaction buttons encode two independent axes:

```text
projection:
  broadcast / off-record

question ownership:
  auto-generated / user-supplied
```

This is architecturally cleaner than defining four unrelated modes.

Transferable principle:

```text
DO_NOT_COLLAPSE_ORTHOGONAL_INTERACTION_AXES
```

A future sidecar can preserve the semantic projection policy while allowing the user to replace only the question-selection step.

Classification:

```text
PROMISING · INTERACTION CONTRACT
```

This also reinforces the SNS Forme finding around orthogonal projection axes.

---

## 6. Targeted interaction intent

The renderer does not need to regenerate an entire main response simply to change how the interview is requested.

The visible buttons emit action identities that distinguish:

```text
generate both question + answer
vs
use user question + generate answer
```

The valuable abstraction is:

```text
UI intent
→ bounded sidecar semantic job
→ new derived object
```

not:

```text
UI button
→ unrestricted canonical state mutation
```

Classification:

```text
PROMISING · INTENT-ONLY INTERACTION
```

---

## 7. Explicit context re-entry removal

One regex script removes `<lb-interview>...</lb-interview>` during `editprocess`.

That means the module deliberately separates:

```text
visible derived artifact lifetime
from
future model-context lifetime
```

This is direct concrete evidence for the existing LightBoard principle:

```text
STORED / DISPLAYED
!=
MUST_REENTER_MODEL_CONTEXT
```

For SimCore, the important idea is not the regex itself. The important idea is an explicit owner-controlled re-entry policy for derived sidecars.

Classification:

```text
PROMISING · CONTEXT_REENTRY_FIREWALL
HIGH LONG_CHAT RELEVANCE
```

---

## 8. Bounded context aperture

The manifest declares `maxLogs=4`, and the core prompt focuses on the most recent scene rather than full-history reinterpretation.

This provides another concrete instance of:

```text
full conversation
→ bounded recent projection
→ one current semantic job
```

The exact number `4` is upstream policy, not a SimCore recommendation.

Classification:

```text
REINFORCES EXISTING · BOUNDED_CONTEXT_APERTURE
```

---

## 9. Derived sidecar reroll replacement

The manifest uses:

```text
rerollBehavior=remove-prev
```

This indicates that a rerolled derived interview should replace/retire its previous derived result rather than accumulate multiple simultaneously-current versions.

This aligns with SimCore's lineage principle:

```text
derived result currentness
must follow
source / request lineage currentness
```

Classification:

```text
PROMISING · REROLL-AWARE DERIVED LINEAGE
```

---

## 10. Recent-window presentation retention

The display layer intentionally suppresses old interview rendering and focuses work near the end of chat history.

Observed limits are not fully uniform:

```text
manifest semantic aperture = maxLogs 4
display regex gate         ≈ recent 5
trigger display bypass     = older than recent 10
```

The useful idea is multi-lifetime retention:

```text
semantic source aperture
!=
render lifetime
!=
host display processing window
```

The concrete thresholds should not transfer.

Classification:

```text
PROMISING PRINCIPLE · MULTI_LIFETIME_SIDECAR
```

---

## 11. WATCH · retention-window policy drift

The module uses several different numeric windows (`4`, approximately `5`, and `10`) across manifest, regex, and trigger layers.

These may be intentionally different because they govern different lifetimes. However, the source contains no obvious shared declaration explaining the relationship.

Risk:

```text
independently hard-coded windows
→ future maintenance drift
→ stale render / missing render edge cases
```

Classification:

```text
WATCH · UPSTREAM_REFERENCE_WINDOW_DRIFT
NOT A SIMCORE DEFECT
```

Do not patch the archived source.

---

## 12. Output repair and identity injection

`lb-interview.lb.onOutput` performs two post-generation repairs:

1. append a missing closing tag;
2. add a numeric `id` attribute when absent.

The first demonstrates a useful bounded repair layer:

```text
nearly-valid structured output
→ deterministic local repair
→ renderer input
```

The second introduces a random four-digit identity using `math.random(1000, 9999)`.

### Transferable part

```text
bounded structural repair before rendering
```

Classification:

```text
PROMISING · VALIDATION/REPAIR LAYER
```

### Non-transferable identity pattern

Random presentation ids are not source anchors and are not stable semantic identities.

Classification:

```text
DO_NOT_TRANSFER AS SEMANTIC IDENTITY
```

Any SimCore identity should derive from explicit lineage/object identity rather than presentation-time randomness.

---

## 13. Semantic payload / renderer separation

The model emits a compact semantic record rather than final styled HTML. Separate display regex scripts render broadcast and off-record presentations.

This strongly reinforces:

```text
semantic object
!=
presentation adapter
```

Classification:

```text
REINFORCES EXISTING · SEMANTIC_RENDER_SEPARATION
```

---

## 14. Presentation failure quarantine

The trigger wraps display processing in `pcall` and falls back to original data on failure.

Conceptually:

```text
renderer/display failure
→ preserve original upstream data
```

That is a good blast-radius boundary.

Classification:

```text
PROMISING · PRESENTATION_FAILURE_QUARANTINE
```

---

## 15. Direct-transfer rejects

### 15.1 Broad low-level access

The module declares:

```text
lowLevelAccess = true
```

The observed feature is small enough that broad privilege should not be treated as the preferred architecture.

Classification:

```text
DO_NOT_TRANSFER · BROAD_PRIVILEGE_AS_DEFAULT
```

### 15.2 Pipe-delimited semantic protocol

The canonical generated record is:

```text
Name|Type|Question|Answer
```

This is compact, but arbitrary answer/question text can contain delimiters and make parsing fragile.

Classification:

```text
DO_NOT_TRANSFER AS CANONICAL SIMCORE STATE
```

### 15.3 Generated private truth as canonical continuity

The off-record prompt asks the model to expose hidden internal truth.

Classification:

```text
DO_NOT_TRANSFER · GENERATED_PRIVATE_ASSERTION_AS_WORLD_FACT
```

### 15.4 Presentation-time random identity

The post-processor injects a random four-digit id.

Classification:

```text
DO_NOT_TRANSFER · RANDOM_ID_AS_LINEAGE_IDENTITY
```

---

## 16. Relationship to prior LightBoard research

Interview 2.0 strongly reinforces:

```text
Bounded Context Aperture
Context Re-entry Firewall
Semantic Payload / Renderer Decoupling
Intent-Only Renderer / Interaction
Reroll-Aware Derived Lineage
Presentation Failure Quarantine
Multi-Lifetime Sidecar
Orthogonal Projection Axes
```

It adds one especially useful refinement:

```text
CONTEXTUAL_PERSONA_PROJECTION
```

and one especially important epistemic caution:

```text
PRIVATE_PROJECTION_ASSERTION
!=
CANONICAL_PRIVATE_TRUTH
```

---

## 17. Final classification

```text
REFERENCE QUALITY                         = HIGH
DIRECT CODE REUSE AUTHORITY               = NONE
SIMCORE FEATURE AUTHORITY                 = NONE

CONTEXTUAL_PERSONA_PROJECTION             = PROMISING
QUESTION_OWNERSHIP_AXIS                   = PROMISING
TARGETED_INTERACTION_INTENT               = PROMISING
CONTEXT_REENTRY_REMOVAL                   = PROMISING / HIGH LONG_CHAT VALUE
BOUNDED_CONTEXT_APERTURE                  = REINFORCING
REROLL_AWARE_DERIVED_LINEAGE              = PROMISING
MULTI_LIFETIME_PRESENTATION               = PROMISING
STRUCTURAL_OUTPUT_REPAIR                  = PROMISING
PRESENTATION_FAILURE_QUARANTINE            = PROMISING

RETENTION_WINDOW_POLICY_DRIFT              = WATCH
BROAD_LOW_LEVEL_ACCESS                     = DO_NOT_TRANSFER
PIPE_DELIMITED_CANONICAL_PROTOCOL          = DO_NOT_TRANSFER
GENERATED_PRIVATE_TRUTH_PROMOTION          = DO_NOT_TRANSFER
RANDOM_PRESENTATION_ID_AS_SEMANTIC_ID      = DO_NOT_TRANSFER
```

No runtime promotion is authorized by this analysis. Any future SimCore design must be a separate bounded design transaction with explicit ownership, evidence, and release gates.
