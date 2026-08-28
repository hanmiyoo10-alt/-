# Feature-ID: MODULE-BOUNDED-ASSET-EDITOR

Status: `READY_TO_PORT`

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle status: `READY_TO_PORT`

## Problem / evidence

Large module asset sets can turn the module settings screen into an unbounded rendering and preview-resolution workload. Current PocketRisu `main` iterates the entire `currentModule.assets` array and, when previews are enabled, calls `getFileSrc()` for every asset as soon as the component effect runs. `rpaddict/RisuBard@769c611cc3574e6b0277e944afa1ffaaf99c100d` independently fixed this failure class by showing a bounded first page, resolving previews only for visible assets, deduplicating in-flight preview requests, and using lazy/bounded media loading. Earlier Risu-family evidence exists in `nevaeh5379/Risuai@58b980ca` for bounded asset/file list rendering and thumbnail requests.

## Minimal safe scope

Change only the module additional-assets editor in `src/lib/Setting/Pages/Module/ModuleMenu.svelte`.

- Render a fixed initial page of module assets.
- Resolve previews only for currently visible rows and only while the additional-assets submenu is active.
- Deduplicate in-flight preview resolution by stable asset key/path.
- Add an explicit load-more control that expands the visible prefix in fixed-size increments.
- Use lazy image loading and metadata-only preload for audio/video previews.
- Reset the visible count when entering or changing the module asset editor as needed to avoid stale pagination state.

Do **not** include legacy module import batching in this PR. That path has separate memory/concurrency ownership and needs its own measurement/design if pursued.

## Ownership boundaries

- Browser/client UI only.
- No server changes.
- No DB/storage format changes.
- No Android notification/service/runtime work.
- No asset deletion/cleanup semantics change.
- No Asset Viewer redesign.

## Mechanism

Use a bounded `visibleAssetCount` and derive `currentModule.assets.slice(0, visibleAssetCount)` for both row rendering and preview resolution. Key preview state by stable asset storage path rather than transient row index so loading results cannot attach to the wrong item after edits/reordering. Maintain a small in-flight key set so repeated reactive passes do not duplicate `getFileSrc()` work. The load-more action increases only `visibleAssetCount`; it does not mutate the underlying asset array.

## Compatibility / invariants

- Existing add/edit/delete behavior must address the correct underlying asset after pagination.
- Existing asset names, storage paths, extension metadata, and order must be preserved.
- `useAdditionalAssetsPreview=false` must continue to avoid preview resolution.
- Preview resolution must not run while the additional-assets submenu is inactive.
- Existing Asset Viewer behavior remains unchanged.
- No full DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains a no-op.
- Preserve current save/integrity optimizations and targeted V3 plugin reload.
- Keep runit; no PM2.
- Server phone creates no Android notifications.

## Validation / acceptance

1. Focused regression test or source-connection test proves the editor renders only the bounded visible prefix for a module with many assets.
2. Preview resolution is invoked only for visible assets and does not issue duplicate in-flight requests for the same storage path.
3. Load-more expands by one bounded page and preserves asset order.
4. Editing/deleting a visible row mutates the intended underlying asset, including after one or more load-more operations.
5. Images use lazy loading; audio/video use metadata-bounded preload.
6. `useAdditionalAssetsPreview=false` produces zero preview resolutions.
7. Run the relevant focused tests and project `pnpm check` (or the current repository equivalent) in a clean checkout.

## Risk / blast radius

Low. The change is isolated to one settings surface and is easy to revert. Main risks are row/index mismatches after pagination, stale preview attachment, and reactive duplicate loads. No persistent schema or destructive data path is involved.

## Rollback / fallback

Revert the single feature PR. The fallback is the existing unbounded module asset editor; no migration or cleanup is required.

## Dependencies

None for implementation. An executable clean checkout is required operationally before source modification so focused tests/checks can run.

## PR decomposition

One feature, one branch, one PR:

1. Add focused failing regression(s) for bounded rendering/preview resolution.
2. Implement visible-prefix pagination and path-keyed in-flight preview dedupe.
3. Add lazy/bounded media attributes and load-more behavior.
4. Run focused tests and project checks.

Do not mix legacy module import batching, unrelated UI cleanup, or Asset Viewer changes into this PR.

## Source / handoff history

- 2026-08-28: normalized to `READY_TO_PORT` after direct PocketRisu owner audit and independent RisuBard evidence. Source: `rpaddict/RisuBard@769c611cc3574e6b0277e944afa1ffaaf99c100d`.
- Source implementation was not started in that run because the executable environment could not resolve `github.com` for a clean clone/test run; GitHub API read/write access itself remained functional.