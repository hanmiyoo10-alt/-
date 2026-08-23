# SimCore Reload / Update Cache Continuity Plan

Date: 2026-08-23
Status: `DESIGN RECORDED · DEFER / POST-M2-3 CANDIDATE`

## 1. Problem statement

Natural long-chat diagnostics show that runtime reload / plugin update boundaries can reset SimCore's memory-only cache trajectory and telemetry continuity:

```text
Runtime generation changes
→ prior memory-only cache trajectory is unavailable
→ Telemetry continuity: FRESH · no-compatible-handoff
```

Separately, some natural requests show real request-prefix collapse or host-prefix family change. These must not be conflated with the telemetry reset.

Two different surfaces therefore exist:

```text
A. SimCore local cache-observer continuity
   - memory-only today
   - reload/update can reset it
   - SimCore can repair this safely with bounded cross-generation handoff metadata

B. Provider/gateway prompt cache
   - external and currently UNVERIFIED
   - SimCore cannot force an external cache hit across reload/update
   - SimCore can only maximize byte-stable reusable request prefixes where SimCore owns those bytes
```

The design must never claim that preserving A proves preserving B.

---

## 2. Existing evidence and architecture constraints

Current guidelines already freeze these facts:

```text
request ordering: CHAT_HISTORY → CURRENT_USER → SIMCORE_RUNTIME
runtime placement: TAIL_AFTER_CURRENT_USER
provider cache: UNVERIFIED
compiler identity tiers: stable / slow / volatile / full
cache trajectory: memory-only telemetry today
```

Intentional mode/lifecycle changes can legitimately produce:

```text
stable    SAME
slow      SAME
volatile  CHANGED
full      CHANGED
```

so `full CHANGED` alone is not a cache regression.

The architecture currently assigns:

```text
runtime-cache            → runtime prompt cache observation and identity
runtime-topology         → request topology signatures and host-prefix sketches
runtime-cache-candidates → bounded cache-trajectory observation
runtime-telemetry        → refreshless memory-only telemetry handoff capsule
```

and explicitly keeps provider-cache claims and request mutation out of these modules.

Natural v0.64.x evidence also repeatedly shows `PRE_SIMCORE · CHAT_HISTORY` first-breaks while SimCore reports `NOT_FIRST_BREAK`. Such cases must remain host/history observations rather than being hidden by a continuity mechanism.

---

## 3. Design goal

Primary goal:

> Preserve enough bounded cache-observation identity across page reload / plugin update to compare the last pre-reload request with the first post-reload request, without retaining raw chat bodies or mutating the request.

Secondary goal:

> Distinguish a true request-prefix reset from a local-observer reset, so future optimization decisions are evidence-backed.

Non-goal:

> Guarantee or synthesize provider/gateway cache hits.

---

## 4. Proposed mechanism — Cross-Generation Cache Continuity Capsule

Add one bounded persistence capsule outside live runtime telemetry.

Conceptual shape:

```ts
{
  schema: 1,
  chatLocationKey: string,
  runtimeGeneration: string,
  simcoreVersion: string,
  cacheAbi: string,

  compilerStable: string,
  compilerSlow: string,
  compilerVolatile: string,
  compilerFull: string,

  hostPrefixFamily: string,
  hostPrefixFingerprint: string,
  hostPrefixChars: number,

  requestMessageCount: number,
  requestChars: number,
  commonPrefixMessages: number,
  commonPrefixChars: number,
  firstBreakIndex: number | null,

  frontierRole: string | null,
  frontierKind: string | null,
  frontierChars: number | null,
  frontierFingerprint: string | null,

  capturedAt: number
}
```

Hard privacy / memory limits:

```text
NO raw message bodies
NO raw system prompt
NO raw runtime prompt
NO comment/community text
NO complete history retention
fingerprints + lengths + bounded enums only
one previous compatible capsule per chat/location
```

The capsule is a seed for observation only. It is not Core semantic state and must never influence generation, editing, mirror acceptance, Frame, Time, Broadcast, or state-commit decisions.

---

## 5. Persistence strategy

Preferred implementation:

```text
reuse an existing per-turn persistence write
→ attach a tiny optional cacheContinuity capsule
→ avoid a new storage round trip
```

Do not add a separate `set()` on every request if the capsule can piggyback on the already-existing turn snapshot write. Storage is already a measured hotspot in natural long-chat evidence.

This is a deliberate optional schema extension and therefore must live in its own cache-continuity mini; it must not be mixed into M2-3 Edit Reconcile ownership movement.

`runtime-telemetry` remains memory-only. The persisted object is a distinct **handoff seed**, consumed into the new runtime generation and then rendered through the existing telemetry observer.

---

## 6. Compatibility / handoff gate

A previous capsule may seed the new generation only when all hard identity checks pass:

```text
same chat/location identity
capsule schema supported
cache ABI compatible
bounded age / latest-turn sanity valid
no location rewind ambiguity
```

Compiler identity is evaluated by tier, not by `full` alone.

Proposed classification:

```text
stable SAME + slow SAME
→ COMPATIBLE_BASE
→ volatile/full may differ normally

stable CHANGED
→ INCOMPATIBLE_STABLE
→ do not treat trajectory as continuous

slow CHANGED with stable SAME
→ COMPATIBILITY_REVIEW
→ continue only if cacheAbi explicitly declares the slow-tier change compatible

chat/location mismatch
→ INCOMPATIBLE_LOCATION
```

The key rule is:

> A volatile/full change must not by itself destroy the ability to compare pre/post-reload request topology.

It still remains visible as a change; continuity must never hide it.

---

## 7. New diagnostic semantics

Replace the binary blind spot:

```text
Telemetry continuity: FRESH · no-compatible-handoff
```

with bounded explicit states:

```text
Telemetry continuity: RESTORED · compatible-cross-generation
Telemetry continuity: FRESH · no-prior-capsule
Telemetry continuity: FRESH · incompatible-location
Telemetry continuity: FRESH · incompatible-cache-abi
Telemetry continuity: RESTORED_BASE · volatile-changed
```

Add one cross-generation comparison line:

```text
Reload cache handoff:
previous generation <id>
→ current generation <id>
· host prefix SAME/CHANGED
· stable SAME/CHANGED
· slow SAME/CHANGED
· volatile SAME/CHANGED
· first break <owner/index>
```

Provider wording remains:

```text
provider cache UNVERIFIED
```

unless authoritative host/provider telemetry is available in the future.

---

## 8. True prefix-preservation phase — conditional only

Do **not** change prompt placement or compiler serialization merely because the local observer restarts.

After cross-generation observation exists, collect natural reload/update pairs.

Only if evidence repeatedly establishes:

```text
pre-reload host/history prefix stable
AND
post-reload first break is SIMCORE-owned
AND
specific SimCore bytes changed unnecessarily
```

may a second mini introduce a **Stable Prefix ABI**.

Possible future Stable Prefix ABI rules:

```text
version-independent stable compiler segment remains byte-identical across compatible patch releases
release/version/diagnostic metadata never enters cache-critical stable prompt bytes
slow policy bytes change only when their semantic contract changes
volatile mode/lifecycle fields remain isolated in volatile serialization
```

However current verified placement is `TAIL_AFTER_CURRENT_USER`; moving SimCore earlier in the request solely for caching is forbidden without a dedicated regression campaign.

If the first break remains `PRE_SIMCORE · CHAT_HISTORY` or the host system prefix changes first, SimCore must report `NOT_FIRST_BREAK` and must not attempt request-history mutation to manufacture cache reuse.

---

## 9. Static fixtures

A future implementation mini must include at least:

```text
1. same chat + reload + stable SAME + slow SAME + volatile CHANGED
   → continuity seed accepted
   → RESTORED_BASE

2. same chat + plugin patch + all compiler tiers SAME except full/version metadata
   → accepted when cacheAbi compatible

3. stable tier changed
   → seed rejected

4. different chat/location
   → seed rejected

5. stale/replayed older capsule
   → seed rejected

6. PRE_SIMCORE history break after handoff
   → break remains visible
   → SimCore NOT_FIRST_BREAK

7. SIMCORE-owned first break
   → correctly attributed; no mutation

8. no raw text retained in capsule

9. no additional storage set call if piggyback implementation is used

10. provider cache remains UNVERIFIED

11. latest.js == install.js

12. M2-3 Representation/Edit controls unchanged
```

---

## 10. Natural live gate

Required A/B observation:

```text
healthy request before reload/update
→ capture continuity capsule
→ page reload or plugin update
→ first natural request after new generation
→ second natural request
```

Pass for local continuity:

```text
new generation recognized
prior capsule restored only when compatible
pre/post host-prefix and first-break comparison available immediately
no raw-body retention
no request mutation
no semantic state effect
normal request/output correctness unchanged
```

Evidence classification must separately report:

```text
LOCAL_OBSERVER_CONTINUITY
REQUEST_PREFIX_CONTINUITY
PROVIDER_CACHE = UNVERIFIED unless authoritative telemetry exists
```

---

## 11. Release ordering

Current status:

```text
DESIGN ONLY
DO NOT implement inside v0.64.6 close work
DO NOT mix with v0.65.0 M2-3 Edit Reconcile ownership extraction
```

Recommended timing:

```text
finish current correctness mini chain
→ complete v0.65.0 M2-3
→ consider this as a separate cache/observability-performance mini or later maintenance checkpoint
```

Reason: it changes persistence/telemetry boundaries and should be attributable independently from Edit Reconcile ownership movement.

---

## 12. Current classification

```text
problem A: reload/update local telemetry reset
status: DESIGNABLE / EXPECTED MEMORY-ONLY BEHAVIOR TODAY
repair value: HIGH for observability continuity

problem B: actual provider cache reset
status: UNVERIFIED
repair authority: NOT OWNED BY SIMCORE GENERALLY

candidate: CROSS_GENERATION_CACHE_CONTINUITY_CAPSULE
classification: DEFER / POST-M2-3 DESIGN CANDIDATE
```
