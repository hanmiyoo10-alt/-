# Feature-ID: STORAGE-DEFERRED-DOMAIN-COMPLETE-SNAPSHOT

## Status

Assistant-owned design draft. `DESIGN_NEEDED`; not implementation-authorized.

## Problem / evidence

Large persisted domains can dominate startup parse time and browser memory. Deferring them from the shallow startup object is attractive, but a shallow in-memory projection becomes dangerous if backup/export/restore code serializes it as though it were the complete database.

HaejeokRisuai provides two consistent examples of the paired requirement:

- `391c2574df6170dd91a5e68624ae8c9b5afb6be1` defers large plugin definitions at startup, then explicitly hydrates plugin keys before complete snapshots and tests Android/RisuSave restoration.
- `fdd175297d23a1cd83e7e0484f04d0dbecf5c431` explicitly loads deferred chat-message batches before character export in both native SQLite and web SQLite paths, preventing portable character exports from silently omitting unloaded messages.

The reusable invariant is broader than either implementation: **a shallow runtime projection is never evidence that a persistence snapshot/export is complete**.

## Minimal safe scope

Define a runtime-neutral contract that distinguishes `SHALLOW_RUNTIME_STATE` from `COMPLETE_PERSISTENCE_SNAPSHOT`. Do not introduce a storage migration in the first slice. The first useful slice is ownership metadata + pure completeness checks + tests around an existing snapshot/export boundary.

## Ownership boundaries

- Browser/runtime state owns which domains are currently hydrated.
- Persistence/storage owns authoritative durable values.
- Backup/export owns requesting a complete logical snapshot; it must not infer completeness from the runtime object shape.
- Character/module-specific export owns complete hydration of the logical object being exported, including deferred chat/message domains relevant to that object.
- Restore/import owns validation and atomic replacement semantics; it must not rely on startup hydration state.
- Plugin runtime owns targeted V3 reload behavior and must remain compatible with lazy/deferred definitions.

## Proposed mechanism

1. Maintain an explicit set of deferred/unhydrated domain keys alongside runtime state.
2. Provide one persistence-owned `ensureCompleteSnapshot(domains?)`/equivalent boundary rather than scattering hydrate calls across UI callers.
3. Complete backup/export paths call that boundary before serialization.
4. Object-scoped exports request the exact domains needed for that object; e.g. character export must load every persisted chat/message batch that belongs in the exported character.
5. The boundary loads each required deferred domain from authoritative storage, joins concurrent hydration for the same key, and fails closed if a required domain cannot be loaded.
6. Restore writes authoritative storage first under existing safe replacement/rollback semantics, then initializes runtime hydration metadata consistently.
7. Never silently replace an unavailable deferred domain with an empty/default value in a complete snapshot.

## Compatibility / invariants

- No forced DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains a no-op unless separately reviewed.
- Preserve current save/integrity optimizations and revision/ETag semantics.
- Preserve targeted V3 plugin reload; do not introduce full-page reload as a shortcut.
- Backup/export created from shallow startup state must be logically equivalent to one created after full hydration.
- Character export must contain the same persisted chat messages whether those messages were already loaded in UI memory or still deferred in storage.
- Restore of a complete backup must preserve plugin definitions and plugin custom storage even if those domains are startup-deferred.
- Missing/corrupt deferred data causes an explicit backup/export failure rather than silent omission.

## Validation / acceptance

- Fixture with a large plugin script/domain starts in an explicitly unhydrated state.
- Fixture with one character containing multiple chats starts with at least one message batch unloaded.
- Complete backup hydrates required domains exactly once and includes byte-for-byte/logically equivalent plugin data.
- Character export from the unloaded-message fixture is logically equivalent to export after explicit full message hydration.
- Native SQLite and web SQLite export paths produce equivalent complete logical content.
- Concurrent backup/export calls do not duplicate hydration or observe partial results.
- Hydration failure aborts snapshot/export creation with actionable diagnostics and leaves durable state unchanged.
- Android/native SQLite replacement round-trip preserves plugin definitions and custom storage.
- Legacy RisuSave export/import round-trip preserves the same data.
- Plugin enable/update/targeted reload paths work whether the plugin domain began hydrated or deferred.
- Measure startup time, parsed object size/heap, export peak memory, and first-plugin-use latency before any readiness promotion.

## Risk / blast radius

`HIGH`: confusing shallow runtime state with authoritative persistence can create incomplete backups/exports or destructive restores. The design therefore keeps completeness enforcement inside persistence and fails closed on missing domains. A naive hydrate-everything implementation can also erase the memory gains of deferral, so object/domain-scoped completeness is preferred.

## Rollback / fallback

Disable deferral for any domain whose completeness/compatibility tests fail. Because the initial slice should add ownership/completeness checks without migrating storage, rollback is removing the deferral flag/check path while retaining existing durable data.

## Dependencies

- identify PocketRisu's actual snapshot/export and restore owners;
- enumerate all persisted domains that can be deferred;
- identify object-scoped export paths such as character export that serialize logical subsets of storage;
- define authoritative read APIs for each deferred domain;
- confirm plugin update/reload paths do not assume eager plugin definitions.

## PR decomposition

1. Pure completeness metadata/helper + unit tests, no domain deferral.
2. Add an object-scoped export completeness test around an existing lazy/unloaded domain, without changing storage architecture.
3. One non-security-sensitive domain behind deferral with startup/first-use/export benchmarks.
4. Plugin definitions only after targeted V3 update/reload and backup/restore tests pass.
5. Additional domains independently, one ownership boundary at a time.

Do not advance to `READY_TO_PORT` until PocketRisu's concrete snapshot/export owners are identified, completeness is enforced centrally, dependencies are resolved, and rollback/acceptance tests are executable.