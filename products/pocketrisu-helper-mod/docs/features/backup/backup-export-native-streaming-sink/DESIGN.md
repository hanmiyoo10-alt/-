# BACKUP-EXPORT-NATIVE-STREAMING-SINK

## Problem / evidence

`rpaddict/RisuBard@5f5f80348509a034acb318563fb52ebef188a3f0` ships a focused hotfix for normal local backups that reached 100% and then failed during StreamSaver finalization. Its regression test demonstrates that selecting a native file handle before export, then writing response bytes directly to that handle, bypasses the failing StreamSaver close path. The personal PocketRisu fork currently contains the same pre-fix `SaveLocalBackup()` and `streamBackupToDisk()` ownership shape.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `READY_TO_PORT`

## Minimal safe scope

Change only the normal full local-backup browser sink. Where `window.showSaveFilePicker` exists, request a `.bin` destination before invoking the backup export and stream the resulting response to that file handle. Preserve the existing StreamSaver / `downloadFile` fallback when the native picker is unavailable. Treat picker `AbortError` as cancellation, not failure.

Do not change backup encoding, server export API, settings-only backup semantics, upstream-target backup semantics, import/restore, persistence, or any system/runtime behavior in this slice.

## Ownership boundaries

- `SaveLocalBackup()` owns user initiation, destination acquisition, export request, success/cancel/error presentation.
- `streamBackupToDisk()` owns response-byte transfer to the selected sink.
- `forageStorage.exportBackup()` remains the authority for backup generation and byte format.
- Browser native file handle is only an output sink, never storage/database authority.

## Mechanism

1. Build fallback filename.
2. If supported, call `showSaveFilePicker()` before `exportBackup()`.
3. Start export only after destination selection succeeds.
4. Pass the optional native handle into the existing streaming helper.
5. Native path uses `createWritable()` and writes response chunks directly; unsupported path preserves StreamSaver behavior.
6. Close the selected writer after all chunks are written.
7. Quietly clear UI on `AbortError`; surface actual I/O/export errors.

## Compatibility / invariants

- Exported bytes and `.bin` format are unchanged.
- Existing StreamSaver fallback remains available where File System Access API is absent.
- No forced DB flush behavior is introduced.
- `flushServerDbKeepalive()` remains untouched/no-op.
- Save/integrity optimizations and targeted V3 plugin reload are untouched.
- runit remains; no PM2.
- No Android notification behavior.
- No device/system package/runtime or storage migration.

## Validation / acceptance

Focused tests must demonstrate:

- native picker is called before `exportBackup()`;
- bytes written to native writable exactly equal response bytes;
- native path never constructs a StreamSaver writer;
- picker cancellation (`AbortError`) does not report `Failed`;
- actual write/export errors still surface;
- no-native-picker path remains compatible with the previous StreamSaver behavior.

Run the focused test file and the relevant TypeScript/test command available in the repository. Stop if behavior differs instead of widening the patch.

## Risk / blast radius

Low and limited to user-initiated normal backup export. Primary risks are browser capability differences, picker cancellation handling, and sink close/error semantics. The patch does not alter durable data or backup contents.

## Rollback / fallback

Revert the isolated feature commit/PR. Browsers without the native API already exercise the unchanged fallback; the feature contains no migration or persistent state requiring cleanup.

## Dependencies

None unresolved. Matching PocketRisu owner and pre-fix code path are directly confirmed; source contains focused regression evidence.

## PR decomposition

One personal-fork draft PR:

1. add native destination acquisition for `SaveLocalBackup()`;
2. allow `streamBackupToDisk()` to use the native sink while preserving fallback;
3. add focused regression tests for native success/cancel/fallback behavior.

No unrelated backup cleanup.
