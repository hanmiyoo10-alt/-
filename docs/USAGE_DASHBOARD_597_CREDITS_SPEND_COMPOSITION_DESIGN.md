# Local Usage Dashboard 5.97 — Credits Spend Composition Source Fidelity Design

Status: **DESIGN FROZEN — IMPLEMENTATION NOT STARTED**

Canonical feature authority: #960  
Canonical sequencing index: #412  
Target product area: `plugins/usage-dashboard/`  
Production branch: `release-usage-dashboard`

## 1. Fresh release authority

Fresh production/main authority was rechecked before freezing this design.

Current production tuple:

- Product `3.0.0-alpha.5.96`
- Engine `1.6.32`
- Engine SHA-256 `5854cfba456b39ae5dc216e049556198cb6d63b9547ddc1b77fad301529f4674`
- Manager semantic `1.3.5`
- Manager Product identity `3.0.0-alpha.5.96`
- Manager SHA-256 `463c07d065a1b0a6a5bbe46721673447bc9e6b9af1243dbeca36ac2db846dcb1`
- managed CLI `@llmgateway/cli@1.10.0`
- managed Models catalog `@llmgateway/models@1.251.0`
- contracts `snapshot 1 / recent-request 1`
- bootstrap SHA-256 `4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c`
- physical verdict: `5.96 PASS_PHYSICAL`

There is no real `.github/usage-dashboard/releases/5.97.json` at design time. A generic `5.97` fixture inside release-control regression is not Product release authority.

P63 has no current Usage Dashboard regression file at design time. It is reserved only if still free immediately before implementation.

E20 structured release evidence is already implemented byte-neutrally. Therefore the next legitimate forward Product release must be its first live proof.

## 2. Why #960 is narrowed instead of implemented as originally imagined

The old `V-CREDITS-COST` backlog wording suggested a broad Credits-only breakdown covering input/output/cache/storage/other costs and savings.

Fresh upstream source proves that this broad interpretation is not source-safe.

### Upstream `/activity` source fields

Current upstream `DailyActivity` exposes, among other fields:

- `cost`
- `inputCost`
- `outputCost`
- `requestCost`
- `dataStorageCost`
- media/cache component costs
- `discountSavings`
- `creditsCost`
- `apiKeysCost`
- `creditsDataStorageCost`
- `apiKeysDataStorageCost`

### Upstream billing-mode semantics

Current upstream `applyUsageModeToDaily()` explicitly mode-splits only:

- `cost` via `creditsCost` / `apiKeysCost`;
- `requestCount` via credits/API-key request counts;
- `dataStorageCost` via `creditsDataStorageCost` / `apiKeysDataStorageCost`;
- nested breakdown cost/request-count rows.

The same source explicitly states that token/cache/error measures remain blended. It does **not** provide Credits-only replacements for `inputCost`, `outputCost`, `requestCost`, `cachedInputCost`, `cacheWriteInputCost`, media component costs, or `discountSavings`.

The upstream dashboard also computes headline spend as selected-mode `cost + dataStorageCost`, with storage billed on top of the selected usage cost.

Therefore Local Usage Dashboard may safely prove exactly two Credits spend components from the current public source:

1. Credits usage cost — `creditsCost`;
2. Credits data-storage cost — `creditsDataStorageCost`.

It may derive total Credits spend only from those two explicit components.

A Credits-only input/output/cache/media cost breakdown or Credits-only discount savings is **not proven** by the current source and remains out of scope/UNKNOWN.

## 3. Current Local Usage Dashboard source finding

The existing capture tap already allowlists both required source fields:

- `creditsCost`
- `creditsDataStorageCost`

No capture expansion or extra `/activity` request is required.

However the current normalized Engine path is not sufficient for the new truth surface:

- generic `usageMetricValues()` currently folds missing `creditsCost` through a zero-default metric path;
- `creditsDataStorageCost` is captured but is not currently promoted into the public normalized usage/analytics object;
- the bounded daily series currently retains request/token fields for the cycle-summary contract, not the Credits spend pair.

The 5.97 feature must therefore add a **separate nullable source-fidelity projection** rather than changing existing aggregate metric semantics in place.

## 4. Primary goal

Ship one bounded **24h Credits Spend Composition** surface that answers only:

- how much explicit Credits usage cost is reported;
- how much explicit Credits data-storage cost is reported;
- what the total is when both are known.

This is a source-fidelity feature, not a price reconstruction or generic cost-accounting redesign.

## 5. Candidate release tuple

Subject to one final fresh implementation-time authority check:

- Product `3.0.0-alpha.5.97`
- Engine `1.6.33`
- Manager semantic `1.3.5` unchanged
- Manager Product identity `3.0.0-alpha.5.97`
- managed CLI `@llmgateway/cli@1.10.0` unchanged
- managed Models `@llmgateway/models@1.251.0` unchanged
- contracts `snapshot 1 / recent-request 1`
- bootstrap exact-byte unchanged

Why Engine `1.6.33`: a new additive normalized source-fidelity object must preserve explicit/missing Credits spend fields without inheriting the old zero-default aggregate semantics.

Why Manager semantic remains `1.3.5`: Manager provisioning/runtime semantics do not change. Its built artifact still changes for Product identity 5.97 and bundled Engine 1.6.33 binding/hash materialization.

## 6. Engine truth contract

### 6.1 New disjoint nullable projection

Add a bounded normalized object conceptually equivalent to:

```js
creditsSpendComposition: {
  window: '24h',
  usageCost: number | null,
  dataStorageCost: number | null,
  totalSpend: number | null,
  usageCostSource: 'activity.creditsCost' | 'unknown',
  dataStorageCostSource: 'activity.creditsDataStorageCost' | 'unknown',
  complete: boolean
}
```

Exact field naming may be adjusted during implementation for local style, but the ownership and semantics above are frozen.

Do not repurpose the existing generic `creditsCost` metric as the new truth owner.

### 6.2 Explicit component qualification

For each official source bucket participating in the 24h window:

- accept an own-property numeric finite value `>= 0` as explicit;
- explicit `0` remains known zero;
- missing/null/non-numeric/non-finite/negative is UNKNOWN for that bucket/component.

A whole-window component total is known only when the selected official source rows provide an explicit valid value for that component across the complete selected bucket set.

Do not partially sum known buckets and present the result as a complete 24h component.

No rows / unavailable source => component UNKNOWN.

### 6.3 Allowed derivation

`totalSpend = usageCost + dataStorageCost`

only when **both** whole-window components are known.

If either component is UNKNOWN, total is UNKNOWN.

Optional shares may be derived only when both components are known and `totalSpend > 0`:

- usage share = usageCost / totalSpend;
- storage share = dataStorageCost / totalSpend.

If total is explicit zero, shares remain `—` rather than synthetic `0%` or `50/50`.

### 6.4 Forbidden derivation

Never derive Credits-specific values from:

- `totalCost - known component`;
- generic `inputCost`, `outputCost`, `requestCost`;
- `cachedInputCost`, `cacheWriteInputCost`;
- image/audio/video cost fields;
- `discountSavings`;
- provider/model catalog prices;
- token counts multiplied by prices;
- observed request costs from `/logs`;
- DevPass/PAYG account state;
- model category or service tier.

Those fields are not current Credits-mode component authority.

## 7. Plugin/UI scope

No new top-level tab and no second analytics system.

Preferred placement: existing Analytics surface, visible as a compact bounded card when the `Credits` scope is selected.

Title:

`Credits 비용 구성 · 24h`

Rows:

- `사용 비용` — exact source-backed `creditsCost` aggregate or `—`;
- `데이터 보관` — exact source-backed `creditsDataStorageCost` aggregate or `—`;
- `총 비용` — exact allowed sum only when both are known;
- optional compact split/share only when denominator is valid.

The card must not display a Credits-specific Savings value in 5.97.

The existing Analytics `24h 비용`, Top Model, Top Provider, 7d/30d totals remain unchanged and continue to own their current semantics.

Do not relabel blended input/output/cache figures as Credits-only.

## 8. Diagnostics

Add one bounded source-fidelity line based on the same normalized object, for example:

```text
Credits spend composition: window 24h · usage $0.0084 · storage $0.0000 · total $0.0084 · complete yes · source activity.creditsCost + activity.creditsDataStorageCost
```

Unknown example:

```text
Credits spend composition: window 24h · usage — · storage $0.0000 · total — · complete no
```

Do not dump raw activity rows or unrelated account/project identifiers.

Diagnostics must make it possible to distinguish explicit zero from UNKNOWN.

## 9. Privacy / I/O / ownership boundary

5.97 must reuse the existing authenticated activity capture and normal refresh ownership.

Forbidden additions:

- no new HTTP endpoint;
- no additional `/activity` call solely for the card;
- no `/logs` call for cost reconstruction;
- no new CLI invocation;
- no model-catalog pricing lookup;
- no timer/poller/background owner;
- no new persistence cycle;
- no billing/payment endpoint;
- no raw billing/auth/log payload expansion.

Retain only the bounded derived nullable component values/source labels needed for the UI/Diagnostics.

## 10. E20 first-live-proof requirement

5.97 is the first legitimate forward Product release after E20 maintenance, so its release spec must use the new structured evidence contract.

At source freeze, if 5.96 remains the latest accepted/installed production baseline, the release spec evidence must identify that exact prior release in both roles:

```json
{
  "releaseEvidence": {
    "schemaVersion": 1,
    "acceptedBaseline": {
      "productVersion": "3.0.0-alpha.5.96",
      "releaseSha": "5fc75fbc0725962997f65de17db4ffaf156ba6f9",
      "verdict": "accepted",
      "issue": 1017
    },
    "latestInstalled": {
      "productVersion": "3.0.0-alpha.5.96",
      "releaseSha": "5fc75fbc0725962997f65de17db4ffaf156ba6f9",
      "verdict": "accepted",
      "issue": 1017
    }
  }
}
```

These identities must be fresh-checked immediately before implementation. Do not copy this block blindly if production moves.

Future 5.97 spec must not also own independent `verifiedBaseline` / `latestInstalledEvidence` prose fields.

## 11. Materialization boundary

The 5.97 materializer must fail closed unless the exact then-current 5.96 baseline remains present.

Baseline locks if unchanged:

- Product `5.96`;
- Engine `1.6.32` + exact Engine SHA;
- Manager `1.3.5` + exact Manager SHA;
- CLI `1.10.0`;
- Models `1.251.0`;
- contracts `1/1`;
- exact bootstrap SHA.

Materialize only:

1. Product/Plugin `5.96 -> 5.97`;
2. Engine `1.6.32 -> 1.6.33`;
3. new nullable Credits spend composition normalization from the already captured fields;
4. compact Analytics Credits card + bounded Diagnostics;
5. Manager Product identity 5.97 + bundled Engine 1.6.33/hash binding, with Manager semantic 1.3.5 unchanged;
6. manifest hashes/identity parity;
7. 5.97 release spec/notes using E20 structured evidence.

Preserve all existing generic aggregate metrics and current source semantics outside the new disjoint projection.

## 12. Regression reservation

Reserve **P63 — Credits Spend Composition Source Fidelity** if still free immediately before implementation.

P63 must at minimum lock:

1. tuple `5.97 / Engine 1.6.33 / Manager 1.3.5 / CLI 1.10.0 / Models 1.251.0 / contracts 1/1`;
2. capture already contains `creditsCost` + `creditsDataStorageCost`, with no capture/I/O expansion;
3. new truth owner is separate from generic zero-default `creditsCost` aggregation;
4. explicit finite nonnegative usage/storage values survive exactly;
5. explicit zero remains known zero;
6. missing/invalid component remains null/UNKNOWN, never 0;
7. incomplete bucket coverage cannot be presented as complete 24h total;
8. total is computed only when both components are known;
9. shares exist only with complete positive denominator;
10. `inputCost`, `outputCost`, `requestCost`, cached/media component costs and `discountSavings` cannot populate Credits-specific components;
11. provider/model/token-price reconstruction is forbidden;
12. no request-level PAYG/funding inference;
13. UI and Diagnostics consume the same normalized truth object;
14. existing Analytics totals/Cost Drivers remain unchanged;
15. P57 Premium, P58 PAYG, P59 cycle summary, P60 cost drivers, P61 historical model-category, P62 managed runtime diagnostic identity remain GREEN/applicable as defined;
16. E20 structured `releaseEvidence` is required and legacy dual-prose ownership is absent from the forward 5.97 spec;
17. Engine/Manager deterministic build + manifest hash parity;
18. Manager semantic/CLI/Models pins unchanged;
19. bootstrap exact-byte preserved;
20. no new HTTP/CLI/timer/poller/cache/persist/listener/scheduler owner;
21. full Usage Dashboard registry GREEN.

## 13. Physical acceptance after deployment

The user action remains one normal PocketRisu `+` update and normal UI/Diagnostics capture. No shell and no artificial/chargeable traffic.

Accept when the same installed release shows:

- Product `3.0.0-alpha.5.97`;
- Engine `1.6.33`;
- Manager `1.3.5`;
- CLI `1.10.0`;
- Models `1.251.0`;
- READY / Health ok / active errors `0` / failures `0`;
- Analytics `Credits` scope shows the new 24h Credits spend composition card;
- card usage/storage/total values exactly match Diagnostics;
- an unavailable component remains `—` and does not become zero;
- explicit zero remains visibly known zero;
- no Credits-only savings/input/output/cache/media claim appears;
- current Analytics totals, Cost Drivers, Premium, PAYG, Billing/Cycle, request fidelity, model category, tier and HTTP behavior remain unchanged;
- no unexpected extra CLI/network/refresh work attributable to this feature.

If the natural source omits one component, an incomplete/UNKNOWN card is a valid acceptance outcome. Do not generate paid traffic or modify billing settings merely to force a positive component.

## 14. Non-goals

Do not bundle into 5.97:

- Credits-only input/output/cache/media cost breakdown;
- Credits-only `discountSavings` unless a future explicit scoped source appears;
- #756 model-name enrichment latency repair;
- memory-system features;
- billing history/invoices;
- transaction/top-up/Reset Pass/Auto-Reload writes;
- runtime fallback/lifecycle cleanup;
- CLI or Models upgrade;
- service-tier/model-category redesign;
- new charts/databases/export systems;
- DevPass request-funding provenance.

## 15. Frozen verdict

**5.97 DESIGN FROZEN — Source-backed Credits Spend Composition Fidelity.**

The old broad `V-CREDITS-COST` concept is narrowed to the exact source-proven Credits split: `creditsCost + creditsDataStorageCost`. Unscoped cost components and savings remain UNKNOWN/out of scope rather than being guessed.

Implementation is intentionally not started by this design record.