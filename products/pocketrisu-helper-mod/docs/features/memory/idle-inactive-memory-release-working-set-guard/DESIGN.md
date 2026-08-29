# IDLE-INACTIVE-MEMORY-RELEASE-WORKING-SET-GUARD

Lifecycle: `DESIGN_NEEDED`

## Problem / evidence

Historical Risu-family work suggested idle-batched release of inactive chat memory (`nevaeh5379/Risuai` `9c5ef605`, `e48296e3`). `nevaeh5379/HaejeokRisuai` `025a4ef9924d5da4c34507742b7207726d77233b` adds stronger causal evidence: a background compactor needs an execution-time protected working set so visible split panes, active generations, navigation targets, dirty state, and in-flight hydration cannot be evicted by stale idle work.

PocketRisu currently has no confirmed matching inactive chat/character eviction owner, so this dossier defines the invariant and future safe slice rather than authorizing implementation.

## Minimal safe scope

If PocketRisu later gains a matching compaction owner, first land only a pure protected-working-set resolver, cancellation/versioning for scheduled idle batches, and regression tests proving protected state cannot be compacted. Do not introduce paging, storage migration, or new persistence semantics in the same PR.

## Ownership boundaries

- Browser/client memory owner only.
- The compaction owner may discard re-hydratable in-memory detail, never durable data.
- Navigation/tab state owns visibility.
- Generation runtime owns active-generation identity.
- Hydration/save owners expose in-flight/dirty state only as protection signals; the compactor must not perform persistence itself.

## Proposed mechanism

Compute a fresh `ReadonlySet<ChatId>` immediately before every release batch from all live owners that make a chat non-evictable. At minimum this includes every visible pane, active generation, current navigation/transition target, and any chat whose state is dirty or being hydrated. Character-level compaction additionally protects the selected character and any character containing a protected or otherwise in-flight chat.

Scheduled release work carries a monotonically increasing generation/token. Navigation, owner reset, or a new release request invalidates older scheduled work. Recompute the protection set for each batch; never rely on a snapshot captured when the idle task was first scheduled.

## Compatibility / invariants

- Never evict visible chats in any active split pane.
- Never evict a chat with active local/remote generation.
- Never evict the current transition target.
- Never evict dirty, hydrating, or otherwise non-reconstructible in-memory state.
- Stale scheduled idle work becomes a no-op after ownership changes.
- Compaction must not trigger full DB flushes or change save ordering.
- Preserve `flushServerDbKeepalive()` no-op, targeted V3 reload, runit, and server-phone notification guardrails.

## Validation / acceptance

Require tests for split panes, active generation in a non-focused pane, rapid navigation while idle work is queued, hydration/dirty overlap, release cancellation, and rehydration of inactive compacted state. Also require before/after heap or retained-object evidence. Acceptance means every protected case remains resident, stale batches do nothing, rehydration is semantically lossless, and measured memory retention improves.

## Risk / blast radius

Risk is `MEDIUM`: an incomplete protection set can cause reload churn, stale views, loss of unsaved in-memory edits, or generation disruption. Keep durable state explicitly out of bounds.

## Rollback / fallback

Disable/revert the compaction scheduler if any protection invariant fails. Never compensate by forcing saves or widening persistence behavior.

## Dependencies

- confirmed PocketRisu compaction/eviction owner;
- explicit inventory of visible/generating/transitioning/dirty/hydrating owners;
- reproducible memory-retention measurement.

## PR decomposition

1. Tests + pure protected-working-set resolver.
2. Generation-cancelled idle scheduler integrated with one existing compaction owner.
3. Optional warm-LRU/batch tuning backed by measurements.

Do not combine with storage migrations, render-window architecture changes, or unrelated cleanup.