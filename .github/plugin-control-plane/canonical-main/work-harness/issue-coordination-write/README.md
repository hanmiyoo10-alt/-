# Issue Coordination Write Admission

`issue_coordination_write` is the G2 safe-coordination admission profile for
existing GitHub issues.

V1 is intentionally narrow. It is a **pure classifier**, not a GitHub writer.
It performs no network request, token access, shell execution, filesystem
mutation, GraphQL call, REST call, comment POST, or issue update.

The classifier answers one question:

> Given fresh caller-supplied target classification and one requested
> coordination operation, which already-reviewed effect owner, if any, may the
> caller consider next?

Admission is never confirmation and never effect authority. Every result fixes
all repository/merge/workflow/release/production/runtime/admin/security
authority flags to `false`.

## V1 direct lane

Only one ordinary issue operation is admitted directly:

| Target | Operation | Disposition | Effect route |
| --- | --- | --- | --- |
| existing non-PR ordinary issue | `COMMENT` | `ADMIT_CONNECTOR_ISSUE_COMMENT` | `GITHUB_CONNECTOR_ADD_COMMENT_TO_ISSUE` |

Comment admission requires:

- one exact positive issue number;
- caller evidence classifying the target as a non-PR ordinary issue;
- non-empty valid text;
- no NUL;
- at most 8192 UTF-8 bytes;
- explicit user confirmation before the external effect;
- post-effect comment readback.

The classifier does not claim comment idempotency. A caller that requires
deduplication must use a specialized owner with its own marker/readback
contract.

## Canonical-main specialized routes

V1 preserves existing owners instead of generalizing them:

| Surface / intent | Disposition | Owner |
| --- | --- | --- |
| canonical work-packet body update | `ROUTE_SPECIALIZED_OWNER` | `CANONICAL_COORDINATION_BODY_PATCH` |
| #465 work-queue body update | `ROUTE_SPECIALIZED_OWNER` | `CANONICAL_COORDINATION_BODY_PATCH` |
| paired packet stage checkpoint | `ROUTE_SPECIALIZED_OWNER` | `CANONICAL_STAGE_CHECKPOINT` |
| #293 paired audit checkpoint with exact paired packet identity | `ROUTE_SPECIALIZED_OWNER` | `CANONICAL_STAGE_CHECKPOINT` |
| terminal packet close-sync | `ROUTE_SPECIALIZED_OWNER` | `CANONICAL_PACKET_CLOSURE_OWNER` |

An audit checkpoint request must also supply the exact paired packet issue identity because the existing stage-checkpoint owner writes packet + audit as one operation; audit-only checkpoint routing is forbidden. Other operations on reserved canonical surfaces fail closed with
`SPECIALIZED_OWNER_REQUIRED`. The caller must not downgrade a reserved surface
to `ORDINARY_ISSUE` merely to obtain the comment lane.

## Deferred direct mutations

Current GitHub provider contracts do not expose an atomic conditional ordinary
issue PATCH primitive. Therefore V1 does not simulate compare-and-swap with a
read-then-PATCH race.

These operations stay outside the direct lane:

- body or title update;
- reopen;
- label removal or replacement;
- assignee removal or replacement;
- milestone change.

They return
`REJECT_UNSUPPORTED_EFFECT / PROVIDER_ATOMIC_CONDITIONAL_WRITE_UNAVAILABLE`.

GitHub's issue-suggestion surface can represent some human-reviewed additions.
Accordingly `CLOSE`, `LABEL_ADD`, and `ASSIGNEE_ADD` return
`DEFER_TO_ISSUE_COORDINATION_SUGGESTION_WRITE`. V1 does not implement that
future lane and never exposes arbitrary GraphQL.

`ISSUE_CREATE` returns
`DEFER_TO_ISSUE_CREATION_IDEMPOTENCY_DESIGN`.

Pull request targets return `REJECT_PR_SURFACE` and point toward the future
`pr_collaboration_write` profile.

## Request schema

The classifier accepts exactly:

```json
{
  "schemaVersion": 1,
  "target": {
    "issueNumber": 123,
    "kind": "ISSUE",
    "surface": "ORDINARY_ISSUE"
  },
  "operation": {
    "type": "COMMENT",
    "body": "bounded coordination note"
  }
}
```

Target kinds:

- `ISSUE`
- `PULL_REQUEST`

Target surfaces:

- `ORDINARY_ISSUE`
- `CANONICAL_WORK_PACKET`
- `CANONICAL_WORK_QUEUE`
- `CANONICAL_AUDIT`
- `CANONICAL_RESERVED`

The caller owns the fresh target classification. This classifier does not fetch
GitHub state and cannot discover a hidden packet marker on its own.

## Output boundary

Every result includes:

- profile identity;
- target issue/kind/surface;
- requested operation;
- finite disposition;
- exact owner route when one exists;
- whether explicit confirmation is required;
- required evidence/readback;
- stable bounded reason codes;
- `idempotencyClaimed=false`;
- false authority flags.

The classifier never calls the returned owner route.

## Validation

Run:

```bash
node .github/plugin-control-plane/canonical-main/work-harness/issue-coordination-write/tests/issue-coordination-write-contract.cjs
```

The contract suite covers comment bounds, unknown fields, PR rejection,
reserved-surface routing, unsupported/deferred operations, confirmation,
authority flags, and a source-level guard against adding network/process/
filesystem mutation primitives.

Refs #3607 #3640 #3641 #3643.
