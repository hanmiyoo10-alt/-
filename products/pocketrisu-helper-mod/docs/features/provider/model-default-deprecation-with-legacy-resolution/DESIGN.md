# MODEL-DEFAULT-DEPRECATION-WITH-LEGACY-RESOLUTION

Status: `DESIGN_NEEDED`

## Problem / evidence

RisuAI commit `ffabb06a386f1aee13217e5ca3c4268a35edb421` replaces retired Claude model IDs only where they act as onboarding/preset defaults, while retaining retired IDs in provider/model catalogs so existing saves remain resolvable. PocketRisu current `develop` still contains retired Claude IDs in template/provider surfaces, so a selective ownership audit is warranted.

## Minimal safe scope

Change only literals that actively seed new-user or newly-loaded preset defaults. Do not globally remove or rewrite retired IDs from selectable/provider compatibility catalogs, existing-save resolution paths, Bedrock namespaces, OpenRouter names, examples, or documentation without separate evidence.

## Ownership boundaries

- onboarding/default seeding owns future defaults;
- preset templates own values written when a user explicitly loads the preset;
- provider/model catalogs own backwards-compatible resolution and selection;
- saved user configuration remains authoritative and is not migrated by this feature.

## Mechanism

Inventory every occurrence of each retired ID and label it `DEFAULT_WRITER`, `LEGACY_RESOLVER`, `EXTERNAL_NAMESPACE`, or `DOC_EXAMPLE`. Replace only confirmed `DEFAULT_WRITER` values with a currently supported recommended model already represented in PocketRisu's provider catalog.

## Compatibility / invariants

- existing saves referencing retired IDs remain loadable/resolvable;
- no blanket string replacement;
- Bedrock/OpenRouter identifiers are not assumed to share Anthropic retirement semantics;
- no automatic migration of existing user selections;
- replacement must already be supported by PocketRisu's provider layer.

## Validation / acceptance

- enumerate and classify every retired-ID occurrence touched by the source change;
- confirm replacement model is supported/recommended in PocketRisu;
- run type/check suite;
- targeted onboarding test confirms new Claude selection seeds the new ID;
- preset test confirms OAI2/default template seeds the new ID;
- compatibility test confirms a save containing a retired ID still resolves without forced migration.

## Risk / blast radius

`LOW` if confined to default writers; broad search/replace raises compatibility risk.

## Rollback / fallback

Revert only the default-literal change. No data migration means rollback is trivial and existing saved choices are unaffected.

## Dependencies

Exact PocketRisu default-writer inventory and confirmation of the intended replacement model.

## PR decomposition

1. Audit/tests identifying default writers vs compatibility catalogs.
2. One XS production change updating only confirmed default writers.

Advance to `READY_TO_PORT` only after step 1 resolves ownership and replacement-model assumptions.