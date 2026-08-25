# SimCore Gemini Cache Baseline Profile — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · BASELINE/ANOMALY MODEL · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Give each long chat its own cache-health baseline so anomaly detection is based on that chat's normal behavior instead of one global hard threshold.

The Baseline Profile does not optimize the prompt by itself. It observes bounded cache/prefix metrics and answers:

```text
What is normal for this chat/request family?
Is the current cache result meaningfully outside that normal range?
Is this a new regime or a likely regression?
```

This is an observability layer only.

## 2. Why a per-chat baseline

Absolute thresholds are weak for long-chat cache monitoring.

Example:

```text
Chat A normally caches 88-93%
current 70%
→ meaningful degradation

Chat B normally caches 55-68%
current 62%
→ normal
```

A fixed rule such as `cached ratio < 70% = bad` would false-positive Chat B and may miss subtler regressions in Chat A.

Therefore:

```text
Sentinel threshold
= relative to learned healthy baseline
not one universal percentage
```

## 3. Responsibility boundary

Constitutional rule remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Baseline Profile may observe and classify cache behavior, but must never:

```text
rewrite prose
change user/history content
move prompt sections automatically
change model instructions solely for a cache score
weaken state/validation safety
```

Any optimization motivated by the profile is a separate design/release item.

## 4. Evidence inputs

Preferred evidence planes:

```text
Gemini receipt evidence
→ input/prompt tokens
→ cached tokens / cache-read evidence
→ bounded route/model metadata when available

Cache Prefix Map
→ reusable-prefix estimate
→ first-break owner
→ first-break location
→ cache-shadow status

Runtime context
→ SimCore version
→ runtime generation / reload boundary
→ request family / mode
→ cadence bucket
```

No single plane should replace the others.

## 5. Baseline should be family-aware

Do not merge all requests into one average if their prompt/runtime shapes are meaningfully different.

Initial family key may include only stable, bounded dimensions such as:

```text
chat/location identity
Gemini model family
request mode/family: C / B_START / B_CONTINUE / B_END
reload generation class: steady / first-after-reload
```

Do not over-segment initially.

Secondary-character activation, Summary, or other semantic dimensions should become separate baseline axes only if evidence shows they materially shift cache behavior.

Rule:

> Split a baseline only when the split explains real variance; do not create dozens of sparse buckets.

## 6. Warm-up / confidence states

Never treat the first few observations as a trusted baseline.

Suggested conceptual states:

```text
COLD
→ insufficient evidence

WARMING
→ collecting samples

ESTABLISHED
→ enough healthy samples for anomaly comparison

STALE
→ baseline belongs to an old incompatible cache ABI / model / prompt regime

RESET_REQUIRED
→ deliberate stable/slow cache ABI change or incompatible model/gateway regime
```

A COLD/WARMING profile may display observations but must not emit a strong regression classification.

## 7. Healthy-sample admission

The baseline must not learn from obviously bad requests and normalize a regression into 'normal'.

A sample is a candidate healthy baseline input only when bounded gates pass, for example:

```text
request/output completed normally
no correctness BLOCKER
no unresolved SimCore-owned cache regression classification
receipt evidence is present and trustworthy
comparison context is compatible
```

Do not automatically exclude every warning; some warnings may be unrelated to cache. Admission policy should remain narrow and evidence-based.

Important anti-poisoning rule:

```text
current anomaly detection
→ classify current sample first
→ only then decide whether it may update the baseline
```

Do not update the baseline before judging the sample against the prior baseline.

## 8. Robust statistics, not simple lifetime average

Avoid a simple unbounded mean because one bad request or an old historical regime can distort it.

Preferred conceptual model:

```text
bounded rolling window
+ median / quantile range
+ optional EWMA for recent drift
```

Candidate stored summary:

```text
sample count
recent window count
median cached ratio
p25 / p75 cached ratio
median cached tokens
median input tokens
median reusable-prefix ratio
common first-break family
last healthy timestamp
baseline ABI/model identity
```

Raw prompt bodies are never retained.

Exact statistical method is implementation-time design and should be fixture-driven.

## 9. Anomaly semantics

The Baseline Profile should provide context to the Cache Regression Sentinel rather than independently creating a second alert system.

Conceptual levels:

```text
NORMAL
→ inside expected baseline band

SOFT_DEVIATION
→ below normal, but single/weak evidence

REGRESSION_CANDIDATE
→ material drop relative to established baseline

REGIME_CHANGE
→ repeated new level that correlates with an intentional model/cache-ABI/topology change

UNKNOWN
→ insufficient or incompatible evidence
```

A one-off drop should normally remain `SOFT_DEVIATION / WATCH` unless other evidence is strong.

## 10. Relative-drop model

Example baseline:

```text
family: C / steady runtime
samples: 18
cached ratio median: 88%
p25-p75: 84-91%
reusable prefix median: 94%
common first break: PRE_SIMCORE history tail
```

Current request:

```text
cached ratio: 82%
→ likely NORMAL / weak deviation
```

Current request:

```text
cached ratio: 31%
→ material relative collapse
→ ask Prefix Map / Guardian / reload / route evidence for attribution
```

Do not freeze the exact percentage-drop threshold at idea stage.

## 11. Sentinel integration

Recommended flow:

```text
Gemini receipt arrives
→ correlate request
→ load compatible Baseline Profile
→ compare current result against prior healthy baseline
→ Cache Prefix Map supplies first-break attribution
→ Guardian supplies release-time stable/slow ABI evidence when relevant
→ Sentinel emits bounded classification
→ only afterward admit/reject sample for baseline learning
```

Examples:

```text
large cached-token drop
+ baseline ESTABLISHED
+ first break PRE_SIMCORE
+ Guardian stable/slow SAME
→ SENTINEL WATCH: HOST_HISTORY_OR_EXTERNAL_CACHE
```

```text
large cached-token drop
+ first break SIMCORE stable
+ Guardian PRESERVE expected
→ CACHE_ABI_REGRESSION_CANDIDATE
```

```text
large drop immediately after deliberate declared ABI/model change
+ repeated stable new level
→ REGIME_CHANGE candidate
→ establish new baseline only after explicit compatibility decision
```

## 12. Baseline reset / compatibility

A baseline must not silently span incompatible prompt/cache regimes.

Potential hard reset or new-profile triggers:

```text
Gemini model family changes materially
stable cache ABI intentionally changes
slow cache ABI intentionally changes with declared incompatibility
chat/location identity changes
major request-topology contract changes
```

Potential non-reset events:

```text
ordinary new turn
volatile mode fields changing within a compatible family
page reload when v0.64.7 telemetry continuity proves same compatible context
```

Exact reset rules must reuse Guardian/Prefix Map identities rather than invent duplicate compatibility logic.

## 13. Persistence and boundedness

The profile is operational telemetry, not semantic Core state.

Preferred constraints:

```text
no raw bodies
no full request snapshots
no unlimited history
bounded per-chat/family summary only
small rolling sample buffer or sufficient statistics
```

Do not add expensive SnapshotStore writes merely for cache analytics if a lighter existing telemetry persistence owner is available.

Storage architecture must be decided separately from the statistical idea, with measured latency impact.

## 14. UI / diagnostics

First version should be diagnostic-only.

Compact example:

```text
Cache baseline: ESTABLISHED · C/steady · median 88% · band 84-91% · current 31% · DEVIATION
```

Expanded view:

```text
Baseline Profile
family              C / steady
samples             18
cached ratio median 88%
normal band         84-91%
current             31%
prefix baseline     94%
first-break norm    PRE_SIMCORE history tail
classification      REGRESSION_CANDIDATE
```

A floating warning/cache widget may consume Sentinel output later; Baseline Profile itself should not create a separate noisy UI.

## 15. Cold-start behavior

Early in a chat or after a hard reset:

```text
Cache baseline: WARMING · 3/required samples
```

No strong alert from baseline deviation alone.

If independent hard evidence exists, such as an undeclared stable ABI drift caught by Guardian, that can still fail CI or classify separately. Baseline absence must not suppress stronger evidence.

## 16. Natural drift vs regression

Long chats naturally grow and provider behavior may drift.

Therefore the profile should be capable of slow adaptation without instantly accepting a sudden collapse as normal.

Desired principle:

```text
slow sustained healthy shift
→ baseline can adapt

sudden large negative jump
→ detect first
→ do not immediately learn it
```

This is why rolling robust statistics plus anomaly-first admission are preferred.

## 17. Required future fixtures

A future implementation should prove at least:

```text
1. cold profile
   → no strong regression claim

2. enough healthy samples
   → ESTABLISHED

3. normal variation inside band
   → NORMAL

4. one large cache drop
   → deviation detected before baseline update

5. anomalous sample excluded from healthy baseline
   → baseline not poisoned

6. repeated healthy new regime after declared compatible change
   → controlled adaptation/new baseline

7. C and B_CONTINUE materially different
   → family-aware baselines do not contaminate each other

8. sparse family
   → WARMING rather than false precision

9. reload with compatible continuity
   → same baseline may continue

10. incompatible model/cache ABI change
   → old baseline STALE/RESET_REQUIRED

11. no raw content retention

12. Sentinel consumes baseline output rather than duplicating statistics

13. Prefix Map remains sole first-break attribution owner

14. Renderer boundary unchanged
```

## 18. Non-goals

```text
prompt rewriting
model prose generation
automatic provider switching
explicit Gemini cache resources
route pinning
unbounded machine-learning model
opaque anomaly scoring
correctness decisions based on cache score
```

Prefer explainable bounded rules over a black-box anomaly detector.

## 19. Relationship of cache components

Target architecture:

```text
Usage Dashboard / approved receipt source
= what Gemini actually cached

Cache Prefix Map
= where the request prefix changed

Cache Baseline Profile
= what is normal for this chat/family

Cache Regression Sentinel
= is this request abnormally worse, and how should it be classified

Cache ABI Guardian
= prevent undeclared SimCore stable/slow drift before release
```

No component takes over main-model rendering.

## 20. Current classification

```text
GEMINI_CACHE_BASELINE_PROFILE
= HIGH VALUE
= LOW SEMANTIC RISK
= OBSERVABILITY / ANOMALY-CONTEXT LAYER
= IDEA / DESIGN CANDIDATE

primary value:
reduce Sentinel false positives
make cache regression relative to real long-chat behavior

runtime mutation:
NONE today

renderer responsibility change:
NONE
```
