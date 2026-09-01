# PLUGIN-STORAGE-READ-YOUR-WRITES

## Status

`ADOPTED` in official PocketRisu.

## Source evidence

- `PocketRisu/PocketRisu@83ffa0474abd013581c4df23e50b20c559d4b47a`
- The commit changes both `src/ts/plugins/pluginStorageStore.ts` and focused tests in `pluginStorageStore.test.ts`.

## Invariant

When a compatibility API historically provides synchronous mutation semantics, moving durable persistence behind an asynchronous/server boundary must not make immediate reads observe older state. Once a local mutation is accepted, reads in that same storage client/session must observe that mutation until it either succeeds or is resolved by the defined failure/rollback path.

For plugin storage specifically:

- pending set → `getItem(key)` observes the pending value;
- pending remove → `getItem(key)` observes absence;
- snapshots used for compatibility/database views include pending writes rather than stale server copies;
- observation authority is per key and temporary;
- persisted/server authority resumes after the operation resolves, subject to the existing write-generation rollback rules.

## Why this matters

Legacy plugins commonly call a synchronous-looking `setItem()` and immediately read the key again. Without read-your-writes, server latency becomes a visible semantic regression: plugins can branch on stale values, compatibility snapshots can serialize pre-write state, and later operations can be based on a state that the same caller just changed.

## Ownership boundaries

- Caller/API compatibility owns the promise that an accepted local mutation is immediately observable.
- Pending-op tracking owns temporary per-key read visibility.
- Server persistence owns durable state after completion.
- Rollback-generation logic owns whether a failed operation is still allowed to revert local state.
- Cache contents alone do not outrank a newer pending mutation.

## Compatibility / invariants

- Do not weaken targeted V3 plugin reload behavior.
- Do not reintroduce forced DB flush on `visibilitychange` / `pagehide`.
- Keep `flushServerDbKeepalive()` no-op unless separately reviewed.
- Preserve current save/integrity optimizations.
- A pending operation must never be exposed under the wrong key or survive clear/resolution incorrectly.
- Multiple queued operations must preserve program order and newer mutation authority.

## Validation / acceptance

Focused regression coverage should include:

1. server write held in flight: set → immediate get returns new value;
2. server write held in flight: snapshot includes new value, not server copy;
3. pending remove → immediate get returns absence;
4. two or more queued writes to one key preserve newest visible operation according to ordering rules;
5. write failure integrates with generation-based rollback so an older failure cannot erase a newer write;
6. clear invalidates pending/read authority consistently;
7. successful completion removes temporary pending authority without changing the visible value.

Acceptance criterion: introducing network latency between mutation acceptance and durability must not cause an immediate same-client read to move backward to pre-mutation state.

## Risk / blast radius

`MEDIUM`: the code is localized, but incorrect pending-op ownership can expose stale/wrong plugin data or interact badly with failure rollback. Persistent storage architecture is otherwise unchanged.

## Rollback / fallback

If a future refactor breaks this invariant, revert the pending-read optimization together with the async-storage compatibility change or restore a serialized synchronous compatibility layer. Do not silently fall back to stale cache/server reads while retaining a synchronous-looking mutation contract.

## Dependencies

`NONE` for the adopted invariant.

## PR decomposition

No new PR is needed now. If future work touches this path, keep regression-preservation changes in the plugin-storage feature boundary and do not mix unrelated cleanup.