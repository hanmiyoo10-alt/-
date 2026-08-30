# STABLE-LAST-ACTIVE-CHARACTER-RESTORE

## Status

`ADOPTED` — preserve as a PocketRisu navigation/bootstrap invariant.

## Problem / evidence

Browser or Android WebView lifecycle can recreate the page and lose the in-memory selected character. Persisting a mutable character-array index is unsafe because reorder/import/delete can change index meaning between sessions. Restoring by directly assigning reactive selection state is also unsafe because PocketRisu's canonical `changeChar()` path owns chat hydration, toggle loading, and related UI initialization.

Evidence: `PocketRisu/PocketRisu@000dd8baf383200ecb180490d2c063ebdd11c004`; the current personal fork `hanmiyoo10-alt/PocketRisu:develop` retains the same mechanism.

## Minimal safe scope

Remember only the stable character `chaId` after a successful canonical selection. On boot, begin from the normal deselected state, resolve that id against the current database, and invoke the canonical selection function if a live match exists. Explicit deselection removes the stored restoration intent.

## Ownership boundaries

- `chaId`: durable identity authority.
- character array index: ephemeral lookup result only.
- `changeChar()`: selection/hydration/toggle/UI transition authority.
- `deselectCharacter()`: explicit user-intent authority for clearing both current selection and restoration intent.
- localStorage: best-effort hint only; never authoritative database state and never a boot blocker.

## Mechanism

1. After canonical successful character selection, store `char.chaId` best-effort.
2. Explicit deselection removes the stored id and sets the selected state to none.
3. Boot sets the normal clean `selectedCharID = -1` state first.
4. Read the stored id best-effort and find its current character index by `chaId`.
5. If found, defer restoration until the normal boot boundary and call `changeChar(index)`.
6. Missing/stale ids and localStorage exceptions fail open to the clean deselected state.

## Compatibility / invariants

- Never persist or restore by array index.
- Never bypass `changeChar()` by assigning selected state directly for restoration.
- Explicit deselection must remain stronger than prior restore intent.
- A stale/missing id must not select a different character by fallback position.
- Restoration must remain best-effort and non-blocking.
- Existing lazy-chat hydration and toggle-loading ownership stays unchanged.
- No change to save/integrity behavior, DB flush boundaries, plugin reload, runit, or server-phone notification policy.

## Validation / acceptance

Acceptance cases:

- character reorder between sessions restores the same `chaId`;
- character deletion leaves the app cleanly deselected;
- explicit deselect then reload stays deselected;
- denied/broken localStorage does not block boot;
- placeholder/lazy chat still hydrates through the canonical selection path;
- rapid boot does not expose a false character selection before normal initialization;
- canonical selection writes the stable id only when a valid character exists.

## Risk / blast radius

Low. The state is a best-effort UI restoration hint and can be discarded without data loss. Main failure modes are wrong-character restoration or bypassing selection initialization; both are contained by stable-id lookup plus canonical transition ownership.

## Rollback / fallback

Remove/ignore the localStorage restoration hint and retain the normal clean deselected boot. No database migration or persisted user-data rewrite is required.

## Dependencies

None.

## PR decomposition

No implementation PR is required while the invariant remains adopted. If future navigation/bootstrap refactors disturb it, keep any repair to one isolated feature PR with regression tests for stable identity, explicit deselection, and canonical hydration.
