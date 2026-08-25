# SimCore Gemini Cache Regime Ledger — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · LONG-CHAT CACHE HISTORY · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Preserve the small number of meaningful cache-behavior transitions that occur over a very long chat so later diagnostics can answer:

```text
When did the cache behavior materially change?
What was the previous normal regime?
What became the new normal regime?
What evidence coincided with the transition?
Was it intentional, external, or a SimCore-owned regression candidate?
```

The Regime Ledger is not a per-turn analytics log and is not a cache controller.

It is a bounded historical index of confirmed or strongly evidenced cache-regime boundaries.

## 2. Naming rule — do not overload runtime epoch

SimCore already uses runtime/generation/epoch terminology for reload and lifecycle telemetry.

Therefore this cache-history concept must use:

```text
CACHE_REGIME
```

not `cache epoch` in machine-facing terminology.

Runtime generation/epoch may be attached as evidence for a regime transition, but it is not the regime identity itself.

## 3. Responsibility boundary

Constitutional rule remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Regime Ledger may preserve cache observations and transition evidence. It must never:

```text
write or rewrite model prose
rewrite chat history
move prompt sections automatically
change model instructions because a cache score changed
weaken correctness/state protections
control provider routing
manage explicit cache resources
```

Any optimization suggested by ledger history is a separate design/release item.

## 4. What is a cache regime?

A cache regime is a period in which one compatible request family has a reasonably stable cache-health baseline and prompt-topology pattern.

Conceptual example:

```text
CACHE_REGIME R1
SimCore: 0.64.7
Gemini model family: compatible-A
family: C / steady
cached ratio median: 88%
normal band: 84-91%
reusable-prefix median: 94%
common first break: PRE_SIMCORE history tail

then a verified transition

CACHE_REGIME R2
SimCore: 0.65.x
Gemini model family: compatible-A
family: C / steady
cached ratio median: 79%
normal band: 76-82%
reusable-prefix median: 85%
common first break: PRE_SIMCORE earlier history slot
```

The ledger stores the boundary and summarized evidence, not every request that formed the baseline.

## 5. Relationship to Baseline Profile

The Baseline Profile owns the current rolling statistical normal.

The Regime Ledger owns historical transitions between sufficiently established normals.

```text
Baseline Profile
= what is normal NOW?

Regime Ledger
= when did "normal" change, and what surrounded that change?
```

The ledger must not implement a second statistical engine.

Preferred flow:

```text
Baseline ESTABLISHED
→ material sustained shift observed
→ Sentinel + Prefix Map + compatibility evidence classify transition
→ new baseline is explicitly accepted as a new normal regime
→ Regime Ledger records boundary
```

A single anomalous request must never create a new regime.

## 6. Regime lifecycle

Suggested bounded lifecycle:

```text
CANDIDATE
→ repeated evidence suggests a persistent new cache level

CONFIRMED
→ compatibility/intent evidence supports a genuine new normal regime

REJECTED
→ later evidence shows transient anomaly / bad correlation / insufficient support

SUPERSEDED
→ a newer confirmed regime becomes current
```

Do not silently erase rejected candidates. A rejected transition can remain useful forensic evidence in bounded form.

## 7. What can propose a regime transition?

Potential proposal signals:

```text
Baseline Profile reports sustained REGIME_CHANGE candidate
Guardian records a declared stable/slow Cache ABI change
Gemini model family changes materially
major request-topology contract changes
provider/gateway route or cache-scope change when authoritative evidence exists
repeated post-release cache behavior establishes a new stable band
```

These are proposal signals, not automatic confirmation.

## 8. What must NOT create a regime by itself?

```text
one low-cache request
one page reload
one runtime generation change
one B_START/B_END mode transition
ordinary current-user growth
one PRE_SIMCORE representation mismatch
one provider receipt missing
one warning unrelated to cache
```

A reload may coincide with a real provider/cache shift, but reload alone is not proof.

## 9. Transition evidence bundle

Each ledger entry should contain only bounded metadata sufficient for later attribution.

Conceptual record:

```ts
{
  regimeId: "R3",
  previousRegimeId: "R2",
  status: "CONFIRMED",
  detectedAt: 0,
  confirmedAt: 0,

  chatFamily: "C/steady",
  simcoreVersionBefore: "...",
  simcoreVersionAfter: "...",
  cacheAbiStableBefore: "...",
  cacheAbiStableAfter: "...",
  cacheAbiSlowBefore: "...",
  cacheAbiSlowAfter: "...",

  geminiModelFamilyBefore: "...",
  geminiModelFamilyAfter: "...",

  baselineBefore: {
    cachedRatioMedian: null,
    reusablePrefixMedian: null,
    firstBreakFamily: "..."
  },
  baselineAfter: {
    cachedRatioMedian: null,
    reusablePrefixMedian: null,
    firstBreakFamily: "..."
  },

  transitionClass: "...",
  evidence: ["..."],
  classification: "WATCH | EXPECTED | FIX_CANDIDATE | EXTERNAL | UNKNOWN"
}
```

Exact schema is implementation-time design. Keep it small and versioned.

## 10. Transition classes

Initial vocabulary should remain explainable and narrow:

```text
DECLARED_CACHE_ABI_CHANGE
- stable/slow prompt ABI intentionally changed

SIMCORE_CACHE_ABI_REGRESSION_CANDIDATE
- new degraded regime correlates with undeclared SimCore-owned stable/slow drift

PRE_SIMCORE_TOPOLOGY_SHIFT
- persistent baseline change correlates with earlier host/history first break

GEMINI_MODEL_REGIME_CHANGE
- model family changed and a new compatible cache baseline emerged

GATEWAY_ROUTE_OR_SCOPE_CHANGE
- only when authoritative gateway evidence exists

RELOAD_CORRELATED_EXTERNAL_SHIFT
- regime boundary appears near reload/update, but local prompt evidence does not prove SimCore ownership

NATURAL_LONG_CHAT_DRIFT
- gradual growth/topology evolution forms a new stable baseline without a narrow defect

UNKNOWN_REGIME_CHANGE
- sustained new normal confirmed, cause still unresolved
```

Do not force a cause if the evidence only proves that the regime changed.

## 11. Example forensic value

Imagine a 2.8M-token long chat later shows poor caching.

Without a ledger:

```text
"When did this start?"
→ manually search hundreds of diagnostics
```

With a ledger:

```text
R1 · 0.64.7 · cached median 89%
→ R2 · 0.65.1 · EXPECTED · declared slow ABI change · median 84%
→ R3 · same version · PRE_SIMCORE_TOPOLOGY_SHIFT · median 61%
→ current
```

Then the investigation begins at the R2→R3 boundary rather than from the entire chat history.

## 12. Regime boundary and release correlation

Release boundaries are useful evidence, but not automatic regime boundaries.

Correct model:

```text
SimCore version changed
+ Guardian stable/slow SAME
+ Baseline remains compatible
→ same CACHE_REGIME may continue
```

```text
SimCore version changed
+ declared stable ABI change
+ new healthy baseline becomes established
→ new CACHE_REGIME likely appropriate
```

```text
no SimCore version change
+ host/history first-break distribution shifts persistently
+ cached tokens establish a new level
→ CACHE_REGIME can still change
```

This prevents the ledger from degenerating into a duplicate version history.

## 13. Reload correlation

Use v0.64.7 continuity evidence where available.

```text
reload
+ telemetry continuity restored
+ same baseline resumes
→ no regime transition
```

```text
reload
+ local prefix remains compatible
+ provider cached-token level persistently changes
→ external/cache-scope transition candidate
```

Never equate observer generation reset with provider cache reset.

## 14. Bounded storage model

The ledger should remain tiny even in extremely long chats.

Principles:

```text
append only meaningful regime boundaries
no raw prompt bodies
no full gateway logs
no per-turn cache records
no unbounded candidate accumulation
```

Potential bound:

```text
keep current regime
+ recent confirmed/superseded regime summaries
+ small number of unresolved candidates
```

Exact count/retention strategy must be measured later.

Historical regime summaries may be compacted but should not lose the classification/reason that explains the boundary.

## 15. Persistence ownership

The ledger is operational cache telemetry, not semantic narrative/Core state.

Do not add it to Core semantic SnapshotStore merely because it is long-lived.

Preferred design question during implementation:

```text
Which existing bounded telemetry persistence owner can carry regime summaries
without adding provider-critical writes or state-schema responsibility?
```

Storage architecture remains intentionally unfrozen at idea stage.

## 16. Sentinel integration

Sentinel detects a current abnormal result.

Ledger only receives an event after sustained evidence changes its meaning.

```text
one material drop
→ Sentinel WATCH
→ no ledger regime

repeated drop
+ old baseline no longer describes healthy requests
+ compatible new baseline established
→ REGIME CANDIDATE

cause/evidence confirmed
→ ledger CONFIRMED
```

This prevents noisy cache incidents from becoming fake history.

## 17. Guardian integration

Guardian gives release-time intent evidence.

```text
Guardian PRESERVE + stable/slow SAME
→ version change alone should not create a new regime

Guardian CHANGE_DECLARED stable/slow
→ ledger may tag a later confirmed boundary as DECLARED_CACHE_ABI_CHANGE

Guardian expected PRESERVE but runtime proves stable ABI drift + cache degradation
→ SIMCORE_CACHE_ABI_REGRESSION_CANDIDATE
```

Guardian still does not prove provider cache behavior; Gemini receipts remain required for provider-level claims.

## 18. Prefix Map integration

Prefix Map remains sole request-level first-break attribution owner.

The ledger may summarize its established pattern:

```text
R2 common first break: PRE_SIMCORE_HISTORY_TAIL
R3 common first break: PRE_SIMCORE_HISTORY_EARLY
```

It must not create another independent prefix parser.

## 19. Diagnostic/UI candidate

Compact diagnostic:

```text
Cache regime: R3 · CONFIRMED · since @2187 · PRE_SIMCORE_TOPOLOGY_SHIFT
Previous: R2 · median cache 86%
Current baseline: median cache 63%
```

Expanded history:

```text
Cache Regime Ledger
R1  0.64.7  89%  INITIAL_HEALTHY
R2  0.65.1  84%  DECLARED_CACHE_ABI_CHANGE
R3  0.65.1  63%  PRE_SIMCORE_TOPOLOGY_SHIFT  ← current
```

Do not create a separate permanent floating widget in v1. A future cache-health view may consume this history.

## 20. Anti-self-fulfilling rule

The ledger must never cause the behavior it records.

```text
ledger classification
→ cannot mutate prompt
→ cannot alter renderer output
→ cannot switch model/provider
→ cannot force cache warmup
→ cannot weaken state safety
```

It is evidence history only.

## 21. Required future fixtures

A future implementation should prove at least:

```text
1. one cache drop
   → no new regime

2. transient three-request disturbance followed by recovery
   → candidate rejected / no confirmed regime

3. sustained new healthy baseline after declared ABI change
   → confirmed new regime

4. version bump with stable/slow SAME and baseline unchanged
   → same regime

5. reload with continuity restored and same baseline
   → same regime

6. model-family incompatible change
   → prior baseline stale + new regime after warm-up

7. persistent PRE_SIMCORE topology shift
   → new regime may be confirmed without blaming SimCore

8. undeclared stable drift + sustained provider cache degradation
   → SimCore regression candidate regime

9. no raw text retained

10. bounded ledger size

11. Prefix Map remains sole first-break owner

12. Baseline Profile remains sole rolling-statistics owner

13. Sentinel remains alert/classification owner

14. renderer boundary unchanged
```

## 22. Non-goals

```text
per-turn analytics archive
full cache receipt storage
prompt rewriting
automatic cache optimization
explicit Gemini cache management
provider routing control
renderer behavior
semantic Core state
release history duplication
```

## 23. Target cache observability architecture

```text
Usage Dashboard / approved receipt source
= what Gemini actually cached

Cache Prefix Map
= where the request prefix changed

Cache Baseline Profile
= what is normal in the current regime

Cache Regression Sentinel
= is the current result abnormally worse and how should it be classified

Cache Regime Ledger
= when the definition of normal changed and what evidence marked that boundary

Cache ABI Guardian
= prevent undeclared SimCore stable/slow drift before release
```

No component takes over main-model rendering.

## 24. Current classification

```text
GEMINI_CACHE_REGIME_LEDGER
= HIGH VALUE FOR VERY LONG CHATS
= LOW SEMANTIC RISK
= HISTORICAL OBSERVABILITY LAYER
= IDEA / DESIGN CANDIDATE

machine term:
CACHE_REGIME

avoid:
CACHE_EPOCH
because runtime epoch already has a separate meaning

runtime mutation:
NONE today

renderer responsibility change:
NONE
```
