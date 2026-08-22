# SimCore v0.65.1 Candidate — Post-B_END C Clock Handoff Authority

Date: 2026-08-22
Status: DESIGN FROZEN CANDIDATE · IMPLEMENT AFTER M2-3 RELEASE
Expected parent: `v0.65.0 — M2-3 Edit Reconcile Ownership Extraction`
Version note: `v0.65.1` is provisional only until the M2-3 production version is actually published. If M2-3 lands under a different version, this mini takes the next patch version from that production parent.

## Purpose

Repair one directly observed clock-domain handoff gap without merging Broadcast airtime semantics into ordinary Narrative time.

The required invariant is deliberately narrow:

```text
immediate completed B_END
→ first directly-following Mode C community turn sourced from that broadcast
→ current C timeline/header MUST NOT predate the completed B_END terminal broadcast airtime
```

This mini does **not** make broadcast airtime the depicted scene/event time. The B clock and narrative clock remain separate domains.

---

## Triggering live evidence

Production evidence was captured on v0.64.2 during one natural B_START → B_CONTINUE → B_END sequence.

Completed broadcast:

```text
B_END terminal airtime: 2031-03-07 09:55 PM
Stored broadcast: UNLOCKED
```

The first direct C reaction after that completed broadcast was generated at the stale pre-broadcast Narrative anchor:

```text
Mode: C
Request lineage: CHAIN · root B@2066 · parent B@2078 · depth 1
visible C frame: 2031-02-28 10:45 PM
Narrative clock: SAME · 2031-02-28 10:45 PM
Stored completed broadcast: 2031-03-07 09:55 PM
```

The C response therefore visibly predated the broadcast it was reacting to by about one week.

### Manual-edit positive control

The user then manually corrected the visible C timestamp from February 28 to March 7 without changing the body length. On the next request SimCore correctly classified and rebuilt the genuine edit:

```text
Prior representation: EXACT
current matches canonical: NO
current matches Fresh: NO
Edit origin: USER_EDIT_CANDIDATE
Edit reconcile: MANUAL_EDIT_REBUILT · 11.678 s
snapshot UPDATED
```

The corrected clock was then inherited successfully:

```text
Narrative clock: SAME
previous: 2031-03-07 10:45 PM
frame: 2031-03-07 10:45 PM
committed: 2031-03-07 10:45 PM
```

Interpretation:

```text
Time parsing/commit can consume a valid corrected timestamp.
Genuine edit rebuild can absorb the correction.
The defect is the automatic B_END → immediate C current-time authority handoff.
```

This is therefore not an Edit Reconcile defect and must not be repaired inside M2-3.

Related evidence:

- `SIMCORE_POST_BEND_C_EVIDENCE_06402.md`
- `SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06402.md`
- `SIMCORE_LIVE_06402_BROADCAST_SEQUENCE.md`

---

# 1. Release identity

Recommended release after M2-3:

```text
v0.65.1 — Post-B_END C Clock Handoff Authority
```

Expected parent:

```text
v0.65.0 — M2-3 Edit Reconcile Ownership Extraction
```

The implementation must be rebased against the actual M2-3 production artifact and must preserve all M2-3 ownership/fixture results unchanged.

---

# 2. Ownership boundary

Primary owner: **Lifecycle request preparation**.

Time remains the owner of timestamp syntax, parsing/comparison, and existing floor enforcement primitives.
Prompt remains the owner of serialization only.
Session/output finalization consumes the already-derived request-scoped floor but does not classify B_END→C eligibility.

```text
Lifecycle
├─ determine whether the current request is the immediate post-B_END C handoff
├─ derive a request-scoped post-broadcast floor
└─ derive effective current-time authority

Time
├─ parse/compare timestamps
└─ existing current-time floor enforcement

Prompt
└─ serialize the derived authority

Session/finalization
└─ apply existing Time floor primitive using the derived effective floor
```

No new module is required.

M2-3 `edit-reconcile` ownership is frozen and out of scope.

---

# 3. Eligibility contract

A request is eligible only when every bounded condition is true:

```text
current mode == C
previous stored mode == B_END
stored broadcastLocked == false
stored broadcastAirtime is valid
prior request lineage last family == B
prior request lineage has a valid request index
```

The eligibility is intentionally **immediate-transition-only**.

This prevents a completed broadcast airtime from becoming a permanent global narrative clock source.

Examples:

```text
B_END → C       eligible
B_END → C → C   only the first C uses the special bridge; the second C inherits normal narrative state
B_CONTINUE → C  ineligible
B_START → C     ineligible
B_END → A       ineligible
A → C           ineligible
C → C           ineligible
```

Mode C may discuss historical material, but its current response frame remains a current community frame. Historical facts/references are not rewritten by this mini.

---

# 4. New request-scoped fields

No persistent schema fields are added.

Lifecycle may add bounded pending-only fields:

```text
postBroadcastClockEligible: boolean
postBroadcastClockFloor: timestamp | null
postBroadcastClockReason: enum/string
narrativeCurrentTimeFloor: timestamp | null
```

Recommended reasons:

```text
APPLIED
ALREADY_SATISFIED
NOT_C
PREVIOUS_NOT_B_END
BROADCAST_STILL_LOCKED
MISSING_BROADCAST_AIRTIME
INVALID_BROADCAST_AIRTIME
PREVIOUS_REQUEST_NOT_B
```

Raw message/output bodies are never retained.

---

# 5. Effective-floor algorithm

Keep the persisted Narrative timestamp and Broadcast airtime as separate facts.

Pseudo-contract:

```text
persistedNarrative = state.narrativeTimestamp
broadcastTerminal  = state.broadcastAirtime

if immediate-post-B_END-C eligible:
    if persistedNarrative is missing:
        narrativeCurrentTimeFloor = broadcastTerminal
        status = APPLIED

    else if broadcastTerminal > persistedNarrative:
        narrativeCurrentTimeFloor = broadcastTerminal
        status = APPLIED

    else:
        narrativeCurrentTimeFloor = persistedNarrative
        status = ALREADY_SATISFIED
else:
    narrativeCurrentTimeFloor = persistedNarrative
```

Critical rule:

```text
DO NOT assign state.narrativeTimestamp = state.broadcastAirtime at B_END.
DO NOT globally merge the two clocks.
DO NOT infer a time later than the broadcast terminal.
```

The broadcast terminal is a **minimum current-time floor only** for this one C handoff.

---

# 6. Existing field preservation

Keep the existing factual field:

```text
narrativeTimestampPrevious = state.narrativeTimestamp
```

Do not silently redefine it to mean the post-broadcast floor.

Use the new derived field:

```text
narrativeCurrentTimeFloor
```

for current-time authority where appropriate.

This preserves diagnostics that distinguish:

```text
persisted narrative before handoff
vs
request-scoped effective floor
```

---

# 7. Prompt serialization

For ordinary non-B requests with no special bridge, current prompt output remains byte-equivalent except for unavoidable M2-3 parent changes.

For eligible immediate post-B_END C only, serialize bounded authority lines such as:

```text
post_broadcast_community_time_floor=⏱️[2031-03-07 (Fri) 09:55 PM]
post_broadcast_community_must_not_predate_completed_broadcast=1
broadcast_airtime_is_current_time_floor_only_not_depicted_scene_time=1
current_timeline_anchor=⏱️[2031-03-07 (Fri) 09:55 PM]
```

The existing rule remains intact:

```text
broadcast airtime != depicted scene/event time
```

No historical facts, event dates, or depicted scene timestamps are rewritten from broadcast airtime.

---

# 8. Calendar/progression interaction

Where current code currently uses the persisted Narrative anchor as the non-B current-time authority, use:

```text
narrativeCurrentTimeFloor || narrativeTimestampPrevious
```

for the immediate eligible C request only.

This applies to:

```text
current_timeline_anchor serialization
non-B current-time floor enforcement
current-date/calendar baseline where an authority baseline is required
narrative clock guard baseline
```

The Time parser/comparator and line-level commit algorithm remain unchanged.

---

# 9. Output finalization

Do not add a new semantic repair engine.

Reuse the existing current-time floor primitive with the effective request floor:

```text
floor = pending.narrativeCurrentTimeFloor
     || pending.narrativeTimestampPrevious
     || state.narrativeTimestamp
```

Therefore:

```text
model outputs timestamp later than B_END floor
→ preserve it
→ normal Narrative commit

model outputs timestamp equal to B_END floor
→ preserve it
→ normal Narrative commit

model outputs timestamp before B_END floor
→ existing floor enforcement prevents the backward current frame
→ commit the resulting non-backward timestamp
```

Do not invent an arbitrary +N-minute post-broadcast offset.

---

# 10. Diagnostics

Add one bounded diagnostic line/card:

```text
Post-broadcast C floor: APPLIED · terminal 2031-03-07 09:55 PM · narrative prior 2031-02-28 10:45 PM · effective 2031-03-07 09:55 PM
```

Other examples:

```text
Post-broadcast C floor: ALREADY_SATISFIED · terminal ... · narrative prior ...
Post-broadcast C floor: INELIGIBLE · PREVIOUS_NOT_B_END
```

The existing `Narrative clock` diagnostic remains unchanged and supplies the final observed/committed result.

No raw body telemetry is added.

---

# 11. Frozen surfaces

This mini must not change:

```text
M2-3 edit-reconcile module/decision order
SAME_FAST
SAME_HOST_FAST
REPRESENTATION_FAST_RECONCILED
USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT
Edit Origin taxonomy
Representation ledger/taxonomy
Runtime Mirror / Deferred Mirror
Recovery / output-compat / bootstrap-migration
Broadcast B_START/B_CONTINUE/B_END airtime semantics
B_END closure / terminal coverage
Frame sequencing/guard algorithm
Summary Scope
Evidence / Lineage / Handoff / Recurrence algorithms
Community / Reaction / Structure semantics
Store schema / keys / retention
host API calls
network/timer surfaces
TAIL_AFTER_CURRENT_USER placement
provider-cache claims
```

Lineage data may be **read** as an eligibility fact; its ownership/algorithm is not modified.

---

# 12. Explicitly excluded evidence from the same live sequence

Do not widen this mini to fix unrelated observations:

```text
repeated COMMUNITY reaction-tag formatting warnings
Reaction stale_scale_fallback normalization
storage-dominated request/output timing
PRE_SIMCORE host-history frontier movement/regression
B-mode stale Narrative probe observability
CANONICAL↔FRESH representation mismatches
B_END diagnostic builder failure (already v0.64.3)
```

Those remain separate evidence/watch families.

---

# 13. Static fixtures

Minimum fixture set:

```text
1. B_END → immediate C, narrative older than terminal
   → APPLIED
   → effective floor == B_END terminal

2. B_END → immediate C, narrative missing
   → APPLIED
   → effective floor == B_END terminal

3. B_END → immediate C, narrative already later
   → ALREADY_SATISFIED
   → effective floor == narrative prior

4. B_CONTINUE → C
   → INELIGIBLE

5. B_START → C
   → INELIGIBLE

6. B_END → A
   → INELIGIBLE

7. C → C
   → INELIGIBLE

8. B_END state but broadcast still locked
   → INELIGIBLE

9. B_END state with missing/invalid airtime
   → INELIGIBLE

10. eligible C output timestamp < terminal
    → existing floor enforcement prevents backward visible current time

11. eligible C output timestamp == terminal
    → preserved

12. eligible C output timestamp > terminal
    → preserved and committed

13. B_END output itself
    → state.narrativeTimestamp unchanged by broadcast airtime

14. ordinary A/C without B_END transition
    → prompt/current-time behavior unchanged
```

---

# 14. M2-3 regression gate

Because this mini is planned after M2-3, static validation must also assert the M2-3 golden controls remain unchanged:

```text
EXACT carryover
→ SAME_FAST
→ snapshot UNCHANGED

prior OUTPUT_MISMATCH + current == prior Fresh
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

Prior EXACT + current matches neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

Use the captured same-length genuine edit and large-delta Fresh carryover as regression fixtures where possible.

---

# 15. Release/static gate

Before release:

```text
node --check latest.js PASS
node --check install.js PASS
latest == install PASS
Contracts v2 architecture PASS
post-B_END clock fixtures PASS
existing Time/Frame/Broadcast fixtures PASS
M2-3 differential fixtures PASS
no persistent schema delta
no new host/storage/network/timer call count
no edit-reconcile source/ownership drift
```

---

# 16. Natural live close gate

Required real-long-chat proof:

```text
B_END current turn
→ output COMMITTED
→ terminal broadcast airtime captured
→ broadcast UNLOCKED

immediate next C sourced from the completed B chain
→ Post-broadcast C floor APPLIED (or ALREADY_SATISFIED)
→ visible/current C timestamp >= B_END terminal airtime
→ Narrative clock commits non-backward timestamp
→ no Broadcast airtime corruption
→ M2-3 Edit Reconcile path remains expected
```

Also verify v0.64.3 diagnostic-copy behavior remains healthy on the B_END sample.

---

# 17. Release verdict

```text
POST_BEND_C_CLOCK_DOMAIN_GAP
→ confirmed narrow current-time-authority coverage gap

Repair strategy
→ request-scoped immediate C floor
→ B_END terminal is minimum current-time authority only
→ no global Broadcast/Narrative clock merge
→ no invented post-broadcast offset
→ no M2-3 semantic change
```

This is the recommended first correctness mini after M2-3 unless newer production evidence establishes a more urgent blocker.
