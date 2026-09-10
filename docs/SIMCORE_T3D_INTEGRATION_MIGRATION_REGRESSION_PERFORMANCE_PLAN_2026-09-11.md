# SimCore T3-D Integration / Migration / Regression / Performance Plan

Date: 2026-09-11
Status: `T3-D DESIGN · IMPLEMENTATION_PR STAGE · NO RUNTIME IMPLEMENTATION AUTHORITY · NO PROMPT/RUNTIME/RELEASE CHANGE`
Tracking: #1996
Parent T3 umbrella: #1825
T3-A routing: #1830 / PR #1832
T3-B visible frame / candidate lane disposition: #1834 / PR #1837
T3-C projection / mode / exposure / derived-value integration: #1840 / PR #1842
Parent T2-D integration plan: #1823 / PR #1824
Temporal candidate rejection blocker: #1822
Visible output hygiene hold: #1660
Resolved operator-card repair: #1657
Separate current-doc drift: #1994

## 1. Purpose

T3-A through T3-C freeze retrospective routing semantics, visible frame lane selection, candidate disposition, compact model-facing projection, Mode A/B/C boundaries, Exposure/Knowledge separation, and deterministic temporal-basis selection for derived values.

T3-D freezes the final integration contract required before any runtime activation of the first bounded retrospective family:

```text
one present narrative head
+ zero or one active retrospective context
+ existing independent Broadcast airtime
```

This document answers:

```text
Which existing runtime owners must be reused or extended?
What persistent state/version changes are actually justified?
How does a retrospective enter/continue/exit transaction flow end to end?
How must candidate rejection compose with #1822?
How do reroll, edit, reload, downgrade and re-upgrade preserve authority?
What prompt/cache ABI changes must be explicit?
What permanent regression and performance ceilings are mandatory?
What real long-chat proof is required before live acceptance?
What still blocks runtime implementation today?
```

This is a design-only transaction.

No runtime source, prompt runtime, persistent state, plugin version, release branch, production deployment, release workflow, or repository-control-plane behavior is changed by this document.

## 2. Current authority and currentness barrier

T3-D must be interpreted against fresh authority at the implementation-PR stage, not against the historical v0.70.10 facts captured when T3-A/B/C were designed.

At T3-D scope lock on 2026-09-11 KST, fresh authority showed:

```text
production version      = 0.70.11
release-simcore         = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
release blob            = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
manifest validation     = PENDING_REAL_LONG_CHAT
```

Repository main had also moved materially since the original T3 design transactions, including native protected-main/Required enforcement and separate R2.8/control-plane work.

Therefore every later runtime implementation transaction must establish a new exact currentness barrier before using symbol names, numeric state versions, prompt compiler versions, release numbers, branch-write assumptions, or publication mechanics from this design.

Historical T3-A/B/C production identities are design provenance only. They are not current release authority.

## 3. Current blockers and resolved predecessor hold

The old product-advancement hold from #1657 is no longer an active T3 entry blocker.

Fresh issue evidence shows:

```text
#1657 = CLOSED / completed
operator release-card live UI evidence = PASS
repair acceptance = SATISFIED
```

However two distinct lower/runtime blockers remain relevant:

```text
#1822 = OPEN
         T2/T3 temporal candidate rejection has no proven fail-closed publication transport

#1660 = OPEN
         visible standalone `internal:` planning-control alias remains an advancement-holding FIX
```

T3-D must not absorb either repair.

They remain separate owners and separate future transactions.

## 4. T3 runtime cannot leapfrog T1/T2 reality

T3 is not a standalone temporal implementation.

Its contracts assume lower layers that are still design-only relative to current production:

```text
T1 Exact Temporal Core
T2 weak precision / precision-aware frame behavior where required
```

Therefore T3 runtime implementation may not start from current v0.70.11 production by directly adding a retrospective context while inventing missing T1/T2 semantics in the same patch.

Required order:

```text
T1 live implementation + proof
-> required T2 live implementation + proof
-> fresh T3 implementation impact pass on that production reality
-> T3 runtime slice
```

If the lower layers are implemented differently while preserving their accepted contracts, T3-D must be remapped to the actual live symbols and versions rather than forcing hypothetical T1/T2 code shapes.

## 5. Central integration pipeline

The end-to-end T3 semantic pipeline is frozen as:

```text
CURRENT BOUNDED SOURCE
-> T3-A ROUTING CLASSIFICATION
-> TIME EFFECTIVE LANE / TEMPORAL POSITION
-> REQUEST-SCOPED PENDING TEMPORAL PROPOSAL
-> T3-C GENERATION PROJECTION
-> MODEL CANDIDATE
-> T3-B CANDIDATE BASIS SELECTION
-> ONE TIME-OWNED TEMPORAL ASSESSMENT
-> STRUCTURE / PUBLICATION SAFETY DECISION
-> ACCEPTED OUTPUT ONLY
-> OUTPUT FINALIZE EXACT-ONCE COMMIT
-> PERSISTED HEAD + OPTIONAL CONTEXT
```

No downstream owner may independently reclassify the retrospective route or recalculate the candidate's temporal meaning.

## 6. Ownership map

T3 introduces no new global Temporal module and no timeline subsystem.

### Time

Time remains the sole temporal semantic owner.

It owns:

```text
TemporalPosition normalization
present head semantics
retrospective context semantics
effective lane selection input/output contract
calendar arithmetic
precision compatibility
candidate temporal assessment
derived-value temporal basis resolution
legacy narrativeTimestamp mirror semantics
```

Time does not own output publication transport, prompt bytes, Exposure permission, storage transport, or repository release mechanics.

### Lifecycle / request preparation

Lifecycle or the then-current bounded request-preparation owner consumes already-authorized source evidence and carries the request-scoped temporal proposal.

It does not persist canonical context before output acceptance.

### State Reconcile

State Reconcile composes/normalizes portable state through the existing Time integration edge selected by T1/T2.

It does not gain retrospective arithmetic or scene-routing semantics.

### Prompt

Prompt serializes the T3-C 0-or-1 dynamic temporal semantic line and the stable frame contract.

Prompt does not calculate event time, choose retrospective routing, derive age, infer exposure, or store temporal state.

### Structure

Structure remains the frame/integrity/state-commit-safety judge.

It validates the one common temporal frame slot and consumes the immutable Time assessment.

It does not determine which timestamp "looks like" a flashback.

### Output Finalize

Output Finalize applies accepted state/content exactly once.

It must not re-run temporal parsing or calculate a second result.

### Edit Reconcile

Edit Reconcile coordinates predecessor rebuild/application only.

It must not become a separate retrospective state owner.

### Broadcast

Broadcast retains airtime authority.

T3 narrative event time and present head never redefine Broadcast airtime.

### Exposure / Knowledge

Exposure/Knowledge remains the epistemic authority.

Temporal truth does not create character/public/COMMUNITY knowledge permission.

### Store / Lineage / Runtime Mirror

These remain mechanics/identity/transport owners only.

They receive no new narrative temporal semantics.

## 7. REUSE / EXTEND / NEW classification

### REUSE

A later T3 runtime implementation should reuse, once they exist live:

```text
T1/T2 TemporalPosition union
T1 temporal object and revision/baseRevision contract
T1 source stamps
T1/T2 Time arithmetic + normalization
T1/T2 request-scoped pending temporal proposal
T2 precision-aware visible temporal header grammar
T2 candidate assessment result family
T2/T3 one-assessment orchestration pattern
State Reconcile -> Time normalization edge
Output Finalize exact-once commit seam
Edit Reconcile predecessor rebuild path
T2-C current temporal_scene serializer family
existing Broadcast airtime authority
existing post-B_END floor authority
existing Exposure/Knowledge authority
existing prompt exact-byte/descriptor fixture infrastructure
existing permanent narrative-clock regressions
```

### EXTEND

Expected bounded extensions:

```text
Time: active context normalization and event-local update routing
Time: present-vs-retrospective candidate basis selection
Lifecycle/request prep: ENTER / CONTINUE / EXIT proposal transport
Prompt: retrospective event_* + present_* one-line serializer
Structure: lane-aware expected TemporalPosition consumption, not lane calculation
Output Finalize: context enter/update/exit exact-once application
Edit Reconcile: retrospective predecessor rebuild fixtures
bootstrap/reload normalization: active context restore coverage
diagnostics: bounded lane / context / disposition metadata only
```

### NEW, only if proven necessary

```text
focused T3 regression suites
bounded context-specific assessment/projection descriptor identifiers
```

No new event database, context stack, timeline graph, scheduler, background task, network service, auxiliary model, or semantic prose engine is justified.

## 8. Persistent state policy

T3-A deliberately reused the T1-A state shape:

```js
temporal: {
  schemaVersion,
  revision,
  head,
  headSource,
  context: {
    kind: 'RETROSPECTIVE',
    position,
    source,
    enteredFromRevision
  } | null
}
```

If the then-current live T1/T2 runtime already persists this exact context-capable shape and T3 merely activates a dormant legal value, then:

```text
portable STATE_VERSION bump solely for T3 context activation = NOT REQUIRED
new temporal.schemaVersion solely for activation             = NOT REQUIRED
```

A version bump is required only when the stored representation or meaning becomes incompatible with the live predecessor contract.

T3-D does not invent the future numeric value now.

## 9. CORE_STATE_VERSION decision rule

If the live predecessor uses `CORE_STATE_VERSION` to identify accepted semantic behavior, activating context may change semantic compatibility even if storage shape is unchanged.

Therefore:

```text
same storage shape
+ newly accepted active retrospective semantics
-> CORE_STATE_VERSION bump MAY BE REQUIRED
```

The implementation impact pass must derive the exact requirement from current production source.

No numeric value is frozen here.

## 10. Context normalization rules

A stored context is valid only when all required first-family invariants hold:

```text
kind = RETROSPECTIVE
position = valid TemporalPosition
source = bounded valid source stamp
enteredFromRevision = bounded valid predecessor revision marker
no nested child context
```

Invalid/malformed context must fail closed.

It must never silently become the present head.

Preferred safe degradation:

```text
invalid context
-> context = null or UNKNOWN retrospective only if the owning live migration contract can prove route truth
-> preserve head independently
```

Migration must never fabricate a retrospective merely from an old historical timestamp.

## 11. Legacy narrativeTimestamp remains present-head-only

T3 preserves the compatibility rule:

```text
head EXACT_MINUTE -> narrativeTimestamp mirrors head
head weak         -> narrativeTimestamp = null
```

Retrospective context never writes the legacy mirror.

Therefore:

```text
context = 2028 flashback
head    = 2031 present
```

must not produce:

```text
narrativeTimestamp = 2028
```

This is a critical downgrade and legacy-consumer guard.

## 12. worldYear / koreanAgeOffset remain present-owned compatibility fields

Retrospective event position must not regress or temporarily rewrite `worldYear`.

`koreanAgeOffset` retains its existing compatibility meaning.

T3-C's derived-value lane selector does not redefine either compatibility field.

## 13. Request proposal shape

T3 reuses the T1 proposal family.

Conceptually:

```js
pending.temporalProposal = {
  baseRevision,
  observation,
  disposition,
  headOp: 'KEEP' | 'REPLACE',
  nextHead,
  contextOp: 'KEEP' | 'ENTER' | 'UPDATE' | 'EXIT',
  nextContext
}
```

For T3:

```text
ENTER    -> head KEEP, context ENTER
CONTINUE -> head KEEP, context UPDATE
EXIT     -> head KEEP, context EXIT
EXIT + present transition -> head REPLACE + context EXIT
```

The combined EXIT + head transition is one temporal transaction.

## 14. Revision semantics

Frozen semantic rule:

```text
context ENTER                    -> revision +1
context semantic UPDATE          -> revision +1
no-evidence retrospective turn   -> revision unchanged
context EXIT                     -> revision +1
EXIT + head semantic change      -> revision +1 total
representation-only edit         -> revision unchanged
stale/discarded candidate        -> no mutation
```

No double increment is allowed merely because two fields change in one accepted temporal transaction.

## 15. Effective generation state

The model must see the effective request-scoped retrospective state before canonical commit when an authoritative ENTER or CONTINUE source exists.

Example:

```text
committed context = null
user = explicit retrospective enter
pending context = 2028-06-01
```

During candidate generation:

```text
event_* = pending 2028 context
present_* = committed present head
```

Canonical persisted context remains null until accepted output finalization.

This distinction is mandatory for exact-once safety.

## 16. Candidate basis selection

Candidate semantic basis is fixed before parsing candidate bytes for route meaning.

```text
committed context + current bounded routing
-> candidate lane
-> expected position
-> parse visible temporal header
-> compare
```

Never:

```text
candidate old-looking timestamp
-> infer flashback
```

or:

```text
candidate present-looking timestamp
-> infer exit
```

Candidate content may narrow a compatible temporal constraint where T2/T3 contracts allow it, but it never grants routing authority.

## 17. One immutable temporal assessment per candidate

T3 preserves the T2 rule:

```text
candidate
-> Time assessment ONCE
-> same immutable result to Structure / publication decision / Output Finalize
```

Do not calculate compatibility independently in Structure and Output Finalize.

This is both correctness and performance policy.

## 18. #1822 remains a hard runtime dependency

T3 can receive an irreparable incompatible candidate while a retrospective context is active.

Example:

```text
pending retrospective range = 2028-06-01..2028-06-03
candidate common frame exact = 2028-06-08 10:00
```

T3-B forbids:

```text
silently accept and keep internal range
clamp to endpoint
replace header while arbitrary body may depend on candidate date
publish then correct next turn
```

Therefore T3 runtime activation requires a proven publication path satisfying #1822:

```text
REJECT
-> rejected candidate not accepted/published as authority
-> NO_COMMIT
-> no partial Temporal mutation
-> no unbounded hidden retry
```

T3-D does not solve #1822 inside the temporal integration patch.

## 19. Fail-closed transport composition

When #1822 is eventually resolved, T3 must consume that transport rather than create a T3-specific retry/rejection system.

Any bounded retry path must preserve:

```text
same request identity
same predecessor/baseRevision
first rejected candidate = no publication + no commit
maximum automatic retry count = 1 unless a stricter future contract says zero
second invalid candidate = terminal no-commit, not another loop
```

No raw conversation retention is authorized solely for retry.

## 20. Structure integration

Structure continues to own frame layout and marker integrity.

T3-specific difference:

```text
expected common temporal slot
= selected depicted lane TemporalPosition
```

In ordinary present scenes this is head/effective present target.

In active retrospective scenes this is context/effective event target.

Mode B remains governed by its separate visible Broadcast airtime frame contract.

Structure must not infer lane from timestamp value.

## 21. Prompt integration

T3-C freezes the dynamic retrospective projection budget:

```text
active/effective retrospective = exactly one T3 temporal_scene line when relevant
no retrospective              = no T3-specific extra line
```

The line carries:

```text
event_* + present_*
```

It does not carry:

```text
revision
baseRevision
source stamp
send/out/edit ids
diagnostic disposition
parser captures
entry history
```

Prompt serialization remains constant-size with chat length.

## 22. Prompt/compiler ABI policy

T3 retrospective projection changes canonical prompt bytes relative to a T2 present-only runtime.

Therefore at implementation time:

```text
PROMPT exact-byte ABI impact = YES
```

The live implementation impact pass must fresh-read:

```text
PROMPT_COMPILER_VERSION
stable/slow/volatile/full prompt partition
A2 exact-byte fixtures
A3 descriptor taxonomy
current temporal_scene serializer
current frame instruction bytes
```

If canonical bytes/order/grammar change, compiler identity must advance under the live ABI contract.

No silent prompt ABI mutation with unchanged compiler identity is allowed.

## 23. Stable versus volatile prompt placement

T3 preserves T2-C placement:

```text
stable temporal/frame grammar -> existing stable tier
current retrospective event/present facts -> volatile/current request tier
```

No new cache tier is authorized.

A retrospective lasting many turns must not append historical event lines each turn.

## 24. Exact dynamic prompt ceiling

First-family T3 target:

```text
T3-specific dynamic Temporal lines = 0 or 1
```

Even when event and present positions are both exact, they share one semantic unit.

Derived-age projection, if separately relevant under an existing/future contract, remains a distinct bounded derived fact and is not a license to dump temporal state.

## 25. Mode A integration

Mode A may activate full T3 routing.

When retrospective is active/effective:

```text
visible narrative temporal frame = event-local position
prompt temporal_scene            = retrospective event + present return head
canonical head                   = unchanged present authority unless explicit exit + present transition
```

## 26. Mode B integration

Hard invariant:

```text
Broadcast airtime
!= retrospective narrative event position
!= present narrative head
```

T3 may project narrative retrospective semantics to the model only when explicitly routed/relevant.

It must not hijack Mode B visible airtime.

No second visible narrative temporal header is added solely for T3.

B_END floor remains a present-world lower-bound constraint, never an event-local retrospective timestamp.

## 27. Mode C integration

Mode C may use ordinary T3 retrospective routing while maintaining Exposure/Knowledge authority separation.

The model's access to event/present temporal truth does not mean COMMUNITY may state the same fact as public knowledge.

No T3 public-time ledger is introduced.

## 28. Derived-value basis selector

Any deterministic derived consumer must explicitly request one of the roles frozen by T3-C:

```text
DEPICED_EVENT
PRESENT_WORLD
```

Examples:

```text
age during depicted flashback -> DEPICTED_EVENT
age/status now                -> PRESENT_WORLD
worldYear compatibility       -> PRESENT_WORLD only
```

If the requested position precision is insufficient, the derived result must remain weak/UNKNOWN according to its own domain contract.

T3 does not persist derived age.

## 29. Reroll semantics

Reroll must rebuild from the predecessor committed snapshot.

Example:

```text
predecessor context = null
first candidate enters retrospective and commits
user rerolls that output
```

Replacement processing must not start from the first committed context and enter again on top of it.

Correct behavior:

```text
predecessor snapshot
+ same current request source
+ replacement candidate
-> one replacement temporal result
```

Discarded candidate branches never accumulate context transitions.

## 30. Representation-only edit semantics

An edit that changes only representation while preserving semantic temporal content must keep:

```text
head
context
revision
```

unchanged.

T3 must not convert harmless visible formatting differences into retrospective EXIT/ENTER rebuilds.

## 31. Semantic temporal edit semantics

If the supported edit surface proves that a previously committed retrospective control or canonical temporal fact changed semantically, rebuild from the predecessor snapshot exactly once.

Examples:

```text
retrospective entry date changed
retrospective continuation delta changed
explicit exit added/removed
present transition after exit changed
```

Do not patch current context incrementally on top of the obsolete committed result.

## 32. Ambiguous edit semantics

If edit classification cannot prove the temporal semantic difference:

```text
fail closed
```

Do not invent a new event date or silently convert retrospective to present.

The existing supported edit-depth boundary remains unchanged.

T3 does not authorize deep-history rescans.

## 33. Reload semantics

Current-schema reload restores:

```text
head
headSource
revision
context or null
```

directly from persisted state.

No conversation scan is needed to rediscover where the flashback began.

Memory-only diagnostics may reset normally.

## 34. Bootstrap / migration from a predecessor with no context

Migration must be conservative.

A predecessor state with no T3 context becomes:

```text
context = null
```

unless already-authoritative structured state in the live migration contract explicitly proves an active context.

Forbidden migration evidence:

```text
old historical assistant timestamp
arbitrary "years ago" prose
memory wording
quoted dates
turn ordering
wall-clock timing
```

T3 migration never mines history to manufacture a current flashback.

## 35. Downgrade safety

T3 downgrade inherits the T2 principle:

```text
SAFE DOWNGRADE = FAIL WEAK, NEVER FALSE PRESENT
```

A pre-T3 runtime may not understand an active context.

Safe downgrade may lose the active retrospective routing information.

It must never:

```text
promote event position into present head
replace narrativeTimestamp with event timestamp
regress worldYear to event year
select a guessed present time
revive stale exact state
```

The release evidence must describe this loss honestly.

## 36. Re-upgrade stale-context guard

If a pre-T3 runtime runs after downgrade and later T3 is reinstalled, a surviving old context object is not automatically current authority.

The re-upgrade path must use live version/state lineage and current present authority.

If freshness of the old context cannot be proven:

```text
context -> null
```

or another explicitly safe UNKNOWN representation allowed by the live contract.

Never resurrect an abandoned flashback from stale residue.

No history reconstruction is allowed.

## 37. Rollback trigger family

A T3 runtime release must be eligible for rollback or feature disablement when real evidence shows any of these classes:

```text
present head regressed because of retrospective routing
retrospective event committed into narrativeTimestamp/worldYear
context double-applied on reroll/edit
rejected candidate was published/committed
explicit exit failed to restore present basis
Mode B airtime semantics changed
COMMUNITY exposure leaked solely from Temporal truth
reload resurrected or lost authority unsafely
unbounded prompt/state/history growth appeared
new unexpected storage/network/timer/hot-path cost appeared
```

Rollback execution still follows then-current release-system authority.

T3-D itself authorizes none.

## 38. Permanent regression suite ownership

Keep existing suites green rather than replacing them with one giant T3 file.

Conceptual focused suites may include:

```text
temporal-retrospective-routing.test.mjs
temporal-retrospective-frame-disposition.test.mjs
temporal-retrospective-projection.test.mjs
temporal-retrospective-edit-reload.test.mjs
temporal-retrospective-migration-rollback.test.mjs
```

Exact filenames must follow then-current repository conventions.

Existing permanent narrative-clock, T1 exact, T2 weak-state/frame/mode, Broadcast, Edit Reconcile, Exposure, prompt ABI and architecture checks remain required.

## 39. Routing regression matrix

Permanent coverage must prove at least:

1. explicit exact retrospective enter creates context and preserves head;
2. date-only enter preserves unknown clock;
3. bounded enter preserves full envelope;
4. vague directional past enter preserves relation without fake duration;
5. explicit retrospective with no usable time can preserve UNKNOWN event position;
6. historical reference alone does not enter context;
7. quoted historical control does not enter context;
8. arbitrary assistant prose does not enter context;
9. active context ordinary +2h advances context only;
10. active context next-day advances context only;
11. active context vague continuation weakens/advances truthfully;
12. no-evidence turn preserves context/revision exactly;
13. nested retrospective attempt fails closed;
14. explicit exit clears context and keeps head;
15. exit + present +2h derives from present head, not event context;
16. EXIT + head update increments revision once total;
17. event date earlier than head is not present-head regression;
18. retrospective never changes worldYear solely from event year.

## 40. Candidate/frame regression matrix

Must prove:

19. candidate basis selected before candidate timestamp semantics;
20. entry-turn candidate checks pending context despite canonical context still null;
21. active retrospective exact candidate checks context, not head;
22. candidate equal to present head does not imply exit;
23. compatible exact narrowing inside event range can be accepted under existing output-authority contract;
24. incompatible exact outside event range rejects;
25. malformed common temporal header rejects under the lower-layer contract;
26. body prose cannot rescue malformed/incompatible common header;
27. explicit exit switches candidate basis to PRESENT before assessment;
28. exit + present target checks the pending new head;
29. exactly one common narrative temporal frame slot remains;
30. Mode B later airtime lines are not miscounted as T3 duplicate narrative headers.

## 41. Projection regression matrix

Must prove:

31. active retrospective emits one temporal_scene line containing event + present;
32. no duplicate current temporal_scene line appears beside it;
33. event UNKNOWN still projects retrospective lane truth when behaviorally necessary;
34. event DATE_ONLY does not invent a clock;
35. event range does not choose midpoint/endpoint;
36. event relative relation preserves anchor semantics;
37. present component preserves its own weak precision;
38. pending ENTER projects pending event before commit;
39. pending CONTINUE projects pending next event;
40. EXIT removes retrospective projection before candidate generation and restores current projection;
41. revision/source/provenance are absent from prompt;
42. dynamic T3 temporal line count is bounded to 0 or 1;
43. repeated retrospective turns do not grow prompt with history.

## 42. Mode / Exposure / derived-value regression matrix

Must prove:

44. Mode A retrospective frame/projection behavior is correct;
45. Mode B visible airtime remains Broadcast-owned;
46. Mode B retrospective semantic projection, when separately relevant, does not create second visible time authority;
47. B_END floor affects present return authority only;
48. Mode C retrospective continuity works without public-knowledge grant;
49. COMMUNITY cannot infer event/present time solely from Temporal state without Exposure authority;
50. DEPICTED_EVENT derived age uses event date;
51. PRESENT_WORLD derived age/status uses head date;
52. insufficient event precision yields weak/UNKNOWN derived value instead of guess;
53. retrospective never mutates koreanAgeOffset semantics.

## 43. Transaction / lineage regression matrix

Must prove:

54. discarded candidate cannot ENTER context;
55. discarded candidate cannot UPDATE context;
56. discarded candidate cannot EXIT context;
57. reroll replacement rebuilds from predecessor once;
58. reroll does not double-advance event time;
59. representation-only edit preserves temporal revision/context;
60. semantic entry edit rebuilds once;
61. semantic continuation edit rebuilds once;
62. semantic exit edit rebuilds once;
63. ambiguous temporal edit fails closed;
64. stale baseRevision causes no commit;
65. reload preserves active head/context independently;
66. reload does not infer a context from old visible timestamps.

## 44. Migration / downgrade regression matrix

Must prove:

67. predecessor without context migrates to null context;
68. migration never mines historical prose for context;
69. malformed stored context cannot become head;
70. legacy narrativeTimestamp remains head-only;
71. downgrade never promotes event position to current time;
72. downgrade never regresses worldYear to event year;
73. re-upgrade rejects stale context residue when freshness cannot be proven;
74. loss of active context on downgrade is documented rather than hidden as fully reversible.

## 45. Publication rejection regression matrix

Once #1822 is solved, permanent tests must prove:

75. incompatible event candidate -> NO_COMMIT;
76. rejected candidate does not mutate head;
77. rejected candidate does not mutate context;
78. rejected candidate does not increment revision;
79. first rejected candidate is not accepted publication authority;
80. any permitted regeneration remains bounded to the proven transport contract;
81. retry does not change predecessor/baseRevision;
82. second invalid candidate does not create an unbounded loop.

## 46. Performance ceilings

Hard first-family ceilings:

```text
new storage read solely for T3             = 0
new storage write solely for diagnostics   = 0
new network                                = 0
new timer/polling                          = 0
new whole-history scan                     = 0
new arbitrary whole-message semantic pass  = 0
auxiliary semantic model                   = 0
unbounded event/context ledger             = 0
nested context stack                       = 0
candidate temporal assessment              = exactly once per candidate
T3 dynamic temporal_scene lines            = 0 or 1
persistent retrospective contexts          = 0 or 1
```

Bounded current-user control parsing may extend the existing T1/T2 current-turn source path only.

## 47. Performance measurement requirements

Static absence claims are necessary but not sufficient.

A later runtime release should measure at least:

```text
request preparation cost with no context
request preparation cost with active context
candidate temporal assessment cost
prompt line/character delta
serialized state size delta
output finalize delta
reload normalize delta
```

Do not infer provider cache improvement or regression merely from local prompt bytes.

Provider cache remains separately evidenced.

## 48. Prompt-size acceptance

T3 must remain constant-size with retrospective duration.

Required invariant:

```text
1 retrospective turn
and
100 retrospective turns
```

produce the same category/upper-bound of T3 prompt state, because only the current event position and present head are projected.

No retrospective history list is allowed.

## 49. State-size acceptance

Persistent Temporal state remains constant-size:

```text
head
+ optional one context
+ bounded source stamps
+ one revision
```

No entry/event history accumulates.

## 50. Real long-chat acceptance matrix

A future live T3 release requires natural same-runtime evidence covering at minimum:

```text
A ordinary present baseline
A explicit exact retrospective enter
multi-turn retrospective continuation
DATE_ONLY or bounded event precision
one vague/relative event progression when that lower layer is live
no-evidence retrospective hold
compatible model-authored event narrowing
one incompatible candidate fail-closed proof through #1822 transport
reroll while retrospective active
representation-only edit while active
semantic retrospective edit/rebuild
same-tab reload with active context
explicit exit to unchanged present
explicit exit + present +N transition
Mode C retrospective continuity
Mode B control proving airtime ownership unchanged
post-B_END present-floor separation if applicable
Exposure/COMMUNITY non-leak check
prompt line budget / state-size bounded check
no new I/O/timer/history-scan branch
```

Each result must distinguish persisted-state correctness from visible-output correctness.

## 51. Live evidence interpretation

A diagnostic label alone does not prove T3 correctness.

For every live specimen, cross-check:

```text
user RAW control
prior committed head/context
request routing/proposal
model visible frame
candidate assessment/disposition
Output Finalize result
persisted head/context/revision
next-turn inherited state
```

For Mode B/C also cross-check Broadcast and Exposure independently.

A `COMMITTED` status is not sufficient if the visible event header contradicted the committed state.

## 52. Runtime slicing

T3 first runtime family should remain small.

Preferred shape after lower layers are live:

```text
T3-R1 = SINGLE RETROSPECTIVE CONTEXT
        explicit ENTER
        active CONTINUE
        explicit EXIT
        one context only
        existing T2 precision set only
```

Do not combine with:

```text
nested retrospective stack
arbitrary event switching
generic dream/vision contexts
new exposure ledger
new age system
new timeline database
#1660 output-hygiene repair
#1822 transport implementation unless that issue's own approved transaction specifically requires coordinated landing
repository write/control-plane repairs
```

A second T3 runtime slice is unnecessary unless real evidence later proves another bounded requirement.

## 53. Release number remains unfrozen

T3-D does not assign a future version.

The current production is v0.70.11, but lower T1/T2 runtime work will necessarily change release reality before T3 can enter.

Therefore:

```text
T3-R1 version = UNFROZEN
```

A future implementation must derive it from then-current production authority.

## 54. Exact implementation impact pass required

Before code mutation, fresh-read at least:

```text
release-simcore tip
product-manifest.json
latest.js / install.js identity
Time live implementation
State Reconcile temporal normalization
Lifecycle/request source preparation
Prompt compiler + PROMPT_COMPILER_VERSION
Structure temporal-frame validation
Session/output-hook publication path
Output Finalize commit path
Edit Reconcile predecessor rebuild path
Bootstrap/reload migration path
architecture machine contract
A2 exact-byte fixtures
A3 descriptor fixtures
current release/write authority and main protection state
open FIX/BLOCKER owners affecting product advancement
```

Then map this design to actual symbols.

## 55. Release integrity

Any future T3 production release must preserve the normal SimCore release invariant:

```text
plugins/simcore/latest.js == plugins/simcore/install.js
```

A candidate with divergent artifacts cannot be promoted.

T3 does not change release-system authority.

## 56. Repository / main-write boundary

The repository's 2026-09-11 main-write environment is materially different from the original T3 design period.

At this design stage, native branch protection/Required enforcement and separate R2.8 checked-PR/control-plane incidents exist.

Therefore this document does not freeze any assumption that a future T3 release or terminal-state synchronization may directly write main.

Every future repository mutation follows then-current common rules, protected-main gateway, Required checks, product release contract, and incident state.

Repository-control-plane repair remains outside T3 scope.

## 57. Current unrelated docs drift

Fresh T3-D authority work found that the human-authored current operational paragraph in `docs/CURRENT_DEVELOPMENT.md` still described #1657 as open / release-card UI not exercised after the actual live UI PASS and issue closure.

That finding is preserved separately as #1994.

T3-D must not repair it in this design PR.

This separation preserves one primary goal for the current work unit.

## 58. Runtime entry gate

T3 runtime implementation may begin only when all are true at a fresh authority read:

```text
T1 Exact Temporal Core exists in production and is live-proven
required T2 weak precision/frame/candidate contracts exist in production and are live-proven
#1822 is resolved or an approved invariant-preserving redesign removes the rejection requirement
#1660 is resolved/reclassified if it still holds next runtime advancement
current production release's required live gate is satisfied or the then-current release contract explicitly permits next product advancement
T3-D is merged and current main is healthy enough under the owning repository contract
fresh release-simcore / manifest / artifact identity is read
latest.js == install.js is proven at the implementation/release boundary
user explicitly authorizes T3 runtime implementation
```

Design completion alone never grants runtime authority.

## 59. Acceptance target

T3-D design is accepted when it freezes all of these without runtime mutation:

```text
semantic owner = Time
retrospective topology = one optional context only
present head remains independent authority
Broadcast airtime remains independent authority
candidate lane chosen before candidate timestamp meaning
one immutable Time assessment per candidate
#1822 fail-closed publication dependency preserved
exact-once enter/update/exit commit
EXIT + head update = one revision transaction
reroll/edit/reload predecessor authority preserved
migration never infers flashback from history
legacy narrativeTimestamp remains head-only
downgrade never promotes event time to present
prompt dynamic T3 line budget = 0 or 1
prompt/cache ABI impact explicit
state/prompt growth constant-size
no new network/timer/history scan/event ledger
Exposure/Knowledge remains separate
release number/version deltas remain fresh-derived
latest/install identity remains mandatory
runtime authorization remains NONE
```

## 60. Non-goals

T3-D does not authorize:

- runtime implementation;
- prompt compiler mutation;
- state/schema version bump;
- release/version mutation;
- `release-simcore` mutation;
- nested flashback stack;
- arbitrary event switching;
- event ledger/timeline graph/world-history database;
- generic temporal NLP engine;
- dream/vision/hypothetical automatic activation;
- global arbitrary-prose time/age contradiction scanner;
- new Exposure ledger;
- provider-cache optimization claims;
- #1660 repair;
- #1822 transport repair inside this design work;
- #1994 documentation repair;
- R2.8/control-plane/main-write incident repair.

## 61. Current stage checkpoint

This document is materialized during the repository `IMPLEMENTATION_PR` interaction stage as a design artifact only.

The legal next stage after PR creation is:

```text
VALIDATION_MERGE
```

That later stage must inspect current PR-head Required validation, exact diff, mergeability, current main movement, and current incident/authority state before deciding whether merge is allowed.

No merge is authorized by this document itself.
