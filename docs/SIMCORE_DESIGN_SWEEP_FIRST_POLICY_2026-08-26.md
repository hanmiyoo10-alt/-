# SimCore Design Sweep First Policy — 2026-08-26

Status: `CANONICAL CURRENT-PHASE OPERATING PRIORITY · GATE-OPEN SYSTEM-IDEA DESIGN SWEEP CLOSED · 40 SYS DESIGNS FROZEN · 12 GATED · FROZEN APPLY/IMPLEMENTATION REQUIRES SEPARATE RESELECTION · NO RUNTIME CHANGE`

Purpose: preserve the completed gate-open design-sweep rule and define what happens after the `NOW` queue reaches zero without crossing closed design gates.

Related authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_SYSTEM_IDEA_CANDIDATE_INVENTORY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`

## 1. Canonical design-freeze rule

```text
select legitimate gate-open idea
→ complete full bounded design
→ OPEN DESIGN QUESTIONS = 0
→ DESIGN FROZEN
→ assign freeze-time Apply Class
→ STOP that idea
→ recompute next legitimate gate-open idea
```

Implementation/application is always a separate transaction.

## 2. Completed phase

Previous closures remain valid:

```text
Original 31-idea gate-open sweep = CLOSED
Original NR D1/D2/D3 harvests   = COMPLETE
Original R DOC APPLY             = EMPTY / S-04 already applied
Permanent fixture portfolio      = COMPLETE
```

The system/operations inventory now has:

```text
TOTAL SYSTEM IDEAS = 52
FROZEN              = 40
OPEN NOW            = 0
GATED/DEPENDENCY    = 12
```

Therefore:

```text
SYSTEM GATE-OPEN DESIGN SWEEP = CLOSED
```

This is a phase closure, not a claim that all 52 ideas are designed. The remaining 12 are intentionally gated.

## 3. Remaining gated backlog

```text
POST_M2_3
SYS-26 Coverage Promotion Readiness Scanner
SYS-29 Contract-to-Fixture Gap View
SYS-40 Dead Module / Export Scanner
SYS-41 Public Test-Seam Inventory
SYS-43 M2 Checkpoint Close Pack
SYS-44 Ownership Migration Ledger
SYS-45 State-Surface Change Receipt

DEPENDENCY: next genuine release proof
SYS-27 Cross-Version Regression Receipt
SYS-30 Release-to-Docs Convergence Receipt
SYS-32 Release Candidate Provenance Viewer
SYS-34 Post-Release Convergence Checklist Generator

EVIDENCE
SYS-39 Import-Boundary Trend Report
```

Canonical current selection:

```text
NEXT SYSTEM DESIGN = NONE / WAITING_FOR_GATE
```

Closed gates override priority scores.

The empty `NOW` queue must never be interpreted as permission to design a `POST_M2_3`, dependency, or unsatisfied evidence item early.

## 4. Gate reopening

A gated row becomes eligible only when its owning authority establishes the named transition.

Current named re-review triggers:

```text
post-M2-3 stabilization
→ re-review SYS-26 / 29 / 40 / 41 / 43 / 44 / 45

next genuine runtime-release operational proof
→ re-review SYS-27 / 30 / 32 / 34

explicit sufficient import-boundary trend evidence
→ re-review SYS-39
```

Do not infer a gate transition from elapsed time, a new chat, a higher priority score, or an empty queue.

If evidence arrives or the user explicitly changes operational priority, handle the authoritative work first, run the normal close-step routine, then recompute design eligibility.

## 5. Frozen application / implementation after sweep close

The former blanket hold existed to prevent application/implementation from interleaving with the gate-open design sweep.

With `OPEN NOW = 0`, that blanket phase hold is closed.

Frozen items are now:

```text
SEPARATE RESELECTION REQUIRED
NOT AUTO-AUTHORIZED
```

This means:
- no SYS item is applied merely because its design is frozen;
- no executable SYS item is implemented merely because the design sweep ended;
- current product/live priorities still win;
- Apply Class and protected-transaction rules still apply;
- bundling/parallel-work rules still apply;
- design/application/implementation remain separate work items.

`NR_DOC_ONLY` does not mean automatic application.
`NR_EXECUTABLE` does not mean ordinary harvest is always appropriate.
`NR_PROTECTED` always requires a dedicated protected transaction.

Current protected frozen system ideas include:

```text
SYS-42 Implementation Slice Conformance Checker
SYS-31 Version-Bump Blast-Radius Check
SYS-24 Fixture Orphan Detector
SYS-36 Branch/PR Relationship Auditor
SYS-49 Safe Parallel Work Finder
```

## 6. Standing proof / authority discipline

Closed gates still override scores:

```text
POST_M2_3
POST_M2_4
EVIDENCE unsatisfied
EXTERNAL unsatisfied
FUTURE
next-genuine-release-proof dependency
```

Existing frozen-system boundaries remain authoritative through their own design documents, including:
- SYS-03 gate graph is review support, not a gate opener;
- SYS-09 impact mapping creates review obligations, not authorization;
- SYS-50 bundle CLEAN is not implementation authorization;
- SYS-42 machine slice conformance is not semantic/live proof;
- SYS-11 semantic drift review does not manufacture missing runtime proof;
- SYS-13 prohibits proof substitution;
- SYS-17 only analyzes explicitly registered evidence slots;
- SYS-22 test intent does not prove execution;
- SYS-21 forensic consistency does not auto-change disposition;
- SYS-38 architecture diff reports difference, not approval;
- SYS-31 release radius does not publish or establish LIVE_PASS;
- SYS-35 transaction ledger never substitutes for Git/GitHub truth;
- SYS-37 residual registry never authorizes cleanup.

Standing split rules remain preserved:
- runtime/feature change separate from CI/release/repository-system redesign;
- fixture expansion separate from CI/harness topology redesign;
- design freeze separate from its implementation/application;
- newly attributed evidence separate from speculative repair;
- genuine release publication separate from release-system redesign;
- protected checker/auditor implementation separate from the work it later checks;
- physical residual cleanup separate from SYS-37 registry application and separate from runtime product changes.

## 7. Current production priority

```text
SimCore production = v0.64.7 Cross-Reload Cache Observer Continuity
live gate = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
validation = PENDING_REAL_LONG_CHAT
checkpoint = M2-2
next physical architecture move = M2-3 only after the live gate closes
R2.1 genuine release operational proof = PENDING on next genuine runtime release
```

The system-design phase closure changes none of those facts.

## 8. Production boundary

```text
PLUGIN BYTES         = UNCHANGED
PLUGIN VERSION       = UNCHANGED
latest.js/install.js = UNCHANGED
release-simcore      = UNCHANGED
RUNTIME SEMANTICS    = UNCHANGED
v0.64.7 LIVE GATE    = PENDING_REAL_LONG_CHAT
```

## 9. Current verdict

```text
SYSTEM GATE-OPEN DESIGN SWEEP = CLOSED
SYSTEM DESIGNS FROZEN = 40 / 52
OPEN NOW = 0
GATED BACKLOG = 12 / WAITING_FOR_OWNING_GATES
CURRENT SYSTEM DESIGN NEXT = NONE / WAITING_FOR_GATE
FROZEN SYS APPLY/IMPLEMENTATION = SEPARATE RESELECTION / NOT AUTO-AUTHORIZED
CURRENT PRODUCT PRIORITY = v0.64.7 LIVE GATE CLOSE
NEXT PHYSICAL ARCHITECTURE = M2-3 AFTER LIVE GATE CLOSE
```
