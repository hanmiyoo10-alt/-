# SimCore live evidence — v0.65.0 Subgate B close

Date: 2026-08-28

Status: **SUBGATE B PASS · M2-3 LIVE ACCEPTANCE COMPLETE · PRODUCT LIVE-EVIDENCE SET COMPLETE · MACHINE-MANAGED RELEASE-STATE SYNC STILL REQUIRED**

Production artifact under test:

```text
Version: 0.65.0
Release: M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence
release-simcore commit: c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
```

## 1. Ordered prerequisite

Subgate A was previously closed by:

`docs/SIMCORE_LIVE_06500_SUBGATE_A_RELOAD_ADOPTION_2026-08-28.md`

with live proof of:

```text
current-version identity
bounded COMPACT_V2 checkpoint
same-tab refresh
new runtime generation
Host-local ADOPTED via host-local
one-shot boot CONSUMED
fresh post-adoption checkpoint
second same-generation exact recovery
```

Therefore Subgate B acceptance was authorized.

## 2. Frozen M2-3 controls and results

### Ordinary exact carryover

Directly observed repeatedly, including:

```text
Prior representation EXACT
Edit origin NONE
Edit reconcile SAME_FAST
snapshot UNCHANGED
CANONICAL == FRESH_CHAT
```

Result: **PASS**.

### Natural mismatch to exact-Fresh fast reconcile

Primary evidence:

`docs/SIMCORE_LIVE_06500_SUBGATE_B_FAST_RECONCILE_PASS_2026-08-28.md`

Observed ordered episode:

```text
natural output
→ Deferred mirror OUTPUT_MISMATCH
→ CANONICAL != FRESH_CHAT

next natural request, no edit/reroll/reload
→ Prior representation OUTPUT_MISMATCH
→ current match FRESH_CHAT
→ Edit origin REPRESENTATION_DRIFT_CORRELATED
→ Edit reconcile REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

Result: **PASS / DIRECT LIVE PROVEN**.

### Genuine user edit from Prior EXACT

Primary evidence:

`docs/SIMCORE_LIVE_06500_GENUINE_EDIT_PRIOR_EXACT_PASS_2026-08-28.md`

Observed:

```text
Prior representation EXACT
operator changes visible previous assistant by -1 char
current match NONE
→ Edit origin USER_EDIT_CANDIDATE
→ Edit reconcile MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

Result: **PASS / DIRECT LIVE PROVEN**.

### Conservative ambiguous third-representation fallback

Additional safety evidence preserved in:

`docs/SIMCORE_LIVE_06500_SUBGATE_B_NATURAL_OUTPUT_MISMATCH_THEN_MANUAL_EDIT_2026-08-28.md`

Observed:

```text
Prior OUTPUT_MISMATCH
operator creates third representation
current match NONE
→ AMBIGUOUS_CHANGE
→ MANUAL_EDIT_REBUILT
```

Result: **PASS / EXTRA SAFETY CONTROL**.

## 3. Regression review disposition

Across the supplied v0.65.0 live packets:

```text
request/output binding       healthy
stale drops                  0
hooks                         NAMED
mirror safety                 preserved
Representation ownership     preserved
reload handoff                live proven
Frame sequence/guard          PASS on reviewed packets
chronology                    no blocking regression proven
persistent schema             no live change evidenced
provider cache                UNVERIFIED by policy
```

Separate observations remain outside M2-3 attribution:

```text
Community platform-family diversity recurrence = WATCH / narrow investigation queued
B_START open-scene closure-expression warning  = WATCH / known warning family / lifecycle stayed OPEN
manual rebuild latency                           = performance evidence
storage-boundary latency                         = performance evidence
cache/history first breaks                       = PRE_SIMCORE observations; provider cache UNVERIFIED
```

None of those observations establishes an Edit Reconcile correctness regression or invalidates the direct frozen controls above.

## 4. Subgate B verdict

```text
ordinary exact carryover                         PASS
natural OUTPUT_MISMATCH occurrence               PASS
mismatch -> exact Fresh fast reconcile           PASS
representation fast reconcile snapshot unchanged PASS
genuine edit from Prior EXACT                    PASS
USER_EDIT_CANDIDATE                              PASS
MANUAL_EDIT_REBUILT                              PASS
snapshot updated on genuine edit                 PASS
ambiguous third-representation fail-closed       PASS extra control
```

Final classification:

```text
06500_SUBGATE_B_M2_3_EDIT_RECONCILE
= PASS
= LIVE PROVEN
= FROZEN CONTROLS COMPLETE
```

## 5. Product live-evidence disposition

Because Subgate A and Subgate B are both directly live-proven in the required order, the v0.65.0 product live-evidence set is complete.

Evidence conclusion:

```text
v0.65.0 real long-chat acceptance evidence = COMPLETE
M2-3 live acceptance                       = COMPLETE
M2-3 checkpoint advancement evidence       = JUSTIFIED
```

This document does **not** directly edit the machine-managed production/release-state blocks in `docs/CURRENT_DEVELOPMENT.md`.

Repository policy requires the established release-state convergence/synchronization path to consume the durable evidence and change machine-managed lifecycle fields. Until that synchronization occurs, a stale `PENDING_REAL_LONG_CHAT` machine block should be interpreted as state-expression lag, not as absence of the live proof recorded here.

Next administrative action:

```text
run/complete normal release-state convergence for v0.65.0 live PASS
→ synchronize CURRENT_DEVELOPMENT machine-managed state
→ advance durable M2 checkpoint from M2-2 to M2-3 where the control plane requires it
→ only then authorize the next runtime implementation gate
```

Do not mix the separate Community/Structure investigation or any release-system restructuring into that synchronization step.