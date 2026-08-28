# SimCore live performance evidence — v0.65.0 manual-edit rebuild 18.372 s

Date: 2026-08-28
Status: **DIRECT PERFORMANCE EVIDENCE · REBUILD-DOMINATED REQUEST · NON_BLOCKING CORRECTNESS · INTERNAL CAUSE UNRESOLVED · NO OPTIMIZATION AUTHORITY**

## Trigger packet

```text
Version: 0.65.0
Captured: 2026-08-28T16:33:05.099Z
boot: 2026-08-28T15:06:17.830Z
generation: mtd33vja-616y70
request @2284 -> assistant @2285
```

Operator state:

```text
previous assistant was manually edited
prior representation was OUTPUT_MISMATCH
current edited body matched neither prior Canonical nor prior Fresh
```

Correctness result:

```text
Edit origin: AMBIGUOUS_CHANGE
Edit reconcile: MANUAL_EDIT_REBUILT
snapshot UPDATED
```

The performance observation is therefore attached to a correctness-required conservative rebuild path, not to an ordinary exact-carryover request.

## Direct timings

```text
request hook -> done       18.991 s
post-handshake total       18.971 s
Edit Reconcile             18.372 s
request hotspot share      96.7%
onSend                       593 ms
turn storage                 590 ms
```

The request is unambiguously rebuild-dominated among currently measured request buckets.

## Relation to existing evidence

Existing long-chat timing inventory already preserves genuine manual rebuild specimens around:

```text
v0.64.2  MANUAL_EDIT_REBUILT 11.678 s
v0.64.5  MANUAL_EDIT_REBUILT 12.012 s
```

This v0.65.0 sample extends the observed upper range:

```text
MANUAL_EDIT_REBUILT 18.372 s
```

It is therefore useful recurrence/scale evidence that the full rebuild boundary can become very expensive in an extreme long chat.

## Bounded interpretation

Directly supported:

```text
manual rebuild boundary was expensive
Edit Reconcile dominated measured request time
correct conservative rebuild completed
output later committed successfully
```

Not supported:

```text
specific algorithmic complexity
history scan is the root cause
SnapshotStore read is the root cause
storage write is the root cause
GC/event-loop pause is the root cause
M2-3 extraction itself caused the latency
18 s is avoidable without further evidence
```

The current diagnostic does not expose the internal manual-rebuild cost breakdown.

## Correctness must stay above performance

The preceding state was ambiguous:

```text
Prior representation OUTPUT_MISMATCH
operator-created third representation
currentMatch NONE
```

Therefore skipping the rebuild merely to recover latency would weaken the identity/edit safety contract.

Canonical rule:

```text
performance observation
!= authority to weaken conservative edit attribution
```

Any future optimization must preserve:

```text
unknown / ambiguous visible representation
-> no false Fresh alias acceptance
-> safe state rebuild or an equivalently proven conservative path
```

## Disposition

```text
MANUAL_EDIT_REBUILD_LONG_CHAT_LATENCY
= DIRECT
= RECURRENT EXPENSIVE BOUNDARY
= NEW OBSERVED SAMPLE 18.372 S
= CORRECTNESS PATH SUCCEEDED
= NON_BLOCKING FOR CURRENT M2-3 LIVE ACCEPTANCE
= INTERNAL CAUSE MISSING
= FUTURE PERFORMANCE RESEARCH INPUT
= NO RUNTIME CHANGE
```

Cross references:

- `docs/SIMCORE_LONG_CHAT_EXISTING_TIMING_EVIDENCE_INVENTORY_IDEA.md`
- `docs/SIMCORE_LONG_CHAT_PERFORMANCE_RESEARCH_CHARTER.md`
- `docs/SIMCORE_LIVE_06500_SUBGATE_B_NATURAL_OUTPUT_MISMATCH_THEN_MANUAL_EDIT_2026-08-28.md`
