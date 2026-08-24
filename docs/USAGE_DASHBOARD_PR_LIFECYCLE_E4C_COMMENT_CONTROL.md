# Local Usage Dashboard — E4-C Trusted Comment Control

Status: **IMPLEMENTATION CANDIDATE**

Recorded: `2026-08-24`

## Goal

Remove the user's need to manually open GitHub Actions and fill `workflow_dispatch` inputs while preserving the existing E4-B Safe Candidate Preparation and E2 Candidate Ready security/validation behavior.

Manual `workflow_dispatch` remains available as an emergency fallback.

## Control surface

Permanent queue issue:

- `#197 — Usage Dashboard Release Control Queue`

Only commands created on that issue by the repository owner are eligible.

Accepted commands are exact single-line forms:

```text
/usage-dashboard prepare <release/usage-dashboard-...> <40-hex SHA> <.github/usage-dashboard/releases/...json>
/usage-dashboard ready <40-hex SHA>
/usage-dashboard ready-branch <release/usage-dashboard-...>
```

Anything multiline, malformed, on another issue, or authored by a non-owner must fail closed or skip before candidate execution.

`ready-branch` does not weaken E2 into a moving-branch checkout. The trusted main workflow resolves the allowed candidate branch ref exactly once through the GitHub API, freezes the returned 40-hex commit SHA, and all subsequent checkout/completeness checks operate on that exact SHA.

## Why issue_comment

GitHub `issue_comment` workflows resolve to the repository default branch and only run when the workflow file exists on the default branch. This gives the control entry a main-branch workflow trust root without executing a workflow definition from the candidate branch.

The GitHub connector can create the control comment directly, so the assistant can request E4-B/E2 runs without requiring a user UI action.

## E4-B invariants preserved

The comment path changes only how trusted input reaches E4-B.

Preserved invariants:

- candidate code never receives repository write credentials,
- privileged writer never executes candidate materializer/build/test code,
- candidate branch namespace remains `release/usage-dashboard-*`,
- exact expected branch SHA is still required,
- release spec path remains allowlisted,
- candidate branch is rechecked before materialization and again before write,
- prepared payload remains a single-parent immutable Git bundle,
- changed-path and file-mode validation remain fail-closed,
- candidate write remains a plain fast-forward with no force push,
- remote post-write SHA is verified,
- only one E4-B job requests `contents: write`.

The existing mobile-input normalization remains active for manual dispatch fallback.

## E2 invariants preserved

Candidate Ready remains read-only.

The exact-SHA comment path first checks out trusted main control code, resolves one exact candidate SHA, then checks out that exact candidate with `persist-credentials: false` and performs the existing completeness/materialization checks.

The `ready-branch` comment path additionally:

1. accepts only the `release/usage-dashboard-*` candidate namespace,
2. reuses `candidate_preparation_policy.cjs --check-target`,
3. reads the current candidate ref using only `contents: read`,
4. rejects missing or non-40-hex ref results,
5. freezes that SHA before checkout,
6. performs the same `git rev-parse HEAD == CANDIDATE_SHA` check as the direct exact-SHA path.

It still does not run the full PR regression before the PR; full validation remains the PR CI responsibility.

## Strict parser

`plugins/usage-dashboard/tools/release_control_command.cjs` is the single parser authority for comment commands.

It enforces:

- queue issue number `197`,
- actor equals repository owner,
- exact one-line grammar,
- exact candidate branch namespace,
- exact 40-hex SHA where supplied,
- exact release-spec namespace,
- no extra tokens or alternate paths.

The workflows repeat issue/actor/prefix filtering at the job boundary and recheck the envelope inside the trusted shell step.

## Operational flow

```text
assistant creates clean candidate branch/SHA
 -> assistant comments /usage-dashboard prepare ... on #197
 -> main-trusted E4-B read-only prepare
 -> constrained E4-B writer fast-forwards candidate
 -> assistant comments /usage-dashboard ready-branch <candidate branch> on #197
 -> main-trusted E2 resolves branch ref to one exact SHA
 -> E2 exact-SHA read-only preflight
 -> assistant opens PR
 -> full Usage Dashboard PR CI
 -> merge
 -> existing E3 classifier / exact-byte promotion
 -> production verification
```

The direct `/usage-dashboard ready <SHA>` form remains available when an exact materialized SHA is already known.

The user is not required to open Actions or enter branch/SHA/spec fields in the normal path.

## Production impact

E4-C is release-control maintenance only.

It must not change Local Usage Dashboard product/runtime bytes, versions, contracts, or `release-usage-dashboard` production content by itself.

Current product release remains the existing production baseline until a real release candidate is merged and promoted.

## Acceptance criteria

1. full Usage Dashboard registry GREEN,
2. E4-B manual dispatch contract remains present,
3. E4-B owner-comment prepare contract passes,
4. E2 manual dispatch contract remains present,
5. E2 owner-comment exact-SHA ready contract passes,
6. E2 owner-comment ready-branch resolves an allowed candidate branch to one exact SHA before checkout,
7. non-owner/wrong-issue/multiline/extra-token/denied-branch parser cases fail closed,
8. only the existing E4-B candidate writer has `contents: write`,
9. first real operational proof uses issue #197, not the Actions input UI,
10. production bytes remain unchanged through the maintenance merge.
