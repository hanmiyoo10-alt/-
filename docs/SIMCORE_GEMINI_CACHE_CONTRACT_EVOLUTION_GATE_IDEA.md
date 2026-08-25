# SimCore Gemini Cache Contract Evolution Gate — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · RELEASE-TIME CACHE CONTRACT CHANGE GATE · CI-FIRST · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`

Related:
- `docs/SIMCORE_GEMINI_CACHE_FACT_CONTRACT_BUNDLE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_FACT_MIGRATION_PROTOCOL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_OBSERVER_OWNERSHIP_REGISTRY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_FACT_SCHEMA_CONTRACT_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_FACT_DEPENDENCY_GRAPH_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_TELEMETRY_BUDGET_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_RETENTION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_SAMPLE_LIFECYCLE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_COMPILER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_TRANSITION_MODEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_PROMPT_STABILITY_MANIFEST_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define one narrow release-time/CI gate for intentional evolution of the cache-observability contract set.

The Gate answers:

```text
Did the candidate Cache Fact Contract Bundle change?
Which exact fact/dimensions changed?
Was every semantic drift explicitly declared?
Does each declared change have a valid migration strategy?
Do migration fixtures prove idempotency / authority preservation / boundedness?
Does the resulting architecture still satisfy Ownership / Schema / Dependency / Cost / Retention / Privacy contracts?
Do behavioral Conformance fixtures still pass except for narrowly declared intended changes?
Can affected Baseline / Sentinel / reload observer state be preserved, replayed, rebuilt, or safely dropped?
Is the candidate allowed to proceed through the normal SimCore release workflow?
```

This Gate is not a new release authority, release system, runtime service, cache controller, provider integration, or semantic state owner.

It is a narrow CI decision layer over already-defined cache contracts.

## 2. Constitutional and workflow boundary

Permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Gate must never authorize SimCore to:

```text
write renderer prose
rewrite chat history
move prompt sections automatically
change model instructions for cache reasons
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

Normal SimCore workflow remains authoritative:

```text
main design/evidence
→ dedicated work branch implementation
→ static/CI validation
→ release-simcore deployment when runtime code changed
→ real long-chat validation
→ main evidence/long-term-memory synchronization
```

The Cache Contract Evolution Gate fits inside the static/CI validation phase. It does not replace that workflow.

Do not implement this Gate by restructuring the release system in the same work item as a cache feature or cache-contract change.

## 3. Relationship to existing cache contracts

```text
Cache Fact Contract Bundle
= deterministic structural contract materialization

Cache Fact Migration Protocol
= legal strategies for crossing intentional contract changes

Cache Conformance Matrix
= executable behavioral contract

Cache Contract Evolution Gate
= decides whether a candidate contract evolution has enough declared evidence and passing checks to proceed
```

The Gate owns orchestration/acceptance criteria only.

It does not take ownership of:

```text
fact semantics
fact producers
schema meaning
dependency meaning
migration adapter semantics
behavioral verdict logic
```

Those remain with their existing contract owners.

## 4. Primary rule — PRESERVE by default

Default intent:

```text
CACHE_FACT_CONTRACT_INTENT = PRESERVE
```

If accepted and candidate canonical Contract Bundle digests are equal:

```text
NO_CONTRACT_CHANGE
→ Gate fast-path PASS / NOT_APPLICABLE_FOR_MIGRATION
```

Do not require heavy migration testing when the semantic cache-fact contract did not change.

If the Bundle changed:

```text
PRESERVE
+ semantic drift
→ BLOCK_UNDECLARED_DRIFT
```

Intentional changes require a narrow release/work-item declaration.

## 5. Accepted reference vs candidate materialization

The Gate must compare independent materials.

Required:

```text
accepted reference contract
vs
candidate generated/materialized contract
```

Forbidden self-certification:

```text
candidate code changes
→ regenerate candidate Bundle
→ overwrite accepted expected Bundle from same candidate
→ PASS
```

The accepted reference is the previously accepted contract identity/materialization or another deliberately promoted baseline under repository authority.

Candidate generation may be automatic, but promotion of a changed contract requires explicit design/evidence plus the Gate.

## 6. Gate inputs

Conceptual inputs:

```text
acceptedBundle
candidateBundle
contractIntentOverlay
migrationOverlay when required
contract source validation result
ownership/schema/dependency validator results
telemetry-budget/retention/privacy validator results
migration fixture results
cache conformance fixture results
Cache ABI Guardian result when prompt ABI is also affected
bounded migration state-continuity fixtures where applicable
```

The Gate must not require real provider availability or network access in CI.

Provider/cache receipts used in fixtures must be sanitized typed fixture material representing already-defined receipt semantics.

## 7. Contract-change classes

Do not reduce all Bundle differences to one boolean.

Initial change classes:

```text
G0_NO_SEMANTIC_CHANGE
G1_REPRESENTATION_COMPATIBLE
G2_DERIVED_BEHAVIOR_CHANGE
G3_DEPENDENCY_OR_COMPATIBILITY_CHANGE
G4_OWNERSHIP_OR_AUTHORITY_CHANGE
G5_COST_RETENTION_OR_PRIVACY_CHANGE
G6_UNSUPPORTED_OR_UNKNOWN_CHANGE
```

These are gate-impact classes, not runtime defect severities.

### G0_NO_SEMANTIC_CHANGE

Examples:

```text
helper rename
module move
tooling metadata change outside canonical semantic Bundle
```

Expected:

```text
canonical semantic Bundle SAME
→ fast-path PASS
```

### G1_REPRESENTATION_COMPATIBLE

Example:

```text
fact payload v1 -> v2 deterministic field rename
meaning/authority unchanged
```

Requires adapter/idempotency evidence but may preserve baseline/temporal state when proven.

### G2_DERIVED_BEHAVIOR_CHANGE

Examples:

```text
Verdict Compiler contract changes
Admission behavior changes
Transition semantics change
```

Requires narrow design declaration plus affected Conformance rows.

### G3_DEPENDENCY_OR_COMPATIBILITY_CHANGE

Examples:

```text
new required upstream fact
Compatibility Key semantics change
edge-class change
```

Requires dependency validation, old-sample handling, baseline/incident impact analysis, and migration fixtures.

### G4_OWNERSHIP_OR_AUTHORITY_CHANGE

Examples:

```text
producer ownership transfer
external authority interpretation change
status/authority upgrade semantics
```

High-scrutiny class. Requires differential evidence or explicit semantic-change design, one-active-producer proof, and authority non-upgrade fixtures.

### G5_COST_RETENTION_OR_PRIVACY_CHANGE

Examples:

```text
runtime cost class widened
retention class expanded
privacy class widened
raw/ephemeral boundary changed
```

Requires explicit boundedness/privacy review and must never pass merely because behavior fixtures still pass.

### G6_UNSUPPORTED_OR_UNKNOWN_CHANGE

If the Gate cannot classify the change safely:

```text
BLOCK_UNKNOWN_CONTRACT_CHANGE
```

Do not guess compatibility.

## 8. Gate pipeline

Canonical candidate pipeline:

```text
E0 · REFERENCE RESOLUTION
→ resolve accepted Bundle identity/materialization

E1 · CANDIDATE MATERIALIZATION
→ deterministically build candidate Bundle

E2 · STRUCTURAL VALIDATION
→ Ownership / Schema / Dependency / Cost / Retention / Privacy cross-check

E3 · CONTRACT DIFF
→ identify changed factIds + exact dimensions

E4 · INTENT COVERAGE
→ PRESERVE or narrow CHANGE_DECLARED overlay

E5 · MIGRATION COVERAGE
→ every semantic drift mapped to a legal Migration Protocol strategy

E6 · MIGRATION FIXTURES
→ old→new adaptation/recompute/invalidation/idempotency/rollback behavior

E7 · BEHAVIOR CONFORMANCE
→ existing unaffected golden rows remain stable
→ declared changed rows change narrowly and intentionally

E8 · STATE-CONTINUITY IMPACT
→ Baseline / Sentinel / reload handoff / Evidence Chain effects proven where relevant

E9 · CACHE/PROMPT CROSS-GATE
→ if prompt Cache ABI also changed, Cache ABI Guardian independently passes

E10 · GATE RESULT
→ PASS_PRESERVE / PASS_DECLARED_CHANGE / BLOCK
```

The exact CI command names are implementation-time work.

## 9. Structural validation precedes migration testing

Do not test a migration against an internally invalid candidate contract.

Before migration fixtures:

```text
exactly one semantic producer per fact
known fact schema
known dependency fact IDs
same-revision graph acyclic
legal stage ordering
external authority preserved
known runtime cost class
known retention class
legal fallback status
legal privacy class
no raw-content contract expansion without explicit design
```

If structural validation fails:

```text
BLOCK_STRUCTURAL_CONTRACT_INVALID
```

Migration fixtures do not override structural invalidity.

## 10. Intent overlay must exactly cover actual drift

Conceptual declaration:

```json
{
  "intent": "CHANGE_DECLARED",
  "changes": [
    {
      "factId": "CACHE_FIRST_BREAK",
      "dimensions": ["FACT_SCHEMA", "DEPENDENCY_OPTIONAL"],
      "reason": "docs/..."
    }
  ]
}
```

Required checks:

```text
actual drift without declaration
→ BLOCK_UNDECLARED_DRIFT

declared drift not present
→ BLOCK_STALE_DECLARATION

declaration broader than actual fact/dimensions
→ BLOCK_OVERBROAD_DECLARATION
```

Do not permit:

```text
allowAllCacheContractChanges = true
```

or permanent per-fact `changeAllowed` flags.

## 11. Migration coverage is dimension-complete

For each declared semantic drift:

```text
factId
+ changed dimension
→ migration strategy or explicit NOT_APPLICABLE reason
```

Examples:

```text
FACT_SCHEMA
→ ADAPT_SEMANTICS_PRESERVING

PRODUCER_OWNER
→ OWNERSHIP_TRANSFER

DEPENDENCY_REQUIRED
→ RECOMPUTE / REEVALUATE / DROP_TO_UNVERIFIED depending retained upstream evidence

AUTHORITY_CLASS
→ explicit authority-impact migration; no migration-only authority upgrade

RETENTION_CLASS
→ compaction/retention impact proof
```

A declaration without a complete migration disposition is insufficient.

## 12. Migration fixtures are not snapshots

Migration fixtures must encode independent expected behavior.

Forbidden:

```text
run candidate migrator
→ save whatever it output as expected
→ PASS
```

Required fixture families when applicable:

```text
old artifact accepted
→ target migration result expected

migration applied twice
→ second application NO-OP / idempotent

semantics-preserving adapter
→ logical sample identity unchanged
→ baseline not consumed twice
→ temporal request count unchanged

authority-changing candidate
→ no authority upgrade without new evidence

incompatible old artifact
→ DROP_TO_UNVERIFIED / INVALIDATE as declared

rollback older runtime sees unknown newer schema
→ ignore/drop cache telemetry safely
```

## 13. Conformance impact discipline

Behavioral golden fixtures must distinguish:

```text
UNAFFECTED rows
→ byte/semantic behavior must remain unchanged

DECLARED-AFFECTED rows
→ may change only according to recorded design intent
```

The Gate should reject broad fixture churn when only one narrow fact changed.

Conceptual report:

```text
Contract change:
CACHE_RECEIPT_CORRELATION authority policy

Conformance changed rows:
A2
A3

Unrelated changed rows:
E3
F2
→ BLOCK_UNEXPECTED_BEHAVIORAL_DRIFT
```

This prevents a legitimate cache-contract migration from becoming cover for unrelated policy changes.

## 14. State-continuity impact gate

Some contract changes affect bounded live observer state even when structural/behavior tests pass.

The Gate should require targeted continuity fixtures when relevant.

### Baseline

Possible accepted actions:

```text
PRESERVE
REBUILD_FROM_BOUNDED_WINDOW
STALE_RESET_REQUIRED
```

Required invariant:

```text
migration
→ no duplicate sample learning
→ no migration-induced CACHE_REGIME claim
```

### Sentinel / Transition

Possible actions:

```text
PRESERVE_IF_REPLAY_EQUIVALENT
REPLAY_FROM_BOUNDED_INCIDENT_WINDOW
MOVE_TO_EVIDENCE_GAP
INVALIDATE_INCIDENT_STATE
```

Required invariant:

```text
migration
→ never silently RECOVERED
→ never counts one old request as a new regression request
```

### Reload observer handoff

```text
compatible/adapter-compatible
→ migrate bounded capsule

unknown/incompatible
→ drop capsule
→ observer continuity UNVERIFIED
```

Core behavior must remain unchanged.

## 15. Prompt Cache ABI cross-gate

Cache Fact Contract and Gemini Prompt Cache ABI are separate authorities.

Therefore:

```text
Fact Contract Gate PASS
does not imply
Prompt Cache ABI Guardian PASS
```

If a work item changes both cache-observability contracts and cache-critical prompt serialization for a legitimate single functional reason, both independent gates must pass.

However, do not use this as permission to combine unrelated cache-observer work with prompt architecture relocation.

A cache fact schema-only change should normally leave prompt bytes identical.

## 16. Fast path for ordinary unrelated releases

The Gate must remain cheap when a candidate does not touch cache-fact contracts.

Desired behavior:

```text
accepted Bundle digest
== candidate Bundle digest

→ CONTRACT_PRESERVED
→ skip migration-specific suites
→ ordinary existing CI continues
```

Optionally still run a small bundle self-validation if its cost is negligible.

Do not make every SimCore release pay the full migration/rebuild fixture cost forever.

## 17. Change-sensitive gate strength

The Gate should scale evidence requirements with the dimensions changed.

Conceptual matrix:

```text
representation-only compatible change
→ structural + adapter + idempotency fixtures

behavior/policy change
→ above + affected Conformance rows

dependency/compatibility change
→ above + old-sample + baseline/transition impact fixtures

ownership/authority change
→ above + differential/cutover + authority-preservation proof

privacy widening
→ explicit privacy review + fixture/static proof

runtime cost-class widening
→ Telemetry Budget proof / measurement before promotion
```

Do not encode this as one opaque numeric risk score.

## 18. Privacy widening is independently blocking

A candidate must not pass merely because:

```text
migration succeeds
Conformance passes
```

if its contract expands retained/raw data beyond the accepted privacy boundary without explicit design approval.

Examples requiring separate scrutiny:

```text
bounded digest metadata
→ raw body retention

ephemeral gateway row
→ persistent full row

bounded provenance refs
→ unbounded evidence payload
```

Default result:

```text
BLOCK_PRIVACY_CONTRACT_WIDENING
```

unless a separately justified design explicitly supersedes the old boundary. Raw prompt/history retention remains outside the current cache research direction.

## 19. Runtime cost widening is independently blocking until proven

If a fact changes from a cheaper cost class to a more expensive one:

```text
T0/T1
→ T2 or new scale-sensitive path
```

the Gate should require Telemetry Budget evidence.

Forbidden shortcut:

```text
new full-history scan
→ "needed for better cache diagnostics"
→ accept because functional fixtures pass
```

If boundedness cannot be proven:

```text
BLOCK_TELEMETRY_COST_REGRESSION
```

Prefer degraded telemetry over expensive hidden work.

## 20. Gate result vocabulary

Initial result classes:

```text
NOT_APPLICABLE_NO_CONTRACT_CHANGE
PASS_PRESERVE
PASS_DECLARED_CHANGE
BLOCK_REFERENCE_INVALID
BLOCK_CANDIDATE_INVALID
BLOCK_UNDECLARED_DRIFT
BLOCK_STALE_DECLARATION
BLOCK_OVERBROAD_DECLARATION
BLOCK_MIGRATION_INCOMPLETE
BLOCK_MIGRATION_FIXTURE_FAILURE
BLOCK_CONFORMANCE_DRIFT
BLOCK_STATE_CONTINUITY_UNPROVEN
BLOCK_AUTHORITY_TRANSFER_UNPROVEN
BLOCK_PRIVACY_CONTRACT_WIDENING
BLOCK_TELEMETRY_COST_REGRESSION
BLOCK_PROMPT_ABI_GATE_WHEN_REQUIRED
BLOCK_UNKNOWN_CONTRACT_CHANGE
```

These are CI gate outcomes, not runtime WATCH/FIX/BLOCKER classifications.

If a released/live anomaly is later discovered, preserve it under the normal runtime evidence classification discipline.

## 21. Gate report shape

Keep reports bounded and explanatory.

Conceptual:

```text
Cache Contract Evolution Gate: PASS_DECLARED_CHANGE

accepted bundle: <digest>
candidate bundle: <digest>

changed facts:
- CACHE_FIRST_BREAK
  dimensions: FACT_SCHEMA, DEPENDENCY_OPTIONAL
  intent: CHANGE_DECLARED
  migration: ADAPT_SEMANTICS_PRESERVING

structural validation: PASS
migration fixtures: PASS
conformance affected rows: 2 PASS
unaffected row drift: 0
baseline action: PRESERVE
sentinel action: PRESERVE_IF_REPLAY_EQUIVALENT
reload action: ADAPT_OR_DROP
prompt ABI gate required: NO
```

Do not emit raw prompt/history/provider payloads in Gate reports.

## 22. No auto-promotion / no bless-all command

A future helper may generate candidate materializations and reports, but it must not provide a one-command path equivalent to:

```text
update expected
accept all migrations
promote candidate contract
```

Promotion requires:

```text
intentional design/evidence
+ narrow declaration
+ passing structural validation
+ passing required migration fixtures
+ passing Conformance impact checks
```

Baseline/reference promotion should occur only after the change is accepted through the normal work/release evidence flow.

## 23. Failure does not imply runtime defect severity

A Gate failure means:

```text
candidate contract evolution is not sufficiently proven for release
```

It does not automatically mean:

```text
current production has BLOCKER runtime corruption
```

Examples:

```text
undeclared candidate Bundle drift
→ CI BLOCK
→ production may still be healthy

migration fixture failure
→ release candidate blocked
→ not a live runtime classification yet
```

Keep CI acceptance state and runtime evidence severity separate.

## 24. Relationship to real long-chat validation

Passing this Gate cannot prove Gemini implicit-cache health.

```text
Gate PASS
= candidate software/contracts are internally consistent and migration-safe under frozen fixtures

not
= Gemini provider cache behavior is healthy in production
```

After any runtime cache-observability contract change is deployed through normal workflow, real long-chat validation should still verify:

```text
observer continuity or safe reset behavior
no duplicate baseline learning
no false Sentinel transition
no authority upgrade
no prompt/runtime correctness regression
bounded telemetry cost
```

Actual Gemini cached-token behavior still requires authoritative external receipts.

## 25. Existing SimCore CI integration only

Preferred future implementation:

```text
existing SimCore test harness / batch-a / static checks
+ narrow cache-contract gate stage
```

Avoid:

```text
new independent CI platform
new release authority
new deployment branch
new runtime manifest interpreter
new provider dependency in CI
```

This design must not be implemented as a Release System v2 restructuring task bundled with cache-contract runtime work.

## 26. Minimum first executable gate fixtures

Before making the Gate CI-blocking, prove at least:

```text
1. identical accepted/candidate Bundle
   → NOT_APPLICABLE_NO_CONTRACT_CHANGE

2. undeclared fact schema drift
   → BLOCK_UNDECLARED_DRIFT

3. exact declared schema drift + valid semantics-preserving adapter
   → migration fixtures pass
   → sample identity unchanged

4. stale declaration with no actual drift
   → BLOCK_STALE_DECLARATION

5. overbroad declaration covering unrelated dimensions
   → BLOCK_OVERBROAD_DECLARATION

6. new required dependency without old-sample migration strategy
   → BLOCK_MIGRATION_INCOMPLETE

7. ownership transfer with differential mismatch
   → BLOCK_AUTHORITY_TRANSFER_UNPROVEN

8. migration applied twice
   → idempotent

9. migration causes duplicate baseline consumption
   → BLOCK_MIGRATION_FIXTURE_FAILURE

10. migration re-counts one request in Sentinel
    → BLOCK_STATE_CONTINUITY_UNPROVEN

11. unrelated Conformance row changes
    → BLOCK_CONFORMANCE_DRIFT

12. privacy class widens unexpectedly
    → BLOCK_PRIVACY_CONTRACT_WIDENING

13. runtime cost class widens without budget evidence
    → BLOCK_TELEMETRY_COST_REGRESSION

14. prompt ABI unchanged for telemetry-only schema migration

15. when prompt ABI intentionally changes too
    → independent Guardian gate required

16. rollback to older runtime cannot understand newer telemetry
    → drop to UNVERIFIED, Core behavior unchanged

17. no raw prompt/history/provider body in reports/fixtures

18. renderer boundary unchanged
```

## 27. Suggested implementation rollout

Do not build the Gate before there is executable cache-fact contract material.

Recommended future sequence:

```text
Phase 0
→ first machine-readable Fact Contract Bundle exists
→ report-only Bundle validation

Phase 1
→ deterministic accepted-vs-candidate Bundle diff
→ PRESERVE fast path

Phase 2
→ change-intent + Migration Protocol coverage validation
→ report-only gate

Phase 3
→ executable migration fixtures + cache Conformance integration

Phase 4
→ make undeclared structural/semantic contract drift CI-blocking

Phase 5
→ make ownership/authority/privacy/cost migration classes require their specialized evidence
```

Do not create empty placeholder gate scripts merely to claim roadmap completion.

## 28. Normal SimCore implementation/release order remains unchanged

When this Gate eventually exists and a real cache-contract change is approved:

```text
main design/evidence record
→ dedicated work branch implementation
→ candidate Contract Bundle materialization
→ Cache Contract Evolution Gate
→ existing static/CI regression suite
→ release-simcore deployment
→ natural real long-chat validation
→ anomalies preserved/classified
→ main evidence/long-term-memory synchronization
```

`release-simcore` remains actual deployed plugin-code authority.

`main` remains design/evidence/roadmap/admin authority.

The Gate does not alter that authority split.

## 29. Non-goals

```text
new release system
new test runner
runtime graph engine
runtime bundle interpreter
provider cache benchmarking in CI
real provider network calls in CI
explicit Gemini cache management
synthetic cache warming
prompt relocation
history rewriting
renderer behavior changes
automatic baseline blessing
automatic migration blessing
permanent allow-all migration flags
```

## 30. Current classification

```text
GEMINI_CACHE_CONTRACT_EVOLUTION_GATE
= HIGH VALUE ON FIRST EXECUTABLE CACHE-CONTRACT IMPLEMENTATION
= RELEASE-TIME / CI CHANGE ACCEPTANCE LAYER
= PRESERVE-BY-DEFAULT
= DIFF-DRIVEN
= MIGRATION-COMPLETE
= CONFORMANCE-AWARE
= AUTHORITY / PRIVACY / COST SENSITIVE
= ANTI-SELF-CERTIFICATION
= FAST NO-CHANGE PATH
= EXISTING SIMCORE CI INTEGRATION ONLY
= IDEA / DESIGN CANDIDATE

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
release-system change: NONE
```
