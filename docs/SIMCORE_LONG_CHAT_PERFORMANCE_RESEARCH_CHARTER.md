# SimCore Long-Chat Performance Research Charter

Date: 2026-08-25
Status: `DESIGN / RESEARCH ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

## Purpose

Freeze the operating boundary for the next non-cache research track: long-chat performance / Store latency.

This track is intentionally modeled after the Gemini cache research process:

```text
collect repository/live evidence
→ map latency domains
→ define ownership
→ design measurement vocabulary
→ identify candidate bottlenecks
→ define safety/performance invariants
→ completeness audit

STOP BEFORE IMPLEMENTATION
```

The existence of a design candidate does not authorize code changes.

## Hard freeze

Until a later explicit implementation decision is made:

```text
work branch implementation      NO
latest.js / install.js changes  NO
release-simcore deployment      NO
runtime instrumentation changes NO
SnapshotStore schema changes    NO
host/network/timer changes      NO
performance optimization patch  NO
```

Research may inspect current source, existing diagnostics, historical evidence, static call paths, and existing timing telemetry. It may propose future instrumentation, but must not install that instrumentation yet.

## Research scope

Primary evidence-backed subjects include:

```text
STORE_LATENCY_DOMINANCE
SnapshotStore read/write latency distribution
request-preparation vs output-finalization cost
manual-edit rebuild cost
first-request-after-reload rebuild cost
repeated parse / serialize / fingerprint work
hot-path ownership and attribution
long-chat scale behavior
```

The first obligation is attribution, not optimization.

Canonical rule:

```text
slow request observed
→ identify exact cost owner
→ prove recurrence / scale
→ determine avoidable vs required work
→ only then design an optimization candidate
```

## Constitutional boundary

Performance research must preserve:

```text
Correctness
→ Safety
→ State stability
→ Prompt stability
→ Performance
→ Convenience
```

It must not improve latency by weakening:

```text
Representation / Edit Reconcile correctness
SnapshotStore state integrity
Deferred Mirror safety
Time / Frame / Broadcast authority
Structure validation
Recovery / bootstrap semantics
Main Model renderer boundary
```

SimCore remains state/policy/boundary/validation/runtime coordination. Main Model remains renderer.

## Relationship to active production work

This research track is independent of the active M2-3 workstream and current production live gates.

It must not be used to smuggle performance changes into a mechanical M2 ownership checkpoint.

If a future optimization is accepted, it must follow the normal SimCore workflow as its own work item:

```text
main design/evidence
→ dedicated work branch
→ static/CI
→ release-simcore
→ real long-chat validation
→ main evidence sync
```

That implementation sequence is future-only and is not authorized by this charter.

## Research stopping rule

Like the cache research track, stop horizontal idea expansion once the architecture is sufficiently closed.

Before implementation can even be proposed, require a completeness audit that answers:

```text
Do we know where time is spent?
Do we know which owner is responsible?
Do existing timings support the bottleneck claim?
Do we know which work is required vs avoidable?
Can a candidate optimization preserve all semantic/state contracts?
Can its benefit be measured with existing or narrowly proposed evidence?
```

If not, continue research/evidence collection only.

## Current classification

```text
SIMCORE_LONG_CHAT_PERFORMANCE_RESEARCH
= DESIGN / RESEARCH TRACK
= CACHE-STYLE EVIDENCE-FIRST PROCESS
= ATTRIBUTION BEFORE OPTIMIZATION
= NO IMPLEMENTATION AUTHORITY
= NO RUNTIME MUTATION
= NO RELEASE AUTHORITY
```
