# Feature design — bounded native thumbnail cache

Feature-ID: `PRH-MOBILE-NATIVE-THUMBNAIL-CACHE`

Status: **DESIGN_NEEDED**

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: current PocketRisu asset/blob/thumbnail ownership audit; Android/Capacitor capability boundary; source fingerprint/invalidation contract; physical mobile memory measurement
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

## Problem / evidence

Long character/media grids can amplify memory pressure through full-image decode, Base64/JS copies, duplicate concurrent reads, and unbounded decode concurrency. `nevaeh5379/HaejeokRisuai` commit `1f5bb1328c4486d968c3d7c9781f036486dd0b4c` adds an Android-native thumbnail path that:

- decodes with bounded dimensions and sampling;
- encodes WebP thumbnails to disk;
- returns a local file path instead of transferring image bytes as Base64 into JS;
- bounds decoder concurrency with a fixed worker pool;
- coalesces identical in-flight image loads;
- keys cached thumbnails with requested dimensions plus source `lastModified`/length;
- prunes the on-disk thumbnail cache to a bounded file count.

The same forward range also reduces Android in-memory asset-cache budgets and adds throttled import progress (`aef7e7479a24dbc1f2adf95a40131de8dedd62ff`). This is credible external code evidence, but PocketRisu-specific benefit is not yet measured, so Evidence remains MEDIUM.

### Additional forward evidence — 2026-08-28

The later Haejeok sequence strengthens the same design rather than creating a new idea:

- `91dc8cb0aafce9b2083a9cc0d9ece115cc69669b` adds `prepareThumbnails` batch preparation, request de-duplication, a dedicated `/_risu_thumb_/` serving path, and replaces a file-count limit with a byte budget (128 MiB limit / 96 MiB target).
- `7aea7329c2ce4323c9a3bf4b72cf5adc88cc03a1` throttles expensive maintenance: pruning only after batches of thumbnail creation and access-time touches no more frequently than every five minutes, specifically to avoid I/O amplification while scrolling image grids.
- `51513f9edef1a74fe0b718943da68fcdc8a149e2` adds direct WebView serving for immutable local Risu assets, reinforcing the broader principle that derived/static local bytes should avoid unnecessary JS/Base64 materialization when a capability-gated local URL can safely own delivery.

These commits improve evidence for **budget ownership and maintenance-frequency control**. They do not remove the PocketRisu-specific measurement dependency, so lifecycle remains `DESIGN_NEEDED` and Evidence remains `MEDIUM`.

## Minimal safe scope

Do **not** port the source plugin wholesale. First isolate one read-only display path: character-list thumbnails on Android only. The first implementation slice, if later promoted, should contain only:

1. a capability-gated thumbnail provider;
2. bounded decode concurrency;
3. deterministic cache identity/invalidation;
4. local-path return with browser/current fallback;
5. cache pruning and lifecycle tests;
6. no change to canonical asset storage or save format.

No backup, import/export, DB, notification, or generation-lifecycle changes belong in this feature.

## Ownership boundaries

- **Canonical asset storage:** remains current PocketRisu ownership; thumbnails are derived/cache-only and never authoritative.
- **Native Android bridge:** may read canonical asset bytes and publish disposable thumbnail files only.
- **Frontend image loader:** selects native thumbnail capability when available and otherwise keeps the current path.
- **Memory/blob cache:** existing pin/eviction semantics remain authoritative; native thumbnail disk cache must not silently create a second canonical lifetime owner.
- **Server phone:** this feature must not create Android notifications or services.

## Proposed mechanism

1. Resolve the existing PocketRisu asset key through the current asset ownership boundary.
2. For eligible raster images and explicit thumbnail/display requests on Android, call a native thumbnail capability.
3. Bound requested dimensions to a conservative range and reject invalid/missing keys.
4. Use sampled decode before scaling; never decode a huge source at full resolution merely to make a small grid thumbnail when avoidable.
5. Cache only derived thumbnails under the app cache directory. Cache identity must include asset identity plus dimensions plus a source revision/fingerprint strong enough to prevent stale reuse. `mtime + length` from the source is evidence, not automatically sufficient for PocketRisu.
6. Publish via temporary file -> replace/rename so readers never observe partial thumbnail bytes.
7. Return a local file URL/path to the WebView rather than materializing the encoded image as a JS Base64 string.
8. Coalesce equal in-flight loads and bound concurrent decode workers.
9. Prune deterministically by a bounded **byte** budget, not merely by entry count. Maintenance itself must be throttled so grid scrolling cannot turn LRU bookkeeping into sustained filesystem I/O.
10. Any native failure falls back to the current image path without affecting chat/save state.

## Compatibility / invariants

- Canonical assets remain unchanged and recoverable if the entire thumbnail cache is deleted.
- No save-format, DB-schema, cold-storage, backup-format, plugin-storage, or server protocol change.
- Existing blob URL pinning/eviction and targeted V3 plugin reload remain unchanged.
- No forced DB flush on `visibilitychange` / `pagehide`; `flushServerDbKeepalive()` remains no-op.
- runit/PM2/service-manager behavior is untouched.
- No Android notification on the server phone.
- Cache hits must never return bytes belonging to an older asset revision under the same logical key.
- A failed/cancelled thumbnail generation must not leave a file that can later be mistaken for a valid hit.
- Cache-budget enforcement must not perform unbounded prune/touch I/O during a fast scrolling burst.

## Validation / acceptance

Before promotion to `READY_TO_PORT`:

1. Inspect current PocketRisu image/asset path and identify the exact duplicate-copy/decode cost being removed.
2. Measure at least one representative large character grid on the actual Android target: peak Java/native heap, WebView/JS memory if observable, decode latency, first-display latency, cache-hit latency, and concurrent scroll behavior.
3. Prove fallback parity on web/non-Android platforms.
4. Regression-test stale invalidation after replacing an asset under the same logical key.
5. Regression-test duplicate concurrent requests coalescing to one native work item.
6. Regression-test byte-budget pruning never touching canonical assets and converging toward its target without synchronous prune storms.
7. Regression-test corrupt/unsupported image, missing asset, cancelled navigation, activity recreation, and plugin teardown.
8. Measure filesystem operation rate during rapid grid scrolling so access-time/prune maintenance stays bounded.
9. Acceptance requires lower or equal peak memory with no wrong-image/stale-image regression and no worse steady-state interaction correctness.

## Risk / blast radius

Primary risks are stale thumbnails, wrong cache ownership, native-memory spikes during decode, leaked executor work, and divergent Android-vs-web behavior. Blast radius is contained by keeping the cache derived/disposable and capability-gated, with current loading as fallback.

## Rollback / fallback

A single feature flag/capability check must be able to disable the native path. Removing the native thumbnail cache directory must be safe at any time. Reverting the feature must require no migration because canonical storage is unchanged.

## Dependencies and PR decomposition

1. **Audit/measurement only:** map current image loading/cache ownership and capture Android baseline.
2. **Pure contract/tests:** define thumbnail provider result, cache-key/fingerprint rules, byte-budget ownership, bounded maintenance cadence, and fallback behavior without native implementation.
3. **Android native implementation:** one isolated feature branch/PR only after steps 1-2 resolve assumptions.
4. **Optional tuning:** worker/budget/maintenance tuning from physical measurements, separate from correctness.

Do not bundle native backup/import/export or foreground generation-service work into this feature.