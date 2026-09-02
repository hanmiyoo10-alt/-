# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 D2-5 Lifetime / Bounds / Convergence Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **D2-5 IMPACT SCOPE FROZEN · DESIGN-ONLY · ACTIVE-LIFETIME BOUNDED HISTORY · NO ROLLING EVICTION V1 · CAP-REACHED HOLD · C1+C2+C3+C4 ONLY · C5-C8 CLOSED · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D2 · D2-5 · LIFETIME · BOUNDS · CONVERGENCE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D2-0 through D2-4 froze the first revisioned PUBLIC_KNOWLEDGE page contract. D2-5 scopes the final design checkpoint before PK-D2 may be declared design-converged.

This transaction authorizes no runtime store, cleanup worker, mutation engine, UI, prompt transport, model call, network call, release, or `release-simcore` change.

## 1. Final seam selected

Selected V1 retention profile:

```text
ACTIVE_LIFETIME_BOUNDED_HISTORY_NO_ROLLING_EVICTION_V1
```

Meaning:

```text
ACTIVE lifetime
→ retained committed revisions remain exact-addressable
→ no automatic oldest-revision eviction
→ hard-cap overflow blocks the new revision-producing operation

ENDED lifetime
→ page/revision durable use becomes logically inaccessible immediately
→ owner cleanup may physically reclaim head/revisions/anchors

UNKNOWN lifetime
→ fail closed
```

This profile is intentionally conservative.

## 2. Why no rolling eviction in V1

Automatic active-lifetime eviction would introduce new semantics around:

```text
old exact revision links becoming holes
previousRevisionRef crossing a deleted prefix
compare/restore targets disappearing during an active workflow
whether restoredFromRevisionRef may point to removed history
whether a user-visible revision list is complete or windowed
```

Those are not required for the first PK-D2 capability.

Therefore:

```text
CAP REACHED
→ HOLD NEW REVISION

not
→ DELETE OLDEST REVISION AND CONTINUE
```

A future compaction/rolling-retention profile requires separate design.

## 3. Hard-cap axes required

D2-5 detailed design must freeze concrete finite limits for at least:

```text
committed revisions per page
revision record bytes
aggregate retained revision bytes per page
citation records per revision
citation attachments per revision
revision-list entries
compare input/output size
restore source size
operation payload size where needed
```

All cap measurements must be deterministic and implementation-testable.

## 4. Overflow semantics

Overflow never silently truncates semantic revision content.

Required shape:

```text
candidate exceeds per-revision cap
→ reject / hold before commit

page would exceed aggregate retained-history cap
→ hold new revision-producing operation

revision count cap reached
→ hold new revision-producing operation
```

No cap overflow may:

```text
trim assertions
trim citations
rewrite visible labels
remove old committed revisions
advance head partially
```

## 5. Current head protection

The current head is always protected from retention cleanup while the page lifetime is ACTIVE.

More strongly, under selected V1 all committed active-lifetime revisions are protected from ordinary retention eviction.

Only uncommitted candidate residue may be reclaimed independently during ACTIVE lifetime.

## 6. Orphan cleanup remains separate

D2-1 uncommitted candidate residue is not revision history.

Therefore:

```text
uncommitted candidate cleanup
!= committed retention eviction
```

Owner cleanup may reclaim failed/orphan staging material without consuming revision-history semantics.

## 7. Lifetime inheritance

PK-D2 inherits PK-X1 trusted conversation lifetime.

```text
ACTIVE
ENDED
UNKNOWN
```

remain the relevant logical states.

No wall-clock TTL, turn-count guess, last-view time, or reload event may infer lifetime termination.

## 8. Scope generation non-reuse

The PK-X1 non-recyclable lifetime identity requirement remains authoritative.

An ENDED lifetime scope identity may not later be reused for a new conversation lifetime in a way that can resurrect old page/revision records.

## 9. Feature OFF and reload

Feature OFF does not end the conversation lifetime.

```text
feature OFF
→ no revision read/write/compare/restore/search integration work
→ current presentation removed
→ durable revision records may remain while lifetime is ACTIVE
```

Reload similarly does not imply lifetime end or automatic revision-history scan/remount.

## 10. Ended-lifetime cleanup

On trusted lifetime END:

```text
1. page/revision durable use becomes logically invalid immediately
2. current binding/presentation is removed
3. revision/head/support-anchor owner cleanup becomes eligible
4. physical cleanup may occur later
```

Physical deletion failure must not reactivate ENDED records.

## 11. Cleanup cannot repair corruption by guessing

Retention/cleanup may not silently choose a replacement head, reconstruct missing revisions, or select the newest-looking record.

Examples forbidden:

```text
head target missing
→ choose previous revision

head missing
→ choose largest revision number

corrupt duplicate record
→ keep newest timestamp
```

Integrity repair remains separate authority.

## 12. Revision list boundary

The ordinary page-local revision list may expose committed revision-store metadata only inside the active lifetime and finite admitted history.

It never lists:

```text
orphan candidates
failed operations
quarantined drafts
DENY/HOLD payloads
cleanup residue
```

Revision-list visibility does not grant old revision body visibility; D2-3/D2-4 inspection gates still apply.

## 13. Compare boundary

Compare remains derived and bounded.

Cap overflow must fail/hold the compare operation rather than emit a semantic partial diff that could be mistaken for complete comparison.

Any explicitly supported truncated compare presentation must be separately designed; V1 defaults to complete-bounded-or-no-result.

## 14. Restore boundary

Restore may target only an exact retained committed revision that passes D2-3/D2-4 current inspection/rebind gates.

A revision lost to future retention policy may not be reconstructed from transcript/cache/text similarity.

Selected V1 avoids this issue during ACTIVE lifetime by not rolling-evicting committed revisions.

## 15. Search boundary

PK-X2 remains page-level only.

D2-5 adds no revision index, revision search corpus, citation search, historical snippet search, or ranking input derived from revision count/history age.

## 16. C7 firewall

Retention does not create historical-display authority.

```text
revision bytes retained
!= old body may be displayed despite current support failure
```

That remains PK-D3 / C7 territory.

Conversely, deleting revision bytes after lifetime END is cleanup, not a claim that the old revision was false.

## 17. C5/C6/C8 remain closed

D2-5 adds no:

```text
cross-family derived lineage
model-context re-entry
late async attachment targeting
```

Revision/support anchors remain consumer-local PK-D2 ownership only.

## 18. Dormancy requirement

On ordinary/source-irrelevant turns with no active PK-D2 operation:

```text
revision history scan = 0
cleanup scan = 0
compare = 0
restore = 0
revision mutation = 0
citation rebind = 0
PK-X2 revision lookup = 0
model call added by PK-D2 = 0
network call added by PK-D2 = 0
```

Cleanup should be owner-event-driven or otherwise bounded, not an ordinary-turn full-history sweep.

## 19. Convergence audit questions

The detailed D2-5 transaction must answer:

```text
A. Are all durable semantics consumer-specific rather than generic Candidate C state?
B. Does every mutation preserve expected-revision/currentness safety?
C. Can old revision bytes become visible without current inspection/rebind?  MUST BE NO
D. Does revision storage enter future model context?                  MUST BE NO
E. Can search discover historical body/citation state?                MUST BE NO
F. Can active retention silently rewrite history?                     MUST BE NO
G. Are all resource surfaces finite?                                  MUST BE YES
H. Does production remain untouched?                                  MUST BE YES
```

## 20. Candidate C target verdict

Expected final D2-5 verdict, subject to detailed audit:

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 semantic mutation          = YES
C4 append / merge pressure    = YES

C5 derived lineage            = NO
C6 model-context re-entry     = NO
C7 historical survival        = NO
C8 delayed effect targeting   = NO
```

## 21. Deferred stronger profiles

Explicitly deferred:

```text
rolling revision eviction
revision compaction/squash
persistent global history
historical body display despite current support loss
stable citation identity/history
revision search/index
cross-conversation revision persistence
model-context revision memory
async media/effect attachment to revision
branching / multi-head / CRDT
```

Any such requirement reopens the corresponding design boundary before authorization.

## 22. Transaction classification

```text
DESIGN-ONLY
DOCS-ONLY
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
RELEASE = NOT AUTHORIZED
release-simcore = MUST REMAIN UNCHANGED
```
