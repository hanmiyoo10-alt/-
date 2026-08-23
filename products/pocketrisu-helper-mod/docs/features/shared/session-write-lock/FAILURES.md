# Failure ledger — session-write-lock

Feature-ID: `session-write-lock`
Stages: `CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-08-23 — PR #166 dossier validation
- stage: `CI`
- PR: `hanmiyoo10-alt/-#166`
- failed head: `868b9ec2b292c1c2f5e8420a8f87a7dfb1dc4547`
- workflow: `PocketRisu helper docs`, run `32641902519`
- result: `FAILURE`
- cause: `CONFIRMED`
- confirmed facts: the failed-head dossier omitted the validator-required canonical markers `Minimal upstream scope` and `Verification evidence`; repository validator source requires both markers in every feature dossier.
- feedback/fix: add the canonical headings while keeping Firefox runtime-recreation diagnostics explicitly separate from the writer-lock feature.
- re-validation: pending after follow-up commit `cdcf99dc537be78d95a7d1895d7bb155418cff00` and this ledger commit.
- rollback: not applicable; documentation-only PR.

The tab-return/logical session-boot phenomenon remains an investigation item, not a PR failure or a Node server restart.
