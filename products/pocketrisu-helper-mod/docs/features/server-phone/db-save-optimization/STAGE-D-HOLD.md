# Stage D/E hold — plugin storage architecture change

Feature-ID: `db-save-optimization`
Date: `2026-08-25`
Status: `HOLD_ARCHITECTURE`

## Trigger
Official upstream Stage D PR: `PocketRisu/PocketRisu#73`.

Maintainer review found no correctness defect in the implementation:
- incremental hash matched the real `calculateHash` bit-for-bit across integer-like keys, `__proto__`, move in/out, root operations and plugin storage type transitions;
- selective clone behavior was safe: copy deep-cloned, move cloned the `from` child, and only untouched siblings preserved identity;
- review suite: 19/19 passed.

The merge was deferred for architectural direction, not code quality.

## Why Stage D/E are on hold
Upstream is moving `pluginCustomStorage` out of `database.bin` and `/api/patch` toward server-side per-key storage with on-demand browser reads. The motivating user failure is browser OOM from keeping large plugin data in multiple browser-side copies, not primarily server patch latency.

If that migration lands, `pluginCustomStorage` becomes effectively empty on the database patch path and the direct-child/depth-3 optimizations in Stage D/E lose their target hot path.

Related upstream direction: `PocketRisu/PocketRisu#74`.

## Current action
- Do not add more Stage D/E code while the upstream migration direction is active.
- Preserve official PR #73 and local drafts as validated fallback designs.
- Local draft `hanmiyoo10-alt/PocketRisu#7` is marked HOLD in its PR body.
- Local draft `hanmiyoo10-alt/PocketRisu#8` is marked HOLD in its PR body and must not be revived independently of Stage D.
- General Stage B/C work remains valid history: upstream #68/#69 were already merged.
- Stage A empty-patch fast path was adopted upstream; isolated opaque ETag was superseded by broader revision-model work.

## Revisit checklist if the plugin-storage migration is abandoned
1. Make the Stage D direct-child hash hot path O(touched keys), not O(total plugin keys): avoid repeated `{...storage}`, full `new Map(childHashes)`, and per-key `calculateHash(key)` composition by caching each child contribution (`imul(hash(key), 31) + childHash`) together with a running total.
2. Remove duplicated `collectPluginStorageChildKeys` implementations. Export one canonical parser/helper and consume it from both hash-cache and selective-clone code.
3. Re-run the maintainer adversarial cases after rebasing on current `develop`: integer-like keys, `__proto__`, move in/out, root operations, storage type transitions, copy/move clone safety and failed-patch atomicity.
4. Re-benchmark on the then-current architecture before arguing for merge; historical Stage D/E latency wins are not sufficient if the hot path has moved.

## Automation note
The connected GitHub integration can read the official upstream PR but cannot edit its body (`403 Resource not accessible by integration`). Local fork PR metadata and this helper repository can be maintained automatically. Do not treat the upstream write failure as a code or CI failure.
