# WRITER-LOCK-UNKNOWN-REGISTRATION-STATE

Status: ADOPTED invariant

## Problem / evidence

`PocketRisu/PocketRisu@0164a35a48fd083e3eae5dda3b5a44ebd1693ad5` fixed a writer-lock inspection bug where a session absent from the boot-registration map was classified as stale. Registration is a separate request and may be missing because of flaky mobile/VPN transport. Treating missing evidence as stale caused focus-driven reload loops.

## Minimal safe scope

Preserve a third inspection state, `unknown`, specifically for a non-active session whose registration evidence is absent. Do not broaden this into weaker write authorization.

## Ownership boundaries

- server session-lock inspection owns stale/fresh/unknown classification;
- authoritative write-path lock enforcement owns data-safety denial;
- client focus/reload behavior may react to stale, but must not treat unknown as proof that its local copy is obsolete.

## Mechanism

If a non-active session has no recorded boot/registration timestamp, return `unknown`. Once registration exists, compare it against the active writer's last-write timestamp and resume normal `fresh` or `stale` classification. Keep write checks fail-closed independently.

## Compatibility / invariants

1. Missing auxiliary registration evidence is not proof of staleness.
2. `unknown` must not authorize a write that the authoritative lock rejects.
3. A later successful registration must restore normal stale/fresh judgment.
4. Existing active/free/sessionless semantics remain unchanged.
5. No changes to PocketRisu persistence guardrails, runit, Android notification behavior, or lifecycle flush behavior.

## Validation / acceptance

- active writer established;
- second unregistered session's unsafe write is denied;
- `peek(second)` returns `unknown`, not `stale`;
- after registering the second session, `peek(second)` returns the correct normal state (`fresh` in the source regression case);
- existing lock tests remain green.

## Risk / blast radius

Risk: MEDIUM. A too-broad `unknown` classification could hide a truly stale session and suppress a needed reload. Containment comes from limiting `unknown` to absent registration evidence and preserving authoritative write denial.

## Rollback / fallback

Revert only the inspection classification change if behavior regresses; keep the write-path guard untouched. A rollback must account for the known reload-loop regression before restoring stale-on-missing behavior.

## Dependencies

NONE.

## PR decomposition

No implementation PR required: invariant is already adopted in official PocketRisu. Future refactors should carry the regression test with the session-lock code.
