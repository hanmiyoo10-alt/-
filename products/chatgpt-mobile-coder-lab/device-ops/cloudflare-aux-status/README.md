# Cloudflare auxiliary status v1

This directory owns the repository source baseline for a deliberately narrow
Cloudflare Worker profile. It is not a deployed runtime or production authority.

## V1 contract

V1 exposes only:

- `GET /health` for bounded self-health;
- `GET /capabilities` for a static capability manifest.

Everything else fails closed. V1 has no outbound fetch, upstream URL selection,
credential/token exchange, repository write, shell, device effect, binding,
secret, route, custom domain, or permissive wildcard CORS surface.

The checked-in Wrangler config keeps `workers_dev` and preview URLs disabled.
It contains no account, zone, custom-domain, route, binding, or secret identity.

## Capability growth

Widen capability only through separately reviewed layers:

1. preserve this read-only self-status baseline;
2. add fixed allowlisted public egress only for a concrete use case, with
   bounded methods, redirects, body size, timeout, rate/cost behavior, and
   destination-specific auth review;
3. add any write/action class through a separately owned bounded profile,
   preferably a sibling Worker rather than widening this read-only surface.

A later capability never inherits repository, merge, release, production,
shell, Android, device, or secret authority merely because an earlier layer
exists.

## Deployment boundary

This packet owns source and contract tests only. Worker creation/version upload,
Cloudflare Access, custom-domain routing, bindings, secrets, and any
`myang.link` hostname are separate future packets.

Current Cloudflare guidance supports protecting Workers or specific hostnames
with Access and attaching Custom Domains to Workers. Those mechanisms should be
selected and live-proven by the later deployment owner rather than pre-baked
into this source baseline.

## Validation

Run:

```text
node --check worker.mjs
node --test tests/test_contract.mjs
```
