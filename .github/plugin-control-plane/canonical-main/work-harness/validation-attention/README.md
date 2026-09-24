# Validation Attention Projection v1

> **Repository owns validation detail. GPT receives only validation attention.**

This directory owns the Phase 8.7f thin read-only validation composition selected by
#2873 / #2875.

It does not define a second validation truth or receipt schema.

## Canonical stack

```text
existing validation owners
→ bounded child receipt/report artifacts
→ REPOSITORY_EXECUTION_RECEIPT v2
→ REPOSITORY_AGENT_DECISION_VIEW v1
```

Full child evidence stays behind stable local-artifact locators. Normal GPT-facing
output is the Agent Decision View.

## Public surface

```sh
node validation-attention-owner.cjs inspect \
  --packet '#N' \
  --pr N \
  --implementation-receipt-file /bounded/receipt.json \
  --format agent-view

node validation-attention-owner.cjs finalize \
  --packet '#N' \
  --pr N \
  --format agent-view
```

Only `receipt|agent-view` formats are supported.

There is no caller repository, branch, head, owner, workflow, check, protection,
merge method, currentization method, command, shell or artifact-path selector.

## Inspect graph

```text
canonical IMPLEMENTATION_PR receipt
→ validation-continuation inspect
→ if MERGE_ADMISSION_READY:
     validation-merge inspect
→ aggregate generic v2 receipt
→ Agent Decision View
```

The continuation owner remains authoritative for checkpoint/candidate reduction.
The validation-merge owner remains authoritative for reviews, overlap, exact-head
Required, strict branch protection and ancestry/currentness.

The composition never turns a non-ready continuation into merge admission.

Important routes:

- `MERGE_ADMISSION_READY` → validation-merge inspect;
- `CURRENTIZATION_REQUIRED` → BLOCKED + existing currentization next action;
- `VALIDATION_REFRESH_REQUIRED` → BLOCKED + existing validation refresh;
- `NEEDS_RECOVERY_INSPECT` → bounded NEEDS_REVIEW attention;
- `UNKNOWN` / `CONFLICT` / `BLOCKED` remain explicit;
- `ALREADY_MERGED` never causes merge admission or a merge retry.

## Finalize graph

Finalize requires a canonical PASS validation-attention inspect sidecar for the same
packet/PR/head.

```text
validation-attention inspect evidence
→ existing validation-merge finalize
→ exact merge/head readback
→ existing stage-receipt projector
→ repository-neutral validation-finalization evidence
→ existing validation-finalization classifier
→ generic v2 receipt
→ Agent Decision View
```

V1 finalization is deliberately repository-neutral only. The packet must positively
prove that every path is under canonical-main repository infrastructure and every
semantic surface is `surface:repo:*`.

Product/MCL coordination is never silently mapped to `NOT_APPLICABLE`.

The derived canonical VALIDATION_MERGE receipt is evidence inside the local full
report. V1 does not publish it to an issue and does not call the stage-checkpoint
writer.

## Normal-path view

Clean inspect:

```json
{
  "result": "PASS",
  "attentionDisposition": "COMPLETE",
  "attentionCount": 0,
  "output": {
    "currentization": "NOT_REQUIRED",
    "required": "PASS",
    "reviews": "CLEAR",
    "threads": "CLEAR",
    "branchProtection": "PASS",
    "overlap": "DISJOINT",
    "mergeAdmission": "READY"
  },
  "nextLegalAction": "MERGE_PR_WITH_EXISTING_EXPECTED_HEAD_ENDPOINT"
}
```

Clean finalize:

```json
{
  "result": "PASS",
  "attentionDisposition": "COMPLETE",
  "attentionCount": 0,
  "output": {
    "mergeAdmission": "COMPLETE",
    "finalization": "ALREADY_FINALIZED"
  },
  "nextLegalAction": "POSTMERGE_CONVERGENCE"
}
```

Normal semantic-surface budget:

```text
validation-attention inspect
→ existing expected-head merge
→ validation-attention finalize
```

Maximum: 3.

## Evidence storage

The composition persists bounded 0600 receipt/report sidecars below the checkout Git
administrative directory.

The aggregate report retains child receipt/report identities and locators instead of
copying raw GitHub responses or logs.

Normal output never includes raw shell transcript, comments, CI logs, credentials,
lease/holder capabilities or conversation content.

## Attention contract

Clean PASS has zero attention items.

Non-PASS uses bounded reason + stable child locator. UNKNOWN and CONFLICT cannot be
compressed away.

The existing Agent Decision View still owns priority ordering, display caps,
`truncated`, `criticalTruncated` and fallback behavior.

## Authority ceiling

V1 is read-only evidence composition.

It never:
- merges, updates or currentizes a PR;
- writes refs or source;
- acquires/releases coordination;
- dispatches workflows;
- writes issues or stage checkpoints;
- changes branch protection or Required;
- runs arbitrary shell/commands;
- grants merge, release, production, runtime, security or device authority;
- reads or reacts to #2874 review-onset observations.

The protected expected-head merge endpoint remains an external explicit effect.

## Validation

```sh
node --check .github/plugin-control-plane/canonical-main/work-harness/validation-attention/validation-attention-owner.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-attention/tests/validation-attention-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-continuation/tests/validation-continuation-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-merge/tests/validation-merge-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-finalization/tests/validation-finalization-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/execution-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/agent-decision-view-contract.cjs
node .github/plugin-control-plane/canonical-main/tests/work-system-contract.cjs
git diff --check
```

Review/classification onset is separately observed by #2874 and is not an
implementation gate.
