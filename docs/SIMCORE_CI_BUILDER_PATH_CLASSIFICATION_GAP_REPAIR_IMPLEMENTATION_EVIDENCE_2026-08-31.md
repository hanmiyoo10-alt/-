# SimCore CI Builder Path Classification Gap Repair Implementation Evidence

Date: 2026-08-31 KST
Status: **IMPLEMENTED · CI SELF-VALIDATION PENDING**
Classification: **SEPARATE REPOSITORY-SYSTEM REPAIR / NON_RUNTIME**

Design authority:

`docs/SIMCORE_CI_BUILDER_PATH_CLASSIFICATION_GAP_REPAIR_DESIGN_2026-08-31.md`

Triggering S2-3 blocker:

`docs/SIMCORE_S2_3_FINAL_CI_BLOCKER_02_BUILDER_PATH_CLASSIFICATION_GAP_2026-08-31.md`

## Exact implementation

Changed only:

```text
products/simcore/tooling/ci/classify.mjs
```

Added one bounded family rule:

```text
^products/simcore/tooling/build-[^/]+\.py$
-> CI_SELF + HARNESS
```

No generic `products/simcore/tooling/*` rule was introduced.

## Before / after target

Before:

```text
products/simcore/tooling/build-s2-3-runtime-utility-dead-exports.py
-> []
```

After:

```text
products/simcore/tooling/build-s2-3-runtime-utility-dead-exports.py
-> [CI_SELF, HARNESS]
```

Combined with SimCore documentation:

```text
before: docOnly = true
expected after: docOnly = false
```

## Frozen boundaries

Unchanged:

```text
plugin runtime bytes
release-simcore
candidate request/materialization behavior
release approval/publish behavior
state convergence
workflow triggers
planned-gate mapping in check.mjs
architecture/runtime contracts
v0.70.2 parked cache program
S2-3 cumulative builder/runtime delta
```

## Verification plan

This branch changes `products/simcore/tooling/ci/classify.mjs`, so the existing classifier marks the repair itself `CI_SELF` and permanent PR CI must exercise its self-test/static/architecture/regression lane.

After this repair merges independently, PR #1022 is the end-to-end regression proof for the new family rule:

```text
request-free S2-3 head
+ build-s2-3-runtime-utility-dead-exports.py present
-> not SIMCORE_DOC_ONLY
-> substantive final gates planned
-> no candidate request needed
```

Acceptance remains blocked until that downstream proof succeeds.

## Safety state

```text
production = v0.70.1 unchanged
release-simcore mutation = NONE
candidate persistence = NONE
runtime publication = NONE
```
