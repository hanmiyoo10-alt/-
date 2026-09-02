# Feature-ID: LIFECYCLE-FLUSH-GUARDRAIL

## Purpose

Preserve the PocketRisu save-lifecycle guardrail that page lifecycle events are not persistence authority.

## Problem / evidence

The durable Risu-family registry explicitly requires no forced DB flush on `visibilitychange` / `pagehide` and requires `flushServerDbKeepalive()` to remain a no-op unless separately reviewed. Inspection of `hanmiyoo10-alt/PocketRisu:main` at `fd9a034abc8e41a1108aefccb87989294355dd63` found both a hidden/pagehide `flushImmediate()` path that calls `triggerSave()` and a live `/api/db/flush` keepalive request. The same pattern is also present in official `PocketRisu/PocketRisu:develop` at `278251f85a19bfdfd4cf3faae780e62682878f9e`.

## Minimal safe scope

- Remove page lifecycle events as an unconditional trigger for DB persistence.
- Keep normal debounce/periodic/explicit save ownership unchanged.
- Keep `flushServerDbKeepalive()` a no-op unless a separate feature review establishes a safe server-side contract.
- Do not otherwise alter patch-sync, chat-stub guards, ETag/revision semantics, plugin storage, or writer-lock behavior.

## Ownership boundaries

- Browser lifecycle events own UI/session lifecycle only; they do not own DB durability.
- Existing save coordinator / explicit save APIs own persistence scheduling.
- Server `/api/db/flush` is not callable from pagehide/visibility authority without separate review.

## Compatibility / invariants

- No forced DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` is a no-op.
- Existing save/integrity optimizations remain unchanged.
- Existing targeted V3 plugin reload remains unchanged.
- runit remains the service manager; no PM2.
- Server phone creates no Android notifications.

## Validation / acceptance

1. Static check: no `visibilitychange` or `pagehide` listener invokes `triggerSave`, full DB write, or `/api/db/flush`.
2. Static check: `flushServerDbKeepalive()` performs no network/storage side effect.
3. Focused save tests: ordinary debounced/explicit saves still persist changes and retain existing retry/requeue behavior.
4. Lifecycle test: dispatching hidden/pagehide alone does not create a save request.
5. Guardrail regression test should fail if lifecycle-triggered persistence is reintroduced.

## Risk / blast radius

Contained MEDIUM: removing a lifecycle write can expose users who relied on an implicit last-moment save, but the project explicitly rejects that ownership because pagehide/keepalive persistence is timing-sensitive and can conflict with current save/integrity coordination. Damage is contained to save scheduling and is trivially revertible.

## Rollback / fallback

Revert the isolated feature commit. Do not restore pagehide persistence piecemeal; any future lifecycle durability design must be reviewed as a separate feature with explicit transaction, timeout, writer-lock, patch-sync, and failure semantics.

## Dependencies

None for guardrail restoration. A future alternative lifecycle-durability mechanism is out of scope.

## PR decomposition

One isolated PR: restore the no-lifecycle-flush/no-op invariant plus focused regression coverage. No unrelated cleanup.
