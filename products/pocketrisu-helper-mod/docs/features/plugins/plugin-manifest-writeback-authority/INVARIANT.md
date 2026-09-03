# Feature-ID: PLUGIN-MANIFEST-WRITEBACK-AUTHORITY

## Status

`ADOPTED` — invariant/dossier only. No autonomous implementation is needed.

## Problem / evidence

`PocketRisu/PocketRisu@f79c8989fe2e5630e2c85f4449a868ec069300c8` fixed a persistent-data bug introduced by lazy asset manifests at the plugin compatibility boundary. Plugins reading characters through `getDatabase()` could see no hydrated `additionalAssets`, edit from that incomplete shape, and return an object carrying both an inline asset list and a manifest descriptor. The client could display the inline list while server persistence retained the descriptor, making the edit disappear after reload.

## Minimal safe scope

Preserve explicit authority resolution only at detached plugin snapshot/write-back boundaries. Do not eagerly hydrate normal DBState or change general manifest storage semantics.

## Ownership boundaries

- Browser/plugin compatibility snapshot: may hydrate manifest-backed asset lists into detached copies.
- Browser DBState: remains manifest-lazy.
- Write-back resolver: decides whether an inline list is unchanged, a legitimate edit, stale, or never safely hydrated.
- Server/storage: persists the representation selected by the resolver; array+descriptor coexistence must not survive as ambiguous authority.

## Mechanism

1. Hydrate asset-bearing character/module/persona snapshots before asynchronous plugin `getDatabase()` exposure.
2. Remember enough manifest identity/fingerprint information to distinguish an untouched hydrated round-trip from an actual edit.
3. On write-back, restore the descriptor for unchanged lists; allow a safely hydrated changed list to become inline; reject/discard stale or never-hydrated incomplete writes rather than replacing authoritative state.
4. Match character ownership by `chaId`, not array position.

## Compatibility / invariants

- A stored object must not leave an inline asset array beside a competing manifest descriptor.
- Unchanged plugin round-trips remain storage-no-op for asset content.
- Legitimate hydrated edits must not be silently masked by an old descriptor.
- Lazy/cache-miss compatibility reads must not gain destructive replacement authority.
- Snapshot hydration must copy lists so plugin mutation cannot alter the comparison/cache instance.
- Targeted V3 plugin reload behavior remains unchanged.

## Validation / acceptance

Required regression cases: unchanged hydrated round-trip restores descriptor; edited hydrated list wins; stale manifest read cannot overwrite newer state; lazy/unhydrated incomplete write is discarded; reordered characters resolve by `chaId`; module/persona equivalents retain the same authority rule; hydration failure is non-destructive.

Acceptance is preservation of current behavior at the reviewed PocketRisu tip without new eager DB hydration or persistence format changes.

## Risk / blast radius

`HIGH`: incorrect authority selection can silently lose persistent plugin edits or existing assets. Compatibility behavior spans V2/V3 plugin APIs and lazy manifest storage.

## Rollback / fallback

For any future refactor, rollback to the last known resolver and snapshot implementation as a unit. Do not partially revert only hydration or only write-back arbitration, because either half alone recreates ambiguous authority.

## Dependencies

`NONE` for preservation. Any redesign of lazy manifests or plugin database compatibility must explicitly depend on this invariant.

## PR decomposition

No new PR is required for the adopted state. Future changes should keep one isolated PR for snapshot/write-back authority tests before broader manifest or plugin API refactors.

## Durable source records

- Source: `PocketRisu/PocketRisu@f79c8989fe2e5630e2c85f4449a868ec069300c8`
- Current preservation inspected: `PocketRisu/PocketRisu@278251f85a19bfdfd4cf3faae780e62682878f9e`
- Risu-family ledger: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch/notes/idea-ledger-addenda/2026-09-03-2338-plugin-manifest-writeback-authority.md`
