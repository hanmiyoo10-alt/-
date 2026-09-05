# SimCore v0.70.8 Implementation Regression Failure 02 — Direct-Owner Return Contract

Date: 2026-09-06 KST
Status: **PRESERVED · FIX / BLOCKER · IMPLEMENTATION REGRESSION HARNESS CONTRACT · NON-RUNTIME · PRODUCTION UNCHANGED**

## 1. Failure identity

Implementation PR:

- PR `#1576`
- head `c0820fa14cfc3ebdda23fb193941d777a166ba62`
- base `de57b5423f955a46f216a72b17244be0f04d6a77`
- SimCore CI run `33976569017`
- Verify job `101334201274`

Bounded gate result:

```text
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
reasonCode = PERMANENT_REGRESSION_FAIL
```

Exact stderr:

```text
SUITE_ASSERTION_FAILED: builder-v07008: Cannot read properties of undefined (reading 'changed')
```

Failure 01's exact diagnostic-marker cardinality guard was passed on this head, so this is a distinct later-stage executable regression failure.

## 2. Classification

```text
FIX / BLOCKER / IMPLEMENTATION REGRESSION HARNESS CONTRACT / NON_RUNTIME / PRODUCTION UNCHANGED
```

No candidate was materialized, no exact approval occurred, and production remains v0.70.7.

## 3. Root cause

Direct production-source inspection established that `edit-reconcile.reconcileVisiblePreviousAssistant()` is a side-effect/diagnostic owner whose public function does not return its internal reconcile result.

The owner internally constructs and consumes `r`:

```text
r.representationFastReconciled
r.changed
r.mode
r.revision
```

and writes the authoritative externally observable test facts into `perfDetail`, but the function exits without `return r`.

The new v0.70.8 direct-owner regression correctly executed the real owner but incorrectly treated the invocation result as the internal `r` object and attempted to read `result.changed`.

Therefore the failing `undefined.changed` is a test-harness contract mismatch, not evidence that the v0.70.8 runtime rewind guard returned an invalid value.

## 4. Authorized bounded repair

Keep the production owner contract unchanged.

Do not add a runtime return value solely for tests.

Update only `builder-v07008.test.mjs` so direct-owner assertions use existing observable authority:

```text
perfDetail.path
perfDetail.compatibilitySource
perfDetail.editOrigin
reconcileSession delegate count
```

Positive fast paths must prove delegate count `0` and exact diagnostic provenance.

Negative/genuine-edit controls must prove delegate count `1` and absence of the new rewind provenance, with existing edit-origin/path semantics preserved.

No runtime builder geometry, release profile, R2.11 code, workflow, schema, or production change is authorized by this repair.

## 5. Production boundary

```text
production version = 0.70.7
release-simcore = 434df54760bc997b1bcd9223eeaff428aeee66d3
production blob = 6f7cae5b5a8ade66e20beaaf253e365ba035cc18
PRODUCTION EXPOSURE = NONE
```

Next:

```text
REPAIR TEST HARNESS ONLY -> RERUN PERMANENT CI
```
