# SimCore Gemini Cache Evidence Chain — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · REQUEST-LEVEL CACHE PROVENANCE · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_RECEIPT_CORRELATOR_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_OPPORTUNITY_ANALYZER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_GEMINI_PROMPT_STABILITY_MANIFEST_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Create a bounded provenance lineage for each cache-relevant request so any strong cache conclusion can answer:

```text
What was observed directly?
Which evidence source produced each fact?
Which facts were correlated to this request?
Which derived analyses consumed those facts?
What exact evidence supports the final classification?
What evidence is missing or only heuristic?
Was any earlier conclusion later corrected or superseded?
```

The Cache Evidence Chain is not a new cache authority and is not a cache controller.

It is an explainability/provenance layer over existing evidence producers.

## 2. Constitutional boundary

The permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Evidence Chain may record bounded provenance about prompt/cache behavior. It must never:

```text
write or rewrite model prose
rewrite chat history
move prompt segments automatically
change model instructions for cache reasons
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

Evidence may justify a future engineering candidate. It may not perform the optimization itself.

## 3. Why a lineage layer is needed

As the cache stack becomes richer, a final statement may depend on several independent systems:

```text
Usage Dashboard receipt
→ Receipt Correlator

Prompt Stability Manifest / Guardian
→ release-time ABI evidence

Prefix Map
→ local first-break attribution

Baseline Profile
→ deviation from recent healthy normal

Regression Sentinel
→ request-level regression classification

Opportunity Analyzer
→ engineering-value classification
```

Without explicit provenance, a diagnostic can accidentally flatten all of these into one opaque statement such as:

```text
CACHE REGRESSION: SIMCORE
```

That is too strong unless the full evidence path actually supports it.

The Evidence Chain should make unsupported leaps visible.

## 4. Name says chain; internal model should be a bounded DAG

User-facing diagnostics may present a readable chain, but the internal provenance model should not require every fact to have exactly one parent.

Many conclusions have multiple independent inputs.

Example:

```text
                 provider receipt
                       ↓
local request → correlation
       ↓              ↓
Prefix Map       cached-token result
       \              /
        \            /
         Sentinel verdict
               ↑
        Baseline Profile
               ↑
      compatible prior samples
```

Therefore:

```text
internal representation = small provenance DAG
presentation = ordered evidence chain / trace
```

Do not invent a fake linear order that loses dependency information.

## 5. Evidence producers keep their own authority

The Evidence Chain must never re-interpret a weaker producer as stronger evidence.

Examples:

```text
Receipt Correlator says HEURISTIC_MATCH
→ Evidence Chain must preserve HEURISTIC_MATCH
→ cannot relabel provider evidence VERIFIED
```

```text
Prefix Map says PRE_SIMCORE first break
→ Chain may preserve that local attribution
→ cannot infer Gemini cached tokens from it
```

```text
Prompt Stability Manifest says stable ABI SAME
→ Chain may preserve release-contract evidence
→ cannot infer provider cache HIT
```

The provenance layer joins evidence; it does not upgrade authority.

## 6. Evidence classes

Initial vocabulary should remain explicit and small.

Candidate evidence-origin classes:

```text
LOCAL_OBSERVATION
PROVIDER_RECEIPT
CORRELATION_RESULT
RELEASE_CONTRACT
BASELINE_DERIVATION
ATTRIBUTION_DERIVATION
REGRESSION_VERDICT
REGIME_HISTORY
OPPORTUNITY_ASSESSMENT
CORRECTION
```

These identify where a node came from, not whether it is true.

Separate evidence quality/authority fields should carry that distinction.

## 7. Authority / confidence vocabulary

Prefer discrete auditable classes rather than one opaque confidence number.

Candidate authority classes:

```text
DIRECT
EXACT_CORRELATED
STRONG_BOUNDED
HEURISTIC
DERIVED_FROM_DIRECT
DERIVED_FROM_MIXED
UNVERIFIED
AMBIGUOUS
SUPERSEDED
DISMISSED
```

A derived node cannot have stronger authority than its weakest required input unless a separate independent direct source establishes the claim.

Conceptual rule:

```text
claim authority <= required evidence authority
```

Do not convert several weak hints into fake direct evidence merely because they agree.

## 8. Request evidence identity

Each request-level graph needs a bounded local identity that does not require prompt mutation.

Potential identity surface:

```text
localEvidenceId
local request sequence
location/chat scope digest
runtime generation when useful
request timestamp window
correlation key/requestIdentityDigest when authoritative
```

Requirements:

```text
no hidden marker injected into model prompt
no user/assistant text embedded in identity
no raw prompt body required
```

The local evidence identity is not automatically the provider request identity.

## 9. Conceptual evidence node

Illustrative only:

```ts
{
  evidenceId: "ev-...",
  requestEvidenceId: "req-...",
  kind: "PROVIDER_RECEIPT",
  producer: "usage-dashboard/receipt",
  authority: "EXACT_CORRELATED",
  claim: "GEMINI_CACHED_READ",
  facts: {
    inputTokens: 510000,
    cachedReadTokens: 441000,
    metricSource: "llmgateway-log-cache-v1"
  },
  dependsOn: ["correlation-ev-..."],
  observedAt: "...",
  schemaVersion: 1,
  status: "ACTIVE"
}
```

Do not freeze this exact schema before implementation inventory.

## 10. Facts must stay typed and bounded

Avoid evidence nodes whose payload is arbitrary prose.

Prefer bounded typed facts such as:

```text
correlationClass
inputTokens
cachedReadTokens
cacheWriteTokens
firstBreakOwner
firstBreakIndex
stableAbiDigest
slowAbiDigest
segmentId
baselineMedian
baselineBand
regressionClass
cacheRegimeId
```

Human-readable diagnostic prose should be generated from typed evidence, not become the primary evidence itself.

## 11. No raw prompt/body retention

The Evidence Chain must not become a covert prompt archive.

Do not retain:

```text
raw user messages
raw assistant messages
full prompt bodies
full chat history
full gateway log rows
segment plaintext solely for cache provenance
```

Allowed bounded evidence may include:

```text
lengths
counts
hashes/digests
semantic segment IDs
request identity digests
small enums
bounded timestamps
provider cache counters
```

Privacy and storage bounds outrank diagnostic convenience.

## 12. Strong-claim gating

Any strong request-specific provider-cache conclusion should declare its required evidence path.

Example strong claim:

```text
CACHE_ABI_REGRESSION_CANDIDATE
```

Potential minimum chain:

```text
provider receipt
  authority EXACT_ID or validated STRONG_BOUNDED
+
Baseline Profile
  established compatible baseline
+
Prefix Map
  first meaningful break = SIMCORE stable/slow
+
Prompt Stability Manifest / Guardian
  unexpected relevant ABI drift or stable-tier evidence
```

If one required link is weak or missing, downgrade the conclusion.

Example:

```text
provider receipt correlation = AMBIGUOUS
→ request-specific provider regression claim = UNVERIFIED
```

## 13. Negative evidence is evidence

The chain should preserve findings that rule SimCore out.

Examples:

```text
Guardian: stable SAME
Prefix Map: first break PRE_SIMCORE
Receipt: exact correlated cache drop

→ evidence supports:
SIMCORE_NOT_FIRST_BREAK
```

This is valuable because it prevents repeated investigation of the wrong owner.

Do not design the chain only around finding SimCore defects.

## 14. Corrections and supersession — never silently erase history

The project evidence discipline already prefers preserving disproven evidence with explicit dismissal rather than deleting history.

The cache chain should follow the same rule.

Example:

```text
E1: HEURISTIC_MATCH to gateway row A
E2: Sentinel WATCH based on E1

later:
E3: exact requestId proves row B was the true receipt
E4: CORRECTION supersedes E1
E5: E2 becomes DISMISSED_NO_DEFECT / SUPERSEDED
```

Do not rewrite the historical graph so it appears that E1 never existed.

Preferred correction vocabulary:

```text
ACTIVE
SUPERSEDED
DISMISSED_NO_DEFECT
INVALID_SOURCE
EXPIRED
```

Exact terms can align with existing SimCore evidence classifications during implementation.

## 15. WATCH / DEFER / FIX discipline

The Evidence Chain should support, not replace, project issue classification.

A cache anomaly may produce:

```text
WATCH
DEFER
FIX_CANDIDATE
BLOCKER only when correctness/core contract criteria independently justify it
```

A cache-efficiency regression alone should not silently become a correctness BLOCKER.

Opportunity Analyzer and normal SimCore priority ordering still apply.

## 16. Chain completeness state

A request graph may be temporarily incomplete while a receipt is pending.

Candidate states:

```text
OPEN
WAITING_FOR_RECEIPT
CORRELATED
ANALYZED
CLOSED_HEALTHY
CLOSED_WATCH
CLOSED_UNVERIFIED
SUPERSEDED
```

The state is provenance lifecycle metadata, not semantic Core state.

Do not write it into SnapshotStore merely because it exists.

## 17. Bounded retention model

Do not preserve every full request graph forever.

Recommended conceptual tiers:

```text
Tier 1 — recent request evidence ring
small bounded in-memory / telemetry window

Tier 2 — notable anomaly evidence capsule
only WATCH/FIX candidate or regime-boundary relevant summaries

Tier 3 — repo evidence
human-reviewed durable design/live-validation evidence
```

The Regime Ledger should retain regime boundaries, not every per-turn DAG.

The repository remains the durable authority for important investigation outcomes.

## 18. Cross-reload continuity

If a request chain is awaiting a provider receipt during reload, a bounded pending capsule may be eligible for the existing telemetry handoff pattern.

Requirements:

```text
same location/chat
compatible evidence schema
bounded TTL
small payload
no raw body/history
```

Reload continuation must preserve authority exactly.

Example:

```text
HEURISTIC before reload
→ HEURISTIC after reload
```

never automatic promotion to EXACT.

## 19. Receipt Correlator integration

The Correlator should produce a provenance node rather than merely mutate a cache field.

Example:

```text
CORRELATION_RESULT
class: EXACT_ID
dependsOn:
- local request observation
- provider receipt identity
```

Then the provider receipt node can explicitly reference the correlation result used to attach it to the SimCore request.

This makes later ambiguity/correction auditable.

## 20. Prefix Map integration

Prefix Map should contribute local topology/first-break nodes such as:

```text
LOCAL_OBSERVATION
claim: FIRST_BREAK
owner: PRE_SIMCORE_CHAT_HISTORY
```

or:

```text
claim: FIRST_SIMCORE_DRIFT
segmentId: CORE_EXPOSURE_CONTRACT
```

These nodes must remain local prompt-structure evidence and must not claim provider cache behavior.

## 21. Prompt Stability Manifest / Guardian integration

Release-time evidence may be attached by compatible build identity:

```text
RELEASE_CONTRACT
stable ABI: SAME
slow ABI: SAME
cacheAbiIntent: PRESERVE
```

or:

```text
RELEASE_CONTRACT
segment: CORE_EXPOSURE_CONTRACT
change: DECLARED
```

A request graph can reference this immutable build evidence without copying the full manifest into runtime telemetry.

## 22. Baseline Profile integration

Baseline Profile derivations should list the admitted sample evidence IDs or a bounded aggregate lineage reference.

This makes baseline poisoning auditable.

Example:

```text
BASELINE_DERIVATION
family: C/steady
samples: 18
admissionPolicy: EXACT_ONLY_V1
medianCachedRatio: 0.88
```

If an admitted sample is later invalidated, the baseline can be marked stale/rebuild-required rather than silently continuing with contaminated history.

## 23. Sentinel integration

Sentinel verdicts should be derived nodes with explicit dependencies.

Example:

```text
REGRESSION_VERDICT
class: PRE_SIMCORE_PREFIX_BREAK
dependsOn:
- exact correlated provider receipt
- established baseline deviation
- Prefix Map first-break evidence
```

The diagnostic should be able to answer:

```text
Why did Sentinel choose this class?
```

without reading raw prompt text.

## 24. Regime Ledger integration

A confirmed CACHE_REGIME boundary should reference a compact evidence-chain summary:

```text
previous baseline evidence
new baseline evidence
transition request evidence
release ABI evidence if relevant
provider correlation quality
```

The Ledger remains historical cache-regime authority; the Evidence Chain provides provenance behind its boundary decision.

## 25. Opportunity Analyzer integration

Opportunity candidates should retain references to the evidence that produced each axis:

```text
IMPACT        ← provider receipt + baseline
OWNERSHIP     ← Prefix Map
REPEATABILITY ← repeated request chains / regime history
RECOVERABILITY← Prefix Map / topology
CONFIDENCE    ← correlation + evidence completeness
RISK          ← architectural/correctness review
```

This prevents a high-looking opportunity score from hiding weak evidence.

## 26. Diagnostics presentation

User-facing diagnostics should normally show a compact chain, not the whole DAG.

Example:

```text
Cache evidence: VERIFIED
Request ↔ receipt: EXACT_ID
Gemini Read: 441k / Input: 510k
Baseline: 88% median → current 86% · NORMAL
First break: PRE_SIMCORE · CHAT_HISTORY
Stable ABI: SAME
Verdict: HEALTHY / SIMCORE_NOT_FIRST_BREAK
```

For an uncertain case:

```text
Cache evidence: PARTIAL
Request ↔ receipt: AMBIGUOUS (2 candidates)
Provider result for this request: UNVERIFIED
Prefix Map: SIMCORE stable SAME
Verdict: NO STRONG CACHE CLAIM
```

An expanded diagnostic may expose evidence IDs/dependencies for debugging.

## 27. Evidence-chain integrity checks

Future static/runtime fixtures should prove:

```text
1. derived node cannot reference missing dependency
2. request graph cannot cross incompatible chat/location scope
3. HEURISTIC input cannot silently become DIRECT
4. AMBIGUOUS receipt prevents strong request-specific provider claim
5. correction supersedes old evidence without deleting it
6. invalidated baseline sample marks dependent derivation stale
7. no raw prompt/body stored in nodes
8. no prompt marker injected for evidence identity
9. bounded recent evidence retention
10. reload preserves only compatible bounded pending evidence
11. Guardian/Manifest evidence is linked by build identity, not copied as raw prompt
12. renderer responsibility remains unchanged
```

## 28. Evidence status propagation

If an upstream node is invalidated or superseded, dependent conclusions should not remain silently ACTIVE.

Possible behavior:

```text
upstream SUPERSEDED
→ dependent derived node STALE
→ recompute if bounded evidence remains available
→ otherwise CLOSED_UNVERIFIED / SUPERSEDED
```

Do not automatically rewrite historical conclusions; preserve the previous state and append the revised result.

## 29. Failure behavior

Evidence-chain tooling failure must be observation-only.

If provenance capture fails:

```text
core SimCore request continues
main model rendering continues
semantic state handling continues
cache evidence becomes UNVERIFIED / PARTIAL
```

Do not block generation solely because cache telemetry could not build a provenance graph.

Correctness failures remain governed by existing Core contracts separately.

## 30. Non-goals

```text
full distributed tracing platform
raw prompt logging
full gateway log archival
automatic prompt optimization
provider cache management
semantic state storage
new renderer logic
opaque ML causal attribution
permanent storage of every request graph
```

## 31. Recommended research / implementation order

```text
current v0.64.7 live close
→ Receipt Correlator manual feasibility
→ establish request-level bounded evidence identity
→ prototype evidence nodes offline/diagnostic-only
→ connect Prefix Map + Receipt Correlator provenance
→ add Baseline/Sentinel derived lineage
→ verify correction/supersession behavior
→ only then consider compact runtime diagnostic surface
```

Do not implement the whole cache stack at once.

## 32. Relationship to existing project evidence discipline

The Evidence Chain should mirror the project's established discipline:

```text
diagnostic review
→ RAW/state/neighbor evidence cross-check
→ preserve suspicious/useful evidence
→ classify narrowly
→ later correction does not erase history
```

Cache provenance is a specialized application of that same principle, not a replacement for the repository evidence system.

## 33. Current classification

```text
GEMINI_CACHE_EVIDENCE_CHAIN
= HIGH VALUE FOR EXPLAINABILITY
= LOW SEMANTIC RISK IF OBSERVATION-ONLY
= BOUNDED REQUEST-LEVEL PROVENANCE
= INTERNAL DAG / HUMAN-READABLE CHAIN
= AUTHORITY-PRESERVING
= CORRECTION-AWARE
= NO RUNTIME CHANGE YET
= NO PROMPT BYTE CHANGE
```

Primary verdict:

```text
RECORD AS IDEA
→ use as provenance contract across cache observability components
→ do not make it a new semantic/cache authority
→ do not retain raw content
→ do not deploy before Receipt Correlator feasibility is proven
```
