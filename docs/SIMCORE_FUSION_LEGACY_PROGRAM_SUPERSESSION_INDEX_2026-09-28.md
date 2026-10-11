# SimCore Fusion Legacy Program Supersession Index - 2026-09-28

Status: **FUSION MIGRATION INDEX FROZEN CANDIDATE · DESIGN/ROUTING ONLY · NO RUNTIME / RELEASE / PRODUCTION AUTHORITY**

Tracking:
- Fusion architecture: #2961
- open-backlog triage: #2986
- supersession scope owner: #3072
- current production authority: `product-manifest.json` + `release-simcore`

## 1. Purpose

SimCore accumulated multiple architecture, research, migration, cache, exposure, state, presentation, and tooling programs before the Fusion direction was selected.

Many of those programs are valuable and design-complete, but they must not become parallel future architectures merely because their documents still exist.

This index answers one question:

> **If an older SimCore program is revisited, where does its future product responsibility belong now?**

It does not delete history, close issues, authorize implementation, select a release version, mutate production, or declare Fusion current production.

Core rule:

```text
preserve historical evidence
+ preserve current production authority
+ keep portable requirements
+ reassign future semantic ownership
+ prevent duplicate owners
→ one Fusion migration path
```
## 2. Fresh authority snapshot

At this index freeze:

```text
main
= 45a5e54a65415ee9c89718ff36ac3a91747a2c50

production
= SimCore 0.70.11
= Operator Release Card Metadata Repair
= LIVE_PASS

release-simcore
= 01769eb6db7244e3682bb8ba6001d89aea4e0ed8

current priority
= POST_07011_NEXT_STEP_REVIEW

current major architecture checkpoint
= 2.0M / M2 / M2-6

provider cache
= UNVERIFIED
```

Mutable current truth remains owned by the existing SimCore authority chain. This document is a design-routing index only.

## 3. Disposition vocabulary

- `KEEP_CURRENT_CONTRACT`: current production/safety contract, preserved until proven cutover.
- `ABSORB_INTO_FUSION`: future implementation ownership moves into a Fusion plane or contract.
- `REBASE_AS_FUSION_REQUIREMENT`: capability survives, old owner map/dependencies do not.
- `HISTORICAL_DESIGN_ONLY`: durable evidence, not an active implementation program.
- `PARKED_OPTIONAL`: dormant unless explicitly reselected.
- `SEPARATE_TOOLING`: remains outside Fusion semantic ownership.
- `RETIRE_AFTER_PROOF`: keep current mechanism until replacement equivalence is proven.
- `ITEM_LEVEL_RELEVANCE_REVIEW_REQUIRED`: family is too broad for a blanket verdict.
## 4. Program-level supersession map

| Legacy program / family | Current recorded state | Future disposition | Fusion / current owner |
| --- | --- | --- | --- |
| M2 / Post-M2 architecture | M2-6 frozen and still current production architecture baseline | `KEEP_CURRENT_CONTRACT`, later historical after proven Fusion cutover | current SimCore Control/Runtime |
| 3M Source Intelligence | design converged/frozen; runtime not authorized | `ABSORB_INTO_FUSION` | Memory & Knowledge + Control/Exposure |
| 3M structured sidecar / source projection | design frozen; no runtime producer/transport authority | `ABSORB_INTO_FUSION` | `SemanticObservation.v1`, `MemoryPacket.v1`, `RuntimeStateCapsule.v1` |
| Post-3M Legacy Runtime Enabling | master design frozen; no runtime authority | `ABSORB_INTO_FUSION` + `RETIRE_AFTER_PROOF` | Fusion migration/cutover |
| Interaction / Materialization | master design frozen; no runtime authority | `ABSORB_INTO_FUSION` | explicit user actions + Presentation effect ownership |
| Multi-Family / BOARD / NEWS / SOCIAL_FEED | design frozen; runtime/producer/mount not authorized | `ABSORB_INTO_FUSION` | deterministic task router + Presentation |
| PUBLIC_KNOWLEDGE + durable-page/reference-search | design frozen; runtime not authorized | `ABSORB_INTO_FUSION` | Knowledge Registry + Curated Overlay + Reference Library |
| Candidate C | design frozen/capability-gated; storage/reentry/mutation not authorized | `ABSORB_INTO_FUSION`; no separate persistence stack | Source Ledger + StoryWorldlines + rebuildable projections |
| Exposure Model Compliance M1 | preflight implemented; real target-host evidence/model run not completed | `REBASE_AS_FUSION_REQUIREMENT` | Fusion real-host exposure/model-compliance gate |
| LightBoard / MiniBoard research | research captured/parked; no implementation authority | `ABSORB_INTO_FUSION` | `SecondaryOutputTask.v1` + Presentation |
| Deterministic State Support | design umbrella; no runtime authority | `REBASE_AS_FUSION_REQUIREMENT` | Runtime deterministic-state contracts |
| Temporal T1-T4 | requirements/design present; no runtime activation | `REBASE_AS_FUSION_REQUIREMENT` | Fusion Runtime Time + deterministic/knowledge contracts |
| Prompt Cache ABI / Cache Architecture | design frozen; A0-A3 closed; A4 not executed; provider cache unverified | `REBASE_AS_FUSION_REQUIREMENT` after Composer freeze | Composer / Prompt Cache ABI |
| SYS-01..52 | 40 frozen, 12 gated, `OPEN NOW = 0` | `ITEM_LEVEL_RELEVANCE_REVIEW_REQUIRED` | classify per item |
| release-system R2.x history | mature operating system with point-in-time records | current contracts `KEEP_CURRENT_CONTRACT`; old sequencing `HISTORICAL_DESIGN_ONLY` | existing release-system owners |
| SimCore MCP-01..07 | dedicated read/tooling plane; MCP-07 smoke tracked separately | `SEPARATE_TOOLING` | `tools/simcore-mcp/**` |
## 5. Source authority for the map

This index summarizes, but does not replace, the source documents below.

### M2 / current production architecture

- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `docs/SIMCORE_2M_ARCHITECTURE_AUDIT.md`
- `product-manifest.json`
- `docs/CURRENT_DEVELOPMENT.md`

M2 remains a current architecture contract until Fusion cutover is separately proven.

### 3M / Post-3M

Primary status audit:
- `docs/SIMCORE_3M_AND_CACHE_CROSS_PROGRAM_STATUS_AUDIT_2026-09-05.md`

Primary master designs:
- `docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md`
- `docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md`
- `docs/SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_MASTER_DESIGN_2026-09-01.md`
- `docs/SIMCORE_POST_3M_MULTI_FAMILY_ORCHESTRATION_MASTER_DESIGN_2026-09-01.md`
- `docs/SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_SETTLEMENT_MASTER_DESIGN_2026-09-01.md`
- `docs/SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01.md`

The latest audit records `3M-0..3M-10 = FROZEN / DESIGN CONVERGED` and `POST_3M_DESIGN_PROGRAM = CLOSED`, while runtime implementation/readiness remains unproven.
### Exposure / model compliance

- `docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_M1_EXECUTION_PREP_2026-09-01.md`
- `docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_M1_TARGET_HOST_PREFLIGHT_2026-09-01.md`
- `docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_HARNESS_2026-09-01.md`
- `docs/SIMCORE_EXPOSURE_ANCHOR_AND_CONTRACT_DRIFT_GUARD_2026-09-01.md`

Recorded evidence boundary:
- target-host capability remained unverified in the old M1 corpus;
- actual target-host evidence was not captured;
- M1 model compliance was not executed.

The proof requirement survives, but it must target the Fusion candidate and current host.

### LightBoard / presentation

- `docs/SIMCORE_LIGHTBOARD_RESEARCH_LIVE_DEFERRAL_AND_NEXT_RESEARCH_DECISION_2026-09-01.md`
- `docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_*`
- `products/simcore/reference/lightboard/2026-09-26/**`

LightBoard is a presentation/protocol donor, not a second canonical state engine.

### Temporal / deterministic state

- `docs/SIMCORE_DETERMINISTIC_STATE_SUPPORT_ARCHITECTURE_2026-09-07.md`
- `docs/SIMCORE_T3_RETROSPECTIVE_MULTI_POSITION_NARRATIVE_TIME_ARCHITECTURE_2026-09-07.md`
- `docs/SIMCORE_T4_STRUCTURED_BIRTHDATE_DETERMINISTIC_DERIVED_AGE_ARCHITECTURE_2026-09-11.md`
- issues #1763, #1765, #1768, #1775, #1780, #1783, #1786, #1790, #1799, #1822, #1825, #2009
- backlog lifecycle classification: #2986

The capabilities survive. Old 0.70-specific wiring does not automatically survive.
### Cache

- `docs/SIMCORE_CACHE_ARCHITECTURE_MASTER_DESIGN_2026-09-03.md`
- `docs/SIMCORE_PROMPT_CACHE_ABI_PROGRAM_MASTER_DESIGN_2026-09-02.md`
- `docs/SIMCORE_3M_AND_CACHE_CROSS_PROGRAM_STATUS_AUDIT_2026-09-05.md`

Latest recorded state:
- CACHE-A0/A1 closed;
- CACHE-A2 closed with permanent exact-byte oracle;
- CACHE-A3 closed;
- CACHE-A4 not executed/closed;
- old ordering is not fresh execution authority;
- provider cache remains `UNVERIFIED`.

### SYS program

- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- individual `docs/SIMCORE_SYS*_DESIGN.md` records

Recorded aggregate:
- 40/52 designs frozen;
- 12 gated;
- `OPEN NOW = 0`;
- frozen implementation requires separate reselection.

### Release system and MCP

- `docs/SIMCORE_RELEASE_SYSTEM_V2_PROGRAM_OPERATIONAL_CLOSURE_2026-09-01.md`
- status/evidence under `products/simcore/releases/**`
- `tools/simcore-mcp/README.md`
- issue #1749 for MCP-07 remaining protocol proof

Release-system authority remains separate from Fusion product semantics.
## 6. Portable invariants that move into Fusion

### Current SimCore invariants

Fusion must preserve:
- Mode A/B/C product semantics;
- `B_START / B_CONTINUE / B_END`;
- Broadcast End Authority;
- COMMUNITY and Knowledge boundaries;
- user/protagonist control;
- secondary-character activation;
- exposure/disclosure constraints;
- current runtime tail authority until a proven replacement contract exists;
- current hook/update/unload safety until equivalent Fusion lifecycle proof exists.

### Deterministic-state invariants

- deterministically computable values are code-owned;
- rebuildable derived values are not independent canonical truth;
- `UNKNOWN` remains `UNKNOWN`;
- discarded/rerolled candidates do not mutate canonical state;
- current runtime state is not reconstructed from long-term narrative memory.

### Source / memory invariants

- source revisions retain provenance;
- edits/deletes/rerolls/swipes/branches may invalidate influence without destroying history;
- derived projections are rebuildable;
- vector/lexical retrieval is selection, not truth;
- stale/inactive source data must not leak into current generation;
- model extraction proposals require deterministic validation before canonical writes.
### Exposure, cache, and presentation invariants

Exposure:
- retrieval eligibility is distinct from utilization permission;
- character knowledge is distinct from world knowledge;
- unopened secrets and unsurfaced backstage/front data remain inaccessible to model-facing packets;
- COMMUNITY receives exposed information only;
- real-host model compliance is distinct from mechanical capture validity.

Cache:
- cache never owns semantic truth;
- local prefix eligibility is not provider cache-hit evidence;
- cache failure must fall back to correct uncached behavior;
- provider cache remains unverified until provider/gateway evidence proves it;
- dormant features must not perturb unrelated prompt bytes solely for cache reuse.

Presentation:
- presentation does not become a second state writer;
- v1.13 Runtime-owned board/messenger/shop/quest state remains canonical unless explicitly migrated;
- deterministic rendering/projection precedes optional model generation;
- presentation must not force an ordinary-turn auxiliary call merely to remain alive.

## 7. Temporal migration rule

Temporal is not blanket-retired.

Keep as Fusion requirements:
- exact narrative time;
- date-only / range / relative / unknown states;
- deterministic duration/calendar arithmetic;
- retrospective/multi-position time;
- structured birth date and derived age.

Before closing an old Temporal design issue:
1. transplant valid schema/invariant/test requirements into a Fusion Temporal contract;
2. verify no desired N1/S1 child is orphaned;
3. link the old issue to its exact replacement;
4. close only as superseded/historical, never as unwanted.

Retrospective narrative position is distinct from checkpoint StoryWorldline branching.
## 8. SYS-01..52 migration rule

No blanket SYS decision is authorized by this index.

Each SYS item must be reviewed against:
1. current Canonical Main/repository tooling;
2. current 0.70.11 production/release system;
3. selected Fusion planes/contracts;
4. whether it was intentionally document-only;
5. whether its historical gate is obsolete.

Allowed item dispositions:

```text
ALREADY_SUPERSEDED_BY_REPO_PLATFORM
KEEP_DOC_CONTRACT
FUSION_RELEVANT_EXECUTABLE
PARKED_OPTIONAL
RETIRE_HISTORICAL
CURRENT_SEPARATE_TOOLING
```

Old M2-3 or “next genuine release proof” gates must be re-read against current evidence before opening anything.

Design-frozen means design completed. It does not mean implementation is mandatory.

## 9. Donor/reference relationship

The preserved donor originals are evidence/capability sources, not production owners.

Reference families include:
- archived SimCore v1.13.0;
- LightBoard family originals;
- NyoruMemory;
- HypaPlus;
- risupot;
- external-memory integration references;
- NMOS / Archive Center analyses and upstream references.

Their presence does not authorize incompatible-license code copying, duplicate hook owners, or duplicate canonical stores.
## 10. Parallel-architecture prevention rules

Future SimCore work must not:

1. start 3M runtime as a separate product architecture without proving the requirement is not already Fusion-owned;
2. activate Candidate C as a second durable persistence system beside the Fusion Source Ledger;
3. restart old Exposure M1 as a separate product rollout instead of reusing its proof requirements in Fusion acceptance;
4. resume historical CACHE-A4 from old sequencing alone;
5. create independent BOARD/NEWS/SOCIAL hook owners when Presentation owns those surfaces;
6. treat PUBLIC_KNOWLEDGE durable pages as a second knowledge truth database;
7. infer that a frozen SYS design is automatically scheduled;
8. retire current 0.70/M2 mechanisms before replacement proof;
9. close old issues before surviving requirements have exact replacement owners;
10. use this index as release, runtime, or production authority.

If a legacy program contains an unrepresented requirement, extend/open a Fusion requirement instead of silently restarting the legacy program.

## 11. Fusion owner destination

```text
SimCore Fusion
|
+-- Control Plane
|   A / B_START / B_CONTINUE / B_END / C
|   Broadcast / COMMUNITY / Knowledge
|   exposure / user control
|
+-- Runtime Plane
|   v1.13-derived deterministic state/game engine
|
+-- Memory & Knowledge Plane
|   Source Ledger / StoryWorldlines
|   Knowledge Registry / Curated Overlay / Reference Library
|
+-- Presentation Plane
|   SecondaryOutputTask adapters
|
+-- Composer / Host Plane
    one host lifecycle owner
    prompt placement / budget / diagnostics
```
## 12. Relationship to backlog triage and cleanup

This document owns **program/design-corpus routing**. It does not own open-issue lifecycle decisions.

Use:
- #2961 for Fusion architecture;
- #2986 for open-backlog classification;
- #3072 for legacy-program supersession routing;
- #2988 for residual ref / SYS-37 cleanup accounting;
- #3010 for the architecture-check default-source tooling gap.

No issue is closed merely because its program appears here.

## 13. Cutover rule

Until the Fusion candidate passes its explicit cutover gate:

```text
0.70.11 / M2-6
= current production architecture

Fusion
= future architecture / design + implementation candidate
```

Only proven cutover may change that relationship.

After cutover:
- surviving current contracts become Fusion contracts;
- superseded implementation paths may retire;
- M2/current-production history remains regression evidence;
- old design programs remain searchable historical evidence.

## 14. Current disposition

```text
LEGACY PROGRAM ROUTING = FROZEN CANDIDATE
RUNTIME IMPLEMENTATION = NOT AUTHORIZED BY THIS INDEX
ISSUE CLOSURE = NOT AUTHORIZED BY THIS INDEX
RELEASE / PRODUCTION MUTATION = NONE
NEXT = freeze Fusion ownership/contracts before implementation
```
