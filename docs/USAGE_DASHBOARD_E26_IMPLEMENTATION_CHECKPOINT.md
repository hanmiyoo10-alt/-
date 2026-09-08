# Local Usage Dashboard E26 Implementation Acceptance

Status: **IMPLEMENTED / MERGED / BYTE-NEUTRAL / POST-MERGE CANARY PASS**

Date: 2026-09-08 KST
Canonical issue: #1895
Design authority: `docs/USAGE_DASHBOARD_E26_AUTONOMOUS_RETRY_CONVERGENCE_AND_REDUCER_SIMPLIFICATION_DESIGN.md`
Implementation PR: #1897
Implementation head: `f91bf0c895ccc360fb2a45280c7325be0417f35f`
Main merge commit: `6e0a06b40591f1bcaa4a42e5ffd908fcc76bff2c`
Scope: `plugins/usage-dashboard/` release-control maintenance only.

## Preserved release baseline

E26 is intentionally byte-neutral. Post-merge read-back confirms the deployed product remains:

- production: `release-usage-dashboard@b5ff566fdf164580b0edfa6e2db1d07cc88992bf`
- Product: `3.0.0-alpha.5.107`
- Engine: `1.6.41`
- Manager: `1.3.6`
- CLI: `1.10.0`
- Models: `1.280.0`
- contracts: `1/1`
- exact-byte deployment: VERIFIED
- 5.107 physical verification: PENDING

The `plugins/usage-dashboard/runtime/product-manifest.json` blob SHA is identical on E26 main and `release-usage-dashboard`:

`dd7bbf7d4cf6be0006f1b5f56a8e98269b092dfa`

Therefore E26 consumes no Product/Engine/Manager/CLI/Models version, requires no production promotion, requires no `+` reinstall, and does not alter the independent 5.107 actual-device acceptance state.

## Implemented control-plane scope

Changed control-plane/test files:

1. `.github/workflows/usage-dashboard-e9-release-reconcile.yml`
2. `.github/workflows/usage-dashboard-e9-validate.yml`
3. `plugins/usage-dashboard/tools/release_validation_convergence_e26.cjs`
4. `plugins/usage-dashboard/tests/p74-e26-autonomous-validation-convergence.cjs`
5. `plugins/usage-dashboard/tests/e12-event-convergence-simplification-contract.cjs`
6. `plugins/usage-dashboard/tests/e13-stage-handoff-wake-simplification-contract.cjs`

No Product, Engine, Manager, CLI, Models, runtime artifact, plugin UI/data source, release spec, release branch, or physical-acceptance authority changed.

## Implemented behavior

- existing E15 stable PR-body validation runs in the trusted-main reconciler before E9 exact-SHA dispatch;
- PR opened/edited/synchronize/reopened/closed events wake the existing reducer;
- E9 workflow completion is an immediate reducer wake source while the existing five-minute schedule remains the anti-loss fallback;
- validation attempts use append-only `UD_E9_VALIDATION_ATTEMPT_V2` receipts scoped to PR + candidate SHA;
- the existing source/candidate `attemptId` remains unchanged;
- one pure E26 helper owns validation convergence classification;
- exact full-registry `failure` is `RED_LOGICAL` and is never retried unchanged;
- only a narrowly bounded `cancelled` validation job is classified `RED_RETRYABLE`;
- unchanged candidate retry budget is at most two total attempts;
- legacy `UD_E9_VALIDATION_DISPATCHED:<sha>` and legacy `UD_VALIDATION_RESULT` receipts remain readable;
- E11, E16, assistant fresh reread, expected-head merge, monotonic exact-byte promotion, and actual-device physical acceptance remain unchanged.

## Regression evidence

The first Candidate Validation exposed stale E12/E13 assertions that permanently prohibited the E9 validation-completion `workflow_run` edge. Those assertions represented the pre-E26 wake topology, not a Product/runtime defect.

The recovery changed tests only and preserved the original safety boundaries:

- workflow-run payload is not candidate or branch authority;
- canonical platform-safe reducer wake remains;
- five-minute anti-loss schedule remains;
- reducer remains ref read-only;
- no new credential or release authority is introduced.

Final pre-merge exact implementation head validation:

- Usage Dashboard Candidate Validation run `34204104633`: **SUCCESS**
- `validate / validate`: **SUCCESS**
- full discovered Usage Dashboard registry including P74: **GREEN**
- Plugin Control Plane PR observe: **SUCCESS**
- SimCore CI: **SUCCESS**
- Usage Dashboard Durable Release Reconciler: **SUCCESS**

PR #1897 was then merged with `expected_head_sha=f91bf0c895ccc360fb2a45280c7325be0417f35f`.

## Post-merge evidence

On main merge commit `6e0a06b40591f1bcaa4a42e5ffd908fcc76bff2c`:

- Usage Dashboard Durable Release Reconciler push run `34204247428`: **SUCCESS**
- Usage Dashboard Durable Release Reconciler workflow-run canary `34204267120`: **SUCCESS**
- SimCore CI run `34204247390`: **SUCCESS**
- Canonical Main Documentation Stream: **SUCCESS**
- product-manifest blob parity with production: **VERIFIED**

No E26-specific production promotion is permitted or required because product bytes did not change.

## Automation verdict

**IMPROVED / IMPLEMENTED, with live retry-path proof still open.**

The deterministic state machine, append-only attempt ledger, first-attempt dispatch, retry eligibility, retry exhaustion, legacy compatibility, and bounded outcome classification are fully regression-covered and merged.

A real repository event in which an authoritative E9 validation attempt is genuinely `cancelled` and then automatically converges through same-candidate attempt 2 has not occurred during this implementation acceptance. This document does not manufacture that proof.

Therefore:

- implementation correctness: PASS;
- automation design/coverage: PASS;
- live same-candidate retry canary: NOT YET OBSERVED;
- safety/authority preservation: PASS.

## Safety boundaries

E26 adds no new:

- workflow;
- credential or token class;
- queue, daemon, scheduler, database, or durable state file;
- merge authority;
- promotion authority;
- physical-acceptance authority;
- `release_generation: E26` value.

## Acceptance conclusion

E26 is accepted as an implemented, merged, byte-neutral release-control improvement with full pre-merge regression GREEN, post-merge control-plane canaries GREEN, and product-manifest parity preserved.

The next product lifecycle boundary remains the independent 5.107 physical verification. E26 itself requires no PocketRisu update or device test.
