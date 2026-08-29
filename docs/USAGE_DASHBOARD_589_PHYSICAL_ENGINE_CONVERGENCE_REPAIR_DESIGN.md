# Local Usage Dashboard 5.89 — Physical Engine Convergence Repair

Status: **DESIGN READY — IMPLEMENTATION AUTHORIZED**

Feature issue: #861

## Fresh authority

Production before this repair:

- Product: `3.0.0-alpha.5.88`
- Engine artifact/contract: `1.6.27`
- Manager: `1.3.2`
- managed CLI target: `@llmgateway/cli@1.14.0`
- contracts: `1 / 1`
- release branch: `release-usage-dashboard`

Physical PocketRisu acceptance on 2026-08-30 00:45 KST did **not** converge to that tuple. The Plugin and Manager updated, but the live runtime stayed on Engine `1.6.26` and Engine-visible managed CLI `1.10.0`.

Observed physical state:

- Product `3.0.0-alpha.5.88`
- Manager `1.3.2`, manager Product sync `5.88`
- live Engine `1.6.26`, required `1.6.27`
- live managed CLI `v1.10.0`, target `v1.14.0`
- Stable readiness `BLOCKED`
- Health `ok`
- active local errors `0`
- failures `4`
- lifecycle `error`
- normal CLI operations still `managed-direct 3 / direct 0 / npx-fallback 0`
- source-backed usage/cost continued to update

This is a runtime convergence defect, not a source-data outage.

## Repository diagnosis

### 1. `engineBundled` can describe disk identity instead of live identity

Manager `engineRuntimeStatus()` currently derives `engineBundled` from:

- managed service ownership;
- descriptor script path equals the bundled Engine path;
- bundled file on disk matches the target hash;
- service environment is current.

It does not require the live Engine `/health` version to equal `BUNDLED_ENGINE_VERSION`. A process that loaded old Engine bytes before the bundled file was replaced can therefore appear `managed-bundled` even while `/health` still reports the old version.

### 2. bundle restart verification is not version-exact

`waitForManagedEngine()` verifies process ownership and bridge health/auth signatures but accepts any live Engine version. During a bundle sync the target version is known, so success must additionally require exact live version equality.

### 3. Plugin can silently skip bundle reconciliation

`syncBridgeEngineBundleIfNeeded()` currently returns immediately when `engineBundleAvailable !== true`. That can turn a real live-version mismatch into `Bridge engine sync: bundle none · error none`, which is exactly the physical evidence captured on 5.88.

## Target tuple

- Product: `3.0.0-alpha.5.89`
- Engine: `1.6.27` **unchanged bytes**
- Manager: `1.3.3`
- managed CLI target: `1.14.0` unchanged
- contracts: `1 / 1` unchanged

## Implementation

1. Bump Plugin Product identity `5.88 -> 5.89`.
2. Keep `REQUIRED_BRIDGE_VERSION = 1.6.27`.
3. Bump required Manager `1.3.2 -> 1.3.3`.
4. Keep Engine canonical source and generated Engine artifact byte-identical.
5. Manager `engineRuntimeStatus()` must require `identity.bridgeVersion === BUNDLED_ENGINE_VERSION` before reporting `engineBundled=true`.
6. Extend `waitForManagedEngine(expected, expectedVersion)` so a bundle restart cannot be accepted until live Engine version equals the requested target. Legacy adoption continues to call it without a version requirement.
7. `startManagedCandidate()` forwards the optional expected version; bundle sync passes `BUNDLED_ENGINE_VERSION`; rollback/adoption keep existing semantics.
8. Plugin bundle reconciliation no longer uses `engineBundleAvailable` as a silent top-level gate. For a current connected managed Manager, a live Engine mismatch first forces one fresh Manager status read. If bundle capability/target is still unavailable or inconsistent, expose explicit `engineBundleSyncState` and `engineBundleSyncError`.
9. Preserve Manager provisioning target `1.14.0`, launcher order, data I/O, refresh cadence, source-truth rules, cache semantics, bootstrap bytes, and contracts.
10. Add P55 regression for the physical stale-live-process shape and explicit Plugin convergence diagnostics.
11. Run the complete exact-SHA registry before merge/promotion.

## Non-goals

- no Engine feature or Engine source change;
- no new CLI command;
- no new API request;
- no manual npm install;
- no pin downgrade;
- no polling/timer change;
- no data inference;
- no UI feature expansion;
- no contract bump;
- no bootstrap change;
- no release-pipeline topology change.

## Trusted-stage implementation correction

The first E7 materialization attempt (`33261585245`) failed before candidate publication because the 5.89 materializer and P55 regression still assumed the bundle reconciliation function lived in `00-runtime-core.part.js`. Current modular ownership places `syncBridgeEngineBundleIfNeeded()` in `20-bridge-io.part.js`, while refresh lives in a different part.

The implementation correction keeps Product/release identity changes in `00-runtime-core.part.js`, but binds convergence editing, validation, and P55 assertions to `20-bridge-io.part.js`. This is a materialization ownership correction only: the runtime design, target tuple, Engine-byte preservation requirement, data semantics, and release authority are unchanged.

## Physical acceptance

After production promotion, pressing `+` must be sufficient. No shell action is allowed.

Expected Diagnostics:

- Product `3.0.0-alpha.5.89`
- Engine `1.6.27`
- Manager `1.3.3`
- Bridge CLI runtime `managed · ready · v1.14.0 · provisioning ok`
- Stable readiness `READY`
- Health `ok`
- active errors `0`
- failures `0`
- normal accepted operations `managed-direct`
- direct / npx fallback remain zero while managed runtime is healthy
- Organizations / DevPass / Credits / Request Ledger remain source-backed and semantically unchanged.
