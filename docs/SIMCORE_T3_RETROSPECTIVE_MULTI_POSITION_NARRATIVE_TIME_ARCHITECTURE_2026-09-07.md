# SimCore T3 Retrospective / Multi-Position Narrative Time Architecture

Date: 2026-09-07
Status: `T3 DESIGN UMBRELLA · NO RUNTIME IMPLEMENTATION AUTHORITY · NO RELEASE CHANGE`
Tracking: #1825
Parent Temporal program: #1763
Deterministic State umbrella: #1768
T2 umbrella: #1799
T2-D: #1823 / PR #1824
T2 candidate rejection transport blocker: #1822
Product advancement hold: #1657

## 1. Purpose

T1 established bounded narrative-time state, deterministic arithmetic, bounded source authority, minimal projection and a first exact-core implementation plan.

T2 designed truthful lower-precision current narrative state:

```text
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

T3 activates the remaining narrative-time distinction already anticipated by T1:

```text
present narrative position
!=
currently depicted retrospective event position
```

The T3 goal is multi-turn flashback / recollection continuity without corrupting the present narrative head.

T3 is intentionally **not** a generic timeline database.

The maximum narrative-time topology is:

```text
PRESENT HEAD
    +
OPTIONAL ACTIVE RETROSPECTIVE CONTEXT
```

Broadcast airtime remains a third semantic lane only where Mode B already requires it; it is not merged into the narrative pair.

## 2. Fresh authority at T3 start

```text
main                    = c289cf3540220f09e3e6a13577c51a528d223ba2
main health             = CLEAR / STABLE
main Required           = PASS · run 34084781738
production version      = 0.70.10
release-simcore         = ecc55f026315c6482c34d267aba2adb97527cdbc
production change       = NONE
```

T3 design starts from the accepted T2-D main tip.

No runtime, prompt compiler, persistent state, release branch, plugin version or production authority changes in this transaction.

## 3. Why T3 is a separate phase

Without a separate event-local context, an old depicted event creates a dangerous ambiguity.

Example:

```text
present = 2031-03-07 21:00
user: "3년 전의 장면으로 넘어간다"
```

Wrong designs include:

```text
A. move present head backward to 2028
B. keep present head at 2031 but force visible output to 2031 while depicting 2028
C. create an unbounded event timeline
D. ask the model to remember which timestamp is "real"
```

T3 selects:

```text
head    = present authority, unchanged
context = currently depicted retrospective event
```

The model receives only the semantic distinction it needs.

## 4. Inherited T1-A portable state

T1-A already designed the compact state:

```js
temporal: {
  schemaVersion: 1,
  revision: 0,
  head: TemporalPosition,
  headSource: TemporalSourceStamp | null,
  context: TemporalContext | null,
}
```

T3 does not create a second temporal state object.

The designed retrospective context is:

```js
{
  kind: 'RETROSPECTIVE',
  position: TemporalPosition,
  source: TemporalSourceStamp,
  enteredFromRevision: number
}
```

T3 begins with a strong reuse preference:

```text
REUSE T1-A context shape
>> EXTEND only if evidence proves a missing invariant
>> NEW schema only if stored meaning becomes incompatible
```

## 5. Present head remains semantically fixed

Hard invariant:

```text
temporal.head = best currently proven PRESENT narrative position
```

It never means:

- active flashback event time;
- memory event time;
- quoted historical date;
- most recent timestamp mentioned in prose;
- Broadcast airtime;
- current host time;
- current chat wall time.

This meaning does not change when T3 is active.

## 6. Active depicted position

T3 introduces an explicit **consumer selection rule**, not a new persistent field.

Conceptually:

```text
if temporal.context?.kind == RETROSPECTIVE:
    depictedPosition = temporal.context.position
else:
    depictedPosition = temporal.head
```

This helper/view is allowed only as a read-oriented semantic selection.

It must not mutate or alias `head`.

Consumers must still distinguish questions such as:

```text
What date is being depicted?       -> depictedPosition
What is the present return point?  -> head
What year owns world compatibility?-> head
```

## 7. One retrospective context only

T3 first family allows at most one active context.

Allowed:

```text
present
-> flashback
-> flashback continuation
-> flashback continuation
-> return to present
```

Not allowed in T3 first family:

```text
present
-> flashback A
-> flashback inside flashback B
-> flashback inside B inside C
```

No stack is created.

If a request attempts nested retrospective semantics before a later explicit contract exists, the safe posture is:

```text
AMBIGUOUS / UNSUPPORTED_NESTED_CONTEXT
-> no invented nested state
```

## 8. No duplicate return head

T3 rejects a structure such as:

```js
context: {
  position,
  returnHead
}
```

Reason:

`head` itself remains unchanged while retrospective is active.

Duplicating it creates two authorities that can drift after edit/reload/reconcile.

The return rule is simply:

```text
EXIT context
-> depicted basis becomes existing head
```

## 9. Context precision uses the same TemporalPosition family

Context position is not exact-only.

It may be:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

Examples:

```text
"2030년 1월 2일의 장면"
-> DATE_ONLY 2030-01-02
```

```text
"3~5년 전 무렵의 장면"
-> strongest provable bounded position/range under T2/T1 arithmetic
```

```text
"그 사건보다 조금 전의 장면"
-> possibly relative-only if bounded authority exists
```

No retrospective source gains extra precision merely because it is historical.

## 10. Context relation to present

`RETROSPECTIVE` semantically means the depicted event belongs to an earlier narrative reference than the present return authority.

T3-A must freeze the exact comparison/disposition rules.

Umbrella constraints:

- when both positions are deterministically comparable and an explicit retrospective target is provably later than the present head, the source is contradictory;
- T3 must not silently move the present head forward to make the contradiction disappear;
- when precision is insufficient to compare exact order, T3 preserves only what is provable;
- no guessed clock/date may be created merely to prove that the scene is historical.

The umbrella intentionally leaves boundary cases such as equal temporal coordinates under explicit retrospective narrative identity to T3-A.

## 11. Entry authority

Historical timestamp presence alone is insufficient.

Eligible T3 entry must be a bounded source-backed control semantic compatible with the accepted T1-C authority posture.

Conceptually eligible:

```text
회상 장면: 2030-01-02
3년 전의 장면으로 넘어간다
그때의 사건을 직접 보여준다
```

Conceptually non-entry:

```text
3년 전의 일을 이야기한다
"2030년에 만났지"라고 말했다
2030년 사건을 떠올렸다
2030년이면 몇 살이었을까?
내년에는 어떻게 될까?
```

The difference is **depiction routing**, not keyword presence.

## 12. No generic scene NLP

T3 does not authorize a general flashback classifier over arbitrary prose.

Allowed first-family sources remain bounded to owner-approved surfaces such as:

```text
current request leading control/transition clause
explicit structured temporal control/config
supported edit rebuild source
```

Forbidden:

```text
whole user message semantic scan
whole assistant output semantic scan
whole chat history scan
embedding classifier
secondary model call
```

## 13. Entry transition

Conceptually:

```text
pre:
  head = H
  context = null

source:
  explicit retrospective entry -> event position E

post accepted commit:
  head = H
  context = RETROSPECTIVE(E)
  revision += 1
```

`headSource` remains the provenance of the present head.

Context receives its own bounded source stamp.

No legacy `narrativeTimestamp` rewrite occurs merely because the depicted event is older.

## 14. Continuation routing

While retrospective is active, ordinary bounded temporal progression for the currently depicted scene routes to `context.position` by default.

Example:

```text
head = 2031-03-07 21:00
context = 2028-06-01 10:00
user = "2시간 뒤"
```

Expected semantic target:

```text
context -> 2028-06-01 12:00
head    -> 2031-03-07 21:00 unchanged
```

This does not mean every temporal phrase while context is active is authoritative.

T1-C source classes still apply.

## 15. Event reference remains different from context continuation

Even inside a flashback, a future plan or quoted date does not move context.

Example:

```text
active context = 2028-06-01
"내일 만나자"라고 말한다
```

This is dialogue/event reference unless the bounded control grammar proves depicted-scene advancement.

T3 must not turn all time expressions into context mutation.

## 16. Assistant canonical temporal surface during retrospective

When T3 is active, the one canonical visible narrative temporal surface represents the **depicted retrospective event position**.

It does not represent the present head.

Therefore candidate assessment routes:

```text
active retrospective
-> candidate frame temporal position checked against context constraint
```

not:

```text
active retrospective
-> compare frame header to present head
```

## 17. Present-looking candidate does not imply exit

Suppose:

```text
head    = 2031-03-07 21:00
context = 2028-06-01 10:00
```

If a model candidate emits a frame temporal header equal to `2031-03-07 21:00`, T3 must not infer:

```text
"the model probably returned to present"
```

Exit authority belongs to the bounded current request/config source contract.

Without an eligible exit source, a present-looking candidate is assessed as a context/frame conflict.

## 18. Exit authority

Exit requires explicit enough present-return semantics.

Conceptually eligible:

```text
현재로 돌아온다
회상이 끝나고 현재 장면으로 복귀한다
다시 2031-03-07의 현재로 돌아간다
```

Not enough by itself:

```text
assistant suddenly writes present timestamp
body prose says "지금"
old frame disappears
```

T3-A owns the exact bounded grammar.

## 19. Exit transition

Simple exit:

```text
pre:
  head = H
  context = E

source:
  EXIT

post:
  head = H
  context = null
  revision += 1
```

No history rescan is required to recover H.

## 20. Atomic exit plus present transition

T3 must support a single request that both exits retrospective and advances the present scene.

Example:

```text
"회상에서 돌아온 뒤, 현재 시점에서 이틀 후"
```

If the bounded source contract proves one supported compound control:

```text
contextOp = EXIT
headOp    = REPLACE with deterministic present target
```

Commit rule:

```text
one accepted transaction
-> one temporal revision increment total
```

Never:

```text
EXIT revision +1
then head advance revision +1
```

for the same accepted output transaction.

## 21. Unsupported competing controls

T3 does not silently choose between multiple competing scene controls.

Examples:

```text
"현재로 돌아갔다가 다시 3년 전으로 간다"
"회상 속에서 또 다른 회상으로 넘어간다"
```

unless a later bounded sequential-control grammar explicitly supports them.

First-family default:

```text
UNSUPPORTED_MULTI_CONTEXT_TRANSITION
-> fail closed / no invented state chain
```

## 22. Candidate lifecycle

T3 preserves exact-once semantics.

Candidate proposal is provisional:

```text
pending temporal proposal
!=
committed temporal state
```

Discarded candidate:

```text
no context enter/update/exit mutation
```

Stale base revision:

```text
no context mutation
```

## 23. Reroll

Reroll uses the predecessor committed snapshot.

Example:

```text
predecessor:
  head H
  context E0

old committed candidate:
  context E1

replacement candidate:
  context E2
```

Correct:

```text
rebuild from predecessor E0
apply replacement once -> E2
```

Forbidden:

```text
E1 + replacement delta -> E3
```

No separate retrospective history DB is required.

## 24. Edit

Representation-only temporal header edit:

```text
semantic position unchanged
-> head/context/revision unchanged
```

Semantic edit of an active retrospective temporal surface:

```text
rebuild from predecessor snapshot
-> route through Time
-> apply edited context semantics exactly once
```

Edit must not reinterpret body prose as retrospective authority merely because a historical date was added.

## 25. Reload

Reload of current-schema T3 state:

```text
load committed temporal snapshot
-> Time normalization
-> State Reconcile composition
-> no chat rescan
```

Must preserve independently:

```text
head
headSource
context
context.source
enteredFromRevision
revision
```

No migration pass may infer context from old historical timestamps in chat.

## 26. Migration posture

Existing pre-T3 accepted state normally has:

```text
context = null
```

T3 activation must not scan history to discover a prior flashback.

Migration rule:

```text
no authoritative persisted context
-> context = null
```

If the then-current T1/T2 runtime already persists the dormant T1-A context-compatible shape, T3 should activate semantics without a schema bump solely for `null -> active` use.

Exact version decisions remain implementation-time fresh-read work.

## 27. Legacy narrativeTimestamp compatibility

`narrativeTimestamp` remains a compatibility mirror for the **present head only**.

During retrospective:

```text
head EXACT_MINUTE
-> narrativeTimestamp mirrors head
```

Even if context is another exact timestamp.

T3 must never rewrite legacy `narrativeTimestamp` to the flashback timestamp because pre-T3 consumers could then mistake the historical event for present narrative time.

If head is weak:

```text
narrativeTimestamp = null
```

inherited from T2/T1-A.

## 28. worldYear compatibility

`worldYear` remains present-head-owned.

During retrospective:

```text
head year = 2031
context year = 2028
worldYear remains 2031
```

Context never regresses or advances worldYear.

This is necessary because existing age/world compatibility semantics are present-world compatibility, not currently depicted event metadata.

## 29. koreanAgeOffset compatibility

T3 does not reinterpret `koreanAgeOffset`.

It remains the existing compatibility primitive.

A retrospective scene does not decrement or rewrite the offset merely because a younger event is being depicted.

## 30. Derived age selection

A future/activated birthday-aware mathematical derivation must state which temporal question it answers.

For depicted flashback age:

```text
birthDate + context.position date
```

For present age/status:

```text
birthDate + head date
```

No global `currentAge` value silently switches meaning when context enters/exits.

Derived age remains recomputed and non-persistent.

## 31. Prompt projection

T1-D already anticipated a compact retrospective line.

T3 keeps a one-line temporal core target where possible.

Conceptual shape:

```text
temporal_scene=retrospective;event=2028-06-01T10:00;present_head=2031-03-07T21:00
```

For weak precision, preserve it truthfully.

Examples:

```text
temporal_scene=retrospective;event_date=2028-06-01;event_clock=unknown;present_head=2031-03-07T21:00
```

```text
temporal_scene=retrospective;event_relation=BEFORE;event_anchor=2031-03-07T21:00;event_exact=unknown;present_head=2031-03-07T21:00
```

Exact serializer grammar belongs to T3-C.

## 32. No duplicated present temporal line

When the retrospective core line includes present return authority, Prompt must not also emit an ordinary current-scene temporal line describing the same present head.

Forbidden:

```text
temporal_scene=retrospective;event=...;present_head=...
temporal_scene=current;at=present_head
```

This would create competing scene semantics and waste prompt budget.

## 33. Visible frame

T3 keeps exactly one common narrative frame temporal slot.

Active retrospective:

```text
frame slot = context.position serialization
```

Normal present scene:

```text
frame slot = head/effective current target serialization
```

The frame never carries both positions as two timestamp headers.

The prompt line carries the semantic relation where the model needs both.

## 34. Candidate narrowing in retrospective

Model-authored exact narrowing remains allowed only when compatible with the active context constraint.

Example:

```text
context constraint = DATE_ONLY 2028-06-01
candidate frame = exact 2028-06-01 10:30
-> compatible model-authored narrowing
```

```text
context constraint = DATE_ONLY 2028-06-01
candidate frame = exact 2031-03-07 21:00
-> not an implicit exit
-> conflict unless explicit exit source switched the candidate basis
```

## 35. Irreparable context conflict

T3 inherits the T2-B safety rule:

```text
internal canonical truth
!= incompatible visible canonical frame truth
```

Therefore irreparable context/frame conflicts require fail-closed candidate handling when no unique semantics-preserving repair exists.

Current production does not yet prove such a publication rejection transport.

Issue #1822 therefore remains a runtime activation dependency.

## 36. #1822 boundary

T3 design may continue while #1822 is open.

T3 runtime activation may not claim safety merely because retrospective state is separate from the present head.

The same problem exists:

```text
canonical context = historical constraint
model visible header = incompatible point
```

If the runtime only logs a warning and commits/publishes, T3 truth can split.

Required future resolution remains:

```text
actual pre-publication fail-closed seam
OR bounded proven regeneration transport
OR invariant-preserving redesign
```

## 37. Mode A

Mode A may use the full T3 pair:

```text
active depicted retrospective position
+ present return head
```

Visible temporal header represents the depicted retrospective position.

Prompt may project one compact retrospective core.

## 38. Mode B

Mode B has an existing separate temporal lane:

```text
Broadcast airtime
```

T3 must not redefine the common Mode B airtime header as retrospective narrative time.

Therefore simultaneous Mode B narrative retrospective content requires a distinct semantic treatment in T3-C.

Initial invariant:

```text
Mode B visible frame time = Broadcast airtime authority
narrative retrospective context != Broadcast timestamp
```

If the model needs retrospective narrative context during Mode B, Prompt may carry a compact depicted-narrative semantic line only when explicitly relevant.

No second Broadcast timestamp is created.

## 39. Mode C

Mode C follows ordinary narrative T3 routing unless a stronger existing B_END handoff constraint or exposure rule applies.

An active retrospective context after a valid source-backed entry targets context rather than present head.

COMMUNITY remains a separate consumer.

## 40. B_END boundary

B_END terminal airtime is a present-current floor/constraint under existing rules.

It is not a retrospective event timestamp.

T3 must not route B_END terminal directly into context.

If a later request explicitly enters a retrospective after B_END:

```text
present head/floor semantics remain present authority
retrospective context is separately established
```

## 41. Exposure / Knowledge boundary

Hard invariant:

```text
MODEL/WORLD TEMPORAL TRUTH
!= CHARACTER KNOWLEDGE
!= PUBLIC KNOWLEDGE
!= COMMUNITY-EXPOSED FACT
```

A retrospective event may be temporally canonical for generation while still being unknown to characters/public/community.

T3 does not add `community_visible` or equivalent authority.

Exposure remains owned by the existing Exposure/Knowledge system.

## 42. Character knowledge during flashback

T3 itself does not backdate or forward-date character epistemic state.

Example:

```text
present character knows secret X
flashback occurs before X was learned
```

T3 temporal context alone does not authorize exposing X in the historical scene.

This is an integration concern for Exposure/Knowledge, not a reason for Time to own character knowledge.

T3-C must define only the temporal handoff needed by that owner.

## 43. No event ledger

T3 still uses:

```text
head
+ optional active context
+ bounded source stamps
+ existing committed snapshots
```

No array such as:

```js
temporal.events = [...]
```

No stack such as:

```js
temporal.contextStack = [...]
```

No graph such as:

```js
temporal.timelineGraph = {...}
```

Historical event history remains chat/history content unless another product family explicitly owns it later.

## 44. Constant-size state

T3 persistent size is O(1) with chat length.

One long 500-turn flashback does not create 500 temporal records.

Only the latest committed event-local context is stored.

Existing state snapshots already provide commit lineage/rebuild authority.

## 45. Performance ceiling direction

T3 must add no ordinary:

```text
network request
storage read solely for context selection
storage write beyond existing accepted snapshot publication
timer
poll
whole-history scan
auxiliary model call
unbounded retry
```

Context selection and comparison must be bounded to current state + current bounded request/candidate surfaces.

## 46. Owner map

T3 continues the existing ownership model.

```text
Time
- retrospective temporal semantics
- context position normalization/arithmetic
- head vs context target routing facts
- candidate semantic assessment

Lifecycle
- request/mode eligibility and bounded current-turn preparation

Prompt
- minimal serialization only

Structure
- frame integrity / commit-safety judgment only

Session
- bounded orchestration / immutable assessment transport

Output Finalize
- accepted exact-once head/context commit application

Edit Reconcile
- predecessor rebuild coordination

State Reconcile
- compose/normalize Time-owned temporal state

Lineage
- request/output commit identity, never story time

Exposure/Knowledge
- who may know/use temporal event facts

Broadcast
- Mode B airtime semantics
```

No new global Temporal module is justified.

## 47. T3-A transaction

T3-A should freeze:

```text
retrospective enter source grammar
continuation routing
exit source grammar
nested-context rejection
context-vs-present comparison
precision transitions within context
atomic exit + present transition
revision/source semantics
assessment/disposition family
```

T3-A must not redesign prompt/frame/runtime integration yet.

## 48. T3-B transaction

T3-B should freeze:

```text
single visible temporal slot semantics
context frame serialization
candidate compatibility against context
model-authored narrowing
present-looking candidate behavior
exit candidate basis switch
unique repair boundary
#1822 rejection transport dependency
reroll/edit visible-frame behavior
```

## 49. T3-C transaction

T3-C should freeze:

```text
one retrospective temporal_scene line
present-head inclusion without stacking
Mode A/B/C behavior
Broadcast coexistence
B_END boundary
Exposure/Knowledge handoff
retrospective derived-age selection
prompt/cache ABI impact
```

## 50. T3-D transaction

T3-D should freeze:

```text
production function/module impact map
schema/version decision rules
migration from dormant null context
rollback/re-upgrade behavior
candidate rejection transport integration
permanent fixtures
performance ceilings
real long-chat matrix
runtime slicing
release entry gates
```

## 51. Runtime dependency on T1/T2

T3 design can be completed before T1/T2 ship.

T3 runtime must not leapfrog its semantic dependencies.

Preferred entry posture:

```text
T1 exact temporal core live-proven
T2 precision-aware current temporal state/frame live-proven where required
T2/T3 candidate fail-closed transport proven
then T3 retrospective activation
```

This avoids building a temporary exact-only retrospective ABI and replacing it immediately.

## 52. Product hold

#1657 remains a product-advancement gate until separately resolved/reclassified.

T3 design work must not absorb the operator release-card repair.

No T3 runtime publication may bypass the then-current release authority/hold state.

## 53. Regression family: state routing

Future permanent fixtures must cover at minimum:

1. enter preserves head;
2. enter creates exactly one context;
3. context exact continuation updates context only;
4. context DATE_ONLY continuation preserves clock uncertainty;
5. context bounded range remains a range;
6. context relative-only remains truthful;
7. UNKNOWN context does not fabricate a date;
8. no-evidence turn preserves context and revision;
9. nested context fails closed;
10. historical mention does not enter context.

## 54. Regression family: exit

11. explicit exit clears context;
12. exit preserves head when no separate present transition exists;
13. exit + exact present advance changes head once;
14. exit + weak present transition preserves strongest provable precision;
15. exit + head change increments revision once total;
16. model present timestamp alone cannot exit;
17. body prose alone cannot exit.

## 55. Regression family: candidate

18. candidate frame during retrospective checks context, not head;
19. same-context candidate is accepted without semantic mutation;
20. compatible exact narrowing is accepted as model-authored;
21. incompatible later/present exact point does not imply exit;
22. malformed retrospective frame cannot be rescued by body prose;
23. irreparable conflict yields NO_COMMIT under future proven transport;
24. stale candidate cannot mutate context.

## 56. Regression family: lifecycle

25. discarded candidate does not enter context;
26. discarded continuation does not advance context;
27. discarded exit does not clear context;
28. reroll rebuilds from predecessor once;
29. representation-only edit preserves context/revision;
30. semantic context edit rebuilds once;
31. reload round-trip preserves head and active context separately;
32. migration never infers context from chat history.

## 57. Regression family: compatibility

33. exact present head continues to mirror narrativeTimestamp during retrospective;
34. context exact timestamp never replaces narrativeTimestamp;
35. worldYear stays present-head-owned;
36. koreanAgeOffset meaning unchanged;
37. retrospective derived age uses event date only when that semantic question is requested;
38. present derived age uses head date;
39. context never changes Broadcast airtime.

## 58. Regression family: prompt/frame/mode

40. active retrospective uses one visible narrative temporal slot in A/C;
41. present head is not emitted as a second visible narrative timestamp;
42. prompt retrospective core contains event + present head in one semantic unit;
43. retrospective exit restores ordinary current projection;
44. Mode B airtime header remains Broadcast authority;
45. Mode B narrative retrospective projection never redefines airtime;
46. B_END terminal never auto-creates retrospective context;
47. COMMUNITY use still requires independent exposure authority.

## 59. Regression family: boundedness

48. no whole-chat temporal scan;
49. no context stack;
50. no event ledger;
51. no new ordinary storage read;
52. no network/timer/poll;
53. one current candidate assessment remains bounded;
54. persistent temporal state remains constant-size.

## 60. Rollback direction

T3-D must explicitly design rollback from an active retrospective context.

The safe principle is already constrained:

```text
never convert historical context into present head solely for downgrade compatibility
```

If an older runtime cannot understand active context, safe degradation may lose event-local continuity rather than corrupt present time.

Exact downgrade policy waits for T3-D and then-current T1/T2 runtime reality.

## 61. Human evidence

Real long-chat T3 acceptance will require human-visible narrative checks because temporal correctness includes scene identity:

```text
present stays present
flashback stays locally coherent
return occurs at the intended boundary
no accidental current-time regression
```

Automated fixtures may prove state arithmetic and routing but must not infer a user-owned terminal HUMAN_EVIDENCE decision where the release workflow reserves that decision for the user.

## 62. Non-goals

T3 does not authorize:

- runtime implementation;
- release/version changes;
- nested flashback stacks;
- arbitrary concurrent timelines;
- historical event database;
- generic memory system;
- generic symbolic temporal graph;
- arbitrary prose temporal extraction;
- whole-chat retrospective detection;
- dream/vision/hypothetical auto-activation;
- real-world clock/timezone/DST;
- event scheduling;
- free-form birth-date extraction;
- generic character-knowledge ownership in Time;
- provider-cache claims;
- deployment-system restructuring.

## 63. Acceptance decisions

```text
T3 semantic name                         = RETROSPECTIVE / MULTI-POSITION NARRATIVE TIME
present authority                       = temporal.head
active depicted retrospective authority = temporal.context.position
max active retrospective contexts       = 1
nested context                           = REJECTED first family
returnHead duplicate                     = REJECTED
context precision family                 = full TemporalPosition union
legacy narrativeTimestamp                = present head mirror only
worldYear                                = present head only
koreanAgeOffset                          = compatibility meaning unchanged
visible narrative temporal slots         = 1
retrospective frame slot                 = depicted context position
present visible duplicate                = REJECTED
prompt target                            = one compact event + present semantic core
assistant timestamp implies exit          = REJECTED
historical timestamp implies entry        = REJECTED
event ledger                             = REJECTED
context stack                            = REJECTED
whole-history scan                       = REJECTED
new Temporal module                      = REJECTED
Time remains semantic owner              = REQUIRED
#1822 runtime dependency                  = REQUIRED
#1657 product hold                        = RESPECTED
implementation authority                 = NONE
runtime change                           = NONE
release change                           = NONE
production impact                        = NONE
```

## 64. Next transaction

The next design transaction is:

```text
T3-A RETROSPECTIVE CONTEXT ACTIVATION / ROUTING CONTRACT
```

T3-A should freeze exact source classes, enter/continue/exit routing, nested-context failure behavior, context/present comparison, revision semantics and atomic present-return transitions.

No runtime implementation begins from this umbrella alone.
