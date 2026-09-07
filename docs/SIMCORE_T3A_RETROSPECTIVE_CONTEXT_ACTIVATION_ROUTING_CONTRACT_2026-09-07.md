# SimCore T3-A Retrospective Context Activation / Routing Contract

Date: 2026-09-07
Status: `T3-A DESIGN · NO RUNTIME IMPLEMENTATION AUTHORITY · NO PROMPT/RUNTIME/RELEASE CHANGE`
Tracking: #1830
Parent T3 umbrella: #1825 / PR #1826
Parent Temporal program: #1763
T1-A state/schema: #1780 / PR #1781
T1-B arithmetic: #1783 / PR #1784
T1-C source/disposition: #1786 / PR #1787
T2 umbrella: #1799
T2 runtime candidate-rejection blocker: #1822
Product advancement hold: #1657

## 1. Purpose

T3-A activates the **routing semantics** of the retrospective context already designed by T1-A.

It answers only these questions:

1. What source is strong enough to enter a retrospective depicted scene?
2. While that scene is active, which temporal lane receives ordinary current-scene time transitions?
3. What source is strong enough to exit back to the present?
4. How does an exit combine atomically with a present-current transition?
5. How are ambiguous historical references, nested flashbacks, rerolls, edits and reloads handled without a timeline database?

T3-A does not define visible frame bytes, prompt serializer bytes, runtime publication transport, cache ABI, versioning or release execution.

Core rule:

```text
RETROSPECTIVE IS A ROUTING STATE
NOT A SECOND PRESENT HEAD
```

## 2. Fresh authority

At T3-A start:

```text
main               = 0c9040290ff8636a82a1bae980b8c1e1fdecfb76
production version = v0.70.10
release-simcore    = ecc55f026315c6482c34d267aba2adb97527cdbc
```

Fresh issue readback also confirms:

```text
#1822 = OPEN / T2-T3 runtime activation blocker
#1657 = OPEN / NEXT_PRODUCT_ADVANCEMENT HOLD
```

Therefore this transaction is design-only.

## 3. Inherited bounded state

T3-A reuses the T1-A shape without adding a persistent field:

```js
temporal: {
  schemaVersion: 1,
  revision: number,
  head: TemporalPosition,
  headSource: TemporalSourceStamp | null,
  context: {
    kind: 'RETROSPECTIVE',
    position: TemporalPosition,
    source: TemporalSourceStamp,
    enteredFromRevision: number
  } | null
}
```

Hard invariants:

```text
head = present narrative authority
context.position = currently depicted retrospective event position
context = null = ordinary present depiction
```

No duplicate `returnHead` exists because `head` never stops being the present-return authority.

## 4. Temporal topology ceiling

T3 first family permits only:

```text
1 present head
+ 0 or 1 retrospective context
+ existing independent Broadcast airtime lane
```

Rejected architecture:

```text
context stack
nested flashback stack
multiple active event clocks
event list
timeline graph
world-history database
whole-chat reconstructed chronology
```

The design stays constant-size.

## 5. Routing state machine

Canonical routing is determined **before arithmetic**.

```text
STATE: PRESENT
  CURRENT_SET_OR_ADVANCE         -> HEAD
  RETROSPECTIVE_ENTER            -> CONTEXT ENTER
  EVENT_REFERENCE_ONLY           -> NO MUTATION
  NON_ASSERTIVE                  -> NO MUTATION
  AMBIGUOUS                      -> NO MUTATION

STATE: RETROSPECTIVE
  ORDINARY CURRENT-SCENE TIME    -> CONTEXT UPDATE
  RETROSPECTIVE CONTINUE         -> CONTEXT UPDATE
  RETROSPECTIVE EXIT             -> CONTEXT EXIT, HEAD KEEP
  EXIT + PRESENT TRANSITION      -> CONTEXT EXIT + HEAD REPLACE
  EVENT_REFERENCE_ONLY           -> NO MUTATION
  NON_ASSERTIVE                  -> NO MUTATION
  NEW NESTED RETROSPECTIVE       -> FAIL CLOSED
```

The active lane selection is semantic, not derived from whichever timestamp looks newest or oldest.

## 6. Entry requires depiction authority

A retrospective is not created merely because the user mentions the past.

The bounded current-turn source must establish that the **depicted scene itself** moves into a retrospective event.

Eligible conceptual controls include:

```text
회상 장면: 2028-03-04
3년 전의 장면으로 넘어간다
그 시절의 장면으로 전환한다
과거의 그 장면을 직접 이어서 묘사한다
그때의 장면으로 돌아가서, ...
```

The exact Korean/English bounded grammar remains Time-owned implementation detail, but the semantic requirement is fixed:

```text
historical reference
+
scene depiction control
```

The source must fit the already-bounded T1-C extraction surface. No full-message or full-history classifier is authorized.

## 7. Historical reference alone is insufficient

These do not enter retrospective context by themselves:

```text
예전에 그런 일이 있었다
3년 전을 떠올린다
그는 2028년을 기억했다
2028년 사건을 이야기한다
어릴 적 사진을 본다
과거를 회상한다
"그때로 돌아가고 싶어"
그때는 행복했지
```

They may be narrative content, memory, dialogue, event reference or thought, but they do not prove that the current depicted scene has changed lanes.

This distinction is mandatory:

```text
CHARACTER REMEMBERS PAST
!=
RENDERER IS NOW DEPICTING PAST EVENT
```

## 8. Assistant prose cannot enter context

Arbitrary assistant body text has no entry authority.

Examples that do not create context by themselves:

```text
몇 년 전의 기억이 떠올랐다.
장면은 과거처럼 느껴졌다.
그녀는 어린 시절을 생각했다.
```

A historical canonical temporal header also does not create context unless the current request already supplied or otherwise authorized a retrospective route.

This prevents an assistant-authored older timestamp from silently regressing routing state.

## 9. Entry position derivation

Once `RETROSPECTIVE_ENTER` is proven, Time derives the strongest truthful `context.position` using inherited T1/T2 precision semantics.

### 9.1 Absolute exact entry

```text
present head = 2031-03-07 21:00
source = 회상 장면: 2028-03-04 13:30

context.position = 2028-03-04 13:30 EXACT_MINUTE
head             = 2031-03-07 21:00 unchanged
```

### 9.2 Absolute date-only entry

```text
source = 회상 장면: 2028-03-04

context.position = 2028-03-04 DATE_ONLY
```

No midnight/noon is invented.

### 9.3 Exact relative past entry

```text
head = 2031-03-07 21:00
source = 3년 전의 장면으로 넘어간다
```

When T1-B strict calendar arithmetic can derive a valid target:

```text
context.position = derived position
```

The negative delta is routed to context and therefore does not represent present-head regression.

### 9.4 Invalid strict calendar target

If exact month/year arithmetic is invalid under T1-B `STRICT_PRESERVE_COMPONENTS`, T3-A must not clamp.

Example conceptually:

```text
head = leap-day-sensitive exact point
source = 1년 전의 장면으로
exact target invalid under strict policy
```

If retrospective depiction and backward direction remain strongly proven, the context may degrade only to the strongest safe weaker relation allowed by T1/T2.

No end-of-month or guessed calendar target is created.

### 9.5 Bounded entry

An explicit bounded past source may create a bounded context position.

The full possibility envelope is retained.

No midpoint is chosen.

### 9.6 Vague past entry

```text
오래전의 장면으로 넘어간다
```

If scene-control authority and past direction are both proven but duration is not numeric:

```text
context.position = RELATIVE_ORDER_ONLY BEFORE <safe present anchor>
```

when a safe anchor can be represented.

If the present position cannot be represented as an absolute anchor, T3 may retain relation to the predecessor temporal revision through the existing compact `basisRevision` semantics.

### 9.7 Unknown entry

If explicit retrospective depiction is proven but no usable date/range/relation magnitude exists:

```text
context.position = UNKNOWN
```

This is permitted.

Arithmetic uncertainty does not erase a strongly proven scene-lane transition.

It only prevents fake temporal precision.

## 10. Retrospective position compatibility with present head

`RETROSPECTIVE` semantically denotes a past/recollection lane.

When present head and proposed context position are sufficiently comparable, a direct contradiction must fail closed.

Example:

```text
head = 2031-03-07 EXACT
source says retrospective
proposed exact event = 2032-01-01
```

This is not accepted as an ordinary retrospective position.

Classification concept:

```text
RETRO_POSITION_CONFLICT
```

When precision is insufficient to prove contradiction, do not fabricate one.

A same-date retrospective may be valid when clock precision cannot determine ordering.

## 11. `enteredFromRevision`

On accepted entry:

```text
pre-entry temporal.revision = R
context.enteredFromRevision = R
commit revision             = R + 1
```

`enteredFromRevision` remains unchanged during continuation updates.

It means:

```text
which committed temporal generation the context was entered from
```

It does not mean:

```text
return pointer
global event id
chat index
wall-clock time
```

On a reroll replacement rebuilt from the same predecessor, the replacement may legitimately use the same `enteredFromRevision`.

## 12. Source stamp behavior

No new source-stamp enum is required by T3-A.

The context already has:

```text
kind: 'RETROSPECTIVE'
```

for routing semantics.

Its `source.kind` continues to describe the underlying temporal evidence through the existing bounded T1-A source family, for example user absolute, user relative, output canonical, edit rebuild or config anchor where applicable.

On semantic context update:

```text
context.source = latest accepted source stamp for that context position
```

while:

```text
context.enteredFromRevision = original entry revision
```

No raw prose is stored.

## 13. Continuation default while retrospective is active

While `context != null`, the active depicted scene is the retrospective event.

Therefore a normal current-scene temporal transition defaults to **context**, not head.

Example:

```text
head    = 2031-03-07 21:00
context = 2028-03-04 13:00
user    = 2시간 뒤, ...
```

Result proposal:

```text
head    = KEEP 2031-03-07 21:00
context = 2028-03-04 15:00
```

This is the central T3-A routing rule.

## 14. Date/range/relative continuation inside context

Every T2 precision class is legal inside the active context.

Examples:

### exact -> exact

```text
2028-03-04 13:00 + 2h
-> 2028-03-04 15:00 EXACT_MINUTE
```

### exact -> date-only

An authoritative context-local source may weaken precision if that is the strongest truth.

### date-only -> bounded

Sub-day arithmetic from date-only may widen to a bounded date set exactly as T1-B/T2 require.

### exact -> relative-only

```text
context exact
+ 한참 뒤
-> context RELATIVE_ORDER_ONLY AFTER prior event position
```

### no evidence

```text
head = same
context = same
revision = same
```

No turn-count progression is introduced.

## 15. Local backward movement inside retrospective

A retrospective context is an event-local depicted lane, not the global present head.

Therefore a source-backed current-scene reset to an earlier event-local point may replace `context.position` without constituting **present-head regression**.

Example concept:

```text
active context = 2028-03-04
user explicitly establishes current depicted event = 2028-03-03
```

This may be a valid context update if T1-C routing proves it is the current depicted retrospective scene rather than an event reference.

However, wording that explicitly enters a flashback **inside** the flashback is governed by the nested-context rule below.

## 16. Repeated retrospective marker while active

An already-active context does not require the user to avoid the word `회상` forever.

A bounded control that merely reaffirms that the currently depicted scene remains retrospective and supplies a new event-local position may be treated as `RETRO_CONTINUE` / context update.

Example concept:

```text
회상 장면, 다음날 아침...
```

provided there is no evidence of a second nested memory layer.

T3-A must not require an event identity database to prove continuity.

The single active context is the only retrospective lane available.

## 17. Nested retrospective is unsupported

T3 first slice has no stack.

Explicit nesting attempts such as conceptually:

```text
그 회상 속에서 다시 어린 시절을 회상하는 장면으로 들어간다
과거 장면 속에서 또 다른 회상으로 넘어간다
```

classify as:

```text
UNSUPPORTED_NESTED_RETROSPECTIVE
```

No push, stack or hidden context switch occurs.

The temporal state remains unchanged unless a separately supported non-nested route is proven.

## 18. New past scene while context is active

T3-A deliberately does **not** create a generic event-switch system.

If a control clearly says “another retrospective” or otherwise proves a second independent retrospective layer/event switch whose relationship to the current context is not represented by ordinary event-local time transition semantics:

```text
fail closed
```

If the control simply establishes a new current event-local position in the same single retrospective lane, it may update context.

The difference is semantic scene routing, not event-ID matching.

Ambiguous cases classify `AMBIGUOUS_RETRO_SOURCE` and preserve state.

## 19. Exit requires present-return authority

Context does not disappear merely because the response stops saying “flashback”.

Eligible conceptual exit controls include:

```text
현재로 돌아온다
회상을 끝내고 현재 장면으로 돌아간다
다시 현재 시점의 장면으로 전환한다
회상 장면을 종료한다
```

The bounded grammar must prove a present-return control.

## 20. What does not exit context

None of the following is sufficient alone:

```text
candidate temporal header equals head
assistant body suddenly uses present tense
assistant body mentions 2031
user changes topic
user says "지금은 어떨까?" as a question
message omits the word 회상
conversation has many turns
```

A present-looking timestamp cannot self-authorize a lane switch.

This prevents visible output from silently changing semantic routing.

## 21. Plain exit

Accepted explicit exit with no separate present transition:

```text
before:
  head    = H
  context = C
  revision = R

after:
  head    = H
  context = null
  revision = R + 1
```

The present head is not reconstructed from history.

It was preserved the whole time.

## 22. Exit plus present transition

T3-A supports one bounded atomic pattern:

```text
EXPLICIT EXIT
then
SEPARATELY PROVEN PRESENT-CURRENT TRANSITION
```

Example:

```text
현재로 돌아와 2시간 뒤, ...
```

Routing order is fixed:

```text
1. switch semantic base from context to head
2. apply present-current arithmetic/transition to head
3. clear context
4. commit once
```

Example:

```text
head    = 2031-03-07 10:00
context = 2028-04-01 10:00
source  = 현재로 돌아와 2시간 뒤
```

Result:

```text
head    = 2031-03-07 12:00
context = null
```

Never:

```text
2028-04-01 12:00 used as present base
```

This base-switch rule is mandatory.

## 23. Atomic revision for exit + head change

One accepted transaction changes temporal semantics once even if both fields change.

```text
context EXIT
+ head REPLACE
-> temporal.revision +1 total
```

Not +2.

This inherits T1-A's transaction revision rule.

## 24. Unsupported compound ordering

T3-A does not silently infer sequencing from arbitrary word order.

Potentially ambiguous forms such as:

```text
2시간 뒤 현재로 돌아온다
과거에서 하루가 지나고 현재로 돌아와 다시 하루 뒤로 간다
```

may describe multiple depicted transitions.

Unless the bounded grammar proves a supported single final-scene control chain, classify as ambiguous/unsupported rather than applying regex order.

T3-A first slice guarantees `EXIT -> optional PRESENT transition`, not a general multi-hop scene program.

## 25. Explicit present transition while context is active without exit

A user may mention the present while still depicting the past.

A present-current time phrase does not mutate head unless the route explicitly establishes that the depicted scene has returned to or is now operating on the present lane.

Therefore:

```text
active context
+ present-time event reference only
-> head KEEP, context KEEP
```

The user must explicitly exit/switch the depicted lane before ordinary current transitions target head again.

## 26. Event reference inside retrospective

Historical event references remain non-mutating even inside historical scenes.

Example concept:

```text
context = 2028-03-04
user = "3일 뒤에 있을 시험을 이야기한다"
```

This is a future event reference relative to the flashback scene, not automatically a depicted-scene jump.

T1-C `EVENT_REFERENCE_ONLY` semantics remain intact.

## 27. Questions, hypotheticals, quotations and negation

These remain non-authoritative:

```text
지금 회상 장면이야?
3년 전으로 간다면?
"과거로 돌아가자"라고 말했다
아직 회상은 끝난 게 아니다
```

They do not enter/exit/update merely because they contain routing words.

The bounded source classifier must preserve T1-C non-assertive behavior.

## 28. Proposal mapping

T3-A reuses `pending.temporalProposal`.

Conceptual mappings:

### Enter

```js
{
  baseRevision: R,
  headOp: 'KEEP',
  contextOp: 'ENTER',
  nextContext: { kind:'RETROSPECTIVE', ... }
}
```

### Continue

```js
{
  baseRevision: R,
  headOp: 'KEEP',
  contextOp: 'UPDATE',
  nextContext: ...
}
```

### Exit

```js
{
  baseRevision: R,
  headOp: 'KEEP',
  contextOp: 'EXIT',
  nextContext: null
}
```

### Exit + present transition

```js
{
  baseRevision: R,
  headOp: 'REPLACE',
  nextHead: ...,
  contextOp: 'EXIT',
  nextContext: null
}
```

No separate retrospective proposal store is needed.

## 29. Stale proposal behavior

Before commit:

```text
proposal.baseRevision == temporal.revision
```

must still hold.

If not:

```text
STALE_RETRO_PROPOSAL
-> no enter/update/exit mutation
```

The context cannot be mutated against a newer temporal state.

## 30. Candidate discard

User source may create a provisional entry/update/exit proposal during generation.

That proposal is not state.

If the generated candidate is discarded:

```text
head unchanged
context unchanged
revision unchanged
```

No “user already asked for flashback, so context must have entered” shortcut is allowed before accepted output commit.

## 31. Reroll before commit

A new candidate after discard uses:

```text
same committed predecessor
+ same bounded current request source
+ newly evaluated candidate
```

The discarded candidate contributes no temporal mutation.

## 32. Reroll of an already committed output

Replacement rebuilds from the predecessor committed snapshot.

Conceptual:

```text
predecessor temporal snapshot
+ same supported current request source
+ replacement candidate
-> replacement temporal result exactly once
```

The old committed retrospective effect is not applied and then adjusted.

This prevents double enter, double advance or double exit.

## 33. Representation-only edit

Formatting-only changes that preserve semantic temporal routing and position do not increment revision.

Examples later may include equivalent visible temporal-header formatting once T3-B defines the surface.

T3-A itself does not define those bytes.

## 34. Semantic retrospective edit

Editing a supported source/header so that retrospective semantics change requires predecessor rebuild.

Cases include:

```text
present -> retrospective entry
retrospective date change
retrospective -> present exit
exit -> no exit
```

Apply the edited semantics once from the predecessor snapshot.

Do not patch the latest state incrementally on top of the old semantic effect.

## 35. Unsupported deep-history edits

T3 does not expand host edit capability.

If the host cannot supply a safe predecessor/rebuild surface for an old edit:

```text
fail closed / preserve bounded existing behavior
```

No full-chat temporal replay is introduced merely to support T3.

## 36. Reload

Reload restores current-schema state directly:

```text
head + optional context + revision
```

No chat rescan is required.

An old timestamp in history cannot recreate a missing context.

If stored context exists and validates structurally, it remains active after reload.

## 37. Migration

Migration from pre-context-aware production never infers an active retrospective merely from historical content.

```text
legacy narrativeTimestamp -> present head migration only
context -> null
```

unless a future explicit migration contract has already-authoritative structured context data.

T3-A authorizes no such new migration source.

## 38. `narrativeTimestamp` compatibility

`narrativeTimestamp` continues to mirror **present head only** when head is `EXACT_MINUTE`.

It does not mirror `context.position`.

Example:

```text
head exact = 2031-03-07 21:00
context exact = 2028-03-04 13:00

narrativeTimestamp = 2031-03-07 21:00
```

This is intentional compatibility behavior.

A legacy consumer must not mistake the flashback event time for current present narrative time.

## 39. `worldYear` compatibility

Retrospective context never regresses `worldYear` merely because the depicted event occurs in an earlier year.

```text
head year = 2031
context year = 2028
worldYear compatibility remains present-head-owned
```

Present-head changes after exit may update it through existing Time rules.

## 40. `koreanAgeOffset`

T3-A does not redefine legacy Korean-age compatibility.

It remains tied to existing present/world-year semantics.

Birthday-aware event-date age derivation is a separate derived-value question and remains non-persistent.

T3-C will define relevance/projection boundary for such event-local derived facts.

## 41. Assessment family

T3-A freezes the following conceptual routing/assessment classes:

```text
RETRO_ENTER
RETRO_CONTINUE
RETRO_EXIT
RETRO_EXIT_WITH_PRESENT_TRANSITION
RETRO_NO_EVIDENCE
RETRO_POSITION_CONFLICT
EVENT_REFERENCE_ONLY
NON_ASSERTIVE_RETRO_SOURCE
AMBIGUOUS_RETRO_SOURCE
UNSUPPORTED_NESTED_RETROSPECTIVE
STALE_RETRO_PROPOSAL
```

These are Time-owned semantic classifications.

Structure remains judge-only.

## 42. Disposition mapping

Conceptually:

```text
RETRO_ENTER
-> COMMIT_RETROSPECTIVE_CONTEXT after accepted candidate

RETRO_CONTINUE
-> COMMIT_RETROSPECTIVE_CONTEXT after accepted candidate

RETRO_EXIT
-> COMMIT_RETROSPECTIVE_CONTEXT after accepted candidate

RETRO_EXIT_WITH_PRESENT_TRANSITION
-> one atomic temporal commit

RETRO_NO_EVIDENCE
-> KEEP_STATE

EVENT_REFERENCE_ONLY / NON_ASSERTIVE
-> REJECT_TEMPORAL_MUTATION / KEEP_STATE

AMBIGUOUS / UNSUPPORTED_NESTED
-> no unsafe mutation

STALE
-> STALE_DROP
```

Candidate-level visible-header conflicts remain T3-B/T2-B territory and #1822-dependent for runtime fail-closed publication.

## 43. Context-local regression is not present-head regression

The term `REGRESSION` must remain lane-aware.

```text
context moves earlier
!=
present head regresses
```

Structure/Time must not reject a valid event-local backward scene transition merely because its date is older than the previous context position if the current source explicitly establishes that event-local reset.

Conversely, a present-head replacement after exit remains subject to normal non-retrograde present rules unless separately authorized as a correction/reset contract.

## 44. Mode A

Mode A may use the full T3-A routing contract once runtime activation is eventually authorized.

The currently depicted narrative lane is direct and no Broadcast airtime lane competes for the visible frame.

## 45. Mode C

Mode C may use ordinary T3-A routing once active.

Exposure/Knowledge remains separate.

A context fact being true for world/model generation does not make it public/community knowledge.

## 46. Mode B

T3-A does not activate a simultaneous narrative-retrospective lane in ordinary Mode B merely because footage depicts the past.

Broadcast owns airtime.

Historical footage/replay is not automatically `temporal.context`.

Any future Mode-B simultaneous narrative-context projection/activation requires the explicit T3-C integration contract and must preserve:

```text
Broadcast airtime authority
!=
retrospective narrative event position
```

Therefore T3-A core activation target is A/C semantics; B coexistence remains intentionally restrained.

## 47. Exposure / Knowledge boundary

Hard invariant:

```text
T3 CONTEXT TRUE
!=
CHARACTER KNOWS IT
!=
PUBLIC KNOWS IT
!=
COMMUNITY MAY USE IT
```

T3-A does not set exposure flags and does not create a temporal exposure ledger.

## 48. Derived age lane selection

T3-A fixes only which temporal date a later derived calculation would consume.

```text
question = age in depicted flashback
-> use context.position date

question = current/present age now
-> use head date
```

If precision is insufficient, the derived result must remain weak/unknown according to T1-B.

T3-A does not itself add age prompt lines or visible claims.

## 49. Event-local weekday/duration derivation

The same lane-selection rule applies to future deterministic derived calculations:

```text
depicted-event question -> context position
present-current question -> head
```

Consumers must name the semantic question.

No generic helper may silently substitute “active scene position” when a caller actually needs present authority.

## 50. Why no generic `getCurrentTime()` redefinition

T3 introduces two legitimate temporal questions:

```text
What time is the present narrative at?
What time is the currently depicted event at?
```

Therefore an ambiguous generic API such as:

```text
getCurrentTime()
```

must not be reinterpreted silently.

Future runtime integration should prefer explicit concepts such as:

```text
present head
depicted position
```

while Time remains the sole semantic owner.

## 51. Performance boundary

T3-A semantic routing must remain bounded to:

```text
current temporal state
current bounded source/control clause
existing pending proposal
```

Rejected:

```text
whole-history search
embedding classifier
event retrieval DB
past-scene index
unbounded provenance chain
network I/O
new storage read per turn
```

State size remains constant.

## 52. Required future regression matrix

Executable T3-A coverage must eventually prove at least:

1. explicit absolute retrospective enter creates context and preserves exact head;
2. explicit date-only entry creates DATE_ONLY context without midnight;
3. exact relative past entry routes arithmetic to context;
4. vague past entry preserves weaker relation rather than fake duration;
5. explicit entry with insufficient base can create UNKNOWN context without date invention;
6. historical event mention does not enter context;
7. character memory/thought does not enter context;
8. quotation containing retrospective language does not enter context;
9. assistant old timestamp alone does not enter context;
10. context exact + 2h advances context only;
11. context + next-day advances context only;
12. context + vague later weakens/advances context truthfully;
13. no-evidence retrospective turn preserves head/context/revision;
14. context-local explicit earlier scene does not regress head;
15. repeated retrospective marker without nesting can update same single context;
16. explicit nested retrospective is unsupported and creates no stack;
17. ambiguous second past scene fails closed;
18. explicit exit clears context and keeps head;
19. present-looking candidate without exit source does not clear context;
20. modern date in prose does not clear context;
21. exit + present +2h uses head as arithmetic base;
22. exit + head change increments revision once total;
23. ambiguous multi-hop sequence does not use regex ordering;
24. event reference during retrospective does not move context;
25. question/hypothetical/negation does not mutate context;
26. stale baseRevision drops enter/update/exit proposal;
27. discarded candidate does not enter/update/exit;
28. reroll replacement rebuilds once from predecessor;
29. representation-only edit preserves revision;
30. semantic context edit rebuilds once;
31. reload preserves active context without history scan;
32. migration from legacy history does not infer context;
33. narrativeTimestamp continues to mirror head only;
34. worldYear does not regress to retrospective event year;
35. koreanAgeOffset semantics remain unchanged;
36. event-age derivation later selects context date;
37. present-age derivation later selects head date;
38. Mode B historical footage does not automatically activate T3 context;
39. Exposure/Knowledge is not granted by context existence;
40. no context stack/event ledger/history scan is introduced.

## 53. Acceptance table

| Decision | T3-A result |
| --- | --- |
| present head stays present authority | REQUIRED |
| one active retrospective context max | REQUIRED |
| historical mention auto-entry | REJECTED |
| assistant body auto-entry | REJECTED |
| explicit depicted-scene entry | ALLOWED |
| unknown-precision retrospective context | ALLOWED |
| continuation routes ordinary scene time to context | REQUIRED |
| context-local backward reset | ALLOWED when source-backed |
| nested flashback stack | REJECTED |
| implicit exit by timestamp/body tense/topic | REJECTED |
| explicit exit | REQUIRED |
| exit + present transition | ALLOWED as one atomic tx |
| post-exit arithmetic base = present head | REQUIRED |
| exit + head update revision +2 | REJECTED |
| narrativeTimestamp mirrors context | REJECTED |
| worldYear follows context | REJECTED |
| full-history reconstruction | REJECTED |
| event DB / timeline graph | REJECTED |
| Mode B replay auto-context | REJECTED in T3-A |
| Exposure authority transfer | REJECTED |

## 54. Runtime dependency boundary

T3-A design completion does not make runtime activation safe.

Runtime entry still requires at minimum:

```text
T1 lower-layer runtime prerequisites proven
T2 required precision/frame layers proven
#1822 fail-closed candidate rejection transport resolved or invariant-preserving redesign approved
#1657 product advancement hold resolved/reclassified
T3-B/C/D completed
fresh release authority
explicit runtime authorization
```

Do not bypass lower-layer gates because T1-A already contained a dormant `context` field design.

## 55. Next design transaction

After T3-A acceptance:

```text
T3-B RETROSPECTIVE VISIBLE FRAME / CANDIDATE DISPOSITION CONTRACT
```

T3-B must define how the single visible temporal header represents the event-local context while active, how candidate exact narrowing is checked against context instead of head, how an exit switches the candidate basis back to head, and how irreparable conflicts bind to #1822 fail-closed publication requirements.

## 56. Final T3-A invariant

```text
THE PAST MAY BECOME THE DEPICTED SCENE
WITHOUT BECOMING THE PRESENT
```

That distinction is the entire reason T3 exists.

No runtime, prompt runtime, version, release or production mutation is authorized by this document.
