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

The existing Risu-family backlog already tracks active-chat paging/compaction with absolute positions and non-destructive partial pages. TripleHwang/RisuVault added strong regression evidence that a bounded history window also needs a bounded *loader state machine*, not only a bounded DOM window.

Evidence:

- `TripleHwang/RisuVault@12a158587f0308bf6be78d0ad7da09dbba2e1b68` caps automatic viewport-fill attempts and fails closed when the backend keeps claiming older history without viewport progress.
- The same change resets failed/loading state when the chat/history key changes.
- Follow-up commits `98cfdc7eaa4843dad7b3778c8197aa2ba2b0a2ab`, `b5e26542643de38011ea59c736d5cf86de6dc443`, and `e4970c23be27bb2e7ac86106004eb26851c75074` isolate concurrent loads, preserve prepend boundaries, and make retry contingent on a usable scroll surface.
- `TripleHwang/RisuVault@99926936c486963ce9f77ff8af19e91b7b1e237b` is concrete stale-window evidence: validating reverse pages against totals captured when the chat opened made every older-page fetch fail after one new message. The fix validates continuity using the server-echoed cursor, refreshes counters from each page, keeps `nextPosition` monotonic rather than blindly replacing it with a lower committed-row value, gives older-page loads a distinct in-flight key, chains them after initial hydration, registers in-flight state before synchronous failure can occur, and logs page/window counters without message contents.

This evidence is merged into the existing PocketRisu idea rather than creating a duplicate paging feature.

## Minimal safe scope

First implementation slice, if current PocketRisu architecture proves it applicable:

1. Introduce a pure controller around existing older-history loading only.
2. Serialize one reverse-load at a time and distinguish initial hydration from prepend/history requests.
3. Give automatic viewport fill a hard attempt budget.
4. Require observable progress between automatic loads (older boundary moved, mounted range grew, cursor advanced, or scrollability changed).
5. Validate page continuity against the authoritative response cursor/boundary, not a stale total captured at chat-open time.
6. Refresh derived window counters after each accepted page while preserving monotonic position allocation.
7. Reset transient failed/in-flight state on chat identity change.
8. Keep manual retry separate from automatic fill.

Do **not** introduce a new storage schema, message migration, or destructive compaction in this slice.

## Ownership boundaries

- UI/chat screen owns viewport/scrollability observations.
- Chat-window layer owns mounted range and prepend-anchor preservation.
- Persistence/server layer owns authoritative `hasOlder`, echoed cursor/boundary, committed row positions, and page retrieval semantics.
- Controller owns serialization, request-kind separation, attempt budget, stale-chat rejection, progress detection, and failure state.

## Mechanism

Use a small state machine keyed by stable chat identity plus history-window revision. Each load captures the key/revision; stale completions must not mutate the newly selected chat. Automatic fill loops only while the viewport still needs data, authoritative older history exists, the attempt budget remains, and each successful load demonstrates progress.

Continuity rules:

- accept/reject a page using the server-echoed cursor/boundary and canonical message positions rather than a stale chat-open total;
- update window counters from accepted page metadata;
- never move the local next-position allocator backwards merely because the committed server window reports a lower next position while local uncommitted messages exist;
- only canonical-position messages count toward terminal committed coverage;
- an initial hydration and a reverse prepend have distinct in-flight identities so one cannot replace the other's message list;
- register an in-flight entry before work that can throw synchronously, and clear it deterministically on completion/failure.

A non-progressing backend response is treated as failure rather than an infinite loop.

## Compatibility / invariants

- No forced DB flush on `visibilitychange` / `pagehide`.
- Preserve `flushServerDbKeepalive()` no-op.
- Preserve current save/integrity optimizations.
- Character/chat switches reject stale async completions.
- Message absolute positions and prepend anchors remain stable.
- Existing search/edit/navigation/plugin semantics must not observe duplicated or reordered messages.
- Manual retry cannot resurrect a request belonging to a previous chat key.
- A local uncommitted message cannot make committed history appear terminal.
- History diagnostics may log counters/ids/boundaries needed for debugging, but not message contents.

## Validation / acceptance

Before implementation, reproduce or instrument the current PocketRisu path and establish baseline behavior.

Focused tests must cover:

- backend reports `hasOlder=true` but returns no range progress;
- one reverse load already in flight while another trigger fires;
- initial hydration overlaps a reverse prepend;
- rapid A → B → A chat switching with delayed completions;
- append a new local message after opening a chat, then load older history successfully without stale-total rejection;
- prepend keeps the same visible anchor;
- initial short history fills until scrollable, then stops;
- automatic fill stops at its budget and exposes retryable failure;
- manual retry succeeds after a transient failure;
- a synchronous request failure does not leave a permanently cached rejected in-flight promise;
- no duplicate message IDs/absolute positions across page boundaries;
- a lower server `nextPosition` cannot cause reuse of a locally minted higher position;
- noncanonical local messages do not falsely satisfy terminal committed coverage.

Acceptance: bounded number of automatic loads, no stale cross-chat mutation, continuous history with stable anchors, monotonic position ownership, and no regression to full-chat materialization.

## Risk / blast radius

Risk is MEDIUM because chat navigation and message-window continuity are core UX. The first slice is contained by avoiding storage/schema changes and wrapping only the loader orchestration.

## Rollback / fallback

The controller must be removable without changing persisted data. Fallback is the current PocketRisu history-loading behavior. If progress detection, cursor validation, position allocation, or anchor restoration differs from baseline expectations, stop and investigate rather than broadening the patch.

## Dependencies / PR decomposition

1. INSPECT_ONLY: locate current PocketRisu history/window ownership and measure current behavior.
2. Tests/instrumentation proving the failure mode or missing invariant.
3. One isolated PR: pure bounded loader controller + integration at the existing reverse-load boundary.
4. Any storage/paging architecture work remains a separate feature/PR.
