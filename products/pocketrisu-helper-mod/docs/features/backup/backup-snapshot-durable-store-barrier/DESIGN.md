# Feature-ID: BACKUP-SNAPSHOT-DURABLE-STORE-BARRIER

## Problem / evidence

`nevaeh5379/HaejeokRisuai` commits `4342d6c38015c3a8a63c8597245476297671a163`, `16b94415ece3fa4306d6eee2bf1debb97d8f7844`, and `1d659a5bcfd3b3c33c136ac86b2dd788985a2ff3` show a concrete failure-prevention pattern: before producing a storage-level backup snapshot, every domain that buffers mutations participates in an explicit flush barrier, the backup refuses to continue if any participating owner still reports pending writes, and typed contracts prevent the barrier from silently forgetting a newly introduced durable owner.

PocketRisu's current client backup entry point delegates the full export to `forageStorage.exportBackup()`. The matching durable-write owners and server/export authority have not yet been mapped, so this is credible external evidence but not yet a reproduced PocketRisu bug.

## Minimal safe scope

First slice is investigation/test-only:

1. map the actual PocketRisu backup/export authority from the browser entry point through server/storage snapshot creation;
2. inventory state owners that can acknowledge a user-visible mutation before durable persistence completes;
3. create one deterministic regression test that overlaps export with a pending mutation and demonstrates whether the exported snapshot can be stale;
4. do not add a runtime flush barrier unless the test proves a real gap.

If a gap is proven, the smallest runtime slice is a backup-only barrier at the owner that already coordinates durable snapshot creation. It must not introduce global lifecycle flushing.

## Ownership boundaries

- Browser/UI: initiates backup and reports progress/errors; should not become the authority for deciding which storage domains are durable.
- Backup/export coordinator: owns the pre-snapshot consistency barrier if one is needed.
- Buffered state owners: each owns its own `flush` / pending-work semantics; the coordinator only composes them.
- Durable storage/server: remains the authority for snapshot creation and persistence ordering.
- Import/restore: out of scope.
- Device/runtime/service management: out of scope.

## Proposed mechanism

Only after a failing PocketRisu test exists:

1. define an explicit backup-participant contract at the existing export/snapshot coordinator, conceptually `flushForBackup(): Promise<void>` plus a postcondition that no participant-owned write remains pending;
2. enumerate participants through one typed/central registry owned by the backup coordinator rather than scattered calls;
3. flush participants concurrently only where their write chains are already independent; otherwise preserve existing serialization semantics;
4. after flush completion, verify each participant's pending state or durable revision postcondition;
5. materialize any compatibility-derived portable state from canonical live state before snapshot creation;
6. fail closed on flush/postcondition failure rather than exporting a knowingly stale snapshot;
7. create the durable snapshot only after the barrier succeeds.

Do not copy HaejeokRisuai's store hierarchy. The transferable part is the consistency invariant and explicit participant ownership.

## Compatibility / invariants

- Never reintroduce forced DB flush on `visibilitychange` or `pagehide`.
- `flushServerDbKeepalive()` remains a no-op unless separately reviewed.
- Preserve PocketRisu's current save/integrity optimizations and existing ETag/revision protections.
- Preserve targeted V3 plugin reload.
- Keep runit; no PM2.
- Server phone must not create Android notifications.
- Backup file format and import/restore semantics remain unchanged in the first runtime slice.
- Failure to establish pre-snapshot durability must produce a visible backup failure, not a partially trusted success.

## Validation / acceptance

Required before `READY_TO_PORT`:

- A PocketRisu-specific deterministic test demonstrates the stale-snapshot race or equivalent missing durability boundary.
- The participant inventory is explicit and reviewed against all write-buffering owners relevant to portable backup content.
- With the proposed barrier, an export started while a participant is dirty contains the latest acknowledged mutation.
- A simulated flush failure prevents snapshot publication/export.
- No deadlock occurs when backup overlaps normal autosave or serialized write chains.
- Normal save latency/path is unchanged outside explicit backup/export.
- `visibilitychange` / `pagehide` behavior and `flushServerDbKeepalive()` remain unchanged.
- Backup format compatibility tests remain green.

## Risk / blast radius

Risk is MEDIUM. A barrier at the wrong layer can block backup indefinitely, deadlock with an existing write coordinator, duplicate expensive persistence, or give false confidence if the participant registry is incomplete. Blast radius is contained by keeping all behavior backup-only and refusing any first implementation that changes general save lifecycle behavior.

## Rollback / fallback

The runtime change, if eventually needed, must be a single backup-only coordinator patch that can be reverted without migrating data or formats. On any unexpected production behavior, fall back to the prior export path and retain the regression test/investigation record. No persistent migration is permitted.

## Dependencies

- PocketRisu backup/export ownership map.
- Complete inventory of buffered write owners relevant to portable backup data.
- Reproducible stale-snapshot overlap test.
- Explicit timeout/failure semantics for a stalled participant.

## PR decomposition

1. **Investigation/test PR** — ownership notes plus failing race test only. No production behavior change.
2. **Barrier contract PR** — only if the test proves a gap; add the smallest backup-only participant contract and coordinator barrier.
3. **Coverage expansion PRs** — only when future durable owners are introduced; add participant/contract tests with the owning feature.

## Current classification

`NO_SYSTEM_UPDATE / Importance HIGH / Difficulty MEDIUM / Size S / Evidence MEDIUM / Risk MEDIUM / P1 / DESIGN_NEEDED`

The item must remain `DESIGN_NEEDED` until a PocketRisu-specific failure is reproduced and dependencies above are resolved.