# SimCore System-Idea Selection Drift — SYS-24 Omission

Date: 2026-08-26
Status: `FIX · DOC_DRIFT · NON_RUNTIME · NON_BLOCKING · SELECTION POINTER CORRECTION · NO RUNTIME CHANGE`

## Observation

The living system-idea inventory currently classifies:

```text
SYS-24 Fixture Orphan Detector
= SMALL / I4 / D2 / NON_RUNTIME / NOW / NR_UNASSESSED

SYS-52 Operator Error Specimen Ledger
= SMALL / I4 / D2 / NON_RUNTIME / NOW / NR_UNASSESSED
```

but the same document's `Highest-priority open edge now` block listed only SYS-52 and called SYS-52 the final remaining gate-open I4/D2 design.

The progress/deferred pointers inherited the same omission.

## Classification

```text
ID = SYSTEM_IDEA_SELECTION_EDGE_OMISSION_SYS24
class = FIX
surface = DOC_DRIFT / SELECTION POINTER
runtime impact = NONE
release-simcore impact = NONE
blocking posture = NON_BLOCKING
```

This is not a product/runtime defect and does not alter the v0.64.7 live gate or M2-3 ordering.

## Correction

Canonical selection policy remains:

```text
1. DESIGN GATE open
2. IMPORTANCE higher
3. DIFFICULTY lower
4. downstream leverage higher
```

Therefore the real remaining I4/D2/NOW edge is:

```text
SYS-24 Fixture Orphan Detector
SYS-52 Operator Error Specimen Ledger
```

On downstream leverage, SYS-24 is selected first because it directly composes with the already-frozen SYS-22 Test Intent Manifest and SYS-23 Negative-Control Registry, and provides a regression-portfolio integrity base for later fixture mutation / coverage-promotion / contract-to-fixture work.

Corrected scoped next:

```text
NEXT = SYS-24 Fixture Orphan Detector
```

SYS-52 remains open and must be re-evaluated after SYS-24 rather than being silently skipped or pre-frozen.

## Operating boundary

```text
production bytes = unchanged
release-simcore = unchanged
CI/release system = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
physical architecture next = M2-3 only after that live gate closes
```

The living inventory/progress/deferred pointers must be synchronized as part of the next bounded design-close transaction.