# SimCore T2-C Minimal Temporal Projection / Mode Integration Contract

Date: 2026-09-07
Status: `T2-C DESIGN · NO RUNTIME IMPLEMENTATION AUTHORITY · NO RELEASE CHANGE`
Tracking: #1817
Parent T2 umbrella: #1799 / PR #1800
Parent Temporal program: #1763
T2-A transition contract: #1804 / PR #1806
T2-B visible frame / candidate disposition: #1809 / PR #1813
T1-D projection foundation: #1790 / PR #1791
T1-E integration plan: #1794 / PR #1795
Exposure Knowledge impact scope: `docs/SIMCORE_EXPOSURE_KNOWLEDGE_IMPACT_SCOPE_2026-09-01.md`
Direct-B exposure restraint: `docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md`

## 1. Purpose

T2-A froze weaker TemporalPosition activation and transition semantics.

T2-B froze the precision-aware visible `⏱️[...]` header grammar and candidate disposition contract.

T2-C freezes the pre-generation projection contract:

```text
What is the smallest truthful Temporal fact the main model needs on this turn,
and how does that fact coexist with Mode A, Broadcast Mode B, Mode C,
post-B_END floors, visible frame generation, COMMUNITY exposure policy,
and the prompt/cache ABI?
```

This is a design-only transaction.

No runtime, prompt compiler, state version, cache version, release branch, plugin version or production mutation is authorized.

## 2. Fresh authority at T2-C start

```text
main                    = 25a17f64b18636000f2461bfb713540afe75921e
main health             = CLEAR / STABLE
main Required           = PASS · run 34062456169
production version      = 0.70.10
release-simcore         = ecc55f026315c6482c34d267aba2adb97527cdbc
```

The current main movement immediately before T2-C was unrelated Usage Dashboard recovery work.

Production SimCore remained MATCH and unchanged.

## 3. Inherited ownership

T2-C introduces no new semantic owner.

```text
Time
- owns TemporalPosition and effective temporal generation constraint
- owns precision / arithmetic / compatibility semantics

Lifecycle / existing request owners
- own current mode and already-proven request-scoped facts

Prompt
- relevance gates already-produced semantic facts
- serializes bounded canonical prompt text
- owns prompt ordering / byte ABI only

Broadcast / existing B lifecycle
- owns Broadcast airtime

Exposure Knowledge program
- owns audience-exposure policy lane
- Temporal truth is not exposure truth

Structure
- judges output frame grammar / integrity
- does not calculate Temporal semantics

Output Finalize
- commits accepted state exactly once
```

Prompt must not calculate time, classify arbitrary prose, infer audience knowledge or become a second Temporal state store.

## 4. Central decision: two prompt surfaces, one dynamic Temporal fact

T2-C separates:

```text
A. stable renderer/frame grammar
B. dynamic current-turn Temporal scene fact
```

The stable renderer grammar tells the model how the one T2-B frame slot works.

The dynamic line tells the model what temporal truth or constraint applies now.

This separation is required because:

- the visible header grammar changes rarely;
- the current temporal fact may change every turn;
- UNKNOWN may need no dynamic fact at all;
- Mode B uses Broadcast airtime rather than narrative TemporalPosition for the common frame slot.

## 5. Dynamic line budget

T2-C inherits T1-D minimality and freezes:

```text
T2 scene temporal core = 0 or 1 line
```

T2-C does not own the future derived-age line.

If T4 later activates age projection, the wider T1-D budget may again become:

```text
scene temporal core = 0 or 1
age                 = 0 or 1
```

but T2 itself adds only the scene core.

## 6. What the dynamic line must never contain

Forbidden payload:

```text
temporal.revision
basisRevision numeric value
headSource stamp
send/out ids
lineage ids
parser captures
migration provenance
candidate disposition diagnostics
repair traces
storage keys
full event history
base + delta + result duplication
```

The model receives a consumer-ready semantic fact, not SimCore bookkeeping.

## 7. Canonical dynamic line family

The frozen key prefix is:

```text
temporal_scene=
```

Serialization uses compact 24-hour values inside the prompt.

The prompt form deliberately does not copy visible `⏱️[...]` decoration.

Visible frame serialization remains T2-B output grammar; prompt serialization is a semantic instruction surface.

### 7.1 EXACT_MINUTE

```text
temporal_scene=current;at=2031-03-07T21:55;precision=minute
```

Semantics:

- current depicted narrative scene is at that exact minute;
- no separate world-year line is needed merely to repeat 2031;
- the model must not regress to a historical mention merely because history contains another date.

### 7.2 DATE_ONLY

```text
temporal_scene=current;date=2031-03-08;clock=unknown;exact_narrowing=compatible_only
```

Semantics:

- date is authoritative;
- clock is unknown;
- midnight/noon is not implied;
- model-authored exact narrowing may be accepted only if T2-B/T1-C compatibility permits it.

### 7.3 BOUNDED_RANGE / DATE

```text
temporal_scene=current;date_range=2031-03-10..2031-03-12;exact_narrowing=compatible_only
```

Semantics:

- the current scene lies within the closed date envelope;
- midpoint, lower endpoint and upper endpoint have no preference;
- an exact point may be creatively selected only if compatible.

### 7.4 BOUNDED_RANGE / MINUTE

```text
temporal_scene=current;time_range=2031-03-10T21:00..2031-03-10T23:00;exact_narrowing=compatible_only
```

Both endpoints are complete absolute minute values.

Prompt must not abbreviate away the second date when doing so would create hidden inheritance semantics.

### 7.5 RELATIVE_ORDER_ONLY with exact anchor

```text
temporal_scene=current;relation=AFTER;anchor=2031-03-07T21:55;anchor_precision=minute;exact=unknown;exact_narrowing=compatible_only
```

The anchor is not the current time.

### 7.6 RELATIVE_ORDER_ONLY with date anchor

```text
temporal_scene=current;relation=AFTER;anchor=2031-03-08;anchor_precision=date;exact=unknown;exact_narrowing=compatible_only
```

The date anchor keeps date precision.

It does not mean after midnight or after the end of that date.

### 7.7 RELATIVE_ORDER_ONLY with predecessor basis only

```text
temporal_scene=current;relation=AFTER;anchor=previous_committed_scene;exact=unknown;exact_narrowing=requires_provable_compatibility
```

The prompt does not expose the internal basisRevision.

The stricter narrowing phrase is deliberate.

When no safe absolute anchor exists, the model must not be encouraged to assume that any visually later clock is automatically compatible.

### 7.8 Other Time-approved relations

T2-C may serialize only a relation already approved by Time/T2-A:

```text
AFTER
AT_OR_AFTER
BEFORE
SAME_AS
```

Prompt never activates one of these relations on its own.

## 8. UNKNOWN behavior

Default UNKNOWN with no stale-anchor hazard emits:

```text
0 dynamic Temporal lines
```

This follows T1-D:

```text
unknown with no behavioral consequence -> omit
```

The visible frame is still required and uses the T2-B safe UNKNOWN form through the stable frame policy.

Therefore:

```text
prompt fact absent
!=
visible temporal header absent
```

## 9. Targeted UNKNOWN stale-anchor guard

If omission would create a concrete risk that an older exact value is treated as current truth, one bounded guard may be emitted:

```text
temporal_scene=current;time=unknown;prior_exact_not_current=1
```

This is not the normal UNKNOWN representation.

It exists only for a proven stale-exact hazard such as a migration/compatibility residue path identified by Time/T2-D.

No generic `world_year=unknown` catalog is added.

## 10. Stable visible-frame instruction

T2-B owns the visible grammar.

T2-C freezes the prompt-level stable renderer contract as two semantic lines, subject only to then-current exact-byte escaping/placement during T2-D implementation planning:

```text
temporal_header_syntax=legacy_exact|DATE YYYY-MM-DD|RANGE endpoint..endpoint|(AFTER|AT_OR_AFTER|BEFORE|SAME_AS) anchor|UNKNOWN;range_endpoint=date_or_full_exact_same_granularity;relation_anchor=date_or_full_exact_or_PREVIOUS_SCENE
```

```text
temporal_header_policy=exactly_one_immediately_after_Chatindex;non_b_without_temporal_scene=UNKNOWN;mode_b_frame_owner=broadcast_airtime;do_not_invent_unsupported_precision=1
```

`legacy_exact` deliberately means the already-existing exact `⏱️[YYYY-MM-DD (Ddd) h:mm AM/PM]` format.

The implementation must reuse that existing exact-format instruction instead of creating a conflicting second exact grammar.

These two lines are stable renderer contract, not dynamic Temporal state.

## 11. Why the stable grammar is not folded into every dynamic line

Repeating visible syntax with every current fact would waste tokens and create byte churn.

The preferred architecture is:

```text
stable cached grammar once
+
0/1 volatile current semantic line
```

not:

```text
full grammar + current value repeated every turn in one large volatile block
```

## 12. Effective projection priority

Within T2 current-head scope, project only the strongest effective generation view:

```text
1. current-turn authoritative Time target/constraint
2. eligible post-B_END effective floor when it remains the stronger constraint
3. committed current narrative head
4. targeted UNKNOWN stale-anchor guard
5. no dynamic temporal fact
```

Do not emit lower-priority duplicates once a stronger item subsumes them.

## 13. Base + delta + result remains forbidden

Example:

```text
committed = 2031-03-07T21:00
user = 2 hours later
Time result = 2031-03-07T23:00
```

Projection:

```text
temporal_scene=current;at=2031-03-07T23:00;precision=minute
```

Forbidden:

```text
base=21:00
delta=+2h
target=23:00
```

The model is not asked to redo deterministic arithmetic.

## 14. Mode A

Mode A is the primary T2 narrative consumer.

### Known exact no-change head

Even when the user provides no new temporal transition:

```text
known current head + frame must remain consistent
=> 1 dynamic line
```

No-evidence still preserves state; projection does not imply advancement.

### Current weak head

DATE_ONLY / BOUNDED_RANGE / RELATIVE_ORDER_ONLY are projected using the canonical line family when they constrain current generation or frame output.

### Uninitialized UNKNOWN

```text
0 dynamic lines
visible frame -> ⏱️[UNKNOWN]
```

The model must not invent a date merely to satisfy frame shape.

## 15. Mode B ownership boundary

Broadcast airtime remains the common visible frame-time owner for Mode B.

Hard invariant:

```text
Broadcast airtime != narrative TemporalPosition
```

Default T2 narrative projection in Mode B:

```text
0 dynamic T2 narrative temporal lines
```

A weak narrative TemporalPosition stored elsewhere does not compete with Broadcast for the common frame slot.

## 16. T2 does not create a second Mode B depicted-time channel

T1-D allowed the broader architecture to consider explicit depicted narrative context inside B.

T2-C deliberately does not activate that multi-position capability.

Reason:

```text
Broadcast airtime + simultaneous depicted narrative position
= more than one temporal position at once
= T3 / multi-position territory
```

Therefore T2-C must not smuggle a second `temporal_scene=depicted` line into Mode B.

If a future requirement proves necessary, T3 must design it explicitly.

## 17. Mode B visible header

The common frame header remains the existing Broadcast exact timestamp shape under Broadcast authority.

T2 weak precision does not coerce Broadcast airtime to DATE/RANGE/RELATIVE.

T2-B grammar generalization merely keeps the common parser capable; it does not transfer B semantic ownership.

## 18. Mode C ordinary policy

Outside a stronger post-B_END constraint, Mode C follows Mode A current-scene projection.

Examples:

```text
known current exact -> one exact core line
current DATE_ONLY -> one date core line
current range -> one range core line
current relative -> one relation core line
uninitialized UNKNOWN -> zero dynamic lines
```

COMMUNITY knowledge policy is addressed separately below.

## 19. Post-B_END floor-only case

Existing B_END handoff semantics establish a lower-bound relation rather than automatic equality.

Example:

```text
B_END terminal = 2031-03-07T23:00
only proven follow-up constraint = at or after terminal
```

Projection:

```text
temporal_scene=current;relation=AT_OR_AFTER;anchor=2031-03-07T23:00;anchor_precision=minute;exact=unknown;exact_narrowing=compatible_only
```

Forbidden:

```text
temporal_scene=current;at=2031-03-07T23:00
```

unless another authority independently proves equality.

## 20. Post-B_END stronger-target case

Example:

```text
B_END floor = 23:00
current user control + Time proves target = 23:20
```

Projection:

```text
temporal_scene=current;at=2031-03-07T23:20;precision=minute
```

Do not additionally emit the 23:00 floor.

The stronger target already satisfies it.

The same semantic-deduplication rule applies to compatible DATE/RANGE/RELATIVE targets.

## 21. Post-B_END weaker target conflict

If a current candidate/request target cannot be proven compatible with the B_END floor:

```text
Prompt does not choose a winner
Prompt does not intersect ranges on its own
Prompt does not coerce equality
```

Time/T2-A/T2-B must resolve or reject before a canonical projection plan is serialized.

## 22. COMMUNITY and Temporal truth are different authority axes

T2-C freezes:

```text
TEMPORAL TRUE FOR CURRENT SCENE
!=
COMMUNITY MAY KNOW / STATE IT AS PUBLIC FACT
```

A Time-owned anchor may be available to the model for continuity while still being unavailable to a fictional audience as established knowledge.

T2-C therefore never derives:

```text
community_visible=1
public_fact=1
audience_knows=1
```

from Temporal state alone.

## 23. Exposure Knowledge remains authoritative for audience use

Existing project policy remains:

```text
MODEL / WORLD MAY KNOW
!=
CHARACTER MAY KNOW
!=
PUBLIC MAY KNOW
!=
COMMUNITY MAY USE
```

T2-C adds no generic exposure ledger and no temporal-specific public-knowledge database.

A temporal fact/relation may be stated by COMMUNITY as established public fact only when an independent exposure basis permits it.

Examples of possible independent basis remain owned by Exposure Knowledge, such as:

- visible broadcast prose;
- an explicitly public current-user disclosure;
- another future bounded exposure owner.

Temporal truth by itself is not that basis.

## 24. Direct-B exposure restraint remains narrow

The existing frozen direct-B root exposure design intentionally does not cover every multi-turn B episode.

T2-C does not broaden it.

In particular:

```text
B_START -> B_CONTINUE -> B_END -> C
```

must not become generically audience-exposed merely because T2-C knows the B_END floor.

The existing disposition remains:

```text
DEFER · MULTI_B_SOURCE_EXPOSURE_WINDOW
```

until the Exposure program separately proves an episode-aware source/exposure basis.

## 25. No second temporal-exposure prompt line

T2-C keeps its own budget at 0/1 dynamic Temporal lines.

It does not add:

```text
community_temporal_exposure=...
```

as a second T2 line.

The model consumes the normal Temporal fact for continuity and the independently-owned Exposure/Knowledge contract for audience permission.

This preserves ownership separation and prompt minimality.

## 26. Visible header is not fictional audience evidence

The SimCore common response-frame temporal header is a renderer/control surface.

It must not automatically be treated as something an in-world COMMUNITY audience observed.

Therefore:

```text
visible to ChatGPT user
!=
canonically exposed to fictional audience
```

Exposure must come from the appropriate in-world/publication source contract.

## 27. Legacy temporal prompt lines are replacement candidates, not companions

Current production contains legacy semantics equivalent to:

```text
current_timeline_anchor=...
current_timeline_authority=...
current_character_age_and_status_follow_current_timeline=...
```

and post-B_END floor/handoff lines.

When T2-C is later implemented for the same semantic fact, the new core must not stack with those duplicates.

Target:

```text
old semantic family
XOR
new temporal_scene core
```

for the same fact.

A compatibility shim may exist internally, but duplicate model-facing semantics are forbidden.

## 28. World-year duplication

If the temporal core already contains an authoritative year:

```text
2031
```

Prompt should not add `world_year=2031` merely to repeat the same fact.

Actual removal/conditionalization remains a T2-D implementation-impact task because existing cache fixtures and compatibility consumers must be audited first.

## 29. Age line boundary

T2-C does not activate birthDate-derived age.

T2 does not own T4.

Existing Korean-age compatibility fields remain separate until a later explicitly authorized design changes them.

## 30. Prompt ordering

When emitted, the dynamic line occupies one stable request/current-authority region.

Required relative ordering conceptually:

```text
stable frame grammar
...
current/request-scoped semantic state
  -> temporal_scene line when relevant
...
mode/source/exposure policy consumers
```

Do not split one Temporal fact across slow and volatile prompt regions.

Exact physical location in the then-current Prompt compiler belongs to T2-D.

## 31. Cache tier contract

Dynamic `temporal_scene=` belongs to the existing volatile/current request tier.

Reason:

- current user transition may change it;
- reroll may rebuild it;
- edit may rebuild it;
- post-B_END handoff may change it;
- output commit may change next-turn state.

The stable T2-B header grammar belongs in the existing stable renderer-contract tier if the then-current compiler has an equivalent stable surface.

T2-C authorizes no new cache tier.

## 32. Prompt exact-byte ABI impact

T2-C runtime activation necessarily changes canonical prompt bytes because:

- a new `temporal_scene=` family appears;
- weak visible-header grammar must become model-visible;
- duplicate legacy timeline/floor lines are intended to be replaced/compacted rather than stacked.

Therefore:

```text
PROMPT EXACT-BYTE ABI IMPACT = YES
```

A then-current Prompt compiler version increment is required when implementation changes these bytes.

T2-C does not freeze the numeric future compiler version because production may move before T2 runtime work begins.

## 33. A2 exact-byte fixture requirements

A future T2-D/runtime implementation must cover at least:

```text
A exact current
A date-only
A date range
A minute range
A relative exact anchor
A relative date anchor
A previous-scene relation
A UNKNOWN zero-line + UNKNOWN visible fallback
A targeted stale-exact guard
B exact broadcast frame + zero narrative Temporal lines
C ordinary exact/date/range/relative
C post-B_END floor-only AT_OR_AFTER
C post-B_END stronger exact target with no duplicate floor
C Temporal fact + Community exposure restraint coexistence without ownership fusion
legacy duplicate suppression
```

## 34. A3 descriptor requirements

A3 must classify the new dynamic line as one semantic family rather than one unrelated descriptor per precision token.

Conceptual family:

```text
TEMPORAL_SCENE_CORE
```

Descriptors may record precision/variant metadata, but provider/cache semantics must not treat DATE/RANGE/RELATIVE as separate global subsystems.

Old `current_timeline_anchor` descriptors become superseded where the new core replaces them.

## 35. Zero-line fixture is mandatory

Minimality must be tested positively.

Fixture:

```text
mode A/C
TemporalPosition UNKNOWN
no stale-exact hazard
no current temporal source
```

Expected:

```text
0 dynamic temporal_scene lines
visible non-B frame policy selects UNKNOWN
```

Absence is a contract, not an untested optimization.

## 36. Reroll

Reroll recomputes projection from the predecessor committed snapshot and current candidate request proposal.

A discarded candidate's prompt projection never becomes the next base.

No prompt text is persisted as semantic state.

## 37. Semantic edit

A semantic temporal edit rebuilds Time from the correct predecessor snapshot and then serializes a fresh T2-C line.

Prompt never patches the prior text incrementally.

## 38. Representation-only edit

If canonical Temporal semantics are unchanged:

```text
same semantic projection value
no temporal revision change
```

Canonical prompt bytes may still be regenerated deterministically.

## 39. Reload

Reload consumes normalized Temporal state and recomputes projection.

Forbidden:

```text
persist prompt line as Temporal authority
scan whole chat to rediscover projection
revive stale exact narrativeTimestamp when weak head is canonical
```

## 40. Stale revision / replacement

A stale candidate that T2-B classifies `DROP_STALE_REVISION` must not publish a dynamic line as future canonical truth.

Projection is request/candidate-scoped and dies with the discarded candidate.

## 41. No prompt-side arithmetic

Prompt may serialize `23:20` only because Time supplied `23:20`.

Prompt must not independently do:

```text
23:00 + 20m
range intersection
birthday calculation
weekday calculation for semantic selection
```

Visible weekday decoration repair remains a Time/T2-B representation concern.

## 42. No prompt-side extraction

Prompt must not inspect arbitrary user/model prose to decide:

```text
DATE_ONLY
range
AFTER
public exposure
```

It consumes owner-produced semantic facts only.

## 43. No whole-history scan

Relevance inputs remain bounded:

```text
current Temporal state
current request proposal/effective constraint
current mode
validated post-B_END handoff facts
existing exposure-policy inputs owned elsewhere
```

Rejected:

```text
search all prior dates
search all prior broadcast timestamps
LLM relevance classifier
embedding search
semantic history graph
```

## 44. Performance / size posture

T2-C is constant-size per request.

Target budgets for implementation planning:

```text
dynamic temporal_scene line <= 256 UTF-16 code units
stable temporal header contract total <= 512 UTF-16 code units
new history scans = 0
new storage reads = 0
new storage writes = 0
new network calls = 0
new timers/polling = 0
```

T2-D must verify actual byte/character costs against then-current baseline telemetry before release authorization.

## 45. T2-C does not own T3 retrospective time

Retrospective requires simultaneous depicted event time plus preserved present head.

That is a multiple-position capability.

T2-C does not activate it despite T1-D's broader architectural placeholders.

Reserved for T3.

## 46. T2-C does not own T4 derived age

BirthDate + narrative date -> age is deterministic but belongs to a later Temporal family.

T2-C does not add age prompt lines.

Reserved for T4.

## 47. Failure posture

If an effective temporal constraint cannot be serialized truthfully in the frozen one-line family:

```text
DO NOT fabricate a simpler stronger value
DO NOT dump internal state
DO NOT add a second ad hoc Temporal line
```

The case remains unresolved and blocks that runtime path until T2-D/another child contract provides a bounded representation.

## 48. Runtime implementation dependency

T2-C design may be frozen before T1/T2 runtime activation.

Runtime implementation must still wait for:

```text
live-proven T1 Exact Temporal Core
+
T2-A/B/C/D completed implementation plan
+
proof that T2-B irreparable candidate rejection can prevent authoritative visible/internal split truth
```

T2-C does not grant runtime authority.

## 49. Acceptance matrix

T2-C design is complete when the following are frozen:

```text
0/1 dynamic Temporal line budget
canonical temporal_scene forms for exact/date/range/relative/UNKNOWN guard
UNKNOWN default zero-line behavior
stable weak-header renderer contract
Mode A projection policy
Mode B Broadcast airtime separation
no second Mode B narrative-time channel
Mode C ordinary policy
post-B_END AT_OR_AFTER floor behavior
stronger-target semantic deduplication
Temporal truth != Community exposure truth
existing Exposure Knowledge ownership preserved
direct-B exposure restraint not broadened
legacy duplicate prompt families marked for replacement, not stacking
volatile/stable cache tier placement
prompt exact-byte ABI impact = YES
future compiler-version increment required
A2/A3 fixture families
reroll/edit/reload/stale safety
no arithmetic/extraction/history scan in Prompt
constant-size performance posture
T3/T4 boundaries preserved
implementation authority remains NONE
```

## 50. Current status

```text
T2-C = DESIGN FROZEN BY THIS CONTRACT
implementation authority = NONE
runtime change = NONE
prompt change = NONE
cache ABI runtime change = NONE
release change = NONE
production impact = NONE
```

Next T2 child after repository acceptance:

```text
T2-D = Integration / Migration / Regression / Performance Plan
```
