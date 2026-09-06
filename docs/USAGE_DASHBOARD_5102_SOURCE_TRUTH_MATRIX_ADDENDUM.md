# Local Usage Dashboard 5.102 — Source / Truth Matrix Addendum

Date: 2026-09-07 KST  
Status: **CANONICAL VERSION-SPECIFIC SOURCE/TRUTH ADDENDUM**  
Feature authority: #1803  
Parent index: `docs/USAGE_DASHBOARD_SOURCE_TRUTH_MATRIX.md`

This addendum freezes the exact source/truth row for `V-CACHE-POLICY-MODE` before 5.102 implementation. It is a version-specific child authority of the parent matrix and must not be silently reinterpreted.

| Feature ID | User surface | Authoritative source | Exact source fields | Capture owner | Allowed normalization / derivation | UNKNOWN rule | Forbidden inference | Privacy / retention | Extra I/O | Contract impact | Evidence | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `V-CACHE-POLICY-MODE` | existing DevPass account read-only box + Diagnostics | authenticated LLMGateway `GET /dev-plans/status` | exact enum `providerCacheControlMode`: `auto \| passthrough \| off` | existing Engine account capture tap; current sanitizer/DevPass status normalizer must be re-read before implementation | exact `auto`=>automatic/`자동`; exact `passthrough`=>client-managed/`클라이언트 관리`; exact `off`=>disabled/`꺼짐`; no coercion | missing/null/non-string/unsupported/status unavailable => UNKNOWN / `—`; missing must never become `auto` | upstream UI `?? "auto"` fallback; cache HIT/MISS; Read/Write/TTL; `cachedTokens`; caller markers; provider/model/cost/latency/outcome; request success; account plan | retain only normalized mode + bounded source tag; no raw settings object, caller markers, org/project IDs, prompts, bodies, auth/session data | none; reuse existing `/dev-plans/status` capture | additive snapshot/account UI metadata only if implementation requires it; snapshot/recent-request contract versions remain `1/1` absent fresh incompatibility evidence | #1803; upstream `packages/models/src/types.ts`; upstream `apps/api/src/routes/dev-plans.ts`; upstream `apps/api/src/utils/provider-cache-control.ts`; upstream caching settings UI | `PROVEN` |

## Semantic notes

1. `auto` means provider cache markers supplied by the caller are forwarded and Gateway may additionally inject markers on qualifying long prompts.
2. `passthrough` means caller markers are forwarded verbatim and Gateway does not inject its own markers.
3. `off` means provider cache markers are stripped, disabling provider prompt-cache writes.
4. This feature is **provider prompt-cache control policy**, not Gateway response/request caching.
5. This is current account/project policy state, not historical request-level attribution.
6. Upstream UI may default a missing value to `auto` for presentation. Local Usage Dashboard must not import that fallback into source truth.

## Implementation gate

Implementation may begin only after a fresh read proves:

- production is still the accepted 5.101 baseline or a newer accepted baseline is explicitly reconciled;
- no conflicting 5.102 authority exists;
- P68 is still free or a fresh regression ID is allocated;
- this exact truth/UNKNOWN/privacy/I/O boundary remains compatible with current Engine/Product owners;
- no new endpoint/CLI/timer/poller/cache/persistence owner is needed.

If any of those conditions fail, stop and amend the design rather than weakening UNKNOWN fidelity.