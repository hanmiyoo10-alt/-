# TOKEN-COUNT-ASYNC-OBSERVER-BOUNDARY

Feature-ID: `TOKEN-COUNT-ASYNC-OBSERVER-BOUNDARY`

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle: `READY_TO_PORT`

## Problem / evidence

PocketRisu currently owns CBS-aware editor token counting inside `CharConfig.svelte` with three duplicated per-field timer/sequence objects. The implementation correctly debounces expensive `tokenizeAccurate()` calls and rejects stale asynchronous completions, but the correctness rule is local and easy to reimplement inconsistently when another editor adds a token counter.

`seto-sama/PocketRisu-Kei@ae05122d6f7423a285e74d1e07fe245ac1847236` extracted the same behavior into a reusable `TokenCount.svelte` component while preserving two key semantics: 400 ms debounce off the keystroke path and sequence-based rejection of stale async results.

## Minimal safe scope

Extract only the already-existing PocketRisu `CharConfig.svelte` token-count behavior into one local UI component and replace the three existing inline counters. Do not add new counting surfaces, change tokenizer semantics, change debounce duration, or alter persistence/state ownership.

## Ownership boundaries

- UI component owns display-only debounce/timer/sequence state.
- `tokenizeAccurate()` remains the authoritative CBS-aware counting mechanism.
- Character/chat state remains owned by existing PocketRisu DB/reactive state.
- The token counter must never write user content or durable state.

## Mechanism

`TokenCount.svelte` accepts a nullable string value and optional CSS class. Each observed value change increments a sequence, clears the previous timer, schedules `tokenizeAccurate()` after 400 ms, and applies the result only if the sequence still matches. Component cleanup clears the timer.

## Compatibility / invariants

- Token counts remain CBS-aware by using `tokenizeAccurate()`.
- Counting remains debounced by 400 ms.
- A tokenizer completion for an older value must never overwrite the latest value's count.
- Unmounting must clear pending timers.
- Display-only observation must not change save ordering, DB flushing, plugin reload, runit, server-phone notification behavior, or any persistence guardrail.

## Validation / acceptance

1. `svelte-check` / type validation accepts the extracted component and updated `CharConfig.svelte`.
2. Existing three counters render from the same source values as before: description, first message, active chat author note.
3. No direct `tokenizeAccurate` import or local token timer/sequence machinery remains in `CharConfig.svelte` after extraction.
4. PR diff contains only the component extraction and corresponding character-config replacements.
5. CI/test status is recorded separately; a GitHub integration failure must not be reported as a code/test failure.

## Risk / blast radius

Low. The change is display-only and localized to token-count UI. Main failure modes are a stale count, missing count, or styling regression; it does not modify persisted content.

## Rollback / fallback

Revert the single feature commit/PR to restore the prior inline token-count code. No data migration or cleanup is needed.

## PR decomposition

One branch / one PR:

1. add `src/lib/UI/GUI/TokenCount.svelte`;
2. replace the three inline `CharConfig.svelte` counters and remove duplicated local machinery;
3. run/observe focused type/build checks available in CI.

Do not split out an unused helper-only commit/PR: the smallest coherent slice is the observer component plus all three existing owner replacements.

## Upstream suitability

Suitable as a small refactor if validation remains green. It adopts an external implementation pattern as evidence, not as authority; PocketRisu semantics above are the acceptance contract.

## Progression record — 2026-08-30 14:44 KST

INSPECT_ONLY was repeated against personal branch `feat/token-count-async-observer-boundary@e57c0435018646800566f2158fd1a9fa12caa9e2`. The matching owner is now directly confirmed at `src/lib/SideBars/CharConfig.svelte`, including the three expected 400 ms timer/sequence observers. The branch still points exactly to the intended `develop` base, with no production commit on it.

Implementation was intentionally not started. The connector mutates existing files by complete replacement, while this large component is returned through bounded/truncated response surfaces; the local execution environment also cannot resolve `github.com`, so a clean clone/patch/`pnpm check` path is unavailable. The repository `pr-check.yml` runs `pnpm check`, build, tests, and compatibility tests only for PRs targeting `main`; because this feature correctly belongs on the current `develop` base, opening a draft PR cannot be used as a substitute for the required pre-PR verification. Treat this as tooling/integration blockage only, not a failed code or CI result.

Resume only when the existing large file can be patched from a complete trustworthy source and the resulting tree can run `pnpm check` (plus focused build/tests). Then complete the one coherent extraction, verify the diff and guardrails, and only afterward open the personal-fork draft PR.
