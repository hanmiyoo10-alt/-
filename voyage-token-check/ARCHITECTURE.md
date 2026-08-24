# Voyage Token Check — Architecture

## Product mission

Replace the routine need to open the Voyage website just to inspect usage/quota information.

Target normal interaction:

`open plugin → see the current Voyage usage/quota state → optionally inspect details → close`

The UI may resemble the useful parts of the Voyage dashboard, but the implementation must use supportable data sources and must preserve source fidelity.

## Core design principle

Separate **data acquisition** from **presentation**.

The UI must not care whether a value came from:

- a future authoritative Voyage quota/usage interface;
- a host-exposed authenticated source; or
- Risu-observed Voyage request responses.

Instead every source is normalized into a common snapshot with explicit provenance and fidelity.

This lets the plugin ship useful observed-usage functionality first, then adopt an authoritative quota source later without rewriting the UI.

## High-level architecture

```text
Voyage / Host / Risu evidence sources
            ↓
      Source adapters
            ↓
   Parse + validate + normalize
            ↓
       Snapshot state
            ↓
  Summary UI + detail UI
            ↓
   Redacted diagnostics
```

## 1. Source adapters

Each source adapter owns one evidence source and returns normalized data.

### `AuthoritativeQuotaProvider`

Purpose:
- exact allocation / used / remaining quota;
- cost data when exposed;
- rate-limit data when exposed;
- reset-window metadata when exposed;
- account / organization / project scope when exposed.

Current state: **UNKNOWN / unavailable until a supportable authoritative source is VERIFIED.**

It must not be implemented using dashboard scraping, hidden dashboard endpoint reverse-engineering, copied browser sessions, or embedded credentials.

### `RisuObservedUsageProvider`

Purpose:
- observe Voyage requests already performed by Risu;
- read sanitized request/response logs only after the user grants the host `fetchLogs` permission;
- extract request-level Voyage usage fields actually present in responses;
- provide a local observed-usage view without reading the Voyage API key.

Current state: **VERIFIED as technically available in Risu Plugin API v3**, subject to real-device validation of actual Voyage log contents and lifecycle behavior.

Fidelity rule:

`Risu-observed usage != account-wide remaining quota`

Locally observed totals must never be labeled as authoritative account/project balance unless later evidence proves complete coverage and exact semantics.

### `ReferenceMetadataProvider` (optional, later)

Purpose:
- model names;
- public pricing / documented limits;
- other non-account reference metadata.

Reference metadata may explain account data but must never fabricate current balance, remaining quota, or account-specific state.

## 2. Normalized snapshot contract

All providers feed a common state model conceptually similar to:

```text
VoyageSnapshot
- status: available | partial | unavailable
- source
- fidelity: authoritative | observed | reference
- scope: account | organization | project | local-risu | unknown
- allocatedTokens?: number
- usedTokens?: number
- remainingTokens?: number
- observedTokens?: number
- cost?: number
- rateLimits?: ...
- resetAt?: timestamp
- capturedAt?: timestamp
- warnings[]
```

Exact field names may change during implementation, but these semantic rules are stable:

1. absent/unknown values remain absent/unknown;
2. known zero is distinct from unknown;
3. every important number carries source/fidelity/scope;
4. derived values are marked derived and document their inputs;
5. observed usage is never silently promoted to authoritative quota.

## 3. Refresh and state flow

Default user flow:

```text
open plugin
→ show last trustworthy normalized snapshot immediately if available
→ perform one bounded refresh
→ update visible values
→ keep prior trustworthy values if the new source is temporarily unavailable
→ show freshness/source state
```

Do not use high-frequency polling.

Refresh should be user-driven or tied to meaningful lifecycle events such as opening the plugin. Background refresh may be considered later only with evidence that it improves the experience without unnecessary network or host activity.

### Storage rule

Persist only the minimum normalized state required for UX continuity.

Do not persist:
- API keys;
- authorization headers;
- cookies/sessions;
- raw request bodies by default;
- raw Voyage responses by default;
- unbounded fetch-log history.

If local observed usage later requires durable aggregation, first VERIFY the fetch-log lifecycle and a deterministic way to avoid duplicate/missed accounting. Until then, persistent exact cumulative accounting remains UNKNOWN.

## 4. UI architecture

### Primary screen — one-action summary

The first screen should answer the user's reason for installing the plugin without navigation.

Preferred hierarchy:

1. **Primary quota value**
   - authoritative `remaining` when available;
   - otherwise a clearly labeled observed-usage value;
2. total / used / remaining breakdown when authoritative fields exist;
3. current cost when actually exposed;
4. rate-limit state when actually exposed;
5. small source + freshness indicator;
6. refresh action.

The primary screen should not recreate the entire Voyage website. It should reproduce only the information that removes the need to visit it routinely.

### Detail screen

Optional detail view can show:
- scope (account / org / project / local Risu observation);
- source and fidelity;
- per-model or per-endpoint breakdown if supported by real data;
- cost details;
- rate limits;
- reset timing;
- last successful refresh;
- recoverable source errors.

### Partial-data behavior

- authoritative quota unavailable, observed usage available → show observed usage with an explicit `Risu observed` label;
- some authoritative fields missing → show only known fields, leave the rest unavailable;
- source temporarily fails → retain previous trustworthy snapshot with stale/freshness indication;
- no usable data → show unavailable state, never zero.

## 5. Permission and security boundary

Security is a product contract, not a later hardening task.

Never require the plugin to:
- read or display the user's Voyage API key;
- copy authentication headers;
- receive browser cookies/session tokens;
- ship credentials in plugin arguments or source;
- log secrets for diagnostics.

### Risu observed-usage permission

`getFetchLogs()` is permission-gated by the host.
The plugin should use that capability only for the observed-usage provider and must work gracefully when permission is denied.

The plugin should process only the minimum data needed and discard raw log material after normalization.

### Future authoritative provider

If a future authoritative source requires authentication, it is acceptable only when credentials remain in a host/provider-managed secure boundary and the plugin receives permitted result data rather than exportable secrets.

## 6. Diagnostics

Diagnostics should expose evidence quality, not sensitive content.

Useful fields:
- active provider;
- provider availability;
- fidelity;
- scope;
- number of usable Voyage observations;
- last successful refresh time;
- latest normalized provider error category;
- whether values are authoritative / observed / derived / unknown.

Do not include raw auth headers, API keys, cookies, full request bodies, or full raw responses.

## 7. Delivery roadmap

Evidence outranks roadmap order.

### Stage 0 — Evidence validation

Goal: prove what Risu exposes on a real device.

Validate:
- Voyage requests appear in permission-gated fetch logs;
- response usage fields are present as expected;
- headers/secrets remain unavailable to the plugin;
- log lifetime/order/reset behavior;
- failure behavior.

No account-wide quota claims yet.

### Stage 1 — Observed Usage MVP

Goal: make the plugin useful without pretending to know account quota.

Ship:
- one-click UI;
- current/latest Risu-observed Voyage usage;
- provider/fidelity label;
- refresh;
- safe unavailable/error states;
- redacted diagnostics.

This release must use wording such as `Observed usage` rather than `Remaining quota` unless authoritative balance becomes VERIFIED before implementation.

### Stage 2 — Authoritative quota integration

Trigger: a supportable account/project quota source is VERIFIED.

Add the authoritative provider and populate:
- allocation;
- used;
- remaining;
- scope;
- reset metadata;
- costs/rate limits where real source data supports them.

Because both providers share the snapshot model, this should augment rather than rewrite Stage 1.

### Stage 3 — Dashboard replacement UX

Goal: make routine visits to the Voyage dashboard unnecessary.

Add only proven, useful dashboard-equivalent information such as:
- quota summary;
- usage breakdown;
- costs;
- rate limits;
- reset/freshness state.

Avoid feature-for-feature website cloning when it does not support the one-action product goal.

### Stage 4 — Distribution decision

After stable real-device behavior:

- official/public distribution if the data path is supportable and generalizable without secret exposure;
- private distribution if the legitimate implementation depends on user-local/host-specific conditions that cannot safely generalize.

Private distribution is not an exception to the security, provenance, or source-legitimacy contracts.

## Current architectural verdict

- VERIFIED: a safe Risu-observed-usage path exists at the plugin API level.
- VERIFIED: the plugin can be designed without direct API-key access.
- UNKNOWN: exact real-device fetch-log lifecycle and Voyage response contents in the user's environment.
- UNKNOWN: an authoritative documented account/project remaining-quota interface.
- DESIGN DECISION: use a provider-based architecture so observed usage can ship first and authoritative dashboard data can replace/augment it later without rewriting the product.

## Next evidence gate

Before implementation, perform one real-device diagnostic observation of a normal Voyage request through Risu and inspect only the sanitized plugin-visible log shape.

That diagnostic turn remains analysis-only under `PROJECT_MEMORY.md`; implementation begins only on a later user turn after the evidence is analyzed.
