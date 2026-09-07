# SimCore T3-B Retrospective Visible Frame / Candidate Lane Disposition Contract

Date: 2026-09-07
Status: `T3-B DESIGN · NO RUNTIME IMPLEMENTATION AUTHORITY · NO PROMPT/RUNTIME/RELEASE CHANGE`
Tracking: #1834
Parent T3 umbrella: #1825 / PR #1826
T3-A routing: #1830 / PR #1832
Parent Temporal program: #1763
T2-B visible frame / candidate disposition: #1809 / PR #1813
T2 runtime rejection-transport blocker: #1822
Product advancement hold: #1657

## 1. Purpose

T3-B freezes the visible-frame and candidate-disposition rules required when SimCore has two narrative temporal positions with different meanings:

```text
present narrative authority = temporal.head
currently depicted retrospective position = temporal.context.position
```

The problem is not adding another timestamp.

The problem is deciding which one existing common frame temporal slot means on each turn, and ensuring a model candidate is checked against the correct semantic lane before any commit can occur.

This is a design-only transaction.

No runtime, prompt runtime, cache ABI, version, release branch, deployment, or production mutation is authorized.

## 2. Fresh authority at T3-B start

```text
main                    = 5d63856e9e0ac10fe5f506e06b6498cae3d97bb8
production version      = 0.70.10
release-simcore         = ecc55f026315c6482c34d267aba2adb97527cdbc
```

T3-B begins from accepted T3-A routing semantics and accepted T2-B frame semantics.

T3-B does not redefine either owner.

## 3. Inherited frame grammar

T2-B already froze one common frame temporal slot using the marker family:

```text
⏱️[...]
```

Supported canonical payload families remain:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
```

Canonical examples remain unchanged:

```text
⏱️[2031-03-07 (Fri) 09:55 PM]
⏱️[DATE 2028-06-01]
⏱️[RANGE 2028-06-01..2028-06-03]
⏱️[RANGE 2028-06-01 (Thu) 09:00 AM..2028-06-01 (Thu) 11:00 AM]
⏱️[BEFORE 2031-03-07]
⏱️[AFTER PREVIOUS_SCENE]
⏱️[UNKNOWN]
```

T3-B adds no new precision payload family.

## 4. Core decision: the frame shows depicted scene time

The common narrative frame temporal slot means:

```text
temporal position of the scene currently being depicted
```

Therefore:

```text
normal present scene
-> frame slot serializes effective present position

active retrospective scene
-> frame slot serializes effective retrospective context position
```

This is a display-selection rule.

It does not redefine `temporal.head`.

## 5. No visible RETRO/PRESENT token

T3-B explicitly rejects adding visible lane labels such as:

```text
⏱️[RETRO 2028-06-01]
⏱️[PRESENT 2031-03-07]
⏱️[LANE=RETROSPECTIVE;DATE 2028-06-01]
```

Reasons:

- T2-B already provides a complete precision-aware payload grammar;
- lane is request/state semantics, not a TemporalPosition precision class;
- visible bytes should not expose internal routing metadata;
- adding lane tokens would create another parser/version surface;
- T3-C prompt projection is the correct place to tell the model that the depicted event differs from the present return head.

Therefore:

```text
visible header = TemporalPosition serialization only
lane identity = internal semantic basis
```

## 6. One common frame slot remains

T3-B preserves the T2-B exactly-one common frame temporal slot.

Active retrospective output must not become:

```text
⏱️[2028-06-01 event]
⏱️[2031-03-07 present]
```

or any equivalent two-header form solely for T3 support.

The present head is preserved in canonical state and later prompt projection.

It is not duplicated into a second common frame timestamp.

## 7. Candidate content must not choose its own lane

This is the governing T3-B invariant:

```text
candidate content does not choose semantic lane
```

Correct ordering:

```text
committed temporal state
+ current bounded T3-A source routing
-> pending temporal proposal
-> select candidate semantic basis
-> parse candidate frame header
-> assess candidate against selected basis
-> accepted output only
-> exact-once commit
```

Forbidden ordering:

```text
parse candidate timestamp
-> guess whether it looks present or historical
-> infer enter/exit
-> choose state lane
```

A model cannot move itself between present and retrospective lanes by choosing timestamp bytes.

## 8. Narrative candidate lane family

T3-B freezes two narrative candidate lanes:

```text
PRESENT
RETROSPECTIVE
```

Broadcast airtime is a separate existing temporal authority and is not folded into this two-lane narrative family.

Mode-B coexistence belongs to T3-C.

## 9. Candidate semantic basis

T3-B requires an explicit conceptual basis object before candidate assessment.

Conceptual shape:

```js
candidateBasis = {
  lane: 'PRESENT' | 'RETROSPECTIVE',
  expectedPosition: TemporalPosition,
  baseRevision: number,
  routing: 'CURRENT' | 'RETRO_ENTER' | 'RETRO_CONTINUE' | 'RETRO_EXIT' | 'RETRO_EXIT_WITH_PRESENT_TRANSITION'
}
```

Exact runtime names may differ.

The semantic separation may not.

Hard relation:

```text
lane selection
!=
candidate semantic assessment
!=
commit effect
```

## 10. Effective position versus committed position

Candidate basis may be request-provisional.

Example:

```text
committed head = 2031-03-07 21:00
context = null
current source = explicit retrospective entry to 2028-03-07
```

Before output acceptance:

```text
canonical state still has context = null
```

but generation/candidate assessment must use:

```text
candidateBasis.lane = RETROSPECTIVE
candidateBasis.expectedPosition = pending retrospective position
```

This preserves exact-once commit while still allowing the current candidate to depict the requested scene.

## 11. Lane selection table

The first-family lane table is frozen as follows.

| Committed context | Current T3-A routing | Candidate lane | Expected basis |
| --- | --- | --- | --- |
| null | ordinary current / no retrospective source | PRESENT | effective head or pending present proposal |
| null | RETRO_ENTER | RETROSPECTIVE | pending context position |
| active | no temporal evidence | RETROSPECTIVE | committed context.position |
| active | RETRO_CONTINUE | RETROSPECTIVE | pending next context.position |
| active | RETRO_EXIT | PRESENT | preserved present head |
| active | RETRO_EXIT_WITH_PRESENT_TRANSITION | PRESENT | pending next present head |
| active | unsupported nested retrospective | no accepted new basis | fail closed under source contract |
| any | stale proposal | no accepted new basis | stale drop |

The table is semantic authority.

Candidate bytes do not override it.

## 12. Normal present scene

With no active context and no retrospective entry source:

```text
candidateBasis.lane = PRESENT
```

T2-B behavior remains unchanged.

T3-B should therefore be a no-op for ordinary present scenes except for explicit basis selection.

This keeps non-retrospective output backward compatible.

## 13. Retrospective entry turn

Example:

```text
committed:
  head = 2031-03-07 21:00
  context = null

user control:
  "3년 전의 장면으로 넘어간다"
```

If T3-A + T1/T2 arithmetic derive:

```text
pending context = 2028-03-07 21:00
```

then T3-B requires:

```text
candidate lane = RETROSPECTIVE
expected = 2028-03-07 21:00
```

A candidate frame:

```text
⏱️[2028-03-07 (Tue) 09:00 PM]
```

is assessed against the pending context.

It is not assessed against the predecessor 2031 head merely because the context has not committed yet.

## 14. Retrospective entry with DATE_ONLY

Example:

```text
head = exact 2031-03-07 21:00
user = "회상 장면: 2028-06-01"
pending context = DATE_ONLY 2028-06-01
```

Canonical equivalent candidate:

```text
⏱️[DATE 2028-06-01]
```

Compatible model-authored narrowing candidate:

```text
⏱️[2028-06-01 (Thu) 10:30 AM]
```

when T1-C output authority permits exact compatible narrowing.

The exact 10:30 point is model-authored.

SimCore did not derive it from DATE_ONLY.

## 15. Retrospective entry with UNKNOWN

Strong retrospective depiction can be proven even when event time cannot.

Example:

```text
"오래전의 장면으로 넘어간다"
```

If no safe date/range/relation can be established:

```text
candidate lane = RETROSPECTIVE
expectedPosition = UNKNOWN
```

Canonical safe visible frame:

```text
⏱️[UNKNOWN]
```

T3-B must not fall back to the present-head exact timestamp merely because the retrospective position is unknown.

Doing so would display the wrong semantic lane as known truth.

## 16. Active retrospective no-evidence turn

When context is active and the current request provides no temporal transition:

```text
candidate lane = RETROSPECTIVE
expectedPosition = committed context.position
```

Both `head` and `context` remain unchanged semantically.

The frame still serializes the context position because the depicted scene remains retrospective.

No-evidence does not mean return-to-present.

## 17. Retrospective continuation

Example:

```text
head = 2031-03-07 21:00
context = 2028-03-07 21:00
user = "2시간 뒤"
```

T3-A routes arithmetic to context.

T1/T2 arithmetic derives:

```text
pending context = 2028-03-07 23:00
```

T3-B then selects:

```text
candidate lane = RETROSPECTIVE
expected = 2028-03-07 23:00
```

Canonical compatible candidate:

```text
⏱️[2028-03-07 (Tue) 11:00 PM]
```

## 18. Present-looking candidate during active retrospective

Using the previous example, suppose the candidate emits:

```text
⏱️[2031-03-07 (Fri) 11:00 PM]
```

This must not be interpreted as:

```text
model returned to present
```

because no T3-A exit source exists.

Instead:

```text
selected lane remains RETROSPECTIVE
candidate is compared against retrospective expectedPosition
```

If incompatible and no unique semantics-preserving repair exists:

```text
REJECT_IRREPARABLE_CONFLICT
+ NO_COMMIT
```

subject to the T2-B / #1822 publication-safety boundary.

## 19. Historical-looking candidate during present scene

Symmetrically, a historical timestamp does not create context.

Example:

```text
context = null
head = 2031-03-07 21:00
no retrospective entry source
candidate = 2028-03-07 21:00
```

T3-B does not infer a flashback.

The candidate is assessed in PRESENT lane under ordinary T1/T2 constraints and may conflict/regress.

## 20. Explicit exit without present advance

Example:

```text
head = 2031-03-07 21:00
context = 2028-03-07 23:00
user = "현재로 돌아온다"
```

T3-A creates pending:

```text
contextOp = EXIT
headOp = KEEP
```

Before candidate assessment, T3-B switches basis:

```text
candidate lane = PRESENT
expectedPosition = 2031-03-07 21:00
```

Therefore the visible frame of the return turn represents the present head again.

## 21. Exit lane switch happens before candidate assessment

This ordering is mandatory:

```text
prove exit source
-> change candidate semantic basis to PRESENT
-> parse/assess candidate temporal header
```

Forbidden:

```text
assess candidate against old context
-> then decide exit
```

The latter would reject a correct present-return header as if it were a retrospective conflict.

## 22. Exit plus present transition

Example:

```text
head = 2031-03-07 21:00
context = 2028-03-07 23:00
user = "현재로 돌아와 2시간 뒤"
```

T3-A selection order:

```text
1. prove present-return control
2. retire retrospective routing for current target
3. use preserved head as arithmetic base
4. derive present +2h
```

Pending present target:

```text
2031-03-07 23:00
```

T3-B then requires:

```text
candidate lane = PRESENT
expectedPosition = 2031-03-07 23:00
```

The 2028 context is neither arithmetic base nor candidate basis after the exit switch.

## 23. Exit plus weak present transition

The same rule applies to weak precision.

Example:

```text
head = 2031-03-07 21:00
context = 2028-03-07 23:00
user = "현재로 돌아와 다음날"
```

Expected present target may be:

```text
DATE_ONLY 2031-03-08
```

The correct visible frame is then:

```text
⏱️[DATE 2031-03-08]
```

not an exact midnight and not the old retrospective timestamp.

## 24. Old event-local candidate after explicit exit

Suppose the exit-only example instead produces:

```text
⏱️[2028-03-07 (Tue) 11:00 PM]
```

The selected basis is already PRESENT.

Therefore the candidate conflicts with present expected truth.

T3-B does not reinterpret the user source as failed exit merely to preserve the candidate.

Source authority outranks the candidate's attempt to remain in the old lane.

## 25. Same-value lane collision

Present and retrospective positions may occasionally serialize to the same value.

Example:

```text
head = DATE 2031-03-07
context = DATE 2031-03-07
```

While context is active:

```text
⏱️[DATE 2031-03-07]
```

is assessed in RETROSPECTIVE lane.

After explicit exit:

```text
⏱️[DATE 2031-03-07]
```

is assessed in PRESENT lane.

The bytes are identical.

The semantic lane is not.

Therefore:

```text
TemporalPosition value equality
!=
context state transition
```

A matching value never implicitly enters or exits retrospective state.

## 26. T2-B candidate assessment is reused

T3-B does not create a second candidate engine.

After lane selection, Time reuses the T2-B assessment family:

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

And commit effects:

```text
NO_TEMPORAL_MUTATION
COMMIT_CANDIDATE
COMMIT_REPAIRED
NO_COMMIT
```

T3-B contributes the selected semantic basis, not a parallel verdict taxonomy.

## 27. Equivalent candidate in retrospective lane

Example:

```text
context = RANGE 2028-06-01..2028-06-03
candidate = same RANGE
```

Result:

```text
lane = RETROSPECTIVE
assessment = ACCEPT_EQUIVALENT
```

If the context position already committed and no current semantic transition exists:

```text
commit effect = NO_TEMPORAL_MUTATION
```

## 28. Compatible retrospective narrowing

Example:

```text
context effective constraint = DATE_ONLY 2028-06-01
candidate = exact 2028-06-01 10:30
```

When output canonical authority is eligible:

```text
lane = RETROSPECTIVE
assessment = ACCEPT_COMPATIBLE_NARROWING
```

The resulting exact point narrows `context.position` only.

It does not change present `head`.

## 29. Range narrowing in retrospective lane

Example:

```text
context constraint = RANGE 2028-06-01..2028-06-03
candidate exact = 2028-06-02 18:00
```

Accept only if Time can prove the point lies inside the active context envelope and current output authority permits model-authored narrowing.

The resulting context may become exact.

Present head remains unchanged.

## 30. Relative retrospective narrowing

Example:

```text
context constraint = BEFORE 2031-03-07 21:00
candidate exact = 2028-06-01 10:30
```

Acceptance requires proof that the candidate satisfies the relation.

If the relation is based on `PREVIOUS_SCENE`, the same T2-B predecessor-proof boundary applies.

No exact point is accepted merely because it looks plausibly historical.

## 31. UNKNOWN retrospective candidate

```text
context effective = UNKNOWN
candidate = UNKNOWN
```

may be equivalent.

An exact/date/range/relative candidate may establish event-local temporal truth only where T1-C output authority permits it and no stronger current source conflicts.

UNKNOWN is not a parser-failure bucket.

Malformed header remains malformed.

## 32. Weakening inside retrospective context

A retrospective candidate may weaken precision only when the current effective context semantics authorize the weakening.

Example:

```text
context committed = exact 2028-06-01 10:30
user = "다음날"
pending context = DATE_ONLY 2028-06-02
candidate = DATE 2028-06-02
```

This is authorized request-scoped weakening.

A model cannot emit DATE_ONLY for the same exact day to erase a required exact target without source authority.

## 33. Wrong-lane conflict is semantic

A lane mismatch is not a formatting defect.

Example:

```text
selected lane = RETROSPECTIVE
expected context = DATE 2028-06-01
candidate = exact present head 2031-03-07 21:00
```

There is no representation-only transformation that proves the intended event time.

Changing the candidate timestamp to `2028-06-01` could invalidate body prose that was generated around 2031.

Therefore T3-B inherits the T2-B fail-closed rule.

## 34. Unique repair cannot switch lanes

`REPAIR_UNIQUE` remains limited to semantics-preserving representation fixes such as:

- weekday decoration derived uniquely from an already valid date;
- deterministic canonical token normalization;
- existing one-to-one timestamp syntax repair;
- other representation aliases with exactly one semantic meaning.

Forbidden under repair:

```text
RETROSPECTIVE candidate -> PRESENT candidate
PRESENT candidate -> RETROSPECTIVE candidate
```

Lane switching is source semantics, never representation repair.

## 35. No body-prose rescue

T3-B must not scan arbitrary body prose to repair the common frame header.

Forbidden rescue patterns:

```text
header says present, body mentions 2028 -> rewrite header to 2028
header says 2028, body says "현재" -> infer exit
missing header, body contains date -> promote body date into frame
```

Body generation may depend on the model's chosen temporal interpretation.

Fail closed where canonical frame truth cannot be reconciled safely.

## 36. Missing or malformed frame header

T2-B syntax rules remain in force.

The common narrative frame slot must contain exactly one valid temporal header.

Classes such as:

```text
missing marker
truncated marker
nested marker
multiple competing common-frame headers
mixed invalid range granularity
invalid relation anchor
unparseable exact timestamp
```

are not converted into context enter/exit semantics.

## 37. Present head non-duplication

During retrospective:

```text
frame slot = context.position
```

The present head must not be added as a second common header.

Reason:

- the visible frame represents the depicted scene;
- state already preserves the present return authority;
- T3-C can project both meanings to the model in one compact semantic line;
- two common temporal headers would make Structure ownership and user-visible scene meaning ambiguous.

## 38. Present head is still real canonical truth

Not displaying `head` during retrospective does not weaken it.

During an active 2028 flashback with present 2031 head:

```text
visible frame = 2028 event-local
canonical head = 2031 present authority
```

Both can be true because they answer different temporal questions.

## 39. narrativeTimestamp compatibility

`narrativeTimestamp` remains a compatibility mirror for present head only.

Example:

```text
head = exact 2031-03-07 21:00
context = exact 2028-06-01 10:30
```

Then:

```text
visible frame = 2028-06-01 10:30
narrativeTimestamp = 2031-03-07 21:00
```

This is intentional.

No T3 consumer may overwrite `narrativeTimestamp` from the retrospective frame merely because the frame contains a valid exact timestamp.

## 40. worldYear compatibility

Visible retrospective year never drives `worldYear`.

Example:

```text
head year = 2031
context frame year = 2028
worldYear remains present-owned
```

T3-B candidate acceptance in RETROSPECTIVE lane must not invoke present-world compatibility mutation as a side effect.

## 41. koreanAgeOffset compatibility

The visible event-local frame also does not redefine `koreanAgeOffset`.

T3-B has no authority to mutate age compatibility from event-local timestamp visibility.

Derived event-local age belongs to later T3-C/T4-style selection logic, not frame parsing side effects.

## 42. Stale candidate basis

Candidate basis is request-bound.

If:

```text
candidateBasis.baseRevision != current predecessor temporal revision
```

or equivalent lineage proof fails, then:

```text
DROP_STALE_REVISION
+ NO_COMMIT
```

A stale candidate may not enter, continue, exit, or narrow retrospective context.

## 43. Reroll

Reroll rebuilds candidate basis from the predecessor committed snapshot.

Example:

```text
predecessor context = E0
old accepted candidate -> E1
reroll replacement request/candidate -> E2
```

Correct:

```text
candidate basis rebuild from E0
apply replacement semantics once
```

Forbidden:

```text
use old E1 as hidden basis for replacement
```

The visible frame is assessed against the replacement's effective lane/basis, not the discarded candidate.

## 44. Representation-only edit

An edit that changes only canonical visible representation while preserving parsed TemporalPosition and routing semantics must not change:

```text
lane
head
context
revision
```

Example:

```text
wrong weekday decoration -> deterministic corrected weekday
```

when semantic date/time is unchanged.

## 45. Semantic edit

An edit that changes an authoritative retrospective enter/continue/exit source or the semantic frame position must rebuild from the predecessor snapshot and route through T3-A + T3-B exactly once.

No patching against the already edited/committed context chain.

## 46. Reload

Reload restores committed `head` and `context` first.

The next output candidate basis is selected from current T3-A routing plus restored context.

Reload must not infer lane from the last visible timestamp in chat history.

A historical-looking last frame does not reconstruct context if persisted context is absent.

## 47. Migration

Pre-T3 state normally has:

```text
context = null
```

T3-B migration does not scan old output headers to infer that a flashback was active.

No persisted context means PRESENT lane until a new authoritative retrospective source enters context.

## 48. Unsupported nested retrospective

When context is active and the current source clearly requests a second/nested retrospective under T3-A first-family rules:

```text
UNSUPPORTED_NESTED_RETROSPECTIVE
```

T3-B does not ask the candidate header to decide which historical layer is intended.

No event stack is synthesized from two timestamps.

No new candidate basis is considered safely accepted until a future explicit nested-context contract exists.

## 49. Competing enter/exit controls

A request with unsupported competing controls such as:

```text
"현재로 돌아왔다가 다시 3년 전 장면으로 간다"
```

must not be reduced to whichever timestamp the model chooses.

Candidate content cannot resolve an ambiguous source-control graph.

First-family behavior remains fail closed under T3-A/T1-C source rules.

## 50. Mode A boundary

Mode A may use the full T3-B narrative frame behavior:

```text
present scene -> PRESENT basis
retrospective scene -> RETROSPECTIVE basis
```

The common frame slot displays the depicted narrative scene position.

## 51. Mode C boundary

Mode C may use the same narrative candidate-basis rule, subject to existing B_END handoff and Exposure/Knowledge constraints.

T3-B does not change COMMUNITY exposure authority.

## 52. Mode B boundary

Mode B has a different existing visible temporal authority:

```text
Broadcast airtime
```

T3-B does not replace it with narrative retrospective position.

Therefore:

```text
Mode B common/broadcast visible time
!=
T3 retrospective narrative candidate basis
```

Exact coexistence and prompt projection behavior is reserved for T3-C.

Historical broadcast footage alone does not create T3 context.

## 53. B_END boundary

B_END terminal airtime remains a present-current floor/constraint under existing semantics.

It is not a retrospective frame basis.

If a later Mode C request explicitly enters a retrospective:

```text
present floor/head authority remains preserved
retrospective candidate basis is established separately
```

T3-B never routes B_END airtime directly into context because the visible value looks old/new.

## 54. Exposure / Knowledge boundary

Visible frame truth is temporal scene truth.

It is not a public-information grant.

Hard invariant remains:

```text
TEMPORAL CANONICAL TRUTH
!=
CHARACTER KNOWLEDGE
!=
PUBLIC KNOWLEDGE
!=
COMMUNITY-EXPOSED KNOWLEDGE
```

T3-B adds no exposure flag to the frame header.

## 55. Candidate rejection and #1822

T3-B inherits the T2-B rejection requirement.

Example:

```text
selected lane = RETROSPECTIVE
context constraint = RANGE 2028-06-01..2028-06-03
candidate = exact present 2031-03-07 21:00
```

No safe unique repair exists.

Required semantic result:

```text
REJECT_IRREPARABLE_CONFLICT
+ NO_COMMIT
```

However current production does not yet prove a pre-publication fail-closed transport for such rejected candidates.

Therefore issue #1822 remains a hard runtime activation dependency.

## 56. Rejection must cover state and publication truth

T3-B does not accept this split:

```text
state rejects candidate
but visible output is still published as accepted story
```

That would leave:

```text
canonical context = 2028
visible accepted frame/body = 2031
```

which creates two incompatible truths.

Future runtime must provide the #1822 proof or redesign the feature slice so such irreparable candidates cannot occur.

## 57. No hidden unbounded retry

T3-B does not authorize:

```text
reject
-> secretly retry until one timestamp passes
```

Any future regeneration transport must remain bounded, request-bound, predecessor-bound, and prove the rejected candidate was not published or committed.

This remains part of #1822 resolution, not T3-B implementation authority.

## 58. Structure ownership

Structure continues to own frame grammar/count/order judgment.

T3-B does not ask Structure to choose PRESENT versus RETROSPECTIVE from dates.

Correct division:

```text
Structure
-> identify/parse common temporal frame syntax

T3-A / Time routing
-> select semantic lane

Time
-> compare candidate TemporalPosition against selected expectedPosition

Output Finalize
-> exact-once commit only for accepted transaction
```

## 59. Time ownership

Time remains sole semantic owner for:

- TemporalPosition parsing/normalization;
- precision comparison;
- range/relation compatibility;
- lane-specific expected position supplied by T3 routing;
- candidate semantic assessment;
- temporal proposal commit payload.

T3-B does not create a separate Retrospective timestamp parser module.

## 60. State Reconcile boundary

State Reconcile composes accepted owner results.

It does not decide that a 2028 timestamp means retrospective or that a 2031 timestamp means present.

No semantic lane inference belongs there.

## 61. Output Finalize boundary

Output Finalize must receive an already accepted prepared temporal transaction.

It must not re-decide candidate lane from visible bytes.

Once runtime implementation is eventually authorized, any rejected candidate must be prevented from becoming accepted committed authority under the #1822 contract.

## 62. Prompt boundary

T3-B does not define prompt serialization.

The frame alone intentionally does not reveal both:

```text
event-local position
present return head
```

T3-C owns the compact model-facing semantic projection that carries both when required.

## 63. No prompt growth from frame design

Because T3-B adds no visible lane token and no new prompt field, this design does not itself increase prompt payload.

T3-C must continue the bounded 0/1-line projection principle.

## 64. No event identity

T3-B compares positions in the currently selected lane.

It does not need:

```text
eventId
flashbackId
sceneId
history node
return pointer
```

`temporal.head` already preserves return authority and T3 first-family supports one context only.

## 65. No timeline graph

Candidate headers are not nodes in a temporal graph.

A sequence of retrospective visible timestamps does not create a stored event list.

Only compact current context survives as canonical state.

## 66. Performance target

T3-B remains bounded per output:

```text
one selected candidate basis
+ one common frame temporal header parse
+ constant-size TemporalPosition comparison
+ no history scan
+ no body NLP pass
+ no event ledger traversal
```

Complexity must not grow with chat length.

## 67. Diagnostics boundary

Diagnostics may record bounded classification such as:

```text
candidate lane = RETROSPECTIVE
assessment = ACCEPT_COMPATIBLE_NARROWING
```

but diagnostics never become temporal authority.

A stale diagnostic showing PRESENT/RETROSPECTIVE cannot change candidate basis.

## 68. Source stamp boundary

T3-B does not persist candidate lane as a new provenance ledger.

Canonical state already has:

```text
headSource
context.source
enteredFromRevision
revision
```

Request-scoped candidate basis is ephemeral.

Persist only accepted canonical temporal state required by the owner contract.

## 69. Revision semantics

T3-B adds no new revision behavior beyond T3-A/T1-A.

Representative cases:

```text
entry accepted -> +1
context semantic update accepted -> +1
no-evidence equivalent frame -> same
compatible model-authored narrowing -> +1 if canonical context semantics change
exit accepted -> +1
exit + present advance same transaction -> +1 total
representation repair only -> same semantic revision
rejected/stale candidate -> no mutation
```

## 70. Candidate basis lifetime

The basis exists only for the current generation/candidate transaction.

It must not be reused across:

```text
next request
reroll predecessor change
semantic edit rebuild
reload generation boundary
mode transition with new source routing
```

Each transaction rebuilds the basis from current committed state + current pending proposal.

## 71. Required regression family: entry

Future tests must prove:

1. exact retrospective entry checks candidate against pending context, not old head;
2. DATE_ONLY entry displays DATE header without fake clock;
3. range entry preserves range envelope;
4. vague entry can display relative/UNKNOWN safely;
5. present-looking candidate does not cancel entry;
6. discarded entry candidate never creates committed context.

## 72. Required regression family: continuation

Future tests must prove:

1. active-context no-evidence turn uses committed context basis;
2. exact + duration continuation uses pending context target;
3. DATE_ONLY + duration/range rules remain T2-correct;
4. compatible exact narrowing changes context only;
5. context regression checks are event-local and do not compare as present-head regression;
6. present head remains unchanged.

## 73. Required regression family: exit

Future tests must prove:

1. explicit exit switches candidate basis to present before assessment;
2. exit-only frame serializes preserved head;
3. exit + exact present advancement uses head as arithmetic base;
4. exit + weak present transition preserves weak precision;
5. old event-local candidate after exit conflicts;
6. exit transaction increments revision once total.

## 74. Required regression family: lane inference rejection

Future tests must prove:

1. historical candidate does not enter context;
2. present-looking candidate does not exit context;
3. body tense does not select lane;
4. quoted date does not select lane;
5. same-value head/context does not mutate lane;
6. invalid header does not choose lane by fallback parser.

## 75. Required regression family: precision

Future tests must cover each T2 precision family in retrospective lane:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE DATE
BOUNDED_RANGE MINUTE
RELATIVE_ORDER_ONLY absolute anchor
RELATIVE_ORDER_ONLY PREVIOUS_SCENE
UNKNOWN
```

No T3-only precision encoding should appear.

## 76. Required regression family: safety

Future tests must prove:

1. wrong-lane exact conflict is irreparable when no unique correction exists;
2. repair cannot switch lane;
3. body prose is not scanned for replacement timestamp;
4. missing common header does not infer present/context;
5. stale baseRevision drops candidate;
6. rejected candidate does not mutate canonical state;
7. runtime activation remains blocked until publication fail-closed proof exists where required.

## 77. Required regression family: compatibility

Future tests must prove:

1. ordinary present exact frame remains byte-compatible with T2-B exact grammar;
2. `narrativeTimestamp` stays present-head-owned during retrospective;
3. `worldYear` stays present-head-owned;
4. koreanAgeOffset compatibility does not switch to event-local frame;
5. no second present header appears;
6. Mode B airtime is not hijacked.

## 78. Required regression family: lineage

Future tests must prove:

1. reroll rebuilds lane/basis from predecessor;
2. discarded candidate does not leak selected lane;
3. semantic edit rebuilds source routing once;
4. representation-only edit preserves lane/state semantics;
5. reload uses persisted context, not old visible frame inference;
6. migration does not history-scan old historical timestamps.

## 79. Acceptance matrix

T3-B accepts these boundaries:

| Question | Decision |
| --- | --- |
| Add a second common frame timestamp for present head? | NO |
| Add visible `RETRO` / `PRESENT` tokens? | NO |
| Reuse T2-B precision grammar unchanged? | YES |
| Let candidate timestamp choose lane? | NO |
| Select lane before candidate assessment? | YES |
| Entry turn uses pending context basis? | YES |
| Active context defaults candidate basis to retrospective? | YES |
| Explicit exit switches basis to present before assessment? | YES |
| Exit + present transition uses preserved head as arithmetic base? | YES |
| Equal head/context value implies lane switch? | NO |
| Compatible model-authored narrowing inside context? | YES, under T1-C authority |
| Repair may switch semantic lane? | NO |
| Body prose may rescue wrong-lane header? | NO |
| narrativeTimestamp follows retrospective frame? | NO |
| worldYear follows retrospective frame? | NO |
| Mode B airtime becomes retrospective frame time? | NO |
| #1822 remains activation dependency? | YES |
| Nested retrospective stack? | NO |
| History scan / event ledger? | NO |

## 80. Non-goals

T3-B does not design:

- T3-C prompt projection bytes;
- derived age projection/validation;
- Mode B simultaneous narrative-retrospective prompt semantics;
- Exposure/Knowledge propagation;
- runtime function names or source patch;
- schema version bump;
- cache ABI bump;
- deployment sequence;
- retry transport for #1822;
- nested retrospective stack;
- event switching among multiple past contexts;
- event ledger;
- timeline graph;
- arbitrary prose semantic parser;
- wall-clock/timezone/DST logic.

## 81. Runtime authorization boundary

T3-B design completion does not authorize implementation.

Runtime entry remains gated by the broader T3 umbrella conditions, including at minimum:

```text
lower Temporal layers implemented/live-proven as required
+ #1822 resolved or invariant-preserving redesign approved
+ #1657 resolved/reclassified
+ T3-D completed/main healthy
+ fresh release authority
+ explicit user runtime authorization
```

## 82. Final T3-B contract

The final governing sentence is:

> The visible temporal frame always describes the scene currently being depicted, but the candidate never decides what scene that is; T3-A source routing selects the semantic lane first, then T2-B candidate assessment checks the single frame header against that lane's effective TemporalPosition.

Equivalent compact form:

```text
ROUTING CHOOSES LANE
TIME CHOOSES EXPECTED POSITION
FRAME SERIALIZES POSITION
CANDIDATE DOES NOT CHOOSE ROUTING
```

## 83. Status

```text
T3-B = ACCEPTANCE-READY DESIGN CONTRACT
implementation authority = NONE
runtime change = NONE
prompt runtime change = NONE
cache ABI change = NONE
version change = NONE
release change = NONE
production impact = NONE
```

Next design transaction after acceptance:

```text
T3-C Minimal Projection / Mode / Exposure / Derived-Value Integration
```
