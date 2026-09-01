# EXACT-ASSET-RESOLUTION-PRECEDES-FUZZY-FALLBACK

Status: `ADOPTED`

## Problem / evidence

Official PocketRisu commit `4a2a22f69f703d89f93385716b9456d2a5a9b578` fixed a v1.11.0 regression in lazy asset-manifest resolution. The resolver previously queried the character owner first with fuzzy matching and consulted module owners only for unresolved names. A character near-match could therefore shadow an exact module asset.

The adopted regression test demonstrates the concrete failure mode with names that are within the character fuzzy threshold while being exact module entries.

## Minimal safe scope

Preserve one resolver rule: when multiple asset-manifest owners participate in one lookup, resolve exact name matches across all eligible owners before any fuzzy fallback. Fuzzy matching remains available only for names that have no exact match anywhere in the participating owner set.

## Ownership boundaries

- Client/parser: supplies requested names and the participating character/module manifest descriptors.
- Asset-manifest resolver/server: owns cross-owner precedence and fuzzy fallback.
- Cache: may memoize resolver answers, including misses, only under a manifest-set identity that changes when relevant manifest content changes.

No owner traversal order may acquire authority to override an exact match from another owner.

## Mechanism

1. Normalize/deduplicate requested names according to the resolver's existing contract.
2. Evaluate all participating owners for exact matches first.
3. Lock exact results as authoritative for those names.
4. Only for unresolved names, apply the configured fuzzy policy to owners that permit fuzzy matching.
5. If memoizing results, bind positive and negative entries to content-sensitive manifest-set identity.

## Compatibility / invariants

- Exact asset identity outranks approximate similarity across owner boundaries.
- Fuzzy character lookup remains functional when no exact match exists.
- Adding a new owner kind must not implicitly change exact-vs-fuzzy authority through iteration order.
- Existing lazy-manifest persistence, descriptor-loss guards, orphan cleanup, and blob lifetime rules remain unchanged.
- Cache hits and misses must not outlive the manifest content they describe.

## Validation / acceptance

Acceptance requires focused regression coverage for:

- character fuzzy near-match + module exact match -> module exact result wins;
- no exact match + eligible character fuzzy near-match -> fuzzy character result still resolves;
- multiple participating owners do not change correctness when their traversal order changes;
- if resolver caching changes, manifest replacement invalidates prior positive and negative results.

## Risk / blast radius

Risk is `LOW`: the rule is localized to name resolution and does not mutate persistent data. A bad change can render the wrong asset or make legitimate fuzzy lookup fail, but rollback is straightforward.

## Rollback / fallback

Revert resolver-priority/cache changes while retaining the focused regression fixture. Do not fall back to owner-first fuzzy short-circuiting; if a new resolver architecture cannot prove the invariant, disable fuzzy fallback for the ambiguous path rather than returning a known-wrong owner match.

## Dependencies

`NONE` for preserving the adopted invariant.

## PR decomposition

No implementation PR is required now because official PocketRisu already contains the fix and focused test. Future changes should keep resolver-priority edits and their regression tests in the same narrow PR; unrelated asset cleanup or storage changes should remain separate.

## Source / durable history

- Source: `PocketRisu/PocketRisu@4a2a22f69f703d89f93385716b9456d2a5a9b578`
- Registry review: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch/notes/backfill-reviews/2026-09-02-0734-pocketrisu-asset-resolution-exact-before-fuzzy.md`
- Ledger addendum: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch/notes/idea-ledger-addenda/2026-09-02-0734.md`
