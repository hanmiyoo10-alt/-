# SimCore Long-Chat Store Backend Set Variance Model — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · VARIANCE / ATTRIBUTION MODEL · DESIGN / RESEARCH ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_LONG_CHAT_PERFORMANCE_RESEARCH_CHARTER.md`
- `docs/SIMCORE_LONG_CHAT_LATENCY_ATTRIBUTION_MAP_IDEA.md`
- `docs/SIMCORE_LONG_CHAT_EXISTING_TIMING_EVIDENCE_INVENTORY_IDEA.md`
- `docs/SIMCORE_LONG_CHAT_STORE_BOUNDARY_DECOMPOSITION_IDEA.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md`
- `docs/SIMCORE_LIVE_06406_VALIDATION.md`
- production authority: `release-simcore` v0.64.7 source

---

## 1. Purpose

Design a conservative model for one observed long-chat performance question:

```text
Why can the ordinary SnapshotStore backend.set boundary
vary from low hundreds of milliseconds to roughly one second
across apparently similar long-chat turns?
```

This document does not attempt to identify the root cause from insufficient evidence.

Its job is to define:

```text
which samples are comparable
which dimensions may explain variance
which hypotheses are already weakened by evidence
which causes remain outside SimCore authority
what must NOT be inferred from one slow set
```

The model is prior to any new instrumentation or optimization.

---

## 2. Research-only freeze

This document does not authorize:

```text
new timers
new counters
new backend probes
pluginStorage wrapping
SnapshotStore changes
payload-shape changes
storage key changes
write batching
write skipping
write coalescing
new caching
new persistence backend
work-branch implementation
release-simcore deployment
```

No production code is changed by this research.

---

## 3. Source-grounded backend boundary

Production v0.64.7 resolves SnapshotStore persistence through:

```text
SnapshotStore
→ runtime host storageBackend()
→ Risuai.pluginStorage.setItem(key, value)
```

Therefore the currently measured ordinary write boundary is:

```text
STORE_BACKEND_SET
= elapsed wall time across awaited Risuai.pluginStorage.setItem(...)
```

This supports attribution only to the host/plugin-storage call boundary.

It does NOT by itself identify time spent inside that boundary as:

```text
SimCore CPU
host IPC
PocketRisu/RisuAI bridge work
browser persistence
filesystem/database work
backend durability
scheduler delay
GC
contention with another plugin
```

Those are possible internal/external explanations, not established facts.

---

## 4. Strong existing contradiction to a payload-only model

The v0.64.2 runtime watch contains adjacent natural request specimens in the same runtime generation:

```text
inactive specimen:
19,945 chars · backend set 680 ms

healthy active C:
22,253 chars · backend set 181 ms · set/1K 8.13 ms
```

The second payload is larger while its set boundary is much faster.

Therefore the following deterministic model is directly insufficient:

```text
set latency = function(payload chars only)
```

Classification:

```text
SIMPLE_PAYLOAD_ONLY_MODEL
= CONTRADICTED BY ADJACENT NATURAL EVIDENCE
```

This does NOT prove payload size is irrelevant.

Payload size may still contribute statistically inside a sufficiently homogeneous sample family. It simply cannot explain the observed variance by itself.

---

## 5. Why set/1K must remain descriptive

Existing request diagnostics expose:

```text
payload chars
set ms
set ms / 1K chars
```

`set/1K` is useful as a descriptive normalization aid.

It is not yet a backend cost law.

Do not assume:

```text
constant set/1K
linear latency by payload size
larger payload must always be slower
```

until a sufficiently homogeneous natural sample set supports that relation.

The v0.64.2 adjacent pair already shows substantial non-size variance.

---

## 6. Comparison-family rule

Before comparing two backend-set samples, classify them by a bounded comparison family.

Initial design dimensions:

```text
WRITE_CONTEXT
= ORDINARY_TURN
| ORDINARY_OUT
| EDIT_REBUILD_OUT
| COMPATIBILITY_REPAIR_OUT
| LEGACY_OR_BOOTSTRAP
| UNKNOWN

RUNTIME_CLASS
= STEADY_SAME_RUNTIME
| FIRST_AFTER_RELOAD
| EARLY_AFTER_RELOAD
| UNKNOWN

MODE_FAMILY
= A
| B
| C
| INACTIVE
| UNKNOWN

WRITE_KEY_CLASS
= TURN_NEW_INDEX
| OUT_NEW_INDEX
| OUT_EXISTING_INDEX_REWRITE
| LEGACY_KEY
| UNKNOWN

RETENTION_CONTEXT
= NO_INLINE_PRUNE
| INLINE_PRUNE_POSSIBLE
| DEFERRED_PRUNE_RECENTLY_SCHEDULED
| UNKNOWN
```

Payload characters are a numeric comparison dimension where already available, not a family identity by themselves.

Do not explode the family key with every semantic flag. Add a new segmentation axis only when evidence shows it materially changes backend-set behavior.

---

## 7. Phase must not be collapsed

Ordinary request and ordinary output both call the same backend API, but they persist different SnapshotStore key/value shapes and occur at different points in the host lifecycle.

Therefore initially compare:

```text
ORDINARY_TURN ↔ ORDINARY_TURN
ORDINARY_OUT  ↔ ORDINARY_OUT
```

before treating them as one population.

Cross-phase comparison may be useful later, but only after establishing that phase does not explain meaningful variance.

Important evidence limitation:

```text
ordinary turn save
→ serialized payload chars already exposed

ordinary out save
→ outSerializeMs / outSetMs exposed
→ exact serialized out-state payload chars are not currently an equivalent direct diagnostic field
```

Therefore payload-size correlation is currently stronger on the request/turn side than the output side.

Do not substitute visible model-output characters for serialized SnapshotStore state size.

---

## 8. Candidate variance dimensions

These are research hypotheses, not causal claims.

### V1 · Payload size

Question:

```text
Within the same write context/runtime family,
does larger serialized payload tend to increase set wall time?
```

Current status:

```text
CONTRIBUTOR POSSIBLE
PAYLOAD-ONLY EXPLANATION REJECTED
```

### V2 · Request-vs-output phase

Question:

```text
Does pluginStorage.setItem behave differently
when invoked during request preparation versus output commit?
```

Potential reasons are external/host-level and remain unspecified.

Current status: `UNPROVEN`.

### V3 · Reload boundary

Question:

```text
Are first/early writes after runtime reload systematically slower
than steady same-runtime writes?
```

Current status: `UNPROVEN`.

Do not infer this merely because another reload-related path is expensive.

### V4 · Write-key class

Ordinary forward progression normally creates new indexed turn/out keys, while genuine-edit repair may rewrite an existing out index.

Question:

```text
Does new-key creation differ materially from overwrite behavior?
```

Current status: `UNPROVEN / SEPARATE CONTEXT REQUIRED`.

### V5 · Retained storage population

Question:

```text
Does pluginStorage.setItem latency vary with the amount of
already-retained plugin storage / SnapshotStore population?
```

SnapshotStore bounds retention through periodic prune, but ordinary set does not itself scan keys.

Any population effect would therefore belong to backend behavior, not ordinary SnapshotStore set algorithm work.

Current status: `PLAUSIBLE / UNVERIFIED`.

### V6 · Deferred prune overlap

Ordinary request/output saves exclude inline prune, but output retention may schedule `store.prune()` asynchronously on its cadence.

Therefore a separate possible interference case exists:

```text
deferred prune from an earlier output
may overlap in wall-clock time with a later backend operation
```

This is NOT proof that overlap currently occurs or explains any observed spike.

Useful existing discriminator:

```text
output detail already knows whether deferred prune was scheduled
```

Current status: `NARROW CANDIDATE / UNPROVEN`.

### V7 · Write cadence

Question:

```text
Does time since the previous pluginStorage write
correlate with set latency?
```

Examples could include backend batching, wake-up, flush, or contention behavior, but no such mechanism is currently established.

Exact set-to-set cadence is not yet a canonical existing diagnostic fact.

Current status: `MISSING EVIDENCE / NO NEW TIMER YET`.

### V8 · Host/backend external variance

Even under nearly identical SimCore inputs, awaited `pluginStorage.setItem` may vary because the boundary includes work outside SimCore-owned computation.

Conceptual class:

```text
BACKEND_EXTERNAL_VARIANCE
```

This is the safe residual explanation when local dimensions do not account for the change.

It must not be converted into a specific PocketRisu/browser/storage-engine claim without direct evidence.

### V9 · Browser/event-loop interference

A wall-time span may include scheduling delay or GC around an awaited host call.

Current status: `POSSIBLE / UNOBSERVED / DO NOT ATTRIBUTE`.

No current SimCore evidence isolates CPU, GC, scheduler, or backend wait time.

---

## 9. Proposed research sample shape

For repository analysis of already-existing/naturally supplied diagnostics, one conceptual sample can be represented as:

```ts
{
  runtimeGeneration,
  writeContext,
  runtimeClass,
  modeFamily,
  keyClass,
  sendIndex,
  outIndex,
  setMs,
  serializeMs,
  payloadChars,       // only when already available
  setPerKChars,       // descriptive only
  requestOrOutputTotalMs,
  hotspotShare,
  deferredPruneScheduled,
  editPath,
  snapshotUpdated,
  warnings,
  correctnessStatus
}
```

This is a research tuple, not a runtime schema proposal.

Do not add fields to production merely because they appear in this conceptual sample.

Missing fields remain `UNKNOWN` rather than being inferred.

---

## 10. Variance interpretation vocabulary

Use narrow classifications rather than immediately naming a defect.

```text
STABLE_WITHIN_FAMILY
= comparable samples stay in a narrow observed range

HIGH_VARIANCE_WITHIN_FAMILY
= comparable samples show large wall-time spread

SIZE_CORRELATED_CANDIDATE
= payload relation appears repeatedly inside one family

PHASE_CORRELATED_CANDIDATE
= TURN/OUT populations differ repeatedly after other obvious factors are bounded

RELOAD_CORRELATED_CANDIDATE
= first/early post-reload samples repeatedly differ from steady samples

PRUNE_OVERLAP_CANDIDATE
= spikes repeatedly align with independently scheduled retention work

BACKEND_EXTERNAL_VARIANCE_CANDIDATE
= strong variance remains after available SimCore-owned dimensions fail to explain it

INSUFFICIENT_SAMPLE
= no defensible population-level conclusion

CONFOUNDED_SAMPLE
= multiple important dimensions changed together
```

None of these labels authorizes optimization.

---

## 11. Baseline design

Do not use one universal global backend-set threshold.

A future evidence baseline, if needed, should be family-local and robust to spikes.

Preferred descriptive statistics:

```text
sample count
median
p75 / p90 / p95 when sample volume supports them
min / max for bounded diagnostic review
payload range where known
```

Avoid relying on lifetime mean alone because occasional 1-second-class spikes can distort it.

Do not freeze numeric slow thresholds during this design phase.

Natural long-chat evidence must establish what ordinary distributions actually look like.

---

## 12. Anti-causality rules

The following conclusions are forbidden from one or a few slow samples:

```text
slow set
→ Store algorithm bug              ❌

slow set
→ payload too large                ❌

slow set
→ browser storage is broken        ❌

slow set
→ PocketRisu IPC is slow           ❌

slow set
→ prune caused it                  ❌ ordinary inline path already excludes prune

slow set
→ SnapshotStore should skip write  ❌ correctness/durability boundary
```

Correct statement:

```text
slow set
→ STORE_BACKEND_SET wall-time spike observed
→ compare within family
→ preserve context
→ seek recurrence/correlation
```

---

## 13. Durability and correctness boundary

The current out snapshot is authoritative persisted SimCore state before COMMITTED behavior proceeds.

Performance research must not weaken this invariant merely because backend set is expensive.

Forbidden optimization shortcuts unless a future separately accepted correctness design proves them safe:

```text
fire-and-forget authoritative snapshot write
skip ordinary snapshot write
commit before persistence resolves
silently drop a slow write
reuse stale snapshot because write is expensive
move authoritative Core state solely into volatile memory
```

Correctness and state durability remain above performance convenience.

---

## 14. Existing-evidence analysis order

Before requesting any new instrumentation:

```text
1. collect already-preserved natural set samples
2. separate TURN / OUT / EDIT contexts
3. group by runtime generation and reload class where known
4. compare request TURN payload chars against setMs
5. identify adjacent same-family variance
6. mark deferred-prune schedule context where already available
7. check whether spikes recur at similar semantic/host boundaries
8. leave unexplained residual as UNKNOWN / BACKEND_EXTERNAL_VARIANCE_CANDIDATE
```

Only after this reuse pass may a later design ask whether one missing discriminator is worth measuring.

---

## 15. Current hypothesis ledger

```text
H1 · Ordinary TURN/OUT hotspot is JSON serialization
→ DISMISSED BY SOURCE; serialization already separately timed

H2 · Ordinary inline prune causes recurring backend-set hotspot
→ DISMISSED BY SOURCE PATH

H3 · payload size alone determines backend-set latency
→ CONTRADICTED BY ADJACENT v0.64.2 NATURAL EVIDENCE

H4 · payload size contributes within homogeneous families
→ OPEN / TESTABLE WITH EXISTING TURN EVIDENCE

H5 · TURN and OUT belong to one identical latency population
→ UNPROVEN

H6 · reload state contributes to backend-set variance
→ UNPROVEN

H7 · deferred prune overlap contributes to occasional later spikes
→ NARROW OPEN CANDIDATE / NOT ESTABLISHED

H8 · retained pluginStorage population contributes to set latency
→ PLAUSIBLE / UNVERIFIED

H9 · residual variance is host/backend-owned rather than SimCore compute
→ PLAUSIBLE, BUT SPECIFIC INTERNAL CAUSE UNVERIFIED

H10 · slow backend set justifies weakening awaited durability
→ REJECT / CORRECTNESS BOUNDARY
```

---

## 16. What this design adds

The performance research stack now distinguishes:

```text
Latency Attribution Map
= where time belongs at a broad request/output boundary

Existing Timing Evidence Inventory
= what existing evidence already exposes

Store Boundary Decomposition
= serialize vs backend.set vs prune vs read boundary

Store Backend Set Variance Model
= why the same backend.set boundary may vary and how to compare it safely
```

No layer duplicates another timing producer.

---

## 17. Next research candidate

After this variance model, the next high-value Store-side research question is not yet an optimization.

Candidate:

```text
STORE SET SAMPLE CORRELATION STUDY
= mine existing repository/live specimens
= build a small evidence table from already-recorded diagnostics
= test payload-only, phase, same-runtime and adjacent-turn hypotheses
= identify the first truly missing discriminator
```

This would remain repository analysis only and would not add runtime instrumentation.

---

## 18. Current classification

```text
SIMCORE_LONG_CHAT_STORE_BACKEND_SET_VARIANCE_MODEL
= HIGH VALUE
= BACKEND-BOUNDARY VARIANCE RESEARCH
= PAYLOAD-ONLY MODEL REJECTED
= FAMILY-FIRST COMPARISON
= PHASE / RELOAD / KEY-CLASS / PRUNE-OVERLAP AWARE
= EXTERNAL AUTHORITY PRESERVING
= DURABILITY BOUNDARY PRESERVED
= EXISTING-EVIDENCE FIRST
= DESIGN / RESEARCH ONLY
= NO IMPLEMENTATION
= NO RUNTIME CHANGE
```
