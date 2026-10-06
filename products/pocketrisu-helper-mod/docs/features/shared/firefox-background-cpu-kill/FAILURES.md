# Failure ledger — firefox-background-cpu-kill

Feature-ID: `firefox-background-cpu-kill`
Stages: `LOCAL_TEST | CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-10-06 — scope correction after same-process recurrence
- initial interpretation: Android `excessive cpu` Gecko tab kill was treated as the leading explanation for visible reconstruction generally.
- new evidence: at 16:49 visible reconstruction recurred with Firefox main/tab process PIDs unchanged and no process kill/start event.
- conclusion: sound keep-alive guard still fixes the confirmed excessive-CPU kill mechanism, but is not a complete reconstruction fix.
- correction: split the second mechanism into Feature-ID `firefox-same-process-reconstruction`; do not broaden this feature.

Diagnostic note:
- prior V3 iframe footprint and generic memory-pressure hypotheses did not establish deterministic causality.
- explicit Android `excessive cpu` evidence remains valid for this feature's narrower mechanism.


### 2026-10-06 — official PR create API permission failure
- stage: `PR_OPEN`
- candidate branch: `hanmiyoo10-alt/PocketRisu:feat/firefox-background-cpu-kill-upstream`
- candidate SHA: `d79f8af15f08b471de37aab4841deb536e0bdf5d`
- latest official base: `PocketRisu/PocketRisu@3d30fc5a1982b1b5d149b97e188b8ee45d89e1d2`
- validation before PR: `pnpm check` 0 errors / 4 pre-existing warnings; `pnpm build` PASS.
- push to fork: PASS; remote/local candidate SHA matched.
- failure: GitHub connector PR creation returned HTTP 403 `Resource not accessible by integration`.
- interpretation: repository change/branch is valid; PR-open action is blocked by connector permission, not by code or validation.
- next action: use an already-authorized local GitHub CLI/session if available; do not modify the candidate code to work around an API permission failure.
