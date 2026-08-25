# SimCore Gemini Cache Observability Architecture Map

Date: 2026-08-25
Status: `CANONICAL RESEARCH / ARCHITECTURE INDEX · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`

## 1. Purpose

This document is the canonical navigation map for the SimCore Gemini implicit-cache research and observability stack.

It exists to answer, quickly and consistently:

```text
What is already implemented?
What is only an idea/design candidate?
Which component owns which cache fact or decision?
How does provider evidence flow into SimCore diagnostics?
How do prompt-stability CI controls relate to runtime evidence?
Which cross-cutting contracts govern cost, retention, ownership, schema, migration, and release acceptance?
Which document should be opened when changing one responsibility?
```

This document is an index and architecture map. It is **not** a new semantic authority that overrides the referenced design contracts.

When a referenced document defines the detailed semantics of one component, that document remains the authority for that component.

## 2. Constitutional boundary

Permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / bounded observability

Main Model
= renderer
```

Cache work may improve prompt stability, evidence quality, attribution, diagnostics, and release safety. It must not move final prose/rendering responsibility into SimCore.

Hard non-goals remain:

```text
rewrite renderer prose for cache friendliness
rewrite chat history to manufacture reuse
weaken state / Mirror / Representation safety
move prompt sections automatically from heuristic evidence
manage Gemini explicit cache resources by default
perform synthetic cache warming
infer provider HIT/MISS from local fingerprints
change provider routing from cache heuristics
retain raw prompt/history bodies as long-lived cache evidence
```

Primary constitutional references:

- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`

## 3. Authority and status model

Do not flatten all documents into one implementation status.

### 3.1 Implemented SimCore runtime evidence

Current production/runtime work that already exists includes the v0.64.7 cross-reload cache-observer continuity infrastructure.

Primary references:

- `docs/SIMCORE_06407_IMPLEMENTATION_EVIDENCE.md`
- `docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md`
- `docs/SIMCORE_CACHE_CONTINUITY_ACROSS_RELOAD_PLAN.md`

Important meaning:

```text
local observer continuity
!=
provider/Gemini cache reuse proof
```

The reload handoff may preserve bounded local observer material across reload/update boundaries. It does not prove a Gemini provider cache hit.

### 3.2 Existing external/provider evidence surface

Usage Dashboard already contains the independent sanitized LLMGateway cache observer used to inspect actual gateway/provider cache metrics.

Its role in this architecture is evidence/reference, not SimCore semantic ownership.

Operational split:

```text
Usage Dashboard
= what the gateway / Gemini receipt actually says was cached

SimCore
= why that request was or was not cache-friendly, where the prefix changed, and what conclusion is justified
```

SimCore should not duplicate the Usage Dashboard `/logs` observer by default.

### 3.3 Design / research candidates

Most documents under the Gemini cache research track are **IDEA / DESIGN CANDIDATE** documents today.

Their presence in the repository means the design is preserved and available for future implementation. It does not mean the runtime component already exists.

This distinction must remain explicit in implementation planning, release notes, diagnostics, and status reporting.

## 4. Top-level architecture

The full research architecture is best understood as four cooperating planes plus cross-cutting governance.

```text
                        ┌─────────────────────────────┐
                        │   PROVIDER / GATEWAY PLANE  │
                        │ Gemini / LLMGateway receipt │
                        │ Usage Dashboard observer    │
                        └──────────────┬──────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    RUNTIME EVIDENCE / DECISION PLANE                 │
│                                                                      │
│ Receipt Correlator → Evidence Chain → Admission → Baseline           │
│         │                  │              │          │                │
│         └──────────────┬───┴──────────────┴──────────┘                │
│                        ▼                                             │
│                 Verdict Compiler                                     │
│                        ▼                                             │
│                 Transition Model                                     │
│                        ▼                                             │
│                 Regression Sentinel                                  │
│                        ▼                                             │
│                   Regime Ledger                                      │
│                        ▼                                             │
│                Opportunity Analyzer                                  │
│                                                                      │
│ Prefix Map / Compatibility Key / local ABI references feed this      │
│ plane without taking over provider-evidence authority.               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                     PROMPT-STABILITY / CI PLANE                      │
│                                                                      │
│ Stable Prefix Budgeter                                               │
│        ↓                                                             │
│ Prompt Segment Identity                                              │
│        ↓                                                             │
│ Prompt Stability Manifest                                            │
│        ↓                                                             │
│ Cache ABI Guardian                                                   │
│                                                                      │
│ Purpose: prevent undeclared SimCore-owned stable/slow prompt drift.  │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                       CACHE FACT CONTRACT PLANE                      │
│                                                                      │
│ Ownership Registry                                                   │
│        +                                                             │
│ Fact Schema Contract                                                 │
│        +                                                             │
│ Fact Dependency Graph                                                │
│        ↓                                                             │
│ Fact Contract Bundle                                                 │
│        ↓                                                             │
│ Fact Migration Protocol                                              │
│        ↓                                                             │
│ Contract Evolution Gate                                              │
│                                                                      │
│ Conformance Matrix validates behavior across the decision pipeline.  │
└──────────────────────────────────────────────────────────────────────┘

Cross-cutting governance:

Sample Lifecycle
Compatibility Key
Telemetry Budget
Evidence Retention Policy
Renderer Boundary Constitution
normal SimCore release workflow
```

## 5. Runtime evidence / decision plane

### 5.1 Cache Receipt Correlator

Document:

- `docs/SIMCORE_GEMINI_CACHE_RECEIPT_CORRELATOR_IDEA.md`

Owns:

```text
which provider/gateway receipt belongs to which SimCore request
correlation class
correlation signals
ambiguity / unmatched state
```

Does not own:

```text
provider cached-token semantics
first-break attribution
baseline statistics
final regression verdict
```

Primary principle:

```text
false match is worse than no match
```

Therefore uncertain joins remain bounded/heuristic/ambiguous rather than being upgraded to verified evidence.

### 5.2 Cache Prefix Map

Document:

- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`

Owns:

```text
request-region stability map
first meaningful prefix break attribution
CACHE_SHADOW classification
```

Canonical topology remains based on the verified request ordering, including the current `TAIL_AFTER_CURRENT_USER` SimCore placement unless a future dedicated architecture change supersedes it.

The Prefix Map may explain why provider reuse was likely limited. It may not infer provider cached-token results by itself.

### 5.3 Cache Compatibility Key

Document:

- `docs/SIMCORE_GEMINI_CACHE_COMPATIBILITY_KEY_IDEA.md`

Owns:

```text
which requests belong to a structurally comparable cache population
```

Design:

```text
typed descriptor
+ deterministic digest
```

Important boundary:

```text
same Compatibility Key
!=
same request
```

`CACHE_REGIME` is not a required equality field because a new regime must be discoverable inside an otherwise structurally compatible population.

### 5.4 Cache Evidence Chain

Document:

- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`

Owns request-instance provenance.

Internal model:

```text
bounded provenance DAG
```

User-facing diagnostics may render that DAG as an ordered evidence chain.

It records how a conclusion was derived, including corrections/supersession. It must not upgrade weak evidence into stronger authority.

### 5.5 Cache Evidence Admission Policy

Document:

- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`

Owns:

```text
whether a given evidence item may support a given claim for a given consumer
```

Canonical reasoning dimensions:

```text
compatibility
+ evidence quality
+ claim scope
+ consumer policy
```

This prevents one strong fact in one domain from being overextended into another domain.

### 5.6 Cache Baseline Profile

Document:

- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`

Owns:

```text
normal cache-health baseline for a compatible request population
```

Conceptual states:

```text
COLD
WARMING
ESTABLISHED
STALE
RESET_REQUIRED
```

The Baseline is not a universal hard threshold. It should learn bounded, compatible, trusted samples and must classify the current sample before learning it to avoid baseline poisoning.

### 5.7 Cache Verdict Compiler

Document:

- `docs/SIMCORE_GEMINI_CACHE_VERDICT_COMPILER_IDEA.md`

Owns deterministic request-level cache verdict compilation from admitted typed evidence.

Target character:

```text
stateless
pure/deterministic
severity-free
```

It does not emit operational `WATCH / FIX / BLOCKER` classifications.

It must fail closed on contradictory evidence rather than arbitrarily choosing one cause.

### 5.8 Cache Verdict Transition Model

Document:

- `docs/SIMCORE_GEMINI_CACHE_VERDICT_TRANSITION_MODEL_IDEA.md`

Owns the temporal reducer contract followed by the Sentinel.

It is a separate design specification but **not** a separate runtime authority or persistence owner.

Conceptual short-horizon states include:

```text
QUIET
CANDIDATE
PERSISTENT
RECOVERY_PENDING
EVIDENCE_GAP
```

Important rules:

```text
one regression != persistent incident
one healthy request != recovered
UNVERIFIED != healthy
UNVERIFIED != regression
```

### 5.9 Cache Regression Sentinel

Document:

- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`

Owns operational monitoring/escalation over request-level verdicts and temporal state.

It decides when a cache regression becomes meaningful enough to surface or classify operationally. It must not rebuild request-level attribution logic owned by upstream producers.

### 5.10 Cache Regime Ledger

Document:

- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`

Owns meaningful long-horizon cache-behavior regime transitions.

It is intentionally not a per-turn log.

Important distinction:

```text
persistent incident
!=
confirmed new CACHE_REGIME
```

A contract/schema migration is also not automatically a provider-cache regime change.

### 5.11 Cache Opportunity Analyzer

Document:

- `docs/SIMCORE_GEMINI_CACHE_OPPORTUNITY_ANALYZER_IDEA.md`

Owns engineering-value classification after evidence exists.

Dimensions include:

```text
IMPACT
OWNERSHIP
REPEATABILITY
RECOVERABILITY
CONFIDENCE
RISK
```

Primary rule:

```text
large impact + weak SimCore ownership
!= SimCore optimization candidate
```

It also respects `CACHE_SHADOW`: fixing a later SimCore-local drift may have little provider benefit when an earlier PRE_SIMCORE break already dominates reuse.

## 6. Prompt-stability / pre-release CI plane

This plane protects SimCore-owned prompt stability before release. It does **not** prove provider reuse.

### 6.1 Stable Prefix Budgeter

Document:

- `docs/SIMCORE_GEMINI_STABLE_PREFIX_BUDGETER_IDEA.md`

Owns source/admission stability classes for cache-critical prompt construction.

Key rule:

```text
STABLE SIZE BUDGET ❌
VOLATILITY / MUTATION BUDGET ✅
```

A large stable prefix may be good for implicit caching. A tiny region that mutates every request may be poor.

### 6.2 Prompt Segment Identity

Document:

- `docs/SIMCORE_GEMINI_PROMPT_SEGMENT_IDENTITY_IDEA.md`

Owns stable semantic identities for meaningful compiler-owned prompt segments.

Critical architecture rule:

```text
segment identity metadata
= sidecar

prompt wrappers inserted only for diagnostics
= forbidden
```

`segmentId` is semantic identity; `digest` is serialized-byte fingerprint. They are different concepts.

### 6.3 Prompt Stability Manifest

Document:

- `docs/SIMCORE_GEMINI_PROMPT_STABILITY_MANIFEST_IDEA.md`

Provides the machine-readable prompt-stability contract/materialization boundary over segment identity, volatility class, order, length, and digest.

The manifest remains a derived CI/release contract, not a new semantic prompt authority.

Candidate builds must not self-certify by blindly regenerating the accepted baseline.

### 6.4 Cache ABI Guardian

Document:

- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`

Owns release-time enforcement of serialized stable/slow prompt-byte compatibility.

Conceptual intent:

```text
CACHE_ABI_INTENT = PRESERVE
```

Undeclared stable/slow drift fails.

A deliberate semantic change requires narrow declaration/evidence.

The Guardian proves SimCore-owned byte-contract behavior, not Gemini provider cache hits.

## 7. Cache fact contract / CI plane

This plane makes the cache-observability system itself structurally typed, bounded, and evolvable.

### 7.1 Observer Ownership Registry

Document:

- `docs/SIMCORE_GEMINI_CACHE_OBSERVER_OWNERSHIP_REGISTRY_IDEA.md`

Question answered:

```text
WHO owns this fact?
```

Principle:

```text
one semantic cache fact
→ one semantic producer
```

Consumers may display/pass through facts but may not privately recreate competing semantics through a second parser/hash/history walk.

### 7.2 Cache Fact Schema Contract

Document:

- `docs/SIMCORE_GEMINI_CACHE_FACT_SCHEMA_CONTRACT_IDEA.md`

Question answered:

```text
WHAT exactly does this fact mean and look like?
```

Architecture:

```text
common CacheFactEnvelope
+ fact-specific versioned payload
```

Important explicit statuses include:

```text
AVAILABLE
UNKNOWN
UNVERIFIED
NOT_APPLICABLE
WITHHELD_BY_BUDGET
PENDING
AMBIGUOUS
SUPERSEDED
INVALID
```

Do not overload `null` to mean all of these.

### 7.3 Cache Fact Dependency Graph

Document:

- `docs/SIMCORE_GEMINI_CACHE_FACT_DEPENDENCY_GRAPH_IDEA.md`

Question answered:

```text
WHAT may this fact depend on?
```

It is a type/design-level DAG, distinct from the request-instance Evidence Chain.

Same-revision dependencies must remain acyclic. Legitimate feedback is modeled explicitly across previous temporal state or a successor sample revision.

### 7.4 Cache Fact Contract Bundle

Document:

- `docs/SIMCORE_GEMINI_CACHE_FACT_CONTRACT_BUNDLE_IDEA.md`

Compiles the source contracts into one deterministic machine-readable CI/tooling view.

It may include, per fact:

```text
owner
schema version
dependencies
cost class
retention class
privacy class
allowed consumers
fallback status
```

The Bundle is a compiled view, not a new source of truth.

### 7.5 Cache Fact Migration Protocol

Document:

- `docs/SIMCORE_GEMINI_CACHE_FACT_MIGRATION_PROTOCOL_IDEA.md`

Owns legal transitions when a fact contract intentionally changes.

Core rules:

```text
NO SILENT REINTERPRETATION
MIGRATION != NEW EVIDENCE
```

Strategies include:

```text
PRESERVE_EXACT
ADAPT_SEMANTICS_PRESERVING
RECOMPUTE_FROM_TYPED_UPSTREAM
REEVALUATE_DOWNSTREAM
INVALIDATE_AND_REBUILD
DROP_TO_UNVERIFIED
OWNERSHIP_TRANSFER
UNSUPPORTED
```

If safe migration is not worth the complexity, bounded telemetry may be dropped and restarted as `UNVERIFIED` without affecting Core semantic correctness.

### 7.6 Cache Contract Evolution Gate

Document:

- `docs/SIMCORE_GEMINI_CACHE_CONTRACT_EVOLUTION_GATE_IDEA.md`

Owns narrow release-time/CI acceptance for intentional cache-fact contract evolution.

Canonical flow:

```text
accepted Bundle
→ candidate Bundle
→ exact semantic diff
→ change declaration
→ migration coverage
→ migration fixtures
→ structural validation
→ Conformance Matrix
→ PASS / BLOCK
```

No semantic contract change uses a fast no-migration path.

This gate is not a new release authority or release system.

### 7.7 Cache Conformance Matrix

Document:

- `docs/SIMCORE_GEMINI_CACHE_CONFORMANCE_MATRIX_IDEA.md`

Owns the golden behavioral regression contract across:

```text
Evidence Admission
→ Verdict
→ Transition
→ Sentinel handoff
→ Regime handoff
```

It complements structural contract validation and the Prompt Cache ABI Guardian.

Important split:

```text
Contract Bundle / Evolution Gate
= is the architecture/data contract legal?

Conformance Matrix
= does normalized input produce the frozen behavior?

Cache ABI Guardian
= did cache-critical prompt bytes drift?
```

All three may independently pass or fail.

## 8. Cross-cutting runtime governance

### 8.1 Cache Sample Lifecycle

Document:

- `docs/SIMCORE_GEMINI_CACHE_SAMPLE_LIFECYCLE_IDEA.md`

Owns logical sample identity, revision/supersession, per-consumer idempotency, and correction handling.

Primary invariant:

```text
one main-model request
= one logical cache sample
```

Late receipts, reload continuity, or schema-preserving migration must not create duplicate baseline learning or duplicate temporal observations.

### 8.2 Cache Evidence Retention Policy

Document:

- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_RETENTION_POLICY_IDEA.md`

Owns how long bounded observability evidence survives.

Retention is not one universal TTL.

It combines:

```text
TIME-BOUND
COUNT-BOUND
DEPENDENCY-BOUND
STATE-BOUND
SUMMARY-PERSISTENT
```

Raw/ephemeral material should live shortest; compact derived summaries may live longer.

### 8.3 Cache Telemetry Budget

Document:

- `docs/SIMCORE_GEMINI_CACHE_TELEMETRY_BUDGET_IDEA.md`

Owns how expensive observability is allowed to become.

Default prohibitions include:

```text
second full-history scan solely for cache telemetry
new provider/network polling from SimCore
semantic SnapshotStore writes solely for cache telemetry
re-hashing the same scale-sensitive bytes in multiple consumers
```

If the necessary observation exceeds budget:

```text
PARTIAL / UNKNOWN / UNVERIFIED
```

is preferred over expensive or authority-weak reconstruction.

## 9. Provider evidence vs local evidence — permanent split

This distinction is foundational.

```text
LOCAL PREFIX / ABI EVIDENCE
= what SimCore can directly observe about its own request construction

PROVIDER RECEIPT EVIDENCE
= what Gemini/gateway reports about actual cached tokens
```

Therefore:

```text
stable digest SAME
!= provider HIT proven

Prefix Map PRE_SIMCORE
!= cached token count known

local reload observer continuity
!= provider cache continuity
```

Strong runtime claims require the correct evidence domain plus defensible request correlation.

## 10. Current prompt topology constraint

The current verified request ordering places SimCore runtime material after the current user input:

```text
CHAT_HISTORY
→ CURRENT_USER
→ SIMCORE_RUNTIME
```

Current placement class:

```text
TAIL_AFTER_CURRENT_USER
```

Under longest-prefix implicit caching, the changing `CURRENT_USER` may break reuse before later stable SimCore material is reached.

Working term:

```text
CACHE_SHADOW
= stable material located after an earlier unavoidable prefix break
```

This is why the current research ordering prioritizes measurement, attribution, and deterministic stability before any high-risk prompt relocation.

Moving immutable SimCore material earlier is a separate architecture candidate requiring dedicated regression validation across all protected semantic boundaries.

## 11. CI and runtime must not collapse into one system

Rich CI analysis may do work that should never run on every live request.

Examples appropriate for CI/build:

```text
full prompt segment manifest
stable/slow byte differential
type-level dependency validation
contract bundle compilation
migration fixture replay
golden conformance matrix
```

Examples appropriate for runtime only when bounded:

```text
small request/sample identity
existing fingerprints
first-break metadata when available cheaply
compatibility descriptor
receipt correlation metadata
bounded baseline/temporal state
```

Do not port a rich CI graph/manifest engine wholesale into the runtime hot path.

## 12. Release workflow integration

All future implementation remains under the canonical SimCore workflow:

```text
main design / evidence
→ dedicated work branch implementation
→ static / CI validation
→ release-simcore deployment
→ real long-chat validation
→ main documentation / long-term-memory synchronization
```

Authority remains:

```text
release-simcore
= actual plugin code / deployment authority

main
= design / evidence / roadmap / administration authority
```

The cache-specific gates fit **inside** static/CI. They do not replace this workflow.

Functional cache/runtime changes must not be mixed with release-system/repository restructuring in the same work item.

`latest.js` and `install.js` equality remains mandatory for runtime implementation work.

## 13. Recommended research / implementation sequence

This map does not authorize immediate implementation of every idea.

Preferred current sequence remains evidence-first:

```text
1. close current production v0.64.7 real-long-chat validation

2. characterize real Usage Dashboard / gateway receipt fields
   - actual Gemini cached-read metric
   - request identity availability
   - model / route / scope metadata

3. prove request ↔ receipt correlation feasibility
   - exact request identity first
   - bounded weaker correlation only when clearly labeled

4. materialize CI-first prompt stability protections
   - deterministic serialization audit
   - Stable Prefix Budgeter
   - Segment Identity
   - Stability Manifest
   - Cache ABI Guardian

5. materialize only the minimum cache fact contracts needed by implemented components
   - no empty placeholder universe
   - Ownership / Schema / Dependency
   - Contract Bundle / Conformance as implementation actually appears

6. add bounded runtime baseline/verdict/transition logic only after trusted receipt evidence exists

7. collect real first-break distributions and provider cache behavior

8. use Opportunity Analyzer to decide whether any optimization is worth engineering

9. only if measured evidence shows an early SimCore-owned cache-critical limitation:
   research a dedicated prompt-topology / two-plane architecture change
```

Do not reverse this sequence by moving prompt regions first and trying to justify the move afterward.

## 14. Quick authority lookup

Use this lookup when deciding which document to edit.

```text
Question: What Gemini cache scope are we actually targeting?
→ SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md

Question: Did the provider actually cache tokens?
→ Usage Dashboard / approved gateway receipt evidence

Question: Which receipt belongs to this request?
→ CACHE_RECEIPT_CORRELATOR

Question: Where did the local request prefix first change?
→ CACHE_PREFIX_MAP

Question: Are these requests structurally comparable?
→ CACHE_COMPATIBILITY_KEY

Question: What evidence produced this conclusion?
→ CACHE_EVIDENCE_CHAIN

Question: May this evidence support this claim?
→ CACHE_EVIDENCE_ADMISSION_POLICY

Question: What is normal for this compatible request family?
→ CACHE_BASELINE_PROFILE

Question: What does this request currently prove?
→ CACHE_VERDICT_COMPILER

Question: How does the verdict evolve over consecutive requests?
→ CACHE_VERDICT_TRANSITION_MODEL + Sentinel ownership

Question: When is it operationally meaningful?
→ CACHE_REGRESSION_SENTINEL

Question: Did the long-term normal regime change?
→ CACHE_REGIME_LEDGER

Question: Is this worth fixing?
→ CACHE_OPPORTUNITY_ANALYZER

Question: What prompt source may enter stable/slow tiers?
→ GEMINI_STABLE_PREFIX_BUDGETER

Question: Which exact semantic prompt segment changed?
→ GEMINI_PROMPT_SEGMENT_IDENTITY

Question: What is the release prompt-stability materialization?
→ GEMINI_PROMPT_STABILITY_MANIFEST

Question: Did stable/slow serialized bytes drift undeclared?
→ GEMINI_CACHE_ABI_GUARDIAN

Question: Who owns this cache fact?
→ CACHE_OBSERVER_OWNERSHIP_REGISTRY

Question: What does this cache fact schema mean?
→ CACHE_FACT_SCHEMA_CONTRACT

Question: What may this fact depend on?
→ CACHE_FACT_DEPENDENCY_GRAPH

Question: What is the compiled machine-readable contract set?
→ CACHE_FACT_CONTRACT_BUNDLE

Question: How does an old contract cross to a new contract?
→ CACHE_FACT_MIGRATION_PROTOCOL

Question: May this contract evolution pass release CI?
→ CACHE_CONTRACT_EVOLUTION_GATE

Question: Does the full evidence/verdict/transition behavior still conform?
→ CACHE_CONFORMANCE_MATRIX

Question: Has this logical request/sample already been consumed or superseded?
→ CACHE_SAMPLE_LIFECYCLE

Question: How long should evidence survive?
→ CACHE_EVIDENCE_RETENTION_POLICY

Question: How expensive may observation become?
→ CACHE_TELEMETRY_BUDGET
```

## 15. Map maintenance rule

When a new Gemini cache research document becomes concrete enough to be preserved:

```text
1. create/update the dedicated semantic document first
2. identify its exact owner / non-owner boundaries
3. classify implementation status explicitly
4. add it to this Architecture Map only after its role is clear
```

Do not use this map as the first place to invent detailed semantics.

If a referenced design is superseded:

```text
old document
→ preserve history / mark superseded as appropriate

new document
→ become semantic authority

Architecture Map
→ update pointer and status
```

Do not silently rewrite historical evidence.

## 16. Current overall classification

```text
SIMCORE_GEMINI_CACHE_OBSERVABILITY_ARCHITECTURE_MAP
= CANONICAL RESEARCH / ARCHITECTURE INDEX
= NAVIGATION + RESPONSIBILITY MAP
= IMPLEMENTED VS DESIGN STATUS SEPARATOR
= PROVIDER / LOCAL EVIDENCE BOUNDARY MAP
= RUNTIME / CI / CONTRACT PLANE MAP
= NOT A NEW SEMANTIC AUTHORITY
= NOT A NEW RELEASE AUTHORITY
= NO RUNTIME CHANGE
= NO PROMPT BYTE CHANGE
= NO SNAPSHOTSTORE SEMANTIC CHANGE
= NO RENDERER RESPONSIBILITY CHANGE
```
