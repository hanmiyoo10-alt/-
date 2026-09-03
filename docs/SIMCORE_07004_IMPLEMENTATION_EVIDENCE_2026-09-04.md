# SimCore v0.70.4 Manual Edit Rebuild Attribution Implementation Evidence — 2026-09-04

Date: 2026-09-04 KST
Status: **IMPLEMENTATION PASS · STATIC/PERMANENT CI PASS · RELEASE NOT YET AUTHORIZED BY THIS RECORD**
Classification: **SIMCORE · OBSERVABILITY-ONLY · EDIT-RECONCILE · GENUINE MANUAL EDIT COLD PATH**

## 1. Authority

Design authority:
- `docs/SIMCORE_07004_MANUAL_EDIT_REBUILD_ATTRIBUTION_DESIGN_2026-09-04.md`

Implementation authorization and predecessor close:
- PR #1443 merged to `main` at `d1f023f3cab90587cbc15a2d063091694481f40d`
- v0.70.3 S7 human evidence accepted as `LIVE_PASS`
- v0.70.4 implementation explicitly authorized

Implementation PR:
- PR #1444
- branch `impl/simcore-v07004-manual-edit-rebuild-attribution`
- verified head before this evidence commit: `c1604691fd05e03c691493c8668415125dd74406`

Production authority remains unchanged during implementation:
- branch `release-simcore`
- commit `4c618563f43b8a3ff0eeb18eeff5536bb287369b`
- version `0.70.3`

## 2. Implemented scope

The implementation is diagnostic-only and production-derived. It adds bounded current-request timing attribution for the genuine manual-edit rebuild path while preserving existing edit semantics.

Implemented semantic buckets:

```text
EDIT_CLASSIFY
EDIT_REBUILD_PREPARE
EDIT_REBUILD_RECOVERY
EDIT_REBUILD_FINALIZE
EDIT_REBUILD_COMMIT
EDIT_REBUILD_OTHER
```

Diagnostic surface:

```text
Manual edit breakdown: classify <ms> · prepare <ms> · recovery <ms> · finalize <ms> · commit <ms|n/a> · other <ms> · confidence BOUNDED
```

The existing headline remains authoritative:

```text
Edit reconcile: MANUAL_EDIT_REBUILT · <total>
```

## 3. Runtime invariants preserved

Regression coverage proves the implementation does not intentionally change:

- Prompt compiler/version or Current Task Primacy semantics
- Community classifier/version
- persistent state/core-state schema versions
- module inventory/order
- `edit-reconcile` require graph
- `output-finalize`, runtime session, Store, Lifecycle, Representation, Runtime Mirror, Runtime Cache, Runtime Topology, Session modules outside selected attribution seam
- existing edit decision markers including `USER_EDIT_CANDIDATE`, `MANUAL_EDIT_REBUILT`, `REPRESENTATION_FAST_RECONCILED`
- snapshot update semantics
- network/chat/timer/storage/history-mutation side-effect surface counts

`latest.js` and `install.js` are produced byte-identically by the builder.

## 4. Fast-path cost contract

Executable regression proves:

- ordinary exact carryover remains `same-fast` and does not read snapshots merely for attribution
- representation-fast reconciliation remains `representation-fast-reconciled`
- representation-fast does not receive `editClassifyMs` or `editRebuildStart`
- full rebuild attribution is paid only on the delegated conservative rebuild path

## 5. Genuine manual-edit executable proof

The permanent builder regression materializes a temporary v0.70.4 candidate from exact v0.70.3 production source and executes the real `edit-reconcile` module with bounded stubs.

It proves:

- genuine visible edit remains `changed = true`
- path remains `manual-edit-rebuilt`
- snapshot save remains exactly once
- attribution object is present only on the genuine rebuild
- measured buckets are non-negative
- named accounting cannot exceed measured rebuild total beyond bounded clock tolerance
- an unmapped optional commit anchor renders `commit n/a` rather than fabricating `0 ms`
- impossible accounting fails closed without altering edit correctness
- third/unknown representation still takes the conservative rebuild route

## 6. CI evidence

Final verified implementation head before this record:

```text
head = c1604691fd05e03c691493c8668415125dd74406
SimCore CI run = 33790169454
Verify job = 100764578733 · SUCCESS
Required job = 100764761493 · SUCCESS
```

Result:

```text
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
Required = PASS
```

## 7. Preserved implementation anomalies

Two non-runtime test/harness defects were discovered and repaired during implementation. Both were documented in-repo before proceeding.

1. Frozen marker false-positive in release-note text
   - classification: `FIX · NON_RUNTIME · PRODUCTION_UNCHANGED`
   - runtime semantics unchanged

2. Representation-fast control fixture omitted an existing production predicate field
   - failed run `33789874835`
   - failed job `100763608783`
   - exact symptom: expected zero rebuild delegates, observed one
   - repair only populated the fixture's existing `session.current.outputFingerprint === priorCanonical` requirement
   - classification: `FIX · NON_RUNTIME · PRODUCTION_UNCHANGED`

## 8. Implementation verdict

```text
V07004_IMPLEMENTATION = PASS
OBSERVABILITY SCOPE = EDIT-RECONCILE TIMING ONLY
OPTIMIZATION = NOT IMPLEMENTED
PRODUCTION = UNCHANGED v0.70.3
NEXT = merge implementation to main, then use existing release system for candidate qualification/publication
REAL-LONG-CHAT = REQUIRED AFTER PUBLICATION
```

This record does not itself publish v0.70.4 and does not authorize any optimization based on the new attribution fields.
