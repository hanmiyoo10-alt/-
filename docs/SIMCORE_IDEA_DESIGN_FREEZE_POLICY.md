# SimCore Idea Design Freeze Policy

Status: `CANONICAL OPERATIONAL POLICY · DESIGN-BEFORE-IMPLEMENTATION · NO RUNTIME CHANGE`

Purpose: define the mandatory completion boundary for SimCore idea work during the current pre-stabilization planning period.

This policy applies to every substantive SimCore idea selected for exploration, regardless of whether the idea concerns product UX, diagnostics, observability, performance, correctness, repository tooling, evidence infrastructure, release operations, or future experiments.

## 1. Core rule

A selected idea must never stop at brainstorming, a candidate list, or a loose concept note.

Canonical flow:

```text
idea selected
→ inspect current source/contracts/evidence relevant to the idea
→ define problem and non-goals
→ identify semantic/application/runtime owner boundaries
→ define inputs / outputs / state / persistence / Host access rules
→ define behavior and edge cases
→ define diagnostics/evidence requirements
→ define regression/test surface
→ define implementation sequencing and forbidden scope
→ resolve known open design questions
→ mark the design FROZEN / IMPLEMENTATION-READY
→ STOP
```

The idea phase is complete only when the design is detailed enough that a later implementation work item can begin without reopening broad ideation.

## 2. Mandatory stop boundary

After a selected idea reaches completed design:

```text
DESIGN COMPLETE
→ RECORD IN main
→ FROZEN / PARKED
→ NO IMPLEMENTATION
```

Do not continue directly into plugin-code changes, working-branch implementation, release preparation, or `release-simcore` deployment merely because the design is ready.

Implementation is intentionally deferred until the dedicated stabilization / implementation phase begins.

## 3. Implementation timing

Current policy:

```text
NOW
= IDEA / DESIGN COMPLETION PHASE

LATER
= STABILIZATION + IMPLEMENTATION PHASE
```

When the user explicitly starts the stabilization/implementation phase, frozen ideas may be selected one at a time for implementation.

Each implementation remains an independent bounded work item and follows the normal SimCore workflow:

```text
repo design/evidence authority
→ working branch implementation
→ static / CI verification
→ release-simcore deployment when runtime bytes change
→ real long-chat validation
→ main documentation / long-term-memory synchronization
```

A frozen design does not itself authorize implementation.

## 4. What counts as a completed design

A design is not complete merely because its UI or high-level behavior sounds clear.

Where applicable, the design artifact must settle:

```text
problem statement
user/operator value
scope
non-goals
current source/evidence constraints
owner / boundary
input facts
output/receipt/surface
state mutation permission
persistence permission
Host read/write permission
raw-body lifetime
failure/fail-open behavior
edge cases
interaction with existing diagnostics/contracts
regression obligations
live-validation obligations
implementation dependencies / milestone timing
forbidden expansion
retirement/revisit trigger if provisional
```

Fields that do not apply should be explicitly marked `N/A` rather than silently omitted when ambiguity could matter.

## 5. Design status vocabulary

Use the following statuses consistently:

```text
IDEA CANDIDATE
= listed but not selected for full design

DESIGN IN PROGRESS
= selected; design questions remain unresolved

DESIGN FROZEN
= complete enough for later bounded implementation

PARKED FOR STABILIZATION
= DESIGN FROZEN and intentionally not implemented yet

IMPLEMENTATION SELECTED
= later stabilization phase has explicitly selected this frozen design
```

Do not label a mere concept note `IMPLEMENTATION READY` unless the design-completion checklist has actually been satisfied.

## 6. One idea at a time

When exploring ideas serially:

```text
select idea A
→ finish and freeze design A
→ stop A
→ only then move to idea B
```

Do not leave several selected ideas half-designed while continuing horizontal exploration.

Candidate menus may contain many unselected ideas; the completion requirement activates when one is selected for exploration.

## 7. No implementation leakage

During idea/design work, forbidden actions include:

```text
runtime source edits
plugin version bumps
working-branch feature implementation
release candidate creation
release-simcore publication
schema migration
new CI/release machinery
"small harmless" code changes bundled into the design
```

If source inspection reveals a real anomaly during design, preserve it immediately as `WATCH / DEFER / FIX / BLOCKER`, but do not silently repair it inside the idea work item.

## 8. Relationship to broad architecture closure

Broad architecture ideation remains closed.

This policy permits narrow vertical idea design without reopening generic architecture frameworks.

A small idea may still require a complete design. `SMALL` refers to scope, not to design rigor.

Therefore:

```text
small idea
≠ incomplete design allowed

small idea
= bounded problem + complete bounded design + park
```

## 9. Repository memory rule

Every selected SimCore idea that is explored substantively must live in the repository.

Preferred pattern:

```text
candidate menu
→ dedicated design document for selected idea
→ DESIGN FROZEN / PARKED FOR STABILIZATION
```

Do not rely on chat memory as the only record of a completed idea design.

If an idea is a distinct topic, keep it in its own document rather than mixing it into an unrelated design artifact.

## 10. Current operating verdict

```text
SELECTED IDEA
= MUST REACH COMPLETE DESIGN

DESIGN COMPLETE
= FREEZE + PARK + STOP

IMPLEMENTATION NOW
= FORBIDDEN UNLESS USER EXPLICITLY STARTS STABILIZATION/IMPLEMENTATION PHASE

FUTURE IMPLEMENTATION
= ONE FROZEN IDEA AT A TIME
```
