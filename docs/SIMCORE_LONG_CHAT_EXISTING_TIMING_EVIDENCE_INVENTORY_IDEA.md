# SimCore Long-Chat Existing Timing Evidence Inventory — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · EXISTING-EVIDENCE INVENTORY · DESIGN / RESEARCH ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_LONG_CHAT_PERFORMANCE_RESEARCH_CHARTER.md`
- `docs/SIMCORE_LONG_CHAT_LATENCY_ATTRIBUTION_MAP_IDEA.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md`
- `docs/SIMCORE_LIVE_06406_VALIDATION.md`
- `docs/SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06402.md`
- `docs/SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06405.md`
- `docs/SIMCORE_GUIDELINES.md`

---

## 1. Purpose

Inventory only the timing/performance evidence that SimCore already records or has already preserved in repository live evidence.

The question is:

```text
Before proposing any new instrumentation,
what can the current evidence already tell us,
and what can it not tell us?
```

This inventory is intentionally prior to instrumentation design.

It does not authorize:

```text
new timers
new counters
new performance probes
latest.js / install.js edits
SnapshotStore changes
Store optimization
manual-rebuild optimization
work-branch implementation
release-simcore deployment
```

Canonical research rule:

```text
REUSE EXISTING EVIDENCE FIRST
→ identify genuine information gaps
→ only later design the minimum instrumentation needed for those gaps
```

---

## 2. Evidence confidence vocabulary

Use four evidence classes.

```text
AVAILABLE_DIRECT
= current diagnostic/live evidence directly contains the timing fact

AVAILABLE_DERIVED
= a bounded relation can be derived from direct timings,
  but the derived value is not an independently measured phase

AMBIGUOUS_BOUNDARY
= elapsed wall time is visible but internal ownership/cause is not separable

MISSING
= reviewed existing evidence does not expose the required timing fact
```

Important:

```text
MISSING
!= zero cost

AMBIGUOUS_BOUNDARY
!= bug

AVAILABLE_DIRECT
!= proven optimization opportunity
```

---

## 3. Existing request-side timing evidence

### 3.1 Request total

Status: `AVAILABLE_DIRECT`

Natural diagnostics preserve total local request preparation time.

Example v0.64.2 active C:

```text
Request total: 213 ms
```

This is useful as the top-level local request-preparation wall-time boundary.

It does not by itself identify the responsible subsystem.

### 3.2 Turn storage payload size

Status: `AVAILABLE_DIRECT`

Existing diagnostics preserve the serialized turn-storage payload size in characters.

Example:

```text
Turn storage: 22,253 chars
```

This gives one useful scale axis for Store write evidence.

It is not equivalent to:

```text
chat-history length
SnapshotStore total retained size
serialized byte count
backend storage bytes
```

unless separately established.

### 3.3 Turn storage set wall time

Status: `AVAILABLE_DIRECT / AMBIGUOUS_BOUNDARY`

Example:

```text
Turn storage: 22,253 chars · set 181 ms
```

This proves that the Store write boundary consumed approximately that wall time.

It does **not** prove which internal cause produced the elapsed time.

Possible internal contributors remain unresolved by current evidence:

```text
serialization before host write
host storage/API wait
backend persistence latency
bridge/IPC overhead
JavaScript scheduling delay
GC/event-loop interference
multiple internal operations hidden behind one boundary
```

Therefore the correct current label is:

```text
STORE_WRITE_BOUNDARY_LATENCY
```

not:

```text
STORE_ALGORITHM_CPU_COST
```

### 3.4 Turn storage normalized set/1K

Status: `AVAILABLE_DIRECT`

Existing diagnostics can preserve a normalized write metric such as:

```text
set/1K 8.13 ms
```

This is useful for comparing different payload sizes.

However it must not yet be treated as a stable linear cost model.

Required caution:

```text
one set/1K sample
!= proof that write cost scales linearly with payload size
```

### 3.5 Request hotspot owner / time / share

Status: `AVAILABLE_DIRECT`

Examples:

```text
Request hotspot: TURN_STORAGE · 181 ms · 85.4%
Request hotspot: EDIT_RECONCILE · 12.012 s · 97.1%
```

This is high-value evidence because it identifies the dominant currently measured request-side boundary for one request.

But `hotspot` means:

```text
largest measured timing bucket
```

not necessarily:

```text
root causal bottleneck
```

An unmeasured phase cannot compete for hotspot ownership.

### 3.6 Edit Reconcile timing

Status: `AVAILABLE_DIRECT`

Examples preserved in live evidence:

```text
SAME_FAST                         0-1 ms
REPRESENTATION_FAST_RECONCILED   1 ms
MANUAL_EDIT_REBUILT             11.678 s
MANUAL_EDIT_REBUILT             12.012 s
```

This is one of the strongest currently attributable phase timings because the result path and elapsed value are tied together explicitly.

Interpretation must preserve correctness semantics:

```text
SAME_FAST / REPRESENTATION_FAST_RECONCILED
= cheap healthy fast paths

MANUAL_EDIT_REBUILT after a genuine user edit
= expensive but currently required correctness path
```

The existing data proves the rebuild path is expensive in extreme long chat.

It does not yet prove which sub-operation inside rebuild dominates or which portion is avoidable.

### 3.7 Request prepared total around rebuild

Status: `AVAILABLE_DIRECT`

Genuine-edit controls preserve examples such as:

```text
prepared 11.974 s
edit     11.678 s

prepared 12.356 s
edit     12.012 s
```

This directly supports that those requests were rebuild-dominated.

A residual can be arithmetically calculated:

```text
prepared - edit
```

but that residual is only `AVAILABLE_DERIVED`.

Do not name it `all other request work` unless source timing nesting/exclusivity is formally verified.

---

## 4. Existing output-side timing evidence

### 4.1 Output handler total

Status: `AVAILABLE_DIRECT`

Example:

```text
Output handler total: 365 ms
```

This is the current broad output-handler wall-time boundary.

### 4.2 Output process timing

Status: `AVAILABLE_DIRECT / NESTING SEMANTICS NOT YET FORMALLY INVENTORIED`

Example:

```text
Output process: 347 ms
```

The value exists and is useful.

However this research inventory does not yet assume whether every other output timing is strictly nested inside it, partially overlapping, or measured by a different boundary.

Until source timing relationships are formally mapped:

```text
DO NOT SUM ALL OUTPUT TIMINGS
```

### 4.3 Out storage wall time

Status: `AVAILABLE_DIRECT / AMBIGUOUS_BOUNDARY`

Examples:

```text
Out storage: 341 ms
Out storage: 384 ms
```

As with request-side Store writes, this is direct boundary latency but not direct internal-cause evidence.

### 4.4 Output hotspot owner / time / share

Status: `AVAILABLE_DIRECT`

Example:

```text
Output hotspot: OUT_STORAGE · 341 ms · 93.4%
```

v0.64.6 natural sequence preserved repeated output Store dominance:

```text
@2131 output storage 424 ms / 95.3%
@2133 output storage 418 ms / 95.2%
@2135 output storage 376 ms / 94.2%
@2137 output storage 451 ms / 94.7%
@2139 output storage 370 ms / 95.1%
```

This establishes recurrence of output Store boundary dominance in one natural sequence.

It still does not establish the internal causal mechanism.

---

## 5. Strong existing long-chat performance specimens

### 5.1 v0.64.2 active C storage-dominance specimen

Direct preserved evidence:

```text
Request total: 213 ms
Turn storage: 22,253 chars · set 181 ms · set/1K 8.13 ms
Request hotspot: TURN_STORAGE · 181 ms · 85.4%

Output handler total: 365 ms
Output process: 347 ms
Out storage: 341 ms
Output hotspot: OUT_STORAGE · 341 ms · 93.4%
```

Classification:

```text
STORAGE_DOMINANCE
= DIRECT / HEALTHY SEMANTICS / PERFORMANCE WATCH
```

### 5.2 v0.64.6 repeated B request Store sequence

Direct request Store examples:

```text
@2130 291 ms / 85.1%
@2132 1.010 s / 93.8%
@2134 356 ms / 86.6%
@2136 311 ms / 86.1%
@2138 410 ms / 92.6%
```

This is especially valuable because the same sequence kept ordinary Edit Reconcile paths at approximately `0-1 ms`.

Therefore within the existing measured buckets:

```text
request storage dominates
while
edit reconcile fast path remains negligible
```

for those healthy ordinary broadcast requests.

### 5.3 v0.64.6 repeated B output Store sequence

Direct output Store examples:

```text
@2131 424 ms / 95.3%
@2133 418 ms / 95.2%
@2135 376 ms / 94.2%
@2137 451 ms / 94.7%
@2139 370 ms / 95.1%
```

This is recurring evidence, not a one-off spike.

### 5.4 v0.64.5 genuine manual-edit rebuild

Direct evidence:

```text
prepared 12.356 s
edit 12.012 s
Request hotspot EDIT_RECONCILE · 12.012 s · 97.1%
```

### 5.5 v0.64.2 genuine manual-edit rebuild

Direct evidence:

```text
prepared 11.974 s
edit 11.678 s
Request hotspot EDIT_RECONCILE · 11.678 s · 97.5%
```

The two independent long-chat samples prove recurrence of a very expensive **genuine-edit rebuild boundary**.

They do not prove a defect.

---

## 6. Existing context metadata useful for performance comparison

The current evidence often also contains non-timing context that can support later grouping/attribution without new probes.

Examples:

```text
runtime generation / boot
request/output turn indices
Mode C / B_START / B_CONTINUE / B_END
Edit Reconcile path/result
snapshot UPDATED / UNCHANGED
Prior Representation class
output COMMITTED / BYPASSED
Warnings / compatibility diagnostics
turn-storage payload chars
representation fingerprint lengths
reload / same-runtime context
```

These facts can help compare latency families while preserving semantic context.

They must not be oversegmented into dozens of buckets before evidence shows that a dimension explains latency variance.

---

## 7. What current evidence can already answer

### Answerable now

```text
Was this local request path cheap or expensive overall?

Which currently measured request bucket was the largest?

Was Edit Reconcile fast or rebuild-class expensive?

How long did the Store write boundary take?

How large was the turn-storage character payload in sampled request diagnostics?

What was the current set/1K normalized value when exposed?

Was the output handler dominated by Out storage among measured buckets?

Did storage dominance recur across neighboring natural turns?

Was the request a steady same-runtime fast path or a genuine-edit rebuild path?
```

These are legitimate existing-evidence questions.

---

## 8. What current evidence cannot safely answer

### 8.1 SnapshotStore read latency

Status: `MISSING` in the reviewed preserved timing evidence.

The current reviewed specimens strongly expose write/set boundaries but do not give a comparable explicit read/get latency inventory.

Therefore do not claim:

```text
Store reads are cheap
```

or:

```text
writes are the only Store bottleneck
```

from current evidence.

### 8.2 Serialization time inside/outside Store write

Status: `MISSING / AMBIGUOUS_BOUNDARY`

Current Store set wall time does not separate:

```text
state serialization
payload preparation
host API invocation
host/backend persistence wait
```

### 8.3 Store call count contribution

Status: `MISSING` as a per-request performance fact in the reviewed evidence.

Even if one set is expensive, current live timing evidence does not yet establish whether there are avoidable repeated Store calls in the same path.

### 8.4 Lifecycle timing

Status: `MISSING` as a dedicated phase timing.

Lifecycle owns meaningful request preparation, but current reviewed evidence does not isolate its wall time.

### 8.5 Prompt compiler timing

Status: `MISSING` as a dedicated phase timing.

Current evidence cannot establish whether prompt construction is negligible or scale-sensitive.

### 8.6 Representation classification timing

Status: `MOSTLY MISSING AS A DEDICATED PHASE`

Edit Reconcile path timings exist, but Representation fact construction/classification does not have a reviewed independent phase timing.

Do not collapse Representation cost into Edit Reconcile cost without source evidence.

### 8.7 Output-compat timing

Status: `MISSING` as a dedicated phase timing.

Compatibility diagnostics expose semantic handling results, not a direct isolated cost.

### 8.8 Structure / Reaction / Time / Frame validation timing

Status: `MISSING` as independent phase timings in the reviewed evidence.

Their healthy PASS/WARNING state says nothing about CPU/wall-time cost.

### 8.9 Mirror timing

Status: `MISSING / NOT ISOLATED` in reviewed evidence.

`Deferred mirror: COMMITTED / OUTPUT_MISMATCH` is semantic/operational state, not a dedicated wall-time measure.

### 8.10 JavaScript CPU vs external wait

Status: `MISSING`

Current wall-time evidence cannot split:

```text
CPU execution
awaited host call
browser scheduling delay
GC pause
other event-loop delay
```

### 8.11 Allocation / memory pressure / GC

Status: `MISSING`

No claim should currently connect long-chat latency spikes to allocation or garbage collection.

### 8.12 Long-chat scaling law

Status: `MISSING`

Multiple long-chat samples prove large absolute costs and recurrence.

They do not yet establish a functional relation such as:

```text
latency = O(history length)
latency = O(serialized Store payload)
latency grows linearly with chat size
```

A correlation hypothesis is allowed later; a scaling-law claim is not.

### 8.13 Internal manual-rebuild cost breakdown

Status: `MISSING`

Current evidence proves:

```text
MANUAL_EDIT_REBUILT ≈ 11.7-12.0 s
```

but does not split that into:

```text
history/bootstrap scan
parsing
state reconstruction
Store reads
Store writes
validation
other recovery work
```

This is one of the highest-value future evidence gaps.

---

## 9. Important overlap and arithmetic rules

Do not assume every timing line is exclusive.

Example:

```text
Output handler total
Output process
Out storage
```

may contain nested spans.

Until exact timing source relationships are documented:

```text
SUM(child timings) == total
```

must not be assumed.

Likewise:

```text
prepared - edit
```

is a useful arithmetic residual, but not automatically a named exclusive phase.

Future timing design should explicitly label spans as:

```text
EXCLUSIVE
INCLUSIVE
BOUNDARY
POINT
```

as defined by the Latency Attribution Map.

---

## 10. Existing evidence reuse rule for future research

Before proposing one new timing field, ask:

```text
Can the question already be answered by:
- Request total?
- Request hotspot?
- Turn storage set time / payload chars / set-per-1K?
- Edit Reconcile timing/result?
- prepared timing?
- Output handler total?
- Output process?
- Out storage timing?
- Output hotspot?
- existing request semantic context?
```

If yes:

```text
DO NOT PROPOSE A DUPLICATE TIMER
```

This keeps observability overhead bounded and avoids multiple competing performance authorities.

---

## 11. Current highest-value evidence gaps

Ranked only for research priority, not implementation authorization:

```text
P1. MANUAL_REBUILD_INTERNAL_BREAKDOWN
    Why does a true rebuild consume ~12 s?

P2. STORE_WRITE_INTERNAL_BOUNDARY
    How much is serialization/local work vs host/backend wait?

P3. STORE_READ_LATENCY
    Are reads meaningful contributors in steady or rebuild paths?

P4. STORE_CALL_COUNT / REPEATED_WORK
    Is storage dominance one necessary write or repeated avoidable work?

P5. REQUEST_PHASE_GAPS
    Lifecycle / Prompt / Representation / other unmeasured request work

P6. OUTPUT_PHASE_GAPS
    output-compat / Structure / Time / Frame / Mirror attribution

P7. SCALE_RELATIONSHIP
    Which costs actually increase with long-chat size/payload size?
```

Do not solve P1-P7 in this document.

This document only proves that they are the remaining information gaps after reusing existing evidence.

---

## 12. What this inventory changes in the research plan

Before this inventory, a generic performance track might have started by adding broad timing instrumentation.

After inventory:

```text
broad profiler-style instrumentation
= NOT JUSTIFIED
```

because useful timing already exists.

The next design should therefore be narrower:

```text
existing evidence
→ identify specific missing attribution fact
→ design only the minimum observation needed for that fact
```

The first likely design question is whether Store boundary evidence should be split conceptually into:

```text
STORE_PREPARE
STORE_HOST_WAIT
STORE_COMPLETE
```

or whether source inspection shows that an even smaller/more accurate decomposition is appropriate.

That is a future design question only.

---

## 13. Relationship to active M2 work

Performance evidence must not alter the mechanical M2-3 contract.

In particular:

```text
MANUAL_EDIT_REBUILT is expensive
```

does not authorize changing genuine-edit behavior during Edit Reconcile ownership extraction.

Likewise:

```text
Store dominates ordinary measured request/output time
```

does not authorize Store changes inside M2-3.

Any future performance implementation must remain a separate work item after explicit implementation authorization.

---

## 14. Current classification

```text
SIMCORE_LONG_CHAT_EXISTING_TIMING_EVIDENCE_INVENTORY
= HIGH VALUE RESEARCH FOUNDATION
= EXISTING-EVIDENCE FIRST
= REQUEST TOTAL AVAILABLE
= STORE WRITE BOUNDARY AVAILABLE
= STORE PAYLOAD SIZE / NORMALIZED SET COST AVAILABLE
= REQUEST / OUTPUT HOTSPOT AVAILABLE
= EDIT RECONCILE TIMING AVAILABLE
= GENUINE REBUILD ~12 S DIRECTLY REPEATED
= OUTPUT STORAGE DOMINANCE DIRECTLY REPEATED
= STORE INTERNAL CAUSE UNKNOWN
= STORE READ COST UNKNOWN
= MANY DOMAIN-SPECIFIC PHASE COSTS UNKNOWN
= NO NEW INSTRUMENTATION AUTHORIZED
= NO OPTIMIZATION AUTHORIZED
= NO RUNTIME CHANGE
```
