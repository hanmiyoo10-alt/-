# WORKING-SET-DURABLE-AUTHORITY-BOUNDARY

Status: HOLD / architecture invariant

## Problem / evidence

`InoriNatsume/RisuVault` commit `12767efba3d6e824be05c1ea3a9bae2974cca8cf` splits editable plaintext `project_work/` from encrypted durable `project_git/`, with explicit `pull`, `sync`, and `wipe-work` transitions. The working set is persistent enough for editing but explicitly disposable and reconstructible; the durable representation remains the publish authority.

This is useful evidence for PocketRisu because lazy hydration, inactive-chat compaction, externalized plugin values, or other future reconstructed state can create the same class of authority confusion even without RisuVault's encryption/git design.

## Minimal safe scope

No production change now. Preserve the invariant as a design constraint. If a concrete PocketRisu owner later has both a reconstructible working representation and a durable representation, the first slice should be contract tests only:

1. identify the durable authority;
2. define reconstruction into working state;
3. define explicit publish from working state;
4. prove missing/unloaded working state does not imply durable deletion.

## Ownership boundaries

- Durable owner: whichever PocketRisu store/manifest/database/file is the source of truth for the feature.
- Working owner: in-memory, hydrated, compacted, cached, or otherwise reconstructible representation.
- Transition owner: the narrow module that performs hydrate/reconstruct and publish/sync operations.
- UI/feature consumers must not infer durability from the mere presence or absence of working state.

## Mechanism

Use explicit state/authority semantics instead of implicit object presence:

- `NOT_LOADED` / absent working representation: durable state has not been materialized here.
- `CLEAN_WORKING`: reconstructed state matches the durable authority.
- `DIRTY_WORKING`: local working changes exist and require explicit publish.
- `EXPLICIT_DELETE`: deletion intent is an operation, not an inference from absence.

The exact names/types should follow the matching PocketRisu subsystem. Do not introduce this abstraction speculatively across unrelated stores.

## Compatibility / invariants

- Working state may be discarded only if reconstruction is defined and tested.
- Durable state changes only through an explicit owned publish path.
- `NOT_LOADED != DELETE`.
- Recovery/reconciliation identifies the authoritative revision/source before overwriting either side.
- Existing save/integrity optimizations remain intact unless separately superseded.
- Do not add forced DB flushes on `visibilitychange` or `pagehide`.
- Preserve `flushServerDbKeepalive()` no-op.
- Preserve targeted V3 plugin reload.
- Keep runit; never introduce PM2.
- Server phone creates no Android notifications.

## Validation / acceptance

When a matching owner exists, acceptance requires focused tests proving:

- durable -> working reconstruction is deterministic for supported state;
- discarding a clean working copy does not lose durable data;
- absent/unloaded working state cannot generate a delete;
- dirty working state is not silently treated as durable before publish;
- stale working state cannot overwrite a newer durable revision without the subsystem's existing conflict semantics;
- crash/restart between working mutation and publish follows an explicitly documented outcome.

## Risk / blast radius

Risk is `MEDIUM` because a wrong authority decision can lose or overwrite state, but the invariant can be introduced locally with contract tests and without storage migration. The main failure mode is over-generalizing the abstraction and disturbing current save ownership.

## Rollback / fallback

For any future implementation, keep the authority resolver/transition boundary localized so it can be reverted without changing the durable format. If tests reveal ambiguous ownership, fall back to the existing PocketRisu owner and keep this dossier as a reference only.

## Dependencies

- A real PocketRisu subsystem with reconstructible/disposable working state.
- An explicit durable source of truth and revision/conflict semantics.
- Focused reconstruction/publish/crash tests.

## PR decomposition

1. Test-only authority/reconstruction matrix for one matching subsystem.
2. Minimal explicit authority/transition helper in that subsystem, if tests demonstrate a gap.
3. Only then consider broader reuse; no storage-format or runtime migration in the same PR.

No implementation branch or PR is justified while no matching PocketRisu owner has been identified.
