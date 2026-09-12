# SimCore T4 Structured Birth-Date / Deterministic Derived Age Architecture

Date: 2026-09-11
Status: `T4 DESIGN · UMBRELLA ARCHITECTURE · NO RUNTIME AUTHORITY · NO PROMPT/RUNTIME/RELEASE CHANGE`
Tracking: #2009
Parent Temporal program: #1763
Deterministic State Support umbrella: #1768
T3 umbrella: #1825
T3-D integration plan: #1996 / PR #2002

---

## 1. Purpose

T4 activates one deliberately deferred Temporal family:

```text
structured authoritative birthDate
+ applicable canonical narrative/event date
-> deterministic full-years-since-birth derivation
```

The purpose is to remove repeated age arithmetic from the renderer while preserving uncertainty, source authority, narrative-lane meaning, and prompt compactness.

T4 is intentionally narrow.

It is not:
- a generic person/profile database;
- a generic Derived-State engine;
- a legal-age system;
- a culture-specific age system;
- a birthday/event scheduler;
- a prose-mining system;
- an audience-knowledge system.

---

## 2. Fresh authority at T4 architecture materialization

Repository authority was re-read before creating this document.

```text
main = 0c3abb6feb6d7414f0e833a910e215248c4bd141
main Required = PASS / run 34547337282
#485 = UNKNOWN / STABLE / Production MATCH
production = v0.70.11
release-simcore = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
release blob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
manifest validation = PENDING_REAL_LONG_CHAT
```

These are current authority facts for this design transaction, not runtime authorization.

Current known runtime-entry blockers remain separate:

```text
#1822 = OPEN / temporal fail-closed publication transport dependency
#1660 = OPEN / visible internal: planning-control alias / advancement hold
```

T4 does not repair either issue.

---

## 3. Product principle

T4 follows the same SimCore split as the rest of Deterministic State Support:

```text
facts / rules / deterministic arithmetic
-> SimCore

interpretation / emotion / prose / creative rendering
-> main model
```

For age specifically:

```text
birth anchor + narrative date -> deterministic arithmetic
```

belongs to SimCore.

How a character feels about that age, how the prose describes maturity, and whether the story mentions age at all remain renderer/story concerns subject to existing rules.

---

## 4. Semantic ownership

T4 extends the existing **Time** semantic owner.

```text
Time
= birth-date normalization boundary
= applicable-date selection contract consumer
= full-years derivation
= age-result precision classification
```

Other modules remain narrow:

```text
Lifecycle / request source adapter
= may carry already-authorized structured birth anchors
!= age semantic owner

State Reconcile / Kernel
= schema/default/migration composition only
!= age semantic owner

Prompt
= serializer only
!= age calculator

Structure
= judge only where a visible/canonical age contract eventually exists
!= age calculator

Output Finalize
= transaction executor only
!= age semantic owner

Exposure / Knowledge
= audience-knowledge authority
!= age arithmetic owner
```

T4 must not create a parallel `Age` state-machine module merely because the output value is called age.

---

## 5. Core derivation model

The canonical mathematical derivative is:

```text
fullYearsElapsedSinceBirth
```

Inputs:

```text
BirthAnchor
+ ApplicableTemporalDate
```

Output family:

```text
EXACT_INTEGER
BOUNDED_INTEGER_RANGE
UNKNOWN
```

Conceptually:

```js
DerivedFullYears =
  | { kind: 'EXACT_INTEGER', value: number }
  | { kind: 'BOUNDED_INTEGER_RANGE', lower: number, upper: number }
  | { kind: 'UNKNOWN' }
```

This shape is conceptual design vocabulary, not a frozen runtime ABI.

---

## 6. Derived, not canonical duplicated truth

T4 does not persist `currentAge` as an independent mutable fact.

Preferred model:

```text
authoritative birthDate
+ current applicable TemporalPosition
-> recompute fullYearsElapsedSinceBirth when relevant
```

Why:
- avoids age/date divergence;
- avoids a birthday-crossing state machine;
- avoids double mutation on reroll/edit;
- keeps persistence compact;
- preserves one temporal source of truth.

If a future implementation needs a bounded cache, that cache must be disposable and derivable, not a competing canonical truth source.

---

## 7. BirthAnchor authority

T4 requires a **structured, authorized, subject-bound** birth anchor.

Minimum semantic shape:

```js
BirthAnchor = {
  subjectKey: string,
  birthDate: 'YYYY-MM-DD'
}
```

Again, this is conceptual and does not freeze a production schema key.

Required properties:
- subject identity is deterministic;
- date is complete enough for full-years mathematics;
- source class is explicitly authorized;
- invalid calendar dates fail closed;
- source is not inferred from free prose.

---

## 8. First-family accepted source classes

T4-A must freeze the exact adapter contract, but the umbrella permits only source families equivalent to:

```text
AUTHORIZED_STRUCTURED_CONFIG
AUTHORIZED_STRUCTURED_CHARACTER_METADATA
SUPPORTED_EDIT_REBUILD_OF_AUTHORIZED_STRUCTURED_SOURCE
```

Any production-specific source surface must be proven current before implementation.

The umbrella does **not** authorize arbitrary host metadata merely because it is structured. Structure alone is not authority.

---

## 9. Rejected birthDate sources

The following are not automatic BirthAnchor authority:

```text
character card prose
lorebook prose
assistant prose
COMMUNITY prose
Knowledge prose
quoted dialogue
historical assistant output
approximate age descriptions
"looks 20"
age claims such as "I am 22"
inferred birthday from age + year
worldYear
koreanAgeOffset
wall clock
profile text found by whole-message scan
```

A future explicit user/config source may state a birth date, but the adapter must be bounded and intentional rather than a generic prose extractor.

---

## 10. Subject identity is separate from display name

T4 must not use free-form display-name equality as canonical subject identity.

Required conceptual distinction:

```text
subjectKey = stable bounded identity used by SimCore
subjectLabel = optional renderer-facing display label
```

Consequences:
- two characters with the same visible name must not collide;
- renamed display text must not silently create a new birthday identity;
- aliases must not be automatically merged by NLP;
- unsupported/ambiguous subject identity fails closed.

The exact subject-key source belongs to T4-A.

---

## 11. Bounded subject count

T4 first family must keep the active derived-age working set bounded.

Default target:

```text
current request relevant subjects = small bounded set
prompt age lines = max 1
```

This does not forbid SimCore from having several authorized birth anchors in configuration, but a request must not dump all birthdays/ages into the prompt.

If multiple subjects are relevant to one request, T4-A/C must define deterministic selection or explicit unsupported behavior rather than silently emitting an unbounded list.

---

## 12. Applicable temporal basis

Age is not meaningful without naming **which date question** is being answered.

T4 uses explicit semantic roles:

```text
PRESENT_WORLD
DEPICTED_EVENT
```

### PRESENT_WORLD

```text
basis = temporal.head
```

Used for questions such as:
- current age in the present narrative;
- whether the present narrative date has passed the birthday;
- present-world full-years value.

### DEPICTED_EVENT

When T3 retrospective context is active:

```text
basis = temporal.context.position
```

Used for questions such as:
- age in the depicted flashback;
- age at the currently depicted historical event.

---

## 13. No implicit basis switching

The renderer does not choose the age basis by printing a date.

The prompt does not choose the age basis by whichever date string is nearby.

The contract order is:

```text
request semantics / current scene routing
-> choose age question basis
-> obtain canonical TemporalPosition
-> Time derives full years
-> projection serializes result if relevant
```

This inherits the T3 rule that routing chooses the lane before candidate content is interpreted.

---

## 14. Present vs retrospective example

Canonical state:

```text
birthDate = 2008-03-10
present head = 2031-03-12
retrospective context = 2028-03-08
```

Then:

```text
PRESENT_WORLD full years = 23
DEPICTED_EVENT full years = 19
```

Both can be mathematically true for different semantic questions.

Neither replaces the other.

---

## 15. Exact full-years rule

For a valid full birth date `(Yb, Mb, Db)` and applicable exact/date target `(Yt, Mt, Dt)`:

```text
base = Yt - Yb

if target date is before the target-year anniversary boundary:
  result = base - 1
else:
  result = base
```

T4 inherits T1-B calendar validity and leap-year behavior.

If the target date precedes the birth date in absolute chronology, the derivation is invalid for ordinary elapsed-years semantics and must fail closed rather than return a negative character age automatically.

Exact invalid-target disposition belongs to T4-B.

---

## 16. Feb 29 mathematical convention

T4 inherits the already-selected T1-B convention:

```text
birthDate = Feb 29
non-leap target year
full-years anniversary boundary = March 1
```

Examples:

```text
birthDate 2008-02-29
activeDate 2031-02-28
-> 22

birthDate 2008-02-29
activeDate 2031-03-01
-> 23
```

This is only a deterministic mathematical convention for this derivative.

It must not be described as a jurisdictional legal rule or cultural age rule.

---

## 17. DATE_ONLY sufficiency

Full-years age usually does not require a clock time.

Therefore:

```text
birthDate exact
+ TemporalPosition DATE_ONLY
```

may still produce an exact integer if the date itself proves which side of the birthday boundary applies.

T4 must not invent midnight.

---

## 18. BOUNDED_RANGE derivation

For a bounded date interval, Time derives the set/envelope of possible full-years values over the entire interval.

Examples:

```text
birthDate = 2008-03-10
range = 2031-03-01 .. 2031-03-09
-> 22 exact

range = 2031-03-10 .. 2031-03-15
-> 23 exact

range = 2031-03-08 .. 2031-03-12
-> 22..23 bounded
```

No midpoint, earliest-only, latest-only, or arbitrary endpoint choice.

---

## 19. Minute-range behavior

If a TemporalPosition range has minute precision but spans dates, age mathematics projects onto the covered calendar-date set.

If all possible instants lie on one side of the birthday boundary, exact age is allowed.

If possible instants cross the boundary, the result remains bounded.

No extra birthday-time precision is invented because T4 birth anchors are date-based first family.

---

## 20. RELATIVE_ORDER_ONLY behavior

A relative temporal relation does not automatically provide enough calendar information for birthday arithmetic.

Examples:

```text
AFTER 2031-03-01
```

with birthday March 10 does not prove whether age is 22 or 23.

Default:

```text
UNKNOWN
```

unless the bounded relation and anchor semantics independently prove a single age value.

T4-B must define any safe closed-form cases explicitly. There is no generic symbolic solver requirement.

---

## 21. UNKNOWN behavior

If either required input is insufficient:

```text
birth anchor missing/invalid/ambiguous
OR
applicable temporal date cannot prove an age result
```

then:

```text
fullYearsElapsedSinceBirth = UNKNOWN
```

UNKNOWN is a valid outcome.

It must not trigger:
- age guessing;
- fallback to `koreanAgeOffset`;
- fallback to world-year subtraction;
- fallback to prose age claims.

---

## 22. BirthAnchor conflicts

If two simultaneously authoritative structured sources disagree for the same subject, T4 must not pick the convenient one silently.

Required first response:

```text
CONFLICT / NO DERIVATION
```

T4-A must define source precedence only if the owning configuration contract already provides legitimate precedence.

Otherwise authority divergence must be repaired at the source boundary.

---

## 23. Invalid birth dates

Examples:

```text
2009-02-29
2031-13-01
2031-04-31
```

must not normalize silently.

Disposition:

```text
INVALID_BIRTH_ANCHOR
-> no derived age
```

No clamp-to-month-end behavior.

---

## 24. Birth date changes

An explicitly authorized source edit that changes birthDate changes future derived age results.

T4 should not persist a separate age mutation.

Conceptually:

```text
birth anchor edit
-> source authority changes
-> next derivation recomputes
```

The exact edit-rebuild/source-version behavior belongs to T4-A/D.

---

## 25. Reroll safety

Because derived age is not independently committed:

```text
discarded model candidate
!= birthDate mutation
!= age mutation
```

A reroll from the same predecessor uses the same authoritative birth anchor and same effective Temporal basis unless the replacement request itself changes an authorized input.

No double-age advancement is possible merely from reroll count.

---

## 26. Representation-only edit

A representation-only assistant edit does not change:
- birthDate authority;
- TemporalPosition;
- derived age semantics.

Therefore age derivation remains identical.

---

## 27. Semantic temporal edit

If an authorized semantic edit changes the applicable narrative/event date:

```text
predecessor rebuild
-> Time reconstructs effective TemporalPosition
-> age recomputes from unchanged birthDate
```

No stored `currentAge` repair is required because no independent age truth exists.

---

## 28. Semantic birth-anchor edit

If an authorized structured source edit changes the birth date:

```text
source adapter rebuild
-> new BirthAnchor
-> future/rebuilt age derivation uses new anchor
```

Historical assistant prose is not scanned to repair age mentions.

---

## 29. Reload behavior

Reload uses:
- persisted/current authorized structured birth source;
- persisted canonical Temporal state.

It must not scan chat history to rediscover birthdays.

A reload must not promote old prose claims into structured birth authority.

---

## 30. worldYear boundary

`worldYear` may be a compatibility consumer/summary of present temporal state, but it is insufficient for birthday-aware full-years age.

Forbidden shortcut:

```text
currentAge = worldYear - birthYear
```

because month/day boundary matters.

---

## 31. koreanAgeOffset boundary

Existing `koreanAgeOffset` is an older compatibility mechanism and remains independent.

Hard rule:

```text
koreanAgeOffset
!= fullYearsElapsedSinceBirth
```

T4 does not:
- derive one from the other;
- migrate one into the other;
- delete the compatibility field;
- label `koreanAgeOffset` as international/full age.

Any future retirement of legacy compatibility is a separate transaction.

---

## 32. Relevance-filtered projection

An authoritative birthDate does not automatically enter the model prompt.

Default:

```text
birthDate exists
+ age irrelevant this turn
-> 0 age lines
```

This preserves T1-D prompt minimization.

---

## 33. First-family relevance triggers

T4 inherits/clarifies bounded triggers equivalent to:

```text
EXPLICIT_AGE_REQUEST
STRUCTURED_AGE_DEPENDENCY
FUTURE_DEDICATED_AGE_OUTPUT_SURFACE
```

T4-C must bind these to deterministic request/config surfaces rather than a Prompt-level free-form semantic search.

---

## 34. Projection line budget

Target dynamic Temporal budget remains:

```text
scene line = 0 or 1
age line   = 0 or 1
```

T4 must not dump:
- birthDate;
- source IDs;
- provenance;
- subject registries;
- derivation traces;
- candidate alternatives;
- all configured character ages.

---

## 35. Conceptual exact projection

A possible semantic form remains:

```text
temporal_age=Character:22;scope=present_world
```

or:

```text
temporal_age=Character:19;scope=depicted_scene
```

Exact serialization is T4-C scope and is not frozen here.

---

## 36. Conceptual range projection

If age is bounded:

```text
temporal_age=Character:22..23;scope=depicted_scene
```

The renderer must not be instructed to choose one endpoint as canonical truth.

Exact syntax remains T4-C scope.

---

## 37. UNKNOWN projection

Default UNKNOWN age result:

```text
0 age lines
```

unless a targeted anti-stale guard is proven necessary to prevent an older exact age prompt surface from leaking into the current request.

If such a guard is ever needed, T4-C must define it narrowly and account for prompt ABI impact.

---

## 38. Present and depicted age simultaneously

During retrospective scenes, depicted age is normally the relevant age if age is needed.

Present age is omitted by default.

If the current request genuinely compares then-vs-now age, T4-C must preserve the global max-one-age-line target by using one compact combined semantic unit rather than two independent age subsystems/lines where possible.

If that cannot be done without ambiguity, the first family may explicitly not support simultaneous dual-age projection.

Do not silently break the line budget.

---

## 39. Mode A

Mode A may consume T4 age projection when relevant and source-backed.

Ordinary turns with no age relevance receive no age line.

---

## 40. Mode B

Broadcast airtime remains independent from narrative age basis.

```text
Broadcast airtime
!= birth-age temporal basis
```

If a Mode B scene has a separately established depicted narrative TemporalPosition in a future live T3 runtime, age may be derived only from that narrative basis, never from Broadcast airtime.

T4 does not make Broadcast timestamp a birth-age clock.

---

## 41. Mode C

Mode C may consume derived age for renderer continuity when relevant.

But temporal truth and audience exposure remain separate.

A derived age being true does not authorize `<COMMUNITY>` to know or state it.

---

## 42. Exposure / Knowledge boundary

Hard invariant:

```text
DERIVED AGE TRUE FOR MODEL/WORLD CONTINUITY
!= CHARACTER MAY KNOW
!= PUBLIC MAY KNOW
!= COMMUNITY MAY USE
```

Exposure/Knowledge remains the audience authority.

T4 does not add:

```text
age_is_public=1
```

or any equivalent automatic exposure bit.

---

## 43. Private structured birthDate

An authorized structured birthDate can be valid SimCore continuity input while remaining private in-world.

Therefore:
- it may support model-side age consistency;
- it must not automatically be quoted to COMMUNITY;
- it must not automatically be rendered as a disclosed birthday;
- it does not become exposed merely because it appeared in the internal prompt.

---

## 44. Candidate contradiction boundary

T4 umbrella does not authorize a global prose age-claim checker.

Future validation may inspect only bounded canonical surfaces if a contract explicitly defines them.

Arbitrary body prose such as:

```text
"스물두 살이었다"
```

must not automatically mutate birthDate or age state.

If a future canonical visible age surface is added, its contradiction handling must respect #1822 fail-closed publication semantics where irreparable conflicts could create visible/internal split truth.

---

## 45. No reverse derivation

Forbidden:

```text
age claim + current date -> inferred birthDate
```

because many birth dates satisfy the same full-years age.

T4 is one-way:

```text
birthDate + date -> age
```

not the reverse.

---

## 46. No birthday event scheduler

T4 may mathematically identify whether a target date lies before/after an anniversary boundary.

That does not create:
- scheduled birthday events;
- automatic celebration scenes;
- recurring calendar jobs;
- wall-clock reminders.

Those are separate semantics.

---

## 47. No legal/cultural age engine

`fullYearsElapsedSinceBirth` is a mathematical elapsed-years derivative.

It is not automatically equivalent to:
- age of majority;
- school-year age;
- legal drinking age;
- military-service age;
- Korean counting age;
- insurance age;
- sports eligibility age;
- platform age eligibility.

Any domain-specific eligibility system would require its own policy authority and contract.

---

## 48. No generic Derived-State engine

T4 remains inside Time because both inputs and the computation are temporal.

The broader Deterministic State Support rule remains:

```text
REUSE > EXTEND > COMPOSE >> NEW
```

A shared derived-state helper remains unjustified until independent domains prove real shared-code pressure.

---

## 49. T4-A scope

**Birth-Date Source / Subject Authority Contract** must freeze:
- exact authorized source surfaces;
- subjectKey semantics;
- source normalization;
- invalid birth-date handling;
- duplicate/conflicting source handling;
- bounded subject selection;
- source edit/reload behavior;
- migration posture;
- explicit rejection of prose/card scraping.

T4-A must answer:

> How does a birth anchor enter Time with deterministic subject identity and authority?

---

## 50. T4-B scope

**Full-Years Derivation / Precision Contract** must freeze:
- exact full-years algorithm;
- target-before-birth invalidity policy;
- birthday boundary rules;
- Feb 29 convention inheritance;
- DATE_ONLY semantics;
- bounded range envelope semantics;
- minute-range projection to dates;
- relative-only safe cases;
- UNKNOWN cases;
- exact/range result representation;
- PRESENT_WORLD vs DEPICTED_EVENT basis selection inputs.

---

## 51. T4-C scope

**Relevance Projection / Mode / Exposure Contract** must freeze:
- exact dynamic age-line grammar;
- max-one-line policy;
- relevance triggers and bounded request surfaces;
- present vs depicted scope serialization;
- optional then-vs-now comparison disposition;
- Mode A/B/C behavior;
- Exposure/Knowledge separation;
- legacy age/world prompt compaction interaction;
- cache exact-byte ABI requirements.

---

## 52. T4-D scope

**Integration / Migration / Regression / Performance Plan** must freeze:
- then-current production source impact map;
- source adapter integration;
- Time implementation seams;
- Prompt/Structure/Finalize interaction;
- schema/version decision if structured birth anchors become SimCore-persisted state;
- edit/reroll/reload/downgrade behavior;
- exact fixture matrix;
- long-chat proof protocol;
- prompt/performance ceiling;
- release-entry and rollback gates.

T4-D must fresh-read the production tip after lower Temporal layers are live; this umbrella does not pre-freeze future symbol names/version numbers.

---

## 53. Persistent-state decision remains deferred

The umbrella does not assume SimCore itself must persist birthDate.

Possible future source ownership patterns include:

```text
external authorized structured config -> request view -> Time derive
```

or, if product requirements prove it necessary:

```text
authorized source -> explicit canonical birth-anchor state -> Time derive
```

T4-A/D must choose based on real source ownership.

Do not add persistent birthDate merely for convenience.

---

## 54. Migration rule

Existing chats without an authorized structured birthDate remain valid.

Migration default:

```text
no authorized birthDate
-> no T4 derived age
```

Never bootstrap birthdays from old assistant/user prose or historical age mentions.

---

## 55. Downgrade safety

If a future runtime understands T4 structured birth anchors and a rollback runtime does not, rollback must not fabricate a legacy age.

Safe degradation preference:

```text
unsupported derived age -> omit / UNKNOWN
```

rather than:

```text
stale currentAge
or worldYear-birthYear shortcut
```

Exact rollback mechanics belong to T4-D after persistence ownership is known.

---

## 56. Prompt/cache posture

T4 follows sparse projection:
- no age line on irrelevant turns;
- no source/provenance dump;
- no derivation trace;
- bounded exact bytes;
- no new cache tier.

If T4 activation changes canonical prompt bytes, implementation must increment the then-current prompt compiler ABI/version according to the owning cache contract and update A2/A3 fixtures atomically.

This design does not choose a future numeric compiler version now.

---

## 57. Performance posture

T4 arithmetic should be O(1) per relevant subject.

Target first-family ceilings:

```text
new whole-history scans = 0
new network calls = 0
new timers/polling = 0
new unbounded ledgers = 0
new auxiliary-model calls = 0
prompt age lines = <= 1
derived-age work = bounded to request-relevant subject set
```

Birth-date validation and date comparison are cheap deterministic operations and should not create persistent telemetry-heavy machinery.

---

## 58. Required regression families

At minimum, future T4 validation must cover:

1. exact ordinary birthday before-boundary age;
2. exact ordinary birthday on-boundary age;
3. exact ordinary birthday after-boundary age;
4. Feb 29 non-leap Feb 28 result;
5. Feb 29 non-leap Mar 1 result;
6. leap-year Feb 29 boundary;
7. invalid birth date rejected;
8. target date before birth rejected/fails closed;
9. DATE_ONLY derives exact age without midnight invention;
10. bounded range entirely before birthday -> exact age;
11. bounded range entirely after birthday -> exact age;
12. bounded range crossing birthday -> bounded age range;
13. relative-only insufficient basis -> UNKNOWN;
14. UNKNOWN temporal basis -> UNKNOWN;
15. missing birthDate -> no derived age;
16. conflicting structured birthDate sources -> no silent choice;
17. prose birthday mention does not create authority;
18. prose age claim does not create/rewrite birthDate;
19. worldYear does not substitute for applicable date;
20. koreanAgeOffset remains unchanged and separate;
21. present-world age uses head;
22. retrospective depicted age uses context;
23. retrospective age does not mutate head/worldYear;
24. explicit present-age question during retrospective uses head when routed PRESENT_WORLD;
25. no relevant age question -> zero age line;
26. exact age relevance -> max one age line;
27. range age relevance -> range preserved in one age line;
28. COMMUNITY does not gain age knowledge from derivation alone;
29. Mode B airtime never becomes age basis;
30. discarded candidate causes no age/birth mutation;
31. reroll recomputes identically from same inputs;
32. representation-only edit preserves derivation;
33. semantic temporal edit recomputes from rebuilt date;
34. authorized birth-anchor edit changes derivation without independent currentAge mutation;
35. reload uses structured source + canonical temporal state, no history scan;
36. no unbounded subject/prompt expansion;
37. no new network/timer/model call;
38. legacy exact Temporal behavior unchanged when age is irrelevant.

---

## 59. Real long-chat proof target

A future T4 live proof should include, after lower Temporal layers are live:

```text
present exact date
-> age before birthday
-> explicit temporal advance across birthday
-> age after birthday
-> DATE_ONLY turn
-> bounded range crossing birthday
-> retrospective enter
-> depicted-event age
-> retrospective continuation
-> explicit present-age comparison/routing
-> exit
-> reroll
-> representation-only edit
-> semantic temporal edit
-> structured birthDate edit if authorized
-> reload
-> Mode B/C continuity/exposure checks
```

The proof must verify both visible output behavior and the canonical state/source evidence available in the then-current diagnostics.

---

## 60. Runtime entry gate

T4 runtime activation requires a fresh implementation-time authority pass.

Minimum conceptual gate:

```text
T1 exact core live-proven
+ required T2 precision/frame runtime live-proven
+ T3 retrospective runtime live-proven for DEPICTED_EVENT support
+ T4-A structured birth source contract implemented/proven
+ #1822 resolved or no-longer-applicable invariant-preserving design
+ #1660 resolved/reclassified if still advancement-holding
+ T4-D merged and current-main healthy enough for entry
+ production authority re-read
+ explicit user runtime authorization
```

A smaller present-only T4 runtime slice may be considered before live T3 only through a separate explicit implementation design that advertises `DEPICTED_EVENT = unsupported`, not by pretending the capability exists.

---

## 61. Runtime/release posture now

This design transaction changes no production behavior.

```text
implementation authority = NONE
runtime source change = NONE
prompt runtime change = NONE
persistent state change = NONE
state version change = NONE
prompt compiler version change = NONE
release-simcore change = NONE
production version change = NONE
```

---

## 62. Relationship to Temporal program

T4 completes the age-derivation family that was deliberately deferred from earlier Temporal slices.

Conceptual Temporal progression remains:

```text
T1 = exact/core Temporal contract
T2 = weak/imprecise current-head precision
T3 = bounded retrospective/event-local context
T4 = structured birthDate + deterministic full-years derivation
```

T4 does not imply the entire broader Deterministic State Support roadmap is complete.

Numeric progression and other domains remain separately owned work.

---

## 63. Architecture acceptance target

T4 umbrella architecture is ready for acceptance when repository review proves:

```text
one Time owner retained
structured birth authority required
subject identity separated from display prose
fullYearsElapsedSinceBirth remains derived, not duplicated state
PRESENT_WORLD vs DEPICTED_EVENT basis explicit
all T2 precision families handled truthfully
Feb 29 mathematical convention preserved
koreanAgeOffset separated
prompt projection optional and bounded
Exposure/Knowledge separated
no generic prose scan / profile DB / Derived-State engine
runtime gates preserved
no production mutation
```

---

## 64. Next design transaction

After this umbrella is accepted, the next bounded design transaction is:

```text
T4-A
Birth-Date Source / Subject Authority Contract
```

It must answer the unresolved ingress question before T4 arithmetic is considered implementation-ready:

> Which exact structured source is allowed to establish `subjectKey + birthDate`, how are conflicts/edits/reloads handled, and how does that bounded authority reach Time without creating a second state owner?

---

## 65. Final status

```text
program = SIMCORE_TEMPORAL_AWARENESS_T4
T4 umbrella = DESIGN CAPTURED
T4-A = NOT STARTED
T4-B = NOT STARTED
T4-C = NOT STARTED
T4-D = NOT STARTED
implementation authority = NONE
runtime change = NONE
prompt runtime change = NONE
release change = NONE
production = v0.70.11 unchanged
```
