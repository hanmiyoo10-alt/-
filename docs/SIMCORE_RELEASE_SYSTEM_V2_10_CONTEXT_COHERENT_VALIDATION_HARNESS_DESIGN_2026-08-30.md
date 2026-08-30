# SimCore Release System R2.10 — Context-Coherent Validation Harness

Date: 2026-08-30 KST

Status: **DESIGN FROZEN · NON-RUNTIME**

Classification: **RELEASE-SYSTEM DESIGN · STABILITY/SIMPLICITY/BOUNDED-AUTOMATION**

Predecessor: `R2.9 Validation Contract Projection & Fixture Closure`

Direction authority:
- `docs/SIMCORE_NEXT_RELEASE_SYSTEM_DESIGN_DIRECTION_2026-08-30.md`
- `docs/SIMCORE_R2_9_OPERATIONAL_FEEDBACK_2026-08-30.md`

## 1. Version decision

This change is assigned **R2.10**, not R3.0.

Reason:
- R2.8 human authority remains unchanged;
- R2.9 exact-profile / projected-contract semantics remain unchanged;
- publisher, main writer, approval and publication flow remain unchanged;
- the change only collapses validation-context construction into one coherent owner.

Therefore this is an incremental stabilization/simplification release-system revision.

## 2. Goal

Preserve current automation while removing the remaining normal-path manual assembly of:

```text
source
loader
exact validation profile
contract fixture authority
fixtures
```

These values form one validation context and must be derived coherently from the exact source under test and contract identity.

## 3. Frozen predecessor behavior

KEEP / FROZEN:

```text
R2.8 HUMAN_EVIDENCE authority
R2.8 terminal convergence semantics
R2.9 validation profile schema and contract modes
R2.9 projected stable contract implementations
R2.9 exact-profile lookup semantics
R2.9 builder/fixture topology preflight
Candidate Required authority
Exact Approval authority
Permanent Release authority
production publisher = RS2_4_PERMANENT
main writer = repo-main-write.py
background polling/retry = none
```

No per-version wrapper files are added for unchanged contracts.

## 4. New bounded owner

Add one pure/local validation-context owner under `products/simcore/tooling/`.

Canonical constructor responsibility:

```text
exact source under test
+ contract id
+ outer harness context
-> sourceVersion derived from source
-> exact validation profile loaded for sourceVersion
-> loader constructed from same source
-> fixture owner fixed to contract id
-> fixture set loaded from contract-owned fixture directory
-> provenance asserted coherent
-> immutable ValidationContext returned
```

Illustrative public shape:

```js
ValidationContext {
  source,
  sourceVersion,
  loader,
  profile,
  contractId,
  fixtureOwner,
  fixtures,
  provenance,
  ...preservedOuterContext
}
```

Exact implementation names may vary but ownership must remain singular.

## 5. Required invariants

The constructor must fail before contract assertions execute when any invariant is violated:

1. source metadata version is not an exact semantic version;
2. exact profile for source version is missing or invalid;
3. profile release version does not equal source version;
4. contract id is not supported/declared by the profile;
5. contract fixture directory is missing or empty;
6. any loaded fixture declares a `suite` different from contract id;
7. outer context attempts to override source/loader/profile/fixtures with contradictory authority;
8. provenance is ambiguous.

Canonical reason-code family:

```text
VALIDATION_CONTEXT_SOURCE_VERSION_INVALID
VALIDATION_CONTEXT_PROFILE_MISSING
VALIDATION_CONTEXT_PROFILE_VERSION_MISMATCH
VALIDATION_CONTEXT_CONTRACT_UNSUPPORTED
VALIDATION_CONTEXT_FIXTURE_MISSING
VALIDATION_CONTEXT_FIXTURE_OWNER_MISMATCH
VALIDATION_CONTEXT_OVERRIDE_CONTRADICTION
VALIDATION_CONTEXT_PROVENANCE_AMBIGUOUS
```

Exact codes may be refined during implementation only when semantics remain equivalent.

## 6. Active-path integration

`release-validation-active-r2-9.mjs` remains the stable active route name for compatibility unless changing that path is required by verification.

Its normal execution must stop assembling only part of the context. Instead it must invoke the R2.10 context owner and pass the coherent context + exact profile to the existing R2.9 projected contract runner.

The stable projected contract runner itself remains frozen except for imports/API adaptation strictly necessary to receive the coherent context.

## 7. Regression migration

The R2.9 permanent regression currently hand-assembles:

```text
new BundleLoader(source)
loadActiveValidationProfile(source)
contractFixtures(contractId)
```

R2.10 must remove this normal-path manual assembly and exercise the same context constructor used by active validation.

Required controls:

```text
production source -> coherent context -> PASS
known synthetic current source -> same constructor -> PASS
source/profile mismatch -> fail closed before contract runner
fixture-owner mismatch -> fail closed before contract runner
outer loader override contradiction -> fail closed before contract runner
unknown exact profile -> fail closed
```

Synthetic next-version validation must use the same constructor rather than a hand-built partial context.

## 8. Simplicity acceptance criteria

```text
manual source/loader pairing in active/projection regression normal path = 0
manual contract fixture substitution in active/projection regression normal path = 0
hard-coded active production version assumptions = 0
new per-version validation wrappers = 0
new release approval steps = 0
new publishers = 0
new main writers = 0
new background workers = 0
```

## 9. Stability acceptance criteria

The permanent verifier must demonstrate:

- current production validation still passes;
- known v0.70.0 and v0.70.1 exact profiles remain valid;
- source, loader, profile and fixture ownership are coherent by construction;
- provenance contradictions fail before projected contract assertions;
- builder/fixture closure and topology preflight remain PASS;
- runtime and `release-simcore` are unchanged.

## 10. Non-goals

Do not mix:

- plugin/runtime feature changes;
- `release-simcore` publication;
- predecessor fallback retirement;
- status snapshot/live-semantics cleanup;
- historical wrapper deletion;
- Node runtime migration;
- R2.8 authority redesign;
- R2.9 contract-mode redesign.

## 11. Deployment disposition

This is release-system tooling only.

Expected deployment phase:

```text
release-simcore deployment = N/A_VERIFIED_NO_RUNTIME_MUTATION
```

A direct readback of `release-simcore` is still required after implementation closure.

## 12. Final disposition

```text
R2.10 DESIGN = FROZEN
THEME = CONTEXT_COHERENT_VALIDATION_HARNESS
AUTOMATION = PRESERVED
AUTHORITY EXPANSION = NONE
RUNTIME = OUT OF SCOPE
```
