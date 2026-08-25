# SimCore Long-Chat Store Set Sample Correlation Study — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · EXISTING-EVIDENCE CORRELATION STUDY · DESIGN / RESEARCH ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_LONG_CHAT_PERFORMANCE_RESEARCH_CHARTER.md`
- `docs/SIMCORE_LONG_CHAT_LATENCY_ATTRIBUTION_MAP_IDEA.md`
- `docs/SIMCORE_LONG_CHAT_EXISTING_TIMING_EVIDENCE_INVENTORY_IDEA.md`
- `docs/SIMCORE_LONG_CHAT_STORE_BOUNDARY_DECOMPOSITION_IDEA.md`
- `docs/SIMCORE_LONG_CHAT_STORE_BACKEND_SET_VARIANCE_MODEL_IDEA.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md`
- `docs/SIMCORE_LIVE_06406_VALIDATION.md`
- production authority: `release-simcore` v0.64.7 source

---

## 1. Purpose

Use only already-preserved repository/live diagnostics to determine how much of ordinary SnapshotStore `backend.set` latency variance can be explained before adding any new runtime instrumentation.

Primary question:

```text
Given the Store backend-set samples we already have,
which variance hypotheses survive an evidence-first correlation pass,
and what is the first discriminator that is genuinely missing?
```

This study is deliberately prior to optimization and prior to new telemetry.

It does not attempt to prove the internal implementation of `Risuai.pluginStorage.setItem` or any PocketRisu/browser/backend mechanism.

---

## 2. Research-only freeze

This document does not authorize:

```text
new timers
new counters
pluginStorage wrapping
new backend probes
SnapshotStore changes
payload-shape changes
storage key changes
write skipping
write batching
write coalescing
new caching
new persistence backend
work-branch implementation
latest.js / install.js changes
release-simcore deployment
```

Canonical rule:

```text
REUSE EXISTING EVIDENCE FIRST
→ EXHAUST CHEAP CORRELATION
→ IDENTIFY ONE REAL MISSING DISCRIMINATOR
→ ONLY THEN CONSIDER INSTRUMENTATION DESIGN
```

---

## 3. Source-grounded measured boundary

Production v0.64.7 establishes:

```text
SnapshotStore
→ storageBackend()
→ await Risuai.pluginStorage.setItem(key, payload)
```

Ordinary request/output diagnostics already separate:

```text
STORE_SERIALIZE_LOCAL
from
STORE_BACKEND_SET
```

and ordinary hot-path request/output saves explicitly exclude inline prune.

Therefore this study focuses on:

```text
STORE_BACKEND_SET
= wall time across awaited pluginStorage.setItem(...)
```

not on JSON serialization and not on ordinary inline retention pruning.

---

## 4. Study population

Do not mix all Store samples into one population.

Initial write-context families:

```text
ORDINARY_TURN
ORDINARY_OUT
EDIT_REBUILD_OUT
COMPATIBILITY_REPAIR_OUT
LEGACY_OR_BOOTSTRAP
UNKNOWN
```

Primary study population:

```text
ORDINARY_TURN
ORDINARY_OUT
```

Genuine edit / repair / legacy samples remain separate controls because they have different call shapes and may include additional Store work.

---

## 5. Existing evidence sources

Use only naturally preserved material already present in repository evidence or newly user-supplied natural diagnostics.

Primary existing sources include:

```text
SIMCORE_RUNTIME_WATCH_06402.md
SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md
SIMCORE_LIVE_06406_VALIDATION.md
SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06402.md
SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06405.md
CURRENT_DEVELOPMENT.md historical ledgers where exact timings are preserved
```

New natural diagnostics may be appended to the research corpus when supplied, but no synthetic request should be generated merely to manufacture timing samples.

---

## 6. Canonical research sample

A repository-analysis sample should remain bounded and typed.

Conceptual tuple:

```ts
{
  evidenceRef,
  runtimeGeneration,
  turnIndex,
  writeContext,
  runtimeClass,
  modeFamily,
  keyClass,
  setMs,
  serializeMs,
  payloadChars,
  setPerKChars,
  requestOrOutputTotalMs,
  hotspotShare,
  deferredPruneScheduled,
  editPath,
  snapshotUpdated,
  warningClass,
  correctnessStatus
}
```

This is a research table shape only.

It is not a proposed runtime schema.

Missing values remain `UNKNOWN`.

Do not infer absent fields from neighboring requests unless the evidence explicitly supports carryover.

---

## 7. Evidence quality

Each sample field should preserve one of:

```text
DIRECT
DERIVED
UNKNOWN
```

### DIRECT

Explicitly present in a preserved diagnostic or source-grounded path.

### DERIVED

Boundedly computed from direct fields, such as:

```text
setPerKChars = setMs / payloadChars
adjacent delta = next.setMs - prior.setMs
```

Derived values must remain labeled derived.

### UNKNOWN

Not present and not safely derivable.

Important:

```text
UNKNOWN != false
UNKNOWN != zero
UNKNOWN != same as neighbor
```

---

## 8. Comparison family

Before comparing latency, assign a bounded family using only dimensions already available.

Initial family dimensions:

```text
WRITE_CONTEXT
RUNTIME_CLASS
MODE_FAMILY
WRITE_KEY_CLASS
RETENTION_CONTEXT
```

Payload size is a numeric variable, not a hard identity axis.

Do not oversegment by every semantic state flag.

If a dimension has no demonstrated relationship to backend-set behavior, keep it descriptive rather than splitting the population.

---

## 9. Pairing modes

The study should use several pairing strengths.

### P1 · Adjacent same-runtime pair

Strongest cheap natural comparison:

```text
same runtime generation
adjacent or near-adjacent turns
same write context
no known correctness anomaly
```

Use this to test whether major set variance exists while most local context remains stable.

### P2 · Same-sequence family

Example:

```text
same natural B sequence
multiple ORDINARY_TURN writes
multiple ORDINARY_OUT writes
```

Useful for recurrence and distribution shape.

### P3 · Same-mode / same-runtime non-adjacent

Useful when exact adjacency is unavailable but core family remains compatible.

### P4 · Cross-runtime descriptive comparison

Allowed only as descriptive evidence.

Do not infer reload causality unless repeated first/early-vs-steady evidence supports it.

---

## 10. Hypothesis test order

Evaluate hypotheses in a fixed order so later residual explanations are not used prematurely.

### H1 · Payload-only model

Already contradicted by adjacent natural evidence:

```text
19,945 chars → 680 ms
22,253 chars → 181 ms
```

Current verdict:

```text
REJECTED AS DETERMINISTIC EXPLANATION
```

The study may still test whether payload contributes statistically within homogeneous TURN families.

### H2 · Payload contributor within family

Question:

```text
within comparable ORDINARY_TURN samples,
does setMs tend to increase with payloadChars?
```

Possible outcomes:

```text
SIZE_CORRELATED_CANDIDATE
NO_CLEAR_SIZE_RELATION
INSUFFICIENT_SAMPLE
CONFOUNDED_SAMPLE
```

Do not freeze a linear model from a small corpus.

### H3 · TURN vs OUT phase effect

Question:

```text
are ORDINARY_TURN and ORDINARY_OUT latency distributions visibly different?
```

Do not merge the populations until evidence supports equivalence.

Possible outcome:

```text
PHASE_CORRELATED_CANDIDATE
or
NO_CLEAR_PHASE_RELATION
```

### H4 · Same-runtime local variance

Question:

```text
within one runtime generation and write context,
how large can backend-set variation become?
```

This is particularly important because high variance under otherwise comparable local conditions weakens explanations based only on SimCore semantic state.

### H5 · Reload-class relation

Question:

```text
are FIRST_AFTER_RELOAD / EARLY_AFTER_RELOAD writes repeatedly slower than STEADY_SAME_RUNTIME writes?
```

No conclusion from one reload specimen.

### H6 · Deferred-prune overlap relation

Where existing output detail exposes a deferred-prune scheduling context, check whether later Store spikes repeatedly align with that context.

Required outcome vocabulary:

```text
PRUNE_OVERLAP_CANDIDATE
NO_VISIBLE_PRUNE_ALIGNMENT
INSUFFICIENT_SAMPLE
```

Do not call prune causal merely because timing is nearby.

### H7 · Key-class relation

Compare new indexed writes separately from existing-index rewrites where natural evidence exists.

Genuine edit samples remain separate from ordinary writes because their total reconcile path is not comparable.

### H8 · Residual backend variance

After available local dimensions fail to account for a large spread:

```text
BACKEND_EXTERNAL_VARIANCE_CANDIDATE
```

is the strongest allowed residual class.

This means:

```text
variance remains inside the awaited host/backend boundary
```

It does not mean:

```text
PocketRisu bug
browser storage bug
IPC bug
filesystem issue
GC issue
```

Those internal causes remain unverified.

---

## 11. Adjacent-pair evidence is especially valuable

An adjacent same-runtime pair can falsify overly simple local models cheaply.

Example already preserved:

```text
sample A
payload smaller
set slower

sample B
payload larger
set faster
```

This is stronger against a payload-only deterministic model than two distant samples from different runtimes.

Therefore prioritize corpus extraction in this order:

```text
adjacent same-runtime same-context
→ same-sequence same-context
→ same-runtime same-context
→ cross-runtime descriptive
```

---

## 12. Statistical discipline

The current corpus is not guaranteed to be large enough for formal inference.

Use descriptive statistics first:

```text
n
median
min
max
p75 / p90 / p95 only when sample count makes them meaningful
payload range where available
adjacent-pair deltas
```

Do not report a precise correlation coefficient from a tiny or heavily confounded corpus as if it established causality.

Do not use one universal slow threshold.

---

## 13. Correctness stratification

Performance comparison should preferentially use samples with healthy semantic behavior.

Candidate classes:

```text
HEALTHY_CONTROL
WARNING_PRESENT_BUT_COMMITTED
REPAIR_PATH
CORRECTNESS_ANOMALY
UNKNOWN
```

Ordinary Store variance research should not let a correctness-repair request contaminate the healthy baseline.

If a slow sample is coupled to a correctness anomaly, preserve it separately rather than discarding it.

---

## 14. Negative evidence is first-class

The study should record not only positive correlations but also falsifications.

Examples:

```text
larger payload faster than smaller adjacent payload
→ negative evidence against payload-only model

ordinary OUT_STORAGE spike with no inline prune
→ negative evidence against inline-prune explanation

same runtime / same mode / same phase with large latency spread
→ negative evidence against those dimensions as sufficient explanations
```

Do not erase disproven hypotheses.

Use narrow states:

```text
SUPPORTED_CANDIDATE
WEAKENED
CONTRADICTED
UNPROVEN
INSUFFICIENT_SAMPLE
```

---

## 15. First-missing-discriminator gate

The central output of this study is not an optimization proposal.

It is a decision about evidence sufficiency.

After exhausting existing evidence, classify the next state as one of:

```text
EVIDENCE_SUFFICIENT_FOR_NARROW_CANDIDATE
EXISTING_EVIDENCE_SUPPORTS_EXTERNAL_VARIANCE_ONLY
ONE_MISSING_DISCRIMINATOR_IDENTIFIED
MULTIPLE_MISSING_DISCRIMINATORS / RESEARCH NOT CLOSED
INSUFFICIENT_SAMPLE
```

### ONE_MISSING_DISCRIMINATOR_IDENTIFIED

Use only when:

```text
existing evidence has already ruled out or bounded the main available local explanations
AND
one missing fact would materially distinguish the remaining hypotheses
AND
that fact can plausibly be measured with narrow bounded instrumentation later
```

Examples of possible future missing discriminators, not yet authorized:

```text
exact backend write cadence
backend get-vs-parse split for read studies
explicit retained storage population at write time
host-reported storage operation category if such a supported surface exists
```

Do not preselect one before the correlation table proves the need.

---

## 16. Instrumentation escalation rule

No new instrumentation design should be created merely because a field would be interesting.

Escalate only if:

```text
1. the existing-evidence correlation study is materially complete
2. a remaining hypothesis matters to an actionable performance decision
3. one bounded discriminator would separate competing explanations
4. the discriminator can be collected without semantic state mutation
5. the expected measurement cost is clearly below the latency under study
```

If these are not true:

```text
continue natural evidence collection
or
leave cause UNKNOWN / EXTERNAL_VARIANCE_CANDIDATE
```

---

## 17. No optimization consequence yet

Even if the study shows recurring backend-set dominance or high variance, it does not authorize:

```text
skip authoritative writes
fire-and-forget state persistence
commit before persistence completes
write coalescing
storage-key redesign
backend replacement
```

Any future optimization must separately prove correctness and durability equivalence.

Performance remains below state integrity.

---

## 18. Suggested evidence table output

A compact study table should contain rows like:

```text
ref | ctx | runtime | mode | index | payload | serialize | set | hotspot | prune-context | correctness
```

Then produce family summaries rather than one global average.

Suggested summaries:

```text
ORDINARY_TURN / same runtime
ORDINARY_OUT / same runtime
first-after-reload
steady same-runtime
adjacent pairs
large-spike specimens
```

Missing fields must remain explicit.

---

## 19. Study completion criteria

The correlation study is complete enough for the next decision when:

```text
major preserved natural Store samples are inventoried
TURN and OUT are separated
known reload/runtime context is attached where available
payload-only hypothesis is tested against the corpus
same-runtime variance is characterized
available prune-context evidence is checked
major negative evidence is preserved
one of the first-missing-discriminator outcomes is reached
```

The study need not prove the internal host/backend cause to be complete.

A legitimate final result may be:

```text
backend-set variance is real and recurrent
available SimCore-owned dimensions do not explain it
specific backend-internal cause remains unobservable
→ BACKEND_EXTERNAL_VARIANCE_CANDIDATE
→ no SimCore optimization justified yet
```

---

## 20. Relationship to the performance research track

```text
Performance Research Charter
= overall no-implementation boundary

Latency Attribution Map
= broad timing ownership

Existing Timing Evidence Inventory
= current measurable facts

Store Boundary Decomposition
= serialize / backend.set / prune / read boundary

Store Backend Set Variance Model
= candidate explanations and comparison families

Store Set Sample Correlation Study
= apply that model to the actual preserved sample corpus
= determine the first true evidence gap
```

This is the natural last existing-evidence step before any instrumentation-specific design.

---

## 21. Current classification

```text
SIMCORE_LONG_CHAT_STORE_SET_SAMPLE_CORRELATION_STUDY
= HIGH VALUE
= EXISTING-EVIDENCE FIRST
= CORPUS / ADJACENT-PAIR ANALYSIS
= FAMILY-LOCAL COMPARISON
= NEGATIVE EVIDENCE PRESERVING
= FIRST-MISSING-DISCRIMINATOR GATE
= ANTI-CAUSALITY
= NO NEW TELEMETRY
= DESIGN / RESEARCH ONLY
= NO IMPLEMENTATION
= NO RUNTIME CHANGE
```
