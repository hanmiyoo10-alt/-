# SimCore v0.65.0 Architecture Contract Dual-Lane Fix Evidence

Date: 2026-08-28
Classification: `FIX · STATIC_GATE · PRODUCTION_EXPOSURE_NONE`
Status: `EVIDENCE RECORDED · REPAIR IN PROGRESS`
Parent blocker: `docs/SIMCORE_06500_CANDIDATE_REQUIRED_ARCH_CONTRACT_BLOCKER_2026-08-28.md`
Parent repair design: `docs/SIMCORE_06500_ARCH_CONTRACT_REPAIR_DESIGN_2026-08-28.md`

## New Evidence

PR #728 initially promoted `edit-reconcile.physical` from `planned` to `required` while authorizing the already-existing v0.65.0 candidate Session -> `edit-reconcile` dependency.

That promotion failed both ordinary PR_MAIN architecture verification and the dedicated Contracts v2 drift guard because those lanes intentionally validate the **currently deployed production** source, which is still v0.64.11.

Dedicated architecture run `33170483747` reported exactly:

```text
SimCore architecture contract: FAIL
- /tmp/simcore-latest.js: missing required module definition(s): ['edit-reconcile']
- /tmp/simcore-install.js: missing required module definition(s): ['edit-reconcile']
```

PR_MAIN run `33170483716` independently returned `ARCH_CONTRACT_FAIL`; STATIC and REGRESSION remained PASS.

## Diagnosis

The architecture contract serves two legitimate lanes during a staged runtime release:

1. PR_MAIN / drift guard validates the **deployed production topology**.
2. CANDIDATE_REQUIRED validates the **authorized candidate topology**.

Before publication, production v0.64.11 must therefore remain valid without a physical `edit-reconcile` module, while the v0.65.0 candidate must be allowed to contain that module and the Session -> `edit-reconcile` edge.

The Contracts v2 checker already has the needed transition semantic: a module declared `physical: planned` may appear in an authorized runtime-refactor candidate, while its absence does not invalidate current production.

Therefore unconditional `physical: required` before publication was premature.

## Correct Transitional Contract

Until v0.65.0 is actually published:

- `edit-reconcile.physical` remains `planned`;
- its status records that the M2-3 candidate is physically materialized and pending publication/live validation;
- `session.allowed_dependencies` includes `edit-reconcile`, because that edge already exists in the approved candidate;
- Session's M2 target records that extraction is completed in the M2-3 candidate;
- no runtime candidate bytes change;
- no checker/gate logic is weakened.

This gives the intended dual-lane behavior:

```text
production v0.64.11: edit-reconcile absent + planned => valid
candidate v0.65.0: edit-reconcile present + authorized refactor => valid
candidate Session -> edit-reconcile edge => explicitly allowed
```

## Classification

`FIX · STATIC_GATE · PRODUCTION_EXPOSURE_NONE`

No production write occurred. `release-simcore` remains v0.64.11 and the immutable v0.65.0 candidate remains unchanged.
