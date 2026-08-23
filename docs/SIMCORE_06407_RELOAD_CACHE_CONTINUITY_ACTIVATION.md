# SimCore v0.64.7 — Cross-Reload Cache Observer Continuity Activation

Date: 2026-08-23
Status: `DESIGN ACTIVATED · OBSERVABILITY/PERFORMANCE MINI · IMPLEMENTATION NOT STARTED`
Current production parent: `v0.64.6 — Post-B_END C Clock Handoff Authority`
Current release branch: `release-simcore`
Current release commit: `47969d24771f6cc188df6e32150fc6fde519182d`
Current release blob (`latest.js` = `install.js`): `34da01aa131f760b92d65d961a7843e9cc0d37d6`
Major production checkpoint after this mini: `v0.65.0 — M2-3 Edit Reconcile Ownership Extraction`

## 1. Activation decision

The older `SIMCORE_CACHE_CONTINUITY_ACROSS_RELOAD_PLAN.md` recorded a broader persistence-oriented candidate and recommended post-M2-3 timing.

A source-level re-read of the actual v0.64.6 release makes the required repair substantially narrower:

```text
runtime-telemetry already owns a bounded handoff capsule
runtime-cache already exports/imports its observer state
runtime-topology already exports/imports its observer state
runtime-cache-candidates already exports/imports its trajectory state
outer runtime already adopts the capsule once per new runtime generation
onUnload already publishes a fresh capsule
```

The missing edge is transport durability across a full page refresh, because the current carrier is only `globalThis` memory.

Therefore v0.64.7 is activated before M2-3 as a standalone transport/observability mini with **no Core Store schema change**.

This activation document supersedes the older plan's recommended ordering only. The older document remains useful for privacy/non-goal reasoning.

Classification:

```text
id: CROSS_RELOAD_CACHE_OBSERVER_CONTINUITY
current behavior: EXPECTED MEMORY-ONLY RESET AT FULL RELOAD
correctness defect: NO
observability loss: DIRECT / REPRODUCIBLE BY RUNTIME BOUNDARY SHAPE
provider cache loss: UNVERIFIED
repair scope: LOCAL OBSERVER HANDOFF TRANSPORT ONLY
M2-3 attribution: NONE
```

---

## 2. Existing v0.64.6 source contract

Current `runtime-telemetry` source already contains:

```text
KEY = __SIMCORE_TELEMETRY_HANDOFF_V1__
MAX_AGE_MS = 10 * 60 * 1000
```

The capsule is schema 1 and contains only bounded observer exports:

```ts
{
  schema: 1,
  sourceVersion,
  locationKey,
  capturedAt,
  runtimePromptCache,
  requestTopology,
  cacheCandidates
}
```

Current transport:

```text
publish(root, capsule)
→ root[KEY] = capsule

claim(root)
→ read root[KEY]
→ delete root[KEY]
```

Current validation:

```text
capsule exists
schema == 1
locationKey matches current runtimePromptKey
age <= 10 minutes
```

Current adoption already restores the three trackers independently:

```text
runtimePromptCache.importState(...)
requestTopology.importState(...)
cacheCandidates.importState(...)
```

The tracker export formats are already self-versioned. Import failure is therefore naturally fail-closed for an incompatible tracker state.

Current unload behavior already captures and publishes:

```text
sourceVersion: current SimCore version
locationKey: current chat/location key
capturedAt: now
runtimePromptCache.exportState()
requestTopology.exportState()
cacheCandidates.exportState()
```

This design must preserve those semantics rather than inventing a second cache model.

---

## 3. Why full refresh still loses continuity

The current memory handoff is useful for compatible runtime replacement while the same JS global survives.

A full page refresh can destroy that carrier:

```text
old runtime
→ onUnload/globalThis capsule
→ page JS context destroyed
→ new page/globalThis
→ claim finds no capsule
→ Telemetry continuity FRESH · no-compatible-handoff
```

Natural v0.64.6 diagnostics show the result:

```text
same long chat after runtime boundary
Cache trajectory must establish again
Telemetry continuity: FRESH · no-compatible-handoff
provider cache: UNVERIFIED
```

Important separation:

```text
local observer continuity reset != proven provider cache reset
```

v0.64.7 repairs only the left side.

---

## 4. Frozen implementation boundary

Physical owner remains the existing `runtime-telemetry` module.

No new semantic module is required.

Allowed coordination:

```text
runtime-telemetry
→ capture / serialize / checkpoint / claim / validate bounded handoff

runtime-cache
runtime-topology
runtime-cache-candidates
→ existing exportState/importState only

outer runtime
→ checkpoint current observer state
→ adopt once on new generation
→ diagnostics only
```

Forbidden ownership movement:

```text
Session/Edit Reconcile
Representation
Mirror/Deferred Mirror
Lifecycle/Time/Frame/Broadcast
Prompt semantic compiler
Structure/Community/Reaction
Bootstrap Migration
Core SnapshotStore semantic state
```

---

## 5. Transport design — two-tier handoff

Keep the current in-memory handoff as Tier 1 and add a same-tab refresh-surviving sidecar as Tier 2.

```text
Tier 1: globalThis
- existing fastest path
- zero serialization
- preserves current hot/plugin reload behavior

Tier 2: window.sessionStorage
- survives ordinary same-tab page refresh
- dies with the tab/session naturally
- not shared as durable Core semantic state
- validated by location + age before adoption
```

Suggested sidecar key:

```text
__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__
```

Do not use `localStorage` as the primary design because longer-lived cross-tab persistence is unnecessary for this observer-only handoff and increases stale-capsule risk.

Do not use the SimCore SnapshotStore for v0.64.7. That would mix cache-observer transport into the already storage-dominated Core persistence path and turn this mini into a schema/storage change.

---

## 6. Checkpoint timing

The sidecar must contain the latest completed request observation, not a stale pre-request tracker state.

Preferred order:

```text
request prepares normally
→ runtime prompt/cache/topology observers record current request
→ generation/output completes
→ output state commits normally
→ bounded telemetry checkpoint written to sessionStorage
```

This keeps the new write off the request-to-provider critical path.

`onUnload` should also refresh both transports synchronously as a last-chance handoff:

```text
capture current tracker exports
→ publish globalThis
→ checkpoint sessionStorage
→ existing hook/UI cleanup
```

The live output path must not wait on host persistence or network I/O. `sessionStorage.setItem()` is synchronous browser-local storage; its measured cost must be bounded and exposed diagnostically.

---

## 7. Checkpoint contract

Add bounded helpers inside `runtime-telemetry`, conceptually:

```ts
checkpointSession(root, capsule)
claimSession(root)
claimBest(root)
```

`claimBest(root)` priority:

```text
1. current globalThis capsule
2. sessionStorage sidecar
3. none
```

The chosen capsule is single-consumption for the new runtime generation.

Session sidecar read/parse failures must never disable SimCore:

```text
storage unavailable
JSON parse failure
quota/security exception
oversized payload
→ discard sidecar
→ continue as FRESH
```

No exception from this transport may enter generation or state-commit control flow.

---

## 8. Bounded payload / privacy contract

Reuse the existing tracker exports only.

Hard rules:

```text
NO raw chat bodies
NO raw system prompt
NO raw runtime prompt
NO COMMUNITY/comment text
NO generated output body
NO request mutation
NO chat write
NO network call
```

Add a serialized-size ceiling before writing the session sidecar.

Recommended initial ceiling:

```text
MAX_SESSION_CAPSULE_CHARS = 16384
```

If exceeded:

```text
checkpoint skipped
reason oversized
continuity remains safe/FRESH after reload
```

Do not truncate structured state and then attempt adoption. Oversize fails closed.

---

## 9. Compatibility semantics

Keep the existing hard outer gate:

```text
schema supported
same location key
age <= 10 minutes
```

Do not reject solely because `sourceVersion` differs across a patch update. Cross-version update continuity is one of the intended use cases.

Compatibility is already further bounded by each tracker import:

```text
runtime-cache export version 1
runtime-topology export version 2
runtime-cache-candidates export version 2
```

If one tracker import rejects its own state:

```text
that tracker starts FRESH
other accepted trackers may still restore
```

The diagnostic must expose partial restoration rather than calling the whole handoff exact.

A future incompatible tracker redesign must bump its own export version or the telemetry schema; do not add semantic guessing in v0.64.7.

---

## 10. Diagnostic changes

Preserve the existing `Telemetry continuity` line but add transport identity.

Examples:

```text
Telemetry continuity: ADOPTED · transport GLOBAL · from 0.64.7 · age 3.2s · topology RESTORED · runtime-prefix RESTORED · trajectory RESTORED

Telemetry continuity: ADOPTED · transport SESSION · from 0.64.6 · age 18.4s · topology RESTORED · runtime-prefix RESTORED · trajectory RESTORED

Telemetry continuity: FRESH · session-location-mismatch
```

Add one bounded checkpoint line:

```text
Telemetry checkpoint: SESSION · WRITTEN · 1842 chars · 0.4 ms
```

or:

```text
Telemetry checkpoint: SESSION · SKIPPED · oversized
Telemetry checkpoint: SESSION · UNAVAILABLE · SecurityError
```

Retain only bounded exception names, never full exception messages.

Provider wording is frozen:

```text
provider cache UNVERIFIED
```

A restored local observer must never be reported as a provider cache hit.

---

## 11. Required static fixtures

Before release, the v0.64.7 branch must exercise at least:

```text
1. Existing globalThis handoff
   → still adopted
   → transport GLOBAL

2. No global capsule + valid same-location session capsule
   → adopted
   → transport SESSION

3. Page-reload shape with sourceVersion 0.64.6 and current 0.64.7
   → accepted when schema/location/age valid and tracker imports pass

4. Session capsule location mismatch
   → reject
   → no semantic side effect

5. Session capsule older than 10 minutes
   → reject expired

6. Malformed session JSON
   → reject/fresh
   → no throw

7. Session storage unavailable/security exception
   → fallback to global or fresh

8. Serialized capsule > size ceiling
   → skip write
   → no partial/truncated adoption

9. One tracker import incompatible while others valid
   → partial restore visible
   → failed tracker FRESH

10. No raw-body keys/text in serialized capsule

11. No SimCore SnapshotStore schema/key/write change

12. No request-history mutation

13. No prompt text/placement change

14. provider cache remains UNVERIFIED

15. latest.js == install.js

16. v0.64.6 post-B_END clock fixtures unchanged PASS

17. v0.64.5 COMMUNITY multiline fixtures unchanged PASS

18. ordinary SAME_FAST / representation-fast / genuine-edit frozen controls unchanged
```

Static side-effect checks should specifically reject new `Risuai.setChat`, network, timer, or Core SnapshotStore calls introduced by this mini.

---

## 12. Natural live close gate

Required same-chat experiment:

```text
A. establish a healthy cache trajectory in v0.64.7
B. confirm session telemetry checkpoint WRITTEN
C. refresh the page or perform a plugin runtime update
D. first natural request in the new runtime generation
E. second natural request
```

Pass on the first post-boundary request:

```text
new runtime generation detected
Telemetry continuity transport SESSION or GLOBAL as appropriate
same location accepted
runtime-prefix/topology/trajectory restored where compatible
first-break/frontier comparison immediately available
provider cache still UNVERIFIED
normal Core request/output semantics unchanged
```

Pass on the second request:

```text
trajectory continues from restored state
no artificial family reset caused by the handoff itself
no repeated re-adoption of the same capsule
```

If the actual request prefix still changes at a PRE_SIMCORE host/history slot, the diagnostic must continue to report that truth. v0.64.7 is not allowed to hide a real prefix break merely because local telemetry was restored.

---

## 13. What v0.64.7 explicitly does NOT solve

```text
actual provider/gateway prompt-cache retention
host-generated chat-history mutation
PRE_SIMCORE first-break behavior
Store write latency
manual-edit rebuild latency
Stable Prefix ABI
prompt relocation
compiler byte redesign
semantic generation excursions
Core handshake transient miss
```

Those remain separate evidence tracks.

---

## 14. Release ordering

Current production sequence:

```text
v0.64.6 Post-B_END C Clock Handoff Authority
→ FULL NATURAL LIVE CLOSE PASS

v0.64.7 Cross-Reload Cache Observer Continuity
→ design
→ work branch implementation
→ static/CI
→ release-simcore
→ refresh/update long-chat live validation
→ main evidence sync

then
v0.65.0 M2-3 Edit Reconcile Ownership Extraction
```

Do not mix v0.64.7 transport/telemetry changes with M2-3 ownership movement.

The existing M2-3 workstream should rebase its production candidate on the final v0.64.7 release parent before landing, while preserving its already-frozen decision semantics and differential fixtures.

---

## 15. Final activation verdict

```text
next mini: v0.64.7
name: Cross-Reload Cache Observer Continuity
axis: runtime-telemetry transport only
Core Store schema: FROZEN
Prompt semantics: FROZEN
provider cache claim: NONE / UNVERIFIED
M2-3 semantics: FROZEN
implementation: NOT STARTED
```

Cross references:

- `SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `SIMCORE_CACHE_CONTINUITY_ACROSS_RELOAD_PLAN.md`
- `SIMCORE_LIVE_06406_VALIDATION.md`
- `SIMCORE_RUNTIME_WATCH_06402.md`
- `SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
