# SimCore Design Sweep First Policy — 2026-08-26

Status: `CANONICAL CURRENT-PHASE OPERATING PRIORITY · SYSTEM-IDEA INCREMENTAL DESIGN SWEEP ACTIVE · SYS-19/SYS-01/SYS-51 FROZEN · APPLY QUEUES HELD · NO RUNTIME CHANGE`

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
```

Current inventory state:

```text
TOTAL SYSTEM IDEAS = 52
FROZEN              = 3
OPEN NOW            = 37
GATED/DEPENDENCY    = 12
```

Remaining highest-priority open edge:

```text
I5 / D2 / NOW
SYS-08 Work-Item Close Receipt
SYS-10 Stale Next-Action Scanner
SYS-48 Gate-Blocked Reason Surface
```

Downstream-leverage choice:

```text
NEXT = SYS-08 Work-Item Close Receipt
```

Reason:
- SYS-01 defines authority lookup;
- SYS-51 defines which close surfaces are evaluated;
- SYS-08 can now define the bounded receipt of actual close results.

## 4. Apply hold

```text
SYS-19 application = HOLD
SYS-01 application = HOLD
SYS-51 application = HOLD
```

The current system design sweep remains active. Do not materialize these `NR_DOC_ONLY` artifacts in the same transaction as design freeze.

If the user explicitly changes priority, or supplies live evidence requiring immediate classification, that new operational priority may interrupt the design sweep; after handling it, recompute the sweep before resuming.

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
FROZEN = SYS-19 + SYS-01 + SYS-51
CURRENT NEXT DESIGN = SYS-08 Work-Item Close Receipt
SYSTEM APPLY/HARVEST = HOLD
```
