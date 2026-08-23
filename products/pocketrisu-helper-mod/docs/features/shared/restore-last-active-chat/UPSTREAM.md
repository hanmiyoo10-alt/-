# Upstream PR dossier — restore-last-active-chat

Feature-ID: `restore-last-active-chat`
Area: `shared`
PR status: `PR_READY_REBUILD`
Isolation status: `REBUILD_PLAN_ISOLATED`
Deployment status: `NOT_READY`

## Problem / motivation
After reload/re-entry, restore the last active character/chat context instead of always returning to the home state, while preserving PocketRisu's normal character-selection initialization path.

## Legacy evidence
- Historical source branch: `feat/restore-last-active-chat`.
- Historical feature commit: `000dd8baf383200ecb180490d2c063ebdd11c004` (`feat: restore last active chat after reload`).
- Historical base: `85a65f3137b45c8de4a8d21a9887be213b1ac3fc`.
- The historical commit is one feature commit touching exactly six files, but the branch now diverges from current source main. Do **not** blindly cherry-pick it into a future upstream branch; use it as behavioral reference.

## Historical touch set
- `src/lib/Mobile/MobileHeader.svelte`
- `src/lib/SideBars/Sidebar.svelte`
- `src/ts/bootstrap.ts`
- `src/ts/characterCards.ts`
- `src/ts/characters.ts`
- `src/ts/hotkey.ts`

## Clean rebuild boundary
Rebuild from the latest official upstream base at PR time.

Required behavior only:
1. Persist the last active character by stable `chaId`, not array index.
2. Restore only after normal data load has completed.
3. Restore through the canonical `changeChar(...)` path so lazy chat hydration, UI initialization, toggles and normal selection side effects still run.
4. A deliberate return to home/deselect must clear the persisted last-active value.
5. Character-selection paths that immediately select a newly imported/downloaded character must update the persisted value.
6. Invalid/deleted character IDs must fail closed to normal home state.

Historical implementation used localStorage key `risu-last-active-character`; key naming may be changed during rebuild if upstream has a preferred persistence abstraction.

## Explicitly out of scope
Do not bundle:
- session/write-lock changes;
- notification relay changes;
- DB/save optimizations;
- plugin reload changes;
- Termux/mobile server wiring.

If current upstream already provides a preferred navigation/session persistence API, adapt to it rather than copying the old localStorage implementation literally.

## Dependencies
- Existing character identity (`chaId`).
- Canonical `changeChar(...)` selection flow.
- Current boot/load completion point.
- Existing home/deselect navigation paths.

No NodeOnly server dependency is required for the feature itself.

## Rebuild test plan
Minimum regression matrix:
- Clean first boot/no saved key -> home state remains selected.
- Select character A -> reload -> character A restores.
- Switch A -> B -> reload -> B restores.
- Explicit home/deselect -> reload -> home remains; old character does not resurrect.
- Saved character deleted before reload -> safe home fallback, no crash.
- Character list reordered -> restore still follows `chaId`, not old index.
- Newly imported/downloaded-and-selected character -> reload restores that character.
- Mobile header home path and desktop/sidebar home path both clear persisted selection.
- Hotkey/home navigation path clears persisted selection.
- Restored character still goes through normal lazy chat hydration/UI initialization.

## PR construction recipe
1. Create fresh branch from latest `PocketRisu/PocketRisu` target branch: `feat/restore-last-active-chat`.
2. Inspect current selection/navigation APIs before editing; do not copy obsolete line numbers.
3. Add the smallest persistence helper around character selection/deselection.
4. Add boot-time restore through canonical selection API.
5. Wire only the selection paths that bypass the canonical helper, if any remain in current upstream.
6. Add focused tests or deterministic manual regression evidence for the matrix above.
7. Confirm diff contains only this feature and its tests.

## Upstream pitch
Small UX continuity improvement, especially useful on mobile/self-hosted sessions. The feature is independent of PocketRisu's custom server stack when rebuilt around existing character/navigation APIs.

## Review / PR state
- dossier reconstruction: COMPLETE
- legacy Git-history surgery: NOT REQUIRED
- next action: when upstream submission is desired, rebuild this feature on the then-current official upstream base and run the regression matrix.
