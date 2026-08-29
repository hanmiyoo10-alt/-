# PROVIDER-ROLE-OVERRIDE-CANONICAL-BOUNDARY

## Problem / evidence

HaejeokRisuai expanded per-feature provider/model overrides for memory, translation, emotion, and other auxiliary roles in `cad10cc715d7f5948918d60ed881de30a5e95287`, then centralized duplicated mode-override lookup in `463b9fb97b09a3372a8305282ab05be8fc391fe0`. The follow-up tests explicitly reject overrides for main/submodel roles and only apply them when feature-role overrides are enabled.

## Minimal safe scope

No implementation in PocketRisu today. Preserve this as a design invariant for any future per-feature model/provider routing surface: one role resolver, shared by request preparation and provider context, with explicit non-feature fallback.

## Ownership boundaries

- UI/provider settings may select a role and store role-specific configuration.
- A pure role-resolution helper owns whether an override applies.
- Request model selection, endpoint selection, headers, and provider-context creation consume the same resolved role data.
- Provider-specific transports must not re-infer role semantics independently.

## Mechanism

Use an explicit finite feature-role type and a pure resolver that accepts the enable flag, override map, and request mode. It returns an override only for recognized feature roles while preserving main/submodel defaults.

## Compatibility / invariants

- Main-model requests remain main-model requests.
- Submodel requests never inherit feature-only overrides.
- Disabling separate auxiliary models immediately restores existing shared submodel semantics.
- UI state must not point at a role that is no longer selectable after mode changes.
- No storage, runtime, service-manager, notification, DB-flush, or plugin-reload behavior changes are implied by this invariant.

## Validation / acceptance

Table-driven tests should cover main, submodel, memory, translate, emotion, and other auxiliary roles with overrides enabled and disabled. For every supported provider path, model + endpoint + headers + provider context must resolve from the same role decision. A UI test should verify role selection normalizes when separate-model mode is toggled.

## Risk / blast radius

Low if introduced only after PocketRisu has a matching routing owner. Premature abstraction is the primary risk: it can add unused configuration and drift from PocketRisu semantics.

## Rollback / fallback

Keep existing shared main/submodel routing as fallback. The resolver can be removed without data migration if no persisted role-specific fields are introduced in the same PR.

## Dependencies

A concrete PocketRisu per-feature provider/model routing owner, plus evidence of duplicated or inconsistent role resolution.

## PR decomposition

1. Reproduce role-resolution duplication/drift with tests.
2. Add one pure resolver and migrate only duplicated lookups.
3. Separately, if justified, add any user-facing role-specific provider controls.

Current lifecycle: `HOLD`. Do not implement until the dependency exists.
