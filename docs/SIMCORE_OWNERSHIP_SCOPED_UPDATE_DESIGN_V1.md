# SimCore Ownership-Scoped Update Design v1

Date: 2026-08-28
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · FIRST-USE PENDING`

## 1. Problem

The production SimCore runtime is distributed as a single installable JavaScript artifact. The physical artifact is intentionally monolithic for deployment, while its logic is already divided into explicit ownership modules such as Kernel, Store, Lifecycle, Time, Frame, Recurrence, Lineage, Handoff, Evidence, Community, Reaction, Structure, Representation, Output Compat, Bootstrap Migration, Recovery, Prompt, Session, and OPS.

Reading the complete runtime for every bounded change scales poorly as release history and module count grow. The defect is not the single-file deployment format by itself. The defect is treating the complete artifact as the default unit of developer understanding for every change.

This design changes the inspection strategy only.

```text
PHYSICAL DEPLOYMENT UNIT = whole plugin
DEFAULT READING UNIT     = authoritative ownership surface
VALIDATION UNIT          = whole applicable release contract
```

## 2. Objective

Make future SimCore updates start from behavior ownership rather than file boundaries, so that update-time context stays bounded without weakening release safety, runtime authority, parity, static checks, CI, or live validation.

The design must preserve these invariants:

```text
release-simcore remains runtime/deployment authority
main remains design/evidence/roadmap/admin authority
latest.js == install.js
feature changes are not mixed with repository/deployment-system changes
runtime ownership semantics are not changed by this design
full applicable static/CI validation remains mandatory
live anomalies are recorded as WATCH / DEFER / FIX / BLOCKER
```

## 3. Scope Model

Every runtime task begins by building an Ownership Scope Record before implementation.

Required fields:

```text
Requested behavior:
Observed evidence / trigger:
Primary owner(s):
Immediate dependency owner(s):
Cross-cutting invariants:
Target implementation region(s):
Target tests / diagnostics / evidence:
Initial excluded modules:
Escalation triggers:
```

The record belongs in the task design/evidence document. A separate worksheet file is optional.

## 4. Ownership Resolution Rule

Ownership is resolved from semantic responsibility, not physical proximity in the monolithic JavaScript file.

Resolution order:

```text
1. Identify the behavior that is intended to change.
2. Identify the module whose declared responsibility directly owns that behavior.
3. Identify only direct callers/callees needed to understand the contract boundary.
4. Identify tests, diagnostics, evidence, frozen surfaces, and release notes that constrain that behavior.
5. Stop expanding when the requested behavior is explainable under known ownership and invariants.
```

The closest function in the file is not automatically the owner. A helper may physically sit near a behavior while authority belongs to another module.

## 5. Initial Read Boundary

Default initial read scope is limited to:

```text
A. current version/header and directly relevant recent release-note blocks
B. the primary owner declaration/contract
C. the primary owner implementation region
D. immediate dependency owner declarations and only the required implementation paths
E. directly relevant tests/CI guards/diagnostics/evidence
F. explicitly referenced cross-module invariants
```

The following are excluded by default unless evidence requires them:

```text
unrelated module implementations
old release-note history unrelated to the defect/change
unrelated diagnostics
unrelated migration paths
unrelated UI surfaces
unrelated storage/state paths
unrelated broadcast/community/time/representation logic
```

Exclusion means "not read initially", not "assumed irrelevant forever".

## 6. Scope Escalation Rules

The read boundary MUST expand when any of the following occurs:

### 6.1 Ownership ambiguity

Two or more modules appear to claim the same semantic decision or the declared owner cannot fully explain the observed behavior.

Action:

```text
classification = BLOCKER until authority is resolved
expand = competing owners + their boundary contracts
```

### 6.2 Cross-cutting invariant

The target owner consumes or produces a value whose invariant is enforced elsewhere.

Examples include persistence schema, generation/reload safety, authoritative request/output binding, prompt serialization, output commit safety, or frozen compatibility surfaces.

Action:

```text
expand = invariant owner + enforcing tests/guards
```

### 6.3 Unexpected test/CI failure

A full validation guard fails outside the initial scope.

Action:

```text
record anomaly immediately
classify WATCH / DEFER / FIX / BLOCKER
expand only toward the failing contract and its owner
```

Do not respond to one unrelated failure by reading the whole runtime automatically.

### 6.4 Live contradiction

Real long-chat evidence contradicts the scoped mental model.

Action:

```text
live evidence outranks the scoped assumption
preserve evidence first
classify anomaly
expand toward the contradicted semantic boundary
```

### 6.5 State or orchestration crossing

Any change that touches one of the following starts with a wider initial scope because these are inherently cross-cutting:

```text
persistent schema/key changes
request/output orchestration
runtime generation/reload safety
bootstrap/migration
output compatibility/canonicalization
host chat/history mutation
provider/storage transport
release/deployment authority
```

These tasks remain ownership-scoped, but the initial dependency set is intentionally larger.

## 7. Validation Boundary

Reading may be narrow. Validation may not be narrowed merely because reading was narrow.

Required rule:

```text
READ SCOPE       = smallest evidence-sufficient ownership graph
IMPLEMENT SCOPE  = authorized bounded behavior only
VALIDATION SCOPE = full applicable release guards
LIVE SCOPE       = behavior-specific gate + known regression controls
```

At minimum, runtime releases continue to prove:

```text
latest.js and install.js are byte-identical
static syntax/integrity checks pass
applicable full CI passes
frozen surfaces remain intact unless explicitly authorized
release-simcore deployment points to the intended artifact
real long-chat validation closes the behavior-specific live gate
```

## 8. No Silent Scope Creep

Every expansion beyond the initial read boundary must be recorded with:

```text
Trigger:
New module/surface:
Reason it became relevant:
Classification:
Whether implementation scope changed:
```

A broader read does not automatically authorize a broader implementation.

If a newly discovered defect is outside the task boundary:

```text
WATCH  = suspicious, insufficient evidence
DEFER  = valid issue, separate bounded task
FIX    = evidence-backed and inside current authorization
BLOCKER = prevents safe continuation of the current task
```

## 9. Ownership Graph, Not Whole-File Mental Model

For each task, construct only the smallest graph needed to answer:

```text
Who decides this behavior?
Who supplies its inputs?
Who consumes its outputs?
Who enforces its invariants?
What proves the change is correct?
```

The graph may contain one owner for a very local repair or several owners for a cross-cutting change. Its size is determined by semantic evidence, not by an arbitrary module-count limit.

## 10. Release Notes Reading Rule

The long header ledger is not a general prerequisite for every update.

Read:

```text
current version block
release blocks that introduced or last changed the target behavior
release blocks referenced by current contracts/evidence
```

Do not read all historical release blocks unless the task is specifically historical, migration-oriented, or ownership provenance cannot otherwise be established.

## 11. Test and Evidence Discovery Rule

Tests and evidence are part of the ownership surface, not an afterthought.

Before implementation, locate:

```text
positive controls for the intended behavior
negative controls for prohibited behavior
known regressions attached to the owner
existing diagnostic fields that expose the decision
frozen equivalence/surface contracts if present
```

If no direct test/evidence exists, that absence is recorded in the task design rather than silently assuming coverage.

## 12. First-Use Protocol

The next authorized SimCore runtime update will be the first live application of this design.

Required sequence:

```text
1. record task design/evidence on main authority surface
2. create work branch
3. write Ownership Scope Record before runtime editing
4. inspect only the initial ownership graph
5. implement bounded change
6. record every scope expansion
7. run full applicable static/CI validation
8. deploy through release-simcore
9. perform real long-chat validation
10. record whether scoped reading missed any interaction
11. sync main current docs/long-term repository memory
```

First-use success criteria:

```text
primary owner was correctly identified before implementation
no relevant interaction was missed, OR any miss was caught by escalation/validation before unsafe release
scope expansions were evidence-driven and documented
no unrelated runtime module was edited without explicit authorization
full guards passed
latest.js == install.js
live gate closed with human evidence
```

## 13. Failure Criteria

The method is considered insufficient and must be revised if any of these occur:

```text
A. a relevant owner is repeatedly missed before implementation
B. full CI catches cross-module regressions that ownership discovery should reasonably have identified
C. live validation repeatedly reveals interactions absent from both initial scope and escalation rules
D. ownership declarations are too ambiguous to resolve behavior without whole-file reading
E. narrow reading causes repeated unsafe implementation assumptions
```

A first failure does not automatically invalidate the method. It is preserved and classified, then used to refine the ownership graph or escalation contract.

## 14. Non-Goals

This design does NOT authorize:

```text
splitting the deployable plugin into multiple runtime files
changing current module ownership
moving runtime authority away from release-simcore
moving design/evidence authority away from main
reducing static/CI coverage
skipping real long-chat validation
removing release history
changing release tooling/repository topology
claiming runtime performance or memory improvements
```

## 15. Acceptance

The design is frozen when the following are true:

```text
A. a deterministic initial read boundary exists
B. semantic ownership resolution is explicit
C. escalation triggers are explicit
D. read scope and validation scope are separated
E. scope creep requires evidence and recording
F. whole-file reading remains available as an escalation, not a default
G. runtime/deployment authority is unchanged
H. latest.js/install.js parity remains mandatory
I. first-use validation requirements are explicit
J. no runtime/release branch mutation is performed by this design transaction
```

All acceptance points are satisfied by this document. Runtime usefulness remains `FIRST-USE PENDING` until the next real SimCore update completes its full release and long-chat gate.
