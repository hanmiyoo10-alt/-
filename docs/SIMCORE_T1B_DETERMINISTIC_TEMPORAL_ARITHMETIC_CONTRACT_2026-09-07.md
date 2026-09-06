# SimCore T1-B Deterministic Temporal Arithmetic Contract

Date: 2026-09-07
Status: `T1-B DESIGN · NO IMPLEMENTATION AUTHORITY · NO RUNTIME/VERSION CHANGE`
Tracking: #1783
Parent Temporal program: #1763
T1 ownership/source map: #1775
T1-A state/schema contract: #1780 / PR #1781
Umbrella: #1768

## 1. Purpose

T1-B defines the deterministic arithmetic layer that operates on the T1-A temporal precision model.

Its responsibility is narrow:

```text
already-authorized temporal observation
+ canonical T1-A temporal base
-> strongest mechanically provable temporal result
```

The goal is to stop asking the language model to repeatedly perform calendar arithmetic that has a deterministic answer.

T1-B is not a general natural-language reasoning engine.

It does not authorize runtime implementation, prompt changes, release changes, or whole-chat duration scraping.

## 2. Authority at design start

At T1-B design start:

```text
main = 38a694000b2524e5983f97e71b6b99d8432b1355
production version = 0.70.10
release-simcore = ecc55f026315c6482c34d267aba2adb97527cdbc
```

Production remains unchanged by this document.

## 3. Ownership boundary

Semantic arithmetic owner:

```text
Time
```

Composition remains:

```text
Source/Extraction proves what temporal phrase means
-> Time parses bounded exact arithmetic token
-> Time computes deterministic result
-> Structure consumes temporal assessment
-> Output/Finalize commits only through the existing exact-once seam
```

Structure must not become a date calculator.

Prompt must not become a hidden arithmetic scratchpad.

## 4. First-slice calendar model

T1-B selects one explicit internal calendar model:

```text
calendar = proleptic Gregorian
clock precision = minute
minuteOfDay domain = 0..1439
real-world timezone = none
DST = none
wall-clock elapsed time = none
```

This is narrative/world arithmetic only.

The calendar is mechanical and independent from the host's locale or timezone.

### Gregorian leap-year rule

A year is leap when:

```text
divisible by 4
AND
(not divisible by 100 OR divisible by 400)
```

Examples:

```text
2000 -> leap
2028 -> leap
2100 -> not leap
2400 -> leap
```

## 5. Supported date domain

The internal arithmetic adapter must define a finite validated year domain before implementation.

Recommended T1 domain:

```text
0001-01-01 through 9999-12-31
```

If the eventual implementation must preserve a narrower compatibility parser on a legacy visible timestamp surface, that adapter may remain narrower.

Arithmetic itself must never wrap across the supported domain.

Out-of-domain result:

```text
OUT_OF_SUPPORTED_DATE_DOMAIN
```

## 6. T1-A precision inputs

T1-B consumes only normalized T1-A positions:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

The arithmetic layer must not silently reinterpret malformed state.

Malformed input state yields:

```text
INVALID_BASE_STATE
```

## 7. Exact-minute representation

T1-B treats an exact point semantically as:

```js
{
  date: '2031-03-07',
  minuteOfDay: 1315
}
```

No locale-formatted timestamp string is arithmetic authority.

Visible timestamp rendering remains an adapter concern.

## 8. Date-only representation as a possibility set

`DATE_ONLY(D)` means:

```text
some minute from 00:00 through 23:59 on D
```

This interpretation is critical for sub-day arithmetic.

It is not secretly midnight.

Therefore:

```text
DATE_ONLY + 2h
```

cannot usually remain one exact date.

## 9. Normalized exact delta

Conceptual normalized form:

```js
{
  direction: +1 | -1,
  years: nonnegativeInteger,
  months: nonnegativeInteger,
  days: nonnegativeInteger,
  minutes: nonnegativeInteger
}
```

Normalization rules:

```text
weeks -> days += weeks * 7
hours -> minutes += hours * 60
```

No component may be negative internally.

Direction carries the sign.

## 10. Zero delta

A zero delta is valid deterministic equivalence:

```text
0분 후
0일 전
```

Result:

```text
OK_SAME
```

It must not increment the semantic temporal revision by itself.

## 11. Unit semantics

T1-B distinguishes elapsed units from calendar units.

### Minute / hour

```text
minute, hour = elapsed-minute arithmetic
```

This may roll across date boundaries.

### Day / week

```text
day, week = calendar-day shift
```

For `EXACT_MINUTE`, the same local `minuteOfDay` is preserved.

For `DATE_ONLY`, the result remains date-only.

Because T1 has no timezone/DST axis, a calendar-day shift is mechanically stable.

### Month / year

```text
month, year = calendar year/month field shift
```

The original day-of-month must be preserved when the target exists.

No hidden clamp policy is allowed.

## 12. Bounded source grammar contract

T1-B does not parse arbitrary chat history.

It accepts only a bounded temporal phrase/token already designated by the source/extraction layer.

Minimum exact integer examples:

```text
30분 뒤
2시간 후
1일 뒤
3주 후
2개월 뒤
1년 후
1년 2개월 후
1일 2시간 30분 뒤
3일 전
```

The eventual parser may support a small closed lexical alias layer, but the arithmetic kernel itself consumes normalized integers.

## 13. Quantity restrictions

T1-B first slice accepts:

```text
nonnegative integer quantities
```

It rejects:

```text
fractional calendar units
negative numeric literals
scientific notation
unbounded natural-language quantity inference
```

Examples rejected by the exact arithmetic grammar:

```text
1.5개월 뒤
약 2시간 뒤
수십 일 후
두어 달 뒤
```

A later source layer may classify some of these as vague or bounded, but T1-B must not pretend they are exact numeric deltas.

## 14. Seconds and sub-minute precision

T1-A state precision stops at minutes.

Therefore T1-B does not create second-level state.

Examples:

```text
30초 뒤
90초 뒤
```

are outside the first exact arithmetic grammar unless a later contract explicitly defines safe minute-range projection.

No truncation or rounding is allowed.

## 15. Direction grammar

The exact grammar must yield one unambiguous direction:

```text
AFTER -> +1
BEFORE -> -1
```

Closed Korean suffix examples may include:

```text
후
후에
뒤
뒤에
전
전에
```

If a bounded token contains conflicting direction markers:

```text
MIXED_DIRECTION
```

No arithmetic occurs.

## 16. Compound component order

T1-B fixes a deterministic application order.

Conceptually:

```text
1. combine years/months into one signed target year-month shift
2. preserve original day-of-month in the target year-month
3. apply signed calendar days
4. apply signed elapsed minutes
5. normalize the resulting precision
```

This order is independent from incidental parser/library behavior.

It prevents hidden non-commutative differences between date libraries.

## 17. Why years/months are combined first

The year/month phase computes the final target year-month once.

Example:

```text
2028-02-29 + 4 years
-> target year-month 2032-02
-> day 29 exists
-> valid
```

The algorithm must not repeatedly step through every intermediate year and fail merely because 2029-02-29 does not exist.

The requested period is applied as a field shift to the final target year-month.

## 18. Invalid calendar target policy

T1-B selects:

```text
STRICT_PRESERVE_COMPONENTS
```

Meaning:

```text
preserve requested target year/month
preserve original day-of-month
if target day does not exist -> INVALID_CALENDAR_TARGET
```

Examples:

```text
2031-01-15 + 1 month
-> 2031-02-15

2031-01-31 + 1 month
-> INVALID_CALENDAR_TARGET

2028-02-29 + 1 year
-> INVALID_CALENDAR_TARGET

2028-02-29 + 4 years
-> 2032-02-29
```

## 19. Explicitly rejected month-end policies

T1-B does not silently choose:

```text
CLAMP_TO_MONTH_END
ROLLOVER_OVERFLOW_DAYS
FIXED_30_DAY_MONTH
FIXED_365_DAY_YEAR
HOST_LANGUAGE_LIBRARY_DEFAULT
```

A future policy extension would require a separate explicit contract.

## 20. Invalid target degradation boundary

Arithmetic failure and temporal-direction knowledge are distinct.

Example:

```text
base = 2031-01-31
source = 1개월 뒤
```

Arithmetic result:

```text
INVALID_CALENDAR_TARGET
```

If the source layer independently proves authoritative current-scene forward progression, the transition layer may choose a weaker state such as:

```text
RELATIVE_ORDER_ONLY AFTER previous position
```

T1-B arithmetic itself does not create that fallback automatically.

## 21. EXACT_MINUTE arithmetic

### Minutes

```text
2031-03-07 21:55 + 10m
-> 2031-03-07 22:05 EXACT_MINUTE
```

### Hour rollover

```text
2031-03-07 23:00 + 2h
-> 2031-03-08 01:00 EXACT_MINUTE
```

### Date rollover

```text
2031-12-31 23:30 + 90m
-> 2032-01-01 01:00 EXACT_MINUTE
```

### Day/week

```text
2031-03-07 14:25 + 3d
-> 2031-03-10 14:25 EXACT_MINUTE

2031-03-07 14:25 + 2w
-> 2031-03-21 14:25 EXACT_MINUTE
```

### Month/year

If the target date exists, preserve minute exactly.

If not, fail closed.

## 22. DATE_ONLY arithmetic

### Calendar day/week

```text
2031-03-07 DATE_ONLY + 1d
-> 2031-03-08 DATE_ONLY
```

### Valid month/year

```text
2031-01-15 DATE_ONLY + 1mo
-> 2031-02-15 DATE_ONLY
```

### Whole-day elapsed minutes

If elapsed minutes are exactly divisible by 1440:

```text
2031-03-07 DATE_ONLY + 1440m
-> 2031-03-08 DATE_ONLY
```

### Sub-day elapsed minutes

`DATE_ONLY(D)` means all possible start minutes on D.

For signed elapsed delta `m`, compute:

```text
earliest = D 00:00 + m
latest   = D 23:59 + m
```

Project those endpoints to dates.

Example:

```text
2031-03-07 DATE_ONLY + 2h

earliest -> 2031-03-07 02:00
latest   -> 2031-03-08 01:59

result -> [2031-03-07, 2031-03-08] BOUNDED_RANGE(DATE)
```

Negative example:

```text
2031-03-07 DATE_ONLY - 2h

earliest -> 2031-03-06 22:00
latest   -> 2031-03-07 21:59

result -> [2031-03-06, 2031-03-07] BOUNDED_RANGE(DATE)
```

## 23. DATE_ONLY normalization after elapsed arithmetic

If earliest and latest projected dates are identical:

```text
-> DATE_ONLY
```

Otherwise:

```text
-> BOUNDED_RANGE granularity DATE
```

No exact minute is ever invented.

## 24. BOUNDED_RANGE semantics

A bounded range represents a possibility set.

Arithmetic must transform the set, not a representative point.

Forbidden shortcuts:

```text
midpoint
lower-bound only
upper-bound only
last exact remembered point
```

## 25. Exact-minute bounded range arithmetic

For homogeneous exact-minute bounds:

```text
[lower, upper]
```

apply the same deterministic delta to both bounds.

If both operations are valid and order is preserved:

```text
-> shifted exact-minute range
```

Preserve inclusive flags.

If both shifted bounds become the same exact point and inclusion permits that point:

```text
-> normalize to EXACT_MINUTE
```

## 26. Date bounded range arithmetic

For a date-granularity range:

```text
[lowerDate, upperDate]
```

calendar-day/week shifts preserve date granularity.

Sub-day elapsed minutes may widen the date envelope.

The transformed set must cover every possible minute on every represented date.

## 27. Calendar target invalidity inside a base range

If month/year arithmetic is required for a range and any represented required endpoint/possibility makes the selected calendar mapping invalid, T1-B must fail closed rather than silently drop that possibility.

Example class:

```text
range includes Jan 31
+ 1 month
-> cannot pretend only Jan 30-like valid dates existed
```

Result:

```text
INVALID_CALENDAR_TARGET
```

## 28. RELATIVE_ORDER_ONLY arithmetic

A relative-only position must not upgrade to exact/range merely because a later exact number is supplied.

Example:

```text
head = AFTER 2031-03-07 21:55
source = +2h
```

The actual hidden head is still unknown.

For total monotone translations, T1-B may translate the representable anchor and preserve the same relation.

For fixed elapsed minutes:

```text
AFTER A
+ 2h
-> AFTER (A + 2h)
```

when `A + 2h` is deterministically representable.

Calendar day/week shifts are also total under the supported date domain.

## 29. RELATIVE_ORDER_ONLY month/year restriction

Month/year field shifts are partial because hidden actual dates may have invalid target day-of-month.

Therefore a relative-only hidden actual position must not gain a stronger shifted month/year anchor unless the source contract proves enough additional base precision.

Safe fallback:

```text
preserve existing relation/anchor
or return INSUFFICIENT_BASE for strengthening
```

No fake lower bound is created.

## 30. SAME_AS relation

If T1-A carries a `SAME_AS` relation form, T1-B may mechanically translate its anchor under a total valid delta while preserving the relation type.

Normalization into scalar exact/date precision belongs to the T1-A normalizer contract rather than being mandatory arithmetic behavior.

## 31. UNKNOWN arithmetic

Rule:

```text
UNKNOWN + exact delta
-> no exact/date/range result
```

Classification:

```text
INSUFFICIENT_BASE
```

A known direction without a representable anchor is not enough to synthesize a date.

## 32. Explicit bounded duration ranges

T1-B first slice supports bounded numeric duration ranges such as:

```text
3~5일 뒤
2~4시간 후
```

Conceptual normalized form:

```js
{
  direction: +1 | -1,
  unit: 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR',
  lower: nonnegativeInteger,
  upper: nonnegativeInteger
}
```

Requirement:

```text
lower <= upper
```

Invalid ordering:

```text
INVALID_RANGE
```

## 33. Range grammar boundary

T1-B first slice permits one ranged unit in one bounded phrase.

Examples in scope:

```text
3~5일 뒤
2~4시간 후
1~2개월 뒤
```

Examples deferred:

```text
1일 2시간 ~ 2일 4시간 뒤
1~2개월 3~5일 뒤
```

This keeps the first deterministic parser bounded.

## 34. Range arithmetic principle

Compute the image of:

```text
base possibility set
x
delta possibility set
```

Then store the smallest safe envelope representable by T1-A.

Never choose:

```text
midpoint
average
lower only
upper only
```

## 35. Exact base + day range

Example:

```text
2031-03-07 10:00 + 3~5d
-> [2031-03-10 10:00, 2031-03-12 10:00]
   BOUNDED_RANGE(EXACT_MINUTE)
```

## 36. Exact base + hour range

```text
2031-03-07 23:00 + 2~4h
-> [2031-03-08 01:00, 2031-03-08 03:00]
   BOUNDED_RANGE(EXACT_MINUTE)
```

## 37. DATE_ONLY base + sub-day duration range

The envelope must include both hidden start-minute uncertainty and duration-range uncertainty.

Example class:

```text
2031-03-07 DATE_ONLY + 2~4h
```

Possible resulting dates remain bounded by calendar projection.

No hidden clock is selected.

## 38. Month/year duration ranges

For a month/year range, every represented integer quantity in the range belongs to the possibility set.

If any required quantity produces an invalid calendar target under `STRICT_PRESERVE_COMPONENTS`:

```text
INVALID_CALENDAR_TARGET
```

Example:

```text
2031-01-31 + 1~2 months
```

`+1 month` is invalid even though `+2 months` may be valid.

T1-B must not discard the invalid branch and claim March 31 as the range result.

## 39. Negative direction arithmetic

T1-B arithmetic is sign-neutral.

Examples:

```text
2031-03-07 01:00 - 2h
-> 2031-03-06 23:00

2031-03-07 DATE_ONLY - 2h
-> [2031-03-06, 2031-03-07]
```

This does not mean the present narrative head is allowed to regress.

## 40. Present-head regression boundary

Arithmetic answers:

```text
what position is mechanically implied?
```

Transition/Structure answers:

```text
may this position replace the present head?
```

Example:

```text
present head = 2031-03-07
phrase = 3일 전
arithmetic result = 2031-03-04
```

Possible later semantic classifications include:

```text
RETROSPECTIVE
REGRESSION
INVALID_SOURCE
```

T1-B itself does not choose among them.

## 41. Arithmetic result family

Minimum bounded result family:

```text
OK_SAME
OK_EXACT
OK_BOUNDED
OK_RELATIVE
INSUFFICIENT_BASE
INVALID_DURATION_SYNTAX
UNSUPPORTED_UNIT
NON_INTEGER_QUANTITY
MIXED_DIRECTION
INVALID_RANGE
INVALID_CALENDAR_TARGET
OUT_OF_SUPPORTED_DATE_DOMAIN
INVALID_BASE_STATE
```

Age derivation adds:

```text
BIRTH_DATE_MISSING
BIRTH_AFTER_ACTIVE_DATE
```

## 42. No exception-driven semantics

The runtime must not let host language `Date` overflow/clamp behavior define story semantics accidentally.

Calendar validation occurs before accepting a target.

A host library may be used internally only if its behavior is wrapped by this contract and regression-tested.

## 43. Derived birthday-aware value

The T1 derived value remains:

```text
fullYearsElapsedSinceBirth
```

It is intentionally not named `currentAge`.

It is a recomputed mathematical view.

## 44. Birth-date authority

Inputs remain restricted by T1-A:

```text
explicit structured SimCore configuration
or
already-authorized structured host metadata
```

Not authority:

```text
character-card prose
lore prose
assistant claim
inferred birthday from current age
partial year-only birthday guess
```

## 45. Active temporal date selection

The consumer must explicitly choose the semantic date question.

Present-current derivation:

```text
use temporal.head
```

Depicted retrospective event derivation:

```text
use temporal.context.position
```

There is no global date variable that changes meaning implicitly during flashback.

## 46. Exact age derivation

For an authoritative birth date `B` and exact active calendar date `D`:

```text
years = D.year - B.year
if anniversary boundary in D.year has not been reached:
    years -= 1
```

If:

```text
D < B
```

result:

```text
BIRTH_AFTER_ACTIVE_DATE
```

No negative age is emitted.

## 47. Ordinary birthday boundary

Example:

```text
birthDate = 2008-11-17
activeDate = 2031-03-07
-> 22

activeDate = 2031-11-16
-> 22

activeDate = 2031-11-17
-> 23

activeDate = 2031-11-18
-> 23
```

## 48. Leap-day birth convention

T1-B selects one explicit mathematical convention for `fullYearsElapsedSinceBirth`:

```text
birthDate = Feb 29
in a non-leap target year
anniversary boundary = Mar 1
```

Examples:

```text
birthDate = 2008-02-29
activeDate = 2031-02-28
-> 22

activeDate = 2031-03-01
-> 23
```

This is a SimCore mathematical convention only.

It must not be represented as a legal or cultural age rule.

Existing `koreanAgeOffset` keeps its old compatibility meaning.

## 49. Age from EXACT_MINUTE

An exact-minute temporal position supplies its calendar date.

Time of day does not affect `fullYearsElapsedSinceBirth` in T1-B.

## 50. Age from DATE_ONLY

A date-only position supplies one exact calendar date.

Therefore birthday-aware full-years arithmetic is exact for a valid birth date.

## 51. Age from BOUNDED_RANGE

Age must be derived across the entire represented date set.

If all dates yield the same integer:

```text
-> exact integer
```

If the range crosses one birthday boundary:

```text
-> bounded integer range [n, n+1]
```

If a very large range crosses multiple birthdays:

```text
-> bounded integer range [minAge, maxAge]
```

No midpoint age is selected.

## 52. Age from RELATIVE_ORDER_ONLY / UNKNOWN

Without an active exact/date-bounded calendar date:

```text
fullYearsElapsedSinceBirth = UNKNOWN
```

Do not infer age from `worldYear` alone.

Do not infer age from a previous exact timestamp if the current head has weaker precision.

## 53. Persisted-age prohibition

T1-B does not add:

```text
currentAge
ageRevision
birthdayPassedThisYear
```

as canonical dynamic truth.

The value is recomputed when needed from source facts.

## 54. Existing Korean-age compatibility

`koreanAgeOffset` is out of scope for semantic redefinition.

T1-B must not silently convert it into birthday-aware full years.

Both may coexist as distinct concepts while legacy compatibility remains required.

## 55. Derived claim checking boundary

T1-B may define deterministic comparison semantics for later targeted claim checking.

It does not authorize a whole-output arbitrary fact scanner.

The checker receives a specifically identified temporal/age claim from another bounded lane.

## 56. Exact temporal claim conflict

If arithmetic proves one exact point:

```text
expected = 2031-03-08 01:00
claimed  = 2031-03-08 02:00
```

classification:

```text
DERIVED_TEMPORAL_CONFLICT
```

## 57. Bounded temporal claim comparison

If arithmetic proves a range:

```text
claimed exact outside range
-> conflict
```

If:

```text
claimed exact inside range
```

then:

```text
compatible with arithmetic
but not proven by arithmetic alone
```

An independent strong source would be required to narrow canonical precision safely.

## 58. Relative-only claim comparison

If arithmetic proves only ordering and a model claims an exact timestamp:

```text
unverified narrowing
```

This is not automatically accepted as truth and not always a deterministic contradiction.

The source/claim authority contract decides whether another source can validate it.

## 59. Age claim conflict

Exact age expected:

```text
expected = 22
claimed  = 23
-> DERIVED_AGE_CONFLICT
```

Bounded age expected:

```text
claim outside [min,max]
-> conflict
```

Claim within a bounded range is compatible but may remain unproven.

## 60. Parser and arithmetic separation

Recommended future module seam:

```text
Time.parseExactRelativeDurationToken(token)
Time.applyTemporalDelta(base, delta)
Time.applyTemporalDeltaRange(base, deltaRange)
Time.deriveFullYearsSinceBirth(birthDate, activePosition)
```

Names are conceptual, not implementation authority.

Parsing failure must never fall through into heuristic arithmetic.

## 61. No full-chat rescans

T1-B arithmetic must be incremental and bounded.

Forbidden design:

```text
scan entire chat every turn
find every number + time unit
rebuild all historical temporal state
```

The source lane hands Time only the bounded observation relevant to the current transaction.

## 62. No event ledger

T1-B does not change T1-A's constant-size state decision.

Arithmetic results are applied to:

```text
current head
or
active retrospective context
```

through existing committed state snapshots.

No Time-owned unbounded event database is added.

## 63. Reroll/edit interaction

T1-B arithmetic is pure with respect to a supplied base snapshot.

Therefore exact-once safety remains:

```text
predecessor committed snapshot
+ replacement token
-> recomputed replacement result once
```

Never:

```text
old committed result
+ replacement delta
```

when replacing the same output slot.

## 64. Reload interaction

T1-B adds no chat-history rescan requirement.

Reload restores T1-A canonical state.

Future arithmetic starts from that restored state.

No derived age cache is authoritative across reload.

## 65. Broadcast boundary

Broadcast airtime remains separate from present narrative head.

T1-B may perform arithmetic on a validated B_END floor only when a source/transition contract explicitly asks it to transform that bound.

It must not equate Broadcast timestamp with current narrative time by default.

## 66. World-year compatibility

When a future committed present-head arithmetic result proves a later year, existing `worldYear` compatibility may advance through the existing owner seam.

T1-B arithmetic itself does not mutate `worldYear`.

Retrospective arithmetic must never regress `worldYear`.

## 67. Vague duration boundary

Not exact arithmetic:

```text
잠시 후
한참 뒤
며칠 뒤
몇 시간 뒤
두어 달 뒤
```

These remain source/precision questions.

They may produce:

```text
RELATIVE_ORDER_ONLY
BOUNDED_RANGE
AMBIGUOUS
```

only when another bounded contract proves the appropriate semantics.

T1-B does not invent hidden numeric mappings for vague words.

## 68. Exact symbolic day aliases

T1-B does not require them for the first numeric kernel, but a future bounded parser adapter may normalize exact symbolic offsets such as:

```text
다음날 -> +1 calendar day
전날   -> -1 calendar day
```

only if the source contract proves they refer to the narrative temporal base rather than unrelated quoted content.

The arithmetic kernel still receives a normalized delta.

## 69. Recommended parser lexical scope

The eventual first parser should prefer deterministic small coverage over broad fuzzy interpretation.

Recommended exact numeric surface:

```text
Arabic integer + 분/시간/일/주/개월/년
compound descending components
single trailing direction marker
single-unit numeric ranges with ~
```

A bounded alias map for forms such as `한 시간`, `두 시간`, `하루`, `이틀`, `한 달`, `한 주` may be added only if each alias maps to one exact integer without semantic ambiguity.

## 70. Recommended compound syntax rule

The first parser should reject duplicate unit components in one token.

Example:

```text
1시간 30분 -> valid
1시간 2시간 -> INVALID_DURATION_SYNTAX
```

Recommended unit order:

```text
YEAR > MONTH > WEEK > DAY > HOUR > MINUTE
```

Out-of-order acceptance is optional only if normalization remains unambiguous and separately regression-tested.

## 71. Arithmetic overflow

All integer conversions and date shifts must be checked for overflow before state mutation.

Failure:

```text
OUT_OF_SUPPORTED_DATE_DOMAIN
```

No JavaScript numeric overflow/wrap may become story state.

## 72. Monotonicity invariants

For positive fixed-minute/day/week deltas on exact positions:

```text
result > base
```

For negative fixed-minute/day/week deltas:

```text
result < base
```

Zero:

```text
result == base
```

Month/year field shifts must satisfy the same comparison when valid and nonzero.

If not, classify the arithmetic result invalid.

## 73. Strongest-provable normalization

After arithmetic, normalize only to a precision justified by the entire result set.

Examples:

```text
one exact minute -> EXACT_MINUTE
one calendar date with unknown time -> DATE_ONLY
multiple bounded points/dates -> BOUNDED_RANGE
ordering only -> RELATIVE_ORDER_ONLY
no representable position -> UNKNOWN / no mutation
```

Never upgrade weak input precision merely because the operator was numeric.

## 74. T1-B regression matrix

Future executable coverage must prove at minimum:

1. `2031-03-07 23:00 + 2h -> 2031-03-08 01:00`;
2. minute rollover across day;
3. minute rollover across year;
4. leap-year `Feb 28 + 1d -> Feb 29`;
5. non-leap-year `Feb 28 + 1d -> Mar 1`;
6. valid `Jan 15 + 1mo -> Feb 15`;
7. invalid `Jan 31 + 1mo`;
8. invalid `Feb 29 + 1y`;
9. valid `Feb 29 + 4y`;
10. Gregorian century rule for 2100;
11. Gregorian divisible-by-400 rule for 2400;
12. `DATE_ONLY + 24h -> next DATE_ONLY`;
13. `DATE_ONLY + 2h -> current/next date range`;
14. `DATE_ONLY - 2h -> previous/current date range`;
15. exact + `3~5d` -> exact-minute range;
16. exact + `2~4h` across midnight;
17. date-only + `2~4h` includes hidden clock uncertainty;
18. range arithmetic never uses midpoint;
19. invalid calendar target in base range fails closed;
20. invalid integer target inside month/year duration range fails closed;
21. RELATIVE_ORDER_ONLY + fixed minutes remains relative-only;
22. RELATIVE_ORDER_ONLY month/year does not gain unsafe strengthened anchor;
23. UNKNOWN + exact delta remains unresolved;
24. zero delta yields semantic same;
25. negative arithmetic is computed but does not itself authorize head regression;
26. unsupported seconds do not round/truncate;
27. fractional month/day does not become exact;
28. mixed direction fails closed;
29. duplicate units fail closed or are rejected by parser contract;
30. supported-domain overflow fails closed;
31. ordinary birthday before boundary;
32. ordinary birthday on boundary;
33. ordinary birthday after boundary;
34. Feb-29 birth on Feb 28 of non-leap year remains prior age;
35. Feb-29 birth on Mar 1 of non-leap year increments age;
36. date range not crossing birthday returns exact age;
37. date range crossing birthday returns bounded age;
38. active date before birth yields contradiction;
39. RELATIVE/UNKNOWN active date yields derived age unknown;
40. no persistent `currentAge` field is introduced;
41. arithmetic uses no wall-clock/timezone/DST input;
42. existing permanent narrative-clock regressions remain green.

## 75. Acceptance decisions

T1-B accepts:

```text
calendar model = proleptic Gregorian
clock precision = minute
wall-clock/timezone/DST = REJECTED
integer exact delta kernel = YES
minutes/hours = elapsed-minute arithmetic
days/weeks = calendar-day arithmetic
months/years = preserve-component field shift
month-end clamp = REJECTED
invalid month/year target = FAIL CLOSED
DATE_ONLY sub-day uncertainty propagation = REQUIRED
range arithmetic over possibility sets = REQUIRED
midpoint range collapse = REJECTED
relative-only fake exact upgrade = REJECTED
UNKNOWN fake date creation = REJECTED
negative arithmetic support = YES
present-head regression authorization = NOT OWNED BY ARITHMETIC
birth-date full-years derivation = YES
persistent currentAge = REJECTED
Feb-29 derived-age anniversary in non-leap year = Mar 1
legal/cultural age semantics = OUT OF SCOPE
whole-chat duration scan = REJECTED
unbounded temporal ledger = REJECTED
```

## 76. Non-goals

T1-B does not define:

- runtime implementation;
- prompt projection;
- source authority from arbitrary prose;
- generic assistant-output temporal extraction;
- legal/cultural age conventions;
- non-Gregorian calendars;
- timezone/DST semantics;
- second/sub-minute state;
- universal end-of-month clamp;
- general-purpose symbolic reasoning;
- generic Derived-State engine rollout;
- release/version mutation.

## 77. Next transaction

Expected next seam:

```text
T1-C SOURCE / EXTRACTION + CONTRADICTION / COMMIT DISPOSITION CONTRACT
```

T1-C should decide:

- which bounded user/output surfaces may produce exact temporal observations;
- how current-scene vs retrospective intent is proven;
- how assistant claims are targeted without global scanning;
- when arithmetic conflict repairs, rejects, or only annotates;
- how semantic edits/rerolls rebuild observations;
- how Time assessment maps into Structure/Finalize disposition.

Prompt projection remains later.

Runtime implementation remains unauthorized until an explicit implementation transaction.

## 78. Classification

```text
program: SIMCORE_TEMPORAL_AWARENESS_T1
transaction: T1-B_DETERMINISTIC_TEMPORAL_ARITHMETIC_CONTRACT
semantic owner: TIME
calendar: PROLEPTIC_GREGORIAN
state growth: CONSTANT_SIZE
implementation authority: NONE
runtime change: NONE
prompt change: NONE
release change: NONE
production impact: NONE
```
