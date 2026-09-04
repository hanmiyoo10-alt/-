# SimCore v0.70.6 Manual Edit Redundant Prune Elision Design — 2026-09-04

Date: 2026-09-04 KST
Status: **DESIGN FROZEN · TARGETED PERFORMANCE OPTIMIZATION · IMPLEMENTATION BLOCKED ON v0.70.5 HUMAN LIVE CLOSE · RETENTION SEMANTICS FROZEN**
Classification: **SIMCORE · PERFORMANCE MINI · GENUINE MANUAL EDIT · SAME-KEY OVERWRITE · RETENTION HOUSEKEEPING**

Related:
- `docs/SIMCORE_07006_MANUAL_EDIT_REDUNDANT_PRUNE_ELISION_IMPACT_SCOPE_2026-09-04.md`
- `docs/SIMCORE_07005_MANUAL_EDIT_COMMIT_BOUNDARY_ATTRIBUTION_DESIGN_2026-09-04.md`
- `docs/SIMCORE_LIVE_07005_PARTIAL_EVIDENCE_2026-09-04.md`
- `docs/SIMCORE_LONG_CHAT_STORE_BOUNDARY_DECOMPOSITION_IDEA.md`

## 1. Authority and ordering

Fresh design-start authority:

```text
main = 70d71bf11c640652775963e49355aff5d088730c
production = SimCore v0.70.5 Manual Edit Commit Boundary Attribution
release-simcore = 4374bef29e28804750c05115258cc80f055a26f7
validation = PENDING_REAL_LONG_CHAT
live gate = 07005_MANUAL_EDIT_COMMIT_BOUNDARY_ATTRIBUTION_REAL_LONG_CHAT
```

Ordering is strict:

```text
freeze v0.70.6 design
→ close/reclassify v0.70.5 human live gate through owning authority
→ fresh production/source preflight
→ verify same-key overwrite proof still holds
→ only then consider v0.70.6 implementation authorization
```

This design reserves a future patch identity only. It does not mutate current runtime, release state, live status, machine-managed priority, or production.

## 2. Why this patch exists

v0.70.4 exposed manual rebuild attribution.
v0.70.5 decomposed its Store commit into serialize/set/prune.

The new genuine-edit positive-control evidence reports:

```text
Edit origin: USER_EDIT_CANDIDATE
Edit reconcile: MANUAL_EDIT_REBUILT · 41.912 s
snapshot UPDATED

Manual edit commit:
serialize 0.0 ms
set 488.0 ms
prune 37.244 s
total 37.732 s
confidence EXACT
```

Therefore:

```text
prune ~= 98.7% of commit
prune ~= 88.9% of full rebuild
```

This crosses the v0.70.5 design threshold for a separate optimization review because one named subphase is overwhelmingly dominant and the current source/fixture already proves that the named field is the exact `_prune()` await boundary.

The next question is no longer:

```text
which Store subphase is slow?
```

It is:

```text
is that prune required on this exact manual-edit write?
```

## 3. Release identity

Freeze provisionally:

```text
candidate future version = 0.70.6
working release name = Manual Edit Redundant Prune Elision
release mode = NEW_VERSION if later authorized
```

If a higher-authority release consumes 0.70.6 first, reselect monotonically rather than forcing this identity.

## 4. Primary goal

Remove the synchronous retention-prune await from a **proven existing same-key genuine manual-edit overwrite** while preserving the rebuilt snapshot write and all edit/retention correctness contracts.

Desired semantic flow:

```text
prior exact visible assistant output
→ genuine user hand edit
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT preparation/finalization
→ overwrite existing Store key for ('out', same outIndex)
→ backend.set awaited and committed
→ inline prune skipped only because key cardinality cannot grow
→ snapshot/current pointers updated exactly as before
→ existing Store retention housekeeping remains authoritative
```

## 5. Core proof: same-key overwrite does not add retention population

Current Store key identity:

```text
_k(phase, index) = `${prefix}:${phase}:${index}`
```

Current `out` load path reads:

```text
backend.get(_k('out', outIndex))
```

Current save writes:

```text
backend.set(_k(phase, index), payload)
```

The target manual rebuild saves:

```text
phase = 'out'
index = outIndex
```

Therefore, when the same-index persisted out snapshot was already successfully loaded:

```text
before key = _k('out', outIndex)
after key  = _k('out', outIndex)

key identity SAME
key count delta = 0
```

The payload changes; the retention population does not.

This exact fact is the optimization basis.

## 6. Eligibility contract

Inline prune may be elided only when every condition is proven by already-owned state in the current transaction:

```text
E1 current reconcile classification = USER_EDIT_CANDIDATE
E2 existing persisted `out` snapshot for exact outIndex was successfully loaded
E3 rebuild writes phase = 'out'
E4 rebuild writes the exact same outIndex
E5 Store key semantics remain deterministic phase+index identity
```

When E1-E5 are true:

```text
save rebuilt out snapshot with prune:false
```

No new read may be added solely to prove eligibility. The design must reuse the already-required saved-output read/classification facts.

Fail closed if any eligibility fact is absent or ambiguous:

```text
UNKNOWN edit origin
missing saved out
legacy/compat path with unproven key identity
phase/index mismatch
source semantics changed

→ preserve current inline prune behavior
```

## 7. Correctness invariants

Freeze the existing edit decision graph:

```text
ordinary exact carryover
→ SAME_FAST
→ snapshot UNCHANGED

representation drift + exact Fresh carryover
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

genuine user hand edit
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

Also frozen:

```text
one rebuilt Store save
same output phase/index
same rebuilt serialized state
same backend.set await
same snapshot/current/trusted identity updates
same manualEditRevision behavior
same output/frame/time semantics
same Deferred Mirror semantics
same persistent schema
same raw-body retention policy
```

No latency improvement may weaken conservative manual-edit detection or persistence.

## 8. Retention invariants

This patch changes **when one redundant housekeeping call is awaited**, not the retention policy.

Freeze:

```text
keep count / retention selection policy
Store prune implementation
key filtering/sorting/removal rules
ordinary deferred housekeeping cadence
same-index dedupe guard
single-running-prune guard
retention failure isolation
```

The optimized manual edit must not add a replacement timer or second prune queue.

Rationale:

```text
eligible manual overwrite creates no new key
→ it cannot increase retention population
→ there is no new retention debt introduced by skipping this inline prune
```

A pre-existing over-retained population remains pre-existing housekeeping state. This patch must not force the manual-edit request to pay unrelated housekeeping debt merely because it happened to touch the Store.

## 9. Exact candidate implementation

Subject to fresh preflight, prefer the narrowest call-site change inside `edit-reconcile`.

Conceptually:

```text
existing:
  save('out', outIndex, result.state, { metric: saveMetric })

eligible same-key USER_EDIT_CANDIDATE:
  save('out', outIndex, result.state, {
    metric: saveMetric,
    prune: false
  })
```

Unproven/fallback paths retain current options.

Preferred implementation properties:

```text
Store module byte-identical
no new module
no require edge
no persistent field
no timer
no queue
no backend call added
no key scan added
one eligible _prune call removed
```

## 10. Diagnostic contract

v0.70.5 introduced the exact commit decomposition. v0.70.6 must keep attribution truthful after the optimized prune is intentionally not executed.

Preserve:

```text
Manual edit breakdown: ...
Manual edit commit: ...
```

Add bounded prune disposition provenance, conceptually:

```text
Manual edit retention: INLINE_PRUNE_SKIPPED · reason SAME_OUT_KEY_OVERWRITE
```

Accounting rules:

```text
serialize = existing measured Store serializeMs
set = existing measured Store setMs
prune contribution = known zero only when explicit prune-skip disposition proves `_prune()` was not invoked
unknown prune remains n/a
executed prune remains measured numeric value
```

The diagnostic must make `SKIPPED` distinguishable from an executed prune that happened to measure `0.0 ms`.

Acceptable rendering shapes include either:

```text
Manual edit commit: serialize 0.0 ms · set 488.0 ms · prune 0.0 ms · total 488.0 ms · confidence EXACT
Manual edit retention: INLINE_PRUNE_SKIPPED · reason SAME_OUT_KEY_OVERWRITE
```

or an equivalent bounded representation that preserves exact accounting and explicit skip provenance.

No raw Store key or payload is rendered.

## 11. Static acceptance

A future builder/qualification must prove at minimum:

```text
latest.js == install.js
node --check both PASS
exact selected release identity
module inventory/order unchanged
require graph unchanged
persistent schema unchanged
Store module byte-identical preferred/required if no source contradiction
SnapshotStore._prune body unchanged
retention keep policy unchanged
ordinary deferred-prune cadence/guards unchanged
backend.set count on manual rebuild = 1
manual rebuild save phase/index unchanged
USER_EDIT_CANDIDATE markers unchanged
MANUAL_EDIT_REBUILT markers unchanged
REPRESENTATION_FAST_RECONCILED markers unchanged
no new storage/network/chat/timer/history-scan surface
provider cache remains UNVERIFIED
```

## 12. Differential / fixture acceptance

Required executable matrix:

### F1. Ordinary exact carryover

```text
SAME_FAST
snapshot UNCHANGED
Store save count unchanged
no manual retention line
```

### F2. Representation drift exact Fresh carryover

```text
REPRESENTATION_FAST_RECONCILED
snapshot UNCHANGED
no manual Store save
no manual retention line
```

### F3. Genuine manual edit with proven same-index saved out

Seed a persisted `out` snapshot at the target outIndex, then perform a genuine edit.

Require:

```text
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
snapshot UPDATED
save count = 1
save phase = out
save index = exact target outIndex
opts.prune = false
backend.set = 1
_prune = 0 on eligible save
manual retention disposition = INLINE_PRUNE_SKIPPED
```

### F4. Same-key cardinality proof

With a real/fake Store key map:

```text
before: key _k('out', N) exists
after optimized save: same key exists with changed payload
key count delta = 0
```

### F5. Fallback / missing prior out

When prior same-index persisted out cannot be proven:

```text
optimization not eligible
current prune behavior preserved
no fabricated same-key proof
```

### F6. UNKNOWN edit origin

```text
UNKNOWN != USER_EDIT_CANDIDATE
optimization not eligible
current prune behavior preserved
```

### F7. Diagnostic accounting

Eligible skip:

```text
serialize numeric
set numeric
prune contribution known zero with explicit SKIPPED provenance
total = serialize + set
confidence exact when all executed components are exact
```

Executed fallback prune:

```text
prune numeric from Store metric
no SKIPPED provenance
```

Unknown remains `n/a`.

### F8. Post-edit retry control

Repeat the same logical send after the manual edit rebuild.

Require:

```text
no duplicate MANUAL_EDIT_REBUILT for the same stabilized host snapshot
no duplicate retention side effect introduced
frame/index do not spuriously advance from retry semantics
```

## 13. Real long-chat acceptance

A future published v0.70.6 requires human evidence after static qualification/publication.

### A. Normal control

```text
ordinary SAME_FAST or equivalent exact carryover
Warnings 0 or separately classified
no manual retention line
continuity/frame healthy
```

### B. Representation-drift control when naturally available

```text
REPRESENTATION_DRIFT_CORRELATED
REPRESENTATION_FAST_RECONCILED
snapshot UNCHANGED
no manual retention line
```

Do not manufacture representation drift solely for this release if frozen differential coverage remains authoritative and it does not arise naturally.

### C. Genuine manual-edit positive control

Require one real hand edit from a prior EXACT assistant representation:

```text
Edit origin USER_EDIT_CANDIDATE
Edit reconcile MANUAL_EDIT_REBUILT
snapshot UPDATED
Manual edit commit present
Manual edit retention INLINE_PRUNE_SKIPPED / SAME_OUT_KEY_OVERWRITE equivalent
prune absent from eligible awaited commit path
serialize/set remain truthful
Warnings 0 or separately non-regression-classified
Stability PASS
binding BOUND
output COMMITTED
mirror COMMITTED
Continuity PASS
Frame sequence PASS
Frame guard PASS
```

### D. Immediate follow-up / retry

One natural follow-up or same-turn retry should confirm the rebuilt snapshot remains authoritative without a second manual rebuild caused by the optimization.

No artificial rare fallback is required live merely to force F5/F6; static fixtures remain authority for those fail-closed branches unless a natural occurrence exposes contrary evidence.

## 14. Performance acceptance

Do not set an absolute wall-clock target such as `< 1 s` because backend.set/host variance is separate and already observed.

Required performance claim is narrower:

```text
eligible manual edit no longer awaits STORE_RETENTION_PRUNE
```

The live diagnostic should therefore show the target prune disposition as skipped/non-executed and the commit critical path reduced to the remaining executed components.

If the next dominant bucket becomes:

```text
backend.set
→ route to the separate Store backend-set performance lane

other/recovery/finalize
→ attribute separately
```

Do not broaden v0.70.6 after the prune-elision goal is satisfied.

## 15. Failure / abort conditions

Stop implementation or live promotion if fresh evidence shows any of:

```text
manual edit can create a new out key despite saved same-index proof
prune participates in semantic state selection rather than housekeeping only
retention correctness depends on immediate inline prune at this path
skipping prune changes current/latest snapshot selection
Store key identity changed
eligibility requires a new Store read or global scan
fallback path accidentally inherits prune:false
manual edit persistence is deferred/skipped
```

Any such result requires re-design, not patch expansion.

## 16. Rollback

Rollback is narrow:

```text
remove same-key prune:false eligibility branch
remove skip-disposition diagnostic projection
restore v0.70.5 manual Store save options
```

Rollback must not touch Store internals, retention policy, edit classification, or unrelated performance lanes.

## 17. Cache program disposition

The historical cache program remains preserved and parked.

If v0.70.6 is released first:

```text
future cache runtime version = fresh monotonic identity >= 0.70.7
```

Local prefix/cache observer evidence still does not prove provider cache use or billing-token caching. Provider cache remains `UNVERIFIED`.

## 18. Final frozen decision

```text
NEXT PATCH DESIGN = v0.70.6 Manual Edit Redundant Prune Elision
WHY = v0.70.5 exact live attribution isolates 37.244 s prune as ~98.7% of commit in a genuine USER_EDIT_CANDIDATE sample
PROOF BASIS = same persisted phase/index key is loaded then overwritten; eligible save adds zero retention keys
CHANGE TYPE = targeted performance optimization
ELIGIBLE PATH = proven same-key USER_EDIT_CANDIDATE only
STORE WRITE = preserved and awaited
INLINE PRUNE = skipped only on eligible overwrite
NEW SCHEDULER = none
RETENTION POLICY = frozen
FALLBACK/UNKNOWN = current prune behavior preserved
IMPLEMENTATION = blocked until v0.70.5 human live close + fresh source preflight
CACHE = preserved but deferred; if v0.70.6 is consumed, cache runtime >= 0.70.7
```
