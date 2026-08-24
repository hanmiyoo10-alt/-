# SimCore Release System v2 — Project-Owned PR Activation Adapter

Date: 2026-08-25
Status: **IMPLEMENTATION ACTIVE · NON-RUNTIME · R FEEDBACK MINI**
Parent state: `RS2-4E REAL_RELEASE_READY`
First consumer: `simcore-v0.64.7-new-01`

## 1. Triggering problem discovered by the first genuine R release

The permanent production caller already exists at:

`.github/workflows/simcore-release-permanent.yml`

Its only operator trigger is `workflow_dispatch`.

The connected repository tool surface used by the SimCore operator does not expose workflow-dispatch creation. Requiring a human to open GitHub and press a manual Run Workflow button would contradict the project-owned automation principle adopted for R.

Classification:

```text
PERMANENT_CALLER_OPERATOR_DISPATCH_SURFACE_UNAVAILABLE
= FIX / R_FEEDBACK / AUTOMATION / NON_RUNTIME
```

This is not a runtime defect and must not be solved by creating a second publication authority.

## 2. Decision

Add a narrow project-owned PR activation adapter:

`.github/workflows/simcore-release-pr-activation.yml`

The adapter may only:

```text
observe one newly merged immutable activation JSON
→ verify it binds one existing immutable release spec
→ verify candidate transport ref points to spec.candidateCommit
→ dispatch simcore-release-permanent.yml on main
→ wait for that permanent workflow run
→ report the permanent run id/conclusion
```

The adapter must never:

```text
invoke release-publish.mjs
write release-simcore
write main state
change runtime files
create a candidate
create or modify a release spec
bypass CANDIDATE_REQUIRED
claim production authority
```

Therefore publication authority remains exactly:

`SimCore Permanent Release / RS2_4_RELEASE`

## 3. Activation data

Activation requests live under:

`products/simcore/releases/activations/<releaseId>.json`

Required v1 fields:

```json
{
  "schemaVersion": 1,
  "releaseId": "simcore-v0.64.7-new-01",
  "releaseSpecPath": "products/simcore/releases/specs/simcore-v0.64.7-new-01.json",
  "candidateFetchRef": "candidate/simcore-06407-reload-cache-continuity",
  "authorityConfirmation": "RS2_4_RELEASE"
}
```

Activation data is non-executable and one-shot/append-only.

Normal activation rule:

```text
activation file first merged touch only
spec already immutable on main
spec.releaseId == activation.releaseId
activation releaseSpecPath == canonical path for releaseId
authorityConfirmation == RS2_4_RELEASE
candidate branch head == spec.candidateCommit
PR title == SimCore permanent release activation: <releaseId>
```

Editing/reusing an already merged activation file must fail before dispatch.

## 4. Why a trigger adapter instead of another publisher

R owns publication through one fail-closed controller. A missing operator dispatch API is an invocation problem, not an authority problem.

The adapter therefore receives only:

```text
contents: read
actions: write
```

`actions: write` exists solely to dispatch the existing permanent workflow.

The permanent workflow retains all existing responsibility for:

```text
REAL_RELEASE_READY gate
immutable spec resolution
exact C/P Candidate Required
RS2_4_RELEASE verifier authority
release-simcore fast-forward
post-publish exact re-observation
LIVE_PENDING state declaration
project-owned main gateway
```

## 5. Observable transaction

After dispatch, the adapter resolves the newly created permanent workflow run, prints its run id, and waits for completion with `gh run watch --exit-status`.

This makes the real release observable from the PR-associated adapter run even when the connected repository tool cannot list arbitrary workflow_dispatch runs directly.

## 6. Permanent CI contract

CI must reject the adapter if it gains any publication primitive.

Required static assertions include:

```text
contains gh workflow run simcore-release-permanent.yml
contains gh run watch
contains RS2_4_RELEASE
contents permission remains read
actions permission remains write
no contents: write
no release-publish.mjs
no git push
no repo-main-write.py
no force update primitive
```

The adapter is classified as permanent `CI_SELF + HARNESS`, never as legacy release verification.

## 7. R feedback disposition

This adapter is a reusable R improvement learned from the first real release and is intentionally implemented as a separate non-runtime work item before v0.64.7 publication resumes.

It does not alter v0.64.7 candidate bytes or product semantics.

Long-term operator path becomes:

```text
immutable release spec
→ one immutable activation PR
→ permanent caller automatically dispatched
→ permanent release transaction observed to completion
```

No manual GitHub platform button is required.
