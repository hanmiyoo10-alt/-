# SimCore v0.70.7 Permanent Release Failure 01 — Prepublication Source Header

Date: 2026-09-05 KST
Status: **PRESERVED · FIX / BLOCKER · RELEASE STATE PREPLAY · PREPUBLICATION · NON-RUNTIME · PRODUCTION UNCHANGED**

## 1. Release identity

```text
version = 0.70.7
release = Output Snapshot Set Cost Attribution
releaseId = simcore-v0.70.7-new-01
intentId = simcore-v0.70.7-intent-01
exact approval PR = #1532
exact approval head = db313dee19b835f76d261d2d524b9ad6f00a693b
exact approval merge = 32863e215f95765683c286bc2acd59d34ab30bc6
candidate = e1766da6ff6c48a439a43256ef96640e168ba4a6
candidate blob = 65337383e1d554fc398e6d231d30711b296aaf47
expected production = e2552d7f93456652c94d9df37b0c253f12f2d900
```

## 2. Failure identity

Exact Approval Activation:

```text
workflow = SimCore Exact Approval Activation
run = 33966591536
result = FAILURE
Resolve exact delegated approval transaction = SUCCESS
Dispatch and observe permanent caller = FAILURE
```

The activation resolved the exact delegated transaction and discovered Permanent Release run `33966597972`. Activation failed only because the delegated permanent caller failed.

Permanent Release:

```text
workflow = SimCore Permanent Release
run = 33966597972
result = FAILURE
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify = SUCCESS
Candidate Required / Required = SUCCESS
Publish Exact Candidate = FAILURE
Declare Published State = SKIPPED
Permanent Release Required = SKIPPED
```

## 3. Exact failing boundary

`Publish Exact Candidate` completed all candidate and production binding checks before prepublication state preplay:

```text
observed production == expected production = PASS
candidate commit exists = PASS
candidate latest.js syntax = PASS
candidate install.js syntax = PASS
candidate latest.js == install.js = PASS
candidate latest/install blob identity = PASS
candidate blob == release spec blob = PASS
```

The failure occurred before any publication while running:

```text
release-state-preplay.mjs
phase = PRE_PUBLICATION
probes = NONE
```

Exact error:

```text
PUBLISHED_IDENTITY_NOT_OBSERVED PUBLISHED_IDENTITY_NOT_OBSERVED: source header
```

Process exited with code `2`.

Therefore the failure is downstream of immutable candidate construction/verification and upstream of the `release-simcore` mutation boundary.

## 4. Classification

```text
FIX / BLOCKER / RELEASE STATE PREPLAY / PREPUBLICATION / NON_RUNTIME / PRODUCTION UNCHANGED
```

This is not evidence of a v0.70.7 runtime defect. Candidate syntax, exact byte identity, candidate blob binding, and the permanent Candidate Required verifier all passed.

No production mutation occurred.

## 5. Machine recovery guidance

The failing publish job automatically ran `release-recovery-decision.mjs` after the preplay failure and produced:

```json
{
  "schemaVersion": 1,
  "tool": "release-recovery-decision",
  "phase": "PRE_PUBLICATION",
  "requestedPublicationState": "UNPUBLISHED",
  "effectivePublicationState": "UNPUBLISHED",
  "frozenVerifier": "32863e215f95765683c286bc2acd59d34ab30bc6",
  "currentControlPlane": "32863e215f95765683c286bc2acd59d34ab30bc6",
  "expectedProduction": "e2552d7f93456652c94d9df37b0c253f12f2d900",
  "candidateProduction": "e1766da6ff6c48a439a43256ef96640e168ba4a6",
  "observedProduction": "e2552d7f93456652c94d9df37b0c253f12f2d900",
  "controlPlaneChanged": false,
  "productionMovedUnexpectedly": false,
  "disposition": "SAFE_TO_RERUN_FAILED_JOB",
  "nextAction": "RERUN_WITH_SAME_FROZEN_VERIFIER_IS_SEMANTICALLY_SAFE",
  "authorityMutation": "NONE"
}
```

The machine therefore proves that a same-verifier rerun is semantically safe with respect to production/control-plane movement. This does not by itself prove the source-header failure was transient, so a blind rerun is not yet authorized by this evidence record.

## 6. Direct production readback after failure

After both workflows reached terminal failure, direct branch readback confirmed:

```text
main = 32863e215f95765683c286bc2acd59d34ab30bc6
release-simcore = e2552d7f93456652c94d9df37b0c253f12f2d900
production release = SimCore v0.70.6 Manual Edit Redundant Prune Elision
candidate published = NO
```

Thus:

```text
PRODUCTION EXPOSURE = NONE
CANDIDATE PUBLICATION = NONE
RELEASE-SIMCORE MUTATION = NONE
LIVE GATE = NOT ENTERED
```

## 7. Required investigation boundary

Before any rerun or recovery transaction, determine exactly what `release-state-preplay.mjs` means by `source header` and why the hypothetical v0.70.7 post-publish projection did not observe it.

Investigation must remain read-only until root cause is classified:

1. inspect `release-state-preplay.mjs`;
2. trace `PUBLISHED_IDENTITY_NOT_OBSERVED` / `source header` to its owner;
3. compare the preplay contract with the last successful v0.70.6 publication path;
4. determine whether this is a deterministic release-state projection defect, a stale administrative source header, or a truly transient external condition;
5. if release-system code requires repair, use a separate release-system branch/PR and do not mix it into the v0.70.7 runtime transaction;
6. only after the repair/evidence gate is closed may the failed Permanent Release transaction be rerun or superseded according to release authority.

Disposition:

```text
BLOCKER ACTIVE
NEXT = READ-ONLY ROOT-CAUSE TRACE OF PREPUBLICATION SOURCE HEADER
```
