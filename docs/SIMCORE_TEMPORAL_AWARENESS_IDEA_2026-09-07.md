# SimCore Temporal Awareness — Narrative-Time Design Discovery

Date: 2026-09-07
Status: `CAPTURED / DESIGN DISCOVERY ONLY · CHAT-INTERNAL TIME ONLY · NO IMPLEMENTATION AUTHORITY`
Tracking: #1763
Umbrella: #1768 / PR #1770

## 1. Scope correction

This design is strictly about **time that exists inside the chat / RP / narrative world**.

It is **not** about:
- real-world elapsed time;
- host/session clocks;
- user return gaps;
- realtime synchronization;
- timezone progression outside the fictional world.

Earlier discovery language that introduced a Wall / Host clock or a Wall ↔ Narrative bridge was an over-scope mistake and is superseded by this document and the corrected #1763 body.

The intended problem is much simpler and more useful:

```text
Can SimCore preserve and calculate narrative chronology
so the main model does not repeatedly miscalculate
age, date, time, elapsed duration and event order?
```

## 2. User motivation

A major practical failure in long-form chat/RP is not merely forgetting a date string. The main model may have the source facts and still calculate them inconsistently.

Examples:
- birth date is known but age is wrong;
- birthday passes during a time skip but age does not change;
- age changes even though narrative time did not advance;
- `23:00 + 2 hours` does not cross to the next date;
- `3 days later` lands on the wrong date;
- a long dialogue incorrectly implies time passed merely because many turns occurred;
- a flashback date replaces the present scene date;
- reroll applies the same time advancement twice.

The desired product direction is:

```text
model narrates time passage
SimCore preserves / calculates / validates deterministic temporal facts
```

## 3. Existing production overlap

SimCore already has a genuine Time semantic owner.

Current architecture records Time as owning:

```text
timestamp
calendar
broadcast airtime
narrative clock
world-year synchronization
```

Current state-ownership documentation also assigns Time ownership to:

```text
worldYear
koreanAgeOffset
narrativeTimestamp
narrativeClockVersion
clockRepairVersion
broadcastAirtime
broadcastAirtimeStart
```

Historical/current executable surfaces include:

```text
narrativeTimestampSequence
enforceNarrativeCurrentTimeFloor
commitNarrativeTimestamp
resolvePostBEndCurrentTimeFloor
compareTimestamps
```

A permanent `narrative-clock` regression family already exists and protects current-floor, timestamp-sequence, commit and post-B_END handoff behavior.

Therefore Temporal Awareness should **extend the current Time owner**, not create a parallel clock subsystem.

## 4. Existing historical defect to preserve

Historical evidence records:

```text
B_MODE_STALE_NARRATIVE_CLOCK_PROBE
```

A current Mode B diagnostic could display an older non-B narrative probe because the diagnostic consumed the latest stored probe without proving it belonged to the current mode/event lineage.

Classification was observability/WATCH rather than semantic state corruption.

Future Temporal Awareness must preserve the distinction:

```text
stale diagnostic evidence
!=
current canonical narrative authority
```

## 5. Three temporal concepts only

### 5.1 Narrative Head

The current in-world / RP position.

Examples:
- `2031-03-07 21:55`;
- `2031-03-07`;
- `next morning` when exact clock time is unavailable.

This is the present narrative authority used for current-scene continuity.

### 5.2 Event / Temporal Relation

An individual depicted event may have its own temporal position or only a relation.

Examples:
- exact event date/time;
- `5 minutes after broadcast end`;
- `before the accident`;
- `later that evening`;
- `several days later`;
- retrospective event on an older date.

This prevents a scalar clock from pretending every event belongs to the current head.

### 5.3 Chat / Commit Lineage

Which authoritative committed request/output established a temporal mutation.

Lineage is safety metadata, not story time.

It exists to protect:
- reroll;
- edit;
- discarded generation;
- reload;
- stale probe separation.

## 6. Turn count is never time

Hard invariant:

```text
number of messages
!=
elapsed narrative duration
```

Ten turns can occur inside one minute.

One turn can advance three months.

A long same-scene conversation must not advance narrative time merely because the chat became long.

## 7. Precision lattice

Do not force every temporal fact into an exact timestamp.

Candidate precision classes:

```text
EXACT
BOUNDED / RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

Examples:

```text
2031-03-07 21:55
→ EXACT

between sunset and midnight
→ BOUNDED / RANGE

later / after the meeting / several days later
→ RELATIVE_ORDER_ONLY unless the duration is explicitly known

no usable temporal evidence
→ UNKNOWN
```

A weaker fact must not overwrite a stronger committed temporal fact without an explicit semantic transition.

## 8. Deterministic calendar arithmetic

Once canonical anchors are known, calculation should not be repeatedly delegated to free-form model reasoning.

### 8.1 Age

Prefer:

```text
birthDate + currentNarrativeDate -> derived age
```

rather than treating an independently stored age number as permanent truth.

A birthday crossing should naturally change the derived age.

### 8.2 Date / duration

Examples:

```text
2031-03-28 + 5 days -> 2031-04-02
23:00 + 2 hours -> next day 01:00
```

Only compute exact results when the inputs are exact enough.

### 8.3 Elapsed interval

Where both endpoints are canonical, derive elapsed days/hours/months/years according to the selected calendar semantics.

Where only ordering is known, return ordering rather than inventing duration.

### 8.4 Contradiction check

If canonical anchors imply age 22 and output explicitly claims age 23, the deterministic layer may classify a temporal conflict.

Likewise for impossible date progression or unsupported clock regression.

## 9. Present head vs flashback / retrospective event

A flashback is the strongest reason a single scalar timestamp is insufficient.

Example:

```text
present narrative head = 2031-03-07
current depicted memory = 2031-03-01
```

Correct result:

```text
present head remains 2031-03-07
current depicted event is retrospective at 2031-03-01
return target remains present head
```

The current head must not regress merely because older event time is rendered.

`FLASHBACK / RETROSPECTIVE` is allowed only when source-backed. Otherwise an unexplained backwards timestamp remains a contradiction/regression candidate.

## 10. Candidate transaction model

Temporal mutation should follow the Deterministic State Support umbrella contract.

```text
committed temporal state
    ↓
request temporal proposal
    ↓
current prompt projection if eligible
    ↓
model output
    ↓
output temporal proposal
    ↓
Time assessment
    ↓
Structure commit-safety judgment
    ↓
Output Finalize exact-once commit
```

### 10.1 Request proposal

Current user input may explicitly establish narrative progression.

Examples:
- `three days later`;
- `the next morning`;
- explicit new canonical date.

The current Time/Lifecycle preparation seam should be reused where possible.

### 10.2 Output proposal

Canonical timestamp surfaces in the generated output may provide the output-side proposal under existing Time contracts.

Free-form prose is not automatically promoted into exact canonical time merely because it contains vague temporal language.

### 10.3 Commit

Only the authoritative commit seam may produce durable canonical advancement.

## 11. Reroll invariant

Example:

```text
committed = 10:00
candidate A proposes +30m -> 10:30
candidate A is discarded
candidate B proposes +30m
```

Correct committed result after B:

```text
10:30
```

not:

```text
11:00
```

Discarded candidates never become the next base.

## 12. Edit invariant

Edit reconciliation must distinguish:

```text
REPRESENTATION_ONLY
SEMANTIC_TIME_CHANGE
AMBIGUOUS_TIME_CHANGE
```

Representation-only changes preserve temporal authority.

A genuine semantic edit that changes date/time must be rebuilt through Time ownership exactly once.

## 13. Reload invariant

Reload must preserve:
- canonical narrative head;
- precision/certainty needed for correct semantics;
- bounded temporal provenance required for edit/reroll/diagnostic safety.

Reload must not upgrade:

```text
RELATIVE / UNKNOWN -> EXACT
```

without new evidence.

## 14. Mode A

Mode A should consume ordinary narrative chronology.

Default rules:
- no requirement that every output state an exact timestamp;
- no time advance from turn count;
- explicit/source-backed skip may advance;
- silence should preserve the existing head unless the active scene contract provides evidence that precision should be relaxed.

The exact SAME-vs-UNKNOWN behavior for scene transitions without time evidence remains a T1 design question.

## 15. Mode B / Broadcast

Broadcast already has Time-owned airtime and terminal sequence rules.

Temporal Awareness should preserve:
- B_START -> B_CONTINUE -> B_END monotonicity;
- terminal timestamp sequence validation;
- post-B_END first-C floor handoff;
- Broadcast-local event time without accidentally replacing unrelated narrative head authority;
- current diagnostic freshness proof before rendering a Narrative clock probe.

## 16. Mode C / COMMUNITY

Mode C may consume exposed temporal relations such as:
- reaction immediately after B_END;
- delayed reaction after a narrative skip;
- event before/after relation.

But temporal state does not override Exposure Knowledge policy.

```text
model/world temporal fact
!=
Community is allowed to know that fact
```

Only exposed/authorized temporal context may be projected into Community behavior.

## 17. Temporal state shape direction

Current preference remains a bounded hybrid.

### Fast derived view

```text
currentNarrativeHead
precision
```

for cheap prompt projection.

### Bounded provenance / event tail

Only enough recent temporal evidence to support:
- how the head was established;
- reroll/edit reconciliation;
- flashback/event-local relation;
- stale-probe separation.

Do not create an unbounded temporal event-sourcing database.

Conceptually:

```text
eventAt      = exact / range / relative / unknown narrative position
committedAt  = authoritative chat/output lineage identity
source       = user / assistant-output / broadcast / derived-relative
certainty    = exact / bounded / relative / unknown
relation     = before / after / same / retrospective where useful
```

No host/wall timestamp is part of Temporal Awareness semantic authority.

## 18. Prompt projection

Prompt receives semantic facts, not internal machinery.

Example exact projection:

```text
Temporal context:
- Current narrative time: 2031-03-07 21:55
- A is 22
- Current scene is after broadcast end
```

Example relative projection:

```text
Temporal context:
- Exact narrative time: unknown
- Current scene occurs after the previous scene
```

Example retrospective projection:

```text
Temporal context:
- Present narrative head: 2031-03-07
- Depicted event: 2031-03-01 retrospective
```

Omit temporal lines entirely when they are irrelevant to the current generation.

Do not inject:
- diagnostic probe text;
- generation IDs;
- raw lineage receipts;
- internal event ledger;
- real-world timestamps.

## 19. Required permanent regressions

1. explicit exact-time advance;
2. relative +N advance;
3. relative-only advance without fake duration;
4. no-time-evidence turn does not use turn count as time;
5. reroll does not double-advance;
6. discarded candidate does not mutate canonical time;
7. representation-only edit preserves time;
8. semantic edit changing time is explicitly classified/rebuilt;
9. reload preserves temporal state/provenance;
10. Broadcast B_START -> B_CONTINUE -> B_END temporal monotonicity;
11. stale cross-mode probe never renders current;
12. Mode C after B_END gets the correct exposed temporal relation;
13. flashback does not corrupt the present narrative head;
14. contradiction/regression remains visible and fail-closed;
15. long same-scene dialogue does not auto-advance merely because many turns occurred;
16. birth date + narrative date derives the correct age before birthday;
17. birthday crossing changes derived age exactly once;
18. leap/calendar edge cases follow explicit calendar semantics;
19. unknown/relative temporal state survives reload without false exactness.

## 20. Implementation direction under #1768

Temporal Awareness is T1, the first bounded domain of the wider Deterministic State Support architecture.

Preferred order:

```text
T1 ownership/source impact map
→ exact state/schema delta design
→ deterministic fixture expansion
→ implementation branch
→ static / CI validation
→ release-simcore publication
→ real long-chat validation
→ main docs/current-state synchronization
```

Implementation is **not** authorized by this document.

A generic derived-state engine remains deferred until Temporal T1 and a separate numeric progression N1 pilot prove actual shared implementation pressure.

## 21. Open T1 questions

1. What exact current Time state/fields are sufficient to extend rather than replace?
2. Which existing Time functions are parser/validator helpers versus semantic transition authority?
3. Which narrative-clock facts Prompt already serializes in v0.70.10?
4. How should a birth-date anchor be supplied and persisted without duplicating character-card authority?
5. How should partial dates such as year-only or month/day-only be represented?
6. What explicit evidence marks retrospective/flashback context?
7. What bounded provenance size is enough for edit/reroll without creating a ledger?
8. Should no-time-evidence scene transitions preserve exact head unchanged or selectively lower precision?
9. Which calendar conventions are currently implied by Time and Korean-age offset behavior?
10. How should Temporal contradictions be surfaced without making Structure a semantic repair owner?

## 22. Classification

```text
idea: SIMCORE_TEMPORAL_AWARENESS
scope: CHAT-INTERNAL / NARRATIVE TIME ONLY
state: DESIGN DISCOVERY
umbrella: SIMCORE_DETERMINISTIC_STATE_SUPPORT (#1768)
existing semantic owner: TIME
implementation authority: NONE
current release impact: NONE
```

## 23. Non-goals

- no real-world time synchronization;
- no wall/host clock semantic axis;
- no user-return-gap semantics;
- no turn-count-as-time;
- no arbitrary timestamp guessing;
- no general prose semantic parser;
- no generic world-state database;
- no memory-weighting change in T1;
- no runtime/version/release change from this design record alone.
