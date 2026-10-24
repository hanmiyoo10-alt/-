# Codex review recovery owner

This directory owns the bounded V1 admission check for one stuck Codex code review on one caller-selected pull request in `hanmiyoo10-alt/-`.

The owner is read-only. It composes the reviewed validation-merge semantics from #3727 through `readCurrentMain()`, `readRequiredEvidence()`, and `readReviewBarrier()` and does not parse `codex-review-state:v1` itself.

A result is `ELIGIBLE` only when the PR is open and non-draft, its head belongs to this repository, its base is exact fresh `main`, exact-head Required is PASS, #3727 classifies the exact head as `CODEX_REVIEW_PENDING`, the unique Codex summary comment has remained unchanged for at least 20 minutes by fresh GitHub `updated_at`, no repository-owner recovery marker already exists for that exact head, and a final PR reread still has the same head/base identity.

The fixed V1 retrigger request is:

```text
@codex review

<!-- canonical-main-codex-review-recovery:v1 {"schemaVersion":1,"expectedHead":"<40-hex>"} -->
```

`ELIGIBLE` is not review success and grants no effect authority. The owner performs no comment POST, branch/ref/content mutation, merge, release, or production effect. A connected-user comment effect, when separately and explicitly authorized, must re-read the PR immediately before posting the exact emitted body and must verify the created comment afterward.

The 20-minute threshold is a fixed operational recovery threshold, not an SLA and never PASS evidence. Stale-base candidates return `CURRENTIZE_FIRST`; an exact-head owner-authored marker returns `ALREADY_RETRIGGERED`; malformed/future summary time is `UNKNOWN`; terminal/findings/non-pending review states are no-effect or fail closed according to #3727 evidence.

V1 assumes a single interactive owner. It does not claim atomic exactly-once semantics across concurrent callers, does not schedule retries, and never authorizes a second automatic retry.
