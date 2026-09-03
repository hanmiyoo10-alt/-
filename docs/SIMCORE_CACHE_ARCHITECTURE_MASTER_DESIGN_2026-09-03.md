# SimCore Cache Architecture — Master Design

Date: 2026-09-03 KST
Status: **MASTER ARCHITECTURE FROZEN · DESIGN ONLY · NO RUNTIME AUTHORIZATION**
Classification: **SIMCORE · PROMPT CACHE ABI · IMPLICIT CACHE · EXPLICIT CACHE · CROSS-VERSION CONTINUITY · PROVIDER EVIDENCE**

## 1. Decision

SimCore caching is designed as a long-lived compatibility architecture, not as one cache implementation and not as a release-specific optimization.

The primary goal is:

```text
PRESERVE WHAT ALREADY WORKS.
MEASURE WHAT IS UNKNOWN.
REPAIR ONLY THE PROVEN GAP.
KEEP THE REPAIRED RESULT AS THE NEW BASELINE.
```

Applied to caching:

```text
SAME STABLE SEMANTICS
→ SAME LONG-LIVED PROMPT SKELETON
→ SAME CANONICAL STABLE BYTES
→ PROVIDER CACHE ELIGIBILITY REMAINS NORMAL

SIMCORE RELEASE VERSION CHANGES
!=
PROMPT CACHE ABI REVISION
!=
AUTOMATIC CACHE RESET
```

The architecture must support both:

- implicit/provider-managed prefix caching,
- explicit/provider-supported cache controls,

without creating two semantic prompt implementations.

The central transport rule is:

```text
ONE SEMANTIC PROMPT
→ ONE CACHE PLAN
→ MULTIPLE PROVIDER CACHE TRANSPORTS
```

Explicit and implicit caching are therefore different transport realizations of the same Prompt Cache ABI.

This document does **not** authorize runtime implementation, prompt reordering, provider-specific cache controls, S7 release publication, 3.0M/Post-3M runtime activation, Candidate C activation, source persistence, or release publication.

---

## 2. Authority relationship

This master architecture composes with and refines the existing design owners:

- `SIMCORE_PROMPT_CACHE_ABI_PROGRAM_MASTER_DESIGN_2026-09-02.md`
- `SIMCORE_PROMPT_CACHE_ABI_CROSS_VERSION_COMPATIBILITY_CONTRACT_2026-09-02.md`
- `SIMCORE_S7_POST_M2_SIMPLIFICATION_PROGRAM_CONVERGENCE_DESIGN_2026-08-31.md`
- `REPOSITORY_COMMON_RULES.md`, especially RCR-D01, D03, D04, D11, D12, D13 and applicable conditional rules.

The existing Prompt Cache ABI master remains the program-level goal/roadmap owner.

The cross-version contract remains the compatibility owner.

This document becomes the architecture-level owner for:

1. prompt cache strata,
2. semantic prompt segmentation,
3. cache-plan metadata,
4. implicit and explicit cache transport unification,
5. invalidation/break-frontier semantics,
6. observer and provider receipt boundaries,
7. local deterministic memo boundaries,
8. cross-version onboarding requirements for future SimCore features.

At this design freeze:

```text
main
= 4442518df9fd8998277c57beec4cc749f9659124

release-simcore
= 861100f4771967aa5b8ab8811d06f11702c0d3ff

production SimCore
= v0.70.1 Cold First-Turn Tail Attribution
```

Production authority remains `release-simcore`.

Post-3M design work may be closed at design level on `main`, but that does not imply runtime activation. Cache architecture must therefore support future feature onboarding without pretending those features are already production-active.

---

## 3. Primary architecture invariants

### CA-1 — Preserve working behavior first

```text
WORKING + VERIFIED
→ PRESERVE

UNKNOWN
→ OBSERVE / ATTRIBUTE / VERIFY

BROKEN OR MISSING
→ TARGETED REPAIR

REPAIR VERIFIED
→ NEW PRESERVED BASELINE
```

Cache work does not authorize broad prompt rewrites merely because a more cache-friendly layout appears possible.

### CA-2 — Cache never owns semantics

```text
CACHE
!=
SEMANTIC AUTHORITY
```

No cache object, cache hit, receipt, cache key, cache hint or observer result creates model truth, source truth, exposure authority, current runtime authority or durable source identity.

### CA-3 — One semantic prompt

There must not be one semantic prompt for implicit caching and another semantic prompt for explicit caching.

Provider-specific adapters may alter transport metadata only where the provider contract permits it.

They must not silently rewrite SimCore semantics merely to create a cache hit.

### CA-4 — Stable semantics own stable bytes

```text
same stable semantic input
→ same canonical stable serialization
```

Unowned whitespace, ordering, timestamps, request IDs, diagnostics, telemetry or release-number churn inside the stable region are defects.

### CA-5 — Release identity is not cache ABI identity

```text
releaseVersion
!=
promptCacheAbiRevision
```

A runtime version bump alone is not a valid cache invalidation reason.

### CA-6 — Breaks are owned and localized

A cache break must have:

- an owner,
- a semantic or lifecycle reason,
- an earliest changed segment,
- an expected downstream effect.

Unknown early breaks are defects until explained.

### CA-7 — Provider truth remains external

```text
CACHE_ELIGIBLE
!=
PROVIDER_CACHE_HIT_CONFIRMED
```

Provider reads/writes require provider evidence.

### CA-8 — Correctness outranks continuity

```text
SEMANTICS FIRST
COMPATIBILITY SECOND
CACHE CONTINUITY THIRD
```

A real stable semantic incompatibility may intentionally break cache.

### CA-9 — Dormant features do not perturb unrelated requests

A future capability that is not semantically active for a request must not inject turn-local noise into unrelated stable regions.

### CA-10 — Cache implementation remains failure-contained

If cache planning, cache hints, local memoization or receipt correlation fails, SimCore must prefer correct uncached execution over degraded semantics.

---

## 4. Architecture overview

The target architecture is:

```text
                    SEMANTIC AUTHORITIES
                           │
                           ▼
                 Prompt Semantic Inputs
                           │
                           ▼
                Prompt Segment Descriptor
                           │
                           ▼
                    Prompt Cache Plan
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      Canonical Prompt Layout     Cache Metadata Sidecar
              │                         │
              └────────────┬────────────┘
                           ▼
                 Semantic Request Envelope
                           │
                           ▼
                Provider Cache Adapter
                 /                    \
                /                      \
       implicit-prefix path      explicit-control path
                \                      /
                 \                    /
                           ▼
                        Provider
                           │
                           ▼
                    Provider Receipt
                           │
                           ▼
                Receipt Correlation Layer
                           │
                           ▼
                Cache Reliability Evidence
```

Supporting planes remain separate:

```text
C0 = Reuse / Prefix Observation
C1 = Provider Cache Evidence
C2 = Optional Local Deterministic Memo
C3 = Future Source/Object Cache, currently inactive
```

The prompt architecture and the cache evidence architecture compose, but neither owns semantic truth.

---

## 5. Prompt representation strategy

A full runtime rewrite into a new intermediate representation is **not** the first implementation step.

The compatibility-safe evolution path is:

```text
existing working prompt bytes
        ↓
shadow descriptors / metadata only
        ↓
prove classification and boundaries
        ↓
canonical equivalence harness
        ↓
only then consider compiler/serializer ownership changes
```

This preserves RCR-D01.

The architecture nevertheless defines a conceptual descriptor now so that observation and later implementation share one vocabulary.

### 5.1 `PromptSegmentDescriptorV1`

Conceptual fields:

```text
id
owner
semanticRole
stabilityClass
orderClass
modelVisibility
canonicalizationPolicy
semanticFingerprint
byteFingerprint
breakAuthority
providerHintEligibility
providerHintPolicy
sourceReference
```

The descriptor is metadata about prompt material.

It does not create prompt semantics.

### 5.2 `PromptCachePlanV1`

Conceptual fields:

```text
promptCacheAbiRevision
canonicalSerializerRevision
segments[]
longLivedStableFrontier
sessionStableFrontier
conversationReuseFrontier
expectedFirstDynamicSegment
expectedBreakOwner
providerPolicyClass
stablePrefixFingerprint
sessionPrefixFingerprint
conversationPrefixFingerprint
```

The cache plan is derived from current semantic input and current owning prompt structure.

It must not invent content or suppress required content.

---

## 6. Cache stability strata

A binary `stable / dynamic` split is useful but insufficient for long-term cache design.

Use lifetime strata.

### T0 — Host-fixed prefix outside SimCore

Examples may include host/system material not owned by SimCore.

SimCore may observe this layer but does not claim mutation authority over it.

```text
owner = HOST / EXTERNAL
cache role = prefix context
SimCore write authority = NONE unless separately contracted
```

### T1 — Long-lived SimCore ABI Core

This is the most durable model-visible SimCore skeleton.

Candidate content:

- foundational authority semantics,
- long-lived protocol rules,
- stable mode definitions,
- stable host-facing contracts,
- stable validation semantics.

Target lifecycle:

```text
many SimCore releases
```

A T1 rewrite requires strong semantic necessity.

### T2 — Additive Stable Extension Lane

New stable features prefer T2.

```text
T1 old core
+ T2 extension A
+ T2 extension B
```

New stable features should append at owned extension boundaries where semantics permit rather than reordering historical T1 bytes.

### T3 — Session-Stable Semantic Context

Values that are semantic but normally stable within a session/chat configuration may live here when host semantics permit.

Examples may include:

- session-selected stable configuration,
- character/profile semantics that remain unchanged in the current session,
- stable session policy choices.

T3 is not cross-version ABI identity.

A session configuration change may legitimately break at T3 while preserving T1/T2.

### T4 — Conversation Append-Only Prefix

Prior conversation history naturally grows.

Where the host/provider request representation permits longest-prefix reuse, the prior conversation can itself become a reusable prefix for the next turn.

The intended property is:

```text
request N prompt prefix
⊆
request N+1 historical prefix
```

for unchanged historical messages.

Manual edits, rerolls or history reconciliation may intentionally change T4 according to their owning semantics.

### T5 — Current Turn / Turn-Local Dynamic State

Examples:

- current user input,
- current mode selection when turn-local,
- current runtime state,
- current exposure/source job,
- current projection payload,
- current authority references,
- request-local facts.

T5 is expected to change frequently and is not the long-lived cache target.

### T6 — Observability / Transport-Only Metadata

Examples:

- request IDs,
- generation IDs,
- latency,
- telemetry counters,
- diagnostic nonces,
- provider cache hints,
- receipt correlation IDs where transport-only.

T6 must not silently leak upstream into T1/T2/T3 model-visible bytes.

---

## 7. Target prompt topology

The architecture target, subject to host semantics and evidence, is conceptually:

```text
[T0 HOST FIXED]
[T1 SIMCORE ABI CORE]
[T2 STABLE EXTENSIONS]
[T3 SESSION-STABLE CONTEXT]
[T4 CONVERSATION HISTORY]
[T5 CURRENT USER / TURN-LOCAL DYNAMIC]
```

Provider/host transport metadata remains outside this semantic sequence where possible.

A small turn-local SimCore tail may still exist after the current user if the host/runtime contract requires it.

The important property is:

```text
STABLE SIMCORE MATERIAL SHOULD NOT BE STRANDED
BEHIND AN EARLIER UNRELATED DYNAMIC BREAK
WHEN A SEMANTICALLY EQUIVALENT SAFE PLACEMENT EXISTS.
```

However, current production ordering is preserved until Cache Shadow and provider evidence justify a placement change.

---

## 8. Cache identity hierarchy

Do not overload one hash with all cache meanings.

Use layered identities.

### 8.1 `PromptCacheAbiRevision`

Owns stable semantic compatibility.

Changes only for an incompatible stable ABI change.

### 8.2 `StableCoreFingerprint`

Derived from canonical T1 bytes.

### 8.3 `StableExtensionFingerprint`

Derived from the ordered active T2 extension set and canonical bytes.

A new append-only extension changes this identity without requiring T1 churn.

### 8.4 `SessionStableFingerprint`

Derived from T3 semantic input.

### 8.5 `ConversationPrefixFingerprint`

Derived from the reusable T4 prefix under the current history/reconciliation contract.

### 8.6 Request identity

Request/generation identity is operational metadata and must not be confused with cache semantic identity.

### 8.7 Release identity

Runtime release version/name is deployment metadata unless a specific semantic contract proves otherwise.

---

## 9. Canonical serialization

The architecture requires deterministic serialization for cache-owned stable regions.

Conceptual component:

```text
CanonicalPromptSerializerV1
```

Required properties:

- stable section ordering,
- stable field ordering where order is not semantic,
- stable whitespace,
- stable newline policy,
- stable null/omission policy,
- stable escaping,
- stable string/number representation,
- stable array order only where semantic ordering is irrelevant.

### 9.1 Initial compatibility mode

The first canonicalization milestone should prove:

```text
current verified semantic fixture
→ current verified bytes
```

rather than immediately rewriting bytes into a prettier canonical form.

### 9.2 Canonicalization change gate

If current production contains equivalent-but-nondeterministic serialization, repair only the proven nondeterministic seam.

Do not reformat unrelated stable sections.

### 9.3 Release metadata firewall

A release version/name must not appear in an early stable prefix merely because it is convenient for diagnostics.

If model-visible release identity is required, classify it explicitly as:

- semantic ABI identity,
- session/dynamic metadata,
- or non-model-visible diagnostics.

---

## 10. Cache volatility firewall

The stable region must reject unowned volatile values.

Forbidden by default in T1/T2:

```text
wall-clock timestamp
requestId
generationId
random nonce
latency
telemetry counter
runtime boot identity
diagnostic timestamp
release publish timestamp
unordered object iteration
host-local transient bookkeeping
```

Regression invariant:

```text
same stable semantics
+ different operational noise
→ same T1/T2 bytes
```

If a volatile value genuinely changes stable semantics, that must be proven by the owning contract rather than assumed.

---

## 11. One semantic prompt, multiple cache transports

This is the core architecture rule for explicit and implicit caching.

```text
Prompt Cache Plan
        │
        ├─ implicit provider path
        │     uses deterministic prefix naturally
        │
        └─ explicit provider path
              adds provider-supported transport cache controls
```

The adapter must not maintain alternate semantic text templates.

### 11.1 Implicit caching path

Implicit caching consumes:

- deterministic prefix bytes,
- stable ordering,
- longest-prefix continuity,
- stable message/content representation.

SimCore's job is eligibility and continuity.

Provider policy remains provider-owned.

### 11.2 Explicit caching path

Where a provider supports explicit cache controls, the adapter may map semantic cache strata to provider transport features such as:

- cacheable content boundaries,
- provider cache-control annotations,
- stable routing/cache keys,
- provider-supported cache lifetime classes.

These are transport features only.

### 11.3 Provider adapter invariant

```text
strip provider cache metadata
→ semantic request content must remain equivalent
```

A provider adapter failure must fall back to uncached semantic execution unless the provider requires cache metadata for correctness, which would need a separate explicit contract.

---

## 12. Provider capability abstraction

Do not hard-code one provider's current cache feature set into Prompt Cache ABI semantics.

Conceptual capability record:

```text
ProviderCacheCapabilitiesV1

implicitPrefixCacheSupported
explicitCacheControlSupported
stableCacheKeySupported
cacheLifetimeControlSupported
providerReceiptSupported
minimumCacheableUnitKnown
transportOnlyMarkersSupported
```

Unknown capability remains `UNKNOWN` rather than being guessed.

The provider adapter chooses the narrowest supported transport realization.

Prompt semantics remain provider-independent where possible.

---

## 13. Break frontier and invalidation model

Prefix caching has ordered invalidation consequences.

Define:

```text
BreakFrontier
= earliest segment whose canonical semantic bytes changed
```

Everything before the frontier remains reusable in principle.

Everything after the frontier may need recomputation/re-cache under longest-prefix semantics.

### 13.1 Expected break examples

```text
T1 semantic ABI change
→ break at T1
→ downstream prefix invalidated

new T2 additive extension
→ historical T1 remains reusable
→ new combined prefix begins at T2 extension

T3 session configuration change
→ T1/T2 preserved
→ break at T3

new user turn
→ earlier stable/history prefix preserved where host representation permits
→ break at current-turn T5
```

### 13.2 Break reasons

Conceptual reason set:

```text
ABI_SEMANTIC_CHANGE
STABLE_EXTENSION_CHANGE
SESSION_SEMANTIC_CHANGE
HISTORY_APPEND
HISTORY_EDIT_RECONCILE
CURRENT_USER_CHANGE
TURN_STATE_CHANGE
HOST_PREFIX_CHANGE
PROVIDER_EVICTION_OR_POLICY
UNKNOWN_EARLY_BREAK
```

`UNKNOWN_EARLY_BREAK` is not silently treated as acceptable.

### 13.3 No TTL-as-truth

Provider TTL/eviction is external cache lifecycle.

Semantic invalidation should prefer exact semantic identity/fingerprint changes over arbitrary TTL where SimCore owns the data.

---

## 14. Reuse observation plane

Current `runtimePromptCache` remains conceptually in the observation plane.

Preferred role:

```text
RuntimePromptReuseObserver
```

It should report, not manufacture, cache behavior.

Required observation model:

```text
StablePrefixHash
StablePrefixBytes
StablePrefixTokens
CommonPrefixBytes
CommonPrefixTokens
FirstChangedSegment
FirstChangedByte
FirstBreakOwner
FirstBreakReason
ExpectedBreakFrontier
ActualBreakFrontier
CacheShadow
FreshWarmClass
ReloadContinuity
ObserverCostMs
```

### 14.1 Observer correctness

Observer state is diagnostic evidence, not semantic authority.

Reload handoff of observer state must not mutate prompt semantics.

### 14.2 Cold-path attribution

The parked Cache Observer cold-path program remains useful for decomposing `PROMPT_ACCOUNTING`.

No single cold subspan is declared causal until measured.

---

## 15. Cache Shadow

Define:

```text
CACHE_SHADOW
=
stable reusable bytes exist
+
an earlier unrelated dynamic break prevents those bytes from contributing to provider prefix reuse
```

Current production prompt ordering may expose this condition.

Cache Shadow is evidence, not automatic authorization for reordering.

### Placement optimization gate

A prompt placement change opens only when all are true:

```text
1. repeated Cache Shadow exists,
2. provider cache evidence confirms meaningful lost reuse,
3. the lost reuse is materially owned by SimCore placement,
4. a semantic-equivalent placement exists,
5. regression coverage can protect instruction precedence and host behavior.
```

If any condition fails, preserve the working layout.

---

## 16. Provider cache evidence plane

Provider-side truth should be correlated, not guessed.

Conceptual state model:

```text
NOT_ELIGIBLE
ELIGIBLE_UNVERIFIED
WRITE_CONFIRMED
READ_CONFIRMED
READ_ZERO
PROVIDER_UNAVAILABLE
PROVIDER_CONFLICT
```

`PROVIDER_UNAVAILABLE` is not `READ_ZERO`.

### 16.1 `CacheReceiptObservationV1`

Conceptual fields:

```text
requestCorrelationId
provider
providerRequestIdentity if available
cacheReadEvidence
cacheWriteEvidence
cacheReadTokens if available
cacheWriteTokens if available
cachedContentTokens if available
receiptSource
observedAt
confidenceClass
```

### 16.2 Correlation rollout

Preferred initial order:

```text
manual/offline correlation
→ repeated operational need proven
→ optional read-only bridge
```

Do not duplicate an existing gateway/log observer inside SimCore merely for convenience.

---

## 17. Local deterministic memo plane

Local memoization is secondary to provider prompt caching.

It is opened only for expensive pure deterministic computation that profiling proves material.

Allowed candidate classes:

- stable prompt serialization,
- schema compilation,
- deterministic token/accounting fragments,
- pure formatting artifacts.

Disallowed by default:

- canonical world state,
- current authority,
- source truth,
- current exposure decision,
- unvalidated model output,
- mutable interaction state.

### 17.1 Local memo identity

A local memo identity may include:

```text
producerSchemaRevision
semanticInputFingerprint
promptCacheAbiRevision
canonicalSerializerRevision
hostAbiRevision
```

Release version is included only if the computation genuinely depends on release-specific semantics.

### 17.2 Shared memo ownership

```text
REFERENCE REUSE
!=
MUTATION OWNERSHIP
```

Shared memo values are immutable from consumers unless shared mutable ownership is explicitly contracted.

---

## 18. Reload, reroll and edit behavior

Cache reliability must preserve current lifecycle semantics.

### Reload

If stable semantics are unchanged:

```text
reload
→ same stable bytes
→ same Prompt Cache ABI identity
```

Observer state may be restored for continuity, but provider cache existence remains provider-owned.

### Reroll

Reroll changes only the lifecycle surfaces owned by reroll semantics.

It must not create unrelated stable-prefix churn.

### Manual edit

A genuine historical edit may intentionally alter T4 conversation prefix from the edited point onward.

That is an owned break, not an unintended cache regression.

### Representation-only drift

Representation reconciliation must not rewrite semantic cache identity when the owning runtime contract says semantics are unchanged.

---

## 19. Cross-version evolution

Every future model-visible SimCore release is classified against Prompt Cache ABI.

Allowed classifications:

```text
CACHE_ABI_COMPATIBLE
CACHE_ABI_COMPATIBLE_WITH_ADDITIVE_EXTENSION
CACHE_ABI_LOCALIZED_BREAK
CACHE_ABI_BREAK_REQUIRED
```

Normal expectation:

```text
release changes often
T1 stable core changes rarely
Prompt Cache ABI revision changes exceptionally
```

### 19.1 Additive feature rule

Preferred pattern:

```text
OLD T1 CORE
+ NEW T2 EXTENSION
+ EXISTING LATER STRATA
```

not:

```text
REWRITE / REORDER OLD T1 CORE
+ NEW FEATURE
```

### 19.2 Dormant feature rule

If a new feature is not semantically relevant to a request, its runtime noise must not perturb historical stable bytes.

### 19.3 Intentional ABI break record

A true break requires:

```text
old Prompt Cache ABI revision
new Prompt Cache ABI revision
semantic incompatibility reason
first changed stable segment
expected cache consequence
upgrade/rollback boundary
regression evidence
```

---

## 20. Feature onboarding contract

Any future SimCore feature that can change model-visible prompt content must answer before implementation:

```text
1. Who owns the semantics?
2. Which cache stratum owns the content?
3. Does it change existing T1 semantics?
4. Can stable definitions be T2 additive extensions?
5. Which values are T5 turn-local selections?
6. What is the earliest intended changed segment?
7. Does it require Prompt Cache ABI revision?
8. Does a dormant scenario preserve historical prefix bytes?
9. Does the provider adapter need any new transport capability?
10. What regression proves unrelated working scenarios remain unchanged?
```

No feature receives permission to rewrite the stable skeleton merely because co-locating prose is aesthetically cleaner.

---

## 21. 3.0M / Post-3M integration boundary

The Post-3M design corpus may define future runtime behavior, but cache architecture treats future runtime enablement as feature onboarding.

Potential stable candidates, once separately runtime-authorized, may include:

- Source Intelligence family definitions,
- validator contracts,
- presentation/renderer semantic contracts,
- stable orchestration definitions.

Potential dynamic candidates may include:

- active source family,
- current source job,
- current assertions,
- current projection,
- current authority/provenance references.

The cache requirement is:

```text
future feature enablement
→ extend owned cache strata
→ preserve unrelated historical prefix
```

not:

```text
future feature enablement
→ rebuild the entire prompt skeleton
```

---

## 22. Candidate C / source-object cache separation

Prompt caching does not create source history.

```text
PROMPT CACHE CONTINUITY
!=
SOURCE HISTORY CONTINUITY
```

A future persistent Source/Object Cache, if ever authorized, must be designed behind a durable store contract.

Required distinction:

```text
Durable Source Store
= semantic persistence owner

Source/Object Cache
= performance derivative of that store
```

Cache miss must never mean semantic absence.

Until Candidate C or an equivalent persistence capability is runtime-authorized:

```text
SourceHistoryCache = NONE
CrossTurnSourceObjectCache = NONE
```

---

## 23. Failure containment

Caching is an optimization/compatibility layer and must fail toward correctness.

### 23.1 Cache plan failure

```text
cache plan unavailable
→ use correct semantic prompt without optimization metadata
```

### 23.2 Provider adapter failure

```text
cache transport hint failure
→ retry/fallback only under existing request policy
→ never delete required semantic prompt content
```

### 23.3 Observer failure

```text
observer unavailable
→ semantics continue
→ cache evidence becomes UNKNOWN
```

### 23.4 Receipt correlation failure

```text
receipt missing / cannot correlate
→ ELIGIBLE_UNVERIFIED or PROVIDER_UNAVAILABLE
→ never fabricate HIT/MISS
```

### 23.5 Local memo failure

```text
memo miss / corruption / version mismatch
→ recompute from semantic owner
```

---

## 24. Security and privacy boundary

Cache architecture must not broaden sensitive-data retention.

Provider caching is governed by the provider/request contract and existing product privacy/security policy.

Local diagnostics should prefer:

- fingerprints,
- bounded sizes/counts,
- segment identities,
- provider receipt summaries,

rather than raw full prompt retention where not already authorized.

Cache correlation IDs must not become a new user-secret or cross-context identity mechanism.

---

## 25. Compatibility test architecture

The mature Cache ABI requires four test families.

### Family A — Deterministic semantic fixtures

Required cases:

```text
same semantics / different request id
same semantics / different telemetry
same semantics / reload
same semantics / internal refactor
same semantics / release-version bump
same semantics / diagnostics change
```

Expected:

```text
T1/T2 bytes identical
```

### Family B — Owned break fixtures

Required cases:

```text
stable ABI semantic change
new stable additive extension
session configuration change
current mode selection change
user turn change
manual historical edit
```

Expected:

```text
actual break frontier
=
owned expected frontier
```

### Family C — Cross-version fixtures

Required cases:

```text
N → N+1 compatible patch
N → N+1 internal refactor
N → N+1 dormant feature
N → N+1 additive stable feature
N → N+1 intentional localized break
N → N+1 intentional ABI break
N → N+1 → rollback N
```

### Family D — Real provider evidence

Controlled cold/warm scenarios should correlate:

```text
SimCore eligibility
+ first-break evidence
+ provider receipt
+ latency/token accounting
```

Provider results are evidence, not deterministic unit-test truth.

---

## 26. Long-chat reliability matrix

Cache closure must include real lifecycle coverage, not only synthetic prefix fixtures.

At minimum:

```text
ordinary long continuation
fresh cold → warm
Mode A
Mode B_START / B_CONTINUE / B_END
Mode C
reroll
manual edit
reload/refresh
telemetry adoption
representation reconciliation
long history growth
upgrade / compatible release
rollback where supported
```

For each scenario record:

```text
semantic correctness
stable-prefix identity
expected break frontier
actual break frontier
Cache Shadow state
provider receipt state where available
```

---

## 27. Reliability metrics

Primary structural metrics:

```text
StableCoreByteIdentityRate
StableExtensionPrefixPreservationRate
UnintendedEarlyBreakRate
ExpectedBreakFrontierAccuracy
ReloadStablePrefixIdentityRate
CrossVersionCompatiblePrefixIdentityRate
CacheShadowRate
```

Provider evidence metrics:

```text
ProviderReadConfirmationRate
ProviderWriteConfirmationRate
CachedInputTokenRatio where available
EligibleButReadZeroRate
ProviderEvidenceUnavailableRate
```

Performance metrics:

```text
ObserverColdMs
ObserverWarmMs
PromptAccountingSubspanMs
ColdWarmLatencyDelta
LocalMemoComputeAvoidedMs when local memo exists
```

No arbitrary target threshold is frozen before baseline evidence.

The deterministic target is simpler:

```text
UNINTENDED EARLY BREAK
→ ZERO IN THE QUALIFIED DETERMINISTIC MATRIX
```

Provider hit rate remains provider/environment dependent and is evaluated empirically.

---

## 28. Rollout sequence

The rollout intentionally preserves the current working runtime until evidence justifies each next mutation.

### CACHE-A0 — Fresh authority / S7 handoff preflight

Verify:

- exact production authority,
- current cumulative S7 candidate assumptions,
- current prompt-generation owner paths,
- current host placement,
- current provider evidence availability,
- current cross-version Cache ABI docs.

No runtime mutation.

### CACHE-A1 — Shadow Cache Manifest

Add observational segment classification without changing model-visible prompt bytes.

Target output:

```text
PromptSegmentDescriptorV1[]
PromptCachePlanV1
```

No placement change.

No provider-specific cache control.

### CACHE-A2 — Deterministic ABI fixture harness

Capture representative current working prompt fixtures and exact stable regions.

Prove runtime noise classification.

No semantic byte rewrite.

### CACHE-A3 — Canonical serializer equivalence lock

Only if needed, consolidate stable serialization behind one owner while reproducing already-qualified bytes first.

Any byte change requires its own evidence and owned reason.

### CACHE-A4 — Observer cold-cost exact attribution

Resume the technically valid cold-path attribution design under a fresh runtime release identity selected above current production at execution time.

Measure observer/accounting subspans.

Do not optimize unknown suspects.

### CACHE-A5 — Provider receipt correlation

Correlate Cache ABI eligibility with provider cache read/write evidence.

Start manual/offline.

### CACHE-A6 — Provider Cache Adapter

Introduce transport-only explicit cache hints only for providers where:

- capability is proven,
- semantics remain identical,
- fallback is safe,
- provider receipt can validate behavior where available.

Implicit caching continues to use the same semantic prompt.

### CACHE-A7 — Cache Opportunity Attribution

Combine:

```text
break frontier
+ Cache Shadow
+ provider receipt
+ token/latency impact
```

Classify whether SimCore owns a material remaining gap.

### CACHE-A8 — Targeted Placement / Serialization Repair

Open only the proven seam.

Possible outcomes:

```text
NO MATERIAL SIMCORE-OWNED GAP
→ STOP / PRESERVE

SERIALIZATION GAP
→ repair serializer seam only

PLACEMENT GAP
→ repair placement seam only

LOCAL COMPUTE GAP
→ memoize measured pure computation only
```

### CACHE-A9 — Reliability Closure

Run deterministic, cross-version and real long-chat matrices.

Require zero unexplained early stable-prefix breaks in deterministic coverage.

### CACHE-A10 — Feature Onboarding Gate

After Cache ABI reliability is established, future SimCore feature/runtime programs must classify model-visible changes against the cache architecture before implementation.

---

## 29. Explicit versus implicit cache success criteria

### Implicit cache success

SimCore can claim structural success when:

```text
same semantic prefix
→ same canonical bytes
→ no unintended earlier break
```

Actual provider reuse is confirmed only from provider evidence.

### Explicit cache success

SimCore can claim adapter success when:

```text
same semantic prompt
+
provider-supported cache transport metadata
→ semantic equivalence preserved
→ provider accepts request
→ provider evidence confirms expected cache behavior where observable
```

### Combined mature state

```text
one semantic prompt
stable long-lived skeleton
localized owned breaks
provider-independent semantic ABI
provider-specific transport adapters
provider evidence for actual reuse
```

---

## 30. Anti-goals

Do not:

- create `CacheManager 2.0` as a monolith,
- maintain separate explicit-cache and implicit-cache prompt templates,
- use release version as the primary stable cache key,
- rewrite working stable prompt prose for cosmetic consistency,
- preallocate giant unused prompt blocks solely for caching,
- infer provider HIT from local prefix similarity,
- treat provider eviction as SimCore semantic failure,
- treat cache miss as empty/absent semantic state,
- create Candidate C/source persistence through cache work,
- add local memoization without measured value,
- reorder prompt placement before Cache Shadow and provider evidence justify it,
- sacrifice correctness for cache continuity.

---

## 31. Design review checklist for any future prompt change

Every future model-visible SimCore change should eventually answer:

```text
Current working baseline identified? YES / NO
Existing healthy behavior preserved? YES / NO
Semantic owner identified? YES / NO
Cache stratum identified? T1 / T2 / T3 / T4 / T5 / external
Stable core changed? YES / NO
Stable extension added? YES / NO
Dynamic-only change? YES / NO
Earliest intended break segment?
Prompt Cache ABI revision changed? YES / NO
Release version changed independently? YES / NO
Canonical bytes regression tested? YES / NO
Dormant scenario preserves unrelated prefix? YES / NO
Provider adapter impact? NONE / IMPLICIT / EXPLICIT / BOTH
Provider evidence needed? YES / NO
Rollback/cache consequence understood? YES / NO
```

If the change cannot answer these questions, it is not ready to claim Cache ABI compatibility.

---

## 32. Architecture closure

The architecture is frozen as:

```text
PRESERVE WORKING PROMPT SEMANTICS.

CLASSIFY PROMPT MATERIAL BY LIFETIME AND OWNERSHIP.

KEEP A LONG-LIVED T1 CORE.
EXTEND WITH T2 RATHER THAN REWRITE T1.
KEEP TURN-LOCAL NOISE DOWNSTREAM.

ONE SEMANTIC PROMPT.
ONE CACHE PLAN.
IMPLICIT AND EXPLICIT CACHE TRANSPORTS SHARE IT.

RELEASE VERSION IS NOT CACHE ABI IDENTITY.

MEASURE THE BREAK FRONTIER.
CONFIRM PROVIDER TRUTH FROM RECEIPTS.

OPTIMIZE ONLY A PROVEN SIMCORE-OWNED GAP.

WHEN A REPAIR WORKS,
MAKE IT THE NEXT PRESERVED BASELINE.
```

The intended long-term result is not that SimCore "uses a cache".

The intended result is that SimCore becomes a runtime whose prompt skeleton is sufficiently deterministic, compatible and evolution-safe that provider prompt caching remains the normal eligible outcome across turns, reloads and future compatible versions.