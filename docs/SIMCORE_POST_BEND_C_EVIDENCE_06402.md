# SimCore v0.64.2 — Post-B_END C Evidence

Captured: 2026-08-22
Production: `v0.64.2 — Diagnostic Copy Resilience`
Runtime generation: `mt4bcgc3-5556z8`
Initial turn: user `@2080` → assistant `@2081`
Manual-edit follow-up: user `@2082` → assistant `@2083`
Previous completed broadcast root: `B@2066`, terminal parent `B@2078`

Purpose: preserve the first natural C follow-up after the captured 2031-03-07 B_END sequence and the subsequent genuine user correction of its visible timestamp. This evidence is separate from the confirmed v0.64.3 diagnostic-builder defect and from M2-3 ownership movement.

## 1. Healthy runtime/binding control

Initial C turn:

```text
Probe context: CURRENT TURN
Core handshake: FOUND
Runtime status: ACTIVE · output COMMITTED
Mode: C
Stored last mode: C
Turn binding: request user @2080 · output assistant @2081
Stability: PASS · binding BOUND · out COMMITTED · mirror COMMITTED
Warnings: 0
Compatibility diagnostics: 1
Frame sequence: PASS
Frame guard: PASS
Continuity summary: PASS
Stored broadcast: UNLOCKED · airtime 2031-03-07 09:55 PM · start 2031-03-07 08:50 PM
```

The turn is therefore suitable for interpreting the post-broadcast clock/provenance observations below; this is not another handshake/binding failure.

---

## 2. Third and strongest natural Representation Fast Reconcile control

The immediately preceding B_END visible output had a large canonical/Fresh representation divergence:

```text
Prior representation: OUTPUT_MISMATCH
canonical 9524:c3fbb4a2
fresh 7932:4398a0aa
current 7932:4398a0aa
Edit delta: vs canonical -1592 · vs fresh +0
shape FRESH_EXACT_CARRYOVER
```

The `@2080` request correctly took the frozen v0.63.55 fast path:

```text
Edit reconcile: REPRESENTATION_FAST_RECONCILED · 0.0 ms
snapshot UNCHANGED
Edit origin: REPRESENTATION_DRIFT_CORRELATED
current match: FRESH_CHAT
raw bodies NOT RETAINED
```

Classification:

```text
status: DIRECT POSITIVE CONTROL
path: REPRESENTATION_FAST_RECONCILED
representation delta: -1592 chars
manual rebuild: NONE
snapshot mutation: NONE
M2-3 differential fixture: GOLDEN / CRITICAL
```

M2-3 must preserve the fast-path predicate and result independent of representation delta magnitude.

---

## 3. Post-B_END C cross-clock regression candidate

The completed broadcast was anchored one week later than the persisted non-broadcast narrative clock:

```text
B_END stored broadcast airtime: 2031-03-07 09:55 PM
C @2080 narrative previous:     2031-02-28 10:45 PM
original C @2081 visible frame: 2031-02-28 10:45 PM
original C narrative committed: 2031-02-28 10:45 PM
Narrative clock: SAME
```

The C request explicitly reacted to the just-completed episode, and the original RAW response header visibly used the old 2031-02-28 timestamp even though the source broadcast had completed on 2031-03-07.

This is different from the already-known `B_MODE_STALE_NARRATIVE_CLOCK_PROBE` observability issue. Here the stale narrative timestamp was actually serialized into a new current C response.

Current Lifecycle intentionally separates the two clock domains during B:

```text
B mode:
  narrativeTimestampPrevious = null
  broadcast airtime owns B timestamp semantics
```

When a non-B request begins later, current code resumes:

```text
narrativeTimestampPrevious = state.narrativeTimestamp
current_timeline_anchor = narrativeTimestampPrevious
```

There is no observed automatic post-B_END bridge that advances the non-broadcast/community clock floor from a completed broadcast terminal time.

Important constraint: `broadcast airtime != depicted scene/event time` remains a frozen contract. Any future repair must therefore be scoped specifically to current/post-broadcast community time authority, not globally copy broadcast airtime into narrative scene time.

Current classification:

```text
id: POST_BEND_C_CLOCK_DOMAIN_GAP
status: HIGH WATCH / DIRECT VISIBLE CORRECTNESS EVIDENCE
visible chronology issue: YES across clock-domain handoff
persistent state corruption: NOT ESTABLISHED
B clock semantics defect: NO
non-B current-timeline anchor coverage gap: LIKELY
exact repair contract: NOT YET FROZEN
v0.64.3 builder-mini scope: EXCLUDED
M2-3 ownership scope: EXCLUDED
M2-3 implementation blocker: NO
```

M2-3 implementation is already in progress in a separate workstream. Do not fold this clock-authority question into the ownership extraction.

---

## 4. Host/history frontier regression after steady growth

The preceding session had established a moving compact-assistant frontier that grew monotonically through approximately `@37`. The `@2080` C request then sharply regressed:

```text
Cache topology: COMMON_PREFIX · messages 10/39 · chars 64,009/134,012 · ratio 47.8%
Cache effect: REUSE_WINDOW_SHRINKING
Cache trajectory: REGRESSED
Frontier movement: @37→@10 · Δmessages -27 · Δchars -58,718
Cache break: PRE_SIMCORE · CHAT_HISTORY · @10 user→user
History mutation: @10 · SAME_SLOT_CHANGED
Host prefix: STABLE · SAME_FAMILY
History alignment/stabilization: OBSERVE_ONLY · request/persistent mutation NONE
Representation correlation: NO_MATCH
Rebuild attribution: OUT_OF_WINDOW · LOW
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
```

This remains host/history observability WATCH. Do not infer provider cache behavior or SimCore ownership from the local proxy alone.

---

## 5. Storage performance recurrence

The healthy initial C turn again showed storage-dominated SimCore-local timing:

```text
Request total: 295 ms
TURN_STORAGE: 248 ms · 84.1%

Output total: 375 ms
OUT_STORAGE: 346 ms · 92.3%
```

This strengthens the existing performance recurrence but does not authorize Store optimization inside M2-3.

---

## 6. Genuine manual correction follow-up — direct M2-3 control

The user manually changed the visible `@2081` timestamp from the stale:

```text
2031-02-28 10:45 PM
```

to:

```text
2031-03-07 10:45 PM
```

On the next natural request `@2082`, SimCore saw the prior stored representation as exact but the current visible fingerprint as a new unmatched representation:

```text
Prior representation: EXACT
canonical 2610:97a6e447
fresh     2610:97a6e447
current   2610:75f98cb5
match NONE
shape NEW_VISIBLE_REPRESENTATION
```

It correctly classified the change as a genuine user edit:

```text
Edit origin: USER_EDIT_CANDIDATE
Edit reconcile: MANUAL_EDIT_REBUILT · 11.678 s
snapshot UPDATED
Request hotspot: EDIT_RECONCILE · 11.678 s · 97.5%
```

After rebuild, the corrected timestamp became trusted state:

```text
Narrative clock: SAME
previous  2031-03-07 10:45 PM
frame     2031-03-07 10:45 PM
committed 2031-03-07 10:45 PM
```

The broadcast domain remained independently intact:

```text
Stored broadcast: UNLOCKED
airtime 2031-03-07 09:55 PM
start   2031-03-07 08:50 PM
```

Interpretation:

```text
manual correction was not mistaken for representation drift
real user edit still reaches the expensive rebuild path
snapshot is intentionally updated
valid corrected timestamp is absorbed by existing rebuild/Time machinery
POST_BEND_C_CLOCK_DOMAIN_GAP automatic coverage remains unresolved
```

This is the exact genuine-edit counterpart required by M2-3. See `SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06402.md`.

---

## Operational consequence

```text
v0.64.3 diagnostic-builder workstream:
STATIC RELEASED · live B_END copy close gate pending

M2-3 workstream:
DESIGN FROZEN · IMPLEMENTATION ALREADY IN PROGRESS

POST_BEND_C_CLOCK_DOMAIN_GAP:
separate evidence/watch
not part of v0.64.3
not part of M2-3
no longer described as a gate to starting M2-3 implementation
```

M2-3 golden controls from this runtime now include:

```text
ordinary SAME_FAST exact carryover
+1 representation mismatch → REPRESENTATION_FAST_RECONCILED
-1592 representation mismatch → REPRESENTATION_FAST_RECONCILED
genuine hand edit → USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT → snapshot UPDATED
```

Related evidence:

- `SIMCORE_LIVE_06402_BROADCAST_SEQUENCE.md`
- `SIMCORE_HOST_HISTORY_WATCH_06402.md`
- `SIMCORE_NEXT_RELEASE_GATE_06403.md`
- `SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06402.md`
