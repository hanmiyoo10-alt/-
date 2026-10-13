# Failure ledger — firefox-lmkd-memory-footprint

Feature-ID: `firefox-lmkd-memory-footprint`
Stages: `DESIGN | LOCAL_TEST | CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

No implementation failure recorded yet.

Diagnostic separation:
- `excessive cpu` kills belong to `firefox-background-cpu-kill`.
- same-process document recreation belongs to `firefox-same-process-reconstruction`.
- this feature owns LMKD low-watermark/filecache reclaim and memory-footprint mitigation only.


### 2026-10-13 — active-chat dehydrate insufficient for LMKD class
- stage: `POST_DEPLOY_VERIFY`
- natural recurrence: 17:24 KST.
- LMKD explicitly reclaimed PocketRisu-correlated Firefox tab32 for `low watermark is breached or filecache is low`.
- reclaimed tab: oom_score_adj 925, RSS ~470.6MB, anon RSS ~421.7MB, swap ~72.4MB.
- active chat at the time was only 84 messages, below the 200-message dehydrate threshold.
- no `memory-guard` success log occurred that day, so the first mitigation never activated for this case.
- conclusion: active-chat background dehydrate is a valid bounded mitigation but insufficient as the global LMKD fix.
- follow-up split: `firefox-inactive-preset-lazy-hydration`.
