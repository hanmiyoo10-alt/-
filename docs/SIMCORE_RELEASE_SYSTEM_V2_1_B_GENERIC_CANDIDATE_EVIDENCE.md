# SimCore Release System v2.1 — B Generic Candidate Controller Evidence

Date: 2026-08-25
Status: **CI VERIFIED · NON-RUNTIME · READY TO MERGE**
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

## First permanent CI finding

PR `#268`, run `32761786586`:

```text
Verify   97542081438  FAIL
Required 97542197133  FAIL
trusted predecessor   PASS
proposed GATE_CI_SELF PASS
proposed GATE_STATIC  PASS
proposed GATE_ARCH    PASS
proposed GATE_REGRESSION INFRA_ERROR
reason = FIXTURE_SCHEMA_INVALID: fixture envelope
```

Classification:

```text
R2_1_B_CANDIDATE_FIXTURE_ENVELOPE_INVALID
= FIX / TEST_HARNESS / NON_RUNTIME / PRE_MERGE
```

Cause: the new candidate fixture was initially committed as a raw JSON array rather than the standard SimCore fixture envelope (`schemaVersion`, `id`, `suite`, `input`, `expected`, `meta`). The candidate controller itself had not reached a semantic failure. The fixture was converted to the canonical envelope.

## Successful requalification

Same PR after the fixture repair:

```text
run      32762117327
Verify   97543197684  PASS
Required 97543371370  PASS
```

This proves the permanent batch-a regression now executes the generic candidate controller fixture successfully, including direct-child creation, exact retry `ALREADY_MATERIALIZED`, conflicting ref BLOCK, and parent-movement BLOCK.

Production impact throughout:

```text
runtime mutation = NONE
release-simcore mutation = NONE
v0.64.7 production unchanged
```

Final merge must still be followed by durable-main re-observation before R2.1-B is called closed.
