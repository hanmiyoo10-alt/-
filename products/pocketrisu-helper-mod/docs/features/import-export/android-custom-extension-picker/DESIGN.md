# Feature-ID: ANDROID-CUSTOM-EXTENSION-PICKER

Status: READY_TO_PORT

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

`nevaeh5379/HaejeokRisuai` commit `1c50be425da01314f56068f57bcacd0254c76f99` fixes Android file pickers hiding custom Risu formats such as `.risum` / `.charx` when those unknown extensions are included in an HTML `accept` filter. Android may keep only recognized MIME-backed entries and therefore hide the custom files the user actually needs.

Current `hanmiyoo10-alt/PocketRisu:main` still constructs `fileInput.accept` directly from every requested extension in `src/ts/util.ts`, and filters by extension again after selection. This reproduces the vulnerable ownership boundary.

## Minimal safe scope

Change only the DOM file-picker boundary:

1. when the requested extension list contains a Risu custom extension that Android pickers may not map to a system MIME type, do not emit a restrictive `accept` attribute;
2. preserve existing post-selection extension filtering as the authoritative validation;
3. make single-file cancellation return `null` instead of dereferencing a missing file;
4. do not change import parsing, storage, backup, Android packages, runtime, or deployment.

## Ownership boundaries

- Browser/UI: owns `<input type=file>` construction and post-selection extension filtering.
- Importers/parsers: unchanged; remain authoritative for file content validation.
- Android/system picker: treated as an external chooser whose MIME filtering is not authoritative for custom app extensions.

## Proposed mechanism

Keep a small explicit set of PocketRisu custom extensions used by app-owned import/export formats. If Android is detected and any requested extension is custom, omit `accept`; otherwise preserve current extension-based `accept`. Continue filtering selected filenames by the requested extensions in the change handler.

This intentionally does not add a broad MIME registry or infer content type from extension.

## Compatibility / invariants

- desktop/web/iOS chooser behavior remains unchanged except cancellation safety;
- post-selection extension filtering remains authoritative;
- `allowAllExtentionFiles` semantics remain unchanged;
- no forced DB flush, no `flushServerDbKeepalive()` change;
- targeted V3 plugin reload unchanged;
- runit/PM2/server-phone notification guardrails unaffected.

## Validation / acceptance

Focused tests should prove:

- Android + a custom extension such as `charx`/`risum` omits `accept`;
- Android + only ordinary extensions keeps the current restrictive `accept` behavior;
- selected wrong extensions are still rejected by the existing post-selection filter;
- cancellation of `selectSingleFile()` returns `null` without throwing;
- non-Android behavior remains unchanged.

Run the narrow test file and existing project type/check command when available. If the environment cannot run checks, do not open a draft PR as verified.

## Risk / blast radius

LOW. The change is localized to chooser hints. Omitting `accept` may show more files on affected Android chooser flows, but the existing post-selection extension validation prevents acceptance of disallowed files.

## Rollback / fallback

Revert the isolated feature commit. The prior behavior is restored without data/schema migration.

## PR decomposition

One branch / one PR:

1. chooser helper + cancellation guard;
2. focused regression tests only.

No unrelated cleanup.

## Source evidence

- `nevaeh5379/HaejeokRisuai@1c50be425da01314f56068f57bcacd0254c76f99`
- PocketRisu current evidence: `src/ts/util.ts` on personal fork `main` at `39b3df07ae1189a4237407ae6b7ee9067c9c39e5`.
