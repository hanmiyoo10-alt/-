# SCALAR-INTERACTION-TOUCH-PERSISTENCE

Status: assistant-owned design draft

## Problem / evidence

`nevaeh5379/HaejeokRisuai@14b5b91e775ab256df69dd20f0a9228b3aa9e7f2` reports cumulative character-switch slowdown partly caused by routine `lastInteraction` updates flowing through full character persistence. The source introduces a scalar-only touch path and regression coverage proving the touch does not rewrite relational extension nodes.

Evidence for the source behavior is strong, but direct PocketRisu applicability is still unproven; current PocketRisu code search did not reveal an identically named field.

## Minimal safe scope

Only if inspection proves PocketRisu has an equivalent high-frequency scalar interaction timestamp coupled to a broad character/entity save path:

1. detach that scalar metadata update from structural dirty tracking;
2. persist it through the smallest existing canonical write mechanism that still advances required revision/audit identity;
3. leave every structural character/chat mutation on the existing full persistence path.

No storage-format migration, new host dependency, or broad persistence refactor belongs in the first slice.

## Ownership boundaries

- UI/selection/generation code owns the semantic event that updates interaction metadata.
- Persistence code owns serialization, revision identity, backend parity, and durable acknowledgement.
- Structural character/chat stores remain authoritative for non-scalar mutations.
- The narrow touch path must never become an alternate structural write channel.

## Proposed mechanism

Prefer an existing narrow patch/update primitive if PocketRisu already has one. If none exists, add a typed scalar-touch operation at the persistence boundary rather than mutating the whole entity and suppressing dirty tracking by convention.

The operation should carry only stable entity identity plus the scalar value. Reject malformed/non-finite timestamps and preserve backend validation. Multiple touches may coalesce by entity to the newest value if ordering semantics are proven safe.

## Compatibility / invariants

- current PocketRisu save/integrity optimizations remain intact;
- revision/ETag/audit semantics remain monotonic and coherent;
- structural changes still force structural persistence;
- no forced DB flush on `visibilitychange` or `pagehide`;
- `flushServerDbKeepalive()` remains a no-op;
- no PM2, system package, device runtime, or Android-notification change;
- a scalar-touch failure must not acknowledge unrelated structural state as persisted.

## Validation / acceptance

Before implementation:

1. trace character/chat switch and generation bookkeeping in current PocketRisu;
2. prove an equivalent high-frequency scalar field exists and currently causes a broad write;
3. measure write count/bytes or relational-row churn for repeated switches.

First-slice tests, if applicable:

- scalar touch updates only the intended scalar column/record;
- relational/extension child rows are untouched;
- revision/audit identity advances exactly as required;
- real structural mutation still takes the full path;
- repeated touches preserve newest-value semantics;
- failed touch reports failure without corrupting pending structural dirty state.

Acceptance requires a measurable reduction in hot-path write work with no persistence-semantic regression.

## Risk / blast radius

Risk is MEDIUM because persistence ownership and revision semantics cross correctness boundaries. Blast radius is contained if the first slice is limited to one scalar field and one entity type.

## Rollback / fallback

Remove the narrow touch routing and return that scalar metadata to the previous full persistence path. No data migration should be required. Keep tests that distinguish scalar from structural writes so rollback behavior is explicit.

## Dependencies

- PocketRisu interaction-metadata ownership audit
- current persistence/revision path inspection
- direct measurement that broad-write coupling exists

## PR decomposition

1. **Audit + regression characterization only** — trace and test current behavior; no production change.
2. **One scalar touch path** — one entity/field, with backend parity and focused tests.
3. **Optional coalescing/metrics** — only after correctness and measurable benefit are established.

Do not move this feature to `READY_TO_PORT` until dependency #1 proves the problem exists in PocketRisu and the exact revision/audit contract is resolved.
