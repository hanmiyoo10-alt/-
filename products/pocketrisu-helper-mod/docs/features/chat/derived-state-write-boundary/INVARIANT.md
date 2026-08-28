# Feature-ID: CHAT-DERIVED-STATE-WRITE-BOUNDARY

## Status

Adopted PocketRisu invariant / regression reference.

## Problem and evidence

Official `PocketRisu/PocketRisu:develop` commit `a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9` fixed a translation render path that wrote bound state (`translating = true`) while still executing inside a Svelte `$derived` synchronous section, triggering the framework's `state_unsafe_mutation` guard.

## Minimal safe scope

Keep synchronous derived/render computation read-only with respect to bound/runtime state. When a derived path must start an async side effect, leave the synchronous derived section first, then mutate state under the same stale-result ownership rules already used by that feature.

## Ownership boundaries

- Derived computation owns pure/read-only calculation.
- Async translation work owns its loading/result/error state after the derived sync phase has ended.
- Current message/chat identity owns whether a late async completion is still eligible to publish.
- Persistence, DB flush, plugin reload, server runtime, and Android notification behavior are out of scope.

## Mechanism

Use a narrow asynchronous boundary before the first bound-state mutation that would otherwise happen during `$derived` evaluation. Do not generalize this into arbitrary microtask yields; the boundary belongs specifically at the transition from pure derived computation to side-effectful async work.

## Compatibility / invariants

- No state write during synchronous `$derived` evaluation.
- Existing translated/untranslated rendering stays behaviorally identical.
- Translation loading placeholders remain optional and unchanged.
- A stale translation completion cannot overwrite a newer chat/message render owner.
- No forced DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains a no-op unless separately reviewed.
- Targeted V3 plugin reload, runit, and server-phone notification guardrails are untouched.

## Validation / acceptance

Accept only if all hold:
1. translated and untranslated messages render normally;
2. loading placeholder on/off both work;
3. translation rejection/cancel clears owned loading state without a framework mutation error;
4. rapid message/chat switch cannot publish stale translated content into the new owner;
5. no new reactive loop or extra translation request is introduced.

## Risk / blast radius

Low and localized, but careless async deferral can change event ordering. The main failure mode is stale-result publication, not persistence corruption.

## Rollback / fallback

Revert the local boundary change. No migration or persistent-state rollback is required.

## Dependencies

None for the invariant. The official fix is already adopted upstream.

## PR decomposition

No new PR is required for the already-adopted upstream fix. If a similar violation appears elsewhere, fix one ownership boundary per PR with focused stale-result tests rather than introducing a generic global helper prematurely.

## Source / history

- `PocketRisu/PocketRisu@a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9`
- Durable watch record: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch/notes/forward-reviews/2026-08-28-1641-pocketrisu-develop-reactive-and-custom-flags.md`
