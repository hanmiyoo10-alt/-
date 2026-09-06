# SimCore R2.9 Operator `CHANGED_CONTRACT` Projection Gap

Date: 2026-09-06 KST
Status: **BLOCKER · DESIGN/IMPLEMENTATION PREREQUISITE · NON-RUNTIME**
Tracking: **#1683**
Blocked release: **v0.70.11 · Operator Release Card Metadata Repair**

## 1. Finding

Authorized v0.70.11 implementation intentionally changes the complete operator release-card body because production v0.70.10 carries stale v0.69 scenario/summary/live-check guidance.

Fresh inspection of the active validation path found an implementation gap in the already-designed R2.9 contract model:

```text
R2.9 design defines CHANGED_CONTRACT
validation profile validator accepts CHANGED_CONTRACT as exact-current
active operator runner accepts only CURRENT_IDENTITY_INHERIT_BEHAVIOR
active operator runner rewrites version/name to v0.69.2 and executes the historical body suite
```

Therefore the current machine topology cannot represent a legitimate operator-card body semantic change without failing required CI.

## 2. Why this blocks v0.70.11

v0.70.11 requires:

```text
card.version = 0.70.11
card.name = Operator Release Card Metadata Repair
card.scenario = 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
card.validation = PENDING_REAL_LONG_CHAT
card.summary = release-local repair guidance
card.checks = release-local validation guidance
historical 06900 / State Reconcile / Kernel Inversion release instructions = ABSENT
```

But `runOperatorCurrentIdentityInherited()` currently normalizes only version/name and then runs the v0.69.2 -> v0.69.1 -> v0.69.0 historical body chain. That historical core explicitly requires the old 06900 scenario and State Reconcile / Kernel guidance.

These requirements are mutually exclusive.

```text
V07011_DESIGN = KEEP
CURRENT_R2_9_OPERATOR_PROJECTION = INSUFFICIENT FOR CHANGED CONTRACT
V07011_IMPLEMENTATION_PR = HOLD
release-simcore = UNCHANGED
```

## 3. Root cause

Classification:

```text
BLOCKER · R2_9_OPERATOR_CHANGED_CONTRACT_PROJECTION_GAP · NON-RUNTIME
```

This is not a v0.70.11 product-design defect. It is an incomplete activation of the R2.9 design's category D:

```text
CHANGED_CONTRACT = explicit exact-current changed semantic authority
```

The R2.9 design explicitly states that a genuinely changed contract must not silently inherit historical behavior. The implementation currently exposes the enum/schema but lacks an operator-card execution path for it.

## 4. Bounded prerequisite design

A separate release-validation transaction may repair only this missing execution seam.

Required shape:

```text
1. preserve CURRENT_IDENTITY_INHERIT_BEHAVIOR exactly for all existing profiles
2. allow operator-release-card CHANGED_CONTRACT as an exact-current envelope mode
3. exact-current envelope checks only stable UI invariants:
   - current version/name
   - one button / one card
   - collapsed by default
   - no fetch/XMLHttpRequest/localStorage/IndexedDB/timer side effects
4. mark operator-release-card capability exactCurrent = true for topology preflight
5. release-specific changed body semantics remain owned by the release-specific builder regression
6. add permanent R2.9 regression proving both inherited and changed branches
```

The exact-current envelope must not pretend to prove v0.70.11-specific prose. That proof belongs to `builder-v07011`, which materializes the exact candidate and verifies scenario/validation/summary/checks plus historical-token absence.

## 5. Explicit non-changes

This prerequisite must not change:

```text
runtime/plugin source
release-simcore
publisher/controller/workflow topology
candidate materialization
exact approval
Permanent Release
HUMAN_EVIDENCE / LIVE_PASS authority
R2.8 terminal convergence
profile inventory owner
R2.10 coherent context owner
storage/network/timer/retry/polling behavior
persistent schemas
```

It is a pure validation-projection correction.

## 6. Transaction separation

The prerequisite and v0.70.11 runtime-source change must not share a PR or commit transaction.

Required order:

```text
this blocker/design record
-> separate R2.9 prerequisite implementation branch
-> required CI
-> merge prerequisite to main
-> recreate/resume v0.70.11 implementation from fresh main
-> v0.70.11 required CI
-> normal release transaction
```

The partially authored v0.70.11 implementation branch remains non-authoritative and has no open implementation PR.

## 7. Closure criteria for #1683

```text
existing inherited operator profiles still PASS unchanged
synthetic/current CHANGED_CONTRACT operator profile validates and executes exact-current envelope PASS
topology preflight resolves operator exact-current capability
no runtime/release-system authority mutation
required SimCore CI PASS
```

Only after this prerequisite closes may the v0.70.11 implementation PR be opened.
