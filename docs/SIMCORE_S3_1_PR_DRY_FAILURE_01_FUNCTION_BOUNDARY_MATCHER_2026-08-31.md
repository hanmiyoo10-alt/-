# SimCore S3-1 PR Dry Failure 01: Function Boundary Matcher False Duplicate

Date: 2026-08-31 KST
Status: **FIX · BUILDER-ONLY VALIDATION DEFECT · PRODUCTION UNCHANGED**
Classification: **POST-M2 SIMPLIFICATION / S3-1 / PR-DRY BUILDER HARNESS**

## Trigger

PR #1031 staged the cumulative S3-1 internal checkpoint with temporary PR-only request:

```text
intent = simcore-v0.70.3-intent-04
head = d4bb67d2a59565d91f4e68b7d294de1930476544
SimCore CI run = 33360352609
Verify job = 99390361911
profile = PR_MAIN
```

The verifier planned and exercised:

```text
GATE_CI_SELF
GATE_PR1_DRY
GATE_STATIC
GATE_ARCH
GATE_REGRESSION
```

Results:

```text
GATE_CI_SELF    = PASS
GATE_PR1_DRY    = FAIL
GATE_STATIC     = PASS
GATE_ARCH       = PASS
GATE_REGRESSION = PASS
candidateCommit = null
```

Overall reason:

```text
PR1_DRY_QUALIFICATION_FAIL
```

## Exact failure

The cumulative builder aborted during its own protected-function comparison:

```text
S3_1_FUNCTION_BOUNDARY_INVALID: getHostLocalTelemetryStoreOnce starts=[5900, 5894]
```

The builder attempted to find a function by independently searching both:

```text
function getHostLocalTelemetryStoreOnce(
async function getHostLocalTelemetryStoreOnce(
```

Because the first token is a substring of the second token, the same actual async function was counted twice at two overlapping offsets.

## Classification

```text
FIX · S3_1_BUILDER_FUNCTION_BOUNDARY_MATCHER
```

This is not a runtime-semantic failure. Static, architecture and regression gates all passed, and no candidate was persisted.

## Repair boundary

Repair only the builder's local function-boundary matcher:

```text
- use one anchored regex for optional `async`
- require exactly one top-level function declaration match
- preserve all cumulative P0 -> P5 transforms unchanged
- preserve the S3-1 runtime delta unchanged
- preserve all Host-local / telemetry semantics unchanged
```

Do not broaden S3-1 runtime scope to fix the harness.

## Safety state

```text
release-simcore = v0.70.1 unchanged
production commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
candidate persistence = NONE
S7 publication authority = NONE
broad real-long-chat = NOT STARTED
v0.70.2 cache program = PARKED / PRESERVED
```

## Recovery path

```text
1. preserve this finding
2. repair only builder function matching
3. rerun the same intent-04 PR dry
4. require GATE_PR1_DRY plus CI_SELF/STATIC/ARCH/REGRESSION PASS
5. delete temporary intent-04
6. run request-free exact-head substantive CI
7. merge S3-1 only after that pass
```
