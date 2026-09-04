# SimCore v0.70.5 Manual Edit Commit Boundary Attribution — Impact Scope

Date: 2026-09-04 KST
Status: **IMPACT SCOPE FROZEN · DESIGN-ONLY · NO RUNTIME MUTATION · IMPLEMENTATION BLOCKED ON v0.70.4 LIVE CLOSE**
Classification: **SIMCORE · PERFORMANCE OBSERVABILITY MINI · GENUINE MANUAL EDIT · STORE COMMIT BOUNDARY**

## 1. Current authority

Fresh repository readback at design start:

```text
main = 56dc28d1ece7583e78819737418fe97c53728c05
production branch = release-simcore
production commit = df282f18a0035b03be30af8d0ee2174f58b3bcd3
production version = 0.70.4
production release = Manual Edit Rebuild Attribution
validation = PENDING_REAL_LONG_CHAT
live gate = 07004_MANUAL_EDIT_REBUILD_ATTRIBUTION_REAL_LONG_CHAT
```

This scope does not alter current release state or current priority.

## 2. Triggering evidence

Operator-provided v0.70.4 long-chat evidence contains one genuine manual edit:

```text
Edit origin: USER_EDIT_CANDIDATE
Edit reconcile: MANUAL_EDIT_REBUILT · 39.452 s
snapshot UPDATED

Manual edit breakdown:
classify 0.0 ms
prepare 1.0 ms
recovery 0.0 ms
finalize 1.0 ms
commit 37.601 s
other 1.847 s
confidence BOUNDED
```

The measured `commit` bucket accounts for approximately 95.3% of the full rebuild time.

The same turn preserves correctness:

```text
Stability PASS
binding BOUND
mirror COMMITTED
stale 0
Warnings 0
CANONICAL↔FRESH EXACT
Continuity PASS
Frame sequence PASS
Frame guard PASS
```

This is sufficient to justify narrower attribution. It is not sufficient to select a behavioral optimization because `commit` is still an aggregate boundary.

## 3. Exact current source flow

Current v0.70.4 source maps the genuine edit path as:

```text
visible prior assistant changed by user
→ USER_EDIT_CANDIDATE
→ reconcileSessionEditedOutput(...)
→ rebuilt state prepared/finalized
→ session.store.save('out', outIndex, result.state, { metric: saveMetric })
→ snapshot/current pointers updated
→ MANUAL_EDIT_REBUILT
```

The current `SnapshotStore.save()` already measures three distinct phases when a metric object is supplied:

```text
serializeMs
= JSON.stringify(state)

setMs
= await backend.set(key, payload)

pruneMs
= await _prune()
```

v0.70.4 currently computes:

```text
commitMs = serializeMs + setMs + pruneMs
```

and exposes only the aggregate `commitMs` in the manual-edit diagnostic.

Therefore the missing information is not a missing timer. It is a missing projection of already-owned bounded metrics.

## 4. Ownership / effect map

```text
User-visible hand edit
  ↓
Representation / Edit Reconcile classification
  ↓
Edit Reconcile genuine rebuild
  ↓
SnapshotStore.save existing metric object
  ├─ serializeMs
  ├─ setMs
  └─ pruneMs
  ↓
Edit Reconcile manualEditAttribution
  ↓
Last Turn Diagnostic projection
```

Selected owner boundary:

```text
Store owns measurement
Edit Reconcile owns genuine-edit attribution composition
Diagnostic layer owns bounded rendering
```

No new owner is required.

## 5. Candidate change surface

Expected narrow implementation surface, subject to fresh preflight:

1. `edit-reconcile`
   - preserve current `saveMetric` object and aggregate `commitMs`;
   - carry existing `serializeMs`, `setMs`, and `pruneMs` into `manualEditAttribution` as bounded scalar metadata;
   - no change to edit decisions, snapshot update semantics, or Store call options.

2. diagnostic projection/rendering
   - expose a second manual-edit-only line such as:

```text
Manual edit commit: serialize <ms|n/a> · set <ms|n/a> · prune <ms|n/a> · total <ms|n/a> · confidence <EXACT|BOUNDED>
```

3. deterministic builder/tests
   - assert existing Store measurement anchors are reused;
   - assert no added Store call, key scan, timer, network call, host chat call, history scan, require edge, or persistent schema field.

## 6. Explicitly unchanged surface

The following are frozen:

```text
SnapshotStore.save behavior
backend.set invocation count
_prune invocation policy
retention keep policy
manual edit USER_EDIT_CANDIDATE decision
MANUAL_EDIT_REBUILT fallback
snapshot UPDATED semantics
REPRESENTATION_FAST_RECONCILED behavior
ordinary SAME_FAST behavior
Deferred Mirror
Frame / Time / Broadcast / Community / Evidence / Lineage / Handoff / Recurrence
runtime-cache/provider-cache behavior
persistent state/schema
```

## 7. Non-goals

This packet must not:

- set `prune:false` on manual-edit saves;
- defer or skip manual-edit persistence;
- replace `backend.set`;
- batch, queue, retry, parallelize, or detach Store writes;
- change retention policy;
- add key caching or key enumeration shortcuts;
- change raw-body retention;
- optimize based on the single 37.601 s aggregate commit sample;
- merge the separate TURN_STORAGE / OUT_STORAGE watch into this lane;
- resume provider cache work.

## 8. Why optimization remains HOLD

The current aggregate `commit` bucket contains three semantically different boundaries:

```text
local serialization
external/backend write await
retention scan/removal housekeeping
```

Those boundaries imply different repairs and different risk profiles.

Therefore:

```text
commit dominates
≠ backend.set proven dominant
≠ prune proven dominant
≠ serialization proven dominant
```

RCR-D03/RCR-D04 require one more attribution step before optimization.

## 9. Cache program disposition

The historical cache program remains preserved and deferred.

If v0.70.5 is consumed by this mini before cache runtime resumes:

```text
future cache runtime identity >= 0.70.6
```

No provider cache claim changes; provider cache remains `UNVERIFIED`.

## 10. Frozen impact decision

```text
NEXT NARROW OWNER = existing manual-edit Store commit metrics
NEW TIMER REQUIRED = NO
STORE SEMANTICS CHANGE = NO
OPTIMIZATION = HOLD
CANDIDATE VERSION = 0.70.5
WORKING NAME = Manual Edit Commit Boundary Attribution
IMPLEMENTATION = BLOCKED ON v0.70.4 HUMAN LIVE CLOSE + fresh source preflight
```
