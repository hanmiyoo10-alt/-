# SimCore S1-1 Candidate PR Failure 02 — R2.9 Active Regression Version Bridge

Date: 2026-08-31 KST
Classification: **FIX · R2_9_ACTIVE_REGRESSION_VERSION_BRIDGE · NON_RUNTIME · PRODUCTION_UNCHANGED**
Status: **OBSERVED · ROOT CAUSE PROVEN · BOUNDED REPAIR AUTHORIZED**

## Observation

Implementation PR:

```text
PR = #1011
head = 7258ca9c78bfeef51ac76f19eea40d5eadaa181c
SimCore CI run = 33327122812
Verify job = 99299148957
profile = PR_MAIN
conclusion = FAIL
reason = PR1_DRY_QUALIFICATION_FAIL
```

Exact candidate dry-run failure:

```text
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED: release-system-r2-9-validation-contract-projection:
R2.9 active regression source version unsupported: 0.70.3
```

Bounded gate result:

```text
GATE_CI_SELF = PASS
GATE_PR1_DRY = FAIL
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
production = 861100f4771967aa5b8ab8811d06f11702c0d3ff
candidate persistence = NONE
production mutation = NONE
```

## Root cause

`products/simcore/tests/suites/release-system-r2-9-validation-contract-projection.test.mjs`
contains a bounded identity table used only by the executable active-regression projection test:

```js
const KNOWN_RELEASE_IDENTITIES = Object.freeze({
  '0.70.0': Object.freeze({ releaseName: 'Current Task Primacy Guard' }),
  '0.70.1': Object.freeze({ releaseName: 'Cold First-Turn Tail Attribution' }),
});
```

The suite fail-closes before running active projected contracts when the exact source version is absent from this table.

The underlying R2.9 projected contract implementation is already version-generic for this S1-1 contract posture:

```text
reload-cache-continuity = inherited 0.69.2 behavior
operator-release-card = current identity + inherited 0.69.2 behavior
host-local-telemetry = exact current identity
bounded-telemetry-capsule = inherited 0.69.2 behavior
```

The newly added exact `0.70.3` validation profile declares precisely those modes. No new validation authority, fixture, wrapper, route or workflow is required.

## Bounded repair

Add exactly one known release identity entry:

```js
'0.70.3': Object.freeze({ releaseName: 'Runtime Cache Hash Primitive Convergence' }),
```

to `KNOWN_RELEASE_IDENTITIES`.

Do not add `0.70.2`; it remains intentionally parked/unreleased and the suite's unknown-source fail-closed control may continue using `0.70.2`.

## Frozen boundary

```text
release-simcore = unchanged
runtime builder = unchanged
candidate target = unchanged 0.70.3
v0.70.2 parked identity = unchanged
R2.9 route table = unchanged
R2.9 authority capability table = unchanged
validation-context R2.10 = unchanged
fixtures = unchanged
registry = unchanged
workflows = unchanged
release-system semantics = unchanged
```

## Disposition

```text
S1_1_PR1011_HEAD2 = FAIL_CLOSED
CLASSIFICATION = FIX
ROOT_CAUSE = R2_9_KNOWN_RELEASE_IDENTITY_GAP
REPAIR = ONE 0.70.3 RELEASE-IDENTITY ENTRY
RUNTIME_IMPLEMENTATION = UNCHANGED
PRODUCTION = STILL v0.70.1
```
