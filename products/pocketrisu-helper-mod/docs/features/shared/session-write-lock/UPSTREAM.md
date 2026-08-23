# Upstream PR dossier — session-write-lock

Feature-ID: `session-write-lock`
Area: `shared`
PR status: `ALREADY_UPSTREAM`
Isolation status: `UPSTREAM_IMPLEMENTED`
Deployment status: `UPSTREAM_PRESENT`

## Official upstream status

This feature is already implemented in official `PocketRisu/PocketRisu` and must **not** be submitted as a duplicate PR.

- Official commit: `94353fa155b28a07f2d901a88df86587a7cb9a5d`
- Commit title: `fix: stop spurious cross-device session kicks with gesture-gated writer lock`
- Commit date: 2026-07-28
- Current official `main` still contains the protocol.

Confirmed official implementation includes:
- stable per-tab `sessionId` persisted through `sessionStorage` when available;
- `x-session-id` on Node/self-host requests;
- recent real-user-gesture tracking and `x-user-active` gating;
- deduplicated/retry-safe `/api/session` initialization;
- server-side `session-lock.cjs` state machine;
- registration that does not steal an existing writer lock;
- user-active takeover for a fresh session;
- stale-session rejection;
- side-effect-free `/api/session/lock-status`;
- focused session-lock tests, including background/automatic-write regression coverage.

The previous `PR_READY_REBUILD` classification was therefore incorrect. The candidate was discovered to be already upstream while preparing a new official PR on 2026-08-23. No duplicate source branch or official PR was created.

## Problem / motivation
Prevent a stale/background/restored tab from silently taking cross-device write ownership merely because it performs automatic housekeeping, while still allowing the actively used session to take the writer lock when a real user action leads to a write.

## Legacy evidence
The local PocketRisu implementation and the official upstream implementation share the same core contract. Historical local investigation remains useful for diagnostics, but this feature no longer needs an upstream rebuild dossier for submission.

Known client touch area:
- `src/ts/storage/nodeStorage.ts`

Known server touch area:
- `server/node/server.cjs`
- `server/node/session-lock.cjs`

## Minimal upstream scope
Already satisfied upstream: distinguish background automatic writes from real user-active writes, keep stable per-tab session identity, prevent page/session registration from stealing active writer ownership, and reject stale writers before they overwrite newer state.

Any future change must be based on a **new confirmed gap or regression** and should receive a new Feature-ID rather than reopening this feature as if it were absent upstream.

## Current upstream contract
### Client contract
1. Give each browser tab/session a stable per-tab identity that survives reload/OS restoration of the same tab when platform storage permits it.
2. Send that identity with Node/self-host storage operations that participate in writer ownership.
3. Mark only writes following a real user gesture as user-active; timers, boot housekeeping, background persistence and visibility/page lifecycle work must not count as activity.
4. Preserve retry-safe session initialization: failed `/api/session` initialization may retry without minting false writer activity.

### Server contract
1. Register logical client sessions separately from Node process lifetime.
2. Do not transfer writer ownership merely because a client session registers/boots.
3. Transfer/take over writer ownership only under the explicit user-active write policy for a fresh session.
4. Detect/report stale sessions consistently so an outdated in-memory DB does not overwrite a newer writer's state.
5. Keep lock-state inspection side-effect free.

## Explicitly out of scope
Do not bundle:
- Firefox/Android runtime-recreation diagnostics;
- response notifications;
- reconnect watcher;
- DB hash/clone/ETag optimization;
- forced save/flush on `visibilitychange` or `pagehide`;
- general authentication redesign.

The investigation into why Firefox may recreate the JS runtime while visually restoring the same tab remains a separate diagnostic topic.

## Critical guardrail
Do **not** use this already-upstream feature as justification to reintroduce forced full DB flushes or writer-lock movement from hide/pagehide/background housekeeping. Any separate save/flush change must be reviewed under its own Feature-ID.

## Dependencies
- Current Node/self-host auth/session request path.
- Storage write endpoints receiving session/activity metadata.
- Existing stale/database consistency behavior.

## Verification evidence
Official commit `94353fa155b28a07f2d901a88df86587a7cb9a5d` contains the server writer-lock state machine and regression tests, and official `main` currently contains the client session identity, user-gesture gating, session initialization and lock-status request path.

Previously documented local real-world observations remain useful as supplementary evidence but are not needed to justify another upstream PR.

## Regression matrix for future changes
- Same tab normal reload -> per-tab identity remains stable when `sessionStorage` survives.
- New tab -> receives a distinct identity.
- Background tab automatic write/housekeeping -> does not steal writer ownership.
- Active tab user gesture followed by write -> may take ownership according to policy.
- User gesture window expires -> later automatic write is not marked active.
- Another device writes -> old session is reported stale before it can overwrite newer state.
- `/api/session` network failure -> retry works and does not create false activity.
- Multiple concurrent `initSession()` callers -> one pending initialization, no duplicate race.
- Logical `Session boot registered` -> does not imply a Node server process restart.
- Auth failure remains auth failure; lock logic must not bypass authentication.
- Restart/server recovery -> session/lock behavior remains deterministic.

## Upstream pitch
Already accepted in substance by official upstream as a safer Node/self-host multi-device writer-lock protocol. No new pitch is required unless a distinct regression or missing behavior is discovered.

## Review / PR state
- official upstream implementation: `94353fa155b28a07f2d901a88df86587a7cb9a5d`
- duplicate PR submission: `DO_NOT_SUBMIT`
- previous rebuild classification: `SUPERSEDED`
- Firefox sessionInitialized/runtime-recreation investigation: `SEPARATE_DIAGNOSTIC`
- next action: remove `session-write-lock` from new-PR candidate lists; create a new Feature-ID only for a newly confirmed gap/regression.
