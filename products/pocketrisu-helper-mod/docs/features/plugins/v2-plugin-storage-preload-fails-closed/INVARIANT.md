# Feature-ID: V2-PLUGIN-STORAGE-PRELOAD-FAILS-CLOSED

## Status

`ADOPTED` in official PocketRisu.

## Problem / evidence

V2 plugins consume plugin storage synchronously. PocketRisu therefore preloads the server-backed store before V2 runtime activation. In `PocketRisu/PocketRisu@0c6105f43fea3f9b59a8fca3b6b7d2de988a1e32`, a demonstrated failure mode was fixed: `preloadAll()` could fail, `loadPlugins()` would log the error but still start V2 plugins, and synchronous reads then returned `null` for data that actually existed on the server. A plugin could interpret those values as missing and write defaults, overwriting durable state.

## Minimal safe scope

Treat successful V2 storage preload as a hard activation prerequisite. On preload failure, do not start V2 plugins, tear down previous V2 runtime state, surface a user-visible failure, and leave retry to a later explicit plugin load/reload. Keep V3 activation independent because V3 storage reads on demand and does not require the same synchronous preload contract.

## Ownership boundaries

- server-backed plugin storage: durable value authority
- V2 preload cache: compatibility snapshot required for synchronous reads
- V2 plugin loader: activation authority only after preload readiness
- V2 plugin code: consumer; must never receive synthetic missing values caused by failed readiness
- V3 plugin loader/storage: separate runtime contract and failure domain

## Mechanism

Track whether storage initialization/preload completed successfully. Start V2 plugins only if storage is ready (or there are no V2 plugins to start). When readiness fails, call the normal V2 teardown path with an empty plugin set, notify the user, and continue loading V3 plugins normally.

## Compatibility / invariants

- legitimate missing keys remain representable as `null` only after the preload contract is satisfied;
- preload failure is not equivalent to an empty store;
- V2 plugins must not execute against an incomplete synchronous compatibility view;
- previous V2 providers/hooks/state must be torn down on readiness failure;
- V3 plugins must remain available unless their own independent initialization fails;
- preserve targeted V3 reload behavior and all existing PocketRisu save/integrity guardrails.

## Validation / acceptance

Cover at least:

1. successful preload starts V2 plugins;
2. preload rejection prevents any V2 plugin activation;
3. existing V2 runtime state is torn down after a failed reload;
4. user receives a clear failure notice;
5. V3 plugins still load after V2 preload failure;
6. genuine empty storage after successful preload is still treated as empty, not as an error.

Acceptance: no mutating V2 consumer can observe synthetic missing values caused by failed preload, and the V3 failure domain stays separate.

## Risk / blast radius

`MEDIUM`: the code change is localized, but violating the invariant can cause durable plugin-state overwrite. Over-applying the gate could unnecessarily disable plugins, so it must stay bound to runtimes that truly require whole-store synchronous hydration.

## Rollback / fallback

If the activation gate itself regresses, the safe fallback is to keep V2 disabled after preload failure and require a reload/retry after storage availability returns. Never fall back to running V2 against an unready cache.

## Dependencies

`NONE` for preserving the adopted invariant.

## PR decomposition

No new implementation PR is required because the behavior is already adopted upstream. Any future rewrite of V2 compatibility hydration should keep readiness/activation tests in the same PR as the lifecycle change. Do not mix unrelated V3 or storage-architecture migration work.

## Related invariants

- `PLUGIN-STORAGE-READ-YOUR-WRITES`: pending per-key visibility while persistence is in flight.
- `OPTIMISTIC-CACHE-ROLLBACK-USES-WRITE-GENERATION`: per-operation rollback ownership after write failure.
- corrupt-row quarantine: retry authority for known unreadable rows.

This Feature-ID is separate: it owns **whole-runtime activation authority when the required synchronous storage view cannot be established**.

## Source

- `PocketRisu/PocketRisu@0c6105f43fea3f9b59a8fca3b6b7d2de988a1e32`
