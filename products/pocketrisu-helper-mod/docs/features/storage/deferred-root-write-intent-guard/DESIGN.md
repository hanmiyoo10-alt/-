# DEFERRED-ROOT-WRITE-INTENT-GUARD

## Problem / evidence

`TripleHwang/RisuVault@a78d57b9564f65a8089170a6020d830b4a2142b6` records a concrete data-loss failure: a durable root collection was intentionally absent from the initial bootstrap payload, so the client saw `undefined` before deferred hydration. The write builder treated that absence as delete intent and cascaded deletion into plugin-owned rows.

PocketRisu has not yet been shown to have the same owner/path, so evidence is external and implementation remains design-only.

## Minimal safe scope

If PocketRisu exposes a matching lazy/deferred durable root owner, first land only:

1. regression tests that distinguish `NOT_LOADED`, `LOADED_EMPTY`, `DIRTY_VALUE`, and `EXPLICIT_DELETE`;
2. an explicit write-intent boundary preventing `NOT_LOADED` from producing a delete/empty replacement;
3. a single-source ownership/deferred-key contract if more than one runtime participates.

No storage-format migration and no broad domain-store rewrite.

## Ownership boundaries

- persistence write planner / dirty-commit owner;
- lazy/deferred hydration owner;
- any server/browser shared root-key contract;
- destructive delete/cascade boundary.

UI code must not infer delete intent from missing values.

## Mechanism

Represent persistence intent explicitly rather than overloading value presence. A root/domain write planner should be able to return at least `SKIP_NOT_LOADED`, `WRITE(value)`, and `DELETE_EXPLICIT`. Until hydration establishes authority for a deferred domain, write planning must fail safe by skipping that domain. After hydration, an intentionally empty collection is a valid write and an explicit user/system delete remains possible through a separate intent path.

If client and server independently decide which roots are deferred, derive both from one framework-neutral contract or assert equality in tests to prevent drift.

## Compatibility / invariants

- unloaded state is never deletion intent;
- an explicitly loaded empty collection remains persistable;
- an explicit delete remains possible and testable after authority is established;
- existing PocketRisu save/integrity optimizations remain unchanged outside the matching owner;
- no forced DB flush on `visibilitychange` or `pagehide`;
- `flushServerDbKeepalive()` remains a no-op;
- targeted V3 plugin reload remains intact;
- no host/runtime/service-manager migration.

## Validation / acceptance

Acceptance requires a reproducible PocketRisu path and tests proving:

- save/commit before deferred hydration emits no destructive operation for that domain;
- hydration followed by a normal mutation persists correctly;
- hydration followed by an explicit delete deletes exactly the intended domain;
- parse/hydration failure cannot silently materialize an empty collection and persist it;
- client/server deferred-domain definitions cannot drift if both participate;
- regression tests cover cascade-owning collections such as plugin state if applicable.

## Risk / blast radius

Risk is HIGH because mistakes at this boundary can permanently delete durable user state. The safe failure mode is stale data or a blocked write, not guessed deletion.

## Rollback / fallback

The first production slice, if ever justified, must be isolated behind the existing write planner and revert cleanly to the prior planner with no schema changes. If semantics are uncertain at runtime, skip the affected domain and surface diagnostics rather than deleting it.

## Dependencies

- identify a matching PocketRisu lazy/deferred persistence owner;
- reproduce an unloaded-state write reaching persistence;
- map cascade/child ownership for the affected root;
- define explicit delete intent and authoritative hydration completion.

## PR decomposition

1. Test-only reproduction and state/intent contract.
2. Minimal planner guard for one proven domain.
3. Shared contract hardening only if multiple runtimes own the deferred-key list.
4. Extend to additional domains only with independent tests.

Lifecycle remains `DESIGN_NEEDED`; do not move to `READY_TO_PORT` until the matching PocketRisu failure/path is confirmed and rollback/validation are concrete.
