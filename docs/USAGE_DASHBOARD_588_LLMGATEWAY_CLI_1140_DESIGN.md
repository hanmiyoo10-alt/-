# Local Usage Dashboard 5.88 — LLM Gateway CLI 1.14.0 Managed Runtime Upgrade

Status: **DESIGN READY — IMPLEMENTATION AUTHORIZED**

Feature issue: #852

## Fresh authority

Repository baseline immediately before design:

- Product: `3.0.0-alpha.5.87`
- Engine: `1.6.26`
- Manager: `1.3.1`
- contracts: `1 / 1`
- production branch: `release-usage-dashboard`
- current Engine managed CLI pin: `@llmgateway/cli@1.10.0`
- current Manager managed CLI pin: `@llmgateway/cli@1.10.0`
- upstream LLM Gateway latest stable release: `v1.14.0` (published 2026-08-24)

## Goal

Advance the Local Usage Dashboard managed LLM Gateway CLI from `1.10.0` to `1.14.0` while preserving existing product data semantics, I/O ownership, launcher order, source-truth behavior, and release authority.

Target release tuple:

- Product: `3.0.0-alpha.5.88`
- Engine: `1.6.27`
- Manager: `1.3.2`
- contracts: `1 / 1`
- managed CLI: `@llmgateway/cli@1.14.0`

## Upstream review

The upstream `v1.10.0..v1.14.0` range is broad and includes changes in DevPass, usage reporting, caching, routing, APIs, models, and UI. Current upstream CLI documentation continues to expose `orgs`, `credits`, and `usage` commands. The Local Usage Dashboard, however, does not treat that upstream command list as permission to change its existing source topology:

- account discovery/capture retains the existing `orgs list --json` CLI session;
- credits bootstrap retains the existing `credits --json` CLI call;
- usage/activity remains on the existing capture/API source path and 5.88 must not introduce a new `usage` CLI invocation.

The Dashboard therefore treats this as a pinned managed-runtime dependency upgrade. It does not adopt new upstream semantics or commands merely because they exist. Any real command/output incompatibility must fail closed and be repaired only at the affected source-backed boundary.

## Ownership

5.86 established that the managed CLI target has two runtime owners that must remain aligned:

- Engine canonical source: `runtime-src/bridge-engine/00-core.part.mjs`
- Bridge Manager provisioning target: `runtime/bridge-manager.cjs`

Changing only one owner would recreate the stale-pin defect repaired in 5.86. Therefore both component identities advance with the pin:

- Engine `1.6.26 -> 1.6.27`
- Manager `1.3.1 -> 1.3.2`

The Plugin requirements advance with them so 5.87's single-source Stable-contract diagnostics remain authoritative.

## Implementation

1. Add release spec `5.88`.
2. Bump Plugin product identity to `3.0.0-alpha.5.88`.
3. Bump required/generated Engine identity to `1.6.27`.
4. Change Engine managed CLI default `1.10.0 -> 1.14.0` in canonical Engine source.
5. Rebuild Engine deterministically.
6. Bump required/actual Manager identity to `1.3.2`.
7. Change Manager managed CLI provisioning target `1.10.0 -> 1.14.0` and bind its bundled Engine version/hash to Engine `1.6.27`.
8. Preserve the existing managed version-root, descriptor/state exact-version checks, provisioning retry/timeout, and launcher order `managed-direct -> direct -> npx-fallback`.
9. Keep bootstrap byte-identical.
10. Keep snapshot/recent-request contracts at `1/1`.
11. Add P54 regression for Engine/Manager pin parity, component identities, existing `orgs`/`credits` CLI calls, no new `usage` CLI call, existing 24h capture path, generated Engine parity, provisioning ownership, launcher order, manifest/hash integrity, and bootstrap byte identity.
12. Run the complete exact-SHA regression registry before merge and monotonic promotion.

## Non-goals

- no new CLI command;
- no additional HTTP endpoint;
- no additional `/logs`, `/activity`, org, credits, or usage request;
- no polling/timer/background refresh change;
- no data inference or UNKNOWN filling;
- no cache/DevPass semantic reinterpretation;
- no UI feature expansion;
- no contract bump;
- no bootstrap change;
- no release-authority topology change.

## Physical acceptance

After production promotion, PocketRisu verification should confirm:

- Product `3.0.0-alpha.5.88` / Engine `1.6.27` / Manager `1.3.2`;
- READY / Health ok / active errors 0 / failures 0;
- managed CLI diagnostics report `managed · ready · v1.14.0 · provisioning ok` when managed provisioning succeeds;
- normal dashboard refresh succeeds;
- Organizations / DevPass / Credits / Request Ledger remain plausible and source-backed;
- no duplicate rows or invented UNKNOWN values;
- normal accepted CLI operations use `managed-direct`; direct/npx fallback remains zero when managed provisioning is healthy.

If managed provisioning cannot acquire `1.14.0` on-device, collect diagnostics only. Do not downgrade or bypass the pin and do not require a manual CLI install without repository evidence.
