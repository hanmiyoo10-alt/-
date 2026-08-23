# SimCore v0.64.6 — Post-B_END C Clock Handoff Authority Activation

Date: 2026-08-23
Status: `DESIGN ACTIVATED · FIX · IMPLEMENTATION NOT STARTED`
Current production parent: `v0.64.5 — COMMUNITY Multiline Reaction Unit Validation Repair`
Current release commit: `6c43c8167375b836a87277c005c63f93b028dde4`
Current release blob: `a4b4633343cd856954857e7c490528fc713620da`
Major checkpoint after this mini: `v0.65.0 — M2-3 Edit Reconcile Ownership Extraction`

## 1. Activation decision

The previously dormant Post-B_END C Clock Handoff design is now activated by direct natural recurrence.

Previous evidence state:

```text
v0.64.2: post-B_END immediate C visibly predates completed broadcast
v0.64.3: healthy natural control without patch
→ HOLD / WATCH
```

The reassessment explicitly required one of the following before promotion:

```text
another natural B_END → immediate C visibly predates the completed broadcast
OR deterministic source proof
OR durable chronology corruption
```

v0.64.5 now supplies the first condition exactly.

Classification:

```text
id: POST_BEND_C_CLOCK_DOMAIN_GAP
status: FIX / DIRECT_RECURRENCE
scope: current-time authority handoff only
M2-3 attribution: NONE
M2-3 ordering: BLOCKER_BEFORE_IMPLEMENTATION
```

This is not caused by the v0.64.5 COMMUNITY validator repair. The v0.64.5 B_END itself completed normally with `Warnings: 0`, `structure PASS`, and a correct explicit terminal broadcast timestamp.

---

## 2. New triggering specimen — v0.64.5

### Completed B_END @2116 → @2117

```text
Mode: B_END
Broadcast end authority: ALLOWED · explicit-b-end
Broadcast closure: COMPLETE · terminal EXPLICIT · structure PASS
Broadcast terminal coverage: EXPLICIT_TERMINAL
frame:    2031-03-28 09:45 PM
terminal: 2031-03-28 10:15 PM
stored:   2031-03-28 10:15 PM
Stored broadcast: UNLOCKED
Warnings: 0
```

The broadcast domain is therefore healthy and authoritative at completion.

### Immediate C @2118 → @2119

The next request is a community reaction to that completed broadcast.

Runtime/lineage:

```text
Mode: C
Broadcast lifecycle: CLOSED
Request lineage: CHAIN · root B@2108 · parent B@2116 · depth 1
Stored broadcast: UNLOCKED · airtime 2031-03-28 10:15 PM
Warnings: 0
```

But the new current C response uses the stale persisted Narrative anchor:

```text
visible frame:       2031-03-14 11:30 PM
Narrative previous:  2031-03-14 11:30 PM
Narrative frame:     2031-03-14 11:30 PM
Narrative committed: 2031-03-14 11:30 PM
Narrative clock: SAME
```

The response therefore visibly predates the completed broadcast it is directly reacting to by nearly two weeks.

Existing diagnostics still report:

```text
Visible chronology: PASS_OR_NOT_APPLICABLE
Calendar transition: INELIGIBLE
```

because the ordinary non-B guard is comparing against the stale Narrative domain only. This is evidence of the missing cross-domain current-time authority bridge, not evidence that the ordinary Narrative parser/floor is broken.

---

## 3. Why this is now a FIX rather than WATCH

The evidence set is now:

```text
Specimen 1 · v0.64.2
B_END terminal 2031-03-07 09:55 PM
immediate C   2031-02-28 10:45 PM
→ DIRECT VISIBLE ANOMALY

Specimen 2 · v0.64.3
B_END terminal 2031-03-14 09:40 PM
immediate C   2031-03-14 10:50 PM
→ HEALTHY NATURAL CONTROL

Specimen 3 · v0.64.5
B_END terminal 2031-03-28 10:15 PM
immediate C   2031-03-14 11:30 PM
→ DIRECT VISIBLE ANOMALY / RECURRENCE
```

The healthy control remains important: the failure is conditional, not proof that every B_END→C transition is broken. But recurrence establishes that the missing authority edge is operationally real and not a one-off generation excursion.

The old reassessment gate has therefore been satisfied exactly.

---

## 4. Frozen repair contract

Reuse the already-designed narrow contract from `SIMCORE_06501_POST_BEND_C_CLOCK_HANDOFF_PLAN.md`, rebased to the current production parent and release order.

Required invariant:

```text
immediate completed B_END
→ first directly-following Mode C community turn sourced from that broadcast
→ current C timeline/header MUST NOT predate completed B_END terminal broadcast airtime
```

Do not globally merge clocks:

```text
broadcast airtime != depicted scene/event time
```

The completed broadcast terminal is only a request-scoped minimum current-time floor for the immediate C handoff.

Do not assign:

```text
state.narrativeTimestamp = state.broadcastAirtime
```

at B_END.

Do not rewrite historical/event timestamps.

Do not introduce a permanent Broadcast→Narrative coupling.

---

## 5. Ownership

Keep the prior design boundary:

```text
Lifecycle
→ classify immediate post-B_END C eligibility
→ derive request-scoped post-broadcast floor

Time
→ parse/compare timestamps
→ existing floor primitive

Prompt
→ serialize derived current-time authority

Session/finalization
→ consume the already-derived floor
```

M2-3 `edit-reconcile` remains out of scope.

No new module is required.

No persistent schema field is required.

---

## 6. Important discriminator from the new specimen

The v0.64.5 immediate C reports:

```text
Request lineage: CHAIN · root B@2108 · parent B@2116 · depth 1
Source handoff: INELIGIBLE · reason template-recurrence-owned
```

The clock bridge must therefore **not** depend on Source Handoff eligibility.

Source Handoff and current-time handoff answer different questions:

```text
Source Handoff
→ which source/evidence ownership path applies

Post-B_END Clock Handoff
→ what minimum current-time authority applies to the first current community frame
```

Eligibility should continue to use the direct previous B_END/lifecycle + lineage facts described in the frozen design, not `Source handoff: ELIGIBLE` as a prerequisite.

This new control should be added to static fixtures.

---

## 7. Release ordering

The old candidate document provisionally placed this repair after M2-3 as v0.65.1 because recurrence had not yet justified changing the active roadmap.

That ordering is superseded by the new direct recurrence.

Current sequence:

```text
v0.64.5 live close
→ PASS

v0.64.6 Post-B_END C Clock Handoff Authority
→ separate semantic correctness mini
→ static/CI
→ release-simcore
→ natural B_END→C long-chat validation

then
v0.65.0 M2-3 Edit Reconcile Ownership Extraction
```

Do not combine the clock-authority semantic change with M2-3 ownership movement.

---

## 8. Required static fixtures before implementation release

At minimum preserve:

```text
1. B_END → immediate C with stale Narrative < terminal B
   → eligible
   → effective floor = B terminal

2. B_END → immediate C with Narrative >= terminal B
   → ALREADY_SATISFIED
   → no backward or extra advancement

3. B_END → C where Source Handoff is INELIGIBLE because recurrence owns source
   → clock bridge still eligible if direct lifecycle/lineage conditions hold

4. B_END → C → C
   → only first C receives special bridge

5. B_CONTINUE → C
   → ineligible

6. B_START → C
   → ineligible

7. B_END → A
   → ineligible

8. historical/flashback content inside eligible C
   → current frame floor preserved
   → historical facts not rewritten

9. missing/invalid broadcast airtime
   → fail closed to ordinary Narrative authority

10. current v0.64.5 COMMUNITY multiline fixtures
    → unchanged PASS

11. Representation/Edit Reconcile frozen controls
    → unchanged
```

Side-effect/static freeze:

```text
latest.js == install.js
no persistent schema change
no new host/storage/network/timer call
no request-history mutation
no Representation taxonomy change
no Edit Reconcile movement
no Reaction/Structure change
```

---

## 9. Live close gate for v0.64.6

Required natural sequence:

```text
B_START / B_CONTINUE / B_END
→ B_END terminal explicitly committed and broadcast unlocked
→ immediate C reacting to completed broadcast
```

Pass condition:

```text
C current frame >= completed B_END terminal
Narrative committed >= completed B_END terminal
no historical/event timestamp rewrite
Warnings 0 or only unrelated warnings
Broadcast remains unlocked
Frame/Continuity PASS or safe existing repair
Representation/Edit controls unchanged
```

A second ordinary C after the bridged first C must use normal Narrative inheritance without keeping a permanent broadcast floor.

---

## 10. Other observations from the same runtime

The first v0.64.5 request after runtime boot spent 6.170 s in `MANUAL_EDIT_REBUILT` with prior representation unavailable. This is preserved separately as a reload-boundary performance WATCH in `SIMCORE_LIVE_06405_VALIDATION.md`; it is not part of this clock repair.

Store latency also remains a separate performance WATCH.

Do not mix either into v0.64.6.

---

## Cross references

- `SIMCORE_POST_BEND_C_CLOCK_HANDOFF_REASSESSMENT.md`
- `SIMCORE_06501_POST_BEND_C_CLOCK_HANDOFF_PLAN.md` — original frozen design; ordering/version superseded by this activation document
- `SIMCORE_POST_BEND_C_EVIDENCE_06402.md`
- `SIMCORE_LIVE_06403_BROADCAST_SEQUENCE.md`
- `SIMCORE_LIVE_06405_VALIDATION.md`
- `SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06402.md`
