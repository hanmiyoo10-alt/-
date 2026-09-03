# Feature-ID: PLUGIN-STORAGE-WRITE-TOKEN-ROLLBACK-AUTHORITY

## Status

`ADOPTED`

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`

## Problem / evidence

PocketRisu plugin storage provides optimistic local read-after-write behavior while persistence can still fail because of session locking, transport failure, or another server-side rejection. If failed writes leave their optimistic cache values behind, plugins and users can observe state that never became durable. If rollback is guarded only by value identity, an older failed write can incorrectly revert a newer successful write that happens to contain the same value.

Evidence:

- `PocketRisu/PocketRisu@8190e27aefadd9ba2708b4c36e24ba651d09857c`
- `PocketRisu/PocketRisu@dc0148d9afcc2422ea4edf92243bf0b4097acac6`
- Preserved at reviewed durable tip `ca09a80746e74e5334145e5e78af47ce423e0eba` in `src/ts/plugins/pluginSafeClass.ts`.

## Invariant

Optimistic plugin-storage cache state may be rolled back only by the exact mutation that still owns rollback authority for that key. A later mutation, including a same-value write, supersedes the earlier mutation's rollback authority. An explicit clear invalidates outstanding rollback authority so late failures cannot refill cleared local state.

Persistence success and owner-metadata bookkeeping are separate authorities: failure of sidecar owner metadata after the primary storage write succeeds must not be surfaced as if the user value failed to persist.

## Compatibility / acceptance

Preserve synchronous-feeling read-after-write compatibility expected by legacy plugin code while maintaining server persistence as the durable authority. Regression coverage should include failed first write, failed overwrite, failed remove, different-value and same-value concurrent writes, clear-vs-in-flight failure, and metadata-sidecar failure after successful persistence.

## Risk / blast radius

Wrong ordering can expose phantom values or silently revert a later successful plugin-storage mutation in browser memory. The durable server value is not necessarily corrupted, but the local view can become dangerously misleading until reload and can provoke follow-up plugin writes based on false state.

## Rollback / fallback

Preserve the existing per-key write-token/epoch mechanism. A future refactor that cannot retain equivalent mutation ownership should fall back to serialized writes with explicit failure reconciliation rather than value-identity rollback.

## Follow-up

No implementation PR is needed: this invariant is already adopted. Re-check it whenever plugin-storage queueing, batching, local/offline caching, or persistence transports are changed.
