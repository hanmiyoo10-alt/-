# Upstream PR dossier — plugin-targeted-reload

Feature-ID: `plugin-targeted-reload`
Area: `shared`
PR status: `REIMPLEMENTED_UPSTREAM`
Isolation status: `ACCEPTED_DESIGN`
Deployment status: `UPSTREAM_v1.11.0`

## Official PR result
- Repository: `PocketRisu/PocketRisu`
- PR: `#62` — `fix: reload updated V3 plugins in isolation`
- Source head: `56b80a8289a9b470bce682552f25dae7afb5e1a4`
- Opened: `2026-08-16T07:10:31Z`
- Closed: `2026-08-23T11:11:10Z`
- Result: **external PR closed, design reimplemented on current upstream develop**
- Upstream implementation commit: `a55c4eef`
- Maintainer-stated release target: `v1.11.0`

## Maintainer review outcome
The maintainer explicitly confirmed that both the diagnosis and ownership-tagging design were correct. Because develop had gained plugin-permission changes in the same files, upstream policy was to reimplement the change on current code rather than merge the external PR directly.

Preserved concepts in upstream reimplementation:
- targeted `reloadV3Plugin()` behavior instead of global plugin teardown for v3 → v3 updates;
- document listener ownership tagging / targeted cleanup;
- provider cleanup only when the unloading plugin still owns the registration;
- snapshot iteration during full V3 unload;
- integration with newer permission-denial wrapper/global cleanup behavior.

## Original problem / motivation
Updating one V3 plugin through the previous global `loadPlugins()` path could tear down unrelated V3 providers/UI until browser refresh. The goal was to reload only the changed plugin while preserving unrelated plugin runtime state.

## Validation submitted upstream
Repeated `//@update-url` updates were tested without browser refresh while another V3 plugin stayed active; the unrelated plugin's floating UI and provider remained functional.

Historical source touch areas:
- `src/ts/plugins/plugins.svelte.ts`
- `src/ts/plugins/apiV3/v3.svelte.ts`

## Boundaries
This result is considered an upstream success even though the original PR was not merged byte-for-byte. Do not reopen the old rebuild plan unless a regression shows the upstream `a55c4eef` implementation no longer preserves the accepted behavior.

Keep plugin download/fetch fallback work, Node DB/save optimization, response notifications, and unrelated persistence ordering work outside this feature.

## Review / PR state
- official upstream PR #62: **CLOSED / REIMPLEMENTED**
- design verdict: **ACCEPTED**
- upstream implementation: `a55c4eef`
- old `PR_READY_REBUILD` state: **SUPERSEDED**
