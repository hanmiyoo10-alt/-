# SimCore v0.70.6 Implementation Authorization — 2026-09-04

Date: 2026-09-04 KST
Status: **IMPLEMENTATION AUTHORIZED · FRESH SOURCE PREFLIGHT PASS · RELEASE NOT YET AUTHORIZED**
Classification: **SIMCORE · v0.70.6 · MANUAL EDIT REDUNDANT PRUNE ELISION · PERFORMANCE MINI**

## 1. Human authority

The operator explicitly confirmed in the active SimCore project conversation on 2026-09-04 KST that the next-version design is complete and authorized the update to proceed.

This authorization is bounded by the already-frozen design and impact scope:

- `docs/SIMCORE_07006_MANUAL_EDIT_REDUNDANT_PRUNE_ELISION_DESIGN_2026-09-04.md`
- `docs/SIMCORE_07006_MANUAL_EDIT_REDUNDANT_PRUNE_ELISION_IMPACT_SCOPE_2026-09-04.md`

No release-system restructuring, provider-cache work, ordinary storage-latency optimization, or B_END repair is authorized in this transaction.

## 2. Predecessor terminal closure

v0.70.5 is durably closed by accepted HUMAN_EVIDENCE.

```text
releaseId = simcore-v0.70.5-new-02
terminal convergence run = 33867676313
terminal convergence result = SUCCESS
main convergence commit = 78b5a741880fa0ad727e7e4d0469cbb67ec43965
validation = LIVE_PASS
lifecycle = REAL_RELEASE_LIVE_PASS
current priority = 07006_MANUAL_EDIT_REDUNDANT_PRUNE_ELISION_IMPLEMENTATION
```

The separate malformed B_END observation is preserved as:

- `docs/SIMCORE_WATCH_B_END_MALFORMED_OUTPUT_2026-09-04.md`

Classification remains `WATCH` and does not expand this performance mini.

## 3. Fresh production identity readback

Direct `release-simcore` readback after predecessor terminal close:

```text
version = 0.70.5
release = Manual Edit Commit Boundary Attribution
production commit = 4374bef29e28804750c05115258cc80f055a26f7
previous production = df282f18a0035b03be30af8d0ee2174f58b3bcd3
production blob = c72802234d265337f2558420c84882148e633325
latest.js == install.js = verified by identical production blob
```

No intervening runtime release consumed the provisional v0.70.6 identity.

## 4. Fresh exact source preflight

Exact deployed v0.70.5 source was re-read after terminal convergence.

### 4.1 Store key identity remains deterministic

`SnapshotStore` still derives the storage key as:

```text
_k(phase, index) = `${prefix}:${phase}:${index}`
```

The relevant `save()` sequence remains:

```text
JSON.stringify(state)
→ backend.set(_k(phase, index), payload)
→ if opts.prune !== false: await _prune()
```

Therefore `prune:false` changes only whether inline housekeeping is awaited; it does not skip serialization or the authoritative backend write.

### 4.2 Same-index saved output proof remains present

`reconcileSessionEditedOutput()` still performs the already-required persisted snapshot read:

```text
savedOut = await session.store.load('out', outIndex)
if (!savedOut) return no-snapshot
```

The final genuine manual rebuild still writes exactly:

```text
session.store.save('out', outIndex, result.state, ...)
```

Thus when that final rebuild is reached after a successful `savedOut` load:

```text
read key  = _k('out', outIndex)
write key = _k('out', outIndex)
key identity = SAME
key-count delta from overwrite = 0
```

### 4.3 USER_EDIT_CANDIDATE fact exists before rebuild invocation

Current outer Edit Reconcile already computes prior-representation facts before invoking the rebuild delegate:

```text
priorProvenance = representationRegistry.latest(...)
relation = representationRules.inspectCarryover(...)
priorRepresentation = relation.priorRepresentation
```

The existing post-reconcile attribution maps a changed result with `priorRepresentation === 'EXACT'` to `USER_EDIT_CANDIDATE`.

The final manual-rebuild branch itself returns `changed: true`. Therefore the optimization may reuse the already-owned pre-call `priorRepresentation === 'EXACT'` fact as a bounded eligibility hint, but may apply `prune:false` only at the final manual rebuild save after `savedOut` has already been proven.

This avoids a new read and preserves fail-closed behavior:

```text
priorRepresentation !== EXACT
missing savedOut
repair/compatibility branch
no-snapshot branch
representation fast path
phase/index mismatch

→ no prune elision
→ current inline-prune behavior preserved wherever a save already occurs
```

No diagnostic/perf object may become the sole semantic authority for eligibility; the implementation must pass or derive a bounded explicit eligibility fact from the existing Edit Reconcile relation.

### 4.4 Store implementation remains eligible for byte preservation

No source contradiction requires changing the Store module. The narrow implementation can be completed at the Edit Reconcile call/delegate boundary plus diagnostic projection.

## 5. Preflight verdict

```text
V0.70.5 LIVE CLOSE = PASS
PRODUCTION IDENTITY = STABLE
SAME-KEY PROOF = PASS
SAVED-OUT PROOF = PASS
USER_EDIT_CANDIDATE PRE-CALL FACT = AVAILABLE
STORE prune:false CONTRACT = UNCHANGED
STORE MODULE CHANGE REQUIRED = NO
PERSISTENT SCHEMA = UNCHANGED
PROVIDER CACHE = UNVERIFIED
V0.70.6 DESIGN MAPPING = VALID
```

No redesign is required.

## 6. Authorized implementation boundary

Authorized release identity:

```text
version = 0.70.6
release = Manual Edit Redundant Prune Elision
change class = RUNTIME_FEATURE / PERFORMANCE MINI
```

Allowed:

1. reuse the existing prior-representation relation to prove a potential `USER_EDIT_CANDIDATE` before the rebuild delegate;
2. pass that bounded eligibility fact through the existing Edit Reconcile delegate seam without a new read;
3. on the final manual rebuild only, after exact same-index `savedOut` was loaded, call the existing Store save with `prune:false` when the eligibility fact is proven;
4. keep the authoritative `backend.set` await and rebuilt state unchanged;
5. record explicit `INLINE_PRUNE_SKIPPED / SAME_OUT_KEY_OVERWRITE` diagnostic provenance;
6. treat the skipped prune contribution as known zero only when skip provenance is explicit;
7. retain executed fallback prune metrics and `n/a` semantics for unknown values;
8. add deterministic builder, fixtures, regression tests, and an exact v0.70.6 validation profile;
9. update exact release identity surfaces required by a new runtime version.

Forbidden:

```text
Store key-format change
Store._prune body change
retention keep-policy change
new Store read or key scan
new timer / queue / scheduler
skip or defer rebuilt backend.set
backend.set batching/coalescing
serialization optimization
persistent schema change
raw-body retention change
USER_EDIT_CANDIDATE conservatism weakening
UNKNOWN treated as eligible
representation-fast behavior change
ordinary TURN_STORAGE / OUT_STORAGE optimization
provider-cache claim/tuning
release-system restructuring
B_END repair in this transaction
```

## 7. Static and executable acceptance

The implementation must prove:

```text
latest.js == install.js for generated candidate
node --check both PASS
metadata/runtime/host identity = 0.70.6
module inventory/order unchanged
require graph unchanged
persistent schema unchanged
Store module byte-identical
SnapshotStore._prune unchanged
retention policy/cadence/guards unchanged
eligible genuine manual edit save count = 1
eligible save phase = out
eligible save index = exact target outIndex
eligible opts.prune = false
eligible backend.set = 1
eligible inline _prune = 0
same-key cardinality delta = 0
UNKNOWN/fallback paths preserve current prune behavior
SAME_FAST and REPRESENTATION_FAST_RECONCILED remain unchanged
explicit retention skip diagnostic present only for eligible manual rebuild
no new storage/network/chat/timer/history-scan surface
```

## 8. Transaction sequence

```text
this authorization on main
→ bounded implementation branch
→ SimCore Verify / Required
→ implementation evidence on the same PR
→ merge to main
→ exact v0.70.6 candidate transaction from production v0.70.5
→ exact approval package
→ Permanent Release
→ direct release-simcore readback
→ v0.70.6 HUMAN real-long-chat validation
→ terminal convergence
→ main documentation / durable memory synchronization
```

Release publication still requires the existing immutable candidate, exact approval, and Permanent Release gates. This authorization does not bypass them.
