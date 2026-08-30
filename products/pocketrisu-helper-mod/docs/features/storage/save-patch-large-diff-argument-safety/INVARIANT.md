# SAVE-PATCH-LARGE-DIFF-ARGUMENT-SAFETY

Status: `ADOPTED`

## Problem / evidence

`Nagase-Kotono/PocketRisu-kotono@5c93fb9a6044b4baaaaffc9184c02ba197a44af3` demonstrated that a single character diff can contain enough JSON Patch operations to exceed JavaScript/V8 variadic argument limits. A front deletion from a 30,000-entry lorebook can shift enough indexes that `fast-json-patch` emits a very large operation array; `patch.push(...ops)` can throw before the save request is produced.

The same commit exists in `hanmiyoo10-alt/PocketRisu` history and current `develop` retains iterative append in the per-character patch path.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `ADOPTED`

## Invariant

Never pass an unbounded JSON-patch operation array as variadic arguments. Append/consume operations iteratively or in a demonstrably bounded form while preserving their original order.

## Ownership boundary

This invariant belongs to save/diff aggregation only. It does not authorize changes to DB lifecycle flushes, server keepalive behavior, persistence architecture, plugin reload, deployment runtime, or device behavior.

## Compatibility

Operation order and exact paths must remain unchanged. The safety fix must not coalesce, reorder, drop, or otherwise reinterpret patch operations.

## Validation / acceptance

Keep a regression with a sufficiently large shifted character lorebook that would make the former variadic append unsafe, verify patch construction completes without `RangeError`, and apply the generated patch to the baseline to prove the final character/lorebook matches the normalized target.

## Risk / blast radius

Low. The invariant changes only how already-produced operations are appended. The main regression risk is semantic drift if a future optimization batches or reorders operations.

## Rollback / fallback

If a new patch aggregator behaves unexpectedly, return to simple ordered iteration. Do not fall back to unbounded spread syntax.

## Dependencies / PR decomposition

None. The invariant is already implemented; no feature PR is required. Any future patch-aggregation refactor should treat the existing large-diff tests as a mandatory compatibility gate.

## Durable references

- Source: `Nagase-Kotono/PocketRisu-kotono@5c93fb9a6044b4baaaaffc9184c02ba197a44af3`
- PocketRisu adopted history: `hanmiyoo10-alt/PocketRisu@5c93fb9a6044b4baaaaffc9184c02ba197a44af3`
- Registry review: `notes/backfill-reviews/2026-08-30-1647-pocketrisu-kotono-large-diff-spread-safety.md`
- Ledger addendum: `notes/idea-ledger-addenda/2026-08-30-1647.md`
