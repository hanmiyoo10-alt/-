# SimCore T1 Temporal Awareness — Ownership / Source Impact Scope

Date: 2026-09-07
Status: `T1 DESIGN DISCOVERY · OWNERSHIP/SOURCE MAP · NO IMPLEMENTATION AUTHORITY · NO RUNTIME/VERSION CHANGE`
Tracking: #1775
Parent Temporal program: #1763
Umbrella: #1768

## 1. Purpose

This document maps the current v0.70.10 production Time implementation before any Temporal Awareness runtime change.

The goal is to answer four questions first:

1. What temporal semantics already exist in production?
2. Which current modules own each part of the temporal transaction?
3. Which evidence sources are strong enough to mutate or derive temporal state?
4. What genuinely new semantic gaps remain for T1?

This is not the T1 state-schema implementation design and does not authorize runtime work.

## 2. Fresh production authority

At discovery time:

```text
production version = 0.70.10
release branch      = release-simcore
release commit      = ecc55f026315c6482c34d267aba2adb97527cdbc
latest/install blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
main design base    = 90aecf144390f81d7bd6d3e5d4a46dda1c059953
```

`latest.js` and `install.js` are byte-identical in production.

## 3. Existing module ownership is already suitable

The v0.70.10 contract defines Time as owning:

```text
timestamp syntax,
deterministic calendar transitions,
narrative/broadcast clocks,
world-year and age-offset primitives
```

and explicitly excludes scene meaning and mode classification.

T1 therefore MUST extend Time rather than create a second temporal semantic owner.

Existing related ownership remains:

```text
Lifecycle
= mode/broadcast lifecycle + request preparation
!= timestamp math

Time
= all deterministic temporal semantics
!= scene-meaning classifier

Structure
= validation / commit-safety judge
!= temporal repair or arithmetic owner

Output Finalize
= accepted prepared-output -> committed state/content transaction

Edit Reconcile / Bootstrap Migration
= reconciliation/rebuild coordination
!= independent temporal semantics

State Reconcile
= portable-state composition/normalization
!= temporal semantic owner

Prompt
= semantic projection serialization
!= temporal authority

Lineage
= request root/parent/depth identity
!= story time
```

### T1 ownership decision

```text
NEW TEMPORAL MODULE            = REJECT
EXTEND TIME                    = YES
LIFECYCLE AS TEMPORAL OWNER    = NO
STRUCTURE AS TEMPORAL OWNER    = NO
PROMPT AS TEMPORAL OWNER       = NO
STATE-RECONCILE AS OWNER       = NO
REUSE OUTPUT FINALIZE COMMIT   = YES
REUSE LINEAGE AS SAFETY ID     = YES
```

## 4. Current persistent/reconciled temporal state

The current portable state includes:

```text
worldYear
koreanAgeOffset
narrativeTimestamp
narrativeClockVersion
clockRepairVersion
```

plus Broadcast airtime state owned by Time.

Current normalization behavior already:
- migrates legacy `narrativeYear -> worldYear`;
- normalizes `koreanAgeOffset` to a non-negative integer;
- trims/normalizes `narrativeTimestamp`;
- normalizes narrative clock and repair versions;
- preserves Time ownership while State Reconcile performs composition only.

### Existing meaning

`narrativeTimestamp` is the current exact-minute non-B narrative anchor when one is available.

`worldYear` is the monotonically advanced world-year compatibility anchor.

`koreanAgeOffset` is a monotonically increased year-offset primitive used by current prompt guidance.

It is NOT a birthday-aware birth-date model.

## 5. Current Time API surface

Current production Time exposes at least the following semantic families.

### 5.1 Timestamp syntax / comparison

```text
parseTimestamp
normalizeTimestampSyntax
timestampYear
compareTimestamps
elapsedMinutes
```

`parseTimestamp` validates calendar/time values and provides a deterministic minute key.

`compareTimestamps` and `elapsedMinutes` already support exact-minute ordering/arithmetic when both endpoints are exact timestamps.

### 5.2 World year / compatibility age

```text
explicitWorldYear
applyWorldYear
```

`applyWorldYear` behaves monotonically:

```text
first known year -> worldYear initialized
later greater year -> koreanAgeOffset += year delta; worldYear advances
equal/older year -> no backward mutation
```

This is useful compatibility behavior but is not sufficient for birthday-aware age-at-date.

### 5.3 Current calendar transition

```text
resolveCalendarTransition
enforceNarrativeCalendarTarget
repairNarrativeYearRolloverSequence
```

Current request-side calendar resolution is intentionally narrow and recognizes an explicit current-date transition grammar near the opening of the current user input.

It can resolve a target date, weekday, year rollover and explicit/fallback year semantics.

Output Finalize can then repair the canonical current timestamp date/weekday and a bounded single-year rollover sequence.

### 5.4 Narrative progression / floor

```text
narrativeProgressionHint
enforceNarrativeCurrentTimeFloor
narrativeTimestampSequence
commitNarrativeTimestamp
syncNarrativeTimestamp
```

Current progression detection is deliberately relational and conservative.

It recognizes clear forward wording, including explicit relative-forward phrases, but does not generally turn every numeric relative duration into a deterministic new narrative timestamp.

`enforceNarrativeCurrentTimeFloor` prevents the first/current canonical timestamp from moving backward while leaving later embedded/source-event timestamps untouched.

`narrativeTimestampSequence` distinguishes the response frame timestamp from later scene/tail timestamps and can promote a terminal timestamp only when the sequence is monotonic.

`commitNarrativeTimestamp` is non-B only and commits the accepted current candidate exactly once into the working committed state.

### 5.5 Broadcast handoff

```text
resetBroadcastAirtime
commitBroadcastAirtime
resolvePostBEndCurrentTimeFloor
```

Mode B airtime remains a separate Time-owned semantic lane.

The current post-B_END handoff validates the B_END terminal airtime against stored airtime and applies it only as a current-time floor when it is later than the existing narrative anchor.

Broadcast airtime is explicitly not treated as arbitrary depicted event time.

## 6. Current request transaction

The current preparation sequence is already close to the desired T1 architecture:

```text
committed narrativeTimestamp
    ↓
Lifecycle proves post-B_END eligibility
    ↓
Time resolves post-B_END effective floor
    ↓
Time resolves narrow explicit calendar transition
    ↓
Time resolves forward progression hint
    ↓
Time may advance worldYear from explicit current-date evidence
    ↓
pending request temporal facts
    ↓
Prompt serialization
```

Current pending fields include:

```text
narrativeProgressionActive
narrativeProgressionReason
narrativeTimestampPrevious
narrativeCurrentTimeFloor
narrativeClockGuard
narrativeCalendarTarget
postBEndClockEligible
postBEndClockDisposition
postBEndClockFloor
postBEndClockReason
currentTimeAuthority
```

T1 SHOULD extend this working-set concept rather than create a second request-time state machine.

## 7. Current output / commit transaction

Current Output Finalize already applies temporal work in a strong order:

```text
prepared output
    ↓
Time.enforceNarrativeCalendarTarget
    ↓
Time.repairNarrativeYearRolloverSequence
    ↓
Time.enforceNarrativeCurrentTimeFloor
    ↓
Time.applyWorldYear
    ↓
Time.commitNarrativeTimestamp
    ↓
Time.applyWorldYear(committed timestamp year)
    ↓
Structure/diagnostic receipts + persisted committed output state
```

This is the correct seam for T1 exact-once state mutation.

T1 MUST NOT mutate durable temporal authority when a generation is merely a discarded/rerolled candidate.

## 8. Current Structure boundary

Structure currently judges deterministic temporal regressions when the relevant guard is active.

Examples include:
- Mode B airtime regression;
- non-B current narrative timestamp regression.

This boundary is correct.

For T1:

```text
Time computes temporal assessment
→ Structure consumes the assessment
```

not:

```text
Structure parses and repairs temporal meaning itself
```

## 9. Current Prompt projection

Production already projects several temporal semantics.

### 9.1 Current timeline anchor

For non-B turns with a current floor/previous timestamp:

```text
current_timeline_anchor=<timestamp>
current_timeline_authority=1
historical_context_reference_only=1
explicit_user_requested_past_scene_or_flashback_may_depart=1
current_character_age_and_status_follow_current_timeline=1
past_event_age_or_status_not_current=1
```

### 9.2 Dynamic current-progress guidance

When a current-user progression is detected:

```text
timestamp_semantics=current_narrative_time
embedded_preview_flashback_or_event_time_does_not_replace_current_timestamp=1
narrative_progression_hint=<reason>
```

and, when available:

```text
narrative_calendar_target=<YYYY-MM-DD>
narrative_calendar_weekday=<weekday>
narrative_current_time_floor=<timestamp>
```

### 9.3 Post-B_END C handoff

Mode C may receive:

```text
post_b_end_current_time_floor=<timestamp>
post_b_end_clock_handoff=<disposition>
```

with explicit guidance that the floor is only the current-frame minimum and that Broadcast airtime is not depicted event time.

### 9.4 Legacy slow-tier age/year state

Every active prompt currently includes:

```text
korean_age_offset=+N
world_year=<year|unknown>
```

and when the offset is positive:

```text
current_korean_age=character_reference_age+N;past_event_age_not_current=1
```

This is existing compatibility behavior.

T1 SHOULD NOT add another always-on temporal block on top of it.

## 10. Prompt-budget rule for T1

The target is:

```text
no relevant temporal fact -> no new T1 temporal lines
```

T1 should consolidate/replace dynamic semantic projection rather than stack new raw state on top of current prompt lines.

Internal state may become richer than prompt projection.

Prompt MUST NOT receive:
- raw temporal provenance ledger;
- generation IDs;
- stale diagnostic probe state;
- migration receipts;
- entire temporal database;
- real-world timestamps.

The existing always-on `world_year` / `korean_age_offset` lines are an impact item, not an automatic T1 removal. Any removal requires a separate prompt-cache/compatibility proof.

## 11. Source authority classes

The central T1 problem is not arithmetic. It is proving the temporal event.

### 11.1 Strong deterministic sources

T1 may use these as temporal authority when their contract is satisfied:

1. existing canonical timestamp surfaces;
2. explicit current-user date/time transitions under bounded Time grammar;
3. explicit numeric relative durations under bounded Time grammar;
4. existing B_END terminal airtime handoff with source validation;
5. explicitly configured temporal anchors;
6. owner-produced pending facts whose evidence has already been proven.

### 11.2 Weak / non-authoritative sources

These MUST NOT automatically mutate temporal authority:

1. arbitrary free-form prose implication;
2. vague duration: `잠시 후`, `한참 뒤`, `며칠 뒤`;
3. turn count;
4. model knowledge that is not current-scene temporal authority;
5. old embedded/source-event timestamp;
6. retrospective timestamp with no source-backed retrospective context;
7. guessed calendar precision.

## 12. Precision model required by T1

Current production effectively has a strong exact-minute anchor plus relational guards.

T1 needs explicit semantics for weaker information.

Minimum semantic lattice:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

### Rule

A weaker observation MUST NOT silently overwrite a stronger canonical fact.

Examples:

```text
current = 2031-03-07 21:55 EXACT_MINUTE
user says "later"
-> do not invent 22:00

current = 2031-03-07 DATE_ONLY
user says "2 hours later"
-> exact clock remains UNKNOWN because the base clock is unknown

current = 2031-03-07 23:00 EXACT_MINUTE
user says "2 hours later"
-> 2031-03-08 01:00 can be derived exactly
```

The exact persistent representation is deliberately deferred to the T1 state/schema contract.

## 13. Relative-time arithmetic gap

Current production already recognizes relative-forward wording for guard activation, but the core desired T1 behavior is stronger:

```text
exact numeric relative duration
+ sufficient canonical base precision
-> deterministic new temporal position
```

Candidate bounded units:
- minutes;
- hours;
- days;
- weeks;
- months;
- years.

Calendar-month/year semantics MUST be explicit before implementation, especially around end-of-month/leap-day behavior.

Vague quantity remains non-exact:

```text
며칠 뒤 -> RELATIVE_ORDER_ONLY
한참 후 -> RELATIVE_ORDER_ONLY
잠시 후 -> RELATIVE_ORDER_ONLY
```

## 14. Date-only head gap

Current `narrativeTimestamp` requires an exact clock-bearing canonical timestamp.

T1 needs to preserve a proven current date even when the time of day is unknown.

Example:

```text
previous head = 2031-03-07 21:55
user explicitly establishes 2031-03-08 but no time-of-day
```

The system should not invent a clock.

The next schema design must decide how to preserve:

```text
current date = 2031-03-08
clock = UNKNOWN
```

while maintaining compatibility with existing `narrativeTimestamp` users.

## 15. Present head vs active event context gap

Current production already protects the current anchor from embedded old timestamps and tells the model that explicit flashbacks may depart from the current timeline.

That is not yet a full multi-turn retrospective model.

T1 requires three distinct concepts:

```text
present narrative head
active depicted event/context
commit lineage identity
```

Example:

```text
present head  = 2031-03-07
active event  = 2031-03-01 retrospective
```

Correct behavior:
- present head does not regress;
- event-local age/date calculations use the event date when appropriate;
- continuation of a source-backed multi-turn flashback can preserve the active retrospective context;
- returning to present restores the existing head;
- no unbounded temporal event ledger is introduced.

The minimal bounded persistence shape remains a schema-design question.

## 16. Age model impact

### 16.1 Existing compatibility age

Current prompt behavior uses:

```text
character_reference_age + koreanAgeOffset
```

This solves a historical world-year drift problem but has different semantics from birthday-aware age-at-date.

### 16.2 New exact age-at-date

Exact age must require an authoritative birth-date anchor:

```text
birthDate + active narrative/event date -> age
```

A birthday crossing is then a derived fact, not an independent mutation.

### 16.3 Source boundary

T1 does NOT authorize:
- arbitrary character-card scraping;
- arbitrary lore extraction;
- free-form model-prose birth-date discovery;
- guessing a missing month/day from current age.

The next schema/source contract must define how an authoritative birth date enters Time.

Possible source families to evaluate later:
- explicit user/configured structured temporal anchor;
- already-authorized character metadata surfaced by the host;
- explicit per-character Temporal configuration.

No choice is made in this impact map.

## 17. Reroll / candidate safety

The canonical rule remains:

```text
candidate proposal != committed temporal state
```

Required T1 behavior:

```text
committed 10:00
candidate A: +30m -> 10:30
A discarded
candidate B: +30m -> 10:30
```

Never `11:00`.

All new temporal fields must participate in the same exact-once commit boundary as current `narrativeTimestamp`.

## 18. Edit impact

Current edit/bootstrap paths already use Time-owned synchronization helpers.

T1 requires explicit classification for:

```text
REPRESENTATION_ONLY
SEMANTIC_TEMPORAL_CHANGE
AMBIGUOUS_TEMPORAL_CHANGE
```

A representation-only edit must preserve temporal state.

A semantic edit must rebuild the bounded temporal state exactly once through Time ownership.

An ambiguous edit must not manufacture exact temporal state.

## 19. Reload / migration impact

Current production already has `narrativeClockVersion` and migration logic.

Any new T1 persistent field requires:
- versioned state migration;
- state-reconcile normalization;
- reload equivalence proof;
- UNKNOWN/relative precision preservation;
- no stale diagnostic evidence promotion;
- no history-wide unbounded bootstrap.

## 20. Broadcast compatibility

T1 MUST preserve current B semantics:

```text
Mode B timestamp = broadcast airtime
!= arbitrary scene/event time
```

Required invariants:
- B_START -> B_CONTINUE -> B_END monotonicity unchanged;
- B_END terminal validation unchanged;
- post-B_END first-C floor handoff unchanged or strictly generalized without semantic regression;
- retrospective/event-local T1 state cannot corrupt Broadcast airtime;
- Broadcast airtime cannot silently become the universal present head.

## 21. Mode C / exposure impact

Temporal facts do not bypass Exposure/Knowledge authority.

```text
world/Time knows temporal relation
!=
Community is authorized to know it
```

T1 may expose a temporal relation to Mode C only through already-authorized current context.

No new epistemic inference is authorized here.

## 22. Existing permanent regression authority

The current executable `narrative-clock` suite loads the production bundle and directly requires:

```text
Time.narrativeTimestampSequence
Time.resolvePostBEndCurrentTimeFloor
Time.enforceNarrativeCurrentTimeFloor
Time.commitNarrativeTimestamp
Time.compareTimestamps
Lifecycle.derivePostBEndClockEligibility
```

It freezes 13 current-floor / tail-sequence / post-B_END cases.

T1 MUST extend this family instead of replacing it.

## 23. New regression families required before implementation can be accepted

At minimum:

1. exact `+N minutes` arithmetic;
2. exact `+N hours` crossing midnight;
3. exact `+N days` crossing month/year;
4. explicit date-only transition without invented clock;
5. relative-only vague transition without invented duration;
6. no temporal evidence leaves time unchanged;
7. many same-scene turns do not use turn count as time;
8. discarded candidate does not advance;
9. reroll does not double-advance;
10. representation-only edit preserves temporal state;
11. semantic temporal edit rebuilds exactly once;
12. reload preserves precision and current head;
13. flashback does not regress present head;
14. multi-turn source-backed retrospective context remains bounded;
15. return-to-present restores head;
16. birth-date + pre-birthday narrative date derives age correctly;
17. birthday crossing changes age exactly once;
18. leap-day policy is deterministic and documented;
19. current Broadcast narrative-clock regression suite remains green;
20. stale non-current probe cannot become current temporal authority.

## 24. T1 decomposition recommendation

Do not ship Temporal Awareness as one giant patch.

Recommended design order:

### T1-A — State/schema contract

Define the smallest compatibility-preserving representation for:
- exact-minute head;
- date-only head;
- relative/unknown precision;
- active retrospective context;
- bounded provenance/commit identity;
- optional authoritative birth-date anchors if included in first runtime slice.

### T1-B — Deterministic arithmetic contract

Define:
- relative duration grammar;
- precision preconditions;
- calendar month/year rules;
- age-at-date formula;
- conflict dispositions.

### T1-C — Transaction integration contract

Map new fields through:
- Lifecycle pending working set;
- Time assessment;
- Structure judge receipt;
- Output Finalize commit;
- Edit Reconcile rebuild;
- State Reconcile normalization;
- reload/migration.

### T1-D — Prompt projection contract

Specify exact relevance rules and prove no steady-state prompt expansion on temporally irrelevant turns.

### T1-E — Implementation / release

Only after explicit implementation authorization:

```text
implementation branch
-> deterministic/static/CI
-> release-simcore
-> real long-chat verification
-> main current-state/docs synchronization
```

## 25. Reuse / extend / new map

```text
parseTimestamp                     = REUSE
compareTimestamps                  = REUSE
elapsedMinutes                     = REUSE + EXTEND DOMAIN USE
resolveCalendarTransition          = EXTEND
narrativeProgressionHint           = EXTEND / NARROW ROLE
calendar target enforcement        = REUSE
single-year rollover repair        = REUSE
narrative current-time floor       = REUSE
narrativeTimestampSequence         = REUSE
commitNarrativeTimestamp           = REUSE / ADAPT TO T1 STATE
syncNarrativeTimestamp             = REUSE / ADAPT TO T1 STATE
applyWorldYear                     = REUSE AS COMPATIBILITY
koreanAgeOffset                    = PRESERVE AS COMPATIBILITY
birthday-aware age-at-date         = NEW DERIVED SEMANTIC
precision lattice                  = NEW SEMANTIC
DATE_ONLY head                     = NEW SEMANTIC
active retrospective context       = NEW SEMANTIC
bounded temporal provenance        = NEW IF REQUIRED BY SCHEMA
new global Temporal owner          = REJECT
new generic Derived-State engine   = REJECT FOR T1
```

## 26. Design constraints for the next transaction

The T1 state/schema design must satisfy all of these simultaneously:

1. no real-world/wall-clock semantics;
2. current production Time remains owner;
3. current exact timestamp behavior remains compatible;
4. no turn-count-as-time;
5. no invented precision;
6. reroll/edit/reload exact-once safety;
7. Broadcast airtime remains separate;
8. current prompt does not become a world-state dump;
9. birth-date age is source-backed only;
10. no arbitrary prose semantic parser;
11. no unbounded event ledger;
12. existing narrative-clock permanent fixture family remains authoritative.

## 27. Current classification

```text
program: SIMCORE_TEMPORAL_AWARENESS_T1
transaction: OWNERSHIP_SOURCE_IMPACT_SCOPE
status: DESIGN DISCOVERY
semantic owner: TIME
implementation authority: NONE
runtime change: NONE
release change: NONE
next transaction: T1_STATE_SCHEMA_TRANSITION_CONTRACT
```
