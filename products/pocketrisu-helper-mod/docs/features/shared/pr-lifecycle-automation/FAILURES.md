# Failure ledger — pr-lifecycle-automation

Feature-ID: `pr-lifecycle-automation`
Stages: `CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-08-23 — helper repo direct-main fast-forward rejected
- PR / commit: pre-PR helper lifecycle rollout
- stage: `MERGE`
- symptom: non-force `main` ref update returned HTTP 422 `Update is not a fast forward`.
- facts from logs: helper repo `main` advanced concurrently due SimCore/Usage Dashboard work between inspection and ref update.
- cause: `CONFIRMED` — concurrent main movement, not content conflict.
- feedback/fix: stopped immediately; no force push. Switched this feature itself to `feat/pocketrisu-helper-pr-lifecycle` + PR #161 so main updates are isolated.
- re-validation: branch commit and PR creation succeeded.
- rollback: none required; rejected ref update changed nothing.
