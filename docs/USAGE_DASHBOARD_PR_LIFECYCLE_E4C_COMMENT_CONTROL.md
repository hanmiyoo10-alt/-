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
```

Anything multiline, malformed, on another issue, or authored by a non-owner must fail closed or skip before candidate execution.

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

The comment path first checks out trusted main control code, resolves one exact candidate SHA, then checks out that exact candidate with `persist-credentials: false` and performs the existing completeness/materialization checks.

It still does not run the full PR regression before the PR; full validation remains the PR CI responsibility.

## Strict parser

`plugins/usage-dashboard/tools/release_control_command.cjs` is the single parser authority for comment commands.

It enforces:

- queue issue number `197`,
- actor equals repository owner,
- exact one-line grammar,
- exact candidate branch namespace,
- exact 40-hex SHA,
- exact release-spec namespace,
- no extra tokens or alternate paths.

The workflows repeat issue/actor/prefix filtering at the job boundary and recheck the envelope inside the trusted shell step.

## Operational flow

```text
assistant creates clean candidate branch/SHA
 -> assistant comments /usage-dashboard prepare ... on #197
 -> main-trusted E4-B read-only prepare
 -> constrained E4-B writer fast-forwards candidate
 -> assistant reads resulting candidate SHA
 -> assistant comments /usage-dashboard ready ... on #197
 -> main-trusted E2 exact-SHA read-only preflight
 -> assistant opens PR
 -> full Usage Dashboard PR CI
 -> merge
 -> existing E3 classifier / exact-byte promotion
 -> production verification
```

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
5. E2 owner-comment ready contract passes,
6. non-owner/wrong-issue/multiline/extra-token parser cases fail closed,
7. only the existing E4-B candidate writer has `contents: write`,
8. first real operational proof uses issue #197, not the Actions input UI,
9. production bytes remain unchanged through the maintenance merge.
