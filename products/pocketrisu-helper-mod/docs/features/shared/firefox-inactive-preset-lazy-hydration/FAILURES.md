# Failure ledger — firefox-inactive-preset-lazy-hydration

Feature-ID: `firefox-inactive-preset-lazy-hydration`
Stages: `DESIGN | LOCAL_TEST | CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

No implementation failure recorded yet.

Origin:
- split from `firefox-lmkd-memory-footprint` after the 2026-10-13 natural LMKD recurrence proved active-chat dehydrate insufficient for an 84-message active chat.


### 2026-10-13 — full client-suite baseline limitations
- stage: `LOCAL_TEST`
- candidate broad client run: 4 files failed / 102 passed; 85 tests failed / 1385 passed / 3 skipped.
- candidate-isolated rerun with `--maxWorkers=1` reduced this to 84 failures:
  - `geminiContextCache.test.ts`: 69 failures because Node v26.4.0 exposes no usable `localStorage` without `--localstorage-file`; all fail at `localStorage.clear()`.
  - `googleGemini.test.ts`: 14 context-cache failures for the same `localStorage.clear()` environment issue.
  - `risuSavePatcher.test.ts`: existing huge-shifted-lorebook test exceeds its 5s timeout on this device.
  - `jobRecovery.test.ts` broad-run timeout disappears in isolated execution; 50/50 PASS.
- exact-base control:
  - clean worktree at `fef7d4b0888c6a9280e50335bcca4ad6c943ca33`
  - same Node v26.4.0 and shared dependency tree
  - same four files with `--maxWorkers=1`
  - exact same 84 failures: 83 localStorage-environment failures + the same lorebook timeout.
  - base `jobRecovery.test.ts` also PASS.
- conclusion: these REDs pre-exist the feature and are environment/performance limitations, not preset-lazy regressions.
- action: do not modify unrelated Gemini cache, lorebook patcher, or job-recovery code inside this Feature-ID. Targeted preset tests, server integration, svelte-check, production build, and server suite remain the feature-owned gates.
