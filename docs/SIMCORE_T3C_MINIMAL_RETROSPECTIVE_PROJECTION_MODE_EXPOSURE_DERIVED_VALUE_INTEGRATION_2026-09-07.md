# SimCore T3-C Minimal Retrospective Projection / Mode / Exposure / Derived-Value Integration

Date: 2026-09-07
Status: `T3-C DESIGN · NO RUNTIME IMPLEMENTATION AUTHORITY · NO PROMPT/RUNTIME/RELEASE CHANGE`
Tracking: #1840
Parent T3 umbrella: #1825 / PR #1826
T3-A routing: #1830 / PR #1832
T3-B visible frame / candidate lane disposition: #1834 / PR #1837
Parent Temporal program: #1763
T2-C minimal projection foundation: #1817 / PR #1819
T2-B visible frame / candidate disposition: #1809 / PR #1813
T1-D projection foundation: #1790 / PR #1791
T1-B deterministic arithmetic: #1783 / PR #1784
Exposure Knowledge impact scope: `docs/SIMCORE_EXPOSURE_KNOWLEDGE_IMPACT_SCOPE_2026-09-01.md`
Direct-B exposure restraint: `docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md`
T2 runtime rejection-transport blocker: #1822
Product advancement hold: #1657

## 1. Purpose

T3-A froze how a retrospective context enters, continues, and exits without moving the present narrative head.

T3-B froze how the single visible temporal frame slot follows the selected semantic lane and how candidate validation uses that lane before interpreting candidate header content.

T3-C freezes the pre-generation projection and integration contract:

```text
How can the model receive the currently depicted retrospective position
and the preserved present return authority
in the smallest truthful form,
without creating two current clocks,
without hijacking Broadcast airtime,
without leaking Temporal truth into Community exposure authority,
and without making deterministic derived values silently change temporal meaning?
```

This is a design-only transaction.

No runtime source mutation, prompt compiler mutation, cache ABI mutation, state migration, plugin version, release branch, or production mutation is authorized.

## 2. Fresh authority at T3-C start

```text
main                    = e605c51bf72cd2886bfdebd865bb23640f57c214
production version      = 0.70.10
release-simcore         = ecc55f026315c6482c34d267aba2adb97527cdbc
#1822                  = OPEN BLOCKER
#1657                  = OPEN / NEXT_PRODUCT_ADVANCEMENT HOLD
```

The main movement immediately before T3-C was unrelated agent-skill documentation work.

Production SimCore remained unchanged.

## 3. Inherited ownership

T3-C introduces no new semantic owner.

```text
Time
- owns TemporalPosition semantics
- owns present head and retrospective context semantics
- owns effective request-scoped Temporal generation views
- owns deterministic temporal compatibility and arithmetic

T3-A routing / existing request owners
- own source-backed lane selection for the current generation

Prompt
- consumes already-produced semantic projection facts
- relevance-gates them
- serializes bounded canonical prompt text
- owns byte ordering / cache placement, not temporal meaning

Broadcast / existing B lifecycle
- owns Broadcast airtime

Exposure Knowledge
- owns character/public/Community epistemic permission
- Temporal truth is not exposure truth

Structure
- judges output frame grammar and integrity
- does not calculate Temporal semantics

Output Finalize
- commits accepted state exactly once
```

Prompt must not calculate time, choose a lane, inspect arbitrary prose for chronology, infer audience knowledge, or become a second Temporal state store.

## 4. Central rule: one dynamic Temporal line

T3-C preserves the T2-C dynamic budget:

```text
Temporal scene core = 0 or 1 dynamic line
```

For an ordinary present scene, T3-C reuses the T2-C family unchanged:

```text
temporal_scene=current;...
```

For a currently depicted retrospective, T3-C uses one semantic unit:

```text
temporal_scene=retrospective;EVENT_POSITION;PRESENT_RETURN_POSITION
```

The retrospective line carries two positions with different roles:

```text
event_*   = what scene is being depicted now
present_* = where present-world return authority remains
```

This does not mean there are two current narrative heads.

The canonical state remains:

```text
temporal.head             = present narrative authority
temporal.context.position = depicted retrospective position
```

## 5. Why a retrospective needs both positions

Projecting only the event position would leave the model vulnerable to treating the historical event as the new present.

Projecting only the present head would cause generation to ignore the active flashback.

The smallest complete retrospective semantic unit is therefore:

```text
currently depicted event position
+ preserved present return authority
```

No history chain is required.

No entry timestamp, event id, return stack, or provenance tail is required.

## 6. No second present line

When a retrospective line already contains the present return component, Prompt must not also emit a second current-scene line for the same present authority.

Forbidden:

```text
temporal_scene=retrospective;event_at=2028-06-01T10:00;...;present_at=2031-03-07T21:00;...
temporal_scene=current;at=2031-03-07T21:00;precision=minute
```

The correct form is one retrospective line only.

This prevents competing scene semantics and preserves the one-line dynamic budget.

## 7. Position serializer reuse

T3-C does not create a new precision model.

Both event and present components reuse the T2 position families:

```text
EXACT_MINUTE
DATE_ONLY
BOUNDED_RANGE / DATE
BOUNDED_RANGE / MINUTE
RELATIVE_ORDER_ONLY
UNKNOWN
```

The pair serializer prefixes the existing T2-C semantic fragments with either:

```text
event_
present_
```

This keeps one precision vocabulary while making the role explicit.

## 8. Event EXACT_MINUTE

Example:

```text
temporal_scene=retrospective;event_at=2028-06-01T10:00;event_precision=minute;present_at=2031-03-07T21:00;present_precision=minute
```

Semantics:

- the depicted retrospective event is at exactly 2028-06-01 10:00;
- the present return authority is exactly 2031-03-07 21:00;
- the model must not convert the event time into present-world current time;
- the model must not ignore the event because the present value is later.

## 9. Event DATE_ONLY

Example:

```text
temporal_scene=retrospective;event_date=2028-06-01;event_clock=unknown;event_exact_narrowing=compatible_only;present_at=2031-03-07T21:00;present_precision=minute
```

The retrospective date is authoritative.

No event clock is implied.

Compatible model-authored exact narrowing remains subject to T2-B/T3-B candidate rules.

## 10. Event BOUNDED_RANGE / DATE

Example:

```text
temporal_scene=retrospective;event_date_range=2028-06-01..2028-06-03;event_exact_narrowing=compatible_only;present_at=2031-03-07T21:00;present_precision=minute
```

No midpoint, lower endpoint, or upper endpoint is preferred.

The model may creatively select a compatible exact point only where the existing candidate contract can prove compatibility.

## 11. Event BOUNDED_RANGE / MINUTE

Example:

```text
temporal_scene=retrospective;event_time_range=2028-06-01T10:00..2028-06-01T12:00;event_exact_narrowing=compatible_only;present_at=2031-03-07T21:00;present_precision=minute
```

Both endpoints remain complete absolute minute values.

Prompt must not introduce hidden endpoint inheritance.

## 12. Event RELATIVE_ORDER_ONLY with exact anchor

Example:

```text
temporal_scene=retrospective;event_relation=AFTER;event_anchor=2028-06-01T10:00;event_anchor_precision=minute;event_exact=unknown;event_exact_narrowing=compatible_only;present_at=2031-03-07T21:00;present_precision=minute
```

The anchor is not the event position itself.

It is a proven relation constraint.

## 13. Event RELATIVE_ORDER_ONLY with date anchor

Example:

```text
temporal_scene=retrospective;event_relation=BEFORE;event_anchor=2028-06-05;event_anchor_precision=date;event_exact=unknown;event_exact_narrowing=compatible_only;present_at=2031-03-07T21:00;present_precision=minute
```

Date precision remains date precision.

The serializer must not reinterpret the date as midnight or end-of-day.

## 14. Event RELATIVE_ORDER_ONLY with predecessor basis

Example:

```text
temporal_scene=retrospective;event_relation=AFTER;event_anchor=previous_committed_scene;event_exact=unknown;event_exact_narrowing=requires_provable_compatibility;present_at=2031-03-07T21:00;present_precision=minute
```

The internal basisRevision is never exposed.

`previous_committed_scene` refers to the predecessor position in the selected retrospective lane, not to an arbitrary visible timestamp in chat history.

## 15. Event UNKNOWN is still projected

T2-C normally permits an UNKNOWN current scene with no behavioral consequence to emit zero dynamic Temporal lines.

An active retrospective is different.

The retrospective lane itself has a behavioral consequence.

Therefore an active/pending retrospective with UNKNOWN event position must still emit one line.

Example:

```text
temporal_scene=retrospective;event_time=unknown;present_at=2031-03-07T21:00;present_precision=minute
```

This communicates:

```text
we are depicting a retrospective
but its event time is unknown
```

Forbidden:

```text
omit all Temporal projection
```

because omission could cause the model to fall back to present-scene semantics.

## 16. Present component semantics

The present component uses the same T2 precision family.

Its role is different:

```text
present_* = effective present return authority for this generation
```

It is not the currently depicted event while a retrospective is active.

## 17. Present EXACT_MINUTE

Example fragment:

```text
present_at=2031-03-07T21:00;present_precision=minute
```

## 18. Present DATE_ONLY

Example fragment:

```text
present_date=2031-03-07;present_clock=unknown
```

No midnight/noon coercion is allowed.

## 19. Present BOUNDED_RANGE

Date example:

```text
present_date_range=2031-03-07..2031-03-08;present_exact_narrowing=compatible_only
```

Minute example:

```text
present_time_range=2031-03-07T21:00..2031-03-07T23:00;present_exact_narrowing=compatible_only
```

These describe present return constraints, not event-local time.

## 20. Present RELATIVE_ORDER_ONLY

Example:

```text
present_relation=AT_OR_AFTER;present_anchor=2031-03-07T23:00;present_anchor_precision=minute;present_exact=unknown;present_exact_narrowing=compatible_only
```

This form is especially important for post-B_END lower-bound handoff semantics.

The floor is not converted into equality.

## 21. Present UNKNOWN

When present return authority is UNKNOWN, the retrospective line keeps that fact explicit:

```text
temporal_scene=retrospective;event_date=2028-06-01;event_clock=unknown;present_time=unknown
```

If both positions are UNKNOWN:

```text
temporal_scene=retrospective;event_time=unknown;present_time=unknown
```

This is still useful because the model must know that the depicted lane is retrospective.

No fake date is introduced merely to make the line look richer.

## 22. Allowed relation vocabulary

T3-C inherits the Time-approved relation vocabulary unchanged:

```text
AFTER
AT_OR_AFTER
BEFORE
SAME_AS
```

Prompt never activates, transforms, or composes these relations by itself.

## 23. Effective projection object

Time should conceptually produce a semantic projection plan before Prompt serialization.

The exact runtime API name is deferred, but the semantic shape is:

```js
{
  sceneKind: 'CURRENT' | 'RETROSPECTIVE',
  depictedPosition: TemporalPosition | null,
  presentReturnPosition: TemporalPosition | null,
  narrowingPolicy: 'COMPATIBLE_ONLY' | 'REQUIRES_PROVABLE_COMPATIBILITY' | null
}
```

For `CURRENT`:

```text
depictedPosition = effective current position
presentReturnPosition = null
```

For `RETROSPECTIVE`:

```text
depictedPosition = effective event-local position
presentReturnPosition = effective present return authority
```

Prompt serializes this plan.

Prompt does not derive it.

## 24. Present return view priority

The canonical present owner remains `temporal.head`.

For generation, a stronger request-scoped present constraint may temporarily be the correct projection view before commit.

The present component therefore follows the same T2-C effective priority:

```text
1. authoritative pending present target/constraint for this generation
2. eligible post-B_END present floor if it remains the stronger present constraint
3. committed temporal.head
4. targeted stale-exact guard / UNKNOWN
```

Do not emit weaker duplicate present facts once a stronger present return constraint subsumes them.

This is an ephemeral generation view, not a second canonical state.

## 25. Retrospective entry turn

On explicit `RETRO_ENTER`:

```text
canonical predecessor:
  head = H
  context = null

request proposal:
  pending context = E
```

Generation projection:

```text
temporal_scene=retrospective;event=<E>;present=<effective H>
```

The canonical context is still uncommitted until output acceptance.

Nevertheless the model must receive E because it is the effective depicted position for the current candidate.

## 26. Retrospective continuation turn

When context is active and a current request advances or weakens it:

```text
committed context = E0
pending next context = E1
head = H
```

Generation projection:

```text
temporal_scene=retrospective;event=<E1>;present=<effective H>
```

Do not project E0 + delta + E1.

The model receives the already-derived effective result only.

## 27. No-evidence retrospective turn

When context is active and no new temporal transition is proven:

```text
event = committed context.position
present = effective present return authority
```

The retrospective line remains present because scene-lane identity is relevant even without temporal advancement.

Projection does not imply a revision increment.

## 28. Exit-only turn switches before projection

For explicit `RETRO_EXIT` with no separate present transition:

```text
1. T3-A proves EXIT
2. generation lane becomes PRESENT
3. retrospective projection is removed
4. ordinary T2-C PRESENT projection is built from preserved head/effective present authority
5. candidate is assessed in PRESENT lane under T3-B
```

Forbidden:

```text
retrospective line remains in prompt
while visible candidate is expected to return to present
```

The lane switch happens before candidate generation/assessment, not after output commit.

## 29. Exit + present transition

For:

```text
현재로 돌아와 2시간 뒤
```

projection order is:

```text
prove exit
-> switch arithmetic basis to present head
-> Time derives pending present target
-> build ordinary T2-C current projection for that target
-> no retrospective line
```

The retired context is not serialized as the current generation target.

## 30. Same-value lane collision

If event and present serialize to the same TemporalPosition, the retrospective line remains explicit.

Example:

```text
temporal_scene=retrospective;event_date=2031-03-07;event_clock=unknown;present_date=2031-03-07;present_clock=unknown
```

Value equality does not erase the semantic distinction.

It does not imply exit.

## 31. No source/provenance leakage

The retrospective line must never contain:

```text
temporal.revision
basisRevision numeric value
enteredFromRevision
context.source
headSource
sendIndex
outIndex
editRevision
lineage ids
parser captures
migration provenance
candidate disposition diagnostics
repair traces
storage keys
chat-history indices
```

The model receives semantic truth, not bookkeeping.

## 32. No raw state JSON

Forbidden:

```text
temporal={"schemaVersion":1,"revision":17,"head":...,"context":...}
```

The projection is a bounded consumer view.

It is not a debug dump.

## 33. No base + delta + result duplication

Example:

```text
context base = 2028-06-01T10:00
user = 2 hours later
Time result = 2028-06-01T12:00
```

Projection contains only:

```text
event_at=2028-06-01T12:00
```

Forbidden:

```text
event_base=10:00
event_delta=+2h
event_target=12:00
```

The model is not asked to redo deterministic arithmetic.

## 34. Mode A

Mode A may use the full T3 retrospective projection.

Active/pending retrospective:

```text
one dynamic retrospective temporal_scene line
```

Visible common temporal frame slot under T3-B:

```text
event-local depicted position
```

Present return authority remains internal/prompt-visible through the same retrospective line.

No second present `⏱️[...]` header is added.

## 35. Mode A present return

After an explicit exit, Mode A immediately returns to the ordinary T2-C `temporal_scene=current;...` family.

No one-turn retrospective residue is allowed in prompt projection.

## 36. Mode B has three distinct temporal roles

T3-C freezes the separation:

```text
Broadcast airtime
!= currently depicted retrospective narrative event position
!= present narrative return authority
```

These are different semantic roles even when two values happen to be numerically equal.

## 37. Mode B visible frame remains Broadcast-owned

The common visible Mode B temporal header remains Broadcast airtime under the existing Broadcast contract.

T3-C must not replace that header with event-local retrospective time.

Forbidden:

```text
active retrospective during B
-> common B frame header becomes event timestamp
```

The narrative retrospective position is carried only through the semantic projection when needed.

## 38. Mode B retrospective projection

If T3-A source routing has explicitly selected a retrospective depicted lane during Mode B, T3-C may emit one retrospective semantic line:

```text
temporal_scene=retrospective;event=<event-local>;present=<present-return>
```

At the same time:

```text
visible common frame header = Broadcast airtime
```

This is the multi-position capability T2-C intentionally deferred to T3.

It does not create a second narrative visible timestamp.

## 39. Mode B without retrospective context

Ordinary Mode B with no active/pending retrospective remains T2-C behavior:

```text
0 dynamic narrative Temporal lines by default
visible common frame time = Broadcast airtime
```

T3-C does not increase prompt cost for ordinary Broadcast turns.

## 40. Historical footage is not automatic T3 context

A Broadcast clip may depict old footage.

That does not itself authorize:

```text
context = RETROSPECTIVE
```

T3-A source routing still governs retrospective activation.

Therefore:

```text
old B timestamp
historical footage topic
archival visual
quoted old date
```

cannot create T3 context merely because they look historical.

## 41. B_END remains present-world authority

Existing B_END terminal semantics establish a present-current floor/constraint.

T3-C must never route that floor into `event_*` merely because a retrospective is active.

Correct roles:

```text
B_END floor -> present_* component
retrospective event -> event_* component
```

Example:

```text
event = DATE 2028-06-01
B_END present floor = AT_OR_AFTER 2031-03-07T23:00
```

Projection:

```text
temporal_scene=retrospective;event_date=2028-06-01;event_clock=unknown;present_relation=AT_OR_AFTER;present_anchor=2031-03-07T23:00;present_anchor_precision=minute;present_exact=unknown;present_exact_narrowing=compatible_only
```

Forbidden:

```text
event_relation=AT_OR_AFTER 2031-03-07T23:00
```

unless an independent retrospective source actually proves that event relation.

## 42. Stronger present target after B_END

If another authoritative current-present source proves a stronger present return target compatible with the B_END floor, the retrospective line carries only the stronger present component.

Example:

```text
B_END floor = 23:00
stronger present target = 23:20
```

Use:

```text
present_at=2031-03-07T23:20;present_precision=minute
```

Do not also repeat the 23:00 floor.

## 43. Mode C

Mode C follows ordinary T3 routing unless a stronger existing handoff constraint applies.

Active/pending retrospective:

```text
one retrospective temporal_scene line
```

After explicit exit:

```text
ordinary T2-C current projection
```

COMMUNITY is a separate epistemic consumer and does not inherit permission merely because the temporal line exists.

## 44. Temporal truth and Exposure truth remain different axes

Hard invariant:

```text
MODEL / WORLD TEMPORAL TRUTH
!= CHARACTER MAY KNOW
!= PUBLIC MAY KNOW
!= COMMUNITY MAY USE
```

T3-C adds no temporal exposure owner.

It does not create:

```text
community_visible=1
public_fact=1
audience_knows=1
character_knows=1
```

from Temporal state.

## 45. Why the model may receive more than Community may say

The main model may need event and present positions to render chronology consistently.

That does not imply a fictional audience has observed those facts.

Example:

```text
model knows:
  flashback event date = 2028-06-01
  present return date = 2031-03-07

Community exposure authority:
  no independent public basis
```

Correct behavior:

```text
model uses time for narrative consistency
Community does not state hidden dates as public knowledge solely because Temporal knows them
```

## 46. Visible temporal header is not fictional audience evidence

The common `⏱️[...]` frame is renderer/control metadata visible to the ChatGPT user.

It is not automatically an in-world publication surface.

Therefore:

```text
visible to ChatGPT user
!= exposed to fictional audience
```

Exposure must come from the separately-owned source/exposure contract.

## 47. Mode B exposure remains narrow

T3-C does not broaden the existing direct-B exposure contract.

In particular, knowing a Broadcast airtime or a retrospective event position does not make all B episode facts Community-exposed.

Existing deferred multi-B exposure boundaries remain deferred until the Exposure program proves them separately.

## 48. No temporal-exposure companion line

T3-C does not add a second line such as:

```text
retrospective_public=0
community_may_use_event_time=0
```

The model consumes:

```text
Temporal semantic line
+
independently-owned Exposure/Knowledge policy
```

Ownership remains separated.

## 49. Character knowledge boundary

A character appearing inside a retrospective may be portrayed at the correct historical age/date context without T3-C declaring that the character explicitly knows every precise temporal fact.

World-consistency facts and character epistemic permission remain different concerns.

T3-C therefore does not infer:

```text
character knows exact date
character knows future present date
character knows present return authority
```

from the retrospective line.

## 50. Derived-value problem

T3 introduces two legitimate temporal questions:

```text
What is true at the depicted event?
What is true in the present world?
```

A deterministic derived-value consumer must name which question it is answering.

Otherwise an active retrospective can silently change the meaning of a generic helper such as `currentAge`.

## 51. Frozen derived-value selector family

T3-C freezes two conceptual selector roles:

```text
DEPICED_EVENT
PRESENT_WORLD
```

Semantics:

```text
DEPICED_EVENT
-> selected event-local effective TemporalPosition while retrospective is active
-> ordinary effective current position when no retrospective is active and the caller explicitly asks for depicted-scene truth

PRESENT_WORLD
-> effective present return authority / canonical head family
-> never silently switches to retrospective context
```

Exact runtime enum/function names may differ if the semantic mapping remains one-to-one.

## 52. Time owns temporal basis selection

A future helper may conceptually expose:

```js
Time.selectTemporalBasis({ role: 'DEPICED_EVENT' | 'PRESENT_WORLD', ... })
```

This is not authorization to add the helper now.

The important contract is ownership:

```text
Prompt does not choose the basis
Age module does not guess the basis
Exposure does not choose the basis
Time/T3 routing semantics choose the basis
```

## 53. Birthday-aware full-years derivation

T1-B already defined deterministic `fullYearsElapsedSinceBirth` mathematics when a birth-date anchor and applicable date are authoritative.

T3-C freezes temporal basis selection only.

For a depicted flashback age question:

```text
birthDate + DEPICED_EVENT date
```

For present age/status:

```text
birthDate + PRESENT_WORLD date
```

## 54. No persisted currentAge

T3-C does not authorize:

```text
state.currentAge
context.age
presentAge
flashbackAge
```

Derived age remains recomputed from authoritative inputs.

The same no-ledger principle applies.

## 55. Weak precision derived values remain weak

If the selected TemporalPosition does not prove one exact derived result, the derived consumer must preserve uncertainty.

Examples inherited from T1-B:

```text
bounded date crossing birthday -> age may be a bounded set/range
DATE_ONLY sufficient for full-years result -> exact full-years may be provable
UNKNOWN date -> exact age unavailable
```

T3-C does not authorize picking one convenient age.

## 56. T3-C does not activate a new age prompt line

This contract does not add:

```text
character_age=...
```

or another birthday-aware model-facing line.

Reason:

- T3-C is a temporal multi-position integration slice;
- T2-C explicitly deferred independent age projection activation;
- a future T4/age transaction may decide relevance and visibility policy separately.

T3-C only freezes the lane selector so future age work cannot confuse event age with present age.

## 57. Validator-only derived values remain possible

A deterministic derived value may be useful for internal validation without entering the prompt.

T3-C preserves:

```text
internal derivability
!= prompt visibility
!= character knowledge
!= Community exposure
```

A future validator may consume the selected temporal basis without requiring a new model-facing line.

## 58. worldYear remains PRESENT_WORLD-owned

Existing compatibility `worldYear` remains present-head-owned.

During retrospective:

```text
head year = 2031
context year = 2028
worldYear = 2031
```

T3-C must not project or commit `worldYear=2028` merely because the event is in 2028.

## 59. koreanAgeOffset remains existing compatibility semantics

A retrospective does not decrement, rewrite, or reinterpret `koreanAgeOffset`.

T3-C introduces no new Korean-age semantics.

Any future age modernization remains separate work.

## 60. Weekday/calendar derived decoration

If a visible event-local exact timestamp requires deterministic weekday decoration, Time may derive that representation from the selected event date under the existing formatter contract.

This does not change present-world compatibility fields.

Prompt itself does not calculate weekday values.

## 61. Relevance rule

An active/pending retrospective makes the T3-C line relevant by definition because lane identity changes generation semantics.

Therefore:

```text
active/pending retrospective -> exactly 1 dynamic retrospective Temporal line
```

No active/pending retrospective:

```text
0 T3-specific dynamic lines
```

The ordinary T2-C current line may still exist independently when relevant.

## 62. Constant-size guarantee

Prompt cost must not grow with:

```text
number of retrospective turns
chat length
number of historical dates mentioned
number of rerolls
number of edits
```

T3-C projects only:

```text
one effective event position
one effective present return position
```

inside one line.

No event ledger is serialized.

## 63. Stable renderer grammar reuse

T3-C does not add a new stable renderer block.

The existing T2-C stable temporal-header policy must be extended/replaced in-place at implementation time so it can express:

```text
non-B common frame owner = effective depicted narrative lane
Mode B common frame owner = Broadcast airtime
```

The exact byte change belongs to T3-D implementation planning.

Do not stack a second competing temporal-header policy line.

## 64. Dynamic cache tier

The retrospective `temporal_scene=` line belongs in the existing volatile/current request tier.

Reasons:

- entry may begin on the current request;
- continuation may change the event position;
- exit may remove the line;
- present return constraints may change;
- reroll/edit may rebuild the current proposal.

No new cache tier is authorized.

## 65. Stable cache tier

The renderer grammar remains in the existing stable renderer-contract tier if the then-current compiler still has that surface.

T3-C does not move dynamic event/present values into a stable tier.

## 66. Prompt exact-byte ABI impact

Runtime activation of T3-C necessarily changes canonical prompt bytes because:

- the retrospective variant of `temporal_scene=` is new;
- event and present components must coexist in one semantic family;
- the stable frame policy must understand the depicted narrative lane for non-B modes;
- duplicate legacy timeline semantics must not be stacked.

Therefore:

```text
PROMPT EXACT-BYTE ABI IMPACT = YES
```

A future runtime implementation requires then-current Prompt compiler/cache-version audit and appropriate version movement.

T3-C does not freeze the numeric future version now.

## 67. Descriptor family

Future A3/prompt descriptors should treat retrospective projection as a variant of the existing Temporal scene family, not as a new global subsystem.

Conceptually:

```text
TEMPORAL_SCENE_CORE
  variant = CURRENT | RETROSPECTIVE
```

Event/present precision metadata may be recorded in descriptors if necessary, but should not create one provider family per precision combination.

## 68. No combinatorial prompt templates

The implementation must not create a hand-written template for every possible pair such as:

```text
EXACT event + EXACT present
EXACT event + DATE present
DATE event + EXACT present
DATE event + RANGE present
...
```

Use one deterministic position serializer twice with role prefixes.

This keeps code and test complexity bounded.

## 69. Projection must be deterministic

Given the same semantic projection plan, Prompt must emit the same canonical bytes.

No prose paraphrasing, locale-sensitive formatting, or model-generated temporal summary is allowed in the canonical projection line.

## 70. Reroll

Reroll rebuilds from the predecessor committed snapshot and current request proposal.

Correct:

```text
predecessor head/context
-> T3-A routing
-> Time effective projection plan
-> T3-C serialization
```

A discarded candidate's projection is never persisted as state.

## 71. Edit

Representation-only edit with unchanged Temporal semantics:

```text
same semantic projection plan
no Temporal revision change
```

Semantic retrospective edit:

```text
rebuild from predecessor
-> route through T3-A
-> recompute effective event/present view
-> serialize fresh line
```

No prompt text is patched incrementally as semantic authority.

## 72. Reload

Reload consumes normalized committed Temporal state and recomputes projection.

Forbidden:

```text
persist temporal_scene text as state authority
scan whole chat to rediscover flashback state
reconstruct present return head from historical prose
revive stale exact narrativeTimestamp as event time
```

## 73. Stale candidate

A stale base revision invalidates the request-scoped projection plan together with the candidate.

A stale retrospective line must not become the next canonical prompt/state basis.

## 74. Candidate conflict and #1822

T3-C projection can guide the model toward the correct lane, but it does not eliminate the possibility of an irreparable wrong-lane or out-of-constraint visible candidate.

Therefore #1822 remains a runtime activation dependency.

T3-C must not claim that better prompting is equivalent to fail-closed publication safety.

## 75. Product advancement hold

#1657 remains an independent product advancement hold.

T3-C design completion does not authorize skipping that hold.

No runtime branch or release preparation begins from this transaction.

## 76. Performance contract

Projection work is bounded to:

```text
current normalized temporal state
current pending temporal proposal
current mode
current relevant B_END handoff constraint
already-produced Exposure policy inputs only for ownership separation
```

Forbidden:

```text
whole-history temporal scan
whole-message semantic mining beyond T3-A bounded source contract
arbitrary NLP pass
event database lookup
retrospective stack traversal
unbounded provenance serialization
```

Expected complexity is constant with respect to chat length.

## 77. First-slice regression family: projection shape

Future implementation must prove at minimum:

1. active exact retrospective emits one line containing event exact + present exact;
2. active DATE_ONLY event emits event clock unknown without midnight fabrication;
3. active event date range preserves the full envelope;
4. active event minute range preserves full endpoints;
5. active event relative exact anchor preserves relation;
6. active event relative date anchor preserves date precision;
7. active `AFTER previous scene` does not expose basisRevision;
8. active UNKNOWN event still emits one retrospective line;
9. UNKNOWN present return is represented truthfully;
10. event and present both UNKNOWN still emit one lane-bearing line;
11. source/revision/provenance fields never appear.

## 78. Regression family: request-scoped routing

12. RETRO_ENTER projects pending context before commit;
13. RETRO_CONTINUE projects pending next context;
14. no-evidence active retrospective preserves context projection without revision change;
15. RETRO_EXIT removes retrospective line before candidate generation;
16. RETRO_EXIT + present +N projects only the pending PRESENT target;
17. same-value event/present positions remain explicitly retrospective while context is active;
18. stale/discarded candidate projection cannot become future authority.

## 79. Regression family: frame coexistence

19. Mode A retrospective visible frame uses event-local position;
20. Mode A emits no second present common header;
21. Mode B ordinary turn remains Broadcast header + zero narrative T3 line;
22. Mode B active retrospective keeps Broadcast header and emits one narrative retrospective semantic line;
23. Mode B retrospective event never replaces Broadcast airtime;
24. historical footage alone does not activate retrospective projection;
25. Mode C active retrospective uses one retrospective semantic line;
26. exit returns Mode A/C to ordinary T2-C current projection.

## 80. Regression family: B_END

27. B_END floor during active retrospective appears only in present component;
28. B_END floor is `AT_OR_AFTER`, not equality, unless another authority proves equality;
29. stronger compatible present target suppresses duplicate floor;
30. event component is not overwritten by B_END present floor.

## 81. Regression family: Exposure / Knowledge

31. Temporal retrospective fact does not generate `community_visible` or equivalent;
32. visible frame header is not treated as fictional audience evidence;
33. Community cannot cite hidden retrospective timing without independent exposure authority;
34. model may use hidden temporal truth for continuity without Community permission;
35. character knowledge is not inferred from event/present projection;
36. direct-B exposure restraint remains unchanged.

## 82. Regression family: derived values

37. depicted flashback age basis selects event date when future age derivation is enabled;
38. present age/status basis selects present head, not context;
39. worldYear remains present-owned during retrospective;
40. koreanAgeOffset remains unchanged by retrospective;
41. weak event date that cannot prove exact age does not invent one;
42. no `currentAge` persistence is introduced;
43. T3-C alone adds no age prompt line.

## 83. Regression family: cache and performance

44. one dynamic Temporal line maximum during active retrospective;
45. no T3-specific line outside retrospective;
46. prompt size does not grow with number of retrospective turns;
47. no chat-history scan is introduced;
48. dynamic line remains volatile/current tier;
49. stable renderer policy is replaced/extended in-place, not duplicated;
50. same semantic plan serializes exact same bytes.

## 84. Non-goals

T3-C does not authorize or design:

- nested retrospective stacks;
- multiple simultaneous narrative event contexts;
- arbitrary timeline graphs;
- event ledgers;
- automatic dream/vision context activation;
- arbitrary assistant prose temporal extraction;
- generic semantic Community fact checker;
- temporal exposure ledger;
- birthday extraction from free-form lore;
- new persisted age fields;
- real-world time/timezone/DST;
- release/version/runtime mutation.

## 85. Implementation dependency chain

T3-C design can be accepted independently of runtime entry.

Future T3 runtime activation remains gated by at least:

```text
T1 exact Temporal core live-proven as required
+ T2 weak precision/frame layers live-proven as required
+ #1822 resolved or invariant-preserving redesign approved
+ #1657 resolved/reclassified
+ T3-D merged and main healthy
+ fresh production/release authority
+ explicit user runtime authorization
```

T3-C does not grant implementation authority by being merged.

## 86. Acceptance criteria

T3-C design is accepted only if the repository records all of the following:

- one dynamic retrospective line maximum;
- event + present in one semantic unit;
- all T2 precision classes reusable for each role;
- UNKNOWN event still carries retrospective lane identity;
- pending entry/continuation views project before commit;
- exit switches to PRESENT projection before candidate generation;
- Mode B Broadcast airtime remains visible-frame owner;
- B_END affects present return authority, not event-local context;
- Temporal truth does not grant Exposure/Community permission;
- derived-value selector distinguishes DEPICED_EVENT from PRESENT_WORLD;
- no new age prompt line or persisted age state;
- constant-size/no-history-scan guarantee;
- prompt exact-byte ABI impact acknowledged;
- #1822/#1657 runtime gates preserved;
- no runtime/release mutation in this design transaction.

## 87. Final contract

```text
T3-C governing principle:

THE MODEL MAY NEED TWO TEMPORAL POSITIONS,
BUT SIMCORE STILL OWNS ONE PRESENT HEAD.

ACTIVE RETROSPECTIVE PROMPT
= ONE LINE
= EVENT-LOCAL DEPICTED POSITION
+ PRESENT RETURN AUTHORITY

ROUTING SELECTS THE LANE
TIME SELECTS THE POSITIONS
PROMPT SERIALIZES THEM
BROADCAST KEEPS ITS OWN AIRTIME
EXPOSURE KEEPS ITS OWN KNOWLEDGE AUTHORITY
DERIVED CONSUMERS MUST NAME EVENT VS PRESENT
```

Status after design acceptance target:

```text
T3-A = ACCEPTED DESIGN
T3-B = ACCEPTED DESIGN
T3-C = ACCEPTED DESIGN
T3-D = NEXT
implementation authority = NONE
runtime change = NONE
prompt runtime change = NONE
release change = NONE
production impact = NONE
```
