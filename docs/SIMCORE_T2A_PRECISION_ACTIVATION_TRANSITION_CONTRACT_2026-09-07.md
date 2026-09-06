# SimCore T2-A Precision Activation / Transition Contract

Date: 2026-09-07
Status: `T2-A DESIGN · NO RUNTIME IMPLEMENTATION AUTHORITY · NO RELEASE CHANGE`
Tracking: #1804
Parent T2 umbrella: #1799 / PR #1800
Parent Temporal program: #1763
T1-A state/schema: #1780 / PR #1781
T1-B deterministic arithmetic: #1783 / PR #1784
T1-C source/extraction/disposition: #1786 / PR #1787
T1-D prompt projection: #1790 / PR #1791
T1-E integration plan: #1794 / PR #1795

## 1. Purpose

T2-A activates the weaker TemporalPosition classes already defined by T1-A and promoted by the T2 umbrella.

The live semantic family covered here is:

```text
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN preservation
```

`EXACT_MINUTE` remains inherited from T1 and is used as a transition endpoint and anchor, not redefined by T2-A.

T2-A freezes:

- activation rules for DATE_ONLY;
- activation rules for BOUNDED_RANGE;
- activation rules for RELATIVE_ORDER_ONLY;
- no-evidence identity behavior;
- exact -> weaker transitions;
- weaker -> exact transitions;
- weaker -> weaker transitions;
- relative-anchor retention and compaction;
- SAME_AS behavior;
- temporal semantic revision behavior;
- `narrativeTimestamp` mirror/null behavior;
- UNKNOWN entry/reset boundaries;
- fail-closed boundaries when source semantics are not sufficient.

T2-A does not define the visible header grammar or candidate regeneration transport. Those remain T2-B.

## 2. Fresh authority at T2-A start

```text
main                    = 4b3d7eb48506f4cd57de50261bb5bbb211e57198
production version      = 0.70.10
release-simcore         = ecc55f026315c6482c34d267aba2adb97527cdbc
```

Production remains unchanged by this design.

## 3. Governing invariant

Weak precision is a valid canonical truth.

It is not an error state and not a temporary parser fallback.

Examples:

```text
2031-03-08 with clock unknown
2031-03-10..2031-03-12
sometime after the previous committed point
```

Each can be the correct present narrative head.

Therefore:

```text
less precision != less authority
```

A later scene may be more weakly specified than an earlier scene while still being the authoritative current narrative position.

## 4. Ownership

Ownership remains inherited from T1:

```text
Time            = temporal semantics / normalization / transition / arithmetic
State Reconcile = state composition / migration mechanics
Lifecycle       = bounded request preparation
Prompt          = serialization only
Structure       = judge only
Session         = orchestration only
Output Finalize = exact-once accepted mutation
Edit Reconcile  = predecessor rebuild coordination
```

T2-A introduces no new semantic owner.

## 5. State representation is inherited

T2-A does not redesign T1-A `TemporalPosition`.

Allowed precisions remain:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

The nested state remains conceptually:

```js
temporal: {
  schemaVersion,
  revision,
  head,
  headSource,
  context
}
```

T2-A continues to operate only on the present `head`.

`context` remains T3 territory.

## 6. Transition vocabulary

For design reasoning T2-A uses the following semantic operations:

```text
PRESERVE
SET_ABSOLUTE
SHIFT_EXACT
SHIFT_RANGE
ADVANCE_VAGUE
STRENGTHEN
WEAKEN
COPY_SAME_AS
RESET_TO_UNKNOWN
REJECT_NO_MUTATION
```

These are design terms, not required runtime enum names.

## 7. No-evidence identity rule

No temporal evidence is an identity transition.

```text
head'     = head
revision' = revision
source'   = source
```

The following never advance or weaken time by themselves:

```text
turn count
message count
response length
dialogue length
wall-clock elapsed time
model latency
user absence
reload duration
```

Examples:

```text
EXACT 14:00
+ 10 dialogue turns with no temporal transition
=> EXACT 14:00
```

```text
DATE_ONLY 2031-03-08
+ 20 turns with no temporal transition
=> DATE_ONLY 2031-03-08
```

```text
AFTER 2031-03-08 with clock unknown
+ no temporal evidence
=> identical relation state
```

No-evidence never means UNKNOWN.

## 8. Source authority is inherited from T1-C

T2-A only consumes source classes already authorized by T1-C.

Strong current-lane families include conceptually:

```text
USER_CURRENT_ABSOLUTE
USER_CURRENT_RELATIVE_EXACT
USER_CURRENT_RELATIVE_RANGE
USER_CURRENT_RELATIVE_VAGUE
OUTPUT_CANONICAL_TEMPORAL_SURFACE
B_END_TERMINAL_FLOOR
MIGRATION_EXISTING_CANONICAL
EDIT_REBUILD_SOURCE
CONFIG_TEMPORAL_ANCHOR
```

T2-A does not promote arbitrary prose to authority.

Question, plan, quotation, hypothesis, negation, old-event mention and unsupported multi-transition remain no-mutation sources.

## 9. DATE_ONLY activation

DATE_ONLY becomes canonical when an authoritative current-scene source establishes a calendar date but does not establish a clock.

Representative sources:

```text
"2031-03-08, 장면을 이어간다"
"다음날"
"이튿날"
"다음날 아침" where daypart has no separately authorized clock policy
```

Examples:

```text
EXACT 2031-03-07 21:55
+ current-control "다음날"
=> DATE_ONLY 2031-03-08
```

```text
UNKNOWN
+ current-control "2031-03-08, 본편 계속"
=> DATE_ONLY 2031-03-08
```

Forbidden coercions:

```text
DATE_ONLY 2031-03-08
!= 2031-03-08 00:00
!= 2031-03-08 12:00
```

## 10. DATE_ONLY exact arithmetic

When T1-B proves that the output still has date-only precision, T2-A may commit DATE_ONLY directly.

Examples:

```text
DATE_ONLY 2031-03-08
+ 3 calendar days
=> DATE_ONLY 2031-03-11
```

```text
DATE_ONLY 2031-03-08
+ 1 calendar week
=> DATE_ONLY 2031-03-15
```

Month/year shifts continue to use T1-B strict component-preserving calendar rules.

Invalid calendar targets do not clamp and do not reset state.

## 11. BOUNDED_RANGE activation

BOUNDED_RANGE becomes canonical when authoritative evidence proves a finite closed set of possible current positions and no single point is authoritative.

Representative sources:

```text
3~5일 뒤
2~4시간 후
arithmetic from a weaker base that yields a finite interval
```

Example:

```text
EXACT 2031-03-07 21:55
+ current-control "3~5일 뒤"
=> BOUNDED_RANGE 2031-03-10 21:55 .. 2031-03-12 21:55
```

If the source semantics are calendar-date-only rather than same-clock elapsed time, the range granularity must remain DATE according to T1-B.

T2-A does not invent a midpoint.

## 12. DATE_ONLY plus sub-day duration

A DATE_ONLY base denotes an unknown point within the authoritative date.

Adding a sub-day duration may widen into a minute-granularity finite range.

Example:

```text
DATE_ONLY 2031-03-08
+ 2 hours
```

Possible result set spans:

```text
2031-03-08 02:00
through
2031-03-09 01:59
```

Therefore the result may be a `BOUNDED_RANGE` when T1-B proves those finite bounds.

T2-A must not choose a clock merely to keep DATE_ONLY or EXACT_MINUTE.

## 13. Range shifting

When a BOUNDED_RANGE is shifted by a deterministic duration, T1-B computes the transformed bounds.

If both transformed endpoints remain valid and ordered:

```text
range -> shifted range
```

No range history is retained.

The new range replaces the old present head after accepted commit.

## 14. Range plus range-duration

A bounded duration applied to a bounded base may produce another bounded range using T1-B set-preserving arithmetic.

The transition must preserve the complete safe possibility set rather than select a preferred pair of endpoints.

If the resulting set cannot be represented by the existing T1-A finite range without semantic loss, T2-A must not invent a simplified answer.

Such a case is `AMBIGUOUS/UNREPRESENTABLE -> no canonical mutation` until a narrower contract exists.

T2-A does not introduce general interval algebra.

## 15. RELATIVE_ORDER_ONLY activation

RELATIVE_ORDER_ONLY becomes canonical when current-scene ordering is authoritative but magnitude is not.

Representative sources:

```text
한참 뒤
조금 뒤
이후
그보다 나중
```

when T1-C proves the phrase is a current-scene transition rather than dialogue, plan or event reference.

Example:

```text
EXACT 2031-03-07 21:55
+ current-control "한참 뒤"
=> RELATIVE_ORDER_ONLY AFTER [EXACT 2031-03-07 21:55]
```

The new head is later even though its exact date/time is unknown.

## 16. DATE_ONLY -> RELATIVE_ORDER_ONLY anchor policy

T2-A resolves an umbrella open question:

```text
DATE_ONLY predecessor may be retained as a weak absolute anchor
```

Example:

```text
DATE_ONLY 2031-03-08
+ "한참 뒤"
=> RELATIVE_ORDER_ONLY
   relation = AFTER
   anchor = DATE_ONLY 2031-03-08
```

The anchor means "after the prior temporal position whose date was 2031-03-08".

It does not mean:

```text
after 2031-03-08 00:00
after the end of 2031-03-08
```

The anchor retains its own precision.

This distinction must be respected later by T2-B compatibility checks.

## 17. BOUNDED_RANGE -> RELATIVE_ORDER_ONLY anchor policy

T1-A does not authorize nesting a full bounded range as the relative anchor.

T2-A therefore chooses the conservative rule:

```text
BOUNDED_RANGE + vague advance
=> RELATIVE_ORDER_ONLY with anchor = null
   basisRevision = predecessor temporal revision
```

No endpoint is promoted to represent the unknown predecessor point.

This intentionally sacrifices some absolute detail rather than manufacture a false boundary meaning.

If a future contract wants a safe absolute floor in this case, it must be separately designed and versioned.

## 18. UNKNOWN -> RELATIVE_ORDER_ONLY

UNKNOWN plus a vague phrase does not automatically produce a useful relation.

If the source independently establishes only that the new current scene is after the immediately preceding scene, T2-A may represent:

```text
RELATIVE_ORDER_ONLY
relation = AFTER
anchor = null
basisRevision = predecessor revision
```

This is allowed only when T1-C has positively classified a current-scene transition.

Parser uncertainty alone never creates the relation.

## 19. Relative compaction

Repeated vague advances must remain constant-size.

Example:

```text
R0 = EXACT 21:55
R1 = AFTER 21:55
R2 = "조금 더 뒤"
R3 = "그 이후"
```

T2-A compaction result at R3 remains conceptually:

```text
relation = AFTER
anchor = strongest still-safe retained anchor
basisRevision = revision of immediate committed predecessor
```

No chain is persisted.

## 20. Strongest safe anchor rule

For repeated `AFTER` advancement:

1. if the predecessor relative state already has a safe absolute anchor, retain it;
2. if predecessor is EXACT_MINUTE, adopt that exact anchor;
3. if predecessor is DATE_ONLY, adopt that DATE_ONLY anchor without clock coercion;
4. if predecessor is BOUNDED_RANGE, do not synthesize an anchor from an endpoint;
5. if predecessor is UNKNOWN, keep anchor null;
6. never replace a safe anchor with a weaker invented anchor merely to simplify serialization.

The retained anchor is a lower-information witness, not the complete predecessor state.

## 21. `basisRevision`

Every newly committed RELATIVE_ORDER_ONLY state derived from a predecessor records:

```text
basisRevision = predecessor temporal.revision
```

Repeated vague advances therefore update `basisRevision` even if `relation` and retained absolute anchor text remain unchanged.

This proves that narrative position advanced again without creating an event ledger.

## 22. Relative semantic advancement increments revision

A repeated vague advance is a semantic change even when the compact visible fields appear almost identical.

Example:

```text
rev 4: AFTER 21:55, basisRevision=3
user: "조금 더 뒤"
rev 5: AFTER 21:55, basisRevision=4
```

The current point is later than before.

Therefore `temporal.revision` increments once.

## 23. `AT_OR_AFTER`

`AT_OR_AFTER` is reserved for source semantics that permit equality.

It must not replace `AFTER` merely because exact magnitude is unknown.

Example:

```text
B_END terminal floor = 23:00
follow-up constraint = at or after terminal
=> AT_OR_AFTER 23:00
```

If a source explicitly proves later-than, use AFTER.

## 24. `BEFORE`

T2-A does not activate vague `BEFORE` as an ordinary forward present-head transition.

A backward present-lane move requires a separately authorized route such as:

```text
retrospective route
explicit edit rebuild
structured current reset/re-anchor
```

Without such authority:

```text
vague BEFORE current head
=> REJECT_NO_MUTATION / ambiguous-source handling
```

This preserves the no-unexplained-regression invariant.

T3 will own retrospective multi-position semantics.

## 25. SAME_AS policy

T2-A resolves another umbrella open question:

`SAME_AS` the immediately preceding present head is an identity operation whenever the predecessor position can be preserved directly.

Examples:

```text
EXACT 21:55 + "같은 시점에서 계속"
=> EXACT 21:55
revision unchanged
```

```text
DATE_ONLY 2031-03-08 + "같은 날 같은 시점"
=> DATE_ONLY 2031-03-08
revision unchanged
```

```text
BOUNDED_RANGE X + explicit SAME_AS predecessor
=> same BOUNDED_RANGE X
revision unchanged
```

T2-A does not convert a directly preservable state into RELATIVE_ORDER_ONLY merely to spell `SAME_AS`.

## 26. SAME_AS external anchor

If a separately authorized source says the current scene is SAME_AS an external temporal anchor, the copied precision must not exceed the anchor precision.

Examples:

```text
SAME_AS exact anchor
=> EXACT_MINUTE
```

```text
SAME_AS date-only anchor
=> DATE_ONLY
```

If the external anchor cannot be materialized safely, T2-A may retain a relation-only SAME_AS only if T1-A representation permits it without fabricated precision.

Otherwise the transition remains unresolved.

## 27. Exact -> weaker transitions

Allowed when authoritative current-scene evidence itself is weaker.

Representative matrix:

```text
EXACT + date-only absolute current set       -> DATE_ONLY
EXACT + named next-day with no clock         -> DATE_ONLY
EXACT + bounded relative duration            -> BOUNDED_RANGE
EXACT + vague AFTER current transition       -> RELATIVE_ORDER_ONLY
EXACT + no evidence                           -> EXACT
```

Precision weakening is not an error.

## 28. Weaker -> exact transitions

A weak head may strengthen to EXACT_MINUTE from:

```text
strong user current absolute exact source
strong structured/config exact source
compatible model-authored exact canonical narrowing accepted under T1-C/T2-B
```

Examples:

```text
DATE_ONLY 2031-03-08
+ authoritative current 09:30
=> EXACT 2031-03-08 09:30
```

```text
range 2031-03-10..12
+ model canonical exact 2031-03-11 18:00
=> exact narrowing candidate
```

The second case remains model-authored, not SimCore-derived.

## 29. Source-sensitive strengthening

Compatibility requirements depend on source authority.

A model-authored exact candidate must satisfy the existing weak constraint.

A strong explicit user current-set source may intentionally re-anchor the current scene and is not treated as model narrowing.

Therefore:

```text
model exact outside active range -> conflict
user explicit current exact outside active range -> new authoritative current-set proposal, subject to T1-C routing
```

T2-A does not silently downgrade user authority to candidate compatibility.

## 30. Weaker -> weaker transitions

Representative rules:

```text
DATE_ONLY + calendar-day shift       -> DATE_ONLY
DATE_ONLY + sub-day exact duration   -> BOUNDED_RANGE when finite bounds proven
DATE_ONLY + bounded duration         -> BOUNDED_RANGE when representable
DATE_ONLY + vague AFTER              -> RELATIVE_ORDER_ONLY with DATE_ONLY anchor
BOUNDED_RANGE + exact shift          -> shifted BOUNDED_RANGE
BOUNDED_RANGE + bounded shift        -> bounded result when representable
BOUNDED_RANGE + vague AFTER          -> RELATIVE_ORDER_ONLY anchor=null
RELATIVE_ORDER_ONLY + vague AFTER    -> compacted RELATIVE_ORDER_ONLY
RELATIVE_ORDER_ONLY + no evidence    -> identical RELATIVE_ORDER_ONLY
UNKNOWN + no evidence                -> UNKNOWN
```

## 31. Relative -> exact strengthening

A RELATIVE_ORDER_ONLY head may become exact only when a later source proves an exact point compatible with the active relation.

Examples:

```text
AFTER exact 21:55
+ model exact 22:30
=> potentially compatible exact narrowing
```

```text
AFTER DATE_ONLY 2031-03-08
+ model exact 2031-03-08 09:00
=> not automatically provably compatible
```

The second case cannot be proven merely from the date anchor because the unknown predecessor point on that date might be later than 09:00.

A point on a strictly later date may be provably compatible.

Exact compatibility logic belongs to T2-B, but T2-A freezes this semantic boundary.

## 32. Range narrowing by model

A model-authored exact point inside a bounded range may narrow to exact under T1-C/T2-B.

A model-authored weaker range does not automatically replace the canonical range merely because it intersects.

Intersection is not itself authority.

Any range narrowing requires an authorized source/disposition.

T2-A does not treat set intersection as a hidden state mutation rule.

## 33. Strong user absolute re-anchor

An explicit current-scene absolute user source is authoritative current truth when T1-C has positively routed it as `CURRENT_SET_OR_ADVANCE`.

It may:

```text
strengthen precision
weaken precision
move forward
explicitly re-anchor current scene
```

It must not be confused with an unmarked old-date mention or retrospective event reference.

T1-C remains responsible for that distinction.

T2-A therefore does not apply model-candidate compatibility rules to strong user current-set authority.

## 34. No implicit UNKNOWN reset

T2-A resolves the UNKNOWN-reset open question conservatively.

These do **not** reset a known head to UNKNOWN:

```text
parser failure
ambiguous temporal prose
absence of time language
invalid arithmetic target
malformed non-authoritative prose
model omission
reload
ordinary statement like "시간을 잘 모르겠다"
```

The last example may be epistemic rather than world-temporal truth and is unsafe as a generic canonical reset source.

## 35. Authorized UNKNOWN entry

A known head may become UNKNOWN only through an explicit structural authority that deliberately removes canonical temporal knowledge.

Initial authorized families are limited to:

```text
initial state with no canonical temporal anchor
migration where no valid legacy/current temporal authority exists
edit rebuild where the authoritative temporal source is removed and no predecessor/current anchor remains
structured/config temporal clear/reset if a future explicit host contract defines it
rollback-residue guard invalidation when stale nested temporal state is not authoritative
```

T2-A does not add a natural-language `USER_TEMPORAL_CLEAR` parser in the first design.

## 36. UNKNOWN does not erase history magically

UNKNOWN means the present canonical TemporalPosition is not safely known.

It does not authorize reviving an older exact `narrativeTimestamp` as current truth.

Once current head is UNKNOWN:

```text
narrativeTimestamp = null
```

An older exact value may remain only in bounded migration/debug evidence, not as active current state.

## 37. `narrativeTimestamp` mirror rule

The compatibility mirror remains exact-only:

```text
EXACT_MINUTE
=> narrativeTimestamp = canonical exact timestamp mirror
```

```text
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
=> narrativeTimestamp = null
```

This is mandatory on every accepted commit.

## 38. Mirror clearing is part of the same transaction

When an exact head weakens:

```text
head EXACT -> weak
```

`narrativeTimestamp` must be cleared in the same accepted-output commit that installs the weak head.

There must be no intermediate committed state where:

```text
head = weak
narrativeTimestamp = old exact present
```

Likewise exact strengthening restores the mirror in the same transaction.

## 39. Semantic revision rule

T1-A revision semantics remain authoritative:

```text
semantic head change -> +1 exactly once
no head change       -> unchanged
```

T2-A clarifies weak-state cases.

Revision increments once for:

```text
EXACT -> DATE_ONLY
EXACT -> BOUNDED_RANGE
EXACT -> RELATIVE_ORDER_ONLY
DATE_ONLY -> another date
DATE_ONLY -> BOUNDED_RANGE
range -> shifted range
range -> relative
relative -> later relative via basisRevision advance
weak -> exact strengthening
known -> authorized UNKNOWN reset
UNKNOWN -> known position
```

## 40. Revision does not increment for representation-only changes

No revision increment for:

```text
weekday decoration repair
header formatting repair
same semantic range serialized differently
SAME_AS immediate predecessor identity
no-evidence turn
proven representation-only edit
provenance-only diagnostic refresh with identical semantic head
```

## 41. Head-source behavior

`headSource` remains bounded provenance.

T2-A does not require source-only changes to increment semantic revision.

When a new source produces the exact same semantic head, implementations should prefer preserving stable provenance unless a bounded audit requirement needs source refresh.

If source metadata is refreshed without semantic change, revision remains unchanged.

## 42. Candidate output does not mutate immediately

T2-A inherits the T1 transaction model:

```text
committed predecessor
+ request temporal proposal
+ candidate temporal surface assessment
-> disposition
-> accepted output
-> exact-once commit
```

Discarded candidates never become the next base.

## 43. Reroll

Reroll always rebuilds from the predecessor committed snapshot.

Example:

```text
base = EXACT 2031-03-07
candidate A: 3~5 days later -> range
candidate A discarded
candidate B: next day -> DATE_ONLY 2031-03-08
```

Correct committed result:

```text
DATE_ONLY 2031-03-08
```

The discarded range is not a hidden constraint.

## 44. Edit rebuild

Semantic edits rebuild from the correct predecessor.

Example:

```text
original source = "3일 뒤"
edit source     = "3~5일 뒤"
```

The edit must recompute from the pre-original predecessor.

It must not apply `3~5일` on top of the already advanced `3일` result.

Representation-only edits preserve temporal state and revision.

## 45. Reload

Reload must preserve the exact precision and compact relation fields.

Forbidden reload coercions:

```text
DATE_ONLY -> midnight
range -> midpoint
range -> endpoint
relative -> old narrativeTimestamp
UNKNOWN -> old exact mirror
```

## 46. Precision comparison is not a total order

T2-A deliberately avoids a single numeric precision score that drives transitions.

Although exact carries more point detail than date-only, the state types describe different constraint shapes.

Therefore transitions are source- and semantics-driven rather than:

```text
if newPrecision > oldPrecision then accept
```

No such generic rule is authorized.

## 47. Deterministic transition matrix

High-level matrix:

| Base | Evidence | Result |
| --- | --- | --- |
| EXACT | none | same EXACT |
| EXACT | date-only current set | DATE_ONLY |
| EXACT | exact relative | EXACT or T1-B result |
| EXACT | bounded relative | BOUNDED_RANGE |
| EXACT | vague AFTER | RELATIVE_ORDER_ONLY |
| DATE_ONLY | none | same DATE_ONLY |
| DATE_ONLY | calendar-day/week shift | DATE_ONLY |
| DATE_ONLY | sub-day exact shift | finite BOUNDED_RANGE when provable |
| DATE_ONLY | vague AFTER | RELATIVE_ORDER_ONLY with DATE_ONLY anchor |
| RANGE | none | same RANGE |
| RANGE | exact shift | shifted RANGE |
| RANGE | bounded shift | bounded result if representable |
| RANGE | vague AFTER | RELATIVE_ORDER_ONLY with null anchor |
| RELATIVE | none | same RELATIVE |
| RELATIVE | vague AFTER | compacted later RELATIVE |
| WEAK | strong exact source | EXACT if source-authorized/compatible per source type |
| UNKNOWN | none | UNKNOWN |
| UNKNOWN | strong known source | corresponding known precision |
| KNOWN | parser failure/ambiguity | preserve KNOWN |

This matrix does not replace T1-C source routing or T1-B arithmetic.

## 48. Error/failure disposition at transition layer

T2-A semantic transition outcomes should conceptually distinguish:

```text
PASS_CHANGE
PASS_IDENTITY
AMBIGUOUS_SOURCE
INVALID_CALENDAR_TARGET
UNREPRESENTABLE_SAFE_RESULT
UNAUTHORIZED_REGRESSION_ROUTE
STALE_REVISION_DROP
CONFLICT
```

Exact runtime naming remains implementation detail.

Failures do not mutate canonical state.

## 49. No generic interval solver

T2-A authorizes only the bounded arithmetic and compatibility operations already required by T1-B/T2.

It does not authorize:

- arbitrary interval union;
- symbolic interval theorem proving;
- probability distributions over time;
- unbounded constraint accumulation;
- solving natural-language temporal graphs.

If a safe result is not representable in the current position union, preserve current state and fail closed rather than expanding architecture silently.

## 50. Constant-size guarantee

T2-A state remains constant-size.

RELATIVE_ORDER_ONLY stores at most:

```text
relation
one optional bounded anchor
one basisRevision
```

No predecessor chain is stored.

BOUNDED_RANGE stores exactly two endpoints plus granularity.

No event ledger is introduced.

## 51. Performance boundary

T2-A adds no:

```text
whole-chat scan
network request
wall-clock polling
timer
hot-path storage read solely for T2-A
LLM semantic extraction helper
```

Expected semantic work is bounded current-message classification plus constant-size arithmetic and transition normalization.

## 52. Mode boundary

T2-A only defines present narrative-head transitions.

It does not merge narrative time with Broadcast airtime.

It does not define COMMUNITY exposure wording.

It does not activate retrospective context.

Mode-specific projection and B_END interaction remain T2-C/T2-B as appropriate.

## 53. T3 boundary

Any transition requiring simultaneous maintenance of:

```text
present narrative head
and
retrospective/event-local active position
```

is outside T2-A.

T2-A must not smuggle flashback semantics into RELATIVE_ORDER_ONLY.

## 54. T4 boundary

Derived age, elapsed-age-at-date and birthDate-based facts are outside T2-A.

A weak current date may later be consumed by T4, but T2-A does not derive age.

## 55. Required T2-A regression design

T2-A permanent fixtures should eventually include at least:

1. exact -> next-day DATE_ONLY;
2. date-only never becomes midnight;
3. exact -> bounded date range;
4. date-only + 2h -> finite cross-date range;
5. date-only + calendar days remains date-only;
6. exact -> vague AFTER retains exact anchor;
7. date-only -> vague AFTER retains date-only anchor;
8. range -> vague AFTER uses null anchor;
9. repeated vague AFTER stays constant-size;
10. repeated vague AFTER increments semantic revision exactly once per accepted advance;
11. no-evidence preserves exact state/revision;
12. no-evidence preserves every weak precision/revision;
13. SAME_AS predecessor is identity;
14. weak -> exact strong user source succeeds;
15. model exact inside range may be compatible narrowing;
16. model exact outside range does not mutate at T2-A layer;
17. relation after weak date does not accept same-date exact point without proof;
18. weak head clears narrativeTimestamp atomically;
19. exact strengthening restores narrativeTimestamp atomically;
20. parser failure never resets known head to UNKNOWN;
21. authorized structural reset can produce UNKNOWN;
22. UNKNOWN no-evidence remains UNKNOWN;
23. reroll discards prior weak candidate state;
24. semantic edit rebuilds from predecessor;
25. representation edit preserves revision;
26. reload preserves precision exactly;
27. invalid calendar target produces no mutation;
28. no relative chain/state growth;
29. no full-history temporal scan;
30. retrospective phrase remains routed outside present-head T2-A path.

## 56. Resolved T2 umbrella open questions

T2-A resolves its four umbrella questions as follows.

### Repeated AFTER compaction

```text
retain strongest still-safe absolute anchor
update basisRevision to immediate predecessor revision
increment semantic revision once
never append a chain
```

### DATE_ONLY -> RELATIVE anchor

```text
retain DATE_ONLY anchor when the predecessor itself is the safe anchor
preserve its weak precision
never coerce to a clock boundary
```

### SAME_AS with weak precision

```text
copy/preserve the anchor precision
SAME_AS immediate predecessor is identity
no artificial RELATIVE_ORDER_ONLY conversion when direct preservation exists
```

### Reset to UNKNOWN

```text
no ordinary natural-language reset in T2-A
UNKNOWN only via initial/migration/edit-rebuild/explicit structural reset/residue-guard authority
ambiguity and parser failure preserve the prior known head
```

## 57. Child-design handoff to T2-B

T2-B must now be able to assume:

```text
weak heads are first-class canonical truth
DATE_ONLY anchor semantics are precision-preserving
range->relative does not invent an endpoint anchor
repeated relative advances are compacted
SAME_AS predecessor is identity
UNKNOWN is not a parser fallback
narrativeTimestamp is null for weak heads
revision semantics are frozen
```

T2-B may focus on one-header grammar and candidate disposition without redesigning these state transitions.

## 58. Acceptance criteria

T2-A design is complete when all are true:

```text
DATE_ONLY activation rules explicit
BOUNDED_RANGE activation rules explicit
RELATIVE_ORDER_ONLY activation rules explicit
no-evidence identity explicit
exact->weak explicit
weak->exact explicit
weak->weak explicit
repeated-relative compaction explicit
DATE_ONLY anchor retention explicit
range->relative conservative null-anchor explicit
SAME_AS behavior explicit
UNKNOWN reset boundary explicit
semantic revision behavior explicit
narrativeTimestamp mirror/null atomicity explicit
reroll/edit/reload behavior explicit
state remains constant-size
no new semantic owner
T2-B/T3/T4 boundaries explicit
implementation authority remains NONE
```

## 59. Current status

```text
T2-A = DESIGN FROZEN
implementation authority = NONE
runtime change = NONE
prompt change = NONE
version change = NONE
release change = NONE
production impact = NONE
```

T2-A may be implemented only as part of a later authorized T2 runtime program after the T1 Exact Temporal Core exists and is live-proven.
