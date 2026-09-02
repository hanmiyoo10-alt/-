# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 Historical Page Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-D3 IMPACT SCOPE FROZEN · HISTORICAL REVISION DISPLAY LANE · C7 DESIGN ACTIVATION · CURRENT DISCLOSURE SAFETY PRESERVED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · HISTORICAL_PAGE · CANDIDATE C C7 · IMPACT SCOPE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PK-D2 converged a bounded revisioned PUBLIC_KNOWLEDGE page while intentionally withholding old revision bodies whenever current semantic support no longer permitted ordinary current inspection.

PK-D3 selects the next stronger product requirement:

```text
show what an exact committed PUBLIC_KNOWLEDGE revision said at that time
EVEN WHEN current world/source support no longer endorses that old revision as current semantic material
```

This document freezes only the impact scope and architecture seam for that requirement.

It implements no runtime historical viewer, archive store, migration, prompt change, model call, network call, DOM/CSS, release, or `release-simcore` mutation.

## 1. Inherited authority

PK-D3 consumes without weakening:

```text
PK-D1 / PK-X1 durable page identity
PK-D2 D2-0..D2-5 revisioned-page contracts
PK-1 settlement authority
PK-2 PUBLIC_KNOWLEDGE document validator
PK-4 citation/provenance boundary
PK-X2 page-level search boundary
Candidate C durable object master
Candidate C CC-7 partial descendant survival / HISTORICAL_ONLY distinction
3M-6 support-at-use invalidation
Exposure / Evidence / Lineage / Handoff authority
Presentation Renderer semantic-preservation boundary
```

Inherited separations remain:

```text
historical retention != current truth
stored revision != current support
historical display != current page fallback
revision metadata != semantic truth
citation surface != citation authority
settlement state != current settlement authority
```

## 2. Selected capability profile

PK-D3 extends PK-D2 by opening C7 only:

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 semantic mutation          = YES
C4 append / merge pressure    = YES
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = NO
C7 historical survival        = YES, DESIGN ONLY
C8 delayed effect targeting   = NO
```

Canonical rule:

```text
PK-D3 OPENS HISTORICAL DISPLAY AUTHORITY
WITHOUT OPENING MODEL MEMORY, CROSS-FAMILY LINEAGE, OR ASYNC ATTACHMENT
```

## 3. Primary semantic split

PK-D3 introduces two independent questions for an old committed revision R:

```text
A. CURRENT-SEMANTIC QUESTION
   Is R's content supported as current PUBLIC_KNOWLEDGE now?

B. HISTORICAL-EVIDENCE QUESTION
   Is R an authentic committed historical PUBLIC_KNOWLEDGE snapshot that may be disclosed as what the page said then?
```

PK-D2 primarily answered A.
PK-D3 adds a bounded path for B.

Canonical rule:

```text
NOT CURRENTLY SUPPORTED
MAY STILL BE
AUTHENTIC HISTORICAL PAGE CONTENT
```

## 4. Historical display must not masquerade as current truth

A PK-D3 body is rendered only in an explicitly historical presentation state.

Required semantic framing:

```text
HISTORICAL REVISION
NOT CURRENT PAGE
NOT CURRENT SETTLEMENT CLAIM
```

Forbidden:

```text
old revision selected
→ replace ordinary current page body with old body without historical framing
```

Historical content may coexist with a separately resolved current page/status, but the two authority domains must remain visibly distinct.

## 5. Historical authenticity basis

PK-D3 must not prove history through text similarity, transcript reconstruction, model recollection, timestamps alone, or old labels.

Minimum authenticity basis:

```text
exact pageIdentity
+ exact committed revisionRef
+ authoritative committed-membership proof
+ immutable revision semantic snapshot
+ bounded revision relationship metadata
+ commit-time admission/provenance evidence sufficient to prove that this exact visible semantic state was admitted as a PUBLIC_KNOWLEDGE revision
```

This basis proves:

```text
"the page committed this content as revision R"
```

It does not prove:

```text
"the content is true now"
```

## 6. New historical-admission seam

PK-D3 requires a consumer-owned durable historical admission seam for committed revisions.

Conceptual name:

```text
HistoricalRevisionAdmissionReceiptV1
```

Purpose:

```text
prove exact committed historical-page admission
without reusing current truth/support authority
```

It may bind only bounded provenance needed to authenticate the historical artifact.

It must not become:

```text
current Exposure ALLOW token
current settlement proof
current citation authorization
current source support receipt
model memory token
```

Exact fields are deferred to D3-0 / D3-1.

## 7. Current disclosure safety remains mandatory

PK-D3 relaxes current *truth-support* requirements for historical inspection.
It does not grant a blanket right to disclose bytes forever.

Before historical body presentation, current disclosure policy must still be able to answer whether the already-public historical artifact may be shown in the current context.

Examples of current gates that may still block historical body display:

```text
current privacy / access restriction
current source Exposure DENY for disclosure
redaction / legal-withdrawal policy if separately authoritative
lifetime / namespace invalidity
record corruption
```

Canonical separation:

```text
CURRENT TRUTH SUPPORT MAY FAIL
AND HISTORICAL DISPLAY MAY STILL PASS

CURRENT DISCLOSURE SAFETY FAILS
→ HISTORICAL BODY WITHHELD
```

## 8. No current-support fallback requirement for historical truth

PK-D3 must not require current source support to re-endorse the old assertion as true merely to display the revision historically.

That would collapse PK-D3 back into PK-D2.

Instead current support may be used only where required for current disclosure/safety or separately displayed current-status context.

## 9. Historical body semantics are commit-time semantics

When historical display is admitted:

```text
show exact committed semantic revision
```

not:

```text
rewrite old revision using current settlement
rewrite old citation labels
silently remove assertions that are no longer current
silently add modern corrections into old body
```

If current policy requires semantic redaction/rewrite before disclosure, the first PK-D3 profile should withhold the historical body rather than present a mutated artifact under the same revisionRef.

Canonical rule:

```text
HISTORICAL REVISION IDENTITY
REQUIRES HISTORICAL SEMANTIC IMMUTABILITY
```

## 10. Historical settlement state

A stored revision may display its committed reference-state semantics as historical page state only when clearly framed as historical.

Example:

```text
R4 historical snapshot:
SETTLED_PUBLIC_REFERENCE
```

means:

```text
R4 was committed with that public-reference state
```

not:

```text
the claim is settled now
```

A current status panel may separately show a different current settlement result.

## 11. Historical citation surface

A historical revision may preserve/display the citation surface that was committed with that revision as evidence of the page's historical presentation.

That citation surface must be framed as historical revision metadata/semantics.

It must not be represented as current citation authorization merely because it is stored.

First impact rule:

```text
historical citation surface
= evidence of what R cited
!= current citation authority
```

Whether historical links remain interactive is deferred to presentation/safety design.

## 12. No stable citation identity invented

PK-D3 does not convert PK-D2 revision citation slots or support anchors into globally stable citation identities.

Still forbidden:

```text
same label/url/slot across revisions
→ same durable bibliography entity
```

Stable citation identity remains a separate future design.

## 13. Historical page is not current-page fallback

If current head is unsupported/unavailable:

```text
current page unavailable
```

must remain true.

PK-D3 may offer a separately explicit historical inspection action.

Forbidden:

```text
current page unavailable
→ automatically show latest old historical revision as page body
```

Canonical rule:

```text
HISTORICAL ACCESS
MUST BE EXPLICITLY HISTORICAL
```

## 14. Navigation seam

First historical navigation stays page-local and exact.

Allowed conceptual path:

```text
current/discovered pageIdentity
→ bounded committed revision list
→ user explicitly selects exact revisionRef
→ historical admission gate
→ historical presentation
```

Not first scope:

```text
global historical full-text search
search by old citation
search by old settlement state
search all expired pages
cross-conversation archive browse
```

PK-X2 remains current page-level discovery.

## 15. Lifetime boundary

PK-D3 first scope inherits PK-D2 / PK-X1 conversation lifetime unless later child design explicitly selects another profile.

Therefore:

```text
ACTIVE lifetime
→ eligible historical revision inspection subject to PK-D3 gates

ENDED lifetime
→ ordinary PK-D3 historical access invalid
→ physical cleanup may reclaim records

UNKNOWN lifetime
→ fail closed
```

PK-D3 does not yet create a cross-conversation archive.

## 16. C7 meaning for PK-D3

For this consumer, C7 means:

```text
an old committed revision may remain semantically inspectable AS HISTORY
when current source/world authority no longer endorses it as current semantic material
```

It does not mean:

```text
old revision becomes a current descendant
old revision is automatically reattached to current source
old revision may re-enter model context
old revision remains globally accessible after lifetime END
```

## 17. HISTORICAL_ONLY consumer mapping

PK-D3 maps the CC-7 distinction conceptually to:

```text
CURRENT_VALID_REVISION
CURRENT_UNAVAILABLE_BUT_HISTORICAL_ELIGIBLE
HISTORICAL_WITHHELD
```

Exact runtime enums are deferred.

The key semantic property is:

```text
HISTORICAL ELIGIBLE
!= CURRENT VALID
```

## 18. No automatic source reattachment

If revision R was supported by source authority S_old and current source authority is S_new:

```text
R historical authenticity
```

does not require pretending:

```text
R now belongs to S_new
```

Historical provenance may identify that R was admitted under the old support relationship without reattaching it as current support.

## 19. Current status may be shown separately

A historical viewer may later display a bounded current-status companion such as:

```text
Historical revision R4
Current page status: corrected / unavailable / changed
```

only when current status itself is independently authorized.

It must not rewrite the historical body.

## 20. Correction semantics

A later correction does not erase the fact that an earlier revision existed.

Example:

```text
R4: claim X shown as settled
R7: claim X corrected
```

PK-D3 may preserve:

```text
R4 historically said X
R7 later corrected X
```

without asserting:

```text
X remains settled now
```

This is a core motivation for PK-D3.

## 21. Withdrawal/retraction boundary

Historical display after a later withdrawal/retraction needs a dedicated distinction:

```text
semantic historical existence
vs
current permission to disclose the withdrawn material
```

The first architecture therefore does not equate `WITHDRAWN` with either automatic historical deletion or automatic historical visibility.

A later D3 child must freeze the exact withdrawal disclosure matrix.

## 22. Historical compare

PK-D3 may eventually allow compare between historical revisions without requiring both to be current-truth eligible.

However both sides must independently pass:

```text
historical authenticity
+ current disclosure safety
```

The diff remains derived presentation, not a new revision or truth authority.

Detailed compare contract deferred.

## 23. Historical restore remains current mutation

Selecting a historical revision for restore does not let historical authority bypass D2 mutation rules.

Restore remains:

```text
historical source revision
→ extract semantic seed
→ current support / Exposure / settlement / citation validation
→ D2-2 expectedRevision / footprint / no-op / commit safety
→ NEW current revision
```

Canonical rule:

```text
HISTORICAL DISPLAY AUTHORITY
!= CURRENT RESTORE AUTHORITY
```

## 24. No model-context re-entry

Historical body display does not imply:

```text
old revision → future model prompt
```

C6 remains closed.

Any request to let the model reason from historical revisions across turns activates a separate context-reentry design.

## 25. No cross-family lineage expansion

PK-D3 historical provenance remains same-page revision/history provenance.

It does not create formal derived-to-derived ancestry from NEWS/BOARD/SOCIAL_FEED into PUBLIC_KNOWLEDGE revisions.

C5 remains closed.

## 26. No delayed attachment

Historical revisions do not accept late media/effects solely because an exact revisionRef exists.

C8 remains closed.

## 27. Retention relationship to PK-D2 caps

First PK-D3 scope inherits D2-5 active-lifetime caps and no-rolling-eviction policy.

Historical eligibility does not increase:

```text
revision count
retained page bytes
citation caps
compare output caps
```

A larger/longer archive requires a new retention profile.

## 28. No historical mutation

A committed historical revision remains immutable.

Forbidden:

```text
redact R4 in place
change R4 settlement label
replace R4 citation
```

If an old artifact can no longer be disclosed as-is, first scope withholds it.

Representation-only migration may not alter semantic identity/content.

## 29. Metadata-only listing remains distinct

Even when a historical body is withheld, bounded revision metadata may remain listable if that metadata itself is safe to disclose under current policy.

This preserves:

```text
revision existed
```

without necessarily exposing:

```text
revision body
```

Anti-oracle rules for protected metadata must be frozen later.

## 30. Security/privacy risk added by PK-D3

PK-D3 increases risk because historical bytes can outlive current truth/support.

Main risks:

```text
reviving withdrawn/private material
confusing old state with current truth
historical citation becoming false current authority
using old body as model memory
search/index expansion creating archive oracle
retention expansion beyond expected lifetime
```

First profile mitigations:

```text
explicit historical framing
current disclosure safety gate
exact page/revision navigation
no global historical search
no C6 re-entry
bounded existing D2 retention
whole-revision immutable display or withholding
```

## 31. Dormancy

On ordinary turns with no explicit historical-page operation:

```text
historical revision read = 0 required by PK-D3
historical compare        = 0
historical provenance read= 0
archive scan              = 0
model call                = 0
network call              = 0
```

No background historical indexing/refresh is selected.

## 32. Impacted authority surfaces

Design impacts are limited conceptually to:

```text
PK-D2 revision-owner historical admission metadata
historical inspection policy
current disclosure-safety join
historical presentation state
page-local revision navigation
historical compare/restore integration
retention/convergence audit
```

Not selected:

```text
new global archive service
new entity registry
new stable citation registry
model memory subsystem
NEWS/BOARD/SOCIAL_FEED mutation
runtime release work
```

## 33. Proposed PK-D3 child sequence

```text
D3-0 Historical Page Master
      capability profile
      authenticity vs current-disclosure split
      historical admission receipt

D3-1 Historical Admission / Provenance Contract
      commit-time evidence
      exact historical identity
      corruption/failure states

D3-2 Historical Disclosure / Withdrawal Gate
      current privacy/exposure safety
      withdrawn/retracted handling
      whole-body withholding

D3-3 Historical Presentation / Compare
      explicit historical grammar
      current-status companion
      historical compare

D3-4 Restore / Search / Navigation Boundary
      D2 restore handoff
      page-local navigation
      no global historical search

D3-5 Lifetime / Bounds / Convergence
      D2 cap inheritance
      cleanup
      Candidate C C7 audit
```

## 34. Acceptance vectors for future design

Future children must cover at least:

```text
H1 old revision current-support FAIL but authentic + disclosure-safe → historical body eligible
H2 old revision authentic but current disclosure DENY → body withheld
H3 old revision bytes exist but committed membership invalid → no historical body
H4 current settlement differs from old committed settlement → old state may display only as historical
H5 current citation authorization differs → old citation surface not upgraded to current authority
H6 correction occurred later → prior revision can remain historical without becoming current
H7 current page unavailable → no automatic historical fallback
H8 restore from historical revision → current D2 validation still mandatory
H9 lifetime ENDED → ordinary historical access denied
H10 ordinary non-historical turn → zero historical work
```

## 35. Impact verdict

```text
PK-D3 PRODUCT REQUIREMENT
= LEGITIMATE C7 CONSUMER

SELECTED FIRST LANE
= ACTIVE-CONVERSATION HISTORICAL REVISION INSPECTION

CURRENT TRUTH SUPPORT
= NOT REQUIRED TO ENDORSE OLD BODY AS CURRENT

CURRENT DISCLOSURE SAFETY
= STILL REQUIRED

C7
= DESIGN-OPEN FOR PK-D3 ONLY

C5 / C6 / C8
= CLOSED
```

## 36. Transaction classification

```text
DESIGN-ONLY
DOCS-ONLY
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
RELEASE = NOT AUTHORIZED
PRODUCTION BRANCH = MUST REMAIN UNCHANGED
```
