# Failure ledger — db-save-optimization

Feature-ID: `db-save-optimization`
Stages: `CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-08-23 — PR #167 dossier validation
- stage: `CI`
- PR: `hanmiyoo10-alt/-#167`
- failed head: `00083965b2d44a8c12f2a5109aee8eb13ff6acb4`
- workflow: `PocketRisu helper docs`, run `32641908788`
- result: `FAILURE`
- cause: `CONFIRMED`
- confirmed facts: the failed-head dossier omitted the validator-required canonical marker `Minimal upstream scope`; repository validator requires that literal marker in every feature `UPSTREAM.md`. The dossier already contained verification evidence, but under an expanded heading.
- feedback/fix: add a canonical `Minimal upstream scope` section and normalize `Verification evidence` while preserving the staged PR series.
- re-validation: pending after follow-up commit `5e1ef0617b7aaed3fa4bf101338a253f889c696d` and this ledger commit.
- rollback: not applicable; documentation-only PR, no server code or DB changed.

Historical synthetic/atomicity/performance verification remains preserved in README/UPSTREAM; runtime failures must continue to be recorded separately from documentation CI failures.
