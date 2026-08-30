# SimCore S2-2 PR Dry Failure 01: Cumulative Stage Baseline Misbind

Date: 2026-08-31 KST
Status: **FIX · VALIDATION / BUILDER · PRODUCTION UNCHANGED**

Primary classification:

```text
FIX · CUMULATIVE_STAGE_BASELINE_MISBOUND
```

Secondary implementation-review finding:

```text
FIX · FNV_REFERENCE_SELF_COMPARISON
```

## Trigger

PR #1020 temporary PR-only dry request:

```text
intent = simcore-v0.70.3-intent-02
head = d3114f3895ce1de408f75645237ebb3881ba83f8
SimCore CI run = 33329781054
Verify job = 99306165904
```

The request existed only to exercise `GATE_PR1_DRY`. No candidate was persisted and `release-simcore` was not mutated.

## Exact result

```text
GATE_CI_SELF    = PASS
GATE_PR1_DRY    = FAIL
GATE_STATIC     = PASS
GATE_ARCH       = PASS
GATE_REGRESSION = PASS
```

Report reason:

```text
PR1_DRY_QUALIFICATION_FAIL
```

Builder stderr:

```text
CANDIDATE_BUILDER_FAILED:
S2_2_FROZEN_MODULE_CHANGED: runtime-telemetry
```

Production identity observed by the run remained:

```text
release-simcore commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
version = 0.70.1
```

## Root cause

The S2-2 builder materializes three cumulative stages:

```text
P0 = exact v0.70.1 production
P1 = P0 + S1-1 FNV convergence / cumulative v0.70.3 identity
P2 = P1 + S2-1 dead Prompt render seam retirement
P3 = P2 + S2-2 Session dead re-export retirement
```

The first S2-2 verifier incorrectly compared selected frozen modules as:

```text
module(P0) == module(P3)
```

That is too broad for a cumulative builder. S1-1 legitimately changes cumulative identity / operator-card presentation inside `runtime-telemetry`. The S2-2 verifier therefore attributed an earlier authorized cumulative-stage delta to S2-2 and failed closed.

Correct S2-2 ownership comparison is:

```text
module(P2) == module(P3)
```

for modules outside the four Session export lines owned by S2-2.

This failure does **not** establish a runtime-telemetry regression. Static, architecture and regression gates passed, and the failure occurred inside the builder's own over-broad invariant.

## Secondary finding: FNV reference smoke

During review of the failing builder, `fnv_reference_check()` was found to compare the same implementation to itself:

```text
a = f(x)
b = f(x)
```

This cannot prove old-vs-new equivalence. It did not cause the PR dry failure, but it weakens the builder's local evidence.

Repair requirement:

```text
old complete-string FNV implementation
vs
new helper/delegated implementation
```

must be compared independently over bounded representative samples and line-array delegation.

## Required repair

1. preserve this failure evidence;
2. split cumulative materialization into explicit `P1`, `P2`, `P3` stages in the builder;
3. verify S1 invariants against `P0 → P1`;
4. verify S2-1 invariants against `P1 → P2`;
5. verify S2-2 ownership against `P2 → P3`;
6. replace self-comparison FNV smoke with independent old-vs-new reference functions;
7. rerun the same PR-only dry lane;
8. only after PASS, delete the temporary candidate request and run final request-free exact-head CI.

## Safety

```text
candidate persistence = NONE
release-simcore mutation = NONE
production = v0.70.1 unchanged
broad live test = NOT STARTED
S7 authority = NOT CREATED
```
