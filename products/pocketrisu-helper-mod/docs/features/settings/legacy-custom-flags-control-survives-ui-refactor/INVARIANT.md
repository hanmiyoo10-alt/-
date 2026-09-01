# LEGACY-CUSTOM-FLAGS-CONTROL-SURVIVES-UI-REFACTOR

Status: `ADOPTED`

## Problem / evidence

Official PocketRisu commit `d7daf1754c63f39c8b02f2fb93a899332aeefabb` restored custom capability-flag controls that had disappeared from the Chat Bot settings UI. Persisted support for `enableCustomFlags` / `customFlags` remained, but the supported manual control surface had become unreachable after settings reorganization.

## Minimal safe scope

Preserve reachability and editability of intentionally supported legacy/manual capability overrides whenever Bot Settings are reorganized. Do not expand the semantic authority of those overrides.

## Ownership boundaries

- Legacy Chat Bot/manual-model path owns the explicit custom flag override UI.
- Model Presets/model profiles own profile-derived capability behavior.
- Persisted DB fields remain state; a UI refactor must not silently convert supported state into unreachable/dead configuration.

## Mechanism

Expose `enableCustomFlags` plus the supported `LLMFlags` controls only in the legacy-model settings path, with explanatory copy distinguishing that path from Model Preset capability derivation.

## Compatibility / invariants

1. Existing stored legacy custom flags remain inspectable and editable.
2. Model Presets do not inherit blanket manual-flag authority from this UI.
3. Settings restructuring must not silently remove a supported control surface while leaving its persisted behavior active.
4. No change to PocketRisu save/flush, targeted V3 reload, runit, server-phone notification, or storage architecture guardrails.

## Validation / acceptance

- Legacy model settings expose `enableCustomFlags` and individual flag toggles.
- Toggling a flag updates the intended `DBState.db.customFlags` state and survives normal persistence.
- Preset/profile-based models continue to derive capabilities from their profile and do not depend on the legacy toggle surface.
- A future Bot Settings refactor should include a regression check for the above reachability boundary.

## Risk / blast radius

`LOW`. The main failure mode is capability misconfiguration or a hidden/unreachable supported setting. The control must remain clearly scoped so manual flags do not leak into preset/profile semantics.

## Rollback / fallback

UI-only regressions can be reverted by restoring the previous settings component/control placement. Persisted custom flag data should not require migration for such a rollback.

## Dependencies

`NONE`.

## PR decomposition

No implementation PR is required now because the invariant is already adopted in official PocketRisu. If a future settings refactor violates it, use one isolated UI/settings regression PR with a focused reachability/persistence test.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
