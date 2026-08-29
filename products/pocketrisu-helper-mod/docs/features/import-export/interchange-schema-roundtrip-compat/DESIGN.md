# INTERCHANGE-SCHEMA-ROUNDTRIP-COMPAT

## Status

`DESIGN_NEEDED`

## Problem / evidence

`seto-sama/PocketRisu-Kei@294c6e4828861b3590bbd6b40d26a259af12ed97` repairs character/module/CHARX conversion so variant-owned metadata survives round trips and a renamed global-note marker writes the live representation while still accepting the legacy `@@indicator phi` marker on read.

Current `hanmiyoo10-alt/PocketRisu:main` has the same conversion boundary but a different schema: it still maps `@@indicator phi` to `postHistoryInstructions`, already carries hidden-icon state via `hideChatIcon`/`hideIcon`, and does not currently expose the source variant's `moduleNamespace` or `replaceGlobalNote` fields. Evidence is therefore credible and directly relevant to the boundary, but there is not yet a reproduced PocketRisu field-loss bug for the current live schema.

## Minimal safe scope

1. Inventory every PocketRisu-owned field that intentionally participates in character <-> module and CHARX conversion.
2. Add property/fixture tests proving round-trip preservation for those fields only.
3. Add explicit backward-compatible reads for legacy markers only when the current schema has a canonical live destination.
4. If a concrete missing mapping is found, patch that one mapping in an isolated PR.

Do not add fields solely because an external Risu variant owns them.

## Ownership boundaries

- Browser/client import-export and conversion code only.
- Existing character/module schema definitions remain authoritative.
- No DB/storage architecture, server protocol, plugin permission, runtime/device, or deployment changes.
- Conversion helpers must not mutate source objects as a side effect.

## Mechanism

Maintain an explicit conversion mapping between fields that PocketRisu actually owns. Canonical writes use the current live representation. Readers may accept explicitly documented legacy aliases/markers and normalize them into the live field without preserving two competing authorities.

Round-trip tests should construct a maximally populated supported object, convert it across each supported representation, and verify semantic equality for the declared conversion contract. Unknown or unsupported extension fields should follow the existing compatibility policy rather than being guessed into new schema properties.

## Compatibility / invariants

- Character -> module -> character preserves every declared PocketRisu-owned interoperable field.
- Module -> character conversion does not mutate the source module/lorebook.
- Legacy markers remain readable when a safe live destination exists.
- New writes use one canonical live marker/field, not multiple competing aliases.
- Unsupported external-variant fields are not silently promoted into PocketRisu's durable schema.
- Existing import/export formats and PocketRisu storage/save guardrails remain unchanged unless separately reviewed.
- No forced DB flush, keepalive behavior, PM2, Android notification, or V3 plugin reload changes.

## Validation / acceptance

Before `READY_TO_PORT`:

- produce a current-schema field inventory for character, module, and CHARX conversion;
- reproduce at least one concrete field/marker loss or prove an existing mapping is stale;
- add round-trip tests covering all declared interoperable fields;
- add a legacy-marker fixture where applicable;
- verify source-object immutability;
- verify an older exported fixture still imports to the same live semantics.

Acceptance for a patch: only current-schema fields change, tests demonstrate the prior loss and fixed round trip, and reverting the patch restores prior behavior without migration work.

## Risk / blast radius

`LOW` for a single verified mapping and tests, but format/schema mistakes can create silent semantic loss. Keep the implementation tiny and fixture-driven.

## Rollback / fallback

Revert the isolated conversion mapping change. No storage migration or destructive data rewrite is allowed in this feature.

## Dependencies

- authoritative current PocketRisu schema inventory;
- reproduced round-trip loss on the intended implementation base;
- compatibility decision for any legacy marker involved.

## PR decomposition

1. **Inventory/tests only** — enumerate current conversion contract and add fixtures/property checks without changing semantics.
2. **One missing mapping** — only if tests reproduce a real loss; one field/marker family per PR.
3. **Optional compatibility cleanup** — separately retire stale aliases only after compatibility evidence supports it.

No implementation is authorized from the external commit alone.
