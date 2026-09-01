# SimCore Current-Memory Exact-Version Duplication Revert Fix — 2026-09-01

Date: 2026-09-01 KST
Status: **FIX · ROOT CAUSE CONFIRMED · NON_RUNTIME**
Classification: **CURRENT MEMORY / CLOSURE-INTEGRITY / CANONICAL-MAIN AUTO-REVERT**

## Trigger

A documentation-only synchronization PR attempted to refresh stale human-authored current-state prose in `docs/CURRENT_DEVELOPMENT.md` after the accepted human-evidence terminal close.

Transaction:

```text
PR #1147
merged main commit = db8676ae013c840890077b6ad9ffacacecd47810
exact-main SimCore CI run = 33488040373
Verify job = 99792655807
```

PR validation itself passed, but the exact merged main health profile failed one permanent regression invariant and canonical-main protection reverted the merge:

```text
revert commit = eccc90acefd6bb77c331d23598ea5edc6dbeb9ca
```

## Exact failure

The exact-main CI report was:

```text
profile = MAIN_HEALTH
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
GATE_STATE = PASS
GATE_COORDINATION = PASS
GATE_LEGACY_COMPAT = PASS
reason = PERMANENT_REGRESSION_FAIL
```

Exact stderr:

```text
SUITE_ASSERTION_FAILED: closure-integrity: active human current-state prose duplicates version literal
```

The failing prose repeated the current production version inside the active human-authored `# 1. Current Operational State` section even though the machine-managed snapshot already owns exact production identity.

## Classification

```text
FIX · CURRENT_MEMORY_EXACT_VERSION_DUPLICATION · NON_RUNTIME
```

This is not a runtime defect and not a canonical-main guard defect. The protection system behaved correctly and restored a clean main state.

## Root cause

`products/simcore/tests/suites/closure-integrity.test.mjs` intentionally enforces identity-free active human current-state prose. Exact production version, commit, and live-gate identity belong to machine-managed authority surfaces, not duplicated human prose.

The invariant must be preserved, not weakened.

## Repair contract

Reapply the desired stale-prose synchronization with this boundary:

```text
machine-managed snapshot / terminal block
→ sole exact current production identity authority

active human Current Operational State
→ interpretation only
→ no v0.x.y literal
→ no 40-character commit literal
→ no duplicate live-gate identity

Quick Resume / historical evidence
→ may retain bounded versioned planning/history where permitted by existing contracts
```

The repaired active prose describes:

```text
live gate = durably closed / LIVE_PASS
2.0M structural program = complete
M2 architecture = frozen at terminal checkpoint
next product lane = S7 post-M2 simplification convergence implementation
reserved cache-attribution lane = PARKED
provider cache = UNVERIFIED
WATCH · REPEATED_OUT_STORAGE_LATENCY = preserved
```

## Isolation

This FIX must not modify:

```text
release-simcore
plugins/simcore/latest.js
plugins/simcore/install.js
runtime behavior
persistent schema
S7 design
parked cache-attribution design
release-system implementation logic
closure-integrity test semantics
canonical-main protection semantics
```

## Close gate

Do not declare this FIX closed merely because PR CI passes. Required proof is:

```text
PR Verify = PASS
PR Required = PASS
merge to main
exact merged MAIN_HEALTH = PASS
no canonical-main auto-revert
main readback contains identity-free current prose and updated Quick Resume
release-simcore unchanged
```
