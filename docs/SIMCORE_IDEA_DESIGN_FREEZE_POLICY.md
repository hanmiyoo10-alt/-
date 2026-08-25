# SimCore Idea Design Freeze Policy

Status: `CANONICAL OPERATIONAL POLICY · DESIGN-BEFORE-IMPLEMENTATION · SAFE_NON_RUNTIME TIER-HARVEST + R_PREP_NON_RUNTIME EXCEPTIONS · NO RUNTIME CHANGE`

Purpose: define the mandatory completion boundary for SimCore idea work during the current pre-stabilization planning period.

This policy applies to every substantive SimCore idea selected for exploration, regardless of whether the idea concerns product UX, diagnostics, observability, performance, correctness, repository tooling, evidence infrastructure, release operations, or future experiments.

Detailed exception authority:
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`
- `docs/SIMCORE_RUNTIME_IDEA_PREP_NON_RUNTIME_POLICY.md`

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
→ STOP THAT IDEA'S DESIGN WORK
```

The idea phase is complete only when the design is detailed enough that a later implementation work item can begin without reopening broad ideation.

## 2. Mandatory stop boundary

After a selected idea reaches completed design:

```text
DESIGN COMPLETE
→ RECORD IN main
→ DESIGN FROZEN
→ stop design expansion
```

Default disposition remains:

```text
DESIGN FROZEN
→ PARKED FOR STABILIZATION
→ NO RUNTIME IMPLEMENTATION
```

Do not continue directly into plugin-code changes, release preparation, or `release-simcore` deployment merely because the design is ready.

### 2A. Narrow SAFE_NON_RUNTIME tier-harvest exception

A frozen NON_RUNTIME idea may be implemented before the general stabilization phase only under the separate canonical policy:

```text
docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md
```

The exception activates only after the **currently designable pool for that NR design-difficulty tier** is fully frozen and the individual idea passes the strict `SAFE_NON_RUNTIME` gate.

Canonical exception:

```text
currently designable NR Difficulty N pool fully frozen
→ classify each frozen item
→ SAFE_NON_RUNTIME_READY only
→ subsequent bounded implementation work item
→ static verification
→ main evidence/status sync
→ no plugin version bump
→ no release-simcore
```

This exception does not authorize runtime/product implementation and does not start the general stabilization phase.

### 2B. R_PREP_NON_RUNTIME repository-memory exception

A frozen RUNTIME idea may have a separable ancillary repository-memory slice prepared before stabilization under:

```text
docs/SIMCORE_RUNTIME_IDEA_PREP_NON_RUNTIME_POLICY.md
```

Canonical exception:

```text
parent R idea DESIGN FROZEN
→ runtime implementation remains PARKED
→ identify useful separable repo-memory preparation
→ strict R_PREP_NON_RUNTIME review
→ later separate bounded prep work item
→ static/path verification
→ main durable-memory sync
→ parent R idea still PARKED
```

This exception is limited to non-executable repository-memory artifacts such as evidence-review templates, operator checklists, bounded manual registries, field dictionaries, static conformance checklists, and cross-reference maps.

It does not authorize:

```text
plugin source
DOM/UI behavior
runtime diagnostic behavior
Host access
state/schema changes
runtime-consumed config/schema
Node/Python tooling
CI/workflow changes
release automation
version bump
release-simcore
```

If a proposed prep slice becomes executable/reusable tooling, classify it separately as NR rather than smuggling it through the R lane.

## 3. Implementation timing

Current policy now has three implementation classes:

```text
NOW
= IDEA / DESIGN COMPLETION PHASE
+ completed-tier SAFE_NON_RUNTIME harvest
+ frozen-R R_PREP_NON_RUNTIME repository-memory preparation

LATER
= GENERAL STABILIZATION + RUNTIME/VERSIONED IMPLEMENTATION PHASE
```

Runtime/versioned core implementations remain parked until the user explicitly starts stabilization/implementation work.

When the general stabilization/implementation phase begins, frozen runtime ideas may be selected one at a time for implementation.

Each runtime implementation remains an independent bounded work item and follows the normal SimCore workflow:

```text
repo design/evidence authority
→ working branch implementation
→ static / CI verification
→ release-simcore deployment when runtime bytes change
→ real long-chat validation
→ main documentation / long-term-memory synchronization
```

A frozen design or completed R_PREP artifact does not itself authorize runtime implementation.

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
= DESIGN FROZEN and runtime/versioned core intentionally not implemented yet

SAFE_NON_RUNTIME_READY
= NON_RUNTIME design frozen + applicable NR difficulty tier closed + strict non-runtime gate passed

SAFE_NON_RUNTIME_IMPLEMENTED
= NON_RUNTIME idea implemented/applied under the tier-harvest policy and statically verified

R_PREP_NON_RUNTIME_READY
= RUNTIME design frozen + a separable repository-memory preparation passed the R_PREP gate

R_PREP_NON_RUNTIME_COMPLETE
= ancillary repository-memory preparation completed while parent runtime implementation remains parked

IMPLEMENTATION SELECTED
= later stabilization phase has explicitly selected a frozen runtime/versioned core design
```

Do not label a mere concept note `IMPLEMENTATION READY` unless the design-completion checklist has actually been satisfied.

## 6. One idea at a time

When exploring ideas serially:

```text
select idea A
→ finish and freeze design A
→ stop A design work
→ only then move to idea B
```

Do not leave several selected ideas half-designed while continuing horizontal exploration.

Candidate menus may contain many unselected ideas; the completion requirement activates when one is selected for exploration.

The implementation exceptions do not change this design rule. NR harvest and R_PREP work occur only after the parent design has frozen and as separate bounded work items.

## 7. No implementation leakage

During individual idea-design work, forbidden actions include:

```text
runtime source edits
plugin version bumps
working-branch feature implementation
release candidate creation
release-simcore publication
schema migration
new CI/release machinery
"small harmless" runtime code changes bundled into the design
```

Pre-stabilization implementation is limited to later, separately bounded:

```text
SAFE_NON_RUNTIME harvest after an NR tier closes
or
R_PREP_NON_RUNTIME repository-memory preparation after an R design freezes
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
= bounded problem + complete bounded design
```

Whether it parks, enters SAFE_NON_RUNTIME harvest, or gets a repo-memory-only R_PREP slice is decided only after design freeze under the relevant policy.

## 9. Repository memory rule

Every selected SimCore idea that is explored substantively must live in the repository.

Preferred pattern:

```text
candidate menu
→ dedicated design document for selected idea
→ DESIGN FROZEN
→ PARKED FOR STABILIZATION
   OR SAFE_NON_RUNTIME_READY after NR tier close
   OR R_PREP_NON_RUNTIME_READY for a separable repo-memory slice
```

Do not rely on chat memory as the only record of a completed idea design.

If an idea is a distinct topic, keep it in its own document rather than mixing it into an unrelated design artifact.

## 10. Current operating verdict

```text
SELECTED IDEA
= MUST REACH COMPLETE DESIGN

DESIGN COMPLETE
= FREEZE + STOP DESIGN EXPANSION

DEFAULT RUNTIME CORE
= PARK FOR STABILIZATION

NR EXCEPTION
= CURRENTLY DESIGNABLE NR DIFFICULTY TIER CLOSED
+ STRICT SAFE_NON_RUNTIME PASS
→ IMPLEMENT/APPLY IN SUBSEQUENT BOUNDED WORK ITEM
→ STATIC VERIFY
→ NO PLUGIN VERSION CHANGE
→ NO RELEASE-SIMCORE

R PREP EXCEPTION
= R DESIGN FROZEN
+ USEFUL SEPARABLE REPO-MEMORY ARTIFACT
+ STRICT R_PREP_NON_RUNTIME PASS
→ PREPARE IN SUBSEQUENT BOUNDED WORK ITEM
→ PARENT RUNTIME CORE REMAINS PARKED

RUNTIME / VERSIONED CORE IMPLEMENTATION NOW
= FORBIDDEN UNTIL GENERAL STABILIZATION/IMPLEMENTATION PHASE

FUTURE RUNTIME IMPLEMENTATION
= ONE FROZEN IDEA AT A TIME
```
