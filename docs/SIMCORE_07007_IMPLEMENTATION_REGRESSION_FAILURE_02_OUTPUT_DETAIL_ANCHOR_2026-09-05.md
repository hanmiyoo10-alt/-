# SimCore v0.70.7 Implementation Regression Failure 02 — Output Detail Anchor

Date: 2026-09-05 KST
Status: **PRESERVED · FIX / BLOCKER · IMPLEMENTATION OUTPUT-DETAIL ANCHOR · NON-RUNTIME · PRODUCTION UNCHANGED**

## 1. Failure identity

Implementation PR:

- PR `#1530`
- head `17ce795ca6c4565fdccce50a19a56ca2c717de0a`
- base `3d9ff03c849d1f78f20637599fb19fea5ac77970`
- SimCore CI run `33964914977`

Result:

```text
Verify   = FAILURE
Required = FAILURE
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
reasonCode = PERMANENT_REGRESSION_FAIL
```

Bounded regression stderr:

```text
SUITE_ASSERTION_FAILED: builder-v07007:
v0.70.7 builder exit:
07007_BUILD_BLOCK ordinary output detail payload field: expected 1 anchor, found 0
: expected=0 actual=1
```

## 2. Classification

```text
FIX / BLOCKER / IMPLEMENTATION OUTPUT-DETAIL ANCHOR / NON-RUNTIME / PRODUCTION UNCHANGED
```

Failure 01's bounded Store.save anchor repair advanced the builder past the ordinary snapshot payload metric mutation. The next fail-closed point is the builder anchor that initializes ordinary output-detail timing fields.

No candidate was materialized, no exact approval occurred, and `release-simcore` was not mutated.

## 3. Root cause

The current builder uses a whitespace-sensitive multi-line literal for the ordinary output-detail initialization block:

```text
outSerializeMs
outSetMs
outPruneMs
stateLoadSource
diagnosticFormatMs
hotspotPhase
retentionDisposition
```

The semantic initialization seam exists in the deployed v0.70.6 source, but the literal does not match exact production formatting/indentation. The builder therefore fails closed before candidate construction.

This is not evidence of a runtime behavior defect. It is a brittle implementation-builder anchor.

### 3.1 Exact production source alignment discovered during repair

The deployed v0.70.6 source was re-read before changing the builder. The ordinary `processOutput()` detail block is actually shaped as:

```js
detail.stateLoadMs = 0;
detail.stateLoadSource = 'unknown';
detail.prepareMs = 0;
detail.validateMs = 0;
detail.finalizeMs = 0;
detail.outSerializeMs = 0;
detail.outSetMs = 0;
detail.outPruneMs = 0;
detail.pruneDeferred = false;
detail.inputChars = String(content || '').length;
detail.outputChars = 0;
```

The authoritative ordinary out save is actually conditional only in whether the metric object is supplied:

```js
const outMetric = {};
await this.store.save(
  'out',
  outIndex,
  result.state,
  detail ? { prune: false, metric: outMetric } : { prune: false }
);
```

Its existing propagation is:

```js
detail.outSerializeMs = Number(outMetric.serializeMs || 0);
detail.outSetMs = Number(outMetric.setMs || 0);
detail.outPruneMs = 0;
```

The current OPS owner is `diagnosticOutputBreakdown(perf)`, not the provisional `buildOutputBreakdown(perf, outputTotalMs)` name used by the first builder draft. `OUT_STORAGE` remains exactly:

```js
['OUT_STORAGE', n(detail.outSetMs)]
```

and the copied Last Turn Diagnostic currently renders output timing as an array entry beginning with:

```text
Output process:
```

These differences do **not** change the frozen v0.70.7 semantics. They only prove that the first implementation draft encoded design shorthand as literal source anchors instead of aligning to exact deployed syntax.

The repair therefore must preserve the deployed conditional save shape and current diagnostic owner while adding only the frozen payload-character attribution.

## 4. Safe repair direction

The repair must be bounded to exact deployed ordinary output-detail and diagnostics ownership:

1. scope the initialization mutation inside exact `processOutput(outIndex, content, perfDetail = null)`;
2. insert `outPayloadChars = null` immediately after the existing ordinary `outPruneMs = 0` initialization;
3. preserve the conditional `detail ? { prune: false, metric: outMetric } : { prune: false }` authoritative save exactly;
4. propagate `outMetric.payloadChars` only inside the existing `if (detail)` metric-copy block;
5. add pure ratio accounting inside `diagnosticOutputBreakdown(perf)` without changing `OUT_STORAGE = outSetMs`;
6. add exactly one bounded `Output snapshot set:` copied-diagnostic array entry adjacent to existing output performance lines;
7. avoid replacing any manual-edit timing block or changing any storage operation, await, pruning, retention, schema, module or require edge;
8. rerun permanent CI from a new exact head.

No release-system redesign or runtime semantic expansion is authorized by this repair.

## 5. Production exposure

At failure capture and repair-source audit, production remains exactly:

```text
version = 0.70.6
release = Manual Edit Redundant Prune Elision
release-simcore = e2552d7f93456652c94d9df37b0c253f12f2d900
blob = 83714d78537906fc9f2060c06c9e4ce349568a19
```

Disposition:

```text
PRODUCTION EXPOSURE = NONE
CANDIDATE MATERIALIZATION = NONE
RELEASE-SIMCORE MUTATION = NONE
NEXT = BOUNDED PRODUCTION-EXACT OUTPUT-DETAIL / DIAGNOSTIC ANCHOR REPAIR
```
