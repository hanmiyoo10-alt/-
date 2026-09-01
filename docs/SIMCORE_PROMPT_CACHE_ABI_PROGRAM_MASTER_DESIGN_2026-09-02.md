# SimCore Prompt Cache ABI Program — Master Design

Date: 2026-09-02 KST
Status: **MASTER DESIGN FROZEN · DESIGN ONLY · NO RUNTIME AUTHORIZATION**
Classification: **SIMCORE CACHE PROGRAM · PROMPT ABI · IMPLICIT/PROMPT CACHE RELIABILITY · PROVIDER-EVIDENCE-GATED OPTIMIZATION**

## 1. Decision

SimCore caching is not treated as a single cache implementation project.

The program goal is to converge SimCore into a deterministic prompt runtime in which:

```text
SAME SEMANTICS
→ SAME STABLE PREFIX

SEMANTIC CHANGE
→ ONLY OWNED CACHE BREAK

PROVIDER SUPPORT EXISTS
→ CACHE REUSE SHOULD BE THE NORMAL CASE
```

The target is not merely to observe cache behavior. The target is to make SimCore's prompt surface structurally cache-compatible so that prompt caching / implicit caching is stable and highly predictable whenever the provider supports it.

SimCore may guarantee cache eligibility, deterministic serialization, owned break behavior, and stable prompt topology. SimCore must not claim that a provider actually performed a cache read/write unless provider-side evidence confirms it.

This document becomes the program-level design owner for the ordering and boundaries between:

1. post-M2 / S7 runtime convergence,
2. Prompt Cache ABI construction,
3. reuse/cache observability,
4. provider receipt confirmation,
5. prompt-prefix placement architecture,
6. cache reliability closure,
7. later feature expansion under the Cache ABI.

This document does **not** authorize runtime implementation or release publication.

---

## 2. Current authority baseline

At this design freeze:

```text
main
= 1ad93e7be4e4f77479d161eb3ea8cfec70af84cc

release-simcore
= 861100f4771967aa5b8ab8811d06f11702c0d3ff

production SimCore
= v0.70.1 Cold First-Turn Tail Attribution
```

Production authority remains `release-simcore`.

Nothing in this document changes production behavior.

3.0M Source Intelligence remains **DESIGN ONLY**. This cache program does not implicitly authorize 3.0M runtime activation, Candidate C, structured source persistence, source history, or cross-turn source identity.

---

## 3. Why the roadmap is ordered this way

The program intentionally does not begin with provider-cache optimization.

The architecture dependency is:

```text
ATTRIBUTION
    ↓
SIMPLIFICATION
    ↓
RUNTIME SURFACE STABILITY
    ↓
PROMPT CACHE ABI
    ↓
CACHE OBSERVABILITY
    ↓
PROVIDER CONFIRMATION
    ↓
PREFIX ARCHITECTURE
    ↓
RELIABILITY CLOSURE
    ↓
FEATURE EXPANSION
```

The post-M2 simplification / S-series work therefore has a direct cache-program role:

> First make the runtime object stable enough to cache; then optimize caching around the stable object.

Optimizing cache keys, observer behavior, or prompt placement before runtime convergence risks coupling the cache design to transient complexity that S7 later removes.

S7 is therefore interpreted as a **runtime-surface convergence predecessor** to the Prompt Cache ABI, not as a cache implementation release.

---

## 4. Program-level invariants

### PCA-1 — Cache is never semantic authority

```text
CACHE
!=
SEMANTIC AUTHORITY
```

A cache hit, cache entry, provider receipt, or reuse observation never creates truth, exposure authority, current runtime authority, canonical world state, or source provenance.

### PCA-2 — Same semantic stable input must serialize identically

For the stable prompt plane:

```text
same semantic stable input
→ byte-for-byte identical stable serialization
```

Accidental differences caused by timestamps, request IDs, telemetry, object insertion order, whitespace, newline policy, or equivalent serialization choices are defects.

### PCA-3 — Only owned semantic changes may break stable cache identity

A stable-prefix break requires an owned semantic cause.

Runtime noise must not acquire cache-break authority.

### PCA-4 — Eligibility is not provider confirmation

```text
CACHE_ELIGIBLE
!=
CACHE_CONFIRMED
```

SimCore may derive eligibility from its own prompt ABI and prefix observations.

Provider read/write truth requires provider evidence.

### PCA-5 — Cache miss is not semantic absence

```text
CACHE MISS
!=
OBJECT NOT FOUND
!=
EMPTY
!=
UNKNOWN
```

This applies especially to any future source/object cache.

### PCA-6 — Cache is not store

```text
CACHE
!=
DURABLE STORE
```

Future Candidate C persistence, if ever authorized, must define its durable store semantics before any source cache is designed.

### PCA-7 — Reference reuse does not grant mutation ownership

```text
REFERENCE REUSE
!=
MUTATION OWNERSHIP
```

A shared cached base must not be decorated with consumer-local mutable state unless shared mutable ownership is explicitly contracted.

### PCA-8 — Late computation does not retain publication authority

Any asynchronous cache computation or refresh that can publish shared state must revalidate current operation authority immediately before publication.

Completion order does not grant authority.

### PCA-9 — Narrowest correct refresh

If a future cache needs refresh/reconciliation:

```text
refresh policy
= owning authority's narrowest correct reconciliation scope
```

Top-up-only, delta fetch, revision fetch, change feed, bounded full snapshot, or full reconcile are implementation choices owned by the relevant subsystem.

### PCA-10 — Provider-cache optimization is evidence-gated

Prompt placement or semantic prompt restructuring for cache benefit is not authorized merely because it appears cache-friendly.

Material optimization requires:

```text
provider receipt evidence
+
first-break ownership evidence
+
material latency/token-cost impact
```

---

## 5. Cache architecture planes

The cache program is split into separate authority planes.

### Plane C0 — Reuse Observation Plane

Purpose:

- observe prompt-prefix reuse potential,
- identify the first changed byte / first break,
- classify break ownership,
- measure fresh/warm and reload continuity,
- attribute observer cost.

Current `runtimePromptCache` belongs conceptually here.

It is an observer/tracker, not a provider cache and not a response cache.

Preferred conceptual identity:

```text
RuntimePromptReuseObserver
```

Renaming production code is not required by this design.

### Plane C1 — Provider Cache Evidence Plane

Purpose:

- ingest or correlate provider-side cache read/write evidence,
- distinguish provider prompt cache activity from gateway replay,
- confirm whether an eligible request actually received cache reuse.

Initial architecture:

```text
SimCore diagnostic / request evidence
+
Usage Dashboard provider receipt evidence
→ manual/offline correlation
```

No automatic runtime bridge is authorized here.

### Plane C2 — Local Deterministic Memo Plane

Purpose:

- memoize expensive, pure, deterministic, recomputable SimCore calculations only when profiling proves material value.

Potential examples only after evidence:

- stable ruleset serialization,
- stable schema compilation,
- pure formatting artifacts,
- bounded deterministic accounting fragments.

Explicitly excluded:

- canonical state,
- current authority,
- unvalidated model output,
- live exposure decisions,
- current source truth,
- mutable interaction state.

### Plane C3 — Source/Object Cache Plane

Status:

```text
DISABLED / NOT ACTIVE
```

This plane does not exist in the current runtime.

It may be considered only after Candidate C or an equivalent durable source-history capability is explicitly authorized.

Current 3.0M first-major source families remain current-projection-only and do not authorize a source history cache.

---

## 6. Prompt Cache ABI

The Prompt Cache ABI is the core artifact of the program.

The prompt is no longer treated as an arbitrary string assembled ad hoc each request. It is treated as a deterministic semantic interface with a stable and dynamic boundary.

Conceptual structure:

```text
StablePromptPrefixV1
+
DynamicPromptTailV1
```

### 6.1 Stable Prompt Prefix

Candidate stable content includes:

- SimCore protocol/version semantics,
- core invariants,
- stable mode definitions,
- stable schema definitions,
- stable host contract definitions,
- stable validation semantics,
- stable first-major source-family definitions once 3.0M runtime is separately authorized.

The stable plane should prefer definitions over current selections.

Example:

```text
stable:
  Mode A definition
  Mode B definition
  Mode C definition

dynamic:
  current_mode = B
```

Changing the current mode should not require rewriting stable mode definitions.

### 6.2 Dynamic Prompt Tail

Candidate dynamic content includes:

- current mode selection,
- current runtime state,
- current user turn,
- current conversation-dependent facts,
- current exposure/source job,
- current projection payload,
- turn-local authority references.

### 6.3 Stable/dynamic classification rule

The classification question is:

> Does this value describe stable semantics, or does it describe the current execution instance?

Stable semantic definitions belong in the stable plane where host/ABI semantics permit.

Current execution values belong in the dynamic plane.

---

## 7. Canonical Prompt Serializer

A future Cache ABI implementation should introduce one canonical serialization policy for the stable plane.

Conceptual component:

```text
CanonicalPromptSerializerV1
```

Required properties:

- fixed section ordering,
- fixed field ordering where ordering is semantically irrelevant,
- fixed newline policy,
- fixed whitespace policy,
- fixed null-versus-omission policy,
- stable escaping,
- stable number/string representation,
- deterministic array ordering only where semantics permit reordering.

### 7.1 Serialization correctness ordering

```text
SEMANTICS FIRST
DETERMINISM SECOND
CACHE BENEFIT THIRD
```

Canonicalization must never erase a real semantic distinction in order to preserve a cache hit.

### 7.2 Snapshot/ABI testing

The stable serializer should support fixtures such as:

```text
semantic fixture
→ exact expected stable bytes
```

Byte-for-byte regression is intended here.

---

## 8. Volatility firewall

The stable prefix must reject runtime-only volatility.

Examples of values that must not silently enter the stable plane:

- wall-clock timestamps,
- request IDs,
- generation IDs,
- random/non-deterministic ordering,
- latency values,
- telemetry counters,
- diagnostic nonces,
- host-local transient bookkeeping,
- unrelated UI state.

Required regression concept:

```text
same semantic request
+
different runtime noise
→ same stable-prefix bytes
```

Any unintended stable-prefix change must have an attributable owner and reason.

---

## 9. Cache compatibility test suite

The Cache ABI requires a dedicated regression matrix.

Minimum conceptual cases:

### Case A — request identity noise

```text
same semantic state
request id differs
→ stable prefix SAME
```

### Case B — telemetry noise

```text
same semantic state
telemetry differs
→ stable prefix SAME
```

### Case C — reload

```text
same semantic state after supported reload
→ stable prefix SAME
```

### Case D — user turn change

```text
user content changes
→ stable region before owned dynamic boundary SAME
```

### Case E — current mode change

```text
mode selection changes
→ stable mode definitions SAME
→ dynamic selection changes
```

### Case F — stable ruleset revision

```text
stable semantic ruleset changes
→ intended stable cache invalidation
```

### Case G — host ABI revision

```text
host ABI semantics change
→ intended stable cache invalidation
```

### Case H — unrelated feature dormant

```text
unrelated feature remains dormant
→ no stable-prefix mutation from feature-local runtime noise
```

Recommended diagnostics:

```text
StablePrefixHash
StablePrefixBytes
StablePrefixTokens
FirstChangedByte
FirstBreakOwner
FirstBreakReason
```

---

## 10. Cache observability after ABI stabilization

The observer program follows Prompt Cache ABI construction because the object being observed must first have a stable contract.

Observer responsibilities:

- common-prefix accounting,
- stable-prefix identity,
- first-break classification,
- cache-shadow classification,
- fresh/warm comparison,
- reload continuity,
- observer overhead attribution.

### 10.1 Cold-path attribution remains valid

The previously frozen `v0.70.2 Cache Observer Cold-Path Attribution` design remains technically relevant as an attribution design.

Its original purpose remains valid:

> decompose first-request `PROMPT_ACCOUNTING` cost before attributing the cold tail to any single operation.

Potential subspans remain conceptually separate:

- prompt-budget scan,
- evidence fence,
- host-local telemetry claim,
- telemetry restore/import,
- reuse observer,
- message append.

No single subspan is declared causal until measurement proves it.

---

## 11. Provider cache evidence model

A future confirmation layer should distinguish SimCore eligibility from provider truth.

Conceptual state set:

```text
NOT_ELIGIBLE
ELIGIBLE_UNVERIFIED
WRITE_CONFIRMED
READ_CONFIRMED
READ_ZERO
PROVIDER_UNAVAILABLE
```

`PROVIDER_UNAVAILABLE` and `ELIGIBLE_UNVERIFIED` must not be flattened into `READ_ZERO`.

Gateway request replay must not be counted as provider prompt-cache read unless provider accounting proves that relationship.

### 11.1 Initial evidence source

Usage Dashboard already provides reference evidence patterns for provider cache read/write token accounting.

The first SimCore integration step should be manual/offline correlation rather than duplicated log ingestion inside SimCore.

A runtime bridge is considered only if repeated manual evidence proves that the integration cost is justified.

---

## 12. Cache Shadow

Current prompt ordering may place stable SimCore bytes after conversation-dependent material.

Conceptually:

```text
CHAT_HISTORY
→ CURRENT_USER
→ SIMCORE_RUNTIME
```

Under strict longest-prefix caching, an earlier history/user break may prevent later stable SimCore bytes from producing provider cache benefit.

This state is called:

```text
CACHE_SHADOW
```

Definition:

> Stable/reusable SimCore bytes exist, but an earlier non-SimCore prefix break prevents those bytes from contributing to provider prefix reuse.

Cache Shadow is not proof that prompt placement must change. It is evidence used by the placement gate.

---

## 13. Prefix placement architecture

Prompt placement is a high-risk optimization and is intentionally late in the program.

Potential target shape, subject to host/semantic validation:

```text
STABLE SYSTEM / SIMCORE PREFIX
        ↓
CONVERSATION HISTORY
        ↓
CURRENT USER
        ↓
SMALL DYNAMIC SIMCORE TAIL
```

This is not authorized by this document.

Placement changes may affect:

- instruction precedence,
- host ABI behavior,
- mode semantics,
- long-chat behavior,
- provider-specific prompt interpretation.

Therefore placement work opens only when all are true:

```text
provider cache evidence exists
+
CACHE_SHADOW repeats
+
SimCore-owned placement is materially responsible for cost/latency loss
```

If those conditions are not met, placement remains unchanged.

---

## 14. Mode and Source Intelligence cache layout

When stable definitions are large, the program must compare stable-cache benefit against input-token cost.

For modes, the preferred cache-compatible pattern is:

```text
stable:
  all stable mode semantics

dynamic:
  current mode selection
```

For future 3.0M runtime, once separately authorized:

```text
stable candidate:
  LIVE_REACTION definition
  BOARD definition
  NEWS definition
  stable validator/presentation contracts

dynamic candidate:
  active family
  current assertions
  current projection
  current authority references
```

This is a layout principle only.

It does not authorize insertion of all schemas into production prompts if token/cost evidence shows that doing so is worse.

---

## 15. Local deterministic memoization

Local memoization is optional and late.

It is opened only for measured expensive pure calculations.

A conceptual memo identity may include:

```text
producerSchemaVersion
producerRuntimeVersion
semanticInputFingerprint
rulesetFingerprint
mode
hostAbiVersion
```

Rules:

```text
exact semantic identity
→ reuse allowed

identity mismatch
→ recompute

fuzzy match
→ prohibited by default
```

TTL is not the default invalidation mechanism when semantic fingerprints can provide exact invalidation.

---

## 16. Shared cache ownership

If a shared cached value is later introduced:

```text
Shared Cached Base
= immutable from consumer perspective
```

Consumer-local state belongs in detached wrappers/views.

Example:

```text
Shared semantic base
├─ Presentation-local wrapper
├─ Diagnostics-local wrapper
└─ Context-builder-local wrapper
```

Fields such as `selected`, `expanded`, local display generation, diagnostic flags, or current insertion reasons must not silently mutate the shared semantic base.

Detaching mutable ownership does **not** require deep-cloning large immutable payloads.

---

## 17. Future Source Cache boundary

Prompt caching and source/object caching are separate programs.

```text
PROMPT CACHE PROGRAM
!=
CANDIDATE C SOURCE CACHE PROGRAM
```

Current Source Intelligence policy remains:

```text
CURRENT_PROJECTION_ONLY
STRUCTURED_SOURCE_AUTOMATIC_REENTRY = NONE
NO SOURCE HISTORY STORE
NO CROSS-TURN SOURCE IDENTITY
```

Therefore current runtime target remains:

```text
SourceHistoryCache = NONE
SourceObjectCache = NONE
```

If Candidate C is later activated, durable store semantics must be designed first.

Only then may a cache layer be considered.

---

## 18. Metrics and success criteria

The program does not optimize raw hit-rate in isolation.

Primary metrics:

```text
StablePrefixByteIdentityRate
StablePrefixTokenRatio
UnintendedBreakRate
IntendedBreakPrecision
CacheShadowRate
ProviderReadConfirmationRate
ColdWarmLatencyDelta
CachedInputTokenRatio
ObserverColdMs
ObserverWarmMs
```

### 18.1 Reliability target

The intended operating property is:

```text
break when semantic ownership requires a break
otherwise remain stable
```

Program-level target direction:

```text
StablePrefixByteIdentityRate → 100%
UnintendedBreakRate          → 0%
IntendedBreakPrecision       → 100%
CacheShadowRate              → 0% where architecture permits
ProviderReadConfirmationRate → high on eligible requests when provider support exists
```

Provider-side availability and policy remain external variables and must be represented honestly.

---

## 19. Program phases

### CACHE-0 — Roadmap / release identity reconciliation

Purpose:

- separate historical design identity from future release identity,
- preserve prior evidence without allowing version regression.

### CACHE-1 — Runtime Surface Convergence / S7 handoff

Purpose:

- complete or re-preflight the S7 convergence target,
- confirm the prompt/runtime surface is stable enough to define a Cache ABI.

No cache optimization is required to close this phase.

### CACHE-2 — Prompt Cache ABI Foundation

Purpose:

- define stable/dynamic boundary,
- define canonical serialization,
- define volatility firewall,
- create byte-identity regression fixtures.

### CACHE-3 — Reuse Observer / Cold Attribution

Purpose:

- validate first-break ownership,
- decompose observer cold-path cost,
- measure reload/fresh/warm continuity.

### CACHE-4 — Provider Receipt Correlation

Purpose:

- correlate SimCore eligibility evidence with provider read/write receipts,
- distinguish eligible-unverified from confirmed read/write.

Initial mode is manual/offline.

### CACHE-5 — Cache Opportunity Attribution

Purpose:

Combine:

```text
first-break ownership
+
provider receipt
+
material token/latency cost
```

Outcome may legitimately be:

```text
NO MATERIAL SIMCORE-OWNED CACHE OPPORTUNITY
→ STOP OPTIMIZATION
```

That is a valid successful finding.

### CACHE-6 — Targeted Optimization / Prefix Placement

Opened only when CACHE-5 proves material SimCore-owned opportunity.

Allowed scope is the narrowest proven owner:

- serialization,
- local memoization,
- prompt placement,
- other specifically measured seam.

### CACHE-7 — Cache Reliability Closure

Purpose:

- long-chat validation,
- reload/reroll/edit behavior,
- mode transitions,
- intentional/unintentional break classification,
- provider confirmation rate,
- cache-shadow regression.

### CACHE-8 — Feature Expansion Under Cache ABI

New major features, including any later 3.0M runtime implementation, must classify new prompt content as stable or dynamic and prove unrelated stable prefix remains unchanged where semantically appropriate.

---

## 20. S7 → Cache ABI handoff gate

The first concrete next checkpoint is the S7-to-Cache-ABI handoff.

Before CACHE-2 implementation is authorized, re-preflight should answer:

1. Is the cumulative S7 candidate/runtime surface still the intended simplification target against current production authority?
2. Are any S1-S6/S7 prompt-generation paths now obsolete because main moved?
3. Does S7 change current `runtimePromptCache` or telemetry timing seams in a way that invalidates the old observer design?
4. Is there a single bounded prompt-generation surface suitable for stable/dynamic classification?
5. Are reload semantics sufficiently stable to make byte-identity fixtures meaningful?
6. Does any current host behavior require `SIMCORE_RUNTIME` to remain tail-positioned for semantic correctness?

Until this handoff is closed, Cache ABI implementation is not authorized.

---

## 21. Release numbering reconciliation

The historical document:

```text
SimCore v0.70.2 Cache Observer Cold-Path Attribution Design
```

remains preserved as a historical design checkpoint.

The S-series documents reserve/target `v0.70.3` for cumulative simplification.

These historical identities must not force a future production version regression.

Rule:

```text
HISTORICAL DESIGN VERSION
!=
FUTURE RELEASE IDENTITY
```

If production advances beyond `v0.70.2` before Cache Observer work resumes, the resumed runtime release must select a fresh version greater than the then-current production version.

Example only:

```text
if production = 0.70.3
then resumed Cache Observer release
must be > 0.70.3
```

The original `v0.70.2` design file remains evidence provenance; it is not overwritten or retroactively renamed.

Actual future version selection requires fresh release preflight.

---

## 22. Prohibited shortcuts

The following are explicitly out of scope unless separately authorized by evidence:

- claiming provider cache hits from local prefix similarity alone,
- moving SimCore prompt sections solely because the new order appears more cache-friendly,
- adding a large Cache Manager that combines observation, persistence, provider receipts, and semantic state,
- treating a cache as canonical state,
- activating Candidate C merely to gain a source cache,
- deep-cloning every cached payload as a generic ownership strategy,
- using wall-clock TTL as a substitute for known semantic invalidation,
- adding all future source schemas to every request without token/cost evidence,
- implementing a duplicate provider-log collector in SimCore while Usage Dashboard already owns that evidence surface,
- interpreting provider unavailability as zero cache read,
- treating gateway replay as provider prompt-cache read without proof,
- preserving cache identity across a real semantic change.

---

## 23. Relationship to existing designs

### v0.70.1 Cold First-Turn Tail Attribution

Remains production authority and evidence baseline.

It established first-turn attribution evidence but did not prove provider cache read/write behavior.

### v0.70.2 Cache Observer Cold-Path Attribution

Remains a valid parked attribution design.

Its future runtime release identity must be freshly selected when resumed.

### Post-M2 / S1-S7 simplification program

Remains the runtime-convergence predecessor.

Its cache-program purpose is to reduce unstable/transient runtime surface before Cache ABI construction.

### 3.0M Source Intelligence

Remains DESIGN ONLY.

Its future runtime implementation, if authorized, should enter under the Cache ABI rather than force the Cache ABI to be rebuilt around already-deployed source features.

### Candidate C

Remains separate and inactive.

Prompt caching does not authorize persistent source history, cross-turn source identity, or source-object caching.

---

## 24. Convergence statement

This master design answers the program-level question:

> What does SimCore mean by “stable prompt caching / implicit caching should be effectively guaranteed”?

Answer:

SimCore will make all provider-independent prerequisites deterministic and testable:

```text
same stable semantics
→ same stable bytes

runtime noise
→ no stable-prefix mutation

owned semantic change
→ attributable intentional break

eligible prompt
→ explicit eligibility evidence

provider read/write
→ provider evidence only
```

Provider internals remain outside SimCore authority, but SimCore should remove avoidable reasons for cache failure from its own prompt surface.

The end state is not “a cache feature”.

The end state is a **deterministic Prompt Cache ABI** under which provider cache reuse becomes the normal expected outcome whenever the provider supports it.

---

## 25. Next checkpoint

```text
NEXT CACHE DESIGN CHECKPOINT
= CACHE-1 · S7 → PROMPT CACHE ABI HANDOFF RE-PREFLIGHT
```

That checkpoint is read/design-first.

It does not authorize production modification until current production authority, S7 candidate authority, host ordering, prompt-generation seams, and old Cache Observer assumptions are revalidated against the fresh repository state.
