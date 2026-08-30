# SimCore v0.70.1 Formal Stage C + Attribution Verdict

Date: 2026-08-31 KST
Status: **FORMAL STAGE C ACCEPTED · ATTRIBUTION = SIMCORE_NAMED_TAIL · HUMAN LIVE DECISION PENDING**
Classification: **REAL LONG-CHAT VALIDATION / STAGE C / INDEPENDENT FRESH RUNTIME / TERMINAL ATTRIBUTION / ACCEPTANCE-READY**

## 1. Production under test

```text
Version: 0.70.1
Release: Cold First-Turn Tail Attribution
Release authority: release-simcore
```

Frozen protocol authority:

- `docs/SIMCORE_LIVE_07001_COLD_FIRST_TURN_TAIL_ATTRIBUTION_VALIDATION_PROTOCOL_2026-08-30.md`

Prior formal evidence:

- `docs/SIMCORE_LIVE_07001_FORMAL_STAGE_A_2026-08-31.md`
- `docs/SIMCORE_LIVE_07001_FORMAL_STAGE_B_2026-08-31.md`

## 2. Stage C fresh-runtime proof

Stage A/B runtime identity:

```text
Runtime boot: 2026-08-30T16:21:09.767Z
Generation:   mtg0nuvb-la3x91
```

Stage C diagnostic:

```text
Runtime boot: 2026-08-30T16:26:41.216Z
Generation:   mtg0uym8-3avg9c
Session load: COLD_INIT
```

Both runtime boot and generation rotated, so this is an independent second fresh runtime and satisfies the frozen Stage C freshness boundary.

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
Compatibility diagnostics 0
```

No v0.70.1 correctness regression is visible.

## 3. Stage C request timing

Turn binding:

```text
request user @2662
output assistant @2663
Mode C
```

Request timing:

```text
handshake          3.199 s
prepared           4.544 s
request done      12.994 s
onSend             1.345 s
post-onSend        8.451 s
request hotspot    POST_ONSEND · 8.451 s · 65.0%
```

Handshake detail:

```text
indices 997 ms
chat    1.117 s
session 1.083 s
```

Session load:

```text
COLD_INIT
character 1.082 s
```

Turn storage:

```text
payload 26,013 chars
set 1.340 s
set/1K 51.51 ms
```

These additional cold-path costs are observed but are not the owner selected by the frozen v0.70.1 post-onSend attribution protocol.

## 4. Stage C post-onSend attribution

```text
Post-onSend attribution:
  named         8.451 s
  history       2.0 ms
  prompt        8.445 s
  topology      4.0 ms
  candidate     0.0 ms
  unattributed  0.0 ms
  first-request COLD_INIT
  confidence    BOUNDED
```

Therefore:

```text
post-onSend total  8.451 s
named closure      8.451 s
PROMPT_ACCOUNTING  8.445 s
unattributed       0.0 ms
```

The second independent fresh runtime reproduces the same exact named owner family observed in formal Stage A, with a substantially larger magnitude and zero unattributed residual.

## 5. Optional same-generation Stage C warm follow-up

A naturally available immediate continuation in the same Stage C generation was also supplied:

```text
Runtime boot: 2026-08-30T16:26:41.216Z
Generation:   mtg0uym8-3avg9c
Session load: LOCATION_REUSE
request user @2664
output assistant @2665
Warnings 0
continuity PASS
frame PASS
```

Warm timing:

```text
request done       397 ms
onSend             360 ms
post-onSend          4 ms
```

Warm attribution:

```text
named         4 ms
history       1 ms
prompt        0 ms
topology      3 ms
candidate     0 ms
unattributed  0 ms
```

So the second fresh generation also shows an immediate local collapse:

```text
Stage C fresh PROMPT_ACCOUNTING 8.445 s
Stage C warm  PROMPT_ACCOUNTING 0 ms
```

This warm follow-up exceeds the frozen minimum gate and independently reinforces the same ownership shape.

## 6. Frozen verdict-rule evaluation

The frozen `SIMCORE_NAMED_TAIL` rule requires:

```text
1. both independent fresh samples show the dominant first-turn delay repeatedly enclosed by the same named exact SimCore span or spans
2. the same named ownership materially collapses in the same-generation warm control
```

Observed formal matrix:

```text
Fresh #1 · Stage A · generation mtg0nuvb-la3x91
  PROMPT_ACCOUNTING 372 ms
  post-onSend       374 ms
  unattributed        0 ms

Warm #1 · Stage B · same generation mtg0nuvb-la3x91
  PROMPT_ACCOUNTING   1 ms
  post-onSend         3 ms
  unattributed        0 ms

Fresh #2 · Stage C · generation mtg0uym8-3avg9c
  PROMPT_ACCOUNTING 8.445 s
  post-onSend       8.451 s
  unattributed         0 ms

Optional Warm #2 · same generation mtg0uym8-3avg9c
  PROMPT_ACCOUNTING   0 ms
  post-onSend         4 ms
  unattributed        0 ms
```

Evaluation:

```text
same named exact owner across independent fresh samples = YES
owner materially collapses on required warm control     = YES
closure confidence                                      = BOUNDED
unattributed dominant gap                               = NO
correctness regression                                  = NO
```

Therefore the frozen attribution verdict is:

```text
ATTRIBUTION_VERDICT = SIMCORE_NAMED_TAIL
OWNER               = PROMPT_ACCOUNTING
```

This verdict identifies the exact SimCore accounting span measured by v0.70.1. It does not by itself authorize a speculative rewrite inside that span; successor optimization design must still isolate the concrete operation(s) responsible for the cost.

## 7. Live acceptance matrix disposition

```text
FORMAL_STAGE_A = ACCEPTED
FORMAL_STAGE_B = ACCEPTED
FORMAL_STAGE_C = ACCEPTED
ATTRIBUTION    = SIMCORE_NAMED_TAIL
BLOCKER        = NONE OBSERVED
HUMAN_LIVE_PASS = NOT CREATED
```

The frozen A/B/C evidence matrix is complete and acceptance-ready.

Per protocol, completing the matrix and deriving the bounded attribution verdict does **not** authorize the assistant/automation to infer `LIVE_PASS`.

Required remaining authority transition:

```text
present acceptance-ready result to human operator
-> human explicitly declares LIVE_PASS or other disposition
-> only then create HUMAN_EVIDENCE through existing release authority
-> run terminal convergence unchanged
```

## 8. Separate output-storage WATCH

Stage C fresh output reports:

```text
Output storage 1.395 s
Output hotspot OUT_STORAGE · 1.395 s · 90.8%
```

Earlier real long-chat samples reported:

```text
S3      OUT_STORAGE 1.981 s
Stage B OUT_STORAGE 1.756 s
```

Disposition remains:

```text
WATCH · REPEATED_OUT_STORAGE_LATENCY
```

The Stage C warm follow-up returned to:

```text
OUT_STORAGE 549 ms
```

Correctness, binding, mirror, representation, continuity and frame state remained healthy throughout. This lane stays separate from the v0.70.1 prompt-tail attribution verdict and does not authorize a storage optimization yet.

## 9. Cache/cost observations remain separate

Stage C fresh cache telemetry:

```text
Cache break          PRE_SIMCORE · CHAT_HISTORY @9
SimCore contribution NOT_FIRST_BREAK
Cache effect         REUSE_WINDOW_STABLE
Cache trajectory     REGRESSED
provider cache       UNVERIFIED
```

Stage C warm:

```text
Cache break          PRE_SIMCORE · CHAT_HISTORY @9
SimCore contribution NOT_FIRST_BREAK
Cache effect         REUSE_WINDOW_STABLE
Cache trajectory     VOLATILE
provider cache       UNVERIFIED
```

These remain evidence for the separately authorized cache/cost program. They neither weaken nor prove provider cache behavior.

## 10. Authority boundary

This evidence authorizes only the bounded attribution result:

```text
SIMCORE_NAMED_TAIL
owner PROMPT_ACCOUNTING
```

It does not independently authorize:

```text
HUMAN LIVE_PASS
terminal release convergence
successor implementation
prompt-accounting rewrite
storage optimization
cache implementation
provider-cache claim
release-system changes
```

No runtime, `release-simcore`, `latest.js`, `install.js`, persistent schema, deployment state, or release-system behavior is changed by this evidence record.
