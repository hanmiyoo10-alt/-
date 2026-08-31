# EXPLICIT-DELETE-TOMBSTONE-SEMANTICS — design draft

## Problem / evidence

Historical source evidence from `nevaeh5379/HaejeokRisuai@d7796eb4960b54faa8b1fd8e1a77fa3b885e6377` replaced manifest-inference deletion with explicit `chatDeletes`. The previous pattern treated rows absent from a client manifest as delete candidates. That is only safe when the manifest is proven complete and authoritative for the whole parent/domain. Partial, filtered, lazy, stale, or asynchronously assembled manifests make omission ambiguous and therefore unsafe as destructive intent.

Evidence is `MEDIUM`: the external change demonstrates a concrete protocol hardening pattern, but PocketRisu has not yet been shown to contain the same unsafe omission-derived delete path.

## Minimal safe scope

First slice is inspection/test design only: map PocketRisu persistence paths that can delete chats/messages/entities and classify each as one of:

1. explicit delete/tombstone;
2. proven full-replacement transaction with complete-domain ownership;
3. partial/patch update where omission must be non-destructive.

Only if an unsafe category-(3) omission-derived delete exists should code change follow, limited to one entity domain in one PR.

## Ownership boundaries

- Browser/client mutation layer: creates explicit user/application delete intent.
- Save/patch coordinator: serializes explicit tombstones and revision identity.
- Server/storage apply layer: validates tombstones and executes only authorized destructive writes.
- Full-replacement/import/restore paths: separate ownership; may replace/prune only when they prove complete-domain authority.

## Proposed mechanism

- Treat missing entities in sparse/partial payloads as `unchanged`, not `deleted`.
- Carry explicit delete IDs/tombstones for destructive changes.
- Validate delete IDs and domain ownership before apply.
- Couple tombstones to the same revision/precondition model used by the surrounding commit so stale retries fail rather than delete newer state.
- Retire an accepted tombstone only after durable commit success; retry must remain idempotent.
- Do not copy Haejeok's exact wire schema unless it matches PocketRisu ownership naturally.

## Compatibility / invariants

- Preserve existing PocketRisu save/integrity optimizations.
- Do not add visibilitychange/pagehide full flush behavior.
- Preserve `flushServerDbKeepalive()` no-op.
- Preserve targeted V3 plugin reload.
- A partial payload omitting a live entity must never delete that entity.
- An explicit delete must affect exactly the intended identity/domain.
- Full replacement may prune only behind an explicit complete-authority boundary.
- Stale revisions/retries must not replay a delete across a newer identity/state.

## Validation / acceptance

Acceptance requires focused tests for the audited domain:

- partial payload omits existing row -> row survives;
- explicit tombstone for row -> row deleted;
- unrelated rows survive explicit delete;
- duplicate/retried tombstone is idempotent;
- stale precondition/tombstone is rejected before destructive apply;
- full-replacement path still removes rows absent from its proven complete snapshot when that behavior is intended;
- cancel/failure before durable commit leaves no half-applied deletion state.

## Risk / blast radius

`HIGH` because deletion mistakes can cause permanent data loss. The blast radius must be limited to one entity domain per implementation PR and guarded by existing revision/precondition checks. A wrong implementation may also retain stale/orphan rows; that is preferable to destructive false-positive deletion and should be observable/repairable.

## Rollback / fallback

- For test-only/audit slice: revert with no data migration.
- For implementation slice: feature/change can be reverted to previous serializer/apply path only if no incompatible persisted tombstone format was introduced; prefer additive optional fields so rollback remains possible.
- If explicit-delete generation is uncertain, fail non-destructively: preserve rows and surface diagnostics rather than inferring deletion from absence.

## Dependencies

- PocketRisu save/patch deletion ownership audit.
- Complete replacement vs partial update authority map.
- Existing revision/ETag/precondition behavior for destructive writes.
- Entity identity guarantees across delete/recreate flows.

## PR decomposition

1. **Audit + regression tests only**: codify current intended deletion authority and demonstrate any unsafe omission-derived behavior without production semantic change.
2. **One-domain explicit tombstone slice**: add explicit delete intent and storage apply behavior for the smallest proven unsafe domain; preserve backward-compatible optional payload shape where possible.
3. **Additional domains only if independently justified**: no broad storage cleanup bundled with the first fix.

## Readiness

Remain `DESIGN_NEEDED`. Do not move to `READY_TO_PORT` until PocketRisu direct evidence identifies an unsafe path or a concrete future partial-save protocol needing this invariant, and revision/rollback behavior is demonstrated by tests.
