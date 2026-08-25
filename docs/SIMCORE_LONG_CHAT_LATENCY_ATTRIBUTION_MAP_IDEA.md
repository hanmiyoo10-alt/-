# SimCore Long-Chat Latency Attribution Map — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · DESIGN / RESEARCH ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_LONG_CHAT_PERFORMANCE_RESEARCH_CHARTER.md`
- `docs/SIMCORE_NEXT_FOCUS_AREAS_AFTER_CACHE_RESEARCH_2026-08-25.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

---

## 1. Purpose

Create a canonical design vocabulary for answering one question in extreme long chats:

```text
When a SimCore request/output path is slow,
where did the wall time belong?
```

The map is an attribution design, not a profiler implementation and not an optimization patch.

The first obligation is to separate:

```text
observed latency
from
attributed owner
from
proven bottleneck cause
```

A large timing value does not by itself prove what algorithm, module, host subsystem, or storage backend caused it.

---

## 2. Evidence basis

The current deferred sweep already preserves:

```text
STORE_LATENCY_DOMINANCE
→ recurrent request/output hotspot
→ sometimes >1 s
→ WATCH / PERFORMANCE
→ correctness/corruption not observed
```

It also preserves:

```text
RELOAD_BOUNDARY_PROVENANCE_UNAVAILABLE_REBUILD
→ first-request expensive rebuild after new runtime generation
→ WATCH / PERFORMANCE_ONLY
```

Historical genuine-edit controls also show multi-second manual rebuilds, but those are correctness-preserving positive controls rather than proof that the rebuild is avoidable.

Therefore the research problem is not:

```text
Store is slow, optimize Store.
```

It is:

```text
Which latency boundary dominates?
Is it recurrent?
Is it scale-sensitive?
Is it required work or avoidable repeated work?
Which semantic owner is allowed to change it later?
```

---

## 3. Research-only freeze

This document does not authorize:

```text
new timing instrumentation
new performance counters
latest.js / install.js edits
SnapshotStore changes
host/storage API changes
new timers
new network calls
work-branch implementation
release-simcore deployment
performance optimization
```

Current source and existing diagnostics may be inspected. Future instrumentation may be proposed in later design documents, but not installed during this research phase.

---

## 4. Latency attribution is not the same as latency causality

Required distinction:

```text
BOUNDARY ATTRIBUTION
= where elapsed time was observed

CAUSAL ATTRIBUTION
= why that elapsed time occurred
```

Example:

```text
SnapshotStore API call wall time = 900 ms
```

This supports:

```text
STORE_BOUNDARY = 900 ms
```

It does **not** by itself support:

```text
Store JavaScript CPU = 900 ms
serialization = 900 ms
host storage backend = 900 ms
one specific Store algorithm is defective
```

The causal owner remains `UNKNOWN` until narrower evidence exists.

This distinction is especially important for async boundaries where SimCore may spend most of the interval awaiting a host/storage implementation.

---

## 5. Top-level latency planes

The research map uses three top-level planes.

```text
REQUEST PREPARATION PLANE
User request hook
→ previous-assistant/state acquisition
→ edit/representation reconciliation
→ lifecycle/domain preparation
→ prompt construction
→ request ready

EXTERNAL GENERATION GAP
request ready/dispatched
→ model/gateway/provider work
→ assistant output observed

OUTPUT FINALIZATION PLANE
assistant output observed
→ compatibility/representation processing
→ domain validation/state derivation
→ Store commit
→ Mirror/telemetry/UI finalization
→ output committed
```

The external generation gap is useful end-to-end context, but it is not SimCore-local processing latency and must not be counted as a SimCore optimization target merely because it is large.

---

## 6. Request-preparation latency domains

Initial type-level map:

```text
R0_REQUEST_ENTRY
→ request hook / SimCore request entry boundary

R1_STATE_ACQUISITION
→ current canonical state / required Store reads

R2_PREVIOUS_ASSISTANT_RECONCILE
→ Representation facts
→ Edit Reconcile decision path
→ manual rebuild only when required

R3_REQUEST_DOMAIN_PREPARATION
→ Lifecycle / Time / Frame / Broadcast / Summary / related request-scoped authority derivation

R4_PROMPT_CONSTRUCTION
→ Prompt compiler / serialization

R5_REQUEST_READY
→ request prepared / handoff boundary
```

These are attribution domains, not a proposal to create six new runtime modules.

Existing module ownership remains authoritative.

M2-3 may move physical Edit Reconcile ownership, but the semantic latency domain remains conceptually `R2_PREVIOUS_ASSISTANT_RECONCILE` before and after the extraction.

---

## 7. Output-finalization latency domains

Initial type-level map:

```text
O0_OUTPUT_ENTRY
→ assistant output first observed by SimCore

O1_OUTPUT_COMPAT_REPRESENTATION
→ output compatibility / representation-bound observation

O2_DOMAIN_VALIDATION_AND_DERIVATION
→ Structure / Reaction / Time / Frame / Broadcast / Community-related bounded validation and derived state

O3_STATE_COMMIT_BOUNDARY
→ SnapshotStore write/update boundary

O4_MIRROR_AND_RUNTIME_FINALIZATION
→ Deferred Mirror scheduling/commit decisions
→ bounded telemetry / probe / UI finalization

O5_OUTPUT_COMMITTED
→ SimCore output processing complete
```

Again, these are performance-attribution regions, not new semantic ownership.

---

## 8. Latency ownership classes

Every future latency observation should distinguish at least these dimensions.

### 8.1 Semantic owner

Who owns the operation's meaning?

Examples:

```text
store
edit-reconcile
representation
lifecycle
prompt
structure
time
frame
runtime-mirror
runtime-telemetry
```

### 8.2 Execution boundary owner

Where was elapsed time observed?

Initial classes:

```text
SIMCORE_LOCAL
STORE_BOUNDARY
HOST_API_BOUNDARY
EXTERNAL_PROVIDER
SHARED_ASYNC_BOUNDARY
UNKNOWN
```

This prevents an async host wait from being mislabeled as local SimCore CPU.

### 8.3 Cause confidence

Conceptual classes:

```text
DIRECT
BOUNDARY_ONLY
CORRELATED
UNKNOWN
```

`BOUNDARY_ONLY` is expected to be common early in research.

---

## 9. Exclusive vs inclusive spans

A performance map must not create impossible arithmetic.

Example bad diagnostic interpretation:

```text
request total = 1000 ms
Store = 700 ms
Edit Reconcile = 500 ms
Lifecycle = 300 ms
sum = 1500 ms
```

This may be valid if the listed values are nested/inclusive spans, but invalid if presented as mutually exclusive shares.

Therefore every future timing fact must declare one of:

```text
EXCLUSIVE
= non-overlapping critical-path partition candidate

INCLUSIVE
= contains child work and must not be summed with descendants

BOUNDARY
= elapsed async/API boundary; internal cause decomposition unknown

POINT
= timestamp/marker only, not a duration
```

Rule:

```text
Do not calculate percentage-of-total from mixed span kinds without normalization.
```

The first Latency Attribution Map should prefer truthful partial coverage over a fake 100% decomposition.

---

## 10. Coverage semantics

For one request/output sample, attribution completeness should be explicit.

Conceptual states:

```text
FULL_EXCLUSIVE
→ measured regions form a trusted non-overlapping total

PARTIAL
→ some important elapsed time is attributable, some is not

BOUNDARY_ONLY
→ only broad API/phase boundaries are known

MARKERS_ONLY
→ timestamps exist but meaningful duration ownership cannot be reconstructed

UNATTRIBUTED
→ current evidence is insufficient
```

Early research is expected to be mostly `PARTIAL` or `BOUNDARY_ONLY`.

Do not upgrade to `FULL_EXCLUSIVE` merely because all visible diagnostic fields have numbers.

---

## 11. Store boundary rule

`STORE_LATENCY_DOMINANCE` is the strongest current performance WATCH, so Store needs an explicit anti-overclaim contract.

Required interpretation:

```text
Store call latency high
→ Store boundary dominates the observed critical path
```

Not automatically:

```text
SnapshotStore implementation defect
host storage defect
serialization defect
too many writes
large payload defect
lock/contention defect
```

Those are separate hypotheses.

A future Store-focused research step must split at least:

```text
CALL COUNT
PAYLOAD SCALE
SERIALIZATION / MATERIALIZATION
HOST/API WAIT
STORE-LOCAL COMPUTE
RETRY / REBUILD AMPLIFICATION
```

only when evidence supports those subdivisions.

No subdivision is frozen as fact today.

---

## 12. Manual-edit rebuild rule

Historical genuine-edit controls show multi-second `MANUAL_EDIT_REBUILT` paths.

That latency is not automatically an optimization defect because the path may be doing necessary correctness recovery after a real user edit.

Performance research must distinguish:

```text
TRUE POSITIVE REBUILD
→ expensive but semantically required

FALSE POSITIVE REBUILD
→ avoidable attribution/performance defect
```

The Representation Fast Reconcile work already proved one historical false-positive family can be eliminated safely.

Future manual-rebuild research must preserve genuine-edit correctness and must never optimize by treating unknown edits as representation drift.

---

## 13. Reload-boundary rule

First-request-after-reload rebuild latency is currently:

```text
WATCH / PERFORMANCE_ONLY
```

The research map must keep:

```text
STEADY_RUNTIME
!=
FIRST_AFTER_RELOAD
```

as an observation class when comparing samples.

A high reload-first cost must not be generalized into a steady-state bottleneck without recurrence in compatible steady-runtime requests.

Similarly, reload continuity improvements must not weaken identity/location/staleness safety merely to preserve performance state.

---

## 14. Proposed future normalized latency sample

Design candidate only; not implemented now.

```text
sampleId
requestIndex / outputIndex
mode / requestFamily
runtimeClass: STEADY | FIRST_AFTER_RELOAD | UNKNOWN
phase: REQUEST | OUTPUT

observedTotalMs
coverageClass

spans[]:
  spanId
  semanticOwner
  boundaryOwner
  spanKind
  wallMs
  causeConfidence
  evidenceSource
  parentSpanId?          // only for inclusive hierarchy

unattributedMs?          // only when mathematically valid
notes/reasonCodes[]
```

Privacy boundary:

```text
NO raw user text
NO raw assistant body
NO full prompt
NO full history
NO Store payload body
```

Only bounded timing/identity/owner metadata belongs in performance telemetry if it is ever implemented.

---

## 15. Evidence-source classes

Future research should distinguish where a number came from.

```text
EXISTING_DIAGNOSTIC
→ already emitted by current production diagnostics

STATIC_SOURCE_INFERENCE
→ ownership/call-path inference from current source; not a runtime duration

LIVE_CORRELATED
→ manually correlated across existing diagnostic fields

FUTURE_PROPOSED_INSTRUMENTATION
→ design-only field that does not exist yet
```

Never present `STATIC_SOURCE_INFERENCE` as measured milliseconds.

Never present `FUTURE_PROPOSED_INSTRUMENTATION` as current capability.

---

## 16. Attribution report shape

Desired future diagnostic explanation, conceptually:

```text
Request prep: 1.24 s · coverage PARTIAL

Known dominant boundary:
- Store boundary: 0.93 s · BOUNDARY_ONLY

Known local phases:
- Edit reconcile: 0.01 s · DIRECT
- Prompt construction: 0.04 s · DIRECT

Unattributed / overlapping remainder:
- 0.26 s or UNKNOWN depending on span compatibility

Verdict:
STORE_BOUNDARY_DOMINANT
CAUSE: UNKNOWN
OPTIMIZATION CANDIDATE: NOT YET ESTABLISHED
```

The desired outcome is explanation, not a score.

---

## 17. Dominance vocabulary

Do not begin with arbitrary thresholds such as `>40% = dominant`.

Initial qualitative vocabulary:

```text
DOMINANT_BOUNDARY
MATERIAL_CONTRIBUTOR
MINOR_CONTRIBUTOR
NOT_MEASURABLE
UNKNOWN
```

Exact quantitative gates require real long-chat distributions first.

One sample may establish `DIRECT_EVIDENCE` of a slow boundary but should not establish a global bottleneck baseline by itself.

---

## 18. Required anti-optimization invariants

No future latency optimization may gain speed by:

```text
skipping required Store durability
weakening SnapshotStore identity
bypassing genuine-edit rebuild when required
weakening Representation ambiguity handling
skipping Structure validation
weakening Time / Frame / Broadcast floors
removing Deferred Mirror safety gates
rewriting history
moving renderer responsibility into SimCore
suppressing diagnostics so timing looks smaller
```

If a cost is correctness-required, it may remain expensive until a semantics-preserving implementation improvement is proven.

---

## 19. Relationship to M2-3

M2-3 is an ownership extraction, not a performance release.

Therefore:

```text
M2-3 may change physical module ownership
but
must not intentionally optimize latency as part of the extraction
```

This research track may later compare pre/post-M2-3 timing evidence for attribution, but it must not use performance goals to widen the M2-3 patch.

A later performance implementation must be a separate work item.

---

## 20. Research questions unlocked by this map

After this map, useful one-at-a-time design questions include:

```text
1. What existing production timing evidence can already populate this map without new instrumentation?
2. What exactly does STORE_LATENCY_DOMINANCE contain?
3. Which request/output phases remain unmeasured?
4. Do we need a bounded Performance Evidence Chain or is current diagnostics sufficient?
5. How should long-chat scale be represented without scanning history again?
6. How do we compare steady vs reload-first vs genuine-edit samples safely?
```

Do not answer all of these by inventing one giant profiler design immediately.

---

## 21. Current classification

```text
SIMCORE_LONG_CHAT_LATENCY_ATTRIBUTION_MAP
= HIGH VALUE FIRST PERFORMANCE IDEA
= DESIGN / RESEARCH ONLY
= ATTRIBUTION BEFORE CAUSALITY
= REQUEST / OUTPUT PLANE SEPARATION
= STORE BOUNDARY ANTI-OVERCLAIM
= EXCLUSIVE / INCLUSIVE SPAN DISCIPLINE
= PARTIAL COVERAGE ALLOWED
= M2-3 INDEPENDENT

runtime change        NONE
instrumentation change NONE
prompt byte change    NONE
SnapshotStore change  NONE
renderer change       NONE
release authority     NONE
```
