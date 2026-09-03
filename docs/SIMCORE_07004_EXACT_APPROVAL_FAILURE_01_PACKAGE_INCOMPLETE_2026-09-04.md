# SimCore v0.70.4 Exact Approval Failure 01 — Incomplete Approval Package — 2026-09-04

Date: 2026-09-04 KST
Classification: **FIX · EXACT_APPROVAL_PACKAGE_INCOMPLETE · NON_RUNTIME · PRODUCTION_UNCHANGED**
Status: **PRESERVED · RELEASE TRANSACTION RETRY REQUIRED**

## 1. Failed transaction

Exact approval PR:

```text
PR = #1447
head = 2ed8a077e9671a343488dfffb79adc8b4e9671f4
merge = fd3789caad56a5399efe52d51a5f64721e518769
releaseId = simcore-v0.70.4-new-01
```

Ordinary PR qualification passed:

```text
SimCore CI = 33793407646
Verify = 100775057834 · SUCCESS
Required = 100775292271 · SUCCESS
```

Post-merge exact approval activation failed:

```text
workflow = SimCore Exact Approval Activation
run = 33793514658
Dispatch Permanent Caller = 100775552672 · FAILURE
Approval Activation Required = 100775669932 · FAILURE
```

The first failing activation step was `Resolve exact delegated approval transaction`.

## 2. Exact cause

The activation adapter checks the merge commit against its first parent and requires exactly two changed paths:

```text
1 approval JSON under products/simcore/releases/approvals/
1 exact derived release spec under products/simcore/releases/specs/
```

PR #1447 contained only:

```text
products/simcore/releases/approvals/simcore-v0.70.4-new-01.json
```

The adapter therefore terminated at its exact changed-file-count assertion before resolving or dispatching the Permanent Release caller.

The same adapter additionally requires the exact PR title form:

```text
SimCore exact release approval: <releaseId>
```

PR #1447 used a different human-readable title. The changed-file-count assertion failed first, so the title check was not reached.

## 3. Why `new-01` must not be reused

The activation contract also proves each approval/spec path is first touched by the current merge on the `main` first-parent lineage:

```text
git log --first-parent <merge> -- <approval-or-spec-path>
→ exactly one touch
→ that touch must equal the current approval merge
```

The `simcore-v0.70.4-new-01` approval path was already introduced by failed merge #1447. Deleting and recreating that same path would not erase its first-parent history and would fail the first-touch contract.

Therefore the failed `new-01` approval record is preserved as historical evidence. It is not deleted or rewritten.

## 4. Recovery selection

Selected recovery is a fresh release transaction identity with the same already-verified runtime implementation:

```text
next intent = simcore-v0.70.4-intent-02
next release = simcore-v0.70.4-new-02
runtime implementation = unchanged
builder = unchanged
production base = unchanged v0.70.3
```

The new candidate must be independently materialized from the still-current production commit and receive a fresh durable receipt/spec-shadow pair. The subsequent exact approval transaction must contain exactly two first-touch paths:

```text
products/simcore/releases/approvals/simcore-v0.70.4-new-02.json
products/simcore/releases/specs/simcore-v0.70.4-new-02.json
```

Its PR title must be exactly:

```text
SimCore exact release approval: simcore-v0.70.4-new-02
```

## 5. Production disposition

Production readback after the failed activation:

```text
branch = release-simcore
commit = 4c618563f43b8a3ff0eeb18eeff5536bb287369b
version = 0.70.3
Permanent Release dispatch = NOT REACHED
```

No runtime/deployment mutation occurred.

## 6. Verdict

```text
V07004_IMPLEMENTATION = STILL PASS
V07004_CANDIDATE_NEW_01 = VALID IMMUTABLE CANDIDATE, NOT RELEASED
EXACT_APPROVAL_NEW_01 = FAILED / BURNED TRANSACTION PATH
ROOT CAUSE = INCOMPLETE APPROVAL PACKAGE
RETRY = FRESH intent-02 / new-02 RELEASE TRANSACTION
PRODUCTION = UNCHANGED v0.70.3
```
