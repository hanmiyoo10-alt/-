# Feature-ID: ASSET-REFERENCE-PROJECTION

## Problem / evidence

External evidence from `nevaeh5379/HaejeokRisuai@b46e748658bc6f867d2a2915e34ad604dba91636` shows an orphan-analysis path that avoids hydrating full character state by reading only asset-bearing fields. The transferable idea is not its SQL schema; it is the separation between destructive cleanup policy and a bounded, read-only reference projection.

## Minimal safe scope

If PocketRisu has a matching orphan/reference-analysis owner, the first slice should only add a read-only projection reader plus parity tests. It must not alter deletion policy, cleanup triggering, retention policy, or asset mutation semantics.

## Ownership boundaries

- storage/reference reader owns projection completeness;
- orphan-analysis logic owns reference-set interpretation;
- destructive cleanup remains downstream and must fail closed when completeness is uncertain;
- UI/diagnostics may consume projection results but must not upgrade them into deletion authority.

## Mechanism

Define an explicit inventory of asset-bearing fields/domains. Read only those fields for reference discovery. Return both the reference set and a completeness signal/version. New or unknown asset-bearing domains must invalidate completeness rather than being silently ignored.

## Compatibility / invariants

- projected reference discovery must equal full-hydration reference discovery for every supported asset-bearing field;
- unknown/new asset domains must produce a non-destructive/fail-closed outcome;
- no change to current PocketRisu save/integrity optimizations;
- no forced DB flush on `visibilitychange`/`pagehide`;
- `flushServerDbKeepalive()` remains no-op;
- targeted V3 plugin reload remains unchanged;
- runit remains unchanged; no PM2;
- server phone notification behavior remains unchanged.

## Validation / acceptance

1. Fixture matrix covering every current asset-bearing character/plugin/specialized domain.
2. Full-hydration reference set equals projected reference set.
3. A fixture with an intentionally unlisted asset-bearing field causes the projection to report incomplete/unsafe, never an empty-safe result.
4. Memory/IO benchmark demonstrates useful savings before adoption is justified.
5. No destructive cleanup behavior changes in the projection PR.

## Risk / blast radius

Risk is `MEDIUM` because an incomplete projection can become a false-orphan data-loss precursor if downstream code trusts it. Blast radius is contained only if completeness is explicit and deletion remains fail-closed.

## Rollback / fallback

Disable the projection path and fall back to existing full reference discovery. Because the first slice is read-only, rollback should require no data migration.

## Dependencies

- identify a matching PocketRisu-owned orphan/reference-analysis path;
- inventory all current asset-bearing fields/domains;
- create projected-vs-full parity fixtures;
- confirm a measurable memory/IO problem worth optimizing.

## PR decomposition

1. Tests/fixtures and field-domain inventory only.
2. Read-only projection implementation behind existing analysis owner.
3. Optional performance wiring only after parity and fail-closed behavior are proven.

Lifecycle remains `DESIGN_NEEDED`; do not move to `READY_TO_PORT` until the dependencies above are resolved.
