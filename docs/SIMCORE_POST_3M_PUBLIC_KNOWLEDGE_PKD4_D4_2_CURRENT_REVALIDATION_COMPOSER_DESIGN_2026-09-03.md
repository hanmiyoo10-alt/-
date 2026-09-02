# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D4 D4-2 Current Revalidation / Composer Design - 2026-09-03

Date: 2026-09-03 KST

Status: **D4-2 DESIGN FROZEN · EXACT D4-1 BINDING INPUT · EXACT COMMITTED REVISION RE-READ · D2-4-COMPATIBLE CURRENT PUBLIC-REFERENCE REVALIDATION · CURRENT TARGET / SUPPORT / EXPOSURE / SETTLEMENT / CITATION COMPATIBILITY · WHOLE-REVISION ATOMIC CONTEXT UNIT · NO PROMPT-TIME REWRITE · CURRENT TRUSTED TARGET LABEL · DETERMINISTIC STATUS-PRESERVING PublicKnowledgeContextProjectionV1 · EPHEMERAL CONTEXT ADMISSION RECEIPT · NO PARTIAL QUARANTINE / SUMMARY / DOM SCRAPE / RAW AUTHORITY LEAK · INTERMEDIATE HEAD CHECK + FINAL D4-3 CHECK REQUIRED · C1+C2+C3+C4+C6+C7 PRODUCT PROFILE · C5/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D4 · D4-2 · CURRENT REVALIDATION · CONTEXT COMPOSER · CANDIDATE C C6 · DETAILED DESIGN · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D4-1 determines the exact logical object to consider for current model-context re-entry:

```text
operationRef
selectionBindingRef
lifetimeScopeRef
pageIdentity
targetIdentityRef
selectedRevisionRef
requirementMode
```

D4-2 determines whether the exact selected committed revision remains **currently usable as PUBLIC_KNOWLEDGE semantic reference data** and, only when it does, materializes one deterministic complete semantic projection for D4-3 prompt-role attachment.

Canonical D4-2 result:

```text
EXACT SELECTED REVISION
+ FRESH CURRENT PUBLIC_REFERENCE COMPATIBILITY
+ WHOLE-UNIT PROJECTION FITNESS
→ ONE EPHEMERAL CONTEXT PROJECTION
```

D4-2 never creates a new page truth, new revision, new source fact, new settlement state, or model instruction.

## 1. Authority chain

Frozen chain:

```text
D4-1 Selection Binding
        ↓
Trusted Operation Lifecycle
        ↓
Trusted Lifetime / Page / Target Identity
        ↓
PK-D2 Exact Revision Owner
        ↓
3M-6 Support-at-Use
        ↓
Current Exposure
        ↓
PK-1 Settlement Context
        ↓
PK-2 Current Semantic Validation
        ↓
PK-4 Citation / Provenance Compatibility
        ↓
D4 Context Admission
        ↓
PublicKnowledgeContextComposer
        ↓
D4-3 Prompt Role / Instruction Firewall
```

## 2. Core separation

```text
SELECTION AUTHORITY
!= SEMANTIC COMPATIBILITY AUTHORITY
!= CONTEXT COMPOSITION AUTHORITY
!= PROMPT ROLE AUTHORITY
```

D4-1 owns the first.
Existing PUBLIC_KNOWLEDGE/3M authority owns the second.
D4-2 composer owns deterministic semantic read-model construction only.
D4-3 owns final prompt-role encoding/firewall.

## 3. D4-2 input contract

D4-2 accepts only an exact still-eligible `PublicKnowledgeContextSelectionBindingV1` from D4-1.

It does not accept an arbitrary caller payload containing:

```text
page body
revision body
referenceState overrides
citation overrides
support refs
historical snapshot
```

## 4. Selection binding contains no semantic authority

The binding identifies:

```text
what to read
for which live operation
under which requirement mode
```

It does not prove the page body is currently valid.

## 5. Exact revision re-read

D4-2 exact-reads:

```text
pageIdentity
+ selectedRevisionRef
```

through the authoritative PK-D2 committed revision path.

## 6. Current-head identity alone is insufficient

Even when:

```text
selectedRevisionRef == current head
```

D4 semantic use may still fail because current source/support/settlement/citation authority changed after commit.

## 7. No body from D4-1

D4-1 must not hand D4-2 an authoritative semantic body.

Reason:

```text
address pinning
!= exact current semantic read
```

## 8. No cached-body optimization as authority

A runtime may cache bytes internally for performance only if it can prove they are the exact immutable committed record selected by authoritative identity.

A cache hit itself is not authority.

## 9. Forbidden semantic fallbacks

D4-2 never substitutes:

```text
current renderer output
last page card
host transcript
historical viewer body
compare output
restore seed
search snippet
model-generated summary
```

for exact revision storage/owner authority.

## 10. Operation must remain LIVE

Before beginning materialization, trusted operation lifecycle must still report the exact `operationRef` as LIVE.

## 11. Terminal operation invalidates composition

If operation is:

```text
COMPLETED
FAILED
CANCELLED
SUPERSEDED
```

conceptually TERMINAL, no D4-2 semantic read-model may advance toward dispatch.

## 12. Binding must remain eligible

D4-2 accepts no binding that has become:

```text
STALE
CONFLICTED
CANCELLED
TERMINAL
FAILED
CONSUMED
```

## 13. ACTIVE lifetime remains mandatory

The trusted lifetime owner must still prove:

```text
lifetimeScopeRef = ACTIVE
```

## 14. ENDED lifetime

```text
ENDED
→ no exact semantic read for D4 use beyond bounded cleanup-safe failure handling
→ no context projection
```

Physical revision rows do not override logical expiry.

## 15. UNKNOWN lifetime

```text
UNKNOWN
→ HOLD / fail closed
```

No optimistic prompt use.

## 16. Same-lifetime relation remains exact

D4-2 does not permit selected page semantics from another lifetime to enter the current operation merely because target labels match.

## 17. Page identity remains exact

The current page identity owner must continue to support the exact page binding.

No title-based recovery.

## 18. Target identity continuity

D4-2 re-proves exact current trusted target identity compatibility.

```text
stable targetIdentityRef compatible
→ may continue

mismatch / ambiguous / unavailable
→ no projection
```

## 19. Display label is not target identity

Current display label may change while stable target identity remains the same.

A matching label never repairs target mismatch.

## 20. Exact committed membership

The selected revision must still be an authoritative committed revision of the selected page.

Revision bytes without membership cannot enter context.

## 21. Membership is not current support

Committed membership proves historical/durable admission to the page history, not current source truth.

## 22. D4-2 intermediate current-head read

Before expensive semantic revalidation, D4-2 may re-read current head and require:

```text
currentHead == selectedRevisionRef
```

This catches an already-stale selection early.

## 23. Intermediate check is not final dispatch authorization

D4-3/final dispatch must still perform the frozen final currentness check.

No D4-2 receipt is a durable freshness license.

## 24. Exact current public-reference compatibility reuses existing truth contracts

D4-2 does not invent a second settlement/citation truth engine.

It reuses the semantics already frozen by:

```text
3M-6 support-at-use
PK-1 settlement authority
PK-2 current semantic validation
D2-4 settlement/citation current compatibility
PK-4 citation/provenance authority
```

## 25. D2-4 compatibility is the semantic sub-contract

D2-4 already freezes that a committed revision can remain current-semantically inspectable only when current authority can independently reauthorize its committed visible semantic surface.

D4-2 applies that same principle at the model-context use edge.

## 26. No D4-specific weakening

D4 cannot say:

```text
not safe enough for current page read
but safe enough for model premise
```

Current model context is a semantic use and must not weaken PUBLIC_KNOWLEDGE current compatibility.

## 27. No D4-specific strengthening into hidden authority

Likewise D4-2 does not require hidden historical admission as a condition for ordinary current-head use.

D3 authenticity is a historical-inspection authority, not a current semantic prerequisite.

## 28. Current semantic compatibility dimensions

D4-2 conceptually evaluates:

```text
TARGET_COMPATIBILITY
SUPPORT_AT_USE_COMPATIBILITY
EXPOSURE_COMPATIBILITY
SETTLEMENT_COMPATIBILITY
CITATION_COMPATIBILITY
STRUCTURAL_COMPLETENESS
```

## 29. Target compatibility

The selected page must still resolve to the intended trusted current target identity domain.

No target alias/rekey guessing.

## 30. Support-at-use compatibility

Every retained semantic assertion required by the committed revision must still have the current support required by existing 3M/PK rules.

## 31. Unknown support fails closed

Missing/stale/ambiguous/mismatched current support produces no D4 projection.

## 32. Exposure compatibility

Every retained assertion must remain eligible under current Exposure/public-source rules required by PUBLIC_KNOWLEDGE current semantic use.

## 33. Exposure is not inferred from old visibility

```text
was visible when committed
!= currently Exposure-eligible
```

## 34. Settlement re-derivation input

For each assertion, current PK settlement validation reconstructs its request from source-owned committed semantic fields, conceptually:

```text
sectionKind
mode
content
revision-local structure/order
```

Stored validator receipts do not authorize current state.

## 35. Stored referenceState is a comparison target

```text
referenceState_stored
```

is part of the committed semantic surface.

It is not passed as a current-settlement authorizer.

## 36. Settlement exact-compatibility rule

Frozen:

```text
referenceState_now == referenceState_stored
→ compatible

referenceState_now != referenceState_stored
→ semantic rewrite required
→ no D4 projection
```

## 37. Equality is semantic state equality

D4-2 does not define a hierarchy where stronger states may silently replace weaker ones in prompt context.

All state changes require a revision-producing reconciliation if they should become current page semantics.

## 38. Example: attributed becomes settled

```text
stored ATTRIBUTED_BUT_NOT_SETTLED
current SETTLED_PUBLIC_REFERENCE
```

Result:

```text
CONTEXT_SEMANTIC_RECONCILIATION_REQUIRED
```

not automatic upgrade.

## 39. Example: settled becomes contested

```text
stored SETTLED_PUBLIC_REFERENCE
current CONTESTED_PUBLIC_RECORD
```

No prompt-time downgrade/rewrite.

## 40. Example: settled becomes corrected

```text
stored SETTLED_PUBLIC_REFERENCE
current CORRECTED_CURRENT_RECORD
```

No D4 projection from old semantic surface.

## 41. Example: settled becomes withdrawn

```text
stored SETTLED_PUBLIC_REFERENCE
current WITHDRAWN_OR_RETRACTED_RECORD
```

No D4 projection from old semantic surface.

## 42. Current head may remain head despite compatibility failure

D2-4 rule remains:

```text
head remains head
current semantic page may become unavailable
```

D4 does not auto-advance head.

## 43. Reconciliation is outside D4-2

When current semantic state changed, repair may require an explicit D2 operation such as:

```text
CORRECTION_UPDATE
EDIT_ASSERTION
REPLACE_CITATION
```

D4-2 does not invoke those operations.

## 44. Citation reauthorization basis

For every stored citation attachment required by the revision, D4-2 uses current D2-4/PK-4 compatibility rules.

The durable support anchor may locate a current support relationship, but is not itself current truth.

## 45. Citation exact-support requirement

Each stored citation relationship must re-resolve through current trusted support to the same admissible claim-support relation under existing rules.

## 46. Current citation role authorization

The stored citation role must still be currently authorized for that exact relationship.

## 47. Visible citation semantic equality

The stored visible citation semantic tuple must remain exactly reauthorizable, including where present:

```text
sourceLabel
recordLabel
locatorLabel
publishedAtLabel
attachment role
```

## 48. Transient citationRef excluded from equality

Current operation-local `citationRef` may change without making the durable semantic surface different.

## 49. Footnote numbering excluded from equality

Rendered `[1]`, `[2]`, etc. are presentation-local and are not D4 semantic compatibility fields.

## 50. Link clickability excluded from semantic equality

A stored/current trusted href may change or become non-clickable without automatically changing citation semantic meaning.

D4 V1 does not include outbound link action authority in context projection.

## 51. Current extra citation behavior

Current authority may expose extra eligible citations not present in the selected revision.

Frozen:

```text
all stored citations compatible
+ additional current citations
→ revision may remain compatible
→ composer ignores extra citations
```

## 52. Why extra citations are ignored

Adding current extra citation semantics to prompt context would create an uncommitted pseudo-revision.

## 53. Missing stored citation behavior

If any stored citation relationship cannot be reauthorized:

```text
whole revision context unavailable
```

## 54. Citation labels cannot repair anchor failure

Forbidden fallback:

```text
same URL
same hostname
same sourceLabel
same recordLabel
same title
similar content
```

## 55. Attribution compatibility

Any revision-local visible attribution semantics required to distinguish attributed claims from settled facts must remain current-authorizable.

D4-2 must not remove/change attribution merely because the underlying string is shorter or easier to prompt.

## 56. Page target display label is the sole allowed current external label substitution in V1

The selected page's current trusted display label may differ from an earlier rendered/stored label while stable target identity remains the same.

This external label is projected from current target authority.

## 57. Why target label substitution is not revision rewrite

Page identity/target identity are stable while human-facing target label is current external presentation-semantic authority.

The revision does not gain ownership of that label merely by being committed.

## 58. Citation/source labels are not treated the same way by default

Revision-local visible citation/source labels are part of the committed citation semantic surface frozen by D2-4.

They require compatibility rather than arbitrary current substitution.

## 59. Whole-revision context unit

D4 V1 freezes:

```text
CONTEXT SEMANTIC UNIT
= COMPLETE SELECTED COMMITTED REVISION SEMANTICS
```

subject only to lossless projection-field selection that preserves all semantic distinctions required by the profile.

## 60. Whole-unit compatibility

Every retained assertion and required attribution/citation relationship must pass current compatibility.

One failure blocks the complete context unit.

## 61. No assertion-level partial prompt

Forbidden:

```text
R8 = A+B+C
B currently HOLD
→ inject A+C
```

That would not be R8.

## 62. PK-2 quarantine remains valid in its own product path

D4-2 does not claim PK-2 partial quarantine is globally wrong.

It only freezes that partial quarantine cannot be used to represent an immutable committed revision as if it remained complete.

## 63. No section-level partial prompt

If one section cannot be preserved/admitted, do not inject remaining sections under the same whole-page D4 profile.

## 64. No citation stripping

If citation semantics are part of an assertion's committed meaning, dropping citations to fit context is forbidden.

## 65. No status stripping

`referenceState` cannot be omitted to make text look cleaner or smaller.

## 66. No attribution stripping

Attribution cannot be removed from attributed claims.

## 67. No quote-boundary stripping

Quoted/reference statements must remain distinguishable from unqualified page assertions and later from model instructions.

## 68. No semantic summarization

D4-2 does not authorize a summary model, heuristic paraphraser, or extractive subset to replace the whole committed semantic unit.

## 69. No recursive model composition

The context composer itself is deterministic/non-generative.

It does not call the main model to create its input.

## 70. No embedding/relevance selection

D4-2 does not rank or select assertions by similarity to the current user request.

One exact page is already selected upstream.

## 71. Admission layering

D4-2 separates:

```text
CURRENT PUBLIC_REFERENCE COMPATIBILITY
from
D4 OPERATION-SCOPED CONTEXT ADMISSION
```

## 72. Existing compatibility receipt may be reused only at the exact current use edge

D2-4 conceptual `RevisionPublicReferenceCompatibilityReceiptV1` may be composed/reused only if it is produced under the same exact selected revision and current authority use edge with no stale authority ambiguity.

D4 does not treat an old cached receipt as a future license.

## 73. D4-specific admission receipt

D4-2 reserves an ephemeral conceptual object:

```text
PublicKnowledgeContextAdmissionReceiptV1
  schemaVersion
  operationRef
  selectionBindingRef
  pageIdentity
  selectedRevisionRef
  operationDisposition
  lifetimeDisposition
  targetDisposition
  publicReferenceCompatibilityDisposition
  projectionDisposition
  overallDisposition
  boundedReasonCodes[]
```

Exact runtime schema remains deferred.

## 74. Admission receipt contains no semantic body

It does not duplicate:

```text
assertion text
citation labels
quoted text
private evidence
quarantined content
```

## 75. Admission receipt is not prompt content

Private admission state/reasons remain internal by default.

## 76. Admission receipt is ephemeral

Properties:

```text
ONE OPERATION
NON-DURABLE
NON-CANONICAL
NON-TRUTH-AUTHORITY
NON-INSTRUCTION-AUTHORITY
```

## 77. Admission dispositions

Conceptual:

```text
CONTEXT_ADMITTED
CONTEXT_HELD
CONTEXT_DENIED
```

## 78. ADMITTED

Means the exact selected revision is currently compatible and the complete projection has been deterministically materialized under the frozen profile.

## 79. HELD

May mean current authority is unavailable/ambiguous, semantic state changed, projection exceeds bounds, or currentness/lifecycle is unresolved.

## 80. DENIED

Means a trusted current authority explicitly prohibits the relevant semantic use.

## 81. Public reason privacy

The user/model need not receive detailed distinction among internal HOLD/DENY reasons.

No hidden page/support existence oracle.

## 82. Requirement mode propagation

The D4-1 `requirementMode` is copied unchanged through D4-2 operation metadata.

## 83. REQUIRED failure

If no ADMITTED projection exists:

```text
same context-dependent parent operation cannot proceed as context-informed
```

## 84. OPTIONAL failure

Only an independently valid context-free parent path may proceed, marked internally as not having consumed D4 context.

## 85. Composer start condition

`PublicKnowledgeContextComposer` runs only after current semantic compatibility has succeeded for the exact selected revision.

## 86. Composer input is an admitted semantic view

Conceptually D4-2 may use an ephemeral internal boundary:

```text
AdmittedPublicKnowledgeSemanticViewV1
```

containing only current-authorized semantic fields required to construct the projection.

This is conceptual plumbing, not a durable schema.

## 87. Admitted semantic view does not include private authority objects

It excludes:

```text
full source records
hidden evidence
settlement basis internals
claimSupportRef internals
supportAnchorRef internals
validator diagnostic traces
```

## 88. Context projection type

Frozen conceptual semantic read model:

```text
PublicKnowledgeContextProjectionV1
```

## 89. Projection shape

First profile freezes the semantic shape conceptually as:

```text
PublicKnowledgeContextProjectionV1
  projectionProfile = CURRENT_PUBLIC_KNOWLEDGE_WHOLE_PAGE_V1
  family = PUBLIC_KNOWLEDGE
  currentDisplayLabel?
  sections[]
    sectionKind
    assertions[]
      mode
      content
      referenceState
      attribution?
      citations[]?
        sourceLabel
        recordLabel?
        locatorLabel?
        publishedAtLabel?
        role
```

Runtime field names/encoding remain implementation work.

## 90. Projection excludes stable/internal IDs from semantic body

The semantic projection itself does not need:

```text
pageIdentity
revisionRef
targetIdentityRef
operationRef
selectionBindingRef
```

Those remain outer envelope/address metadata.

## 91. Projection profile is semantic framing, not authority

`projectionProfile` tells D4-3 how to interpret the structured read model.

It does not authorize retrieval or tool use.

## 92. Family marker

`family = PUBLIC_KNOWLEDGE` prevents the structured context from losing its source-family semantics when composed with other prompt material.

## 93. Current display label

`currentDisplayLabel` comes only from current trusted target label authority after exact target identity continuity succeeds.

## 94. No title fallback

If current trusted label is unavailable and the product profile requires a label, D4-2 does not substitute old title/DOM text.

Depending on future detailed product requirement, label may be omitted only when omission preserves complete semantic meaning; otherwise HOLD.

## 95. Section order

Sections preserve the committed semantic order.

No relevance reordering.

## 96. Assertion order

Assertions preserve the committed semantic order within each section.

## 97. Assertion ordinal

D4-2 does not expose revision-local ordinal as a stable semantic identity by default.

Array order supplies deterministic structure.

## 98. Mode preservation

Assertion `mode` survives projection exactly according to current-compatible committed semantics.

## 99. Content preservation

Assertion semantic string content is losslessly preserved.

Allowed serialization escaping must decode to the same semantic string.

## 100. No whitespace/case semantic normalization

The composer must not rewrite content using case folding, whitespace paraphrase, punctuation cleanup, or style normalization that alters the committed semantic string.

## 101. ReferenceState preservation

Each assertion includes its current-compatible committed `referenceState`.

## 102. ReferenceState is model-relevant semantic qualification

It exists so the model can distinguish contested/attributed/corrected/withdrawn states from settled current public-reference claims.

## 103. Attribution projection

When attribution is semantically present, the projection preserves a bounded structured attribution representation rather than flattening it into plain fact text.

Exact subfields remain tied to existing PUBLIC_KNOWLEDGE visible semantics and future implementation proof.

## 104. Citation projection

Citation semantics enter only when they were part of the committed revision semantic surface and current compatibility succeeded.

## 105. Citation projection uses stored-compatible visible semantics

D4-2 does not substitute extra current citations or transient current citationRefs.

## 106. Citation href excluded from V1 semantic projection

First D4-2 profile does not need clickable/navigation hrefs for model premise semantics.

This also prevents stored URL text from becoming accidental tool/retrieval instructions.

## 107. Citation role preserved

Citation role is retained when required to preserve the relationship between citation and assertion.

## 108. Duplicate citation multiplicity

Where the committed revision semantically contains repeated/distinct citation attachments, deterministic multiplicity must be preserved according to the stored revision structure.

## 109. No footnote-number semantics

Rendered footnote numbers are omitted.

## 110. Current display label is not an instruction

Even though current label comes from trusted authority, it remains reference data, not prompt policy.

D4-3 freezes final role encoding.

## 111. Status-preserving projection invariant

Forbidden flattening:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
→ all plain strings with no status
```

## 112. Attributed statement invariant

The projection must retain enough semantic structure that:

```text
Record A states X
```

is not represented as:

```text
X is unqualified current fact
```

## 113. Corrected/withdrawn invariant

Corrected/withdrawn state must survive even if its labels increase context size.

No budget-driven erasure.

## 114. Quotation invariant

Quoted material remains semantically attributable/quoted.

D4-2 does not turn an imperative quote into an instruction field.

## 115. Determinism

For the same admitted semantic inputs and same frozen profile, the composer produces semantically equivalent output deterministically.

## 116. Canonical traversal order

Conceptually:

```text
page
→ sections in committed order
→ assertions in committed order
→ citation attachments in committed deterministic order
```

## 117. No random ordering

No randomness may reorder semantic items.

## 118. No relevance ordering

Current query relevance does not reorder or drop assertions inside the selected whole-page profile.

## 119. No settlement-strength ordering

Settled assertions are not moved ahead of contested/withdrawn ones.

## 120. No citation-count ordering

Citation-rich assertions are not favored.

## 121. Whole-page bound behavior

D4-5 will freeze exact hard byte/token caps.

D4-2 freezes:

```text
complete deterministic projection fits
→ may admit

complete deterministic projection does not fit
→ HOLD
```

## 122. No prefix truncation

Forbidden:

```text
first N bytes
first N assertions
first M sections
```

claimed as complete D4 context.

## 123. No suffix truncation

Likewise no dropping tail citations/statuses.

## 124. No lossy compression

No paraphrase/summary/semantic hash replaces page semantics.

## 125. Lossless encoding optimization

A runtime may use encoding forms that are proven lossless and preserve the same structured semantic fields.

Numeric/serialization specifics remain implementation work.

## 126. Projection logical-size measurement deferred

D4-5 must define deterministic measurement profile and hard caps.

## 127. Model tokenization is not semantic authority

A tokenizer may measure budget but cannot decide which semantic facts/statuses to delete.

## 128. Projection ephemeral lifetime

`PublicKnowledgeContextProjectionV1` exists only for one exact operation/binding lineage.

## 129. Projection is not durable page state

It is not stored as a new revision.

## 130. Projection is not revision cache authority

Persisting a materialized projection for reuse in future turns is outside V1 semantic authority.

## 131. Projection cannot be reused after terminal operation

Old projection bytes become inert after operation terminality.

## 132. Projection cannot be reused after binding stale

If binding is marked STALE before dispatch, its projection is discarded/ineligible.

## 133. Projection cannot migrate to new binding

```text
B1/R8 projection
→ B2/R9
```

reuse is forbidden.

B2 must exact-read/revalidate/materialize R9 independently.

## 134. No cross-operation projection reuse

O1 projection cannot enter O2 merely because O2 selects the same page/revision.

O2 performs fresh revalidation.

## 135. D4 outer envelope

D4-2 produces or populates an ephemeral envelope boundary conceptually:

```text
PublicKnowledgeContextReentryEnvelopeV1
  schemaVersion
  operationRef
  selectionBindingRef
  requirementMode
  contextProfile = EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1
  lifetimeScopeRef
  pageIdentity
  targetIdentityRef
  selectedRevisionRef
  semanticProjection
  roleClass = REFERENCE_DATA
```

## 136. Envelope is not yet prompt attachment

D4-2 output remains internal until D4-3 validates role/instruction firewall and final dispatch-edge authority.

## 137. Internal IDs stay structural

D4-3 must not accidentally serialize internal IDs into ordinary page prose unless a separate product requirement explicitly needs safe provenance display.

## 138. RoleClass is fixed expectation

D4-2 hands off:

```text
roleClass = REFERENCE_DATA
```

D4-3 may reject incompatible serialization, but must not upgrade it to instruction authority.

## 139. Intermediate post-composition lifecycle check

Before handoff, D4-2 re-checks that operation remains LIVE and binding remains eligible.

## 140. Intermediate post-composition lifetime check

Before handoff, lifetime remains ACTIVE.

## 141. Intermediate post-composition head check

Before handoff, authoritative head must still equal:

```text
selectedRevisionRef
```

## 142. Stale during composition

If head changed:

```text
projection discarded
binding STALE
no D4-3 handoff
```

## 143. No projection patch to new head

Do not edit old projection in place.

Fresh D4-1 binding required.

## 144. Final D4-3 check remains mandatory

D4-2 intermediate success does not eliminate the dispatch-edge race.

## 145. Authority changes after D4-2

If trusted support/admission authority exposes a revision/generation marker that changes before dispatch, D4-3/final admission must fail closed according to that authority's contract.

D4-2 does not invent generic background subscriptions to detect every possible change.

## 146. No background monitoring

D4-2 does not watch pages/sources after composition.

## 147. No delayed callback

A late source/network event cannot attach new semantic content to the existing envelope.

## 148. Why C8 remains closed

All semantic material must be admitted before the one model dispatch edge.

Late events require a new operation if product semantics demand another model call.

## 149. Historical context remains closed

`D3 HISTORICAL_PAGE` may make R4 inspectable despite current truth drift.

D4 V1 still does not use R4 as model premise when current head is R9.

## 150. Current-head compatibility does not use D3 historical authenticity

Historical admission receipt does not substitute for current support-at-use.

## 151. Search does not run inside D4-2

No search for:

```text
replacement page
related page
newer page
citation-linked page
```

## 152. Mutation does not run inside D4-2

No automatic page repair.

## 153. Revalidation failure may suggest product reconciliation, not execute it

Internal outcome may indicate:

```text
SEMANTIC_RECONCILIATION_REQUIRED
```

without exposing private authority detail or mutating page state.

## 154. D4-2 does not alter head

Even if current semantics differ, head remains PK-D2-owned.

## 155. D4-2 does not create R1

Page with no semantic head cannot become context by generating a fresh revision on read.

## 156. D4-2 does not read historical fallback

If current head context fails:

```text
latest historical admitted revision
```

is not an automatic fallback.

## 157. D4-2 does not use compare output

Historical/current compare is presentation analysis, not semantic context authority.

## 158. D4-2 does not use restore seed

Restore source is mutation intent, not current page context.

## 159. D4-2 failure taxonomy

Conceptual internal classes:

```text
CONTEXT_BINDING_INVALID
CONTEXT_OPERATION_TERMINAL
CONTEXT_LIFETIME_ENDED
CONTEXT_LIFETIME_UNKNOWN
CONTEXT_PAGE_IDENTITY_INVALID
CONTEXT_TARGET_IDENTITY_MISMATCH
CONTEXT_REVISION_READ_UNAVAILABLE
CONTEXT_REVISION_MISSING
CONTEXT_REVISION_UNCOMMITTED
CONTEXT_HEAD_STALE
CONTEXT_SUPPORT_UNAVAILABLE
CONTEXT_SUPPORT_INVALID
CONTEXT_EXPOSURE_DENIED
CONTEXT_SETTLEMENT_CHANGED
CONTEXT_SETTLEMENT_UNAVAILABLE
CONTEXT_CITATION_SUPPORT_INVALIDATED
CONTEXT_CITATION_ROLE_CHANGED
CONTEXT_CITATION_VISIBLE_SURFACE_CHANGED
CONTEXT_CITATION_AUTHORITY_UNAVAILABLE
CONTEXT_ATTRIBUTION_INCOMPATIBLE
CONTEXT_SEMANTIC_RECONCILIATION_REQUIRED
CONTEXT_PROJECTION_INCOMPLETE
CONTEXT_PROJECTION_OVER_BOUNDS
CONTEXT_COMPOSER_FAILED
```

Exact enums remain implementation work.

## 160. Failure precedence

The implementation should stop at an authority-safe failure boundary and avoid unnecessary protected reads after failure.

## 161. No failure reason prompt injection

Internal reason codes are not added to the semantic projection.

## 162. No hidden existence oracle

User-facing behavior must not reveal protected page/support details solely through fine-grained D4 error wording.

## 163. OPTIONAL result observability

If OPTIONAL falls back context-free, internal dispatch metadata must accurately record that D4 projection was not attached.

## 164. REQUIRED result observability

A blocked REQUIRED operation must not be misreported internally as a successful context-informed dispatch.

## 165. Operational metrics may be bounded

Future runtime may count:

```text
revalidation admitted
revalidation held
revalidation denied
semantic drift
citation drift
bounds hold
stale during composition
```

without logging protected semantic content.

## 166. No body logging requirement

D4-2 does not require page body/prompt logging for observability.

## 167. Feature OFF

When D4 is disabled:

```text
D4-2 revision reads = 0
D4-2 compatibility checks = 0
D4-2 composer work = 0
D4-2 envelope materialization = 0
```

## 168. Dormancy

Without a valid D4-1 binding:

```text
all D4-2 work = 0
```

## 169. Reload

Default reload invalidates old ephemeral D4 operation/binding/projection state.

D4-2 does not restore projections from client cache.

## 170. Same page in a new operation

Even if O2 selects same P/R8 as O1:

```text
O2
→ fresh exact read
→ fresh current compatibility
→ fresh projection
```

## 171. Same revision bytes do not waive support-at-use

Immutable content identity is not current authority.

## 172. No C5 activation

The ephemeral context projection is not a durable derived child with lineage from the page.

It does not grant future identity to the model output.

## 173. C6 is the intentional capability

D4-2 directly exercises C6 by converting an explicitly selected durable current page into bounded current-authorized reference data for one later model operation.

## 174. C7 relation

The product retains D3 historical capability, but D4-2 does not use historical bodies under first-profile context re-entry.

## 175. C8 remains closed

No delayed semantic effect targeting.

## 176. Candidate C profile

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 semantic mutation          = YES
C4 append / merge pressure    = YES
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = YES
C7 historical survival        = YES product capability
C8 delayed effect targeting   = NO
```

## 177. Acceptance: fully compatible current head

```text
B1 selects P/R8
O1 LIVE
lifetime ACTIVE
R8 exact committed
current support PASS
Exposure PASS
all stored referenceState exactly re-derived
all stored citations exactly reauthorized
complete projection fits
head still R8
→ CONTEXT_ADMITTED
→ projection to D4-3
```

## 178. Acceptance: settlement drift

```text
R8 stored SETTLED
current CORRECTED
→ no projection
→ reconciliation required
```

## 179. Acceptance: stronger settlement drift

```text
R8 stored ATTRIBUTED
current SETTLED
→ no projection
```

No silent semantic upgrade.

## 180. Acceptance: one assertion unsupported

```text
A PASS
B support unknown
C PASS
→ whole R8 unavailable
```

## 181. Acceptance: one assertion Exposure DENY

Whole R8 unavailable for D4 context.

## 182. Acceptance: extra current citation

```text
stored A,B reauthorized
current also offers C
→ R8 compatible
→ projection includes committed A,B only
```

## 183. Acceptance: stored citation changed

```text
stored locator label differs from currently authorized visible semantic surface
→ no projection
```

## 184. Acceptance: current target label changed

```text
stable target identity same
current trusted label old→new
all revision semantics compatible
→ projection uses new current target label
```

## 185. Acceptance: renderer body available, structured read unavailable

No projection.

## 186. Acceptance: projection over future hard bound

HOLD; no truncation/summary.

## 187. Acceptance: head changes during revalidation

Old binding/projection stale; no handoff.

## 188. Acceptance: operation cancelled during composition

Discard projection; no D4-3 handoff.

## 189. Acceptance: head changes after actual model dispatch

No in-flight patch. Future operation starts fresh.

## 190. Acceptance: user viewing historical R4

If D4-1 selected current page P with current head R9:

```text
D4-2 exact-reads/revalidates R9
```

not visible historical R4.

## 191. Acceptance: current page semantic repair needed

D4-2 does not auto-create revision. Context remains unavailable until a separately authorized mutation reconciles page semantics.

## 192. Acceptance: OPTIONAL incompatibility

No projection; parent may only proceed through independent context-free semantics.

## 193. Acceptance: REQUIRED incompatibility

No projection; context-dependent parent path blocked.

## 194. D4-3 handoff guarantees

Successful D4-2 handoff guarantees only:

```text
exact selected revision
current PUBLIC_KNOWLEDGE semantic compatibility
complete deterministic status-preserving projection
live operation/lifetime/head at D4-2 handoff edge
```

## 195. D4-3 still must prove

D4-3 owns:

```text
REFERENCE_DATA role serialization
instruction firewall
context boundary markers
imperative-looking content treatment
final operation/binding/lifetime/current-head check
actual dispatch-edge attachment
```

## 196. D4-2 cannot make D4-3 optional

A valid projection is not safe prompt content until role/instruction firewall is applied.

## 197. Numeric bounds deferred to D4-5

D4-5 must freeze exact caps for:

```text
projection logical bytes
prompt-token contribution
citation semantic bytes
composer work units
revalidation attempts
```

D4-2 freezes no numeric values beyond inherited source/revision caps.

## 198. Runtime prerequisites

Before implementation authority, runtime must provide trusted exact adapters for:

```text
D4-1 binding owner
operation lifecycle
lifetime/page/target identity
PK-D2 exact revision read + membership + head
3M-6 support-at-use
Exposure
PK-1 settlement composer
PK-2 validator
D2-4/PK-4 current citation compatibility
current target display label
D4 admission receipt
D4 deterministic composer
D4-3 prompt firewall
```

## 199. Runtime authority remains closed

```text
D4-2 DESIGN FROZEN
!= IMPLEMENTED
!= MODEL CONTEXT ENABLED
!= RELEASED
```

## 200. Production boundary

No `release-simcore` mutation is authorized by this design.

## 201. Closure statement

D4-2 freezes the first current semantic context-materialization contract as:

```text
D4-1 exact binding
→ exact selected committed revision read
→ fresh current PUBLIC_KNOWLEDGE compatibility
→ exact committed semantic surface OR HOLD
→ whole-page deterministic status-preserving projection
→ ephemeral D4-3 handoff
```

with:

```text
no prompt-time semantic rewrite
no partial quarantine masquerading as committed revision
no summary fallback
no DOM/transcript scrape
no raw internal authority injection
no historical fallback
no auto-mutation
```

## 202. Next checkpoint

```text
D4-0 Contextual Durable Page Master       ✅
D4-1 Context Selection / Exact Address    ✅
D4-2 Current Revalidation / Composer      ✅ DESIGN FROZEN
D4-3 Prompt Role / Instruction Firewall   ← NEXT
D4-4 Historical / Search / Mutation Boundary
D4-5 Lifetime / Bounds / Convergence
```
