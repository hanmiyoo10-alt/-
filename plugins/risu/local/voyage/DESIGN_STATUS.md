# Voyage Token Check — Design Status

## Milestone

The first-pass product and architecture design is sufficiently complete to move from broad design exploration into evidence validation.

This does **not** mean production implementation is complete. It means the major product boundaries and contracts are defined well enough that further design should now be driven primarily by real-device evidence rather than more speculative expansion.

## What is already designed

### Product goal

- Open the plugin and immediately see a useful Voyage dashboard state.
- Avoid routine visits to the Voyage website for normal usage/quota checking.
- Preserve exact source/fidelity semantics; unknown data stays unknown.

### Data architecture

- Provider-based acquisition architecture.
- Shared normalized `VoyageSnapshot` state.
- Risu-observed usage and future authoritative quota remain separate fidelity classes.
- No API-key/session scraping or hidden dashboard dependency.

### UI architecture

- Full dashboard opens immediately when the plugin is opened.
- Used/current models are prioritized above unused models.
- Unused models are collapsed by default.
- New models can be discovered from runtime evidence without a hard-coded release when the existing parser shape supports them.

### Floating activity widget

- Optional user-toggleable floating widget.
- Status-only active display: `● Voyage 사용중`.
- No token counts/model names/quota/cost in the widget.
- Draggable during interaction, then docks to the nearest left/right screen edge.
- Remembers dock side and vertical position locally.
- Tapping opens the full dashboard.

### Refresh behavior

- Immediate refresh on dashboard open.
- Visible-only bounded refresh for near-live state.
- No permanent high-frequency background polling.
- Exact polling/timeout values remain evidence-driven.

### Update UX

- Existing Risu `//@update-url` + `//@version` update channel is the target release interaction.
- Update availability appears through the normal `+` flow.
- In-plugin compact release notes show the important user-facing changes.

### Source architecture

- Feature-level modular source design with a small shared core.
- Shared core includes normalized snapshot ownership, refresh coordination, module lifecycle/failure isolation, and permission boundaries.
- Major feature modules include observed usage, future authoritative quota, model activity, dashboard, mini/floating activity status, release notes, diagnostics, and optional reference metadata.
- Large modules may later split into submodules when responsibility/state/testing/lifecycle/performance boundaries become independently meaningful.
- File size alone is not a mandatory split trigger.
- Modular source should still build into one easy-to-install Risu plugin artifact.

## What is intentionally still UNKNOWN

The next stage must resolve these through real-device evidence rather than assumptions:

- exact sanitized Voyage fetch-log shape visible to the plugin on the user's device;
- fetch-log lifecycle/completeness and practical dedupe behavior;
- reliable activity start/end signal for `Voyage 사용중`;
- best inactivity timeout for hiding the floating widget;
- safe floating-widget placement around mobile keyboard/safe areas/host controls;
- exact near-live refresh interval that is responsive without unnecessary cost;
- exact timestamp evidence available for current/recent model ordering;
- authoritative supported account/project quota source, if one becomes available;
- canonical production source path/build/release artifact for this plugin before implementation begins.

## Current gate

**DESIGN STATUS: FIRST-PASS COMPLETE.**

The project should now prefer:

`design contracts → real-device evidence → analysis-only diagnostic turn → later implementation turn`

Do not start production implementation from the control/documentation directory merely because the design is mature. First establish the real production source/build path and complete the Stage 0 device evidence gate.

## Next step

Perform one minimal real-device Voyage request through normal Risu usage and inspect only the sanitized plugin-visible evidence needed to verify:

- Voyage request recognition;
- response usage fields;
- absence of credential/header exposure;
- activity timing/lifecycle;
- log ordering/retention behavior relevant to the MVP.

The diagnostic turn remains analysis-only under `PROJECT_MEMORY.md`. Implementation starts only on a later user turn after that evidence is analyzed.
