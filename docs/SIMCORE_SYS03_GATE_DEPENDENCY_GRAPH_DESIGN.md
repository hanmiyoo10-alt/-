# SYS-03 — Gate Dependency Graph — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_EXECUTABLE · READ-ONLY QUERY MODEL · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-03
Idea          = Gate Dependency Graph
Size          = MEDIUM
Importance    = 5 / VERY HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_EXECUTABLE
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_SYSTEM_IDEA_CANDIDATE_INVENTORY_2026-08-26.md`
- `docs/SIMCORE_REALTIME_CLOSE_STEP_SURFACES_DESIGN_2026-08-26.md`
- `docs/SIMCORE_SYS48_GATE_BLOCKED_REASON_SURFACE_DESIGN.md`
- `docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md`

---

## 1. Problem

SimCore already records gates accurately in queue/inventory authorities:

```text
POST_M2_3
POST_M2_4
EVIDENCE
EXTERNAL
M2 implementation slice
dependency: R2.1 genuine release proof
FUTURE / POST_M2
```

SYS-48 makes an individual gated item understandable to a human, but RT-11 has a different operational question:

```text
An authoritative dependency just closed.
→ Which gated items must now be re-reviewed?
```

Today that answer requires manually scanning several living inventories and remembering which items share the same dependency. The risk is omission, not merely stale prose.

SYS-03 defines a curated, machine-readable **direct dependency graph** plus a read-only query surface for reverse lookup.

It does not determine whether a gate has closed. It only answers which registered items declared dependence on a given authoritative review event.

---

## 2. Core invariant

```text
reviewed authoritative gate declarations
→ curated direct dependency edges
→ deterministic forward/reverse lookup

SYS-03
!= gate authority
!= gate-state checker
!= automatic unlocker
!= priority engine
!= scheduler
!= transitive inference engine
```

The graph may answer:

```text
M2_3_PHYSICAL_CLOSE
→ M-08
→ M-12
→ M-15
→ S-05
→ M-01
→ M-02
→ M-03
→ M-05
→ SYS-26
→ SYS-29
→ SYS-40
→ SYS-41
→ SYS-43
→ SYS-44
→ SYS-45
```

only where each direct edge is explicitly supported by a current authority.

It may not conclude:

```text
M2-3 is closed
therefore every item above is OPEN
therefore item X is NEXT
therefore implementation is authorized
```

Those conclusions remain owned by checkpoint/evidence/release authorities plus RT-02/RT-11 and the normal selection policy.

---

## 3. Constitutional boundary with SYS-48

```text
SYS-48 Gate-Blocked Reason Surface
= item-centric explanation
= "Why is this item blocked and when should I review it again?"

SYS-03 Gate Dependency Graph
= dependency-centric navigation
= "This authoritative event changed; which registered items cite it as a direct review dependency?"
```

SYS-48 may consume one direct relationship from SYS-03 after both are applied, but SYS-48 remains the human explanatory surface.

SYS-03 must not absorb SYS-48's prose reason, premature-action guard, or current blocked-state presentation.

---

## 4. Constitutional boundary with RT-11

RT-11 remains the procedural owner of gate-unlock propagation.

```text
RT-11
1. an authoritative dependency-close fact exists
2. enumerate affected gated ideas
3. re-check each item's current gate authority
4. move only legitimately opened items into a new incremental sweep
5. never auto-implement
```

SYS-03 only improves step 2:

```text
authoritative event ID
→ deterministic candidate dependent set
```

RT-11 must still re-check each returned item against its current authority because graph edges can become stale or an item may have another operative gate.

Therefore:

```text
GRAPH MATCH
!= GATE OPEN
```

---

## 5. v1 implementation form

The useful v1 implementation is:

```text
products/simcore/tooling/gate-dependency-graph-v1.json
products/simcore/tooling/gate-dependency-query.mjs
products/simcore/tooling/gate-dependency-query.test.mjs
```

Optional human-readable generated/printed output may be produced by the query tool, but no generated Markdown file is required for v1.

No plugin/runtime source, permanent fixture registry, release workflow, CI classifier, GitHub Action, scheduler, or repository writer is changed.

This makes the frozen apply class:

```text
NR_EXECUTABLE
```

rather than `NR_DOC_ONLY`.

---

## 6. Graph model

v1 is a **direct bipartite review-dependency graph**.

Node classes:

```text
REVIEW_EVENT
WORK_ITEM
```

Allowed direct edge:

```text
REVIEW_EVENT --REVIEW_AFTER--> WORK_ITEM
```

No work-item-to-work-item edge is allowed in v1.
No event-to-event edge is allowed in v1.
No inferred/transitive edge is stored or computed.

This deliberately avoids turning architecture/roadmap sequencing into a general-purpose dependency solver.

---

## 7. REVIEW_EVENT schema

Each event entry contains exactly:

```text
id
label
event_kind
authority_ref
authority_locator
raw_gate_tokens
notes
```

### 7.1 Event ID

Stable upper-snake identifier representing a **review trigger**, not a truth claim.

Examples:

```text
M2_3_PHYSICAL_CLOSE
M2_4_PHYSICAL_CLOSE
R2_1_GENUINE_RELEASE_PROOF
M2_IMPLEMENTATION_SLICE_READY
POST_M2_PHASE_AUTHORIZED
```

For item-specific unresolved evidence/external requirements, use bounded IDs rather than pretending they are equivalent:

```text
M04_REQUIRED_EVIDENCE_SATISFIED
S06_REQUIRED_EVIDENCE_SATISFIED
M09_REQUIRED_EXTERNAL_RECEIPT_AVAILABLE
SYS39_REQUIRED_EVIDENCE_SATISFIED
```

An ID means:

```text
"if this event is authoritatively established, re-review these edges"
```

not:

```text
"this event currently happened"
```

### 7.2 Event kind

Allowed v1 values:

```text
CHECKPOINT_CLOSE
RELEASE_PROOF
EVIDENCE_SATISFIED
EXTERNAL_RECEIPT
IMPLEMENTATION_SLICE
PHASE_AUTHORIZATION
EXPLICIT_DEPENDENCY
```

This vocabulary is graph metadata only and does not replace canonical gate tokens.

### 7.3 Authority reference / locator

Every event must point to the source family and precise repository location that can establish the event.

Examples:
- M2 checkpoint close authority;
- R2.1 genuine-release proof authority;
- current NR/R queue + item-specific evidence contract;
- explicit external receipt authority.

If no authoritative locator can be named without guessing, the event/edge must not be registered as resolved.

### 7.4 Raw gate tokens

Preserve the current canonical gate spelling(s) used by the owning inventories, e.g.:

```text
["POST_M2_3"]
["dependency: R2.1 genuine release proof"]
["EVIDENCE"]
["FUTURE", "POST_M2"]
```

These are provenance/display data, not the event ID itself.

---

## 8. WORK_ITEM schema

Each work-item node contains:

```text
id
label
family
runtime_class
current_inventory_ref
current_inventory_locator
```

Allowed family examples:

```text
ORIGINAL_NR
ORIGINAL_R
SYSTEM_IDEA
```

The graph does not store importance/difficulty as decision inputs. Those belong to the idea classification/selection authorities and are evaluated after legitimate gate review.

Runtime Class is navigation metadata only and must match the current authoritative classification.

---

## 9. Edge schema

Each direct edge contains exactly:

```text
event_id
item_id
relation
authority_ref
authority_locator
raw_gate_token
review_semantics
```

Frozen relation vocabulary:

```text
REVIEW_AFTER
```

Only one relation exists in v1.

`review_semantics` is also fixed:

```text
RE_REVIEW_CURRENT_GATE
```

This prevents the graph from encoding stronger semantics such as:

```text
UNLOCKS
ENABLES_IMPLEMENTATION
BECOMES_NEXT
REQUIRES_TRANSITIVELY
```

Those words are deliberately forbidden because they overclaim what the graph establishes.

---

## 10. Current authoritative direct-edge examples

These examples validate the graph design. Application must re-read current authorities rather than blindly copying this design-time snapshot.

### M2-3 physical close

Current original queues explicitly place these behind `POST_M2_3`:

```text
M-08 Snapshot Schema Inventory Generator
M-12 State Writer Static Audit
M-15 Fixture Coverage Matrix by Ownership
S-05 Reconcile Differential Receipt
M-01 Turn Transaction / Phase Receipt
M-02 Ownership-aware Diagnostic Attribution
M-03 Genuine Edit Rebuild Performance Study
M-05 Phase Performance Budget
```

Current system inventory explicitly places these behind `POST_M2_3`:

```text
SYS-26 Coverage Promotion Readiness Scanner
SYS-29 Contract-to-Fixture Gap View
SYS-40 Dead Module / Export Scanner
SYS-41 Public Test-Seam Inventory
SYS-43 M2 Checkpoint Close Pack
SYS-44 Ownership Migration Ledger
SYS-45 State-Surface Change Receipt
```

All of those may therefore have a direct:

```text
M2_3_PHYSICAL_CLOSE --REVIEW_AFTER--> item
```

edge, provided application-time authority still says the same thing.

### M2-4 physical close

Current original queues support direct re-review edges for:

```text
M-07 Commit / Observation Separation Guard
M-06 State Invariant Snapshot
```

### R2.1 genuine release proof

Current original queue supports:

```text
M-14 Release Evidence Packet
```

Current system inventory supports:

```text
SYS-27 Cross-Version Regression Receipt
SYS-30 Release-to-Docs Convergence Receipt
SYS-32 Release Candidate Provenance Viewer
SYS-34 Post-Release Convergence Checklist Generator
```

### Item-specific EVIDENCE / EXTERNAL gates

Do not collapse distinct requirements into one global `EVIDENCE` or `EXTERNAL` event.

Examples:

```text
M04_REQUIRED_EVIDENCE_SATISFIED → M-04
S06_REQUIRED_EVIDENCE_SATISFIED → S-06
SYS39_REQUIRED_EVIDENCE_SATISFIED → SYS-39
M09_REQUIRED_EXTERNAL_RECEIPT_AVAILABLE → M-09
```

The event remains item-specific until an explicit shared evidence authority proves a shared dependency.

### Future / phase gates

Composite tokens such as:

```text
L-01 FUTURE / POST_M2
M-17 FUTURE / TD-09
L-02 EVIDENCE / FUTURE
```

must not be simplified into a single direct event unless the owning authority defines one sufficient re-review event.

If the relationship is not cleanly modelable without boolean inference, omit the resolved edge and report it as unresolved coverage rather than guessing.

---

## 11. Query contract

The read-only query tool supports exactly these v1 operations.

### `--event <EVENT_ID>`

Return direct registered dependent items for that event.

Example conceptual output:

```text
EVENT M2_3_PHYSICAL_CLOSE
DEPENDENTS 15
M-08
M-12
...
SYS-45
```

### `--item <ITEM_ID>`

Return direct registered review-event edges for that item.

### `--list-events`

Return registered event IDs and authority references.

### `--check`

Validate graph structure and referential integrity only.

It may check:

```text
unique event IDs
unique item IDs
known relation vocabulary
edge endpoints resolve
no duplicate direct edge
required authority fields non-empty
raw gate token present
current referenced file/path exists when locally resolvable
```

It must not check whether an event has actually happened.

---

## 12. Tool result vocabulary

Query result states:

```text
GRAPH_QUERY_OK
GRAPH_QUERY_NOT_FOUND
GRAPH_QUERY_BLOCKED
```

Graph health states for `--check`:

```text
GATE_GRAPH_CLEAN
GATE_GRAPH_DRIFT
GATE_GRAPH_BLOCKED
```

### `GATE_GRAPH_DRIFT`

Use when a registered edge/source is structurally stale, for example:
- item no longer exists in the declared living inventory;
- referenced gate token changed;
- edge points to a superseded authority;
- duplicate or invalid endpoint exists.

### `GATE_GRAPH_BLOCKED`

Use when current authority is ambiguous and the graph cannot be repaired without semantic judgment.

Neither state is a runtime anomaly classification.

---

## 13. No automatic gate-state evaluation

The tool must never read a checkpoint/release/evidence document and decide:

```text
EVENT = SATISFIED
```

No command such as these is allowed in v1:

```text
--open-ready
--unlock
--promote
--apply
--next
```

The operator/assistant first obtains an authoritative close fact through the normal workflow. Only then may the event ID be used for reverse lookup.

Canonical use:

```text
authoritative M2-3 close established elsewhere
→ query --event M2_3_PHYSICAL_CLOSE
→ candidate dependent set returned
→ RT-11 re-reads each current item authority
→ RT-02 recalculates legitimate open queue
→ unified priority selects NEXT
```

---

## 14. No transitive or boolean inference

v1 deliberately does not compute:

```text
transitive closure
AND / OR dependency formulas
critical path
cycle detection over item-to-item dependencies
implicit dependency inheritance
phase sequencing inferred from names
```

Reason:
- current SimCore gate authorities are mostly item → gate declarations, not a fully formal workflow language;
- manufacturing stronger graph semantics would create a second roadmap authority;
- direct reverse lookup solves the actual RT-11 omission problem without that risk.

If richer dependency semantics become necessary, that is a separate future design revision with explicit evidence.

---

## 15. Update / freshness discipline

Graph review is triggered when:

```text
an idea's canonical gate changes
a new gated item is added
a gated item freezes/implements/retires/supersedes
a checkpoint/release/evidence authority is replaced
SYS-48 resolves or changes a previously unresolved re-review event
RT-11 closes/reviews a dependency and current queue state changes
```

Update order:

```text
owning gate authority first
→ verify current gate fact
→ update SYS-03 curated graph
→ run graph --check
→ update SYS-48 explanatory projection if affected
→ RT-02 / RT-01 / RT-12 normal close
```

The graph never wins a conflict against the authority it references.

---

## 16. Relationship to SYS-01 / SYS-10 / SYS-51 / SYS-08

### SYS-01 Living Authority Map

```text
SYS-01
→ where the gate/checkpoint/evidence authority lives

SYS-03
→ reviewed direct event-to-item relationship referencing that authority
```

### SYS-10 Stale Next-Action Scanner

SYS-10 may identify that an advertised NEXT is still gated.
SYS-03 may show which review event is directly associated with the item.
Neither decides the replacement NEXT.

### SYS-51 Close-Step Trigger Matrix

SYS-51 activates RT-11 when a dependency changed.
SYS-03 supplies the candidate dependent set for that RT-11 review.

### SYS-08 Work-Item Close Receipt

A close receipt may record:

```text
RT-11 evaluated
SYS-03 event query used
N candidate items returned
K legitimately reopened after authority re-check
```

but SYS-08 remains a point-in-time receipt, not graph authority.

---

## 17. Hard boundaries

SYS-03 must never become:

```text
GateManager
gate-state truth database
automatic gate opener
priority engine
NEXT selector
work scheduler
roadmap replacement
background dependency watcher
automatic repo writer
automatic design/apply launcher
release-proof classifier
evidence classifier
provider/backend inference system
transitive dependency solver
runtime/plugin feature
```

---

## 18. Verification plan for later implementation

Minimum NR_EXECUTABLE verification:

```text
1. JSON parses and schema-required fields exist
2. event/item IDs are unique
3. every edge endpoint resolves
4. only REVIEW_AFTER relation exists
5. no duplicate edges
6. authority refs/locators are present
7. direct current gate examples match current living inventories
8. item-specific EVIDENCE/EXTERNAL requirements are not collapsed without authority
9. composite/future ambiguous gates fail closed / remain unresolved
10. --event returns exact direct registered dependents
11. --item returns exact direct registered events
12. --check detects broken refs/invalid relations/duplicate edges
13. no command evaluates event satisfaction or mutates repository state
14. focused semantic test executes directly and is reported honestly
15. no plugin/runtime/release/CI/repository-writer behavior changes
```

Permanent CI integration is not part of SYS-03. If later desired, it is separate protected work.

---

## 19. Unified classification freeze verdict

Source/design inspection changes the provisional apply form from unassessed to executable:

```text
SIZE          = MEDIUM
IMPORTANCE    = 5
DIFFICULTY    = 3
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_EXECUTABLE
```

Why `NR_EXECUTABLE`:
- the primary value is reliable reverse lookup over a curated direct graph;
- machine-readable referential validation materially reduces omission/drift risk;
- a small read-only query tool is useful without changing runtime/CI/release/repo-writer authority.

---

## 20. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION = NOT STARTED
```

Per Design Sweep First, stop SYS-03 here. Graph/tool implementation is a separate bounded NR transaction after the active system-idea design sweep closes or priority is explicitly changed.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
