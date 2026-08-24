# SimCore Release System v2.1 — E Exact Approval Resolution Evidence

Date: 2026-08-25
Status: **CLOSED · IMPLEMENTED NOT ACTIVE · OPERATIONAL POLICY DEFERRED · NON-RUNTIME**

## Closure verdict

R2.1-E approval-resolution infrastructure is implemented, permanent-CI verified, merged to durable `main`, and documented.

The separate operator policy for using this infrastructure to authorize or trigger an actual release was explicitly excluded from this work item and remains deferred for a later discussion.

```text
E implementation / qualification = CLOSED
approval resolver implementation = PRESENT
approval resolver operational activation = FALSE
machine-derived spec authority = SHADOW_ONLY
publication dispatch from E = DISABLED_PENDING_OPERATOR_DECISION
actual release approval semantics = DEFER
runtime mutation = NONE
release-simcore mutation = NONE
```

Classification retained:

```text
R2_1_E_OPERATIONAL_APPROVAL_POLICY
= DEFER / OPERATOR_POLICY / NON_RUNTIME
```

## Preconditions

R2.1-E implementation began only after durable A/B/C/D composition qualification:

- A one-shot retirement: CLOSED
- B generic candidate controller: CLOSED
- C machine candidate receipt/spec shadow: CLOSED
- D LIVE_PENDING convergence: CLOSED
- qualification merge: `47028d800965fb7eeae8b00385c2ba7acdbc39e8`

The frozen `B_C_D_QUALIFIED` activation gate was therefore preserved.

## Pre-activation finding and permanent repair

While implementing E, the machine spec shadow path was found to omit the release-schema-required rollback block for `ROLLBACK` releases.

```text
R2_1_E_ROLLBACK_MACHINE_SPEC_MISSING_ROLLBACK_BLOCK
= FIX / MACHINE_SPEC / PRE_ACTIVATION / NON_RUNTIME
```

Permanent repair:

- rollback candidate requests must provide bounded `approvedSafeCommit`, `approvedSafeBlob`, and `reasonCode` metadata;
- `candidate-receipt.mjs` preserves that metadata into the derived rollback spec;
- missing/invalid rollback metadata fails closed;
- non-rollback specs may not gain rollback metadata.

No production path had consumed machine spec authority before this repair.

## Exact approval resolver

Permanent application owner:

`products/simcore/tooling/release-approval-resolve.mjs`

Human-facing schema:

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

The resolver derives machine-known identities from the bound candidate receipt and `SHADOW_ONLY` spec, then revalidates:

```text
approval path exact
approval schema exact / no extra identity fields
receipt PASS / CANDIDATE_RECEIPT_ONLY
receipt releaseId == approval releaseId
spec shadow authority == SHADOW_ONLY
spec shadow bound to exact receipt
resolved spec schema exact / no manual override fields
resolved C/P/blob == receipt C/P/blob
NEW_VERSION / SAME_VERSION_CORRECTION / ROLLBACK semantics
rollback metadata when required
observed candidate ref == receipt C
observed production == receipt P
human live gate remains required
```

## Authority boundary after closure

The resolver emits:

```text
decision = APPROVAL_RESOLVED_SHADOW
releaseAuthority = APPROVAL_RESOLUTION_ONLY
productionMutation = NONE
publicationDispatch = DISABLED_PENDING_OPERATOR_DECISION
```

It contains no publisher, `repo-main-write.py`, `gh workflow run`, or production push primitive.

Therefore implementation closure does **not** decide whether the future operator approval should be a merge, another explicit action, or a different policy.

## Permanent coverage

Positive resolution:

```text
NEW_VERSION
SAME_VERSION_CORRECTION
ROLLBACK
```

Fail-closed negatives:

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

## Superseded first implementation evidence

PR `#286` reached two complete permanent CI passes:

```text
run      32766766843
Verify   97557881830  PASS
Required 97558019582  PASS

run      32766947598
Verify   97558454976  PASS
Required 97558550787  PASS
```

Before merge, unrelated repository control-plane work advanced `main`.

```text
R2_1_E_PREMERGE_BASE_DRIFT
= FIX / REBASE / NON_RUNTIME / NO_PRODUCTION_IMPACT
```

No force or bypass was used. PR #286 was closed unmerged and retained as superseded evidence.

## Final implementation evidence

Fresh-main PR `#289` re-established the same E diff on the current repository-control-plane baseline.

Initial fresh-base permanent CI:

```text
run      32767651870
Verify   97560658706  PASS
Required 97560832118  PASS
```

When `main` advanced once more through unrelated repository control-plane work, the branch absorbed it through a normal two-parent merge commit with latest-main tree preservation; no force update was used.

Final merge-head permanent CI:

```text
run      32767935072
Verify   97561541664  PASS
Required 97561670705  PASS
```

PR `#289` merged to main as:

`3d23e088980d409a3085c58cb435a733e8d67cef`

The merge preserves the latest repository control-plane changes and the exact E implementation simultaneously.

## Production boundary

Throughout E implementation and closure:

```text
runtime mutation = NONE
release-simcore mutation = NONE
current production = v0.64.7
current human gate = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
```

No approval object was used for a real release, no permanent caller was dispatched through E, and no production publication occurred.

## Next boundary

The only intentional next E topic is:

`DISCUSS_R2_1_E_OPERATIONAL_APPROVAL_POLICY`

That future discussion is a separate operator-policy/activation decision and must not rewrite this implementation evidence as if E had already become release authority.
