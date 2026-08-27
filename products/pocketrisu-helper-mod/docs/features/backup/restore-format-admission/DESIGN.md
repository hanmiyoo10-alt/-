# Feature-ID: BACKUP-RESTORE-FORMAT-ADMISSION

Status: **DESIGN_NEEDED — assistant-owned draft**

## Problem / evidence

`nevaeh5379/HaejeokRisuai` commit `67cd018beb90647c9022ef76744fd86bad7af348` fixes a dangerous restore failure mode: container parsing errors were treated as evidence that the same input was actually a raw database, so truncated/full-disk/malformed large backups could switch format after parsing had already begun and then be copied into a WebView-facing restore path. The same commit also avoids retaining an entire flattened SQLite statement/value list for large Android restores by executing generated statements inside the already-open native transaction.

This is evidence, not authority. PocketRisu must first prove which restore formats and ownership boundaries it currently has.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `HIGH`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: current PocketRisu local-restore format ownership, Android/native bridge path, legacy raw compatibility and rollback audit
- Priority: `P2`
- Lifecycle status: `DESIGN_NEEDED`

## Minimal safe scope

Do not change restore behavior first. The first slice is an INSPECT_ONLY contract map plus pure format-admission tests against existing accepted inputs. If a concrete ambiguity/fallback bug is reproduced, the smallest implementation slice may introduce a pure classifier/validator before extraction begins. Streaming/native transaction changes are a separate PR and require measured memory evidence.

## Ownership boundaries

- Restore orchestration owns input selection and the decision of which decoder/extractor is authoritative.
- Each format parser owns structural validation once selected; parser I/O errors must not silently change the input's format identity.
- Staging owns temporary files/directories and complete cleanup on failure.
- Storage transaction owner controls atomic publication and rollback.
- Native bridge/WebView boundaries own their own memory budgets; neither may materialize an unnecessary second full restore payload.
- Existing backup/export format and save/integrity semantics stay authoritative.

## Proposed mechanism

1. Inspect and enumerate every currently supported restore format and its unambiguous identifying contract.
2. Add a pure `classifyRestoreInput`/`validateRestoreHeader` boundary only if current code conflates parse failure with format fallback.
3. Once a format has been structurally admitted, later I/O/CRC/truncation/disk errors remain errors in that format; they do not trigger a different decoder.
4. Validate declared entry lengths against remaining input where the format permits it; reject impossible lengths before allocation/write.
5. Stage all writes and fail closed before authoritative publication. Partial staging is deleted on any failure.
6. Raw/legacy inputs may have a device-specific safety budget only when measured and documented; do not copy Haejeok's 512 MiB constant blindly.
7. If profiling proves Android restore retains a complete flattened SQL statement/value list, decompose a separate native-transaction streaming slice that preserves one atomic transaction while generating/executing statements incrementally.

## Compatibility / invariants

- No forced DB flush on `visibilitychange`/`pagehide`.
- `flushServerDbKeepalive()` remains no-op unless separately reviewed.
- Existing save/integrity optimizations stay intact.
- Targeted V3 plugin reload unchanged.
- runit only; no PM2.
- No server-phone Android notifications.
- Existing valid backups remain restorable or the compatibility change is explicitly versioned and tested.
- Parser failure must never be reinterpreted as a different format merely to continue.
- No partially restored state becomes authoritative after failure.

## Validation / acceptance

- valid current container backup restores successfully;
- valid supported legacy/raw backup restores successfully;
- truncated header and truncated entry fail before publication;
- impossible declared entry length is rejected without large allocation;
- disk-full/write failure cleans staging and preserves pre-restore authoritative state;
- malformed container does not fall through to raw restore;
- wrong-format input returns a bounded, actionable error;
- transaction failure rolls back all entity writes;
- stress restore covers thousands of entities without retaining a second full statement/value list if the streaming slice is implemented;
- measure WebView heap/native RSS/peak disk staging before and after any streaming change;
- existing restore regression suite and backup round trips remain green.

## Risk / blast radius

Restore is destructive and persistent. Wrong format classification can reject valid backups; wrong fallback can corrupt/replace state; incremental transaction work can weaken atomicity. Therefore this feature remains design-only until current PocketRisu restore ownership is reproduced directly.

## Rollback / fallback

Any admission guard must be independently revertible without storage migration. Streaming transaction work, if later justified, lands separately and can revert to the current transaction implementation. Existing pre-restore backup/rollback behavior must remain available.

## Dependencies / PR decomposition

1. **INSPECT_ONLY:** map current restore formats, parser/fallback rules, native bridge, staging, transaction/publish boundary, and current tests.
2. **PR 1 candidate:** pure classifier/structural admission tests only, if ambiguity exists.
3. **PR 2 candidate:** wire classifier before one restore path; no storage representation change.
4. **PR 3 candidate:** only after measured memory evidence, incremental statement execution inside the existing atomic transaction.
5. Destructive recovery/repair semantics are explicitly out of scope and require their own design.

## Promotion gate

Do not move to `READY_TO_PORT` until a current PocketRisu failure/ambiguity is reproduced, accepted formats are explicit, rollback/publish boundaries are proven, focused failure-path tests exist, and the first slice is isolated from storage migration or recovery semantics.
