# SimCore Design-Only Research Candidates — 2026-08-26

Status: `DESIGN-ONLY RESEARCH MENU · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Production authority: `release-simcore` v0.64.7
Main at record start: `e37669939f2ffcb5bb71749b5e5a1561cba717fb`

Related:
- `docs/SIMCORE_NEXT_FOCUS_REFRESH_AFTER_RESEARCH_CLOSES_2026-08-26.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_MODULE_COHESION_AND_EXTRACTION_GUIDELINE.md`
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_COMPLETENESS_AUDIT_2026-08-26.md`
- `docs/SIMCORE_HOST_HISTORY_RESILIENCE_COMPLETENESS_AUDIT_2026-08-25.md`
- `docs/SIMCORE_DIAGNOSTIC_UX_PREIMPLEMENTATION_CLOSE_2026-08-25.md`

## 1. Purpose

The near-term goal of this workstream is architectural research and design only.

Do not treat the candidates below as authorization to implement, create runtime branches, modify `latest.js` / `install.js`, deploy `release-simcore`, or reopen already-closed broad research tracks.

Canonical goal:

```text
inspect current ownership
→ identify future pressure points
→ define exact owns / does-not-own boundaries
→ define migration / equivalence gates
→ stop before implementation
```

Research should create future implementation clarity, not speculative code.

## 2. Closed or paused broad tracks — do not reopen horizontally

The following broad research is already complete or intentionally paused:

```text
Gemini / cache architecture                CLOSED / PAUSED
Diagnostic / Operator UX broad research    CLOSED
Host / History Resilience broad research   CLOSED
Regression Fixture Expansion broad research CLOSED
Long-chat Store latency                    NATURAL-SAMPLE WATCH / PAUSED
```

Reopen only on the explicit evidence triggers already recorded in those tracks.

## 3. Priority A — Post-M2-3 Session / Runtime Mirror target architecture

Research artifact candidate:

```text
SIMCORE_M2_4_SESSION_RUNTIME_MIRROR_TARGET_MAP
```

Primary question:

```text
after Edit Reconcile leaves Session / outer runtime,
what responsibilities should Session and Runtime Mirror still own?
```

Research dimensions:

```text
Session
- identity/current-state holder?
- request/output orchestration only?
- bootstrap coordination still present?
- output-finalize composition still present?

Runtime Mirror
- Fresh host observation
- strict identity/location/staleness gates
- mirror write scheduling
- any orchestration debt still incorrectly co-located?
```

Required output:

```text
CURRENT OWNER
TARGET OWNER
KEEP
MOVE LATER
DO NOT MOVE
DEPENDENCY BOUNDARY
EQUIVALENCE GATE
```

Why high value:
- direct continuation of Contracts v2;
- can be researched without touching M2-3 implementation;
- gives M2-4 a bounded shape before physical work begins;
- may expose future module-cohesion extraction candidates.

Research constraint:

```text
M2-3 actual shape remains authoritative when it lands.
This research must be revised rather than forcing M2-3 to fit a speculative diagram.
```

## 4. Priority A — Output Finalization Ownership Map

Research artifact candidate:

```text
SIMCORE_OUTPUT_FINALIZATION_OWNERSHIP_MAP
```

Current pressure signal:

```text
finalizePreparedOutput(...)
```

currently composes several post-render concerns and still contains orchestration-owned state transitions such as final B_END unlock.

Research questions:

```text
What is pure validation?
What is deterministic repair?
What is state commit?
What is lifecycle close?
What is reaction normalization?
What is compatibility handling?
Which part is a genuine application-service boundary?
```

Target is not necessarily a new module.

Possible outcomes:

```text
COHESIVE_LARGE
→ keep current owner

WATCH_EXTRACTION
→ document pressure, no split yet

EXTRACTION_CANDIDATE
→ define exact future service boundary
```

Important non-goal:

```text
Do not split output finalization merely to make broadcast-closure tests EXECUTABLE.
Testability is supporting evidence, not sole architecture authority.
```

This research should explicitly preserve:

```text
output bytes
state ordering
Broadcast / Time / Frame ownership
Structure judge-only rule
Main Model renderer boundary
```

## 5. Priority A/B — Recovery Compatibility Facade Retirement Contract

Research artifact candidate:

```text
SIMCORE_RECOVERY_FACADE_RETIREMENT_CONTRACT
```

M2-1 already split the physical responsibilities into:

```text
output-compat
bootstrap-migration
```

while `recovery` remains a compatibility facade.

Research questions:

```text
Who still imports recovery?
Which calls are pure forwarding?
Which callers genuinely require compatibility semantics?
Can callers migrate directly without dependency inversion?
What exact evidence allows the facade to shrink?
When is facade removal safe?
```

Desired result:

```text
KEEP_TEMPORARILY
SHRINK_AFTER_M2_4
RETIRE_WHEN_NO_DIRECT_CALLERS
```

with explicit removal gates rather than aesthetic cleanup.

Do not redesign bootstrap/migration semantics during this research.

## 6. Priority B — Application-Service Boundary Map

Research artifact candidate:

```text
SIMCORE_APPLICATION_SERVICE_BOUNDARY_MAP
```

Purpose: map the major orchestration phases without creating a generic "god pipeline".

Candidate phases:

```text
request preparation
edit reconciliation
prompt preparation
output compatibility
output validation / finalization
bootstrap / migration
```

For each phase, record:

```text
owner
inputs
outputs
state mutation permission
host dependency permission
persistent write permission
renderer responsibility boundary
```

Primary research question:

```text
where do domain owners end and application orchestration begin?
```

This can prevent future Session/runtime gravity wells.

Anti-goal:

```text
Do not invent one TurnPipeline merely because a diagram looks cleaner.
Contracts v2 previously rejected premature Turn Pipeline extraction.
```

## 7. Priority B — State Ownership Registry v2

Research artifact candidate:

```text
SIMCORE_STATE_OWNERSHIP_REGISTRY_V2
```

Purpose: map each meaningful state family to one authority and one persistence class.

Candidate dimensions:

```text
state field / family
semantic owner
writer
reader
persistent vs memory-only
request-scoped vs session-scoped
migration owner
diagnostic-only mirror
forbidden alternate writer
```

High-value families include:

```text
broadcast lifecycle / airtime
narrative timestamp
frame counters
community platform maxima
representation provenance
runtime telemetry handoff
pending turn facts
history-bootstrap markers
```

Why useful:
- M2 moves physical ownership;
- prevents duplicate writers during later extraction;
- makes persistence vs observation boundaries explicit;
- useful input for module-cohesion reviews.

Do not change schema or persistence during this research.

## 8. Priority B — Contracts v2 Transition-Debt Retirement Map

Research artifact candidate:

```text
SIMCORE_CONTRACTS_V2_TRANSITION_DEBT_RETIREMENT_MAP
```

Current Contracts v2 deliberately contains transitional exceptions and compatibility debt.

Research should inventory:

```text
known dependency exceptions
compatibility facades
outer-shell decision trees
temporary ownership overlaps
HYBRID_TRANSITIONAL test surfaces caused by physical ownership
```

For each debt item:

```text
why it exists
which milestone may remove it
what proof is required before removal
what must remain frozen
```

This is a roadmap / debt map, not cleanup implementation.

## 9. Priority B/C — Module Cohesion Audit

Research artifact candidate:

```text
SIMCORE_MODULE_COHESION_AUDIT
```

Apply the newly frozen rule:

```text
module size is a signal
ownership cohesion is the authority
```

Audit current production modules using classifications:

```text
COHESIVE_LARGE
WATCH_EXTRACTION
EXTRACTION_CANDIDATE
EXTRACTION_REQUIRED
```

Review dimensions:

```text
number of independently describable responsibilities
dependency fan-in / fan-out
host/runtime leakage
persistence + domain mixing
diagnostics + semantic ownership mixing
independent lifecycle phases
repeated unrelated edits
ability to test one responsibility without unrelated setup
```

Important:

```text
This audit may identify candidates.
It does not authorize extraction.
```

Best timing:
- baseline audit can be done now;
- re-run after M2-3 lands because ownership movement may materially change results.

## 10. Priority C — Architecture Testability Surface Map

Research artifact candidate:

```text
SIMCORE_ARCHITECTURE_TESTABILITY_SURFACE_MAP
```

Purpose is not more fixture design.

Instead classify important boundaries as:

```text
DIRECT_EXECUTABLE
APPLICATION_INTERNAL
RUNTIME_ONLY
HOST_BOUND
EXTERNAL_UNVERIFIED
```

Use this to answer:

```text
Which important contracts are hidden only because physical ownership is poor?
Which ones are correctly runtime-only and should remain so?
Where would an extraction improve both ownership and testability?
```

This is particularly useful for:
- Edit Reconcile after M2-3;
- output finalization;
- final B_END unlock;
- Recovery facade retirement.

Do not create test-only production APIs from this map.

## 11. Priority C — Prompt / Runtime Boundary Cohesion Review

This is narrower than reopening cache research.

Research artifact candidate:

```text
SIMCORE_PROMPT_RUNTIME_BOUNDARY_COHESION_REVIEW
```

Question:

```text
Does Prompt still only serialize already-owned authority facts,
or has policy/orchestration started accumulating there?
```

Review only ownership and dependency shape:

```text
Prompt owns serialization
!= Prompt owns semantic policy
!= Prompt owns provider cache
```

No prompt-byte redesign, cache optimization, or placement change is authorized.

This is lower priority unless M2-3/M2-4 changes increase Prompt coupling.

## 12. Recommended research sequence

For a design-only workstream, the strongest sequence is:

```text
1. M2-4 Session / Runtime Mirror Target Map
2. Output Finalization Ownership Map
3. Recovery Facade Retirement Contract
4. Application-Service Boundary Map
5. State Ownership Registry v2
6. Contracts v2 Transition-Debt Retirement Map
7. Module Cohesion Audit
8. Architecture Testability Surface Map
```

Why this order:

```text
future architecture shape
→ identify finalization/facade ownership pressure
→ map application boundaries
→ map state authority
→ map remaining debt
→ then classify extraction candidates
```

The Module Cohesion Audit may be performed earlier as a baseline, but extraction decisions should be revisited after M2-3 because that workstream intentionally changes ownership.

## 13. Research stop rule

A design artifact is complete when it answers:

```text
current owner
future candidate owner
owns / does-not-own
allowed dependencies
state / host / persistence permissions
migration/equivalence gate
reopen trigger
```

Do not continue horizontal architecture ideation after these are bounded unless a new concrete ownership ambiguity appears.

## 14. Current recommendation

Best next research slice:

```text
M2_4_SESSION_RUNTIME_MIRROR_TARGET_MAP
```

Second best:

```text
OUTPUT_FINALIZATION_OWNERSHIP_MAP
```

These provide the highest architectural leverage while staying fully design-only and avoiding interference with already-closed research tracks.

## 15. Current classification

```text
SIMCORE_DESIGN_ONLY_RESEARCH
= ARCHITECTURE FIRST
= NO IMPLEMENTATION
= NO RUNTIME CHANGE
= M2-3 INDEPENDENT
= CLOSED TRACKS NOT REOPENED
= OWNERSHIP COHESION FIRST
= EXTRACTION EVIDENCE-BASED
```
