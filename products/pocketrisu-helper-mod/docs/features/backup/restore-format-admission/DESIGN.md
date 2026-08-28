# Feature-ID: BACKUP-RESTORE-FORMAT-ADMISSION

Status: **DESIGN_NEEDED — assistant-owned draft**

## Problem / evidence

`nevaeh5379/HaejeokRisuai` commit `67cd018beb90647c9022ef76744fd86bad7af348` fixes a dangerous restore failure mode: container parsing errors were treated as evidence that the same input was actually a raw database, so truncated/full-disk/malformed large backups could switch format after parsing had already begun and then be copied into a WebView-facing restore path. The same commit also avoids retaining an entire flattened SQLite statement/value list for large Android restores by executing generated statements inside the already-open native transaction.

New forward evidence strengthens the validation model rather than changing the classification:

- `90af43ed77ac53b5dd7773205ed11beaf1d0e5b9` adds chunked Tauri file reading and transaction progress events, reinforcing that large restore/import paths should stream through bounded native/file-handle ownership instead of materializing a duplicate full payload.
- `36ad93e42e9a7eff3e8391993844dc88e74664ce` fixes a subtle accounting bug: buffered-stream prefetch position is not the same as parser-consumed logical bytes. Declared-size validation must use bytes actually consumed by the format parser, otherwise prefetch can create false size conclusions.
- `fb6e868208d140611ec514453710a444750e9b85` introduces a pure-Java framed backup container codec with entry-name/size validation and streaming extraction, reducing hidden staging-format ambiguity.
- `e9c37503a9b694ca9a06b57f8dc6e8e2e3762fd4` adds a native SQLite restore stream parser and a dedicated 32 MiB-heap low-memory test task in CI. This is strong evidence for testing peak-memory behavior under an explicit constrained heap, not just asserting that code is “streaming.”
- `5babb10c9802e287235111f4aa2b75121cee35fd` makes restore progress callbacks more granular; progress is useful only if it is derived from parser/transaction progress that cannot falsify correctness or force extra buffering.

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
- Parser-owned logical byte count is authoritative for format-consumption/declared-size validation; buffered stream read-ahead is transport state, not format progress.
- Staging owns temporary files/directories and complete cleanup on failure.
- Storage transaction owner controls atomic publication and rollback.
- Native bridge/WebView boundaries own their own memory budgets; neither may materialize an unnecessary second full restore payload.
- Progress reporting is observational only; it must not change transaction boundaries, buffering policy, or accepted bytes.
- Existing backup/export format and save/integrity semantics stay authoritative.

## Proposed mechanism

1. Inspect and enumerate every currently supported restore format and its unambiguous identifying contract.
2. Add a pure `classifyRestoreInput`/`validateRestoreHeader` boundary only if current code conflates parse failure with format fallback.
3. Once a format has been structurally admitted, later I/O/CRC/truncation/disk errors remain errors in that format; they do not trigger a different decoder.
4. Validate declared entry lengths against parser-consumed logical bytes/remaining payload, never transport prefetch position.
5. Validate entry names before materialization and reject traversal/absolute/empty-segment forms using the existing path-boundary contract.
6. Stage all writes and fail closed before authoritative publication. Partial staging is deleted on any failure.
7. Raw/legacy inputs may have a device-specific safety budget only when measured and documented; do not copy Haejeok's constants blindly.
8. If profiling proves Android restore retains a complete flattened SQL statement/value list, decompose a separate native-transaction streaming slice that preserves one atomic transaction while generating/executing statements incrementally.
9. Add a constrained-memory CI target for the streaming parser/codec if PocketRisu adopts such a path. The test should run under an explicit low heap/RSS budget with an input large enough to fail a full-materialization implementation.

## Compatibility / invariants

- No forced DB flush on `visibilitychange`/`pagehide`.
- `flushServerDbKeepalive()` remains no-op unless separately reviewed.
- Existing save/integrity optimizations stay intact.
- Targeted V3 plugin reload unchanged.
- runit only; no PM2.
- No server-phone Android notifications.
- Existing valid backups remain restorable or the compatibility change is explicitly versioned and tested.
- Parser failure must never be reinterpreted as a different format merely to continue.
- Parser-consumed bytes and transport-buffered bytes must never be conflated for structural validation.
- No partially restored state becomes authoritative after failure.
- Progress callbacks cannot weaken atomicity or induce duplicate materialization.

## Validation / acceptance

- valid current container backup restores successfully;
- valid supported legacy/raw backup restores successfully;
- truncated header and truncated entry fail before publication;
- impossible declared entry length is rejected without large allocation;
- buffered read-ahead beyond parser-consumed bytes does not cause a false size mismatch;
- malicious/invalid entry names are rejected before file creation;
- disk-full/write failure cleans staging and preserves pre-restore authoritative state;
- malformed container does not fall through to raw restore;
- wrong-format input returns a bounded, actionable error;
- transaction failure rolls back all entity writes;
- stress restore covers thousands of entities without retaining a second full statement/value list if the streaming slice is implemented;
- dedicated low-memory test runs under an explicit constrained heap/RSS budget and fails a deliberately non-streaming reference implementation or equivalent guard;
- progress callbacks are monotonic enough for UI feedback but do not affect accepted bytes/commit outcome;
- measure WebView heap/native RSS/peak disk staging before and after any streaming change;
- existing restore regression suite and backup round trips remain green.

## Risk / blast radius

Restore is destructive and persistent. Wrong format classification can reject valid backups; wrong fallback can corrupt/replace state; incremental transaction work can weaken atomicity. Therefore this feature remains design-only until current PocketRisu restore ownership is reproduced directly.

## Rollback / fallback

Any admission guard must be independently revertible without storage migration. Streaming transaction work, if later justified, lands separately and can revert to the current transaction implementation. Existing pre-restore backup/rollback behavior must remain available.

## Dependencies / PR decomposition

1. **INSPECT_ONLY:** map current restore formats, parser/fallback rules, native bridge, staging, transaction/publish boundary, byte-accounting source, and current tests.
2. **PR 1 candidate:** pure classifier/structural admission + parser-consumed-byte tests only, if ambiguity exists.
3. **PR 2 candidate:** wire classifier before one restore path; no storage representation change.
4. **PR 3 candidate:** only after measured memory evidence, incremental statement execution inside the existing atomic transaction plus constrained-memory CI.
5. Progress/UI changes are a separate small PR only after the underlying parser/transaction progress contract is stable.
6. Destructive recovery/repair semantics are explicitly out of scope and require their own design.

## Promotion gate

Do not move to `READY_TO_PORT` until a current PocketRisu failure/ambiguity is reproduced, accepted formats are explicit, rollback/publish boundaries are proven, focused failure-path tests exist, byte accounting is tied to parser consumption rather than read-ahead, and the first slice is isolated from storage migration or recovery semantics.
