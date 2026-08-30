# SimCore v0.69.2 Approval Activation Failure 01

Date: 2026-08-30
Classification: FIX
Scope: delegated approval transaction / exact PR-title contract
Production mutation: NONE

## Incident

Approval PR #922 carried the correct two authorization paths and exact machine-bound release identity for `simcore-v0.69.2-new-05`, but its PR title was `release(simcore): authorize v0.69.2 exact candidate` instead of the activation contract's exact required title:

```text
SimCore exact release approval: simcore-v0.69.2-new-05
```

The active approval activation workflow requires that exact title before it may resolve or dispatch a permanent release. The mismatch therefore fails closed before publication.

## Safety readback

Independent post-merge production readback showed:

```text
release-simcore = 5dc5ec1099c6097a6a0e46effeb826889a4741c3
version = 0.69.1
production mutation = NONE
```

## Recovery

Do not edit or reuse the already-touched `new-05` approval/spec paths because the activation contract requires each authorization path to have its first/only authorization touch at the approval merge. Continue append-only with a fresh candidate intent/release identity and use the exact activation title on the new approval PR.

Disposition:

```text
06902_APPROVAL_EXACT_TITLE_MISMATCH = FIX
new-05 = CONSUMED_FAILED_AUTHORIZATION_IDENTITY
recovery = FRESH intent-06 / new-06
release-simcore = UNCHANGED
```
