# SimCore Post-3.0M PUBLIC_KNOWLEDGE Settlement Master Design — 2026-09-01

Date: 2026-09-01 KST

Status: **PUBLIC_KNOWLEDGE SETTLEMENT MASTER DESIGN FROZEN · DESIGN-ONLY · SNAPSHOT-ONLY FIRST SCOPE · CANDIDATE C NOT ACTIVATED · RUNTIME / PRODUCER / TRANSPORT / MOUNT NOT AUTHORIZED · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOURCE INTELLIGENCE · PUBLIC_KNOWLEDGE · SETTLEMENT · MASTER DESIGN · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

This document freezes the first overall design direction for the user-selected post-3.0M follow-up family:

```text
PUBLIC_KNOWLEDGE
```

The design problem is not simply a wiki renderer.

It is the epistemic transition:

```text
PUBLICLY EXPOSED
→ PUBLICLY REPORTABLE
→ PUBLIC-REFERENCE REPRESENTABLE
```

without allowing derived content, repeated news coverage, model rhetoric, or persuasive presentation to manufacture truth or settlement authority.

This document answers:

```text
What does "settled enough for public reference" mean architecturally?
How does settlement remain separate from exposure and canonical truth?
How are attributed, contested, corrected, and withdrawn public records represented without being laundered into settled facts?
What trusted context must exist before settlement can be machine-decided?
What document schema is safe before search/navigation/revision history exists?
How does presentation preserve epistemic status?
When would PUBLIC_KNOWLEDGE activate Candidate C?
```

This is design-only. It does not implement model output, transport, validation code, DOM/CSS, persistence, search, revision history, network/media, long-chat execution, release publication, S7/v0.70.3 changes, or `release-simcore` mutation.

## 1. Authority chain

PUBLIC_KNOWLEDGE consumes and does not replace the already-frozen Source Intelligence authority structure:

```text
Lineage / Handoff / Evidence
→ current source support

3M-2 Assertion / Exposure
→ public/source assertion eligibility

3M-3 Structured Sidecar / Validator
→ producer untrusted; validator owns final disposition

3M-4 Presentation Renderer
→ validated semantics only; DOM/CSS is non-canonical

3M-6 Support-at-use Invalidation
→ stale current authority invalidates current projection

3M-7 Context Re-entry Firewall
→ no structured source memory or automatic future prompt injection

3M-8 NEWS
→ publication maturity exists as a separate policy axis

3M-9 Integration
→ dormant when source-irrelevant; no derived family becomes another family's truth authority

3M-10 Convergence
→ first-major runtime remains NOT READY / NOT AUTHORIZED
```

Reference-only research:

```text
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_NAMUWIKI_1_8_0_2026-09-01.md
```

The reference strongly supports:

```text
PUBLIC_KNOWLEDGE_PROJECTION
DOCUMENT NAVIGATION AS PROJECTION REPLACEMENT
SEMANTIC DOCUMENT / RENDERER SEPARATION
EPISTEMIC QUARANTINE
```

but explicitly does not prove a complete universal settlement policy.

Production runtime remains independently authoritative on `release-simcore`.

## 2. Product identity

PUBLIC_KNOWLEDGE is a Source Intelligence family under existing mode semantics.

First relationship:

```text
mode = C
family = PUBLIC_KNOWLEDGE
```

Forbidden architecture:

```text
WIKI_MODE
ENCYCLOPEDIA_MODE
KNOWLEDGE_MODE
```

Canonical rule:

```text
RUNTIME MODE
!=
SOURCE FAMILY
!=
REFERENCE SETTLEMENT STATE
!=
PRESENTATION ADAPTER
```

A wiki-like visual surface does not create a new core mode or truth class.

## 3. First safe scope

The first design scope is intentionally narrow:

```text
DIRECT_B_ROOT_PUBLIC_KNOWLEDGE_SETTLEMENT_V1
PUBLIC REFERENCE SNAPSHOT
CURRENT PROJECTION ONLY
READ-ONLY
NON-PERSISTENT
NO SEARCH HISTORY
NO REVISION HISTORY
NO AUTOMATIC CONTEXT RE-ENTRY
NO NETWORK / MEDIA MATERIALIZATION
NO DERIVED-FAMILY SETTLEMENT INPUT
```

First structural authority:

```text
mode = C
source root = direct B root
sourceAuthorityRef = HANDOFF_EVIDENCE
family = PUBLIC_KNOWLEDGE
```

Not authorized by V1:

```text
A-root PUBLIC_KNOWLEDGE
INLINE_C ancestry
multi-B settlement consensus
NEWS → PUBLIC_KNOWLEDGE settlement propagation
BOARD → PUBLIC_KNOWLEDGE settlement propagation
SOCIAL_FEED → PUBLIC_KNOWLEDGE settlement propagation
persistent document identity
revision chain
cross-turn search/navigation
```

## 4. The three epistemic axes

PUBLIC_KNOWLEDGE must preserve three independent questions.

### Axis A · canonical/current world support

```text
what is true/current in world state?
```

Owned by existing canonical owners such as Frame / Continuity / Evidence as already defined.

### Axis B · exposure / public assertion eligibility

```text
may a public/source surface assert this?
```

Owned by 3M-2 Exposure Policy.

### Axis C · public-reference settlement

```text
if publicly assertable, how may it appear in a public-reference document?
```

Owned by the PUBLIC_KNOWLEDGE settlement validator over trusted settlement context.

Canonical separation:

```text
CANONICAL TRUE
!=
PUBLICLY EXPOSED
!=
PUBLIC-REFERENCE SETTLED
```

No axis may silently substitute for another.

## 5. NEWS does not bootstrap settlement

The first and strongest settlement invariant is:

```text
NEWS EXISTS
!=
PUBLIC KNOWLEDGE SETTLED
```

Likewise:

```text
MANY NEWS STORIES
!=
SETTLED

MANY BOARD POSTS
!=
SETTLED

MANY SOCIAL POSTS
!=
SETTLED

HIGH ENGAGEMENT
!=
SETTLED

OLD PUBLIC CLAIM
!=
SETTLED

CONVINCING WIKI PAGE
!=
SETTLED
```

Repeated derived-source agreement may be socially meaningful, but it is not a V1 settlement authority.

Any future design that intentionally derives settlement from prior derived-source objects is a separate cross-family provenance problem and may activate Candidate C C5.

## 6. Settlement is validator-owned

The main model / future document producer may propose semantic content.

It may not self-certify:

```text
settled
publicReference
contested
corrected
withdrawn
canonical
safeToRender
complete
```

Conceptual pipeline:

```text
UNTRUSTED PublicKnowledgeDocumentDraftV1
+
TRUSTED current SourceAuthorityContext
+
TRUSTED Exposure Policy Context
+
TRUSTED PublicKnowledgeSettlementContextV1
+
TRUSTED current DocumentTargetContextV1
        ↓
PUBLIC_KNOWLEDGE VALIDATOR
        ↓
ValidatedPublicKnowledgeDocumentV1
+
bounded PublicKnowledgeValidationReceiptV1
```

Canonical rule:

```text
MODEL / PRODUCER DECLARATION
!=
SETTLEMENT VERDICT
```

## 7. Trusted settlement context

Current 3.0M runtime design does not already expose a universal trusted object meaning:

```text
this assertion is settled enough for public reference
```

Therefore V1 freezes a required future boundary:

```text
PublicKnowledgeSettlementContextV1
```

This document freezes the consumer contract, not the runtime producer implementation.

A future producer must be explicitly authorized before PUBLIC_KNOWLEDGE runtime work can begin.

The producer may synthesize already-owned canonical/public evidence, but it must not create a second world-truth database.

Canonical boundary:

```text
SETTLEMENT CONTEXT
= TRUSTED PUBLIC-REFERENCE STATUS EVIDENCE

SETTLEMENT CONTEXT
!=
CANONICAL WORLD STATE OWNER
```

If settlement context is absent or incompatible:

```text
HOLD_UNKNOWN_SETTLEMENT
```

No prose guessing, history mining, or popularity heuristics are allowed.

## 8. Settlement basis identity

A future semantic draft may refer to an opaque settlement basis identifier:

```text
settlementBasisRef
```

This reference is untrusted in the draft.

The validator must exact-join it against trusted `PublicKnowledgeSettlementContextV1` entries.

Conceptual trusted entry:

```text
PublicKnowledgeSettlementBasisV1
  basisRef
  referenceState
  attributionLabel?       // only if trusted and needed
  sourceAuthorityRef
  targetRef
```

The producer cannot gain authority merely by guessing or copying a valid-looking `basisRef`.

Canonical rule:

```text
DRAFT REFERENCE STRING
!=
TRUSTED SETTLEMENT EVIDENCE
```

## 9. Settlement state vocabulary

The first frozen validator-derived states are:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
UNKNOWN_SETTLEMENT
```

These are public-reference states, not canonical truth classes.

### 9.1 SETTLED_PUBLIC_REFERENCE

Meaning:

```text
trusted settlement context authorizes ordinary public-reference presentation
```

It still does not promote the derived document into world canon.

### 9.2 ATTRIBUTED_BUT_NOT_SETTLED

Meaning:

```text
a public record or attributable claim exists,
but it must remain visibly attributed / unsettled
```

It must never render as an unqualified settled fact.

### 9.3 CONTESTED_PUBLIC_RECORD

Meaning:

```text
trusted settlement context records material public dispute or conflicting public record
```

The document may represent the dispute only with mandatory contested presentation semantics.

### 9.4 CORRECTED_CURRENT_RECORD

Meaning:

```text
a current corrected public-reference statement is available
```

V1 treats correction as current snapshot status, not a revision-history feature.

### 9.5 WITHDRAWN_OR_RETRACTED_RECORD

Meaning:

```text
a previously public claim is withdrawn/retracted
```

It may be represented only as an explicitly historical/withdrawn public record, never as a current settled fact.

### 9.6 UNKNOWN_SETTLEMENT

Meaning:

```text
trusted settlement evidence is unavailable or insufficient
```

Disposition:

```text
HOLD
```

## 10. Assertion modes remain separate

PUBLIC_KNOWLEDGE does not replace the 3M-2 assertion modes:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

Settlement state and assertion mode are independent axes but V1 defines compatibility rules.

### V1 compatibility matrix

```text
CONFIRMED_FACT
+ SETTLED_PUBLIC_REFERENCE
→ ALLOW_REFERENCE_SETTLED

ATTRIBUTED_SOCIAL
+ ATTRIBUTED_BUT_NOT_SETTLED
→ ALLOW_REFERENCE_ATTRIBUTED

ATTRIBUTED_SOCIAL
+ CONTESTED_PUBLIC_RECORD
→ ALLOW_REFERENCE_CONTESTED

CONFIRMED_FACT or ATTRIBUTED_SOCIAL
+ CORRECTED_CURRENT_RECORD
→ ALLOW_REFERENCE_CORRECTED
  subject to trusted settlement compatibility

ATTRIBUTED_SOCIAL
+ WITHDRAWN_OR_RETRACTED_RECORD
→ ALLOW_REFERENCE_WITHDRAWN

ANY
+ UNKNOWN_SETTLEMENT
→ HOLD_UNKNOWN_SETTLEMENT
```

V1 does not ordinary-render `INFERENCE_OPINION` as encyclopedic public knowledge.

```text
INFERENCE_OPINION
→ HOLD_UNSUPPORTED_REFERENCE_MODE_V1
```

A later design may add explicitly attributed reception/criticism/opinion sections, but it must do so intentionally.

## 11. Exposure remains a prerequisite

Settlement never bypasses 3M-2.

Validation order must include:

```text
source support
→ exposure/assertion eligibility
→ settlement compatibility
→ document hierarchy validation
```

Forbidden:

```text
private fact
+ SETTLED_PUBLIC_REFERENCE label
→ public wiki fact
```

Likewise:

```text
Knowledge-only fact
+ corrected badge
→ public fact
```

Settlement state cannot launder an unexposed assertion.

## 12. The document target is trusted, not model-named identity

The first V1 document target must come from current source-job / target authority, conceptually:

```text
PublicKnowledgeDocumentTargetContextV1
  targetRef
  displayLabel
```

The model may not create durable target identity from freeform title text.

Canonical rule:

```text
VISIBLE DOCUMENT TITLE
!=
DOCUMENT IDENTITY AUTHORITY
```

`displayLabel` may be rendered as the document title when trusted.

This avoids the reference hazard:

```text
presentation text
→ accidental target identity
```

## 13. V1 semantic document shape

The first PUBLIC_KNOWLEDGE schema deliberately avoids freeform wiki grammar.

Conceptual draft:

```text
PublicKnowledgeDocumentDraftV1
  family = PUBLIC_KNOWLEDGE
  targetRef
  assertions[]
```

Each assertion draft conceptually contains:

```text
ordinal
sectionKind
mode
content
settlementBasisRef
```

No producer-owned final settlement state is allowed.

## 14. V1 section kinds

To prevent freeform headings from becoming a new leakage surface, the first schema uses fixed semantic section roles rather than arbitrary model-authored heading text.

Frozen first roles:

```text
SUMMARY
PUBLIC_HISTORY
PUBLIC_RECORD
DISPUTES_AND_CORRECTIONS
```

Presentation derives localized/visual headings from these roles.

This means:

```text
section heading text
= presentation-derived label
```

rather than untrusted model semantic text.

A later document-grammar design may add validated freeform headings if a concrete consumer requires them.

## 15. Why fixed section roles are safer

Without fixed roles, a model could leak a quarantined fact through a heading:

```text
body = denied
heading = "Secret Disease"
```

V1 blocks that entire class by not allowing freeform semantic headings.

Canonical lesson:

```text
RICH DOCUMENT GRAMMAR
SHOULD FOLLOW
EPISTEMIC POLICY PROOF
```

not precede it.

## 16. No freeform title assertion

The V1 title comes from trusted target context.

The model does not produce a separate freeform title claim.

This removes another high-salience leakage channel and keeps identity ownership clean.

Later alternate-title / alias presentation requires its own validated semantic field.

## 17. Public-reference assertions may be status-bearing

PUBLIC_KNOWLEDGE is not limited to plain settled facts.

The family may represent:

```text
settled public facts
attributed but unsettled claims
contested public records
current corrections
withdrawn/retracted historical claims
```

provided their validator-derived state remains attached to the semantic assertion.

Canonical rule:

```text
NON_SETTLED PUBLIC RECORD
MAY BE REPRESENTED

BUT

MUST REMAIN NON_SETTLED IN SEMANTICS AND PRESENTATION
```

## 18. Renderer may not erase epistemic status

For:

```text
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
```

the presentation adapter must preserve a visible distinction appropriate to the state.

Forbidden:

```text
validated contested assertion
→ plain paragraph indistinguishable from settled fact
```

or:

```text
withdrawn record
→ ordinary reference fact styling
```

Presentation can change typography/layout but cannot strip settlement semantics.

## 19. Attribution labels

When an attributed/unsettled or contested item needs a source label, the label must come from trusted settlement/public context.

The renderer or model may not invent:

```text
"official source"
"experts"
"the public"
"multiple reports"
```

merely for realism.

Conceptual rule:

```text
ATTRIBUTION LABEL
IS SEMANTIC DATA
WHEN IT CLAIMS SOURCE IDENTITY
```

If no trusted attribution label exists, the system may use a generic status presentation such as `attributed / unsettled` without fabricating an actor/source name.

## 20. Validation pipeline

Frozen conceptual order:

```text
1. schema validation
2. targetRef exact join
3. current sourceAuthorityRef exact join
4. sectionKind validation
5. assertion mode validation
6. 3M-2 exposure/assertion policy
7. settlementBasisRef exact join
8. settlement-state / assertion-mode compatibility
9. hierarchical document construction
10. support-at-use gate
11. validated document + bounded receipt
```

The validator, not the main model, derives the final reference disposition.

## 21. Per-assertion disposition

Conceptual final dispositions:

```text
REFERENCE_ELIGIBLE_SETTLED
REFERENCE_ELIGIBLE_ATTRIBUTED
REFERENCE_ELIGIBLE_CONTESTED
REFERENCE_ELIGIBLE_CORRECTED
REFERENCE_ELIGIBLE_WITHDRAWN
QUARANTINED_DENY
QUARANTINED_HOLD
UNSUPPORTED_REFERENCE_MODE
INVALID_SETTLEMENT_REFERENCE
```

Exact implementation enums are not runtime-authorized here; this freezes the semantic distinctions.

## 22. Quarantined content does not enter the validated document

As with 3M-3:

```text
DENY / HOLD content
→ ordinary validated semantic sidecar에 복사하지 않음
```

The validation receipt may carry bounded metadata only:

```text
ordinal
sectionKind
mode
reference disposition
reason code
content length
```

It should not duplicate private/quarantined assertion text.

## 23. Document completeness is internal diagnostic state

A public-reference document may remain valid even if some draft assertions are quarantined.

Internal validator-derived completeness:

```text
COMPLETE_VALIDATED_PROJECTION
PARTIAL_VALIDATED_PROJECTION
EMPTY_VALIDATED_PROJECTION
```

But ordinary UI must not expose hidden private-content counts or details.

To avoid metadata leakage and false completeness claims, normal presentation should use a stable product rule:

```text
PUBLIC_KNOWLEDGE V1
= BOUNDED REFERENCE PROJECTION
```

regardless of whether internal draft material was quarantined.

Thus:

```text
"bounded projection"
```

is a product semantic, not a secret-content counter.

## 24. No exhaustive encyclopedia claim

The reference module sometimes requests exhaustive category membership.

SimCore V1 explicitly rejects:

```text
ALL members
ALL events
ALL related pages
complete world encyclopedia
```

unless completeness is separately proven by a future contract.

Default:

```text
BOUNDED REPRESENTATIVE PUBLIC-REFERENCE PROJECTION
```

This limits token pressure, invention pressure, and stale-world enumeration.

## 25. Correction semantics are current-snapshot-only

`CORRECTED_CURRENT_RECORD` means:

```text
the current public-reference projection may present a corrected current record
```

It does not imply:

```text
revision ID
old page lookup
revision diff
history browser
undo
restore
```

Those are durable document-lineage features and remain deferred.

## 26. Withdrawal semantics are current public record

`WITHDRAWN_OR_RETRACTED_RECORD` may represent a current public record that a prior claim was withdrawn.

It must not silently preserve the withdrawn claim as current truth.

V1 compatibility defaults to:

```text
WITHDRAWN state
+ ATTRIBUTED_SOCIAL
→ representable with mandatory withdrawn status
```

not:

```text
WITHDRAWN state
+ CONFIRMED_FACT
→ settled current fact
```

## 27. Contested semantics do not require family-side history scans

The PUBLIC_KNOWLEDGE validator must not search all previous NEWS/BOARD/SOCIAL_FEED entries to decide whether a claim is contested.

Trusted settlement context must already provide bounded contest status if authorized.

Canonical rule:

```text
CONTESTED STATUS
MAY BE CONSUMED

but

PUBLIC_KNOWLEDGE FAMILY
MUST NOT DISCOVER IT BY UNBOUNDED HISTORY MINING
```

## 28. Natural-language semantic-proof caveat

As with 3M-2 and NEWS maturity:

```text
MACHINE-CHECKABLE SETTLEMENT DISPOSITION
!=
MACHINE-PROVEN ARBITRARY NATURAL-LANGUAGE SEMANTIC MATCH
```

A future runtime producer/transport must provide bounded semantic references that make the join meaningful.

The validator must not pretend that keyword similarity proves settlement identity.

## 29. Support-at-use invalidation

PUBLIC_KNOWLEDGE inherits 3M-6.

If current source authority no longer matches the document's trusted support:

```text
whole current PUBLIC_KNOWLEDGE projection
→ invalid
```

V1 does not attempt partial descendant survival across source replacement.

Correction/quarantine inside a current valid projection is separate from source invalidation.

## 30. Failure taxonomy

PUBLIC_KNOWLEDGE preserves independent failure domains:

```text
SOURCE SUPPORT FAILURE
!=
EXPOSURE DENY/HOLD
!=
SETTLEMENT DENY/HOLD/INCOMPATIBILITY
!=
DOCUMENT STRUCTURE FAILURE
!=
PRESENTATION FAILURE
!=
OPTIONAL MEDIA FAILURE
```

Examples:

```text
stale sourceAuthorityRef
→ whole projection invalid

private assertion
→ policy quarantine

unknown settlement basis
→ HOLD / quarantine

invalid sectionKind
→ structural invalidity

renderer failure
→ semantic document remains valid
```

## 31. Presentation adapter

Frozen first adapter direction:

```text
PUBLIC_REFERENCE_DOCUMENT_V1
```

Conceptual presentation grammar:

```text
public-reference document
├─ trusted title / target label
├─ optional derived table of contents
├─ SUMMARY
├─ PUBLIC_HISTORY
├─ PUBLIC_RECORD
└─ DISPUTES_AND_CORRECTIONS
```

Only sections containing validated assertions need render.

Each non-settled assertion preserves a visible status treatment.

## 32. Presentation-derived state

The renderer may derive:

```text
table of contents
heading numbering
section visibility
collapse/expand state
responsive layout
footnote numbering if later added
```

These are:

```text
EPHEMERAL
NON-CANONICAL
NON-PERSISTENT
NON-MODEL-CONTEXT
```

They must not feed back into settlement or world truth.

## 33. CSS / DOM namespace direction

Future source-scoped root:

```text
[data-simcore-source-family="public-knowledge"]
```

Conceptual classes:

```text
sc-reference
sc-reference__header
sc-reference__title
sc-reference__toc
sc-reference__section
sc-reference__section-title
sc-reference__entry
sc-reference__status
sc-reference__body
```

Global CSS selectors or host-wide style mutation remain forbidden.

No DOM/CSS is implemented by this design.

## 34. Status presentation semantics

Possible conceptual visual treatments:

```text
SETTLED
→ ordinary reference paragraph

ATTRIBUTED
→ explicit attributed/unsettled marker

CONTESTED
→ explicit contested marker

CORRECTED
→ explicit corrected/current marker

WITHDRAWN
→ explicit withdrawn/retracted marker
```

Exact colors/icons are presentation decisions and must not become the sole carrier of semantic meaning.

Accessibility rule:

```text
STATUS MUST NOT BE COLOR-ONLY
```

## 35. Navigation remains deferred

The reference's navigation pattern is valuable:

```text
intent
→ select new document target
→ replace current projection
```

But settlement V1 does not freeze:

```text
search
internal links
related docs
recent docs
back stack
cross-turn document history
```

A future navigation design must establish trusted target identity and distinguish:

```text
same-request projection replacement
vs
cross-turn retrieval/history
```

The latter may activate Candidate C C2/C6.

## 36. No persistent document identity

V1 document target identity is current-request authority only.

It does not imply a durable article ID that survives across turns.

```text
CURRENT TARGET REF
!=
PERSISTENT WIKI PAGE ID
```

This keeps Candidate C closed.

## 37. Context and lifetime

PUBLIC_KNOWLEDGE inherits 3M-7:

```text
CURRENT_PROJECTION_ONLY
NO STRUCTURED SOURCE HISTORY
NO AUTOMATIC CONTEXT RE-ENTRY
NO HIDDEN RETRIEVAL
```

A rendered public-reference document may remain visible according to presentation lifetime without becoming future model memory.

Canonical rule:

```text
VISIBLE REFERENCE DOCUMENT
!=
FUTURE MODEL CONTEXT
```

## 38. Candidate C status

First PUBLIC_KNOWLEDGE design does not activate Candidate C.

Current matrix:

```text
C1 cross-turn derived survival       = no
C2 stable derived identity           = no
C3 item mutation                     = no
C4 append / merge / revision         = no
C5 derived-to-derived lineage        = no
C6 future context re-entry           = no
C7 partial descendant survival       = no
C8 delayed semantic side effect      = no
```

Candidate C becomes mandatory if a later concrete requirement asks for:

```text
persistent page identity
revision history
edit/restore old article
cross-turn search/navigation
stored backlink graph
NEWS → PUBLIC_KNOWLEDGE derived settlement propagation
partial old-page survival after source replacement
future context re-entry
async media attaching to an old document instance
```

## 39. PUBLIC_KNOWLEDGE and SOCIAL_FEED coexistence

The concurrently frozen SOCIAL_FEED master remains an independent post-3M family.

Canonical rule:

```text
SOCIAL_FEED OUTPUT
!=
PUBLIC_KNOWLEDGE SETTLEMENT AUTHORITY
```

Likewise:

```text
PUBLIC_KNOWLEDGE DOCUMENT
!=
SOCIAL_FEED TRUTH AUTHORITY
```

Their common snapshot-only/Candidate-C-closed posture is compatible but does not merge their semantics.

## 40. Multi-family fanout remains deferred

PUBLIC_KNOWLEDGE does not authorize automatic:

```text
event
→ NEWS
→ PUBLIC_KNOWLEDGE
```

or:

```text
event
→ BOARD + NEWS + PUBLIC_KNOWLEDGE
```

Each family remains independently current-authorized under existing 3M-9 principles.

## 41. Performance / dormancy

If no current PUBLIC_KNOWLEDGE source job exists:

```text
public-knowledge prompt burden = 0
settlement lookup = 0
public-knowledge history scan = 0
public-knowledge validation = 0
public-reference presentation build = 0
public-knowledge persistence read/write = 0
network/media call = 0
```

When active, work must scale with the bounded current document only.

No prior family/archive scan is allowed as a hidden prerequisite.

## 42. Runtime hard caps are required before implementation

This design does not choose final numeric caps.

Before any future runtime authorization, the family must freeze concrete limits for at least:

```text
max assertions per document
max assertions per section
max characters per assertion
max aggregate semantic characters
max validation receipt entries
max trusted settlement basis entries
```

This extends the same bounded-runtime principle used by 3M-9/G6.

## 43. Trusted settlement producer is a runtime-readiness blocker

The largest unresolved runtime requirement is:

```text
WHO MAY PRODUCE PublicKnowledgeSettlementContextV1?
```

This master design intentionally does not invent that owner.

Before implementation, a separate design checkpoint must prove:

```text
which existing canonical/public owners feed settlement context
what evidence classes are accepted
how corrections/contest are represented
how stale settlement context is rejected
why no second world-truth owner is created
```

Until then:

```text
PUBLIC_KNOWLEDGE_RUNTIME_READY = NO
```

## 44. No settlement-by-time heuristic

Unlike NEWS maturity, PUBLIC_KNOWLEDGE settlement does not automatically increase merely because narrative time passes.

Forbidden:

```text
wait 3 days
→ settled
```

Time may be part of a future trusted settlement basis, but age alone is not settlement authority.

## 45. No settlement-by-source prestige heuristic

A source that looks official, verified, or prestigious does not automatically settle the underlying claim.

```text
OFFICIAL-LOOKING PRESENTATION
!=
SETTLEMENT
```

Source identity may be part of trusted evidence, but the family must not infer settlement from style or name strings.

## 46. No settlement-by-frequency heuristic

Counting repeated statements is explicitly out of V1.

```text
count(claim mentions) > N
→ settled
```

is forbidden.

This prevents echo-chamber consensus from turning into fake epistemic authority.

## 47. No settlement-by-model confidence

The model's linguistic confidence is irrelevant to settlement.

```text
"definitely"
"widely known"
"everyone knows"
```

are just generated words unless supported by trusted semantic context.

## 48. Epistemic quarantine principle

The generated public-reference document remains a derived projection.

Even a `SETTLED_PUBLIC_REFERENCE` assertion means:

```text
eligible to appear as settled within this source role
```

not:

```text
derived wiki page becomes canonical continuity input
```

Canonical rule:

```text
VALIDATED PUBLIC_KNOWLEDGE
!=
CANONICAL WORLD STATE
```

## 49. Media materialization remains independent

No remote image, generated asset, external URL, or font/network lookup is required for PUBLIC_KNOWLEDGE semantic correctness.

```text
REFERENCE DOCUMENT VALIDITY
!=
MEDIA SUCCESS
```

Future media enrichment must be separately authorized and degrade safely.

## 50. Legacy `<COMMUNITY>` remains untouched

This follow-up does not modify:

```text
legacy <COMMUNITY> output
host transcript behavior
legacy Community context participation
```

Legacy migration remains a separate post-3M lane.

## 51. Explicit non-goals

This master design does not authorize:

```text
persistent wiki database
revision history
user page edits
article search engine
backlink graph
recent-document archive
related-document graph
cross-turn page identity
remote encyclopedia lookup
real Namuwiki/Wikipedia integration
media generation/fetch
automatic source consensus
NEWS repetition settlement
multi-family fanout
legacy Community migration
runtime implementation
```

## 52. BLOCKER classification

```text
BLOCKER · PUBLIC_KNOWLEDGE_WITHOUT_TRUSTED_SETTLEMENT_CONTEXT
BLOCKER · MODEL_SELF_CERTIFIES_SETTLEMENT
BLOCKER · NEWS_REPETITION_PROMOTES_SETTLEMENT
BLOCKER · DERIVED_FAMILY_OUTPUT_BECOMES_SETTLEMENT_AUTHORITY
BLOCKER · EXPOSURE_DENY_BYPASSED_BY_SETTLEMENT
BLOCKER · RENDERER_ERASES_NON_SETTLED_STATUS
BLOCKER · DOCUMENT_TARGET_IDENTITY_COMES_FROM_FREEFORM_PRESENTATION_TEXT
BLOCKER · PUBLIC_KNOWLEDGE_BECOMES_CANONICAL_WORLD_TRUTH
BLOCKER · SETTLEMENT_REQUIRES_UNBOUNDED_SOURCE_HISTORY_SCAN
BLOCKER · INFERENCE_OPINION_RENDERED_AS_SETTLED_REFERENCE_V1
```

## 53. WATCH classification

```text
WATCH · PARTIAL_VALIDATED_DOCUMENT_CAN_SHIFT_INTERPRETATION
WATCH · CORRECTION_WITHOUT_REVISION_HISTORY_MUST_REMAIN_CURRENT_SNAPSHOT_ONLY
WATCH · CONTESTED_STATUS_REQUIRES_TRUSTED BASIS, NOT MODEL RHETORIC
WATCH · ATTRIBUTION LABELS CAN ACCIDENTALLY CREATE SOURCE IDENTITY AUTHORITY
WATCH · FUTURE FREEFORM HEADING SUPPORT REOPENS LEAKAGE SURFACE
```

## 54. DEFER classification

```text
DEFER · DOCUMENT_SEARCH
DEFER · INTERNAL_LINK_NAVIGATION
DEFER · RELATED_DOCUMENTS
DEFER · RECENT_DOCUMENTS
DEFER · BACKLINK_GRAPH
DEFER · REVISION_HISTORY
DEFER · PERSISTENT_DOCUMENT_IDENTITY
DEFER · CATEGORY_COMPLETENESS
DEFER · INFOBOX / RICH DOCUMENT DSL
DEFER · PUBLIC_REFERENCE_MEDIA
DEFER · CROSS_FAMILY_SETTLEMENT_PROPAGATION
DEFER · FUTURE_CONTEXT_REENTRY
DEFER · A_ROOT_PUBLIC_KNOWLEDGE
DEFER · INLINE_C_PUBLIC_KNOWLEDGE
DEFER · MULTI_B_SETTLEMENT_WINDOW
```

## 55. Recommended follow-up checkpoints

The PUBLIC_KNOWLEDGE family should proceed through design-only checkpoints:

```text
PK-0  Settlement Master Design
      = this document

PK-1  Settlement Context Authority
      trusted producer ownership
      accepted basis classes
      correction/contest evidence boundary

PK-2  Document Sidecar + Validator Contract
      exact schema
      basisRef joins
      final receipt / quarantine rules

PK-3  Presentation Grammar
      PUBLIC_REFERENCE_DOCUMENT_V1
      status-preserving DOM/CSS contract

PK-4  Navigation / Document Target Reassessment
      default = still deferred
      same-request replacement vs persistent history

PK-5  Family Convergence / Candidate C Reassessment
      confirm snapshot-only close
      or activate Candidate C only if a real consumer requires durability
```

No checkpoint authorizes runtime implementation unless separately approved.

## 56. Frozen master decisions

```text
FOLLOW-UP FAMILY                      = PUBLIC_KNOWLEDGE
CORE MODE                             = unchanged
FIRST SCOPE                           = DIRECT_B_ROOT_PUBLIC_KNOWLEDGE_SETTLEMENT_V1
LIFETIME                              = CURRENT_PROJECTION_ONLY
PERSISTENCE                           = NONE
CONTEXT RE-ENTRY                      = NONE
DOCUMENT IDENTITY                     = CURRENT TARGET AUTHORITY ONLY
TITLE                                 = TRUSTED TARGET DISPLAY LABEL
FREEFORM HEADINGS                     = NOT IN V1
SECTION ROLES                         = SUMMARY / PUBLIC_HISTORY / PUBLIC_RECORD / DISPUTES_AND_CORRECTIONS
SETTLEMENT                            = SEPARATE POLICY AXIS
SETTLEMENT VERDICT OWNER              = VALIDATOR OVER TRUSTED SETTLEMENT CONTEXT
SETTLED MODE                          = CONFIRMED_FACT compatible
ATTRIBUTED / CONTESTED                = STATUS-BEARING, NOT SETTLED
INFERENCE_OPINION                     = HOLD / unsupported in V1
NEWS REPETITION                       = NOT SETTLEMENT AUTHORITY
DERIVED FAMILY OUTPUT                 = NOT SETTLEMENT AUTHORITY
FIRST PRESENTATION ADAPTER            = PUBLIC_REFERENCE_DOCUMENT_V1
DOCUMENT COMPLETENESS CLAIM           = BOUNDED PROJECTION ONLY
CANDIDATE C                           = CLOSED / CONDITIONALLY READY
RUNTIME SETTLEMENT PRODUCER           = NOT YET AUTHORIZED
RUNTIME IMPLEMENTATION                = NOT AUTHORIZED
PRODUCTION                            = UNCHANGED
release-simcore                       = UNCHANGED
```

## 57. Closure

The PUBLIC_KNOWLEDGE family is now defined as a source-specific public-reference projection with a stronger epistemic gate than NEWS:

```text
CURRENT AUTHORITY
→ current document target
→ bounded semantic assertions
→ source-support exact join
→ Exposure policy
→ trusted settlement context exact join
→ validator-derived reference state
→ status-preserving validated document
→ PUBLIC_REFERENCE_DOCUMENT_V1 presentation
→ no persistence / no re-entry / no settlement laundering
```

The most important invariant is:

```text
PUBLIC KNOWLEDGE
IS A DERIVED REFERENCE PROJECTION
NOT A NEW CANONICAL TRUTH DATABASE
```

The next design checkpoint is:

```text
PK-1 · Settlement Context Authority
```

That checkpoint must answer the one thing this master intentionally refuses to fake:

```text
what trusted owner is allowed to say that a public assertion is actually settled enough for reference presentation?
```
