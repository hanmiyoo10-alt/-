# Feature design — durable chat message counts for metadata bootstrap

Feature-ID: `PRH-SERVER-DURABLE-CHAT-MESSAGE-COUNTS`

Status: **DESIGN_NEEDED**

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: PocketRisu relational SQLite/bootstrap query audit; write-path coverage; migration/backfill cost measurement; counter reconciliation strategy
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

## Problem / evidence

`TripleHwang/RisuVault` release commit `ce4e448c36874ef1c511431b2611773e9002414e` replaces startup-time `COUNT(messages)` aggregation with a durable `chat_message_counts` table maintained by SQLite triggers. New/old databases receive a one-time backfill only for chats missing a counter, and normal metadata bootstrap joins the counter table instead of the full messages table.

This directly targets long-chat startup cost while preserving partial message loading. It is strong external code evidence, but it has not been measured against current PocketRisu schema and save paths, so Evidence remains MEDIUM.

## Minimal safe scope

Do not copy the full RisuVault schema. First determine whether current PocketRisu startup/chat-list code still performs a message-table aggregate proportional to total stored messages. Only if that cost exists should the first implementation slice introduce a derived per-chat message-count invariant.

The slice must not change message-body ownership, partial loading semantics, save flush policy, or user-visible chat ordering.

## Ownership boundaries

- **messages table / current message storage:** remains authoritative for message rows.
- **message count:** derived metadata only; never authoritative for message content.
- **server relational SQLite:** owns count maintenance if adopted.
- **browser/UI:** consumes summary count but must tolerate missing/reconciliation states during migration.
- **save/integrity path:** existing revision/ETag/dirty-save guarantees remain authoritative.

## Proposed mechanism

1. Measure current bootstrap query plan and total work for many chats / very large message tables.
2. If aggregation is confirmed material, add a per-chat durable count table or equivalent derived column.
3. Maintain it transactionally on insert/delete/chat-move operations, ideally inside the same SQLite transaction as message mutation.
4. On schema upgrade, backfill only missing counts and record/measure migration duration.
5. Provide an explicit reconciliation query/test path that can recompute counts from messages if drift is detected; do not silently trust a corrupt counter forever.
6. Metadata bootstrap reads the derived count without joining/aggregating the full messages table.

## Compatibility / invariants

- `message_count` must equal the number of persisted messages for the chat after every committed mutation.
- A failed/rolled-back message transaction must not advance the count.
- Moving a message between chats decrements old and increments new exactly once.
- Chat deletion cleans up its derived count.
- Old databases migrate monotonically; migration is restart-safe/idempotent.
- No forced DB flush on `visibilitychange` / `pagehide`; `flushServerDbKeepalive()` remains no-op.
- Current save/integrity optimizations and targeted V3 plugin reload remain unchanged.
- No system package/runtime/service-manager changes; runit remains unchanged.

## Validation / acceptance

Before promotion to `READY_TO_PORT`:

1. Capture current PocketRisu bootstrap SQL/query plan and timing with representative long-chat DBs.
2. Prove there is a real aggregate bottleneck; if not, keep this idea `HOLD`/evidence-only.
3. Unit-test insert, bulk insert, delete, chat move, chat delete, rollback/failure, migration/backfill, and reconciliation.
4. Test a deliberately corrupted/missing count and confirm recovery behavior is explicit and safe.
5. Measure migration duration and DB write overhead on the server-phone class of hardware.
6. Acceptance requires materially lower metadata-bootstrap work/latency on large stores without measurable save-path regression or count drift.

## Risk / blast radius

Risk is derived-metadata drift: a missed mutation path can display wrong counts indefinitely, and migration/backfill can add startup work. Blast radius is contained because message rows remain authoritative and the derived count can be dropped/rebuilt.

## Rollback / fallback

Bootstrap must be able to fall back to the current authoritative count query if the derived-count schema is absent or intentionally disabled. The derived table/column can be ignored or rebuilt; rollback must never delete messages.

## Dependencies and PR decomposition

1. **INSPECT_ONLY measurement:** current schema, bootstrap query plan, mutation-path inventory.
2. **Contract/tests:** define exact derived-count invariant and reconciliation cases.
3. **Schema + maintenance:** isolated branch/PR only if measurement justifies it.
4. **Bootstrap switch:** use derived counts after migration and tests prove parity.

Because this is a storage/schema change, it remains design/investigation only under the autonomous safety gate until the dependency audit and migration validation are complete.