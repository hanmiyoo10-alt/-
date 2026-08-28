# CHAT-COMPLETE-DUPLICATION-SNAPSHOT

Status: `DESIGN_NEEDED`

## Problem / evidence

`nevaeh5379/HaejeokRisuai` commit `3dc4e9573e7739e6c061fe4e709088c9041c59fd` hardened chat duplication after introducing lazy/evicted chat messages. Follow-up commits `ad4d8ab40c4d2af60c04db4384b9caef304275ce` and `9729880ef9b4da7887e790c7ba7f2e294db1bacc` extend the same failure class to whole-character duplication with nested chats/messages and to imported chat durability.

The general failure mode is: duplicating the currently materialized runtime object can silently omit unloaded history/details, clone the wrong source after async hydration/reorder, retain source-owned durable identifiers, leave bookmarks/internal references pointing at the wrong identity domain, or create an import/duplicate that exists in memory but was never persisted through the authoritative owner.

Evidence is `MEDIUM`: credible code-level fixes and regression tests exist externally, but the same failure has not yet been directly reproduced in PocketRisu.

## Minimal safe scope

First slice is inspection/tests only unless PocketRisu already has a clearly bounded duplication/import owner:

1. identify every desktop/mobile/API path that duplicates or copies a chat or character and every path that imports a chat into durable state;
2. identify whether character details, chats, or messages can be partially hydrated at those points;
3. define completeness, stable-source-identity, identity-disjointness, remap, and durability postconditions;
4. add regression fixtures for partial hydration, reordering/removal during async hydration, reference remap, transient-state reset, nested duplicate persistence, and reload-after-import.

No storage-format migration, backup/restore change, or broad lazy-loading refactor belongs in this feature.

## Ownership boundaries

- chat/character list and UI commands initiate duplication but do not own snapshot completeness;
- hydration/message/character-store layers own authoritative materialization of source details/history;
- duplication helper owns stable source identity capture/revalidation, complete clone construction, fresh identities, and reference remapping;
- import parser owns bounded shape validation but must hand durable insertion to the authoritative persistence owner;
- persistence layer owns insertion of newly identified characters/chats/messages and must not share source persistence identity;
- plugin/reference consumers must be audited for any character/chat/message IDs that have duplicate-local semantics.

## Proposed mechanism

At duplication start, capture stable source character/chat identity and any authoritative expected message/detail completeness markers. Request full hydration through the existing owner. After every async boundary, re-find the source by stable durable identity rather than stale list index/object position. If the source disappeared, became ambiguous, or completeness cannot be proven, abort visibly without creating a partial durable object.

For character duplication, perform the same rule recursively across nested chats/messages: first prove character detail/chat completeness, then prove each nested chat's message completeness. Construct the duplicate only from the validated complete source. Assign a fresh character identity where applicable, fresh chat identities, and fresh message identities. Build old-to-new maps and remap duplicate-local references such as bookmarks. Explicitly clear branch, streaming, compaction, or other transient runtime ownership that should not cross into a new durable object.

For chat import, validate the parsed shape before insertion, assign fresh durable identity, and persist imported messages through the authoritative message owner before treating the import as complete. Runtime insertion alone is not success.

Persist each new durable object through the normal owner, then update UI selection only if the initiating character/chat context still permits it.

## Compatibility / invariants

- never truncate source character details/history because domains were cold/deferred/unloaded;
- source character/chat remains logically unchanged by duplication;
- duplicate character/chat/message durable identities are disjoint from the source identities;
- all audited duplicate-local references target the duplicate's remapped IDs;
- source reordering, removal, navigation, or hydration replacement cannot cause a different source object to be cloned;
- array/list index captured before an async boundary is never sufficient source authority afterward;
- incomplete or ambiguous hydration must fail visibly rather than produce an apparently valid partial copy;
- imported chats/messages must survive reload through authoritative persistence;
- desktop/mobile entry points should share the same helper or equivalent postconditions;
- no forced DB flush on `visibilitychange` / `pagehide`;
- `flushServerDbKeepalive()` remains a no-op;
- targeted V3 plugin reload, runit, server-phone notification constraints, and current save/integrity optimizations remain untouched.

## Validation / acceptance

Required before `READY_TO_PORT`:

- direct PocketRisu reproduction or code-path proof that partial hydration can reach character/chat duplication or that import can be runtime-only;
- fixture with deferred character details and nested chats where only a message tail/window is initially materialized; duplicate must contain the complete authoritative source;
- source and duplicate character/chat/message IDs must be disjoint as applicable;
- bookmarks/references must resolve to the duplicate's corresponding messages;
- branch/stream/transient runtime state must be reset according to current PocketRisu semantics;
- reorder/remove/select another character or chat while hydration is pending; operation must duplicate the originally identified source or abort;
- hydration/read failure must leave source/list unchanged and create no partial durable duplicate;
- persistence failure must not report success or leave a half-committed runtime-only duplicate;
- imported chat fixture must remain present with all messages after a full reload/reopen;
- malformed imported chat structures must be rejected before durable insertion;
- desktop/mobile entry points must share the same duplication helper or equivalent postconditions.

## Risk / blast radius

Risk is `MEDIUM`. A wrong implementation can silently omit history/details, duplicate the wrong source, collide identities, corrupt duplicate-local references, or create runtime-only objects that disappear after reload. The feature can remain isolated to duplication/import paths and reverted without storage migration. Full hydration may create a temporary memory/latency spike for very large characters/chats; validation should measure this and preserve a visible failure path rather than silently falling back to a shallow clone.

## Rollback / fallback

Rollback is a normal feature revert because no schema migration is proposed. If full hydration, stable source resolution, or authoritative persistence is unavailable or fails, the safe fallback is to abort with an actionable error, not to create a partial copy/import. Tests should ensure failed attempts leave no inserted character/chat or half-persisted messages.

## Dependencies

- concrete PocketRisu character/chat duplication and chat-import owner audit;
- stable character/chat/message identity contract;
- authoritative lazy character-detail/message hydration owner, if partial hydration exists;
- inventory of duplicate-local references that use character/chat/message IDs;
- authoritative persistence owner for imported/duplicated nested messages.

## PR decomposition

1. `CHAT-COMPLETE-DUPLICATION-SNAPSHOT-TESTS`: owner inventory + regression fixtures/postconditions for chat/character duplication and import durability only.
2. `CHAT-COMPLETE-DUPLICATION-SNAPSHOT-HYDRATE`: stable-identity recursive full hydration + fail-closed completeness guard, if needed.
3. `CHAT-COMPLETE-DUPLICATION-SNAPSHOT-IDS`: fresh identity generation and audited reference remapping.
4. `CHAT-COMPLETE-DUPLICATION-SNAPSHOT-PERSIST`: authoritative nested-message/import persistence only if current PocketRisu paths prove runtime-only insertion is reachable.

Each slice stays one feature/branch/PR. Do not mix backup/restore or broader storage architecture work.