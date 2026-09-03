# SERVER-BACKUP-UPDATE-MUTUAL-EXCLUSION

## Status

`ADOPTED` — preserve as a PocketRisu regression invariant.

## Source

- `PocketRisu/PocketRisu` commit `775fcd1e6bbeb52343c8a3a4643be73e8dabe157`
- Verified present on `develop` at `ca09a80746e74e5334145e5e78af47ce423e0eba`

## Invariant

A self-update/restart must not begin while a user-requested server backup is still writing. Backup temporary-file recovery must delete only stale files that match the server-backup temp namespace; it must not assume every `.tmp` file is abandoned. A configured custom backup directory inside the application root must survive updater cleanup.

## Why it exists

The update popup previously allowed backup and update to overlap. Restarting during the streamed backup removed the incomplete file, so the user could lose the very backup intended to protect the update. The same interrupted flow could leave invisible temp files behind.

## Acceptance boundary

- backup and update actions are mutually exclusive while backup save is unsettled;
- failed/incomplete backup cleanup is scoped to the active backup output;
- startup stale-temp cleanup is filename-scoped and age-scoped and leaves fresh candidates alone;
- custom in-tree backup directories remain on the updater keep boundary;
- no forced DB flush on `visibilitychange`/`pagehide` is introduced;
- `flushServerDbKeepalive()` remains a no-op;
- runit and the server-phone no-Android-notification guardrail are unaffected.

## Regression validation

Exercise backup-in-progress UI state, backup failure cleanup, stale-vs-fresh startup temp handling, restart/update during backup, and custom backup-dir preservation across self-update.

## Rollback/fallback

If orchestration changes regress backup reliability, disable the overlapping update action rather than weakening the persistence boundary. Do not replace the guard with timing assumptions or blind temp deletion.
