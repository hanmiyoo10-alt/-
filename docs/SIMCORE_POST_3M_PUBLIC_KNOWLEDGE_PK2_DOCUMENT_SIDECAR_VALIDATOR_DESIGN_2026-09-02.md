# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-2 Document Sidecar + Validator Design — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-2 DESIGN FROZEN · DOCUMENT SIDECAR / VALIDATOR CONTRACT FROZEN · ASSERTION-LEVEL QUARANTINE · BOUNDED PARTIAL DOCUMENT · CANDIDATE C NOT ACTIVATED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-2 · STRUCTURED SIDECAR · VALIDATION · REFERENCE STATE · QUARANTINE · BOUNDED RECEIPT**

## 0. Purpose

PK-0 defined PUBLIC_KNOWLEDGE as a stronger public-reference family.
PK-1 defined the trusted current-projection settlement context authority seam.

PK-2 freezes the first exact semantic document / validator contract that consumes those authorities.

Canonical problem:

```text
UNTRUSTED MODEL-GENERATED REFERENCE CONTENT
+
TRUSTED CURRENT SOURCE / TARGET / EXPOSURE / SETTLEMENT CONTEXT
        ↓
MECHANICAL VALIDATION
        ↓
BOUNDED STATUS-PRESERVING PUBLIC-REFERENCE DOCUMENT
```

This is design-only.

It does not implement producer code, prompt transport, parser hooks, hidden JSON, runtime schema objects, DOM/CSS, persistence, navigation, revision history, search, media, network calls, model calls, or release changes.

## 1. Authority ownership

PK-2 preserves the existing authority split.

```text
Frame / Continuity / Time
→ canonical/current world semantics where already owned

Evidence / Lineage / Handoff
→ current exact support and evidence binding

3M-2 Exposure
→ public assertion eligibility

PK-1 Settlement Context Composer
→ bounded trusted settlement-basis context

PK-2 PUBLIC_KNOWLEDGE Validator
→ final public-reference disposition

PK-3 Presentation Renderer
→ visual status-preserving document grammar
```

Canonical separation:

```text
CANONICAL TRUTH OWNER
!=
EXPOSURE OWNER
!=
SETTLEMENT BASIS COMPOSER
!=
FINAL REFERENCE VALIDATOR
!=
PRESENTATION RENDERER
```

## 2. First supported scope

```text
DIRECT_B_ROOT_PUBLIC_KNOWLEDGE_DOCUMENT_VALIDATION_V1
mode = C
family = PUBLIC_KNOWLEDGE
source root = direct B root
sourceAuthorityRef = HANDOFF_EVIDENCE backed
lifetime = current projection only
```

No A-root, INLINE_C, multi-B consensus, cross-family settlement propagation, durable page identity, revision history, or future re-entry is authorized.

## 3. Input objects

Conceptual validator inputs:

```text
A. PublicKnowledgeDocumentDraftV1
B. SourceAuthorityContextV1
C. PublicKnowledgeDocumentTargetContextV1
D. SourceAssertionPolicyContextV1[]
E. PublicKnowledgeSettlementContextV1
```

A is untrusted.
B-E are trusted current authority inputs according to their existing owners.

## 4. Draft schema

Frozen conceptual V1 draft:

```text
PublicKnowledgeDocumentDraftV1
  schemaVersion
  family
  targetRef
  sourceAuthorityRef
  assertions[]
```

Required values:

```text
schemaVersion = 1
family = PUBLIC_KNOWLEDGE
```

The draft cannot carry final document status or final settlement status.

## 5. Assertion draft schema

```text
PublicKnowledgeAssertionDraftV1
  ordinal
  sectionKind
  mode
  content
  settlementBasisRef
```

Producer-owned fields stop here.

Forbidden producer fields include:

```text
referenceState
finalDisposition
isSettled
isContested
isCorrected
isWithdrawn
isPublicReference
safeToRender
isValid
completeness
confidence
sourcePrestige
consensusScore
```

## 6. Draft sourceAuthorityRef

`sourceAuthorityRef` in the draft is an untrusted join claim.

The validator must exact-match it against current trusted `SourceAuthorityContextV1`.

```text
DRAFT SOURCE REF STRING
!=
CURRENT SOURCE AUTHORITY
```

Missing, stale, unsupported, or mismatched source authority invalidates the whole draft.

## 7. Document target identity

`targetRef` must exact-match current `PublicKnowledgeDocumentTargetContextV1.targetRef`.

The trusted target context owns visible title data such as `displayLabel`.

The draft does not own a freeform document title.

```text
MODEL-AUTHORED TITLE
= NOT IN V1
```

This prevents title text from becoming accidental identity or leakage authority.

## 8. Section roles

Frozen V1 section roles:

```text
SUMMARY
PUBLIC_HISTORY
PUBLIC_RECORD
DISPUTES_AND_CORRECTIONS
```

No freeform heading text exists in the semantic draft.

Localized/display heading labels belong to PK-3 presentation.

## 9. Assertion ordinal

`ordinal` is current-document structural identity.

Requirements:

```text
integer
unique within draft
bounded by future runtime cap
stable through validation filtering
```

Its numeric value carries no chronology, importance, settlement, or source meaning.

## 10. No renumber after quarantine

Example:

```text
draft ordinals
0 1 2 3

ordinal 1 quarantined

validated ordinals
0 2 3
```

Forbidden:

```text
validated ordinals
0 1 2
```

Canonical rule:

```text
PRESENTATION COMPACTNESS
MUST NOT REWRITE
SEMANTIC ORDINAL IDENTITY
```

PK-3 may create non-authoritative presentation indices.

## 11. Assertion content atomicity

Each assertion's `content` is the atomic natural-language semantic payload.

If validation fails for an assertion:

```text
whole assertion content
→ quarantine
```

The validator does not delete a sentence, rewrite qualifiers, or salvage fragments.

```text
VALIDATOR
!=
NATURAL-LANGUAGE REWRITER
```

## 12. Assertion modes

Reused unchanged:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

PUBLIC_KNOWLEDGE does not invent a fourth truth/assertion mode.

## 13. Settlement basis classes

Consumed from trusted PK-1 context:

```text
ESTABLISHED_PUBLIC_RECORD_BASIS
ATTRIBUTED_PUBLIC_RECORD_BASIS
CONTESTED_PUBLIC_RECORD_BASIS
CORRECTED_PUBLIC_RECORD_BASIS
WITHDRAWN_PUBLIC_RECORD_BASIS
```

These are evidence/basis classes, not final reference states.

## 14. Final validator-derived reference states

Frozen semantic V1 states:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
```

`UNKNOWN_SETTLEMENT` is a non-eligible HOLD condition rather than ordinary validated content.

## 15. Final dispositions

Frozen conceptual per-assertion dispositions:

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
INVALID_SECTION_REFERENCE_PAIRING
```

Exact runtime enum names remain implementation-authority work, but these distinctions are frozen.

## 16. Exposure policy runs first

The validator must evaluate current 3M-2 assertion/exposure eligibility before settlement compatibility.

```text
EXPOSURE DENY
→ QUARANTINED_DENY

EXPOSURE HOLD
→ QUARANTINED_HOLD
```

Settlement cannot rescue either result.

## 17. Settlement basis exact join

Each `settlementBasisRef` must exact-match one current trusted settlement basis entry.

Missing/unknown reference:

```text
→ QUARANTINED_HOLD
→ reason = HOLD_UNKNOWN_SETTLEMENT
```

A guessed ref never creates authority.

## 18. Basis/mode compatibility matrix

Frozen V1 matrix:

```text
CONFIRMED_FACT
+ ESTABLISHED_PUBLIC_RECORD_BASIS
→ SETTLED_PUBLIC_REFERENCE
→ REFERENCE_ELIGIBLE_SETTLED

ATTRIBUTED_SOCIAL
+ ATTRIBUTED_PUBLIC_RECORD_BASIS
→ ATTRIBUTED_BUT_NOT_SETTLED
→ REFERENCE_ELIGIBLE_ATTRIBUTED

ATTRIBUTED_SOCIAL
+ CONTESTED_PUBLIC_RECORD_BASIS
→ CONTESTED_PUBLIC_RECORD
→ REFERENCE_ELIGIBLE_CONTESTED

CONFIRMED_FACT
+ CORRECTED_PUBLIC_RECORD_BASIS
→ CORRECTED_CURRENT_RECORD
→ REFERENCE_ELIGIBLE_CORRECTED

ATTRIBUTED_SOCIAL
+ CORRECTED_PUBLIC_RECORD_BASIS
→ CORRECTED_CURRENT_RECORD
→ REFERENCE_ELIGIBLE_CORRECTED
  only when trusted PK-1 basis authorizes corrected attributed form

ATTRIBUTED_SOCIAL
+ WITHDRAWN_PUBLIC_RECORD_BASIS
→ WITHDRAWN_OR_RETRACTED_RECORD
→ REFERENCE_ELIGIBLE_WITHDRAWN
```

All unspecified mode/basis pairs fail closed.

## 19. Unsupported examples

Examples that do not ordinary-render in V1:

```text
CONFIRMED_FACT + ATTRIBUTED_PUBLIC_RECORD_BASIS
→ invalid/incompatible

CONFIRMED_FACT + CONTESTED_PUBLIC_RECORD_BASIS
→ invalid/incompatible

CONFIRMED_FACT + WITHDRAWN_PUBLIC_RECORD_BASIS
→ invalid/incompatible

ATTRIBUTED_SOCIAL + ESTABLISHED_PUBLIC_RECORD_BASIS
→ invalid/incompatible unless a future explicit contract exists

INFERENCE_OPINION + ANY BASIS
→ UNSUPPORTED_REFERENCE_MODE
```

No automatic coercion between modes is allowed.

## 20. Why no coercion

Forbidden logic:

```text
settlement basis looks strong
→ upgrade ATTRIBUTED_SOCIAL to CONFIRMED_FACT
```

or:

```text
claim is contested
→ downgrade CONFIRMED_FACT into ATTRIBUTED_SOCIAL automatically
```

That would make the validator a semantic rewriting engine.

The producer must submit a compatible assertion mode or the item is quarantined.

## 21. Section / reference-state matrix

Frozen V1 ordinary placement matrix:

```text
SUMMARY
  SETTLED_PUBLIC_REFERENCE       ✅
  CORRECTED_CURRENT_RECORD       ✅
  ATTRIBUTED_BUT_NOT_SETTLED     ❌
  CONTESTED_PUBLIC_RECORD        ❌
  WITHDRAWN_OR_RETRACTED_RECORD  ❌

PUBLIC_HISTORY
  SETTLED_PUBLIC_REFERENCE       ✅
  ATTRIBUTED_BUT_NOT_SETTLED     ✅
  CORRECTED_CURRENT_RECORD       ❌
  CONTESTED_PUBLIC_RECORD        ❌
  WITHDRAWN_OR_RETRACTED_RECORD  ❌

PUBLIC_RECORD
  SETTLED_PUBLIC_REFERENCE       ✅
  ATTRIBUTED_BUT_NOT_SETTLED     ✅
  CORRECTED_CURRENT_RECORD       ✅
  CONTESTED_PUBLIC_RECORD        ❌
  WITHDRAWN_OR_RETRACTED_RECORD  ❌

DISPUTES_AND_CORRECTIONS
  SETTLED_PUBLIC_REFERENCE       ❌
  ATTRIBUTED_BUT_NOT_SETTLED     ❌
  CORRECTED_CURRENT_RECORD       ✅
  CONTESTED_PUBLIC_RECORD        ✅
  WITHDRAWN_OR_RETRACTED_RECORD  ✅
```

This is intentionally strict.

## 22. Why SUMMARY is strict

SUMMARY is the highest-salience public-reference surface.

Allowing attributed, contested, or withdrawn material there can create laundering even when a small status badge is present.

Canonical rule:

```text
SUMMARY
= CURRENT SETTLED / CURRENT CORRECTED ONLY IN V1
```

## 23. Why contested / withdrawn are isolated

Contested and withdrawn material require mandatory status-preserving semantics.

Their default home is:

```text
DISPUTES_AND_CORRECTIONS
```

This avoids a visual grammar where withdrawn claims sit beside ordinary facts and inherit their rhetorical force.

## 24. Corrected current record placement

`CORRECTED_CURRENT_RECORD` may appear in:

```text
SUMMARY
PUBLIC_RECORD
DISPUTES_AND_CORRECTIONS
```

because it can serve either:

```text
current corrected truth-like public reference
```

or:

```text
explicit correction context
```

but the validator-derived corrected status remains attached in every case.

PK-3 must decide how prominently to surface that status by section without erasing it.

## 25. PUBLIC_HISTORY semantics

PUBLIC_HISTORY is a bounded public historical narrative surface.

V1 allows:

```text
settled historical public facts
attributed historical public records
```

but not correction/contest/withdrawal records, which stay in the dedicated status-bearing section for first scope.

A future richer history grammar may revisit this.

## 26. Structural validation order

Frozen whole-draft structural phase:

```text
1. schemaVersion == 1
2. family == PUBLIC_KNOWLEDGE
3. targetRef present / well formed
4. sourceAuthorityRef present / well formed
5. assertions[] bounded shape
6. every assertion ordinal valid
7. ordinal uniqueness
8. sectionKind supported
9. mode supported vocabulary
10. content shape bounded/non-empty according to future runtime cap
11. settlementBasisRef present
```

Structural failure stops before semantic acceptance.

## 27. Authority validation order

After structural validity:

```text
12. targetRef exact join
13. sourceAuthorityRef exact join
14. support-at-use currentness
```

Failure here invalidates the whole current projection.

No per-assertion salvage is attempted across invalid authority.

## 28. Per-assertion semantic order

For each structurally valid assertion:

```text
15. 3M-2 exposure/assertion eligibility
16. settlementBasisRef exact join
17. basis/mode compatibility
18. derive final referenceState
19. section/referenceState compatibility
20. accept or quarantine
```

After all assertions:

```text
21. build validated section groups
22. derive document status
23. emit bounded receipt
```

## 29. Whole-document structural failure

Examples:

```text
wrong schema version
wrong family
duplicate ordinal
unknown section kind
malformed assertions array
missing targetRef
missing sourceAuthorityRef
```

Conceptual result:

```text
INVALID
validated document = none
receipt = bounded structural metadata only
```

## 30. Whole-document authority failure

Examples:

```text
targetRef mismatch
sourceAuthorityRef mismatch
current authority unavailable
support-at-use stale
```

Conceptual result:

```text
INVALID / UNSUPPORTED_SCOPE
validated document = none
```

This is not policy quarantine.

## 31. Per-assertion quarantine

Examples:

```text
exposure DENY
exposure HOLD
unknown settlement basis
basis/mode mismatch
unsupported inference opinion
section/referenceState mismatch
```

These may quarantine only the affected assertion while preserving unrelated accepted assertions.

## 32. No partial content salvage

If one assertion contains both safe and unsafe content, the entire assertion is quarantined.

PK-2 does not attempt NLP clause splitting.

A future producer that wants finer granularity must emit finer independent assertions before validation.

## 33. Validated document schema

Frozen conceptual V1 validated shape:

```text
ValidatedPublicKnowledgeDocumentV1
  schemaVersion = 1
  family = PUBLIC_KNOWLEDGE
  targetRef
  sourceAuthorityRef
  sections[]
```

Each validated section:

```text
ValidatedPublicKnowledgeSectionV1
  sectionKind
  assertions[]
```

Only sections with accepted assertions need exist.

## 34. Validated assertion schema

```text
ValidatedPublicKnowledgeAssertionV1
  ordinal
  sectionKind
  mode
  content
  referenceState
  attributionLabel?
```

`referenceState` is validator-derived.

`attributionLabel` may be copied only from trusted PK-1 settlement/public context when required by an eligible attributed/contested/withdrawn record.

The producer cannot supply authoritative attribution identity through freeform draft fields.

## 35. settlementBasisRef is not presentation data

The validated renderable assertion does not need to expose raw `settlementBasisRef` to PK-3.

Canonical boundary:

```text
BASIS REF
= VALIDATION JOIN MATERIAL

REFERENCE STATE
= RENDERABLE SEMANTIC STATUS
```

This keeps presentation from treating internal basis identity as user-facing citation identity.

A future citation/provenance feature requires a separate contract.

## 36. Validated document has no quarantine payload

The validated document contains only accepted content.

It does not contain:

```text
quarantinedAssertions[]
hiddenContent
rawDeniedText
holdText
privateSourceText
```

## 37. Receipt schema

Frozen conceptual receipt:

```text
PublicKnowledgeValidationReceiptV1
  schemaVersion = 1
  family = PUBLIC_KNOWLEDGE
  targetRef
  documentStatus
  entries[]
```

Receipt entry:

```text
PublicKnowledgeValidationReceiptEntryV1
  ordinal
  sectionKind
  mode
  disposition
  reasonCode
  contentLength
```

No assertion text is copied to the receipt.

## 38. Receipt reason-code direction

Conceptual reason families:

```text
ALLOW_REFERENCE_SETTLED
ALLOW_REFERENCE_ATTRIBUTED
ALLOW_REFERENCE_CONTESTED
ALLOW_REFERENCE_CORRECTED
ALLOW_REFERENCE_WITHDRAWN

DENY_EXPOSURE_POLICY
HOLD_EXPOSURE_POLICY
HOLD_UNKNOWN_SETTLEMENT
HOLD_UNSUPPORTED_REFERENCE_MODE_V1
DENY_BASIS_MODE_INCOMPATIBLE
DENY_SECTION_REFERENCE_STATE_INCOMPATIBLE
INVALID_SETTLEMENT_REFERENCE
```

Exact code strings are runtime implementation work.

## 39. Receipt privacy invariant

Forbidden receipt fields:

```text
content
contentExcerpt
privateFact
sourceQuote
hiddenActor
settlementBasisNarrative
```

Canonical rule:

```text
RECEIPT
MUST EXPLAIN THE DECISION CLASS
WITHOUT RE-PUBLISHING THE QUARANTINED CLAIM
```

## 40. Document status

Frozen conceptual document statuses:

```text
VALID
VALID_WITH_QUARANTINE
VALID_EMPTY
QUARANTINED
UNSUPPORTED_SCOPE
INVALID
```

Derivation direction:

```text
all accepted, at least one accepted
→ VALID

accepted + one or more policy quarantines
→ VALID_WITH_QUARANTINE

zero accepted + only non-structural policy quarantines
→ VALID_EMPTY or QUARANTINED according to future runtime naming

structural invalidity
→ INVALID

authority/scope unsupported
→ UNSUPPORTED_SCOPE / INVALID according to exact failure class
```

## 41. Ordinary UI does not reveal documentStatus internals

The presentation layer may need whether renderable assertions exist.

It must not display:

```text
3 assertions hidden
40% complete
2 private facts removed
```

unless a future explicit safe diagnostics UI exists outside ordinary source presentation.

## 42. Bounded projection semantic

Regardless of internal status:

```text
PUBLIC_KNOWLEDGE V1
= BOUNDED REFERENCE PROJECTION
```

This prevents partial validation from falsely implying encyclopedia completeness.

## 43. No empty-section inference

If a section is absent after validation:

```text
section absent
!=
world has no such information
```

Examples:

```text
no DISPUTES_AND_CORRECTIONS section
!= no dispute exists

no PUBLIC_HISTORY section
!= no public history exists
```

## 44. No renderer recovery from receipt

PK-3 may receive the validated document.

It must not receive quarantine content and must not reconstruct missing assertions from receipt metadata.

```text
RAW DRAFT
→ renderer forbidden

QUARANTINE RECEIPT
→ content renderer forbidden
```

## 45. Attribution semantics

For status-bearing records where source attribution is semantically necessary, only a trusted attribution label may be carried.

Forbidden producer realism:

```text
"officials"
"experts"
"multiple outlets"
"the public"
```

without trusted attribution context.

If no trusted source identity label exists, PK-3 may use a generic status label such as:

```text
Attributed public record
```

without fabricating a named source.

## 46. Corrected record semantics

`CORRECTED_CURRENT_RECORD` means the current projection has trusted correction/supersession support.

It does not imply:

```text
revision number
old article storage
revision diff
undo target
restore target
```

PK-2 carries current corrected semantic status only.

## 47. Withdrawn record semantics

`WITHDRAWN_OR_RETRACTED_RECORD` is not a current settled claim.

Its content may be represented only as the public record of a withdrawn/retracted claim.

Renderer must never strip the withdrawn state.

## 48. Contested record semantics

`CONTESTED_PUBLIC_RECORD` represents trusted current contest/dispute standing.

It does not mean:

```text
validator knows which side is ultimately true
```

The contested status is a public-reference state, not a canonical truth verdict.

## 49. No popularity settlement

PK-2 must ignore as settlement authority:

```text
NEWS story count
BOARD post count
SOCIAL_FEED likeCount
reactionCount
repostCount
quoteCount
replyCount
viewCount
impressionCount
bookmarkCount
followerCount
followingCount
engagementScore
trendRank
viralityScore
legacy COMMUNITY count
RT numbering
```

These may be valid source-local semantics elsewhere but are not PK settlement basis.

## 50. No source prestige settlement

A source name, visual badge, verified appearance, or official-looking wording does not satisfy PK-2 settlement.

Only trusted PK-1 basis entries count.

## 51. No time-only settlement

Narrative time passage alone cannot move an assertion from attributed to settled.

```text
old claim
!= settled claim
```

PK-2 does not own a time-decay or time-maturity settlement heuristic.

## 52. No history scan

Validator inputs are current bounded objects only.

Forbidden:

```text
search transcript
scan prior source cards
count repeated mentions
reuse old validated wiki assertion
match by title text
match by content similarity
```

## 53. Natural-language semantic proof caveat

As in 3M-2/3 and PK-0:

```text
MACHINE-CHECKABLE JOIN
!=
MACHINE-PROVEN ARBITRARY NATURAL-LANGUAGE SEMANTIC EQUIVALENCE
```

The future producer/transport must supply bounded semantic references that make settlement joins meaningful.

PK-2 does not pretend keyword overlap proves claim identity.

## 54. Support-at-use

Immediately before producing an ordinary validated projection, current source support must still match.

If not:

```text
whole projection invalid
```

No old assertions survive by themselves in V1.

## 55. Failure taxonomy

Frozen independent domains:

```text
STRUCTURAL FAILURE
SOURCE / TARGET AUTHORITY FAILURE
EXPOSURE POLICY QUARANTINE
SETTLEMENT JOIN / COMPATIBILITY QUARANTINE
SECTION PLACEMENT QUARANTINE
PRESENTATION FAILURE
OPTIONAL MEDIA FAILURE
```

These must not collapse into one generic `invalid` meaning in diagnostics.

## 56. Renderer failure isolation

PK-2 validated semantics remain valid if future PK-3 rendering fails.

```text
RENDER FAILURE
!=
SETTLEMENT INVALIDATION
```

The UI may degrade to safe text or no presentation without modifying semantic authority.

## 57. Context lifetime

```text
CURRENT_PROJECTION_ONLY
NO STRUCTURED SOURCE HISTORY
NO AUTOMATIC RE-ENTRY
NO PERSISTENT DOCUMENT STORE
```

A visible rendered page is not future model memory.

## 58. Candidate C

PK-2 does not activate Candidate C.

```text
C1 cross-turn survival       = NO
C2 stable derived identity   = NO
C3 mutation                  = NO
C4 append / revision         = NO
C5 derived lineage           = NO
C6 future re-entry           = NO
C7 partial survival          = NO
C8 delayed side effect       = NO
```

## 59. Candidate C activation examples

Later requirements that would trigger reassessment include:

```text
same wiki page persists next turn
edit one assertion in an old page
revision history
restore previous page
cross-turn internal link target
NEWS article automatically becomes wiki settlement evidence
async image attaches to exact old article
```

None are part of PK-2 V1.

## 60. Runtime hard caps

Before implementation, concrete limits must be frozen for at least:

```text
max assertions per document
max assertions per section
max chars per assertion
max aggregate content chars
max receipt entries
max settlement basis entries
```

PK-2 design intentionally does not invent numbers.

## 61. No new prompt/output bytes authorized

PK-2 does not authorize:

```text
new hidden prompt block
new output tags
JSON-in-text
comment transport
DOM data blob transport
```

Transport remains a separate runtime-readiness decision.

## 62. No persistent writes

PK-2 requires:

```text
persistent read/write = 0
history scan = 0
network call = 0
extra model call = 0
background worker = 0
```

for the design target beyond whatever future bounded current-turn producer is separately authorized.

## 63. BLOCKER classification

```text
BLOCKER · RAW DRAFT REACHES PRESENTATION
BLOCKER · MODEL DECLARES FINAL REFERENCE STATE
BLOCKER · SOURCE AUTHORITY REF NOT EXACT JOINED
BLOCKER · TARGET REF NOT EXACT JOINED
BLOCKER · SETTLEMENT BASIS REF NOT EXACT JOINED
BLOCKER · EXPOSURE DENY BYPASSED BY SETTLEMENT
BLOCKER · BASIS MODE COERCED INSTEAD OF FAIL CLOSED
BLOCKER · CONTESTED OR WITHDRAWN RECORD LAUNDERED THROUGH SUMMARY
BLOCKER · QUARANTINED CONTENT COPIED TO VALIDATED DOCUMENT
BLOCKER · RECEIPT STORES QUARANTINED TEXT
BLOCKER · RENDERER RECOVERS HIDDEN CONTENT FROM RECEIPT
BLOCKER · CROSS-FAMILY METRIC / REPETITION BECOMES SETTLEMENT AUTHORITY
BLOCKER · SOURCE SUPPORT FAILURE TREATED AS LOCAL ASSERTION QUARANTINE
```

## 64. WATCH classification

```text
WATCH · PARTIAL DOCUMENT MAY CHANGE READER INTERPRETATION
WATCH · CORRECTED STATUS IN SUMMARY MUST REMAIN VISIBLY STATUS-BEARING
WATCH · ATTRIBUTION LABEL CAN CREATE ACCIDENTAL SOURCE IDENTITY
WATCH · SECTION ORDER MAY CREATE RHETORICAL PRIORITY IN PK-3
WATCH · FUTURE FREEFORM HEADINGS REOPEN LEAKAGE SURFACE
WATCH · FUTURE CITATION GRAPH MUST NOT CONFUSE BASIS REF WITH PUBLIC SOURCE ID
```

## 65. DEFER classification

```text
DEFER · FREEFORM HEADINGS
DEFER · INFOBOX
DEFER · RICH TABLES
DEFER · CITATION / FOOTNOTE GRAPH
DEFER · SEARCH
DEFER · INTERNAL LINK NAVIGATION
DEFER · RELATED DOCUMENTS
DEFER · REVISION HISTORY
DEFER · USER EDITS
DEFER · PERSISTENT DOCUMENT IDENTITY
DEFER · MEDIA
DEFER · CROSS-FAMILY SETTLEMENT PROPAGATION
DEFER · FUTURE CONTEXT REENTRY
```

## 66. Frozen PK-2 contract

```text
DRAFT
= PublicKnowledgeDocumentDraftV1

ASSERTION UNIT
= PublicKnowledgeAssertionDraftV1

TARGET TITLE
= TRUSTED TARGET CONTEXT, NOT MODEL TITLE

SECTION ROLES
= FIXED V1 ENUM

SETTLEMENT BASIS
= PK-1 TRUSTED CURRENT CONTEXT

FINAL REFERENCE STATE
= PK-2 VALIDATOR OWNED

ASSERTION ATOMICITY
= WHOLE ASSERTION

DOCUMENT ATOMICITY
= NO; SAFE ASSERTIONS MAY SURVIVE POLICY QUARANTINE

DOCUMENT PRODUCT CLAIM
= BOUNDED REFERENCE PROJECTION

QUARANTINE CONTENT
= NOT COPIED INTO VALIDATED SIDE

RECEIPT
= BOUNDED METADATA, NO CONTENT

ORDINALS
= PRESERVED, NOT RENUMBERED

SUMMARY
= SETTLED / CORRECTED ONLY IN V1

CONTESTED / WITHDRAWN
= DISPUTES_AND_CORRECTIONS ONLY IN V1

INFERENCE_OPINION
= UNSUPPORTED / HOLD V1

PERSISTENCE
= NONE

CANDIDATE C
= NOT ACTIVATED

RUNTIME IMPLEMENTATION
= NOT AUTHORIZED

PRODUCTION
= UNCHANGED
```

## 67. Closure

PK-2 freezes a public-reference document that can be useful without becoming a truth database or an encyclopedia-completeness claim.

Final conceptual flow:

```text
current PUBLIC_KNOWLEDGE job
→ trusted target
→ untrusted bounded assertions
→ structural validation
→ current source exact join
→ Exposure policy
→ PK-1 settlement basis exact join
→ mode/basis compatibility
→ validator-derived reference state
→ section/state compatibility
→ assertion-level acceptance/quarantine
→ bounded validated document
→ bounded no-content receipt
→ PK-3 presentation later
```

Most important invariant:

```text
PARTIAL VALIDATED PUBLIC KNOWLEDGE
MAY REMAIN USEFUL

BUT

MUST NEVER PRETEND TO BE
A COMPLETE OR SELF-AUTHORIZING WORLD ENCYCLOPEDIA
```

Next design checkpoint:

```text
PK-3 · Presentation Grammar
PUBLIC_REFERENCE_DOCUMENT_V1
```

No runtime implementation authority is granted by this document.