# SimCore Narrative / Current Timeline Permanent Fixture Design — 2026-08-26

Status: `DESIGN FROZEN · IMPLEMENTATION-READY PERMANENT FIXTURE FAMILY · MIXED EVIDENCE MATURITY · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_PROMOTION_MAP_2026-08-25.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `docs/SIMCORE_06406_POST_BEND_C_CLOCK_HANDOFF_ACTIVATION.md`
- `products/simcore/tooling/bundle-loader.mjs`
- `products/simcore/tests/schema/fixture-v1.schema.json`
- production authority: `release-simcore` v0.64.7

## 1. Purpose

Define the next permanent regression-family candidate after `summary-scope`:

```text
narrative-clock
```

The suite protects deterministic SimCore-owned current-time and narrative-timestamp behavior without judging arbitrary model prose.

The intended protected chain is:

```text
Time current-floor primitive
+ Time narrative timestamp-sequence primitive
+ Time narrative commit primitive
+ Lifecycle direct post-B_END eligibility
+ Time post-B_END floor resolution
→ bounded deterministic clock authority facts
```

This suite does not make Frame, Broadcast closure, or Main Model rendering into new owners.

## 2. Why one `narrative-clock` suite is justified

The current contracts are historically separate but share one execution/authority domain:

```text
v0.63.57 Current Timeline Authority Guard
v0.63.58 Narrative Tail Time Contract
v0.64.6 Post-B_END C Clock Handoff Authority
```

The common product question is:

```text
what canonical timestamp is allowed to become current Narrative time,
and what minimum current-time authority must it respect?
```

They should therefore share one permanent suite while retaining sub-family labels.

Do not create separate permanent suites named:

```text
current-timeline
narrative-tail
post-bend-clock
```

unless a future ownership split makes direct adapters materially different.

## 3. Hard ownership boundary

Canonical owners remain:

```text
Time
- parse / compare canonical timestamps
- current narrative floor enforcement
- narrative line-level timestamp sequence
- narrative timestamp commit
- post-B_END floor validation / selection

Lifecycle
- direct first-C-after-B_END eligibility only

Broadcast / Structure / Session
- predecessor closure facts may be inputs
- not reimplemented by this suite

Frame
- visible response-frame sequencing remains a separate future fixture family

Main Model
- renders actual prose / scenes / timestamps under the supplied authority
```

The fixture suite must not parse arbitrary prose to infer a clock that production itself does not treat as canonical.

## 4. Production executable surfaces

Current production v0.64.7 exports the required Time surfaces:

```text
narrativeTimestampSequence
resolvePostBEndCurrentTimeFloor
enforceNarrativeCurrentTimeFloor
commitNarrativeTimestamp
compareTimestamps
```

Lifecycle exports:

```text
derivePostBEndClockEligibility
```

The permanent harness can directly load both modules through the existing `BundleLoader`.

Therefore the intended coverage state is:

```text
EXECUTABLE
```

No source-marker bridge, loader extension, source modularization, runtime patch, or test-only production hook is required.

## 5. Evidence maturity is mixed and must stay explicit

### 5.1 Current Timeline Authority

Historical defect:

```text
persisted/current era remained current
but visible non-broadcast output silently regressed into an unrequested historical era
```

Status:

```text
MITIGATED_IN_0.63.57
current-era containment has positive evidence
```

This is eligible for deterministic permanent protection.

### 5.2 Narrative Tail Time

Historical defect:

```text
scene frame began at 01:00
visible prose progressed to 03:00
no later canonical timestamp line emitted
persisted clock remained 01:00
```

Status:

```text
MITIGATED_IN_0.63.58
```

The deterministic line-level timestamp-sequence/commit contract is eligible for permanent protection.

### 5.3 Explicit past-scene / flashback allowance

Current repository status:

```text
DEFERRED_NATURAL_SAMPLE
```

The implementation deliberately clamps only the first/current canonical timestamp and leaves later embedded/historical timestamps untouched, so deterministic boundary coverage is valid.

But a dedicated natural explicit-flashback success specimen remains validation-only.

Therefore:

```text
deterministic contract = ESTABLISHED
LIVE_GOLDEN_ESTABLISHED = NO
```

for this sub-family.

### 5.4 Post-B_END first-C handoff

Current deferred-sweep authority records a direct v0.64.6 natural close:

```text
B_END terminal 2031-04-04 10:15 PM
→ first direct C uses POST_B_END_FLOOR
→ C commits 10:20 PM
→ second C is bridge-INELIGIBLE
→ ordinary Narrative authority resumes
```

Therefore this sub-family has both deterministic and direct-live regression value.

## 6. Stable suite identity and proposed files

Stable suite ID:

```text
narrative-clock
```

Implementation files when explicitly selected:

```text
products/simcore/tests/suites/narrative-clock.test.mjs
products/simcore/tests/fixtures/narrative-clock/cases.json
```

Registry concept:

```text
id: narrative-clock
coverage: EXECUTABLE
required: true
goldenGate: true
```

`goldenGate=true` means deterministic clock behavior is release-gated. It does not upgrade the explicit-flashback natural evidence status.

## 7. Sub-family A — Current Timeline Floor

### A1. `current-floor-backward-clamp`

Input concept:

```text
floor   = 2031-03-28 10:15 PM
current = 2031-03-14 11:30 PM
```

Expected from `enforceNarrativeCurrentTimeFloor`:

```text
changed  true
reason   clamped-backward
observed old current timestamp
floor    supplied current floor
first canonical timestamp replaced by floor
```

Purpose:

```text
protect the current-era rollback guard itself
```

### A2. `current-floor-equal-pass`

Current timestamp equals floor.

Expected:

```text
changed false
content unchanged
```

Purpose: floor is a minimum, not a forced rewrite.

### A3. `current-floor-later-pass`

Current timestamp is later than floor.

Expected:

```text
changed false
later timestamp preserved
```

Purpose:

```text
floor != ceiling
```

### A4. `current-floor-historical-token-preserved`

Input contains:

```text
first canonical current timestamp < floor
later explicit historical/event canonical timestamp << floor
```

Expected:

```text
first/current token clamped to floor
later historical token byte-preserved
```

Purpose:

```text
current-time authority must not globally rewrite historical/event timestamps
```

Evidence maturity:

```text
DETERMINISTIC_CONTRACT_ESTABLISHED
NATURAL_EXPLICIT_FLASHBACK_SAMPLE = VALIDATION_ONLY
```

Do not label this case as natural flashback proof.

## 8. Sub-family B — Narrative Tail / Commit

### B1. `tail-monotonic-promotes-terminal`

Input concept:

```text
canonical frame timestamp 01:00
later canonical timestamp 03:00
monotonic line-level sequence
```

Expected from `narrativeTimestampSequence`:

```text
frameTimestamp = 01:00
candidate      = 03:00
sceneCount     > 0
tailStatus     MONOTONIC
tailPromoted   true
```

Expected from `commitNarrativeTimestamp` in non-B mode:

```text
state narrativeTimestamp becomes 03:00
```

Purpose: preserve the v0.63.58 terminal-current-time contract.

### B2. `tail-frame-only-stays-frame`

One canonical current timestamp only.

Expected:

```text
tailStatus   FRAME_ONLY
tailPromoted false
candidate    frame timestamp
```

The suite must not infer elapsed prose time.

### B3. `tail-nonmonotonic-fails-closed`

Canonical line-level timestamps move backward inside the visible current sequence.

Expected:

```text
tailStatus   SKIPPED_NON_MONOTONIC
tailPromoted false
candidate does not promote the backward tail
```

Purpose:

```text
malformed chronology may fail closed
but may not invent a terminal current time
```

### B4. `broadcast-mode-does-not-commit-narrative`

Call `commitNarrativeTimestamp` with a `B_*` mode.

Expected:

```text
changed false
reason  broadcast
timestamp null
tailStatus INELIGIBLE_BROADCAST
Narrative state unchanged
```

Purpose: preserve Broadcast/Narrative domain separation.

## 9. Sub-family C — Direct Post-B_END First-C Floor

This sub-family uses both real production owners:

```text
Lifecycle.derivePostBEndClockEligibility
→ Time.resolvePostBEndCurrentTimeFloor
```

Do not copy eligibility predicates into the suite.

Use bounded predecessor facts rather than a complete long-chat body.

### C1. `post-bend-direct-complete-applied`

Input concept:

```text
mode C
previousMode B_END
broadcast unlocked
stored broadcast airtime = explicit terminal
previous request exactly direct B predecessor
previous output exactly direct predecessor
closureComplete true
terminalTimestamp valid
Narrative anchor older than terminal
```

Expected:

```text
eligibility.eligible true
eligibility.reason eligible-direct-complete-post-b-end-c
resolution.disposition APPLIED
resolution.effectiveFloor = B_END terminal
```

Evidence maturity:

```text
LIVE_GOLDEN_ESTABLISHED / v0.64.6 direct long-chat close
```

### C2. `post-bend-narrative-already-later`

Same valid eligibility, but existing Narrative timestamp is later than B_END terminal.

Expected:

```text
ALREADY_SATISFIED
later Narrative time remains effective floor
```

Purpose:

```text
post-B_END bridge is minimum authority, not a clock ceiling
```

### C3. `post-bend-second-c-ineligible`

Previous mode is already C / direct B predecessor relationship no longer holds.

Expected:

```text
eligible false
bridge not retained
```

This protects the one-shot property observed in v0.64.6 live validation.

### C4. `post-bend-incomplete-closure-fails-closed`

Predecessor facts exist but `closureComplete=false`.

Expected:

```text
eligible false
reason previous-b-end-closure-incomplete
```

Purpose: an incomplete/malformed B_END may not become current-time authority merely because a terminal-looking timestamp exists.

### C5. `post-bend-terminal-storage-mismatch-invalid-source`

Eligibility inputs contain a visible terminal that does not equal stored B_END airtime.

Expected from Time resolution:

```text
disposition INVALID_SOURCE
reason terminal-stored-airtime-mismatch
effectiveFloor remains prior Narrative value
```

Purpose:

```text
visible predecessor claim and stored Broadcast authority must agree before the bridge applies
```

## 10. Initial matrix size

The first implementation should contain exactly these 13 cases:

```text
A1 current-floor-backward-clamp
A2 current-floor-equal-pass
A3 current-floor-later-pass
A4 current-floor-historical-token-preserved

B1 tail-monotonic-promotes-terminal
B2 tail-frame-only-stays-frame
B3 tail-nonmonotonic-fails-closed
B4 broadcast-mode-does-not-commit-narrative

C1 post-bend-direct-complete-applied
C2 post-bend-narrative-already-later
C3 post-bend-second-c-ineligible
C4 post-bend-incomplete-closure-fails-closed
C5 post-bend-terminal-storage-mismatch-invalid-source
```

Do not inflate the first pack with spelling variants or every possible invalid timestamp.

## 11. Fixture payload strategy

Use one grouped fixture file under the existing fixture-v1 schema.

Conceptual shape:

```json
{
  "schemaVersion": 1,
  "id": "narrative-clock.contract-matrix",
  "suite": "narrative-clock",
  "input": {
    "currentFloorCases": [],
    "tailCases": [],
    "postBEndCases": []
  },
  "expected": {},
  "meta": {
    "goldenGate": true,
    "coverageExpectation": "EXECUTABLE",
    "evidenceMaturity": "MIXED",
    "explicitFlashbackNaturalClose": "VALIDATION_ONLY",
    "postBEndNaturalClose": "DIRECT_LIVE_CONTROL"
  }
}
```

The current fixture-v1 schema allows additional bounded `meta` fields, so no schema revision is required.

## 12. Suite execution contract

Recommended suite flow:

```text
load Time
load Lifecycle
verify required exported functions exist

run Current Timeline Floor cases directly against Time
run Narrative Tail/Commit cases directly against Time
run post-B_END eligibility cases against Lifecycle
feed valid eligibility result directly into Time floor resolution
assert bounded structured fields
return EXECUTABLE / PASS
```

State objects used for commit tests must be fresh per case.

No fixture may rely on case execution order or shared mutation.

## 13. Assertions should prefer structured results over rendered strings

Primary assertions should target fields such as:

```text
changed
reason
observed
floor
frameTimestamp
candidate
sceneCount
tailStatus
tailPromoted
timestamp
eligible
floorTimestamp
storedBroadcastAirtime
disposition
effectiveFloor
```

Only inspect resulting content where the contract itself is a bounded transformation, e.g. confirming:

```text
first current timestamp was clamped
later historical token remained unchanged
```

Do not snapshot whole rendered response strings.

## 14. What does NOT belong in this suite

### Frame sequencing

Do not test:

```text
Response / Volume / Chapter / Chatindex ordering
same-title chapter hold
frame marker cardinality
```

Those belong to future `frame` fixtures.

### Broadcast closure structure

Do not reconstruct two COMMUNITY blocks, platform diversity, or Structure cleanliness here.

The post-B_END fixture receives already-bounded predecessor facts because `broadcast-closure` owns the closure contract.

### Prompt serialization

Do not make this first fixture family test prompt text such as:

```text
current_timeline_anchor=...
post_b_end_current_time_floor=...
```

The behavioral owners are Time/Lifecycle. Prompt serialization is a separate projection concern and should be added only if a real prompt-surface regression requires it.

### Arbitrary prose-time inference

Do not infer `03:00` from prose like “두 시간이 지났다” unless production itself converts that into canonical time through an owned primitive.

Narrative Tail deliberately requires canonical timestamp authority.

### Natural explicit-flashback proof

Do not claim the deterministic later-historical-token preservation case closes the deferred natural flashback validation debt.

## 15. Relationship to existing one-shot v0.64.6 regression checks

The historical v0.64.6 static test already exercised bounded controls for:

```text
post-B_END stale Narrative -> APPLIED
Narrative already later -> ALREADY_SATISFIED
second C not bridged
invalid terminal fails closed
current-frame clamp preserves historical timestamp
later Narrative tail wins
current-era rollback clamp preserves later historical token
B_END terminal commit remains separate
Summary Scope remains executable
Representation/Edit controls remain unchanged
```

Permanent `narrative-clock` should migrate only the clock-owned subset into the durable harness.

It must not copy the old one-shot script wholesale.

## 16. Implementation ordering

This document is design/evidence authority only.

If implementation is explicitly selected, normal SimCore workflow remains:

```text
main design/evidence record
→ dedicated work branch
→ add suite + fixture + registry row
→ run suite and full permanent pack against chosen source
→ static/CI validation
→ no runtime/release-simcore deployment because fixture-only change
→ main evidence sync
```

This is regression-infrastructure expansion, not a SimCore runtime feature release.

Do not combine it with M2-3 code movement, performance optimization, warning-widget implementation, or release-system restructuring.

## 17. Promotion result

```text
SIMCORE_NARRATIVE_CLOCK_PERMANENT_FIXTURE
= DESIGN FROZEN
= IMPLEMENTATION READY
= EXECUTABLE
= 13-CASE INITIAL MATRIX
= TIME + LIFECYCLE DIRECT OWNER EXECUTION
= FRAME KEPT SEPARATE
= BROADCAST CLOSURE NOT DUPLICATED
= CURRENT FLOOR IS MINIMUM, NOT CEILING
= HISTORICAL TOKENS NOT GLOBALLY REWRITTEN
= CANONICAL TAIL ONLY; NO ARBITRARY PROSE-TIME INFERENCE
= POST_B_END BRIDGE ONE-SHOT
= EXPLICIT FLASHBACK NATURAL CLOSE STILL VALIDATION_ONLY
= POST_B_END LIVE GOLDEN ESTABLISHED
= NO RUNTIME CHANGE
= NO RELEASE-SIMCORE CHANGE
```
