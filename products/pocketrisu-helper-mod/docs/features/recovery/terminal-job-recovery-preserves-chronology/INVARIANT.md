# TERMINAL-JOB-RECOVERY-PRESERVES-CHRONOLOGY

Status: `ADOPTED`

## Problem / evidence

Official PocketRisu commit `342b3a8a702cbce4ad7c3ea0594196ff7836c66b` corrected terminal unclaimed `main` model-job recovery from newest-first to oldest-first. Recovery appends each recovered result in query order, so newest-first can place a later reply above an earlier reply when multiple terminal jobs accumulated for the same chat.

## Minimal safe scope

Preserve chronological ordering among terminal, already-eligible, unclaimed `main` jobs being replayed into chat state. This invariant does not authorize recovery itself, does not alter active-job handling, and does not generalize timestamp ordering to unrelated job types.

## Ownership boundaries

- Durable model-job store owns terminal job records and their ordering evidence.
- Recovery admission/ownership gates decide whether a terminal result may mutate a chat.
- Recovery replay owns append order once jobs are eligible.
- Chat state owns final visible message chronology.

## Mechanism

For the current schema, enumerate terminal unclaimed `main` jobs in ascending `created_at` order before replay/appending. If a future schema introduces an explicit stable sequence field, that field should become the ordering authority instead of relying on wall-clock timestamps.

## Compatibility / invariants

- Multiple recovered replies for one chat must preserve original causal order.
- `LIVE-SEND-RECOVERY-OWNERSHIP-GATE` remains a separate prerequisite: correct ordering does not make an otherwise unsafe recovery eligible.
- Active jobs and non-`main` jobs retain their existing recovery semantics unless separately reviewed.
- Do not change PocketRisu save/integrity guardrails, targeted V3 plugin reload, runit deployment, or server-phone notification policy.

## Validation / acceptance

A focused regression should create at least two terminal, unclaimed `main` jobs for the same chat in known sequence, recover them after the live owner is absent, and assert that visible/appended results are oldest-first. Include a control asserting unrelated job classes are unaffected.

Acceptance: replay order exactly matches the durable causal sequence represented by the current schema, with no duplicate claim/append side effects.

## Risk / blast radius

`MEDIUM`. A wrong ordering rule silently changes conversation semantics even if all durable data remains present. Timestamp ordering can also be wrong if timestamps cease to represent causal sequence.

## Rollback / fallback

The implementation is a localized query-order choice and is easy to revert. If ordering authority becomes ambiguous, fail investigation/design forward rather than inventing a new sequence heuristic; preserve existing durable records for manual recovery.

## Dependencies

`NONE` for the current adopted invariant. Any future migration from timestamp to explicit sequence authority requires its own schema/compatibility review.

## PR decomposition

No new implementation PR is needed: the invariant is already adopted upstream. If future work changes model-job sequencing, keep the sequence-authority change separate from recovery-admission, cleanup, or unrelated model-job refactors.

## Classification

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `HIGH`
- `Risk`: `MEDIUM`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `ADOPTED`
