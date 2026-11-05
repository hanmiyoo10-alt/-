# Validation Convergence — bounded invocation surface

This directory owns a thin read-only invocation wrapper for the existing canonical-main
validation stack.

It exists to remove caller-side receipt-file and shell plumbing. It does not define a
new validation truth, merge authority, currentization owner, CI waiter, or receipt
schema.

## Canonical stack

```text
packet + PR
→ live PR head
→ bounded packet comment read
→ existing stage-receipt parser
→ existing validation-continuation candidate reducer
→ exact current-head IMPLEMENTATION_PR receipt
→ existing validation-attention inspect/finalize
→ existing Agent Decision View / receipt
```

The semantic owners remain authoritative:

- `../stage-receipt.cjs`
- `../validation-continuation/validation-continuation-owner.cjs`
- `../validation-attention/validation-attention-owner.cjs`
- `../validation-merge/validation-merge-owner.cjs`
- `../validation-finalization/**`

## Public CLI

```sh
node validation-convergence.cjs inspect --packet '#N' --pr N
node validation-convergence.cjs inspect --packet '#N' --pr N --format receipt
node validation-convergence.cjs finalize --packet '#N' --pr N
node validation-convergence.cjs finalize --packet '#N' --pr N --format receipt
```

Only these inputs are accepted:

- command: `inspect` or `finalize`;
- packet number;
- PR number;
- optional format: `agent-view` or `receipt`.

There is no caller-selected repository, ref, branch, head, receipt file, comment,
workflow, command, shell, merge method, currentization method, or artifact path.

## Inspect semantics

Inspect first reads the live PR identity through the existing validation-continuation
PR reader. Packet comments are then read with a fixed 100-item page size and a fixed
20-page ceiling.

Canonical receipt handling is delegated:

1. `stageReceipt.parseRenderedStageReceipt()` validates rendered receipt identity;
2. `validationContinuation.collectCanonicalCandidates()` maps usable
   IMPLEMENTATION_PR evidence;
3. `validationContinuation.reduceCandidates(..., liveHead)` selects the current
   live-head semantic generation or preserves missing/conflict evidence;
4. the reducer-selected receipt digest is resolved back to the validated receipt
   object;
5. that receipt object is passed unchanged to
   `validationAttention.inspectComposition()`.

Historical receipts remain evidence but cannot satisfy a different live PR head.
There is no latest-comment-wins rule.

Malformed canonical evidence, pagination exhaustion, missing current-head evidence,
and conflicting current-head evidence fail closed through existing validation
attention semantics.

## Finalize semantics

Finalize delegates packet + PR directly to
`validationAttention.finalizeComposition()`.

The wrapper does not merge. Existing validation-attention finalization still requires
the canonical matching inspect sidecar and exact merge attribution owned by the
existing validation stack.

## Bounded execution

V1 is a single-snapshot command. It does not:

- poll or wait indefinitely;
- rerun or dispatch CI;
- currentize a branch;
- merge a PR;
- update issues or refs;
- write releases or production state;
- operate runtime or devices;
- run arbitrary caller-supplied commands.

The existing validation-attention evidence sidecars remain local bounded artifacts.
GitHub interaction performed by this wrapper is observational only.

## Failure contract

The wrapper preserves the existing fail-closed vocabulary. It never upgrades
`UNKNOWN`, `CONFLICT`, `BLOCKED`, or review-needed evidence merely because
independent checks look green.

If the connected host cannot execute this bounded command, callers preserve
`BLOCKED_CAPABILITY`; they do not manually reconstruct a validation-attention PASS.

## Validation

```sh
node --check .github/plugin-control-plane/canonical-main/work-harness/validation-convergence/validation-convergence.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-convergence/tests/validation-convergence-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-attention/tests/validation-attention-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-continuation/tests/validation-continuation-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-merge/tests/validation-merge-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-finalization/tests/validation-finalization-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/tests/work-system-contract.cjs
git diff --check
```

Implementation owner: #3461. Design owner: #3460. Backlog source: #3438 item 4.
