# Local Usage Dashboard — PR / CI Anomaly Review Contract

This document is durable operations memory for Local Usage Dashboard and must be read together with `docs/USAGE_DASHBOARD_GUIDELINES.md` when developing or releasing the product.

The purpose is simple: a later GREEN result must not erase an earlier abnormal PR or Actions result. Every meaningful anomaly is reviewed separately, even when the candidate, merge, or production deployment ultimately succeeds.

## Scope

Apply this contract to Local Usage Dashboard work under `plugins/usage-dashboard/` and its release infrastructure.

Review abnormal states including:

- `failure`,
- `cancelled`,
- `timed_out`,
- `action_required`,
- `startup_failure`,
- stale or superseded runs when they may hide an incomplete required check,
- an unexpected `skipped` result on a check that should have run.

Expected conditional `skipped` jobs are not incidents by themselves. Classify them before reporting them as errors.

## Required anomaly review

When a PR or related release run has an anomaly, ChatGPT must inspect it separately instead of treating a later successful rerun as sufficient evidence.

For each meaningful anomaly, determine and report:

1. **Location** — PR number, workflow/run, job and failing step when available.
2. **Failure class** — product code, test/regression, release infrastructure, GitHub permission/event behavior, concurrency/race, external dependency, or UNKNOWN.
3. **Cause confidence** — VERIFIED, SUPPORTED HYPOTHESIS, or UNKNOWN using the project evidence language.
4. **Product impact** — whether the candidate bytes, `main`, or `release-usage-dashboard` were affected.
5. **Production mutation** — explicitly state whether production moved before the failure was reported.
6. **Disposition** — code fix, infrastructure fix, bounded rerun, no action, or further evidence required.
7. **Recurrence protection** — identify the regression/guard added, or state why no new guard is appropriate.

Do not collapse these findings into a generic “CI is green now” statement.

## Feedback contract

The user should not have to notice or ask about failed PR checks manually.

During normal autonomous development, ChatGPT owns PR/CI anomaly review and should proactively surface the meaningful result in progress/final feedback. The feedback should distinguish:

- the original abnormal result,
- whether it was a real product defect or an infrastructure/verification defect,
- whether production was ever at risk,
- what was changed to prevent recurrence,
- the final verified state.

Do not ask the user to run developer commands to investigate CI. User involvement remains limited to real Android/PocketRisu validation when device-only evidence is required.

## Release safety

- Never merge or deploy a candidate while a required product validation is genuinely failing.
- A failed publisher that already mutated `release-usage-dashboard` must be checked by re-reading the release ref and exact production blobs before deciding whether deployment failed or only post-verification failed.
- Do not retry a release blindly when production mutation is UNKNOWN.
- If a failed run is proven to be a false negative, repair the verifier/infrastructure separately and demonstrate the corrected path without rewriting healthy production bytes unnecessarily.
- Preserve monotonic release and exact-byte promotion rules.

## Recordkeeping

Significant or systemic anomalies should leave durable evidence in the repository through the relevant regression, guard, PR description/comment, or a dedicated incident note when needed.

Routine transient failures that are fully explained and already covered by an existing invariant do not require a new incident document, but they still require separate review and user feedback during the active work.

## Initial reference incident

The 5.70 release provided the first concrete example of this contract:

- exact-byte promotion moved `release-usage-dashboard` from 5.69 to 5.70,
- the workflow then reported `RELEASE_REF_POSTVERIFY_MISMATCH` because an immediate read observed the previous release SHA,
- production bytes were re-read and verified as already promoted,
- PR #142 hardened bounded read-after-write verification while retaining `force:false`, monotonicity and fail-closed third-SHA handling,
- the following promotion completed successfully as `NOOP_IDENTICAL` without rewriting the already-correct 5.70 production artifacts.

This incident demonstrates the rule: investigate the RED independently, verify actual production state, fix the real failure boundary, and only then treat the release cycle as closed.
