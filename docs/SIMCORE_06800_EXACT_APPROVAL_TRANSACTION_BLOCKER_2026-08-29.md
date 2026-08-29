# SimCore v0.68.0 Exact Approval Transaction Blocker

Date: 2026-08-29 KST

Status: **BLOCKER OBSERVED · PRODUCTION UNCHANGED · APPEND-ONLY RECOVERY REQUIRED**

Classification: **RELEASE TRANSACTION · FIX · NON_RUNTIME**

## 1. Incident

The first v0.68 exact-approval transaction was merged as PR #842 with release id `simcore-v0.68.0-new-01`.

That PR was malformed for the active `SimCore Exact Approval Activation` contract:

- the PR contained only the approval JSON;
- the activation adapter requires exactly two changed paths, one approval JSON and one machine-derived spec JSON;
- the PR title was `SimCore v0.68.0 exact approval` rather than the required `SimCore exact release approval: simcore-v0.68.0-new-01`.

Activation run `33255516665` failed in `Resolve exact delegated approval transaction` before any Permanent Release dispatch.

## 2. Safety result

```text
Permanent dispatch        SKIPPED
release-simcore mutation  NONE
candidate mutation        NONE
production version        remains v0.67.0
```

The activation guard therefore behaved correctly and prevented a malformed administrative transaction from reaching publication authority.

Classification:

```text
V06800_EXACT_APPROVAL_TRANSACTION_SHAPE
= BLOCKER / FIX

ACTIVATION_GUARD_FAIL_CLOSED
= PASS
```

## 3. Recovery rule

The malformed `new-01` transaction is retained as durable evidence and must not be rewritten or reused.

Recovery is append-only:

1. create a fresh candidate request `simcore-v0.68.0-intent-02` with release id `simcore-v0.68.0-new-02`;
2. rebuild/reverify the same authorized v0.68 runtime change from unchanged v0.67 production parent;
3. persist a fresh candidate receipt and spec shadow;
4. create one exact-approval PR whose title is exactly `SimCore exact release approval: simcore-v0.68.0-new-02`;
5. that PR must contain exactly the matching approval JSON and machine-derived spec JSON;
6. allow the existing `RS2_4_PERMANENT` authority to publish only after activation revalidation succeeds.

No runtime redesign, release-system refactor, force publication, or mutation of the failed transaction is authorized by this recovery.
