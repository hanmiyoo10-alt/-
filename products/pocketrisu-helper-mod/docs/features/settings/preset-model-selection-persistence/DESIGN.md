# Feature-ID: PRH-PRESET-MODEL-SELECTION-PERSISTENCE

Status: **DESIGN_NEEDED**

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: reproduce/audit current PocketRisu preset ownership and model-selector save path
- Priority: `P0`
- Lifecycle: `DESIGN_NEEDED`

## Problem / evidence

`nevaeh5379/HaejeokRisuai` commit `44e6c22a795924460ae447678442351d1aba82b3` fixes a persistence bug where model selections changed through EasyPanel/BotSettings/model selectors were visible in the reactive settings state but were not persisted to the active preset. The source fix wires `saveCurrentPreset()` to model-selection change callbacks.

This is evidence of a class of ownership bug: UI selection and active-preset persistence can diverge when a selector mutates shared state without invoking the preset owner.

## Minimal safe scope

Do not copy Haejeok's UI wiring blindly. First reproduce the behavior on current PocketRisu and trace one model-selection path from selector -> reactive state -> active preset persistence. If a missing persistence edge is proven, fix only the affected owner/path and add a regression test covering reload/preset switch.

## Ownership boundaries

- Model selector components own selection UI/events, not persistence policy.
- Active preset storage owner decides when/how preset mutations are saved.
- Global DB settings and preset-scoped model settings must remain distinct.
- No forced DB flush, pagehide/visibility save, or broad save-loop changes are allowed.

## Proposed mechanism

1. Reproduce: select a model in each relevant UI, switch/reload, verify active preset retains it.
2. Trace whether selection already reaches a centralized preset mutation/save helper.
3. If persistence is missing, prefer one centralized preset-aware callback/helper rather than scattering unconditional `saveCurrentPreset()` calls across every selector.
4. Debounce/coalesce only if current save semantics already require it; do not invent a new persistence scheduler for this fix.

## Compatibility / invariants

- Existing selections that already persist must not trigger duplicate writes.
- Preset-scoped fields remain preset-scoped; global provider/API settings remain global.
- No change to targeted V3 plugin reload.
- No change to save/integrity guardrails, ETag behavior, `flushServerDbKeepalive()`, or visibility/pagehide handling.
- No system/runtime/service-manager changes.

## Validation / acceptance

Before `READY_TO_PORT`:

- reproduce at least one failing current PocketRisu path, or close/supersede the item if it does not reproduce;
- verify main model, submodel and auxiliary model selectors according to current product UI, not source UI assumptions;
- test select -> preset switch away/back -> reload -> persisted value;
- test two presets retain independent model selections;
- instrument/mock save ownership to ensure one user selection does not cause an unbounded/redundant save storm;
- verify cancel/blankable selection semantics remain unchanged.

## Risk / blast radius

LOW if restricted to the proven preset persistence boundary. Main risk is accidental extra saves or confusing global and preset-scoped state.

## Rollback / fallback

Revert the bounded selector/owner callback and regression test. No migration or persistent data rewrite is required.

## PR decomposition

1. Reproduction + regression test only.
2. Minimal persistence-owner fix.
3. Optional consolidation only if multiple independent selectors prove the same missing edge.

No autonomous source implementation is authorized until the PocketRisu reproduction resolves the dependency.