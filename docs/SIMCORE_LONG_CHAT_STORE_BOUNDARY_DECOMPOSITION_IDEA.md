# SimCore Long-Chat Store Boundary Decomposition — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · SOURCE-GROUNDED STORE BOUNDARY MAP · DESIGN / RESEARCH ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_LONG_CHAT_PERFORMANCE_RESEARCH_CHARTER.md`
- `docs/SIMCORE_LONG_CHAT_LATENCY_ATTRIBUTION_MAP_IDEA.md`
- `docs/SIMCORE_LONG_CHAT_EXISTING_TIMING_EVIDENCE_INVENTORY_IDEA.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md`
- `docs/SIMCORE_LIVE_06406_VALIDATION.md`
- `docs/SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06402.md`
- `docs/SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06405.md`
- production authority: `release-simcore` v0.64.7 source

---

## 1. Purpose

Refine the long-chat performance model around SnapshotStore using the actual production source boundary rather than treating all Store latency as one opaque bucket.

Question:

```text
When diagnostics report TURN_STORAGE or OUT_STORAGE,
what exact Store operation does that timing represent,
and what Store work is outside that critical-path number?
```

This is a design/research document only.

It does not authorize:

```text
new timing instrumentation
SnapshotStore changes
backend changes
new counters
new timers
new Store call sites
optimization
work-branch implementation
release-simcore deployment
```

---

## 2. Source-grounded SnapshotStore write boundary

Production v0.64.7 `SnapshotStore.save()` and `saveTurn()` already expose three distinct internal write phases when a metric object is supplied:

```text
STORE_SERIALIZE_LOCAL
= JSON.stringify(...)
= metric.serializeMs

STORE_BACKEND_SET
= await backend.set(key, payload)
= metric.setMs

STORE_RETENTION_PRUNE
= await _prune()
= metric.pruneMs
= only when opts.prune !== false
```

Therefore the correct conceptual write pipeline is:

```text
state object
   ↓
JSON.stringify
   ↓
serialized payload
   ↓
backend.set await
   ↓
committed backend write boundary
   ↓ optional
retention prune
```

This is more precise than the earlier research shorthand:

```text
Store set wall time
→ serialization + host wait + prune all opaque
```

That shorthand is now superseded by source inspection for paths that provide the existing metric object.

---

## 3. Ordinary request path — saveTurn

The active request path calls conceptually:

```text
store.saveTurn(sendIndex, preState, sendState, {
  prune: false,
  metric
})
```

and preserves:

```text
turnSerializeMs
turnSetMs
turnPayloadChars
```

Therefore ordinary request timing already separates:

```text
TURN_SERIALIZE
from
TURN_STORAGE
```

and `TURN_STORAGE` is the measured `backend.set` await boundary, not the JSON serialization boundary.

Critical correction:

```text
Request hotspot: TURN_STORAGE · 1.010 s
```

means:

```text
backend.set boundary dominated the currently measured request buckets
```

It does NOT mean:

```text
JSON.stringify took 1.010 s
prune took 1.010 s
all Store work combined took exactly 1.010 s
```

Ordinary request `saveTurn` explicitly skips prune on the request-critical path.

---

## 4. Ordinary output path — out snapshot save

The normal output commit path calls conceptually:

```text
store.save('out', outIndex, state, {
  prune: false,
  metric
})
```

and preserves:

```text
outSerializeMs
outSetMs
outPruneMs = 0 on normal hot-path save
```

After the output state is committed, retention housekeeping may be scheduled separately.

Current source uses a deferred prune cadence rather than pruning every output:

```text
outIndex >= 17
AND outIndex % 17 == 0
AND not already/running
→ schedule store.prune() after output promise path
```

The current implementation uses a delayed asynchronous scheduling path where available and treats retention failure as non-fatal to committed output/state.

Therefore the recurring natural evidence:

```text
OUT_STORAGE ≈ 370-451 ms
```

cannot be attributed to SnapshotStore retention pruning on those ordinary output critical paths.

Classification:

```text
HYPOTHESIS: ordinary OUT_STORAGE spikes are caused by synchronous prune
→ DISMISSED_BY_SOURCE_PATH
```

This does not say pruning is free. It says ordinary output `OUT_STORAGE` timing is not the prune timer.

---

## 5. Retention / prune boundary

`SnapshotStore._prune()` is structurally different from a normal set.

It performs conceptually:

```text
backend.keys()
→ filter matching snapshot keys for this Store prefix
→ if retained count exceeds keep policy:
   sort by index
   compute keep set
   backend.remove(...) for old entries
```

The Store already records bounded key-scan metadata through `lastKeyScan` for operations such as prune / historical lookup.

Therefore prune belongs to a separate performance family:

```text
STORE_RETENTION_SCAN
STORE_RETENTION_DELETE
```

rather than being silently folded into ordinary `STORE_BACKEND_SET`.

For future research, key-scan and removal cost should be analyzed only on paths where prune actually executes.

---

## 6. Genuine manual-edit rebuild differs from the ordinary hot path

The genuine manual-edit reconcile path is not equivalent to an ordinary request `saveTurn` or ordinary output save.

Current reconcile detail already tracks multiple sub-boundaries including:

```text
fingerprintMs
savedOutLoadMs
sendLoadMs
prepareMs
finalizeMs
clockRepairMs
stateSyncMs
outSerializeMs
outSetMs
outPruneMs
```

Some reconcile save calls use the normal Store default where prune is not explicitly disabled.

Therefore a genuine edit sample such as:

```text
MANUAL_EDIT_REBUILT · 12.012 s
```

must NOT be decomposed using the ordinary request/output assumption:

```text
prune is always deferred
```

The correct rule is:

```text
ordinary request/output hot path
→ prune excluded/deferred by explicit source path

genuine edit / compatibility repair paths
→ inspect actual reconcile detail and save options
→ prune may be part of the measured reconcile boundary
```

Even here, the current 11.678-12.012 s live specimens do not prove Store prune or Store set dominates the rebuild. The path has multiple independently timed stages and must be attributed from actual detail evidence.

---

## 7. Store read boundary

SnapshotStore reads are structurally:

```text
backend.get(key)
→ JSON.parse(raw)
```

For bundled turn snapshots, `load(pre/send)` first attempts `loadTurn(index)` and may fall back to the legacy phase key.

Current higher-level request/reconcile timing already exposes some inclusive load boundaries such as:

```text
preLoadMs
savedOutLoadMs
sendLoadMs
stateLoadMs / state source
```

But the Store itself does not currently split those load boundaries into:

```text
STORE_BACKEND_GET
vs
STORE_PARSE_LOCAL
```

Therefore the refined classification is:

```text
Store read wall-time boundary
= PARTIALLY AVAILABLE at higher-level call sites

backend get vs JSON parse split
= MISSING
```

This supersedes the stronger earlier shorthand that SnapshotStore read latency was entirely missing.

---

## 8. Timing type / ownership contract

Use these meanings in this research track.

### STORE_SERIALIZE_LOCAL

```text
producer: SnapshotStore save/saveTurn
operation: JSON.stringify
class: LOCAL_SERIALIZATION_BOUNDARY
```

It is a measured wall-time span around local serialization.

Do not call it pure CPU time because browser scheduling/GC can still affect wall time.

### STORE_BACKEND_SET

```text
producer: SnapshotStore save/saveTurn
operation: awaited backend.set
class: EXTERNAL/ADAPTER_BOUNDARY
```

It proves elapsed time across the backend write call.

It does not by itself identify whether the elapsed time is:

```text
host IPC
plugin storage backend
browser persistence
bridge overhead
scheduler delay
other backend-owned work
```

### STORE_RETENTION_PRUNE

```text
producer: SnapshotStore retention path
operation: keys scan + conditional old-key removals
class: HOUSEKEEPING_BOUNDARY
```

It must be analyzed separately from ordinary set latency.

### STORE_LOAD_BOUNDARY

```text
producer: higher-level caller timing today
operation: SnapshotStore load / loadTurn / related lookup
class: INCLUSIVE_READ_BOUNDARY
```

Internal get-vs-parse causality remains unresolved.

---

## 9. Current evidence implications

### 9.1 Ordinary Store dominance is narrower than previously phrased

Natural v0.64.6 evidence repeatedly shows request `TURN_STORAGE` dominating measured request time and output `OUT_STORAGE` dominating measured output time.

After source inspection, the stronger supported statement is:

```text
ordinary backend.set boundary dominance
= RECURRENT DIRECT EVIDENCE
```

not merely:

```text
opaque Store subsystem dominance
```

### 9.2 Serialization is already separately measurable

The existing source already has:

```text
turnSerializeMs
outSerializeMs
edit outSerializeMs
```

Therefore no new timer should be proposed merely to separate ordinary JSON serialization from ordinary backend set.

### 9.3 Ordinary prune is not the primary hot-path explanation

Because ordinary request/output saves set `prune:false` and output retention is scheduled separately:

```text
ordinary storage hotspot
→ do not blame prune
```

### 9.4 Backend set causality is still unresolved

Even after this decomposition:

```text
backend.set = 400 ms
```

does not tell us why the backend call takes 400 ms.

The next research layer should distinguish correlations such as:

```text
payload size
same-chat retained Store population
request/output phase
runtime/reload state
cadence
host/backend variance
```

without yet adding implementation instrumentation.

---

## 10. Hypothesis ledger after source decomposition

```text
H1 · Ordinary JSON serialization is the same thing as TURN_STORAGE/OUT_STORAGE
→ DISMISSED_BY_SOURCE

H2 · Ordinary SnapshotStore prune causes the repeated request/output storage hotspots
→ DISMISSED_BY_SOURCE_PATH

H3 · Awaited backend.set is the direct measured boundary behind ordinary TURN_STORAGE/OUT_STORAGE
→ SUPPORTED_BY_SOURCE + LIVE DIAGNOSTICS

H4 · backend.set slowness is caused by payload size
→ UNPROVEN

H5 · backend.set slowness is caused by host/backend persistence or IPC
→ PLAUSIBLE / UNPROVEN

H6 · genuine-edit rebuild latency is primarily Store write/prune
→ UNPROVEN; detail fields exist but live breakdown must be inspected

H7 · Store reads are irrelevant
→ UNPROVEN; higher-level load boundaries exist and internal get/parse split is missing
```

---

## 11. Research correction to Existing Timing Evidence Inventory

This source inspection narrows two earlier inventory statements.

Earlier research wording treated serialization inside ordinary Store write as `MISSING / AMBIGUOUS` and SnapshotStore read timing as broadly `MISSING`.

Refined authority from production source:

```text
ordinary write serialization vs backend.set
→ ALREADY SEPARATED / AVAILABLE DIRECTLY IN EXISTING PERF DETAIL

ordinary request/output prune
→ EXCLUDED FROM CURRENT HOT-PATH SAVE

selected Store load wall times
→ AVAILABLE AT HIGHER-LEVEL CALL BOUNDARIES

backend.get vs JSON.parse
→ STILL MISSING
```

This document is the later source-grounded refinement for those exact claims. The older inventory remains useful for its live-evidence catalog but should not be used to re-collapse these source-confirmed boundaries.

---

## 12. No implementation consequence yet

The finding that `backend.set` is the measured dominant ordinary Store boundary does not authorize changing Store or the backend.

Research sequence remains:

```text
source decomposition
→ existing live evidence correlation
→ variance / scaling hypotheses
→ required-vs-avoidable judgment
→ candidate design
→ completeness audit
→ STOP BEFORE IMPLEMENTATION
```

No performance fix belongs in M2-3 or any current production live gate.

---

## 13. Current classification

```text
SIMCORE_LONG_CHAT_STORE_BOUNDARY_DECOMPOSITION
= HIGH VALUE
= SOURCE-GROUNDED ATTRIBUTION
= ORDINARY WRITE ALREADY SPLIT: SERIALIZE / BACKEND_SET
= ORDINARY PRUNE OUTSIDE HOT PATH
= MANUAL-REBUILD STORE PATH MUST BE TREATED SEPARATELY
= READ GET-vs-PARSE STILL UNRESOLVED
= NO NEW TIMER REQUIRED FOR WRITE SERIALIZE-vs-SET
= DESIGN / RESEARCH ONLY
= NO IMPLEMENTATION
= NO RUNTIME CHANGE
```
