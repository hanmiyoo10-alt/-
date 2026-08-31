# SHARED-CACHE-VALUE-MUTATION-BOUNDARY

Status: `ADOPTED` invariant
Source: `PocketRisu/PocketRisu@9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7`

## Problem / evidence

A cache may intentionally return one shared object for the same key. If a consumer writes caller-specific identity or metadata directly onto that object, later consumers can silently mutate earlier consumers' state. PocketRisu's Hypa vector cache exhibited this failure: `HypaProcessorV2` assigned metadata onto the cached vector object itself, and a later metadata-less query using the same cache key could clear the parent-summary metadata and cause similarity-search code to fail.

The adopted PocketRisu fix keeps the cached vector as the shared source and creates a caller-owned result object before attaching per-call `id` and `metadata`.

## Minimal safe scope

Preserve this as a correctness invariant for caches that return shared mutable references. Do not generalize it into unconditional deep cloning of all cached payloads.

## Ownership boundary

- Cache owner: immutable/shared cached value for a cache key.
- Caller owner: per-call identity, metadata, annotations, bookkeeping, or other mutable state.
- A caller must not use the shared cache object itself as storage for caller-owned mutable state.

## Mechanism

When caller-specific mutation is required, derive the smallest caller-owned view/copy needed to hold those fields while retaining references to data that is safe to share immutably. If the cached value itself must be mutable, define explicit copy-on-write or ownership-transfer semantics rather than relying on accidental object identity.

## Compatibility / invariants

1. Repeated cache hits for immutable vector payloads remain effective.
2. Consumer A's metadata cannot be changed by consumer B merely because both hit the same cache key.
3. Metadata-less queries cannot erase metadata already stored in another consumer's result map.
4. Narrow copying must not become an unbounded deep-clone path for large embeddings.
5. No changes to PocketRisu persistence lifecycle guardrails: no forced DB flush on `visibilitychange`/`pagehide`, keep `flushServerDbKeepalive()` no-op unless separately reviewed, preserve save/integrity optimizations, preserve targeted V3 plugin reload, keep runit, and do not create Android notifications on the server phone.

## Validation / acceptance

- Seed one cache key with an embedding value.
- Consumer A reads it with metadata and stores its result.
- Consumer B reads the same key without metadata, or with different metadata.
- Assert A's stored metadata and identity remain unchanged after B's read.
- Assert both results retain the expected embedding values and cache-hit behavior.
- Exercise the similarity-search path that previously dereferenced parent-summary metadata and confirm it no longer fails.
- Where allocation is performance-sensitive, compare object allocation/retained-memory impact to the pre-fix cache-hit path.

## Risk / blast radius

Risk is `MEDIUM`: mutating shared cached state can cause cross-request logical corruption or crashes, but the fix is localized and rollback is straightforward. The main implementation hazard is overcorrecting with expensive cloning.

## Rollback / fallback

Revert the caller-owned copy/view change only if an alternative ownership mechanism guarantees that caller-specific fields cannot mutate shared cache state. Disabling the cache entirely is an emergency fallback, not the preferred design.

## Dependencies

`NONE` for the adopted invariant. Any future application to another cache requires evidence that the cache exposes shared mutable references.

## PR decomposition

No new implementation PR is required for the adopted Hypa fix. Future occurrences should land as one narrowly scoped cache-ownership fix plus its regression test; do not mix unrelated cache cleanup.
