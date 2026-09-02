# SETTINGS-ONLY-BACKUP-PRESERVES-REFERENCE-CLOSURE

## Status

`ADOPTED` invariant observed in official PocketRisu.

## Problem / evidence

A settings-only backup intentionally removes characters, chats, inlay images, character cold storage, and character ordering while retaining modules, plugins, presets, personas, lorebooks, theme, credentials, and other settings-domain state. Once the database is trimmed, its archive still has to contain every asset referenced by the retained graph.

Official PocketRisu commit `b6156083aeeda26fe7aace84005d9ded9ea6db5c` implemented this by building reference closures from the trimmed database with and without module assets. Module-only marginal assets are the set difference, so disabling module assets does not remove an asset shared with a retained domain such as a persona icon. The estimate and export endpoints share the same plan. The invariant and focused compatibility test remain present on `develop@278251f85a19bfdfd4cf3faae780e62682878f9e`.

## Invariant

A filtered backup MUST be reference-complete for every domain retained in its serialized database. Optional exclusion of one asset domain MUST subtract only assets exclusively owned by that excluded domain; shared assets referenced by any retained domain MUST remain in the archive.

Estimate and export behavior MUST derive from the same filtering plan so user-visible size/count estimates cannot drift from the archive actually produced.

## Ownership boundary

- backup trimming owns which logical database domains are retained;
- reference discovery owns the closure of assets required by those retained domains;
- optional module-asset exclusion may remove only module-exclusive marginal assets;
- destructive orphan cleanup is a separate authority and must not be inferred from backup filtering alone;
- backup contents may include credentials and therefore remain sensitive artifacts.

## Compatibility / acceptance

Preserve these checks:

1. characters and chats are absent;
2. character order, inlay images/metadata, and character cold storage are absent;
3. retained settings domains survive;
4. an asset shared by a module and retained domain survives when module assets are disabled;
5. module-only assets may be excluded without deleting module definitions;
6. estimate and produced archive are based on the same plan;
7. every new retained asset-bearing domain extends reference-discovery regression coverage.

## Risk / rollback

Risk is medium because a false-negative reference calculation creates a silently lossy backup. Roll back filtered-export changes rather than weakening closure checks. Never compensate for uncertainty by deleting additional archive entries. If reference discovery is suspect, prefer retaining extra assets over producing a smaller but incomplete backup.

## Source

- `PocketRisu/PocketRisu@b6156083aeeda26fe7aace84005d9ded9ea6db5c`
- preserved on `PocketRisu/PocketRisu:develop@278251f85a19bfdfd4cf3faae780e62682878f9e`
