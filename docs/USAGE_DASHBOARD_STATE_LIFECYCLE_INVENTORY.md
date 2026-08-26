# Local Usage Dashboard — Retained State / Memory Lifecycle Inventory

Status: **IMPLEMENTED — repository-only ownership inventory**

Idea: `NV-STATE-LIFECYCLE`  
Design: #419  
Existing measurement/regression authority: P37 Runtime Weight & Lifecycle Audit  
Production baseline: `3.0.0-alpha.5.80 / Engine 1.6.22 / Manager 1.3.0 / contracts 1/1`

## Decision summary

The current runtime already contains multiple explicit retention bounds and lifecycle cleanup paths. This inventory found **no `SAFE_CLEANUP_CANDIDATE` that can be acted on without additional lifecycle evidence**.

Most current state is classified as:

- bounded active contract,
- single-flight/serialized ownership,
- explicit lifecycle-owned handles,
- or `MEASURE_MORE` / `STRESS_AUDIT_REQUIRED` where static source cannot prove repeated-runtime accumulation behavior.

Heap/RSS bytes remain **UNKNOWN**. No estimate is made.

## Classification meanings

- `KEEP_BOUNDED_CONTRACT` — finite bound and enforcement are explicit.
- `KEEP_SINGLE_FLIGHT` — intentionally shared/serialized Promise/in-flight ownership with explicit release.
- `KEEP_LIFECYCLE_OWNED` — timer/listener/observer ownership and cancel/unload path are explicit.
- `MEASURE_MORE` — bound/payload/release path is not fully proven.
- `STRESS_AUDIT_REQUIRED` — static ownership is reasonable but repeated lifecycle behavior needs later `NV-LIFECYCLE-STRESS` evidence.
- `SAFE_CLEANUP_CANDIDATE` — redundant/overlong state proven safe to shorten/remove.

## Inventory

| ID | Layer / owner | Kind / lifetime | Retained payload | Bound + enforcement | Release / prune trigger | Persistence | Observability / regression | Classification | Confidence | Next evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SL-PLUGIN-REQUEST-LEDGER` | Plugin `14-request-ledger.part.js` | persisted array; across refresh/runtime | sanitized recent request rows | 24h cutoff + newest-first `.slice(0, 2000)` | old rows excluded on collection; overwrite persisted bounded array | plugin storage | Runtime Weight Audit + P37 + P44 | `KEEP_BOUNDED_CONTRACT` | high | no cleanup action; preserve identity/enrichment |
| `SL-PLUGIN-REFRESH-INFLIGHT` | Plugin runtime/refresh owner | Promise; refresh lifetime | active refresh closure/data | single active `refreshInFlight` ownership/coalescing | completion/error path clears current refresh ownership | memory only | Runtime Weight Audit `refresh active/idle` | `KEEP_SINGLE_FLIGHT` | high | later lifecycle stress may confirm no stale owner survives unload |
| `SL-PLUGIN-WIDGET-RENDER-TAIL` | Plugin runtime core/render owner | serialized Promise tail; runtime | queued render sequencing state | serialized tail, not open-ended parallel fanout | prior task settles before next tail link | memory only | render counters/diagnostics | `KEEP_SINGLE_FLIGHT` | medium | repeated rapid render stress if future symptoms appear |
| `SL-PLUGIN-DIAG-PERSIST-TAIL` | Plugin `62-diagnostics-workspace.part.js` | serialized Promise tail; runtime | diagnostics mode persistence operations | one serial tail; latest clicked mode preserved by ordered writes | each task settles; errors caught; runtimeDisposed gate | plugin storage write target, Promise memory-only | P36/P37 diagnostics mode regressions | `KEEP_SINGLE_FLIGHT` | high | none currently |
| `SL-PLUGIN-WIDGET-CACHE` | Plugin runtime core/render | object cache; runtime | HTML/width/display/layout/responsive style entries | four primary scalar slots explicit; responsive-style key universe not proven by static audit | overwritten as rendering/layout changes; cleared on runtime teardown by process/object release | memory only | Runtime Weight Audit exposes populated fields/key count | `MEASURE_MORE` | medium | enumerate responsive-style key universe and mutation owners before cleanup claim |
| `SL-PLUGIN-PERF-SAMPLES` | Plugin performance runtime | arrays; runtime | UI stall/render/resume timing samples | shared `pushPerformanceSample(..., limit=12)` default, shifts oldest entries | push trims beyond limit | memory only | Diagnostics + P37 | `KEEP_BOUNDED_CONTRACT` | high | preserve measurement semantics |
| `SL-PLUGIN-TIMERS` | Plugin refresh/panel/resume/stall owners | timer/idle handles; runtime | callback closures + small runtime state | fixed named timer slots / idle handles | cancel functions + `90-bootstrap.part.js` unload clears owners | memory only | Runtime Weight Audit timers; P37 | `KEEP_LIFECYCLE_OWNED` | high | repeated init/resume/panel stress → `NV-LIFECYCLE-STRESS` |
| `SL-PLUGIN-LONGTASK-OBSERVER` | Plugin resume diagnostics | `PerformanceObserver`; runtime/diagnostic window | long-task callback closure and latest bounded samples | one observer slot | explicit `stopResumeLongTaskObserver()` on unload | memory only | P37 owner marker + diagnostics | `KEEP_LIFECYCLE_OWNED` | high | repeated resume/unload physical stress |
| `SL-PLUGIN-LISTENER-REGISTRIES` | Plugin `80-lifecycle.part.js` / `90-bootstrap.part.js` | arrays of listener registrations; runtime | target/type/id/function references | cardinality depends on installed UI/lifecycle hooks; owner arrays explicit | unload splices remote/DOM listeners; widget registry cleared | memory only | P37 verifies `remoteListeners.splice(0)`, `widgetRemoteListeners.length=0`, `domListeners.splice(0)` | `STRESS_AUDIT_REQUIRED` | high | repeated init/unload/panel open-close count stability |
| `SL-PLUGIN-STATE-DATA` | Plugin persisted `state.data` | persisted object; across runtime | latest normalized snapshot | one latest snapshot object, overwrite semantics; byte/cardinality bound not explicitly documented here | replaced on successful refresh/persist | plugin storage | Diagnostics data age/current state | `MEASURE_MORE` | medium | measure serialized size over long-running normal use; no heap inference |
| `SL-ENGINE-CACHE` | Engine `00-core` + `20-cache-circuit` | `Map`; process lifetime | normalized source cache entries | `CACHE_MAX_ENTRIES=128`; `pruneCache()` removes oldest beyond bound | prune after cache growth; TTL/stale rules control usability | memory only | bridge diagnostics cache entries | `KEEP_BOUNDED_CONTRACT` | high | preserve TTL/stale policy |
| `SL-ENGINE-INFLIGHT` | Engine source loader | `Map`; request/load lifetime | active load Promises/closures | key-based single-flight; current source contains explicit `inFlight.delete(...)` | finally/completion cleanup | memory only | bridge diagnostics `inFlight` | `KEEP_SINGLE_FLIGHT` | high | no action unless leak symptom appears |
| `SL-ENGINE-CIRCUITS` | Engine cache/circuit owner | `Map`; process lifetime | bounded family state/error summaries | key space derived from finite source families; exact formal cardinality constant not declared | family entries reused; fields overwritten on success/failure | memory only | circuit diagnostics | `KEEP_BOUNDED_CONTRACT` | medium | optionally freeze finite family list in future test; no current cleanup need |
| `SL-ENGINE-LOG-THROTTLE` | Engine `20-cache-circuit.part.mjs` | `Map`; process lifetime | last-log timestamps by key | when size >128, entries older than `intervalMs*4` are deleted | rate-limited log call triggers prune | memory only | source evidence | `KEEP_BOUNDED_CONTRACT` | high | none |
| `SL-ENGINE-CLI-WAITERS` | Engine CLI semaphore owner | array queue; request lifetime | resolve/reject closures waiting for CLI slot | CLI concurrency hard max 2; queue length is workload-dependent, not hard-cardinality-capped | waiter dequeued as CLI slots release | memory only | CLI active/queued diagnostics | `MEASURE_MORE` | medium | stress high request concurrency; preserve hard active cap and timeout |
| `SL-ENGINE-SECONDARY-QUEUE` | Engine `00-core` / source refresh owner | array + Set; process lifetime | deferred refresh keys/tasks | concurrency 1; `SECONDARY_REFRESH_MAX_KEYS=32`; Set dedupes keys | queue drain removes key/work; superseded/dropped counters visible | memory only | secondary queued/running diagnostics | `KEEP_BOUNDED_CONTRACT` | high | preserve queue semantics |
| `SL-ENGINE-SNAPSHOT-ALS` | Engine `AsyncLocalStorage` | async request scope | snapshot attribution counters/context | lifetime bound to async snapshot operation | async context exits with operation | memory only | snapshot attribution diagnostics | `KEEP_LIFECYCLE_OWNED` | medium | no cross-request retention evidence currently; stress only if symptom appears |
| `SL-ENGINE-CAPTURE-RAW` | Engine account capture/capture tap | short-lived file + per-load objects | raw project/org/usedMode and sanitized source response fragments | capture is bounded operationally and file mode `0600`; public snapshot strips raw identity | next capture/operation overwrite; only derived scope fields leave Engine normalization | short-lived protected file + memory | provenance regressions P35 | `KEEP_LIFECYCLE_OWNED` | high | preserve privacy; never extend retention for convenience |
| `SL-MANAGER-CLI-PROVISION` | Manager `managedCliProvisioningPromise` | Promise; provisioning lifetime | provisioning closure/child install state | single-flight: existing Promise returned while active | `.finally(() => managedCliProvisioningPromise = null)` | memory + bounded filesystem state | Manager runtime status | `KEEP_SINGLE_FLIGHT` | high | none |
| `SL-MANAGER-DOWNLOAD-BUFFER` | Manager release `requestText()` | array of Buffer chunks; request lifetime | release artifact response chunks | hard 2 MiB total; request destroyed beyond limit | request end/error releases chunks | memory only | source bound | `KEEP_BOUNDED_CONTRACT` | high | preserve artifact size guard |
| `SL-MANAGER-INSTALL-CHILD` | Manager CLI provisioning | child process + timeout handles | npm install process references | install timeout 5 min; termination path includes SIGTERM then SIGKILL fallback | exit/error/timeout completion; timers cleared/unref'd | process + filesystem staging | source lifecycle | `KEEP_LIFECYCLE_OWNED` | high | device stress only if provisioning lifecycle failures are observed |

## Large-object / privacy observations

No new large-object telemetry is added by this inventory.

Particularly protected:

- raw prompt/response/auth material is not an acceptable retained-state optimization input;
- raw request project/org identity stays transient to Engine provenance classification;
- Manager release buffers stay hard-capped;
- Plugin Request Ledger retains sanitized rows only and remains capped by time + row count.

## Boundary with `NV-LIFECYCLE-STRESS`

Static source proves ownership/cancel paths, but it cannot fully prove that repeated host lifecycle events never duplicate registrations across long sessions.

The following are routed to later high-difficulty stress evidence rather than guessed safe:

- repeated plugin init/unload cycles;
- repeated visibility/resume cycles;
- repeated diagnostics/settings panel open/close;
- runtime adoption/reconnect cycles;
- listener/timer count stability over those cycles.

This inventory does not perform that physical stress audit.

## Current cleanup set

`SAFE_CLEANUP_CANDIDATE`: **0**.

Potential evidence targets, not cleanup authorization:

- responsive-style cache key universe;
- persisted `state.data` serialized size trend;
- CLI waiter queue behavior under synthetic/high request pressure;
- repeated listener/timer lifecycle counts under `NV-LIFECYCLE-STRESS`.

## Protected contracts

Any later cleanup derived from this inventory must preserve:

- Request Ledger 24h + 2000-row bound and identity/enrichment rules;
- UNKNOWN/null semantics;
- cache TTL/stale/circuit/recovery;
- CLI concurrency max 2, timeout and secondary queue behavior;
- lifecycle epoch/stale-async drop protection;
- Diagnostics instant mode behavior;
- Manager self-update / Engine managed bundle;
- PocketRisu `+` automatic update flow.

No runtime state, bound, timer, listener, product version or release artifact was changed by this inventory.
