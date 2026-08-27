# Feature-ID: SHARED-CBS-TOKEN-COUNT

Status: DESIGN_NEEDED

## Problem / evidence

PocketRisu-Kei commit `ae05122d6f7423a285e74d1e07fe245ac1847236` consolidated duplicated per-field token-count effects into a shared component. The component uses the accurate/CBS-aware tokenizer, debounces editor changes, and rejects stale asynchronous results with a monotonically increasing sequence.

Evidence is external (`MEDIUM`) until PocketRisu's current token-count surfaces and tokenizer ownership are audited.

## Minimal safe scope

If PocketRisu currently has duplicated/inconsistent editor token counters, introduce one reusable read-only token-count UI boundary and migrate only one or two existing call sites in the first PR. Do not add token counting to text fields that do not already need it.

## Ownership boundaries

- UI component owns debounce timer, displayed count, stale-result rejection, and cleanup.
- Existing tokenizer/generation policy remains authoritative for CBS expansion and model-token semantics.
- Storage/save behavior is untouched.
- No server/device/runtime changes.

## Mechanism

On value change, increment a generation/sequence immediately, cancel the previous pending timer, and schedule tokenization after a bounded debounce. Apply an async result only when its captured sequence still equals the latest sequence. Clean the timer on rerun/unmount. Reuse the existing generation-compatible tokenizer rather than introducing a second token-count implementation.

## Compatibility / invariants

- Token count semantics must match the tokenizer/CBS expansion used by generation for the same text.
- Rapid edits cannot display an older async result after a newer value exists.
- Component teardown cannot leave a timer that mutates detached UI.
- No save, DB flush, plugin reload, runit, Android notification, or server-phone behavior changes.

## Validation / acceptance

1. Inventory current PocketRisu token-count call sites and prove duplication/inconsistency before implementation.
2. Unit/component test: rapid A -> B -> C changes where A/B resolve after C; only C may display.
3. Cleanup test: unmount before debounce/resolve produces no later UI mutation.
4. Parity fixture containing representative CBS syntax; shared counter equals current generation-compatible tokenizer result.
5. Measure that tokenization is not started on every keystroke inside the debounce window.
6. Existing editor behavior and save semantics remain unchanged.

## Risk / blast radius

Risk LOW if limited to existing token-count UI. Main failure is misleading/stale displayed counts or unnecessary tokenizer CPU. Persistent data is not modified.

## Rollback / fallback

Revert the component/call-site migration and retain existing per-field counters. No data migration or cleanup is required.

## Dependencies

- Audit current PocketRisu token-count surfaces.
- Confirm the authoritative tokenizer/CBS expansion function and whether it is safe for repeated UI use.

## PR decomposition

1. INSPECT_ONLY: inventory call sites and tokenizer semantics; add parity/stale-result tests around existing behavior.
2. If justified, one isolated PR: shared component + one/two existing call-site migrations.
3. Optional later PRs migrate additional existing counters only after parity is proven.

Do not move to READY_TO_PORT until the two dependencies are resolved.