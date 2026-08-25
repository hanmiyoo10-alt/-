# SimCore Gemini Cache Observer Ownership Registry — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · SINGLE-PRODUCER CACHE FACT OWNERSHIP · CI-FIRST · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`

Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_TELEMETRY_BUDGET_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_RECEIPT_CORRELATOR_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_COMPATIBILITY_KEY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_COMPILER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_TRANSITION_MODEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_SAMPLE_LIFECYCLE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_RETENTION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_OPPORTUNITY_ANALYZER_IDEA.md`
- `docs/SIMCORE_GEMINI_PROMPT_STABILITY_MANIFEST_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define one shared ownership registry for cache-observability facts so future SimCore cache features do not independently re-parse, re-hash, re-scan, or reinterpret facts that already have an authoritative producer.

The registry answers:

```text
Who is allowed to produce this cache fact?
Who may only consume it?
Which source is the external authority when the fact comes from the gateway/provider?
Which duplicate computation is forbidden?
Which bounded sidecar shape is shared downstream?
What happens when the authoritative producer cannot provide the fact within budget?
```

The registry exists to enforce:

```text
single semantic producer
+ typed fact reuse
+ no duplicate ownership
+ no duplicate scale-sensitive work
+ explainable authority
```

It is not a new runtime service and is not a second cache controller.

## 2. Constitutional boundary

Permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Ownership Registry may constrain cache-observability implementation boundaries. It must never authorize SimCore to:

```text
write or rewrite renderer prose
rewrite chat history
move prompt sections automatically
change model instructions because of cache telemetry
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

Registry metadata is sidecar/design/CI material only. It must not be injected into the model prompt.

## 3. Core distinction — semantic producer vs computation location

`single producer` does not mean every arithmetic operation must physically live in one function.

It means:

> For one semantic cache fact, exactly one component owns the meaning and canonical production contract.

Consumers may format, display, or pass through the fact, but must not independently recreate competing semantics.

Example:

```text
Cache Prefix Map
= owner/producer of firstBreakOwner

Regression Sentinel
= consumer of firstBreakOwner

Sentinel performing its own history walk and producing another firstBreakOwner
= OWNERSHIP VIOLATION
```

A cheap local rendering such as:

```text
firstBreakOwner = PRE_SIMCORE
→ display text "PRE_SIMCORE"
```

is not a second producer.

A second algorithm that decides where the first break occurred is.

## 4. External authority vs internal derived producer

Some facts originate outside SimCore.

For those, distinguish:

```text
EXTERNAL AUTHORITY
= system that owns the original fact

INTERNAL JOIN / NORMALIZATION OWNER
= component that attaches or adapts that fact for SimCore use
```

Example:

```text
Usage Dashboard / approved gateway receipt source
= authority for provider cache receipt fields

Cache Receipt Correlator
= owner of request <-> receipt correlation result
```

Therefore the Correlator must not become the authority for provider cache semantics merely because it carries the receipt downstream.

Likewise Prefix Map must not infer provider cached tokens from local fingerprints.

## 5. Ownership role vocabulary

Candidate machine-readable roles:

```text
EXTERNAL_AUTHORITY
AUTHORITATIVE_PRODUCER
DERIVED_PRODUCER
JOIN_OWNER
NORMALIZER
CONSUMER
DIAGNOSTIC_CONSUMER
CI_ONLY_PRODUCER
```

These are ownership roles, not defect severity labels.

### EXTERNAL_AUTHORITY

Owns the original fact outside SimCore.

Example:

```text
Gemini/gateway cache receipt
```

### AUTHORITATIVE_PRODUCER

Owns one SimCore semantic fact and its production rules.

Example:

```text
Prefix Map -> firstBreakOwner
```

### DERIVED_PRODUCER

Produces a higher-level fact solely from already-authoritative typed inputs.

Example:

```text
Verdict Compiler -> verdictClass
```

### JOIN_OWNER

Owns identity/correlation between evidence planes without taking over either plane's semantic authority.

Example:

```text
Receipt Correlator -> correlationClass
```

### NORMALIZER

Converts equivalent external representations into one defined internal shape without inventing new semantics.

Normalization rules must be explicit and fixture-tested.

### CONSUMER

May read/use a fact but not reproduce its semantic algorithm.

### DIAGNOSTIC_CONSUMER

May display bounded fact metadata but must not mutate authority/state based on display-only logic.

### CI_ONLY_PRODUCER

May perform richer release-time analysis whose cost or scope is inappropriate on the runtime hot path.

Example:

```text
Prompt Stability Manifest / Cache ABI Guardian detailed segment diff
```

## 6. Initial fact ownership registry

The exact machine-readable registry is implementation-time work, but the semantic ownership should begin with the following map.

### 6.1 Provider cache receipt facts

Facts:

```text
provider metric source
provider request identity when exposed
input/prompt tokens
cached read tokens
cache write tokens
cache write 5m / 1h tokens when supported
route/cache-scope metadata when authoritative
```

Authority:

```text
Usage Dashboard / approved gateway-provider receipt source
= EXTERNAL_AUTHORITY
```

SimCore rule:

```text
no local fingerprint may synthesize these facts
```

Receipt Correlator may attach the normalized receipt to a SimCore request, but provider cache evidence remains external authority.

Forbidden duplicates:

```text
Prefix Map infers provider HIT/MISS
Baseline invents missing cachedReadTokens
Sentinel treats local SAME fingerprint as provider cache HIT
```

No approved receipt source:

```text
provider cache evidence = UNVERIFIED
```

### 6.2 Request-to-receipt correlation

Facts:

```text
correlationClass
requestIdentityDigest when allowed
correlation evidence flags
candidate count
correlation status / pending state
```

Producer:

```text
Cache Receipt Correlator
= JOIN_OWNER / AUTHORITATIVE_PRODUCER for correlation semantics
```

Consumers may include:

```text
Evidence Admission Policy
Baseline Profile
Verdict Compiler
Sample Lifecycle
Diagnostics
Regime Ledger
Opportunity Analyzer
```

Forbidden duplicates:

```text
Baseline picks "nearest" gateway row itself
Sentinel correlates receipt by timestamp independently
Regime Ledger re-matches old receipts
```

### 6.3 Prefix topology / first-break facts

Facts:

```text
region SAME/CHANGED state
firstBreakOwner
firstBreak location/index
CACHE_SHADOW state
local reusable-prefix estimate
```

Producer:

```text
Cache Prefix Map
= AUTHORITATIVE_PRODUCER
```

Consumers may include:

```text
Verdict Compiler
Regression Sentinel via compiled verdict/evidence
Evidence Chain
Diagnostics
Opportunity Analyzer
Regime summaries
```

Forbidden duplicates:

```text
Sentinel second prefix parser
Verdict Compiler second history walker
Opportunity Analyzer second full-request diff
```

If Prefix Map cannot produce the fact within Telemetry Budget:

```text
firstBreakOwner = UNKNOWN
```

not:

```text
consumer recomputes it expensively
```

### 6.4 Structural comparability facts

Facts:

```text
CacheCompatibilityDescriptor
compatibilityKeyDigest
compatibilityClass
compatibility reason codes
unknown dimensions
```

Producer:

```text
Cache Compatibility Key comparator
= AUTHORITATIVE_PRODUCER
```

Consumers may include:

```text
Admission Policy
Baseline Profile
Verdict Transition Model / Sentinel
Regime Ledger
Receipt Correlator as bounded filtering aid only
Conformance Matrix
```

Important:

```text
same Compatibility Key
!=
same gateway request
```

The Compatibility component must not take over request correlation.

Forbidden duplicates:

```text
Baseline has a private "almost same family" comparator
Sentinel uses different model-family compatibility rules
Regime Ledger defines another compatibility tuple
```

### 6.5 Prompt Cache ABI identity / segment drift facts

Detailed release facts:

```text
stable ABI identity
slow ABI identity
segment identities/order
detailed changed segment list
Cache ABI intent
```

Release/CI producer:

```text
Prompt Stability Manifest
+ Cache ABI Guardian
= CI_ONLY_PRODUCER / AUTHORITATIVE RELEASE EVIDENCE
```

Runtime should normally consume only bounded identities already materialized by the compiler/release contract.

Do not perform a second detailed segment-manifest pass on every request merely because runtime consumers want attribution.

Consumers may include:

```text
Compatibility Key
Verdict Compiler
Prefix Map attribution support
Evidence Chain
Regime Ledger
Opportunity Analyzer
Diagnostics
```

Forbidden duplicates:

```text
Sentinel re-hashes every stable/slow segment
Prefix Map independently defines Cache ABI intent
Compatibility Key parses prompt text to reconstruct manifest
```

### 6.6 Evidence provenance

Facts:

```text
evidence node identity
dependency edges
supersession/correction edges
authority metadata
```

Producer:

```text
Cache Evidence Chain
= AUTHORITATIVE_PRODUCER for cache evidence provenance
```

The Chain does not replace underlying fact owners. It references them.

Forbidden duplicate:

```text
consumer creates a parallel hidden provenance ledger
```

### 6.7 Evidence admission

Facts:

```text
consumer-specific admission disposition
claim scope
admission reason codes
rejection/hold reason
```

Producer:

```text
Cache Evidence Admission Policy evaluator
= AUTHORITATIVE_PRODUCER
```

Consumers may include:

```text
Baseline Profile
Verdict Compiler
Transition/Sentinel
Regime Ledger
Opportunity Analyzer
```

Forbidden duplicates:

```text
Baseline privately upgrades HEURISTIC evidence to trusted
Sentinel overrides AMBIGUOUS rejection
Regime Ledger invents a weaker admission threshold
```

Consumer-specific strictness may differ, but it must be expressed through the shared Admission Policy rather than a private alternative policy engine.

### 6.8 Baseline statistical facts

Facts:

```text
baseline state: COLD / WARMING / ESTABLISHED / STALE / RESET_REQUIRED
sample count/window summary
cached-ratio median / normal band
material deviation classification
current compatible normal
```

Producer:

```text
Cache Baseline Profile
= AUTHORITATIVE_PRODUCER for rolling statistical normal
```

Consumers may include:

```text
Verdict Compiler
Regression Sentinel
Regime Ledger
Diagnostics
Opportunity Analyzer
```

Forbidden duplicates:

```text
Sentinel maintains a second independent cache median
Verdict Compiler learns its own rolling threshold
Regime Ledger runs a second baseline engine
```

### 6.9 Request-level cache verdict

Facts:

```text
verdictClass
verdictAuthority
reason codes
missing evidence
contradiction refs
```

Producer:

```text
Cache Verdict Compiler
= DERIVED_PRODUCER / AUTHORITATIVE request-level verdict owner
```

Consumers may include:

```text
Regression Sentinel
Diagnostics
Regime Ledger
Opportunity Analyzer
Evidence Chain
```

Forbidden duplicates:

```text
Sentinel reclassifies request-level ownership from raw evidence
Diagnostics invents a different verdict vocabulary
Opportunity Analyzer bypasses verdict and creates its own root-cause decision tree
```

### 6.10 Short-horizon temporal incident state

Facts:

```text
QUIET
CANDIDATE
PERSISTENT
RECOVERY_PENDING
EVIDENCE_GAP
transition events
held state across evidence gaps
```

Design contract:

```text
Cache Verdict Transition Model
= temporal state-machine specification
```

Runtime owner/producer:

```text
Cache Regression Sentinel
= AUTHORITATIVE_PRODUCER of live short-horizon incident state
```

Do not create a separate runtime Transition service or second state store.

Consumers may include:

```text
Diagnostics
warning eligibility
Regime handoff logic
Opportunity Analyzer
Retention Policy
Telemetry Budget observation-tier selection
```

### 6.11 Long-horizon cache regime facts

Facts:

```text
CACHE_REGIME id
regime lifecycle status
confirmed/superseded boundary
transition class
baseline-before / baseline-after summary
```

Producer:

```text
Cache Regime Ledger
= AUTHORITATIVE_PRODUCER
```

Forbidden duplicates:

```text
Baseline assigns historical regime IDs
Sentinel creates persistent regime history
Compatibility Key embeds regime ID as mandatory structural identity
```

### 6.12 Sample lifecycle / revision facts

Facts:

```text
logical sample identity
sample revision
superseded revision
consumer-use state
idempotency consumption key
quarantine state
```

Producer:

```text
Cache Sample Lifecycle governance
= AUTHORITATIVE_PRODUCER
```

Consumers may include:

```text
Baseline Profile
Evidence Chain
Sentinel
Retention Policy
Receipt Correlator
```

Forbidden duplicates:

```text
Baseline invents its own sample identity
reload creates a second logical sample for the same request
late receipt is counted as a new request
```

### 6.13 Retention / compaction facts

Facts:

```text
retention class
consumer pins
compact/drop/keep decision
retention reason code
```

Producer:

```text
Cache Evidence Retention Policy evaluator
= AUTHORITATIVE_PRODUCER
```

Consumers/storage owners must not silently override keep/drop semantics.

The policy does not own the underlying evidence meaning; it governs survival only.

### 6.14 Telemetry cost / observation-tier facts

Facts:

```text
T0_MINIMAL / T1_STANDARD / T2_BOUNDED_ENRICHED
budget-exhaustion state
cost reason codes
measured observer overhead metadata
```

Producer:

```text
Cache Telemetry Budget evaluator
= AUTHORITATIVE_PRODUCER for observability-cost policy
```

Consumers may include cache observers and diagnostics.

Forbidden duplicate:

```text
each observer invents its own hidden "heavy mode" trigger
```

Budget exhaustion must lower telemetry richness, not trigger consumers to perform their own expensive fallback computation.

### 6.15 Optimization opportunity classification

Facts:

```text
NO_ACTION
WATCH_OPPORTUNITY
RESEARCH_CANDIDATE
HIGH_VALUE_CANDIDATE
REJECT_BOUNDARY_RISK
UNKNOWN
```

Producer:

```text
Cache Opportunity Analyzer
= DERIVED_PRODUCER
```

This fact is advisory engineering analysis only. It cannot mutate prompt/runtime behavior automatically.

## 7. Shared typed fact bus is optional; ownership contract is not

The design does not require a new global event bus or service locator.

Possible future implementation shapes include:

```text
plain typed sidecar object passed through existing application flow
small immutable request evidence capsule
module-level pure-function outputs
bounded telemetry snapshot
```

Do not introduce an event-bus architecture merely because facts have multiple consumers.

The mandatory part is:

```text
one semantic owner
canonical typed shape
no private reimplementation
```

not a specific transport mechanism.

## 8. Prefer pass-through over reparsing

Once a fact exists, downstream modules should consume it directly.

Preferred:

```text
request/compiler work
→ fingerprint produced once
→ Prefix Map consumes fingerprint
→ Prefix Map emits firstBreakOwner
→ Verdict Compiler consumes firstBreakOwner
→ Sentinel consumes compiled verdict
```

Bad:

```text
request/compiler work
→ Prefix Map scans history
→ Verdict Compiler scans history again
→ Sentinel scans history again
```

This directly enforces the Telemetry Budget principle:

```text
reuse before compute
```

## 9. Source-of-truth hierarchy for fact conflicts

When two components appear to disagree, do not average or choose whichever supports the preferred diagnosis.

Use ownership first.

Example:

```text
Prefix Map says firstBreakOwner = PRE_SIMCORE
Sentinel local helper says firstBreakOwner = SIMCORE_STABLE
```

Correct interpretation:

```text
Sentinel helper is an ownership violation / duplicate producer
```

not:

```text
two votes, investigate which feels right
```

If the authoritative producer itself is wrong, fix that producer and preserve evidence/correction lineage.

The Registry does not make a producer infallible. It makes responsibility attributable.

## 10. Unknown / unavailable producer behavior

A consumer must not recreate a missing fact merely because it would be useful.

Examples:

```text
Prefix Map unavailable within budget
→ firstBreakOwner = UNKNOWN

approved receipt source absent
→ provider cache = UNVERIFIED

Compatibility model family unknown
→ UNKNOWN_COMPATIBILITY

Baseline not established
→ BASELINE_NOT_ESTABLISHED
```

Fail toward weaker evidence.

Do not fail toward duplicate work.

## 11. Canonical fact identity

A future machine-readable registry should assign stable semantic fact IDs independent of implementation file names.

Candidate examples:

```text
CACHE_PROVIDER_RECEIPT
CACHE_RECEIPT_CORRELATION
CACHE_FIRST_BREAK
CACHE_PREFIX_SHADOW
CACHE_COMPATIBILITY
CACHE_STABLE_ABI_IDENTITY
CACHE_SLOW_ABI_IDENTITY
CACHE_EVIDENCE_ADMISSION
CACHE_BASELINE_STATE
CACHE_MATERIAL_DEVIATION
CACHE_REQUEST_VERDICT
CACHE_TEMPORAL_INCIDENT
CACHE_REGIME
CACHE_SAMPLE_REVISION
CACHE_RETENTION_DECISION
CACHE_TELEMETRY_TIER
CACHE_OPPORTUNITY_CLASS
```

Do not encode source file path or line number into fact identity.

Helper refactors must not rename semantic facts.

## 12. Candidate machine-readable registry shape

Conceptual only:

```json
{
  "schemaVersion": 1,
  "facts": {
    "CACHE_FIRST_BREAK": {
      "producer": "cache-prefix-map",
      "producerRole": "AUTHORITATIVE_PRODUCER",
      "consumers": [
        "cache-verdict-compiler",
        "cache-evidence-chain",
        "diagnostics",
        "cache-opportunity-analyzer"
      ],
      "runtimeCostClass": "T1",
      "fallback": "UNKNOWN",
      "forbiddenDuplicateWork": [
        "SECOND_HISTORY_WALK",
        "SECOND_PREFIX_PARSER"
      ]
    }
  }
}
```

This registry would be CI/design metadata, not model prompt content.

Exact component IDs and schema should be derived from implemented module boundaries rather than frozen prematurely.

## 13. Ownership changes require declaration

Changing the semantic owner of a cache fact is an architectural change, not a casual refactor.

Required flow:

```text
ownership transfer proposed
→ design/evidence recorded in main
→ consumer/producer graph updated
→ Conformance fixtures updated
→ Telemetry Budget impact reviewed
→ work branch implementation
→ static/CI validation
→ release process
→ live verification when runtime behavior changes
```

Do not silently leave old producer logic behind after moving ownership.

During migration, temporary dual computation may be used only as an explicit differential verification technique and must not become permanent production authority.

## 14. Differential migration pattern

If a fact owner must move later:

```text
OLD producer
NEW candidate producer
```

Allowed temporary verification:

```text
same frozen fixtures / bounded diagnostic request
→ compute both
→ compare exact normalized fact
→ NEW remains non-authoritative until equivalence proven
```

After promotion:

```text
NEW = authoritative
OLD computation removed
```

Do not keep both and choose whichever result looks better.

Any differential dual computation on runtime traffic must still satisfy Telemetry Budget and be a separate narrow work item.

## 15. Static / CI enforcement candidates

The Ownership Registry should be CI-first when implementation begins.

Possible checks:

```text
registered fact has exactly one semantic producer
consumer imports/uses producer output rather than known duplicate helper
Prefix Map remains sole first-break owner
Baseline remains sole rolling-statistics owner
Sentinel remains sole short-horizon incident-state owner
Regime Ledger remains sole regime-history owner
Receipt Correlator remains sole request-receipt join owner
Compatibility comparator remains sole compatibility-semantic owner
no cache observer introduces provider network polling
no second full-history cache scan is added without declared exception
```

Static enforcement should prefer explicit module/import/contract checks over brittle source-text guessing when feasible.

## 16. Conformance Matrix integration

Future Cache Conformance Matrix fixtures should include ownership invariants, not only output semantics.

Minimum fixture/static cases:

```text
1. Prefix Map emits firstBreakOwner
   → Verdict/Sentinel consume same fact

2. Prefix Map fact unavailable
   → downstream stays UNKNOWN, no fallback history scan

3. Correlator AMBIGUOUS
   → Baseline cannot run private matching logic

4. compatibility UNKNOWN
   → consumer cannot invent private compatibility

5. Baseline ESTABLISHED statistics
   → Sentinel consumes baseline snapshot, does not recompute median

6. one request verdict
   → Sentinel consumes compiler verdict, does not recreate attribution tree

7. Transition state
   → Sentinel is sole runtime owner

8. same request + late receipt
   → Sample Lifecycle preserves one logical sample identity

9. retention budget pressure
   → observers reduce telemetry instead of duplicating expensive work

10. external receipt absent
    → UNVERIFIED, no network fallback

11. CI detailed ABI manifest
    → runtime does not repeat full segment-digest pass

12. ownership transfer fixture
    → old producer removed after promotion

13. no prompt-byte mutation from registry/telemetry metadata

14. renderer boundary unchanged
```

## 17. Telemetry Budget integration

Every registry fact should eventually declare or inherit a cost class.

Conceptual:

```text
T0 fact
= already available / near-zero incremental work

T1 fact
= bounded ordinary runtime observation

T2 fact
= bounded enriched anomaly-only observation

CI_ONLY
= release/static analysis only
```

A consumer may not promote itself to a higher-cost producer merely because its desired fact was omitted at the current tier.

Example:

```text
T0 runtime
Prefix Map detailed first break unavailable

Verdict Compiler wants first break
→ receives UNKNOWN

Verdict Compiler runs its own T2 full-history scan
→ FORBIDDEN
```

This keeps cost policy enforceable across module boundaries.

## 18. Retention integration

Fact ownership and retention ownership are separate.

Example:

```text
Prefix Map
= owns meaning of firstBreakOwner

Retention Policy
= owns whether that already-produced fact is kept/compacted/dropped
```

Retention Policy must not reinterpret the fact.

Likewise the semantic producer must not pin itself forever merely because it owns the fact.

## 19. Evidence Chain integration

Evidence Chain should reference registered fact identities and producer identity.

Conceptual node:

```text
factId: CACHE_FIRST_BREAK
producer: cache-prefix-map
value: PRE_SIMCORE
producerEvidenceRef: ...
```

This makes later correction attributable:

```text
fact wrong
→ fix/revise Prefix Map evidence
→ dependent verdicts superseded
```

rather than editing downstream conclusions with no source correction.

## 20. Diagnostics

Optional compact diagnostic for ownership debugging:

```text
Cache fact ownership
receipt        external / llmgateway-log-cache-v1
correlation    receipt-correlator
first break    prefix-map
compatibility  compatibility-key
baseline       baseline-profile
verdict        verdict-compiler
temporal       sentinel
regime         regime-ledger
```

This should not be shown every healthy request by default.

Diagnostic expansion must remain bounded and must not trigger the facts it is trying to display through expensive fallback computation.

## 21. No runtime registry lookup requirement

Do not require every request to perform a dynamic registry lookup or dependency graph traversal.

Preferred implementation possibilities:

```text
static module contracts
build-time generated constants
CI-only ownership manifest
plain typed imports
```

The registry's primary value is architecture enforcement and auditability.

Runtime overhead should be near zero unless evidence proves a runtime manifest is useful.

## 22. Failure vocabulary

Candidate ownership-specific findings:

```text
CACHE_FACT_DUPLICATE_PRODUCER
CACHE_FACT_UNREGISTERED_PRODUCER
CACHE_FACT_PRIVATE_REINTERPRETATION
CACHE_FACT_FORBIDDEN_RESCAN
CACHE_FACT_FORBIDDEN_REHASH
CACHE_FACT_AUTHORITY_COLLAPSE
CACHE_FACT_CONSUMER_BYPASS
CACHE_FACT_OWNER_TRANSFER_INCOMPLETE
CACHE_FACT_RUNTIME_COST_CLASS_VIOLATION
CACHE_FACT_EXTERNAL_AUTHORITY_INFERRED_LOCALLY
```

These are architecture/CI findings. They are not provider cache verdicts.

## 23. Non-goals

```text
new global event bus
new semantic SnapshotStore
provider cache management
explicit Gemini cache resource ownership
runtime service locator
mandatory dynamic dependency injection for all cache modules
prompt rewriting
history rewriting
renderer behavior
full telemetry warehouse
multiple-provider abstraction
```

## 24. Recommended rollout

```text
Phase 0
inventory implemented cache facts and current producers when runtime work begins

Phase 1
create machine-readable/static ownership registry alongside first implemented cache-observability modules

Phase 2
add Conformance/static checks for high-risk facts:
- first break
- provider receipt
- correlation
- compatibility
- baseline
- verdict

Phase 3
add Telemetry Budget cost-class declarations

Phase 4
expand registry only when a real new fact producer is introduced
```

Do not create empty runtime modules merely to satisfy the idea-stage registry.

## 25. Current classification

```text
GEMINI_CACHE_OBSERVER_OWNERSHIP_REGISTRY
= HIGH VALUE
= ARCHITECTURE / CI CONTRACT
= SINGLE SEMANTIC PRODUCER PER CACHE FACT
= REUSE-BEFORE-COMPUTE ENFORCEMENT
= ANTI-DUPLICATE PARSER / HASH / HISTORY WALK
= EXTERNAL AUTHORITY PRESERVING
= NEAR-ZERO RUNTIME OVERHEAD TARGET
= IDEA / DESIGN CANDIDATE

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
release-system change: NONE
```
