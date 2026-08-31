# CONVERSION-LAZY-ASSET-OWNERSHIP-DETACH

Status: adopted invariant

## Problem / evidence

Official PocketRisu commit `dd718991c4e5344f50f1a7c61f04d3b64c86487e` fixed a concrete lazy-storage ownership bug in character↔module conversion. The converted destination inherited the source object's lazy asset manifest descriptor, so the two nominally independent entities temporarily shared the same authoritative manifest. Editing the destination's assets before reload could rewrite the source owner's manifest.

## Invariant

Operations that create a new independent logical entity must detach source-owned lazy/externalized persistence identity before the destination is published.

Copying a manifest/storage descriptor is not the same as copying its logical value.

## Minimal safe mechanism

1. Read/hydrate the source logical value without mutating the source.
2. Clone the hydrated value into caller-owned data.
3. Remove source-owned descriptor/manifest identity from the detached value.
4. Construct and publish the destination only after detach succeeds.
5. On hydration/detach failure, fail closed: do not publish a destination that aliases source storage or contains a partial logical copy.
6. Guard async copy/conversion UI against duplicate re-entry where repeated publication would be harmful.

The exact helper or store architecture is not normative; the ownership boundary is.

## Compatibility / invariants

- Source and destination must remain independently editable after conversion/clone.
- Lazy storage may still be used after the destination is persisted, but it must receive its own owner identity.
- Existing save/integrity optimizations remain authoritative.
- Do not add forced DB flush on `visibilitychange` / `pagehide`.
- Keep `flushServerDbKeepalive()` no-op unless separately reviewed.
- Preserve targeted V3 plugin reload.
- Keep runit; do not introduce PM2.
- Server phone behavior must not create Android notifications.

## Validation / acceptance

Regression coverage for any copy-like surface using lazy/externalized state should prove:

- the destination does not retain the source descriptor/storage identity;
- editing destination assets does not mutate source assets;
- editing source assets does not mutate destination assets;
- failed hydration/detach publishes neither an alias nor a partial destination;
- repeated clicks/re-entry cannot publish duplicate partial conversions;
- large hydrated payloads are bounded or explicitly accepted for that copy/export operation.

## Risk / blast radius

Risk is `MEDIUM`: aliasing can violate data ownership and mutate the wrong entity, while over-eager hydration can add latency/memory pressure. Damage is contained by keeping detach at explicit copy/conversion boundaries rather than changing general storage architecture.

## Rollback / fallback

For a future regression, disable the affected copy/conversion entry point or fall back to a proven eager-value copy path. Do not fall back to descriptor copying when independent ownership is required.

## Dependencies

`NONE` for preserving the invariant. Any new implementation should still audit the specific domain's owner identity and hydration semantics.

## PR decomposition

No new PR is required for the historical adoption. Future work should keep one copy/conversion domain per PR when practical, with its own ownership-alias regression test.

## Source / history

- `PocketRisu/PocketRisu@dd718991c4e5344f50f1a7c61f04d3b64c86487e`
- Durable Risu-family record: `hanmiyoo10-alt/PocketRisu`, branch `notes/external-risu-dev-watch`, `notes/backfill-reviews/2026-08-31-2218-pocketrisu-conversion-lazy-asset-ownership-detach.md`
