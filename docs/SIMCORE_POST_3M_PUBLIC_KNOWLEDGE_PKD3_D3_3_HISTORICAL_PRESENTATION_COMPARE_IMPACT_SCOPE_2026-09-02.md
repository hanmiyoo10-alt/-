# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 D3-3 Historical Presentation / Compare Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **D3-3 IMPACT SCOPE COMPLETE · EXPLICIT HISTORICAL CHROME · DISCLOSURE-PRESERVING PRESENTATION · CURRENT-STATUS COMPANION SEPARATION · BOUNDED TWO-SIDED HISTORICAL COMPARE · C1+C2+C3+C4+C7 ONLY · C5/C6/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · D3-3 · HISTORICAL PRESENTATION · COMPARE · CURRENT-STATUS COMPANION · CANDIDATE C C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D3-0 froze the historical-page capability profile.
D3-1 froze historical admission/provenance.
D3-2 froze current disclosure authorization for historical surfaces.

D3-3 selects the minimum presentation and compare seam answering:

```text
HOW MAY AN AUTHENTIC + CURRENTLY DISCLOSABLE HISTORICAL REVISION
BE SHOWN WITHOUT LOOKING LIKE THE CURRENT PUBLIC_KNOWLEDGE PAGE,
AND HOW MAY TWO SUCH REVISIONS BE COMPARED WITHOUT LEAKING
CONTENT THAT EITHER INPUT IS NOT CURRENTLY AUTHORIZED TO DISCLOSE?
```

This checkpoint is design-only.

It implements no renderer code, DOM/CSS, compare engine, current-status generator, model call, network call, storage, migration, prompt change, release, or `release-simcore` mutation.

## 1. Authority chain

Consumes without reopening:

```text
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_0_HISTORICAL_PAGE_MASTER_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_1_HISTORICAL_ADMISSION_PROVENANCE_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_2_HISTORICAL_DISCLOSURE_WITHDRAWAL_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PK3_PRESENTATION_GRAMMAR_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_3_REVISION_READ_COMPARE_RESTORE_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_5_LIFETIME_BOUNDS_CONVERGENCE_DESIGN_2026-09-02
```

Inherited separations:

```text
historical authenticity
!= current truth
!= current disclosure permission
!= presentation

historical disclosure ALLOW
!= current mutation authority

historical body
!= current page body
```

## 2. Capability profile

D3-3 preserves:

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

## 3. Selected first presentation profile

Selected conceptual profile:

```text
HISTORICAL_PUBLIC_REFERENCE_VIEW_V1
```

First scope:

```text
page-local exact historical revision
active trusted conversation lifetime
D3-1 historical admission valid
D3-2 required surface disposition ALLOW
read-only historical presentation
bounded compare of two exact revisions
optional separately current-derived status companion
```

Outside first scope:

```text
global historical search
cross-conversation archive
partial/redacted historical artifact identity
branching revision visualization
editor identity/history analytics
historical comments/annotations
model-authored historical summary
persistent compare artifact
```

## 4. Historical chrome is semantic safety presentation

A historical revision must never rely on color, icon, placement, or subtle styling alone to distinguish it from the current page.

Minimum perceivable text semantics must identify:

```text
THIS IS A HISTORICAL REVISION
NOT THE CURRENT PUBLIC_REFERENCE PAGE
```

Forbidden historical chrome:

```text
Current
Latest
Official current page
Verified current record
```

unless a separately current-authorized surface is explicitly speaking about current state.

## 5. Current PUBLIC_REFERENCE_DOCUMENT_V1 chrome is not reused wholesale

PK-3 current-page grammar remains valid for current projection.

D3-3 must use a distinct presentation kind/adapter identity for history.

Conceptual separation:

```text
PUBLIC_REFERENCE_DOCUMENT_V1
!=
HISTORICAL_PUBLIC_REFERENCE_VIEW_V1
```

The historical adapter may reuse safe source-local typography/layout primitives, but not current-state semantic labels or lifecycle assumptions.

## 6. Historical read model seam

Conceptual output:

```text
HistoricalPublicReferencePresentationV1
  kind = HISTORICAL_PUBLIC_REFERENCE
  renderInstanceKey
  pageIdentity
  revisionRef
  title
  historicalStatusLabel
  revisionMetadata?
  historicalDocument?
  currentStatusCompanion?
  disclosureState
```

This read model is:

```text
EPHEMERAL
READ_ONLY
NONCANONICAL
NONPERSISTENT
NON-MODEL-CONTEXT
```

It is not a new durable semantic object.

## 7. Trusted title boundary

Historical title must derive from trusted current/historical target presentation authority, never from historical body text or model guesswork.

A title change across time does not alter page identity.

D3-3 does not freeze historical-name reconstruction from old prose.

If no safe trusted title is available:

```text
no guessed title
```

A generic bounded historical header may be used by future implementation without exposing protected identity.

## 8. Minimum historical status grammar

Every body-bearing historical view requires fixed renderer-owned textual status equivalent to:

```text
Historical revision
```

It must remain perceivable near the title/body origin.

Optional revision reference display is presentation policy and subject to D3-2 metadata ALLOW.

The model does not author the historical-status wording.

## 9. No currentness implication from revision ordering

Higher revision number does not mean:

```text
truer
more settled
more official
safer
currently valid
```

Presentation must not visually encode revision ordinal as truth strength.

## 10. D3-2 surface dispositions are presentation inputs

Presentation is downstream from exact D3-2 current-operation-scoped disposition.

Canonical mapping:

```text
metadata ALLOW + body ALLOW
→ historical header/metadata + exact body may mount

metadata ALLOW + body DENY/HOLD
→ bounded historical metadata shell may mount
→ body must not mount

metadata DENY/HOLD
→ protected revision-specific metadata/body must not mount
```

Renderer must not re-decide policy.

## 11. Metadata-only shell

When metadata is ALLOW but body is not ALLOW, a future renderer may show a bounded non-semantic state such as:

```text
Historical revision
Content is not available in the current context.
```

The shell must not expose:

```text
hidden assertion count
hidden citation count
privacy reason
legal reason
withdrawal reason
protected target identity
body excerpt
semantic summary
```

Exact localized copy is presentation implementation authority, but reason privacy is mandatory.

## 12. Whole-body atomicity preserved

D3-2 body atomicity remains frozen:

```text
EXACT ADMITTED HISTORICAL BODY
OR
NO HISTORICAL BODY
```

Renderer may not remove denied assertions/citations and continue to label the result as exact `revisionRef`.

Partial/redacted historical artifacts require a future separate semantic identity/provenance design.

## 13. Historical document state labels

When an exact admitted historical body is disclosed, validator-owned reference states stored in that historical revision may be rendered as historical state labels.

Their meaning is explicitly historical:

```text
"R4 was committed with this public-reference state"
```

not:

```text
"this is the current public-reference state"
```

Historical presentation must not silently map an old reference state to a current state.

## 14. Current Status Companion selected seam

D3-3 selects an optional independent companion surface:

```text
CurrentPublicReferenceStatusCompanionV1
```

Purpose:

```text
show bounded CURRENT status next to history
without rewriting the historical artifact
```

Conceptual arrangement:

```text
Historical revision R4
  [exact historical body]

Current status
  [separately current-derived bounded state]
```

## 15. Companion authority independence

The companion must be derived from fresh current PUBLIC_KNOWLEDGE authority.

It may consume, as appropriate:

```text
current target authority
current source support
current Exposure
current settlement
current PK validation
current citation policy
```

Historical bytes/receipt are not current-status authority.

## 16. Companion failure isolation

If historical body is ALLOW but current companion cannot be produced:

```text
historical body may remain visible
current companion = unavailable/absent
```

The renderer must not:

```text
rewrite old body
hide historical body solely because current companion failed
reuse stale companion
```

unless an independent D3-2 disclosure decision says the historical body itself is not allowed.

## 17. Companion must not impersonate current page

The companion is bounded status context, not a second full current article mounted inside history by default.

First scope should prefer compact current semantic status over silently embedding `PUBLIC_REFERENCE_DOCUMENT_V1` wholesale.

Exact companion payload is detailed-design authority.

## 18. Historical compare first scope

D3-3 enables page-local compare between two exact committed historical revisions of the same durable page.

Conceptual request:

```text
HistoricalCompareRequestV1
  pageIdentity
  leftRevisionRef
  rightRevisionRef
```

The two refs must be exact and distinct or the result is a no-difference/no-op presentation case.

## 19. Compare eligibility

Semantic compare requires for BOTH exact inputs:

```text
same pageIdentity
active compatible lifetime
D2 committed membership valid
D3-1 historical admission valid
D3-2 metadata ALLOW
D3-2 body ALLOW
exact immutable historical body available
```

Unlike D2-3 current-inspection compare:

```text
current-truth support of each old body
is NOT required
```

That is the C7 capability D3 intentionally adds.

## 20. Compare is not a disclosure bypass

If either input body is DENY/HOLD:

```text
NO SEMANTIC DIFF BODY
```

Forbidden:

```text
body denied
→ compute diff anyway
→ reveal deleted/added sentence through diff
```

Compare output is at least as disclosure-sensitive as its inputs.

## 21. Compare permission scope

A compare operation must use fresh D3-2 compatible decisions for both pinned inputs.

An earlier open/read ALLOW must not become a durable compare permission.

```text
PAST READ ALLOW
!= CURRENT COMPARE LICENSE
```

## 22. Exact pinning

Both compare inputs are pinned at operation start.

```text
left = exact R4
right = exact R9
```

Head movement during compare does not silently replace either side.

`CURRENT` aliases, if future UI exposes them, must first resolve to an exact revisionRef before compare execution.

## 23. Compare semantic model

D3-3 inherits D2-3's structural non-identity discipline.

No durable assertion identity is invented.

First compare classifications remain conceptually:

```text
UNCHANGED_EXACT
LEFT_ONLY
RIGHT_ONLY
```

A changed sentence may appear as one LEFT_ONLY record plus one RIGHT_ONLY record.

## 24. No fuzzy lineage

Forbidden compare inference:

```text
same ordinal -> same assertion
similar text -> edited assertion
same section -> same assertion
embedding similarity -> lineage
```

D3-3 does not claim that a left record "became" a right record without future stable assertion identity.

## 25. Citation compare

If historical body disclosure includes historical citation semantics, compare may classify exact stored semantic citation tuples/attachments under the same non-identity discipline.

It must not infer stable cross-revision citation identity from:

```text
same citation slot
same URL-like text
same sourceLabel
same recordLabel
```

Stable Citation Identity remains a separate future capability.

## 26. Compare output is derived presentation

Historical diff output is:

```text
EPHEMERAL
READ_ONLY
DERIVED PRESENTATION
NONCANONICAL
NONPERSISTENT
```

It is not:

```text
new revision
new settlement
new historical artifact
new lineage graph
restore plan
model memory
```

## 27. Compare ordering

First compare should preserve deterministic source ordering within each exact revision and deterministic classification output.

It must not sort by:

```text
truth strength
controversy
citation prestige
semantic importance
model confidence
```

Exact ordering algorithm is detailed-design authority.

## 28. Compare bounds inherited

D2-5 hard bounds remain applicable.

D3-3 must not widen compare history or output budgets merely because historical C7 is open.

If compare exceeds frozen bounded output capacity:

```text
HOLD / compare unavailable
```

not:

```text
silently truncate semantic diff and present it as complete
```

## 29. Current companion in compare

First historical compare does not require a current-status companion for each side.

A single separately current-derived page-level companion may be shown adjacent to compare if product policy later chooses.

It must not alter left/right historical snapshots or diff classification.

## 30. Accessibility

Historical status must be textual and perceivable before or adjacent to the historical body.

Compare must expose left/right revision context in text, not color alone.

Added/removed distinction must not be color-only.

Screen-reader ordering must preserve clear side/diff semantics.

## 31. Source-scoped presentation

D3-3 remains under PUBLIC_KNOWLEDGE source-local presentation scope.

Historical CSS/DOM must not claim host-global selectors.

A future namespace may extend `sc-pk` with history-local descendants but must remain rooted under PUBLIC_KNOWLEDGE presentation ownership.

No global theme ownership is granted.

## 32. Cached DOM is not authority

A historical body or compare DOM cached from a prior ALLOW is not current disclosure authority.

On reload/remount/current policy change:

```text
fresh compatible D3-2 context required
```

If unavailable:

```text
stale body/diff must not remain mounted as current-authorized history
```

## 33. Feature-off dormancy

When PK-D3 is off:

```text
historical renderer work = 0
historical compare work = 0
current-status companion work = 0
historical provider reads = 0
```

Historical presentation does not become an every-turn background surface.

## 34. No prompt/model re-entry

Historical body, diff, companion, and presentation model do not automatically enter future model context.

C6 remains closed.

## 35. No delayed compare updates

D3-3 does not authorize an asynchronous job to mutate an already rendered historical compare after the fact.

C8 remains closed.

A new current operation may recompute the view under fresh policy.

## 36. No history analytics

D3-3 does not introduce:

```text
edit counts
editor identities
change frequency
revision popularity
most controversial revision
truth trajectory score
```

These are neither presentation necessities nor current/historical authority.

## 37. No automatic current fallback

If historical body is unavailable:

```text
show current article instead under historical chrome
```

is forbidden.

Likewise if current page is unavailable, the renderer must not silently replace it with the latest historical body.

Historical and current surfaces remain explicit and distinct.

## 38. First adversarial cases

### Case A: current correction, history allowed

```text
R4 authentic
R4 body D3-2 ALLOW
current status = corrected
```

Expected:

```text
historical R4 remains exact
optional companion may say current record corrected
no R4 rewrite
```

### Case B: metadata allowed, body denied

Expected:

```text
bounded metadata shell may render
body absent
no excerpt/count/reason leak
```

### Case C: compare left allowed, right denied

Expected:

```text
no semantic diff
no right body reconstruction through LEFT_ONLY/RIGHT_ONLY output
```

### Case D: both historical bodies allowed but current-truth support fails

Expected:

```text
historical compare permitted
because D3 C7 does not require current-truth support
```

### Case E: same ordinal, changed text

Expected:

```text
no identity claim
LEFT_ONLY old record
RIGHT_ONLY new record
```

### Case F: cached old ALLOW

Expected:

```text
fresh D3-2 context required
stale DOM not authority
```

## 39. Runtime prerequisites before any future implementation

A future implementation must prove at least:

```text
separate historical presentation kind
fixed textual historical status
D3-2 surface-gated mounts
whole-body atomicity
reason-private metadata-only shell
fresh current-status companion authority
both-sided compare authorization
exact revision pinning
non-fuzzy structural diff
D2-5 compare bounds
disclosure-safe cache teardown
feature-off dormancy
no C6 re-entry
no C8 delayed mutation
```

No runtime readiness is claimed here.

## 40. Recommended detailed design questions

D3-3 detailed design should freeze:

```text
HistoricalPublicReferencePresentationV1 exact field ownership
historical header/status grammar
metadata-only shell grammar
CurrentPublicReferenceStatusCompanionV1 minimum payload
companion state labels and failure behavior
HistoricalComparePresentationV1 read model
left/right/unchanged presentation ordering
citation compare presentation
accessibility requirements
cache/remount teardown rules
```

## 41. Non-goals / deferred

Deferred:

```text
restore/search/navigation integration             -> D3-4
receipt/presentation byte caps and convergence    -> D3-5
partial redacted historical artifact              -> future explicit expansion
global historical search                          -> future explicit expansion
stable assertion identity                         -> future explicit expansion
stable citation identity                          -> future explicit expansion
persistent compare artifact                       -> future explicit expansion
cross-conversation archive                         -> stronger future durability profile
```

## 42. Impact conclusion

D3-3 can be designed without opening C5, C6, or C8.

Selected minimum seam:

```text
AUTHENTIC HISTORICAL REVISION
+ FRESH D3-2 DISCLOSURE
→ EXPLICIT HISTORICAL PRESENTATION

TWO EXACT DISCLOSABLE HISTORICAL REVISIONS
→ BOUNDED NON-IDENTITY STRUCTURAL COMPARE
```

Canonical final rule:

```text
HISTORY MAY SURVIVE CURRENT TRUTH
BUT HISTORY MUST NEVER MASQUERADE AS CURRENT TRUTH
AND COMPARE MUST NEVER BECOME A DISCLOSURE BYPASS
```

Design only. Runtime and production remain unchanged.
