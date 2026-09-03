# SimCore v0.70.4 Implementation Regression Failure 02 — Representation-Fast Fixture Eligibility

Date: 2026-09-04 KST
Status: **FIX · TEST_FIXTURE · NON_RUNTIME · PRODUCTION_UNCHANGED**
Classification: **IMPLEMENTATION_REGRESSION_FIXTURE · REPRESENTATION_FAST_ELIGIBILITY_INCOMPLETE**

## 1. Context

Implementation PR:

```text
PR = #1444
branch = impl/simcore-v07004-manual-edit-rebuild-attribution
head = 2befeb9560c558a63d0a5712f874630efc62ccf5
CI run = 33789874835
Verify job = 100763608783
```

The v0.70.4 builder materialized successfully and the permanent gate reached the executable `builder-v07004` regression. The regression then failed in the newly added representation-fast control case.

## 2. Exact failure

```text
SUITE_ASSERTION_FAILED: builder-v07004:
representation-fast control must not delegate to rebuild:
expected=0 actual=1
```

## 3. Root cause

The current v0.70.3 production fast-path eligibility requires all of the following to hold:

```text
prior provenance exists
priorRepresentation = OUTPUT_MISMATCH
currentMatch = FRESH_CHAT
priorCanonical exists
priorFresh exists
currentOutputIndex = lastAssistant
session.current.outputFingerprint = priorCanonical
session.trustedOutputFingerprint = priorCanonical
```

The new fixture supplied the representation relation and trusted fingerprint but instantiated `session.current` as an empty object. Therefore the fixture did not satisfy the existing production eligibility predicate and correctly fell through to the conservative rebuild delegate.

This is a fixture construction error. It is not runtime behavior drift and it does not indicate a v0.70.4 instrumentation defect.

## 4. Fix

Only the representation-fast fixture state is corrected:

```text
before: current = {}
after:  current.outputFingerprint = priorCanonical
```

The production-derived builder, runtime timing instrumentation, frozen representation eligibility predicate, edit semantics, snapshot semantics, and release system remain unchanged.

The control remains intentionally strict: if any existing fast-path precondition is absent, the fixture must continue to delegate conservatively.

## 5. Production boundary

```text
release-simcore = 4c618563f43b8a3ff0eeb18eeff5536bb287369b
version = 0.70.3
blob = 068df0d6b792b2878c0c745949e0b9d38fc667fa
production mutation = NONE
```

The implementation remains fail-closed pending fresh PR CI.
