# SimCore post-v0.66 architecture-contract drift before M2-5

Date: 2026-08-29

Status: **DIRECT REPOSITORY EVIDENCE · FIX · NON_RUNTIME · PRE-M2-5 IMPLEMENTATION BLOCKER · DESIGN MAY CONTINUE · NO RUNTIME CHANGE**

## 1. Current durable product authority

After the v0.66.0 terminal administrative closure, current durable product state is:

```text
production_version      = 0.66.0
release_name            = M2-4 Session / Runtime Mirror Boundary Completion
release_commit          = 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
release_blob            = f0da13d4c47fd98e9065d7dbf253a3296151ee16
validation_status       = LIVE_PASS
major_update_checkpoint = M2-4
current_priority        = M2_5_POST_06600_TRANSITION_DEBT_REVIEW
```

Authority:

- `product-manifest.json`
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_06600_LIVE_PASS_TERMINAL_CLOSURE_2026-08-29.md`
- `release-simcore` production identity above

## 2. Stale architecture authority observed

Current `config/simcore-architecture-v2.json` still carries pre-v0.66 transition state, including:

```text
production_baseline.version = 0.65.0
major_update.status          = M2_3_LIVE_PASS_M2_4_IMPLEMENTATION_AUTHORIZED
major_update.checkpoint      = M2-3
recovery.status              = m2_4_candidate_zero_runtime_callers_pending_publication
session.status               = m2_4_candidate_orchestrator_reduced_pending_publication
runtime-mirror.status        = m2_4_candidate_observe_guard_transport_pending_publication
representation.status        = m2_4_candidate_accepted_canonical_equivalence_pending_publication
output-finalize.physical     = planned
output-finalize.status       = m2_4_candidate_physical_pending_publication
output-compat.status         = m2_4_candidate_fresh_plan_interpretation_pending_publication
completed_checkpoints        = through M2-3 only
```

Current `docs/SIMCORE_CONTRACTS_V2.md` is older still in several narrative surfaces, including:

```text
Production baseline: v0.64.0
edit-reconcile described as planned after M2-2 live gate
M2-3 described as planned
M2-4 described as future narrowing work
M2-5+ described as later transition-code removal
```

These descriptions are historical architecture intent, but they are currently surfaced as living Contracts v2 authority rather than explicitly historical sections.

## 3. Why this matters now

M2-5 is specifically the transition-debt retirement checkpoint. It may remove the physical Recovery facade and shrink architecture transition declarations only where the actual v0.66 source proves the corresponding edges/artifacts are gone.

A stale contract/config can therefore create two opposite hazards:

```text
false permission
→ a pre-publication candidate exception remains and hides a stale edge

false rejection
→ current v0.66 physical ownership is treated as only planned/pending
```

The next runtime implementation must not be based on either stale picture.

## 4. Classification

```text
POST_06600_ARCH_CONTRACT_DRIFT
= FIX
= DIRECT REPOSITORY EVIDENCE
= NON_RUNTIME
= PRE_M2_5 IMPLEMENTATION BLOCKER
= NOT A v0.66 PRODUCT CORRECTNESS FAILURE
= DOES NOT REOPEN v0.66 LIVE_PASS
= DOES NOT MUTATE release-simcore
```

Design/review work may continue because the real production authority is known. Runtime implementation may not begin until the architecture authority is rebased against exact current v0.66 production source.

## 5. Required repair boundary

A separate non-runtime architecture-convergence transaction must:

```text
1. rebase Contracts v2 production baseline to exact v0.66.0 LIVE_PASS identity;
2. mark M2-4 physical/current ownership as completed rather than pending publication;
3. record M2-4 in completed checkpoints;
4. preserve only transition exceptions that still correspond to actual v0.66 source edges;
5. preserve Recovery as a current physical deprecated/transition shim until M2-5 actually deletes it;
6. update output-finalize from planned to current physical owner;
7. update Session / Runtime Mirror / Representation / Output Compat statuses to current post-M2-4 truth;
8. keep provider cache UNVERIFIED and all frozen safety contracts unchanged;
9. pass the permanent architecture checker without weakening its rules.
```

Do not combine this repair with v0.67 runtime code, release-system redesign, or unrelated quality fixes.

## 6. M2-5 gate consequence

```text
06700 design work                         = ALLOWED
06700 source audit                        = ALLOWED
06700 runtime implementation branch       = BLOCKED
06700 runtime builder/candidate mutation  = BLOCKED
release-simcore mutation                  = BLOCKED
```

Unblock condition:

```text
post-v0.66 architecture authority convergence
+ permanent CI PASS
+ exact v0.66 source re-audit
→ then evaluate M2-5 implementation authorization
```

## 7. Relationship to deferred/watch work

This drift is not a reason to absorb unrelated deferred items into M2-5. Community taxonomy/diversity, genuine-edit latency, semantic previous-turn replay, Broadcast closure-expression warnings, provider/cache observations, and rare compatibility activations keep their own evidence/attribution lanes.
