# PLUGIN-UPDATE-PRESERVES-USER-STATE

Status: ADOPTED

## Problem / evidence

PocketRisu plugin updates used to rebuild `realArg` from the incoming plugin's defaults. Plugins commonly use arguments for user-owned presets or API keys, so an otherwise routine update could silently erase those settings. `PocketRisu/PocketRisu@c81938a487887953cdbd3b82a84178fee3edbbf3` changed update/reinstall replacement to carry forward existing argument values only when the incoming plugin still declares the key with the same type, and automatic updates preserve a user's disabled state.

`PocketRisu/PocketRisu@89fc53db9383e46d43ad3662b750341630a8ff35` corrected the type check for option-list declarations (`string[]`): plugin managers construct new arrays, so reference identity is not semantic type identity. Equivalent option lists are compared by ordered contents.

The reviewed durable tip `ca09a80746e74e5334145e5e78af47ce423e0eba` retains these rules.

## Invariant / ownership boundary

Plugin import/update owns schema compatibility; user-owned persisted values own the value when and only when the new plugin still declares the same key with the same semantic argument type.

- Same scalar declaration type: preserve the old user value.
- Same ordered option-list declaration: preserve the old user value even when the declaration array is a fresh object.
- New, removed, or retyped key: do not carry the stale value; use the incoming plugin's normal default/schema behavior.
- Automatic update: preserve explicit enabled/disabled state.
- Do not broaden this into arbitrary coercion between changed schemas.

## Compatibility / acceptance

Acceptance coverage should include same-type scalar preservation, structurally equivalent option-list preservation, changed-type/default behavior, new/removed keys, and disabled-state retention across automatic update. Any future argument-type addition must define semantic type equivalence explicitly.

## Risk / rollback

Risk is MEDIUM because plugin settings can include credentials and behavior-critical presets, while over-preservation can keep incompatible state. The safe rollback is to the prior update path only if accompanied by explicit user-visible migration/reset handling; silently resetting user-owned values is not an acceptable fallback.

## Durable references

Canonical ledger: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch` → `notes/idea-ledger-addenda/2026-09-04-0645-plugin-update-preserves-user-state.md`.

This Feature-ID intentionally excludes the V2 preload-alert change bundled into `89fc53db...`; that belongs to the plugin-storage preload safety boundary.
