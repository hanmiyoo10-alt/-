# Provider Balance Mini

Experimental, read-only, mini-floating-only Risu plugin for quickly checking provider allowance/balance state.

## Current authority posture

- Lifecycle: experimental / non-production.
- Owning design evidence: repository issue #3788.
- This does not replace or modify Local Usage Dashboard production authority.
- No update URL, production manifest, or release branch is declared by this experiment.

## UI contract

The Risu surface is intentionally only one small draggable floating card:

- Copilot
- Vertex
- AI Studio
- manual refresh

There is no dashboard, settings page, or chat navigation button.

## Data fidelity

- Copilot: official GitHub Copilot SDK `account.getQuota`, normalized from `premium_interactions`.
- Vertex: exact promotional-credit balance remains `UNKNOWN` until a supported programmatic balance source is verified.
- AI Studio: exact Prepay balance remains `UNKNOWN` until a supported programmatic balance source is verified.
- `UNKNOWN` is rendered as `—`, never as zero.
- The plugin never calls `/copilot_internal/*`.

## Local collector

The collector binds only to `127.0.0.1:39221` and exposes:

- `GET /health`
- `GET /v1/balances`
- `GET /v1/balances?refresh=1`

Install dependencies and run:

```bash
npm install
npm start
```

Copilot SDK authentication follows the official SDK chain. A locally signed-in Copilot CLI user can be reused, or a supported token may be provided through `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, or `GITHUB_TOKEN`. Do not commit credentials.

The collector returns only bounded normalized quota/balance state. It does not expose provider tokens, cookies, service-account JSON, or raw provider payloads.

## Validation

```bash
npm test
node --check provider-balance-mini.plugin.js
node --check collector.mjs
```
