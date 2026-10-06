# Failure ledger — firefox-lmkd-memory-footprint

Feature-ID: `firefox-lmkd-memory-footprint`
Stages: `DESIGN | LOCAL_TEST | CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

No implementation failure recorded yet.

Diagnostic separation:
- `excessive cpu` kills belong to `firefox-background-cpu-kill`.
- same-process document recreation belongs to `firefox-same-process-reconstruction`.
- this feature owns LMKD low-watermark/filecache reclaim and memory-footprint mitigation only.
