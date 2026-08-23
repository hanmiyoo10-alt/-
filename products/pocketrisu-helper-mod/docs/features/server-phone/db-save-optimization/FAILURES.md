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
- re-validation: local fork PR #4 is mergeable and remains the source of the exact proposed diff; no official upstream PR number exists yet.
- rollback: not applicable; no write to `PocketRisu/PocketRisu` occurred.

### 2026-08-23 — stage B hash-cache test file excluded from Vitest discovery
- stage: `CI`
- source branch: `hanmiyoo10-alt/PocketRisu:feat/db-save-optimization-hash-cache`
- validation PR: `hanmiyoo10-alt/PocketRisu#5` (draft, dependent on stage A)
- failed diagnostic head: `2803b0ca8ed914a54801850813d8005c3b2a6738`
- result: `FAILURE -> FIX_IN_PROGRESS`
- cause: `CONFIRMED`
- confirmed facts: dependency installation succeeded, but `pnpm exec vitest run server/node/patch-hash-cache.test.ts` exited 1 with `No test files found`; the repository Vitest configuration explicitly excludes `server/node/**`. Wiring and syntax stages were intentionally skipped after the failed prerequisite.
- feedback/fix: move the test to the repository's discovered `test/` path while continuing to import the production module from `server/node/`; rerun the same reference-equivalence suite before wiring the cache into `server.cjs`.
- independent verification: the production cache algorithm was also exercised locally against the reference `calculateHash` over deterministic add/replace/remove/copy/move cases plus 200×20 randomized top-level/nested mutations; all comparisons matched. This does not replace repository CI and is recorded only as supporting evidence.
- re-validation: pending repository-run result after moving the test to `test/patch-hash-cache.test.ts`.
- rollback: the diagnostic workflow reverted any unvalidated `server.cjs` wiring before recording the failure; no runtime deployment occurred.

Historical synthetic/atomicity/performance verification remains preserved in README/UPSTREAM; runtime failures must continue to be recorded separately from documentation CI failures.
