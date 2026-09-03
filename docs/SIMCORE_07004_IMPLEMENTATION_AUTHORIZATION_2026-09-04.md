# SimCore v0.70.4 Implementation Authorization — 2026-09-04

Date: 2026-09-04 KST
Status: **IMPLEMENTATION AUTHORIZED · RELEASE NOT YET AUTHORIZED**
Classification: **SIMCORE · v0.70.4 · MANUAL EDIT REBUILD ATTRIBUTION · OBSERVABILITY ONLY**

## 1. Authority

The design and impact scope were frozen in the repository before this authorization:

- `docs/SIMCORE_07004_MANUAL_EDIT_REBUILD_ATTRIBUTION_DESIGN_2026-09-04.md`
- `docs/SIMCORE_07004_MANUAL_EDIT_REBUILD_ATTRIBUTION_IMPACT_SCOPE_2026-09-04.md`

The design prerequisite requiring terminal closure of v0.70.3 is satisfied by:

- `docs/SIMCORE_LIVE_07003_S7_RELEASE_CLOSE_2026-09-04.md`
- `products/simcore/releases/live-evidence/simcore-v0.70.3-new-14.json`

The operator explicitly accepted the completed design and instructed implementation in the active SimCore project conversation on 2026-09-04 KST.

Therefore:

```text
V07004_DESIGN = FROZEN
V07003_LIVE_GATE = CLOSED / LIVE_PASS
V07004_IMPLEMENTATION = AUTHORIZED
CANDIDATE / PUBLICATION = NOT YET AUTHORIZED BY THIS DOCUMENT
OPTIMIZATION = HOLD
```

## 2. Frozen implementation scope

Implementation may only:

- re-audit the exact current production-derived v0.70.3 edit-reconcile anchors;
- add bounded timing reads and scalar accounting for the genuine `MANUAL_EDIT_REBUILT` path;
- expose the approved `Manual edit breakdown` diagnostic only when that path is exercised;
- add deterministic fixtures/regressions proving accounting closure and unchanged edit correctness;
- advance exact runtime identity to v0.70.4 and release name `Manual Edit Rebuild Attribution`.

Frozen semantic buckets:

```text
EDIT_CLASSIFY
EDIT_REBUILD_PREPARE
EDIT_REBUILD_RECOVERY
EDIT_REBUILD_FINALIZE
EDIT_REBUILD_COMMIT
EDIT_REBUILD_OTHER
```

If an exact current anchor is unavailable, implementation must leave the time in `EDIT_REBUILD_OTHER` or render the optional bucket `n/a`. It must not refactor behavior merely to obtain prettier attribution.

## 3. Forbidden scope

This authorization does not permit:

- optimization of the manual rebuild path;
- weakening edit identity or representation safety;
- changing snapshot update semantics;
- new storage, network, timers, periodic sampling, trace buffers, history scans, or raw-body retention;
- cache-program runtime activation;
- release-system/control-plane refactoring;
- unrelated Prompt, Community, Frame, Time, Lifecycle, Representation, Store, Lineage, Handoff, Recurrence, or provider-cache semantic changes.

## 4. Acceptance path

Required sequence:

```text
fresh production/source preflight
→ work-branch implementation
→ static + permanent CI
→ candidate materialization through existing release system
→ exact approval
→ Permanent Release to release-simcore
→ real long-chat human evidence
→ main docs / durable state convergence
```

`latest.js` and `install.js` must remain byte-identical at every candidate/publication boundary.
