# PROMPT-BLOCK-ROLE-SCHEMA-COMPATIBILITY

Status: `ADOPTED`
Source evidence: `PocketRisu/PocketRisu@f8fb60fb52e815347f57ebeeaa421fc3f8fee076`, `PocketRisu/PocketRisu@e79789f9a0ccdca9316b2f0cb514a9f222a36e85`, `PocketRisu/PocketRisu@ee98b43d8b0b848e6a6b19564d28674528078ef1`

## Problem / evidence

PocketRisu added optional role selection for prompt blocks using a serialized `role` property. The immediately-following history reverted lorebook role selection and then changed the prompt-block property to `role2` specifically for backward compatibility. The current tree still contains `role2`, confirming that the compatibility boundary survived rather than being a temporary patch.

The lesson is broader than this particular field: a new persisted option must not reuse an existing key merely because the value type appears compatible. Existing saved objects may already attach another meaning to that key.

## Minimal safe scope

When evolving serialized prompt/config objects, add the smallest new field whose ownership and semantics are unambiguous. Prefer a distinct key over implicit reinterpretation. A later cleanup rename is acceptable only with an explicit migration that can prove equivalence for old and new saves.

## Ownership boundaries

- Persisted object schema owns the meaning of existing keys across versions.
- UI controls may expose a new option but do not have authority to redefine an old serialized key.
- Load normalization may fill truly absent new fields, but must not erase or reinterpret legacy semantics.
- Prompt construction consumes the normalized schema and should not guess which historical meaning a colliding key intended.

## Mechanism

1. Inventory whether the proposed serialized key already exists in any legacy object variant.
2. If semantics differ, allocate a distinct field (the adopted history used `role2`).
3. Validate the new field only on object types that support it.
4. Treat absent/invalid new-field values as legacy behavior rather than silently changing the old field.
5. If a future schema version consolidates names, perform an explicit versioned migration with fixture coverage.

## Compatibility / invariants

- Loading an old prompt template must produce the same prompt roles it produced before the new feature.
- A newly-set block-role override applies only to the intended block-role field and supported block types.
- Existing serialized `role` semantics remain untouched unless a separately-reviewed migration explicitly changes them.
- Save/load round trips do not cause an old object to acquire new behavior merely because normalization ran.
- No forced DB flush, `flushServerDbKeepalive()` change, save-integrity regression, V3 plugin reload change, PM2/service-manager change, Android notification, or device/runtime migration is involved.

## Validation / acceptance

- Load representative legacy fixtures containing old `role` data and compare generated prompts byte-for-byte or role-for-role against the pre-feature behavior.
- Create each supported prompt block with the new block-role field and verify generated roles.
- Save and reload both legacy and new fixtures; assert semantics remain stable.
- Feed missing and invalid new-field values; assert safe legacy fallback.
- If a future migration renames `role2`, include mixed-version fixtures and rollback tests.

## Risk / blast radius

Risk is `MEDIUM`: a wrong schema interpretation can silently alter model prompts for existing users without obvious storage corruption. The blast radius is bounded to prompt/config semantics and is straightforward to roll back if the old field is never destructively rewritten.

## Rollback / fallback

Revert the new-field interpretation and continue treating old serialized keys with their historical meaning. Do not destructively rewrite legacy values during rollback. If a versioned migration ever becomes necessary, retain a pre-migration backup/fixture path.

## Dependencies

`NONE` for preserving the invariant. Any future field consolidation requires a separately-reviewed migration design.

## PR decomposition

Already adopted in PocketRisu; no autonomous implementation PR is needed. Future schema additions should land one persisted semantic change per branch/PR with legacy fixture coverage.
