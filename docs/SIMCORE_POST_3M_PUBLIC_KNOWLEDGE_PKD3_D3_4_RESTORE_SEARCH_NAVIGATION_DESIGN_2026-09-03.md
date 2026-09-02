# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 D3-4 Restore / Search / Navigation Design - 2026-09-03

Date: 2026-09-03 KST

Status: **D3-4 DESIGN FROZEN · EXACT PAGE-LOCAL HISTORY NAVIGATION · METADATA-SAFE REVISION TARGETS · CURRENT-PAGE RETURN PATH · PK-X2 CURRENT-SEARCH FIREWALL · HISTORICAL_RESTORE_HANDOFF_V1 · FRESH CURRENT MUTATION REVALIDATION · NO HISTORICAL GLOBAL SEARCH · C1+C2+C3+C4+C7 ONLY · C5/C6/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · D3-4 · RESTORE · SEARCH · NAVIGATION · CANDIDATE C C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D3-4 freezes the detailed contract for navigation and restore handoff around an already-converged PK-D3 historical page.

The problem is not how to store or render history. Those boundaries are already frozen by D3-0 through D3-3.

The problem is how a user safely moves among:

```text
current PUBLIC_KNOWLEDGE search
current page
page-local history list
exact historical revision
historical compare
restore intent
```

without navigation state, search results, historical disclosure, or compare output becoming semantic or mutation authority.

This document implements no runtime route, browser state, storage schema, search index, renderer, mutation handler, model call, network call, release, or `release-simcore` change.

## 1. Authority chain

Consumes:

```text
PK-X1 durable page identity
PK-X2 current page search
PK-D2 revision ownership / mutation / restore / bounds
PK-D3 D3-0 historical master
PK-D3 D3-1 historical admission / provenance
PK-D3 D3-2 historical disclosure / withdrawal
PK-D3 D3-3 historical presentation / compare
D3-4 impact scope
```

Canonical ordering:

```text
navigation intent
→ owner resolution
→ current lifetime / target continuity
→ operation-specific disclosure or current semantic authority
→ presentation or mutation handoff
```

No downstream step may manufacture authority missing upstream.

## 2. Capability profile

D3-4 preserves exactly:

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

D3-4 adds no new Candidate C capability.

## 3. Canonical separation

```text
NAVIGATION ADDRESS
!= NAVIGATION AUTHORITY

NAVIGATION AUTHORITY
!= HISTORICAL BODY DISCLOSURE

HISTORICAL BODY DISCLOSURE
!= RESTORE MUTATION AUTHORITY

RESTORE SOURCE
!= CURRENT TRUTH

SEARCH HIT
!= HISTORICAL CORPUS ENTRY
```

## 4. Selected first profile

The first profile is:

```text
PAGE_LOCAL_HISTORICAL_NAVIGATION_AND_RESTORE_V1
```

It contains four operations:

```text
OPEN_PAGE_HISTORY
OPEN_EXACT_HISTORICAL_REVISION
OPEN_CURRENT_PAGE
RESTORE_EXACT_HISTORICAL_REVISION_AS_NEW_REVISION
```

Historical compare remains D3-3 and may be entered only from exact historical revision selection state.

## 5. Navigation intent object

Conceptual ephemeral request:

```text
HistoricalPageNavigationIntentV1
  schemaVersion = 1
  operationKind
  pageIdentity
  revisionRef?
```

`revisionRef` is required only for exact historical-revision operations.

The request is:

```text
EPHEMERAL
NON-CANONICAL
NON-TRUTH-AUTHORITY
NON-DISCLOSURE-AUTHORITY
NON-MUTATION-AUTHORITY
```

## 6. Exact page address

Every D3-4 history operation begins from one exact durable `pageIdentity` in one trusted active lifetime.

Forbidden page address derivation:

```text
visible title
current label text alone
old title
search ranking position
host message index
transcript card
browser tab title
model guess
```

PK-X2 may discover a page locator, but the history operation still resolves the exact durable page through the page-identity owner.

## 7. Exact revision address

Every exact historical revision operation is pinned to:

```text
pageIdentity + revisionRef
```

Forbidden historical revision addresses:

```text
row number
visible local numbering
"previous revision" without owner resolution
timestamp
body excerpt
title
DOM node
URL path text treated as trusted authority
```

## 8. Visible labels are presentation only

D2-3 already froze that revision labels are not revision identity.

D3-4 preserves:

```text
"Earlier revision"
"Revision 4"
trusted display time
```

as possible presentation metadata only.

No label may be replayed into owner mutation/read APIs as an authoritative revision address without exact resolution.

## 9. `OPEN_PAGE_HISTORY`

`OPEN_PAGE_HISTORY` means:

```text
for this exact active pageIdentity,
request a bounded page-local history navigation surface
```

Admission requires at least:

```text
PK-D3 feature enabled
trusted lifetime = ACTIVE
exact pageIdentity resolvable
exact current target identity continuity or equivalent page-integrity proof
revision owner available
bounded retained chain available
```

It does not require the current semantic page body itself to be currently displayable.

## 10. Explicit history operation

History does not activate because:

```text
page has revisions
current page unavailable
old card visible
browser route remembered history
user previously viewed R4
```

It requires explicit current history-navigation intent.

Canonical rule:

```text
HISTORY EXISTS
!= HISTORY JOB ACTIVE
```

## 11. Current page unavailable case

If current semantic page is unavailable but exact page identity, active lifetime, and historical policy remain valid:

```text
current page surface = unavailable
```

and separately, after explicit history intent:

```text
historical page-local operation may proceed
```

The historical surface must not be inserted automatically as a stale fallback.

## 12. History-list source

The history list comes only from the authoritative PK-D2 revision owner for the exact page.

First-scope chain traversal remains:

```text
current head
→ previousRevisionRef
→ previousRevisionRef
→ ... bounded retained chain
```

No timestamp or lexical revisionRef sorting becomes authority.

## 13. Bounded list

D3-4 inherits D2-5:

```text
MAX_REVISION_LIST_ENTRIES = 64
MAX_COMMITTED_REVISIONS_PER_PAGE = 64
```

D3-4 adds no pagination, infinite scrolling, archive continuation token, or historical global cursor.

## 14. Metadata disclosure before navigation-row exposure

For each candidate revision row:

```text
committed membership
+ D3-1 authenticity state as required for the profile
+ fresh D3-2 REVISION_METADATA decision
→ may become visible navigation row
```

A revision must not first be exposed and then checked only on click.

## 15. Visible navigation row

Conceptual ephemeral row:

```text
HistoricalRevisionNavigationRowV1
  exactRevisionRefBinding
  safeDisplayMetadata
  currentHeadIndicator?
  actionBinding
```

This is a presentation/navigation object only.

It contains no historical body snippet, old settlement summary, old citation text, or hidden failure reason.

## 16. Action binding is not durable authority

A UI may carry an opaque action binding that maps back to exact `pageIdentity + revisionRef` for the current navigation operation.

The action binding:

```text
may improve UI safety
may prevent accidental row-label addressing
```

but:

```text
does not replace owner resolution
does not survive lifetime END as authority
does not make stale D3-2 ALLOW permanent
```

Exact encoding is implementation authority.

## 17. Hidden-row anti-oracle

If a revision metadata surface is DENY/HOLD:

```text
ordinary row = absent
```

Ordinary UI must not reveal:

```text
hidden revision count
"some revisions are hidden" count
position gaps deliberately tied to hidden revisions
total count including hidden rows
hidden revisionRef
hidden timestamp
```

## 18. Safe visible-list numbering

If local numbering is used at all, it must be derived only from the visible bounded list and must not imply hidden chain position.

Forbidden when hidden entries may exist:

```text
Revision 4 of 9
```

if `9` includes withheld revisions.

Preferred neutral labels remain:

```text
Current revision
Earlier revision
Older revision
```

or trusted metadata already allowed by D3-2.

## 19. `OPEN_EXACT_HISTORICAL_REVISION`

Selecting a visible row creates a new exact operation:

```text
pageIdentity
+ exact revisionRef
→ owner membership re-resolution
→ D3-1 authenticity
→ fresh D3-2 metadata/body/action surface evaluation
→ D3-3 presentation selection
```

The list-row decision is not reused as body authority.

## 20. Metadata ALLOW, body DENY/HOLD

This state remains navigable to a safe historical shell.

```text
metadata ALLOW
body DENY/HOLD
→ exact historical route may open
→ no semantic body subtree
→ D3-3 metadata-only historical unavailable presentation
```

Canonical rule:

```text
ROW SELECTABLE
!= BODY DISCLOSABLE
```

## 21. Metadata DENY/HOLD

If metadata itself is DENY/HOLD:

```text
no ordinary row
no exact revision-specific ordinary route surface
```

A guessed/copied route must not turn metadata denial into a revision-existence oracle.

## 22. Page-local navigation versus D3-2 outbound action

D3-2 `OUTBOUND_ACTION` governs active semantic links/actions originating from disclosed historical content, such as citation resolution.

Page-local revision-row selection is different:

```text
metadata-authorized navigation within the same exact page history domain
```

Therefore a row can open a metadata-only shell even when body and semantic outbound action are unavailable.

This distinction does not weaken D3-2 for content-originating links.

## 23. Historical body outbound action

A citation/link action inside historical semantic content still requires:

```text
REVISION_METADATA ALLOW
+ REVISION_BODY ALLOW
+ OUTBOUND_ACTION ALLOW
```

D3-4 does not redefine that ladder.

## 24. Current-head indicator

A row may display `Current` only when current head identity is proven for the list operation.

If current head changes after list construction:

```text
old indicator becomes presentation-stale
```

The selected historical exact revision remains exact, but the current-head badge must refresh or be removed before claiming currentness again.

## 25. Head advance does not rewrite historical selection

Suppose the user opens exact R4 and current head advances from R9 to R10.

The historical route remains:

```text
R4 historical
```

It must not silently substitute R10 or change the historical body.

Only the separately current-derived companion/current-head indicator may change after fresh current resolution.

## 26. No `CURRENT` alias inside historical revision identity

D3-4 historical revision routes should resolve an exact revisionRef before the historical operation begins.

A route meaning `CURRENT` belongs to `OPEN_CURRENT_PAGE`, not historical revision identity.

This prevents head movement from silently changing the semantic object addressed by a historical route.

## 27. Older/newer shortcut rule

If a future implementation exposes `Older` or `Newer` buttons in this V1 profile, the buttons operate only over the metadata-visible bounded list established for the current page-history operation.

They do not traverse hidden rows and reveal skip counts.

A visibility change requires a fresh list resolution.

## 28. Browser history

Browser back/forward state is navigation convenience only.

It may remember:

```text
page route
revision route
scroll position
compare tab
```

but may not remember current authorization.

On remount:

```text
exact owner resolution
+ active lifetime
+ D3-1 authenticity
+ fresh-enough D3-2 disclosure
```

are required before semantic historical content appears.

## 29. No stale body flash

Forbidden:

```text
browser back
→ cached R4 body paints
→ current D3-2 check runs later
→ body then disappears
```

The old semantic subtree must not be treated as current-authorized content during revalidation.

Safe shell/loading state may appear without protected semantic body.

## 30. Deep-link contract

A host may later encode exact navigation state in an opaque route or URL.

D3-4 freezes only:

```text
route token = navigation hint
```

not:

```text
route token = authorization bearer
```

A route must re-resolve exact owner state and current policy.

## 31. Copied route across lifetime

A copied route from conversation/lifetime A must not open history in another lifetime merely because route text matches.

Required:

```text
route page/revision
+ current active lifetimeScopeRef
+ exact owner binding
```

must match.

Ended, unknown, or mismatched lifetime fails closed.

## 32. Feature-off navigation behavior

When PK-D3 is OFF:

```text
history list read = 0
historical route body read = 0
historical disclosure join = 0
historical navigation actions = 0
```

A cached route does not reactivate the feature.

Existing PK-D2 revision records remain governed by their own storage/lifetime contract.

## 33. `OPEN_CURRENT_PAGE`

From a historical surface, `Open Current` creates a separate current-page navigation intent for the same exact page locator.

Safe flow:

```text
historical pageIdentity
→ OPEN_CURRENT_PAGE
→ active lifetime / current target continuity
→ normal PUBLIC_KNOWLEDGE current activation
→ current head/current projection validation
→ current page or current unavailable state
```

## 34. No historical semantic carry-forward to current page

`OPEN_CURRENT_PAGE` may carry only the exact page locator needed for current navigation.

It must not carry:

```text
historical body
historical settlement
historical citations
historical title as current authority
historical support receipts
historical D3-2 ALLOW
```

Canonical rule:

```text
OPEN CURRENT
!= RESTORE
!= STALE FALLBACK
```

## 35. Current page can differ completely

If R4 is open historically and current R10 has different semantics:

```text
Open Current
→ R10 current semantics if valid
```

not:

```text
R4 with a current badge
```

## 36. PK-X2 firewall

PK-X2 remains:

```text
ACTIVE_LIFETIME_PUBLIC_REFERENCE_SEARCH_V1
```

Its corpus remains durable page locators plus current trusted page/target search metadata.

PK-D3 historical revisions do not enter the PK-X2 V1 corpus.

## 37. Search-hit schema does not expand

D3-4 does not add these fields to ordinary PK-X2 visible search hits:

```text
revisionCount
historicalRevisionRefs
historicalSnippet
oldTitle
oldSettlement
oldCitationLabel
hasCorrectionHistory
lastHistoricalRevision
```

The current search result remains a current page-navigation result.

## 38. No direct search-hit-to-history shortcut in V1

First selected path remains:

```text
PK-X2 current hit
→ current page navigation
→ explicit View History
```

D3-4 does not select a search-result control that reveals history metadata directly.

A future shortcut would need its own existence/disclosure analysis.

## 39. No historical body search

Unsupported first-scope queries include:

```text
find pages whose old revision said X
search R4 body text
search retracted claims
search historical citations
search old settlement states
semantic search over historical snapshots
LLM rerank historical revisions
```

## 40. No cross-page revision metadata search

Even metadata-only global history search is not selected.

```text
query revision labels across all page identities
```

is outside V1 because the result corpus itself would become a new historical-discoverability surface.

## 41. No persistent historical index

No new index is selected for:

```text
revision bodies
revision metadata
correction history
historical citations
historical settlement
```

Ordinary/source-irrelevant turns perform zero historical index scans.

## 42. Explicit current search from historical UI

A user may explicitly start a new PK-X2 current search while viewing history.

That operation is a new current search job.

It consumes:

```text
explicit query intent
current PK-X2 corpus
current trusted labels
current discoverability
```

not the historical body as implicit authority or corpus membership.

## 43. Historical text does not auto-query

Forbidden automatic behavior:

```text
open R4
→ extract entities/phrases
→ silently search PK-X2
```

or:

```text
select historical sentence
→ background page search
```

unless the user explicitly starts a new current search operation under PK-X2.

## 44. Restore operation name

D3-4 freezes the historical handoff operation conceptually as:

```text
RESTORE_EXACT_HISTORICAL_REVISION_AS_NEW_REVISION
```

This is not an in-place historical mutation.

## 45. Why a new historical restore-source seam is needed

D2-3 ordinary restore required source `BODY_INSPECTION_ELIGIBLE` under the D2 current-inspection gate and explicitly deferred historical-source behavior to PK-D3.

PK-D3 can disclose an authentic old revision as history even when current truth/support does not endorse that old semantic state.

Therefore D3-4 must distinguish:

```text
historically disclosable source
```

from:

```text
currently valid candidate
```

## 46. Historical restore-source admission

A historical source may enter seed materialization only when:

```text
1 exact pageIdentity
2 trusted lifetime ACTIVE
3 exact target identity continuity
4 sourceRevisionRef exact committed/retained record
5 D3-1 authenticity PASS
6 D3-2 REVISION_METADATA ALLOW
7 D3-2 REVISION_BODY ALLOW
8 exact stored semantic body retrievable and integrity-valid
9 explicit restore intent
10 current mutation operation class is permitted to start
```

Current truth/support is not yet proven by steps 1-10.

## 47. D3-2 body ALLOW prerequisite

D3-4 forbids a hidden promotion channel.

```text
historical body cannot be disclosed
→ historical bytes cannot become restore seed
```

Therefore:

```text
REVISION_BODY DENY/HOLD
→ RESTORE_SOURCE_BODY_WITHHELD
→ no semantic seed materialization
```

Metadata ALLOW alone is insufficient.

## 48. Disclosure is still not mutation permission

Even with:

```text
D3-1 authentic
D3-2 metadata/body ALLOW
```

restore may be unavailable because current mutation authority is absent or current validation fails.

Canonical rule:

```text
CAN READ HISTORY
!= CAN WRITE CURRENT PAGE
```

## 49. Restore affordance presentation

D3-4 does not invent a generic authorization database solely to decide whether to render a Restore button.

If an existing trusted current mutation-entitlement/product policy can determine affordance availability, UI may consume it.

Otherwise the implementation may omit the affordance until the current restore operation can be safely initiated.

In all cases:

```text
button visible/enabled
!= commit guaranteed
```

Final current authority is rechecked inside the operation.

## 50. `HistoricalRevisionRestoreHandoffV1`

Conceptual ephemeral object:

```text
HistoricalRevisionRestoreHandoffV1
  schemaVersion = 1
  pageIdentity
  sourceRevisionRef
  expectedRevision
  lifetimeScopeRef
  sourceAdmissionBindingRef
  sourceSemanticSeed
```

The exact serialized schema is not runtime-authorized.

## 51. Handoff object properties

The handoff is:

```text
EPHEMERAL
SINGLE CURRENT RESTORE OPERATION
NON-PERSISTENT
NON-CANONICAL
NON-TRUTH-AUTHORITY
NON-SETTLEMENT-AUTHORITY
NON-CITATION-AUTHORITY
NON-COMMIT-AUTHORITY
```

It is consumed by the existing current PK-D2 restore/mutation path.

## 52. `sourceAdmissionBindingRef`

This field, if used by implementation, means only:

```text
which authentic historical artifact supplied this semantic seed
```

It does not mean:

```text
historical claim true now
restore authorized
current source support established
current settlement established
```

## 53. Restore semantic seed

The seed carries the bounded source-owned semantic material already permitted by the D2 restore architecture, conceptually including:

```text
revision-local structural assertions
sectionKind
mode
content
bounded visible citation relationship intent where D2-4 permits
```

It is a copy-forward source, not authority replay.

## 54. Fields stripped from current authority

Historical restore must not treat these old fields as current authority:

```text
referenceState
old settlement decision
claimSupportRef
old sourceAuthorityRef
old support/use receipt
old Exposure decision
old trusted target display label
old citation authorization
old attribution authority
old current-head metadata
old current-status companion
old D3-2 disclosure receipt
historical presentation state
```

## 55. Current target identity wins

The new current candidate always joins current trusted target identity/display authority.

If target continuity is not exact:

```text
restore unavailable
```

No fuzzy name/title equivalence.

## 56. `expectedRevision`

At restore operation start:

```text
expectedRevision = exact current head
```

This head is independent of the historical source revision.

Example:

```text
source = R4
current head at restore start = R10
expectedRevision = R10
```

## 57. Long-lived historical view does not pin current head forever

A historical view may stay open while current head advances.

The view's original current-status companion/head display cannot be reused as restore concurrency authority.

Restore start must re-read/pin the exact current head.

## 58. Current validation pipeline

After source seed materialization:

```text
current target exact join
→ current source/support-at-use
→ current Exposure
→ current settlement compatibility
→ current citation/provenance validation
→ current PK structural validation
→ whole-page historical restore footprint validation
→ semantic no-op comparison against current head
→ expectedRevision re-check
→ D2 atomic commit safety
```

## 59. Historical source may fail current validation

Example:

```text
R4 historically authentic
R4 body currently disclosure-safe
claim X no longer has current source support
```

D3-4 permits R4 to supply the historical restore seed, but current candidate validation then fails unless current authorities independently support the candidate.

No contradiction exists because:

```text
historical readability
!= current semantic validity
```

## 60. No partial historical restore

If source R4 contains A B C and B cannot pass current candidate validation:

```text
restore fails
```

Forbidden:

```text
silently restore A C
```

or:

```text
call A C "restored R4"
```

## 61. No automatic rewrite-to-fit

D3-4 does not authorize:

```text
model rewrites historical content until current validator accepts it
```

as `Restore`.

A user may separately perform a current edit operation under D2 authority, but that creates a different mutation intent and candidate.

## 62. Whole-page source footprint

Historical restore inherits:

```text
WHOLE_PAGE_FROM_EXACT_COMMITTED_REVISION
```

One exact historical revision supplies the source semantic seed.

No automatic mixing with current head or another historical revision.

## 63. No cherry-pick from compare

D3-3 compare records:

```text
UNCHANGED_EXACT
LEFT_ONLY
RIGHT_ONLY
```

are ephemeral presentation derivatives.

They are not mutation addresses.

Forbidden:

```text
select LEFT_ONLY rows
→ commit them as restore patch
```

Selective cherry-pick remains outside D3-4.

## 64. No hybrid merge

Forbidden:

```text
current R10 = A B C
historical R4 = A X
restore
→ A X C automatically
```

Historical restore is not merge.

## 65. Successful restore

If fresh current validation and commit safety succeed:

```text
new revisionRef is committed
old historical revision remains immutable
restoredFromRevisionRef may point to exact source revision under D2 rules
current head advances atomically
```

The historical source itself never changes into the current record.

## 66. Restore no-op

If the fully revalidated candidate is semantically identical to current head:

```text
RESTORE_NO_OP
```

No new revision is manufactured solely because the source historical revision was different in lineage.

## 67. Head mismatch

D2 double-currentness remains mandatory:

```text
preflight head == expectedRevision
...
commit edge head == expectedRevision
```

Mismatch:

```text
RESTORE_REVISION_MISMATCH
```

No automatic rebase, retry-on-new-head, or merge.

## 68. Ambiguous commit result

D2 `COMMIT_OUTCOME_UNKNOWN` applies unchanged.

Blind retry is forbidden.

The owner must reconcile authoritative head/membership before another mutation attempt.

## 69. Historical source remains historical after restore

After successful restore from R4 to new R11:

```text
R4 remains historical R4
R11 becomes current head if commit succeeds
```

Opening R4 later still uses D3 historical admission/disclosure and historical chrome.

## 70. Current-status companion after restore

A historical R4 view may later derive a fresh page-level companion showing that a different current revision is available.

D3-4 does not add assertion-level lineage such as:

```text
this sentence was restored into R11
```

Stable assertion identity remains absent.

## 71. Search after restore

A successful restore may change current page semantics, but PK-X2 search still operates on its own current search descriptor/label rules.

D3-4 does not index the restored historical body as a historical corpus entry.

## 72. Search result does not imply history permission

Even if PK-X2 can currently show the page in search:

```text
search hit visible
!= history metadata ALLOW
!= historical body ALLOW
```

History remains a separate explicit operation with D3-2 disclosure.

## 73. History permission does not imply search discoverability

Likewise:

```text
historical R4 body ALLOW
```

cannot make the page discoverable in PK-X2 if the current search discoverability gate omits/holds it.

The authorities remain independent.

## 74. C5 audit

Does D3-4 create durable semantic lineage from search or compare derivatives?

```text
NO
```

`restoredFromRevisionRef` is same-page revision provenance already permitted by PK-D2.

No cross-family derived-to-derived parentage is added.

C5 stays closed.

## 75. C6 audit

Does viewing/navigating history automatically inject historical content into later model context?

```text
NO
```

A restore operation may consume an operation-local bounded semantic seed solely inside the explicit mutation path.

That is not ambient future-turn model memory.

C6 stays closed.

## 76. C8 audit

Does a route/revisionRef authorize delayed work?

```text
NO
```

Every restore/navigation mutation-sensitive action requires a new current operation and fresh authority.

No delayed/background restore or history index refresh is authorized.

C8 stays closed.

## 77. Reload behavior

Reload may clear:

```text
selected history row
compare pair
route action binding
current-status companion receipt
restore preflight state
```

It must not:

```text
auto restore
auto search history
auto remount stale body without D3 checks
auto create a restore seed
```

## 78. Dormancy

When no explicit D3 history/navigation/restore operation is active:

```text
history list read          = 0 required by D3-4
historical body read       = 0 required by D3-4
historical search scan     = 0
historical index update    = 0
restore seed materialize   = 0
restore validation         = 0
background model call      = 0
background network call    = 0
```

## 79. Failure taxonomy

D3-4 preserves distinct internal classes:

```text
NAVIGATION_PAGE_IDENTITY_INVALID
NAVIGATION_LIFETIME_INACTIVE
NAVIGATION_TARGET_IDENTITY_MISMATCH
NAVIGATION_REVISION_METADATA_WITHHELD
NAVIGATION_REVISION_NOT_COMMITTED
NAVIGATION_REVISION_AUTHENTICITY_FAILED
NAVIGATION_REVISION_BODY_WITHHELD
NAVIGATION_ROUTE_STALE
NAVIGATION_CHAIN_INVALID
SEARCH_HISTORICAL_SCOPE_UNSUPPORTED
RESTORE_SOURCE_BODY_WITHHELD
RESTORE_SOURCE_INVALID
RESTORE_MUTATION_UNAUTHORIZED
RESTORE_CURRENT_VALIDATION_FAILED
RESTORE_REVISION_MISMATCH
RESTORE_NO_OP
RESTORE_COMMIT_OUTCOME_UNKNOWN
```

## 80. Protected reason privacy

Ordinary UI may collapse protected failures into bounded generic states.

It must not reveal through navigation errors:

```text
privacy category
legal-withdrawal basis
hidden revision count
protected target detail
hidden assertion/citation count
```

## 81. Acceptance matrix - navigation

```text
N1 current page valid + explicit View History
→ bounded page-local list

N2 current page semantic body unavailable + exact active page identity + explicit View History
→ history may separately evaluate; no automatic fallback

N3 metadata ALLOW + body ALLOW
→ row visible/selectable; exact historical body after fresh checks

N4 metadata ALLOW + body DENY
→ row visible/selectable; metadata-only historical shell

N5 metadata DENY
→ no row / no route-based existence leak

N6 head advances while R4 open
→ R4 remains exact historical view; current companion may refresh separately

N7 browser back with stale cached R4
→ no semantic body before fresh historical checks

N8 copied route into another/ended lifetime
→ fail closed

N9 Open Current from R4
→ normal current page path; no R4 carry-forward
```

## 82. Acceptance matrix - search

```text
S1 PK-X2 page hit
→ current-page navigation only

S2 search hit payload
→ no history count / revision refs / old snippets

S3 user opens page history after current navigation
→ separate explicit D3 operation

S4 historical body contains query-worthy phrase
→ no automatic PK-X2 search

S5 explicit current search while history open
→ new PK-X2 job using current corpus/current labels

S6 global historical full-text query
→ unsupported first profile
```

## 83. Acceptance matrix - restore

```text
R1 authentic R4 + D3 body ALLOW + current support no longer endorses R4
→ source seed may materialize
→ current candidate validation still required

R2 authentic R4 + metadata ALLOW + body DENY
→ no restore seed

R3 body ALLOW + no current mutation permission
→ no restore operation

R4 source seed valid + current candidate validation fails
→ no commit

R5 one source assertion requires removal/rewrite
→ restore fails; no partial restoration

R6 head changes before commit
→ mismatch; no auto merge

R7 candidate equals current head
→ no-op; no new revision

R8 successful restore
→ new committed revision; source remains immutable history

R9 compare diff fragment selected
→ not a restore payload
```

## 84. Security invariants

```text
hidden revision existence cannot be inferred from ordinary list gaps/counts
copied route cannot bypass lifetime/disclosure
search cannot reveal historical corpus membership
body denial cannot be bypassed via restore seed
historical authenticity cannot become current truth authority
restore cannot reuse old validator authority
compare output cannot become mutation payload
```

## 85. Performance invariants

D3-4 adds no global scan.

First profile work is bounded by one exact active page and existing D2 revision limits.

No per-turn history reconciliation or cross-page traversal is selected.

D3-5 will perform final bounds/convergence audit.

## 86. Implementation blockers

Design freeze does not imply runtime readiness.

Future implementation still needs concrete, tested integrations for at least:

```text
host route/mount authority
exact page/revision action binding
D3-2 metadata filtering before list exposure
safe stale-DOM teardown
current page return routing
PK-X2 search-hit schema firewall
historical restore operation entitlement/handoff
current PK-D2 restore candidate validation
head concurrency reconciliation
bounded observability
```

## 87. Explicit non-goals

D3-4 does not select:

```text
historical global search
persistent historical index
cross-conversation history links
shareable authorization bearer URLs
revision-body embeddings
historical query suggestions
selective assertion cherry-pick
assertion-level restore identity
background restore
late mutation by revisionRef
```

## 88. D3-4 closure statement

```text
same active pageIdentity
→ bounded metadata-safe page-local history navigation
→ exact revisionRef
→ fresh authenticity/disclosure
→ historical presentation

historical revision
→ may provide a body-disclosable semantic seed
→ only into a new current PK-D2 restore operation
→ fresh current authority
→ NEW revision or no commit

PK-X2
→ remains current page search only
→ history is not added to its corpus
```

## 89. Candidate C result

```text
C1 YES
C2 YES
C3 YES
C4 YES
C5 NO
C6 NO
C7 YES
C8 NO
```

No hidden gate expansion was found in D3-4.

## 90. Next checkpoint

```text
D3-5 Lifetime / Bounds / Convergence
```

D3-5 must reassess D3-0 through D3-4 as a whole, verify bounded lifetime/retention and receipt/presentation budgets, audit hidden C5/C6/C8 pressure, and decide whether PK-D3 can be marked DESIGN CONVERGED.

Runtime implementation remains NOT AUTHORIZED.
