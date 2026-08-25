# Stage D/E outcome — plugin storage architecture superseded

Feature-ID: `db-save-optimization`
Date: `2026-08-25`
Status: `CLOSED_SUPERSEDED_ARCHITECTURE`

## Trigger
Official upstream Stage D PR: `PocketRisu/PocketRisu#73`.

Maintainer review found no correctness defect in the implementation:
- incremental hash matched the real `calculateHash` bit-for-bit across integer-like keys, `__proto__`, move in/out, root operations, plugin storage type transitions and delete/re-add cases;
- selective clone behavior was safe: copy deep-cloned, move cloned the `from` child, and only untouched siblings preserved identity;
- review suite passed 19/19 before the architecture decision.

The final closure was architectural, not a code or CI failure.

## Final upstream outcome
On 2026-08-25 the maintainer closed #73 without merging after the plugin-storage lazy migration landed in `develop` as `f0d4eee3`.

The new architecture removes the hot path Stage D/E targeted:
- `pluginCustomStorage` values no longer live in `database.bin`;
- plugin values are stored per key in server KV under `plugin-storage/<key>`;
- the browser-side DB keeps `pluginCustomStorage` empty;
- plugin-storage patch operations are reflected to the per-key KV path rather than forcing whole plugin-storage hash/clone work in the old database patch representation.

Therefore the direct-child and depth-3 optimizations are now preserved only as validated fallback designs. Their target execution path no longer exists in current upstream.

## Maintainer final notes
The closing comment explicitly reiterated that correctness had been verified and recorded three historical improvement points:
1. the old hot path still had O(total plugin keys) work from shallow storage copy, `new Map(childHashes)`, and per-key key-hash composition;
2. `collectPluginStorageChildKeys` was duplicated across two `.cjs` helpers and should have been centralized or parity-tested;
3. the submitted tests were weighted toward happy paths, while the maintainer's adversarial parity cases covered the important boundaries.

The maintainer also stated that upstream #68 and #69 remain accepted and are going into v1.11.0.

## Local draft disposition
- `hanmiyoo10-alt/PocketRisu#7`: keep as an open draft/historical fallback, not an active merge candidate.
- `hanmiyoo10-alt/PocketRisu#8`: same; do not promote independently.
- Do not add more code to Stage D/E unless upstream architecture later recreates a comparable large in-DB plugin storage hot path.

## If a future architecture revives this path
1. Re-inspect current upstream first; do not resurrect old code blindly.
2. Make the direct-child hash update O(touched keys), including cached key contributions/running totals rather than rewalking all keys.
3. Centralize JSON Pointer child-key collection in one canonical helper/export.
4. Add adversarial parity tests for integer-like keys, `__proto__`, move in/out, root ops, storage type transitions, delete/re-add, copy/move clone safety, and failed-patch atomicity.
5. Re-benchmark before proposing a new PR because the historical performance evidence applies to the retired architecture only.

## Surviving value from the series
- Stage B / upstream #68: merged compositional DB hash cache.
- Stage C / upstream #69: merged selective top-level clone.
- Stage A empty-patch fast path: adopted via upstream follow-up `e3a63daa` while the isolated opaque ETag portion was superseded.
- Stage D/E: correctness-validated engineering record, superseded by the per-key plugin storage redesign rather than rejected for defects.
