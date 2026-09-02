# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-2 Document Sidecar + Validator Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-2 IMPACT SCOPE COMPLETE · DESIGN-ONLY · DOCUMENT SIDECAR / VALIDATOR SEAM SELECTED · CANDIDATE C NOT ACTIVATED · RUNTIME / PRODUCER / TRANSPORT / MOUNT NOT AUTHORIZED · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-2 · STRUCTURED SIDECAR · VALIDATOR · QUARANTINE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PK-0 froze the PUBLIC_KNOWLEDGE settlement family and PK-1 froze the trusted settlement-context authority seam.

PK-2 now scopes the semantic document object that consumes those authorities.

The design question is:

```text
How may an untrusted public-reference document draft
be transformed into a bounded validated document
without allowing title text, section text, model-declared settlement,
quarantined assertions, or derived-source repetition
to manufacture authority?
```

This is design-only. It does not implement runtime code, prompt transport, hidden JSON, parser hooks, DOM/CSS, persistence, search, navigation, revision history, media, network calls, model calls, release publication, or `release-simcore` changes.

## 1. Upstream authority preserved

PK-2 consumes and does not replace:

```text
Current source authority
→ Lineage / Handoff / Evidence

Exposure policy
→ 3M-2

Structured validator pattern
→ 3M-3

Support-at-use invalidation
→ 3M-6

Zero structured source re-entry
→ 3M-7

NEWS maturity separation
→ 3M-8

PUBLIC_KNOWLEDGE master
→ PK-0

Settlement context authority
→ PK-1
```

PK-2 does not create a new world-truth owner, exposure classifier, settlement-context producer, document-history store, or cross-family truth bridge.

## 2. Selected seam

The first selected seam is:

```text
DIRECT_B_ROOT_PUBLIC_KNOWLEDGE_DOCUMENT_VALIDATION_V1
```

Conceptual flow:

```text
UNTRUSTED PublicKnowledgeDocumentDraftV1
+
TRUSTED SourceAuthorityContextV1
+
TRUSTED PublicKnowledgeDocumentTargetContextV1
+
TRUSTED SourceAssertionPolicyContextV1[]
+
TRUSTED PublicKnowledgeSettlementContextV1
        ↓
PUBLIC_KNOWLEDGE VALIDATOR
        ↓
ValidatedPublicKnowledgeDocumentV1
+
PublicKnowledgeValidationReceiptV1
```

The seam is transport-independent.

No in-band hidden JSON/tag transport is authorized.

## 3. First draft shape

The narrowest first conceptual draft is:

```text
PublicKnowledgeDocumentDraftV1
  schemaVersion = 1
  family = PUBLIC_KNOWLEDGE
  targetRef
  assertions[]
```

Each assertion draft:

```text
PublicKnowledgeAssertionDraftV1
  ordinal
  sectionKind
  mode
  content
  settlementBasisRef
```

The producer may propose only semantic draft fields.

It may not declare:

```text
isSettled
isPublicReference
isContested
isCorrected
isWithdrawn
isValid
safeToRender
finalDisposition
completeness
```

## 4. Fixed section roles remain authoritative

PK-2 inherits the PK-0 V1 roles:

```text
SUMMARY
PUBLIC_HISTORY
PUBLIC_RECORD
DISPUTES_AND_CORRECTIONS
```

Freeform section headings remain outside V1.

Canonical reason:

```text
UNTRUSTED HEADING TEXT
CAN LEAK QUARANTINED SEMANTICS
```

Presentation labels are derived later from validated section roles.

## 5. Ordinal semantics

`ordinal` is current-document structural identity only.

Requirements:

```text
unique within current draft
bounded integer domain
no duplicate ordinals
no semantic meaning from numeric value
```

After quarantine, accepted assertions retain their original ordinal.

Forbidden:

```text
0 1 2 3
1 quarantined
→ renumber accepted assertions to 0 1 2
```

Canonical rule:

```text
VALIDATION FILTERING
!=
SEMANTIC IDENTITY REWRITE
```

## 6. Target identity remains trusted

`targetRef` must exact-join current `PublicKnowledgeDocumentTargetContextV1`.

The producer cannot create document identity from freeform content.

```text
VISIBLE TITLE
!=
DOCUMENT IDENTITY AUTHORITY
```

Title remains trusted target display data, not model-authored assertion text.

## 7. Source authority exact join

The document must bind to current source authority.

Unknown, missing, stale, or mismatched authority invalidates the whole projection under existing 3M-6 support-at-use semantics.

This is distinct from per-assertion settlement or exposure quarantine.

## 8. Assertion modes

PK-2 reuses the 3M-2 modes:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

No new PUBLIC_KNOWLEDGE truth enum is introduced.

V1 ordinary-reference policy:

```text
INFERENCE_OPINION
→ unsupported / HOLD for ordinary public-reference rendering
```

Opinion/reception sections remain a later explicit design problem.

## 9. Settlement basis join

Every V1 assertion carries one `settlementBasisRef`.

That reference is untrusted until exact-matched against current trusted `PublicKnowledgeSettlementContextV1`.

Missing or unknown basis:

```text
→ HOLD_UNKNOWN_SETTLEMENT
```

A model cannot gain settlement authority by copying a valid-looking string.

## 10. Basis class is not final state

PK-1 basis classes are inputs:

```text
ESTABLISHED_PUBLIC_RECORD_BASIS
ATTRIBUTED_PUBLIC_RECORD_BASIS
CONTESTED_PUBLIC_RECORD_BASIS
CORRECTED_PUBLIC_RECORD_BASIS
WITHDRAWN_PUBLIC_RECORD_BASIS
```

PK-2 derives final reference disposition only after:

```text
source support
+ target join
+ assertion mode
+ exposure policy
+ settlement basis exact join
+ compatibility rules
```

Canonical rule:

```text
BASIS CLASS
!=
FINAL REFERENCE STATE
```

## 11. Per-assertion atomicity

An assertion draft is the smallest semantic acceptance unit in PK-2 V1.

If its exposure or settlement policy fails:

```text
that assertion
→ quarantine
```

PK-2 does not rewrite the content into a safer paraphrase.

```text
VALIDATOR
!=
NATURAL-LANGUAGE EDITOR
```

## 12. Document-level partial validity

Unlike NEWS V1 story-atomic validation, PUBLIC_KNOWLEDGE V1 is a bounded multi-assertion reference projection.

Therefore one quarantined assertion does not automatically invalidate unrelated eligible assertions.

Conceptual status:

```text
VALID
VALID_WITH_QUARANTINE
VALID_EMPTY
QUARANTINED
UNSUPPORTED_SCOPE
INVALID
```

The exact runtime enum remains unauthorized; this freezes the semantic distinction.

## 13. Why document-wide atomicity is not selected

A public-reference document may contain independent sections and claims.

Example:

```text
SUMMARY assertion A       ALLOW
PUBLIC_HISTORY assertion B ALLOW
PUBLIC_RECORD assertion C  DENY
```

Deleting the whole document would unnecessarily hide safe public-reference content.

But partial validation creates interpretation risk, so ordinary UI must not claim exhaustive completeness.

Canonical product rule:

```text
PUBLIC_KNOWLEDGE V1
= BOUNDED REFERENCE PROJECTION
```

not:

```text
COMPLETE ENCYCLOPEDIA ENTRY
```

## 14. Exposure precedes settlement

Frozen order:

```text
EXPOSURE
→ SETTLEMENT
```

Never:

```text
SETTLED basis
→ bypass exposure DENY
```

Private/unexposed claims remain non-public regardless of settlement metadata.

## 15. First compatibility direction

PK-2 will freeze a deterministic compatibility matrix derived from PK-0/PK-1.

At minimum:

```text
CONFIRMED_FACT
+ ESTABLISHED_PUBLIC_RECORD_BASIS
→ candidate settled reference

ATTRIBUTED_SOCIAL
+ ATTRIBUTED_PUBLIC_RECORD_BASIS
→ candidate attributed reference

ATTRIBUTED_SOCIAL
+ CONTESTED_PUBLIC_RECORD_BASIS
→ candidate contested reference

CONFIRMED_FACT or ATTRIBUTED_SOCIAL
+ CORRECTED_PUBLIC_RECORD_BASIS
→ candidate corrected reference, subject to trusted compatibility

ATTRIBUTED_SOCIAL
+ WITHDRAWN_PUBLIC_RECORD_BASIS
→ candidate withdrawn record

ANY
+ unknown / ambiguous basis
→ HOLD

INFERENCE_OPINION
→ unsupported/HOLD V1
```

Final detail belongs to the PK-2 design document.

## 16. Section compatibility matters

`sectionKind` is not cosmetic.

PK-2 must prevent obviously misleading placement such as rendering a withdrawn record as an ordinary summary fact merely because the status badge exists.

The detailed design must freeze a section/status compatibility matrix.

At minimum:

```text
DISPUTES_AND_CORRECTIONS
→ natural home for contested/corrected/withdrawn records

SUMMARY
→ strongest restrictions
```

No renderer may fix a semantically invalid placement after validation.

## 17. Quarantine semantics

DENY/HOLD assertion content is not copied into `ValidatedPublicKnowledgeDocumentV1`.

The receipt contains bounded metadata only.

Conceptual receipt entry:

```text
ordinal
sectionKind
mode
disposition
reasonCode
contentLength
```

No receipt field may reproduce private/quarantined content.

## 18. Receipt is not a hidden source document

Forbidden:

```text
receipt stores denied content
renderer reads receipt to reconstruct hidden paragraph
receipt becomes future model context
receipt becomes persistent source archive
```

Canonical rule:

```text
VALIDATED DOCUMENT
= renderable semantic payload

VALIDATION RECEIPT
= bounded decision metadata
```

## 19. Completeness metadata is internal only

Internal diagnostic concepts may distinguish:

```text
COMPLETE_VALIDATED_PROJECTION
PARTIAL_VALIDATED_PROJECTION
EMPTY_VALIDATED_PROJECTION
```

Ordinary presentation must not expose hidden counts such as:

```text
3 facts hidden
2 disputed claims removed
```

because the count itself may leak private structure.

## 20. No semantic inference from section population

The renderer must not infer:

```text
DISPUTES_AND_CORRECTIONS empty
→ no dispute exists anywhere
```

or:

```text
PUBLIC_HISTORY has one item
→ this is complete history
```

Absence from the bounded validated projection is not a universal negative claim.

## 21. No cross-family settlement input

PK-2 does not inspect:

```text
NEWS output
BOARD output
SOCIAL_FEED output
legacy COMMUNITY count
social metrics / virality
```

to derive settlement.

Cross-family propagation remains Candidate C / provenance territory.

## 22. No history mining

PK-2 validation must be bounded to current trusted inputs.

Forbidden:

```text
scan old transcript
count prior news mentions
search old board posts
search same title in history
infer settlement from age
```

## 23. Structural invalidity vs policy quarantine

These are separate failure classes.

Examples of structural invalidity:

```text
wrong family
invalid schema version
duplicate ordinal
unknown sectionKind
missing targetRef
malformed assertion shape
```

Examples of policy quarantine:

```text
exposure DENY
exposure HOLD
unknown settlement basis
unsupported mode
basis/mode incompatibility
section/status incompatibility
```

Structural invalidity may invalidate the whole draft.
Policy quarantine removes only affected assertions when safe.

## 24. Support invalidation vs settlement quarantine

Also separate:

```text
SOURCE SUPPORT INVALID
→ whole current projection invalid

SETTLEMENT / EXPOSURE FAIL
→ per-assertion quarantine
```

No partial repair across stale source replacement in V1.

## 25. Renderer boundary

PK-2 produces validated semantics only.

It does not define DOM/CSS.

PK-3 owns `PUBLIC_REFERENCE_DOCUMENT_V1` presentation grammar.

Renderer input must be the validated document only, never the raw draft or quarantine receipt.

## 26. Candidate C status

PK-2 remains current-projection-only.

No requirement here activates:

```text
C1 cross-turn survival
C2 stable derived identity
C3 mutation
C4 append/merge/revision
C5 derived lineage
C6 future context re-entry
C7 partial descendant survival after source replacement
C8 delayed side effect attachment
```

Candidate C remains conditionally ready, not activated.

## 27. Runtime-readiness blockers preserved

PK-2 design does not authorize runtime implementation.

Still required before implementation:

```text
trusted PK-1 settlement context producer
actual sidecar producer / transport
current source-job authority
hard caps
presentation host mount authority
instrumentation
```

## 28. Hard-cap requirements

The detailed PK-2 design must preserve implementation-time caps for at least:

```text
max assertions per document
max assertions per section
max chars per assertion
max aggregate chars
max receipt entries
max settlement basis entries
```

No numeric cap is invented by this design transaction.

## 29. BLOCKER classification

```text
BLOCKER · MODEL_SELF_CERTIFIES_REFERENCE_STATE
BLOCKER · SETTLEMENT_BASIS_REF_NOT_EXACT_JOINED
BLOCKER · EXPOSURE_DENY_BYPASSED_BY_SETTLEMENT
BLOCKER · QUARANTINED_CONTENT_COPIED_TO_VALIDATED_DOCUMENT
BLOCKER · RECEIPT_RECONSTRUCTS_HIDDEN_CONTENT
BLOCKER · FREEFORM_TITLE_CREATES_TARGET_IDENTITY
BLOCKER · FREEFORM_HEADING_REOPENS_UNVALIDATED_LEAKAGE
BLOCKER · DERIVED_FAMILY_OUTPUT_USED_AS_SETTLEMENT_AUTHORITY
BLOCKER · SOURCE_SUPPORT_FAILURE_TREATED_AS_PER_ASSERTION_QUARANTINE
```

## 30. WATCH classification

```text
WATCH · PARTIAL_DOCUMENT_CAN_SHIFT_INTERPRETATION
WATCH · SECTION_PLACEMENT_CAN_LAUNDER_STATUS
WATCH · CORRECTED_RECORD_NEEDS_CURRENT-SNAPSHOT SEMANTICS
WATCH · ATTRIBUTION_LABELS_REQUIRE TRUSTED INPUT
WATCH · EMPTY_SECTION_DOES_NOT_PROVE GLOBAL ABSENCE
```

## 31. DEFER classification

```text
DEFER · FREEFORM HEADINGS
DEFER · INFOBOX
DEFER · RICH TABLE DSL
DEFER · FOOTNOTE / CITATION GRAPH
DEFER · SEARCH
DEFER · INTERNAL LINKS
DEFER · REVISION HISTORY
DEFER · USER EDITS
DEFER · PERSISTENT DOCUMENT IDENTITY
DEFER · MEDIA
DEFER · CROSS-FAMILY SETTLEMENT PROPAGATION
DEFER · FUTURE CONTEXT RE-ENTRY
```

## 32. Selected detailed-design questions

The PK-2 design document must freeze:

```text
1. exact conceptual V1 draft schema
2. exact validated schema
3. final per-assertion dispositions
4. basis/mode compatibility matrix
5. section/reference-state compatibility matrix
6. structural invalidity rules
7. partial-document status derivation
8. quarantine receipt schema
9. no-renumber rule
10. support-at-use ordering
```

## 33. Frozen impact conclusion

```text
PK-2 SEAM
= CURRENT-PROJECTION PUBLIC_KNOWLEDGE DOCUMENT VALIDATION

VALIDATION UNIT
= ASSERTION

DOCUMENT
= MAY SURVIVE WITH SAFE ASSERTIONS AFTER QUARANTINE

DOCUMENT CLAIM
= BOUNDED REFERENCE PROJECTION, NOT EXHAUSTIVE ENCYCLOPEDIA

SETTLEMENT INPUT
= PK-1 TRUSTED BASIS ONLY

FINAL REFERENCE STATE
= VALIDATOR OWNED

QUARANTINE
= CONTENT REMOVED FROM VALIDATED SIDE

RECEIPT
= BOUNDED METADATA ONLY

CANDIDATE C
= NOT ACTIVATED

RUNTIME IMPLEMENTATION
= NOT AUTHORIZED

PRODUCTION
= UNCHANGED
```

Next after this impact scope:

```text
PK-2 · Document Sidecar + Validator Contract
```

Detailed design only.