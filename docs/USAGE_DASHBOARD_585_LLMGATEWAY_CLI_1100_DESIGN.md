# Local Usage Dashboard 5.85 — LLM Gateway CLI 1.10.0 Managed Runtime Upgrade

Status: **DESIGN READY — IMPLEMENTATION AUTHORIZED**

## Fresh authority

Repository baseline immediately before design:

- Product: `3.0.0-alpha.5.84`
- Engine: `1.6.25`
- Manager: `1.3.0`
- contracts: `1 / 1`
- production branch: `release-usage-dashboard`
- production SHA: `73cc537d6d5efe31177ed17906c87e5216d60afb`
- current Engine managed CLI pin: `@llmgateway/cli@1.9.0`
- upstream LLM Gateway release: `v1.10.0` (published 2026-07-27)

## Goal

Advance the managed LLM Gateway CLI used by the Local Usage Dashboard Engine from `1.9.0` to `1.10.0` without changing product data semantics or adding new I/O ownership.

Target release tuple:

- Product: `3.0.0-alpha.5.85`
- Engine: `1.6.26`
- Manager: `1.3.0`
- contracts: `1 / 1`
- managed CLI: `@llmgateway/cli@1.10.0`

## Scope

The current Engine already centralizes the CLI pin in `runtime-src/bridge-engine/00-core.part.mjs` and uses that value for:

- the managed version-root directory;
- the managed CLI descriptor/state exact-version checks;
- the `npx --prefer-offline @llmgateway/cli@<version>` fallback.

No launcher redesign is needed. The existing direct/managed/npx authority order remains unchanged.

## Upstream review

The upstream `v1.10.0` release contains broad gateway/UI/model changes plus CLI launch/documentation work, but no published breaking change to the Local Usage Dashboard command family. The Local Usage Dashboard therefore treats this as a pinned dependency/runtime upgrade and preserves its existing command contract:

- `orgs`
- `credits`
- `usage`
- the existing capture-tap-driven DevPass/account activity paths.

If runtime validation shows an actual command/output incompatibility, fail closed and repair only the affected normalization boundary rather than inventing fallback data.

## Implementation

1. Add release spec `5.85`.
2. Bump Plugin product identity to `3.0.0-alpha.5.85`.
3. Bump required/generated Engine identity to `1.6.26`.
4. Change only the managed CLI pin `1.9.0 -> 1.10.0` in canonical Engine source.
5. Rebuild Engine deterministically and refresh Manager bundled Engine identity/hash.
6. Keep Manager byte semantics/version `1.3.0`; Manager product/bundled-Engine metadata follows the new tuple as usual.
7. Keep bootstrap byte-identical.
8. Add P51 regression locking the exact CLI pin, launcher order, descriptor/state version binding, npx fallback pin, zero extra launcher path, and Engine/manifest parity.
9. Preserve all current product/runtime behavior and UNKNOWN/source-truth semantics.

## Non-goals

- no new CLI command;
- no additional HTTP endpoint;
- no additional `/logs` or `/activity` request;
- no polling/timer/background refresh change;
- no data inference;
- no UI feature expansion;
- no contract bump;
- no Manager version bump;
- no bootstrap change;
- no auto-main merge authority change.

## Release-control proof

This is the first genuine product release after E15 implementation. The release must simultaneously prove:

- canonical durable request includes exact `Plugin: usage-dashboard`;
- repository classifier applies `plugin:usage-dashboard` without manual recovery;
- deterministic release PR uses locator-only stable body;
- E9 validates the stable body;
- E13 wake flow, E14 candidate DAG, E11 merge guard, exact-SHA validation, assistant expected-head merge, exact-byte promotion, production parity, and durable closure remain unchanged.

## Physical acceptance

After production promotion, PocketRisu verification should confirm:

- Product `3.0.0-alpha.5.85` / Engine `1.6.26` / Manager `1.3.0`;
- READY / Health ok / active errors 0 / failures 0;
- managed CLI diagnostics report version `1.10.0` when managed runtime is ready;
- normal dashboard refresh succeeds;
- DevPass/Credits/account-wide request capture remains plausible and source-backed;
- no duplicate rows or invented UNKNOWN values;
- no extra CLI/network/refresh work beyond the existing launcher/capture topology.

If managed provisioning cannot acquire 1.10.0 on-device, capture diagnostics only; do not downgrade or bypass the pin without repository evidence.
