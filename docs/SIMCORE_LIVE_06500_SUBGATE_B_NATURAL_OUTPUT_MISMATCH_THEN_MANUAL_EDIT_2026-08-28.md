# SimCore live evidence — v0.65.0 Subgate B natural OUTPUT_MISMATCH followed by operator manual edit

Date: 2026-08-28

Status: **NATURAL OUTPUT_MISMATCH DIRECTLY OBSERVED · FAST-RECONCILE PREREQUISITE APPEARED BUT WAS NOT EXERCISED · OPERATOR MANUAL EDIT CONSERVATIVELY REBUILT · M2-3 SUBGATE B STILL INCOMPLETE**

Review completion: `DIAG_REVIEW_COMPLETE_FINDING_PRESERVED`

## 1. Scope and physical sequence

Runtime:

```text
Version: 0.65.0
boot: 2026-08-28T15:06:17.830Z
generation: mtd33vja-616y70
```

Operator-confirmed sequence:

```text
Packet A
natural request @2282 -> assistant @2283
-> Deferred Mirror records OUTPUT_MISMATCH

operator manually edits visible assistant @2283

Packet B
new natural request @2284 -> assistant @2285
-> request-side Edit Reconcile sees the manually edited third representation
-> MANUAL_EDIT_REBUILT
```

The operator explicitly confirmed that the second request was sent **after a hand edit of the previous assistant response**. This action is therefore authoritative and must not be reinterpreted as natural exact-Fresh carryover.

This episode must be read against the frozen M2-3 controls:

```text
A. Prior OUTPUT_MISMATCH + current == prior FRESH_CHAT exact
   -> REPRESENTATION_DRIFT_CORRELATED
   -> REPRESENTATION_FAST_RECONCILED
   -> snapshot UNCHANGED

B. Prior EXACT + current matches neither canonical nor Fresh
   -> USER_EDIT_CANDIDATE
   -> MANUAL_EDIT_REBUILT
```

Packet A creates the prerequisite state for A, but the operator edit changes the next request into neither A nor B. It instead exercises the conservative ambiguous-change fallback preserved by the extracted v0.65.0 Edit Reconcile owner.

---

# 2. Packet A — natural @2282 -> @2283

## Identity / binding

```text
Captured: 2026-08-28T16:30:05.688Z
request @2282 -> assistant @2283
Mode C
Runtime ACTIVE
output COMMITTED
binding BOUND
stale 0
hooks NAMED
```

The packet is an ordinary natural forward request.

## Request-side edit state

```text
Edit reconcile: SAME_FAST · 1.0 ms
snapshot UNCHANGED
Prior representation: EXACT
canonical 5413:d7f5d1f1
fresh     5413:d7f5d1f1
Edit origin: NONE
current 5413:d7f5d1f1
match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER
```

Classification:

```text
previous-turn carryover = HEALTHY EXACT CONTROL
request-side user edit  = NONE
```

## Natural output representation mismatch

This is the first important event in the episode:

```text
Stability: OBSERVED
mirror OUTPUT_MISMATCH

Deferred mirror: OUTPUT_MISMATCH
out @2283

HOST_RAW   8534:e00fafc
CANONICAL  4331:695a14c
FRESH_CHAT 4327:4d34b73
match MISMATCH

CANONICAL <-> FRESH
Delta chars -4
DIFFERENT
```

This is a direct, naturally occurring v0.65.0 representation mismatch.

Bounded conclusion:

```text
06500_NATURAL_OUTPUT_MISMATCH
= DIRECT LIVE OBSERVATION
= DIFFERENCE -4 CHARS
= DEFERRED MIRROR CONSERVATIVELY BLOCKED
= NO UNSAFE MIRROR COMMIT
```

No source/body retention exists, so the exact four-character semantic difference cannot be reconstructed from the copied diagnostic alone. Do not invent the differing substring.

## Output semantics

Current user intent:

```text
community reaction to the overseas acting career progression
supporting role -> three-top/co-lead role -> possible solo lead
awards-season expectations
existing Grammy/top-pop-star international fame
large overseas fandom as Hollywood leverage
```

The visible @2283 response directly addresses those axes. No partial previous-turn replay, unrelated-scene excursion, chronology rollback, or visible semantic contradiction is established from this packet.

## Warning / compatibility / envelope

```text
Warnings: 0
Compatibility diagnostics: 0
Preamble: THOUGHTS_COMPAT
STRIPPED / SILENT_COMPAT
Envelope recovery: NOT_APPLICABLE
Safe-envelope reconcile: NOT_APPLICABLE
```

The natural mismatch therefore occurs without a Structure or envelope warning.

## Cache / history attribution

```text
Cache topology COMMON_PREFIX 31/63
94,394/149,948 chars
Cache integrity DEGRADED
Cache break PRE_SIMCORE / CHAT_HISTORY @31
Host prefix STABLE / HIGH
History mutation @31 SAME_SLOT_CHANGED
Representation correlation NO_MATCH
Mutation attribution NO_PROVENANCE_MATCH / LOW
Rebuild attribution PREEXISTING_REQUEST_MUTATION / HIGH
SimCore contribution NOT_FIRST_BREAK
provider cache UNVERIFIED
```

This remains correlation evidence only. The first cache break is explicitly pre-SimCore and Representation correlation reports no provenance match. Do not assign the output mismatch to cache/history mutation from adjacency alone.

## Telemetry / frame / chronology

```text
COMPACT_V2 4670/16384 OK
HOST_LOCAL WRITTEN
boot CONSUMED

frame 79/14/1112 -> 79/15/1113
RAW regression NONE
Continuity PASS
Frame sequence PASS
Frame guard PASS
Narrative clock 10:00 -> 15:00
```

No reload-handoff or chronology regression is established.

## Performance observation

```text
Output handler total 1.766 s
Output process 1.512 s
OUT_STORAGE 1.502 s / 85.1%
```

This is a high output-storage boundary sample, but it is not evidence that storage caused the representation mismatch. Keep performance attribution separate from correctness attribution.

---

# 3. Why Packet A did not itself close M2-3

Packet A creates exactly the **prior-state prerequisite** for the frozen fast-reconcile acceptance:

```text
prior representation for the next request = OUTPUT_MISMATCH
canonical = 4331:695a14c8
fresh     = 4327:4d34b738
```

But the fast-reconcile control requires the next visible prior assistant to equal the recorded Fresh representation exactly.

The v0.65.0 source keeps the frozen gate:

```text
priorRepresentation === OUTPUT_MISMATCH
&& currentMatch === FRESH_CHAT
-> representation-fast-reconciled
```

The operator instead changed the visible response by hand before the next request. Therefore the prerequisite branch was no longer eligible.

This is not a failed `REPRESENTATION_FAST_RECONCILED` attempt. The operator action changed the test case before the branch could be exercised.

---

# 4. Packet B — @2284 -> @2285 after operator hand edit

## Identity / binding

```text
Captured: 2026-08-28T16:33:05.099Z
request @2284 -> assistant @2285
same boot / same generation
Mode C
output COMMITTED
binding BOUND
mirror COMMITTED
```

Physical action category:

```text
prior assistant manually edited by operator
then new natural request
```

## Prior mismatch preserved exactly

Packet B correctly carries Packet A's mismatch fingerprints forward:

```text
Prior representation: OUTPUT_MISMATCH
mirror MISMATCH
canonical 4331:695a14c8
fresh     4327:4d34b738
```

This is excellent cross-packet binding evidence.

## Hand-edited current representation

The operator-edited visible previous assistant is:

```text
current 4326:b4ed8c0b
match NONE
vs canonical -5
vs fresh     -1
shape NEW_VISIBLE_REPRESENTATION
```

Therefore it is neither of the two previously observed representations.

The exact relation is:

```text
previous Canonical 4331:695a14c8
previous Fresh     4327:4d34b738
operator edit      4326:b4ed8c0b
```

The hand edit created a third representation.

## Edit Reconcile result

```text
Edit reconcile: MANUAL_EDIT_REBUILT · 18.372 s
snapshot UPDATED
Edit origin: AMBIGUOUS_CHANGE
```

This is the expected conservative family for the actual observed preconditions.

The extracted v0.65.0 source preserves this routing rule:

```text
if priorRepresentation == OUTPUT_MISMATCH
and currentMatch == FRESH_CHAT
    -> REPRESENTATION_DRIFT_CORRELATED
else if priorRepresentation == EXACT
    -> USER_EDIT_CANDIDATE
else
    -> AMBIGUOUS_CHANGE
```

Because this packet is:

```text
priorRepresentation = OUTPUT_MISMATCH
currentMatch         = NONE
```

`AMBIGUOUS_CHANGE` is correct and the expensive rebuild is the conservative safety fallback.

Classification:

```text
06500_OUTPUT_MISMATCH_PLUS_OPERATOR_THIRD_REPRESENTATION
= DIRECT LIVE CONTROL
= AMBIGUOUS_CHANGE EXPECTED
= MANUAL_EDIT_REBUILT
= SNAPSHOT UPDATED
= NO FALSE REPRESENTATION FAST ACCEPTANCE
= NO M2-3 REGRESSION OBSERVED
```

This is useful extra M2-3 evidence because the newly extracted owner did not misclassify an actual user-modified third representation as a Fresh alias.

---

# 5. This does NOT close the frozen genuine-edit positive control

The canonical positive control requires:

```text
Prior EXACT
current != canonical
current != Fresh
-> USER_EDIT_CANDIDATE
-> MANUAL_EDIT_REBUILT
```

Packet B has:

```text
Prior OUTPUT_MISMATCH
current matches neither
-> AMBIGUOUS_CHANGE
-> MANUAL_EDIT_REBUILT
```

So the packet proves conservative rebuild under ambiguity, but **does not replace** the required v0.65.0 `Prior EXACT -> USER_EDIT_CANDIDATE` positive control.

Subgate B therefore still needs:

```text
1. natural OUTPUT_MISMATCH
   -> next request with no edit/reroll
   -> exact prior Fresh carryover
   -> REPRESENTATION_DRIFT_CORRELATED
   -> REPRESENTATION_FAST_RECONCILED
   -> snapshot UNCHANGED

2. separate genuine hand edit from a Prior EXACT state
   -> USER_EDIT_CANDIDATE
   -> MANUAL_EDIT_REBUILT
   -> snapshot UPDATED
```

Packet A supplies a direct natural mismatch specimen, but the fast-carryover opportunity attached to that specimen was consumed by the operator edit.

---

# 6. Packet B output correctness and separate Structure warning

Current user request:

```text
people say children most enthusiastically sing the animation OST released in February
```

The visible @2285 response stays on that topic and produces community reactions about preschool/elementary-school popularity and sing-along behavior.

However diagnostics report two independent Structure warnings:

```text
COMMUNITY 1-1: 알 수 없는 플랫폼
COMMUNITY 1: 플랫폼 그룹 2개 (필요 서로 다른 3개; 감지: 여초, 남초)
```

The first visible section is:

```text
[맘스홀릭 / 예비맘·육아 수다방]
```

while the other sections are `더쿠` and `에펨코리아`. The runtime taxonomy recognizes only two required platform families in the resulting block and treats one platform as unknown.

This is a Structure/Community-platform contract observation, not an Edit Reconcile result. It is preserved separately in:

`docs/SIMCORE_STRUCTURE_PLATFORM_DIVERSITY_WATCH_2026-08-28.md`

Do not patch platform taxonomy/diversity inside M2-3 ownership validation.

---

# 7. Packet B performance observation

The request is overwhelmingly dominated by the genuine rebuild path:

```text
request total    18.991 s
Edit Reconcile   18.372 s
share            96.7%
```

This exceeds earlier preserved extreme-long-chat genuine-edit samples around `11.678 s` and `12.012 s`.

Correct interpretation:

```text
MANUAL_EDIT_REBUILT remains correctness-required
18.372 s is direct boundary-latency evidence
internal causal breakdown remains unknown
not a reason to weaken rebuild safety
```

This datapoint belongs to long-chat performance research, not to the M2-3 correctness verdict.

---

# 8. Other Packet B subsystem review

## Output representation after rebuild

```text
HOST_RAW   7471:e0ef015
CANONICAL  2280:7f1ce08
FRESH_CHAT 2280:7f1ce08
match CANONICAL
EXACT
Deferred mirror COMMITTED
```

The new output returns to exact canonical/Fresh identity after the rebuild.

This is useful recovery evidence:

```text
ambiguous previous representation
-> conservative rebuild
-> next output representation exact
```

## Cache/history

```text
COMMON_PREFIX 33/65
PRE_SIMCORE / CHAT_HISTORY @33
Host prefix STABLE
Representation correlation CANONICAL@2271,FRESH_CHAT@2271
Mutation attribution AMBIGUOUS_HISTORY_MATCH / MEDIUM
Rebuild attribution PREEXISTING_REQUEST_MUTATION / HIGH
SimCore contribution NOT_FIRST_BREAK
```

The history observer's older representation correlation is not evidence that it caused the operator edit or current rebuild. The operator action independently establishes the edit.

## Telemetry

```text
COMPACT_V2 4697/16384 OK
Telemetry capsule topology precision PREFIX_FLOOR
Handoff precision topology COMPLETE_PREFIX
HOST_LOCAL WRITTEN
```

The current exported checkpoint's topology precision and the boot-adopted handoff precision refer to different observation surfaces; do not treat those labels as a contradiction.

## Chronology

```text
frame 79/15/1113 -> 79/16/1114
RAW regression NONE
Continuity PASS
Frame sequence PASS
Frame guard PASS
Narrative clock 2032-08-05 15:00 -> 2032-08-07 14:00
```

No chronology regression is observed.

---

# 9. Cross-episode disposition

```text
Subgate A reload/identity closure                PASS previously
ordinary exact carryover                        PASS
natural OUTPUT_MISMATCH occurrence              NOW DIRECTLY OBSERVED
natural mismatch -> exact Fresh fast reconcile  STILL NOT EXERCISED
manual third-representation safety fallback     PASS / DIRECT EXTRA CONTROL
genuine edit from Prior EXACT                   STILL REQUIRED
Structure platform diversity                    SEPARATE WARNING / NON-BLOCKING
manual rebuild performance                      SEPARATE PERFORMANCE EVIDENCE
```

M2-3 checkpoint advancement is not yet justified.

No runtime change is authorized from this episode.

---

# 10. Operator rule for the next occurrence

When a future natural packet reports:

```text
Deferred mirror: OUTPUT_MISMATCH
CANONICAL != FRESH_CHAT
```

for the M2-3 fast-path acceptance control:

```text
DO NOT reroll
DO NOT manually edit the previous assistant
DO NOT reload
```

Send one ordinary new natural request immediately, then capture the full diagnostic.

Target:

```text
Prior representation: OUTPUT_MISMATCH
current match FRESH_CHAT
Edit origin: REPRESENTATION_DRIFT_CORRELATED
Edit reconcile: REPRESENTATION_FAST_RECONCILED
snapshot UNCHANGED
```

For the separate genuine-edit control, use a response whose current representation is `EXACT`, then manually modify it and send the next natural request.

Target:

```text
Prior representation: EXACT
current match NONE
Edit origin: USER_EDIT_CANDIDATE
Edit reconcile: MANUAL_EDIT_REBUILT
snapshot UPDATED
```

Keep these two controls physically separate.
