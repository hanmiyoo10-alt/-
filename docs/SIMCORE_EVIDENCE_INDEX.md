# SimCore Evidence Index

Status: `GENERATED NAVIGATION INDEX · M-13 MATERIALIZED · S-09 SCHEMA · NON_RUNTIME`

> GENERATED NAVIGATION VIEW  
> source: `products/simcore/evidence/evidence-index-source-v1.json`  
> schema: `docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md`  
> edit the source manifest, not generated rows.

Purpose: provide a compact contract-centric navigation surface from reviewed SimCore contracts to semantic owner, authority, qualifying direct live evidence, permanent fixture, evidence-release provenance, current evidence posture, and material debt/watch/gate identifiers.

Referenced contract/evidence/gate/debt documents remain authoritative for meaning, proof, severity, and sequencing. This generated file is a navigation projection only.

## Coverage rule

This index is intentionally curated and may be partial.

```text
row present
= a reviewed S-09 projection is present in the curation source

row absent
!= GAP
!= unproven contract
!= deprecated contract
```

Historical Evidence Release values remain historical and are never rewritten to current production automatically.

## Canonical index

| Contract | Owner | Authority | Live Evidence | Fixture | Evidence Release | Status | Related |
|---|---|---|---|---|---|---|---|
| broadcast-closure | Lifecycle + Time + Structure + output-finalize | docs/SIMCORE_BROADCAST_FIXTURE_COVERAGE_GAP_AUDIT_2026-08-26.md §1–3 | docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md | broadcast-closure [HYBRID_TRANSITIONAL] | v0.64.6 | PASS | TD-12 |
| community-reaction | Community + Reaction + Structure | docs/SIMCORE_06405_COMMUNITY_MULTILINE_REACTION_UNIT_REPAIR_PLAN.md §3 | docs/SIMCORE_LIVE_06405_VALIDATION.md | community-reaction [EXECUTABLE] | v0.64.5 | PASS | NONE |
| diagnostic-copy | diagnostic presentation/copy | docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md §6 A5 | docs/SIMCORE_LIVE_06403_BROADCAST_SEQUENCE.md | diagnostic-copy [EXECUTABLE] | v0.64.3 | PASS | NONE |
| genuine-edit | edit-reconcile | docs/SIMCORE_CONTRACTS_V2.md §6 | docs/SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06405.md | genuine-edit [HYBRID_TRANSITIONAL] | v0.64.5 | PASS | TD-01, TD-11 |
| reload-cache-continuity | runtime-telemetry | docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md §4–5 | NONE | reload-cache-continuity [EXECUTABLE] | NONE | GAP | 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT |
| representation-fast | edit-reconcile | docs/SIMCORE_CONTRACTS_V2.md §5–6 | docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md | representation-fast [HYBRID_TRANSITIONAL] | v0.64.6 | PASS | TD-01, TD-10 |

## Update discipline

Update the curated source only after reviewing the actual semantic/evidence authorities. Then regenerate this file.

Mechanical generator rules:

```text
fixture execution class = resolved from products/simcore/tests/registry.mjs
Status = explicit reviewed PASS / WATCH / GAP input
Live Evidence + Evidence Release = explicit reviewed provenance
row order = lexical Contract order
Related order = lexical identifier order
```

The generator does not discover evidence, select the latest specimen, infer Owner, infer Status, reconcile contradictions, or update authority documents.

## Hard boundaries

This generated index must never contain or perform:

```text
raw user/assistant bodies
raw Fresh bodies
full diagnostic copies
runtime-local fingerprint dumps
new semantic verdicts
new WATCH/FIX/BLOCKER classifications
automatic authority repair
runtime writes
release-simcore publication
```

`Status` remains restricted to `PASS / WATCH / GAP` under the frozen S-09 contract.
