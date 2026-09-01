# Feature-ID: LAZY-DESCRIPTOR-LOSS-MUST-NOT-IMPLY-DESTRUCTIVE-DELETE

## Status

`ADOPTED` design invariant. Source behavior already exists in official PocketRisu; this dossier preserves the ownership boundary for future storage refactors.

## Problem / evidence

Official `PocketRisu/PocketRisu@e38a3833989c4f04d556379c653677f6b9d49341` fixed a data-loss path in lazy asset manifests. Once an asset list is externalized, the client-visible owner may carry only a descriptor. A compatibility writer that accidentally drops both descriptor and inline value creates an ambiguous state. Treating that omission as deletion can silently erase the persisted asset list.

The same commit showed that integrity guards can be bypassed if equivalent identifier spellings map to different cache keys; hex file identifiers therefore need canonicalization before cache/guard lookup.

## Minimal safe scope

For any lazy/externalized persisted field:

1. Compare a proposed write with the prior authoritative/client projection.
2. If a previously descriptor-backed owner still exists but now has neither descriptor nor inline replacement, reject the transition unless an explicit destructive operation proves deletion intent.
3. Canonicalize identity-bearing request/cache keys before any guard/cache lookup.

Do not generalize this into broad deep-merge semantics; ownership must remain field-specific.

## Ownership boundaries

- Client/compatibility writer owns ordinary field updates, not implicit deletion of server-owned externalized state.
- Server persistence boundary owns descriptor hydration and destructive-delete authorization.
- Cache identity layer owns canonicalization of equivalent identifiers before integrity checks.

## Mechanism

Use stable owner identity to compare previous and next projections. Reject descriptor-loss transitions fail-closed. Patch APIs should return a conflict/rebase signal where practical; full writes should abort rather than persist an ambiguous destructive transition. On cold cache, load the prior projection from authoritative storage before evaluating the guard.

## Compatibility / invariants

- Inline replacement of an externalized field remains valid.
- Legitimate owner removal remains valid when the owner itself is removed.
- Explicit deletion needs an explicit operation or contract; omission is not enough.
- Equivalent encodings/case variants of identity keys must resolve to one cache/guard identity.
- Existing PocketRisu save/integrity optimizations and guardrails remain unchanged.

## Validation / acceptance

Acceptance coverage should include:

- patch rejection when descriptor and inline value both disappear from an existing owner;
- full-write abort for the same shape;
- successful inline replacement;
- successful legitimate owner removal;
- cold-cache/restart behavior;
- equivalent case variants of cache/file identifiers exercising the same guard state.

## Risk / blast radius

`MEDIUM`. A false negative can cause persistent data loss; a false positive can block a legitimate compatibility write. Stable owner identity and explicit deletion semantics contain the blast radius.

## Rollback / fallback

The guard is fail-closed and can be reverted independently if it causes false positives, but rollback must not re-enable ambiguous destructive writes without a replacement deletion contract.

## Dependencies

`NONE` for preserving the invariant. Any future implementation in another externalized storage domain must first identify its stable owner identity and explicit deletion operation.

## PR decomposition

No implementation PR is needed now because official PocketRisu already contains the fix. Future domains should land one field/domain per PR: canonical identity + descriptor-loss regression test first, then guard enforcement.
