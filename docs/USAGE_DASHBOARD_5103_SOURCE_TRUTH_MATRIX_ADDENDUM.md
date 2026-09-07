# Usage Dashboard 5.103 Source-Truth Matrix Addendum

Status: **CANONICAL VERSION-SPECIFIC CHILD · DESIGN ONLY**  
Feature authority: #1829  
Parent design: `docs/USAGE_DASHBOARD_5103_GATEWAY_LIMITS_HEADROOM_DESIGN.md`

This addendum freezes the complete source-truth row for `V-GATEWAY-LIMITS-HEADROOM` before implementation. It does not itself authorize Product or release mutation.

| Key | User surface | Authoritative source | Exact retained truth | Ownership | Known/not-applicable semantics | UNKNOWN semantics | Forbidden inference | Privacy / minimization | I/O | Release boundary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `V-GATEWAY-LIMITS-HEADROOM` | selected Credits/default org → Credits tab `Gateway Limits · Credits` + bounded Diagnostics | authenticated LLMGateway `GET /orgs/{selectedCreditsOrgId}/limits` | `enterprise`, `planClass`, `rateLimitsApply`, `tierOverridden`, `capsApply`, minimum `tier` fields required for tier/rpm/spend caps, minimum `usage` daily/monthly spent fields, minimum `topUp` cap/window/used/remaining fields or explicit null | existing authenticated account-capture credential seam + new org-keyed bounded limits source/cache; Product Credits UI consumes normalized truth | enterprise=true => no per-org Gateway limits; non-regular trust tier => not applicable; rateLimitsApply=false => rate enforcement not applicable; capsApply=false => spend caps not applicable; topUp=null => top-up cap exempt/not applicable; daily spend boundary is UTC | selected org unavailable, 403/404, auth/network/source failure, missing/invalid required metric => UNKNOWN/`—`; never fall back to another org | Credits balance/runway, observed/daily server usage, Request Ledger, cache telemetry, provider/model/category/lifecycle, service tier, outcome/status, org name, DevPass plan, or upstream UI defaults | do not retain accountAgeDays, lifetimeSpendUsd, nextTier, endpoint RPM table, raw full response, auth/session material; no raw org ID in Diagnostics | exactly one new upstream endpoint family; one selected-org request per cache fill; org-keyed; TTL target >=5m; non-critical-path/lazy-background; no org fanout/retry storm/new timer/persistence owner | Product 5.103 candidate; Engine 1.6.38 tentative; Manager 1.3.6; CLI 1.10.0; Models 1.280.0; contracts 1/1; P69 tentative |

## Exact arithmetic rule

Daily/monthly remaining headroom may be derived only when both official `used` and `cap` are explicit finite non-negative numbers:

`remaining = max(0, cap - used)`

That arithmetic is deterministic derived truth, not an estimate. Missing or invalid operands produce UNKNOWN. `topUp.remainingUsd` is already provided by the official source and must not be independently reconstructed.

## Cross-org isolation

The selected Credits organization is part of source identity. Cache/data for one org must never be reused for another org after selection changes. A failed selected-org request stays UNKNOWN; it does not authorize a fallback organization.

## Adjacent rows intentionally not activated

- `V-DYNAMIC-ROUTE-TRACE`: remains needs-source-authority because internal DB routing metadata is not yet proven exposed by the public `/logs` schema inspected for this design.
- `V-KEY-LIMIT-HEADROOM`: remains needs-source-authority.
- next-tier progression and endpoint RPM table are deferred slices of the same upstream endpoint, not part of this 5.103 row.

## Implementation readiness gate

Before 5.103 implementation is marked ready, confirm:

1. 5.102 `PASS_PHYSICAL` remains accepted baseline (#1803 comment `5565569980`);
2. production still matches the accepted 5.102 tuple or a newer authority is explicitly reconciled;
3. P69 is still free or a fresh replacement is reserved;
4. the selected-org flow and cache design prove no cross-org reuse;
5. limits fetch remains off the foreground critical path and TTL target is >=5 minutes;
6. sanitizer stores only the minimum retained fields above;
7. no second new upstream endpoint family is required.

Any semantic change requires a design amendment rather than silent implementation drift.