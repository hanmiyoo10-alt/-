# SimCore v0.70.1 Formal Stage A Evidence

Date: 2026-08-31 KST
Status: **FORMAL STAGE A ACCEPTED · STAGE B/C OPEN · NO LIVE_PASS AUTHORITY**
Classification: **REAL LONG-CHAT VALIDATION / STAGE A / FRESH RUNTIME / PROMPT-ACCOUNTING ATTRIBUTION**

## 1. Production under test

```text
Version: 0.70.1
Release: Cold First-Turn Tail Attribution
Release authority: release-simcore
```

Frozen protocol authority:

- `docs/SIMCORE_LIVE_07001_COLD_FIRST_TURN_TAIL_ATTRIBUTION_VALIDATION_PROTOCOL_2026-08-30.md`

## 2. Fresh-runtime proof

The supplied diagnostic proves a new SimCore runtime identity relative to the prior same-generation evidence:

```text
previous runtime boot: 2026-08-30T15:31:43.163Z
previous generation:   mtfyw9tn-tpy6kf

Stage A runtime boot:  2026-08-30T16:21:09.767Z
Stage A generation:    mtg0nuvb-la3x91
```

Therefore this sample satisfies the frozen Stage A runtime-freshness boundary.

The diagnostic also reports:

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

No v0.70.1 correctness regression is visible in the supplied diagnostic.

## 3. Stage A request timing

Turn binding:

```text
request user @2658
output assistant @2659
Mode A
```

Request timing:

```text
handshake        23.0 ms
prepared        716.0 ms
request done      1.090 s
onSend           691.0 ms
post-onSend      374.0 ms
request hotspot  TURN_STORAGE · 689.0 ms · 63.2%
```

Turn storage:

```text
payload 26,033 chars
set 689.0 ms
set/1K 26.47 ms
```

The request was slower than the immediately preceding same-generation warm samples, but the dominant total request hotspot in this Stage A sample was turn storage rather than post-onSend.

## 4. v0.70.1 post-onSend attribution

```text
Post-onSend attribution:
  named         374.0 ms
  history       1.0 ms
  prompt        372.0 ms
  topology      1.0 ms
  candidate     0.0 ms
  unattributed  0.0 ms
  first-request LOCATION_REUSE
  confidence    BOUNDED
```

Interpretation:

```text
post-onSend total 374.0 ms
named closure     374.0 ms
PROMPT_ACCOUNTING 372.0 ms
unattributed        0.0 ms
```

So the fresh-runtime post-onSend residual is again fully enclosed by named SimCore checkpoints, with nearly all of that residual inside `PROMPT_ACCOUNTING`.

This is directionally consistent with the earlier supporting same-generation cold-like sample:

```text
supporting S0 prompt 4.955 s
formal Stage A prompt 372.0 ms
warm supporting prompt 4.0 ms / 1.0 ms / 1.0 ms
```

However, magnitude differs substantially, and the frozen verdict rule requires an immediate same-generation warm control plus a second independent fresh runtime before `SIMCORE_NAMED_TAIL` can be declared.

## 5. Telemetry and cache observations

The new runtime adopted prior bounded telemetry through host-local transport:

```text
Telemetry continuity ADOPTED
via host-local
from 0.70.1
age 2m 31.5s
host-local boot CONSUMED
```

Cache observations:

```text
Cache break PRE_SIMCORE · CHAT_HISTORY @17 assistant->assistant
SimCore contribution NOT_FIRST_BREAK
Cache effect REUSE_WINDOW_STABLE
provider cache UNVERIFIED
```

These cache observations are separate from the v0.70.1 first-turn-tail verdict and do not prove provider-cache behavior.

`first-request LOCATION_REUSE` is treated as the reported session path, not as a contradiction of fresh runtime identity. Freshness for this protocol is proven by the rotated runtime boot timestamp and generation id.

## 6. Stage A disposition

```text
FORMAL_STAGE_A = ACCEPTED
FORMAL_STAGE_B = OPEN
FORMAL_STAGE_C = OPEN
HUMAN_LIVE_PASS = NOT CREATED
```

Current evidence supports:

```text
fresh-runtime named PROMPT_ACCOUNTING elevation = OBSERVED
fresh-runtime unattributed host/scheduler gap    = NOT OBSERVED in Stage A
repeatable independent fresh-runtime ownership   = NOT YET PROVEN
```

No terminal attribution verdict is created yet.

## 7. Immediate next evidence

Do not refresh or reload before Stage B.

The next diagnostic must remain in:

```text
generation mtg0nuvb-la3x91
runtime boot 2026-08-30T16:21:09.767Z
```

and should capture the next ordinary long-chat request with:

```text
CURRENT TURN
SEEN / FOUND / ACTIVE / COMMITTED / BOUND
continuity/frame/state healthy
Post-onSend attribution present
```

The key comparison is whether `PROMPT_ACCOUNTING 372.0 ms` materially collapses in the same-generation warm request.

After Stage B, a second independently refreshed runtime with another new generation is still mandatory for Stage C.

## 8. Authority boundary

This evidence does not authorize:

```text
LIVE_PASS
terminal release convergence
SIMCORE_NAMED_TAIL final verdict
successor optimization
prompt-accounting rewrite
cache implementation
storage optimization
provider-cache claim
```

No runtime, `release-simcore`, `latest.js`, `install.js`, persistent schema, release-system, or deployment state is changed by this evidence record.
