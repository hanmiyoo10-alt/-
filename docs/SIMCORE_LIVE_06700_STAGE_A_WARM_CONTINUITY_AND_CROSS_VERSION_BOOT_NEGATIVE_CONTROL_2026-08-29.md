# SimCore v0.67.0 Stage A warm continuity + cross-version Host-local negative control

Date: 2026-08-29 KST

Status: **STAGE A PASS · TWO NATURAL A TURNS · CROSS-VERSION HOST-LOCAL INCOMPATIBLE FAIL-CLOSED OBSERVED · STAGE B RELOAD ADOPTION STILL PENDING**

## Scope

This packet evaluates the first bounded real-long-chat ordinary continuity evidence for published SimCore v0.67.0 M2-5 Recovery Transition Debt Retirement.

The live contract is defined by:

- `docs/SIMCORE_06700_M2_5_RECOVERY_TRANSITION_DEBT_RETIREMENT_DESIGN_2026-08-29.md`
- `docs/SIMCORE_LIVE_06700_M2_5_OPERATOR_CARD_2026-08-29.md`

The removed Recovery facade had zero runtime callers before deletion, so the primary live objective is to prove that ordinary direct-owner paths remain healthy after publication.

## Production identity observed

All supplied diagnostics report:

```text
Version: 0.67.0
Runtime boot: 2026-08-29T11:36:24.111Z
generation: mteb1str-0spl52
Reload safety: ARMED
epoch: 1
stale drops: 0
hook cleanup: NAMED
```

This matches the published v0.67 line.

## Packet 0 — stale diagnostic excluded from current-turn correctness

The first supplied diagnostic reports:

```text
Probe context: STALE
probe user @2402
current user @2400
Request hook: n/a
Core handshake: n/a
Runtime status: n/a
Stability: NOT_EXERCISED
```

Therefore it is not used as a current-turn correctness specimen.

However, it contains valid boot/telemetry evidence:

```text
Telemetry continuity: FRESH · host-local-incompatible
Host-local boot: INCOMPATIBLE
Telemetry capsule: COMPACT_V2 4501/16384 OK
HOST_LOCAL WRITTEN
```

Interpretation:

```text
pre-v0.67 / incompatible host-local checkpoint encountered at v0.67 boot
→ adoption refused
→ no unsafe carryover
→ fresh current-version checkpoint written
```

Classification:

```text
06700_CROSS_VERSION_HOST_LOCAL_INCOMPATIBLE_NEGATIVE_CONTROL
= PASS
= FAIL_CLOSED
= NOT A STAGE B POSITIVE ADOPTION
```

## Stage A specimen 1 — @2402 → @2403

Observed:

```text
Probe context CURRENT TURN
Request hook SEEN
Core handshake FOUND
Runtime ACTIVE
output COMMITTED
Mode A
binding BOUND
mirror COMMITTED
stale 0
Session load LOCATION_REUSE
```

Edit / representation:

```text
Edit reconcile SAME_FAST 1ms
snapshot UNCHANGED
Prior representation EXACT
canonical 2370:42b6172a
fresh     2370:42b6172a
Edit origin NONE
current match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER
```

Output:

```text
Deferred mirror COMMITTED
CANONICAL 1794:828a427
FRESH_CHAT 1794:828a427
Output representation EXACT
Warnings 0
```

Natural compatibility path:

```text
THOUGHTS_COMPAT
SAFE_ENVELOPE_COMPAT
chars 3632
action STRIPPED
Compatibility diagnostics 1
```

The final canonical/Fresh output remained exact after compatibility stripping.

Continuity:

```text
RAW frame volume83 same
chapter2→3 advanced
Chatindex1172→1173 advanced
Frame sequence PASS
Frame guard PASS
Continuity summary PASS
Narrative clock 14:00→15:00
```

Telemetry remained bounded:

```text
COMPACT_V2 4592/16384 OK
HOST_LOCAL WRITTEN
```

No missing Recovery reference, bootstrap fault, output-owner fault or mirror fault is present.

## Stage A specimen 2 — @2404 → @2405

Observed:

```text
Probe context CURRENT TURN
Request hook SEEN
Core handshake FOUND
Runtime ACTIVE
output COMMITTED
Mode A
binding BOUND
mirror COMMITTED
stale 0
Session load LOCATION_REUSE
```

Edit / representation:

```text
Edit reconcile SAME_FAST 0ms
snapshot UNCHANGED
Prior representation EXACT
canonical 1794:828a4276
fresh     1794:828a4276
Edit origin NONE
current match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER
```

Output:

```text
Deferred mirror COMMITTED
CANONICAL 3258:e1dd940
FRESH_CHAT 3258:e1dd940
Output representation EXACT
Warnings 0
```

Natural compatibility path again exercised:

```text
THOUGHTS_COMPAT
SAFE_ENVELOPE_COMPAT
chars 1964
action STRIPPED
Compatibility diagnostics 1
```

Continuity:

```text
RAW frame volume83 same
chapter3→4 advanced
Chatindex1173→1174 advanced
Frame sequence PASS
Frame guard PASS
Continuity summary PASS
```

Telemetry:

```text
COMPACT_V2 4701/16384 OK
HOST_LOCAL WRITTEN
```

Again, no missing-module or Bootstrap Migration failure appears after Recovery retirement.

## Performance observations

Specimen 1 includes:

```text
Pre snapshot REPEAT-SEND READ HIT 1.371s
request prepared 2.229s
Turn storage 730ms
```

Specimen 2 returns to:

```text
request prepared 373ms
Turn storage 349ms
```

This is preserved as ordinary performance evidence only. It is not promoted to a new FIX/WATCH from this packet because the slower pre-load did not recur comparably and correctness remained intact.

Existing performance WATCH items remain separate.

## Stage A verdict

The required ordinary warm-continuity conditions are directly proven by two natural requests:

```text
Version 0.67.0                         PASS
request hook SEEN                      PASS
binding BOUND                          PASS
output COMMITTED                       PASS
stale drops 0                          PASS
SAME_FAST eligible carryover           PASS x2
Prior representation EXACT             PASS x2
Edit origin NONE                       PASS x2
output representation EXACT            PASS x2
Deferred mirror COMMITTED              PASS x2
Warnings no M2-5-specific fault        PASS
missing Recovery reference absent      PASS
bootstrap/direct-owner failure absent  PASS
```

Classification:

```text
06700_STAGE_A_ORDINARY_WARM_CONTINUITY
= PASS
= DIRECT LIVE PROVEN
```

## Current live matrix

```text
Stage A ordinary warm continuity                 PASS
Cross-version Host-local incompatible negative   PASS / bonus
Stage B same-tab reload/bootstrap positive       PENDING
Stage C natural M2 positive-control sampling     OPPORTUNISTIC
Stage D natural domain coverage                  OPPORTUNISTIC
```

## Next bounded action

The current v0.67 generation has written fresh current-version Host-local checkpoints repeatedly.

Perform an intentional same-tab refresh while the checkpoint is still within the normal compatibility TTL, then capture:

1. first natural request after refresh + diagnostic;
2. second natural request in the same new generation + diagnostic.

Expected positive path when eligible:

```text
new runtime generation
Telemetry continuity ADOPTED via host-local
from 0.67.0
boot CONSUMED
bounded precision truthful
new HOST_LOCAL WRITTEN
```

Then on the second request:

```text
LOCATION_REUSE
ordinary SAME_FAST / exact carryover when eligible
output COMMITTED
mirror COMMITTED
no bootstrap or missing-module fault
```

If the checkpoint is instead stale/incompatible, record the truthful fail-closed result and restage a fresh checkpoint before attempting the positive adoption proof. Do not fake eligibility.
