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


### 2026-10-13 — memory reduction not demonstrated in first live A/B
- stage: `POST_DEPLOY_VERIFY`.
- preset-array payload reduction itself is real: 24.58 MB → 0.63 MB, 98 inactive stubs / 1 active full.
- authoritative disk safety passed: 99 presets, 0 disk stubs, 0 changed preset hashes vs rollback snapshot after reload + persisted patches.
- live hydrate endpoint passed.
- however Firefox/Gecko process memory did not show a comparable drop.
- same large child PID 21638 had pre-reload cached-state PSS records around 110–148 MB and post-reload service-state records around 730→569 MB.
- state differs and URL↔PID mapping is still not strict, so neither improvement nor regression is attributed to the feature from this metric alone.
- first >10 minute post-reload window had no LMKD kill.
- conclusion: keep the feature active for data/protocol validation, but do not claim LMKD resolution or memory win until UI smoke + longer natural observation.
