# REQUEST-WIRE-MODEL-OBSERVABILITY

Status: `ADOPTED`

## Problem / evidence

A model preset has at least three identities that can diverge: a mutable display name, snapshot/profile fields, and the final provider-facing model identifier after adapter/user-value resolution. Logging or returning the wrong one makes request diagnostics misleading exactly when presets are renamed or provider model selection is configured through user values.

Official PocketRisu commit `764c62c903f0cc2d4d276dba2a3ec228733664e4` fixes this by resolving `resolveWireModelId(preset)` once and propagating that effective identity through request logs and generation result metadata.

## Invariant

Request observability MUST identify the effective provider-facing model selected by the same resolver used by request execution. UI aliases and incomplete pre-resolution fields are not authoritative request identity.

Observability MUST NOT expand into logging credentials, authorization headers, secrets, or arbitrary prompt/request bodies.

If effective-model resolution fails because configuration is already invalid, a non-secret diagnostic fallback may identify the failed entry, but that fallback must not be treated as a successful wire identity.

## Minimal safe scope

Preserve the existing authoritative resolver and reuse its result across log creation, generation metadata, preview, success, streaming, and failure result paths. Do not duplicate model-resolution logic in observers.

## Ownership boundaries

- preset/adapter layer owns effective provider model resolution;
- request execution consumes that resolved identity;
- logging/generation metadata observe it but do not redefine it;
- UI display names remain presentation metadata only.

## Compatibility / acceptance

Validate at least:

1. model ID sourced from adapter user values;
2. preset renamed after creation;
3. preview request;
4. normal success;
5. streaming success;
6. pre-stream/request failure;
7. broken configuration fallback;
8. no credential/token material added to logs.

## Risk / rollback

Risk is low because this is metadata/diagnostic identity, but incorrect logging can materially slow debugging. Rollback is a straightforward revert to prior metadata plumbing; request execution itself must remain unaffected.

## Dependencies / PR decomposition

Dependencies: none for preserving the invariant. Future adapter additions should land their authoritative model resolver first, then consume that same result in observability within the same bounded adapter/request change.