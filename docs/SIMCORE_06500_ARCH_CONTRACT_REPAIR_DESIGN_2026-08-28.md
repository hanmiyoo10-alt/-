# SimCore v0.65.0 Architecture Contract Repair Design

Date: 2026-08-28
Status: `DESIGN FROZEN · NON_RUNTIME CONTRACT REPAIR`
Parent incident: `docs/SIMCORE_06500_CANDIDATE_REQUIRED_ARCH_CONTRACT_BLOCKER_2026-08-28.md`

## Decision

Repair the Contracts v2 declaration so it describes the already-authorized v0.65.0 M2-3 physical topology.

This transaction does not change runtime candidate bytes, release-system workflows, publisher logic, or behavioral semantics.

## Exact Repair Surface

`config/simcore-architecture-v2.json`

1. Promote `edit-reconcile` from pre-M2-3 planned state to the physical M2-3 required application service.
2. Add `edit-reconcile` to `session.allowed_dependencies`, matching the authorized thin-delegate Session topology in the v0.65.0 candidate.
3. Update Session's M2 target marker so the edit-reconcile extraction is recorded as completed in the M2-3 candidate rather than still pending.

## Frozen Non-Goals

- no change to `plugins/simcore/latest.js`;
- no change to `plugins/simcore/install.js`;
- no change to candidate commit `ddae3dbe4860f2729bdef55fff9818eac5cf646f`;
- no new module or dependency edge beyond the already-authorized M2-3 candidate graph;
- no release-system redesign or gate weakening;
- no bypass of `GATE_ARCH` or `CANDIDATE_REQUIRED`;
- no claim of production publication before the permanent release transaction succeeds.

## Validation

The repair is accepted only if:

- architecture checker passes on the exact v0.65.0 candidate latest/install pair;
- ordinary main/PR static and architecture checks pass;
- permanent Required verification passes for the exact C/P pair;
- all previously passing Required gates remain PASS;
- exact candidate bytes and `latest == install` identity remain unchanged.

## Release Re-entry

Because the permanent verifier is immutable-bound, the repaired contract must enter through a fresh exact approval/release transaction whose verifier commit contains this contract repair. Reuse of the same immutable runtime candidate is allowed only if the release machinery resolves the same candidate receipt and exact production parent without modifying candidate bytes.

If the release machinery rejects exact candidate reuse, create a new release approval identity according to its fail-closed contract. Do not mutate the runtime candidate merely to force a retry.
