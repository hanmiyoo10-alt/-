# SimCore T1-D Relevance-Filtered Temporal Prompt Projection Contract

Date: 2026-09-07
Status: `T1-D DESIGN · NO IMPLEMENTATION AUTHORITY · NO RUNTIME/VERSION/RELEASE CHANGE`
Tracking: #1790
Parent Temporal program: #1763
Ownership/source map: #1775
T1-A state/schema: #1780 / PR #1781
T1-B deterministic arithmetic: #1783 / PR #1784
T1-C source/extraction/disposition: #1786 / PR #1787
Umbrella deterministic-state architecture: #1768

## 1. Purpose

T1-A defined the persistent temporal state.

T1-B defined deterministic temporal arithmetic.

T1-C defined which bounded sources may create temporal constraints and how candidate conflicts are disposed.

T1-D defines the final pre-generation projection layer:

```text
what temporal information does the main model actually need on this turn,
and what is the smallest truthful serialization that supplies it?
```

The design target is not to mirror all Time state into the prompt.

The target is:

```text
internal temporal richness
-> relevance filter
-> one compact scene-time semantic line
-> optional one compact derived-age line
```

## 2. Core project principle

T1-D adopts the project-wide rule:

> SimCore owns facts, deterministic rules, and consistency work; the main model owns interpretation, emotion, and creative generation.

Prompt consequence:

> SimCore may know much more than it says.

Therefore:

```text
state completeness != prompt completeness requirement
```

Prompt projection should be sparse by default.

## 3. Hard design outcome

Dynamic T1-D temporal prompt budget:

```text
scene temporal core          <= 1 line
optional derived age facts   <= 1 line
--------------------------------------
maximum dynamic T1-D lines   <= 2 lines
```

When no T1 temporal fact is relevant:

```text
0 new T1-D lines
```

The budget excludes unrelated stable SimCore contracts such as:

- response envelope;
- frame requirements;
- Knowledge requirements;
- COMMUNITY structure;
- Broadcast airtime instructions owned outside T1 narrative projection.

## 4. Fresh authority at design start

```text
main = 114f25f5c65ba83c01c0b54743fc934a004a413e
production version = 0.70.10
release-simcore = ecc55f026315c6482c34d267aba2adb97527cdbc
```

No runtime, prompt compiler, version, deployment, or release authority is granted by this document.

## 5. Observed production prompt baseline

Current prompt/compiler behavior already contains temporal-related prompt surface.

Observed examples include:

```text
korean_age_offset=+0
world_year=unknown
```

and when legacy offset is active:

```text
current_korean_age=character_reference_age+N;past_event_age_not_current=1
```

The existing non-B timeline path historically emits semantics equivalent to:

```text
current_timeline_anchor=<exact timestamp>
current_timeline_authority=1;historical_context_reference_only=1;explicit_user_requested_past_scene_or_flashback_may_depart=1
current_character_age_and_status_follow_current_timeline=1;past_event_age_or_status_not_current=1
```

The direct post-B_END path may add separate floor/handoff lines.

Existing generic narrative-tail timestamp rules also live in the prompt compiler.

T1-D must not stack a second temporal subsystem on top of all of these.

## 6. Baseline interpretation

The production lines above are not all equivalent.

They mix:

```text
persistent compatibility state
+ current scene factual state
+ static behavioral instructions
+ provenance/handoff bookkeeping
+ age guidance
```

T1-D separates those concerns.

The main model should receive the smallest consumer-ready fact, not internal bookkeeping.

## 7. Ownership boundary

Canonical semantic ownership remains:

```text
TIME
- temporal state
- precision
- arithmetic
- retrospective context
- effective temporal constraint
- derived full-years age result when inputs are authoritative

T1-C / existing request owners
- bounded source classification
- current-turn temporal authority

PROMPT
- relevance gating over already-classified facts
- canonical serialization
- deterministic line ordering
- line-budget enforcement

BROADCAST
- Mode B airtime semantics

STRUCTURE
- candidate acceptance/rejection consumer
- not temporal projection owner

OUTPUT FINALIZE
- exact-once commit consumer
- not temporal projection owner
```

Prompt must not perform temporal arithmetic.

Prompt must not infer retrospective intent.

Prompt must not reinterpret arbitrary prose.

## 8. Request-scoped projection plan

Preferred conceptual seam:

```text
Time/T1-C semantic result
-> TemporalProjectionPlan
-> Prompt relevance filter
-> bounded serialization
```

A conceptual plan may contain only generation-relevant semantic values such as:

```text
reason
sceneKind
positionOrConstraint
presentHeadWhenRetrospective
ageFacts[]
```

It must not expose model-irrelevant implementation facts such as:

```text
revision
baseRevision
source stamp
lineage ids
parser captures
migration provenance
storage keys
diagnostic disposition strings
internal repair traces
```

## 9. Projection reasons

T1-D recognizes conceptual reasons:

```text
NONE
CURRENT_CANONICAL_TIMESTAMP_CONSTRAINT
CURRENT_TURN_TEMPORAL_TARGET
RETROSPECTIVE_CONTEXT
TEMPORAL_UNCERTAINTY_GUARD
POST_B_END_EFFECTIVE_FLOOR
EXPLICIT_AGE_REQUEST
STRUCTURED_AGE_DEPENDENCY
```

These are internal relevance classes.

They do not need to appear in the main-model prompt.

## 10. Effective generation view

Prompt should project one strongest effective temporal view.

Conceptual priority:

```text
1. current-turn authoritative current-scene transition
2. current-turn authoritative retrospective enter/continue/exit semantics
3. active retrospective depicted event position
4. eligible post-B_END effective minimum constraint
5. committed present narrative head
6. no temporal view
```

This is not a simple source-priority winner table.

The goal is to project the state the model must respect while generating this candidate.

## 11. Do not dump base + delta + result

Example:

```text
committed head = 2031-03-07 21:00
user = 2시간 뒤
T1-B result = 2031-03-07 23:00
```

Prompt target:

```text
project 23:00 as the effective current scene target
```

Do not emit all three:

```text
base=21:00
user_delta=+2h
target=23:00
```

The model does not need to redo the arithmetic.

## 12. Do not dump provenance with a floor

Example:

```text
B_END terminal = 21:55
post-B_END disposition = APPLIED
current generation constraint = at-or-after 21:55
```

The model needs the effective minimum/current constraint.

It does not normally need:

```text
APPLIED
storedBroadcastAirtime
eligibility reason
predecessor request id
```

Those remain internal.

## 13. Stronger semantic fact subsumes weaker duplicates

Examples:

```text
exact current timestamp containing year 2031
-> do not separately restate world_year=2031 merely for the same fact
```

```text
exact target already later than post-B_END floor
-> do not also emit a separate floor line
```

```text
retrospective combined line contains event + present head
-> do not additionally emit ordinary present-head line
```

This is semantic deduplication, not byte compression for its own sake.

## 14. T1-A precision lattice must survive projection

Projection supports:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

Prompt must never strengthen precision merely to make serialization easier.

## 15. EXACT_MINUTE projection

Conceptual shape:

```text
temporal_scene=current;time=2031-03-07 21:55;precision=minute
```

Required semantics:

- current depicted scene is at this exact minute;
- historical dates in other context do not override it;
- a T1-C compatible output may preserve or validly advance according to current-turn constraints;
- no separate world-year line is semantically required if this line already supplies the needed current year.

Exact key names remain implementation detail.

## 16. DATE_ONLY projection

Conceptual shape:

```text
temporal_scene=current;date=2031-03-07;clock=unknown
```

Required semantics:

- date is authoritative;
- clock is unknown;
- the model must not be told midnight;
- the model may author a compatible exact clock when T1-C allows narrowing.

Forbidden:

```text
2031-03-07 00:00
```

unless a separate source actually proves midnight.

## 17. BOUNDED_RANGE projection

Conceptual shape:

```text
temporal_scene=current;range=2031-03-10..2031-03-12;compatible_narrowing=allowed
```

Required semantics:

- current scene belongs inside the envelope;
- midpoint/earliest/latest are not SimCore truth;
- a compatible model-authored exact point may become truth through T1-C;
- an outside point is a conflict.

## 18. RELATIVE_ORDER_ONLY projection

Conceptual shape:

```text
temporal_scene=current;relation=after(2031-03-07 21:55);exact=unresolved;compatible_narrowing=allowed
```

The anchor is included only because the relation is meaningless without it.

Required semantics:

- current scene is after the anchor;
- exact duration is not known;
- the prior anchor is not itself the current scene time;
- compatible exact creative narrowing remains possible.

## 19. UNKNOWN projection

Default UNKNOWN with no stale-exact hazard should usually be omitted.

This preserves zero-line behavior.

A negative guard is justified only when omission would create a concrete stale-anchor hazard.

Conceptual shape:

```text
temporal_scene=current;time=unknown;prior_exact_not_current=1
```

This line is not a generic placeholder.

It is a targeted uncertainty guard.

## 20. Why `unknown` should usually be absence

Current production can serialize facts such as:

```text
world_year=unknown
```

T1-D target philosophy is:

```text
unknown with no behavioral consequence -> omit
```

The model gains little from being told a large catalog of unknown fields.

Absence is cheaper and clearer when the contract treats absence as unknown.

## 21. Retrospective projection

Retrospective requires two semantic positions but should still consume one T1 core line.

Conceptual shape:

```text
temporal_scene=retrospective;event=2030-01-02;present_head=2031-03-07
```

The line communicates:

- what is currently being depicted;
- what the non-regressing present authority remains;
- where the scene returns when retrospective context ends.

## 22. Retrospective precision

The event field may itself be:

```text
exact
DATE_ONLY
range
relative
unknown
```

Example:

```text
temporal_scene=retrospective;event_range=2030-01-02..2030-01-04;present_head=2031-03-07
```

Do not collapse the event to an exact date merely because the present head is exact.

## 23. No duplicate present-head line during retrospective

Forbidden shape:

```text
current_timeline_anchor=2031-03-07
temporal_scene=retrospective;event=2030-01-02;present_head=2031-03-07
```

The first line adds no new semantic value and may confuse which clock drives the depicted scene.

Retrospective combined projection is sufficient.

## 24. Retrospective exit

When an explicit exit is authoritative:

```text
context cleared
-> project ordinary present head again
```

Do not emit both old retrospective context and return target.

## 25. Model-authored narrowing remains creative authority

T1-C established:

```text
SimCore cannot derive exactness
!=
model is forbidden to create compatible exactness
```

T1-D preserves this.

For a range or relative-only scene, projection should communicate the constraint and that compatible narrowing is allowed.

It must not claim that the chosen exact result came from deterministic arithmetic.

## 26. Current-turn target outranks stale committed presentation

Example:

```text
committed = March 7
user = 3 days later
pending target = March 10
```

Prompt should not tell the model:

```text
current = March 7
also advance 3 days
```

if Time has already deterministically produced March 10.

It should project March 10.

This saves model reasoning and reduces contradiction surface.

## 27. Age projection is optional, not baseline state

Authoritative birthDate does not imply prompt relevance.

Default:

```text
birthDate exists
age not needed this turn
-> no age line
```

This is a central T1-D minimization rule.

## 28. Derived age relevance triggers

First-slice bounded triggers:

```text
EXPLICIT_AGE_REQUEST
STRUCTURED_AGE_DEPENDENCY
FUTURE_DEDICATED_AGE_OUTPUT_SURFACE
```

Examples of explicit request intent may include current user questions/statements about:

- age;
- birthday passage;
- how many full years have elapsed;
- whether an age threshold is reached.

Exact bounded request grammar belongs to implementation/T1-E, not Prompt free-form semantic search.

## 29. Age derivation owner

Prompt never calculates age.

Pipeline:

```text
authoritative birthDate
+ effective depicted temporal date
-> Time derived fullYearsElapsedSinceBirth
-> bounded projection fact
-> Prompt serialization
```

## 30. Age during retrospective scenes

When the current depicted scene is retrospective:

```text
age basis = retrospective event date
```

not:

```text
age basis = present head
```

Conceptual projection:

```text
temporal_age=Character:22;scope=depicted_scene
```

The present-day age is omitted unless the current request explicitly needs both.

## 31. Age range

If temporal uncertainty crosses a birthday:

```text
possible derived age = 22..23
```

Prompt projects the range.

It must not choose one value.

## 32. No birthDate authority

If no authoritative birthDate exists:

```text
no birthday-aware derived age line
```

Do not infer from:

- character card prose;
- assistant prose;
- approximate age wording;
- legacy Korean-age offset.

## 33. Legacy Korean-age offset remains a compatibility concept

T1-D does not redefine `koreanAgeOffset`.

It does not equate it with birthday-aware full-years age.

Legacy compatibility and new derived age remain distinct.

## 34. Existing unconditional age/world-year lines are compaction candidates

Current production emits slow temporal compatibility lines even on ordinary turns.

T1-D classifies them as:

```text
COMPATIBILITY_SURFACE / REVIEW_BEFORE_REMOVAL
```

not:

```text
PERMANENTLY_REQUIRED_EVERY_TURN
```

Implementation must prove exact-byte and behavior impact before conditionalizing or removing them.

## 35. Exact timestamp can subsume current year for the model

When an exact current scene timestamp is projected:

```text
2031-03-07 21:55
```

adding:

```text
world_year=2031
```

usually duplicates the same model-facing fact.

T1-D target is semantic non-duplication.

This does not authorize removal until T1-E maps existing consumers and cache ABI.

## 36. Existing timeline semantic trio must not stack with T1 core

Legacy semantics conceptually include:

```text
anchor
current-timeline authority / historical-reference rule
current age/status follows current timeline
```

T1-D target is replacement/compaction.

A runtime implementation may retain a legacy key to reduce migration risk, but it may not emit both:

```text
legacy semantic trio
+ duplicate T1 temporal scene line
```

for the same fact.

## 37. Static behavioral rules are separate from dynamic projection

T1-D distinguishes:

```text
static rule = how canonical timestamp semantics work
```

from:

```text
dynamic fact = what time this scene currently is
```

A future prompt compaction may relocate/reduce static rule wording.

T1-D does not automatically delete unrelated generic narrative-tail rules.

## 38. Post-B_END effective projection

The current direct post-B_END seam contains internal facts such as:

```text
eligibility
disposition
terminal timestamp
stored airtime
previous narrative anchor
effective floor
```

The model normally needs only:

```text
effective current-time minimum/target
```

T1-D therefore folds post-B_END semantics into the same temporal core whenever possible.

## 39. Post-B_END stronger-target case

Example:

```text
B_END floor = 21:55
current user transition proves target = 22:10
```

Projection:

```text
22:10 target only
```

Do not also emit `floor=21:55`.

The target already satisfies it.

## 40. Post-B_END floor-only case

Example:

```text
only proven relation = current scene must be at or after 21:55
```

Projection concept:

```text
temporal_scene=current;relation=at_or_after(21:55);exact=unresolved
```

Do not falsely set current time equal to 21:55.

## 41. Mode A policy

Ordinary non-B generation uses T1 temporal projection when any of the following applies:

- committed/pending temporal state constrains the canonical timestamp;
- current-turn temporal target is authoritative;
- retrospective context is active;
- uncertainty guard is needed;
- explicit age fact is relevant.

If temporal state is fully uninitialized and no bounded source exists:

```text
0 T1-D lines
```

## 42. Why exact no-change scenes still need one line

SimCore's response frame expects a canonical timestamp surface.

When a committed exact narrative head exists, it is relevant to keeping that timestamp consistent even if the user did not ask a time question.

Therefore:

```text
known exact non-B scene
-> one compact temporal core line
```

Minimality does not mean deleting a fact the renderer needs.

## 43. Mode B policy

Mode B canonical timestamps are Broadcast airtime.

Therefore narrative current-head projection is not injected merely to drive the timestamp surface.

Default normal B turn:

```text
0 narrative T1 timestamp lines
```

Broadcast's existing airtime lines remain separate.

## 44. Mode B explicit narrative-content need

A narrative temporal fact may still matter to depicted content inside B.

Examples:

- explicit question about character age in the depicted event;
- explicit retrospective depicted scene;
- owner-produced structured age dependency.

Then T1-D may project a bounded **depicted narrative context** line.

It must not look like Broadcast timestamp authority.

## 45. Mode B separation invariant

Always preserve:

```text
Broadcast airtime != narrative depicted scene time by default
```

T1-D cannot make one overwrite the other.

## 46. Mode C policy

Mode C follows ordinary narrative temporal projection unless:

- direct post-B_END effective floor is the stronger current-turn constraint;
- retrospective context is active.

COMMUNITY exposure/knowledge remains separate.

## 47. No whole-history relevance scan

Relevance must come from bounded current data.

Allowed inputs conceptually:

```text
T1-A current state
T1-C current request classification
current mode
current renderer requirements
structured age dependency signal
validated post-B_END handoff facts
```

Rejected:

```text
scan all messages for dates
scan all messages for ages
semantic embedding ranker
auxiliary LLM relevance classifier
```

## 48. No prompt-side arithmetic

Prompt may serialize:

```text
23:00
```

only if Time supplied 23:00.

Prompt must not independently execute:

```text
21:00 + 2h
```

This avoids duplicate arithmetic authorities.

## 49. No prompt-side retrospective inference

Prompt may serialize retrospective context only if T1-C/Time supplied retrospective semantics.

It must not see a past date and decide:

```text
probably flashback
```

## 50. No arbitrary assistant prose claim projection

T1-D does not mine output prose for prompt facts on the next turn.

Canonical state comes through T1-C/commit-owned surfaces.

This prevents arbitrary prose from becoming hidden state authority.

## 51. Canonical serialization ordering

When present:

```text
1. temporal scene core
2. temporal derived age
```

They should occupy one stable prompt region near current/request-scoped authority.

Do not split one semantic projection across slow and volatile sections.

## 52. Why temporal core should be volatile/current

The effective temporal view may change every turn due to:

- current user transition;
- retrospective enter/exit;
- output commit;
- post-B_END handoff;
- edit/reroll rebuild.

Treating the scene core as lifecycle-slow state invites stale cache semantics.

## 53. Derived age stability

A derived age can remain stable across many turns, but T1-D still treats it as request-relevant projection rather than persistent slow prompt baseline.

Reason:

```text
absence of relevance should remove it completely
```

A stable derived value is not automatically a stable prompt requirement.

## 54. Dynamic line-budget enforcement

T1-D line budget:

```text
core = 0 or 1
age  = 0 or 1
```

If multiple age facts are relevant, the first implementation must remain bounded.

Preferred first slice:

```text
explicitly targeted active subjects only
bounded small set
serialize together on one age line
```

Do not create one line per known character.

## 55. Age-fact prioritization

Conceptual priority if a bounded subject cap is needed:

```text
1. entity explicitly named by current user age request
2. entity required by structured current rule
3. active protagonist/secondary only when specifically required
4. omit unrelated characters
```

Exact initial cap belongs to T1-E implementation planning.

## 56. Semantic line length must remain bounded

A two-line cap is not useful if each line can become an unbounded database dump.

Therefore:

- temporal core has constant-size state;
- age facts use a bounded subject set;
- no event ledger is serialized;
- no provenance tail is serialized;
- no historical fact list is serialized.

## 57. Reroll behavior

Reroll uses the rebuilt pending/effective temporal view for that candidate.

Prompt must not carry projection from the discarded candidate.

Conceptual flow:

```text
same predecessor committed snapshot
-> rebuild temporal plan
-> serialize current candidate plan
```

No extra prompt history is needed.

## 58. Replacement of committed output

When a committed output is replaced:

```text
predecessor snapshot
-> T1-C rebuild
-> new effective plan
-> new prompt projection
```

Do not retain old committed projection as current truth.

## 59. Representation-only edit

If semantic temporal state is unchanged:

```text
projection semantic value unchanged
```

Exact byte formatting may remain canonicalized by Prompt.

No temporal revision change is required for mere representation changes.

## 60. Semantic temporal edit

If the edit changes temporal meaning through a supported source surface:

```text
rebuild Time state/constraint
-> regenerate projection
```

Prompt does not patch old projection text incrementally.

## 61. Reload behavior

Reload receives already-normalized T1 state.

Projection is recomputed from current state/request facts.

Do not persist prompt text as temporal state.

Do not rescan chat to reconstruct projection.

## 62. Cache ABI baseline

Current cache work treats Prompt output as exact-byte observable ABI.

Existing fixtures include:

```text
A2 exact-byte prompt fixtures
A3 semantic shadow descriptors
```

Current descriptors classify lines including:

```text
korean_age_offset
current_korean_age
world_year
current_timeline_anchor
```

A T1-D implementation will therefore have explicit cache/ABI impact.

## 63. Prompt compiler version impact

If implementation changes canonical prompt bytes/ordering/line families, T1-E must decide whether the existing compiler-version contract requires a version increment.

Do not silently change exact-byte ABI while leaving fixtures stale.

## 64. A2 fixture impact

Implementation must add/update exact-byte cases for at least:

```text
no temporal projection
exact current
DATE_ONLY
range
relative-only
retrospective
age relevant
age irrelevant
post-B_END effective floor
Mode B suppression
```

## 65. A3 descriptor impact

A3 semantic descriptor taxonomy must map any new line family.

Potential old descriptors may become superseded rather than duplicated.

The exact descriptor IDs belong to T1-E.

## 66. Runtime prompt budget telemetry

Existing runtime prompt budget telemetry already identifies categories such as age/world-year.

T1-D implementation must update budget classification so the new temporal projection remains observable.

Desired metrics:

```text
T1 temporal lines count
T1 temporal bytes
age line present boolean
projection reason category internal telemetry
```

Projection reason telemetry stays internal and is not injected.

## 67. No provider-cache claim

Prompt byte reduction may improve cache characteristics, but T1-D does not claim provider-cache benefits.

Provider behavior remains separately evidenced.

## 68. Existing narrative-clock owner tests remain owner tests

The permanent `narrative-clock` fixture protects Time/Lifecycle behavior.

Do not rewrite it into giant prompt snapshots.

T1-D needs a separate bounded prompt projection fixture family or extension only for serialization behavior.

## 69. Required regression family: zero projection

Case:

```text
state temporal = unknown/uninitialized
no current temporal source
no age relevance
mode A
```

Expected:

```text
T1-D dynamic lines = 0
```

This is the canonical zero-injection proof.

## 70. Required regression family: exact

Case:

```text
head exact 21:55
mode A
```

Expected:

```text
one temporal core line
no duplicate world-year semantic line solely due to T1
no derived age line unless relevant
```

## 71. Required regression family: exact pending target

Case:

```text
head 21:00
user +2h
Time target 23:00
```

Expected:

```text
23:00 projected
21:00 not separately projected as current
+2h arithmetic not delegated to model
```

## 72. Required regression family: DATE_ONLY

Expected:

```text
date projected
clock unknown
no midnight fabrication
```

## 73. Required regression family: range

Expected:

```text
range projected once
compatible narrowing allowed
no midpoint collapse
```

## 74. Required regression family: relative-only

Expected:

```text
relation + anchor
exact unresolved
anchor not mistaken for current time
```

## 75. Required regression family: stale exact uncertainty guard

Case:

```text
previous exact anchor exists
current T1 state becomes unknown/relative in a way that makes old exact stale
```

Expected:

```text
old exact not emitted as current
bounded uncertainty guard emitted only if needed
```

## 76. Required regression family: retrospective exact

Expected:

```text
one combined event+present line
no duplicate present-head line
```

## 77. Required regression family: retrospective range

Expected:

```text
event range preserved
present head preserved
no fake exact event
```

## 78. Required regression family: retrospective exit

Expected:

```text
retrospective line disappears
ordinary present-head line returns
```

## 79. Required regression family: age absent

Case:

```text
authoritative birthDate exists
no age relevance
```

Expected:

```text
no derived-age line
```

## 80. Required regression family: age exact

Case:

```text
authoritative birthDate
exact depicted date
explicit age request
```

Expected:

```text
one derived-age line
correct full-years result
```

## 81. Required regression family: age range

If temporal range crosses birthday:

```text
age range emitted
scalar guess forbidden
```

## 82. Required regression family: retrospective age

Expected:

```text
age derived from retrospective event date
not present head
```

## 83. Required regression family: missing birthDate

Expected:

```text
no fake derived age
no card/lore scraping
```

## 84. Required regression family: post-B_END target subsumes floor

Expected:

```text
stronger compatible exact target only
no duplicate floor line
```

## 85. Required regression family: post-B_END floor-only

Expected:

```text
one minimum relation line
not equality
```

## 86. Required regression family: Mode B normal

Expected:

```text
0 narrative T1 timestamp lines
Broadcast airtime semantics unchanged
```

## 87. Required regression family: Mode B narrative content relevance

Case:

```text
explicit age request or retrospective depicted context
```

Expected:

```text
bounded depicted-context projection allowed
Broadcast timestamp semantics unchanged
```

## 88. Required regression family: no legacy stacking

Expected:

```text
new T1 semantic core and legacy semantic trio do not coexist for same fact
```

Migration may temporarily choose either representation, not both.

## 89. Required regression family: no internal metadata leak

Prompt must not contain:

```text
temporal revision
baseRevision
source id
lineage id
parser match details
repair disposition
migration reason
```

## 90. Required regression family: deterministic ordering

Repeated identical semantic input produces identical T1-D serialization bytes.

This supports cache observability and fixture stability.

## 91. Required regression family: line budget

All supported first-slice cases prove:

```text
T1-D dynamic line count <= 2
```

## 92. Required regression family: no new storage read

Prompt projection consumes already-available state/request facts.

It must not add a pluginStorage read merely to assemble temporal prompt text.

## 93. Required regression family: no history rescan

Instrumentation/static contract should prove no whole-history temporal projection scan is introduced.

## 94. Performance posture

T1-D itself should be nearly free.

Expected work:

```text
constant-size state inspection
small branch selection
small deterministic serialization
optional bounded age fact formatting
```

Expensive anti-patterns:

```text
history scans
semantic NLP pass
large object serialization
unbounded character-age list
full provenance formatting
```

## 95. Memory posture

T1-D adds no persistent prompt projection state.

Projection is request-scoped and recomputable.

No new temporal ledger is created.

## 96. Failure posture

If projection facts are malformed or internally contradictory:

- Prompt must not repair them semantically;
- fail closed to owner-level disposition/diagnostic path;
- do not invent a replacement time;
- do not serialize a misleading partial state.

T1-E decides exact runtime failure plumbing.

## 97. Relationship to deterministic-state umbrella

T1-D is the first concrete proof of the broader rule:

```text
rich internal state
-> sparse relevant projection
```

Future non-temporal domains should reuse the principle only after T1 demonstrates it successfully.

Do not prematurely build a generic projection framework.

## 98. What T1-D deliberately does not solve

Not included:

- arbitrary date extraction;
- legal age conventions;
- daypart-to-clock conversion;
- timezone/DST;
- wall time;
- event scheduling;
- memory ranking;
- semantic character-card parsing;
- general prompt compression;
- generic Derived-State prompt bus.

## 99. Acceptance decisions

```text
semantic owner = TIME
projection owner = PROMPT
request-scoped projection plan = YES
normal temporal core line budget = 1
optional derived-age line budget = 1
total dynamic T1-D line budget = 2
zero relevant temporal fact -> zero new T1-D lines = REQUIRED
state dump = REJECTED
whole-history relevance scan = REJECTED
prompt-side arithmetic = REJECTED
prompt-side retrospective inference = REJECTED
provenance/diagnostics injection = REJECTED
legacy semantic stacking = REJECTED
model-authored compatible narrowing = PRESERVED
unknown/default placeholder spam = REJECTED
retrospective event + present head = ONE COMBINED CORE LINE
age derived only when relevant = REQUIRED
Mode B airtime separation = PRESERVED
post-B_END provenance injection = COMPACT TO EFFECTIVE CONSTRAINT
persistent projection state = REJECTED
new storage read = REJECTED
provider-cache benefit claim = NONE
implementation authority = NONE
runtime change = NONE
release change = NONE
```

## 100. Implementation impact map to carry into T1-E

T1-E must inspect concrete production impact for:

```text
Time export / projection-ready view
Prompt compiler temporal lines
legacy korean_age_offset/world_year/current_korean_age lines
current_timeline_anchor semantic trio
post_b_end prompt lines
prompt compiler version
A2 exact-byte fixtures
A3 descriptors
prompt budget telemetry
narrative-clock owner fixtures
new T1 projection regressions
latest.js/install.js identity
```

## 101. T1-E entry criteria

Before implementation is authorized, T1-E must define:

- exact functions to modify;
- migration strategy for existing state;
- compatibility treatment for `narrativeTimestamp`, `worldYear`, `koreanAgeOffset`;
- exact first runtime slice;
- static/unit/permanent regression cases;
- prompt ABI fixture changes;
- performance ceilings;
- version/release candidate;
- rollback criteria;
- real long-chat validation plan.

## 102. Next transaction

Expected next design seam:

```text
T1-E INTEGRATION / IMPLEMENTATION SLICE + REGRESSION / PERFORMANCE PLAN
```

Runtime implementation remains unauthorized until an explicit later implementation transaction.

## 103. Classification

```text
program: SIMCORE_TEMPORAL_AWARENESS_T1
transaction: T1-D_RELEVANCE_FILTERED_TEMPORAL_PROMPT_PROJECTION
semantic owner: TIME
projection owner: PROMPT
state growth: NONE
projection state persistence: NONE
history scan: NONE
normal temporal lines: <= 1
optional age lines: <= 1
total dynamic T1 lines: <= 2
implementation authority: NONE
runtime change: NONE
prompt compiler change: NONE
release change: NONE
production impact: NONE
```