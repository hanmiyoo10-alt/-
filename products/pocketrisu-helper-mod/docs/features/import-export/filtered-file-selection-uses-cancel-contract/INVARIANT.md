# FILTERED-FILE-SELECTION-USES-CANCEL-CONTRACT

## Status

`ADOPTED`

## Problem / evidence

Official `PocketRisu/PocketRisu@d5f786a1fdb607357e23b342748a6830e13abb78` fixed a utility-level regression where a single-file picker could resolve to an empty accepted-file list after extension filtering, but `selectSingleFile()` still dereferenced the first entry. The result was an exception instead of the null/non-selection contract already understood by callers.

## Minimal safe scope

Only define the result contract for a single-file selection that yields no accepted file after filtering: return non-selection (`null`) and do not attempt to read file bytes.

## Ownership boundary

- DOM picker/filtering owns whether a picked file is accepted.
- `selectSingleFile()` owns translating the accepted-file list into the single-file utility contract.
- Import/parser callers own validation of bytes only after a real accepted file exists.

## Mechanism

Read the first accepted item only if it exists. When the accepted result is empty, return the established cancel/non-selection sentinel. Do not manufacture a partial file object and do not use a TypeError as control flow.

## Compatibility / invariants

- Accepted files continue returning name + bytes.
- User cancellation remains non-selection.
- Extension-filter rejection is also non-selection at this utility boundary.
- Parser/import validation remains downstream and unchanged.
- No PocketRisu save, plugin reload, runtime/service, notification, or storage guardrail is affected.

## Validation / acceptance

1. A picker result `[]` caused by extension filtering returns `null` without throwing.
2. A normal accepted one-file result still returns the same name and byte payload.
3. Existing callers with cancel/null guards continue to short-circuit safely.

## Risk / blast radius

Low and localized to file-selection utility semantics. The only compatibility caveat is that a future caller may want to distinguish cancel from filter rejection; that should use an explicit typed result rather than exception behavior.

## Rollback / fallback

Revert the utility guard if the API is intentionally redesigned with a richer result type. Do not restore unconditional first-element dereference.

## Dependencies

`NONE`

## PR decomposition

No new implementation PR is required: the invariant is already adopted in official PocketRisu. If the picker API is redesigned later, keep this contract as a regression acceptance case in that single feature PR.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
