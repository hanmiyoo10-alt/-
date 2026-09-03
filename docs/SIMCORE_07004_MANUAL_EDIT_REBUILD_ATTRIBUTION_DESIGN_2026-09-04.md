# SimCore v0.70.4 Manual Edit Rebuild Attribution Design — 2026-09-04

Date: 2026-09-04 KST
Status: **DESIGN FROZEN · OBSERVABILITY-ONLY · IMPLEMENTATION BLOCKED ON v0.70.3 REAL-LONG-CHAT CLOSE · NO OPTIMIZATION / RELEASE AUTHORITY**
Classification: **SIMCORE · PERFORMANCE OBSERVABILITY MINI · EDIT-RECONCILE · GENUINE MANUAL EDIT COLD PATH**

## 1. Authority and ordering

This design is governed by current repository common rules, SimCore release governance, Contracts v2, the physical `edit-reconcile` ownership established at M2-3, and the current v0.70.3 S7 live gate.

Current production is:

```text
version = 0.70.3
release = Post-M2 Simplification Convergence
release branch = release-simcore
validation = PENDING_REAL_LONG_CHAT
current live gate = S7_CUMULATIVE_SIMPLIFICATION_REAL_LONG_CHAT
```

The ordering rule is strict:

```text
freeze v0.70.4 design now
→ close/reclassify v0.70.3 live gate
→ fresh production/source re-preflight
→ only then consider implementation authorization
```

This document does not mutate `CURRENT_DEVELOPMENT.md` current priority and does not authorize candidate or release creation.

## 2. Why this mini exists

Genuine manual-edit rebuild latency has recurred across long-chat validation:

```text
v0.64.2  11.678 s
v0.64.5  12.012 s
v0.65.0  18.372 s
v0.70.3  33.986 s  (operator-provided live diagnostic)
```

The v0.70.3 sample is especially strong because it also reports:

```text
Edit origin: USER_EDIT_CANDIDATE
Edit reconcile: MANUAL_EDIT_REBUILT · 33.986 s
snapshot UPDATED
Request hotspot: EDIT_RECONCILE · 33.986 s · 93.4%
```

The immediately following request reports:

```text
Edit origin: REPRESENTATION_DRIFT_CORRELATED
Edit reconcile: REPRESENTATION_FAST_RECONCILED · 0.0 ms
snapshot UNCHANGED
```

Therefore the evidence supports a narrow statement:

```text
genuine conservative rebuild can be very expensive
while representation-fast reconciliation remains healthy
```

It does not identify the internal dominant owner.

## 3. Release identity

Freeze the next patch identity provisionally as:

```text
candidate future version = 0.70.4
working release name = Manual Edit Rebuild Attribution
release mode = NEW_VERSION if later authorized
```

This identity is a design reservation, not a publication claim.

If another higher-authority release moves production before implementation, this identity must be re-evaluated under SYS-31 rather than forced.

## 4. Primary goal

Expose a bounded, exact timing decomposition for only the slow genuine manual-edit rebuild path so a later optimization decision can identify the narrowest responsible owner.

The mini answers:

```text
Where inside MANUAL_EDIT_REBUILT did the request time go?
```

It does not answer by assumption:

```text
How should the path be optimized?
```

## 5. Correctness invariants

The following are frozen byte/behavior contracts except for diagnostic timing additions:

```text
ordinary exact carryover
→ SAME_FAST / SAME_HOST_FAST as currently applicable

prior mismatch + exact Fresh visible carryover
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

genuine visible user edit
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED

unknown / ambiguous representation
→ no unsafe Fresh/Canonical alias acceptance
→ conservative rebuild remains available
```

Performance pressure must never weaken edit identity safety.

## 6. Attribution architecture

Instrumentation must stay inside existing `perfDetail`/diagnostic ownership where possible. No second telemetry system is selected.

The exact current source must be re-audited before implementation. The implementation may instrument only real current anchors that map to the following semantic buckets.

### 6.1 Outer classification bucket

```text
EDIT_CLASSIFY
```

Measures the bounded work in `reconcileVisiblePreviousAssistant` from entry through representation/current-visible classification and path selection, excluding delegated manual rebuild time.

This bucket proves whether the expensive time is already present before the rebuild delegate.

### 6.2 Manual rebuild buckets

The genuine `reconcileSessionEditedOutput` path must be decomposed into the narrowest exact existing phases available in the then-current code.

Frozen semantic bucket vocabulary:

```text
EDIT_REBUILD_PREPARE
EDIT_REBUILD_RECOVERY
EDIT_REBUILD_FINALIZE
EDIT_REBUILD_COMMIT
EDIT_REBUILD_OTHER
```

Definitions:

- `EDIT_REBUILD_PREPARE`: bounded synchronous/state preparation before the first owned recovery/finalization/commit boundary.
- `EDIT_REBUILD_RECOVERY`: exact time spent in an existing Recovery-owned call or equivalent current recovery boundary.
- `EDIT_REBUILD_FINALIZE`: exact time spent in the existing output-finalization boundary or equivalent current finalization call.
- `EDIT_REBUILD_COMMIT`: exact time spent in existing state/snapshot persistence calls required by the rebuild, if such a distinct current anchor exists.
- `EDIT_REBUILD_OTHER`: residual measured rebuild time not covered by the exact mapped buckets.

Important fail-closed rule:

```text
no exact current anchor
→ do not invent a bucket measurement
→ leave time in EDIT_REBUILD_OTHER
```

The implementation must not classify time by function-name guesswork or subtract unrelated asynchronous work into a named owner.

## 7. Timing accounting contract

For one genuine manual rebuild:

```text
EDIT_RECONCILE_TOTAL
≈ EDIT_CLASSIFY
 + EDIT_REBUILD_PREPARE
 + EDIT_REBUILD_RECOVERY
 + EDIT_REBUILD_FINALIZE
 + EDIT_REBUILD_COMMIT
 + EDIT_REBUILD_OTHER
```

Accounting requirements:

```text
all values >= 0
named bucket overlap = 0
nested owner time counted once
residual = max(0, measured rebuild total - exact named subspans)
rounding tolerance only; no negative residual
```

If instrumentation overhead or clock granularity prevents exact closure, diagnostics must explicitly say `BOUNDED` rather than manufacture equality.

## 8. Diagnostic surface

The existing headline remains unchanged:

```text
Edit reconcile: MANUAL_EDIT_REBUILT · <total>
```

Add one line only when the manual rebuild path was actually exercised:

```text
Manual edit breakdown: classify <ms> · prepare <ms> · recovery <ms> · finalize <ms> · commit <ms|n/a> · other <ms> · confidence <EXACT|BOUNDED>
```

Rules:

- ordinary `SAME_FAST` and `REPRESENTATION_FAST_RECONCILED` turns do not pay full rebuild attribution work;
- absent/unmapped phases print `n/a`, not zero;
- no raw message bodies, edited content, snapshots, or recovered output bodies are retained;
- only bounded numeric timing/status metadata is added;
- copied diagnostics may expose the bounded line exactly as normal diagnostic text.

## 9. Runtime cost budget

Observability must be cheaper than the problem it measures.

Target design budget:

```text
ordinary non-edit turn added work: effectively zero / branch-only
representation-fast turn added work: effectively zero / branch-only
genuine manual rebuild: bounded local clock reads + scalar assignments only
new storage/network/chat/timer work: 0
new history scan: 0
new serialization of raw bodies: 0
```

No periodic sampler, profiler, stack capture, or trace buffer is authorized.

## 10. Implementation source audit requirement

Before writing runtime code, produce an exact source map for the then-current production-derived candidate:

```text
reconcileVisiblePreviousAssistant
  classification anchors
  exact delegate boundary

reconcileSessionEditedOutput
  preparation anchors
  Recovery-owned calls
  output-finalization calls
  persistence/state commit calls
  return/detail.path anchor
```

Each named subspan in the implementation evidence must cite its exact before/after code anchors.

If current code does not expose separable phases without semantic refactoring, the first implementation must instrument fewer buckets rather than refactor merely to obtain prettier diagnostics.

## 11. Static acceptance

A future builder must prove at minimum:

```text
latest.js == install.js
node --check both = PASS
version/runtime/host identity = selected exact release identity
module inventory/order = unchanged
require graph = unchanged
persistent schema = unchanged
new host/network/timer/storage surface = 0
edit decision markers unchanged
representation-fast markers unchanged
manual-edit rebuilt marker unchanged
snapshot update semantics unchanged
provider cache remains UNVERIFIED
```

Diagnostic additions must be cardinality-checked at exact intended anchors.

## 12. Differential / fixture acceptance

Required fixture matrix:

1. ordinary exact carryover
   - same prior behavior
   - no `Manual edit breakdown` line

2. prior canonical/fresh mismatch + exact Fresh carryover
   - `REPRESENTATION_DRIFT_CORRELATED`
   - `REPRESENTATION_FAST_RECONCILED`
   - snapshot unchanged
   - no manual rebuild breakdown

3. genuine hand edit from prior EXACT
   - `USER_EDIT_CANDIDATE`
   - `MANUAL_EDIT_REBUILT`
   - snapshot updated
   - breakdown line present

4. genuine hand edit after prior OUTPUT_MISMATCH / third representation
   - no unsafe alias acceptance
   - conservative rebuild retained
   - breakdown line present

5. unmapped/failed optional bucket anchor in test harness
   - `n/a`/residual behavior, never fabricated zero

6. timing accounting
   - no overlap/negative residual
   - total closure within defined clock/rounding tolerance

## 13. Real long-chat acceptance

A future release requires human evidence after publication.

Minimum live matrix:

### A. Normal carryover control

```text
SAME_FAST or current ordinary exact path
Warnings = no new attribution warning
no Manual edit breakdown
```

### B. Representation drift control

Where naturally available:

```text
REPRESENTATION_DRIFT_CORRELATED
REPRESENTATION_FAST_RECONCILED
snapshot UNCHANGED
fast-path latency not regressed materially by attribution instrumentation
```

### C. Genuine manual edit positive control

Require:

```text
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
snapshot UPDATED
Manual edit breakdown present
all measured fields bounded/non-negative
```

One sample is enough to validate instrumentation correctness, not enough to choose an optimization target.

### D. Attribution decision threshold

Optimization remains HOLD until at least one of the following is true:

```text
same named subspan dominates >= 2 independent genuine-edit long-chat samples
or
one sample is overwhelmingly dominant and a deterministic fixture/source proof explains why
```

Even then, optimization requires a separate design/review transaction.

## 14. Relationship to existing performance work

This mini is separate from:

```text
PROMPT_ACCOUNTING cold-path attribution
Runtime Prompt Cache topology
provider/gateway cached-token receipt work
OUT_STORAGE latency watch
TURN_STORAGE latency watch
3.0M / post-3M source-family runtime enablement
```

No causal linkage is implied between these lanes.

## 15. Cache program disposition

The frozen historical `v0.70.2 Cache Observer Cold-Path Attribution` design is not cancelled.

However current production is already v0.70.3 and release governance requires a new-version target to be greater than production. Therefore:

```text
v0.70.2 = historical design origin only
future cache runtime version = fresh monotonic identity selected when resumed
```

If this v0.70.4 mini is eventually released first, cache runtime work necessarily moves to v0.70.5 or later unless an intervening release consumes that identity too.

## 16. Rollback

Because the selected behavior change is diagnostic-only, rollback is simple:

```text
remove timing reads/scalar accumulation
remove Manual edit breakdown renderer
restore previous release identity
```

Rollback must not touch edit semantics because this design never authorizes changing them.

## 17. Final frozen decision

```text
NEXT PATCH DESIGN = v0.70.4 Manual Edit Rebuild Attribution
WHY = recurrent 11.678s / 12.012s / 18.372s / 33.986s genuine rebuild boundary with no internal breakdown
CHANGE TYPE = observability only
CORRECTNESS = frozen
OPTIMIZATION = HOLD
IMPLEMENTATION = blocked until v0.70.3 real-long-chat close + fresh re-preflight
CACHE = preserved but deferred; runtime identity must be reselected monotonically when resumed
```
