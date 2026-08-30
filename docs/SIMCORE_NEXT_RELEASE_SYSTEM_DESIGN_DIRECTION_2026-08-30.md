# SimCore Next Release-System Design Direction

Date: 2026-08-30 KST

Status: **DIRECTION RECORDED · VERSION UNASSIGNED · DESIGN NOT YET FROZEN · IMPLEMENTATION NOT AUTHORIZED**

Classification: **RELEASE-SYSTEM DIRECTION · NON-RUNTIME · STABILITY/SIMPLICITY/BOUNDED-AUTOMATION**

Feedback authority:
- `docs/SIMCORE_R2_9_OPERATIONAL_FEEDBACK_2026-08-30.md`
- `docs/SIMCORE_R2_8_V07000_SECOND_ORDINARY_TERMINAL_CLOSE_2026-08-30.md`

## Direction

The next release-system version should preserve the automation and authority boundaries proven by R2.8 and R2.9 while reducing the remaining validation-context assembly surface.

Canonical direction:

```text
KEEP R2.8 HUMAN AUTHORITY FROZEN
KEEP R2.9 EXACT PROFILE + PROJECTED CONTRACT MODEL FROZEN
PRESERVE CURRENT AUTOMATION BOUNDARIES
MAKE VALIDATION CONTEXT ATOMIC
REDUCE MANUAL CONTEXT ASSEMBLY
FAIL CLOSED ON CONTEXT PROVENANCE CONTRADICTIONS
ADD NO NEW RELEASE AUTHORITY
```

## Why this is the next useful simplification

R2.9 successfully removed the need for per-version wrapper fanout on unchanged contracts and allowed v0.70.1 to use a declarative exact release profile.

The remaining repaired failures shared one deeper seam:

```text
source identity
loader identity
exact validation profile
contract fixture authority
```

These pieces belong to one validation context but can still be assembled independently.

Observed failure shapes included:

```text
synthetic source != loader source
nested projected contract received meta-suite fixture instead of contract fixture
candidate source version != hard-coded production-version regression expectation
```

Each failure was caught safely before production mutation, so the fail-closed architecture worked. The next version should therefore simplify the construction path rather than add more gates or wrappers.

## Preferred architectural target

Introduce one bounded, pure validation-context constructor or equivalent owner that derives the coherent tuple from the source under test.

Conceptual result:

```text
source under test
-> exact source version
-> exact validation profile
-> loader bound to the same source
-> contract fixture authority resolved by contract id
-> immutable coherent ValidationContext
-> projected contract execution
```

Illustrative shape only:

```js
ValidationContext {
  source,
  sourceVersion,
  loader,
  profile,
  fixtureOwner,
  fixtures,
  contractId,
  provenance
}
```

The concrete API is not frozen by this direction record.

## Required properties for the eventual design

1. `sourceVersion` must be derived from the exact source under test.
2. `loader` must be constructed from that same source unless a contract explicitly declares a different authority model.
3. exact profile lookup must use `sourceVersion`; no nearest/latest fallback is allowed.
4. fixture ownership must be resolved from the contract identity, not inherited accidentally from the outer meta-suite.
5. contradictory provenance must fail before contract assertions execute.
6. synthetic next-version validation must use the same constructor as production/candidate validation rather than hand-built partial contexts.
7. unchanged contracts must continue to use R2.9 parameterized stable runners without new per-version wrappers.
8. builder/fixture closure and topology preflight remain active and fail closed.

## Simplicity target

Preferred reductions:

```text
manual source/loader pairing in regression tests          -> 0 normal-path cases
manual fixture substitution in projected contract tests   -> 0 normal-path cases
hard-coded active production version assumptions          -> 0
new per-version validation wrapper fanout                  -> 0 for unchanged contracts
new release approval steps                                -> 0
new publishers                                             -> 0
new main writers                                           -> 0
new background polling/retry                              -> 0
```

Automation should remain bounded to mechanical validation wiring and bookkeeping. It must not absorb human release authority.

## Stability target

The next design should make invalid context combinations unrepresentable or fail immediately with explicit reason codes such as:

```text
BLOCKED_CONTEXT_SOURCE_LOADER_MISMATCH
BLOCKED_CONTEXT_PROFILE_VERSION_MISMATCH
BLOCKED_CONTEXT_FIXTURE_OWNER_MISMATCH
BLOCKED_CONTEXT_CONTRACT_PROFILE_MISSING
BLOCKED_CONTEXT_PROVENANCE_AMBIGUOUS
```

Exact names remain design-time decisions.

## Frozen authorities

Do not change as part of this direction:

```text
production publisher = RS2_4_PERMANENT
main writer = repo-main-write.py
HUMAN_EVIDENCE required for LIVE_PASS
R2.8 terminal convergence semantics
Candidate Required authority
Exact Approval authority
Permanent Release authority
automatic checkpoint selection = none
automatic priority selection = none
background polling/retry = none
```

## Explicit non-goals

This direction does not authorize:

- plugin/runtime changes;
- `release-simcore` mutation;
- R2.8 redesign;
- R2.9 contract-mode redesign;
- predecessor fallback retirement;
- status-document snapshot/live-semantics cleanup;
- historical wrapper deletion;
- Node runtime migration;
- new release automation authority.

Those remain separate tasks if later justified.

## Versioning

No release-system version number is assigned by this record.

Do not assume `R2.10` or `R3.0` until a separate design transaction chooses the version and freezes scope.

## Disposition

```text
NEXT RELEASE-SYSTEM DIRECTION = AUTOMATION PRESERVED + SIMPLIFICATION + STABILIZATION
PRIMARY DESIGN THEME = CONTEXT-COHERENT VALIDATION HARNESS
VERSION = UNASSIGNED
DESIGN = NOT YET FROZEN
IMPLEMENTATION = NOT AUTHORIZED
```
