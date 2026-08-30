# SimCore v0.70.0 Candidate PR Failure 01 — Validation Version Bridge

Date: 2026-08-30 KST

Classification: **FIX · VALIDATION_HARNESS_VERSION_BRIDGE · NON_RUNTIME · PRODUCTION_UNCHANGED**

Status: **OBSERVED · ROOT CAUSE PROVEN · REPAIR BOUNDED**

## Failed candidate-intent PR qualification

```text
PR = #932
intent = simcore-v0.70.0-intent-01
release = simcore-v0.70.0-new-01
PR head = 06f1e73f6c4a339366064b31b136f59b22ab8271
SimCore CI run = 33292141045
Verify job = 99205515009
profile = PR_MAIN
reason = PR1_DRY_QUALIFICATION_FAIL
```

The permanent verifier itself ran. Static, architecture, regression planning and CI-self gates passed. Final enforcement failed because the PR1 dry candidate qualification generated the v0.70.0 runtime and then routed it through a permanent exact-version wrapper that stopped at v0.69.2.

Exact first failure:

```text
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED: reload-cache-continuity:
reload continuity gate version 0.70.0
```

Bounded report facts:

```text
GATE_CI_SELF = PASS
GATE_PR1_DRY = FAIL / PR1_DRY_QUALIFICATION_FAIL
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
production = 2f7e6a55f89adb7a9b33f7306a47ca06a8baf18f
candidate persistence = NONE
production mutation = NONE
latest/install source digest equality = PASS
```

## Root cause

The permanent validation registry currently terminates several release-identity-sensitive chains at v0.69.2:

```text
reload-cache-continuity-v06902.test.mjs
operator-release-card-v06902.test.mjs
host-local-telemetry-v06902.test.mjs
bounded-telemetry-capsule-v06902.test.mjs
```

v0.70.0 changes Prompt task-authority semantics only. It does not alter reload transport, targeted-unload liveness, UI-card side effects, runtime telemetry ownership, bounded telemetry schema, M2-6 architecture or persistence. Therefore those frozen semantic contracts may inherit the v0.69.2 authorities through explicit v0.70 wrappers.

`HOST_COMPAT_VERSION` does advance to 0.70.0 as part of coherent runtime identity, so the Host-local exact-version control must test 0.70.0 directly and reject 0.69.2 rather than merely metadata-normalizing that executable contract.

The v0.70 builder suite is also permanent release evidence and must be registered as required/golden so future batch-a qualification cannot omit the exact Prompt compiler v4 contract.

## Authorized validation-only repair

1. Add `reload-cache-continuity-v07000.test.mjs`:
   - accept exact metadata 0.70.0;
   - normalize metadata only to 0.69.2;
   - delegate to frozen v0.69.2 reload authority.
2. Add `operator-release-card-v07000.test.mjs`:
   - verify the exact 0.70.0 card identity and side-effect-free/collapsed contract;
   - normalize metadata/card identity to 0.69.2 and delegate.
3. Add `host-local-telemetry-v07000.test.mjs`:
   - verify metadata/runtime/Host identity equality at 0.70.0;
   - preserve M2-6 ownership controls;
   - accept exact 0.70.0 Host-local capsule;
   - reject 0.69.2 capsule.
4. Add `bounded-telemetry-capsule-v07000.test.mjs`:
   - normalize metadata only to 0.69.2 and delegate.
5. Register `builder-v07000` as required/golden.
6. Route only the four exact-version-sensitive registry entries to the v0.70 wrappers.

## Frozen boundary

```text
plugins/simcore/latest.js = untouched
plugins/simcore/install.js = untouched
release-simcore = untouched
v0.70 builder semantics = untouched
candidate request content = untouched
release-system workflow semantics = untouched
```

## Disposition

```text
07000_PR932 = FAIL_CLOSED
07000_RUNTIME_IMPLEMENTATION = UNCHANGED
07000_VALIDATION_BRIDGES = FIX REQUIRED
07000_PRODUCTION = STILL_0.69.2
```
