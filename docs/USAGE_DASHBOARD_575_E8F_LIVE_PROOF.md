# Local Usage Dashboard 5.75 — E8-F Live Release Proof

Status: **IN PROGRESS — negative evidence retained; production remains 3.0.0-alpha.5.74 until exact-byte promotion succeeds**

Recorded: `2026-08-25`

Authorities:
- E8 design: Issue #312
- 5.75 release tracking: Issue #340
- E8 generation authority: `docs/USAGE_DASHBOARD_PR_LIFECYCLE_E8_EARLY_FAILURE_HARDENING.md`

## Product source intent

Target product version: `3.0.0-alpha.5.75`

Source branch:

```text
release/usage-dashboard-575-provenance-analytics-wrapper-consolidation
```

Frozen source head before retry:

```text
7cf8d5854bc60bd4aa25897ae5f38c89894f1430
```

The product change consolidates request-provenance analytics wrapper ownership and removes the superseded source module. Engine 1.6.22, Manager 1.3.0 and contracts 1/1 remain unchanged by the source intent.

## Negative operational evidence retained

### 1. Connected issue-open activation did not converge

PR #341 added an owner-authored exact stage-request issue path while preserving the existing owner-only #197 slash-command path and release-ref authority.

Live request #342 was created successfully but the `issues.opened` event alone produced no stage receipt and no candidate ref. This is retained as negative evidence; event creation was not treated as proof of stage activation.

### 2. Trusted-main self-heal repaired activation

PR #344 added a trusted-main stage-request consumer. It reads the oldest exact owner-authored `plugin:usage-dashboard` stage request and dispatches the existing trusted stage workflow through `workflow_dispatch`.

Live request #342 was then consumed with:

```text
UD_STAGE_REQUEST_DISPATCHED
consumer_run: 32819788347
```

The request was closed by `github-actions[bot]` only after GitHub accepted the trusted stage dispatch.

### 3. First real 5.75 stage failed closed before candidate mutation

Trusted stage run:

```text
32819797377
```

Result:

```text
materialize_stage: FAILURE
write_candidate: SKIPPED
```

Exact failure:

```text
E7_SOURCE_PATCH_PATH_DRIFT:plugins/usage-dashboard/src/18-request-provenance-analytics.part.js
```

Root cause: source-intent discovery used `git diff --diff-filter=ACMRT`, which omitted legitimate deleted paths even though the reconstructed patch contained the deletion.

No `stage/usage-dashboard-3.0.0-alpha.5.75` ref was created and production remained 5.74.

### 4. Delete-intent repair

PR #345 changed source-intent discovery from:

```text
ACMRT
```

to:

```text
ACDMRT
```

and added a real Git fixture proving a deleted plugin-source path remains part of frozen source intent and keeps `plugin-source` classification.

Exact PR head:

```text
3a78635e0fed3837ea028b3cca90eac346430801
```

Validation evidence:

```text
usage-dashboard candidate stage policy contract: OK · one spec, semantic diff budget including deletions, generated-output denial, monotonic target
TEST_REGISTRY_GREEN:82
SimCore Verify: GREEN
SimCore Required: GREEN
```

PR #345 was exact-head squash merged as:

```text
515828d89d49b71db89188aa6b5fdbc8a4dc200a
```

## Retry transaction

A new exact owner stage request was opened as Issue #346 for the same source branch and same source head.

This document checkpoint intentionally records the state before that retry is consumed. The next trusted-main activation must consume #346 and dispatch the existing stage workflow; no connected control surface may create or advance candidate or production refs.

## Acceptance still required

E8-F is not complete until all of the following are proven in the same 5.75 release lineage:

```text
#346 consumed by trusted-main stage-request self-heal
→ trusted stage materialization succeeds
→ stage/usage-dashboard-3.0.0-alpha.5.75 created by trusted writer
→ exactly one deterministic candidate PR
→ exact-SHA full registry GREEN
→ exact-head squash merge
→ main materialization
→ monotonic exact-byte release-usage-dashboard promotion
→ deployment receipt
→ production tuple 3.0.0-alpha.5.75 / Engine 1.6.22 / Manager 1.3.0 / contracts 1/1
```

Until then, production 5.74 remains the valid baseline and no device verification is requested.
