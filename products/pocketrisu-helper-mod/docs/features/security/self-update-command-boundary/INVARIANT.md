# Feature-ID: SECURITY-SELF-UPDATE-COMMAND-BOUNDARY

Status: **INVARIANT / HOLD — NO CURRENT PORT TARGET**

## Problem / evidence

Historical `tegy1117/Kei-Risu` commit `9c38558d5ffbb68cdb83c9a6bcca7dafb4582c71` fixed a command-injection boundary in self-update archive extraction. The vulnerable shape interpolated archive/extraction paths into shell command strings. The fix invokes `tar` and PowerShell through executable + argv boundaries and tests metacharacter-bearing paths.

## Minimal safe scope

No PocketRisu source change is authorized by this dossier today. The invariant is:

> Archive/updater process execution must keep untrusted or variable paths as data (argv/environment), never as interpolated shell syntax.

If a concrete PocketRisu path violating this invariant is later found, create one narrow feature/PR for that exact call site.

## Ownership boundaries

- Node/self-host updater or archive-extraction code only.
- No Android/service/runit/package/runtime migration.
- No server-phone notification behavior.

## Mechanism

Preferred boundary when invoking an external extractor:

1. call a fixed executable;
2. pass archive/output paths as argv values;
3. when a platform shell is unavoidable, keep variable paths outside the command program text and pass them through a non-code channel such as environment variables;
4. do not use a generic shell string merely for convenience.

This dossier does not require the source project’s exact helper or PowerShell implementation.

## Compatibility / invariants

- Preserve existing extraction semantics, timeout, supported formats, and nested-root handling.
- Do not introduce PM2 or service-manager changes.
- Do not touch DB flush/save-integrity behavior.
- Do not weaken archive path validation; shell-boundary safety and archive-entry/path-traversal validation are separate requirements.

## Validation / acceptance

For any future matching implementation:

- focused unit tests must include archive/output paths with spaces, quotes, semicolons, ampersands, `$()`-style metacharacters, and platform separators;
- the invoked executable must be fixed and variable paths must appear only as argv/data;
- supported-platform extraction must still succeed on a normal archive;
- failure/timeout behavior must remain bounded and surfaced;
- inspection must confirm no alternate fallback reintroduces interpolation.

## Risk / blast radius

Security-sensitive execution boundary. A wrong implementation can create remote/local command execution or break self-update/extraction. Therefore current classification remains `HOLD` unless a real PocketRisu call site is identified.

## Rollback / fallback

A future code change must be one isolated call-site PR and revert cleanly to the prior implementation. If safe platform parity cannot be demonstrated, disable the affected update/extraction path rather than guessing at shell escaping.

## Dependencies

Current PocketRisu updater/archive-extraction inventory. During the 2026-08-27 bounded audit, no equivalent `/api/self-update` route or matching helper was found in `hanmiyoo10-alt/PocketRisu`.

## PR decomposition

No implementation PR now. If applicability is proven later:

1. regression test reproducing the unsafe process invocation contract without executing payloads;
2. one call-site executable+argv conversion;
3. focused platform/fallback tests.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `HIGH`
- Dependencies: PocketRisu updater/archive-extraction surface audit
- Priority: `P0`
- Lifecycle status: `HOLD`
- Source evidence: `tegy1117/Kei-Risu` `9c38558d5ffbb68cdb83c9a6bcca7dafb4582c71`
