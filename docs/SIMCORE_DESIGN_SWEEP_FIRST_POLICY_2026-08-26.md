# SimCore Design Sweep First Policy — 2026-08-26

Status: `CANONICAL CURRENT-PHASE OPERATING PRIORITY · SYSTEM-IDEA INCREMENTAL DESIGN SWEEP ACTIVE · 5 SYS DESIGNS FROZEN · APPLY/IMPLEMENTATION HELD · NO RUNTIME CHANGE`

Purpose: finish the currently selected gate-open SimCore idea designs one item at a time before applying/implementing the frozen items.

Related authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_SYSTEM_IDEA_CANDIDATE_INVENTORY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`

## 1. Canonical rule

```text
select legitimate gate-open idea
→ complete full bounded design
→ OPEN DESIGN QUESTIONS = 0
→ DESIGN FROZEN
→ assign freeze-time Apply Class
→ STOP that idea
→ select next by unified priority
```

Implementation/application is a separate transaction.

## 2. Previous closures remain valid

```text
Original 31-idea gate-open sweep = CLOSED
Original NR D1/D2/D3 harvests   = COMPLETE
Original R DOC APPLY             = EMPTY / S-04 already applied
Permanent fixture portfolio      = COMPLETE
```

Gated original ideas are not reopened by the system-idea sweep.

## 3. Current system-idea sweep

Frozen:

```text
SYS-19 Live-Gate Handoff Packet
= SMALL / I5 / D1 / NON_RUNTIME / FROZEN / NR_DOC_ONLY

SYS-01 Living Authority Map
= SMALL / I5 / D2 / NON_RUNTIME / FROZEN / NR_DOC_ONLY

SYS-51 Close-Step Trigger Matrix
= SMALL / I5 / D2 / NON_RUNTIME / FROZEN / NR_DOC_ONLY

SYS-08 Work-Item Close Receipt
= SMALL / I5 / D2 / NON_RUNTIME / FROZEN / NR_DOC_ONLY

SYS-10 Stale Next-Action Scanner
= SMALL / I5 / D2 / NON_RUNTIME / FROZEN / NR_EXECUTABLE
```

Current inventory state:

```text
TOTAL SYSTEM IDEAS = 52
FROZEN              = 5
OPEN NOW            = 35
GATED/DEPENDENCY    = 12
```

Remaining highest-priority open edge:

```text
I5 / D2 / NOW
SYS-48 Gate-Blocked Reason Surface
```

Current selection:

```text
NEXT = SYS-48 Gate-Blocked Reason Surface
```

Design constraint already established for SYS-48:
- it may expose an already-authoritative blocking reason and unlock condition;
- it may not invent dependency edges or become the gate-dependency engine;
- explicit dependency graph semantics remain the separate SYS-03 idea.

After SYS-48 freezes, selection moves to the open I5/D3 group according to downstream leverage.

## 4. Apply / implementation hold

```text
SYS-19 application     = HOLD
SYS-01 application     = HOLD
SYS-51 application     = HOLD
SYS-08 application     = HOLD
SYS-10 implementation  = HOLD
```

The current system design sweep remains active. Do not materialize or implement these items in the same transaction as design freeze.

If the user explicitly changes priority, or supplies live evidence requiring immediate classification, that operational priority may interrupt the design sweep; after handling it, recompute the sweep before resuming.

## 5. Gate discipline

Closed gates still override scores:

```text
POST_M2_3
POST_M2_4
EVIDENCE unsatisfied
EXTERNAL unsatisfied
FUTURE
next-genuine-release-proof dependency
```

Do not pull those items forward merely because the system sweep is active.

## 6. Production boundary

```text
PLUGIN BYTES         = UNCHANGED
PLUGIN VERSION       = UNCHANGED
latest.js/install.js = UNCHANGED
release-simcore      = UNCHANGED
RUNTIME SEMANTICS    = UNCHANGED
v0.64.7 LIVE GATE    = PENDING_REAL_LONG_CHAT
```

## 7. Current verdict

```text
SYSTEM-IDEA DESIGN SWEEP = ACTIVE
FROZEN = SYS-19 + SYS-01 + SYS-51 + SYS-08 + SYS-10
CURRENT NEXT DESIGN = SYS-48 Gate-Blocked Reason Surface
SYSTEM APPLY/IMPLEMENTATION = HOLD
```
