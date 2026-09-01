# INTERCHANGE-SCHEMA-ROUNDTRIP-COMPAT

## Status

`DESIGN_NEEDED`

## Problem / evidence

`seto-sama/PocketRisu-Kei@294c6e4828861b3590bbd6b40d26a259af12ed97` repairs character/module/CHARX conversion so variant-owned metadata survives round trips and a renamed global-note marker writes the live representation while still accepting the legacy `@@indicator phi` marker on read.

`rpaddict/RisuBard@e47bc14090618450b271eaac2a1c1891757ac535` adds a second independent portability example: RisuBard keeps its Grimoire state under the app-owned `data.extensions.risubard.bardLore` namespace while leaving standard `character_book` unchanged, and treats the optional extension as non-authoritative so malformed app-specific data does not block the standard lorebook import path. This strengthens the design rule that private extension state should be namespaced and failure-contained rather than replacing the interoperable core schema.

Current official `PocketRisu/PocketRisu@278251f85a19bfdfd4cf3faae780e62682878f9e` already follows part of this pattern. `createBaseV2()` writes PocketRisu-owned state under `data.extensions.risuai`, preserves other character extension namespaces instead of promoting them into PocketRisu's schema, and `importCharacterCardSpec()` reads PocketRisu extension fields independently from the standard card/lorebook projection. Evidence is therefore credible and directly relevant to the boundary, but there is not yet a reproduced current PocketRisu field-loss or malformed-extension failure that justifies a production patch.

## Minimal safe scope

1. Inventory every PocketRisu-owned field that intentionally participates in character <-> module and CHARX conversion.
2. Add property/fixture tests proving round-trip preservation for those fields only.
3. Add explicit backward-compatible reads for legacy markers only when the current schema has a canonical live destination.
4. Verify optional app-specific extension parsing is failure-contained: invalid private extension data must not invalidate otherwise valid standard card/lorebook content.
5. If a concrete missing mapping or failure-containment bug is found, patch that one boundary in an isolated PR.

Do not add fields solely because an external Risu variant owns them.

## Ownership boundaries

- Browser/client import-export and conversion code only.
- Existing character/module schema definitions remain authoritative.
- Standard Character Card fields remain the interoperable authority; app-specific metadata belongs under an app-owned extension namespace.
- No DB/storage architecture, server protocol, plugin permission, runtime/device, or deployment changes.
- Conversion helpers must not mutate source objects as a side effect.

## Mechanism

Maintain an explicit conversion mapping between fields that PocketRisu actually owns. Canonical writes use the current live representation. Readers may accept explicitly documented legacy aliases/markers and normalize them into the live field without preserving two competing authorities.

App-specific portable state should be written beneath a stable PocketRisu-owned extension namespace rather than overloading standard fields. Import should parse the standard projection first and parse optional private extensions independently; invalid optional extension data should be ignored/rejected locally without destroying the valid standard projection.

Round-trip tests should construct a maximally populated supported object, convert it across each supported representation, and verify semantic equality for the declared conversion contract. Unknown or unsupported extension fields should follow the existing compatibility policy rather than being guessed into new schema properties.

## Compatibility / invariants

- Character -> module -> character preserves every declared PocketRisu-owned interoperable field.
- Module -> character conversion does not mutate the source module/lorebook.
- Legacy markers remain readable when a safe live destination exists.
- New writes use one canonical live marker/field, not multiple competing aliases.
- Standard Character Card / `character_book` semantics remain usable by readers that ignore PocketRisu-specific extensions.
- PocketRisu-specific portable metadata is namespaced and never becomes required to parse otherwise valid standard data.
- Malformed optional app-extension data cannot invalidate the standard card/lorebook projection.
- Unsupported external-variant fields are not silently promoted into PocketRisu's durable schema.
- Unknown extension namespaces keep the existing preservation policy and are not rewritten into PocketRisu ownership by guess.
- Existing import/export formats and PocketRisu storage/save guardrails remain unchanged unless separately reviewed.
- No forced DB flush, keepalive behavior, PM2, Android notification, or V3 plugin reload changes.

## Validation / acceptance

Before `READY_TO_PORT`:

- produce a current-schema field inventory for character, module, PNG/JSON Character Card, and CHARX conversion;
- reproduce at least one concrete field/marker loss or malformed-private-extension failure, or prove an existing mapping is stale;
- add round-trip tests covering all declared interoperable fields;
- add a fixture containing an unknown extension namespace and verify preservation policy;
- add a fixture with malformed PocketRisu-owned optional extension data plus valid standard `character_book`, verifying standard import still succeeds;
- add a legacy-marker fixture where applicable;
- verify source-object immutability;
- verify an older exported fixture still imports to the same live semantics.

Acceptance for a patch: only current-schema fields or the isolated extension parser boundary change, tests demonstrate the prior loss/failure and fixed round trip, and reverting the patch restores prior behavior without migration work.

## Risk / blast radius

`LOW` for a single verified mapping or parser guard and tests, but format/schema mistakes can create silent semantic loss. Keep the implementation tiny and fixture-driven. Do not turn this feature into a generic schema migration.

## Rollback / fallback

Revert the isolated conversion mapping or optional-extension parsing change. No storage migration or destructive data rewrite is allowed in this feature. Standard card fields remain the fallback authority.

## Dependencies

- authoritative current PocketRisu schema inventory;
- reproduced round-trip loss or malformed-extension failure on the intended implementation base;
- compatibility decision for any legacy marker involved.

## PR decomposition

1. **Inventory/tests only** — enumerate current conversion contract and add fixtures/property checks without changing semantics, including unknown/malformed extension cases.
2. **One missing mapping or parser guard** — only if tests reproduce a real loss/failure; one field/extension family per PR.
3. **Optional compatibility cleanup** — separately retire stale aliases only after compatibility evidence supports it.

No implementation is authorized from the external commit alone.
