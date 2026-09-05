# Repository Control Plane Writer Inventory Drift Repair — 2026-09-05

Date: 2026-09-05 KST

Status: **REPAIR IMPLEMENTED · CI PENDING · PRODUCT RUNTIME UNCHANGED**

## Trigger

Local Usage Dashboard 5.99 implementation PR #1497 reached a clean product-specific validation state, but the repository-wide `Plugin Control Plane CI` failed independently.

The failure was the known canonical-main direct-writer classification drift previously recorded in `docs/SIMCORE_LRE1_POST_MERGE_CANONICAL_DOC_PROMOTION_WATCH_2026-09-03.md`.

Observed current direct writers included:

- `product-simcore-candidate-materialize.yml`
- `product-simcore-terminal-convergence-r2-8.yml`
- `repo-main-write-coordination-migration.yml`
- `simcore-r2-7-status-projection.yml`
- `simcore-release-command.yml`
- `simcore-release-state-sync.yml`
- `usage-dashboard-project-memory.yml`

The stale policy still expected retired/absent `simcore-release-permanent.yml` and omitted the R2.7/R2.8 writers.

## Repair

This transaction is repository-control-plane only. It does not modify Usage Dashboard runtime/product bytes, SimCore runtime/product bytes, or either production release branch.

Changes:

1. refresh `policy.json` `writerWorkflows` and `writerInventory` to current direct writers;
2. retire the absent `simcore-release-permanent.yml` adapter entry;
3. add current R2.7 status-projection and R2.8 terminal-convergence writer adapters;
4. update `canonical-main-ops.yml` workflow-run and path triggers so event-driven refresh observes those current writers;
5. update canonical-main contract assertions to the current workflow names.

## Validation rule

The repair is acceptable only if repository control-plane contracts pass and the direct writer inventory equals the repository-discovered `scripts/repo-main-write.py` workflow set.

No product release or runtime change is authorized by this document.

## Relationship to Usage Dashboard 5.99

This repair exists only to clear a repository-wide CI blocker that is independent of the 5.99 feature implementation. PR #1497 must still retain its own exact-head Usage Dashboard validation evidence before merge.
