# SimCore GitHub Actions Node 20 Runtime Deprecation Watch

Date: 2026-09-06 KST
Status: **WATCH · NON-CORRECTNESS · NON-RUNTIME**
Classification: **GITHUB ACTIONS / CONTROL-PLANE DEPENDENCY HYGIENE**

## 1. Classification

```text
WATCH · GITHUB_ACTIONS_NODE20_ACTION_RUNTIME_DEPRECATION · NON-CORRECTNESS · NON-RUNTIME
```

This observation was discovered while independently re-reading the closed R2.13 natural operational specimen. It is not an R2.13 correctness defect and is intentionally tracked as a separate topic.

## 2. Observed evidence

Source natural operation:

```text
Canonical Main Documentation Promotion run = 33988149352
Parent job = 101365409041
Result = SUCCESS
```

The hosted runner emitted a deprecation warning indicating that JavaScript actions targeting Node.js 20 were being forced to execute on Node.js 24.

The parent promotion log named at least:

```text
actions/checkout@v4
actions/setup-node@v4
```

While the exact SimCore child was being watched, its annotation additionally named:

```text
actions/setup-python@...
actions/upload-artifact@...
```

The warning family was equivalent to:

```text
Node.js 20 is deprecated.
The following actions target Node.js 20 but are being forced to run on Node.js 24.
```

## 3. Current impact assessment

Observed result:

```text
parent canonical documentation promotion = SUCCESS
Plugin Control Plane exact child = SUCCESS
SimCore MAIN_HEALTH exact child = SUCCESS
exact-base / exact-head merge = SUCCESS
```

Therefore current classification is not FIX or BLOCKER.

No evidence was observed of:

```text
workflow correctness failure
identity-binding failure
R2.12 routing regression
R2.13 exact-run regression
release-simcore mutation
runtime behavior change
production plugin failure
```

## 4. Why this remains a WATCH

GitHub currently provides compatibility by forcing the affected JavaScript actions onto Node.js 24. That compatibility layer is external platform behavior and should not be treated as permanent repository authority.

If upstream action releases or hosted-runner policy change, the warning could eventually become a hard compatibility failure.

The risk is therefore dependency lifecycle risk, not current SimCore correctness risk.

## 5. Required boundary

Do not repair this warning by opportunistically changing action versions inside an unrelated SimCore feature, runtime release, R2.13 transaction, or v0.70.10 validation task.

Any remediation must be a separate repository/control-plane dependency-hygiene design and implementation transaction with its own blast-radius review and CI evidence.

Explicit non-actions for this WATCH:

```text
release-simcore deployment = NOT APPLICABLE
latest.js mutation = FORBIDDEN
install.js mutation = FORBIDDEN
runtime version bump = NOT JUSTIFIED
R2.13 reopening = NOT JUSTIFIED
```

## 6. Reclassification triggers

Promote WATCH to FIX if any of the following occurs:

```text
an affected action stops executing successfully
GitHub announces or enforces removal of the compatibility path
hosted CI begins failing because the action runtime is unsupported
a pinned action revision becomes incompatible with the runner runtime
```

Promote to BLOCKER only if the affected action-runtime dependency prevents required SimCore verification, release, or canonical documentation control-plane operation and no already-qualified path remains available.

## 7. Recommended next action

```text
CURRENT = WATCH
NEXT = separate dependency-hygiene review when prioritized
NO RUNTIME WORK
NO R2.13 WORK
```

A future review should inventory the exact pinned action revisions used by SimCore/control-plane workflows, identify upstream revisions whose action manifests target a supported Node runtime, and qualify updates as a dedicated repository-system change.
