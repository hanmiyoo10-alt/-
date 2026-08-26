# Feature-ID: BACKUP-PRE-PUBLISH-INTEGRITY-VERIFIER

Status: **DESIGN_NEEDED — assistant-owned draft**

## Problem / evidence

External evidence from `InoriNatsume/RisuVault` commit `1d0d352fa6d93ba88629e30089bf38accf2c0fd5` shows a useful safety pattern: before durable encrypted artifacts are committed, a read-only verifier checks structure, reference consistency, decryptability, plaintext leakage boundaries, and expected ignore rules, and fails closed on violations.

PocketRisu already contains important backup-specific correctness checks. On current `develop`, partial local backup materializes manifest-backed assets, resolves lazy chat placeholders and aborts if chat recovery fails, and snapshots plugin custom storage before encoding. Therefore this design does **not** propose replacing those checks or re-buffering streamed backups. The opportunity is to make the final publish boundary explicit and covered by a small invariant verifier where this can be done without undoing streaming/memory improvements.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: PocketRisu-specific export snapshot invariant set; bounded hook with no extra full-buffer copy
- Priority: `P0`
- Lifecycle status: `DESIGN_NEEDED`

## Minimal safe scope

Start with a **single in-memory export path that already has a fully materialized snapshot before encoding** (candidate: partial local backup). Do not initially touch streamed full server backup/export paths if verification would require materializing a second copy.

The first slice is only a pure/read-only verifier plus focused tests. It must not mutate DB/storage, migrate formats, change restore behavior, or alter service/device configuration.

## Ownership boundaries

- Browser backup assembly owns materialization of client-visible DB/chat/plugin state for the selected export path.
- Existing storage/server APIs remain authoritative for lazy chat retrieval and plugin storage snapshots.
- The verifier owns only validation of the already-assembled snapshot and returns structured violations.
- Encoder/writer ownership remains unchanged.
- Restore/import code is out of scope for the first slice.

## Proposed mechanism

Introduce a pure helper such as `verifyBackupSnapshotForPublish(snapshot, mode)` with a deliberately small invariant set derived from current PocketRisu behavior, not external RisuVault rules.

Candidate invariants for the first slice:

1. no chat placeholder remains in a backup mode that promises complete chat content;
2. manifest-backed module/persona/character asset metadata has been materialized when the chosen export format requires inline legacy-compatible assets;
3. plugin custom storage snapshot is present in modes whose import semantics replace plugin storage wholesale;
4. required top-level database structures expected by the encoder are structurally valid;
5. verification never dereferences secrets for logging and returns bounded/redacted diagnostics.

The helper returns `{ ok, violations }`. The export path aborts before encode/write when `ok` is false.

Do **not** add a decode-after-encode full round trip to production export merely for validation unless profiling proves it is bounded. Existing tests can perform round trips offline.

## Compatibility / invariants

- Do not reintroduce forced DB flush on `visibilitychange` or `pagehide`.
- Keep `flushServerDbKeepalive()` a no-op unless separately reviewed.
- Preserve current save/integrity optimizations.
- Preserve targeted V3 plugin reload.
- Keep runit; no PM2.
- No Android notification on server phone.
- Existing streaming backup/export paths must not gain a second full payload materialization.
- Existing successful backup formats must remain byte/semantic compatible unless a later feature explicitly changes format.

## Validation / acceptance

Focused unit tests should cover:

- fully materialized valid snapshot passes;
- unresolved `_placeholder` chat fails;
- required plugin storage snapshot missing/invalid fails for replacement-style import mode;
- unmaterialized required manifest-backed asset field fails only in the relevant compatibility mode;
- diagnostics are bounded and do not dump chat/plugin secret contents;
- verifier is pure (input unchanged);
- export aborts before writer publish on violation;
- existing backup round-trip and settings-only export tests remain green.

Performance acceptance: no extra full backup copy and no meaningful regression in partial-backup peak memory beyond the small validation walk.

## Risk / blast radius

Primary risk is false rejection of a valid backup due to an over-broad invariant. Keep the invariant list minimal and derived from existing export promises. The verifier must never "repair" data by guess.

Because the first slice is read-only and pre-publish, failure should affect availability of a new backup only, not existing durable data.

## Rollback / fallback

The helper and call site can be reverted independently. No storage migration or persistent state change is introduced. If false positives appear, disable the verifier call while keeping its tests/evidence for redesign.

## Dependencies / PR decomposition

1. **Inspection-only contract pass:** map which export modes guarantee full chats, inline manifest assets, and wholesale plugin storage replacement.
2. **PR 1:** pure verifier + tests, no production call site if contract is still uncertain.
3. **PR 2:** wire exactly one in-memory backup path after materialization and before encode/write; run compatibility tests and memory check.
4. Only after measured success consider other export paths. Streamed server/full backups require a separate design if verification cannot stay incremental/zero-copy.

## Promotion gate

Move to `READY_TO_PORT` only when the invariant set is confirmed against current PocketRisu backup/import semantics, the first call site is isolated, tests prove fail-closed behavior without false positives, and no second full-buffer materialization is required.
