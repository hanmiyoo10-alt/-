# Local Usage Dashboard — Repository History / Tool Inventory

Status: **IMPLEMENTED INVENTORY — CLASSIFICATION ONLY, NOT DELETION AUTHORITY**

Tracking issue: #415  
Idea ID: `NV-REPO-HISTORY`  
Recorded: `2026-08-26`

## Purpose

This document separates the current Local Usage Dashboard build/release control plane from historical one-shot patch and release helpers under `plugins/usage-dashboard/tools/`.

This is repository-history evidence only. It does **not** authorize moving or deleting any tool. A later cleanup must re-check current references, update affected release specifications or documentation, run repository regression checks, and preserve incident/reproducibility evidence.

Fresh product baseline at inventory time:

- Product: `3.0.0-alpha.5.80`
- Engine: `1.6.22`
- Manager: `1.3.0`
- Snapshot / recent-request contracts: `1 / 1`
- Release branch: `release-usage-dashboard`

No Plugin / Engine / Manager / release artifact is changed by this inventory.

## Classification rules

- **KEEP** — current authority/dependency/recovery evidence exists, or evidence is insufficient to prove movement safe.
- **ARCHIVE CANDIDATE** — not part of the current supported execution path, clearly tied to an older release/incident, but still useful for history/reproducibility. Movement is a separate change.
- **RETIRE CANDIDATE** — no current operational authority and no unique source-level historical value is known; deletion still requires a later evidence-led change.

Reason tags:

- `ACTIVE_AUTHORITY`
- `ACTIVE_TEST_OR_WORKFLOW_DEPENDENCY`
- `RECOVERY_OR_INCIDENT_VALUE`
- `HISTORICAL_REPRODUCIBILITY`
- `GENERATED_BYPRODUCT`
- `INSUFFICIENT_EVIDENCE_TO_MOVE`

A search miss means only “no current reference discovered”; it is never sufficient by itself to retire a file.

## Evidence anchors

Current workflows prove the generic control plane is live:

- `.github/workflows/usage-dashboard-stage-request-self-heal.yml` uses `release_control_command.cjs` and `candidate_preparation_policy.cjs`.
- `.github/workflows/usage-dashboard-stage-e7.yml` uses `release_control_command.cjs`, `candidate_preparation_policy.cjs`, `candidate_stage_e6.cjs`, `release_generic_preflight.cjs`, the release-spec materializer, `reconcile_release_candidate.py`, `sync_project_guidelines.py`, and `run_behavior_smoke.cjs`.
- `.github/workflows/usage-dashboard-candidate-ready.yml` uses `release_control_command.cjs`, `candidate_preparation_policy.cjs`, `resolve_release_spec.cjs`, the release-spec materializer, `reconcile_release_candidate.py`, `validate_release_candidate.py`, and `sync_project_guidelines.py`.
- `.github/workflows/reusable-usage-dashboard-validate.yml` uses `resolve_release_spec.cjs`, `check_release_monotonic.py`, `validate_release_candidate.py`, `reconcile_release_candidate.py`, the release-spec materializer, `sync_project_guidelines.py`, and `build_bridge_engine.cjs`, then runs the full registry.
- `.github/workflows/reusable-usage-dashboard-promote.yml` uses `resolve_release_spec.cjs` and `promote_release_blobs.cjs` for exact-byte promotion.
- `.github/usage-dashboard/releases/5.80.json` names `release_request_ledger_provenance_580.py` as the **current** materializer. A versioned filename is therefore not enough to classify a helper as historical.
- `build_usage_dashboard.cjs` is the deterministic modular Plugin builder for `src/parts.cjs → latest.js + src/manifest.json`.
- `README-gh-bootstrap.md`, `vendor_gh_cli.sh`, and `tools/vendor/gh/2.97.0/` explicitly form the pinned GitHub CLI bootstrap/recovery path.
- Current validation/stage workflows set `PYTHONPYCACHEPREFIX=/tmp/usage-dashboard-pycache`, so repository-tracked CPython cache files are not required by the supported validation path.

## Inventory

The rows below cover every direct child currently discovered under `plugins/usage-dashboard/tools/`, plus the tracked nested `__pycache__` and `vendor/gh/2.97.0` contents. Large mechanically similar historical families are grouped; every member is listed explicitly.

### A. Current supported authority — KEEP

| Path / group | Kind | Current evidence / replacement | Classification | Reason | Confidence | Future action |
| --- | --- | --- | --- | --- | --- | --- |
| `README-gh-bootstrap.md` | bootstrap documentation | Documents current vendored-gh bootstrap and fallback chain | **KEEP** | `ACTIVE_AUTHORITY` | high | none |
| `build_usage_dashboard.cjs` | Plugin deterministic builder | Canonical `src/parts.cjs → latest.js + manifest` builder | **KEEP** | `ACTIVE_AUTHORITY` | high | none |
| `build_bridge_engine.cjs` | Engine deterministic builder | Current validator checks Engine source parity with this tool | **KEEP** | `ACTIVE_TEST_OR_WORKFLOW_DEPENDENCY` | high | none |
| `candidate_preparation_policy.cjs` | candidate policy | Current self-heal, candidate-ready and fallback preparation workflows | **KEEP** | `ACTIVE_TEST_OR_WORKFLOW_DEPENDENCY` | high | none |
| `candidate_stage_e6.cjs` | source-intent/stage policy | Current E7 stage derives and verifies candidates through it | **KEEP** | `ACTIVE_TEST_OR_WORKFLOW_DEPENDENCY` | high | none |
| `check_release_monotonic.py` | release monotonic guard | Current reusable validation compiles and checks guard semantics | **KEEP** | `ACTIVE_TEST_OR_WORKFLOW_DEPENDENCY` | high | none |
| `promote_release_blobs.cjs` | exact-byte publisher | Current reusable promote workflow | **KEEP** | `ACTIVE_AUTHORITY` | high | none |
| `reconcile_release_candidate.py` | deterministic candidate reconciliation | Current stage/candidate/validation workflows | **KEEP** | `ACTIVE_TEST_OR_WORKFLOW_DEPENDENCY` | high | none |
| `release_control_command.cjs` | trusted release command parser | Current stage/self-heal/validation/candidate workflows | **KEEP** | `ACTIVE_AUTHORITY` | high | none |
| `release_generic_preflight.cjs` | generic release preflight | Current E7 stage preflight | **KEEP** | `ACTIVE_AUTHORITY` | high | none |
| `release_request_ledger_provenance_580.py` | current release materializer | Explicit materializer in `.github/usage-dashboard/releases/5.80.json` | **KEEP** | `ACTIVE_AUTHORITY` | high | reclassify only after production tuple advances and current refs are re-audited |
| `resolve_release_spec.cjs` | release-spec resolver | Current candidate-ready/validation/promotion workflows | **KEEP** | `ACTIVE_AUTHORITY` | high | none |
| `run_behavior_smoke.cjs` | behavior smoke runner | Current E7 stage invokes it according to Engine/Plugin change class | **KEEP** | `ACTIVE_TEST_OR_WORKFLOW_DEPENDENCY` | high | none |
| `sync_project_guidelines.py` | generated-guideline consistency tool | Current stage/candidate/validation workflows | **KEEP** | `ACTIVE_TEST_OR_WORKFLOW_DEPENDENCY` | high | none |
| `validate_release_candidate.py` | release candidate validator | Current candidate-ready/fallback/reusable validation | **KEEP** | `ACTIVE_TEST_OR_WORKFLOW_DEPENDENCY` | high | none |
| `vendor_gh_cli.sh` | pinned bootstrap materializer | Pins/verifies GitHub CLI 2.97.0 assets | **KEEP** | `RECOVERY_OR_INCIDENT_VALUE` | high | none |
| `vendor/gh/2.97.0/.gitkeep`, `VENDOR.md`, `gh_2.97.0_checksums.txt`, `gh_2.97.0_linux_amd64.tar.gz`, `gh_2.97.0_linux_arm64.tar.gz` | vendored bootstrap assets | `README-gh-bootstrap.md` and `vendor_gh_cli.sh` explicitly use this pinned offline/fallback set | **KEEP** | `RECOVERY_OR_INCIDENT_VALUE` | high | none |

### B. Release-control / recovery helpers kept conservatively

These are source-level control/recovery helpers. Some are not directly named in the small set of current workflow anchors above, but they participate in the E9–E13/release-control architecture, are dependencies of other tooling, or lack enough evidence for safe movement. They remain in the active tree until a dedicated reference audit proves otherwise.

| Path | Kind | Evidence / dependency | Classification | Reason | Confidence | Future action |
| --- | --- | --- | --- | --- | --- | --- |
| `candidate_stage_policy.cjs` | candidate classification policy | Imports `source_change_semantics.cjs`; release-control implementation, not a version patch | **KEEP** | `INSUFFICIENT_EVIDENCE_TO_MOVE` | medium | investigate with release-control cleanup only |
| `check_release_blob_parity.cjs` | exact-byte parity helper | Imports current `promote_release_blobs.cjs` allowlist | **KEEP** | `RECOVERY_OR_INCIDENT_VALUE` | medium | investigate |
| `classify_release_candidate.cjs` | maintenance-vs-release classifier | Explicitly protects current release-control paths and imports promotion allowlist | **KEEP** | `RECOVERY_OR_INCIDENT_VALUE` | medium | investigate |
| `merge_guard_e11.cjs` | expected-head/protected-drift merge guard | E11 control-plane guard semantics | **KEEP** | `RECOVERY_OR_INCIDENT_VALUE` | medium | investigate only with E11+ replacement evidence |
| `merge_guard_receipt_e12.cjs` | merge-guard receipt formatter/validator | Validates E11 verdicts and E12 receipt semantics | **KEEP** | `RECOVERY_OR_INCIDENT_VALUE` | medium | investigate only with E11/E12 replacement evidence |
| `reducer_wake_e13.sh` | release reducer wake helper | E13 release-control generation helper | **KEEP** | `RECOVERY_OR_INCIDENT_VALUE` | medium | investigate only with reducer replacement evidence |
| `release_request_e9.cjs` | durable release request parser/reducer helper | Accepts E9–E13 generation identities | **KEEP** | `RECOVERY_OR_INCIDENT_VALUE` | medium | investigate only with durable-request replacement evidence |
| `source_change_semantics.cjs` | source-diff semantics helper | Imported by candidate/release readiness tooling | **KEEP** | `ACTIVE_TEST_OR_WORKFLOW_DEPENDENCY` | high | none |
| `source_readiness_e9.cjs` | source readiness validator | Imports current stage/change/preflight authority and encodes fail-closed readiness receipts | **KEEP** | `RECOVERY_OR_INCIDENT_VALUE` | medium | investigate only with readiness replacement evidence |

### C. Historical development / patch helpers — ARCHIVE CANDIDATE

These are explicit old-release or one-shot development artifacts. They are not deletion candidates here because they retain useful reconstruction value. A future archive move must search and rewrite any historical release-spec/doc references first.

| Members | Kind / era | Current replacement | Classification | Reason | Confidence | Future action |
| --- | --- | --- | --- | --- | --- | --- |
| `build_alpha38_devpass_standalone.sh` | early standalone build helper | modular Plugin build system | **ARCHIVE CANDIDATE** | `HISTORICAL_REPRODUCIBILITY` | high | archive review |
| `diagnostics_workspace_567.part.js` | 5.67 generated/intermediate Diagnostics fragment | current modular Diagnostics source | **ARCHIVE CANDIDATE** | `HISTORICAL_REPRODUCIBILITY` | high | archive review |
| `finalize_organization_discovery_dedup_557.py` | 5.57 one-shot finalizer | current Engine source + release-spec materializers | **ARCHIVE CANDIDATE** | `HISTORICAL_REPRODUCIBILITY` | high | archive review |
| `patch_provider_manager_cache_observability.py` | one-shot cache/provider patch helper | current modular source/materializer flow | **ARCHIVE CANDIDATE** | `HISTORICAL_REPRODUCIBILITY` | high | archive review |
| `split_usage_dashboard.cjs` | historical modularization helper | `src/parts.cjs` + deterministic builder now canonical | **ARCHIVE CANDIDATE** | `HISTORICAL_REPRODUCIBILITY` | high | archive review |
| `release_rc1_architecture_test_compat.py`, `release_rc1_productization.py`, `release_rc1_test_compat.py` | RC1-era release helpers | current release-spec-driven control plane | **ARCHIVE CANDIDATE** | `HISTORICAL_REPRODUCIBILITY` | high | archive review |

#### Early alpha patch family

All members below are **ARCHIVE CANDIDATE · HISTORICAL_REPRODUCIBILITY · high confidence**. They are explicitly version-bound one-shot patch helpers and are superseded for current work by modular source plus release-spec materializers.

- `release_alpha319_patch.py`
- `release_alpha320_patch.py`
- `release_alpha321_patch.py`
- `release_alpha322_patch.py`
- `release_alpha323_patch.py`
- `release_alpha324_patch.py`
- `release_alpha325_patch.py`
- `release_alpha327_patch.py`
- `release_alpha328_patch.py`
- `release_alpha329_patch.py`
- `release_alpha330_patch.py`
- `release_alpha331_patch.py`
- `release_alpha332_patch.py`
- `release_alpha333_patch.py`
- `release_alpha335_patch.py`
- `release_alpha336_patch.py`
- `release_alpha337_patch.py`
- `release_alpha338_patch.py`
- `release_alpha339_patch.py`
- `release_alpha340_patch.py`
- `release_alpha341_patch.py`
- `release_alpha400_patch.py`
- `release_alpha401_patch.py`
- `release_alpha402_patch.py`
- `release_alpha536_patch.py`
- `release_alpha536_patch_v2.py`
- `release_alpha537_engine_reconcile.py`
- `release_alpha538_patch.py`
- `release_alpha539_patch.py`
- `release_alpha540_patch.py`
- `release_alpha541_patch.py`
- `release_alpha542_patch.py`
- `release_alpha543_patch.py`
- `release_alpha544_patch.py`
- `release_alpha544_patch_r3.py`
- `release_alpha544_patch_r4.py`
- `release_alpha544_patch_r5.py`
- `release_alpha544_patch_r6.py`
- `release_alpha544_patch_r7.py`
- `release_alpha57_patch.py`

Future action for the whole family: **archive review**, with exact-reference search first. Do not delete the alpha544 repair sequence merely because later revisions exist; its sequence may be incident evidence.

#### Release-specific 5.45–5.79 materializer/helper family

All members below are **ARCHIVE CANDIDATE · HISTORICAL_REPRODUCIBILITY · high confidence** at the 5.80 inventory baseline. Many can still be named by historical `.github/usage-dashboard/releases/*.json` files; that is historical reproducibility evidence, not current 5.80 execution authority. Any future move must coordinate those references or deliberately preserve a compatibility location.

- `release_updater_compat_545.py`
- `release_hardening_546.py`
- `release_hardening_546_boundary_fix.py`
- `release_cache_observability_547.py`
- `release_provider_manager_cache_ipc_548.py`
- `release_provider_manager_cache_hardening_549.py`
- `release_independent_cache_observer_550.py`
- `release_cache_fidelity_551.py`
- `release_cache_write_provenance_552.py`
- `release_cache_provenance_diagnostics_553.py`
- `release_runtime_recovery_fidelity_554.py`
- `release_snapshot_performance_attribution_555.py`
- `release_bounded_cli_parallelism_556.py`
- `release_organization_discovery_dedup_557.py`
- `release_shared_24h_capture_558.py`
- `release_snapshot_scheduling_attribution_559.py`
- `release_monotonic_publish_guard_560.py`
- `release_credits_usage_early_start_561.py`
- `release_snapshot_decision_attribution_562.py`
- `release_long_window_critical_path_decoupling_563.py`
- `release_foreground_cli_launcher_attribution_564.py`
- `release_npx_cache_first_launcher_565.py`
- `release_managed_direct_cli_runtime_566.py`
- `release_managed_direct_cli_runtime_566.patch`
- `release_diagnostics_workspace_567.py`
- `release_diagnostics_capture_identity_568.py`
- `release_engine_source_modularization_569.py`
- `release_request_duration_fidelity_570.py`
- `release_cross_scope_request_provenance_571.py`
- `release_diagnostics_instant_mode_572.py`
- `release_runtime_weight_audit_573.py`
- `release_diagnostics_handler_ownership_574.py`
- `release_provenance_analytics_wrapper_575.py`
- `release_request_provenance_diagnostics_576.py`
- `release_diagnostics_instant_mode_577.py`
- `release_runtime_weight_audit_578.py`
- `release_diagnostics_workspace_composition_579.py`

`release_managed_direct_cli_runtime_566.patch` is intentionally **not** a retire candidate: the patch itself is useful release/incident reconstruction evidence.

### D. Tracked CPython cache files — RETIRE CANDIDATE

The following tracked files are generated bytecode, while the supported CI paths explicitly redirect Python cache output to `/tmp/usage-dashboard-pycache`:

- `__pycache__/hotfix_alpha502_manager_temp_ext.cpython-312.pyc`
- `__pycache__/release_alpha408_patch.cpython-312.pyc`
- `__pycache__/release_alpha409_patch.cpython-312.pyc`
- `__pycache__/release_alpha500_patch.cpython-312.pyc`
- `__pycache__/release_alpha501_patch.cpython-312.pyc`
- `__pycache__/release_alpha502_fix.cpython-312.pyc`
- `__pycache__/release_alpha502_patch.cpython-312.pyc`

Classification for all seven: **RETIRE CANDIDATE**  
Reason: `GENERATED_BYPRODUCT`  
Confidence: **high**  
Future action: **retire review** in a separate repository-only cleanup, together with exact-reference verification and an appropriate ignore/CI hygiene decision. This inventory does not delete them.

## Coverage check

At this snapshot, every discovered root tool is represented in exactly one of these categories:

1. current supported authority;
2. conservative release-control/recovery KEEP;
3. historical development/patch ARCHIVE CANDIDATE;
4. tracked Python bytecode RETIRE CANDIDATE;
5. nested vendored GitHub CLI assets under current bootstrap KEEP.

Directories `__pycache__/` and `vendor/` are structural containers; their tracked members are classified above.

## Important interpretation rules

1. **Current tuple wins over filename age.** `release_request_ledger_provenance_580.py` is KEEP while 5.80 is the current release authority.
2. **Historical release-spec reference is preservation evidence.** It does not make an old materializer current authority, but it means an archive move cannot be a blind rename.
3. **No-reference search is not deletion proof.** Unknowns stay KEEP or ARCHIVE until replacement and historical value are established.
4. **Repository size is not runtime size.** Archiving or retiring tools does not claim PocketRisu memory, CPU, startup, or product artifact savings.
5. **Git history alone is not always enough.** Incident recovery can benefit from a named live artifact; preservation value must be judged before deletion.
6. **Re-run this inventory after release-control changes.** Generic E9–E13 helpers can only be downgraded after the replacement control plane is proven.
7. **Reclassify the current materializer after a monotonic release.** A newer production release can move the previous materializer from active KEEP to historical review, but only after current references are re-read.

## Future cleanup gates

A later archive/retire implementation must, for each chosen item or tightly related family:

1. fresh-check production and current main;
2. search current workflows, tests, docs, tools, and release specs for exact references;
3. name the replacement and preservation plan;
4. keep archive movement separate from shipped runtime changes;
5. update references atomically if anything moves;
6. run repository/release-control regression appropriate to the affected paths;
7. verify `latest.js`, Engine, Manager, product manifest, and `release-usage-dashboard` are byte-identical before/after repo-only cleanup;
8. never bundle unrelated historical cleanup into a product release.

## Completion result

`NV-REPO-HISTORY` is complete as an **inventory** when this document exists and the canonical idea list points here. Actual archive or retirement actions remain separate future changes and require fresh evidence.