# Feature design — bounded continuous chat history loading

Status: **DESIGN_NEEDED**

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: PocketRisu current chat-window/storage ownership audit; direct reproduction/measurement before implementation
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

## Problem / evidence

The existing Risu-family backlog already tracks active-chat paging/compaction with absolute positions and non-destructive partial pages. TripleHwang/RisuVault adds strong regression evidence that a bounded history window also needs a bounded *loader state machine* and a precise client/server cursor contract.

Evidence:

- `TripleHwang/RisuVault@12a158587f0308bf6be78d0ad7da09dbba2e1b68` caps automatic viewport-fill attempts and fails closed when the backend keeps claiming older history without viewport progress.
- Follow-ups `98cfdc7eaa4843dad7b3778c8197aa2ba2b0a2ab`, `b5e26542643de38011ea59c736d5cf86de6dc443`, and `e4970c23be27bb2e7ac86106004eb26851c75074` isolate concurrent loads, preserve prepend boundaries, and make retry contingent on a usable scroll surface.
- `TripleHwang/RisuVault@99926936c486963ce9f77ff8af19e91b7b1e237b` demonstrates stale-window failure when reverse pages are validated against totals captured at chat-open time rather than server-echoed cursor state.
- `TripleHwang/RisuVault@08f84acc326d2288f2895f06e5aead17dc1ead1a` demonstrates a contract mismatch where terminal pages were rejected because client fixtures expected `null` while the real server returned a lowest position. The fix pins one canonical meaning: terminal `null` means there is nothing more to fetch, while compatibility accepts the older terminal shape during transition. It also handles tied message positions without splitting a tie group, while duplicate IDs remain the identity guard.
- `TripleHwang/RisuVault@a494f246e88b7617e43c58bd9bf047f3c101e6d7` demonstrates that global database revision is too broad a seam guard for chat hydration: unrelated writes can abort an unchanged chat. The replacement compares state actually shared by the two reads (chat message count) and degrades safely when that derived counter drifts rather than permanently emptying the chat.

This evidence is merged into the existing PocketRisu idea rather than creating duplicate paging or hydration features.

## Minimal safe scope

First implementation slice, if current PocketRisu architecture proves it applicable:

1. Introduce a pure controller around existing older-history loading only.
2. Serialize one reverse-load at a time and distinguish initial hydration from prepend/history requests.
3. Give automatic viewport fill a hard attempt budget.
4. Require observable progress between automatic loads.
5. Define one canonical terminal cursor contract and keep temporary compatibility only where needed.
6. Validate page continuity against authoritative response cursor/boundary, not a stale chat-open total or unrelated global DB revision.
7. Allow tied canonical positions only when identity remains unambiguous; never create duplicate message IDs.
8. Reset transient failed/in-flight state on chat identity change; keep manual retry separate from automatic fill.

Do **not** introduce a new storage schema, message migration, or destructive compaction in this slice.

## Ownership boundaries

- UI/chat screen owns viewport/scrollability observations.
- Chat-window layer owns mounted range and prepend-anchor preservation.
- Persistence/server layer owns authoritative `hasOlder`, terminal cursor semantics, committed positions, and page retrieval semantics.
- Hydration consistency checks may compare only state actually shared by the reads being stitched together; unrelated global revisions must not reject a stable chat.
- Controller owns serialization, request-kind separation, attempt budget, stale-chat rejection, progress detection, and failure state.

## Mechanism

Use a small state machine keyed by stable chat identity plus history-window revision. Each load captures the key/revision; stale completions must not mutate the newly selected chat. Automatic fill loops only while the viewport still needs data, authoritative older history exists, the attempt budget remains, and each successful load demonstrates progress.

Continuity rules:

- one documented terminal-cursor meaning; fixtures must be generated from or validated against the real server contract;
- accept/reject a page using server-echoed cursor/boundary and canonical message identity rather than stale totals;
- tied positions are consumed as an indivisible boundary group or otherwise represented by a stable secondary key;
- update window counters from accepted page metadata without moving local position allocation backwards;
- initial hydration and reverse prepend have distinct in-flight identities;
- register in-flight state before work that can throw synchronously, and clear it deterministically;
- when hydration stitches reads from separate transactions, compare a chat-scoped invariant; if the invariant is advisory/derived and drifts, degrade to a safe internally-consistent page rather than permanently locking the chat out.

A non-progressing backend response is treated as failure rather than an infinite loop.

## Compatibility / invariants

- No forced DB flush on `visibilitychange` / `pagehide`.
- Preserve `flushServerDbKeepalive()` no-op.
- Preserve current save/integrity optimizations.
- Character/chat switches reject stale async completions.
- Message absolute positions and prepend anchors remain stable.
- Existing search/edit/navigation/plugin semantics must not observe duplicated or reordered messages.
- Manual retry cannot resurrect a request belonging to a previous chat key.
- Unrelated writes in other chats/plugins/autosave must not invalidate an unchanged chat solely through a global revision counter.
- History diagnostics may log counters/ids/boundaries needed for debugging, but not message contents.

## Validation / acceptance

Before implementation, reproduce or instrument the current PocketRisu path and establish baseline behavior.

Focused tests must cover:

- backend reports `hasOlder=true` but returns no range progress;
- one reverse load already in flight while another trigger fires;
- initial hydration overlaps a reverse prepend;
- rapid A → B → A chat switching with delayed completions;
- append a new local message after opening a chat, then load older history successfully;
- terminal page reaches the oldest message using the real server response shape;
- compatibility between cached-old-client/new-server and new-client/old-server terminal shapes if such mixed deployment is supported;
- several messages share one position: page boundary does not lose/split identity and no duplicates appear;
- unrelated chat/plugin/autosave commits occur between body and page reads without aborting an unchanged target chat;
- genuinely changed target chat still triggers the intended consistency path;
- prepend keeps the same visible anchor;
- automatic fill stops at its budget and exposes retryable failure;
- synchronous request failure does not leave a permanently cached rejected in-flight promise.

Acceptance: bounded automatic loads, no stale cross-chat mutation, real client/server cursor-contract parity, stable anchors, no global-revision false aborts, and no regression to full-chat materialization.

## Risk / blast radius

Risk is MEDIUM because chat navigation and message-window continuity are core UX. The first slice is contained by avoiding storage/schema changes and wrapping only loader/hydration orchestration.

## Rollback / fallback

The controller must be removable without changing persisted data. Fallback is current PocketRisu history-loading behavior. If cursor validation, tie handling, hydration consistency, or anchor restoration differs from baseline expectations, stop and investigate rather than broadening the patch.

## Dependencies / PR decomposition

1. INSPECT_ONLY: locate current PocketRisu history/window ownership and current client/server terminal cursor contract.
2. Add contract tests that execute the real response validator against server-produced fixtures.
3. Add a regression test showing whether unrelated writes can invalidate current hydration.
4. One isolated PR only after reproduction: bounded loader/contract fix at the existing reverse-load boundary.
5. Any storage/paging architecture work remains a separate feature/PR.
