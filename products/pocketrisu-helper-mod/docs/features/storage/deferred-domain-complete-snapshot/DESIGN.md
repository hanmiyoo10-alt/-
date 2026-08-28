# Feature-ID: STORAGE-DEFERRED-DOMAIN-COMPLETE-SNAPSHOT

## Status

Assistant-owned design draft. `DESIGN_NEEDED`; not implementation-authorized.

## Problem / evidence

Large persisted domains can dominate startup parse time and browser memory. Deferring them from the shallow startup object is attractive, but a shallow in-memory projection becomes dangerous if backup/export/restore code serializes it as though it were the complete database.

HaejeokRisuai provides several consistent examples of the paired requirement:

- `391c2574df6170dd91a5e68624ae8c9b5afb6be1` defers large plugin definitions at startup, then explicitly hydrates plugin keys before complete snapshots and tests Android/RisuSave restoration.
- `fdd175297d23a1cd83e7e0484f04d0dbecf5c431` explicitly loads deferred chat-message batches before character export in both native SQLite and web SQLite paths, preventing portable character exports from silently omitting unloaded messages.
- `5ddf12b9e5129186486ceee42363a896e23a6188` and `e6465f500f755dea89141b6a3dba73408a8bf113` add a newly durable `inlay` domain to shared backup entry classification and Android-native backup writing, then separate signature inlays from media materialization. This shows that completeness is not only hydration: every durable domain must also be represented in format classification and every supported backup path.
- `9b150a269a757e0dd20c10267396383ae4d3793b` and `56b0385ce70bb0acf1475a7f34679b13d07a8173` hydrate shallow character details into the export target before serialization and add regression coverage, independently reinforcing logical export equivalence between shallow and fully hydrated runtime state.

The reusable invariant is broader than any one implementation: **a shallow runtime projection is never evidence that a persistence snapshot/export is complete, and a backup format is not complete unless every durable logical domain is explicitly classified and covered by every supported writer/restore path**.

## Minimal safe scope

Define a runtime-neutral contract that distinguishes `SHALLOW_RUNTIME_STATE` from `COMPLETE_PERSISTENCE_SNAPSHOT`. Do not introduce a storage migration in the first slice. The first useful slice is ownership metadata + pure completeness checks + explicit durable-domain classification fixtures around an existing snapshot/export boundary.

## Ownership boundaries

- Browser/runtime state owns which domains are currently hydrated.
- Persistence/storage owns authoritative durable values.
- Backup/export owns requesting a complete logical snapshot; it must not infer completeness from the runtime object shape.
- Backup format/classifier owns an exhaustive mapping of durable logical domains to container entry kinds; generic fallback must not silently absorb a typed domain.
- Character/module-specific export owns complete hydration of the logical object being exported, including deferred chat/message/details domains relevant to that object.
- Restore/import owns validation and atomic replacement semantics; it must not rely on startup hydration state.
- Media/parser code owns type-aware materialization: non-media typed records such as signatures must not become blob/media URLs merely because they live in a related container family.
- Plugin runtime owns targeted V3 reload behavior and must remain compatible with lazy/deferred definitions.

## Proposed mechanism

1. Maintain an explicit set of deferred/unhydrated domain keys alongside runtime state.
2. Maintain an explicit durable-domain registry used by backup/export classification tests. Adding a persisted domain is incomplete until the registry, every supported writer, and restore/import coverage are updated.
3. Provide one persistence-owned `ensureCompleteSnapshot(domains?)`/equivalent boundary rather than scattering hydrate calls across UI callers.
4. Complete backup/export paths call that boundary before serialization.
5. Object-scoped exports request the exact domains needed for that object; e.g. character export must load every persisted chat/message/detail batch that belongs in the exported character.
6. The boundary loads each required deferred domain from authoritative storage, joins concurrent hydration for the same key, and fails closed if a required domain cannot be loaded.
7. Backup classifiers reject or explicitly type unknown/new durable entry families instead of relying on an unsafe generic-asset fallback.
8. Typed non-media records are handled by their semantic type and excluded from media URL creation/preview paths.
9. Restore writes authoritative storage first under existing safe replacement/rollback semantics, then initializes runtime hydration metadata consistently.
10. Never silently replace an unavailable deferred domain with an empty/default value in a complete snapshot.

## Compatibility / invariants

- No forced DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains a no-op unless separately reviewed.
- Preserve current save/integrity optimizations and revision/ETag semantics.
- Preserve targeted V3 plugin reload; do not introduce full-page reload as a shortcut.
- Backup/export created from shallow startup state must be logically equivalent to one created after full hydration.
- Character export must contain the same persisted character details and chat messages whether those domains were already loaded in UI memory or still deferred in storage.
- Restore of a complete backup must preserve plugin definitions and plugin custom storage even if those domains are startup-deferred.
- Every persisted domain has an explicit backup entry classification and round-trip fixture across each supported backup implementation.
- Adding a durable domain without backup/export/restore classification coverage is a test failure, not an implicit generic fallback.
- Typed non-media records must not be materialized as media blobs/URLs.
- Missing/corrupt deferred data causes an explicit backup/export failure rather than silent omission.

## Validation / acceptance

- Fixture with a large plugin script/domain starts in an explicitly unhydrated state.
- Fixture with one character containing multiple chats starts with at least one message batch and one character detail domain unloaded.
- Complete backup hydrates required domains exactly once and includes byte-for-byte/logically equivalent plugin data.
- Character export from the unloaded fixture is logically equivalent to export after explicit full hydration.
- Durable-domain registry fixture enumerates every currently supported backup entry family and fails when a persisted domain lacks classifier/writer/restore coverage.
- Native SQLite and web SQLite export paths produce equivalent complete logical content.
- Native Android/server/web backup implementations round-trip the same durable-domain fixtures where those implementations exist.
- Typed signature/non-media fixtures are preserved as typed records and never enter media URL creation paths.
- Concurrent backup/export calls do not duplicate hydration or observe partial results.
- Hydration failure aborts snapshot/export creation with actionable diagnostics and leaves durable state unchanged.
- Android/native SQLite replacement round-trip preserves plugin definitions and custom storage.
- Legacy RisuSave export/import round-trip preserves the same data.
- Plugin enable/update/targeted reload paths work whether the plugin domain began hydrated or deferred.
- Measure startup time, parsed object size/heap, export peak memory, and first-plugin-use latency before any readiness promotion.

## Risk / blast radius

`HIGH`: confusing shallow runtime state with authoritative persistence, or omitting a durable domain from format classification, can create incomplete backups/exports or destructive restores. Generic fallback classification can also reinterpret typed records incorrectly. The design therefore keeps completeness enforcement inside persistence/format ownership, requires explicit domain coverage, and fails closed on missing domains. A naive hydrate-everything implementation can also erase the memory gains of deferral, so object/domain-scoped completeness is preferred.

## Rollback / fallback

Disable deferral for any domain whose completeness/compatibility tests fail. If a new durable domain cannot be safely represented by all required backup paths, keep that domain out of portable backup/export until an explicit format path exists rather than silently treating it as a generic asset. Because the initial slice should add ownership/completeness checks without migrating storage, rollback is removing the deferral flag/check path while retaining existing durable data.

## Dependencies

- identify PocketRisu's actual snapshot/export and restore owners;
- enumerate all persisted domains and every supported backup classifier/writer/restore implementation;
- identify object-scoped export paths such as character export that serialize logical subsets of storage;
- define authoritative read APIs for each deferred domain;
- confirm plugin update/reload paths do not assume eager plugin definitions;
- define the policy for unknown/new backup entry families so they fail explicitly rather than being silently misclassified.

## PR decomposition

1. Pure completeness metadata/helper + durable-domain registry/classifier fixtures; no domain deferral and no storage migration.
2. Add an object-scoped export completeness test around an existing lazy/unloaded domain, without changing storage architecture.
3. Add parity fixtures for every existing backup implementation (web/server/native where applicable), including typed non-media records.
4. One non-security-sensitive domain behind deferral with startup/first-use/export benchmarks.
5. Plugin definitions only after targeted V3 update/reload and backup/restore tests pass.
6. Additional domains independently, one ownership boundary at a time.

Do not advance to `READY_TO_PORT` until PocketRisu's concrete snapshot/export owners and durable-domain inventory are identified, completeness is enforced centrally, all supported backup paths have executable parity coverage, dependencies are resolved, and rollback/acceptance tests are executable.