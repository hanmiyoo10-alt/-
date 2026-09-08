# Local Usage Dashboard 5.108 — Source / Truth Matrix Addendum

Date: 2026-09-08 KST  
Feature authority: #1899  
Design: `docs/USAGE_DASHBOARD_5108_API_KEY_ORG_LIMIT_DESIGN.md`

## Activated row

| Idea | Product truth | Upstream authority | Local identity | UNKNOWN rule | Privacy retention | Extra I/O | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `V-KEY-LIMIT-HEADROOM` | organization-wide active developer API-key count, server-resolved maximum, deterministic creation headroom | authenticated `GET /keys/api?projectId=<exact>&filter=mine` -> `planLimits.currentCount/maxKeys` at `theopenco/llmgateway@c2bd6f2f21ea4aa97aa37e0c87b34979a0863994` | exact current DevPass `/dev-plans/status` `projectId` already preserved by Engine sanitizer | missing project, permission/source failure, absent/malformed planLimits, invalid scalar => whole surface UNKNOWN | retain only `currentCount`, `maxKeys`, bounded state; discard all key rows, plan, IDs, masked tokens, creator/IAM metadata | one new bounded read-only source family, lazy, project-keyed >=5m cache; no periodic polling | `SOURCE_PROVEN_DESIGN_5.108` |

## Exact semantic proof

The upstream `/keys/api` route does **not** define `currentCount` as the length of the returned key list. For project-scoped requests it separately enumerates all projects in the organization and counts active user/developer keys across them, excluding playground and non-user key types.

The same route returns the server-resolved `maxKeys`. The create-key path enforces the same organization-wide count/cap boundary.

Therefore Local Usage Dashboard may present:

```text
active organization developer keys = currentCount
organization maximum = maxKeys
creation headroom = max(0, maxKeys - currentCount)
```

only when both source scalars are explicit valid non-negative integers.

## Request minimization

Use `filter=mine` on `/keys/api` to minimize the key rows returned to the transient authenticated capture seam. This does **not** redefine `planLimits.currentCount`, because that count is independently computed by the upstream route.

Returned key rows remain out of Local Usage Dashboard authority and are discarded before local capture/public state.

## Privacy boundary

Forbidden merely for this feature:

- API-key rows or IDs;
- masked tokens;
- descriptions;
- creator identity;
- IAM rules;
- per-key budgets, usage, period state, expiry;
- raw project or organization IDs in Plugin/Diagnostics;
- the upstream `plan` field;
- the raw response body.

No key secret is required or retained.

## Local lifecycle boundary

The new source is **not** part of ordinary 60-second snapshot acquisition.

Expected chain:

```text
existing exact DevPass project authority
-> Engine lazy authenticated key-plan source
-> immediate scalar projection
-> project-keyed >=5 minute cache
-> bounded local route
-> DevPass lazy UI cache >=5 minutes
```

No new timer, poller, persistence owner, CLI operation, or Request Ledger owner is authorized.

## Adjacent rows intentionally not activated

- `V-DYNAMIC-ROUTE-TRACE` remains `captured-needs-source-authority`; current public `/logs` authority still does not prove the internal dynamic-route trace metadata required by that idea.
- Per-key usage gauges/headroom are not activated by 5.108. The source exposes per-key metadata, but this release intentionally discards those rows and has a single organization-cap goal.
- API-key create/delete/roll/edit controls are not activated. 5.108 is read-only.
- `planLimits.plan` is intentionally not promoted as product truth because it is unnecessary for the server-resolved count/cap display and could be confused with DevPass subscription plan semantics.

## Implementation readiness gate

5.108 implementation may begin only after:

1. 5.107 physical acceptance remains the current accepted production authority;
2. production/main/P75 are freshly re-read;
3. exact current Engine/project-status and lazy-route ownership are re-read;
4. implementation preserves the privacy and lifecycle bounds above;
5. a deterministic release transaction and focused regression are prepared.

This addendum is design authority only. It does not itself set `implementationAuthority` or `releaseAuthority` true.
