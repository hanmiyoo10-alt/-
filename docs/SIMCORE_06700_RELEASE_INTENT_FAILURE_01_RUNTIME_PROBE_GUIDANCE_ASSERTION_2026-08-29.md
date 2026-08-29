# SimCore v0.67.0 release intent failure 01 — Runtime Probe guidance assertion

Date: 2026-08-29

Classification: **FIX · BUILDER ASSERTION SCOPE · CANDIDATE NOT MATERIALIZED · PRODUCTION UNCHANGED · NO RUNTIME DEFECT ESTABLISHED**

Failed request:

```text
PR #808
intentId  simcore-v0.67.0-intent-01
releaseId simcore-v0.67.0-new-01
head       2cb6dcbe82817e2b253403c798f0ce0ceb7e1317
```

Production at failure:

```text
release-simcore 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
version         0.66.0
blob            f0da13d4c47fd98e9065d7dbf253a3296151ee16
```

## Observed permanent-CI result

```text
SimCore CI conclusion FAIL
reason PR1_DRY_QUALIFICATION_FAIL
GATE_CI_SELF    PASS
GATE_STATIC     PASS
GATE_ARCH       PASS
GATE_REGRESSION PASS
GATE_PR1_DRY    FAIL
```

Bounded failure payload:

```text
CANDIDATE_BUILDER_FAILED:
python3 /tmp/simcore-candidate-.../build-06700-m2-5-recovery-transition-debt-retirement.py
06700_UNEXPECTED_MODULE_BODY_CHANGE runtime-probe
```

Candidate materialization did not complete and `release-simcore` was not mutated.

## Root cause

The M2-5 builder intentionally updates the existing operator release card to v0.67 guidance. That card is physically located inside the `runtime-probe` module.

The builder's differential assertion correctly allowed physical-body changes for:

```text
contracts
runtime-telemetry
```

but accidentally still required `runtime-probe` to remain byte-identical to v0.66.

Therefore the builder rejected its own authorized operator-guidance mutation before candidate creation.

This is an assertion-envelope defect, not evidence that Recovery retirement changed runtime-probe behavior unexpectedly.

## Repair contract

Do not weaken the whole differential check.

Repair narrowly:

```text
all surviving modules except contracts/runtime-telemetry/runtime-probe remain byte-identical
+
contracts delta remains exact Recovery row removal only
+
runtime-telemetry delta remains HOST_COMPAT_VERSION 0.66.0 -> 0.67.0 only
+
runtime-probe delta must equal the deterministic operator-card replacement only
```

No additional runtime mutation is authorized.

## Transaction disposition

```text
simcore-v0.67.0-intent-01 = FAILED / DO NOT REUSE
simcore-v0.67.0-new-01    = FAILED / DO NOT REUSE
next attempt              = fresh append-only intent/release IDs
```

The next release intent may proceed only after the builder repair is merged through normal product CI.
