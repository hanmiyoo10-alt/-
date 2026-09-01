# BACKUP-COMMIT-BLOCKS-RESTART-UPDATE

## Status

- Lifecycle: `ADOPTED`
- System impact: `NO_SYSTEM_UPDATE`
- Priority: `P0`
- Source: `PocketRisu/PocketRisu@775fcd1e6bbeb52343c8a3a4643be73e8dabe157`

## Problem / evidence

A server backup is streamed to a temporary file and only becomes recovery material after finalization. PocketRisu previously allowed the update popup to launch an in-app self-update/restart while that stream was still active. The recorded failure mode was a restart mid-save that removed the half-written temp file, leaving no completed backup despite the user having initiated the safety backup.

## Minimal safe scope

Treat one in-flight server backup save as an exclusion lease over UI actions that can start another backup or terminate/replace the running app. Release that lease on both success and failure, after the backup operation has reached a terminal state.

## Ownership boundaries

- Client/update popup owns admission of backup and update/restart actions.
- Server backup writer owns temp-file creation, stream completion, finalization, and failure cleanup.
- Boot cleanup owns only abandoned stale temp artifacts, not fresh potentially-live writes.
- Self-update preservation rules own configured backup directories that live inside the app root.

## Mechanism / invariant

1. Starting a server backup marks the backup operation in flight.
2. While in flight, another backup and update/restart actions are not admitted.
3. Success is reported only after the temporary artifact has reached the committed final backup path.
4. Failure removes the incomplete temp artifact where possible and releases the exclusion state.
5. Boot cleanup removes only temp artifacts old enough to be treated as abandoned.
6. A custom backup directory inside the app root is part of user-owned persistent state and must remain in the self-update keep set.

A temporary or in-flight backup artifact is never authoritative recovery material.

## Compatibility / PocketRisu guardrails

- Do not introduce visibility/pagehide DB flushes.
- Keep `flushServerDbKeepalive()` unchanged.
- Preserve current save/integrity optimizations.
- No change to targeted V3 plugin reload.
- Keep runit; do not introduce PM2.
- No Android notification on the server phone.
- No OS/package/runtime migration is required.

## Validation / acceptance

- Hold a backup stream open and verify update/restart remains unavailable until terminal completion.
- Verify successful finalization precedes success reporting and re-enabling update.
- Inject backup failure and verify controls recover and incomplete temp state is cleaned.
- Verify a fresh temp file is not swept as stale; an old abandoned temp file is eligible for cleanup.
- Verify a custom backup directory under the app root survives in-app self-update.
- Verify the reported success location corresponds to the actual server backup directory.

## Risk / blast radius

Low and localized to backup/update admission. The main regression risk is a leaked in-flight flag permanently blocking updates, or over-aggressive stale-temp cleanup deleting a live writer's file.

## Rollback / fallback

Revert the UI exclusion change independently if it misbehaves; server temp/final semantics remain the correctness fallback. Do not relax finalization semantics or treat temp files as successful backups during rollback.

## Dependencies / PR decomposition

No unresolved dependency. If reimplemented after future refactoring, keep the exclusion boundary as one isolated PR; temp cleanup or update-directory preservation may be separate PRs if their ownership has diverged.

## PR history

No autonomous implementation PR: this invariant is already implemented in official PocketRisu and is recorded here as durable design knowledge.
