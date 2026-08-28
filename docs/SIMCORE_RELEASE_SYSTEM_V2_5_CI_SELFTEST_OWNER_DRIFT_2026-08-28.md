# SimCore R2.5 — CI Self-Test Owner Drift

Date: 2026-08-28 KST
Status: **FIX · TEST_HARNESS_CONTRACT_DRIFT · NON_RUNTIME · PRODUCTION_UNCHANGED**

## Trigger

R2.5 implementation PR #745 first permanent SimCore CI run:

```text
run        = 33177394770
Verify job = 98869457327
head       = 3c9d89a82b25e929fd75fcc43e8398108b6299fd
result     = FAIL
reason     = CI_SELF_TEST_FAIL
```

Trusted predecessor MAIN_HEALTH verification passed. Proposed permanent verifier also completed its STATIC / ARCH / REGRESSION gates successfully; the only failing gate was `GATE_CI_SELF`.

Exact self-test failure:

```text
release adapter required token missing: RS2_4_RELEASE
```

## Diagnosis

The active self-test still encoded the pre-R2.5 ownership assumption that `.github/workflows/simcore-release-pr-activation.yml` must directly contain the `RS2_4_RELEASE` literal.

R2.5 intentionally moves approval-envelope semantics, including the exact authority marker, into the shared non-publishing owner:

```text
products/simcore/tooling/release-approval-envelope.mjs
```

The activation workflow becomes an orchestration/reobservation consumer of the shared validator. Requiring the workflow to duplicate the authority literal would preserve the duplicated semantic ownership that R2.5 is specifically designed to remove.

## Classification

```text
R2_5_CI_SELFTEST_APPROVAL_OWNER_DRIFT
= FIX
= TEST_HARNESS_CONTRACT_DRIFT
= NON_RUNTIME
= PRODUCTION_UNCHANGED
= RELEASE_SIMCORE_UNCHANGED
```

This is not evidence of a runtime or publisher safety defect.

## Scope expansion

Implementation read/edit scope expands by one existing dependency:

```text
products/simcore/tooling/ci/self-test.mjs
```

Reason:

```text
permanent CI exposed a stale test-owner assertion directly constraining the changed approval boundary
```

Implementation authority does not expand beyond R2.5. The self-test must be updated to assert the new ownership boundary rather than reintroducing the old duplicated token into activation YAML.

## Required correction

The permanent self-test should require:

```text
activation workflow calls release-approval-envelope.mjs
activation workflow retains permanent dispatch + watch + non-publisher restrictions
activation workflow does not own PR title authorization
shared approval-envelope validator owns RS2_4_RELEASE validation
```

It must not restore direct duplicated approval semantics merely to satisfy a lexical sentinel.

## Production exposure

```text
release-simcore mutation = NONE
runtime/plugin mutation  = NONE
production exposure      = NONE
```
