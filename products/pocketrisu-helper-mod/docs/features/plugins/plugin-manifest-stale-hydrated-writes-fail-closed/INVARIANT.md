# PLUGIN-MANIFEST-STALE-HYDRATED-WRITES-FAIL-CLOSED

Status: `ADOPTED`
Source: `PocketRisu/PocketRisu@856807a25b3145c59845713a0631a5e2fa22f309`

## Invariant

A Plugin V2-compatible hydrated character/module asset list may replace or inline a manifest-backed list only when its hydration ownership still matches the current manifest revision, or when it is the explicitly supported in-place live-object write-back case. If the hydration revision is older than the current manifest revision, preserve the newer stored manifest and discard the stale list write.

## Ownership boundary

- Manifest revision/descriptor owns durable externalized asset-list identity.
- Hydrated array owns only the revision it was materialized from.
- V2 live DB in-place edits remain a separately recognized compatibility path.
- Never-hydrated lazy shapes do not acquire replacement authority merely by resembling a hydrated object.

## Acceptance

- old-revision hydrated snapshot cannot replace a newer manifest-backed list;
- same-revision hydrated write remains valid;
- never-hydrated lazy write remains fail-closed;
- in-place edit through the live V2 DB proxy survives correct write-back resolution;
- character and module asset paths follow the same ownership rule.

## Risk / rollback

Risk is contained to plugin asset compatibility, but a wrong rule can either roll back newer assets or silently discard legitimate edits. Roll back only by reverting the specific ownership-resolution change; do not disable manifest revision checks globally.

## Guardrails

No forced DB flush on lifecycle events, no `flushServerDbKeepalive()` change, no PM2, no server-phone notifications, no system/runtime migration, and no broad V3 reload change.
