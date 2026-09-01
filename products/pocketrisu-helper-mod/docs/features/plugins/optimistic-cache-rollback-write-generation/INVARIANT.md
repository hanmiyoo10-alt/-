# Feature-ID: OPTIMISTIC-CACHE-ROLLBACK-USES-WRITE-GENERATION

## Status

`ADOPTED` in official PocketRisu.

## Problem / evidence

Server-backed plugin storage keeps an optimistic in-memory value so plugin read-after-write behavior remains immediate. If the persistence request later fails, the local optimistic value must be undone. Commit `8190e27aefadd9ba2708b4c36e24ba651d09857c` added rollback and error propagation. Follow-up `dc0148d9afcc2422ea4edf92243bf0b4097acac6` demonstrated that comparing the cached value is not sufficient ownership proof: an older failed write and a newer successful write can carry the same value.

## Minimal safe invariant

Each optimistic mutation owns a unique operation generation/token for its cache key. A failed operation may roll back only while that token is still current. Reset/clear invalidates outstanding rollback authority.

## Ownership boundaries

- local optimistic cache: provisional read visibility
- persistent server storage: durable authority
- per-key write-generation map: rollback ownership only
- owner metadata: sidecar bookkeeping, not durable-write success authority

## Compatibility / invariants

- preserve immediate read-after-write behavior;
- server rejection must be surfaced to the caller;
- no stale failed write may clobber a later success, including equal-value writes;
- failed remove restores the prior value only when that remove still owns the generation;
- clear/reset cannot be repopulated by a stale in-flight failure;
- metadata bookkeeping failure after persistent success is logged separately and must not masquerade as a failed durable write.

## Validation / acceptance

Regression coverage must include failed first write, failed overwrite, failed remove, overlapping same-key unequal-value writes, overlapping same-key equal-value writes, clear during an outstanding failure, and sidecar metadata failure after persistence success.

Acceptance: local reads converge to the latest successfully durable state; stale failures never reverse newer operations.

## Risk / blast radius

`MEDIUM`: the mechanism is tiny but mistakes can create local/server divergence or hide committed values until reload.

## Rollback / fallback

If generation tracking regresses, disable optimistic visibility and await persistence before exposing the local value. That is slower but restores a single authority boundary.

## Dependencies

`NONE` for preserving the invariant. Future optimistic caches should explicitly identify their durable authority and reset epoch before reusing the pattern.

## PR decomposition

No new PR is needed: this invariant is already adopted upstream. Future implementations should keep one cache/state surface per PR and add the concurrency characterization tests before changing rollback logic.

## Source

- `PocketRisu/PocketRisu@8190e27aefadd9ba2708b4c36e24ba651d09857c`
- `PocketRisu/PocketRisu@dc0148d9afcc2422ea4edf92243bf0b4097acac6`
