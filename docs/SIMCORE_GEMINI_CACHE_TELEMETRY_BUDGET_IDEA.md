# SimCore Gemini Cache Telemetry Budget — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · OBSERVABILITY COST BOUNDARY · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`

Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_RETENTION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_SAMPLE_LIFECYCLE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_RECEIPT_CORRELATOR_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define a bounded runtime-cost contract for Gemini implicit-cache observability so cache diagnostics do not become a meaningful source of latency, CPU work, allocation pressure, memory growth, storage churn, or network traffic in very long chats.

The Telemetry Budget answers:

```text
How much extra work may cache observability add to one request?
Which work must reuse already-produced artifacts instead of recomputing them?
What operations are forbidden on the hot request path?
When may observation become richer?
What happens when the telemetry budget is exhausted?
How is cost measured before a future implementation is promoted?
```

This is a performance/observability boundary only. It is not a cache optimizer and does not manage Gemini cache resources.

## 2. Constitutional boundary and priority order

Permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

Canonical priority from `SIMCORE_GUIDELINES.md` remains:

```text
Correctness
→ Safety
→ State stability
→ Prompt stability
→ Cache efficiency
→ Performance
→ Convenience
```

Telemetry cost control may reduce or omit cache diagnostics, but must never reduce correctness/state validation or move renderer work into SimCore.

If the cache observer cannot stay inside its budget safely:

```text
cache telemetry
→ PARTIAL / UNVERIFIED / OMITTED
```

not:

```text
core validation skipped
prompt rewritten
history rewritten
renderer behavior changed
```

## 3. Core rule — observability must not become the workload

A cache observer exists to explain request/cache behavior, not to create a second large request-processing pipeline.

Forbidden default patterns:

```text
extra full-chat-history traversal solely for cache telemetry
extra full-request serialization solely for telemetry
hashing the same large byte region repeatedly in independent observers
per-turn semantic SnapshotStore writes for cache diagnostics
new provider/gateway network polling from SimCore
unbounded object retention
heavy diagnostic formatting on every healthy request
DOM churn on every request when no UI change is needed
```

Preferred rule:

> Reuse existing request/compiler artifacts first. Compute new telemetry only when its evidence value justifies the cost and the work remains bounded.

## 4. Budget dimensions

Do not reduce telemetry cost to one opaque score.

Initial dimensions:

```text
CPU / wall-time overhead
additional traversal work
hash / fingerprint bytes processed
allocation / retained-memory pressure
serialized telemetry bytes
persistence/write frequency
DOM/UI mutation count
network calls
```

Each dimension has a separate risk profile.

A future implementation should measure at least request-level and rolling-window cost rather than relying only on aggregate process metrics.

## 5. Network budget — zero by default inside SimCore

Default SimCore cache-observability network budget:

```text
NEW_NETWORK_CALLS_PER_REQUEST = 0
```

SimCore must not duplicate Usage Dashboard's LLMGateway `/logs` polling merely to improve cache evidence.

If a future supported receipt bridge exists, it should be a bounded read-only integration with its own design/release work item. The Telemetry Budget does not authorize network polling.

No receipt source:

```text
provider cache evidence = UNVERIFIED
```

not a reason to add hidden traffic.

## 6. Traversal budget — no second full-history scan by default

Long-chat cost is dominated by scale-sensitive operations.

Therefore:

```text
additional O(chat_history_length) pass
solely for cache telemetry
= FORBIDDEN DEFAULT
```

Prefix Map or compatibility evidence should preferentially reuse:

```text
already materialized request structure
existing per-message/request fingerprints
compiler segment identities
known request indices and lengths
existing normalized metadata
```

If the only way to obtain a cache metric is to rescan the full long-chat history on every request, the metric should remain unavailable until a cheaper incremental/reuse path exists.

## 7. Hashing budget — hash once, reuse many

Hashing is useful but not free at extreme prompt sizes.

Rules:

```text
same canonical byte region
→ one authoritative fingerprint per observation point
→ downstream consumers reuse it
```

Avoid:

```text
Prefix Map hashes region A
Compatibility Key re-hashes region A
Evidence Chain re-hashes region A
Sentinel re-hashes region A
```

Preferred:

```text
producer computes bounded identity once
→ typed sidecar fact
→ consumers reference identity
```

Prompt Segment Identity / Manifest may perform detailed segment hashing in CI/release contexts without requiring every runtime request to reproduce the same work.

## 8. Runtime detail should be cheaper than CI detail

Cache ABI / stability analysis has two distinct cost environments.

### CI / release

May perform richer deterministic work such as:

```text
all stable/slow segment digests
segment ordering verification
manifest comparison
fixture replay
candidate-vs-baseline differential checks
```

because it is off the user request hot path.

### Runtime

Prefer compact evidence such as:

```text
stable ABI identity
slow ABI identity
first meaningful changed segment when already available
first-break owner
bounded token/cache receipt fields
```

Do not copy the full CI manifest workload into every live request.

## 9. Observation tiers

Use a small deterministic observation-tier model rather than always running maximum diagnostics.

Candidate tiers:

```text
T0_MINIMAL
T1_STANDARD
T2_BOUNDED_ENRICHED
```

### T0_MINIMAL

For healthy steady-state requests when only minimal cache context is needed.

Possible work:

```text
request/sample identity
compatibility descriptor identity
existing stable/slow ABI identities
existing runtime generation class
minimal receipt/correlation state if already available
```

No expensive extra traversal.

### T1_STANDARD

Normal bounded cache-observability path.

May include:

```text
Prefix Map facts from already available/incremental data
receipt correlation metadata
Baseline admission inputs
request-level Verdict Compiler inputs
```

Still no full-history second scan or network call.

### T2_BOUNDED_ENRICHED

Triggered only by an admitted anomaly, contradiction, active incident, explicit diagnostic inspection, or controlled validation campaign.

May include additional bounded evidence such as:

```text
first changed cache-critical segment identity
expanded reason-code trace
correction lineage detail
extra local timing breakdown already obtainable without new network work
```

`T2` must still obey hard privacy/memory/traversal boundaries.

## 10. Adaptive does not mean nondeterministic

Observation tier changes should be driven by explicit typed state, not random sampling or hidden heuristics.

Examples:

```text
QUIET + healthy evidence
→ T0/T1

CANDIDATE / PERSISTENT incident
→ T1 or bounded T2

CONTRADICTORY_EVIDENCE
→ bounded T2

explicit diagnostic expansion
→ bounded T2 presentation
```

The same normalized state should choose the same observation tier under the same budget policy.

## 11. Budget exhaustion behavior

Budget exhaustion must fail closed toward less observability.

Conceptual outcomes:

```text
TELEMETRY_COMPLETE
TELEMETRY_PARTIAL
TELEMETRY_BUDGET_DEFERRED
TELEMETRY_UNVERIFIED
```

Example:

```text
Prefix Map needs an unavailable expensive second history scan
→ do not scan
→ firstBreakOwner = UNKNOWN
→ verdict authority ceiling lowers
```

Do not fabricate a first-break result to preserve a polished diagnostic.

## 12. CPU / wall-time budget

Do not freeze arbitrary millisecond limits at idea stage.

Future promotion should establish measured overhead budgets using real long-chat profiling.

Measure at minimum:

```text
absolute added request-preparation time
p50 / p95 added telemetry time
relative overhead versus request-preparation baseline
worst-case anomaly-enrichment overhead
reload-first-request overhead
```

A telemetry feature with tiny average cost but large p95 spikes is not automatically acceptable.

The budget should focus on **incremental SimCore observer cost**, not provider inference/generation latency that SimCore does not own.

## 13. Allocation and memory budget

Retention Policy controls how long evidence survives; Telemetry Budget controls how much live data one request/observer cycle is allowed to create.

Rules:

```text
prefer enums / counts / digests / short identities
avoid copying large strings
avoid duplicate canonical request bodies
avoid per-consumer clones of the same evidence object
use bounded sample windows
compact closed incidents/corrections according to Retention Policy
```

The runtime must not create a hidden second copy of the full prompt for cache diagnostics.

## 14. Serialization budget

Telemetry persistence/diagnostic serialization must be bounded separately from in-memory object count.

Prefer compact sidecar payloads containing:

```text
schema version
sample/revision identity
digests
counts
enums
reason codes
bounded timestamps
consumer state
```

Never serialize:

```text
raw prompt
raw chat history
raw user/assistant bodies
full gateway logs
full CI manifests per request
```

Existing mechanism-specific ceilings remain local contracts and do not automatically become universal cache telemetry byte limits.

## 15. Persistence/write budget

Cache observability should not create a new semantic-state write path.

Hard rule:

```text
SnapshotStore semantic writes solely for cache telemetry = 0
```

If future telemetry persistence is justified, prefer:

```text
bounded telemetry owner
coalesced state-change/checkpoint writes
reload handoff only when needed
incident/regime transition writes rather than every request
```

Avoid per-turn persistence simply because a sample exists.

## 16. UI / DOM budget

Healthy cache observation should usually be invisible.

Rules:

```text
healthy steady state
→ no per-turn new DOM node
→ no animation/timer loop
→ no focus steal

existing diagnostic view open
→ update bounded existing node/state

warning eligibility
→ use the dedicated warning/diagnostic policy, not a new cache popup stream
```

Formatting large diagnostic text should be lazy where possible: compute/render when diagnostics are requested rather than on every healthy turn.

## 17. Reuse-before-compute registry

Before adding a new cache metric, design review should answer:

```text
Does this fact already exist?
Who owns it?
Can the observer consume the typed fact instead of recomputing it?
Would this introduce a second parser / second prefix walker / second ABI compiler?
```

Examples:

```text
Prefix Map owns first-break attribution
Receipt Correlator owns request/receipt join
Manifest / Guardian own release Cache ABI evidence
Compatibility Key owns comparability descriptor
Baseline Profile owns rolling statistics
Verdict Compiler owns request-level verdict
Transition Model/Sentinel own short-horizon incident state
```

Telemetry Budget should reject duplicated computation whose only justification is consumer convenience.

## 18. Long-chat scaling invariant

A cache telemetry feature is suspect if its incremental cost grows linearly with total historical chat size while the underlying request path already had the required information available.

Preferred scaling characteristics:

```text
per-request metadata updates
→ O(1) or bounded by changed/current regions where feasible

rolling windows
→ fixed/bounded size

regime history
→ rare compact events

correction lineage
→ bounded active dependencies
```

This is a design goal, not a claim that every necessary operation can be O(1).

If an unavoidable operation is scale-sensitive, it must be measured and justified separately rather than hidden inside “diagnostics”.

## 19. Anomaly enrichment must not self-amplify

A regression incident should not cause unlimited extra observer work that makes the request slower, generating more performance anomalies and then triggering still more telemetry.

Therefore:

```text
anomaly
→ bounded enrichment ceiling
→ no recursive re-analysis
→ no repeated expensive expansion for the same sample/revision
```

Use Sample Lifecycle idempotency to remember which enrichment was already performed for a sample revision.

## 20. Reload behavior

Reload may restore bounded observer continuity but must not trigger a full reconstruction of historical cache telemetry.

Preferred:

```text
restore compact handoff
→ resume current pending/incident/baseline identities
→ continue natural requests
```

Avoid:

```text
reload
→ replay entire chat
→ rebuild every past Prefix Map/sample/verdict
```

If required evidence was not retained, the correct result is partial/unverified telemetry until new natural evidence arrives.

## 21. Measurement before hard numbers

Do not freeze arbitrary values yet for:

```text
max telemetry ms/request
max bytes hashed/request
max live sample objects
max serialized telemetry bytes
max UI update frequency
```

Promotion path:

```text
instrument prototype in controlled/static environment
→ measure current production baseline cost
→ measure incremental observer cost
→ test very-long-chat scale
→ establish p50/p95 and worst-case bounds
→ freeze numerical budgets in implementation evidence/CI fixtures
```

The design freezes the cost categories and forbidden operations now; numerical ceilings come from evidence.

## 22. Conformance / CI integration

Future Cache Conformance Matrix should include cost-contract fixtures and static assertions where practical.

Minimum candidates:

```text
1. no provider/network call from cache telemetry path
2. no semantic SnapshotStore write caused only by telemetry
3. same region fingerprint reused rather than recomputed by multiple consumers
4. healthy request does not enter T2 enrichment
5. admitted incident may enter T2 but remains bounded
6. missing cheap Prefix Map path degrades to UNKNOWN instead of full-history fallback scan
7. reload does not rebuild full historical telemetry
8. no raw prompt/history copied into telemetry payload
9. closed sample/incident releases allocations according to Retention Policy
10. repeated processing of same sample revision does not duplicate enrichment
11. diagnostics formatting is not required on every healthy request
12. budget exhaustion lowers evidence authority instead of altering core behavior
```

Performance thresholds themselves should be tested only after measured numerical budgets are established.

## 23. Suggested budget reason codes

Candidate vocabulary:

```text
TB_REUSED_EXISTING_FACT
TB_REUSED_EXISTING_FINGERPRINT
TB_NO_EXTRA_HISTORY_SCAN
TB_NO_NETWORK_CALL
TB_NO_SEMANTIC_STORE_WRITE
TB_MINIMAL_TIER
TB_STANDARD_TIER
TB_ENRICHED_TIER
TB_ENRICHMENT_ALREADY_DONE
TB_BUDGET_DEFERRED
TB_PARTIAL_PREFIX_EVIDENCE
TB_SERIALIZATION_COMPACTED
TB_DIAGNOSTIC_LAZY_RENDER
```

Potential violation codes:

```text
TB_VIOLATION_DUPLICATE_FULL_SCAN
TB_VIOLATION_DUPLICATE_HASH
TB_VIOLATION_UNBOUNDED_ALLOCATION
TB_VIOLATION_PER_TURN_STORE_CHURN
TB_VIOLATION_NETWORK_OBSERVER_DUPLICATION
TB_VIOLATION_UNBOUNDED_DIAGNOSTIC_WORK
```

## 24. Relationship to other cache components

```text
Cache Sample Lifecycle
= what one sample/revision is doing

Cache Evidence Retention Policy
= how long evidence survives

Cache Telemetry Budget
= how much runtime work and live data observability may spend

Cache Prefix Map / Receipt Correlator / Baseline / Verdict / Sentinel
= evidence producers/consumers that must operate inside the budget

Cache Conformance Matrix
= freezes behavior and later cost-boundary regressions

GitHub main
= durable design/evidence authority
```

## 25. Non-goals

```text
cache optimization algorithm
provider cache controller
explicit Gemini cache lifecycle
network polling subsystem
new telemetry database
full performance profiler
renderer optimization
prompt relocation
history rewrite
semantic SnapshotStore expansion
```

## 26. Current classification

```text
GEMINI_CACHE_TELEMETRY_BUDGET
= HIGH VALUE FOR EXTREME LONG CHATS
= OBSERVABILITY COST / PERFORMANCE BOUNDARY
= REUSE-BEFORE-COMPUTE
= NO SECOND FULL-HISTORY SCAN BY DEFAULT
= ZERO NEW NETWORK CALLS BY DEFAULT
= ZERO SEMANTIC SNAPSHOTSTORE WRITES FOR TELEMETRY
= ADAPTIVE BUT DETERMINISTIC OBSERVATION TIERS
= FAILS TOWARD PARTIAL/UNVERIFIED TELEMETRY
= IDEA / DESIGN CANDIDATE

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
```
