# CHAT-COMPLETE-DUPLICATION-SNAPSHOT

Status: `DESIGN_NEEDED`

## Problem / evidence

`nevaeh5379/HaejeokRisuai` commit `3dc4e9573e7739e6c061fe4e709088c9041c59fd` hardened chat duplication after introducing lazy/evicted chat messages. The failure mode is general: duplicating the currently materialized runtime object can silently omit unloaded history, clone stale state after async preload/reorder, retain source-owned message identifiers, and leave bookmarks/internal references pointing at the wrong identity domain.

Evidence is `MEDIUM`: credible code-level fix and regression tests exist externally, but the same failure has not yet been directly reproduced in PocketRisu.

## Minimal safe scope

First slice is inspection/tests only unless PocketRisu already has a clearly bounded duplication owner:

1. identify every desktop/mobile/API path that duplicates or copies a chat;
2. identify whether messages/details can be partially hydrated at that point;
3. define completeness and identity postconditions;
4. add regression fixtures for partial hydration, reordering during async hydration, reference remap, and transient-state reset.

No storage-format migration, backup/restore change, or broad lazy-loading refactor belongs in this feature.

## Ownership boundaries

- chat list / UI command initiates duplication but does not own snapshot completeness;
- hydration/message-store layer owns authoritative materialization of the source history;
- duplication helper owns stable source identity revalidation, clone construction, fresh identities, and reference remapping;
- persistence layer owns atomic insertion of the newly identified chat and must not share source persistence identity;
- plugin/reference consumers must be audited for any message/chat IDs that have duplicate-local semantics.

## Proposed mechanism

At duplication start, capture stable source character/chat identity and any authoritative expected message count/completeness marker. Request full hydration through the existing owner. After the async boundary, re-find the source by stable identity rather than stale list index/object position. Fail closed if completeness cannot be proven.

Construct the duplicate only from that validated complete source. Assign a fresh chat identity and fresh message identities. Build an old-to-new ID map and remap duplicate-local references (at minimum bookmarks; extend only where the PocketRisu audit proves additional internal references). Explicitly clear branch, streaming, compaction, or other transient runtime ownership that should not cross into a new durable chat.

Persist the new chat as its own durable object, then update UI selection only if the initiating character/chat context still permits it.

## Compatibility / invariants

- never truncate source history because older messages were evicted/unloaded;
- source chat remains bit-for-bit logically unchanged by duplication;
- duplicate has a distinct durable chat identity;
- duplicate-local message IDs are unique from source IDs;
- all audited internal references target the duplicate's remapped IDs;
- source reordering/navigation during hydration cannot cause a different chat to be cloned;
- incomplete hydration must fail visibly rather than produce an apparently valid partial copy;
- no forced DB flush on `visibilitychange` / `pagehide`;
- `flushServerDbKeepalive()` remains a no-op;
- targeted V3 plugin reload, runit, server-phone notification constraints, and current save/integrity optimizations remain untouched.

## Validation / acceptance

Required before `READY_TO_PORT`:

- direct PocketRisu reproduction or code-path proof that partial hydration can reach duplication;
- fixture with N total messages but only a tail/window initially materialized; duplicate must contain all N;
- source and duplicate message IDs must be disjoint;
- bookmarks/references must resolve to the duplicate's corresponding messages;
- branch/stream/transient runtime state must be reset according to current PocketRisu semantics;
- reorder/select another chat while hydration is pending; operation must duplicate the originally identified source or abort;
- hydration/read failure must leave source and chat list unchanged and create no partial durable duplicate;
- desktop/mobile entry points must share the same duplication helper or equivalent postconditions.

## Risk / blast radius

Risk is `MEDIUM`. A wrong implementation can silently omit history, duplicate the wrong chat, or corrupt references, but the feature can remain isolated to the duplication path and reverted without storage migration. Full hydration may create a temporary memory/latency spike for very large chats; validation should measure this and preserve a visible failure path rather than silently falling back to a shallow clone.

## Rollback / fallback

Rollback is a normal feature revert because no schema migration is proposed. If full hydration is unavailable or fails, the safe fallback is to abort duplication with an actionable error, not to create a partial copy. Tests should ensure failed attempts leave no inserted chat or half-persisted messages.

## Dependencies

- concrete PocketRisu duplication/copy owner audit;
- stable chat/message identity contract;
- authoritative lazy-message hydration owner, if partial hydration exists;
- inventory of duplicate-local references that use chat/message IDs.

## PR decomposition

1. `CHAT-COMPLETE-DUPLICATION-SNAPSHOT-TESTS`: owner inventory + regression fixtures/postconditions only.
2. `CHAT-COMPLETE-DUPLICATION-SNAPSHOT-HYDRATE`: stable-identity full hydration + fail-closed completeness guard, if needed.
3. `CHAT-COMPLETE-DUPLICATION-SNAPSHOT-IDS`: fresh ID generation and audited reference remapping.

Each slice stays one feature/branch/PR. Do not mix backup/restore or broader storage architecture work.