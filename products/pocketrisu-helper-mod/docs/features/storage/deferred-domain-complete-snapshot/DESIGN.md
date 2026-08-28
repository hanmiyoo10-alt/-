# Feature-ID: STORAGE-DEFERRED-DOMAIN-COMPLETE-SNAPSHOT

## Status

Assistant-owned design draft. `DESIGN_NEEDED`; not implementation-authorized.

## Problem / evidence

Large persisted domains can dominate startup parse time and browser memory. Deferring them from the shallow startup object is attractive, but a shallow in-memory projection becomes dangerous if backup/export/restore code serializes it as though it were the complete database. HaejeokRisuai `391c2574df6170dd91a5e68624ae8c9b5afb6be1` demonstrates the paired requirement: defer large plugin definitions at startup, then explicitly hydrate plugin keys before complete snapshots and test Android/RisuSave restoration.

## Minimal safe scope

Define a runtime-neutral contract that distinguishes `SHALLOW_RUNTIME_STATE` from `COMPLETE_PERSISTENCE_SNAPSHOT`. Do not introduce a storage migration in the first slice. The first useful slice is ownership metadata + pure completeness checks + tests around an existing snapshot boundary.

## Ownership boundaries

- Browser/runtime state owns which domains are currently hydrated.
- Persistence/storage owns authoritative durable values.
- Backup/export owns requesting a complete logical snapshot; it must not infer completeness from the runtime object shape.
- Restore/import owns validation and atomic replacement semantics; it must not rely on startup hydration state.
- Plugin runtime owns targeted V3 reload behavior and must remain compatible with lazy/deferred definitions.

## Proposed mechanism

1. Maintain an explicit set of deferred/unhydrated domain keys alongside runtime state.
2. Provide one `ensureCompleteSnapshot(domains?)`-style boundary owned by persistence, not by individual UI callers.
3. Complete backup/export paths call that boundary before serialization.
4. The boundary loads each required deferred domain from authoritative storage, joins concurrent hydration for the same key, and fails closed if a required domain cannot be loaded.
5. Restore writes authoritative storage first under existing safe replacement/rollback semantics, then initializes runtime hydration metadata consistently.
6. Never silently replace an unavailable deferred domain with an empty/default value in a complete snapshot.

## Compatibility / invariants

- No forced DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains a no-op unless separately reviewed.
- Preserve current save/integrity optimizations and revision/ETag semantics.
- Preserve targeted V3 plugin reload; do not introduce full-page reload as a shortcut.
- Backup/export created from shallow startup state must be logically equivalent to one created after full hydration.
- Restore of a complete backup must preserve plugin definitions and plugin custom storage even if those domains are startup-deferred.
- Missing/corrupt deferred data causes an explicit backup/export failure rather than silent omission.

## Validation / acceptance

- Fixture with a large plugin script/domain starts in an explicitly unhydrated state.
- Complete backup hydrates required domains exactly once and includes byte-for-byte/logically equivalent plugin data.
- Concurrent backup calls do not duplicate hydration or observe partial results.
- Hydration failure aborts snapshot creation with actionable diagnostics and leaves durable state unchanged.
- Android/native SQLite replacement round-trip preserves plugin definitions and custom storage.
- Legacy RisuSave export/import round-trip preserves the same data.
- Plugin enable/update/targeted reload paths work whether the plugin domain began hydrated or deferred.
- Measure startup time, parsed object size/heap, and first-plugin-use latency before any readiness promotion.

## Risk / blast radius

`HIGH`: confusing shallow runtime state with authoritative persistence can create incomplete backups or destructive restores. The design therefore keeps completeness enforcement inside persistence and fails closed on missing domains.

## Rollback / fallback

Disable deferral for any domain whose completeness/compatibility tests fail. Because the initial slice should add ownership/completeness checks without migrating storage, rollback is removing the deferral flag/check path while retaining existing durable data.

## Dependencies

- identify PocketRisu's actual snapshot/export and restore owners;
- enumerate all persisted domains that can be deferred;
- define authoritative read APIs for each deferred domain;
- confirm plugin update/reload paths do not assume eager plugin definitions.

## PR decomposition

1. Pure completeness metadata/helper + unit tests, no domain deferral.
2. One non-security-sensitive domain behind deferral with startup/first-use benchmarks.
3. Plugin definitions only after targeted V3 update/reload and backup/restore tests pass.
4. Additional domains independently, one ownership boundary at a time.

Do not advance to `READY_TO_PORT` until PocketRisu's concrete snapshot owner is identified, completeness is enforced centrally, dependencies are resolved, and rollback/acceptance tests are executable.