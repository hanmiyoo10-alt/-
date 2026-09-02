# PLUGIN-STORAGE-PARTIAL-WRITES-DO-NOT-IMPLY-DELETE

## Status

`ADOPTED` — historical PocketRisu compatibility invariant.

## Problem / evidence

PocketRisu externalized `pluginCustomStorage` from the main DB object into a server-backed per-key store. The compatibility DB surface still exposes `pluginCustomStorage` as `{}`. A plugin that performs the ordinary `getDatabase() -> mutate -> setDatabase()/setDatabaseLite()` round-trip may therefore supply an empty or partial object even while the backing store contains many unrelated keys.

Official commit `PocketRisu/PocketRisu@ebe32742a22b123eb0c52e4dc387d641090dee8a` documents a concrete dogfood failure where replacement semantics reduced the store from 255 keys to 43 and then 0. The adopted fix changes compatibility writes to merge explicit keys and keeps full deletion as an explicit operation (`pluginStorage.clear()`).

## Minimal safe scope

At the DB/plugin-storage compatibility adapter only:

- keys present in an incoming `pluginCustomStorage` object may be written/updated;
- keys omitted from that object must remain untouched;
- empty-object assignment is a no-op for the externalized store;
- destructive clear/delete must require an explicit destructive API path.

## Ownership boundaries

- Main DB compatibility object: may carry an incomplete/empty representation and therefore has no authority to delete omitted backing-store keys.
- Server-backed plugin storage: authoritative durable key set.
- Explicit storage delete/clear APIs: own destructive intent.
- Plugin runtime reload/update paths: out of scope; targeted V3 reload remains unchanged.

## Mechanism

Use merge semantics for `db.pluginCustomStorage = obj` and bulk database setters. Validate that `obj` is object-like; iterate only its own entries into the backing store. Never clear the backing store merely because an incoming compatibility object omits keys.

## Compatibility / invariants

1. Missing key != delete intent.
2. Empty compatibility view != empty authoritative store.
3. Partial compatibility round-trip must preserve unrelated plugin keys.
4. Explicit clear/delete remains available and is the only destructive authority.
5. Preserve PocketRisu targeted V3 plugin reload and existing plugin-storage integrity behavior.

## Validation / acceptance

- With unrelated key `other-plugin` present, `setDatabase({pluginCustomStorage:{}})` preserves it.
- With unrelated key plus one updated key, partial assignment updates only the supplied key.
- Explicit clear/delete still removes the intended key(s).
- Main DB field remains compatible with the externalized-storage representation.
- No full-page/plugin-wide reload regression is introduced.

## Risk / blast radius

`MEDIUM`: a wrong adapter semantic can delete durable state across plugins. The implementation is tiny, but the persistence blast radius is cross-plugin.

## Rollback / fallback

If compatibility behavior regresses, revert adapter changes while preserving the externalized backing store and explicit clear/delete API. Never fall back to replacement-by-omission semantics without a complete authoritative snapshot contract.

## Dependencies

`NONE` for preserving the adopted invariant. Historical migration context: `f0d4eee35ca0b4ac7e5fb4ee4668205b46723a44`.

## PR decomposition

No new PR required: invariant is already adopted upstream. Any future compatibility refactor touching this boundary should carry regression tests for empty and partial round-trips in the same PR.

## Durable references

- Source: `PocketRisu/PocketRisu@ebe32742a22b123eb0c52e4dc387d641090dee8a`
- Registry review: `hanmiyoo10-alt/PocketRisu@notes/external-risu-dev-watch:notes/backfill-reviews/2026-09-02-1533-pocketrisu-plugin-storage-merge-not-replace.md`
- Ledger addendum: `hanmiyoo10-alt/PocketRisu@notes/external-risu-dev-watch:notes/idea-ledger-addenda/2026-09-02-1533.md`