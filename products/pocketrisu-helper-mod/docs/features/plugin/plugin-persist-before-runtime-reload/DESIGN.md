# PLUGIN-PERSIST-BEFORE-RUNTIME-RELOAD

Status: `READY_TO_PORT`

## Problem / evidence

Historical source `nevaeh5379/Risuai@3b5b3d39425a6297e8ea8a634e6d957e17c7b771` documents and regression-tests a plugin update race: an in-memory plugin update could be reloaded into the current runtime before the underlying settings write committed, so it worked in-session but reverted after application reload.

Direct inspection of `hanmiyoo10-alt/PocketRisu:develop` finds the same ordering hazard in `src/ts/plugins/plugins.svelte.ts`: after mutating `db.plugins`, it calls `setDatabaseLite(db)`, then `void requestImmediateSave()`, then immediately enters either targeted `reloadV3Plugin(pluginData)` or general `loadPlugins()`.

`requestImmediateSave()` already exposes the correct durable ownership boundary: it awaits `triggerSave()`, which awaits `persistTrackedChanges(...)`. The issue is that the plugin caller discards that promise.

## Minimal safe scope

One isolated ordering slice in plugin import/update:

- keep existing plugin mutation and `setDatabaseLite(db)` behavior;
- replace fire-and-forget immediate-save invocation with an awaited immediate-save boundary;
- only after that promise completes, retain the existing reload branch exactly:
  - V3→V3 update: targeted `reloadV3Plugin(pluginData)`;
  - otherwise: existing `loadPlugins()` path.

No storage format, plugin schema, runtime API, service/runtime package, or device change.

## Ownership boundaries

- Plugin import/update owns the mutation intent and runtime reload request.
- Existing PocketRisu save pipeline owns durable persistence and conflict/retry behavior.
- V3 runtime owner retains targeted reload semantics.
- This feature only imposes a happens-before edge: durable save completion before runtime reload.

## Mechanism

Use the existing awaited `requestImmediateSave()` promise rather than adding a second flush API or custom storage write. This keeps persistence inside the canonical PocketRisu save pipeline and avoids bypassing ETag/patch/full-write/retry behavior.

## Compatibility / invariants

Must preserve:

- targeted V3 reload for V3→V3 updates;
- current save/integrity optimizations;
- no forced DB flush on `visibilitychange` or `pagehide`;
- `flushServerDbKeepalive()` remains no-op unless separately reviewed;
- no PM2 or device/runtime changes;
- plugin update name/version validation and current hot-reload rules;
- no unrelated plugin cleanup in the same PR.

A failed durable save must not be silently converted into an apparent successful durable plugin update.

## Validation / acceptance

Focused tests should prove:

1. a V3 plugin update awaits the immediate-save promise before invoking targeted `reloadV3Plugin`;
2. the non-targeted/general path also waits before `loadPlugins`;
3. persisted plugin version/script seen by the save owner match the update before reload starts;
4. a rejected/failed immediate save does not proceed as though durable persistence succeeded;
5. existing V3 targeted reload tests remain green;
6. project type/check suite and `git diff --check` pass.

Acceptance: observable ordering is `plugin mutation -> canonical save completes -> existing runtime reload`, with no save architecture or reload-scope change.

## Risk / blast radius

Risk: `LOW`. The change is a local sequencing correction using an existing promise boundary. Potential behavioral difference is that plugin import/update UI waits for persistence latency before reload; that latency is intentional because durability is part of successful update semantics.

Blast radius is plugin import/update only.

## Rollback / fallback

Single-commit revert restores prior ordering. No migration or persistent format change is introduced.

## Dependencies

`NONE` for code architecture. Execution requires a clean checkout capable of running focused tests/checks.

## PR decomposition

One feature / one PR:

1. add ordering regression test(s);
2. await the existing immediate-save boundary in plugin import/update;
3. run focused plugin/save tests plus project checks.

Do not combine unrelated plugin refactors.

## Current automation progression

Classification gates are satisfied: `NO_SYSTEM_UPDATE`, `P0`, `Evidence HIGH`, `Risk LOW`, `Dependencies NONE`, `Size XS`, `READY_TO_PORT`.

Implementation was not performed in the 2026-08-31 run because the execution environment could not resolve `github.com` for a clean local checkout/test run. Per project policy, no unverified production code branch/PR was created. This is an integration/runtime network blocker, separate from code or CI status.
