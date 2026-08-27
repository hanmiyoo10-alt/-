# Feature-ID: IMPORT-ANDROID-FILE-SLICE-STREAM

Status: READY_TO_PORT
Owner: assistant-owned design

## Classification

- System impact: NO_SYSTEM_UPDATE
- Importance: HIGH
- Difficulty: LOW
- Size: XS
- Evidence: HIGH
- Risk: LOW
- Dependencies: NONE
- Priority: P0
- Lifecycle: READY_TO_PORT

## Problem / evidence

`hanmiyoo10-alt/PocketRisu:main` currently converts `File` inputs in `CharXImporter` with `File.stream()`. HaejeokRisuai commit `860280bcdd7e08c49a00a7391076de89d3c68e0e` demonstrates an Android WebView/content-provider-backed `File` for which `stream()` is unavailable while `slice().arrayBuffer()` works. The upstream change includes a regression test using a `File` subclass whose `stream()` throws.

## Minimal safe scope

Change only the `File` branch of `CharXImporter` input conversion. Read bounded slices (`CHUNK_SIZE_BYTES`) with `slice(start,end).arrayBuffer()` and expose them through the existing `ReadableStream` boundary. Do not change ZIP parsing, asset persistence, storage format, backup/restore, Android packages, or file-picker behavior in this PR.

## Ownership boundaries

- Browser/WebView import adapter owns reading a DOM `File`.
- `CharXImporter` continues to own stream consumption and ZIP parsing.
- Storage/asset save ownership is unchanged.

## Mechanism

Maintain an offset. On each stream pull, read at most `CHUNK_SIZE_BYTES` from `File.slice()`, enqueue the resulting `Uint8Array`, advance the offset, and close at EOF. Treat a zero-byte result for a non-empty requested slice as an error instead of looping.

## Compatibility / invariants

- `Uint8Array` and caller-provided `ReadableStream` inputs are unchanged.
- File reads remain bounded; no whole-file materialization is introduced.
- Byte ordering and EOF semantics remain identical.
- No DB flush behavior changes.
- `flushServerDbKeepalive()` remains no-op.
- targeted V3 plugin reload, runit, and server-phone notification rules are unaffected.

## Validation / acceptance

1. Regression test with a File whose `stream()` throws must parse a small CharX archive successfully via `slice().arrayBuffer()`.
2. Existing Uint8Array/ReadableStream behavior must remain unchanged.
3. Typecheck (`pnpm check`) and focused Vitest for the new test must pass.
4. No changes outside the importer and its focused regression test.

## Risk / blast radius

LOW. The change is localized to browser File ingestion. Primary risks are off-by-one/EOF errors or an accidental zero-byte loop; both are covered by bounded offset logic and tests.

## Rollback / fallback

Revert the isolated importer commit/PR. No data migration or persistent state needs rollback.

## PR decomposition

One feature branch / one PR:

1. replace `File.stream()` with bounded slice-backed ReadableStream;
2. add Android-style File regression test;
3. run focused test + typecheck.

## Source evidence

- `nevaeh5379/HaejeokRisuai` commit `860280bcdd7e08c49a00a7391076de89d3c68e0e`
- PocketRisu current location: `src/ts/process/processzip.ts` `CharXImporter.#toStream()`
