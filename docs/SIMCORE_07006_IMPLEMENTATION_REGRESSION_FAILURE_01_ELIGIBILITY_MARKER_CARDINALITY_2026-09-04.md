# SimCore v0.70.6 Implementation Regression Failure 01 — Eligibility Marker Cardinality — 2026-09-04

Date: 2026-09-04 KST
Status: **FIX · BLOCKER · BUILDER ASSERTION · NON_RUNTIME · PRODUCTION EXPOSURE NONE**
Classification: **SIMCORE · v0.70.6 · IMPLEMENTATION REGRESSION · TEST/BUILDER**

## 1. Failed verification

Implementation PR:

```text
PR = #1474
head = f6d75e13f678d29b25b251e5286a6868c97b2b3a
SimCore CI run = 33868575941
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
reason = PERMANENT_REGRESSION_FAIL
```

Bounded report assertion:

```text
SUITE_ASSERTION_FAILED: builder-v07006
v0.70.6 builder exit: 07006_ELIGIBILITY_MARKER_CARDINALITY
expected = 0
actual = 1
```

## 2. Root cause

The runtime patch introduces the bounded eligibility token:

```text
USER_EDIT_CANDIDATE_WHEN_CHANGED
```

at two source locations:

1. existing prior-EXACT fact transport before the rebuild delegate;
2. final manual-rebuild save gate.

The builder verification counted the substring `USER_EDIT_CANDIDATE` and incorrectly required the candidate count to be exactly `original + 1`.

Because the new bounded token contains that substring at two locations, the correct expected delta for this implementation text is `+2`.

This is a builder self-check error, not a runtime semantic failure. The production-derived patch had already passed syntax, static, architecture, and permanent verifier construction before the regression suite invoked the builder self-check.

## 3. Classification

```text
classification = FIX / BLOCKER
runtime defect = NO
release-system defect = NO
production mutation = NONE
release-simcore mutation = NONE
candidate publication = NONE
Store behavior exposure = NONE
```

## 4. Repair boundary

Repair only the builder's frozen-marker verification so that:

```text
all original USER_EDIT_CANDIDATE occurrences remain present
new bounded eligibility token occurs exactly twice
no original decision marker is removed
```

Do not change runtime eligibility, Store behavior, retention semantics, test scenario, or release tooling to make the gate pass.

After repair, rerun the complete SimCore Verify / Required path on the new exact implementation head.
