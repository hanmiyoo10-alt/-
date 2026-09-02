# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 D3-0 Historical Page Master Design — 2026-09-02

Date: 2026-09-02 KST

Status: **D3-0 MASTER DESIGN FROZEN · HISTORICAL_REVISION_VIEW_V1 · C1+C2+C3+C4+C7 ONLY · C5/C6/C8 CLOSED · HISTORICAL AUTHENTICITY SEPARATED FROM CURRENT TRUTH · CURRENT DISCLOSURE-SAFETY REQUIRED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · D3-0 · HISTORICAL_PAGE · CANDIDATE C C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PK-D2 converged a bounded revisioned PUBLIC_KNOWLEDGE page with a deliberate C7 firewall:

```text
stored old revision
!= unconditional historical display authority
```

PK-D3 impact scope selected the stronger requirement:

```text
an exact committed old revision may remain inspectable AS HISTORY
even when current world/source support no longer endorses that old semantic state as current truth
```

D3-0 freezes the master architecture for that capability.

This document implements no runtime historical viewer, archive backend, storage migration, prompt change, model call, network call, DOM/CSS, cleanup worker, release, or `release-simcore` mutation.

## 1. Final first capability profile

PK-D3 V1 consumes:

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

Canonical rule:

```text
PK-D3 = PK-D2 + C7 HISTORICAL INSPECTION
NOT = generic Candidate C activation
```

## 2. Selected product profile

D3-0 selects:

```text
HISTORICAL_REVISION_VIEW_V1
```

Meaning:

```text
same active-lifetime PUBLIC_KNOWLEDGE page
+ bounded committed revision history inherited from PK-D2
+ exact old revision selection
+ proof that the exact historical artifact was authentically committed
+ current disclosure-safety gate
+ explicitly historical presentation
```

Not included:

```text
cross-conversation archive
unbounded retention
historical global search
historical full-text index
historical model memory
stable citation registry
branching revision graph
late media attachment
```

## 3. Three independent authority axes

PK-D3 freezes three distinct questions.

### Axis A — Historical authenticity

```text
Was this exact semantic snapshot genuinely committed as revision R of page P?
```

### Axis B — Current truth/current-page support

```text
Would this semantic snapshot be valid current PUBLIC_KNOWLEDGE now?
```

### Axis C — Current disclosure safety

```text
May this authentic historical artifact be disclosed in the current context now?
```

Canonical separation:

```text
HISTORICAL AUTHENTICITY
!= CURRENT TRUTH SUPPORT
!= CURRENT DISCLOSURE SAFETY
```

A historical page body requires A + C.
It does not require B to be true.

## 4. Why current truth support is not a historical admission gate

If historical viewing required old revision R to pass all current truth/support/settlement checks unchanged, PK-D3 would collapse back into PK-D2.

Example:

```text
R4 committed: claim X shown as settled
R7 later: claim X corrected
current support no longer endorses R4 as current truth
```

PK-D3 exists so that a user may inspect:

```text
"R4 historically showed X as settled"
```

without asserting:

```text
"X is settled now"
```

## 5. Why current disclosure safety still applies

Historical authenticity is not an eternal disclosure license.

A later authoritative privacy/access/legal-withdrawal condition may prohibit disclosure of content that physically remains stored.

Therefore:

```text
historical authenticity PASS
+ current disclosure safety DENY/HOLD
→ historical body WITHHELD
```

This is not current truth revalidation.
It is current permission-to-disclose revalidation.

## 6. New trusted boundary — historical admission

D3-0 selects a revision-owner-authenticated historical admission boundary.

Conceptual shape:

```text
HistoricalRevisionAdmissionReceiptV1
  schemaVersion
  pageIdentity
  revisionRef
  lifetimeScopeRef
  admittedRevisionBindingRef
  admittedPolicyProfile
```

The exact physical encoding is implementation authority.

Required properties:

```text
owner-issued / owner-authenticated
bound to exactly one committed revision semantic snapshot
not producer/model writable authority
not reusable across another page/lifetime/revision
immutable after commit
```

## 7. `admittedRevisionBindingRef`

The historical admission receipt needs an exact integrity binding to the committed semantic revision.

Conceptual rule:

```text
receipt R4-binding
→ exactly one immutable committed R4 semantic record
```

A future implementation may use an owner-issued opaque immutable record identity, canonical digest, transactional membership binding, or equivalent mechanism.

D3-0 does not freeze a hash algorithm.

Forbidden:

```text
revision title
revision timestamp alone
body text similarity
rendered HTML fingerprint
host message index
```

as historical authenticity proof.

Canonical rule:

```text
INTEGRITY BINDING
!= SEMANTIC IDENTITY CREATION
```

## 8. Receipt does not duplicate truth authority

`HistoricalRevisionAdmissionReceiptV1` proves only:

```text
this exact revision semantic state was admitted into committed PK-D2 history
under the indicated bounded admission profile
```

It does not prove:

```text
claim true now
claim was metaphysically true then
current Exposure ALLOW
current settlement state
current citation authorization
current source validity
```

## 9. Existing committed revisions and bootstrap

PK-D3 may only treat a PK-D2 revision as historical-view-capable when an equivalent trustworthy historical admission binding exists.

Forbidden migration shortcut:

```text
old revision bytes exist
→ invent historical receipt from bytes alone
```

For revisions committed before a future PK-D3 implementation, migration requires a separately proven owner-safe admission reconstruction path or they remain D2-only revisions.

D3-0 does not authorize such migration.

## 10. Historical inspection request

First request is explicit and exact.

Conceptual input:

```text
pageIdentity
revisionRef
historicalInspectionIntent
```

`historicalInspectionIntent` is trusted operation framing, not user prose classification by the model.

Forbidden:

```text
user mentions "old"
→ automatically switch current page into historical mode
```

## 11. Historical inspection pipeline

Frozen conceptual order:

```text
1 exact active pageIdentity / lifetime
2 exact revisionRef lookup
3 authoritative committed-membership proof
4 exact immutable revision record
5 historical admission receipt / equivalent integrity binding
6 validate receipt ↔ page ↔ revision ↔ lifetime consistency
7 current historical-disclosure-safety policy
8 construct HistoricalRevisionViewV1
9 historical Presentation Renderer
```

Current truth/settlement support is not inserted as a gate between 6 and 8.

A separately requested current-status companion may independently invoke current authorities.

## 12. New trusted boundary — historical disclosure safety

D3-0 selects a distinct current policy boundary:

```text
HistoricalRevisionDisclosureContextV1
```

This context answers only current permission-to-disclose questions for an authentic historical artifact.

It may consume trusted inputs from current privacy/access/Exposure/withdrawal authorities, but it must not accidentally reintroduce full current truth validation as a requirement.

Conceptual result classes:

```text
ALLOW_HISTORICAL_DISCLOSURE
DENY_HISTORICAL_DISCLOSURE
HOLD_HISTORICAL_DISCLOSURE
```

Exact runtime enum names are deferred.

## 13. Disclosure context owner

Selected authority owner:

```text
PUBLIC_KNOWLEDGE historical disclosure policy layer
```

It is a least-authority current adapter/composer over existing trusted disclosure-relevant inputs.

It may not:

```text
create facts
upgrade settlement
invent privacy labels
manufacture source support
scan transcripts
call a model
call the network
```

Detailed input matrix is deferred to D3-2.

## 14. Current Exposure is not copied wholesale

Existing Exposure logic can contain assertion/current-source eligibility meaning beyond retrospective disclosure safety.

Therefore D3-0 explicitly rejects:

```text
run ordinary current Exposure gate unchanged
→ use result as historical disclosure decision
```

unless a future child proves the relevant profile is semantically identical for that specific input.

Required principle:

```text
USE DISCLOSURE-RELEVANT AUTHORITY ONLY
```

## 15. Historical whole-body atomicity

First D3 profile preserves D2-3's whole-revision integrity principle.

```text
historical body may be disclosed as exact committed semantic snapshot
OR
historical body is withheld
```

Forbidden first behavior:

```text
show 80% of R4 after silently dropping protected assertions
and still label it R4
```

If exact historical content cannot currently be disclosed as-is:

```text
WITHHOLD BODY
```

A future explicit redacted-historical-artifact profile would need new identity/version semantics.

## 16. Historical semantic immutability

Historical rendering must not rewrite the stored revision.

Forbidden:

```text
change old referenceState to current value
replace old citation labels with current labels
insert modern correction into old body
remove old assertion because current support changed
```

Historical page identity means:

```text
R4 VIEW
= exact admitted R4 semantic artifact
```

## 17. Historical settlement semantics

A historical revision may present its committed reference-state field only as part of that historical artifact.

Presentation meaning:

```text
"revision R4 carried state S"
```

not:

```text
"state S is authoritative now"
```

Historical settlement badges/labels require explicit historical framing.

## 18. Historical citations

Historical revision citation records may be presented as the citation surface committed with the old revision.

They prove only:

```text
R cited/presented this support surface when committed
```

They do not prove:

```text
citation is current
link is currently safe/resolvable
claim is currently supported by that record
```

## 19. Historical citation link behavior

D3-0 freezes a conservative default:

```text
historical citation semantic labels may render
interactive outbound/current-resolution behavior is NOT automatically inherited
```

A future D3 child may permit interactive link resolution only after a current safe-link/provenance resolver proves it is appropriate.

Stored URL-like text alone is not sufficient authority.

## 20. No stable citation identity

PK-D3 continues D2-4's rule:

```text
revisionCitationSlot
support anchor
citationRef
!= globally stable bibliography identity
```

Historical display does not create citation lineage across revisions.

## 21. Historical presentation type

Conceptual output:

```text
HistoricalRevisionViewV1
  pageIdentity
  revisionRef
  historicalStatus
  historicalDocument
  historicalCitationSurface?
  optionalCurrentStatusCompanion?
```

This is an ephemeral presentation/input-to-renderer object.
It is not a new committed revision.

## 22. Required visible historical framing

A future renderer must make historical status perceivable without relying only on color/icon.

At minimum the surface must communicate concepts equivalent to:

```text
historical revision
not current page
exact revision reference/position when safe to expose
```

It must not use ordinary current-page chrome in a way that erases this distinction.

Exact localized copy is deferred.

## 23. Current status companion

Historical view may optionally include separately authorized current context.

Example conceptual surface:

```text
Historical revision R4
Historical content: ...

Current status:
This page has since been corrected.
```

Rules:

```text
current companion derived from current authorities
historical body remains unchanged
failure to produce current companion does not rewrite historical body
```

Whether a companion is mandatory for specific historical states is deferred to D3-3.

## 24. Current page remains separate

Historical view never becomes automatic replacement for current page.

If:

```text
current head exists but current page is unavailable
```

ordinary current page state remains unavailable.

Historical navigation is separate explicit history inspection.

Canonical rule:

```text
HISTORY IS NOT STALE FALLBACK
```

## 25. Historical correction chain semantics

PK-D3 may show multiple exact committed revisions whose meanings differ over time.

Example:

```text
R4: X shown as settled
R7: X shown as corrected
```

This supports a historical statement:

```text
R4 displayed X as settled; R7 later displayed a correction
```

when both historical artifacts are authentic/disclosure-safe.

It does not preserve R4's state as current truth.

## 26. Withdrawal and retraction are dual-axis states

A later `WITHDRAWN_OR_RETRACTED_RECORD` does not mechanically imply either:

```text
purge all prior history
```

or:

```text
always show prior history
```

D3-0 freezes the need for two independent decisions:

```text
historical artifact authenticity
current permission to disclose withdrawn/retracted material
```

D3-2 will freeze the first concrete matrix.

## 27. Revision list and historical body

Page-local revision metadata listing remains separate from body authority.

A revision entry may be safely listable while its historical body is withheld, subject to metadata disclosure policy.

First scope preserves D2-5 cap:

```text
MAX_REVISION_LIST_ENTRIES = 64
```

No pagination is added by D3-0.

## 28. Historical compare

D3-0 authorizes a future D3-3 compare lane conceptually:

```text
exact historical revision A
+ exact historical revision B
+ both authentic
+ both current-disclosure-safe
→ bounded structural compare
```

Unlike D2-3 compare, current-truth eligibility of both bodies is not required.

Still preserved:

```text
compare output != revision
compare output != truth authority
ordinal != stable assertion identity
fuzzy semantic lineage = NO
```

## 29. Historical restore

Restore from an historically displayable revision remains a current mutation operation.

Frozen handoff:

```text
exact historical revision
→ semantic seed only
→ discard historical authority-owned truth/support fields as current authority
→ current source support
→ current Exposure/current PUBLIC_KNOWLEDGE settlement
→ current citation validation
→ D2-2 commit safety
→ NEW revision
```

Historical admission receipt is not a restore authorization token.

## 30. Historical view does not create mutation privilege

A user who can inspect R4 historically does not automatically gain authority to:

```text
restore R4
edit R4
remove R4
reattach R4
make R4 current
```

Historical inspection and revision-producing mutation remain different capability checks.

## 31. Search integration

PK-X2 remains current page-level search.

Allowed first path:

```text
PK-X2 current page result
→ pageIdentity
→ user opens page history
→ bounded revision metadata list
→ exact historical revision selection
```

Forbidden first behavior:

```text
global old-revision full-text search
old settlement search
old citation search
archive relevance ranking
```

## 32. No historical index

PK-D3 V1 requires no persistent historical search index.

Ordinary turns do not scan old revisions.

History listing is exact page-local bounded owner retrieval only.

## 33. Lifetime

First D3 profile inherits:

```text
CONVERSATION_SCOPED_PUBLIC_REFERENCE_IDENTITY
+ PK-D2 active-lifetime revision history
```

Therefore:

```text
ACTIVE → historical operations may proceed subject to policy
ENDED  → ordinary historical access invalid immediately
UNKNOWN → fail closed
```

No cross-conversation archive is created.

## 34. Cleanup

PK-D3 historical eligibility does not prevent trusted lifetime-end cleanup.

On lifetime END:

```text
historical inspection invalid immediately
historical admission metadata + revisions become owner-cleanup eligible under PK-D2/D3 ownership
physical deletion may follow
```

Physical cleanup failure does not revive historical usability.

## 35. Existing D2 caps remain authoritative

D3-0 inherits D2-5 finite limits unchanged.

No new retention capacity is created simply because revisions may now be historically viewable.

Important inherited examples:

```text
MAX_COMMITTED_REVISIONS_PER_PAGE = 64
MAX_RETAINED_REVISION_LOGICAL_BYTES_PER_PAGE = 4 MiB
no rolling eviction while ACTIVE
```

If a future historical archive needs more, it must open a new retention profile.

## 36. Historical admission metadata budget

D3-0 requires the future implementation to include historical admission metadata inside bounded revision/page storage budgets or freeze a separate finite cap before activation.

Forbidden:

```text
unbounded admission receipt side log
```

Exact byte cap is deferred to D3-5 if not absorbed into existing revision logical-record budget.

## 37. No C6 re-entry

Historical body is presentation/inspection data only.

Forbidden automatic behavior:

```text
user viewed R4 historically
→ inject R4 into next model prompt
```

A future history-aware reasoning feature must explicitly open C6 with controlled context re-entry.

## 38. No C5 cross-family lineage

PK-D3 historical admission/provenance is same-page revision history.

It does not make:

```text
NEWS story → PUBLIC_KNOWLEDGE revision
BOARD post → historical revision
```

formal derived-to-derived parentage.

C5 remains closed.

## 39. No C8 delayed effect

Exact revisionRef does not authorize delayed/background writes.

Forbidden:

```text
late media generation finishes
→ attach to old historical revision because revisionRef is known
```

C8 remains closed.

## 40. Dormancy

When no explicit PK-D3 historical operation is active:

```text
historical admission read   = 0
historical body read        = 0 required by PK-D3
historical disclosure join  = 0
historical compare          = 0
historical index scan       = 0
background model call       = 0
background network call     = 0
```

No proactive history refresh/index is selected.

## 41. Integrity failures

Historical inspection fails closed for at least:

```text
revision membership invalid
receipt missing where required
receipt ↔ revision mismatch
receipt ↔ page mismatch
receipt ↔ lifetime mismatch
semantic record integrity failure
unknown schema
lifetime unknown/ended
current disclosure policy HOLD/DENY
```

No fallback to host transcript reconstruction or similar revision is allowed.

## 42. No historical body synthesis

If exact stored historical semantic bytes cannot be retrieved/validated:

```text
NO HISTORICAL BODY
```

Forbidden:

```text
regenerate old page from current model
reconstruct from diff
reconstruct from citations
reconstruct from transcript
```

unless a future representation contract proves byte/semantic equivalence under owner authority.

## 43. Security/privacy anti-oracle

Historical operations must not reveal protected content through detailed failure reasons.

Ordinary UI may collapse protected cases such as:

```text
historical body absent
historical body disclosure DENY
historical body disclosure HOLD
historical admission unavailable
```

into a safe generic unavailable historical-content surface where required.

Internal diagnostics may retain bounded non-content reason codes.

## 44. Presentation failure does not rewrite history

If historical semantic admission succeeds but UI rendering fails:

```text
committed history remains unchanged
```

Presentation may retry/reconcile from authoritative historical-view inputs.

It may not alter old revision bytes to fit UI requirements.

## 45. Feature-off behavior

When historical-page feature is OFF:

```text
historical read = 0
historical disclosure join = 0
historical presentation = 0
```

Existing PK-D2 revision history remains governed by its own lifetime/retention contract.

Turning historical display OFF does not mutate or delete revisions.

## 46. D3-0 acceptance vectors

A future implementation/design child must preserve at least:

```text
M1 authentic R4 + current truth unsupported + disclosure ALLOW → historical R4 eligible
M2 authentic R4 + current truth corrected → R4 may display only as historical
M3 authentic R4 + current disclosure DENY → body withheld
M4 revision bytes + invalid committed membership → body withheld
M5 exact membership + receipt binding mismatch → invalid historical artifact
M6 current page unavailable → no automatic old-body fallback
M7 historical citation surface renders → not current citation authority
M8 historical restore intent → D2 current validation still required
M9 lifetime END → historical access immediately invalid
M10 ordinary turn → zero PK-D3 work
```

## 47. Child sequence after D3-0

```text
D3-0 Historical Page Master
      ✅ this document

D3-1 Historical Admission / Provenance Contract
      exact receipt ownership
      admission timing
      integrity/corruption/migration

D3-2 Historical Disclosure / Withdrawal Gate
      privacy/access/disclosure policy
      withdrawn/retracted matrix
      body/metadata withholding

D3-3 Historical Presentation / Compare
      historical grammar
      current-status companion
      historical compare

D3-4 Restore / Search / Navigation Boundary
      restore handoff
      page-local history navigation
      PK-X2 coexistence

D3-5 Lifetime / Bounds / Convergence
      receipt/resource caps
      cleanup
      C7 final audit
```

## 48. Runtime readiness remains false

After D3-0:

```text
PK-D3 DESIGN PROGRAM = IN PROGRESS
PK-D3 IMPLEMENTED     = NO
PK-D3 VALIDATED       = NO
PK-D3 RELEASED        = NO
```

No design document or merge may be represented as deployed runtime behavior.

## 49. Transaction classification

```text
DESIGN-ONLY
DOCS-ONLY
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
RELEASE = NOT AUTHORIZED
PRODUCTION BRANCH = MUST REMAIN UNCHANGED
```
