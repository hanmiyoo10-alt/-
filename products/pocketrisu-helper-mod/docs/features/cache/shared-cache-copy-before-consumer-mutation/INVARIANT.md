# SHARED-CACHE-COPY-BEFORE-CONSUMER-MUTATION

## Status

Adopted invariant; no implementation PR required.

## Problem / evidence

Official PocketRisu commit `9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7` fixed a Hypa V2 failure where a shared in-memory vector cache returned the same object reference to multiple consumers. A consumer then attached request-local metadata directly to the cached object. A later consumer using the same cache key without metadata could overwrite that field, corrupt previously stored processor-local state, and cause similarity traversal to crash.

## Minimal safe scope

Treat shared cached structured objects as immutable from the consumer's perspective. If a consumer needs to add or replace local metadata, create a consumer-owned detached wrapper/object first. Do not deep-clone large immutable vector payloads unless mutation actually reaches those fields.

## Ownership boundaries

- cache: owns shared cached value identity and reusable immutable payload
- processor/request consumer: owns request-local `id`, metadata, annotations, and other mutable decorations
- UI/error surface: receives bounded error text; it must not influence cache ownership

## Mechanism

On a cache hit, construct a new consumer-owned result object from the cached value and then apply consumer-local fields to that copy. Store/return the detached object. Never assign consumer-local metadata directly to the shared cached object.

## Compatibility / invariants

- cache hit/miss behavior remains unchanged
- embedding/vector payload reuse remains cheap
- source cached object is unchanged after any consumer path
- two consumers using the same cache key may carry different metadata without interfering
- metadata-less query consumption cannot erase metadata belonging to an earlier consumer
- do not generalize this into deep cloning of every cache value

## Validation / acceptance

A focused regression should seed one cache entry, consume it once with metadata and once without metadata (or with different metadata), then assert: the cache entry itself is unchanged; the first consumer still has its metadata; the second consumer has only its own metadata; similarity traversal does not fail; normal cache hit behavior remains intact.

## Risk / blast radius

Risk is medium because shared-reference mistakes can silently corrupt cross-consumer state and surface later as unrelated crashes. The implementation fix is localized and easy to revert, but incorrect cloning could introduce avoidable memory cost for large vectors.

## Rollback / fallback

Rollback is a direct revert of the consumer-side detached wrapper creation. If future profiling shows wrapper allocation overhead, optimize the wrapper shape rather than restoring shared-object mutation.

## Dependencies

None.

## PR decomposition

No new PR: official PocketRisu already adopted the fix. Future cache refactors should carry this invariant as a regression requirement.
