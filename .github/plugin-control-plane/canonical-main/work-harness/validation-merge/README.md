# Validation / Merge Projection owner v1

This module owns a bounded repository-wide projection for the canonical-main
VALIDATION_MERGE interaction stage.

It does not own merge mutation.

## Shape

```text
canonical IMPLEMENTATION_PR stage receipt
+ current packet / exact Work System scope
+ direct main / #485 coherence
+ exact PR identity and changed files
+ reviews / requested reviewers / unresolved threads
+ complete fresh Work System overlap
+ exact-head SimCore Required evidence
→ inspect
→ REPOSITORY_EXECUTION_RECEIPT v2
→ REPOSITORY_AGENT_DECISION_VIEW v1
→ existing expected-head merge endpoint
→ finalize
→ POSTMERGE_CONVERGENCE
```

The protected-main effect remains outside this owner.

## Commands

```sh
node validation-merge-owner.cjs inspect \
  --packet '#N' \
  --pr N \
  --implementation-receipt-file /path/to/canonical-stage-receipt.json \
  --format agent-view

node validation-merge-owner.cjs finalize \
  --packet '#N' \
  --pr N \
  --format agent-view
```

`--format receipt` returns the canonical execution receipt instead.

The repository, base branch, expected head, workflow, merge method, GitHub
endpoint, retry policy and evidence output path are not caller inputs.

## GitHub read transport

The live owner uses the repository's already-authorized GitHub read transport without
turning credentials into evidence or caller input. If `GH_TOKEN` or `GITHUB_TOKEN` is
present, the existing fixed REST client is used. If neither environment variable is
present, V1 falls back to the already-authenticated `gh api` credential store with:

- an exact read-only REST endpoint allowlist owned by this module;
- the fixed reviewed GraphQL queries only;
- a repository-owned 20-second lifetime for each individual `gh` read, terminated with a hard child-process kill when the bound is exceeded;
- no caller-selected timeout, endpoint, method, command or query;
- no token extraction, token printing, mutation request, retry loop or merge authority.

A missing, broken, or timed-out authorized transport remains UNKNOWN through the
existing read-failure path. Timeout never converts a missing page, issue, PR file,
review, Required, currentness, or overlap observation into complete evidence. The
fallback changes transport lifetime only and does not weaken the currentness, review,
overlap or Required barriers.

## Inspect prerequisites

Inspect requires a canonical `CANONICAL_MAIN_STAGE_RECEIPT` for the same
packet's IMPLEMENTATION_PR stage.

The receipt is reprojected through the existing stage-receipt owner and must:
- be PASS;
- bind the exact packet and PR head;
- include IMPLEMENTED and CONTRACT_PROVEN;
- contain an exact path scope and diff identity;
- have no required UNKNOWN, conflict, blocker or dependency;
- point next to VALIDATION_MERGE.

Free-form packet prose does not replace this receipt.

## Current packet scope

The current packet must remain:
- native-open;
- IN_PROGRESS;
- at VALIDATION_MERGE.

Scope parsing is delegated to the existing Work System
`extractPacketScopes()`. This module does not maintain another heading/token
grammar.

The implementation receipt path set, current packet path set and live PR changed
file set must agree exactly.

## Current-main barrier

Inspect performs direct main → #485 → direct main observation and requires:
- exact SHA coherence;
- operator state CLEAR;
- Required PASS in the #485 capsule;
- UNKNOWN NONE.

A settling/stale or uncertain state cannot become merge-ready.

## PR and review barrier

The PR must be open, non-draft, same-repository, based on main/current main,
exactly at the implementation receipt head, explicitly mergeable and contain
only the packet's exact path set.

Review inspection includes:
- REST reviews;
- requested user/team reviewers;
- issue comments;
- review comments;
- one fixed GraphQL review-thread query.

CHANGES_REQUESTED and unresolved non-outdated review threads block.
Outstanding requested reviewers produce NEEDS_REVIEW.
Incomplete review-thread evidence remains UNKNOWN.
Comments alone are not an implicit veto.

## Overlap and Required

Inspect performs complete Work System discovery over every other current
canonical packet and open PR changed-file inventory. Only
COMPLETE / DISJOINT / zero findings is merge-ready.

Exact-head Required evidence is bound to the exact PR head and SimCore CI
pull_request run. The selected run and its single Required job must both be
completed successfully.

No latest-by-time heuristic is used.

## Strict up-to-date barrier

The owner also reads the current main branch's required-status protection
through the fixed `required_status_checks` endpoint.

If `strict=false`, the added ancestry barrier is `NOT_APPLICABLE` and the
existing base/head/review/overlap/Required semantics remain unchanged.

If `strict=true`, merge-ready inspection additionally requires both:

1. one fixed GraphQL read for the exact PR's `mergeStateStatus` and head OID;
2. one fixed GitHub compare read for exact `currentMainSha...expectedHead`.

The compare evidence must bind the current main as both the requested/base
identity and merge base. Only `ahead` (current main is an ancestor of the
candidate) or exact `identical` is current.

For strict protection:

- `mergeStateStatus=BEHIND` blocks with currentization required;
- compare `behind`, `diverged`, or a merge-base mismatch blocks with
  currentization required;
- missing, malformed, inaccessible, or `UNKNOWN` strict/merge-state/compare
  evidence remains UNKNOWN;
- a successful old-head Required check never overrides the strict currentness
  barrier.

The owner does not currentize the branch. A strict-currentness block routes only
to the existing currentization owner:

```text
CURRENTIZE_PR_THROUGH_EXISTING_OWNER
```

After currentization creates a new exact head that contains current main and a
new exact-head Required succeeds, a fresh inspect may become merge-ready.

## Final currentness

Before returning PASS, inspect repeats the current main/#485, packet, PR,
strict-protection/merge-state/ancestry, review and overlap barriers and requires
unchanged semantic identity.

Inspect then reports:

```text
phase=VALIDATION_MERGE
result=PASS
merge=NOT_RUN
nextLegalAction=MERGE_PR_WITH_EXISTING_EXPECTED_HEAD_ENDPOINT
```

The actual merge remains one explicit external expected-head effect.

## Finalize

Finalize loads the fixed inspect receipt/report sidecars from the checkout Git
administrative area. The caller cannot supply the expected head or merge SHA.

Finalize requires:
- canonical PASS inspect evidence;
- unchanged packet identity from inspect;
- PR closed and merged;
- exact inspected head preserved;
- valid merge commit identity.

Finalize does not require current main to equal the merge commit. That proof
belongs to POSTMERGE_CONVERGENCE.

A PASS finalize reports `merge=COMPLETE` and
`nextLegalAction=POSTMERGE_CONVERGENCE`.

## Evidence and authority

Inspect/finalize reports and canonical receipts are fixed-path, bounded,
secret-free sidecars outside tracked Git bytes with restrictive permissions.

The normal projection is:

```text
bounded validation report
→ REPOSITORY_EXECUTION_RECEIPT v2
→ REPOSITORY_AGENT_DECISION_VIEW v1
```

All derived authority flags remain false.

This owner never:
- merges or updates a PR;
- enables auto-merge;
- mutates main;
- deletes refs;
- dispatches arbitrary workflows;
- retries an effect;
- grants release, production, runtime or security authority.

UNKNOWN, CONFLICT, BLOCKED, NEEDS_REVIEW and FAIL remain explicit.

## Validation

```sh
node --check .github/plugin-control-plane/canonical-main/work-harness/validation-merge/validation-merge-owner.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-merge/tests/validation-merge-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/tests/work-system-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/execution-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/agent-decision-view-contract.cjs
```

Repo-CI MCP canonical-main status and exact-SHA tests remain neighboring
compatibility checks because this owner intentionally mirrors those evidence
semantics without replacing them.
