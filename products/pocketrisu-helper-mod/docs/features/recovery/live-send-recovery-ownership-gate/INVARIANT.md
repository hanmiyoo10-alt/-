# LIVE-SEND-RECOVERY-OWNERSHIP-GATE

Status: ADOPTED upstream invariant
Feature-ID: `LIVE-SEND-RECOVERY-OWNERSHIP-GATE`

## Problem / evidence

Official PocketRisu commit `2c6cc72413e9a48a28bb625d39d38975b105993d` fixed a race where terminal model-job recovery could run while a live send still owned the same chat after tab thaw/reattach. Recovery and the live path could both fill the message, save, claim the job, and emit request-log effects.

## Minimal safe scope

Before terminal slot-in, check the current generation owner for the chat. If and only if the owner is `live`, recovery yields without streaming, claiming, mutating, or saving. Background registration does not block terminal recovery.

## Ownership boundaries

- Live send path is primary owner while its `live` generation state exists.
- Terminal recovery is fallback owner.
- Background generation registration is not equivalent to live foreground ownership.
- Once live ownership releases, a later recovery pass may take ownership.

## Mechanism

Use the generation-state map keyed by chat identity. Return early only for `kind === 'live'`. Do not replace this with a generic "any generation state exists" gate.

## Compatibility / invariants

- No duplicate terminal message fill.
- No redundant recovery save while live replay/post-processing owns the chat.
- No duplicate server job claim/request-log side effects.
- Background recovery remains available.
- A failed live path must not permanently starve recovery after its guard releases.

## Validation / acceptance

1. Live owner present: no slot-in, no claim, no recovery stream, no save.
2. Background registration present: recovery proceeds and claims normally.
3. Release failed/stale live ownership and run the next recovery pass: recovery proceeds.
4. Existing generation-id deduplication remains intact.

## Risk / blast radius

Medium because this is a concurrency/recovery ownership boundary. An over-broad or stale guard could delay legitimate recovery; duplicate ownership can corrupt visible/logged state.

## Rollback / fallback

Rollback only to another explicit single-owner arbitration mechanism. Never allow both live and terminal recovery paths to mutate/claim the same chat concurrently.

## Dependencies

None for the adopted upstream implementation.

## PR decomposition

Already adopted in official PocketRisu. Preserve as one focused invariant whenever job recovery, generation-state registration, or live stream reattachment is changed.
