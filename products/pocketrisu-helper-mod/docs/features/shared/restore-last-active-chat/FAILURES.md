# Failure ledger — restore-last-active-chat

Feature-ID: `restore-last-active-chat`
Stages: `CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-08-23 — PR #163 dossier validation
- stage: `CI`
- PR: `hanmiyoo10-alt/-#163`
- failed head: `c9bb9bd98d307039d54bb8583e38db2bdbde9766`
- workflow: `PocketRisu helper docs`, failed run `32641765592`, job `97199830398`
- result: `FAILURE -> FIXED`
- cause: `CONFIRMED`
- confirmed log facts:
  - validator reported `UPSTREAM.md missing marker: Minimal upstream scope`;
  - validator reported `UPSTREAM.md missing marker: Verification evidence`;
  - checkout/setup succeeded; failure occurred only in the PocketRisu helper validator step.
- root cause: the rebuilt dossier used more descriptive replacement headings but the repository validator intentionally requires the literal compatibility markers `Minimal upstream scope` and `Verification evidence` for every feature dossier.
- feedback/fix: keep the richer sections, but restore the two required canonical headings instead of weakening the validator.
- re-validation: `PASS` — `PocketRisu helper docs` run `32642035918` succeeded after the canonical headings were restored and the failure was recorded.
- rollback: not applicable; documentation-only PR, no runtime/deployment change.

Historical note: the older difficulty separating this feature from mixed source history is recorded at project level; the rebuild-dossier strategy avoids Git-history surgery.
