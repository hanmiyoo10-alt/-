# Local Usage Dashboard — Runtime Fallback / Compatibility Inventory

Status: **IMPLEMENTED — repository-only evidence inventory**

Idea: `NV-FALLBACK-INVENTORY`  
Design: #417  
Downstream consumer: `V-RUNTIME-FALLBACK-PRUNE`  
Production baseline: `3.0.0-alpha.5.80 / Engine 1.6.22 / Manager 1.3.0 / contracts 1/1`

## Decision summary

Current 5.80 source review found **0 `SAFE_REMOVAL_CANDIDATE` rows**.

That is intentional. Current fallbacks are predominantly active availability contracts, upgrade/recovery compatibility, or paths whose retirement requires evidence not present in this inventory. A recent fallback count of zero is not removal proof.

## Classification meanings

- `KEEP_ACTIVE_CONTRACT` — current correctness/availability behavior.
- `KEEP_COMPATIBILITY` — supported old/new source/runtime/schema interoperability.
- `KEEP_RECOVERY` — dormant but required for install/upgrade/outage recovery.
- `MEASURE_MORE` — plausible retirement target but insufficient proof.
- `SAFE_REMOVAL_CANDIDATE` — only after full supersession, regression and supported-environment proof.

## Inventory

| ID | Layer / owner | Preferred path | Fallback / compatibility path | Exact trigger | Truth / user effect | Evidence | Classification | Confidence | Removal prerequisite |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FB-ENGINE-CLI-DIRECT` | Engine `30-cli-runtime.part.mjs` | verified managed-direct CLI | direct installed `llmgateway` executable | managed runtime unavailable/invalid/disabled or not selected | same CLI semantics; launcher provenance differs | managed CLI launcher regressions P26/P27/P28; real-device managed-direct evidence | `KEEP_RECOVERY` | high | prove every supported install has valid managed runtime and recovery never requires direct executable |
| `FB-ENGINE-CLI-NPX` | Engine `30-cli-runtime.part.mjs` | direct executable | cache-first `npx` launcher | direct executable `ENOENT`/not found path | restores CLI availability; launcher provenance `npx-fallback` | behavior CLI launcher coverage; historical new-install recovery evidence | `KEEP_RECOVERY` | high | prove supported install/recovery matrix cannot reach direct-missing state and preserve automatic first-run recovery |
| `FB-ENGINE-LOGS-PROJECT` | Engine `35-request-provenance-capture.part.mjs` | account-wide `/logs` | project-scoped `/logs` candidate | account-wide transport/HTTP/parse unusable; truthful empty does not authorize fallback | narrower request visibility; provenance reports project fallback | P35/provenance behavior; recent physical fallback count can be 0 without retirement meaning | `KEEP_COMPATIBILITY` | high | upstream guarantee account-wide `/logs` on all supported CLI/API versions + executable regression for failure/empty distinction |
| `FB-ENGINE-DEVPASS-STATUS-ORG` | Engine `40-sources.part.mjs` | independent DevPass status from account capture | safe status reconstructed from DevPass organization row | independent status absent/unavailable and compatible org shape exists | may expose only fields actually present; missing values remain UNKNOWN | current status normalizer/source compatibility paths | `KEEP_COMPATIBILITY` | medium | prove independent status exists with equivalent semantics on all supported environments and retire old shape explicitly |
| `FB-ENGINE-CACHE-DEFERRED` | Engine `20-cache-circuit.part.mjs` + source loader | fresh cache/load | serve stale within policy and schedule bounded secondary refresh | eligible entry expired while stale window permits deferred refresh | stale marker + continued UI availability | cache/stale behavior regressions; diagnostics stale/secondary visibility | `KEEP_ACTIVE_CONTRACT` | high | separate product decision changing stale policy; not a legacy-prune candidate |
| `FB-ENGINE-CACHE-CIRCUIT` | Engine cache/circuit owner | normal upstream load | last-known-good stale value | circuit open and cached value still within stale max; accountCapture/creditsBootstrap stricter rules preserved | avoids repeated failing I/O while visibly stale | circuit/recovery regressions and diagnostics | `KEEP_ACTIVE_CONTRACT` | high | separate evidence-led availability-policy redesign |
| `FB-ENGINE-CACHE-ERROR` | Engine cache/source loader | successful refresh | last-known-good stale value | refresh throws and eligible cached value is within stale max | partial continuity with error/stale attribution | cache recovery behavior tests | `KEEP_ACTIVE_CONTRACT` | high | separate availability-policy redesign with equal or stronger recovery semantics |
| `FB-ENGINE-PARTIAL-SNAPSHOT` | Engine snapshot assembly | all modules healthy | return usable partial snapshot with module errors | non-critical source/module failure while other authoritative data remains usable | partial/stale/error markers; healthy sections remain truthful | snapshot diagnostics/health contracts | `KEEP_ACTIVE_CONTRACT` | high | prove failing any one current degradable module must invalidate the whole snapshot without UX regression |
| `FB-CREDITS-ORG-SELECTION` | Engine organization selection + Plugin persisted selection | requested Credits org exact match | bounded automatic compatible org selection | requested org absent/unusable or first-run has no valid selection | selected org/fallback reason visible; no fabricated org data | organization selection regressions and diagnostics fallback fields | `KEEP_RECOVERY` | medium | explicit migration policy proving first-run/recovery never needs automatic selection |
| `FB-PLUGIN-LOCALJSON` | Plugin normalization boundary | DevPass Bridge snapshot | generic local-JSON compatibility adapter | DevPass Bridge markers/status absent and compatible local JSON shape supplied | supports older/local compatibility source; unknown fields stay UNKNOWN | existing local JSON bridge compatibility history/tests | `KEEP_COMPATIBILITY` | medium | explicit support-policy retirement + migration path + regression showing no supported workflow depends on adapter |
| `FB-MANAGER-ENGINE-DISCOVERY` | `runtime/bridge-manager.cjs` | canonical listener/managed engine discovery | canonical legacy PID/script candidate followed by safety/auth checks | listener discovery unavailable while legacy candidate exists | enables safe adoption of existing installations | Manager adoption contract and safety checks | `KEEP_RECOVERY` | high | prove legacy installed population is fully migrated and no supported upgrade requires adoption path |
| `FB-MANAGER-TOKEN-FILES` | `runtime/bridge-manager.cjs` | current token location | known legacy token file location(s) | preferred token absent; compatible legacy token file contains value | authentication compatibility only; token never surfaced | Manager token lookup source | `KEEP_COMPATIBILITY` | medium | explicit migration completion evidence and versioned deprecation window |
| `FB-MANAGER-BRIDGE-HEADER` | `runtime/bridge-manager.cjs` | canonical local bridge key header | compatible DevPass bridge key header | request uses recognized legacy header with correct token | no truth change; auth migration compatibility | Manager `authorized()` source | `KEEP_COMPATIBILITY` | medium | prove all supported callers migrated and add rejection regression before removal |

## Trigger separation rules retained

The inventory deliberately keeps these as separate rows because their risk differs:

- managed runtime unavailable → direct executable;
- direct executable missing → npx;
- stale due deferred refresh;
- stale due circuit-open;
- stale due refresh error.

A future cleanup must never delete an entire family because one trigger appears dormant.

## Protected truth/privacy contracts

Any future `V-RUNTIME-FALLBACK-PRUNE` design must preserve:

- truthful account-wide empty ≠ transport failure;
- UNKNOWN stays UNKNOWN;
- raw project/org identities remain transient;
- request identity/enrichment semantics;
- Cache Read/Write/TTL fidelity;
- stale maximum, circuit and recovery semantics unless separately redesigned;
- CLI hard concurrency/timeout and managed runtime recovery;
- Manager authenticated adoption checks;
- PocketRisu `+` automatic update behavior.

## Downstream gate

`V-RUNTIME-FALLBACK-PRUNE` may consume **only** rows classified `SAFE_REMOVAL_CANDIDATE` after a fresh source/production recheck.

Current consumable SAFE set: **empty**.

No runtime code, priority, trigger, I/O, version or release artifact was changed by this inventory.
