# SimCore v0.64.7 — Telemetry Checkpoint Diagnostic Surface Gap

Date: 2026-08-27
Classification: **WATCH / DIAGNOSTIC_SURFACE_GAP / NON_RUNTIME_SEMANTICS / NON_BLOCKING**
Related live gate: `06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT`
Production: `v0.64.7 — Cross-Reload Cache Observer Continuity`

## Finding

The frozen v0.64.7 activation design specifies a bounded checkpoint diagnostic surface such as:

```text
Telemetry checkpoint: SESSION · WRITTEN · <chars> · <ms>
```

or a bounded skip/unavailable reason.

The released v0.64.7 runtime does implement the session telemetry transport and retains a bounded internal write probe:

```text
SESSION_KEY = __SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__
MAX_SESSION_CHARS = 16384
lastWriteProbe = { memory, session, serializedChars, maxSessionChars, retainedBodies: false }
```

However the current `SimCore Last Turn Diagnostic` report emits `Telemetry continuity` but does not emit the checkpoint write probe as a dedicated line.

Observed user-supplied diagnostics therefore expose:

```text
Telemetry continuity: FRESH · no-compatible-handoff
```

without a corresponding pre-boundary checkpoint status.

## Impact

```text
runtime cache-observer transport correctness: NOT PROVEN BROKEN
Core request/output semantics: NO IMPACT OBSERVED
release-simcore identity: UNCHANGED
provider-cache claim: UNVERIFIED (correct)
live-gate ergonomics/observability: DEGRADED
```

This gap makes activation step B — confirming the pre-boundary telemetry checkpoint — harder to prove directly from the standard copied diagnostic.

It does **not** justify changing v0.64.7 during the current live gate. A successful first post-boundary diagnostic showing:

```text
Telemetry continuity: ADOPTED · via SESSION/GLOBAL ...
```

would itself provide strong end-to-end evidence that a compatible pre-boundary capsule existed and was claimed.

## Disposition

```text
WATCH
```

Do not classify as FIX unless either:

1. the absence of the checkpoint surface prevents a required live-gate decision after the actual boundary experiment, or
2. post-boundary evidence shows the session/global handoff itself failed despite a separately confirmed valid checkpoint.

Do not mix a diagnostic-surface enhancement into the current production validation unless new evidence requires a repair release.

## Cross references

- `docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md`
- `docs/SIMCORE_06407_IMPLEMENTATION_EVIDENCE.md`
- `docs/SIMCORE_LIVE_06407_VALIDATION_2026-08-27.md`
- `release-simcore/plugins/simcore/latest.js`
