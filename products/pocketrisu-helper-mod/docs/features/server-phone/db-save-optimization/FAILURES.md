# Failure ledger — db-save-optimization

Feature-ID: `db-save-optimization`
Stages: `CI | PR_SUBMISSION | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-08-23 — PR #167 dossier validation
- stage: `CI`
- PR: `hanmiyoo10-alt/-#167`
- failed head: `00083965b2d44a8c12f2a5109aee8eb13ff6acb4`
- workflow: `PocketRisu helper docs`, failed run `32641908788`
- result: `FAILURE -> FIXED`
- cause: `CONFIRMED`
- confirmed facts: the failed-head dossier omitted the validator-required canonical marker `Minimal upstream scope`; repository validator requires that literal marker in every feature `UPSTREAM.md`. The dossier already contained verification evidence, but under an expanded heading.
- feedback/fix: add a canonical `Minimal upstream scope` section and normalize `Verification evidence` while preserving the staged PR series.
- re-validation: `PASS` — `PocketRisu helper docs` run `32642077884` succeeded after the canonical headings were restored and the failure was recorded.
- rollback: not applicable; documentation-only PR, no server code or DB changed.

### 2026-08-23 — stage A official upstream PR creation blocked by integration permission
- stage: `PR_SUBMISSION`
- source branch: `hanmiyoo10-alt/PocketRisu:feat/db-save-optimization-opaque-etag`
- validation PR: `hanmiyoo10-alt/PocketRisu#4`
- official target: `PocketRisu/PocketRisu:develop`
- result: `SUBMISSION_BLOCKED`
- cause: `CONFIRMED`
- confirmed facts: creating the cross-repository pull request through the connected GitHub integration returned HTTP 403 `Resource not accessible by integration`. The source branch itself was created from official develop `e57c0435018646800566f2158fd1a9fa12caa9e2`; the failure occurred at PR creation, not while applying or validating the code.
- feedback/fix: keep the exact upstream-ready branch and validation PR; submit through a GitHub identity/integration with upstream PR-creation permission instead of attempting force writes or alternate repository mutations.
- re-validation: `RECOVERED` — the user submitted the exact clean branch through the GitHub UI, creating official `PocketRisu/PocketRisu#67`; the connector permission limitation remains a tooling constraint, not a code failure.
- rollback: not applicable; no write to `PocketRisu/PocketRisu` occurred.

### 2026-08-23 — stage B hash-cache test file excluded from Vitest discovery
- stage: `CI`
- source branch: `hanmiyoo10-alt/PocketRisu:feat/db-save-optimization-hash-cache`
- validation PR: `hanmiyoo10-alt/PocketRisu#5` (draft, dependent on stage A)
- failed diagnostic head: `2803b0ca8ed914a54801850813d8005c3b2a6738`
- result: `FAILURE -> FIXED`
- cause: `CONFIRMED`
- confirmed facts: dependency installation succeeded, but `pnpm exec vitest run server/node/patch-hash-cache.test.ts` exited 1 with `No test files found`; the repository Vitest configuration explicitly excludes `server/node/**`. Wiring and syntax stages were intentionally skipped after the failed prerequisite.
- feedback/fix: moved the test to `test/patch-hash-cache.test.ts`, preserving imports of the production module in `server/node/`; reran the same reference-equivalence suite before allowing server wiring.
- independent verification: the production cache algorithm was also exercised locally against the reference `calculateHash` over deterministic add/replace/remove/copy/move cases plus 200×20 randomized top-level/nested mutations; all comparisons matched. This was supporting evidence only and did not replace repository validation.
- re-validation: `PASS` — the revalidation workflow ran `pnpm exec vitest run test/patch-hash-cache.test.ts`, then wired the cache, ran `node --check server/node/server.cjs`, and only after those steps succeeded created bot commit `8f5a45959101a787f781da7a564f1c5c15aa51fb`. Final PR #5 changed files are exactly `server/node/patch-hash-cache.cjs`, `server/node/server.cjs`, and `test/patch-hash-cache.test.ts`; temporary workflow/diagnostic files are absent.
- rollback: the first failed diagnostic workflow reverted unvalidated `server.cjs` wiring; the later validated wiring is isolated on the stage-B branch and has not been deployed.

### 2026-08-23 — Stage D validation builder marker mismatch
- stage: `CI`
- source branch: `hanmiyoo10-alt/PocketRisu:feat/db-save-optimization-plugin-storage-child`
- final local draft PR: `hanmiyoo10-alt/PocketRisu#7`
- failed diagnostic head: `19f8e7bfb9594b04332a09fa0c39bfa4bf6a3e7b`
- result: `FAILURE -> FIXED`
- cause: `CONFIRMED`
- confirmed facts: dependency installation succeeded (`install_status=0`), but the builder searched for `function isPlainPatchRoot(value)` while the validated Stage-C helper actually declared `function isPlainPatchRoot(database)`. Wiring stopped at `collector marker count=0`; tests and syntax checks were intentionally skipped, and the Stage-C clone helper remained unchanged.
- feedback/fix: rebuild the validation step from the exact current Stage-C source marker instead of guessing the function signature; do not treat the failed builder as an algorithm failure.
- re-validation: `PASS` — the corrected run applied direct-child selective clone support, ran Stage B+C+D Vitest suites plus `node --check` for both helpers and `server.cjs`, removed diagnostics/temp workflow, and the verified result was rebuilt as clean Stage-D commit `c3ec3b5e63f7f0bcdb6888d8475f836cc9f31ca3`.
- rollback: unvalidated runtime wiring was never committed/deployed; no server phone or DB state changed.

Historical synthetic/atomicity/performance verification remains preserved in README/UPSTREAM; runtime failures must continue to be recorded separately from documentation CI failures.
