# SimCore v0.70.4 Manual Edit Rebuild Attribution Impact Scope — 2026-09-04

Date: 2026-09-04 KST
Status: **IMPACT SCOPE FROZEN · DESIGN-ONLY · OBSERVABILITY FIRST · IMPLEMENTATION BLOCKED ON v0.70.3 REAL-LONG-CHAT CLOSE · NO OPTIMIZATION AUTHORITY**
Classification: **SIMCORE · PERFORMANCE OBSERVABILITY MINI · EDIT-RECONCILE · GENUINE MANUAL EDIT COLD PATH**

## 1. Current authority

Current production authority is SimCore v0.70.3 `Post-M2 Simplification Convergence` on `release-simcore`.

The machine-managed current live gate remains:

```text
S7_CUMULATIVE_SIMPLIFICATION_REAL_LONG_CHAT
validation = PENDING_REAL_LONG_CHAT
```

Therefore this document freezes only the next-version design scope. It does not authorize implementation, candidate materialization, publication, or any change to current production.

## 2. Triggering evidence

The repository already preserves recurrent genuine manual-edit rebuild latency:

```text
v0.64.2  MANUAL_EDIT_REBUILT  11.678 s
v0.64.5  MANUAL_EDIT_REBUILT  12.012 s
v0.65.0  MANUAL_EDIT_REBUILT  18.372 s
```

The v0.65.0 evidence explicitly concluded:

```text
correctness path succeeded
rebuild boundary dominated request time
internal cause missing
no optimization authority
```

A new operator-provided v0.70.3 long-chat diagnostic captured a genuine manual edit with:

```text
Edit origin: USER_EDIT_CANDIDATE
Edit reconcile: MANUAL_EDIT_REBUILT · 33.986 s
snapshot UPDATED
request hook -> prepared: 36.374 s
request hotspot: EDIT_RECONCILE · 33.986 s · 93.4%
```

The immediately following natural request correlated the previous one-character canonical/fresh drift as representation drift and completed:

```text
REPRESENTATION_DRIFT_CORRELATED
REPRESENTATION_FAST_RECONCILED · 0.0 ms
snapshot UNCHANGED
```

This pairing is important: the expensive observation is attached to the genuine conservative rebuild path, not to ordinary representation carryover.

## 3. Exact problem statement

Current diagnostics expose the total `EDIT_RECONCILE` duration but do not expose where the genuine manual-edit rebuild spends time internally.

Supported conclusion:

```text
MANUAL_EDIT_REBUILT can be recurrently expensive in long chat.
```

Unsupported conclusions include:

```text
history scan is dominant
recovery is dominant
snapshot/state read is dominant
finalization is dominant
storage write is dominant
GC/event-loop pause is dominant
33.986 s is avoidable
```

The next safe step is attribution, not optimization.

## 4. Selected scope

Freeze the next mini as an observability-only design with candidate future identity:

```text
version = 0.70.4
working release name = Manual Edit Rebuild Attribution
release mode = NEW_VERSION if and only if later implementation is authorized
```

The mini may add bounded timing attribution only inside the already-owned `edit-reconcile` genuine manual-rebuild path and its immediately necessary diagnostic plumbing.

## 5. Allowed impact surface

Potential implementation scope is limited to:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
products/simcore/tooling/<future exact builder>
products/simcore/releases/<future normal release artifacts>
docs/SIMCORE_07004_* evidence/design documents
```

Runtime semantic owner remains:

```text
edit-reconcile
```

No new architecture layer is selected.

## 6. Frozen non-goals

This mini must not:

- skip or weaken genuine manual-edit rebuild;
- convert ambiguous/user-edited representations into Fresh/Canonical aliases;
- change `USER_EDIT_CANDIDATE`, `MANUAL_EDIT_REBUILT`, `REPRESENTATION_DRIFT_CORRELATED`, or `REPRESENTATION_FAST_RECONCILED` decision semantics;
- change snapshot correctness semantics;
- mutate Frame, Time, Recovery, Broadcast, Community, Evidence, Handoff, Recurrence, Summary, or source-family semantics;
- alter persistent schema;
- add history mutation, network requests, timers, background work, or new host storage surfaces;
- optimize any substage before measured attribution proves a target;
- infer provider cache behavior;
- implement the parked Cache Observer program.

## 7. Cache/version interaction

The historical `v0.70.2 Cache Observer Cold-Path Attribution` design remains technically relevant but cannot be published later as a new version below production v0.70.3.

This design does not rewrite or cancel that work. It freezes only:

```text
historical cache design identity = preserved
future cache runtime release identity = NOT SELECTED HERE
```

If v0.70.4 is eventually consumed by this manual-edit attribution mini, any later cache runtime publication must choose a fresh monotonic version greater than then-current production.

## 8. Implementation prerequisite

Before any v0.70.4 implementation transaction:

1. v0.70.3 real-long-chat gate must close with accepted HUMAN_EVIDENCE or be explicitly reclassified by current authority;
2. `release-simcore` must be freshly read;
3. current production version/commit/blob must be re-proven;
4. SYS-31 version-bump blast-radius rules must pass;
5. current `edit-reconcile` source must be re-audited so timing anchors map to then-current exact code rather than historical assumptions.

## 9. Verdict

```text
impact = SCOPED
correctness = PRESERVE
performance issue = RECURRENT / DIRECT
root cause = UNKNOWN
next action = ATTRIBUTION DESIGN
optimization = HOLD
implementation = BLOCKED ON v0.70.3 LIVE CLOSE
cache program = PRESERVED / DEFERRED
```
