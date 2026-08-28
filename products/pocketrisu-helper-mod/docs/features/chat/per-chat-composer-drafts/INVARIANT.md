# Per-chat composer drafts — adopted invariant

Feature-ID: `PER-CHAT-COMPOSER-DRAFTS`
Status: `ADOPTED`

## Problem / evidence

Historical evidence: `seto-sama/PocketRisu-Kei` commit `8e2a0ad8685ca494a65419e5a0d66932e957f802` demonstrates that unsent composer text should survive chat/view remounts without becoming part of authoritative sent-message history. It also demonstrates the race where a delayed save can otherwise resurrect a draft after send/remove.

Current `hanmiyoo10-alt/PocketRisu:main` already implements this feature family in `src/lib/ChatScreens/DefaultChatScreen.svelte` and `src/ts/storage/chatDraft`.

## Ownership boundaries

- Composer draft storage owns only unsent, device/session-local auxiliary text.
- The authoritative chat message body owns sent conversation history.
- Backup/import must not treat local drafts as authoritative chat content.
- Draft-specific persistence is not the DB lifecycle flush mechanism; `flushServerDbKeepalive()` remains no-op and no forced full DB flush is added to `visibilitychange` or `pagehide`.

## Required mechanism / invariants

1. Key drafts by stable character + chat identity, never current UI index alone.
2. Coalesce typing writes and serialize mutations per draft key.
3. A later remove/send must win over any earlier slow save.
4. Async draft load must not overwrite text typed after the load began.
5. Successful send / consumed command removes the prior draft.
6. New typing after send can create a new draft normally.
7. Orphan drafts are reclaimable without scanning them into authoritative chat state.
8. Backup/import cannot resurrect stale local drafts.

## Validation / acceptance

- A/B chat isolation.
- slow-save -> remove ordering.
- save commits but response is lost -> remove still deletes.
- async load versus fresh typing.
- delete chat/character -> orphan cleanup.
- import/backup boundary.
- guardrail check: no full DB flush on visibility/pagehide; no change to `flushServerDbKeepalive()`.

## Risk / blast radius

Low while preserving current implementation. Regressions can lose unsent text, resurrect sent text as a draft, or leak a draft between chats.

## Rollback / fallback

If a future draft refactor fails, disable only auxiliary draft persistence and preserve authoritative chat/save behavior. Never repair draft problems by broadening DB flush behavior.

## Follow-up

No implementation branch is required: this is already adopted. Any future change touching composer draft storage must reference this Feature-ID and retain the tests above.
