# BLOCKED-SEND-FEEDBACK-PRESERVES-SERIALIZATION

Status: `ADOPTED`

Source evidence: `PocketRisu/PocketRisu@ab77ae215b880c14dd0d86826efc256ace5eac4b`

## Problem / evidence

PocketRisu intentionally serializes live sends behind a global generation guard because the downstream send path reads current-chat-dependent state at request time. A second live send from another chat can therefore cross-contaminate request ownership. The failure mode fixed by the source commit was a silent rejection: the Send button appeared dead when an existing generation owned the guard.

## Minimal safe scope

Keep the serialization boundary unchanged. Make a rejected send observable with bounded, ownership-aware feedback only.

## Ownership boundaries

- Generation/concurrency guard remains authoritative for whether a live send may enter.
- Current-chat / generation-state tracking may identify whether this chat or another chat owns the block.
- Notification/modal state remains authoritative for whether an informational toast may safely appear.

## Mechanism

When the send guard rejects a new live send, emit an informational message that distinguishes same-chat from other-chat blocking when that distinction is available. Rate-limit repeated feedback and suppress it while a higher-priority modal/wait alert owns the UI surface.

## Compatibility / invariants

- Do not weaken or bypass the live-send serialization guard to fix a perceived dead button.
- Do not permit a second live send while downstream request-time chat/model/trigger ownership remains global/current-chat dependent.
- Do not let repeated keydown/Enter auto-repeat create notification spam.
- Do not clear or replace unrelated modal/wait state with informational feedback.
- Preserve PocketRisu save/integrity, targeted V3 reload, runit, no-PM2, no-server-phone-notification, and no-forced-pagehide/visibilitychange-flush guardrails.

## Validation / acceptance

- Same-chat blocked send produces bounded explanatory feedback.
- Other-chat blocked send produces bounded explanatory feedback.
- Rapid repeated Enter does not spam notifications.
- Active modal/wait ownership is not cleared or displaced.
- A second live send still cannot enter the guarded path while an existing generation owns it.

## Risk / blast radius

Low. The invariant is localized UX around an existing correctness guard. Risk rises if a refactor interprets the UX fix as permission to relax generation serialization without redesigning downstream ownership.

## Rollback / fallback

The feedback layer can be reverted independently while retaining the serialization guard. If notification ownership becomes ambiguous, fail back to silent rejection rather than weakening concurrency safety.

## Dependencies

None for preserving the invariant. True per-chat concurrent live sending would require a separate ownership redesign and validation program.

## PR decomposition

No autonomous implementation PR is needed because the behavior is already adopted upstream. Future refactors should keep guard semantics and feedback ownership tests in the same narrow change when possible.
