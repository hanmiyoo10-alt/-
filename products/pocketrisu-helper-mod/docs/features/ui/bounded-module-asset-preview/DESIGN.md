# Feature-ID: BOUNDED-MODULE-ASSET-PREVIEW

## Problem / evidence

PocketRisu's module additional-assets editor currently resolves previews for every asset when preview is enabled and renders the full asset array. For modules with many media assets this creates unbounded URL-resolution, media metadata/decode, and DOM work. `rpaddict/RisuBard@769c611cc3574e6b0277e944afa1ffaaf99c100d` fixes the same owner by paging the visible asset prefix, gating preview work to the active asset submenu, deduplicating in-flight preview requests, and keying preview results by the asset key.

## Minimal safe scope

Only change `src/lib/Setting/Pages/Module/ModuleMenu.svelte` plus a focused regression test. Do not change module import decoding batch size, storage format, save semantics, asset viewer behavior, server APIs, or persistence architecture.

## Ownership boundaries

- Browser UI only.
- Module additional-assets editor owns visible-count state and preview-resolution bookkeeping.
- `getFileSrc()` remains the existing asset URL authority.
- `currentModule.assets` remains the canonical editable array; no persistence schema changes.

## Mechanism

1. Start the asset editor with a bounded visible prefix (24 is supported by source evidence; exact constant remains local UI policy).
2. Resolve previews only while preview is enabled, the additional-assets submenu is active, and the asset is within the visible prefix.
3. Key preview URL/extension state by stable asset path/key rather than row index.
4. Keep an in-flight set so reactive reruns cannot duplicate `getFileSrc()` for the same asset.
5. Clear in-flight state in `finally`.
6. Render only the visible prefix and expose an explicit load-more action while more assets remain.
7. Use lazy image loading and metadata-only preload for audio/video.

## Compatibility / invariants

- Editing and deleting row `i` must still mutate the corresponding canonical `currentModule.assets[i]` item.
- Opening the asset submenu resets visibility to the initial page, but must not alter the asset array.
- Turning previews off must prevent new preview resolution.
- No DB flush, keepalive, save/integrity, plugin reload, deployment/runtime, notification, or storage behavior changes.
- No cleanup unrelated to this feature.

## Validation / acceptance

Focused regression should prove:

- the initial render iterates a bounded prefix, not the full array;
- load-more increases visibility by one bounded page;
- preview resolution is gated by active submenu and preview setting;
- repeated reactive runs do not issue duplicate in-flight requests for the same asset key;
- preview lookup is by asset key, not mutable row index;
- image uses lazy loading and media uses metadata-only preload;
- deletion/edit bindings still reference the canonical array index represented by the visible prefix.

Then run the smallest available project check/typecheck/test suite. If any output differs unexpectedly, stop rather than broadening the patch.

## Risk / blast radius

Risk is LOW and localized to the module additional-assets editor. Main failure modes are wrong row mutation after paging, stale preview display after reordering/deletion, or duplicate preview work. No durable data migration exists.

## Rollback / fallback

Single-feature revert restores the prior full-list UI. Existing `useAdditionalAssetsPreview` remains an immediate user-visible fallback for preview work.

## Dependencies

`NONE` beyond the existing module editor and `getFileSrc()`.

## PR decomposition

One branch/PR only:

- `BOUNDED-MODULE-ASSET-PREVIEW`: bounded render + gated/deduped previews + focused regression test.

Explicitly exclude RisuBard's decoded module-import batch-size change; evaluate that separately if needed.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `READY_TO_PORT`
