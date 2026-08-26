# Feature-ID: plugin-security/per-permission-authorization

Status: **ADOPTED INVARIANT — PRESERVE**

## Problem / evidence

Historical PocketRisu-Alter commit `23b3784d1138590cbf6d560246dc1262ed1270e0` documents a concrete V3 plugin authorization failure mode: if permission state is keyed only by plugin name, granting one capability can silently authorize a different capability for the same plugin. Free-form plugin names also make delimiter/prefix key schemes collision-prone, and prefix-based reset can clear another plugin with an overlapping name.

Related hardening: `f757d6f63b1860491b69749cb11ccf0905949fed` serialized concurrent permission dialogs; `ff4fb0d344e0bee688a66ff9f27ec21ad19b5cf1` recomputed periodic reconfirm state under the serialization lock.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `HIGH`
- Dependencies: `NONE` for preservation
- Priority: `P0`
- Lifecycle: `ADOPTED`

## Ownership boundary

This invariant belongs to the V3 plugin permission/authorization layer. It must remain separate from plugin runtime reload behavior and from plugin custom-storage mutation semantics.

## Required mechanism / invariants

1. Authorization identity is the tuple `(pluginName, permissionDesc)` encoded without delimiter ambiguity.
2. Grant and deny caches never treat plugin-name-only state as authorization for a specific capability.
3. Reset of one plugin enumerates exact permission keys; it must not prefix-delete another plugin's state.
4. Legacy name-only entries may be removed during explicit reset, but must never be interpreted as a new tuple-key grant.
5. Periodic reconfirm timestamps use the same tuple identity.
6. Concurrent permission prompts are serialized and the resolved/reconfirm state is rechecked after acquiring the queue position.
7. Targeted V3 plugin reload remains preserved; this invariant does not justify broad/full reload changes.

## Current PocketRisu state

Verified on `hanmiyoo10-alt/PocketRisu` branch `notes/external-risu-dev-watch`, file `src/ts/plugins/apiV3/v3.svelte.ts`:

- `permissionKeyOf(pluginName, permissionDesc)` uses `JSON.stringify([pluginName, permissionDesc])`;
- grant/deny checks use that tuple key;
- `resetPluginPermission()` enumerates exact permission descriptions and separately clears the legacy name-only entry;
- periodic reconfirm timestamps use tuple keys;
- permission dialogs are serialized and rechecked under the lock.

No implementation branch or PR is needed from this backfill item.

## Validation / acceptance

Any future refactor touching V3 permission persistence must keep regression tests for:

- grant `fetchLogs` does not grant `db`;
- duplicate concurrent requests for the same permission coalesce to one decision;
- resetting plugin `foo` does not affect `foo_bar`;
- legacy plain key `foo_db` cannot authorize plugin `foo` permission `db`;
- periodic reconfirm bursts do not produce duplicate prompts after the first decision refreshes state.

## Risk / blast radius

Failure weakens the plugin capability boundary and can expose stronger APIs than the user granted. Treat regressions as security-sensitive and fail closed.

## Rollback / fallback

If a permission-store refactor cannot preserve tuple identity or exact reset semantics, revert the refactor and retain the current implementation. Do not fall back to name-only or concatenated-string authorization keys.

## Source handoff

Durable Risu-family backfill record: `hanmiyoo10-alt/PocketRisu@notes/external-risu-dev-watch:notes/backfill-reviews/2026-08-27-0537-pocketrisu-alter-plugin-permissions.md`.
