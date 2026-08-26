# SimCore Design Sweep First Policy — 2026-08-26

Status: `CANONICAL CURRENT-PHASE OPERATING PRIORITY · SYSTEM-IDEA INCREMENTAL DESIGN SWEEP ACTIVE · 17 SYS DESIGNS FROZEN · APPLY/IMPLEMENTATION HELD · NO RUNTIME CHANGE`

Purpose: finish the currently selected gate-open SimCore idea designs one item at a time before applying/implementing frozen items.

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

Gated original ideas are not reopened merely by the system-idea sweep.

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

SYS-48 Gate-Blocked Reason Surface
= SMALL / I5 / D2 / NON_RUNTIME / FROZEN / NR_DOC_ONLY

SYS-03 Gate Dependency Graph
= MEDIUM / I5 / D3 / NON_RUNTIME / FROZEN / NR_EXECUTABLE

SYS-09 Change-Impact Review Map
= MEDIUM / I5 / D3 / NON_RUNTIME / FROZEN / NR_DOC_ONLY

SYS-50 Work Bundling Conflict Detector
= MEDIUM / I5 / D3 / NON_RUNTIME / FROZEN / NR_EXECUTABLE

SYS-42 Implementation Slice Conformance Checker
= MEDIUM / I5 / D3 / NON_RUNTIME / FROZEN / NR_PROTECTED

SYS-11 Design-to-Implementation Drift Audit
= MEDIUM / I5 / D3 / NON_RUNTIME / FROZEN / NR_DOC_ONLY

SYS-13 Verification Proof Matrix
= MEDIUM / I5 / D3 / NON_RUNTIME / FROZEN / NR_DOC_ONLY

SYS-17 Missing Evidence Slot Analyzer
= MEDIUM / I5 / D3 / NON_RUNTIME / FROZEN / NR_EXECUTABLE

SYS-22 Test Intent Manifest
= MEDIUM / I5 / D3 / NON_RUNTIME / FROZEN / NR_DOC_ONLY

SYS-21 Forensic Classification Consistency Check
= MEDIUM / I5 / D3 / NON_RUNTIME / FROZEN / NR_DOC_ONLY

SYS-38 Architecture Contract Diff Reporter
= MEDIUM / I5 / D3 / NON_RUNTIME / FROZEN / NR_EXECUTABLE

SYS-31 Version-Bump Blast-Radius Check
= MEDIUM / I5 / D3 / NON_RUNTIME / FROZEN / NR_PROTECTED
```

Current inventory state:

```text
TOTAL SYSTEM IDEAS = 52
FROZEN              = 17
OPEN NOW            = 23
GATED/DEPENDENCY    = 12
```

Current highest-priority open edge:

```text
I5 / D3 / NOW
SYS-35 Repository Transaction Ledger
```

Downstream-leverage choice:

```text
NEXT = SYS-35 Repository Transaction Ledger
```

Reason:
- SYS-31 now freezes the pre-release version/release blast-radius boundary and preserves existing RS2 authority;
- SYS-35 is the sole remaining I5/D3/NOW design;
- it can build on SYS-08 close receipts plus already-frozen work/release transaction boundaries without inventing those semantics from scratch.

After SYS-35 freezes, recompute the next open edge using unified priority rather than fixing a long static order.

## 4. Apply / implementation hold

```text
SYS-19 application     = HOLD
SYS-01 application     = HOLD
SYS-51 application     = HOLD
SYS-08 application     = HOLD
SYS-10 implementation  = HOLD
SYS-48 application     = HOLD
SYS-03 implementation  = HOLD
SYS-09 application     = HOLD
SYS-50 implementation  = HOLD
SYS-42 implementation  = HOLD / PROTECTED
SYS-11 application     = HOLD
SYS-13 application     = HOLD
SYS-17 implementation  = HOLD
SYS-22 application     = HOLD
SYS-21 application     = HOLD
SYS-38 implementation  = HOLD
SYS-31 implementation  = HOLD / PROTECTED
```

The current system design sweep remains active. Do not materialize or implement these items in the same transaction as design freeze.

SYS-42 and SYS-31 are `NR_PROTECTED`; their eventual implementations must be dedicated protected transactions and must not be combined with the runtime/architecture or genuine release work they later check.

If live evidence arrives or the user explicitly changes priority, handle that operational priority, run the close-step routine, then recompute the design sweep.

## 5. Gate, bundling, conformance, audit, proof, slot, test-intent, forensic-consistency, architecture-delta, and release-radius discipline

Closed gates still override scores:

```text
POST_M2_3
POST_M2_4
EVIDENCE unsatisfied
EXTERNAL unsatisfied
FUTURE
next-genuine-release-proof dependency
```

SYS-03 graph matches are re-review candidates only.
SYS-09 impact-family matches are review obligations only.
SYS-50 `BUNDLE_CLEAN` means only that no frozen bundling conflict was found; it does not authorize implementation or override a gate.
SYS-42 `SLICE_CONFORMANT` means only that the reviewed machine-verifiable implementation slice passed; it does not prove semantic equivalence, live correctness, or release readiness.
SYS-11 `DRIFT_AUDIT_CLEAN` means reviewed design-intent requirements are satisfied at the evidence maturity required by that audit; `UNPROVEN` requirements force `DRIFT_AUDIT_REVIEW_REQUIRED` rather than silent promotion.
SYS-13 prohibits proof substitution: generic CI PASS does not establish focused-test execution, fixture PASS does not establish natural live validation, release publication does not establish live runtime PASS, and permanent-CI qualification does not establish genuine release-system E2E proof.
SYS-17 analyzes only explicitly registered evidence slots for one selected bounded scope. Unregistered absence is not a gap, future-scope evidence is not a current blocker, and `EVIDENCE_SLOTS_CLEAR` never closes a gate by itself.
SYS-22 owns reviewed semantic test intent only. `INTENT_DEFINED` does not prove execution/pass, satisfy an evidence slot, alter permanent registry/harness policy, or promote deterministic proof into live/release proof.
SYS-21 reviews whether a current forensic classification remains inside cited evidence/proof/impact/attribution/recurrence boundaries. It reports over-promotion or under-classification but never auto-changes WATCH / DEFER / FIX / BLOCKER, discovers recurrence, closes gates, or mutates source authorities.
SYS-38 reports exact bounded architecture differences only. `ARCH_DIFF_PRESENT` means only that compared machine architecture surfaces differ; it is not an architecture approval, SYS-42 conformance result, SYS-11 semantic-drift result, runtime regression, or release authorization.
SYS-31 checks reviewed release/version blast radius only. `VERSION_RADIUS_CLEAR` does not construct or verify a candidate, authorize publication, write post-publish state, establish LIVE_PASS, or satisfy R2.1 genuine release proof.

Standing split rules remain preserved, including:
- runtime/feature change separate from CI/release/repository-system redesign;
- fixture expansion separate from CI/harness topology redesign;
- design freeze separate from its implementation/application;
- newly attributed evidence separate from speculative repair;
- genuine release publication separate from release-system redesign;
- protected SYS-42 implementation separate from the product/architecture implementation it later checks;
- SYS-38 implementation separate from any change to architecture checker policy or permanent CI wiring;
- protected SYS-31 implementation separate from genuine product releases and release-system redesign.

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
FROZEN = SYS-19 + SYS-01 + SYS-51 + SYS-08 + SYS-10 + SYS-48 + SYS-03 + SYS-09 + SYS-50 + SYS-42 + SYS-11 + SYS-13 + SYS-17 + SYS-22 + SYS-21 + SYS-38 + SYS-31
CURRENT NEXT DESIGN = SYS-35 Repository Transaction Ledger
SYSTEM APPLY/IMPLEMENTATION = HOLD
```
