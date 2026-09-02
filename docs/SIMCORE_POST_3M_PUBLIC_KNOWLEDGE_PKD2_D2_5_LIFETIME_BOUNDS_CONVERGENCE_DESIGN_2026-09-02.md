# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 D2-5 Lifetime / Bounds / Convergence Design — 2026-09-02

Date: 2026-09-02 KST

Status: **D2-5 DESIGN FROZEN · PK-D2 DESIGN CONVERGED · ACTIVE-LIFETIME BOUNDED HISTORY · NO ROLLING EVICTION V1 · CONCRETE FINITE HARD CAPS · C1+C2+C3+C4 ONLY · C5-C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D2 · D2-5 · LIFETIME · BOUNDS · RETENTION · CONVERGENCE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D2-0 through D2-4 froze the first PUBLIC_KNOWLEDGE revisioned-page architecture:

```text
D2-0  revisioned-page master
D2-1  immutable revision record + authoritative current head
D2-2  mutation operation + commit safety
D2-3  revision read + compare + copy-forward restore
D2-4  settlement + citation + PK-X2 integration
```

D2-5 freezes the final missing resource/lifetime contract and performs the complete Candidate C convergence audit.

This document authorizes no runtime implementation, storage migration, cleanup worker, prompt change, model call, network call, DOM/CSS, release, or `release-simcore` mutation.

## 1. Final capability profile

PK-D2 converges on:

```text
PK-D2 REVISIONED_PAGE V1

same durable PUBLIC_KNOWLEDGE pageIdentity
+ one authoritative mutable current-head locator
+ bounded immutable committed semantic revisions
+ explicit validated revision-producing operations
+ exact old-revision inspection under current policy
+ bounded structural compare
+ copy-forward revalidated restore
+ current settlement/citation reauthorization
```

Candidate C profile:

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 semantic mutation          = YES
C4 append / merge pressure    = YES

C5 derived-to-derived lineage = NO
C6 model-context re-entry     = NO
C7 historical survival        = NO
C8 delayed effect targeting   = NO
```

No generic Candidate C ledger/store is activated.

## 2. Retention profile

Selected first profile:

```text
ACTIVE_LIFETIME_BOUNDED_HISTORY_NO_ROLLING_EVICTION_V1
```

Canonical behavior:

```text
ACTIVE lifetime
+ history below all caps
→ revision operations may proceed subject to D2-0..D2-4

ACTIVE lifetime
+ next commit would exceed any durable-history cap
→ HOLD new revision-producing operation
→ current head unchanged
→ existing committed history unchanged

ENDED lifetime
→ ordinary durable revision use immediately invalid
→ physical owner cleanup eligible

UNKNOWN lifetime
→ fail closed
```

## 3. Why active rolling eviction is rejected

V1 does not automatically delete the oldest committed revision to make room.

Rejected behavior:

```text
R1 ... R64 retained
new mutation arrives
→ delete R1
→ commit R65
```

Reason: active-lifetime eviction creates additional product semantics for:

```text
exact old-revision links
revision-list completeness
previousRevisionRef gaps
restoredFromRevisionRef gaps
compare targets disappearing
restore targets disappearing
concurrent inspection versus cleanup
```

Those are not required for V1.

Therefore:

```text
CAP EXHAUSTION
= BACKPRESSURE
!= HISTORY REWRITE
```

## 4. Concrete hard caps

D2-5 freezes these V1 limits:

```text
MAX_COMMITTED_REVISIONS_PER_PAGE             = 64
MAX_REVISION_RECORD_LOGICAL_BYTES            = 65,536
MAX_RETAINED_REVISION_LOGICAL_BYTES_PER_PAGE = 4,194,304

MAX_SECTIONS_PER_REVISION                    = 16
MAX_ASSERTIONS_PER_REVISION                  = 128
MAX_CITATION_RECORDS_PER_REVISION            = 64
MAX_CITATION_ATTACHMENTS_PER_REVISION        = 128

MAX_REVISION_REF_UTF8_BYTES                  = 128
MAX_REVISION_SUPPORT_ANCHOR_REF_UTF8_BYTES   = 256

MAX_REVISION_LIST_ENTRIES                    = 64

MAX_MUTATION_REQUEST_LOGICAL_BYTES           = 65,536
MAX_RESTORE_SOURCE_LOGICAL_BYTES             = 65,536

MAX_COMPARE_DIFF_ENTRIES                     = 768
MAX_COMPARE_OUTPUT_LOGICAL_BYTES             = 131,072
```

These are product-profile design limits, not storage-engine sizing recommendations.

## 5. Why these caps are intentionally small

V1 is an active-conversation revision capability, not an unlimited wiki archive.

The limits are chosen so the whole admissible page history remains small enough for:

```text
bounded owner operations
bounded exact revision listing
bounded inspection
bounded compare
bounded restore source retrieval
bounded cleanup
```

A product requirement exceeding these limits must select a later profile rather than silently relaxing V1.

## 6. Logical byte measurement

Storage-backend byte size is not used as semantic authority because replication, indexes, encryption, compression, and backend framing vary.

D2-5 freezes a conceptual deterministic measurement domain:

```text
D2LogicalRecordEncodingV1
```

For cap enforcement, the future runtime must produce a deterministic canonical UTF-8 encoding of the logical record/request/output fields owned by the relevant contract.

Required properties:

```text
same logical value → same byte sequence
object-field order deterministic
array order preserved exactly
no insignificant whitespace
strings encoded as exact validated Unicode values
backend-only metadata excluded
```

The physical persistence encoding may differ.

A future runtime implementation may not claim D2-5 cap compliance until this canonical budget encoding is frozen in executable schema/tests.

## 7. Revision-record byte cap

Every candidate committed revision must satisfy:

```text
logicalRevisionBytes <= 65,536
```

The measured logical revision includes all durable PK-D2-owned fields, including:

```text
revision metadata
validated document sections/assertions
bounded stored visible settlement state
revision-local citation records
citation attachments
revision support anchors
restore provenance when present
```

It excludes:

```text
backend row keys/indexes
replication overhead
DOM/CSS
host transcript
uncommitted drafts
private validator inputs
quarantine payloads
```

Overflow:

```text
HOLD_REVISION_RECORD_LIMIT_EXCEEDED
→ no revision commit
→ no head advance
```

No truncation is permitted.

## 8. Aggregate page-history byte cap

For retained committed revisions of one active page:

```text
sum(logicalRevisionBytes) <= 4,194,304
```

A new candidate must be checked against the post-commit aggregate before admission.

If the candidate would exceed the aggregate:

```text
HOLD_PAGE_HISTORY_BYTES_LIMIT_EXCEEDED
```

V1 does not delete old committed revisions to make room.

## 9. Revision-count cap

At most:

```text
64 committed revisions
```

may be retained for one page in one active lifetime under V1.

When count is already 64:

```text
revision-producing operation
→ HOLD_REVISION_COUNT_LIMIT_REACHED
```

Read/list/compare/restore-inspection of already retained revisions may continue subject to their own gates, but restore cannot commit a 65th revision.

## 10. Section/assertion caps

Every committed revision is additionally bounded by:

```text
sections   <= 16
assertions <= 128
```

These are PK-D2 persistence-profile caps even if an upstream transient PK document profile later supports larger current snapshots.

A transient document larger than this may remain a transient/current feature but cannot enter PK-D2 V1 history without a separately authorized profile.

No assertion is silently dropped to fit the cap.

## 11. Citation caps

D2-4 durable citation semantics are bounded per revision:

```text
citation records     <= 64
citation attachments <= 128
```

An attachment is one revision-local assertion↔citation-role relationship.

Overflow is fail/hold before commit.

Forbidden:

```text
keep first 64 citations and drop the rest
keep one citation per assertion
strip correction/contest citations to save space
```

Such transformations change semantic provenance.

## 12. Reference-size caps

Opaque PK-D2 references are bounded:

```text
revisionRef                 <= 128 UTF-8 bytes
revision support anchor ref <= 256 UTF-8 bytes
```

Exact byte equality remains the identity relation.

No truncation, case folding, hashing by presentation code, or fuzzy comparison is authorized as an overflow workaround.

A backend may internally map longer upstream identifiers to bounded opaque owner refs only if the mapping itself is trusted, exact, collision-safe, and separately implemented/tested.

## 13. Mutation request cap

Before materializing the full next candidate, one PK-D2 operation request must satisfy:

```text
logicalMutationRequestBytes <= 65,536
```

This cap covers operation-kind-specific semantic intent and exact target addresses.

It does not authorize raw model drafts or hidden context to be stored as operation input.

Oversized requests fail before semantic mutation construction.

## 14. Restore source cap

A restore source must be an exact retained committed revision and therefore already satisfy the revision-record cap.

The explicit restore-source admission cap is:

```text
MAX_RESTORE_SOURCE_LOGICAL_BYTES = 65,536
```

No transcript/cache reconstruction is allowed when the exact revision exceeds/violates schema expectations.

## 15. Revision-list cap

Because the whole retained V1 history is at most 64 committed revisions:

```text
MAX_REVISION_LIST_ENTRIES = 64
```

The ordinary page-local list may return the complete committed retained set in deterministic revision-owner order.

V1 therefore requires no pagination/cursor semantics.

If corruption yields more than 64 committed memberships:

```text
INVALID_REVISION_HISTORY_LIMIT_CORRUPTION
```

The list must not expose an arbitrary first 64 and pretend completeness.

## 16. Revision-list metadata remains nonsemantic

The revision list may expose bounded store metadata such as:

```text
revisionRef
operationKind
previousRevisionRef
restoredFromRevisionRef?
trusted display timestamp? only if a time owner exists
```

It does not expose body content merely because metadata is listable.

D2-3/D2-4 body inspection gates remain mandatory.

## 17. Compare caps

Compare accepts two exact committed revisions that individually pass D2-3/D2-4 inspection eligibility.

The derived comparison result must satisfy:

```text
diff entries <= 768
logical compare output bytes <= 131,072
```

The entry cap is intentionally above the maximum ordinary structural units implied by the V1 section/assertion/citation/attachment caps for two revisions.

If a valid future schema extension could exceed this shape, compare must hold until its bounds are revised.

## 18. Compare overflow is not partial compare

V1 default:

```text
complete bounded structural diff
OR
no semantic diff result
```

If output would exceed either compare cap:

```text
HOLD_COMPARE_LIMIT_EXCEEDED
```

Forbidden:

```text
show first 768 changes
→ imply comparison complete
```

A future explicitly truncated compare UI would require its own completeness signaling contract.

## 19. No fuzzy compare expansion

D2-3 remains authoritative:

```text
UNCHANGED_EXACT
LEFT_ONLY
RIGHT_ONLY
```

D2-5 caps do not authorize:

```text
semantic similarity
embedding match
same ordinal => same assertion
edit-pair inference
citation lineage inference
```

Resource pressure may never be used as a reason to switch to fuzzy matching.

## 20. Active lifetime ownership

PK-D2 inherits the trusted PK-X1 conversation lifetime:

```text
ACTIVE
ENDED
UNKNOWN
```

Only ACTIVE permits ordinary revision operations.

No TTL/turn-count heuristic may upgrade UNKNOWN to ACTIVE or downgrade ACTIVE to ENDED.

## 21. Non-recyclable lifetime identity

The PX1-4 invariant remains mandatory:

```text
ENDED lifetimeScopeRef generation
must never later identify a new logical conversation lifetime
```

This prevents physical cleanup residue from becoming live PK-D2 history in a later conversation.

## 22. Feature OFF

Feature OFF is vertical closure, not lifetime termination.

```text
feature OFF
→ current revision UI removed
→ current PK-D2 operation authority absent
→ revision reads/writes/compare/restore = 0
→ no background revision scan
→ durable history may remain while lifetime ACTIVE
```

Re-enable does not auto-open the last revision or auto-run restore/compare.

Normal current activation must resolve page/head again.

## 23. Reload

Reload similarly does not end the lifetime and does not authorize history reconstruction.

```text
reload
→ ephemeral current binding/presentation gone
→ durable page/revisions may remain
→ no automatic history scan/remount/model re-entry
```

An explicit later page/revision action must reacquire current authority.

## 24. Trusted lifetime END ordering

On trusted END:

```text
1. mark lifetime logically ENDED for durable-use policy
2. reject new read/write/compare/restore/search-integrated revision jobs
3. remove current presentation/bindings
4. make head/revision/support-anchor storage eligible for owner cleanup
5. perform physical cleanup when available
```

Logical invalidation does not wait for physical deletion.

## 25. Physical cleanup failure

Canonical rule:

```text
PHYSICAL DELETE FAILED
!= lifetime ACTIVE
!= revision usable
```

Old rows may remain as inert residue but ordinary resolve/read/list/compare/restore paths must reject them under ENDED lifetime.

## 26. Cleanup scope

Ended-lifetime cleanup may reclaim PK-D2-owned durable material for that exact lifetime/page namespace:

```text
current-head record
committed revision records
revision membership/index data
revision support-anchor mappings owned by PK-D2
uncommitted staging residue
```

Cleanup must not delete unrelated source/evidence authority stores merely because a PK-D2 revision referenced them.

## 27. Uncommitted residue cleanup

Uncommitted candidate/staging bytes are not history.

They may be reclaimed under bounded owner policy while lifetime is ACTIVE when they are provably not committed and cannot still win an admitted operation.

This does not consume revision retention capacity.

Canonical separation:

```text
ORPHAN/STAGING GC
!= COMMITTED HISTORY EVICTION
```

## 28. Cleanup cannot infer repair

Cleanup has no authority to repair semantic corruption by guessing.

Forbidden:

```text
head missing → choose latest revision
head target missing → choose predecessor
more than 64 memberships → delete oldest until valid
broken support anchor → drop citation and keep body
```

Such states are integrity failures requiring explicit repair design/tooling.

## 29. Current-head protection

While ACTIVE:

```text
current head
+ every committed V1 revision membership
```

is protected from ordinary retention eviction.

A future physical compactor may rewrite representation only if exact semantic revision identity and content remain unchanged. That is not history eviction.

## 30. No automatic squash

V1 does not squash:

```text
R1 -> R2 -> ... -> R20
```

into:

```text
R1 + R20 only
```

or renumber surviving revisions.

Squash/compaction that changes addressable history is a new profile.

## 31. Revision reference non-reuse

A revisionRef belonging to a committed revision is never reused for another semantic revision inside the same active lifetime.

After lifetime END, any future reuse across a new lifetime is safe only because page/lifetime identity also changes according to the non-recyclable lifetime contract.

A stale exact reference must not accidentally resolve to new semantic content.

## 32. Search integration remains bounded and page-level

PK-X2 remains:

```text
query
→ current discoverable pageIdentity
→ user selection
→ current head resolution
→ current D2-4 revalidation
```

D2-5 does not add:

```text
revision index
revision full-text search
citation history search
revision-count ranking
revision-age ranking
historical snippets
```

## 33. Search does not consume history cap by reading

Search/navigation/read/current support checks do not create revisions.

Therefore repeated search/open operations cannot exhaust the revision-count cap.

Only explicit successful revision-producing operations consume committed history capacity.

## 34. Read/inspection does not renew retention

V1 has no LRU/last-view retention semantics.

Reading R4 does not make it newer, pin it separately, or alter cleanup priority.

All active-lifetime committed revisions share the same no-rolling-eviction protection.

## 35. Retention does not create C7

The presence of stored old revisions means only:

```text
exact committed semantic state is retained for bounded PK-D2 use
```

It does not mean:

```text
show this historical state even when current support no longer authorizes it
```

D2-3/D2-4 current inspection/rebind remains mandatory.

Requirement to bypass that gate activates:

```text
PK-D3 HISTORICAL_PAGE
+ C7
```

## 36. Cleanup does not erase historical truth

Conversely, physical cleanup after lifetime END is storage lifecycle behavior.

It does not assert that a deleted revision was false, invalid at its commit time, or never existed.

PK-D2 has no cross-lifetime historical archive promise.

## 37. C5 audit

Question:

```text
Does any PK-D2 revision derive semantic authority from another derived family object?
```

Answer:

```text
NO
```

Same-page `previousRevisionRef` and `restoredFromRevisionRef` are revision-generation metadata, not BOARD→NEWS or source-family derived lineage.

D2-4 revision support anchors bind current upstream support relationships; they do not make another derived projection the parent authority.

C5 remains CLOSED.

## 38. C6 audit

Question:

```text
Does durable revision history automatically enter a future model prompt/context?
```

Answer:

```text
NO
```

Forbidden automatic re-entry:

```text
old revision body
revision list
compare diff
restore source
citation history
page mutation history
```

A model may receive current operation-specific bounded inputs only under a separately admitted current semantic-generation path; durable history itself is not background memory.

C6 remains CLOSED.

## 39. C7 audit

Question:

```text
May an old revision remain semantically displayable solely because it was valid when committed?
```

Answer:

```text
NO
```

Current inspection/rebind is always required.

C7 remains CLOSED.

## 40. C8 audit

Question:

```text
May a late async effect attach to an exact old/new revision after the originating operation is gone?
```

Answer:

```text
NO
```

No image/media/network callback or delayed semantic result may mutate a revision merely by carrying a revisionRef.

C8 remains CLOSED.

## 41. C3 audit

PK-D2 explicitly consumes C3 because the same durable page may receive a new semantic state through admitted operations.

Safety remains:

```text
old revision immutable
new complete candidate
current validation
expectedRevision/currentness check
atomic admission + head advance
```

No in-place revision mutation exists.

## 42. C4 audit

PK-D2 explicitly consumes C4 because append/remove/edit/restore produces new generations inside the same durable page.

However C4 is scoped narrowly:

```text
single page
linear single head
one new complete snapshot per accepted operation
no branch merge
no partial descendant survival after history rewrite
```

No generic merge graph is created.

## 43. Checkpoint audit: D2-0

D2-0 invariants preserved:

```text
linear single-head chain        YES
full validated snapshot         YES
head != truth authority         YES
explicit revision operations    YES
restore is copy-forward         YES
C7 firewall                     YES
```

D2-5 adds finite resource ceilings without changing those semantics.

## 44. Checkpoint audit: D2-1

D2-1 invariants preserved:

```text
committed membership != head status
revision immutable after commit
head owner authoritative
bootstrap atomic
head advance atomic
uncommitted residue inert
```

D2-5 cleanup does not infer committed membership from physical presence.

## 45. Checkpoint audit: D2-2

D2-2 invariants preserved:

```text
explicit operation footprint
validator-owned fields re-derived
semantic no-op creates no revision
expectedRevision checked before/at commit
outside-footprint reconciliation rejected
unknown commit outcome resolved authoritatively
```

Cap failures occur before durable admission and never create semantic partial revisions.

## 46. Checkpoint audit: D2-3

D2-3 invariants preserved:

```text
revision metadata listing != body authority
old body whole-revision-or-none
compare exact structural/non-identity
restore exact seed + current revalidation
restore creates new head revision
```

D2-5 compare/list limits never silently produce partial semantic claims.

## 47. Checkpoint audit: D2-4

D2-4 invariants preserved:

```text
stored settlement != current settlement authority
citationRef not stable bibliographic identity
revision support anchor not truth authority
old citation surface requires current reauthorization
PK-X2 remains page-level
```

Resource cleanup of PK-D2-owned anchor mappings cannot delete or rewrite upstream Evidence authority.

## 48. Ordinary-turn dormancy

When no current PK-D2 operation/inspection is authorized:

```text
revision store read       = 0 required by PK-D2
revision store write      = 0
revision list scan        = 0
compare                   = 0
restore                   = 0
mutation candidate        = 0
citation rebind           = 0
history retention scan    = 0
background model call     = 0
background network call   = 0
```

Owner-event cleanup at trusted lifetime END is not an ordinary-turn history scan.

## 49. Failure classes

Conceptual bounded D2-5 result classes include:

```text
HOLD_REVISION_COUNT_LIMIT_REACHED
HOLD_REVISION_RECORD_LIMIT_EXCEEDED
HOLD_PAGE_HISTORY_BYTES_LIMIT_EXCEEDED
HOLD_REVISION_STRUCTURE_LIMIT_EXCEEDED
HOLD_REVISION_CITATION_LIMIT_EXCEEDED
INVALID_REVISION_REF_TOO_LARGE
INVALID_REVISION_SUPPORT_ANCHOR_TOO_LARGE
INVALID_MUTATION_REQUEST_TOO_LARGE
HOLD_COMPARE_LIMIT_EXCEEDED
INVALID_REVISION_HISTORY_LIMIT_CORRUPTION
HOLD_LIFETIME_UNKNOWN
INVALID_LIFETIME_ENDED
```

Exact runtime enum spellings remain implementation work.

None of these states permits semantic truncation or old-revision fallback.

## 50. No hidden user-data oracle from caps

Ordinary UI should expose only information necessary to explain the current operation outcome.

It must not expose private/quarantined cardinalities through cap diagnostics.

Examples forbidden:

```text
"17 hidden assertions caused the revision to exceed the cap"
"3 protected citations were omitted"
```

A safe generic operation-limit message may be rendered without revealing hidden internal counts.

## 51. Runtime prerequisites remain unproven

Design convergence is not runtime readiness.

Future implementation must still prove at least:

```text
trusted non-recyclable lifetime identity
stable page/target identity
revision owner storage authority
atomic committed membership + head advance
expectedRevision concurrency safety
canonical logical-byte budget encoder
all hard-cap enforcement before commit
orphan/staging cleanup isolation
current support / Exposure / settlement / citation revalidation
whole-revision old-body withholding
bounded compare completeness
copy-forward restore
feature-off / reload dormancy
ended-lifetime logical invalidation
ended-lifetime cleanup failure isolation
ordinary-turn zero-cost dormancy
```

## 52. Runtime state language

After D2-5:

```text
PK-D2 DESIGN       = CONVERGED
PK-D2 IMPLEMENTED  = NO
PK-D2 VALIDATED    = NO
PK-D2 RELEASED     = NO
```

No design merge may be described as deployed production behavior.

## 53. Final Candidate C verdict

Final PK-D2 capability usage:

```text
C1 = ACTIVE / REQUIRED BY DESIGN
C2 = ACTIVE / REQUIRED BY DESIGN
C3 = ACTIVE / REQUIRED BY DESIGN
C4 = ACTIVE / REQUIRED BY DESIGN

C5 = CLOSED
C6 = CLOSED
C7 = CLOSED
C8 = CLOSED
```

This is a consumer-specific minimal activation, not generic Candidate C activation.

## 54. Explicit future escalation triggers

Reopen design before authorizing any of:

```text
more than 64 active-lifetime committed revisions
rolling eviction while lifetime ACTIVE
revision pagination/cursor across evicted history
history compaction/squash changing addressable revisions
cross-conversation durable revision archive
old-body display after current support loss
revision full-text/global search
stable citation identity/history
revision branching or multi-head merge
model-context history re-entry
late async media/effect attachment to revision
cross-family derived-to-derived revision ancestry
```

Mapped boundaries:

```text
historical survival        → PK-D3 / C7
context re-entry           → C6
cross-family lineage       → C5
late async attachment      → C8
branching/merge expansion  → new C4 profile
rolling retention          → new PK-D2 retention profile
stable citation identity   → separate citation-identity design
```

## 55. Program closure

The PK-D2 design sequence is now:

```text
PK-D2 Impact Scope                        ✅
D2-0 Revisioned Page Master              ✅
D2-1 Revision Record / Current Head      ✅
D2-2 Mutation Operation / Commit Safety  ✅
D2-3 Revision Read / Compare / Restore   ✅
D2-4 Settlement / Citation / Search      ✅
D2-5 Lifetime / Bounds / Convergence     ✅

PK-D2 DESIGN PROGRAM = CONVERGED
NEXT AUTOMATIC D2 CHECKPOINT = NONE
```

A future checkpoint exists only when a concrete stronger product requirement is selected.

## 56. Transaction classification

```text
DESIGN-ONLY
DOCS-ONLY
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
RELEASE = NOT AUTHORIZED
PRODUCTION BRANCH = MUST REMAIN UNCHANGED
```
