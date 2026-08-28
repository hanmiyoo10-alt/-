# SimCore live evidence — v0.65.0 Subgate B natural mismatch to fast reconcile

Date: 2026-08-28

Status: **DIRECT LIVE PASS · REPRESENTATION FAST RECONCILE CONTROL CLOSED · SUBGATE B STILL PENDING GENUINE EDIT FROM PRIOR EXACT**

Runtime:

```text
Version: 0.65.0
boot: 2026-08-28T15:06:17.830Z
generation: mtd33vja-616y70
```

This document preserves the operator-supplied two-packet episode that directly exercises the frozen M2-3 fast-reconcile acceptance control. It is evidence only and does not authorize any runtime mutation.

---

## 1. Frozen target

Required control:

```text
prior OUTPUT_MISMATCH
+ next request with no edit / reroll / reload
+ current visible previous assistant == prior FRESH_CHAT exact
→ Edit origin REPRESENTATION_DRIFT_CORRELATED
→ Edit reconcile REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

---

## 2. Packet A — natural OUTPUT_MISMATCH prerequisite

Turn binding:

```text
request @2288
output  @2289
Mode A
ACTIVE / COMMITTED
binding BOUND
```

Request-side prior representation was healthy exact carryover:

```text
Edit reconcile SAME_FAST
snapshot UNCHANGED
Prior representation EXACT
canonical 2611:a1edcfca
fresh     2611:a1edcfca
Edit origin NONE
current 2611:a1edcfca
match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER
```

The output then naturally produced the required mismatch prerequisite:

```text
Stability OBSERVED
mirror OUTPUT_MISMATCH
Deferred mirror OUTPUT_MISMATCH
out @2289

HOST_RAW   6552:6500889
CANONICAL  3494:5f3a562
FRESH_CHAT 3494:b3abda7
match MISMATCH
CANONICAL <-> FRESH DIFFERENT
Delta chars +0
```

No unsafe mirror write was performed.

Packet A classification:

```text
06500_NATURAL_OUTPUT_MISMATCH_PREREQUISITE
= DIRECT LIVE OBSERVATION
= SAFE CONSERVATIVE MIRROR BLOCK
= FAST-RECONCILE OPPORTUNITY CREATED
```

No runtime correctness blocker is established in Packet A.

---

## 3. Packet B — exact Fresh carryover fast reconcile

The operator supplied the next natural request without editing, rerolling, or reloading the prior assistant representation.

Turn binding:

```text
request @2290
output  @2291
same boot / same generation
Mode A
ACTIVE / COMMITTED
binding BOUND
mirror COMMITTED
```

The request-side Edit Reconcile result is the exact frozen target:

```text
Edit reconcile REPRESENTATION_FAST_RECONCILED · 1.0 ms
snapshot UNCHANGED
representation fresh-exact-carryover

Prior representation OUTPUT_MISMATCH
mirror MISMATCH
canonical 3494:5f3a562
fresh     3494:b3abda7f

Edit origin REPRESENTATION_DRIFT_CORRELATED
current 3494:b3abda7f
match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER
```

This proves that the extracted v0.65.0 Edit Reconcile owner preserved the required exact-Fresh alias recovery path.

The new output returned to exact canonical/Fresh identity:

```text
Deferred mirror COMMITTED
HOST_RAW   6006:d8bfe01
CANONICAL  2043:1da8a80
FRESH_CHAT 2043:1da8a80
match CANONICAL
CANONICAL <-> FRESH EXACT
```

Packet B classification:

```text
06500_M2_3_REPRESENTATION_FAST_RECONCILE
= PASS
= DIRECT LIVE PROVEN
= PRIOR OUTPUT_MISMATCH
= CURRENT FRESH_CHAT EXACT
= REPRESENTATION_DRIFT_CORRELATED
= REPRESENTATION_FAST_RECONCILED
= SNAPSHOT UNCHANGED
= NO FALSE MANUAL REBUILD
= MIRROR RECOVERED TO COMMITTED
```

---

## 4. Semantic / chronology regression check

Packet A:

```text
Warnings 0
Frame sequence PASS
Frame guard PASS
Visible chronology PASS_OR_NOT_APPLICABLE
Narrative clock ADVANCED
```

Packet B:

```text
Warnings 0
Frame sequence PASS
Frame guard PASS
RAW frame regression NONE
Visible chronology PASS_OR_NOT_APPLICABLE
```

The visible Packet B response stays on the current requested Running Man / twins topic. No replay, source substitution, or chronology rollback is established.

---

## 5. Separate observations and classifications

These observations do not change the fast-reconcile PASS.

### Cache/history topology regression

Packet B reports:

```text
Cache trajectory REGRESSED
frontier 37 -> 10
Cache break PRE_SIMCORE / CHAT_HISTORY
SimCore contribution NOT_FIRST_BREAK
Representation correlation NO_MATCH
Rebuild attribution OUT_OF_WINDOW / LOW
provider cache UNVERIFIED
```

Classification:

```text
06500_FAST_RECONCILE_CACHE_TOPOLOGY_REGRESSION
= WATCH
= PRE_SIMCORE FIRST BREAK
= NO SIMCORE CAUSALITY PROVEN
= NO EDIT-RECONCILE CORRECTNESS FAILURE
```

Do not patch M2-3 from this observation.

### Storage boundary latency

Observed samples include:

```text
Packet A request TURN_STORAGE 622 ms
Packet A output storage 903 ms
Packet B output storage 1.486 s
Packet B host checkpoint write 299 ms
```

Classification:

```text
06500_FAST_RECONCILE_STORAGE_LATENCY
= WATCH
= PERFORMANCE EVIDENCE
= CORRECTNESS HEALTHY
= CAUSE NOT PROMOTED
```

Do not weaken correctness gates based on these samples.

### Thoughts compatibility stripping

Both packets report zero warnings with bounded compatibility stripping. Packet B returns exact output representation and mirror commit after stripping.

Classification:

```text
THOUGHTS_COMPAT_STRIP
= EXPECTED COMPATIBILITY PATH
= NO VISIBLE PREAMBLE REGRESSION ESTABLISHED
```

---

## 6. Subgate B disposition after this episode

Current v0.65.0 M2-3 live controls:

```text
ordinary exact carryover                                  PASS
natural OUTPUT_MISMATCH occurrence                        PASS / DIRECT
natural mismatch -> exact Fresh fast reconcile            PASS / DIRECT
manual third-representation safety fallback               PASS / EXTRA CONTROL
genuine edit from Prior EXACT -> USER_EDIT_CANDIDATE      STILL REQUIRED
```

Therefore:

```text
M2-3 Subgate B = NOT YET CLOSED
remaining mandatory control = 1
```

The remaining control must be physically separate:

```text
start from Prior representation EXACT
manually edit the visible previous assistant
send one natural next request
expect:
  current match NONE
  Edit origin USER_EDIT_CANDIDATE
  Edit reconcile MANUAL_EDIT_REBUILT
  snapshot UPDATED
```

No runtime change is authorized by this episode.

---

## 7. Gate effect

This episode closes the previously missing natural fast-reconcile acceptance specimen.

It does **not** close the whole v0.65.0 product live gate because the genuine manual-edit positive control from a Prior EXACT state remains unproven.

Classification:

```text
06500_SUBGATE_B_FAST_RECONCILE_CONTROL
= PASS

06500_SUBGATE_B_OVERALL
= PENDING_ONE_CONTROL

CURRENT BLOCKER
= NONE DISCOVERED BY THIS EPISODE
```
