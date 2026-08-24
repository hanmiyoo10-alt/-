# SimCore Release System v2.1 — E Exact Approval Resolution Evidence

Date: 2026-08-25
Status: **IMPLEMENTED · PERMANENT CI VERIFIED · OPERATIONAL ACTIVATION DEFERRED · NON-RUNTIME**

## Scope decision

This work implements only the R2.1-E approval-resolution infrastructure.

The operator policy for using that approval to trigger an actual release is deliberately **not activated in this work item** and must be discussed separately before any cutover.

```text
E implementation / qualification = COMPLETE AFTER MERGE
actual release approval semantics = DEFER
permanent caller dispatch from E = DISABLED
runtime mutation = NONE
release-simcore mutation = NONE
```

Classification:

```text
R2_1_E_OPERATIONAL_APPROVAL_POLICY
= DEFER / OPERATOR_POLICY / NON_RUNTIME
```

## Preconditions

R2.1-E implementation was opened only after durable A/B/C/D composition qualification:

- A one-shot retirement: CLOSED
- B generic candidate controller: CLOSED
- C machine candidate receipt/spec shadow: CLOSED
- D LIVE_PENDING convergence: CLOSED
- qualification merge: `47028d800965fb7eeae8b00385c2ba7acdbc39e8`

The frozen `B_C_D_QUALIFIED` gate therefore remained intact.

## Pre-activation finding

While implementing E, the machine spec shadow path was found to omit the release-schema-required rollback block for `ROLLBACK` releases.

```text
R2_1_E_ROLLBACK_MACHINE_SPEC_MISSING_ROLLBACK_BLOCK
= FIX / MACHINE_SPEC / PRE_ACTIVATION / NON_RUNTIME
```

Repair:

- rollback candidate requests must provide bounded `approvedSafeCommit`, `approvedSafeBlob`, and `reasonCode` metadata before a rollback machine spec can resolve;
- `candidate-receipt.mjs` now preserves that metadata into the derived rollback spec;
- missing/invalid rollback metadata fails closed;
- non-rollback specs may not gain rollback metadata.

No production path had consumed machine spec authority before this repair.

## Exact approval resolver

New permanent application owner:

`products/simcore/tooling/release-approval-resolve.mjs`

Human-facing approval schema:

`products/simcore/releases/release-approval-schema-v1.json`

The approval object is intentionally limited to:

```json
{
  "schemaVersion": 1,
  "releaseId": "simcore-vX.Y.Z-<mode>-NN",
  "candidateReceiptPath": "products/simcore/releases/candidate-receipts/<intent>.json",
  "authorityConfirmation": "RS2_4_RELEASE"
}
```

It cannot embed or override C, P, or blob identities.

The resolver derives them only from the machine candidate receipt and the bound spec shadow, then revalidates:

```text
approval path exact
approval schema exact / no extra identity fields
receipt exists / PASS / CANDIDATE_RECEIPT_ONLY
receipt releaseId == approval releaseId
spec shadow authority == SHADOW_ONLY
spec shadow bound to exact receipt
resolved spec schema exact / no extra manual override fields
resolved C/P/blob == receipt C/P/blob
NEW_VERSION / SAME_VERSION_CORRECTION / ROLLBACK semantics
rollback metadata when required
observed candidate ref == receipt C
observed production == receipt P
human live gate remains required
```

## Current authority boundary

The resolver emits:

```text
decision = APPROVAL_RESOLVED_SHADOW
releaseAuthority = APPROVAL_RESOLUTION_ONLY
productionMutation = NONE
publicationDispatch = DISABLED_PENDING_OPERATOR_DECISION
```

It contains no publisher, `repo-main-write.py`, `gh workflow run`, or production push primitive.

Therefore this implementation **does not decide** whether the future steady-state human approval should be one merge, another explicit action, or some different operator policy. That decision is intentionally left for the next discussion.

## Permanent coverage

The `release-approval` batch-a suite proves positive resolution for:

```text
NEW_VERSION
SAME_VERSION_CORRECTION
ROLLBACK
```

and fail-closed negatives:

```text
E-N1 human approval cannot embed candidate identity
E-N2 receipt release mismatch blocks
E-N3 receipt path mismatch blocks
E-N4 candidate ref movement blocks
E-N5 production parent movement blocks
E-N6 spec candidate mismatch blocks
E-N7 rollback metadata omission blocks
E-N8 authority marker mismatch blocks
E-N9 machine spec extra/manual override field blocks
E-N10 approval path mismatch blocks
E-N11 resolver contains no publication authority
```

## Permanent CI evidence

PR `#286`, first implementation-complete head:

```text
run      32766766843
Verify   97557881830  PASS
Required 97558019582  PASS
```

This PASS includes the current batch-a composition with candidate materialization, machine receipt/spec shadow, LIVE_PENDING convergence, and exact approval-resolution tests together.

Production boundary at this evidence point:

```text
runtime mutation = NONE
release-simcore mutation = NONE
current production = v0.64.7
current human gate = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
```

A final documentation/status head must also receive permanent Verify/Required PASS before merge. After merge and durable-main re-observation, R2.1-E implementation may be marked CLOSED_IMPLEMENTED_NOT_ACTIVE. Operational release activation remains deferred even after implementation closure.
