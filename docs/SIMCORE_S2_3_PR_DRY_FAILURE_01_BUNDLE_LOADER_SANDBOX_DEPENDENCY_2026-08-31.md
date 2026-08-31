# SimCore S2-3 PR Dry Failure 01: Bundle Loader Sandbox Dependency

Date: 2026-08-31 KST
Status: **FIX · BUILDER / PR-DRY SANDBOX DEPENDENCY · PRODUCTION UNCHANGED**

Classification:

```text
FIX · CUMULATIVE_BUILDER_SANDBOX_DEPENDENCY
```

## Trigger

PR #1022 temporary PR-only dry request:

```text
intent = simcore-v0.70.3-intent-03
head = 41ba26855a6f196f2b77f032cc6297ff48d83855
SimCore CI run = 33330671453
Verify job = 99308541950
```

The request existed only to exercise `GATE_PR1_DRY`. No candidate was persisted and `release-simcore` was not mutated.

## Exact gate result

```text
GATE_CI_SELF    = PASS
GATE_PR1_DRY    = FAIL
GATE_STATIC     = PASS
GATE_ARCH       = PASS
GATE_REGRESSION = PASS
```

Overall reason:

```text
PR1_DRY_QUALIFICATION_FAIL
```

Production identity resolved by the run:

```text
release-simcore commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
production version = 0.70.1
```

The trusted-base production health lane passed its full baseline including static, architecture, regression, state, coordination and legacy compatibility.

## Exact failure

The cumulative builder reached its final local module-load smoke and attempted to import repository tooling from the PR1 dry candidate sandbox:

```text
S2_3_MODULE_LOAD_FAIL
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'/tmp/simcore-candidate-fH5qj6/worktree/products/simcore/tooling/bundle-loader.mjs'
imported from /tmp/simcore-candidate-fH5qj6/worktree/[eval1]
```

The failing builder command was:

```text
python3 /tmp/simcore-candidate-fH5qj6/build-s2-3-runtime-utility-dead-exports.py
```

## Root cause

`GATE_PR1_DRY` copies the selected builder into an isolated candidate sandbox. The builder is therefore required to be self-contained with respect to repository tooling files that are not explicitly materialized into that sandbox.

The S2-3 builder violated that rule only in `verify_module_loading()` by importing:

```text
./products/simcore/tooling/bundle-loader.mjs
```

The path exists in the repository, but not in the isolated PR1 dry worktree shape available to the builder.

This is a builder validation-environment dependency defect. It is **not** evidence that the six proposed dead-export retirements break the runtime. Static, architecture and regression gates all passed before the local smoke rejected the missing tooling dependency.

## Repair boundary

The runtime delta remains frozen:

```text
runtime-cache exports removed only:
  promptChangeReason
  buildRuntimePromptCacheProbe
  runtimeLineTier
  runtimeIdentity

runtime-topology exports removed only:
  exactHash
  leadingSystemCount
```

Underlying helper bodies and internal callers remain unchanged.

Repair only the builder validation mechanism:

1. remove the external `bundle-loader.mjs` dependency from PR-dry execution;
2. make module-factory smoke self-contained inside the builder, preferably by embedding only the minimal loader/evaluation logic needed for `runtime-cache`, `runtime-topology`, and `session`;
3. retain structural checks for exact `P3 → P4` ownership;
4. rerun the same `intent-03` PR dry;
5. if PASS, delete the temporary request and run final request-free exact-head CI before merge.

## Safety state

```text
candidate persistence = NONE
release-simcore mutation = NONE
production = v0.70.1 unchanged
S7 authority = NOT CREATED
broad real-long-chat = NOT STARTED
```
