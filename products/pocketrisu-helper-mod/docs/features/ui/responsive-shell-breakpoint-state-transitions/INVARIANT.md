# RESPONSIVE-SHELL-BREAKPOINT-STATE-TRANSITIONS

## Status

`ADOPTED` in official PocketRisu via `PocketRisu/PocketRisu@fad12ba19287e0ef504e551b50aa144f3a3d3f0b`.

## Problem / evidence

PocketRisu's shell uses different sidebar ownership modes around the 1024px breakpoint: docked on wide layouts and overlay on narrow layouts. Before the upstream fix, responsive mode tracked viewport changes but the sidebar open state was effectively boot-owned. Foldables, split-screen windows, or desktop resizing could cross the breakpoint while retaining the previous mode's state.

The same commit also fixed a chat-toolbar grouping decision that sampled `window.innerWidth` only once at mount, even though the UI was intended to remain responsive after mounting.

Focused upstream tests cover first-sample behavior, same-mode no-op resizing, exact 1024/1025 transitions, and close-on-narrow/open-on-wide shell defaults.

## Minimal safe invariant

- Treat responsive breakpoints as semantic layout-mode boundaries, not generic resize events.
- When the viewport crosses the shell breakpoint, mode-owned shell state may reset to the same default a fresh boot at the new width would choose.
- Resizes that remain within the same mode must not overwrite user-controlled sidebar state.
- Fixed-width/height-only mobile events such as keyboard or address-bar changes must not reset shell state.
- Lifecycle/orientation re-sampling may detect a missed transition, but it may mutate shell state only if a genuine breakpoint crossing is observed.
- Components expected to react to viewport changes must use reactive breakpoint state rather than mount-only width samples.

## Ownership boundaries

UI shell and responsive component state only: viewport classification, sidebar dock/overlay state, and breakpoint-dependent toolbar grouping. No persistence, DB, plugin storage, save-path, service manager, device notification, runtime/package, or deployment ownership changes.

## Mechanism

Keep a single explicit shell breakpoint predicate and compare the previous width's semantic mode with the current width's mode. Return no state change when both widths belong to the same mode; on a mode crossing, apply the destination mode's boot-equivalent shell default. Use reactive media-query state for component-level breakpoint rendering that must continue updating after mount.

## Compatibility / invariants

- Preserve manual sidebar toggles while the viewport stays in one mode.
- Preserve current mobile keyboard/address-bar behavior by ignoring height-only changes.
- Preserve current PocketRisu DB/save/integrity behavior, targeted V3 plugin reload, runit, server-phone notification rules, and lifecycle flush guardrails.
- Lifecycle listeners are re-sampling triggers, never independent authority to reset state.

## Validation / acceptance

1. First viewport sample causes no synthetic sidebar transition.
2. Wide-to-wide and narrow-to-narrow width changes preserve current sidebar state.
3. 1025 -> 1024 closes the overlay-mode sidebar; 1024 -> 1025 opens the docked-mode sidebar.
4. Fixed-width phone events that only change height do not alter sidebar state.
5. Foldable/split-screen/orientation/page-return scenarios re-sample correctly and only mutate state if the semantic mode changed.
6. Breakpoint-dependent chat-toolbar grouping updates reactively after mount.

## Risk / blast radius

Low. The primary failure mode is unwanted loss of user shell state if resize/lifecycle events are treated too broadly. Scope is localized to responsive UI state and is easy to revert.

## Rollback / fallback

Revert the breakpoint-transition state logic and reactive component breakpoint conversion together if a regression appears. Do not keep lifecycle-triggered resets without the semantic crossing guard.

## Dependencies / PR decomposition

Dependencies: `NONE` for the invariant itself. Already adopted and tested upstream, so no autonomous personal-fork implementation is required solely for this dossier. If a future fork intentionally lacks the upstream change, port it as one isolated UI feature with the focused breakpoint tests intact.
