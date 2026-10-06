# Failure ledger — firefox-same-process-reconstruction

Feature-ID: `firefox-same-process-reconstruction`
Stages: `DIAGNOSTIC | LOCAL_TEST | CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-10-06 — prior root-cause scope was too broad
- observation: sound keep-alive removal passed real-device A/B and prevented the observed `excessive cpu` kill path, but visible reconstruction later recurred with all Firefox process PIDs unchanged.
- meaning: `firefox-background-cpu-kill` fixes one confirmed mechanism but does not explain all reconstruction events.
- correction: split same-process document/runtime reconstruction into this new Feature-ID instead of broadening the CPU-kill feature.
