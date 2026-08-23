# Upstream PR dossier — plugin-targeted-reload

Feature-ID: `plugin-targeted-reload`
Area: `shared`
PR status: `PR_READY_REBUILD`
Isolation status: `REBUILD_PLAN_ISOLATED`
Deployment status: `NOT_READY`

## Problem / motivation
When a single V3 plugin is installed/updated/reloaded, avoid tearing down and rebuilding the entire plugin runtime if only that plugin's runtime state needs replacement.

## Legacy evidence
The working local implementation evolved while other plugin/update changes were present, so there is no single clean historical commit to cherry-pick. The stable feature boundary is known from the current code architecture and project history.

Known touch areas:
- `src/ts/plugins/apiV3/v3.svelte.ts`
- `src/ts/plugins/plugins.svelte.ts`

The old mixed history must not be split surgically; rebuild the behavior on current upstream APIs.

## Minimal upstream scope
Add a targeted V3 reload path that tears down and reinitializes only the changed plugin while preserving unrelated V2/V3 runtime state. Keep persistence-order fixes, fetch fallback work and NodeOnly save changes outside this PR unless already provided by upstream.

## Clean rebuild boundary
Required behavior only:
1. Identify the exact V3 plugin instance/runtime by stable plugin identity.
2. Tear down/unregister only that plugin's V3-owned runtime resources.
3. Load/reinitialize only the changed V3 plugin.
4. Preserve unrelated V2/V3 plugin runtime state and avoid full `loadPlugins()` unless a safe targeted fallback is impossible.
5. Ensure failed targeted reload leaves a defined recovery path, not a half-registered plugin.

## Persistence ordering invariant
Plugin runtime must never be refreshed from a version that has not been durably persisted yet.

If current upstream update/install flow still starts reload before persistence completion, treat that as a **separate Feature-ID** (recommended: `plugin-update-persistence-order`) rather than silently bundling an unrelated save-flow refactor into this PR. This feature may depend on that prerequisite, but must remain independently reviewable.

## Explicitly out of scope
Do not bundle:
- NodeOnly DB/save optimization;
- plugin download/fetch fallback changes;
- generic plugin updater redesign;
- response notifications;
- session/write-lock logic;
- unrelated V2 plugin behavior changes.

## Dependencies
- Current V3 plugin registry/owner cleanup APIs.
- Stable plugin identity used by install/update/reload paths.
- Existing plugin persistence contract.

If persistence ordering requires code changes, create/land the separate prerequisite first.

## Verification evidence
Legacy project verification established the intended targeted-reload behavior as an active local feature. At rebuild time, the authoritative acceptance evidence is the regression matrix below, especially unrelated-plugin preservation, cleanup of plugin-owned registrations, and restart persistence.

## Rebuild test plan
- Update one V3 plugin -> only that plugin runtime is reinitialized.
- A second active V3 plugin keeps runtime state and registrations.
- V2 plugins are unaffected.
- Removed/replaced plugin-owned menus/hooks/MCP/TTS/event listeners do not leak or duplicate.
- Repeated reload of the same plugin does not duplicate registrations.
- Target plugin load failure produces a deterministic recoverable state.
- Persisted plugin version survives full app/server restart.
- If save is asynchronous, runtime reload occurs only after required persistence guarantee.
- Full reload fallback, if retained, is exercised only for unsupported/ambiguous cases.

## PR construction recipe
1. Create fresh `feat/plugin-targeted-reload` from latest official upstream.
2. Map current V3 plugin registration and teardown ownership APIs before editing.
3. Implement a narrowly scoped `reload/update one V3 plugin` path.
4. Route only the relevant V3 install/update/reload caller through it.
5. Keep full reload as explicit fallback only where necessary.
6. Add regression tests for unrelated-plugin preservation and duplicate-registration cleanup.
7. If persistence ordering is not already safe, stop and open the separate prerequisite Feature-ID instead of expanding this diff.

## Upstream pitch
Targeted V3 reload reduces disruption and avoids unnecessary global plugin runtime churn while preserving existing fallback behavior for cases that cannot be safely isolated.

## Review / PR state
- dossier reconstruction: COMPLETE
- legacy Git-history surgery: NOT REQUIRED
- persistence-order prerequisite: VERIFY_AT_REBUILD_TIME
- next action: rebuild against current upstream V3 ownership/reload APIs; split persistence-order work into its own feature if needed.
