# SimCore Evidence Index

Status: `CANONICAL NAVIGATION INDEX · S-09 MATERIALIZED · INITIAL BOUNDED COVERAGE · NON-RUNTIME`

Schema authority: `docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md`

Purpose: provide a compact contract-centric navigation surface from established SimCore contracts to their semantic owner, authority, latest qualifying direct live evidence, permanent fixture, evidence-release provenance, current evidence posture, and material debt/watch/gate IDs.

This file is an index only. Referenced authority/evidence documents remain authoritative for meaning, proof, severity, and sequencing.

## Coverage rule

This first materialization is intentionally conservative.

```text
row present
= current authority/evidence posture was sufficiently unambiguous to materialize safely

row absent
!= GAP
!= unproven contract
!= deprecated contract
```

Additional rows are added only when the eight frozen fields can be resolved without guessing. Historical evidence releases remain historical and are never rewritten to the current production version for visual consistency.

## Canonical index

| Contract | Owner | Authority | Live Evidence | Fixture | Evidence Release | Status | Related |
|---|---|---|---|---|---|---|---|
| representation-fast | edit-reconcile | docs/SIMCORE_CONTRACTS_V2.md §5–6 | docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md | representation-fast [HYBRID_TRANSITIONAL] | v0.64.6 | PASS | TD-01, TD-10 |
| genuine-edit | edit-reconcile | docs/SIMCORE_CONTRACTS_V2.md §6 | docs/SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06405.md | genuine-edit [HYBRID_TRANSITIONAL] | v0.64.5 | PASS | TD-01, TD-11 |
| community-reaction | Community + Reaction + Structure | docs/SIMCORE_06405_COMMUNITY_MULTILINE_REACTION_UNIT_REPAIR_PLAN.md §3 | docs/SIMCORE_LIVE_06405_VALIDATION.md | community-reaction [EXECUTABLE] | v0.64.5 | PASS | NONE |
| broadcast-closure | Lifecycle + Time + Structure + output-finalize | docs/SIMCORE_BROADCAST_FIXTURE_COVERAGE_GAP_AUDIT_2026-08-26.md §1–3 | docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md | broadcast-closure [HYBRID_TRANSITIONAL] | v0.64.6 | PASS | TD-12 |
| diagnostic-copy | diagnostic presentation/copy | docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md §6 A5 | docs/SIMCORE_LIVE_06403_BROADCAST_SEQUENCE.md | diagnostic-copy [EXECUTABLE] | v0.64.3 | PASS | NONE |
| reload-cache-continuity | runtime-telemetry | docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md §4–5 | NONE | reload-cache-continuity [EXECUTABLE] | NONE | GAP | 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT |

## Interpretation notes

### Representation / genuine edit

The current pre-M2-3 line has direct live PASS evidence for both differential paths. Their permanent suites remain `HYBRID_TRANSITIONAL` until the physical `edit-reconcile` owner is exposed by M2-3. When M2-3 lands, both rows must be reevaluated under the S-09 transition rule before retaining PASS for the post-extraction line.

### Broadcast closure

`broadcast-closure` remains a stable historical suite ID while its family is broadened to lifecycle + airtime + B_END closure coverage. Direct live evidence proves current product behavior; the permanent suite remains `HYBRID_TRANSITIONAL` specifically because final B_END unlock lacks a direct exported application-service surface until the planned `output-finalize` boundary.

### Reload cache continuity

The permanent fixture is executable, but the required `06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT` production proof remains pending. Fixture existence therefore does not upgrade this row to PASS.

## Update discipline

Reconsider a row only when one of these changes materially:

```text
new qualifying direct live evidence
permanent fixture registration/execution-class change
contract owner or authority document changes
material WATCH/debt/gate changes evidence applicability
required post-milestone live control becomes pending or passes
contract is explicitly retired/superseded
```

Do not update rows merely because current production advanced or a document timestamp changed.

## Hard boundaries

This index must never contain or perform:

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

`Status` is restricted to `PASS / WATCH / GAP` and must remain a projection of existing repository authority.