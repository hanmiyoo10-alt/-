# REQUEST-OBSERVABILITY-USES-EFFECTIVE-WIRE-MODEL-ID

## Status

`ADOPTED` invariant observed in official PocketRisu.

## Problem / evidence

A preset has multiple identities: a mutable display name, a profile snapshot default model id, and the effective provider-facing model id after user values/routing are resolved. Official PocketRisu commit `764c62c903f0cc2d4d276dba2a3ec228733664e4` fixed request observability so the effective wire model id is resolved once and reused across request logs, generation/job metadata, preview, tool-loop, streaming/non-streaming result, and failure paths. The invariant remains present on develop `278251f85a19bfdfd4cf3faae780e62682878f9e`.

## Invariant

Observability and generation provenance MUST report the effective provider-facing model identity selected for the request. They MUST NOT substitute a mutable preset display name or an incomplete profile default when routing selected a different/user-valued model id.

## Ownership boundary

- model/preset routing owns resolution of the effective wire model id;
- request observability consumes that resolved identity;
- logging must not independently guess or re-resolve model identity from a different field;
- credential material remains outside this diagnostic identity.

## Compatibility / acceptance

Preserve identical effective-model attribution for:

1. user-valued model ids;
2. renamed/edited presets;
3. preview requests;
4. tool-loop requests;
5. streaming and non-streaming results;
6. request failures;
7. malformed configuration fallback, without leaking credentials.

## Risk / rollback

Risk is low because this is diagnostic/provenance metadata, but wrong attribution can mislead incident diagnosis. If model resolution itself fails, retain a safe identifying fallback rather than changing request behavior. A rollback should affect only observability identity, never provider routing.

## Source

- `PocketRisu/PocketRisu@764c62c903f0cc2d4d276dba2a3ec228733664e4`
- preserved on `PocketRisu/PocketRisu:develop@278251f85a19bfdfd4cf3faae780e62682878f9e`
