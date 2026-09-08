# Local Usage Dashboard E26 Implementation Checkpoint

Status: **IMPLEMENTED ON BRANCH / FULL REGRESSION GREEN / MERGE PENDING**

Date: 2026-09-08 KST
Canonical issue: #1895
Design authority: `docs/USAGE_DASHBOARD_E26_AUTONOMOUS_RETRY_CONVERGENCE_AND_REDUCER_SIMPLIFICATION_DESIGN.md`
Scope: `plugins/usage-dashboard/` release-control maintenance only.

## Fresh implementation baseline

- main: `398fce84724eb3a6e6e028a52a1ca63a512bf67e`
- production: `release-usage-dashboard@b5ff566fdf164580b0edfa6e2db1d07cc88992bf`
- Product: `3.0.0-alpha.5.107`
- Engine: `1.6.41`
- Manager: `1.3.6`
- CLI: `1.10.0`
- Models: `1.280.0`
- contracts: `1/1`
- exact-byte deployment: VERIFIED
- physical verification: PENDING

## Implemented branch scope

E26 implementation is intentionally byte-neutral.

Changed control-plane files:

1. `.github/workflows/usage-dashboard-e9-release-reconcile.yml`
2. `.github/workflows/usage-dashboard-e9-validate.yml`
3. `plugins/usage-dashboard/tools/release_validation_convergence_e26.cjs`
4. `plugins/usage-dashboard/tests/p74-e26-autonomous-validation-convergence.cjs`
5. `plugins/usage-dashboard/tests/e12-event-convergence-simplification-contract.cjs`
6. `plugins/usage-dashboard/tests/e13-stage-handoff-wake-simplification-contract.cjs`

This checkpoint document is the only additional documentation file.

No Product, Engine, Manager, CLI, Models, runtime artifact, plugin UI/data source, release spec, release branch, or physical-acceptance authority is changed.

## Implemented behavior

- existing E15 stable PR-body validation now runs in the trusted-main reconciler before E9 exact-SHA dispatch;
- PR opened/edited/synchronize/reopened/closed events wake the existing reducer;
- E9 workflow completion is an immediate reducer wake source while the existing five-minute schedule remains self-heal fallback;
- validation attempts are append-only `UD_E9_VALIDATION_ATTEMPT_V2` receipts scoped to PR + candidate SHA;
- the existing source/candidate `attemptId` is unchanged;
- one pure E26 helper owns validation convergence classification;
- exact full-registry `failure` is `RED_LOGICAL` and is never retried unchanged;
- only a narrowly bounded `cancelled` validation job is classified `RED_RETRYABLE`;
- unchanged candidate retry budget is at most two total attempts;
- legacy `UD_E9_VALIDATION_DISPATCHED:<sha>` and legacy `UD_VALIDATION_RESULT` receipts remain readable;
- E11, E16, assistant fresh reread, expected-head merge, monotonic exact-byte promotion, and actual-device physical acceptance remain unchanged.

## Regression evidence

The first Candidate Validation run exposed stale E12/E13 assertions that permanently prohibited the E9 validation-completion `workflow_run` edge. Those assertions reflected the pre-E26 wake topology rather than an E26 product/runtime defect.

The repair changed tests only and preserved the original safety boundaries:

- workflow-run payload is not candidate or branch authority;
- canonical platform-safe reducer wake remains;
- five-minute anti-loss schedule remains;
- reducer remains ref read-only;
- no new credential or release authority is introduced.

Final pre-merge Usage Dashboard Candidate Validation:

- run: `34203948719`
- `validate / validate`: **SUCCESS**
- full discovered Usage Dashboard registry: **GREEN**
- non-authoritative deterministic release-PR lane: **SKIPPED as intended for this PR context**

Repository-wide companion checks on the same head:

- Plugin Control Plane PR observe: **SUCCESS**
- SimCore CI: **SUCCESS**
- Usage Dashboard Durable Release Reconciler: **SUCCESS**

## Safety boundaries

E26 adds no new:

- workflow;
- credential or token class;
- queue, daemon, scheduler, database, or durable state file;
- merge authority;
- promotion authority;
- physical-acceptance authority;
- `release_generation: E26` value.

Implementation acceptance remains false until PR #1897 is merged with fresh identity protection and post-merge canary/read-back confirms byte-neutral main integration.
