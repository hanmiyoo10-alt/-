# Upstream PR dossier — restore-last-active-chat

Feature-ID: `restore-last-active-chat`
Area: `shared`
PR status: `MERGED_UPSTREAM`
Isolation status: `ACCEPTED`
Deployment status: `UPSTREAM`

## Official PR result
- Repository: `PocketRisu/PocketRisu`
- PR: `#60` — `feat: restore last active chat after reload`
- Source head: `000dd8baf383200ecb180490d2c063ebdd11c004`
- Opened: `2026-08-14T17:47:06Z`
- Merged: `2026-08-23T06:48:22Z`
- Result: **MERGED directly upstream**

## Accepted behavior
The merged PR restores the last active character/chat after reload or mobile tab recreation while preserving PocketRisu's existing canonical `changeChar()` selection/hydration path.

Accepted scope:
1. Persist active character identity.
2. Restore after bootstrap/database loading completes.
3. Clear the saved value on deliberate Home/deselect.
4. Keep import/hotkey/selection paths consistent with the saved active character.
5. Fail safely to Home if storage is unavailable or the character no longer exists.

## Historical validation submitted upstream
- active chat → reload → same character/chat restored;
- active chat → intentional Home → reload → remains Home;
- `pnpm check`: 0 errors (pre-existing accessibility warnings only);
- production build succeeded.

## Historical touch set
- `src/lib/Mobile/MobileHeader.svelte`
- `src/lib/SideBars/Sidebar.svelte`
- `src/ts/bootstrap.ts`
- `src/ts/characterCards.ts`
- `src/ts/characters.ts`
- `src/ts/hotkey.ts`

## Boundaries
Do not mix later session/write-lock, notification, DB/save, plugin reload, or Termux server wiring into this already-merged feature history. Any future regression/follow-up gets its own Feature-ID unless it is a direct minimal fix to the accepted behavior.

## Review / PR state
- official upstream PR #60: **MERGED**
- rebuild plan: **NO LONGER NEEDED**
- historical source branch/commit remains evidence only.
