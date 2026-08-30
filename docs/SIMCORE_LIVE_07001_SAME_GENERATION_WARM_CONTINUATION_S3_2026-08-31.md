# SimCore v0.70.1 Same-Generation Warm Continuation S3

Date: 2026-08-31 KST
Status: **SUPPORTING WATCH EVIDENCE · SAME GENERATION · NOT FORMAL STAGE A/B/C · NO LIVE_PASS AUTHORITY**
Classification: **REAL LONG-CHAT EVIDENCE / WATCH SUPPORT / WARM CONTINUATION**

## 1. Parent evidence

This addendum extends:

- `docs/SIMCORE_LIVE_07001_SAME_GENERATION_PROMPT_TAIL_WATCH_2026-08-31.md`

Production under test:

```text
Version: 0.70.1
Release: Cold First-Turn Tail Attribution
Generation: mtfyw9tn-tpy6kf
Runtime boot: 2026-08-30T15:31:43.163Z
```

The generation and runtime boot are unchanged from S0/S1/S2, so this sample is not accepted as a fresh-runtime Stage A or Stage C sample.

## 2. S3 request evidence

Turn binding:

```text
request user @2656
output assistant @2657
Mode A
Probe context CURRENT TURN
Request hook SEEN
Core handshake FOUND
Runtime ACTIVE
output COMMITTED
binding BOUND
continuity PASS
Warnings 0
```

Request timing:

```text
handshake        26.0 ms
prepared        318.0 ms
request done    322.0 ms
onSend          292.0 ms
post-onSend       4.0 ms
request hotspot  TURN_STORAGE · 289.0 ms
```

v0.70.1 attribution:

```text
named         4.0 ms
history       1.0 ms
prompt        1.0 ms
topology      2.0 ms
candidate     0.0 ms
unattributed  0.0 ms
first-request LOCATION_REUSE
confidence    BOUNDED
```

The named prompt-accounting span therefore remained small on another same-generation continuation.

Current sequence:

```text
S0 PROMPT_ACCOUNTING  4.955 s
S1 PROMPT_ACCOUNTING  4.0 ms
S2 PROMPT_ACCOUNTING  1.0 ms
S3 PROMPT_ACCOUNTING  1.0 ms
```

Disposition:

```text
WATCH SUPPORT · SAME_GENERATION_PROMPT_TAIL_COLLAPSE
```

This strengthens the observation that the one large bounded named prompt-accounting span did not recur on later requests in the same runtime generation.

## 3. Separate output-side latency observation

S3 also reports:

```text
Output handler total 2.131 s
Output process       1.992 s
Output storage       1.981 s
Output hotspot       OUT_STORAGE · 1.981 s · 93.0%
Deferred mirror      COMMITTED · 189.0 ms
```

This is not the v0.70.1 target lane. It is preserved as a non-blocking observation only because correctness, binding, continuity, representation identity and deferred mirror all remained healthy.

Disposition:

```text
WATCH · ISOLATED_OUT_STORAGE_LATENCY
```

One isolated output-storage latency sample does not authorize a storage optimization or causal claim.

## 4. Cache-side observations remain separate

```text
Cache break          PRE_SIMCORE · CHAT_HISTORY @15 assistant->assistant
SimCore contribution NOT_FIRST_BREAK
Cache effect         REUSE_WINDOW_GROWING
provider cache       UNVERIFIED
```

These observations remain evidence for the separate cache/cost program and do not alter the v0.70.1 prompt-tail verdict.

## 5. Formal live-gate status

```text
FORMAL_STAGE_A = NOT YET PROVEN
FORMAL_STAGE_B = NOT YET PROVEN
FORMAL_STAGE_C = NOT YET PROVEN
HUMAN_LIVE_PASS = NOT CREATED
```

The next formal evidence still requires a diagnostic with both:

```text
new runtime boot timestamp
new generation id != mtfyw9tn-tpy6kf
```

Then take the immediate same-generation warm control, followed later by a second independent fresh runtime generation.

## 6. Authority boundary

This evidence does not authorize:

```text
LIVE_PASS
terminal release convergence
successor optimization
prompt-accounting rewrite
storage optimization
cache implementation
provider-cache claim
```

No runtime, `release-simcore`, `latest.js`, `install.js`, persistent schema, release-system, or deployment state is changed by this supporting evidence record.
