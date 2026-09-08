# Usage Dashboard 5.106 Source-Truth Matrix Addendum

Date: 2026-09-08 KST  
Feature authority: #1874  
Design: `docs/USAGE_DASHBOARD_5106_CREDITS_ENDPOINT_RPM_DESIGN.md`

This addendum freezes only the 5.106 endpoint-RPM source contract. It does not grant implementation or release authority.

| Surface | Source | Allowed truth | UNKNOWN / N/A | Forbidden reconstruction |
|---|---|---|---|---|
| Credits endpoint RPM table | selected Credits org `GET /orgs/{id}/limits` -> `endpoints[].key`, `endpoints[].rpm` | source-ordered endpoint keys and explicit finite non-negative RPM; `rpm=0` => Unlimited | enterprise or `rateLimitsApply=false` => N/A; permission/source missing, missing array, malformed/duplicate row => UNKNOWN | tier multiplier, 429s, request history, throughput, model/provider, prior observations |
| Endpoint display label | bounded local map keyed by exact source `key` | known friendly label or bounded raw key fallback | empty/invalid key invalidates table | model/provider guesses, path parsing |
| Diagnostics | normalized endpoint RPM truth | row count, unlimited count, source/state only | bounded state names | raw paths, raw org IDs, full table dump |

## Pinned upstream evidence

Official source inspected at `theopenco/llmgateway@db661f93eca2b4a753141cf2ee86cab1b2be248f`:

- `apps/api/src/routes/organization.ts` declares `/orgs/{id}/limits` response `endpoints` rows with `key`, `path`, `rpm` and separately exposes `rateLimitsApply`.
- `apps/ui/src/app/dashboard/[orgId]/org/limits/_components/limits-client.tsx` renders `data.endpoints` only when `data.rateLimitsApply` is true and renders `e.rpm > 0 ? e.rpm : "Unlimited"` semantics.

## Local 5.105 boundary

Current accepted 5.105 Engine `sanitizeGatewayLimits` preserves enterprise/plan/rate/caps/tier/usage/topUp/nextTier but intentionally does **not** preserve `endpoints`. Therefore 5.106 cannot be Product-only if the frozen design is implemented faithfully; implementation-time readback must confirm the exact Engine delta before bumping to `1.6.40`.

## Non-authority statement

This file is source/design evidence only. `implementationAuthority=false` and `releaseAuthority=false` remain in force for upstream idea intake.