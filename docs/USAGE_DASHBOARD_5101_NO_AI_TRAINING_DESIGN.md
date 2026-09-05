# Local Usage Dashboard 5.101 — DevPass No-AI-Training Read-Only Status Design

Date: 2026-09-06 KST  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Primary feature authority: #1598  
Discovery authority: #1494 (`V-DEVPASS-NO-TRAINING-STATUS`)

## 1. Fresh accepted baseline

Design source readback:

- repository: `hanmiyoo10-alt/-`;
- product scope: `plugins/usage-dashboard/`;
- production branch: `release-usage-dashboard`;
- production SHA: `478fcd368734b1cf1aa5a98932cb34bb29f1d1e4`;
- Product: `3.0.0-alpha.5.100`;
- Engine: `1.6.35`;
- Manager: `1.3.6`;
- managed CLI: `1.10.0`;
- managed Models: `1.280.0`;
- contracts: snapshot `1` / recent-request `1`;
- 5.100 physical acceptance: #1540 comment `5553562006` (`PASS_PHYSICAL`);
- 5.100 release acceptance: #1549 comment `5553562775`.

Fresh main used to create this design branch:

`cd6b7ef582660f9a4dac3872140b711f73e3c680`

No existing Usage Dashboard 5.101 authority was found at design start. Repository search also found no `p67-*` regression at that checkpoint. Both are mutable and must be re-read before implementation.

## 2. Why this is the next product feature

The upstream idea intake still contains multiple candidates. 5.100 consumed `V-MODEL-LIFECYCLE-STATUS`. The remaining candidates include key-limit headroom, gateway-limit headroom, dynamic route trace, cache-policy mode, and DevPass No-AI-Training status.

The key difference found during the 5.101 source proof is that **the existing authenticated DevPass status response already exposes the No-AI-Training setting as a resolved boolean**, and Local Usage Dashboard already fetches that exact status endpoint in its healthy path.

Therefore 5.101 can add useful account-policy visibility without adding another endpoint, CLI command, poller, cache owner, storage owner, or request observer.

`providerCacheControlMode` is also present in the same upstream status response, but it remains a separate feature candidate. One release keeps one primary goal, so cache-policy presentation is not included in 5.101.

## 3. Primary goal

Expose the **current DevPass No AI training setting** as a small read-only row inside the existing DevPass account surface.

Frozen presentation:

```text
AI 학습 차단    사용
AI 학습 차단    꺼짐
AI 학습 차단    —
```

This row reports current account setting truth only.

It does **not** claim:

- that a particular historical request was routed under the policy;
- that every provider has identical retention terms;
- Zero Data Retention;
- LLMGateway payload-storage configuration;
- request-level provider compliance provenance.

## 4. Official upstream source authority

Official upstream source proof was read at commit:

`72c3c18096eeafcf1ce80e80763432553b9fe849`

### 4.1 `/dev-plans/status` contract

The upstream `GET /dev-plans/status` response schema explicitly includes:

```text
blockApiTraining: boolean
providerCacheControlMode: <separate enum>
```

For the active personal DevPass organization, the handler returns `blockApiTraining` from the effective organization compliance policy:

```text
providerCompliancePolicy.enabled === true
&& providerCompliancePolicy.blockApiTraining === true
```

The endpoint returns a concrete boolean rather than requiring the client to inspect or reconstruct the raw policy object.

### 4.2 DevPass write semantics

The upstream DevPass settings write owner accepts a `blockApiTraining` boolean. When enabled, it stores the DevPass requirement as an enabled policy with `blockApiTraining: true`; when disabled, it clears that DevPass-only policy unless other policy state must be preserved.

The organization API separately constrains DevPass compliance writes so DevPass accepts only the No-API-training requirement rather than the wider enterprise compliance policy surface.

### 4.3 What 5.101 consumes

5.101 consumes **only** the resolved `/dev-plans/status.blockApiTraining` boolean.

It does not expose or retain the raw `providerCompliancePolicy` object merely to implement this feature.

## 5. Existing Local Usage Dashboard capture authority

Current Engine account capture already performs the authenticated DevPass status request as part of the existing `orgs list --json` capture session.

Relevant owners:

- `runtime-src/bridge-engine/30-cli-runtime.part.mjs`
  - capture tap;
  - `sanitizeStatus()`;
  - existing `/dev-plans/status` capture;
- `runtime-src/bridge-engine/40-sources.part.mjs`
  - `loadAccountCapture()`;
  - `loadDevPassStatus()`;
  - `normalizeIndependentDevPassStatus()`.

The current sanitizer already retains established status fields for billing, Premium allowance, Reset Pass, service tier, routing, PAYG and Auto-Reload. It does not yet retain `blockApiTraining`.

5.101 therefore changes the existing owner only:

1. add `blockApiTraining` to the safe status allowlist;
2. normalize it through strict explicit-boolean handling;
3. expose one bounded normalized field on the existing DevPass account snapshot;
4. consume that field in Plugin UI and Diagnostics.

No second compliance-policy loader is allowed.

## 6. Truth and UNKNOWN contract

The normalized state is tri-state:

| Source observation | Normalized truth | UI |
| --- | --- | --- |
| exact boolean `true` | `enabled` | `사용` |
| exact boolean `false` | `disabled` | `꺼짐` |
| missing/null/non-boolean/unavailable status | `unknown` | `—` |

Rules:

1. exact `false` is authoritative OFF and must not become UNKNOWN;
2. missing is not false;
3. malformed values are not truthy/falsy-coerced;
4. unavailable capture/status is UNKNOWN;
5. UNKNOWN is never synthesized into a disabled state;
6. persisted/stale Plugin state must not invent a known value when the current authoritative status observation is unavailable under the existing account-capture no-stale policy;
7. no value is derived from `hasPersonalOrg`, plan tier, routing strategy, service tier, Premium allowance, PAYG state, model/provider, request outcome, HTTP status or cache telemetry.

## 7. Forbidden inference

The following are explicitly forbidden as No-AI-Training truth:

- provider/model catalogue `noTraining` capability alone;
- the public models `no_training` query;
- a model being selectable or successfully routed;
- a request succeeding or failing;
- a provider/model name;
- DevPass plan name;
- service tier or routing strategy;
- account age/spend;
- model lifecycle status;
- observed cache behavior;
- absence of an error.

The account setting is only the explicit status boolean.

## 8. UI ownership

Current `src/50-dashboard-context.part.js` renders the `DevPass account` detail box with:

- Plan;
- Cycle;
- Status;
- Service tier;
- Routing;
- Pending tier;
- Personal org;
- Billing history.

5.101 adds exactly one mini row to that existing box:

```text
AI 학습 차단    사용 | 꺼짐 | —
```

Recommended placement: immediately after `Routing`, because the value is a current routing-policy constraint rather than billing/allowance data.

No new:

- top-level tab;
- Overview card;
- modal;
- settings editor;
- toggle;
- history list;
- floating widget field.

The row is read-only.

## 9. Explanatory wording boundary

Any explanatory copy must distinguish this source-backed setting from broader privacy claims.

Allowed meaning:

> 현재 DevPass의 No AI training 라우팅 설정 상태.

Forbidden meaning:

> 모든 요청/제공자가 데이터를 절대 저장하지 않음.

The feature must not collapse training policy, data retention, gateway payload storage, ZDR, or provider logging into one claim.

## 10. Diagnostics

Add one bounded diagnostic line.

Known examples:

```text
DevPass no-AI-training: enabled · source /dev-plans/status.blockApiTraining
DevPass no-AI-training: disabled · source /dev-plans/status.blockApiTraining
```

UNKNOWN:

```text
DevPass no-AI-training: unknown · source unavailable
```

Diagnostics may include the normalized state and source label only.

Forbidden diagnostic material:

- raw `providerCompliancePolicy` JSON;
- organization/project/account IDs;
- auth/session/cookies;
- provider allow/deny lists;
- prompts or responses;
- routing attempts;
- request bodies;
- private account metadata unrelated to the feature.

## 11. I/O and lifecycle budget

5.101 adds **zero healthy-path I/O**.

Forbidden additions:

- another `/dev-plans/status` call;
- `/orgs/{id}` just for policy state;
- a compliance endpoint call;
- another CLI command;
- polling;
- timers;
- interval/background watcher;
- a new cache family;
- a new persisted settings/history store;
- package/network fetches.

The feature reuses the existing status capture and existing refresh lifecycle.

## 12. Contract and identity boundary

The feature is account-level snapshot enrichment.

Candidate contract impact:

- snapshot contract remains `1`;
- recent-request contract remains `1`;
- request ledger row schema does not need lifecycle or policy changes for this feature;
- request dedupe identity remains byte/semantic unchanged;
- no request row should gain a historical `blockApiTraining` attribution.

If implementation evidence shows a contract bump is actually required, stop and redesign instead of silently widening 5.101.

## 13. Candidate release identity

Subject to mandatory implementation-time readback:

- Product `3.0.0-alpha.5.101`;
- Engine `1.6.36` — tentative, because Engine capture/normalization behavior changes;
- Manager `1.3.6` — semantic behavior tentatively unchanged;
- CLI `1.10.0`;
- Models `1.280.0`;
- contracts `1/1`;
- focused regression `P67` — tentative reservation, fresh-check required.

Manager bytes may change only as required by normal embedded Product/Engine target materialization. A Manager semantic bump is not authorized by this design.

## 14. Release evidence baseline

If production remains accepted 5.100 when implementation starts, structured release evidence should use the accepted 5.100 physical baseline:

- Product `3.0.0-alpha.5.100`;
- production SHA `478fcd368734b1cf1aa5a98932cb34bb29f1d1e4`;
- feature/physical issue `1540`;
- physical comment `5553562006`;
- release request `1549`;
- release acceptance comment `5553562775`;
- verdict `accepted`.

These values are not permanent constants. Fresh-read production and canonical physical evidence immediately before implementation.

## 15. P67 focused regression contract

P67 should lock at least:

1. 5.100 accepted physical baseline;
2. monotonic candidate ordering to 5.101;
3. official `/dev-plans/status.blockApiTraining` source authority;
4. same existing account-capture/status owner;
5. no new CLI/network/poller/cache family;
6. exact boolean true => enabled;
7. exact boolean false => disabled;
8. missing => UNKNOWN;
9. null => UNKNOWN;
10. non-boolean => UNKNOWN;
11. no truthy/falsy coercion;
12. no raw policy object exposure merely for this feature;
13. no provider/model/catalog `noTraining` inference;
14. no request-level historical attribution;
15. UI row lives in existing DevPass account box;
16. Diagnostics source qualification remains bounded;
17. request identity/dedupe unchanged;
18. PAYG/Auto-Reload remains unchanged;
19. service-tier/routing/billing/Premium/Reset Pass remains unchanged;
20. 5.99 daily server UNKNOWN/fail-closed behavior remains unchanged;
21. 5.100 model lifecycle/category fidelity remains unchanged;
22. P65/P66 remain GREEN;
23. applicable E18-E22 release-control contracts remain GREEN;
24. full discovered Usage Dashboard registry GREEN;
25. deterministic materialization GREEN;
26. second-pass materialization idempotence GREEN.

Do not freeze a registry-count integer in this design.

## 16. Physical acceptance

After deployment the user should only need to:

1. press the normal PocketRisu `+` update;
2. open the DevPass page;
3. capture the `DevPass account` section showing `AI 학습 차단`;
4. copy compact or full Diagnostics.

No policy toggle is required.
No artificial request is required.
No deprecated model or special provider is required.
No paid traffic is required.

Accept when:

- installed Product/Engine/Manager/CLI/Models tuple equals promoted 5.101 authority;
- Stable readiness is READY;
- Health is ok;
- active errors are 0;
- failures are 0;
- UI row and Diagnostics agree;
- explicit ON/OFF only appears from the status source;
- source unavailable remains `—`/unknown;
- no new CLI operation/network family appears attributable to 5.101;
- 5.100 model lifecycle/category surfaces remain healthy;
- 5.99 daily server fail-closed behavior remains healthy;
- billing/PAYG/cache/tier/outcome/request scope surfaces remain healthy.

A natural explicit `꺼짐` is a valid acceptance result. The user must not be asked to enable No AI training just to manufacture an ON screenshot.

## 17. Non-goals

5.101 does not include:

- No-AI-Training mutation/toggle;
- provider compliance editor;
- provider-by-provider training policy list;
- request-level training-policy provenance;
- request blocking or routing changes;
- model filtering UI;
- Zero Data Retention status;
- payload-retention status;
- provider logging policy;
- `providerCacheControlMode` presentation;
- API-key limit headroom;
- organization trust-tier/gateway-limit presentation;
- Dynamic Route trace;
- new I/O or persistence.

## 18. Separate next candidate

The source proof also confirmed `providerCacheControlMode` is returned by the same `/dev-plans/status` response. That is useful because the dashboard already presents cache Read/Write/TTL observability.

It is intentionally not bundled into 5.101. After 5.101 is accepted, `V-CACHE-POLICY-MODE` can be considered as a separate bounded next-version design using the same evidence-first process.

## 19. Stop conditions before implementation

Stop and redesign if fresh implementation readback finds any of the following:

- production is no longer accepted 5.100;
- 5.101 authority already exists elsewhere;
- P67 is occupied;
- `/dev-plans/status.blockApiTraining` semantics changed;
- the current Engine no longer obtains the source through existing account capture;
- new I/O becomes required;
- source boolean no longer distinguishes a known OFF state;
- Manager semantic behavior must change;
- snapshot/recent-request contract bump is required;
- a new privacy-sensitive policy object would need to be persisted.

Otherwise implementation may proceed as the minimal Engine + Plugin additive feature frozen here.
