# UI-MODE-ACTIVATION-OWNERSHIP

Status: `HOLD`

## Evidence

`nevaeh5379/HaejeokRisuai` commits `ed95732bf97ea8a0b5a4bc7a7b6e3939df42604e` and `2a952c4dde32bb1e8f33b610f545737ed6e1b683` show a concrete failure class where responsive/mobile UI state can drift from settings/viewport changes, repeated activation can register duplicate document-level gesture listeners, and navigation callers can bypass the active UI-mode routing owner.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: matching PocketRisu-owned runtime UI-mode/gesture owner and demonstrated hazard
- Priority: `P1`
- Lifecycle status: `HOLD`

## Invariants

1. Runtime UI-mode activation should have one authoritative predicate/owner rather than independent startup, resize, and settings-toggle implementations.
2. Global side effects installed by activation (gesture/document/window listeners, observers, timers) must be idempotent or have explicit symmetric teardown.
3. Navigation initiated from a mode-specific surface must route through the active mode's navigation owner; callers must not independently toggle desktop state while mobile state is active.
4. Mode changes after startup must update both rendered state and side-effect ownership consistently.
5. Source-specific store/function names are not portable architecture. PocketRisu must first identify its own matching owner and reproduce the failure class.

## Validation if activated later

- repeat activation/toggle/resize many times and prove one effective global handler registration;
- verify resize and setting toggles update routing immediately;
- verify mobile-only and desktop-only destinations preserve return context;
- verify deactivation does not leave stale mode routing;
- confirm no interaction with PocketRisu save/integrity, plugin reload, runit, server-phone notification, or DB flush guardrails.

## Rollback

A future implementation should remain a localized owner/guard change and be revertible without data migration or persisted-state conversion.
