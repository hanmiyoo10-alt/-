# PLUGIN-HANDED-OUT-VIEW-WRITEBACK-AUTHORITY

Status: ADOPTED invariant

## Problem / evidence

PocketRisu exposes compatibility snapshots to plugins with lazy asset-manifest-backed fields materialized into ordinary asset arrays. An unchanged plugin round-trip must not convert that compatibility view back into inline persistent data.

Official PocketRisu first restored manifest descriptors when returned arrays matched the current manifest cache (`e6e8ef040ec53ad132ecb572ada63538504079fa`). A follow-up regression showed why the cache cannot be semantic authority: the full-manifest cache is a small LRU, so hydrating more entries than its capacity evicted early entries before write-back. Those unchanged entries then looked unknown and were re-inlined. `2981235e49135b7e65849569a659e6954c91190d` fixed this by remembering a fingerprint of the exact list handed to the plugin and using the LRU only as fallback evidence.

## Minimal safe scope

Preserve the existing PocketRisu behavior. This dossier is an invariant boundary for future refactors, not a request to introduce a new storage layer.

## Ownership boundaries

- Plugin compatibility hydration owns the detached, materialized view handed to legacy/plugin callers.
- Persistent asset-manifest storage owns the canonical lazy descriptor representation.
- Performance caches may accelerate reads but do not own semantic change detection.
- Write-back reconciliation owns the decision whether a returned compatibility view is unchanged or a real edit.

## Mechanism / invariant

1. When a lazy manifest-backed value is materialized for a plugin, record bounded provenance for the exact handed-out content keyed by the relevant manifest identity.
2. On write-back, compare the incoming value against that handed-out provenance first.
3. If unchanged, restore the canonical manifest descriptor and discard the compatibility-only inline materialization.
4. If changed, preserve the caller edit; do not restore the descriptor over it.
5. A bounded LRU/cache may be used only as fallback when no handed-out provenance exists. Cache eviction must not change write-back semantics.
6. Provenance bookkeeping itself must be bounded and must not become a new retention leak.

## Compatibility / guardrails

- Preserve targeted V3 plugin reload behavior.
- Do not alter server-phone notification, runit, save/visibility, or `flushServerDbKeepalive()` guardrails.
- Do not infer that cache residency implies caller intent.
- Do not suppress legitimate plugin edits because the current canonical descriptor happens to exist.
- Do not let unchanged compatibility round-trips collapse lazy manifest-backed storage into large inline arrays.

## Validation / acceptance

Regression coverage must include:

- unchanged module/persona/character compatibility round-trips restore lazy descriptors;
- more hydrated manifests than the performance-cache capacity, proving LRU eviction does not change semantics;
- a deliberately edited handed-out list remains an edit and is not restored to the old descriptor;
- malformed/non-array/non-owned DB keys pass through safely;
- provenance bookkeeping stays bounded;
- future cache-size changes do not affect write-back results.

Acceptance criterion: write-back behavior is identical whether the relevant performance-cache entry is resident or evicted.

## Risk / blast radius

Risk is MEDIUM because a false unchanged result could suppress a real plugin edit, while a false changed result can re-inline large lazy data and regress browser memory/database size. Scope is contained to plugin compatibility reconciliation.

## Rollback / fallback

If provenance reconciliation misbehaves, revert the narrow reconciliation change while retaining existing persistent manifests. Do not perform migration or destructive cleanup as part of rollback. A conservative fallback must prefer preserving an explicit incoming edit over silently discarding it.

## Dependencies

None for preserving the currently adopted invariant.

## PR decomposition

No implementation PR is required now because the invariant is already adopted upstream. If future refactoring touches this boundary, keep provenance/equality changes in one focused PR with the eviction regression test in the same change.

## Source history

- `PocketRisu/PocketRisu@e6e8ef040ec53ad132ecb572ada63538504079fa`
- `PocketRisu/PocketRisu@2981235e49135b7e65849569a659e6954c91190d`
