# SHARED-VECTOR-CACHE-RESULTS-ARE-IMMUTABLE

## Status

`ADOPTED` in official PocketRisu; preserve as an implementation invariant.

## Source evidence

- `PocketRisu/PocketRisu@9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7`
- Current `develop` still constructs a caller-owned embedding result before assigning local `id` and `metadata`.

## Problem / evidence

The Hypa vector cache can return the same object reference to more than one logical consumer. Mutating caller-specific metadata directly on that shared cache object allowed a later metadata-less query using the same cache key to clear parent-summary metadata held by an earlier consumer. Downstream similarity search could then dereference missing summary text and crash.

## Minimal safe scope

Treat cache-returned objects as immutable shared values. Copy only the caller-owned envelope before attaching request-, query-, or processor-specific identity/metadata.

## Ownership boundaries

- Cache owns reusable vector/cache payload identity.
- A processor/query owns its `id`, metadata, and local indexing semantics.
- No consumer may use shared cache object identity as writable local state.

## Mechanism

On cache hit, derive a new local result object (for example `{ ...cached, id, metadata }`) and place that local object into processor-owned maps. Do not mutate the object returned by the shared cache.

## Compatibility / invariants

- Cache hits remain cache hits; no recomputation is required solely for ownership isolation.
- Vector values remain equivalent.
- Caller metadata cannot alter metadata observed by another logical consumer of the same cache entry.
- Avoid unconditional deep copies unless nested cached values later become mutable.
- PocketRisu save/flush, plugin reload, runit, device, and Android-notification guardrails remain untouched.

## Validation / acceptance

1. Seed one cached embedding.
2. Load it into a summary-bearing logical entry and retain the local result.
3. Load the same cache key through a second entry with absent or different metadata.
4. Assert the first local result's metadata is unchanged and parent-summary text remains readable.
5. Assert the second entry receives its own requested metadata.
6. Assert vector payload equality and cache-hit behavior are preserved.

## Risk / blast radius

Low. The change is localized to ownership of cache-hit result objects. Main regression risk is accidental excess copying or failure to isolate a newly introduced nested mutable field.

## Rollback / fallback

If a future cache representation makes shallow copying invalid, fall back to an explicit immutable cache DTO plus a separately constructed local DTO. Never fall back to mutating the shared cache object.

## Dependencies

`NONE`.

## PR decomposition

No new PR is required while official PocketRisu retains the adopted behavior. Any future regression fix should be a single focused cache-ownership PR with the regression test above.
