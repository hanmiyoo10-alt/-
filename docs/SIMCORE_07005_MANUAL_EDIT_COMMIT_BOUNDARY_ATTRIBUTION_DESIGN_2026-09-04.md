# SimCore v0.70.5 Manual Edit Commit Boundary Attribution Design — 2026-09-04

Date: 2026-09-04 KST
Status: **DESIGN FROZEN · OBSERVABILITY-ONLY · IMPLEMENTATION BLOCKED ON v0.70.4 HUMAN LIVE CLOSE · NO OPTIMIZATION / RELEASE AUTHORITY**
Classification: **SIMCORE · PERFORMANCE OBSERVABILITY MINI · GENUINE MANUAL EDIT · STORE COMMIT DECOMPOSITION**

## 1. Authority and ordering

This design is governed by current repository common rules, SimCore release governance, Contracts v2, the existing `edit-reconcile` / Store ownership split, and the active v0.70.4 human live gate.

Current production at design freeze:

```text
version = 0.70.4
release = Manual Edit Rebuild Attribution
release branch = release-simcore
production commit = df282f18a0035b03be30af8d0ee2174f58b3bcd3
validation = PENDING_REAL_LONG_CHAT
live gate = 07004_MANUAL_EDIT_REBUILD_ATTRIBUTION_REAL_LONG_CHAT
```

Ordering is strict:

```text
freeze v0.70.5 design
→ close/reclassify v0.70.4 live gate with explicit HUMAN_EVIDENCE
→ fresh production/source preflight
→ only then consider v0.70.5 implementation authorization
```

This document does not mutate current release state, production, `CURRENT_DEVELOPMENT.md` machine-managed priority, or release authority.

## 2. Why this mini exists

v0.70.4 successfully made the previously opaque genuine manual-edit rebuild measurable.

A live v0.70.4 genuine-edit sample reports:

```text
Edit reconcile: MANUAL_EDIT_REBUILT · 39.452 s
Manual edit breakdown:
  classify 0.0 ms
  prepare 1.0 ms
  recovery 0.0 ms
  finalize 1.0 ms
  commit 37.601 s
  other 1.847 s
  confidence BOUNDED
```

The aggregate commit bucket accounts for approximately 95.3% of the rebuild.

However current source proves that `commit` is not one operation. It is constructed from existing SnapshotStore metrics:

```text
commitMs
= saveMetric.serializeMs
+ saveMetric.setMs
+ saveMetric.pruneMs
```

Those phases have different semantic owners and different possible remedies.

Therefore the next question is:

```text
Inside the 37.601 s manual-edit commit bucket,
was time spent in serialization, backend.set, or retention prune?
```

The answer is already measured internally. It is not yet rendered in the live diagnostic.

## 3. Release identity

Freeze the next patch identity provisionally as:

```text
candidate future version = 0.70.5
working release name = Manual Edit Commit Boundary Attribution
release mode = NEW_VERSION if later authorized
```

This is a design reservation only.

If another higher-authority release moves production first, reselect the identity monotonically rather than forcing v0.70.5.

## 4. Primary goal

Expose the three already-measured Store subphases of the v0.70.4 `EDIT_REBUILD_COMMIT` bucket for genuine manual-edit rebuilds only.

The mini answers:

```text
Which existing Store boundary dominates manual-edit commit latency?
```

It does not answer:

```text
How should that boundary be optimized?
```

## 5. Correctness invariants

Freeze current behavior:

```text
ordinary exact carryover
→ SAME_FAST / current exact path
→ snapshot UNCHANGED

prior representation drift + exact Fresh carryover
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

genuine user-visible edit
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

Also frozen:

```text
Store.save call count
Store.save options
backend.set count/order
_prune execution policy
retention policy
output/frame/time semantics
persistent schema
raw-body retention policy
```

No performance objective may weaken conservative manual-edit correctness.

## 6. Existing measurement authority

Current SnapshotStore already measures, with the metric object supplied by Edit Reconcile:

```text
STORE_SERIALIZE_LOCAL
metric.serializeMs
= wall time around JSON.stringify(state)

STORE_BACKEND_SET
metric.setMs
= wall time around await backend.set(key, payload)

STORE_RETENTION_PRUNE
metric.pruneMs
= wall time around await _prune()
```

The v0.70.4 manual rebuild already receives that same `saveMetric` object.

Therefore v0.70.5 must reuse those values. It must not add duplicate timers around Store internals merely to render prettier diagnostics.

## 7. Attribution architecture

### 7.1 Existing aggregate remains authoritative

Preserve:

```text
Manual edit breakdown: ... commit <commitMs> ...
```

The existing aggregate is useful for backward comparison.

### 7.2 Add commit subphase metadata

Only for a genuine manual rebuild with valid existing Store metrics, carry bounded scalar fields conceptually equivalent to:

```text
editRebuildCommitSerializeMs
editRebuildCommitSetMs
editRebuildCommitPruneMs
```

No raw payload, state object, key, backend object, or exception body is retained.

### 7.3 Diagnostic surface

Add one line only when the genuine manual rebuild path is exercised and commit attribution exists:

```text
Manual edit commit: serialize <ms|n/a> · set <ms|n/a> · prune <ms|n/a> · total <ms|n/a> · confidence <EXACT|BOUNDED>
```

Rules:

- ordinary `SAME_FAST` turns render no line;
- `REPRESENTATION_FAST_RECONCILED` turns render no line;
- unknown/unavailable component values render `n/a`, never fabricated zero;
- a real measured zero remains `0.0 ms`;
- the line is diagnostic-only and copy-safe under the existing diagnostic contract.

## 8. Accounting contract

For a measured manual-edit Store commit:

```text
COMMIT_TOTAL
≈ COMMIT_SERIALIZE
 + COMMIT_SET
 + COMMIT_PRUNE
```

Requirements:

```text
all known values >= 0
no component overlap
no new timing reads required inside Store
existing metric object remains sole measurement source
rounding tolerance only
unknown != zero
```

Confidence may be `EXACT` only if the exact current source proves all three existing component metrics are valid, non-overlapping, and their sum closes to the existing `commitMs` within clock/rounding tolerance.

Otherwise render `BOUNDED`.

## 9. Runtime cost budget

Target added runtime work:

```text
ordinary non-edit turn: branch-only / effectively zero
representation-fast turn: branch-only / effectively zero
genuine manual edit: scalar reads/copies + diagnostic formatting only
new Store timer reads: 0
new Store calls: 0
new key scans: 0
new storage/network/chat calls: 0
new history scans: 0
new persistent fields: 0
```

The design explicitly prefers projection of existing metrics over new instrumentation.

## 10. Implementation source preflight

Before implementation, re-read exact then-current production-derived source and record:

```text
reconcileSessionEditedOutput
  exact saveMetric creation
  exact Store.save await
  exact manualEditAttribution construction

SnapshotStore.save
  serializeMs anchor
  setMs anchor
  pruneMs anchor
  opts.prune behavior

Last Turn Diagnostic
  existing manual breakdown projection
  selected new manual commit line anchor
```

If any metric ownership or semantics changed after this design freeze, stop and re-design rather than force this mapping.

## 11. Static acceptance

A future builder/qualification must prove at minimum:

```text
latest.js == install.js
node --check both PASS
version/runtime/host identity = exact selected release identity
module inventory/order unchanged
require graph unchanged
persistent schema unchanged
SnapshotStore.save body unchanged except no change preferred
backend.set count unchanged
_prune call count/policy unchanged
manual edit decision markers unchanged
representation-fast markers unchanged
no new storage/network/chat/timer/history-scan surface
provider cache remains UNVERIFIED
```

Prefer a proof that the Store module itself is byte-identical if implementation can be completed entirely in Edit Reconcile + diagnostics.

## 12. Differential / fixture acceptance

Required matrix:

1. ordinary exact carryover
   - existing behavior unchanged
   - no `Manual edit breakdown`
   - no `Manual edit commit`

2. representation drift exact Fresh carryover
   - `REPRESENTATION_FAST_RECONCILED`
   - snapshot unchanged
   - no manual commit line

3. genuine manual edit from prior EXACT
   - `USER_EDIT_CANDIDATE`
   - `MANUAL_EDIT_REBUILT`
   - snapshot updated
   - existing manual breakdown present
   - new manual commit line present

4. accounting fixture with deterministic existing Store metrics
   - serialize/set/prune retain distinct supplied values
   - total closes to their sum
   - no component reassigned to another owner

5. unknown component fixture
   - unknown renders `n/a`
   - known zero remains zero
   - no fabricated attribution

6. zero-side-effect regression
   - same Store/backend/prune call cardinality before and after

## 13. Real long-chat acceptance

A future published release requires human evidence.

Minimum live matrix:

### A. Normal control

```text
SAME_FAST or equivalent exact carryover
no manual attribution lines
no new warning
```

### B. Genuine manual edit positive control

Require:

```text
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
snapshot UPDATED
Manual edit breakdown present
Manual edit commit present
serialize/set/prune values each numeric or n/a according to source contract
total consistent with the existing aggregate commit bucket
```

One live sample validates the projection.

### C. Optimization-target threshold

Behavioral optimization remains HOLD until a separate evidence review establishes one of:

```text
same commit subphase dominates >= 2 independent genuine-edit long-chat samples
or
one commit subphase is overwhelmingly dominant in a live sample
AND exact deterministic source/fixture evidence proves that named boundary is the measured owner
```

Even then, optimization requires a separate design/review transaction and a fresh release identity if v0.70.5 has already been consumed.

## 14. Likely decision routing after evidence

Do not preselect a repair, but route evidence by owner:

```text
serialize dominates
→ investigate state size / serialization necessity at Store producer boundary

set dominates
→ investigate backend.set / host persistence boundary separately
→ do not blame local serialization or retention

prune dominates
→ investigate retention scan/removal policy and required-vs-deferred semantics
→ preserve retention correctness until separately proven

no stable dominant subphase
→ gather more samples; no optimization
```

This routing is analysis guidance only, not implementation authority.

## 15. Relationship to other performance lanes

Keep separate:

```text
TURN_STORAGE ordinary backend.set watch
OUT_STORAGE ordinary backend.set watch
manual-edit Store commit decomposition
Prompt Cache / Runtime Cache observer work
provider cache receipt work
post-3M/LRE runtime enablement
```

A future `set`-dominant manual-edit result may correlate with ordinary storage latency, but correlation does not merge the authorities automatically.

## 16. Cache program disposition

The historical cache design remains preserved but deferred.

If this v0.70.5 mini is released first:

```text
future cache runtime version = fresh monotonic identity >= 0.70.6
```

Provider cache remains explicitly `UNVERIFIED`.

## 17. Rollback

Because the selected change is diagnostic projection only, rollback is bounded:

```text
remove manual-edit commit scalar projection
remove Manual edit commit diagnostic line
restore previous release identity
```

Rollback must not touch Store behavior or edit semantics.

## 18. Final frozen decision

```text
NEXT PATCH DESIGN = v0.70.5 Manual Edit Commit Boundary Attribution
WHY = v0.70.4 live sample isolates 37.601 s / ~95.3% of MANUAL_EDIT_REBUILT inside aggregate commit, while current source already measures serialize/set/prune separately
CHANGE TYPE = observability only
NEW TIMERS = none preferred
STORE BEHAVIOR = frozen
CORRECTNESS = frozen
OPTIMIZATION = HOLD pending commit-subphase evidence
IMPLEMENTATION = blocked until v0.70.4 human live close + fresh source preflight
CACHE = preserved but deferred; if v0.70.5 is consumed, resumed cache runtime >= v0.70.6
```
