# Canonical Receipt Attention Adapter v1

This directory owns one narrow read-only compatibility adapter for Phase 8.7f.1.

## Purpose

A canonical stage receipt may already prove the relevant repository stage, while an agent still has to understand the receipt parser/projector shape before it can consume that proof.

This adapter removes only that consumption plumbing:

```text
already-materialized CANONICAL_MAIN_STAGE_RECEIPT v1
→ existing parseRenderedStageReceipt()
→ expected-stage check
→ existing REPOSITORY_EXECUTION_RECEIPT v2
→ existing REPOSITORY_AGENT_DECISION_VIEW v1
→ bounded attention
```

It does not discover repository truth and it does not perform or reopen execution.

## Public API

`canonical-receipt-attention-adapter.cjs` exports:

```js
projectCanonicalReceiptAttention({
  receiptText,
  expectedStage,
  receiptLocator,
})
```

Inputs are intentionally narrow:

- `receiptText` is canonical rendered stage-receipt text already held by the owning caller.
- `expectedStage` must be one existing canonical-main stage.
- `receiptLocator` is a bounded stable evidence locator used for projection and targeted drill-down only.

The adapter accepts no parser selector, schema selector, projector selector, filesystem path, repository selector, PR/main locator, command, argv, or shell payload.

V1 supports exactly one compile-time receipt type: the existing canonical stage receipt v1.

## Authority boundary

The canonical stage receipt remains derived evidence. Existing owners remain authoritative for repository state, Git, CI, merge, currentization, validation finalization, postmerge proof, runtime, release, and production.

The adapter:

- performs no GitHub or network reads;
- performs no filesystem artifact discovery;
- performs no repository or issue writes;
- performs no command execution;
- performs no merge/currentization/finalization retry;
- grants no mutation, execution, merge, release, production, runtime, or security authority.

Projection failure is never execution failure and never permission to replay an already-proven effect.

## Result semantics

The existing stage-receipt parser is the only receipt parser.

- canonical valid receipt: reuse its reprojected identity and digest;
- missing/unsupported/malformed canonical block: preserve the parser's `UNKNOWN`;
- digest or canonical identity contradiction: preserve `CONFLICT`;
- expected-stage mismatch: `CONFLICT`;
- stage `PASS`: execution receipt v2 `FINISHED / COMPLETE / PASS`;
- stage `FAIL / BLOCKED / UNKNOWN / CONFLICT`: preserve that strength without upgrading it.

A clean Agent Decision View has zero attention items.

A non-PASS adapter result emits at most one attention item pointing at the supplied source receipt locator. The adapter itself does not perform the drill-down.

## Normal path

Normal output exposes only bounded semantic projection:

- expected/source stage;
- source stage status;
- canonical source receipt digest;
- execution receipt result and next legal action;
- zero attention on clean PASS.

Raw receipt text and parser internals are not copied into the normal decision view.

## Validation

Focused contract:

```sh
node .github/plugin-control-plane/canonical-main/work-harness/receipt-attention/tests/canonical-receipt-attention-adapter-contract.cjs
```

Neighboring contracts remain authoritative and should also pass before publication:

```sh
node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/execution-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/agent-decision-view-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-attention/tests/validation-attention-owner-contract.cjs
```

This directory is a compatibility seam, not a new semantic validation owner.
