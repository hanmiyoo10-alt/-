# SimCore T1-E Integration / Implementation Slice / Regression / Performance Plan

Date: 2026-09-07
Status: `T1-E DESIGN FROZEN · NO RUNTIME IMPLEMENTATION AUTHORITY · NO RELEASE CHANGE`
Tracking: #1794
Parent Temporal program: #1763
Ownership/source map: #1775
T1-A state/schema: #1780 / PR #1781
T1-B deterministic arithmetic: #1783 / PR #1784
T1-C source/extraction/disposition: #1786 / PR #1787
T1-D prompt projection: #1790 / PR #1791
Umbrella deterministic-state architecture: #1768

## 1. Purpose

T1-A through T1-D define the intended Temporal semantics.

T1-E converts those contracts into a bounded implementation plan without yet changing production runtime.

T1-E must freeze:

- exact production seams to modify;
- first end-to-end runtime slice;
- persistent-state migration and rollback behavior;
- candidate assessment reuse across Structure and Output Finalize;
- prompt ABI cutover;
- permanent regression coverage;
- performance ceilings;
- release/version boundary;
- real long-chat acceptance and rollback criteria.

This document does **not** authorize implementation or deployment.

## 2. Fresh authority

At the final T1-E design write:

```text
main                    = ee2b12d192d5fc76bf0de750a4e1ef61bd3c48db
production version      = 0.70.10
release-simcore         = ecc55f026315c6482c34d267aba2adb97527cdbc
STATE_VERSION            = 5
CORE_STATE_VERSION       = 10
PROMPT_COMPILER_VERSION  = 4
```

Production release source remains the runtime authority.

## 3. Current product-advancement hold

Issue #1657 remains an open production FIX for stale operator release-card content and explicitly carries:

```text
NEXT_PRODUCT_ADVANCEMENT = HOLD UNTIL REPAIRED OR EVIDENCE-RECLASSIFIED
```

Therefore:

```text
T1-E design work                       = ALLOWED
T1 runtime implementation/publication = BLOCKED BY #1657 until resolved/reclassified
```

The #1657 repair must remain a separate product transaction.

T1 must not absorb the operator-card repair or repository/deployment-system restructuring.

## 4. Release-family decision

T1 is not a v0.70.11 metadata patch.

It adds a new persistent semantic state family and changes model-visible prompt bytes.

Planning candidate:

```text
T1 first runtime release = v0.71.0
```

This is a design identity, not publication authority.

When implementation becomes authorized, the runtime branch must start from the **then-current accepted `release-simcore` tip after #1657**, not from a stale v0.70.10 copy.

## 5. First-release scope decision

T1 does **not** activate the whole T1-A precision lattice in v0.71.0.

First runtime slice:

```text
T1-R1 = EXACT TEMPORAL CORE
```

Live semantic state in R1 is deliberately restricted to:

```text
UNKNOWN
EXACT_MINUTE
```

`temporal.context` remains null in the R1 live path.

This preserves a complete compatibility mirror through `narrativeTimestamp` and gives the first release a clean rollback boundary.

## 6. T1-R1 live capabilities

R1 authorizes, after a later explicit implementation approval:

- migration from a valid legacy `narrativeTimestamp` to `temporal.head = EXACT_MINUTE`;
- UNKNOWN when no valid exact legacy narrative timestamp exists;
- bounded leading current-user exact-minute absolute controls;
- bounded leading exact numeric relative duration controls when the base is exact;
- exact minute/hour/day/week arithmetic;
- valid strict month/year field shifts under T1-B;
- strict invalid-calendar-target failure with no clamp;
- known canonical assistant timestamp compatibility/authorship;
- compatible exact output acceptance;
- unique deterministic canonical timestamp repair when T1-C permits it;
- exact-once accepted-output temporal commit;
- stale `baseRevision` drop;
- reroll/edit/reload exact-state preservation;
- one compact model-facing exact temporal scene line;
- zero new T1 temporal prompt line when current T1 state is UNKNOWN and no exact current target exists.

## 7. Explicitly deferred live capabilities

R1 does not activate these source/state paths:

```text
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
active retrospective context
birthday/full-years prompt projection
arbitrary age prose checking
range/relative candidate conflict rejection UX
```

The T1-A/T1-B pure representations/helpers may be implemented and unit-tested if useful, but their live source activation is deferred.

Reason:

```text
current visible frame requires an exact canonical timestamp
+
range/relative constraints may have no unique correct repair
+
current runtime has no separately proven candidate-regeneration/rejection transport for that case
```

R1 therefore avoids manufacturing a value merely to keep the visible frame exact.

## 8. Follow-on activation gates

Later Temporal activation should be split by proof boundary, not by feature count.

Conceptual sequence:

```text
R1 exact core
-> R2 weaker precision (DATE_ONLY / range / relative) after irreparable-candidate handling proof
-> R3 retrospective context after multi-turn edit/reroll/reload proof
-> R4 structured birthDate / derived full-years projection after convention/relevance proof
```

Future release numbers are not frozen here.

## 9. Existing production seams

Fresh production source confirms the relevant physical seams:

```text
State Reconcile.initialState
State Reconcile.reconcileState
Time.parseTimestamp
Time.resolveCalendarTransition
Time.narrativeProgressionHint
Time.resolvePostBEndCurrentTimeFloor
Time.enforceNarrativeCurrentTimeFloor
Time.narrativeTimestampSequence
Time.commitNarrativeTimestamp
Time.syncNarrativeTimestamp
Time.applyWorldYear
Lifecycle.prepareTurn
Prompt.compileSlowState
Prompt.compileConditionalGuidance
Prompt.compileRuntimePromptParts
Structure.validateStructure
Output Finalize.finalizePreparedOutput
Edit Reconcile predecessor rebuild path
Session prepared-output validation/finalize orchestration
```

No new global Temporal module is introduced.

## 10. Ownership remains unchanged

```text
Time            = temporal semantics / normalization / arithmetic / assessment
State Reconcile = portable-state assembly and normalization composition
Lifecycle       = bounded request preparation / eligibility orchestration
Prompt          = relevance gating and deterministic serialization
Structure       = judge only
Session         = thin orchestration and one-assessment reuse
Output Finalize = accepted-output exact-once mutation
Edit Reconcile  = predecessor rebuild/application coordination
Store           = persistence mechanics only
Lineage         = committed identity, never story time
```

T1 is a feature extension inside the frozen M2-6 architecture, not an M2-7 structural program.

## 11. State Reconcile -> Time dependency

T1-A requires Time to remain the semantic normalizer for temporal state.

Preferred implementation seam:

```text
Time.createInitialTemporalState()
Time.normalizeTemporalState(rawTemporal, migrationContext)
```

State Reconcile composes these results.

This requires one intentional architecture-manifest edge:

```text
state-reconcile -> time
```

Current layer policy permits Domain -> Domain and no reverse `time -> state-reconcile` edge exists.

Required implementation treatment:

- add the dependency explicitly to `config/simcore-architecture-v2.json`;
- keep State Reconcile as integration owner rather than temporal semantic owner;
- keep Time independent of State Reconcile;
- architecture drift guard must pass;
- classify this as a feature-owned dependency addition, not M2-7 ownership movement.

Duplicating temporal normalization inside State Reconcile is rejected.

## 12. Persistent schema identity

T1 adds a persistent `temporal` field with contract meaning.

T1-E selects:

```text
STATE_VERSION       5 -> 6
CORE_STATE_VERSION 10 -> 11
temporal.schemaVersion = 1
```

Reason:

`stateVersion` and `coreStateVersion` are format/contract identities, and T1 changes the persistent field set and semantic compatibility contract.

This is not an ownership-refactor bump.

Implementation that cannot preserve this migration contract is a stop condition requiring T1-E amendment.

## 13. R1 portable state

R1 persists the T1-A object shape:

```js
temporal: {
  schemaVersion: 1,
  revision: 0,
  head: TemporalPosition,
  headSource: TemporalSourceStamp | null,
  context: null,
}
```

R1 live head values are only:

```text
{ precision: 'UNKNOWN' }

or

{
  precision: 'EXACT_MINUTE',
  date: 'YYYY-MM-DD',
  minuteOfDay: 0..1439
}
```

The full T1-A union remains the design target, but weaker live variants are gated off in R1.

## 14. Compatibility mirror

R1 has a strict invariant:

```text
temporal.head == EXACT_MINUTE
<=>
narrativeTimestamp is the exact canonical rendered mirror
```

And:

```text
temporal.head == UNKNOWN
-> narrativeTimestamp = null unless legacy state is still being migrated in the same normalization transaction
```

There must never be two independent exact current-time authorities.

`worldYear` and `koreanAgeOffset` keep their existing compatibility meanings.

## 15. Migration from pre-T1 state

For raw snapshots whose incoming outer schema identity predates T1:

```text
raw STATE_VERSION < 6
OR raw CORE_STATE_VERSION < 11
```

migration authority is legacy state.

Rules:

```text
valid legacy narrativeTimestamp
-> temporal.head = EXACT_MINUTE(parsed legacy timestamp)
-> headSource = MIGRATION
-> revision = 0

no valid legacy narrativeTimestamp
-> temporal.head = UNKNOWN
```

Do not infer date from `worldYear` or age offset.

## 16. Rollback-residue guard

A downgrade/re-upgrade sequence creates a subtle hazard.

Example:

```text
v0.71 writes temporal exact A + narrativeTimestamp A
rollback to old runtime
old runtime ignores temporal but later advances narrativeTimestamp to B
unknown temporal field may remain A
re-upgrade to v0.71
```

If re-upgrade blindly trusts the surviving `temporal=A`, story time regresses to stale A.

Therefore normalization must inspect the **incoming raw outer schema versions before overwriting them**.

Mandatory rule:

```text
incoming outer schema is pre-T1
-> any surviving temporal object is non-authoritative rollback residue
-> rebuild temporal from current legacy narrativeTimestamp
```

Only a snapshot carrying T1-or-newer outer schema identity plus valid temporal schema may treat `temporal` as canonical authority.

This guard is required for safe rollback and later re-upgrade.

## 17. Malformed-version posture

Malformed/missing incoming version identity must not upgrade stale `temporal` to authority.

Conservative rule:

```text
unproven T1 outer identity
-> use bounded legacy migration path
-> never prefer stray temporal data over a valid current legacy narrativeTimestamp
```

No history rescan is allowed as a recovery shortcut.

## 18. R1 source extraction

R1 extends the existing bounded opening-source posture.

Current production `narrativeProgressionHint` already inspects only the leading 420 UTF-16 code units.

R1 source extraction must stay within that existing bound.

Eligible first-slice source forms are only those that can produce an exact result:

- exact current timestamp with minute precision;
- exact integer relative duration against an exact base;
- deterministic exact aliases already admitted by the bounded source contract when their target is exact;
- existing validated post-B_END facts only through their existing compatibility path.

No whole-message or history scan is added.

## 19. R1 arithmetic

Time owns pure arithmetic.

Recommended conceptual exports:

```text
parseExactRelativeDurationToken
applyTemporalDelta
normalizeTemporalPosition
```

R1 commits a result only when the strongest result is `EXACT_MINUTE`.

Examples:

```text
21:00 + 2h -> 23:00
23:00 + 2h -> next day 01:00
Jan 15 + 1mo -> Feb 15
Jan 31 + 1mo -> INVALID_CALENDAR_TARGET
```

Invalid month/year targets are not clamped.

## 20. Pending proposal

Lifecycle extends the existing pending working set with one bounded proposal:

```js
pending.temporalProposal = {
  baseRevision,
  observation,
  disposition,
  headOp,
  nextHead,
  contextOp: 'KEEP',
  nextContext: null
}
```

R1 proposal values remain constant size.

A user source does not mutate canonical temporal state before accepted output commit.

## 21. Candidate assessment should be computed once

A central T1-E integration decision is to avoid two semantic Time calculations for the same candidate.

After `Output Compat.prepareOutput`, Session computes one immutable assessment:

```js
const temporalAssessment = time.assessTemporalCandidate(
  base,
  prepared.content
);
```

Exact signature is implementation detail, but the assessment must contain all bounded facts required by Structure and Output Finalize.

Then Session passes the same object to both consumers:

```text
Structure.validateStructure(..., { temporalAssessment })
OutputFinalize.finalizePreparedOutput(..., { temporalAssessment })
```

`validateStructure` keeps the extra argument optional for existing callers.

`finalizePreparedOutput` already has an options object and may consume the assessment there.

## 22. Why Session owns assessment reuse

Session already owns prepared-output validation/finalize orchestration and already depends on Time, Structure, and Output Finalize.

Therefore this pattern adds no upward dependency and preserves:

```text
Time      computes
Structure judges
Finalize  commits
Session   transports one immutable result between them
```

Structure must not independently calculate dates.

Finalize must not independently reinterpret source prose.

## 23. R1 candidate assessment family

R1 can use a narrow subset of the T1-C family:

```text
NO_TEMPORAL_EVIDENCE
ACCEPT_SAME
ACCEPT_USER_DERIVED_EXACT
ACCEPT_OUTPUT_AUTHORED_EXACT
REPAIRABLE_EXACT_CONFLICT
INVALID_ARITHMETIC
CURRENT_HEAD_REGRESSION
INVALID_CANONICAL_SURFACE
STALE_PROPOSAL
```

Weaker precision and retrospective dispositions remain dormant in R1 live routing.

## 24. Exact canonical repair

Repair remains restricted to the known canonical timestamp surface.

Eligible example:

```text
base 21:00
user +2h
unique required target 23:00
candidate canonical timestamp 00:00
```

Because one exact answer exists, Output Finalize may replace only that canonical metadata surface when Time marks the assessment repairable.

Forbidden:

- rewriting arbitrary story prose;
- choosing a value from a range;
- month-end clamping;
- repairing unsupported source ambiguity.

## 25. R1 avoids new candidate-rejection transport

R1 is intentionally selected so ordinary authoritative temporal conflicts have either:

- one exact compatible value;
- one exact deterministic repair target;
- or no valid temporal mutation.

The first release therefore does not require a new host regeneration/rejection transport merely to support range/relative semantics.

That transport/UX proof is an entry gate for later weaker-precision activation.

## 26. Exact-once commit

Output Finalize remains the only accepted-output temporal mutation seam.

Required sequence:

```text
predecessor committed state
-> pending exact proposal
-> prepared candidate
-> one Time assessment
-> Structure judgment
-> optional unique canonical repair
-> accepted Output Finalize
-> temporal commit once
-> narrativeTimestamp exact mirror update
-> worldYear compatibility update through existing Time seam
```

If `proposal.baseRevision != temporal.revision`:

```text
STALE_DROP
no temporal mutation
```

## 27. Reroll and edit

Candidate discarded before commit:

```text
canonical temporal state unchanged
```

Replacement of an already committed output:

```text
rebuild predecessor snapshot
-> re-extract/recompute replacement once
-> commit replacement once
```

Never apply old committed effect plus replacement effect.

Representation-only canonical timestamp edits that normalize to the same exact point preserve temporal revision.

Semantic timestamp edits rebuild from predecessor through Time.

## 28. Reload

Reload uses persisted normalized state only.

No chat rescan is introduced.

Current T1 snapshot:

```text
valid T1 outer schema + valid temporal schema
-> normalize temporal in Time
-> preserve exact/unknown state
```

Pre-T1 or rollback-residue snapshot:

```text
-> legacy migration rule from current narrativeTimestamp
```

## 29. Prompt compiler decision

R1 changes model-visible prompt bytes and line families.

T1-E selects:

```text
PROMPT_COMPILER_VERSION 4 -> 5
```

Do not introduce a model-visible `promptCacheAbiRevision` field merely for T1.

The stable prompt core should remain byte-identical where its semantics are unchanged.

The owned prompt change begins in current/volatile temporal serialization.

## 30. R1 exact temporal core serialization

Canonical conceptual line:

```text
temporal_scene=current;current_time=<canonical exact narrative timestamp>;precision=minute;historical_context_reference_only=1
```

Implementation may reuse the existing canonical timestamp rendering rather than create a second visible timestamp grammar.

Properties:

- exactly one T1 scene line when an exact current target/head constrains generation;
- zero T1 scene lines when T1 current state is UNKNOWN and no exact current target exists;
- no arithmetic operands or provenance in the line;
- no revision, source ID, parser capture, or lineage metadata.

## 31. Timeline-trio cutover

For an R1 turn where the new exact temporal core is emitted, the existing semantic trio must not stack:

```text
current_timeline_anchor=...
current_timeline_authority=...
current_character_age_and_status_follow_current_timeline=...
```

R1 replaces those current-timeline semantics with the one exact temporal core line for the same fact.

This is the primary prompt compaction in v0.71.0.

## 32. Slow compatibility lines remain temporarily unchanged in R1

To minimize the first release's stable/slow ABI surface, R1 deliberately keeps existing slow compatibility serialization byte-compatible:

```text
korean_age_offset=...
current_korean_age=...   // existing conditional behavior only
world_year=...
```

R1 does **not** add birthday-aware age projection.

This means an exact temporal line may semantically contain the same year as `world_year`; that is accepted as a temporary compatibility duplicate, not a second temporal authority.

Disposition:

```text
R1_SLOW_COMPAT_COMPACTION = DEFER
```

After R1 live acceptance, a separate prompt-compaction transaction may prove conditional removal/replacement of those slow fields.

Direct timeline-trio stacking is still forbidden.

## 33. Post-B_END prompt boundary in R1

A post-B_END floor-only constraint is relational, not exact equality.

Because R1 does not activate `RELATIVE_ORDER_ONLY`, it must not fake an exact T1 current head from a lower bound.

Therefore:

- existing post-B_END floor/handoff compatibility behavior remains protected;
- R1 does not replace a floor-only lane with a false exact temporal line;
- if an independent exact current target is proven and safely subsumes the floor, the exact T1 line may represent that exact target;
- broader post-B_END floor compaction belongs with weaker-precision activation.

## 34. Mode B boundary

R1 narrative Temporal source activation is suppressed in `B_*` exactly as the existing non-B posture requires.

Normal Mode B:

```text
new narrative T1 prompt lines = 0
```

Broadcast airtime remains Time-owned and unchanged.

No Broadcast timestamp becomes `temporal.head` automatically.

## 35. Prompt Cache ABI treatment

T1 does not claim provider cache benefits.

Required ABI work:

- bump Prompt compiler 4 -> 5;
- update A2 exact-byte fixtures for affected temporal volatile cases;
- keep unaffected stable core bytes unchanged;
- preserve ordinary UNKNOWN/no-T1 scenarios where possible;
- update A3 descriptor taxonomy for the new exact temporal line;
- retire/supersede current-timeline descriptors only in cases where the new line replaces them;
- do not create duplicate descriptor truth for the same semantic fact.

## 36. A2 minimum fixture cases

At minimum:

```text
unknown ordinary A -> zero T1 line
exact committed A -> one exact T1 line
exact pending +2h -> resolved target only
exact model-authored timestamp
unique exact repair path
Mode B -> zero narrative T1 line
post-B_END floor-only legacy compatibility preserved
post-B_END exact target case
```

Existing slow compatibility lines remain expected in R1 fixtures.

## 37. A3 descriptor decision

Add a new semantic descriptor family for the exact temporal core, conceptually:

```text
SIMCORE_T5_TEMPORAL_SCENE_EXACT
owner = SIMCORE_TIME + PROMPT_SERIALIZATION
stability = current/request volatile
```

Exact identifier is implementation detail, but ownership must distinguish Time semantic authority from Prompt serialization.

Old `current_timeline_anchor` descriptors must not remain active on the same fixture when the new core replaces them.

## 38. Prompt budget telemetry

Reuse existing runtime prompt budget instrumentation.

Add bounded diagnostics such as:

```text
t1TemporalLines = 0|1
t1TemporalChars = bounded integer
t1TemporalReason = internal category
```

No telemetry field is injected into the model prompt.

No new persistence or I/O is allowed for this telemetry.

## 39. Permanent owner tests

Keep the existing permanent `narrative-clock` suite as owner regression authority for current Time/Lifecycle behavior.

Add a separate focused T1 exact-core suite rather than turning the narrative-clock suite into giant prompt snapshots.

Recommended new suite:

```text
products/simcore/tests/suites/temporal-exact-core.test.mjs
```

Exact filename may change during implementation if repository test conventions require it.

## 40. R1 semantic regression matrix

Required permanent cases:

1. valid legacy `narrativeTimestamp` migrates to exact temporal head;
2. missing legacy timestamp migrates to UNKNOWN;
3. exact temporal head mirrors `narrativeTimestamp`;
4. pre-T1 outer versions ignore surviving stale temporal rollback residue;
5. rollback residue re-migrates from the latest legacy narrative timestamp;
6. exact `21:00 + 2h -> 23:00`;
7. midnight rollover;
8. year rollover;
9. leap-year day shift;
10. valid `Jan 15 + 1 month`;
11. invalid `Jan 31 + 1 month` does not clamp;
12. no-evidence turn preserves head/revision;
13. turn count never advances time;
14. question/quote/hypothetical time is non-authoritative;
15. arbitrary assistant prose time is non-authoritative;
16. compatible model canonical timestamp can establish/narrow exact state;
17. unique exact conflict is canonical-surface repairable only;
18. arbitrary prose is never rewritten by temporal repair;
19. discarded candidate makes no temporal mutation;
20. stale baseRevision cannot commit;
21. reroll uses predecessor once, no double advance;
22. representation-only timestamp edit preserves revision;
23. semantic timestamp edit rebuilds exactly once;
24. reload round-trip preserves exact/unknown state;
25. Mode B narrative T1 mutation remains suppressed;
26. Broadcast airtime behavior remains unchanged;
27. post-B_END existing floor behavior remains green;
28. all existing permanent narrative-clock tests remain green.

## 41. R1 prompt/architecture regression matrix

Required cases:

29. UNKNOWN/no-source ordinary A emits zero T1 scene lines;
30. exact A emits exactly one T1 scene line;
31. pending +2h emits resolved target, not base + delta;
32. new exact line does not stack with legacy current-timeline trio;
33. legacy slow age/world-year compatibility lines remain R1-compatible;
34. Mode B emits zero narrative T1 lines;
35. no internal provenance/revision/lineage leaks;
36. A2 exact-byte fixtures pass;
37. A3 descriptors pass;
38. Prompt compiler version is 5;
39. State/Core versions are 6/11;
40. architecture manifest records only the intentional `state-reconcile -> time` addition;
41. architecture drift guard passes;
42. `latest.js` and `install.js` remain byte-identical in any runtime candidate.

## 42. Performance ceilings

R1 is rejected if it introduces any of:

```text
new storage read                 > 0
new storage write                > existing snapshot publication
new network request              > 0
new timer/poll/retry             > 0
new request/output await or yield> 0
whole-history temporal scan      > 0
auxiliary semantic/NLP model call> 0
unbounded temporal state         > 0
```

Current-user source inspection remains bounded to the existing leading 420 UTF-16 units unless a later explicit performance contract changes that bound.

## 43. Candidate scan ceiling

Candidate temporal assessment may inspect only the known canonical timestamp/frame surface needed by current Time/Structure behavior.

Do not add a second whole-output arbitrary temporal prose scan.

Where existing timestamp parsing already produces the required canonical surface fact, reuse it or factor one bounded pure parse result rather than parsing the entire candidate semantically twice.

## 44. Memory ceiling

Persistent T1 R1 state is constant size:

```text
one head
one bounded source stamp
one revision
null context
```

No event ledger, history array, arithmetic trace, or prompt text is persisted.

## 45. Static/CI gate before release publication

A future implementation candidate must prove:

- syntax/static checks;
- architecture dependency guard;
- state migration regressions;
- T1 exact-core suite;
- existing narrative-clock suite;
- edit/reroll/reload regressions;
- A2 exact-byte prompt fixtures;
- A3 descriptor checks;
- prompt budget invariants;
- no new I/O/await/timer/history-scan contract;
- metadata/runtime/host release identity equality;
- `latest.js == install.js`.

Failure of any mandatory gate blocks deployment.

## 46. Runtime workflow after explicit authorization

Only after #1657 is closed/reclassified and the user explicitly authorizes implementation:

```text
1. fresh-read release-simcore and main authority
2. create implementation branch from current release-simcore
3. implement T1-R1 exact core only
4. static + permanent CI validation
5. publish candidate to release-simcore through normal release authority
6. run real long-chat verification
7. obtain user HUMAN_EVIDENCE terminal decision where required
8. synchronize main current-state/docs in a separate docs/admin lane
```

Feature work must not be mixed with repository-system restructuring.

## 47. Real long-chat matrix

R1 live validation must include at least:

```text
A exact ordinary continuation
A leading +2h exact transition
midnight/day rollover
multiple no-time dialogue turns with no auto-advance
candidate reroll with no double advance
same-chat reload preserving exact state
representation-only timestamp edit
semantic timestamp edit under supported scope
B_START -> B_CONTINUE -> B_END unchanged
first C after B_END floor compatibility unchanged
UNKNOWN/no-source prompt remains zero T1 line
exact prompt remains one T1 line
no new Host-local I/O or latency branch
```

Real-world wall time is never part of narrative temporal correctness.

## 48. Live anomaly policy

Any real-world anomaly found during the release matrix must immediately be recorded and classified:

```text
WATCH
DEFER
FIX
BLOCKER
```

Then the normal workflow continues according to that classification.

No anomaly may be silently omitted from repo evidence.

## 49. Rollback target

Rollback target is:

```text
the immediately preceding accepted release-simcore authority
```

Do not hardcode v0.70.10 because #1657 may produce an intervening accepted release before T1 implementation.

## 50. R1 rollback safety property

R1 live state is exact-only, so every committed T1 current head has a complete legacy mirror in `narrativeTimestamp`.

Therefore an older accepted runtime can continue from the mirrored exact narrative time even if it ignores `temporal`.

The rollback-residue guard in sections 16-17 is mandatory so a subsequent T1 re-upgrade does not resurrect a stale ignored `temporal` object.

## 51. Rollback triggers

Rollback/hold is required for any of:

```text
double temporal advance
stale candidate temporal commit
exact head / narrativeTimestamp mirror divergence
false exact migration
pre-T1 rollback residue winning over newer legacy timestamp
Broadcast airtime regression
post-B_END regression
arbitrary prose becoming temporal authority
invalid month/year target silently clamped
new storage read/write/await/timer/network path
whole-history scan
T1 prompt line count > 1 in R1
legacy current-timeline trio stacking with new exact core
latest/install mismatch
mandatory permanent regression failure
```

## 52. HUMAN_EVIDENCE boundary

No CI or automated diagnostic may infer the user's terminal HUMAN_EVIDENCE decision.

T1 live evidence may be collected and summarized, but a user-owned terminal choice remains user-owned.

## 53. Deferred R2 entry requirements

Weaker precision activation requires explicit proof for:

- DATE_ONLY canonical frame interaction;
- bounded range output narrowing;
- relative-only output narrowing;
- irreparable out-of-range canonical timestamp handling;
- no invented exact repair;
- rollback representation when legacy `narrativeTimestamp` cannot mirror the current weak state.

R2 must not simply flip on dormant T1-A variants after R1.

## 54. Deferred retrospective entry requirements

Retrospective activation requires explicit proof for:

- one bounded context only;
- present head non-regression;
- multi-turn retrospective continuation;
- explicit present return;
- assistant canonical timestamp routing to context;
- reroll/edit predecessor rebuild;
- reload continuity;
- Mode B separation.

## 55. Deferred age entry requirements

Birthday/full-years projection remains deferred until a source adapter and relevance contract prove:

- authoritative structured birthDate source;
- no card/lore/free-prose scraping;
- exact semantic question being answered;
- no conflation with existing `koreanAgeOffset`;
- no automatic generic legal/cultural age claim;
- bounded subject count;
- one optional age line maximum.

The mathematical `fullYearsElapsedSinceBirth` helper may exist before model-facing activation, but it is not automatically `currentAge`.

## 56. Non-goals

T1-E does not authorize:

- wall-clock time;
- timezone/DST;
- full Korean temporal NLP;
- whole-message semantic extraction;
- event scheduling;
- generic Derived-State engine rollout;
- arbitrary age prose repair;
- generic prompt compression;
- new provider cache controls;
- new state/event ledger;
- M2-7 refactor;
- #1657 repair inside the T1 patch.

## 57. Acceptance decisions

```text
first runtime slice                     = EXACT TEMPORAL CORE
planning release family                 = v0.71.0
live R1 head precision                  = UNKNOWN | EXACT_MINUTE
live R1 retrospective context           = OFF
DATE_ONLY/RANGE/RELATIVE live activation= DEFER
birthday/age prompt activation          = DEFER
STATE_VERSION candidate                 = 6
CORE_STATE_VERSION candidate            = 11
temporal.schemaVersion                  = 1
PROMPT_COMPILER_VERSION candidate       = 5
new Temporal module                     = REJECTED
extend Time                              = REQUIRED
state-reconcile -> time dependency       = REQUIRED / ARCHITECTURE-MANIFESTED
candidate assessment computation         = ONCE IN SESSION ORCHESTRATION
Structure semantic arithmetic            = REJECTED
Finalize independent source parsing      = REJECTED
legacy narrativeTimestamp exact mirror   = REQUIRED
rollback residue guard                   = REQUIRED
legacy current-timeline trio stacking    = REJECTED
R1 slow compatibility compaction         = DEFER
new promptCacheAbiRevision prompt field  = REJECTED
new storage read                         = 0
new network/timer/poll/retry             = 0
new hot-path await/yield                 = 0
history scan                             = 0
R1 T1 temporal prompt lines              = 0 or 1
latest.js == install.js                  = REQUIRED
#1657 product hold respected             = REQUIRED
implementation authority                 = NONE
runtime change                           = NONE
release change                           = NONE
```

## 58. Implementation authorization gate

T1-R1 implementation may start only when all are true:

```text
#1657 resolved/reclassified for product advancement
T1-E document merged and main healthy
fresh release-simcore authority read
user explicitly authorizes runtime implementation
```

Until then:

```text
T1 = DESIGN COMPLETE THROUGH T1-E
production = unchanged
```

## 59. Classification

```text
program: SIMCORE_TEMPORAL_AWARENESS_T1
transaction: T1-E_INTEGRATION_IMPLEMENTATION_SLICE_REGRESSION_PERFORMANCE_PLAN
first live slice: T1-R1_EXACT_TEMPORAL_CORE
semantic owner: TIME
portable-state composition owner: STATE_RECONCILE
projection owner: PROMPT
commit owner: OUTPUT_FINALIZE
judge owner: STRUCTURE
architecture checkpoint: M2-6 UNCHANGED
implementation authority: NONE
runtime change: NONE
release change: NONE
production impact: NONE
```