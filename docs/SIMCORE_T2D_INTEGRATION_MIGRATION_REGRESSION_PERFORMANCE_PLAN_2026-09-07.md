# SimCore T2-D Integration / Migration / Regression / Performance Plan

Date: 2026-09-07
Status: `T2-D DESIGN · NO RUNTIME IMPLEMENTATION AUTHORITY · NO RELEASE CHANGE`
Tracking: #1823
Parent T2 umbrella: #1799 / PR #1800
Parent Temporal program: #1763
T2-A transition contract: #1804 / PR #1806
T2-B visible frame / candidate disposition: #1809 / PR #1813
T2-C minimal projection / mode integration: #1817 / PR #1819
T1-E integration foundation: #1794 / PR #1795
T2 rejection transport blocker: #1822
Product advancement hold: #1657

## 1. Purpose

T2-A through T2-C freeze the semantics of weaker TemporalPosition states, their visible frame grammar, candidate disposition, prompt projection and mode boundaries.

T2-D freezes the integration contract required before any runtime activation of:

```text
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN preservation
```

This document answers:

```text
Which production owners must change?
What may be reused versus extended versus added?
How does T2 migrate from a live T1 Exact Temporal Core?
How does downgrade / re-upgrade fail safely?
What blocks runtime activation today?
What permanent regressions and performance ceilings are mandatory?
What real long-chat evidence is required?
What triggers rollback?
```

This is a design-only transaction.

No runtime, prompt compiler, persistent state, release branch, plugin version, deployment system or production authority is changed by this document.

## 2. Fresh authority at T2-D design start

The repository moved during the read-only impact pass because of unrelated agent-skill work.

The branch used for this T2-D document starts from:

```text
main                    = ac4891aa586a5d5bbc965ff0dbc398fa9a95d246
main SimCore Verify     = PASS · run 34084430230
main SimCore Required   = PASS · run 34084430230
production version      = 0.70.10
release-simcore         = ecc55f026315c6482c34d267aba2adb97527cdbc
```

The immediately preceding #485 operator projection still showed the prior main tip while the new main workflows converged, but the direct SimCore Required gate for `ac4891a...` passed before this branch was created.

Production SimCore remained unchanged.

## 3. Product advancement hold remains active

Issue #1657 is still open and still states:

```text
NEXT_PRODUCT_ADVANCEMENT = HOLD UNTIL REPAIRED OR EVIDENCE-RECLASSIFIED
```

Therefore:

```text
T2-D design work       = ALLOWED
T1/T2 runtime release  = BLOCKED BY #1657
```

T2 must not absorb the operator release-card repair.

The release-card repair remains a separate product transaction.

## 4. T2 depends on a live-proven T1 Exact Temporal Core

The T2 umbrella already froze:

```text
T2 runtime implementation must not precede a live-proven T1 Exact Temporal Core.
```

T2-D preserves this as a hard entry gate.

T2 is not a parallel clock implementation.

It activates dormant weaker precision on the T1 architecture foundation.

Therefore implementation must begin from the then-current accepted production source after T1 is live-proven, not from the current v0.70.10 source and not from a hypothetical T1 patch.

## 5. Fresh production finding: current Structure warnings do not provide T2 rejection transport

A fresh read of exact deployed v0.70.10 source found the current output sequence conceptually performs:

```text
prepared = Output Compat.prepareOutput(...)
issues = envelope issues + Structure.validateStructure(...)
result = Output Finalize.finalizePreparedOutput(...)
...
outputStatus = COMMITTED
...
if issues.length:
    log structure warnings
```

The current runtime therefore proves:

```text
Structure issue collection
!=
pre-publication candidate rejection transport
```

Current Structure issues are compatible with an already-finalized transaction and are surfaced as warnings/diagnostics.

This behavior is valid for current production contracts.

It does not satisfy T2-B irreparable-candidate semantics.

## 6. #1822 classification

The finding above is preserved separately as #1822.

Classification:

```text
CURRENT v0.70.10 PRODUCTION DEFECT = NO
T2 DESIGN MAY CONTINUE            = YES
T2 RUNTIME ACTIVATION             = BLOCKED
CLASS                              = BLOCKER / FEATURE-ENTRY DEPENDENCY
```

T2-B requires:

```text
REJECT_MALFORMED_HEADER
or
REJECT_IRREPARABLE_CONFLICT

-> NO_COMMIT
-> invalid candidate must not become accepted visible authority
-> no partial Temporal mutation
-> no unbounded hidden retry
```

Current production does not prove that transport.

## 7. Why #1822 blocks even bounded T2-R1

The T2 umbrella recommends:

```text
T2-R1 = DATE_ONLY + BOUNDED_RANGE
T2-R2 = RELATIVE_ORDER_ONLY
```

Finite ranges are easier than open-ended relations, but they can still receive irreparable model output.

Example:

```text
constraint = RANGE 2031-03-10..2031-03-12
candidate  = 2031-03-14 09:00 exact
```

T2-B correctly forbids:

```text
choose midpoint
choose lower endpoint
choose upper endpoint
replace exact header with weak header while ignoring body dependency
commit internal range while exposing incompatible exact
```

Therefore T2-R1 is also blocked until #1822 is resolved or the runtime slice is explicitly redesigned without weakening T2-B truth invariants.

## 8. Rejection transport proof options

A future implementation impact pass may resolve #1822 through exactly one proven path.

### Option A: true pre-publication abort

The host/plugin output seam proves it can:

```text
receive candidate
run T2 assessment
abort accepted publication
avoid Output Finalize commit
return bounded rejection status
```

### Option B: one bounded regeneration

Allowed only when all are proven:

```text
first rejected candidate is not accepted/published
first rejected candidate mutates no canonical state
retry is bound to same request and predecessor revision
retry hint is bounded structural semantics only
maximum automatic retry count = 1
second invalid candidate does not retry again
```

### Option C: approved slice redesign

A different runtime slice may proceed only if it proves that every activated candidate path has either:

```text
ACCEPT
or
one unique semantics-preserving repair
```

without hiding semantic conflicts.

The burden of proof is on the redesign.

## 9. Rejection transport non-options

Forbidden:

- warning-only commit;
- invalid candidate commit followed by next-turn correction;
- raw output retention solely for retry;
- arbitrary header replacement when body semantics may differ;
- range endpoint/midpoint invention;
- retry loops beyond one bounded attempt;
- network or auxiliary-model repair service;
- body-wide semantic time rewrite.

## 10. Ownership map remains T1-E architecture

T2 introduces no new global Temporal module.

```text
Time            = temporal semantics / precision / arithmetic / compatibility
State Reconcile = portable-state composition / normalization integration
Lifecycle       = bounded current-turn proposal preparation
Prompt          = relevance gating / deterministic serialization
Structure       = frame/integrity/state-commit judge only
Session         = thin orchestration / one assessment transport
Output Finalize = accepted-output exact-once state/content commit
Edit Reconcile  = predecessor rebuild/application coordination
Store           = persistence mechanics only
Lineage         = request identity only, never story time
Exposure        = audience-knowledge policy lane, not Time ownership
```

## 11. REUSE / EXTEND / NEW classification

T2-D freezes the expected implementation shape after then-current T1 source is re-read.

### REUSE

```text
T1 TemporalPosition union
T1 temporal state object
T1 revision/baseRevision semantics
T1 source stamps
T1 arithmetic helpers
T1 candidate-assessment orchestration pattern
T1 state-reconcile -> Time normalization edge
T1 exact-once Output Finalize seam
T1 reroll/edit predecessor rebuild behavior
T1 prompt current/volatile Temporal region
existing Broadcast airtime ownership
existing post-B_END floor source
existing Exposure Knowledge policy
existing A2/A3 cache-fixture infrastructure
existing prompt budget telemetry
existing narrative-clock permanent suite
```

### EXTEND

```text
Time normalization to live-accept weak variants
Time current-source proposal generation
Time range/relation arithmetic and compatibility
Time precision-aware frame-header parser/serializer
Time candidate assessment enum/receipt
Lifecycle pending temporal proposal values
Prompt temporal_scene serializer
Prompt stable frame grammar
Structure common frame-slot temporal grammar
Session one-assessment transport
Output Finalize weak-head commit / mirror-null behavior
Edit Reconcile weak semantic rebuild coverage
bootstrap/reload normalization fixtures
diagnostics for bounded T2 disposition and line counts
```

### NEW, only where proven necessary

```text
bounded TEMPORAL_CANDIDATE_REJECTION receipt
one proven fail-closed publication transport seam for #1822
T2-focused permanent fixture suite(s)
```

No other new subsystem is justified by T2-D.

## 12. Time implementation surface

After live T1 exists, T2 is expected to extend Time with pure or bounded helpers equivalent to:

```text
normalizeTemporalPosition
serializeTemporalHeader
parseTemporalHeader
compareTemporalPositions
assessTemporalCandidate
applyTemporalDelta / range shift reuse
compactRelativeOrder
resolveEffectiveTemporalConstraint
```

Exact function names depend on then-current T1 implementation.

T2-D freezes responsibilities, not speculative symbol names.

## 13. Time must remain the only semantic calculator

Structure must not calculate:

```text
range containment
relative ordering
precision weakening
compatible narrowing
calendar shifts
```

Prompt must not calculate them either.

Output Finalize must not re-parse arbitrary prose or independently derive a different candidate result.

One Time assessment remains the authority consumed by downstream owners.

## 14. State Reconcile integration

T1-E already selected an intentional architecture edge:

```text
state-reconcile -> time
```

T2 reuses that edge.

State Reconcile must not gain weak-position semantics.

Conceptual behavior:

```text
raw temporal
-> Time normalization
-> State Reconcile composition
```

No T2-owned reverse dependency is authorized.

## 15. Lifecycle proposal integration

T2 extends the bounded pending proposal already designed by T1-E.

Conceptually:

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

T2 permits `nextHead` to use:

```text
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
EXACT_MINUTE
```

according to T2-A.

Proposal state remains constant-size.

No request proposal commits canonical state before accepted output finalization.

## 16. One assessment per candidate remains mandatory

T1-E selected the orchestration pattern:

```text
prepared candidate
-> Time assessment once
-> same immutable assessment to Structure and Output Finalize
```

T2 retains this.

If #1822 is resolved with a rejection transport, that same immutable assessment must also be the input to the rejection decision.

Do not calculate Temporal compatibility twice in two owners.

## 17. T2 assessment family

The T2-B semantic family remains authoritative:

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

Commit effects remain separate:

```text
NO_TEMPORAL_MUTATION
COMMIT_CANDIDATE
COMMIT_REPAIRED
NO_COMMIT
```

No implementation may collapse `REJECT_*` into a warning-only `COMMIT_CANDIDATE` path.

## 18. Structure integration

Structure extends its common frame-slot grammar from exact-only to the T2-B union.

It must still own:

```text
response header count/order
volume header count/order
chapter header count/order
Chatindex count/order
one common temporal header immediately after Chatindex
marker present vs malformed distinction
```

It must not miscount later Mode B timestamp lines as duplicate common frame headers.

The common temporal slot is scoped to the first non-whitespace frame item immediately following Chatindex.

## 19. Prompt integration

T2-C freezes:

```text
T2 dynamic scene temporal lines = 0 or 1
```

The dynamic family is:

```text
temporal_scene=
```

Prompt owns serialization only.

Time supplies the semantic view.

## 20. Stable versus volatile prompt placement

T2-C separates:

```text
stable frame grammar
from
dynamic current Temporal fact
```

Implementation must keep that separation.

Preferred cache placement:

```text
stable temporal-header grammar -> stable Prompt tier
current temporal_scene         -> volatile/current request tier
```

No new cache tier is authorized.

## 21. Legacy timeline prompt replacement

When the T2 core supplies the same semantic current-time fact, legacy lines must not stack as duplicate authority.

Candidate legacy families include:

```text
current_timeline_anchor
current_timeline_authority
current_character_age_and_status_follow_current_timeline
post-B_END floor duplicate when subsumed by a stronger T2 target
```

Implementation must fresh-map the then-current T1 Prompt before removal or conditional suppression.

T2-D freezes semantic non-duplication, not stale byte assumptions.

## 22. Mode A integration

Mode A is the primary weak narrative consumer.

Rules:

```text
known exact or weak effective head/target -> 1 dynamic core line
fully uninitialized/default UNKNOWN      -> 0 dynamic lines
UNKNOWN with stale-exact hazard          -> 1 negative guard line when required
no temporal evidence                     -> preserve state exactly
```

Visible frame still contains exactly one T2-compatible temporal header.

## 23. Mode B integration

Mode B common visible frame time remains Broadcast airtime authority.

Default:

```text
T2 narrative temporal_scene lines = 0
```

T2 must not make weak narrative state compete with Broadcast airtime for the common frame slot.

Simultaneous Broadcast time plus depicted narrative-event time is not activated by T2.

That remains later multi-position/T3 territory.

## 24. Mode C and post-B_END integration

Mode C otherwise follows Mode A current-scene projection.

Floor-only case:

```text
B_END terminal = 23:00
current safe relation = AT_OR_AFTER 23:00
```

Prompt may project:

```text
temporal_scene=current;relation=AT_OR_AFTER;anchor=...;exact=unknown
```

It must not claim equality.

If current Time already proves a stronger target satisfying the floor, project only the stronger target.

## 25. Exposure Knowledge boundary

T2 core Temporal truth is model/world authority.

It is not audience-exposure authority.

```text
TEMPORAL TRUE
!=
COMMUNITY MAY KNOW AS PUBLIC FACT
```

T2 adds no public-time ledger and no `community_visible` bit.

COMMUNITY use of a date/range/relation still requires an independent Exposure basis under the existing Exposure Knowledge program.

The direct-B restraint remains narrow.

Multi-B exposure remains outside T2.

## 26. Persistent state shape policy

T2-D cannot freeze numeric state version deltas against hypothetical T1 source because T1 has not yet been implemented in production.

Instead T2-D freezes the mandatory decision rule for the later implementation impact pass.

If then-current T1 production persists the full T1-A discriminated union shape under:

```text
temporal.schemaVersion = 1
```

and T2 only activates already-defined variants without changing stored field meaning, then:

```text
portable STATE_VERSION bump solely for T2 activation = NOT REQUIRED
new temporal.schemaVersion solely for activation     = NOT REQUIRED
```

## 27. CORE_STATE_VERSION decision rule

`CORE_STATE_VERSION` may represent a semantic compatibility contract in the then-current T1 runtime.

If activating weak variants changes what a runtime carrying the same stored shape is permitted to treat as canonical current truth, the implementation impact pass must bump that semantic identity.

Conceptually:

```text
same storage shape
+ expanded live semantic acceptance
-> CORE_STATE_VERSION bump may be REQUIRED
```

Exact numeric value must be derived from the accepted T1 production source at implementation start.

T2-D deliberately does not invent a future number now.

## 28. Release number is deliberately unfrozen

T1-E used `v0.71.0` as a planning candidate for the first exact-core release.

T2-D does not assume that number will become production reality.

Therefore:

```text
T2-R1 release number = UNFROZEN
T2-R2 release number = UNFROZEN
```

Both must derive from then-current accepted release authority.

## 29. `narrativeTimestamp` mirror rules are unchanged

T2 preserves:

```text
EXACT_MINUTE
-> narrativeTimestamp = canonical exact mirror
```

and:

```text
DATE_ONLY
BOUNDED_RANGE
RELATIVE_ORDER_ONLY
UNKNOWN
-> narrativeTimestamp = null
```

No older exact timestamp may remain as a compatibility ghost after a weak head commits.

## 30. Why T2 rollback differs from T1 rollback

T1 exact-only rollback has a complete legacy exact mirror.

T2 weak state does not.

Example:

```text
canonical = DATE_ONLY 2031-03-08
legacy narrativeTimestamp = null
```

An exact-only prior runtime cannot faithfully represent this state.

Therefore T2 rollback safety cannot mean full semantic preservation.

## 31. T2 downgrade safety definition

T2 freezes:

```text
SAFE DOWNGRADE = FAIL WEAK, NEVER FALSE EXACT
```

If the immediately preceding accepted runtime cannot represent the current weak head, acceptable downgrade behavior may lose Temporal precision/state to UNKNOWN.

It must never:

- revive an older exact timestamp as current;
- invent midnight/noon;
- select a range endpoint;
- infer a duration from a relative relation;
- treat a stale T2 object as newer truth after a downgraded runtime has advanced legacy authority.

## 32. Downgrade loss must be explicit evidence

Before a T2 release can be published, release evidence must state whether downgrade from each committed precision preserves or degrades:

```text
EXACT_MINUTE           -> exact mirror preservation expected
DATE_ONLY              -> weak state may degrade to UNKNOWN
BOUNDED_RANGE          -> weak state may degrade to UNKNOWN
RELATIVE_ORDER_ONLY    -> weak state may degrade to UNKNOWN
UNKNOWN                -> UNKNOWN
```

A lossy downgrade is not hidden as “fully reversible.”

## 33. Re-upgrade stale-residue guard

T2 inherits T1-E rollback-residue protection and extends it to weak state.

If an older runtime runs after downgrade, then later T2 is reinstalled:

```text
surviving weak T2 object
!= automatically current authority
```

Re-upgrade must use version lineage plus then-current legacy/current state to determine whether the weak object is stale residue.

If authority cannot be proven:

```text
fail to UNKNOWN
```

not:

```text
revive stale weak head
```

No history rescan is allowed to reconstruct the lost weak state.

## 34. Fresh implementation impact scope is mandatory

Because T1 production does not exist yet, T2 implementation may not start by blindly following hypothetical numeric versions in this document.

At runtime authorization time, perform a fresh read of:

```text
release-simcore tip
T1 Temporal state implementation
State Reconcile version logic
CORE_STATE_VERSION semantics
PROMPT_COMPILER_VERSION
Output hook / publication contract
A2/A3 fixtures
architecture manifest
latest/install identity
```

Then map T2-D decisions onto real symbols.

## 35. Prompt compiler / cache ABI policy

T2-C changes canonical prompt line families and stable frame instructions relative to an exact-only T1 renderer.

Therefore implementation should expect:

```text
PROMPT exact-byte ABI impact = YES
```

At implementation start:

```text
fresh PROMPT_COMPILER_VERSION
-> increment if canonical bytes/order/grammar change
```

A silent prompt ABI change with unchanged compiler identity is forbidden.

## 36. A2 exact-byte fixtures

T2 must add or update exact-byte cases for at least:

```text
A exact unchanged
A DATE_ONLY
A date range
A minute range
A relative with absolute exact anchor
A relative with date anchor
A relative PREVIOUS_SCENE
A ordinary UNKNOWN -> zero dynamic line + UNKNOWN visible frame policy
A stale-anchor UNKNOWN guard
B_START/B_CONTINUE/B_END narrative suppression
C ordinary weak head
C post-B_END floor-only relation
C stronger target subsumes floor
legacy trio not duplicated
stable frame grammar ordering
```

## 37. A3 descriptor taxonomy

A3 must classify the new Temporal scene family by semantics and stability.

At minimum descriptors must distinguish:

```text
TEMPORAL_SCENE_EXACT
TEMPORAL_SCENE_DATE
TEMPORAL_SCENE_RANGE
TEMPORAL_SCENE_RELATIVE
TEMPORAL_SCENE_UNKNOWN_GUARD
TEMPORAL_FRAME_GRAMMAR_STABLE
```

Exact identifiers are implementation detail.

One semantic fact must not simultaneously retain an active superseded legacy descriptor.

## 38. Permanent test ownership

Keep the existing permanent `narrative-clock` suite green.

Keep the future T1 exact-core suite green.

Add focused T2 suites rather than turning one test file into a giant cross-product.

Recommended conceptual split:

```text
temporal-weak-state.test.mjs
temporal-frame-disposition.test.mjs
temporal-mode-projection.test.mjs
temporal-migration-rollback.test.mjs
```

Exact filenames may follow repository conventions at implementation time.

## 39. T2-A transition regression matrix

Permanent coverage must prove at least:

1. exact -> DATE_ONLY without midnight invention;
2. exact -> bounded date range;
3. exact -> bounded minute range;
4. exact -> relative AFTER with safe exact anchor;
5. date -> relative AFTER retaining safe date anchor;
6. range -> relative uses null anchor + predecessor basis when required;
7. UNKNOWN + proven vague advance uses bounded predecessor relation only when authorized;
8. no-evidence preserves exact head/revision;
9. no-evidence preserves DATE_ONLY;
10. no-evidence preserves range;
11. no-evidence preserves relation-only state;
12. DATE_ONLY + day arithmetic remains date-only;
13. DATE_ONLY + sub-day arithmetic widens safely;
14. deterministic range shift preserves bounds;
15. repeated relative advancement remains constant-size;
16. repeated relative advancement increments semantic revision exactly once;
17. SAME_AS follows T2-A source semantics;
18. invalid/unrepresentable transition makes no canonical mutation.

## 40. T2-B frame / candidate regression matrix

Permanent coverage must prove at least:

19. legacy exact frame syntax remains valid;
20. DATE frame syntax valid;
21. date range frame valid;
22. minute range with repeated full endpoints valid;
23. mixed endpoint granularity rejected;
24. lower > upper rejected;
25. relative exact anchor valid;
26. relative date anchor valid;
27. PREVIOUS_SCENE valid only with proper predecessor basis;
28. UNKNOWN frame valid without fabricated time;
29. malformed header never degrades to UNKNOWN;
30. wrong exact weekday is unique representation repair only;
31. exact inside range accepted as model-authored narrowing;
32. exact outside range rejected;
33. partial range overlap does not auto-commit intersection;
34. same-date weak candidate does not falsely prove advancement after exact clock;
35. null-anchor exact narrowing rejected/unresolved when proof is insufficient;
36. exactly one common frame slot remains mandatory;
37. later Mode B timestamp lines are not duplicate common headers;
38. body timestamp cannot rescue malformed common frame header.

## 41. Candidate transaction regression matrix

Permanent coverage must prove:

39. one Time assessment per candidate;
40. ACCEPT_EQUIVALENT causes no Temporal revision mutation;
41. compatible narrowing commits once;
42. compatible weak advance commits once;
43. unique representation repair commits repaired surface once;
44. stale revision yields NO_COMMIT;
45. irreparable conflict yields NO_COMMIT;
46. malformed frame yields NO_COMMIT;
47. rejected candidate cannot change narrativeTimestamp;
48. rejected candidate cannot become next reroll basis;
49. rejected candidate receipt is constant-size and contains no raw body;
50. #1822 transport proves no accepted publication of rejected candidate.

## 42. Reroll regression matrix

Must prove:

```text
predecessor exact
candidate A range discarded
candidate B date-only
-> B derives from predecessor, not A
```

Also:

- discarded exact narrowing never becomes next base;
- one reroll cannot double-increment relation basisRevision;
- retry transport, if ever enabled, remains distinct from user reroll semantics.

## 43. Edit regression matrix

Must prove:

- representation-only weak-header edit preserves semantic revision;
- semantic exact -> DATE edit rebuilds from predecessor;
- `3 days later` -> `3~5 days later` edit rebuilds from predecessor rather than widening an already-shifted result;
- edited outside-range exact header cannot become canonical merely because it exists in chat history;
- old candidate assessment cannot be reused across semantic edit.

## 44. Reload regression matrix

Must prove:

```text
DATE remains DATE
RANGE remains RANGE
RELATIVE remains RELATIVE
UNKNOWN remains UNKNOWN
EXACT restores exact narrativeTimestamp mirror
weak states keep narrativeTimestamp null
```

Reload must use normalized persisted state.

No whole-chat reconstruction is introduced.

## 45. Downgrade / re-upgrade regression matrix

Required fixtures:

- T2 exact -> exact-only prior runtime -> exact preserved;
- T2 DATE -> exact-only prior runtime -> no stale exact revival;
- T2 RANGE -> exact-only prior runtime -> no endpoint fabrication;
- T2 RELATIVE -> exact-only prior runtime -> no anchor-equals-current fabrication;
- downgraded runtime advances a legacy exact state after weak T2 residue survives;
- later T2 re-upgrade must not let stale weak residue override the newer legacy authority;
- malformed/missing version lineage must fail conservative;
- no history scan used to recover lost weak state.

## 46. Mode B regression matrix

Must prove the existing B lifecycle remains green:

```text
B_START
B_CONTINUE
B_END
```

including:

- monotonic Broadcast airtime;
- no narrative weak state hijacks common frame time;
- additional B timestamps remain valid body/mode timestamps;
- T2 prompt narrative line count is zero on default B turns;
- B terminal handoff facts remain available for subsequent C.

## 47. Mode C / post-B_END regression matrix

Must prove:

- floor-only case projects relation, not equality;
- stronger current target suppresses duplicate floor projection;
- exact strengthening after floor restores legacy exact mirror;
- weak relation after floor keeps legacy mirror null;
- stale cross-mode diagnostic timestamp never becomes canonical current authority.

## 48. Exposure regression matrix

T2 must not become an epistemic leak path.

Required cases:

- internal Temporal exact/date/range known but COMMUNITY exposure unproven -> not confirmed public fact;
- exposed “next day” relation may be used when exposure basis independently proves it;
- hidden exact anchor does not leak merely because relation uses it internally;
- direct-B exposure restraint remains narrow;
- historical event-scope expansion does not automatically expand audience exposure.

## 49. Prompt budget regressions

Mandatory:

```text
T2 dynamic temporal core lines <= 1
T2 age lines                   = 0
no revision/source/parser provenance in prompt
no base + delta + result duplication
no full event list
```

UNKNOWN without a stale-anchor hazard remains zero dynamic lines.

## 50. Performance hard ceilings

T2 activation is rejected if it introduces any of:

```text
new storage read solely for T2        > 0
new ordinary storage write            > existing snapshot publication
new network request                   > 0
new timer / polling loop              > 0
unbounded automatic retry             > 0
whole-history temporal scan           > 0
auxiliary semantic / NLP model call   > 0
unbounded Temporal event ledger       > 0
unbounded relative relation chain     > 0
```

## 51. Candidate parsing ceiling

T2 may inspect:

```text
bounded current user source region
known common frame temporal slot
bounded current candidate structure
```

It must not add a general body-wide temporal semantic parser.

The candidate common frame slot is a bounded structured surface.

## 52. Assessment computation ceiling

Semantic Temporal assessment:

```text
maximum = once per candidate transaction
```

Structure and Output Finalize consume that result.

A future one-attempt retry creates a second candidate transaction and may therefore create one assessment for that second candidate, but never repeated assessment loops on the same candidate.

## 53. State size ceiling

Persistent T2 state remains constant-size:

```text
one current head
one bounded source stamp
one revision
null retrospective context
```

Relative state retains only bounded compact anchor/basis information.

No event ledger is added.

## 54. Prompt size ceiling

T2 dynamic scene projection stays 0 or 1 line.

Stable frame grammar is constant-size.

No one-line loophole may serialize an unbounded character/event list.

## 55. Retry performance boundary

The normal accepted T2 path must add:

```text
automatic regeneration count = 0
```

Only a separately proven #1822 transport may permit:

```text
rejected first candidate -> at most 1 automatic retry
```

That retry must be exceptional, bounded and observable.

It must never become normal background generation behavior.

## 56. Static/CI gate before any T2 publication

A future runtime candidate must prove:

- syntax/static checks;
- architecture drift guard;
- all T1 exact-core regressions;
- all existing narrative-clock regressions;
- T2 transition suite;
- T2 frame/disposition suite;
- T2 migration/rollback suite;
- edit/reroll/reload suites;
- A2 exact-byte prompt fixtures;
- A3 descriptor checks;
- prompt line-budget checks;
- #1822 rejection-transport fixtures;
- no unbounded retry;
- no new I/O/history-scan contract;
- metadata/runtime/host release identity equality;
- `latest.js == install.js`.

Any mandatory gate failure blocks deployment.

## 57. Runtime slicing remains proof-boundary based

After all entry gates are satisfied:

```text
T2-R1 = BOUNDED IMPRECISION
        DATE_ONLY
        BOUNDED_RANGE

T2-R2 = OPEN-ENDED RELATIVE
        RELATIVE_ORDER_ONLY
```

T2-R2 cannot piggyback on T2-R1 acceptance merely because code is nearby.

Each slice gets its own release evidence and real long-chat validation.

## 58. T2-R1 entry requirements

Before T2-R1 implementation/publication:

```text
T1 exact core live-proven
#1657 resolved/reclassified
#1822 resolved or approved invariant-preserving redesign
T2-D merged and main healthy
fresh production impact map complete
finite range/date permanent fixtures green
prompt/cache ABI decision fresh
rollback degradation documented
user runtime authorization present
```

## 59. T2-R2 entry requirements

In addition to T2-R1 live acceptance:

```text
relative compaction fixtures green
PREVIOUS_SCENE proof semantics green
post-B_END relation interactions green
open-ended exact narrowing proof green
relative downgrade/re-upgrade fixtures green
no chain growth over long chat
user runtime authorization for R2 present
```

## 60. Real long-chat acceptance for T2-R1

At minimum:

```text
A exact ordinary continuation still works
exact -> next day DATE_ONLY
DATE_ONLY survives several no-time turns
DATE_ONLY + day shift
exact -> 3~5 day date range
exact -> bounded minute range
model-authored exact inside range accepted once
incompatible exact candidate follows proven fail-closed transport
reroll after range candidate does not inherit discarded state
semantic edit exact/date/range rebuilds from predecessor
same-chat reload preserves DATE/RANGE
B_START -> B_CONTINUE -> B_END unchanged
first C after B_END floor compatibility
Mode C weak head continuity
COMMUNITY does not gain hidden Temporal fact
T2 prompt dynamic line count <= 1
no new ordinary Host-local I/O branch
```

## 61. Real long-chat acceptance for T2-R2

At minimum:

```text
exact -> vague AFTER
repeated vague advance without chain growth
DATE anchor retention
range predecessor -> PREVIOUS_SCENE basis-only relation
no-evidence preserves relative state
compatible exact narrowing only when provable
unprovable exact narrowing fails closed
post-B_END AT_OR_AFTER does not become equality
reroll relative candidate no double advance
semantic edit rebuilds relation from predecessor
reload preserves compact relation
Mode B remains airtime-owned
Mode C relation continuity
COMMUNITY exposure separation remains intact
```

## 62. Live anomaly policy

Any real-world anomaly discovered during T2 implementation/live validation must immediately be recorded in repo and classified:

```text
WATCH
DEFER
FIX
BLOCKER
```

Then workflow continues according to that classification.

No anomaly is silently omitted from release evidence.

## 63. Rollback target

Rollback target is always:

```text
the immediately preceding accepted release-simcore authority
```

No version is hardcoded in T2-D.

## 64. T2 rollback triggers

Rollback or publication hold is required for any of:

```text
false exact value invented from DATE/RANGE/RELATIVE
stale prior exact narrativeTimestamp revived after weak commit
irreparable candidate published as accepted
REJECT candidate causes Temporal mutation
rejected candidate becomes reroll/edit basis
more than one hidden automatic retry
range collapses to arbitrary midpoint/endpoint
relative chain grows without bound
double temporal revision advance
stale baseRevision commit
Mode B airtime regression
post-B_END equality fabrication
COMMUNITY exposure leak through Temporal projection
prompt temporal core > 1 dynamic line
legacy timeline/floor duplicate authority stacking
new whole-history scan
new unauthorized storage/network/timer path
latest/install mismatch
mandatory permanent fixture failure
```

## 65. Rollback from weak state is intentionally conservative

A rollback may cause:

```text
weak Temporal state -> UNKNOWN
```

when the prior runtime cannot represent it.

That is preferable to false exact continuity.

The release operator packet must explicitly state this limitation before T2 publication.

## 66. No hidden recovery database

T2 does not add a second ledger merely to make rollback lossless.

Rejected designs include:

```text
weak-state shadow history
all-turn temporal journal
legacy exact fallback chosen from range
host-local semantic backup
raw message temporal recovery cache
```

The architecture prefers safe degradation over a second state authority.

## 67. HUMAN_EVIDENCE boundary

No automated fixture, CI job or diagnostic may infer the user's terminal HUMAN_EVIDENCE decision.

Real long-chat evidence may be collected and summarized.

A user-owned terminal choice remains user-owned.

## 68. Runtime workflow after all gates and explicit authorization

Only later, after gates are satisfied:

```text
1. fresh-read main + release-simcore + current blockers
2. fresh production impact scope against live T1 source
3. create implementation branch from current release-simcore
4. implement one bounded T2 slice only
5. static + permanent CI validation
6. publish through normal release authority
7. verify latest.js == install.js
8. run real long-chat matrix
9. record every anomaly WATCH/DEFER/FIX/BLOCKER
10. obtain HUMAN_EVIDENCE terminal decision where required
11. synchronize main current-state/docs in a separate docs/admin lane
```

Feature work must not be mixed with release-system or repository-system restructuring.

## 69. T2-D acceptance decisions

```text
T2 architecture owner                 = existing Time
new global Temporal module            = REJECTED
T1 live-proven prerequisite           = REQUIRED
#1657 advancement hold                = REQUIRED
#1822 rejection transport             = BLOCKER
T2-R1 activation                      = DATE_ONLY + BOUNDED_RANGE
T2-R2 activation                      = RELATIVE_ORDER_ONLY
UNKNOWN preservation                  = CROSS-CUTTING
one candidate Time assessment         = REQUIRED
Structure semantic arithmetic         = REJECTED
Finalize independent parsing          = REJECTED
weak narrativeTimestamp mirror        = NULL REQUIRED
exact narrativeTimestamp mirror       = REQUIRED
safe downgrade definition             = FAIL WEAK / NEVER FALSE EXACT
lossless weak downgrade               = NOT CLAIMED
history recovery scan                 = REJECTED
new weak-state ledger                 = REJECTED
portable STATE_VERSION numeric delta  = DEFER TO LIVE T1 IMPACT READ
CORE_STATE_VERSION numeric delta      = DEFER TO LIVE T1 IMPACT READ
new temporal.schemaVersion            = ONLY IF REAL SHAPE/MEANING CHANGES
T2 release numbers                    = UNFROZEN
prompt ABI impact                     = EXPECTED YES
new cache tier                        = REJECTED
T2 dynamic temporal lines             = 0 OR 1
new storage read solely for T2        = 0
new network                           = 0
new timer/polling                     = 0
normal automatic retry                = 0
exceptional reject retry              = <=1 ONLY AFTER #1822 PROOF
whole-history scan                    = 0
unbounded temporal state              = 0
latest.js == install.js               = REQUIRED FOR RUNTIME
implementation authority              = NONE
runtime change                         = NONE
release change                         = NONE
production impact                      = NONE
```

## 70. Implementation authorization gate

T2 runtime implementation may start only when all are true:

```text
#1657 resolved/reclassified
T1 Exact Temporal Core exists in accepted production and is live-proven
#1822 resolved with production-capable fail-closed transport proof
  OR an explicitly approved T2-B-compatible slice redesign exists
T2-D document merged and main healthy
fresh release-simcore authority read
fresh state/prompt/version impact scope complete
user explicitly authorizes the bounded runtime slice
```

Until then:

```text
T2-A = DESIGN FROZEN
T2-B = DESIGN FROZEN
T2-C = DESIGN FROZEN
T2-D = DESIGN FROZEN AFTER MERGE
T2-R1 = BLOCKED / NOT AUTHORIZED
T2-R2 = BLOCKED / NOT AUTHORIZED
production = unchanged
```
