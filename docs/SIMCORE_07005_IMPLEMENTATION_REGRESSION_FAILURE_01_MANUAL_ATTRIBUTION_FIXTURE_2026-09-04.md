# SimCore v0.70.5 Implementation Regression Failure 01 — Manual Attribution Fixture

Date: 2026-09-04 KST
Status: **FIX · BLOCKER · TEST FIXTURE · NON-RUNTIME · PRODUCTION UNCHANGED**
Classification: **SIMCORE · v0.70.5 · IMPLEMENTATION REGRESSION · HARNESS ACCOUNTING COHERENCE**

## 1. Trigger

Implementation PR `#1463` first exact-head SimCore CI run:

```text
run = 33832017307
job = Verify / 100896816864
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
reason = PERMANENT_REGRESSION_FAIL
assertion = SUITE_ASSERTION_FAILED: builder-v07005: manual edit attribution present
```

The trusted-base permanent verifier passed before the proposed verifier, isolating the failure to the newly added v0.70.5 regression surface.

## 2. Root cause

The new genuine-manual-edit fixture supplied distinct existing Store metrics:

```text
serializeMs = 1.25
setMs = 2.5
pruneMs = 3.75
commitMs = 7.5
```

but its stubbed `store.save()` returned effectively immediately.

The production v0.70.4 attribution contract intentionally accepts manual-edit attribution only when named measured work closes within the measured rebuild total:

```text
named = prepare + recovery + finalize + commit
named <= rebuildTotal + 0.5 ms
```

Because the fixture claimed 7.5 ms of Store work without consuming corresponding wall time, the conservative closure guard correctly rejected the synthetic attribution and left `manualEditAttribution = null`.

Therefore:

```text
RUNTIME BUG = NO
BUILDER SEMANTIC BUG = NO EVIDENCE
TEST FIXTURE ACCOUNTING = INVALID
PRODUCTION = UNCHANGED v0.70.4
```

## 3. Repair boundary

Repair only the executable test fixture so non-zero synthetic Store component metrics consume at least their declared aggregate duration inside the stubbed save boundary.

Do not change:

```text
v0.70.5 runtime builder semantics
Store module
manual-edit closure guard
edit decisions
save cardinality/options
retention policy
persistent schema
release-system code
release-simcore
```

The zero and unknown-component controls remain zero-cost and continue to prove zero-vs-unknown semantics.

## 4. Disposition

```text
classification = FIX / BLOCKER
owner = builder-v07005 executable regression fixture
repair = make synthetic elapsed time coherent with supplied synthetic Store metrics
runtime impact = NONE
production impact = NONE
next = repair fixture -> rerun exact-head CI -> continue only on PASS
```
