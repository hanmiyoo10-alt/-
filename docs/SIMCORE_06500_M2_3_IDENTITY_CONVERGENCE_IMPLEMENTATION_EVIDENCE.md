# SimCore v0.65.0 M2-3 + Runtime Identity Convergence — Implementation Evidence

Date: 2026-08-28
Status: `IMPLEMENTED ON WORK BRANCH · STATIC/CI PENDING · PRODUCTION v0.64.11 UNCHANGED`

## Authority

Release decision:
`docs/SIMCORE_06500_COMBINED_IDENTITY_M2_3_RELEASE_DECISION_2026-08-28.md`

Ownership-scoped activation:
`docs/SIMCORE_06500_IMPLEMENTATION_ACTIVATION_OWNERSHIP_SCOPE_2026-08-28.md`

Work branch:
`simcore/v0-65-0-m2-3-identity-convergence`

## Ownership-scoped first-use result so far

Initial runtime read stayed bounded to:

- current release/runtime/host identity constants;
- `representation` carryover/provenance contract;
- outer `reconcileManualEdit()`;
- `CoreRulesetSession.reconcileEditedOutput()`;
- existing candidate materializer and `batch-a` registry.

One evidence-backed scope expansion occurred:

```text
EXPANSION: operator release card static surface
REASON: frozen v0.65.0 design explicitly requires Stage A -> Stage B live order in the in-plugin update card
RUNTIME SEMANTIC IMPACT: NONE
CLASSIFICATION: FIX / REQUIRED DESIGN SURFACE
```

No unrelated lifecycle/domain module source had to be read for implementation.

## Implementation

Builder:
`products/simcore/tooling/build-06500-m2-3-edit-reconcile-identity-convergence.py`

The builder applies only to the exact production v0.64.11 artifact and changes only the two authorized runtime paths when candidate materialization runs.

### Slice A — identity convergence

Candidate assertions require:

```text
//@version                0.65.0
SIMCORE_RUNTIME_VERSION   0.65.0
HOST_COMPAT_VERSION       0.65.0
```

A mismatch aborts the build as `06500_RUNTIME_IDENTITY_SPLIT`.

### Slice B — M2-3 ownership extraction

The existing two edit-reconcile ownership sites are first extracted from v0.64.11 source, then their original locations are replaced by thin delegates, and only afterward is the extracted physical module inserted.

Target shape:

```text
edit-reconcile
  reconcileVisiblePreviousAssistant(...)
  reconcileSessionEditedOutput(...)

outer runtime shell
  reconcileManualEdit(...) -> delegate only

CoreRulesetSession
  reconcileEditedOutput(...) -> delegate only
```

Representation still supplies `inspectCarryover()` and bounded provenance. The moved service does not perform Host mirror reads.

Frozen path markers preserved in the extracted owner:

```text
same-fast
same-host-fast
representation-fast-reconciled
REPRESENTATION_DRIFT_CORRELATED
USER_EDIT_CANDIDATE
AMBIGUOUS_CHANGE
manual-edit-rebuilt
```

## Static self-review finding

During builder review, an insertion-order defect was found before CI:

```text
symptom: inserting the new module before replacing old ownership sites caused the copied signatures to become the first patch anchors
classification: FIX
production exposure: NONE
resolution: replace original Session/outer sites first, then insert extracted module
```

The corrected builder is the branch authority. This is exactly the kind of narrow-scope implementation anomaly that must be preserved rather than silently discarded.

## Permanent regression additions

`host-local-telemetry-v06500.test.mjs`
- metadata/runtime/Host compatibility equality;
- exact v0.65.0 Host-local capsule accepted;
- prior v0.64.11 capsule rejected;
- physical Edit Reconcile wiring present.

`operator-release-card-v06500.test.mjs`
- existing collapsed panel surface only;
- Stage A appears before Stage B;
- required identity/reload and edit-reconcile control markers present;
- no new side-effect surface.

`batch-a` routes those two suites through the v0.65.0 guards while preserving fallback coverage for older source versions.

## Pending gates

1. PR/static/CI validation.
2. Candidate materialization from exact production parent.
3. Candidate approval and `release-simcore` publication.
4. Stage A real long-chat reload continuity.
5. Stage B M2-3 frozen-control validation.
6. Main architecture/current-development/long-memory synchronization after live evidence.

Production remains v0.64.11 until the normal release transaction publishes the candidate.
