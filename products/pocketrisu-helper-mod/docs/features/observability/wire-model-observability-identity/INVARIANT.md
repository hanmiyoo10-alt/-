# WIRE-MODEL-OBSERVABILITY-IDENTITY

## Status

`ADOPTED` invariant for PocketRisu request observability.

## Problem / evidence

Historical PocketRisu commit `764c62c903f0cc2d4d276dba2a3ec228733664e4` fixed request/generation metadata that could identify a preset display name or incomplete snapshot model field instead of the actual model id sent to the provider. Presets may be renamed after the fact, and some adapter profiles source the effective model id from user values.

## Minimal safe scope

Preserve a single resolved wire-model identity at request construction time and use it consistently in request logs and generation response metadata. This dossier does not authorize broader request-body logging or telemetry expansion.

## Ownership boundaries

- request/preset adapter resolution owns the effective wire model id;
- request logging consumes that resolved identity;
- generation result metadata consumes the same identity;
- credentials, prompt payloads, and unrelated user data remain outside this invariant.

## Mechanism

Resolve the effective model id using the same preset/adapter rule that determines transport behavior before request dispatch. Reuse that resolved value for diagnostic metadata. If resolution fails because configuration is broken, keep a best-effort identifying fallback so the failed request still has a useful log row; the fallback must not be treated as a successful resolution.

## Compatibility / invariants

1. Renaming a preset after a request must not change what model that historical request claims to have used.
2. Profiles whose model id lives in user values must log that effective id, not an empty snapshot field.
3. The same request should expose the same model identity across log and generation metadata surfaces.
4. No credential, authorization header, full prompt body, or secret is added to logs by this feature.
5. Existing PocketRisu save/integrity, DB flush, targeted V3 reload, runit, and server-phone notification guardrails are unaffected.

## Validation / acceptance

Regression tests should cover:

- preset display name differs from effective wire model id;
- effective model id comes from adapter/user values;
- returned generation metadata and request log agree on the wire model id;
- broken configuration still produces an identifying failure record without exposing secrets.

Acceptance: all diagnostic surfaces identify the same transport model and no logging surface broadens its data scope.

## Risk / blast radius

`LOW`. The behavior is metadata/diagnostics-oriented and already adopted. The main risk is accidental logging expansion or inconsistent identity across request paths.

## Rollback / fallback

If a refactor cannot resolve wire identity safely, keep the existing adopted request path rather than replacing it with preset-name logging. Any temporary fallback must remain explicitly diagnostic-only.

## Dependencies

`NONE` for preservation. Future adapter additions must expose enough information for the existing resolver to determine the actual wire model id.

## PR decomposition

No implementation PR is currently needed because the invariant is already present. If regression coverage is missing, a future isolated test-only PR may add the cases above without changing runtime behavior.

## Durable references

- Source: `PocketRisu/PocketRisu@764c62c903f0cc2d4d276dba2a3ec228733664e4`
- Risu-family ledger: `hanmiyoo10-alt/PocketRisu` branch `notes/external-risu-dev-watch`, `notes/idea-ledger-addenda/2026-08-30-2035.md`
- Backfill review: `notes/backfill-reviews/2026-08-30-2035-pocketrisu-wire-model-observability.md`
