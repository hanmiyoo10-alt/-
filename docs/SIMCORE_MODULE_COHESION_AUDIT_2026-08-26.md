# SimCore Module Cohesion Audit — 2026-08-26

Status: `BASELINE COHESION AUDIT COMPLETE · OWNERSHIP-FIRST · NO IMPLEMENTATION · NO RUNTIME CHANGE · RE-RUN AFTER M2-3`

Production authority: `release-simcore` v0.64.7.

Related:
- `docs/SIMCORE_MODULE_COHESION_AND_EXTRACTION_GUIDELINE.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `docs/SIMCORE_APPLICATION_SERVICE_BOUNDARY_MAP_IDEA.md`
- `docs/SIMCORE_STATE_OWNERSHIP_REGISTRY_V2_IDEA.md`
- `docs/SIMCORE_CONTRACTS_V2_TRANSITION_DEBT_RETIREMENT_MAP_IDEA.md`
- `docs/SIMCORE_M2_4B_SESSION_STATE_HOLDER_CONTRACT.md`
- `docs/SIMCORE_M2_4C_RUNTIME_MIRROR_OBSERVATION_RECEIPT_CONTRACT.md`
- `docs/SIMCORE_M2_4D_OUTPUT_FINALIZATION_OWNERSHIP_DECISION.md`
- `docs/SIMCORE_M2_4E_RECOVERY_FACADE_CALL_SITE_AUDIT.md`

## 1. Purpose

Audit the current production SimCore module set for ownership cohesion.

This is not a line-count audit.

Canonical rule:

```text
module size is a signal
ownership cohesion is the authority
```

The audit asks:

```text
Does the module own one independently describable responsibility?
Are unrelated semantic, persistence, host, diagnostic, or orchestration concerns mixed?
Does a dependency exist only because a second responsibility is co-located?
Can one lifecycle/application responsibility be moved independently without changing semantics?
Is an apparent issue already a known Contracts v2 transition debt rather than a new finding?
```

The audit does not authorize extraction or runtime modification.

## 2. Classification vocabulary

Primary cohesion classifications:

```text
COHESIVE
COHESIVE_LARGE
WATCH_EXTRACTION
EXTRACTION_CANDIDATE
EXTRACTION_REQUIRED
```

Additional transition qualifiers used when the four-way cohesion vocabulary alone would be misleading:

```text
KNOWN_TRANSITION_DEBT
TRANSITIONAL_FACADE
SIZE_ONLY
POST_M2_3_REBASE_REQUIRED
NOT_PHYSICAL_YET
```

Definitions:

```text
COHESIVE
= bounded owner with no material ownership drift identified

COHESIVE_LARGE
= broad implementation surface, but still one coherent authority

WATCH_EXTRACTION
= real ownership pressure exists, but source/evidence does not yet justify physical extraction

EXTRACTION_CANDIDATE
= a stable independently describable responsibility has emerged and a future extraction boundary can be defined

EXTRACTION_REQUIRED
= a responsibility move is already selected/required by the active architecture roadmap; current co-location is known transition debt
```

A compatibility facade may be marked `TRANSITIONAL_FACADE` instead of pretending that deletion is an extraction problem.

## 3. Executive result

Current production is not a generalized modularity problem.

The broad result is:

```text
MOST DOMAIN / VALIDATION / RUNTIME ADAPTER MODULES
= COHESIVE or COHESIVE_LARGE

CURRENT HIGH-VALUE OWNERSHIP PRESSURE
= Session
= Runtime Mirror
= Kernel transition edges
= Recovery transitional facade

ALREADY-SELECTED FUTURE PHYSICAL OWNERS
= edit-reconcile
= output-finalize

NO EVIDENCE
= for broad fragmentation
= for a generic TurnPipeline
= for splitting Time solely because it owns multiple clock concepts
= for splitting Structure solely because it validates multiple output surfaces
= for splitting OPS/runtime-probe solely because diagnostic rendering is large
```

## 4. Foundation / shared-state layer

### 4.1 `contracts`

Classification:

```text
COHESIVE
```

Owns architecture responsibility metadata only.

No policy/state mutation role is mixed in.

Action:

```text
KEEP
```

### 4.2 `store`

Classification:

```text
COHESIVE_LARGE
```

Current responsibility remains one persistence-mechanics axis:

```text
snapshot keying
serialization
load/save
turn bundle persistence
retention/prune
bounded key-scan mechanics
```

Retention is not a second semantic domain; it is persistence housekeeping.

Existing Session-held deferred-prune scheduling state is evidence that more persistence housekeeping may move *into* Store, not evidence that Store itself should be split.

Action:

```text
KEEP
ABSORB ONLY STORE-OWNED HOUSEKEEPING WHEN M2-4 IMPLEMENTATION AUTHORIZES IT
```

### 4.3 `kernel`

Classification:

```text
WATCH_EXTRACTION
KNOWN_TRANSITION_DEBT
```

Kernel currently owns:

```text
state schema
shared primitives
state reconciliation / normalization glue
```

but Contracts v2 also allowlists existing upward dependency exceptions to:

```text
community
recurrence
lineage
handoff
```

This is the strongest Foundation-layer cohesion pressure.

However, the evidence does not justify an immediate `state` module or broad Kernel split merely to make the dependency graph prettier.

Preferred rule:

```text
retire one actual upward edge when a real extraction/inversion makes that edge unnecessary
→ remove exactly that transition exception
```

The deferred pure `state` seam remains a possible mechanism, not a target by itself.

Action:

```text
WATCH
NO STANDALONE KERNEL REFACTOR NOW
REVISIT WHEN A CONCRETE EDGE CAN BE REMOVED MECHANICALLY
```

## 5. Domain modules

### 5.1 `community`

Classification:

```text
COHESIVE
```

COMMUNITY parsing, logical comment grouping, platform taxonomy, and normalization helpers describe one structural/taxonomy owner.

Reaction-number mutation remains outside it.

Action: `KEEP`.

### 5.2 `recurrence`

Classification:

```text
COHESIVE
```

Repeated request-template observation/state is one bounded domain responsibility.

Action: `KEEP`.

### 5.3 `lineage`

Classification:

```text
COHESIVE
```

Root/parent/depth/source-chain tracking remains narrowly defined.

Action: `KEEP`.

### 5.4 `handoff`

Classification:

```text
COHESIVE
```

Short-C source reuse and parent-shift observation remain one source-handoff responsibility.

Action: `KEEP`.

### 5.5 `evidence`

Classification:

```text
COHESIVE_LARGE
```

The module performs both request-message mapping and safe request-only fencing, but these form one coherent evidence-boundary transaction:

```text
locate authoritative source evidence
→ prove bounded request mapping safety
→ apply bounded fence only when safe
```

Mapping and fencing should not be split merely because one observes and one mutates request bytes; the mutation exists only as the proven application of the same evidence boundary.

Reopen only if generic request rewriting accumulates here beyond source-evidence fencing.

Action:

```text
KEEP
WATCH ONLY FOR FUTURE NON-EVIDENCE REQUEST MUTATION
```

### 5.6 `time`

Classification:

```text
COHESIVE_LARGE
```

Time owns multiple temporal concepts:

```text
timestamp grammar
broadcast airtime
narrative clock
world year / age synchronization
current-time floor primitives
```

These are numerous but remain one temporal authority family.

The current architecture intentionally separates Broadcast airtime from Narrative time *semantically* while keeping common timestamp/comparison/commit primitives under the Time owner.

There is no evidence that splitting `broadcast-time` and `narrative-time` would improve ownership today; doing so may duplicate timestamp primitives or create cross-module clock coordination.

Action:

```text
KEEP LARGE
NO SIZE-ONLY SPLIT
```

### 5.7 `frame`

Classification:

```text
COHESIVE
```

Visible Volume/Chapter/Chatindex parsing, continuity, previous-frame capture, and bounded repair are one frame-sequence authority.

Action: `KEEP`.

### 5.8 `lifecycle`

Classification:

```text
COHESIVE_LARGE
NOT_DEBT UNDER CURRENT M2 CONTRACT
```

Lifecycle coordinates request-domain preparation across existing domain owners and owns Broadcast mode/episode lifecycle plus request-scoped classification facts.

This is intentionally allowed by Contracts v2 for the current M2 phase.

Do not infer a generic TurnPipeline merely because Lifecycle calls multiple domain helpers.

The correct question is whether unrelated *non-request-domain* work begins accumulating here.

Current answer:

```text
NO MATERIAL NEW EXTRACTION SIGNAL
```

Action:

```text
KEEP AS REQUEST-DOMAIN COORDINATOR
REVISIT ONLY AFTER M2 OWNERSHIP MOVES OR NEW CONCRETE DRIFT
```

### 5.9 `reaction`

Classification:

```text
COHESIVE
```

Reaction parsing, per-platform historical floors, deterministic normalization, and maxima recording are one reaction-number authority.

Action: `KEEP`.

## 6. Validation / representation

### 6.1 `structure`

Classification:

```text
COHESIVE_LARGE
```

Structure validates several output surfaces:

```text
response envelope/frame shape
COMMUNITY cardinality/units
Knowledge requirements
clock/frame integrity inputs
state-commit safety
```

The breadth is substantial, but the module still has one constitutional rule:

```text
JUDGE INTEGRITY / COMMIT SAFETY
DO NOT REPAIR
```

Splitting by each validated tag would fragment one validation authority and duplicate issue aggregation.

Action:

```text
KEEP LARGE
EXTRACT ONLY IF A FUTURE SUBVALIDATOR GAINS INDEPENDENT POLICY/LIFECYCLE
```

### 6.2 `representation`

Classification:

```text
WATCH_EXTRACTION
KNOWN_TRANSITION_DEBT
```

The physical Representation subsystem itself is cohesive:

```text
CANONICAL / HOST_RAW / FRESH identity relation
bounded provenance
exact carryover classification
fingerprint-only memory ledger
```

But current `EXACT_PRIOR_MATCHES` knows Output Compat policy-shaped labels such as:

```text
FRESH_CONFIRMED_SUFFIX
BOUNDARY_CONFIRMED_SUFFIX
SAFE_BOUNDARY_CONFIRMED
```

That coupling is not enough to split Representation; it is evidence that one dependency/interpretation edge should later be narrowed.

Action:

```text
KEEP MODULE
WATCH LABEL-COUPLING RETIREMENT AFTER M2-4C EQUIVALENCE PROOF
```

## 7. Application layer

### 7.1 `output-compat`

Classification:

```text
COHESIVE_LARGE
```

Preamble classification, response-envelope canonicalization, tail placement, Fresh-confirmation candidates, and safe-boundary candidates are all forms of output representation compatibility.

Its breadth does not currently indicate unrelated ownership.

M2-4C may move *interpretation back into this owner* from Runtime Mirror, which increases correct ownership rather than creating a new concern.

Action:

```text
KEEP
DO NOT SPLIT NORMALIZATION/CANDIDATE FAMILIES WITHOUT NEW COHESION EVIDENCE
```

### 7.2 `bootstrap-migration`

Classification:

```text
COHESIVE_LARGE
```

History bootstrap plus legacy clock/state/contamination repair are heterogeneous algorithms but one execution-phase authority:

```text
construct/adopt compatible Core state from history or legacy state
```

Ordinary output compatibility remains outside it.

A growing number of old migrations alone is not sufficient reason to fragment it; old repair helpers may remain private implementation details while the cold/migration transaction stays cohesive.

Action:

```text
KEEP
REVIEW ONLY IF ACTIVE ORDINARY-TURN POLICY STARTS ACCUMULATING HERE
```

### 7.3 `recovery`

Classification:

```text
TRANSITIONAL_FACADE
KNOWN_TRANSITION_DEBT
RETIREMENT CONDITIONALLY SELECTED
```

Current Recovery owns no independent policy, state, or I/O; it aliases `output-compat` and `bootstrap-migration` for staged compatibility.

This is not a cohesion extraction target.

Correct lifecycle:

```text
M2-3 lands
→ re-inventory callers
→ direct-owner call migration
→ zero-caller proof
→ retire facade if compatibility evidence allows
```

Action:

```text
KEEP TEMPORARILY
DO NOT ADD NEW POLICY
DO NOT RENAME INTO ANOTHER BARREL MODULE
```

### 7.4 `prompt`

Classification:

```text
COHESIVE_LARGE
```

Prompt compiles/serializes already-owned authority facts into runtime prompt bytes.

It may contain many conditionals because the serialization surface is broad, but this remains one responsibility as long as Prompt does not begin deciding semantic authority itself.

Action:

```text
KEEP
WATCH POLICY LEAKAGE, NOT LINE COUNT
```

### 7.5 `session`

Classification:

```text
EXTRACTION_REQUIRED
KNOWN_TRANSITION_DEBT
POST_M2_3_REBASE_REQUIRED
```

This is the clearest current gravity-well pressure.

Legitimate Session core:

```text
per-chat current state holder
Store association
current output/trusted identity anchors
request/output phase ordering
persistence sequencing
bounded init/operation receipts
```

Current co-located responsibilities include known narrower owners/candidates:

```text
Edit Reconcile decision/rebuild path
→ M2-3 `edit-reconcile`

Deterministic output finalization transaction
→ M2-4D `output-finalize` selected provisionally

Legacy/trust interpretation facts
→ bootstrap/migration result boundary

Deferred prune running/index state
→ Store housekeeping

Owner-specific diagnostic stats
→ bounded owner receipts / diagnostic forwarding
```

This classification does **not** mean Session should disappear.

Target remains:

```text
SESSION = PER_CHAT_STATEFUL_APPLICATION_ORCHESTRATOR
```

Action:

```text
M2-3 FIRST
THEN ACTUAL M2-4A RE-INVENTORY
THEN MECHANICAL NARROWING IN SEPARATE PROVEN SLICES
```

### 7.6 planned `edit-reconcile`

Classification:

```text
NOT_PHYSICAL_YET
TARGET COHESION = COHESIVE APPLICATION SERVICE
```

The frozen responsibility is one previous-assistant reconciliation decision tree plus fallback coordination.

It must not become a second Session or import Runtime host concerns.

### 7.7 planned `output-finalize`

Classification:

```text
NOT_PHYSICAL_YET
EXTRACTION_CANDIDATE ALREADY SELECTED PROVISIONALLY
TARGET COHESION = COHESIVE APPLICATION SERVICE
```

Its intended boundary is strictly:

```text
prepared output + base semantic state
→ deterministic finalized content/state + bounded receipts
```

No Store, Host, Mirror, edit classification, or diagnostic rendering ownership.

## 8. Observability layer

### 8.1 `ops`

Classification:

```text
COHESIVE_LARGE
SIZE_ONLY WATCH
```

OPS can legitimately accumulate many performance/diagnostic formatting helpers because they share one observability role.

Risk condition is not size. Risk begins if OPS starts making generation, state, compatibility, or persistence decisions.

Current evidence does not require extraction.

Action:

```text
KEEP LARGE
RENDER/FORMAT ONLY
```

## 9. Runtime modules

### 9.1 `runtime-contracts`

Classification: `COHESIVE`.

Runtime cache/placement ownership declarations only.

### 9.2 `runtime-host`

Classification: `COHESIVE`.

Host API adapter only.

### 9.3 `runtime-cache`

Classification: `COHESIVE`.

Runtime prompt-prefix/cache observation and identity only; provider cache remains unverified.

### 9.4 `runtime-topology`

Classification:

```text
COHESIVE_LARGE
```

Topology signatures, prefix-break localization, and host-prefix sketches all describe one bounded request-topology observer.

Action: `KEEP`.

### 9.5 `runtime-cache-candidates`

Classification: `COHESIVE`.

Bounded cache-trajectory observation only.

### 9.6 `runtime-telemetry`

Classification:

```text
COHESIVE_LARGE
```

The two-tier same-tab handoff transport plus validation/adoption metadata remain one refreshless telemetry-continuity responsibility.

The presence of memory and sessionStorage transports does not create separate semantic owners.

Action: `KEEP`.

### 9.7 `runtime-session`

Classification: `COHESIVE`.

Host-facing CoreSession reuse/load/cold-init selection only.

It must remain free of edit/output business logic.

### 9.8 `runtime-mirror`

Classification:

```text
WATCH_EXTRACTION
KNOWN_TRANSITION_DEBT
POST_M2_3_REBASE_REQUIRED
```

Its cohesive runtime core is:

```text
Fresh host observation
runtime/location/sequence guards
mirror scheduling/transport
bounded observation/transport facts
```

Current ownership pressure is the semantic interpretation of Output Compat candidate matches into policy-shaped meanings and canonical-equivalence acceptance.

M2-4C already maps the target:

```text
Runtime Mirror = observe / exact-match / guard / safely apply / transport
Output Compat = compatibility candidate meaning + acceptance policy
Representation = retained identity/provenance relation
```

The correct future work is a narrow interpretation-boundary extraction, not a split of Mirror into many transport micro-modules.

Action:

```text
WATCH UNTIL POST-M2-3 REBASE
THEN MECHANICAL M2-4C OWNERSHIP MOVE IF STILL PRESENT
```

### 9.9 `runtime-hooks`

Classification: `COHESIVE`.

Named host hook registration/removal only.

### 9.10 `runtime-probe`

Classification:

```text
COHESIVE_LARGE
SIZE_ONLY WATCH
```

The renderer has many diagnostic outputs, but rendering/summarization remains one role.

The v0.64.3 diagnostic builder binding defect demonstrated that large renderer code can have correctness defects, but not that diagnostic semantics should be split into many owners.

Policy facts should originate from their owners and arrive as bounded receipts; runtime-probe renders them.

Action:

```text
KEEP LARGE
NO SEMANTIC DECISION OWNERSHIP
```

## 10. Outer runtime composition shell

The host/bootstrap composition code outside named modules is not itself promoted to a new `TurnPipeline` module by this audit.

Current known ownership debt inside the outer request shell is the Edit Reconcile routing/representation-fast decision path targeted by M2-3.

Classification of that region:

```text
EXTRACTION_REQUIRED FOR EDIT-RECONCILE RESPONSIBILITY ONLY
```

This must not be generalized into:

```text
"outer runtime is large"
→ "extract all request/output orchestration"
→ generic TurnPipeline
```

Host hook wiring, diagnostics handoff, runtime observers, and application-service invocation remain distinct responsibilities with already-defined owners.

## 11. Cohesion pressure ranking

Highest current ownership pressure:

```text
1. Session
   = EXTRACTION_REQUIRED
   = M2-3 + later M2-4 narrowing already mapped

2. Runtime Mirror
   = WATCH_EXTRACTION
   = semantic compatibility interpretation mixed with host observer/transport

3. Kernel
   = WATCH_EXTRACTION
   = Foundation schema/primitives plus known upward dependency exceptions

4. Recovery
   = TRANSITIONAL_FACADE
   = retirement after direct-owner migration + zero-caller proof

5. Representation
   = WATCH_EXTRACTION at one coupling edge only
   = Output Compat policy-label knowledge
```

Important:

```text
Time / Structure / Lifecycle / Prompt / OPS / runtime-probe may be large,
but current evidence does not place them above the ownership-pressure set merely by size.
```

## 12. No-extraction list under current evidence

Do not open standalone extraction work merely for:

```text
community
recurrence
lineage
handoff
evidence
time
frame
lifecycle
reaction
structure
output-compat
bootstrap-migration
prompt
ops
runtime-contracts
runtime-host
runtime-cache
runtime-topology
runtime-cache-candidates
runtime-telemetry
runtime-session
runtime-hooks
runtime-probe
```

This is not a permanent ban.

Reopen when a concrete trigger appears:

```text
unrelated responsibility accumulates
new dependency exists only for a separate concern
host/runtime leakage enters Core
persistence and semantic policy mix
semantic decision moves into diagnostics
one independent lifecycle phase emerges
repeated unrelated edits target one recognizable region
existing direct fixture boundary reveals a stable separate owner
```

## 13. Relationship to Transition-Debt Map

This audit must not create duplicate debt IDs for already-mapped transitions.

Mapping:

```text
Session Edit Reconcile pressure
→ TD-01

Recovery facade
→ TD-02

Session output finalization
→ TD-03

Runtime Mirror compatibility interpretation
→ TD-04

Representation Output Compat label coupling
→ TD-05

Session legacy/trust fact
→ TD-06

Session prune housekeeping
→ TD-07

Session owner-specific stats
→ TD-08

Kernel upward dependency exceptions
→ TD-09
```

The audit adds severity/cohesion context; the Transition-Debt Map remains retirement-roadmap authority.

## 14. Relationship to permanent fixtures

Cohesion decisions must use existing fixture identities rather than producing test suites per module.

Known ownership movement effects remain:

```text
M2-3 edit-reconcile exposure
→ representation-fast HYBRID_TRANSITIONAL → EXECUTABLE
→ genuine-edit HYBRID_TRANSITIONAL → EXECUTABLE

output-finalize exposure
→ broadcast-closure final B_END unlock may become directly executable
```

No new suite is justified merely because this audit names a module.

## 15. Post-M2-3 mandatory re-run

This baseline audit is useful now, but the high-pressure area is intentionally about to move.

After M2-3 lands and stabilizes:

```text
1. re-audit actual Session fields/methods
2. confirm outer-shell Edit Reconcile routing disappeared
3. audit new edit-reconcile cohesion and dependency fan-out
4. re-audit Session after moved decision tree
5. re-audit Runtime Mirror against actual post-M2-3 call graph
6. confirm output-finalize remains an independent transaction
7. re-evaluate Recovery callers
8. re-evaluate Kernel only for actual changed edges
```

Do not mechanically preserve this pre-M2-3 classification if source reality changes.

## 16. Reopen / escalation rules

A `COHESIVE_LARGE` module becomes `WATCH_EXTRACTION` only when evidence shows ownership drift, not simply additional lines.

A `WATCH_EXTRACTION` module becomes `EXTRACTION_CANDIDATE` when:

```text
one responsibility can be independently described
+ its input/output boundary is stable
+ dependencies become cleaner when moved
+ equivalence controls exist or can be built without copying production logic
```

A candidate becomes `EXTRACTION_REQUIRED` only when:

```text
continued co-location materially violates Contracts/ownership
OR active milestone design selects the move with evidence-backed proof requirements
```

## 17. Final verdict

```text
SIMCORE_MODULE_COHESION_BASELINE_2026_08_26
= BROADLY HEALTHY
= NO BIG-BANG MODULARIZATION

EXTRACTION_REQUIRED
= Session / outer-shell Edit Reconcile responsibility (M2-3)
= Session output-finalization responsibility provisionally after M2-3 rebase

WATCH_EXTRACTION
= Runtime Mirror compatibility interpretation
= Kernel upward dependency seams
= Representation Output Compat label coupling

TRANSITIONAL_FACADE
= Recovery

COHESIVE_LARGE / KEEP
= Store
= Evidence
= Time
= Lifecycle
= Structure
= Output Compat
= Bootstrap Migration
= Prompt
= OPS
= Runtime Topology
= Runtime Telemetry
= Runtime Probe

BROAD FRAGMENTATION JUSTIFIED
= NO

GENERIC TURN PIPELINE JUSTIFIED
= NO

NEXT COHESION AUTHORITY EVENT
= M2-3 PHYSICAL LANDING → RE-RUN AUDIT

RUNTIME CHANGE
= NONE
RELEASE-SIMCORE CHANGE
= NONE
```
