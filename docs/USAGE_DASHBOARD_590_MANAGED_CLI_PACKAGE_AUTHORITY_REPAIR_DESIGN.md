# Local Usage Dashboard 5.90 — Managed CLI Package Authority Repair

Status: **DESIGN READY — IMPLEMENTATION AUTHORIZED**

## Fresh production authority

Verified immediately before design:

- production Product: `3.0.0-alpha.5.89`
- Engine: `1.6.27`
- Manager: `1.3.3`
- contracts: `1 / 1`
- production branch: `release-usage-dashboard`
- production SHA: `36368be097169887d2b5799c454b988734bca8f2`
- current `main`: `3c7505d2e20559117e35e269fb2d75a109ae6b2f`
- current source pins: Engine `1.14.0`, Manager `1.14.0`

## Physical evidence

PocketRisu full Diagnostics captured `2026-08-30 09:21 KST` proves the actual 5.89 runtime is healthy on managed CLI `1.10.0`:

- Product `3.0.0-alpha.5.89`
- Engine `1.6.27`
- Manager `1.3.3`
- `Status: READY`
- `Health ok`
- active errors `0`
- failures `0`
- Stable readiness `READY`, blockers `none`
- Bridge mode `managed-bundled`
- `Bridge CLI runtime: managed · ready · v1.10.0 · provisioning ok`
- launcher `managed-direct 2 · direct 0 · npx-fallback 0`
- module stale/errors `0/0`
- Request fidelity exact `76/76`
- updater compatible/current

This reclassifies 5.89: its Engine/Manager convergence repair is physically successful. The remaining defect is dependency authority only.

## Confirmed root cause

The 5.88 design incorrectly treated the parent project release `theopenco/llmgateway` tag `v1.14.0` as proof that the separately-versioned npm package `@llmgateway/cli@1.14.0` existed.

The package is released from `theopenco/llmgateway-templates` with its own tag namespace:

`@llmgateway/cli@${version}`

Fresh upstream tag authority proves:

- package tag: `@llmgateway/cli@1.10.0`
- tag commit: `6b1cda1988f32010a9b090c00eb9b2fe672145fe`
- no package tags `1.11.0`, `1.12.0`, `1.13.0`, or `1.14.0` were present at design time.

Canonical durable package authority is recorded in:

`.github/usage-dashboard/dependencies/llmgateway-cli.json`

A parent-project release number is explicitly not package authority.

## Target release tuple

- Product: `3.0.0-alpha.5.90`
- Engine: `1.6.28`
- Manager: `1.3.4`
- managed CLI: `@llmgateway/cli@1.10.0`
- contracts: `1 / 1`

Engine advances because its canonical default CLI pin changes. Manager advances because its provisioning target changes. Product advances monotonically. Contracts remain unchanged.

## Minimal implementation

1. Advance Plugin Product identity to `3.0.0-alpha.5.90`.
2. Advance required Engine `1.6.27 -> 1.6.28`.
3. Advance required Manager `1.3.3 -> 1.3.4`.
4. Change Engine canonical CLI default only: `1.14.0 -> 1.10.0`.
5. Rebuild Engine deterministically as `1.6.28`.
6. Change Manager managed CLI target only: `1.14.0 -> 1.10.0`.
7. Bind Manager bundled Engine version/hash to the rebuilt Engine `1.6.28`.
8. Preserve all 5.89 live Engine convergence repairs unchanged.
9. Preserve one Manager provisioning owner, the existing version-root/descriptor/state checks, retry/timeout policy, and launcher order `managed-direct -> direct -> npx-fallback`.
10. Keep bootstrap byte-identical and contracts `1/1`.

## Permanent authority guard

Add two layers:

### Generic contract

`managed-cli-package-authority-contract.cjs` runs for 5.90 and every later release. It requires:

- current release spec has `managedCliVersion` and `managedCliAuthority`;
- authority file exists inside `.github/usage-dashboard/dependencies/`;
- authority package is exactly `@llmgateway/cli`;
- authority tag equals `@llmgateway/cli@<version>`;
- parent-project release is explicitly not package authority;
- release spec managed CLI version equals authority version;
- Engine and Manager pins equal the same authority version.

This prevents a future release from silently using the parent `llmgateway` project version as the CLI package version.

### P56 exact repair regression

P56 locks the 5.90 tuple, the restored `1.10.0` package authority, Engine/Manager pin parity, generated Engine/manifest integrity, 5.89 convergence behavior preservation, launcher/provisioning ownership, and bootstrap/contracts preservation.

## Non-goals

- no new CLI command;
- no HTTP endpoint change;
- no additional `/logs`, `/activity`, org, credits, or usage request;
- no refresh/poller/timer/background change;
- no cache semantics change;
- no source inference;
- no UNKNOWN filling;
- no UI feature work;
- no E15/E16 release-authority topology change;
- no user shell/npm/manual install step.

## Physical acceptance

After monotonic promotion, PocketRisu should show:

- Product `3.0.0-alpha.5.90`
- Engine `1.6.28`
- Manager `1.3.4`
- managed CLI `v1.10.0 · provisioning ok`
- Stable readiness `READY`
- Health `ok`
- active errors `0`
- failures `0`
- normal CLI operations `managed-direct`
- direct/npx fallback `0` during acceptance capture
- Organizations / DevPass / Credits / Request Ledger remain source-backed and semantically unchanged.

The already healthy 5.89 data/runtime behavior is the baseline. This release repairs declared dependency authority; it is not a runtime redesign.
