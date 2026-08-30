# SimCore Release System R2.9 Implementation CI Failure 02 — Nested Fixture Ownership

Date: 2026-08-30 KST

Classification: **FIX · SHADOW_REGRESSION_FIXTURE_OWNERSHIP · NON_RUNTIME · PRODUCTION_UNCHANGED**

Status: **OBSERVED · ROOT CAUSE PROVEN · REPAIR REQUIRED**

## Failed qualification after synthetic-loader repair

```text
PR = #941
head = d2d29bf6392864b369b9e921ed3a4aa0296d4dfe
SimCore CI run = 33294455048
Verify job = 99211618305
Required job = 99211651913
conclusion = FAIL
reason = PERMANENT_REGRESSION_FAIL
```

Permanent verifier remained healthy outside the new R2.9 regression:

```text
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
production = 13179cff70feaf7d12fe53c56e4735155fcf3eaa
latest/install digest equality = PASS
production mutation = NONE
```

Exact regression failure remained:

```text
SUITE_ASSERTION_FAILED:
release-system-r2-9-validation-contract-projection:
session bound exceeded
```

## Correct root cause

The R2.9 permanent regression invokes projected contract runners as nested tests from inside the R2.9 meta-suite.

The permanent test harness binds fixtures by the registry row currently being executed. Therefore the nested projected reload contract received:

```text
ctx.fixtures = release-system-r2-9-validation-contract-projection fixture
```

instead of the authoritative fixture set owned by:

```text
reload-cache-continuity
```

The inherited reload authority reads `fixture.input.maxSessionChars`. The R2.9 meta-fixture intentionally does not define reload-specific transport bounds, so the nested assertion became equivalent to:

```text
serializedChars <= undefined
```

and failed with `session bound exceeded`.

This is a fixture ownership error in the shadow meta-regression. It is not a failure of the production reload contract, current v0.70 wrappers, R2.9 profile semantics, or plugin runtime.

The prior synthetic-loader repair remains valid for synthetic current-runtime identity, but it was not sufficient because nested fixture ownership was independently incorrect.

## Bounded repair

The R2.9 meta-regression must construct a projected contract context with the fixture authority owned by each contract:

```text
reload-cache-continuity   -> tests/fixtures/reload-cache-continuity/*.json
operator-release-card     -> tests/fixtures/operator-release-card/*.json
host-local-telemetry      -> tests/fixtures/host-local-telemetry/*.json
bounded-telemetry-capsule -> tests/fixtures/bounded-telemetry-capsule/*.json
```

For current v0.70 proof:
- retain the harness loader bound to current v0.70 source;
- replace only `ctx.fixtures` with the selected contract fixture set.

For synthetic v0.70.1 proof:
- use `new BundleLoader(nextSource)`;
- use the same selected contract fixture authority;
- use the synthetic profile.

No contract-specific fixture data may be copied into the R2.9 meta-fixture.

## Frozen boundary

```text
active v0.70 registry routes = untouched
current contract fixtures = unchanged
current v0.70 wrappers = unchanged
builder-v07000 active row = unchanged
plugin runtime = untouched
release-simcore = untouched
R2.8 = untouched
```

## Disposition

```text
R2_9_PR941_SECOND_HEAD = FAIL_CLOSED
R2_9_NESTED_FIXTURE_OWNERSHIP = FIX REQUIRED
R2_9_PROFILE_AND_PROJECTED_CONTRACT_MODEL = UNCHANGED
PRODUCTION = UNCHANGED_0.70.0
ACTIVATION = STILL_DEFERRED
```
