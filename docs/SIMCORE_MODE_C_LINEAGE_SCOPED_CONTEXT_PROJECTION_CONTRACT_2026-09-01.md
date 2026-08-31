# SimCore Mode C Lineage-Scoped Context Projection Contract — 2026-09-01

Date: 2026-09-01 KST

Status: **DESIGN FROZEN · SHADOW-FIRST CONTRACT · ACTIVE REQUEST PRUNING NOT AUTHORIZED**

Classification: **LIGHTBOARD / MINIBOARD DESIGN PROMOTION · CONTEXT PROJECTION · MODE C / LINEAGE / EVIDENCE**

Working identifier:

```text
MODE_C_LINEAGE_SCOPED_CONTEXT_PROJECTION
```

This document converts the completed Context Projection impact scope into one bounded design contract. It freezes the first projection candidate, ownership, eligibility, protected context, fallback behavior, validation plan and promotion gates.

It does **not** authorize production request-history deletion. The first executable phase is intentionally shadow-only: compute the exact projection that would have been applied, measure it, validate it, but send the original request unchanged.

---

## 1. Authority

This design is governed by:

- `docs/SIMCORE_CONTEXT_PROJECTION_IMPACT_SCOPE_2026-09-01.md`
- `docs/SIMCORE_LIGHTBOARD_MINIBOARD_TOTAL_SYNTHESIS_2026-09-01.md`
- `docs/SIMCORE_LIGHTBOARD_MINIBOARD_DESIGN_CANDIDATE_SHORTLIST_2026-09-01.md`
- `docs/REPOSITORY_COMMON_RULES.md`
- `docs/REPOSITORY_PLUGIN_SKILL_DEVELOPMENT_METHODOLOGY_2026-09-01.md`
- `docs/SIMCORE_S7_POST_M2_SIMPLIFICATION_PROGRAM_CONVERGENCE_DESIGN_2026-08-31.md`
- exact production runtime on `release-simcore`

Current production authority at design time:

```text
version         = 0.70.1
release name    = Cold First-Turn Tail Attribution
release branch  = release-simcore
release commit  = 861100f4771967aa5b8ab8811d06f11702c0d3ff
runtime blob    = 8f332cfceed316d35954e353c2eaca38c2f34d95
latest == install = YES
```

`main/plugins/simcore/*` is not deployment authority.

---

## 2. Problem statement

A long SimCore conversation may expose much more prior conversation history than a short Mode C request needs to answer from its current lineage source.

Production already knows three important facts before model dispatch:

```text
1. current task mode and pending state
2. current Lineage root / parent / depth
3. exact request-side mapping of the current root/source through Evidence
```

The design question is therefore not:

```text
"What old text seems irrelevant?"
```

It is:

```text
"Can one already-owned source boundary define a smaller request view
without inventing a second memory system or weakening current-source authority?"
```

---

## 3. Core design decision

The first candidate projection is a **root-prefix cut**.

Name:

```text
ROOT_PREFIX_CUT
```

Concept:

```text
HOST-BUILT REQUEST

protected non-conversation context
+ historical conversation before current lineage root
+ current lineage root
+ every conversation turn after root through current user

                         ↓ shadow planner

CANDIDATE PROJECTED VIEW

protected non-conversation context
+ current lineage root
+ every conversation turn after root through current user
```

Only conversation messages strictly before the current mapped lineage root are candidates for exclusion.

No message inside the root→current-user conversation slice is selectively ranked, summarized, rewritten or removed.

This is intentionally less aggressive than arbitrary relevance filtering.

---

## 4. Why ROOT_PREFIX_CUT is selected

It has five useful properties.

### 4.1 Source boundary is already owned

Lineage owns root identity. Evidence owns exact request mapping. Projection does not invent a semantic source.

### 4.2 The kept conversation region is contiguous

The design keeps:

```text
root → descendants → parent chain → current user
```

as one contiguous conversation slice.

This avoids cherry-picking individual historical facts.

### 4.3 Parent-chain continuity is naturally retained

A same-root C→C follow-up may depend on an earlier C response. Because all conversation turns from root forward are retained, current parent/depth continuity stays present without a new parent-content retrieval system.

### 4.4 No synthetic summary is introduced

Excluded history is not replaced by a generated synopsis, placeholder memory, embedding result or model-written checkpoint.

### 4.5 Failure can preserve exact production behavior

The planner can return `NO_PROJECTION` and the original request remains untouched.

---

## 5. Why active pruning is not yet authorized

Structure alone does not prove that every pre-root conversation fact is semantically irrelevant.

A source assistant may refer implicitly to older established context. Character/world continuity may also have been established in conversation rather than the character card or currently exposed lore.

Therefore:

```text
ROOT_PREFIX_CUT = concrete candidate
ROOT_PREFIX_CUT safety = hypothesis requiring evidence
```

The first executable implementation must run in:

```text
SHADOW_ONLY
```

and may not remove or reorder request messages.

This is the required RCR-D09 feedback loop rather than an implementation delay disguised as a design gap.

---

## 6. Semantic owner

The first projection contract belongs with **Evidence**, consuming Lineage/Handoff facts.

Frozen ownership:

```text
Lineage
  owns root / parent / depth identity

Handoff
  owns existing short-C source/repetition observations

Evidence
  owns request-side root/source mapping
  owns projection eligibility proof that depends on that mapping
  owns the pure projection plan

Runtime request shell
  may observe the plan
  may later apply an explicitly authorized plan
  does not decide semantic root/source identity
```

No new generic `context`, `memory`, `retrieval` or `projection-engine` architecture layer is authorized.

The first design should fit into the existing Evidence seam unless implementation preflight proves a physical ownership contradiction.

---

## 7. Entry eligibility

The shadow planner is eligible only when **all** required conditions are already true for the current request.

Required:

```text
pending.active = true
pending.mode = C
existing short-C source anchor is active
Lineage source kind != UNSEEDED
Lineage root index is valid
Evidence root mapping is unique and safe
Evidence source mapping is unique and safe
Evidence fence disposition = DUAL
current user request mapping is identifiable and unchanged
runtime prompt has not yet been inserted or moved
```

The design deliberately requires `DUAL`, not `ROOT_ONLY`.

Reason:

- the first context-reduction experiment must prove both the root and the current source assistant;
- a root-only request remains valid production behavior but is too weak for this first projection pilot.

Ineligible examples:

```text
Mode A
B_START / B_CONTINUE / B_END
Mode C without seeded source lineage
long/detailed C owned by another existing path rather than the short-C source anchor
Evidence ROOT_ONLY
Evidence UNFENCED
ambiguous source mapping
missing source assistant
unsupported request role shape
```

All ineligible paths remain byte-for-byte request behavior candidates for current production.

---

## 8. Projection classes

Every request message is classified into exactly one of three policy classes.

```text
MUST_KEEP
MAY_EXCLUDE_IF_PROVEN
UNKNOWN_KEEP
```

There is no `probably irrelevant` class.

Unknown is conservative by definition:

```text
UNKNOWN → KEEP
```

---

## 9. MUST_KEEP contract

The planner must preserve the following classes.

### 9.1 Current user

```text
current user text = exact production request representation
```

No trimming, normalization, wrapping, summarization or replacement is allowed by projection.

Evidence fencing remains a separately owned existing request transformation.

### 9.2 Current lineage root

The mapped root user message is always kept.

### 9.3 Current source assistant

The mapped source assistant is always kept.

### 9.4 Root-to-current conversation slice

Every user/assistant conversation message at or after the mapped root request index and at or before the current user request index is kept.

This includes:

```text
source assistant
same-source follow-ups
parent-chain turns
intermediate C responses
new user clarifications after the root
current user
```

The first contract does not selectively prune inside this slice.

### 9.5 Non-conversation context

All request rows whose role/shape is not proven to be ordinary user/assistant conversation are kept.

This includes, conservatively:

```text
system
system-like host context
tool metadata/tool results if present
character/reference context
Core ruleset / handshake context
host-specific request metadata
unknown roles
unknown content shapes
```

### 9.6 SimCore runtime prompt

The SimCore runtime block remains unchanged and remains:

```text
TAIL_AFTER_CURRENT_USER
```

Projection may not move it into the historical prefix or alter its bytes.

### 9.7 Any uncertain row

If a row cannot be confidently classified as an ordinary pre-root conversation row, it is kept.

---

## 10. MAY_EXCLUDE_IF_PROVEN contract

The first and only exclusion candidate class is:

```text
ordinary conversation rows
with role = user or assistant/char
whose request index is strictly before the mapped current lineage root request index
```

Additional requirements:

```text
row is not system/tool/reference metadata
row is not the current root
row is not the current source assistant
row is not current user
row classification is structurally unambiguous
request ordering remains valid after hypothetical exclusion
all protected anchors remain present exactly once
```

These rows are called:

```text
PRE_ROOT_CONVERSATION_PREFIX
```

In the first executable phase they are **candidate excluded rows only**. They remain in the actual model request.

---

## 11. UNKNOWN_KEEP examples

Keep rather than guess when any of the following occurs:

```text
role is missing or unfamiliar
message content is non-string and classification is not already supported
host-injected wrapper cannot be distinguished from conversation
root mapping is transformed beyond current Evidence safety
multiple request rows match the same authoritative raw turn
current user request index is uncertain
message ordering contains an unsupported interleave
projection would cross a tool/system boundary whose semantics are unknown
```

`UNKNOWN_KEEP` is not a warning by itself. It is the intended safe disposition.

---

## 12. Pure shadow-plan shape

The first implementation should expose a pure bounded planner result conceptually shaped like:

```text
{
  status,
  reason,
  mode,
  rootRequestIndex,
  sourceRequestIndex,
  currentUserRequestIndex,
  candidateExcludedMessageCount,
  candidateExcludedChars,
  originalMessageCount,
  originalChars,
  projectedMessageCount,
  projectedChars,
  retainedRoot,
  retainedSource,
  retainedCurrentUser,
  unknownKeptCount,
  applied: false
}
```

Exact field names are implementation detail and may be simplified, but the information contract is frozen:

- plan status/reason;
- exact anchor indices;
- bounded count/character deltas;
- proof that root/source/current user remain retained;
- explicit `applied = false` for shadow phase.

No raw removed bodies are persisted for diagnostics.

---

## 13. Planner dispositions

Required high-level states:

```text
INELIGIBLE
NO_REDUCTION
SHADOW_CANDIDATE
FALLBACK_UNSAFE
```

Meanings:

### INELIGIBLE

The request is outside the first projection contract. No projection work beyond bounded eligibility checks.

### NO_REDUCTION

The request is eligible but there is no ordinary pre-root conversation prefix to exclude.

### SHADOW_CANDIDATE

The request is eligible and a structurally valid root-prefix cut would reduce the request.

The actual request remains unchanged.

### FALLBACK_UNSAFE

The request was potentially eligible but one of the proof conditions failed. Original request remains unchanged.

---

## 14. Shadow planner algorithm

Normative pseudocode:

```text
INPUT
  request messages
  authoritative raw chat
  current pending state
  current send index
  current Evidence DUAL mapping

1. verify Mode C + active short-C source anchor
2. verify Lineage seeded root
3. reuse Evidence mapping; do not rediscover semantic source
4. require DUAL root/source proof
5. identify current user request row
6. require root request index < current user request index
7. iterate request rows in original order
8. classify each row:
     non-conversation / unknown -> MUST_KEEP or UNKNOWN_KEEP
     conversation index >= root -> MUST_KEEP
     conversation index < root -> PRE_ROOT_CONVERSATION_PREFIX candidate
9. construct only a metadata plan in shadow phase
10. validate hypothetical projected ordering/anchors
11. on any failure -> FALLBACK_UNSAFE
12. otherwise -> SHADOW_CANDIDATE or NO_REDUCTION
13. return original request object/array unchanged
```

The shadow planner must not mutate a message object while measuring it.

---

## 15. Hypothetical active application contract

A later design amendment may authorize active projection only by applying the already-proven plan as a stable filter:

```text
keep every row except rows explicitly classified PRE_ROOT_CONVERSATION_PREFIX
preserve relative order of all kept rows
append/inject SimCore runtime prompt at the same current production seam
```

It may **not**:

```text
rewrite kept row content
reorder kept rows
insert a summary of excluded rows
insert exclusion placeholders into model-visible content
selectively remove rows inside root→current slice
change Evidence tags
change Lineage/Handoff state
```

This section defines the intended future action shape but does not authorize it.

---

## 16. Context Re-entry Firewall

Projection data is derived request metadata, not canonical state.

Frozen rule:

```text
projection plan
  != chat history
  != world fact
  != character memory
  != audience memory
  != persistent continuity state
```

Therefore:

```text
no SnapshotStore field
no scriptstate mirror field
no host-local telemetry body
no generated summary checkpoint
no automatic later prompt injection
```

A later request recomputes its own plan from its current lineage and request.

---

## 17. Reroll / repeat-send contract

Projection is derived after current Session restore/preparation and must be recomputed for each request execution.

For reroll/repeat-send:

```text
restore current production pre-state semantics
recompute current lineage
recompute Evidence mapping
recompute shadow plan
never reuse a prior plan object as authority
```

The plan may be memoized only as non-authoritative same-call local data if implementation proves no stale binding risk.

---

## 18. Rewind contract

After rewind:

```text
abandoned descendant turns have no projection authority
```

The newly restored lineage root/request mapping is authoritative.

Any shadow plan whose root/source/current-user indices do not match the restored current request is discarded.

---

## 19. Manual-edit contract

Projection must run after the existing request-side edit reconciliation authority has had its normal opportunity to classify/rebuild state.

It must not:

```text
accept a visible assistant edit as canonical equivalence
skip Edit Reconcile
change Representation provenance
use excluded-row identity to bypass manual-edit reconstruction
```

A genuine visible edit remains a positive-control requirement.

---

## 20. Reload contract

No projection state is needed across reload.

After reload:

```text
Session/state restoration occurs normally
Lineage/Handoff/Evidence are resolved normally
shadow plan is recomputed from the fresh request
```

Telemetry continuity must not be required for projection correctness.

---

## 21. New-source / same-source behavior

### New source

If existing Lineage/Handoff changes the root, the new root defines a new cut boundary.

Old projection metadata is discarded.

### Same source

If root remains the same, the root boundary remains the same, while the kept root→current slice naturally grows with the conversation.

### Parent shift

A parent shift does not change exclusion policy by itself because the entire root→current slice is already kept.

This is one reason the root-cut design is preferable to selective parent-only retention for the first pilot.

---

## 22. Prompt and output invariants

The first projection program may not alter:

```text
PROMPT_COMPILER_VERSION
runtime prompt text
runtime prompt tier ordering
TAIL_AFTER_CURRENT_USER
Current Task Primacy
Summary Scope contracts
Broadcast semantics
Frame / Time continuity
Community output contract
reaction semantics
Structure judge/quarantine
Knowledge final-block requirement
Output Finalize
Representation / Deferred Mirror behavior
persistent Core schema
provider-cache policy
```

Provider cache remains:

```text
UNVERIFIED
```

---

## 23. Module / dependency invariants

Preferred first implementation:

```text
new module = 0
new architecture layer = 0
new upward Core dependency = 0
new circular dependency = 0
```

Evidence may gain a pure projection-planning helper if exact implementation preflight confirms that doing so does not violate its existing Domain ownership contract.

The runtime shell may consume the returned plan for diagnostics.

If implementation requires a new module merely for code organization, stop and write a separate ownership justification before mutation. Do not smuggle a generic Context subsystem into the pilot.

---

## 24. Side-effect invariants

Shadow phase must add none of the following on the request-critical path:

```text
network request
auxiliary model call
pluginStorage read/write
host chat write
new timer/polling loop
new persistent key
new scriptstate field
new SnapshotStore semantic write
```

The planner operates only on request/chat/state objects already in memory for the request path.

---

## 25. Cost budget

The planner must be linear in the already-built request length and should not materialize a second full body copy merely to measure characters.

Preferred shape:

```text
one bounded pass over request rows
integer counters
anchor indices
no concatenated full-request duplicate
no raw excluded-body ledger
```

Shadow cost must be measured independently from the hypothetical downstream context reduction.

If local planner cost is material relative to the existing post-onSend path, classify it before active promotion.

---

## 26. Static validator contract

Any implementation must have a deterministic validator proving at minimum:

```text
A/B paths = unchanged
ineligible C path = unchanged
Evidence DUAL required
root/source/current-user anchors retained exactly once
root request index precedes current user
kept-row order unchanged
non-conversation rows never excluded
only pre-root user/assistant rows may be candidate excluded
runtime prompt placement unchanged
shadow request bytes/order unchanged
no new persistent state/schema/key
latest/install identity when eventually materialized
```

For shadow phase, an especially strong invariant is available:

```text
MODEL REQUEST BEFORE SHADOW PLANNER
===
MODEL REQUEST AFTER SHADOW PLANNER
```

apart from already-existing Evidence fencing and runtime-prompt insertion that would have happened without projection work.

---

## 27. Deterministic fixture matrix

### Eligibility / Evidence

```text
C + DUAL exact mapping -> eligible
C + DUAL normalized mapping -> eligible if current Evidence already accepts it
C + ROOT_ONLY -> ineligible
C + UNFENCED -> ineligible/fallback
C + ambiguous root -> fallback
C + ambiguous source -> fallback
C + absent source -> fallback
C + UNSEEDED -> ineligible
```

### Root positions

```text
root is first conversation row -> NO_REDUCTION
root has one prior conversation pair -> candidate counts exact
root has long prior conversation prefix -> candidate counts exact
non-conversation rows before root -> retained
unknown role before root -> retained
```

### Current lineage slice

```text
root user retained
source assistant retained
one C follow-up retained
multi-C chain retained
same-root parent shift retained
new source moves root boundary
```

### Mode isolation

```text
A unchanged
B_START unchanged
B_CONTINUE unchanged
B_END unchanged
long/detailed C without short-C source anchor unchanged
```

### Lifecycle

```text
reroll recomputes
repeat send recomputes
rewind discards future plan
manual edit positive control preserved
reload recomputes without projection persistence
```

---

## 28. Baseline vs shadow evaluation

For every eligible case record two views:

```text
BASELINE
  actual current request

SHADOW
  hypothetical ROOT_PREFIX_CUT plan
```

Compare independently:

### Context shape

```text
original messages
original chars
candidate excluded messages
candidate excluded chars
projected messages
projected chars
root/source/current-user retained
unknown rows retained
```

### Local cost

```text
planner time
post-onSend total
existing prompt accounting
existing topology scan cost
```

### Correctness observation

Because shadow does not change model input, production correctness remains the actual baseline. Human review must additionally ask whether the hypothetical excluded prefix contained facts that the generated answer legitimately used.

This creates evidence about semantic sufficiency before active removal.

---

## 29. Pre-root dependency traps

The shadow evaluation must deliberately include cases where pre-root history appears relevant.

Examples:

```text
older conversation establishes a relationship/fact not repeated in current source
older nickname or entity identity is reused implicitly by current source
current source says "as before" or equivalent anaphora
current user explicitly asks comparison/recap/reuse across source boundaries
current source depends on a prior numeric baseline
```

Desired result for the program is **not** to force these through projection.

Instead these cases decide whether:

```text
A. existing short-C source eligibility already excludes them safely,
or
B. active ROOT_PREFIX_CUT needs an additional deterministic guard,
or
C. active projection is not safe enough to promote.
```

If no deterministic safe boundary emerges, shadow may remain the terminal result of this candidate.

---

## 30. Active-promotion gate

Active request pruning requires a separate explicit design amendment/closure.

Minimum evidence before that amendment:

```text
static shadow invariants PASS
eligible/ineligible fixture matrix PASS
no request mutation in shadow confirmed
real long-chat shadow observations collected
pre-root dependency traps classified
material candidate context reduction observed in real eligible cases
planner cost bounded
no Evidence/Lineage/Handoff regression
no reroll/rewind/edit/reload regression
no new persistent schema need discovered
```

The amendment must answer one decisive question:

```text
Can PRE_ROOT_CONVERSATION_PREFIX be excluded by a deterministic rule
without suppressing legitimate facts needed by the current Mode C task?
```

Until the answer is supported by evidence:

```text
ACTIVE_PROJECTION = NOT_AUTHORIZED
```

---

## 31. Real long-chat shadow matrix

A future shadow implementation should observe at least these scenario classes:

```text
L1 ordinary short Mode C current-source request
L2 same-source short follow-up
L3 new-source short follow-up
L4 multi-C chain under one root
L5 long pre-root history with large candidate reduction
L6 pre-root fact-dependency trap
L7 stale prior Community answer in distant pre-root history
L8 reroll
L9 rewind/repeat send
L10 genuine manual edit positive control
L11 refresh/reload then eligible Mode C
L12 negative control Mode A/B
```

Required production checks remain:

```text
request hook SEEN
Core handshake FOUND
Runtime ACTIVE
output COMMITTED
binding correct
Evidence mapping/fence correct
Lineage root/parent/depth correct
Community structure correct
Knowledge final
warnings classified
```

Projection-specific shadow observation:

```text
plan disposition
candidate excluded messages/chars
projected chars ratio
unknown-kept count
root/source/current anchors retained
actual request unchanged
```

---

## 32. Telemetry policy

Prefer existing observability.

If one new projection probe is needed, it must be:

```text
memory-only
bounded metadata only
no raw message bodies
no excluded text excerpts
no persistent telemetry schema change
```

Suggested diagnostic facts:

```text
status/reason
root/source/current indices
original/projected message + char counts
candidate excluded counts/chars
unknown kept count
applied=false
```

Do not persist the excluded prefix for later inspection.

---

## 33. Failure taxonomy

Classify implementation/validation findings as:

### WATCH

Unexpected but non-causal observations, such as low candidate reduction or unusual host shapes that safely remain `UNKNOWN_KEEP`.

### DEFER

Potential future generalizations such as Summary projection, active parent-only projection or broader A/B/C context shaping.

### FIX

Deterministic planner/validator bugs that do not invalidate the root-cut concept.

### BLOCKER

Any of:

```text
shadow changes actual request bytes/order
current user can be changed or excluded
root/source anchor can be lost
unknown/system/tool row can be excluded
reroll/rewind can reuse stale plan authority
manual edit path can be bypassed
persistent state/schema becomes necessary without separate design
active pruning is introduced before promotion gate
S7 runtime candidate is contaminated
```

---

## 34. S7 and release separation

S7 remains the currently frozen cumulative v0.70.3 simplification/release lane.

This Context Projection contract does not modify S7.

Required sequencing:

```text
NOW
  design docs on main are allowed
  offline/static projection evaluator work may be designed separately

NOT NOW
  no Context Projection runtime delta in S7
  no v0.70.3 Context Projection identity
  no v0.70.2 reuse

RUNTIME SHADOW IMPLEMENTATION
  must begin only from the then-current production authority
  after S7 release/live boundaries no longer require the exact v0.70.1 parent
  unless repository release authority is explicitly redesigned first
```

At runtime-implementation preflight, re-read:

```text
release-simcore HEAD
production version/blob
current S7 disposition
current architecture contract
current Evidence/Lineage/Handoff source
```

Do not hardcode a future version number in this design.

---

## 35. Offline work allowed before runtime implementation

The design permits a non-runtime evaluator/harness on `main` before S7 completes, provided it:

```text
uses fixture/supplied request structures only
performs no production mutation
creates no release request
changes no plugin runtime artifact
models ROOT_PREFIX_CUT deterministically
proves MUST_KEEP / UNKNOWN_KEEP / candidate-exclusion invariants
```

This is the preferred next implementation-adjacent task if Context Projection research continues before S7 publication.

---

## 36. Explicit non-goals

```text
NO generic Context/Memory subsystem
NO embeddings/vector search
NO semantic relevance ranking
NO auxiliary-model summarizer
NO persistent projection cache
NO canonical-history deletion
NO visible-chat rewrite
NO selective pruning inside root→current slice
NO new source-selection semantics
NO Handoff redesign
NO Lineage redesign
NO Evidence threshold relaxation
NO provider-cache tuning/claim
NO prompt relocation
NO S7 scope change
```

---

## 37. Design success criteria

This design is successful if an engineer can implement the shadow phase without asking:

```text
which mode is eligible?
who owns source identity?
which exact rows are candidates?
which rows must always stay?
what happens on uncertainty?
where does the plan live?
can it persist?
can it mutate the request yet?
what must be tested?
what evidence is required before active pruning?
```

The frozen answers are:

```text
eligible mode          = short source-anchored Mode C only
source identity owner  = existing Lineage
request mapping owner  = existing Evidence
candidate exclusion    = ordinary pre-root conversation prefix only
MUST_KEEP              = all non-conversation + root→current conversation slice
UNKNOWN                 = KEEP
persistence             = NONE
first executable effect = SHADOW ONLY
active pruning          = NOT AUTHORIZED
```

---

## 38. Final design state

```text
CONTEXT_PROJECTION_IMPACT_SCOPE         = COMPLETE
MODE_C_PROJECTION_CONTRACT              = DESIGN_FROZEN
PROJECTION_CANDIDATE                    = ROOT_PREFIX_CUT
SEMANTIC_OWNER                          = EVIDENCE_CONSUMING_LINEAGE
ENTRY                                   = SHORT_C_SOURCE_ANCHORED + EVIDENCE_DUAL
MUST_KEEP                               = NON_CONVERSATION + ROOT_TO_CURRENT_SLICE
MAY_EXCLUDE_IF_PROVEN                   = PRE_ROOT_CONVERSATION_PREFIX
UNKNOWN                                 = KEEP
PERSISTENT_SCHEMA                       = NONE
AUX_MODEL                               = NONE
FIRST_IMPLEMENTATION_EFFECT             = SHADOW_ONLY
ACTIVE_REQUEST_PRUNING                  = NOT_AUTHORIZED
S7_CHANGE                               = NONE
PRODUCTION_CHANGE                       = NONE
NEXT_CONTEXT_TASK                       = BUILD_OFFLINE_STATIC_SHADOW_EVALUATOR_OR_WAIT_FOR_POST_S7_RUNTIME_PREFLIGHT
```
