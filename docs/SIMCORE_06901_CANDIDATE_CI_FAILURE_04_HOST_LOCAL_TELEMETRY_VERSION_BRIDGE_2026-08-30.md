# SimCore v0.69.1 Candidate CI Failure 04 — Host-Local Telemetry Version Bridge

Date: 2026-08-30 KST
Classification: `FIX · VALIDATION_HARNESS_VERSION_BRIDGE · NON_RUNTIME · PRODUCTION_UNCHANGED`
Status: **OBSERVED · REPAIR BOUNDED**

Release request PR: `#894`

```text
SimCore CI run = 33284095636
Verify job     = 99184143870
bounded result = FAIL
reason         = PR1_DRY_QUALIFICATION_FAIL
```

Bounded report:

```text
GATE_CI_SELF    = PASS
GATE_STATIC     = PASS
GATE_ARCH       = PASS
GATE_REGRESSION = PASS
GATE_PR1_DRY    = FAIL
```

Exact failure:

```text
SUITE_ASSERTION_FAILED: host-local-telemetry:
Host-local key appeared before v0.64.10
```

## Diagnosis

The permanent registry still routes Host-local telemetry through `host-local-telemetry-v06900.test.mjs`. That suite handles exact metadata `0.69.0`; a generated v0.69.1 source falls through the historical wrapper chain and is misclassified as predating Host-local telemetry.

v0.69.1 intentionally bumps runtime compatibility identity together:

```text
userscript metadata       = 0.69.1
SIMCORE_RUNTIME_VERSION   = 0.69.1
HOST_COMPAT_VERSION       = 0.69.1
```

Host-local telemetry schema is unchanged. Exact 0.69.1 capsules must be compatible, while previous 0.69.0 capsules must fail closed as incompatible. The targeted UNLOAD repair does not retire Host-local telemetry from the authoritative OUTPUT_COMMIT path.

## Bounded repair

Validation-only repair must:

1. add an exact v0.69.1 Host-local telemetry suite;
2. assert metadata/runtime/HOST identity all equal `0.69.1`;
3. preserve Recovery retirement, State Reconcile ownership, Kernel zero-upward-edge state and existing owner wiring;
4. prove an exact `sourceVersion: 0.69.1` Host-local capsule is accepted/consumed;
5. prove a previous `sourceVersion: 0.69.0` capsule is rejected as incompatible;
6. route the permanent registry through the v0.69.1 suite;
7. modify no runtime candidate bytes.

Any later release-sensitive failure must be preserved separately before repair.

```text
RUNTIME CHANGE        = NONE
RELEASE SYSTEM CHANGE = NONE
RELEASE_SIMCORE WRITE = NONE
PRODUCTION VERSION    = 0.69.0
PRODUCTION COMMIT     = 31b4c5075659a55861731c6fd73f999402321e94
```
