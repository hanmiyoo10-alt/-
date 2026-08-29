# SimCore Release System R2.7 Implementation Worksheet

Date: 2026-08-29 KST

Status: **IMPLEMENTATION IN PROGRESS · NON_RUNTIME**

Design authority: `docs/SIMCORE_RELEASE_SYSTEM_V2_7_EVIDENCE_DERIVED_OPERATIONS_DESIGN.md`

Implementation authorization: `docs/SIMCORE_RELEASE_SYSTEM_V2_7_IMPLEMENTATION_AUTHORIZATION_2026-08-29.md`

Working branch: `impl/simcore-r2-7-evidence-derived-operations`

## Ownership

```text
root/path contract      products/simcore/tooling/root-path.mjs
recovery decision      products/simcore/tooling/release-recovery-decision.mjs
operational proof      products/simcore/tooling/release-operational-proof.mjs
permanent routing      .github/workflows/simcore-release-permanent.yml
recovery routing       .github/workflows/simcore-release-state-sync.yml
regression             products/simcore/tests/suites/release-system-r2-7.test.mjs
classification         products/simcore/tooling/ci/classify.mjs + self-test
```

## Frozen exclusions

```text
plugins/simcore/latest.js       NO CHANGE
plugins/simcore/install.js      NO CHANGE
release-simcore                 NO CHANGE
production publisher authority  NO CHANGE
repo-main-write authority       NO CHANGE
HUMAN_EVIDENCE authority        NO CHANGE
background polling/retry        NONE
```

## Required implementation results

- one shared root/path contract for R2.7 owners and permanent path validation;
- pure recovery classifier with bounded dispositions;
- permanent failure diagnostic that detects stale frozen verifier after Resolve;
- recovery path classification remains read-only and append-only;
- operational proof validator derives truth from record/receipt evidence;
- no new required job;
- permanent CI classification and regression coverage;
- implementation closure only after exact latest head Verify + Required PASS.
