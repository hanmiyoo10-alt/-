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

## 4. Safe repair direction

The repair must be bounded to exact deployed ordinary output-detail initialization:

1. inspect exact v0.70.6 source around `outPruneMs` / `retentionDisposition`;
2. identify the correct containing function or unique bounded context;
3. insert `outPayloadChars = null` immediately after the existing ordinary `outPruneMs = 0` initialization;
4. avoid replacing an unrelated manual-edit or other output-detail block;
5. preserve every existing timing field, ordering, semantics, await, storage operation, and retention disposition;
6. rerun permanent CI from a new exact head.

No release-system redesign or runtime semantic expansion is authorized by this repair.

## 5. Production exposure

At failure capture, production remains exactly:

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
NEXT = BOUNDED OUTPUT-DETAIL ANCHOR REPAIR
```
