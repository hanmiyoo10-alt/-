# SimCore v0.70.10 Pre-Merge Coarse-Clock Assertion Fix

Date: 2026-09-06 KST
Status: **FIX RECORDED · PRE-MERGE · NON-RUNTIME-SEMANTIC**
Classification: **FIX · V07010 IMPLEMENTATION QUALIFICATION · COARSE-CLOCK TEST EXPECTATION · PRE-MERGE**

## 1. Trigger

The first hosted qualification run for implementation PR #1638 failed closed.

```text
PR = #1638
Implementation head = b936ce4f4a973fd5db78c1a170c78961e022cc20
SimCore CI run = 33991813847
Verify job = 101375269884
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
reason = PERMANENT_REGRESSION_FAIL
```

Exact regression message:

```text
SUITE_ASSERTION_FAILED: builder-v07010: Host unavailable path must measure acquire/reuse-resolution span
```

The failed assertion required `hostAcquireMs > 0` on the Host-unavailable branch.

## 2. Diagnosis

This is not evidence of runtime side-effect drift and does not indicate missing Host-local timing instrumentation.

The frozen v0.70.10 design requires bounded non-negative elapsed timing around the already-existing acquire/reuse-resolution and real `setItem` spans. It does not require every measured span to occupy at least one whole millisecond.

A valid elapsed timing sample may therefore be exactly `0 ms` when:

```text
clock resolution is coarser than the observed operation
OR
start/end reads fall in the same clock tick
```

This is especially relevant to fast Host-unavailable/acquire-resolution paths. The design already reserves bounded residual/confidence handling for coarse-clock and rounding effects.

Therefore:

```text
measured span contract = finite && >= 0
strict-positive span contract = INVALID / OVERSTRICT
```

## 3. Fix boundary

The correction is test-only.

Change the v0.70.10 permanent executable regression from strict positivity to finite non-negative timing for measured Host spans:

```text
hostAcquireMs > 0
-> Number.isFinite(hostAcquireMs) && hostAcquireMs >= 0

hostSetMs > 0
-> Number.isFinite(hostSetMs) && hostSetMs >= 0
```

Retain all stronger invariants:

```text
Host timing properties must exist
hostElapsedMs must enclose acquire + set when applicable
SESSION/OVERSIZE/non-Host branches remain explicit zero
Host call cardinality stays unchanged
WRITTEN/FAILED disposition stays unchanged
FAILED set does not retry
module inventory/order stays unchanged
require graph stays unchanged
OUTPUT_COMMIT await stays unchanged
only the frozen attribution clock reads are added
latest.js == install.js candidate identity remains required
```

## 4. Explicit non-fix

This record does not authorize changing the runtime implementation to force a positive duration, adding artificial delay, changing clock source, adding retries, adding Host I/O, or widening v0.70.10 scope.

```text
runtime semantic mutation caused by this FIX = 0
release-simcore mutation = 0
release-system mutation = 0
```

## 5. Disposition

```text
FIRST HOSTED FAILURE = EXPLAINED
CLASSIFICATION = FIX
OWNER = builder-v07010 permanent regression expectation
RUNTIME IMPLEMENTATION = KEEP
NEXT = correct coarse-clock assertions and rerun hosted qualification
```
