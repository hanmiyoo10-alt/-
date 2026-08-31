# SERVER-BACKED-INLAY-AUTHORITY

Feature-ID: `SERVER-BACKED-INLAY-AUTHORITY`
Status: ADOPTED

## Invariant

On PocketRisu Node/self-host deployments, inlay assets referenced by synced chat state must have durable server-side ownership rather than existing only in one browser's local storage. Client memory/local caches may accelerate reads but are not the sole durability authority.

## Evidence

- Current `PocketRisu/PocketRisu:develop@b8bbcbe065755379d33f74d6ad16a36d634917c1` implements NodeStorage-backed inlay persistence and bounded memory caching in `src/ts/process/files/inlays.ts`.
- Independent maintained-family corroboration: `nevaeh5379/HaejeokRisuai@4ff4241d006afa389b33972edd4f4d5c55bd7fb3` moves inlay assets to NodeStorage-backed server ownership, retains local/cache fallbacks, and provides idempotent local-only migration.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `HIGH`
- Risk: `HIGH`
- Dependencies: `NONE` for preservation; future migration/change requires explicit backup/restore and cache-ownership validation
- Priority: `P1`
- lifecycle status: `ADOPTED`

## Compatibility and safety boundaries

- Synced chat references must not depend on a single browser's IndexedDB-only asset.
- Cache eviction must not delete durable server data.
- Overwrites must not leave stale immutable cache views.
- Backup/export coverage must include the server-side inlay namespace or equivalent canonical asset domain.
- Non-node platforms must retain a valid platform-appropriate storage path.
- Any migration must be idempotent, non-destructive, and report per-item failures rather than silently claiming completeness.
- Do not use this invariant to justify unrelated storage migrations or changes to PocketRisu save/flush guardrails.

## Validation

Preservation checks for future changes should cover server read/write/list/remove, overwrite/revalidation, bounded cache behavior, backup inclusion, non-node fallback, corrupt/missing asset behavior, and migration idempotence where migration exists.

## Rollback/fallback

For future modifications, rollback should restore the prior known-good server-backed implementation without deleting server assets. Never roll back by making browser-local storage the only authority for already-synced references.

## Follow-up

No autonomous implementation is required: the core invariant is already adopted. Treat external variants as corroborating evidence, not authority.
