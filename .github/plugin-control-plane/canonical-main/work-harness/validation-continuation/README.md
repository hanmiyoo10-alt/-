# Validation continuation projection v1

This owner is the Phase 8.7c read-only continuation seam for canonical-main `VALIDATION_MERGE`.

## Core invariant

> Reuse exact head-bound proof; always refresh authority-bound merge admission.

The owner answers only where an interrupted or resumed validation flow may safely re-enter existing owners. It never performs currentization, CI dispatch, coordination effects, merge, recovery, release, production, runtime, or device mutation.

## Operation

```text
node validation-continuation-owner.cjs inspect \
  --packet '#N' \
  --pr N \
  --format agent-view
```

The repository is fixed to `hanmiyoo10-alt/-`. V1 accepts no caller repository, branch, owner, evidence comment, lease, holder, command, workflow, merge method, or currentization request.

## Resume dispositions

Exactly:

```text
ALREADY_MERGED
MERGE_ADMISSION_READY
CURRENTIZATION_REQUIRED
VALIDATION_REFRESH_REQUIRED
NEEDS_RECOVERY_INSPECT
BLOCKED
NEEDS_REVIEW
UNKNOWN
```

## Exact checkpoint reduction

Durable canonical stage receipts are parsed through `stage-receipt.cjs`, re-projected, and digest-verified.

Evidence is never selected by timestamp, comment id, or comment order. Historical candidate receipts remain valid history but do not become the live candidate unless their exact PR head matches the current PR head. Multiple valid receipts for the same live head must agree on candidate head, diff identity, and exact path scope or the result is `NEEDS_REVIEW / VALIDATION_CHECKPOINT_CONFLICT`.

Minimum identity chain:

```text
packet + PR
→ exact IMPLEMENTATION_PR PASS receipt
→ candidate head + diff identity + path scope
→ head-bound validation evidence
→ live PR state
→ bounded resume disposition
```

## Head-bound versus authority-bound evidence

Reusable only while exact identity remains valid:

- candidate head;
- diff identity;
- path scope;
- exact-head Required and owning validation/CI;
- canonical currentization/replay-safe evidence.

Never reused as merge authority:

- current main / #485;
- branch protection and strict-up-to-date state;
- reviews / requested reviewers / unresolved threads;
- fresh overlap;
- merge state;
- coordination admission required by the selected effect owner.

`MERGE_ADMISSION_READY` therefore always returns `freshAdmissionRequired=true`.

## Currentization state

Internal vocabulary:

```text
EXACT_CURRENT_MAIN
REPLAY_SAFE
STALE
UNKNOWN
```

A current main mismatch without separately reviewed replay-safe evidence returns `CURRENTIZATION_REQUIRED`. A plain PR base-ref match is not sufficient because strict branch protection may still report a candidate as behind.

## Validation refresh

If candidate/currentization identity remains usable but exact-head Required or owning CI evidence is missing or failed, return `VALIDATION_REFRESH_REQUIRED`. Source/currentization replay is not implied.

## Already merged / lost acknowledgement

If GitHub proves the target PR is merged and the preserved PR head exactly matches the canonical candidate:

```text
ALREADY_MERGED
mergeEffect=COMPLETE
freshAdmissionRequired=false
nextLegalAction=VALIDATION_MERGE_FINALIZE
```

No merge retry occurs.

Ambiguous merge attribution routes to `NEEDS_RECOVERY_INSPECT`; unreadable merge state remains `UNKNOWN`.

## Coordination boundary

Prior coordination may be projected only as `CONVERGED | NOT_APPLICABLE | UNKNOWN` from canonical evidence. An old D-013 lease, D-014 manifest capability, or holder capability is never reused.

The owner imports no MCL lease/holder effect surface.

## GPT-facing output

Normal agent view exposes only bounded scalars such as:

```json
{
  "resumeDisposition": "MERGE_ADMISSION_READY",
  "candidateHead": "<sha>",
  "diffIdentity": "<sha256>",
  "currentization": "EXACT_CURRENT_MAIN",
  "required": "PASS",
  "ownerCI": "PASS",
  "priorCoordination": "CONVERGED",
  "mergeEffect": "ABSENT",
  "freshAdmissionRequired": true
}
```

Raw comments, PR payloads, CI logs, Git history/status, lease or holder state, credentials, environment, and free-form diagnostics stay behind bounded evidence locators.

## Authority boundary

The owner never:

- pushes, rebases, currentizes, resets, stashes, or cleans;
- dispatches or reruns CI;
- acquires/releases D-013;
- creates/rebinds D-014;
- claims/releases/cleans a holder;
- creates/updates/merges a PR;
- performs effect recovery;
- edits packet issues;
- grants release, production, runtime, security, or device authority.

Actual merge admission remains the existing Phase 8.7b owner and expected-head merge endpoint. Ambiguous effects remain owned by Phase 8.6.5 recovery.

## Validation

```text
node --check .github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-receipt-contract.cjs
node --check .github/plugin-control-plane/canonical-main/work-harness/validation-continuation/validation-continuation-owner.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-continuation/tests/validation-continuation-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-merge/tests/validation-merge-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/tests/work-system-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/execution-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/agent-decision-view-contract.cjs
git diff --check
```

Natural live proof is read-only. Do not manufacture or rewind a PR solely to exercise a disposition.
