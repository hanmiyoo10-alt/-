# Feature-ID: STRUCTURED-REGEX-FLAG-EDITING

Status: **DESIGN_NEEDED — assistant-owned draft**

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: PocketRisu current regex-script flag representation/editor/runtime ownership audit
- Priority: `P1`
- Lifecycle status: `DESIGN_NEEDED`

## Problem / evidence

`TripleHwang/RisuVault@3836b0c37b260dd573124ef85b00920d268f0921` demonstrates a concrete representation bug: runtime regex flags and action tags such as `<cbs>` shared one raw string, while editor toggles removed a flag letter with a raw string replacement. Disabling `s` could mutate `<cbs>` into `<cb>` and silently break the action tag. Whitespace around action tags could also normalize to an empty flag set and accidentally select the wrong fallback flag, causing legal patterns to stop compiling with no visible diagnostic.

The source fix centralizes action-tag/regex-flag parsing in one module used by runtime and editor, makes the documented fallback explicit, surfaces compile errors, and reports unknown/mangled tags instead of guessing a repair.

This is evidence, not authority. Current PocketRisu may already have a different structured representation or equivalent guard.

## Minimal safe scope

1. INSPECT_ONLY the current PocketRisu script flag schema and every editor/runtime reader.
2. If raw mixed tag+flag strings still exist, add a pure parser/serializer/toggle helper without changing persisted representation.
3. Convert one editor toggle path and one runtime compile path to the shared helper.
4. Add regression tests for tags containing regex-flag letters and for invalid regex diagnostics.

Do not migrate stored script data in this first slice.

## Ownership boundaries

- Persisted script representation remains unchanged in the first slice.
- A pure shared helper owns segmentation of action tags vs actual RegExp flag letters.
- Editor owns toggling only the RegExp-flag segment.
- Runtime owns compilation using the same normalized flag interpretation.
- Existing unknown/mangled tags are diagnostic-only; no automatic repair without unambiguous evidence.

## Proposed mechanism

Parse the raw field into ordered action-tag tokens plus a normalized regex-flag set. Toggle operations mutate only the flag set, then serialize while preserving action-tag bytes/order. Runtime compilation consumes the same parser. The fallback flag is explicit and documented rather than inferred from an empty or malformed string.

If compilation fails, return a structured error suitable for both logging and the editor UI instead of swallowing it.

## Compatibility / invariants

- No persisted-format migration in the first PR.
- Healthy existing scripts serialize byte-equivalently except for intentional flag toggle output.
- `<cbs>`, `<move_top>`, and any other action tag cannot be damaged by toggling `gimsuy` letters.
- Unknown/mangled tags are not guessed or rewritten.
- Runtime and editor use one parser contract.
- PocketRisu guardrails unrelated to scripts remain untouched.

## Validation / acceptance

Focused tests:

- `<cbs>s` with `s` toggled off becomes `<cbs>`, never `<cb>s`;
- `<move_top>m` with `m` toggled off preserves `<move_top>`;
- a letter that appears only inside a tag is not treated as enabled;
- action-tag toggles round-trip without disturbing regex flags;
- whitespace around tags cannot silently switch to a different undocumented fallback;
- invalid regex returns a visible/structured compile error;
- previously mangled/unknown tags are reported but left unchanged;
- healthy scripts keep existing runtime behavior.

Acceptance: no raw substring replacement can mutate an action tag, runtime/editor flag interpretation is identical, and no storage migration is required.

## Risk / blast radius

LOW if limited to a pure parser/helper plus one editor/runtime integration. Main risk is subtly changing legacy normalization; byte-preserving tests contain that risk.

## Rollback / fallback

Revert the helper integration and return to the current code path; no persisted migration means rollback is data-neutral.

## Dependencies / PR decomposition

1. INSPECT_ONLY current representation and call sites.
2. Pure helper + tests.
3. One isolated editor/runtime integration PR if a current vulnerability or inconsistency is reproduced.
4. Any persisted-format cleanup remains a separate migration design.

## Promotion gate

Move to `READY_TO_PORT` only if current PocketRisu still mixes action tags and regex flags in a raw field, a failing regression test reproduces the mutation or interpretation bug, and the helper can land without migration.
