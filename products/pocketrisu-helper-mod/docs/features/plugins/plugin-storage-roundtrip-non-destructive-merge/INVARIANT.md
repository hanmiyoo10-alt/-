# PLUGIN-STORAGE-ROUNDTRIP-NON-DESTRUCTIVE-MERGE

## Problem / evidence

PocketRisu externalized `pluginCustomStorage` from the main DB object into a separate server-backed store. The compatibility DB view still exposes the field as `{}`. A generic `getDatabase() -> mutate -> setDatabase()` round-trip can therefore hand back an empty or partial object even though the external store contains many keys. `PocketRisu/PocketRisu@ebe32742a22b123eb0c52e4dc387d641090dee8a` records a real destructive failure where replace semantics wiped unrelated plugin data.

## Minimal safe scope

Preserve the existing rule: assignment/bulk DB writes merge only supplied `pluginCustomStorage` keys. Missing keys never mean delete. Full deletion requires an explicit destructive API such as `pluginStorage.clear()`.

## Ownership boundaries

- Generic DB compatibility projection owns only the values it explicitly carries.
- External plugin storage owns keys omitted from that projection.
- Destructive full-store authority belongs only to explicit destructive APIs, never to absence in a compatibility-shaped object.

## Mechanism

Route generic `pluginCustomStorage` assignment through merge semantics. Reject the inference that an omitted key should be removed. Keep explicit clear/delete surfaces separate and auditable.

## Compatibility / invariants

- Empty round-trips preserve all existing plugin keys.
- Partial writes update only supplied keys.
- Other plugins' keys survive Module Manager / Plugin Manager style round-trips.
- Explicit clear remains available and visibly destructive.
- This rule survives future storage externalization or compatibility-view refactors.

## Validation / acceptance

Focused tests must cover empty round-trip preservation, partial update preservation, explicit clear behavior, and all generic DB setters that can carry `pluginCustomStorage`. Any future path that reconstructs a compatibility DB object must prove it cannot turn hidden/externalized state into implicit deletion authority.

## Risk / blast radius

Wrong replace semantics can delete persistent state across unrelated plugins. The guard itself is localized and easy to preserve, but regression blast radius is high because data loss spans plugin ownership boundaries.

## Rollback / fallback

If merge routing regresses, disable the affected generic setter path rather than restoring replace semantics. Recovery should restore plugin storage from backup/revision history where available; do not guess missing keys.

## Dependencies

None. This is an already-adopted invariant.

## PR decomposition

No implementation PR is needed now. If this area changes later, keep any semantic change to generic DB projection/write authority in its own PR with the focused regression matrix above.
