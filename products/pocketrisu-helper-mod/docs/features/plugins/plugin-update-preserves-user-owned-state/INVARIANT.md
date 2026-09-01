# Feature invariant — PLUGIN-UPDATE-PRESERVES-USER-OWNED-STATE

## Status

`ADOPTED` in official PocketRisu.

## Problem / evidence

Official `PocketRisu/PocketRisu` commit `c81938a487887953cdbd3b82a84178fee3edbbf3` fixed plugin update/reinstall behavior that rebuilt runtime argument values from new-code defaults and could re-enable an automatically updated plugin that the user had disabled. Follow-up `89fc53db9383e46d43ad3662b750341630a8ff35` fixed semantic compatibility for `string[]` option-list argument declarations by comparing ordered contents instead of array identity.

## Minimal safe invariant

Plugin code replacement is a schema transition, not blanket ownership of user configuration.

- Keep a previous user value when the new plugin still declares the same key with a semantically compatible argument type.
- New or retyped keys use the new declaration/default.
- Automatic updates preserve the existing enabled/disabled state.
- Structured declaration descriptors whose identity is unstable must use semantic equality appropriate to that schema.

## Ownership boundaries

Plugin code owns declarations/defaults and compatibility rules. The user owns compatible configured values and explicit enabled state. The update path arbitrates the transition; it must not silently reinterpret absence of a new default as deletion authority over compatible user state.

## Compatibility / invariants

- Preserve targeted V3 plugin reload; no full-page reload implication.
- Do not carry incompatible/retyped values across schema changes.
- Do not weaken plugin permission/capability checks.
- Manual reinstall/hot-reload semantics may differ from automatic update; keep them explicit rather than accidentally inheriting automatic-update behavior.

## Validation / acceptance

Characterization/regression cases should include:

1. unchanged scalar declaration preserves configured value;
2. equal-content option list preserves configured value even when represented by a new array instance;
3. reordered or changed option list follows the chosen incompatibility policy and does not blindly retain a stale value;
4. added key starts at new default;
5. removed key is not resurrected;
6. retyped key starts at new default;
7. automatic update preserves disabled state;
8. targeted reload/update still persists and exposes the resulting state correctly.

## Risk / blast radius

`MEDIUM`: wrong compatibility logic can silently discard credentials/presets or carry invalid values into a new schema. Scope is localized to plugin import/update transitions and is straightforward to revert.

## Rollback / fallback

Revert the compatibility-preservation change only together with explicit regression acknowledgement; the old fallback is new-code defaults plus prior update behavior and is known to lose user state.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`

## PR decomposition

No new implementation PR is needed while official PocketRisu retains the adopted fix. If this subsystem is refactored, first land characterization tests around schema compatibility and enabled-state ownership, then refactor under those tests.