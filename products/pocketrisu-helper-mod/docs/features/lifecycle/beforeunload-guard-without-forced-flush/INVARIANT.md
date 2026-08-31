# BEFOREUNLOAD-GUARD-WITHOUT-FORCED-FLUSH

Status: ADOPTED invariant

## Problem / evidence

PocketRisu historically restored a `beforeunload` listener in `eac0954a4053b9fb71278b7a5484bf323581f065` after accidental page exits could proceed without a browser confirmation guard. The current upstream `develop/src/preload.ts` still contains the prompt-only listener.

## Minimal safe scope

Keep unload protection as UX only. Do not attach DB flush, serialization, keepalive writes, or other persistence side effects to `beforeunload`, `visibilitychange`, or `pagehide`.

## Ownership boundaries

- Browser lifecycle/preload owns the confirmation prompt.
- Existing normal save paths own durability.
- Server save/keepalive behavior remains independent.

## Mechanism

Register the unload guard and request browser confirmation. The handler must remain persistence-side-effect free.

## Compatibility / invariants

- No forced full DB flush on `visibilitychange` / `pagehide`.
- Do not introduce a forced DB flush on `beforeunload` either.
- Preserve `flushServerDbKeepalive()` as a no-op unless separately reviewed.
- Preserve current PocketRisu save/integrity optimizations.
- Browser prompt behavior is best-effort and must not be treated as a durability guarantee.

## Validation / acceptance

- Static/runtime regression check proves the lifecycle listener contains no DB write/flush call.
- Refresh/close/navigation still produces the supported-browser confirmation behavior.
- Normal save tests remain unchanged and do not depend on lifecycle shutdown ordering.

## Risk / blast radius

Risk is LOW while the guard remains prompt-only. Coupling persistence to unload would raise the blast radius by introducing browser shutdown races and save-order ambiguity.

## Rollback / fallback

If browser behavior becomes disruptive, the prompt listener can be removed/reworked independently without changing persistence semantics. Do not replace it with a forced flush.

## Dependencies

NONE.

## PR decomposition

No implementation PR is needed for the current adopted state. Any future lifecycle UX change and any persistence change must be reviewed as separate feature boundaries.

## Source

- `PocketRisu/PocketRisu@eac0954a4053b9fb71278b7a5484bf323581f065`
