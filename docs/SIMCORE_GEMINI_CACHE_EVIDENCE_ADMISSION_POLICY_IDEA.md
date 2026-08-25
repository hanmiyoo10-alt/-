# SimCore Gemini Cache Evidence Admission Policy — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · COMMON EVIDENCE GATE · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
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

Define one shared admission policy for cache evidence so Baseline Profile, Regression Sentinel, Regime Ledger, Opportunity Analyzer, and future cache diagnostics do not each invent slightly different trust rules.

The policy answers:

```text
What claim is being made?
Which evidence plane is allowed to support that claim?
How strong is each input?
Is the evidence admissible for learning, warning, classification, regime confirmation, or engineering action?
What happens when evidence is missing, ambiguous, heuristic, superseded, or contradictory?
```

This is a policy/validation layer over evidence producers. It is not a provider-cache authority and does not perform prompt optimization.

## 2. Constitutional boundary

Permanent responsibility split:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Admission Policy may restrict which cache claims are allowed. It must never:

```text
write or rewrite model prose
rewrite chat history
move prompt sections automatically
change model instructions for cache reasons
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

A cache claim that cannot meet the evidence gate must be weakened or remain UNVERIFIED; the policy may not alter runtime semantics to manufacture stronger evidence.

## 3. Core rule — admission is claim-specific

Do not create one global label such as:

```text
TRUSTED_EVIDENCE
```

and assume that evidence can prove every kind of cache statement.

Authority is scoped to the claim being made.

Example:

```text
Provider receipt with EXACT_ID
→ strong evidence for cached token counts
→ not evidence for first-break ownership

Prefix Map direct local observation
→ strong evidence for first-break ownership
→ not evidence for Gemini cached token counts

Prompt Stability Manifest / Guardian
→ strong release-contract evidence for stable/slow ABI state
→ not evidence for provider cache HIT or Read
```

Therefore every admission decision must consider:

```text
EVIDENCE QUALITY
+
CLAIM SCOPE
+
CONSUMER POLICY
```

## 4. Evidence planes

Initial evidence planes:

```text
PROVIDER_CACHE
REQUEST_CORRELATION
LOCAL_PREFIX
RELEASE_CACHE_ABI
BASELINE_HISTORY
REGRESSION_DERIVATION
REGIME_HISTORY
ENGINEERING_ASSESSMENT
```

### PROVIDER_CACHE

Examples:

```text
Gemini/LLMGateway cached Read tokens
input/prompt tokens
cache Write tokens
metric source
```

### REQUEST_CORRELATION

Examples:

```text
EXACT_ID
STRONG_BOUNDED_MATCH
HEURISTIC_MATCH
AMBIGUOUS
```

### LOCAL_PREFIX

Examples:

```text
first-break owner/index
common-prefix messages/chars
CACHE_SHADOW
stable/slow identity observed locally
```

### RELEASE_CACHE_ABI

Examples:

```text
stable ABI SAME/CHANGED
slow ABI SAME/CHANGED
segment identity diff
manifest intent
Guardian result
```

### BASELINE_HISTORY

Examples:

```text
compatible healthy sample set
median cached ratio
normal band
sample count
baseline state
```

The other planes are derived consumers and may not silently invent direct facts.

## 5. Evidence quality classes

Reuse discrete auditable classes rather than opaque confidence scores.

Candidate quality vocabulary:

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

Interpretation is always scoped to the producer and claim.

General rule:

```text
derived claim authority
<=
weakest required input authority
```

unless a separate independent direct source establishes the same claim.

Agreement among multiple weak hints must not be promoted to DIRECT merely because they agree.

## 6. Admission outcomes

The policy should produce one of a small set of outcomes:

```text
ADMIT_STRONG
ADMIT_BOUNDED
ADMIT_DIAGNOSTIC_ONLY
HOLD_PENDING
REJECT_AMBIGUOUS
REJECT_UNVERIFIED
REJECT_SUPERSEDED
```

These are not defect severities.

They answer only whether evidence may enter a particular consumer/action.

## 7. Provider-cache sample admission

A provider-cache sample is a request-specific cached-token observation intended for Baseline/Sentinel use.

Initial posture:

```text
Receipt source authoritative
+
correlation EXACT_ID
→ ADMIT_STRONG
```

```text
Receipt source authoritative
+
correlation STRONG_BOUNDED_MATCH
→ ADMIT_BOUNDED initially
```

`ADMIT_BOUNDED` may become Baseline-eligible only after a dedicated live validation shows the strong-bounded matcher is sufficiently precise in the actual host/gateway environment.

```text
correlation HEURISTIC_MATCH
→ ADMIT_DIAGNOSTIC_ONLY
```

```text
correlation AMBIGUOUS
→ REJECT_AMBIGUOUS
```

```text
receipt unavailable / source unapproved
→ REJECT_UNVERIFIED
```

Do not learn a provider baseline from ambiguous or heuristic request joins by default.

## 8. Baseline Profile admission matrix

Baseline Profile has two separate needs:

```text
learning normal
vs
observing a current sample
```

These should not use identical thresholds.

### Learning normal

Preferred v1:

```text
EXACT_ID provider sample
+ compatible request family
+ compatible model/cache regime
+ no unresolved anomaly classification
→ ADMIT_STRONG
```

Possible future after validation:

```text
STRONG_BOUNDED provider sample
→ ADMIT_BOUNDED
```

Default exclusions:

```text
HEURISTIC
AMBIGUOUS
UNVERIFIED
known anomaly under investigation
superseded evidence
```

### Observing current sample

A heuristic sample may still be displayed for research, but must be labeled diagnostic-only and must not poison the learned baseline.

## 9. Baseline poisoning protection

Admission happens before baseline mutation.

Required order:

```text
current evidence arrives
→ evaluate against existing baseline
→ classify evidence quality and anomaly state
→ decide admission
→ only then update baseline if eligible
```

Forbidden order:

```text
update baseline first
→ decide whether sample was anomalous
```

A sudden cache collapse under investigation must not immediately redefine normal.

## 10. Regression Sentinel admission matrix

The Sentinel can emit several strengths of statement.

### Observation-only statement

Example:

```text
possible cache degradation
```

May use weaker evidence but must retain its quality label.

### Strong request-specific provider regression

Require at minimum:

```text
provider receipt admitted for this request
+
defensible request correlation
+
established compatible baseline
+
material deviation from baseline
```

Preferred v1 strong path:

```text
EXACT_ID
+
ESTABLISHED baseline built from trusted samples
+
material drop
→ provider regression confirmed for this request
```

### Strong SimCore attribution

A provider regression alone is not a SimCore regression.

Strong SimCore attribution requires additional local/release evidence such as:

```text
provider regression confirmed
+
Prefix Map first meaningful break = SIMCORE-owned cache-critical region
+
compatible Manifest/Guardian evidence
+
no stronger PRE_SIMCORE explanation
```

If Prefix Map says `PRE_SIMCORE`, strong SimCore-first-cause attribution is rejected even when cached tokens collapsed.

## 11. Sentinel verdict ceilings

Examples:

```text
receipt EXACT_ID
baseline ESTABLISHED
Prefix Map UNVERIFIED
→ can confirm provider cache regression
→ cannot strongly attribute first cause
```

```text
Prefix Map direct
Manifest stable drift direct
receipt correlation HEURISTIC
→ can flag local Cache ABI concern
→ cannot claim provider regression for this exact request as verified
```

Every verdict should have a ceiling determined by missing/weak required evidence.

## 12. Regime Ledger admission matrix

A new `CACHE_REGIME` is a stronger historical claim than one bad request.

A confirmed regime boundary should require repeated compatible evidence.

Preferred structure:

```text
multiple admitted provider samples
+
new baseline becomes ESTABLISHED
+
transition persists across compatible requests
+
transition evidence is not unresolved/ambiguous
→ CACHE_REGIME CONFIRMED
```

One request, even EXACT_ID, cannot by itself confirm a new regime.

A candidate regime may exist earlier:

```text
material persistent change suspected
→ CANDIDATE
```

but remains unconfirmed until the admission requirements are satisfied.

Heuristic-only receipt history must not create a confirmed regime boundary.

## 13. Opportunity Analyzer admission matrix

Opportunity Analyzer may work with weaker evidence because its output is only an engineering candidate, not a provider truth claim.

However evidence quality must cap recommendation strength.

Example:

```text
large apparent loss
+ repeated SIMCORE stable first-break
+ receipt correlation HEURISTIC
→ evidence-limited candidate
```

```text
repeated EXACT_ID provider loss
+ Prefix Map SIMCORE-owned first break
+ Guardian/Manifest matching stable drift
+ recoverable early region large
→ high-confidence optimization candidate
```

Still:

```text
high cache opportunity
!=
automatic implementation approval
```

Correctness, safety, architecture, renderer boundary, and release sequencing remain higher authorities.

## 14. Cache ABI Guardian / Manifest evidence admission

Guardian and Prompt Stability Manifest are release-time evidence, not provider runtime evidence.

They may strongly establish claims such as:

```text
stable ABI SAME
stable ABI CHANGED
slow ABI SAME
segment reordered
segment digest changed
change intent declared/undeclared
```

They cannot alone establish:

```text
Gemini cache HIT
provider cached token ratio
provider cache reset
```

A Guardian PASS is admissible as negative local evidence against an undeclared SimCore stable/slow regression, but not as proof that provider caching is healthy.

## 15. Negative evidence admission

Negative evidence is first-class.

Examples:

```text
Prefix Map: PRE_SIMCORE first break
Guardian: stable SAME
Guardian: slow SAME
```

These may support:

```text
SIMCORE_NOT_FIRST_BREAK
```

or lower the Opportunity Analyzer's SimCore-owned score.

Negative evidence must not be ignored merely because a provider cache drop is dramatic.

Likewise:

```text
provider receipt healthy
```

is valid evidence against a claimed request-specific provider regression even if local fingerprints changed.

## 16. Missing evidence is not negative evidence

Distinguish:

```text
NO_EVIDENCE
```

from:

```text
EVIDENCE_OF_NO_DEFECT
```

Examples:

```text
Usage Dashboard unavailable
→ provider cache UNVERIFIED
→ not provider cache MISS
```

```text
Prefix Map unavailable
→ first-break UNKNOWN
→ not PRE_SIMCORE
```

```text
Guardian not run
→ Cache ABI UNKNOWN
→ not SAME
```

The Admission Policy must prevent missing telemetry from being silently converted into reassuring evidence.

## 17. Contradictory evidence

When independent evidence appears inconsistent, do not average it away.

Example:

```text
Guardian says stable SAME
runtime local segment digest says CHANGED
```

Possible causes include incompatible build identity, stale diagnostic data, tooling defect, or different request semantics.

Required posture:

```text
CONTRADICTORY_EVIDENCE
→ HOLD_PENDING / WATCH
→ preserve both evidence nodes
→ investigate identity/scope mismatch
```

Do not pick the more convenient source merely to produce a clean classification.

## 18. Superseded and dismissed evidence

Evidence Chain correction discipline applies to admission.

```text
SUPERSEDED
DISMISSED
```

nodes are retained for provenance but are not admissible as active support for new strong claims.

Example:

```text
heuristic receipt row A
→ later exact requestId proves row B

row A evidence = SUPERSEDED
prior attribution = DISMISSED_NO_DEFECT or corrected as appropriate
```

Do not erase the old evidence; exclude it from current admission.

## 19. Compatibility gate before quality gate

High-quality evidence from the wrong comparison family is still inadmissible.

Before applying quality rules, verify compatibility such as:

```text
same chat/location scope
compatible request family
compatible Gemini/model family when authoritative
compatible Prompt Stability Manifest / Cache ABI regime
compatible cache regime
```

An EXACT_ID sample from a different request family does not automatically belong in the same Baseline bucket.

Rule:

```text
compatibility first
→ evidence quality second
→ consumer admission third
```

## 20. Claim vocabulary should be typed

Avoid free-form conclusions that make admission impossible to audit.

Candidate typed claims:

```text
PROVIDER_CACHE_SAMPLE
PROVIDER_CACHE_REGRESSION
FIRST_BREAK_PRE_SIMCORE
FIRST_BREAK_SIMCORE_STABLE
CACHE_SHADOW_PRESENT
CACHE_ABI_STABLE_SAME
CACHE_ABI_STABLE_CHANGED
BASELINE_ESTABLISHED
CACHE_REGIME_CANDIDATE
CACHE_REGIME_CONFIRMED
SIMCORE_CACHE_REGRESSION_CANDIDATE
SIMCORE_NOT_FIRST_BREAK
OPTIMIZATION_CANDIDATE
```

Each claim type can have an explicit evidence requirement table.

## 21. Example common admission matrix

Conceptual only; implementation should keep machine-readable rules close to the owning policy module/test fixtures.

```text
CLAIM / CONSUMER                   MINIMUM INITIAL EVIDENCE

Baseline learn provider sample    authoritative receipt + EXACT_ID
Baseline diagnostic sample        HEURISTIC allowed, marked diagnostic-only
Provider regression confirmed     trusted current receipt + established baseline
SimCore first-break claim         direct Prefix Map/local topology evidence
Stable ABI SAME/CHANGED            Guardian/Manifest compatible build evidence
Strong SimCore cache regression   confirmed provider regression + SimCore first-break + compatible ABI evidence
Regime confirmed                  repeated trusted samples + established new baseline + persistence
Optimization high-confidence      repeated strong chain + recoverable SimCore-owned region + acceptable risk
```

This matrix should become explicit testable policy if implemented.

## 22. Warning / UI policy

Admission failure is not automatically a warning.

Examples:

```text
receipt unavailable
→ UNVERIFIED
→ no noisy warning by default
```

```text
correlation AMBIGUOUS
→ diagnostic state
→ no correctness warning
```

Only a separate Sentinel/Warning policy may decide that repeated cache regression deserves bounded UX surfacing.

Do not mix cache evidence admission with the existing correctness warning authority.

## 23. Renderer boundary test

Every admission-policy implementation or future optimization proposal must still pass:

```text
Does this change only cache evidence policy / observability?
Or does it move rendering responsibility into SimCore?
```

If it changes model prose generation ownership:

```text
REJECT / RESPONSIBILITY_BOUNDARY_VIOLATION
```

Cache evidence strength never overrides renderer ownership.

## 24. Privacy and retention

Admission decisions should operate on bounded metadata only.

Allowed candidate metadata:

```text
request evidence id / digest
correlation class
metric source
counts
first-break owner/index
ABI digests
segment ids
baseline statistics
claim/status/reason code
```

Do not require persistent storage of:

```text
raw prompt bodies
raw user/assistant text
full chat history
full gateway rows
```

Long-lived meaningful findings should still be promoted into repo evidence under the existing SimCore evidence discipline.

## 25. Fail-closed behavior

If the policy engine cannot determine admission safely:

```text
UNKNOWN / policy schema mismatch / contradictory inputs
→ HOLD_PENDING or REJECT_UNVERIFIED
```

Never default to `ADMIT_STRONG` on tooling failure.

Core runtime behavior must remain unaffected by cache-policy failure.

## 26. Required future fixtures

A future implementation/prototype should prove at least:

```text
1. EXACT_ID authoritative receipt
   → baseline learning admitted

2. HEURISTIC receipt
   → baseline learning rejected, diagnostic-only allowed

3. AMBIGUOUS receipt
   → no baseline mutation

4. trusted provider drop + Prefix Map unavailable
   → provider regression may be confirmed, first cause remains UNKNOWN

5. trusted provider drop + PRE_SIMCORE first break
   → reject strong SimCore-first-cause attribution

6. trusted provider drop + SIMCORE stable first break + compatible Guardian drift
   → strong SimCore cache-regression candidate allowed

7. Guardian stable SAME with provider drop
   → provider regression may stand; stable-ABI regression claim rejected absent other evidence

8. one exact bad request
   → regime CANDIDATE at most, never CONFIRMED alone

9. repeated trusted samples establish new baseline
   → regime confirmation may become admissible

10. superseded heuristic evidence
    → retained in provenance, excluded from active support

11. missing receipt source
    → UNVERIFIED, not MISS

12. contradictory compatible evidence
    → HOLD_PENDING / WATCH, no forced strong verdict

13. wrong request family despite exact receipt
    → reject baseline bucket admission on compatibility grounds

14. renderer boundary unchanged

15. no raw body retention

16. cache-policy failure does not alter Core semantic state
```

## 27. Recommended implementation shape if activated

Prefer one small policy vocabulary/module consumed by cache research components rather than duplicated conditionals in each consumer.

Conceptual:

```text
Evidence Chain nodes
→ Evidence Admission Policy
→ admission decision + reason code
→ Baseline / Sentinel / Regime / Analyzer
```

The policy should consume producer outputs, not re-parse provider logs or re-compute Prefix Map facts.

Potential reason codes:

```text
ADMIT_EXACT_PROVIDER_SAMPLE
ADMIT_VALIDATED_STRONG_BOUNDED_SAMPLE
DIAGNOSTIC_HEURISTIC_ONLY
REJECT_AMBIGUOUS_CORRELATION
REJECT_NO_PROVIDER_AUTHORITY
REJECT_INCOMPATIBLE_BASELINE_FAMILY
REJECT_MISSING_FIRST_BREAK_EVIDENCE
REJECT_PRE_SIMCORE_FOR_SIMCORE_ATTRIBUTION
HOLD_CONTRADICTORY_EVIDENCE
REJECT_SUPERSEDED_EVIDENCE
REGIME_NEEDS_MORE_TRUSTED_SAMPLES
```

Keep reason codes narrow and testable.

## 28. Relationship to Evidence Chain

```text
Cache Evidence Chain
= what evidence exists and how it depends on other evidence

Cache Evidence Admission Policy
= what that evidence is allowed to support
```

The Chain preserves provenance.
The Policy enforces claim boundaries.

Neither replaces the producer authorities.

## 29. Relationship to the full cache stack

```text
Usage Dashboard
→ provider cache evidence

Receipt Correlator
→ request/receipt identity quality

Evidence Chain
→ provenance DAG

Evidence Admission Policy
→ shared trust/admission gates

Prefix Map
→ local first-break facts

Baseline Profile
→ normal behavior model

Regression Sentinel
→ anomaly classification

Regime Ledger
→ long-chat regime history

Opportunity Analyzer
→ engineering-value ranking

Budgeter / Segment Identity / Manifest / Guardian
→ pre-release prompt stability protection
```

## 30. Current classification

```text
GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY
= HIGH VALUE
= LOW SEMANTIC RISK
= COMMON TRUST GATE
= CLAIM-SCOPED / FAIL-CLOSED
= IDEA / DESIGN CANDIDATE
= NO RUNTIME CHANGE
= NO PROMPT BYTE CHANGE
```

Preferred timing:

```text
v0.64.7 live close
→ receipt-correlation feasibility evidence
→ Evidence Chain / Admission Policy prototype only when real paired samples exist
→ no plugin IPC or runtime coupling before evidence requires it
```
