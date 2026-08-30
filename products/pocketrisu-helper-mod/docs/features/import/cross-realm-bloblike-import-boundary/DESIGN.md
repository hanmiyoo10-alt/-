# CROSS-REALM-BLOBLIKE-IMPORT-BOUNDARY

## Status

`READY_TO_PORT` once executable verification is available.

## Problem / evidence

`nevaeh5379/HaejeokRisuai@d6f30d8e5c8aaf8add101aab75a09b1fac502a48` demonstrates that Android/content-provider wrappers can be File-like without sharing the page's `File` constructor realm. `instanceof File` therefore rejects a valid input and falls through to the wrong handling path. The same environment can expose an unreliable `stream()` while `slice().arrayBuffer()` remains usable and bounded. The source includes a cross-realm regression fixture that explicitly is not `instanceof File` and successfully imports a CharX archive.

The personal fork's current `src/ts/process/processzip.ts` still uses nominal `instanceof File` followed by `data.stream()`, so the ownership match is direct.

## Minimal safe scope

Change only the CharX input-to-stream adapter:

1. preserve direct `ReadableStream` handling;
2. preserve explicit chunked `Uint8Array` handling;
3. recognize a narrow blob-like capability (`Number.isSafeInteger(size)`, `size >= 0`, callable `slice`);
4. read blob-like inputs in fixed-size slices and enqueue bounded `Uint8Array` chunks;
5. throw an explicit unsupported-input error for values that match none of the supported shapes.

Do not change ZIP parsing, asset persistence, import limits, storage formats, or Android system/runtime configuration.

## Ownership boundaries

- import boundary: classifies supported input capabilities;
- stream adapter: owns bounded chunk production;
- ZIP parser: consumes bytes and remains unchanged;
- asset persistence/import finalization: remains unchanged;
- device/runtime: no changes.

## Mechanism

Prefer capability checks over realm identity for blob-like values. A blob-like value is accepted only when it exposes a non-negative safe-integer `size` and a callable `slice`. Iterate offsets by the existing import chunk size; for each slice, await `arrayBuffer()`, convert to `Uint8Array`, and enqueue it. Close at `size`. Keep `Uint8Array` as a separate explicit branch so it cannot be misclassified.

## Compatibility / invariants

- normal browser `File` inputs continue to import;
- cross-realm/content-provider wrappers can import even when `instanceof File` is false;
- bounded chunk sizing is preserved;
- `Uint8Array` and existing `ReadableStream` behavior remain unchanged;
- unsupported arbitrary objects are rejected explicitly;
- existing asset-size caps and ZIP validation are unchanged;
- no forced DB flush, keepalive behavior, plugin reload, PM2/runit, Android notification, package/runtime, or storage migration changes.

## Validation / acceptance

Focused tests:

- cross-realm wrapper is not `instanceof File`, has `size` + `slice`, throws if `.stream()` is invoked, and still imports card JSON plus an asset;
- normal `File` import still succeeds;
- `Uint8Array` import still succeeds;
- direct `ReadableStream` import still succeeds;
- invalid object without `slice` is rejected;
- negative/non-safe size is rejected;
- observed slice intervals never exceed the configured chunk size;
- asset completion/finalization semantics remain unchanged.

Acceptance requires focused tests plus the project type/check suite relevant to `processzip.ts`.

## Risk / blast radius

`LOW`. The change is localized to input adaptation and easy to revert. The main risk is accepting a malformed object too broadly or changing chunk/finalization behavior.

## Rollback / fallback

Revert the adapter change to the current nominal File path. No durable data format changes or migrations are involved.

## Dependencies

`NONE` beyond an environment capable of executing the focused tests and project checks.

## PR decomposition

One isolated PR:

1. add the cross-realm/capability regression fixture;
2. update only the input-to-stream adapter;
3. run focused import tests and project checks.

No unrelated import cleanup.

## References

- Source: `nevaeh5379/HaejeokRisuai@d6f30d8e5c8aaf8add101aab75a09b1fac502a48`
- Durable review: `notes/forward-reviews/2026-08-30-2148-haejeok-cross-realm-charx.md`
- Ledger: `notes/idea-ledger-addenda/2026-08-30-2148-haejeok.md`
