# SYS-36 MCP-08 Protected Implementation

Date: 2026-09-07
Tracking: #1756
Source design: `docs/SIMCORE_SYS36_BRANCH_PR_RELATIONSHIP_AUDITOR_DESIGN.md`
Base main: `2afa371192184297b2f12414f73f7ef6114a9e41`
Classification: `NON_RUNTIME · NR_PROTECTED · READ_ONLY · PROTECTED_IMPLEMENTATION_TRANSACTION`

## Goal

Materialize the frozen SYS-36 Branch/PR Relationship Auditor as one bounded SimCore MCP composition call instead of requiring a ChatGPT/operator to issue several separate GitHub reads for one relationship question.

## Reuse decision

```text
REUSE > EXTEND > COMPOSE >> NEW
```

This slice extends the existing `tools/simcore-mcp/` read-only stack.
It does not create a second GitHub client, writer, scheduler, branch controller, or release authority.

## MCP surface

```text
simcore_branch_pr_relationship_audit(...)
```

Supported frozen modes:

```text
BR-01 GENERIC_RELATION_AUDIT
BR-02 EXACT_BASE_TRANSACTION_AUDIT
BR-03 HISTORICAL_RELATION_AUDIT
```

The call returns the frozen disposition vocabulary:

```text
RELATION_CLEAN
RELATION_REVIEW_REQUIRED
RELATION_BLOCKED
RELATION_NOT_APPLICABLE
```

and preserves the frozen `BRF-*` finding / `BRI-*` informational vocabulary used by the implementation.

## Capture model

For live BR-01/BR-02 PR audits the implementation:

1. reads exact PR metadata;
2. reads required live base/head tips;
3. converts relationship work to recorded fixed base/head SHAs;
4. optionally compares those fixed SHAs;
5. validates merged identity when the PR is actually merged;
6. re-reads required live tips;
7. fails closed with `BRF-12 RELATION_SNAPSHOT_RACED` if a required tip moved during capture.

BR-03 does not require a closed historical head branch to still exist and emits `BRI-02` when later branch deletion is observed.

## Mandatory anti-inference regression

```text
merge_commit_sha != null
+ merged_at == null
!= merged
```

The implementation derives `merged` only from `merged_at != null` and emits `BRI-03 MERGE_SHA_PRESENT_PREMERGE_IGNORED` when the GitHub merge-SHA-like field is present before actual merge state.

## Exact transaction boundary

BR-02 requires explicit expected-base identity and explicit base/head movement policies.
Expected head ref/SHA, when frozen, must be supplied as a pair.
The tool never infers expected identities from title, age, branch naming, nearby timestamps, or current PR fields.

Base/head movement is surfaced as `RELATION_REVIEW_REQUIRED` by default because the caller-owned transaction policy decides the operational consequence.
Missing/ambiguous required authority, raced capture, unresolved required refs, unresolved fixed identities, or a requested failed ancestry contract fail closed as `RELATION_BLOCKED`.

## Compactness target

Primary metric:

```text
repository-owned read/tool fan-out per semantic question
```

Supported SYS-36 PR relationship questions move from a typical user-visible sequence of PR metadata + branch-tip + compare/commit reads (roughly 3–4 calls) to one composed MCP call.
Internal reads remain independently represented in the returned authority/capture fields and targeted drill-down remains available when findings require it.

## Safety boundary

The new reader is a small subclass of the existing read-only `GitHubReader` and adds only GET access to one exact PR metadata endpoint.
It exposes no create/update/delete/ref/merge primitive.

The MCP tool does not:

- merge, close, reopen, delete, or rebase a PR/branch;
- classify stale-PR hygiene;
- decide safe parallel work;
- authorize a release;
- dispatch or rerun workflows;
- mutate `main` or `release-simcore`;
- change product/runtime behavior.

## Deterministic tests

The focused test corpus covers:

- BR-01 generic clean capture;
- the PR #109 merge-SHA trap invariant;
- BR-02 expected base movement;
- BR-02 expected head movement;
- missing exact-base contract input;
- BR-03 historical missing-head allowance;
- raced-snapshot fail-closed behavior;
- open-PR missing head behavior;
- cross-repository ambiguity fail-closed behavior;
- explicit fixed-SHA ancestry contract failure;
- absence of write primitives on the SYS-36 reader.

Local isolated execution before repository write: 11/11 PASS.
Permanent repository CI remains the merge authority for this implementation PR.
