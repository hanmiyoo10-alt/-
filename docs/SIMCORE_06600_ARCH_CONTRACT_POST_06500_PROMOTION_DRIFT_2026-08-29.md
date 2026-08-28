# SimCore v0.66.0 Architecture Contract Post-v0.65 Promotion Drift

Date: 2026-08-29
Classification: `FIX · ARCH_CONTRACT · STATIC_GATE · NON_RUNTIME · PRODUCTION_UNCHANGED`
Status: `REPAIRED ON WORK BRANCH · PRODUCT PR #759 OPEN · CI PENDING`

Work branch:
`runtime/simcore-v0.66.0-m2-4-boundary-completion`

Repair commit:
`f27c4e1c2b4fbfb53eb88f1220b81060f6f3dc08`

Product PR:
`#759 · feat(simcore): implement v0.66.0 M2-4 boundary completion`

## Observed authority split

Current machine-managed production authority in `docs/CURRENT_DEVELOPMENT.md` says:

```text
Version: 0.65.0
Validation: LIVE_PASS
Major checkpoint: M2-3
release-simcore commit: c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
runtime blob: 1b38e2b2874f2581edae8f1080edc39558febefa
current priority: 06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_IMPLEMENTATION
```

The deployed v0.65.0 runtime physically contains `edit-reconcile`.

However the pre-repair `config/simcore-architecture-v2.json` still declared:

```text
production_baseline = v0.64.0 / M2-2
major_update.checkpoint = M2-2
edit-reconcile.physical = planned
edit-reconcile.status = m2_3_candidate_physical_pending_publication
```

## Why this mattered

The architecture checker treats `physical: required` modules as mandatory in every checked source. A `planned` module may appear while runtime refactor is authorized, but its absence is not a missing-required failure.

That transitional declaration was correct before v0.65.0 publication because production v0.64.11 did not yet contain `edit-reconcile` while the candidate did.

After v0.65.0 publication and accepted real-long-chat `LIVE_PASS`, keeping `edit-reconcile` as `planned` weakened the production architecture contract: a future source missing the now-deployed physical owner would not fail the required-module check for that owner.

## Repair applied

The work branch now:

1. converges the architecture baseline/checkpoint metadata on deployed v0.65.0 / M2-3;
2. promotes `edit-reconcile.physical` from `planned` to `required`;
3. replaces the pre-publication status with a post-live required-owner status;
4. retains the current v0.65.0 Session -> Recovery allowed edge so the deployed production lane remains valid before v0.66 publication;
5. adds `output-finalize` as `physical: planned` for the v0.66 pre-publication dual lane;
6. declares the M2-4 candidate direct-owner dependency edges;
7. preserves checker logic unchanged;
8. leaves `release-simcore` untouched.

## M2-4 candidate edges declared

```text
Session
production-compatible allowed edge retained:
  recovery
candidate direct-owner edges added:
  output-compat
  bootstrap-migration
  output-finalize

Edit Reconcile candidate direct-owner edges:
  kernel
  time
  output-compat
  bootstrap-migration
  output-finalize

Runtime Mirror:
  output-compat

output-finalize:
  kernel
  time
  frame
  reaction
  structure
```

The compatibility `recovery` physical module remains required and retained, while the v0.66.0 candidate target remains zero runtime callers.

## Product impact

`NONE`.

This is a contract/verification repair only. Current production remains v0.65.0 and the exact-production v0.66.0 candidate identity remains unchanged:

```text
builder sha256   = ad6009ffee41a86a2723456bfa1cd727e7e760568527a0be3e04fe355767bb50
candidate blob   = 766c3b758ca26ae72546a38bfa1c053efa666c45
candidate sha256 = af3659eade34b199d8972cf04cafe2595198c075b5131275603fc2857079ed6a
```

Final closure of this FIX requires the permanent PR/static architecture gates to pass. Until then the runtime publication path does not advance.
