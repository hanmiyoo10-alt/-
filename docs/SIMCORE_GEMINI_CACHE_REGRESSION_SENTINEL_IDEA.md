# SimCore Gemini Cache Regression Sentinel — Idea

Date: 2026-08-25
Status: `IDEA RECORDED · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE RESEARCH`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_IMPLICIT_PROMPT_CACHE_IDEA_LAB.md`

## 1. Idea

Build a bounded **Cache Regression Sentinel** that stays quiet during normal Gemini implicit-cache behavior and activates only when previously healthy cache reuse degrades materially.

The sentinel is not a cache controller. It is an attribution/observability layer.

```text
healthy cache trajectory
→ quiet

material cache reuse drop
→ correlate Gemini cache receipt + SimCore prefix evidence
→ classify probable ownership/reason
→ surface bounded regression finding
```

No explicit cache creation, TTL orchestration, synthetic warmup request, history rewrite, or provider routing change.

## 2. Evidence planes

The design intentionally keeps two authorities separate.

### Gemini / Usage Dashboard evidence

Possible bounded receipt fields:

```text
request correlation identity
model / route family when available
input/prompt tokens
cached tokens / provider cache read evidence
cache write evidence when available
capturedAt
metric source
```

### SimCore evidence

```text
first-break owner/index
common prefix messages/chars
stable compiler identity
slow compiler identity
volatile/full compiler identity
runtime generation / reload continuity
request cadence
```

The sentinel only correlates these planes. It must not infer a provider cache hit from SimCore fingerprints alone.

## 3. Core question

The product question is not:

```text
Did this request have a cache hit?
```

The more useful question is:

```text
Was this request materially worse than its recent healthy Gemini implicit-cache baseline,
and if so, where did the reusable prefix stop being stable?
```

## 4. Baseline model

Maintain only a small bounded recent cache trajectory, for example the last few compatible successful requests.

Conceptual metrics:

```text
cached token ratio = cached_tokens / input_tokens
uncached input = input_tokens - cached_tokens
common-prefix chars/messages
first-break owner
stable/slow compiler SAME/CHANGED
request interval
```

Do not hard-code one universal "good" ratio. Long-chat shape changes naturally.

Preferred baseline:

```text
recent compatible healthy median / EMA
```

Compatibility should require at least the same chat/location and compatible Gemini/model family. Route/scope compatibility is used only when authoritative evidence exists.

## 5. Regression trigger

A candidate regression exists only when a drop is material relative to recent compatible baseline.

Conceptual example:

```text
recent cached ratio: 86%, 88%, 87%
current cached ratio: 18%
→ MATERIAL_DROP
```

But a material drop is not automatically a SimCore defect.

The trigger enters attribution.

## 6. Attribution classes

Initial vocabulary should remain narrow:

```text
PRE_SIMCORE_PREFIX_BREAK
- first meaningful break occurs in host/history before SimCore
- SimCore = NOT_FIRST_BREAK

SIMCORE_STABLE_ABI_DRIFT
- stable/slow cache-critical SimCore serialization changed unexpectedly
- strongest SimCore-owned cache-regression candidate

EXPECTED_VOLATILE_CHANGE
- stable/slow remain SAME
- only volatile/full runtime tier changed
- not sufficient to blame SimCore

RELOAD_OBSERVER_ONLY
- local telemetry generation changed but request-prefix evidence remained healthy
- do not confuse observer reset with provider cache reset

CADENCE_OR_EXPIRY_CANDIDATE
- prompt evidence stable
- unusually long request interval
- authoritative TTL/expiry evidence absent
- heuristic only, never state expiry as fact

ROUTE_OR_SCOPE_CHANGE
- only when gateway exposes authoritative route/cache-scope change

UNKNOWN_EXTERNAL
- cache receipt degraded but local evidence does not establish ownership
```

No automatic FIX classification from a single cache drop.

## 7. Escalation policy

```text
single unexplained drop
→ WATCH

repeated PRE_SIMCORE drops
→ WATCH / HOST_HISTORY

repeated same stable-tier SimCore drift with matching cache loss
→ FIX CANDIDATE

cache drop + correctness/state fault
→ handle correctness fault independently; correctness outranks cache
```

The sentinel must never weaken Mirror, Representation, Edit Reconcile, Broadcast, Time, Frame, Structure, or state safety to restore a cache metric.

## 8. Diagnostic shape

Healthy state should be terse or omitted.

Regression example:

```text
Gemini cache sentinel: WATCH
Cached ratio 87% → 19%
First break: PRE_SIMCORE · CHAT_HISTORY @2143
SimCore stable: SAME
SimCore slow: SAME
Attribution: PRE_SIMCORE_PREFIX_BREAK
```

Possible SimCore-owned candidate:

```text
Gemini cache sentinel: WATCH
Cached ratio 84% → 22%
First break: SIMCORE_RUNTIME
Stable ABI: CHANGED
Slow ABI: SAME
Attribution: SIMCORE_STABLE_ABI_DRIFT
```

Provider/gateway authority remains explicit. If no receipt is available:

```text
Gemini cache sentinel: UNVERIFIED · no authoritative cache receipt
```

## 9. UI relationship

Do not make a permanent cache dashboard in v1.

Possible future relationship with the warning mini-widget:

```text
ordinary healthy cache fluctuation
→ no widget

material repeated cache regression classified WATCH/FIX candidate
→ optional small cache warning indicator
```

This should remain separate from correctness Warnings unless later design explicitly promotes a repeated cache regression into a performance/observability warning class.

## 10. Release / CI relationship

The Sentinel complements, but does not replace, a Cache ABI CI gate.

```text
Cache ABI CI
= prevent known stable/slow byte drift before release

Cache Regression Sentinel
= detect real-world implicit-cache degradation after release
```

Together they form:

```text
PREVENT
→ OBSERVE
→ ATTRIBUTE
→ ONLY THEN OPTIMIZE
```

## 11. Privacy and boundedness

Never retain:

```text
raw prompt bodies
raw chat history
raw user/assistant text
full gateway logs
```

Retain only bounded metadata/fingerprints/counts required for short trajectory comparison.

## 12. Current verdict

```text
name: GEMINI_CACHE_REGRESSION_SENTINEL
scope: Gemini implicit caching + prompt caching friendliness only
value: HIGH for long-chat cache operations
semantic risk: LOW if observation-only
runtime change: NONE YET
preferred timing: after current v0.64.7 live close and cache-receipt correlation feasibility
```
