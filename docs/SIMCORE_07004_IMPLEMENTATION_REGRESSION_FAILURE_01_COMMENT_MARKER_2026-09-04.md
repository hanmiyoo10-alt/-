# SimCore v0.70.4 Implementation Regression Failure 01 — Comment Marker False Positive

Date: 2026-09-04 KST
Status: **FIX · NON_RUNTIME · PRODUCTION_UNCHANGED**
Classification: **IMPLEMENTATION_REGRESSION_ASSERTION · COMMENT_MARKER_COUNT_FALSE_POSITIVE**

## 1. Context

Implementation PR:

```text
PR = #1444
branch = impl/simcore-v07004-manual-edit-rebuild-attribution
initial head = bba22a8604be30cea8ef0497045b22f69b1bb7ef
CI run = 33789188313
Verify job = 100761332349
```

The trusted predecessor lane passed. Proposed permanent CI passed `GATE_CI_SELF`, `GATE_STATIC`, and `GATE_ARCH`, but `GATE_REGRESSION` failed.

## 2. Exact failure

```text
SUITE_ASSERTION_FAILED: builder-v07004:
v0.70.4 builder exit:
07004_FROZEN_MARKER_CHANGED: MANUAL_EDIT_REBUILT
: expected=0 actual=1
```

## 3. Root cause

The v0.70.4 builder intentionally preserves exact counts of frozen runtime decision markers such as:

```text
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
REPRESENTATION_FAST_RECONCILED
```

The new release-note comment used the literal string `MANUAL_EDIT_REBUILT` while describing the feature. Production v0.70.3 did not contain that exact literal, so the candidate marker-count proof correctly detected an added literal but could not distinguish comment prose from runtime decision surfaces.

This is a regression-proof false positive, not runtime semantic drift.

## 4. Fix

The frozen marker assertion remains unchanged and strong.

Only the release-note prose was changed from the exact decision-marker spelling to ordinary language:

```text
genuine manual-edit rebuild reconciliation path
```

No runtime branch, timing bucket, edit decision, snapshot behavior, module graph, require edge, release-system code, or deployment state was altered by this fix.

## 5. Production boundary

```text
release-simcore = 4c618563f43b8a3ff0eeb18eeff5536bb287369b
version = 0.70.3
blob = 068df0d6b792b2878c0c745949e0b9d38fc667fa
production mutation = NONE
```

The implementation remains fail-closed pending a fresh PR CI result.
