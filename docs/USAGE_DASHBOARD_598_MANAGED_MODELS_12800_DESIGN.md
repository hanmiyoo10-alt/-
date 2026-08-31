# Local Usage Dashboard 5.98 — Managed Models 1.280.0 Catalog Refresh Design

Status: **DESIGN FROZEN — IMPLEMENTATION NOT STARTED**

Canonical feature authority: #1055  
Canonical sequencing index: #412  
Target product area: `plugins/usage-dashboard/`  
Production branch: `release-usage-dashboard`

## 1. Fresh release authority

Fresh production/main authority was rechecked after 5.97 physical closure.

Current accepted production tuple:

- Product `3.0.0-alpha.5.97`
- Engine `1.6.33`
- Manager semantic `1.3.5`
- managed CLI `@llmgateway/cli@1.10.0`
- managed Models catalog `@llmgateway/models@1.251.0`
- contracts `snapshot 1 / recent-request 1`
- production release SHA `ef4686126addf26eac07b1d4c3e047e2dfacaaae`
- Engine SHA-256 `4e470962c70de434c7027e2c6dcc0d151a11ed9c51ddb9366ea180013a7d3d01`
- Manager SHA-256 `4760276bae54f1e1163f4a7168b3df815c9174eb637f59028981d8e271cdc009`
- bootstrap SHA-256 `4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c`
- physical verdict `PASS_PHYSICAL`
- physical authority #960 comment `5475876406`

Fresh `main` at design start: `6a6388f40a0b7fc00512824ad5e8e6b6e701b235`.

At design freeze there is no real `.github/usage-dashboard/releases/5.98.json`. Search also found no real `plugins/usage-dashboard/tests/p64-*`; P64 is therefore only tentatively reserved until implementation-time recheck.

Historical #1035 attempted to allocate Product 5.97 to this catalog refresh and is now closed `not_planned` / superseded. Its release number, P63 reservation and 5.96 evidence are not current authority.

## 2. Fresh upstream authority

Fresh upstream `theopenco/llmgateway` main is:

`fbb40efa41c379db5223dff708509b6dd82e05a9`

The current main commit is a Models change (`feat(models): add scx-ai-gp GLM-5.3 mapping`). It is the same exact upstream commit previously bound to the observed `@llmgateway/models@1.280.0` package authority.

No newer upstream main commit was observed during this design pass.

Therefore the bounded next release target is:

`@llmgateway/models@1.251.0 -> @llmgateway/models@1.280.0`

The managed CLI remains `@llmgateway/cli@1.10.0`; this release does not upgrade CLI.

A final upstream/package authority recheck is mandatory immediately before implementation. If the package authority has advanced or changed incompatibly, implementation must fail closed and the target must be reconciled before source mutation.

## 3. Primary goal

Refresh only the exact managed Models package while preserving the current source-truth classification contract and every existing runtime/release boundary.

This is **catalog-data refresh**, not classifier redesign.

The release must not add a new UI feature merely because the catalog changes. Existing model-category surfaces consume the new exact package through the same contract.

## 4. Candidate release tuple

Subject to final implementation-time fresh authority:

- Product `3.0.0-alpha.5.98`
- Engine `1.6.34`
- Manager semantic `1.3.6`
- managed CLI `@llmgateway/cli@1.10.0`
- managed Models `@llmgateway/models@1.280.0`
- contracts `snapshot 1 / recent-request 1`
- bootstrap exact-byte unchanged

### Why Engine 1.6.34

Current Engine source owns:

```js
const VERSION = '1.6.33';
const MODEL_CATALOG_PACKAGE = '@llmgateway/models';
const MODEL_CATALOG_VERSION = '1.251.0';
```

Changing the exact accepted catalog package changes shipped Engine behavior/bytes and the runtime package-verification contract, so Engine must advance monotonically to `1.6.34`.

### Why Manager 1.3.6

Current Manager owns the exact managed runtime pair:

```js
const MANAGED_CLI_VERSION = '1.10.0';
const MANAGED_MODEL_CATALOG_VERSION = '1.251.0';
```

The Manager verifies/provisions the exact CLI+Models pair. Moving the required Models package to `1.280.0` therefore changes Manager runtime semantics and requires semantic Manager `1.3.6`, not merely Product identity materialization.

## 5. Frozen model-category semantics

The classifier algorithm remains byte/behavior-equivalent except for the catalog data it consumes.

Preserve:

1. model id normalization from the exact request model string already used by Engine;
2. classification only from the managed `@llmgateway/models` export;
3. Premium when any explicit provider price satisfies:
   - input `>= 5e-6`, **or**
   - output `>= 15e-6`;
4. exact catalog membership that does not meet Premium threshold => Regular;
5. missing model, missing catalog, missing exact membership, invalid catalog, empty catalog or unavailable runtime => UNKNOWN;
6. `modelCategorySource = llmgateway-model-catalog` only for exact catalog-backed classifications;
7. no provider/name/request-cost/service-tier/account-plan inference outside the catalog;
8. model category remains enrichment only and is excluded from request identity.

A row may legitimately change category only when the new exact upstream catalog membership/pricing produces that change. Local policy itself must not change.

## 6. Engine implementation boundary

Materialize only what the new exact catalog pin requires:

1. Engine identity `1.6.33 -> 1.6.34`;
2. `MODEL_CATALOG_VERSION 1.251.0 -> 1.280.0`;
3. preserve `MODEL_CATALOG_PACKAGE = '@llmgateway/models'`;
4. preserve `buildModelCategoryMap()` semantics;
5. preserve `classifyModelCategoryFromMap()` UNKNOWN behavior;
6. preserve managed CLI/catalog diagnostic namespace separation;
7. preserve current account capture, request normalization, cache and CLI invocation ownership.

No new HTTP endpoint, no package metadata fetch, no extra `/logs`, no extra CLI command, no catalog polling and no automatic package update owner.

## 7. Manager implementation boundary

Materialize:

1. `MANAGER_VERSION 1.3.5 -> 1.3.6`;
2. Product identity `5.97 -> 5.98`;
3. bundled Engine binding `1.6.34` plus exact new Engine SHA;
4. `MANAGED_MODEL_CATALOG_VERSION 1.251.0 -> 1.280.0`;
5. preserve `MANAGED_CLI_VERSION = 1.10.0`;
6. preserve lock/install/retry/provisioning/fallback semantics otherwise.

No second package root, no independent Models updater, no new daemon and no new poller.

## 8. Plugin / UI boundary

No new top-level tab, card, chart, filter or request-identity field.

Existing Recent Requests and hourly views continue to show only source-backed:

- `Premium`
- `Regular`
- `Unknown`

Full Diagnostics must retain disjoint package identities:

```text
Bridge CLI runtime: managed · ready · @llmgateway/cli 1.10.0 · provisioning ok
Model category catalog: managed · ready · @llmgateway/models 1.280.0
```

Compact Diagnostics must likewise retain both identities independently:

```text
Runtime: Engine 1.6.34 · Manager 1.3.6 · CLI 1.10.0 · Models 1.280.0 · ready
```

The 5.95 catalog/CLI overwrite defect must remain impossible. P62 identity separation is a mandatory carry-forward regression.

## 9. E21 first-live proof

E21 maintenance is complete and byte-neutral. It added:

- one canonical legacy/structured release-evidence view;
- closed-shape structured evidence;
- shared Product version ordering;
- a synthetic forward-consumer canary using 5.98;
- a guard against new generic direct legacy evidence reads.

5.98 is the first legitimate forward Product release after that maintenance and must act as its real live proof.

The release path must prove:

1. the real 5.98 spec passes the same representation rules as the synthetic 5.98 canary;
2. no generic evidence consumer needs a one-off migration repair;
3. closed-shape evidence rejects unknown/shadow keys;
4. shared Product ordering accepts 5.98 monotonically;
5. E18/E19/E20/E21 remain subordinate to the existing release authority graph; no new release generation is introduced.

## 10. Structured release evidence

If production remains the accepted 5.97 baseline at source freeze, the 5.98 spec must use structured evidence only.

Expected identities, subject to fresh recheck:

```json
{
  "releaseEvidence": {
    "schemaVersion": 1,
    "acceptedBaseline": {
      "productVersion": "3.0.0-alpha.5.97",
      "releaseSha": "ef4686126addf26eac07b1d4c3e047e2dfacaaae",
      "verdict": "accepted",
      "issue": 960,
      "commentId": 5475876406
    },
    "latestInstalled": {
      "productVersion": "3.0.0-alpha.5.97",
      "releaseSha": "ef4686126addf26eac07b1d4c3e047e2dfacaaae",
      "verdict": "accepted",
      "issue": 960,
      "commentId": 5475876406
    }
  }
}
```

No independent `verifiedBaseline` or `latestInstalledEvidence` ownership in the forward spec.

Do not copy this block blindly if production or accepted physical authority changes before implementation.

## 11. Materializer boundary

The 5.98 materializer must fail closed unless the exact then-current 5.97 baseline remains present.

Baseline locks if unchanged:

- Product `5.97`;
- Engine `1.6.33` plus exact Engine SHA;
- Manager `1.3.5` plus exact Manager SHA;
- CLI `1.10.0`;
- Models `1.251.0`;
- contracts `1/1`;
- exact bootstrap SHA;
- exact Engine/Manager catalog pin owners.

Materialize only:

1. Product/Plugin `5.97 -> 5.98`;
2. Engine `1.6.33 -> 1.6.34`;
3. Engine Models pin `1.251.0 -> 1.280.0`;
4. Manager `1.3.5 -> 1.3.6`;
5. Manager Product identity `5.98` + Engine `1.6.34` binding/hash;
6. Manager Models pin `1.251.0 -> 1.280.0`;
7. manifest tuple/hashes;
8. 5.98 release spec/notes using current structured evidence contract.

The materializer second pass must be a no-op.

## 12. Regression reservation

Reserve **P64 — Managed Models Catalog Refresh Fidelity** only if still free immediately before implementation.

P64 must at minimum lock:

1. tuple `5.98 / Engine 1.6.34 / Manager 1.3.6 / CLI 1.10.0 / Models 1.280.0 / contracts 1/1`;
2. exact upstream Models authority commit `fbb40efa41c379db5223dff708509b6dd82e05a9`, rechecked at implementation time;
3. Engine and Manager exact Models pin parity;
4. CLI pin remains exactly `1.10.0`;
5. classifier thresholds and model-id normalization remain unchanged;
6. exact catalog membership only; missing/unresolved stays UNKNOWN;
7. model category remains excluded from request identity;
8. full and compact Diagnostics keep CLI and Models identities disjoint;
9. P61 historical classifier/package invariants remain applicable where defined;
10. P62 managed-runtime namespace/identity fidelity remains GREEN;
11. P63 Credits spend composition remains GREEN and unrelated;
12. E18/E19/E20/E21 and E21 synthetic forward canary remain GREEN;
13. Manager provisioning/verification accepts only the exact CLI+Models pair;
14. deterministic Engine/Manager build and manifest hash parity;
15. bootstrap exact-byte preservation;
16. materializer second-pass idempotence;
17. no new endpoint, `/logs`, CLI invocation, timer, poller, cache owner, persistence owner, listener, scheduler, package updater or request-identity owner;
18. full Usage Dashboard registry GREEN.

## 13. Physical acceptance after deployment

The user's action remains one normal PocketRisu `+` update plus UI/Diagnostics capture. No shell and no artificial/chargeable traffic.

Accept when the same installed release shows:

- Product `3.0.0-alpha.5.98`;
- Engine `1.6.34`;
- Manager `1.3.6`;
- CLI `1.10.0`;
- Models `1.280.0`;
- READY / Health ok / active errors `0` / failures `0`;
- full and compact Diagnostics show CLI and Models separately with the exact versions above;
- naturally observed request model categories remain source-consistent with the new catalog;
- unresolved/missing model/category remains UNKNOWN;
- no duplicate request rows or request-identity churn;
- Billing Cycle, Premium, PAYG, cycle summary, Cost Drivers, Credits spend composition, cache/tier/outcome/HTTP behavior remain normal;
- no unexpected extra network/CLI/refresh work attributable to the catalog refresh.

Do not generate paid/artificial traffic solely to force a Premium classification. A natural window containing only Regular rows is a valid physical outcome; Premium positive coverage remains regression-owned.

## 14. Non-goals

Do not bundle into 5.98:

- classifier threshold redesign;
- model-name enrichment latency repair (#756);
- service-tier redesign;
- Credits spend/source changes;
- Premium/PAYG/Billing changes;
- model/provider pricing UI;
- automatic catalog update checks;
- CLI upgrade;
- lifecycle/fallback cleanup;
- memory features;
- release-control generation changes;
- physical acceptance automation.

## 15. Frozen verdict

**5.98 DESIGN FROZEN — Managed Models 1.280.0 Catalog Refresh.**

One release, one primary goal: update the exact managed Models package and preserve all existing source-truth, identity, regression and release-authority boundaries.
