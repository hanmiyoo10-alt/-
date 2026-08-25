# SimCore Gemini Cache Compatibility Key — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · SHARED COMPARABILITY CONTRACT · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_COMPILER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_TRANSITION_MODEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_GEMINI_PROMPT_STABILITY_MANIFEST_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define one shared comparability contract so Baseline Profile, Verdict Transition Model, Regime Ledger, Admission Policy, diagnostics, and future cache research do not each invent a slightly different meaning for:

```text
"these two requests are compatible enough to compare"
```

The Cache Compatibility Key answers:

```text
Which stable dimensions identify the request population?
Which dimensions must match exactly?
Which dimensions may be compatible by family/class rather than exact string equality?
Which dimensions are optional evidence rather than universal split axes?
What happens when a dimension is unknown?
Why were two samples considered compatible or incompatible?
```

It is a comparison/validation contract only. It does not infer provider cache HITs, mutate prompts, learn baselines, or create cache regimes.

## 2. Constitutional boundary

Permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Compatibility Key may classify bounded request metadata for comparison. It must never:

```text
write or rewrite model prose
rewrite chat history
move prompt sections automatically
change model instructions for cache reasons
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

Compatibility metadata must remain observational and sidecar-only.

## 3. Architecture decision — descriptor first, digest second

Do not define compatibility as one opaque hash with no explainable dimensions.

Preferred model:

```text
CacheCompatibilityDescriptor
= typed bounded dimensions

compatibilityKeyDigest
= deterministic digest of canonical comparable dimensions
```

The digest is useful for:

```text
fast equality/indexing
bounded telemetry
compact diagnostics
```

but it is not the semantic authority by itself.

When two requests are incompatible, diagnostics should be able to say:

```text
request family mismatch
model family incompatible
Cache ABI context incompatible
```

rather than only:

```text
key abc != key def
```

## 4. Do not put CACHE_REGIME into the mandatory identity key

This is a critical anti-circularity rule.

The Regime Ledger exists to detect when the normal cache behavior changes inside an otherwise comparable request population.

If compatibility required:

```text
regimeId A == regimeId B
```

before requests could be compared, then a new regime could not be detected until it had already been identified.

Therefore:

```text
Compatibility Key
= structural/comparison identity

CACHE_REGIME
= temporal normal-state annotation over a compatible population
```

A consumer may attach current/expected regime context as a separate gate after structural compatibility, but `regimeId` must not be the universal mandatory equality dimension.

Conceptual:

```text
same structural compatibility key
+ old baseline no longer fits
+ repeated trusted new behavior
→ possible REGIME_CHANGE candidate
```

This relationship is intentionally possible.

## 5. Initial descriptor dimensions

The first design should remain small and evidence-driven.

Candidate dimensions:

```text
schemaVersion
chatScopeDigest
requestFamily
providerFamily
modelFamily
cacheAbiStableIdentity
cacheAbiSlowIdentity
promptPlacementContract
optionalRouteScopeClass
optionalRuntimeClass
```

Not every field must become a hard split axis in v1.

### 5.1 `chatScopeDigest`

Purpose:

```text
prevent samples from different chats/locations from sharing one learned baseline or temporal incident
```

Requirements:

```text
bounded
privacy-preserving
no raw chat name/text
stable for the intended chat/location scope
```

This is normally a hard compatibility boundary for Baseline/Transition state.

### 5.2 `requestFamily`

Initial known family vocabulary may include:

```text
C
B_START
B_CONTINUE
B_END
```

The exact runtime family taxonomy should come from existing SimCore semantics, not be reinvented by the cache layer.

Do not automatically split on every semantic flag.

Example default:

```text
secondary active/inactive
summary scope
other semantic variation
```

should not become separate compatibility dimensions unless real cache evidence shows materially different request topology/cache behavior.

### 5.3 `providerFamily`

Current research scope is Gemini implicit caching.

Conceptually:

```text
providerFamily = GEMINI
```

A future provider change is incompatible for Gemini-specific learned baselines unless explicitly researched.

Do not build a premature multi-provider abstraction merely for this key.

### 5.4 `modelFamily`

Model compatibility should use an authoritative normalized family when available.

Do not blindly require exact raw model-string equality if the gateway uses aliases that are proven cache-compatible; likewise do not collapse materially different Gemini model families merely because their names look related.

Initial conservative posture:

```text
verified same normalized model family
→ compatible candidate

unknown alias relationship
→ UNKNOWN / do not assume compatible

known materially different family
→ incompatible
```

Normalization rules must be evidence-backed and deterministic.

### 5.5 `cacheAbiStableIdentity`

Represents the stable cache-critical SimCore prompt contract when a Prompt Stability Manifest / Guardian identity exists.

Important nuance:

```text
stable ABI SAME
→ strong compatibility evidence

stable ABI deliberately changed
→ prior baseline may become STALE / RESET_REQUIRED
```

However a declared Cache ABI change does not itself prove provider cache degradation or a new regime.

### 5.6 `cacheAbiSlowIdentity`

Same principle as stable identity, but for slow-changing cache-critical material.

Whether slow-identity change is a hard incompatibility for every consumer should be consumer-policy driven and fixture-tested.

Baseline learning may need a stricter gate than exploratory diagnostics.

### 5.7 `promptPlacementContract`

Current architecture places SimCore at `TAIL_AFTER_CURRENT_USER`.

A future deliberate placement architecture change could alter the meaning of prefix/cache comparisons even if some segment bytes remain identical.

Therefore the compatibility descriptor should be able to encode a bounded placement/topology contract identity.

Do not derive it from raw prompt content.

### 5.8 `optionalRouteScopeClass`

Gateway route/cache-scope metadata may materially affect cache reuse, but only when the gateway exposes it authoritatively.

Rule:

```text
authoritative route/scope class available
→ may participate in compatibility

not available
→ UNKNOWN / omitted according to consumer policy
```

Never invent route identity from timing or cache ratio.

### 5.9 `optionalRuntimeClass`

Examples may include:

```text
STEADY
FIRST_AFTER_RELOAD
```

The Baseline Profile previously identified reload class as a possible family axis.

Do not make it a universal split by default.

Use it only if live evidence shows first-after-reload requests have a distinct, repeatable cache behavior that is useful to model separately.

Runtime generation ID itself should not become a compatibility key dimension; that would fragment every reload into a new population.

## 6. Exact equality is not the whole compatibility model

Some dimensions require exact equality, while others may have family-level compatibility.

Therefore the system should expose a comparison result rather than only:

```text
keyA === keyB
```

Candidate result vocabulary:

```text
EXACT_COMPATIBLE
COMPATIBLE_WITHIN_FAMILY
INCOMPATIBLE
UNKNOWN_COMPATIBILITY
NOT_COMPARABLE
```

### EXACT_COMPATIBLE

All currently required dimensions are exact-compatible under the active schema/policy.

### COMPATIBLE_WITHIN_FAMILY

At least one dimension differs in raw representation but is covered by an explicit deterministic compatibility rule.

Example only after evidence:

```text
raw model alias differs
normalized authoritative model family same
```

### INCOMPATIBLE

A required dimension is known to conflict.

### UNKNOWN_COMPATIBILITY

Required compatibility cannot be established because a relevant dimension is unavailable or its relationship is unverified.

Unknown must not silently become compatible.

### NOT_COMPARABLE

The two observations are outside the intended comparison domain, for example different chat scopes or non-Gemini evidence in this Gemini-specific track.

## 7. Explainable dimension result

Preferred comparison output:

```text
compatibilityClass: EXACT_COMPATIBLE
keyDigest: ...
reasons:
- CHAT_SCOPE_SAME
- REQUEST_FAMILY_SAME
- GEMINI_MODEL_FAMILY_SAME
- STABLE_ABI_SAME
- SLOW_ABI_SAME
- PLACEMENT_CONTRACT_SAME
unknownDimensions: []
```

Incompatible example:

```text
compatibilityClass: INCOMPATIBLE
reasons:
- CHAT_SCOPE_SAME
- REQUEST_FAMILY_SAME
- MODEL_FAMILY_CHANGED
- STABLE_ABI_SAME
```

Unknown example:

```text
compatibilityClass: UNKNOWN_COMPATIBILITY
reasons:
- CHAT_SCOPE_SAME
- REQUEST_FAMILY_SAME
- MODEL_FAMILY_UNVERIFIED
```

Avoid opaque confidence scores.

## 8. Consumer-specific strictness

One descriptor can support several consumers, but consumers may require different minimum compatibility.

Do not create separate incompatible key formats for every component.

### Baseline Profile

Initial conservative posture:

```text
same chat scope
+ compatible request family
+ compatible Gemini model family
+ compatible stable Cache ABI
+ compatible slow Cache ABI according to baseline policy
+ compatible placement contract
→ sample may enter the same baseline population
```

If a critical dimension is unknown:

```text
baseline learning
→ HOLD / reject sample from mutation
```

Diagnostics may still display it.

### Verdict Transition Model / Sentinel

A verdict may update an active temporal incident only when the current request is compatible with the incident population.

Example:

```text
C regression
+ B_START healthy
→ B_START must not count as recovery for the C incident
```

Likewise an incompatible model-family request must not increment persistence or recovery counters for the previous model family.

### Regime Ledger

Regime detection intentionally uses structural compatibility while allowing regime identity itself to change.

Conceptual:

```text
same Compatibility Key population
+ sustained new baseline
→ REGIME HANDOFF CANDIDATE
```

If the structural key changes materially, the prior baseline may simply become incompatible/stale rather than proving an in-place regime transition.

### Admission Policy

Compatibility is evaluated before evidence-strength admission for historical comparison claims.

Conceptual order:

```text
COMPATIBILITY
→ EVIDENCE QUALITY
→ CONSUMER ADMISSION
```

An exact provider receipt from an incompatible request population is still not a valid baseline comparison sample.

### Receipt Correlator

The Compatibility Key must not become request identity.

It may filter obviously incompatible candidate receipts using authoritative model/provider metadata, but:

```text
same compatibility key
!=
same gateway request
```

Request correlation remains owned by the Cache Receipt Correlator.

## 9. Canonicalization and digest rules

If a digest is used, canonical serialization must be deterministic.

Requirements:

```text
fixed field order
explicit schemaVersion
stable enum spellings
no timestamps
no runtime generation IDs
no random values
no machine paths
no raw user/history text
```

Conceptual canonical payload:

```json
{
  "schemaVersion": 1,
  "chatScopeDigest": "...",
  "requestFamily": "C",
  "providerFamily": "GEMINI",
  "modelFamily": "...",
  "cacheAbiStableIdentity": "...",
  "cacheAbiSlowIdentity": "...",
  "promptPlacementContract": "TAIL_AFTER_CURRENT_USER"
}
```

Optional dimensions should be handled explicitly so omission does not accidentally collide with a known value.

Example:

```text
routeScopeClass: UNKNOWN
```

may be preferable to silently dropping the field when the active schema treats it as relevant.

## 10. Key evolution / schema versioning

Compatibility semantics will likely evolve as real Gemini/gateway evidence arrives.

Therefore:

```text
compatibilitySchemaVersion
```

must be explicit.

A schema bump does not automatically mean all old observations are unusable.

Possible migration result:

```text
old descriptor can be deterministically upgraded
→ compare under new schema

cannot be safely upgraded
→ UNKNOWN_COMPATIBILITY / baseline stale
```

Do not silently reinterpret old keys with new semantics.

## 11. Avoid over-segmentation

The key must not become a giant tuple containing every available SimCore state bit.

Bad direction:

```text
mode
secondary flag
summary flag
broadcast subtype
reload generation
warning count
request index
runtime epoch
frame detail
... dozens more
```

That would create sparse populations where almost no two requests are comparable.

Required rule:

> Add a compatibility dimension only when it represents a real cache-topology/contract boundary or live evidence demonstrates repeatable cache-behavior separation.

This is the same evidence-first principle used by Baseline family splitting.

## 12. Avoid under-segmentation

The opposite failure is also dangerous.

Bad direction:

```text
chat scope only
```

Then:

```text
C
B_START
B_CONTINUE
B_END
model-family changes
declared stable ABI changes
```

could all contaminate one baseline/incident sequence.

The key should be the smallest set of dimensions that protects meaningful comparability.

## 13. Key vs Cache ABI Manifest

Do not duplicate the full Prompt Stability Manifest inside every runtime compatibility descriptor.

Preferred relationship:

```text
Prompt Stability Manifest
= detailed CI/release contract

Compatibility Key
= bounded stable/slow ABI identity derived from that contract when available
```

No raw segment manifest is required for ordinary runtime comparison.

If detailed attribution is needed after a mismatch, diagnostics can follow the ABI identity into Segment Identity / Guardian evidence.

## 14. Key vs Evidence Chain

The Evidence Chain should preserve:

```text
compatibility descriptor identity/digest
compatibility result
reason codes
consumer policy used
```

when compatibility materially affects a verdict or transition.

It must not retain raw chat text merely to reconstruct the key later.

## 15. Suggested reason codes

Candidate vocabulary:

```text
CK_CHAT_SCOPE_SAME
CK_CHAT_SCOPE_DIFFERENT
CK_REQUEST_FAMILY_SAME
CK_REQUEST_FAMILY_COMPATIBLE
CK_REQUEST_FAMILY_DIFFERENT
CK_PROVIDER_GEMINI
CK_MODEL_FAMILY_SAME
CK_MODEL_FAMILY_COMPATIBLE
CK_MODEL_FAMILY_DIFFERENT
CK_MODEL_FAMILY_UNKNOWN
CK_STABLE_ABI_SAME
CK_STABLE_ABI_CHANGED
CK_STABLE_ABI_UNKNOWN
CK_SLOW_ABI_SAME
CK_SLOW_ABI_CHANGED
CK_SLOW_ABI_UNKNOWN
CK_PLACEMENT_SAME
CK_PLACEMENT_CHANGED
CK_ROUTE_SCOPE_SAME
CK_ROUTE_SCOPE_CHANGED
CK_ROUTE_SCOPE_UNKNOWN
CK_RUNTIME_CLASS_SAME
CK_RUNTIME_CLASS_DIFFERENT
CK_RUNTIME_CLASS_IGNORED_BY_POLICY
CK_SCHEMA_UPGRADE_REQUIRED
CK_SCHEMA_INCOMPATIBLE
```

Reason codes are compatibility explanations, not defect severities.

## 16. Deterministic comparison function candidate

Preferred conceptual API:

```text
compareCacheCompatibility(
  descriptorA,
  descriptorB,
  consumerPolicy
)
→ {
  compatibilityClass,
  canonicalKeyDigestA,
  canonicalKeyDigestB,
  reasons[],
  unknownDimensions[]
}
```

The comparator should be:

```text
deterministic
side-effect free
network-free
prompt-free
replayable in fixtures
```

It must not mutate Baseline Profile, Sentinel state, Regime Ledger, or provider data.

## 17. Conformance Matrix integration

The Cache Conformance Matrix should eventually freeze compatibility behavior before it freezes downstream transitions.

Minimum compatibility fixture families should include:

```text
1. identical descriptors
   → EXACT_COMPATIBLE

2. same chat + same C family + same model/ABI
   → compatible baseline sample

3. C vs B_START
   → incompatible for C incident recovery by default

4. same chat/family but known different Gemini model family
   → INCOMPATIBLE

5. same chat/family/model but undeclared stable ABI change
   → incompatible/stale baseline context

6. declared stable ABI change
   → old baseline not silently reused; provider regression not inferred

7. same structural key across sustained cache-level shift
   → regime change may be detected

8. same regimeId not required for structural compatibility

9. missing required model-family evidence
   → UNKNOWN_COMPATIBILITY, not compatible

10. runtime generation changes only
    → does not automatically change compatibility population

11. first-after-reload runtime class ignored by policy
    → same population

12. evidence later proves reload class materially distinct
    → policy can split without changing unrelated dimensions

13. route scope unavailable
    → no fabricated route identity

14. same compatibility key but different gateway request IDs
    → Correlator must not treat as same request

15. deterministic descriptor twice
    → byte-identical canonical digest

16. no raw prompt/chat text in descriptor or report

17. renderer boundary unchanged
```

## 18. Privacy / boundedness

Never include:

```text
raw user input
raw assistant output
raw chat history
full prompt body
full gateway row
chat title when avoidable
```

Use bounded digests/enums/contract identities only.

The descriptor should remain small enough for short-horizon telemetry and fixture replay.

## 19. Non-goals

```text
provider request identity replacement
cache-hit prediction
explicit cache management
prompt rewriting
history normalization
provider routing
full semantic-state fingerprinting
per-turn giant context hash
forcing every semantic flag into a baseline split
new persistence authority
new release authority
renderer behavior
```

## 20. Recommended implementation order

```text
freeze compatibility dimensions from live evidence
→ define compatibility schema v1
→ implement deterministic descriptor builder/comparator in dedicated work item
→ add compatibility fixtures to Cache Conformance Matrix
→ wire Baseline admission to shared comparator
→ wire Transition/Sentinel to shared comparator
→ verify Regime Ledger uses structural compatibility without circular regime equality
→ only then retire duplicated local compatibility checks
```

Do not mix this implementation with a semantic SimCore feature or release-system restructuring.

## 21. Current classification

```text
GEMINI_CACHE_COMPATIBILITY_KEY
= HIGH VALUE
= SHARED COMPARABILITY CONTRACT
= DETERMINISTIC / EXPLAINABLE TARGET
= ANTI-OVERSEGMENTATION
= ANTI-CIRCULAR REGIME DESIGN
= NO RUNTIME CHANGE TODAY
= NO PROMPT BYTE CHANGE
= NO NEW PERSISTENCE AUTHORITY
```
