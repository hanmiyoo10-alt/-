# SimCore T2-B Precision-Aware Visible Frame / Candidate Disposition Contract

Date: 2026-09-07
Status: `T2-B DESIGN · NO RUNTIME IMPLEMENTATION AUTHORITY · NO RELEASE CHANGE`
Tracking: #1809
Parent T2 umbrella: #1799 / PR #1800
Parent Temporal program: #1763
T2-A transition contract: #1804 / PR #1806
T1-A state/schema: #1780 / PR #1781
T1-B deterministic arithmetic: #1783 / PR #1784
T1-C source/extraction/disposition: #1786 / PR #1787
T1-D prompt projection: #1790 / PR #1791
T1-E integration plan: #1794 / PR #1795

## 1. Purpose

T2-B freezes the visible one-header grammar and candidate-disposition contract required for weaker TemporalPosition states.

T2-A already established that the canonical present head may legitimately be:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

T2-B answers the next question:

```text
How can one visible response-frame temporal slot serialize every supported precision,
remain parser-stable,
preserve exact backward compatibility,
and reject incompatible model-authored candidates without splitting visible truth from canonical truth?
```

This is a design-only transaction.

No runtime, prompt, version, cache ABI, release branch or production mutation is authorized.

## 2. Fresh authority at T2-B start

```text
main                    = 675d6582270670adccafedef51b5ad4e3a1305a2
production version      = 0.70.10
release-simcore         = ecc55f026315c6482c34d267aba2adb97527cdbc
```

Observed production frame ownership:

```text
Structure
- RESPONSE_HEADER_RE
- VOLUME_HEADER_RE
- CHAPTER_HEADER_RE
- CHATINDEX_HEADER_RE
- TIMESTAMP_RE
- responseEnvelopeScope
- responseEnvelopeIntegrity
- validateStructure

Time
- BROADCAST_TIMESTAMP_RE
- NARRATIVE_TIMESTAMP_LINE_RE
- parseTimestamp
- canonicalizeTimestampSyntax
- compareTimestamps
- narrative timestamp sequence / repair helpers

Output Finalize
- consumes accepted prepared output
- applies committed state/content transition exactly once
```

Current production exact visible frame shape:

```text
# 응답
## 볼륨 ...
### 챕터 ...
#### Chatindex ... ∮
⏱️[2031-03-07 (Fri) 09:55 PM]
```

The existing exact timestamp slot is immediately after Chatindex with no non-whitespace gap.

T2-B preserves that structural position.

## 3. Core decision: one temporal slot, one marker family

The visible frame continues to contain exactly one canonical temporal header slot.

The marker remains:

```text
⏱️[...]
```

T2-B does not add:

```text
exact timestamp line
+ uncertainty line
```

It generalizes the payload inside the existing marker.

Conceptually:

```text
Chatindex
-> exactly one frame temporal header
-> response body / mode-specific material
```

The frame temporal header is not a second state store.

Time owns semantics.

Structure owns grammar/count/order judgment.

## 4. Exact backward compatibility is mandatory

EXACT_MINUTE keeps the existing visible syntax unchanged:

```text
⏱️[2031-03-07 (Fri) 09:55 PM]
```

No `EXACT` prefix is added.

No `precision=minute` suffix is added.

No version token is added.

Reason:

- exact T1 output remains valid without migration;
- existing frame fixtures remain meaningful;
- Broadcast/Narrative timestamp helpers do not need a parallel exact syntax;
- the exact path stays visually identical to production.

Therefore:

```text
EXACT_MINUTE serialization = legacy exact serialization
```

## 5. Canonical weak grammar

T2-B freezes these canonical visible forms.

### 5.1 DATE_ONLY

```text
⏱️[DATE 2031-03-08]
```

Semantics:

```text
2031-03-08 is authoritative
clock is unknown
```

Forbidden coercions:

```text
⏱️[2031-03-08 (Sat) 12:00 AM]
⏱️[2031-03-08 (Sat) 12:00 PM]
```

unless an independent authoritative source establishes that exact minute.

### 5.2 BOUNDED_RANGE with DATE endpoints

```text
⏱️[RANGE 2031-03-10..2031-03-12]
```

Rules:

- endpoints are full ISO dates;
- both endpoints use DATE granularity;
- range is closed and finite;
- lower must be less than or equal to upper;
- no midpoint or preferred endpoint is implied.

### 5.3 BOUNDED_RANGE with MINUTE endpoints

```text
⏱️[RANGE 2031-03-10 (Mon) 09:00 PM..2031-03-10 (Mon) 11:00 PM]
```

Rules:

- both endpoints are full exact-minute payloads;
- both endpoints repeat the complete date and clock;
- shorthand such as `09:00 PM..11:00 PM` is not canonical;
- mixed DATE/MINUTE endpoint ranges are not canonical T2-B syntax;
- lower must be less than or equal to upper.

Full endpoint repetition is intentional.

It removes hidden date inheritance from the parser contract.

### 5.4 RELATIVE_ORDER_ONLY

Allowed relation vocabulary is inherited from T1-A:

```text
AFTER
AT_OR_AFTER
BEFORE
SAME_AS
```

Absolute exact anchor examples:

```text
⏱️[AFTER 2031-03-07 (Fri) 09:55 PM]
⏱️[AT_OR_AFTER 2031-03-07 (Fri) 09:55 PM]
```

Absolute date anchor example:

```text
⏱️[BEFORE 2031-03-10]
```

Compact predecessor-basis example when T2-A retains no safe absolute anchor:

```text
⏱️[AFTER PREVIOUS_SCENE]
```

`PREVIOUS_SCENE` means:

```text
relation is relative to the predecessor committed TemporalPosition
identified internally by basisRevision
```

The visible header never exposes the numeric revision.

Forbidden:

```text
⏱️[AFTER revision=17]
⏱️[AFTER basisRevision:17]
⏱️[AFTER ⏱️[2031-03-07 (Fri) 09:55 PM]]
```

No nested temporal markers are allowed.

### 5.5 UNKNOWN

The canonical visible frame form is:

```text
⏱️[UNKNOWN]
```

This differs from prompt projection behavior.

Prompt may omit UNKNOWN when no temporal fact is relevant.

The visible response frame cannot omit its required temporal slot merely because time is unknown.

Therefore:

```text
prompt UNKNOWN -> often zero temporal projection lines
visible frame UNKNOWN -> one explicit safe header
```

This prevents frame grammar from forcing fabricated dates or clocks.

## 6. Formal payload family

Conceptual grammar:

```text
TEMPORAL_HEADER := "⏱️[" PAYLOAD "]"

PAYLOAD := EXACT
         | DATE
         | RANGE_DATE
         | RANGE_MINUTE
         | RELATIVE
         | UNKNOWN

EXACT := YYYY-MM-DD " (" WEEKDAY ") " H12 ":" MM " " AMPM

DATE := "DATE " YYYY-MM-DD

RANGE_DATE := "RANGE " YYYY-MM-DD ".." YYYY-MM-DD

RANGE_MINUTE := "RANGE " EXACT_PAYLOAD ".." EXACT_PAYLOAD

RELATIVE := RELATION " " ANCHOR

RELATION := "AFTER"
          | "AT_OR_AFTER"
          | "BEFORE"
          | "SAME_AS"

ANCHOR := YYYY-MM-DD
        | EXACT_PAYLOAD
        | "PREVIOUS_SCENE"

UNKNOWN := "UNKNOWN"
```

Canonical serializer emits uppercase reserved tokens exactly as shown.

Candidate parser may choose case sensitivity at implementation time, but canonical output must normalize to the frozen uppercase tokens.

## 7. Weekday decoration semantics

The exact production grammar historically accepts a non-empty weekday decoration inside parentheses.

T2-B preserves exact-path compatibility.

Semantic compatibility is determined from the date and minute, not from the weekday text alone.

However a weekday that contradicts the date is representation-only wrong and has one deterministic correction when the canonical formatter is available.

The existing Time formatter already has a deterministic English weekday table:

```text
Sun Mon Tue Wed Thu Fri Sat
```

Therefore T2-B classifies a wrong weekday decoration as eligible for `REPAIR_UNIQUE` when all semantic date/time fields are otherwise valid.

This does not authorize changing a date or time merely to match the supplied weekday.

Repair direction is always:

```text
valid semantic date -> computed weekday decoration
```

never:

```text
weekday decoration -> invented semantic date
```

## 8. Structure frame contract

Structure remains a judge, not a temporal semantic owner.

T2-B conceptually replaces the exact-only frame slot predicate with:

```text
TEMPORAL_HEADER_RE
```

covering the complete payload union.

Structure responsibilities:

- locate the response envelope;
- require exactly one response header;
- require exactly one volume header;
- require exactly one chapter header;
- require exactly one Chatindex header;
- require one canonical temporal header in the frame temporal slot;
- require frame order;
- require no non-whitespace gap between Chatindex and the frame temporal header;
- reject malformed temporal-header syntax;
- hand the parsed candidate payload to Time for semantic assessment.

Structure must not decide:

- whether an exact candidate lies inside a range;
- whether a relative candidate advances safely;
- whether a model-authored exact narrowing is compatible;
- whether precision weakening is authorized;
- whether a candidate should mutate canonical Time state.

## 9. Exactly one frame temporal header does not mean one timestamp token in the entire output

Mode B and narrative bodies may legitimately contain additional exact scene/broadcast timestamps after the common frame header.

Therefore T2-B count semantics are scoped to the frame slot.

The canonical frame temporal header is:

```text
the first non-whitespace frame item immediately following Chatindex
```

Additional later `⏱️[...]` lines belong to their existing mode/narrative consumers and are not automatically duplicate common headers.

This preserves current Mode B multi-timestamp behavior.

T2-D must verify the exact production scope parser before implementation.

## 10. Marker recognition versus validity recognition

The implementation must distinguish:

```text
marker present
from
header valid
```

Conceptual marker predicate:

```text
line begins with optional horizontal whitespace + ⏱️[
```

Conceptual validity predicate:

```text
entire frame temporal line matches exactly one canonical payload family
```

This preserves the useful existing diagnostic distinction:

```text
missing temporal header
vs
malformed temporal header
```

## 11. Time owns semantic parsing

Structure may identify the payload family syntactically.

Time must convert it to a candidate TemporalPosition-like semantic object.

Examples:

```text
⏱️[DATE 2031-03-08]
-> DATE_ONLY
```

```text
⏱️[RANGE 2031-03-10..2031-03-12]
-> BOUNDED_RANGE / DATE
```

```text
⏱️[AFTER PREVIOUS_SCENE]
-> RELATIVE_ORDER_ONLY / AFTER / anchor=null / basis=predecessor
```

```text
⏱️[UNKNOWN]
-> UNKNOWN
```

No free-form body scan is used to repair or reinterpret the canonical temporal header.

## 12. Candidate assessment uses two axes

T2-B freezes a two-axis result to avoid mixing semantic verdict and commit effect.

### 12.1 Assessment family

```text
ACCEPT_EQUIVALENT
ACCEPT_COMPATIBLE_NARROWING
ACCEPT_AUTHORIZED_WEAKENING
ACCEPT_COMPATIBLE_ADVANCE
REPAIR_UNIQUE
REJECT_MALFORMED_HEADER
REJECT_IRREPARABLE_CONFLICT
DROP_STALE_REVISION
```

### 12.2 Commit effect family

```text
NO_TEMPORAL_MUTATION
COMMIT_CANDIDATE
COMMIT_REPAIRED
NO_COMMIT
```

Representative pairings:

```text
ACCEPT_EQUIVALENT          + NO_TEMPORAL_MUTATION
ACCEPT_COMPATIBLE_NARROWING+ COMMIT_CANDIDATE
ACCEPT_AUTHORIZED_WEAKENING+ COMMIT_CANDIDATE
ACCEPT_COMPATIBLE_ADVANCE  + COMMIT_CANDIDATE
REPAIR_UNIQUE              + COMMIT_REPAIRED
REJECT_*                   + NO_COMMIT
DROP_STALE_REVISION        + NO_COMMIT
```

Exact runtime enum names may differ only if semantic mapping remains one-to-one.

## 13. ACCEPT_EQUIVALENT

Use when the candidate header represents the same canonical temporal truth as the effective generation constraint and no temporal revision is needed.

Examples:

```text
canonical = DATE 2031-03-08
candidate = DATE 2031-03-08
```

```text
canonical = RANGE 2031-03-10..2031-03-12
candidate = same range
```

```text
canonical = UNKNOWN
candidate = UNKNOWN
```

Result:

```text
assessment = ACCEPT_EQUIVALENT
commitEffect = NO_TEMPORAL_MUTATION
```

Representation-only normalization may still occur separately.

## 14. Compatible model-authored exact narrowing

T2 preserves creative narrowing.

### DATE_ONLY to exact

```text
constraint = DATE 2031-03-08
candidate = 2031-03-08 (Sat) 09:30 AM
```

If T1-C permits `OUTPUT_CANONICAL` authority on the turn:

```text
ACCEPT_COMPATIBLE_NARROWING
```

### DATE range to exact

```text
constraint = RANGE 2031-03-10..2031-03-12
candidate = 2031-03-11 (Tue) 06:00 PM
```

Accepted only when the exact point lies inside the closed date envelope.

### MINUTE range to exact

```text
constraint = RANGE 21:00..23:00 on the same full date
candidate = 22:15 exact
```

Accepted only when the exact minute lies inside the closed minute envelope.

### Relative absolute anchor to exact

```text
constraint = AFTER 2031-03-07 21:55
candidate = 2031-03-07 23:10
```

Accepted only when Time can prove the relation.

Important provenance rule:

```text
accepted exact point = model-authored compatible narrowing
not = SimCore-derived exact result
```

## 15. PREVIOUS_SCENE narrowing boundary

A null-anchor relation such as:

```text
⏱️[AFTER PREVIOUS_SCENE]
```

may have insufficient absolute information to prove a later exact candidate.

T2-B must not treat an exact clock as compatible merely because it looks later in isolation.

Acceptance requires Time to prove the relation from the predecessor state identified by basisRevision.

If proof is not available:

```text
NO GUESS
NO INFERRED DURATION
NO ARBITRARY ABSOLUTE NARROWING
```

The candidate remains weak or is rejected according to source/constraint semantics.

## 16. Authorized precision weakening

Precision weakening is not automatically valid.

A candidate may be less precise than the previous committed head only when the current effective generation semantics authorize that weaker position.

Example already authorized before generation:

```text
committed = exact 2031-03-07 21:55
user current control = next day
Time request proposal = DATE 2031-03-08
candidate = DATE 2031-03-08
```

This is equivalent to the request-scoped effective constraint, not arbitrary model precision loss.

A model must not erase a required exact target merely by emitting:

```text
DATE same day
```

when that date does not prove advancement beyond the exact target.

## 17. Compatible weak advancement

A weaker candidate can still prove forward movement.

Example:

```text
current exact = 2031-03-07 21:55
candidate = DATE 2031-03-08
```

The later date proves advancement even though clock precision is weaker.

Possible result when output authority is eligible:

```text
ACCEPT_COMPATIBLE_ADVANCE
```

Counterexample:

```text
current exact = 2031-03-07 21:55
candidate = DATE 2031-03-07
```

Same-date DATE_ONLY does not prove whether the candidate is before or after 21:55.

It is not a safe forward transition merely because it is weaker.

## 18. Range compatibility rules

T2-B requires Time to prove:

```text
exact point inside date range
exact point outside date range
exact point inside minute range
exact point outside minute range
date range equal to canonical date range
minute range equal to canonical minute range
range subset when source policy permits narrowing
range overlap without subset
range disjoint
DATE_ONLY inside date range
DATE_ONLY versus minute range where exact relation is unresolved
```

Partial overlap is not automatically a new canonical truth.

Intersection computation does not itself grant authority to commit the intersection.

## 19. UNKNOWN candidate rules

UNKNOWN means no authoritative current position or safe relation.

Candidate behavior depends on source authority:

```text
canonical UNKNOWN + candidate UNKNOWN
-> ACCEPT_EQUIVALENT / NO_TEMPORAL_MUTATION
```

```text
canonical UNKNOWN + exact/date/range/relative candidate
-> may establish temporal truth only if T1-C OUTPUT_CANONICAL authority is eligible
```

A parser failure is never converted into UNKNOWN.

Malformed syntax is malformed syntax.

## 20. Unique deterministic repair boundary

`REPAIR_UNIQUE` is allowed only when exactly one semantics-preserving correction exists.

Eligible classes include:

- wrong weekday decoration for an otherwise valid exact date/time;
- known 12-hour zero-hour syntax repair already supported by production canonicalization;
- canonical token case normalization if the implementation accepts case-insensitive candidates;
- one lexical separator normalization where both endpoints parse to the same already-proven range;
- a representation alias that maps to exactly one existing canonical TemporalPosition without choosing a new time.

Not eligible:

- choosing one exact point inside a range;
- choosing midnight for DATE_ONLY;
- choosing one duration for `AFTER PREVIOUS_SCENE`;
- choosing one endpoint from a range;
- changing an outside-range exact candidate to an arbitrary inside-range exact candidate;
- scanning body prose for a replacement time.

## 21. Missing or competing temporal headers are not representation-only repair

T2-B does not authorize silently inventing model intent when the common frame temporal slot is absent or structurally ambiguous.

Therefore:

```text
missing frame temporal header
multiple competing frame temporal candidates
truncated marker
nested marker
mixed range granularity
unparseable relation anchor
```

are not automatically repaired from body prose.

A later implementation may reuse existing bounded envelope compatibility machinery only if it proves one semantics-preserving result.

Otherwise the candidate is rejected.

## 22. Irreparable conflict

Example:

```text
canonical constraint = RANGE 2031-03-10..2031-03-12
candidate = 2031-03-14 (Fri) 09:00 AM
```

There are many valid exact choices inside the range.

T2-B forbids choosing one.

It also forbids pretending the visible exact header is acceptable while preserving the internal range.

Result:

```text
assessment = REJECT_IRREPARABLE_CONFLICT
commitEffect = NO_COMMIT
```

The whole candidate transaction fails closed.

## 23. Why replacing a conflicting exact header with the weak constraint is not generally authorized

It may appear deterministic to replace:

```text
outside-range exact
```

with:

```text
original range header
```

T2-B does not treat that as a universal safe repair.

Reason:

- the model made a semantic exact choice;
- body content may have been generated around that choice;
- T2 does not run a full-body semantic consistency parser;
- replacing only the header could create a different visible/body split truth.

Therefore incompatible semantic candidates require rejection unless the repair is representation-only or otherwise uniquely semantics-preserving.

## 24. Rejection transport contract

T2-B freezes the logical rejection seam but does not claim current host capability.

Conceptual flow:

```text
candidate output
-> Structure frame parse
-> Time semantic assessment
-> REJECT_MALFORMED_HEADER or REJECT_IRREPARABLE_CONFLICT
-> temporal rejection receipt
-> no Output Finalize temporal commit
-> publication/regeneration transport must fail closed
```

The rejection receipt must be bounded and contain no raw body.

Conceptual fields:

```text
kind = TEMPORAL_CANDIDATE_REJECTION
reason
expectedPrecision
observedPrecisionOrMalformed
baseRevision
repairable = false
```

The receipt is transport metadata, not persistent world-state history.

## 25. Regeneration posture

T2-B forbids infinite hidden retry.

A future transport may support at most one bounded automatic regeneration attempt for a rejected candidate only if the host can prove all of the following:

```text
first rejected candidate is not authoritative/published as accepted output
first rejected candidate does not mutate canonical Temporal state
regeneration is bound to the same user request/predecessor revision
rejection hint contains bounded structural semantics, not raw hidden reasoning
second invalid candidate does not loop again
```

If true suppression/regeneration cannot be proven, the runtime slice must remain blocked or abort publication explicitly.

T2-B does not authorize a fake "regeneration" that merely commits the invalid first candidate and tries to repair later.

## 26. Candidate rejection is a runtime activation blocker until transport is proven

This is a deliberate hard boundary.

T2 weak precision is unsafe if:

```text
internal canonical state = weak truth
visible output = incompatible exact truth
```

Therefore T2-D must map the rejection receipt to an actual production-capable transport seam before T2 runtime activation.

If no such seam exists, T2-D must redesign the release slice rather than weakening this invariant.

## 27. Stale revision behavior

Every candidate assessment is bound to the predecessor/effective temporal revision used to prepare generation.

If the current committed temporal revision no longer matches the candidate basis:

```text
assessment = DROP_STALE_REVISION
commitEffect = NO_COMMIT
```

No semantic rebase is attempted from stale output.

This mirrors the project-wide stale-work safety posture.

## 28. Reroll

Reroll always assesses the new candidate against the predecessor committed snapshot, not against the discarded candidate.

Example:

```text
predecessor = DATE 2031-03-08
candidate A = exact 2031-03-08 09:30, discarded
candidate B = exact 2031-03-08 11:00
```

Candidate B is assessed from DATE 2031-03-08.

Candidate A never becomes the basis.

## 29. Edit

Representation-only edit:

```text
weekday spelling / harmless formatting only
```

must not create a temporal semantic revision.

Semantic edit that changes the canonical temporal header must rebuild from the correct predecessor state through Time.

A manually edited outside-range exact header cannot become canonical merely because the message already exists in chat history.

## 30. Reload

Reload preserves the committed TemporalPosition.

The visible serialized header may be reparsed for representation/bootstrap purposes, but it must not revive stale legacy exact state against a weak canonical head.

Examples:

```text
DATE remains DATE
RANGE remains RANGE
AFTER PREVIOUS_SCENE remains relation-only with bounded basis semantics
UNKNOWN remains UNKNOWN
```

## 31. Mode boundary

T2-B owns the common frame temporal header grammar only.

It does not merge narrative TemporalPosition with Mode B airtime.

Existing broadcast timestamp lines retain their separate Time/Broadcast semantics.

T2-C will decide how Mode A/B/C consume and project weak temporal meaning.

## 32. Prompt boundary

The visible header grammar is not automatically the prompt grammar.

T1-D/T2-C prompt serialization remains semantic and minimal.

Forbidden shortcut:

```text
copy raw visible header into prompt because it already exists
```

Prompt receives a consumer-oriented temporal constraint, not parser metadata.

## 33. Performance contract

T2-B work must remain bounded to the current candidate.

Allowed:

```text
one frame-slot parse
one TemporalPosition candidate parse
constant-size compatibility checks
bounded deterministic date/range comparison
bounded rejection receipt
```

Forbidden:

```text
full-chat rescan
unbounded timestamp enumeration
interval graph
LLM semantic repair helper
network call
timer/polling loop
unbounded regeneration
raw body retention for temporal diagnostics
```

## 34. Proposed implementation ownership map for T2-D verification

T2-B freezes semantic responsibility, not file edits.

T2-D must fresh-read production and classify exact modifications as REUSE / EXTEND / NEW.

Expected ownership direction:

```text
Time
- temporal header semantic parser/serializer helpers
- precision-aware candidate compatibility
- unique temporal repair assessment

Structure
- precision-aware frame-slot syntax/count/order validation
- no semantic repair

Output Finalize
- consume accepted/repaired assessment
- exact-once state/content commit
- consume NO_COMMIT result without partial temporal commit

Session / host integration owner
- candidate rejection transport only if actual host seam proves it

Prompt
- no T2-B semantic ownership change
```

No new global Temporal module is justified.

## 35. Regression matrix required before runtime authorization

T2-D must eventually turn at least these into permanent fixtures.

### Exact compatibility

1. legacy exact header accepted unchanged;
2. exact header remains in same frame position;
3. existing 00-hour canonical repair remains deterministic;
4. correct exact weekday preserved;
5. wrong exact weekday can be uniquely repaired without date/time mutation.

### DATE_ONLY

6. canonical DATE header accepted;
7. DATE does not become midnight;
8. DATE exact same-day narrowing accepted when authorized;
9. DATE wrong-day exact rejected;
10. UNKNOWN clock remains explicit in semantics, not invented in frame.

### BOUNDED_RANGE

11. date range accepted;
12. minute range accepted with full repeated endpoints;
13. mixed endpoint granularity rejected;
14. lower > upper rejected;
15. exact inside date range accepted as model-authored narrowing;
16. exact outside date range rejected;
17. exact inside minute range accepted;
18. exact outside minute range rejected;
19. range midpoint never invented;
20. partial overlap does not auto-commit intersection.

### RELATIVE_ORDER_ONLY

21. AFTER exact anchor accepted;
22. AT_OR_AFTER exact anchor accepted;
23. BEFORE date anchor accepted syntactically then semantically judged;
24. PREVIOUS_SCENE form accepted only against valid predecessor basis;
25. nested temporal marker relation rejected;
26. relative exact narrowing accepted only when relation is provable;
27. null-anchor exact narrowing unresolved when proof is insufficient.

### UNKNOWN

28. UNKNOWN visible header satisfies frame without fabricated time;
29. malformed header never degrades known state to UNKNOWN;
30. UNKNOWN -> exact establishment requires eligible output authority.

### Candidate transaction

31. equivalent candidate yields NO_TEMPORAL_MUTATION;
32. compatible narrowing commits once;
33. compatible weak advance commits once;
34. irreparable conflict yields NO_COMMIT;
35. stale revision yields NO_COMMIT;
36. rejected candidate cannot mutate narrativeTimestamp mirror;
37. reroll discarded candidate does not become basis;
38. semantic edit rebuilds from predecessor;
39. reload preserves precision.

### Structure / mode compatibility

40. exactly one frame temporal slot remains mandatory;
41. additional later Mode B timestamps are not miscounted as duplicate frame headers;
42. frame order remains response -> volume -> chapter -> Chatindex -> temporal header;
43. no body/prose timestamp can rescue a malformed frame temporal header.

### Performance / boundedness

44. no full-history scan;
45. no unbounded relation chain;
46. one candidate assessment is constant-size;
47. rejection transport has a bounded retry ceiling;
48. no new network/storage/timer work solely for header parsing.

## 36. T2-B acceptance decisions

T2-B freezes all previously open child questions as follows.

### Visible syntax

Frozen by sections 4 and 5.

### UNKNOWN strategy

Use literal single-header form:

```text
⏱️[UNKNOWN]
```

### Human readability versus parser stability

Use short uppercase reserved tokens plus human-readable absolute values.

No JSON, no revision metadata, no provenance suffix.

### Candidate rejection/regeneration seam

Freeze a logical bounded rejection receipt and NO_COMMIT semantics.

Actual host suppression/regeneration capability remains a T2-D proof blocker.

### Malformed weak-header repair

Representation-only unique repair is allowed.

Semantic choice repair is not.

Missing/competing headers are not automatically rescued by body parsing.

## 37. Explicit non-goals

T2-B does not authorize:

- runtime implementation;
- release numbering;
- prompt wording changes;
- cache compiler version changes;
- retrospective multi-position headers;
- birth-date/age headers;
- wall-clock time;
- free-prose temporal extraction;
- generic interval algebra;
- universal body consistency parsing;
- hidden unlimited regeneration;
- a second temporal state owner;
- release-system restructuring.

## 38. Handoff to T2-C

T2-C receives a frozen visible temporal family but must independently freeze minimal prompt semantics.

T2-C must decide:

```text
EXACT prompt wording
DATE prompt wording
RANGE prompt wording
RELATIVE prompt wording
UNKNOWN relevance/omission wording
Mode A relevance
Mode B airtime separation
post-B_END lower-bound projection
Mode C / COMMUNITY exposed relation vocabulary
cache ABI consequences of prompt grammar changes
```

T2-C must not copy internal frame parser tokens mechanically into the model prompt.

## 39. Handoff to T2-D

T2-D must prove implementation feasibility against then-current production.

Critical T2-D blocker:

```text
Can an irreparable temporal candidate be prevented from authoritative publication/commit,
and if regeneration is used, can it be bounded and bound to the same predecessor revision?
```

Until proven:

```text
T2 runtime authority = NONE
```

## 40. Current status

```text
T2-B = DESIGN CONTRACT FROZEN
tracking = #1809
implementation authority = NONE
runtime change = NONE
prompt change = NONE
release change = NONE
production impact = NONE
next child = T2-C Minimal Projection / Mode Integration
```
