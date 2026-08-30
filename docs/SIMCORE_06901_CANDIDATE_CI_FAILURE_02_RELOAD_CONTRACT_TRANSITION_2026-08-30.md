# SimCore v0.69.1 Candidate CI Failure 02 — Reload Contract Transition

Date: 2026-08-30 KST
Classification: `FIX · VALIDATION_CONTRACT_DRIFT · NON_RUNTIME · PRODUCTION_UNCHANGED`
Status: **OBSERVED · REPAIR BOUNDED**

## Failed candidate-request qualification

Release request PR: `#889`

```text
SimCore CI run = 33283845005
Verify job     = 99183475280
Required job   = 99183517994
bounded result = FAIL
reason         = PR1_DRY_QUALIFICATION_FAIL
```

Bounded CI report:

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
UNLOAD checkpoint redundancy missing
```

## Diagnosis

The historical base reload-continuity suite freezes the v0.64.8-era requirement that the `UNLOAD` checkpoint occur before hook removal and that the checkpoint retain the same durable redundancy semantics as `OUTPUT_COMMIT`.

v0.69.1 intentionally changes only this ownership boundary:

```text
OUTPUT_COMMIT = awaited durable Host-local-capable publication remains authoritative
UNLOAD        = hooks/UI retire first, then existing local-only memory/session publication
```

Therefore the old assertion is no longer a valid invariant for exact v0.69.1. The failure is expected contract drift caused by the authorized correctness repair, not evidence of a reload/cache runtime regression.

## Bounded repair

Validation-only repair must:

1. make the exact v0.69.1 reload suite assert the new targeted-unload contract natively;
2. prove hook removal and UI unregister precede the UNLOAD checkpoint;
3. prove the exact UNLOAD branch uses local `runtimeTelemetryRules.publish(...)` and does not use Host-local transport;
4. prove `OUTPUT_COMMIT` still uses `publishWithHostLocal(...)` and remains the durable authority;
5. preserve all unrelated historical reload/session/root/age/size controls by delegating to the frozen v0.69 chain after constructing a test-only compatibility projection of only the intentionally changed UNLOAD seam;
6. modify no runtime candidate bytes.

Any later version-sensitive validation failure must be preserved separately before repair.

## Authority / impact

```text
RUNTIME CHANGE        = NONE
RELEASE SYSTEM CHANGE = NONE
RELEASE_SIMCORE WRITE = NONE
PRODUCTION VERSION    = 0.69.0
PRODUCTION COMMIT     = 31b4c5075659a55861731c6fd73f999402321e94
```
