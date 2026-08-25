# SimCore Idea Tier Non-Runtime Harvest Policy

Status: `CANONICAL OPERATIONAL POLICY · NR-LANE DESIGN-TIER HARVEST · NON-RUNTIME ONLY · NO PLUGIN VERSION CHANGE`

Purpose: allow immediately useful non-runtime idea implementations to be applied after the corresponding **NON_RUNTIME design-difficulty tier** closes, without breaking the existing design-first discipline or starting runtime stabilization early.

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_GUIDELINES.md`

---

## 1. Core rule

The current idea phase remains design-first.

After the NR/R queue split, harvest accounting is lane-local. A NON_RUNTIME item does not wait for RUNTIME ideas of the same difficulty to finish design.

Canonical flow:

```text
CURRENTLY DESIGNABLE NR Difficulty N pool
→ every open-gate NR item reaches DESIGN FROZEN
→ NR Difficulty N DESIGN TIER CLOSED
→ classify each frozen NR item for implementation impact
→ SAFE_NON_RUNTIME items only
→ immediate bounded implementation/application
→ static verification
→ main evidence/status synchronization
→ no plugin version bump
→ no release-simcore deployment
→ continue NR design queue
```

This is a narrow exception to the ordinary `DESIGN FROZEN → PARKED` rule.

It does not start the general stabilization/runtime implementation phase.

RUNTIME designs are tracked independently in the R queue and never block an NR harvest tier.

---

## 2. What counts as a closed NR difficulty tier

An NR difficulty tier closes when every NON_RUNTIME idea of that difficulty whose **design gate is currently open** has completed its full design.

Open for tier-close accounting:

```text
NOW
or a dependency gate that has already been satisfied
```

Excluded until their trigger later opens:

```text
POST_M2_3
POST_M2_4
EVIDENCE
EXTERNAL
FUTURE
implementation-bound gates
unmet dependency gates
```

RUNTIME ideas are also excluded from NR tier-close accounting because they belong to the independent R queue.

Therefore:

```text
NR Difficulty N close
!= all Difficulty N ideas globally frozen

NR Difficulty N close
= all currently designable NON_RUNTIME Difficulty N ideas frozen
```

When a previously gated NR item later becomes designable, it enters a new incremental NR tier-close cycle for its same difficulty.

---

## 3. SAFE_NON_RUNTIME eligibility

An idea may be harvested immediately only when **all** of the following are true:

```text
DESIGN FROZEN = YES
Runtime Class = NON_RUNTIME
plugin version change = NONE
plugins/simcore/latest.js change = NONE
plugins/simcore/install.js change = NONE
release-simcore change = NONE
runtime semantic behavior change = NONE
prompt-byte behavior change = NONE
Host runtime read/write behavior change = NONE
SnapshotStore/Core schema change = NONE
persistent runtime state change = NONE
release publication behavior change = NONE
release workflow authority change = NONE
repo writer/branch authority change = NONE
network/provider behavior change = NONE
real-long-chat validation requirement = NONE
```

Eligible examples may include:

```text
repository navigation indexes
read-only static reports
standalone local analysis tooling
machine-readable metadata derived from existing repo authority
static audit output
non-runtime fixture/evidence catalog materialization
```

provided they do not activate new release/repository authority.

---

## 4. Explicitly NOT SAFE_NON_RUNTIME

A plugin version bump is not the only risk boundary.

The following remain parked for the later stabilization/implementation phase even if the plugin version could technically stay unchanged:

```text
runtime UI surfaces
runtime diagnostics behavior
new Host capability reads
new clipboard/runtime actions
new timers/listeners/polling in the plugin
prompt/compiler changes
state/schema/persistence changes
runtime performance instrumentation
semantic validators
output/finalization behavior
release automation/workflow changes
GitHub writer/branch automation changes
CI policy changes that alter required release authority
```

Examples from the current idea pool:

```text
S-02 Diagnostic Quick Summary
S-01 MINI_WARNING_WIDGET_V1
S-04 Live Evidence Packet Builder
```

are runtime/product surfaces and therefore are not eligible for immediate non-runtime harvest.

---

## 5. Harvest implementation workflow

A harvested item is still a real implementation work item and must remain bounded.

Canonical non-runtime path:

```text
frozen design on main
→ dedicated working branch
→ bounded implementation work
→ static/self-test verification appropriate to the artifact
→ confirm plugin bytes unchanged
→ confirm release-simcore unchanged
→ PR / merge to main
→ record implementation evidence/status on main
```

No runtime deployment or real-long-chat live gate is performed because the eligibility contract forbids runtime change.

If implementation unexpectedly requires touching plugin bytes, runtime semantics, release workflows, repository writer authority, or network behavior:

```text
STOP
→ item loses SAFE_NON_RUNTIME eligibility
→ classify SAFE_NON_RUNTIME_REVOKED / PARKED FOR STABILIZATION as appropriate
→ do not widen the harvest work item
```

---

## 6. No mixing rule

The policy itself and a harvested implementation should not be introduced in the same work item when that would mix process/repository-system changes with product/tool implementation.

Canonical adoption sequence:

```text
1. freeze/update policy
2. subsequent work item applies it
```

Likewise, unrelated SAFE_NON_RUNTIME ideas should not be bundled merely because they belong to the same NR difficulty tier.

Default:

```text
one frozen idea
→ one bounded non-runtime implementation
→ verify
→ record
→ next eligible idea
```

A batch is allowed only when several outputs are inseparable parts of one already-frozen design.

---

## 7. Status vocabulary

Frozen NON_RUNTIME ideas may receive one implementation disposition:

```text
PARKED_FOR_STABILIZATION
= not eligible now despite design completion

SAFE_NON_RUNTIME_READY
= design frozen, NR tier closed, strict eligibility passed

SAFE_NON_RUNTIME_IMPLEMENTED
= implemented/applied under this policy and statically verified

SAFE_NON_RUNTIME_REVOKED
= implementation inspection revealed a forbidden impact; item returned to parking
```

`DESIGN FROZEN` remains the design-completion status and is not replaced by these implementation dispositions.

---

## 8. Difficulty is a design axis, not an implementation promise

Difficulty measures effort to complete the design, not implementation LOC or operational risk.

Therefore:

```text
Difficulty 1
!= automatically safe to implement now

Difficulty 3
!= automatically runtime/versioned
```

Every frozen NR idea must independently pass `SAFE_NON_RUNTIME` eligibility.

The NR tier rule determines **when to review for immediate implementation**.
The safety gate determines **whether implementation is allowed**.

---

## 9. Current lane interpretation after NR/R split

The selection authority is now:

```text
docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md
```

Examples:

```text
NR Difficulty 1
S-09 Evidence Index Entry Format
→ FROZEN
→ SAFE_NON_RUNTIME_IMPLEMENTED

R Difficulty 1
S-02 Diagnostic Quick Summary
→ independent R queue
→ does not block NR Difficulty 1
→ PARKED FOR STABILIZATION
```

For NR Difficulty 2, the current open-gate pool is:

```text
S-10 Authority Drift Check / Scan
S-11 Stale PR Hygiene Classifier
S-12 Natural Evidence Corpus Index
```

The NR Difficulty-2 tier closes when these three designs are frozen. RUNTIME Difficulty-2 ideas do not participate in that close condition.

---

## 10. Relationship to general stabilization

General stabilization remains the point where runtime/versioned frozen ideas are selected one by one.

That later workflow remains:

```text
repo design/evidence
→ working branch implementation
→ static / CI
→ release-simcore
→ real long-chat validation
→ main documentation / durable-memory sync
```

The NR tier harvest policy only removes needless waiting for truly non-runtime artifacts.

---

## 11. Final verdict

```text
DESIGN-FIRST DISCIPLINE
= PRESERVED

NR / R QUEUES
= INDEPENDENT FOR TIER ACCOUNTING

CURRENTLY DESIGNABLE NR DIFFICULTY TIER CLOSED
→ REVIEW FROZEN NR ITEMS FOR SAFE_NON_RUNTIME

SAFE_NON_RUNTIME
→ IMPLEMENT/APPLY IMMEDIATELY IN SUBSEQUENT BOUNDED WORK ITEM
→ STATIC VERIFY
→ MAIN SYNC
→ NO PLUGIN VERSION CHANGE
→ NO RELEASE-SIMCORE

RUNTIME / RELEASE / REPO-AUTHORITY / NETWORK IMPACT
→ NOT HARVESTABLE

RUNTIME CHANGE
= NONE
```