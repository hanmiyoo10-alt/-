# SETTINGS-EXTENSION-LABEL-LAYOUT-CONTAINMENT

## Status

`ADOPTED` in official PocketRisu via `PocketRisu/PocketRisu@ac30bf20c90bc693fd5ed55251750fc27bdf0ead`.

## Problem / evidence

The desktop settings navigation had no stable width, so the longest menu label determined the sidebar width. Plugins can register arbitrary settings menu names and built-in/localized labels can also be long. A long label could therefore widen the navigation column and squeeze the primary settings pane.

## Minimal safe invariant

- Desktop settings navigation owns a bounded/stable width independent of extension-controlled label length.
- Long labels remain readable by wrapping within that width instead of expanding the column or being silently truncated.
- Navigation icons keep their intended size rather than shrinking to accommodate text.
- Mobile retains its full-width navigation behavior.

The invariant is containment and readability; the exact width value is presentation-specific and is not itself authoritative.

## Ownership boundaries

UI layout only: settings navigation shell, plugin-defined menu labels/icons, responsive breakpoint behavior. No persistence, plugin storage, DB, runtime, device, notification, or save-path ownership changes.

## Compatibility / guardrails

Must not alter plugin callback semantics or plugin registration APIs. Preserve current PocketRisu DB/save/integrity behavior, targeted V3 plugin reload, runit, server-phone notification rules, and lifecycle flush guardrails.

## Validation / acceptance

1. Inject/register a deliberately very long plugin settings label on desktop; sidebar width remains stable and main pane is not squeezed beyond the intended shell geometry.
2. Long built-in/localized labels wrap visibly.
3. Icons remain non-shrinking and aligned.
4. At mobile width, navigation remains full width.
5. Normal labels remain visually unchanged apart from the stable desktop geometry.

## Risk / blast radius

Low. Incorrect sizing can reduce usable desktop space or create wrapping regressions, but the change is localized and easily reversible.

## Rollback / fallback

Revert the bounded-width/wrapping style changes together. Do not retain only a fixed width without the long-label wrapping/icon containment behavior.

## Dependencies / PR decomposition

Dependencies: `NONE` for the invariant itself. Already adopted upstream; no autonomous personal-fork implementation is required solely for this dossier. If a future fork sync intentionally excludes the upstream change, treat any port as one isolated UI feature and validate desktop/mobile behavior before merging.
