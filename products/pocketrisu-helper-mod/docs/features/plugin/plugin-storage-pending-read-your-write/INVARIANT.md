# PLUGIN-STORAGE-PENDING-READ-YOUR-WRITE

Status: ADOPTED invariant

## Problem / evidence

PocketRisu's lazy server-backed plugin storage persists asynchronously, while upstream/plugin-facing semantics historically allowed synchronous `setItem()` followed by an immediate read. Official PocketRisu commit `83ffa0474abd013581c4df23e50b20c559d4b47a` fixed a regression where immediate `getItem()` or `snapshotAll()` could observe the old server/cache value while a newer write was still in flight.

## Minimal safe scope

Keep pending operations visible to reads for the same key until they are superseded or durably completed. A pending remove reads as absent; a pending set reads as the queued value; a sync-cached value with the same pending hash can reuse the cached object.

## Ownership boundaries

- plugin-facing storage API defines observable read-after-write semantics;
- pending-op queue owns not-yet-durable intent;
- cache/server state must not override a newer pending operation;
- transport completion retires pending authority only in correct order.

## Mechanism / invariant

For a key with pending intent, reads resolve the newest pending intent before cache or server state. Full snapshots must apply the same rule so `getDatabase()` cannot reconstruct stale plugin storage while writes are in flight.

## Compatibility / invariants

- preserve upstream-compatible immediate read-after-write behavior;
- preserve ordered superseding writes/removes;
- do not expose an older cache/server value over a newer pending write;
- remove intent is observable as missing immediately;
- completion/failure cleanup must not resurrect stale intent;
- no forced DB flush, PM2, Android notifications, or other PocketRisu guardrail changes are involved.

## Validation / acceptance

1. in-flight async set then immediate get returns the pending value;
2. in-flight remove then immediate get returns null/absent;
3. `snapshotAll()` during an in-flight write returns the pending value;
4. superseding set/remove ordering returns the newest logical value;
5. after completion, pending state is retired and durable/cache state agrees;
6. failure paths do not leave a stale pending authority forever.

## Risk / blast radius

Risk: MEDIUM. A wrong pending-operation ordering rule can expose stale data, hide successful writes, or resurrect deleted values. Scope is localized to plugin storage semantics and is straightforward to revert if tests detect mismatch.

## Rollback / fallback

Revert queue/read arbitration as one isolated change while preserving the server-backed storage architecture. Do not compensate by forcing global saves or full DB flushes.

## Dependencies

None for preserving the adopted invariant.

## PR decomposition

No implementation PR is currently required because the invariant is already adopted upstream. Future refactors touching plugin-storage batching, queueing, caching, or transport should include this dossier's regression cases in the same PR.

## Source / history

- `PocketRisu/PocketRisu@83ffa0474abd013581c4df23e50b20c559d4b47a`
- Recorded by the Risu-family idea pipeline during the forward review from `273e7c2fd541cd7df0d21f03e29892247c49e724` through `b8bbcbe065755379d33f74d6ad16a36d634917c1`.
