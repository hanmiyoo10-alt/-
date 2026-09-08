# Local Usage Dashboard 5.108 — API-Key Organization Limit Headroom Design

Date: 2026-09-08 KST  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Feature authority: #1899

## 1. Fresh accepted baseline

- repository: `hanmiyoo10-alt/-`
- scope: `plugins/usage-dashboard/`
- production: `release-usage-dashboard@b5ff566fdf164580b0edfa6e2db1d07cc88992bf`
- Product `3.0.0-alpha.5.107`
- Engine `1.6.41`
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- 5.107 physical authority: #1888 comment `5581885185` (`PASS_PHYSICAL`)
- structured acceptance: #1892 comment `5581888722`
- main at design start: `49aeb874e331dff3afdf3a18cca752ad048a596d`

P74 is already owned by E26. P75 was fresh-searched and is the tentative focused regression for this release.

## 2. Official upstream authority

Fresh pinned upstream: `theopenco/llmgateway@c2bd6f2f21ea4aa97aa37e0c87b34979a0863994`.

Authenticated `GET /keys/api?projectId=<project>&filter=mine` exposes:

```text
planLimits.currentCount
planLimits.maxKeys
planLimits.plan
```

The upstream route computes `currentCount` independently from the returned API-key rows. It counts active developer keys across **all projects in the organization**, excluding platform/SDK aggregate keys and playground keys. `maxKeys` is produced by the server's organization/plan-override resolver, and the create-key route enforces the same organization-wide count/cap boundary.

The official API Keys UI uses this source with a five-minute stale time and disables creation when `currentCount >= maxKeys`.

Local Usage Dashboard needs only `currentCount` and `maxKeys`. `plan` is deliberately discarded.

## 3. Existing local identity authority

Current Engine DevPass-status capture already retains the exact authenticated `/dev-plans/status` `projectId` scalar.

5.108 binds only to that authority.

Forbidden project identity sources:

```text
Request Ledger rows
/logs request metadata
Credits selected organization
provider/model activity
persisted historical guesses
user-entered IDs
```

Missing exact DevPass project authority means `project-unavailable`, not fallback.

## 4. Product goal

Add one compact read-only block in the existing DevPass tab:

```text
API Keys · 조직 한도
활성 API 키 · 조직 전체     N / M
생성 여유                   K개
```

Where:

- `N` is exact `planLimits.currentCount`;
- `M` is exact `planLimits.maxKeys`;
- `K = max(0, M - N)` only when both exact values are valid.

If `N > M`, preserve the exact `N / M` ratio and show creation headroom `0개`; never clamp the observed count and never show negative headroom.

This surface describes organization-wide **developer API-key capacity**. It is not a per-project key count, API request rate limit, endpoint RPM meter, request history count, or key-management control.

## 5. Truth / UNKNOWN contract

1. Only the authenticated `/keys/api` plan-limit result for the exact current DevPass `projectId` is authoritative.
2. Use `filter=mine` to reduce returned key-list metadata. The server-computed org-wide `planLimits.currentCount` remains independent of the filtered returned rows.
3. `currentCount` and `maxKeys` each require an explicit finite non-negative integer.
4. Explicit zero is known zero.
5. Missing `planLimits`, invalid/non-integer/negative/non-finite values, permission failure, missing project authority, or source failure makes the **whole block UNKNOWN**.
6. Never count returned `apiKeys` rows to reconstruct `currentCount`.
7. Never derive `maxKeys` from public plan tables, DevPass plan name, organization schema defaults, or prior observations.
8. Never infer key capacity from requests, errors, service tier, models/providers, spend, Credits balance, Gateway Limits, or Endpoint RPM.
9. No fallback project or organization.
10. No key create/delete/rename/roll/enable/disable/limit-edit action.

## 6. Privacy and data minimization

The upstream response contains more data than this feature needs. The capture boundary must immediately project the plan-limit scalars and drop the rest.

Retain only:

```text
currentCount
maxKeys
bounded source/fetch state
```

Do not retain, persist, forward, render, or diagnose merely for 5.108:

```text
apiKeys rows
key IDs
masked tokens
descriptions
creator ID/name/email
IAM rules
key usage/budget/expiry metadata
plan
raw project/org IDs in Plugin public state or Diagnostics
raw full /keys/api response
auth/session material
```

A transient authenticated response may be parsed inside the bounded Engine capture seam, but the discarded fields must never cross that seam.

## 7. I/O and lifecycle ownership

5.108 adds one bounded read-only upstream family but **must not put it on the normal 60-second snapshot critical path**.

Required ownership:

```text
existing sanitized DevPass status projectId
-> existing authenticated capture seam
-> GET /keys/api?projectId=<exact>&filter=mine
-> immediate planLimits scalar projection
-> project-keyed Engine cache, TTL >= 5 minutes
-> bounded local read route
-> DevPass-tab lazy Plugin loader + UI runtime cache, TTL >= 5 minutes
-> UI + bounded Diagnostics
```

The local route name may be `/api-key-plan-limits` if implementation-time ownership readback confirms it is the narrowest fit. Plugin requests must not carry a raw project ID; Engine resolves the current exact project authority internally.

Reuse the lifecycle style already proven by Credits Gateway Limits:

- lazy surface load;
- single-flight;
- bounded cache;
- source failure -> UNKNOWN;
- no retry storm.

Forbidden additions:

```text
new timer
poller
periodic background refresh
new CLI command/package
new credential owner
new persistence cycle
Request Ledger owner
cross-project fallback
```

## 8. UI placement and wording

Primary placement: existing DevPass tab near account/account-limit information.

No new top-level tab.

Do not show the upstream `plan` string because it can be confused with the DevPass subscription plan and is unnecessary once `maxKeys` is server-resolved.

Examples:

```text
활성 API 키 · 조직 전체  2 / 5
생성 여유                3개
```

```text
활성 API 키 · 조직 전체  5 / 5
생성 여유                0개
```

Unknown:

```text
활성 API 키 · 조직 전체  —
생성 여유                —
```

## 9. Diagnostics

Bounded success example:

```text
API key org limit: current 2 · max 5 · headroom 3 · source keys-api-plan-limits · state ok
```

Bounded non-ok states:

```text
project-unavailable
permission-unavailable
source-unavailable
plan-limits-unavailable
invalid-plan-limits
```

Diagnostics must not include project/org/key IDs, plan strings, returned key rows, masked tokens, creator metadata, IAM rules, or auth material.

## 10. Candidate identity

Subject to implementation-time fresh readback:

- Product `3.0.0-alpha.5.108`
- Engine `1.6.42` tentative
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- focused regression `P75` tentative

Engine `1.6.42` is tentative because the proposed source projection/cache/local route changes Engine bytes. The bump must be confirmed from exact implementation impact, not assumed.

## 11. P75 regression envelope

P75 must prove at minimum:

1. accepted 5.107 physical baseline and monotonic 5.108 candidate;
2. exact DevPass-status `projectId` authority only;
3. one new read-only `/keys/api` family with `filter=mine`;
4. exact `planLimits.currentCount/maxKeys` fidelity;
5. explicit zero preservation;
6. malformed/missing/non-integer/negative/non-finite values fail the whole block closed;
7. no count reconstruction from returned key rows;
8. no max derivation from plan tables/local defaults;
9. `current > max` keeps exact ratio and floors headroom at zero;
10. upstream key-list metadata is dropped at the Engine capture boundary;
11. no raw IDs/masked tokens/creator/IAM data in Plugin/persistence/Diagnostics;
12. project-keyed Engine TTL >= 5 minutes, lazy DevPass load, UI TTL >= 5 minutes, single-flight;
13. no 60-second upstream polling or new scheduler owner;
14. no fallback project/cache bleed;
15. no key-management write controls;
16. 5.107/5.106/5.105 and prior release regressions remain green;
17. Request Ledger identity/dedupe unchanged;
18. Engine bump only if Engine bytes change;
19. contracts remain `1/1` absent incompatible evidence;
20. full discovered Usage Dashboard registry GREEN and deterministic materialization/idempotence GREEN.

Do not freeze a total registry-test count integer.

## 12. Physical acceptance

After deployment the user only performs the normal PocketRisu `+` update and supplies:

- one DevPass screenshot containing `API Keys · 조직 한도`;
- bounded Diagnostics containing `API key org limit`;
- ordinary READY/Health/runtime identity context.

No API key creation/deletion/editing and no artificial traffic are required.

If the natural account cannot expose the endpoint because exact project/permission authority is unavailable, fail-closed UNKNOWN is correct source behavior but does not positively exercise numeric rendering.

## 13. Out of scope

- API key listing
- key names/masked tokens
- per-key spend/period gauges
- key creation/deletion/rotation/status mutation
- IAM rule display/editing
- plan-table reconstruction
- API-key request attribution charts
- alerts/notifications
- dynamic-route trace
