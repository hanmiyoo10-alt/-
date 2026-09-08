# Local Usage Dashboard — Dynamic Route Trace Source Recheck

Date: 2026-09-08 KST

Status: **SOURCE AUTHORITY STILL INSUFFICIENT · NO PRODUCT RELEASE AUTHORIZED**

## Scope

This is a source-authority recheck for warehouse candidate `V-DYNAMIC-ROUTE-TRACE` only.

It does not authorize Product 5.109, implementation, release, runtime I/O, or any change to `plugins/usage-dashboard/` shipped artifacts.

## Fresh Local Usage Dashboard baseline

- repository: `hanmiyoo10-alt/-`
- scope: `plugins/usage-dashboard/`
- production: `release-usage-dashboard@05862999df0521c73b6890fbc561c01be3f9f36e`
- Product `3.0.0-alpha.5.108`
- Engine `1.6.42`
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- 5.108 physical feature authority: #1899 comment `5585417259`
- 5.108 structured release acceptance: #1905 comment `5585420039`
- intake was synchronized after physical acceptance so `V-KEY-LIMIT-HEADROOM=implemented-5.108`
- `V-DYNAMIC-ROUTE-TRACE` remains `captured-needs-source-authority`

## Fresh pinned upstream

Rechecked official public upstream at:

`theopenco/llmgateway@417939881f6582f4873ad412cf7413325097565a`

### Internal routing truth exists

`packages/actions/src/get-cheapest-from-available-providers.ts` defines `RoutingMetadata.dynamicRoute` when a request is resolved through a named dynamic route:

```text
dynamicRoute.name: string
dynamicRoute.version: number
dynamicRoute.path: string[]
```

The path is explicitly described as node IDs traversed during graph evaluation.

Gateway tests also inspect persisted `log.routingMetadata.dynamicRoute`, confirming that the gateway internally records the per-request trace.

### Public `/logs` authority is still incomplete

`apps/api/src/routes/logs.ts` now publicly declares a substantial `routingMetadata` object in `logSchema`. This is a meaningful upstream evolution compared with earlier source rechecks.

However the declared public `routingMetadata` schema includes provider selection, credential-source, provider-score, retry-routing, filtered-provider, stripped-parameter, content-filter, and service-tier-source fields, but it **does not declare `dynamicRoute`**.

The same file uses public log table columns when selecting rows. That implementation detail is not enough to promote an undeclared nested field as durable Local Usage Dashboard product truth.

Local Usage Dashboard must not depend on a field merely because a raw runtime object might currently pass it through outside the declared public schema.

## Why other public Dynamic Route endpoints do not close the gap

The upstream Dynamic Route management API can describe route definitions/configuration. That is different authority from a per-request trace.

A route definition alone cannot prove for a particular request:

- which named route was actually resolved;
- which published version handled that request;
- which graph nodes were traversed;
- whether a later route edit changed the currently published graph.

Likewise `requestedModel`/a `dynamic/<name>` model string cannot reconstruct the exact per-request version or evaluation path.

Therefore no join, inference, remembered route configuration, or request-ledger reconstruction is authorized.

## Current verdict

`V-DYNAMIC-ROUTE-TRACE` stays:

`captured-needs-source-authority`

No 5.109 feature/design/release is opened from this candidate.

UNKNOWN remains UNKNOWN. No source field is fabricated, inferred, counted, or reconstructed.

## Promotion condition

This candidate may be reconsidered only when official public upstream provides stable per-request authority, for example one of:

1. public `/logs` or `/logs/{id}` schema explicitly declares `routingMetadata.dynamicRoute` with the needed bounded fields;
2. another documented public per-request endpoint exposes exact dynamic-route name/version/path;
3. an official upstream UI consumes an explicitly typed public response contract carrying those exact per-request fields.

Any future recheck must re-read the then-current upstream source and Local Usage Dashboard production baseline rather than relying on this document as release authority.

## Privacy/minimization boundary if authority appears later

Even if the trace becomes public, a future design should retain only bounded route trace fields required by the UI. It should not pull unrelated provider-key hashes, provider-key IDs/labels, credential metadata, messages, prompts, response content, custom headers, or auth/session material into Local Usage Dashboard merely because they share the same `routingMetadata`/log object.

## Repository effect

Documentation/evidence only.

- Product bytes: unchanged
- Engine bytes: unchanged
- Manager bytes: unchanged
- release branch: unchanged
- intake candidate state: unchanged
- implementation authority: false
- release authority: false
