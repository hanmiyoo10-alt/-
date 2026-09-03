# PARTIAL-BACKUP-EMBEDS-EXTERNALIZED-PLUGIN-STORAGE

## Status

`ADOPTED`

## Source evidence

- `PocketRisu/PocketRisu@343c2e278414e5d050b8192a49f55755aeb3639b`
- Preserved on `PocketRisu/PocketRisu:develop@278251f85a19bfdfd4cf3faae780e62682878f9e`

## Problem

Plugin custom storage was externalized from the ordinary browser DB object, leaving the client-facing `pluginCustomStorage` projection empty by design. Partial local backup encoded the client DB copy, while restore/import could replace plugin storage wholesale. A backup that omitted the authoritative external store could therefore restore as an empty plugin store and destroy plugin state.

## Invariant

Any backup/export that can later replace an authoritative domain must embed a complete snapshot of that domain even when the ordinary client/database projection is sparse, lazy, stubbed, or intentionally empty.

For plugin storage specifically:

- partial local backup assembles the authoritative plugin store before encoding;
- snapshot assembly is detached from the live store;
- one-off backup reads must not change normal preload/LRU ownership;
- unusual valid keys such as `__proto__` remain own enumerable properties;
- omission must never be interpreted as authoritative emptiness merely because the browser DB projection is empty.

## Compatibility / guardrails

- Preserve existing PocketRisu save/integrity optimizations.
- Do not introduce lifecycle-triggered full DB flushes.
- Keep `flushServerDbKeepalive()` behavior unchanged.
- This invariant is about archive completeness, not about changing normal plugin-storage hydration or merge semantics.

## Validation

Preserve focused tests that prove `snapshotAll()` returns every key, is detached, does not flip preload state, and safely preserves special property names. Prefer a full partial-backup→restore regression whenever restore behavior or externalized domains change.

## Risk / blast radius

Failure is high risk because a restore may destructively replace omitted plugin state. The backup-side full snapshot is one-off and may cost memory/I/O, so it must remain bounded and should not turn into steady-state eager hydration.

## Rollback / fallback

If backup assembly regresses, disable or block the affected partial-backup path rather than emitting an archive known to omit a replace-on-restore domain. Do not silently fall back to the sparse browser projection.

## Follow-up rule

Whenever another DB domain is externalized or lazily hydrated, audit every backup/export/import variant for replace-vs-merge restore semantics. If restore replaces a domain, archive creation must explicitly close over that domain's authoritative store.
