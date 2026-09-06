# SimCore PR Identity Concurrency Collision — 2026-09-06

## Executive classification

```text
BLOCKER · PR_IDENTITY_CONCURRENCY_COLLISION · NON_RUNTIME
```

This incident occurred during the v0.70.11 `Operator Release Card Metadata Repair` prerequisite transaction.

It is not a v0.70.11 runtime defect and is not an R2.9 semantic failure. It is a transaction-identity failure in operator procedure: a cached numeric pull-request identity was used after concurrent repository activity had assigned that number to another transaction.

## Intended transaction

The intended prerequisite pull request was:

```text
PR = #1686
TITLE = fix(simcore): support changed operator validation contract
HEAD BRANCH = fix/simcore-r2-9-operator-changed-contract-projection-20260906
HEAD SHA = 76c634c71acc034ed1a920868e516626462130be
PURPOSE = activate existing R2.9 CHANGED_CONTRACT path for operator-release-card
RUNTIME MUTATION = 0
release-simcore MUTATION = 0
```

The prerequisite had already received hosted qualification on its corrected head:

```text
SimCore CI run = 34015738854
Verify = SUCCESS
Required = SUCCESS
Plugin Control Plane PR observe = SUCCESS
```

The first prerequisite CI attempt had failed closed only because the new fixture omitted its `suite` identity:

```text
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = INFRA_ERROR
reason = FIXTURE_SCHEMA_INVALID: r2-9-operator-changed-contract suite mismatch
classification = FIX · FIXTURE_SCHEMA_IDENTITY · NON_RUNTIME
```

That fixture schema issue was corrected without changing runtime or production code, and the second CI passed.

## Incorrect merge target

A stale/inaccurate numeric PR identity `#1685` was subsequently used in the merge request.

At that time, concurrent repository activity had already assigned `#1685` to a different transaction:

```text
PR = #1685
TITLE = docs(simcore-mcp): record MCP-01 implementation evidence
HEAD = docs/simcore-mcp-01-implementation-evidence-20260906
HEAD SHA = 3d5260003689c3d08b83cc00bf941e1f96c6cd76
MERGE COMMIT = b045229b69664a34a898b52ccc00b315f5c42759
CHANGED FILES = 1
TYPE = DOCUMENTATION-ONLY
```

The merge endpoint accepted the request because the supplied numeric identity referred to a valid open pull request. The expected-head guard did not protect this call because it was applied against the wrong PR identity rather than re-resolving the intended branch/head tuple first.

## Impact assessment

Observed impact is bounded:

```text
accidental merge = documentation-only MCP evidence
plugin runtime mutation = 0
release-simcore mutation = 0
latest.js mutation = 0
install.js mutation = 0
v0.70.11 publication = NOT PERFORMED
intended prerequisite #1686 = REMAINED OPEN
production correctness impact = NONE OBSERVED
```

No rollback of release-simcore is required.

The accidentally merged #1685 documentation is itself a valid MCP-01 evidence document and was not runtime code. The incident is nevertheless a BLOCKER for continuing the v0.70.11 transaction until repository evidence and exact-identity procedure are restored.

## Root cause

The root cause is use of a cached numeric PR identifier across concurrent repository activity.

The unsafe identity assumption was effectively:

```text
remembered PR number
-> assume it still names the intended transaction
-> issue merge
```

The required identity is stronger:

```text
expected head branch
+ exact expected head SHA
+ expected title/purpose when useful
+ current open PR resolving that branch/head
-> only then merge using the freshly resolved PR number
-> expected_head_sha guard
-> read back merged PR and main merge commit
```

A numeric PR number is an address, not sufficient transaction identity when the operator has not freshly resolved it from the intended branch/head.

## Required procedural guard

For SimCore merge operations performed during concurrent repository activity:

1. resolve the intended PR immediately before merge by expected head branch;
2. confirm exact head SHA equals the qualified SHA;
3. confirm base is `main` unless the transaction specifies otherwise;
4. confirm the PR purpose/title matches the intended transaction;
5. only then invoke merge using the freshly resolved numeric PR number plus `expected_head_sha`;
6. read back the merged PR after the mutation;
7. read back `main` and verify the merge commit is the intended one;
8. if any identity element differs, classify and stop before merge.

This procedure is an operator/control-plane safety rule. It does not authorize release-system workflow refactoring in the v0.70.11 feature transaction.

## Relationship to existing lanes

This incident is separate from:

- v0.70.11 runtime behavior;
- #1657 operator release-card stale metadata;
- R2.9 `CHANGED_CONTRACT` semantics;
- R2.12 source routing;
- R2.13 child-run identity binding;
- MCP-01 implementation correctness.

It must not reopen or expand those completed/independent lanes.

## Recovery sequence

The transaction may resume only in this order:

```text
1. merge this incident evidence to main
2. freshly resolve #1686 from branch/head identity
3. re-confirm #1686 head = 76c634c71acc034ed1a920868e516626462130be
4. re-confirm hosted Verify / Required qualification for that head
5. merge #1686 with expected_head_sha
6. read back #1686 merged identity and main result
7. close #1683 prerequisite issue if evidence supports closure
8. close/reclassify #1689 incident as FIXED / NON_RUNTIME
9. start v0.70.11 runtime implementation from fresh main
```

## Final current verdict

```text
INCIDENT = PRESERVED
CLASSIFICATION = BLOCKER · PR_IDENTITY_CONCURRENCY_COLLISION · NON_RUNTIME
PRODUCTION IMPACT = NONE OBSERVED
RUNTIME ROLLBACK = NOT REQUIRED
R2.9 PREREQUISITE QUALIFICATION = PASS ON HEAD 76c634c7...
R2.9 PREREQUISITE MERGE = STILL PENDING
V0.70.11 IMPLEMENTATION = PAUSED UNTIL RECOVERY SEQUENCE COMPLETES
```

Tracking: #1689
