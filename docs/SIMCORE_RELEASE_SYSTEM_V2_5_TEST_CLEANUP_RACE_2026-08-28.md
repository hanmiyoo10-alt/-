# SimCore R2.5 — Approval-Boundary Test Cleanup Race

Date: 2026-08-28 KST
Status: **FIX · TEST_HARNESS_RESOURCE_CLEANUP · NON_RUNTIME · PRODUCTION_UNCHANGED**

## Trigger

R2.5 implementation PR #745 second permanent SimCore CI run:

```text
run        = 33177709304
Verify job = 98870539189
head       = 3c92dc10e9b2b828a382ae40b9206b3c8aee7efd
result     = FAIL
reason     = PERMANENT_REGRESSION_FAIL
```

The previously discovered CI-self ownership drift was repaired successfully in this run:

```text
GATE_CI_SELF = PASS
GATE_STATIC  = PASS
GATE_ARCH    = PASS
```

The only failing gate was `GATE_REGRESSION`.

Exact regression failure:

```text
SUITE_ASSERTION_FAILED: approval-boundary-convergence:
ENOTEMPTY: directory not empty, rmdir '/tmp/simcore-r25-root-f15Crf/.git'
```

## Diagnosis

The new `approval-boundary-convergence` suite creates bounded temporary Git repositories to exercise exact PR/base/head/candidate-ref behavior. Its cleanup used a single immediate recursive `fs.rmSync(..., { recursive:true, force:true })` call.

On the hosted CI filesystem a short-lived Git filesystem teardown race left `.git` non-empty at the exact cleanup instant. The functional approval-envelope assertions had not exposed a semantic release-system defect; the suite failed while removing its own temporary fixture repository.

## Classification

```text
R2_5_APPROVAL_TEST_TEMP_GIT_CLEANUP_RACE
= FIX
= TEST_HARNESS_RESOURCE_CLEANUP
= NON_RUNTIME
= NON_PRODUCTION
= PRODUCTION_UNCHANGED
= RELEASE_SIMCORE_UNCHANGED
```

This is not a runtime, candidate, approval-authority, or publisher failure.

## Scope

No ownership expansion is required.

The fix remains inside the already authorized new suite owner:

```text
products/simcore/tests/suites/approval-boundary-convergence.test.mjs
```

## Required correction

Temporary tree removal should use Node's bounded recursive removal retry support:

```text
recursive: true
force: true
maxRetries: small fixed bound
retryDelay: small fixed delay
```

The cleanup must remain synchronous, bounded, test-only, and must not introduce a background loop or runtime behavior.

## Production exposure

```text
release-simcore mutation = NONE
runtime/plugin mutation  = NONE
production exposure      = NONE
```
