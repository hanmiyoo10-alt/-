# SimCore v0.69.1 Candidate CI Failure 01 — Reload Version Bridge

Date: 2026-08-30 KST
Classification: `FIX · VALIDATION_HARNESS_VERSION_BRIDGE · NON_RUNTIME · PRODUCTION_UNCHANGED`
Status: **OBSERVED · REPAIR BOUNDED**

## Failed candidate-request qualification

Release request PR: `#887`

```text
SimCore CI run = 33283733710
Verify job     = 99183177294
bounded result = FAIL
reason         = PR1_DRY_QUALIFICATION_FAIL
```

The bounded CI report recorded:

```text
GATE_CI_SELF    = PASS
GATE_STATIC     = PASS
GATE_ARCH       = PASS
GATE_REGRESSION = PASS
GATE_PR1_DRY    = FAIL
```

Exact dry-candidate failure:

```text
SUITE_ASSERTION_FAILED: reload-cache-continuity:
reload continuity gate version 0.69.1
```

## Diagnosis

The permanent registry still routes reload continuity through `reload-cache-continuity-v06900.test.mjs`.
That wrapper accepts exact metadata `0.69.0`, normalizes only that release metadata to `0.68.0`, and delegates to the frozen v0.68 continuity authority.

The v0.69.1 patch changes targeted UNLOAD transport/ordering only. It does not change reload capsule schema, session transport, OUTPUT_COMMIT durable publication, state schema, or reload continuity semantics.

Therefore a generated v0.69.1 candidate falls through the v0.69 wrapper into older exact-version gates and is rejected by release identity, not by runtime semantics.

## Bounded repair

Authorized repair is validation-only:

1. add exact v0.69.1 reload continuity wrapper;
2. for metadata `0.69.1` only, normalize userscript metadata to `0.69.0`;
3. delegate to the frozen v0.69 wrapper;
4. do not rewrite runtime/HOST identity or runtime code;
5. route the permanent registry through the v0.69.1 wrapper;
6. rerun permanent CI and candidate dry qualification.

Any subsequent version-sensitive failure must be preserved separately before repair.

## Authority / impact

```text
RUNTIME CHANGE        = NONE
RELEASE SYSTEM CHANGE = NONE
RELEASE_SIMCORE WRITE = NONE
PRODUCTION VERSION    = 0.69.0
PRODUCTION COMMIT     = 31b4c5075659a55861731c6fd73f999402321e94
```
