# Feature-ID: CHAT-EXPLICIT-TARGET-CONTEXT

## Status

Assistant-owned design draft. `DESIGN_NEEDED`; not implementation-authorized.

## Problem / evidence

When an operation targets a chat other than the currently selected chat, any helper that implicitly reads global/current-chat state can evaluate the wrong module lore, Lua trigger state, globals, or per-chat settings. HaejeokRisuai demonstrates this failure class across `c1289a3b9a5515fd9ae689270d92d961d77538ac`, `8d192f3dfe3f51ca3f63b49805c8567289391e50`, and `f982424e9dc542c4fed013f66fd5642593c53a3e`: target chat context is threaded explicitly into module/lore and trigger execution, missing targets are derived from target indexes rather than unrelated current selection, and branch switches snapshot/restore script state together with branch messages.

The transferable invariant is: **execution context belongs to the operation target, not to whatever chat happens to be globally active in the UI**.

## Minimal safe scope

Do not introduce a new branch system merely to port this pattern. First map any existing PocketRisu paths that can operate on a non-active chat, background chat, branch/timeline, queued generation target, or delayed async target. Add an explicit immutable target-context object only at a boundary where such divergence already exists or is being introduced.

## Ownership boundaries

- UI selection owns what the user is currently viewing; it is not authoritative for background operation context.
- Operation/request owner captures the target character/chat identity at start.
- Module/lore/script evaluation consumes the captured target context and must not silently fall back to current selection after async work begins.
- Branch/timeline owner snapshots branch-scoped mutable script/global state together with branch message state when branch semantics exist.
- Persistence remains authoritative for durable chat state; runtime snapshots are compatibility state, not a second durable database.

## Proposed mechanism

1. Define a small `ChatExecutionTarget`/equivalent containing stable character/chat identity and only the references/IDs required to resolve context.
2. Capture it once at operation start from explicit caller input; if legacy callers provide indexes, resolve those indexes immediately into the target.
3. Thread that context through module lorebook lookup, script/Lua trigger execution, local/global-variable lookup, and any other chat-scoped policy helper touched by the operation.
4. During async completion, revalidate that the captured target still exists and is the owner of the completion before applying state.
5. If branch/timeline semantics exist, snapshot branch-scoped script state when synchronizing the branch and restore it when activating that branch.
6. Legacy branch/state records that lack snapshots must use an explicit compatibility rule; do not manufacture empty state and overwrite the user's current state.
7. Avoid adding a generic fallback to global current-chat state inside low-level helpers. Compatibility fallback, if unavoidable, should live at one audited boundary.

## Compatibility / invariants

- Current-chat behavior remains unchanged when current and target are the same.
- Background/non-active target operations never read another chat's module lore, script globals, or local-variable mode merely because the user switched UI selection.
- Async operations cannot write their completion into a different chat after rapid switching.
- Legacy persisted records without new branch snapshots remain readable and do not have state erased by invented defaults.
- No changes to save flush behavior, `flushServerDbKeepalive()`, targeted V3 reload, runit, or server-phone notification policy.

## Validation / acceptance

- Construct two chats with deliberately different module lore, Lua/script globals, and local-variable settings.
- Start an operation targeting chat B while chat A is selected; every helper must observe B's context.
- Switch UI selection A→B→A during an async operation and verify completion stays scoped to the captured target or is rejected as stale.
- If branches exist, branch A and B maintain different script/global state and round-trip correctly across repeated switches.
- Legacy branch fixture with no snapshot fields preserves the defined compatibility state instead of being zeroed.
- Explicit target and index-derived target resolve to the same identity.
- Missing/deleted target fails visibly without falling back to current chat.

## Risk / blast radius

`MEDIUM`: target plumbing can cross multiple call sites, and a partial conversion can be worse than either old or new behavior by creating two competing context sources. The blast radius is contained by introducing the boundary only where PocketRisu already has non-active target semantics and by testing target/current divergence directly.

## Rollback / fallback

Keep the first slice additive and localized. If target-context propagation regresses behavior, revert the call-site slice and retain existing current-chat behavior; do not migrate persisted storage in the same PR. Branch snapshot fields, if later added, must be optional and backward-compatible so rollback does not make persisted data unreadable.

## Dependencies

- Identify a concrete PocketRisu path where operation target can differ from current UI selection, or wait until such a feature exists.
- Map module lore, script/Lua, global/local-variable, and async-completion ownership at that path.
- Define stable target identity and stale-completion rules.
- For branch snapshots, define which state is truly branch-scoped versus chat-global.

## PR decomposition

1. Pure target identity/context type + divergence tests around one existing operation; no persistence changes.
2. Thread target through one module/lore lookup boundary and remove any local implicit-current fallback there.
3. Thread target through one script/trigger boundary with stale completion checks.
4. Only if branch/timeline support exists: optional branch-scoped state snapshot fields + legacy compatibility tests.

Do not move to `READY_TO_PORT` until a concrete PocketRisu target-divergence owner is identified, dependencies are explicit, stale-completion behavior is testable, and no low-level helper can silently choose a conflicting global context.