# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 D3-3 Historical Presentation / Compare Design — 2026-09-02

Date: 2026-09-02 KST

Status: **D3-3 DESIGN FROZEN · HISTORICAL_PUBLIC_REFERENCE_VIEW_V1 · EXPLICIT HISTORICAL CHROME · DISCLOSURE-PRESERVING METADATA/BODY/ACTION SURFACES · PAGE-LEVEL CURRENT-STATUS COMPANION · BOUNDED STRUCTURAL HISTORICAL COMPARE · C1+C2+C3+C4+C7 ONLY · C5/C6/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · D3-3 · HISTORICAL PRESENTATION · COMPARE · CURRENT-STATUS COMPANION · CANDIDATE C C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D3-0 opened bounded historical survival under Candidate C C7.
D3-1 froze historical admission/provenance.
D3-2 froze current disclosure authorization for historical metadata, body, and outbound action surfaces.
D3-3 freezes the first status-preserving historical presentation and compare contract.

Central rule:

```text
HISTORICAL SURVIVAL
MUST NOT VISUALLY OR SEMANTICALLY IMPERSONATE
CURRENT PUBLIC_KNOWLEDGE TRUTH
```

And:

```text
COMPARE
MUST NOT REVEAL ANY SEMANTIC BODY
THAT EITHER INPUT COULD NOT BE DISCLOSED DIRECTLY
```

This document implements no runtime renderer, DOM/CSS, compare engine, current-status generator, persistent UI state, model call, network call, storage, migration, release, or `release-simcore` mutation.

## 1. Authority chain

Consumes without reopening:

```text
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_0_HISTORICAL_PAGE_MASTER_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_1_HISTORICAL_ADMISSION_PROVENANCE_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_2_HISTORICAL_DISCLOSURE_WITHDRAWAL_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_3_HISTORICAL_PRESENTATION_COMPARE_IMPACT_SCOPE_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PK3_PRESENTATION_GRAMMAR_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_3_REVISION_READ_COMPARE_RESTORE_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_4_SETTLEMENT_CITATION_SEARCH_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_5_LIFETIME_BOUNDS_CONVERGENCE_DESIGN_2026-09-02
```

## 2. Capability profile

D3-3 preserves exactly:

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 semantic mutation          = YES, inherited PK-D2
C4 append / merge pressure    = YES, inherited PK-D2
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = NO
C7 historical survival        = YES, DESIGN ONLY
C8 delayed effect targeting   = NO
```

Presentation and compare do not open any additional Candidate C gate.

## 3. Frozen presentation kind

D3-3 selects:

```text
HISTORICAL_PUBLIC_REFERENCE_VIEW_V1
```

This is intentionally distinct from PK-3:

```text
PUBLIC_REFERENCE_DOCUMENT_V1
```

Canonical distinction:

```text
CURRENT PAGE PRESENTATION
!= HISTORICAL REVISION PRESENTATION
```

Even when the historical revision happens to equal the current head, the historical surface remains a history surface.

## 4. Historical surface authority inputs

A body-bearing historical presentation requires a compatible current-operation bundle containing:

```text
exact pageIdentity
exact revisionRef
active lifetime
valid D2 committed membership
valid D3-1 historical admission
D3-2 metadataDisposition = ALLOW
D3-2 bodyDisposition = ALLOW
exact immutable committed historical document
trusted presentation target label, when available
```

Outbound interactions additionally require:

```text
D3-2 outboundActionDisposition = ALLOW
```

The renderer does not reconstruct missing authority.

## 5. Presentation read model

Frozen conceptual shape:

```text
HistoricalPublicReferencePresentationV1
  schemaVersion
  kind = HISTORICAL_PUBLIC_REFERENCE
  renderInstanceKey
  pageIdentity
  revisionRef?
  title?
  historicalStatus
  metadataView?
  historicalDocumentView?
  currentStatusCompanion?
  bodyAvailability
```

This object is:

```text
EPHEMERAL
READ_ONLY
NONCANONICAL
NONPERSISTENT
NON-MODEL-CONTEXT
```

`revisionRef` and title may be absent from a safe shell if D3-2 metadata policy does not authorize them.

## 6. Historical status field

Frozen semantic presentation state:

```text
historicalStatus = HISTORICAL_REVISION_VIEW
```

Fixed renderer-owned visible wording must be equivalent to:

```text
Historical revision
```

A nearby fixed explanatory label must make clear:

```text
This is a historical view, not the current public-reference page surface.
```

Exact localization belongs to presentation implementation, but the distinction is mandatory.

## 7. Historical status may not be color-only

Historical/current distinction must be perceivable in text.

Color, icon, border, background, timestamp styling, or placement may supplement but never replace the textual status.

Forbidden sole signals:

```text
sepia color
clock icon
muted border
older-looking typography
```

## 8. Historical status may not overclaim

Forbidden fixed or model-authored chrome includes:

```text
Verified history
Official historical truth
Definitive archive
Accurate as of R4
The truth at the time
```

D3-1 authenticates that the revision was committed, not that every proposition was metaphysically true at the time.

## 9. Title ownership

Historical title may only come from a trusted compatible target presentation authority.

The renderer must not derive title from:

```text
historical body first sentence
historical citation label
pageIdentity formatting
model summary
host transcript
```

If no safe trusted title is available, the renderer may show a generic history heading without inventing entity identity.

## 10. Revision metadata read model

Conceptual:

```text
HistoricalRevisionMetadataPresentationV1
  revisionRef
  revisionPositionLabel?
  operationKindLabel?
```

Only D3-2 metadata-authorized fields may appear.

D3-3 does not authorize:

```text
editor identity
edit timestamp inference
truth score
citation count
assertion count
hidden count
```

unless separately frozen by future authority.

## 11. Revision ordinal language

If a revision ordinal/position is safely available, it may be displayed as navigation/history metadata only.

It must not imply:

```text
higher ordinal = more true
higher ordinal = more settled
higher ordinal = safer
higher ordinal = more authoritative
```

## 12. Body availability states

Frozen presentation-local states:

```text
HISTORICAL_BODY_AVAILABLE
HISTORICAL_BODY_UNAVAILABLE
NO_REVISION_SPECIFIC_SURFACE
```

Mapping:

```text
metadata ALLOW + body ALLOW
→ HISTORICAL_BODY_AVAILABLE

metadata ALLOW + body DENY/HOLD
→ HISTORICAL_BODY_UNAVAILABLE

metadata DENY/HOLD
→ NO_REVISION_SPECIFIC_SURFACE
```

The renderer receives disposition; it does not inspect provider reasons to reclassify.

## 13. Metadata-only unavailable shell

When metadata is ALLOW and body is unavailable, the selected first shell grammar is conceptually:

```text
Historical revision
<safe revision metadata if authorized>
Historical content is unavailable in the current context.
```

The shell must not distinguish DENY from HOLD to the user unless a future reason-disclosure policy explicitly authorizes that distinction.

## 14. Reason-private shell

The unavailable shell must not reveal:

```text
privacy category
access mismatch
legal withdrawal basis
protected entity identity
which assertion triggered the restriction
hidden assertion count
hidden citation count
body excerpt
model-generated explanation
```

Internal diagnostics remain outside presentation semantics.

## 15. Metadata denied behavior

If metadata itself is DENY/HOLD, no revision-specific shell may reveal protected revision existence or identity.

A host may later show a generic page-local history-unavailable state if D3-4 navigation policy permits it, but D3-3 does not authorize revision-specific leakage.

## 16. Whole-artifact body grammar

Historical body remains:

```text
EXACT ADMITTED HISTORICAL SEMANTIC DOCUMENT
OR
NO BODY
```

The presentation adapter must not semantically alter:

```text
assertion text
section assignment
referenceState
historical attribution
historical citation label surface
```

before rendering it under the exact revision identity.

## 17. No renderer redaction under same revision identity

Forbidden:

```text
remove protected assertion
remove protected citation
rewrite wording
replace old status with current status
then keep revisionRef = R4
```

A future redacted historical artifact needs separate semantic identity/provenance authority.

## 18. Historical reference-state labels

Stored historical reference states may be mapped to fixed historical display vocabulary.

The labels must preserve the state semantics as committed in that revision while making their historical scope clear.

Conceptual examples:

```text
Historical state: Settled public reference
Historical state: Attributed public record
Historical state: Contested public record
Historical state: Corrected record
Historical state: Withdrawn or retracted public record
```

Exact localized wording may differ, but the renderer may not silently omit non-settled historical state.

## 19. No current-state substitution

If R4 stored `SETTLED_PUBLIC_REFERENCE` and current page is `CORRECTED_CURRENT_RECORD`, D3-3 must not replace the R4 historical label with `Corrected current record` inside R4.

Current context belongs in the separate companion.

## 20. Historical citation labels

Historical citation labels may render only as part of the exact admitted historical body when D3-2 body is ALLOW.

A stored historical citation label does not by itself authorize outbound interaction.

```text
citation label visible
!= link clickable
```

## 21. Outbound action presentation

Clickable resolution/navigation originating from historical citation/content requires fresh D3-2 `OUTBOUND_ACTION = ALLOW` for that operation/surface.

If outbound action is DENY/HOLD:

```text
label may remain visible if body ALLOW
interactive action absent/disabled
```

The disabled treatment must not expose protected provider reasons.

## 22. Current-status companion profile

D3-3 selects a deliberately narrow first companion:

```text
CurrentPublicReferenceStatusCompanionV1
```

Its first responsibility is page-level currentness, not assertion-level semantic lineage.

## 23. Companion conceptual shape

```text
CurrentPublicReferenceStatusCompanionV1
  schemaVersion
  pageIdentity
  historicalRevisionRef
  currentHeadRevisionRef?
  state
```

Frozen first states:

```text
CURRENT_PAGE_AVAILABLE_SAME_REVISION
CURRENT_PAGE_AVAILABLE_DIFFERENT_REVISION
CURRENT_PAGE_UNAVAILABLE
CURRENT_PAGE_STATUS_UNKNOWN
```

Exact enum encoding is implementation authority; semantic distinctions are frozen.

## 24. Companion current authority

The companion must be freshly derived from current trusted page/head/current-view authority.

Historical admission or old bytes cannot produce companion state.

Conceptual proof chain:

```text
pageIdentity
→ current authoritative head/current-view binding
→ current page availability
→ companion state
```

## 25. Same-revision meaning

`CURRENT_PAGE_AVAILABLE_SAME_REVISION` means only:

```text
the exact historical revisionRef currently equals the authoritative current head
AND a current page surface is presently available
```

It does not mean:

```text
historical surface becomes current surface
all old labels are current-authoritative
history chrome may disappear
```

The user remains in historical view.

## 26. Different-revision meaning

`CURRENT_PAGE_AVAILABLE_DIFFERENT_REVISION` means only that a different exact revision is currently authoritative as head/current page.

Renderer-owned wording may be equivalent to:

```text
A different current revision is available.
```

It must not say:

```text
This historical revision is wrong
The current revision is truer
R4 was superseded because false
```

unless separately supported by current semantic authority.

## 27. Companion unavailable meaning

`CURRENT_PAGE_UNAVAILABLE` means a current public-reference surface cannot presently be produced.

It does not authorize fallback to another historical revision.

It does not reveal the reason current view is unavailable.

## 28. No assertion-level correction relationship in V1

D3-3 does not claim:

```text
R4 assertion A was corrected by current assertion B
R4 citation X was replaced by current citation Y
```

because stable cross-revision assertion/citation identity is not frozen.

Same ordinal, similar wording, or same citation label is insufficient.

A future exact relationship authority may extend the companion.

## 29. Companion is optional and failure-isolated

If historical body is authorized but companion construction fails or is unavailable:

```text
historical body remains eligible
companion may be absent / CURRENT_PAGE_STATUS_UNKNOWN
```

The renderer must not reuse a stale companion from a prior operation.

## 30. Companion is not embedded current article

First V1 companion is bounded status chrome.

It is not:

```text
full current article
current semantic diff
current citation bundle
current settlement dump
```

Navigation to the current page is a D3-4 concern.

## 31. Historical compare profile

D3-3 selects:

```text
HISTORICAL_STRUCTURAL_COMPARE_V1
```

Compare is page-local and exact-revision-pinned.

## 32. Compare request

Conceptual:

```text
HistoricalCompareRequestV1
  pageIdentity
  leftRevisionRef
  rightRevisionRef
  lifetimeScopeRef
```

The request carries no freeform body text and no model-authored diff hints.

## 33. Compare prerequisites

Both sides independently require:

```text
same exact pageIdentity
active compatible lifetime
valid committed membership
valid D3-1 admission
D3-2 metadata ALLOW
D3-2 body ALLOW
exact immutable historical body
```

If either side fails any required semantic/body prerequisite:

```text
NO HISTORICAL SEMANTIC DIFF
```

## 34. Historical compare does not require current-truth support

Unlike D2-3's current-use inspection path, D3-3 historical compare deliberately permits authentic old bodies that no longer pass current truth/support, provided current D3-2 disclosure allows both bodies.

This is the intended C7 difference.

## 35. Compare is a new current operation

Opening R4 earlier under ALLOW does not authorize a later R4-vs-R9 compare.

A compare operation must obtain fresh compatible disclosure context for both exact inputs.

Cached body visibility is not permission.

## 36. Exact input pinning

Input aliases must resolve before compare.

Conceptually:

```text
CURRENT alias
→ exact current revisionRef R12
→ compare R4 vs R12
```

If head later moves to R13, the in-flight compare remains R4 vs R12.

No silent repinning.

## 37. Same-ref compare

If:

```text
leftRevisionRef == rightRevisionRef
```

and both are authorized, presentation may return a bounded no-difference state without manufacturing a new diff artifact.

It still must preserve historical compare chrome and exact input identity.

## 38. Compare input document representation

Compare consumes exact semantic records from the two immutable historical revisions.

It does not consume:

```text
rendered HTML
DOM text extraction
screenshots
model summaries
host transcript
```

## 39. Assertion compare key

First exact assertion semantic tuple is conceptually:

```text
sectionKind
mode
content
referenceState
trusted historical attribution semantics, if any
validated historical citation attachment semantics, if included
```

Physical canonical encoding remains implementation authority.

`ordinal` may be displayed as revision-local metadata but is not cross-revision identity.

## 40. Deterministic multiset matching

First compare treats exact semantic records as an ordered multiset per section.

Conceptual algorithm:

```text
for each fixed sectionKind:
  walk left records in encounter order
  pair each record with earliest unmatched exact-equal right record
  paired record -> UNCHANGED_EXACT
  unmatched left -> LEFT_ONLY
  after left walk, unmatched right in encounter order -> RIGHT_ONLY
```

This handles duplicate identical assertions without inventing identity.

## 41. Compare classifications

Frozen first semantic classifications:

```text
UNCHANGED_EXACT
LEFT_ONLY
RIGHT_ONLY
```

No `EDITED`, `MOVED`, `RENAMED`, `CORRECTED_BY`, or `REPLACED_BY` classification exists in V1.

## 42. No fuzzy edit inference

Forbidden:

```text
same ordinal -> EDITED
same section + similar content -> EDITED
embedding similarity -> EDITED
same citation label -> same citation lineage
```

A changed sentence may appear as:

```text
LEFT_ONLY old sentence
RIGHT_ONLY new sentence
```

This is deliberately conservative.

## 43. Compare presentation model

Conceptual:

```text
HistoricalComparePresentationV1
  schemaVersion
  kind = HISTORICAL_COMPARE
  renderInstanceKey
  pageIdentity
  leftHeader
  rightHeader
  entries[]
  currentStatusCompanion?
```

It is ephemeral presentation, not durable semantics.

## 44. Compare entry model

Conceptual:

```text
HistoricalCompareEntryPresentationV1
  compareIndex
  sectionKind
  classification
  leftRecord?
  rightRecord?
```

`compareIndex` is view-local and nonsemantic.

## 45. Entry payload discipline

For `UNCHANGED_EXACT`, implementation may show one shared exact record with both-side context rather than duplicate text.

For `LEFT_ONLY`, only the left authorized record may appear.
For `RIGHT_ONLY`, only the right authorized record may appear.

The compare renderer may not synthesize a natural-language explanation of why they differ.

## 46. No model-written diff summary

First D3-3 does not authorize:

```text
"This revision corrected a major factual error"
"The article became more accurate"
"R9 removed misinformation"
```

unless a future separately validated semantic compare-summary contract exists.

Diff classification is mechanical only.

## 47. Section ordering

Compare uses the fixed PUBLIC_KNOWLEDGE section order:

```text
SUMMARY
PUBLIC_HISTORY
PUBLIC_RECORD
DISPUTES_AND_CORRECTIONS
```

Within each section, deterministic multiset matching/encounter order applies.

No sorting by truth strength, importance, citation prestige, or controversy.

## 48. Compare headers

Both sides require fixed textual identification equivalent to:

```text
Historical revision <left metadata>
Historical revision <right metadata>
```

Revision refs/positions are shown only if metadata disclosure authorizes them.

Left/right distinction must not rely on spatial position alone.

## 49. Diff state accessibility

`UNCHANGED_EXACT`, `LEFT_ONLY`, and `RIGHT_ONLY` states require perceivable textual or semantic labels.

Color alone is insufficient.

Renderer may map them to localized presentation vocabulary equivalent to:

```text
Unchanged
Only in left revision
Only in right revision
```

## 50. Citation compare

Historical citation compare may reuse the same exact-multiset discipline over renderable historical citation semantics.

First citation tuple may include only exact stored semantic presentation fields frozen by D2-4/D3 historical body contract, such as:

```text
sourceLabel
recordLabel?
locatorLabel?
publishedAtLabel?
role
```

It must not compare or display non-renderable support anchors as user-facing bibliography identity.

## 51. Citation action separation in compare

A citation label may appear in compare when both relevant body surfaces are ALLOW.

Interactive action for a citation additionally requires the corresponding side/current operation to have D3-2 outbound-action ALLOW.

Compare does not upgrade label visibility into action permission.

## 52. Stable citation identity remains absent

Even if left/right citation tuples are exact-equal, D3-3 claims only exact presentation equality, not durable cross-revision citation identity.

No citation lineage graph is created.

## 53. Compare output disclosure monotonicity

Compare output must never reveal more semantic information than directly opening both authorized input bodies would reveal.

Canonical rule:

```text
COMPARE_DISCLOSURE
<= INTERSECTION_OF_AUTHORIZED_INPUT_BODY_DISCLOSURE
```

If policy changes during operation such that a required fresh surface can no longer be established, fail closed rather than retain stale diff authority.

## 54. Compare bounds

D2-5 bounds remain authoritative:

```text
MAX_COMPARE_DIFF_ENTRIES = 768
MAX_COMPARE_OUTPUT_LOGICAL_BYTES = 131072
```

D3-3 does not enlarge them.

If exact diff exceeds a hard bound:

```text
COMPARE_UNAVAILABLE / HOLD
```

No semantic truncation may be presented as a complete compare.

## 55. Compare result is not persisted

Do not persist as semantic authority:

```text
compare result
compareIndex
unchanged pairing
left/right classification
compare summary
```

A new operation recomputes from exact revisions under fresh disclosure.

## 56. Current-status companion in compare

At most one page-level companion may be attached to the compare surface in first V1.

It describes current page/head availability relative to the historical operation, not each assertion pair.

It does not alter diff classifications.

## 57. Presentation DOM root direction

Conceptual source-local roots may distinguish view kind:

```text
[data-simcore-source-family="public-knowledge"]
[data-simcore-pk-view-kind="historical"]
```

and:

```text
[data-simcore-source-family="public-knowledge"]
[data-simcore-pk-view-kind="historical-compare"]
```

Exact DOM is implementation authority.

The semantic requirement is distinct view-kind scoping.

## 58. CSS namespace direction

A future implementation may extend source-local PK namespace, for example:

```text
sc-pk-history
sc-pk-history__status
sc-pk-history__meta
sc-pk-history__body
sc-pk-history__current-status
sc-pk-history-compare
sc-pk-history-compare__side
sc-pk-history-compare__entry
```

All styling remains source-scoped.

Global selector ownership is forbidden.

## 59. Current-page visual impersonation prohibition

Historical presentation must not be visually identical to current `PUBLIC_REFERENCE_DOCUMENT_V1` after removing only a tiny icon.

A perceivable fixed historical status and view-kind chrome is mandatory.

This is a semantic safety requirement, not aesthetic preference.

## 60. Section/body rendering reuse

When exact historical body is authorized, the renderer may reuse PK-3 safe assertion typography/status components if they preserve the stored historical states unchanged.

Reuse does not make the historical surface a current page.

## 61. Accessibility heading hierarchy

Recommended conceptual structure:

```text
article historical root
  fixed historical status
  h1 trusted title or generic history title
  historical metadata
  body sections with h2 headings
```

Compare:

```text
main compare root
  h1 historical comparison
  explicit left/right revision labels
  section headings
  diff entries
```

Exact heading levels must integrate with host context without using headings solely for visual size.

## 62. Screen-reader ordering

Historical status must be encountered before or together with the historical body.

Compare side/classification labels must be announced before the differing content they qualify.

Hidden/denied content must not remain in accessibility tree.

## 63. Keyboard/outbound action boundary

If D3-2 outbound action is not ALLOW, historical citation/navigation controls must not remain focusable active controls merely hidden visually.

Presentation state must match actual interaction permission.

## 64. Renderer failure isolation

Renderer failure must not mutate:

```text
revision record
historical admission
current head
D3-2 disclosure context
```

Semantic/authentication state remains authoritative.

A renderer retry requires compatible current presentation/disclosure inputs.

## 65. Stale DOM teardown

A previously mounted historical body or compare is not self-authorizing.

On reload, policy/lifetime change, feature-off, or incompatible current context:

```text
old semantic body/diff subtree must not remain mounted as current-authorized history
```

A future implementation must unmount/clear protected semantic subtrees before showing any safe unavailable shell.

## 66. No overlay-only denial

Forbidden:

```text
leave historical text in DOM
place "unavailable" overlay above it
```

Protected body must be removed from visible and accessibility semantic surface.

## 67. Feature-off behavior

When historical capability is disabled:

```text
historical view mount = 0
historical compare = 0
current-status companion construction = 0
D3 presentation provider reads = 0
```

Existing durable revision/admission data is not mutated by feature-off.

## 68. Reload behavior

Reload does not auto-scan history or reconstruct historical surfaces from cached DOM/transcript.

Explicit current history navigation/request plus fresh authority is required.

## 69. No prompt re-entry

Historical presentation model, compare entries, and current-status companion do not automatically re-enter the main model prompt/context.

C6 remains closed.

## 70. No delayed mutation

D3-3 authorizes no delayed task to attach to a historical view/compare by revisionRef and mutate the semantic presentation later.

A new current operation may produce a new view.

C8 remains closed.

## 71. No derived lineage

Compare pairing/classification is not durable derived-to-derived lineage.

It is ephemeral exact structural presentation.

C5 remains closed.

## 72. Adversarial acceptance matrix

### A. Historical revision equals current head

```text
R9 selected through history
current head = R9
current page available
```

Expected:

```text
historical chrome remains
companion may say current page uses same revision
surface does not transform into current page
```

### B. Historical revision differs from current head

```text
R4 selected
current head = R9
```

Expected:

```text
historical R4 unchanged
companion may say different current revision available
no claim R4 is false
```

### C. Metadata allowed, body denied

Expected:

```text
safe metadata-only shell
no body excerpt/count/reason
```

### D. Metadata denied

Expected:

```text
no revision-specific shell/identifier
```

### E. Body allowed, outbound denied

Expected:

```text
historical citation label may render
interactive outbound action absent/disabled
```

### F. Compare left allowed/right denied

Expected:

```text
no semantic diff body
no reconstruction through LEFT_ONLY/RIGHT_ONLY
```

### G. Both old bodies no longer current-truth supported but disclosure allowed

Expected:

```text
historical compare may proceed
```

### H. Similar assertions same ordinal

Expected:

```text
no EDITED identity claim
LEFT_ONLY + RIGHT_ONLY unless exact semantic tuple equal
```

### I. Duplicate exact assertions

Expected:

```text
deterministic earliest-unmatched exact pairing
no identity claim
```

### J. Cached historical DOM after policy changes to DENY

Expected:

```text
old body removed
no overlay-only concealment
```

### K. Companion unavailable

Expected:

```text
historical body remains if D3-2 body ALLOW
stale companion not reused
```

### L. Compare exceeds hard bound

Expected:

```text
compare unavailable/HOLD
no silent semantic truncation
```

## 73. Runtime validation blockers

No future runtime readiness may be claimed before evidence proves at least:

```text
historical/current view-kind separation
textual historical status
metadata/body/action disposition mapping
reason-private unavailable shell
whole-artifact enforcement
no same-ref redaction
page-level fresh companion
no assertion-lineage invention
fresh both-sided compare disclosure
exact pinning
ordered multiset exact compare
citation action separation
hard-bound fail-closed
accessibility semantics
stale subtree teardown
feature-off dormancy
no C5/C6/C8 drift
```

## 74. Deferred to D3-4

```text
history-list navigation grammar
open-current-page navigation
restore affordance handoff
PK-X2/search integration
exact route/address handoff
no automatic current/history fallback
```

## 75. Deferred to D3-5

```text
historical presentation metadata byte caps
companion payload byte cap
compare presentation final bounded accounting
historical admission/presentation lifetime convergence audit
C1+C2+C3+C4+C7 final reassessment
```

## 76. Explicit non-goals

D3-3 does not add:

```text
stable assertion identity
stable citation identity
historical semantic summaries
editor identities
revision timestamps inferred from host history
global history search
cross-conversation archive
redacted revision identity
persistent compare artifacts
current-page semantic rewrite
```

## 77. Final frozen contract

```text
D3-1 AUTHENTICITY
+
D3-2 CURRENT DISCLOSURE
+
D3-3 EXPLICIT HISTORICAL PRESENTATION
```

and:

```text
LEFT AUTHENTIC + LEFT BODY ALLOW
+
RIGHT AUTHENTIC + RIGHT BODY ALLOW
→ BOUNDED EXACT STRUCTURAL HISTORICAL COMPARE
```

Canonical closure:

```text
HISTORICAL VIEW
MUST SAY IT IS HISTORY

CURRENT STATUS
MUST COME FROM CURRENT AUTHORITY

COMPARE
MUST NOT INVENT LINEAGE
OR BYPASS DISCLOSURE
```

Design frozen. Runtime implementation and production release remain unauthorized.
