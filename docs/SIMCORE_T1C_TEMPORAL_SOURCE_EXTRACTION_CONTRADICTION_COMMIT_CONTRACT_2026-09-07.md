# SimCore T1-C Temporal Source, Extraction, Contradiction, and Commit Disposition Contract

Date: 2026-09-07
Status: `T1-C DESIGN · NO IMPLEMENTATION AUTHORITY · NO RUNTIME/VERSION/PROMPT/RELEASE CHANGE`
Tracking: #1786
Parent Temporal program: #1763
Ownership/source map: #1775
T1-A state/schema: #1780 / PR #1781
T1-B deterministic arithmetic: #1783 / PR #1784
Umbrella deterministic-state architecture: #1768

## 1. Purpose

T1-A defined the persistent temporal state.

T1-B defined deterministic temporal arithmetic.

T1-C defines the authority and transaction layer between natural-language/structured observations and those deterministic components.

The core question is no longer:

```text
Can SimCore add two hours to a date?
```

That is T1-B.

The T1-C questions are:

```text
Did this turn actually establish a current-scene temporal transition?
Was the time phrase only a plan, quote, question, memory reference, or hypothetical?
Did the assistant author a compatible current time or contradict a stronger constraint?
If there is a contradiction, can SimCore repair one canonical metadata field deterministically?
If not, what must fail closed?
```

The target pipeline is:

```text
bounded source surface
-> source classification
-> semantic routing
-> normalized temporal observation
-> T1-B arithmetic / T1-A state proposal
-> candidate canonical-surface check
-> contradiction assessment
-> bounded disposition
-> accepted-output exact-once commit
```

T1-C is not a universal semantic parser.

## 2. Authority at design start

At T1-C design start:

```text
main = 8d52becd000f9561725dc5c9daddc295e44aa32f
production version = 0.70.10
release-simcore = ecc55f026315c6482c34d267aba2adb97527cdbc
```

Production remains unchanged by this document.

## 3. Governing philosophy

T1-C follows the SimCore project boundary:

```text
facts + explicit rules + deterministic consistency
-> SimCore

interpretation + emotion + creative choice
-> model
```

This has an important temporal consequence.

If the user says:

```text
3~5일 뒤
```

SimCore must not invent `4일 뒤` as the answer.

However, the creative model may intentionally choose a concrete compatible point, for example a canonical timestamp corresponding to `4일 뒤`, and that exact point may become a newly authored canonical fact if the output surface is authorized and compatible.

Therefore:

```text
SimCore cannot derive exactness
!=
model is forbidden to author exactness
```

This distinction is central to T1-C.

## 4. Existing production posture to preserve

Production already has a deliberately conservative narrative progression detector.

`narrativeProgressionHint` is explicitly described as relational rather than a full Korean calendar parser and only activates on a clear opening current-time transition.

T1-C must preserve this conservative posture.

It does not replace the current bounded temporal source logic with:

- whole-message semantic mining;
- whole-chat time extraction;
- universal event understanding;
- arbitrary assistant prose parsing.

## 5. Semantic ownership

Owner boundaries remain:

```text
Time
  source normalization
  temporal routing semantics
  arithmetic
  temporal assessment
  canonical temporal proposal

Structure
  candidate/commit safety judgment
  deterministic contract enforcement

Output / Finalize
  exact-once accepted-output mutation seam

State Reconcile
  composition / migration / supported edit rebuild orchestration
  no independent temporal semantics

Prompt
  later relevance-filtered serialization only
```

T1-C does not move temporal meaning into Structure or Prompt.

## 6. Source taxonomy

T1-C first slice recognizes the following strong source families.

```text
CONFIG_TEMPORAL_ANCHOR
USER_CURRENT_ABSOLUTE
USER_CURRENT_RELATIVE_EXACT
USER_CURRENT_RELATIVE_RANGE
USER_CURRENT_RELATIVE_VAGUE
USER_RETROSPECTIVE_ENTER
USER_RETROSPECTIVE_CONTINUE
USER_RETROSPECTIVE_EXIT
OUTPUT_CANONICAL_TIMESTAMP
B_END_TERMINAL_FLOOR
MIGRATION_EXISTING_CANONICAL
EDIT_REBUILD_SOURCE
```

These are semantic classes, not necessarily final runtime enum spellings.

## 7. Weak/non-authoritative source taxonomy

The following must not automatically mutate canonical temporal state:

```text
ARBITRARY_ASSISTANT_PROSE_TIME
ARBITRARY_USER_EVENT_MENTION
QUOTED_DIALOGUE_TIME
HYPOTHETICAL_TIME
QUESTION_ONLY_TIME
NEGATED_TIME
FUTURE_PLAN_OR_APPOINTMENT
UNSUPPORTED_MULTI_TRANSITION
OLD_EMBEDDED_EVENT_TIMESTAMP
TURN_COUNT
WALL_CLOCK
HOST_ELAPSED_TIME
TIMEZONE
DST
```

The presence of a number and a time unit is never enough by itself.

## 8. Bounded extraction surfaces

T1-C first slice authorizes only bounded surfaces:

1. already-authorized structured SimCore/host temporal configuration;
2. the current user input's bounded leading temporal transition/control clause;
3. an explicit bounded retrospective enter/exit clause in the current user input;
4. the current assistant candidate's known canonical timestamp surface;
5. validated B_END terminal handoff metadata;
6. migration of already-canonical legacy temporal state;
7. currently supported edit/reroll rebuild surfaces using the same source rules.

There is no general history scan.

## 9. Why the leading clause matters

A roleplay input often begins with a scene-control transition:

```text
3일 뒤, 그는 다시 사무실을 찾았다.
```

That opening phrase is a strong candidate for current-scene authority.

The same words buried in dialogue are not:

```text
그는 웃으며 "3일 뒤에 보자"라고 말했다.
```

T1-C preserves a bounded leading-control concept because it lowers false positives and matches the existing production direction.

The exact byte/character bound is implementation detail and must be chosen later under runtime proof.

## 10. Leading-clause normalization targets

The bounded source grammar may recognize deterministic date forms such as:

```text
2031-03-07
2031년 3월 7일
2031-03-07 23:00
2031년 3월 7일 오후 11시
2031년 3월 7일 오후 11시 30분
```

It may also recognize exact relative forms compatible with T1-B:

```text
30분 뒤
2시간 후
1일 뒤
1일 2시간 30분 뒤
3주 후
2개월 뒤
1년 2개월 후
3일 전
```

And bounded ranges:

```text
3~5일 뒤
2~4시간 후
```

The exact lexical grammar remains bounded and test-driven.

## 11. Named deterministic aliases

T1-C may normalize a small explicit alias set into T1-B arithmetic when semantics are deterministic.

Candidate first-slice aliases:

```text
다음날
이튿날
다음 주
다음 달
다음 해
내년
```

Conceptually:

```text
다음날 / 이튿날 -> +1 calendar day
다음 주         -> +1 calendar week
다음 달         -> +1 calendar month
다음 해 / 내년  -> +1 calendar year
```

Month/year aliases still obey T1-B strict invalid-target semantics.

`내년` refers only to narrative/world calendar state, never the real current year.

## 12. Daypart boundary

Words such as:

```text
아침
오전
낮
오후
저녁
밤
새벽
```

must not silently map to arbitrary clock ranges unless a separate documented policy exists.

Example:

```text
다음날 아침
```

may prove:

```text
next calendar date
clock = unspecified
```

It must not secretly become `08:00` or `06:00..11:59` merely because a parser wants a number.

## 13. Semantic routing before arithmetic

Before T1-B performs arithmetic, T1-C classifies the temporal clause into one of:

```text
CURRENT_SET_OR_ADVANCE
RETROSPECTIVE_EVENT
EVENT_REFERENCE_ONLY
NON_ASSERTIVE
AMBIGUOUS
```

Arithmetic is only meaningful after routing.

## 14. CURRENT_SET_OR_ADVANCE

A clause is current-scene authority when it clearly establishes or instructs the currently depicted narrative position.

Conceptual examples:

```text
3일 뒤, 장면이 이어진다.
다음날 아침, 그는 문을 연다.
현재 시각은 2031-03-07 21:00이다.
2031년 3월 8일, 다시 본편으로 이어간다.
```

This class targets the active current lane:

- present head when no retrospective context is active;
- retrospective context position when retrospective context is active and no explicit present-return override exists.

## 15. RETROSPECTIVE_EVENT

A clause is retrospective authority only when it clearly enters or continues depiction of an earlier event without redefining the present head.

Conceptual examples:

```text
3년 전의 장면으로 넘어간다.
회상 장면: 2030-01-02.
그때로 돌아가서 당시 상황을 이어간다.
```

The contract requires positive retrospective evidence.

A merely old date does not imply flashback.

## 16. EVENT_REFERENCE_ONLY

A time phrase may refer to another event without changing the current scene.

Examples:

```text
3일 뒤에 만나자.
어제 있었던 사건을 이야기한다.
내년 계획을 세운다.
두 시간 후 출발할 예정이라고 말한다.
```

These may later feed scheduling/memory subsystems, but T1 first slice does not mutate `temporal.head` from them.

## 17. NON_ASSERTIVE

Non-assertive temporal language does not establish canonical truth.

Examples:

```text
지금 3월 7일이야?
3일 뒤라면 어떻게 될까?
아직 다음날은 아니다.
만약 내년이라면...
그는 "3일 뒤에 보자"라고 말했다.
예를 들어 2031-03-07이라고 해보자.
```

Question, quotation, hypothetical, negation, and example contexts require no temporal mutation.

## 18. AMBIGUOUS

If the bounded grammar cannot prove whether a phrase is current transition, retrospective depiction, event reference, or non-assertive language:

```text
assessment = AMBIGUOUS_SOURCE
canonical mutation = none
```

T1-C prefers false negatives over false canonical facts.

## 19. User source transaction timing

A strong current user source creates a provisional temporal constraint/proposal, not immediate canonical state.

```text
current user source
-> bounded extraction
-> normalized observation
-> pending.temporalProposal / constraint
-> generation
-> candidate check
-> accepted output commit
-> canonical mutation
```

This preserves reroll/discard safety.

## 20. User source authority vs model output

When the user establishes an exact or bounded temporal constraint, the assistant cannot override it with a contradictory canonical timestamp.

Examples:

```text
user: +2 hours from 21:00
expected unique point: 23:00
assistant canonical line: 00:00
-> conflict
```

```text
user: March 10..12
assistant canonical line: March 11 14:00
-> compatible creative narrowing
```

```text
user: March 10..12
assistant canonical line: March 14 14:00
-> conflict
```

## 21. Assistant authority boundary

T1-C first slice does not mine arbitrary assistant prose for temporal state.

The only ordinary assistant-authored canonical temporal source is the known canonical timestamp line/surface already used by SimCore's temporal rendering/commit path.

That surface may establish a new exact fact when compatible with all stronger constraints.

## 22. Why arbitrary assistant prose remains non-authoritative

Consider:

```text
그는 잠시 생각했다. 두 시간 후의 약속이 떠올랐다.
```

A generic parser might incorrectly move the current scene two hours.

T1-C therefore does not treat arbitrary prose relative phrases as canonical state transitions.

This also avoids expensive full-output semantic extraction.

## 23. Model-authored exact narrowing

A compatible canonical timestamp may narrow weaker deterministic state.

### Date-only user state

```text
user establishes date = 2031-03-07
assistant canonical timestamp = 2031-03-07 15:20
```

The exact time was not derived by SimCore.

It was authored by the model within the user's date constraint.

Result may become:

```text
EXACT_MINUTE 2031-03-07 15:20
source = OUTPUT_CANONICAL_TIMESTAMP
```

## 24. Bounded-range narrowing

Example:

```text
base = March 7
user = +3~5 days
allowed envelope = March 10..12
assistant canonical point = March 11 10:00
```

The point is compatible and may become exact current state.

The model made the creative selection.

SimCore only checked membership in the allowed envelope.

## 25. Relative-only narrowing

Example:

```text
head exact anchor = 20:00
user = 한참 뒤
T1-A/T1-B deterministic result = AFTER 20:00
assistant canonical point = 23:30
```

If the canonical point is provably after the anchor, it may establish exactness.

If the model emits `20:00` or `19:00`, it conflicts with the authoritative forward relation.

## 26. UNKNOWN and model authorship

If temporal state is UNKNOWN and there is no stronger constraint, a valid model-authored canonical timestamp may establish a new exact present/event point if the renderer/source contract already authorizes that canonical surface.

This preserves current production behavior where the canonical output surface can establish narrative time.

## 27. Canonical surface validity

Before a model-authored timestamp can become authority it must satisfy:

```text
known canonical surface
valid timestamp syntax
valid calendar date
valid clock
correct current semantic lane
no stronger-source contradiction
no forbidden present-head regression
no stale proposal lineage
```

An arbitrary date-looking string elsewhere in the output is not equivalent.

## 28. Present head routing

When no retrospective context is active:

```text
current user transition -> temporal.head
assistant canonical timestamp -> temporal.head
```

Subject to constraints and accepted commit.

## 29. Retrospective entry

On explicit retrospective entry:

```text
head -> KEEP
context -> ENTER
```

If the retrospective source includes a deterministic event time/date, it initializes `context.position` using the strongest provable T1-A precision.

## 30. Retrospective continuation

While `temporal.context.kind == RETROSPECTIVE`:

```text
ordinary current-depicted temporal continuation
-> context.position
```

Examples:

```text
다음날
두 시간 뒤
2030-01-03
```

refer to the depicted retrospective lane unless the user explicitly returns to present/current semantics.

## 31. Assistant timestamp during retrospective context

While retrospective context is active, the canonical assistant timestamp surface represents the currently depicted retrospective event lane.

Therefore:

```text
output canonical timestamp
-> check/update context.position
-> do not regress/mutate present head
```

This prevents a flashback timestamp from overwriting present narrative time.

## 32. Retrospective exit

Explicit return-to-present semantics such as:

```text
현재로 돌아온다
본편 현재 시점으로 복귀한다
회상을 끝낸다
```

may produce:

```text
context -> EXIT
head -> KEEP
```

unless the same supported control transaction separately proves a present-head transition.

## 33. Historical timestamps without retrospective authority

An older timestamp appearing in assistant output or user prose does not automatically establish a retrospective context.

Without explicit source-backed routing:

```text
old timestamp != flashback proof
```

This is required to prevent accidental present-head regression.

## 34. Multiple temporal expressions

T1-C distinguishes a compound delta from multiple competing scene transitions.

### Allowed compound

```text
1일 2시간 30분 뒤
```

This is one normalized T1-B delta.

### Potentially competing

```text
3일 뒤 ... 그리고 다시 2시간 뒤 ...
3월 7일 ... 아니 3월 8일 ...
```

Unless a later bounded grammar explicitly proves one sequential control chain:

```text
assessment = MULTIPLE_TEMPORAL_CANDIDATES
mutation = none
```

Regex match order must not silently choose authority.

## 35. Source precedence is constraint composition

T1-C avoids a naive total priority list.

Sources have roles:

```text
structured/config anchors
-> authoritative input facts/constraints

current user transition
-> intended transaction constraint/proposal

B_END terminal
-> eligible lower-bound constraint

assistant canonical timestamp
-> compatible creative authored fact/narrowing
```

The assistant output is not a higher-priority override of user/config truth.

## 36. Contradictory strong sources

If two strong pre-generation sources are mutually inconsistent:

```text
SOURCE_CONFLICT
```

Example:

```text
config anchor says current date = March 7
user explicitly says current date = March 8
```

Whether user control is allowed to replace configuration depends on the source adapter's explicit mutability contract.

T1-C does not silently assume config always wins or user always wins.

The adapter must declare whether the config is:

```text
ANCHOR_INITIAL
READ_ONLY_CONSTRAINT
MUTABLE_CURRENT_FACT
```

Until then, ambiguous conflict fails closed.

## 37. T1-C assessment family

Recommended bounded assessment family:

```text
NO_TEMPORAL_EVIDENCE
ACCEPT_SAME
ACCEPT_USER_DERIVED
ACCEPT_OUTPUT_AUTHORED
ACCEPT_NARROWING
ACCEPT_RETROSPECTIVE
RELATIVE_ONLY
EVENT_REFERENCE_ONLY
NON_ASSERTIVE_SOURCE
AMBIGUOUS_SOURCE
MULTIPLE_TEMPORAL_CANDIDATES
SOURCE_CONFLICT
OUTPUT_TEMPORAL_CONFLICT
CURRENT_HEAD_REGRESSION
INVALID_CANONICAL_SURFACE
INVALID_ARITHMETIC
STALE_PROPOSAL
```

T1-B error details may be carried as a bounded reason field rather than duplicated as top-level states.

## 38. Commit disposition family

Recommended final disposition family:

```text
KEEP_STATE
COMMIT_USER_DERIVED
COMMIT_OUTPUT_AUTHORED
COMMIT_NARROWED_OUTPUT
COMMIT_RETROSPECTIVE_CONTEXT
COMMIT_WEAKER_RELATION
REPAIR_CANONICAL_SURFACE
REJECT_TEMPORAL_MUTATION
REJECT_CANDIDATE
STALE_DROP
```

## 39. KEEP_STATE

Used when:

- no temporal evidence exists;
- a valid source proves semantic equivalence;
- event reference/non-assertive language does not mutate time;
- representation-only edit leaves normalized semantics unchanged.

No temporal revision increment.

## 40. COMMIT_USER_DERIVED

Used when:

- current/config source is authoritative;
- T1-B deterministically derives the next T1-A position;
- candidate does not contradict it;
- accepted output commit is reached.

Canonical mutation occurs exactly once.

## 41. COMMIT_OUTPUT_AUTHORED

Used when a valid canonical output surface establishes an exact compatible fact not already uniquely determined by a stronger input source.

Examples:

- UNKNOWN -> authored exact timestamp;
- no-time-evidence turn -> authored later exact timestamp;
- model intentionally sets current scene time under existing renderer contract.

## 42. COMMIT_NARROWED_OUTPUT

Used when the deterministic constraint is weaker than the valid output-authored fact.

Examples:

```text
DATE_ONLY -> exact same-date timestamp
BOUNDED_RANGE -> exact in-range timestamp
RELATIVE_ORDER_ONLY -> exact point satisfying relation
```

The narrowing is model-authored, not arithmetic-invented.

## 43. COMMIT_RETROSPECTIVE_CONTEXT

Used for:

- context enter;
- context continuation;
- context update;
- context exit.

Present head remains stable unless a separately proven present transition exists.

## 44. COMMIT_WEAKER_RELATION

Used when the source proves only order/direction and exact arithmetic cannot produce a point.

Example:

```text
한참 뒤
-> AFTER previous anchor
```

No fake duration.

## 45. REPAIR_CANONICAL_SURFACE

Repair is allowed only for a narrow deterministic canonical metadata/timestamp surface.

Requirements:

```text
surface is known canonical metadata
replacement is uniquely proven
repair does not require rewriting arbitrary story prose
repair is compatible with existing deterministic repair architecture
repair does not guess within a range
```

## 46. Unique-target repair example

```text
base = 21:00
user = +2h
expected = 23:00
candidate canonical timestamp = 00:00
```

There is one deterministic correct timestamp.

The canonical timestamp line may be repair-eligible under the future runtime implementation.

## 47. Range conflict is not repairable by clamp

```text
expected allowed date range = March 10..12
candidate canonical timestamp = March 14
```

Invalid repairs include:

```text
clamp to March 12
choose midpoint March 11
choose earliest March 10
```

No single correct point exists.

The candidate must not be silently rewritten to an invented value.

## 48. Invalid calendar target is not repairable by convenience

T1-B example:

```text
2031-01-31 + 1 month
-> INVALID_CALENDAR_TARGET
```

T1-C must not repair this to February 28 merely to keep the transaction moving.

At most a weaker source-backed ordering relation may survive if semantically valid.

## 49. REJECT_TEMPORAL_MUTATION

Used when the output itself need not be rejected but temporal authority is insufficient.

Typical cases:

- ambiguous source with no canonical temporal claim;
- event-reference-only time phrase;
- question/hypothetical/quotation;
- arbitrary assistant prose time mention outside canonical surface;
- unsupported source adapter.

Canonical temporal state remains unchanged.

## 50. REJECT_CANDIDATE

Used when a strong canonical temporal claim is incompatible with authoritative constraints and no unique safe repair exists.

Reason:

```text
visible canonical timestamp contradicts SimCore state
+ refusing only state mutation would leave two truths
-> candidate transaction must fail closed
```

Exact runtime UX for rejection/regeneration is deferred to implementation planning.

## 51. STALE_DROP

If:

```text
pending.temporalProposal.baseRevision != temporal.revision
```

then:

```text
disposition = STALE_DROP
mutation = none
```

This reuses T1-A lineage safety.

## 52. Existing current-time floor compatibility

Production already includes deterministic current-time floor repair for known regressions, including post-B_END handoff behavior.

T1-C preserves this as an existing compatibility seam.

The future implementation must distinguish:

```text
existing authoritative floor repair
```

from:

```text
new arbitrary range clamping
```

Only the former is already justified.

## 53. Post-B_END source role

Validated B_END terminal time is:

```text
lower-bound handoff constraint
```

not automatically:

```text
present narrative head
retrospective event time
universal current timestamp
```

Eligible first-C processing may use it as:

```text
AT_OR_AFTER terminal
```

or exact floor repair where existing contract applies.

## 54. B mode boundary

T1-C preserves the current non-B temporal transition posture.

During `B_*`:

- Broadcast timestamp surfaces belong to Broadcast airtime;
- arbitrary user narrative date/relative phrases do not directly mutate `temporal.head` in this first slice;
- B_START/B_CONTINUE/B_END monotonic airtime rules remain separate;
- B_END terminal may feed the subsequent handoff constraint only.

## 55. No-output-timestamp case

A strong user temporal transition is source authority independent from whether the model restates the time correctly.

If:

- user source is authoritative;
- T1-B result is valid;
- candidate has no contradictory canonical timestamp;
- candidate is otherwise accepted;

then accepted output commit may apply the pending user-derived proposal.

The future implementation must not depend exclusively on parsing the assistant output timestamp to remember a user-established time transition.

This is a key T1 improvement over output-only temporal commit semantics.

## 56. Renderer requirement remains separate

If an existing mode/renderer contract requires a visible canonical timestamp and the model omits it, Structure may still classify that as a presentation/structure problem.

But:

```text
renderer omission
!=
user temporal source never existed
```

The temporal proposal and output-format validity are separate dimensions.

## 57. Candidate discard

Example:

```text
committed head = 10:00
user = +30m
candidate A proposes/outputs 10:30
candidate A discarded
```

Canonical remains:

```text
10:00
```

The pending user constraint may be reused for the replacement candidate, but no canonical mutation occurred.

## 58. Reroll before commit

Replacement candidate uses:

```text
same committed base
+ same current user temporal source
+ newly generated candidate output
```

No duplicate arithmetic application.

## 59. Reroll replacing a committed output

If the host reroll semantics replace an already committed assistant output slot:

```text
rebuild predecessor snapshot
-> re-evaluate source for that slot
-> evaluate replacement candidate once
-> commit replacement once
```

Forbidden:

```text
old temporal effect
+ replacement temporal effect
```

when both correspond to the same output slot.

## 60. Manual edit of canonical timestamp surface

Editing a canonical timestamp so that its normalized semantic point changes is a temporal semantic edit.

It must rebuild from the predecessor committed snapshot under existing supported edit scope.

If only representation changes and normalization yields the same temporal point:

```text
temporal revision = unchanged
```

## 61. Manual edit of arbitrary assistant prose

T1-C does not gain new authority merely because a user edits ordinary assistant prose to include or remove a time phrase.

Only recognized canonical/source surfaces participate in first-slice temporal rebuild.

This keeps edit semantics bounded.

## 62. User-source edit

If the host exposes a supported edit of the user source associated with the current output slot, T1-C may rebuild that slot using the same bounded source extraction rules.

T1-C does not expand unsupported deep-history user edit replay.

## 63. Claim checking boundary

T1-C does not authorize global free-prose claim checking for every temporal fact.

First-slice targeted check surfaces are limited to:

```text
canonical timestamp line
owner-produced structured temporal observation
future explicitly structured derived-age claim surface, if separately added
```

## 64. Age prose remains outside first-slice claim checking

Example:

```text
그는 스물세 살이었다.
```

T1-B may know deterministic `fullYearsElapsedSinceBirth = 22`.

T1-C still does not scan arbitrary prose and automatically rewrite/reject that sentence.

A later targeted claim surface may address this if needed.

This preserves low false-positive cost.

## 65. Source observation object

A future implementation may normalize bounded extraction into a small object conceptually like:

```js
{
  sourceKind,
  routing,
  strength,
  observationKind,
  absolutePosition,
  delta,
  rangeDelta,
  vagueRelation,
  sourceSpanClass,
  reason
}
```

It must not persist raw source prose into canonical temporal state.

## 66. Strength is not confidence theater

T1-C should avoid arbitrary floating confidence scores.

Prefer categorical authority:

```text
AUTHORITATIVE_STRUCTURED
AUTHORITATIVE_BOUNDED_GRAMMAR
CANONICAL_OUTPUT_SURFACE
WEAK_NON_AUTHORITY
AMBIGUOUS
```

This makes commit behavior testable.

## 67. Negative-direction arithmetic routing

T1-B can calculate `3일 전`.

T1-C determines what that negative result means.

Possible routes:

```text
explicit retrospective entry -> context position
current-scene absolute reset with valid authority -> potentially current transition, subject to regression contract
mere event reference -> no head mutation
ambiguous -> fail closed
```

Arithmetic sign alone does not decide narrative semantics.

## 68. Present-head regression

A proposed present-current timestamp older than the protected present head is:

```text
CURRENT_HEAD_REGRESSION
```

unless a supported explicit contract proves:

- retrospective routing, or
- current-head correction/rebuild from predecessor state under edit/reroll semantics.

An old timestamp cannot self-authorize its own exception.

## 69. Equal-time semantics

If a new current source/output normalizes to the same semantic temporal position:

```text
assessment = ACCEPT_SAME
head/context mutation = none
revision = same
```

Representation changes do not create fake temporal history.

## 70. Weaker user source after stronger state

Example:

```text
head = exact 21:55
user = "한참 뒤"
```

The result may intentionally replace exact current knowledge with:

```text
RELATIVE_ORDER_ONLY AFTER 21:55
```

because the current position itself is now known only relationally.

This is not an accidental precision downgrade.

It is a semantic transition whose strongest provable new current state is weaker.

## 71. Assistant narrowing after weaker transition

Continuing the prior example:

```text
user = 한참 뒤
assistant canonical line = 23:10
```

If `23:10 > 21:55`, the model-authored exact point may narrow the accepted current state back to exact.

This two-stage logic preserves both truthfulness and model creativity.

## 72. Date-only plus model time choice

Example:

```text
user = 다음날 아침
T1 deterministic date = March 8 DATE_ONLY
assistant canonical line = March 8 09:20
```

T1-C may accept the exact time as model-authored detail.

It does not imply SimCore numerically defined the meaning of `아침`.

If future requirements demand validating whether `09:20` is culturally consistent with `아침`, that is a separate semantic policy and not T1-C first slice.

## 73. Bounded range plus output edge

If an exact output timestamp equals an inclusive allowed bound, it is compatible.

If the bound is exclusive in a future TemporalPosition contract, membership must respect that flag.

No implicit inclusivity beyond the represented state contract.

## 74. Source conflicts vs output conflicts

Distinguish:

```text
SOURCE_CONFLICT
```

pre-generation authoritative sources disagree.

Versus:

```text
OUTPUT_TEMPORAL_CONFLICT
```

candidate canonical output contradicts already-resolved authoritative constraints.

This distinction improves diagnostics and repair eligibility.

## 75. Arithmetic error mapping

T1-B may return errors such as:

```text
INVALID_DURATION_SYNTAX
NON_INTEGER_QUANTITY
INVALID_RANGE
INVALID_CALENDAR_TARGET
INSUFFICIENT_BASE
OUT_OF_SUPPORTED_DATE_DOMAIN
```

T1-C maps these into transaction semantics.

Examples:

```text
INSUFFICIENT_BASE + authoritative forward source
-> possibly COMMIT_WEAKER_RELATION
```

```text
INVALID_CALENDAR_TARGET
-> no fabricated exact date
-> possibly weaker relation if direction is independently authoritative
```

```text
INVALID_DURATION_SYNTAX
-> AMBIGUOUS/REJECT_TEMPORAL_MUTATION
```

## 76. No hidden fallback to LLM arithmetic

If T1-B cannot deterministically calculate a result, T1-C must not ask the same model to provide a supposedly authoritative arithmetic answer and then treat it as calculator truth.

The model may still creatively author a compatible canonical fact when allowed by source constraints, but that is explicitly categorized as authored fact, not derived arithmetic.

## 77. Performance boundary

T1-C must remain cheap by design:

```text
current message only
bounded leading/control clause
known canonical output surface
constant-size state
no full-history scan
no arbitrary NLP pass
no unbounded event ledger
```

The expensive failure mode is not date arithmetic; it is trying to semantically understand every sentence.

T1-C explicitly rejects that architecture.

## 78. Prompt boundary

T1-C authorizes no new prompt lines.

Source classification, reason codes, lineage indices, raw parser spans, and contradiction diagnostics are internal.

T1-D will decide relevance-filtered prompt projection separately.

## 79. Exposure/Knowledge boundary

A temporal fact becoming canonical does not automatically make it public/known to every character or COMMUNITY.

```text
Time canonical fact
!=
epistemic exposure
```

Existing/future Exposure Knowledge authority remains separate.

## 80. Migration boundary

T1-C does not re-scan old chat to discover missed historical temporal controls.

Migration source remains only already-authoritative structured legacy state defined by T1-A.

## 81. Required regression family: source routing

Future executable coverage must prove:

1. leading `2시간 뒤` is eligible current transition;
2. leading `3~5일 뒤` is eligible bounded current transition;
3. leading exact date creates absolute current observation;
4. buried future appointment does not move head;
5. quoted time does not move head;
6. question-only time does not move head;
7. hypothetical time does not move head;
8. negated time does not move head;
9. arbitrary assistant prose time does not mutate state;
10. old embedded timestamp alone does not create retrospective context.

## 82. Required regression family: retrospective routing

11. explicit retrospective enter preserves present head;
12. retrospective enter with exact date initializes context only;
13. continuation `다음날` during retrospective updates context only;
14. assistant canonical timestamp during retrospective targets context only;
15. explicit present return clears context;
16. retrospective exit does not invent present advancement;
17. present head remains non-regressed throughout retrospective sequence.

## 83. Required regression family: narrowing and constraints

18. exact user target + matching output accepts;
19. exact user target + conflicting output is deterministic conflict;
20. DATE_ONLY user target + exact same-date output accepts narrowing;
21. DATE_ONLY user target + different-date output conflicts;
22. bounded range + exact inside range accepts narrowing;
23. bounded range + exact outside range conflicts;
24. relative-only AFTER + exact later output accepts narrowing;
25. relative-only AFTER + same/earlier output conflicts;
26. UNKNOWN + valid output canonical timestamp may establish output-authored exact state when otherwise allowed.

## 84. Required regression family: repair/disposition

27. unique exact mismatch is repair-eligible only on canonical surface;
28. arbitrary prose is never rewritten by temporal repair;
29. bounded mismatch does not clamp to nearest/earliest/latest/midpoint;
30. invalid month/year target does not clamp to month-end;
31. existing current-time floor regression repair remains preserved;
32. irreparable canonical-surface conflict rejects candidate rather than leaving visible/state divergence;
33. ambiguous source with no canonical contradiction rejects temporal mutation only.

## 85. Required regression family: lineage/edit/reload

34. discarded candidate does not mutate user-derived proposal into state;
35. reroll-before-commit reuses same base once;
36. replacement reroll rebuilds predecessor once;
37. canonical timestamp representation-only edit preserves revision;
38. semantic timestamp edit rebuilds once;
39. supported user-source edit uses same bounded extraction;
40. stale baseRevision drops proposal;
41. reload does not re-extract historical chat.

## 86. Required regression family: mode/boundary

42. B-mode user narrative time does not mutate narrative head;
43. B-mode timestamps remain Broadcast airtime;
44. B_END terminal remains lower-bound handoff source;
45. no Broadcast timestamp automatically becomes head;
46. no wall-clock input participates;
47. no turn-count progression participates;
48. no full-chat scan participates;
49. no global arbitrary-prose age claim scan is introduced;
50. existing permanent narrative-clock tests remain green.

## 87. Acceptance decisions

T1-C accepts:

```text
bounded current-user temporal source          = YES
whole-message temporal mining                 = REJECTED
whole-chat temporal mining                    = REJECTED
leading/control-clause authority              = YES
questions/hypotheticals/quotes as authority   = REJECTED
event-reference-only as head mutation         = REJECTED
explicit retrospective routing                = YES
old timestamp self-authorized flashback       = REJECTED
assistant canonical timestamp authority       = YES
arbitrary assistant prose authority           = REJECTED
model-authored compatible exact narrowing     = YES
user/config constraint override by assistant  = REJECTED
unique canonical metadata repair              = ALLOWED UNDER NARROW CONTRACT
range clamp repair                            = REJECTED
arbitrary story prose repair                  = REJECTED
irreparable canonical conflict                = REJECT CANDIDATE
ambiguous non-conflicting source              = REJECT TEMPORAL MUTATION
commit before accepted output                 = REJECTED
reroll double application                     = REJECTED
B airtime as narrative head                   = REJECTED
wall-clock/timezone/DST                       = REJECTED
prompt change                                 = NONE
runtime change                                = NONE
release change                                = NONE
```

## 88. Non-goals

T1-C does not define:

- runtime implementation;
- exact regex source grammar;
- exact character/byte extraction window;
- prompt projection;
- daypart numerical clock ranges;
- universal Korean temporal NLP;
- arbitrary assistant prose temporal extraction;
- generic event scheduler;
- temporal memory ledger;
- universal age prose contradiction repair;
- non-temporal Derived-State engine rollout;
- wall-clock/timezone/DST semantics;
- release/version mutation.

## 89. Next transaction

Expected next design seam:

```text
T1-D RELEVANCE-FILTERED TEMPORAL PROMPT PROJECTION CONTRACT
```

T1-D must answer:

- when current temporal state is actually relevant to generation;
- how exact/date/range/relative state is serialized minimally;
- how retrospective context is projected without duplicating present head;
- when derived age is injected and when it is omitted;
- how existing temporal prompt lines are reused/replaced rather than stacked;
- how to prove `no relevant temporal fact -> zero new T1 prompt lines`.

Runtime implementation remains unauthorized until a later explicit implementation transaction.

## 90. Classification

```text
program: SIMCORE_TEMPORAL_AWARENESS_T1
transaction: T1-C_SOURCE_EXTRACTION_CONTRADICTION_COMMIT
semantic owner: TIME
candidate safety consumer: STRUCTURE
commit seam: OUTPUT_FINALIZE
state growth: CONSTANT_SIZE
history scan: NONE
implementation authority: NONE
runtime change: NONE
prompt change: NONE
release change: NONE
production impact: NONE
```
