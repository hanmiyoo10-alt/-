# SimCore Release System R2.10 — Implementation Authorization

Date: 2026-08-30 KST

Status: **IMPLEMENTATION AUTHORIZED · NON-RUNTIME · ACTIVATION-IN-PLACE**

Operator authority provenance: current chat instruction authorizes implementation of the next release-system version after the R2.9 feedback/design-direction transaction.

Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_10_CONTEXT_COHERENT_VALIDATION_HARNESS_DESIGN_2026-08-30.md`

## Authorized scope

Implement R2.10 `Context-Coherent Validation Harness` exactly within the frozen design:

- add one bounded validation-context constructor/owner;
- derive exact source version from source under test;
- load the exact profile for that source version;
- bind a loader to that same source;
- resolve contract fixtures from the contract-owned fixture directory;
- reject contradictory outer-context authority before contract execution;
- migrate the active R2.9 route and permanent regression normal path to that constructor;
- add one permanent R2.10 regression/fixture and status/evidence records as required;
- retain R2.9 contract modes and projected contract semantics;
- retain builder/fixture closure and topology preflight;
- verify no runtime or `release-simcore` mutation.

## Forbidden scope

Do not modify in this transaction:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
R2.8 HUMAN_EVIDENCE semantics
R2.8 terminal convergence semantics
publisher authority
main-writer authority
Candidate Required authority
Exact Approval authority
Permanent Release authority
predecessor fallback retirement
status snapshot/live semantics cleanup
historical wrapper deletion
Node runtime version
background polling/retry
```

## Activation model

R2.10 is an in-place stabilization of the already-active R2.9 validation path.

No separate product release publication or `release-simcore` deployment is required.

The implementation may become the normal validation-context construction path after its own permanent SimCore CI qualification and main merge, without creating a new release authority or approval step.

## Fail-closed requirement

Any contradiction among source, sourceVersion, loader, profile, fixture owner or fixtures must fail before projected contract assertions execute.

Implementation defects discovered during qualification must be preserved immediately as `WATCH / DEFER / FIX / BLOCKER` evidence before repair.

## Required closure

```text
implementation branch
-> SimCore Verify + Required
-> evidence/status seal
-> final Verify + Required
-> main merge
-> post-main health
-> direct release-simcore readback unchanged
```

Expected deployment disposition:

`N/A_VERIFIED_NO_RUNTIME_MUTATION`

## Final authorization

```text
R2.10 IMPLEMENTATION = AUTHORIZED
R2.10 DESIGN = FROZEN
RUNTIME MUTATION = FORBIDDEN
RELEASE-SIMCORE MUTATION = FORBIDDEN
AUTHORITY EXPANSION = FORBIDDEN
```
