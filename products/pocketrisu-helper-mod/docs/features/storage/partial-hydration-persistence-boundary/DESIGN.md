# Feature-ID: PARTIAL-HYDRATION-PERSISTENCE-BOUNDARY

Status: **DESIGN_NEEDED**

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `HIGH`
- Risk: `HIGH`
- Dependencies: PocketRisu current persistence/hydration ownership audit; no implementation until a partial/stub entity can reach a write boundary
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

## Problem / evidence

Multiple maintained Risu-family variants now show the same causal failure class from different directions.

- `nevaeh5379/HaejeokRisuai@6331c7dadcae1a3768fd7e45f2c7d92f6f186cb5` stops hydrating whole character trees merely to run storage analysis. It introduces an asset-field-only projection and removes a redundant full character-store load from generation initialization.
- `TripleHwang/RisuVault@e3450b58ac8c96d2d39edbf3e85293d94c74e8d3` demonstrates the write-side hazard: summary-only / partially hydrated character and chat objects must not replace persisted extension bodies. The fix adds explicit completeness markers and regression tests proving summary updates preserve unloaded bodies.
- `TripleHwang/RisuVault@1006f40204464aab97e962ded47aea697c3676ae` requires character + bounded active-chat hydration to finish before selection becomes authoritative.
- `TripleHwang/RisuVault@8b89de83f8bb2ccb7b43b172dfb56d2f53c09857` is recovery evidence for the same class of mistake: earlier relational migration could leave collapsed character bodies and required a narrowly scoped, bounded repair path.
- `TripleHwang/RisuVault@a78d57b9564f65a8089170a6020d830b4a2142b6` is direct data-loss evidence at the root-key boundary: a deferred `plugins` key was legitimately `undefined` before hydration, but the commit builder interpreted that absence as deletion and cascaded deletion into plugin rows. The fix centralizes deferred bootstrap ownership, withholds unloaded keys from both write and delete, requires explicit deletion for protected user-authored collections, restores plugin/plugin-storage state on rebase, and fails when critical blocks cannot be parsed instead of feeding `undefined` back into persistence.

The transferable lesson is not the source storage architecture. It is the ownership contract: **a partial projection may be authoritative only for the fields it explicitly owns; missing/unloaded state is not deletion, and destructive intent must be explicit.**

## Minimal safe scope

First implementation slice, if PocketRisu audit proves the hazard exists:

1. Define a runtime-only completeness/projection contract for any partially hydrated entity that can cross a persistence boundary.
2. Make write builders distinguish field-scoped updates from trusted full replacements.
3. Fail closed when an incomplete entity attempts an unscoped body replacement.
4. For protected user-authored collections, require explicit deletion intent rather than inferring deletion from `undefined`/absence.
5. Add regression tests showing a summary-only update preserves unloaded fields and an unloaded collection cannot be deleted.

Do **not** introduce relational SQL, a new storage backend, migration, or general lazy hydration merely to implement this contract.

## Ownership boundaries

- Browser/shared state: may hold summary/projection records.
- Persistence builder/serializer: owns the decision between scoped patch, explicit delete, and full replacement.
- Hydration owner: owns transitions from summary/projection to complete entity.
- Selection/UI: must not expose a record as fully authoritative when a mutation path requires unavailable fields.
- Recovery/rebase: must restore protected deferred domains before any write builder can treat them as authoritative.
- Recovery: separate concern; never use recovery as the normal write mechanism.

## Proposed mechanism

Prefer an explicit state such as `projection/completeness + ownedFields`, or an equivalent typed capability, over inference from missing values.

Write rules:

- projection record + scoped dirty fields -> update only those owned fields;
- complete trusted record -> full replacement permitted where current PocketRisu semantics already allow it;
- projection record + unscoped/full replacement request -> reject/fail closed;
- protected collection absent because not hydrated -> withhold from both write and delete;
- protected collection deletion -> require an explicit delete/remove operation after authoritative hydration;
- hydration completion -> re-resolve by stable entity identity before committing selection/mutation, so stale async completion cannot overwrite a newer selection.

Read rules:

- analyzers should request the narrowest projection they need (for example asset-bearing fields) instead of forcing full character/chat hydration;
- read-only consumers may operate on a documented projection; mutation consumers must cross the required hydration barrier first.

## Compatibility / invariants

Must preserve:

- current PocketRisu save/integrity optimizations;
- `flushServerDbKeepalive()` no-op;
- no forced DB flush on `visibilitychange` / `pagehide`;
- targeted V3 plugin reload;
- current plugin/storage authorization boundaries;
- runit; no PM2;
- no Android notification on the server phone.

Additional invariants:

- missing/unloaded data is never interpreted as intentional deletion;
- summary edits do not delete extension/plugin/chat fields outside the summary owner;
- protected user-authored collection deletion is explicit and only after authoritative state is known;
- stale hydration completion cannot commit after entity/selection identity changes;
- imports/newly created complete entities are explicitly marked authoritative rather than guessed complete from field shape;
- parse/hydration failure of a protected persisted domain fails closed instead of converting the domain to empty/undefined and persisting that state.

## Validation / acceptance

Before implementation:

- locate every PocketRisu path that can persist a character/chat/entity/root collection;
- prove whether partial/stub/unloaded entities or collections can reach those paths today;
- inventory full-replacement call sites, field-scoped patch call sites, and delete semantics;
- identify any deferred/bootstrap domains whose absence before hydration is legitimate.

If a hazard is reproduced, acceptance for the first PR:

1. A fixture with unloaded hidden/body fields receives a summary-only rename/image/note update; hidden/body data remains byte/semantic-equivalent.
2. An incomplete projection cannot trigger full replacement; test asserts deterministic failure.
3. A protected deferred collection that is not hydrated is neither written nor deleted.
4. Explicitly deleting the final item from a fully hydrated protected collection still persists the intentional empty state.
5. A parse/hydration failure in a protected block fails without emitting a destructive replacement.
6. A fully hydrated/imported entity still follows existing full-replacement semantics.
7. Rapid selection A -> B while A hydration completes late cannot make A authoritative again.
8. No extra lifecycle flush or system/device dependency is introduced.

## Risk / blast radius

Risk is `HIGH` because a wrong completeness/deletion decision can silently delete persisted user data. Keep the first change restricted to a single existing write boundary and tests. Do not combine it with storage migration or hydration expansion.

## Rollback / fallback

- Revert the scoped guard/metadata change; no persistent schema migration in the first slice.
- If projection state cannot be proven reliable, fall back to current full-hydration-before-mutation behavior rather than guessing.
- If explicit delete intent cannot be represented safely, preserve stale persisted data rather than risk destructive inference.
- No automatic repair should run as part of rollback.

## Dependencies / blockers

1. INSPECT_ONLY audit of current `hanmiyoo10-alt/PocketRisu` persistence and partial-load ownership.
2. A reproducible PocketRisu path where an incomplete entity/collection can reach a full replacement or implicit delete, or an upcoming bounded lazy-hydration change that requires the contract.
3. Exact tests for the affected write owner.

Until those are satisfied, remain `DESIGN_NEEDED` and do not create a source branch.

## PR decomposition

- PR A: tests/instrumentation proving current completeness/write/delete behavior (no semantics change where practical).
- PR B: one bounded persistence-boundary guard + projection metadata/capability + explicit delete distinction.
- PR C only if later justified: targeted read projections for proven hot analyzers.

Each PR keeps one primary goal and does not include migration, recovery repair, unrelated cleanup, or system changes.
