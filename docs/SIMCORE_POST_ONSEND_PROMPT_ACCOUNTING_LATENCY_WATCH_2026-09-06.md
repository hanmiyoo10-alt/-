# SimCore post-onSend Prompt-Accounting Latency Watch

Date: 2026-09-06 KST
Status: **WATCH · PERFORMANCE · REQUEST CORRECTNESS PASS**
Tracking: `#1653`
Source set: v0.70.10 Lens 2 · generation `mtp6ixup-wzmr63`

## Observation

The operator identifies specimen A as the first real turn after page refresh. It reports:

```text
Session load = LOCATION_REUSE
post-onSend = 2.588 s
history = 2 ms
prompt = 2.584 s
topology = 2 ms
candidate = 0 ms
unattributed = 0 ms
confidence = BOUNDED
```

Subsequent same-generation specimens collapse sharply:

```text
B post-onSend = 21 ms · prompt = 16 ms
C post-onSend = 5 ms · prompt = 1 ms
D post-onSend = 5 ms · prompt = 0 ms
```

## Historical relation

Earlier v0.70.8 post-refresh evidence contained a distinct first-request sample:

```text
Session load = COLD_INIT
post-onSend ~= 8.975 s
prompt ~= 8.970 s
```

The current v0.70.10 specimen is `LOCATION_REUSE`, not `COLD_INIT`. Therefore the broad slow-first-request prompt-accounting family is not confined to the earlier COLD_INIT precondition.

This does not prove the same hidden host cause across versions.

## Disposition

```text
REQUEST_CORRECTNESS = PASS
PROMPT_ACCOUNTING_LATENCY = WATCH / CROSS-VERSION RECURRENCE
CURRENT_SAMPLE = 2.584S / LOCATION_REUSE
COLD_INIT_AS_SOLE_PRECONDITION = NOT SUPPORTED
HOST_INTERNAL_CAUSE = UNKNOWN / NOT CLAIMED
PROVIDER_CACHE_CAUSE = UNVERIFIED / NOT CLAIMED
OPTIMIZATION_MECHANISM = NOT AUTHORIZED
```

This lane is distinct from `#1588`, which owns the output-side awaited Host-local telemetry checkpoint set latency.

## Production boundary

Evidence-only record. No runtime, release-simcore, release-state, latest.js, or install.js mutation.