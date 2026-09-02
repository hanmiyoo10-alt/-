# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 D3-4 Restore / Search / Navigation Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **D3-4 IMPACT SCOPE FROZEN · PAGE-LOCAL HISTORY NAVIGATION · PK-X2 CURRENT-SEARCH FIREWALL · HISTORICAL-TO-D2 RESTORE HANDOFF · EXACT REVISION ADDRESSING · NO HISTORICAL GLOBAL SEARCH · C1+C2+C3+C4+C7 ONLY · C5/C6/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · D3-4 · RESTORE · SEARCH · NAVIGATION · CANDIDATE C C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D3-0 froze historical inspection as a same-page, active-lifetime capability and explicitly deferred restore/search/navigation integration to D3-4.

D3-1 froze exact historical authenticity.

D3-2 froze current disclosure decisions for revision metadata, body, and outbound actions.

D3-3 froze explicit historical presentation, page-level current-status companion, and two-sided disclosure-safe historical compare.

D3-4 selects the boundary for moving among current page, history list, exact historical revisions, current PK-X2 search, and a restore request without allowing navigation or historical visibility to mint semantic or mutation authority.

This file changes no runtime, storage schema, search implementation, renderer, DOM/CSS, model prompt, network behavior, release, or `release-simcore` state.

## 1. Fresh-main transaction note

D3-3 detailed design merged at:

```text
05cf113e5cc1e9287ef763f822958a04e3d2dcfe
```

Fresh `main` for this transaction was:

```text
9600ff1da9d3d092d29ac165c42910561a3f3f4e
```

The intervening main changes were inspected and are Agent Skill orchestrator/benchmark/workflow work with no PUBLIC_KNOWLEDGE, PK-D2, PK-D3, historical search, historical navigation, or restore-authority overlap.

Classification:

```text
WATCH · MAIN_ADVANCED_AFTER_D3_3 · NON_BLOCKING
```

Production authority remains `release-simcore`; this design transaction does not touch it.

## 2. Inherited capability profile

D3-4 preserves:

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

No new Candidate C gate is opened.

## 3. Selected seam

D3-4 selects:

```text
EXACT_PAGE_LOCAL_HISTORY_NAVIGATION
+
CURRENT_PKX2_SEARCH_FIREWALL
+
HISTORICAL_RESTORE_AS_NEW_CURRENT_MUTATION_HANDOFF
+
NO_HISTORICAL_GLOBAL_SEARCH
```

Canonical separation:

```text
NAVIGATION INTENT
!= HISTORICAL DISCLOSURE AUTHORITY
!= CURRENT PAGE AUTHORITY
!= RESTORE MUTATION AUTHORITY
```

## 4. Navigation domain

The first D3-4 navigation domain is exactly:

```text
one ACTIVE lifetimeScopeRef
one exact pageIdentity
that page's bounded committed PK-D2 revision chain
```

It is not:

```text
cross-conversation archive navigation
global revision corpus
all historical pages
host transcript search
network history
```

## 5. Allowed first navigation graph

```text
PK-X2 visible current page result
→ exact pageIdentity
→ normal current page activation
→ explicit View History intent
→ bounded page-local revision metadata list
→ exact revisionRef selection
→ fresh D3-1 authenticity
→ fresh D3-2 disclosure
→ D3-3 historical surface
```

Also allowed:

```text
exact active page context
→ explicit View History
→ same bounded page-local history lane
```

Historical navigation is never an automatic fallback for an unavailable current page.

## 6. Current-to-history transition

Selecting `View History` means only:

```text
USER REQUESTS PAGE-LOCAL HISTORY FOR THIS EXACT PAGE LOCATOR
```

It does not mean:

```text
all revisions may be listed
all bodies may be opened
historical feature may run in background
old content becomes current fallback
```

The revision owner and D3-2 metadata disclosure policy still govern each visible list entry.

## 7. History-to-exact-revision transition

A visible revision-row selection must be pinned to exact:

```text
pageIdentity + revisionRef
```

before body admission begins.

Forbidden addresses:

```text
row index
"revision 4" display label
revision timestamp
body snippet
title
CSS/DOM element position
browser-history position
model guess
```

A visible label is presentation only.

## 8. Revision-row selection is not body authorization

A metadata-visible row may be selected even when the revision body ultimately resolves to a metadata-only historical shell.

Canonical flow:

```text
metadata ALLOW
→ row may be visible/selectable
→ exact revisionRef pinned
→ fresh D3-1 + D3-2 body evaluation
→ body ALLOW ? historical body : safe metadata-only shell
```

Therefore:

```text
ROW SELECTED
!= BODY ALLOW
```

The row click is page-local owner navigation, not a shortcut around D3-2 body disclosure.

## 9. D3-2 outbound-action distinction

D3-2 `OUTBOUND_ACTION` governs semantic actions originating from historical content, such as citation resolution or external navigation.

D3-4 page-local revision-row selection is a separate non-semantic history-navigation operation over metadata already authorized for display.

It must not use this distinction to expose hidden metadata or body content.

Historical body-originating citation/link actions continue to require D3-2 `OUTBOUND_ACTION = ALLOW`.

## 10. History-list anti-oracle

The list itself is a disclosure surface.

Forbidden:

```text
resolve all revision refs
→ show count
→ hide denied rows later
```

or:

```text
"3 hidden revisions"
```

or gaps that deliberately encode hidden revision count.

Only metadata-disclosure-safe rows may become ordinary visible navigation targets.

## 11. Neighbor navigation

If D3-4 later exposes `Older` / `Newer` shortcuts inside the first profile, they may navigate only among metadata-visible exact revision targets already derivable under one bounded page-local operation.

They may not reveal skipped hidden revision count or use timestamps/lexical revisionRef ordering as chain authority.

Authoritative chain relationships remain PK-D2 owner facts.

## 12. Current-page navigation from history

An `Open Current` action from historical chrome means only:

```text
navigate to the same exact pageIdentity under the normal current PUBLIC_KNOWLEDGE path
```

It must not carry the historical body forward as current content.

Safe flow:

```text
historical pageIdentity
→ current navigation intent
→ active lifetime / target continuity
→ normal current PUBLIC_KNOWLEDGE activation
→ PX1-3 / PK-D2 current-head semantics
→ current presentation or current unavailable state
```

Canonical rule:

```text
OPEN CURRENT
!= PROMOTE HISTORICAL BODY
```

## 13. Browser/back-stack/cache boundary

Host route state, browser history, or cached DOM may remember only non-authoritative presentation/navigation state.

On remount/revisit:

```text
route/cache hit
→ exact refs must be re-resolved
→ lifetime must still be ACTIVE
→ D3-1/D3-2 must be fresh enough for current operation
→ presentation rebuilt
```

Forbidden:

```text
browser back
→ stale historical body flashes before current disclosure check
```

Old semantic subtree must not be treated as authorized during revalidation.

## 14. Deep-link / route-token boundary

A future host may encode an opaque route token or exact revision locator for navigation convenience.

That token is not authority.

It must resolve to the exact active-lifetime page/revision through owner state before historical admission.

A copied route must not create:

```text
cross-conversation archive access
ended-lifetime access
revision existence oracle
historical body disclosure authority
```

## 15. PK-X2 remains current page-level search

D3-4 preserves the PK-X2 master rule:

```text
PK-X2 = find a currently discoverable durable page address
```

The PK-X2 V1 corpus remains:

```text
ACTIVE lifetime
PUBLIC_KNOWLEDGE_DOCUMENT namespace
already-minted durable page identities
current trusted target labels
```

D3-4 does not add revision records to that corpus.

## 16. Search-hit payload firewall

A PK-X2 search hit must not gain historical fields merely because PK-D3 exists.

Forbidden ordinary hit metadata:

```text
revision count
historical revision refs
old titles
old snippets
old settlement states
old citation labels
"has corrections" inferred from history
latest historical body
```

Search result selection still enters normal current-page activation first.

## 17. No global historical search

D3-4 V1 explicitly excludes:

```text
historical body full-text search
revision metadata keyword search across pages
old settlement search
old citation-text search
historical embedding search
historical LLM reranking
cross-page historical revision search
cross-conversation history search
```

Canonical rule:

```text
PK-D3 HISTORY
= PAGE-LOCAL BOUNDED OWNER NAVIGATION
!= SEARCH CORPUS
```

## 18. No persistent historical index

D3-4 selects no persistent historical search/navigation index.

Ordinary turns require:

```text
historical global index scan = 0
historical body scan         = 0
cross-page revision scan     = 0
```

History list retrieval remains exact page-local bounded owner retrieval.

## 19. Historical text does not automatically seed PK-X2

Viewing or selecting text in a historical body must not automatically create a current PK-X2 query.

A user may explicitly initiate a new current search operation, but that new operation is governed by PK-X2 current-search authority and current labels/corpus.

Canonical rule:

```text
HISTORICAL BODY VISIBLE
!= CURRENT SEARCH JOB ACTIVE
```

This also preserves C6 closure.

## 20. Restore boundary selected by D3-0

D3-0 froze:

```text
exact historical revision
→ semantic seed only
→ current authorities
→ D2-2 commit safety
→ NEW revision
```

D3-4 makes this handoff explicit.

Historical admission/disclosure is not mutation authority.

## 21. Historical restore differs from PK-D2 restore-source admission

PK-D2 D2-3 required ordinary old-revision restore sources to pass its current inspection gate and explicitly deferred historical-source behavior to PK-D3.

D3-4 selects the historical extension:

```text
exact committed historical revision
+ D3-1 authenticity PASS
+ D3-2 REVISION_BODY ALLOW
+ explicit restore intent
+ separate current mutation authorization
→ historical restore source may be materialized as an EPHEMERAL SEMANTIC SEED
```

It does **not** require the historical body to be valid current truth before seed materialization.

Current truth/support is re-proved on the newly constructed candidate before commit.

## 22. Why D3-2 body ALLOW is required for historical restore source

D3-4 must not create a hidden promotion path:

```text
body cannot be disclosed now
→ but hidden bytes can be restored into current state
```

Therefore:

```text
REVISION_BODY DENY/HOLD
→ no historical restore seed materialization
```

Metadata-only visibility is insufficient.

## 23. Body ALLOW still does not authorize restore

Canonical separation:

```text
D3-2 BODY ALLOW
!= RESTORE MUTATION ALLOW
```

A restore action additionally requires the ordinary current mutation authority/profile for PK-D2 and all current commit prerequisites.

The UI must not infer mutation privilege from successful historical inspection.

## 24. Restore handoff object

D3-4 reserves an ephemeral conceptual handoff:

```text
HistoricalRevisionRestoreHandoffV1
  pageIdentity
  sourceRevisionRef
  expectedRevision
  lifetimeScopeRef
  sourceAdmissionBindingRef
  bounded semanticSeed
```

Exact physical schema is deferred.

The handoff is:

```text
EPHEMERAL
CURRENT OPERATION ONLY
NON-CANONICAL
NON-PERSISTENT
NON-TRUTH-AUTHORITY
NON-COMMIT-AUTHORITY
```

`sourceAdmissionBindingRef` proves which authentic historical artifact supplied the seed; it does not authorize current semantics.

## 25. Restore seed content

The seed may contain only producer/source-owned semantic material required by the existing D2 restore candidate contract.

It must discard or treat as non-current-authoritative at least:

```text
old referenceState
old settlement decision
old claimSupportRef
old current-source authority refs
old Exposure result
old current-support receipts
old trusted target display data
old citation authorization
old current-head metadata
old historical disclosure receipt
old presentation status
```

## 26. Restore current validation remains complete

After historical seed materialization:

```text
fresh current target continuity
+ current source/support-at-use
+ current Exposure
+ current settlement
+ current citation/provenance
+ PK structural validation
+ whole-page restore footprint validation
+ semantic no-op check
+ expectedRevision re-check
+ D2-1/D2-2 atomic commit safety
```

are still required.

If current authority cannot validate the whole candidate:

```text
RESTORE FAILS / HOLDS
NO COMMIT
```

## 27. No historical auto-rewrite during restore

Forbidden:

```text
historical R4 body contains A B C
B fails current support
→ silently restore A C
```

or:

```text
model rewrites R4 into something currently acceptable
→ call that Restore R4
```

First historical restore remains whole-source semantic copy-forward into a newly validated current candidate.

If source-owned semantics require omission/rewrite to become current, restore fails; a separate explicit edit operation may construct a different candidate under D2 rules.

## 28. Restore head concurrency

Historical navigation can be long-lived while current head advances.

Therefore restore must pin:

```text
expectedRevision = exact current head at restore operation start
```

and apply D2 double-currentness checking.

If head changes:

```text
RESTORE_REVISION_MISMATCH
```

No automatic rebase or merge.

## 29. Restore success creates new revision

Successful historical restore never mutates old revision bytes and never makes the old revision record itself current.

It creates:

```text
NEW committed revision
restoredFromRevisionRef = exact historical sourceRevisionRef
```

subject to existing D2 semantics.

No-op restore creates no revision.

## 30. Restore-from-compare firewall

D3-3 compare output is not a restore payload.

Forbidden:

```text
select LEFT_ONLY diff fragments
→ restore those fragments directly
```

Restore source is one exact committed historical revision, not an ephemeral compare derivative.

Selective cherry-pick remains a separate future operation contract.

## 31. Navigation does not open C5

Moving from PK-X2 current page result to PK-D3 history is navigation among authorities for the same page locator.

It does not create semantic parentage:

```text
search hit → historical revision
```

as a durable derived-to-derived lineage edge.

C5 remains closed.

## 32. Navigation does not open C6

Route state, revision selection, visible historical body, or restore seed must not automatically enter future model context.

Explicit mutation candidate construction uses the bounded restore operation contract, not ambient model memory.

C6 remains closed.

## 33. Navigation/restore do not open C8

Knowing exact `pageIdentity + revisionRef` does not authorize delayed/background work.

No later task may restore, edit, or navigate semantic state by stale revisionRef without a new current operation and current authority.

C8 remains closed.

## 34. Failure taxonomy selected for detailed design

D3-4 detailed design should keep distinct at least:

```text
NAVIGATION_PAGE_IDENTITY_INVALID
NAVIGATION_LIFETIME_INACTIVE
NAVIGATION_REVISION_METADATA_WITHHELD
NAVIGATION_REVISION_NOT_COMMITTED
NAVIGATION_REVISION_AUTHENTICITY_FAILED
NAVIGATION_REVISION_BODY_WITHHELD
NAVIGATION_ROUTE_STALE
SEARCH_HISTORICAL_SCOPE_UNSUPPORTED
RESTORE_SOURCE_BODY_WITHHELD
RESTORE_MUTATION_UNAUTHORIZED
RESTORE_CURRENT_VALIDATION_FAILED
RESTORE_REVISION_MISMATCH
RESTORE_NO_OP
RESTORE_COMMIT_OUTCOME_UNKNOWN
```

Ordinary UI may collapse protected disclosure failures into safe generic unavailable states.

## 35. Acceptance vectors selected

Detailed design must preserve at least:

```text
N1 PK-X2 hit → current page → explicit history → visible metadata list
N2 history row metadata ALLOW/body ALLOW → exact historical body
N3 history row metadata ALLOW/body DENY → selectable metadata-only historical shell
N4 metadata DENY → no visible row / no revision existence leak
N5 copied route from ended lifetime → no historical access
N6 browser back with stale cached body → no stale body before fresh disclosure
N7 Open Current from R4 → normal current path, not R4 promotion
N8 PK-X2 search hit → no revision count/history snippet fields
N9 historical body text visible → no automatic PK-X2 query
N10 global historical full-text query → unsupported in V1
R1 authentic historical R4 + body ALLOW + current support no longer endorses R4 → restore seed may materialize, candidate then must pass fresh current validation
R2 R4 body DENY/HOLD → no restore seed
R3 body ALLOW but mutation authority absent → no restore
R4 current head advances during restore → revision mismatch, no auto merge
R5 candidate requires dropping one old assertion → restore fails, no partial restore
R6 successful historical restore → new revision; old R4 unchanged
R7 semantic no-op against current head → no new revision
R8 compare diff selection → not a restore source
```

## 36. Deferred

Deferred from D3-4:

```text
historical global search / historical index
cross-conversation archive routes
persistent deep-link authorization
revision-body full-text search
selective cherry-pick restore
assertion-level restore lineage
stable assertion identity
historical route analytics as semantic authority
background restore/index refresh
receipt/presentation byte caps and final convergence
```

D3-5 owns lifetime/bounds/convergence closure.

## 37. Impact conclusion

D3-4 should freeze the following detailed contract without expanding the capability profile:

```text
same active page
→ bounded metadata-safe history navigation
→ exact revision selection
→ fresh authenticity/disclosure
→ explicit historical view

PK-X2
→ remains current durable-page search only

historical restore
→ authentic + body-disclosable source semantic seed
→ separate current D2 mutation authority
→ fresh current validation
→ NEW revision or no commit
```

Canonical closure target:

```text
HISTORY NAVIGATION ≠ HISTORY SEARCH
HISTORY DISPLAY ≠ RESTORE AUTHORITY
RESTORE SOURCE ≠ CURRENT TRUTH
SEARCH HIT ≠ HISTORICAL CORPUS ENTRY
```

No runtime implementation or production release is authorized by this impact scope.
