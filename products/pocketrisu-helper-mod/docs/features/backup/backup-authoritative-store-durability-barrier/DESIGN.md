# BACKUP-AUTHORITATIVE-STORE-DURABILITY-BARRIER

Status: `DESIGN_NEEDED`

## Problem / evidence

`nevaeh5379/HaejeokRisuai@4342d6c38015c3a8a63c8597245476297671a163` fixes a backup-consistency hole by folding live SettingsStore state into the active preset and flushing character, settings, message, persona, and module stores before taking the storage snapshot. Follow-up `16b94415ece3fa4306d6eee2bf1debb97d8f7844` strengthens that lesson by introducing a common durable-store lifecycle (`flush()` plus `hasPendingWrites()`) and extending the backup guard to newly covered persona/module pending writes. The transferable lesson is that a backup is correct only if every authoritative dirty-state owner that contributes to the artifact has crossed a durability barrier first, and participation in that barrier must be explicit enough to audit when domains are added.

PocketRisu currently has multiple backup entry points. The inspected `SaveLocalBackup()` delegates to the server-backed `forageStorage.exportBackup()`, while `SavePartialLocalBackup()` clones `getDatabase()`, explicitly rehydrates placeholder chats, and encodes that snapshot. The exact browser/server revision owner and all dirty domains therefore require an ownership audit before implementation.

## Minimal safe scope

Define one explicit **backup-only durability barrier** used immediately before a backup snapshot/export begins. It must call only existing canonical save/flush owners and must not introduce a second persistence architecture.

Do not change restore/import behavior in this feature. Do not add lifecycle-triggered flushing. Do not broaden `flushServerDbKeepalive()`.

## Ownership boundaries

- Browser live state: identify every independently dirty authoritative domain that can contribute to backup output.
- Canonical persistence layer: reuse existing immediate-save/domain flush APIs; do not directly serialize private store internals.
- Barrier participation: maintain one auditable participant contract/registry (or equivalent compile-time ownership map) so a new backup-bearing domain cannot be added without an explicit durability decision. Do not require Haejeok's `DurableStore` class specifically.
- Pending-state introspection: if canonical owners expose pending state, treat unknown/indeterminate state as not safe to snapshot rather than silently assuming clean.
- Server export: prove that export reads a revision at or after the completed barrier.
- Partial backup: preserve explicit placeholder-chat hydration and fail-closed missing-chat behavior.
- Plugins/assets: determine whether their current persistence owner is already covered by the canonical barrier or needs an explicit participant.

## Proposed mechanism

1. Inventory backup-bearing domains and map each to its canonical save/flush promise.
2. Define an explicit barrier participant contract containing the minimum needed behavior: durable flush plus, where available, pending/dirty-state observability. Prefer adapting existing owners over creating a parallel store hierarchy.
3. Add a single `prepareDurableBackupSnapshot()`-style coordinator at the true backup owner.
4. Capture an epoch/revision before or during the barrier as required by current PocketRisu storage semantics.
5. Await every required canonical participant. If any required owner fails, remains pending, or cannot establish a safe durability state, abort backup; never continue with a partial-success artifact.
6. Start server/browser snapshot only after the barrier resolves and verify the snapshot revision cannot precede it.
7. Keep concurrent edits after the barrier under existing snapshot/revision semantics rather than attempting to freeze the whole UI.

The exact function name and layer remain intentionally unresolved until the ownership audit establishes whether the authoritative coordinator belongs browser-side or server-side.

## Compatibility / invariants

- Never add forced full DB flush on `visibilitychange` or `pagehide`.
- Preserve `flushServerDbKeepalive()` as a no-op unless separately reviewed.
- Preserve current save/integrity optimizations and serialized commit ownership.
- Preserve targeted V3 plugin reload semantics.
- Do not change runit, device packages, or server-phone notification behavior.
- A required flush failure, still-pending required participant, or unknown durability state must abort backup rather than silently downgrade consistency.
- Adding a new backup-bearing authoritative domain must require an explicit barrier-participation decision; no manually remembered side list may be treated as permanently complete.
- Partial backup must continue failing closed if a placeholder chat cannot be hydrated.
- Backup must not mutate canonical user-visible state merely to serialize it; derived snapshots should be detached where practical.

## Validation / acceptance

Focused tests should create pending changes immediately before backup in every identified authoritative domain, then assert the exported artifact contains the new value for all domains. Inject a rejection from each required flush owner and assert no completed backup is produced. Where pending-state introspection exists, force a participant to remain pending after a nominal flush and assert backup still fails closed. Add a registration/completeness test proving the authoritative domain inventory and barrier participant set cannot drift silently. Add a revision assertion proving server export is not older than the barrier. Verify a mutation started after the barrier follows existing snapshot semantics without corrupting or mixing revisions. Keep the existing missing-placeholder-chat abort test.

Acceptance requires a documented domain inventory with no unexplained backup-bearing owner, deterministic failure-path tests, an auditable participant-completeness mechanism, and no lifecycle flush regression.

## Risk / blast radius

`MEDIUM`: wrong ownership can produce data-loss-by-omission while still reporting a successful backup. Over-broad flushing can increase latency or duplicate writes. A false negative from pending-state reporting could incorrectly certify an inconsistent snapshot. Damage is contained by limiting the feature to the explicit backup path and aborting on required flush or durability-state uncertainty.

## Rollback / fallback

Single-feature revert restores current backup behavior. No data migration or on-disk format change is required. If cross-layer revision proof or a complete participant inventory cannot be established, keep the item in `DESIGN_NEEDED` rather than approximating with delays, repeated blind saves, or a best-effort participant subset.

## Dependencies

- PocketRisu backup/export ownership audit.
- Complete authoritative dirty-domain inventory.
- Canonical save/flush API map and ordering.
- Auditable barrier-participant completeness mechanism.
- Proof of browser-to-server revision visibility for export.

## PR decomposition

1. **Audit/tests only:** domain inventory + barrier-participant map + failing consistency/completeness/failure-path tests; no production behavior change.
2. **Barrier coordinator:** smallest canonical backup-only save/flush boundary once ownership is proven.
3. **Pending-state/completeness hardening:** add explicit dirty-state observability only where current owners cannot prove durability safely; do not create a parallel persistence architecture.
4. **Server revision assertion/hardening:** only if the audit shows cross-layer revision ordering is not already guaranteed.

No slice is `READY_TO_PORT` until the first audit resolves ownership and dependencies.
