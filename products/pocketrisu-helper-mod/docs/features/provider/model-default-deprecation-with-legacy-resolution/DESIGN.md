# MODEL-DEFAULT-DEPRECATION-WITH-LEGACY-RESOLUTION

Status: `READY_TO_PORT`

## Problem / evidence

RisuAI commit `ffabb06a386f1aee13217e5ca3c4268a35edb421` replaces retired Claude model IDs only where they act as onboarding/preset defaults, while retaining retired IDs in provider/model catalogs so existing saves remain resolvable.

PocketRisu `develop` was directly inspected on 2026-08-31. Its OAI2 preset still writes retired `claude-3-5-sonnet-20240620` into exactly three default-writer fields: `aiModel`, `proxyRequestModel`, and `customProxyRequestModel`. PocketRisu's Anthropic catalog already contains `claude-sonnet-4-6` and marks it `recommended: true`. The same catalog also still contains the legacy `claude-3-5-sonnet-20241022` and `claude-3-5-sonnet-20240620` entries, so updating the preset writers does not require removing backwards-compatible resolution.

This resolves the first-slice ownership and replacement-model assumptions. The source repo also provides matching causal evidence: new/default writers were changed while legacy catalog entries were intentionally retained.

## Minimal safe scope

First autonomous implementation slice: update only the three confirmed OAI2 preset literals in `src/ts/process/templates/templates.ts` from `claude-3-5-sonnet-20240620` to `claude-sonnet-4-6`.

Do not change onboarding unless a separate PocketRisu-specific writer is found and audited. Do not globally remove or rewrite retired IDs from selectable/provider compatibility catalogs, existing-save resolution paths, Bedrock namespaces, OpenRouter names, examples, or documentation without separate evidence.

## Ownership boundaries

- OAI2 preset template owns values written when a user explicitly loads that preset;
- provider/model catalogs own backwards-compatible resolution and selection;
- saved user configuration remains authoritative and is not migrated by this feature;
- OpenRouter/Bedrock namespaces are separate compatibility domains and are out of scope.

## Mechanism

Replace the three confirmed OAI2 `DEFAULT_WRITER` literals only:

- `aiModel`
- `proxyRequestModel`
- `customProxyRequestModel`

Replacement: `claude-sonnet-4-6`, already present in PocketRisu's Anthropic model catalog and marked recommended.

Retain all retired IDs in the model catalog as `LEGACY_RESOLVER` entries. No saved data migration, provider-list pruning, or broad search/replace is allowed.

## Compatibility / invariants

- existing saves referencing retired IDs remain loadable/resolvable;
- no blanket string replacement;
- Bedrock/OpenRouter identifiers are not assumed to share Anthropic retirement semantics;
- no automatic migration of existing user selections;
- replacement is already supported and recommended by PocketRisu's provider layer;
- PocketRisu save/integrity behavior, targeted V3 plugin reload, runit ownership, server-phone notification guardrails, and `flushServerDbKeepalive()` behavior are untouched.

## Validation / acceptance

Required before merge:

1. Diff contains only the three OAI2 default-writer literals plus narrowly scoped tests/docs if needed.
2. `claude-sonnet-4-6` continues to resolve through `AnthropicModels` and remains `recommended: true`.
3. Legacy `claude-3-5-sonnet-20241022` and `claude-3-5-sonnet-20240620` catalog entries remain present.
4. Run the repository's focused type/check suite for the touched package.
5. Add or run a targeted preset assertion proving OAI2 seeds `claude-sonnet-4-6` into all three fields.
6. Add or run a compatibility assertion proving a legacy saved Anthropic model ID still resolves without forced migration.

If the repository lacks a practical direct preset test seam, the minimum acceptance is the normal type/check suite plus a focused static/unit assertion over the exported OAI2 preset and model catalog. Do not weaken the legacy-resolution invariant just to simplify testing.

## Risk / blast radius

`LOW`. The production change is three preset literals, no persistence/schema/protocol migration, and rollback is a one-commit literal revert. Existing saves are not rewritten.

## Rollback / fallback

Revert only the default-literal change. No data migration occurs, so rollback is immediate and existing saved choices remain untouched.

## Dependencies

`NONE` for the first OAI2 preset slice.

A separate onboarding slice would require PocketRisu-specific evidence that such a default writer exists and is still stale; it is not part of this readiness decision.

## PR decomposition

1. `MODEL-DEFAULT-DEPRECATION-WITH-LEGACY-RESOLUTION`: one XS personal-fork PR changing only the three OAI2 preset literals and focused validation.
2. Optional later PR for any independently verified onboarding/default writer; do not bundle it into slice 1.

## Readiness decision

Moved from `DESIGN_NEEDED` to `READY_TO_PORT` on 2026-08-31 after direct PocketRisu inspection resolved the first-slice assumptions: confirmed default-writer ownership, confirmed supported/recommended replacement, confirmed legacy resolver retention, no migration requirement, concrete validation, and trivial rollback.
