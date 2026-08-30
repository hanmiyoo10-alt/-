# BACKUP-AUTHORITATIVE-STORE-DURABILITY-BARRIER

Status: `DESIGN_NEEDED`

## Problem / evidence

`nevaeh5379/HaejeokRisuai@4342d6c38015c3a8a63c8597245476297671a163` fixes a backup-consistency hole by folding live SettingsStore state into the active preset and flushing character, settings, message, persona, and module stores before taking the storage snapshot. The transferable lesson is that a backup is correct only if every authoritative dirty-state owner that contributes to the artifact has crossed a durability barrier first.

PocketRisu currently has multiple backup entry points. The inspected `SaveLocalBackup()` delegates to the server-backed `forageStorage.exportBackup()`, while `SavePartialLocalBackup()` clones `getDatabase()`, explicitly rehydrates placeholder chats, and encodes that snapshot. The exact browser/server revision owner and all dirty domains therefore require an ownership audit before implementation.

## Minimal safe scope

Define one explicit **backup-only durability barrier** used immediately before a backup snapshot/export begins. It must call only existing canonical save/flush owners and must not introduce a second persistence architecture.

Do not change restore/import behavior in this feature. Do not add lifecycle-triggered flushing. Do not broaden `flushServerDbKeepalive()`.

## Ownership boundaries

- Browser live state: identify every independently dirty authoritative domain that can contribute to backup output.
- Canonical persistence layer: reuse existing immediate-save/domain flush APIs; do not directly serialize private store internals.
- Server export: prove that export reads a revision at or after the completed barrier.
- Partial backup: preserve explicit placeholder-chat hydration and fail-closed missing-chat behavior.
- Plugins/assets: determine whether their current persistence owner is already covered by the canonical barrier or needs an explicit participant.

## Proposed mechanism

1. Inventory backup-bearing domains and map each to its canonical save/flush promise.
2. Add a single `prepareDurableBackupSnapshot()`-style coordinator at the true backup owner.
3. Capture an epoch/revision before or during the barrier as required by current PocketRisu storage semantics.
4. Await required canonical owners. If any required owner fails, abort backup; never continue with a partial-success artifact.
5. Start server/browser snapshot only after the barrier resolves and verify the snapshot revision cannot precede it.
6. Keep concurrent edits after the barrier under existing snapshot/revision semantics rather than attempting to freeze the whole UI.

The exact function name and layer remain intentionally unresolved until the ownership audit establishes whether the authoritative coordinator belongs browser-side or server-side.

## Compatibility / invariants

- Never add forced full DB flush on `visibilitychange` or `pagehide`.
- Preserve `flushServerDbKeepalive()` as a no-op unless separately reviewed.
- Preserve current save/integrity optimizations and serialized commit ownership.
- Preserve targeted V3 plugin reload semantics.
- Do not change runit, device packages, or server-phone notification behavior.
- A required flush failure must abort backup rather than silently downgrade consistency.
- Partial backup must continue failing closed if a placeholder chat cannot be hydrated.
- Backup must not mutate canonical user-visible state merely to serialize it; derived snapshots should be detached where practical.

## Validation / acceptance

Focused tests should create pending changes immediately before backup in every identified authoritative domain, then assert the exported artifact contains the new value for all domains. Inject a rejection from each required flush owner and assert no completed backup is produced. Add a revision assertion proving server export is not older than the barrier. Verify a mutation started after the barrier follows existing snapshot semantics without corrupting or mixing revisions. Keep the existing missing-placeholder-chat abort test.

Acceptance requires a documented domain inventory with no unexplained backup-bearing owner, deterministic failure-path tests, and no lifecycle flush regression.

## Risk / blast radius

`MEDIUM`: wrong ownership can produce data-loss-by-omission while still reporting a successful backup. Over-broad flushing can increase latency or duplicate writes. Damage is contained by limiting the feature to the explicit backup path and aborting on required flush failure.

## Rollback / fallback

Single-feature revert restores current backup behavior. No data migration or on-disk format change is required. If cross-layer revision proof cannot be established, keep the item in `DESIGN_NEEDED` rather than approximating with delays or repeated blind saves.

## Dependencies

- PocketRisu backup/export ownership audit.
- Complete authoritative dirty-domain inventory.
- Canonical save/flush API map and ordering.
- Proof of browser-to-server revision visibility for export.

## PR decomposition

1. **Audit/tests only:** domain inventory + failing consistency/failure-path tests; no production behavior change.
2. **Barrier coordinator:** smallest canonical backup-only save/flush boundary once ownership is proven.
3. **Server revision assertion/hardening:** only if the audit shows cross-layer revision ordering is not already guaranteed.

No slice is `READY_TO_PORT` until the first audit resolves ownership and dependencies.