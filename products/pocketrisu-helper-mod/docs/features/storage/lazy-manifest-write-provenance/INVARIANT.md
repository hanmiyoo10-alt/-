# LAZY-MANIFEST-WRITE-PROVENANCE

Status: `ADOPTED` invariant

## Problem / evidence

Official PocketRisu commits `b69fafa9dd11a9b355edf0f058ecc458209336a5` and `856807a25b3145c59845713a0631a5e2fa22f309` hardened plugin character/module lazy-manifest write-back. A lazy-shaped writer could otherwise acquire authority from another consumer's hydrate, while a snapshot hydrated from an older manifest could overwrite a newer durable list.

## Minimal safe scope

Preserve provenance-aware write-back for lazy/externalized asset manifests. Do not generalize this into unrelated DB mutation semantics without separate review.

## Ownership boundaries

- plugin compatibility snapshots / V2 live DB proxy
- lazy character and module asset descriptors
- server/externalized durable asset-list ownership

## Mechanism / invariant

1. Inline asset data may replace a manifest only when the writer actually received/hydrated the exact current manifest revision, or when an explicitly supported live-object compatibility path proves equivalent ownership.
2. A hydration mark for an older manifest is stale and must fail closed to the current durable descriptor/list.
3. A never-hydrated lazy-shaped write must not inherit authority merely because another consumer hydrated the same logical object.
4. Character and module paths must retain symmetric semantics.

## Compatibility

Legitimate in-place edits made through the live V2 `getDatabase()` compatibility surface must still be resolved instead of silently disappearing. Unrelated fields and descriptor ownership remain unchanged.

## Validation / acceptance

- stale hydrated revision cannot overwrite current manifest
- never-hydrated write cannot replace durable list
- exact-current-revision hydrated edit is accepted
- live V2 in-place edit is resolved correctly
- character/module parity
- no change to unrelated fields

## Risk / blast radius

`MEDIUM`: mistakes can either discard legitimate plugin edits or allow stale data to roll back durable asset state.

## Rollback / fallback

Revert only the provenance-resolution change while retaining the current manifest as authority; do not fall back to unconditional inline-list acceptance.

## Dependencies

`NONE` for preserving the existing invariant. Any storage-architecture replacement must explicitly re-prove these semantics.

## PR decomposition

No autonomous implementation PR is needed: the behavior is already adopted and regression-tested in official PocketRisu. Future PRs touching lazy manifests should treat this file as an acceptance checklist.