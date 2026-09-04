# SimCore v0.70.6 Implementation Regression Failure 02 — Synthetic Commit Wall-Time Coherence — 2026-09-04

Date: 2026-09-04 KST
Status: **FIX · BLOCKER · TEST FIXTURE · NON_RUNTIME · PRODUCTION EXPOSURE NONE**
Classification: **SIMCORE · v0.70.6 · IMPLEMENTATION REGRESSION · TEST HARNESS**

## 1. Failed verification

```text
PR = #1474
head = bf9a8be0e7f86f4a55721419508568f4f71fe6fd
SimCore CI run = 33868763936
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
reason = PERMANENT_REGRESSION_FAIL
```

Bounded report assertion:

```text
builder-v07006:
eligible skipped prune contributes known zero
expected = 0
actual = undefined
```

## 2. Root cause

The v0.70.6 test Store stub declared synthetic commit metrics such as:

```text
serializeMs = 1.25
setMs = 2.5
pruneMs = 3.75
```

but returned immediately without consuming corresponding synthetic wall time.

The production v0.70.5/v0.70.6 attribution logic intentionally has a conservative closure guard:

```text
named measured work <= observed rebuild wall time + rounding tolerance
```

Because the fixture claimed milliseconds that the wall clock never observed, the runtime correctly rejected the impossible attribution envelope and left `manualEditAttribution` unset. The failing assertion then observed `undefined`.

This is the same class of harness-coherence issue already encountered and repaired in the v0.70.5 implementation regression. It is not evidence against the prune-elision runtime logic.

## 3. Classification

```text
classification = FIX / BLOCKER
runtime defect = NO
Store defect = NO
release-system defect = NO
production mutation = NONE
release-simcore mutation = NONE
candidate publication = NONE
```

## 4. Repair boundary

Repair the fixture only:

- when synthetic Store metrics declare executed work, consume matching bounded synthetic wall time before publishing the metrics;
- on the eligible `prune:false` path, consume only serialize + set synthetic work because prune is intentionally not executed;
- on fallback executed-prune paths, consume serialize + set + prune synthetic work;
- do not change builder/runtime semantics or weaken the conservative closure guard.

Then rerun full SimCore Verify / Required on a new exact head.
