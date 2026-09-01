# SimCore 3M-8 NEWS Publication-Maturity Design — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-8 DESIGN FROZEN · NEWS SELECTED / DESIGNED · PUBLIC_KNOWLEDGE SETTLEMENT DEFERRED · DIRECT-B-ROOT MODE C ONLY · ZERO RE-ENTRY / ZERO PERSISTENCE · CANDIDATE C CLOSED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-8 · NEWS · PUBLICATION MATURITY · SOURCE ASSERTION PROVENANCE · STORY-ATOMIC VALIDATION · ARTICLE PRESENTATION**

## 0. Purpose

3M-8 freezes the first publication-oriented Source Intelligence family.

It answers:

```text
How does NEWS differ semantically from LIVE_REACTION and BOARD?
How is report timing separated from assertion exposure/truth?
How may source-assertion provenance be represented without authority laundering?
How are headline/body leakage and partial-story distortion prevented?
What is the first NEWS presentation grammar?
Why is PUBLIC_KNOWLEDGE not yet authorized?
```

This checkpoint is design-only.

It does not implement runtime production, prompt/output transport, persistent source state, source history, network/media, DOM/CSS, article archive/revision, PUBLIC_KNOWLEDGE, S7/v0.70.3 changes, release publication, or `release-simcore` mutation.

## 1. Authority chain

This design consumes:

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
docs/SIMCORE_3M_8_PUBLICATION_MATURITY_FAMILY_SELECTION_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_NEWS_4_0_0_2026-08-30.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_NAMUWIKI_1_8_0_2026-09-01.md
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. First supported scope

The only 3M-8 NEWS scope is:

```text
family = NEWS
mode = C
source root = direct B root
sourceAuthorityRef.kind = HANDOFF_EVIDENCE
rootMode = B
parentMode = B
parentIndex = rootIndex
depth = 1
projectionOrdinal = 0
```

Unsupported:

```text
A-root NEWS
INLINE_C NEWS
multi-B NEWS source windows
NEWS derived from BOARD/SOCIAL_FEED
external real-world network NEWS
PUBLIC_KNOWLEDGE
cross-turn NEWS continuation
```

These return/mean unsupported scope rather than guessed compatibility.

## 3. NEWS family role

NEWS is a **publication projection**, not a direct reaction surface.

Conceptual role:

```text
current eligible source/world evidence
+ source reachability
+ publication-time readiness
+ publication framing
→ bounded NEWS story projection
```

It does not own canonical world truth.

Canonical principle:

```text
NEWS ASSERTION
!=
CANONICAL WORLD FACT
```

Even a credible article remains a derived source assertion.

## 4. Orthogonal axes

NEWS preserves the 3.0M orthogonal model:

```text
MODE                 = A / B / C
SOURCE FAMILY        = NEWS
ASSERTION ELIGIBILITY= 3M-2 exposure policy
PUBLICATION MATURITY = 3M-8 timing/readiness policy
REPRESENTATION       = NEWS_ARTICLE_V1
CONTEXT RE-ENTRY     = NONE
```

No new core mode is introduced.

## 5. Two independent policy gates

Every NEWS semantic component must pass two independent policy axes.

### Gate A · Assertion / exposure

```text
May this proposition be expressed by the source under current exposure authority?
```

Owned by the inherited 3M-2 / 3M-3 policy path.

### Gate B · Publication maturity

```text
May this publication package this level of report detail now?
```

Owned by the new 3M-8 maturity policy.

Canonical rule:

```text
EXPOSURE_ALLOW
AND
MATURITY_ALLOW
→ candidate NEWS component/story may continue
```

Neither gate substitutes for the other.

## 6. Maturity is not truth

Publication maturity describes timing/readiness only.

```text
MATURITY_ALLOW
!=
WORLD_TRUE

MATURITY_HOLD
!=
WORLD_FALSE
```

Examples:

```text
fact publicly visible now
+ detailed investigative packaging too early
→ exposure may ALLOW
→ maturity may HOLD

rumor publicly circulating
+ enough time for newspaper to report rumor as rumor
→ maturity may ALLOW
→ assertion must still remain attributed/rumor-safe
```

## 7. No new clock owner

NEWS does not own time.

Trusted timing facts must originate from existing authorities such as:

```text
Frame
Time
Continuity
```

and source reachability/support from existing Source Intelligence owners.

Required conceptual direction:

```text
existing time/continuity authority
+ existing source reachability
→ trusted NewsPublicationMaturityPolicyContextV1
→ maturity policy
```

Forbidden:

```text
NEWS parser invents elapsed time
NEWS renderer estimates report age
model writes a timestamp and thereby proves maturity
```

## 8. Maturity semantic-proof caveat

The first design makes the **decision function** deterministic over declared trusted policy context.

It does not claim a generic machine system can infer publication timing correctly from arbitrary prose.

Canonical principle:

```text
MACHINE-CHECKABLE MATURITY DECISION
!=
MACHINE-PROVEN NATURAL-LANGUAGE TIMING BASIS
```

Future production activation requires a separately proven producer of trusted maturity context.

## 9. NEWS draft envelope

Conceptual untrusted draft:

```text
NewsSemanticSidecarDraftV1
  schemaVersion = 1
  family = NEWS
  projectionOrdinal = 0
  sourceAuthorityRef
  stories[]
```

Unknown fields are invalid.

The draft is semantic proposal data, not authority.

## 10. Source authority reference

NEWS V1 reuses the existing first-slice authority reference:

```text
HandoffEvidenceAuthorityRefV1
```

with the same exact join discipline frozen in 3M-3/3M-6.

NEWS does not add a second source/history resolver.

```text
NEWS draft source ref
↕ exact compare
trusted current SourceAuthorityContextV1
```

Any mismatch fails the semantic sidecar before publication policy matters.

## 11. Story draft shape

Conceptual story draft:

```text
NewsStoryDraftV1
  storyOrdinal
  requestedMaturity
  reportKind
  headline
  bodyAssertions[]
```

All fields are bounded and local to the current projection.

No story ID survives across turns.

## 12. Story ordinal

`storyOrdinal` is:

```text
projection-local locator only
```

It is not:

```text
article database ID
revision identity
URL identity
cross-turn identity
```

Candidate C remains closed because no story survives independently of the current projection.

## 13. Requested maturity levels

NEWS V1 freezes three requested report-detail levels:

```text
BREAKING_COARSE
DEVELOPING_DETAIL
FOLLOWUP_ANALYSIS
```

Meaning:

### `BREAKING_COARSE`

A first coarse report suitable once the event is current/reached and first-report readiness is established.

### `DEVELOPING_DETAIL`

More detailed packaging requiring stronger publication readiness than breaking coverage.

### `FOLLOWUP_ANALYSIS`

A later follow-up/analysis level requiring explicit follow-up readiness.

These levels describe requested publication detail, not confidence or canonicality.

## 14. Report-kind vocabulary

NEWS V1 freezes source-local assertion provenance roles:

```text
DIRECT_REPORT
OFFICIAL_STATEMENT
ATTRIBUTED_CLAIM
RUMOR
OPINION_COLUMN
ADVERTORIAL
CORRECTION
```

`reportKind` answers:

```text
what kind of publication assertion/frame is this story presenting?
```

It does not answer:

```text
is the underlying proposition canonically true?
is it safe to publish?
has it matured enough?
```

## 15. Report-kind semantics

### `DIRECT_REPORT`

The publication presents eligible information as its own report.

### `OFFICIAL_STATEMENT`

The publication reports that an identified/eligible source made a statement.

Important:

```text
"Agency stated X"
may be a confirmed fact about the statement event

!=
"X is canonically true"
```

### `ATTRIBUTED_CLAIM`

The story preserves an attributed claim without upgrading it to publication-owned fact.

### `RUMOR`

The publication reports rumor circulation as rumor.

### `OPINION_COLUMN`

The story is explicitly opinion/analysis framing.

### `ADVERTORIAL`

The item is source-local promotional/editorial material. It gains no special truth authority.

### `CORRECTION`

The publication presents correction/retraction-like information in the current projection.

V1 does not mutate a prior stored article because no article archive exists.

## 16. Report kind cannot launder authority

Canonical invariant:

```text
REPORT_KIND
!=
ASSERTION_AUTHORITY
```

Forbidden:

```text
private fact + OFFICIAL_STATEMENT label → public fact
unexposed rumor + RUMOR label → eligible rumor
hidden claim + OPINION_COLUMN label → safe inference
ad copy + newspaper layout → canonical truth
```

The assertion content still passes the ordinary 3M-2 exposure policy.

## 17. Headline is semantic content

NEWS headline text is not presentation-only metadata.

A headline can reveal the most sensitive proposition in the story.

Therefore conceptual shape:

```text
headline = SourceAssertionDraftV1-compatible semantic assertion
```

At minimum it carries:

```text
ordinal-like story-local role
mode
content
```

The headline must pass the same assertion policy discipline as body semantic content.

Forbidden:

```text
validate body
→ render arbitrary model headline
```

## 18. Body assertion shape

Each body assertion uses the inherited 3M-3 semantic assertion shape:

```text
SourceAssertionDraftV1
  ordinal
  mode
  content
```

Inherited mode vocabulary remains:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

## 19. WATCH · inherited `ATTRIBUTED_SOCIAL` token is family-narrow terminology

For NEWS, attributed claims may be official, journalistic, institutional, or rumor-based rather than literally social-media context.

The inherited enum token `ATTRIBUTED_SOCIAL` is therefore semantically narrower in name than the generalized concept needed by NEWS.

3M-8 does **not** silently rename or reinterpret the frozen 3M-2 token.

Instead:

```text
WATCH · ASSERTION_MODE_TERMINOLOGY_GENERALIZATION
```

A later convergence checkpoint may generalize the family-neutral enum only with an explicit compatibility mapping and no policy widening.

Until then NEWS must preserve attribution in content/reportKind without treating the token name as authority.

## 20. Trusted maturity policy context

Publication maturity inputs are separate from the model draft.

Conceptual type:

```text
NewsPublicationMaturityPolicyContextV1
  storyOrdinal
  basisState
  eventOccurredByCurrentFrame
  sourceReachedByCurrentFrame
  coarsePublicationReady
  detailedPublicationReady
  followupPublicationReady
```

where:

```text
basisState = PROVEN | UNKNOWN
```

These fields are not model-owned.

A future active producer must be owner-bounded to existing time/continuity/reachability authority.

## 21. Maturity context contradiction rules

The maturity levels are monotonic.

Therefore reject contradictory trusted context such as:

```text
followupPublicationReady = true
AND detailedPublicationReady = false

or

detailedPublicationReady = true
AND coarsePublicationReady = false
```

Also reject:

```text
sourceReachedByCurrentFrame = true
AND eventOccurredByCurrentFrame = false
```

unless a future source type explicitly proves predictive publication semantics. NEWS V1 does not.

Contradictory context is invalid input, not something the validator repairs.

## 22. Frozen maturity decision function

The NEWS maturity policy result is conceptual:

```text
NewsPublicationMaturityReceiptV1
  storyOrdinal
  eligibilityState = ALLOW | HOLD
  reasonCode
```

No `DENY` is required for ordinary temporal immaturity; exposure policy owns semantic/public denials.

### Step 1 · unknown basis

```text
basisState != PROVEN
→ HOLD / HOLD_UNKNOWN_PUBLICATION_MATURITY
```

### Step 2 · future event

```text
eventOccurredByCurrentFrame != true
→ HOLD / HOLD_FUTURE_NARRATIVE_EVENT
```

### Step 3 · source not yet reached

```text
sourceReachedByCurrentFrame != true
→ HOLD / HOLD_SOURCE_NOT_REACHED
```

### Step 4 · requested `BREAKING_COARSE`

```text
coarsePublicationReady == true
→ ALLOW / ALLOW_BREAKING_COARSE

else
→ HOLD / HOLD_DETAIL_AHEAD_OF_MATURITY
```

### Step 5 · requested `DEVELOPING_DETAIL`

```text
detailedPublicationReady == true
→ ALLOW / ALLOW_DEVELOPING_DETAIL

else
→ HOLD / HOLD_DETAIL_AHEAD_OF_MATURITY
```

### Step 6 · requested `FOLLOWUP_ANALYSIS`

```text
followupPublicationReady == true
→ ALLOW / ALLOW_FOLLOWUP_ANALYSIS

else
→ HOLD / HOLD_DETAIL_AHEAD_OF_MATURITY
```

## 23. Maturity reason-code vocabulary

Frozen first vocabulary:

```text
ALLOW_BREAKING_COARSE
ALLOW_DEVELOPING_DETAIL
ALLOW_FOLLOWUP_ANALYSIS
HOLD_UNKNOWN_PUBLICATION_MATURITY
HOLD_FUTURE_NARRATIVE_EVENT
HOLD_SOURCE_NOT_REACHED
HOLD_DETAIL_AHEAD_OF_MATURITY
```

These are validator-derived policy receipts, not model declarations.

## 24. Exposure contexts remain per semantic component

Every headline/body semantic component still requires its own trusted `SourceAssertionPolicyContextV1`.

Therefore one story may contain several assertion-policy evaluations.

NEWS may not use one story-level `public=true` switch to authorize all content.

Canonical rule:

```text
STORY SOURCE SUPPORT
!=
EVERY CLAIM PUBLIC
```

## 25. Story-atomic consumer rule

NEWS V1 chooses conservative **story-atomic acceptance**.

A story enters ordinary validated NEWS payload only when:

```text
source authority join = valid
AND
maturity result = ALLOW
AND
headline exposure result = ALLOW
AND
all body assertion exposure results = ALLOW
```

If any semantic component is `DENY` or `HOLD`, or story maturity is `HOLD`:

```text
whole story → QUARANTINED_STORY
```

No partial story is rendered in V1.

## 26. Why story-atomic acceptance is safer

Partial article salvage can distort meaning.

Examples:

```text
headline survives but qualifying body is held
→ overclaim

headline denied but body survives
→ contextless article

first paragraph allowed, correction paragraph held
→ misleading snapshot
```

Therefore V1 favors coherent whole-story quarantine over maximum salvage.

This is different from LIVE_REACTION, where independent comments/assertions may safely quarantine individually.

## 27. Story quarantine is not source invalidation

A quarantined story does not mean the source root is stale.

```text
STORY POLICY / MATURITY QUARANTINE
!=
SOURCE AUTHORITY INVALIDATION
```

3M-6 support state remains separate.

Likewise presentation failure remains a third independent class.

## 28. NEWS validated sidecar

Conceptual validated object:

```text
ValidatedNewsSemanticSidecarV1
  schemaVersion = 1
  family = NEWS
  projectionOrdinal = 0
  sourceAuthorityRef = validator-confirmed trusted ref
  stories[]
```

Only fully accepted stories enter `stories[]`.

No quarantined headline/body content is copied into the validated object.

## 29. Accepted story view

Conceptual accepted view:

```text
ValidatedNewsStoryViewV1
  storyOrdinal
  requestedMaturity
  reportKind
  headline
  bodyAssertions[]
  maturityReasonCode
```

Each semantic field in the accepted view has already passed its relevant policy gate.

The validated view still does not become canonical world truth.

## 30. Validation receipt

Diagnostics remain separate from semantic payload.

Conceptual receipt:

```text
NewsSemanticSidecarValidationReceiptV1
  validationState
  storyCount
  acceptedStoryCount
  quarantinedStoryCount
  perStory[]
```

A `perStory` receipt may contain bounded metadata such as:

```text
storyOrdinal
requestedMaturity
reportKind
maturityEligibility
maturityReasonCode
headlineEligibility
bodyAssertionCount
bodyAllowedCount
bodyDeniedCount
bodyHeldCount
consumerDisposition
```

It does not retain full quarantined story text.

## 31. NEWS overall states

Conceptual overall validator state reuses the existing shape where possible:

```text
VALID_EMPTY
VALID
VALID_WITH_QUARANTINE
QUARANTINED
UNSUPPORTED_SCOPE
INVALID
```

Interpretation:

```text
all stories accepted
→ VALID

accepted + quarantined stories
→ VALID_WITH_QUARANTINE

stories exist but none accepted
→ QUARANTINED

no stories and otherwise valid
→ VALID_EMPTY
```

Structural/authority invalidity remains `INVALID`.

## 32. No semantic repair

The NEWS validator remains judge-only.

It does not:

```text
rewrite headline
truncate claims into safer meaning
change reportKind
change requestedMaturity
downgrade DEVELOPING_DETAIL to BREAKING_COARSE
change assertion mode
invent attribution
invent time/reachability evidence
turn HOLD into ALLOW
```

A new draft must be generated in a separately authorized future production flow.

## 33. Coverage lens

NEWS references show value in differentiated source selection/framing.

The first NEWS family intentionally freezes only:

```text
coverageLens = NEUTRAL_GENERAL_NEWS_V1
```

This is a design constant / family profile, not a freeform model field.

No political/editorial ideology, outlet bias, tabloid mode, subject preset, or arbitrary tone surface is authorized by 3M-8 V1.

The goal is to prove publication semantics before expanding source personality.

## 34. Publication identity

NEWS V1 does not require a persistent named outlet identity.

A future presentation may display a generic source label such as a non-factual UI title derived from the adapter.

Semantically meaningful publication identity must come from an explicit trusted family/source configuration in a later design.

Do not fabricate outlet names in the renderer.

## 35. Publication time display

V1 does not freeze a model-authored `publishedAt` field.

If a future UI displays publication time, it must derive from trusted current Frame/Time authority or a dedicated trusted publication context.

Forbidden:

```text
model writes plausible timestamp
→ renderer treats timestamp as authority
```

## 36. Byline/category/view counts

V1 does not include:

```text
byline
reporter identity
article category
view count
share count
comment count
ranking
```

unless later semantic authority explicitly requires them.

Newspaper aesthetics cannot manufacture factual metadata.

## 37. Ads / advertorial boundary

`ADVERTORIAL` is a source-assertion provenance role only.

3M-8 does not design:

```text
ad inventory
ad targeting
payment/commercial state
external creative fetch
click tracking
sponsored-link navigation
```

A validated advertorial story is still a bounded semantic projection and must pass exposure/maturity rules.

## 38. Corrections in snapshot-only NEWS

A `CORRECTION` story can state a current correction as current source content.

But V1 cannot mutate a previous article because there is no archive or stable article identity.

```text
current correction projection
!=
article revision system
```

If future product requires actual prior-article correction/revision:

```text
Candidate C C2/C3/C4 reassessment required
```

## 39. Progress-gated follow-up

The News reference correctly distinguishes repetition from genuine material progression.

3M-8 V1 allows `FOLLOWUP_ANALYSIS` only when trusted maturity context says follow-up readiness exists.

However V1 has no old NEWS semantic history.

Therefore it does not compare against a stored prior article.

Current Task Primacy remains independent authority:

```text
follow-up readiness
!=
permission to revive completed user task
```

## 40. Presentation adapter

The first NEWS presentation adapter is frozen conceptually as:

```text
NEWS_ARTICLE_V1
```

Input:

```text
ValidatedNewsSemanticSidecarV1
```

Output:

```text
NewsPresentationModelV1
```

The adapter is read-only and cannot create semantic content.

## 41. NEWS presentation grammar

Conceptual DOM grammar:

```text
news source root
└ stories
  └ story
    ├ story header
    │ ├ report-kind badge (optional presentation of validated enum)
    │ └ headline
    └ story body
      └ accepted semantic assertion nodes
```

No unvalidated headline/body text enters the renderer.

## 42. CSS namespace

Future implementation must remain source-scoped, for example:

```text
[data-simcore-source-family="news"]
```

with classes conceptually like:

```text
sc-news
sc-news__stories
sc-news__story
sc-news__header
sc-news__kind
sc-news__headline
sc-news__body
sc-news__assertion
```

Exact CSS is not implemented or frozen as visual style by this design.

## 43. NEWS is not just BOARD with different CSS

Semantic difference:

```text
BOARD
→ post/reply social structure

NEWS
→ publication story + maturity + source-assertion provenance
```

Therefore renderer dispatch changes DOM grammar, but semantic family differences exist before presentation.

## 44. Interaction policy

NEWS V1 is:

```text
READ_ONLY
SNAPSHOT_ONLY
VIEW_LOCAL_ONLY
```

No semantic interaction is authorized:

```text
open article history
search archive
follow link to new story
edit story
correct old story
comment
share
bookmark
reroll one story
```

View-local collapse/expand may exist later as presentation state only.

## 45. No network/media requirement

NEWS semantic validity must not depend on:

```text
headline image generation
remote image URL
real news fetch
external search
RSS/API
font CDN
```

Presentation/media failure cannot change semantic validity.

No C8 asynchronous semantic-target requirement is introduced.

## 46. Source-history policy

NEWS V1 inherits 3M-7 exactly:

```text
STRUCTURED_SOURCE_HISTORY_HORIZON = CURRENT_PROJECTION_ONLY
STRUCTURED_SOURCE_AUTOMATIC_REENTRY = NONE
STRUCTURED_SOURCE_HISTORY_STORE = NONE
STRUCTURED_SOURCE_RETRIEVAL = NONE
```

No recent-news archive is silently created.

## 47. Candidate C status

NEWS V1 does not cross Candidate C activation gates.

```text
C1 cross-turn survival          = no
C2 stable article identity      = no
C3 item mutation                = no
C4 append/merge/revision        = no
C5 derived-from-derived lineage = no
C6 future context re-entry      = no
C7 descendant survival          = no
C8 delayed semantic side effect = no
```

Therefore:

```text
CANDIDATE_C = CONDITIONALLY_READY / NOT ACTIVATED
```

## 48. Source support / reroll behavior

NEWS inherits 3M-6 whole-projection support logic.

If supporting direct-B-root authority changes:

```text
old NEWS projection
→ INVALID_AUTHORITY_MISMATCH
→ do not reuse
```

V1 does not salvage stories individually after source replacement.

## 49. No double authority from prior sources

NEWS may report prior social/board claims only when current trusted source/exposure policy supports the relevant attributed assertion.

Forbidden chain:

```text
BOARD rumor existed
→ NEWS repeats rumor
→ NEWS existence proves rumor true
```

Also forbidden:

```text
NEWS report existed
→ later PUBLIC_KNOWLEDGE treats report as settled fact automatically
```

## 50. PUBLIC_KNOWLEDGE remains deferred

3M-8 does not freeze a `ValidatedPublicKnowledgeDocumentV1`.

Reason:

```text
public reference eligibility requires settlement semantics stronger than NEWS publication eligibility
```

A future PUBLIC_KNOWLEDGE design must first answer how claims become suitable for reference-style presentation without becoming a second canonical truth owner.

## 51. Minimum future PUBLIC_KNOWLEDGE settlement questions

A future checkpoint must answer:

```text
what qualifies as publicly settled?
what evidence classes are sufficient?
how are attributed-but-unsettled claims rendered?
how are contested claims represented?
how are corrections/retractions represented?
can repeated derived-source claims ever upgrade settlement? (default no)
what happens when canonical/source authority changes?
```

No generic answer is invented in NEWS V1.

## 52. Candidate future settlement vocabulary

Not frozen, but future research must distinguish states at least as strong as:

```text
ELIGIBLE_FOR_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED
RETRACTED_OR_CORRECTED
UNKNOWN_SETTLEMENT
```

These are research placeholders only.

## 53. Derived document quarantine principle

The Namuwiki reference strongly reinforces:

```text
DERIVED ENCYCLOPEDIA ASSERTION
!=
CANONICAL WORLD FACT
```

This remains binding for future PUBLIC_KNOWLEDGE.

A convincing document renderer may never manufacture canonicality.

## 54. No PUBLIC_KNOWLEDGE navigation yet

Search/internal-link projection replacement is promising, but not part of NEWS V1.

A future document navigation design must classify whether target replacement is:

```text
same-request ephemeral projection
or
cross-turn persistent/retrieved projection
```

Cross-turn form may activate Candidate C C2/C6.

## 55. Model role

The main model remains the **Semantic Renderer / semantic content generator** under the established terminology.

It may eventually propose:

```text
story structure
requested maturity
report kind
headline semantic content
body semantic assertions
```

but it does not own:

```text
source authority
exposure verdict
maturity verdict
canonical truth
consumer acceptance
```

## 56. SimCore role

SimCore remains responsible for:

```text
source structural eligibility
trusted authority join
exposure-policy disposition
maturity-policy disposition
story-atomic validation
quarantine
presentation dispatch
support invalidation
context re-entry firewall
```

Canonical role split:

```text
MODEL GENERATES MEANINGFUL NEWS CONTENT
SIMCORE OWNS WHEN / WHAT / HOW THAT SOURCE MAY PUBLISH AND DISPLAY
```

## 57. Validation order

Future active flow must conceptually respect:

```text
untrusted NEWS draft
      ↓
schema validation
      ↓
trusted source-authority exact join
      ↓
per-component 3M-2 exposure evaluation
      ↓
trusted story maturity evaluation
      ↓
story-atomic coherence/consumer rule
      ↓
validated NEWS semantic sidecar
      ↓
3M-6 support-at-use gate
      ↓
NEWS_ARTICLE_V1 presentation adapter
```

No downstream layer may bypass an earlier gate.

## 58. Structural invalidity vs semantic quarantine

### Structural/authority invalidity

```text
malformed schema
unknown field
invalid enum
duplicate ordinal
bad authority ref
contradictory trusted policy context
→ INVALID whole sidecar
```

### Policy/maturity ineligibility

```text
DENY/HOLD assertion
or maturity HOLD
→ quarantine story
→ sidecar may remain valid with other accepted stories
```

This preserves the 3M-3 distinction between bad input structure and policy rejection.

## 59. No hidden semantic leakage in receipts

Receipts may expose counts/statuses but not quarantined story bodies.

Do not store:

```text
quarantined headline
quarantined body text
private source raw body
hidden fact snippets
```

A diagnostic receipt must not become a secret source archive.

## 60. Bounded payload principle

NEWS V1 requires explicit implementation caps for:

```text
story count
headline length
body assertion count per story
body assertion length
aggregate semantic size
receipt size
```

As in 3M-3, exact product/UI character limits are not frozen by this design.

Future offline validator implementation, if separately authorized, should choose conservative technical safety caps and record them as constants/evidence rather than newspaper semantics.

## 61. Prompt/output transport remains unresolved

3M-8 does not decide how a model emits `NewsSemanticSidecarDraftV1` in production.

Still not authorized:

```text
hidden JSON tag
new output wrapper
provider structured-output mode
secondary model call
history parser extraction
```

This preserves the earlier 3M-3 transport boundary.

## 62. Exposure model-compliance gate remains separate

NEWS design reuses 3M-2 exposure semantics but does not prove the target model complies with them.

The existing Exposure target-host/model-compliance evidence lane remains independently pending.

```text
3M-8 DESIGN FROZEN
!=
MODEL COMPLIANCE PROVEN
```

## 63. Maturity model-compliance is also unproven

Likewise, the model may incorrectly request overly detailed maturity or phrase content that semantically exceeds the declared level.

Structural validation can prove policy-context mechanics, not arbitrary natural-language compliance.

Future eval work may be required before runtime activation.

## 64. Performance / persistence boundary

The design introduces no current runtime cost.

Future first active slice must preserve, unless separately redesigned:

```text
additional auxiliary model calls = 0
network calls = 0
history scans = 0
persistent source writes = 0
source-history store = 0
background workers = 0
timers/polling = 0
```

## 65. BLOCKERs

```text
BLOCKER · NEWS_CREATES_SECOND_TIME_OWNER
BLOCKER · NEWS_MATURITY_TREATED_AS_TRUTH_SCORE
BLOCKER · REPORT_KIND_UPGRADES_ASSERTION_AUTHORITY
BLOCKER · HEADLINE_BYPASSES_EXPOSURE_VALIDATION
BLOCKER · PARTIAL_STORY_RENDER_LEAKS_OR_DISTORTS_QUARANTINED_CONTENT
BLOCKER · NEWS_HISTORY_AUTO_REENTERS_MODEL_CONTEXT
BLOCKER · NEWS_REPORT_AUTO_PROMOTES_TO_PUBLIC_KNOWLEDGE
BLOCKER · PUBLIC_KNOWLEDGE_FROZEN_WITHOUT_SETTLEMENT_CONTRACT
BLOCKER · MODEL_AUTHORS_MATURITY_VERDICT
BLOCKER · RENDERER_AUTHORS_FACTUAL_PUBLICATION_METADATA
```

## 66. WATCH / DEFER

```text
WATCH · ASSERTION_MODE_TERMINOLOGY_GENERALIZATION
WATCH · NATURAL_LANGUAGE_TIMING_BASIS_NOT_MACHINE_PROVEN
WATCH · MODEL_MATURITY_LEVEL_COMPLIANCE_UNPROVEN
WATCH · NEUTRAL_COVERAGE_LENS_MAY_LATER_NEED_SOURCE_PRESETS

DEFER · PUBLIC_KNOWLEDGE_SETTLEMENT_POLICY
DEFER · PUBLIC_KNOWLEDGE_DOCUMENT_NAVIGATION
DEFER · PUBLIC_KNOWLEDGE_STRUCTURED_SCHEMA
DEFER · NEWS_ARCHIVE
DEFER · NEWS_RETRIEVAL
DEFER · NEWS_ARTICLE_REVISION_CHAIN
DEFER · NEWS_ITEM_LEVEL_REROLL
DEFER · NEWS_SOURCE_PRESET_LENSES
DEFER · NEWS_BYLINE_IDENTITY
DEFER · NEWS_MEDIA_MATERIALIZATION
DEFER · NEWS_EXTERNAL_NETWORK_ENRICHMENT
DEFER · MULTI_B_NEWS
DEFER · A_ROOT_NEWS
DEFER · INLINE_C_NEWS
```

## 67. Design invariants

```text
N1  NEWS is a derived publication projection, never canonical truth.
N2  exposure eligibility and publication maturity are separate gates.
N3  maturity is timing readiness, not confidence/truth.
N4  NEWS never owns an independent clock.
N5  maturity context is trusted/external to the model draft.
N6  reportKind is provenance/framing, not authority upgrade.
N7  headline is semantic and must be policy-validated.
N8  V1 acceptance is story-atomic.
N9  quarantined story content never enters validated payload or receipt.
N10 NEWS remains current-projection-only with zero structured re-entry.
N11 NEWS V1 has no stable article identity or archive.
N12 renderer may not invent factual publication metadata.
N13 presentation/media failure cannot change semantic validity.
N14 NEWS existence cannot settle PUBLIC_KNOWLEDGE.
N15 PUBLIC_KNOWLEDGE requires a separate settlement contract.
N16 Candidate C remains closed until an actual lifetime/dependency gate is crossed.
```

## 68. Design-only validation matrix

Future static/evidence tests should cover at least:

```text
public fact + BREAKING_COARSE + coarse ready
→ story eligible if all components exposure-ALLOW

public fact + DEVELOPING_DETAIL + only coarse ready
→ maturity HOLD / whole story quarantined

public fact + FOLLOWUP_ANALYSIS + followup ready
→ maturity ALLOW

future event + any requested maturity
→ HOLD_FUTURE_NARRATIVE_EVENT

source not reached + public event
→ HOLD_SOURCE_NOT_REACHED

unknown timing basis
→ HOLD_UNKNOWN_PUBLICATION_MATURITY

headline DENY + body ALLOW
→ whole story quarantined

headline ALLOW + one body HOLD
→ whole story quarantined

RUMOR reportKind + attributed eligible rumor text
→ may be eligible as rumor; no canonical upgrade

OFFICIAL_STATEMENT reportKind + "official stated X"
→ may describe statement occurrence; X not automatically world truth

source fingerprint changed after projection
→ old NEWS projection invalid under 3M-6

renderer failure
→ semantic NEWS remains valid; presentation failure only
```

No runtime test implementation is authorized by this document.

## 69. Non-goals

```text
NO runtime implementation
NO release transaction
NO new model call
NO network NEWS lookup
NO article archive
NO persistent publication identity
NO article correction mutation
NO per-story reroll
NO source history re-entry
NO Public Knowledge database
NO canonical settlement engine
NO headline image generation
NO ad platform
NO political/editorial outlet simulator
NO transcript filtering
```

## 70. Frozen verdict

```text
3M_8 = DESIGN_FROZEN
FIRST_PUBLICATION_FAMILY = NEWS
NEWS_SCOPE = DIRECT_B_ROOT_MODE_C
NEWS_SCHEMA = STORY_ORIENTED / UNTRUSTED_DRAFT → VALIDATED_SIDECAR
PUBLICATION_MATURITY_LEVELS = BREAKING_COARSE / DEVELOPING_DETAIL / FOLLOWUP_ANALYSIS
MATURITY_POLICY = TRUSTED_CONTEXT + DETERMINISTIC ALLOW/HOLD
SOURCE_ASSERTION_PROVENANCE = REPORT_KIND ENUM / NO AUTHORITY UPGRADE
HEADLINE_POLICY = SEMANTIC / VALIDATED
STORY_ACCEPTANCE = ATOMIC
PRESENTATION_ADAPTER = NEWS_ARTICLE_V1
SOURCE_HISTORY = CURRENT_PROJECTION_ONLY
AUTOMATIC_REENTRY = NONE
PERSISTENCE = NONE
CANDIDATE_C = NOT ACTIVATED
PUBLIC_KNOWLEDGE = DEFERRED_UNTIL_SETTLEMENT_CONTRACT
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
S7 / v0.70.3 = UNCHANGED
release-simcore = UNCHANGED
```

## 71. Next checkpoint handoff

The master next checkpoint is:

```text
3M-9 · Integration / Performance / Source-Irrelevant Baseline
```

3M-9 should test the **design as a system**, not implement it.

It must reconcile at least:

```text
LIVE_REACTION
BOARD
NEWS
exposure policy
publication maturity
support invalidation
zero context re-entry
presentation registry
source-irrelevant baseline
```

PUBLIC_KNOWLEDGE remains an explicitly deferred publication-settlement family and must not be smuggled into 3M-9 merely to fill taxonomy completeness.
