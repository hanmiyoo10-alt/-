# SimCore v0.65.0 Exact Approval Activation Title Blocker

Date: 2026-08-28
Classification: `FIX · BLOCKER · PRODUCTION_EXPOSURE_NONE`
Status: `RECORDED · RELEASE STOPPED · APPEND_ONLY_RECOVERY REQUIRED`

## Transaction

- release: `simcore-v0.65.0-new-03`
- candidate: `49c8b326359e997835ffe33de7e082160624f805`
- expected production parent: `7765ad75359f8d9736a7dea65141e4e45b713c10`
- candidate release blob: `1b38e2b2874f2581edae8f1080edc39558febefa`
- approval merge: `804533e410dc8186625e0910996413831241f98d`
- activation run: `33171259399`

## Failure

`SimCore Exact Approval Activation` failed in `Resolve exact delegated approval transaction` before permanent caller dispatch.

Exact failure:

```text
SIMCORE_RELEASE_APPROVAL_TITLE_INVALID
```

The activation contract derives the required PR title as:

```text
SimCore exact release approval: <releaseId>
```

For this transaction the required title is:

```text
SimCore exact release approval: simcore-v0.65.0-new-03
```

The merged approval PR #731 was created with the non-canonical title:

```text
release(simcore): exact approval v0.65.0 new-03
```

This was an operator-side activation-envelope error. The approval JSON/spec contents, candidate identity, static/CI result, architecture repair, and runtime bytes are not implicated.

## Production Safety

The permanent caller dispatch step was skipped. No permanent Required run was started from this activation and `release-simcore` was not mutated by this failure.

Classification remains `PRODUCTION_EXPOSURE_NONE`.

## Rerun Experiment

PR #731 metadata was corrected after merge to the canonical title:

```text
SimCore exact release approval: simcore-v0.65.0-new-03
```

The failed activation run was then retried using GitHub's failed-job rerun mechanism. The retry still received the original event payload value:

```text
PR_TITLE: release(simcore): exact approval v0.65.0 new-03
```

and failed again with:

```text
SIMCORE_RELEASE_APPROVAL_TITLE_INVALID
```

Therefore GitHub Actions rerun semantics preserve the original pull-request event payload for this workflow. Updating closed PR metadata does not repair the already-triggered activation transaction.

This is now evidence, not an assumption.

## Recovery Boundary

The safe recovery is append-only:

1. do not edit the already-merged `new-03` approval/spec files;
2. create a fresh candidate/release identity (`intent-04` / `new-04`) from the same frozen builder and same expected production parent;
3. prove the regenerated candidate release blob remains identical to the approved v0.65.0 runtime bytes;
4. machine-generate the new exact approval/spec package;
5. create the new approval PR with the canonical title **before merge**;
6. require ordinary CI, Exact Approval Activation, and permanent `CANDIDATE_REQUIRED` verification to pass;
7. never bypass the activation title contract or permanent publisher.

Any recovery must preserve the v0.65.0 runtime behavior and production parent unless new evidence requires a new runtime candidate.
