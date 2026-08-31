# REBUILD-PRESERVES-UNMIRRORED-METADATA

Status: `ADOPTED` upstream lesson

Source: `PocketRisu/PocketRisu@f1e009ecd4daf687381f7d7de43dd07f0d0b5170`

## Problem / evidence

PocketRisu's active prompt-preset editor mirrors many preset fields into top-level DB state, then `saveCurrentPreset()` rebuilds the persisted preset object from those mirrors. `folderId` is not mirrored there, so reconstruction silently dropped folder membership on ordinary save paths. The upstream fix explicitly carries `folderId` from the stored preset.

## Minimal safe scope

Treat every partial-state → canonical-object rebuild as an explicit schema boundary. Preserve only durable fields whose ownership remains on the stored object and which are not represented in the reconstruction source.

## Ownership boundaries

- editing/mirror state owns fields actively edited through the mirror;
- stored canonical object owns durable metadata not mirrored into editing state;
- reconstruction code owns the explicit merge policy between the two.

## Mechanism

When rebuilding a canonical object, enumerate unmirrored durable fields that must survive and copy them from the prior canonical object. Do not use omission as deletion unless the schema explicitly defines that behavior. Avoid indiscriminate whole-object spreading because some fields may intentionally be recomputed, normalized, or removed.

## Compatibility / invariants

- Existing folder/group membership survives save operations unrelated to that metadata.
- Mirrored fields still take their newly edited values.
- Fields intentionally deleted or recomputed do not resurrect from the old object.
- No change to PocketRisu save/flush behavior, `flushServerDbKeepalive()`, plugin reload, runit, or server-phone notification guardrails.

## Validation / acceptance

Create canonical objects carrying unmirrored metadata, execute every reconstruction-triggering path, and assert the metadata remains unchanged unless that flow explicitly edits/deletes it. For prompt presets, cover at least save, back-to-list, switching, create/duplicate/import/delete transitions that invoke `saveCurrentPreset()`.

Acceptance: the persisted preset remains in its folder after unrelated edits and navigation; edited mirror-backed fields persist normally.

## Risk / blast radius

Low if applied field-by-field. Broad old-object merging can resurrect stale or deprecated schema fields, so avoid general spreads without a reviewed ownership map.

## Rollback / fallback

Revert the explicit preservation field if it proves incompatible; the change is localized and has no migration requirement.

## Dependencies

None.

## PR decomposition

No implementation PR required: already adopted in upstream PocketRisu. Future analogous fixes should remain one reconstruction boundary per feature/PR when practical.