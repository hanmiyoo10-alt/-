# PLUGIN-LAZY-ASSET-COMPAT-SNAPSHOT

## Status

`HOLD` until the personal fork has the matching lazy asset-manifest architecture and bounded manifest cache.

## Problem / evidence

Official PocketRisu commit `4a70de8d3c0853704dab22dedd63f19a600c42e0` fixed a compatibility regression caused by storing character assets lazily. Manifest-backed characters in DBState can carry only `additionalAssetManifest`, while existing v3 plugin APIs historically expose `additionalAssets`. Returning the raw lazy snapshot therefore silently removed assets from plugin reads; writing that hydrated compatibility shape back can also destroy laziness or alias cache-owned arrays if ownership is not explicit.

Forward follow-ups on 2026-08-30 materially strengthen this boundary:

- `1df37b5ab11e578896e390dbcd0478bc5e3b7b5b` extends compatibility hydration to modules and persona embedded modules because those plugin-facing objects have no per-item getter. It also demonstrates that the sentinel module id `$embedded` is not globally unique: cache identity must include persona ownership or persona switches can serve the previous embedded module.
- `e6e8ef040ec53ad132ecb572ada63538504079fa` restores module/persona manifest descriptors on unchanged plugin database write-back, mirroring the character contract.
- `2981235e49135b7e65849569a659e6954c91190d` proves that the bounded full-manifest LRU cannot be the authority for deciding whether a plugin returned the unchanged list. More than eight hydrated lazy modules can evict the earliest manifest before write-back. Snapshot compatibility therefore needs its own bounded handed-out identity/fingerprint, with the LRU only as a fallback when no handed-out identity exists.

## Minimal safe scope

When the matching lazy-manifest architecture exists in the personal fork, provide a compatibility adapter only at explicit v3 plugin boundaries:

1. hydrate requested detached character snapshots into the legacy `additionalAssets` shape;
2. for broad database reads, hydrate module assets and persona `embeddedModule.assets` because those domains have no per-item getter, while keeping characters lazy/documented;
3. do not mutate/hydrate DBState globally;
4. remember a bounded identity/fingerprint of each manifest-backed list actually handed to a plugin;
5. on write, restore the lazy descriptor only when the returned list matches the handed-out identity (or a still-resident cache fallback when no handed-out identity exists);
6. if the plugin changed the list, keep it inline and let the normal import/canonicalization owner handle it;
7. key embedded-module cache/state by persona ownership rather than the shared `$embedded` sentinel alone.

## Ownership boundaries

- durable/lazy asset representation: storage/manifests;
- bounded full-manifest cache: hydration performance cache, never sole snapshot authority;
- bounded handed-out identity/fingerprint state: compatibility write-back authority;
- v3 per-character APIs: character legacy-shape adapter;
- v3 broad database API: module/persona embedded-module compatibility hydration where no per-item getter exists;
- persona/module lookup cache: identity must include persona for `$embedded` modules;
- plugin runtime: receives detached data and cannot alias cache-owned arrays;
- canonicalization/import path: owns changed asset lists after plugin writes.

## Mechanism

Build detached plugin-facing snapshots from descriptor-backed owners. Hydrate only required manifests. Record a bounded fingerprint keyed by manifest id whenever an asset list is handed to a plugin. On write-back, compare against that remembered identity first; cache equality is only a fallback if no handed-out record exists. Exact unchanged content restores the descriptor; changed content remains inline. A failed hydration degrades to the descriptor-bearing snapshot rather than rejecting the whole plugin read.

For persona embedded modules, never use `$embedded` as a globally unique cache key. Include persona identity (or another durable owner identity) so switching personas cannot reuse a different persona's embedded module.

## Compatibility / invariants

- existing v3 per-character APIs continue to expose legacy `additionalAssets` when hydration succeeds;
- modules and persona embedded modules returned via broad plugin DB reads expose filled `assets` when hydration succeeds because no per-item getter can recover them later;
- characters in broad DB reads may remain lazy when the API has an explicit per-character getter and documents the contract;
- DBState remains lazy and is not mutated by a plugin read;
- plugin in-place edits cannot alias cache-owned data;
- a field-only plugin edit does not rewrite or inline an unchanged manifest even if the hydration LRU evicted it before write-back;
- a genuinely changed asset list is not discarded in favor of the old descriptor;
- LRU residency is never treated as proof of snapshot identity;
- handed-out compatibility identity is bounded and cannot grow without limit;
- persona switching cannot reuse another persona's `$embedded` module cache entry;
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
- broad database reads fill module and persona embedded-module assets while leaving documented character laziness intact;
- subset DB reads tolerate absent modules/personas;
- more manifests than the full-manifest LRU capacity are hydrated, the first entry is evicted, and unchanged write-back still restores every descriptor;
- after the same eviction, an edited list remains inline;
- handed-out identity storage is bounded and old entries have deterministic fallback behavior;
- switching between two personas whose embedded modules both use `$embedded` never serves the previous persona's module;
- targeted V3 reload behavior is unchanged.

Acceptance requires all tests plus confirmation that hydration remains bounded to the compatibility surface being requested.

## Risk / blast radius

`MEDIUM`. This crosses plugin compatibility, lazy storage, cache ownership, persona/module identity, and write canonicalization. A wrong comparison can lose plugin asset edits; aliasing can corrupt the cache; an identity collision can cross-contaminate personas; eager hydration can erase the memory benefit of the storage design; unbounded handed-out tracking can itself leak memory.

## Rollback / fallback

Keep the current personal-fork eager/legacy behavior until the full dependency set exists. If the compatibility adapter misbehaves after a future lazy-manifest sync, disable that adapter and retain descriptor-backed data rather than rewriting manifests or force-hydrating the whole DB. If handed-out identity is unavailable, fail toward preserving a changed inline list rather than incorrectly restoring an old descriptor.

## Dependencies

- lazy character/module asset-manifest representation;
- bounded full-manifest cache;
- explicit bounded handed-out identity/fingerprint owner;
- persona-aware identity for embedded modules;
- explicit canonicalization path for changed inline asset lists;
- v3 read/write owners compatible with async hydration where required.

Current personal-fork `develop@e57c0435018646800566f2158fd1a9fa12caa9e2` predates the reviewed architecture slice, so these dependencies are unresolved.

## PR decomposition

When dependencies exist:

1. tests/helpers for detached character/module hydration, handed-out identity, and unchanged/changed write classification;
2. isolated v3 character API compatibility integration;
3. isolated broad DB module/persona embedded-module compatibility integration plus persona-aware `$embedded` cache identity;
4. documentation/type refinement for the mixed broad-read contract.

Do not mix storage migration, plugin reload behavior, or unrelated cleanup into these PRs.

## References

- Initial source: `PocketRisu/PocketRisu@4a70de8d3c0853704dab22dedd63f19a600c42e0`
- Strengthening sources: `PocketRisu/PocketRisu@1df37b5ab11e578896e390dbcd0478bc5e3b7b5b`, `@e6e8ef040ec53ad132ecb572ada63538504079fa`, `@2981235e49135b7e65849569a659e6954c91190d`
- Initial forward review: `notes/forward-reviews/2026-08-30-2035-pocketrisu-615b79df-to-a6c00ed4.md`
- Current forward review: `notes/forward-reviews/2026-08-30-2140-pocketrisu-a6c00ed4-to-cd5bc2df.md`
- Current ledger addendum: `notes/idea-ledger-addenda/2026-08-30-2140-forward.md`
