# SimCore Gemini Cache Verdict Compiler — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · STANDARD REQUEST-LEVEL VERDICT · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`
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

Compile admitted cache evidence for one main-model request into one standardized, explainable request-level cache verdict.

The Verdict Compiler exists so downstream consumers do not each recreate slightly different attribution rules.

It answers:

```text
Given only evidence that passed the shared Admission Policy,
what cache verdict is justified for this request?

What evidence directly supports the verdict?
What evidence limits the verdict strength?
What important evidence is missing?
Is the result healthy, degraded, attributable, ambiguous, or unverified?
```

The Verdict Compiler is not a cache controller, not an optimizer, and not an alert policy.

## 2. Constitutional boundary

Permanent responsibility split:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Verdict Compiler may classify cache evidence. It must never:

```text
write or rewrite model prose
rewrite user/assistant history
move prompt sections automatically
change model instructions because of a cache verdict
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

A cache verdict may justify investigation or a future engineering candidate. It cannot perform the optimization itself.

## 3. Position in the cache evidence architecture

Required conceptual flow:

```text
Evidence Producers
  ├ provider/cache receipt
  ├ request correlation
  ├ Prefix Map
  ├ Prompt Stability Manifest / Guardian
  └ Baseline Profile snapshot
          ↓
Cache Evidence Chain
          ↓
Cache Evidence Admission Policy
          ↓
Cache Verdict Compiler
          ↓
  ├ Regression Sentinel
  ├ diagnostics
  ├ Regime Ledger
  └ Opportunity Analyzer
```

Important nuance:

Baseline Profile is both:

```text
a consumer of admitted historical provider-cache samples
+
a producer of the compatible baseline snapshot used by the Verdict Compiler
```

The Verdict Compiler must not mutate the baseline while compiling a verdict.

## 4. Strict responsibility split with the Sentinel

Do not merge Verdict Compiler and Regression Sentinel responsibilities.

```text
Evidence Admission Policy
= may this evidence support this claim?

Cache Verdict Compiler
= what request-level conclusion follows from the admitted evidence?

Regression Sentinel
= when does a sequence of request-level verdicts deserve operational escalation or user-visible surfacing?
```

Therefore the Verdict Compiler must not emit operational defect severity such as:

```text
WATCH
DEFER
FIX
BLOCKER
```

Those remain operational/release workflow classifications.

The compiler should be close to:

```text
deterministic
stateless
side-effect free
request-local
explainable
```

## 5. Input contract

The compiler consumes typed admitted facts, not raw prompts or raw gateway logs.

Conceptual input planes:

### Provider cache

```text
providerReceiptAdmission
inputTokens
cachedReadTokens
cacheWriteTokens when meaningful
metricSource
```

### Correlation

```text
correlationClass
correlationAdmission
requestIdentityDigest when allowed
```

### Compatible baseline

```text
baselineState
sampleCount
cachedRatioMedian
normalBand
materialDeviation classification
request family compatibility
model/cache-regime compatibility
```

### Local prefix

```text
firstBreakOwner
firstBreakIndex / bounded location
commonPrefixChars/messages
cacheShadow state
```

### Release Cache ABI

```text
stableAbiState
slowAbiState
firstChangedSegmentId when available
cacheAbiIntent
Guardian/Manifest compatibility
```

### Contextual bounded evidence

```text
runtime generation/reload transition
request cadence bucket
route/cache-scope change only when authoritative
```

The compiler must not fetch provider data, poll logs, inspect raw prompt bodies, or independently recompute another component's authority.

## 6. Verdict vocabulary

Initial vocabulary should remain narrow and machine-readable.

### Healthy / non-regression

```text
CACHE_HEALTHY
```

Meaning:
- authoritative/eligible provider evidence exists,
- compatible baseline is established,
- current cache behavior is within the accepted healthy trajectory,
- no stronger contradictory evidence exists.

This does not mean every byte is cache-optimal.

### Evidence-limited states

```text
UNVERIFIED_PROVIDER
UNVERIFIED_CORRELATION
BASELINE_NOT_ESTABLISHED
AMBIGUOUS_EVIDENCE
CONTRADICTORY_EVIDENCE
```

These are first-class verdicts, not errors to hide.

### Confirmed provider degradation with attribution classes

```text
PROVIDER_CACHE_REGRESSION_UNATTRIBUTED
PRE_SIMCORE_PREFIX_BREAK
SIMCORE_CACHE_ABI_REGRESSION_CANDIDATE
ROUTE_OR_SCOPE_CHANGE
CADENCE_OR_EXPIRY_CANDIDATE
EXPECTED_VOLATILE_CHANGE
RELOAD_OBSERVER_ONLY
UNKNOWN_EXTERNAL
```

The exact final vocabulary should be reconciled with the Sentinel during implementation, but one authoritative verdict vocabulary should exist rather than parallel near-duplicates.

## 7. Evidence ceilings

A verdict may not claim more than its admitted evidence supports.

Examples:

```text
provider receipt exact
+ no Prefix Map
→ provider cache degradation may be established
→ first-break ownership remains UNKNOWN
```

```text
Prefix Map direct
+ no authoritative provider receipt
→ local first-break may be reported
→ provider cache regression remains UNVERIFIED
```

```text
Guardian says stable SAME
+ provider receipt unavailable
→ release Cache ABI evidence exists
→ Gemini cache health remains UNVERIFIED
```

The compiler must never infer missing evidence merely because the available facts form a plausible story.

## 8. Deterministic decision ladder

The implementation should use an explicit auditable decision table, not an opaque weighted score or ML classifier.

Conceptual fail-closed order:

```text
1. evidence superseded/dismissed for required claim?
   → do not consume it

2. provider evidence required but unavailable/unapproved?
   → UNVERIFIED_PROVIDER

3. request/receipt correlation ambiguous or insufficient for request-specific claim?
   → UNVERIFIED_CORRELATION or AMBIGUOUS_EVIDENCE

4. strong admitted inputs contradict each other materially?
   → CONTRADICTORY_EVIDENCE

5. compatible baseline not established?
   → BASELINE_NOT_ESTABLISHED

6. provider cache behavior within healthy baseline?
   → CACHE_HEALTHY

7. material provider degradation established
   → enter attribution

8. authoritative route/cache-scope change explains compatible transition?
   → ROUTE_OR_SCOPE_CHANGE

9. first meaningful break PRE_SIMCORE?
   → PRE_SIMCORE_PREFIX_BREAK

10. first meaningful break SIMCORE cache-critical region
    + stable/slow ABI unexpectedly changed
    + change is undeclared/incompatible
    → SIMCORE_CACHE_ABI_REGRESSION_CANDIDATE

11. stable/slow SAME and only expected volatile/runtime-local change observed?
    → EXPECTED_VOLATILE_CHANGE or PROVIDER_CACHE_REGRESSION_UNATTRIBUTED,
       depending on whether the volatile change can actually explain the observed prefix frontier

12. reload telemetry changed but prompt/prefix evidence remained healthy?
    → RELOAD_OBSERVER_ONLY

13. unusually long cadence with no authoritative expiry proof?
    → CADENCE_OR_EXPIRY_CANDIDATE

14. provider degradation established but local ownership not established?
    → UNKNOWN_EXTERNAL / PROVIDER_CACHE_REGRESSION_UNATTRIBUTED
```

Exact precedence must be fixture-driven before implementation.

## 9. Contradictory evidence must fail closed

Do not silently choose one strong evidence source when two admitted sources conflict.

Example:

```text
Prefix Map:
first break = PRE_SIMCORE

another supposedly direct local source:
first break = SIMCORE stable
```

If both are currently admitted as authoritative for the same request/claim:

```text
→ CONTRADICTORY_EVIDENCE
```

Then preserve the contradiction in the Evidence Chain and investigate the producer/identity mismatch.

Likewise:

```text
Manifest says stable ABI SAME
Guardian says undeclared stable drift
```

for the same compatible candidate should be treated as tooling/evidence inconsistency, not averaged into a verdict.

## 10. Negative evidence is part of verdict compilation

The compiler must consume admissible negative evidence.

Example:

```text
provider cache regression = DIRECT / EXACT_CORRELATED
Prefix Map first break = PRE_SIMCORE
stable ABI = SAME
slow ABI = SAME
```

Valid conclusion:

```text
PRE_SIMCORE_PREFIX_BREAK
SimCore first cause: NOT SUPPORTED
```

The goal is not to find a SimCore fault. The goal is to compile the strongest justified explanation, including evidence that excludes SimCore as first cause.

## 11. `SIMCORE_CACHE_ABI_REGRESSION_CANDIDATE` must require a strong chain

This is the strongest SimCore-owned cache verdict and must be deliberately difficult to reach.

Minimum conceptual evidence should include:

```text
1. authoritative provider cache degradation for this request
2. defensible request/receipt correlation
3. compatible established baseline
4. material degradation relative to that baseline
5. local first meaningful break attributable to SimCore cache-critical region
6. matching stable/slow ABI drift or changed cache-critical segment
7. drift not covered by a compatible declared semantic Cache ABI change
8. no stronger contradictory evidence
```

Missing one of these should weaken the verdict rather than filling the gap by inference.

A single cache drop must never produce a SimCore FIX conclusion by itself.

## 12. Declared Cache ABI changes

A declared stable/slow semantic change does not make its cache effect automatically healthy or unhealthy.

Conceptual:

```text
Manifest:
CORE_EXPOSURE_CONTRACT changed intentionally
CACHE_ABI_INTENT = CHANGE_DECLARED

Provider cache later drops materially
```

The compiler may report:

```text
provider degradation confirmed
+
first break aligns with declared changed segment
+
DECLARED_CACHE_ABI_CHANGE_ASSOCIATED
```

but should not call it an undeclared regression.

The real impact belongs to post-release evidence and may create a new Cache Regime if sustained.

## 13. `EXPECTED_VOLATILE_CHANGE` must not become a blame sink

Stable/slow SAME plus volatile/full CHANGED does not automatically explain a provider cache drop.

If an earlier prefix break already shadows the volatile region:

```text
volatile change
= downstream / CACHE_SHADOW
```

Then the verdict should prefer the actual first-break attribution or remain external/unattributed.

Use `EXPECTED_VOLATILE_CHANGE` only when the admitted prefix evidence shows the expected volatile boundary is actually the relevant local mutation frontier.

## 14. Reload handling

Do not interpret runtime reload/generation changes as provider cache resets.

`RELOAD_OBSERVER_ONLY` is appropriate only when:

```text
local observer generation changed
+
prompt/prefix contract remained compatible
+
provider cache evidence does not establish a corresponding cache-regime failure attributable to reload
```

If provider receipt is unavailable, use UNVERIFIED language rather than claiming reload had no provider impact.

## 15. Cadence / expiry handling

Long request intervals may correlate with implicit-cache loss, but without authoritative TTL/cache-age evidence:

```text
CADENCE_OR_EXPIRY_CANDIDATE
= heuristic attribution class
```

not:

```text
CACHE_EXPIRED
```

The verdict output must preserve that evidence limitation.

## 16. Verdict result shape

Conceptual sidecar result:

```text
verdictSchemaVersion
verdictClass
verdictAuthority
requestEvidenceId
correlationClass
baselineState
materialDeviation
firstBreakOwner
stableAbiState
slowAbiState
firstChangedSegmentId
reasonCodes[]
evidenceRefs[]
negativeEvidenceRefs[]
missingEvidence[]
contradictionRefs[]
```

No raw prompt bodies, chat text, or full gateway rows.

`verdictAuthority` should use discrete auditable classes derived from the Admission Policy, not a floating confidence score.

## 17. Suggested reason codes

Candidate vocabulary:

```text
V_PROVIDER_RECEIPT_EXACT
V_PROVIDER_RECEIPT_UNVERIFIED
V_CORRELATION_EXACT
V_CORRELATION_AMBIGUOUS
V_BASELINE_ESTABLISHED
V_BASELINE_MISSING
V_MATERIAL_CACHE_DROP
V_CACHE_WITHIN_BASELINE
V_FIRST_BREAK_PRE_SIMCORE
V_FIRST_BREAK_SIMCORE
V_CACHE_SHADOW
V_STABLE_ABI_SAME
V_STABLE_ABI_CHANGED
V_SLOW_ABI_SAME
V_SLOW_ABI_CHANGED
V_SEGMENT_DRIFT_UNDECLARED
V_SEGMENT_CHANGE_DECLARED
V_ROUTE_SCOPE_CHANGED
V_RELOAD_LOCAL_ONLY
V_CADENCE_LONG_HEURISTIC
V_EVIDENCE_CONTRADICTION
```

Reason codes explain the verdict; they are not severity labels.

## 18. Consumer contracts

### Regression Sentinel

Consumes standardized verdicts over time.

It decides:

```text
quiet
single WATCH
repeated WATCH
FIX candidate
user-visible warning eligibility
```

The Sentinel must not reinterpret a weaker verdict as stronger than the compiler emitted.

### Diagnostics

May render the verdict plus bounded evidence trace.

Example:

```text
Gemini cache verdict: PRE_SIMCORE_PREFIX_BREAK
Receipt: EXACT_ID · Read 96k / Input 510k
Baseline: 86% median → current 19%
First break: PRE_SIMCORE · CHAT_HISTORY
Stable ABI: SAME
Slow ABI: SAME
```

### Regime Ledger

Consumes repeated compatible verdicts and baseline transitions.

One request verdict cannot confirm a new CACHE_REGIME by itself.

### Opportunity Analyzer

Consumes verdict + repetition + recoverability + risk.

A high-confidence cache verdict still cannot override correctness or responsibility boundaries.

## 19. Pure compiler rule

Preferred implementation shape:

```text
compileCacheVerdict(admittedEvidenceSnapshot)
→ immutable bounded verdict
```

The function should not:

```text
poll provider logs
mutate Baseline Profile
write SnapshotStore semantic state
show UI
schedule retries
change prompt compilation
change model behavior
```

Those responsibilities belong elsewhere.

## 20. Determinism and replayability

The same normalized admitted evidence snapshot should produce the same verdict.

This enables permanent fixtures such as:

```text
fixture evidence JSON
→ verdict compiler
→ expected verdict + reason codes
```

Do not depend on:

```text
wall-clock now unless already normalized into an admitted fact
randomness
process-local IDs
unordered object iteration
network state
```

This makes the verdict vocabulary suitable for CI and regression testing.

## 21. Required future fixtures

A future prototype/implementation should prove at least:

```text
1. exact receipt + established baseline + healthy ratio
   → CACHE_HEALTHY

2. no approved provider receipt
   → UNVERIFIED_PROVIDER

3. ambiguous correlation
   → UNVERIFIED_CORRELATION / AMBIGUOUS_EVIDENCE

4. exact material cache drop + no Prefix Map
   → PROVIDER_CACHE_REGRESSION_UNATTRIBUTED

5. exact material drop + PRE_SIMCORE first break + stable/slow SAME
   → PRE_SIMCORE_PREFIX_BREAK

6. exact material drop + SIMCORE stable first break + undeclared stable segment drift
   → SIMCORE_CACHE_ABI_REGRESSION_CANDIDATE

7. exact material drop + SIMCORE changed segment but CHANGE_DECLARED
   → declared-change-associated verdict, not undeclared regression

8. stable/slow SAME + expected volatile frontier is first relevant local break
   → EXPECTED_VOLATILE_CHANGE

9. volatile change exists only after earlier PRE_SIMCORE break
   → do not use EXPECTED_VOLATILE_CHANGE as primary attribution

10. runtime generation changed but prefix/ABI healthy
    → RELOAD_OBSERVER_ONLY locally; no provider-reset claim

11. long cadence without TTL evidence
    → CADENCE_OR_EXPIRY_CANDIDATE, never CACHE_EXPIRED

12. two strong contradictory first-break facts
    → CONTRADICTORY_EVIDENCE

13. superseded evidence excluded from compilation

14. same normalized input twice
    → byte-equivalent verdict result

15. no raw prompt/body in verdict result

16. no Baseline/SnapshotStore semantic mutation

17. Main Model renderer boundary unchanged
```

## 22. Failure posture

When evidence is insufficient:

```text
weaken verdict
or
UNVERIFIED
```

Never repair missing evidence by:

```text
guessing a provider receipt
assuming cache HIT/MISS from local fingerprints
assuming TTL expiry
assuming route change
assuming SimCore ownership
```

If compiler inputs violate their schema or contain impossible contradictions, fail observationally and preserve a bounded diagnostic reason. Core runtime behavior must continue unaffected.

## 23. Privacy and boundedness

Retain only bounded typed metadata required for verdict explanation.

Do not persist:

```text
raw prompt text
raw user/assistant messages
full chat history
full gateway log rows
large serialized compiler bodies
```

Evidence references should point to bounded Evidence Chain node identities where possible.

## 24. Relationship to provider authority

The Verdict Compiler does not prove Gemini cache behavior independently.

Correct statement:

```text
Verdict Compiler
= standardized conclusion from admitted evidence

Usage Dashboard / approved provider receipt
= authority for actual cached-token evidence

Prefix Map
= authority for local prefix-break structure

Manifest / Guardian
= authority for release Cache ABI evidence
```

The compiler is an interpretation boundary, not a source-fact boundary.

## 25. Relationship to Main Model

No verdict may cause SimCore to take over the renderer role.

Cache findings may never justify:

```text
pre-writing scene prose
changing dialogue generation ownership
moving semantic authoring into SimCore
rewriting model output for cache efficiency
```

The permanent constitution remains:

```text
SimCore decides/validates runtime conditions.
Main Model renders the actual response.
```

## 26. Recommended research / implementation order

This document records design only.

Before implementation:

```text
v0.64.7 real-long-chat validation close
→ verify real Cache Receipt correlation feasibility
→ collect representative Evidence Chain samples
→ freeze Admission Policy v1 matrix
→ freeze Verdict vocabulary + precedence with fixtures
→ offline/pure compiler prototype
→ deterministic regression suite
→ only then consider bounded runtime diagnostic consumption
```

Do not mix this with M2-3 semantic runtime extraction, prompt relocation, plugin IPC, or release-system restructuring.

## 27. Current classification

```text
GEMINI_CACHE_VERDICT_COMPILER
= HIGH VALUE
= LOW SEMANTIC RISK IF PURE/OBSERVATIONAL
= STANDARDIZED DECISION LAYER
= STATELESS / DETERMINISTIC TARGET
= SEVERITY-FREE
= CLAIM-SCOPED
= IDEA / DESIGN CANDIDATE
= NO RUNTIME CHANGE
= NO PROMPT BYTE CHANGE
```

Primary rule:

```text
Evidence Chain preserves provenance.
Admission Policy decides what may be used.
Verdict Compiler decides what may be concluded.
Sentinel decides when that conclusion matters operationally.
```
