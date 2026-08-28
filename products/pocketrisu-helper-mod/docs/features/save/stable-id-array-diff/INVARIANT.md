# Stable-ID array diff invariant

Feature-ID: `SAVE-STABLE-ID-ARRAY-DIFF`
Status: historical invariant / HOLD

## Problem and evidence

`PocketRisu-Alter/PocketRisu-Alter@79c35cf2594dc20dd7334f3ca18ea752678a189e` records a concrete save-patcher failure mode: after a collection gained stable string IDs, the patcher still used a length-only positional diff. Same-length reorder therefore compared different logical entities at the same array index and could emit misleading per-slot edits. The source fix moved the collection to ID-guarded structural detection and added reorder, missing-ID, duplicate-ID, and reorder-plus-edit tests.

## Minimal safe scope

Do not add code to PocketRisu solely for this invariant. If a concrete incremental patch owner for a stable-ID collection exists or is introduced, make that owner identity-aware. Prefer the smallest local guard that prevents cross-entity positional patching.

## Ownership boundary

The owner is the persistence patch/diff layer for a specific stable-ID collection. UI ordering and in-memory reactive identity are evidence inputs, not the authority for persisted patch identity.

## Mechanism

For arrays with a stable ID contract, only emit scoped element-wise patches while the old and new identities align at the compared position (or while an explicit identity-aware move/update algorithm proves equivalence). On add/delete/reorder, missing ID, duplicate ID, or otherwise ambiguous identity, fail safe to a structural replace or another proven identity-preserving representation.

## Compatibility and invariants

- Internal edits to an unmoved entity may remain scoped.
- Reorder must never transfer an old entity's field diff onto a different entity that merely occupies the same index afterward.
- Legacy/pre-migration records with missing IDs must not silently fall back to positional identity when that can corrupt semantics.
- Duplicate IDs are invalid evidence of identity and must fail safe.
- Existing PocketRisu save/integrity optimizations remain authoritative unless a concrete owner demonstrates this failure mode.
- Never use this invariant as a reason to reintroduce lifecycle-triggered full DB flushes; `flushServerDbKeepalive()` remains no-op unless separately reviewed.

## Validation / acceptance

At a matching owner, cover: unchanged array, internal edit only, reorder, reorder plus internal edit, add, delete, missing ID, duplicate ID, and legacy pre-ID data. Acceptance requires that any identity mismatch cannot emit per-index patches that cross logical entity identities. Measure payload/write amplification if fallback uses structural replacement.

## Risk and blast radius

Incorrect identity handling can persist semantically corrupted collection state. The invariant itself is narrow, but a generic patch-framework rewrite would have a much larger blast radius and is explicitly out of scope.

## Rollback / fallback

Keep the existing owner unchanged until the failure is reproduced. For a future local fix, rollback is removal of the identity guard plus its tests; do not migrate stored data merely to implement this invariant.

## Dependencies

A concrete PocketRisu stable-ID array patch/diff owner. Current personal-fork code search does not expose Alter's `RisuSavePatcher` / `diffArrayWithIdGuard` boundary.

## PR decomposition

If activated, use one isolated PR for one collection/patch owner plus focused tests. Do not combine with generic save refactors, migrations, or unrelated cleanup.
