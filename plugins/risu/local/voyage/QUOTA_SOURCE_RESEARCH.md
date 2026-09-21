# Voyage Token Check — Quota Source Research

Research date: 2026-08-24

This document records evidence about whether Voyage dashboard usage/quota information can be reproduced inside the plugin without exposing credentials or relying on unsupported dashboard scraping.

## Current verdict

Exact Voyage dashboard/account quota replication is **not yet VERIFIED** through a documented public API.

A useful partial implementation is **VERIFIED feasible** inside RisuAI: with explicit user permission, a plugin can observe Voyage request responses already made by RisuAI and read request-level token usage without receiving the Voyage Authorization header/API key.

Do not label locally observed usage as exact account-wide remaining quota.

## VERIFIED — Voyage

- Voyage documents organization/project Usage and Costs visibility in its dashboard.
- Voyage documents organization/project Rate Limits visibility in its dashboard.
- Voyage pricing documents free-token allocations for supported models/accounts.
- Voyage inference responses expose request-level token usage, including `usage.total_tokens` / `total_tokens` depending on client surface.
- Voyage's current public documentation index lists inference, files, batches, rate-limits, pricing, organizations/projects, and related APIs/guides, but does not list a documented account/project Usage, Billing, Credits, or remaining-Quota API endpoint.
- Voyage API keys are secret credentials and should not be exposed in browsers/apps or distributed artifacts.
- Voyage Terms of Service prohibit page-scraping/robot-style access or obtaining Service information through means not purposely made available through the Service.

## VERIFIED — RisuAI host capability

- RisuAI Plugin API v3 exposes `requestPluginPermission('fetchLogs')` and `getFetchLogs()`.
- `getFetchLogs()` returns sanitized records containing URL origin/path, request body, status, and response.
- The v3 plugin mapping does **not** expose fetch headers in returned log records.
- RisuAI's Voyage contextual embedding integration reads `voyageApiKey` internally and sends it in the Authorization header to `https://api.voyageai.com/v1/contextualizedembeddings`.
- The public Plugin API database subset does not expose `voyageApiKey` as a normal plugin-readable field.
- Therefore a plugin can, with user consent, inspect Voyage response payloads without needing to read or copy the user's Voyage API key.

## What the safe RisuAI path can show

If RisuAI fetch logs contain Voyage responses with `usage.total_tokens`, the plugin can show evidence-backed local observations such as:

- token usage of observed Voyage requests;
- cumulative token usage across the observed/logged requests that the plugin can prove it saw;
- model/endpoint information only when it is present in the request/response evidence;
- last observed Voyage request time if the host data provides sufficient timing evidence.

These values must be labeled as **Risu-observed usage**, not Voyage account balance.

## What remains UNKNOWN

- Whether Voyage exposes a supported authenticated account/project endpoint for current free-token allocation, used amount, remaining amount, or reset/allocation semantics outside the documented public API index.
- Whether all Voyage usage relevant to the user's account occurs through RisuAI.
- Fetch-log retention/completeness guarantees sufficient for lifetime/account-wide accounting.
- Whether free-token pools are shared or separated across every model/account/project combination shown by the dashboard.
- Exact dashboard aggregation rules for free usage, billed usage, projects, organizations, and historical periods.

## Product boundary

The desired UX remains:

`open plugin → see the useful Voyage dashboard information immediately`

But the implementation must preserve source fidelity:

- exact Voyage account/dashboard values only when sourced from an intentionally exposed, supportable Voyage or host interface;
- local observed totals clearly labeled as local/observed;
- UNKNOWN shown as UNKNOWN;
- no dashboard page scraping, session automation, credential copying, or hidden endpoint reverse-engineering as a production dependency.

## Next evidence step

The next safe validation target is a minimal real-device observation of RisuAI's sanitized Voyage fetch-log shape after a normal Voyage embedding request. The diagnostic should report only endpoint/model and usage fields needed to establish semantics, with all content and sensitive values redacted.

This is a diagnostic evidence step, not proof of exact account-wide quota.

## Source references

- Voyage AI documentation index: https://docs.voyageai.com/llms.txt
- Voyage Organizations and Projects: https://docs.voyageai.com/docs/organizations-and-projects
- Voyage Rate Limits: https://docs.voyageai.com/docs/rate-limits
- Voyage Pricing: https://docs.voyageai.com/docs/pricing
- Voyage Contextualized Chunk Embeddings: https://docs.voyageai.com/docs/contextualized-chunk-embeddings
- Voyage API Key and Python Client: https://docs.voyageai.com/docs/api-key-and-installation
- Voyage Terms of Service: https://www.voyageai.com/tos
- RisuAI Plugin API v3 guide/source: https://github.com/kwaroran/RisuAI/blob/main/plugins.md
- RisuAI Plugin API v3 type definitions/source: https://github.com/kwaroran/RisuAI/blob/main/src/ts/plugins/apiV3/risuai.d.ts
- RisuAI Plugin API v3 implementation/source: https://github.com/kwaroran/RisuAI/blob/main/src/ts/plugins/apiV3/v3.svelte.ts
- RisuAI Voyage contextual embedding integration/source: https://github.com/kwaroran/RisuAI/blob/main/src/ts/process/memory/contextualEmbedding.ts
