# DEEP-REACTIVE-SUBSCRIPTION-WITHOUT-DISCARDED-CLONE

## Problem / evidence

Official PocketRisu commit `9ea2a2c3d3bcade5aecc34af1074e16c0d258dfc` found that save-tracking effects were calling `$state.snapshot(value)` only to register deep reactive dependencies and then discarding the clone. For large character/module/plugin values, cloning dominated per-keystroke cost. The adopted `deepTouch` implementation traverses plain arrays/objects without building a clone and falls back to `$state.snapshot` for non-plain values where snapshot semantics may matter.

## Classification

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `S`
- `Evidence`: `HIGH`
- `Risk`: `MEDIUM`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `ADOPTED`

## Invariant

When a deep serialization/snapshot operation is used solely as a reactive subscription primitive, optimization may remove the materialized clone only if the replacement observes every mutation that the authoritative prior mechanism observed. A performance optimization must never reduce the save-trigger dependency surface.

For plain objects, traversal must avoid inherited getters and preserve own-enumerable semantics. Arrays must observe length and elements. Non-plain values with class or `toJSON` behavior require a semantics-preserving fallback rather than assuming plain-object traversal is equivalent.

## Compatibility / acceptance

- save format and protocol identity remain unchanged;
- save/change-detection behavior remains unchanged;
- parity regression tests cover deep scalar changes, array growth, key add/remove, nested structures, `toJSON`/class values, and inherited-getter cases;
- the replacement may fire equally or more conservatively, but must not miss a mutation that `$state.snapshot` would have subscribed to;
- large reactive-value benchmarks should show reduced allocation/CPU without increasing save latency or suppressing saves.

## Risk / rollback

Primary risk is silent missed persistence when a traversal omits a reactive read. Rollback is to restore `$state.snapshot` at the affected subscription boundary. Do not trade correctness for benchmark gains.

## History

- Source: `PocketRisu/PocketRisu@9ea2a2c3d3bcade5aecc34af1074e16c0d258dfc`
- Durable Risu-family review: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch/notes/backfill-reviews/2026-09-01-0741-pocketrisu-deep-subscription-without-clone.md`
- Ledger addendum: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch/notes/idea-ledger-addenda/2026-09-01-0741.md`
