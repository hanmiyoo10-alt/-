# RUNTIME-DB-ADAPTER-CAPABILITY-BOUNDARY

Status: HOLD reference only.

## Problem / evidence

`kwaroran/Risuai-Next@b0d40f89a9f40b29900d86e5251a78649b2c6173` places multiple runtime-specific SQLite/Drizzle adapters behind one `getDb()` contract and one schema. The useful lesson is host-adapter isolation, not the specific libraries.

## Minimal safe scope

No implementation is authorized from this dossier. If PocketRisu later gains a genuine multi-runtime persistence requirement, the first slice should be contract tests and an adapter seam around an existing owner, with no storage-format migration and no new system/runtime dependency.

## Ownership boundaries

- application persistence callers depend on one semantic contract;
- runtime-specific native/cloud drivers remain inside adapter modules;
- schema and compatibility tests define shared behavior;
- deployment/runtime selection is explicit and does not leak into feature code.

## Mechanism

Select the persistence adapter from an explicit runtime/capability signal and dynamically load only that adapter. All adapters must satisfy the same application-level read/write/transaction/error semantics. Unsupported adapters must not be imported eagerly.

## Compatibility / invariants

- preserve current PocketRisu save/integrity optimizations;
- preserve ETag/revision semantics and backup/restore behavior;
- do not add forced `visibilitychange`/`pagehide` DB flushes;
- preserve `flushServerDbKeepalive()` as no-op unless separately reviewed;
- keep runit; never introduce PM2;
- no host package/runtime migration in the first slice;
- no new DB/storage format from this evidence alone.

## Validation / acceptance

Before any future implementation: demonstrate a real duplicated PocketRisu runtime-storage owner; add contract tests covering reads, writes, transactions, errors, concurrency, and shutdown; prove lazy adapter loading; verify backup/restore and revision behavior; verify failure behavior on unsupported/misconfigured runtimes.

## Risk / blast radius

HIGH if treated as a storage migration. LOW only for a future test-only/adapter-seam slice that does not alter durable format or deployment requirements.

## Rollback / fallback

The existing PocketRisu persistence owner remains authoritative. Any future adapter seam must be removable without data migration and must retain the current implementation as fallback until parity is proven.

## Dependencies

A real PocketRisu multi-runtime persistence requirement and matching duplicated owner. None exists in current evidence.

## PR decomposition

1. Test-only persistence semantic contract around the current owner.
2. Adapter interface with current implementation as the sole backend.
3. Only if separately justified, one additional runtime adapter with no format migration.

No production PR should be opened from this dossier while the item remains `HOLD`.
