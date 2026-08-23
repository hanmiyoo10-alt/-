# Failure ledger — plugin-targeted-reload

Feature-ID: `plugin-targeted-reload`
Stages: `CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-08-23 — PR #165 dossier validation
- stage: `CI`
- PR: `hanmiyoo10-alt/-#165`
- failed head: `7bc5e38ad7af028208610821de00e265fb672129`
- workflow: `PocketRisu helper docs`, failed run `32641897241`
- result: `FAILURE -> FIXED`
- cause: `CONFIRMED`
- confirmed facts: the failed-head dossier omitted validator-required canonical markers `Minimal upstream scope` and `Verification evidence`; the repository validator requires both markers for every feature `UPSTREAM.md`.
- feedback/fix: add the canonical headings without weakening the validator or merging persistence-order work into this Feature-ID.
- re-validation: `PASS` — `PocketRisu helper docs` run `32642057729` succeeded after the canonical headings were restored and the failure was recorded.
- rollback: not applicable; documentation-only PR.

Persistence-before-reload correctness remains an explicitly separate prerequisite if current upstream still needs code changes.
