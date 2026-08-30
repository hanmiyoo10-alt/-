# NONEMPTY-CORE-COLLECTION-RECOVERY

Status: ADOPTED invariant

## Problem / evidence

Official PocketRisu commit `58717c5ae07a8b7a12ae42fb186f657f1418afce` fixed a migration/recovery hole where `personas: []` survived nullish defaulting even though downstream persona UI assumes `personas[0]` exists. The personal fork currently retains the same guard in `src/ts/storage/database.svelte.ts`.

## Minimal safe scope

For core persisted collections whose consumers require at least one element, validate the minimum usable shape during database normalization. Repair only invalid shapes such as non-array or empty values when the contract explicitly requires non-empty state.

## Ownership boundary

- Owner: DB normalization/migration boundary (`setDatabase`-style logic).
- Consumer contract: persona UI and any logic that relies on `personas[0]`.
- Non-owner: generic UI components should not each invent fallback personas after normalization.

## Mechanism

Check semantic minimum shape rather than only nullish presence. For personas, accept a valid non-empty array unchanged; otherwise rebuild the canonical default persona from the persisted user fields.

## Compatibility / invariants

- Preserve valid non-empty user data byte-for-byte except for unrelated existing normalization.
- Do not generalize `empty => default` to collections where empty is a legitimate state.
- Keep recovery deterministic and local; do not trigger destructive migrations or external I/O.
- Preserve all PocketRisu save/integrity guardrails.

## Validation / acceptance

Regression fixtures should cover:

1. missing `personas` -> canonical default persona;
2. non-array `personas` -> canonical default persona;
3. `personas: []` -> canonical default persona;
4. valid non-empty personas -> unchanged;
5. downstream persona access after normalization does not crash.

Acceptance: invalid minimum shapes are repaired before consumers run, while valid user collections are untouched.

## Risk / blast radius

Low and localized. Main risk is over-applying the pattern and replacing intentionally empty collections. Containment is explicit per-field minimum-shape contracts.

## Rollback / fallback

Revert the normalization guard if it mutates valid data. No schema or storage migration is required to roll back.

## Dependencies

None.

## PR decomposition

No new PR is required: this invariant is already adopted. Any future refactor of DB normalization should carry the fixture set above in the same feature-specific PR.
