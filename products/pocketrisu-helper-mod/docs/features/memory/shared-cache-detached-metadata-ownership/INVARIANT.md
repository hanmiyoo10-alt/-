# SHARED-CACHE-DETACHED-METADATA-OWNERSHIP

Status: ADOPTED upstream invariant
Feature-ID: `SHARED-CACHE-DETACHED-METADATA-OWNERSHIP`

## Problem / evidence

Official PocketRisu commit `9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7` fixed a Hypa V3 crash caused by mutating an embedding object returned from the shared cache. Request-local `metadata` was written directly onto that shared object; a later metadata-less lookup for the same cache key could clear metadata previously relied on by similarity results.

## Minimal safe scope

Treat cache-returned embedding records as immutable shared values. Construct a detached result envelope before attaching consumer-local identity or metadata.

## Ownership boundaries

- Shared/persisted vector cache owns the reusable embedding value record.
- A Hypa processor instance owns its local `id` and `metadata` association.
- Query-specific metadata must never mutate cache-owned state.

## Mechanism

On cache hit, copy the cache record into a new result object and attach current-call `id`/`metadata` to the copy. Store/return the detached result rather than the cache-owned object.

## Compatibility / invariants

- Same embedding key may be reused by several logical items.
- A metadata-less query must not erase metadata associated with another item.
- Cached vector payload remains reusable across processor instances.
- If nested vector fields ever become mutable, shallow copy is no longer sufficient; preserve effective immutability or deepen the copy boundary.

## Validation / acceptance

1. Seed/reuse one embedding cache key for a metadata-bearing indexed item.
2. Hit the same key for a metadata-less query.
3. Assert cached base record is unchanged.
4. Assert indexed result keeps its metadata.
5. Assert query gets only its own metadata state.
6. Run similarity/result mapping and verify no missing-parent metadata crash.

## Risk / blast radius

Low. The invariant is localized to result ownership. Main regression risk is accidentally relying on mutation of the shared cached object elsewhere.

## Rollback / fallback

Revert the consumer-local envelope change only if an equivalent immutable-cache ownership mechanism replaces it. Do not restore direct metadata mutation on cache-owned objects.

## Dependencies

None.

## PR decomposition

Already adopted in official PocketRisu. Future refactors touching Hypa/vector cache should preserve this invariant and its regression test as one focused compatibility boundary.
