# SimCore v0.69.2 Candidate CI Failure 03 — Host-Local Telemetry Version Bridge

Date: 2026-08-30 KST

Classification: **FIX · VALIDATION_HARNESS_VERSION_BRIDGE · NON_RUNTIME · PRODUCTION_UNCHANGED**

Status: **OBSERVED · ROOT CAUSE PROVEN · REPAIR BOUNDED**

## Failed candidate materialization

```text
intent = simcore-v0.69.2-intent-03
release = simcore-v0.69.2-new-03
request commit = 7c4569bf5b0f1e19caa37937c93f4800e3660fd5
workflow run = 33289147045
job = 99197576675
```

Request parsing, exact production-parent observation, and coordination bypass passed. Candidate regression then failed before receipt/spec persistence.

Exact failure:

```text
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED: host-local-telemetry:
Host-local key appeared before v0.64.10
```

## Root cause

The permanent registry still routes Host-local telemetry through:

```text
products/simcore/tests/suites/host-local-telemetry-v06901.test.mjs
```

That wrapper accepts exact metadata `0.69.1`; a generated `0.69.2` candidate falls through to older version authorities and is misclassified as pre-Host-local.

v0.69.2 intentionally changes release/runtime/HOST compatibility identity to `0.69.2`, while Host-local transport semantics remain unchanged from v0.69.1. Because `HOST_COMPAT_VERSION` advances with the release, the correct v0.69.2 contract is:

```text
metadata = runtime = HOST_COMPAT = 0.69.2
0.69.2 capsule -> CONSUMED
0.69.1 capsule -> INCOMPATIBLE
```

The repair must therefore be a dedicated exact-version semantic wrapper, not a runtime patch.

## Bounded repair

1. add `host-local-telemetry-v06902.test.mjs`;
2. preserve the v0.69.1 frozen owner/architecture assertions;
3. assert real `0.69.2` metadata/runtime/HOST identity equality;
4. assert exact 0.69.2 Host-local capsule is accepted;
5. assert 0.69.1 capsule is rejected as cross-version incompatible;
6. route only the permanent registry entry to the new wrapper.

No runtime, Community, Prompt, schema, M2 architecture, or release-system behavior may change.

## Production safety

```text
candidate receipt/spec = NOT PERSISTED
release-simcore mutation = NONE
production = v0.69.1 unchanged
production commit = 5dc5ec1099c6097a6a0e46effeb826889a4741c3
```

## Disposition

```text
06902_CANDIDATE_03 = FAIL_CLOSED
06902_RUNTIME_ALIAS_IMPLEMENTATION = UNCHANGED
06902_HOST_LOCAL_VERSION_BRIDGE = FIX REQUIRED
07000_PROMPT_WORK = SEPARATE
```
