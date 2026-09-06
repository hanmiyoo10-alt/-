# SimCore T2 Imprecise / Relative Temporal State Design

Date: 2026-09-07
Status: `T2 UMBRELLA DESIGN · NO RUNTIME IMPLEMENTATION AUTHORITY · NO RELEASE CHANGE`
Tracking: #1799
Parent Temporal program: #1763
T1 ownership/source map: #1775
T1-A state/schema: #1780
T1-B deterministic arithmetic: #1783
T1-C source/extraction/disposition: #1786
T1-D prompt projection: #1790
T1-E integration plan: #1794 / PR #1795
Umbrella deterministic-state architecture: #1768

## 1. Purpose

T2 defines the next major Temporal capability family after the T1 Exact Temporal Core.

T1 established the ownership, state, arithmetic, source-authority, commit, prompt, edit/reroll/reload and implementation-boundary contracts required for a trustworthy narrative clock.

T1-R1 deliberately restricts live precision to:

```text
UNKNOWN
EXACT_MINUTE
```

T2 activates the weaker temporal positions already modeled by T1 but deliberately deferred from the first runtime slice:

```text
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN preservation
```

T2 exists so SimCore can preserve truthful uncertainty such as:

```text
다음날
그날 밤
3~5일 후
며칠 뒤
한참 뒤
이전 사건 이후
```

without forcing the main model to invent an exact clock value merely to satisfy output framing.

## 2. Fresh authority at T2 start

```text
main                    = c06cb452f5b40d2ce3a61131daf43d5eb2cc9609
production version      = 0.70.10
release-simcore         = ecc55f026315c6482c34d267aba2adb97527cdbc
```

T2 design work is documentation/design authority only.

No runtime, release, production, prompt compiler or state-version mutation is authorized by this document.

## 3. T2 is an activation family, not a replacement architecture

T2 does not invent a new temporal state model.

It reuses the T1-A discriminated union:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

It reuses T1-B arithmetic semantics.

It reuses T1-C source authority and candidate-disposition rules.

It reuses T1-D minimal semantic projection.

It reuses T1-E production ownership and integration seams.

Therefore:

```text
T1 = temporal architecture foundation
T2 = weaker-precision activation family
```

No new global Temporal module is introduced.

Time remains the temporal semantic owner.

## 4. Core problem

The current production response frame requires exactly one canonical exact timestamp.

That contract is compatible with T1-R1 because every live committed temporal head is either UNKNOWN or EXACT_MINUTE.

It is not sufficient for T2.

Example:

```text
canonical head = 2031-03-07 21:55 exact
user = "한참 뒤"
```

Truthful T2 result:

```text
RELATIVE_ORDER_ONLY
relation = AFTER
anchor = 2031-03-07 21:55
```

If the next response is forced to emit an exact timestamp anyway, the model must invent a clock value such as 22:40 or 23:10.

That would erase the very uncertainty T2 is meant to preserve.

Therefore T2 requires a precision-aware visible temporal frame.

## 5. Central architecture decision: one precision-aware temporal header

T2 generalizes the visible temporal surface from:

```text
exact canonical timestamp only
```

to:

```text
one canonical temporal header
whose serialization reflects the active TemporalPosition precision
```

The response frame must still contain exactly one canonical temporal header.

It must not contain one exact timestamp plus a second uncertainty line.

The header serializer must support:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN-safe representation
```

Exact user-visible syntax is intentionally not frozen by this umbrella design.

That grammar belongs to T2-B.

T2-B must preserve exact T1 syntax compatibility for EXACT_MINUTE unless evidence proves a migration is necessary.

## 6. Precision semantics

### 6.1 EXACT_MINUTE

Inherited from T1.

T2 does not redefine it.

Example:

```text
2031-03-07 21:55
```

### 6.2 DATE_ONLY

Meaning:

```text
date is authoritative
clock is not known
```

Example:

```text
2031-03-08
```

Forbidden:

```text
2031-03-08 00:00
2031-03-08 12:00
```

unless some independent authoritative source proves that clock value.

### 6.3 BOUNDED_RANGE

Meaning:

```text
current narrative position lies inside a closed finite interval
```

Examples:

```text
2031-03-10 through 2031-03-12
21:00 through 23:00 on the same date
```

The range is not a probability distribution.

No midpoint, mean, most-likely value or preferred endpoint exists unless a separate rule establishes one.

### 6.4 RELATIVE_ORDER_ONLY

Meaning:

```text
ordering is authoritative
exact magnitude is not
```

Examples:

```text
AFTER previous committed scene
AT_OR_AFTER B_END terminal
BEFORE a known target
SAME_AS an explicit anchor
```

Repeated vague advances must not build an unbounded chain.

The state retains only the strongest safe compact anchor and basis revision allowed by T1-A.

### 6.5 UNKNOWN

UNKNOWN means SimCore has no authoritative current temporal position or safe relation.

UNKNOWN is not produced merely because a turn contains no time expression.

No-evidence turns preserve the previous committed temporal head.

## 7. Precision strength is not narrative advancement

T2 preserves the T1 distinction:

```text
position/order advancement != precision strength
```

A later event may be less precise than an earlier event.

Example:

```text
21:55 exact
-> "한참 뒤"
-> AFTER 21:55 with exact time unknown
```

This is valid forward narrative movement even though precision became weaker.

Conversely a later exact timestamp may strengthen precision again if it is compatible with the active constraint.

## 8. No-evidence rule

The following must never advance or weaken time on their own:

```text
number of turns
number of messages
response length
amount of dialogue
wall-clock elapsed time
model latency
user return delay
```

Example:

```text
head = 14:00 exact
10 dialogue turns with no temporal transition evidence
```

Result:

```text
head remains 14:00 exact
```

T2 does not infer that conversation duration equals story duration.

## 9. Authoritative precision weakening

A weaker current head may replace a stronger previous head only when the weaker statement itself is authoritative current-scene evidence.

Examples:

```text
21:55 exact
user current-control: "한참 뒤"
=> RELATIVE_ORDER_ONLY AFTER 21:55
```

```text
2031-03-07 21:55 exact
user current-control: "다음날"
=> DATE_ONLY 2031-03-08 if no clock is established
```

```text
2031-03-07 exact
user current-control: "3~5일 후"
=> BOUNDED_RANGE 2031-03-10..2031-03-12
```

Representation-only prose, quoted speech, plans, questions, hypotheticals and arbitrary narrative mentions remain governed by T1-C source authority.

## 10. Precision strengthening

A weaker temporal head may become stronger when a later authoritative source safely narrows it.

Examples:

```text
DATE_ONLY 2031-03-08
+ authoritative exact current control 09:30
=> EXACT_MINUTE 2031-03-08 09:30
```

```text
range 2031-03-10..2031-03-12
+ compatible model-authored canonical temporal header 2031-03-11 18:00
=> exact narrowing candidate
```

The second case is not SimCore arithmetic.

It is model-authored compatible narrowing under T1-C.

The provenance/disposition must preserve that distinction.

## 11. `narrativeTimestamp` compatibility mirror

The legacy `narrativeTimestamp` field is exact-minute only.

Therefore:

```text
TemporalPosition = EXACT_MINUTE
=> narrativeTimestamp mirrors exact value

TemporalPosition = DATE_ONLY / BOUNDED_RANGE / RELATIVE_ORDER_ONLY / UNKNOWN
=> narrativeTimestamp = null
```

T2 must never preserve an older exact narrativeTimestamp merely because it is convenient for compatibility.

Otherwise an old exact timestamp becomes a false present-time ghost after precision weakens.

## 12. Bounded range rules

T2 uses the T1-A range representation without redesign.

Invariants:

```text
lower <= upper
DATE range endpoints have no minute
MINUTE range endpoints have valid minute values
range is closed and finite
```

Open-ended semantics do not use BOUNDED_RANGE.

They use RELATIVE_ORDER_ONLY.

T2-B/T2-D must prove compatibility checks for:

```text
exact point inside range
exact point outside range
range intersect range
range disjoint from range
DATE_ONLY inside date range
DATE_ONLY incompatible with minute-only range where no safe relation exists
```

No arbitrary intersection may silently become a new canonical truth unless the source/commit contract authorizes that narrowing.

## 13. Relative-order compaction

RELATIVE_ORDER_ONLY must stay constant-size.

Example sequence:

```text
21:55 exact
-> 한참 뒤
-> 조금 더 뒤
-> 이후
```

Forbidden representation:

```text
AFTER event3
AFTER event2
AFTER event1
AFTER 21:55
```

Preferred compact semantic state:

```text
relation = AFTER
strongest safe absolute anchor = 21:55
current basisRevision = latest committed temporal revision
```

The exact compaction algorithm belongs to T2-A.

## 14. Arithmetic reuse

T2 does not introduce a second date/time calculator.

T1-B remains authoritative.

Representative behavior:

```text
DATE_ONLY + 3 days
=> DATE_ONLY
```

```text
DATE_ONLY + 2 hours
=> bounded date range when rollover is possible
```

```text
EXACT_MINUTE + 3~5 days
=> BOUNDED_RANGE
```

```text
RELATIVE_ORDER_ONLY + exact duration
=> must not fabricate an exact absolute point without a sufficient absolute basis
```

```text
UNKNOWN + duration
=> UNKNOWN or relation-only result only when source semantics independently prove ordering
```

The weaker input never gains unsupported precision merely because arithmetic is available.

## 15. Visible temporal header responsibilities

The canonical temporal header is a serialization surface, not a semantic owner.

Time owns the TemporalPosition.

Prompt may project the current constraint.

The model may produce one candidate temporal header.

Structure validates frame grammar and count.

Time assesses temporal compatibility.

Output Finalize commits only an accepted disposition.

The header must not become a second state store.

## 16. Candidate disposition model

T2 extends T1-C with precision-aware candidate handling.

At minimum T2-B must distinguish:

```text
PASS_SAME_PRECISION
PASS_COMPATIBLE_NARROWING
PASS_COMPATIBLE_WEAKENING
REPAIR_UNIQUE
CONFLICT_IRREPARABLE
MALFORMED_TEMPORAL_HEADER
STALE_REVISION_DROP
NO_TEMPORAL_MUTATION
```

Names may be refined in T2-B.

The semantics are mandatory even if implementation names differ.

## 17. Compatible model-authored exact narrowing

A model may choose an exact point inside an allowed weaker constraint.

Example:

```text
canonical constraint = 2031-03-10..2031-03-12
model canonical header = 2031-03-11 18:00
```

If no stronger authority contradicts it, the result may be accepted as model-authored exact narrowing.

SimCore must not report that 2031-03-11 18:00 was deterministically calculated.

The main model keeps creative authority over which compatible exact point it selects.

## 18. Irreparable conflict

Example:

```text
canonical range = 2031-03-10..2031-03-12
model header = 2031-03-14 09:00
```

There are many possible valid replacements inside the range.

SimCore must not choose one arbitrarily.

If the visible header is authoritative output structure and there is no unique repair, the candidate must not commit as if it were consistent.

Exact reject/regeneration transport remains a T2-B/T2-D proof requirement.

## 19. Unique deterministic repair

Unique repair remains allowed only when exactly one canonical correction exists.

Example:

```text
authoritative DATE_ONLY = 2031-03-08
candidate header has same date but malformed weekday decoration
```

A deterministic representation repair may be allowed if it changes no semantic choice.

Example where repair is not unique:

```text
DATE_ONLY 2031-03-08
candidate exact time is incompatible or absent
```

SimCore may not invent 00:00, noon or any other time merely to produce an exact frame.

## 20. UNKNOWN-safe visible behavior

UNKNOWN must have a canonical safe visible behavior.

The frame must not require the model to hallucinate a date merely because Structure expects a temporal line.

T2-B must choose one stable grammar strategy such as:

```text
precision-aware unknown header
```

or another single-header form that preserves frame shape without fabricating time.

The umbrella design does not freeze exact spelling.

## 21. Prompt projection

T2 inherits the T1-D budget.

Normal dynamic Temporal projection remains:

```text
0 temporal lines when not relevant
or
1 compact temporal core line when relevant
```

T2 does not add one line per precision fact.

Examples of semantic intent:

```text
Temporal: 2031-03-08; exact clock unknown
```

```text
Temporal: current scene lies between 2031-03-10 and 2031-03-12
```

```text
Temporal: after 2031-03-07 21:55; exact current time unknown
```

Exact serializer wording belongs to T2-C.

Provenance, basisRevision, parser data and internal range representation are not prompt payload.

## 22. Mode A

Mode A is the primary T2 narrative consumer.

It may carry exact or weaker narrative time.

A normal A turn with no temporal transition evidence preserves the committed head exactly as-is.

T2 must not force a temporal phrase into every creative response.

## 23. Mode B

Broadcast airtime remains separate from narrative TemporalPosition.

Mode B must not treat broadcast timestamps as universal narrative head merely because both use clock-shaped data.

T2 does not weaken or merge that ownership boundary.

## 24. Post-B_END handoff

Existing B_END logic provides a lower-bound/floor relationship for eligible follow-up narrative time.

T2 allows a weak narrative state to satisfy that constraint without inventing equality.

Example:

```text
B_END = 23:00 exact
follow-up narrative state = AFTER 23:00 exact amount unknown
```

This is valid and must not be coerced to 23:00.

T2-C must freeze prompt wording and Mode C compatibility for this case.

## 25. Mode C / COMMUNITY

COMMUNITY consumes only exposed temporal relationships.

Possible exposed semantic projections include:

```text
reaction is after broadcast end
reaction occurs the next day
reaction occurs several days later
exact time unknown
```

Internal temporal provenance and hidden anchors must not leak merely because the COMMUNITY renderer needs ordering context.

## 26. Reroll

Reroll rebuilds from the predecessor committed temporal snapshot.

Example:

```text
predecessor = 2031-03-07 exact
candidate A = 3~5 days later -> range
reroll discards A
candidate B = next day -> DATE_ONLY 2031-03-08
```

Correct result:

```text
DATE_ONLY 2031-03-08
```

The discarded range must not constrain the rerolled branch.

## 27. Edit

Representation-only edits do not change temporal revision.

Semantic edits that change a current temporal control rebuild from the correct predecessor snapshot.

An edit from:

```text
3일 뒤
```

to:

```text
3~5일 뒤
```

must rebuild an exact/date target into a range rather than applying range semantics on top of the already-advanced result.

## 28. Reload

Reload must preserve the exact TemporalPosition precision and bounded provenance.

A DATE_ONLY head must not become midnight.

A BOUNDED_RANGE must not collapse to an endpoint.

A RELATIVE_ORDER_ONLY head must not revive an older exact `narrativeTimestamp` as current time.

## 29. Rollback / re-upgrade

T2 inherits T1-E rollback-residue protection.

If a pre-T1/T2 runtime ignores the nested temporal state and advances legacy exact fields, a later upgrade must not revive stale ignored weak temporal state as current authority.

Migration must always respect version lineage and then-current legacy authority according to the T1-E residue guard.

T2-D must add weaker-precision downgrade/re-upgrade fixtures.

## 30. State size and performance

T2 must remain constant-size per chat state.

Forbidden:

```text
unbounded temporal event ledger
full-chat rescans
all-turn relative chain
LLM-based temporal extraction helper
network request
wall-clock polling
timer-driven progression
new hot-path storage read solely for T2
```

Preferred work:

```text
bounded current-message parse
small TemporalPosition arithmetic
constant-size compatibility checks
one reused temporal assessment per candidate
```

## 31. T2 design decomposition

### T2-A — Precision Activation / Transition Contract

Must freeze:

- live activation rules for DATE_ONLY;
- live activation rules for BOUNDED_RANGE;
- live activation rules for RELATIVE_ORDER_ONLY;
- no-evidence preservation;
- exact -> weaker transitions;
- weaker -> exact transitions;
- weaker -> weaker transitions;
- relative-anchor compaction;
- semantic temporal revision behavior;
- `narrativeTimestamp` mirror/null rules;
- UNKNOWN transition boundaries.

### T2-B — Precision-Aware Visible Frame / Candidate Disposition

Must freeze:

- one-header grammar;
- exact backward compatibility;
- date-only serialization;
- bounded-range serialization;
- relative-order serialization;
- UNKNOWN-safe serialization;
- Structure regex/count contract;
- Time candidate assessment;
- compatible exact narrowing;
- unique repair;
- irreparable conflict handling;
- candidate rejection/regeneration transport proof.

### T2-C — Minimal Projection / Mode Integration

Must freeze:

- one-line maximum dynamic Temporal projection;
- exact/date/range/relative prompt wording;
- zero-line irrelevance behavior;
- Mode A relevance;
- Mode B airtime separation;
- B_END lower-bound interaction;
- Mode C / COMMUNITY exposed relation projection;
- cache ABI impact from prompt grammar changes.

### T2-D — Integration / Migration / Regression / Performance Plan

Must freeze:

- exact production functions/modules to modify;
- state/schema/version impact after then-current T1 implementation;
- prompt compiler/cache ABI update if required;
- test suites and fixtures;
- edit/reroll/reload migration coverage;
- rollback/re-upgrade coverage;
- real long-chat acceptance matrix;
- performance ceilings;
- release slicing and rollback triggers.

## 32. Runtime slicing posture

T2 runtime implementation must not precede a live-proven T1 Exact Temporal Core.

Recommended later activation sequence:

```text
T2-R1 = BOUNDED IMPRECISION
        DATE_ONLY
        BOUNDED_RANGE

T2-R2 = OPEN-ENDED RELATIVE
        RELATIVE_ORDER_ONLY
```

Reason:

- DATE_ONLY and BOUNDED_RANGE have finite compatibility domains;
- finite domains are easier to validate and diagnose;
- RELATIVE_ORDER_ONLY introduces open-ended compatibility and stronger interaction with B_END floors and model-authored narrowing;
- splitting by proof boundary reduces the chance that one ambiguous transport problem blocks all weaker precision support.

UNKNOWN preservation is cross-cutting safety behavior rather than a standalone release slice.

Future version numbers are not frozen by this umbrella design.

## 33. Permanent regression families

T2 should eventually prove at least:

1. exact -> DATE_ONLY without midnight invention;
2. exact -> bounded date range;
3. exact -> bounded minute range;
4. exact -> relative AFTER with absolute anchor retained;
5. no temporal evidence preserves exact head;
6. no temporal evidence preserves weak head;
7. DATE_ONLY + day arithmetic stays date-only;
8. DATE_ONLY + hour arithmetic widens safely when needed;
9. exact point inside range accepted as model-authored narrowing;
10. exact point outside range rejected/fail-closed when not uniquely repairable;
11. range does not collapse to midpoint;
12. repeated relative advancement remains constant-size;
13. narrativeTimestamp null for every weak canonical head;
14. exact strengthening restores narrativeTimestamp mirror;
15. reroll discards weak candidate state;
16. semantic edit rebuilds from predecessor snapshot;
17. representation edit leaves temporal revision unchanged;
18. reload preserves precision exactly;
19. downgrade/re-upgrade residue guard preserves current authority;
20. B_END lower bound can coexist with AFTER relation without fake equality;
21. Mode B airtime remains distinct;
22. COMMUNITY receives only exposed relation semantics;
23. prompt dynamic temporal budget remains <= 1 core line;
24. UNKNOWN never acquires fabricated date/time;
25. no full-history scan or unbounded state growth.

## 34. T2 does not own retrospective time

Flashbacks, memories and simultaneous present-head/event-local positions require multiple narrative positions at once.

That is a different capability family.

T2 handles one present temporal head with weaker precision.

Retrospective context remains reserved for a later Temporal family, conceptually T3.

## 35. T2 does not own derived age

Birth date plus active narrative date can produce deterministic full-years age.

That is a derived Temporal fact, not weak temporal precision itself.

Structured birthDate authority, birthday-boundary conventions and age prompt relevance remain reserved for a later Temporal family, conceptually T4.

## 36. Non-goals

T2 must not become:

- a natural-language temporal understanding model;
- a generic interval algebra engine;
- a scheduler;
- a real-world clock bridge;
- a full event-history database;
- an emotional/semantic inference system;
- an excuse to dump more state into the prompt;
- a replacement for the current Time owner;
- a release/deployment-system restructuring transaction.

## 37. Open questions for child designs

### T2-A

- exact compaction rule for repeated AFTER relations;
- whether DATE_ONLY -> RELATIVE_ORDER_ONLY should retain date anchor when safe;
- how SAME_AS behaves when anchor precision is weaker;
- what explicit source may intentionally reset a weak head to UNKNOWN, if any.

### T2-B

- exact canonical visible syntax for each precision;
- whether UNKNOWN uses a literal header token or another single-header form;
- how much syntax must remain human-readable versus parser-stable;
- exact candidate rejection/regeneration seam;
- whether malformed weak header is representation-repairable without semantic choice.

### T2-C

- exact prompt wording under each precision;
- cache-key/ABI consequences of weak temporal serialization;
- exposed temporal relation vocabulary for COMMUNITY.

### T2-D

- release numbers after T1 production reality is known;
- schema/version deltas relative to the then-current T1 implementation;
- performance budget thresholds from real baseline telemetry;
- rollout ordering between bounded ranges and open-ended relations.

## 38. Acceptance for umbrella design

T2 umbrella design is complete when all of the following are true:

```text
T2 owns weaker-precision activation, not a new clock architecture
T1 exact semantics remain inherited
DATE_ONLY / BOUNDED_RANGE / RELATIVE_ORDER_ONLY boundaries are explicit
no-evidence behavior is explicit
precision weakening/strengthening is explicit
legacy narrativeTimestamp mirror semantics are explicit
precision-aware one-header requirement is explicit
model-authored compatible narrowing is preserved
irreparable conflict cannot silently split visible/internal truth
prompt minimality remains bounded
Mode B airtime remains separate
T3 retrospective and T4 derived-age boundaries are explicit
runtime slicing posture is explicit
implementation authority remains NONE
```

## 39. Current status

```text
T2 = UMBRELLA DESIGN CAPTURED
T2-A = NOT STARTED
T2-B = NOT STARTED
T2-C = NOT STARTED
T2-D = NOT STARTED
T2-R1 = NOT AUTHORIZED
T2-R2 = NOT AUTHORIZED
runtime change = NONE
release change = NONE
production impact = NONE
```

T2 design may continue while T1 runtime remains unimplemented.

T2 runtime implementation must wait for the T1 Exact Temporal Core to exist and be live-proven, because T2 is an activation extension on top of that foundation rather than a parallel clock implementation.
