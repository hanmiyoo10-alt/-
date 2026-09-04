# SimCore v0.70.6 Manual Edit Redundant Prune Elision — Impact Scope

Date: 2026-09-04 KST
Status: **IMPACT SCOPE FROZEN · DESIGN-ONLY · NO RUNTIME MUTATION · IMPLEMENTATION BLOCKED ON v0.70.5 HUMAN LIVE CLOSE**
Classification: **SIMCORE · PERFORMANCE MINI · GENUINE MANUAL EDIT · RETENTION HOUSEKEEPING ELISION**

## 1. Current authority

Fresh repository readback at design start:

```text
main = 70d71bf11c640652775963e49355aff5d088730c
production branch = release-simcore
production commit = 4374bef29e28804750c05115258cc80f055a26f7
production version = 0.70.5
production release = Manual Edit Commit Boundary Attribution
validation = PENDING_REAL_LONG_CHAT
live gate = 07005_MANUAL_EDIT_COMMIT_BOUNDARY_ATTRIBUTION_REAL_LONG_CHAT
```

Current repository live evidence remains `HUMAN_EVIDENCE · PARTIAL · LIVE_GATE HOLD` until terminal evidence is recorded through the owning close path.

This packet reserves and scopes a possible next patch only. It does not alter current release state, production, live-gate status, release authority, or machine-managed development state.

## 2. Triggering evidence

v0.70.5 was explicitly designed to allow a later behavioral optimization only after a Store commit subphase became sufficiently isolated.

The frozen v0.70.5 threshold permits a separate optimization design when:

```text
the same commit subphase dominates >= 2 independent genuine-edit long-chat samples
OR
one commit subphase is overwhelmingly dominant in a live sample
AND exact deterministic source/fixture evidence proves that named boundary is the measured owner
```

Repository-recorded v0.70.5 partial evidence already contains one decomposition sample:

```text
serialize = 0.0 ms
set = 1.009 s
prune = 1.518 s
total = 2.527 s
prune share ~= 60.1%
```

That sample alone was correctly classified as insufficient for optimization.

The current operator workstream then supplied a genuine positive-control sample with the complete manual-edit identity:

```text
Edit origin = USER_EDIT_CANDIDATE
Edit reconcile = MANUAL_EDIT_REBUILT · 41.912 s
snapshot = UPDATED

Manual edit commit:
serialize = 0.0 ms
set = 488.0 ms
prune = 37.244 s
total = 37.732 s
confidence = EXACT
```

Derived bounded ratios:

```text
prune / commit ~= 98.7%
prune / full rebuild ~= 88.9%
commit / full rebuild ~= 90.0%
```

The same turn preserved:

```text
Stability PASS
binding BOUND
output COMMITTED
mirror COMMITTED
stale 0
Warnings 0
Continuity PASS
Frame sequence PASS
Frame guard PASS
```

This evidence is sufficient to justify a separate optimization design transaction. It does not by itself close the current v0.70.5 human live gate or authorize implementation.

## 3. Exact current source facts

Current v0.70.5 Store key identity is deterministic:

```text
_k(phase, index) = `${prefix}:${phase}:${index}`
```

`SnapshotStore.load('out', outIndex)` reads that exact phase/index key. `SnapshotStore.save('out', outIndex, ...)` writes the same exact key through `backend.set`.

Current `SnapshotStore.save()` performs:

```text
serialize
→ backend.set(same derived key)
→ if opts.prune !== false:
     await _prune()
```

Current genuine manual-edit rebuild performs conceptually:

```text
load saved out snapshot for outIndex
→ classify / prepare / finalize rebuilt state
→ save('out', outIndex, rebuiltState, current options)
→ snapshot/current pointers update
→ MANUAL_EDIT_REBUILT
```

Therefore, when an existing persisted `out` snapshot for the same `outIndex` is already proven and the path is the genuine `USER_EDIT_CANDIDATE` rebuild:

```text
manual-edit save
= overwrite of an existing retention key
!= creation of a new retention key
```

The write changes payload contents but does not increase Store key cardinality.

## 4. Existing retention precedent

Ordinary request/output hot paths already separate persistence correctness from retention housekeeping.

Existing ordinary save paths use `prune:false` where required and Store-owned deferred housekeeping later performs retention work with the established bounded cadence/guard behavior.

Existing retention ownership already includes:

```text
Store-owned prune mechanics
bounded cadence
same-index dedupe / single-running guard
retention failure isolated from already-committed output/state
```

The selected optimization must reuse that existing retention authority. It must not invent a second scheduler, second retention owner, new queue, new persistent marker, or new pruning policy.

## 5. Selected semantic condition

The only candidate optimization surface is:

```text
CURRENT PATH = genuine manual edit rebuild
AND
edit origin = USER_EDIT_CANDIDATE
AND
an existing persisted `out` snapshot for the exact same outIndex was already loaded/proven
AND
write target remains phase='out', index=that same outIndex

THEN
manual-edit Store save may elide inline prune
because the save is a same-key overwrite and cannot increase retention-key cardinality.
```

Fail closed:

```text
prior persisted out missing / unproven
edit origin UNKNOWN
compatibility/fallback path
phase/index identity changed
source ownership changed

→ preserve current inline prune behavior
→ no optimization by inference
```

## 6. Candidate implementation surface

Expected narrow future implementation surface, subject to fresh preflight after v0.70.5 live close:

1. `edit-reconcile`
   - reuse already-loaded same-index `savedOut` evidence;
   - reuse existing edit-origin classification;
   - on the proven same-key `USER_EDIT_CANDIDATE` branch only, call the existing Store save with `prune:false` while preserving the existing metric object;
   - do not add a Store read, key scan, timer, queue, or scheduler.

2. manual-edit diagnostic attribution
   - retain serialize/set attribution;
   - distinguish **prune not executed by proven same-key overwrite policy** from an unknown prune value;
   - preserve explicit provenance so `SKIPPED` is not confused with an unmeasured zero.

3. deterministic builder/tests
   - prove the Store module remains byte-identical if practical;
   - prove the optimized call writes the same `out`/`outIndex` exactly once;
   - prove no eligible-path `_prune()` call occurs;
   - prove fallback/unproven paths retain existing prune behavior.

## 7. Explicitly unchanged surface

Freeze:

```text
USER_EDIT_CANDIDATE classification
MANUAL_EDIT_REBUILT semantics
snapshot UPDATED semantics
same Store backend.set count/order
same Store key format
same rebuilt payload
same current/trusted fingerprint updates
REPRESENTATION_FAST_RECONCILED behavior
SAME_FAST behavior
Deferred Mirror
Frame / Time / Broadcast / Community / Evidence / Lineage / Handoff / Recurrence
retention keep policy
ordinary deferred-prune cadence/guards
persistent schema
raw-body retention
provider-cache posture
```

## 8. Explicit non-goals

v0.70.6 must not:

- optimize `backend.set`;
- change JSON serialization;
- add a key cache or retention index;
- replace global key enumeration inside `_prune()`;
- alter the retention keep count;
- add a new prune timer or queue;
- defer persistence of the rebuilt manual-edit snapshot itself;
- skip the rebuilt `backend.set`;
- batch or coalesce Store writes;
- weaken `USER_EDIT_CANDIDATE` conservatism;
- treat `UNKNOWN` as a genuine-edit proof;
- merge ordinary `TURN_STORAGE` / `OUT_STORAGE` performance work into this lane;
- resume provider-cache work.

## 9. Risk model

Primary safety question:

```text
Does removing inline prune after a same-key overwrite weaken retention correctness?
```

Selected answer boundary:

```text
same-key overwrite introduces zero new retention keys
→ it cannot worsen retained-key cardinality
→ any pre-existing retention backlog remains pre-existing housekeeping debt
→ existing Store retention owner remains responsible for eventual housekeeping
```

This mini must not claim stronger equivalence if fresh source preflight shows that manual-edit save can create a new retention key despite a non-null same-index saved output.

If such a contradiction appears, stop and redesign.

## 10. Expected performance effect

The target is not a fixed wall-clock promise.

The bounded expectation is:

```text
eligible genuine manual edit
→ rebuild no longer awaits STORE_RETENTION_PRUNE
→ manual commit critical path becomes serialization + backend.set only
```

Using the triggering sample only as an attribution illustration:

```text
old commit = 37.732 s
of which prune = 37.244 s
remaining serialize+set = 0.488 s
```

Host/backend variance means the future live result may not equal 0.488 s. Acceptance is based on removal of the proven prune wait from the eligible critical path while correctness remains unchanged, not on reproducing one absolute latency number.

## 11. Cache program disposition

Cache work remains preserved and deferred.

If v0.70.6 is consumed by this optimization before cache runtime resumes:

```text
future cache runtime identity >= 0.70.7
```

Provider cache remains explicitly `UNVERIFIED`.

## 12. Frozen impact decision

```text
NEXT PATCH CANDIDATE = v0.70.6
WORKING NAME = Manual Edit Redundant Prune Elision
OPTIMIZATION OWNER = genuine USER_EDIT_CANDIDATE same-key out overwrite
ELIDED WORK = inline retention prune only
NEW RETENTION OWNER = NO
NEW TIMER / QUEUE = NO
STORE KEY / KEEP POLICY = FROZEN
BACKEND.SET = PRESERVED
IMPLEMENTATION = BLOCKED ON v0.70.5 HUMAN LIVE CLOSE + fresh source preflight
CACHE = preserved but deferred; if v0.70.6 is consumed, cache runtime >= 0.70.7
```