# DERIVED-BOUND-STATE-WRITE-BOUNDARY

## Status

`HOLD` — regression invariant, not a current implementation request.

## Problem / evidence

Svelte 5 can reject state mutation that occurs while a `$derived` computation is synchronously evaluating. Official PocketRisu commit `a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9` fixed such a path by ensuring the `translating` bound-state write happened only after an async boundary.

The personal fork currently invokes `markParsing(...)` from `$derived.by(...)`, but every current translation branch reaches its first `translating` write only after awaited work. No reproducible current gap is established.

## Minimal safe scope

If a future regression appears, change only the specific derived-entered execution path that performs a bound/reactive write before leaving synchronous derived evaluation. Prefer making derived computation pure; otherwise add the narrowest explicit async handoff needed by the owner.

## Ownership boundaries

- Svelte component derived evaluation
- async translation/render orchestration
- bindable UI state (`translating`, similar flags)

No storage, server, device, runtime, or persistence ownership changes are in scope.

## Mechanism

Invariant: **code entered synchronously by `$derived` must not mutate bound/reactive state until it has left the synchronous derived evaluation phase.**

Do not cargo-cult `await Promise.resolve()` globally. A microtask boundary is one possible mechanism where an intentionally async owner must hand off before mutation; a purer state/derived decomposition is preferable where practical.

## Compatibility / invariants

- preserve current translation result ordering and fallback behavior
- preserve rapid retranslation behavior
- do not add persistence flushes or change save/integrity behavior
- preserve targeted V3 plugin reload
- keep runit; no PM2
- no Android notifications

## Validation / acceptance

A future implementation is acceptable only if:

1. a focused test reproduces `state_unsafe_mutation` or proves a concrete pre-await write exists on a `$derived.by` path;
2. the patch removes that synchronous mutation without changing translation output semantics;
3. loading indicators still begin/end correctly;
4. rapid retranslation does not introduce stale completion or flicker regressions.

## Risk / blast radius

Risk is LOW when localized, but scheduling changes can alter ordering. The main failure mode is hiding a deeper ownership problem behind arbitrary microtask deferral.

## Rollback / fallback

Revert the localized scheduling/ownership change. No migration or persistent state repair is required.

## Dependencies

A matching personal-fork owner with a pre-await bound/reactive write, or a reproducible Svelte 5 runtime failure.

## PR decomposition

If activated: one XS PR containing the failing regression test and the minimal owner-level fix only. No unrelated cleanup.

## Source / durable history

- Source: `PocketRisu/PocketRisu@a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9`
- Registry review: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch/notes/backfill-reviews/2026-08-30-0745-pocketrisu-derived-bound-state-write-boundary.md`
- Ledger addendum: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch/notes/idea-ledger-addenda/2026-08-30-0745.md`
