# SimCore Temporal Awareness — Idea / Design Discovery

Date: 2026-09-07
Status: `CAPTURED / DESIGN DISCOVERY ONLY`
Tracking: #1763

## Why this topic exists

SimCore already has time-related evidence in the historical runtime surface:

- a `Narrative clock probe`;
- `narrativeTimestampSequence(...)` used by Broadcast-terminal diagnostics;
- Broadcast airtime;
- a historical `B_MODE_STALE_NARRATIVE_CLOCK_PROBE` WATCH where a prior non-B narrative probe remained visible during Broadcast.

That proves a Time-related semantic seed already exists, but the observed behavior is primarily diagnostic/sequence validation. This document explores a larger question: should SimCore treat time as a first-class state dimension instead of only a diagnostic value?

This topic is separate from the current operator-release-card repair and separate from the visible `internal:` alias FIX.

## Core design thesis

Do **not** give SimCore one universal clock.

A trustworthy temporal model should keep independent time authorities and only relate them when explicit evidence permits it.

### Clock A — Wall / Host Time

What actually happened outside the fictional world:

- request observation time;
- output observation/commit time;
- reload/session gap;
- elapsed host time between turns.

This is operational metadata.

**Hard rule:** real-world time passage must never silently advance story time.

A user returning after eight real hours does not mean eight story hours passed.

### Clock B — Conversation Chronology

The order of authoritative chat events:

- request index;
- output index;
- generation/runtime identity;
- commit order;
- edit/reroll lineage.

This clock answers `what happened before what?`, even when no story timestamp is known.

Conversation chronology should remain reliable even when narrative time is UNKNOWN.

### Clock C — Narrative / World Time

The fictional or simulation-local date/time, advanced only from explicit/source-backed narrative evidence.

Examples:

- `10분 후`;
- `다음날 아침`;
- `2031-03-07 09:55 PM`;
- a trusted Broadcast airtime progression.

Narrative time may be:

- exact;
- bounded/ranged;
- relative-only;
- unknown.

Do not manufacture precision.

`잠시 후` should not become `+5 minutes` unless a rule explicitly establishes that mapping.

### Clock D — Event Time / Event Age

Individual facts may have their own temporal position independently of the current world clock.

Examples:

- broadcast started at T1;
- broadcast ended at T2;
- community reaction observed after T2;
- character learned a fact at T3;
- an event is known to be `before X` but not exactly dated.

This supports freshness and causal ordering without forcing everything onto one scalar timestamp.

## Candidate canonical event shape

Conceptually, a temporal fact could carry:

```text
eventAt       = exact/range/relative/unknown narrative position
observedAt    = host/conversation observation identity
committedAt   = authoritative SimCore commit identity
source        = user | assistant-output | broadcast | state | derived-relative
certainty     = exact | bounded | relative | unknown
relation      = before/after/same/as-of when useful
```

This is a design sketch, not a proposed runtime schema yet.

## The important semantic rules

### 1. Commit, not generation, advances canonical time

A candidate/generated response must not mutate canonical narrative time merely because it contained a timestamp.

Canonical advancement should occur only at the same authoritative seam that accepts the output/event as committed state.

This matters for rerolls and discarded generations.

### 2. Reroll must not double-advance time

Example:

```text
canonical time = 10:00
candidate response says "30분 후" -> 10:30
user rerolls that response
new candidate also says "30분 후"
```

The result must not accidentally become 11:00 because the discarded candidate advanced hidden state.

Temporal state therefore needs lineage/commit semantics, not just timestamp parsing.

### 3. Edit reconciliation must preserve temporal provenance

If an already-committed response is edited, the system must distinguish:

- textual representation drift only;
- an actual semantic change to elapsed/narrative time;
- ambiguity that requires fail-closed handling.

A representation-only edit should not rewrite story time.

### 4. Wall time and story time require an explicit bridge

Possible bridge examples:

- user explicitly says `현실 시간대로 흘러가게 해`;
- a scenario contract says story time is synchronized to a real timezone;
- a simulation mode explicitly owns realtime progression.

Without such a bridge, they remain separate.

### 5. Relative-only evidence stays relative

Temporal precision should form a lattice rather than a fake single timestamp:

```text
EXACT
BOUNDED/RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

A weaker observation must not overwrite a stronger committed fact.

### 6. Temporal contradiction is a first-class condition

Examples:

- previous committed time 18:00, new output claims 14:00 with no flashback marker;
- `다음날` followed by an earlier date;
- Broadcast airtime decreases inside one authoritative sequence.

The system should classify the contradiction rather than silently normalize it away.

Candidate dispositions:

- `PASS_ADVANCE`;
- `PASS_SAME`;
- `RELATIVE_ONLY`;
- `AMBIGUOUS`;
- `REGRESSION`;
- `FLASHBACK/RETROSPECTIVE` only when source-backed.

## Mode interactions worth exploring

### Mode A

Likely the cleanest place to consume narrative time as ordinary scene chronology.

Questions:

- does every scene output need a time expression?
- should silence mean SAME or UNKNOWN?
- how are montage/time-skip phrases represented?

### Mode B / Broadcast

Broadcast already has airtime evidence and historical narrative clock diagnostics.

Potential improvement:

- Broadcast owns its own temporal event sequence;
- diagnostics show only a probe fresh for the current mode/event lineage;
- Mode B must not surface a stale Mode C narrative probe as if current.

The historical `B_MODE_STALE_NARRATIVE_CLOCK_PROBE` WATCH is directly relevant here.

### Mode C / COMMUNITY

Time could materially improve reaction semantics:

- immediate reaction;
- late reaction;
- reaction to a just-ended broadcast;
- reaction after a large narrative skip.

But COMMUNITY must consume only exposed/authorized event time, not hidden internal state.

## Memory implications

A temporal model could help memory distinguish:

```text
fact happened long ago in-world
fact was mentioned recently in chat
fact was learned recently by a character
fact is old in wall-clock time but current in story time
```

These are currently easy to conflate if all recency is treated as turn distance.

A future memory design could use temporal provenance for retrieval weighting, but this is explicitly downstream and not part of the discovery implementation scope.

## Prompt projection implications

The model probably should **not** receive raw diagnostics such as host timestamps, generation IDs, or internal probe state.

A safe projection would be small and semantic, for example:

```text
Temporal context:
- Current narrative time: 2031-03-07 21:55 (exact)
- Previous committed scene: 5 minutes earlier
- Current event relation: after broadcast end
```

Or, when evidence is weak:

```text
Temporal context:
- Exact narrative time: unknown
- Current event is after the previous scene
```

The projection must preserve UNKNOWN rather than fabricate a clock.

## Architecture options

### Option 1 — Scalar narrative clock

Store one canonical narrative timestamp plus provenance.

Pros:
- simple;
- cheap;
- easy diagnostics.

Cons:
- poor representation of relative/range/flashback semantics;
- easy to overstate precision;
- awkward for competing event timelines.

### Option 2 — Small temporal event ledger

Store a bounded tail of committed temporal events and derive current narrative position.

Pros:
- handles rerolls/lineage better;
- preserves provenance;
- can represent relative-only relationships;
- better for Broadcast/COMMUNITY causal freshness.

Cons:
- more state and validation complexity;
- requires bounded compaction rules.

### Option 3 — Hybrid

Keep:

- one derived current narrative position for fast prompt projection;
- a small bounded provenance/event tail as authority for how it was reached.

**Current discovery preference: Hybrid**, because SimCore already cares heavily about lineage and fail-closed state ownership.

## Regression families a future design would need

At minimum:

1. explicit exact-time advance;
2. relative `+N` advance;
3. relative-only `later` without fake duration;
4. no temporal evidence;
5. reroll of an advancing candidate does not double-advance;
6. discarded candidate does not mutate canonical time;
7. edit representation-only path preserves time;
8. semantic edit changing time is classified explicitly;
9. reload preserves canonical temporal provenance;
10. Broadcast B_START -> B_CONTINUE -> B_END monotonic airtime;
11. stale cross-mode probe never renders as current;
12. C reaction after B_END receives correct exposed temporal relation;
13. flashback/retrospective case does not corrupt present-time head;
14. contradiction/regression remains visible and fail-closed;
15. wall-clock gap alone never advances narrative time.

## Open questions

1. Where is the current shipped Time owner and what state does it already persist?
2. Is `narrativeTimestampSequence(...)` parser-only, validator-only, or already semantic authority?
3. Does current Prompt already inject any narrative-clock result into model context?
4. Which mode owns canonical time advancement?
5. Should the present-time head support branch/flashback contexts?
6. How should timezone be represented for fictional clocks?
7. What compaction limit would keep a temporal ledger bounded?
8. Can current output-commit lineage be reused instead of creating another authority seam?

## Classification

```text
idea: SIMCORE_TEMPORAL_AWARENESS
state: CAPTURED / DESIGN DISCOVERY
system impact: LIKELY RUNTIME + PROMPT + STATE CONTRACT IF IMPLEMENTED
importance: HIGH CANDIDATE
complexity: HIGH
implementation authority: NONE
current release impact: NONE
```

## Non-goals

- no version bump;
- no source/runtime change;
- no real-time simulation by default;
- no arbitrary timestamp guessing;
- no timezone assumption;
- no memory weighting change yet;
- no Broadcast/COMMUNITY behavior change yet;
- no implementation while current Time ownership and regression surface remain unmapped.
