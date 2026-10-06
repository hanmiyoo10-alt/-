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
