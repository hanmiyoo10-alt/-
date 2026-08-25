# SimCore Idea Tier Non-Runtime Harvest Policy

Status: `CANONICAL OPERATIONAL POLICY · DESIGN-TIER HARVEST · NON-RUNTIME ONLY · NO PLUGIN VERSION CHANGE`

Purpose: allow immediately useful non-runtime idea implementations to be applied after a design-difficulty tier closes, without breaking the existing design-first discipline or starting runtime stabilization early.

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_GUIDELINES.md`

---

## 1. Core rule

The current idea phase remains design-first.

However, after one **currently designable difficulty tier** is fully frozen, SimCore may immediately implement/apply the frozen items from that tier that satisfy the strict `SAFE_NON_RUNTIME` gate.

Canonical flow:

```text
CURRENTLY DESIGNABLE Difficulty N pool
→ every open-gate item reaches DESIGN FROZEN
→ Difficulty N DESIGN TIER CLOSED
→ classify each frozen item for implementation impact
→ SAFE_NON_RUNTIME items only
→ immediate bounded implementation/application
→ static verification
→ main evidence/status synchronization
→ no plugin version bump
→ no release-simcore deployment
→ continue next design tier
```

This is a narrow exception to the ordinary `DESIGN FROZEN → PARKED` rule.

It does not start the general stabilization/runtime implementation phase.

---

## 2. What counts as a closed difficulty tier

A difficulty tier closes when every idea of that difficulty whose **design gate is currently open** has completed its full design.

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

Therefore a gated idea does not prevent the currently designable portion of its difficulty tier from closing.

When a previously gated item later becomes designable, it enters a new incremental tier-close cycle for its same difficulty.

---

## 3. SAFE_NON_RUNTIME eligibility

An idea may be harvested immediately only when **all** of the following are true:

```text
DESIGN FROZEN = YES
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

are runtime/product surfaces and therefore are **not** eligible for immediate non-runtime harvest despite their small scope.

---

## 5. Harvest implementation workflow

A harvested item is still a real implementation work item and must remain bounded.

Canonical non-runtime path:

```text
frozen design on main
→ bounded implementation work
→ static/self-test verification appropriate to the artifact
→ confirm plugin bytes unchanged
→ confirm release-simcore unchanged
→ record implementation evidence/status on main
```

No runtime deployment or real-long-chat live gate is performed because the eligibility contract forbids runtime change.

If implementation unexpectedly requires touching plugin bytes, runtime semantics, release workflows, or repository authority:

```text
STOP
→ item loses SAFE_NON_RUNTIME eligibility
→ classify PARKED FOR STABILIZATION
→ do not widen the harvest work item
```

---

## 6. No mixing rule

The policy itself and a harvested implementation should not be introduced in the same work item when that would mix process/repository-system changes with product/tool implementation.

Canonical adoption sequence:

```text
1. freeze this policy
2. subsequent work item applies it
```

Likewise, unrelated SAFE_NON_RUNTIME ideas should not be bundled merely because they belong to the same difficulty tier.

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

## 7. Status vocabulary extension

Frozen ideas may now receive one implementation disposition:

```text
PARKED_FOR_STABILIZATION
= runtime/versioned or otherwise not eligible now

SAFE_NON_RUNTIME_READY
= design frozen and eligible after its tier close

SAFE_NON_RUNTIME_IMPLEMENTED
= implemented/applied under this policy and statically verified

SAFE_NON_RUNTIME_REVOKED
= implementation inspection revealed a forbidden impact; item returned to parking
```

`DESIGN FROZEN` remains the design-completion status and is not replaced by these implementation dispositions.

---

## 8. Difficulty is a design axis, not an implementation promise

The matrix difficulty score measures difficulty of completing the design, not implementation LOC or operational risk.

Therefore:

```text
Difficulty 1
!= automatically safe to implement now

Difficulty 3
!= automatically runtime/versioned
```

Every frozen idea must independently pass `SAFE_NON_RUNTIME` eligibility.

The tier rule determines **when to review for immediate implementation**.
The safety gate determines **whether implementation is allowed**.

---

## 9. Current application at policy-adoption time

At adoption time, the currently designable Difficulty 1 pool is already fully frozen:

```text
S-09 Evidence Index Entry Format
S-02 Diagnostic Quick Summary
```

Initial impact classification:

```text
S-09 Evidence Index Entry Format
→ candidate SAFE_NON_RUNTIME
→ implementation/apply review allowed in the next work item

S-02 Diagnostic Quick Summary
→ runtime diagnostic UI surface
→ PARKED_FOR_STABILIZATION
```

This policy document does not implement S-09 itself because policy adoption and idea implementation remain separate work items.

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

The tier harvest policy only removes needless waiting for truly non-runtime artifacts.

---

## 11. Final verdict

```text
DESIGN-FIRST DISCIPLINE
= PRESERVED

CURRENTLY DESIGNABLE DIFFICULTY TIER CLOSED
→ REVIEW FROZEN ITEMS FOR SAFE_NON_RUNTIME

SAFE_NON_RUNTIME
→ IMPLEMENT/APPLY IMMEDIATELY IN SUBSEQUENT BOUNDED WORK ITEM
→ STATIC VERIFY
→ MAIN SYNC
→ NO PLUGIN VERSION CHANGE
→ NO RELEASE-SIMCORE

RUNTIME / RELEASE / REPO-AUTHORITY IMPACT
→ PARK FOR STABILIZATION

CURRENT FIRST HARVEST CANDIDATE
= S-09 Evidence Index Entry Format

RUNTIME CHANGE
= NONE
```