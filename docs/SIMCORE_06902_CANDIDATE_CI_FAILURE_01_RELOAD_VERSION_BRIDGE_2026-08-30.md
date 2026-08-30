# SimCore v0.69.2 Candidate CI Failure 01 — Reload Version Bridge

Date: 2026-08-30 KST

Classification: **FIX · VALIDATION_HARNESS_VERSION_BRIDGE · NON_RUNTIME · PRODUCTION_UNCHANGED**

Status: **OBSERVED · ROOT CAUSE PROVEN · REPAIR BOUNDED**

## Failed candidate materialization

Candidate request:

```text
intent = simcore-v0.69.2-intent-01
release = simcore-v0.69.2-new-01
request commit = de32bb5302b6ffb94c83d9e092d066f4d893c72c
workflow = SimCore Generic Candidate Materialize
run = 33288751184
job = 99196521364
```

The request boundary, exact production observation and coordination-bypass contract all passed. Candidate materialization then failed during permanent `batch-a` regression before a candidate receipt/spec could be persisted.

Exact failure:

```text
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED: reload-cache-continuity:
reload continuity gate version 0.69.2
```

## Root cause

The permanent registry currently routes reload continuity through:

```text
products/simcore/tests/suites/reload-cache-continuity-v06901.test.mjs
```

That wrapper accepts exact metadata `0.69.1`; any other version delegates to the older v0.69.0/legacy authorities. A generated `0.69.2` candidate therefore falls through and is rejected by an older exact-version gate.

v0.69.2 does not change reload telemetry semantics, targeted-unload liveness semantics, OUTPUT_COMMIT durability, Host-local adoption policy, or storage schema. Its runtime change is only the bounded Community `맘스홀릭` alias.

The correct repair is therefore validation-only:

1. add `reload-cache-continuity-v06902.test.mjs`;
2. accept exact `0.69.2` metadata only;
3. normalize only the userscript metadata line to `0.69.1`;
4. delegate to the frozen v0.69.1 reload authority;
5. route the permanent registry through the v0.69.2 wrapper;
6. do not rewrite runtime/HOST identity or runtime behavior.

## Additional permanent-coverage readback

During the root-cause readback, the newly added `builder-v06902.test.mjs` was found present on main but not yet registered in `products/simcore/tests/registry.mjs`.

Classification:

```text
06902_BUILDER_SUITE_REGISTRY_OMISSION
= FIX
= VALIDATION COVERAGE ONLY
= RUNTIME EFFECT NONE
= PRODUCTION EFFECT NONE
```

The same validation-only repair PR must register `builder-v06902` as required/golden so future permanent CI cannot silently omit the v0.69.2 builder contract.

## Production safety

The candidate workflow failed before candidate persistence or publish. `release-simcore` remains the exact parent production:

```text
version = 0.69.1
commit = 5dc5ec1099c6097a6a0e46effeb826889a4741c3
latest/install blob = de764f2c98174aa7f8ae8dc356d83aa6851b3745
production mutation = NONE
```

## Disposition

```text
06902_CANDIDATE_01 = FAIL_CLOSED
06902_RUNTIME_ALIAS_IMPLEMENTATION = UNCHANGED
06902_VALIDATION_BRIDGE = FIX REQUIRED
06902_BUILDER_REGISTRY = FIX REQUIRED
07000_PROMPT_WORK = SEPARATE
```
