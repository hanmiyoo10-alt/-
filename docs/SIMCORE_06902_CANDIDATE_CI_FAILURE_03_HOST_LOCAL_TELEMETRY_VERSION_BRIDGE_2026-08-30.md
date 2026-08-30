# SimCore v0.69.2 Candidate CI Failure 03

Date: 2026-08-30
Classification: FIX
Scope: validation-only version bridge
Production mutation: NONE

## Observed failure

Fresh candidate intent `simcore-v0.69.2-intent-03` reached immutable candidate materialization against exact production commit `5dc5ec1099c6097a6a0e46effeb826889a4741c3` and failed inside permanent regression validation before candidate receipt/spec persistence.

Exact failure:

```text
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED: host-local-telemetry: Host-local key appeared before v0.64.10
```

## Diagnosis

The v0.69.2 runtime candidate was not rejected for the MamsHolic alias change. The registered Host-local suite still routed non-0.69.1 metadata to older version authority, so the new patch-version identity was interpreted as historical pre-Host-local source.

## Repair

Add a v0.69.2 Host-local semantic wrapper which first verifies real v0.69.2 metadata/runtime/HOST_COMPAT identity, exact v0.69.2 capsule consumption, and v0.69.1 cross-version rejection, then delegates frozen v0.69.1 owner-contract assertions through metadata-only normalization. Route the permanent registry to that wrapper.

## Safety

No `release-simcore` write occurred. Candidate receipt/spec persistence was skipped. Runtime/Community/Prompt/schema/M2/release-system behavior was not changed by the validation repair.

PR #919 passed SimCore CI and was merged before the next fresh candidate attempt.
