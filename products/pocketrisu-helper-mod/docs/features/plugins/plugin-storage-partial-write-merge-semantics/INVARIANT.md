# PLUGIN-STORAGE-PARTIAL-WRITE-MERGE-SEMANTICS

Status: ADOPTED invariant
Source: `PocketRisu/PocketRisu@ebe32742a22b123eb0c52e4dc387d641090dee8a`

## Problem / evidence

PocketRisu externalizes plugin custom storage from the ordinary client DB object. The compatibility-facing `db.pluginCustomStorage` can therefore be empty or partial even while the authoritative server-backed store contains many keys. An ordinary plugin round-trip through `getDatabase() -> mutate -> setDatabase()/setDatabaseLite()` previously treated the returned empty/partial object as full replacement state and erased omitted keys. The source commit records a dogfood loss sequence from 255 keys to 43 to 0 and adds regressions.

## Invariant

An incomplete compatibility view must not acquire destructive replacement authority merely because it is accepted by a generic database setter.

- supplied plugin-storage keys may update/merge into the authoritative store;
- missing keys mean **unspecified**, not delete;
- full destructive clear/replacement requires a separate explicit operation or a contract that proves the incoming snapshot is complete and authoritative;
- externalization/lazy hydration must not silently change omission semantics from benign to destructive.

## Compatibility / ownership boundaries

The authoritative plugin-storage store owns durable key presence. Generic V2/V3 DB compatibility surfaces may expose incomplete views and therefore do not own deletion-by-omission. Explicit `pluginStorage.clear()`-style APIs retain destructive intent.

Do not generalize this invariant to APIs whose documented contract guarantees a complete authoritative snapshot; for those, replacement can still be correct if validation/rollback are adequate.

## Validation / acceptance

Preserve tests for:

1. empty `pluginCustomStorage` round-trip does not erase existing keys;
2. partial assignment updates supplied keys and preserves unrelated keys;
3. explicit clear remains capable of clearing the store;
4. future migration/hydration paths cannot invoke replacement unless completeness/authority is proven.

## Risk / blast radius

Risk is MEDIUM because violating the invariant can destroy unrelated plugin state. The adopted merge behavior is localized and rollback-safe, but any future reintroduction of replacement semantics must be treated as a data-integrity change.

## Rollback / fallback

If a new replacement path proves unsafe, fall back to merge-only compatibility writes plus explicit clear/replace APIs. Never infer destructive intent from omitted keys in an incomplete view.

## Related invariants

- `PLUGIN-STORAGE-REFRESH-TOP-UP-ONLY`: read/refresh scope, not write completeness.
- `OPTIMISTIC-CACHE-ROLLBACK-USES-WRITE-GENERATION`: concurrent rollback ownership, not deletion semantics.
- lazy-manifest provenance invariants: analogous ownership principle but a different storage domain.

## PR decomposition

No implementation PR is required: this invariant is already adopted in official PocketRisu. Future changes touching plugin-storage compatibility writes should cite this Feature-ID and include the acceptance cases above.
