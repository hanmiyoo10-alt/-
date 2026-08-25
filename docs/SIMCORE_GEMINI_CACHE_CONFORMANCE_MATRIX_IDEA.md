# SimCore Gemini Cache Conformance Matrix — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · GOLDEN BEHAVIOR MATRIX · CI-FIRST · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_COMPILER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_TRANSITION_MODEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_GEMINI_PROMPT_STABILITY_MANIFEST_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define one golden behavioral matrix that freezes the intended cache-evidence semantics across:

```text
Evidence Admission
→ request-level Verdict
→ short-horizon Verdict Transition
→ Sentinel eligibility / handoff
→ Regime handoff eligibility
```

The matrix exists to prevent a local rule change from silently altering another cache subsystem's behavior.

It is not a new runtime component and does not perform cache optimization.

## 2. Constitutional boundary

Permanent responsibility split:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

Conformance fixtures may test prompt/cache metadata contracts, but must never require SimCore to:

```text
write renderer prose
rewrite chat history
move prompt sections automatically
weaken correctness/state safety
manage Gemini explicit cache resources
change provider routing
```

A fixture that expects responsibility-boundary erosion is invalid, even if it would improve a cache metric.

## 3. Why a matrix is needed

The cache design now contains several intentionally separate layers:

```text
Receipt / local evidence producers
→ Evidence Chain
→ Admission Policy
→ Verdict Compiler
→ Transition Model
→ Sentinel
→ Regime Ledger
```

Each separation is valuable, but it creates a regression risk:

```text
change Admission rule
→ more samples become trusted
→ Verdict changes
→ Transition count changes
→ Sentinel escalation changes
→ Regime handoff changes
```

A unit test for only the changed function may still pass while the end-to-end policy has drifted.

The Conformance Matrix freezes the full behavioral path.

## 4. This is a test contract, not another authority

Required authority model:

```text
design docs + implemented policy/compiler/reducer
= semantic behavior authority

Cache Conformance Matrix
= executable regression contract derived from that design
```

The matrix must not become a hand-edited loophole that overrides design.

If implementation and frozen matrix disagree unexpectedly:

```text
CONFORMANCE_DRIFT
→ investigate code or fixture intent
```

Do not silently update expected outputs merely to make CI green.

Intentional behavior changes require:

```text
new/updated design evidence
+
narrow fixture change
+
reason recorded
```

## 5. Reuse the existing SimCore golden fixture harness

Current permanent harness already provides:

```text
fixture schemaVersion
fixture id
suite id
input
expected
meta.goldenGate
coverage expectation
registry-based suites
batch-a pack
source mutation guard
bounded reports
```

A future cache conformance implementation should prefer this existing architecture rather than creating a second test runner or release authority.

Preferred direction:

```text
products/simcore/tests/registry.mjs
→ add cache-conformance suite when implementation exists

products/simcore/tests/fixtures/cache-conformance/*.json
→ golden matrix rows

products/simcore/tests/suites/cache-conformance.test.mjs
→ deterministic policy/verdict/transition assertions
```

Exact paths remain implementation-time work, but the existing harness is the preferred integration point.

## 6. Matrix unit — one row is a policy story

A row should encode more than one isolated output.

Conceptual row:

```json
{
  "id": "cache-pre-simcore-regression-excludes-simcore",
  "input": {
    "evidence": {},
    "previousTransitionState": "QUIET",
    "compatibility": {}
  },
  "expected": {
    "admission": {},
    "verdict": {},
    "transition": {},
    "sentinelEligibility": {},
    "forbiddenClaims": []
  }
}
```

The exact fixture envelope should conform to the current SimCore harness schema.

## 7. Golden dimensions

Every important row should deliberately exercise a combination of these dimensions:

```text
PROVIDER EVIDENCE
- exact / strong bounded / heuristic / missing / ambiguous

CORRELATION
- EXACT_ID / STRONG_BOUNDED / HEURISTIC / AMBIGUOUS / UNMATCHED

BASELINE
- COLD / WARMING / ESTABLISHED / STALE / incompatible

PREFIX ATTRIBUTION
- PRE_SIMCORE / SIMCORE cache-critical / expected volatile / unavailable / contradictory

CACHE ABI
- stable SAME / slow SAME
- stable CHANGED undeclared
- slow CHANGED undeclared
- declared change
- segment reorder/tier drift

COMPATIBILITY
- same request family
- incompatible family
- model-family change
- regime mismatch

TEMPORAL CONTEXT
- QUIET / CANDIDATE / PERSISTENT / RECOVERY_PENDING / EVIDENCE_GAP
```

The matrix must not attempt the full Cartesian product. Use minimal fixtures that each prove a distinct contract boundary.

## 8. Minimum v1 fixture families

### A. Provider / correlation admission

```text
A1 exact authoritative receipt
→ ADMIT_STRONG

A2 strong bounded unique match
→ ADMIT_BOUNDED initially

A3 heuristic match
→ ADMIT_DIAGNOSTIC_ONLY

A4 ambiguous receipt candidates
→ REJECT_AMBIGUOUS

A5 no approved receipt source
→ REJECT_UNVERIFIED

A6 gateway request HIT without provider token Read
→ do not reinterpret HIT as provider cached Read
```

### B. Healthy verdicts

```text
B1 exact receipt + established compatible baseline + within normal band
→ CACHE_HEALTHY

B2 exact receipt + baseline WARMING
→ BASELINE_NOT_ESTABLISHED

B3 local Prefix Map healthy but no provider receipt
→ UNVERIFIED_PROVIDER
```

### C. Attribution verdicts

```text
C1 material provider drop + PRE_SIMCORE first break + stable/slow SAME
→ PRE_SIMCORE_PREFIX_BREAK
→ SimCore first cause unsupported

C2 material provider drop + no Prefix Map
→ PROVIDER_CACHE_REGRESSION_UNATTRIBUTED

C3 material provider drop + SIMCORE stable first break + undeclared cache-critical segment drift
→ SIMCORE_CACHE_ABI_REGRESSION_CANDIDATE

C4 same as C3 but CHANGE_DECLARED
→ declared-change-associated result
→ not undeclared regression

C5 stable/slow SAME + expected volatile frontier is the actual first relevant break
→ EXPECTED_VOLATILE_CHANGE

C6 volatile change exists only after earlier PRE_SIMCORE break
→ primary verdict remains PRE_SIMCORE_PREFIX_BREAK
→ volatile region marked CACHE_SHADOW
```

### D. Evidence limitation / contradiction

```text
D1 two strong incompatible first-break facts
→ CONTRADICTORY_EVIDENCE

D2 Manifest stable SAME vs Guardian undeclared stable drift for same compatible candidate
→ contradiction / tooling evidence inconsistency

D3 superseded receipt node present
→ superseded evidence excluded

D4 missing evidence
→ UNKNOWN / UNVERIFIED
→ never silently convert to negative fact
```

### E. Transition behavior

```text
E1 QUIET + one admitted regression
→ CANDIDATE

E2 CANDIDATE + compatible repeated regression
→ remains/reaches persistence only according to frozen threshold policy

E3 PERSISTENT + one healthy compatible request
→ RECOVERY_PENDING
→ not immediate QUIET

E4 RECOVERY_PENDING + sufficient compatible healthy evidence
→ QUIET + T_RECOVERED

E5 PERSISTENT + UNVERIFIED_PROVIDER
→ EVIDENCE_GAP preserving prior incident context

E6 EVIDENCE_GAP + compatible regression resumes
→ restore prior incident meaning
→ do not restart falsely from QUIET

E7 incompatible B_START healthy request while C/steady incident exists
→ does not recover C/steady incident
```

Threshold numbers should remain parameterized until real live evidence freezes them.

### F. Regime handoff boundaries

```text
F1 one persistent incident that later recovers
→ no confirmed CACHE_REGIME

F2 sustained new normal after compatible baseline re-establishes
→ transition model may emit T_REGIME_HANDOFF_CANDIDATE

F3 version bump + stable/slow SAME + baseline unchanged
→ no regime boundary

F4 declared Cache ABI change + sustained new healthy normal
→ regime candidate may later become DECLARED_CACHE_ABI_CHANGE

F5 model-family incompatible change
→ prior baseline STALE
→ no cross-family recovery claim
```

## 9. Negative assertions are first-class

Every fixture should be able to assert not only what happened, but what must never be claimed.

Examples:

```text
expected verdict:
PRE_SIMCORE_PREFIX_BREAK

forbidden claims:
SIMCORE_CACHE_ABI_REGRESSION_CANDIDATE
CACHE_EXPIRED
PROVIDER_HIT_INFERRED_FROM_LOCAL_PREFIX
```

Negative assertions are important because cache regressions often come from over-attribution rather than an obviously wrong positive output.

## 10. Side-effect conformance

The matrix should also verify that cache evidence logic remains observational.

Representative invariants:

```text
no raw prompt mutation
no history rewrite
no model instruction mutation
no provider request added
no synthetic warmup
no route change
no SnapshotStore semantic-state mutation solely for cache verdicts
no main-model renderer responsibility change
```

Where executable surfaces permit, fixtures should assert before/after equality of semantic state and prompt-source bytes.

## 11. Determinism contract

For normalized inputs:

```text
same admission input
→ same admission result

same admitted snapshot
→ byte-equivalent verdict

same previous transition state + same verdict + same compatibility
→ same next state + transition events
```

The suite must not depend on:

```text
wall-clock now
randomness
network availability
unordered iteration
process-local IDs
```

Time-dependent concepts such as cadence must be normalized into fixture facts before the reducer/compiler receives them.

## 12. Differential value

The current SimCore harness supports baseline/candidate differential execution.

The cache conformance suite should exploit this when implementation lands:

```text
production source P
candidate source C
same frozen fixtures

P expected behavior
C expected behavior
```

For `CACHE_ABI_INTENT = PRESERVE`, candidate behavior should remain identical for all unaffected conformance rows.

For an intentional policy change, only explicitly declared fixture rows may change.

This creates a behavioral analogue to Cache ABI byte preservation.

## 13. Fixture change discipline

A fixture change is itself an architecture event when it changes a frozen verdict or transition.

Required review questions:

```text
Which design contract changed?
Why was old behavior wrong or intentionally superseded?
Which consumers change because of this?
Does the new expectation weaken evidence authority?
Does it create a renderer-boundary violation?
Does it alter Sentinel escalation or Regime handoff unexpectedly?
```

Do not bulk-regenerate expected results from current implementation output.

Golden fixtures must remain independent expectations, not snapshots blindly blessed from code.

## 14. Coverage model

Possible suite phases:

```text
Phase 0 · DOCUMENTED_MATRIX_ONLY
- current state
- no runtime/tooling change

Phase 1 · PURE_POLICY_FIXTURES
- Admission Policy
- Verdict Compiler
- Transition reducer
- no gateway/runtime dependency

Phase 2 · COMPONENT_INTEGRATION
- Evidence Chain normalized snapshot
- Prefix/Manifest bounded facts
- Sentinel reducer ownership

Phase 3 · DIFFERENTIAL_RELEASE_GATE
- register in permanent batch-a
- run production vs candidate where appropriate
```

Do not make live provider availability a CI dependency.

Provider receipts in CI should be sanitized fixture metadata representing already-verified schema semantics.

## 15. Live evidence vs fixture evidence

The matrix can prove implementation semantics but cannot prove real Gemini implicit-cache behavior.

```text
Conformance Matrix PASS
= software obeys frozen evidence/verdict/transition rules

not
= Gemini cache is healthy
```

Actual provider cache behavior still requires authoritative Usage Dashboard/gateway receipts correlated to real requests.

Likewise, live evidence can motivate a new fixture, but a one-off live anomaly should not silently rewrite the matrix.

Preferred flow:

```text
live anomaly
→ preserve repo evidence
→ WATCH / DEFER / FIX / BLOCKER classification as appropriate
→ determine design implication
→ if contract changes, update design
→ then add/change golden fixture
```

## 16. Relation to Cache ABI Guardian

These are complementary gates.

```text
Cache ABI Guardian
= did cache-critical serialized bytes drift unexpectedly?

Cache Conformance Matrix
= did cache evidence interpretation / verdict / transition behavior drift unexpectedly?
```

A candidate can pass one and fail the other.

Examples:

```text
prompt bytes unchanged
but Admission Policy accidentally trusts HEURISTIC_MATCH
→ Guardian PASS
→ Conformance FAIL
```

```text
policy behavior unchanged
but whitespace changes stable prompt bytes
→ Conformance PASS
→ Guardian FAIL
```

Both are needed for full cache-safety regression coverage.

## 17. Relation to Evidence Chain

Evidence Chain records provenance.

The Conformance Matrix should verify that verdicts reference only admitted, non-superseded evidence nodes and preserve negative/contradictory evidence.

Representative invariant:

```text
verdict.evidenceRefs
⊆ admitted active evidence nodes
```

and:

```text
SUPERSEDED / DISMISSED required evidence
→ cannot support current strong verdict
```

## 18. Relation to Sentinel

The Sentinel should consume transition outputs rather than rebuilding request-level attribution.

The matrix should catch regressions such as:

```text
one regression verdict
→ immediate FIX candidate
```

or:

```text
one healthy request
→ clears persistent incident
```

unless a future explicitly frozen policy says otherwise.

Operational severity remains outside the pure Verdict Compiler and Transition reducer.

## 19. Relation to Regime Ledger

The matrix should ensure:

```text
persistent incident
!= confirmed new CACHE_REGIME
```

Regime confirmation requires the Baseline Profile to establish a new compatible normal plus appropriate transition evidence.

No single request-level verdict or short incident may directly write a confirmed regime boundary.

## 20. Privacy contract

Fixtures and CI reports must remain bounded and synthetic/sanitized.

Do not store:

```text
raw real user prompt bodies
raw assistant responses
full real chat histories
full gateway log rows
secrets / auth material
```

Use typed counts, digests, reason codes, synthetic IDs, and small metadata shapes.

The existing harness principle of bounded reports with no raw source leakage is the preferred model.

## 21. Suggested future suite identity

Candidate:

```text
suite id: cache-conformance
coverage: EXECUTABLE
required: true
goldenGate: true
pack: batch-a
```

Only register this once the corresponding policy/compiler/reducer implementation exists.

Do not create an empty placeholder suite merely to make the roadmap look complete.

## 22. Required first implementation gate

Before promoting a cache conformance suite into permanent CI, prove at least:

```text
1. fixture schema validation
2. deterministic replay
3. exact vs heuristic receipt admission distinction
4. missing != negative evidence
5. PRE_SIMCORE excludes SimCore first-cause claim
6. strong SimCore ABI candidate requires full evidence chain
7. declared ABI change is not mislabeled undeclared regression
8. contradictory evidence fails closed
9. one regression does not become persistent automatically
10. one healthy sample does not prove recovery automatically
11. evidence gap preserves prior incident context
12. incompatible request family does not mutate another family's incident
13. persistent incident does not directly confirm regime
14. no semantic state/prompt mutation
15. renderer boundary unchanged
16. Cache ABI Guardian remains a separate byte-contract gate
```

## 23. Non-goals

```text
real provider integration in CI
live Gemini cache benchmarking
synthetic cache warming
explicit cache resources
provider route testing
full Cartesian-product generation
opaque fuzz-only expectations
snapshotting current implementation and calling it golden
new release system
new test runner
renderer behavior testing beyond responsibility-boundary invariants
```

## 24. Recommended implementation order

```text
current idea/design freeze
→ implement Receipt Correlation feasibility first where required by runtime evidence work
→ implement pure Admission / Verdict / Transition logic on dedicated work branch
→ materialize minimal conformance fixtures
→ run harness self-tests + suite tests
→ add suite to existing registry/batch-a only when executable and stable
→ use differential mode against future candidates
→ real long-chat validation remains separate provider-evidence gate
```

Do not mix this CI/tooling implementation with a SimCore semantic/runtime feature change.

## 25. Current classification

```text
GEMINI_CACHE_CONFORMANCE_MATRIX
= HIGH VALUE
= CI-FIRST
= GOLDEN BEHAVIOR CONTRACT
= COVERS ADMISSION / VERDICT / TRANSITION / HANDOFF
= COMPLEMENTS CACHE ABI GUARDIAN
= REUSE EXISTING SIMCORE HARNESS
= NO RUNTIME CHANGE TODAY
= NO PROMPT BYTE CHANGE
= NO NEW RELEASE AUTHORITY
```
