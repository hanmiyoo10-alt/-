# SimCore T1 Temporal Awareness — Ownership / Source Impact Scope

Date: 2026-09-07
Status: `T1 DESIGN DISCOVERY · OWNERSHIP/SOURCE MAP · NO IMPLEMENTATION AUTHORITY · NO RUNTIME/VERSION CHANGE`
Tracking: #1775
Parent Temporal program: #1763
Umbrella: #1768

## 1. Purpose

This transaction maps current v0.70.10 production Time behavior before any Temporal Awareness runtime change.

It answers four questions:

1. what temporal semantics already exist;
2. which current modules own each temporal step;
3. which sources are strong enough to derive or mutate temporal state;
4. what new T1 semantics are actually needed.

This is not a runtime implementation design.

## 2. Production authority at discovery

```text
production version = 0.70.10
release branch      = release-simcore
release commit      = ecc55f026315c6482c34d267aba2adb97527cdbc
latest/install blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
```

`latest.js` and `install.js` are byte-identical in production.

## 3. Ownership decision

Current production already defines Time as owner of:

```text
timestamp syntax
deterministic calendar transitions
narrative / broadcast clocks
world-year and age-offset primitives
```

T1 therefore extends **Time** rather than creating a parallel Temporal owner.

Existing boundaries remain:

```text
Lifecycle      = mode/broadcast/request-preparation eligibility
Time           = temporal parsing/calculation/precision/assessment semantics
Structure      = validation and commit-safety judge only
Output Finalize= exact-once accepted state/content transaction
Edit Reconcile = edit rebuild/application coordination
State Reconcile= portable-state composition/normalization only
Prompt         = relevance-filtered semantic serialization only
Lineage        = committed request/output identity, never story time
```

Decision:

```text
NEW TEMPORAL OWNER          = REJECTED
EXTEND TIME                 = REQUIRED
STRUCTURE TEMPORAL REPAIR   = REJECTED
PROMPT TEMPORAL AUTHORITY   = REJECTED
STATE-RECONCILE SEMANTICS   = REJECTED
REUSE OUTPUT COMMIT SEAM    = REQUIRED
REUSE LINEAGE SAFETY        = REQUIRED
```

## 4. Existing temporal state

Current portable/reconciled state already contains:

```text
worldYear
koreanAgeOffset
narrativeTimestamp
narrativeClockVersion
clockRepairVersion
```

plus Time-owned Broadcast airtime state.

Current normalization already migrates legacy `narrativeYear -> worldYear`, normalizes the age offset, trims `narrativeTimestamp`, and normalizes clock versions.

Existing meanings must be preserved:

- `narrativeTimestamp` is the compatibility exact-minute non-B narrative anchor when available;
- `worldYear` is a monotonic world-year compatibility anchor;
- `koreanAgeOffset` is a monotonic year-offset compatibility primitive, not a birthday-aware age model.

## 5. Existing Time capabilities

### Timestamp and exact arithmetic

Current production already provides:

```text
normalizeTimestampSyntax
parseTimestamp
timestampYear
compareTimestamps
elapsedMinutes
```

`parseTimestamp` validates exact calendar/time values and produces a deterministic minute key, so exact-minute comparison and elapsed-minute arithmetic already exist.

### Calendar transitions

Current production already provides:

```text
explicitWorldYear
resolveCalendarTransition
enforceNarrativeCalendarTarget
repairNarrativeYearRolloverSequence
applyWorldYear
```

The current calendar transition grammar is deliberately narrow and source-backed rather than a general prose parser.

### Narrative progression and commit

Current production already provides:

```text
narrativeProgressionHint
enforceNarrativeCurrentTimeFloor
narrativeTimestampSequence
commitNarrativeTimestamp
syncNarrativeTimestamp
```

The current progression hint is intentionally relational. It can detect clear forward language but does not generally calculate every exact relative duration into a new canonical head.

The current floor protects the first/current timestamp from regression while leaving later embedded/source-event timestamps untouched.

### Broadcast handoff

Current production already provides Time-owned Broadcast airtime handling and `resolvePostBEndCurrentTimeFloor`.

Broadcast airtime remains distinct from arbitrary depicted scene/event time.

## 6. Existing request transaction

Current request preparation already follows the right shape:

```text
committed narrativeTimestamp
-> Lifecycle post-B_END eligibility
-> Time post-B_END effective floor
-> Time narrow calendar transition
-> Time progression hint
-> pending temporal working facts
-> Prompt serialization
```

Current pending state includes narrative progression reason, prior timestamp, current floor, guard state, calendar target, post-B_END disposition/floor/reason, and current-time authority.

T1 should extend this working set rather than create a second request-time temporal machine.

## 7. Existing output / commit transaction

For non-B output, Output Finalize already composes Time work in a suitable order:

```text
prepared output
-> calendar target enforcement
-> bounded year-rollover repair
-> current-time floor enforcement
-> world-year application
-> narrative timestamp commit
-> world-year application from committed timestamp
-> committed state/content
```

This remains the T1 exact-once mutation seam.

Generated but discarded/rerolled candidates must never become the next canonical temporal base.

## 8. Structure boundary

Structure already judges deterministic timestamp regressions while Time performs temporal calculation/repair.

T1 preserves:

```text
Time computes temporal assessment
-> Structure consumes assessment for commit safety
```

Structure must not become a temporal parser/calculator/repair engine.

## 9. Existing Prompt impact

Production already projects temporal guidance, including a current timeline anchor, progression semantics, calendar targets, current-time floors, post-B_END handoff semantics, and legacy slow-tier `world_year` / `korean_age_offset` lines.

When `koreanAgeOffset > 0`, production also projects a compatibility formula based on `character_reference_age + offset`.

T1 must **not** stack another permanent temporal block on top of these lines.

Target rule:

```text
no relevant T1 temporal fact -> no new T1 temporal prompt lines
```

Internal temporal precision/provenance may be richer than prompt projection.

Raw lineage, diagnostic probes, migration receipts, or temporal ledgers must not be injected.

Any future removal of existing always-on age/year compatibility lines requires separate prompt-cache/compatibility proof.

## 10. Source authority classes

The difficult T1 problem is proving what temporal event occurred, not doing arithmetic.

### Strong deterministic sources

When their bounded contract is satisfied, T1 may treat these as temporal authority:

- existing canonical timestamp surfaces;
- explicit current-user date/time transitions under Time grammar;
- explicit numeric relative durations under bounded Time grammar;
- validated existing B_END terminal airtime handoff;
- explicitly configured/contractual temporal anchors;
- owner-produced pending facts whose evidence was already proven.

### Weak / non-authoritative sources

These do not automatically mutate temporal authority:

- arbitrary free-form prose implication;
- vague duration such as `잠시 후`, `한참 뒤`, `며칠 뒤`;
- number of chat turns;
- old embedded/source-event timestamps;
- model knowledge that is not current-scene temporal authority;
- unsupported retrospective timestamps;
- guessed missing calendar precision.

## 11. Precision model required by T1

Minimum semantic lattice:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

A weaker observation must never silently overwrite a stronger committed fact.

Examples:

```text
2031-03-07 21:55 EXACT_MINUTE + "later"
-> exact new clock is not invented

2031-03-07 DATE_ONLY + "2 hours later"
-> exact clock remains unknown

2031-03-07 23:00 EXACT_MINUTE + "2 hours later"
-> 2031-03-08 01:00 is deterministically derivable
```

The exact persistent representation is deferred to T1-A state/schema design.

## 12. Relative-time arithmetic gap

Current production can detect relative-forward language, but T1 needs a bounded deterministic rule:

```text
exact numeric relative duration
+ sufficient base precision
-> deterministic new temporal position
```

Candidate units are minutes, hours, days, weeks, months, and years.

Month/year end-of-month and leap-day semantics must be explicitly selected before implementation.

Vague quantities remain relative only:

```text
며칠 뒤 -> RELATIVE_ORDER_ONLY
한참 후 -> RELATIVE_ORDER_ONLY
잠시 후 -> RELATIVE_ORDER_ONLY
```

## 13. DATE_ONLY head gap

Current `narrativeTimestamp` requires a clock-bearing exact timestamp.

T1 needs to preserve a proven current date without inventing time of day.

Example:

```text
current date = 2031-03-08
clock        = UNKNOWN
```

The next state/schema design must preserve this while remaining compatible with existing exact `narrativeTimestamp` consumers.

## 14. Present head vs event context gap

T1 must distinguish:

```text
present narrative head
active depicted event/context time
commit lineage identity
```

A source-backed flashback may have an older event date while the present head remains unchanged.

Multi-turn retrospective continuity may require a small bounded active-context state, but T1 must not introduce an unbounded event ledger.

Returning to present must restore/use the unchanged present head.

## 15. Age model impact

### Existing compatibility behavior

`koreanAgeOffset` advances with greater world years and supports the current prompt compatibility formula.

It must not be silently redefined as birthday-aware age.

### New exact age-at-date

Exact age is derived only when an authoritative birth-date anchor exists:

```text
birthDate + active narrative/event date -> derived age
```

Birthday crossing then changes the derived result naturally rather than requiring an independent `age++` mutation.

### Birth-date source boundary

This transaction does not authorize arbitrary character-card scraping, lore extraction, free-prose discovery, or guessing a missing birth month/day.

The next source/schema contract must explicitly define how a birth-date anchor enters Time.

## 16. Reroll / edit / reload invariants

Canonical rule:

```text
candidate proposal != committed temporal state
```

Example:

```text
committed 10:00
candidate A proposes +30m -> 10:30
A discarded
candidate B proposes +30m -> 10:30
```

Never `11:00`.

Edits must distinguish representation-only, semantic temporal change, and ambiguous temporal change.

Reload/migration must preserve exact/relative/unknown precision and must never upgrade weak evidence to false exactness.

No stale diagnostic evidence may become current temporal authority.

## 17. Broadcast compatibility

T1 must preserve:

```text
Mode B timestamp = broadcast airtime
!= arbitrary scene/event time
```

B_START -> B_CONTINUE -> B_END monotonicity, B_END terminal validation, and first-C post-B_END floor handoff remain protected behavior.

A retrospective/event-local T1 context must not corrupt Broadcast airtime, and Broadcast airtime must not silently become a universal world head.

## 18. Mode C / Exposure boundary

Temporal knowledge does not bypass Exposure/Knowledge policy.

```text
Time/world knows a temporal relation
!=
Community is authorized to know it
```

T1 adds no new epistemic inference authority.

## 19. Existing executable regression authority

The permanent `narrative-clock` suite directly executes current production Time and Lifecycle surfaces and freezes 13 current-floor, tail-sequence, and post-B_END cases.

T1 extends this suite rather than replacing it.

New required regression families include:

- exact +N minute/hour/day arithmetic and rollover;
- DATE_ONLY preservation without fake clock;
- vague relative time without fake duration;
- no-evidence and long same-scene stability;
- discarded/rerolled candidate exact-once safety;
- representation-only edit preservation;
- semantic temporal edit exact-once rebuild;
- reload precision preservation;
- source-backed flashback without present-head regression;
- bounded multi-turn retrospective context and return to present;
- birth-date age before/after birthday when source-backed;
- documented leap-day behavior;
- unchanged Broadcast/post-B_END regression behavior;
- stale cross-mode diagnostic probe never becoming current authority.

## 20. Reuse / extend / new map

```text
parseTimestamp                   = REUSE
compareTimestamps                = REUSE
elapsedMinutes                   = REUSE + EXTEND USE
resolveCalendarTransition        = EXTEND
narrativeProgressionHint         = EXTEND / NARROW ROLE
calendar target enforcement      = REUSE
year-rollover repair             = REUSE
current-time floor               = REUSE
narrativeTimestampSequence       = REUSE
commitNarrativeTimestamp         = REUSE / ADAPT
syncNarrativeTimestamp           = REUSE / ADAPT
applyWorldYear                   = REUSE AS COMPATIBILITY
koreanAgeOffset                  = PRESERVE AS COMPATIBILITY
birthday-aware age-at-date       = NEW DERIVED SEMANTIC
precision lattice                = NEW SEMANTIC
DATE_ONLY head                   = NEW SEMANTIC
active retrospective context     = NEW SEMANTIC
bounded temporal provenance      = NEW ONLY IF SCHEMA REQUIRES
new global Temporal owner        = REJECT
new generic Derived-State engine = REJECT FOR T1
```

## 21. Recommended T1 decomposition

### T1-A State / schema / transition contract

Define the smallest compatibility-preserving state for exact-minute head, date-only head, weaker precision, active retrospective context, and bounded commit provenance.

Also decide whether birth-date anchors belong in the first runtime slice.

### T1-B Deterministic arithmetic contract

Define exact relative-duration grammar, precision preconditions, month/year calendar policy, age-at-date rules, and temporal conflict dispositions.

### T1-C Transaction integration contract

Map new state through pending request preparation, Time assessment, Structure judgment, Output Finalize commit, Edit Reconcile, State Reconcile, and reload/migration.

### T1-D Prompt projection contract

Define exact relevance rules and prove no steady-state T1 prompt expansion on temporally irrelevant turns.

### T1-E Runtime implementation / release

Only after explicit authorization:

```text
implementation branch
-> static / CI
-> release-simcore
-> real long-chat verification
-> main current-state/docs synchronization
```

## 22. Next transaction

```text
T1_STATE_SCHEMA_TRANSITION_CONTRACT
```

The next design transaction should decide the actual temporal state shape and transition table before any runtime code changes.

## 23. Classification

```text
program: SIMCORE_TEMPORAL_AWARENESS_T1
transaction: OWNERSHIP_SOURCE_IMPACT_SCOPE
status: DESIGN DISCOVERY
semantic owner: TIME
implementation authority: NONE
runtime change: NONE
release change: NONE
```
