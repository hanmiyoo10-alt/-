# SimCore Reference Analysis — LightBoard Namuwiki 1.8.0

Date: 2026-09-01 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
🔦라이트보드 나무위키 v1.8.0.risum
```

Original bytes: `67786`

Original SHA-256:

```text
beba5a303b2f9ed249f31acae5b9f84e50f8927204ca7bc7dfe5a40c793d7389
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
name            = 🔦라이트보드 나무위키 v1.8.0
description     = 나무위키 모듈
namespace       = namuwiki-module
id              = 6d619d6f-d933-46fb-9021-ec3239361968
lowLevelAccess  = true
```

Observed components:

```text
7 lorebooks
4 regex scripts
1 trigger script
0 embedded assets
```

Toggle axes:

```text
mode          = 끄기 / 메인 / 보조 / 자동
context       = 제거 / 포함
darkness      = 라이트 / 다크
length        = 보통 / 적게 / 많이 / 더많이
search        = free text
direction     = free text
lazy          = 즉시 / 누르면
show_footnote = 기본 / 펼치기
show_asset    = 끄기 / 켜기
```

Manifest:

```text
identifier=lightboard-namuwiki
authorsNote=true
charDesc=true
loreBooks=true
personaDesc=true
rerollBehavior=remove-prev
```

The semantic sidecar is a document-shaped textual DSL:

```text
<lightboard-namuwiki doc_title="..." main_color="#......" asset_src="..."
 related1="..." related2="..." related3="..."
 recent1="..." recent2="..." recent3="...">
[CategoryTable]...
[Infobox]...
[Toc]
[Heading]...
[Quote]...
[Paragraph]...
[List]...
[Table]...
</lightboard-namuwiki>
```

The renderer parses the sidecar into a wiki-style presentation with category tables, infobox, generated table of contents, headings, paragraphs and lists, quotes and footnotes, internal-link buttons, images, related/recent document navigation, reroll and search interaction.

---

## 2. Executive finding

Namuwiki 1.8.0 is one of the strongest references in the current batch for **epistemic projection and document-style derived views**.

Its approximate pipeline is:

```text
world / narrative context
+ explicit search term
+ optional user writing direction
→ public-wiki knowledge projection
→ structured article sidecar
→ document renderer
→ internal-link / related-document navigation intent
→ whole-document replacement
→ reroll replacement
→ bounded context re-entry policy
```

The strongest transferable ideas are:

1. **Public Knowledge Projection**
2. **Epistemic Source Policy for Derived Documents**
3. **Document Navigation as Projection Replacement**
4. **Semantic Document / Renderer Separation**
5. **Context Participation as an Orthogonal Axis**
6. **Multi-Lifetime Derived Documents**
7. **Presentation Failure Quarantine**
8. **Media Materialization Boundary**

The strongest cautions are exhaustive category enumeration, generated/embedded remote image URLs, delimiter-heavy sidecar state, broad `lowLevelAccess=true`, and incomplete public-knowledge scoping outside major-character articles.

---

## 3. Public Knowledge Projection

The prompt contains an unusually useful epistemic rule for major characters:

```text
article about a major character
→ public persona
+ known history
+ confirmed deeds
```

This is materially different from:

```text
all facts available to the model
→ article
```

The derived document has a source-role identity:

```text
PUBLIC COLLABORATIVE ENCYCLOPEDIA
```

That role should constrain what knowledge may appear.

Potential SimCore abstraction:

```text
CANONICAL WORLD FACTS
→ SOURCE KNOWLEDGE FILTER
→ SOURCE-SPECIFIC ASSERTION POLICY
→ DERIVED DOCUMENT
```

This strongly reinforces the existing LightBoard research item `Audience Knowledge Boundary` and generalizes it beyond comment/chat surfaces into document surfaces.

Classification:

```text
P1 · STRONG · EPISTEMIC PROJECTION
```

---

## 4. Public projection is not uniformly enforced

The module's strongest explicit public-knowledge constraint is scoped to major characters. Elsewhere it says article content should reflect the narrative and treats the in-universe encyclopedia as if it were real, but does not establish one universal visibility/provenance test for every event, organization, location, secret, or private fact.

Therefore:

```text
GOOD SOURCE ROLE
!=
COMPLETE EXPOSURE POLICY
```

A future SimCore equivalent should require the same exposure check for every assertion regardless of subject type.

Safer rule:

```text
assertion enters public document
only if
source can plausibly know assertion
+ assertion is exposed / publishable under source policy
```

Classification:

```text
WATCH · PUBLIC_KNOWLEDGE_POLICY_PARTIAL_SCOPE
NOT A SIMCORE DEFECT
```

---

## 5. Document navigation as projection replacement

Inline links, related documents, recent documents and search all converge on article-navigation intents such as:

```text
ChangeArticle/<topic>
```

The interaction guide then requests replacement of the whole current sidecar with a newly generated complete article.

This is architecturally cleaner than editing individual rendered DOM fragments or mutating old historical chat text.

Transferable pattern:

```text
UI navigation intent
→ semantic document owner
→ generate/resolve new projection
→ replace derived document instance
→ renderer displays result
```

The important idea is not the string command syntax. It is that navigation changes **which projection is active**, rather than granting the renderer direct authority over canonical world state.

Classification:

```text
P1 · PROMISING · DOCUMENT_PROJECTION_NAVIGATION
```

---

## 6. Semantic document / presentation adapter split

The generated data block is semantic-ish source material and the Lua trigger is a presentation adapter. The renderer converts typed-looking blocks such as `[Heading]`, `[Paragraph]`, `[Quote]`, `[CategoryTable]`, `[Table]`, and `[Infobox]` into presentation nodes.

This reinforces:

```text
SEMANTIC PAYLOAD
!=
PRESENTATION DOM
```

The module also auto-derives heading numbering, table of contents, contrast text color, footnote numbering, responsive layout, and expanded/collapsed presentation. Those are good examples of data that should remain derived presentation state rather than canonical semantic state.

Classification:

```text
P1/P2 · STRONG REINFORCEMENT · SEMANTIC/PRESENTATION SPLIT
```

---

## 7. Context participation is explicit and orthogonal

The `context` toggle controls whether old Namuwiki blocks remain available during later prompt processing.

Observed regex behavior:

```text
context=제거
→ sidecar removed from later model processing

context=포함
→ sidecar retained only within a bounded recent window
```

This creates three separate lifetimes:

```text
stored chat lifetime
model-context lifetime
render lifetime
```

The article surface itself does not change type when context participation changes. This reinforces Owner-Scoped Context Projection, Bounded Context Aperture, Context Re-entry Firewall, and Multi-Lifetime Sidecar.

Classification:

```text
P1/P2 · PROMISING · CONTEXT_PROJECTION
```

---

## 8. Reroll lineage is replacement-oriented

The manifest declares `rerollBehavior=remove-prev` and the visible UI exposes a document reroll control.

For a derived document this is a useful lineage policy:

```text
same source context
→ regenerate derived projection
→ previous derived sibling no longer treated as active lineage
```

A future SimCore document sidecar should preserve explicit provenance so reroll replacement cannot accidentally promote both versions as simultaneous truth.

Classification:

```text
P2 · REINFORCING · REROLL_AWARE_DERIVED_LINEAGE
```

---

## 9. Presentation failure quarantine

The renderer wraps block rendering and the outer display pipeline in `pcall`.

Observed behavior:

```text
single block parse failure
→ log bounded error
→ continue output construction

outer display failure
→ return original source data
```

This protects semantic/source material from presentation failure.

Classification:

```text
P1 · PROMISING · PRESENTATION_FAILURE_QUARANTINE
```

---

## 10. Media materialization boundary

The renderer accepts markdown image URLs, HTML `<img src=...>`, plain http(s) URLs, legacy `[Image:...]`, and `asset_src`, and turns them into actual image nodes. The stylesheet also imports a remote font from jsDelivr.

This means a generated semantic document can cause presentation-time external resource materialization:

```text
MODEL / SOURCE STRING
→ NETWORK-RELEVANT PRESENTATION RESOURCE
```

A future SimCore equivalent should not treat that conversion as inert formatting. Prefer allowlisted asset identity through a trusted materializer, or an explicitly approved remote-media policy with provenance and graceful degradation.

This strongly reinforces the SNS Forme research item `Media Materialization Boundary`.

Classification:

```text
P1 · STRONG REINFORCEMENT · MEDIA_MATERIALIZATION_BOUNDARY
DO_NOT_TRANSFER · GENERATED_REMOTE_URL_AS_UNCHECKED_RESOURCE_AUTHORITY
```

---

## 11. Exhaustive category enumeration is not bounded

The prompt requires Category Tables to include:

```text
ALL members, items, or sub-documents that belong to this category
```

This is an unsafe scaling rule for a long-lived, potentially large world. Requiring complete enumeration can cause output-token explosion, context pressure, repeated regeneration cost, stale/incomplete claims despite the word `ALL`, and pressure to invent missing members.

Safer abstraction:

```text
bounded representative projection
or
paged/queried category view
```

with explicit completeness metadata if completeness is actually known.

Classification:

```text
DO_NOT_TRANSFER · UNBOUNDED_EXHAUSTIVE_ENUMERATION
```

---

## 12. Generated document must not become canonical world truth

The module produces a detailed encyclopedia article with quotes, evaluations, controversies, trivia and editor-style interpretations. Even when the source-role policy is good, the generated article itself is still a derived projection.

Therefore:

```text
DERIVED WIKI ASSERTION
!=
CANONICAL WORLD FACT
```

A future SimCore implementation should preserve source role, provenance, grounding/confidence state, and non-authoritative derived status. Generated interpretations must not feed back into canonical continuity merely because they appear in a convincing encyclopedia format.

Classification:

```text
P1 PRINCIPLE · EPISTEMIC_QUARANTINE
DO_NOT_TRANSFER · DERIVED_DOCUMENT_AS_CANONICAL_TRUTH
```

---

## 13. Delimiter-heavy DSL is unsuitable for canonical state

The document language uses compact textual syntax such as:

```text
[Heading]Level:1|Title:...
[Infobox]Title:...|Key:Value
[Table]...|Row:A;;B;;C
✂️...✂️
📌...📌
❗...❗
➡️...➡️
```

The renderer includes substantial recovery logic for malformed or mixed delimiters. That is reasonable for a presentation-oriented generated document, but it is a warning against using the same shape as authoritative SimCore state.

Classification:

```text
DO_NOT_TRANSFER AS CANONICAL SIMCORE STATE
```

---

## 14. Shared prelude dependency is explicit but dynamically loaded

The trigger resolves a `lightboard-prelude` lorebook and executes it dynamically:

```text
getLoreBooks(..., 'lightboard-prelude')
→ load(...content...)()
```

Positive lesson: shared renderer/parsing capability has one named dependency.

Caution: missing or mismatched dependency can break the display path. A future SimCore equivalent should prefer an explicit versioned contract/dependency surface rather than implicit executable text lookup.

Classification:

```text
P2 · CONTRACT-FIRST DEPENDENCY LESSON
DO_NOT_TRANSFER · UNVERSIONED_DYNAMIC_CODE_DEPENDENCY
```

---

## 15. WATCH · broad low-level access appears unnecessary in observed code

The module declares:

```text
lowLevelAccess = true
```

But the decoded trigger primarily loads a named lorebook dependency, parses and renders current data, registers an edit-display listener, and emits interaction button intents. No historical `setChat` rewrite or comparable broad mutation was observed in this artifact.

This does not prove the permission is unnecessary in the live host, but static evidence does not show why broad low-level authority is required.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_PRIVILEGE_SCOPE
NOT A SIMCORE DEFECT
```

---

## 16. WATCH · format template attribute quoting drift

The canonical-looking format lore contains this opening-tag template:

```text
related2="(related article2)" related3="(related article3) recent1="(recent article1)
```

The closing quote after `related3` is missing in that template, while the longer Simulation Details guide describes the attributes separately and expects `related3` and `recent1` to be distinct.

This can teach the generator a malformed attribute boundary.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_FORMAT_TEMPLATE_QUOTE_DRIFT
NOT A SIMCORE DEFECT
```

Do not patch the archived source.

---

## 17. WATCH · related/recent semantic labels are not fully aligned

Prompt semantics define:

```text
related1..3 = detailed sub-topics of current document
recent1..3  = recently appeared articles not linked in current article
```

Renderer labels them as:

```text
recent*  → "관련 문서"
related* → "상세 문서"
```

The mapping is plausible, but the semantic names and visible labels do not match one-to-one strongly enough to treat them as a stable typed contract.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_NAVIGATION_LABEL_SEMANTICS
NOT A SIMCORE DEFECT
```

---

## 18. Search and direction are separate axes

The module independently exposes search term and writing direction.

This is a useful separation:

```text
WHAT DOCUMENT TO PROJECT
!=
HOW TO PRESENT / EMPHASIZE IT
```

That mirrors the broader Orthogonal Projection Axes principle. A future document system should avoid collapsing target identity, source policy, tone, context aperture and renderer style into one giant mode enum.

Classification:

```text
P2 · PROMISING · ORTHOGONAL_PROJECTION_AXES
```

---

## 19. User interaction should remain intent-only

Rendered internal links and document navigation buttons emit bounded action-shaped intents rather than directly mutating canonical world state. This is positive.

However, the action string embeds visible topic text directly:

```text
ChangeArticle/<topic text>
```

A stronger future contract would use intent type + opaque/validated target identity + optional display label.

Classification:

```text
P1/P2 · PROMISING · INTENT_ONLY_NAVIGATION
WATCH · PRESENTATION_TEXT_AS_TARGET_IDENTITY
```

---

## 20. Relationship to existing LightBoard research

Namuwiki 1.8.0 strongly reinforces:

```text
Audience Knowledge Boundary
Source-Specific Representation Policy
Owner-Scoped Context Projection
Bounded Context Aperture
Context Re-entry Firewall
Semantic Payload / Renderer Decoupling
Reroll-Aware Derived Lineage
Presentation Failure Quarantine
Intent-Only Renderer Boundary
Media Materialization Boundary
Orthogonal Projection Axes
```

It adds a particularly useful document-level refinement:

```text
PUBLIC_KNOWLEDGE_PROJECTION
+
DOCUMENT_NAVIGATION_AS_PROJECTION_REPLACEMENT
+
DERIVED_DOCUMENT_EPISTEMIC_QUARANTINE
```

This makes it one of the better current references for any future SimCore source-specific document sidecar.

---

## 21. Final classification

```text
REFERENCE QUALITY                              = HIGH
DIRECT CODE REUSE AUTHORITY                    = NONE
SIMCORE FEATURE AUTHORITY                      = NONE

PUBLIC_KNOWLEDGE_PROJECTION                    = P1 STRONG
EPISTEMIC_SOURCE_POLICY                        = P1 STRONG
DOCUMENT_NAVIGATION_AS_PROJECTION_REPLACEMENT  = P1 PROMISING
SEMANTIC_DOCUMENT_RENDERER_SPLIT               = P1/P2 STRONG
CONTEXT_PARTICIPATION_AXIS                     = P1/P2 PROMISING
PRESENTATION_FAILURE_QUARANTINE                = P1 PROMISING
MEDIA_MATERIALIZATION_BOUNDARY                 = P1 STRONG REINFORCEMENT
REROLL_AWARE_DERIVED_LINEAGE                   = P2 REINFORCING
ORTHOGONAL_SEARCH_DIRECTION_AXES               = P2 PROMISING

DERIVED_DOCUMENT_AS_CANONICAL_TRUTH            = DO_NOT_TRANSFER
UNBOUNDED_EXHAUSTIVE_ENUMERATION               = DO_NOT_TRANSFER
GENERATED_REMOTE_URL_RESOURCE_AUTHORITY        = DO_NOT_TRANSFER
DELIMITER_DSL_AS_CANONICAL_STATE               = DO_NOT_TRANSFER
UNVERSIONED_DYNAMIC_CODE_DEPENDENCY            = DO_NOT_TRANSFER

PUBLIC_KNOWLEDGE_POLICY_PARTIAL_SCOPE          = WATCH / UPSTREAM
PRIVILEGE_SCOPE                                = WATCH / UPSTREAM
FORMAT_TEMPLATE_QUOTE_DRIFT                    = WATCH / UPSTREAM
NAVIGATION_LABEL_SEMANTICS                     = WATCH / UPSTREAM
PRESENTATION_TEXT_AS_TARGET_IDENTITY           = WATCH
```

No runtime implementation is authorized by this analysis.

---

## 22. Suggested catalog delta

When the LightBoard-only idea catalog is next re-synthesized, consider adding or strengthening:

```text
LB-Ixx · Public Knowledge Projection for Derived Documents
LB-Ixx · Document Navigation as Projection Replacement
LB-Ixx · Derived Document Epistemic Quarantine
LB-Ixx · Bounded/Paged Enumeration Instead of Exhaustive Projection
```

Also strengthen the existing Media Materialization Boundary, Audience Knowledge Boundary, and Source-Specific Representation Policy with this artifact as supporting evidence.
