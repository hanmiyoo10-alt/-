# SimCore v0.65.0 Implementation Activation + Ownership Scope

Date: 2026-08-28
Status: `IMPLEMENTATION AUTHORIZED · OWNERSHIP-SCOPED FIRST USE · PRODUCTION v0.64.11 UNCHANGED`

## Authorized release

```text
v0.65.0
M2-3 Edit Reconcile Ownership Extraction
+ Runtime Identity Convergence prerequisite adjunct
```

Authority: `docs/SIMCORE_06500_COMBINED_IDENTITY_M2_3_RELEASE_DECISION_2026-08-28.md`.

## Ownership Scope Record

Requested behavior:
- Slice A: converge every runtime/release identity on `0.65.0` and permanently fail candidate validation on any split.
- Slice B: physically consolidate the existing edit-reconcile decision tree from the outer runtime shell + `CoreRulesetSession.reconcileEditedOutput()` into the planned `edit-reconcile` application service without changing decisions.

Primary owners:
- Slice A: release builder / runtime identity constants.
- Slice B: `edit-reconcile` application service.

Immediate dependency owners:
- `representation`: bounded provenance and exact carryover classification.
- `session`: state holder, snapshot/persistence orchestration, compatibility wrapper during extraction.
- `recovery` / `output-compat` / `bootstrap-migration`: existing fallback mechanics only.
- `store`, `kernel`, `time`: existing snapshot/fingerprint/clock primitives consumed by the moved algorithm.

Cross-cutting invariants:
- `latest.js == install.js` byte-for-byte.
- metadata version == `SIMCORE_RUNTIME_VERSION` == `HOST_COMPAT_VERSION` == candidate `targetVersion`.
- Representation remains provenance/taxonomy authority.
- Runtime Mirror remains transport-only.
- Fresh remains identity evidence, never a raw-body source.
- no new persistent schema/key, host/network/timer surface.
- Deferred Mirror identity/location/staleness gates unchanged.
- frozen edit controls remain behaviorally identical.

Initial read scope:
1. current production/version header and v0.64.11 identity fields;
2. `representation` module contract and carryover API;
3. outer `reconcileManualEdit()`;
4. `CoreRulesetSession.reconcileEditedOutput()`;
5. Contracts v2 `edit-reconcile` target and architecture checker;
6. candidate materializer + previous v0.64.11 builder/request patterns.

Initial excluded modules:
- Lifecycle, Frame, Recurrence, Lineage, Handoff, Evidence, Community, Reaction, Structure, Prompt, cache/topology/history observers except where full regression later exercises them.

Escalation triggers:
- architecture checker reports a dependency edge conflict;
- moved source needs an undeclared dependency;
- static/candidate regression fails outside the scoped surface;
- parity or identity equality fails;
- live Stage A reload continuity contradicts the scoped identity model;
- live Stage B controls differ from frozen behavior.

## Implementation shape

The implementation is deliberately mechanical:

1. add one physical `edit-reconcile` application module;
2. move the existing session-side reconcile algorithm into that module, preserving body/order and exposing a thin Session compatibility delegate;
3. move the outer previous-assistant representation-fast/origin routing into the same module, with the outer shell retaining wiring only;
4. stamp all v0.65.0 runtime identities in the release builder;
5. add permanent builder/candidate assertions for exact identity equality and ownership markers;
6. keep the existing generic release system unchanged.

## Static acceptance

Required before candidate materialization:

```text
node syntax latest/install                  PASS
latest == install                           PASS
metadata/runtime/host version == 0.65.0    PASS
physical edit-reconcile module              PRESENT
outer reconcileManualEdit                  DELEGATE ONLY
Session reconcileEditedOutput              DELEGATE ONLY
frozen SAME_FAST path markers               PRESENT
REPRESENTATION_FAST_RECONCILED              PRESENT
USER_EDIT_CANDIDATE                         PRESENT
MANUAL_EDIT_REBUILT                         PRESENT
Contracts v2 / applicable full CI           PASS
candidate regression suite                  PASS
```

## Live ordering after publication

Stage A must pass first: v0.65.0 bounded Host-local checkpoint -> same-tab refresh -> compatible one-shot adoption -> clean next request.

Only then may Stage B claim acceptance: SAME_FAST, representation-fast reconcile, genuine hand-edit rebuild, and ordinary A/C/B regressions.

Any anomaly is preserved immediately as WATCH / DEFER / FIX / BLOCKER before proceeding.

This document is the durable first-use worksheet for the ownership-scoped update workflow. Production remains v0.64.11 until the normal candidate/approval/publisher transaction completes.
