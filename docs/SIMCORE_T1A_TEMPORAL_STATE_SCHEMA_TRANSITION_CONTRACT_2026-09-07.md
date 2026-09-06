# SimCore T1-A Temporal Awareness — State Schema / Transition Contract

Date: 2026-09-07
Status: `T1-A DESIGN · NO IMPLEMENTATION AUTHORITY · NO RUNTIME/VERSION CHANGE`
Tracking: #1780
Parent Temporal program: #1763
Prior ownership/source map: #1775
Umbrella: #1768

## 1. Purpose

T1-A defines the smallest bounded portable state required for Temporal Awareness before any runtime implementation.

This document does not implement arithmetic grammar, prompt projection, or release behavior. It fixes the semantic state shape and transition invariants that later T1 work must obey.

The design must represent:

- exact-minute present narrative position;
- date-only present position;
- bounded/range position;
- relative-order-only position;
- unknown position;
- source-backed retrospective context without regressing the present head;
- exact-once candidate/reroll/edit/reload semantics;
- truthful compatibility with existing `narrativeTimestamp`, `worldYear`, and `koreanAgeOffset`.

Hard rule:

```text
bounded state, no event ledger
```

## 2. Fresh authority

At T1-A start:

```text
main                 = 94287d41e159fa1a00569ef41ae3250ecebb3865
production version   = 0.70.10
release branch       = release-simcore
release commit       = ecc55f026315c6482c34d267aba2adb97527cdbc
latest.js blob       = 53f6959039c57f8673c355fcc1c22b573150e4a7
install.js blob      = 53f6959039c57f8673c355fcc1c22b573150e4a7
latest == install    = YES
```

Production remains unchanged by this transaction.

## 3. Ownership remains unchanged

Accepted from #1775:

```text
Time            = temporal parsing/calculation/precision/assessment owner
Lifecycle       = request/mode eligibility owner
Structure       = commit-safety judge only
Output Finalize = accepted-output exact-once commit seam
Edit Reconcile  = edit rebuild/application coordinator
State Reconcile = portable-state composition only
Prompt          = relevance-filtered serializer only
Lineage         = commit identity, never story time
```

T1-A introduces no second temporal owner.

## 4. Portable state

The new portable domain state is one compact nested object:

```js
temporal: {
  schemaVersion: 1,
  revision: 0,
  head: TemporalPosition,
  headSource: TemporalSourceStamp | null,
  context: TemporalContext | null,
}
```

### 4.1 `schemaVersion`

Owns migration/versioning for the nested temporal state only.

It is distinct from the existing `narrativeClockVersion` and `clockRepairVersion` compatibility fields.

### 4.2 `revision`

Semantic temporal revision.

Rules:

```text
head changed       -> +1
context changed    -> +1
head+context change in same accepted transaction -> +1 total
no temporal change -> unchanged
representation-only edit -> unchanged
```

It is not a wall-clock counter and not a chat-turn counter.

Alternative reroll branches may legitimately rebuild the same predecessor revision to a new successor revision value. `revision` is a local state-generation guard, not a globally unique event ID.

## 5. `TemporalPosition`

`TemporalPosition` is a discriminated union.

Allowed precision values:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

Visible timestamp syntax such as `⏱️[...]` is not the internal canonical form.

### 5.1 EXACT_MINUTE

```js
{
  precision: 'EXACT_MINUTE',
  date: '2031-03-07',
  minuteOfDay: 1315
}
```

Invariants:

- `date` is a valid canonical calendar date;
- `minuteOfDay` is integer `0..1439`;
- weekday/12-hour rendering is derived, not persisted.

### 5.2 DATE_ONLY

```js
{
  precision: 'DATE_ONLY',
  date: '2031-03-08'
}
```

The date is known and the clock is not.

No default midnight/noon value may be inserted.

### 5.3 BOUNDED_RANGE

```js
{
  precision: 'BOUNDED_RANGE',
  lower: {
    date: '2031-03-10',
    minuteOfDay: null,
    inclusive: true
  },
  upper: {
    date: '2031-03-12',
    minuteOfDay: null,
    inclusive: true
  },
  granularity: 'DATE'
}
```

`granularity` is one of:

```text
DATE
MINUTE
```

Rules:

- lower and upper must be valid and ordered;
- `DATE` range endpoints have `minuteOfDay = null`;
- `MINUTE` range endpoints require valid minutes;
- open-ended lower-bound-only semantics do not use `BOUNDED_RANGE`; they use `RELATIVE_ORDER_ONLY`.

### 5.4 RELATIVE_ORDER_ONLY

```js
{
  precision: 'RELATIVE_ORDER_ONLY',
  relation: 'AFTER',
  anchor: {
    date: '2031-03-07',
    minuteOfDay: 1315
  },
  basisRevision: 4
}
```

Allowed relation family:

```text
AFTER
AT_OR_AFTER
BEFORE
SAME_AS
```

`anchor` is either:

- an absolute exact/date anchor when one can be retained safely; or
- `null` when only ordering relative to the previous committed position is proven.

`basisRevision` records which committed temporal state the relation was derived from.

Repeated vague advances do not create a chain. They remain one compact relation state and may retain only the strongest safe absolute anchor.

### 5.5 UNKNOWN

```js
{ precision: 'UNKNOWN' }
```

No invented date, time, range, relation, or year is attached.

## 6. Precision monotonicity is not numeric monotonicity

A later scene may be less precise than an earlier scene.

Example:

```text
21:55 exact
-> "한참 뒤"
-> RELATIVE_ORDER_ONLY AFTER 21:55
```

This is valid temporal advancement with lower precision.

Therefore the system must distinguish:

```text
position/order advancement
from
precision strength
```

A weaker later position may replace the present head when the weaker statement itself is authoritative current-scene evidence.

## 7. Source stamp

T1-A persists only constant-size provenance:

```js
{
  kind: 'USER_ABSOLUTE' |
        'USER_RELATIVE' |
        'OUTPUT_CANONICAL' |
        'B_END_FLOOR' |
        'MIGRATION' |
        'EDIT_REBUILD' |
        'CONFIG_ANCHOR',
  sendIndex: number | null,
  outIndex: number | null,
  editRevision: number | null
}
```

It must not contain:

- source prose;
- whole messages;
- prompt text;
- diagnostic receipts;
- wall-clock timestamps;
- host elapsed time;
- unbounded history arrays.

The state snapshot itself remains the durable committed record; the source stamp is only a bounded last-change provenance hint.

## 8. Present head

`temporal.head` always means the best currently proven **present narrative position**.

It does not mean:

- Broadcast airtime;
- arbitrary embedded event time;
- flashback event time;
- last exact timestamp seen anywhere;
- host/chat wall time.

Present/current calculations consume `head`.

## 9. Retrospective context

T1-A stores at most one active bounded retrospective context:

```js
{
  kind: 'RETROSPECTIVE',
  position: TemporalPosition,
  source: TemporalSourceStamp,
  enteredFromRevision: 7
}
```

Rules:

- entering retrospective context never changes `head`;
- continuing retrospective context changes only `context` unless a separate present-head event is proven;
- returning to present clears `context` and reuses the unchanged head;
- there is no duplicate `returnHead` field;
- event-local calculations use `context.position` while the context is active;
- present-current calculations continue to use `head`;
- an old timestamp embedded in assistant output does not enter retrospective context by itself;
- retrospective entry must be source-backed by current request/config semantics.

This supports multi-turn flashback continuity with constant-size state.

## 10. Why no temporal ledger

A temporal ledger would create:

- unbounded persistence growth;
- compaction semantics;
- edit/reroll replay complexity;
- prompt-leak temptation;
- duplicate history ownership beside existing snapshots.

T1-A therefore uses:

```text
current head
+ optional active context
+ bounded last-change provenance
+ existing committed state snapshots
```

Historical narrative events remain chat/history content rather than a new Time-owned event database.

## 11. Legacy `narrativeTimestamp` compatibility

When `temporal` is present, `temporal.head` is authoritative.

Compatibility mirror rule:

```text
head.precision == EXACT_MINUTE
-> narrativeTimestamp = rendered exact head timestamp

otherwise
-> narrativeTimestamp = null
```

Do not keep an obsolete exact timestamp in `narrativeTimestamp` merely because it was once known.

Example:

```text
head = 2031-03-07 21:55 EXACT_MINUTE
user establishes "한참 뒤"
new head = RELATIVE_ORDER_ONLY AFTER 21:55
narrativeTimestamp = null
```

The prior exact point may survive only as the relative anchor inside the new head.

This prevents legacy consumers from mistaking a stale exact point for current time.

## 12. Migration from current production state

For an old state without `temporal`:

### Valid existing `narrativeTimestamp`

```text
-> temporal.head = EXACT_MINUTE(parsed narrativeTimestamp)
-> temporal.headSource.kind = MIGRATION
-> temporal.context = null
-> temporal.revision = 0
```

### No valid existing exact timestamp

```text
-> temporal.head = UNKNOWN
```

unless another already-authoritative structured temporal source is explicitly available under the migration contract.

### Important non-inference rules

```text
worldYear alone -> does not create DATE_ONLY
koreanAgeOffset -> does not create a date
old diagnostic probe -> does not create head/context
embedded historical timestamp -> does not create context
```

Existing fields remain compatibility fields:

```text
worldYear
koreanAgeOffset
narrativeClockVersion
clockRepairVersion
```

## 13. Pending proposal

Generation-time temporal work remains provisional:

```js
pending.temporalProposal = {
  baseRevision,
  observation,
  disposition,
  headOp: 'KEEP' | 'REPLACE',
  nextHead: TemporalPosition | null,
  contextOp: 'KEEP' | 'ENTER' | 'UPDATE' | 'EXIT',
  nextContext: TemporalContext | null
}
```

This proposal may live in the existing pending working set, but it is not canonical temporal state.

Before exact-once commit:

```text
proposal.baseRevision must equal temporal.revision
```

Mismatch means stale proposal and no temporal mutation.

## 14. Assessment family

Time emits a bounded semantic assessment for Structure/Finalize:

```text
PASS_SAME
PASS_ADVANCE
RELATIVE_ONLY
RETROSPECTIVE
AMBIGUOUS
REGRESSION
INVALID_SOURCE
```

Meaning:

### PASS_SAME

Current temporal semantics remain equivalent.

### PASS_ADVANCE

Strong evidence proves a valid present-head advancement/replacement.

The resulting precision may be exact, date-only, or bounded.

### RELATIVE_ONLY

Only an ordering relation is provable.

May commit `RELATIVE_ORDER_ONLY` when current-scene authority is strong enough.

### RETROSPECTIVE

Strong evidence targets event-local retrospective context and must not move the present head.

### AMBIGUOUS

Output may remain usable, but T1 temporal state does not manufacture a deterministic mutation.

### REGRESSION

Strong current-scene evidence conflicts with non-retrograde present-head constraints.

Existing deterministic repair/fail-closed behavior remains the baseline.

### INVALID_SOURCE

Source is insufficient or inconsistent for temporal authority.

No canonical temporal mutation.

## 15. Core transition table

| Input class | Head action | Context action | Revision | Result |
| --- | --- | --- | ---: | --- |
| no temporal evidence | KEEP | KEEP | same | stable |
| exact absolute current timestamp | REPLACE | KEEP/EXIT as applicable | +1 | EXACT_MINUTE |
| explicit current date only | REPLACE | KEEP/EXIT as applicable | +1 | DATE_ONLY |
| exact relative with sufficient base | REPLACE | KEEP | +1 | strongest provable position |
| bounded relative range | REPLACE | KEEP | +1 | BOUNDED_RANGE |
| vague authoritative forward | REPLACE | KEEP | +1 | RELATIVE_ORDER_ONLY |
| unsupported vague prose implication | KEEP | KEEP | same | INVALID/AMBIGUOUS |
| retrospective enter | KEEP | ENTER | +1 | present head unchanged |
| retrospective continue | KEEP | UPDATE | +1 if context changed | present head unchanged |
| retrospective exit | KEEP | EXIT | +1 | present head restored by persistence |
| deterministic current regression | repair/reject per existing contract | KEEP | no unsafe commit | REGRESSION |
| stale proposal | KEEP | KEEP | same | stale drop |

## 16. No-evidence turns

Rule:

```text
NO_TEMPORAL_EVIDENCE -> no semantic temporal mutation
```

Consequences:

- ten dialogue turns do not equal ten minutes;
- no precision decay merely because many turns occurred;
- no synthetic duration based on message count;
- no revision increment.

## 17. Exact relative transitions

T1-A fixes state-result semantics but leaves detailed grammar to T1-B.

Examples:

### Exact minute + hours

```text
2031-03-07 23:00 + 2h
-> 2031-03-08 01:00 EXACT_MINUTE
```

### Date-only + 24h

```text
2031-03-07 DATE_ONLY + 24h
-> 2031-03-08 DATE_ONLY
```

### Date-only + 2h

The unknown starting clock may cross midnight.

The result must not become a fake exact clock.

Depending on T1-B proof rules, the strongest result may be a bounded date range covering both possible dates.

### Insufficient base

```text
UNKNOWN + 2h
-> no exact position
```

At most an ordering relation may be retained if the source proves forward progression.

## 18. Vague transitions

Examples:

```text
잠시 후
한참 뒤
며칠 뒤
```

No hidden duration map is permitted.

When current-scene progression is authoritative:

```text
current position -> RELATIVE_ORDER_ONLY AFTER prior position
```

When even current-scene progression is ambiguous:

```text
head unchanged
assessment = AMBIGUOUS or INVALID_SOURCE
```

## 19. Bounded range transitions

Explicit ranges such as `3~5일 뒤` may produce a bounded range when the base supports deterministic range derivation.

A range does not collapse to midpoint, earliest, or latest without explicit policy.

## 20. Broadcast compatibility

Mode B airtime remains a separate Time-owned semantic lane.

Rule:

```text
Broadcast timestamp != present narrative head by default
```

B_START/B_CONTINUE/B_END continue to use existing airtime state and monotonic rules.

### Post-B_END handoff

The validated B_END terminal time is a current-scene floor constraint.

It must not automatically become universal depicted event time.

If first-C output proves an exact current timestamp at/after the floor:

```text
head -> exact proven current timestamp
```

If only the lower bound is proven:

```text
head may become RELATIVE_ORDER_ONLY
relation = AT_OR_AFTER
anchor = B_END terminal
```

This is more truthful than forcing equality with the airtime timestamp.

## 21. Candidate discard

A generated candidate proposal is not state.

```text
base head = 10:00
candidate A = +30m -> proposal 10:30
candidate A discarded
canonical remains 10:00
```

No temporal revision increment occurs.

## 22. Reroll

Two reroll forms must be safe.

### Candidate discarded before commit

The next candidate uses the same committed base.

```text
10:00 -> candidate A 10:30 discarded
10:00 -> candidate B 10:30 accepted
```

### Replacement of an already committed output

The runtime must rebuild from the predecessor committed snapshot for that output slot and apply the replacement exactly once.

It must not do:

```text
old committed 10:30
+ replacement +30m
= 11:00  // forbidden double advance
```

Expected:

```text
predecessor 10:00
+ replacement +30m
= 10:30
```

T1 adds no separate reroll database; it reuses existing committed snapshot/lineage mechanics.

## 23. Manual edit

T1-A recognizes:

```text
REPRESENTATION_ONLY
SEMANTIC_TEMPORAL_CHANGE
AMBIGUOUS_TEMPORAL_CHANGE
```

### Representation-only

Preserve:

- `temporal.head`;
- `temporal.context`;
- `temporal.revision`.

### Semantic temporal change

Rebuild from the predecessor committed snapshot and apply edited temporal semantics exactly once through Time.

### Ambiguous temporal change

Do not upgrade to exact state.

T1 does not expand deep-history edit capability beyond the currently supported host/reconcile surface.

## 24. Reload

Current-schema reload:

```text
load snapshot
-> Time-owned temporal normalization
-> State Reconcile composition
-> no chat rescan
```

Migration from older state may use the existing bounded migration/reconcile mechanism but must not scan arbitrarily deep history merely to discover richer temporal facts.

Reload must preserve:

- head precision;
- active retrospective context;
- temporal revision;
- source stamp;
- compatibility mirror rules.

## 25. `worldYear` compatibility

`worldYear` remains monotonic compatibility state.

Rules:

- a present-head exact/date/range fact may advance it when a later year is proven;
- a retrospective context never regresses or advances `worldYear` merely because the depicted event has another year;
- RELATIVE_ORDER_ONLY/UNKNOWN with no proven year leaves it unchanged;
- `worldYear` is not a substitute for the new head.

## 26. `koreanAgeOffset` compatibility

The existing offset remains unchanged in meaning.

It is not rewritten into birthday-aware age.

T1-A does not persist `currentAge`.

## 27. Birth-date anchor contract

Birthday-aware derivation requires an authoritative birth-date anchor.

Allowed source classes:

```text
explicit structured SimCore configuration
already-authorized structured host metadata
```

Disallowed automatic authority:

```text
free-form character-card scraping
lore scraping
assistant prose
inferred birthday from current age
inferred month/day from year
```

Birth-date anchors are read-only inputs to Time.

They are not duplicated into `temporal` dynamic state unless a later concrete source adapter proves persistence is required.

## 28. Birthday-derived value naming

T1 must not conflate birthday-aware full-years arithmetic with the existing Korean-age compatibility anchor.

Preferred mathematical derived concept:

```text
fullYearsElapsedSinceBirth
```

This value is recomputed from:

```text
birth date
+ active applicable temporal date
```

It is not persisted as independent truth.

If age convention becomes user-facing, convention selection belongs to a later contract rather than silently overloading one number.

## 29. Active date for derived calculations

For present-scene facts:

```text
active date = temporal.head date/range
```

During a source-backed retrospective:

```text
active depicted-event date = temporal.context.position
present-current date        = temporal.head
```

Consumers must explicitly choose which semantic question they are asking.

There is no single global date that silently changes meaning during flashback.

## 30. Month/year invalid target boundary

T1-A does not silently select a clamp policy for invalid calendar targets.

For T1-B:

```text
Jan 15 + 1 month -> valid preserve-day result
Jan 31 + 1 month -> explicit ambiguity/policy case
Feb 29 + 1 year -> explicit ambiguity/policy case
```

Until a documented policy is selected, invalid calendar targets cannot become a fabricated exact date.

## 31. Prompt boundary

This state schema is internal.

It does not authorize dumping:

- `temporal` JSON;
- source stamps;
- revisions;
- bounds metadata;
- migration provenance;
- lineage indices.

Prompt projection remains a later T1-D relevance-filtered contract.

## 32. Exposure / COMMUNITY boundary

Temporal state does not grant epistemic access.

```text
Time knows relation/date
!=
COMMUNITY is authorized to know relation/date
```

Existing Exposure/Knowledge authority remains unchanged.

## 33. State normalization ownership

To preserve architecture contracts, the future runtime should use a Time-owned temporal normalizer, conceptually:

```text
Time.normalizeTemporalState(rawTemporal)
```

State Reconcile may call/compose this normalizer but must not independently invent temporal semantics.

This is an implementation-direction contract, not current code.

## 34. Compatibility precedence

During a migration period:

```text
if valid temporal exists:
    temporal is authoritative
    narrativeTimestamp is only compatibility mirror
else:
    existing legacy temporal fields remain migration input
```

There must never be two independent current-time authorities.

## 35. Required T1-A regressions

Future executable coverage must prove at minimum:

1. old exact `narrativeTimestamp` migrates to EXACT_MINUTE;
2. missing old timestamp migrates to UNKNOWN, not fake date;
3. exact head mirrors `narrativeTimestamp`;
4. date-only/relative/range/unknown clears compatibility timestamp;
5. no-evidence turn preserves revision/head/context;
6. exact advancement increments revision once;
7. vague authoritative advance becomes relative-only without fake duration;
8. bounded range persists exact bounds;
9. flashback enter preserves present head;
10. flashback continuation updates only context;
11. flashback exit restores present semantics by clearing context;
12. discarded candidate leaves state untouched;
13. stale `baseRevision` proposal cannot commit;
14. reroll replacement rebuilds from predecessor, no double advance;
15. representation-only edit preserves temporal revision;
16. semantic temporal edit rebuilds once;
17. reload round-trip preserves all precision families;
18. retrospective context never regresses `worldYear`;
19. B mode airtime never becomes head automatically;
20. post-B_END lower-bound-only state does not fake equality;
21. birth-date derived value is not persisted;
22. free-prose birth-date does not become authority.

Existing permanent narrative-clock regressions remain required and must continue passing.

## 36. Acceptance decisions

T1-A accepts:

```text
nested temporal state                    = YES
constant-size state                      = REQUIRED
unbounded ledger                         = REJECTED
semantic internal date/minute form       = YES
visible timestamp text as state          = NO for new head
EXACT_MINUTE                             = YES
DATE_ONLY                                = YES
BOUNDED_RANGE                            = YES
RELATIVE_ORDER_ONLY                      = YES
UNKNOWN                                  = YES
single active retrospective context      = YES
head remains present during flashback    = REQUIRED
semantic temporal revision               = YES
candidate proposal in pending            = YES
baseRevision stale-commit guard           = YES
legacy narrativeTimestamp truthful mirror= REQUIRED
stale exact compatibility timestamp      = REJECTED
persistent currentAge                    = REJECTED
birth date free-prose extraction         = REJECTED
Broadcast airtime universal head         = REJECTED
turn count as time                       = REJECTED
```

## 37. Non-goals

T1-A does not define:

- full Korean relative-time parser grammar;
- month/year invalid-date resolution policy;
- exact prompt lines;
- claim-repair UX;
- generic derived-state engine;
- new Exposure/Knowledge semantics;
- wall-clock time;
- runtime/version/release mutation.

## 38. Next transaction

```text
T1-B DETERMINISTIC TEMPORAL ARITHMETIC CONTRACT
```

T1-B should define:

- exact relative-duration grammar;
- numeric units and parsing boundaries;
- arithmetic by base precision;
- bounded-range arithmetic;
- month/year invalid-target policy;
- birth-date/full-years derivation;
- contradiction classifications.

Implementation remains unauthorized until a later explicit runtime step.

## 39. Classification

```text
program: SIMCORE_TEMPORAL_AWARENESS_T1
transaction: T1-A_STATE_SCHEMA_TRANSITION_CONTRACT
semantic owner: TIME
state growth: CONSTANT_SIZE
implementation authority: NONE
runtime change: NONE
release change: NONE
production impact: NONE
```
