# SHARED-ASYNC-TOKEN-COUNT-OWNER

## Problem / evidence

`hanmiyoo10-alt/PocketRisu:main` currently owns description, first-message, and local-note token counting directly inside `CharConfig.svelte` with three timer/sequence holders plus a local helper. `seto-sama/PocketRisu-Kei@ae05122d6f7423a285e74d1e07fe245ac1847236` demonstrates the same behavior centralized in a reusable `TokenCount` component. Direct PocketRisu code inspection confirms the matching duplicated owner, raising evidence to HIGH for the refactor opportunity.

## Minimal safe scope

Extract only the already-existing character-editor token counters into one reusable component. Preserve current 400 ms debounce, `tokenizeAccurate`/CBS semantics, generation-based stale async rejection, current three displayed surfaces, and existing styling/layout. Do not add persona or alternate-greeting counts in the first PR.

## Ownership boundaries

- Browser UI only.
- Shared token-count component owns debounce timer, generation, async completion acceptance, cleanup, and count presentation.
- `CharConfig.svelte` owns which existing values are passed to the component.
- No DB, server, plugin, storage, service, runtime, or device ownership changes.

## Mechanism

Create a small Svelte component receiving `value` and optional class metadata. On value change: increment generation immediately, cancel the prior timer, schedule accurate tokenization after 400 ms, and publish only if the captured generation is still current. Cleanup cancels the pending timer. Replace the three existing `CharConfig` counters with this component and remove the duplicated local timer/sequence state.

## Compatibility / invariants

- Keep `tokenizeAccurate`; do not substitute an approximate tokenizer.
- Preserve CBS-aware results.
- A result started for an older value must never overwrite the latest value.
- Keystrokes must not trigger synchronous heavy tokenization.
- Do not alter persistence/save behavior, V3 plugin reload, DB flush behavior, runit, or server-phone notification behavior.
- Do not expand feature scope to new count surfaces in this PR.

## Validation / acceptance

1. Unit/component test proves no tokenize call before debounce elapses.
2. Simulated slow first tokenize followed by a newer value cannot publish the stale first result.
3. Unmount/teardown cancels pending work.
4. Description, first message, and local note render the same accurate counts as before for representative plain and CBS-containing strings.
5. Focused type/Svelte checks pass.
6. Manual visual check confirms no spacing regression on the three existing counters.

## Risk / blast radius

LOW. Browser-only presentation/refactor with no persistent state. Main risks are display/layout drift or a stale async-result regression if the generation boundary is weakened.

## Rollback / fallback

Single-feature PR can be reverted cleanly to the existing local `tokenizeField` implementation. No migration or data repair is needed.

## Dependencies

NONE.

## PR decomposition

One PR only: add shared component + focused tests + replace the three existing `CharConfig` counters. Any additional settings/persona/alternate-greeting count surfaces are separate follow-ups.

## Classification

`NO_SYSTEM_UPDATE / Importance LOW / Difficulty LOW / Size XS / Evidence HIGH / Risk LOW / Dependencies NONE / Priority P2 / READY_TO_PORT`.
