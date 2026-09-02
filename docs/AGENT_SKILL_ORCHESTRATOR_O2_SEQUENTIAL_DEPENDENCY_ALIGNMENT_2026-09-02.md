# Agent Skill Orchestrator O2 Sequential Dependency Alignment — 2026-09-02

## Status

FROZEN_BEFORE_CODE_CHANGE

Baseline main: `b1f67fd814d8261771530951cd028e930e44af2e`.

## Problem

The deterministic `impact_analysis` execution plan still encodes an early O1 placeholder topology in which Mapper and Critic both depend directly on Scout. The merged O2-B/O2-C Critic contract and receipt envelope require a validated Mapper RoleArtifact as Critic's typed upstream input.

If left unchanged, a live O2 sequential pilot would execute Scout -> Mapper -> Critic while the execution plan digest claimed Scout -> Critic. That would make provenance internally inconsistent even if each worker artifact validated.

## Alignment

For the O2 sequential contract, change only the Critic stage dependency:

- Scout: no dependency.
- Mapper: depends on Scout.
- Critic: depends on Mapper.
- Synthesizer: depends on Mapper and Critic.

This aligns the deterministic plan with the already-merged typed handoff contract. It does not add scheduling, model assignment, model execution, or mutation authority.

## O3 boundary

The roadmap's future O3 parallel Mapper/Critic idea is not implemented here. Because the current Critic contract consumes Mapper output, O3 must later redesign its information boundary before it can truthfully claim parallel independence. O2 must not encode future parallelism that contradicts present executable contracts.

## Change bound

- update `tools/agent-skill-orchestrator/router.py` Critic dependency only;
- update the corresponding deterministic router regression name/expected topology;
- no schema changes;
- no role-contract changes;
- no receipt/runtime/workflow changes;
- no model call;
- no product/plugin/release/device changes;
- no `PILOT_VALIDATED_SCOPES` change.

## Exit

Agent Skills CI and SimCore CI must pass on exact PR head, then exact-head merge, main read-back, merged-main CI, and #1120 evidence record. Only after that may O2-D live-pilot acceptance be frozen.