# SYS-02 — Decision / Supersession Graph — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · CURATED DECISION LINEAGE · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-02
Idea          = Decision / Supersession Graph
Size          = SMALL
Importance    = 4 / HIGH
Difficulty    = 2 / EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct upstream boundaries:
- `docs/SIMCORE_SYS05_HISTORICAL_VS_LIVING_DOCUMENT_REGISTRY_DESIGN.md`
- `docs/SIMCORE_SYS04_STATUS_VOCABULARY_LINTER_DESIGN.md`
- `docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md`

Related systems that this design must compose with rather than replace:
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY.md`
- `docs/SIMCORE_SYS03_GATE_DEPENDENCY_GRAPH_DESIGN.md`
- `docs/SIMCORE_SYS35_REPOSITORY_TRANSACTION_LEDGER_DESIGN.md`
- `docs/SIMCORE_SYS46_CANONICAL_TASK_CARD_DESIGN.md`

Downstream ideas expected to consume reviewed supersession edges rather than infer replacement independently:
- SYS-12 Current-State Snapshot Page
- SYS-07 Cross-Reference Integrity Auditor
- SYS-06 Evidence-to-Decision Trace Map

---

## 1. Problem

SimCore intentionally preserves old plans, release evidence, frozen designs, superseded operating instructions, and later current authorities in the same repository.

That is healthy historical memory, but it creates a recurring interpretation problem:

```text
newer file exists
!= older decision is fully superseded

older file says CURRENT/NEXT
!= it is still current now

later implementation exists
!= every earlier design statement became invalid

historical plan marked HISTORICAL
!= every design decision inside it is useless
```

The repository already contains real examples where only a bounded portion of an older artifact has been superseded.

For example, the Release System v2 base plan remains useful historical architecture/rationale, while its old immediate-action/roadmap instruction has explicitly been superseded by later operational authorities.

Without an explicit reviewed decision-lineage layer, later sessions/tools may infer replacement from:

```text
filename
commit timestamp
version number
"latest" wording
historical/living role alone
status tokens
proximity of references
```

Those heuristics are unsafe.

Failure modes include:

```text
FALSE FULL SUPERSESSION
→ one replaced current-action section causes the entire predecessor design to be treated as invalid

MISSED SUPERSESSION
→ an old current-looking instruction remains actionable because no explicit successor relation is consulted

TRANSITIVE GUESSING
→ A was replaced by B and B by C, so a tool invents an A→C semantic edge without review

DEPENDENCY CONFUSION
→ "B depends on A" is mistaken for "B supersedes A"

AUTHORITY PROMOTION
→ a graph edge is treated as the source of current truth rather than navigation over source decisions
```

SYS-02 defines a compact curated **Decision / Supersession Graph** that records explicit reviewed predecessor/successor relationships at the smallest defensible decision scope.

It is decision-lineage metadata, not a current-state authority and not an automatic graph inference engine.

---

## 2. Core invariant

```text
reviewed predecessor decision scope
+ reviewed successor / retirement decision scope
+ explicit relation type
+ explicit affected semantic scope
+ source authority basis
→ one durable supersession edge

SYS-02
!= newest-file-wins engine
!= current-state authority
!= gate dependency graph
!= document lifecycle registry
!= repository transaction graph
!= evidence-to-decision trace map
!= generic cross-reference graph
!= automatic semantic diff
!= repository writer
```

Canonical question:

> Which reviewed later decision changes the current-instruction effect of which reviewed earlier decision, and over what exact scope?

SYS-02 does not answer:

> What is the current production version, gate, NEXT, PASS result, or implementation state?

Those values remain with their owning authorities.

---

## 3. Decision scope, not file age, is the graph node

The graph must not assume one repository file equals one indivisible decision.

Frozen rule:

```text
preferred node
= existing stable decision / plan / contract / policy / section identity

fallback node
= exact path + stable heading/marker + bounded decision summary
```

Whole-document nodes are allowed only when the source artifact really is superseded as one semantic unit.

Mixed or partially superseded documents must use bounded section/decision nodes.

Canonical example:

```text
SIMCORE_RELEASE_SYSTEM_V2_PLAN.md

historical architecture/rationale body
= preserved

old current roadmap / immediate-action decision
= superseded by later current operational authority
```

Therefore:

```text
successor edge against old current-action scope
!= full-document invalidation
```

This is the most important v1 anti-overreach rule.

---

## 4. Relationship to SYS-05 lifecycle roles

SYS-05 answers:

```text
document / section
→ LIVING_CURRENT / HISTORICAL_PLAN / POINT_IN_TIME_EVIDENCE / ...
```

SYS-02 answers:

```text
bounded decision A
→ explicitly changed/replaced by bounded decision B
```

A lifecycle transition may be evidence that a supersession review is needed, but it does not automatically create an edge.

Examples:

```text
HISTORICAL_PLAN
!= automatically superseded in every semantic dimension

FROZEN_DESIGN_CONTRACT
!= automatically current operational instruction

LIVING_CURRENT
!= automatically successor to every older document it mentions
```

SYS-02 may consume SYS-05 role metadata for interpretation and downstream safety, but edge creation remains human-reviewed and source-backed.

SYS-05's shallow `superseded_by` navigation field may point to a reviewed SYS-02 edge when materialized later; SYS-05 must not become a second graph authority.

---

## 5. Relationship to SYS-04 status vocabulary

Status words do not create supersession.

Frozen rule:

```text
old Status = PLANNED
new Status = ACTIVE
!= proof of supersession by itself
```

The later source must actually state or establish a replacement/revision relationship for the same semantic scope.

SYS-04 may later lint SYS-02's structured edge-state/relation fields when registered, but it does not infer edges.

---

## 6. v1 artifact form

The useful v1 application is one curated living repository document, conceptually:

```text
docs/SIMCORE_DECISION_SUPERSESSION_GRAPH.md
```

Preferred human form:
- one compact node reference section when needed;
- one reviewed edge table;
- optional short unresolved-review section.

No graph database, parser, crawler, GitHub API reader, semantic embedding system, CI rule, automatic edge discovery, or repository writer is required for v1.

This establishes:

```text
APPLY CLASS = NR_DOC_ONLY
```

A future read-only validator/viewer may be proposed separately if manual integrity cost later becomes material.

---

## 7. Edge direction

Canonical direction is always:

```text
PREDECESSOR
→ SUCCESSOR / RETIREMENT DECISION
```

Meaning:

> the target decision is later authority that changes the current-instruction effect of the source decision for the recorded scope.

Do not reverse direction based on wording such as `supersedes` versus `superseded by`.

Every materialized edge must expose both predecessor and successor refs so humans do not have to infer direction from prose.

---

## 8. Frozen relation vocabulary

Exactly four v1 supersession relations:

```text
SUPERSEDES_FULL
SUPERSEDES_SCOPE
AMENDS_SCOPE
RETIRES_AS_CURRENT
```

### `SUPERSEDES_FULL`

The successor replaces the predecessor decision for the full semantic scope represented by that predecessor node.

Use only when the node itself is already bounded tightly enough that full replacement is defensible.

It does not mean the entire containing file is obsolete unless the node is a whole-document decision by design.

### `SUPERSEDES_SCOPE`

The successor replaces only an explicitly named subset of the predecessor decision.

Required:

```text
affectedScope != ALL
preservedScope must be stated when materially useful
```

This is the preferred relation for mixed historical/current artifacts.

### `AMENDS_SCOPE`

The successor changes a bounded part of the predecessor while the predecessor remains active as the base rule outside or underneath that amendment.

Examples:
- a later policy narrows one exception;
- a frozen implementation plan changes one exact sequencing rule but preserves the rest.

`AMENDS_SCOPE` is not synonymous with full replacement.

### `RETIRES_AS_CURRENT`

A later reviewed decision explicitly removes the predecessor from current-instruction use without introducing a semantically equivalent successor rule for that exact scope.

The retirement decision itself is the edge target.

Example shape:

```text
old temporary operating instruction
→ explicit retirement/close decision
→ no replacement behavior because the temporary instruction is no longer needed
```

Do not use `RETIRES_AS_CURRENT` merely because a document is old.

---

## 9. Deliberate non-relations

The following must not be encoded as SYS-02 edges:

```text
DEPENDS_ON
BLOCKED_BY
VERIFIES
IMPLEMENTS
DEPLOYS
REFERENCES
CITES
PROVES
OBSERVED_AFTER
SAME_TOPIC_AS
NEWER_THAN
```

Ownership:

```text
gate/work dependency
→ SYS-03

repository transaction lineage
→ SYS-35

evidence → decision trace
→ SYS-06

cross-reference integrity
→ SYS-07

implementation conformance / design fidelity
→ SYS-42 / SYS-11
```

SYS-02 is deliberately narrow: **decision replacement/revision lineage only**.

---

## 10. Edge schema

Each v1 edge contains exactly these fields:

```text
Edge ID
Predecessor ref
Successor / retirement ref
Relation
Affected scope
Preserved scope
Basis / authority refs
Effective condition / point
Edge state
Notes
```

### 10.1 Edge ID

Stable graph-local identifier:

```text
SUP-001
SUP-002
```

It is navigation identity only.
It must not become a work-item, release, evidence, or decision numbering authority.

### 10.2 Predecessor ref

Preferred order:

```text
existing stable decision ID
or
exact path#stable-heading/marker
```

If neither exists, use:

```text
exact path + bounded quoted-free semantic label
```

Do not store long copied prose.

### 10.3 Successor / retirement ref

Same identity rules as predecessor.

A commit by itself is insufficient unless the semantic decision is unambiguously represented by that commit and no better durable authority exists.

### 10.4 Affected scope

One bounded semantic description of exactly what changes.

Good:

```text
immediate RS2 start sequencing after v0.64.2 live close
current operational authority for release-system status
pre-M2-4 genuine-edit close requirement
```

Bad:

```text
everything
old stuff
release system
M2
```

### 10.5 Preserved scope

Use:

```text
NONE
```

only for a truly full bounded-node replacement.

For scoped supersession/amendment, name what materially remains valid, e.g.:

```text
base architecture rationale and no-runtime-change principles remain historical design context
```

This field exists specifically to prevent false whole-document invalidation.

### 10.6 Basis / authority refs

One or more bounded sources that explicitly support the relation.

Acceptable evidence:
- successor document explicitly says predecessor decision is superseded/replaced/retired;
- predecessor is explicitly relabeled historical and names current replacement authority;
- a close/promotion decision explicitly changes the same bounded instruction;
- current authority contains a reviewed replacement statement with clear predecessor scope.

Not sufficient alone:

```text
newer timestamp
higher version
same topic
new file naming
status-token difference
```

### 10.7 Effective condition / point

One of:

```text
IMMEDIATE_ON_DECISION
ON_NAMED_GATE_CLOSE
ON_NAMED_RELEASE_PUBLICATION
ON_NAMED_IMPLEMENTATION_CLOSE
OTHER_EXPLICIT_CONDITION:<id/ref>
```

If the edge is conditional and the condition has not happened, it is not active current supersession yet.

SYS-02 records the condition; SYS-03/current gate/release authority determines whether it is actually satisfied.

### 10.8 Edge state

Exactly four v1 states:

```text
EDGE_ACTIVE
EDGE_CONDITIONAL
EDGE_HISTORICAL
EDGE_UNRESOLVED
```

`EDGE_ACTIVE`
= the reviewed supersession effect currently applies.

`EDGE_CONDITIONAL`
= the relation is frozen/approved but its explicit effective condition has not yet been established as satisfied.

`EDGE_HISTORICAL`
= the edge itself is preserved lineage from an older current period; later edges may now govern the current successor chain.

`EDGE_UNRESOLVED`
= the relationship or scope cannot be stated without guessing.

Important:

```text
EDGE_HISTORICAL
!= wrong edge
```

It means the edge is real history but is no longer the terminal/current edge in its chain.

---

## 11. No implicit transitive supersession

Suppose:

```text
A → B
B → C
```

SYS-02 may display a navigable chain:

```text
A → B → C
```

but must not silently materialize:

```text
A → C
```

as an equivalent semantic edge.

Reason:
- B may have amended only part of A;
- C may supersede a different subset of B;
- preserved scopes can differ;
- effective conditions can differ.

Frozen rule:

```text
transitive reachability
= navigation aid only
!= new reviewed supersession claim
```

A direct A→C edge is added only if a source/review explicitly supports it.

---

## 12. Branching and merging decisions

Supersession lineage is not always a simple chain.

Allowed:

```text
one predecessor scope
→ split into multiple successor scopes
```

Example conceptual form:

```text
old broad policy
→ successor A owns release publication scope
→ successor B owns operator delegation scope
```

Each edge must have disjoint or clearly explained affected scopes.

Also allowed:

```text
multiple predecessor decisions
→ one consolidation decision
```

but each predecessor receives its own reviewed edge.

Do not create a many-to-many free-form row that hides which scope was replaced.

---

## 13. Current-authority behavior

SYS-02 never selects current truth by itself.

Canonical rule:

```text
SYS-01 / natural living authority
= tells us where current answer is owned

SYS-02
= explains predecessor/successor lineage that led there
```

If the graph says a predecessor is superseded but the current authority conflicts, report/review the conflict through normal documentation/authority workflow.

Do not make the graph "win" merely because it looks cleaner.

If a required current relation cannot be resolved:

```text
EDGE_UNRESOLVED
→ downstream consumers fail closed for that lineage question
```

---

## 14. Current SimCore examples validating the design

These are design examples only; they are not a materialized graph.

### 14.1 Release System v2 base-plan current-action scope

Observed repository relationship:

```text
historical base plan
= still valuable architecture/rationale

old v0.64.2 current roadmap decision
= explicitly superseded

current roadmap authority
= CURRENT_DEVELOPMENT.md

current R2.1 operational policy/status
= later dedicated R2.1 policy/evidence authorities
```

Correct graph treatment:

```text
old base-plan current-action node
→ SUPERSEDES_SCOPE / RETIRES_AS_CURRENT as supported by exact successor statement
→ later current operational decision

preserved scope
→ base design rationale / architecture principles remain historical context
```

Incorrect:

```text
entire SIMCORE_RELEASE_SYSTEM_V2_PLAN.md = invalid
```

### 14.2 Canonical Task Card replacement

SYS-46 already defines:

```text
material task reframing
→ old card TASK_CARD_SUPERSEDED
→ new/split card required
```

A later durable application may optionally register the explicit old-card → new-card replacement as a SYS-02 edge only when cross-session decision lineage value justifies it.

Do not register every ephemeral task-card amendment as graph history.

### 14.3 Historical release evidence

A v0.64.x live evidence document that reports an old gate/result is normally point-in-time evidence, not a decision predecessor.

No SYS-02 edge is needed merely because a newer release exists.

This prevents the graph from degenerating into release chronology.

---

## 15. Registration threshold

SYS-02 is curated, not exhaustive.

Register an edge when at least one is true:

```text
1. predecessor still looks current enough to mislead later work
2. only part of a durable design/plan was superseded and preserved scope matters
3. replacement changes authority ownership/navigation materially
4. later snapshot/cross-reference tooling needs the edge to avoid false current-state selection
5. repeated work has already needed humans to rediscover the same replacement relation
```

Do not register:

```text
every commit
all version succession
ordinary implementation evolution with no decision replacement
trivial typo corrections
all closed tasks
all evidence updates
```

This keeps the graph high-signal.

---

## 16. Conflict and integrity rules

A materialized graph should detect/review these conditions manually in v1:

### A. self edge

```text
A → A
→ forbidden
```

### B. unsupported active edge

```text
EDGE_ACTIVE
+ no source authority supporting replacement
→ EDGE_UNRESOLVED / repair registry metadata
```

### C. active full-supersession cycle

```text
A SUPERSEDES_FULL B
B SUPERSEDES_FULL A
→ impossible without unresolved scope/identity error
→ block the affected lineage review
```

### D. overlapping scoped successors

Two active successors may overlap only when the source authorities explain priority/composition.

Otherwise:

```text
overlap unresolved
→ EDGE_UNRESOLVED
```

### E. historical role mismatch

A predecessor may remain a valid historical/frozen artifact even after current instruction is superseded.

Do not delete or rewrite it merely to make the graph simple.

---

## 17. Downstream consumption

### SYS-12 Current-State Snapshot Page

May use reviewed active edges to avoid projecting explicitly superseded predecessor instructions as current.

However:

```text
SYS-02 edge
!= permission to invent a current value
```

SYS-12 still obtains current facts from SYS-01/natural current authorities.

### SYS-07 Cross-Reference Integrity Auditor

May distinguish:

```text
reference to historical predecessor for context
= valid when context-labelled

reference to superseded predecessor as current instruction
= potential finding
```

### SYS-06 Evidence-to-Decision Trace Map

May attach evidence to the exact decision node that consumed it, including historical predecessor decisions.

SYS-06 must not use evidence chronology to infer supersession edges.

### SYS-10 Stale Next-Action Scanner

May later consume explicit edge metadata only if separately integrated.
SYS-02 does not replace stale-NEXT detection.

---

## 18. Update discipline

Review the graph when a bounded task explicitly:

```text
replaces a current instruction
retires a temporary policy/plan
amends an existing durable decision
splits one authority scope into successor authorities
consolidates multiple prior decisions
marks an old plan historical while naming a replacement authority
```

Close-step order:

```text
owning successor/retirement decision lands first
→ verify source wording and authority
→ add/update SYS-02 edge
→ update SYS-05 lifecycle metadata if materially affected
→ review SYS-01/current-state navigation if authority ownership changed
→ recompute living-doc consistency / NEXT if triggered
```

Never write the edge first and then treat it as permission to change the source decision.

---

## 19. Hard boundaries

SYS-02 must never become:

```text
current-state database
roadmap
priority engine
scheduler
gate dependency graph
document lifecycle classifier
status linter
Git commit graph replacement
PR/branch relationship graph
Evidence Index
evidence-to-decision proof system
automatic semantic diff
automatic supersession inference
automatic archive/deletion system
repository writer
release authority
runtime/plugin feature
```

It records reviewed replacement/revision lineage only.

---

## 20. Verification plan for later NR_DOC_ONLY application

When `SIMCORE_DECISION_SUPERSESSION_GRAPH.md` is materialized, verify at least:

```text
1. every predecessor/successor exact path or stable ID resolves
2. no edge is created from timestamp/newest-file/version arithmetic alone
3. partial replacement uses decision/section scope rather than falsely invalidating a whole mixed document
4. relation token is one of the four frozen v1 relation values
5. affected scope is bounded and non-empty
6. scoped supersession/amendment records materially preserved scope
7. conditional edges name a real explicit condition
8. no active self edge exists
9. no unresolved active full-supersession cycle is accepted as clean
10. graph does not contain generic DEPENDS_ON / VERIFIES / IMPLEMENTS / REFERENCES edges
11. current-state answers still come from SYS-01/natural authorities, not graph rows
12. historical evidence/version succession is not auto-registered as decision supersession
13. no runtime/plugin/release/CI/repository-writer behavior changes
```

No real long-chat validation is required solely for SYS-02.

---

## 21. Future automation boundary

If the curated graph later becomes large enough to justify executable support, a separate read-only tool may validate only deterministic graph integrity such as:

```text
path/anchor existence
known relation tokens
self edges
explicit full-supersession cycles
required field presence
```

It must not infer semantic supersession from prose, timestamps, commits, filenames, embeddings, or LLM judgment.

Any such tool is outside SYS-02 v1 and requires a separate design/apply transaction.

---

## 22. Unified classification freeze verdict

Source/design inspection confirms:

```text
SIZE          = SMALL
IMPORTANCE    = 4
DIFFICULTY    = 2
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- the core value is reviewed semantic decision lineage, which must not be inferred automatically;
- one curated graph document is sufficient for v1;
- no executable parser/validator is necessary to obtain the primary value;
- no CI/release/repository-writer/runtime authority changes are required.

---

## 23. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
APPLICATION = NOT STARTED
```

Per Design Sweep First, stop SYS-02 here.

Materialization of `docs/SIMCORE_DECISION_SUPERSESSION_GRAPH.md` is a separate NR application transaction after the active system-idea design sweep closes or priority is explicitly changed.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
