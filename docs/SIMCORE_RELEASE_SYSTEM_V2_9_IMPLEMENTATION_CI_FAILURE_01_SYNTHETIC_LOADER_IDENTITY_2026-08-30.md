# SimCore Release System R2.9 Implementation CI Failure 01 — Synthetic Loader Identity

Date: 2026-08-30 KST

Classification: **FIX · SHADOW_REGRESSION_CONTEXT_IDENTITY · NON_RUNTIME · PRODUCTION_UNCHANGED**

Status: **OBSERVED · ROOT CAUSE BOUNDED · REPAIR REQUIRED**

## Failed implementation qualification

```text
PR = #941
implementation head = ff70b674f23112281998523ea2b65c1a5ab735b2
SimCore CI run = 33294355535
Verify job = 99211358652
profile = PR_MAIN
conclusion = FAIL
reason = PERMANENT_REGRESSION_FAIL
```

Permanent verifier facts:

```text
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
production = 13179cff70feaf7d12fe53c56e4735155fcf3eaa
latest/install source digest equality = PASS
production mutation = NONE
```

Exact first regression failure:

```text
SUITE_ASSERTION_FAILED:
release-system-r2-9-validation-contract-projection:
session bound exceeded
```

## Root cause

The R2.9 regression creates a synthetic next-version source in memory by changing the v0.70.0 production source identity to v0.70.1. The regression then passed that synthetic `source` into the projected-contract runner while retaining the original harness `ctx.loader`.

The permanent harness constructs `ctx.loader` once from the original source under test. Therefore the synthetic test context was internally contradictory:

```text
ctx.source = synthetic 0.70.1
ctx.loader = original production 0.70.0
```

The reload continuity authority intentionally uses `ctx.source` for release routing while exercising the executable current runtime through `ctx.loader`. Existing version wrappers preserve that relationship by changing metadata source while keeping a loader bound to the actual current runtime.

For a synthetic current release, the actual current runtime is the synthetic source itself. Reusing the original v0.70.0 loader therefore created an invalid test-only identity split and caused the inherited reload executable contract to trip the bounded session assertion.

This is not evidence of a runtime regression and not evidence that the R2.9 profile semantics are wrong. It is a synthetic regression-context construction defect.

## Bounded repair

For the synthetic next-version control only:

```text
nextSource = synthetic v0.70.1 source
nextLoader = new BundleLoader(nextSource)
nextCtx = { ...ctx, source: nextSource, loader: nextLoader }
```

Then run all four projected contracts against `nextCtx` and the synthetic v0.70.1 profile.

The inherited contract runners continue to normalize only the explicit source identity they own while retaining a loader that represents the synthetic current executable runtime, matching the established version-wrapper testing model.

## Frozen boundary

```text
active v0.70 registry routes = untouched
explicit builder-v07000 row = untouched
plugins/simcore/latest.js = untouched
plugins/simcore/install.js = untouched
release-simcore = untouched
R2.8 terminal convergence = untouched
Candidate Required = untouched
Permanent Release = untouched
Exact Approval Activation = untouched
```

## Disposition

```text
R2_9_PR941_FIRST_HEAD = FAIL_CLOSED
R2_9_SHADOW_CORE = UNCHANGED
R2_9_SYNTHETIC_TEST_CONTEXT = FIX REQUIRED
PRODUCTION = UNCHANGED_0.70.0
ACTIVATION = STILL_DEFERRED
```
