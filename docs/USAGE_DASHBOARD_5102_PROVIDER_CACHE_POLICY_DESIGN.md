# Local Usage Dashboard 5.102 — DevPass Provider Cache Policy Read-Only Status Design

Date: 2026-09-07 KST  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Primary feature authority: #1803  
Discovery authority: #1494 (`V-CACHE-POLICY-MODE`)

## 1. Fresh accepted baseline

- repository: `hanmiyoo10-alt/-`
- product scope: `plugins/usage-dashboard/`
- production branch: `release-usage-dashboard`
- production SHA: `fa27d1dd6eaa17a8388c96da475ea3965e0572c8`
- Product: `3.0.0-alpha.5.101`
- Engine: `1.6.36`
- Manager: `1.3.6`
- managed CLI: `1.10.0`
- managed Models: `1.280.0`
- contracts: snapshot `1` / recent-request `1`
- 5.101 physical acceptance: #1598 comment `5562249836` (`PASS_PHYSICAL`)
- fresh main at design start: `4b3d7eb48506f4cd57de50261bb5bbb211e57198`

Repository search found no existing 5.102 Product authority and no `p68-*` Usage Dashboard regression at this checkpoint. Both are mutable and must be re-read before implementation.

## 2. Why this is the next feature

The upstream idea intake still contains `V-CACHE-POLICY-MODE` as a captured candidate. During 5.102 source proof, official LLMGateway source at commit `728b49a93b757ee96fb4d5742ce46dddc42d2f9b` proved both the exact enum and the current `/dev-plans/status` exposure.

The existing Local Usage Dashboard Engine already captures `/dev-plans/status` for the 5.101 No-AI-Training feature and earlier DevPass account features. Therefore 5.102 can expose provider prompt-cache policy without introducing a new endpoint, CLI operation, timer, poller, cache owner, persistence owner, or package fetch.

## 3. Primary goal

Expose the current DevPass provider prompt-cache control mode as one small **read-only** row in the existing DevPass account box and one bounded Diagnostics line.

Frozen UI:

```text
AI 학습 차단        사용 | 꺼짐 | —
Provider 캐시 정책  자동 | 클라이언트 관리 | 꺼짐 | —
```

No new tab, card, modal, toggle, or write action.

## 4. Authoritative source

Official upstream `ProviderCacheControlMode` is exactly:

```text
auto | passthrough | off
```

Source semantics:

- `auto`: forward caller-supplied provider cache markers and additionally inject Gateway markers on qualifying long prompts;
- `passthrough`: forward caller-supplied markers verbatim and never inject Gateway markers;
- `off`: strip provider cache markers so provider cache writes are disabled.

Official `/dev-plans/status` schema exposes `providerCacheControlMode` alongside `blockApiTraining`.

The feature consumes only the resolved `providerCacheControlMode` value from the already-captured status response.

## 5. Truth and UNKNOWN contract

Normalized states:

| Exact source | Normalized | UI |
| --- | --- | --- |
| `auto` | `automatic` | `자동` |
| `passthrough` | `client-managed` | `클라이언트 관리` |
| `off` | `disabled` | `꺼짐` |
| missing / null / invalid / unsupported / status unavailable | `unknown` | `—` |

Hard rules:

1. exact enum match only; no truthy/falsy or substring coercion;
2. missing is UNKNOWN, never synthetic `auto`;
3. upstream dashboard UI's `providerCacheControlMode ?? "auto"` fallback is presentation convenience and **must not become Local Usage Dashboard source truth**;
4. Cache Observability HIT/MISS, Read/Write/TTL, `cachedTokens`, cost, provider, model, request markers, or successful cache reuse must never infer this setting;
5. this is current account/project policy visibility, not proof of the policy that governed any historical request;
6. do not conflate provider prompt-cache control with LLMGateway response/request caching.

## 6. Existing capture and ownership

Expected implementation ownership after fresh re-read:

- `runtime-src/bridge-engine/30-cli-runtime.part.mjs`
  - extend existing `/dev-plans/status` sanitizer allowlist by exactly `providerCacheControlMode`;
- `runtime-src/bridge-engine/40-sources.part.mjs`
  - normalize the exact enum into one bounded tri-state/quad-state truth object;
  - extend existing DevPass account normalization owner;
- Product/UI DevPass account owner
  - render one read-only row immediately after `AI 학습 차단`;
- Diagnostics owner
  - render one bounded source-qualified line;
- release materializer/spec + focused P68 regression.

No request identity/dedupe field changes.

## 7. Diagnostics

Known example:

```text
DevPass provider cache policy: auto · source /dev-plans/status.providerCacheControlMode
```

Unknown example:

```text
DevPass provider cache policy: unknown · source unavailable
```

Do not expose raw settings objects, caller cache markers, provider routing attempts, prompts, response bodies, raw org/project IDs, auth/session data, or billing identifiers.

## 8. Candidate release identity

Subject to mandatory implementation-time fresh readback:

- Product `3.0.0-alpha.5.102`
- Engine `1.6.37` tentative because Engine sanitizer/normalizer behavior changes
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- focused regression `P68` tentative; fresh-check required

## 9. P68 regression freeze

P68 must lock at least:

1. accepted 5.101 physical authority and monotonic 5.102 candidate;
2. official upstream enum `auto | passthrough | off`;
3. `/dev-plans/status.providerCacheControlMode` as the only feature source;
4. no new endpoint/CLI/timer/poller/cache/persistence owner;
5. exact `auto` => automatic;
6. exact `passthrough` => client-managed;
7. exact `off` => disabled;
8. missing/null/invalid/unsupported => UNKNOWN;
9. upstream UI default fallback must not synthesize `auto`;
10. no inference from Cache Observability, tokens, cost, provider, model, request markers, outcome, or latency;
11. no request-level historical attribution;
12. no write/toggle surface;
13. 5.101 No-AI-Training behavior preserved;
14. 5.100 model category/lifecycle behavior preserved;
15. 5.99 daily-server fail-closed behavior preserved;
16. request identity/dedupe unchanged;
17. snapshot/recent-request contracts remain `1/1` absent fresh incompatibility evidence;
18. E18+ current release-control contracts remain GREEN as applicable;
19. full discovered Usage Dashboard registry GREEN;
20. deterministic materialization and second-pass idempotence GREEN.

Do not hard-code a future full-registry count.

## 10. Physical acceptance

After deployment, user action remains the normal PocketRisu `+` update and one natural DevPass UI/Diagnostics capture. No policy change and no artificial request are required.

Accept when:

- installed tuple matches promoted 5.102;
- READY / Health ok / active errors 0 / failures 0;
- `Provider 캐시 정책` UI and Diagnostics agree;
- explicit source enum renders the matching state;
- unavailable source remains `—`, never synthetic `자동`;
- no new feature-attributable CLI/network family appears;
- 5.101 No-AI-Training, 5.100 lifecycle/category, 5.99 daily server truth, cache/tier/request/billing surfaces remain healthy.

## 11. Non-goals

- no cache-policy write/toggle action;
- no cache TTL editor;
- no Gateway response-cache setting;
- no request-level provider-cache-policy attribution;
- no reconstruction from cache telemetry;
- no provider compatibility matrix;
- no ZDR/compliance editor;
- no new endpoint or polling.

## 12. Implementation gate

Before implementation starts:

1. fresh-read production and main;
2. confirm 5.101 `PASS_PHYSICAL` remains the accepted baseline;
3. confirm no real 5.102 release authority has appeared;
4. confirm P68 remains free or allocate a fresh replacement;
5. ensure the complete `V-CACHE-POLICY-MODE` source-truth row is canonical in the parent matrix or an explicitly equivalent version-specific matrix authority;
6. re-read current Engine sanitizer/normalizer and Product UI owners rather than relying on this design's file expectations.

If any source semantic differs, amend the design before implementation.