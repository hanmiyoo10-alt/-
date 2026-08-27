# SimCore Diagnostic Review Episode Template

Authority: `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`
Design authority: `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD_DESIGN_2026-08-27.md`

Use one block per bounded diagnostic-review episode. Fill only source-backed facts. Do not infer provider/model root cause, recurrence, severity, gate outcome, or runtime-fix authority from this template alone.

---

## Review identity

```text
Review episode ID:
Reviewed at:
Purpose / active gate:
Source evidence refs:
Owning anomaly/evidence/gate authority:
```

## Packet sequence

Record every related packet; do not keep only the latest packet.

```text
P1
capture:
version:
runtime boot / generation / epoch:
user → assistant:
mode / stored mode:
action: ordinary | retry | reroll | manual-edit-send | refresh-boundary | reload-boundary | other
probe/binding:

P2
...
```

## User-intent sequence

For every distinct user request:

```text
request identity:
bounded semantic intent:
explicit scope/structure/time/lifecycle constraints:
```

## Visible-output sequence

For every distinct generation/visible revision:

```text
output identity:
opening semantic frame:
major content categories:
current-input adherence:
previous-turn replay/scope/chronology/structure observation:
visible symptom or healthy control:
```

## Adjacent delta matrix

For each adjacent packet pair use only `CHANGED / UNCHANGED / UNRESOLVED / NOT_APPLICABLE` plus a short source-backed note.

```text
pair: P1 → P2
A turn/request identity:
B operator action:
C user intent:
D output semantic frame:
E runtime generation/epoch:
F edit/representation state:
G history mutation/stabilization:
H cache topology/break/trajectory:
I runtime prompt identity tiers:
J lifecycle/frame/chronology:
K telemetry handoff:
L warnings/compat diagnostics:
M timing/hotspots:
```

## Scoped diagnostic interpretation

```text
binding/runtime:
edit/representation:
history/cache:
runtime prompt identity:
lifecycle/chronology:
telemetry/reload:
timing/hotspots:
```

For every PASS/STABLE/COMMITTED-like state, state its owned scope. Never promote a subsystem status to global semantic correctness.

## Controls

```text
same-input retry/reroll:
neighbor healthy turn:
next-turn inheritance:
manual-edit positive control:
pre/post reload boundary:
same-runtime invariant comparison:
cross-runtime comparison:
```

## Finding boundary

```text
observable symptom/control:
visible-truth confidence:
runtime-truth facts:
sequence-truth facts:
attribution maturity: UNPROVEN unless stronger evidence exists
recurrence handoff:
forensic-classification handoff:
gate effect:
preservation sink:
```

## Explicit non-claims

```text
- 
- 
```

Examples when applicable:

```text
retry clearance != second natural recurrence
Warnings 0 != no semantic anomaly
cache STABLE != provider cache verified
SimCore contribution NO_BREAK != provider/model health
same-generation baseline != cross-reload PASS
observed symptom != confirmed SimCore root cause
```

## Review result

Choose exactly one:

```text
DIAG_REVIEW_COMPLETE_NO_NEW_FINDING
DIAG_REVIEW_COMPLETE_FINDING_PRESERVED
DIAG_REVIEW_NEEDS_CONTEXT
DIAG_REVIEW_BLOCKED
```

```text
result:
result basis:
missing context if any:
next evidence/action owner:
```

---

## Fast operator shorthand

```text
BIND → READ INPUT → READ OUTPUT → ORDER → DELTA
→ CHANGED + UNCHANGED
→ SCOPE subsystem status
→ BUILD controls
→ separate SYMPTOM / ATTRIBUTION
→ HAND OFF / PRESERVE
```
