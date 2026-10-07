# Cloudflare auxiliary status v1

This directory owns the repository source baseline for a deliberately narrow
Cloudflare Worker profile. It is not production authority.

## V1 contract

V1 exposes only:

- authenticated `GET /health` for bounded self-health;
- authenticated `GET /capabilities` for a static capability manifest.

The authentication boundary is intentionally small:

- HTTP Basic over HTTPS only; plaintext HTTP is rejected before credentials are
  read or a Basic challenge is emitted;
- authentication scheme matching is case-insensitive;
- fixed non-secret username `mcl`;
- password supplied only by the Cloudflare Worker Secret binding
  `MCL_STATUS_PASSWORD`;
- UTF-8 candidate and configured passwords are normalized to NFC before the
  timing-resistant digest comparison;
- the Basic token parser is bounded at 8 KiB, sufficient for the current 5 KiB
  Worker secret limit while remaining well below the request-header ceiling;
- no password or reusable credential value in repository source/config/tests;
- no query-string token, cookie/session, JWT, identity database, or external IdP.

Missing, malformed, wrong, or unavailable credentials fail closed with a bounded
`401` Basic challenge on HTTPS only. The capability manifest reports
`credentialBindings=true` and `authentication="http-basic"` so it does not
hide the required secret dependency.

Everything outside the two fixed endpoints fails closed. V1 has no outbound
fetch, upstream URL selection, credential/token exchange, repository write,
shell, device effect, proxy, custom-domain identity, or permissive wildcard CORS
surface.

The checked-in Wrangler config keeps `workers_dev` and preview URLs disabled.
It declares only the required secret name, never a secret value, and contains no
account, zone, custom-domain, route, or plaintext credential identity.

## Secret boundary

Cloudflare Workers Secrets are runtime bindings. Set the live password only in a
separate runtime-authorized packet after this source change is merged. Never put
the value in `wrangler.jsonc`, `.env`, `.dev.vars`, GitHub issues, tests, or
Git.

A later runtime packet must set `MCL_STATUS_PASSWORD` before deploying this
source because Wrangler validates `secrets.required` during deploy.

## Capability growth

Widen capability only through separately reviewed layers:

1. preserve this authenticated read-only self-status baseline;
2. add fixed allowlisted public egress only for a concrete use case, with
   bounded methods, redirects, body size, timeout, rate/cost behavior, and
   destination-specific auth review;
3. add any write/action class through a separately owned bounded profile,
   preferably a sibling Worker rather than widening this read-only surface.

A later capability never inherits repository, merge, release, production,
shell, Android, device, or secret authority merely because an earlier layer
exists.

## Deployment boundary

This source packet owns code/config/tests only. Worker secret mutation,
deployment/version upload, custom-domain routing, DNS, and any
`myang.link` hostname are separate future packets.

## Validation

Run:

```text
node --check worker.mjs
node --test tests/test_contract.mjs
```
