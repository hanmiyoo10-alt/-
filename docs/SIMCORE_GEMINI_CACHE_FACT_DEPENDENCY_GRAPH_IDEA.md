# SimCore Gemini Cache Fact Dependency Graph — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · CACHE FACT TYPE-LEVEL DAG · CI-FIRST · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`

Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_OBSERVER_OWNERSHIP_REGISTRY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_FACT_SCHEMA_CONTRACT_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_TELEMETRY_BUDGET_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_SAMPLE_LIFECYCLE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_COMPATIBILITY_KEY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_RECEIPT_CORRELATOR_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_COMPILER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_TRANSITION_MODEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_RETENTION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_GEMINI_PROMPT_STABILITY_MANIFEST_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define one type-level dependency contract for cache-observability facts so future SimCore cache features cannot create hidden dependency cycles, bypass registered producers, or silently derive strong conclusions from unavailable / weaker upstream evidence.

The graph answers:

```text
Which fact kinds may depend on which upstream fact kinds?
Which dependencies are required vs optional enrichment?
Which edges are same-request/same-revision and therefore must remain acyclic?
Which feedback edges are legal only across time or sample revisions?
What happens when an upstream fact is UNKNOWN / UNVERIFIED / WITHHELD_BY_BUDGET / SUPERSEDED?
Can a consumer bypass a typed fact and read its producer's raw source directly?
Can a receipt correlation use evidence that is itself derived from the receipt being selected?
```

This is a design/CI contract. It is not a new runtime service, event bus, dependency-injection container, cache controller, or semantic state owner.

## 2. Constitutional boundary

Permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The dependency graph may constrain cache-observability dataflow only. It must never authorize SimCore to:

```text
write renderer prose
rewrite chat history
move prompt sections automatically
change model instructions because of cache telemetry
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

Graph metadata must remain sidecar/design/CI material and must not be injected into the model prompt.

## 3. Fact Dependency Graph is not the Evidence Chain

The two DAGs operate at different levels.

```text
Cache Fact Dependency Graph
= TYPE / DESIGN LEVEL
= which fact kinds are legally allowed to depend on which fact kinds

Cache Evidence Chain
= REQUEST INSTANCE LEVEL
= which concrete evidence instances actually produced this request's conclusion
```

Example type-level rule:

```text
CACHE_REQUEST_VERDICT
may consume:
- CACHE_PROVIDER_RECEIPT
- CACHE_RECEIPT_CORRELATION
- CACHE_FIRST_BREAK
- CACHE_COMPATIBILITY
- CACHE_BASELINE_OBSERVATION
- admitted release/ABI evidence
```

Example instance-level lineage:

```text
S42/r3 CACHE_REQUEST_VERDICT
→ receipt evidence E17
→ correlation E21
→ first-break E24
→ baseline observation E31
```

The Fact Dependency Graph constrains which edges the Evidence Chain is allowed to contain. The Evidence Chain records actual provenance.

Do not collapse them into one structure.

## 4. Core architecture — same-revision DAG plus explicit temporal edges

Within one cache sample revision, semantic dependency edges must form a directed acyclic graph.

Required invariant:

```text
SAMPLE S42 / REVISION 3

same-revision fact dependencies
= DAG
= NO CYCLE
```

However the overall cache system legitimately has time-based feedback.

Example:

```text
request N verdict
→ Sentinel temporal state
→ observation tier for request N+1
```

That is not a same-revision cycle.

Therefore the graph must distinguish:

```text
SAME_REVISION DEPENDENCY
vs
TEMPORAL_PREVIOUS / NEXT-REQUEST FEEDBACK
vs
REVISION_SUCCESSOR CORRECTION
vs
CI/RELEASE CONTRACT REFERENCE
```

A future graph validator must reject a temporal feedback edge that is mislabeled as a same-revision dependency.

## 5. Edge vocabulary

Initial candidate edge classes:

```text
REQUIRED_SAME_REVISION
OPTIONAL_SAME_REVISION
REFERENCE_ONLY
TEMPORAL_PREVIOUS
REVISION_PREVIOUS
REVISION_SUCCESSOR
CI_RELEASE_REFERENCE
DIAGNOSTIC_ONLY
```

### 5.1 REQUIRED_SAME_REVISION

The downstream fact cannot make its declared strong claim without this upstream fact at an allowed status/authority.

If the upstream is unavailable, the downstream must degrade, remain pending, or become unavailable according to its schema/policy.

It may not privately recreate the upstream fact.

### 5.2 OPTIONAL_SAME_REVISION

The downstream fact can still be valid without this input, but the optional input may improve attribution, explanation, or authority.

Missing optional evidence must not be treated as negative evidence.

### 5.3 REFERENCE_ONLY

The downstream object may carry an identity/reference for traceability but does not semantically derive its value from that referenced fact.

### 5.4 TEMPORAL_PREVIOUS

The input comes from a previous compatible request / prior temporal state.

This edge may influence current state but cannot point from the current result back into its own current-revision prerequisite.

### 5.5 REVISION_PREVIOUS / REVISION_SUCCESSOR

Used by Sample Lifecycle correction/supersession.

Conceptual:

```text
S42/r2
SUPERSEDED_BY
S42/r3
```

This does not mean r3 is a second request.

### 5.6 CI_RELEASE_REFERENCE

References release-time cache ABI / Prompt Stability Manifest / Guardian evidence.

Rich CI analysis may be referenced by bounded runtime facts without rerunning the CI analysis on every request.

### 5.7 DIAGNOSTIC_ONLY

Permits presentation/explainability consumption that must not alter semantic verdicts, baselines, or temporal state.

## 6. Initial dependency strata

The first architecture should remain layered and explainable.

Conceptual strata:

```text
D0  root context / external authority / release contract
 ↓
D1  request identity + observation budget + structural compatibility
 ↓
D2  local attribution + receipt correlation
 ↓
D3  evidence admission + baseline observation
 ↓
D4  request-local verdict
 ↓
D5  short-horizon temporal transition
 ↓
D6  regime / opportunity / retention summaries
```

This is a conceptual dependency direction, not necessarily a physical module directory layout.

No lower stratum may depend on a higher stratum from the same sample revision merely for convenience.

## 7. Root inputs are not all cache facts

Some legal roots originate outside the cache-fact graph.

Examples:

```text
local SimCore request/sample identity
request family / mode from existing runtime authority
bounded local request topology / existing fingerprints
approved provider receipt candidate set
Prompt Stability Manifest stable/slow ABI identity
explicit diagnostic request
previous compatible Sentinel temporal state
previous Baseline Profile state
previous Regime Ledger state
```

The graph should model these as typed external/root inputs or contract references rather than inventing fake cache facts solely to make every node look uniform.

Do not make the cache graph a second source of truth for existing SimCore runtime state.

## 8. Initial core fact graph

The exact machine-readable graph is implementation-time work, but the semantic dependency direction should begin approximately as follows.

### 8.1 `CACHE_SAMPLE_REVISION`

Owner:

```text
Cache Sample Lifecycle
```

Inputs:

```text
local request/sample identity
prior revision identity when correction/enrichment occurs
```

Rules:

```text
no dependency on downstream verdict/baseline/regime
same request + new evidence -> revision increase, not new request
```

### 8.2 `CACHE_TELEMETRY_TIER`

Owner:

```text
Cache Telemetry Budget
```

Current-request inputs may include:

```text
previous compatible Sentinel temporal state (TEMPORAL_PREVIOUS)
explicit diagnostic mode
static/runtime budget policy
known reload context where already available cheaply
```

Critical rule:

```text
current request verdict
must NOT determine
that same request's initial telemetry tier
```

Otherwise:

```text
Telemetry Tier -> available facts -> Verdict -> Telemetry Tier
```

becomes a current-revision feedback cycle.

If the current request exposes a need for richer observation, it may schedule:

```text
next request T2
or
new bounded sample revision/enrichment phase
```

with an explicit revision/temporal edge.

### 8.3 `CACHE_COMPATIBILITY`

Owner:

```text
Cache Compatibility Key
```

Inputs:

```text
chat scope identity
request family
Gemini/provider/model family when authoritatively available independently
stable/slow Cache ABI identity
prompt placement contract
optional route/runtime class according to policy
```

Forbidden same-revision inputs:

```text
CACHE_REQUEST_VERDICT
CACHE_TEMPORAL_TRANSITION
CACHE_REGIME_SUMMARY as mandatory key identity
current cached ratio / baseline deviation
```

`CACHE_REGIME` remains temporal annotation over a structurally compatible population, not a mandatory compatibility-key equality field.

### 8.4 `CACHE_PROVIDER_RECEIPT`

Authority:

```text
Usage Dashboard / approved gateway-provider receipt source
```

This is an external-authority root fact.

No local cache fact may manufacture:

```text
cachedReadTokens
cacheWriteTokens
provider request identity
provider route/cache-scope fact
```

from local prefix fingerprints.

### 8.5 `CACHE_RECEIPT_CORRELATION`

Owner:

```text
Cache Receipt Correlator
```

Inputs:

```text
CACHE_SAMPLE_REVISION / request identity context
approved CACHE_PROVIDER_RECEIPT candidates
bounded time/model/token hints
optional pre-correlation-safe compatibility projection
```

Critical anti-self-validation rule:

> A receipt may not be selected using a compatibility or authority fact that was itself derived from that selected receipt unless an independent source established the fact first.

Bad cycle:

```text
candidate receipt says model = X
→ compatibility says candidate is compatible because model = X
→ correlation selects candidate
→ selected receipt is now used as proof that model = X
```

The Correlator may use fields from each candidate as candidate-filtering inputs, but it must not present those same fields as independent confirmation of the selection.

Correlation remains precision-first:

```text
uncertain -> AMBIGUOUS / UNVERIFIED
```

not forced selection.

### 8.6 `CACHE_FIRST_BREAK`

Owner:

```text
Cache Prefix Map
```

Inputs:

```text
bounded local request topology / reusable fingerprints
prior comparable local topology when available
CACHE_COMPATIBILITY or a compatible-comparison selection result
CACHE_TELEMETRY_TIER
```

If required work exceeds budget:

```text
status = WITHHELD_BY_BUDGET or UNKNOWN
```

Consumers may not bypass this result with a private second history scan.

### 8.7 `CACHE_EVIDENCE_ADMISSION` — graph-driven vocabulary refinement

The dependency review reveals that Evidence Admission Policy has a first-class typed output even though the initial Fact Schema vocabulary did not explicitly list an admission fact.

Candidate fact identity:

```text
CACHE_EVIDENCE_ADMISSION
```

Possible payload:

```text
consumerId
claimScope
admissionClass
compatibilityClass
evidenceRefs[]
rejectedRefs[]
reasonCodes[]
```

Owner:

```text
Cache Evidence Admission Policy
```

Inputs depend on claim/consumer and may include:

```text
CACHE_COMPATIBILITY
CACHE_RECEIPT_CORRELATION
CACHE_PROVIDER_RECEIPT authority
CACHE_FIRST_BREAK
release/ABI contract references
other registered typed evidence
```

Forbidden input:

```text
downstream CACHE_REQUEST_VERDICT used to justify its own evidence admission
```

This is a design refinement discovered by the graph; no runtime/schema change is made today.

### 8.8 `CACHE_BASELINE_OBSERVATION`

Owner:

```text
Cache Baseline Profile
```

Inputs:

```text
compatible prior baseline state (TEMPORAL_PREVIOUS)
CACHE_COMPATIBILITY
admitted provider/cache sample evidence
CACHE_PROVIDER_RECEIPT
CACHE_RECEIPT_CORRELATION
sample identity/revision
```

Ordering invariant:

```text
compare current sample against prior baseline
→ classify current observation
→ only afterward decide whether current sample may mutate baseline
```

The current sample must not first update the baseline and then compare against the baseline it already changed.

### 8.9 `CACHE_REQUEST_VERDICT`

Owner:

```text
Cache Verdict Compiler
```

Inputs may include:

```text
CACHE_EVIDENCE_ADMISSION
CACHE_PROVIDER_RECEIPT
CACHE_RECEIPT_CORRELATION
CACHE_COMPATIBILITY
CACHE_FIRST_BREAK
CACHE_BASELINE_OBSERVATION
CI_RELEASE_REFERENCE to Manifest/Guardian ABI evidence
bounded reload/cadence/route evidence when registered
```

Rules:

```text
request-local
stateless
deterministic
no network
no baseline mutation
no Sentinel state mutation
```

The Verdict Compiler must not bypass registered facts to read raw gateway logs, rewalk history, or rerun detailed CI Prompt ABI analysis.

### 8.10 `CACHE_TEMPORAL_TRANSITION`

Owner:

```text
Cache Regression Sentinel
```

Transition Model:

```text
specification / reducer contract
```

Inputs:

```text
CACHE_REQUEST_VERDICT
CACHE_COMPATIBILITY
previous compatible Sentinel temporal state (TEMPORAL_PREVIOUS)
```

Current transition output must not feed back into the current request verdict.

Allowed feedback:

```text
current transition
→ next request telemetry tier / incident context
```

### 8.11 `CACHE_REGIME_SUMMARY`

Owner:

```text
Cache Regime Ledger
```

Inputs:

```text
CACHE_TEMPORAL_TRANSITION
CACHE_BASELINE_OBSERVATION / established baseline change
CACHE_COMPATIBILITY
prior regime state (TEMPORAL_PREVIOUS)
release/model/ABI evidence when relevant
```

One request verdict cannot directly create a confirmed regime.

Regime confirmation requires repeated trusted temporal/baseline evidence according to its own contract.

### 8.12 `CACHE_RETENTION_DECISION`

Owner:

```text
Cache Evidence Retention Policy
```

Inputs may include:

```text
CACHE_SAMPLE_REVISION
consumer pins
baseline-window membership
active Sentinel incident state
correction dependencies
regime-summary state
explicit retention policy/time input
```

This fact governs keep/compact/drop behavior only.

It must not feed back into semantic cache conclusions as evidence that a request was healthy or degraded.

If a fact was dropped due retention pressure:

```text
future evidence may become unavailable / UNVERIFIED
```

not implicitly healthy.

## 9. Same-revision forbidden cycles

The graph must reject at least these classes of cycle.

### 9.1 Verdict -> evidence admission -> verdict

Forbidden:

```text
CACHE_REQUEST_VERDICT
→ CACHE_EVIDENCE_ADMISSION
→ CACHE_REQUEST_VERDICT
```

Admission decides what evidence may support a verdict. The verdict may not retroactively admit evidence because it likes the conclusion.

### 9.2 Verdict -> compatibility -> verdict

Forbidden:

```text
CACHE_REQUEST_VERDICT
→ CACHE_COMPATIBILITY
→ CACHE_REQUEST_VERDICT
```

Compatibility is a prerequisite for comparison, not a conclusion inferred from the verdict.

### 9.3 Current transition -> current verdict

Forbidden:

```text
CACHE_REQUEST_VERDICT
→ CACHE_TEMPORAL_TRANSITION
→ CACHE_REQUEST_VERDICT
```

Temporal state affects future/previous context, not the already-compiled current verdict.

### 9.4 Current telemetry tier -> verdict -> current telemetry tier

Forbidden in one revision.

Use explicit next-request or revision-successor enrichment instead.

### 9.5 Regime -> compatibility mandatory identity -> regime

Forbidden circular regime discovery.

`CACHE_REGIME` is not a mandatory universal compatibility-key equality dimension.

## 10. Upstream status propagation

Fact Schema status semantics must constrain downstream behavior.

### AVAILABLE

May be consumed when schema/authority/admission requirements pass.

### UNKNOWN

A required downstream claim cannot silently assume a default value.

Possible downstream result:

```text
UNKNOWN
UNVERIFIED
weaker verdict
missingEvidence[]
```

### UNVERIFIED

May support diagnostic/research views according to Admission Policy, but must not become verified solely because several downstream components repeat it.

### WITHHELD_BY_BUDGET

Consumers must respect the budget decision.

Forbidden:

```text
upstream WITHHELD_BY_BUDGET
→ downstream privately recomputes same fact
```

Allowed:

```text
reduce authority
record missing/budget-withheld reason
continue with bounded evidence
```

### PENDING

Downstream fact may remain pending or produce a local-only/partial result if its schema explicitly allows that mode.

`PENDING` must not be interpreted as MISS or zero cached tokens.

### AMBIGUOUS

Strong request-specific provider claims must fail closed.

### SUPERSEDED

A superseded upstream revision may remain in provenance but must not continue as an active current input.

Dependent current facts become:

```text
STALE / REEVALUATION_REQUIRED / SUPERSEDED
```

according to their owner contract.

### INVALID

Must not be consumed as valid evidence.

## 11. Authority cannot increase along an edge by repetition

Dependency composition must preserve evidence authority.

Rule:

```text
weak upstream authority
repeated by multiple downstream derived facts
!= stronger authority
```

Example:

```text
HEURISTIC receipt correlation
→ admission diagnostic-only
→ baseline diagnostic-only
→ verdict
```

must not become:

```text
provider cache VERIFIED
```

merely because three components consumed the same heuristic source.

The Admission Policy remains the authority gate.

## 12. No raw-source bypass

A registered typed fact creates an architectural boundary.

Example:

```text
Usage Dashboard / approved receipt source
→ CACHE_PROVIDER_RECEIPT
→ Cache Receipt Correlator
→ CACHE_RECEIPT_CORRELATION
→ Verdict Compiler
```

Forbidden:

```text
Verdict Compiler
→ directly parse raw LLMGateway row
```

Likewise:

```text
Prefix Map
→ CACHE_FIRST_BREAK
→ Sentinel
```

Forbidden:

```text
Sentinel
→ direct second history parser
```

Raw-source bypass violates:

```text
Ownership Registry
Fact Schema Contract
Telemetry Budget
Fact Dependency Graph
```

simultaneously.

## 13. Correction / supersession propagation

When an upstream sample revision is corrected, downstream derived facts that depended on the old revision must not remain silently current.

Conceptual:

```text
S42/r1 receipt correlation
→ baseline observation B1
→ verdict V1
→ transition T1

later:
S42/r2 supersedes correlation
```

Required behavior:

```text
mark affected descendants stale/superseded
→ bounded reevaluation/rebuild according to Sample Lifecycle
→ do not count r2 as a second request
```

Do not perform an unbounded whole-chat dependency replay.

The Retention Policy must preserve enough correction lineage to identify affected live descendants until they reconcile.

## 14. Temporal feedback must be delayed or revision-scoped

Legal feedback should be explicit.

Example:

```text
request N CACHE_REQUEST_VERDICT
→ request N CACHE_TEMPORAL_TRANSITION
→ Sentinel state N
→ request N+1 CACHE_TELEMETRY_TIER
```

This is legal because the feedback crosses a request boundary.

Possible same-request enrichment:

```text
S42/r1 minimal facts
→ contradiction detected
→ enrichment requested
→ S42/r2 bounded enriched evidence
→ r1 descendants superseded/re-evaluated
```

This is legal only if the revision boundary and idempotency rules are explicit.

Forbidden shortcut:

```text
r1 verdict
mutates r1 prerequisite in-place
then pretends the original verdict was produced from the new prerequisite
```

Provenance must show the new revision.

## 15. Machine-readable graph candidate

A future CI artifact may look conceptually like:

```json
{
  "graphSchemaVersion": 1,
  "nodes": {
    "CACHE_REQUEST_VERDICT": {
      "producerId": "cache-verdict-compiler",
      "stage": "D4",
      "dependencies": [
        {
          "source": "CACHE_EVIDENCE_ADMISSION",
          "edge": "REQUIRED_SAME_REVISION"
        },
        {
          "source": "CACHE_FIRST_BREAK",
          "edge": "OPTIONAL_SAME_REVISION"
        },
        {
          "source": "PROMPT_STABILITY_MANIFEST",
          "edge": "CI_RELEASE_REFERENCE"
        }
      ],
      "forbiddenRawSources": [
        "LLMGATEWAY_RAW_LOG",
        "SECOND_CHAT_HISTORY_SCAN"
      ]
    }
  }
}
```

This is only a candidate representation.

Do not make runtime request processing traverse a large graph registry merely because CI uses one.

Preferred implementation:

```text
static graph contract
+ ordinary typed module dependencies
+ fixture/static validation
```

with near-zero runtime graph overhead.

## 16. Graph schema and fact schema are separate

Required version split:

```text
factSchemaVersion
= shape/semantics of one fact payload

graphSchemaVersion
= legal dependency relation format
```

Changing dependency metadata without changing a fact payload must not be reported as a fact payload ABI change.

Likewise changing telemetry graph metadata must not be reported as Gemini prompt ABI change.

## 17. Graph-driven schema inventory refinement

The first dependency pass exposes one likely missing first-class fact from the initial Fact Schema vocabulary:

```text
CACHE_EVIDENCE_ADMISSION
```

Reason:

```text
Admission Policy
= independent semantic owner
= produces typed consumer/claim-scoped allow/hold/reject decision
= Verdict/Baseline/Sentinel should consume it rather than recreate admission logic
```

Do not immediately mutate runtime or existing schemas merely because this document identifies the gap.

When implementation begins:

```text
Fact Schema inventory review
→ Ownership Registry review
→ Dependency Graph review
→ add only the minimum executable fact vocabulary
```

Other external release contracts such as Prompt Stability Manifest / Guardian may remain `CI_RELEASE_REFERENCE` roots rather than being forced into runtime fact IDs unless runtime evidence proves a typed fact is useful.

## 18. CI/static validation targets

A future graph validator should prove at least:

```text
all graph factIds exist in the active Fact Schema registry
all producerIds match Ownership Registry
all SAME_REVISION edges are acyclic
no producer depends on a downstream stage in the same revision
required dependency statuses have explicit degradation behavior
no consumer bypasses a registered fact via forbidden raw source/import
no WITHHELD_BY_BUDGET upstream is privately recomputed
no current-request verdict feeds current-request telemetry-tier prerequisite
no regime identity creates circular compatibility
no receipt correlation self-validates with facts derived only from selected receipt
no superseded fact remains an active current dependency
CI/release references do not force runtime re-analysis
```

Static import checks can supplement fixture tests where module boundaries are explicit.

## 19. Suggested failure vocabulary

Candidate CI/diagnostic codes:

```text
CACHE_FACT_DEPENDENCY_CYCLE
CACHE_FACT_ILLEGAL_UPSTREAM
CACHE_FACT_STAGE_INVERSION
CACHE_FACT_REQUIRED_UPSTREAM_BYPASSED
CACHE_FACT_RAW_SOURCE_BYPASS
CACHE_FACT_SELF_VALIDATING_CORRELATION
CACHE_FACT_CURRENT_REVISION_FEEDBACK_LOOP
CACHE_FACT_TEMPORAL_EDGE_MISCLASSIFIED
CACHE_FACT_STATUS_PROPAGATION_VIOLATION
CACHE_FACT_AUTHORITY_UPGRADE_VIOLATION
CACHE_FACT_SUPERSEDED_UPSTREAM_ACTIVE
CACHE_FACT_DEPENDENCY_OWNER_MISMATCH
CACHE_FACT_DEPENDENCY_SCHEMA_UNKNOWN
CACHE_FACT_GRAPH_SCHEMA_DRIFT_UNDECLARED
CACHE_FACT_RELEASE_REFERENCE_RUNTIME_RECOMPUTE
```

These are architecture/dataflow failures, not runtime defect severity labels by themselves.

## 20. Conformance Matrix integration

Future Cache Conformance Matrix fixtures should include at least:

```text
1. valid provider receipt -> correlation -> admission -> verdict path
2. missing required provider receipt -> verdict authority degrades, no invented zero/MISS
3. ambiguous correlation -> strong provider verdict forbidden
4. first-break WITHHELD_BY_BUDGET -> Verdict does not perform private history scan
5. C request followed by B_START -> incompatible transition edge rejected
6. same-revision Verdict -> Telemetry Tier feedback -> graph cycle FAIL
7. prior-request Verdict -> next-request Telemetry Tier -> valid TEMPORAL_PREVIOUS path
8. regimeId used as mandatory compatibility key -> circularity fixture FAIL
9. Correlator uses selected receipt-derived field as independent proof of selection -> self-validation FAIL
10. raw LLMGateway row parsed by Verdict Compiler -> raw-source bypass FAIL
11. Sentinel recomputes first break -> ownership/dependency FAIL
12. superseded correlation revision invalidates dependent baseline/verdict/transition
13. correction revision does not count as second request
14. CI Manifest reference used without runtime re-hashing all segments
15. optional upstream missing -> valid lower-authority result where contract permits
16. required upstream missing -> downstream cannot remain strong AVAILABLE claim
17. Evidence Chain instance edges are subset of allowed type-level graph edges
18. renderer boundary unchanged
```

## 21. Telemetry Budget relationship

The graph must encode enough cost-boundary semantics to prevent consumers from treating dependency failure as permission to recompute.

Canonical:

```text
registered producer
→ cannot produce fact inside active budget
→ fact = WITHHELD_BY_BUDGET / UNKNOWN
→ downstream degrades
```

not:

```text
consumer notices missing fact
→ performs duplicate expensive scan/hash/network call
```

This is how:

```text
Telemetry Budget
+ Ownership Registry
+ Fact Schema Contract
+ Fact Dependency Graph
```

form one enforceable architecture boundary.

## 22. Evidence Chain relationship

At runtime, a derived fact should expose bounded provenance refs to the concrete upstream evidence instances it actually consumed.

The Evidence Chain may then validate conceptually:

```text
instance edge
must be permitted by
Fact Dependency Graph type edge
```

Example:

```text
S42/r3 verdict V9
→ depends on correlation C4
```

is legal only if:

```text
CACHE_REQUEST_VERDICT
→ CACHE_RECEIPT_CORRELATION
```

is an allowed dependency class.

This gives future diagnostics a strong explanation path without creating a second semantic authority.

## 23. Non-goals

```text
runtime service locator
runtime dynamic dependency injection framework
new global event bus
full graph database
unbounded per-request provenance archive
provider network observer
explicit Gemini cache manager
prompt rewriting
history rewriting
renderer behavior changes
automatic optimization from graph shape
```

## 24. Recommended rollout

```text
Phase 0
review executable fact inventory from actual future implementation candidates

Phase 1
machine-readable graph in CI/report-only mode

Phase 2
validate Ownership Registry + Fact Schema + dependency acyclicity

Phase 3
add raw-source/import boundary checks where practical

Phase 4
connect Conformance Matrix instance provenance fixtures

Phase 5
only if runtime implementation proves useful:
carry minimal fact/provenance IDs needed for bounded Evidence Chain diagnostics
```

Do not ship the entire cache-observability research stack as one runtime release.

## 25. Current classification

```text
GEMINI_CACHE_FACT_DEPENDENCY_GRAPH
= HIGH VALUE
= CACHE OBSERVABILITY TYPE-LEVEL DAG
= CI-FIRST
= SAME-REVISION ACYCLIC
= EXPLICIT TEMPORAL / REVISION FEEDBACK
= ANTI-RAW-SOURCE-BYPASS
= ANTI-SELF-VALIDATING CORRELATION
= STATUS / AUTHORITY PRESERVING
= NEAR-ZERO RUNTIME OVERHEAD TARGET
= IDEA / DESIGN CANDIDATE

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
release-system change: NONE
```
