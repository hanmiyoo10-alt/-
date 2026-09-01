# SHARED-VECTOR-CACHE-VALUES-ARE-IMMUTABLE-TO-CONSUMERS

Status: `ADOPTED`

## Problem / evidence

Official PocketRisu commit `9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7` fixed a HypaV3 cache-corruption bug. The in-memory vector cache returns shared object references, and `HypaProcessorV2` previously wrote request-specific metadata directly onto the cached object. A later metadata-less consumer of the same key could clear metadata that an earlier consumer still depended on, producing a downstream similarity-search crash when parent summary text disappeared.

## Minimal safe scope

Preserve one cache-ownership rule: values returned from a shared embedding cache may share immutable payloads, but consumer-specific wrapper state (`id`, `metadata`, and any future request-local fields) must be detached before mutation or storage in a caller-owned collection.

## Ownership boundaries

- Shared vector cache: owns reusable embedding content and cache identity.
- Hypa processor / caller: owns request-local ids, metadata, and local vector-map membership.
- Downstream similarity search: may assume metadata attached to its caller-owned vectors is stable for that caller's lifetime.

A cache hit does not grant the caller mutation authority over the shared cache object's wrapper fields.

## Mechanism

On cache hit, construct a caller-owned result wrapper from the cached embedding plus the caller's `id` and `metadata`, then store/return that wrapper. Do not mutate the shared cache entry. Structural sharing of immutable embedding arrays remains allowed when callers do not mutate those arrays.

## Compatibility / invariants

- Cache-hit and cache-miss consumers receive equivalent logical result shapes.
- One consumer's metadata assignment or omission cannot alter another consumer's stored result.
- Shared immutable vector payloads may remain shared to avoid unnecessary memory amplification.
- If future callers can mutate embedding arrays themselves, the immutability boundary must be strengthened accordingly.
- Existing Hypa cache persistence, eviction, provider scoping, and request coalescing behavior remain unchanged.

## Validation / acceptance

Acceptance requires focused coverage that:

- seeds one shared cache key;
- consumes it with parent-summary metadata and retains that result;
- consumes the same key again with no metadata;
- verifies the first result still carries the original metadata;
- verifies downstream similarity/search logic does not fail because metadata was clobbered;
- verifies cache-hit and newly embedded paths expose compatible result shapes.

## Risk / blast radius

Risk is `LOW`: this is a localized ownership fix with no persistence migration. The main implementation risk is accidentally copying large immutable vector payloads on every hit and increasing memory use; wrapper detachment should stay shallow unless vector mutability requires more.

## Rollback / fallback

Retain the regression fixture. If a future cache representation makes wrapper copying expensive, replace it with an explicit immutable cache-entry type or frozen/cache-owned object plus caller-owned side metadata. Do not roll back to writable shared cache wrappers.

## Dependencies

`NONE` for preserving the adopted invariant.

## PR decomposition

No implementation PR is required now because official PocketRisu already contains the fix. Future cache refactors should keep shared-value ownership changes and their focused regression tests in one narrow PR; unrelated embedding-provider, persistence, or UI diagnostics changes should stay separate.

## Source / durable history

- Source: `PocketRisu/PocketRisu@9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7`
- Registry review: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch/notes/backfill-reviews/2026-09-02-0844-pocketrisu-hypa-cache-copy-on-consume.md`
- Ledger addendum: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch/notes/idea-ledger-addenda/2026-09-02-0844.md`
