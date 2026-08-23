# Local Usage Dashboard — PR Lifecycle Simplification E4-B: Safe Candidate Preparation

Status: IMPLEMENTATION CANDIDATE

Baseline:

- Product `3.0.0-alpha.5.70`
- Bridge Engine `1.6.21`
- Bridge Manager `1.3.0`
- contracts `1/1`
- production branch `release-usage-dashboard`

E4-B is maintenance-only. It does not change product/runtime bytes and does not publish a release.

## Goal

> Candidate code may produce candidate bytes, but candidate code must never hold repository write credentials.

E4-B creates a permanent pre-PR materialization path so future releases do not need temporary staging workflows.

## Trust and privilege split

The permanent workflow is dispatched from `main` and accepts a target candidate branch, an exact expected branch-head SHA, and an explicit release spec.

```text
main-trusted workflow
  |
  +-- prepare job                 contents: read
  |     checkout exact candidate SHA
  |     persist-credentials: false
  |     run candidate materializer/builders
  |     validate output path allowlist
  |     create local single-parent commit
  |     export immutable Git bundle artifact
  |
  `-- commit job                  contents: write
        checkout trusted workflow SHA, not candidate tree
        never execute candidate materializer/builders
        import Git bundle only
        re-validate parent/path/mode contract using trusted main policy
        CAS target branch == expected SHA
        plain fast-forward exact payload commit
        post-verify remote ref
```

The write job must never checkout or execute the candidate tree.

## Inputs

- `target_branch`
- `expected_head_sha`
- `release_spec`

`target_branch` must match:

```text
^release/usage-dashboard-[A-Za-z0-9._-]+$
```

`main`, `release-usage-dashboard`, `release-simcore`, and every branch outside that namespace are denied.

The workflow itself must be dispatched from `refs/heads/main`. The target candidate branch is supplied only as data.

## Prepare job

The prepare job has `contents: read`, checks out the exact expected SHA, and uses `persist-credentials: false`.

Before candidate code runs, it verifies that the target branch currently points to the expected SHA. The token used for this read check is scoped to that individual trusted workflow step and is not exposed to the later materializer step.

The target release spec is explicit because a not-yet-materialized candidate may still carry the previous product manifest tuple.

Allowed release spec path:

```text
.github/usage-dashboard/releases/*.json
```

Allowed materializer path remains:

```text
plugins/usage-dashboard/tools/<safe-name>.py
```

## Materializer output allowlist

Candidate preparation may create or modify only materialized product outputs:

```text
plugins/usage-dashboard/src/**
plugins/usage-dashboard/runtime-src/**
plugins/usage-dashboard/runtime/**
plugins/usage-dashboard/latest.js
docs/USAGE_DASHBOARD_GUIDELINES.md
```

Candidate preparation must not generate or alter source-of-intent/control-plane files such as:

```text
.github/workflows/**
.github/usage-dashboard/releases/**
scripts/**
plugins/usage-dashboard/tests/**
plugins/usage-dashboard/tools/**
```

Those files must already exist in the branch before candidate preparation starts.

Any output outside the allowlist fails closed with `CANDIDATE_PREP_PATH_DENIED`.

## Local commit and Git bundle boundary

The read-only prepare job may create a local Git commit because local object creation does not mutate the remote repository.

If materialization produces no diff, preparation returns `CANDIDATE_PREP_NO_CHANGES` and the write job is skipped.

If there is a diff, the prepare job:

1. stages only allowlisted materialized outputs,
2. creates one local commit whose only parent is `expected_head_sha`,
3. validates the parent/path/mode contract,
4. creates a Git bundle containing the payload commit relative to the expected parent,
5. records a SHA256 of the bundle,
6. uploads the bundle plus metadata as a short-lived workflow artifact.

Using a Git bundle preserves exact Git tree identity, file deletion/addition, executable bits, blobs, and commit parentage without giving candidate code a write token.

## Write job

The write job is the only E4-B job with `contents: write`.

It checks out the immutable trusted workflow SHA (`github.sha` from the main-dispatched run), not the candidate payload.

It may execute only trusted control-plane code from that checkout plus Git commands needed to inspect/import/push the bundle. It must not run:

- the release materializer,
- Engine or plugin builders,
- candidate tests,
- npm/npx commands,
- any program from the imported candidate tree.

## Payload verification

Before any remote write, the trusted writer requires:

- bundle SHA256 matches prepare output,
- payload SHA matches the advertised commit,
- payload has exactly one parent,
- parent equals `expected_head_sha`,
- every changed path is in the materializer output allowlist,
- every present changed entry is a regular blob with mode `100644` or `100755`,
- symlink mode `120000` and gitlink mode `160000` are rejected.

Failure is fail-closed, including `CANDIDATE_PAYLOAD_PARENT_MISMATCH`, `CANDIDATE_PREP_PATH_DENIED`, or `CANDIDATE_PAYLOAD_MODE_DENIED`.

## Branch CAS and fast-forward only

The writer fetches the exact target branch and verifies it still points to `expected_head_sha`.

Immediately before write it checks the remote ref again. If the branch moved, preparation is stale and fails with:

```text
CANDIDATE_BRANCH_MOVED
```

There is no rebase/replay/automatic conflict repair in the privileged writer.

The push is a plain fast-forward of the exact payload SHA. `--force` and `--force-with-lease` are forbidden.

After push, the writer reads the remote ref again and requires exact equality with the payload SHA.

Success is logged as:

```text
CANDIDATE_MATERIALIZED branch=<branch> base=<sha> candidate=<sha>
```

## Relationship to E2

E4-B only materializes the branch. It does not open a PR and does not deploy.

Normal future flow:

```text
source/tests/spec/materializer prepared on candidate branch
  -> E4-B safe candidate preparation
  -> exact materialized candidate SHA
  -> E2 read-only candidate-ready preflight
  -> verify branch HEAD still equals ready SHA
  -> open PR
  -> full registry regression
  -> expected-head merge
  -> E3 release/maintenance classification
  -> exact-byte promotion only for RELEASE_CANDIDATE
```

Full P/behavior regression remains PR-only.

## Security invariants

- candidate code never receives repository write credentials,
- the privileged writer never executes candidate code,
- writer branch namespace excludes main and production release branches,
- one exact parent is required,
- output path and Git mode allowlists are re-validated after the privilege boundary,
- branch movement invalidates the payload,
- force pushes are absent,
- post-write remote SHA verification is mandatory.

## Acceptance

E4-B is complete when the permanent workflow and infrastructure regression demonstrate all invariants above while Product 5.70 / Engine 1.6.21 / Manager 1.3.0 and the five production release blobs remain unchanged.

The first future feature release should use E4-B before E2, eliminating temporary candidate writer workflows and PR-time materialization churn.
