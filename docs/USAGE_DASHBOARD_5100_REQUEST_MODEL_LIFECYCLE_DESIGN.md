# Local Usage Dashboard 5.100 — Request Model Lifecycle Fidelity Design

Date: 2026-09-05 KST  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Primary feature authority: #1540  
Upstream discovery authority: #1494 (`V-MODEL-LIFECYCLE-STATUS`)

## 1. Fresh authority

Design source readback:

- repository: `hanmiyoo10-alt/-`;
- main used to create the design branch: `c3bd586bbbf7567bbff0bd5bd560472e1bd279dd`;
- production branch: `release-usage-dashboard`;
- production SHA: `91c3d11d6aa7d5299b701ff94956a230a07d4be2`;
- Product: `3.0.0-alpha.5.99`;
- Engine: `1.6.34`;
- Manager: `1.3.6`;
- managed CLI: `1.10.0`;
- managed Models: `1.280.0`;
- contracts: snapshot `1` / recent-request `1`;
- 5.99 actual-device verdict: `PASS_PHYSICAL`, #1487 comment `5552058215`.

`plugins/usage-dashboard/tools/release_version_order.cjs` orders alpha versions by numeric `(series, iteration)` and `nextForwardFixture(3.0.0-alpha.5.99)` yields `3.0.0-alpha.5.100`. Therefore 5.100 is the next candidate identifier; this is not an alpha-series rollover to `6.0`.

All mutable authority must be re-read immediately before implementation.

## 2. Why this feature is next

The upstream feature scan on #1494 produced several candidates. Gateway Limits/headroom, key-limit gauges, cache policy and no-training status still require additional authenticated-source proof or new I/O design.

Model lifecycle is different: the currently installed, pinned `@llmgateway/models 1.280.0` already contains the exact provider-mapping retirement metadata needed for a useful read-only feature. It reuses the same managed catalog load that already powers request model-category fidelity.

This makes 5.100 a bounded source-backed feature rather than an endpoint-expansion release.

## 3. Primary goal

For each recent request with an exact served model/provider mapping, show the current lifecycle state of that exact mapping:

```text
모델 상태 ACTIVE
모델 상태 종료 예정 · 2026-09-20
모델 상태 DEPRECATED
모델 상태 DEACTIVATED
모델 상태 —
```

The feature belongs in the existing Request Ledger / recent-request detail metadata and Diagnostics. It does not add an Overview card, top-level tab, chart, modal, setting or history store.

The lifecycle label is observational only. It never changes routing, retries, model choice or request execution.

## 4. Exact pinned upstream source authority

The 5.99 release spec pins managed Models `1.280.0` to upstream commit:

```text
fbb40efa41c379db5223dff708509b6dd82e05a9
```

At that exact commit, `packages/models/src/models.ts` defines on `ProviderModelMapping`:

```text
deprecatedAt?: Date
deactivatedAt?: Date
```

with source semantics:

- `deprecatedAt`: mapping is deprecated while still usable / excluded from normal selection behavior;
- `deactivatedAt`: mapping is deactivated after that point and should no longer be used.

The same pinned commit's `packages/shared/src/deactivation.ts` defines:

```text
active
scheduled
deprecated
deactivated
```

and freezes these rules:

1. elapsed `deactivatedAt` => `deactivated`;
2. future `deactivatedAt` within the Models Directory 90-day notice window => `scheduled`;
3. otherwise explicit `deprecatedAt` => `deprecated`;
4. otherwise => `active`.

Precedence is:

```text
deactivated > scheduled > deprecated > active
```

The Local Usage Dashboard may reproduce this bounded pure rule for the pinned catalog contract. It must not invent another lifecycle taxonomy.

## 5. Current local owner

`plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs` already:

- resolves the managed CLI runtime;
- verifies the exact expected model-catalog version;
- imports the installed `@llmgateway/models` entry;
- validates `models[]`;
- builds a catalog-backed model classification map;
- enriches normalized captured recent logs;
- exposes model-catalog state/version in runtime Diagnostics.

5.100 must extend this existing owner. It must not create a second catalog loader, package resolver, poller or package-fetch loop.

## 6. Exact model/provider mapping rule

Lifecycle is **served mapping truth**, not a model-name guess and not an all-provider aggregate.

For each captured recent request:

1. use the existing request model normalization already trusted for model-category exact membership;
2. require exact normalized `model.id` membership in pinned `models[]`;
3. take the request's explicit served provider from the existing captured `usedProvider`/equivalent normalized row;
4. require an exact provider-id match against that model's `providers[]` mappings;
5. select only an unambiguous mapping;
6. derive lifecycle only from that exact mapping's `deprecatedAt` / `deactivatedAt`.

Forbidden:

- provider alias tables invented by the plugin;
- choosing another provider mapping when the served provider does not match;
- deriving status from model name, price, category, request failure, HTTP code, service tier, account scope, request age or routing result;
- collapsing all provider mappings into one model-level status for a provider-specific request.

If region-specific provider mappings create an ambiguity and the request row does not carry enough exact region identity, status is UNKNOWN rather than guessed.

## 7. Lifecycle truth shape

The Engine should enrich recent request rows with a bounded optional truth shape. Exact property names may follow existing conventions, but conceptually:

```text
modelLifecycleStatus: active | scheduled | deprecated | deactivated | unknown
modelLifecycleSource: llmgateway-model-catalog | unknown
modelLifecycleDeprecatedAt: ISO timestamp/date | null
modelLifecycleDeactivatedAt: ISO timestamp/date | null
```

An evaluation timestamp may be exposed only if tests/diagnostics need it; it is not required as request identity.

Date serialization must be deterministic. Invalid Date values become UNKNOWN/null rather than strings such as `Invalid Date`.

## 8. Time semantics

5.100 presents **current mapping lifecycle at catalog evaluation/refresh time**.

It does not answer “what was this mapping's status when the historical request happened?” and must not backdate status using the request timestamp.

The Engine refresh already re-enriches captured recent rows. Therefore status can naturally progress from active → scheduled → deactivated as time advances without adding a lifecycle timer.

No countdown is required. For `scheduled`, display the exact source deactivation calendar date when valid. Avoid derived `D-N` text because wall-clock/timezone presentation would add unnecessary semantics.

## 9. UNKNOWN / stale behavior

UNKNOWN is first-class:

- managed catalog unavailable => UNKNOWN;
- catalog version mismatch => UNKNOWN;
- model missing => UNKNOWN;
- served provider missing => UNKNOWN;
- provider mapping missing => UNKNOWN;
- provider mapping ambiguous => UNKNOWN;
- invalid lifecycle date => UNKNOWN for the affected lifecycle truth rather than coercion.

An incoming UNKNOWN must not be replaced with an older persisted known lifecycle merely to improve coverage. Lifecycle is time-varying current catalog truth; retaining stale known state can be worse than showing UNKNOWN.

This differs intentionally from stable model-category preference rules.

## 10. Request identity boundary

Lifecycle fields are metadata only.

They must not be added to:

- `requestLedgerKey()`;
- request-id generation;
- timestamp fidelity;
- scope identity;
- request dedupe keys;
- recent-request contract identity.

A lifecycle transition for the same request must update metadata, not create a duplicate request row.

## 11. Plugin normalization ownership

`plugins/usage-dashboard/src/15-request-provenance.part.js` should own bounded lifecycle value/source validation and presentation/stat helpers next to existing model-category provenance helpers.

Recommended helpers conceptually:

```text
requestModelLifecycleValue()
requestModelLifecycleSourceValue()
requestModelLifecycleText()
requestModelLifecycleStats()
```

`plugins/usage-dashboard/src/14-request-ledger.part.js` should:

- copy/validate lifecycle metadata from Engine rows;
- keep request identity unchanged;
- include lifecycle text in the existing `usageText` metadata list;
- preserve existing model-category / HTTP / cost / tokens / tier / duration / cache fields.

Do not create a second lifecycle truth owner in markup-only code.

## 12. Frozen UI wording

Detailed recent-request metadata uses:

```text
모델 상태 ACTIVE
모델 상태 종료 예정 · YYYY-MM-DD
모델 상태 DEPRECATED
모델 상태 DEACTIVATED
모델 상태 —
```

Rules:

- `ACTIVE`: muted/neutral styling;
- `종료 예정`: existing warning/accent family;
- `DEPRECATED`: warning/accent family;
- `DEACTIVATED`: existing error family;
- `—`: neutral UNKNOWN styling;
- no new color system;
- do not omit the lifecycle field merely because status is UNKNOWN in detailed metadata.

The compact row topology and mobile wrapping must remain intact.

## 13. Diagnostics

Add one bounded fidelity line beside existing model-category catalog/fidelity diagnostics:

```text
Model lifecycle fidelity: Active 6 · Scheduled 0 · Deprecated 0 · Deactivated 0 · Unknown 0 · source llmgateway-model-catalog
```

If no request has source-backed lifecycle truth:

```text
Model lifecycle fidelity: Active 0 · Scheduled 0 · Deprecated 0 · Deactivated 0 · Unknown 6 · source unknown
```

Diagnostics may include the pinned catalog version through the already-existing model-catalog identity line. Do not duplicate package identity ownership.

Diagnostics must not expose:

- prompts/responses;
- API keys/tokens;
- raw organization/project ids;
- whole raw model catalog records;
- arbitrary provider configuration.

## 14. No new I/O

5.100 must not add:

- Gateway API endpoint calls;
- CLI invocations;
- GitHub/upstream network fetches at runtime;
- model-catalog package installation loops;
- timers/pollers/listeners;
- persistence databases;
- new cache families.

The existing `ensureModelCategoryCatalog()` managed package load is the only allowed catalog acquisition owner.

A good implementation may rename/generalize internal model-category variables to model-catalog variables if necessary, but must preserve one load/promise/status owner and existing behavior.

## 15. Engine / Manager boundary

Because the Engine will enrich recent-request rows with new catalog-derived metadata, Engine behavior changes and therefore the tentative candidate is:

```text
Engine 1.6.35
```

Manager lifecycle/protocol semantics do not need to change. Tentatively retain:

```text
Manager 1.3.6
```

The manager artifact may still receive normal materialized Product identity and bundled Engine version/SHA target changes. That alone does not create a Manager semantic feature.

If fresh implementation evidence shows manager logic itself must change, stop and redesign/bump appropriately.

## 16. Contract boundary

Lifecycle metadata is additive optional recent-request enrichment, following prior request-category/tier/duration/status enrichment precedent.

Tentative contracts stay:

```text
snapshot 1
recent-request 1
```

If implementation requires making lifecycle fields mandatory, changing request identity, or changing the structural compatibility contract, this design is invalid and must be revised before coding.

## 17. Expected intentional implementation files

Fresh implementation may refine exact paths, but the intended bounded map is:

1. `plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs` — catalog mapping index + lifecycle enrichment;
2. generated `plugins/usage-dashboard/runtime/bridge-engine.mjs` — deterministic Engine materialization;
3. `plugins/usage-dashboard/src/15-request-provenance.part.js` — lifecycle normalization/text/stats;
4. `plugins/usage-dashboard/src/14-request-ledger.part.js` — row binding/render metadata while preserving identity;
5. `plugins/usage-dashboard/src/40-diagnostics.part.js` — lifecycle fidelity diagnostics;
6. version/core/manifest/manager target bytes required by ordinary Product + Engine materialization;
7. `.github/usage-dashboard/releases/5.100.json` — future release spec;
8. one deterministic 5.100 materializer;
9. `plugins/usage-dashboard/tests/p66-request-model-lifecycle-fidelity.cjs` if P66 remains free.

Explicit non-targets:

- Bridge source/capture I/O architecture;
- request capture tap protocol;
- scheduler/cache/lifecycle ownership;
- Overview daily server truth modules;
- billing/PAYG/Premium/Cycle/Cost Driver calculations;
- model routing.

## 18. P66 focused regression freeze

P66 must prove at least:

1. Product 5.100 is monotonic after accepted 5.99;
2. accepted/latest-installed release evidence points to real 5.99 physical acceptance if still current;
3. Models `1.280.0` exact authority remains pinned;
4. pinned `ProviderModelMapping` lifecycle fields are the only metadata source;
5. lifecycle values are exactly `active/scheduled/deprecated/deactivated/unknown`;
6. `deactivated > scheduled > deprecated > active` precedence;
7. 90-day scheduled-deactivation notice semantics match the pinned upstream contract;
8. elapsed deactivation is `deactivated`;
9. far-future deactivation without deprecation remains `active`;
10. explicit deprecation is `deprecated` unless a more urgent state wins;
11. invalid date / missing model / missing provider / missing mapping / ambiguity => UNKNOWN;
12. exact model membership + exact served-provider mapping are required;
13. no provider alias/name/price/failure/status-code inference;
14. lifecycle source is `llmgateway-model-catalog` only when exact mapping truth is known;
15. incoming UNKNOWN cannot be silently replaced with stale persisted known lifecycle truth;
16. lifecycle fields do not participate in `requestLedgerKey()` or request identity;
17. lifecycle transition does not duplicate a row;
18. model-category Premium/Regular/Unknown semantics stay unchanged;
19. existing HTTP/tier/cache/duration/outcome/account-scope fidelity stays unchanged;
20. no new CLI/network/package-fetch/timer/poller/cache family;
21. P64 and P65 stay GREEN;
22. E18/E19/E20/E21 stay GREEN;
23. full discovered Usage Dashboard registry stays GREEN;
24. deterministic source/runtime materialization and second-pass idempotence stay GREEN.

Do not hard-code the future full-registry count.

## 19. Candidate release identity

Subject to implementation-time fresh authority:

- Product: `3.0.0-alpha.5.100`;
- release title: **Request Model Lifecycle Fidelity**;
- Engine: `1.6.35` tentative behavior bump;
- Manager: `1.3.6` tentative semantic unchanged;
- managed CLI: `1.10.0`;
- managed Models: `1.280.0`;
- snapshot contract: `1`;
- recent-request contract: `1`;
- bootstrap: unchanged;
- focused regression: P66 if still free.

## 20. Structured release evidence

If implementation starts while accepted production remains 5.99, the 5.100 release spec should use both E20 roles from real physical evidence:

```text
acceptedBaseline:
  Product 3.0.0-alpha.5.99
  release 91c3d11d6aa7d5299b701ff94956a230a07d4be2
  issue 1487
  comment 5552058215
  verdict accepted

latestInstalled:
  same exact accepted 5.99 identity
```

E21 consumers must read this through the canonical evidence view. Do not reintroduce raw legacy evidence consumers.

## 21. Physical acceptance

After a future successful 5.100 deployment, user action remains only normal PocketRisu `+` update and natural UI/Diagnostics capture.

No artificial request to a deprecated/deactivated model is required.

Accept when:

- installed tuple matches the promoted 5.100 release;
- READY / Health ok / active errors 0 / failures 0;
- naturally observed recent requests expose lifecycle metadata consistently with Diagnostics;
- if all naturally observed mappings are `ACTIVE`, that is sufficient positive physical evidence;
- UNKNOWN remains `—` for unresolved exact mappings;
- no duplicated request rows or identity churn;
- no extra model-catalog CLI/network/package-load loop appears;
- 5.99 daily server request/token truth remains healthy;
- existing DevPass/Credits/Analytics/Billing/Premium/PAYG/Cycle/Cost Drivers/cache/tier/outcome/HTTP surfaces remain healthy.

## 22. Non-goals / deferred candidates

Not part of 5.100:

- Gateway Limits / trust-tier / spend-cap headroom;
- API-key usage gauges;
- cache policy mode;
- DevPass no-training setting;
- Dynamic Route trace;
- model routing/blocking/substitution;
- automated migration away from deprecated models;
- model-catalog version update merely to create positive lifecycle examples;
- write settings or account mutations.

Those remain independent idea/source-authority tracks.

## 23. Final design decision

**5.100 = Request Model Lifecycle Fidelity using the already-managed pinned model catalog, exact model + served-provider mapping, fail-closed UNKNOWN, no new I/O, and no request-identity change.**

Implementation must stop and redesign if it discovers that exact served-provider mapping cannot be established without aliases/inference, that a new endpoint is required, or that recent-request schema/identity must change.
