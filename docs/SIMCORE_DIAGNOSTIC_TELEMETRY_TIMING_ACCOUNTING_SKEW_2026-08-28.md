# SimCore diagnostic observation — Telemetry checkpoint timing accounting skew

Date: 2026-08-28

Status: **DIRECT DIAGNOSTIC SELF-CONSISTENCY OBSERVATION · WATCH_ONLY · NON_BLOCKING · ROOT CAUSE UNPROVEN · NO RUNTIME CHANGE**

## Trigger packet

Production/runtime packet:

```text
Version: 0.65.0
Captured: 2026-08-28T16:13:31.502Z
Runtime boot: 2026-08-28T15:06:17.830Z
generation: mtd33vja-616y70
request @2274 -> assistant @2275
```

The packet's telemetry checkpoint reports:

```text
Telemetry checkpoint:
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
4609 chars
host 97.0 ms
96.0 ms total
trigger OUTPUT_COMMIT
```

The reported Host-local component duration exceeds the reported total duration by `1.0 ms`.

## Bounded interpretation

This is a diagnostic self-consistency issue in the timing presentation only:

```text
reported host duration  97.0 ms
reported total duration 96.0 ms
relation                 host > total by 1.0 ms
```

A component duration greater than the enclosing total is not mathematically self-consistent if both values are intended to measure the same nested interval on the same clock and with the same rounding policy.

The packet does **not** establish which of the following is responsible:

- independent measurement boundaries;
- timestamp/clock granularity;
- rounding or truncation order;
- asynchronous Host-local timing being sampled outside the nominal total window;
- a diagnostic formatting/accounting bug;
- another implementation detail.

Therefore no exact cause is assigned.

## Neighboring controls

The immediately neighboring supplied packets do not reproduce the inversion:

```text
same-input reroll @2274 -> @2275:
host 75.0 ms · 75.0 ms total

next natural @2276 -> @2277:
host 35.0 ms · 39.0 ms total
```

Thus the current evidence is a one-packet, one-millisecond accounting skew rather than a repeated telemetry transport failure.

All functional telemetry outcomes in the trigger packet remain healthy:

```text
COMPACT_V2 4609/16384 OK
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
boot provenance CONSUMED / ADOPTED
```

The observation does not invalidate Host-local write, compact-capsule, or reload-adoption evidence.

## Classification

```text
TELEMETRY_CHECKPOINT_TIMING_ACCOUNTING_SKEW
= DIRECT DIAGNOSTIC SELF-CONSISTENCY OBSERVATION
= 1.0 MS INVERSION
= SINGLE PACKET
= FUNCTIONAL TELEMETRY HEALTHY
= ROOT CAUSE UNPROVEN
= WATCH_ONLY
= NON_BLOCKING
= M2-3 ATTRIBUTION NONE
= RUNTIME FIX AUTHORITY NONE
```

Promotion condition: preserve another packet if `host > total` recurs materially. Repeated or larger inversions should trigger a narrow audit of telemetry timing boundaries and formatting without changing transport semantics.

Related episode:

`docs/SIMCORE_LIVE_06500_SUBGATE_B_REROLL_NEGATIVE_CONTROL_AND_ADOPTION_GENETIC_INVERSION_2026-08-28.md`
