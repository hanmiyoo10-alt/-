# SimCore Release System v2.5 — Implementation Evidence

Date: 2026-08-28 KST
Status: **IMPLEMENTED ON WORK BRANCH · LOCAL QUALIFICATION PASS · PERMANENT CI PENDING · NON_RUNTIME**
Design authority: `docs/SIMCORE_RELEASE_SYSTEM_V2_5_APPROVAL_BOUNDARY_CONVERGENCE_DESIGN.md`
Implementation worksheet: `docs/SIMCORE_RELEASE_SYSTEM_V2_5_IMPLEMENTATION_WORKSHEET_2026-08-28.md`
Runtime mutation: **NONE**
`release-simcore` mutation: **NONE**

## 1. Implemented scope

R2.5 is implemented as a bounded stabilization of R2.4/R2.1/RS2-4.

Implemented units:

```text
R2.5-A shared approval-envelope validator
R2.5-B canonical package materialization without manual output paths
R2.5-C PR2 activation-equivalent premerge qualification in existing Verify/Required
R2.5-D PR title presentation-only semantics
R2.5-E postmerge activation reuse of the same validator
```

No runtime/plugin file is changed.

No `release-simcore` write path is added or exercised.

## 2. Shared validator

New owner:

```text
products/simcore/tooling/release-approval-envelope.mjs
```

It owns the exact approval envelope semantic boundary shared by PREMERGE and POSTMERGE validation:

```text
approval/spec changed-file shape
canonical approval/spec/shadow/receipt paths
approval/receipt/shadow binding via the existing bounded resolver
candidate and production-parent identity equality
machine-derived authorized spec equality
RS2_4_RELEASE authority marker
canonical title derivation as presentation metadata only
```

Normalized PASS authority remains:

```text
releaseAuthority = APPROVAL_ENVELOPE_VALIDATION_ONLY
productionMutation = NONE
publicationDispatch = NONE_VALIDATION_ONLY
```

The validator contains no publisher, main writer, issue mutation, PR merge, push, workflow-dispatch or polling primitive.

## 3. Package simplification

`products/simcore/tooling/release-approval-package.mjs` now derives its output paths from `releaseId`.

Normal CLI inputs are reduced to:

```text
--candidate-receipt <canonical receipt>
--spec-shadow <canonical shadow>
```

Manual `--approval-out` and `--spec-out` are rejected.

Canonical outputs are exactly:

```text
products/simcore/releases/approvals/<releaseId>.json
products/simcore/releases/specs/<releaseId>.json
```

The tool refuses to overwrite either existing authorization output and emits the canonical PR title plus C/P/blob transaction summary as convenience output only.

## 4. PR2 premerge qualification

New CI orchestration owner:

```text
products/simcore/tooling/ci/pr2-approval-qualification.mjs
```

Permanent verifier gate:

```text
GATE_PR2_PREFLIGHT
```

Trigger:

```text
PR_MAIN with changed products/simcore/releases/approvals/*.json
```

The helper checks base/head transaction shape, ensures the authorization outputs were absent from the PR base, observes the candidate ref read-only, receives the already materialized production commit from existing CI, and delegates semantic validation to the shared envelope owner.

It creates no candidate, approval authority, main state or production mutation.

## 5. Postmerge activation convergence

`.github/workflows/simcore-release-pr-activation.yml` retains:

```text
merged same-repository PR requirement
exact merge checkout
first-touch merge-history checks
candidate ref reobservation
release-simcore parent reobservation
Permanent Release dispatch + exact run observation
Approval Activation Required terminal gate
```

Duplicated releaseId/path/schema/spec semantic reconstruction was removed from workflow inline logic.

The workflow now calls `release-approval-envelope.mjs` in `POSTMERGE` mode.

The PR title is no longer supplied to the authorization path. The legacy title-blocker semantics therefore cannot recur, while the package still emits the canonical title for presentation consistency.

## 6. Permanent replay coverage

New suite:

```text
approval-boundary-convergence
```

Files:

```text
products/simcore/tests/suites/approval-boundary-convergence.test.mjs
products/simcore/tests/fixtures/approval-boundary-convergence/case.json
```

Local executable replay PASS covers:

```text
1. valid v0.65.0 new-05-like PR2 shape passes PREMERGE
2. noncanonical title remains presentation-only
3. POSTMERGE production-parent movement still fails
4. wrong authorized spec path fails PREMERGE
5. third changed file fails PREMERGE
6. canonical package creation succeeds and overwrite is refused
7. authority/simplicity wiring retains one validator and no title authority
```

Existing `release-approval` suite was also updated and locally passes all 16 assertions across NEW_VERSION, SAME_VERSION_CORRECTION and ROLLBACK controls.

## 7. Local static qualification

Completed before repository PR:

```text
release-approval-envelope.mjs syntax = PASS
pr2-approval-qualification.mjs syntax = PASS
release-approval-package.mjs syntax = PASS
check.mjs syntax = PASS
classify.mjs syntax = PASS
release-approval.test.mjs syntax = PASS
approval-boundary-convergence.test.mjs syntax = PASS
registry.mjs syntax = PASS
simcore-release-pr-activation.yml YAML parse = PASS
approval-boundary-convergence executable assertions = 7/7 PASS
release-approval executable assertions = 16/16 PASS
```

## 8. Safety / simplicity budget

Implemented result preserves:

```text
publisher count = 1
new clean-path PR = 0
new required job = 0
new polling = 0
user pre-live GitHub action target = 0
2 PR target to LIVE_PENDING = retained
3 PR target through terminal closure = retained
append-only recovery = retained
postmerge revalidation = retained
Candidate Required = retained
human LIVE_PASS = retained
```

Conceptual simplification:

```text
approval-envelope semantic owner = 1
operator-selected approval output paths = 0
PR title authorization facts = 0
```

## 9. Permanent CI gate

Pending repository PR exact-head qualification.

Required before merge:

```text
SimCore CI Verify = PASS
SimCore CI Required = PASS
full applicable permanent regression = PASS
R2.4 preflight-compression regression = PASS
architecture / closure / stability guards = PASS
```

After CI, this evidence and machine status must be updated with the exact PR, run, job and head identities, then the final evidence-bearing head must pass Verify / Required again.

## 10. First-use hold

Mechanical implementation does not claim operational success.

R2.5 first-use proof remains:

```text
NEXT GENUINE SIMCORE RUNTIME RELEASE
```

Success target:

```text
2 PRs to LIVE_PENDING
0 recovery PR caused by approval title/path authoring mistakes
0 user manual pre-live GitHub operations
1 publisher
```

Any anomaly from first use must be preserved and classified before further release-system evolution.
