# Local Usage Dashboard — Recent Request Model Enrichment Latency Diagnosis

Status: **DIAGNOSIS ONLY — NO PRODUCT CHANGE AUTHORIZED**

Tracking issue: #756

## 1. Physical observation

PocketRisu on Product `3.0.0-alpha.5.84` / Engine `1.6.25` / Manager `1.3.0` showed this behavior:

- a completed request can appear in Recent Requests first;
- its model label may still be missing/`Unknown` initially;
- the model name can populate roughly 1–2 minutes later.

This observation is independent of the 5.84 Service Tier Selection-Source Fidelity release (#577).

## 2. Fresh runtime evidence

From the same physical diagnostics capture:

- Effective refresh: `60000ms`;
- request ledger: exact `83/83`, IDs `83/83`;
- account-wide request capture: healthy, fallback `0`;
- model inference: `0`;
- active local runtime errors: `0`;
- failures: `0`;
- existing managed-direct CLI operations only: `credits`, `devpass-capture-24h`, `usage-24h-model`.

The Engine cache policy currently uses:

- `accountCapture`: 30-second cache ownership;
- 24h usage/activity/usageScopes families: 60-second TTLs;
- Dashboard effective refresh: 60 seconds in the supplied capture.

## 3. Source truth boundary

The Engine request normalizer obtains the visible model only from the captured authoritative request row (`row.model`), falling back to `Unknown` when the source row does not provide it yet.

The Plugin displays the model from request metadata. Exact request identity remains `request:<id>` whenever a request ID exists; provider/model are enrichment, not identity.

No local heuristic is authorized to infer a missing model from provider, price, service tier, latency, account scope, or neighboring rows.

## 4. Current diagnosis

The observed 1–2 minute delay is **plausibly a freshness/enrichment timing effect**, not yet a proven Local Usage Dashboard regression.

A source-backed sequence can be:

1. the request becomes visible while the captured log row still lacks or has not finalized model metadata;
2. the Dashboard has already completed its current 60-second refresh;
3. a later source/cache refresh observes the enriched `row.model`;
4. the same exact request ID is then rendered with the model name.

If source enrichment occurs just after a Dashboard refresh, one or two 60-second cycles can appear to the user as roughly 1–2 minutes.

Repository evidence proves the local refresh/cache boundary above. It **does not prove the upstream LLMGateway model-finalization latency itself**. Upstream attribution requires timestamped before/after source evidence for the same request ID.

## 5. Non-actions

Do not mask this observation by adding:

- model-name inference or guessing;
- provider/name/cost/tier heuristics;
- an extra `/logs` request;
- per-row detail fetches;
- a faster global refresh interval;
- a new CLI invocation;
- new persistence solely for model-name freshness.

These would trade truth, battery/runtime cost, or architecture simplicity for a latency that is not yet localized.

## 6. Evidence threshold for a repair design

Before a versioned repair is justified, collect natural before/after evidence for the **same exact request ID**:

- timestamp / refresh identity when the request first appears;
- model field at first appearance (`Unknown`/missing vs explicit);
- timestamp / refresh identity when the same request ID first gains an explicit model;
- whether authoritative source data already carried the model during the intermediate stale UI period;
- repeated samples showing the same pattern.

Do not generate artificial or chargeable requests solely to test this.

Interpretation:

- if source itself lacks the model until the later refresh, classify as source/finalization latency;
- if source already has the model but Local Usage Dashboard holds `Unknown` for an avoidable extra cycle, design a bounded request-enrichment freshness fix;
- if evidence is mixed or insufficient, keep status diagnosis-only.

## 7. Current verdict

`OBSERVED / NOT YET LOCALIZED`

The behavior is noticeable UX latency and should remain tracked, but there is not yet enough evidence to change product bytes or add new I/O.
