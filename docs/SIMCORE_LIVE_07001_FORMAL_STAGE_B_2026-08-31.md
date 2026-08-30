# SimCore v0.70.1 Formal Stage B Evidence

Date: 2026-08-31 KST
Status: **FORMAL STAGE B ACCEPTED · STAGE C OPEN · NO LIVE_PASS AUTHORITY**
Classification: **REAL LONG-CHAT VALIDATION / STAGE B / SAME-GENERATION WARM CONTROL / PROMPT-ACCOUNTING COLLAPSE / OUTPUT STORAGE WATCH**

## 1. Production under test

```text
Version: 0.70.1
Release: Cold First-Turn Tail Attribution
Release authority: release-simcore
```

Parent formal Stage A:

- `docs/SIMCORE_LIVE_07001_FORMAL_STAGE_A_2026-08-31.md`

Frozen protocol authority:

- `docs/SIMCORE_LIVE_07001_COLD_FIRST_TURN_TAIL_ATTRIBUTION_VALIDATION_PROTOCOL_2026-08-30.md`

## 2. Same-generation warm-control proof

Formal Stage A runtime identity:

```text
Runtime boot: 2026-08-30T16:21:09.767Z
Generation:   mtg0nuvb-la3x91
```

Supplied Stage B diagnostic reports exactly the same runtime identity:

```text
Runtime boot: 2026-08-30T16:21:09.767Z
Generation:   mtg0nuvb-la3x91
```

Therefore the sample satisfies the frozen Stage B requirement: the immediate warm control is inside the same fresh runtime generation as Stage A.

Correctness/state checks:

```text
Probe context CURRENT TURN
Request hook SEEN
Core handshake FOUND
Runtime ACTIVE
output COMMITTED
binding BOUND
stability PASS
continuity PASS
frame PASS
Warnings 0
```

No semantic/continuity regression is visible in the supplied diagnostic.

## 3. Stage B request timing

Turn binding:

```text
request user @2660
output assistant @2661
Mode A
```

Request timing:

```text
handshake        29.0 ms
prepared        317.0 ms
request done    320.0 ms
onSend          287.0 ms
post-onSend       3.0 ms
request hotspot  TURN_STORAGE · 285.0 ms · 89.1%
```

Turn storage:

```text
payload 25,946 chars
set 285.0 ms
set/1K 10.98 ms
```

## 4. Stage A -> Stage B prompt-accounting collapse

Formal Stage A attribution:

```text
named         374.0 ms
history         1.0 ms
prompt        372.0 ms
topology        1.0 ms
candidate       0.0 ms
unattributed    0.0 ms
```

Formal Stage B attribution:

```text
named           3.0 ms
history         1.0 ms
prompt          1.0 ms
topology        1.0 ms
candidate       0.0 ms
unattributed    0.0 ms
```

Direct comparison:

```text
PROMPT_ACCOUNTING 372.0 ms -> 1.0 ms
post-onSend       374.0 ms -> 3.0 ms
unattributed        0.0 ms -> 0.0 ms
```

This is the exact fresh-to-warm shape the v0.70.1 protocol was designed to test.

Disposition:

```text
FORMAL_STAGE_B = ACCEPTED
FRESH_TO_WARM_PROMPT_COLLAPSE = OBSERVED
```

The Stage A elevation was fully bounded inside named SimCore checkpoints and materially collapsed on the immediate same-generation warm control.

This strongly increases confidence that the observed first-request tail family is SimCore-named rather than an unattributed host/scheduler gap.

However, the frozen protocol still requires an independent second fresh runtime Stage C before a terminal `SIMCORE_NAMED_TAIL` verdict or LIVE_PASS authority can be created.

## 5. Separate repeated output-storage latency WATCH

Stage B also reports:

```text
Output handler total 1.934 s
Output process       1.769 s
Output storage       1.756 s
Output hotspot       OUT_STORAGE · 1.756 s · 90.8%
Deferred mirror      COMMITTED · 161.0 ms
```

A prior supporting same-generation sample S3 reported:

```text
Output storage 1.981 s
Output hotspot OUT_STORAGE · 1.981 s · 93.0%
```

Because elevated output-storage latency has now appeared in two supplied real long-chat diagnostics, preserve it as:

```text
WATCH · REPEATED_OUT_STORAGE_LATENCY
```

This WATCH remains non-blocking for v0.70.1 first-turn-tail validation because:

```text
binding BOUND
output COMMITTED
mirror COMMITTED
representation EXACT
continuity PASS
frame PASS
Warnings 0
```

No storage optimization or causality claim is authorized from two samples alone. The lane should be monitored separately and must not be conflated with PROMPT_ACCOUNTING ownership.

## 6. Cache observations remain separate

Stage B cache telemetry:

```text
Cache break          PRE_SIMCORE · CHAT_HISTORY @19 assistant->assistant
SimCore contribution NOT_FIRST_BREAK
Cache effect         REUSE_WINDOW_GROWING
provider cache       UNVERIFIED
```

These observations belong to the separate cache/cost program and do not alter the v0.70.1 first-turn-tail verdict.

## 7. Formal live-gate status

```text
FORMAL_STAGE_A = ACCEPTED
FORMAL_STAGE_B = ACCEPTED
FORMAL_STAGE_C = OPEN
HUMAN_LIVE_PASS = NOT CREATED
```

Current formal evidence now establishes one complete fresh/warm pair:

```text
Stage A fresh generation mtg0nuvb-la3x91
  PROMPT_ACCOUNTING 372 ms

Stage B same generation mtg0nuvb-la3x91
  PROMPT_ACCOUNTING 1 ms
```

The required next step is a second independent fresh runtime generation.

## 8. Stage C requirement

Refresh/reload so the diagnostic itself proves a new runtime identity.

Stage C must report both:

```text
new Runtime boot timestamp != 2026-08-30T16:21:09.767Z
new generation id != mtg0nuvb-la3x91
```

Then capture the first ordinary long-chat request in that new generation with:

```text
CURRENT TURN
SEEN / FOUND / ACTIVE / COMMITTED / BOUND
continuity/frame/state healthy
Post-onSend attribution present
```

The key question is whether the new independent fresh runtime again shows a materially elevated named `PROMPT_ACCOUNTING` span with near-zero/unattributed residual.

## 9. Authority boundary

This evidence does not authorize:

```text
LIVE_PASS
terminal release convergence
SIMCORE_NAMED_TAIL final verdict
successor optimization
prompt-accounting rewrite
storage optimization
cache implementation
provider-cache claim
```

No runtime, `release-simcore`, `latest.js`, `install.js`, persistent schema, release-system, or deployment state is changed by this evidence record.
