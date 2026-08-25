# SimCore Long-Chat Store Set Sample Correlation Study — 2026-08-25

Date: 2026-08-25
Status: `EXISTING-EVIDENCE CORRELATION · DESIGN / RESEARCH ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_LONG_CHAT_PERFORMANCE_RESEARCH_CHARTER.md`
- `docs/SIMCORE_LONG_CHAT_LATENCY_ATTRIBUTION_MAP_IDEA.md`
- `docs/SIMCORE_LONG_CHAT_EXISTING_TIMING_EVIDENCE_INVENTORY_IDEA.md`
- `docs/SIMCORE_LONG_CHAT_STORE_BOUNDARY_DECOMPOSITION_IDEA.md`
- `docs/SIMCORE_LONG_CHAT_STORE_BACKEND_SET_VARIANCE_MODEL_IDEA.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md`
- `docs/SIMCORE_LIVE_06406_VALIDATION.md`

---

## 1. Purpose

Execute the next step frozen by the Store Backend Set Variance Model:

```text
STORE SET SAMPLE CORRELATION STUDY
= mine existing repository/live specimens
= build a small evidence table from already-recorded diagnostics
= test payload-only, phase, same-runtime and adjacent-turn hypotheses
= identify the first truly missing discriminator
```

This study uses only evidence already preserved in the repository.

It does not authorize:

```text
new runtime timers
new counters
new backend probes
SnapshotStore changes
pluginStorage wrapping
payload-shape changes
write batching / skipping / coalescing
new persistence backend
work-branch implementation
release-simcore deployment
```

The goal is attribution quality, not optimization.

---

## 2. Source and timing boundary

Production source inspection already established that ordinary request/output storage timings mean:

```text
TURN_STORAGE / OUT_STORAGE
= STORE_BACKEND_SET
= wall time across awaited backend.set
= ultimately Risuai.pluginStorage.setItem(key, value)
```

Ordinary serialization is measured separately, and ordinary request/output hot-path saves use `prune:false`.

Therefore this study compares backend-set wall-time samples only.

It does not reinterpret them as:

```text
JSON.stringify CPU time
retention-prune time
PocketRisu IPC time
browser persistence time
filesystem/database time
scheduler/GC time
```

Those internal causes remain unverified unless separately evidenced.

---

## 3. Evidence table

### 3.1 v0.64.2 same-runtime request specimens

Runtime generation:

```text
mt4bcgc3-5556z8
```

Preserved samples:

| Sample | Request context | Mode/runtime state | Payload chars | backend.set | Hotspot share | Notes |
|---|---|---|---:|---:|---:|---|
| 06402-R1 | preceding natural request | INACTIVE / handshake miss family | 19,945 | 680 ms | 90.5% | same runtime generation; correctness failed closed, no storage corruption |
| 06402-R2 | `@2064` healthy request | C / ACTIVE | 22,253 | 181 ms | 85.4% | `SAME_FAST`, warnings 0, output committed |

The healthy C output for `@2065` also preserves:

```text
OUT_STORAGE = 341 ms
output hotspot share = 93.4%
```

### 3.2 v0.64.6 same-runtime B sequence

Runtime generation:

```text
mt5hq654-5fn0so
```

Request-side ordinary Store samples:

| Turn | Mode | backend.set | Hotspot share | Reconcile | Notes |
|---|---|---:|---:|---|---|
| `@2130` | B_CONTINUE | 291 ms | 85.1% | SAME_FAST 0 ms | healthy |
| `@2132` | B_CONTINUE | 1.010 s | 93.8% | SAME_FAST 0 ms | healthy; large set outlier |
| `@2134` | B_CONTINUE | 356 ms | 86.6% | SAME_FAST 0 ms | healthy |
| `@2136` | B_CONTINUE | 311 ms | 86.1% | SAME_FAST 1 ms | healthy; output later representation mismatch |
| `@2138` | B_END | 410 ms | 92.6% | REPRESENTATION_FAST_RECONCILED 1 ms | healthy B_END closure |

Output-side ordinary Store samples from the same sequence:

| Turn | Preceding mode | backend.set | Hotspot share | Notes |
|---|---|---:|---:|---|
| `@2131` | B_CONTINUE | 424 ms | 95.3% | healthy |
| `@2133` | B_CONTINUE | 418 ms | 95.2% | healthy |
| `@2135` | B_CONTINUE | 376 ms | 94.2% | healthy |
| `@2137` | B_CONTINUE | 451 ms | 94.7% | representation mismatch observed after commit, warnings 0 |
| `@2139` | B_END | 370 ms | 95.1% | closure complete, exact output representation |

### 3.3 v0.64.6 later ordinary C specimen

Second ordinary C after the post-B_END bridge:

```text
@2142 -> @2143
Mode C
same runtime generation mt5hq654-5fn0so
SAME_FAST
warnings 0
```

Preserved storage timing:

| Turn | Context | Payload chars | backend.set | Hotspot share |
|---|---|---:|---:|---:|
| `@2142` | ordinary C request | 22,461 | 381 ms | 88.0% |
| `@2143` | ordinary C output | not equivalently preserved | 384 ms | 95.3% |

---

## 4. Same-family variance — strongest current result

The cleanest existing same-family subset is the first four v0.64.6 B_CONTINUE requests:

```text
same runtime generation
same release
same B_CONTINUE mode family
ordinary forward request path
ordinary request save uses prune:false
SAME_FAST reconcile
warnings 0
```

Backend-set values:

```text
291 ms
1010 ms
356 ms
311 ms
```

Descriptive statistics:

```text
n      = 4
median = 333.5 ms
min    = 291 ms
max    = 1010 ms
range  = 719 ms
max / median ~= 3.03x
```

Classification:

```text
B_CONTINUE_TURN_BACKEND_SET
= HIGH_VARIANCE_WITHIN_FAMILY
= DIRECT EXISTING EVIDENCE
```

This is important because several candidate explanations are already held constant at the available evidence level:

```text
release
runtime generation
mode family
ordinary request write context
inline prune policy
Edit Reconcile fast-path class
```

Therefore those dimensions alone do not explain the `@2132` 1.010-second sample.

This does not prove the cause is external to SimCore. Important discriminators remain unavailable for this exact four-sample set.

---

## 5. Same-runtime output comparison

The matching first four B_CONTINUE output samples are:

```text
424 ms
418 ms
376 ms
451 ms
```

Descriptive statistics:

```text
n      = 4
median = 421 ms
min    = 376 ms
max    = 451 ms
range  = 75 ms
max / median ~= 1.07x
```

Classification:

```text
B_CONTINUE_OUT_BACKEND_SET
= RELATIVELY STABLE WITHIN THIS SMALL FAMILY
= DIRECT EXISTING EVIDENCE
```

The contrast is material:

```text
TURN range = 719 ms
OUT  range = 75 ms
```

But the sample count is small and TURN/OUT persist different SnapshotStore shapes at different lifecycle points.

Therefore the supported conclusion is:

```text
TURN and OUT should remain separate comparison populations
```

not:

```text
request phase causes backend latency variance
```

Phase causality remains unproven.

---

## 6. Payload-only hypothesis

### 6.1 Deterministic payload-only model remains rejected

The v0.64.2 same-runtime adjacent pair is:

```text
19,945 chars -> 680 ms
22,253 chars -> 181 ms
```

The larger payload is substantially faster.

Therefore:

```text
set latency = deterministic monotonic function(payload chars only)
```

remains contradicted by direct natural evidence.

The pair is not otherwise homogeneous because one request is INACTIVE while the other is active Mode C.

So the pair cannot establish that payload size has zero contribution.

### 6.2 Cross-release similar-size comparison also rejects sufficiency

Two active Mode-C request specimens with similar serialized turn size are:

```text
v0.64.2 @2064
22,253 chars -> 181 ms

v0.64.6 @2142
22,461 chars -> 381 ms
```

Payload-size ratio is approximately:

```text
22,461 / 22,253 ~= 1.009
```

while set-time ratio is approximately:

```text
381 / 181 ~= 2.10
```

This comparison is cross-release and cross-runtime, so it is confounded and cannot identify cause.

It does further demonstrate that similar payload size alone is insufficient to predict backend-set wall time across broad contexts.

### 6.3 Homogeneous payload contribution remains unresolved

The strongest homogeneous v0.64.6 B_CONTINUE request sequence does not preserve the exact payload characters for `@2130`, `@2132`, `@2134`, and `@2136` in the current repository evidence summaries.

Therefore hypothesis:

```text
H4 · payload size contributes within homogeneous families
```

remains:

```text
OPEN
NOT TESTABLE FROM THE CURRENTLY PRESERVED FOUR-SAMPLE B_CONTINUE SUMMARY
```

This is now the highest-value missing discriminator for the `@2132` outlier.

Important: turn payload characters already exist in current diagnostics. Closing this gap does **not** require new runtime instrumentation. It requires preserving the full field on future natural specimens, or locating an already-existing raw diagnostic if one becomes available.

---

## 7. Short-run retained-population hypothesis

Across the same v0.64.6 B sequence, turn/output indices advance naturally and SnapshotStore retains additional current snapshots between samples.

Observed B_CONTINUE request values:

```text
291 -> 1010 -> 356 -> 311 ms
```

Observed B_CONTINUE output values:

```text
424 -> 418 -> 376 -> 451 ms
```

There is no simple monotonic increase across this short sequence.

Therefore the narrow model:

```text
later turn in same runtime
→ necessarily slower backend.set because retained population increased
```

is not supported by this sequence.

However the actual retained pluginStorage population is not directly quantified at every sample, and backend retention effects may be nonlinear or backend-specific.

Classification:

```text
SIMPLE_MONOTONIC_POPULATION_MODEL
= WEAKENED BY SAME-RUNTIME SEQUENCE

RETAINED_POPULATION CONTRIBUTION
= STILL UNVERIFIED
```

Do not infer backend implementation behavior from this absence of monotonicity.

---

## 8. Reload hypothesis

The v0.64.6 B samples are all from one runtime generation after startup, and the studied high-latency `@2132` occurs between neighboring ordinary B_CONTINUE samples in that same generation.

Therefore the `@2132` spike does not require a runtime-generation transition to occur.

Supported conclusion:

```text
reload boundary
= NOT NECESSARY for backend-set spike
```

This is weaker than:

```text
reload has no effect on backend-set latency
```

because no matched first-after-reload vs steady sample population has been preserved for this question.

Classification:

```text
H6 reload contribution
= UNRESOLVED

reload-only explanation of @2132
= NOT SUPPORTED
```

---

## 9. Deferred-prune overlap hypothesis

Source inspection established:

```text
ordinary request/output save
→ inline prune disabled
```

but output housekeeping may schedule deferred retention work separately.

The existing summarized `@2130..@2139` evidence does not preserve, beside every Store-set sample, whether a deferred prune had just been scheduled or was potentially overlapping.

Therefore:

```text
H7 deferred prune overlap contribution
= NOT TESTABLE FROM CURRENT SUMMARY
```

This is a secondary missing discriminator.

It ranks below TURN payload characters because:

```text
payloadChars already exists as a natural request diagnostic field
and directly tests the strongest remaining local scaling hypothesis
```

No new prune instrumentation is justified yet.

---

## 10. Write cadence hypothesis

Exact set-to-set cadence is not a canonical preserved performance fact for the studied samples.

The current evidence sequence establishes ordering but not a clean backend-write interval suitable for correlation.

Therefore:

```text
H7/V7 write cadence
= MISSING EVIDENCE
```

Do not add a new timer yet.

Cadence becomes worth measuring only if:

```text
1. homogeneous payload-aware samples still show large unexplained variance
2. existing deferred-prune/reload/context fields also fail to explain it
3. natural recurrence shows the difference is materially user-visible
```

---

## 11. External/backend variance residual

The `@2132` sample is already difficult to explain using the currently held-constant local dimensions:

```text
same release
same runtime
same B_CONTINUE mode
same ordinary request phase
same fast reconcile class
no inline prune
healthy semantics
```

But payload size, exact host-write cadence, and deferred-prune overlap are not all available for that exact sample family.

Therefore the correct current residual classification is:

```text
BACKEND_EXTERNAL_VARIANCE_CANDIDATE
= PLAUSIBLE
= NOT YET PROMOTABLE TO ATTRIBUTED CAUSE
```

Do not sharpen this into:

```text
PocketRisu IPC problem
browser storage problem
pluginStorage implementation defect
GC/scheduler problem
```

without direct evidence.

---

## 12. Hypothesis disposition after correlation study

```text
H1 · ordinary TURN/OUT hotspot is JSON serialization
→ DISMISSED BY SOURCE

H2 · ordinary inline prune causes recurring hotspot
→ DISMISSED BY SOURCE PATH

H3 · payload size alone determines set latency
→ CONTRADICTED

H4 · payload contributes inside homogeneous TURN families
→ OPEN / FIRST MISSING DISCRIMINATOR = exact payloadChars on v0.64.6 B_CONTINUE samples

H5 · TURN and OUT are one identical population
→ DO NOT COLLAPSE / observed variance shapes differ materially in current small sample

H6 · reload contributes to set latency
→ UNRESOLVED; reload not necessary for @2132 spike

H7 · deferred prune overlap contributes to occasional spikes
→ OPEN / SECONDARY MISSING CONTEXT

H8 · retained population contributes
→ UNVERIFIED; simple monotonic short-run model weakened

H9 · unexplained residual is host/backend-owned
→ PLAUSIBLE CANDIDATE / NOT ATTRIBUTED

H10 · slow set justifies weakening awaited durability
→ REJECT / CORRECTNESS BOUNDARY
```

---

## 13. First truly missing discriminator

The highest-value next evidence is now specific:

```text
For a future natural same-runtime ordinary TURN sequence,
preserve together:

runtime generation
mode
turn index
payloadChars
serializeMs
backend setMs
request total / hotspot share
Edit Reconcile path
warnings/correctness state
```

Most of these fields already exist in current diagnostics.

The critical missing item in the strongest existing v0.64.6 four-sample family is:

```text
exact TURN payloadChars per sample
```

Therefore the next evidence action is **capture quality**, not runtime instrumentation.

Do not change production solely to collect this field.

If future natural diagnostics provide payload-aware same-family samples and substantial variance remains after size correlation is tested, then revisit the next missing discriminator in this order:

```text
1. deferred-prune context already available in output detail where possible
2. reload/steady classification
3. existing key-class / overwrite-vs-new context
4. only then consider whether write cadence needs a narrowly designed measurement
```

---

## 14. No optimization candidate yet

This study does not identify an avoidable SimCore-owned operation responsible for the recurrent backend-set wall time.

Current strongest facts are:

```text
ordinary backend.set boundary can dominate local request/output latency
same-family request variance can be large
payload-only deterministic explanation is false
inline prune is not the ordinary hotspot
backend-set spike can occur without reload
cause inside host/backend boundary remains unresolved
```

Therefore:

```text
PERFORMANCE FIX CANDIDATE
= NOT YET JUSTIFIED
```

and:

```text
new runtime instrumentation
= NOT YET JUSTIFIED
```

The research track remains before the completeness-audit / implementation-decision boundary.

---

## 15. Current classification

```text
SIMCORE_LONG_CHAT_STORE_SET_SAMPLE_CORRELATION_STUDY
= HIGH VALUE
= EXISTING-EVIDENCE ONLY
= SAME-RUNTIME / SAME-MODE VARIANCE CONFIRMED
= TURN / OUT POPULATIONS KEPT SEPARATE
= PAYLOAD-ONLY MODEL CONTRADICTED
= RELOAD NOT REQUIRED FOR SPIKE
= SIMPLE MONOTONIC POPULATION MODEL WEAKENED
= BACKEND EXTERNAL VARIANCE PLAUSIBLE BUT UNATTRIBUTED
= FIRST MISSING DISCRIMINATOR IDENTIFIED
= NEXT STEP IS NATURAL CAPTURE QUALITY, NOT NEW INSTRUMENTATION
= NO OPTIMIZATION AUTHORITY
= NO IMPLEMENTATION
= NO RUNTIME CHANGE
```
