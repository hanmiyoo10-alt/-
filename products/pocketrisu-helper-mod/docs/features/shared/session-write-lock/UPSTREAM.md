# Upstream PR dossier — session-write-lock

Feature-ID: `session-write-lock`
Area: `shared`
PR status: `PR_READY_REBUILD`
Isolation status: `REBUILD_PLAN_ISOLATED`
Deployment status: `NOT_READY`

## Problem / motivation
Prevent a stale/background/restored tab from silently taking cross-device write ownership merely because it performs automatic housekeeping, while still allowing the actively used session to take the writer lock when a real user action leads to a write.

## Legacy evidence
This feature exists in the current local PocketRisu server/client working implementation but was developed together with other Node/self-host changes and is not represented by one clean Git commit. Rebuild from the documented invariants and current upstream session/write APIs rather than trying to split old history.

Known client touch area:
- `src/ts/storage/nodeStorage.ts`

Known server touch area:
- `server/node/server.cjs` session registration/write-lock policy.

Observed client primitives from the verified local implementation:
- per-tab `sessionId` persisted in `sessionStorage` under `risu-writer-session-id`;
- `sessionInitialized` / `sessionPending` guarding `/api/session` initialization;
- `x-session-id` on Node storage requests;
- recent-user-gesture tracking with a bounded window (local implementation used 15 seconds);
- `x-user-active` only when a write follows a real recent user gesture.

Observed server semantics:
- `/api/session` registers a client session boot;
- writer ownership is associated with client session identity;
- automatic/background writes must not steal ownership from the actually active writer;
- a newly active user-driven session may take ownership according to the lock policy;
- stale writer status can be surfaced without treating a logical client-session boot as a Node server restart.

## Minimal upstream scope
Define and implement the smallest end-to-end client/server writer-lock protocol needed to distinguish background automatic writes from real user-active writes, with stable per-tab session identity and stale-session protection. Keep browser-runtime diagnostics and general auth redesign outside the feature.

## Clean rebuild boundary
### Client contract
1. Give each browser tab/session a stable per-tab identity that survives reload/OS restoration of the same tab when platform storage permits it.
2. Send that identity with Node/self-host storage operations that participate in writer ownership.
3. Mark only writes following a real user gesture as user-active; timers, boot housekeeping, background persistence and visibility/page lifecycle work must not count as activity.
4. Preserve retry-safe session initialization: failed `/api/session` initialization may retry without minting false writer activity.

### Server contract
1. Register logical client sessions separately from Node process lifetime.
2. Do not transfer writer ownership merely because a client session registers/boots.
3. Transfer/take over writer ownership only under the explicit user-active write policy.
4. Detect/report stale sessions consistently so an outdated in-memory DB does not overwrite a newer writer's state.
5. Keep auth/session-cookie behavior separate from writer-lock policy where practical.

## Explicitly out of scope
Do not bundle:
- Firefox/Android runtime-recreation diagnostics;
- response notifications;
- reconnect watcher;
- DB hash/clone/ETag optimization;
- forced save/flush on `visibilitychange` or `pagehide`;
- general authentication redesign.

The current investigation into why Firefox may recreate the JS runtime while visually restoring the same tab is a diagnostic follow-up, not a prerequisite for reconstructing the lock protocol.

## Critical guardrail
Do **not** reintroduce forced full DB flushes or writer-lock movement from hide/pagehide/background housekeeping. The local `flushServerDbKeepalive()` no-op policy must not be silently reversed as part of this feature.

## Dependencies
- Current Node/self-host auth/session request path.
- Storage write endpoints capable of receiving session/activity metadata.
- Existing stale/ETag/database consistency behavior.

## Verification evidence
The verified local implementation has shown the intended per-tab identity, `/api/session`, user-gesture gating and writer-lock behavior in real use. Rebuild acceptance is the explicit background-vs-user-active and stale-session regression matrix below; the Firefox runtime-recreation investigation remains separate.

## Rebuild test plan
- Same tab normal reload -> per-tab identity remains stable when `sessionStorage` survives.
- New tab -> receives a distinct identity.
- Background tab automatic write/housekeeping -> does not steal writer ownership.
- Active tab user gesture followed by write -> may take ownership according to policy.
- User gesture window expires -> later automatic write is not marked active.
- Another device writes -> old session is reported stale before it can overwrite newer state.
- `/api/session` network failure -> retry works and does not create false activity.
- Multiple concurrent `initSession()` callers -> one pending initialization, no duplicate race.
- Logical `Session boot registered` -> does not imply/relabel a Node server process restart.
- Auth failure remains auth failure; lock logic must not bypass authentication.
- Restart/server recovery -> session/lock behavior is deterministic and DB integrity preserved.

## PR construction recipe
1. Create fresh `feat/session-write-lock` from latest official upstream.
2. Inspect current Node/self-host session/auth and write endpoints; document the exact protocol before editing.
3. Implement/restore stable client session identity and request headers with focused tests.
4. Implement server writer-lock transition rules with explicit tests for background vs user-active writes.
5. Add stale-state regression coverage.
6. Verify no visibility/pagehide full-flush behavior is introduced.
7. Keep Firefox runtime-recreation instrumentation out of the production PR unless it becomes a separately justified feature.

## Possible upstream PR split
If the full client/server diff is too large for review, split without breaking Feature-ID ownership:
- PR A: session identity + request metadata contract.
- PR B: server writer-lock transition/stale policy using PR A.

Both remain part of this feature dossier, but each upstream PR must be independently testable and clearly dependent on the prior one.

## Upstream pitch
Safer Node/self-host multi-device editing: background/restored tabs cannot silently become the writer just because they perform automatic work, while real user-driven writes can still take control predictably.

## Review / PR state
- dossier reconstruction: COMPLETE
- legacy Git-history surgery: NOT REQUIRED
- Firefox sessionInitialized/runtime-recreation investigation: SEPARATE_DIAGNOSTIC
- next action: rebuild protocol from latest upstream Node storage/session APIs and run the background-vs-user-active regression matrix.
