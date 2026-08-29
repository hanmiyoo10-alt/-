# SimCore v0.67.0 prepublication state-preplay missing sync-write-report blocker

Date: 2026-08-29
Status: BLOCKER · RELEASE SYSTEM · PRODUCTION UNCHANGED

## Context

The exact v0.67.0 candidate was already materialized and approved:

- release id: `simcore-v0.67.0-new-02`
- candidate ref: `candidate/simcore/simcore-v0.67.0-intent-02`
- candidate commit: `01a4204981191968ba22ba6ad161c1053d6bc7d0`
- candidate release blob: `24c57d86b3533a89e675c5b598b0c4a3a4fef6fe`
- expected production commit: `4b6ae1a4c63f6be658c6163168cc46a1adef60aa`
- exact approval merge: `cb16eecb5ff152972a1472844689ad5efc8354e6`

The approval activation boundary resolved successfully and dispatched permanent release run `33248665243`.

## Permanent release result

The permanent release passed all candidate authorization and verification stages:

- Resolve Permanent Authorization: PASS
- Candidate Required / Verify: PASS
- Candidate Required / Required: PASS

Publication then failed in `Publish Exact Candidate` before the production mutation step.

Failing step:

```text
Preplay post-publish state before publication
```

Terminal failure:

```text
ENOENT ENOENT: no such file or directory, open '/home/runner/work/-/-/.simcore-release/state-converge/sync-write-report.json'
Process completed with exit code 2.
```

The following publication steps were therefore skipped:

```text
Publish through permanent controller
Build immutable post-publish handoff
Upload publication transaction handoff
Declare Published State
```

## Safety / authority observation

The failure happened before publication. `release-simcore` remains at the expected v0.66 production commit:

```text
4b6ae1a4c63f6be658c6163168cc46a1adef60aa
```

No production mutation was observed.

The approved v0.67 candidate remains immutable and independently verified. This packet does **not** establish a Recovery-retirement runtime defect.

## Classification

```text
06700_PREPUBLICATION_STATE_PREPLAY_MISSING_SYNC_WRITE_REPORT
= BLOCKER / RELEASE SYSTEM
= CANDIDATE AUTHORIZATION PASS
= CANDIDATE REQUIRED PASS
= EXACT CANDIDATE STILL VALID
= FAILURE AT PREPUBLICATION POST-PUBLISH STATE PREPLAY
= MISSING .simcore-release/state-converge/sync-write-report.json
= PRODUCTION MUTATION NONE
= RELEASE-SIMCORE STILL v0.66
= M2-5 RUNTIME CORRECTNESS DEFECT NOT ESTABLISHED
```

## Required investigation boundary

Before any retry or replacement transaction:

1. inspect `products/simcore/tooling/release-state-preplay.mjs` and the state-convergence writer contract;
2. determine why preplay expects `.simcore-release/state-converge/sync-write-report.json` to exist;
3. reuse the established post-publish recovery semantics rather than inventing a manual publication path;
4. repair only the release-system preplay/state-convergence boundary on a dedicated work branch;
5. validate the control-plane repair in CI;
6. determine from repository policy whether the failed permanent run may be re-run after the control-plane repair or whether a fresh append-only recovery/correction transaction is required;
7. do not mutate `release-simcore` until the repaired permanent controller passes its prepublication qualification.

This blocker must remain separate from v0.67 M2-5 runtime feature work.
