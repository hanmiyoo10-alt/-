# PLUGIN-WRITEBACK-AUTHORITY-SURVIVES-LRU-EVICTION

Status: `ADOPTED`

## Problem

Plugin compatibility APIs may hydrate manifest-backed assets into detached arrays for callers. A bounded cache used to accelerate those hydrations is not durable state and may evict an entry before the plugin writes the snapshot back. If write-back reconciliation relies on cache residency to decide whether the caller changed the list, ordinary cache pressure can change persistence semantics and accidentally de-externalize assets.

## Source evidence

- `PocketRisu/PocketRisu@2981235e49135b7e65849569a659e6954c91190d`
- preserved on current reviewed `develop@278251f85a19bfdfd4cf3faae780e62682878f9e`

The source regression hydrates more than the 8-entry full-manifest LRU, evicts the earliest manifest, then verifies that an unchanged plugin write-back still restores the descriptor while a genuinely edited list remains changed.

## Invariant

**Cache residency must never be persistence authority.** Once a compatibility representation has been handed to a caller, the system needs a bounded handoff identity sufficient to recognize an unchanged round-trip even if the performance cache evicts the backing data in the meantime.

## Ownership boundary

- durable DB / manifest descriptor: authoritative persisted representation
- detached hydrated plugin snapshot: caller-owned compatibility representation
- full-manifest LRU: performance-only cache; eviction must be semantically invisible
- handed-out fingerprint/identity: bounded reconciliation evidence, not a durable data source

## Acceptance / validation

1. Hydrate more manifests than the full-manifest cache capacity.
2. Confirm an early manifest is evicted from that cache.
3. Write back the unchanged detached list and confirm the manifest descriptor is restored instead of re-inlining assets.
4. Mutate the handed-out list after eviction and confirm the mutation is still recognized as a real change.
5. Keep handoff tracking bounded.
6. Do not let a stale/incompatible revision use old handoff evidence to overwrite newer durable state; preserve the separate stale-write fail-closed invariant.

## Risk / blast radius

`MEDIUM`: mistakes here can silently bloat or alter durable plugin/module/character storage and can interact with manifest revision ownership. The safe change surface is localized, but persistence semantics are important.

## Rollback / fallback

If reconciliation logic becomes uncertain, fail safe toward preserving current durable descriptor/revision authority rather than treating a cache miss as proof of caller modification. A rollback must not reintroduce cache-hit-dependent persistence semantics.

## Related invariants

- `PLUGIN-MANIFEST-STALE-HYDRATED-WRITES-FAIL-CLOSED`
- unchanged plugin snapshot write-backs must preserve manifest externalization

These are related but distinct: stale-write protection governs revision freshness; this invariant governs semantic stability across ordinary cache eviction.