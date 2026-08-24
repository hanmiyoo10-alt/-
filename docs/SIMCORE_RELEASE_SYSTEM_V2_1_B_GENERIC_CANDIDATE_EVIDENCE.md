# SimCore Release System v2.1 — B Generic Candidate Controller Evidence

Date: 2026-08-25
Status: **IMPLEMENTED · PENDING PERMANENT CI · NON-RUNTIME**
Parent: R2.1-A retired v0.64.7-only candidate workflows

## Implemented permanent surface

- `.github/workflows/product-simcore-candidate-materialize.yml`
- `products/simcore/tooling/candidate-materialize.mjs`
- `products/simcore/tests/suites/candidate-materialize.test.mjs`
- `products/simcore/tests/fixtures/candidate-materialize/cases.json`

Candidate requests live under `products/simcore/releases/candidate-requests/*.json`.

## Implementation refinement from design

The merged product commit itself is the immutable source commit `S`; the operator does not type `sourceCommit` into the request. The workflow binds `S = github.sha` for the exact triggering main commit. This removes a machine-known identity field from human input while retaining immutable builder bytes.

Exact-existing idempotency is defined by the candidate ref's immutable commit having:

```text
parent == expected P
candidate tree == freshly materialized expected tree
latest blob == install blob
```

If those identities match, the existing candidate commit is authoritative and the retry returns `ALREADY_MATERIALIZED / PASS / no mutation`. A different parent or tree is `CANDIDATE_REF_CONFLICT / BLOCK`. Candidate refs are never force-updated by production code.

## Authority boundary

The generic candidate lane may write only candidate transport refs. It has no `release-simcore` publisher and no main-state writer.

```text
candidate materialize
= build + verify + candidate transport only
production mutation = NONE
release authority = CANDIDATE_TRANSPORT_ONLY
```

The permanent regression suite covers schema rejection, builder/path allowlists, parent movement, direct-child creation, exact-existing NOOP/PASS, conflicting ref BLOCK, mirror equality, and static absence of publication/main-write primitives.

R2.1-B is not closed until permanent SimCore Verify/Required PASS and merge evidence are recorded.
