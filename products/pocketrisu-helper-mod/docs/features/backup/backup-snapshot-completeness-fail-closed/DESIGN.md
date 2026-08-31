# Feature-ID: BACKUP-SNAPSHOT-COMPLETENESS-FAIL-CLOSED

Status: `DESIGN_NEEDED`

## Problem / evidence

HaejeokRisuai forward commits `82e6923`, `6f272350`, `60a88486`, and `05896367` show two related failure modes: required durable domains such as modules can be omitted from backup snapshots, and a fallback snapshot path can hide an authoritative storage-export failure while still producing a superficially valid artifact. The consequence is delayed data loss discovered only after restore.

Evidence is strong for the source variant but not yet reproduced against current PocketRisu backup ownership, so PocketRisu Evidence remains `MEDIUM`.

## Minimal safe scope

Define a PocketRisu backup-completeness contract before touching production code. The first slice should be tests/inspection that identify the authoritative snapshot path and required durable domains for each backup mode and prove that snapshot/export failure cannot finalize a success artifact.

Do not redesign storage, restore formats, or deployment in the first slice.

## Ownership boundaries

- Browser/client backup orchestration: starts backup, reports failure, controls artifact finalization.
- Persistence/storage layer: authoritative source of durable domain state.
- Backup encoder/container: serializes only after authoritative snapshot completeness is established.
- Restore validation: test oracle for round-trip completeness, not authority for silently repairing a bad backup.
- Assets/plugin/module/preset/chat/character domains: explicit membership depends on full vs partial backup contract.

## Proposed mechanism

1. Inventory current PocketRisu full and partial backup modes and enumerate required durable domains for each.
2. Identify exactly one authoritative source for each required domain at snapshot time; do not assemble mixed stale mirrors unless the contract explicitly supports it.
3. Before artifact finalization, require successful snapshot/export and a completeness assertion over required domains or domain-presence metadata.
4. Treat authoritative snapshot/export errors as backup failure. Do not silently fall back to a path known to have weaker completeness semantics.
5. If multiple valid storage modes exist, each mode may have its own authoritative exporter; the invariant is completeness + fail-closed success authority, not “SQL everywhere.”

## Compatibility / invariants

- Do not reintroduce forced DB flush on `visibilitychange` or `pagehide`.
- Keep `flushServerDbKeepalive()` no-op unless separately reviewed.
- Preserve current save/integrity optimizations unless explicitly superseded by measured evidence.
- Preserve targeted V3 plugin reload.
- Keep runit; no PM2.
- Server phone creates no Android notifications.
- Existing valid backup formats remain readable unless a separately reviewed migration is required.
- Partial backup semantics stay intentionally partial; completeness means all domains promised by that mode, not every durable domain.

## Validation / acceptance

- Unit/integration inventory test lists required domains by backup mode.
- Fresh-context round-trip restores representative characters/chats, modules, presets, plugin state, and required assets according to mode contract.
- Inject storage init/export/snapshot failure and assert backup operation fails before a downloadable artifact is finalized.
- Inject omission of one required domain and assert completeness validation fails.
- Verify large-backup peak memory does not regress materially from current PocketRisu behavior.
- Verify no lifecycle-event forced flush is introduced.

Acceptance for `READY_TO_PORT`: authoritative ownership is mapped; required-domain contract is explicit; all dependencies are resolved; a bounded first implementation slice exists; rollback is concrete; tests cover failure-before-finalization and clean-context restore completeness.

## Risk / blast radius

`HIGH`. A wrong implementation can create false-confidence backups, cause restore-time data loss, or reject valid backups. Cross-storage assumptions can also create memory regressions on constrained devices.

## Rollback / fallback

Initial implementation, when authorized, should be independently revertible and should not alter persisted primary data. If completeness checks cause false failures, revert the check while preserving existing backup format; never fall back to silently emitting a known-incomplete artifact.

## Dependencies

- Current PocketRisu backup-mode/domain inventory.
- Authoritative snapshot/export ownership map.
- Current restore round-trip test harness or equivalent isolated test path.
- Defined failure signaling before artifact finalization.

## PR decomposition

1. Test-only/inspection PR: backup-domain inventory and injected export-failure regression.
2. Small implementation PR: fail-closed artifact finalization at the authoritative boundary, only if PR 1 proves a bounded mechanism.
3. Optional follow-ups per missing domain, each isolated; do not mix storage architecture migration with completeness enforcement.

No autonomous implementation is authorized while this item remains `Risk: HIGH` and `DESIGN_NEEDED`.
