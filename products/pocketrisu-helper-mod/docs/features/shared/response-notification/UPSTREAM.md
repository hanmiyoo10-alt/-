# Upstream PR dossier — response-notification

Feature-ID: `response-notification`
Area: `shared`
PR status: `PR_READY_REBUILD`
Isolation status: `REBUILD_PLAN_ISOLATED`
Deployment status: `NOT_READY`

## Problem / motivation
Provide a reliable response-completion signal for self-hosted/mobile users without coupling PocketRisu core to a particular Android/Termux notification implementation.

## Legacy evidence
The working implementation was developed across the PocketRisu process/completion path and Node/self-host notification bridge while other local modifications were present. It is not represented by one clean historical Git commit. Treat the current local behavior and the feature README as behavioral evidence, not as a cherry-pick source.

Known legacy touch areas:
- `src/ts/process/index.svelte.ts` — assistant response/generation completion boundary.
- `server/node/server.cjs` — local/self-host transport endpoint or bridge-side handling.
- main-phone Termux notification relay — deployment-specific and **not** part of an upstream code PR.

## Minimal upstream scope
Add only a generic, optional, failure-isolated response-completion event/hook at the canonical successful completion boundary. Keep Termux/Android relay, phone audio policy and local network/token wiring outside the official upstream PR.

## Clean rebuild boundary
Split the feature into two layers.

### Upstream-capable core layer
1. Identify one canonical successful assistant-response completion point.
2. Emit/call a generic optional completion hook or self-host transport abstraction from that point.
3. Keep the hook failure non-fatal: notification delivery must never fail or corrupt generation/save.
4. Define exact semantics so one completed response produces at most one completion event.

### Local-only deployment layer
- Main-phone relay/tunnel.
- `termux-notification` invocation and notification IDs.
- Phone/earphone/audio policy.
- Local bridge token/network wiring.

The local-only layer stays in `main-notification-relay` / `audio-notification`; it must not leak into the official upstream PR.

## Explicitly out of scope
Do not bundle:
- reconnect watcher;
- server-phone Android notifications;
- phone/earphone sound fixes;
- DB/save optimization;
- session/write-lock changes;
- unrelated generation lifecycle refactors.

## Dependencies
Upstream core should depend only on the existing generation completion lifecycle and, if appropriate, an existing generic self-host event/webhook abstraction.

Local deployment may depend on `main-notification-relay`, but that dependency is not required for upstream acceptance.

## Verification evidence
The current local setup has demonstrated real main-phone completion notifications. For upstream reconstruction, acceptance is the exactly-once/non-fatal regression matrix below plus proof that no Termux/Android-specific code is included in the source PR.

## Rebuild test plan
- One normal completed assistant response -> exactly one completion event.
- Streaming response -> event only after final completion, not per chunk.
- Retry/regenerate -> one event per actually completed response.
- User stop/cancel before completion -> no false success event unless upstream explicitly defines a separate cancelled event.
- Provider/request error -> notification hook failure does not mask the original error.
- Completion transport unavailable -> generation/save still succeeds normally.
- Multiple chats/tabs -> event exposes only minimal generic context; no private conversation body is sent by default.
- Local relay integration -> main phone receives event; server phone creates no Android notification.

## Privacy/security boundary
Do not send full chat text, auth secrets, tokens or DB content merely to produce a completion notification. Prefer minimal metadata or an event with no conversation content.

## PR construction recipe
1. Create fresh `feat/response-notification` from latest official upstream.
2. Inspect the current canonical response-completion path first.
3. Add the smallest generic completion hook/transport interface possible.
4. Add focused tests for exactly-once and non-fatal behavior.
5. Keep Termux/Android relay code out of the diff.
6. Demonstrate local relay compatibility separately in this helper repo.

## Upstream pitch
A generic, failure-isolated response-completion hook improves self-host integrations without imposing Android/Termux behavior on normal RisuAI/PocketRisu users.

## Review / PR state
- dossier reconstruction: COMPLETE
- historical mixed Git split: NOT REQUIRED
- local Android relay: LOCAL_ONLY
- next action: rebuild only the generic completion-event layer on the then-current upstream base; keep phone wiring separate.
