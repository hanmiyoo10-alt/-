# Repository Work Harness — Phase A Shadow Preflight

This directory implements the first bounded slice of U-25 `Repository Work Harness`.

Phase A is **read-only shadow governance**. It normalizes repository-visible Work Records and evaluates whether already-legitimate bounded work may overlap. It does not dispatch executors, mutate Git/GitHub state, authorize release/production work, or replace project-specific authorities.

## Authority boundary

The Harness coordinates work transactions. Existing authorities remain authoritative:

- repository/Git/CI/main-write/release/project authorities;
- canonical-main Work System for canonical-main packet identity/handoff;
- project-owned task/backlog/release contracts;
- `.github/plugin-control-plane/registry.json` for project/scope/authority location;
- product-specific build, validation, release and runtime tooling.

A shadow result is advisory evidence only. It cannot upgrade task legitimacy or turn a failed project/release gate into success.

## Work Record v1

A Work Record is a reviewed, repository-reconstructible description of one bounded work transaction. It describes intent and authority semantics instead of asking the Harness to infer intent from a branch or diff.

Required fields are defined in `work-record.schema.json` and enforced by `contract.cjs`.

Important fields:

- stable `workId`, `objectiveId`, `scopeId`;
- source decision/idea and source authority references;
- task state and explicit gate/start posture;
- required capability and work type;
- semantic read authorities;
- semantic write authorities with roles;
- protected and close-sync surfaces;
- direct dependencies;
- exact/refreshable base assumptions;
- stop condition.

Write roles reuse the SimCore SYS-49 semantics:

- `PRIMARY_WRITE`
- `SUPPORTING_WRITE`
- `CLOSE_SYNC_WRITE`
- `EVIDENCE_WRITE`

## Shadow PREFLIGHT

`preflight.cjs` exports pure functions. It does not read the network or repository by itself and performs no side effects.

The caller supplies one or more Work Records. The evaluator validates each record, evaluates startability, performs pairwise compatibility checks, and returns an aggregate result.

Concurrency dispositions reuse SYS-49 exactly:

- `PARALLEL_SAFE`
- `PARALLEL_GUARDED`
- `PARALLEL_SERIALIZE_REQUIRED`
- `PARALLEL_NOT_STARTABLE`
- `PARALLEL_BLOCKED`

Precedence:

`BLOCKED > NOT_STARTABLE > SERIALIZE_REQUIRED > GUARDED > SAFE`

## Frozen v1 rules

The Phase A evaluator deliberately implements a small deterministic subset of the larger repository Harness design:

1. Invalid, incomplete, contradictory, or UNKNOWN startability input fails closed as `PARALLEL_BLOCKED`.
2. Explicitly non-startable work yields `PARALLEL_NOT_STARTABLE`.
3. Direct predecessor/dependency relations serialize.
4. Shared primary/supporting semantic write authority serializes.
5. Any non-close-sync write/write overlap serializes.
6. Write → read invalidation serializes unless the writer is only a close-sync write and the reader explicitly declares that authority refreshable at close.
7. Shared close-sync-only overlap is `PARALLEL_GUARDED` with serialized close, fresh reread, and derived-state recomputation guards.
8. Shared protected authority touched by a write serializes.
9. Exact-base assumptions on the same ref serialize when both work items may advance that ref; explicitly refreshable base assumptions are guarded instead.
10. Different branches, different filenames, and different scope IDs never independently prove safety.

The evaluator reports stable reason codes and named guards. It never silently invents task intent.

## Non-goals for HARNESS-A1

This slice does not add:

- executor dispatch;
- a top-level repository CLI;
- active-work discovery from GitHub;
- coordination receipts enforced at mutation boundaries;
- workflow integration;
- main-write/release changes;
- product/runtime behavior changes;
- global locks or scheduler/prioritizer behavior.

Those require later packets after shadow evidence is reviewed.

## Test

Run:

```sh
node .github/plugin-control-plane/canonical-main/work-harness/tests/preflight-contract.cjs
```
