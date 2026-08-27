# Feature-ID: BACKUP-PRE-PUBLISH-INTEGRITY-VERIFIER

Status: **DESIGN_NEEDED — assistant-owned draft**

## Problem / evidence

External evidence from `InoriNatsume/RisuVault` commit `1d0d352fa6d93ba88629e30089bf38accf2c0fd5` shows a useful safety pattern: before durable encrypted artifacts are committed, a read-only verifier checks structure, reference consistency, decryptability, plaintext leakage boundaries, and expected ignore rules, and fails closed on violations.

Additional evidence from `nevaeh5379/HaejeokRisuai` commit `30a927122c4306a356022ca76ad2053639c5bc1b` shows a related but distinct boundary: an explicit backup action first flushes known durable stores and refuses to continue while writes remain pending. The same source commit also adds `pagehide` flushing; that lifecycle-event behavior is explicitly **not** part of this design because it conflicts with PocketRisu guardrails.

PocketRisu already contains important backup-specific correctness checks. On current `develop`, partial local backup materializes manifest-backed assets, resolves lazy chat placeholders and aborts if chat recovery fails, and snapshots plugin custom storage before encoding. Therefore this design does **not** propose replacing those checks or re-buffering streamed backups. The opportunity is to make the explicit backup boundary two-stage and fail-closed where current ownership supports it: first establish bounded quiescence of already-owned durable writes, then validate the already-assembled snapshot before publish.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: PocketRisu-specific export snapshot invariant set; exact current save/backup ownership and pending-write visibility; bounded hook with no extra full-buffer copy
- Priority: `P0`
- Lifecycle status: `DESIGN_NEEDED`

## Minimal safe scope

Start with a **single explicit user-requested in-memory export path that already has a fully materialized snapshot before encoding** (candidate: partial local backup). Do not initially touch streamed full server backup/export paths if verification would require materializing a second copy.

The first slice is pure/read-only validation plus, only if current ownership is proven, a narrow pre-snapshot quiescence call that reuses existing durable-store flush/coordinator ownership. It must not invent a second persistence mechanism, mutate DB/storage formats, change restore behavior, alter service/device configuration, or attach flushing to lifecycle events.

## Ownership boundaries

- Existing save/store coordinators own durable writes and any supported explicit flush/drain primitive.
- Explicit backup orchestration may ask those existing owners to reach a bounded quiescent point; it must not reach into store internals or duplicate commit logic.
- Browser backup assembly owns materialization of client-visible DB/chat/plugin state for the selected export path.
- Existing storage/server APIs remain authoritative for lazy chat retrieval and plugin storage snapshots.
- The verifier owns only validation of the already-assembled snapshot and returns structured violations.
- Encoder/writer ownership remains unchanged.
- Restore/import code is out of scope for the first slice.
- `pagehide` / `visibilitychange` persistence remains outside this feature and must not be added.

## Proposed mechanism

### Stage A — explicit-backup quiescence precondition

Only after inspecting current PocketRisu ownership, introduce or reuse a helper at the backup orchestration boundary such as `awaitBackupWriteQuiescence()`.

Required properties:

1. it delegates to existing durable-write owners rather than duplicating persistence logic;
2. it is invoked only by an explicit backup action in the first slice;
3. it has a bounded failure path and surfaces a clear backup error rather than waiting forever;
4. after the drain/flush returns, any available pending-write indicators must agree that the relevant stores are quiescent;
5. a failed drain aborts before snapshot assembly/publish;
6. it does not hook `pagehide`, `visibilitychange`, unload, timer, watchdog, or server-phone Android notification paths;
7. it does not change `flushServerDbKeepalive()` from its current no-op policy.

If current PocketRisu has no safe, ownership-correct pending-write visibility or explicit drain primitive, Stage A stays design-only and the first implementation slice remains the pure verifier.

### Stage B — pre-publish snapshot verifier

Introduce a pure helper such as `verifyBackupSnapshotForPublish(snapshot, mode)` with a deliberately small invariant set derived from current PocketRisu behavior, not external source rules.

Candidate invariants for the first slice:

1. no chat placeholder remains in a backup mode that promises complete chat content;
2. manifest-backed module/persona/character asset metadata has been materialized when the chosen export format requires inline legacy-compatible assets;
3. plugin custom storage snapshot is present in modes whose import semantics replace plugin storage wholesale;
4. required top-level database structures expected by the encoder are structurally valid;
5. verification never dereferences secrets for logging and returns bounded/redacted diagnostics.

The helper returns `{ ok, violations }`. The export path aborts before encode/write when `ok` is false.

Do **not** add a decode-after-encode full round trip to production export merely for validation unless profiling proves it is bounded. Existing tests can perform round trips offline.

## Compatibility / invariants

- Do not reintroduce forced DB/store flush on `visibilitychange` or `pagehide`.
- Keep `flushServerDbKeepalive()` a no-op unless separately reviewed.
- Preserve current save/integrity optimizations.
- Preserve targeted V3 plugin reload.
- Keep runit; no PM2.
- No Android notification on server phone.
- Existing streaming backup/export paths must not gain a second full payload materialization.
- Existing successful backup formats must remain byte/semantic compatible unless a later feature explicitly changes format.
- Quiescence may coordinate already-pending writes, but must never silently overwrite newer in-memory state with an older retry/snapshot.

## Validation / acceptance

Focused tests should cover:

### Quiescence boundary

- backup requested while a relevant durable write is pending waits only through the existing owner and snapshots after that write is durable;
- injected write failure aborts the backup before snapshot/publish with bounded, actionable failure;
- a newer mutation arriving while an older write retries is not overwritten by stale retry state;
- no listener or call is added to `pagehide` or `visibilitychange`;
- no `flushServerDbKeepalive()` behavior change;
- repeated explicit backups do not leak timers/listeners or create overlapping drain loops.

### Snapshot verifier

- fully materialized valid snapshot passes;
- unresolved `_placeholder` chat fails;
- required plugin storage snapshot missing/invalid fails for replacement-style import mode;
- unmaterialized required manifest-backed asset field fails only in the relevant compatibility mode;
- diagnostics are bounded and do not dump chat/plugin secret contents;
- verifier is pure (input unchanged);
- export aborts before writer publish on violation;
- existing backup round-trip and settings-only export tests remain green.

Performance acceptance: no extra full backup copy and no meaningful regression in partial-backup peak memory beyond the small validation walk and already-required pending-write drain.

## Risk / blast radius

The verifier's primary risk is false rejection of a valid backup due to an over-broad invariant. The quiescence stage adds a separate risk: incorrect ownership can deadlock, duplicate writes, wait indefinitely, or make an explicit backup more disruptive than current behavior. Keep both boundaries minimal and fail closed without guessing or repairing data.

Because the first slice is pre-publish, failure should affect availability of a new backup only, not existing durable data. Lifecycle persistence behavior must remain unchanged.

## Rollback / fallback

The verifier and any explicit-backup quiescence call site must be independently revertible. No storage migration or persistent format change is introduced. If quiescence causes stalls or false blocks, remove that call while preserving verifier/tests and evidence. If verifier false positives appear, disable its production call while retaining its tests/evidence for redesign.

## Dependencies / PR decomposition

1. **INSPECT_ONLY contract pass:** map current save coordinators, pending-write indicators, and which export modes guarantee full chats, inline manifest assets, and wholesale plugin storage replacement.
2. **PR 1:** pure verifier + tests, no production call site if snapshot contract is still uncertain.
3. **PR 2:** wire exactly one in-memory backup path after materialization and before encode/write; run compatibility tests and memory check.
4. **Optional PR 3:** only if inspection proves an existing safe explicit drain primitive, add backup-only quiescence before snapshot assembly with failure injection tests. Do not add lifecycle hooks.
5. Only after measured success consider other export paths. Streamed server/full backups require a separate design if verification cannot stay incremental/zero-copy.

## Promotion gate

Move to `READY_TO_PORT` only when the invariant set is confirmed against current PocketRisu backup/import semantics, the first call site is isolated, tests prove fail-closed behavior without false positives, and no second full-buffer materialization is required. Quiescence itself may be promoted only if current PocketRisu exposes a single ownership-correct explicit drain/pending-write contract with bounded failure semantics. Otherwise keep Stage A design-only while allowing the pure verifier to progress independently.
