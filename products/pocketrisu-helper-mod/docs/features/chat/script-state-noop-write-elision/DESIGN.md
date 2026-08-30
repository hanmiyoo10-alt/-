# SCRIPT-STATE-NOOP-WRITE-ELISION

Feature-ID: `SCRIPT-STATE-NOOP-WRITE-ELISION`

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle: `READY_TO_PORT`

## Problem / evidence

PocketRisu's current `setChatVar()` writes the selected chat's `scriptstate` entry even when the incoming string is byte-for-byte identical to the stored value. Official PocketRisu commit `3cfd21c996deeb9c26ad820d9f3216e7bd72100a`, adapted from `kwaroran/Risuai` `f3f0242f`, changed this path to skip no-op writes and return whether a mutation occurred. The upstream commit also carries direct regression coverage for scripting semantics built on that mutation signal.

## Minimal safe scope

First slice only: make `setChatVar()` compare the current `$<key>` value with the incoming value and avoid assigning when equal. Do not add new scripting APIs, Lua-engine caching, lightweight chat accessors, or generation-stop semantics in this slice.

## Ownership boundaries

- Browser/client scripting variable state only.
- `src/ts/parser/chatVar.svelte.ts` is the intended production owner.
- No server, storage-format, runtime, Android, deployment, plugin-reload, or DB-flush ownership changes.

## Mechanism

Resolve the current selected character/chat once, ensure `scriptstate` exists, compute the `$<key>` key, compare the current value with the requested value, and return early on equality. Preserve assignment semantics for all changed values.

## Compatibility / invariants

- `getChatVar()` output is unchanged.
- Changed values are still written synchronously to the same `scriptstate` key.
- An absent key receiving a value still becomes present.
- No forced DB flush is introduced.
- `flushServerDbKeepalive()` remains untouched.
- Save/integrity optimizations, targeted V3 plugin reload, runit, and server-phone notification behavior remain untouched.
- Do not infer broader upstream scripting changes from this isolated slice.

## Validation / acceptance

Before landing, run a focused unit test proving: (1) equal value produces no assignment, (2) changed value produces exactly one assignment with the same resulting value, and (3) missing `scriptstate` is initialized normally. Also run `pnpm check` and the relevant Vitest test. Acceptance requires no behavior change for changed writes and no type-check regression.

## Risk / blast radius

Low and localized. The only intentional semantic difference is that an identical assignment no longer triggers a reactive mutation. If any hidden caller relies on same-value assignment side effects, the focused regression test plus broader type/test suite should expose the risk before merge.

## Rollback / fallback

Single-file change; revert the feature commit to restore unconditional assignment. No migration or persisted-format rollback is required.

## Dependencies / PR decomposition

No code dependency. Keep this one-feature PR isolated from the rest of upstream `3cfd21c9` (Lua engine caching, extra scripting APIs, and generation-stop handling). A later feature may separately evaluate the boolean mutation signal if PocketRisu needs it.

## Autonomous progression record

- Candidate branch reserved in personal fork: `feat/script-state-noop-write-elision`, based on `develop@e57c0435018646800566f2158fd1a9fa12caa9e2`.
- Production modification intentionally not performed in the 2026-08-30 inspection run because the execution environment could not resolve `github.com`, preventing clean local checkout and focused `pnpm` verification. This is a tooling/integration blocker, not a code or CI failure.
