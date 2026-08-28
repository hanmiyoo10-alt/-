# SimCore v0.65.0 Exact Approval Activation Title Blocker

Date: 2026-08-28
Classification: `FIX · BLOCKER · PRODUCTION_EXPOSURE_NONE`
Status: `RECORDED · RELEASE STOPPED · RECOVERY AUTHORIZED`

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

## Recovery Boundary

Prefer the smallest safe recovery that preserves the exact approved runtime identities and does not mutate approval/spec contents:

1. correct PR #731 metadata to the canonical title;
2. only if GitHub rerun semantics re-evaluate the corrected pull-request metadata, rerun the failed activation job/run;
3. otherwise use the release system's append-only recovery path rather than editing the already-merged approval/spec files;
4. never bypass `SimCore Exact Approval Activation` or permanent `CANDIDATE_REQUIRED` verification.

Any recovery must keep candidate C, production parent P, and candidate release blob unchanged unless new evidence requires a new candidate transaction.
