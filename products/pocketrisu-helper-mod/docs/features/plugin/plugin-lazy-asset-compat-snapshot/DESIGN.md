# PLUGIN-LAZY-ASSET-COMPAT-SNAPSHOT

## Status

`HOLD` until the personal fork has the matching lazy asset-manifest architecture and bounded manifest cache.

## Problem / evidence

Official PocketRisu commit `4a70de8d3c0853704dab22dedd63f19a600c42e0` fixed a compatibility regression caused by storing character assets lazily. Manifest-backed characters in DBState can carry only `additionalAssetManifest`, while existing v3 plugin APIs historically expose `additionalAssets`. Returning the raw lazy snapshot therefore silently removed assets from plugin reads; writing that hydrated compatibility shape back can also destroy laziness or alias cache-owned arrays if ownership is not explicit.

## Minimal safe scope

When the matching lazy-manifest architecture exists in the personal fork, provide a compatibility adapter only at the per-character v3 plugin API boundary:

1. hydrate one requested detached character snapshot into the legacy `additionalAssets` shape;
2. do not mutate/hydrate DBState globally;
3. on write, restore the lazy descriptor only when the asset list still equals the cached manifest;
4. if the plugin changed the list, keep it inline and let the normal import/canonicalization owner handle it;
5. keep broad `getDatabase()` semantics explicitly lazy/documented rather than silently hydrating the entire database.

## Ownership boundaries

- durable/lazy asset representation: storage/manifests;
- bounded full-manifest cache: compatibility hydration source;
- v3 per-character APIs: legacy-shape adapter only;
- plugin runtime: receives detached data and cannot alias cache-owned arrays;
- canonicalization/import path: owns changed asset lists after plugin writes.

## Mechanism

Use one helper to build a detached plugin-facing character snapshot from a descriptor-backed character. Hydrate only the requested manifest. Use a separate write-side helper to compare a plugin-returned `additionalAssets` list against the current cached manifest. Exact unchanged content restores the descriptor; changed content remains inline. A failed read hydration degrades to the descriptor-bearing snapshot rather than rejecting the whole plugin read.

## Compatibility / invariants

- existing v3 per-character APIs continue to expose legacy `additionalAssets` when hydration succeeds;
- DBState remains lazy and is not mutated by a read;
- plugin in-place edits cannot alias the cache used for unchanged-list comparison;
- a field-only plugin edit does not rewrite or inline an unchanged manifest;
- a genuinely changed asset list is not discarded in favor of the old descriptor;
- `getDatabase()` may remain lazy, but its type/docs must make that explicit;
- targeted V3 plugin reload remains unchanged;
- no save/flush, PM2/runit, Android notification, runtime/package, or parser-security behavior changes are introduced by this compatibility boundary.

## Validation / acceptance

Required tests:

- manifest-backed per-character read returns a detached `additionalAssets` array and omits the descriptor on success;
- failed manifest load returns a usable descriptor-bearing snapshot without global mutation;
- mutating returned assets does not mutate cache-owned data;
- field-only write with unchanged assets restores the descriptor;
- changed asset list remains inline;
- indexed/current-character aliases use the same boundary;
- broad database reads preserve documented lazy semantics;
- targeted V3 reload behavior is unchanged.

Acceptance requires all tests plus confirmation that only one requested manifest is hydrated per character read.

## Risk / blast radius

`MEDIUM`. This crosses plugin compatibility, lazy storage, cache ownership, and write canonicalization. A wrong comparison can lose plugin asset edits; aliasing can corrupt the cache; eager hydration can erase the memory benefit of the storage design.

## Rollback / fallback

Keep the current personal-fork eager/legacy behavior until the full dependency set exists. If the compatibility adapter misbehaves after a future lazy-manifest sync, disable that adapter and retain descriptor-backed data rather than rewriting manifests or force-hydrating the whole DB.

## Dependencies

- lazy character asset-manifest representation;
- bounded full-manifest cache with stable/content-addressed identity;
- explicit canonicalization path for changed inline asset lists;
- v3 character read/write owners compatible with an async read boundary.

Current personal-fork `develop@e57c0435018646800566f2158fd1a9fa12caa9e2` predates the reviewed architecture slice, so these dependencies are unresolved.

## PR decomposition

When dependencies exist:

1. test/helper PR for detached read hydration and unchanged/changed write classification;
2. isolated v3 per-character API integration PR;
3. optional documentation/type refinement for broad lazy database reads.

Do not mix storage migration, plugin reload behavior, or unrelated cleanup into these PRs.

## References

- Source: `PocketRisu/PocketRisu@4a70de8d3c0853704dab22dedd63f19a600c42e0`
- Forward review: `notes/forward-reviews/2026-08-30-2035-pocketrisu-615b79df-to-a6c00ed4.md`
- Ledger addendum: `notes/idea-ledger-addenda/2026-08-30-2036-forward.md`
