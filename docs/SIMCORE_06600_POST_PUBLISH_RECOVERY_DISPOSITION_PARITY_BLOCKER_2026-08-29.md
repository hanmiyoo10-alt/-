# SimCore v0.66.0 Post-Publish Recovery Disposition Parity Blocker

Date: 2026-08-29 KST
Status: `BLOCKER OPEN · NON_RUNTIME · PRODUCTION UNCHANGED · MAIN LIVE_PENDING NOT DURABLE`

Classification:

`FIX · BLOCKER · POST_PUBLISH_RECOVERY_DISPOSITION_PARITY · NON_RUNTIME · PRODUCTION_UNCHANGED`

## Context

The v0.66.0 runtime is already permanently published:

```text
releaseId        = simcore-v0.66.0-new-05
publisherRunId   = 33206537749
release-simcore  = 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
production blob  = f0da13d4c47fd98e9065d7dbf253a3296151ee16
version          = 0.66.0
```

The earlier release-state marker transition defect was fixed on main by PR #784. A one-shot permanent recovery request was then merged as PR #785:

```text
recovery request = products/simcore/releases/recoveries/simcore-v0.66.0-new-05-post-publish-01.json
request commit   = dae4d5a8a5c6686806c3c371660b3a9bff4c55c2
merge commit     = 33b66731f6a37b89452c2442f9461078d92d3b1c
```

Pre-merge SimCore CI passed both trusted predecessor and proposed verifier lanes.

## Failing recovery execution

Merged-event workflow:

```text
workflow = SimCore release state sync
run      = 33208706569
job      = Recover Permanent Published State
result   = FAILURE
```

Successful steps before failure:

```text
Checkout current main administrative authority = SUCCESS
Resolve immutable recovery request              = SUCCESS
Download immutable publication handoff          = SUCCESS
Verify immutable publication handoff            = SUCCESS
Materialize exact observed production           = SUCCESS
```

The workflow therefore proved the recovery request, original permanent publication artifact, current `release-simcore` commit, and latest/install blob identity before the failure.

## Exact failure

The fixed renderer itself succeeded. `post-publish-state.mjs` produced:

```json
{
  "releaseAuthority": "RS2_4_PERMANENT",
  "productionMutation": "ALREADY_PUBLISHED_UPSTREAM",
  "mainMutation": "LOCAL_PAYLOAD_PENDING_GATEWAY",
  "releaseId": "simcore-v0.66.0-new-05",
  "production": {
    "commit": "4b6ae1a4c63f6be658c6163168cc46a1adef60aa",
    "blob": "f0da13d4c47fd98e9065d7dbf253a3296151ee16",
    "version": "0.66.0",
    "releaseName": "M2-4 Session / Runtime Mirror Boundary Completion"
  },
  "declaration": "ADMIN_RECOVERY_REDECLARED",
  "stateSync": "CHECK_CLEAN",
  "currentPriority": "06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT",
  "lifecycleState": "LIVE_PENDING",
  "rLifecycleState": "REAL_RELEASE_LIVE_PENDING",
  "disposition": "LIVE_PENDING_PAYLOAD_READY"
}
```

Persistent payload allowlist:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
products/simcore/releases/records/simcore-v0.66.0-new-05.json
products/simcore/releases/state-receipts/simcore-v0.66.0-new-05.json
```

Actual changed paths were a valid subset:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
products/simcore/releases/records/simcore-v0.66.0-new-05.json
products/simcore/releases/state-receipts/simcore-v0.66.0-new-05.json
```

The failure occurred only in the workflow-local Python assertion immediately after payload generation.

Current assertion accepts:

```text
POST_PUBLISH_PAYLOAD_READY
ADMIN_STATE_ALREADY_SYNCED
```

Actual authoritative disposition from `release-state-converge` is:

```text
LIVE_PENDING_PAYLOAD_READY
```

The assertion raised `AssertionError`, causing:

```text
Rebuild bounded LIVE_PENDING administrative payload = FAILURE
Commit and gate recovered main state                 = SKIPPED
Reobserve durable main truth                         = SKIPPED
```

## Interpretation

This is a recovery-controller contract parity defect, not a renderer defect and not a runtime defect.

The marker-transition fix worked in the real recovery context. The administrative payload was generated with:

```text
stateSync = CHECK_CLEAN
lifecycleState = LIVE_PENDING
currentPriority = 06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT
```

No main write occurred because the stale workflow assertion failed before the commit/gateway step.

No `release-simcore` mutation occurred.

## Required correction

Repair only the recovery-controller disposition contract and permanent regression ownership.

Required invariant:

```text
workflow recovery assertion must accept the disposition vocabulary actually owned by post-publish-state / release-state-converge
```

Prefer one shared/derived contract over duplicated string literals where practical. Do not weaken identity, authority, allowlist, main-gateway, or reobservation checks.

The correction must preserve:

```text
immutable recovery request binding
original publisher artifact binding
exact production C/blob reobservation
latest == install
productionMutation = ALREADY_PUBLISHED_UPSTREAM
lifecycleState = LIVE_PENDING
persistent changedPaths <= allowlist
MAIN_HEALTH / Required gate before durable main write
release-simcore mutation = NONE
```

## Recovery rule

Do not rerun the failed recovery blindly.

After the disposition parity FIX reaches main and passes permanent CI, use a fresh append-only recovery request transaction if the installed workflow/event contract requires a new immutable merged event. The prior failed recovery request remains durable history.

Human real-long-chat validation remains blocked until durable main LIVE_PENDING truth is successfully established and reobserved.
