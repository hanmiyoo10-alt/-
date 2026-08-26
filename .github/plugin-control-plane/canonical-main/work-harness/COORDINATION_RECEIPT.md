# Repository Work Harness — Coordination Receipt v1

HARNESS-B3 adds a persistent, repository-visible coordination receipt without granting mutation authority.

A receipt is issued only from a valid active Work Record when a freshly recomputed, work-id-sorted PREFLIGHT is `STARTABLE` + unguarded `PARALLEL_SAFE`, the exact observed refs match every declared `EXACT` base, and the existing audited adapter/project registries resolve exactly one adapter for the requested capability.

The receipt binds:

- work/objective/scope/capability identity;
- Work Record profile hash;
- active work-set and PREFLIGHT hashes;
- exact observed refs and declared bases;
- adapter contract and project registry hashes;
- source authority refs;
- a fixed invalidation policy.

The persistent issue-body envelope is:

````text
<!-- repository-coordination-receipt:v1 -->
```json
{ ... exact receipt JSON ... }
```
<!-- /repository-coordination-receipt:v1 -->
````

The parser fails closed on missing, duplicate, malformed, unsupported, or integrity-invalid envelopes. Receipts are not leases and have no hidden time-based lifetime; they become invalid when the bound repository evidence changes.

## Mutation boundary

`mutation-boundary.cjs` can prove that an exact audited mutating handoff has a currently valid required receipt. A successful B3 result is only `MUTATION_BOUNDARY_READY` / `coordinationReady=true`.

B3 invariants remain:

- `mutationAuthorized=false`;
- `executionAuthorized=false`;
- mutating routes stay `HANDOFF_ONLY`;
- no workflow dispatch is performed;
- no product/release/runtime/main-write authority is transferred to the Harness.

A later explicitly activated packet is required before any existing authoritative mutation writer may enforce or consume this receipt contract.
