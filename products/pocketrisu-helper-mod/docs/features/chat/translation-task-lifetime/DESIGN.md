# Feature-ID: CHAT-TRANSLATION-TASK-LIFETIME

Status: **DESIGN_NEEDED**

## Problem / evidence

Historical evidence: `seto-sama/PocketRisu-Kei` commit `e8822c4f3044c0c836360d275de13f87dd497660` fixes LLM translation loading/task state being lost when the message body remounts. The source keeps an in-flight translation task in a shared registry keyed by a stable message/swipe identity and lets a remounted component observe the existing task rather than starting a duplicate request.

Current `hanmiyoo10-alt/PocketRisu:main` inspection shows `src/lib/ChatScreens/ChatBody.svelte` owns `translating` locally and performs `translateHTML(...)` inside component-derived parsing. `Chat.svelte` also wraps `ChatBody` in a keyed block. There is no observed shared translation-task owner or remount-stable pending identity in this path. This makes duplicate LLM translation work / lost loading state plausible when keyed remounts occur while translation is in flight.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: reproduce or unit-test a keyed `ChatBody` remount during a deferred LLM translation; confirm stable message/swipe cache key semantics
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

## Minimal safe scope

Only make LLM chat-message translation task identity and pending state survive a `ChatBody` remount for the same logical message/swipe. Do not redesign the translator, translation cache format, partial-edit ownership, or general chat rendering.

## Ownership boundaries

- Shared task registry: chat-render/translation boundary, module-scoped and browser-only.
- UI component: observes pending state and joins the existing promise/result for its stable translation key.
- Translator/cache: unchanged authority for translation execution and cached result.
- Persistence/server/system: unchanged.

## Proposed mechanism

1. Derive a stable translation-task key from immutable logical identity available to the rendered message (prefer chat/message UUID + swipe; do not use component instance identity).
2. Put only in-flight LLM translation promises/tasks in a small module-scoped map.
3. When a second/remounted component requests the same key, join the existing task instead of invoking `translateHTML` again.
4. Publish task-start/task-finish notifications so remounted UI can render the correct pending state.
5. Always remove the task entry in `finally`; failed/cancelled tasks must not leave a permanent busy state.
6. Do not share tasks across different chat/message/swipe identities or across incompatible translator/config/cache inputs.

## Compatibility / invariants

- Existing translation cache semantics remain authoritative.
- Manual retranslate must intentionally bypass or version the normal coalescing key so an explicit refresh is not silently swallowed.
- Changing chat/message/swipe must never join a prior message's task.
- No forced DB flush, no `pagehide`/`visibilitychange` persistence changes, no server-phone notification, no PM2/runtime change.
- Component unmount must not corrupt or cancel a task merely because another remounted observer still needs it.
- Failure/cancellation cannot strand the shared registry.

## Validation / acceptance

Required before `READY_TO_PORT`:

1. Deferred translation test: mount message A, start LLM translation, remount the same logical A before completion; `translateHTML` is called exactly once.
2. The remounted instance reports pending/loading until the original task completes.
3. Completion updates the cache/render path and the shared task entry is removed.
4. A different message/swipe does not join A's task.
5. Explicit retranslate still triggers the intended new translation.
6. Rejected/aborted translation clears pending state and a later retry can start normally.
7. No regression to non-LLM translator paths.

## Risk / blast radius

Localized chat translation UI/request coalescing. Main risks are an over-broad key causing cross-message result reuse, or stale task entries blocking later translation. Both are bounded by strict key ownership and `finally` cleanup.

## Rollback / fallback

The change should be one isolated feature branch/PR. Revert the shared task registry and return to component-local behavior; no persisted data or migration is involved.

## Dependencies / PR decomposition

First PR only:

- add a tiny translation-task owner/helper;
- wire one chat-message LLM translation path;
- add deferred-remount / different-key / failure cleanup tests.

Do not include partial-edit changes, translator refactors, cache migrations, or unrelated chat cleanup.

## Follow-up

After the reproduction/test proves the current failure mode and the stable key is confirmed, this can move to `READY_TO_PORT`. Until then, remain `DESIGN_NEEDED`.
