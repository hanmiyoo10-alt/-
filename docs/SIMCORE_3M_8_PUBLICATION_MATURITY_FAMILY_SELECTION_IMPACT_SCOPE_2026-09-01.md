# SimCore 3M-8 Publication-Maturity Family Selection Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-8 READ-ONLY IMPACT SCOPE COMPLETE · NEWS SELECTED AS FIRST PUBLICATION-MATURITY FAMILY · PUBLIC_KNOWLEDGE DEFERRED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-8 · PUBLICATION MATURITY · FAMILY SELECTION · NEWS VS PUBLIC_KNOWLEDGE**

## 0. Purpose

This document scopes 3M-8 before any family contract is frozen.

It answers:

```text
Which publication-oriented family is the narrowest next design step?
What new authority dimensions appear beyond LIVE_REACTION and BOARD?
Which existing owners must remain authoritative?
Which tempting capabilities must remain out of scope?
```

This is design/research only. It does not implement runtime code, persistence, prompt/output transport, DOM/CSS, network/media, source-history re-entry, release publication, S7/v0.70.3 changes, or `release-simcore` mutation.

## 1. Authority chain

Inputs:

```text
docs/SIMCORE_GUIDELINES.md
docs/SIMCORE_CONTRACTS_V2.md
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01.md
docs/SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_NEWS_4_0_0_2026-08-30.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_NAMUWIKI_1_8_0_2026-09-01.md
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Candidates

The 3M master identifies:

```text
NEWS
PUBLIC_KNOWLEDGE
```

Both are source families orthogonal to A/B/C mode.

Neither may redefine core mode semantics.

## 3. What changes at publication maturity

LIVE_REACTION and BOARD primarily ask:

```text
can this audience/source receive the fact?
may it react/assert under exposure policy?
```

Publication families add another axis:

```text
may the source publish this degree of detail NOW?
```

Canonical separation:

```text
ASSERTION PUBLICLY ELIGIBLE
!=
PUBLICATION DETAIL MATURE
```

A fact can be publicly exposed while a publication is still too early to responsibly package detailed follow-up claims.

## 4. Existing authorities that must remain owners

3M-8 must reuse:

```text
Lineage / Handoff / Evidence
→ source support

3M-2 Exposure Policy
→ public/source assertion eligibility

Frame / Time / Continuity
→ narrative-time facts

3M-3 Validator
→ trusted disposition ownership pattern

3M-4 Presentation Renderer
→ DOM/CSS-only effect boundary

3M-6 Support Gate
→ stale projection invalidation

3M-7 Re-entry Firewall
→ no structured source memory
```

3M-8 must not create a second clock, world truth owner, source resolver, or context-history store.

## 5. NEWS impact profile

NEWS can remain a bounded current snapshot while introducing:

```text
publication maturity
source assertion provenance
article/story grouping
publication-shaped presentation
```

It can avoid, in V1:

```text
cross-turn article identity
archive retrieval
persistent publication history
external media
network enrichment
individual article mutation
canonical settlement
```

Therefore NEWS can fit the current ephemeral projection model.

## 6. PUBLIC_KNOWLEDGE impact profile

PUBLIC_KNOWLEDGE adds a stronger epistemic claim:

```text
this assertion is suitable for a public reference document
```

That is not equivalent to:

```text
it appeared in a prior reaction, board, or news source
```

A safe PUBLIC_KNOWLEDGE design requires an explicit settlement contract answering at least:

```text
what makes a fact settled enough for reference presentation?
how are rumors/corrections/retractions excluded or represented?
can a NEWS report ever upgrade world/public truth by repetition alone?
how is a public document replaced or navigated?
what provenance survives document replacement?
```

The Namuwiki reference is strong evidence for a document projection role but also shows that a good source persona does not itself prove complete public-knowledge policy.

## 7. Selection matrix

| Criterion | NEWS | PUBLIC_KNOWLEDGE |
| --- | --- | --- |
| Can remain current-snapshot-only | yes | yes in theory, but navigation pressure higher |
| Adds one clean new semantic axis | strong: publication maturity | stronger: settlement/reference status |
| Reuses current exposure policy directly | yes | requires stronger settlement layer |
| Requires persistent identity in V1 | no | not necessarily, but likely pressure |
| Requires context re-entry in V1 | no | no, but search/navigation may tempt it |
| Requires new canonical truth owner | no | must explicitly prevent accidental one |
| Risk of derived text being mistaken for canon | medium | high |
| Narrowness for first 3M-8 family | higher | lower |

## 8. Selected first family

The selected first 3M-8 family is:

```text
NEWS
```

Reason:

```text
NEWS introduces publication maturity
without requiring public-knowledge settlement
```

Canonical decision:

```text
FIRST_PUBLICATION_FAMILY = NEWS
PUBLIC_KNOWLEDGE = DEFERRED_UNTIL_SETTLEMENT_CONTRACT
```

## 9. First NEWS structural scope

The first NEWS family remains within the already-proven structural source slice:

```text
mode = C
source root = direct B root
sourceAuthorityRef = HANDOFF_EVIDENCE
family = NEWS
```

No A-root, INLINE_C, multi-B window, or generic source ancestry is authorized by 3M-8.

## 10. Publication maturity is a separate policy axis

The first NEWS design should keep two policy decisions distinct:

```text
A. EXPOSURE / ASSERTION POLICY
   may this claim be publicly/source-asserted?

B. PUBLICATION MATURITY POLICY
   may NEWS publish this degree/type of report at current narrative time?
```

A claim must pass both before a NEWS story becomes ordinary validated semantic output.

## 11. Maturity is temporal readiness, not truth

Publication maturity must not become another truth score.

```text
MATURE_ENOUGH_TO_REPORT
!=
CANONICAL_TRUE
```

Likewise:

```text
TOO_EARLY_TO_REPORT_DETAIL
!=
FALSE
```

A maturity failure should generally be a HOLD-like temporal disposition, not a world-truth denial.

## 12. No new clock

The LightBoard News reference usefully distinguishes breaking coverage from later detailed follow-up.

SimCore adaptation must consume existing time authority only:

```text
Frame / Time / Continuity
→ trusted publication-time context
```

Forbidden:

```text
NEWS module invents independent elapsed-time state
NEWS module estimates hidden timestamps from prose
```

## 13. Timing semantic-proof caveat

As with 3M-2 exposure, a deterministic policy over declared timing evidence does not prove arbitrary natural-language timing semantics.

Canonical principle:

```text
MACHINE-CHECKABLE MATURITY DISPOSITION
!=
MACHINE-PROVEN NARRATIVE TIMING BASIS
```

If trusted timing evidence is unavailable, detailed publication should fail closed / HOLD rather than guess.

## 14. Source assertion provenance becomes concrete

NEWS may contain claims with different source roles even when all are public-source eligible.

Candidate conceptual provenance classes:

```text
DIRECT_REPORT
OFFICIAL_STATEMENT
ATTRIBUTED_CLAIM
RUMOR
OPINION_COLUMN
ADVERTORIAL
CORRECTION
```

These are source-assertion roles, not canonical truth classes.

They must not override the 3M-2 assertion mode or exposure disposition.

## 15. No provenance laundering

Forbidden examples:

```text
private fact
→ label OFFICIAL_STATEMENT
→ public authority upgrade

rumor
→ label DIRECT_REPORT
→ confirmed-fact upgrade

ad copy
→ article layout
→ canonical fact
```

Canonical rule:

```text
REPORT KIND
!=
AUTHORITY UPGRADE
```

## 16. Story coherence pressure

NEWS introduces a grouping problem not present in flat LIVE_REACTION assertions.

A story headline can itself leak information even if body claims are quarantined.

Therefore the first NEWS design should treat headline and body semantic fields as policy-bearing content, not presentation labels.

Safer first rule:

```text
one denied/held semantic component
→ story not ordinary renderable
```

rather than partially rendering a potentially misleading or leaky story.

## 17. Coverage lens is intentionally narrow

The News reference shows value in source-specific editorial selection.

However the first SimCore NEWS family should not add a broad freeform editorial-style control surface.

First-slice direction:

```text
coverageLens = NEUTRAL_GENERAL_NEWS_V1
```

A future product requirement may add source presets, but style selection must not become semantic authority.

## 18. Publication metadata must not be decorative invention

Renderer-friendly fields such as:

```text
publication name
byline
published time
breaking badge
article category
```

must not be fabricated merely because a newspaper UI usually has them.

Every semantically meaningful metadata field must either:

```text
come from trusted publication context
or
be an explicitly validated derived semantic field
or
remain presentation-only and non-factual
```

## 19. NEWS presentation target

The likely 3M-8 presentation adapter is article-shaped rather than feed-shaped.

Conceptual target:

```text
NEWS_ARTICLE_V1
```

Possible grammar:

```text
publication surface
└ story
  ├ headline
  ├ source/provenance badge if policy allows
  └ validated semantic claims
```

Exact DOM/CSS belongs to the design checkpoint, not this impact scope.

## 20. Ads and advertorial

The News reference distinguishes ordinary news, ads, and advertorial-like content.

For 3M-8 V1:

```text
ADVERTORIAL may exist as an assertion provenance role
```

but paid-ad inventory, ad selection, ad targeting, external creative, and commerce behavior are out of scope.

## 21. Corrections

`CORRECTION` is useful as a source-local assertion role but must not imply persistent article revision in V1.

First slice remains snapshot-only:

```text
current NEWS projection may contain a correction story
```

but does not support:

```text
find old article
mutate old article
preserve revision chain
```

Those requirements would activate Candidate C gates C2/C3/C4.

## 22. No progress-driven task resurrection

A later event can make a follow-up news story semantically relevant, but source projection must not revive a completed user task merely because old news existed.

Current Task Primacy remains independent authority.

```text
NEW MATERIAL PROGRESSION
may justify new NEWS projection

OLD NEWS HISTORY
must not revive completed task
```

## 23. 3M-7 remains binding

NEWS V1 inherits:

```text
STRUCTURED_SOURCE_HISTORY_HORIZON = CURRENT_PROJECTION_ONLY
STRUCTURED_SOURCE_AUTOMATIC_REENTRY = NONE
```

No article archive, recent-news semantic store, or later prompt injection is authorized.

If a later NEWS feature requests re-entry, Candidate C C6 activates first.

## 24. Candidate C reassessment

NEWS V1 as scoped does not cross C1-C8.

```text
cross-turn survival = no
stable article identity = no
item mutation = no
append/merge = no
derived-from-derived = no
future re-entry = no
descendant survival = no
async semantic target = no
```

Therefore:

```text
CANDIDATE_C = NOT ACTIVATED
```

## 25. PUBLIC_KNOWLEDGE settlement blocker

Before PUBLIC_KNOWLEDGE can be frozen, a future design must establish a machine-checkable policy vocabulary for at least:

```text
ELIGIBLE_FOR_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED
RETRACTED_OR_CORRECTED
UNKNOWN_SETTLEMENT
```

The exact names are not frozen here.

The important boundary is:

```text
NEWS REPORT EXISTS
!=
PUBLIC KNOWLEDGE SETTLED
```

## 26. PUBLIC_KNOWLEDGE document-navigation pressure

The Namuwiki reference demonstrates useful projection replacement via search/internal links.

A future SimCore document family may use intent-only navigation, but it must decide whether navigation is:

```text
same-request projection replacement
or
cross-turn document history/retrieval
```

The latter may activate Candidate C C2/C6 and is not part of NEWS V1.

## 27. Network/media boundary

No headline image generation, remote image URL, external fact lookup, or network enrichment belongs to first NEWS semantic correctness.

```text
semantic validity
!=
media/network success
```

This preserves 3M master isolation and avoids C8 pressure.

## 28. Performance boundary

The design target remains:

```text
new model calls = 0 additional auxiliary calls
new network calls = 0
new history scans = 0
new persistent writes = 0
new timers/polling = 0
```

The main model remains the semantic content generator under a future separately authorized runtime contract.

## 29. Non-impact boundaries

3M-8 must not change:

```text
A/B/C mode semantics
legacy Community contract
current production v0.70.1
S7 / v0.70.3 lane
release-simcore
Context Projection parked blocker
Exposure target-host/model-compliance gate
3M-7 zero re-entry firewall
```

## 30. BLOCKER / WATCH / DEFER classification

```text
BLOCKER · NEWS_MATURITY_BECOMES_SECOND_TIME_OWNER
BLOCKER · NEWS_REPORT_KIND_UPGRADES_ASSERTION_AUTHORITY
BLOCKER · HEADLINE_BYPASSES_CLAIM_POLICY
BLOCKER · NEWS_HISTORY_AUTO_REENTERS_FUTURE_PROMPT
BLOCKER · PUBLIC_KNOWLEDGE_PROMOTED_FROM_NEWS_BY_REPETITION
BLOCKER · PUBLIC_KNOWLEDGE_CREATED_WITHOUT_SETTLEMENT_CONTRACT

WATCH · NATURAL_LANGUAGE_TIMING_BASIS_NOT_MACHINE_PROVEN
WATCH · NEWS_STORY_PARTIAL_RENDER_CAN_DISTORT_MEANING
WATCH · SOURCE_COVERAGE_LENS_CAN_DRIFT_INTO_STYLE_AUTHORITY

DEFER · PUBLIC_KNOWLEDGE_SETTLEMENT_POLICY
DEFER · PUBLIC_KNOWLEDGE_DOCUMENT_NAVIGATION
DEFER · NEWS_ARCHIVE_OR_RETRIEVAL
DEFER · ARTICLE_REVISION_CHAIN
DEFER · SOURCE_PRESET_EDITORIAL_LENSES
DEFER · HEADLINE_MEDIA_MATERIALIZATION
DEFER · EXTERNAL_NEWS_NETWORK_ENRICHMENT
DEFER · MULTI_B_NEWS_SOURCE_WINDOW
DEFER · A_ROOT_NEWS
DEFER · INLINE_C_NEWS
```

## 31. Selected 3M-8 design seam

The next design transaction should freeze:

```text
DIRECT_B_ROOT_NEWS_PUBLICATION_MATURITY_V1
```

with responsibilities limited to:

```text
NEWS semantic story shape
source assertion provenance role
publication maturity policy
story-level validation/coherence
NEWS presentation grammar
zero re-entry / zero persistence
```

## 32. Frozen verdict

```text
3M_8_IMPACT_SCOPE = COMPLETE
FIRST_PUBLICATION_FAMILY = NEWS
FIRST_SCOPE = DIRECT_B_ROOT_MODE_C
PUBLICATION_MATURITY = NEW SEPARATE POLICY AXIS
PUBLIC_KNOWLEDGE = DEFERRED_FOR_SETTLEMENT_CONTRACT
CANDIDATE_C = NOT ACTIVATED
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```
