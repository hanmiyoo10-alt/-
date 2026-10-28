# Degraded Codex review fallback

Hosted Codex review remains preferred and authoritative. Only exact-head
`CODEX_REVIEW_PENDING`, with one owner-authored V1 recovery marker already consumed,
can use this fallback. No timeout clears review and no second hosted retrigger is made.

Run `node codex-review-degraded-fallback-owner.cjs inspect --pr <positive integer>`
to inspect eligibility, or `run --pr <positive integer> --apply` to perform the fixed
local review. The repository is always `hanmiyoo10-alt/-`. Runtime eligibility
composes the current validation and recovery owners, healthy current main, exact-head
Required PASS, current PR base, and hosted pending state. Eligibility is reread after
local execution. No caller repository, command, model, sandbox, prompt, or path is accepted.

Execution uses `/home/alsl0/nyang-repo`, `shell:false`, a read-only sandbox, and
`codex review --commit` with the exact head and constant bug-review instruction.
Only read-only `git cat-file -e` checks local object presence; there is no fetch.
The combined stdout/stderr is hashed. Observed CLI version, provider, and model
must be present and unambiguous; missing identity or invalid/duplicate machine
result markers yields UNKNOWN. Execution failure never yields CLEAR.

The bounded `canonical-main-codex-degraded-review:v1` comment envelope binds schema,
fixed mode/repository, PR, exact head/current-main base, observed CLI/provider/model,
result/count, output SHA256, recovery comment ID, and deterministic receipt digest.
The digest detects identity changes; it is not a signature. Receipt comments must
be authored by `hanmiyoo10-alt`. A separately authorized connected-user comment
effect must publish the rendered envelope durably. This owner never writes comments,
refs, source, PRs, merges, releases, or production.

Validation consumes pure parsers only while hosted review is exactly pending.
CLEAR clears only the Codex sub-gate; FINDINGS blocks. FAILED, UNKNOWN, malformed,
duplicate, conflicting, stale, or mismatched evidence fails closed. Existing review,
Required, PR/head/base/current-main and final currentness barriers remain in force.
Terminal hosted evidence always wins. The recovery owner's three-argument review
barrier continues to report hosted pending.
